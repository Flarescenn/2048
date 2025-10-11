# users/urls.py

from django.urls import path
from .views import LoginAPIView, LogoutAPIView, RegistrationAPIView, CSRFTokenView, CurrentUserView

urlpatterns = [
    # Paths are now relative to the 'api/' prefix from core/urls.py
    path('login/', LoginAPIView.as_view(), name='api_login'),      # Corrects to /api/login/
    path('logout/', LogoutAPIView.as_view(), name='api_logout'),    # Corrects to /api/logout/
    path('register/', RegistrationAPIView.as_view(), name='api_register'), # Corrects to /api/register/
    path('csrf/', CSRFTokenView.as_view(), name='api_csrf'),       # Use as_view() for APIView
    path('user/', CurrentUserView.as_view(), name='current_user'), # Add route for fetching current user details
]