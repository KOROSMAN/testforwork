# apps/candidate/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class CandidateProfile(models.Model):
    """Profil candidat avec intégration vidéo"""
    
    STATUS_CHOICES = [
        ('active', 'Recherche active'),
        ('passive', 'Recherche passive'),
        ('not_available', 'Non disponible'),
    ]
    
    # Relations
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='candidate_profile')
    
    # Informations personnelles
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    
    # Formation et expérience
    education_level = models.CharField(max_length=100, blank=True)
    university = models.CharField(max_length=200, blank=True)
    major = models.CharField(max_length=200, blank=True)
    graduation_year = models.IntegerField(null=True, blank=True)
    experience_years = models.IntegerField(default=0)
    
    # CV et documents
    cv_file = models.FileField(upload_to='cvs/', null=True, blank=True)
    cv_last_updated = models.DateTimeField(null=True, blank=True)
    portfolio_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    
    # Vidéo de présentation - NOUVELLE INTÉGRATION
    presentation_video = models.ForeignKey(
        'videos.Video',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='candidate_profile'
    )
    video_last_updated = models.DateTimeField(null=True, blank=True)
    video_quality_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    video_linked_at = models.DateTimeField(null=True, blank=True)
    
    # Statut et préférences
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_profile_public = models.BooleanField(default=True)
    accepts_offers = models.BooleanField(default=True)
    preferred_salary_min = models.IntegerField(null=True, blank=True)
    preferred_salary_max = models.IntegerField(null=True, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_completeness = models.IntegerField(default=0)  # Pourcentage de complétude
    
    class Meta:
        verbose_name = 'Profil candidat'
        verbose_name_plural = 'Profils candidats'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def has_presentation_video(self):
        return self.presentation_video is not None and self.presentation_video.is_approved
    
    @property
    def video_url(self):
        if self.presentation_video and self.presentation_video.video_file:
            return self.presentation_video.video_file.url
        return None
    
    def update_video_link(self, video):
        """Lier une vidéo au profil candidat"""
        self.presentation_video = video
        self.video_last_updated = timezone.now()
        self.video_linked_at = timezone.now()
        self.video_quality_score = video.overall_quality_score
        self.save()
        
        # Mettre à jour le score de complétude
        self.calculate_profile_completeness()
    
    def calculate_profile_completeness(self):
        """Calculer le pourcentage de complétude du profil"""
        score = 0
        total_fields = 10
        
        # Champs obligatoires (20 points chacun)
        if self.first_name: score += 2
        if self.last_name: score += 2
        if self.user.email: score += 1
        if self.phone: score += 1
        if self.education_level: score += 1
        if self.university: score += 1
        
        # CV (20 points)
        if self.cv_file: score += 2
        
        # Vidéo de présentation (20 points)
        if self.has_presentation_video: score += 2
        
        self.profile_completeness = min(100, int((score / total_fields) * 100))
        self.save(update_fields=['profile_completeness'])
        
        return self.profile_completeness


class VideoViewLog(models.Model):
    """Log des consultations de vidéos par les recruteurs"""
    
    video = models.ForeignKey(
        'videos.Video',
        on_delete=models.CASCADE,
        related_name='view_logs'
    )
    viewer = models.ForeignKey(User, on_delete=models.CASCADE)  # Le recruteur qui regarde
    candidate_profile = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE)
    
    viewed_at = models.DateTimeField(auto_now_add=True)
    view_duration = models.IntegerField(null=True, blank=True)  # Durée en secondes
    completed_viewing = models.BooleanField(default=False)
    
    # Feedback du recruteur (optionnel)
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Consultation vidéo'
        verbose_name_plural = 'Consultations vidéos'
        ordering = ['-viewed_at']
    
    def __str__(self):
        return f"{self.viewer.username} - {self.candidate_profile.full_name} - {self.viewed_at}"


class CVVideoSyncLog(models.Model):
    """Log des synchronisations entre CV et vidéo"""
    
    candidate_profile = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)  # 'cv_updated', 'video_linked', 'sync_suggested'
    cv_version = models.CharField(max_length=100, blank=True)
    video_version = models.CharField(max_length=100, blank=True)
    
    sync_needed = models.BooleanField(default=False)
    sync_completed = models.BooleanField(default=False)
    sync_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Synchronisation CV-Vidéo'
        verbose_name_plural = 'Synchronisations CV-Vidéo'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.candidate_profile.full_name} - {self.action} - {self.created_at}"