from django.contrib import admin
from .models import Video, QualityCheck, RecordingSession, VideoAnalytics


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'status', 'overall_quality_score', 
        'is_approved', 'duration', 'created_at'
    ]
    list_filter = ['status', 'is_approved', 'linked_to_cv', 'created_at']
    search_fields = ['title', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'file_size']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('user', 'title', 'description')
        }),
        ('Fichier vidéo', {
            'fields': ('video_file', 'thumbnail', 'duration', 'file_size', 'format', 'resolution')
        }),
        ('Statut et qualité', {
            'fields': ('status', 'overall_quality_score', 'is_approved')
        }),
        ('Intégration JOBGATE', {
            'fields': ('linked_to_cv', 'cv_update_suggested')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'recorded_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(QualityCheck)
class QualityCheckAdmin(admin.ModelAdmin):
    list_display = [
        'video', 'check_type', 'status', 'score', 'message', 'created_at'
    ]
    list_filter = ['check_type', 'status', 'created_at']
    search_fields = ['video__title', 'video__user__username', 'message']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('video', 'user')


@admin.register(RecordingSession)
class RecordingSessionAdmin(admin.ModelAdmin):
    list_display = [
        'video', 'user', 'started_at', 'ended_at', 
        'total_attempts', 'duration_seconds', 'is_completed'
    ]
    list_filter = ['started_at', 'ended_at']
    search_fields = ['video__title', 'user__username']
    readonly_fields = ['started_at', 'is_completed']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('video', 'user')


@admin.register(VideoAnalytics)
class VideoAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'video', 'face_detection_accuracy', 'lighting_variance',
        'audio_peak_level', 'view_count', 'created_at'
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = ['video__title', 'video__user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('video')