import React from 'react';
import './LoadingIndicator.css';

/**
 * LoadingIndicator Component
 * 
 * A reusable loading indicator for showing processing status
 * throughout the application.
 */
const LoadingIndicator = ({ 
  message = 'Loading...', 
  showProgress = false, 
  progress = 0,
  type = 'spinner' // 'spinner', 'dots', 'bar'
}) => {
  return (
    <div className="loading-indicator-container">
      {type === 'spinner' && (
        <div className="loading-spinner">
          <div className="spinner-inner"></div>
        </div>
      )}
      
      {type === 'dots' && (
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}
      
      {type === 'bar' && (
        <div className="loading-bar-container">
          <div 
            className="loading-bar-progress" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      <div className="loading-message">{message}</div>
      
      {showProgress && (
        <div className="loading-progress">
          {progress}%
        </div>
      )}
    </div>
  );
};

export default LoadingIndicator;