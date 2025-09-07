from django.apps import AppConfig


class CandidateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'candidate'
    verbose_name = 'Candidate Management'
    
    def ready(self):
        """
        Code exécuté au démarrage de l'application
        """
        try:
            # Importer les signaux Django pour les notifications automatiques
            import candidate.signals
        except ImportError:
            # Les signaux ne sont pas encore implémentés
            pass