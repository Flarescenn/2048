import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.sessions import SessionMiddlewareStack
from game import routing as game_routing

# Define the HTTP application first
http_application = get_asgi_application()

# Then use it in the protocol router
application = ProtocolTypeRouter({
    "http": http_application,
    "websocket": SessionMiddlewareStack(
        AuthMiddlewareStack(
            URLRouter(
                game_routing.websocket_urlpatterns
            )
        )
    ),
})