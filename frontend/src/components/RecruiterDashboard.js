import React, { useState, useEffect, useRef } from 'react';
import './RecruiterDashboard.css';

// Service API pour les recruteurs
const recruiterAPI = {
  getCandidates: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`http://127.0.0.1:8000/api/candidate/profiles/search/?${params}`);
      if (!response.ok) throw new Error('Erreur réseau');
      return await response.json();
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  },

  getCandidateDetails: async (candidateId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/candidate/profiles/${candidateId}/`);
      if (!response.ok) throw new Error('Candidat introuvable');
      return await response.json();
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      throw error;
    }
  },

  logVideoView: async (viewData) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/candidate/video-views/log_view/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viewData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error logging video view:', error);
    }
  }
};

const RecruiterDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'profile', 'video'
  const [filters, setFilters] = useState({
    q: '',
    has_video: 'true',
    status: 'active',
    min_video_score: '70',
    min_completeness: '60',
    order_by: '-updated_at'
  });
  const [showFilters, setShowFilters] = useState(false);
  const videoRef = useRef(null);
  const [videoStats, setVideoStats] = useState({ viewStartTime: null, totalViewed: 0 });

  // Charger les candidats
  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await recruiterAPI.getCandidates(filters);
      setCandidates(Array.isArray(results) ? results : results.results || []);
    } catch (error) {
      setError('Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et lors des changements de filtres
  useEffect(() => {
    const timeoutId = setTimeout(loadCandidates, 300);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Gérer les filtres
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Voir le profil d'un candidat
  const viewCandidateProfile = async (candidate) => {
    setLoading(true);
    try {
      const details = await recruiterAPI.getCandidateDetails(candidate.id);
      setSelectedCandidate(details);
      setCurrentView('profile');
    } catch (error) {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  // Regarder la vidéo
  const watchVideo = (candidate) => {
    setSelectedCandidate(candidate);
    setCurrentView('video');
    setVideoStats({ viewStartTime: Date.now(), totalViewed: 0 });
  };

  // Logger la vue vidéo
  const logVideoView = async (completed = false) => {
    if (!selectedCandidate || !videoStats.viewStartTime) return;
    
    const viewDuration = Math.floor((Date.now() - videoStats.viewStartTime) / 1000);
    
    await recruiterAPI.logVideoView({
      video: selectedCandidate.presentation_video?.id,
      candidate_profile: selectedCandidate.id,
      view_duration: viewDuration,
      completed_viewing: completed
    });
  };

  // Retour à la liste
  const backToList = () => {
    if (currentView === 'video' && videoStats.viewStartTime) {
      logVideoView(false);
    }
    setCurrentView('list');
    setSelectedCandidate(null);
    setVideoStats({ viewStartTime: null, totalViewed: 0 });
  };

  // Suivre la progression vidéo
  const handleVideoProgress = () => {
    if (videoRef.current && videoStats.viewStartTime) {
      const viewed = Math.floor(videoRef.current.currentTime);
      setVideoStats(prev => ({ ...prev, totalViewed: Math.max(prev.totalViewed, viewed) }));
    }
  };

  // Fin de vidéo
  const handleVideoEnd = () => {
    logVideoView(true);
  };

  return (
    <div className="recruiter-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/api/placeholder/120/32" alt="JOBGATE" className="logo" />
            <div className="header-divider"></div>
            <h1>Espace Recruteur</h1>
          </div>
          <div className="header-right">
            <div className="recruiter-info">
              <span className="recruiter-name">Marie Dubois</span>
              <span className="company-name">TechCorp Inc.</span>
            </div>
            <div className="avatar">MD</div>
          </div>
        </div>
      </div>

      {/* Navigation & Breadcrumb */}
      <div className="navigation">
        <div className="breadcrumb">
          <button onClick={backToList} className={currentView === 'list' ? 'active' : ''}>
            Candidats
          </button>
          {selectedCandidate && (
            <>
              <span className="separator">›</span>
              <span className="current">
                {currentView === 'profile' ? 'Profil' : 'Vidéo'} - {selectedCandidate.full_name}
              </span>
            </>
          )}
        </div>
        
        {currentView === 'list' && (
          <div className="view-actions">
            <span className="results-count">
              {candidates.length} candidat{candidates.length > 1 ? 's' : ''}
            </span>
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres {showFilters ? '▲' : '▼'}
            </button>
          </div>
        )}
      </div>

      {/* Vue principale */}
      <div className="main-content">
        {currentView === 'list' && (
          <CandidateListView 
            candidates={candidates}
            loading={loading}
            error={error}
            filters={filters}
            showFilters={showFilters}
            onFilterChange={handleFilterChange}
            onViewProfile={viewCandidateProfile}
            onWatchVideo={watchVideo}
            onRefresh={loadCandidates}
          />
        )}

        {currentView === 'profile' && selectedCandidate && (
          <CandidateProfileView 
            candidate={selectedCandidate}
            onWatchVideo={() => watchVideo(selectedCandidate)}
            onBack={backToList}
          />
        )}

        {currentView === 'video' && selectedCandidate && (
          <VideoPlayerView 
            candidate={selectedCandidate}
            videoRef={videoRef}
            onProgress={handleVideoProgress}
            onEnd={handleVideoEnd}
            onBack={backToList}
          />
        )}
      </div>
    </div>
  );
};

// Composant liste des candidats
const CandidateListView = ({ 
  candidates, loading, error, filters, showFilters, 
  onFilterChange, onViewProfile, onWatchVideo, onRefresh 
}) => (
  <div className="candidate-list-view">
    {/* Filtres */}
    {showFilters && (
      <div className="filters-panel">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Nom, université, formation..."
              value={filters.q}
              onChange={(e) => onFilterChange('q', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Statut</label>
            <select value={filters.status} onChange={(e) => onFilterChange('status', e.target.value)}>
              <option value="">Tous</option>
              <option value="active">Recherche active</option>
              <option value="passive">Recherche passive</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Score vidéo min.</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.min_video_score}
              onChange={(e) => onFilterChange('min_video_score', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Trier par</label>
            <select value={filters.order_by} onChange={(e) => onFilterChange('order_by', e.target.value)}>
              <option value="-updated_at">Plus récents</option>
              <option value="-video_quality_score">Meilleure vidéo</option>
              <option value="-profile_completeness">Profil le plus complet</option>
            </select>
          </div>
        </div>
      </div>
    )}

    {/* Liste des candidats */}
    <div className="candidates-container">
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Chargement des candidats...</span>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span>⚠️ {error}</span>
          <button onClick={onRefresh} className="btn btn-secondary">Réessayer</button>
        </div>
      )}

      {!loading && !error && (
        <div className="candidates-grid">
          {candidates.map(candidate => (
            <CandidateCard 
              key={candidate.id}
              candidate={candidate}
              onViewProfile={() => onViewProfile(candidate)}
              onWatchVideo={() => onWatchVideo(candidate)}
            />
          ))}
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Aucun candidat trouvé</h3>
          <p>Essayez d'ajuster vos critères de recherche</p>
        </div>
      )}
    </div>
  </div>
);

// Composant carte candidat
const CandidateCard = ({ candidate, onViewProfile, onWatchVideo }) => (
  <div className="candidate-card">
    <div className="card-header">
      <div className="candidate-avatar">
        {candidate.full_name?.charAt(0)?.toUpperCase() || 'C'}
      </div>
      <div className="candidate-basic-info">
        <h3 className="candidate-name">{candidate.full_name}</h3>
        <p className="candidate-education">{candidate.university}</p>
        <p className="candidate-major">{candidate.major}</p>
      </div>
      <div className="candidate-status">
        <span className={`status-badge status-${candidate.status}`}>
          {candidate.status === 'active' ? '🟢 Actif' : 
           candidate.status === 'passive' ? '🟡 Passif' : '🔴 Indisponible'}
        </span>
      </div>
    </div>

    <div className="card-metrics">
      <div className="metric">
        <span className="metric-label">Profil</span>
        <div className="metric-bar">
          <div 
            className="metric-fill" 
            style={{ width: `${candidate.profile_completeness || 0}%` }}
          ></div>
        </div>
        <span className="metric-value">{candidate.profile_completeness || 0}%</span>
      </div>

      {candidate.has_presentation_video && (
        <div className="metric">
          <span className="metric-label">Vidéo</span>
          <div className="metric-bar">
            <div 
              className="metric-fill metric-video" 
              style={{ width: `${candidate.video_quality_score || 0}%` }}
            ></div>
          </div>
          <span className="metric-value">{candidate.video_quality_score || 0}%</span>
        </div>
      )}
    </div>

    <div className="card-footer">
      <div className="candidate-tags">
        {candidate.has_presentation_video ? (
          <span className="tag tag-success">🎥 Vidéo disponible</span>
        ) : (
          <span className="tag tag-neutral">📄 CV uniquement</span>
        )}
        
        {candidate.location && (
          <span className="tag tag-location">📍 {candidate.location}</span>
        )}

        {candidate.experience_years > 0 && (
          <span className="tag tag-experience">
            💼 {candidate.experience_years} an{candidate.experience_years > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="card-actions">
        <button className="btn btn-secondary" onClick={onViewProfile}>
          Voir profil
        </button>
        {candidate.has_presentation_video && (
          <button className="btn btn-primary" onClick={onWatchVideo}>
            🎥 Vidéo
          </button>
        )}
      </div>
    </div>
  </div>
);

// Composant vue profil candidat
const CandidateProfileView = ({ candidate, onWatchVideo, onBack }) => (
  <div className="candidate-profile-view">
    <div className="profile-header">
      <button className="back-button" onClick={onBack}>← Retour</button>
      <div className="profile-title">
        <h2>Profil de {candidate.full_name}</h2>
        <span className={`status-badge status-${candidate.status}`}>
          {candidate.status === 'active' ? 'Recherche active' : 
           candidate.status === 'passive' ? 'Recherche passive' : 'Non disponible'}
        </span>
      </div>
    </div>

    <div className="profile-content">
      <div className="profile-main">
        <div className="profile-section">
          <h3>Informations personnelles</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{candidate.user?.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Téléphone:</span>
              <span className="value">{candidate.phone || 'Non renseigné'}</span>
            </div>
            <div className="info-item">
              <span className="label">Localisation:</span>
              <span className="value">{candidate.location || 'Non renseigné'}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Formation & expérience</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Niveau d'études:</span>
              <span className="value">{candidate.education_level}</span>
            </div>
            <div className="info-item">
              <span className="label">Université:</span>
              <span className="value">{candidate.university}</span>
            </div>
            <div className="info-item">
              <span className="label">Spécialisation:</span>
              <span className="value">{candidate.major}</span>
            </div>
            <div className="info-item">
              <span className="label">Année d'obtention:</span>
              <span className="value">{candidate.graduation_year || 'Non renseigné'}</span>
            </div>
            <div className="info-item">
              <span className="label">Expérience:</span>
              <span className="value">{candidate.experience_years} an{candidate.experience_years > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {candidate.presentation_video && (
          <div className="profile-section">
            <h3>Vidéo de présentation</h3>
            <div className="video-info">
              <div className="video-meta">
                <span className="video-quality">
                  Score qualité: <strong>{candidate.video_quality_score}%</strong>
                </span>
                <span className="video-date">
                  Mise à jour: {new Date(candidate.video_last_updated).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <button className="btn btn-primary btn-large" onClick={onWatchVideo}>
                🎥 Regarder la vidéo de présentation
              </button>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h3>Documents</h3>
          <div className="documents-list">
            {candidate.cv_file ? (
              <div className="document-item">
                <span className="doc-icon">📄</span>
                <div className="doc-info">
                  <span className="doc-name">CV.pdf</span>
                  <span className="doc-date">
                    Mis à jour: {new Date(candidate.cv_last_updated).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <a href={candidate.cv_file} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-small">
                  Télécharger
                </a>
              </div>
            ) : (
              <p className="no-documents">Aucun CV disponible</p>
            )}
            
            {candidate.portfolio_url && (
              <div className="document-item">
                <span className="doc-icon">🌐</span>
                <div className="doc-info">
                  <span className="doc-name">Portfolio en ligne</span>
                </div>
                <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-small">
                  Visiter
                </a>
              </div>
            )}

            {candidate.linkedin_url && (
              <div className="document-item">
                <span className="doc-icon">💼</span>
                <div className="doc-info">
                  <span className="doc-name">Profil LinkedIn</span>
                </div>
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-small">
                  Voir profil
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-sidebar">
        <div className="sidebar-section">
          <h4>Complétude du profil</h4>
          <div className="completeness-circle">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                fill="none" 
                stroke="#1B73E8" 
                strokeWidth="8"
                strokeDasharray={`${candidate.profile_completeness * 2.51}, 251`}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="50" textAnchor="middle" dy="7" className="percentage-text">
                {candidate.profile_completeness}%
              </text>
            </svg>
          </div>
        </div>

        <div className="sidebar-section">
          <h4>Actions rapides</h4>
          <div className="quick-actions">
            <button className="btn btn-outline">
              💌 Envoyer message
            </button>
            <button className="btn btn-outline">
              📞 Planifier entretien
            </button>
            <button className="btn btn-outline">
              ⭐ Ajouter aux favoris
            </button>
            <button className="btn btn-outline">
              📋 Créer rapport
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <h4>Informations système</h4>
          <div className="system-info">
            <div className="info-item">
              <span className="label">Inscription:</span>
              <span className="value">{new Date(candidate.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="info-item">
              <span className="label">Dernière connexion:</span>
              <span className="value">{new Date(candidate.updated_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Composant lecteur vidéo
const VideoPlayerView = ({ candidate, videoRef, onProgress, onEnd, onBack }) => (
  <div className="video-player-view">
    <div className="video-header">
      <button className="back-button" onClick={onBack}>← Retour</button>
      <div className="video-info">
        <h2>Vidéo de {candidate.full_name}</h2>
        <div className="video-meta">
          <span className="quality-score">Score qualité: {candidate.video_quality_score}%</span>
          <span className="upload-date">
            {new Date(candidate.video_last_updated).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>
    </div>

    <div className="video-container">
      <div className="video-player">
        {candidate.presentation_video?.video_file ? (
          <video
            ref={videoRef}
            controls
            onTimeUpdate={onProgress}
            onEnded={onEnd}
            className="video-element"
            preload="metadata"
          >
            <source src={candidate.presentation_video.video_file} type="video/webm" />
            <source src={candidate.presentation_video.video_file} type="video/mp4" />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        ) : (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎥</span>
              <p>Vidéo non disponible</p>
            </div>
          </div>
        )}
      </div>

      <div className="video-controls-info">
        <div className="playback-tips">
          <h4>💡 Conseils de visionnage</h4>
          <ul>
            <li>Écoutez attentivement la présentation personnelle</li>
            <li>Notez les compétences techniques mentionnées</li>
            <li>Observez l'aisance à l'oral et la motivation</li>
            <li>Regardez la qualité de la présentation</li>
          </ul>
        </div>

        <div className="video-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            Voir le profil complet
          </button>
          <button className="btn btn-primary">
            💌 Contacter le candidat
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default RecruiterDashboard;