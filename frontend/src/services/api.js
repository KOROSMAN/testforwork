import axios from 'axios';

// Configuration de base pour l'API
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Instance axios avec configuration de base
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 secondes pour l'upload de vidéos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les réponses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Service API pour les vidéos
export const videoAPI = {
  // Récupérer toutes les vidéos
  getVideos: async (userId = null) => {
    const params = userId ? { user_id: userId } : {};
    const response = await apiClient.get('/videos/', { params });
    return response.data;
  },

  // Récupérer une vidéo par ID
  getVideo: async (videoId) => {
    const response = await apiClient.get(`/videos/${videoId}/`);
    return response.data;
  },

  // Créer une nouvelle vidéo
  createVideo: async (videoData) => {
    const response = await apiClient.post('/videos/', videoData);
    return response.data;
  },

  // Démarrer une session d'enregistrement
  startRecording: async (videoId, sessionData) => {
    const response = await apiClient.post(`/videos/${videoId}/start_recording/`, sessionData);
    return response.data;
  },

  // Arrêter une session d'enregistrement
  stopRecording: async (videoId, sessionData) => {
    const response = await apiClient.post(`/videos/${videoId}/stop_recording/`, sessionData);
    return response.data;
  },

  // Approuver une vidéo
  approveVideo: async (videoId) => {
    const response = await apiClient.post(`/videos/${videoId}/approve/`);
    return response.data;
  },

  // Lier la vidéo au CV
  linkToCV: async (videoId) => {
    const response = await apiClient.post(`/videos/${videoId}/link_to_cv/`);
    return response.data;
  },

  // Upload de vidéo (endpoint spécialisé)
  uploadVideo: async (formData) => {
    const response = await apiClient.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${progress}%`);
      },
    });
    return response.data;
  },
};

// Service API pour les tests qualité
export const qualityAPI = {
  // Récupérer les tests qualité d'une vidéo
  getQualityChecks: async (videoId) => {
    const response = await apiClient.get('/quality-checks/', {
      params: { video_id: videoId }
    });
    return response.data;
  },

  // Mettre à jour plusieurs tests qualité en une fois
  updateQualityChecks: async (videoId, qualityData) => {
    const response = await apiClient.post('/quality-checks/batch_update/', {
      video_id: videoId,
      quality_checks: qualityData
    });
    return response.data;
  },

  // Analyse qualité en temps réel
  analyzeQuality: async (videoId, analysisData) => {
    const response = await apiClient.post('/quality-analysis/', {
      video_id: videoId,
      analysis: analysisData
    });
    return response.data;
  },
};

// Utilitaires pour l'API
export const apiUtils = {
  // Créer FormData pour l'upload de fichiers
  createFormData: (videoFile, additionalData = {}) => {
    const formData = new FormData();
    formData.append('video_file', videoFile);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
    
    return formData;
  },

  // Convertir Blob en File pour l'upload
  blobToFile: (blob, fileName) => {
    return new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now(),
    });
  },

  // Gérer les erreurs API
  handleApiError: (error) => {
    if (error.response) {
      const { status, data } = error.response;
      return {
        type: 'api_error',
        status,
        message: data.message || data.error || 'Erreur serveur',
        details: data
      };
    } else if (error.request) {
      return {
        type: 'network_error',
        message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
      };
    } else {
      return {
        type: 'unknown_error',
        message: error.message || 'Une erreur inattendue s\'est produite',
      };
    }
  },
};

// Configuration par défaut
export const demoConfig = {
  defaultUserId: 1,
  defaultUserName: 'Demo User',
  defaultTitle: 'Vidéo de présentation',
};

export default apiClient;