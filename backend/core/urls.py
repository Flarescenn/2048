# core/urls.py

from django.urls import path, include
from django.contrib import admin
# Removing the duplicate CSRF endpoint since it's already in users.urls.py
# from .views import get_csrf_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("game.urls")),
    path("api/", include("users.urls")),
    # Removed duplicate CSRF endpoint
    # path("api/csrf/", get_csrf_token),  # Add CSRF token endpoint
    # You may also choose to consolidate into a single 'api' include if you prefer
]