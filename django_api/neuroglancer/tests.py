import json
from rest_framework import status
from django.test import Client, TestCase
from rest_framework.test import APIClient

from authentication.models import User
from brain.models import Animal, ScanRun
from neuroglancer.models import AnnotationSession, LAUREN_ID, AnnotationLabel


class TestSetUp(TestCase):
    client = Client()

    def setUp(self):
        self.username = 'beth'
        self.annotator_username = 'beth'
        self.annotator_id = 2
        self.prep_id = 'MD589'
        self.atlas_name = 'Atlas'
        self.label = 'SC'
        self.annotation_session_id = 7927
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

        # label
        try:
            query_set = AnnotationLabel.objects.filter(label=self.label)
        except AnnotationLabel.DoesNotExist:
            print(f'Cannot find label {self.label}')

        if query_set is not None and len(query_set) > 0:
            self.annotation_label = query_set[0]

        
        # annotation session brain
        query_set = AnnotationSession.objects \
            .filter(animal=self.animal)\
            .filter(labels=self.annotation_label)\
            .filter(annotator=self.annotator)


        if query_set is not None and len(query_set) > 0:
            self.annotation_session = query_set[0]
        else:
            self.annotation_session = AnnotationSession.objects.create(\
                animal=self.animal,
                labels=self.label,
                annotator=self.lauren
                )
        

        self.reverse=1
        self.reference_scales = '10,10,20'



class TestAnnotations(TestSetUp):
    """A class for testing the annotations
    path('annotations/labels', get_labels, name='get_labels'),
    path('annotations/labels/', search_label, name='search_labels'),
    path('annotations/labels/<str:search_string>', search_label, name='search_labels'),
    path('annotations/segmentation/<int:session_id>', Segmentation.as_view(),name = 'create_segmentation'),
    path('annotations/<int:session_id>', get_annotation, name='annotation_session_get'),
    path('annotations/new/', new_annotation, name='annotation_session_new'),
    path('annotations/save/', save_annotation, name='annotation_session_save'),
    path('annotations/search', search_annotation, name='search_annotations'),
    path('annotations/search/', search_annotation, name='search_annotations'),
    path('annotations/search/<str:search_string>', search_annotation, name='search_annotations'),

    """
    
    def test_get_label(self):
        """Test the API that returns labels
        """
        response = self.client.get("/annotations/labels")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_label_empty(self):
        """Test the API that returns labels, like above
        """
        response = self.client.get("/annotations/labels/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_labels(self):
        """Test the API that returns a new layer
        """
        response = self.client.get(f"/annotations/labels/{self.label}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_segmentation(self):
        """Test the API that returns a new layer
        """
        response = self.client.get(f"/annotations/segmentation/{self.annotation_session_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_annotation(self):
        """Test the API that returns labels
        """
        response = self.client.get(f"/annotations/{self.annotation_session_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_labels_no_ending_slash(self):
        """Test the API that returns a new layer
        """
        response = self.client.get("/annotations/search")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_labels_ending_slash(self):
        """Test the API that returns a new layer
        """
        response = self.client.get("/annotations/search/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    ## Now do the posts
    def test_wrong_method_on_annotations_new(self):
        """Test the API that returns a new layer
        """
        response = self.client.get("/annotations/new/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_wrong_method_on_annotations_save(self):
        """Test the API that returns a new layer
        """
        response = self.client.get("/annotations/save/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_annotations_new_id(self):
        """Test the API that creates a new annotation session
        """
        data = {"id": str(self.annotation_session_id), "label": self.label, "animal": self.animal.prep_id, "annotator": self.annotator.id, "annotation" : {"source": [1,2,3]}}
        client = APIClient()
        response = client.post('/annotations/new/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_annotations_new_noid(self):
        """Test the API that creates a new annotation session
        """
        data = {"label": self.label, "animal": self.animal.prep_id, "annotator": self.annotator.id, "annotation" : {"source": [1,2,3]}}
        client = APIClient()
        response = client.post('/annotations/new/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_annotations_save(self):
        """Test the API that updates an existing annotation session
        """
        data = {"id": str(self.annotation_session_id), "label": self.label, "animal": self.animal.prep_id, "annotator": self.annotator.id, "annotation" : {"source": [1,2,3]}}
        client = APIClient()
        response = client.post('/annotations/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)



