import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography, Button, Stack } from '@mui/material';
import FaceLandmarkDetector from '../models/FaceLandmarkDetector';
import HandPoseDetector from '../models/HandPoseDetector';
import LoadingIndicator from './LoadingIndicator';

/**
 * JewelryTryOn Component
 * 
 * Handles the virtual try-on experience for jewelry items including:
 * - Earrings (using face landmarks)
 * - Necklaces (using face/neck landmarks)
 * - Rings (using hand pose detection)
 * - Bracelets (using hand/wrist detection)
 * - Watches (using wrist detection)
 */
const JewelryTryOn = ({ 
  selectedJewelry, 
  mediaSource, 
  onProcessingComplete,
  culturalStyle = 'western',
  renderQuality = 'medium'
}) => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const [handPoses, setHandPoses] = useState(null);
  const [renderingComplete, setRenderingComplete] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const sourceImageRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Process media and detect landmarks when media source or jewelry selection changes
  useEffect(() => {
    if (!mediaSource || !selectedJewelry) return;
    
    const processMedia = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        // Load the source image
        if (sourceImageRef.current) {
          sourceImageRef.current.src = mediaSource;
          await new Promise(resolve => {
            sourceImageRef.current.onload = resolve;
          });
        }
        
        // Determine which detectors to use based on jewelry type
        const jewelryType = selectedJewelry.type;
        
        // Detect face landmarks for earrings, necklaces
        if (['earring', 'necklace'].includes(jewelryType)) {
          const faceLandmarkDetector = new FaceLandmarkDetector();
          const landmarks = await faceLandmarkDetector.detectLandmarks(mediaSource);
          setFaceLandmarks(landmarks);
        }
        
        // Detect hand poses for rings, bracelets, watches
        if (['ring', 'bracelet', 'watch'].includes(jewelryType)) {
          const handPoseDetector = new HandPoseDetector();
          const poses = await handPoseDetector.detectPoses(mediaSource);
          setHandPoses(poses);
        }
        
        // Render the jewelry with detected landmarks
        await renderJewelry();
        
        setRenderingComplete(true);
        setIsProcessing(false);
        
        // Notify parent component that processing is complete
        if (onProcessingComplete) {
          onProcessingComplete({
            result: canvasRef.current.toDataURL(),
            jewelryType: selectedJewelry.type,
            landmarks: faceLandmarks || handPoses
          });
        }
      } catch (err) {
        console.error("Error in jewelry try-on process:", err);
        setError(`Failed to process try-on: ${err.message}`);
        setIsProcessing(false);
      }
    };
    
    processMedia();
  }, [mediaSource, selectedJewelry, onProcessingComplete]);

  // Render jewelry based on detected landmarks
  const renderJewelry = async () => {
    if (!selectedJewelry) return;
    
    try {
      // Get canvas context
      const ctx = canvasRef.current.getContext('2d');
      
      // Set canvas dimensions to match the source image
      canvasRef.current.width = sourceImageRef.current.width;
      canvasRef.current.height = sourceImageRef.current.height;
      
      // Draw the original image first
      ctx.drawImage(sourceImageRef.current, 0, 0);
      
      // Draw placeholder jewelry based on type and detected landmarks
      if (faceLandmarks && ['earring', 'necklace'].includes(selectedJewelry.type)) {
        if (selectedJewelry.type === 'earring') {
          // Draw earrings at ear positions
          const leftEarPoint = faceLandmarks[0].keypoints.leftEar;
          const rightEarPoint = faceLandmarks[0].keypoints.rightEar;
          
          if (leftEarPoint && rightEarPoint) {
            // Draw left earring
            drawPlaceholderJewelry(ctx, selectedJewelry.type, leftEarPoint.x, leftEarPoint.y, 1.0);
            // Draw right earring
            drawPlaceholderJewelry(ctx, selectedJewelry.type, rightEarPoint.x, rightEarPoint.y, 1.0);
          }
        } else if (selectedJewelry.type === 'necklace') {
          // Draw necklace at neck position
          const neckPoint = faceLandmarks[0].keypoints.neckBase;
          
          if (neckPoint) {
            drawPlaceholderJewelry(ctx, selectedJewelry.type, neckPoint.x, neckPoint.y, 1.5);
          }
        }
      } else if (handPoses && ['ring', 'bracelet', 'watch'].includes(selectedJewelry.type)) {
        if (selectedJewelry.type === 'ring') {
          // Draw ring on ring finger
          const fingerIndex = 3; // ring finger
          const baseJoint = handPoses[0].keypoints[`ring_finger_mcp`];
          const middleJoint = handPoses[0].keypoints[`ring_finger_pip`];
          
          if (baseJoint && middleJoint) {
            const ringX = baseJoint.x * 0.3 + middleJoint.x * 0.7;
            const ringY = baseJoint.y * 0.3 + middleJoint.y * 0.7;
            drawPlaceholderJewelry(ctx, selectedJewelry.type, ringX, ringY, 0.8);
          }
        } else if (selectedJewelry.type === 'bracelet' || selectedJewelry.type === 'watch') {
          // Draw bracelet/watch at wrist
          const wrist = handPoses[0].keypoints.wrist;
          
          if (wrist) {
            drawPlaceholderJewelry(ctx, selectedJewelry.type, wrist.x, wrist.y, 1.2);
          }
        }
      }
      
      setRenderingComplete(true);
      return true;
    } catch (err) {
      console.error("Error rendering jewelry:", err);
      throw new Error(`Rendering failed: ${err.message}`);
    }
  };

  // Helper function to draw placeholder jewelry
  const drawPlaceholderJewelry = (ctx, type, x, y, scale = 1.0) => {
    const size = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.05 * scale;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Draw different shapes based on item type
    if (type === 'earring') {
      // Draw a circle for earrings
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold color with transparency
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.stroke();
    } else if (type === 'necklace') {
      // Draw a semi-circle for necklaces
      ctx.beginPath();
      ctx.arc(0, 0, size * 2, Math.PI, 2 * Math.PI, false);
      ctx.strokeStyle = 'rgba(192, 192, 192, 0.7)'; // Silver color
      ctx.lineWidth = size / 2;
      ctx.stroke();
    } else if (type === 'ring') {
      // Draw a ring shape
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold color
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#000'; // Black hole
      ctx.fill();
    } else if (type === 'bracelet' || type === 'watch') {
      // Draw a rectangle with rounded corners for watches/bracelets
      const rectWidth = size * 3;
      const rectHeight = size * 1.5;
      ctx.beginPath();
      ctx.roundRect(-rectWidth/2, -rectHeight/2, rectWidth, rectHeight, size/2);
      ctx.fillStyle = type === 'watch' ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 215, 0, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Add a label
    ctx.fillStyle = '#fff';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(type, 0, size * 1.5);
    
    ctx.restore();
  };

  // Helper functions for adjusting jewelry position
  const adjustPosition = (direction) => {
    if (!renderingComplete || !selectedJewelry) return;
    
    // Re-render with adjusted positions
    renderJewelry();
  };
  
  const adjustSize = (factor) => {
    if (!renderingComplete || !selectedJewelry) return;
    
    // Re-render with adjusted size
    renderJewelry();
  };
  
  const adjustRotation = (degrees) => {
    if (!renderingComplete || !selectedJewelry) return;
    
    // Re-render with adjusted rotation
    renderJewelry();
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '500px' }}>
      {/* Hidden source image for processing */}
      <img 
        ref={sourceImageRef}
        src={mediaSource}
        alt="Source"
        style={{ display: 'none' }}
      />
      
      {/* Rendering canvas */}
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%',
          height: '100%',
          display: isProcessing ? 'none' : 'block'
        }}
      />
      
      {/* Processing indicator */}
      {isProcessing && (
        <LoadingIndicator 
          message={`Processing ${selectedJewelry?.type || 'jewelry'} try-on...`}
        />
      )}
      
      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="error" variant="body1">{error}</Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={() => {
              setError(null);
              setIsProcessing(true);
              renderJewelry().then(() => setIsProcessing(false));
            }}
          >
            Retry
          </Button>
        </Box>
      )}
      
      {/* Controls for adjusting jewelry */}
      {renderingComplete && (
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ 
            position: 'absolute', 
            bottom: 16, 
            left: 16, 
            right: 16, 
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: 1,
            p: 1
          }}
        >
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => adjustPosition('up')}
          >
            Move Up
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => adjustPosition('down')}
          >
            Move Down
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => adjustSize(0.9)}
          >
            Smaller
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => adjustSize(1.1)}
          >
            Larger
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => adjustRotation(15)}
          >
            Rotate
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default JewelryTryOn;