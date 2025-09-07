import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { videoAPI, qualityAPI, apiUtils, demoConfig } from '../services/api';
import { candidateAPI } from '../services/candidateAPI';
import { notificationAPI } from '../services/notificationAPI';
import './VideoStudio.css';

const VideoStudio = ({
  // Props d'intégration JOBGATE (optionnelles pour notre développement)
  userId = 'demo-user',
  userName = 'Candidat',
  userProfile = null,
  onVideoSaved = null,
  onCVUpdateSuggested = null,
  apiEndpoint = '/api/videos'
}) => {
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
  
  // États pour le timer
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);
  const maxRecordingTime = 90; // 90 secondes
  
  // États pour les instructions interactives
  const [showInstructions, setShowInstructions] = useState(true);
  
  // États pour l'intégration API
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [savedVideos, setSavedVideos] = useState([]);
  const [isVideoSaved, setIsVideoSaved] = useState(false);
  const [isLinkingToCV, setIsLinkingToCV] = useState(false);
  
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

  // Timer pour l'enregistrement
  useEffect(() => {
    if (capturing) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 1;
          
          // Arrêt automatique à 90 secondes
          if (newTime >= maxRecordingTime) {
            handleStopRecording();
            return maxRecordingTime;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [capturing]);

  // Formater le temps pour l'affichage
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Instructions interactives par étape de temps
  const recordingInstructions = [
    {
      timeStart: 0,
      timeEnd: 20,
      title: "Introduction",
      message: "Présentez-vous clairement : nom, formation, année d'étude",
      tip: "Regardez la caméra et souriez !"
    },
    {
      timeStart: 20,
      timeEnd: 45,
      title: "Parcours académique",
      message: "Parlez de votre formation, vos spécialisations et projets marquants",
      tip: "Soyez concret avec des exemples"
    },
    {
      timeStart: 45,
      timeEnd: 70,
      title: "Compétences & motivations", 
      message: "Mettez en avant vos compétences clés et votre motivation professionnelle",
      tip: "Montrez votre passion pour le domaine"
    },
    {
      timeStart: 70,
      timeEnd: 90,
      title: "Conclusion",
      message: "Terminez par vos objectifs professionnels et votre disponibilité",
      tip: "Restez positif et confiant !"
    }
  ];

  // Obtenir l'instruction actuelle basée sur le temps
  const getCurrentInstruction = () => {
    return recordingInstructions.find(
      instruction => recordingTime >= instruction.timeStart && recordingTime < instruction.timeEnd
    ) || recordingInstructions[recordingInstructions.length - 1];
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
  useEffect(() => {
    getDevices();
  }, []);

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

  // Analyser la détection faciale
  const analyzeFaceDetection = (videoElement) => {
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
      return { score: 0, status: 'error', message: 'Camera not ready' };
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 120;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
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
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r + g + b) / 3;
        totalVariance += Math.pow(brightness - averageBrightness, 2);
      }
      
      const variance = totalVariance / pixelCount;
      
      let score = 0;
      let status = 'error';
      let message = '';
      
      if (averageBrightness < 10) {
        score = 5;
        status = 'error';
        message = 'Camera blocked or very dark';
      } else if (variance < 100) {
        score = 25;
        status = 'error';
        message = 'No face detected - Position yourself';
      } else if (variance < 500) {
        score = 60;
        status = 'warning';
        message = 'Face partially visible';
      } else {
        const qualityScore = Math.min(95, Math.max(70, Math.round(70 + (variance / 50))));
        score = qualityScore;
        status = 'success';
        message = 'Face detected';
      }
      
      return { score, status, message };
      
    } catch (error) {
      return { score: 0, status: 'error', message: 'Face detection error' };
    }
  };

  // Analyser la luminosité
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
        score = Math.round((brightness / 60) * 70);
        message = 'Too dark - Move to brighter area';
        status = 'error';
      } else if (brightness > 200) {
        score = Math.round(100 - ((brightness - 200) / 55) * 30);
        message = 'Too bright - Reduce direct light';
        status = 'warning';
      } else {
        score = Math.round(70 + ((brightness - 60) / 140) * 30);
        message = 'Lighting optimal';
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

  // Analyser l'audio
  const analyzeAudio = () => {
    if (!microphoneConnected) {
      return { 
        score: 0, 
        status: 'error', 
        message: 'Microphone disconnected - Please reconnect and refresh' 
      };
    }

    if (!analyserRef.current || !audioContextRef.current) {
      return { score: 0, status: 'checking', message: 'Setting up microphone...' };
    }

    try {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const maxLevel = Math.max(...dataArray);
      
      if (maxLevel === 0 && average === 0) {
        return { 
          score: 0, 
          status: 'error', 
          message: 'Microphone not working - Check connection and permissions' 
        };
      }
      
      if (lastAudioLevel > 25 && average < 2 && maxLevel < 5) {
        setLastAudioLevel(average);
        return { 
          score: 10, 
          status: 'error', 
          message: 'Microphone blocked or muted - Remove obstruction' 
        };
      }
      
      if (average < 1 && maxLevel < 3) {
        setLastAudioLevel(average);
        return { 
          score: 5, 
          status: 'error', 
          message: 'No audio signal - Check microphone settings' 
        };
      }
      
      setLastAudioLevel(average);
      
      let score = 0;
      let message = '';
      let status = 'warning';
      
      if (average < 5) {
        score = 20;
        message = 'Very low audio - Increase microphone volume';
        status = 'error';
      } else if (average < 12) {
        score = 45;
        message = 'Low audio - Speak louder or move closer to mic';
        status = 'warning';
      } else if (average < 18) {
        score = 65;
        message = 'Moderate audio - Good, but could be clearer';
        status = 'warning';
      } else if (average > 150) {
        score = 40;
        message = 'Audio too loud - Reduce volume or move away';
        status = 'error';
      } else if (average > 110) {
        score = 70;
        message = 'Audio loud - Consider reducing volume slightly';
        status = 'warning';
      } else {
        score = Math.round(80 + ((average - 18) / 92) * 20);
        message = 'Audio excellent';
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

  // Analyser le positionnement
  const analyzePositioning = (faceScore, lightingScore, videoElement) => {
    if (!videoElement || !videoElement.videoWidth) {
      return { score: 0, status: 'error', message: 'Camera not ready' };
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 120;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let leftBrightness = 0, rightBrightness = 0, topBrightness = 0, bottomBrightness = 0;
      let leftPixels = 0, rightPixels = 0, topPixels = 0, bottomPixels = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
          
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
      
      const horizontalBalance = Math.abs(leftBrightness - rightBrightness);
      const verticalBalance = Math.abs(topBrightness - bottomBrightness);
      const totalImbalance = horizontalBalance + verticalBalance;
      
      let positionScore = 0;
      let status = 'error';
      let message = '';
      
      if (faceScore < 20) {
        positionScore = 30;
        status = 'error';
        message = 'No face detected - Cannot assess position';
      } else if (totalImbalance > 80) {
        positionScore = 55;
        status = 'warning';
        message = 'Quite off-center - Try to center yourself';
      } else if (totalImbalance > 40) {
        positionScore = 75;
        status = 'success';
        message = 'Good position';
      } else {
        const balanceScore = Math.round(90 - (totalImbalance / 2));
        const faceBonus = Math.round(faceScore * 0.1);
        positionScore = Math.min(95, balanceScore + faceBonus);
        status = 'success';
        message = 'Position excellent';
      }
      
      return { score: Math.max(30, positionScore), status, message };
      
    } catch (error) {
      const avgScore = Math.round((faceScore + lightingScore) / 2);
      const generousScore = Math.max(65, avgScore);
      return { 
        score: generousScore, 
        status: generousScore > 75 ? 'success' : 'warning', 
        message: 'Position estimated' 
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

    const scores = [faceResult.score, lightingResult.score, audioResult.score, positioningResult.score];
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    setQualityScore(avgScore);
    setIsQualityReady(avgScore >= 80);
  };

  // Passer aux tests qualité
  const handleStartQualityCheck = async () => {
    console.log('Starting quality check...');
    setCurrentStep('quality-check');
    
    await setupAudioAnalysis();
    
    const analysisInterval = setInterval(() => {
      runQualityAnalysis();
    }, 1000);

    setTimeout(() => {
      clearInterval(analysisInterval);
    }, 30000);
  };

  // Démarrer l'enregistrement
  const handleStartRecording = () => {
    if (currentStep === 'quality-check' && !isQualityReady) {
      alert('Please improve video quality before recording (score must be 80+)');
      return;
    }

    setCapturing(true);
    setCurrentStep('recording');
    setRecordedChunks([]);
    setRecordingTime(0);
    setShowInstructions(true);
    
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
  useEffect(() => {
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
    setRecordingTime(0);
    setCurrentVideoId(null);
    setIsUploading(false);
    setUploadProgress(0);
    setApiError(null);
    setIsVideoSaved(false);
    setIsLinkingToCV(false);
    setQualityDetails({
      face: { score: 0, status: 'checking', message: 'Detecting camera...' },
      lighting: { score: 0, status: 'checking', message: 'Analyzing lighting...' },
      audio: { score: 0, status: 'checking', message: 'Testing audio...' },
      positioning: { score: 0, status: 'checking', message: 'Checking position...' }
    });
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  };

  // Valider et sauvegarder l'enregistrement
  const handleValidate = async () => {
    if (recordedChunks.length === 0) {
      alert('Aucune vidéo à sauvegarder');
      return;
    }

    setIsUploading(true);
    
    try {
      // Créer le blob et le fichier
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const fileName = `video-presentation-${Date.now()}.webm`;
      const videoFile = apiUtils.blobToFile(blob, fileName);

      // Préparer les données pour l'API
      const formData = apiUtils.createFormData(videoFile, {
        title: demoConfig.defaultTitle,
        user_id: demoConfig.defaultUserId,
        duration: recordingTime,
        file_size: blob.size,
        format: 'webm',
        overall_quality_score: qualityScore
      });

      // Upload vers l'API
      console.log('Uploading video to API...');
      const uploadResponse = await videoAPI.uploadVideo(formData);
      
      console.log('Video uploaded successfully:', uploadResponse);
      
      // Sauvegarder les tests qualité si on a un ID vidéo
      if (uploadResponse.video_id) {
        await qualityAPI.updateQualityChecks(uploadResponse.video_id, qualityDetails);
      }

      setCurrentVideoId(uploadResponse.video_id);
      setIsVideoSaved(true);
      
      // Callback optionnel pour l'intégration JOBGATE
      if (onVideoSaved) {
        onVideoSaved({
          videoId: uploadResponse.video_id,
          videoUrl: uploadResponse.video_url,
          qualityScore: qualityScore,
          duration: recordingTime
        });
      }

      alert('Vidéo sauvegardée avec succès !');
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorInfo = apiUtils.handleApiError(error);
      setApiError(errorInfo.message);
      alert(`Erreur lors de la sauvegarde: ${errorInfo.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Lier la vidéo au CV
  const handleLinkToCV = async () => {
    if (!currentVideoId) {
      alert('Aucune vidéo à lier');
      return;
    }

    setIsLinkingToCV(true);
    
    try {
      console.log('Linking video to CV...');
      const response = await videoAPI.linkToCV(currentVideoId);
      
      console.log('Video linked to CV successfully:', response);
      
      // Callback optionnel pour l'intégration JOBGATE
      if (onCVUpdateSuggested) {
        onCVUpdateSuggested({
          videoId: currentVideoId,
          suggestion: 'Votre vidéo de présentation a été liée à votre CV avec succès !'
        });
      }

      alert('Vidéo liée au CV avec succès ! 🎉\n\nVotre profil candidat est maintenant enrichi avec votre vidéo de présentation.');
      
      // Optionnel : reset après liaison réussie
      handleReset();
      
    } catch (error) {
      console.error('Link to CV error:', error);
      const errorInfo = apiUtils.handleApiError(error);
      setApiError(errorInfo.message);
      alert(`Erreur lors de la liaison au CV: ${errorInfo.message}`);
    } finally {
      setIsLinkingToCV(false);
    }
  };

  return (
    <div className="video-studio">
      <div className="video-studio-header">
        <h1>JOBGATE Video Studio</h1>
        <p>Record your professional presentation video</p>
        {apiError && (
          <div style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>
            ⚠️ API Error: {apiError}
          </div>
        )}
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
              
              {/* Timer pendant l'enregistrement */}
              {capturing && (
                <div className="recording-timer">
                  <div className="timer-display">
                    <span className="timer-text">{formatTime(recordingTime)} / {formatTime(maxRecordingTime)}</span>
                    <div className="timer-bar">
                      <div 
                        className="timer-progress" 
                        style={{ width: `${(recordingTime / maxRecordingTime) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton pour réafficher les instructions si masquées */}
              {capturing && !showInstructions && (
                <button 
                  className="show-instructions-btn"
                  onClick={() => setShowInstructions(true)}
                  title="Afficher les instructions"
                >
                  💬
                </button>
              )}
              
              {capturing && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>Recording in progress</span>
                </div>
              )}
              
              <button 
                className="device-settings-btn"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                title="Device Settings"
              >
                ⚙
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
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions interactives SOUS la vidéo pendant l'enregistrement */}
        {capturing && showInstructions && (
          <div className="interactive-instructions-bottom">
            <div className="instruction-content">
              <div className="instruction-header">
                <span className="instruction-step">{getCurrentInstruction().title}</span>
                <button 
                  className="toggle-instructions-btn"
                  onClick={() => setShowInstructions(false)}
                  title="Masquer les instructions"
                >
                  ×
                </button>
              </div>
              <div className="instruction-message">
                {getCurrentInstruction().message}
              </div>
              <div className="instruction-tip">
                💡 {getCurrentInstruction().tip}
              </div>
              <div className="instruction-progress">
                <div className="progress-steps">
                  {recordingInstructions.map((instruction, index) => (
                    <div 
                      key={index}
                      className={`progress-step ${
                        recordingTime >= instruction.timeStart ? 'completed' : ''
                      } ${
                        recordingTime >= instruction.timeStart && recordingTime < instruction.timeEnd ? 'active' : ''
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bouton pour réafficher les instructions si masquées */}
        {capturing && !showInstructions && (
          <div className="show-instructions-bottom">
            <button 
              className="show-instructions-btn-bottom"
              onClick={() => setShowInstructions(true)}
              title="Afficher les instructions"
            >
              💬 Afficher le guide
            </button>
          </div>
        )}

        {/* Contrôles */}
        <div className="controls-container">
          {currentStep === 'ready' && (
            <div className="controls-ready">
              <button 
                onClick={handleStartQualityCheck}
                className="btn btn-primary btn-large"
                disabled={isUploading}
              >
                Start Quality Check
              </button>
              <p className="help-text">
                AI will analyze your setup before recording
              </p>
              
              {/* Brief en dessous du texte d'aide */}
              <div className="recording-brief-bottom">
                <h4>Guide de présentation (90 secondes)</h4>
                <div className="brief-steps-horizontal">
                  <span className="brief-step-compact">0-20s: Présentez-vous (nom, formation, année)</span>
                  <span className="brief-step-compact">20-45s: Parcours académique et projets</span>
                  <span className="brief-step-compact">45-70s: Compétences clés et motivations</span>
                  <span className="brief-step-compact">70-90s: Objectifs et disponibilité</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'quality-check' && (
            <div className="controls-quality">
              <button 
                onClick={handleStartRecording}
                className={`btn btn-large ${isQualityReady ? 'btn-success' : 'btn-secondary'}`}
                disabled={!isQualityReady || isUploading}
              >
                {isQualityReady ? 'Start Recording' : 'Improve Quality First'}
              </button>
              <button 
                onClick={handleReset}
                className="btn btn-secondary"
                disabled={isUploading}
              >
                Skip Tests
              </button>
              <p className="help-text">
                {isQualityReady 
                  ? 'Ready to record professional video'
                  : `Current score: ${qualityScore}/100 (need 80+)`
                }
              </p>
            </div>
          )}

          {currentStep === 'recording' && (
            <div className="controls-recording">
              <button 
                onClick={handleStopRecording}
                className="btn btn-danger btn-large"
                disabled={isUploading}
              >
                Stop Recording
              </button>
              <p className="help-text">
                Present yourself professionally
              </p>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="controls-preview">
              {!isVideoSaved ? (
                <>
                  <button 
                    onClick={handleValidate}
                    className="btn btn-success"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleReset}
                    className="btn btn-secondary"
                    disabled={isUploading}
                  >
                    Record Again
                  </button>
                  {isUploading && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#1B73E8' }}>
                      📤 Uploading to JOBGATE servers...
                    </div>
                  )}
                  <p className="help-text">
                    {isUploading 
                      ? 'Saving your video...' 
                      : 'Are you satisfied with your recording?'
                    }
                  </p>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleLinkToCV}
                    className="btn btn-primary"
                    disabled={isLinkingToCV}
                  >
                    {isLinkingToCV ? 'Linking...' : '🔗 Link to CV Profile'}
                  </button>
                  <button 
                    onClick={handleReset}
                    className="btn btn-secondary"
                    disabled={isLinkingToCV}
                  >
                    Record New Video
                  </button>
                  {isLinkingToCV && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#1B73E8' }}>
                      🔗 Linking video to your CV profile...
                    </div>
                  )}
                  <p className="help-text">
                    {isLinkingToCV 
                      ? 'Updating your profile with the video...' 
                      : 'Video saved! Link it to your CV to complete your profile.'
                    }
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Interface qualité */}
        {currentStep === 'quality-check' && (
          <div className="quality-analysis-panel">
            <h3>Quality Analysis</h3>
            
            <div className="quality-checks-grid">
              <div className={`quality-check ${qualityDetails.face.status}`}>
                <div className="check-header">
                  <span className="check-label">Face Detection</span>
                  <span className="check-score">{qualityDetails.face.score}%</span>
                </div>
                <div className="check-message">{qualityDetails.face.message}</div>
              </div>
              
              <div className={`quality-check ${qualityDetails.lighting.status}`}>
                <div className="check-header">
                  <span className="check-label">Lighting</span>
                  <span className="check-score">{qualityDetails.lighting.score}%</span>
                </div>
                <div className="check-message">{qualityDetails.lighting.message}</div>
              </div>
              
              <div className={`quality-check ${qualityDetails.audio.status}`}>
                <div className="check-header">
                  <span className="check-label">Audio Level</span>
                  <span className="check-score">{qualityDetails.audio.score}%</span>
                </div>
                <div className="check-message">{qualityDetails.audio.message}</div>
              </div>
              
              <div className={`quality-check ${qualityDetails.positioning.status}`}>
                <div className="check-header">
                  <span className="check-label">Positioning</span>
                  <span className="check-score">{qualityDetails.positioning.score}%</span>
                </div>
                <div className="check-message">{qualityDetails.positioning.message}</div>
              </div>
            </div>

            <div className="overall-score-section">
              <div className={`overall-score ${isQualityReady ? 'ready' : 'not-ready'}`}>
                <span className="score-number">{qualityScore}</span>
                <span className="score-label">/100</span>
              </div>
              <p className="score-status">
                {isQualityReady ? 'Ready to record' : 'Improve quality first'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Statut */}
      <div className="status-bar">
        <div className="status-steps">
          <span className={`step ${currentStep === 'ready' ? 'active' : ''}`}>
            Ready
          </span>
          <span className={`step ${currentStep === 'quality-check' ? 'active' : ''}`}>
            Quality Check
          </span>
          <span className={`step ${currentStep === 'recording' ? 'active' : ''}`}>
            Recording
          </span>
          <span className={`step ${currentStep === 'preview' ? 'active' : ''}`}>
            Preview
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;