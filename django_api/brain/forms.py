"""This module defines the forms necessary to perform the QC on the slides/scenes.
The user can rearrange, edit, and hide scenes with these forms.
"""
from django import forms
from django.db.models import Q
from django.forms import ModelChoiceField
from brain.models import Animal, Slide, SlideCziToTif


class AnimalForm(forms.Form):
    """Sets up fields for the select dropdown menu in forms.
    Animals are sorted by name.
    """
    prep_id = ModelChoiceField(label='Animal',
                               queryset=Animal.objects.all().order_by('prep_id'),
                               required=False,
                               widget=forms.Select(attrs={'onchange': 'id_list.submit();', 'class': 'form-control'}))

    class Meta:
        fields = ('prep_id',)

class AnimalChoiceField(forms.ModelChoiceField):
    """A simple class that returns the animal name.
    """
    def label_from_instance(self, obj):
        return obj.prep_id

def repeat_scene(slide, inserts, scene_number):
    """ Helper method to duplicate a scene.

    :param slide: An integer primary key of the slide.
    :param inserts: An integer defining how many scenes to insert.
    :param scene_number: An integer used to find the nearest neighbor
    """
    tifs = SlideCziToTif.objects.filter(slide=slide).filter(active=True) \
        .filter(scene_number=scene_number)

    if not tifs:
        tifs = find_closest_neighbor(slide, scene_number)

    for _ in range(inserts):
        create_scene(tifs, scene_number)


def remove_scene(slide, deletes, scene_number):
    """ Helper method to remove a scene.

    :param slide: An integer primary key of the slide.
    :param deletes: An integer defining how many scenes to delete.
    :param scene_number: An integer used to find the nearest neighbor
    """
    channels = SlideCziToTif.objects.filter(slide=slide).filter(active=True).values('channel').distinct().count()
    for channeli in range(channels):
        tifs = SlideCziToTif.objects.filter(slide=slide).filter(active=True) \
            .filter(scene_number=scene_number).filter(channel=channeli+1)[:deletes]
        for tif in tifs:
            tif.delete()


def create_scene(tifs, scene_number):
    """ Helper method to create a scene.

    :param tifs: A list of TIFFs.
    :param scene_number: An integer used to find the nearest neighbor
    """
    for tif in tifs:
        newtif = tif
        newtif.active = True
        newtif.pk = None
        newtif.scene_number = scene_number
        newtif.save()


def find_closest_neighbor(slide, scene_number):
    """Helper method to get the nearest scene. Look first at the preceding tifs, 
        if nothing is there, go for the one just after.

    :param slide:  primary key of the slide
    :param scene_number: scene number. 1 per set of 3 channels
    :return:  set of tifs
    """
    channels = get_slide_channels(slide)

    below = SlideCziToTif.objects.filter(slide=slide).filter(active=True) \
                .filter(scene_number__lt=scene_number).order_by('-scene_number')[:channels]
    if below.exists():
        tifs = below
    else:
        tifs = SlideCziToTif.objects.filter(slide=slide).filter(active=True) \
                .filter(scene_number__gt=scene_number).order_by('scene_number')[:channels]

    return tifs


def set_scene_active_inactive(slide, scene_number, active):
    """ Helper method to set a scene as active or inactive.

    :param slide: An integer for the primary key of the slide.
    :param scene_number: An integer used to find the nearest neighbor.
    :param active: A boolean defining whether to set the scene active or inactive
    """
    tifs = SlideCziToTif.objects.filter(slide=slide).filter(scene_number=scene_number).order_by('scene_number')
    for tif in tifs:
        tif.active = active
        tif.save()

def set_end(slide, scene_number):
    """ Helper method to set a scene as the very last one in a brain.

    :param slide: An integer for the primary key of the slide.
    :param scene_number: An integer used to find the nearest neighbor.
    """
    tifs = SlideCziToTif.objects.filter(slide=slide).filter(scene_number__gte=scene_number)
    for tif in tifs:
        tif.active = False
        tif.save()

def get_slide_channels(slide):
    channels = SlideCziToTif.objects.filter(slide=slide).filter(active=True).values('channel').distinct().count()
    return channels

def scene_reorder(slide):
    """ Helper method to reorder a set of scenes.

    :param slide: An integer for the primary key of the slide.
    """
    scenes_tifs = SlideCziToTif.objects.filter(slide=slide).filter(active=True).order_by('scene_number')
    channels = get_slide_channels(slide)
    len_tifs = len(scenes_tifs) + 1
    flattened = [item for sublist in [[i] * channels for i in range(1, len_tifs)] for item in sublist]
    print('Scene reordering')
    for new_scene, tif in zip(flattened, scenes_tifs):  # iterate over the scenes
        print(f'channel={tif.channel} scene index={tif.scene_index} old scene number={tif.scene_number}', end="\t")
        tif.scene_number = new_scene
        tif.save()
        print(f'new scene number={tif.scene_number} new_scene={new_scene}')

def save_slide_model(self, request, obj, form, change):
    """This method overrides the slide save method.

    :param request: The HTTP request.
    :param obj: The slide object.
    :param form: The form object.
    :param change: unused variable, shows if the form has changed.
    """

    """
    taking out QC on slides as the user can activate/inactive them in the TIF inline form
    qc_1 = form.cleaned_data.get('scene_qc_1')
    qc_2 = form.cleaned_data.get('scene_qc_2')
    qc_3 = form.cleaned_data.get('scene_qc_3')
    qc_4 = form.cleaned_data.get('scene_qc_4')
    qc_5 = form.cleaned_data.get('scene_qc_5')
    qc_6 = form.cleaned_data.get('scene_qc_6')
    qc_7 = form.cleaned_data.get('scene_qc_7')
    qc_8 = form.cleaned_data.get('scene_qc_8')


    # do the QC fields
    OUTOFFOCUS = 1
    BADTISSUE = 2
    END = 3
    OK = 0
    qc_values = [qc_1, qc_2, qc_3, qc_4, qc_5, qc_6, qc_7, qc_8]
    current_qcs = Slide.objects.values_list('scene_qc_1', 'scene_qc_2', 'scene_qc_3', 'scene_qc_4',
                                            'scene_qc_5', 'scene_qc_6', 'scene_qc_7', 'scene_qc_8').get(pk=obj.id)
    # this top loop needs to be run before the 2nd loop to make sure the required
    # tifs get set to inactive before finding a nearest neighbour
    for qc_value, current_qc, scene_number in zip(qc_values, current_qcs, scene_numbers):
        if qc_value in [OUTOFFOCUS, BADTISSUE] and qc_value != current_qc:
            set_scene_active_inactive(obj, scene_number, False)
    # tifs get set to active to back out a mistake
    for qc_value, current_qc, scene_number in zip(qc_values, current_qcs, scene_numbers):
        if qc_value == OK and qc_value != current_qc:
            set_scene_active_inactive(obj, scene_number, True)

    for qc_value, current_qc, scene_number in zip(qc_values, current_qcs, scene_numbers):
        if qc_value == END and qc_value != current_qc:
            set_end(obj, scene_number)
    """
    # scene numbers is wrong, need the indexes from the tifs
    scene_numbers = [1, 2, 3, 4, 5, 6, 7, 8]
    form_names = ['insert_before_one', 'insert_between_one_two', 'insert_between_two_three','insert_between_three_four',
                  'insert_between_four_five', 'insert_between_five_six', 'insert_between_six_seven', 'insert_between_seven_eight']
    insert_values = [form.cleaned_data.get(name) for name in form_names]

    # moves = sum([value for value in insert_values if value is not None])
    # scene_count = obj.scenes
    # scenes = range(1, scene_count + 1)
    ## do the inserts
    current_values = Slide.objects.values_list('insert_before_one', 'insert_between_one_two',
                                               'insert_between_two_three', 'insert_between_three_four', 
                                               'insert_between_four_five', 'insert_between_five_six',
                                               'insert_between_six_seven', 'insert_between_seven_eight',
                                               ).get(pk=obj.id)

    for new, current, scene_number in zip(insert_values, current_values, scene_numbers):
        if new is not None and new > current:
            difference = new - current
            repeat_scene(obj, difference, scene_number)
        if new is not None and new < current:
            difference = current - new
            remove_scene(obj, difference, scene_number)

    scene_reorder(obj)
    obj.scenes = SlideCziToTif.objects.filter(slide=obj).filter(channel=1).filter(active=True).count()

class TifInlineFormset(forms.models.BaseInlineFormSet):
    """This class defines the form for the subsets of scenes for a slide.
    This is where the work is done for rearranging and editing the scenes.
    """

    def save_existing(self, form, instance, commit=True):
        """This is called when updating an instance of the inline tifs associated with a slide.
        The only thing to update is the scene order in case a user changes a number in the scene
        number text box. Note that the tifs in the form are only with channel 1, but if we 
        reorder the scenes, we need to do it on all channels, not just channel 1.

        :param form: Form object.
        :param instance: slide CZI TIFF object.
        :param commit: A boolean stating if the object should be committed.
        """
        print(f'save existing commit={str(commit)}')
        obj = super(TifInlineFormset, self).save_existing(form, instance, commit=True)
        channel_count = get_slide_channels(obj.slide) + 1
        other_channels = [i for i in range(2,channel_count)]
        # list of tuples where the 1st element in tuple is scene number and 2nd element is active
        orderings = list(SlideCziToTif.objects.filter(slide=obj.slide).filter(channel=1).order_by('scene_index').values_list('scene_number', 'active'))

        for channel in other_channels:
            tifs = SlideCziToTif.objects.filter(slide=obj.slide).filter(channel=channel).order_by('scene_index')
            for i, tif in enumerate(tifs):
                tif.scene_number = orderings[i][0]
                tif.active = orderings[i][1]
                tif.save()
        
        #scene_reorder(obj.slide)
        return obj
