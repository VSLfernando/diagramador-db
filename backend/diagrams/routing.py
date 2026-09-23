from django.urls import path

from .consumers import DiagramConsumer


websocket_urlpatterns = [
    path(
        "ws/diagrams/<int:diagram_id>/",
        DiagramConsumer.as_asgi(),
        name="diagram-websocket"
    ),
]