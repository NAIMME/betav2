import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  IconButton, 
  LinearProgress,
  Paper
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon
} from '@mui/icons-material';
import './VideoResultsDisplay.css';

/**
 * VideoResultsDisplay Component
 * 
 * Displays processed video with virtual try-on applied to each frame.
 * Includes custom video controls and frame navigation.
 */
const VideoResultsDisplay = ({ 
  processedVideoUrl, 
  originalVideoUrl,
  frameData = [],
  processingStatus = {}
}) => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  
  // Initialize video player
  useEffect(() => {
    if (!processedVideoUrl) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    // Set up event listeners
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoaded(true);
    };
    
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const onEnded = () => {
      setIsPlaying(false);
    };
    
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    
    // Load the video
    video.src = processedVideoUrl;
    video.load();
    
    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [processedVideoUrl]);
  
  // Handle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Handle seek (slider change)
  const handleSeek = (_, value) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = value;
    setCurrentTime(value);
  };
  
  // Handle playback rate change
  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Navigate to next frame
  const nextFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Approximate one frame (assuming 30fps)
    const frameTime = 1/30;
    video.currentTime = Math.min(video.duration, video.currentTime + frameTime);
  };
  
  // Navigate to previous frame
  const prevFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Approximate one frame (assuming 30fps)
    const frameTime = 1/30;
    video.currentTime = Math.max(0, video.currentTime - frameTime);
  };
  
  // Toggle between original and processed video
  const toggleVideoSource = () => {
    const video = videoRef.current;
    if (!video || !originalVideoUrl) return;
    
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    if (showOriginal) {
      video.src = processedVideoUrl;
    } else {
      video.src = originalVideoUrl;
    }
    
    video.load();
    
    // Restore playback state
    video.addEventListener('loadeddata', () => {
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play();
      }
    }, { once: true });
    
    setShowOriginal(!showOriginal);
  };
  
  // Calculate processing progress
  const calculateProgress = () => {
    if (!processingStatus) return 0;
    
    const { totalFrames, processedFrames } = processingStatus;
    if (!totalFrames || !processedFrames) return 0;
    
    return (processedFrames / totalFrames) * 100;
  };
  
  // Generate thumbnail for current frame
  const getCurrentFrameThumbnail = () => {
    if (!frameData || frameData.length === 0) return null;
    
    // Find the frame data closest to current time
    const currentTimeMs = currentTime * 1000;
    const closestFrame = frameData.reduce((prev, curr) => {
      return Math.abs(curr.timeMs - currentTimeMs) < Math.abs(prev.timeMs - currentTimeMs) ? curr : prev;
    });
    
    return closestFrame;
  };
  
  // Show processing UI if video is not ready
  if (!isLoaded && !processedVideoUrl) {
    return (
      <Box className="video-processing-container">
        <Typography variant="h6" gutterBottom>
          Processing Video
        </Typography>
        
        <LinearProgress 
          variant="determinate" 
          value={calculateProgress()} 
          sx={{ width: '100%', mb: 2 }}
        />
        
        <Typography variant="body2" color="text.secondary">
          {processingStatus.processedFrames || 0} / {processingStatus.totalFrames || 0} frames processed
        </Typography>
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} className="video-results-container">
      {/* Video Player */}
      <Box className="video-player">
        <video 
          ref={videoRef}
          className="video-element"
          onClick={togglePlay}
        />
        
        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <Box className="play-overlay" onClick={togglePlay}>
            <PlayIcon sx={{ fontSize: 60 }} />
          </Box>
        )}
        
        {/* Frame Info Overlay (if frame data is available) */}
        {frameData.length > 0 && (
          <Box className="frame-info-overlay">
            <Typography variant="caption">
              Frame: {getCurrentFrameThumbnail()?.frameNumber || 'N/A'}
            </Typography>
          </Box>
        )}
        
        {/* Toggle Button */}
        {originalVideoUrl && (
          <Box className="toggle-button-container">
            <IconButton 
              color="primary" 
              onClick={toggleVideoSource}
              className="toggle-button"
            >
              {showOriginal ? 'Show Processed' : 'Show Original'}
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Video Controls */}
      <Box className="video-controls">
        {/* Timeline */}
        <Box className="timeline-container">
          <Typography variant="caption" className="time-display">
            {formatTime(currentTime)}
          </Typography>
          
          <Slider
            value={currentTime}
            min={0}
            max={duration}
            step={0.01}
            onChange={handleSeek}
            className="timeline-slider"
            ref={progressBarRef}
          />
          
          <Typography variant="caption" className="time-display">
            {formatTime(duration)}
          </Typography>
        </Box>
        
        {/* Playback Controls */}
        <Box className="playback-controls">
          <IconButton onClick={() => changePlaybackRate(0.5)} disabled={playbackRate === 0.5}>
            <FastRewindIcon />
          </IconButton>
          
          <IconButton onClick={prevFrame}>
            <SkipPreviousIcon />
          </IconButton>
          
          <IconButton onClick={togglePlay} className="play-button">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          
          <IconButton onClick={nextFrame}>
            <SkipNextIcon />
          </IconButton>
          
          <IconButton onClick={() => changePlaybackRate(2.0)} disabled={playbackRate === 2.0}>
            <FastForwardIcon />
          </IconButton>
        </Box>
        
        {/* Playback Rate Display */}
        <Typography variant="caption" className="playback-rate">
          {playbackRate}x
        </Typography>
      </Box>
    </Paper>
  );
};

export default VideoResultsDisplay;