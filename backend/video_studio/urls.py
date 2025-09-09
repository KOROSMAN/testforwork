# backend/video_studio/urls.py - Version mise à jour
"""
URL configuration for video_studio project.
Configuration mise à jour avec l'interface recruteur
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_status(request):
    return JsonResponse({
        'message': 'JOBGATE Video Studio API - Version Complète avec Interface Recruteur',
        'status': 'running',
        'version': '2.1.0',
        'features': [
            'Video recording and quality analysis',
            'Candidate profile integration',
            'Recruiter dashboard with secure access',
            'Real-time notifications',
            'CV-Video synchronization',
            'Advanced candidate search',
            'Video viewing logs and analytics',
            'Recruiter interaction tracking'
        ],
        'endpoints': {
            # API Vidéos
            'videos': '/api/videos/',
            'quality_checks': '/api/quality-checks/',
            'video_upload': '/api/upload/',
            'quality_analysis': '/api/quality-analysis/',
            
            # API Candidats
            'candidate_profiles': '/api/candidate/profiles/',
            'candidate_search': '/api/candidate/profiles/search/',
            'video_link': '/api/candidate/quick-video-link/',
            'dashboard_stats': '/api/candidate/dashboard-stats/{candidate_id}/',
            
            # API Recruteurs - NOUVEAU
            'recruiter_candidates': '/api/recruiter/candidates/',
            'recruiter_candidate_detail': '/api/recruiter/candidates/{candidate_id}/',
            'recruiter_video_log': '/api/recruiter/video-views/log/',
            'recruiter_dashboard': '/api/recruiter/dashboard/stats/',
            'recruiter_search': '/api/recruiter/recruiter/candidate_search/',
            
            # API Notifications
            'notifications': '/api/notifications/notifications/',
            'notification_create': '/api/notifications/create/',
            'notification_stats': '/api/notifications/stats/{user_id}/',
            
            # Interface d'administration
            'admin': '/admin/',
        },
        'security': {
            'candidate_data': 'Only public profiles accessible to recruiters',
            'video_access': 'Approved videos only',
            'interaction_logging': 'All recruiter actions are logged',
            'privacy_compliance': 'GDPR compliant data handling'
        },
        'integration': {
            'frontend_compatibility': 'React.js with TypeScript',
            'api_format': 'RESTful JSON API',
            'authentication': 'Token-based (to be implemented)',
            'real_time': 'WebSocket notifications (planned)'
        }
    })

urlpatterns = [
    # Page d'accueil de l'API
    path('', api_status, name='api-status'),
    
    # Interface d'administration
    path('admin/', admin.site.urls),
    
    # APIs principales
    path('api/', include('videos.urls')),                    # API Vidéos
    path('api/candidate/', include('candidate.urls')),       # API Candidats  
    path('api/notifications/', include('notifications.urls')), # API Notifications
    path('api/recruiter/', include('recruiter.urls')),       # API Recruteurs - NOUVEAU
    
    # Endpoints de documentation (optionnels)
    # path('api/docs/', include('docs.urls')),
]

# Servir les fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Ajouter des URLs de test/debug si nécessaire
    urlpatterns += [
        # path('api/test/', include('tests.urls')),
    ]

# Configuration spécifique pour la sécurité recruteur
RECRUITER_SECURITY_SETTINGS = {
    'REQUIRE_AUTHENTICATION': True,  # À activer en production
    'LOG_ALL_INTERACTIONS': True,
    'CANDIDATE_DATA_ACCESS': 'public_only',
    'VIDEO_ACCESS': 'approved_only',
    'RATE_LIMITING': {
        'profile_views': '100/hour',
        'video_views': '50/hour',
        'searches': '200/hour'
    }
}