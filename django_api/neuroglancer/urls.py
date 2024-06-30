from django.urls import path, include
from neuroglancer.views import GetAnnotation, GetLabels, NeuroglancerViewSet, NeuroglancerPublicViewSet,  \
    SearchAnnotations, SearchLabels, annotation_session_api, create_state, Rotation, ContoursToVolume

from rest_framework import routers
app_name = 'neuroglancer'

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'neuroglancer', NeuroglancerViewSet, basename='neuroglancer') # private portal data
router.register(r'neuroglancers', NeuroglancerPublicViewSet, basename='neuroglancers') # public data

annotation_urls = [
    path('annotations/search', SearchAnnotations.as_view(), name='search_annotations'),
    path('annotations/search/', SearchAnnotations.as_view(), name='search_annotations'),
    path('annotations/search/<str:search_string>', SearchAnnotations.as_view(), name='search_annotations'),
    path('annotations/<int:session_id>', GetAnnotation.as_view(), name='get_annotations'),
    path('annotations/labels', GetLabels.as_view(), name='search_labels'),
    path('annotations/labels/', SearchLabels.as_view(), name='search_labels'),
    path('annotations/labels/<str:search_string>', SearchLabels.as_view(), name='search_labels'),
    path('annotations/', annotation_session_api, name='annotation_model_session'),
    path('annotations/contour_to_segmentation/<int:neuroglancer_state_id>/<str:volume_id>',ContoursToVolume.as_view(),name = 'contour_to_segmentation'),
]

general_urls = [
    path('', include(router.urls)),
    path('createstate', create_state)
]

transformation_relate_urls = [ 
    path('rotation/<str:prep_id>/<int:annotator_id>/<str:source>/', Rotation.as_view()),
    path('rotation/<str:prep_id>/<int:annotator_id>/<str:source>/<int:reverse>', Rotation.as_view()),
    path('rotation/<str:prep_id>/<int:annotator_id>/<str:source>/<str:reference_scales>', Rotation.as_view()),
    path('rotation/<str:prep_id>/<int:annotator_id>/<str:source>/<int:reverse>/<str:reference_scales>', Rotation.as_view())
]


urlpatterns = annotation_urls + general_urls + transformation_relate_urls