from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Project, Diagram, DiagramClass


class UnauthorizedClassPositionTests(APITestCase):

    def setUp(self):
        # Crear usuarios temporales.
        self.owner = User.objects.create_user(
            username="propietario_test",
            password="TestPassword123!"
        )

        self.guest = User.objects.create_user(
            username="colaborador2",
            password="TestPassword123!"
        )

        # Crear un proyecto temporal.
        self.project = Project.objects.create(
            name="Proyecto de prueba",
            owner=self.owner
        )

        # Crear un diagrama temporal.
        self.diagram = Diagram.objects.create(
            project=self.project,
            name="Diagrama de prueba"
        )

        # Crear una clase con posición conocida.
        self.diagram_class = DiagramClass.objects.create(
            diagram=self.diagram,
            name="Cliente",
            position_x=100,
            position_y=200
        )

    def test_guest_cannot_move_class(self):

        # Autenticar al usuario ajeno al proyecto.
        self.client.force_authenticate(user=self.guest)

        url = reverse(
            "class-position",
            kwargs={"pk": self.diagram_class.id}
        )

        # Intentar modificar la posición.
        response = self.client.patch(
            url,
            {
                "position_x": 500,
                "position_y": 600
            },
            format="json"
        )

        # Debe rechazar la operación.
        self.assertEqual(response.status_code, 404)

        # Consultar nuevamente la clase.
        self.diagram_class.refresh_from_db()

        # La posición original debe permanecer intacta.
        self.assertEqual(self.diagram_class.position_x, 100)
        self.assertEqual(self.diagram_class.position_y, 200)
        
class ProjectCreationTests(APITestCase):

    def setUp(self):
        # Crear un usuario temporal para las pruebas.
        self.user = User.objects.create_user(
            username="colaborador1",
            email="colaborador1@example.com",
            password="TestPassword123!"
        )

        # Autenticar al usuario.
        self.client.force_authenticate(user=self.user)

    def test_create_project(self):

        # Solicitar la creación de un proyecto.
        response = self.client.post(
            "/api/projects/",
            {
                "name": "Proyecto Colaborativo",
                "description": "Proyecto de prueba"
            },
            format="json"
        )

        # Comprobar que Django responde 201 Created.
        self.assertEqual(response.status_code, 201)

        # Buscar el proyecto en PostgreSQL de pruebas.
        project = Project.objects.get(
            name="Proyecto Colaborativo"
        )

        # Comprobar que el propietario es colaborador1.
        self.assertEqual(project.owner, self.user)

        # Comprobar que aparece en Mis proyectos.
        response = self.client.get("/api/projects/")

        self.assertEqual(response.status_code, 200)

        project_ids = [
            project_data["id"]
            for project_data in response.data["my_projects"]
        ]

        self.assertIn(project.id, project_ids)

        # Comprobar que NO aparece como proyecto compartido.
        shared_ids = [
            project_data["id"]
            for project_data in response.data["shared_projects"]
        ]

        self.assertNotIn(project.id, shared_ids)
        
        
class DiagramCreationTests(APITestCase):

    def setUp(self):
        # Crear tres usuarios temporales.
        self.owner = User.objects.create_user(
            username="propietario_diagrama",
            password="TestPassword123!"
        )

        self.collaborator = User.objects.create_user(
            username="colaborador_diagrama",
            password="TestPassword123!"
        )

        self.outsider = User.objects.create_user(
            username="invitado_diagrama",
            password="TestPassword123!"
        )

        # Crear un proyecto.
        self.project = Project.objects.create(
            name="Proyecto de prueba",
            owner=self.owner
        )

        # Agregar únicamente al colaborador.
        self.project.collaborators.add(self.collaborator)

        # URL para crear diagramas dentro del proyecto.
        self.url = reverse(
            "create-diagram",
            kwargs={"project_id": self.project.id}
        )

    def test_owner_can_create_diagram(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {"name": "Diagrama del propietario"},
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Diagram.objects.filter(
                project=self.project,
                name="Diagrama del propietario"
            ).exists()
        )

    def test_collaborator_can_create_diagram(self):
        self.client.force_authenticate(user=self.collaborator)

        response = self.client.post(
            self.url,
            {"name": "Diagrama del colaborador"},
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Diagram.objects.filter(
                project=self.project,
                name="Diagrama del colaborador"
            ).exists()
        )

    def test_outsider_cannot_create_diagram(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            self.url,
            {"name": "Diagrama sin permiso"},
            format="json"
        )

        # No puede acceder a un proyecto ajeno.
        self.assertEqual(response.status_code, 404)

        # Comprobar que no se creó nada.
        self.assertFalse(
            Diagram.objects.filter(
                project=self.project,
                name="Diagrama sin permiso"
            ).exists()
        )
        
        
class ShareProjectTests(APITestCase):

    def setUp(self):
        # Crear tres usuarios temporales.
        self.owner = User.objects.create_user(
            username="propietario_test",
            password="TestPassword123!"
        )

        self.collaborator = User.objects.create_user(
            username="colaborador_test",
            password="TestPassword123!"
        )

        self.outsider = User.objects.create_user(
            username="invitado_test",
            password="TestPassword123!"
        )

        # Crear un proyecto con propietario.
        self.project = Project.objects.create(
            name="Proyecto Compartido",
            owner=self.owner
        )

        # Agregar al colaborador existente.
        self.project.collaborators.add(self.collaborator)

        # Preparar la URL.
        self.url = reverse(
            "share-project",
            kwargs={"project_id": self.project.id}
        )

    def test_owner_can_share_project(self):
        # El propietario intenta invitar al usuario externo.
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {"username": "invitado_test"},
            format="json"
        )

        # Debe permitir la invitación.
        self.assertEqual(response.status_code, 201)

        # Verificar que quedó registrado como colaborador.
        self.assertTrue(
            self.project.collaborators.filter(
                pk=self.outsider.id
            ).exists()
        )

    def test_collaborator_cannot_invite_users(self):
        # Un colaborador intenta invitar a otro usuario.
        self.client.force_authenticate(
            user=self.collaborator
        )

        response = self.client.post(
            self.url,
            {"username": "invitado_test"},
            format="json"
        )

        # No es propietario: acceso denegado.
        self.assertEqual(response.status_code, 404)

        # Comprobar que no se agregó al invitado.
        self.assertFalse(
            self.project.collaborators.filter(
                pk=self.outsider.id
            ).exists()
        )

    def test_outsider_cannot_share_project(self):
        # Un usuario ajeno intenta compartir el proyecto.
        self.client.force_authenticate(
            user=self.outsider
        )

        response = self.client.post(
            self.url,
            {"username": "colaborador_test"},
            format="json"
        )

        # No tiene permiso.
        self.assertEqual(response.status_code, 404)

        # La lista de colaboradores permanece igual.
        self.assertEqual(
            self.project.collaborators.count(),
            1
        )