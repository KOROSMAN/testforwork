import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import './VideoStudio.css';

const VideoStudio = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');
  const [currentStep, setCurrentStep] = useState('ready'); // ready, quality-check, recording, preview
  
  // États pour les périphériques
  const [devices, setDevices] = useState({ videoDevices: [], audioDevices: [] });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  
  // États pour les tests qualité
  const [qualityScore, setQualityScore] = useState(0);
  const [isQualityReady, setIsQualityReady] = useState(false);
  const [qualityDetails, setQualityDetails] = useState({
    face: { score: 0, status: 'checking', message: 'Detecting camera...' },
    lighting: { score: 0, status: 'checking', message: 'Analyzing lighting...' },
    audio: { score: 0, status: 'checking', message: 'Testing audio...' },
    positioning: { score: 0, status: 'checking', message: 'Checking position...' }
  });
  
  // Références pour l'analyse audio
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const [microphoneConnected, setMicrophoneConnected] = useState(true);
  const [lastAudioLevel, setLastAudioLevel] = useState(0);

  // Configuration webcam
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
    deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined
  };

  const audioConstraints = {
    deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
  };

  // Récupérer la liste des périphériques
  const getDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      const audioDevices = deviceList.filter(device => device.kind === 'audioinput');
      
      setDevices({ videoDevices, audioDevices });
      
      if (videoDevices.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  // Charger les périphériques au montage du composant
  React.useEffect(() => {
    getDevices();
  },);

  // Setup de l'analyse audio avec détection de déconnexion
  const setupAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      
      microphone.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Détecter les changements d'état du microphone
      stream.getAudioTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log('Microphone disconnected');
          setMicrophoneConnected(false);
        });
        
        track.addEventListener('mute', () => {
          console.log('Microphone muted');
          setMicrophoneConnected(false);
        });
        
        track.addEventListener('unmute', () => {
          console.log('Microphone unmuted');
          setMicrophoneConnected(true);
        });
      });
      
      setMicrophoneConnected(true);
      console.log('Audio analysis ready!');
    } catch (error) {
      console.error('Audio setup error:', error);
      setMicrophoneConnected(false);
    }
  };

  // Analyser la détection faciale (beaucoup plus strict)
  const analyzeFaceDetection = (videoElement) => {
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
      return { score: 0, status: 'error', message: 'Camera not ready' };
    }

    try {
      // Créer un canvas pour analyser l'image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 120;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Analyser la variance des pixels (détecte si image figée ou noire)
      let totalVariance = 0;
      let averageBrightness = 0;
      let pixelCount = 0;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r + g + b) / 3;
        averageBrightness += brightness;
        pixelCount++;
      }
      
      averageBrightness = averageBrightness / pixelCount;
      
      // Calculer la variance pour détecter du mouvement/contenu
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r + g + b) / 3;
        totalVariance += Math.pow(brightness - averageBrightness, 2);
      }
      
      const variance = totalVariance / pixelCount;
      
      // Détection basée sur variance et luminosité
      let score = 0;
      let status = 'error';
      let message = '';
      
      if (averageBrightness < 10) {
        // Image très sombre ou noire
        score = 5;
        status = 'error';
        message = 'Camera blocked or very dark (5%)';
      } else if (variance < 100) {
        // Image uniforme, probablement pas de visage
        score = 25;
        status = 'error';
        message = 'No face detected - Position yourself (25%)';
      } else if (variance < 500) {
        // Peu de détails, visage partiellement visible
        score = 60;
        status = 'warning';
        message = 'Face partially visible (60%)';
      } else {
        // Bonne variance, visage probable
        const qualityScore = Math.min(95, Math.max(70, Math.round(70 + (variance / 50))));
        score = qualityScore;
        status = 'success';
        message = `Face detected ✅ (${score}%)`;
      }
      
      return { score, status, message };
      
    } catch (error) {
      return { score: 0, status: 'error', message: 'Face detection error' };
    }
  };

  // Analyser la luminosité (Canvas API)
  const analyzeLighting = (videoElement) => {
    if (!videoElement || !videoElement.videoWidth) {
      return { score: 0, status: 'checking', message: 'Preparing analysis...' };
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 120;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let brightness = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        brightness += (r + g + b) / 3;
        totalPixels++;
      }
      
      brightness = brightness / totalPixels;
      
      let score = 0;
      let message = '';
      let status = 'warning';
      
      if (brightness < 60) {
        score = Math.round((brightness / 60) * 70); // 0-70
        message = `Too dark (${score}%) - Move to brighter area`;
        status = 'error';
      } else if (brightness > 200) {
        score = Math.round(100 - ((brightness - 200) / 55) * 30); // 70-100
        message = `Too bright (${score}%) - Reduce direct light`;
        status = 'warning';
      } else {
        score = Math.round(70 + ((brightness - 60) / 140) * 30); // 70-100
        message = `Lighting optimal ✅ (${score}%)`;
        status = 'success';
      }
      
      return { 
        score: Math.max(30, Math.min(100, score)), 
        status, 
        message 
      };
    } catch (error) {
      return { score: 50, status: 'warning', message: 'Lighting analysis unavailable' };
    }
  };

  // Analyser l'audio avec vraie détection de déconnexion (amélioré)
  const analyzeAudio = () => {
    // Vérifier si le microphone est connecté
    if (!microphoneConnected) {
      return { 
        score: 0, 
        status: 'error', 
        message: 'Microphone disconnected - Please reconnect and refresh (0%)' 
      };
    }

    if (!analyserRef.current || !audioContextRef.current) {
      return { score: 0, status: 'checking', message: 'Setting up microphone...' };
    }

    try {
      // Vérifier l'état de l'AudioContext
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const maxLevel = Math.max(...dataArray);
      
      // Détection plus fine des problèmes micro
      if (maxLevel === 0 && average === 0) {
        return { 
          score: 0, 
          status: 'error', 
          message: 'Microphone not working - Check connection and permissions (0%)' 
        };
      }
      
      // Détecter si le micro est étouffé (comparaison avec niveau précédent)
      if (lastAudioLevel > 25 && average < 2 && maxLevel < 5) {
        setLastAudioLevel(average);
        return { 
          score: 10, 
          status: 'error', 
          message: 'Microphone blocked or muted - Remove obstruction (10%)' 
        };
      }
      
      // Détecter niveau anormalement bas
      if (average < 1 && maxLevel < 3) {
        setLastAudioLevel(average);
        return { 
          score: 5, 
          status: 'error', 
          message: 'No audio signal - Check microphone settings (5%)' 
        };
      }
      
      setLastAudioLevel(average);
      
      let score = 0;
      let message = '';
      let status = 'warning';
      
      if (average < 5) {
        score = 20;
        message = `Very low audio (${score}%) - Increase microphone volume`;
        status = 'error';
      } else if (average < 12) {
        score = 45;
        message = `Low audio (${score}%) - Speak louder or move closer to mic`;
        status = 'warning';
      } else if (average < 18) {
        score = 65;
        message = `Moderate audio (${score}%) - Good, but could be clearer`;
        status = 'warning';
      } else if (average > 150) {
        score = 40;
        message = `Audio too loud (${score}%) - Reduce volume or move away`;
        status = 'error';
      } else if (average > 110) {
        score = 70;
        message = `Audio loud (${score}%) - Consider reducing volume slightly`;
        status = 'warning';
      } else {
        // Zone optimale : 18-110
        score = Math.round(70 + ((average - 18) / 92) * 30); // 70-100
        message = `Audio excellent ✅ (${score}%)`;
        status = 'success';
      }
      
      return { 
        score: Math.max(5, Math.min(100, score)), 
        status, 
        message 
      };
    } catch (error) {
      console.error('Audio analysis error:', error);
      return { score: 15, status: 'error', message: 'Audio analysis failed - Check microphone' };
    }
  };

  // Analyser le positionnement (plus équilibré)
  const analyzePositioning = (faceScore, lightingScore, videoElement) => {
    if (!videoElement || !videoElement.videoWidth) {
      return { score: 0, status: 'error', message: 'Camera not ready' };
    }

    try {
      // Analyser la stabilité et le centrage basé sur l'image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 120;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Analyser la distribution des pixels pour détecter le centrage
      let leftBrightness = 0, rightBrightness = 0, topBrightness = 0, bottomBrightness = 0;
      let leftPixels = 0, rightPixels = 0, topPixels = 0, bottomPixels = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
          
          // Analyser par zones
          if (x < canvas.width / 2) {
            leftBrightness += brightness;
            leftPixels++;
          } else {
            rightBrightness += brightness;
            rightPixels++;
          }
          
          if (y < canvas.height / 2) {
            topBrightness += brightness;
            topPixels++;
          } else {
            bottomBrightness += brightness;
            bottomPixels++;
          }
        }
      }
      
      leftBrightness /= leftPixels;
      rightBrightness /= rightPixels;
      topBrightness /= topPixels;
      bottomBrightness /= bottomPixels;
      
      // Calculer l'équilibre (centrage) - Seuils plus permissifs
      const horizontalBalance = Math.abs(leftBrightness - rightBrightness);
      const verticalBalance = Math.abs(topBrightness - bottomBrightness);
      const totalImbalance = horizontalBalance + verticalBalance;
      
      // Score basé sur l'équilibre et les autres métriques - Plus tolérant
      let positionScore = 0;
      let status = 'error';
      let message = '';
      
      if (faceScore < 20) {
        // Si pas de visage, position forcément mauvaise
        positionScore = 30;
        status = 'error';
        message = 'No face detected - Cannot assess position (30%)';
      } else if (totalImbalance > 80) {
        // Très très décentré (seuil augmenté de 50 à 80)
        positionScore = 55;
        status = 'warning';
        message = 'Quite off-center - Try to center yourself (55%)';
      } else if (totalImbalance > 40) {
        // Légèrement décentré (seuil augmenté de 25 à 40)
        positionScore = 75;
        status = 'success';
        message = 'Good position ✅ (75%)';
      } else {
        // Bien centré
        const balanceScore = Math.round(90 - (totalImbalance / 2)); // Plus généreux
        const faceBonus = Math.round(faceScore * 0.1); // Bonus réduit
        positionScore = Math.min(95, balanceScore + faceBonus);
        status = 'success';
        message = `Position excellent ✅ (${positionScore}%)`;
      }
      
      return { score: Math.max(30, positionScore), status, message };
      
    } catch (error) {
      // Fallback plus généreux basé sur les autres scores
      const avgScore = Math.round((faceScore + lightingScore) / 2);
      const generousScore = Math.max(65, avgScore); // Score minimum plus élevé
      return { 
        score: generousScore, 
        status: generousScore > 75 ? 'success' : 'warning', 
        message: `Position estimated (${generousScore}%)` 
      };
    }
  };

  // Effectuer toutes les analyses
  const runQualityAnalysis = () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      return;
    }

    const videoElement = webcamRef.current.video;
    
    const faceResult = analyzeFaceDetection(videoElement);
    const lightingResult = analyzeLighting(videoElement);
    const audioResult = analyzeAudio();
    const positioningResult = analyzePositioning(faceResult.score, lightingResult.score, videoElement);

    const newDetails = {
      face: faceResult,
      lighting: lightingResult,
      audio: audioResult,
      positioning: positioningResult
    };

    setQualityDetails(newDetails);

    // Calculer le score global (plus strict)
    const scores = [faceResult.score, lightingResult.score, audioResult.score, positioningResult.score];
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    setQualityScore(avgScore);
    // Seuil plus strict : 80 au lieu de 75
    setIsQualityReady(avgScore >= 80);
  };

  // Passer aux tests qualité
  const handleStartQualityCheck = async () => {
    console.log('Starting quality check...');
    setCurrentStep('quality-check');
    
    // Setup audio analysis
    await setupAudioAnalysis();
    
    // Commencer l'analyse en temps réel
    const analysisInterval = setInterval(() => {
      runQualityAnalysis();
    }, 1000); // Analyse toutes les secondes

    // Nettoyer l'intervalle après 30 secondes ou quand on change d'étape
    setTimeout(() => {
      clearInterval(analysisInterval);
    }, 30000);
  };

  // Démarrer l'enregistrement (après validation qualité)
  const handleStartRecording = () => {
    if (currentStep === 'quality-check' && !isQualityReady) {
      alert('Please improve video quality before recording (score must be 80+)');
      return;
    }

    setCapturing(true);
    setCurrentStep('recording');
    setRecordedChunks([]);
    
    if (webcamRef.current && webcamRef.current.stream) {
      const stream = webcamRef.current.stream;
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "video/webm"
        });
        
        mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
        mediaRecorderRef.current.start();
      } catch (error) {
        console.error('MediaRecorder error:', error);
        alert('Error initializing recording');
        setCapturing(false);
        setCurrentStep('quality-check');
      }
    } else {
      alert('Camera not available. Please allow camera access.');
      setCapturing(false);
      setCurrentStep('ready');
    }
  };

  // Arrêter l'enregistrement
  const handleStopRecording = () => {
    setCapturing(false);
    setCurrentStep('preview');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Gérer les données vidéo
  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      setRecordedChunks((prev) => prev.concat(event.data));
    }
  };

  // Créer l'URL de la vidéo enregistrée
  React.useEffect(() => {
    if (recordedChunks.length > 0 && currentStep === 'preview') {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    }
  }, [recordedChunks, currentStep]);

  // Recommencer
  const handleReset = () => {
    setCurrentStep('ready');
    setRecordedChunks([]);
    setRecordedVideoUrl('');
    setQualityScore(0);
    setIsQualityReady(false);
    setMicrophoneConnected(true);
    setLastAudioLevel(0);
    setQualityDetails({
      face: { score: 0, status: 'checking', message: 'Detecting camera...' },
      lighting: { score: 0, status: 'checking', message: 'Analyzing lighting...' },
      audio: { score: 0, status: 'checking', message: 'Testing audio...' },
      positioning: { score: 0, status: 'checking', message: 'Checking position...' }
    });
    
    // Nettoyer l'audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  };

  // Valider l'enregistrement
  const handleValidate = () => {
    alert('Video saved successfully! (Feature 2: Backend storage coming soon)');
    handleReset();
  };

  return (
    <div className="video-studio">
      <div className="video-studio-header">
        <h1>JOBGATE Video Studio</h1>
        <p>Record your professional presentation video</p>
      </div>

      <div className="video-studio-content">
        {/* Zone vidéo */}
        <div className="video-container">
          {currentStep === 'preview' ? (
            <div className="video-preview">
              <video
                src={recordedVideoUrl}
                controls
                width="640"
                height="480"
                className="recorded-video"
              />
              <div className="preview-overlay">
                <span className="preview-label">Preview</span>
              </div>

        {/* Conseils professionnels - Pendant Quality Check ET Recording */}
        {(currentStep === 'quality-check' || currentStep === 'recording') && (
          <div style={{
            padding: '16px', 
            margin: '20px 0',
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', 
            borderRadius: '12px', 
            border: '1px solid #cbd5e0'
          }}>
            <h4 style={{color: '#2d3748', marginBottom: '12px', fontSize: '1rem'}}>
              🎯 Professional Recording Tips
            </h4>
            <div style={{display: 'grid', gap: '8px', fontSize: '0.85rem', color: '#4a5568'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <span>👤</span>
                <span><em>Try to stay centered in the frame for better presence</em></span>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <span>💡</span>
                <span><em>Natural lighting from a window works better than overhead lights</em></span>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <span>🎤</span>
                <span><em>Speak clearly and at normal volume - avoid whispering or shouting</em></span>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <span>📱</span>
                <span><em>Keep your device stable and at eye level for professional appearance</em></span>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <span>👔</span>
                <span><em>Maintain good posture and make eye contact with the camera</em></span>
              </div>
            </div>
          </div>
        )}
            </div>
          ) : (
            <div className="webcam-container">
              <Webcam
                ref={webcamRef}
                audio={true}
                height={480}
                width={640}
                videoConstraints={videoConstraints}
                audioConstraints={audioConstraints}
                className="webcam"
                muted={true}
              />
              {capturing && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>Recording in progress...</span>
                </div>
              )}
              
              <button 
                className="device-settings-btn"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                title="Device Settings"
              >
                ⚙️
              </button>
              
              {showDeviceSettings && (
                <div className="device-settings-panel">
                  <h4>Device Settings</h4>
                  
                  <div className="device-group">
                    <label>Camera:</label>
                    <select 
                      value={selectedVideoDevice} 
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    >
                      {devices.videoDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="device-group">
                    <label>Microphone:</label>
                    <select 
                      value={selectedAudioDevice} 
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    >
                      {devices.audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowDeviceSettings(false)}
                  >
                    ✅ Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="controls-container">
          {currentStep === 'ready' && (
            <div className="controls-ready">
              <button 
                onClick={handleStartQualityCheck}
                className="btn btn-primary btn-large"
              >
                🤖 Start AI Quality Check
              </button>
              <p className="help-text">
                AI will analyze your setup before recording
              </p>
            </div>
          )}

          {currentStep === 'quality-check' && (
            <div className="controls-quality">
              <button 
                onClick={handleStartRecording}
                className={`btn btn-large ${isQualityReady ? 'btn-success' : 'btn-secondary'}`}
                disabled={!isQualityReady}
              >
                {isQualityReady ? '🎥 Start Recording' : '⏳ Improve Quality First'}
              </button>
              <button 
                onClick={handleReset}
                className="btn btn-secondary"
              >
                🔄 Skip AI Tests
              </button>
              <p className="help-text">
                {isQualityReady 
                  ? 'Excellent! You\'re ready to record a professional video'
                  : `Current score: ${qualityScore}/100 (need 80+)`
                }
              </p>
            </div>
          )}

          {currentStep === 'recording' && (
  <div className="controls-recording">
    <button 
      onClick={handleStopRecording}
      className="btn btn-danger btn-large">
      ⏹️ Stop Recording
    </button>
    <p className="help-text">
      Present yourself professionally
    </p>

    <div style={{
      padding: '16px', 
      margin: '20px 0',
      background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', 
      borderRadius: '12px', 
      border: '1px solid #cbd5e0'
    }}>
      <h4 style={{color: '#2d3748', marginBottom: '12px', fontSize: '1rem'}}>
        🎯 Professional Recording Tips
      </h4>
      <div style={{display: 'grid', gap: '8px', fontSize: '0.85rem', color: '#4a5568'}}>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
          <span>👤</span>
          <span><em>Try to stay centered in the frame for better presence</em></span>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
          <span>💡</span>
          <span><em>Natural lighting from a window works better than overhead lights</em></span>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
          <span>🎤</span>
          <span><em>Speak clearly and at normal volume - avoid whispering or shouting</em></span>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
          <span>📱</span>
          <span><em>Keep your device stable and at eye level for professional appearance</em></span>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
          <span>👔</span>
          <span><em>Maintain good posture and make eye contact with the camera</em></span>
        </div>
      </div>
    </div>
  </div>
)}


          

          {currentStep === 'preview' && (
            <div className="controls-preview">
              <button 
                onClick={handleValidate}
                className="btn btn-success"
              >
                ✅ Validate this video
              </button>
              <button 
                onClick={handleReset}
                className="btn btn-secondary"
              >
                🔄 Record again
              </button>
              <p className="help-text">
                Are you satisfied with your recording?
              </p>
            </div>
          )}
        </div>

        {/* Interface qualité - SEULEMENT pendant quality-check */}
        {currentStep === 'quality-check' && (
          <div style={{
            background: 'white', 
            padding: '20px', 
            margin: '20px 0', 
            borderRadius: '12px',
            border: '2px solid #1B73E8',
            boxShadow: '0 4px 20px rgba(27, 115, 232, 0.1)'
          }}>
            <h3 style={{color: '#1B73E8', marginBottom: '20px'}}>🔍 AI Quality Analysis</h3>
            
            <div style={{display: 'grid', gap: '15px', marginBottom: '20px'}}>
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px', 
                background: qualityDetails.face.status === 'success' ? '#f0fff4' : qualityDetails.face.status === 'warning' ? '#fffbf0' : '#fef5f5', 
                borderRadius: '8px', 
                border: `1px solid ${qualityDetails.face.status === 'success' ? '#38a169' : qualityDetails.face.status === 'warning' ? '#ed8936' : '#e53e3e'}`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span>👤 Face Detection</span>
                  <span style={{fontWeight: 'bold', color: qualityDetails.face.status === 'success' ? '#38a169' : qualityDetails.face.status === 'warning' ? '#ed8936' : '#e53e3e'}}>
                    {qualityDetails.face.score}% {qualityDetails.face.status === 'success' ? '✅' : qualityDetails.face.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                </div>
                <span style={{fontSize: '0.8rem', color: '#666', fontStyle: 'italic'}}>
                  Look directly at the camera
                </span>
              </div>
              
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px', 
                background: qualityDetails.lighting.status === 'success' ? '#f0fff4' : qualityDetails.lighting.status === 'warning' ? '#fffbf0' : '#fef5f5', 
                borderRadius: '8px', 
                border: `1px solid ${qualityDetails.lighting.status === 'success' ? '#38a169' : qualityDetails.lighting.status === 'warning' ? '#ed8936' : '#e53e3e'}`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span>💡 Lighting</span>
                  <span style={{fontWeight: 'bold', color: qualityDetails.lighting.status === 'success' ? '#38a169' : qualityDetails.lighting.status === 'warning' ? '#ed8936' : '#e53e3e'}}>
                    {qualityDetails.lighting.score}% {qualityDetails.lighting.status === 'success' ? '✅' : qualityDetails.lighting.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                </div>
                <span style={{fontSize: '0.8rem', color: '#666', fontStyle: 'italic'}}>
                  Face a window for natural light
                </span>
              </div>
              
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px', 
                background: qualityDetails.audio.status === 'success' ? '#f0fff4' : qualityDetails.audio.status === 'warning' ? '#fffbf0' : '#fef5f5', 
                borderRadius: '8px', 
                border: `1px solid ${qualityDetails.audio.status === 'success' ? '#38a169' : qualityDetails.audio.status === 'warning' ? '#ed8936' : '#e53e3e'}`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span>🎤 Audio Level</span>
                  <span style={{fontWeight: 'bold', color: qualityDetails.audio.status === 'success' ? '#38a169' : qualityDetails.audio.status === 'warning' ? '#ed8936' : '#e53e3e'}}>
                    {qualityDetails.audio.score}% {qualityDetails.audio.status === 'success' ? '✅' : qualityDetails.audio.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                </div>
                <span style={{fontSize: '0.8rem', color: '#666', fontStyle: 'italic'}}>
                  Speak louder or move closer to mic
                </span>
              </div>
              
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px', 
                background: qualityDetails.positioning.status === 'success' ? '#f0fff4' : qualityDetails.positioning.status === 'warning' ? '#fffbf0' : '#fef5f5', 
                borderRadius: '8px', 
                border: `1px solid ${qualityDetails.positioning.status === 'success' ? '#38a169' : qualityDetails.positioning.status === 'warning' ? '#ed8936' : '#e53e3e'}`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span>📍 Positioning</span>
                  <span style={{fontWeight: 'bold', color: qualityDetails.positioning.status === 'success' ? '#38a169' : qualityDetails.positioning.status === 'warning' ? '#ed8936' : '#e53e3e'}}>
                    {qualityDetails.positioning.score}% {qualityDetails.positioning.status === 'success' ? '✅' : qualityDetails.positioning.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                </div>
                <span style={{fontSize: '0.8rem', color: '#666', fontStyle: 'italic'}}>
                  Stay centered in frame
                </span>
              </div>
            </div>

            <div style={{textAlign: 'center', marginBottom: '20px'}}>
              <div style={{
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: isQualityReady ? 'linear-gradient(135deg, #38a169, #48bb78)' : 'linear-gradient(135deg, #e53e3e, #fc8181)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                boxShadow: '0 4px 20px rgba(56, 161, 105, 0.3)'
              }}>
                <span style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{qualityScore}</span>
                <span style={{fontSize: '0.9rem'}}>/100</span>
              </div>
              <p style={{color: isQualityReady ? '#38a169' : '#e53e3e', fontWeight: 'bold', margin: 0}}>
                {isQualityReady ? '✅ Ready to record!' : '⚠️ Improve quality first'}
              </p>
            </div>

            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
              <button 
                onClick={() => runQualityAnalysis()}
                style={{
                  padding: '12px 24px', 
                  background: '#1B73E8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Analysis
              </button>
            </div>

            {/* Messages d'aide dynamiques */}
            <div style={{marginTop: '15px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e'}}>
              <strong>💡 Current Suggestions:</strong>
              <ul style={{margin: '8px 0', paddingLeft: '16px'}}>
                {qualityDetails.lighting.status !== 'success' && (
                  <li>{qualityDetails.lighting.message}</li>
                )}
                {qualityDetails.audio.status !== 'success' && (
                  <li>{qualityDetails.audio.message}</li>
                )}
                {qualityDetails.face.status !== 'success' && (
                  <li>{qualityDetails.face.message}</li>
                )}
                {qualityDetails.positioning.status !== 'success' && (
                  <li>{qualityDetails.positioning.message}</li>
                )}
                {isQualityReady && (
                  <li style={{color: '#38a169', fontWeight: 'bold'}}>✅ All systems ready for recording!</li>
                )}
              </ul>
            </div>

        {/* Conseils professionnels - Pendant Quality Check ET Recording */}
          </div>
        )}
      </div>

      {/* Statut */}
      <div className="status-bar">
        <div className="status-steps">
          <span className={`step ${currentStep === 'ready' ? 'active' : ''}`}>
            1. Ready
          </span>
          <span className={`step ${currentStep === 'quality-check' ? 'active' : ''}`}>
            2. AI Quality Check
          </span>
          <span className={`step ${currentStep === 'recording' ? 'active' : ''}`}>
            3. Recording
          </span>
          <span className={`step ${currentStep === 'preview' ? 'active' : ''}`}>
            4. Preview
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;