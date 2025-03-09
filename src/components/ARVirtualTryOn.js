import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Button, 
  Slider, 
  Card, 
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack, 
  Tooltip,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  FlipCameraIos as FlipCameraIcon,
  Settings as SettingsIcon,
  PhotoCamera as CameraIcon,
  Info as InfoIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as ResetIcon,
  PanTool as HandIcon,
  Face as FaceIcon
} from '@mui/icons-material';

// Debug log for imports
console.log('Importing FaceLandmarkDetector and HandPoseDetector');
import FaceLandmarkDetector from '../models/FaceLandmarkDetector';
import HandPoseDetector from '../models/HandPoseDetector';
import systemTelemetry from '../utils/SystemTelemetry';
import './ARVirtualTryOn.css';

/**
 * ARVirtualTryOn Component
 * 
 * Provides real-time augmented reality (AR) try-on experience 
 * for jewelry and clothing using webcam feed with tracking.
 */
const ARVirtualTryOn = ({ 
  selectedItem, 
  onCapture,
  onClose,
  qualitySetting = 'auto' // 'low', 'medium', 'high', or 'auto'
}) => {
  console.log('ARVirtualTryOn component rendering with selectedItem:', selectedItem);
  console.log('Quality setting:', qualitySetting);

  // State
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [detectionQuality, setDetectionQuality] = useState(0);
  const [framerate, setFramerate] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingType, setTrackingType] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [adaptiveQuality, setAdaptiveQuality] = useState(qualitySetting === 'auto');
  const [quality, setQuality] = useState(qualitySetting === 'auto' ? 'medium' : qualitySetting);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [lastProcessedFrame, setLastProcessedFrame] = useState(0);
  const [itemAdjustments, setItemAdjustments] = useState({
    scale: 1.0,
    xOffset: 0,
    yOffset: 0,
    rotation: 0
  });
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const faceLandmarkDetectorRef = useRef(null);
  const handPoseDetectorRef = useRef(null);
  const fpsCounterRef = useRef({ lastTime: 0, frames: 0 });
  const frameSkipRef = useRef(0);
  const processingRef = useRef(false);
  
  // Initialize component
  useEffect(() => {
    console.log('ARVirtualTryOn component mounted');
    
    // Start telemetry collection
    systemTelemetry.startCollection();
    
    // Initialize detection based on selected item
    initializeDetection();
    
    // Start webcam stream
    startWebcam();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Clean up function
    return () => {
      console.log('ARVirtualTryOn component unmounting');
      stopWebcam();
      stopTracking();
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      systemTelemetry.stopCollection();
    };
  }, []);
  
  // Reinitialize when selected item changes
  useEffect(() => {
    console.log('Selected item changed to:', selectedItem);
    initializeDetection();
  }, [selectedItem]);
  
  // Update frame processing settings when quality changes
  useEffect(() => {
    console.log('Quality changed to:', quality);
    updateQualitySettings(quality);
  }, [quality]);
  
  // Handle resize events
  const handleResize = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('Resized canvas to match video:', canvas.width, 'x', canvas.height);
    }
  };
  
  // Initialize the appropriate detection models based on selected item
  const initializeDetection = async () => {
    console.log('Initializing detection for item:', selectedItem);
    
    if (!selectedItem) {
      console.log('No item selected, skipping detection initialization');
      return;
    }
    
    try {
      setLoadingModels(true);
      setModelLoadProgress(0);
      setError(null);
      
      // Determine what detection is needed for this item
      const needsFaceDetection = ['earring', 'necklace', 'glasses'].includes(selectedItem.type);
      const needsHandDetection = ['ring', 'bracelet', 'watch'].includes(selectedItem.type);
      
      console.log('Detection needs - Face:', needsFaceDetection, 'Hand:', needsHandDetection);
      
      if (needsFaceDetection) {
        console.log('Setting tracking type to face');
        setTrackingType('face');
        await initializeFaceDetection();
      }
      
      if (needsHandDetection) {
        console.log('Setting tracking type to hand');
        setTrackingType('hand');
        await initializeHandDetection();
      }
      
      // Update progress
      setModelLoadProgress(100);
      setLoadingModels(false);
      console.log('Model loading complete');
      
      // Start processing frames
      startProcessing();
    } catch (err) {
      console.error('Error initializing detection:', err);
      setError(`Failed to initialize tracking: ${err.message}`);
      setLoadingModels(false);
      
      // Record error in telemetry
      systemTelemetry.recordError('modelInitialization', err.message, {
        selectedItem,
        severity: 'high'
      });
    }
  };
  
  // Initialize face landmark detection
  const initializeFaceDetection = async () => {
    console.log('Initializing face landmark detection');
    try {
      // Clean up existing detector if any
      if (faceLandmarkDetectorRef.current) {
        console.log('Disposing existing face detector');
        faceLandmarkDetectorRef.current.dispose();
      }
      
      // Create new detector
      console.log('Creating new FaceLandmarkDetector instance');
      faceLandmarkDetectorRef.current = new FaceLandmarkDetector();
      
      // Initialize the model
      const startTime = performance.now();
      setModelLoadProgress(30);
      
      console.log('Calling initialize() on face detector');
      const success = await faceLandmarkDetectorRef.current.initialize();
      console.log('Face detector initialization result:', success);
      
      setModelLoadProgress(70);
      
      if (!success) {
        console.error('Face detector initialization returned false');
        throw new Error('Failed to initialize face detector');
      }
      
      const endTime = performance.now();
      
      // Record telemetry for model load time
      systemTelemetry.recordModelPerformance('faceDetection', {
        event: 'modelLoad',
        duration: endTime - startTime,
        success: true
      });
      
      console.log('Face detection initialized successfully');
      return true;
    } catch (err) {
      console.error('Error initializing face detection:', err);
      throw err;
    }
  };
  
  // Initialize hand pose detection
  const initializeHandDetection = async () => {
    console.log('Initializing hand pose detection');
    try {
      // Clean up existing detector if any
      if (handPoseDetectorRef.current) {
        console.log('Disposing existing hand detector');
        handPoseDetectorRef.current.dispose();
      }
      
      // Create new detector
      console.log('Creating new HandPoseDetector instance');
      handPoseDetectorRef.current = new HandPoseDetector();
      
      // Initialize the model
      const startTime = performance.now();
      setModelLoadProgress(30);
      
      console.log('Calling initialize() on hand detector');
      const success = await handPoseDetectorRef.current.initialize();
      console.log('Hand detector initialization result:', success);
      
      setModelLoadProgress(70);
      
      if (!success) {
        console.error('Hand detector initialization returned false');
        throw new Error('Failed to initialize hand detector');
      }
      
      const endTime = performance.now();
      
      // Record telemetry for model load time
      systemTelemetry.recordModelPerformance('handPose', {
        event: 'modelLoad',
        duration: endTime - startTime,
        success: true
      });
      
      console.log('Hand detection initialized successfully');
      return true;
    } catch (err) {
      console.error('Error initializing hand detection:', err);
      throw err;
    }
  };
  
  // Start webcam stream
  const startWebcam = async () => {
    console.log('Starting webcam');
    try {
      if (streamRef.current) {
        console.log('Stopping existing webcam stream');
        stopWebcam();
      }
      
      // Get video constraints based on quality settings
      const constraints = getVideoConstraints();
      console.log('Using video constraints:', constraints);
      
      // Request camera access
      console.log('Requesting camera access via getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false
      });
      
      console.log('Camera access granted:', stream);
      
      // Store stream for cleanup
      streamRef.current = stream;
      
      // Set video source
      if (videoRef.current) {
        console.log('Setting video source');
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Set up canvas to match video dimensions
        if (canvasRef.current) {
          console.log('Setting canvas dimensions to match video:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      }
      
      setStreaming(true);
      console.log('Webcam streaming started');
    } catch (err) {
      console.error('Error starting webcam:', err);
      setError(`Failed to access camera: ${err.message}`);
      
      // Record error in telemetry
      systemTelemetry.recordError('webcam', err.message, {
        constraints: getVideoConstraints(),
        severity: 'high'
      });
    }
  };
  
  // Stop webcam stream
  const stopWebcam = () => {
    console.log('Stopping webcam');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setStreaming(false);
    console.log('Webcam stopped');
  };
  
  // Flip camera (switch between front and back)
  const flipCamera = async () => {
    console.log('Flipping camera from', facingMode, 'to', facingMode === 'user' ? 'environment' : 'user');
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    await startWebcam();
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      console.log('Entering fullscreen mode');
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      console.log('Exiting fullscreen mode');
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Get video constraints based on quality and device
  const getVideoConstraints = () => {
    const constraints = {
      facingMode: facingMode
    };
    
    // Add resolution constraints based on quality setting
    switch (quality) {
      case 'high':
        constraints.width = { ideal: 1920 };
        constraints.height = { ideal: 1080 };
        break;
      case 'medium':
        constraints.width = { ideal: 1280 };
        constraints.height = { ideal: 720 };
        break;
      case 'low':
        constraints.width = { ideal: 640 };
        constraints.height = { ideal: 480 };
        break;
      default:
        // Default to medium
        constraints.width = { ideal: 1280 };
        constraints.height = { ideal: 720 };
    }
    
    return constraints;
  };
  
  // Update settings based on quality level
  const updateQualitySettings = (qualityLevel) => {
    console.log('Updating quality settings to:', qualityLevel);
    switch (qualityLevel) {
      case 'high':
        frameSkipRef.current = 0; // Process every frame
        break;
      case 'medium':
        frameSkipRef.current = 1; // Skip every other frame
        break;
      case 'low':
        frameSkipRef.current = 2; // Skip 2 frames (process every 3rd)
        break;
      default:
        frameSkipRef.current = 1; // Default to medium
    }
    
    console.log('Frame skip set to:', frameSkipRef.current);
    
    // Update detector configurations if available
    if (faceLandmarkDetectorRef.current) {
      console.log('Updating face detector config');
      faceLandmarkDetectorRef.current.updateConfig({
        detectionConfidence: qualityLevel === 'low' ? 0.6 : 0.8
      });
    }
    
    if (handPoseDetectorRef.current) {
      console.log('Updating hand detector config');
      handPoseDetectorRef.current.updateConfig({
        detectionConfidence: qualityLevel === 'low' ? 0.6 : 0.7
      });
    }
  };
  
  // Start processing frames for AR
  const startProcessing = () => {
    console.log('Starting frame processing');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    processFrame();
  };
  
  // Stop tracking and processing
  const stopTracking = () => {
    console.log('Stopping tracking and processing');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (faceLandmarkDetectorRef.current) {
      faceLandmarkDetectorRef.current.dispose();
      faceLandmarkDetectorRef.current = null;
    }
    
    if (handPoseDetectorRef.current) {
      handPoseDetectorRef.current.dispose();
      handPoseDetectorRef.current = null;
    }
    
    setIsTracking(false);
    console.log('Tracking stopped');
  };
  
  // Process a single video frame
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedItem) {
      // console.log('Missing refs or selected item, skipping frame processing');
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calculate FPS
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    
    fpsCounterRef.current.frames++;
    
    if (elapsed >= 1000) {
      // Update FPS once per second
      const newFramerate = Math.round((fpsCounterRef.current.frames * 1000) / elapsed);
      // console.log('Updated framerate:', newFramerate);
      setFramerate(newFramerate);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }
    
    // Adaptive quality control
    if (adaptiveQuality && framerate > 0) {
      if (framerate < 15 && quality !== 'low') {
        console.log('Low framerate detected, switching to low quality');
        setQuality('low');
      } else if (framerate > 25 && quality === 'low') {
        console.log('Framerate improved, switching to medium quality');
        setQuality('medium');
      } else if (framerate > 45 && quality === 'medium') {
        console.log('High framerate detected, switching to high quality');
        setQuality('high');
      }
    }
    
    // Frame skipping for performance
    const frameCount = framesProcessed + 1;
    setFramesProcessed(frameCount);
    
    const shouldProcessThisFrame = frameCount % (frameSkipRef.current + 1) === 0;
    // console.log('Processing frame:', frameCount, 'Should process:', shouldProcessThisFrame);
    
    // Always draw the video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom if needed
    if (zoomLevel !== 1.0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = zoomLevel;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    
    // Skip detection and processing if needed for performance
    if (shouldProcessThisFrame && !processingRef.current) {
      processingRef.current = true;
      
      try {
        let detectionResult = null;
        const detectionStart = performance.now();
        
        // Perform detection based on tracking type
        if (trackingType === 'face' && faceLandmarkDetectorRef.current) {
          console.log('Attempting face detection on video frame');
          detectionResult = await faceLandmarkDetectorRef.current.detect(video);
          
          // FOR TESTING: If regular detection fails, try mock data
          if (!detectionResult && faceLandmarkDetectorRef.current.mockDetect) {
            console.log('Using mock face detection data for testing');
            detectionResult = faceLandmarkDetectorRef.current.mockDetect();
          }
        } else if (trackingType === 'hand' && handPoseDetectorRef.current) {
          console.log('Attempting hand detection on video frame');
          detectionResult = await handPoseDetectorRef.current.detect(video);
        }
        
        const detectionEnd = performance.now();
        console.log('Detection result:', detectionResult ? 'Success' : 'No detection', 
                    'Time:', (detectionEnd - detectionStart).toFixed(2), 'ms');
        
        // Record detection performance
        systemTelemetry.recordModelPerformance(trackingType === 'face' ? 'faceDetection' : 'handPose', {
          event: 'inference',
          duration: detectionEnd - detectionStart,
          success: !!detectionResult
        });
        
        // Update tracking status
        setIsTracking(!!detectionResult);
        
        // Update detection quality metric (0-1 scale)
        if (detectionResult) {
          if (Array.isArray(detectionResult)) {
            const confidence = detectionResult[0]?.confidence || 0;
            setDetectionQuality(confidence);
          } else {
            setDetectionQuality(0.8); // Default good value if not provided
          }
          
          // Draw the AR content on canvas based on detection
          await drawARContent(ctx, detectionResult);
          
          // Record last processed frame timestamp
          setLastProcessedFrame(now);
        } else {
          setDetectionQuality(0);
        }
      } catch (err) {
        console.error('Error processing frame:', err);
        
        // Record error in telemetry
        systemTelemetry.recordError('frameProcessing', err.message, {
          timestamp: now,
          frameNumber: frameCount,
          severity: 'medium'
        });
      }
      
      processingRef.current = false;
    }
    
    // Request next frame
    animationRef.current = requestAnimationFrame(processFrame);
  };
  
  // Draw AR content on canvas based on detection results
  const drawARContent = async (ctx, detectionResult) => {
    if (!ctx || !detectionResult || !selectedItem) return;
    
    try {
      const renderStart = performance.now();
      
      // Apply the item specific rendering based on type
      if (trackingType === 'face') {
        console.log('Drawing face-based jewelry');
        await drawFaceItem(ctx, detectionResult, selectedItem);
      } else if (trackingType === 'hand') {
        console.log('Drawing hand-based jewelry');
        await drawHandItem(ctx, detectionResult, selectedItem);
      }
      
      const renderEnd = performance.now();
      
      // Record rendering performance
      systemTelemetry.recordRenderTime('arContent', renderEnd - renderStart);
    } catch (err) {
      console.error('Error drawing AR content:', err);
      
      // Record error in telemetry
      systemTelemetry.recordError('arRendering', err.message, {
        itemType: selectedItem.type,
        severity: 'medium'
      });
    }
  };
  
  // Draw face-based jewelry (earrings, necklaces)
  const drawFaceItem = async (ctx, faceDetections, item) => {
    if (!faceDetections || faceDetections.length === 0) return;
    
    // Get the first detected face
    const face = faceDetections[0];
    const keypoints = face.keypoints || {};
    
    console.log('Drawing face item of type:', item.type);
    console.log('Face detection keypoints:', keypoints);
    
    // Apply different drawing logic based on item type
    switch (item.type) {
      case 'earring':
        if (keypoints.leftEar && keypoints.rightEar) {
          console.log('Drawing earrings at left ear:', keypoints.leftEar, 'and right ear:', keypoints.rightEar);
          // Draw left earring
          if (item.leftImageUrl) {
            await drawImage(
              ctx, 
              item.leftImageUrl,
              keypoints.leftEar.x,
              keypoints.leftEar.y,
              item.sizeAdjustment * itemAdjustments.scale,
              itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
          
          // Draw right earring
          if (item.rightImageUrl) {
            await drawImage(
              ctx, 
              item.rightImageUrl,
              keypoints.rightEar.x,
              keypoints.rightEar.y,
              item.sizeAdjustment * itemAdjustments.scale,
              itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
        } else {
          console.log('Missing ear keypoints for earring placement');
        }
        break;
        
      case 'necklace':
        if (keypoints.neckBase) {
          console.log('Drawing necklace at neck base:', keypoints.neckBase);
          // Draw necklace
          if (item.imageUrl) {
            await drawImage(
              ctx, 
              item.imageUrl,
              keypoints.neckBase.x,
              keypoints.neckBase.y,
              item.sizeAdjustment * itemAdjustments.scale,
              itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
        } else {
          console.log('Missing neck keypoint for necklace placement');
        }
        break;
        
      default:
        console.warn(`Unsupported face item type: ${item.type}`);
    }
  };
  
  // Draw hand-based jewelry (rings, bracelets, watches)
  const drawHandItem = async (ctx, handDetections, item) => {
    if (!handDetections || handDetections.length === 0) return;
    
    // Determine which hand to use based on item preference
    let targetHand = null;
    if (item.preferredHand === 'left') {
      targetHand = handDetections.find(hand => hand.handedness === 'Left');
      if (!targetHand && handDetections.length > 0) {
        targetHand = handDetections[0]; // Fallback to any hand
      }
    } else {
      targetHand = handDetections.find(hand => hand.handedness === 'Right');
      if (!targetHand && handDetections.length > 0) {
        targetHand = handDetections[0]; // Fallback to any hand
      }
    }
    
    if (!targetHand) {
      console.log('No suitable hand detected for item placement');
      return;
    }
    
    const keypoints = targetHand.keypoints || {};
    console.log('Drawing hand item of type:', item.type);
    console.log('Hand detection keypoints:', keypoints);
    
    // Apply different drawing logic based on item type
    switch (item.type) {
      case 'ring':
        const fingerIndex = item.fingerIndex || 3; // Default to ring finger (index 3)
        const fingerBase = keypoints[`${fingerIndex}_mcp`];
        const fingerMiddle = keypoints[`${fingerIndex}_pip`];
        
        if (fingerBase && fingerMiddle) {
          // Calculate position between joints for ring placement
          const ringX = fingerBase.x * 0.3 + fingerMiddle.x * 0.7;
          const ringY = fingerBase.y * 0.3 + fingerMiddle.y * 0.7;
          
          // Calculate rotation angle based on finger orientation
          const angle = Math.atan2(
            fingerMiddle.y - fingerBase.y,
            fingerMiddle.x - fingerBase.x
          ) * (180 / Math.PI);
          
          console.log('Drawing ring at position:', ringX, ringY, 'with angle:', angle);
          
          // Draw ring
          if (item.imageUrl) {
            await drawImage(
              ctx, 
              item.imageUrl,
              ringX,
              ringY,
              item.sizeAdjustment * itemAdjustments.scale,
              angle + itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
        } else {
          console.log('Missing finger keypoints for ring placement');
        }
        break;
        
      case 'bracelet':
        const wrist = keypoints.wrist;
        if (wrist) {
          console.log('Drawing bracelet at wrist:', wrist);
          // Draw bracelet at wrist
          if (item.imageUrl) {
            await drawImage(
              ctx, 
              item.imageUrl,
              wrist.x,
              wrist.y,
              item.sizeAdjustment * itemAdjustments.scale,
              targetHand.orientation?.angles.roll + itemAdjustments.rotation || itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
        } else {
          console.log('Missing wrist keypoint for bracelet placement');
        }
        break;
        
      case 'watch':
        const watchPoint = keypoints.wrist;
        if (watchPoint) {
          console.log('Drawing watch at wrist:', watchPoint);
          // Draw watch at wrist with slight offset
          if (item.imageUrl) {
            await drawImage(
              ctx, 
              item.imageUrl,
              watchPoint.x,
              watchPoint.y,
              item.sizeAdjustment * itemAdjustments.scale,
              targetHand.orientation?.angles.roll + itemAdjustments.rotation || itemAdjustments.rotation,
              itemAdjustments.xOffset,
              itemAdjustments.yOffset
            );
          }
        } else {
          console.log('Missing wrist keypoint for watch placement');
        }
        break;
        
      default:
        console.warn(`Unsupported hand item type: ${item.type}`);
    }
  };
  
  // Draw an image on canvas with given position, scale, and rotation
  const drawImage = async (ctx, imageUrl, x, y, scale = 1.0, rotation = 0, xOffset = 0, yOffset = 0) => {
    // Instead of loading an image, draw a colored shape to represent the jewelry
    const size = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.1 * scale;
    
    ctx.save();
    ctx.translate(x + xOffset, y + yOffset);
    ctx.rotate(rotation * Math.PI / 180);
    
    // Draw different shapes based on item type
    if (selectedItem.type === 'earring') {
      // Draw a circle for earrings
      ctx.beginPath();
      ctx.arc(0, 0, size/2, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold color with transparency
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.stroke();
    } else if (selectedItem.type === 'necklace') {
      // Draw a semi-circle for necklaces
      ctx.beginPath();
      ctx.arc(0, 0, size, Math.PI, 2 * Math.PI, false);
      ctx.strokeStyle = 'rgba(192, 192, 192, 0.7)'; // Silver color
      ctx.lineWidth = size / 5;
      ctx.stroke();
    } else if (selectedItem.type === 'ring') {
      // Draw a ring shape
      ctx.beginPath();
      ctx.arc(0, 0, size/2, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold color
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size/3, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#000'; // Black hole
      ctx.fill();
    } else if (selectedItem.type === 'bracelet' || selectedItem.type === 'watch') {
      // Draw a rectangle with rounded corners for watches/bracelets
      const rectWidth = size * 1.5;
      const rectHeight = size * 0.8;
      ctx.beginPath();
      ctx.roundRect(-rectWidth/2, -rectHeight/2, rectWidth, rectHeight, size/4);
      ctx.fillStyle = selectedItem.type === 'watch' ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 215, 0, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Generic placeholder for other jewelry types
      ctx.beginPath();
      ctx.arc(0, 0, size/2, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(200, 0, 200, 0.7)'; // Purple for unknown types
      ctx.fill();
    }
    
    // Add a label
    ctx.fillStyle = '#fff';
    ctx.font = `${size/4}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(selectedItem.type, 0, size/2 + size/3);
    
    ctx.restore();
    
    return Promise.resolve(); // Return promise for compatibility
  };
  
  // Adjust zoom level
  const handleZoomChange = (_, value) => {
    setZoomLevel(value);
  };
  
  // Handle item adjustment changes
  const handleAdjustmentChange = (property, value) => {
    setItemAdjustments(prev => ({
      ...prev,
      [property]: value
    }));
  };
  
  // Capture current frame
  const captureFrame = () => {
    if (!canvasRef.current) return;
    
    // Start countdown if enabled
    if (captureCountdown > 0) {
      let count = captureCountdown;
      const countdownInterval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(countdownInterval);
          performCapture();
        }
      }, 1000);
    } else {
      performCapture();
    }
  };
  
  // Perform the actual frame capture
  const performCapture = () => {
    if (!canvasRef.current) return;
    
    const capturedImage = canvasRef.current.toDataURL('image/jpeg');
    
    if (onCapture) {
      onCapture({ 
        type: 'photo', 
        src: capturedImage, 
        itemType: selectedItem?.type,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Reset all adjustments to default
  const resetAdjustments = () => {
    setItemAdjustments({
      scale: 1.0,
      xOffset: 0,
      yOffset: 0,
      rotation: 0
    });
    setZoomLevel(1.0);
  };
  
  // Calculate quality indicator
  const getQualityIndicator = () => {
    if (framerate < 15) {
      return 'low';
    } else if (framerate < 30) {
      return 'medium';
    } else {
      return 'high';
    }
  };
  
  // Show loading screen while models initialize
  if (loadingModels) {
    return (
      <Box className="ar-loading-container">
        <Typography variant="h6" gutterBottom>
          Initializing AR Experience
        </Typography>
        <CircularProgress 
          variant="determinate" 
          value={modelLoadProgress} 
          sx={{ my: 2 }}
        />
        <Typography variant="body2" color="textSecondary">
          Loading tracking models: {modelLoadProgress}%
        </Typography>
      </Box>
    );
  }
  
  // Show error if initialization failed
  if (error) {
    return (
      <Box className="ar-error-container">
        <Typography variant="h6" color="error" gutterBottom>
          Failed to Start AR Experience
        </Typography>
        <Typography variant="body2" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={initializeDetection}>
          Retry
        </Button>
        <Button variant="outlined" onClick={onClose} sx={{ ml: 2 }}>
          Cancel
        </Button>
      </Box>
    );
  }
  
  return (
    <Card className="ar-container" ref={containerRef}>
      <CardContent className="ar-content">
        {/* AR View */}
        <Box className="ar-view-container">
          {/* Video element (hidden but needed for capture) */}
          <video
            ref={videoRef}
            className="ar-video"
            autoPlay
            playsInline
            muted
            style={{ display: 'none' }}
          />
          
          {/* Canvas for rendering AR content */}
          <canvas
            ref={canvasRef}
            className="ar-canvas"
          />
          
          {/* Debug Info Overlay */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 10, 
              left: 10, 
              background: 'rgba(0,0,0,0.7)', 
              color: 'white',
              padding: 1,
              borderRadius: 1,
              zIndex: 100
            }}
          >
            <Typography variant="caption" component="div">
              Camera: {streaming ? 'Active' : 'Inactive'}<br/>
              Tracking: {isTracking ? 'Detected' : 'Not detected'}<br/>
              Mode: {trackingType === 'face' ? 'Face tracking' : 'Hand tracking'}<br/>
              FPS: {framerate}<br/>
              Item: {selectedItem?.type || 'None'}
            </Typography>
          </Box>
          
          {/* Tracking guide overlay */}
          {streaming && showGuide && !isTracking && (
            <Box className="tracking-guide">
              <Typography variant="body1">
                {trackingType === 'face' 
                  ? 'Position your face in the frame' 
                  : 'Show your hands in the frame'}
              </Typography>
              {trackingType === 'face' ? <FaceIcon /> : <HandIcon />}
            </Box>
          )}
          
          {/* Performance stats */}
          <Box className="performance-stats">
            <Chip 
              size="small" 
              icon={<InfoIcon />} 
              label={`${framerate} FPS`}
              color={framerate < 15 ? 'error' : framerate < 30 ? 'warning' : 'success'}
              variant="outlined"
            />
            
            <Chip 
              size="small" 
              label={`Quality: ${getQualityIndicator()}`}
              color={getQualityIndicator() === 'low' ? 'error' : getQualityIndicator() === 'medium' ? 'warning' : 'success'}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
        </Box>
        
        {/* Controls */}
        <Box className="ar-controls">
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
            {/* Flip Camera */}
            <Tooltip title="Flip camera">
              <IconButton onClick={flipCamera}>
                <FlipCameraIcon />
              </IconButton>
            </Tooltip>
            
            {/* Zoom Controls */}
            <Box className="zoom-controls">
              <IconButton size="small" onClick={() => setZoomLevel(Math.max(1.0, zoomLevel - 0.1))}>
                <ZoomOutIcon />
              </IconButton>
              <Slider
                value={zoomLevel}
                min={1.0}
                max={3.0}
                step={0.1}
                onChange={handleZoomChange}
                aria-labelledby="zoom-slider"
                sx={{ width: 80, mx: 1 }}
              />
              <IconButton size="small" onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.1))}>
                <ZoomInIcon />
              </IconButton>
            </Box>
            
            {/* Settings Button */}
            <Tooltip title="Settings">
              <IconButton onClick={() => setShowSettings(!showSettings)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            {/* Fullscreen Toggle */}
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <IconButton onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            
            {/* Capture Button */}
            <Button 
              variant="contained" 
              color="primary"
              onClick={captureFrame}
              startIcon={<CameraIcon />}
            >
              Capture
            </Button>
            
            {/* Reset Button */}
            <Tooltip title="Reset adjustments">
              <IconButton onClick={resetAdjustments}>
                <ResetIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          
          {/* Settings Panel */}
          {showSettings && (
            <Card className="settings-panel">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Adjustment Controls
                </Typography>
                
                <Box className="settings-controls">
                  {/* Item Size */}
                  <Box className="settings-control">
                    <Typography variant="body2">Size</Typography>
                    <Slider
                      value={itemAdjustments.scale}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      onChange={(_, value) => handleAdjustmentChange('scale', value)}
                      aria-labelledby="size-slider"
                    />
                  </Box>
                  
                  {/* Item Rotation */}
                  <Box className="settings-control">
                    <Typography variant="body2">Rotation</Typography>
                    <Slider
                      value={itemAdjustments.rotation}
                      min={-180}
                      max={180}
                      step={5}
                      onChange={(_, value) => handleAdjustmentChange('rotation', value)}
                      aria-labelledby="rotation-slider"
                    />
                  </Box>
                  
                  {/* X Position Offset */}
                  <Box className="settings-control">
                    <Typography variant="body2">X Position</Typography>
                    <Slider
                      value={itemAdjustments.xOffset}
                      min={-50}
                      max={50}
                      step={1}
                      onChange={(_, value) => handleAdjustmentChange('xOffset', value)}
                      aria-labelledby="x-position-slider"
                    />
                  </Box>
                  
                  {/* Y Position Offset */}
                  <Box className="settings-control">
                    <Typography variant="body2">Y Position</Typography>
                    <Slider
                      value={itemAdjustments.yOffset}
                      min={-50}
                      max={50}
                      step={1}
                      onChange={(_, value) => handleAdjustmentChange('yOffset', value)}
                      aria-labelledby="y-position-slider"
                    />
                  </Box>
                  
                  {/* Quality Settings */}
                  <Box className="settings-control">
                    <FormControl fullWidth size="small">
                      <InputLabel id="quality-select-label">Quality</InputLabel>
                      <Select
                        labelId="quality-select-label"
                        id="quality-select"
                        value={adaptiveQuality ? 'auto' : quality}
                        label="Quality"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'auto') {
                            setAdaptiveQuality(true);
                          } else {
                            setAdaptiveQuality(false);
                            setQuality(value);
                          }
                        }}
                      >
                        <MenuItem value="auto">Auto (Adaptive)</MenuItem>
                        <MenuItem value="low">Low (Better Performance)</MenuItem>
                        <MenuItem value="medium">Medium (Balanced)</MenuItem>
                        <MenuItem value="high">High (Better Quality)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ARVirtualTryOn;