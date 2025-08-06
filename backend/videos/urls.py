from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'videos', views.VideoViewSet)
router.register(r'quality-checks', views.QualityCheckViewSet)
router.register(r'recording-sessions', views.RecordingSessionViewSet)

urlpatterns = [
    # URLs du router DRF
    path('', include(router.urls)),
    
    # Endpoints fonctionnels spécialisés
    path('upload/', views.video_upload, name='video-upload'),
    path('quality-analysis/', views.quality_analysis, name='quality-analysis'),
]