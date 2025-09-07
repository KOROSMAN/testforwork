import axios from 'axios';

// Configuration de base pour l'API notifications
const API_BASE_URL = 'http://127.0.0.1:8000/api/notifications';

// Instance axios pour l'API notifications
const notificationApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les réponses
notificationApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Notification API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Service API pour les notifications
export const notificationAPI = {
  
  // === GESTION DES NOTIFICATIONS ===
  
  // Obtenir les notifications d'un utilisateur
  getNotifications: async (userId, params = {}) => {
    const response = await notificationApiClient.get('/notifications/', {
      params: { user_id: userId, ...params }
    });
    return response.data;
  },

  // Obtenir une notification par ID
  getNotification: async (notificationId) => {
    const response = await notificationApiClient.get(`/notifications/${notificationId}/`);
    return response.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationId) => {
    const response = await notificationApiClient.post(`/notifications/${notificationId}/mark_as_read/`);
    return response.data;
  },

  // Marquer une notification comme non lue
  markAsUnread: async (notificationId) => {
    const response = await notificationApiClient.post(`/notifications/${notificationId}/mark_as_unread/`);
    return response.data;
  },

  // Archiver une notification
  archiveNotification: async (notificationId) => {
    const response = await notificationApiClient.post(`/notifications/${notificationId}/archive/`);
    return response.data;
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (userId) => {
    const response = await notificationApiClient.post('/notifications/mark_all_as_read/', {
      user_id: userId
    });
    return response.data;
  },

  // Obtenir le nombre de notifications non lues
  getUnreadCount: async (userId) => {
    const response = await notificationApiClient.get('/notifications/unread_count/', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Obtenir un résumé des notifications
  getSummary: async (userId) => {
    const response = await notificationApiClient.get('/notifications/summary/', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // === CRÉATION DE NOTIFICATIONS ===
  
  // Créer une notification simple
  createNotification: async (notificationData) => {
    const response = await axios.post('http://127.0.0.1:8000/api/notifications/create/', notificationData);
    return response.data;
  },

  // Créer plusieurs notifications en une fois
  createBulkNotifications: async (notificationsData) => {
    const response = await axios.post('http://127.0.0.1:8000/api/notifications/bulk-create/', {
      notifications: notificationsData
    });
    return response.data;
  },

  // === NOTIFICATIONS SPÉCIFIQUES VIDÉO ===
  
  // Créer une notification de vidéo liée
  createVideoLinkedNotification: async (userId, videoData) => {
    return await notificationAPI.createNotification({
      recipient_id: userId,
      notification_type: 'video_linked',
      title: '🎥 Vidéo liée à votre profil',
      message: `Votre vidéo "${videoData.title}" a été liée à votre profil candidat avec succès !`,
      priority: 'normal',
      related_object_type: 'video',
      related_object_id: videoData.id,
      extra_data: {
        video_title: videoData.title,
        quality_score: videoData.quality_score,
        profile_completeness: videoData.profile_completeness
      },
      action_url: `/candidate-profile`,
      action_text: 'Voir mon profil'
    });
  },

  // Créer une notification de vidéo consultée
  createVideoViewedNotification: async (candidateUserId, viewerData, videoData) => {
    return await notificationAPI.createNotification({
      recipient_id: candidateUserId,
      sender_id: viewerData.id,
      notification_type: 'video_viewed',
      title: '👁️ Votre vidéo a été consultée',
      message: `${viewerData.name || 'Un recruteur'} a consulté votre vidéo de présentation`,
      priority: 'normal',
      related_object_type: 'video',
      related_object_id: videoData.id,
      extra_data: {
        viewer_name: viewerData.name,
        video_title: videoData.title,
        view_duration: viewerData.view_duration
      }
    });
  },

  // Créer une notification de synchronisation nécessaire
  createSyncNeededNotification: async (userId, syncData) => {
    return await notificationAPI.createNotification({
      recipient_id: userId,
      notification_type: 'sync_needed',
      title: '🔄 Mise à jour recommandée',
      message: 'Votre CV a été modifié. Pensez à actualiser votre vidéo de présentation pour maintenir la cohérence.',
      priority: 'normal',
      extra_data: syncData,
      action_url: '/video-studio',
      action_text: 'Mettre à jour ma vidéo'
    });
  },

  // === PRÉFÉRENCES ===
  
  // Obtenir les préférences de notification d'un utilisateur
  getPreferences: async (userId) => {
    const response = await notificationApiClient.get('/preferences/', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Mettre à jour les préférences
  updatePreferences: async (userId, preferences) => {
    const response = await notificationApiClient.put('/preferences/', {
      user_id: userId,
      ...preferences
    });
    return response.data;
  },

  // === STATISTIQUES ===
  
  // Obtenir les statistiques de notifications
  getStats: async (userId) => {
    const response = await axios.get(`http://127.0.0.1:8000/api/notifications/stats/${userId}/`);
    return response.data;
  }
};

// Utilitaires pour les notifications
export const notificationUtils = {
  
  // Formater le temps relatif
  formatTimeAgo: (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'à l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `il y a ${minutes}min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `il y a ${hours}h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  },

  // Obtenir l'icône selon le type de notification
  getNotificationIcon: (type) => {
    const icons = {
      'video_linked': '🎥',
      'video_viewed': '👁️',
      'video_approved': '✅',
      'sync_needed': '🔄',
      'profile_complete': '🎉',
      'profile_viewed': '👀',
      'cv_updated': '📄',
      'job_match': '🎯',
      'interview_request': '📞',
      'application_status': '📋',
      'system_update': '⚙️',
      'account_update': '👤',
      'welcome': '👋'
    };
    return icons[type] || '📢';
  },

  // Obtenir la couleur selon la priorité
  getPriorityColor: (priority) => {
    const colors = {
      'low': '#64748b',
      'normal': '#1B73E8',
      'high': '#f59e0b',
      'urgent': '#ef4444'
    };
    return colors[priority] || colors.normal;
  },

  // Formater une notification pour l'affichage
  formatNotificationForDisplay: (notification) => {
    return {
      ...notification,
      icon: notificationUtils.getNotificationIcon(notification.notification_type),
      color: notificationUtils.getPriorityColor(notification.priority),
      timeAgo: notificationUtils.formatTimeAgo(notification.created_at),
      isRecent: new Date() - new Date(notification.created_at) < 24 * 60 * 60 * 1000 // 24h
    };
  },

  // Grouper les notifications par date
  groupNotificationsByDate: (notifications) => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    notifications.forEach(notification => {
      const date = new Date(notification.created_at).toDateString();
      let groupKey;
      
      if (date === today) {
        groupKey = 'Aujourd\'hui';
      } else if (date === yesterday) {
        groupKey = 'Hier';
      } else {
        groupKey = new Date(notification.created_at).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  }
};

export default notificationApiClient;