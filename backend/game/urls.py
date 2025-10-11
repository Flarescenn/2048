from django.urls import path
from .views import AIModelListView, PurchaseView, RecordGameView, LeaderboardView, LogoutView, SessionDebugView

urlpatterns = [
    path("ai-models/", AIModelListView.as_view(), name="ai-models"),
    path("purchase-ai/", PurchaseView.as_view(), name="purchase-ai"),
    path("record-game/", RecordGameView.as_view(), name="record-game"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('debug-session/', SessionDebugView.as_view(), name='debug-session'),
]