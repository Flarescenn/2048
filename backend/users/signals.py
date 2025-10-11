from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


def ensure_all_profiles():
    # Create profiles for any existing users missing one (safe to call at startup)
    for user in User.objects.all():
        try:
            _ = user.profile
        except Exception:
            Profile.objects.create(user=user)


# Optionally run at import time to backfill profiles (quiet if run multiple times)
try:
    ensure_all_profiles()
except Exception:
    # Avoid raising during migrations or other management commands
    pass
