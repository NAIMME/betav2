/**
 * SystemTelemetry.js
 * 
 * Utility class for collecting and analyzing system telemetry data,
 * including performance metrics, errors, and user interactions.
 * This data can be used by Claude for system-level intelligence.
 */

class SystemTelemetry {
    constructor() {
      this.metrics = {
        performance: {
          frameRates: [],
          loadTimes: {},
          renderTimes: {},
          modelLoadTimes: {}
        },
        errors: [],
        userInteractions: [],
        modelPerformance: {
          faceDetection: [],
          handPose: [],
          bodyParsing: [],
          diffusion: []
        },
        deviceCapabilities: null
      };
      
      this.isCollecting = false;
      this.lastFrameTime = 0;
      this.frameCount = 0;
      this.reportInterval = null;
      
      // Configuration options
      this.config = {
        collectInterval: 5000,  // 5 seconds
        reportInterval: 60000,  // 1 minute
        maxErrorsStored: 100,
        maxInteractionsStored: 200,
        maxMetricsPerCategory: 1000
      };
    }
    
    /**
     * Start collecting telemetry data
     */
    startCollection() {
      if (this.isCollecting) return;
      
      this.isCollecting = true;
      this.detectDeviceCapabilities();
      this.setupPerformanceMonitoring();
      
      // Set up periodic reporting if enabled
      if (this.config.reportInterval > 0) {
        this.reportInterval = setInterval(() => {
          this.reportTelemetry();
        }, this.config.reportInterval);
      }
      
      console.log('System telemetry collection started');
    }
    
    /**
     * Stop collecting telemetry data
     */
    stopCollection() {
      this.isCollecting = false;
      
      if (this.reportInterval) {
        clearInterval(this.reportInterval);
        this.reportInterval = null;
      }
      
      console.log('System telemetry collection stopped');
    }
    
    /**
     * Detect device capabilities for context
     */
    detectDeviceCapabilities() {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      this.metrics.deviceCapabilities = {
        userAgent: navigator.userAgent,
        screenResolution: {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio
        },
        webglSupport: !!gl,
        webglInfo: gl ? {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION)
        } : null,
        memoryInfo: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        } : 'unknown',
        touchSupport: 'ontouchstart' in window,
        mediaCapabilities: {
          camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
        }
      };
    }
    
    /**
     * Set up performance monitoring
     */
    setupPerformanceMonitoring() {
      // Monitor frame rate using requestAnimationFrame
      const frameCallback = (timestamp) => {
        if (!this.isCollecting) return;
        
        this.frameCount++;
        
        // Calculate frame rate every second
        if (timestamp - this.lastFrameTime >= 1000) {
          const fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFrameTime));
          this.recordFrameRate(fps);
          
          this.frameCount = 0;
          this.lastFrameTime = timestamp;
        }
        
        requestAnimationFrame(frameCallback);
      };
      
      this.lastFrameTime = performance.now();
      requestAnimationFrame(frameCallback);
      
      // Monitor performance entries if supported
      if ('PerformanceObserver' in window) {
        const perfObserver = new PerformanceObserver((entries) => {
          entries.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordResourceLoad(entry);
            } else if (entry.entryType === 'paint') {
              this.recordPaintTiming(entry);
            }
          });
        });
        
        perfObserver.observe({ entryTypes: ['resource', 'paint'] });
      }
    }
    
    /**
     * Record frame rate measurement
     * 
     * @param {Number} fps Frames per second
     */
    recordFrameRate(fps) {
      if (!this.isCollecting) return;
      
      this.metrics.performance.frameRates.push({
        timestamp: new Date().toISOString(),
        fps: fps
      });
      
      // Limit array size
      if (this.metrics.performance.frameRates.length > this.config.maxMetricsPerCategory) {
        this.metrics.performance.frameRates.shift();
      }
    }
    
    /**
     * Record resource load timing
     * 
     * @param {PerformanceEntry} entry Performance entry
     */
    recordResourceLoad(entry) {
      if (!this.isCollecting) return;
      
      // Only track specific resources like models or large assets
      if (entry.name.includes('/models/') || 
          entry.name.includes('.glb') ||
          entry.name.includes('.bin')) {
        
        const category = entry.name.includes('face') ? 'face' :
                         entry.name.includes('hand') ? 'hand' :
                         entry.name.includes('body') ? 'body' :
                         entry.name.includes('jewelry') ? 'jewelry' : 'other';
        
        if (!this.metrics.performance.loadTimes[category]) {
          this.metrics.performance.loadTimes[category] = [];
        }
        
        this.metrics.performance.loadTimes[category].push({
          name: entry.name,
          duration: entry.duration,
          timestamp: new Date().toISOString()
        });
        
        // Limit array size
        if (this.metrics.performance.loadTimes[category].length > this.config.maxMetricsPerCategory) {
          this.metrics.performance.loadTimes[category].shift();
        }
      }
    }
    
    /**
     * Record paint timing
     * 
     * @param {PerformanceEntry} entry Performance entry
     */
    recordPaintTiming(entry) {
      if (!this.isCollecting) return;
      
      const metric = entry.name === 'first-paint' ? 'firstPaint' : 'firstContentfulPaint';
      
      this.metrics.performance[metric] = {
        value: entry.startTime,
        timestamp: new Date().toISOString()
      };
    }
    
    /**
     * Record a model's performance metrics
     * 
     * @param {String} modelType Type of model (faceDetection, handPose, etc)
     * @param {Object} data Performance data
     */
    recordModelPerformance(modelType, data) {
      if (!this.isCollecting) return;
      
      if (!this.metrics.modelPerformance[modelType]) {
        this.metrics.modelPerformance[modelType] = [];
      }
      
      this.metrics.modelPerformance[modelType].push({
        ...data,
        timestamp: new Date().toISOString()
      });
      
      // Limit array size
      if (this.metrics.modelPerformance[modelType].length > this.config.maxMetricsPerCategory) {
        this.metrics.modelPerformance[modelType].shift();
      }
    }
    
    /**
     * Record render timing for a component
     * 
     * @param {String} componentName Name of the component
     * @param {Number} duration Duration in milliseconds
     */
    recordRenderTime(componentName, duration) {
      if (!this.isCollecting) return;
      
      if (!this.metrics.performance.renderTimes[componentName]) {
        this.metrics.performance.renderTimes[componentName] = [];
      }
      
      this.metrics.performance.renderTimes[componentName].push({
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Limit array size
      if (this.metrics.performance.renderTimes[componentName].length > this.config.maxMetricsPerCategory) {
        this.metrics.performance.renderTimes[componentName].shift();
      }
    }
    
    /**
     * Record an error event
     * 
     * @param {String} category Error category
     * @param {String} message Error message
     * @param {Object} details Additional error details
     */
    recordError(category, message, details = {}) {
      if (!this.isCollecting) return;
      
      this.metrics.errors.push({
        category,
        message,
        details,
        timestamp: new Date().toISOString()
      });
      
      // Limit array size
      if (this.metrics.errors.length > this.config.maxErrorsStored) {
        this.metrics.errors.shift();
      }
      
      // Log critical errors immediately
      if (details.severity === 'critical') {
        this.reportTelemetry(true);
      }
    }
    
    /**
     * Record a user interaction
     * 
     * @param {String} action Type of interaction
     * @param {Object} data Interaction data
     */
    recordUserInteraction(action, data = {}) {
      if (!this.isCollecting) return;
      
      this.metrics.userInteractions.push({
        action,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Limit array size
      if (this.metrics.userInteractions.length > this.config.maxInteractionsStored) {
        this.metrics.userInteractions.shift();
      }
    }
    
    /**
     * Report telemetry data to server and Claude
     * 
     * @param {Boolean} forceSend Force sending data now
     */
    async reportTelemetry(forceSend = false) {
      // Check if we should send data
      if (!forceSend && !this.isCollecting) return;
      
      // Create report payload
      const reportData = {
        timestamp: new Date().toISOString(),
        metrics: { ...this.metrics },
        session: {
          duration: (performance.now() / 1000).toFixed(0),
          id: this.sessionId || 'unknown'
        }
      };
      
      try {
        // Send to server API
        const response = await fetch('/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportData)
        });
        
        if (!response.ok) {
          console.error('Failed to send telemetry data');
        }
        
        // Optionally clear collected data after reporting
        this.clearMetrics();
      } catch (error) {
        console.error('Error sending telemetry data:', error);
      }
    }
    
    /**
     * Clear metrics to prevent memory bloat
     * 
     * @param {Array} categories Optional specific categories to clear
     */
    clearMetrics(categories = []) {
      if (categories.length === 0) {
        // Clear all except device capabilities
        const deviceCapabilities = this.metrics.deviceCapabilities;
        
        this.metrics = {
          performance: {
            frameRates: [],
            loadTimes: {},
            renderTimes: {},
            modelLoadTimes: {}
          },
          errors: [],
          userInteractions: [],
          modelPerformance: {
            faceDetection: [],
            handPose: [],
            bodyParsing: [],
            diffusion: []
          },
          deviceCapabilities
        };
      } else {
        // Clear specific categories
        categories.forEach(category => {
          if (category === 'errors') {
            this.metrics.errors = [];
          } else if (category === 'userInteractions') {
            this.metrics.userInteractions = [];
          } else if (category === 'performance') {
            this.metrics.performance = {
              frameRates: [],
              loadTimes: {},
              renderTimes: {},
              modelLoadTimes: {}
            };
          } else if (category === 'modelPerformance') {
            this.metrics.modelPerformance = {
              faceDetection: [],
              handPose: [],
              bodyParsing: [],
              diffusion: []
            };
          }
        });
      }
    }
    
    /**
     * Get current telemetry data
     * 
     * @returns {Object} Telemetry metrics
     */
    getTelemetryData() {
      return { ...this.metrics };
    }
    
    /**
     * Set session identifier
     * 
     * @param {String} id Session ID
     */
    setSessionId(id) {
      this.sessionId = id;
    }
    
    /**
     * Update configuration
     * 
     * @param {Object} newConfig New configuration options
     */
    updateConfig(newConfig) {
      this.config = {
        ...this.config,
        ...newConfig
      };
      
      // Restart reporting interval if changed
      if (this.reportInterval && newConfig.reportInterval) {
        clearInterval(this.reportInterval);
        this.reportInterval = setInterval(() => {
          this.reportTelemetry();
        }, this.config.reportInterval);
      }
    }
  }
  
  // Export as singleton
  const systemTelemetry = new SystemTelemetry();
  export default systemTelemetry;