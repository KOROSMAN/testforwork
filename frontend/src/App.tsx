// frontend/src/App.tsx - Version corrigée avec debug complet
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import VideoStudio from './components/VideoStudio';
import RecruiterDashboard from './components/RecruiterDashboard';
import './App.css';

// Types pour TypeScript
interface UserProfile {
  id: number;
  role: 'candidate' | 'recruiter';
  name: string;
  email: string;
}

function App() {
  // État pour gérer l'utilisateur et l'interface active
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 1,
    role: 'candidate',
    name: 'Demo Candidat',
    email: 'demo@jobgate.ma'
  });

  const [currentInterface, setCurrentInterface] = useState<'candidate' | 'recruiter'>('candidate');

  // Basculer entre les interfaces avec debug
  const switchInterface = (newInterface: 'candidate' | 'recruiter') => {
    console.log('App: switchInterface called with:', newInterface);
    console.log('App: current interface before:', currentInterface);
    
    setCurrentInterface(newInterface);
    
    // Simuler le changement d'utilisateur selon l'interface
    if (newInterface === 'recruiter') {
      const recruiterUser = {
        id: 2,
        role: 'recruiter' as const,
        name: 'Marie Dubois',
        email: 'marie.dubois@techcorp.com'
      };
      console.log('App: switching to recruiter user:', recruiterUser);
      setCurrentUser(recruiterUser);
    } else {
      const candidateUser = {
        id: 1,
        role: 'candidate' as const,
        name: 'Demo Candidat',
        email: 'candidat@jobgate.ma'
      };
      console.log('App: switching to candidate user:', candidateUser);
      setCurrentUser(candidateUser);
    }
    
    console.log('App: interface will change to:', newInterface);
  };

  // Debug des states
  console.log('App render - currentInterface:', currentInterface);
  console.log('App render - currentUser:', currentUser);

  return (
    <div className="App">
      <Navbar 
        currentInterface={currentInterface}
        onInterfaceChange={switchInterface}
        currentUser={currentUser}
      />

      {/* Debug Panel - À supprimer une fois que ça marche */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>Interface: {currentInterface}</div>
        <div>User: {currentUser.name}</div>
        <button 
          onClick={() => switchInterface('recruiter')}
          style={{
            background: '#1B73E8',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            margin: '5px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Force Recruiter
        </button>
        <button 
          onClick={() => switchInterface('candidate')}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            margin: '5px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Force Candidate
        </button>
      </div>

      {/* Interface conditionnelle */}
      {currentInterface === 'candidate' ? (
        <div>
          <h2 style={{textAlign: 'center', color: '#1B73E8', margin: '20px'}}>
            📹 INTERFACE CANDIDAT - VIDEO STUDIO
          </h2>
          <VideoStudio 
            userId={currentUser.id.toString()}
            userName={currentUser.name}
            onVideoSaved={undefined}
            onCVUpdateSuggested={undefined}
          />
        </div>
      ) : (
        <div>
          <h2 style={{textAlign: 'center', color: '#1B73E8', margin: '20px'}}>
            🏢 INTERFACE RECRUTEUR - DASHBOARD
          </h2>
          <RecruiterDashboard />
        </div>
      )}
    </div>
  );
}

export default App;