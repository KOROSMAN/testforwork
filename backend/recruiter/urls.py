# backend/recruiter/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'recruiter', views.RecruiterViewSet, basename='recruiter')

urlpatterns = [
    # URLs du router DRF
    path('', include(router.urls)),
    
    # Endpoints fonctionnels compatibles avec React
    path('candidates/', views.recruiter_candidate_list, name='recruiter-candidates'),
    path('candidates/<int:candidate_id>/', views.recruiter_candidate_detail, name='recruiter-candidate-detail'),
    path('video-views/log/', views.log_recruiter_video_view, name='log-video-view'),
    path('dashboard/stats/', views.recruiter_dashboard_stats, name='dashboard-stats'),
]