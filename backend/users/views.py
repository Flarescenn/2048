# users/views.py

from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth.models import User
from django.db import IntegrityError
from .models import Profile # Import the Profile model to ensure creation

@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(APIView):
    """Handles user login via session authentication."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print(f"Login attempt from {request.META.get('HTTP_ORIGIN', 'unknown origin')}")
        # print(f"Request data: {request.data}") # Removed sensitive data print
        # print(f"Headers: {request.headers}") # Removed verbose headers print
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # CRITICAL: This logs the user in and sets the sessionid cookie
            login(request, user)
            
            # Explicitly save the session to ensure it's created
            request.session.save()
            
            # Debug: print session info
            print(f"Session key: {request.session.session_key}")
            print(f"User authenticated: {request.user}")
            
            response = Response({"message": f"Welcome back, {user.username}!"}, status=status.HTTP_200_OK)
            
            # Explicitly set the session cookie in the response 
            if request.session.session_key:
                response.set_cookie(
                    'sessionid', 
                    request.session.session_key,
                    max_age=1209600, 
                    expires=None,
                    domain=None,
                    path='/',
                    secure=False,      # Set to False for HTTP
                    httponly=False,    # Set to False so JavaScript can access
                    samesite='Lax'
                )
                print(f"Set session cookie: {request.session.session_key}")
            
            return response
        else:
            return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class LogoutAPIView(APIView):
    """Handles user logout and destroys the session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # CRITICAL: This logs the user out and clears the session cookie
        logout(request) 
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class RegistrationAPIView(APIView):
    """
    Handles user registration (creates a Django user), automatically logs them 
    in, and ensures a Profile object is created.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print(f"Registration attempt from {request.META.get('HTTP_ORIGIN', 'unknown origin')}")
        # print(f"Request data: {request.data}") # Removed sensitive data print
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"error": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Create the user
            user = User.objects.create_user(username=username, password=password)
            
            # 2. LOG THE USER IN (CRITICAL FIX)
            login(request, user) 

            # 3. ENSURE PROFILE IS CREATED (Required by other views)
            Profile.objects.get_or_create(user=user) 
            
            # 4. Prepare Response with Cookie
            response = Response({"message": f"User {user.username} created and logged in."}, status=status.HTTP_201_CREATED)
            
            if request.session.session_key:
                response.set_cookie(
                    'sessionid', 
                    request.session.session_key,
                    max_age=1209600,
                    path='/',
                    secure=False,
                    httponly=False,
                    samesite='Lax'
                )
                print(f"Set session cookie after registration: {request.session.session_key}")
            
            return response
            
        except IntegrityError:
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    """View to get a CSRF token cookie."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # The ensure_csrf_cookie decorator ensures that the CSRF cookie is set
        return Response({"message": "CSRF cookie set"}, status=status.HTTP_200_OK)