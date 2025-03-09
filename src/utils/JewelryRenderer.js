import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * JewelryRenderer
 * 
 * A utility class for rendering jewelry items on canvas based on facial landmarks
 * and hand pose data. This class handles the 2D overlay of jewelry on video frames.
 */
export class JewelryRenderer {
  constructor() {
    this.models = {};
    this.textures = {};
    this.modelLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    
    // Cached positions for smoother transitions
    this.smoothedPositions = {
      earrings: { left: null, right: null },
      necklace: null,
      ring: null,
      bracelet: null,
      watch: null
    };
    
    // Smoothing factor (0 = no smoothing, 1 = maximum smoothing)
    this.smoothingFactor = 0.7;
    
    // Previously rendered jewelry type for optimizing loading
    this.lastRenderedType = null;
  }
  
  /**
   * Preload a jewelry model or texture for faster rendering
   */
  async preload(jewelryItem) {
    if (!jewelryItem) return;
    
    const modelUrl = jewelryItem.modelUrl;
    const textureUrl = jewelryItem.textureUrl;
    
    try {
      // Preload 3D model if available
      if (modelUrl && !this.models[modelUrl]) {
        this.models[modelUrl] = await this.loadModel(modelUrl);
      }
      
      // Preload texture if available
      if (textureUrl && !this.textures[textureUrl]) {
        this.textures[textureUrl] = await this.loadTexture(textureUrl);
      }
    } catch (error) {
      console.error('Error preloading jewelry assets:', error);
    }
  }
  
  /**
   * Load a 3D model from URL
   */
  loadModel(url) {
    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Load a texture from URL
   */
  loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Render jewelry on canvas based on tracking points
   */
  async render(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight) {
    if (!canvasContext || !jewelryItem) return;
    
    const jewelryType = jewelryItem.type;
    
    // Decide which rendering method to use based on jewelry type
    switch (jewelryType) {
      case 'earrings':
        await this.renderEarrings(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight);
        break;
      case 'necklace':
        await this.renderNecklace(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight);
        break;
      case 'ring':
        await this.renderRing(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight);
        break;
      case 'bracelet':
        await this.renderBracelet(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight);
        break;
      case 'watch':
        await this.renderWatch(canvasContext, jewelryItem, trackingPoints, videoWidth, videoHeight);
        break;
      default:
        console.warn(`Unsupported jewelry type: ${jewelryType}`);
    }
    
    // Save the last rendered type for optimization
    this.lastRenderedType = jewelryType;
  }
  
  /**
   * Render earrings based on face landmarks
   */
  async renderEarrings(canvasContext, earrings, trackingPoints, videoWidth, videoHeight) {
    if (!trackingPoints.face) return;
    
    const { face } = trackingPoints;
    
    // Extract earring anchor points from face landmarks
    const leftEarPoint = this.getLeftEarringPosition(face);
    const rightEarPoint = this.getRightEarringPosition(face);
    
    if (!leftEarPoint || !rightEarPoint) return;
    
    // Apply smoothing for stable rendering
    this.smoothedPositions.earrings.left = this.smoothPosition(
      this.smoothedPositions.earrings.left,
      leftEarPoint,
      this.smoothingFactor
    );
    
    this.smoothedPositions.earrings.right = this.smoothPosition(
      this.smoothedPositions.earrings.right,
      rightEarPoint,
      this.smoothingFactor
    );
    
    const leftEar = this.smoothedPositions.earrings.left;
    const rightEar = this.smoothedPositions.earrings.right;
    
    // Calculate scale based on face size
    const eyeDistance = this.calculateDistance(
      face.landmarks[27], // Left eye outer corner (example index)
      face.landmarks[33]  // Right eye outer corner (example index)
    );
    
    const scale = eyeDistance * earrings.sizeAdjustment || 0.15;
    
    try {
      // Render left earring
      if (earrings.leftImageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          earrings.leftImageUrl,
          leftEar.x * videoWidth,
          leftEar.y * videoHeight,
          scale * videoWidth,
          face.rotation || 0
        );
      }
      
      // Render right earring
      if (earrings.rightImageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          earrings.rightImageUrl,
          rightEar.x * videoWidth,
          rightEar.y * videoHeight,
          scale * videoWidth,
          face.rotation || 0
        );
      }
    } catch (error) {
      console.error('Error rendering earrings:', error);
    }
  }
  
  /**
   * Render necklace based on face/neck landmarks
   */
  async renderNecklace(canvasContext, necklace, trackingPoints, videoWidth, videoHeight) {
    if (!trackingPoints.face) return;
    
    const { face } = trackingPoints;
    
    // Get neck base point (approximated from face landmarks)
    const neckPoint = this.getNeckPosition(face);
    
    if (!neckPoint) return;
    
    // Apply smoothing for stable rendering
    this.smoothedPositions.necklace = this.smoothPosition(
      this.smoothedPositions.necklace,
      neckPoint,
      this.smoothingFactor
    );
    
    const neck = this.smoothedPositions.necklace;
    
    // Calculate scale based on face/shoulder width
    const shoulderWidth = this.estimateShoulderWidth(face);
    const scale = shoulderWidth * (necklace.sizeAdjustment || 1.0);
    
    try {
      // Render necklace image
      if (necklace.imageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          necklace.imageUrl,
          neck.x * videoWidth,
          neck.y * videoHeight,
          scale * videoWidth,
          face.rotation || 0
        );
      }
    } catch (error) {
      console.error('Error rendering necklace:', error);
    }
  }
  
  /**
   * Render ring based on hand pose data
   */
  async renderRing(canvasContext, ring, trackingPoints, videoWidth, videoHeight) {
    // Choose hand based on preference or availability
    const hand = ring.preferredHand === 'left' 
      ? trackingPoints.leftHand 
      : (trackingPoints.rightHand || trackingPoints.leftHand);
    
    if (!hand) return;
    
    // Get finger anchor point (usually ring finger)
    const fingerIndex = ring.fingerIndex || 3; // Default to ring finger
    const fingerPoint = this.getFingerRingPosition(hand, fingerIndex);
    
    if (!fingerPoint) return;
    
    // Apply smoothing for stable rendering
    this.smoothedPositions.ring = this.smoothPosition(
      this.smoothedPositions.ring,
      fingerPoint,
      this.smoothingFactor
    );
    
    const fingerPos = this.smoothedPositions.ring;
    
    // Calculate scale based on finger width
    const fingerWidth = this.estimateFingerWidth(hand, fingerIndex);
    const scale = fingerWidth * (ring.sizeAdjustment || 1.5);
    
    // Calculate rotation based on finger orientation
    const rotation = this.calculateFingerRotation(hand, fingerIndex);
    
    try {
      // Render ring image
      if (ring.imageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          ring.imageUrl,
          fingerPos.x * videoWidth,
          fingerPos.y * videoHeight,
          scale * videoWidth,
          rotation
        );
      }
    } catch (error) {
      console.error('Error rendering ring:', error);
    }
  }
  
  /**
   * Render bracelet based on hand/wrist tracking
   */
  async renderBracelet(canvasContext, bracelet, trackingPoints, videoWidth, videoHeight) {
    // Choose hand based on preference or availability
    const hand = bracelet.preferredHand === 'left' 
      ? trackingPoints.leftHand 
      : (trackingPoints.rightHand || trackingPoints.leftHand);
    
    if (!hand) return;
    
    // Get wrist anchor point
    const wristPoint = this.getWristPosition(hand);
    
    if (!wristPoint) return;
    
    // Apply smoothing for stable rendering
    this.smoothedPositions.bracelet = this.smoothPosition(
      this.smoothedPositions.bracelet,
      wristPoint,
      this.smoothingFactor
    );
    
    const wrist = this.smoothedPositions.bracelet;
    
    // Calculate scale based on wrist width
    const wristWidth = this.estimateWristWidth(hand);
    const scale = wristWidth * (bracelet.sizeAdjustment || 1.2);
    
    // Calculate rotation based on arm orientation
    const rotation = this.calculateArmRotation(hand);
    
    try {
      // Render bracelet image
      if (bracelet.imageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          bracelet.imageUrl,
          wrist.x * videoWidth,
          wrist.y * videoHeight,
          scale * videoWidth,
          rotation
        );
      }
    } catch (error) {
      console.error('Error rendering bracelet:', error);
    }
  }
  
  /**
   * Render watch based on hand/wrist tracking
   */
  async renderWatch(canvasContext, watch, trackingPoints, videoWidth, videoHeight) {
    // Similar to bracelet rendering but may include different positioning or scale
    // Choose hand based on preference or availability
    const hand = watch.preferredHand === 'left' 
      ? trackingPoints.leftHand 
      : (trackingPoints.rightHand || trackingPoints.leftHand);
    
    if (!hand) return;
    
    // Get wrist anchor point for watch (slightly different from bracelet)
    const watchPoint = this.getWatchPosition(hand);
    
    if (!watchPoint) return;
    
    // Apply smoothing for stable rendering
    this.smoothedPositions.watch = this.smoothPosition(
      this.smoothedPositions.watch,
      watchPoint,
      this.smoothingFactor
    );
    
    const wristPos = this.smoothedPositions.watch;
    
    // Calculate scale based on wrist width
    const wristWidth = this.estimateWristWidth(hand);
    const scale = wristWidth * (watch.sizeAdjustment || 1.5);
    
    // Calculate rotation based on arm orientation
    const rotation = this.calculateArmRotation(hand);
    
    try {
      // Render watch image
      if (watch.imageUrl) {
        await this.drawImageAtPoint(
          canvasContext,
          watch.imageUrl,
          wristPos.x * videoWidth,
          wristPos.y * videoHeight,
          scale * videoWidth,
          rotation
        );
      }
    } catch (error) {
      console.error('Error rendering watch:', error);
    }
  }
  
  /**
   * Helper Functions for Positioning
   */
  
  // Get position for left earring
  getLeftEarringPosition(face) {
    try {
      // MediaPipe face mesh landmarks - indices would need to be adjusted 
      // based on your specific face detection model
      const leftEarIndex = 234; // Example index for left ear
      return face.landmarks[leftEarIndex];
    } catch (error) {
      console.error('Error getting left earring position:', error);
      return null;
    }
  }
  
  // Get position for right earring
  getRightEarringPosition(face) {
    try {
      // MediaPipe face mesh landmarks
      const rightEarIndex = 454; // Example index for right ear
      return face.landmarks[rightEarIndex];
    } catch (error) {
      console.error('Error getting right earring position:', error);
      return null;
    }
  }
  
  // Get position for necklace
  getNeckPosition(face) {
    try {
      // Approximate neck position based on chin and shoulders
      const chinIndex = 152; // Example index for chin
      const chin = face.landmarks[chinIndex];
      
      // Estimate neck position below chin
      return {
        x: chin.x,
        y: chin.y + 0.1, // Offset below chin
        z: chin.z
      };
    } catch (error) {
      console.error('Error getting neck position:', error);
      return null;
    }
  }
  
  // Get position for ring on finger
  getFingerRingPosition(hand, fingerIndex) {
    try {
      // MediaPipe hand landmarks
      // fingerIndex: 0=thumb, 1=index, 2=middle, 3=ring, 4=pinky
      const baseJointIndex = fingerIndex * 4 + 1; // Base joint of the finger
      const middleJointIndex = fingerIndex * 4 + 2; // Middle joint of the finger
      
      const baseJoint = hand.landmarks[baseJointIndex];
      const middleJoint = hand.landmarks[middleJointIndex];
      
      // Position the ring between the base and middle joint
      return {
        x: (baseJoint.x * 0.3) + (middleJoint.x * 0.7),
        y: (baseJoint.y * 0.3) + (middleJoint.y * 0.7),
        z: (baseJoint.z * 0.3) + (middleJoint.z * 0.7)
      };
    } catch (error) {
      console.error('Error getting finger ring position:', error);
      return null;
    }
  }
  
  // Get position for bracelet on wrist
  getWristPosition(hand) {
    try {
      // MediaPipe hand landmarks - wrist is typically the first point
      const wristIndex = 0;
      return hand.landmarks[wristIndex];
    } catch (error) {
      console.error('Error getting wrist position:', error);
      return null;
    }
  }
  
  // Get position for watch on wrist (slightly offset from bracelet)
  getWatchPosition(hand) {
    try {
      // MediaPipe hand landmarks
      const wristIndex = 0;
      const palmIndex = 9; // Center of palm
      
      const wrist = hand.landmarks[wristIndex];
      const palm = hand.landmarks[palmIndex];
      
      // Position watch slightly up from wrist towards palm
      return {
        x: wrist.x * 0.8 + palm.x * 0.2,
        y: wrist.y * 0.8 + palm.y * 0.2,
        z: wrist.z * 0.8 + palm.z * 0.2
      };
    } catch (error) {
      console.error('Error getting watch position:', error);
      return null;
    }
  }
  
  /**
   * Helper Functions for Measurements and Calculations
   */
  
  // Calculate distance between two points
  calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    );
  }
  
  // Estimate shoulder width based on face
  estimateShoulderWidth(face) {
    try {
      // Use face width to estimate shoulder width
      const leftCheekIndex = 234; // Example index for left cheek
      const rightCheekIndex = 454; // Example index for right cheek
      
      const faceWidth = this.calculateDistance(
        face.landmarks[leftCheekIndex],
        face.landmarks[rightCheekIndex]
      );
      
      // Shoulder width is typically about 3x face width
      return faceWidth * 3;
    } catch (error) {
      console.error('Error estimating shoulder width:', error);
      return 0.3; // Default fallback value
    }
  }
  
  // Estimate finger width for ring sizing
  estimateFingerWidth(hand, fingerIndex) {
    try {
      // MediaPipe hand landmarks
      const baseJointIndex = fingerIndex * 4 + 1;
      
      // Adjacent finger indices for width estimation
      const adjacentFinger1 = Math.max(0, fingerIndex - 1);
      const adjacentFinger2 = Math.min(4, fingerIndex + 1);
      
      const baseJoint1 = hand.landmarks[adjacentFinger1 * 4 + 1];
      const baseJoint2 = hand.landmarks[adjacentFinger2 * 4 + 1];
      
      // Estimate width based on distance to adjacent fingers
      return this.calculateDistance(baseJoint1, baseJoint2) * 0.4;
    } catch (error) {
      console.error('Error estimating finger width:', error);
      return 0.02; // Default fallback value
    }
  }
  
  // Estimate wrist width for bracelet/watch sizing
  estimateWristWidth(hand) {
    try {
      // MediaPipe hand landmarks
      const wristIndex = 0;
      const thumbBaseIndex = 1;
      const pinkyBaseIndex = 17;
      
      const wrist = hand.landmarks[wristIndex];
      const thumbBase = hand.landmarks[thumbBaseIndex];
      const pinkyBase = hand.landmarks[pinkyBaseIndex];
      
      // Calculate wrist width based on hand width at base
      return this.calculateDistance(thumbBase, pinkyBase) * 1.2;
    } catch (error) {
      console.error('Error estimating wrist width:', error);
      return 0.1; // Default fallback value
    }
  }
  
  // Calculate finger rotation for proper ring alignment
  calculateFingerRotation(hand, fingerIndex) {
    try {
      // MediaPipe hand landmarks
      const baseJointIndex = fingerIndex * 4 + 1;
      const tipJointIndex = fingerIndex * 4 + 4;
      
      const baseJoint = hand.landmarks[baseJointIndex];
      const tipJoint = hand.landmarks[tipJointIndex];
      
      // Calculate angle in radians, then convert to degrees
      const angleRad = Math.atan2(
        tipJoint.y - baseJoint.y,
        tipJoint.x - baseJoint.x
      );
      return angleRad * (180 / Math.PI);
    } catch (error) {
      console.error('Error calculating finger rotation:', error);
      return 0; // Default fallback value
    }
  }
  
  // Calculate arm rotation for bracelet/watch alignment
  calculateArmRotation(hand) {
    try {
      // MediaPipe hand landmarks
      const wristIndex = 0;
      const middleFingerBaseIndex = 9;
      
      const wrist = hand.landmarks[wristIndex];
      const middleBase = hand.landmarks[middleFingerBaseIndex];
      
      // Calculate angle in radians, then convert to degrees
      const angleRad = Math.atan2(
        middleBase.y - wrist.y,
        middleBase.x - wrist.x
      );
      return angleRad * (180 / Math.PI);
    } catch (error) {
      console.error('Error calculating arm rotation:', error);
      return 0; // Default fallback value
    }
  }
  
  /**
   * Drawing and Rendering Utilities
   */
  
  // Draw image at specified point with scaling and rotation
  async drawImageAtPoint(canvasContext, imageUrl, x, y, size, rotation = 0) {
    // Create image element if it doesn't exist in cache
    if (!this.textures[imageUrl]) {
      await this.loadTexture(imageUrl);
    }
    
    const img = this.textures[imageUrl];
    
    if (!img) {
      throw new Error(`Failed to load image: ${imageUrl}`);
    }
    
    // Save current drawing state
    canvasContext.save();
    
    // Translate to the target position
    canvasContext.translate(x, y);
    
    // Rotate if specified
    if (rotation !== 0) {
      canvasContext.rotate(rotation * Math.PI / 180);
    }
    
    // Draw the image centered at the point
    canvasContext.drawImage(
      img,
      -size / 2,
      -size / 2,
      size,
      size
    );
    
    // Restore original drawing state
    canvasContext.restore();
  }
  
  // Apply position smoothing to reduce jitter
  smoothPosition(previousPosition, newPosition, smoothFactor) {
    if (!previousPosition) return newPosition;
    
    return {
      x: previousPosition.x * smoothFactor + newPosition.x * (1 - smoothFactor),
      y: previousPosition.y * smoothFactor + newPosition.y * (1 - smoothFactor),
      z: previousPosition.z * smoothFactor + newPosition.z * (1 - smoothFactor)
    };
  }
  
  // Clear all cached positions (use when switching jewelry items)
  clearCache() {
    this.smoothedPositions = {
      earrings: { left: null, right: null },
      necklace: null,
      ring: null,
      bracelet: null,
      watch: null
    };
    
    this.lastRenderedType = null;
  }
}