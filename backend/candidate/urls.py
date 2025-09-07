from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'profiles', views.CandidateProfileViewSet)
router.register(r'video-views', views.VideoViewLogViewSet)
router.register(r'sync-logs', views.CVVideoSyncLogViewSet)

urlpatterns = [
    # URLs du router DRF
    path('', include(router.urls)),
    
    # Endpoints fonctionnels spécialisés
    path('quick-video-link/', views.quick_video_link, name='quick-video-link'),
    path('dashboard-stats/<int:candidate_id>/', views.candidate_dashboard_stats, name='candidate-dashboard-stats'),
]