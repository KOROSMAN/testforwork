import React, { useState, useEffect } from 'react';
import { candidateAPI } from '../services/candidateAPI';
import './CandidateSearch.css';

const CandidateSearch = ({ onCandidateSelect }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    has_video: '',
    status: 'active',
    min_video_score: '',
    min_completeness: '',
    order_by: '-updated_at'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Charger les candidats
  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await candidateAPI.searchCandidates(filters);
      setCandidates(response.results || response);
    } catch (error) {
      setError('Erreur lors du chargement des candidats');
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et quand les filtres changent
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCandidates();
    }, 300); // Debounce pour la recherche
    
    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Gérer les changements de filtres
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      q: '',
      has_video: '',
      status: 'active',
      min_video_score: '',
      min_completeness: '',
      order_by: '-updated_at'
    });
  };

  return (
    <div className="candidate-search">
      <div className="search-header">
        <h2>🔍 Recherche de Candidats</h2>
        <div className="search-actions">
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Masquer' : 'Afficher'} les filtres
          </button>
          <button 
            className="btn btn-primary btn-small"
            onClick={loadCandidates}
            disabled={loading}
          >
            {loading ? 'Recherche...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Barre de recherche principale */}
      <div className="search-main">
        <input
          type="text"
          placeholder="Rechercher par nom, université, formation..."
          value={filters.q}
          onChange={(e) => handleFilterChange('q', e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="search-filters">
          <div className="filter-group">
            <label>Vidéo de présentation :</label>
            <select 
              value={filters.has_video} 
              onChange={(e) => handleFilterChange('has_video', e.target.value)}
            >
              <option value="">Tous</option>
              <option value="true">Avec vidéo</option>
              <option value="false">Sans vidéo</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Statut :</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tous</option>
              <option value="active">Recherche active</option>
              <option value="passive">Recherche passive</option>
              <option value="not_available">Non disponible</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Score vidéo minimum :</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="80"
              value={filters.min_video_score}
              onChange={(e) => handleFilterChange('min_video_score', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Complétude profil :</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="70"
              value={filters.min_completeness}
              onChange={(e) => handleFilterChange('min_completeness', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Trier par :</label>
            <select 
              value={filters.order_by} 
              onChange={(e) => handleFilterChange('order_by', e.target.value)}
            >
              <option value="-updated_at">Plus récents</option>
              <option value="updated_at">Plus anciens</option>
              <option value="-profile_completeness">Profil le plus complet</option>
              <option value="-video_quality_score">Meilleure vidéo</option>
              <option value="-created_at">Nouveaux inscrits</option>
            </select>
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary btn-small" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="search-stats">
        <span>{candidates.length} candidat{candidates.length > 1 ? 's' : ''} trouvé{candidates.length > 1 ? 's' : ''}</span>
        {filters.has_video === 'true' && (
          <span className="stat-highlight">• Avec vidéo uniquement</span>
        )}
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="search-error">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <span>Recherche en cours...</span>
        </div>
      )}

      {/* Résultats */}
      <div className="candidates-grid">
        {candidates.map(candidate => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onSelect={() => onCandidateSelect && onCandidateSelect(candidate)}
          />
        ))}
      </div>

      {/* Message si aucun résultat */}
      {!loading && candidates.length === 0 && !error && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>Aucun candidat trouvé</h3>
          <p>Essayez d'ajuster vos critères de recherche ou de réinitialiser les filtres.</p>
          <button className="btn btn-primary" onClick={resetFilters}>
            Voir tous les candidats
          </button>
        </div>
      )}
    </div>
  );
};

// Composant pour une carte candidat
const CandidateCard = ({ candidate, onSelect }) => {
  const [videoStats, setVideoStats] = useState(null);

  // Charger les stats vidéo si disponible
  useEffect(() => {
    if (candidate.has_presentation_video) {
      candidateAPI.getVideoStats(candidate.id)
        .then(stats => setVideoStats(stats))
        .catch(err => console.warn('Error loading video stats:', err));
    }
  }, [candidate.id, candidate.has_presentation_video]);

  return (
    <div className="candidate-card" onClick={onSelect}>
      <div className="candidate-header">
        <div className="candidate-avatar">
          {candidate.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="candidate-info">
          <h3 className="candidate-name">{candidate.full_name}</h3>
          <p className="candidate-education">
            {candidate.education_level} • {candidate.university}
          </p>
          <p className="candidate-major">{candidate.major}</p>
        </div>
        <div className="candidate-status">
          <span className={`status-badge status-${candidate.status}`}>
            {candidate.status === 'active' && '🟢 Actif'}
            {candidate.status === 'passive' && '🟡 Passif'}
            {candidate.status === 'not_available' && '🔴 Indisponible'}
          </span>
        </div>
      </div>

      <div className="candidate-metrics">
        <div className="metric">
          <span className="metric-label">Profil</span>
          <div className="metric-bar">
            <div 
              className="metric-fill" 
              style={{ width: `${candidate.profile_completeness}%` }}
            ></div>
          </div>
          <span className="metric-value">{candidate.profile_completeness}%</span>
        </div>

        {candidate.has_presentation_video && (
          <div className="metric">
            <span className="metric-label">Vidéo</span>
            <div className="metric-bar">
              <div 
                className="metric-fill metric-fill-video" 
                style={{ width: `${candidate.video_quality_score}%` }}
              ></div>
            </div>
            <span className="metric-value">{candidate.video_quality_score}%</span>
          </div>
        )}
      </div>

      <div className="candidate-footer">
        <div className="candidate-badges">
          {candidate.has_presentation_video ? (
            <span className="badge badge-success">
              🎥 Vidéo disponible
            </span>
          ) : (
            <span className="badge badge-neutral">
              📄 CV uniquement
            </span>
          )}
          
          {candidate.location && (
            <span className="badge badge-location">
              📍 {candidate.location}
            </span>
          )}

          {candidate.experience_years > 0 && (
            <span className="badge badge-experience">
              💼 {candidate.experience_years} an{candidate.experience_years > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {videoStats && (
          <div className="video-stats">
            <small>
              👁️ {videoStats.total_views} vues • 
              ⭐ {videoStats.average_rating ? videoStats.average_rating.toFixed(1) : 'N/A'}
            </small>
          </div>
        )}
      </div>

      <div className="candidate-actions">
        <button className="btn btn-primary btn-small">
          Voir le profil
        </button>
        {candidate.has_presentation_video && (
          <button className="btn btn-secondary btn-small">
            🎥 Regarder vidéo
          </button>
        )}
      </div>
    </div>
  );
};

export default CandidateSearch;