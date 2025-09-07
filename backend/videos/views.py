from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
import json

from .models import Video, QualityCheck, RecordingSession, VideoAnalytics
from .serializers import (
    VideoListSerializer, VideoDetailSerializer, VideoCreateSerializer,
    QualityCheckSerializer, QualityCheckCreateSerializer,
    RecordingSessionSerializer, RecordingSessionCreateSerializer,
    VideoAnalyticsSerializer
)


class VideoViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion complète des vidéos
    Compatible avec le frontend React VideoStudio + intégration candidat
    """
    queryset = Video.objects.all()
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [permissions.AllowAny]  # Pour le développement
    
    def get_serializer_class(self):
        """Choisir le bon serializer selon l'action"""
        if self.action == 'list':
            return VideoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VideoCreateSerializer
        else:
            return VideoDetailSerializer
    
    def get_queryset(self):
        """Filtrer par utilisateur si spécifié"""
        queryset = Video.objects.all()
        user_id = self.request.query_params.get('user_id', None)
        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)
        return queryset.select_related('user').prefetch_related(
            'quality_checks', 'recording_session', 'analytics'
        )
    
    def perform_create(self, serializer):
        """Associer la vidéo à l'utilisateur courant ou demo"""
        user_id = self.request.data.get('user_id', 1)  # User ID 1 par défaut pour demo
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            # Créer un utilisateur demo si nécessaire
            user, created = User.objects.get_or_create(
                username='demo-user',
                defaults={
                    'first_name': 'Demo',
                    'last_name': 'User',
                    'email': 'demo@jobgate.ma'
                }
            )
        
        video = serializer.save(user=user)
        
        # Créer les analytics associés
        VideoAnalytics.objects.create(video=video)
    
    @action(detail=True, methods=['post'])
    def start_recording(self, request, pk=None):
        """Démarrer une session d'enregistrement"""
        video = self.get_object()
        
        # Créer une session d'enregistrement
        session_data = {
            'video': video.id,
            'device_settings': request.data.get('device_settings', {}),
            'instructions_shown': request.data.get('instructions_shown', [])
        }
        
        serializer = RecordingSessionCreateSerializer(
            data=session_data,
            context={'request': request}
        )
        if serializer.is_valid():
            session = serializer.save(user=video.user)
            video.status = 'processing'
            video.save()
            
            return Response({
                'message': 'Recording session started',
                'session_id': session.id,
                'video_status': video.status
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def stop_recording(self, request, pk=None):
        """Arrêter une session d'enregistrement"""
        video = self.get_object()
        
        try:
            session = video.recording_session
            session.ended_at = request.data.get('ended_at')
            session.duration_seconds = request.data.get('duration_seconds')
            session.instructions_completed = request.data.get('instructions_completed', [])
            session.save()
            
            video.status = 'completed'
            video.recorded_at = session.ended_at
            video.save()
            
            return Response({
                'message': 'Recording session completed',
                'video_status': video.status,
                'duration': session.duration_seconds
            })
        except RecordingSession.DoesNotExist:
            return Response(
                {'error': 'No active recording session'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver une vidéo pour utilisation"""
        video = self.get_object()
        video.is_approved = True
        video.status = 'completed'
        video.save()
        
        return Response({
            'message': 'Video approved successfully',
            'is_approved': video.is_approved
        })
    
    @action(detail=True, methods=['post'])
    def link_to_cv(self, request, pk=None):
        """Lier la vidéo au CV du candidat - VERSION INTÉGRÉE"""
        video = self.get_object()
        
        try:
            # Récupérer ou créer le profil candidat
            from candidate.models import CandidateProfile, CVVideoSyncLog
            candidate_profile, created = CandidateProfile.objects.get_or_create(
                user=video.user,
                defaults={
                    'first_name': video.user.first_name or 'Candidat',
                    'last_name': video.user.last_name or 'Demo',
                }
            )
            
            # Vérifier que la vidéo est approuvée
            if not video.is_approved:
                video.is_approved = True  # Auto-approuver pour le demo
            
            # Lier la vidéo au profil candidat
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
                notes=f'Vidéo {video.title} liée automatiquement au profil candidat'
            )
            
            return Response({
                'message': 'Vidéo liée au profil candidat avec succès !',
                'linked_to_cv': video.linked_to_cv,
                'candidate_profile_id': candidate_profile.id,
                'profile_completeness': candidate_profile.profile_completeness,
                'video_quality_score': video.overall_quality_score
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la liaison: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QualityCheckViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les tests qualité
    Compatible avec le composant QualityChecker
    """
    queryset = QualityCheck.objects.all()
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QualityCheckCreateSerializer
        return QualityCheckSerializer
    
    def get_queryset(self):
        """Filtrer par vidéo si spécifié"""
        queryset = QualityCheck.objects.all()
        video_id = self.request.query_params.get('video_id', None)
        if video_id is not None:
            queryset = queryset.filter(video_id=video_id)
        return queryset.select_related('video', 'user')
    
    @action(detail=False, methods=['post'])
    def batch_update(self, request):
        """Mettre à jour plusieurs tests qualité en une fois"""
        video_id = request.data.get('video_id')
        quality_data = request.data.get('quality_checks', {})
        
        if not video_id:
            return Response(
                {'error': 'video_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            video = Video.objects.get(id=video_id)
        except Video.DoesNotExist:
            return Response(
                {'error': 'Video not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        updated_checks = []
        
        for check_type, data in quality_data.items():
            if check_type in ['face', 'lighting', 'audio', 'positioning']:
                check_data = {
                    'video': video.id,
                    'check_type': check_type,
                    'status': data.get('status', 'checking'),
                    'score': data.get('score', 0),
                    'message': data.get('message', ''),
                    'technical_details': data.get('technical_details', {})
                }
                
                serializer = QualityCheckCreateSerializer(
                    data=check_data,
                    context={'request': request}
                )
                if serializer.is_valid():
                    quality_check = serializer.save(user=video.user)
                    updated_checks.append(QualityCheckSerializer(quality_check).data)
        
        # Recalculer le score global
        video.refresh_from_db()
        
        return Response({
            'message': 'Quality checks updated successfully',
            'updated_checks': updated_checks,
            'overall_score': video.overall_quality_score,
            'is_ready': video.is_ready_for_recording
        })


class RecordingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les sessions d'enregistrement"""
    queryset = RecordingSession.objects.all()
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RecordingSessionCreateSerializer
        return RecordingSessionSerializer
    
    def get_queryset(self):
        queryset = RecordingSession.objects.all()
        video_id = self.request.query_params.get('video_id', None)
        if video_id is not None:
            queryset = queryset.filter(video_id=video_id)
        return queryset.select_related('video', 'user')


# Vues fonctionnelles pour des endpoints spécifiques
@csrf_exempt
def video_upload(request):
    """
    Endpoint spécialisé pour l'upload de vidéos
    Compatible avec l'upload depuis React
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        # Récupérer les données
        title = request.POST.get('title', 'Vidéo de présentation')
        user_id = request.POST.get('user_id', 1)
        video_file = request.FILES.get('video_file')
        
        if not video_file:
            return JsonResponse({'error': 'No video file provided'}, status=400)
        
        # Créer l'utilisateur demo si nécessaire
        user, created = User.objects.get_or_create(
            id=user_id,
            defaults={
                'username': f'user-{user_id}',
                'first_name': 'Demo',
                'last_name': 'User'
            }
        )
        
        # Créer la vidéo
        video = Video.objects.create(
            user=user,
            title=title,
            video_file=video_file,
            status='processing',
            file_size=video_file.size
        )
        
        # Créer les analytics
        VideoAnalytics.objects.create(video=video)
        
        return JsonResponse({
            'message': 'Video uploaded successfully',
            'video_id': video.id,
            'video_url': video.video_file.url if video.video_file else None
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt  
def quality_analysis(request):
    """
    Endpoint pour l'analyse qualité en temps réel
    Compatible avec le composant QualityChecker
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        video_id = data.get('video_id')
        analysis_data = data.get('analysis', {})
        
        if video_id:
            video = get_object_or_404(Video, id=video_id)
            
            # Calculer score global
            scores = []
            for check_type, check_data in analysis_data.items():
                if 'score' in check_data:
                    scores.append(check_data['score'])
            
            overall_score = sum(scores) / len(scores) if scores else 0
            
            return JsonResponse({
                'overall_score': round(overall_score),
                'is_ready': overall_score >= 80,
                'analysis': analysis_data
            })
        
        return JsonResponse({'error': 'video_id required'}, status=400)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)