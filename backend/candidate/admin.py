from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import CandidateProfile, VideoViewLog, CVVideoSyncLog


# 🔹 Filtre custom pour savoir si un candidat a une vidéo ou pas
class HasPresentationVideoFilter(admin.SimpleListFilter):
    title = 'A une vidéo de présentation'
    parameter_name = 'has_presentation_video'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Oui'),
            ('no', 'Non'),
        )

    def queryset(self, request, queryset):
        value = self.value()
        if value == 'yes':
            return queryset.exclude(presentation_video__isnull=True).exclude(presentation_video__exact='')
        if value == 'no':
            return queryset.filter(presentation_video__isnull=True) | queryset.filter(presentation_video__exact='')
        return queryset


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = [
        'full_name',
        'user_email',
        'status',
        'profile_completeness_bar',
        'has_presentation_video',  # reste en affichage
        'video_quality_display',
        'created_at'
    ]
    list_filter = [
        'status',
        'education_level',
        HasPresentationVideoFilter,  # ✅ filtre custom
        'is_profile_public',
        'created_at'
    ]
    search_fields = [
        'first_name',
        'last_name',
        'user__username',
        'user__email',
        'university',
        'major'
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'profile_completeness',
        'video_linked_at',
        'full_name'
    ]

    fieldsets = (
        ('Informations personnelles', {
            'fields': (
                'user',
                'first_name',
                'last_name',
                'full_name',
                'phone',
                'location',
                'birth_date'
            )
        }),
        ('Formation et expérience', {
            'fields': (
                'education_level',
                'university',
                'major',
                'graduation_year',
                'experience_years'
            )
        }),
        ('CV et documents', {
            'fields': (
                'cv_file',
                'cv_last_updated',
                'portfolio_url',
                'linkedin_url'
            )
        }),
        ('Vidéo de présentation', {
            'fields': (
                'presentation_video',
                'video_last_updated',
                'video_quality_score',
                'video_linked_at'
            )
        }),
        ('Statut et préférences', {
            'fields': (
                'status',
                'is_profile_public',
                'accepts_offers',
                'preferred_salary_min',
                'preferred_salary_max'
            )
        }),
        ('Métadonnées', {
            'fields': (
                'profile_completeness',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

    def profile_completeness_bar(self, obj):
        percentage = obj.profile_completeness
        if percentage >= 80:
            color = '#28a745'
        elif percentage >= 50:
            color = '#ffc107'
        else:
            color = '#dc3545'

        return format_html(
            '<div style="width: 100px; background-color: #e9ecef; border-radius: 4px;">'
            '<div style="width: {}%; height: 20px; background-color: {}; border-radius: 4px; text-align: center; color: white; font-size: 12px; line-height: 20px;">'
            '{}%</div></div>',
            percentage, color, percentage
        )
    profile_completeness_bar.short_description = 'Complétude'

    def has_presentation_video(self, obj):
        """Affiche Oui/Non dans list_display"""
        return "✅ Oui" if obj.presentation_video else "❌ Non"
    has_presentation_video.short_description = "Vidéo présentation"

    def video_quality_display(self, obj):
        if not obj.presentation_video:
            return format_html('<span style="color: #6c757d;">Aucune vidéo</span>')

        score = obj.video_quality_score
        if score >= 80:
            color = '#28a745'
            icon = '✅'
        elif score >= 60:
            color = '#ffc107'
            icon = '⚠️'
        else:
            color = '#dc3545'
            icon = '❌'

        return format_html(
            '<span style="color: {};">{} {}%</span>',
            color, icon, score
        )
    video_quality_display.short_description = 'Qualité vidéo'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'presentation_video')

    actions = ['recalculate_completeness', 'approve_profiles']

    def recalculate_completeness(self, request, queryset):
        for profile in queryset:
            profile.calculate_profile_completeness()
        self.message_user(
            request,
            f"Complétude recalculée pour {queryset.count()} profil(s)."
        )
    recalculate_completeness.short_description = "Recalculer la complétude"

    def approve_profiles(self, request, queryset):
        updated = queryset.update(is_profile_public=True)
        self.message_user(
            request,
            f"{updated} profil(s) rendu(s) public(s)."
        )
    approve_profiles.short_description = "Rendre les profils publics"
