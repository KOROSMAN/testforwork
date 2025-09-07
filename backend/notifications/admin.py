from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count
from .models import Notification, NotificationPreference, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title_truncated',
        'recipient_name',
        'notification_type_display',
        'priority_display',
        'status_display',
        'created_at'
    ]
    list_filter = [
        'notification_type',
        'priority',
        'is_read',
        'is_archived',
        'created_at'
    ]
    search_fields = [
        'title',
        'message',
        'recipient__username',
        'recipient__email',
        'sender__username'
    ]
    readonly_fields = [
        'created_at',
        'read_at',
        'is_expired'
    ]
    
    fieldsets = (
        ('Contenu de la notification', {
            'fields': (
                'recipient',
                'sender',
                'title',
                'message',
                'notification_type',
                'priority'
            )
        }),
        ('Liaison et actions', {
            'fields': (
                'related_object_type',
                'related_object_id',
                'action_url',
                'action_text'
            )
        }),
        ('Statut', {
            'fields': (
                'is_read',
                'is_archived',
                'read_at',
                'expires_at'
            )
        }),
        ('Données supplémentaires', {
            'fields': ('extra_data',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': (
                'created_at',
                'is_expired'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def title_truncated(self, obj):
        """Titre tronqué pour la liste"""
        if len(obj.title) > 50:
            return f"{obj.title[:47]}..."
        return obj.title
    title_truncated.short_description = 'Titre'
    
    def recipient_name(self, obj):
        """Nom du destinataire"""
        return obj.recipient.get_full_name() or obj.recipient.username
    recipient_name.short_description = 'Destinataire'
    
    def notification_type_display(self, obj):
        """Type de notification avec emoji"""
        type_icons = {
            'video_linked': '🎥 Vidéo liée',
            'video_viewed': '👁️ Vidéo vue',
            'video_approved': '✅ Vidéo approuvée',
            'sync_needed': '🔄 Sync requise',
            'profile_complete': '🎉 Profil complet',
            'profile_viewed': '👀 Profil consulté',
            'cv_updated': '📄 CV mis à jour',
            'job_match': '🎯 Offre correspondante',
            'interview_request': '📞 Demande entretien',
            'system_update': '⚙️ Système',
            'welcome': '👋 Bienvenue'
        }
        return type_icons.get(obj.notification_type, obj.notification_type)
    notification_type_display.short_description = 'Type'
    
    def priority_display(self, obj):
        """Priorité avec couleurs"""
        colors = {
            'low': '#6c757d',
            'normal': '#17a2b8',
            'high': '#ffc107',
            'urgent': '#dc3545'
        }
        
        icons = {
            'low': '📝',
            'normal': '📬',
            'high': '⚠️',
            'urgent': '🚨'
        }
        
        color = colors.get(obj.priority, '#17a2b8')
        icon = icons.get(obj.priority, '📬')
        
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_priority_display()
        )
    priority_display.short_description = 'Priorité'
    
    def status_display(self, obj):
        """Statut avec indicateurs visuels"""
        if obj.is_archived:
            return format_html('<span style="color: #6c757d;">📁 Archivée</span>')
        elif obj.is_read:
            return format_html('<span style="color: #28a745;">✅ Lue</span>')
        else:
            return format_html('<span style="color: #ffc107;">📬 Non lue</span>')
    status_display.short_description = 'Statut'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient', 'sender')
    
    actions = ['mark_as_read', 'mark_as_unread', 'archive_notifications']
    
    def mark_as_read(self, request, queryset):
        """Marquer comme lues"""
        from django.utils import timezone
        updated = queryset.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        self.message_user(
            request,
            f"{updated} notification(s) marquée(s) comme lue(s)."
        )
    mark_as_read.short_description = "Marquer les notifications sélectionnées comme lues"
    
    def mark_as_unread(self, request, queryset):
        """Marquer comme non lues"""
        updated = queryset.filter(is_read=True).update(
            is_read=False,
            read_at=None
        )
        self.message_user(
            request,
            f"{updated} notification(s) marquée(s) comme non lue(s)."
        )
    mark_as_unread.short_description = "Marquer les notifications sélectionnées comme non lues"
    
    def archive_notifications(self, request, queryset):
        """Archiver les notifications"""
        updated = queryset.update(is_archived=True)
        self.message_user(
            request,
            f"{updated} notification(s) archivée(s)."
        )
    archive_notifications.short_description = "Archiver les notifications sélectionnées"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user_name',
        'email_enabled',
        'push_enabled',
        'video_notifications_enabled',
        'updated_at'
    ]
    list_filter = [
        'email_notifications',
        'push_notifications',
        'notify_video_viewed',
        'notify_video_approved',
        'daily_digest',
        'weekly_summary'
    ]
    search_fields = [
        'user__username',
        'user__email',
        'user__first_name',
        'user__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Canaux de notification', {
            'fields': (
                'email_notifications',
                'push_notifications',
                'sms_notifications'
            )
        }),
        ('Préférences vidéo', {
            'fields': (
                'notify_video_viewed',
                'notify_video_approved',
                'notify_sync_needed',
                'notify_profile_complete'
            )
        }),
        ('Fréquence', {
            'fields': (
                'daily_digest',
                'weekly_summary'
            )
        }),
        ('Paramètres avancés', {
            'fields': ('quiet_hours',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_name(self, obj):
        """Nom de l'utilisateur"""
        return obj.user.get_full_name() or obj.user.username
    user_name.short_description = 'Utilisateur'
    
    def email_enabled(self, obj):
        """Statut notifications email"""
        return "✅" if obj.email_notifications else "❌"
    email_enabled.short_description = 'Email'
    
    def push_enabled(self, obj):
        """Statut notifications push"""
        return "✅" if obj.push_notifications else "❌"
    push_enabled.short_description = 'Push'
    
    def video_notifications_enabled(self, obj):
        """Statut notifications vidéo"""
        enabled_count = sum([
            obj.notify_video_viewed,
            obj.notify_video_approved,
            obj.notify_sync_needed,
            obj.notify_profile_complete
        ])
        
        if enabled_count == 4:
            return format_html('<span style="color: #28a745;">✅ Toutes</span>')
        elif enabled_count > 0:
            return format_html('<span style="color: #ffc107;">⚠️ Partielles ({}/4)</span>', enabled_count)
        else:
            return format_html('<span style="color: #dc3545;">❌ Aucune</span>')
    video_notifications_enabled.short_description = 'Vidéo'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'notification_type',
        'active_status',
        'has_email_template',
        'variables_count',
        'updated_at'
    ]
    list_filter = [
        'is_active',
        'notification_type',
        'updated_at'
    ]
    search_fields = [
        'notification_type',
        'title_template',
        'message_template'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Configuration de base', {
            'fields': (
                'notification_type',
                'is_active'
            )
        }),
        ('Templates de notification', {
            'fields': (
                'title_template',
                'message_template'
            )
        }),
        ('Templates email (optionnel)', {
            'fields': (
                'email_subject_template',
                'email_body_template'
            ),
            'classes': ('collapse',)
        }),
        ('Variables disponibles', {
            'fields': ('available_variables',),
            'description': 'Variables utilisables dans les templates : {user_name}, {video_title}, etc.'
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def active_status(self, obj):
        """Statut actif avec couleur"""
        if obj.is_active:
            return format_html('<span style="color: #28a745;">✅ Actif</span>')
        else:
            return format_html('<span style="color: #dc3545;">❌ Inactif</span>')
    active_status.short_description = 'Statut'
    
    def has_email_template(self, obj):
        """Indique si le template email existe"""
        has_email = bool(obj.email_subject_template and obj.email_body_template)
        return "✅" if has_email else "❌"
    has_email_template.short_description = 'Template email'
    
    def variables_count(self, obj):
        """Nombre de variables disponibles"""
        if obj.available_variables:
            return len(obj.available_variables)
        return 0
    variables_count.short_description = 'Variables'
    
    actions = ['activate_templates', 'deactivate_templates']
    
    def activate_templates(self, request, queryset):
        """Activer les templates sélectionnés"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"{updated} template(s) activé(s)."
        )
    activate_templates.short_description = "Activer les templates sélectionnés"
    
    def deactivate_templates(self, request, queryset):
        """Désactiver les templates sélectionnés"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"{updated} template(s) désactivé(s)."
        )
    deactivate_templates.short_description = "Désactiver les templates sélectionnés"