/**
 * endless-mode.js - Infinite Gameplay System
 *
 * Transforms Iron Spine from a 20-wave game into an infinite experience.
 * Players can choose between:
 *   - Classic Mode: 20 waves, victory screen
 *   - Endless Mode: Infinite waves, highscore chase
 *
 * ENDLESS MODE FEATURES:
 *   - No wave cap - play forever
 *   - Smooth difficulty scaling (never impossible, always challenging)
 *   - Milestone celebrations (every 10, 50, 100 waves)
 *   - Dynamic enemy variety increases over time
 *   - Score multipliers grow with progress
 *   - Prestige system for meta-progression (future)
 *
 * BALANCE PHILOSOPHY:
 *   - Player power scales WITH enemies
 *   - Achievement bonuses become more meaningful over time
 *   - Soft caps prevent "I'm invincible" feeling
 *   - Hard caps prevent performance issues (max 50 enemies)
 *   - Rubber-banding helps struggling players
 *
 * USAGE:
 *   import { EndlessMode } from './systems/endless-mode.js';
 *
 *   // In game scene:
 *   this.endlessMode = new EndlessMode({
 *       enabled: true,
 *       startWave: 1,
 *       onMilestone: (wave) => this.celebrateMilestone(wave)
 *   });
 *
 *   // Each wave:
 *   const waveConfig = this.endlessMode.getWaveConfig(currentWave);
 */

import {
    formatNumber,
    formatCompact,
    endlessEnemyHp,
    endlessEnemyDamage,
    endlessEnemyCount,
    endlessScoreMultiplier,
    scaleForWave,
    softCap
} from '../core/verylargenumbers.js';

// ----------------------------------------------------------------------------
// ENDLESS MODE CONFIGURATION
// ----------------------------------------------------------------------------

const DEFAULT_CONFIG = {
    // Core settings
    enabled: false,              // Start disabled (toggle via menu)
    startWave: 1,                // Starting wave (1 or continue from saved)

    // Milestone waves (trigger celebrations)
    milestones: [10, 25, 50, 100, 150, 200, 250, 500, 1000],

    // Scaling rates
    enemyHpScaleRate: 0.09,      // HP increase per wave
    enemyDamageScaleRate: 0.05,  // Damage increase per wave
    enemySpeedScaleRate: 0.01,   // Speed increase per wave

    // Caps (for balance and performance)
    maxEnemiesAtOnce: 50,        // Performance cap
    maxEnemyHpMultiplier: 1000,  // Even at wave 10000, enemies aren't invincible
    maxEnemyDamageMultiplier: 50, // Players can still survive hits

    // Difficulty curve type
    // 'linear' - Steady increase
    // 'logarithmic' - Fast early, slow late (recommended)
    // 'exponential' - Slow early, fast late (hardcore)
    curveType: 'logarithmic',

    // Rubber banding (help struggling players)
    rubberBandEnabled: true,
    rubberBandThreshold: 3,      // Deaths in last N waves triggers help
    rubberBandReduction: 0.15    // Reduce difficulty by this %
};

// Milestone celebration messages
const MILESTONE_MESSAGES = {
    10: ['WAVE 10!', 'You\'re getting the hang of this!'],
    25: ['WAVE 25!', 'Quarter century of destruction!'],
    50: ['WAVE 50!', 'Halfway to a hundred!'],
    100: ['CENTURY!', 'You\'ve reached WAVE 100!'],
    150: ['WAVE 150!', 'The grind is real!'],
    200: ['WAVE 200!', 'Legendary commander!'],
    250: ['WAVE 250!', 'Is there no end to your power?'],
    500: ['WAVE 500!', 'You are become death!'],
    1000: ['WAVE 1000!', 'Absolute madman!'],
    default: ['MILESTONE!', 'Wave {wave}!']
};

// ----------------------------------------------------------------------------
// ENDLESS MODE CLASS
// ----------------------------------------------------------------------------

export class EndlessMode {
    /**
     * Create an endless mode manager.
     *
     * @param {Object} options - Configuration and callbacks
     */
    constructor(options = {}) {
        this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };

        // Callbacks
        this.onMilestone = options.onMilestone || (() => {});
        this.onNewRecord = options.onNewRecord || (() => {});

        // State
        this.currentWave = this.config.startWave;
        this.highestWave = this.loadHighestWave();
        this.recentDeaths = [];  // For rubber banding
        this.totalScore = 0;
        this.sessionStartWave = this.config.startWave;
    }

    /**
     * Check if endless mode is enabled.
     *
     * @returns {boolean} True if endless
     */
    isEnabled() {
        return this.config.enabled;
    }

    /**
     * Enable or disable endless mode.
     *
     * @param {boolean} enabled - New state
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }

    /**
     * Toggle endless mode.
     *
     * @returns {boolean} New state
     */
    toggle() {
        this.config.enabled = !this.config.enabled;
        return this.config.enabled;
    }

    /**
     * Get configuration for a specific wave.
     * Returns enemy stats, spawn counts, and modifiers.
     *
     * @param {number} wave - Wave number
     * @returns {Object} Wave configuration
     */
    getWaveConfig(wave) {
        const rubberBand = this.getRubberBandMultiplier();

        // Base multipliers from difficulty curve
        const hpMult = this.calculateMultiplier(
            wave,
            this.config.enemyHpScaleRate,
            this.config.maxEnemyHpMultiplier
        ) * rubberBand;

        const damageMult = this.calculateMultiplier(
            wave,
            this.config.enemyDamageScaleRate,
            this.config.maxEnemyDamageMultiplier
        ) * rubberBand;

        const speedMult = this.calculateMultiplier(
            wave,
            this.config.enemySpeedScaleRate,
            2.0  // Speed capped at 2x to keep game playable
        );

        // Enemy count scales logarithmically
        const baseEnemyCount = 8;
        const enemyCount = Math.min(
            baseEnemyCount + Math.floor(Math.log2(wave + 1) * 3),
            this.config.maxEnemiesAtOnce
        );

        // Score multiplier
        const scoreMult = endlessScoreMultiplier(wave);

        // Boss/Champion spawning
        const spawnBoss = wave % 10 === 0;
        const spawnChampion = wave % 5 === 0 && !spawnBoss;

        // Elite spawn chance increases over time
        const eliteChance = Math.min(0.5, 0.05 + wave * 0.002);

        // Every 50 waves, add a new enemy type to the mix (future feature)
        const enemyVariety = Math.floor(wave / 50) + 1;

        return {
            wave,
            hpMultiplier: hpMult,
            damageMultiplier: damageMult,
            speedMultiplier: speedMult,
            enemyCount,
            scoreMultiplier: scoreMult,
            spawnBoss,
            spawnChampion,
            eliteChance,
            enemyVariety,
            isMilestone: this.config.milestones.includes(wave),
            formattedWave: formatNumber(wave, 0)
        };
    }

    /**
     * Calculate a multiplier based on wave and difficulty curve.
     *
     * @param {number} wave - Current wave
     * @param {number} rate - Scaling rate
     * @param {number} cap - Maximum multiplier
     * @returns {number} Calculated multiplier
     */
    calculateMultiplier(wave, rate, cap) {
        let multiplier;

        switch (this.config.curveType) {
            case 'linear':
                multiplier = 1 + (wave * rate);
                break;

            case 'exponential':
                multiplier = Math.pow(1 + rate, wave);
                break;

            case 'logarithmic':
            default:
                // Grows fast early, slows down later
                // Wave 10: ~1.5x, Wave 100: ~3x, Wave 1000: ~5x
                multiplier = 1 + (rate * wave * Math.log10(Math.max(10, wave)));
                break;
        }

        return Math.min(multiplier, cap);
    }

    /**
     * Get rubber band multiplier (reduces difficulty if player is struggling).
     *
     * @returns {number} Multiplier (1.0 = normal, lower = easier)
     */
    getRubberBandMultiplier() {
        if (!this.config.rubberBandEnabled) {
            return 1.0;
        }

        // Count recent deaths
        const recentCount = this.recentDeaths.filter(
            wave => wave >= this.currentWave - this.config.rubberBandThreshold
        ).length;

        if (recentCount >= 2) {
            return 1.0 - this.config.rubberBandReduction;
        }

        return 1.0;
    }

    /**
     * Record a player death for rubber banding.
     *
     * @param {number} wave - Wave where death occurred
     */
    recordDeath(wave) {
        this.recentDeaths.push(wave);

        // Keep only last 10 deaths
        if (this.recentDeaths.length > 10) {
            this.recentDeaths.shift();
        }
    }

    /**
     * Called when a wave is completed.
     *
     * @param {number} wave - Completed wave number
     * @param {number} score - Score earned this wave
     */
    completeWave(wave, score = 0) {
        this.currentWave = wave + 1;
        this.totalScore += score;

        // Check for new record
        if (wave > this.highestWave) {
            this.highestWave = wave;
            this.saveHighestWave();
            this.onNewRecord(wave);
        }

        // Check for milestone
        if (this.config.milestones.includes(wave)) {
            const message = MILESTONE_MESSAGES[wave] || MILESTONE_MESSAGES.default;
            this.onMilestone(wave, message);
        }
    }

    /**
     * Get milestone message for a wave.
     *
     * @param {number} wave - Wave number
     * @returns {Array<string>} [title, subtitle]
     */
    getMilestoneMessage(wave) {
        const template = MILESTONE_MESSAGES[wave] || MILESTONE_MESSAGES.default;
        return template.map(str => str.replace('{wave}', formatNumber(wave, 0)));
    }

    /**
     * Get current endless mode stats.
     *
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            enabled: this.config.enabled,
            currentWave: this.currentWave,
            highestWave: this.highestWave,
            totalScore: this.totalScore,
            formattedScore: formatNumber(this.totalScore),
            formattedHighest: formatNumber(this.highestWave, 0),
            sessionProgress: this.currentWave - this.sessionStartWave
        };
    }

    /**
     * Check if current wave is a milestone.
     *
     * @param {number} wave - Wave to check
     * @returns {boolean} True if milestone
     */
    isMilestone(wave) {
        return this.config.milestones.includes(wave);
    }

    /**
     * Get victory condition for current mode.
     *
     * @returns {number|null} Target wave (null for endless)
     */
    getVictoryWave() {
        return this.config.enabled ? null : 20;
    }

    /**
     * Check if player has won (only in classic mode).
     *
     * @param {number} wave - Current wave
     * @returns {boolean} True if victory
     */
    checkVictory(wave) {
        const target = this.getVictoryWave();
        return target !== null && wave >= target;
    }

    /**
     * Reset for a new run.
     *
     * @param {number} startWave - Starting wave (default 1)
     */
    reset(startWave = 1) {
        this.currentWave = startWave;
        this.sessionStartWave = startWave;
        this.totalScore = 0;
        this.recentDeaths = [];
    }

    /**
     * Load highest wave from localStorage.
     *
     * @returns {number} Highest wave reached
     */
    loadHighestWave() {
        try {
            const saved = localStorage.getItem('ironspine_endless_highest');
            return saved ? parseInt(saved, 10) : 0;
        } catch {
            return 0;
        }
    }

    /**
     * Save highest wave to localStorage.
     */
    saveHighestWave() {
        try {
            localStorage.setItem('ironspine_endless_highest', this.highestWave.toString());
        } catch (error) {
            console.warn('[Endless] Failed to save highest wave:', error);
        }
    }
}

// ----------------------------------------------------------------------------
// ENDLESS MODE UI HELPERS
// ----------------------------------------------------------------------------

/**
 * Create a milestone celebration effect.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} wave - The milestone wave
 * @param {Array<string>} message - [title, subtitle]
 */
export function createMilestoneCelebration(scene, wave, message) {
    const { width, height } = scene.scale;
    const [title, subtitle] = message;

    // Container for celebration
    const container = scene.add.container(width * 0.5, height * 0.3);
    container.setDepth(1000);
    container.setScrollFactor(0);

    // Title
    const titleText = scene.add.text(0, 0, title, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '48px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);
    container.add(titleText);

    // Subtitle
    const subtitleText = scene.add.text(0, 50, subtitle, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5);
    container.add(subtitleText);

    // Animate in
    container.setScale(0);
    scene.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut'
    });

    // Pulse effect
    scene.tweens.add({
        targets: titleText,
        scale: 1.1,
        duration: 200,
        yoyo: true,
        repeat: 2,
        delay: 300
    });

    // Fade out
    scene.tweens.add({
        targets: container,
        alpha: 0,
        y: container.y - 50,
        duration: 500,
        delay: 2000,
        onComplete: () => container.destroy()
    });
}

/**
 * Create a new record celebration effect.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} wave - The new record wave
 */
export function createNewRecordEffect(scene, wave) {
    const { width, height } = scene.scale;

    const text = scene.add.text(width * 0.5, height * 0.15, 'NEW RECORD!', {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '32px',
        color: '#00ff00',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    text.setDepth(1000);
    text.setScrollFactor(0);

    scene.tweens.add({
        targets: text,
        alpha: { from: 1, to: 0 },
        y: text.y - 30,
        duration: 1500,
        onComplete: () => text.destroy()
    });
}

// ----------------------------------------------------------------------------
// CONVENIENCE EXPORTS
// ----------------------------------------------------------------------------

export function createEndlessMode(options) {
    return new EndlessMode(options);
}
