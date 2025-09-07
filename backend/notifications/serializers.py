from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notification, NotificationPreference, NotificationTemplate


class SenderSerializer(serializers.ModelSerializer):
    """Serializer pour l'expéditeur d'une notification"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    sender = SenderSerializer(read_only=True)
    time_since_created = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    related_object = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority',
            'sender', 'is_read', 'is_archived', 'read_at', 'created_at',
            'expires_at', 'action_url', 'action_text', 'extra_data',
            'related_object_type', 'related_object_id', 'time_since_created',
            'is_expired', 'related_object'
        ]
    
    def get_time_since_created(self, obj):
        """Calculer le temps écoulé depuis la création"""
        from django.utils import timezone
        import datetime
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"il y a {hours}h"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"il y a {minutes}min"
        else:
            return "à l'instant"
    
    def get_related_object(self, obj):
        """Obtenir des informations sur l'objet lié"""
        if not obj.related_object_type or not obj.related_object_id:
            return None
        
        related_obj = obj.related_object
        if not related_obj:
            return None
        
        # Sérialiser selon le type d'objet
        if obj.related_object_type == 'video':
            return {
                'type': 'video',
                'id': related_obj.id,
                'title': related_obj.title,
                'quality_score': related_obj.overall_quality_score,
                'status': related_obj.status
            }
        elif obj.related_object_type == 'candidate_profile':
            return {
                'type': 'candidate_profile',
                'id': related_obj.id,
                'full_name': related_obj.full_name,
                'profile_completeness': related_obj.profile_completeness,
                'has_video': related_obj.has_presentation_video
            }
        
        return {'type': obj.related_object_type, 'id': obj.related_object_id}


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une notification"""
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    sender = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Notification
        fields = [
            'recipient', 'sender', 'notification_type', 'title', 'message',
            'priority', 'related_object_type', 'related_object_id',
            'extra_data', 'action_url', 'action_text', 'expires_at'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer pour les préférences de notification"""
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'email_notifications', 'push_notifications',
            'sms_notifications', 'notify_video_viewed', 'notify_video_approved',
            'notify_sync_needed', 'notify_profile_complete', 'daily_digest',
            'weekly_summary', 'quiet_hours', 'created_at', 'updated_at'
        ]


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer pour les templates de notification"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'notification_type', 'title_template', 'message_template',
            'email_subject_template', 'email_body_template', 'available_variables',
            'is_active', 'created_at', 'updated_at'
        ]


class NotificationBulkCreateSerializer(serializers.Serializer):
    """Serializer pour la création en masse de notifications"""
    notifications = serializers.ListField(
        child=NotificationCreateSerializer(),
        min_length=1,
        max_length=100  # Limiter pour éviter les abus
    )
    
    def create(self, validated_data):
        notifications_data = validated_data['notifications']
        created_notifications = []
        
        for notification_data in notifications_data:
            notification = Notification.objects.create(**notification_data)
            created_notifications.append(notification)
        
        return created_notifications


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de notifications"""
    total_notifications = serializers.IntegerField(read_only=True)
    unread_notifications = serializers.IntegerField(read_only=True)
    today_notifications = serializers.IntegerField(read_only=True)
    this_week_notifications = serializers.IntegerField(read_only=True)
    
    # Répartition par type
    by_type = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    
    # Répartition par priorité
    by_priority = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    
    last_notification = NotificationSerializer(read_only=True)
    
    class Meta:
        fields = [
            'total_notifications', 'unread_notifications', 'today_notifications',
            'this_week_notifications', 'by_type', 'by_priority', 'last_notification'
        ]