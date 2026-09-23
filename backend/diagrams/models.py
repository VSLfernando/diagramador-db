from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_projects'
    )
    collaborators = models.ManyToManyField(
        User,
        related_name='collaborative_projects',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Diagram(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='diagrams'
    )
    name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class DiagramClass(models.Model):
    diagram = models.ForeignKey(
        Diagram,
        on_delete=models.CASCADE,
        related_name='classes'
    )

    name = models.CharField(max_length=150)

    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Attribute(models.Model):

    DATA_TYPES = [
        ('INTEGER', 'Integer'),
        ('BIGINT', 'BigInt'),
        ('VARCHAR', 'Varchar'),
        ('TEXT', 'Text'),
        ('BOOLEAN', 'Boolean'),
        ('DATE', 'Date'),
        ('DATETIME', 'DateTime'),
        ('DECIMAL', 'Decimal'),
        ('FLOAT', 'Float'),
        ('UUID', 'UUID'),
    ]

    diagram_class = models.ForeignKey(
        DiagramClass,
        on_delete=models.CASCADE,
        related_name='attributes'
    )

    name = models.CharField(max_length=150)

    data_type = models.CharField(
        max_length=30,
        choices=DATA_TYPES
    )

    length = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    is_primary_key = models.BooleanField(default=False)
    is_nullable = models.BooleanField(default=True)
    is_unique = models.BooleanField(default=False)

    default_value = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'{self.name} : {self.data_type}'


class Relationship(models.Model):

    RELATIONSHIP_TYPES = [
        ('ONE_TO_ONE', '1:1'),
        ('ONE_TO_MANY', '1:N'),
        ('MANY_TO_ONE', 'N:1'),
        ('MANY_TO_MANY', 'N:M'),
    ]

    diagram = models.ForeignKey(
        Diagram,
        on_delete=models.CASCADE,
        related_name='relationships'
    )

    source_class = models.ForeignKey(
        DiagramClass,
        on_delete=models.CASCADE,
        related_name='outgoing_relationships'
    )

    target_class = models.ForeignKey(
        DiagramClass,
        on_delete=models.CASCADE,
        related_name='incoming_relationships'
    )

    relationship_type = models.CharField(
        max_length=30,
        choices=RELATIONSHIP_TYPES
    )

    name = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f'{self.source_class.name} '
            f'{self.relationship_type} '
            f'{self.target_class.name}'
        )

    source_handle = models.CharField(
        max_length=10,
        default='right'
    )

    target_handle = models.CharField(
        max_length=10,
        default='left'
    )

    