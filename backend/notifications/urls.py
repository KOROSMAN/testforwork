from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notifications')
router.register(r'preferences', views.NotificationPreferenceViewSet, basename='notification-preferences')

urlpatterns = [
    # URLs du router DRF
    path('', include(router.urls)),
    
    # Endpoints fonctionnels spécialisés
    path('create/', views.create_notification, name='create-notification'),
    path('bulk-create/', views.bulk_create_notifications, name='bulk-create-notifications'),
    path('stats/<int:user_id>/', views.notification_stats, name='notification-stats'),
]