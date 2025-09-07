from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json


class NotificationManager(models.Manager):
    """Manager pour les notifications avec méthodes utiles"""
    
    def unread_for_user(self, user):
        """Notifications non lues pour un utilisateur"""
        return self.filter(recipient=user, is_read=False)
    
    def recent_for_user(self, user, days=7):
        """Notifications récentes pour un utilisateur"""
        since = timezone.now() - timezone.timedelta(days=days)
        return self.filter(recipient=user, created_at__gte=since)
    
    def create_video_notification(self, candidate_profile, notification_type, extra_data=None):
        """Créer une notification liée aux vidéos"""
        from candidate.models import CandidateProfile
        
        notification_messages = {
            'video_linked': 'Votre vidéo de présentation a été liée à votre profil avec succès !',
            'video_viewed': 'Un recruteur a consulté votre vidéo de présentation',
            'sync_needed': 'Votre CV a été mis à jour. Pensez à actualiser votre vidéo de présentation.',
            'profile_complete': 'Félicitations ! Votre profil candidat est maintenant complet.',
            'video_approved': 'Votre vidéo de présentation a été approuvée et est maintenant visible par les recruteurs',
        }
        
        return self.create(
            recipient=candidate_profile.user,
            notification_type=notification_type,
            title='JOBGATE Video Studio',
            message=notification_messages.get(notification_type, 'Nouvelle notification'),
            related_object_type='candidate_profile',
            related_object_id=candidate_profile.id,
            extra_data=extra_data or {}
        )


class Notification(models.Model):
    """Modèle pour les notifications utilisateur"""
    
    NOTIFICATION_TYPES = [
        # Notifications vidéo
        ('video_linked', 'Vidéo liée au profil'),
        ('video_viewed', 'Vidéo consultée par un recruteur'),
        ('video_approved', 'Vidéo approuvée'),
        ('sync_needed', 'Synchronisation CV-Vidéo nécessaire'),
        
        # Notifications profil
        ('profile_complete', 'Profil complété'),
        ('profile_viewed', 'Profil consulté'),
        ('cv_updated', 'CV mis à jour'),
        
        # Notifications recrutement
        ('job_match', 'Nouvelle offre correspondante'),
        ('interview_request', 'Demande d\'entretien'),
        ('application_status', 'Statut candidature'),
        
        # Notifications système
        ('system_update', 'Mise à jour système'),
        ('account_update', 'Mise à jour compte'),
        ('welcome', 'Bienvenue'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Faible'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]
    
    # Relations
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='sent_notifications'
    )
    
    # Contenu de la notification
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    
    # Références à d'autres objets
    related_object_type = models.CharField(max_length=50, blank=True)  # 'video', 'candidate_profile', etc.
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    
    # Données supplémentaires (JSON)
    extra_data = models.JSONField(default=dict, blank=True)
    
    # Statut
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Actions possibles
    action_url = models.URLField(blank=True)
    action_text = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Manager personnalisé
    objects = NotificationManager()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
    
    def mark_as_read(self):
        """Marquer la notification comme lue"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_unread(self):
        """Marquer la notification comme non lue"""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
    
    def archive(self):
        """Archiver la notification"""
        self.is_archived = True
        self.save(update_fields=['is_archived'])
    
    @property
    def is_expired(self):
        """Vérifier si la notification a expiré"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def related_object(self):
        """Obtenir l'objet lié à la notification"""
        if not self.related_object_type or not self.related_object_id:
            return None
        
        try:
            if self.related_object_type == 'video':
                from videos.models import Video
                return Video.objects.get(id=self.related_object_id)
            elif self.related_object_type == 'candidate_profile':
                from candidate.models import CandidateProfile
                return CandidateProfile.objects.get(id=self.related_object_id)
        except:
            return None
    
    def to_dict(self):
        """Convertir en dictionnaire pour l'API"""
        return {
            'id': self.id,
            'notification_type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'priority': self.priority,
            'is_read': self.is_read,
            'is_archived': self.is_archived,
            'action_url': self.action_url,
            'action_text': self.action_text,
            'created_at': self.created_at.isoformat(),
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'extra_data': self.extra_data,
            'sender': {
                'id': self.sender.id,
                'username': self.sender.username,
                'full_name': f"{self.sender.first_name} {self.sender.last_name}".strip()
            } if self.sender else None
        }


class NotificationPreference(models.Model):
    """Préférences de notification pour chaque utilisateur"""
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='notification_preferences'
    )
    
    # Préférences par type de notification
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Préférences spécifiques aux vidéos
    notify_video_viewed = models.BooleanField(default=True)
    notify_video_approved = models.BooleanField(default=True)
    notify_sync_needed = models.BooleanField(default=True)
    notify_profile_complete = models.BooleanField(default=True)
    
    # Préférences de fréquence
    daily_digest = models.BooleanField(default=False)
    weekly_summary = models.BooleanField(default=True)
    
    # Plages horaires (JSON)
    quiet_hours = models.JSONField(
        default=dict,
        blank=True,
        help_text="Format: {'start': '22:00', 'end': '08:00'}"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Préférence de notification'
        verbose_name_plural = 'Préférences de notifications'
    
    def __str__(self):
        return f"Préférences - {self.user.username}"
    
    def should_send_notification(self, notification_type):
        """Vérifier si l'utilisateur souhaite recevoir ce type de notification"""
        preferences_map = {
            'video_viewed': self.notify_video_viewed,
            'video_approved': self.notify_video_approved,
            'sync_needed': self.notify_sync_needed,
            'profile_complete': self.notify_profile_complete,
        }
        return preferences_map.get(notification_type, True)


class NotificationTemplate(models.Model):
    """Templates pour les notifications"""
    
    notification_type = models.CharField(max_length=50, unique=True)
    title_template = models.CharField(max_length=200)
    message_template = models.TextField()
    email_subject_template = models.CharField(max_length=200, blank=True)
    email_body_template = models.TextField(blank=True)
    
    # Variables disponibles pour les templates
    available_variables = models.JSONField(
        default=list,
        help_text="Variables disponibles: {user_name}, {video_title}, etc."
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Template de notification'
        verbose_name_plural = 'Templates de notifications'
    
    def __str__(self):
        return f"Template - {self.notification_type}"
    
    def render(self, context):
        """Rendre le template avec le contexte donné"""
        title = self.title_template
        message = self.message_template
        
        for key, value in context.items():
            placeholder = f"{{{key}}}"
            title = title.replace(placeholder, str(value))
            message = message.replace(placeholder, str(value))
        
        return {
            'title': title,
            'message': message
        }


# Signaux Django pour créer des notifications automatiquement
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """Créer les préférences de notification pour un nouvel utilisateur"""
    if created:
        NotificationPreference.objects.create(user=instance)


# Fonctions utilitaires pour créer des notifications
def create_video_linked_notification(candidate_profile, video):
    """Créer une notification quand une vidéo est liée"""
    return Notification.objects.create_video_notification(
        candidate_profile=candidate_profile,
        notification_type='video_linked',
        extra_data={
            'video_id': video.id,
            'video_title': video.title,
            'quality_score': video.overall_quality_score
        }
    )

def create_video_viewed_notification(candidate_profile, viewer, video):
    """Créer une notification quand une vidéo est consultée"""
    return Notification.objects.create(
        recipient=candidate_profile.user,
        sender=viewer,
        notification_type='video_viewed',
        title='Vidéo consultée',
        message=f'Un recruteur a consulté votre vidéo de présentation "{video.title}"',
        related_object_type='candidate_profile',
        related_object_id=candidate_profile.id,
        extra_data={
            'video_id': video.id,
            'viewer_name': f"{viewer.first_name} {viewer.last_name}".strip() or viewer.username
        }
    )

def create_sync_needed_notification(candidate_profile):
    """Créer une notification pour synchronisation CV-Vidéo"""
    return Notification.objects.create_video_notification(
        candidate_profile=candidate_profile,
        notification_type='sync_needed',
        extra_data={
            'cv_updated_at': candidate_profile.cv_last_updated.isoformat() if candidate_profile.cv_last_updated else None,
            'video_updated_at': candidate_profile.video_last_updated.isoformat() if candidate_profile.video_last_updated else None
        }
    )