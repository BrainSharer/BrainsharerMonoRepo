import json
import numpy as np
import random
from rest_framework import status
from django.test import Client, TestCase
from django.db.models import Count
from django.apps import apps

from authentication.models import User
from brain.models import Animal, ScanRun
from neuroglancer.models import AnnotationSession, NeuroglancerState, BrainRegion, LAUREN_ID, CellType
from neuroglancer.contours.annotation_layer import random_string


class TestSetUp(TestCase):
    client = Client()

    def setUp(self):
        self.coms = [1,2,4,5,8,9,10,11,12,13,19,20,22,23,28,29,44,45,18,17,27,26]
        self.cell_type = CellType.objects.first()
        self.brain_region = BrainRegion.objects.first()
        self.username = 'beth'
        self.annotator_username = 'beth'
        self.annotator_id = 2
        self.prep_id = 'DK39'
        self.atlas_name = 'Atlas'
        self.annotation_type = 'POLYGON_SEQUENCE'
        self.label = random_string()
        # annotator
        try:
            query_set = User.objects.filter(username=self.annotator_username)
        except User.DoesNotExist:
            self.annotator = None
        if query_set is not None and len(query_set) > 0:
            self.annotator = query_set[0]
        else:
            self.annotator = User.objects.create(username=self.annotator_username,
                                                   email='super@email.org',
                                                   password='pass')
        # User
        try:
            query_set = User.objects.filter(username=self.username)
        except User.DoesNotExist:
            self.owner = None
        if query_set is not None and len(query_set) > 0:
            self.owner = query_set[0]
        else:
            self.owner = User.objects.create(username=self.username,
                                                   email='super@email.org',
                                                   password='pass')
            
        try:
            self.lauren = User.objects.get(pk=LAUREN_ID)
        except User.DoesNotExist:
            self.lauren = User.objects.create(username='Lauren', email='l@here.com', password = 'pass', id = LAUREN_ID)

        self.lauren = User.objects.get(pk=LAUREN_ID)
        self.lauren.save()

        # atlas
        try:
            self.atlas = Animal.objects.get(pk=self.atlas_name)
        except Animal.DoesNotExist:
            self.atlas = Animal.objects.create(prep_id=self.atlas_name)
        
        # animal
        try:
            self.animal = Animal.objects.get(pk=self.prep_id)
        except Animal.DoesNotExist:
            self.animal = Animal.objects.create(prep_id=self.prep_id)

        # scan_run    
        try:
            query_set = ScanRun.objects.filter(prep=self.animal)
        except ScanRun.DoesNotExist:
            self.scan_run = ScanRun.objects.create(prep=self.animal, 
                                                   resolution=0.325, zresolution=20,
                                                   number_of_slides=100)
        if query_set is not None and len(query_set) > 0:
            self.scan_run = query_set[0]
        # brain_region    
        try:
            query_set = BrainRegion.objects.filter(abbreviation='point')
        except BrainRegion.DoesNotExist:
            self.brain_region = None
        if query_set is not None and len(query_set) > 0:
            self.brain_region = query_set[0]
        else:
            self.brain_region = BrainRegion.objects.create(abbreviation='point')

        
        # annotation session brain
        query_set = AnnotationSession.objects \
            .filter(animal=self.animal)\
            .filter(brain_region=self.brain_region)\
            .filter(annotator=self.annotator)\
            .filter(annotation_type=self.annotation_type)

        if query_set is not None and len(query_set) > 0:
            self.annotation_session = query_set[0]
        else:
            self.annotation_session = AnnotationSession.objects.create(\
                animal=self.animal,
                brain_region=self.brain_region,
                annotator=self.lauren,
                annotation_type=self.annotation_type
                )
        

        self.reverse=1
        self.COMsource = 'MANUAL'
        self.reference_scales = '10,10,20'



class TestTransformation(TestSetUp):
    """A class for testing the rotations/transformations
    """

    def assert_rotation_is_not_identity(self,response):
        data = str(response.content, encoding='utf8')
        data = json.loads(data)
        translation = data['translation']
        s = np.sum(translation)
        self.assertNotEqual(s, 0.0, msg="Translation is not equal to zero")
    
    def test_rotation_list(self):
        """Test the API that returns the list of available transformations

        URL = /rotations

        """
        response = self.client.get(f"/rotations")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)

    def test_get_rotation(self):
        """Test the API that returns the list of available transformations
        path('rotation/<str:prep_id>/<int:annotator_id>/<str:source>/'
        URL = /rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/

        """
        command = f"/rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/"
        response = self.client.get(command)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_rotation_is_not_identity(response)

    def test_get_rotation_inverse(self):
        """Test the API that returns the list of available transformations

        URL = /rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reverse}

        """
        response = self.client.get(f"/rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reverse}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_rotation_is_not_identity(response)
    
    def test_get_rotation_rescale(self):
        """Test the API that returns the list of available transformations

        URL = /rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reference_scales}

        """
        response = self.client.get(f"/rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reference_scales}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_rotation_is_not_identity(response)
    
    def test_get_rotation_inverse_rescale(self):
        """Test the API that returns the list of available transformations

        URL = /rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reverse}/{self.reference_scales}

        """
        response = self.client.get(f"/rotation/{self.prep_id}/{self.annotator_id}/{self.COMsource}/{self.reverse}/{self.reference_scales}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_rotation_is_not_identity(response)
   
    def test_rotation_url_with_bad_animal(self):
        """Test the API that retrieves a specific transformation for a nonexistant animal and checks that the identity transform is returned

        URL = /rotation/XXX/2/MANUAL/

        """
        response = self.client.get("/rotation/XXX/2/MANUAL/")
        data = str(response.content, encoding='utf8')
        data = json.loads(data)
        translation = data['translation']
        s = np.sum(translation)
        self.assertEqual(s, 0, msg="Translation is equal to zero")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class TestAnnotations(TestSetUp):
    """A class for testing the annotations
    """

    def find_biggest_id(self, annotation_model='MarkedCell'):
        model = apps.get_model('neuroglancer', annotation_model)
        results = (model.objects.filter(annotation_session__neuroglancer_model__id__isnull=False)\
                .values('annotation_session__id', 'annotation_session__neuroglancer_model__id')\
                .annotate(dcount=Count('annotation_session__id'))\
                .order_by('-dcount'))
        if len(results) > 0:
            results = results[0]
        else:
            return 0,0,0
        session_id = results['annotation_session__id']
        state_id = results['annotation_session__neuroglancer_model__id']
        dcount = results['dcount']
        return session_id, state_id, dcount


    def delete_random_rows(self, annotation_model, session_id, predelete):
        model = apps.get_model('neuroglancer', annotation_model)
        deleterows = random.randint(1, predelete)
        ids = list(model.objects.filter(annotation_session__id=session_id).values_list('pk', flat=True))
        ids = random.sample(ids, deleterows)
        model.objects.filter(pk__in=ids).delete()
        return len(ids)

    def check_row_count(self, annotation_model, session_id):
        model = apps.get_model('neuroglancer', annotation_model)
        rows = model.objects.filter(annotation_session__id=session_id)
        return len(rows)

    def create_url(self, annotation_model):
        session_id, state_id, dcount = self.find_biggest_id(annotation_model=annotation_model)
        if session_id > 0:
            data = NeuroglancerState.objects.get(pk=state_id)
            json_txt = data.neuroglancer_state
            layers = json_txt['layers']
            for layer in layers:
                if 'annotations' in layer:
                    layer_name = layer['name']
                    break

            url = f"http://localhost:8000/save_annotations/{state_id}/{layer_name}"
            return url, session_id, dcount
        else:
            return None, None, None

    '''
    def test_get_big_marked_cell(self):
        """Test the API that returns a volume
        URL = /get_volume/{session_id}
        """

        session_id, state_id, dcount = self.find_biggest_id('MarkedCell')
        response = self.client.get(f"/get_marked_cell/{session_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    '''

    def test_get_big_volume(self):
        """Test the API that returns a volume
        URL = /get_volume/{session_id}
        """

        session_id, state_id, dcount = self.find_biggest_id('PolygonSequence')
        response = self.client.get(f"/get_volume/{session_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_get_com(self):
        """Test the API that returns coms
        URL = /get_com/{self.prep_id}/{self.annotator_id}/{self.COMsource}
        """

        response = self.client.get(f"/get_com/{self.prep_id}/{self.annotator_id}/{self.COMsource}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_save_marked_cells(self):
        """Test saving annotations.        
        URL = /save_annotations/<int:neuroglancer_state_id>/<str:annotation_layer_name>
        """
        model = 'MarkedCell'
        url, session_id, dcount = self.create_url(annotation_model=model)
        predelete = self.check_row_count(model, session_id=session_id)
        deletedrows = self.delete_random_rows(model, session_id, dcount)
        postdelete = self.check_row_count(model, session_id=session_id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        postsave = self.check_row_count(model, session_id=session_id)
        self.assertEqual(predelete, postsave)
        self.assertEqual(predelete, deletedrows + postdelete)



    def test_save_structure_com(self):
        """Test saving annotations.        
        URL = /save_annotations/<int:neuroglancer_state_id>/<str:annotation_layer_name>
        """
        model = 'StructureCom'
        url, session_id , dcount = self.create_url(annotation_model=model)
        if url is not None:
            pre = self.check_row_count(model, session_id=session_id)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            post = self.check_row_count(model, session_id=session_id)
            self.assertEqual(pre, post)

    '''
    def test_save_volume(self):
        """Test saving annotations.        
        URL = /save_annotations/<int:neuroglancer_state_id>/<str:annotation_layer_name>
        """
        model = 'PolygonSequence'
        url, session_id, dcount = self.create_url(annotation_model=model)
        predelete = self.check_row_count(model, session_id=session_id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        postsave = self.check_row_count(model, session_id=session_id)
        self.assertEqual(predelete, postsave)
    '''


    def test_get_volume_list(self):
        """Test the API that returns the list of volumes

        URL = /get_volume_list

        """
        response = self.client.get(f"/get_volume_list")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_com_list(self):
        """Test the API that returns the list of coms

        URL = /get_com_list

        """
        response = self.client.get(f"/get_com_list")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_marked_cell_list(self):
        """Test the API that returns the list of marked cell

        URL = /get_marked_cell_list

        """
        response = self.client.get(f"/get_marked_cell_list")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class TestNeuroglancer(TestSetUp):
    """URLs taken from neuroglancer/urls.py. 
    We should have one test per url.    
    """

    def test_neuroglancer_url(self):
        """tests the API that returns the list of available neuroglancer states
        
        URL = /neuroglancer

        """
        response = self.client.get("/neuroglancer")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_landmark_list(self):
        """tests the API that returns the list of available neuroglancer states
        
        URL = /landmark_list

        """
        response = self.client.get("/landmark_list")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_brain_region_count(self):
        n = BrainRegion.objects.count()
        self.assertGreater(n, 0, msg='Error: Brain region table is empty')
