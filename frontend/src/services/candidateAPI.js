import axios from 'axios';

// Configuration de base pour l'API candidats
const API_BASE_URL = 'http://127.0.0.1:8000/api/candidate';

// Instance axios pour l'API candidats
const candidateApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les réponses
candidateApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Candidate API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Service API pour les candidats
export const candidateAPI = {
  
  // === PROFILS CANDIDATS ===
  
  // Récupérer tous les profils candidats (pour recruteurs)
  getCandidateProfiles: async (params = {}) => {
    const response = await candidateApiClient.get('/profiles/', { params });
    return response.data;
  },

  // Récupérer un profil candidat par ID
  getCandidateProfile: async (profileId) => {
    const response = await candidateApiClient.get(`/profiles/${profileId}/`);
    return response.data;
  },

  // Rechercher des candidats avec filtres avancés
  searchCandidates: async (searchParams) => {
    const response = await candidateApiClient.get('/profiles/search/', { 
      params: searchParams 
    });
    return response.data;
  },

  // Mettre à jour un profil candidat
  updateCandidateProfile: async (profileId, profileData) => {
    const formData = new FormData();
    
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== null && profileData[key] !== undefined) {
        if (profileData[key] instanceof File) {
          formData.append(key, profileData[key]);
        } else {
          formData.append(key, profileData[key]);
        }
      }
    });
    
    const response = await candidateApiClient.put(`/profiles/${profileId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // === GESTION VIDÉO ===
  
  // Lier une vidéo à un profil candidat
  linkVideoToProfile: async (profileId, videoId) => {
    const response = await candidateApiClient.post(`/profiles/${profileId}/link_video/`, {
      video_id: videoId
    });
    return response.data;
  },

  // Lier rapidement une vidéo (utilisé par VideoStudio)
  quickLinkVideo: async (videoId, userId) => {
    const response = await candidateApiClient.post('/quick-video-link/', {
      video_id: videoId,
      user_id: userId
    });
    return response.data;
  },

  // Dissocier une vidéo du profil
  unlinkVideoFromProfile: async (profileId) => {
    const response = await candidateApiClient.post(`/profiles/${profileId}/unlink_video/`);
    return response.data;
  },

  // Obtenir les statistiques vidéo d'un candidat
  getVideoStats: async (profileId) => {
    const response = await candidateApiClient.get(`/profiles/${profileId}/video_stats/`);
    return response.data;
  },

  // === CONSULTATIONS VIDÉO (RECRUTEURS) ===
  
  // Enregistrer qu'un recruteur a consulté une vidéo
  logVideoView: async (viewData) => {
    const response = await candidateApiClient.post('/video-views/log_view/', viewData);
    return response.data;
  },

  // Obtenir les consultations vidéo
  getVideoViews: async (params = {}) => {
    const response = await candidateApiClient.get('/video-views/', { params });
    return response.data;
  },

  // === SYNCHRONISATION CV-VIDÉO ===
  
  // Obtenir les logs de synchronisation
  getSyncLogs: async (candidateId = null) => {
    const params = candidateId ? { candidate_id: candidateId } : {};
    const response = await candidateApiClient.get('/sync-logs/', { params });
    return response.data;
  },

  // Obtenir les synchronisations en attente
  getPendingSyncs: async () => {
    const response = await candidateApiClient.get('/sync-logs/pending_syncs/');
    return response.data;
  },

  // === DASHBOARD CANDIDAT ===
  
  // Obtenir les statistiques pour le dashboard candidat
  getDashboardStats: async (candidateId) => {
    const response = await axios.get(
      `${API_BASE_URL}/dashboard-stats/${candidateId}/`
    );
    return response.data;
  },

  // === UTILITAIRES ===
  
  // Créer un profil candidat pour un nouvel utilisateur
  createCandidateProfile: async (userData) => {
    const response = await candidateApiClient.post('/profiles/', userData);
    return response.data;
  },

  // Calculer la complétude d'un profil
  calculateProfileCompleteness: async (profileId) => {
    const response = await candidateApiClient.post(`/profiles/${profileId}/calculate_completeness/`);
    return response.data;
  },

  // === FILTRES ET OPTIONS ===
  
  // Obtenir les options pour les filtres
  getFilterOptions: async () => {
    // Simuler les options basées sur les données existantes
    return {
      status_choices: [
        { value: 'active', label: 'Recherche active' },
        { value: 'passive', label: 'Recherche passive' },
        { value: 'not_available', label: 'Non disponible' }
      ],
      education_levels: [
        'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat', 'Formation professionnelle'
      ],
      experience_ranges: [
        { min: 0, max: 1, label: 'Débutant (0-1 an)' },
        { min: 1, max: 3, label: 'Junior (1-3 ans)' },
        { min: 3, max: 5, label: 'Confirmé (3-5 ans)' },
        { min: 5, max: 10, label: 'Senior (5-10 ans)' },
        { min: 10, max: 999, label: 'Expert (10+ ans)' }
      ]
    };
  }
};

// Utilitaires pour l'API candidats
export const candidateApiUtils = {
  // Gérer les erreurs API candidat
  handleApiError: (error) => {
    if (error.response) {
      const { status, data } = error.response;
      return {
        type: 'api_error',
        status,
        message: data.message || data.error || 'Erreur serveur candidat',
        details: data
      };
    } else if (error.request) {
      return {
        type: 'network_error',
        message: 'Impossible de contacter le serveur candidat.',
      };
    } else {
      return {
        type: 'unknown_error',
        message: error.message || 'Une erreur inattendue s\'est produite',
      };
    }
  },

  // Formater un profil candidat pour l'affichage
  formatCandidateForDisplay: (candidate) => {
    return {
      ...candidate,
      display_name: candidate.full_name || `${candidate.first_name} ${candidate.last_name}`,
      education_summary: `${candidate.education_level} - ${candidate.university}`,
      status_label: {
        'active': 'Recherche active',
        'passive': 'Recherche passive', 
        'not_available': 'Non disponible'
      }[candidate.status] || candidate.status,
      completeness_color: candidate.profile_completeness >= 80 ? 'success' : 
                         candidate.profile_completeness >= 50 ? 'warning' : 'danger',
      video_quality_color: candidate.video_quality_score >= 80 ? 'success' :
                          candidate.video_quality_score >= 60 ? 'warning' : 'danger'
    };
  },

  // Créer des paramètres de recherche pour l'API
  buildSearchParams: (filters) => {
    const params = {};
    
    // Recherche textuelle
    if (filters.q && filters.q.trim()) {
      params.q = filters.q.trim();
    }
    
    // Filtres booléens
    if (filters.has_video !== undefined && filters.has_video !== '') {
      params.has_video = filters.has_video;
    }
    
    // Filtres de statut
    if (filters.status) {
      params.status = filters.status;
    }
    
    // Filtres numériques
    if (filters.min_video_score && filters.min_video_score > 0) {
      params.min_video_score = filters.min_video_score;
    }
    
    if (filters.min_completeness && filters.min_completeness > 0) {
      params.min_completeness = filters.min_completeness;
    }
    
    // Tri
    if (filters.order_by) {
      params.order_by = filters.order_by;
    }
    
    return params;
  }
};

export default candidateApiClient;