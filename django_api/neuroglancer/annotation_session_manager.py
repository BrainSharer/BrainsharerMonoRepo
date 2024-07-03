from collections import defaultdict
import numpy as np
import os
from cloudvolume import CloudVolume
import cv2
from skimage.filters import gaussian
from scipy.interpolate import splev, splprep

from neuroglancer.atlas import get_scales
from neuroglancer.contours.ng_segment_maker import NgConverter
from neuroglancer.models import AnnotationSession


M_UM_SCALE = 1000000
COLOR = 1


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


def create_polygons(data: dict, xy_scale: float, z_resolution: int, downsample_factor: int):
    polygons = defaultdict(list)
    polygon_data = data['childJsons']
    for polygon in polygon_data:
        lines = polygon['childJsons']
        
        x0,y0,z0 = lines[0]['pointA']
        x0 = x0 * M_UM_SCALE / xy_scale / downsample_factor
        y0 = y0 * M_UM_SCALE / xy_scale / downsample_factor
        z0 = int(round(z0 * M_UM_SCALE / z_resolution))
        for j, line in enumerate(lines):
            x,y,z = line['pointA']
            x = x * M_UM_SCALE / xy_scale / downsample_factor
            y = y * M_UM_SCALE / xy_scale / downsample_factor
            z = z * M_UM_SCALE / z_resolution
            xy = (x, y)
            section = int(np.round(z))
            polygons[section].append(xy)
            #print(f'\tpoint {j} {x} {y} {section}')
        polygons[z0].append((x0, y0))
    
    return polygons

def create_volume(polygons, width, height, z_length):
    volume = np.zeros((height, width, z_length), dtype=np.float64)
    print(f'volume shape: {volume.shape}')

    for z, points in polygons.items():
        #points = interpolate2d(points, 100)
        points = np.array(points, dtype=np.int32)
        volume_slice = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(volume_slice, pts = [points], color = COLOR)
        volume[..., z] += volume_slice
    volume = np.swapaxes(volume, 0, 1)
    #volume = cv2.GaussianBlur(volume, (3,3), 1)
    #volume = gaussian(volume, 1, truncate=2)
    return volume.astype(np.uint8)

def create_segmentation_folder(volume, animal, downsample_factor, label):
    folder_name = f'{animal}_{label}'
    path = '/var/www/brainsharer/structures'
    output_dir = os.path.join(path, folder_name)
    xy_scale, zresolution = get_scales(animal)
    xy_scale = xy_scale * 1000 * downsample_factor# neuroglancer wants it in nm
    zresolution = zresolution * 1000
    scales = [int(xy_scale), int(xy_scale), int(zresolution)]
    print(scales)

    maker = NgConverter(volume=volume, scales=scales, offset=[0,0,0])
    segment_properties = {1:label}
    maker.reset_output_path(output_dir)
    maker.init_precomputed(output_dir)
    
    cloudpath = f'file://{output_dir}'
    cloud_volume = CloudVolume(cloudpath, 0)
    maker.add_segment_properties(cloud_volume=cloud_volume, segment_properties=segment_properties)
    maker.add_segmentation_mesh(cloud_volume.layer_cloudpath, mip=0)
    return folder_name


def interpolate2d(points, new_len):
    """Interpolates a list of tuples to the specified length. The points param
    must be a list of tuples in 2d
    
    :param points: list of floats
    :param new_len: integer you want to interpolate to. This will be the new length of the array
    There can't be any consecutive identical points or an error will be thrown
    unique_rows = np.unique(original_array, axis=0)
    """

    pu = np.array(points, dtype=np.float64)
    indexes = np.unique(pu, axis=0, return_index=True)[1]
    points = np.array([points[index] for index in sorted(indexes)])

    tck, u = splprep(points.T, u=None, s=3, per=1)
    u_new = np.linspace(u.min(), u.max(), new_len)
    x_array, y_array = splev(u_new, tck, der=0)
    arr_2d = np.concatenate([x_array[:, None], y_array[:, None]], axis=1)
    return arr_2d
