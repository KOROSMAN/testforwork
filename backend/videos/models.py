from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import os


def video_upload_path(instance, filename):
    """Génère un chemin unique pour chaque vidéo"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('videos', str(instance.user.id), filename)


class Video(models.Model):
    """Modèle principal pour les vidéos de présentation"""
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('processing', 'En traitement'),
        ('completed', 'Terminée'),
        ('failed', 'Échec'),
    ]
    
    # Relations
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos')
    
    # Informations de base
    title = models.CharField(max_length=200, default='Vidéo de présentation')
    description = models.TextField(blank=True, null=True)
    
    # Fichier vidéo
    video_file = models.FileField(upload_to=video_upload_path, null=True, blank=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    
    # Métadonnées techniques
    duration = models.FloatField(null=True, blank=True, help_text='Durée en secondes')
    file_size = models.BigIntegerField(null=True, blank=True, help_text='Taille en bytes')
    format = models.CharField(max_length=10, null=True, blank=True)
    resolution = models.CharField(max_length=20, null=True, blank=True)
    
    # Statut et qualité
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    overall_quality_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    is_approved = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recorded_at = models.DateTimeField(null=True, blank=True)
    
    # Intégration JOBGATE (pour plus tard)
    linked_to_cv = models.BooleanField(default=False)
    cv_update_suggested = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Vidéo de présentation'
        verbose_name_plural = 'Vidéos de présentation'
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"
    
    @property
    def is_ready_for_recording(self):
        """Vérifie si la qualité est suffisante pour l'enregistrement"""
        return self.overall_quality_score >= 80
    
    def get_duration_formatted(self):
        """Retourne la durée formatée (mm:ss)"""
        if not self.duration:
            return "00:00"
        minutes = int(self.duration // 60)
        seconds = int(self.duration % 60)
        return f"{minutes:02d}:{seconds:02d}"


class QualityCheck(models.Model):
    """Résultats des tests qualité avant enregistrement"""
    
    CHECK_TYPES = [
        ('face', 'Détection faciale'),
        ('lighting', 'Éclairage'),
        ('audio', 'Niveau audio'),
        ('positioning', 'Positionnement'),
    ]
    
    STATUS_CHOICES = [
        ('checking', 'En cours'),
        ('success', 'Succès'),
        ('warning', 'Attention'),
        ('error', 'Erreur'),
    ]
    
    # Relations
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='quality_checks')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Type et résultats du test
    check_type = models.CharField(max_length=20, choices=CHECK_TYPES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='checking')
    score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    message = models.CharField(max_length=200, blank=True)
    
    # Détails techniques (JSON pour flexibilité)
    technical_details = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['video', 'check_type']
        verbose_name = 'Test qualité'
        verbose_name_plural = 'Tests qualité'
    
    def __str__(self):
        return f"{self.get_check_type_display()} - {self.score}% ({self.status})"


class RecordingSession(models.Model):
    """Session d'enregistrement avec instructions"""
    
    # Relations
    video = models.OneToOneField(Video, on_delete=models.CASCADE, related_name='recording_session')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Informations de session
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Instructions suivies
    instructions_shown = models.JSONField(default=list, blank=True)
    instructions_completed = models.JSONField(default=list, blank=True)
    
    # Statistiques
    total_attempts = models.IntegerField(default=1)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    # Paramètres utilisés
    device_settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Session d\'enregistrement'
        verbose_name_plural = 'Sessions d\'enregistrement'
    
    def __str__(self):
        return f"Session {self.user.username} - {self.started_at.strftime('%d/%m/%Y %H:%M')}"
    
    @property
    def is_completed(self):
        return self.ended_at is not None


class VideoAnalytics(models.Model):
    """Analytics et métriques pour l'amélioration continue"""
    
    # Relations
    video = models.OneToOneField(Video, on_delete=models.CASCADE, related_name='analytics')
    
    # Métriques qualité détaillées
    face_detection_accuracy = models.FloatField(null=True, blank=True)
    lighting_variance = models.FloatField(null=True, blank=True)
    audio_peak_level = models.FloatField(null=True, blank=True)
    positioning_score = models.FloatField(null=True, blank=True)
    
    # Métriques techniques
    encoding_quality = models.CharField(max_length=20, blank=True)
    compression_ratio = models.FloatField(null=True, blank=True)
    
    # Usage
    view_count = models.IntegerField(default=0)
    download_attempts = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Analytics vidéo'
        verbose_name_plural = 'Analytics vidéos'
    
    def __str__(self):
        return f"Analytics - {self.video.title}"