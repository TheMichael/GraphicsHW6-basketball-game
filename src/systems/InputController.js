import { CONTROLS } from '../utils/Constants.js';
import { GeneralUtils } from '../utils/MathUtils.js';

export class InputController {
  constructor() {
    this.basketball = null;
    this.cameraManager = null;
    this.gameStateManager = null;
    this.uiManager = null;

    // Input state tracking
    this.keysPressed = new Set();
    this.keysPressedThisFrame = new Set();
    this.keysReleasedThisFrame = new Set();
    
    this.movementState = {
      left: false,
      right: false,
      forward: false,
      backward: false
    };

    this.shotPower = CONTROLS.POWER_DEFAULT;
    this.powerChangeTime = 0;
    this.lastKeyRepeat = {};
    
    this.keyDownHandler = null;
    this.keyUpHandler = null;

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('InputController already initialized');
      return;
    }

    this.basketball = systems.basketball;
    this.cameraManager = systems.cameraManager;
    this.gameStateManager = systems.gameStateManager;
    this.uiManager = systems.uiManager;

    this.setupEventListeners();
    this.isInitialized = true;
  }

  setupEventListeners() {
    this.keyDownHandler = (event) => this.handleKeyDown(event);
    this.keyUpHandler = (event) => this.handleKeyUp(event);

    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
  }

  handleKeyDown(event) {
    const keyCode = event.code;
    
    if (this.isGameKey(keyCode)) {
      event.preventDefault();
    }

    const wasPressed = this.keysPressed.has(keyCode);
    this.keysPressed.add(keyCode);
    
    if (!wasPressed) {
      this.keysPressedThisFrame.add(keyCode);
      this.handleKeyPress(keyCode);
    }

    this.updateMovementState();
  }

  handleKeyUp(event) {
    const keyCode = event.code;
    
    this.keysPressed.delete(keyCode);
    this.keysReleasedThisFrame.add(keyCode);

    this.updateMovementState();
  }

  handleKeyPress(keyCode) {
    switch (keyCode) {
      case CONTROLS.KEYS.SHOOT:
        this.handleShoot();
        break;
        
      case CONTROLS.KEYS.RESET:
        this.handleReset();
        break;
        
      case CONTROLS.KEYS.TOGGLE_ORBIT:
        this.handleToggleOrbit();
        break;
        
      case CONTROLS.KEYS.TOGGLE_HOOP_CAM:
        this.handleToggleHoopCamera();
        break;
    }
  }

  updateMovementState() {
    this.movementState.left = this.keysPressed.has(CONTROLS.KEYS.MOVE_LEFT);
    this.movementState.right = this.keysPressed.has(CONTROLS.KEYS.MOVE_RIGHT);
    this.movementState.forward = this.keysPressed.has(CONTROLS.KEYS.MOVE_FORWARD);
    this.movementState.backward = this.keysPressed.has(CONTROLS.KEYS.MOVE_BACKWARD);
  }

  update(deltaTime) {
    if (!this.isInitialized) return;

    this.handleMovement(deltaTime);
    this.handlePowerAdjustment(deltaTime);
    
    this.keysPressedThisFrame.clear();
    this.keysReleasedThisFrame.clear();
  }

  handleMovement(deltaTime) {
    if (!this.basketball || !this.basketball.isReady()) return;

    // Only allow movement when basketball is on ground and game allows it
    if (!this.basketball.isBasketballOnGround()) return;
    if (this.gameStateManager && !this.gameStateManager.canMove()) return;

    if (this.movementState.left) {
      this.basketball.move('left', deltaTime);
    }
    if (this.movementState.right) {
      this.basketball.move('right', deltaTime);
    }
    if (this.movementState.forward) {
      this.basketball.move('forward', deltaTime);
    }
    if (this.movementState.backward) {
      this.basketball.move('backward', deltaTime);
    }
  }

  handlePowerAdjustment(deltaTime) {
    const currentTime = Date.now();
    
    if (this.keysPressed.has(CONTROLS.KEYS.POWER_UP)) {
      if (!this.lastKeyRepeat[CONTROLS.KEYS.POWER_UP] || 
          currentTime - this.lastKeyRepeat[CONTROLS.KEYS.POWER_UP] > CONTROLS.KEY_REPEAT_DELAY) {
        
        this.adjustPower(CONTROLS.POWER_INCREMENT);
        this.lastKeyRepeat[CONTROLS.KEYS.POWER_UP] = currentTime;
      }
    }
    
    if (this.keysPressed.has(CONTROLS.KEYS.POWER_DOWN)) {
      if (!this.lastKeyRepeat[CONTROLS.KEYS.POWER_DOWN] || 
          currentTime - this.lastKeyRepeat[CONTROLS.KEYS.POWER_DOWN] > CONTROLS.KEY_REPEAT_DELAY) {
        
        this.adjustPower(-CONTROLS.POWER_INCREMENT);
        this.lastKeyRepeat[CONTROLS.KEYS.POWER_DOWN] = currentTime;
      }
    }
  }

  adjustPower(delta) {
    const oldPower = this.shotPower;
    this.shotPower = GeneralUtils.clamp(
      this.shotPower + delta,
      CONTROLS.POWER_MIN,
      CONTROLS.POWER_MAX
    );

    if (this.shotPower !== oldPower) {
      this.powerChangeTime = Date.now();
      
      if (this.uiManager) {
        this.uiManager.updatePowerDisplay(this.shotPower);
      }
    }
  }

  handleShoot() {
    if (!this.basketball || !this.basketball.isReady()) {
      console.warn('Cannot shoot: basketball not ready');
      return;
    }

    if (!this.basketball.isBasketballOnGround()) {
      return;
    }

    if (this.gameStateManager && !this.gameStateManager.canShoot()) {
      return;
    }

    if (this.gameStateManager) {
      this.gameStateManager.initiateShot(this.shotPower);
    }
  }

  handleReset() {
    if (!this.basketball || !this.basketball.isReady()) {
      console.warn('Cannot reset: basketball not ready');
      return;
    }

    this.basketball.reset();
    
    this.shotPower = CONTROLS.POWER_DEFAULT;
    this.powerChangeTime = Date.now();
    
    if (this.uiManager) {
      this.uiManager.updatePowerDisplay(this.shotPower);
      this.uiManager.showFeedback('Ball Reset');
    }

    if (this.gameStateManager) {
      this.gameStateManager.resetBall();
    }
  }

  handleToggleOrbit() {
    if (this.cameraManager && this.cameraManager.isReady()) {
      this.cameraManager.toggleOrbitControls();
    }
  }

  handleToggleHoopCamera() {
    if (this.cameraManager && this.cameraManager.isReady()) {
      this.cameraManager.toggleCamera();
    }
  }

  isGameKey(keyCode) {
    const gameKeys = Object.values(CONTROLS.KEYS);
    return gameKeys.includes(keyCode);
  }

  isMovementKeyPressed() {
    return this.movementState.left || 
           this.movementState.right || 
           this.movementState.forward || 
           this.movementState.backward;
  }

  isKeyPressed(keyCode) {
    return this.keysPressed.has(keyCode);
  }

  wasKeyPressedThisFrame(keyCode) {
    return this.keysPressedThisFrame.has(keyCode);
  }

  wasKeyReleasedThisFrame(keyCode) {
    return this.keysReleasedThisFrame.has(keyCode);
  }

  getShotPower() {
    return this.shotPower;
  }

  setShotPower(power) {
    this.shotPower = GeneralUtils.clamp(power, CONTROLS.POWER_MIN, CONTROLS.POWER_MAX);
    this.powerChangeTime = Date.now();
    
    if (this.uiManager) {
      this.uiManager.updatePowerDisplay(this.shotPower);
    }
  }

  getMovementState() {
    return { ...this.movementState };
  }

  getTimeSincePowerChange() {
    return Date.now() - this.powerChangeTime;
  }

  getInputState() {
    return {
      keysPressed: Array.from(this.keysPressed),
      movementState: this.getMovementState(),
      shotPower: this.shotPower,
      timeSincePowerChange: this.getTimeSincePowerChange(),
      isMoving: this.isMovementKeyPressed(),
      isInitialized: this.isInitialized
    };
  }

  disable() {
    this.keysPressed.clear();
    this.keysPressedThisFrame.clear();
    this.keysReleasedThisFrame.clear();
    this.movementState = {
      left: false,
      right: false,
      forward: false,
      backward: false
    };
  }

  enable() {
    // Input enabled
  }

  reset() {
    this.disable();
    this.shotPower = CONTROLS.POWER_DEFAULT;
    this.powerChangeTime = Date.now();
    this.lastKeyRepeat = {};
    
    if (this.uiManager) {
      this.uiManager.updatePowerDisplay(this.shotPower);
    }
  }

  dispose() {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
    }

    this.basketball = null;
    this.cameraManager = null;
    this.gameStateManager = null;
    this.uiManager = null;

    this.keysPressed.clear();
    this.keysPressedThisFrame.clear();
    this.keysReleasedThisFrame.clear();
    this.lastKeyRepeat = {};

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized;
  }
}