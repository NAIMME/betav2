import React, { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

/**
 * ClaudeErrorBoundary Component
 * 
 * Error boundary specifically for the Claude Assistant component
 * to gracefully handle runtime errors and provide recovery options.
 */
class ClaudeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  // Static method to derive state from error
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  // Lifecycle method to catch errors
  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to telemetry system
    console.error('Claude Assistant Error:', error, errorInfo);
    
    // Optionally send error to server for logging
    this.logErrorToServer(error, errorInfo);
  }
  
  // Send error to server for logging and analysis
  logErrorToServer(error, errorInfo) {
    try {
      // In a real implementation, this would send data to your server
      /*
      fetch('/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'ClaudeAssistant',
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })
      });
      */
    } catch (err) {
      console.error('Failed to log error to server:', err);
    }
  }
  
  // Handle retrying/resetting the component
  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <Box 
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: '#f8f9fa',
            borderRadius: 2
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          
          <Typography variant="h6" color="error" align="center" gutterBottom>
            Something went wrong with Claude Assistant
          </Typography>
          
          <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
            We're sorry for the inconvenience. The assistant encountered an error and couldn't continue.
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
          >
            Reload Assistant
          </Button>
          
          {/* Only show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f1f1f1', borderRadius: 1, width: '100%' }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
              </Typography>
              
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo?.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }
    
    // If no error, render children normally
    return this.props.children;
  }
}

export default ClaudeErrorBoundary;