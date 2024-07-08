from collections import defaultdict
import numpy as np
import os
from cloudvolume import CloudVolume
import cv2
from scipy.interpolate import splev, splprep

from neuroglancer.atlas import get_scales
from neuroglancer.contours.ng_segment_maker import NgConverter
from neuroglancer.models import AnnotationSession


M_UM_SCALE = 1000000
COLOR = 1


def get_session(request_data: dict):
    """
    Retrieves an annotation session based on the provided request data.

    Args:
        request_data (dict): A dictionary containing the request data.

    Returns:
        AnnotationSession: The retrieved annotation session.

    """
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
    """
    This gets the row data from the annnotation_session table and creates a dictionary of polygons.
    This dictionary is then used to create a volume.

    Args:
        data (dict): The data containing polygon information.
        xy_scale (float): The scale factor for x and y coordinates.
        z_resolution (int): The resolution factor for z coordinates.
        downsample_factor (int): The downsample factor for x, y, and z coordinates.

    Returns:
        dict: A dictionary containing the polygons grouped by section.

    """
    polygons = defaultdict(list)
    # first test data to make sure it has the right keys    
    try:
        polygon_data = data['childJsons']
    except KeyError:
        return "No childJsons key in data. Check the data you are sending."
    
    for polygon in polygon_data:
        try:
            lines = polygon['childJsons']
        except KeyError:
            return "No data. Check the data you are sending."
        x0,y0,z0 = lines[0]['pointA']
        x0 = x0 * M_UM_SCALE / xy_scale / downsample_factor
        y0 = y0 * M_UM_SCALE / xy_scale / downsample_factor
        z0 = int(round(z0 * M_UM_SCALE / z_resolution))
        for line in lines:
            x,y,z = line['pointA']
            x = x * M_UM_SCALE / xy_scale / downsample_factor
            y = y * M_UM_SCALE / xy_scale / downsample_factor
            z = z * M_UM_SCALE / z_resolution
            xy = (x, y)
            section = int(np.round(z))
            polygons[section].append(xy)
        polygons[z0].append((x0, y0))
    
    return polygons


def create_volume_within_volume(polygons, width, height, z_length):
    """
    Create a volume representation of polygons within a given volume.

    Args:
        polygons (dict): A dictionary where the keys represent the z-coordinate and the values are lists of 2D points.
        width (int): The width of the volume.
        height (int): The height of the volume.
        z_length (int): The length of the volume along the z-axis.

    Returns:
        numpy.ndarray: A 3D numpy array representing the volume, where each slice contains the polygons filled with a specific color.

    """
    volume = np.zeros((height, width, z_length), dtype=np.float64)

    for z, points in polygons.items():
        points = interpolate2d(points, 100)
        points = np.array(points, dtype=np.int32)
        volume_slice = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(volume_slice, pts=[points], color=COLOR)
        volume[..., z] += volume_slice
    volume = np.swapaxes(volume, 0, 1)
    return volume.astype(np.uint8)


def create_volume(polygons, origin, section_size):
    """
    Create a volume from a collection of polygons. Each section contains a polygon which is composed of a list of lines.
    Each line is composed of two points. All these points are fetched in the correct order and used to create the volume.
    Here are the steps:
        1. For each section get the points of the polygon

        2. Subtract the origin from the points so we create a box the size of the biggest polygon

        3. Create a slice of the volume with the size of the section

        4. Draw the polygon on the slice with opencv

        5. Append the slice to the volume (box)

        6. Return an array of integers (0 and 1s)


    Args:
        polygons (dict): A dictionary of polygons, where the keys are polygon IDs and the values are lists of points.
        origin (tuple): The origin of the volume.
        section_size (tuple): The size of the sections in the volume.

    Returns:
        numpy.ndarray: The created volume as a 3D numpy array.

    """
    volume = []
    color = 1
    for _, points in polygons.items():
        points = np.array(points) - origin[:2]
        points = (points).astype(np.int32)
        volume_slice = np.zeros(section_size, dtype=np.uint8)
        volume_slice = cv2.polylines(volume_slice, [points], isClosed=True, color=color, thickness=1)
        volume_slice = cv2.fillPoly(volume_slice, pts=[points], color=color)
        volume.append(volume_slice)
    volume = np.array(volume)
    volume = np.swapaxes(volume, 0, 2)
    return volume.astype(np.uint8)


def get_origin_and_section_size(structure_contours):
    """
    Calculate the origin and section size based on the given structure contours.

    Parameters:
    - structure_contours: dict
    A dictionary containing structure contours, where the keys are section numbers and the values are lists of points.

    Returns:
    - origin: numpy.ndarray
    An array representing the origin of the section, in the format [x, y, z].
    - section_size: numpy.ndarray
    An array representing the size of the section, in the format [width, height].
    """
    section_mins = []
    section_maxs = []
    for _, points in structure_contours.items():
        points = np.array(points)
        section_mins.append(np.min(points, axis=0))
        section_maxs.append(np.max(points, axis=0))
    min_z = min([int(i) for i in structure_contours.keys()])
    min_x, min_y = np.min(section_mins, axis=0)
    max_x, max_y = np.max(section_maxs, axis=0)

    xspan = max_x - min_x
    yspan = max_y - min_y
    origin = np.array([min_x, min_y, min_z])
    # flipped yspan and xspan 19 Oct 2023
    section_size = np.array([yspan, xspan]).astype(int)
    return origin, section_size


def create_segmentation_folder(volume, animal, downsample_factor, label, offset):
    """
    Creates a segmentation folder for a given volume, animal, label, and offset.

    Args:
        volume (str): The volume to be used for segmentation.
        animal (str): The name of the animal.
        downsample_factor (int): The downsample factor for the segmentation.
        label (str): The label for the segmentation.
        offset (tuple): The offset for the segmentation.

    Returns:
        str: The name of the created folder.
    """
    folder_name = f'{animal}_{label}'
    path = '/var/www/brainsharer/structures'
    output_dir = os.path.join(path, folder_name)
    xy_scale, zresolution = get_scales(animal)
    xy_scale = xy_scale * 1000 * downsample_factor  # neuroglancer wants it in nm
    zresolution = zresolution * 1000
    scales = [int(xy_scale), int(xy_scale), int(zresolution)]

    maker = NgConverter(volume=volume, scales=scales, offset=offset)
    segment_properties = {1: label}
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
