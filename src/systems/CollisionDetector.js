import { HOOPS, BASKETBALL, PHYSICS } from '../utils/Constants.js';
import { Vector3Utils, CollisionUtils } from '../utils/MathUtils.js';

export class CollisionDetector {
  constructor() {
    this.basketball = null;
    this.basketRenderer = null;
    this.gameStateManager = null;
    this.scoreManager = null;

    this.lastBallPosition = Vector3Utils.create(0, 0, 0);
    this.ballTrajectory = [];
    this.maxTrajectoryLength = 10;

    // Rim collision state
    this.rimCollisions = {
      left: {
        lastCheck: 0,
        isNear: false,
        hasPassedThrough: false,
        entryDirection: null
      },
      right: {
        lastCheck: 0,
        isNear: false,
        hasPassedThrough: false,
        entryDirection: null
      }
    };

    // Scoring detection state
    this.scoreDetection = {
      isTracking: false,
      trackingHoop: null,
      ballAboveRim: false,
      ballBelowRim: false,
      ballInScoreZone: false,
      entryVelocity: null,
      detectionStartTime: 0
    };

    this.hoopGeometry = {
      left: null,
      right: null
    };

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('CollisionDetector already initialized');
      return;
    }

    this.basketball = systems.basketball;
    this.basketRenderer = systems.basketRenderer;
    this.gameStateManager = systems.gameStateManager;
    this.scoreManager = systems.scoreManager;

    if (!this.validateSystems()) {
      console.error('CollisionDetector initialization failed: missing required systems');
      return;
    }

    this.initializeHoopGeometry();
    this.isInitialized = true;
  }

  validateSystems() {
    if (!this.basketball) {
      console.error('Missing required system: basketball');
      return false;
    }
    if (!this.basketRenderer) {
      console.error('Missing required system: basketRenderer');
      return false;
    }
    
    return true;
  }

  initializeHoopGeometry() {
    const rimPositions = this.basketRenderer.getAllRimPositions();
    
    if (rimPositions.left && rimPositions.right) {
      this.hoopGeometry.left = {
        center: Vector3Utils.create(rimPositions.left.x, rimPositions.left.y, rimPositions.left.z),
        radius: HOOPS.RIM_RADIUS,
        height: HOOPS.RIM_HEIGHT
      };
      
      this.hoopGeometry.right = {
        center: Vector3Utils.create(rimPositions.right.x, rimPositions.right.y, rimPositions.right.z),
        radius: HOOPS.RIM_RADIUS,
        height: HOOPS.RIM_HEIGHT
      };
    } else {
      console.error('Failed to initialize hoop geometry: rim positions not available');
    }
  }

  update(deltaTime) {
    if (!this.isInitialized || !this.basketball || !this.basketball.isReady()) {
      return;
    }

    const ballPosition = this.basketball.getPosition();
    const ballVelocity = this.basketball.getVelocity();

    this.updateTrajectoryTracking(ballPosition);
    this.checkRimCollisions(ballPosition, ballVelocity, deltaTime);
    this.updateScoreDetection(ballPosition, ballVelocity, deltaTime);

    this.lastBallPosition = Vector3Utils.copy(ballPosition);
  }

  updateTrajectoryTracking(ballPosition) {
    this.ballTrajectory.push({
      position: Vector3Utils.copy(ballPosition),
      timestamp: Date.now()
    });

    if (this.ballTrajectory.length > this.maxTrajectoryLength) {
      this.ballTrajectory.shift();
    }
  }

  checkRimCollisions(ballPosition, ballVelocity, deltaTime) {
    this.checkSingleRimCollision('left', ballPosition, ballVelocity, deltaTime);
    this.checkSingleRimCollision('right', ballPosition, ballVelocity, deltaTime);
  }

  checkSingleRimCollision(side, ballPosition, ballVelocity, deltaTime) {
    const hoopGeom = this.hoopGeometry[side];
    if (!hoopGeom) return;

    const ballRadius = this.basketball.getRadius();
    const rimCollision = this.rimCollisions[side];

    const distanceToRim = Vector3Utils.distance(ballPosition, hoopGeom.center);
    const isNearRim = distanceToRim < (hoopGeom.radius + ballRadius + 0.5);

    rimCollision.isNear = isNearRim;

    if (isNearRim) {
      this.checkRimPassthrough(side, ballPosition, ballVelocity, hoopGeom, ballRadius);
    }

    rimCollision.lastCheck = Date.now();
  }

  checkRimPassthrough(side, ballPosition, ballVelocity, hoopGeom, ballRadius) {
    const rimCollision = this.rimCollisions[side];
    
    const horizontalDistance = Math.sqrt(
      Math.pow(ballPosition.x - hoopGeom.center.x, 2) + 
      Math.pow(ballPosition.z - hoopGeom.center.z, 2)
    );

    const verticalDistanceToRim = ballPosition.y - hoopGeom.center.y;
    
    // Precise rim collision detection - only on actual contact
    const rimOuterRadius = hoopGeom.radius + ballRadius;
    const rimInnerRadius = hoopGeom.radius - ballRadius;
    
    const isAtRimHeight = Math.abs(verticalDistanceToRim) < 0.3;
    const isTouchingRimEdge = horizontalDistance >= rimInnerRadius && horizontalDistance <= rimOuterRadius;
    
    if (isAtRimHeight && isTouchingRimEdge) {
      // Check if ball is moving toward the rim
      const rimDirection = Vector3Utils.create(
        hoopGeom.center.x - ballPosition.x,
        0,
        hoopGeom.center.z - ballPosition.z
      );
      const rimDirectionNormalized = Vector3Utils.normalize(rimDirection);
      const approachSpeed = Vector3Utils.dot(
        Vector3Utils.create(ballVelocity.x, 0, ballVelocity.z), 
        rimDirectionNormalized
      );
      
      if (approachSpeed > 0.1) {
        this.handleRimEdgeCollision(side, ballPosition, ballVelocity, hoopGeom);
        return;
      }
    }
    
    // Scoring detection - only for clean shots through center
    const isInRimCylinder = horizontalDistance <= rimInnerRadius;
    const isAboveRim = verticalDistanceToRim > 0.2;
    const isBelowRim = verticalDistanceToRim < -0.8;

    if (isInRimCylinder && ballVelocity.y < -0.5) {
      if (isAboveRim && !this.scoreDetection.isTracking) {
        this.startScoreTracking(side, ballPosition, ballVelocity);
      } else if (isBelowRim && this.scoreDetection.isTracking && this.scoreDetection.trackingHoop === side) {
        this.triggerScore(side);
      }
    }
  }

  startScoreTracking(side, ballPosition, ballVelocity) {
    this.scoreDetection = {
      isTracking: true,
      trackingHoop: side,
      ballAboveRim: true,
      ballBelowRim: false,
      ballInScoreZone: true,
      entryVelocity: Vector3Utils.copy(ballVelocity),
      detectionStartTime: Date.now()
    };
  }

  updateScoreDetection(ballPosition, ballVelocity, deltaTime) {
    if (!this.scoreDetection.isTracking) return;

    const side = this.scoreDetection.trackingHoop;
    const hoopGeom = this.hoopGeometry[side];
    if (!hoopGeom) return;

    const ballRadius = this.basketball.getRadius();
    
    const horizontalDistance = Math.sqrt(
      Math.pow(ballPosition.x - hoopGeom.center.x, 2) + 
      Math.pow(ballPosition.z - hoopGeom.center.z, 2)
    );
    
    const isInScoreZone = horizontalDistance <= HOOPS.SCORE_DETECTION_RADIUS;
    const verticalDistanceToRim = ballPosition.y - hoopGeom.center.y;

    this.scoreDetection.ballInScoreZone = isInScoreZone;
    this.scoreDetection.ballBelowRim = verticalDistanceToRim < -HOOPS.SCORE_DETECTION_HEIGHT;

    if (this.scoreDetection.ballBelowRim && isInScoreZone) {
      this.triggerScore(side);
    }
    
    // Stop tracking if ball moves away or conditions fail
    if (!isInScoreZone || ballVelocity.y > 0 || 
        Date.now() - this.scoreDetection.detectionStartTime > 3000) {
      this.stopScoreTracking();
    }
  }

  triggerScore(side) {
    if (!this.scoreDetection.isTracking) return;

    this.rimCollisions[side].hasPassedThrough = true;

    if (this.gameStateManager && this.gameStateManager.handleScore) {
      this.gameStateManager.handleScore();
    } else {
      console.warn('GameStateManager handleScore method not found, calling alternative');
      if (this.gameStateManager && this.gameStateManager.scoreBasket) {
        this.gameStateManager.scoreBasket();
      }
    }

    this.stopScoreTracking();
  }

  stopScoreTracking() {
    this.scoreDetection = {
      isTracking: false,
      trackingHoop: null,
      ballAboveRim: false,
      ballBelowRim: false,
      ballInScoreZone: false,
      entryVelocity: null,
      detectionStartTime: 0
    };
  }

  // Handle rim edge collision with realistic physics
  handleRimEdgeCollision(side, ballPosition, ballVelocity, hoopGeom) {
    // Calculate collision normal from rim center to ball
    const rimCenter2D = Vector3Utils.create(hoopGeom.center.x, ballPosition.y, hoopGeom.center.z);
    const collisionDirection = Vector3Utils.subtract(ballPosition, rimCenter2D);
    
    const horizontalDistance = Math.sqrt(collisionDirection.x * collisionDirection.x + collisionDirection.z * collisionDirection.z);
    
    if (horizontalDistance < 0.01) {
      return;
    }
    
    const collisionNormal = Vector3Utils.create(
      collisionDirection.x / horizontalDistance,
      0,
      collisionDirection.z / horizontalDistance
    );

    const horizontalVelocity = Vector3Utils.create(ballVelocity.x, 0, ballVelocity.z);
    const dotProduct = Vector3Utils.dot(horizontalVelocity, collisionNormal);
    
    if (dotProduct < 0) {
      const reflection = Vector3Utils.subtract(horizontalVelocity, 
        Vector3Utils.multiplyScalar(collisionNormal, 2 * dotProduct));
      
      const dampedVelocity = Vector3Utils.multiplyScalar(reflection, 0.7);
      
      // Ensure minimum bounce to prevent sticking
      const minSpeed = 2.0;
      const currentSpeed = Vector3Utils.magnitude(dampedVelocity);
      
      if (currentSpeed < minSpeed) {
        const direction = Vector3Utils.normalize(dampedVelocity);
        dampedVelocity.x = direction.x * minSpeed;
        dampedVelocity.z = direction.z * minSpeed;
      }
      
      const upwardComponent = Math.max(1.5, Math.abs(ballVelocity.y) * 0.3);
      
      const finalVelocity = Vector3Utils.create(
        dampedVelocity.x,
        upwardComponent,
        dampedVelocity.z
      );
      
      this.basketball.setVelocity(finalVelocity);
    }
  }

  getClosestHoop(ballPosition) {
    let closestSide = null;
    let closestDistance = Infinity;

    for (const side of ['left', 'right']) {
      const hoopGeom = this.hoopGeometry[side];
      if (hoopGeom) {
        const distance = Vector3Utils.distance(ballPosition, hoopGeom.center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSide = side;
        }
      }
    }

    return { side: closestSide, distance: closestDistance };
  }

  reset() {
    this.ballTrajectory = [];

    for (const side of ['left', 'right']) {
      this.rimCollisions[side] = {
        lastCheck: 0,
        isNear: false,
        hasPassedThrough: false,
        entryDirection: null
      };
    }

    this.stopScoreTracking();
  }

  getCollisionState() {
    return {
      ballTrajectoryLength: this.ballTrajectory.length,
      scoreDetection: { ...this.scoreDetection },
      rimCollisions: {
        left: { ...this.rimCollisions.left },
        right: { ...this.rimCollisions.right }
      },
      hoopGeometry: {
        left: this.hoopGeometry.left ? { ...this.hoopGeometry.left } : null,
        right: this.hoopGeometry.right ? { ...this.hoopGeometry.right } : null
      },
      isInitialized: this.isInitialized
    };
  }

  getRimCollisionInfo(side) {
    return this.rimCollisions[side] ? { ...this.rimCollisions[side] } : null;
  }

  isTrackingScore() {
    return this.scoreDetection.isTracking;
  }

  getScoreTrackingInfo() {
    return { ...this.scoreDetection };
  }

  dispose() {
    this.basketball = null;
    this.basketRenderer = null;
    this.gameStateManager = null;
    this.scoreManager = null;

    this.ballTrajectory = [];
    this.hoopGeometry = { left: null, right: null };
    this.reset();

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && 
           this.basketball !== null && 
           this.basketRenderer !== null &&
           this.hoopGeometry.left !== null && 
           this.hoopGeometry.right !== null;
  }
}