import { PHYSICS, HOOPS, BASKETBALL } from './Constants.js';

export const Vector3Utils = {
  create(x = 0, y = 0, z = 0) {
    return { x, y, z };
  },
  
  copy(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
  },
  
  add(a, b) {
    return { 
      x: a.x + b.x, 
      y: a.y + b.y, 
      z: a.z + b.z 
    };
  },
  
  subtract(a, b) {
    return { 
      x: a.x - b.x, 
      y: a.y - b.y, 
      z: a.z - b.z 
    };
  },
  
  multiplyScalar(vector, scalar) {
    return { 
      x: vector.x * scalar, 
      y: vector.y * scalar, 
      z: vector.z * scalar 
    };
  },
  
  magnitude(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  },
  
  normalize(vector) {
    const mag = this.magnitude(vector);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { 
      x: vector.x / mag, 
      y: vector.y / mag, 
      z: vector.z / mag 
    };
  },
  
  distance(a, b) {
    const diff = this.subtract(a, b);
    return this.magnitude(diff);
  },
  
  dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },
  
  lerp(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }
};

export const PhysicsUtils = {
  // Calculate projectile motion trajectory
  calculateTrajectoryVelocity(startPos, targetPos, arcHeight) {
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    const dz = targetPos.z - startPos.z;
    
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    const timeToApex = Math.sqrt(2 * arcHeight / Math.abs(PHYSICS.SCALED_GRAVITY));
    const totalTime = timeToApex + Math.sqrt(2 * (arcHeight + Math.abs(dy)) / Math.abs(PHYSICS.SCALED_GRAVITY));
    
    const velocityX = dx / totalTime;
    const velocityZ = dz / totalTime;
    const velocityY = Math.sqrt(2 * Math.abs(PHYSICS.SCALED_GRAVITY) * arcHeight);
    
    return Vector3Utils.create(velocityX, velocityY, velocityZ);
  },
  
  calculateShotAngle(startPos, targetPos, power) {
    const horizontalDistance = Vector3Utils.distance(
      { x: startPos.x, y: 0, z: startPos.z },
      { x: targetPos.x, y: 0, z: targetPos.z }
    );
    
    const heightDifference = targetPos.y - startPos.y;
    
    const arcHeight = HOOPS.SHOT_ARC_HEIGHT_MIN + 
      (power / 100) * (HOOPS.SHOT_ARC_HEIGHT_MAX - HOOPS.SHOT_ARC_HEIGHT_MIN);
    
    return Math.atan2(heightDifference + arcHeight, horizontalDistance);
  },
  
  applyGravity(velocity, deltaTime) {
    return Vector3Utils.add(velocity, 
      Vector3Utils.create(0, PHYSICS.SCALED_GRAVITY * deltaTime, 0));
  },
  
  applyAirResistance(velocity) {
    return Vector3Utils.multiplyScalar(velocity, BASKETBALL.AIR_RESISTANCE);
  },
  
  calculateBounceVelocity(velocity, normal, dampingFactor = BASKETBALL.BOUNCE_DAMPING) {
    const dotProduct = Vector3Utils.dot(velocity, normal);
    const reflection = Vector3Utils.subtract(velocity, 
      Vector3Utils.multiplyScalar(normal, 2 * dotProduct));
    
    return Vector3Utils.multiplyScalar(reflection, dampingFactor);
  },
  
  isVelocityBelowThreshold(velocity) {
    return Vector3Utils.magnitude(velocity) < BASKETBALL.MIN_VELOCITY;
  },
  
  applyRollingFriction(velocity) {
    return Vector3Utils.multiplyScalar(velocity, BASKETBALL.ROLLING_FRICTION);
  }
};

export const CollisionUtils = {
  spherePlaneCollision(sphereCenter, sphereRadius, planeY) {
    return sphereCenter.y - sphereRadius <= planeY;
  },
  
  sphereSphereCollision(center1, radius1, center2, radius2) {
    const distance = Vector3Utils.distance(center1, center2);
    return distance <= (radius1 + radius2);
  },
  
  pointInCylinder(point, cylinderCenter, cylinderRadius, cylinderHeight) {
    const horizontalDistance = Math.sqrt(
      Math.pow(point.x - cylinderCenter.x, 2) + 
      Math.pow(point.z - cylinderCenter.z, 2)
    );
    
    const withinHeight = point.y >= cylinderCenter.y - cylinderHeight/2 && 
                        point.y <= cylinderCenter.y + cylinderHeight/2;
    
    return horizontalDistance <= cylinderRadius && withinHeight;
  },
  
  ballPassesThroughHoop(ballPos, ballRadius, hoopPos, hoopRadius) {
    const horizontalDistance = Math.sqrt(
      Math.pow(ballPos.x - hoopPos.x, 2) + 
      Math.pow(ballPos.z - hoopPos.z, 2)
    );
    
    return horizontalDistance <= (hoopRadius - ballRadius);
  },
  
  getGroundCollisionNormal() {
    return Vector3Utils.create(0, 1, 0);
  },
  
  getSphereCollisionNormal(center1, center2) {
    const direction = Vector3Utils.subtract(center1, center2);
    return Vector3Utils.normalize(direction);
  }
};

export const TrajectoryUtils = {
  calculateTrajectoryPoints(startPos, velocity, numPoints = 20) {
    const points = [];
    const timeStep = 0.1;
    
    let currentPos = Vector3Utils.copy(startPos);
    let currentVel = Vector3Utils.copy(velocity);
    
    for (let i = 0; i < numPoints; i++) {
      points.push(Vector3Utils.copy(currentPos));
      
      currentPos = Vector3Utils.add(currentPos, 
        Vector3Utils.multiplyScalar(currentVel, timeStep));
      
      currentVel = PhysicsUtils.applyGravity(currentVel, timeStep);
      
      if (currentPos.y <= PHYSICS.GROUND_Y) break;
    }
    
    return points;
  },
  
  predictLandingPosition(startPos, velocity) {
    let currentPos = Vector3Utils.copy(startPos);
    let currentVel = Vector3Utils.copy(velocity);
    const timeStep = 0.016;
    let iterations = 0;
    const maxIterations = 1000;
    
    while (currentPos.y > PHYSICS.GROUND_Y && iterations < maxIterations) {
      currentPos = Vector3Utils.add(currentPos, 
        Vector3Utils.multiplyScalar(currentVel, timeStep));
      currentVel = PhysicsUtils.applyGravity(currentVel, timeStep);
      iterations++;
    }
    
    return currentPos;
  }
};

export const AnimationUtils = {
  smoothStep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  },
  
  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },
  
  // Calculate realistic ball rotation based on movement
  calculateBallRotation(velocity, deltaTime) {
    const speed = Vector3Utils.magnitude(velocity);
    if (speed < BASKETBALL.MIN_VELOCITY) return Vector3Utils.create(0, 0, 0);
    
    const rotationAxis = Vector3Utils.normalize({
      x: -velocity.z,
      y: 0,
      z: velocity.x
    });
    
    const rotationAmount = speed * BASKETBALL.ROTATION_SPEED_MULTIPLIER * deltaTime;
    
    return Vector3Utils.multiplyScalar(rotationAxis, rotationAmount);
  }
};

export const GeneralUtils = {
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },
  
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  
  degToRad(degrees) {
    return degrees * (Math.PI / 180);
  },
  
  radToDeg(radians) {
    return radians * (180 / Math.PI);
  },
  
  random(min, max) {
    return Math.random() * (max - min) + min;
  },
  
  approximately(a, b, epsilon = 0.001) {
    return Math.abs(a - b) < epsilon;
  }
};