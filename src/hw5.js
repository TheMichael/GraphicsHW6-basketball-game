import { SceneManager } from './core/SceneManager.js';
import { CameraManager } from './core/CameraManager.js';
import { GameEngine } from './core/GameEngine.js';

import { Basketball } from './entities/Basketball.js';
import { CourtRenderer } from './entities/CourtRenderer.js';
import { BasketRenderer } from './entities/BasketRenderer.js';

import { PhysicsEngine } from './systems/PhysicsEngine.js';
import { InputController } from './systems/InputController.js';
import { CollisionDetector } from './systems/CollisionDetector.js';
import { AnimationController } from './systems/AnimationController.js';

import { GameStateManager } from './managers/GameStateManager.js';
import { ScoreManager } from './managers/ScoreManager.js';
import { UIManager } from './managers/UIManager.js';

// Global system variables
let gameEngine;
let sceneManager;
let cameraManager;
let courtRenderer;
let basketRenderer;
let basketball;
let physicsEngine;
let inputController;
let collisionDetector;
let animationController;
let gameStateManager;
let scoreManager;
let uiManager;

function showError(message) {
  console.error('Game Error:', message);
  
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed; top: 20px; left: 20px; right: 20px;
    background: #ff4444; color: white; padding: 15px;
    border-radius: 5px; font-family: Arial; z-index: 9999;
    font-size: 14px; max-width: 500px;
  `;
  errorDiv.innerHTML = `<strong>Game Error:</strong> ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv.parentNode) errorDiv.parentNode.removeChild(errorDiv);
  }, 5000);
}

async function initGame() {
  try {
    // Core systems
    sceneManager = new SceneManager();
    sceneManager.initialize();

    cameraManager = new CameraManager(sceneManager.getRenderer());
    cameraManager.initialize();

    // Court and entities
    courtRenderer = new CourtRenderer(sceneManager.getScene());
    courtRenderer.initialize();

    basketRenderer = new BasketRenderer(sceneManager.getScene());
    basketRenderer.initialize();

    basketball = new Basketball(sceneManager.getScene());
    basketball.initialize();

    // UI
    uiManager = new UIManager();
    uiManager.initialize();

    // Game systems
    scoreManager = new ScoreManager();
    scoreManager.initialize({ uiManager });

    // Initialize scoreboard displays after scoreManager exists
    basketRenderer.initializeScoreboardDisplays(scoreManager);

    physicsEngine = new PhysicsEngine();
    physicsEngine.initialize({ basketball });

    collisionDetector = new CollisionDetector();
    collisionDetector.initialize({
      basketball,
      basketRenderer,
      scoreManager
    });

    gameStateManager = new GameStateManager();
    gameStateManager.initialize({
      basketball,
      physicsEngine,
      scoreManager,
      uiManager,
      basketRenderer
    });

    // Link systems together
    collisionDetector.gameStateManager = gameStateManager;

    inputController = new InputController();
    inputController.initialize({
      basketball,
      cameraManager,
      gameStateManager,
      uiManager
    });

    animationController = new AnimationController();
    animationController.initialize({
      basketball,
      sceneManager,
      uiManager
    });

    // Game engine
    gameEngine = new GameEngine();
    gameEngine.initialize({
      sceneManager,
      cameraManager,
      basketball,
      inputController,
      physicsEngine,
      collisionDetector,
      gameStateManager,
      scoreManager,
      uiManager,
      animationController
    });

    gameEngine.start();
    
    // Set up debug access AFTER all systems are initialized
    window.basketballGame = {
      restart: () => gameEngine.restart(),
      getStats: () => ({
        engine: gameEngine.getEngineState(),
        physics: physicsEngine.getPhysicsStats(),
        score: scoreManager.getStatistics(),
        input: inputController.getInputState()
      }),
      systems: {
        gameEngine: gameEngine,
        sceneManager: sceneManager,
        basketball: basketball,
        inputController: inputController,
        physicsEngine: physicsEngine,
        gameStateManager: gameStateManager,
        scoreManager: scoreManager,
        uiManager: uiManager,
        animationController: animationController,
        collisionDetector: collisionDetector
      }
    };
    
    if (uiManager) {
      uiManager.showFeedback('Basketball Game Ready! Use Arrow Keys to Move', 'success', 4000);
    }

  } catch (error) {
    console.error('Game initialization failed:', error);
    showError(`Initialization failed: ${error.message}`);
  }
}

function handleResize() {
  if (cameraManager) cameraManager.handleResize();
  if (sceneManager && cameraManager) {
    sceneManager.handleResize(cameraManager.getActiveCamera());
  }
}

function cleanup() {
  if (gameEngine) gameEngine.dispose();
}

// Event listeners
window.addEventListener('resize', handleResize);
window.addEventListener('beforeunload', cleanup);

document.addEventListener('visibilitychange', () => {
  if (gameEngine) {
    if (document.hidden) {
      gameEngine.pause();
    } else {
      gameEngine.resume();
    }
  }
});

window.addEventListener('error', (event) => {
  showError(`JavaScript error: ${event.error?.message || 'Unknown error'}`);
});

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}