from django.contrib import admin
from .models import (
    Project,
    Diagram,
    DiagramClass,
    Attribute,
    Relationship
)

admin.site.register(Project)
admin.site.register(Diagram)
admin.site.register(DiagramClass)
admin.site.register(Attribute)
admin.site.register(Relationship)