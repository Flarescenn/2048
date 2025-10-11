from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    
    def ready(self):
        # Import signal handlers to ensure Profiles are created for new Users
        try:
            import users.signals  # noqa: F401
        except Exception as e:
            # Avoid crashing app startup if signals fail to import
            print(f"Warning: failed to import users.signals: {e}")
