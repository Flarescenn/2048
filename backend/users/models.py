# users/models.py

from django.db import models
from django.contrib.auth.models import User # <-- Import the User model

class Profile(models.Model):
    # One-to-one relationship ensures every User has exactly one Profile
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # This is the field accessed by game/views.py
    points = models.IntegerField(default=100) # Give new users a starting balance

    def __str__(self):
        return f"{self.user.username}'s Profile"