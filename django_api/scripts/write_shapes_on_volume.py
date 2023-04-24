"""
This program will query CVAT and create filled polygons
on the appropriate sections. It then creates a numpy volume and
then creates the precomputed volume for neuroglancer.
"""
import argparse
import os
import sys
import json
from cloudvolume import CloudVolume
from collections import defaultdict
import cv2
import numpy as np
from skimage import io
from taskqueue import LocalTaskQueue
import igneous.task_creation as tc
from scipy.interpolate import splprep, splev

HOME = os.path.expanduser("~")
PATH = os.path.join(HOME, 'programming/activebrainatlas')
sys.path.append(PATH)
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "activebrainatlas.settings")
import django
from django.db import connection
django.setup()

from brain.models import ScanRun


def interpolate(points, new_len):
    pu = points.astype(int)
    indexes = np.unique(pu, axis=0, return_index=True)[1]
    points = np.array([points[index] for index in sorted(indexes)])
    addme = points[0].reshape(1,2)
    points = np.concatenate((points,addme), axis=0)

    tck, u = splprep(points.T, u=None, s=3, per=1) 
    u_new = np.linspace(u.min(), u.max(), new_len)
    x_array, y_array = splev(u_new, tck, der=0)
    return np.concatenate([x_array[:,None],y_array[:,None]], axis=1)



def create_layer(animal, id, start):
    """
    This is the important method called from main. This does all the work.
    Args:
        animal: string to identify the animal/stack
        id: this is the CVAT task ID. you'll have to manually get it from looking at CVAT
        start: very important, this should be the number of the first section that was annotated

    Returns:
        Nothing, creates a directory of the precomputed volume. Copy this directory somewhere apache can read it. e.g.,
        /net/birdstore/Active_Atlas_Data/data_root/pipeline_data/
    """


    # Set all relevant directories
    INPUT = f'/net/birdstore/Active_Atlas_Data/data_root/pipeline_data/{animal}/preps/CH3/thumbnail_aligned'
    OUTPUT = '/net/birdstore/Active_Atlas_Data/data_root/pipeline_data/{animal}/preps/CH3/shapes'
    PRECOMPUTE_PATH = f'/net/birdstore/Active_Atlas_Data/data_root/pipeline_data/{animal}/neuroglancer_data/shapes'
    ATLAS_DIR = '/net/birdstore/Active_Atlas_Data/data_root/atlas_data'
    outpath = os.path.join(ATLAS_DIR, 'shapes', animal)
    os.makedirs(OUTPUT, exist_ok=True)
    os.makedirs(outpath, exist_ok=True)

    files = os.listdir(INPUT)
    num_sections = len(files)
    midpoint = num_sections // 2
    midfilepath = os.path.join(INPUT, files[midpoint])
    midfile = io.imread(midfilepath, img_num=0)
    height = midfile.shape[0]
    width = midfile.shape[1]
    structures = set()
    # the dictionary below should be set from the SQL. I hard coded it here to make it easy.
    colors = {'Trigeminal': 200}
    scan_run = ScanRun.objects.get(prep=animal)

    aligned_shape = np.array((width, height))

    section_structure_vertices = defaultdict(dict)
    with connection.cursor() as cursor:
        sql = """select el.frame + %s as section, el.points, elab.name 
          from engine_labeledshape el
          inner join engine_job ej on el.job_id = ej.id
          inner join engine_label elab on el.label_id = elab.id
          where elab.task_id = %s
          order by elab.name, el.frame"""
        cursor.execute(sql, [start, id])
        rows = cursor.fetchall()
    for row in rows:
        section = row[0]
        pts = row[1]
        structure = row[2]
        structures.add(structure)
        pts = np.array([tuple(map(float, x.split())) for x in pts.strip().split(',')])
        vertices = pts.reshape(pts.shape[0]//2, 2).astype(np.float64)
        addme = vertices[0].reshape(1,2)
        vertices = np.concatenate((vertices,addme), axis=0)
        lp = vertices.shape[0]
        if lp > 2:
            new_len = max(lp, 100)
            vertices = interpolate(vertices, new_len)
            section_structure_vertices[section][structure] = vertices


    ##### Alignment of annotation coordinates
    volume = np.zeros((aligned_shape[1], aligned_shape[0], num_sections), dtype=np.uint8)
    #for section in section_structure_vertices:
    for section, file in enumerate(files):
        template = np.zeros((aligned_shape[1], aligned_shape[0]), dtype=np.uint8)
        for structure in section_structure_vertices[section]:
            points = section_structure_vertices[section][structure]
            points = (points).astype(np.int32) // 4 #TODO what is the proper scaling for the data!!!!!!
            # cv2.polylines(template, [points], isClosed=True, color=1, thickness=1)
            cv2.fillPoly(template, pts=[points], color=colors[structure])
            print(section, structure, points.shape, np.unique(template), template.shape, np.amax(points), np.amin(points))

        volume[:, :, section - 1] = template
        
    volume = np.swapaxes(volume, 0, 1)
    ids = np.unique(volume)

    print('Volume info:', volume.shape, volume.dtype, 'ids:',ids)
    
    SCALING_FACTOR = 0.03125
    resolution = int(scan_run.resolution * 1000 / SCALING_FACTOR)

    scales = (resolution, resolution, int(scan_run.zresolution*1000))
    print('scales', scales)
    # Voxel offset
    offset = (0, 0, 0)
    # Layer type
    layer_type = 'segmentation'
    # number of channels
    num_channels = 1
    segmentation_properties = [(v,k) for k,v in colors.items()]
    print('seg', segmentation_properties)

    cloudpath = f'file://{PRECOMPUTE_PATH}'
    info = CloudVolume.create_new_info(
        num_channels = num_channels,
        layer_type = layer_type,
        data_type = str(volume.dtype), # Channel images might be 'uint8'
        encoding = 'raw', # raw, jpeg, compressed_segmentation, fpzip, kempressed
        resolution = scales, # Voxel scaling, units are in nanometers
        voxel_offset = offset, # x,y,z offset in voxels from the origin
        chunk_size = [64, 64, 64], # units are voxels
        volume_size = volume.shape, # e.g. a cubic millimeter dataset
    )
    vol = CloudVolume(cloudpath, mip=0, info=info, compress=True)
    vol.commit_info()
    vol[:, :, :] = volume[:, :, :]

    vol.info['segment_properties'] = 'names'
    vol.commit_info()

    segment_properties_path = os.path.join(PRECOMPUTE_PATH, 'names')
    os.makedirs(segment_properties_path, exist_ok=True)

    info = {
        "@type": "neuroglancer_segment_properties",
        "inline": {
            "ids": [str(number) for number, label in segmentation_properties],
            "properties": [{
                "id": "label",
                "description": "Name of structures",
                "type": "label",
                "values": [str(label) for number, label in segmentation_properties]
            }]
        }
    }
    print('Creating names in', segment_properties_path)
    with open(os.path.join(segment_properties_path, 'info'), 'w') as file:
        json.dump(info, file, indent=2)

    # Setting parallel to a number > 1 hangs the script. It still runs fast with parallel=1
    tq = LocalTaskQueue(parallel=1)
    tasks = tc.create_downsampling_tasks(cloudpath, compress=True) # Downsample the volumes
    tq.insert(tasks)
    tq.execute()
    
    tq = LocalTaskQueue(parallel=1)
    tasks = tc.create_meshing_tasks(cloudpath, mip=0, compress=True) # The first phase of creating mesh
    tq.insert(tasks)
    tq.execute()

    # It should be able to incoporated to above tasks, but it will give a weird bug. Don't know the reason
    tasks = tc.create_mesh_manifest_tasks(cloudpath) # The second phase of creating mesh
    tq.insert(tasks)
    tq.execute()

    
    
    print('Finished')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Work on Animal')
    parser.add_argument('--animal', help='Enter animal', required=True)
    parser.add_argument('--id', help='Enter ID', required=True)
    parser.add_argument('--start', help='Enter start', required=True)

    args = parser.parse_args()
    animal = args.animal
    id = int(args.id)
    start = int(args.start)
    create_layer(animal, id, start)


