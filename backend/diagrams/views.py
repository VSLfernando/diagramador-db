from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.shortcuts import get_object_or_404

from .models import Project, Diagram, DiagramClass, Attribute, Relationship
from .serializers import (
    DiagramSerializer,
    DiagramClassSerializer,
    AttributeSerializer,
    RelationshipSerializer,
)


# Obtener únicamente un diagrama al que el usuario tenga acceso.
def get_authorized_diagram(diagram_id, user):

    return get_object_or_404(
        Diagram.objects.filter(
            Q(project__owner=user) |
            Q(project__collaborators=user)
        ).distinct(),
        pk=diagram_id
    )


# Clase base para las operaciones protegidas.
class AuthenticatedDiagramAPIView(APIView):

    permission_classes = [IsAuthenticated]


# Vista para consultar el diagrama
class DiagramDetailView(RetrieveAPIView):

    serializer_class = DiagramSerializer

    # El usuario debe iniciar sesión.
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        # Usuario identificado mediante JWT.
        user = self.request.user

        # Solo diagramas de proyectos donde participa.
        return Diagram.objects.filter(
            models.Q(project__owner=user) |
            models.Q(project__collaborators=user)
        ).distinct()


# Vista para actualizar la posición de una clase
class UpdateClassPositionView(AuthenticatedDiagramAPIView):

    def patch(self, request, pk):

        diagram_class = get_object_or_404(DiagramClass, pk=pk)

        # Comprobar que el usuario tenga acceso al proyecto
        # al que pertenece esta clase.
        get_authorized_diagram(
            diagram_class.diagram_id,
            request.user
        )
        
        x = request.data.get("position_x")
        y = request.data.get("position_y")

        if (
            isinstance(x, bool)
            or isinstance(y, bool)
            or not isinstance(x, (int, float))
            or not isinstance(y, (int, float))
        ):
            return Response(
                {"error": "Las posiciones deben ser números"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        diagram_class.position_x = x
        diagram_class.position_y = y

        diagram_class.save(update_fields=["position_x", "position_y", "updated_at"])
        
        # Notificar el movimiento a los usuarios conectados.
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram_class.diagram_id}",
            {
                "type": "class_moved",
                "class_id": diagram_class.id,
                "position_x": diagram_class.position_x,
                "position_y": diagram_class.position_y,
            }
        )
        
        return Response(
            {
                "message": "Posición actualizada",
                "id": diagram_class.id,
                "position_x": diagram_class.position_x,
                "position_y": diagram_class.position_y,
            }
        )


class DeleteDiagramClassView(AuthenticatedDiagramAPIView):

    def delete(self, request, pk):

        # Buscar la clase.
        diagram_class = get_object_or_404(
            DiagramClass,
            pk=pk
        )

        # Comprobar los permisos del usuario.
        get_authorized_diagram(
            diagram_class.diagram_id,
            request.user
        )

        # Guardar los identificadores antes de eliminar.
        class_id = diagram_class.id
        diagram_id = diagram_class.diagram_id

        # Eliminar la clase de PostgreSQL.
        # Sus relaciones asociadas se eliminan por CASCADE.
        diagram_class.delete()

        # Notificar a los usuarios conectados al diagrama.
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram_id}",
            {
                "type": "class_deleted",
                "class_id": class_id,
            }
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class CreateDiagramClassView(AuthenticatedDiagramAPIView):

    def post(self, request, diagram_id):

        # Verificar que el diagrama exista
        diagram = get_authorized_diagram(
            diagram_id,
            request.user
        )

        # Obtener los datos enviados desde React
        name = request.data.get("name")
        position_x = request.data.get("position_x", 0)
        position_y = request.data.get("position_y", 0)
            
        # Validar el nombre
        if not isinstance(name, str) or not name.strip():
            return Response(
                {"error": "El nombre de la clase es obligatorio"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = name.strip()

        if DiagramClass.objects.filter(
            diagram=diagram,
            name__iexact=name
        ).exists():
            return Response(
            {
                "error": "Ya existe una clase con ese nombre en el diagrama."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

        if len(name) > 150:
            return Response(
                {"error": "El nombre no puede superar 150 caracteres"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar las coordenadas
        for coordinate in (position_x, position_y):
            if isinstance(coordinate, bool) or not isinstance(coordinate, (int, float)):
                return Response(
                    {"error": "Las coordenadas deben ser números"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Crear la clase en PostgreSQL
        diagram_class = DiagramClass.objects.create(
            diagram=diagram, name=name, position_x=position_x, position_y=position_y
        )

                # Convertir la clase creada a JSON.
        serializer = DiagramClassSerializer(diagram_class)

        # Obtener la capa de canales.
        channel_layer = get_channel_layer()

        # Avisar a todos los usuarios conectados a este diagrama.
        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram.id}",
            {
                "type": "class_created",
                "diagram_class": serializer.data
            }
        )

        # Mantener la respuesta HTTP que React ya utiliza.
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class CreateAttributeView(AuthenticatedDiagramAPIView):

    def post(self, request, class_id):

        # Buscar la clase a la que pertenece el atributo
        diagram_class = get_object_or_404(DiagramClass, pk=class_id)
        
        get_authorized_diagram(
            diagram_class.diagram_id,
            request.user
        )

        # Validar los datos recibidos
        serializer = AttributeSerializer(
            data=request.data, context={"diagram_class": diagram_class}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        attribute = serializer.save(
            diagram_class=diagram_class
        )

        attribute_data = AttributeSerializer(
            attribute
        ).data

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram_class.diagram_id}",
            {
                "type": "attribute_created",
                "class_id": diagram_class.id,
                "attribute": attribute_data,
            }
        )

        return Response(
            attribute_data,
            status=status.HTTP_201_CREATED
        )


class UpdateAttributeView(AuthenticatedDiagramAPIView):

    def patch(self, request, pk):

        # Buscar el atributo que queremos modificar
        attribute = get_object_or_404(Attribute, pk=pk)
        
        get_authorized_diagram(
            attribute.diagram_class.diagram_id,
            request.user
        )

        # Validar únicamente los campos enviados
        serializer = AttributeSerializer(attribute, data=request.data, partial=True)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()

        updated_attribute = serializer.data

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{attribute.diagram_class.diagram_id}",
            {
                "type": "attribute_updated",
                "class_id": attribute.diagram_class_id,
                "attribute": updated_attribute,
            }
        )

        return Response(
            updated_attribute,
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        # Buscar el atributo que queremos eliminar
        attribute = get_object_or_404(Attribute, pk=pk)
        
        get_authorized_diagram(
            attribute.diagram_class.diagram_id,
            request.user
        )

        attribute_id = attribute.id
        class_id = attribute.diagram_class_id
        diagram_id = attribute.diagram_class.diagram_id
        
        # Eliminarlo de PostgreSQL
        attribute.delete()

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram_id}",
            {
                "type": "attribute_deleted",
                "class_id": class_id,
                "attribute_id": attribute_id,
            }
        )

        # Responder sin contenido
        return Response(status=status.HTTP_204_NO_CONTENT)


class CreateRelationshipView(AuthenticatedDiagramAPIView):

    def post(self, request, diagram_id):

        # Verificar que el diagrama exista.
        diagram = get_authorized_diagram(
            diagram_id,
            request.user
        )

        # Validar los datos recibidos.
        serializer = RelationshipSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        source_class = serializer.validated_data["source_class"]
        target_class = serializer.validated_data["target_class"]

        # Ambas clases deben pertenecer al diagrama.
        if (
            source_class.diagram_id != diagram.id
            or target_class.diagram_id != diagram.id
        ):
            return Response(
                {"error": ("Las dos clases deben pertenecer " "al mismo diagrama.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Por ahora no permitimos relacionar una clase consigo misma.
        if source_class.id == target_class.id:
            return Response(
                {"error": ("No puedes relacionar una clase consigo misma.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Evitar duplicados con el mismo origen, destino y cardinalidad.
        relationship_type = serializer.validated_data["relationship_type"]

        if Relationship.objects.filter(
            diagram=diagram,
            source_class=source_class,
            target_class=target_class,
            relationship_type=relationship_type,
        ).exists():
            return Response(
                {"error": "Esta relación ya existe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guardar en PostgreSQL.
        relationship = serializer.save(diagram=diagram)

        relationship_data = RelationshipSerializer(
            relationship
        ).data

        # Avisar a los usuarios conectados al mismo diagrama.
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram.id}",
            {
                "type": "relationship_created",
                "relationship": relationship_data,
            }
        )

        return Response(
            relationship_data,
            status=status.HTTP_201_CREATED
        )


class UpdateRelationshipView(AuthenticatedDiagramAPIView):

    def patch(self, request, pk):

        # Buscar la relación existente.
        relationship = get_object_or_404(Relationship, pk=pk)
        
        get_authorized_diagram(
            relationship.diagram_id,
            request.user
        )

        # Por ahora solo permitimos editar estos campos.
        allowed_fields = {"name", "relationship_type", "source_handle", "target_handle"}

        # Impedir que se cambien las clases o el diagrama.
        invalid_fields = set(request.data.keys()) - allowed_fields

        if invalid_fields:
            return Response(
                {
                    "error": (
                        "Solo puedes modificar el nombre, "
                        "la cardinalidad y los puntos de conexión."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar únicamente los campos enviados.
        serializer = RelationshipSerializer(
            relationship, data=request.data, partial=True
        )

        serializer.is_valid(raise_exception=True)

        # Comprobar si la nueva cardinalidad produciría
        # una relación duplicada.
        relationship_type = serializer.validated_data.get(
            "relationship_type", relationship.relationship_type
        )

        duplicate = (
            Relationship.objects.filter(
                diagram=relationship.diagram,
                source_class=relationship.source_class,
                target_class=relationship.target_class,
                relationship_type=relationship_type,
            )
            .exclude(pk=relationship.pk)
            .exists()
        )

        if duplicate:
            return Response(
                {"error": "Esta relación ya existe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guardar los cambios.
        serializer.save()

        updated_data = serializer.data

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{relationship.diagram_id}",
            {
                "type": "relationship_updated",
                "relationship": updated_data,
            }
        )

        return Response(
            updated_data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):

        # Buscar la relación que queremos eliminar.
        relationship = get_object_or_404(Relationship, pk=pk)
        
        get_authorized_diagram(
            relationship.diagram_id,
            request.user
        )

        relationship_id = relationship.id
        diagram_id = relationship.diagram_id

        relationship.delete()

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"diagram_{diagram_id}",
            {
                "type": "relationship_deleted",
                "relationship_id": relationship_id,
            }
        )
        
        # Responder que la eliminación fue exitosa.
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class ProjectListView(AuthenticatedDiagramAPIView):

    def get(self, request):

        user = request.user

        # Proyectos creados por el usuario.
        my_projects = Project.objects.filter(
            owner=user
        ).prefetch_related("diagrams")

        # Proyectos compartidos con el usuario.
        shared_projects = Project.objects.filter(
            collaborators=user
        ).exclude(
            owner=user
        ).distinct().prefetch_related("diagrams")

        # Convertir los proyectos a una estructura JSON.
        def serialize_projects(projects):
            result = []

            for project in projects:
                result.append({
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "diagrams": [
                        {
                            "id": diagram.id,
                            "name": diagram.name
                        }
                        for diagram in project.diagrams.all()
                    ]
                })

            return result

        return Response(
            {
                "my_projects": serialize_projects(my_projects),
                "shared_projects": serialize_projects(shared_projects)
            },
            status=status.HTTP_200_OK
        )
        
    def post(self, request):

        # Obtener y validar el nombre.
        name = request.data.get("name")

        if not isinstance(name, str) or not name.strip():
            return Response(
                {"error": "El nombre del proyecto es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = name.strip()

        if len(name) > 150:
            return Response(
                {"error": "El nombre no puede superar 150 caracteres."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # La descripción es opcional.
        description = request.data.get("description", "")

        if description is None:
            description = ""

        if not isinstance(description, str):
            return Response(
                {"error": "La descripción debe ser texto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Evitar proyectos duplicados del mismo propietario.
        if Project.objects.filter(
            owner=request.user,
            name__iexact=name
        ).exists():
            return Response(
                {"error": "Ya tienes un proyecto con ese nombre."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # El propietario siempre es el usuario autenticado.
        project = Project.objects.create(
            name=name,
            description=description.strip(),
            owner=request.user
        )

        return Response(
            {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "diagrams": []
            },
            status=status.HTTP_201_CREATED
        )
        
        
class CreateDiagramView(AuthenticatedDiagramAPIView):

    def post(self, request, project_id):

        # Buscar el proyecto únicamente si el usuario
        # es propietario o colaborador.
        project = get_object_or_404(
            Project.objects.filter(
                models.Q(owner=request.user) |
                models.Q(collaborators=request.user)
            ).distinct(),
            pk=project_id
        )

        # Obtener y validar el nombre del diagrama.
        name = request.data.get("name")

        if not isinstance(name, str) or not name.strip():
            return Response(
                {"error": "El nombre del diagrama es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = name.strip()

        if len(name) > 150:
            return Response(
                {"error": "El nombre no puede superar 150 caracteres."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Evitar nombres repetidos dentro del mismo proyecto.
        if Diagram.objects.filter(
            project=project,
            name__iexact=name
        ).exists():
            return Response(
                {"error": "Ya existe un diagrama con ese nombre en el proyecto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear el diagrama dentro del proyecto autorizado.
        diagram = Diagram.objects.create(
            project=project,
            name=name
        )

        return Response(
            {
                "id": diagram.id,
                "name": diagram.name,
                "project_id": project.id
            },
            status=status.HTTP_201_CREATED
        )


class ShareProjectView(AuthenticatedDiagramAPIView):

    def post(self, request, project_id):

        # Solo el propietario puede compartir el proyecto.
        project = get_object_or_404(
            Project,
            pk=project_id,
            owner=request.user
        )

        # Obtener el nombre del usuario que será invitado.
        username = request.data.get("username")

        if not isinstance(username, str) or not username.strip():
            return Response(
                {"error": "Debes ingresar un nombre de usuario."},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = username.strip()

        # Buscar al usuario registrado.
        collaborator = User.objects.filter(
            username__iexact=username
        ).first()

        if collaborator is None:
            return Response(
                {"error": "No existe un usuario con ese nombre."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Impedir que el propietario se agregue a sí mismo.
        if collaborator.id == project.owner_id:
            return Response(
                {"error": "Ya eres el propietario de este proyecto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Comprobar si ya es colaborador.
        if project.collaborators.filter(
            pk=collaborator.id
        ).exists():
            return Response(
                {"error": "Este usuario ya es colaborador del proyecto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Compartir el proyecto.
        project.collaborators.add(collaborator)

        return Response(
            {
                "message": "Proyecto compartido correctamente.",
                "project_id": project.id,
                "collaborator": {
                    "id": collaborator.id,
                    "username": collaborator.username
                }
            },
            status=status.HTTP_201_CREATED
        )   
