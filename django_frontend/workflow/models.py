from django.db import models

from brain.models import Animal, SlideCziToTif

class AtlasWorkflowModel(models.Model):
    """Base model for all the models in the workflow app
    """

    id = models.AutoField(primary_key=True)
    active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class FileLog(AtlasWorkflowModel):
    prep = models.ForeignKey(Animal, models.CASCADE)
    progress = models.ForeignKey(
        'ProgressLookup', models.CASCADE, db_column='progress_id')
    filename = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = 'file_log'
        verbose_name = 'File Log'
        verbose_name_plural = 'File Logs'

    def __str__(self):
        return u'{} {} {}'.format(self.prep.prep_id, self.progress.description, self.filename)

class FileOperation(AtlasWorkflowModel):
    """This class stores the logs of operations done during the pre-processing pipeline
    """

    tif = models.ForeignKey(SlideCziToTif, models.CASCADE)
    operation = models.CharField(max_length=200)
    file_size = models.FloatField()

    class Meta:
        managed = False
        db_table = 'file_operation'
        verbose_name = 'File Operation'
        verbose_name_plural = 'File Operations'


class Log(AtlasWorkflowModel):
    prep = models.ForeignKey(Animal, models.CASCADE)
    logger = models.CharField(
        max_length=100, blank=False, verbose_name='Log Source')
    level = models.CharField(max_length=25)
    msg = models.CharField(max_length=255, blank=False, verbose_name='Message')

    class Meta:
        managed = False
        db_table = 'logs'
        verbose_name = 'Log'
        verbose_name_plural = 'Logs'

    def __str__(self):
        return u'{} {}'.format(self.prep.prep_id, self.msg)


class ProgressLookup(AtlasWorkflowModel):
    description = models.TextField()
    script = models.CharField(max_length=200, blank=True, null=True)
    channel = models.IntegerField(null=False, default=0)
    action = models.CharField(max_length=25, blank=True)
    downsample = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'progress_lookup'
        verbose_name = 'Pipeline lookup'
        verbose_name_plural = 'Pipeline lookups'

    def __str__(self):
        return u'{}'.format(self.description)


class Task(AtlasWorkflowModel):
    lookup = models.ForeignKey(
        ProgressLookup, models.CASCADE, related_name='lookup')
    prep = models.ForeignKey(Animal, models.CASCADE, related_name='animal')
    completed = models.BooleanField()
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'task'
        unique_together = (('prep', 'lookup'),)
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'

    def __str__(self):
        return u'{} {}'.format(self.prep.prep_id, self.lookup.description)


class TaskView(models.Model):
    """This is a view so it does not inherit from AtlasWorkFlowModel
    """

    prep_id = models.CharField(primary_key=True, max_length=20)
    percent_complete = models.DecimalField(max_digits=6, decimal_places=2)
    complete = models.IntegerField()
    created = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = 'task_view'
        verbose_name = 'Pipeline Progress'
        verbose_name_plural = 'Pipeline Progress'

    def __str__(self):
        return u'{}'.format(self.prep_id)



class TableMetadata(AtlasWorkflowModel):
    tablename = models.CharField(
        blank=False, max_length=100, db_column='table_name')
    entry = models.TextField(blank=False, verbose_name='Table description')
    category = models.CharField(max_length=25,
                                choices=[
                                    ('admin', 'admin'),
                                    ('animal', 'animal'),
                                    ('cvat', 'cvat'),
                                    ('neuroglancer', 'neuroglancer'),
                                    ('pipeline', 'pipeline'),
                                ])

    class Meta:
        managed = False
        db_table = 'table_metadata'
        verbose_name = 'Table metadata'
        verbose_name_plural = 'Table metadata'

    def __str__(self):
        return u'{} {}'.format(self.tablename, self.entry[0:50])
