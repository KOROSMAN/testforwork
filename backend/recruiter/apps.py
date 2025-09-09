# backend/recruiter/apps.py
from django.apps import AppConfig


class RecruiterConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'recruiter'
    verbose_name = 'Recruiter Management'
    
    def ready(self):
        """
        Code exécuté au démarrage de l'application recruteur
        """
        try:
            # Importer les signaux pour les interactions automatiques
            import recruiter.signals
        except ImportError:
            # Les signaux ne sont pas encore implémentés
            pass
        
        try:
            # Initialiser les permissions et groupes recruteur
            self.setup_recruiter_permissions()
        except Exception:
            # En cas d'erreur lors de l'initialisation
            pass
    
    def setup_recruiter_permissions(self):
        """
        Configurer les permissions spécifiques aux recruteurs
        """
        from django.contrib.auth.models import Group, Permission
        from django.contrib.contenttypes.models import ContentType
        
        # Créer le groupe recruteur s'il n'existe pas
        recruiter_group, created = Group.objects.get_or_create(name='Recruteurs')
        
        if created:
            # Permissions pour voir les profils candidats
            try:
                from candidate.models import CandidateProfile, VideoViewLog
                
                # Permissions sur les profils candidats
                candidate_ct = ContentType.objects.get_for_model(CandidateProfile)
                view_candidate_perm = Permission.objects.get_or_create(
                    codename='view_public_candidateprofile',
                    name='Can view public candidate profiles',
                    content_type=candidate_ct,
                )[0]
                
                # Permissions sur les consultations vidéo
                video_view_ct = ContentType.objects.get_for_model(VideoViewLog)
                add_video_view_perm = Permission.objects.get_or_create(
                    codename='add_videoviewlog',
                    name='Can log video views',
                    content_type=video_view_ct,
                )[0]
                
                # Ajouter les permissions au groupe
                recruiter_group.permissions.add(view_candidate_perm, add_video_view_perm)
                
            except Exception as e:
                print(f"Erreur lors de la configuration des permissions: {e}")


# backend/recruiter/__init__.py
default_app_config = 'recruiter.apps.RecruiterConfig'