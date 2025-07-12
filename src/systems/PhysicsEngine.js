import { PHYSICS, BASKETBALL, COURT } from '../utils/Constants.js';
import { Vector3Utils, PhysicsUtils } from '../utils/MathUtils.js';

export class PhysicsEngine {
  constructor() {
    this.basketball = null;
    this.collisionDetector = null;

    this.gravity = Vector3Utils.create(0, PHYSICS.SCALED_GRAVITY, 0);
    this.timeAccumulator = 0;
    
    this.lastPosition = Vector3Utils.create(0, 0, 0);
    this.lastVelocity = Vector3Utils.create(0, 0, 0);
    
    // Ground collision state
    this.groundCollisionCount = 0;
    this.lastGroundCollision = 0;
    this.ballIsSettled = false;
    this.ballWasShot = false;
    
    this.settings = {
      enableGravity: true,
      enableAirResistance: true,
      enableBouncing: true,
      enableRollingFriction: true,
      minVelocityThreshold: BASKETBALL.MIN_VELOCITY,
      minBounceVelocity: BASKETBALL.MIN_BOUNCE_VELOCITY
    };

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('PhysicsEngine already initialized');
      return;
    }

    this.basketball = systems.basketball;
    this.collisionDetector = systems.collisionDetector;

    if (!this.validateSystems()) {
      console.error('PhysicsEngine initialization failed: missing required systems');
      return;
    }

    this.isInitialized = true;
  }

  validateSystems() {
    if (!this.basketball) {
      console.error('Missing required system: basketball');
      return false;
    }
    
    return true;
  }

  update(deltaTime) {
    if (!this.isInitialized || !this.basketball || !this.basketball.isReady()) {
      return;
    }

    this.lastPosition = this.basketball.getPosition();
    this.lastVelocity = this.basketball.getVelocity();

    this.integratePhysics(deltaTime);
    this.handleCollisions(deltaTime);
    this.applyConstraints();
  }

  integratePhysics(deltaTime) {
    let currentVelocity = this.basketball.getVelocity();
    let currentPosition = this.basketball.getPosition();

    // Check if ball is settled on ground - but don't stop bouncing balls
    const isOnGround = this.basketball.isBasketballOnGround();
    const speed = Vector3Utils.magnitude(currentVelocity);
    
    // Only stop physics if ball is truly settled (not just bouncing)
    if (isOnGround && speed < 0.05 && this.basketball.isSettlingDown()) {
      this.basketball.setVelocity(Vector3Utils.create(0, 0, 0));
      return;
    }

    // Apply gravity
    if (this.settings.enableGravity) {
      if (!isOnGround || currentVelocity.y > 0) {
        const gravityDelta = Vector3Utils.multiplyScalar(
          Vector3Utils.create(0, PHYSICS.SCALED_GRAVITY, 0), 
          deltaTime
        );
        currentVelocity = Vector3Utils.add(currentVelocity, gravityDelta);
      }
    }

    // Apply air resistance
    if (this.settings.enableAirResistance && this.basketball.isBasketballInFlight()) {
      currentVelocity = PhysicsUtils.applyAirResistance(currentVelocity);
    }

    // Apply rolling friction
    if (this.settings.enableRollingFriction && isOnGround) {
      const horizontalVelocity = Vector3Utils.create(currentVelocity.x, 0, currentVelocity.z);
      const horizontalSpeed = Vector3Utils.magnitude(horizontalVelocity);
      
      if (horizontalSpeed < 0.05) {
        currentVelocity = Vector3Utils.create(0, currentVelocity.y, 0);
      } else {
        const frictionVelocity = PhysicsUtils.applyRollingFriction(horizontalVelocity);
        currentVelocity = Vector3Utils.create(frictionVelocity.x, currentVelocity.y, frictionVelocity.z);
      }
    }

    this.basketball.setVelocity(currentVelocity);
  }

  handleCollisions(deltaTime) {
    const ballPosition = this.basketball.getPosition();
    const ballVelocity = this.basketball.getVelocity();
    const ballRadius = this.basketball.getRadius();

    this.handleGroundCollision(ballPosition, ballVelocity, ballRadius);
    this.handleBoundaryCollisions(ballPosition, ballVelocity, ballRadius);

    if (this.collisionDetector && this.collisionDetector.checkRimCollision) {
      this.handleRimCollisions(ballPosition, ballVelocity, ballRadius);
    }
  }

  handleGroundCollision(ballPosition, ballVelocity, ballRadius) {
    const groundLevel = PHYSICS.GROUND_Y;
    const ballBottomY = ballPosition.y - ballRadius;
    
    if (ballBottomY <= groundLevel) {
      // Position ball exactly on ground
      const correctedPosition = Vector3Utils.create(
        ballPosition.x,
        groundLevel + ballRadius,
        ballPosition.z
      );
      this.basketball.setPosition(correctedPosition);

      // Calculate bounce or settle
      const bounceVelocity = this.calculateRealisticBounce(ballVelocity);
      this.basketball.setVelocity(bounceVelocity);
      
      this.lastGroundCollision = Date.now();
      this.groundCollisionCount++;
    }
  }

  calculateRealisticBounce(velocity) {
    const bounceCount = this.basketball.getBounceCount();
    const verticalSpeed = Math.abs(velocity.y);
    
    // If ball hits with high velocity, treat as new impact (reset bounce count)
    if (verticalSpeed > 8.0) {
      this.basketball.resetBounceCount();
      const newBounceCount = 0;
      
      // Recalculate with fresh bounce count
      const restitution = BASKETBALL.COEFFICIENT_OF_RESTITUTION;
      const energyLoss = Math.pow(BASKETBALL.BOUNCE_ENERGY_LOSS, newBounceCount);
      const bounceVelocityY = verticalSpeed * restitution * energyLoss;
      
      this.basketball.incrementBounceCount();
      
      return Vector3Utils.create(
        velocity.x * BASKETBALL.ROLLING_FRICTION,
        bounceVelocityY,
        velocity.z * BASKETBALL.ROLLING_FRICTION
      );
    }
    
    // Check if ball should stop bouncing
    if (bounceCount >= BASKETBALL.MAX_BOUNCES || 
        verticalSpeed < BASKETBALL.MIN_BOUNCE_HEIGHT ||
        this.basketball.isSettlingDown()) {
      
      this.basketball.setSettling(true);
      return Vector3Utils.create(
        velocity.x * BASKETBALL.ROLLING_FRICTION,
        0,
        velocity.z * BASKETBALL.ROLLING_FRICTION
      );
    }

    // Calculate bounce with energy loss
    const restitution = BASKETBALL.COEFFICIENT_OF_RESTITUTION;
    const energyLoss = Math.pow(BASKETBALL.BOUNCE_ENERGY_LOSS, bounceCount);
    
    const bounceVelocityY = verticalSpeed * restitution * energyLoss;
    
    // Increment bounce count
    this.basketball.incrementBounceCount();
    this.basketball.lastBounceVelocity = bounceVelocityY;
    
    // Check if next bounce will be too small
    if (bounceVelocityY < BASKETBALL.SETTLE_THRESHOLD) {
      this.basketball.setSettling(true);
    }

    return Vector3Utils.create(
      velocity.x * BASKETBALL.ROLLING_FRICTION,
      bounceVelocityY,
      velocity.z * BASKETBALL.ROLLING_FRICTION
    );
  }

  calculateGroundBounce(velocity) {
    // No ground bouncing - ball stays on ground
    return Vector3Utils.create(
      velocity.x * 0.5,
      0,
      velocity.z * 0.5
    );
  }

  handleBoundaryCollisions(ballPosition, ballVelocity, ballRadius) {
    let correctedPosition = Vector3Utils.copy(ballPosition);
    let correctedVelocity = Vector3Utils.copy(ballVelocity);
    let collisionOccurred = false;

    // Check backboard collisions
    const backboardCollision = this.checkBackboardCollisions(ballPosition, ballVelocity, ballRadius);
    if (backboardCollision.hit) {
      correctedPosition = backboardCollision.position;
      correctedVelocity = backboardCollision.velocity;
      collisionOccurred = true;
    }

    // Check basket base collisions
    if (!collisionOccurred) {
      const baseCollision = this.checkBasketBaseCollisions(ballPosition, ballVelocity, ballRadius);
      if (baseCollision.hit) {
        correctedPosition = baseCollision.position;
        correctedVelocity = baseCollision.velocity;
        collisionOccurred = true;
      }
    }

    // Check basket pole collisions
    if (!collisionOccurred) {
      const poleCollision = this.checkBasketPoleCollisions(ballPosition, ballVelocity, ballRadius);
      if (poleCollision.hit) {
        correctedPosition = poleCollision.position;
        correctedVelocity = poleCollision.velocity;
        collisionOccurred = true;
      }
    }

    // Check scoreboard collisions
    if (!collisionOccurred) {
      const scoreboardCollision = this.checkScoreboardCollisions(ballPosition, ballVelocity, ballRadius);
      if (scoreboardCollision.hit) {
        correctedPosition = scoreboardCollision.position;
        correctedVelocity = scoreboardCollision.velocity;
        collisionOccurred = true;
      }
    }

    // Check scoreboard pole collisions
    if (!collisionOccurred) {
      const scoreboardPoleCollision = this.checkScoreboardPoleCollisions(ballPosition, ballVelocity, ballRadius);
      if (scoreboardPoleCollision.hit) {
        correctedPosition = scoreboardPoleCollision.position;
        correctedVelocity = scoreboardPoleCollision.velocity;
        collisionOccurred = true;
      }
    }

    // Z-axis boundaries as fallback
    if (!collisionOccurred) {
      if (ballPosition.z - ballRadius < COURT.BOUNDARY_MIN_Z) {
        correctedPosition.z = COURT.BOUNDARY_MIN_Z + ballRadius;
        correctedVelocity.z = Math.abs(correctedVelocity.z) * BASKETBALL.BOUNCE_DAMPING;
        collisionOccurred = true;
      } else if (ballPosition.z + ballRadius > COURT.BOUNDARY_MAX_Z) {
        correctedPosition.z = COURT.BOUNDARY_MAX_Z - ballRadius;
        correctedVelocity.z = -Math.abs(correctedVelocity.z) * BASKETBALL.BOUNCE_DAMPING;
        collisionOccurred = true;
      }
    }

    if (collisionOccurred) {
      this.basketball.setPosition(correctedPosition);
      this.basketball.setVelocity(correctedVelocity);
    }
  }

  checkBackboardCollisions(ballPosition, ballVelocity, ballRadius) {
    const backboards = [
      {
        side: 'left',
        position: { x: -14.0, y: 5.0, z: 0 },
        size: { x: 0.1, y: 3, z: 4 }
      },
      {
        side: 'right', 
        position: { x: 14.0, y: 5.0, z: 0 },
        size: { x: 0.1, y: 3, z: 4 }
      }
    ];

    for (const backboard of backboards) {
      const collision = this.checkBoxCollision(ballPosition, ballVelocity, ballRadius, backboard);
      if (collision.hit) {
        return {
          hit: true,
          side: backboard.side,
          position: collision.position,
          velocity: collision.velocity
        };
      }
    }

    return { hit: false };
  }

  checkScoreboardCollisions(ballPosition, ballVelocity, ballRadius) {
    const scoreboardStructures = [
      // Scoreboard bases
      {
        side: 'left-base',
        position: { x: -19, y: 0.3, z: 0 },
        size: { x: 3, y: 0.6, z: 3 }
      },
      {
        side: 'right-base',
        position: { x: 19, y: 0.3, z: 0 },
        size: { x: 3, y: 0.6, z: 3 }
      },
      // Scoreboard displays
      {
        side: 'left-display',
        position: { x: -19, y: 8, z: -0.8 },
        size: { x: 0.3, y: 2.5, z: 4 }
      },
      {
        side: 'right-display',
        position: { x: 19, y: 8, z: -0.8 },
        size: { x: 0.3, y: 2.5, z: 4 }
      },
      // Horizontal support beams
      {
        side: 'left-support',
        position: { x: -19, y: 6, z: 0 },
        size: { x: 0.15, y: 0.15, z: 1.8 }
      },
      {
        side: 'right-support',
        position: { x: 19, y: 6, z: 0 },
        size: { x: 0.15, y: 0.15, z: 1.8 }
      }
    ];

    for (const structure of scoreboardStructures) {
      const collision = this.checkBoxCollision(ballPosition, ballVelocity, ballRadius, structure);
      if (collision.hit) {
        return {
          hit: true,
          side: structure.side,
          position: collision.position,
          velocity: collision.velocity
        };
      }
    }

    return { hit: false };
  }

  // Generic box collision detection
  checkBoxCollision(ballPosition, ballVelocity, ballRadius, box) {
    const { position: boxPos, size: boxSize } = box;
    
    const boxMinX = boxPos.x - boxSize.x / 2;
    const boxMaxX = boxPos.x + boxSize.x / 2;
    const boxMinY = boxPos.y - boxSize.y / 2;
    const boxMaxY = boxPos.y + boxSize.y / 2;
    const boxMinZ = boxPos.z - boxSize.z / 2;
    const boxMaxZ = boxPos.z + boxSize.z / 2;

    const ballNearX = ballPosition.x + ballRadius >= boxMinX && ballPosition.x - ballRadius <= boxMaxX;
    const ballNearY = ballPosition.y + ballRadius >= boxMinY && ballPosition.y - ballRadius <= boxMaxY;
    const ballNearZ = ballPosition.z + ballRadius >= boxMinZ && ballPosition.z - ballRadius <= boxMaxZ;

    if (!ballNearX || !ballNearY || !ballNearZ) {
      return { hit: false };
    }

    let correctedPosition = Vector3Utils.copy(ballPosition);
    let correctedVelocity = Vector3Utils.copy(ballVelocity);
    let collisionDetected = false;

    // X-axis collision
    if (ballPosition.x - ballRadius < boxMaxX && ballPosition.x + ballRadius > boxMinX) {
      if (ballVelocity.x > 0 && ballPosition.x < boxMinX) {
        correctedPosition.x = boxMinX - ballRadius;
        correctedVelocity.x = -Math.abs(ballVelocity.x) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      } else if (ballVelocity.x < 0 && ballPosition.x > boxMaxX) {
        correctedPosition.x = boxMaxX + ballRadius;
        correctedVelocity.x = Math.abs(ballVelocity.x) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      }
    }

    // Y-axis collision
    if (!collisionDetected && ballPosition.y - ballRadius < boxMaxY && ballPosition.y + ballRadius > boxMinY) {
      if (ballVelocity.y > 0 && ballPosition.y < boxMinY) {
        correctedPosition.y = boxMinY - ballRadius;
        correctedVelocity.y = -Math.abs(ballVelocity.y) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      } else if (ballVelocity.y < 0 && ballPosition.y > boxMaxY) {
        correctedPosition.y = boxMaxY + ballRadius;
        correctedVelocity.y = Math.abs(ballVelocity.y) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      }
    }

    // Z-axis collision
    if (!collisionDetected && ballPosition.z - ballRadius < boxMaxZ && ballPosition.z + ballRadius > boxMinZ) {
      if (ballVelocity.z > 0 && ballPosition.z < boxMinZ) {
        correctedPosition.z = boxMinZ - ballRadius;
        correctedVelocity.z = -Math.abs(ballVelocity.z) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      } else if (ballVelocity.z < 0 && ballPosition.z > boxMaxZ) {
        correctedPosition.z = boxMaxZ + ballRadius;
        correctedVelocity.z = Math.abs(ballVelocity.z) * BASKETBALL.BOUNCE_DAMPING;
        collisionDetected = true;
      }
    }

    return {
      hit: collisionDetected,
      position: correctedPosition,
      velocity: correctedVelocity
    };
  }

  checkBasketBaseCollisions(ballPosition, ballVelocity, ballRadius) {
    const basketBases = [
      {
        side: 'left',
        position: { x: -16.1, y: 0.25, z: 0 },
        size: { x: 2, y: 0.5, z: 2 }
      },
      {
        side: 'right',
        position: { x: 16.1, y: 0.25, z: 0 },
        size: { x: 2, y: 0.5, z: 2 }
      }
    ];

    for (const base of basketBases) {
      const collision = this.checkBoxCollision(ballPosition, ballVelocity, ballRadius, base);
      if (collision.hit) {
        return {
          hit: true,
          side: base.side,
          position: collision.position,
          velocity: collision.velocity
        };
      }
    }

    return { hit: false };
  }

  checkBasketPoleCollisions(ballPosition, ballVelocity, ballRadius) {
    const basketPoles = [
      {
        name: 'left-basket-pole',
        position: { x: -16.1, y: 2.85, z: 0 },
        radius: 0.2,
        height: 4.7
      },
      {
        name: 'right-basket-pole', 
        position: { x: 16.1, y: 2.85, z: 0 },
        radius: 0.2,
        height: 4.7
      }
    ];

    for (const pole of basketPoles) {
      const collision = this.checkCylinderCollision(ballPosition, ballVelocity, ballRadius, pole);
      if (collision.hit) {
        return {
          hit: true,
          name: pole.name,
          position: collision.position,
          velocity: collision.velocity
        };
      }
    }

    return { hit: false };
  }

  checkScoreboardPoleCollisions(ballPosition, ballVelocity, ballRadius) {
    const scoreboardPoles = [
      {
        name: 'left-scoreboard-pole-1',
        position: { x: -19.8, y: 4.3, z: 0 },
        radius: 0.25,
        height: 8
      },
      {
        name: 'left-scoreboard-pole-2',
        position: { x: -18.2, y: 4.3, z: 0 },
        radius: 0.25,
        height: 8
      },
      {
        name: 'right-scoreboard-pole-1',
        position: { x: 18.2, y: 4.3, z: 0 },
        radius: 0.25,
        height: 8
      },
      {
        name: 'right-scoreboard-pole-2',
        position: { x: 19.8, y: 4.3, z: 0 },
        radius: 0.25,
        height: 8
      }
    ];

    for (const pole of scoreboardPoles) {
      const collision = this.checkCylinderCollision(ballPosition, ballVelocity, ballRadius, pole);
      if (collision.hit) {
        return {
          hit: true,
          name: pole.name,
          position: collision.position,
          velocity: collision.velocity
        };
      }
    }

    return { hit: false };
  }

  // Cylinder collision detection for poles
  checkCylinderCollision(ballPosition, ballVelocity, ballRadius, cylinder) {
    const { position: cylPos, radius: cylRadius, height: cylHeight } = cylinder;
    
    const cylMinY = cylPos.y - cylHeight / 2;
    const cylMaxY = cylPos.y + cylHeight / 2;
    
    if (ballPosition.y - ballRadius > cylMaxY || ballPosition.y + ballRadius < cylMinY) {
      return { hit: false };
    }

    const dx = ballPosition.x - cylPos.x;
    const dz = ballPosition.z - cylPos.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    const totalRadius = ballRadius + cylRadius;

    if (horizontalDistance >= totalRadius) {
      return { hit: false };
    }

    const collisionNormal = {
      x: dx / horizontalDistance,
      y: 0,
      z: dz / horizontalDistance
    };

    const correctedPosition = Vector3Utils.create(
      cylPos.x + collisionNormal.x * totalRadius,
      ballPosition.y,
      cylPos.z + collisionNormal.z * totalRadius
    );

    const dotProduct = ballVelocity.x * collisionNormal.x + ballVelocity.z * collisionNormal.z;
    const correctedVelocity = Vector3Utils.create(
      ballVelocity.x - 2 * dotProduct * collisionNormal.x * BASKETBALL.BOUNCE_DAMPING,
      ballVelocity.y,
      ballVelocity.z - 2 * dotProduct * collisionNormal.z * BASKETBALL.BOUNCE_DAMPING
    );

    return {
      hit: true,
      position: correctedPosition,
      velocity: correctedVelocity
    };
  }

  handleRimCollisions(ballPosition, ballVelocity, ballRadius) {
    // Collision detector handles rim collisions in its own update cycle
  }

  applyConstraints() {
    const ballPosition = this.basketball.getPosition();
    const ballVelocity = this.basketball.getVelocity();

    // Ensure ball doesn't go below ground
    if (ballPosition.y < PHYSICS.GROUND_Y) {
      this.basketball.setPosition(Vector3Utils.create(
        ballPosition.x,
        PHYSICS.GROUND_Y + BASKETBALL.RADIUS,
        ballPosition.z
      ));
    }

    // Limit maximum velocity
    const maxSpeed = 50;
    const currentSpeed = Vector3Utils.magnitude(ballVelocity);
    if (currentSpeed > maxSpeed) {
      const normalizedVelocity = Vector3Utils.normalize(ballVelocity);
      const limitedVelocity = Vector3Utils.multiplyScalar(normalizedVelocity, maxSpeed);
      this.basketball.setVelocity(limitedVelocity);
      console.warn('Ball velocity limited to prevent unrealistic speed');
    }
  }

  addForce(force) {
    if (!this.basketball) return;
    
    const currentVelocity = this.basketball.getVelocity();
    const newVelocity = Vector3Utils.add(currentVelocity, force);
    this.basketball.setVelocity(newVelocity);
  }

  setVelocity(velocity) {
    if (!this.basketball) return;
    
    // Reset bounce tracking for ANY significant velocity change
    if (Vector3Utils.magnitude(velocity) > 3.0) {
      this.ballIsSettled = false;
      this.ballWasShot = true;
      // Reset bounce tracking for new shot
      this.basketball.resetBounceCount();
    } else if (Vector3Utils.magnitude(velocity) > 0.1) {
      this.ballIsSettled = false;
    }
    
    this.basketball.setVelocity(velocity);
  }

  getPhysicsState() {
    if (!this.basketball) return null;

    return {
      position: this.basketball.getPosition(),
      velocity: this.basketball.getVelocity(),
      speed: Vector3Utils.magnitude(this.basketball.getVelocity()),
      isOnGround: this.basketball.isBasketballOnGround(),
      isInFlight: this.basketball.isBasketballInFlight(),
      isMoving: this.basketball.isMovingSignificantly(),
      groundCollisions: this.groundCollisionCount,
      timeSinceGroundCollision: Date.now() - this.lastGroundCollision,
      gravity: this.gravity,
      settings: { ...this.settings }
    };
  }

  setGravityEnabled(enabled) {
    this.settings.enableGravity = enabled;
  }

  setAirResistanceEnabled(enabled) {
    this.settings.enableAirResistance = enabled;
  }

  setBouncingEnabled(enabled) {
    this.settings.enableBouncing = enabled;
  }

  setGravity(gravityValue) {
    this.gravity = Vector3Utils.create(0, gravityValue, 0);
  }

  reset() {
    this.timeAccumulator = 0;
    this.groundCollisionCount = 0;
    this.lastGroundCollision = 0;
    this.lastPosition = Vector3Utils.create(0, 0, 0);
    this.lastVelocity = Vector3Utils.create(0, 0, 0);
    
    this.settings = {
      enableGravity: true,
      enableAirResistance: true,
      enableBouncing: true,
      enableRollingFriction: true,
      minVelocityThreshold: BASKETBALL.MIN_VELOCITY,
      minBounceVelocity: BASKETBALL.MIN_BOUNCE_VELOCITY
    };
  }

  getPhysicsStats() {
    return {
      groundCollisions: this.groundCollisionCount,
      timeSinceLastGroundCollision: Date.now() - this.lastGroundCollision,
      gravityEnabled: this.settings.enableGravity,
      airResistanceEnabled: this.settings.enableAirResistance,
      bouncingEnabled: this.settings.enableBouncing,
      rollingFrictionEnabled: this.settings.enableRollingFriction,
      gravityValue: this.gravity.y,
      isInitialized: this.isInitialized
    };
  }

  dispose() {
    this.basketball = null;
    this.collisionDetector = null;

    this.timeAccumulator = 0;
    this.groundCollisionCount = 0;
    this.lastGroundCollision = 0;

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && this.basketball !== null;
  }
}