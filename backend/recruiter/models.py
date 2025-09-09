# backend/recruiter/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class RecruiterProfile(models.Model):
    """Profil recruteur pour le suivi des activités"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='recruiter_profile')
    company_name = models.CharField(max_length=200)
    position = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Préférences de recherche
    preferred_education_levels = models.JSONField(default=list, blank=True)
    preferred_experience_range = models.JSONField(default=dict, blank=True)
    preferred_universities = models.JSONField(default=list, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Profil recruteur'
        verbose_name_plural = 'Profils recruteurs'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.company_name}"


class ProfileViewLog(models.Model):
    """Log des consultations de profils candidats par les recruteurs"""
    
    candidate_profile = models.ForeignKey(
        'candidate.CandidateProfile',
        on_delete=models.CASCADE,
        related_name='profile_views'
    )
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Détails de la consultation
    viewed_at = models.DateTimeField(auto_now_add=True)
    view_duration = models.IntegerField(null=True, blank=True)  # en secondes
    sections_viewed = models.JSONField(default=list, blank=True)  # ['personal', 'education', 'video', etc.]
    
    # Actions effectuées
    cv_downloaded = models.BooleanField(default=False)
    video_watched = models.BooleanField(default=False)
    contact_attempted = models.BooleanField(default=False)
    
    # Évaluation (optionnelle)
    interest_level = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    notes = models.TextField(blank=True)
    
    # Métadonnées
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Consultation de profil'
        verbose_name_plural = 'Consultations de profils'
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['candidate_profile', '-viewed_at']),
            models.Index(fields=['recruiter', '-viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.recruiter.username} → {self.candidate_profile.full_name} ({self.viewed_at})"


class CandidateInteraction(models.Model):
    """Interactions entre recruteurs et candidats"""
    
    INTERACTION_TYPES = [
        ('profile_view', 'Consultation profil'),
        ('video_view', 'Consultation vidéo'),
        ('cv_download', 'Téléchargement CV'),
        ('message_sent', 'Message envoyé'),
        ('interview_request', 'Demande entretien'),
        ('offer_sent', 'Offre envoyée'),
        ('favorite_added', 'Ajout aux favoris'),
        ('favorite_removed', 'Retrait des favoris'),
    ]
    
    candidate = models.ForeignKey(
        'candidate.CandidateProfile',
        on_delete=models.CASCADE,
        related_name='recruiter_interactions'
    )
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE)
    
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    interaction_date = models.DateTimeField(auto_now_add=True)
    
    # Données supplémentaires selon le type d'interaction
    details = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Interaction candidat'
        verbose_name_plural = 'Interactions candidats'
        ordering = ['-interaction_date']
        indexes = [
            models.Index(fields=['candidate', '-interaction_date']),
            models.Index(fields=['recruiter', '-interaction_date']),
            models.Index(fields=['interaction_type']),
        ]
    
    def __str__(self):
        return f"{self.recruiter.username} - {self.get_interaction_type_display()} - {self.candidate.full_name}"


class RecruiterFavorite(models.Model):
    """Candidats favoris des recruteurs"""
    
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE)
    candidate = models.ForeignKey(
        'candidate.CandidateProfile',
        on_delete=models.CASCADE
    )
    
    added_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    priority = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    class Meta:
        verbose_name = 'Candidat favori'
        verbose_name_plural = 'Candidats favoris'
        unique_together = ['recruiter', 'candidate']
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.recruiter.username} → {self.candidate.full_name} (★{self.priority})"


class RecruiterSearchHistory(models.Model):
    """Historique des recherches des recruteurs"""
    
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE)
    search_query = models.CharField(max_length=500)
    search_filters = models.JSONField(default=dict)
    results_count = models.IntegerField(default=0)
    search_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Historique de recherche'
        verbose_name_plural = 'Historiques de recherches'
        ordering = ['-search_date']
    
    def __str__(self):
        return f"{self.recruiter.username} - \"{self.search_query}\" ({self.results_count} résultats)"


# Signaux pour créer automatiquement les interactions
from django.db.models.signals import post_save
from django.dispatch import receiver
from candidate.models import VideoViewLog

@receiver(post_save, sender=VideoViewLog)
def create_video_interaction(sender, instance, created, **kwargs):
    """Créer une interaction lors de la consultation d'une vidéo"""
    if created:
        CandidateInteraction.objects.create(
            candidate=instance.candidate_profile,
            recruiter=instance.viewer,
            interaction_type='video_view',
            details={
                'video_id': instance.video.id,
                'view_duration': instance.view_duration,
                'completed': instance.completed_viewing,
                'rating': instance.rating
            },
            notes=instance.notes
        )

@receiver(post_save, sender=ProfileViewLog)
def create_profile_interaction(sender, instance, created, **kwargs):
    """Créer une interaction lors de la consultation d'un profil"""
    if created:
        CandidateInteraction.objects.create(
            candidate=instance.candidate_profile,
            recruiter=instance.recruiter,
            interaction_type='profile_view',
            details={
                'view_duration': instance.view_duration,
                'sections_viewed': instance.sections_viewed,
                'cv_downloaded': instance.cv_downloaded,
                'interest_level': instance.interest_level
            },
            notes=instance.notes
        )