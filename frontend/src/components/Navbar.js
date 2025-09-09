// frontend/src/components/Navbar.js - Version corrigée avec debug
import React from 'react';
import './Navbar.css';

const Navbar = ({ currentInterface = 'candidate', onInterfaceChange, currentUser }) => {
  
  const handleInterfaceChange = (newInterface) => {
    console.log('Navbar: Changing interface to:', newInterface);
    console.log('onInterfaceChange function:', onInterfaceChange);
    
    if (onInterfaceChange) {
      onInterfaceChange(newInterface);
    } else {
      console.error('onInterfaceChange function not provided!');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo">
          <div className="logo-container">
            <span className="logo-text">JOBGATE</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="navbar-menu">
          <button 
            className={`nav-btn ${currentInterface === 'candidate' ? 'active' : ''}`}
            onClick={() => handleInterfaceChange('candidate')}
          >
            🎥 Video Studio
          </button>
          <button 
            className={`nav-btn ${currentInterface === 'recruiter' ? 'active' : ''}`}
            onClick={() => handleInterfaceChange('recruiter')}
          >
            🏢 Recherche Candidats
          </button>
          <button className="nav-btn">
            🔔 Notifications
          </button>
          <button 
            className="nav-btn"
            onClick={() => window.open('http://127.0.0.1:8000/admin/', '_blank')}
          >
            ⚙️ Admin Portal
          </button>
        </div>

        {/* User Info */}
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'Demo User'}</span>
            <span className="user-role">
              {currentInterface === 'candidate' ? 'Candidat' : 'Recruteur'}
            </span>
          </div>
          <div className="user-avatar">
            {(currentUser?.name || 'D').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;