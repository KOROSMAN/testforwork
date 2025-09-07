"""
URL configuration for video_studio project.
Configuration mise à jour avec toutes les nouvelles fonctionnalités
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_status(request):
    return JsonResponse({
        'message': 'JOBGATE Video Studio API - Version Complète',
        'status': 'running',
        'version': '2.0.0',
        'features': [
            'Video recording and quality analysis',
            'Candidate profile integration',
            'Recruiter dashboard',
            'Real-time notifications',
            'CV-Video synchronization',
            'Advanced candidate search'
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
            
            # API Notifications
            'notifications': '/api/notifications/notifications/',
            'notification_create': '/api/notifications/create/',
            'notification_stats': '/api/notifications/stats/{user_id}/',
            
            # Interface d'administration
            'admin': '/admin/',
        },
        'documentation': {
            'postman_collection': '/api/docs/postman/',
            'swagger': '/api/docs/swagger/',
            'integration_guide': '/api/docs/integration/'
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