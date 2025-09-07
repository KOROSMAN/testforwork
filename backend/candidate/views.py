from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from .models import CandidateProfile, VideoViewLog, CVVideoSyncLog
from .serializers import (
    CandidateProfileListSerializer, CandidateProfileDetailSerializer,
    CandidateProfileUpdateSerializer, VideoViewLogSerializer,
    VideoViewLogCreateSerializer, CVVideoSyncLogSerializer,
    VideoLinkRequestSerializer
)
from videos.models import Video


class CandidateProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des profils candidats avec intégration vidéo
    """
    queryset = CandidateProfile.objects.all()
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [permissions.AllowAny]  # Pour le développement
    
    def get_serializer_class(self):
        """Choisir le bon serializer selon l'action"""
        if self.action == 'list':
            return CandidateProfileListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CandidateProfileUpdateSerializer
        else:
            return CandidateProfileDetailSerializer
    
    def get_queryset(self):
        """Filtrer et optimiser les requêtes"""
        queryset = CandidateProfile.objects.select_related(
            'user', 'presentation_video'
        ).prefetch_related('presentation_video__quality_checks')
        
        # Filtres pour les recruteurs
        has_video = self.request.query_params.get('has_video', None)
        if has_video is not None:
            if has_video.lower() == 'true':
                queryset = queryset.filter(presentation_video__isnull=False)
            else:
                queryset = queryset.filter(presentation_video__isnull=True)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filtre par score qualité vidéo
        min_video_score = self.request.query_params.get('min_video_score', None)
        if min_video_score:
            try:
                queryset = queryset.filter(video_quality_score__gte=int(min_video_score))
            except ValueError:
                pass
        
        # Filtre par complétude profil
        min_completeness = self.request.query_params.get('min_completeness', None)
        if min_completeness:
            try:
                queryset = queryset.filter(profile_completeness__gte=int(min_completeness))
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def link_video(self, request, pk=None):
        """Lier une vidéo au profil candidat"""
        candidate_profile = self.get_object()
        serializer = VideoLinkRequestSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            video_id = serializer.validated_data['video_id']
            video = get_object_or_404(Video, id=video_id)
            
            # Vérifier que l'utilisateur peut lier cette vidéo
            if video.user != candidate_profile.user:
                return Response(
                    {'error': 'Vous ne pouvez lier que vos propres vidéos'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Lier la vidéo au profil
            candidate_profile.update_video_link(video)
            
            # Marquer la vidéo comme liée au CV
            video.linked_to_cv = True
            video.cv_update_suggested = False
            video.save()
            
            # Créer un log de synchronisation
            CVVideoSyncLog.objects.create(
                candidate_profile=candidate_profile,
                action='video_linked',
                video_version=f"Video-{video.id}",
                sync_completed=True,
                sync_date=timezone.now(),
                notes=f'Vidéo {video.title} liée au profil candidat'
            )
            
            return Response({
                'message': 'Vidéo liée au profil avec succès',
                'profile_completeness': candidate_profile.profile_completeness,
                'video_id': video.id,
                'video_quality_score': video.overall_quality_score
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def unlink_video(self, request, pk=None):
        """Délier une vidéo du profil candidat"""
        candidate_profile = self.get_object()
        
        if not candidate_profile.presentation_video:
            return Response(
                {'error': 'Aucune vidéo liée à ce profil'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video = candidate_profile.presentation_video
        video.linked_to_cv = False
        video.save()
        
        candidate_profile.presentation_video = None
        candidate_profile.video_last_updated = None
        candidate_profile.video_linked_at = None
        candidate_profile.video_quality_score = 0
        candidate_profile.save()
        
        # Recalculer la complétude
        candidate_profile.calculate_profile_completeness()
        
        # Log de synchronisation
        CVVideoSyncLog.objects.create(
            candidate_profile=candidate_profile,
            action='video_unlinked',
            sync_completed=True,
            sync_date=timezone.now(),
            notes='Vidéo dissociée du profil candidat'
        )
        
        return Response({'message': 'Vidéo dissociée du profil avec succès'})
    
    @action(detail=True, methods=['get'])
    def video_stats(self, request, pk=None):
        """Statistiques de consultation de la vidéo du candidat"""
        candidate_profile = self.get_object()
        
        if not candidate_profile.presentation_video:
            return Response({'error': 'Aucune vidéo liée à ce profil'})
        
        video = candidate_profile.presentation_video
        view_logs = VideoViewLog.objects.filter(video=video)
        
        stats = {
            'total_views': view_logs.count(),
            'unique_viewers': view_logs.values('viewer').distinct().count(),
            'completed_views': view_logs.filter(completed_viewing=True).count(),
            'average_rating': view_logs.filter(rating__isnull=False).aggregate(
                avg_rating=Avg('rating')
            )['avg_rating'],
            'recent_views': view_logs.filter(
                viewed_at__gte=timezone.now() - timezone.timedelta(days=30)
            ).count()
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Recherche avancée de candidats pour les recruteurs"""
        queryset = self.get_queryset()
        
        # Recherche textuelle
        search_query = request.query_params.get('q', '')
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(university__icontains=search_query) |
                Q(major__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )
        
        # Tri
        order_by = request.query_params.get('order_by', '-updated_at')
        valid_orders = [
            'created_at', '-created_at', 'updated_at', '-updated_at',
            'profile_completeness', '-profile_completeness',
            'video_quality_score', '-video_quality_score'
        ]
        if order_by in valid_orders:
            queryset = queryset.order_by(order_by)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class VideoViewLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les consultations de vidéos par les recruteurs
    """
    queryset = VideoViewLog.objects.all()
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VideoViewLogCreateSerializer
        return VideoViewLogSerializer
    
    def get_queryset(self):
        queryset = VideoViewLog.objects.select_related(
            'viewer', 'candidate_profile', 'video'
        )
        
        # Filtres
        video_id = self.request.query_params.get('video_id', None)
        if video_id:
            queryset = queryset.filter(video_id=video_id)
        
        candidate_id = self.request.query_params.get('candidate_id', None)
        if candidate_id:
            queryset = queryset.filter(candidate_profile_id=candidate_id)
        
        viewer_id = self.request.query_params.get('viewer_id', None)
        if viewer_id:
            queryset = queryset.filter(viewer_id=viewer_id)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def log_view(self, request):
        """Enregistrer qu'un recruteur a consulté une vidéo"""
        serializer = VideoViewLogCreateSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            view_log = serializer.save()
            
            # Mettre à jour les analytics de la vidéo
            video = view_log.video
            if hasattr(video, 'analytics'):
                video.analytics.view_count += 1
                video.analytics.save()
            
            return Response({
                'message': 'Consultation enregistrée',
                'view_log_id': view_log.id
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CVVideoSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les logs de synchronisation CV-Vidéo
    """
    queryset = CVVideoSyncLog.objects.all()
    serializer_class = CVVideoSyncLogSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = CVVideoSyncLog.objects.select_related('candidate_profile')
        
        candidate_id = self.request.query_params.get('candidate_id', None)
        if candidate_id:
            queryset = queryset.filter(candidate_profile_id=candidate_id)
        
        sync_needed = self.request.query_params.get('sync_needed', None)
        if sync_needed is not None:
            queryset = queryset.filter(sync_needed=sync_needed.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pending_syncs(self, request):
        """Obtenir les synchronisations en attente"""
        pending = self.get_queryset().filter(
            sync_needed=True,
            sync_completed=False
        )
        
        serializer = self.get_serializer(pending, many=True)
        return Response({
            'count': pending.count(),
            'results': serializer.data
        })


# Vues fonctionnelles pour des endpoints spécifiques
@csrf_exempt
@require_http_methods(["POST"])
def quick_video_link(request):
    """
    Endpoint rapide pour lier une vidéo à un profil candidat
    Utilisé par le composant VideoStudio
    """
    try:
        data = json.loads(request.body)
        video_id = data.get('video_id')
        user_id = data.get('user_id')
        
        if not video_id or not user_id:
            return JsonResponse({'error': 'video_id et user_id requis'}, status=400)
        
        # Récupérer l'utilisateur et son profil candidat
        try:
            user = User.objects.get(id=user_id)
            candidate_profile, created = CandidateProfile.objects.get_or_create(
                user=user,
                defaults={
                    'first_name': user.first_name or 'Demo',
                    'last_name': user.last_name or 'User',
                }
            )
        except User.DoesNotExist:
            return JsonResponse({'error': 'Utilisateur introuvable'}, status=404)
        
        # Récupérer la vidéo
        try:
            video = Video.objects.get(id=video_id, user=user)
        except Video.DoesNotExist:
            return JsonResponse({'error': 'Vidéo introuvable'}, status=404)
        
        # Lier la vidéo au profil
        candidate_profile.update_video_link(video)
        
        # Marquer la vidéo comme liée
        video.linked_to_cv = True
        video.cv_update_suggested = False
        video.save()
        
        # Créer un log de synchronisation
        CVVideoSyncLog.objects.create(
            candidate_profile=candidate_profile,
            action='video_linked',
            video_version=f"Video-{video.id}",
            sync_completed=True,
            sync_date=timezone.now(),
            notes=f'Liaison rapide: {video.title} → Profil {candidate_profile.full_name}'
        )
        
        return JsonResponse({
            'message': 'Vidéo liée au profil candidat avec succès',
            'candidate_profile_id': candidate_profile.id,
            'profile_completeness': candidate_profile.profile_completeness,
            'video_quality_score': video.overall_quality_score,
            'video_url': video.video_file.url if video.video_file else None
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt 
@require_http_methods(["GET"])
def candidate_dashboard_stats(request, candidate_id):
    """
    Statistiques pour le dashboard candidat
    """
    try:
        candidate_profile = CandidateProfile.objects.get(id=candidate_id)
        
        stats = {
            'profile_completeness': candidate_profile.profile_completeness,
            'has_video': candidate_profile.has_presentation_video,
            'video_quality_score': candidate_profile.video_quality_score,
            'video_views': 0,
            'profile_views': 0,
            'cv_last_updated': candidate_profile.cv_last_updated.isoformat() if candidate_profile.cv_last_updated else None,
            'video_last_updated': candidate_profile.video_last_updated.isoformat() if candidate_profile.video_last_updated else None,
            'sync_needed': False
        }
        
        # Statistiques vidéo si disponible
        if candidate_profile.presentation_video:
            video_views = VideoViewLog.objects.filter(
                candidate_profile=candidate_profile
            )
            stats['video_views'] = video_views.count()
            stats['video_unique_viewers'] = video_views.values('viewer').distinct().count()
            
            # Vérifier si une sync est nécessaire
            recent_sync_logs = CVVideoSyncLog.objects.filter(
                candidate_profile=candidate_profile,
                sync_needed=True,
                sync_completed=False
            ).exists()
            stats['sync_needed'] = recent_sync_logs
        
        return JsonResponse(stats)
        
    except CandidateProfile.DoesNotExist:
        return JsonResponse({'error': 'Profil candidat introuvable'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)