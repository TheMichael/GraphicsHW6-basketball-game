import { ANIMATION, BASKETBALL } from '../utils/Constants.js';
import { Vector3Utils, AnimationUtils } from '../utils/MathUtils.js';

export class AnimationController {
  constructor() {
    this.basketball = null;
    this.sceneManager = null;
    this.uiManager = null;

    // Ball rotation animation state
    this.ballRotation = {
      current: Vector3Utils.create(0, 0, 0),
      velocity: Vector3Utils.create(0, 0, 0),
      lastPosition: Vector3Utils.create(0, 0, 0),
      lastVelocity: Vector3Utils.create(0, 0, 0),
      accumulatedRotation: Vector3Utils.create(0, 0, 0)
    };

    // Visual effects state
    this.effects = {
      ballTrail: [],
      maxTrailLength: 20,
      trailFade: 0.95,
      bounceEffect: {
        isActive: false,
        intensity: 0,
        duration: 0,
        startTime: 0
      },
      shootEffect: {
        isActive: false,
        intensity: 0,
        duration: 0,
        startTime: 0
      }
    };

    this.animationState = {
      time: 0,
      deltaTime: 0,
      frameCount: 0,
      animationsEnabled: true
    };

    // Smooth transitions
    this.transitions = {
      ballPosition: {
        current: Vector3Utils.create(0, 0, 0),
        target: Vector3Utils.create(0, 0, 0),
        smoothing: ANIMATION.POSITION_LERP_FACTOR
      },
      ballRotation: {
        current: Vector3Utils.create(0, 0, 0),
        target: Vector3Utils.create(0, 0, 0),
        smoothing: ANIMATION.ROTATION_LERP_FACTOR
      }
    };

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('AnimationController already initialized');
      return;
    }

    this.basketball = systems.basketball;
    this.sceneManager = systems.sceneManager;
    this.uiManager = systems.uiManager;

    if (!this.validateSystems()) {
      console.error('AnimationController initialization failed: missing required systems');
      return;
    }

    this.initializeAnimationState();
    this.isInitialized = true;
  }

  validateSystems() {
    if (!this.basketball) {
      console.error('Missing required system: basketball');
      return false;
    }
    
    return true;
  }

  initializeAnimationState() {
    if (this.basketball && this.basketball.isReady()) {
      const ballPosition = this.basketball.getPosition();
      
      this.ballRotation.lastPosition = Vector3Utils.copy(ballPosition);
      this.transitions.ballPosition.current = Vector3Utils.copy(ballPosition);
      this.transitions.ballPosition.target = Vector3Utils.copy(ballPosition);
    }

    this.animationState.time = 0;
    this.animationState.frameCount = 0;
  }

  update(deltaTime) {
    if (!this.isInitialized || !this.animationState.animationsEnabled) {
      return;
    }

    this.animationState.deltaTime = deltaTime;
    this.animationState.time += deltaTime;
    this.animationState.frameCount++;

    this.updateBallAnimations(deltaTime);
    this.updateVisualEffects(deltaTime);
    this.updateTransitions(deltaTime);
    this.updateUIAnimations(deltaTime);
  }

  updateBallAnimations(deltaTime) {
    if (!this.basketball || !this.basketball.isReady()) return;

    const ballPosition = this.basketball.getPosition();
    const ballVelocity = this.basketball.getVelocity();

    this.updateBallRotation(ballPosition, ballVelocity, deltaTime);
    this.updateBallTrail(ballPosition, deltaTime);

    this.ballRotation.lastPosition = Vector3Utils.copy(ballPosition);
    this.ballRotation.lastVelocity = Vector3Utils.copy(ballVelocity);
  }

  updateBallRotation(ballPosition, ballVelocity, deltaTime) {
    const positionDelta = Vector3Utils.subtract(ballPosition, this.ballRotation.lastPosition);
    const movementSpeed = Vector3Utils.magnitude(positionDelta) / deltaTime;

    if (movementSpeed > BASKETBALL.MIN_VELOCITY) {
      const rotationAxis = this.calculateRotationAxis(positionDelta, ballVelocity);
      const rotationAmount = movementSpeed * BASKETBALL.ROTATION_SPEED_MULTIPLIER * deltaTime;
      
      const rotationDelta = Vector3Utils.multiplyScalar(rotationAxis, rotationAmount);
      this.ballRotation.velocity = Vector3Utils.add(this.ballRotation.velocity, rotationDelta);
    }

    // Apply angular damping
    this.ballRotation.velocity = Vector3Utils.multiplyScalar(
      this.ballRotation.velocity, 
      Math.pow(ANIMATION.ROTATION_DAMPING, deltaTime * 60)
    );

    // Stop very small rotations
    if (Vector3Utils.magnitude(this.ballRotation.velocity) < ANIMATION.MIN_ROTATION_SPEED) {
      this.ballRotation.velocity = Vector3Utils.create(0, 0, 0);
    }

    const rotationDelta = Vector3Utils.multiplyScalar(this.ballRotation.velocity, deltaTime);
    this.ballRotation.accumulatedRotation = Vector3Utils.add(
      this.ballRotation.accumulatedRotation, 
      rotationDelta
    );

    this.applyBallRotation();
  }

  // Realistic ball rolling - rotation axis perpendicular to movement
  calculateRotationAxis(positionDelta, velocity) {
    const movementDirection = Vector3Utils.normalize(positionDelta);
    
    const rotationAxis = Vector3Utils.create(
      -movementDirection.z,
      0,
      movementDirection.x
    );

    return Vector3Utils.normalize(rotationAxis);
  }

  applyBallRotation() {
    if (!this.basketball || !this.basketball.getMesh()) return;

    const basketballMesh = this.basketball.getMesh();
    const rotation = this.ballRotation.accumulatedRotation;

    basketballMesh.rotation.x = rotation.x;
    basketballMesh.rotation.y = rotation.y;
    basketballMesh.rotation.z = rotation.z;
  }

  updateBallTrail(ballPosition, deltaTime) {
    this.effects.ballTrail.push({
      position: Vector3Utils.copy(ballPosition),
      timestamp: this.animationState.time,
      alpha: 1.0
    });

    const trailAgeLimit = 1.0;
    this.effects.ballTrail = this.effects.ballTrail.filter(point => 
      this.animationState.time - point.timestamp < trailAgeLimit
    );

    if (this.effects.ballTrail.length > this.effects.maxTrailLength) {
      this.effects.ballTrail.shift();
    }

    this.effects.ballTrail.forEach(point => {
      const age = this.animationState.time - point.timestamp;
      point.alpha = Math.max(0, 1 - (age / trailAgeLimit));
    });
  }

  updateVisualEffects(deltaTime) {
    this.updateBounceEffect(deltaTime);
    this.updateShootEffect(deltaTime);
  }

  updateBounceEffect(deltaTime) {
    if (!this.effects.bounceEffect.isActive) return;

    const elapsed = this.animationState.time - this.effects.bounceEffect.startTime;
    
    if (elapsed >= this.effects.bounceEffect.duration) {
      this.effects.bounceEffect.isActive = false;
      this.effects.bounceEffect.intensity = 0;
    } else {
      const progress = elapsed / this.effects.bounceEffect.duration;
      this.effects.bounceEffect.intensity = (1 - progress) * 0.5;
      
      this.applyBounceEffect();
    }
  }

  updateShootEffect(deltaTime) {
    if (!this.effects.shootEffect.isActive) return;

    const elapsed = this.animationState.time - this.effects.shootEffect.startTime;
    
    if (elapsed >= this.effects.shootEffect.duration) {
      this.effects.shootEffect.isActive = false;
      this.effects.shootEffect.intensity = 0;
    } else {
      const progress = elapsed / this.effects.shootEffect.duration;
      this.effects.shootEffect.intensity = AnimationUtils.easeInOut(1 - progress) * 0.3;
      
      this.applyShootEffect();
    }
  }

  // Subtle ball scale effect on bounce
  applyBounceEffect() {
    if (this.basketball && this.basketball.getMesh()) {
      const intensity = this.effects.bounceEffect.intensity;
      const scale = 1 + intensity * 0.1;
      
      // More pronounced squash for bounces
      const squashFactor = this.basketball.getBounceCount() > 0 ? 0.8 : 0.9;
      this.basketball.getMesh().scale.set(scale, scale * squashFactor, scale);
    }
  }

  // Subtle glow effect when shooting
  applyShootEffect() {
    if (this.basketball && this.basketball.getMesh()) {
      const intensity = this.effects.shootEffect.intensity;
      
      const material = this.basketball.getMesh().material;
      if (material && material.emissive) {
        const glowIntensity = intensity * 0.5;
        material.emissive.setRGB(glowIntensity, glowIntensity * 0.5, 0);
      }
    }
  }

  updateTransitions(deltaTime) {
    if (!this.basketball || !this.basketball.isReady()) return;

    const currentBallPosition = this.basketball.getPosition();
    
    this.transitions.ballPosition.target = Vector3Utils.copy(currentBallPosition);
    
    this.transitions.ballPosition.current = Vector3Utils.lerp(
      this.transitions.ballPosition.current,
      this.transitions.ballPosition.target,
      this.transitions.ballPosition.smoothing
    );
  }

  updateUIAnimations(deltaTime) {
    // Coordinate with UI manager for animated elements
    if (this.uiManager && this.uiManager.update) {
      // UI manager handles its own animations
    }
  }

  triggerBounceEffect(intensity = 1.0, duration = 0.3) {
    this.effects.bounceEffect = {
      isActive: true,
      intensity: intensity,
      duration: duration,
      startTime: this.animationState.time
    };
  }

  triggerShootEffect(intensity = 1.0, duration = 0.5) {
    this.effects.shootEffect = {
      isActive: true,
      intensity: intensity,
      duration: duration,
      startTime: this.animationState.time
    };
  }

  resetBallRotation() {
    this.ballRotation.accumulatedRotation = Vector3Utils.create(0, 0, 0);
    this.ballRotation.velocity = Vector3Utils.create(0, 0, 0);
    
    if (this.basketball && this.basketball.getMesh()) {
      this.basketball.getMesh().rotation.set(0, 0, 0);
      this.basketball.getMesh().scale.set(1, 1, 1);
    }
  }

  setAnimationsEnabled(enabled) {
    this.animationState.animationsEnabled = enabled;
    
    if (!enabled) {
      this.effects.bounceEffect.isActive = false;
      this.effects.shootEffect.isActive = false;
    }
  }

  getAnimationState() {
    return {
      time: this.animationState.time,
      frameCount: this.animationState.frameCount,
      animationsEnabled: this.animationState.animationsEnabled,
      ballRotation: Vector3Utils.copy(this.ballRotation.accumulatedRotation),
      rotationVelocity: Vector3Utils.copy(this.ballRotation.velocity),
      bounceEffectActive: this.effects.bounceEffect.isActive,
      shootEffectActive: this.effects.shootEffect.isActive,
      trailLength: this.effects.ballTrail.length
    };
  }

  getBallTrail() {
    return [...this.effects.ballTrail];
  }

  reset() {
    this.resetBallRotation();
    
    this.effects.bounceEffect.isActive = false;
    this.effects.shootEffect.isActive = false;
    this.effects.ballTrail = [];
    
    this.animationState.time = 0;
    this.animationState.frameCount = 0;
    
    if (this.basketball && this.basketball.isReady()) {
      const ballPosition = this.basketball.getPosition();
      this.transitions.ballPosition.current = Vector3Utils.copy(ballPosition);
      this.transitions.ballPosition.target = Vector3Utils.copy(ballPosition);
    }
  }

  setBallRotation(rotation) {
    this.ballRotation.accumulatedRotation = Vector3Utils.copy(rotation);
    this.applyBallRotation();
  }

  addRotationVelocity(rotationVelocity) {
    this.ballRotation.velocity = Vector3Utils.add(
      this.ballRotation.velocity, 
      rotationVelocity
    );
  }

  getPerformanceStats() {
    return {
      frameCount: this.animationState.frameCount,
      averageFrameTime: this.animationState.frameCount > 0 
        ? this.animationState.time / this.animationState.frameCount 
        : 0,
      trailPointCount: this.effects.ballTrail.length,
      activeEffects: {
        bounce: this.effects.bounceEffect.isActive,
        shoot: this.effects.shootEffect.isActive
      }
    };
  }

  dispose() {
    this.effects.bounceEffect.isActive = false;
    this.effects.shootEffect.isActive = false;
    this.effects.ballTrail = [];

    this.resetBallRotation();

    this.basketball = null;
    this.sceneManager = null;
    this.uiManager = null;

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && this.basketball !== null;
  }
}