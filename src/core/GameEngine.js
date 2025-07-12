import { DEBUG, PHYSICS } from '../utils/Constants.js';

export class GameEngine {
  constructor() {
    // System references
    this.sceneManager = null;
    this.cameraManager = null;
    this.basketball = null;
    this.inputController = null;
    this.physicsEngine = null;
    this.collisionDetector = null;
    this.gameStateManager = null;
    this.scoreManager = null;
    this.uiManager = null;
    this.animationController = null;

    // Game loop state
    this.isRunning = false;
    this.isPaused = false;
    this.animationFrameId = null;
    
    // Time management
    this.lastTime = 0;
    this.deltaTime = 0;
    this.accumulator = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsUpdate = 0;
    
    // Performance monitoring
    this.updateTimes = [];
    this.renderTimes = [];
    this.maxUpdateTime = 0;
    this.maxRenderTime = 0;

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('GameEngine already initialized');
      return;
    }

    // Store system references
    this.sceneManager = systems.sceneManager;
    this.cameraManager = systems.cameraManager;
    this.basketball = systems.basketball;
    this.inputController = systems.inputController;
    this.physicsEngine = systems.physicsEngine;
    this.collisionDetector = systems.collisionDetector;
    this.gameStateManager = systems.gameStateManager;
    this.scoreManager = systems.scoreManager;
    this.uiManager = systems.uiManager;
    this.animationController = systems.animationController;

    if (!this.validateSystems()) {
      console.error('GameEngine initialization failed: missing required systems');
      return;
    }

    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
    this.setupEventListeners();

    this.isInitialized = true;
  }

  validateSystems() {
    const requiredSystems = [
      'sceneManager', 'cameraManager', 'basketball', 'inputController',
      'physicsEngine', 'collisionDetector', 'gameStateManager', 
      'scoreManager', 'uiManager', 'animationController'
    ];

    for (const systemName of requiredSystems) {
      if (!this[systemName]) {
        console.error(`Missing required system: ${systemName}`);
        return false;
      }
    }

    return true;
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    window.addEventListener('error', (event) => {
      console.error('Game error:', event.error);
      this.handleError(event.error);
    });
  }

  start() {
    if (!this.isInitialized) {
      console.error('Cannot start GameEngine: not initialized');
      return;
    }

    if (this.isRunning) {
      console.warn('GameEngine already running');
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause() {
    if (!this.isRunning) return;
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    this.isPaused = false;
    this.lastTime = performance.now(); // Reset time to prevent large delta
  }

  gameLoop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta time to prevent large time steps
    this.deltaTime = Math.min(this.deltaTime, PHYSICS.MAX_TIME_STEP);

    this.updateFPS(currentTime);

    if (!this.isPaused) {
      // Fixed timestep physics with accumulator
      this.accumulator += this.deltaTime;
      
      while (this.accumulator >= PHYSICS.TIME_STEP) {
        this.fixedUpdate(PHYSICS.TIME_STEP);
        this.accumulator -= PHYSICS.TIME_STEP;
      }
      
      this.update(this.deltaTime);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  // Fixed timestep update for physics
  fixedUpdate(fixedDeltaTime) {
    const updateStartTime = performance.now();

    try {
      if (this.inputController) {
        this.inputController.update(fixedDeltaTime);
      }

      if (this.gameStateManager) {
        this.gameStateManager.update(fixedDeltaTime);
      }

      if (this.physicsEngine) {
        this.physicsEngine.update(fixedDeltaTime);
      }

      if (this.basketball) {
        this.basketball.update(fixedDeltaTime);
      }

      if (this.collisionDetector) {
        this.collisionDetector.update(fixedDeltaTime);
      }

      if (this.scoreManager) {
        this.scoreManager.update(fixedDeltaTime);
      }

    } catch (error) {
      console.error('Error in fixed update:', error);
      this.handleError(error);
    }

    const updateTime = performance.now() - updateStartTime;
    this.trackUpdatePerformance(updateTime);
  }

  // Variable timestep update for non-physics systems
  update(deltaTime) {
    try {
      if (this.cameraManager) {
        this.cameraManager.update();
      }

      if (this.animationController) {
        this.animationController.update(deltaTime);
      }

      if (this.uiManager) {
        this.uiManager.update(deltaTime);
      }

    } catch (error) {
      console.error('Error in variable update:', error);
      this.handleError(error);
    }
  }

  render() {
    const renderStartTime = performance.now();

    try {
      if (this.sceneManager && this.cameraManager) {
        const activeCamera = this.cameraManager.getActiveCamera();
        if (activeCamera) {
          this.sceneManager.render(activeCamera);
        }
      }

    } catch (error) {
      console.error('Error in render:', error);
      this.handleError(error);
    }

    const renderTime = performance.now() - renderStartTime;
    this.trackRenderPerformance(renderTime);
  }

  handleResize() {
    try {
      if (this.cameraManager) {
        this.cameraManager.handleResize();
      }

      if (this.sceneManager && this.cameraManager) {
        this.sceneManager.handleResize(this.cameraManager.getActiveCamera());
      }

      if (this.uiManager) {
        this.uiManager.handleResize();
      }

    } catch (error) {
      console.error('Error handling resize:', error);
    }
  }

  // Handle critical errors that require stopping the game
  handleError(error) {
    console.error('Game engine error:', error);
    
    if (error.name === 'WebGLRenderingContext' || 
        error.message.includes('WebGL') ||
        error.message.includes('GPU')) {
      console.error('Critical rendering error, stopping game');
      this.stop();
    }
  }

  updateFPS(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      
      if (DEBUG.SHOW_FPS) {
        console.log(`FPS: ${this.fps}`);
      }
    }
  }

  trackUpdatePerformance(updateTime) {
    this.updateTimes.push(updateTime);
    if (this.updateTimes.length > 60) {
      this.updateTimes.shift();
    }
    
    this.maxUpdateTime = Math.max(this.maxUpdateTime, updateTime);
  }

  trackRenderPerformance(renderTime) {
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
    
    this.maxRenderTime = Math.max(this.maxRenderTime, renderTime);
  }

  getPerformanceStats() {
    const avgUpdateTime = this.updateTimes.length > 0 
      ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length 
      : 0;
      
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length 
      : 0;

    return {
      fps: this.fps,
      deltaTime: this.deltaTime,
      avgUpdateTime: avgUpdateTime.toFixed(2),
      avgRenderTime: avgRenderTime.toFixed(2),
      maxUpdateTime: this.maxUpdateTime.toFixed(2),
      maxRenderTime: this.maxRenderTime.toFixed(2),
      frameCount: this.frameCount,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }

  resetPerformanceCounters() {
    this.updateTimes = [];
    this.renderTimes = [];
    this.maxUpdateTime = 0;
    this.maxRenderTime = 0;
    this.frameCount = 0;
  }

  getEngineState() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      deltaTime: this.deltaTime,
      fps: this.fps,
      systemsConnected: {
        sceneManager: !!this.sceneManager,
        cameraManager: !!this.cameraManager,
        basketball: !!this.basketball,
        inputController: !!this.inputController,
        physicsEngine: !!this.physicsEngine,
        collisionDetector: !!this.collisionDetector,
        gameStateManager: !!this.gameStateManager,
        scoreManager: !!this.scoreManager,
        uiManager: !!this.uiManager,
        animationController: !!this.animationController
      }
    };
  }

  restart() {
    if (this.basketball) this.basketball.reset();
    if (this.scoreManager) this.scoreManager.reset();
    if (this.gameStateManager) this.gameStateManager.reset();
    if (this.physicsEngine) this.physicsEngine.reset();
    
    this.resetPerformanceCounters();
  }

  dispose() {
    this.stop();

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.pause);

    // Clear system references
    this.sceneManager = null;
    this.cameraManager = null;
    this.basketball = null;
    this.inputController = null;
    this.physicsEngine = null;
    this.collisionDetector = null;
    this.gameStateManager = null;
    this.scoreManager = null;
    this.uiManager = null;
    this.animationController = null;

    this.isInitialized = false;
    this.isRunning = false;
    this.isPaused = false;
  }

  isReady() {
    return this.isInitialized && this.validateSystems();
  }
}