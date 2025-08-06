"""
URL configuration for video_studio project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_status(request):
    return JsonResponse({
        'message': 'JOBGATE Video Studio API',
        'status': 'running',
        'endpoints': {
            'videos': '/api/videos/',
            'quality_checks': '/api/quality-checks/', 
            'admin': '/admin/',
            'upload': '/api/upload/',
            'quality_analysis': '/api/quality-analysis/'
        }
    })

urlpatterns = [
    path('', api_status, name='api-status'),
    path('admin/', admin.site.urls),
    path('api/', include('videos.urls')),
]

# Servir les fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)