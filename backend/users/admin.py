# users/admin.py - REVISED to fix duplicate inline issue

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Profile

# ----------------------------------------------------------------------
# 1. Profile Inline (No changes needed here)
# ----------------------------------------------------------------------
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    fieldsets = (
        (None, {
            'fields': (
                ('points', 'lifetime_points'),
            ),
        }),
        ('Game Stats', {
            'fields': (
                ('games_played', 'high_score'),
                'total_score',
                'average_score',
            )
        })
    )
    readonly_fields = ('average_score',) 


# ----------------------------------------------------------------------
# 2. Custom User Admin (CRITICAL FIX APPLIED HERE)
# ----------------------------------------------------------------------
class CustomUserAdmin(BaseUserAdmin):
    """
    Extends the default UserAdmin to include the ProfileInline.
    We rename this to CustomUserAdmin to clearly differentiate it.
    """
    # 💥 CRITICAL FIX: Ensure only the ProfileInline is used
    # This overrides the base UserAdmin's default 'inlines' attribute,
    # preventing any duplicates from being inherited or automatically detected.
    inlines = (ProfileInline,) 
    
    # ... (Keep list_display and getter methods as before) ...
    list_display = BaseUserAdmin.list_display + ('get_points', 'get_high_score')

    def get_points(self, obj):
        try:
            return obj.profile.points
        except Profile.DoesNotExist:
            return 0
    get_points.short_description = 'Points'
    get_points.admin_order_field = 'profile__points'

    def get_high_score(self, obj):
        try:
            return obj.profile.high_score
        except Profile.DoesNotExist:
            return 0
    get_high_score.short_description = 'High Score'
    get_high_score.admin_order_field = 'profile__high_score'


# ----------------------------------------------------------------------
# 3. Unregister and Re-register (Using the corrected admin class)
# ----------------------------------------------------------------------
try:
    # 1. Unregister the default User admin
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

# 2. Re-register the User model with the CustomUserAdmin
admin.site.register(User, CustomUserAdmin)