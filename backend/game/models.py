from django.db import models
from django.contrib.auth.models import User

class AIModel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    tier = models.IntegerField(default=1)
    cost = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class UserUnlocked(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ai_model = models.ForeignKey(AIModel, on_delete=models.CASCADE)
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'ai_model')

class Game(models.Model):
    MODE_CHOICES = (
        ('manual', 'Manual'),
        ('ai', 'AI')
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField()
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    ai_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True,blank=True)
    replay_json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}-{self.score}"
