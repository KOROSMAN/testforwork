// frontend/src/components/Navbar.js - Version propre avec basculement
import React from 'react';
import './Navbar.css';

const Navbar = ({ onShowRecruiterDashboard, showRecruiterDashboard, onBackToVideoStudio }) => {
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo">
          <div className="logo-container">
            <span className="logo-text">JOBGATE</span>
          </div>
        </div>

        {/* Bouton de basculement selon l'état */}
        <div className="navbar-actions">
          {showRecruiterDashboard ? (
            <button 
              className="recruiter-btn candidate-btn"
              onClick={onBackToVideoStudio}
            >
              🎥 Espace Candidat
            </button>
          ) : (
            <button 
              className="recruiter-btn"
              onClick={onShowRecruiterDashboard}
            >
              🏢 Espace Recruteur
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;