import { HOOPS, CONTROLS, SCORING } from '../utils/Constants.js';
import { getNearestHoop } from '../utils/Constants.js';
import { PhysicsUtils, Vector3Utils } from '../utils/MathUtils.js';

export class GameStateManager {
  constructor() {
    // System references
    this.basketball = null;
    this.physicsEngine = null;
    this.scoreManager = null;
    this.uiManager = null;
    this.basketRenderer = null;

    // Game states
    this.gameStates = {
      READY: 'ready',
      MOVING: 'moving',
      SHOOTING: 'shooting',
      BOUNCING: 'bouncing',
      SCORING: 'scoring',
      RESETTING: 'resetting'
    };

    // Current state
    this.currentState = this.gameStates.READY;
    this.previousState = null;
    this.stateChangeTime = 0;

    // Shot tracking
    this.currentShot = {
      isActive: false,
      startTime: 0,
      startPosition: null,
      targetHoop: null,
      power: 0,
      trajectory: null
    };

    // State timers
    this.stateTimer = 0;
    this.shotTimer = 0;

    // Game flow flags
    this.movementAllowed = true;
    this.shootingAllowed = true;
    this.resetAllowed = true;

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('GameStateManager already initialized');
      return;
    }

    // Store system references
    this.basketball = systems.basketball;
    this.physicsEngine = systems.physicsEngine;
    this.scoreManager = systems.scoreManager;
    this.uiManager = systems.uiManager;
    this.basketRenderer = systems.basketRenderer;

    if (!this.validateSystems()) {
      console.error('GameStateManager initialization failed: missing required systems');
      return;
    }

    this.setState(this.gameStates.READY);
    this.isInitialized = true;
  }

  validateSystems() {
    const requiredSystems = ['basketball', 'physicsEngine', 'scoreManager', 'uiManager', 'basketRenderer'];
    
    for (const systemName of requiredSystems) {
      if (!this[systemName]) {
        console.error(`Missing required system: ${systemName}`);
        return false;
      }
    }
    
    return true;
  }

  update(deltaTime) {
    if (!this.isInitialized) return;

    this.stateTimer += deltaTime;

    switch (this.currentState) {
      case this.gameStates.READY:
        this.updateReadyState(deltaTime);
        break;
        
      case this.gameStates.MOVING:
        this.updateMovingState(deltaTime);
        break;
        
      case this.gameStates.SHOOTING:
        this.updateShootingState(deltaTime);
        break;
        
      case this.gameStates.BOUNCING:
        this.updateBouncingState(deltaTime);
        break;
        
      case this.gameStates.SCORING:
        this.updateScoringState(deltaTime);
        break;
        
      case this.gameStates.RESETTING:
        this.updateResettingState(deltaTime);
        break;
    }

    if (this.currentShot.isActive) {
      this.shotTimer += deltaTime;
    }
  }

  updateReadyState(deltaTime) {
    if (!this.basketball) return;

    if (this.basketball.isMovingSignificantly()) {
      this.setState(this.gameStates.MOVING);
    }
  }

  updateMovingState(deltaTime) {
    if (!this.basketball) return;

    if (!this.basketball.isMovingSignificantly() && this.basketball.isBasketballOnGround()) {
      this.setState(this.gameStates.READY);
    }
  }

  updateShootingState(deltaTime) {
    if (!this.basketball || !this.currentShot.isActive) return;

    if (this.basketball.isBasketballInFlight()) {
      return;
    }

    if (this.basketball.isBasketballOnGround()) {
      this.setState(this.gameStates.BOUNCING);
    }
  }

  updateBouncingState(deltaTime) {
    if (!this.basketball) return;

    if (!this.basketball.isMovingSignificantly() && this.basketball.isBasketballOnGround()) {
      this.completeShotAttempt(false);
      this.setState(this.gameStates.READY);
    }
  }

  updateScoringState(deltaTime) {
    // Wait for score display
    if (this.stateTimer >= 2.0) {
      this.setState(this.gameStates.READY);
    }
  }

  updateResettingState(deltaTime) {
    if (!this.basketball) return;

    if (this.stateTimer >= 0.5) {
      this.setState(this.gameStates.READY);
    }
  }

  setState(newState) {
    if (newState === this.currentState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateChangeTime = Date.now();
    this.stateTimer = 0;

    this.onStateEnter(newState);
  }

  onStateEnter(state) {
    switch (state) {
      case this.gameStates.READY:
        this.allowMove = true;
        this.allowShoot = true;
        this.allowReset = true;
        break;
        
      case this.gameStates.MOVING:
        this.allowMove = true;
        this.allowShoot = true;
        this.allowReset = true;
        break;
        
      case this.gameStates.SHOOTING:
        this.allowMove = false;
        this.allowShoot = false;
        this.allowReset = false;
        break;
        
      case this.gameStates.BOUNCING:
        this.allowMove = false;
        this.allowShoot = false;
        this.allowReset = true;
        break;
        
      case this.gameStates.SCORING:
        this.allowMove = false;
        this.allowShoot = false;
        this.allowReset = true;
        break;
        
      case this.gameStates.RESETTING:
        this.allowMove = false;
        this.allowShoot = false;
        this.allowReset = false;
        break;
    }
  }

  initiateShot(power) {
    if (!this.canShoot || !this.basketball || !this.physicsEngine) {
      console.warn('Cannot initiate shot: conditions not met');
      return false;
    }

    const ballPosition = this.basketball.getPosition();
    const targetHoop = getNearestHoop(ballPosition.x);
    const shotVelocity = this.calculateShotVelocity(ballPosition, targetHoop, power);
    
    if (!shotVelocity) {
      console.warn('Could not calculate shot velocity');
      return false;
    }

    this.currentShot = {
      isActive: true,
      startTime: Date.now(),
      startPosition: Vector3Utils.copy(ballPosition),
      targetHoop: targetHoop,
      power: power,
      trajectory: null
    };

    this.basketball.setVelocity(shotVelocity);

    if (this.scoreManager) {
      this.scoreManager.incrementAttempts();
    }

    this.setState(this.gameStates.SHOOTING);
    this.shotTimer = 0;

    return true;
  }

  calculateShotVelocity(startPos, targetHoop, power) {
    // Convert power percentage to arc height
    const arcHeight = HOOPS.SHOT_ARC_HEIGHT_MIN + 
      (power / 100) * (HOOPS.SHOT_ARC_HEIGHT_MAX - HOOPS.SHOT_ARC_HEIGHT_MIN);

    const targetPos = Vector3Utils.create(targetHoop.x, targetHoop.y + 0.2, targetHoop.z);

    try {
      const velocity = PhysicsUtils.calculateTrajectoryVelocity(startPos, targetPos, arcHeight);
      
      // Apply power scaling
      const powerScale = CONTROLS.POWER_TO_VELOCITY_SCALE * (power / 100);
      const scaledVelocity = Vector3Utils.multiplyScalar(velocity, powerScale);
      
      return scaledVelocity;
    } catch (error) {
      console.error('Error calculating shot velocity:', error);
      return null;
    }
  }

  handleScore() {
    if (!this.currentShot.isActive) return;
    
    this.completeShotAttempt(true);
    
    if (this.scoreManager) {
      this.scoreManager.addScore(SCORING.POINTS_PER_SHOT);
    }
    
    // Update scoreboard displays
    if (this.basketRenderer && this.basketRenderer.updateScoreboardDisplays) {
      this.basketRenderer.updateScoreboardDisplays();
    }
    
    if (this.uiManager) {
      this.uiManager.showFeedback(SCORING.MESSAGES.SHOT_MADE, 'success');
    }
    
    this.setState(this.gameStates.SCORING);
  }

  completeShotAttempt(success) {
    if (!this.currentShot.isActive) return;

    this.currentShot.isActive = false;
    
    if (this.scoreManager) {
      if (success) {
        this.scoreManager.incrementMade();
      }
    }
    
    // Update scoreboard displays
    if (this.basketRenderer && this.basketRenderer.updateScoreboardDisplays) {
      this.basketRenderer.updateScoreboardDisplays();
    }
    
    if (!success && this.uiManager) {
      this.uiManager.showFeedback(SCORING.MESSAGES.MISSED_SHOT, 'failure');
    }
  }

  resetBall() {
    if (!this.canReset) {
      console.warn('Cannot reset ball: not allowed in current state');
      return false;
    }

    if (this.currentShot.isActive) {
      this.completeShotAttempt(false);
    }

    if (this.basketball) {
      this.basketball.reset();
    }

    if (this.uiManager) {
      this.uiManager.showFeedback(SCORING.MESSAGES.RESET_BALL);
    }

    this.setState(this.gameStates.RESETTING);
    return true;
  }

  reset() {
    this.currentShot = {
      isActive: false,
      startTime: 0,
      startPosition: null,
      targetHoop: null,
      power: 0,
      trajectory: null
    };

    this.stateTimer = 0;
    this.shotTimer = 0;

    this.setState(this.gameStates.READY);
  }

  canMove() {
    return this.movementAllowed;
  }

  canShoot() {
    return this.shootingAllowed;
  }

  canReset() {
    return this.resetAllowed;
  }

  getCurrentState() {
    return this.currentState;
  }

  getPreviousState() {
    return this.previousState;
  }

  getTimeInState() {
    return this.stateTimer;
  }

  getCurrentShot() {
    return {
      ...this.currentShot,
      duration: this.currentShot.isActive ? this.shotTimer : 0
    };
  }

  isShotActive() {
    return this.currentShot.isActive;
  }

  getStateInfo() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      timeInState: this.stateTimer,
      canMove: this.movementAllowed,
      canShoot: this.shootingAllowed,
      canReset: this.resetAllowed,
      shotActive: this.currentShot.isActive,
      shotDuration: this.shotTimer,
      stateChangeTime: this.stateChangeTime
    };
  }

  dispose() {
    this.basketball = null;
    this.physicsEngine = null;
    this.scoreManager = null;
    this.uiManager = null;
    this.basketRenderer = null;

    this.currentState = this.gameStates.READY;
    this.previousState = null;
    this.currentShot = {
      isActive: false,
      startTime: 0,
      startPosition: null,
      targetHoop: null,
      power: 0,
      trajectory: null
    };

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && this.validateSystems();
  }
}