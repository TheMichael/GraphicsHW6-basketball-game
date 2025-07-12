import { UI, CONTROLS, SCORING } from '../utils/Constants.js';

export class UIManager {
  constructor() {
    this.elements = {
      scorePanel: null,
      instructionsPanel: null,
      powerIndicator: null,
      powerBar: null,
      powerText: null,
      feedbackMessage: null
    };

    this.currentPower = CONTROLS.POWER_DEFAULT;
    this.isVisible = true;
    this.feedbackTimeout = null;

    this.scoreData = {
      score: 0,
      attempts: 0,
      made: 0,
      percentage: 0,
      streak: 0,
      bestStreak: 0
    };

    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('UIManager already initialized');
      return;
    }

    this.createScorePanel();
    this.createInstructionsPanel();
    this.createPowerIndicator();
    this.createFeedbackMessage();

    this.updatePowerDisplay(this.currentPower);
    this.updateScoreDisplay(this.scoreData);

    this.isInitialized = true;
  }

  createScorePanel() {
    this.elements.scorePanel = document.createElement('div');
    this.styleElement(this.elements.scorePanel, {
      position: 'absolute',
      bottom: UI.SCORE_PANEL.BOTTOM,
      left: UI.SCORE_PANEL.LEFT,
      width: UI.SCORE_PANEL.WIDTH,
      fontSize: UI.SCORE_PANEL.FONT_SIZE,
      fontFamily: 'Arial, sans-serif',
      color: UI.COLORS.TEXT,
      backgroundColor: UI.COLORS.BACKGROUND,
      border: `2px solid ${UI.COLORS.BORDER}`,
      borderRadius: '5px',
      padding: '15px',
      boxSizing: 'border-box',
      zIndex: '1000'
    });

    this.elements.scorePanel.innerHTML = this.generateScoreHTML();
    document.body.appendChild(this.elements.scorePanel);
  }

  createInstructionsPanel() {
    this.elements.instructionsPanel = document.createElement('div');
    this.styleElement(this.elements.instructionsPanel, {
      position: 'absolute',
      bottom: UI.INSTRUCTIONS_PANEL.BOTTOM,
      left: UI.INSTRUCTIONS_PANEL.LEFT,
      width: UI.INSTRUCTIONS_PANEL.WIDTH,
      fontSize: UI.INSTRUCTIONS_PANEL.FONT_SIZE,
      fontFamily: 'Arial, sans-serif',
      color: UI.COLORS.TEXT,
      backgroundColor: UI.COLORS.BACKGROUND,
      border: `2px solid ${UI.COLORS.BORDER}`,
      borderRadius: '5px',
      padding: '15px',
      boxSizing: 'border-box',
      zIndex: '1000'
    });

    this.elements.instructionsPanel.innerHTML = this.generateInstructionsHTML();
    document.body.appendChild(this.elements.instructionsPanel);
  }

  createPowerIndicator() {
    this.elements.powerIndicator = document.createElement('div');
    this.styleElement(this.elements.powerIndicator, {
      position: 'absolute',
      bottom: UI.POWER_INDICATOR.BOTTOM,
      left: UI.POWER_INDICATOR.LEFT,
      width: UI.POWER_INDICATOR.WIDTH,
      height: UI.POWER_INDICATOR.HEIGHT,
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: UI.COLORS.TEXT,
      backgroundColor: UI.COLORS.BACKGROUND,
      border: `2px solid ${UI.COLORS.BORDER}`,
      borderRadius: '5px',
      padding: '10px',
      boxSizing: 'border-box',
      zIndex: '1000'
    });

    // Create power text
    this.elements.powerText = document.createElement('div');
    this.elements.powerText.style.marginBottom = '5px';
    this.elements.powerText.style.textAlign = 'center';
    this.elements.powerText.textContent = `Shot Power: ${this.currentPower}%`;

    // Create power bar container
    const powerBarContainer = document.createElement('div');
    this.styleElement(powerBarContainer, {
      width: '100%',
      height: '20px',
      backgroundColor: UI.COLORS.POWER_BAR_BG,
      border: '1px solid #666',
      borderRadius: '3px',
      overflow: 'hidden',
      position: 'relative'
    });

    // Create power bar fill
    this.elements.powerBar = document.createElement('div');
    this.styleElement(this.elements.powerBar, {
      height: '100%',
      backgroundColor: UI.COLORS.POWER_BAR,
      width: `${this.currentPower}%`,
      transition: 'width 0.2s ease',
      borderRadius: '2px'
    });

    powerBarContainer.appendChild(this.elements.powerBar);
    this.elements.powerIndicator.appendChild(this.elements.powerText);
    this.elements.powerIndicator.appendChild(powerBarContainer);
    document.body.appendChild(this.elements.powerIndicator);
  }

  createFeedbackMessage() {
    this.elements.feedbackMessage = document.createElement('div');
    this.styleElement(this.elements.feedbackMessage, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: '2000',
      pointerEvents: 'none',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      display: 'none'
    });

    document.body.appendChild(this.elements.feedbackMessage);
  }

  generateScoreHTML() {
    return `
      <h3 style="margin: 0 0 10px 0; text-align: center;">SCORE</h3>
      <div style="margin-bottom: 8px;"><strong>Points:</strong> ${this.scoreData.score}</div>
      <div style="margin-bottom: 8px;"><strong>Shots Made:</strong> ${this.scoreData.made}/${this.scoreData.attempts}</div>
      <div style="margin-bottom: 8px;"><strong>Accuracy:</strong> ${this.scoreData.percentage}%</div>
      <div style="margin-bottom: 8px;"><strong>Current Streak:</strong> ${this.scoreData.streak}</div>
      <div><strong>Best Streak:</strong> ${this.scoreData.bestStreak}</div>
    `;
  }

  generateInstructionsHTML() {
    return `
      <h3 style="margin: 0 0 10px 0; text-align: center;">CONTROLS</h3>
      <div style="margin-bottom: 5px;"><strong>Arrow Keys:</strong> Move ball</div>
      <div style="margin-bottom: 5px;"><strong>W/S:</strong> Adjust power</div>
      <div style="margin-bottom: 5px;"><strong>Spacebar:</strong> Shoot</div>
      <div style="margin-bottom: 5px;"><strong>R:</strong> Reset ball</div>
      <div style="margin-bottom: 5px;"><strong>O:</strong> Toggle orbit camera</div>
      <div><strong>H:</strong> Toggle hoop camera</div>
    `;
  }

  updateScoreDisplay(scoreData) {
    if (!this.elements.scorePanel) return;

    // Store score data
    this.scoreData = { ...scoreData };

    this.elements.scorePanel.innerHTML = this.generateScoreHTML();

    // Visual feedback for score increases
    if (scoreData.score > this.scoreData.score) {
      this.flashElement(this.elements.scorePanel, UI.COLORS.SUCCESS);
    }
  }

  updatePowerDisplay(power) {
    this.currentPower = power;

    if (this.elements.powerText) {
      this.elements.powerText.textContent = `Shot Power: ${power}%`;
    }

    if (this.elements.powerBar) {
      this.elements.powerBar.style.width = `${power}%`;
      
      // Change color based on power level
      let barColor = UI.COLORS.POWER_BAR;
      if (power >= 80) {
        barColor = '#ff4444';
      } else if (power >= 60) {
        barColor = '#ffaa00';
      } else if (power >= 40) {
        barColor = '#ffff00';
      } else {
        barColor = '#00ff00';
      }
      
      this.elements.powerBar.style.backgroundColor = barColor;
    }
  }

  showFeedback(message, type = 'info', duration = SCORING.FEEDBACK_DURATION) {
    if (!this.elements.feedbackMessage) return;

    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }

    this.elements.feedbackMessage.textContent = message;
    
    let color = UI.COLORS.TEXT;
    switch (type) {
      case 'success':
        color = UI.COLORS.SUCCESS;
        break;
      case 'failure':
        color = UI.COLORS.FAILURE;
        break;
      case 'info':
      default:
        color = UI.COLORS.TEXT;
        break;
    }
    
    this.elements.feedbackMessage.style.color = color;
    this.elements.feedbackMessage.style.display = 'block';

    // Animate in
    this.elements.feedbackMessage.style.opacity = '0';
    this.elements.feedbackMessage.style.transform = 'translate(-50%, -50%) scale(0.5)';
    
    setTimeout(() => {
      this.elements.feedbackMessage.style.transition = 'all 0.3s ease';
      this.elements.feedbackMessage.style.opacity = '1';
      this.elements.feedbackMessage.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    this.feedbackTimeout = setTimeout(() => {
      this.hideFeedback();
    }, duration);
  }

  hideFeedback() {
    if (!this.elements.feedbackMessage) return;

    this.elements.feedbackMessage.style.transition = 'all 0.3s ease';
    this.elements.feedbackMessage.style.opacity = '0';
    this.elements.feedbackMessage.style.transform = 'translate(-50%, -50%) scale(0.5)';

    setTimeout(() => {
      this.elements.feedbackMessage.style.display = 'none';
    }, 300);
  }

  showScoreFeedback(message, type) {
    this.showFeedback(message, type, 2000);
  }

  flashElement(element, color, duration = 500) {
    if (!element) return;

    const originalBackground = element.style.backgroundColor;
    element.style.transition = 'background-color 0.1s ease';
    element.style.backgroundColor = color;

    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
    }, duration);
  }

  styleElement(element, styles) {
    Object.assign(element.style, styles);
  }

  update(deltaTime) {
    if (!this.isInitialized) return;

    this.animatePowerBar(deltaTime);
    this.updateTimeBasedElements(deltaTime);
  }

  // Subtle pulsing animation for high power
  animatePowerBar(deltaTime) {
    if (this.currentPower >= 80 && this.elements.powerBar) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;
      this.elements.powerBar.style.opacity = pulse;
    } else if (this.elements.powerBar) {
      this.elements.powerBar.style.opacity = '1';
    }
  }

  updateTimeBasedElements(deltaTime) {
    // Placeholder for future time-based animations
  }

  handleResize() {
    // UI elements use absolute positioning and adapt automatically
  }

  setVisibility(visible) {
    this.isVisible = visible;
    
    Object.values(this.elements).forEach(element => {
      if (element) {
        element.style.display = visible ? 'block' : 'none';
      }
    });
  }

  toggleVisibility() {
    this.setVisibility(!this.isVisible);
  }

  getUIState() {
    return {
      isVisible: this.isVisible,
      currentPower: this.currentPower,
      scoreData: { ...this.scoreData },
      hasElements: Object.values(this.elements).every(el => el !== null),
      isInitialized: this.isInitialized
    };
  }

  refreshUI() {
    if (!this.isInitialized) return;

    this.updateScoreDisplay(this.scoreData);
    this.updatePowerDisplay(this.currentPower);
  }

  removeAllElements() {
    Object.values(this.elements).forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    Object.keys(this.elements).forEach(key => {
      this.elements[key] = null;
    });
  }

  dispose() {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }

    this.removeAllElements();

    this.isVisible = true;
    this.currentPower = CONTROLS.POWER_DEFAULT;
    this.scoreData = {
      score: 0,
      attempts: 0,
      made: 0,
      percentage: 0,
      streak: 0,
      bestStreak: 0
    };

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized && 
           Object.values(this.elements).every(element => element !== null);
  }
}