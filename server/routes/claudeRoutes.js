const express = require('express');
const router = express.Router();
const claudeController = require('../controllers/claudeController');

/**
 * Claude API Routes
 * 
 * Routes for interacting with Claude API for both user-facing
 * and system-level intelligence features.
 */

// Health check route
router.get('/ping', claudeController.pingClaude);

// Main conversation route
router.post('/conversation', claudeController.conversationWithClaude);

// Telemetry analysis route
router.post('/analyze-telemetry', claudeController.analyzeTelemetry);

// Style advice route
router.post('/style-advice', claudeController.getStyleAdvice);

module.exports = router;