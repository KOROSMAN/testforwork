// frontend/src/App.tsx - Version propre et fonctionnelle
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import VideoStudio from './components/VideoStudio';
import RecruiterDashboard from './components/RecruiterDashboard';
import './App.css';

function App() {
  // État simple pour basculer entre les vues
  const [showRecruiterDashboard, setShowRecruiterDashboard] = useState(false);

  // Fonction pour basculer vers le dashboard recruteur
  const handleShowRecruiterDashboard = () => {
    setShowRecruiterDashboard(true);
  };

  // Fonction pour revenir au VideoStudio
  const handleBackToVideoStudio = () => {
    setShowRecruiterDashboard(false);
  };

  return (
    <div className="App">
      {/* Navbar avec bouton de basculement */}
      <Navbar 
        onShowRecruiterDashboard={handleShowRecruiterDashboard}
        showRecruiterDashboard={showRecruiterDashboard}
        onBackToVideoStudio={handleBackToVideoStudio}
      />

      {/* Affichage conditionnel */}
      {showRecruiterDashboard ? (
        <RecruiterDashboard />
      ) : (
        <div className="video-studio-wrapper">
          <VideoStudio 
            userId="demo-user"
            userName="Candidat Demo"
            onVideoSaved={undefined}
            onCVUpdateSuggested={undefined}
          />
        </div>
      )}
    </div>
  );
}

export default App;