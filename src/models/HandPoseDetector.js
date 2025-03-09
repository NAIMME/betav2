import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

/**
 * HandPoseDetector
 * 
 * This class uses TensorFlow.js and MediaPipe Hands to detect hand landmarks
 * for jewelry try-on, primarily for rings, bracelets, and watches.
 */
class HandPoseDetector {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.lastPredictionTime = 0;
    this.detectionConfidence = 0.7;
    this.maxHands = 2;
  }
  
  /**
   * Initialize the hand pose detector
   */
  async initialize() {
    try {
      // Ensure TensorFlow backend is initialized
      await tf.setBackend('webgl');
      
      // Load the MediaPipe Hands model
      this.model = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: 'tfjs',
          maxHands: this.maxHands,
          modelType: 'full',
          minDetectionConfidence: this.detectionConfidence
        }
      );
      
      this.isInitialized = true;
      console.log('Hand pose detector initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing hand pose detector:', error);
      return false;
    }
  }
  
  /**
   * Detect hand poses from an image or video frame
   * 
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|ImageData} input 
   * @returns {Array} Array of hand pose data
   */
  async detect(input) {
    if (!this.isInitialized || !this.model) {
      throw new Error('Hand pose detector not initialized');
    }
    
    try {
      // Limit detection frequency for performance
      const now = performance.now();
      if (now - this.lastPredictionTime < 100) {  // Max 10 FPS
        return null;
      }
      this.lastPredictionTime = now;
      
      // Perform hand pose detection
      const predictions = await this.model.estimateHands(input);
      
      if (predictions && predictions.length > 0) {
        return this.processPredictions(predictions);
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting hand poses:', error);
      return null;
    }
  }
  
  /**
   * Process and normalize the model predictions
   * 
   * @param {Array} predictions Raw predictions from the model
   * @returns {Array} Processed and enriched hand data
   */
  processPredictions(predictions) {
    return predictions.map(prediction => {
      // Determine handedness (left or right)
      const handedness = prediction.handedness === 'Left' ? 'Left' : 'Right';
      
      // Extract keypoints for jewelry positioning
      const keypoints = this.extractKeypoints(prediction);
      
      // Calculate hand measurements
      const measurements = this.calculateHandMeasurements(prediction);
      
      // Calculate hand rotation/orientation
      const orientation = this.calculateHandOrientation(prediction);
      
      return {
        landmarks: prediction.keypoints3D || prediction.keypoints,
        keypoints: keypoints,
        handedness: handedness,
        measurements: measurements,
        orientation: orientation,
        confidence: prediction.score
      };
    });
  }
  
  /**
   * Extract key points that are useful for jewelry positioning
   * 
   * @param {Object} prediction Raw prediction from the model
   * @returns {Object} Named key points for easy reference
   */
  extractKeypoints(prediction) {
    const landmarks = prediction.keypoints3D || prediction.keypoints;
    
    // Define indices for key hand features
    // These correspond to the MediaPipe Hands model keypoints
    const handLandmarkNames = [
      'wrist',                // 0
      'thumb_cmc',            // 1
      'thumb_mcp',            // 2
      'thumb_ip',             // 3
      'thumb_tip',            // 4
      'index_finger_mcp',     // 5
      'index_finger_pip',     // 6
      'index_finger_dip',     // 7
      'index_finger_tip',     // 8
      'middle_finger_mcp',    // 9
      'middle_finger_pip',    // 10
      'middle_finger_dip',    // 11
      'middle_finger_tip',    // 12
      'ring_finger_mcp',      // 13
      'ring_finger_pip',      // 14
      'ring_finger_dip',      // 15
      'ring_finger_tip',      // 16
      'pinky_mcp',            // 17
      'pinky_pip',            // 18
      'pinky_dip',            // 19
      'pinky_tip'             // 20
    ];
    
    // Create keypoints object with named hand landmarks
    const keypoints = {};
    for (let i = 0; i < landmarks.length; i++) {
      if (handLandmarkNames[i] && landmarks[i]) {
        keypoints[handLandmarkNames[i]] = {
          x: landmarks[i].x,
          y: landmarks[i].y,
          z: landmarks[i].z || 0
        };
      }
    }
    
    // Add derived points for common jewelry positions
    
    // Ring finger position (midpoint of ring finger)
    if (keypoints.ring_finger_mcp && keypoints.ring_finger_pip) {
      keypoints.ring_position = {
        x: (keypoints.ring_finger_mcp.x + keypoints.ring_finger_pip.x) / 2,
        y: (keypoints.ring_finger_mcp.y + keypoints.ring_finger_pip.y) / 2,
        z: (keypoints.ring_finger_mcp.z + keypoints.ring_finger_pip.z) / 2
      };
    }
    
    // Bracelet position (wrist area)
    if (keypoints.wrist) {
      keypoints.bracelet_position = { ...keypoints.wrist };
    }
    
    // Watch position (slightly offset from wrist toward pinky)
    if (keypoints.wrist && keypoints.pinky_mcp) {
      keypoints.watch_position = {
        x: keypoints.wrist.x * 0.8 + keypoints.pinky_mcp.x * 0.2,
        y: keypoints.wrist.y * 0.8 + keypoints.pinky_mcp.y * 0.2,
        z: keypoints.wrist.z * 0.8 + keypoints.pinky_mcp.z * 0.2
      };
    }
    
    return keypoints;
  }
  
  /**
   * Calculate hand measurements from landmarks
   * 
   * @param {Object} prediction Raw prediction from the model
   * @returns {Object} Hand measurement metrics
   */
  calculateHandMeasurements(prediction) {
    const landmarks = prediction.keypoints3D || prediction.keypoints;
    
    try {
      // Calculate palm width (distance between pinky_mcp and index_finger_mcp)
      const pinkyMcp = landmarks[17]; // pinky_mcp
      const indexMcp = landmarks[5];  // index_finger_mcp
      
      const palmWidth = Math.sqrt(
        Math.pow(indexMcp.x - pinkyMcp.x, 2) +
        Math.pow(indexMcp.y - pinkyMcp.y, 2) +
        Math.pow((indexMcp.z || 0) - (pinkyMcp.z || 0), 2)
      );
      
      // Calculate hand length (wrist to middle finger tip)
      const wrist = landmarks[0];     // wrist
      const middleTip = landmarks[12]; // middle_finger_tip
      
      const handLength = Math.sqrt(
        Math.pow(middleTip.x - wrist.x, 2) +
        Math.pow(middleTip.y - wrist.y, 2) +
        Math.pow((middleTip.z || 0) - (wrist.z || 0), 2)
      );
      
      // Calculate finger measurements for ring sizing
      const fingerMeasurements = {
        index: this.calculateFingerDimensions(landmarks, 5),  // index finger
        middle: this.calculateFingerDimensions(landmarks, 9), // middle finger
        ring: this.calculateFingerDimensions(landmarks, 13),  // ring finger
        pinky: this.calculateFingerDimensions(landmarks, 17)  // pinky finger
      };
      
      // Calculate wrist circumference (approximation)
      const wristCircumference = palmWidth * 2.5;
      
      return {
        palmWidth,
        handLength,
        fingerMeasurements,
        wristCircumference,
        aspectRatio: handLength / palmWidth
      };
    } catch (error) {
      console.error('Error calculating hand measurements:', error);
      return {
        palmWidth: 0,
        handLength: 0,
        fingerMeasurements: {
          index: { width: 0, length: 0 },
          middle: { width: 0, length: 0 },
          ring: { width: 0, length: 0 },
          pinky: { width: 0, length: 0 }
        },
        wristCircumference: 0,
        aspectRatio: 0
      };
    }
  }
  
  /**
   * Calculate finger dimensions for a specific finger
   * 
   * @param {Array} landmarks Hand landmarks array
   * @param {Number} baseIndex Base index of the finger
   * @returns {Object} Finger dimensions
   */
  calculateFingerDimensions(landmarks, baseIndex) {
    try {
      // Get key points for this finger
      const mcp = landmarks[baseIndex];        // Metacarpophalangeal joint (base)
      const pip = landmarks[baseIndex + 1];    // Proximal interphalangeal joint (middle)
      const dip = landmarks[baseIndex + 2];    // Distal interphalangeal joint
      const tip = landmarks[baseIndex + 3];    // Fingertip
      
      // Calculate finger length (mcp to tip)
      const fingerLength = Math.sqrt(
        Math.pow(tip.x - mcp.x, 2) +
        Math.pow(tip.y - mcp.y, 2) +
        Math.pow((tip.z || 0) - (mcp.z || 0), 2)
      );
      
      // Calculate finger width (approximation based on pip)
      // This is a rough approximation - in reality we'd need points on either
      // side of the finger to get width, but MediaPipe doesn't provide these directly
      const fingerWidth = fingerLength * 0.15; // Typical finger width ratio
      
      // Calculate segment lengths
      const mcpToPip = Math.sqrt(
        Math.pow(pip.x - mcp.x, 2) +
        Math.pow(pip.y - mcp.y, 2) +
        Math.pow((pip.z || 0) - (mcp.z || 0), 2)
      );
      
      const pipToDip = Math.sqrt(
        Math.pow(dip.x - pip.x, 2) +
        Math.pow(dip.y - pip.y, 2) +
        Math.pow((dip.z || 0) - (pip.z || 0), 2)
      );
      
      const dipToTip = Math.sqrt(
        Math.pow(tip.x - dip.x, 2) +
        Math.pow(tip.y - dip.y, 2) +
        Math.pow((tip.z || 0) - (dip.z || 0), 2)
      );
      
      return {
        width: fingerWidth,
        length: fingerLength,
        segments: {
          mcpToPip,
          pipToDip,
          dipToTip
        }
      };
    } catch (error) {
      console.error('Error calculating finger dimensions:', error);
      return {
        width: 0,
        length: 0,
        segments: { mcpToPip: 0, pipToDip: 0, dipToTip: 0 }
      };
    }
  }
  
  /**
   * Calculate hand orientation from landmarks
   * 
   * @param {Object} prediction Raw prediction from the model
   * @returns {Object} Orientation angles and vectors
   */
  calculateHandOrientation(prediction) {
    const landmarks = prediction.keypoints3D || prediction.keypoints;
    
    try {
      // Get key points for orientation calculation
      const wrist = landmarks[0];      // wrist
      const middleMcp = landmarks[9];  // middle_finger_mcp
      const middleTip = landmarks[12]; // middle_finger_tip
      const indexMcp = landmarks[5];   // index_finger_mcp
      const pinkyMcp = landmarks[17];  // pinky_mcp
      
      // Calculate palm direction vector (from wrist to middle_mcp)
      const palmDirection = {
        x: middleMcp.x - wrist.x,
        y: middleMcp.y - wrist.y,
        z: (middleMcp.z || 0) - (wrist.z || 0)
      };
      
      // Calculate finger direction vector (from middle_mcp to middle_tip)
      const fingerDirection = {
        x: middleTip.x - middleMcp.x,
        y: middleTip.y - middleMcp.y,
        z: (middleTip.z || 0) - (middleMcp.z || 0)
      };
      
      // Calculate palm normal vector (cross product of palm direction and palm width)
      const palmWidth = {
        x: pinkyMcp.x - indexMcp.x,
        y: pinkyMcp.y - indexMcp.y,
        z: (pinkyMcp.z || 0) - (indexMcp.z || 0)
      };
      
      // Calculate palm normal (cross product)
      const palmNormal = {
        x: palmDirection.y * palmWidth.z - palmDirection.z * palmWidth.y,
        y: palmDirection.z * palmWidth.x - palmDirection.x * palmWidth.z,
        z: palmDirection.x * palmWidth.y - palmDirection.y * palmWidth.x
      };
      
      // Normalize vectors
      const normalizePalmDirection = this.normalizeVector(palmDirection);
      const normalizeFingerDirection = this.normalizeVector(fingerDirection);
      const normalizePalmNormal = this.normalizeVector(palmNormal);
      
      // Calculate angles
      // Pitch: angle between palm direction and y-axis (up-down tilt)
      const pitch = Math.acos(normalizePalmDirection.y);
      
      // Yaw: angle between palm direction projected on xz-plane and z-axis (left-right rotation)
      const projectedPalmDirection = {
        x: palmDirection.x,
        y: 0,
        z: palmDirection.z
      };
      const normalizeProjectedPalmDirection = this.normalizeVector(projectedPalmDirection);
      const yaw = Math.atan2(normalizeProjectedPalmDirection.x, normalizeProjectedPalmDirection.z);
      
      // Roll: angle between palm normal and y-axis (hand rotation around palm direction)
      const roll = Math.atan2(normalizePalmNormal.x, normalizePalmNormal.z);
      
      return {
        angles: {
          pitch: pitch * (180 / Math.PI),  // Convert to degrees
          yaw: yaw * (180 / Math.PI),      // Convert to degrees
          roll: roll * (180 / Math.PI)     // Convert to degrees
        },
        vectors: {
          palmDirection: normalizePalmDirection,
          fingerDirection: normalizeFingerDirection,
          palmNormal: normalizePalmNormal
        }
      };
    } catch (error) {
      console.error('Error calculating hand orientation:', error);
      return {
        angles: { pitch: 0, yaw: 0, roll: 0 },
        vectors: {
          palmDirection: { x: 0, y: 1, z: 0 },
          fingerDirection: { x: 0, y: 1, z: 0 },
          palmNormal: { x: 1, y: 0, z: 0 }
        }
      };
    }
  }
  
  /**
   * Normalize a 3D vector
   * 
   * @param {Object} vector Vector to normalize
   * @returns {Object} Normalized vector
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(
      vector.x * vector.x + 
      vector.y * vector.y + 
      vector.z * vector.z
    );
    
    if (magnitude === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
      z: vector.z / magnitude
    };
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.model && typeof this.model.dispose === 'function') {
      this.model.dispose();
    }
    this.model = null;
    this.isInitialized = false;
  }
  
  /**
   * Update detector configuration
   * 
   * @param {Object} config Configuration options
   */
  updateConfig(config) {
    if (config.detectionConfidence !== undefined) {
      this.detectionConfidence = config.detectionConfidence;
    }
    
    if (config.maxHands !== undefined) {
      this.maxHands = config.maxHands;
    }
    
    // Reinitialize with new configuration if already initialized
    if (this.isInitialized && (
      config.detectionConfidence !== undefined || 
      config.maxHands !== undefined
    )) {
      this.dispose();
      this.initialize();
    }
  }
}

export default HandPoseDetector;