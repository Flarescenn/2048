from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Make sure to capture the whole path including query params
    re_path(r"^ws/game/$", consumers.GameConsumer.as_asgi()),
]