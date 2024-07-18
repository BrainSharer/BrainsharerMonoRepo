"""This is the module that the user will use to connect to the database.
This can be defined in either a web page or in a REST API call. This module
is the 'V' in the MVC framework for the Neuroglancer app
portion of the portal.
"""

import decimal
import os
from rest_framework import viewsets, views, permissions, status
from django.http import JsonResponse
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.pagination import LimitOffsetPagination
import logging

from brain.models import ScanRun
from neuroglancer.create_state_views import NeuroglancerJSONStateManager
from neuroglancer.annotation_session_manager import AnnotationSessionManager, get_label_ids, get_session
from neuroglancer.atlas import align_atlas, get_scales
from neuroglancer.models import AnnotationLabel, AnnotationSession, \
    NeuroglancerState, BrainRegion, SearchSessions, CellType
from neuroglancer.serializers import AnnotationModelSerializer, AnnotationSessionDataSerializer, AnnotationSessionSerializer, LabelSerializer, \
    RotationSerializer, NeuroglancerNoStateSerializer, NeuroglancerStateSerializer
from brainsharer.pagination import LargeResultsSetPagination
from neuroglancer.models import DEBUG
from timeit import default_timer as timer


logging.basicConfig()
logger = logging.getLogger(__name__)


@api_view(['GET'])
def get_labels(request):
    cell_types = CellType.objects.filter(active=True).order_by('cell_type').all()
    brain_regions = BrainRegion.objects.filter(active=True).order_by('abbreviation').all()
    cell_types = [{"id": row.id, "label_type": "cell", "label": row.cell_type} for row in cell_types]            
    brain_regions = [{"id": row.id, "label_type": "brain_region", "label": row.abbreviation} for row in brain_regions]            
    serializer = LabelSerializer(cell_types + brain_regions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def search_label(request, search_string=None):
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

@api_view(['GET'])
def search_annotation(request, search_string=None):
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


@api_view(['GET'])
def get_annotation(request, session_id):
    
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
    

@api_view(['POST'])
def new_annotation(request):
    """This is a simple method to create a new annotation session for scenario 1 and 3
    URL = /annotations/new/
    """
    
    if 'id' in request.data:
        del request.data['id']
    if 'label' not in request.data:
        return Response({"detail": "Label is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    label_ids = get_label_ids(request.data.get('label'))
    request.data.update({'labels': label_ids})

    serializer = AnnotationModelSerializer(data=request.data)

    # check to make sure the serializer is valid, if so return the ID, if not, return error code.
    if serializer.is_valid():
        serializer.save()
        return Response({'id': serializer.data.get('id')}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def save_annotation(request):
    """This is a simple method to update annotation session for scenario 2
    URL = /annotations/save/
    """

    if 'id' in request.data and request.data.get('id').isdigit():
        ## We simply get the annotation session based on its ID
        id = int(request.data.get('id'))
        try:
            existing_session = AnnotationSession.objects.get(pk=id)
        except AnnotationSession.DoesNotExist:
            return Response({"detail": f"Annotation data does not exist"}, status=status.HTTP_404_NOT_FOUND)
        
        label_ids = get_label_ids(request.data.get('label'))
        request.data.update({'labels': label_ids})

        serializer = AnnotationModelSerializer(existing_session, data=request.data, partial=False)
        # check to make sure the serializer is valid, if so return the ID, if not, return error code.
        if serializer.is_valid():
            serializer.save()
            return Response({'id': serializer.data.get('id')}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    else:
        return Response({"detail": "Could not get ID from POST"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST', 'PATCH'])
def annotation_session_api(request):

    if request.method == 'POST':
        ## check if there is an already existing annotation session.
        existing_session = get_session(request.data)
        if existing_session is None:
            if DEBUG:
                print('No existing session found, so insert a new one')
            serializer = AnnotationModelSerializer(data=request.data)
        else:
            if DEBUG:
                print('We found a session so we will update it')

            serializer = AnnotationModelSerializer(existing_session, data=request.data, partial=True)

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


class Segmentation(views.APIView):
    """Method to create a 3D volume from existing annotation
    """

    permission_classes = [permissions.AllowAny]

    
    def get(self, request, session_id):
        """Simpler version that does not use slurm or subprocess script
        """
        if DEBUG:
            start_time = timer()
        try:
            annotationSession = AnnotationSession.objects.get(pk=session_id)
        except AnnotationSession.DoesNotExist:
            return Response({"msg": f"Annotation data does not exist"}, status=status.HTTP_404_NOT_FOUND)
        try:
            scan_run = ScanRun.objects.get(prep=annotationSession.animal)
        except ScanRun.DoesNotExist:
            return Response({"msg": f"Scan run data does not exist"}, status=status.HTTP_404_NOT_FOUND)

        label = annotationSession.labels.first()
        annotation_session_manager = AnnotationSessionManager(scan_run, label)
        polygons = annotation_session_manager.create_polygons(annotationSession.annotation)
        if not isinstance(polygons, dict):
            return Response({"msg": polygons}, status=status.HTTP_404_NOT_FOUND)
        origin, section_size = annotation_session_manager.get_origin_and_section_size(polygons)
        volume = annotation_session_manager.create_volume(polygons, origin, section_size)
        if volume is None or volume.shape[0] == 0:
            return Response({"msg": "Volume could not be created"}, status=status.HTTP_404_NOT_FOUND)        
        folder_name = annotation_session_manager.create_segmentation_folder(volume, annotationSession.animal, 
                                                 label, origin.tolist())
        segmentation_save_folder = f"precomputed://{settings.HTTP_HOST}/structures/{folder_name}"
        if DEBUG:
            end_time = timer()
            total_elapsed_time = round((end_time - start_time), 2)
            print(f'Creating segmentation took {total_elapsed_time} seconds.')

        return JsonResponse({'url': segmentation_save_folder, 'name': folder_name})


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
        """
        coms = StructureCom.objects.order_by('annotation_session')\
            .values('annotation_session__animal__prep_id', 'label', 'source').distinct()
        for com in coms:
            data.append({
                "prep_id": com['annotation_session__animal__prep_id'],
                "label": com['label'],
                "source": com['source'],
            })
        """
        serializer = RotationSerializer(data, many=True)
        return Response(serializer.data)



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

class NeuroglancerPrivateViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing user instances.
    """
    permission_classes = [permissions.IsAuthenticated]

    serializer_class = NeuroglancerStateSerializer
    queryset = NeuroglancerState.objects.all()

