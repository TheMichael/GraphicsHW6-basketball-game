import { SCORING } from '../utils/Constants.js';
import { GeneralUtils } from '../utils/MathUtils.js';

export class ScoreManager {
  constructor() {
    this.uiManager = null;
    this.gameStateManager = null;

    // Core scoring statistics
    this.statistics = {
      totalScore: SCORING.INITIAL_SCORE,
      shotAttempts: SCORING.INITIAL_ATTEMPTS,
      shotsMade: SCORING.INITIAL_MADE,
      shootingPercentage: 0
    };

    // Detailed tracking
    this.detailedStats = {
      consecutiveShots: 0,
      bestStreak: 0,
      missedShots: 0,
      totalGameTime: 0,
      averageShotTime: 0,
      shotsPerMinute: 0
    };

    // Session tracking
    this.sessionData = {
      sessionStartTime: 0,
      lastShotTime: 0,
      shotTimes: [],
      recentShots: [],
      maxRecentShots: 10
    };

    this.scoreHistory = [];
    this.maxHistoryLength = 100;

    this.lastScoreTime = 0;
    this.lastScoreAmount = 0;

    this.isInitialized = false;
  }

  initialize(systems) {
    if (this.isInitialized) {
      console.warn('ScoreManager already initialized');
      return;
    }

    this.uiManager = systems.uiManager;
    this.gameStateManager = systems.gameStateManager;

    this.startSession();
    this.isInitialized = true;
  }

  startSession() {
    this.sessionData.sessionStartTime = Date.now();
    this.sessionData.lastShotTime = 0;
    this.sessionData.shotTimes = [];
    this.sessionData.recentShots = [];
  }

  update(deltaTime) {
    if (!this.isInitialized) return;

    this.detailedStats.totalGameTime += deltaTime;
    this.updateRealTimeStats();

    if (this.uiManager) {
      this.updateUI();
    }
  }

  updateRealTimeStats() {
    this.statistics.shootingPercentage = this.calculateShootingPercentage();

    const sessionTimeMinutes = (Date.now() - this.sessionData.sessionStartTime) / (1000 * 60);
    this.detailedStats.shotsPerMinute = sessionTimeMinutes > 0 
      ? this.statistics.shotAttempts / sessionTimeMinutes 
      : 0;

    if (this.sessionData.shotTimes.length > 1) {
      const totalShotTime = this.sessionData.shotTimes.reduce((sum, time, index) => {
        if (index === 0) return 0;
        return sum + (time - this.sessionData.shotTimes[index - 1]);
      }, 0);
      
      this.detailedStats.averageShotTime = totalShotTime / (this.sessionData.shotTimes.length - 1);
    }
  }

  addScore(points = SCORING.POINTS_PER_SHOT) {
    if (!this.isInitialized) return;

    this.statistics.totalScore += points;
    this.statistics.shotsMade++;

    this.detailedStats.consecutiveShots++;
    this.detailedStats.bestStreak = Math.max(
      this.detailedStats.bestStreak, 
      this.detailedStats.consecutiveShots
    );

    this.lastScoreTime = Date.now();
    this.lastScoreAmount = points;

    this.addToScoreHistory('made', points);
    this.addToRecentShots(true);

    this.updateUI();
    this.triggerScoreFeedback(points, true);
  }

  incrementAttempts() {
    if (!this.isInitialized) return;

    this.statistics.shotAttempts++;
    
    const currentTime = Date.now();
    this.sessionData.shotTimes.push(currentTime);
    this.sessionData.lastShotTime = currentTime;

    this.addToScoreHistory('attempt', 0);
    this.updateUI();
  }

  incrementMade() {
    // Called by addScore(), available for separate use if needed
  }

  recordMiss() {
    if (!this.isInitialized) return;

    this.detailedStats.missedShots++;
    this.detailedStats.consecutiveShots = 0;

    this.addToScoreHistory('miss', 0);
    this.addToRecentShots(false);

    this.updateUI();
    this.triggerScoreFeedback(0, false);
  }

  addToScoreHistory(type, points) {
    const entry = {
      type: type,
      points: points,
      timestamp: Date.now(),
      totalScore: this.statistics.totalScore,
      shotNumber: this.statistics.shotAttempts
    };

    this.scoreHistory.push(entry);

    if (this.scoreHistory.length > this.maxHistoryLength) {
      this.scoreHistory.shift();
    }
  }

  addToRecentShots(success) {
    this.sessionData.recentShots.push({
      success: success,
      timestamp: Date.now(),
      shotNumber: this.statistics.shotAttempts
    });

    if (this.sessionData.recentShots.length > this.sessionData.maxRecentShots) {
      this.sessionData.recentShots.shift();
    }
  }

  calculateShootingPercentage() {
    if (this.statistics.shotAttempts === 0) return 0;
    return (this.statistics.shotsMade / this.statistics.shotAttempts) * 100;
  }

  getStatistics() {
    return {
      // Core stats
      totalScore: this.statistics.totalScore,
      shotAttempts: this.statistics.shotAttempts,
      shotsMade: this.statistics.shotsMade,
      shootingPercentage: this.statistics.shootingPercentage,
      
      // Detailed stats
      consecutiveShots: this.detailedStats.consecutiveShots,
      bestStreak: this.detailedStats.bestStreak,
      missedShots: this.detailedStats.missedShots,
      totalGameTime: this.detailedStats.totalGameTime,
      averageShotTime: this.detailedStats.averageShotTime,
      shotsPerMinute: this.detailedStats.shotsPerMinute,
      
      // Session data
      sessionDuration: Date.now() - this.sessionData.sessionStartTime,
      recentShotsCount: this.sessionData.recentShots.length
    };
  }

  getRecentPerformance() {
    const recentShots = this.sessionData.recentShots;
    if (recentShots.length === 0) {
      return {
        recentAttempts: 0,
        recentMade: 0,
        recentPercentage: 0,
        trend: 'none'
      };
    }

    const recentMade = recentShots.filter(shot => shot.success).length;
    const recentPercentage = (recentMade / recentShots.length) * 100;

    // Determine trend (last half vs first half)
    let trend = 'none';
    if (recentShots.length >= 6) {
      const lastHalf = recentShots.slice(-Math.floor(recentShots.length / 2));
      const firstHalf = recentShots.slice(0, Math.floor(recentShots.length / 2));
      
      const lastHalfPercentage = (lastHalf.filter(s => s.success).length / lastHalf.length) * 100;
      const firstHalfPercentage = (firstHalf.filter(s => s.success).length / firstHalf.length) * 100;
      
      if (lastHalfPercentage > firstHalfPercentage + 10) {
        trend = 'improving';
      } else if (lastHalfPercentage < firstHalfPercentage - 10) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    return {
      recentAttempts: recentShots.length,
      recentMade: recentMade,
      recentPercentage: recentPercentage,
      trend: trend
    };
  }

  updateUI() {
    if (!this.uiManager) return;

    const stats = this.getStatistics();
    
    this.uiManager.updateScoreDisplay({
      score: stats.totalScore,
      attempts: stats.shotAttempts,
      made: stats.shotsMade,
      percentage: stats.shootingPercentage.toFixed(1),
      streak: stats.consecutiveShots,
      bestStreak: stats.bestStreak
    });
  }

  triggerScoreFeedback(points, success) {
    if (!this.uiManager) return;

    if (success) {
      this.uiManager.showScoreFeedback(`+${points} POINTS!`, 'success');
    } else {
      this.uiManager.showScoreFeedback('MISSED', 'failure');
    }
  }

  getScoreBreakdown() {
    return {
      twoPointers: {
        made: this.statistics.shotsMade,
        attempted: this.statistics.shotAttempts,
        points: this.statistics.totalScore
      },
      threePointers: {
        made: 0,
        attempted: 0,
        points: 0
      }
    };
  }

  getTimeStats() {
    const sessionTime = Date.now() - this.sessionData.sessionStartTime;
    const sessionMinutes = sessionTime / (1000 * 60);
    
    return {
      sessionDuration: sessionTime,
      sessionMinutes: sessionMinutes,
      shotsPerMinute: sessionMinutes > 0 ? this.statistics.shotAttempts / sessionMinutes : 0,
      pointsPerMinute: sessionMinutes > 0 ? this.statistics.totalScore / sessionMinutes : 0,
      averageShotInterval: this.detailedStats.averageShotTime
    };
  }

  exportStatistics() {
    return {
      timestamp: Date.now(),
      session: {
        startTime: this.sessionData.sessionStartTime,
        duration: Date.now() - this.sessionData.sessionStartTime
      },
      statistics: this.getStatistics(),
      performance: this.getRecentPerformance(),
      timeStats: this.getTimeStats(),
      history: [...this.scoreHistory],
      recentShots: [...this.sessionData.recentShots]
    };
  }

  reset() {
    this.statistics = {
      totalScore: SCORING.INITIAL_SCORE,
      shotAttempts: SCORING.INITIAL_ATTEMPTS,
      shotsMade: SCORING.INITIAL_MADE,
      shootingPercentage: 0
    };

    this.detailedStats = {
      consecutiveShots: 0,
      bestStreak: 0,
      missedShots: 0,
      totalGameTime: 0,
      averageShotTime: 0,
      shotsPerMinute: 0
    };

    this.scoreHistory = [];
    this.startSession();
    this.updateUI();
  }

  // Achievement system for future gamification
  getAchievements() {
    const achievements = [];
    const stats = this.getStatistics();

    if (stats.shotsMade >= 10) achievements.push('Double Digits');
    if (stats.shootingPercentage >= 50 && stats.shotAttempts >= 10) achievements.push('Sharp Shooter');
    if (stats.bestStreak >= 5) achievements.push('On Fire');
    if (stats.totalScore >= 50) achievements.push('Half Century');

    return achievements;
  }

  getPerformanceGrade() {
    const percentage = this.statistics.shootingPercentage;
    
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  dispose() {
    this.uiManager = null;
    this.gameStateManager = null;

    this.scoreHistory = [];
    this.sessionData.recentShots = [];
    this.sessionData.shotTimes = [];

    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized;
  }

  // Quick access methods
  getCurrentScore() {
    return this.statistics.totalScore;
  }

  getShotAttempts() {
    return this.statistics.shotAttempts;
  }

  getShotsMade() {
    return this.statistics.shotsMade;
  }

  getShootingPercentage() {
    return this.statistics.shootingPercentage;
  }
}