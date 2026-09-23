from django.urls import path

from .views import (
    DiagramDetailView,
    UpdateClassPositionView,
    CreateDiagramClassView,
    CreateAttributeView,
    UpdateAttributeView,
    CreateRelationshipView,
    UpdateRelationshipView,
    DeleteDiagramClassView,
    ProjectListView,
    CreateDiagramView,
    ShareProjectView,
)

urlpatterns = [
    path(
        'diagrams/<int:pk>/',
        DiagramDetailView.as_view(),
        name='diagram-detail'
    ),

    path(
        'classes/<int:pk>/position/',
        UpdateClassPositionView.as_view(),
        name='class-position'
    ),

    path(
        'diagrams/<int:diagram_id>/classes/',
        CreateDiagramClassView.as_view(),
        name='create-diagram-class'
    ),

    path(
        'classes/<int:class_id>/attributes/',
        CreateAttributeView.as_view(),
        name='create-attribute'
    ),

    path(
        'attributes/<int:pk>/',
        UpdateAttributeView.as_view(),
        name='update-attribute'
    ),

    path(
        'diagrams/<int:diagram_id>/relationships/',
        CreateRelationshipView.as_view(),
        name='create-relationship'
    ),

    path(
        'relationships/<int:pk>/',
        UpdateRelationshipView.as_view(),
        name='update-relationship'
    ),
    
    path(
        'classes/<int:pk>/',
        DeleteDiagramClassView.as_view(),
        name='delete-diagram-class'
    ),
    
    path(
        'projects/',
        ProjectListView.as_view(),
        name='project-list'
    ),
    
    path(
        'projects/<int:project_id>/diagrams/',
        CreateDiagramView.as_view(),
        name='create-diagram'
    ),
    
    path(
        'projects/<int:project_id>/collaborators/',
        ShareProjectView.as_view(),
        name='share-project'
    ),
]