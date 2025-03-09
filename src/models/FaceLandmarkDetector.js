// Add debug logs at the module level
console.log('FaceLandmarkDetector module loading');

import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

// Log imported modules
console.log('TensorFlow imported as:', tf);
console.log('faceLandmarksDetection imported as:', faceLandmarksDetection);

/**
 * FaceLandmarkDetector
 * 
 * This class uses TensorFlow.js and MediaPipe Face Mesh to detect face landmarks
 * for jewelry try-on, primarily for earrings and necklaces.
 */
class FaceLandmarkDetector {
  constructor() {
    console.log('FaceLandmarkDetector constructor called');
    this.model = null;
    this.isInitialized = false;
    this.lastPredictionTime = 0;
    this.detectionConfidence = 0.8;
  }
  
  /**
   * Initialize the face landmark detector
   */
  async initialize() {
    console.log('FaceLandmarkDetector initialize method called');
    try {
      // Ensure TensorFlow backend is initialized
      console.log('About to set WebGL backend');
      await tf.setBackend('webgl');
      console.log('WebGL backend set, calling tf.ready()');
      await tf.ready();
      console.log('TensorFlow ready, backend:', tf.getBackend());
      
      // Load the MediaPipe FaceMesh model using the updated API
      console.log('About to create face detection model with config:', {
        runtime: 'tfjs',
        maxFaces: 1,
        refineLandmarks: true,
        detectionConfidence: this.detectionConfidence
      });
      
      this.model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          maxFaces: 1,
          refineLandmarks: true,
          detectionConfidence: this.detectionConfidence
        }
      );
      
      console.log('Face mesh model loaded successfully:', this.model);
      this.isInitialized = true;
      console.log('Face landmark detector initialized successfully');
      return true;
    } catch (error) {
      console.error('Error in face detector initialization:', error);
      return false;
    }
  }
  
  /**
   * Detect face landmarks from an image or video frame
   * 
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|ImageData} input 
   * @returns {Array} Array of face landmarks with 3D coordinates
   */
  async detect(input) {
    console.log('Detect method called with input:', input);
    
    if (!this.isInitialized || !this.model) {
      console.error('Face landmark detector not initialized');
      throw new Error('Face landmark detector not initialized');
    }
    
    try {
      // Limit detection frequency for performance
      const now = performance.now();
      if (now - this.lastPredictionTime < 50) {  // Max 20 FPS
        console.log('Skipping detection due to frequency limit');
        return null;
      }
      this.lastPredictionTime = now;
      
      console.log('About to call model.estimateFaces()');
      // Perform face landmarks detection using updated API
      const predictions = await this.model.estimateFaces(input);
      console.log('Raw face predictions:', predictions);
      
      if (predictions && predictions.length > 0) {
        const processedResults = this.processPredictions(predictions);
        console.log('Processed face predictions:', processedResults);
        return processedResults;
      }
      
      console.log('No faces detected');
      return null;
    } catch (error) {
      console.error('Error detecting face landmarks:', error);
      return null;
    }
  }
  
  /**
   * Process and normalize the model predictions
   * 
   * @param {Array} predictions Raw predictions from the model
   * @returns {Array} Processed and enriched face data
   */
  processPredictions(predictions) {
    console.log('Processing predictions:', predictions);
    return predictions.map(prediction => {
      // Extract key points for jewelry positioning
      const keypoints = this.extractKeypoints(prediction);
      
      // Calculate face rotation from landmarks
      const rotation = this.calculateFaceRotation(prediction);
      
      // Calculate face size and scale
      const faceSize = this.calculateFaceSize(prediction);
      
      return {
        landmarks: prediction.keypoints || prediction.mesh,
        keypoints: keypoints,
        rotation: rotation,
        faceSize: faceSize,
        boundingBox: prediction.box || prediction.boundingBox,
        confidence: prediction.score || prediction.faceInViewConfidence
      };
    });
  }
  
  /**
   * Extract key landmark points for jewelry positioning
   * 
   * @param {Object} prediction Face prediction data
   * @returns {Object} Object containing key face points
   */
  extractKeypoints(prediction) {
    const keypoints = {};
    const landmarks = prediction.keypoints || prediction.mesh;
    
    console.log('Extracting keypoints from landmarks:', landmarks ? landmarks.length : 'none');
    
    if (!landmarks || landmarks.length === 0) {
      return keypoints;
    }
    
    // Map specific landmark indices to named points
    // These indices are based on MediaPipe Face Mesh topology
    // https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection#mediapipe-facemesh-keypoints-map
    
    // Ears
    keypoints.leftEar = landmarks[234] || landmarks[93]; // Left ear
    keypoints.rightEar = landmarks[454] || landmarks[323]; // Right ear
    
    // Eyes
    keypoints.leftEye = landmarks[33] || landmarks[159]; // Left eye
    keypoints.rightEye = landmarks[263] || landmarks[386]; // Right eye
    
    // Nose
    keypoints.noseTip = landmarks[1] || landmarks[19]; // Nose tip
    
    // Mouth
    keypoints.upperLip = landmarks[13] || landmarks[0]; // Upper lip
    keypoints.lowerLip = landmarks[14] || landmarks[17]; // Lower lip
    
    // Neck - approximate based on face landmarks
    if (keypoints.leftEar && keypoints.rightEar) {
      keypoints.neckBase = {
        x: (keypoints.leftEar.x + keypoints.rightEar.x) / 2,
        y: Math.max(keypoints.leftEar.y, keypoints.rightEar.y) + 50,
        z: (keypoints.leftEar.z + keypoints.rightEar.z) / 2
      };
    }
    
    console.log('Extracted keypoints:', keypoints);
    return keypoints;
  }
  
  /**
   * Calculate face rotation from landmarks
   * 
   * @param {Object} prediction Face prediction data
   * @returns {Object} Object containing rotation angles
   */
  calculateFaceRotation(prediction) {
    const landmarks = prediction.keypoints || prediction.mesh;
    
    if (!landmarks || landmarks.length < 468) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }
    
    // Simplified rotation calculation based on eye and nose positions
    const leftEye = landmarks[33] || landmarks[159];
    const rightEye = landmarks[263] || landmarks[386];
    const noseTip = landmarks[1] || landmarks[19];
    
    if (!leftEye || !rightEye || !noseTip) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }
    
    // Calculate roll (rotation around z-axis)
    const deltaY = rightEye.y - leftEye.y;
    const deltaX = rightEye.x - leftEye.x;
    const roll = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Calculate yaw (rotation around y-axis)
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };
    const eyeToNoseX = noseTip.x - eyeCenter.x;
    const yaw = eyeToNoseX * 100; // Simplified approximation
    
    // Calculate pitch (rotation around x-axis)
    const eyeToNoseY = noseTip.y - eyeCenter.y;
    const pitch = eyeToNoseY * 100; // Simplified approximation
    
    return { pitch, yaw, roll };
  }
  
  /**
   * Calculate face size from landmarks
   * 
   * @param {Object} prediction Face prediction data
   * @returns {Object} Object containing face dimensions
   */
  calculateFaceSize(prediction) {
    const landmarks = prediction.keypoints || prediction.mesh;
    
    if (!landmarks || landmarks.length === 0) {
      return { width: 0, height: 0 };
    }
    
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    // Find bounding box of face landmarks
    landmarks.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    
    return {
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    console.log('Disposing face landmark detector');
    try {
      if (this.model && typeof this.model.dispose === 'function') {
        this.model.dispose();
      }
      this.model = null;
      this.isInitialized = false;
      console.log('Face landmark detector disposed');
    } catch (error) {
      console.error('Error disposing face landmark detector:', error);
    }
  }
  
  /**
   * Update detector configuration
   * 
   * @param {Object} config Configuration options
   */
  updateConfig(config) {
    console.log('Updating detector config:', config);
    if (config.detectionConfidence !== undefined) {
      this.detectionConfidence = config.detectionConfidence;
      
      // Reinitialize with new configuration if already initialized
      if (this.isInitialized) {
        console.log('Reinitializing with new configuration');
        this.dispose();
        this.initialize();
      }
    }
  }
  
  /**
   * FOR TESTING: Return mock data if needed
   */
  mockDetect() {
    console.log('Using mock detection data');
    return [{
      keypoints: {
        leftEar: { x: 100, y: 150, z: 0 },
        rightEar: { x: 300, y: 150, z: 0 },
        neckBase: { x: 200, y: 250, z: 0 },
        leftEye: { x: 150, y: 100, z: 0 },
        rightEye: { x: 250, y: 100, z: 0 },
        noseTip: { x: 200, y: 150, z: 0 },
        upperLip: { x: 200, y: 180, z: 0 },
        lowerLip: { x: 200, y: 200, z: 0 }
      },
      confidence: 0.9,
      faceSize: { width: 200, height: 250 },
      rotation: { pitch: 0, yaw: 0, roll: 0 }
    }];
  }
}

// Export the class
console.log('Exporting FaceLandmarkDetector class');
export default FaceLandmarkDetector;