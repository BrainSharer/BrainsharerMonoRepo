from neuroglancer.models import AnnotationSession


def get_session(request_data: dict):

    animal = request_data.get('animal')
    label = request_data.get('label')
    annotator = request_data.get('annotator')
    
    annotation_session = AnnotationSession.objects.filter(active=True)\
        .filter(label=label)\
        .filter(animal=animal)\
        .filter(annotator=annotator)\
        .order_by('-created').first()
        
    return annotation_session

