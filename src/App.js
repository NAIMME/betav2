import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Paper, 
  Typography, 
  Button, 
  AppBar, 
  Toolbar,
  Tabs,
  Tab,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Minimize as MinimizeIcon,
  Videocam as VideoIcon,
  PhotoCamera as PhotoIcon,
  ViewInAr as ARIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Components
import JewelrySelector from './components/JewelrySelector';
import JewelryTryOn from './components/JewelryTryOn';
import UserMediaCapture from './components/UserMediaCapture';
import VideoResultsDisplay from './components/VideoResultsDisplay';
import ARVirtualTryOn from './components/ARVirtualTryOn';
import ClaudeAssistant from './components/ClaudeAssistant';
import LoadingIndicator from './components/LoadingIndicator';

// Utils
import claudeService from './utils/ClaudeService';
import systemTelemetry from './utils/SystemTelemetry';

// Styles
import './App.css';

function App() {
  // State
  const [selectedJewelry, setSelectedJewelry] = useState(null);
  const [mediaSource, setMediaSource] = useState(null);
  const [processedMedia, setProcessedMedia] = useState(null);
  const [currentView, setCurrentView] = useState('select'); // 'select', 'capture', 'tryOn', 'results', 'ar'
  const [isProcessing, setIsProcessing] = useState(false);
  const [culturalStyle, setCulturalStyle] = useState('western');
  const [claudeMinimized, setClaudeMinimized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tryOnMode, setTryOnMode] = useState('photo'); // 'photo', 'video', 'ar'
  
  // Theme and responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Initialize Claude service
  useEffect(() => {
    claudeService.initialize({
      appVersion: '1.0.0',
      deviceCapabilities: {
        isMobile,
        hasCameraAccess: 'mediaDevices' in navigator
      },
      userPreferences: {
        culturalStyle
      }
    });
    
    // Start telemetry collection
    systemTelemetry.startCollection();
    systemTelemetry.setSessionId(`session-${Date.now()}`);
    
    return () => {
      // Stop telemetry collection on unmount
      systemTelemetry.stopCollection();
    };
  }, [isMobile]);
  
  // Handle jewelry selection
  const handleJewelrySelect = (item) => {
    setSelectedJewelry(item);
    
    // Record user interaction
    systemTelemetry.recordUserInteraction('selectJewelry', {
      itemId: item.id,
      itemType: item.type,
      culturalStyle: item.culturalStyle
    });
    
    // Automatically move to capture view
    setCurrentView('capture');
  };
  
  // Handle media capture
  const handleMediaCaptured = (media) => {
    setMediaSource(media);
    setIsProcessing(true);
    
    // Record user interaction
    systemTelemetry.recordUserInteraction('mediaCapture', {
      mediaType: media.type
    });
    
    // Process the captured media
    processMedia(media);
  };
  
  // Process captured media with virtual try-on
  const processMedia = async (media) => {
    try {
      // Different processing for photo vs video
      if (media.type === 'photo') {
        // In a real implementation, this would involve AI models
        // For now, we'll simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set the processed result to display
        setProcessedMedia({
          type: 'photo',
          original: media.src,
          result: media.src, // In a real app, this would be the processed image
          item: selectedJewelry
        });
        
        // Move to results view
        setCurrentView('results');
      } else if (media.type === 'video') {
        // Simulate video processing (would be frame-by-frame in real implementation)
        const totalFrames = 30; // Arbitrary for simulation
        
        for (let i = 1; i <= totalFrames; i++) {
          // Update progress every 100ms
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In a real implementation, you would process each frame here
          // and update the progress
        }
        
        // Set the processed result to display
        setProcessedMedia({
          type: 'video',
          original: media.src,
          result: media.src, // In a real app, this would be the processed video
          item: selectedJewelry
        });
        
        // Move to results view
        setCurrentView('results');
      }
    } catch (error) {
      console.error('Error processing media:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle AR capture
  const handleARCapture = (capturedFrame) => {
    setProcessedMedia({
      type: 'photo',
      original: capturedFrame.src,
      result: capturedFrame.src,
      item: selectedJewelry
    });
    
    // Move to results view
    setCurrentView('results');
  };
  
  // Start AR experience
  const startARExperience = () => {
    if (!selectedJewelry) {
      // Prompt user to select jewelry first
      return;
    }
    
    setCurrentView('ar');
    
    // Record user interaction
    systemTelemetry.recordUserInteraction('startAR', {
      itemType: selectedJewelry.type
    });
  };
  
  // Reset the flow to start over
  const resetFlow = () => {
    setSelectedJewelry(null);
    setMediaSource(null);
    setProcessedMedia(null);
    setCurrentView('select');
    setIsProcessing(false);
  };
  
  // Change try-on mode
  const handleTryOnModeChange = (_, newMode) => {
    setTryOnMode(newMode);
  };
  
  // Render current view based on state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'select':
        return (
          <Box className="section">
            <Typography variant="h5" gutterBottom>
              Select Jewelry
            </Typography>
            <JewelrySelector 
              onSelectJewelry={handleJewelrySelect}
              selectedJewelry={selectedJewelry}
              culturalStyle={culturalStyle}
            />
          </Box>
        );
        
      case 'capture':
        return (
          <Box className="section">
            <Typography variant="h5" gutterBottom>
              Capture Media
            </Typography>
            
            <Tabs
              value={tryOnMode}
              onChange={handleTryOnModeChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              sx={{ mb: 2 }}
            >
              <Tab icon={<PhotoIcon />} label="Photo" value="photo" />
              <Tab icon={<VideoIcon />} label="Video" value="video" />
              <Tab icon={<ARIcon />} label="Live AR" value="ar" />
            </Tabs>
            
            {tryOnMode === 'ar' ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<ARIcon />}
                onClick={startARExperience}
                fullWidth
                sx={{ mb: 2 }}
              >
                Start AR Experience
              </Button>
            ) : (
              <UserMediaCapture 
                onMediaCaptured={handleMediaCaptured}
                onMediaProcessing={setIsProcessing}
                captureType={tryOnMode}
                buttonText="Try On"
              />
            )}
            
            <Button
              variant="outlined"
              onClick={() => setCurrentView('select')}
              sx={{ mt: 2 }}
            >
              Back to Selection
            </Button>
          </Box>
        );
        
      case 'results':
        return (
          <Box className="section">
            <Typography variant="h5" gutterBottom>
              Try-On Results
            </Typography>
            
            {processedMedia?.type === 'photo' ? (
              <Box className="results-container">
                <img 
                  src={processedMedia.result} 
                  alt="Try-on result" 
                  className="result-image"
                />
                <Typography variant="subtitle1" align="center" sx={{ mt: 2 }}>
                  {selectedJewelry?.name}
                </Typography>
              </Box>
            ) : processedMedia?.type === 'video' ? (
              <VideoResultsDisplay 
                processedVideoUrl={processedMedia.result}
                originalVideoUrl={processedMedia.original}
              />
            ) : null}
            
            <Box className="action-buttons">
              <Button
                variant="outlined"
                onClick={resetFlow}
                sx={{ mt: 2, mr: 1 }}
              >
                Try Another Item
              </Button>
              
              <Button
                variant="contained"
                onClick={startARExperience}
                sx={{ mt: 2 }}
              >
                Try Live AR
              </Button>
            </Box>
          </Box>
        );
        
      case 'ar':
        return (
          <Box className="section ar-section">
            <ARVirtualTryOn 
              selectedItem={selectedJewelry}
              onCapture={handleARCapture}
              onClose={() => setCurrentView(processedMedia ? 'results' : 'capture')}
              qualitySetting="auto"
            />
          </Box>
        );
        
      default:
        return (
          <Box className="section">
            <Typography variant="h5" gutterBottom>
              Welcome to Virtual Try-On
            </Typography>
            <Button
              variant="contained"
              onClick={() => setCurrentView('select')}
              size="large"
            >
              Get Started
            </Button>
          </Box>
        );
    }
  };
  
  return (
    <div className="App">
      {/* App Bar */}
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Virtual Try-On
          </Typography>
          {!isMobile && (
            <Button color="inherit" onClick={resetFlow}>
              New Try-On
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Container maxWidth="lg" className="main-container">
        {isProcessing ? (
          <Box className="processing-container">
            <LoadingIndicator 
              message="Processing your media..."
              showProgress={tryOnMode === 'video'}
              progress={50} // This would be dynamic in a real implementation
              type={tryOnMode === 'video' ? 'bar' : 'spinner'}
            />
          </Box>
        ) : (
          <Paper elevation={3} className="content-paper">
            {renderCurrentView()}
          </Paper>
        )}
      </Container>
      
      {/* Claude Assistant */}
      <Box className={`claude-container ${claudeMinimized ? 'minimized' : ''}`}>
        <ClaudeAssistant
          selectedItem={selectedJewelry}
          tryOnResults={processedMedia}
          isMinimized={claudeMinimized}
          onToggleMinimize={() => setClaudeMinimized(!claudeMinimized)}
          systemContext={{
            currentView,
            tryOnMode,
            deviceInfo: {
              isMobile,
              browserInfo: navigator.userAgent
            }
          }}
        />
      </Box>
      
      {/* Side Menu Drawer */}
      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Virtual Try-On
            </Typography>
            
            <Button 
              fullWidth 
              variant="outlined" 
              sx={{ mb: 1 }}
              onClick={resetFlow}
            >
              New Try-On
            </Button>
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Cultural Style
            </Typography>
            
            <Tabs
              value={culturalStyle}
              onChange={(_, newValue) => setCulturalStyle(newValue)}
              orientation="vertical"
              variant="fullWidth"
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              <Tab label="Western" value="western" />
              <Tab label="Indian" value="indian" />
              <Tab label="Asian" value="asian" />
              <Tab label="Middle Eastern" value="middle-eastern" />
            </Tabs>
            
            <Button 
              fullWidth 
              variant="text" 
              color="secondary"
              sx={{ mt: 2 }}
              onClick={() => setClaudeMinimized(!claudeMinimized)}
              startIcon={claudeMinimized ? null : <MinimizeIcon />}
            >
              {claudeMinimized ? 'Show Assistant' : 'Minimize Assistant'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </div>
  );
}

export default App;