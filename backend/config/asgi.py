import os

from django.core.asgi import get_asgi_application

# Configurar Django antes de importar nuestras rutas.
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'config.settings'
)

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from diagrams.routing import websocket_urlpatterns


application = ProtocolTypeRouter({

    # Mantener todas las peticiones HTTP existentes.
    "http": django_asgi_app,

    # Preparar las conexiones WebSocket.
    "websocket": AllowedHostsOriginValidator(
        URLRouter(websocket_urlpatterns)
    ),

})