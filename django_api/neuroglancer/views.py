"""This is the module that the user will use to connect to the database.
This can be defined in either a web page or in a REST API call. This module
is the 'V' in the MVC framework for the Neuroglancer app
portion of the portal.
"""

from subprocess import check_output
import os
from time import sleep
import decimal
from rest_framework import viewsets, views, permissions, status
from django.http import JsonResponse
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.pagination import LimitOffsetPagination
import logging

from neuroglancer.create_state_views import NeuroglancerJSONStateManager
from neuroglancer.annotation_session_manager import get_session
from neuroglancer.atlas import align_atlas, get_scales
from neuroglancer.models import AnnotationLabel, AnnotationSession, \
    NeuroglancerState, BrainRegion, SearchSessions, CellType
from neuroglancer.serializers import AnnotationModelSerializer, AnnotationSessionDataSerializer, AnnotationSessionSerializer, LabelSerializer, \
    RotationSerializer, NeuroglancerNoStateSerializer, NeuroglancerStateSerializer
from neuroglancer.contours.create_contours import make_volumes
from brainsharer.pagination import LargeResultsSetPagination
from neuroglancer.models import DEBUG
from timeit import default_timer as timer


logging.basicConfig()
logger = logging.getLogger(__name__)


class GetLabels(views.APIView):
    def get(self, request, format=None):
        cell_types = CellType.objects.filter(active=True).order_by('cell_type').all()
        brain_regions = BrainRegion.objects.filter(active=True).order_by('abbreviation').all()
        cell_types = [{"id": row.id, "label_type": "cell", "label": row.cell_type} for row in cell_types]            
        brain_regions = [{"id": row.id, "label_type": "brain_region", "label": row.abbreviation} for row in brain_regions]            
        serializer = LabelSerializer(cell_types + brain_regions, many=True)
        return Response(serializer.data)

class SearchLabels(views.APIView):
    def get(self, request, search_string=None, format=None):
        data = []
        if search_string:
            cell_types = CellType.objects\
                .filter(cell_type__icontains=search_string).order_by('cell_type').distinct()
            brain_regions = BrainRegion.objects\
                .filter(abbreviation__icontains=search_string).order_by('abbreviation').distinct()

            for row in cell_types:
                data.append({"id": row.id, "label_type": "cell", "label": row.cell_type})
            for row in brain_regions:
                data.append({"id": row.id, "label_type": "brain_region", "label": row.abbreviation})
            
        serializer = LabelSerializer(data, many=True)
        return Response(serializer.data)

class SearchAnnotations(views.APIView):
    def get(self, request, search_string=None, format=None):
        data = []
        if search_string:
            rows = SearchSessions.objects\
                .filter(animal_abbreviation_username__icontains=search_string).order_by('animal_abbreviation_username').distinct()

            for row in rows:
                data.append({
                    "id": row.id,
                    "animal_abbreviation_username": row.animal_abbreviation_username,
                })
            
        serializer = AnnotationSessionSerializer(data, many=True)
        return Response(serializer.data)

class GetAnnotation(views.APIView):
    def get(self, request, session_id, format=None):
        session = {}
        if session_id:
            try:
                data = AnnotationSession.objects.get(pk=session_id)
            except AnnotationSession.DoesNotExist:
                return Response({"Error": "Record does not exist"}, status=status.HTTP_404_NOT_FOUND)
            session['id'] = data.id
            session['annotation'] = data.annotation


        serializer = AnnotationSessionDataSerializer(session, many=False)
        return Response(serializer.data)


@api_view(['POST', 'PATCH'])
def annotation_session_api(request):

    if request.method == 'POST':
        if 'label' in request.data and isinstance(request.data.get('label'), str):
            label = request.data.get('label')
            try:
                label_obj = AnnotationLabel.objects.get(label=label)
            except AnnotationLabel.DoesNotExist:
                return Response({"Error": f"Label: {label} does not exist"}, status=status.HTTP_404_NOT_FOUND)

            request.data['label'] = label_obj.id

        # if there is an id, do a partial update
        if 'id' in request.data and isinstance(request.data.get('id'), str) and request.data.get('id').isdigit():
            try:
                obj = AnnotationSession.objects.get(pk=request.data.get('id'))
                serializer = AnnotationModelSerializer(obj, data=request.data, partial=True)
            except AnnotationSession.DoesNotExist:
                return Response({"Error": "Record does not exist"}, status=status.HTTP_404_NOT_FOUND)    
        else: # no id, so fix request data with the label id and check for session
            ## check if there is an already existing annotation session.
            ## We need to look up the label ID
            obj = get_session(request.data)
            if obj is not None:
                serializer = AnnotationModelSerializer(obj, data=request.data, partial=True)
            else:
                # No existing session found, so we'll insert a new one
                serializer = AnnotationModelSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({'id': serializer.data.get('id')}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    # PATCH method to partially update a person
    elif request.method == 'PATCH':
        obj = AnnotationSession.objects.get(pk=request.data.get('id'))
        serializer = AnnotationModelSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'data': serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    else:    
        return Response({'msg': 'Invalid request method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


def apply_scales_to_annotation_rows(rows, prep_id):
    """To fetch the scan resolution of an animal from the database and apply it to a 
    list of annotation rows

    :param rows: list of query result from either the StructureCom, MarkedCell, 
        or PolygonSequence table.
    :param prep_id: string animal id
    """

    scale_xy, z_scale = get_scales(prep_id)
    for row in rows:
        row.x = row.x / scale_xy
        row.y = row.y / scale_xy
        row.z = row.z / z_scale + decimal.Decimal(0.5)

class Rotation(views.APIView):
    """A view that returns the transformation from the atlas to the image stack of one 
    particular brain.
    """

    def get(self, request, prep_id, annotator_id, source, reverse=0, reference_scales='None', format=None):
        data = {}
        R, t = align_atlas(prep_id, annotator_id, source,
                           reverse=reverse, reference_scales=eval(reference_scales))
        data['rotation'] = R.tolist()
        data['translation'] = t.tolist()
        return JsonResponse(data)


class Rotations(views.APIView):
    """A view that returns the available set of rotations.
    """

    def get(self, request, format=None):
        data = []
        coms = StructureCom.objects.order_by('annotation_session')\
            .values('annotation_session__animal__prep_id', 'label', 'source').distinct()
        for com in coms:
            data.append({
                "prep_id": com['annotation_session__animal__prep_id'],
                "label": com['label'],
                "source": com['source'],
            })
        serializer = RotationSerializer(data, many=True)
        return Response(serializer.data)


class ContoursToVolume(views.APIView):
    """Method to run slurm to create a 3D volume
    """

    permission_classes = [permissions.AllowAny]

    
    def get_slurm(self, request, neuroglancer_state_id, volume_id):
        command = ["sbatch", os.path.abspath('./slurm_scripts/contour_to_volume'), str(neuroglancer_state_id),volume_id]
        out = check_output(command)
        print(out)
        start_id = out.find(b'job')+4
        job_id = int(out[start_id:-1])
        output_file = f'/var/www/brainsharer/structures/slurm/slurm_{job_id}.out'
        error_file = f'/var/www/brainsharer/structures/slurm/slurm_{job_id}.err'
        while not os.path.exists(output_file):
            sleep(1)
            print(f'waiting for job {job_id} to finish')
            break
        print('finished')
        text_file = open(output_file, "r")
        data = text_file.read()
        text_file.close()
        url = data.split('\n')[-1]
        folder_name = url.split('/')[-1]
        return JsonResponse({'url': url, 'name': folder_name})
    
    def get_subprocess(self, request, neuroglancer_state_id, volume_id):
        """Simpler version that does not use slurm
        """

        command = [os.path.abspath('./slurm_scripts/contour_to_volume'), str(neuroglancer_state_id),volume_id]
        out = check_output(command)
        data = str(out).strip("'")
        url = data.split('\\n')[-1]
        folder_name = url.split('/')[-1]
        return JsonResponse({'url': url, 'name': folder_name})
    
    def get(self, request, neuroglancer_state_id, volume_id):
        """Simpler version that does not use slurm or subprocess script
        """
        if DEBUG:
            start_time = timer()

        neuroglancerState = NeuroglancerState.objects.get(pk=neuroglancer_state_id)
        animal = neuroglancerState.animal
        state_json = neuroglancerState.neuroglancer_state
        layers = state_json['layers']
        for layer in layers:
            if layer['type'] == 'annotation':
                annotation_layer = AnnotationLayer(layer)
                volume = annotation_layer.get_annotation_with_id(volume_id)
                if volume is not None:
                    break
        if volume is None:
            raise Exception(f'No volume was found with id={volume_id}' )
        
        folder_name = make_volumes(volume, animal, 32)
        segmentation_save_folder = f"precomputed://{settings.HTTP_HOST}/structures/{folder_name}"
        if DEBUG:
            end_time = timer()
            total_elapsed_time = round((end_time - start_time),2)
            print(f'Creating segmentation took {total_elapsed_time} seconds.')

        return JsonResponse({'url': segmentation_save_folder, 'name': folder_name})


class GetCellTypes(views.APIView):
    """View that returns a list of cell types
    """

    def get(self, request, format=None):
        data = {}
        cell_types = CellType.objects.filter(active=True).order_by('cell_type').all()
        data['cell_type'] = [i.cell_type for i in cell_types]
        return JsonResponse(data)


##### Neuroglancer views

@api_view(['POST'])
def create_state(request):
    if request.method == "POST":
        data = request.data
        layers = []
        data = [i for i in data if not (i['id'] == 0)]
        titles = []
        stateManager = NeuroglancerJSONStateManager()
        stateManager.prepare_top_attributes(data[0])
        for d in data:
            id = int(d['id'])
            if id > 0:
                layer = stateManager.create_layer(d)
                layers.append(layer)
                title = f"{d['group_name']} {d['layer_name']}" 
                titles.append(title)
        stateManager.state['layers'] = layers
        stateManager.prepare_bottom_attributes()
        for k,v in stateManager.state.items():
            print(k,v)
        title = titles[0] # hard code to 1st title
        state_id = stateManager.create_neuroglancer_model(title)
        return JsonResponse(state_id, safe=False)

class NeuroglancerPublicViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows the neuroglancer states to be viewed by the public.
    Note, the update, and insert methods are over ridden in the serializer.
    It was more convienent to do them there than here.
    """

    permission_classes = [permissions.AllowAny]
    pagination_class = LimitOffsetPagination
    serializer_class = NeuroglancerNoStateSerializer

    def get_queryset(self):
        """
        Optionally restricts the returned purchases to a given animal,
        by filtering against a `animal` query parameter in the URL.
        """

        queryset = NeuroglancerState.objects.only('id').filter(public=True).order_by('comments')
        description = self.request.query_params.get('description')
        lab = self.request.query_params.get('lab')
        if description is not None:
            queryset = queryset.filter(description__icontains=description)
        if lab is not None and int(lab) > 0:
            queryset = queryset.filter(owner__lab=lab)

        return queryset

class NeuroglancerViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing user instances.
    """
    serializer_class = NeuroglancerStateSerializer
    queryset = NeuroglancerState.objects.all()

