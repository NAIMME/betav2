/**
 * Error Handler Middleware
 * 
 * Provides error logging and handling for API requests.
 */

// Log request details for debugging
exports.logRequest = (req, res, next) => {
    // Skip logging for static assets
    if (req.path.startsWith('/static/') || req.path.startsWith('/models/')) {
      return next();
    }
    
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    
    // Log request details
    console.log(`[${timestamp}] ${method} ${url}`);
    
    // Track API response time
    const startTime = Date.now();
    
    // Override end method to calculate response time
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log response details
      console.log(`[${timestamp}] ${method} ${url} - Status: ${statusCode} - Time: ${responseTime}ms`);
      
      // Call original end method
      return originalEnd.apply(this, args);
    };
    
    next();
  };
  
  // Global error handler
  exports.errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const timestamp = new Date().toISOString();
    
    // Log error details
    console.error(`[${timestamp}] ERROR: ${err.message}`);
    console.error(err.stack);
    
    // Send error response to client
    res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
  
  // Custom error class
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  exports.AppError = AppError;
  
  // Not found handler
  exports.notFound = (req, res, next) => {
    const err = new AppError(`Resource not found: ${req.originalUrl}`, 404);
    next(err);
  };
