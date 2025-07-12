import { COURT } from '../utils/Constants.js';

export class CourtRenderer {
  constructor(scene) {
    this.scene = scene;
    this.courtObjects = [];
    this.textureLoader = new THREE.TextureLoader();
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('CourtRenderer already initialized');
      return;
    }

    if (!this.scene) {
      console.error('Scene required for CourtRenderer initialization');
      return;
    }

    this.createBasketballCourt();
    this.isInitialized = true;
  }

  createBasketballCourt() {
    this.createCourtFloor();
    this.createOutOfBoundsArea();
    this.createCourtLines();
  }

  createCourtFloor() {
    const courtGeometry = new THREE.BoxGeometry(COURT.WIDTH, COURT.HEIGHT, COURT.LENGTH);

    // Load wood textures for the court
    const baseColorMap = this.textureLoader.load('src/textures/oakfloor_basecolor.png');
    const normalMap = this.textureLoader.load('src/textures/oakfloor_normal.png');
    const aoMap = this.textureLoader.load('src/textures/oakfloor_AO.png');

    this.configureTextureWrapping(baseColorMap, normalMap, aoMap, 8, 4);

    const courtMaterial = new THREE.MeshPhongMaterial({
      map: baseColorMap,
      normalMap: normalMap,
      aoMap: aoMap,
      shininess: 50
    });

    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.receiveShadow = true;
    court.name = 'main-court';
    
    this.addCourtObject(court);
  }

  createOutOfBoundsArea() {
    const outOfBoundsGeometry = new THREE.BoxGeometry(COURT.OOB_WIDTH, 0.1, COURT.OOB_LENGTH);

    // Load mahogany textures for out of bounds
    const mahoganyBaseColorMap = this.textureLoader.load('src/textures/mahogfloor_basecolor.png');
    const mahoganyNormalMap = this.textureLoader.load('src/textures/mahogfloor_normal.png');
    const mahoganyAOMap = this.textureLoader.load('src/textures/mahogfloor_AO.png');

    this.configureTextureWrapping(mahoganyBaseColorMap, mahoganyNormalMap, mahoganyAOMap, 10, 5);

    const outOfBoundsMaterial = new THREE.MeshPhongMaterial({
      map: mahoganyBaseColorMap,
      normalMap: mahoganyNormalMap,
      aoMap: mahoganyAOMap,
      shininess: 50
    });

    const outOfBoundsCourt = new THREE.Mesh(outOfBoundsGeometry, outOfBoundsMaterial);
    outOfBoundsCourt.receiveShadow = true;
    outOfBoundsCourt.name = 'out-of-bounds';
    
    this.addCourtObject(outOfBoundsCourt);
  }

  createCourtLines() {
    this.createCenterLine();
    this.createCenterCircle();
    this.createThreePointArcs();
    this.createThreePointConnectors();
    this.createCourtBoundaryLines();
    this.createFreeThrowLines();
    this.createFreeThrowRectangles();
  }

  createCenterLine() {
    const centerLineGeometry = new THREE.BoxGeometry(0.2, 0.01, COURT.LENGTH);
    const centerLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
    centerLine.position.set(0, 0.1, 0);
    centerLine.name = 'center-line';
    
    this.addCourtObject(centerLine);
  }

  createCenterCircle() {
    const centerCircleGeometry = new THREE.RingGeometry(3.8, 4, 32);
    const centerCircleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, 
      side: THREE.DoubleSide
    });
    const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
    centerCircle.position.set(0, 0.12, 0);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.name = 'center-circle';
    
    this.addCourtObject(centerCircle);
  }

  createThreePointArcs() {
    const arcMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, 
      side: THREE.DoubleSide
    });

    // Left arc
    const leftArcGeometry = new THREE.RingGeometry(6, 6.2, 32, 0, 1.5 * Math.PI, Math.PI);
    const leftArc = new THREE.Mesh(leftArcGeometry, arcMaterial);
    leftArc.position.set(-13, 0.12, 0);
    leftArc.rotation.x = -Math.PI / 2;
    leftArc.name = 'left-three-point-arc';
    this.addCourtObject(leftArc);

    // Right arc
    const rightArcGeometry = new THREE.RingGeometry(6, 6.2, 32, 0, 0.5 * Math.PI, Math.PI);
    const rightArc = new THREE.Mesh(rightArcGeometry, arcMaterial);
    rightArc.position.set(13, 0.12, 0);
    rightArc.rotation.x = -Math.PI / 2;
    rightArc.name = 'right-three-point-arc';
    this.addCourtObject(rightArc);
  }

  createThreePointConnectors() {
    const connectiveLineGeometry = new THREE.BoxGeometry(2, 0, 0.2);
    const connectiveLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const connectorPositions = [
      { x: 14, z: 6.1, name: 'right-connector-top' },
      { x: 14, z: -6.1, name: 'right-connector-bottom' },
      { x: -14, z: 6.1, name: 'left-connector-top' },
      { x: -14, z: -6.1, name: 'left-connector-bottom' }
    ];

    connectorPositions.forEach(pos => {
      const connector = new THREE.Mesh(connectiveLineGeometry, connectiveLineMaterial);
      connector.position.set(pos.x, 0.11, pos.z);
      connector.name = pos.name;
      this.addCourtObject(connector);
    });
  }

  createCourtBoundaryLines() {
    const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Length lines
    const lengthLineGeometry = new THREE.BoxGeometry(0.2, 0.01, COURT.LENGTH);
    const positions = [
      { x: 15, name: 'right-boundary' },
      { x: -15, name: 'left-boundary' }
    ];

    positions.forEach(pos => {
      const line = new THREE.Mesh(lengthLineGeometry, whiteMaterial);
      line.position.set(pos.x, 0.1, 0);
      line.name = pos.name;
      this.addCourtObject(line);
    });

    // Width lines
    const widthLineGeometry = new THREE.BoxGeometry(COURT.WIDTH, 0.01, 0.2);
    const widthPositions = [
      { z: 7.5, name: 'top-boundary' },
      { z: -7.5, name: 'bottom-boundary' }
    ];

    widthPositions.forEach(pos => {
      const line = new THREE.Mesh(widthLineGeometry, whiteMaterial);
      line.position.set(0, 0.1, pos.z);
      line.name = pos.name;
      this.addCourtObject(line);
    });
  }

  createFreeThrowLines() {
    const freeThrowLineGeometry = new THREE.BoxGeometry(0.2, 0.01, 5);
    const freeThrowLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const freeThrowPositions = [
      { x: 10, name: 'right-free-throw-line' },
      { x: -10, name: 'left-free-throw-line' }
    ];

    freeThrowPositions.forEach(pos => {
      const line = new THREE.Mesh(freeThrowLineGeometry, freeThrowLineMaterial);
      line.position.set(pos.x, 0.1, 0);
      line.name = pos.name;
      this.addCourtObject(line);
    });
  }

  createFreeThrowRectangles() {
    const extraLineGeometry = new THREE.BoxGeometry(5, 0.01, 0.2);
    const extraLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const rectanglePositions = [
      // Right side
      { x: 12.5, z: 2.5, name: 'right-free-throw-top' },
      { x: 12.5, z: -2.5, name: 'right-free-throw-bottom' },
      // Left side
      { x: -12.5, z: 2.5, name: 'left-free-throw-top' },
      { x: -12.5, z: -2.5, name: 'left-free-throw-bottom' }
    ];

    rectanglePositions.forEach(pos => {
      const line = new THREE.Mesh(extraLineGeometry, extraLineMaterial);
      line.position.set(pos.x, 0.1, pos.z);
      line.name = pos.name;
      this.addCourtObject(line);
    });
  }

  configureTextureWrapping(baseColorMap, normalMap, aoMap, repeatX, repeatY) {
    const textures = [baseColorMap, normalMap, aoMap];
    
    textures.forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
    });
  }

  addCourtObject(object) {
    this.scene.add(object);
    this.courtObjects.push(object);
  }

  removeAllCourtObjects() {
    this.courtObjects.forEach(object => {
      this.scene.remove(object);
      
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
    
    this.courtObjects = [];
  }

  getCourtObject(name) {
    return this.courtObjects.find(object => object.name === name);
  }

  getAllCourtObjects() {
    return [...this.courtObjects];
  }

  setCourtVisibility(visible) {
    this.courtObjects.forEach(object => {
      object.visible = visible;
    });
  }

  // Collision detection helpers
  getCourtBounds() {
    return {
      minX: COURT.BOUNDARY_MIN_X,
      maxX: COURT.BOUNDARY_MAX_X,
      minZ: COURT.BOUNDARY_MIN_Z,
      maxZ: COURT.BOUNDARY_MAX_Z,
      groundY: COURT.HEIGHT / 2
    };
  }

  isPositionInBounds(position) {
    const bounds = this.getCourtBounds();
    return position.x >= bounds.minX && 
           position.x <= bounds.maxX && 
           position.z >= bounds.minZ && 
           position.z <= bounds.maxZ;
  }

  getCourtCenter() {
    return {
      x: COURT.CENTER_X,
      y: COURT.CENTER_Y + COURT.HEIGHT / 2,
      z: COURT.CENTER_Z
    };
  }

  dispose() {
    this.removeAllCourtObjects();
    this.scene = null;
    this.textureLoader = null;
    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && 
           this.scene !== null && 
           this.courtObjects.length > 0;
  }

  getCourtStats() {
    return {
      objectCount: this.courtObjects.length,
      width: COURT.WIDTH,
      length: COURT.LENGTH,
      height: COURT.HEIGHT,
      oobWidth: COURT.OOB_WIDTH,
      oobLength: COURT.OOB_LENGTH,
      isInitialized: this.isInitialized
    };
  }
}