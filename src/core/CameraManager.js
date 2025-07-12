import { OrbitControls } from '../OrbitControls.js';
import { CONTROLS } from '../utils/Constants.js';

export class CameraManager {
  constructor(renderer) {
    this.renderer = renderer;
    
    this.mainCamera = null;
    this.hoopCamera = null;
    this.activeCamera = null;
    
    this.mainControls = null;
    this.hoopControls = null;
    
    this.useHoopCamera = false;
    this.isOrbitEnabled = true;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('CameraManager already initialized');
      return;
    }

    if (!this.renderer) {
      console.error('Renderer required for CameraManager initialization');
      return;
    }

    this.createCameras();
    this.setupControls();
    
    this.activeCamera = this.mainCamera;
    this.useHoopCamera = false;
    this.updateControlsState();
    
    this.isInitialized = true;
  }

  createCameras() {
    // Main perspective camera
    this.mainCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Hoop camera for close-up shots
    this.hoopCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.setMainCameraPosition();
    this.setHoopCameraPosition();
  }

  setMainCameraPosition() {
    if (!this.mainCamera) return;

    this.mainCamera.position.set(0, 10, 20);
    this.mainCamera.lookAt(0, 0, 0);
    this.mainCamera.updateMatrixWorld();
  }

  setHoopCameraPosition() {
    if (!this.hoopCamera) return;

    const hoopBaseX = 16.1;
    const direction = 1; // Right side
    
    // Position behind right basket
    this.hoopCamera.position.set(
      hoopBaseX + (-5.0 * direction),
      6.0,
      0
    );
    
    // Look at rim
    const rimX = hoopBaseX + (-3.1 * direction);
    const rimY = 4.3;
    const rimZ = 0;
    
    this.hoopCamera.lookAt(rimX, rimY, rimZ);
  }

  setupControls() {
    if (!this.renderer || !this.mainCamera || !this.hoopCamera) {
      console.error('Missing required objects for controls setup');
      return;
    }

    this.mainControls = new OrbitControls(this.mainCamera, this.renderer.domElement);
    this.mainControls.enabled = this.isOrbitEnabled;
    this.mainControls.enableDamping = true;
    this.mainControls.dampingFactor = 0.05;
    
    this.hoopControls = new OrbitControls(this.hoopCamera, this.renderer.domElement);
    this.hoopControls.enabled = false;
    this.hoopControls.enableDamping = true;
    this.hoopControls.dampingFactor = 0.05;
    
    // Target right rim
    this.hoopControls.target.set(16.1 + (-3.1 * 1), 4.3, 0);
  }

  setActiveCamera(cameraType) {
    if (!this.isInitialized) {
      console.error('CameraManager not initialized');
      return;
    }

    if (!this.mainCamera || !this.hoopCamera) {
      console.error('Cameras not created');
      return;
    }

    switch (cameraType) {
      case 'main':
        this.activeCamera = this.mainCamera;
        this.useHoopCamera = false;
        this.updateControlsState();
        break;
        
      case 'hoop':
        this.activeCamera = this.hoopCamera;
        this.useHoopCamera = true;
        this.updateControlsState();
        break;
        
      default:
        console.warn(`Unknown camera type: ${cameraType}`);
    }
  }

  toggleCamera() {
    if (this.useHoopCamera) {
      this.setActiveCamera('main');
    } else {
      this.setActiveCamera('hoop');
    }
  }

  toggleOrbitControls() {
    this.isOrbitEnabled = !this.isOrbitEnabled;
    this.updateControlsState();
  }

  updateControlsState() {
    if (!this.mainControls || !this.hoopControls) return;

    if (this.useHoopCamera) {
      this.hoopControls.enabled = this.isOrbitEnabled;
      this.mainControls.enabled = false;
    } else {
      this.mainControls.enabled = this.isOrbitEnabled;
      this.hoopControls.enabled = false;
    }
  }

  handleKeyInput(event) {
    if (!this.isInitialized) return;

    switch (event.code) {
      case CONTROLS.KEYS.TOGGLE_ORBIT:
        this.toggleOrbitControls();
        break;
        
      case CONTROLS.KEYS.TOGGLE_HOOP_CAM:
        this.toggleCamera();
        break;
    }
  }

  update() {
    if (!this.isInitialized) return;

    if (this.useHoopCamera && this.hoopControls) {
      this.hoopControls.update();
    } else if (this.mainControls) {
      this.mainControls.update();
    }
  }

  handleResize() {
    if (!this.mainCamera || !this.hoopCamera) return;

    const aspect = window.innerWidth / window.innerHeight;
    
    this.mainCamera.aspect = aspect;
    this.mainCamera.updateProjectionMatrix();
    
    this.hoopCamera.aspect = aspect;
    this.hoopCamera.updateProjectionMatrix();
  }

  // Dynamic camera positioning for basketball following
  followBasketball(basketballPosition, offset = { x: 0, y: 5, z: 10 }) {
    if (!this.activeCamera) return;

    const targetPosition = {
      x: basketballPosition.x + offset.x,
      y: basketballPosition.y + offset.y,
      z: basketballPosition.z + offset.z
    };

    this.activeCamera.position.lerp(
      new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
      0.1
    );

    this.activeCamera.lookAt(
      basketballPosition.x,
      basketballPosition.y,
      basketballPosition.z
    );
  }

  // Position camera for optimal shooting angle
  setShootingView(basketballPosition, targetHoopPosition) {
    if (!this.activeCamera) return;

    const direction = {
      x: targetHoopPosition.x - basketballPosition.x,
      y: 0,
      z: targetHoopPosition.z - basketballPosition.z
    };

    const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    if (length === 0) return;

    direction.x /= length;
    direction.z /= length;

    const cameraPosition = {
      x: basketballPosition.x - direction.x * 8,
      y: basketballPosition.y + 3,
      z: basketballPosition.z - direction.z * 8
    };

    this.activeCamera.position.set(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z
    );

    this.activeCamera.lookAt(
      targetHoopPosition.x,
      targetHoopPosition.y,
      targetHoopPosition.z
    );
  }

  resetMainCamera() {
    if (!this.mainCamera) return;

    this.mainCamera.position.set(0, 0, 0);
    this.mainCamera.rotation.set(0, 0, 0);
    
    this.setMainCameraPosition();
    
    if (this.mainControls) {
      this.mainControls.reset();
    }
  }

  getCameraInfo() {
    if (!this.activeCamera) return null;

    return {
      type: this.useHoopCamera ? 'hoop' : 'main',
      position: {
        x: this.activeCamera.position.x,
        y: this.activeCamera.position.y,
        z: this.activeCamera.position.z
      },
      rotation: {
        x: this.activeCamera.rotation.x,
        y: this.activeCamera.rotation.y,
        z: this.activeCamera.rotation.z
      },
      fov: this.activeCamera.fov,
      orbitEnabled: this.isOrbitEnabled
    };
  }

  dispose() {
    if (this.mainControls) {
      this.mainControls.dispose();
      this.mainControls = null;
    }
    
    if (this.hoopControls) {
      this.hoopControls.dispose();
      this.hoopControls = null;
    }

    this.mainCamera = null;
    this.hoopCamera = null;
    this.activeCamera = null;
    this.renderer = null;

    this.isInitialized = false;
  }

  // Getters
  getActiveCamera() {
    return this.activeCamera;
  }

  getMainCamera() {
    return this.mainCamera;
  }

  getHoopCamera() {
    return this.hoopCamera;
  }

  isUsingHoopCamera() {
    return this.useHoopCamera;
  }

  isOrbitControlsEnabled() {
    return this.isOrbitEnabled;
  }

  isReady() {
    return this.isInitialized && 
           this.mainCamera !== null && 
           this.hoopCamera !== null && 
           this.activeCamera !== null;
  }
}