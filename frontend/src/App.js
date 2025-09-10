// frontend/src/App.js - Version corrigée
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import VideoStudio from './components/VideoStudio';
import RecruiterDashboard from './components/RecruiterDashboard';
import './App.css';

function App() {
  // État simple pour basculer entre les vues
  const [showRecruiterDashboard, setShowRecruiterDashboard] = useState(false);

  // Debug: ajouter des logs pour voir si les fonctions sont appelées
  const handleShowRecruiterDashboard = () => {
    console.log('🔄 CLIC DÉTECTÉ - Basculement vers RecruiterDashboard');
    setShowRecruiterDashboard(true);
    console.log('✅ showRecruiterDashboard défini à true');
  };

  // Fonction pour revenir au VideoStudio (optionnelle)
  const handleBackToVideoStudio = () => {
    console.log('🔄 Retour vers VideoStudio');
    setShowRecruiterDashboard(false);
  };

  // Debug: afficher l'état actuel
  console.log('🖥️ État actuel - showRecruiterDashboard:', showRecruiterDashboard);

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
        <VideoStudio 
          userId="demo-user"
          userName="Candidat Demo"
          onVideoSaved={undefined}
          onCVUpdateSuggested={undefined}
        />
      )}
    </div>
  );
}

export default App;