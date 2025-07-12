export const COURT = {
  WIDTH: 30,
  LENGTH: 15,
  HEIGHT: 0.2,
  
  OOB_WIDTH: 42,
  OOB_LENGTH: 21,
  
  BOUNDARY_MIN_X: -14.5,
  BOUNDARY_MAX_X: 14.5,
  BOUNDARY_MIN_Z: -7,
  BOUNDARY_MAX_Z: 7,
  
  CENTER_X: 0,
  CENTER_Y: 0,
  CENTER_Z: 0
};

export const BASKETBALL = {
  RADIUS: 0.5,
  MASS: 0.6,
  INITIAL_X: 0,
  INITIAL_Y: 0.65,  // Just slightly above ground (0.15 + 0.5 radius = 0.65)
  INITIAL_Z: 0,
  MOVE_SPEED: 4.0,
  ROTATION_SPEED_MULTIPLIER: 2.0,
  BOUNCE_DAMPING: 0.6,
  AIR_RESISTANCE: 0.99,
  ROLLING_FRICTION: 0.92,
  MIN_VELOCITY: 0.01,
  MIN_BOUNCE_VELOCITY: 0.3,
  
  // Bouncing mechanics
  COEFFICIENT_OF_RESTITUTION: 0.7,  // Energy retained after bounce (0-1)
  MIN_BOUNCE_HEIGHT: 0.05,          // Stop bouncing below this velocity (was 0.15)
  BOUNCE_ENERGY_LOSS: 0.95,         // Additional energy loss per bounce
  MAX_BOUNCES: 8,                   // Stop after this many bounces
  SETTLE_THRESHOLD: 0.02            // Ball considered settled below this velocity (was 0.05)
};

export const PHYSICS = {
  GRAVITY: -9.8,
  SCALED_GRAVITY: -25.0,
  TIME_STEP: 1/60,
  MAX_TIME_STEP: 1/30,
  GROUND_Y: 0.15,
  VELOCITY_SCALE: 1.0,
  COLLISION_MARGIN: 0.01
};

export const HOOPS = {
  LEFT_HOOP_X: -16.1,
  RIGHT_HOOP_X: 16.1,
  HOOP_Y: 0,
  HOOP_Z: 0,
  
  RIM_RADIUS: 0.7,
  RIM_HEIGHT: 4.3,
  RIM_THICKNESS: 0.1,
  
  LEFT_RIM_X: -16.1 + (-3.1),
  RIGHT_RIM_X: 16.1 + (-3.1),
  RIM_Y: 4.3,
  RIM_Z: 0,
  
  SCORE_DETECTION_RADIUS: 0.6,
  SCORE_DETECTION_HEIGHT: 0.5,
  MIN_DOWNWARD_VELOCITY: -0.1,
  
  SHOT_ARC_HEIGHT_MIN: 3.0,
  SHOT_ARC_HEIGHT_MAX: 6.0
};

export const CONTROLS = {
  KEYS: {
    MOVE_LEFT: 'ArrowLeft',
    MOVE_RIGHT: 'ArrowRight',
    MOVE_FORWARD: 'ArrowUp',
    MOVE_BACKWARD: 'ArrowDown',
    
    POWER_UP: 'KeyW',
    POWER_DOWN: 'KeyS',
    
    SHOOT: 'Space',
    RESET: 'KeyR',
    
    TOGGLE_ORBIT: 'KeyO',
    TOGGLE_HOOP_CAM: 'KeyH'
  },
  
  POWER_MIN: 0,
  POWER_MAX: 100,
  POWER_DEFAULT: 50,
  POWER_INCREMENT: 2,
  
  POWER_TO_VELOCITY_SCALE: 3.0,
  
  MOVEMENT_SMOOTHING: 0.8,
  KEY_REPEAT_DELAY: 100
};

export const SCORING = {
  POINTS_PER_SHOT: 2,
  
  INITIAL_SCORE: 0,
  INITIAL_ATTEMPTS: 0,
  INITIAL_MADE: 0,
  
  FEEDBACK_DURATION: 2000,
  
  MESSAGES: {
    SHOT_MADE: "SHOT MADE!",
    MISSED_SHOT: "MISSED SHOT",
    RESET_BALL: "Ball Reset",
    POWER_CHANGED: "Power: "
  }
};

export const UI = {
  SCORE_PANEL: {
    BOTTOM: '250px',
    LEFT: '20px',
    WIDTH: '200px',
    FONT_SIZE: '16px'
  },
  
  INSTRUCTIONS_PANEL: {
    BOTTOM: '20px',
    LEFT: '20px',
    WIDTH: '200px',
    FONT_SIZE: '16px'
  },
  
  POWER_INDICATOR: {
    BOTTOM: '480px',
    LEFT: '20px',
    WIDTH: '200px',
    HEIGHT: '30px'
  },
  
  FEEDBACK_MESSAGE: {
    TOP: '50%',
    LEFT: '50%',
    FONT_SIZE: '48px',
    DURATION: 2000
  },
  
  COLORS: {
    BACKGROUND: 'rgba(0, 0, 0, 0.7)',
    TEXT: 'white',
    BORDER: 'white',
    POWER_BAR: '#00ff00',
    POWER_BAR_BG: '#333333',
    SUCCESS: '#00ff00',
    FAILURE: '#ff0000'
  }
};

export const ANIMATION = {
  ROTATION_DAMPING: 0.98,
  MIN_ROTATION_SPEED: 0.01,
  
  FEEDBACK_FADE_SPEED: 0.02,
  POWER_BAR_ANIMATION_SPEED: 0.1,
  
  POSITION_LERP_FACTOR: 0.1,
  ROTATION_LERP_FACTOR: 0.15
};

export const DEBUG = {
  SHOW_COLLISION_HELPERS: false,
  SHOW_TRAJECTORY_LINE: false,
  LOG_PHYSICS_DATA: false,
  LOG_INPUT_EVENTS: false,
  
  SHOW_FPS: false,
  TARGET_FPS: 60
};

// Helper function to get nearest hoop position
export function getNearestHoop(ballX) {
  if (ballX < 0) {
    return {
      x: HOOPS.LEFT_RIM_X,
      y: HOOPS.RIM_Y,
      z: HOOPS.RIM_Z,
      side: 'left'
    };
  } else {
    return {
      x: HOOPS.RIGHT_RIM_X,
      y: HOOPS.RIM_Y,
      z: HOOPS.RIM_Z,
      side: 'right'
    };
  }
}

export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}