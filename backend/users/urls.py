# users/urls.py (CORRECTED)

from django.urls import path
from .views import LoginAPIView, LogoutAPIView, RegistrationAPIView, CSRFTokenView

urlpatterns = [
    # Paths are now relative to the 'api/' prefix from core/urls.py
    path('login/', LoginAPIView.as_view(), name='api_login'),      # Corrects to /api/login/
    path('logout/', LogoutAPIView.as_view(), name='api_logout'),    # Corrects to /api/logout/
    path('register/', RegistrationAPIView.as_view(), name='api_register'), # Corrects to /api/register/
    path('csrf/', CSRFTokenView.as_view(), name='api_csrf'),       # Use as_view() for APIView
    # NOTE: The CSRFTokenView is a class-based view (APIView), 
    # so you should use .as_view() if it inherits from APIView.
]