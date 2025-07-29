import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import './VideoStudio.css';

const VideoStudio = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');
  const [currentStep, setCurrentStep] = useState('ready'); // ready, recording, preview
  
  // États pour les périphériques
  const [devices, setDevices] = useState({ videoDevices: [], audioDevices: [] });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

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
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      setDevices({ videoDevices, audioDevices });
      
      // Sélectionner les premiers périphériques par défaut
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
  }, );

  // Démarrer l'enregistrement
  const handleStartRecording = () => {
    setCapturing(true);
    setCurrentStep('recording');
    setRecordedChunks([]);
    
    // Vérifier que le stream existe et est valide
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
        setCurrentStep('ready');
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
            // Prévisualisation de la vidéo enregistrée
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
            </div>
          ) : (
            // Webcam en direct
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
              
              {/* Bouton paramètres périphériques */}
              <button 
                className="device-settings-btn"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                title="Paramètres périphériques"
              >
                ⚙️
              </button>
              
              {/* Panel de sélection des périphériques */}
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
                onClick={handleStartRecording}
                className="btn btn-primary btn-large"
              >
                🎥 Start Recording
              </button>
              <p className="help-text">
                Click to start your video presentation
              </p>
            </div>
          )}

          {currentStep === 'recording' && (
            <div className="controls-recording">
              <button 
                onClick={handleStopRecording}
                className="btn btn-danger btn-large"
              >
                ⏹️ Stop Recording
              </button>
              <p className="help-text">
                Present yourself professionally
              </p>
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
      </div>

      {/* Statut */}
      <div className="status-bar">
        <div className="status-steps">
          <span className={`step ${currentStep === 'ready' ? 'active' : ''}`}>
            1. Ready
          </span>
          <span className={`step ${currentStep === 'recording' ? 'active' : ''}`}>
            2. Recording
          </span>
          <span className={`step ${currentStep === 'preview' ? 'active' : ''}`}>
            3. Preview
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;