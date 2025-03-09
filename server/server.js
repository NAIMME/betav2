const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { logRequest } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Import routes
const claudeRoutes = require('./routes/claudeRoutes');

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(logRequest);

// API Routes
app.use('/api/claude', claudeRoutes);

// Optional: Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../build')));

  // Handle any requests that don't match the ones above
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
  
  if (process.env.CLAUDE_API_KEY) {
    console.log('Claude API key detected');
  } else {
    console.warn('⚠️ Claude API key not found! Please add CLAUDE_API_KEY to your .env file');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // In a production environment, you might want to exit the process
  // process.exit(1);
});