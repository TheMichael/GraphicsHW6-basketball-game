import { BASKETBALL, PHYSICS, COURT } from '../utils/Constants.js';
import { Vector3Utils, AnimationUtils } from '../utils/MathUtils.js';

export class Basketball {
  constructor(scene) {
    this.scene = scene;
    
    this.basketballMesh = null;
    this.ballRings = [];
    
    // Physics properties
    this.position = Vector3Utils.create(
      BASKETBALL.INITIAL_X, 
      BASKETBALL.INITIAL_Y, 
      BASKETBALL.INITIAL_Z
    );
    this.velocity = Vector3Utils.create(0, 0, 0);
    this.angularVelocity = Vector3Utils.create(0, 0, 0);
    
    // State properties
    this.isOnGround = false;
    this.isMoving = false;
    this.isInFlight = false;
    this.lastGroundContact = 0;
    
    // Bounce tracking
    this.bounceCount = 0;
    this.lastBounceVelocity = 0;
    this.isSettling = false;
    
    this.rotationAccumulator = Vector3Utils.create(0, 0, 0);
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('Basketball already initialized');
      return;
    }

    if (!this.scene) {
      console.error('Scene required for Basketball initialization');
      return;
    }

    this.position = Vector3Utils.create(
      BASKETBALL.INITIAL_X, 
      BASKETBALL.INITIAL_Y, 
      BASKETBALL.INITIAL_Z
    );

    this.createBasketball();
    this.isInitialized = true;
  }

  createBasketball() {
    try {
      const basketballGeometry = new THREE.SphereGeometry(BASKETBALL.RADIUS, 32, 16);

      // Load textures for realistic basketball
      const textureLoader = new THREE.TextureLoader();
      const leatherAlbedo = textureLoader.load('src/textures/brown-leather_albedo.png');
      const leatherNormal = textureLoader.load('src/textures/brown-leather_normal-ogl.png');
      const leatherAO = textureLoader.load('src/textures/brown-leather_ao.png');

      const basketballMaterial = new THREE.MeshPhongMaterial({
        map: leatherAlbedo,
        normalMap: leatherNormal,
        aoMap: leatherAO,
        color: 0xff6600,
        emissive: 0x221100,
        shininess: 5
      });

      this.basketballMesh = new THREE.Mesh(basketballGeometry, basketballMaterial);
      this.basketballMesh.position.set(this.position.x, this.position.y, this.position.z);
      this.basketballMesh.castShadow = true;
      this.basketballMesh.receiveShadow = true;
      this.basketballMesh.name = 'basketball';

      this.createBasketballRings();
      this.scene.add(this.basketballMesh);
      
    } catch (error) {
      console.error('Error creating basketball:', error);
      throw error;
    }
  }

  createBasketballRings() {
    const ballRingGeometry = new THREE.CylinderGeometry(
      BASKETBALL.RADIUS + 0.002,
      BASKETBALL.RADIUS + 0.002, 
      0.02, 
      32, 
      1, 
      true
    );
    const ballRingMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

    const ringRotations = [0, Math.PI / 3, 2 * Math.PI / 3];
    
    ringRotations.forEach((rotation, index) => {
      const ballRing = new THREE.Mesh(ballRingGeometry, ballRingMaterial);
      ballRing.rotation.z = rotation;
      ballRing.name = `basketball-ring-${index}`;
      
      this.basketballMesh.add(ballRing);
      this.ballRings.push(ballRing);
    });
  }

  update(deltaTime) {
    if (!this.isInitialized || !this.basketballMesh) return;

    this.updatePosition(deltaTime);
    this.updateRotation(deltaTime);
    
    this.basketballMesh.position.set(this.position.x, this.position.y, this.position.z);
    this.updateStateFlags();
  }

  updatePosition(deltaTime) {
    const velocityDelta = Vector3Utils.multiplyScalar(this.velocity, deltaTime);
    this.position = Vector3Utils.add(this.position, velocityDelta);
  }

  updateRotation(deltaTime) {
    if (!this.basketballMesh) return;

    // Calculate rotation based on movement (rolling effect)
    const movementRotation = AnimationUtils.calculateBallRotation(this.velocity, deltaTime);
    
    this.angularVelocity = Vector3Utils.add(this.angularVelocity, movementRotation);
    
    const rotationDelta = Vector3Utils.multiplyScalar(this.angularVelocity, deltaTime);
    this.rotationAccumulator = Vector3Utils.add(this.rotationAccumulator, rotationDelta);
    
    this.basketballMesh.rotation.x = this.rotationAccumulator.x;
    this.basketballMesh.rotation.y = this.rotationAccumulator.y;
    this.basketballMesh.rotation.z = this.rotationAccumulator.z;
    
    // Apply damping to angular velocity
    this.angularVelocity = Vector3Utils.multiplyScalar(
      this.angularVelocity, 
      Math.pow(0.98, deltaTime * 60)
    );
  }

  updateStateFlags() {
    const speed = Vector3Utils.magnitude(this.velocity);
    
    this.isMoving = speed > BASKETBALL.MIN_VELOCITY;
    
    // More precise ground detection - allow for bouncing
    const groundTolerance = 0.1;  // Increased tolerance for bouncing
    const groundLevel = PHYSICS.GROUND_Y + BASKETBALL.RADIUS;
    this.isOnGround = this.position.y <= (groundLevel + groundTolerance);
    
    // Only consider ball in flight if it's clearly above ground with significant velocity
    this.isInFlight = !this.isOnGround || Math.abs(this.velocity.y) > 0.5;
  }

  // Smooth movement with arrow keys
  move(direction, deltaTime) {
    if (!this.isInitialized) return;

    const moveSpeed = BASKETBALL.MOVE_SPEED;
    const movement = Vector3Utils.create(0, 0, 0);

    switch (direction) {
      case 'left':
        movement.x = -moveSpeed;
        break;
      case 'right':
        movement.x = moveSpeed;
        break;
      case 'forward':
        movement.z = -moveSpeed;
        break;
      case 'backward':
        movement.z = moveSpeed;
        break;
    }

    if (this.isOnGround) {
      const movementDelta = Vector3Utils.multiplyScalar(movement, deltaTime);
      this.position = Vector3Utils.add(this.position, movementDelta);
      
      this.clampToCourt();
      this.addRollingRotation(movement, deltaTime);
    }
  }

  clampToCourt() {
    this.position.x = Math.max(COURT.BOUNDARY_MIN_X, 
                      Math.min(COURT.BOUNDARY_MAX_X, this.position.x));
    this.position.z = Math.max(COURT.BOUNDARY_MIN_Z, 
                      Math.min(COURT.BOUNDARY_MAX_Z, this.position.z));
  }

  addRollingRotation(movement, deltaTime) {
    const rotationAmount = Vector3Utils.magnitude(movement) * 
                          BASKETBALL.ROTATION_SPEED_MULTIPLIER * deltaTime;
    
    if (rotationAmount > 0) {
      const rotationAxis = Vector3Utils.normalize({
        x: -movement.z,
        y: 0,
        z: movement.x
      });
      
      const rotationDelta = Vector3Utils.multiplyScalar(rotationAxis, rotationAmount);
      this.angularVelocity = Vector3Utils.add(this.angularVelocity, rotationDelta);
    }
  }

  setVelocity(newVelocity) {
    this.velocity = Vector3Utils.copy(newVelocity);
    this.isInFlight = true;
  }

  addVelocity(additionalVelocity) {
    this.velocity = Vector3Utils.add(this.velocity, additionalVelocity);
  }

  // Apply bounce with energy loss
  bounce(normal, dampingFactor = BASKETBALL.BOUNCE_DAMPING) {
    const dotProduct = Vector3Utils.dot(this.velocity, normal);
    const reflection = Vector3Utils.subtract(this.velocity, 
      Vector3Utils.multiplyScalar(normal, 2 * dotProduct));
    
    this.velocity = Vector3Utils.multiplyScalar(reflection, dampingFactor);
    
    // Add random rotation for realistic bouncing
    this.angularVelocity = Vector3Utils.add(this.angularVelocity, {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2
    });
    
    this.lastGroundContact = Date.now();
  }

  stop() {
    this.velocity = Vector3Utils.create(0, 0, 0);
    this.angularVelocity = Vector3Utils.create(0, 0, 0);
    this.isInFlight = false;
  }

  reset() {
    this.position = Vector3Utils.create(
      BASKETBALL.INITIAL_X, 
      BASKETBALL.INITIAL_Y, 
      BASKETBALL.INITIAL_Z
    );
    this.stop();
    this.rotationAccumulator = Vector3Utils.create(0, 0, 0);
    
    // Reset bounce tracking
    this.bounceCount = 0;
    this.lastBounceVelocity = 0;
    this.isSettling = false;
    
    if (this.basketballMesh) {
      this.basketballMesh.position.set(this.position.x, this.position.y, this.position.z);
      this.basketballMesh.rotation.set(0, 0, 0);
    }
  }

  // Bounce tracking methods
  incrementBounceCount() {
    this.bounceCount++;
  }

  getBounceCount() {
    return this.bounceCount;
  }

  resetBounceCount() {
    this.bounceCount = 0;
    this.isSettling = false;
  }

  setSettling(settling) {
    this.isSettling = settling;
  }

  isSettlingDown() {
    return this.isSettling;
  }

  setPosition(newPosition) {
    this.position = Vector3Utils.copy(newPosition);
    
    if (this.basketballMesh) {
      this.basketballMesh.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  getPosition() {
    if (!this.isInitialized || !this.position) {
      return { x: 0, y: 2, z: 0 };
    }
    return Vector3Utils.copy(this.position);
  }

  getVelocity() {
    return Vector3Utils.copy(this.velocity);
  }

  getRadius() {
    return BASKETBALL.RADIUS;
  }

  getMesh() {
    return this.basketballMesh;
  }

  isMovingSignificantly() {
    return Vector3Utils.magnitude(this.velocity) > BASKETBALL.MIN_VELOCITY;
  }

  isBasketballOnGround() {
    return this.isOnGround;
  }

  isBasketballInFlight() {
    return this.isInFlight;
  }

  getTimeSinceGroundContact() {
    return Date.now() - this.lastGroundContact;
  }

  setVisibility(visible) {
    if (this.basketballMesh) {
      this.basketballMesh.visible = visible;
    }
  }

  getBasketballInfo() {
    return {
      position: this.getPosition(),
      velocity: this.getVelocity(),
      angularVelocity: Vector3Utils.copy(this.angularVelocity),
      isOnGround: this.isOnGround,
      isMoving: this.isMoving,
      isInFlight: this.isInFlight,
      speed: Vector3Utils.magnitude(this.velocity),
      timeSinceGroundContact: this.getTimeSinceGroundContact()
    };
  }

  dispose() {
    if (this.basketballMesh) {
      this.scene.remove(this.basketballMesh);
      
      if (this.basketballMesh.geometry) {
        this.basketballMesh.geometry.dispose();
      }
      if (this.basketballMesh.material) {
        this.basketballMesh.material.dispose();
      }
      
      this.ballRings.forEach(ring => {
        if (ring.geometry) ring.geometry.dispose();
        if (ring.material) ring.material.dispose();
      });
      
      this.basketballMesh = null;
    }
    
    this.ballRings = [];
    this.scene = null;
    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && this.basketballMesh !== null;
  }
}