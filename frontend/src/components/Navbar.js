import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo">
          <div className="logo-container">
            <img src={require('../assets/logo.png')} alt="JOBGATE" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;