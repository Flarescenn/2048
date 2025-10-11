from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction # Import for atomic transactions
from django.shortcuts import get_object_or_404 # Efficient object retrieval
from .models import AIModel, UserUnlocked, Game # Assuming these models are defined
from .serializers import AISerializer, UserUnlockedSerializer, GameSerializer # Assuming these serializers are defined
from django.contrib.auth import logout
from django.conf import settings

# --- CSRF DIAGNOSTIC IMPORTS ---
from django.views.decorators.csrf import csrf_exempt 
from django.utils.decorators import method_decorator
# -------------------------------



# ----------------------------------------------------------------------
# 1. AIModelListView 
# ----------------------------------------------------------------------

class AIModelListView(generics.ListAPIView):
    """
    List all available AI models.
    """
    queryset = AIModel.objects.all()
    serializer_class = AISerializer
    permission_classes = [permissions.AllowAny]

# ----------------------------------------------------------------------
# 2. PurchaseView (CRITICAL REVISIONS for security and atomicity + CSRF Diagnostic)
# ----------------------------------------------------------------------

# NOTE: This decorator is TEMPORARILY applied for diagnosis. 

class PurchaseView(APIView):
    """
    Handles the purchase and unlocking of an AI model using user points.
    Uses atomic transaction for data integrity.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic # Ensures all DB operations succeed or fail together
    def post(self, request):
        user = request.user
        ai_id = request.data.get('ai_model_id')

        # --- DIAGNOSTIC LOG (Server-Side) ---
        print(f">>> PURCHASE ATTEMPT BY USER: {user.username if not user.is_anonymous else 'Anonymous'} (Is Anon: {user.is_anonymous})") 
        # -------------------------------------

        # 1. Input Validation and Retrieval
        if not ai_id:
            return Response({"error": "AI model ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use get_object_or_404 for cleaner error handling
        ai_model = get_object_or_404(AIModel, id=ai_id)

        # 2. Ensure Profile exists and lock it for update, then check points first
        from users.models import Profile

        try:
            # Lock the profile row to prevent race conditions on concurrent purchases
            profile = Profile.objects.select_for_update().get(user=user)
            created = False
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=user)
            created = True

        if created:
            print(f">>> Created missing profile for user {user.username}. Points set to default {profile.points}.")

        # Check insufficient points BEFORE creating or checking unlock record
        if profile.points < ai_model.cost:
            return Response({"error": "Not enough points."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 3. Check if already unlocked (improves UX)
        if UserUnlocked.objects.filter(user=user, ai_model=ai_model).exists():
            return Response({"error": f"You have already unlocked {ai_model.name}."}, status=status.HTTP_409_CONFLICT)

        
        # 4. Atomic Update and Creation
        
        # Deduct points
        user.profile.points -= ai_model.cost
        user.profile.save()
        
        # Create unlock record
        UserUnlocked.objects.create(user=user, ai_model=ai_model)
        
        return Response({"success": f"Unlocked {ai_model.name} for {ai_model.cost} points."}, 
                        status=status.HTTP_200_OK)

# ----------------------------------------------------------------------
# 3. RecordGameView
# ----------------------------------------------------------------------

class RecordGameView(APIView):
    """
    Records a completed game score and updates user points.
    Uses atomic transaction to ensure score is recorded and points are added together.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = GameSerializer(data=request.data)
        
        if serializer.is_valid():
            # Save the Game instance, linking it to the authenticated user
            game_instance = serializer.save(user=request.user)
            
            # Use the saved instance's score for safety and clarity
            score = game_instance.score 
            
            # Add points (assuming user.profile exists and has a 'points' field)
            try:
                request.user.profile.points += score
                request.user.profile.save()
            except AttributeError:
                 # Should be handled defensively if profile is not guaranteed
                 print(f">>> WARNING: Failed to update points for user {request.user.username}. Profile missing.")

            return Response({"message": f"Game recorded. Added {score} points.", 
                             "game": serializer.data}, 
                            status=status.HTTP_201_CREATED)
                            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ----------------------------------------------------------------------
# 4. LeaderboardView
# ----------------------------------------------------------------------

class LeaderboardView(APIView):
    """
    Retrieves the top N games for the public leaderboard.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Allow client to request a custom limit, default to 10
        limit = request.query_params.get('limit', 10)
        try:
            limit = min(int(limit), 50) # Cap the limit at a reasonable number (e.g., 50)
        except ValueError:
            limit = 10
            
        top_games = Game.objects.order_by('-score')[:limit]
        serializer = GameSerializer(top_games, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
# ----------------------------------------------------------------------
# 5. LogoutView (CRITICAL FIX FOR PERSISTENT SESSION TOKEN)
# ----------------------------------------------------------------------

class LogoutView(APIView):
    """
    Invalidates the server-side session and explicitly deletes 
    client-side session and CSRF cookies for proper logout in SPAs.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Invalidate the server-side session (clears data from DB/cache)
        logout(request)
        
        # 2. Prepare the success response
        response = Response(
            {"message": "Successfully logged out. Session terminated."}, 
            status=status.HTTP_200_OK
        )

        # 3. *** CRITICAL FIX: Delete Cookies on the Client-Side ***
        # The key is to match the parameters (path, domain, samesite) 
        # used when the cookie was originally SET by Django.

        # Delete the main session cookie (e.g., 'sessionid')
        response.delete_cookie(
            settings.SESSION_COOKIE_NAME, 
            path=settings.SESSION_COOKIE_PATH, 
            samesite=settings.SESSION_COOKIE_SAMESITE # Typically 'Lax' or 'None'
        )
        
        # Delete the CSRF token cookie (e.g., 'csrftoken')
        # Deleting the CSRF cookie ensures new requests require a new token.
        response.delete_cookie(
            settings.CSRF_COOKIE_NAME, 
            path=settings.CSRF_COOKIE_PATH,
            samesite=settings.CSRF_COOKIE_SAMESITE # Typically 'Lax' or 'None'
        )
        
        return response