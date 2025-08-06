from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Video, QualityCheck, RecordingSession, VideoAnalytics


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les informations utilisateur de base"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class QualityCheckSerializer(serializers.ModelSerializer):
    """Serializer pour les tests qualité"""
    check_type_display = serializers.CharField(source='get_check_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = QualityCheck
        fields = [
            'id', 'check_type', 'check_type_display', 'status', 'status_display',
            'score', 'message', 'technical_details', 'created_at', 'updated_at'
        ]


class RecordingSessionSerializer(serializers.ModelSerializer):
    """Serializer pour les sessions d'enregistrement"""
    duration_formatted = serializers.SerializerMethodField()
    is_completed = serializers.ReadOnlyField()
    
    class Meta:
        model = RecordingSession
        fields = [
            'id', 'started_at', 'ended_at', 'duration_formatted', 'is_completed',
            'instructions_shown', 'instructions_completed', 'total_attempts',
            'duration_seconds', 'device_settings'
        ]
    
    def get_duration_formatted(self, obj):
        if not obj.duration_seconds:
            return "00:00"
        minutes = obj.duration_seconds // 60
        seconds = obj.duration_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"


class VideoAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer pour les analytics vidéo"""
    class Meta:
        model = VideoAnalytics
        fields = [
            'face_detection_accuracy', 'lighting_variance', 'audio_peak_level',
            'positioning_score', 'encoding_quality', 'compression_ratio',
            'view_count', 'download_attempts', 'created_at', 'updated_at'
        ]


class VideoListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des vidéos (version légère)"""
    user = UserSerializer(read_only=True)
    duration_formatted = serializers.ReadOnlyField(source='get_duration_formatted')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    quality_checks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'title', 'description', 'user', 'status', 'status_display',
            'overall_quality_score', 'is_approved', 'duration_formatted',
            'file_size', 'format', 'resolution', 'linked_to_cv', 'cv_update_suggested',
            'created_at', 'updated_at', 'recorded_at', 'quality_checks_count'
        ]
    
    def get_quality_checks_count(self, obj):
        return obj.quality_checks.count()


class VideoDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une vidéo (avec relations)"""
    user = UserSerializer(read_only=True)
    quality_checks = QualityCheckSerializer(many=True, read_only=True)
    recording_session = RecordingSessionSerializer(read_only=True)
    analytics = VideoAnalyticsSerializer(read_only=True)
    duration_formatted = serializers.ReadOnlyField(source='get_duration_formatted')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready_for_recording = serializers.ReadOnlyField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'title', 'description', 'user', 'video_file', 'thumbnail',
            'duration', 'duration_formatted', 'file_size', 'format', 'resolution',
            'status', 'status_display', 'overall_quality_score', 'is_approved',
            'is_ready_for_recording', 'linked_to_cv', 'cv_update_suggested',
            'created_at', 'updated_at', 'recorded_at',
            'quality_checks', 'recording_session', 'analytics'
        ]


class VideoCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création/mise à jour de vidéos"""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = Video
        fields = [
            'user', 'title', 'description', 'video_file', 'duration',
            'file_size', 'format', 'resolution', 'overall_quality_score'
        ]
    
    def create(self, validated_data):
        # Définir le statut initial
        validated_data['status'] = 'processing'
        return super().create(validated_data)


class QualityCheckCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/mettre à jour les tests qualité"""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = QualityCheck
        fields = [
            'video', 'user', 'check_type', 'status', 'score', 
            'message', 'technical_details'
        ]
    
    def create(self, validated_data):
        # Mise à jour ou création
        video = validated_data['video']
        check_type = validated_data['check_type']
        
        quality_check, created = QualityCheck.objects.update_or_create(
            video=video,
            check_type=check_type,
            defaults=validated_data
        )
        
        # Recalculer le score global de la vidéo
        self._update_video_quality_score(video)
        
        return quality_check
    
    def _update_video_quality_score(self, video):
        """Recalcule le score qualité global de la vidéo"""
        quality_checks = video.quality_checks.all()
        if quality_checks.exists():
            avg_score = sum(qc.score for qc in quality_checks) / len(quality_checks)
            video.overall_quality_score = round(avg_score)
            video.save(update_fields=['overall_quality_score'])


class RecordingSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une session d'enregistrement"""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = RecordingSession
        fields = [
            'video', 'user', 'instructions_shown', 'instructions_completed',
            'total_attempts', 'duration_seconds', 'device_settings'
        ]