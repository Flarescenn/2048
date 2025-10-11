from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Match the base path you use on the frontend (e.g., /ws/game/demo123/)
    re_path(r"ws/game/(?P<session_id>\w+)/$", consumers.GameConsumer.as_asgi()),
    # Remove the second, confusing route that tried to match query parameters.
]