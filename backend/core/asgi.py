import os
import sys
import logging
import django
from django.core.asgi import get_asgi_application

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('asgi')
logger.info("Starting ASGI application")

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
logger.info("Django setup complete")

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.sessions import SessionMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from channels.exceptions import RequestAborted
from game import routing as game_routing

# Custom middleware for better error handling
class ErrorHandlingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        try:
            logger.info(f"New {scope['type']} connection from {scope.get('client', ['unknown'])[0]}")
            if scope['type'] == 'websocket':
                headers = dict(scope.get('headers', []))
                origin = headers.get(b'origin', b'unknown').decode()
                logger.info(f"WebSocket connection from origin: {origin}")
            await self.app(scope, receive, send)
        except RequestAborted:
            logger.warning("Request was aborted")
        except Exception as e:
            logger.error(f"Error in ASGI application: {str(e)}", exc_info=True)
            if scope['type'] == 'websocket':
                try:
                    # Try to send a close frame
                    await send({
                        'type': 'websocket.close',
                        'code': 1011,  # Server error
                        'reason': 'Internal server error',
                    })
                except Exception:
                    pass  # If this fails too, just ignore

# Define the HTTP application first
logger.info("Initializing HTTP application")
http_application = get_asgi_application()

# Then use it in the protocol router
logger.info("Setting up protocol router")
application = ErrorHandlingMiddleware(
    ProtocolTypeRouter({
        "http": http_application,
        "websocket": AllowedHostsOriginValidator(
            SessionMiddlewareStack(
                AuthMiddlewareStack(
                    URLRouter(
                        game_routing.websocket_urlpatterns
                    )
                )
            )
        ),
    })
)
logger.info("ASGI application configured and ready")