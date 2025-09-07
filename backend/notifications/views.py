from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q, Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .models import Notification, NotificationPreference, NotificationTemplate
from .serializers import (
    NotificationSerializer, NotificationPreferenceSerializer,
    NotificationTemplateSerializer
)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des notifications utilisateur
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]  # Pour le développement
    
    def get_queryset(self):
        """Filtrer les notifications par utilisateur"""
        user_id = self.request.query_params.get('user_id')
        if not user_id:
            return Notification.objects.none()
        
        try:
            user = User.objects.get(id=user_id)
            queryset = Notification.objects.filter(recipient=user)
            
            # Filtres optionnels
            is_read = self.request.query_params.get('is_read')
            if is_read is not None:
                queryset = queryset.filter(is_read=is_read.lower() == 'true')
            
            notification_type = self.request.query_params.get('type')
            if notification_type:
                queryset = queryset.filter(notification_type=notification_type)
            
            priority = self.request.query_params.get('priority')
            if priority:
                queryset = queryset.filter(priority=priority)
            
            return queryset.select_related('sender')
            
        except User.DoesNotExist:
            return Notification.objects.none()
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({
            'message': 'Notification marquée comme lue',
            'is_read': notification.is_read,
            'read_at': notification.read_at
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Marquer une notification comme non lue"""
        notification = self.get_object()
        notification.mark_as_unread()
        
        return Response({
            'message': 'Notification marquée comme non lue',
            'is_read': notification.is_read
        })
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archiver une notification"""
        notification = self.get_object()
        notification.archive()
        
        return Response({
            'message': 'Notification archivée',
            'is_archived': notification.is_archived
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marquer toutes les notifications comme lues pour un utilisateur"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            notifications = Notification.objects.filter(recipient=user, is_read=False)
            
            count = notifications.count()
            notifications.update(is_read=True, read_at=timezone.now())
            
            return Response({
                'message': f'{count} notifications marquées comme lues',
                'count': count
            })
            
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Obtenir le nombre de notifications non lues"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            count = Notification.objects.unread_for_user(user).count()
            
            return Response({'unread_count': count})
            
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Obtenir un résumé des notifications pour un utilisateur"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Statistiques générales
            total = Notification.objects.filter(recipient=user).count()
            unread = Notification.objects.unread_for_user(user).count()
            recent = Notification.objects.recent_for_user(user, days=7).count()
            
            # Par type
            by_type = Notification.objects.filter(recipient=user).values(
                'notification_type'
            ).annotate(count=Count('id')).order_by('-count')
            
            # Par priorité
            by_priority = Notification.objects.filter(recipient=user).values(
                'priority'
            ).annotate(count=Count('id')).order_by('-count')
            
            return Response({
                'total': total,
                'unread': unread,
                'recent_7_days': recent,
                'by_type': list(by_type),
                'by_priority': list(by_priority)
            })
            
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet pour les préférences de notification"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return NotificationPreference.objects.filter(user_id=user_id)
        return NotificationPreference.objects.none()


# Vues fonctionnelles pour des endpoints spécifiques
@csrf_exempt
def create_notification(request):
    """
    Créer une notification via API simple
    Utilisé par les autres services JOBGATE
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        required_fields = ['recipient_id', 'notification_type', 'title', 'message']
        for field in required_fields:
            if field not in data:
                return JsonResponse({'error': f'{field} requis'}, status=400)
        
        # Récupérer l'utilisateur destinataire
        try:
            recipient = User.objects.get(id=data['recipient_id'])
        except User.DoesNotExist:
            return JsonResponse({'error': 'Utilisateur destinataire introuvable'}, status=404)
        
        # Récupérer l'expéditeur si spécifié
        sender = None
        if 'sender_id' in data:
            try:
                sender = User.objects.get(id=data['sender_id'])
            except User.DoesNotExist:
                pass
        
        # Créer la notification
        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=data['notification_type'],
            title=data['title'],
            message=data['message'],
            priority=data.get('priority', 'normal'),
            related_object_type=data.get('related_object_type', ''),
            related_object_id=data.get('related_object_id'),
            extra_data=data.get('extra_data', {}),
            action_url=data.get('action_url', ''),
            action_text=data.get('action_text', '')
        )
        
        return JsonResponse({
            'message': 'Notification créée avec succès',
            'notification_id': notification.id,
            'notification': notification.to_dict()
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def bulk_create_notifications(request):
    """
    Créer plusieurs notifications en une fois
    Utile pour les notifications de masse
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        notifications_data = data.get('notifications', [])
        
        if not notifications_data:
            return JsonResponse({'error': 'Liste de notifications requise'}, status=400)
        
        created_notifications = []
        errors = []
        
        for i, notif_data in enumerate(notifications_data):
            try:
                # Vérifier les champs requis
                if 'recipient_id' not in notif_data:
                    errors.append(f"Notification {i}: recipient_id requis")
                    continue
                
                recipient = User.objects.get(id=notif_data['recipient_id'])
                sender = None
                if 'sender_id' in notif_data:
                    sender = User.objects.get(id=notif_data['sender_id'])
                
                notification = Notification.objects.create(
                    recipient=recipient,
                    sender=sender,
                    notification_type=notif_data.get('notification_type', 'system_update'),
                    title=notif_data.get('title', 'Notification'),
                    message=notif_data.get('message', ''),
                    priority=notif_data.get('priority', 'normal'),
                    related_object_type=notif_data.get('related_object_type', ''),
                    related_object_id=notif_data.get('related_object_id'),
                    extra_data=notif_data.get('extra_data', {}),
                    action_url=notif_data.get('action_url', ''),
                    action_text=notif_data.get('action_text', '')
                )
                
                created_notifications.append(notification.id)
                
            except User.DoesNotExist:
                errors.append(f"Notification {i}: Utilisateur introuvable")
            except Exception as e:
                errors.append(f"Notification {i}: {str(e)}")
        
        return JsonResponse({
            'message': f'{len(created_notifications)} notifications créées',
            'created_count': len(created_notifications),
            'created_ids': created_notifications,
            'errors': errors
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def notification_stats(request, user_id):
    """
    Obtenir les statistiques de notifications pour un utilisateur
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Statistiques de base
        total = Notification.objects.filter(recipient=user).count()
        unread = Notification.objects.unread_for_user(user).count()
        today = Notification.objects.filter(
            recipient=user,
            created_at__date=timezone.now().date()
        ).count()
        this_week = Notification.objects.recent_for_user(user, days=7).count()
        
        # Notifications récentes par type
        recent_by_type = Notification.objects.recent_for_user(user, days=30).values(
            'notification_type'
        ).annotate(count=Count('id')).order_by('-count')[:5]
        
        # Notifications non lues par priorité
        unread_by_priority = Notification.objects.unread_for_user(user).values(
            'priority'
        ).annotate(count=Count('id'))
        
        return JsonResponse({
            'user_id': user_id,
            'stats': {
                'total': total,
                'unread': unread,
                'today': today,
                'this_week': this_week
            },
            'recent_by_type': list(recent_by_type),
            'unread_by_priority': list(unread_by_priority),
            'last_updated': timezone.now().isoformat()
        })
        
    except User.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur introuvable'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)