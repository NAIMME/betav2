import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Jewelry3DRenderer
 * 
 * A utility class for rendering 3D jewelry models using Three.js.
 * Handles loading, positioning, and rendering jewelry models with realistic materials.
 */
class Jewelry3DRenderer {
  constructor({ container, canvas, quality = 'medium', culturalStyle = 'western' }) {
    this.container = container;
    this.canvas = canvas;
    this.quality = quality;
    this.culturalStyle = culturalStyle;
    
    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.ambientLight = null;
    this.pointLight = null;
    this.directionalLight = null;
    
    // Model positioning
    this.modelPosition = new THREE.Vector3(0, 0, 0);
    this.modelRotation = new THREE.Euler(0, 0, 0);
    this.modelScale = 1.0;
    
    // Material settings
    this.materials = {
      gold: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 1.0,
        roughness: 0.3,
        envMapIntensity: 1.0
      }),
      silver: new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        metalness: 1.0,
        roughness: 0.2,
        envMapIntensity: 1.0
      }),
      diamond: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        transparent: true,
        envMapIntensity: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      }),
      ruby: new THREE.MeshPhysicalMaterial({
        color: 0xe0115f,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.5,
        transparent: true,
        envMapIntensity: 1.5,
      }),
      sapphire: new THREE.MeshPhysicalMaterial({
        color: 0x0f52ba,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.5,
        transparent: true,
        envMapIntensity: 1.5,
      }),
      emerald: new THREE.MeshPhysicalMaterial({
        color: 0x50c878,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.5,
        transparent: true,
        envMapIntensity: 1.5,
      })
    };
    
    // Initialize the renderer
    this.initialize();
  }
  
  /**
   * Initialize the Three.js scene, camera, renderer, and lighting
   */
  initialize() {
    if (!this.container || !this.canvas) {
      console.error('Container or canvas element not provided');
      return;
    }
    
    // Get container dimensions
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: this.quality !== 'low',
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    
    // Add lighting
    this.setupLighting();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Load environment map for PBR materials
    this.loadEnvironmentMap();
    
    // Start render loop
    this.animate();
  }
  
  /**
   * Set up scene lighting appropriate for jewelry rendering
   */
  setupLighting() {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    
    // Point light to create highlights on metallic surfaces
    this.pointLight = new THREE.PointLight(0xffffff, 1.0);
    this.pointLight.position.set(5, 5, 5);
    this.pointLight.castShadow = this.quality !== 'low';
    this.scene.add(this.pointLight);
    
    // Directional light for subtle directional shadows
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.position.set(-5, 5, -5);
    this.directionalLight.castShadow = this.quality !== 'low';
    this.scene.add(this.directionalLight);
    
    // Adjust lighting based on cultural style
    if (this.culturalStyle === 'indian') {
      // Warmer lighting for Indian jewelry
      this.ambientLight.color.setHex(0xffe0c0);
      this.pointLight.color.setHex(0xffd700);
      this.pointLight.intensity = 1.5;
    }
  }
  
  /**
   * Load environment map for PBR rendering
   */
  loadEnvironmentMap() {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Create a simple environment map or load from a file
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xffffff);
    
    // Add some colored objects around to create interesting reflections
    const envSphereGeo = new THREE.SphereGeometry(10, 16, 16);
    const envMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide }),
    ];
    
    envMaterials.forEach((mat, i) => {
      const sphere = new THREE.Mesh(envSphereGeo, mat);
      sphere.position.set(
        Math.sin(i * Math.PI * 2 / 3) * 20,
        0,
        Math.cos(i * Math.PI * 2 / 3) * 20
      );
      envScene.add(sphere);
    });
    
    const envCube = pmremGenerator.fromScene(envScene).texture;
    this.scene.environment = envCube;
    
    pmremGenerator.dispose();
  }
  
  /**
   * Handle window resize events
   */
  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * Animation loop
   */
  animate() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Load a placeholder model instead of the actual 3D model
   */
  loadModel(modelPath) {
    // Create a placeholder object instead of loading a model
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,  // Gold color
      metalness: 1.0,
      roughness: 0.3
    });
    
    this.model = new THREE.Mesh(geometry, material);
    this.scene.add(this.model);
    
    console.log(`Placeholder created for model: ${modelPath}`);
    return Promise.resolve(this.model);
  }
  
  /**
   * Set material properties for the model
   */
  setMaterial({ metal = 'gold', gems = [], color = null }) {
    if (!this.model) return;
    
    // Get base metal material
    const metalMaterial = this.materials[metal] || this.materials.gold;
    
    // Apply color override if provided
    if (color) {
      metalMaterial.color.set(color);
    }
    
    // Apply material directly to the placeholder model
    this.model.material = metalMaterial.clone();
    
    // Enable shadows
    this.model.castShadow = this.quality !== 'low';
    this.model.receiveShadow = this.quality !== 'low';
  }
  
  /**
   * Position jewelry using face landmarks (for earrings, necklaces)
   */
  positionWithFaceLandmarks(landmarks, jewelryType) {
    if (!this.model || !landmarks) return;
    
    if (jewelryType === 'earring') {
      // Find ear landmarks
      const rightEar = landmarks.find(lm => lm.name === 'rightEar');
      const leftEar = landmarks.find(lm => lm.name === 'leftEar');
      
      if (rightEar && leftEar) {
        // Position based on specific ear landmarks
        // Note: This would typically be more complex with multiple anchor points
        this.modelPosition.set(rightEar.x, rightEar.y, rightEar.z);
        this.model.position.copy(this.modelPosition);
        
        // Scale appropriately
        const earSize = this.calculateDistance(rightEar, leftEar) * 0.2;
        this.modelScale = earSize;
        this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
      }
    } else if (jewelryType === 'necklace') {
      // Find neck landmarks
      const neckBase = landmarks.find(lm => lm.name === 'neckBase');
      
      if (neckBase) {
        // Position at base of neck
        this.modelPosition.set(neckBase.x, neckBase.y, neckBase.z);
        this.model.position.copy(this.modelPosition);
        
        // Scale based on neck size
        const shoulderDistance = this.estimateShoulderDistance(landmarks);
        this.modelScale = shoulderDistance * 0.5;
        this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
      }
    }
    
    // Special positioning for Indian jewelry
    if (this.culturalStyle === 'indian' && jewelryType === 'earring') {
      // For maang tikka or other multi-point jewelry, add additional positioning
      const forehead = landmarks.find(lm => lm.name === 'forehead');
      if (forehead) {
        // Create a helper object to position forehead piece
        const foreheadPiece = this.model.getObjectByName('foreheadPiece');
        if (foreheadPiece) {
          foreheadPiece.position.set(forehead.x, forehead.y, forehead.z);
        }
      }
    }
  }
  
  /**
   * Position jewelry using hand pose landmarks (for rings, bracelets, watches)
   */
  positionWithHandPose(handPoses, jewelryType) {
    if (!this.model || !handPoses || handPoses.length === 0) return;
    
    // Use the first detected hand
    const hand = handPoses[0];
    
    if (jewelryType === 'ring') {
      // Find finger landmarks (usually index or ring finger)
      const ringFinger = hand.landmarks.filter(lm => lm.name.includes('ringFinger'));
      
      if (ringFinger && ringFinger.length >= 2) {
        // Position at middle of the finger
        const fingerMiddle = ringFinger[1]; // Second joint
        
        this.modelPosition.set(fingerMiddle.x, fingerMiddle.y, fingerMiddle.z);
        this.model.position.copy(this.modelPosition);
        
        // Scale based on finger width
        const fingerWidth = this.estimateFingerWidth(ringFinger);
        this.modelScale = fingerWidth;
        this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
        
        // Rotate to align with finger orientation
        this.alignWithFingerOrientation(ringFinger);
      }
    } else if (jewelryType === 'bracelet' || jewelryType === 'watch') {
      // Find wrist landmark
      const wrist = hand.landmarks.find(lm => lm.name === 'wrist');
      
      if (wrist) {
        this.modelPosition.set(wrist.x, wrist.y, wrist.z);
        this.model.position.copy(this.modelPosition);
        
        // Scale based on wrist size
        const wristWidth = this.estimateWristWidth(hand.landmarks);
        this.modelScale = wristWidth;
        this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
        
        // Align with arm orientation
        this.alignWithArmOrientation(hand.landmarks);
      }
    }
  }
  
  /**
   * Calculate distance between two landmarks
   */
  calculateDistance(lm1, lm2) {
    return Math.sqrt(
      Math.pow(lm2.x - lm1.x, 2) +
      Math.pow(lm2.y - lm1.y, 2) +
      Math.pow(lm2.z - lm1.z, 2)
    );
  }
  
  /**
   * Estimate shoulder distance from landmarks
   */
  estimateShoulderDistance(landmarks) {
    const leftShoulder = landmarks.find(lm => lm.name === 'leftShoulder');
    const rightShoulder = landmarks.find(lm => lm.name === 'rightShoulder');
    
    if (leftShoulder && rightShoulder) {
      return this.calculateDistance(leftShoulder, rightShoulder);
    }
    
    // Default fallback value
    return 0.4;
  }
  
  /**
   * Estimate finger width from landmarks
   */
  estimateFingerWidth(fingerLandmarks) {
    if (fingerLandmarks.length < 2) return 0.02;
    
    // Calculate average segment length
    let totalLength = 0;
    let segments = 0;
    
    for (let i = 0; i < fingerLandmarks.length - 1; i++) {
      totalLength += this.calculateDistance(fingerLandmarks[i], fingerLandmarks[i + 1]);
      segments++;
    }
    
    // Estimate width as a fraction of finger length
    return segments > 0 ? (totalLength / segments) * 0.3 : 0.02;
  }
  
  /**
   * Estimate wrist width from hand landmarks
   */
  estimateWristWidth(handLandmarks) {
    const wrist = handLandmarks.find(lm => lm.name === 'wrist');
    const pinkyBase = handLandmarks.find(lm => lm.name === 'pinky_mcp');
    const thumbBase = handLandmarks.find(lm => lm.name === 'thumb_cmc');
    
    if (wrist && pinkyBase && thumbBase) {
      return this.calculateDistance(pinkyBase, thumbBase);
    }
    
    // Default fallback value
    return 0.1;
  }
  
  /**
   * Align model with finger orientation
   */
  alignWithFingerOrientation(fingerLandmarks) {
    if (fingerLandmarks.length < 2) return;
    
    // Calculate finger direction vector
    const base = fingerLandmarks[0];
    const tip = fingerLandmarks[fingerLandmarks.length - 1];
    
    const direction = new THREE.Vector3(
      tip.x - base.x,
      tip.y - base.y,
      tip.z - base.z
    ).normalize();
    
    // Create rotation from direction vector
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    
    // Apply rotation
    this.model.quaternion.copy(quaternion);
  }
  
  /**
   * Align model with arm orientation
   */
  alignWithArmOrientation(handLandmarks) {
    const wrist = handLandmarks.find(lm => lm.name === 'wrist');
    const elbow = handLandmarks.find(lm => lm.name === 'elbow');
    
    if (wrist && elbow) {
      // Calculate arm direction vector
      const direction = new THREE.Vector3(
        wrist.x - elbow.x,
        wrist.y - elbow.y,
        wrist.z - elbow.z
      ).normalize();
      
      // Create rotation from direction vector
      const forward = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(forward, direction);
      
      // Apply rotation
      this.model.quaternion.copy(quaternion);
    }
  }
  
  /**
   * Adjust the model's position
   */
  adjustPosition(direction, amount = 0.05) {
    if (!this.model) return;
    
    switch (direction) {
      case 'up':
        this.modelPosition.y += amount;
        break;
      case 'down':
        this.modelPosition.y -= amount;
        break;
      case 'left':
        this.modelPosition.x -= amount;
        break;
      case 'right':
        this.modelPosition.x += amount;
        break;
      case 'forward':
        this.modelPosition.z -= amount;
        break;
      case 'backward':
        this.modelPosition.z += amount;
        break;
    }
    
    this.model.position.copy(this.modelPosition);
  }
  
  /**
   * Adjust the model's size
   */
  adjustSize(scaleFactor) {
    if (!this.model) return;
    
    this.modelScale *= scaleFactor;
    this.model.scale.set(this.modelScale, this.modelScale, this.modelScale);
  }
  
  /**
   * Adjust the model's rotation
   */
  adjustRotation(degrees) {
    if (!this.model) return;
    
    const radians = degrees * (Math.PI / 180);
    this.modelRotation.y += radians;
    this.model.rotation.set(
      this.modelRotation.x,
      this.modelRotation.y,
      this.modelRotation.z
    );
  }
  
  /**
   * Render the current scene
   */
  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Dispose of Three.js objects to prevent memory leaks
   */
  dispose() {
    if (this.controls) {
      this.controls.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
  }
}

export default Jewelry3DRenderer;