from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Notifications System'
    
    def ready(self):
        """
        Code exécuté au démarrage de l'application
        Initialise les signaux et templates de notifications
        """
        try:
            # Importer les signaux pour les notifications automatiques
            import notifications.signals
        except ImportError:
            # Les signaux ne sont pas encore implémentés
            pass
        
        try:
            # Initialiser les templates de notifications par défaut
            self.create_default_notification_templates()
        except Exception:
            # En cas d'erreur lors de l'initialisation (base de données pas encore migrée)
            pass
    
    def create_default_notification_templates(self):
        """
        Créer les templates de notifications par défaut
        """
        from .models import NotificationTemplate
        
        # Templates par défaut pour les notifications vidéo
        default_templates = [
            {
                'notification_type': 'video_linked',
                'title_template': '🎥 Vidéo liée à votre profil',
                'message_template': 'Votre vidéo "{video_title}" a été liée à votre profil candidat avec succès !',
                'available_variables': ['user_name', 'video_title', 'quality_score']
            },
            {
                'notification_type': 'video_viewed',
                'title_template': '👁️ Votre vidéo a été consultée',
                'message_template': '{viewer_name} a consulté votre vidéo de présentation',
                'available_variables': ['user_name', 'viewer_name', 'video_title']
            },
            {
                'notification_type': 'video_approved',
                'title_template': '✅ Vidéo approuvée',
                'message_template': 'Votre vidéo de présentation a été approuvée et est maintenant visible par les recruteurs',
                'available_variables': ['user_name', 'video_title']
            },
            {
                'notification_type': 'sync_needed',
                'title_template': '🔄 Mise à jour recommandée',
                'message_template': 'Votre CV a été modifié. Pensez à actualiser votre vidéo de présentation pour maintenir la cohérence.',
                'available_variables': ['user_name', 'cv_updated_at']
            },
            {
                'notification_type': 'profile_complete',
                'title_template': '🎉 Profil complété',
                'message_template': 'Félicitations ! Votre profil candidat est maintenant complet à {completeness}%',
                'available_variables': ['user_name', 'completeness']
            }
        ]
        
        # Créer les templates s'ils n'existent pas déjà
        for template_data in default_templates:
            NotificationTemplate.objects.get_or_create(
                notification_type=template_data['notification_type'],
                defaults=template_data
            )