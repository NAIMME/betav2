const claudeController = require('./claudeController');

/**
 * Telemetry Controller
 * 
 * Handles collection, storage, and analysis of system telemetry data
 * using Claude for insights and recommendations.
 */

// In-memory store for telemetry data (in production, use a database)
let telemetryStore = [];
const MAX_TELEMETRY_ENTRIES = 100;

// Receive and store telemetry data
exports.receiveTelemetry = async (req, res) => {
  try {
    const { metrics, session } = req.body;
    
    if (!metrics) {
      return res.status(400).json({
        status: 'error',
        message: 'Telemetry metrics are required'
      });
    }
    
    // Add timestamp if not provided
    const telemetryEntry = {
      ...req.body,
      received: new Date().toISOString()
    };
    
    // Store telemetry data
    telemetryStore.unshift(telemetryEntry);
    
    // Limit store size
    if (telemetryStore.length > MAX_TELEMETRY_ENTRIES) {
      telemetryStore = telemetryStore.slice(0, MAX_TELEMETRY_ENTRIES);
    }
    
    // Analysis request flag
    const shouldAnalyze = req.query.analyze === 'true';
    
    if (shouldAnalyze) {
      // Send telemetry to Claude for analysis in background
      this.analyzeTelemetryWithClaude(telemetryEntry)
        .catch(err => console.error('Background telemetry analysis error:', err));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Telemetry data received',
      analyze: shouldAnalyze
    });
  } catch (error) {
    console.error('Telemetry processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process telemetry data',
      error: error.message
    });
  }
};

// Get recent telemetry data
exports.getTelemetry = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const entries = telemetryStore.slice(0, limit);
    
    res.status(200).json({
      status: 'success',
      count: entries.length,
      data: entries
    });
  } catch (error) {
    console.error('Telemetry retrieval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve telemetry data',
      error: error.message
    });
  }
};

// Clear telemetry data
exports.clearTelemetry = (req, res) => {
  try {
    telemetryStore = [];
    
    res.status(200).json({
      status: 'success',
      message: 'Telemetry data cleared'
    });
  } catch (error) {
    console.error('Telemetry clear error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear telemetry data',
      error: error.message
    });
  }
};

// Analyze telemetry data with Claude
exports.analyzeTelemetryWithClaude = async (telemetryData) => {
  try {
    // Create fake request/response objects for controller
    const req = {
      body: {
        telemetryData
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => {
          if (code !== 200) {
            console.error('Claude telemetry analysis error:', data);
          } else {
            console.log('Claude telemetry analysis complete');
            
            // Store analysis in telemetry entry
            const index = telemetryStore.findIndex(entry => 
              entry.timestamp === telemetryData.timestamp && 
              entry.session.id === telemetryData.session.id
            );
            
            if (index !== -1) {
              telemetryStore[index].analysis = data.analysis;
            }
          }
          return data;
        }
      })
    };
    
    // Call Claude controller
    return await claudeController.analyzeTelemetry(req, res);
  } catch (error) {
    console.error('Error analyzing telemetry with Claude:', error);
    throw error;
  }
};

// Analyze all stored telemetry
exports.analyzeAllTelemetry = async (req, res) => {
  try {
    if (telemetryStore.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No telemetry data available for analysis'
      });
    }
    
    // Compile telemetry for analysis
    const compiledTelemetry = {
      timestamp: new Date().toISOString(),
      entryCount: telemetryStore.length,
      metrics: {
        performance: compilePerformanceMetrics(),
        errors: compileErrorMetrics(),
        userInteractions: compileUserInteractionMetrics(),
        modelPerformance: compileModelMetrics()
      }
    };
    
    // Create fake request for Claude controller
    const claudeReq = {
      body: {
        telemetryData: compiledTelemetry
      }
    };
    
    // Create response handler
    let analysisResult;
    const claudeRes = {
      status: (code) => ({
        json: (data) => {
          analysisResult = data;
          return data;
        }
      })
    };
    
    // Call Claude for analysis
    await claudeController.analyzeTelemetry(claudeReq, claudeRes);
    
    // Return analysis to client
    res.status(200).json({
      status: 'success',
      analysis: analysisResult.analysis,
      dataPoints: telemetryStore.length
    });
  } catch (error) {
    console.error('Full telemetry analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze telemetry data',
      error: error.message
    });
  }
};

// Helper function to compile performance metrics
function compilePerformanceMetrics() {
  const allFrameRates = [];
  const loadTimes = {};
  const renderTimes = {};
  
  // Extract and compile metrics from all entries
  telemetryStore.forEach(entry => {
    const performance = entry.metrics?.performance;
    if (!performance) return;
    
    // Compile frame rates
    if (performance.frameRates) {
      allFrameRates.push(...performance.frameRates);
    }
    
    // Compile load times
    if (performance.loadTimes) {
      Object.entries(performance.loadTimes).forEach(([category, times]) => {
        if (!loadTimes[category]) {
          loadTimes[category] = [];
        }
        loadTimes[category].push(...times);
      });
    }
    
    // Compile render times
    if (performance.renderTimes) {
      Object.entries(performance.renderTimes).forEach(([component, times]) => {
        if (!renderTimes[component]) {
          renderTimes[component] = [];
        }
        renderTimes[component].push(...times);
      });
    }
  });
  
  // Calculate averages and stats
  const avgFrameRate = allFrameRates.length > 0
    ? allFrameRates.reduce((sum, item) => sum + item.fps, 0) / allFrameRates.length
    : 0;
  
  const loadTimeStats = {};
  Object.entries(loadTimes).forEach(([category, times]) => {
    loadTimeStats[category] = {
      average: times.reduce((sum, item) => sum + item.duration, 0) / times.length,
      min: Math.min(...times.map(item => item.duration)),
      max: Math.max(...times.map(item => item.duration)),
      count: times.length
    };
  });
  
  const renderTimeStats = {};
  Object.entries(renderTimes).forEach(([component, times]) => {
    renderTimeStats[component] = {
      average: times.reduce((sum, item) => sum + item.duration, 0) / times.length,
      min: Math.min(...times.map(item => item.duration)),
      max: Math.max(...times.map(item => item.duration)),
      count: times.length
    };
  });
  
  return {
    frameRate: {
      average: avgFrameRate,
      samples: allFrameRates.length
    },
    loadTimes: loadTimeStats,
    renderTimes: renderTimeStats
  };
}

// Helper function to compile error metrics
function compileErrorMetrics() {
  const allErrors = [];
  const errorCategories = {};
  
  // Extract and compile errors from all entries
  telemetryStore.forEach(entry => {
    const errors = entry.metrics?.errors;
    if (!errors || !Array.isArray(errors)) return;
    
    allErrors.push(...errors);
    
    // Count errors by category
    errors.forEach(error => {
      const category = error.category || 'unknown';
      if (!errorCategories[category]) {
        errorCategories[category] = 0;
      }
      errorCategories[category]++;
    });
  });
  
  return {
    total: allErrors.length,
    categories: errorCategories,
    samples: allErrors.slice(0, 10) // Include a few sample errors
  };
}

// Helper function to compile user interaction metrics
function compileUserInteractionMetrics() {
  const allInteractions = [];
  const interactionTypes = {};
  
  // Extract and compile interactions from all entries
  telemetryStore.forEach(entry => {
    const interactions = entry.metrics?.userInteractions;
    if (!interactions || !Array.isArray(interactions)) return;
    
    allInteractions.push(...interactions);
    
    // Count interactions by type
    interactions.forEach(interaction => {
      const type = interaction.action || 'unknown';
      if (!interactionTypes[type]) {
        interactionTypes[type] = 0;
      }
      interactionTypes[type]++;
    });
  });
  
  return {
    total: allInteractions.length,
    types: interactionTypes
  };
}

// Helper function to compile model performance metrics
function compileModelMetrics() {
  const modelTypes = {};
  
  // Extract and compile model metrics from all entries
  telemetryStore.forEach(entry => {
    const modelPerformance = entry.metrics?.modelPerformance;
    if (!modelPerformance) return;
    
    // Process each model type
    Object.entries(modelPerformance).forEach(([modelType, metrics]) => {
      if (!Array.isArray(metrics)) return;
      
      if (!modelTypes[modelType]) {
        modelTypes[modelType] = {
          executionTimes: [],
          confidenceScores: [],
          count: 0
        };
      }
      
      // Extract relevant metrics
      metrics.forEach(metric => {
        if (metric.executionTime) {
          modelTypes[modelType].executionTimes.push(metric.executionTime);
        }
        
        if (metric.confidence) {
          modelTypes[modelType].confidenceScores.push(metric.confidence);
        }
        
        modelTypes[modelType].count++;
      });
    });
  });
  
  // Calculate averages for each model type
  Object.keys(modelTypes).forEach(modelType => {
    const model = modelTypes[modelType];
    
    model.avgExecutionTime = model.executionTimes.length > 0
      ? model.executionTimes.reduce((sum, time) => sum + time, 0) / model.executionTimes.length
      : 0;
      
    model.avgConfidence = model.confidenceScores.length > 0
      ? model.confidenceScores.reduce((sum, score) => sum + score, 0) / model.confidenceScores.length
      : 0;
  });
  
  return modelTypes;
}