import React, { useState, useEffect } from 'react';
import { notificationAPI, notificationUtils } from '../services/notificationAPI';
import './NotificationCenter.css';

const NotificationCenter = ({ userId = 1, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, video, profile
  const [error, setError] = useState(null);

  // Charger les notifications
  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (filter === 'unread') params.is_read = false;
      if (filter === 'video') params.type = 'video_linked,video_viewed,video_approved';
      if (filter === 'profile') params.type = 'profile_complete,profile_viewed,sync_needed';
      
      const response = await notificationAPI.getNotifications(userId, params);
      const formattedNotifications = response.map(notificationUtils.formatNotificationForDisplay);
      
      setNotifications(formattedNotifications);
      
      // Charger le compteur de non lues
      const countResponse = await notificationAPI.getUnreadCount(userId);
      setUnreadCount(countResponse.unread_count);
      
    } catch (error) {
      setError('Erreur lors du chargement des notifications');
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et quand le filtre change
  useEffect(() => {
    loadNotifications();
  }, [userId, filter]);

  // Marquer comme lue
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true, read_at: new Date().toISOString() }
          : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Marquer toutes comme lues
  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(userId);
      setNotifications(prev => prev.map(notif => ({ 
        ...notif, 
        is_read: true, 
        read_at: new Date().toISOString() 
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Archiver une notification
  const handleArchive = async (notificationId) => {
    try {
      await notificationAPI.archiveNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  // Grouper par date
  const groupedNotifications = notificationUtils.groupNotificationsByDate(notifications);

  return (
    <div className="notification-center">
      <div className="notification-header">
        <div className="notification-title">
          <h3>🔔 Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button 
              className="btn btn-small btn-secondary"
              onClick={handleMarkAllAsRead}
            >
              Tout marquer comme lu
            </button>
          )}
          
          <button 
            className="btn btn-small btn-secondary"
            onClick={loadNotifications}
            disabled={loading}
          >
            🔄 Actualiser
          </button>
          
          {onClose && (
            <button 
              className="close-btn"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="notification-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Toutes
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Non lues
        </button>
        <button 
          className={`filter-btn ${filter === 'video' ? 'active' : ''}`}
          onClick={() => setFilter('video')}
        >
          🎥 Vidéo
        </button>
        <button 
          className={`filter-btn ${filter === 'profile' ? 'active' : ''}`}
          onClick={() => setFilter('profile')}
        >
          👤 Profil
        </button>
      </div>

      {/* Contenu */}
      <div className="notification-content">
        {loading && (
          <div className="notification-loading">
            <div className="loading-spinner"></div>
            <span>Chargement...</span>
          </div>
        )}

        {error && (
          <div className="notification-error">
            ⚠️ {error}
            <button onClick={loadNotifications}>Réessayer</button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="no-notifications">
            <div className="no-notifications-icon">🔔</div>
            <h4>Aucune notification</h4>
            <p>Vous êtes à jour ! Toutes vos notifications apparaîtront ici.</p>
          </div>
        )}

        {!loading && !error && Object.keys(groupedNotifications).length > 0 && (
          <div className="notifications-list">
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <div key={dateGroup} className="notification-group">
                <div className="group-header">{dateGroup}</div>
                
                {groupNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant pour une notification individuelle
const NotificationItem = ({ notification, onMarkAsRead, onArchive }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    // Ouvrir le lien d'action si disponible
    if (notification.action_url) {
      // Dans une vraie app, utiliser le router
      console.log('Navigate to:', notification.action_url);
    }
  };

  return (
    <div 
      className={`notification-item ${!notification.is_read ? 'unread' : ''} ${notification.isRecent ? 'recent' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-main">
        <div className="notification-icon">
          {notification.icon}
        </div>
        
        <div className="notification-body">
          <div className="notification-header-item">
            <h4 className="notification-title-item">{notification.title}</h4>
            <span className="notification-time">{notification.timeAgo}</span>
          </div>
          
          <p className="notification-message">{notification.message}</p>
          
          {notification.sender && (
            <div className="notification-sender">
              De: {notification.sender.full_name}
            </div>
          )}
          
          {notification.action_text && (
            <div className="notification-action">
              <button className="action-btn">
                {notification.action_text} →
              </button>
            </div>
          )}
        </div>
        
        <div className="notification-controls">
          <button
            className="control-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            title="Détails"
          >
            ℹ️
          </button>
          
          <button
            className="control-btn"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            title="Archiver"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Détails étendus */}
      {showDetails && (
        <div className="notification-details">
          <div className="detail-row">
            <span className="detail-label">Type:</span>
            <span>{notification.notification_type}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Priorité:</span>
            <span className={`priority-${notification.priority}`}>
              {notification.priority}
            </span>
          </div>
          
          {notification.related_object && (
            <div className="detail-row">
              <span className="detail-label">Lié à:</span>
              <span>{notification.related_object.type} #{notification.related_object.id}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Créé:</span>
            <span>{new Date(notification.created_at).toLocaleString('fr-FR')}</span>
          </div>
          
          {notification.extra_data && Object.keys(notification.extra_data).length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Données:</span>
              <pre className="extra-data">
                {JSON.stringify(notification.extra_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;