from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import CandidateProfile, VideoViewLog, CVVideoSyncLog
from videos.serializers import VideoDetailSerializer


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour User"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']


class CandidateProfileListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des profils candidats (vue recruteur)"""
    user = UserBasicSerializer(read_only=True)
    full_name = serializers.ReadOnlyField()
    has_presentation_video = serializers.ReadOnlyField()
    video_url = serializers.ReadOnlyField()
    
    class Meta:
        model = CandidateProfile
        fields = [
            'id', 'user', 'full_name', 'location', 'education_level',
            'university', 'major', 'graduation_year', 'experience_years',
            'status', 'profile_completeness', 'has_presentation_video',
            'video_url', 'video_quality_score', 'created_at', 'updated_at'
        ]


class CandidateProfileDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un profil candidat"""
    user = UserBasicSerializer(read_only=True)
    presentation_video = VideoDetailSerializer(read_only=True)
    full_name = serializers.ReadOnlyField()
    has_presentation_video = serializers.ReadOnlyField()
    video_url = serializers.ReadOnlyField()
    
    class Meta:
        model = CandidateProfile
        fields = [
            'id', 'user', 'full_name', 'first_name', 'last_name', 'phone',
            'location', 'birth_date', 'education_level', 'university', 'major',
            'graduation_year', 'experience_years', 'cv_file', 'cv_last_updated',
            'portfolio_url', 'linkedin_url', 'presentation_video', 'video_last_updated',
            'video_quality_score', 'video_linked_at', 'status', 'is_profile_public',
            'accepts_offers', 'preferred_salary_min', 'preferred_salary_max',
            'created_at', 'updated_at', 'profile_completeness',
            'has_presentation_video', 'video_url'
        ]


class CandidateProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour du profil candidat"""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = CandidateProfile
        fields = [
            'user', 'first_name', 'last_name', 'phone', 'location', 'birth_date',
            'education_level', 'university', 'major', 'graduation_year',
            'experience_years', 'cv_file', 'portfolio_url', 'linkedin_url',
            'status', 'is_profile_public', 'accepts_offers',
            'preferred_salary_min', 'preferred_salary_max'
        ]
    
    def update(self, instance, validated_data):
        # Détecter si le CV a été mis à jour
        cv_updated = 'cv_file' in validated_data and validated_data['cv_file'] != instance.cv_file
        
        instance = super().update(instance, validated_data)
        
        if cv_updated:
            instance.cv_last_updated = timezone.now()
            instance.save()
            
            # Créer un log de synchronisation CV-Vidéo
            CVVideoSyncLog.objects.create(
                candidate_profile=instance,
                action='cv_updated',
                sync_needed=instance.has_presentation_video,
                notes='CV mis à jour, synchronisation vidéo recommandée'
            )
            
            # Recalculer la complétude du profil
            instance.calculate_profile_completeness()
        
        return instance


class VideoViewLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs de consultation vidéo"""
    viewer = UserBasicSerializer(read_only=True)
    candidate_profile = CandidateProfileListSerializer(read_only=True)
    
    class Meta:
        model = VideoViewLog
        fields = [
            'id', 'video', 'viewer', 'candidate_profile', 'viewed_at',
            'view_duration', 'completed_viewing', 'rating', 'notes'
        ]


class VideoViewLogCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un log de consultation"""
    viewer = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = VideoViewLog
        fields = [
            'video', 'viewer', 'candidate_profile', 'view_duration',
            'completed_viewing', 'rating', 'notes'
        ]


class CVVideoSyncLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs de synchronisation CV-Vidéo"""
    candidate_profile = CandidateProfileListSerializer(read_only=True)
    
    class Meta:
        model = CVVideoSyncLog
        fields = [
            'id', 'candidate_profile', 'action', 'cv_version', 'video_version',
            'sync_needed', 'sync_completed', 'sync_date', 'created_at', 'notes'
        ]


class VideoLinkRequestSerializer(serializers.Serializer):
    """Serializer pour lier une vidéo à un profil candidat"""
    video_id = serializers.IntegerField()
    candidate_profile_id = serializers.IntegerField(required=False)
    
    def validate_video_id(self, value):
        from videos.models import Video
        try:
            video = Video.objects.get(id=value)
            if not video.is_approved:
                raise serializers.ValidationError("La vidéo doit être approuvée avant d'être liée au profil")
            return value
        except Video.DoesNotExist:
            raise serializers.ValidationError("Vidéo introuvable")
    
    def validate(self, data):
        # Si pas de candidate_profile_id fourni, utiliser celui de l'utilisateur actuel
        if 'candidate_profile_id' not in data:
            user = self.context['request'].user
            try:
                data['candidate_profile_id'] = user.candidate_profile.id
            except CandidateProfile.DoesNotExist:
                raise serializers.ValidationError("Profil candidat introuvable pour cet utilisateur")
        
        return data