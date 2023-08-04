import os, sys
import argparse
from pathlib import Path
from django.db.models import Count
from django.apps import apps
import requests
import random

PIPELINE_ROOT = Path('./').absolute()
sys.path.append(PIPELINE_ROOT.as_posix())

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "brainsharer.settings")
import django
django.setup()

from neuroglancer.models import NeuroglancerState, MarkedCell, StructureCom, PolygonSequence
from neuroglancer.tasks import upsert_annotations

"""
select mc.FK_session_id, as2.FK_state_id, count(*) as c
from marked_cells mc  
inner join annotation_session as2 on mc.FK_session_id=as2.id
where as2.FK_state_id is not null
group by mc.FK_session_id,as2.FK_state_id
order by c desc limit 10;
"""

def find_biggest_id(annotation_model='MarkedCell'):
    model = apps.get_model('neuroglancer', annotation_model)
    results = (model.objects.filter(annotation_session__neuroglancer_model__id__isnull=False)\
            .values('annotation_session__id', 'annotation_session__neuroglancer_model__id')\
            .annotate(dcount=Count('annotation_session__id'))\
            .order_by('-dcount'))[0]
    session_id = results['annotation_session__id']
    state_id = results['annotation_session__neuroglancer_model__id']
    dcount = results['dcount']
    return session_id, state_id, dcount


def delete_random_rows(annotation_model, session_id, predelete):
    model = apps.get_model('neuroglancer', annotation_model)
    deleterows = random.randint(1, predelete)
    ids = list(model.objects.filter(annotation_session__id=session_id).values_list('pk', flat=True))
    ids = random.sample(ids, deleterows)
    model.objects.filter(pk__in=ids).delete()
    rows = model.objects.filter(annotation_session__id=session_id)
    postdelete = len(rows)
    print(f'After delete, {annotation_model} had {len(rows)} rows')
    print(f'Math: {predelete} = {deleterows} + {postdelete} = {int(deleterows) + int(postdelete)}')

def check_deletion(annotation_model, session_id):
    model = apps.get_model('neuroglancer', annotation_model)
    rows = model.objects.filter(annotation_session__id=session_id)
    postsave = len(rows)
    print(f'After save, {annotation_model} had {postsave} rows')



def create_url(annotation_model):
    session_id, state_id, dcount = find_biggest_id(annotation_model=annotation_model)
    data = NeuroglancerState.objects.get(pk=state_id)
    json_txt = data.neuroglancer_state
    layers = json_txt['layers']
    for layer in layers:
        if 'annotations' in layer:
            layer_name = layer['name']
            break

    print(f'Found {dcount} rows with session ID={session_id}')
    return f"http://localhost:8000/save_annotations/{state_id}/{layer_name}", session_id, dcount


def save_annotations(url: str) -> dict:
    resp = requests.get(url)
    return resp.json()


def parse_annotations(neuroglancer_state_id: int, annotation_layer_name: str):
    neuroglancerState = NeuroglancerState.objects.get(pk=neuroglancer_state_id)
    state_json = neuroglancerState.neuroglancer_state
    layers = state_json['layers']
    for layer in layers:
        if layer['type'] == 'annotation' and layer['name'] == annotation_layer_name:
            upsert_annotations(layer, neuroglancer_state_id)                    


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Work on Animal')
    parser.add_argument('--id', help='Enter ID', required=False, type=int, default=0)
    parser.add_argument('--model', help='Enter MarkedCell|StructureCom|PolygonSequence', required=False, type=str, default='MarkedCell')
    parser.add_argument('--layername', help='Enter layer name', required=False, type=str)
    

    args = parser.parse_args()
    model = args.model
    id = args.id
    annotation_layer_name = args.layername
    """
    url, session_id, dcount = create_url(model)
    print(url)
    delete_random_rows(model, session_id, dcount)
    data = save_annotations(url)
    print(data)
    check_deletion(model, session_id)
    """
    parse_annotations(id, annotation_layer_name)


