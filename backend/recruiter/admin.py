# backend/recruiter/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.http import HttpResponse
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta
import csv

from .models import (
    RecruiterProfile, ProfileViewLog, CandidateInteraction, 
    RecruiterFavorite, RecruiterSearchHistory
)


@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user_name',
        'company_name',
        'position',
        'department',
        'is_active',
        'created_at'
    ]
    list_filter = [
        'is_active',
        'company_name',
        'position',
        'created_at'
    ]
    search_fields = [
        'user__username',
        'user__email',
        'user__first_name',
        'user__last_name',
        'company_name',
        'position'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Informations professionnelles', {
            'fields': (
                'company_name',
                'position',
                'department',
                'phone'
            )
        }),
        ('Préférences de recherche', {
            'fields': (
                'preferred_education_levels',
                'preferred_experience_range',
                'preferred_universities'
            ),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    user_name.short_description = 'Utilisateur'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(ProfileViewLog)
class ProfileViewLogAdmin(admin.ModelAdmin):
    list_display = [
        'candidate_name',
        'recruiter_name',
        'viewed_at',
        'view_duration_display',
        'actions_summary',
        'interest_level_display'
    ]
    list_filter = [
        'viewed_at',
        'cv_downloaded',
        'video_watched',
        'contact_attempted',
        'interest_level'
    ]
    search_fields = [
        'candidate_profile__first_name',
        'candidate_profile__last_name',
        'recruiter__username',
        'recruiter__email'
    ]
    readonly_fields = ['viewed_at', 'ip_address', 'user_agent']
    
    fieldsets = (
        ('Consultation', {
            'fields': (
                'candidate_profile',
                'recruiter',
                'viewed_at',
                'view_duration'
            )
        }),
        ('Détails de la visite', {
            'fields': (
                'sections_viewed',
                'cv_downloaded',
                'video_watched',
                'contact_attempted'
            )
        }),
        ('Évaluation', {
            'fields': (
                'interest_level',
                'notes'
            )
        }),
        ('Informations techniques', {
            'fields': (
                'ip_address',
                'user_agent'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def candidate_name(self, obj):
        return obj.candidate_profile.full_name
    candidate_name.short_description = 'Candidat'
    
    def recruiter_name(self, obj):
        return obj.recruiter.get_full_name() or obj.recruiter.username
    recruiter_name.short_description = 'Recruteur'
    
    def view_duration_display(self, obj):
        if obj.view_duration:
            minutes = obj.view_duration // 60
            seconds = obj.view_duration % 60
            return f"{minutes}m {seconds}s"
        return "N/A"
    view_duration_display.short_description = 'Durée'
    
    def actions_summary(self, obj):
        actions = []
        if obj.cv_downloaded:
            actions.append('📄 CV')
        if obj.video_watched:
            actions.append('🎥 Vidéo')
        if obj.contact_attempted:
            actions.append('💌 Contact')
        
        return ' | '.join(actions) if actions else 'Aucune action'
    actions_summary.short_description = 'Actions'
    
    def interest_level_display(self, obj):
        if obj.interest_level:
            stars = '⭐' * obj.interest_level
            return f"{stars} ({obj.interest_level}/5)"
        return "Non évalué"
    interest_level_display.short_description = 'Intérêt'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'candidate_profile', 'recruiter'
        )


@admin.register(CandidateInteraction)
class CandidateInteractionAdmin(admin.ModelAdmin):
    list_display = [
        'candidate_name',
        'recruiter_name',
        'interaction_type_display',
        'interaction_date',
        'has_notes'
    ]
    list_filter = [
        'interaction_type',
        'interaction_date',
        'recruiter__recruiter_profile__company_name'
    ]
    search_fields = [
        'candidate__first_name',
        'candidate__last_name',
        'recruiter__username',
        'recruiter__email'
    ]
    readonly_fields = ['interaction_date']
    
    fieldsets = (
        ('Interaction', {
            'fields': (
                'candidate',
                'recruiter',
                'interaction_type',
                'interaction_date'
            )
        }),
        ('Détails', {
            'fields': (
                'details',
                'notes'
            )
        }),
    )
    
    def candidate_name(self, obj):
        return obj.candidate.full_name
    candidate_name.short_description = 'Candidat'
    
    def recruiter_name(self, obj):
        return obj.recruiter.get_full_name() or obj.recruiter.username
    recruiter_name.short_description = 'Recruteur'
    
    def interaction_type_display(self, obj):
        icons = {
            'profile_view': '👁️',
            'video_view': '🎥',
            'cv_download': '📄',
            'message_sent': '💌',
            'interview_request': '📞',
            'offer_sent': '🎯',
            'favorite_added': '⭐',
            'favorite_removed': '❌'
        }
        icon = icons.get(obj.interaction_type, '📋')
        return f"{icon} {obj.get_interaction_type_display()}"
    interaction_type_display.short_description = 'Type'
    
    def has_notes(self, obj):
        return "✅" if obj.notes else "❌"
    has_notes.short_description = 'Notes'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'candidate', 'recruiter'
        )


@admin.register(RecruiterFavorite)
class RecruiterFavoriteAdmin(admin.ModelAdmin):
    list_display = [
        'recruiter_name',
        'candidate_name',
        'priority_display',
        'added_at',
        'has_notes'
    ]
    list_filter = [
        'priority',
        'added_at',
        'recruiter__recruiter_profile__company_name'
    ]
    search_fields = [
        'candidate__first_name',
        'candidate__last_name',
        'recruiter__username',
        'recruiter__email'
    ]
    readonly_fields = ['added_at']
    
    fieldsets = (
        ('Favori', {
            'fields': (
                'recruiter',
                'candidate',
                'added_at'
            )
        }),
        ('Détails', {
            'fields': (
                'priority',
                'notes'
            )
        }),
    )
    
    def recruiter_name(self, obj):
        return obj.recruiter.get_full_name() or obj.recruiter.username
    recruiter_name.short_description = 'Recruteur'
    
    def candidate_name(self, obj):
        return obj.candidate.full_name
    candidate_name.short_description = 'Candidat'
    
    def priority_display(self, obj):
        stars = '⭐' * obj.priority
        colors = {
            1: '#dc3545',  # Rouge
            2: '#fd7e14',  # Orange
            3: '#ffc107',  # Jaune
            4: '#20c997',  # Vert clair
            5: '#28a745'   # Vert
        }
        color = colors.get(obj.priority, '#ffc107')
        
        return format_html(
            '<span style="color: {}; font-size: 1.2em;">{}</span>',
            color, stars
        )
    priority_display.short_description = 'Priorité'
    
    def has_notes(self, obj):
        return "✅" if obj.notes else "❌"
    has_notes.short_description = 'Notes'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'candidate', 'recruiter'
        )


@admin.register(RecruiterSearchHistory)
class RecruiterSearchHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'recruiter_name',
        'search_query_truncated',
        'results_count',
        'has_filters',
        'search_date'
    ]
    list_filter = [
        'search_date',
        'results_count'
    ]
    search_fields = [
        'search_query',
        'recruiter__username',
        'recruiter__email'
    ]
    readonly_fields = ['search_date']
    
    fieldsets = (
        ('Recherche', {
            'fields': (
                'recruiter',
                'search_query',
                'search_date'
            )
        }),
        ('Résultats', {
            'fields': (
                'results_count',
                'search_filters'
            )
        }),
    )
    
    def recruiter_name(self, obj):
        return obj.recruiter.get_full_name() or obj.recruiter.username
    recruiter_name.short_description = 'Recruteur'
    
    def search_query_truncated(self, obj):
        if len(obj.search_query) > 50:
            return f"{obj.search_query[:47]}..."
        return obj.search_query or "(Recherche vide)"
    search_query_truncated.short_description = 'Requête'
    
    def has_filters(self, obj):
        filter_count = len([k for k, v in obj.search_filters.items() if v])
        if filter_count > 0:
            return f"✅ ({filter_count} filtres)"
        return "❌"
    has_filters.short_description = 'Filtres'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recruiter')


# Actions personnalisées pour l'admin
def export_recruiter_activity(modeladmin, request, queryset):
    """Exporter l'activité des recruteurs sélectionnés"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="recruiter_activity_{timezone.now().strftime("%Y%m%d")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Recruteur', 'Entreprise', 'Email', 'Profils vus', 'Vidéos vues', 'CV téléchargés', 'Favoris'])
    
    for recruiter in queryset:
        profile_views = ProfileViewLog.objects.filter(recruiter=recruiter.user).count()
        video_views = CandidateInteraction.objects.filter(
            recruiter=recruiter.user, 
            interaction_type='video_view'
        ).count()
        cv_downloads = CandidateInteraction.objects.filter(
            recruiter=recruiter.user,
            interaction_type='cv_download'
        ).count()
        favorites = RecruiterFavorite.objects.filter(recruiter=recruiter.user).count()
        
        writer.writerow([
            recruiter.user.get_full_name() or recruiter.user.username,
            recruiter.company_name,
            recruiter.user.email,
            profile_views,
            video_views,
            cv_downloads,
            favorites
        ])
    
    return response

export_recruiter_activity.short_description = "Exporter l'activité des recruteurs sélectionnés"


def generate_recruiter_report(modeladmin, request, queryset):
    """Générer un rapport d'activité détaillé"""
    reports = []
    for recruiter in queryset:
        # Statistiques des 30 derniers jours
        last_30_days = timezone.now() - timedelta(days=30)
        
        recent_profile_views = ProfileViewLog.objects.filter(
            recruiter=recruiter.user,
            viewed_at__gte=last_30_days
        ).count()
        
        recent_video_views = CandidateInteraction.objects.filter(
            recruiter=recruiter.user,
            interaction_type='video_view',
            interaction_date__gte=last_30_days
        ).count()
        
        total_favorites = RecruiterFavorite.objects.filter(recruiter=recruiter.user).count()
        
        # Candidats les plus consultés
        top_candidates = CandidateInteraction.objects.filter(
            recruiter=recruiter.user
        ).values(
            'candidate__first_name', 
            'candidate__last_name'
        ).annotate(
            interaction_count=Count('id')
        ).order_by('-interaction_count')[:5]
        
        reports.append({
            'recruiter': recruiter,
            'recent_profile_views': recent_profile_views,
            'recent_video_views': recent_video_views,
            'total_favorites': total_favorites,
            'top_candidates': top_candidates
        })
    
    # Message de confirmation
    messages.success(request, f"Rapport généré pour {len(reports)} recruteur(s)")

generate_recruiter_report.short_description = "Générer un rapport d'activité détaillé"


# Ajouter les actions aux admins appropriés
RecruiterProfileAdmin.actions = [export_recruiter_activity, generate_recruiter_report]
CandidateInteractionAdmin.actions = [export_recruiter_activity]


# Statistiques personnalisées pour l'admin
def get_recruiter_stats():
    """Obtenir des statistiques pour l'interface admin"""
    today = timezone.now().date()
    last_week = today - timedelta(days=7)
    
    stats = {
        'total_recruiters': RecruiterProfile.objects.filter(is_active=True).count(),
        'active_recruiters_week': ProfileViewLog.objects.filter(
            viewed_at__date__gte=last_week
        ).values('recruiter').distinct().count(),
        'total_profile_views': ProfileViewLog.objects.count(),
        'profile_views_week': ProfileViewLog.objects.filter(
            viewed_at__date__gte=last_week
        ).count(),
        'total_video_views': CandidateInteraction.objects.filter(
            interaction_type='video_view'
        ).count(),
        'video_views_week': CandidateInteraction.objects.filter(
            interaction_type='video_view',
            interaction_date__date__gte=last_week
        ).count(),
        'total_favorites': RecruiterFavorite.objects.count(),
        'cv_downloads_week': CandidateInteraction.objects.filter(
            interaction_type='cv_download',
            interaction_date__date__gte=last_week
        ).count()
    }
    
    return stats


# Widget personnalisé pour l'affichage des statistiques dans l'admin
class RecruiterStatsWidget:
    """Widget pour afficher les statistiques recruteur dans l'admin"""
    
    def __init__(self):
        self.stats = get_recruiter_stats()
    
    def render(self):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1B73E8; margin-top: 0;">📊 Statistiques Recruteurs</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #28a745;">
                        <strong>👥 Recruteurs actifs:</strong><br>
                        {active_recruiters} / {total_recruiters}
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #1B73E8;">
                        <strong>👁️ Vues profils (7j):</strong><br>
                        {profile_views_week} ({total_profile_views} total)
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #6f42c1;">
                        <strong>🎥 Vues vidéos (7j):</strong><br>
                        {video_views_week} ({total_video_views} total)
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #fd7e14;">
                        <strong>📄 Téléchargements CV (7j):</strong><br>
                        {cv_downloads_week}
                    </div>
                </div>
            </div>
            """,
            active_recruiters=self.stats['active_recruiters_week'],
            total_recruiters=self.stats['total_recruiters'],
            profile_views_week=self.stats['profile_views_week'],
            total_profile_views=self.stats['total_profile_views'],
            video_views_week=self.stats['video_views_week'],
            total_video_views=self.stats['total_video_views'],
            cv_downloads_week=self.stats['cv_downloads_week']
        )


# Configuration personnalisée de l'admin pour le module recruteur
from django.contrib.admin import AdminSite

class RecruiterAdminSite(AdminSite):
    """Site d'administration personnalisé pour les recruteurs"""
    site_header = 'JOBGATE - Administration Recruteurs'
    site_title = 'JOBGATE Recruiter Admin'
    index_title = 'Tableau de bord Recruteurs'
    
    def index(self, request, extra_context=None):
        """Page d'accueil personnalisée avec statistiques"""
        extra_context = extra_context or {}
        
        # Ajouter les statistiques au contexte
        try:
            stats_widget = RecruiterStatsWidget()
            extra_context['recruiter_stats'] = stats_widget.render()
        except Exception as e:
            # En cas d'erreur, ne pas bloquer l'admin
            pass
        
        return super().index(request, extra_context)


# Instance personnalisée optionnelle
recruiter_admin_site = RecruiterAdminSite(name='recruiter_admin')

# Enregistrement optionnel sur le site personnalisé
# recruiter_admin_site.register(RecruiterProfile, RecruiterProfileAdmin)
# recruiter_admin_site.register(ProfileViewLog, ProfileViewLogAdmin)
# recruiter_admin_site.register(CandidateInteraction, CandidateInteractionAdmin)
# recruiter_admin_site.register(RecruiterFavorite, RecruiterFavoriteAdmin)
# recruiter_admin_site.register(RecruiterSearchHistory, RecruiterSearchHistoryAdmin)