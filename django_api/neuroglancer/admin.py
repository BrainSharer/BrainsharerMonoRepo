"""This module creates the admin interface for all the Neuroglancer tools used by the user.
It lists the classes and methods used to administer the 'Neuroglancer' app in 
our database portal. This is where the end user can create, retrieve, update and delete (CRUD)
metadata associated with the 'Neuroglancer' app. It does not list the fields (database columns). Look 
in the models document for the database table model. 
"""

from django.db import models
from django.conf import settings
from django.contrib import admin
from django.forms import TextInput
from django.urls import reverse, path
from django.utils.html import format_html
from django.template.response import TemplateResponse
from plotly.offline import plot
import plotly.express as px
from brain.admin import AtlasAdminModel, ExportCsvMixin
from neuroglancer.models import AnnotationSession, BrainRegion, CellType, \
    NeuroglancerState, Points
from neuroglancer.dash_view import dash_scatter_view
from neuroglancer.url_filter import UrlFilter



def datetime_format(dtime):
    """A method to return a nicely formatted date and time.
    """
    return dtime.strftime("%d %b %Y %H:%M")

def get_points_in_session(id):
    """Shows how many points are in data.
    TODO
    """

    session = AnnotationSession.objects.get(pk=id)
    points = []
    return len(points)


@admin.register(NeuroglancerState)
class NeuroglancerStateAdmin(admin.ModelAdmin):
    """This class provides the admin backend to the JSON data produced by Neuroglancer.
    In the original version of Neuroglancer, all the data was stored in the URL, hence
    the name of this class. The name: 'NeuroglancerState' will be changed in future versions.
    """
    formfield_overrides = {
        models.CharField: {'widget': TextInput(attrs={'size': '80'})},
    }
    list_display = ('id', 'animal', 'open_neuroglancer', 'public_description', 'public', 'readonly', 'open_multiuser', 'owner', 'lab', 'created')
    list_per_page = 25
    ordering = ['-readonly', '-updated']
    readonly_fields = ['user_date']
    list_filter = ['updated', 'created', 'readonly', UrlFilter, 'public']
    search_fields = ['id', 'comments', 'description']

    def get_queryset(self, request):
        """Returns the query set of points where the layer contains annotations"""
        rows = NeuroglancerState.objects.all()
        rows = rows.defer('neuroglancer_state')
        if not request.user.is_superuser:
            labs = [p.id for p in request.user.labs.all()]
            rows = rows.filter(owner__lab__in=labs)
        
        return rows

    def __init__(self, model, admin_site):
        super().__init__(model, admin_site)

    def open_neuroglancer(self, obj):
        """This method creates an HTML link that allows the user to access Neuroglancer"""
        host = settings.NG_URL
        links = f'<a target="_blank" href="{host}?id={obj.id}">{obj.comments}</a>'
        return format_html(links)
    
    def public_description(self, obj):
        """This method displays HTML"""
        if obj.description is None:
            return 'NA'
        else:
            return format_html(obj.description)

    def open_multiuser(self, obj):
        """This method creates an HTML link that allows the user to access Neuroglancer 
        in multi user mode.
        """
        host = settings.NG_URL
        comments = "Multi-user"
        links = f'<a target="_blank" href="{host}?id={obj.id}&amp;multi=1">{comments}</a>'
        return format_html(links)

    open_neuroglancer.short_description = 'Neuroglancer'
    open_neuroglancer.allow_tags = True
    open_multiuser.short_description = 'Multi-User'
    open_multiuser.allow_tags = True


@admin.register(Points)
class PointsAdmin(admin.ModelAdmin):
    """This class may become deprecated, but for now it gets point data
    from the actual JSON and not the 3 new tables we have that contain x,y,z data.
    """

    list_display = ('animal', 'comments', 'owner', 'show_points', 'updated')
    ordering = ['-created']
    readonly_fields = ['neuroglancer_state', 'created', 'user_date', 'updated']
    search_fields = ['comments']
    list_filter = ['created', 'updated', 'readonly']

    def created_display(self, obj):
        """Returns a nicely formatted creation date."""
        return datetime_format(obj.created)
    created_display.short_description = 'Created'

    def get_queryset(self, request):
        """Returns the query set of points where the layer contains annotations"""
        points = Points.objects.filter(
            neuroglancer_state__layers__contains={'type': 'annotation'})
        return points

    def show_points(self, obj):
        """Shows the HTML for the link to the graph of data."""
        return format_html(
            '<a href="{}">3D Graph</a>&nbsp; <a href="{}">Data</a>',
            reverse('admin:points-3D-graph', args=[obj.pk]),
            reverse('admin:points-data', args=[obj.pk])
        )

    def get_urls(self):
        """Shows the HTML of the links to go to the graph, and table data."""
        urls = super().get_urls()
        custom_urls = [
            path(r'scatter/<pk>', dash_scatter_view, name="points-2D-graph"),
            path('points-3D-graph/<id>', self.view_points_3Dgraph,
                 name='points-3D-graph'),
            path('points-data/<id>', self.view_points_data, name='points-data'),
        ]
        return custom_urls + urls

    def view_points_3Dgraph(self, request, id, *args, **kwargs):
        """Provides a link to the 3D point graph

        :param request: http request
        :param id:  id of neuroglancer_state
        :param args:
        :param kwargs:
        :return: 3dGraph in a django template
        """
        neuroglancerState = NeuroglancerState.objects.get(pk=id)
        df = neuroglancerState.points
        plot_div = "No points available"
        if df is not None and len(df) > 0:
            self.display_point_links = True
            fig = px.scatter_3d(df, x='X', y='Y', z='Section',
                                color='Layer', opacity=0.7)
            fig.update_layout(
                scene=dict(
                    xaxis=dict(nticks=4, range=[20000, 60000], ),
                    yaxis=dict(nticks=4, range=[10000, 30000], ),
                    zaxis=dict(nticks=4, range=[0, 450], ), ),
                width=1200,
                margin=dict(r=0, l=0, b=0, t=0))
            fig.update_traces(marker=dict(size=2),
                              selector=dict(mode='markers'))
            plot_div = plot(fig, output_type='div', include_plotlyjs=False)
        context = dict(
            self.admin_site.each_context(request),
            title=neuroglancerState.comments,
            chart=plot_div
        )
        return TemplateResponse(request, "admin/neuroglancer/points_graph.html", context)

    def view_points_data(self, request, id, *args, **kwargs):
        """Provides the HTML link to the table data"""
        neuroglancerState = NeuroglancerState.objects.get(pk=id)
        df = neuroglancerState.points
        result = 'No data'
        display = False
        if df is not None and len(df) > 0:
            display = True
            df = df.sort_values(by=['Layer', 'Section', 'X', 'Y'])
            result = df.to_html(
                index=False, classes='table table-striped table-bordered', table_id='tab')
        context = dict(
            self.admin_site.each_context(request),
            title=neuroglancerState.comments,
            chart=result,
            display=display,
            opts=NeuroglancerState._meta,
        )
        return TemplateResponse(request, "admin/neuroglancer/points_table.html", context)

    def has_delete_permission(self, request, obj=None):
        """Returns false as the data is readonly"""
        return False

    def has_add_permission(self, request, obj=None):
        """Returns false as the data is readonly"""
        return False

    def has_change_permission(self, request, obj=None):
        """Returns false as the data is readonly"""
        return False


@admin.register(BrainRegion)
class BrainRegionAdmin(AtlasAdminModel, ExportCsvMixin):
    """Class that provides admin capability for managing a region of the brain. This
    was also called a structure.
    """

    list_display = ('abbreviation', 'description', 'active', 'created_display')
    ordering = ['abbreviation']
    readonly_fields = ['created']
    list_filter = ['created', 'active']
    search_fields = ['abbreviation', 'description']

    def created_display(self, obj):
        """Formats the date nicely."""
        return datetime_format(obj.created)
    created_display.short_description = 'Created'


@admin.register(CellType)
class CellTypeAdmin(AtlasAdminModel, ExportCsvMixin):
    """"This class administers the different type of cells.
    """
    list_display = ('cell_type', 'description', 'active')
    ordering = ['cell_type']
    readonly_fields = ['created']
    list_filter = ['created', 'active']
    search_fields = ['cell_type', 'description']

    def created_display(self, obj):
        """Formats the date nicely."""
        return datetime_format(obj.created)
    created_display.short_description = 'Created'


def make_inactive(modeladmin, request, queryset):
    """A method to set any object inactive
    
    :param request: HTTP request.
    :param queryset: set of querys used to update.
    """
    
    queryset.update(active=False)


make_inactive.short_description = "Mark selected COMs as inactive"


def make_active(modeladmin, request, queryset):
    """A method to set any object active
    
    :param request: HTTP request.
    :param queryset: set of querys used to update.
    """
    queryset.update(active=True)


make_active.short_description = "Mark selected COMs as active"

