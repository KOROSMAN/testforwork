// App.js - Exemple d'utilisation des modals personnalisés
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import VideoStudio from './components/VideoStudio';
import CandidateSearch from './components/CandidateSearch';
import NotificationCenter from './components/NotificationCenter';
import Modal, { useModal, SuccessModal, ErrorModal, ConfirmModal, WarningModal } from './components/Modal';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('video-studio'); // 'video-studio', 'candidate-search', 'notifications'
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Hook pour gérer les modals de démonstration
  const { modal, showSuccess, showError, showConfirm, showWarning, hideModal } = useModal();

  // Fonction de démonstration des différents types de modals
  const showModalExamples = () => {
    showConfirm(
      'Choisir un type de modal',
      'Quel type de modal voulez-vous tester ?',
      () => {
        // Afficher différents modals selon le choix
        setTimeout(() => showSuccess(
          'Opération réussie !',
          'Votre action a été effectuée avec succès. Tout fonctionne parfaitement.',
          () => {
            setTimeout(() => showError(
              'Erreur simulée',
              'Ceci est un exemple d\'erreur pour montrer le design des modals d\'erreur.',
              () => {
                setTimeout(() => showWarning(
                  'Attention importante',
                  'Ceci est un avertissement pour vous informer d\'une situation qui nécessite votre attention.'
                ), 500);
              }
            ), 500);
          }
        ), 500);
      },
      () => {
        showSuccess('Annulé', 'Vous avez annulé la démonstration.');
      },
      'Voir les exemples',
      'Annuler'
    );
  };

  // Callbacks pour VideoStudio
  const handleVideoSaved = (videoData) => {
    console.log('Video saved callback:', videoData);
    // Ici vous pourriez faire des actions supplémentaires
  };

  const handleCVUpdateSuggested = (updateData) => {
    console.log('CV update suggested:', updateData);
    // Ici vous pourriez notifier l'utilisateur d'autres façons
  };

  // Callback pour CandidateSearch
  const handleCandidateSelect = (candidate) => {
    showSuccess(
      'Candidat sélectionné',
      `Vous avez sélectionné ${candidate.full_name}. Dans une vraie application, cela ouvrirait son profil détaillé.`
    );
  };

  return (
    <div className="App">
      {/* Modal global pour l'application */}
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        showCancel={modal.showCancel}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />

      <Navbar />
      
      {/* Navigation entre les vues */}
      <div className="app-navigation">
        <div className="nav-container">
          <button 
            className={`nav-btn ${currentView === 'video-studio' ? 'active' : ''}`}
            onClick={() => setCurrentView('video-studio')}
          >
            🎥 Video Studio
          </button>
          <button 
            className={`nav-btn ${currentView === 'candidate-search' ? 'active' : ''}`}
            onClick={() => setCurrentView('candidate-search')}
          >
            🔍 Recherche Candidats
          </button>
          <button 
            className={`nav-btn ${currentView === 'notifications' ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔 Notifications
          </button>
          <button 
            className="nav-btn demo-btn"
            onClick={showModalExamples}
          >
            ✨ Démo Modals
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="app-content">
        {currentView === 'video-studio' && (
          <VideoStudio 
            userId="demo-user"
            userName="Candidat Demo"
            onVideoSaved={handleVideoSaved}
            onCVUpdateSuggested={handleCVUpdateSuggested}
          />
        )}

        {currentView === 'candidate-search' && (
          <CandidateSearch 
            onCandidateSelect={handleCandidateSelect}
          />
        )}

        {/* Centre de notifications en overlay */}
        {showNotifications && (
          <div className="notification-overlay">
            <NotificationCenter 
              userId={1}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;