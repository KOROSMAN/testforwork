# backend/recruiter/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from candidate.models import CandidateProfile, VideoViewLog
from candidate.serializers import CandidateProfileDetailSerializer, CandidateProfileListSerializer
from videos.models import Video
from notifications.models import create_video_viewed_notification


class RecruiterViewSet(viewsets.ViewSet):
    """
    ViewSet pour les fonctionnalités recruteur
    Accès sécurisé aux profils candidats
    """
    permission_classes = [permissions.AllowAny]  # À remplacer par une authentification recruteur
    
    @action(detail=False, methods=['get'])
    def candidate_search(self, request):
        """
        Recherche avancée de candidats pour recruteurs
        """
        # Paramètres de recherche
        search_query = request.query_params.get('q', '')
        has_video = request.query_params.get('has_video', '')
        status_filter = request.query_params.get('status', '')
        min_video_score = request.query_params.get('min_video_score', '')
        min_completeness = request.query_params.get('min_completeness', '')
        education_level = request.query_params.get('education_level', '')
        university = request.query_params.get('university', '')
        experience_min = request.query_params.get('experience_min', '')
        experience_max = request.query_params.get('experience_max', '')
        order_by = request.query_params.get('order_by', '-updated_at')
        
        # Base queryset - seulement les profils publics
        queryset = CandidateProfile.objects.filter(
            is_profile_public=True
        ).select_related('user', 'presentation_video')
        
        # Recherche textuelle
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(university__icontains=search_query) |
                Q(major__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )
        
        # Filtre vidéo
        if has_video == 'true':
            queryset = queryset.filter(
                presentation_video__isnull=False,
                presentation_video__is_approved=True
            )
        elif has_video == 'false':
            queryset = queryset.filter(presentation_video__isnull=True)
        
        # Filtre statut
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filtre niveau d'études
        if education_level:
            queryset = queryset.filter(education_level__icontains=education_level)
        
        # Filtre université
        if university:
            queryset = queryset.filter(university__icontains=university)
        
        # Filtre expérience
        if experience_min:
            try:
                queryset = queryset.filter(experience_years__gte=int(experience_min))
            except ValueError:
                pass
        
        if experience_max:
            try:
                queryset = queryset.filter(experience_years__lte=int(experience_max))
            except ValueError:
                pass
        
        # Filtre score vidéo
        if min_video_score:
            try:
                queryset = queryset.filter(video_quality_score__gte=int(min_video_score))
            except ValueError:
                pass
        
        # Filtre complétude profil
        if min_completeness:
            try:
                queryset = queryset.filter(profile_completeness__gte=int(min_completeness))
            except ValueError:
                pass
        
        # Tri
        valid_orders = [
            'created_at', '-created_at', 'updated_at', '-updated_at',
            'profile_completeness', '-profile_completeness',
            'video_quality_score', '-video_quality_score',
            'first_name', '-first_name', 'last_name', '-last_name'
        ]
        if order_by in valid_orders:
            queryset = queryset.order_by(order_by)
        
        # Sérialisation
        serializer = CandidateProfileListSerializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def candidate_detail(self, request, pk=None):
        """
        Obtenir les détails complets d'un candidat
        """
        try:
            candidate = CandidateProfile.objects.select_related(
                'user', 'presentation_video'
            ).get(id=pk, is_profile_public=True)
            
            serializer = CandidateProfileDetailSerializer(candidate)
            return Response(serializer.data)
            
        except CandidateProfile.DoesNotExist:
            return Response(
                {'error': 'Candidat introuvable ou profil privé'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def log_profile_view(self, request, pk=None):
        """
        Enregistrer qu'un recruteur a consulté un profil
        """
        try:
            candidate = CandidateProfile.objects.get(id=pk, is_profile_public=True)
            recruiter_id = request.data.get('recruiter_id', 1)  # ID du recruteur connecté
            
            # Créer un log de consultation (à adapter selon vos besoins)
            # Vous pouvez créer un modèle ProfileViewLog similaire à VideoViewLog
            
            return Response({'message': 'Consultation de profil enregistrée'})
            
        except CandidateProfile.DoesNotExist:
            return Response(
                {'error': 'Candidat introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def log_video_view(self, request, pk=None):
        """
        Enregistrer qu'un recruteur a regardé une vidéo
        """
        try:
            candidate = CandidateProfile.objects.get(id=pk, is_profile_public=True)
            
            if not candidate.presentation_video:
                return Response(
                    {'error': 'Aucune vidéo disponible pour ce candidat'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Données de visualisation
            recruiter_id = request.data.get('recruiter_id', 1)
            view_duration = request.data.get('view_duration', 0)
            completed = request.data.get('completed_viewing', False)
            rating = request.data.get('rating', None)
            notes = request.data.get('notes', '')
            
            # Créer le log de visualisation
            try:
                recruiter = User.objects.get(id=recruiter_id)
            except User.DoesNotExist:
                recruiter = User.objects.get(id=1)  # Utilisateur par défaut
            
            view_log = VideoViewLog.objects.create(
                video=candidate.presentation_video,
                viewer=recruiter,
                candidate_profile=candidate,
                view_duration=view_duration,
                completed_viewing=completed,
                rating=rating,
                notes=notes
            )
            
            # Créer une notification pour le candidat
            try:
                create_video_viewed_notification(
                    candidate_profile=candidate,
                    viewer=recruiter,
                    video=candidate.presentation_video
                )
            except Exception as e:
                print(f"Erreur notification: {e}")
            
            # Mettre à jour les analytics vidéo
            if hasattr(candidate.presentation_video, 'analytics'):
                analytics = candidate.presentation_video.analytics
                analytics.view_count = F('view_count') + 1
                analytics.save()
            
            return Response({
                'message': 'Consultation vidéo enregistrée avec succès',
                'view_log_id': view_log.id,
                'notification_sent': True
            })
            
        except CandidateProfile.DoesNotExist:
            return Response(
                {'error': 'Candidat introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Statistiques générales pour le dashboard recruteur
        """
        recruiter_id = request.query_params.get('recruiter_id', 1)
        
        # Statistiques générales
        total_candidates = CandidateProfile.objects.filter(is_profile_public=True).count()
        candidates_with_video = CandidateProfile.objects.filter(
            is_profile_public=True,
            presentation_video__isnull=False,
            presentation_video__is_approved=True
        ).count()
        
        # Candidats actifs
        active_candidates = CandidateProfile.objects.filter(
            is_profile_public=True,
            status='active'
        ).count()
        
        # Vues récentes du recruteur
        recent_views = VideoViewLog.objects.filter(
            viewer_id=recruiter_id,
            viewed_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()
        
        # Candidats par niveau d'études
        education_stats = CandidateProfile.objects.filter(
            is_profile_public=True
        ).values('education_level').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Score qualité vidéo moyen
        avg_video_quality = CandidateProfile.objects.filter(
            is_profile_public=True,
            presentation_video__isnull=False
        ).aggregate(
            avg_quality=Avg('video_quality_score')
        )['avg_quality'] or 0
        
        return Response({
            'total_candidates': total_candidates,
            'candidates_with_video': candidates_with_video,
            'active_candidates': active_candidates,
            'recent_views': recent_views,
            'education_stats': list(education_stats),
            'avg_video_quality': round(avg_video_quality, 1),
            'video_percentage': round((candidates_with_video / total_candidates * 100), 1) if total_candidates > 0 else 0
        })
    
    @action(detail=False, methods=['get'])
    def filter_options(self, request):
        """
        Obtenir les options disponibles pour les filtres
        """
        # Niveaux d'études disponibles
        education_levels = CandidateProfile.objects.filter(
            is_profile_public=True,
            education_level__isnull=False
        ).exclude(education_level='').values_list(
            'education_level', flat=True
        ).distinct().order_by('education_level')
        
        # Universités disponibles
        universities = CandidateProfile.objects.filter(
            is_profile_public=True,
            university__isnull=False
        ).exclude(university='').values_list(
            'university', flat=True
        ).distinct().order_by('university')[:20]  # Limiter à 20 pour performance
        
        # Spécialisations disponibles
        majors = CandidateProfile.objects.filter(
            is_profile_public=True,
            major__isnull=False
        ).exclude(major='').values_list(
            'major', flat=True
        ).distinct().order_by('major')[:20]
        
        return Response({
            'education_levels': list(education_levels),
            'universities': list(universities),
            'majors': list(majors),
            'status_choices': [
                {'value': 'active', 'label': 'Recherche active'},
                {'value': 'passive', 'label': 'Recherche passive'},
                {'value': 'not_available', 'label': 'Non disponible'}
            ],
            'experience_ranges': [
                {'min': 0, 'max': 1, 'label': 'Débutant (0-1 an)'},
                {'min': 1, 'max': 3, 'label': 'Junior (1-3 ans)'},
                {'min': 3, 'max': 5, 'label': 'Confirmé (3-5 ans)'},
                {'min': 5, 'max': 10, 'label': 'Senior (5-10 ans)'},
                {'min': 10, 'max': 999, 'label': 'Expert (10+ ans)'}
            ]
        })


# Vues fonctionnelles pour des endpoints spécifiques
@csrf_exempt
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def recruiter_candidate_list(request):
    """
    Endpoint simple pour obtenir la liste des candidats
    Compatible avec l'interface React
    """
    try:
        # Paramètres de recherche
        filters = {
            'q': request.GET.get('q', ''),
            'has_video': request.GET.get('has_video', ''),
            'status': request.GET.get('status', ''),
            'min_video_score': request.GET.get('min_video_score', ''),
            'min_completeness': request.GET.get('min_completeness', ''),
            'order_by': request.GET.get('order_by', '-updated_at')
        }
        
        # Base queryset
        queryset = CandidateProfile.objects.filter(
            is_profile_public=True
        ).select_related('user', 'presentation_video')
        
        # Appliquer les filtres
        if filters['q']:
            queryset = queryset.filter(
                Q(first_name__icontains=filters['q']) |
                Q(last_name__icontains=filters['q']) |
                Q(university__icontains=filters['q']) |
                Q(major__icontains=filters['q'])
            )
        
        if filters['has_video'] == 'true':
            queryset = queryset.filter(
                presentation_video__isnull=False,
                presentation_video__is_approved=True
            )
        elif filters['has_video'] == 'false':
            queryset = queryset.filter(presentation_video__isnull=True)
        
        if filters['status']:
            queryset = queryset.filter(status=filters['status'])
        
        if filters['min_video_score']:
            try:
                queryset = queryset.filter(video_quality_score__gte=int(filters['min_video_score']))
            except ValueError:
                pass
        
        if filters['min_completeness']:
            try:
                queryset = queryset.filter(profile_completeness__gte=int(filters['min_completeness']))
            except ValueError:
                pass
        
        # Tri
        valid_orders = ['-updated_at', '-video_quality_score', '-profile_completeness', '-created_at']
        if filters['order_by'] in valid_orders:
            queryset = queryset.order_by(filters['order_by'])
        
        # Limite pour performance
        queryset = queryset[:50]
        
        # Sérialiser
        serializer = CandidateProfileListSerializer(queryset, many=True)
        
        return JsonResponse({
            'results': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def recruiter_candidate_detail(request, candidate_id):
    """
    Obtenir les détails d'un candidat spécifique
    """
    try:
        candidate = CandidateProfile.objects.select_related(
            'user', 'presentation_video'
        ).get(id=candidate_id, is_profile_public=True)
        
        serializer = CandidateProfileDetailSerializer(candidate)
        return JsonResponse(serializer.data)
        
    except CandidateProfile.DoesNotExist:
        return JsonResponse({'error': 'Candidat introuvable'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def log_recruiter_video_view(request):
    """
    Enregistrer la consultation d'une vidéo par un recruteur
    """
    try:
        data = json.loads(request.body)
        
        candidate_id = data.get('candidate_profile')
        video_id = data.get('video')
        recruiter_id = data.get('recruiter_id', 1)
        view_duration = data.get('view_duration', 0)
        completed = data.get('completed_viewing', False)
        rating = data.get('rating')
        notes = data.get('notes', '')
        
        # Vérifier que le candidat existe
        candidate = CandidateProfile.objects.get(
            id=candidate_id, 
            is_profile_public=True
        )
        
        # Vérifier que la vidéo existe
        video = Video.objects.get(id=video_id, is_approved=True)
        
        # Récupérer le recruteur
        try:
            recruiter = User.objects.get(id=recruiter_id)
        except User.DoesNotExist:
            recruiter = User.objects.get(id=1)  # Utilisateur par défaut
        
        # Créer le log
        view_log = VideoViewLog.objects.create(
            video=video,
            viewer=recruiter,
            candidate_profile=candidate,
            view_duration=view_duration,
            completed_viewing=completed,
            rating=rating,
            notes=notes
        )
        
        # Notification au candidat
        try:
            create_video_viewed_notification(
                candidate_profile=candidate,
                viewer=recruiter,
                video=video
            )
        except Exception as e:
            print(f"Erreur notification: {e}")
        
        return JsonResponse({
            'message': 'Consultation enregistrée avec succès',
            'view_log_id': view_log.id
        })
        
    except CandidateProfile.DoesNotExist:
        return JsonResponse({'error': 'Candidat introuvable'}, status=404)
    except Video.DoesNotExist:
        return JsonResponse({'error': 'Vidéo introuvable'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON invalide'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def recruiter_dashboard_stats(request):
    """
    Statistiques pour le dashboard recruteur
    """
    try:
        recruiter_id = request.GET.get('recruiter_id', 1)
        
        # Statistiques générales
        stats = {
            'total_candidates': CandidateProfile.objects.filter(is_profile_public=True).count(),
            'active_candidates': CandidateProfile.objects.filter(
                is_profile_public=True, status='active'
            ).count(),
            'candidates_with_video': CandidateProfile.objects.filter(
                is_profile_public=True,
                presentation_video__isnull=False,
                presentation_video__is_approved=True
            ).count(),
            'my_recent_views': VideoViewLog.objects.filter(
                viewer_id=recruiter_id,
                viewed_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
        }
        
        # Répartition par statut
        status_distribution = CandidateProfile.objects.filter(
            is_profile_public=True
        ).values('status').annotate(count=Count('id'))
        
        stats['status_distribution'] = {
            item['status']: item['count'] for item in status_distribution
        }
        
        # Top universités
        top_universities = CandidateProfile.objects.filter(
            is_profile_public=True
        ).exclude(university='').values('university').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        stats['top_universities'] = list(top_universities)
        
        return JsonResponse(stats)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)