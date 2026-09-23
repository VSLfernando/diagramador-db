from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from django.db.models import Q

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .models import Diagram


class DiagramConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        # Obtener el ID del diagrama desde la URL.
        self.diagram_id = self.scope["url_route"]["kwargs"]["diagram_id"]

        self.group_name = f"diagram_{self.diagram_id}"

        self.authenticated = False

        # Abrir la conexión únicamente para recibir la autenticación.
        # Todavía NO agregamos al usuario al grupo del diagrama.
        await self.accept()

    async def receive_json(self, content, **kwargs):

        # El primer mensaje debe contener el token JWT.
        if not self.authenticated:

            if not isinstance(content, dict) or content.get("type") != "authenticate":
                await self.close(code=4401)
                return

            token = content.get("token")

            if not isinstance(token, str) or not token:
                await self.close(code=4401)
                return

            user_id = await self.verify_access(token)

            if user_id is None:
                await self.close(code=4403)
                return

            # El usuario ya está autorizado.
            self.authenticated = True

            # Incorporarlo al grupo correspondiente a su diagrama.
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.send_json({
                "type": "connected",
                "diagram_id": self.diagram_id,
                "message": "Conectado al diagrama correctamente."
            })

            return

        # Los mensajes de edición se implementarán después.
        await self.send_json({
            "type": "info",
            "message": "Conexión activa."
        })

    @database_sync_to_async
    def verify_access(self, token):

        authentication = JWTAuthentication()

        try:
            validated_token = authentication.get_validated_token(token)

            user = authentication.get_user(validated_token)

        except (InvalidToken, AuthenticationFailed):
            return None

        # Comprobar que el usuario sea propietario o colaborador.
        authorized = Diagram.objects.filter(
            Q(project__owner=user) |
            Q(project__collaborators=user),
            pk=self.diagram_id
        ).exists()

        if not authorized:
            return None

        return user.id

    async def disconnect(self, close_code):

        # Solo quitar del grupo a conexiones autenticadas.
        if getattr(self, "authenticated", False):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            
    async def class_created(self, event):

        # Enviar la clase creada al navegador.
        await self.send_json({
            "type": "class_created",
            "diagram_class": event["diagram_class"]
        })
        
    async def class_moved(self, event):

        await self.send_json({
            "type": "class_moved",
            "class_id": event["class_id"],
            "position_x": event["position_x"],
            "position_y": event["position_y"]
        })
        
    async def class_deleted(self, event):

        await self.send_json({
            "type": "class_deleted",
            "class_id": event["class_id"]
        })
        
    async def relationship_created(self, event):

        await self.send_json({
            "type": "relationship_created",
            "relationship": event["relationship"]
        })
        
    async def relationship_updated(self, event):

        await self.send_json({
            "type": "relationship_updated",
            "relationship": event["relationship"]
        })
        
    async def relationship_deleted(self, event):

        await self.send_json({
            "type": "relationship_deleted",
            "relationship_id": event["relationship_id"]
        })
        
    async def attribute_created(self, event):

        await self.send_json({
            "type": "attribute_created",
            "class_id": event["class_id"],
            "attribute": event["attribute"]
        })
    
    async def attribute_updated(self, event):

        await self.send_json({
            "type": "attribute_updated",
            "class_id": event["class_id"],
            "attribute": event["attribute"]
        }) 
    
    async def attribute_deleted(self, event):

        await self.send_json({
            "type": "attribute_deleted",
            "class_id": event["class_id"],
            "attribute_id": event["attribute_id"]
        })