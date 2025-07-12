import { HOOPS } from '../utils/Constants.js';

export class BasketRenderer {
  constructor(scene) {
    this.scene = scene;
    this.basketObjects = [];
    this.scoreboardObjects = [];
    this.hoopData = { left: null, right: null };
    
    this.scoreboardDisplays = {
      left: { made: null, attempts: null },
      right: { made: null, attempts: null }
    };
    this.scoreManager = null;
    
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('BasketRenderer already initialized');
      return;
    }

    if (!this.scene) {
      console.error('Scene required for BasketRenderer initialization');
      return;
    }

    this.createBaskets();
    this.createScoreboards();
    this.isInitialized = true;
  }

  createBaskets() {
    this.hoopData.left = this.createSingleBasket(HOOPS.LEFT_HOOP_X, HOOPS.HOOP_Y, HOOPS.HOOP_Z, 'left');
    this.hoopData.right = this.createSingleBasket(HOOPS.RIGHT_HOOP_X, HOOPS.HOOP_Y, HOOPS.HOOP_Z, 'right');
  }

  createSingleBasket(baseX, baseY, baseZ, side) {
    const basketGroup = new THREE.Group();
    basketGroup.position.set(baseX, baseY, baseZ);
    basketGroup.name = `${side}-basket-group`;
    
    const direction = baseX > 0 ? 1 : -1;
    
    const basketComponents = {
      base: this.createBasketBase(basketGroup, direction),
      pole: this.createBasketPole(basketGroup, direction),
      connectors: this.createBasketConnectors(basketGroup, direction),
      board: this.createBasketBoard(basketGroup, direction),
      boardMarkings: this.createBoardMarkings(basketGroup, direction),
      rim: this.createBasketRim(basketGroup, direction),
      rimConnector: this.createRimConnector(basketGroup, direction),
      rimSupports: this.createRimSupports(basketGroup, direction),
      net: this.createBasketNet(basketGroup, direction)
    };

    this.addBasketObject(basketGroup);
    
    const rimPosition = {
      x: baseX + (-3.1 * direction),
      y: 4.3,
      z: 0
    };

    return {
      group: basketGroup,
      components: basketComponents,
      rimPosition: rimPosition,
      side: side,
      direction: direction
    };
  }

  createBasketBase(basketGroup, direction) {
    const basketBaseGeometry = new THREE.BoxGeometry(2, 0.5, 2);
    const basketBaseMaterial = new THREE.MeshPhongMaterial({color: 0x044ca4, shininess: 100});
    const basketBase = new THREE.Mesh(basketBaseGeometry, basketBaseMaterial);
    basketBase.position.set(0, 0.25, 0);
    basketBase.castShadow = true;
    basketBase.name = 'basket-base';
    basketGroup.add(basketBase);
    return basketBase;
  }

  createBasketPole(basketGroup, direction) {
    const basketPoleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4.7, 32);
    const basketPoleMaterial = new THREE.MeshPhongMaterial({color: 0x044ca4, shininess: 100});
    const basketPole = new THREE.Mesh(basketPoleGeometry, basketPoleMaterial);
    basketPole.position.set(0, 2.85, 0);
    basketPole.castShadow = true;
    basketPole.name = 'basket-pole';
    basketGroup.add(basketPole);
    return basketPole;
  }

  createBasketConnectors(basketGroup, direction) {
    const basketConnectorGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 32);
    const basketConnectorMaterial = new THREE.MeshPhongMaterial({color: 0x044ca4, shininess: 100});
    
    const basketConnectorHorizontal = new THREE.Mesh(basketConnectorGeometry, basketConnectorMaterial);
    basketConnectorHorizontal.position.set(-0.8 * direction, 5.0, 0);
    basketConnectorHorizontal.rotation.z = Math.PI / 2 * direction;
    basketConnectorHorizontal.castShadow = true;
    basketConnectorHorizontal.name = 'horizontal-connector';
    basketGroup.add(basketConnectorHorizontal);

    const basketConnectorDiagonal = new THREE.Mesh(basketConnectorGeometry, basketConnectorMaterial);
    basketConnectorDiagonal.position.set(-0.8 * direction, 4.3, 0);
    basketConnectorDiagonal.rotation.z = Math.PI / 4 * direction;
    basketConnectorDiagonal.castShadow = true;
    basketConnectorDiagonal.name = 'diagonal-connector';
    basketGroup.add(basketConnectorDiagonal);

    const boardConnectorGeometry = new THREE.BoxGeometry(0.3, 1, 1);
    const boardConnectorMaterial = new THREE.MeshPhongMaterial({color: 0x044ca4, shininess: 100});
    const boardConnector = new THREE.Mesh(boardConnectorGeometry, boardConnectorMaterial);
    boardConnector.position.set(-1.9 * direction, 5.0, 0);
    boardConnector.castShadow = true;
    boardConnector.name = 'board-connector';
    basketGroup.add(boardConnector);

    return {
      horizontal: basketConnectorHorizontal,
      diagonal: basketConnectorDiagonal,
      board: boardConnector
    };
  }

  createBasketBoard(basketGroup, direction) {
    const basketBoardGeometry = new THREE.BoxGeometry(0.1, 3, 4);
    const basketBoardMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.40
    });
    const basketBoard = new THREE.Mesh(basketBoardGeometry, basketBoardMaterial);
    basketBoard.position.set(-2.1 * direction, 5.0, 0);
    basketBoard.castShadow = true;
    basketBoard.name = 'backboard';
    basketGroup.add(basketBoard);
    return basketBoard;
  }

  createBoardMarkings(basketGroup, direction) {
    const markings = [];

    // Small square markings
    const smallParallelMarkingGeometry = new THREE.BoxGeometry(0.1, 0.2, 1.1);
    const smallParallelMarkingMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    const smallMarkingPositions = [
      { y: 5.5, name: 'small-top' },
      { y: 4.5, name: 'small-bottom' }
    ];

    smallMarkingPositions.forEach(pos => {
      const marking = new THREE.Mesh(smallParallelMarkingGeometry, smallParallelMarkingMaterial);
      marking.position.set(-2.1 * direction, pos.y, 0);
      marking.name = pos.name;
      basketGroup.add(marking);
      markings.push(marking);
    });

    const smallPerpMarkingGeometry = new THREE.BoxGeometry(0.1, 1.1, 0.2);
    const smallPerpMarkingMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    const smallPerpPositions = [
      { z: 0.5, name: 'small-left' },
      { z: -0.5, name: 'small-right' }
    ];

    smallPerpPositions.forEach(pos => {
      const marking = new THREE.Mesh(smallPerpMarkingGeometry, smallPerpMarkingMaterial);
      marking.position.set(-2.1 * direction, 5.0, pos.z);
      marking.name = pos.name;
      basketGroup.add(marking);
      markings.push(marking);
    });

    // Large square markings
    const bigParallelMarkingGeometry = new THREE.BoxGeometry(0.1, 0.2, 4.1);
    const bigParallelMarkingMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    const bigMarkingPositions = [
      { y: 6.5, name: 'big-top' },
      { y: 3.5, name: 'big-bottom' }
    ];

    bigMarkingPositions.forEach(pos => {
      const marking = new THREE.Mesh(bigParallelMarkingGeometry, bigParallelMarkingMaterial);
      marking.position.set(-2.1 * direction, pos.y, 0);
      marking.name = pos.name;
      basketGroup.add(marking);
      markings.push(marking);
    });

    const bigPerpMarkingGeometry = new THREE.BoxGeometry(0.1, 3.1, 0.2);
    const bigPerpMarkingMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    const bigPerpPositions = [
      { z: 2, name: 'big-left' },
      { z: -2, name: 'big-right' }
    ];

    bigPerpPositions.forEach(pos => {
      const marking = new THREE.Mesh(bigPerpMarkingGeometry, bigPerpMarkingMaterial);
      marking.position.set(-2.1 * direction, 5.0, pos.z);
      marking.name = pos.name;
      basketGroup.add(marking);
      markings.push(marking);
    });

    return markings;
  }

  createBasketRim(basketGroup, direction) {
    const rimGeometry = new THREE.TorusGeometry(HOOPS.RIM_RADIUS, HOOPS.RIM_THICKNESS, 16, 100);
    const rimMaterial = new THREE.MeshPhongMaterial({color: 0xff8f19, shininess: 100});
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.set(-3.1 * direction, HOOPS.RIM_HEIGHT, 0);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    rim.name = 'rim';
    basketGroup.add(rim);
    return rim;
  }

  createRimConnector(basketGroup, direction) {
    const rimConnectorGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.8);
    const rimConnectorMaterial = new THREE.MeshPhongMaterial({color: 0xff8f19, shininess: 100});
    const rimConnector = new THREE.Mesh(rimConnectorGeometry, rimConnectorMaterial);
    rimConnector.position.set(-2.2 * direction, 4.1, 0);
    rimConnector.castShadow = true;
    rimConnector.name = 'rim-connector';
    basketGroup.add(rimConnector);
    return rimConnector;
  }

  createRimSupports(basketGroup, direction) {
    const rimSupportGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 32);
    const rimSupportMaterial = new THREE.MeshPhongMaterial({color: 0xff8f19, shininess: 100});

    const supports = [];
    const supportPositions = [
      { z: 0.5, rotation: Math.PI / 8, name: 'support-1' },
      { z: -0.5, rotation: -Math.PI / 8, name: 'support-2' }
    ];

    supportPositions.forEach(pos => {
      const support = new THREE.Mesh(rimSupportGeometry, rimSupportMaterial);
      support.position.set(-2.5 * direction, 4.0, pos.z);
      support.rotation.z = Math.PI / 3 * direction;
      support.rotation.y = pos.rotation;
      support.castShadow = true;
      support.name = pos.name;
      basketGroup.add(support);
      supports.push(support);
    });

    return supports;
  }

  createBasketNet(basketGroup, direction) {
    const netGeometry = new THREE.CylinderGeometry(HOOPS.RIM_RADIUS, 0.5, 1.2, 16, 1, true);
    const netMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
    const net = new THREE.Mesh(netGeometry, netMaterial);
    net.position.set(-3.1 * direction, 3.6, 0);
    net.name = 'net';
    basketGroup.add(net);
    return net;
  }

  createScoreboards() {
    this.createSingleScoreboard(19, 0, 0, 'right');
    this.createSingleScoreboard(-19, 0, 0, 'left');
  }

  createSingleScoreboard(baseX, baseY, baseZ, side) {
    const scoreboardGroup = new THREE.Group();
    scoreboardGroup.position.set(baseX, baseY, baseZ);
    scoreboardGroup.name = `${side}-scoreboard-group`;

    scoreboardGroup.rotation.y = Math.PI / 2;
    
    const direction = baseX > 0 ? 1 : -1;
    
    this.createScoreboardBase(scoreboardGroup);
    this.createScoreboardPoles(scoreboardGroup);
    this.createScoreboardSupport(scoreboardGroup);
    this.createScoreboardConnectors(scoreboardGroup, direction);
    this.createScoreboardBody(scoreboardGroup, direction);
    this.createScoreboardSections(scoreboardGroup, direction);
    this.createScoreboardDisplays(scoreboardGroup, direction);
    this.createScoreboardAccents(scoreboardGroup, direction);
    this.createScoreboardLEDs(scoreboardGroup, direction);
    this.createScoreboardBrackets(scoreboardGroup, direction);

    this.addScoreboardObject(scoreboardGroup);
    
    return scoreboardGroup;
  }

  createScoreboardBase(scoreboardGroup) {
    const scoreboardBaseGeometry = new THREE.BoxGeometry(3, 0.6, 3);
    const scoreboardBaseMaterial = new THREE.MeshPhongMaterial({color: 0x333333, shininess: 80});
    const scoreboardBase = new THREE.Mesh(scoreboardBaseGeometry, scoreboardBaseMaterial);
    scoreboardBase.position.set(0, 0.3, 0);
    scoreboardBase.castShadow = true;
    scoreboardBase.name = 'scoreboard-base';
    scoreboardGroup.add(scoreboardBase);
  }

  createScoreboardPoles(scoreboardGroup) {
    const poleGeometry = new THREE.CylinderGeometry(0.25, 0.25, 8, 32);
    const poleMaterial = new THREE.MeshPhongMaterial({color: 0x444444, shininess: 100});
    
    const polePositions = [
      { x: -0.8, name: 'left-pole' },
      { x: 0.8, name: 'right-pole' }
    ];

    polePositions.forEach(pos => {
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(pos.x, 4.3, 0);
      pole.castShadow = true;
      pole.name = pos.name;
      scoreboardGroup.add(pole);
    });
  }

  createScoreboardSupport(scoreboardGroup) {
    const horizontalSupportGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.8, 16);
    const horizontalSupportMaterial = new THREE.MeshPhongMaterial({color: 0x444444, shininess: 100});
    const horizontalSupport = new THREE.Mesh(horizontalSupportGeometry, horizontalSupportMaterial);
    horizontalSupport.position.set(0, 6, 0);
    horizontalSupport.rotation.z = Math.PI / 2;
    horizontalSupport.castShadow = true;
    horizontalSupport.name = 'horizontal-support';
    scoreboardGroup.add(horizontalSupport);
  }

  createScoreboardConnectors(scoreboardGroup, direction) {
    const connectorGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const connectorMaterial = new THREE.MeshPhongMaterial({color: 0x555555, shininess: 100});
    
    const connectorPositions = [
      { x: -0.8, name: 'left-connector' },
      { x: 0.8, name: 'right-connector' }
    ];

    connectorPositions.forEach(pos => {
      const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
      connector.position.set(pos.x, 7.8, -0.5 * direction);
      connector.castShadow = true;
      connector.name = pos.name;
      scoreboardGroup.add(connector);
    });
  }

  createScoreboardBody(scoreboardGroup, direction) {
    const scoreboardBodyGeometry = new THREE.BoxGeometry(4, 2.5, 0.3);
    const scoreboardBodyMaterial = new THREE.MeshPhongMaterial({color: 0x1a1a1a, shininess: 50});
    const scoreboardBody = new THREE.Mesh(scoreboardBodyGeometry, scoreboardBodyMaterial);
    scoreboardBody.position.set(0, 8, -0.8 * direction);
    scoreboardBody.castShadow = true;
    scoreboardBody.name = 'scoreboard-body';
    scoreboardGroup.add(scoreboardBody);
  }

  createScoreboardSections(scoreboardGroup, direction) {
    const redSectionGeometry = new THREE.BoxGeometry(1.8, 2.2, 0.31);
    const redSectionMaterial = new THREE.MeshPhongMaterial({color: 0xcc0000, shininess: 80});
    const redSection = new THREE.Mesh(redSectionGeometry, redSectionMaterial);
    redSection.position.set(-1, 8, -0.82 * direction);
    redSection.name = 'red-section';
    scoreboardGroup.add(redSection);

    const blueSectionGeometry = new THREE.BoxGeometry(1.8, 2.2, 0.31);
    const blueSectionMaterial = new THREE.MeshPhongMaterial({color: 0x0066cc, shininess: 80});
    const blueSection = new THREE.Mesh(blueSectionGeometry, blueSectionMaterial);
    blueSection.position.set(1, 8, -0.82 * direction);
    blueSection.name = 'blue-section';
    scoreboardGroup.add(blueSection);

    const dividerGeometry = new THREE.BoxGeometry(0.1, 2.2, 0.32);
    const dividerMaterial = new THREE.MeshPhongMaterial({color: 0xffffff, shininess: 100});
    const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
    divider.position.set(0, 8, -0.82 * direction);
    divider.name = 'center-divider';
    scoreboardGroup.add(divider);
  }

  createScoreboardDisplays(scoreboardGroup, direction) {
    const scoreDisplayGeometry = new THREE.BoxGeometry(1.4, 1.6, 0.32);
    
    const displayPositions = [
      { x: -1, name: 'red-display' },
      { x: 1, name: 'blue-display' }
    ];

    displayPositions.forEach(pos => {
      const scoreDisplayMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: false
      });
      
      const display = new THREE.Mesh(scoreDisplayGeometry, scoreDisplayMaterial);
      display.position.set(pos.x, 8, -0.83 * direction);
      display.name = pos.name;
      scoreboardGroup.add(display);
    });

    // Team color plates
    const colorPlateGeometry = new THREE.BoxGeometry(1.6, 0.4, 0.32);
    const redColorPlateMaterial = new THREE.MeshPhongMaterial({color: 0x880000, shininess: 100});
    const blueColorPlateMaterial = new THREE.MeshPhongMaterial({color: 0x004488, shininess: 100});
    
    const redColorPlate = new THREE.Mesh(colorPlateGeometry, redColorPlateMaterial);
    redColorPlate.position.set(-1, 9, -0.83 * direction);
    redColorPlate.name = 'red-color-plate';
    scoreboardGroup.add(redColorPlate);
    
    const blueColorPlate = new THREE.Mesh(colorPlateGeometry, blueColorPlateMaterial);
    blueColorPlate.position.set(1, 9, -0.83 * direction);
    blueColorPlate.name = 'blue-color-plate';
    scoreboardGroup.add(blueColorPlate);
  }

  createScoreboardAccents(scoreboardGroup, direction) {
    const accentGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.33);
    const accentMaterial = new THREE.MeshPhongMaterial({color: 0xffd700, shininess: 120});
    
    const positions = [
      [-1.9, 9.15], [1.9, 9.15],
      [-1.9, 6.85], [1.9, 6.85]
    ];
    
    positions.forEach(([x, y], index) => {
      const accent = new THREE.Mesh(accentGeometry, accentMaterial);
      accent.position.set(x, y, -0.84 * direction);
      accent.name = `accent-${index}`;
      scoreboardGroup.add(accent);
    });
  }

  createScoreboardLEDs(scoreboardGroup, direction) {
    const ledStripMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff, 
      emissive: 0x004444, 
      shininess: 150
    });
    
    const topLEDGeometry = new THREE.BoxGeometry(4.2, 0.1, 0.33);
    const topLED = new THREE.Mesh(topLEDGeometry, ledStripMaterial);
    topLED.position.set(0, 9.3, -0.84 * direction);
    topLED.name = 'top-led';
    scoreboardGroup.add(topLED);
    
    const bottomLED = new THREE.Mesh(topLEDGeometry, ledStripMaterial);
    bottomLED.position.set(0, 6.7, -0.84 * direction);
    bottomLED.name = 'bottom-led';
    scoreboardGroup.add(bottomLED);
  }

  createScoreboardBrackets(scoreboardGroup, direction) {
    const bracketGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.4);
    const bracketMaterial = new THREE.MeshPhongMaterial({color: 0x666666, shininess: 80});
    
    const bracketPositions = [
      { x: -0.8, name: 'left-bracket' },
      { x: 0.8, name: 'right-bracket' }
    ];

    bracketPositions.forEach(pos => {
      const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
      bracket.position.set(pos.x, 7.8, -0.3 * direction);
      bracket.castShadow = true;
      bracket.name = pos.name;
      scoreboardGroup.add(bracket);
    });
  }

  addBasketObject(object) {
    this.scene.add(object);
    this.basketObjects.push(object);
  }

  addScoreboardObject(object) {
    this.scene.add(object);
    this.scoreboardObjects.push(object);
  }

  getHoopData(side) {
    return this.hoopData[side];
  }

  getRimPosition(side) {
    const hoopData = this.hoopData[side];
    return hoopData ? hoopData.rimPosition : null;
  }

  getAllRimPositions() {
    return {
      left: this.getRimPosition('left'),
      right: this.getRimPosition('right')
    };
  }

  removeAllObjects() {
    [...this.basketObjects, ...this.scoreboardObjects].forEach(object => {
      this.scene.remove(object);
      
      object.traverse(child => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    this.basketObjects = [];
    this.scoreboardObjects = [];
  }

  dispose() {
    this.removeAllObjects();
    this.scene = null;
    this.hoopData = { left: null, right: null };
    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && 
           this.scene !== null && 
           this.hoopData.left !== null && 
           this.hoopData.right !== null;
  }

  getBasketStats() {
    return {
      basketCount: this.basketObjects.length,
      scoreboardCount: this.scoreboardObjects.length,
      leftRimPosition: this.getRimPosition('left'),
      rightRimPosition: this.getRimPosition('right'),
      isInitialized: this.isInitialized
    };
  }

  initializeScoreboardDisplays(scoreManager) {
    this.scoreManager = scoreManager;
    
    this.scoreboardDisplays.left.made = this.findScoreboardDisplay('left', 'red-display');
    this.scoreboardDisplays.left.attempts = this.findScoreboardDisplay('left', 'blue-display');
    this.scoreboardDisplays.right.made = this.findScoreboardDisplay('right', 'red-display');
    this.scoreboardDisplays.right.attempts = this.findScoreboardDisplay('right', 'blue-display');
    
    this.updateScoreboardDisplays();
  }

  findScoreboardDisplay(side, displayName) {
    for (const scoreboardObj of this.scoreboardObjects) {
      if (scoreboardObj.name.includes(side)) {
        let foundDisplay = null;
        scoreboardObj.traverse((child) => {
          if (child.name === displayName) {
            foundDisplay = child;
          }
        });
        if (foundDisplay) return foundDisplay;
      }
    }
    console.warn(`Could not find scoreboard display: ${side} ${displayName}`);
    return null;
  }

  updateScoreboardDisplays() {
    if (!this.scoreManager) {
      console.warn('No scoreManager available for scoreboard update');
      return;
    }
    
    const shotsMade = this.scoreManager.getShotsMade();
    const shotAttempts = this.scoreManager.getShotAttempts();
    
    // Update both scoreboards with made shots
    this.updateSingleDisplay(this.scoreboardDisplays.left.made, shotsMade, 'MADE');
    this.updateSingleDisplay(this.scoreboardDisplays.right.made, shotsMade, 'MADE');
    
    // Update both scoreboards with total attempts
    this.updateSingleDisplay(this.scoreboardDisplays.left.attempts, shotAttempts, 'ATTEMPTS');
    this.updateSingleDisplay(this.scoreboardDisplays.right.attempts, shotAttempts, 'ATTEMPTS');
  }

  updateSingleDisplay(displayObject, number, label) {
    if (!displayObject) {
      console.warn('Display object is null, cannot update');
      return;
    }
    
    // Create canvas for the number display
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = 512;
    canvas.height = 512;
    
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the number
    context.fillStyle = '#00FF00';
    context.font = 'bold 280px Arial'; 
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    const numberText = number.toString().padStart(2, '0');
    context.fillText(numberText, canvas.width / 2, canvas.height / 2 - 80);
    
    // Draw label
    context.fillStyle = '#FFFFFF';
    context.font = 'bold 72px Arial';
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 160);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    const newMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
      side: THREE.DoubleSide
    });
    
    displayObject.material = newMaterial;
  }
}