import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  Typography, 
  CircularProgress, 
  Tabs, 
  Tab,
  Card,
  CardContent,
  Stack,
  Tooltip
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Videocam as VideoIcon,
  FlipCameraIos as FlipCameraIcon,
  PhotoLibrary as GalleryIcon,
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  PhotoCamera as PhotoIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import './UserMediaCapture.css';

/**
 * UserMediaCapture Component
 * 
 * Provides user media capture capabilities including:
 * - Photo capture from camera
 * - Video recording
 * - File upload (photo/video)
 * - Camera selection and flipping
 */
const UserMediaCapture = ({
  onMediaCaptured,
  onMediaProcessing,
  captureType = 'all', // 'photo', 'video', or, 'all'
  maxVideoDuration = 10, // seconds
  aspectRatio = 4/3,
  buttonText = 'Capture'
}) => {
  // State
  const [activeTab, setActiveTab] = useState('camera');
  const [captureMode, setCaptureMode] = useState('photo');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [countdown, setCountdown] = useState(0);
  const [countdownTimer, setCountdownTimer] = useState(null);
  const [camPermissionError, setCamPermissionError] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Refs
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  
  // Enable only camera or video based on prop
  useEffect(() => {
    if (captureType === 'photo') {
      setCaptureMode('photo');
    } else if (captureType === 'video') {
      setCaptureMode('video');
    }
  }, [captureType]);
  
  // Initialize camera
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
        setCamPermissionError(true);
      } finally {
        setIsCameraLoading(false);
      }
    };
    
    enumerateDevices();
    
    return () => {
      // Clean up timers
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
      
      // Stop any active media streams
      if (webcamRef.current && webcamRef.current.stream) {
        const tracks = webcamRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Handle recording timer
  useEffect(() => {
    if (isRecording && recordingTime >= maxVideoDuration) {
      stopRecording();
    }
  }, [recordingTime, maxVideoDuration, isRecording]);
  
  // Handle tab change
  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    // Reset captured media when changing tabs
    setCapturedMedia(null);
    setIsCapturing(false);
    setUploadError('');
  };
  
  // Handle capture mode change (photo/video)
  const handleCaptureModeChange = (mode) => {
    if (captureType !== 'all' && mode !== captureType) return;
    
    setCaptureMode(mode);
    // Reset captured media when changing mode
    setCapturedMedia(null);
    setIsCapturing(false);
  };
  
  // Flip camera (front/back)
  const flipCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };
  
  // Select a specific camera device
  const selectCamera = (deviceId) => {
    setSelectedCamera(deviceId);
  };
  
  // Create video constraints based on selected device and facing mode
  const getVideoConstraints = () => {
    if (selectedCamera) {
      return {
        deviceId: { exact: selectedCamera },
        aspectRatio
      };
    }
    
    return {
      facingMode,
      aspectRatio
    };
  };
  
  // Start countdown for photo capture
  const startCountdown = (seconds = 3) => {
    setCountdown(seconds);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Capture photo when countdown reaches 0
          if (captureMode === 'photo') {
            capturePhoto();
          } else {
            startRecording();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownTimer(timer);
  };
  
  // Capture photo from webcam
  const capturePhoto = () => {
    if (!webcamRef.current) return;
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedMedia({ type: 'photo', src: imageSrc });
      setIsCapturing(false);
    } catch (err) {
      console.error('Error capturing photo:', err);
    }
  };
  
  // Start video recording
  const startRecording = () => {
    if (!webcamRef.current || !webcamRef.current.stream) return;
    
    recordedChunksRef.current = [];
    
    try {
      const stream = webcamRef.current.stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Set up timer to track recording duration
      const timer = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      
      setRecordingTimer(timer);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };
  
  // Stop video recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    mediaRecorderRef.current.stop();
    
    // Clear recording timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
  };
  
  // Handle recording stop event
  const handleRecordingStop = () => {
    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      
      setCapturedMedia({ type: 'video', src: videoUrl, blob });
      setIsRecording(false);
      recordedChunksRef.current = [];
    } catch (err) {
      console.error('Error handling recording stop:', err);
    }
  };
  
  // Format recording time (seconds to MM:SS)
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Trigger file input click for upload
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadError('');
    
    // Check file type
    const fileType = file.type.split('/')[0];
    if (captureType === 'photo' && fileType !== 'image') {
      setUploadError('Please upload an image file');
      return;
    }
    
    if (captureType === 'video' && fileType !== 'video') {
      setUploadError('Please upload a video file');
      return;
    }
    
    if (captureType === 'all' && fileType !== 'image' && fileType !== 'video') {
      setUploadError('Please upload an image or video file');
      return;
    }
    
    // Create URL for the file
    const fileUrl = URL.createObjectURL(file);
    setCapturedMedia({ 
      type: fileType === 'image' ? 'photo' : 'video',
      src: fileUrl,
      file
    });
  };
  
  // Reset capture (discard captured media)
  const resetCapture = () => {
    setCapturedMedia(null);
    setIsCapturing(false);
    setUploadError('');
  };
  
  // Handle submitting captured media for processing
  const handleMediaSubmit = () => {
    if (!capturedMedia) return;
    
    if (onMediaProcessing) {
      onMediaProcessing(true);
    }
    
    if (onMediaCaptured) {
      onMediaCaptured(capturedMedia);
    }
  };
  
  return (
    <Card className="media-capture-container">
      <CardContent className="media-capture-content">
        {/* Capture Mode Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          className="capture-tabs"
        >
          <Tab icon={<CameraIcon />} label="Camera" value="camera" />
          <Tab icon={<GalleryIcon />} label="Upload" value="upload" />
        </Tabs>
        
        {/* Camera Tab */}
        {activeTab === 'camera' && (
          <Box className="camera-container">
            {/* Camera View */}
            <Box className="camera-view-container">
              {isCameraLoading ? (
                <Box className="camera-loading">
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Starting camera...
                  </Typography>
                </Box>
              ) : camPermissionError ? (
                <Box className="camera-error">
                  <Typography color="error">
                    Camera access denied. Please check your browser permissions.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Webcam Component */}
                  <Webcam
                    audio={captureMode === 'video'}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={getVideoConstraints()}
                    className="webcam"
                    mirrored={facingMode === 'user'}
                    onUserMedia={() => setIsCameraLoading(false)}
                    onUserMediaError={() => setCamPermissionError(true)}
                  />
                  
                  {/* Countdown Overlay */}
                  {countdown > 0 && (
                    <Box className="countdown-overlay">
                      <Typography variant="h2">{countdown}</Typography>
                    </Box>
                  )}
                  
                  {/* Recording Indicator */}
                  {isRecording && (
                    <Box className="recording-indicator">
                      <RecordIcon color="error" className="recording-icon" />
                      <Typography variant="body2" color="error">
                        {formatRecordingTime(recordingTime)} / {formatRecordingTime(maxVideoDuration)}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
            
            {/* Camera Controls */}
            {!camPermissionError && !isCameraLoading && (
              <Box className="camera-controls">
                {captureType === 'all' && (
                  <Stack direction="row" spacing={1} className="mode-toggle">
                    <Button 
                      variant={captureMode === 'photo' ? 'contained' : 'outlined'}
                      onClick={() => handleCaptureModeChange('photo')}
                      startIcon={<PhotoIcon />}
                      size="small"
                    >
                      Photo
                    </Button>
                    <Button 
                      variant={captureMode === 'video' ? 'contained' : 'outlined'}
                      onClick={() => handleCaptureModeChange('video')}
                      startIcon={<VideoIcon />}
                      size="small"
                    >
                      Video
                    </Button>
                  </Stack>
                )}
                
                <Box className="capture-buttons">
                  {/* Capture Button */}
                  {!isRecording && !capturedMedia && (
                    <>
                      <Tooltip title="Use timer (3s)">
                        <IconButton 
                          onClick={() => startCountdown(3)}
                          className="control-button"
                          disabled={isCapturing || countdown > 0}
                        >
                          <TimerIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          if (captureMode === 'photo') {
                            capturePhoto();
                          } else {
                            startRecording();
                          }
                        }}
                        startIcon={captureMode === 'photo' ? <CameraIcon /> : <RecordIcon />}
                        disabled={isCapturing || countdown > 0}
                        className="capture-button"
                      >
                        {captureMode === 'photo' ? 'Take Photo' : 'Record'}
                      </Button>
                    </>
                  )}
                  
                  {/* Stop Recording Button */}
                  {isRecording && (
                    <Button
                      variant="contained"
                      color="error"
                      onClick={stopRecording}
                      startIcon={<StopIcon />}
                      className="stop-button"
                    >
                      Stop Recording
                    </Button>
                  )}
                  
                  {/* Flip Camera Button */}
                  {!capturedMedia && (
                    <Tooltip title="Flip camera">
                      <IconButton 
                        onClick={flipCamera}
                        className="control-button"
                        disabled={isCapturing || isRecording}
                      >
                        <FlipCameraIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}
            
            {/* Captured Media Preview */}
            {capturedMedia && (
              <Box className="captured-preview">
                {capturedMedia.type === 'photo' ? (
                  <img 
                    src={capturedMedia.src} 
                    alt="Captured" 
                    className="captured-image" 
                  />
                ) : (
                  <video 
                    src={capturedMedia.src} 
                    controls 
                    className="captured-video" 
                  />
                )}
                
                <Box className="preview-controls">
                  <Button
                    variant="outlined"
                    onClick={resetCapture}
                    color="primary"
                  >
                    Retake
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleMediaSubmit}
                    color="primary"
                  >
                    {buttonText}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <Box className="upload-container">
            {!capturedMedia ? (
              <>
                <Box className="upload-prompt">
                  <GalleryIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                  <Typography variant="h6" gutterBottom>
                    Upload a {captureType === 'photo' ? 'Photo' : captureType === 'video' ? 'Video' : 'Photo or Video'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {captureType === 'photo' 
                      ? 'Please upload a clear photo for best results' 
                      : captureType === 'video'
                      ? 'Video should be less than 30 seconds for optimal processing'
                      : 'For best results, use high-quality media in good lighting'}
                  </Typography>
                  
                  {uploadError && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                      {uploadError}
                    </Typography>
                  )}
                  
                  <input
                    type="file"
                    accept={
                      captureType === 'photo' 
                        ? 'image/*' 
                        : captureType === 'video'
                        ? 'video/*'
                        : 'image/*,video/*'
                    }
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                  <Button
                    variant="contained"
                    onClick={triggerFileUpload}
                    color="primary"
                    sx={{ mt: 2 }}
                  >
                    Select File
                  </Button>
                </Box>
              </>
            ) : (
              <Box className="captured-preview">
                {capturedMedia.type === 'photo' ? (
                  <img 
                    src={capturedMedia.src} 
                    alt="Uploaded" 
                    className="captured-image" 
                  />
                ) : (
                  <video 
                    src={capturedMedia.src} 
                    controls 
                    className="captured-video" 
                  />
                )}
                
                <Box className="preview-controls">
                  <Button
                    variant="outlined"
                    onClick={resetCapture}
                    color="primary"
                  >
                    Choose Another
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleMediaSubmit}
                    color="primary"
                  >
                    {buttonText}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UserMediaCapture;