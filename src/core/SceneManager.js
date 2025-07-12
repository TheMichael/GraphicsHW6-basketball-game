import { UI } from '../utils/Constants.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.renderer = null;
    this.lights = {
      ambient: null,
      directional1: null,
      directional2: null,
      directional3: null
    };
    
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('SceneManager already initialized');
      return;
    }

    this.createScene();
    this.createRenderer();
    this.setupLighting();
    this.configureShadows();
    
    this.isInitialized = true;
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
  }

  createRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Enable shadows
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x444444, 1.0);
      
      document.body.appendChild(this.renderer.domElement);
      
    } catch (error) {
      console.error('Failed to create WebGL renderer:', error);
      throw error;
    }
  }

  setupLighting() {
    // Ambient light for base illumination
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.lights.ambient);

    // Primary directional light
    this.lights.directional1 = new THREE.DirectionalLight(0xffffff, 0.4);
    this.lights.directional1.position.set(10, 20, 15);
    this.lights.directional1.castShadow = true;
    this.scene.add(this.lights.directional1);

    // Secondary directional light - fill lighting
    this.lights.directional2 = new THREE.DirectionalLight(0xffffff, 0.3);
    this.lights.directional2.position.set(-10, 20, -15);
    this.lights.directional2.castShadow = true;
    this.scene.add(this.lights.directional2);

    // Overhead directional light
    this.lights.directional3 = new THREE.DirectionalLight(0xffffff, 0.3);
    this.lights.directional3.position.set(0, 25, 0);
    this.lights.directional3.castShadow = true;
    this.scene.add(this.lights.directional3);
  }

  configureShadows() {
    const shadowConfig = {
      top: 15,
      bottom: -20,
      left: -20,
      right: 20,
      far: 50,
      mapSize: 2048,
      bias: -0.0001
    };

    Object.values(this.lights).forEach(light => {
      if (light && light.shadow) {
        light.shadow.camera.top = shadowConfig.top;
        light.shadow.camera.bottom = shadowConfig.bottom;
        light.shadow.camera.left = shadowConfig.left;
        light.shadow.camera.right = shadowConfig.right;
        light.shadow.camera.far = shadowConfig.far;
        
        light.shadow.mapSize.width = shadowConfig.mapSize;
        light.shadow.mapSize.height = shadowConfig.mapSize;
        light.shadow.bias = shadowConfig.bias;
        
        light.shadow.camera.updateProjectionMatrix();
      }
    });
  }

  addToScene(object) {
    if (!this.scene) {
      console.error('Scene not initialized. Call initialize() first.');
      return;
    }
    
    this.scene.add(object);
  }

  removeFromScene(object) {
    if (!this.scene) {
      console.error('Scene not initialized.');
      return;
    }
    
    this.scene.remove(object);
  }

  handleResize(camera) {
    if (!this.renderer || !camera) {
      console.error('Renderer or camera not available for resize');
      return;
    }

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(camera) {
    if (!this.renderer || !this.scene || !camera) {
      console.error('Cannot render: missing renderer, scene, or camera');
      return;
    }
    
    try {
      this.renderer.render(this.scene, camera);
    } catch (error) {
      console.error('Render error:', error);
    }
  }

  // Dynamic lighting control
  updateLightingIntensity(intensity = 1.0) {
    if (this.lights.ambient) {
      this.lights.ambient.intensity = 0.5 * intensity;
    }
    
    if (this.lights.directional1) {
      this.lights.directional1.intensity = 0.4 * intensity;
    }
    
    if (this.lights.directional2) {
      this.lights.directional2.intensity = 0.3 * intensity;
    }
    
    if (this.lights.directional3) {
      this.lights.directional3.intensity = 0.3 * intensity;
    }
  }

  toggleShadows(enabled = true) {
    this.renderer.shadowMap.enabled = enabled;
    
    Object.values(this.lights).forEach(light => {
      if (light && light.castShadow !== undefined) {
        light.castShadow = enabled;
      }
    });
  }

  getBackgroundColor() {
    return this.scene ? this.scene.background : null;
  }

  setBackgroundColor(color) {
    if (!this.scene) {
      console.error('Scene not initialized');
      return;
    }
    
    this.scene.background = new THREE.Color(color);
  }

  // Atmospheric effects
  setFog(color = 0x000000, near = 50, far = 100) {
    if (!this.scene) {
      console.error('Scene not initialized');
      return;
    }
    
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  removeFog() {
    if (this.scene) {
      this.scene.fog = null;
    }
  }

  getRenderInfo() {
    if (!this.renderer) return null;
    
    return {
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      calls: this.renderer.info.render.calls,
      frame: this.renderer.info.render.frame
    };
  }

  dispose() {
    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.scene) {
      // Dispose all objects in scene
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      this.scene.clear();
      this.scene = null;
    }

    Object.keys(this.lights).forEach(key => {
      this.lights[key] = null;
    });

    this.isInitialized = false;
  }

  // Getters
  getScene() {
    return this.scene;
  }

  getRenderer() {
    return this.renderer;
  }

  getLights() {
    return this.lights;
  }

  isReady() {
    return this.isInitialized && 
           this.scene !== null && 
           this.renderer !== null;
  }
}