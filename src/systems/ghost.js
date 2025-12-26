/**
 * ghost.js - Ghost Train Replay System
 *
 * Records and replays ghost trains showing previous best runs.
 * Provides lightweight async competition without servers.
 *
 * MECHANICS:
 *   - Record engine position every 100ms during runs
 *   - Store 60-120 position points per run (~5KB compressed)
 *   - Display ghost outline of previous best run
 *   - Show time delta comparisons at wave milestones
 *   - Optional toggle for performance
 *
 * DATA STRUCTURE:
 *   Ghost data: {
 *     positions: [{ x, y, t, wave }],
 *     seed: string,
 *     difficulty: string,
 *     score: number,
 *     finalWave: number,
 *     date: timestamp,
 *     runTimeSeconds: number
 *   }
 *
 * STORAGE:
 *   - localStorage key: 'ironspine_ghost'
 *   - Stores only the best run (longest survival)
 *   - Data compressed by rounding positions to integers
 *
 * INTEGRATION:
 *   1. Create GhostRecorder on run start
 *   2. Call record() every 100ms with engine position
 *   3. Call save() on run completion (if new best)
 *   4. Create GhostRenderer to display saved ghost
 */

import { PALETTE, TRAIN } from '../config.js';

const RECORD_INTERVAL_MS = 100; // Record position every 100ms
const MAX_POINTS = 120; // Cap at 120 points (~12 second run at 100ms)
const GHOST_ALPHA = 0.3; // Ghost transparency
const GHOST_COLOR = 0x44aaff; // Light blue ghost color
const MILESTONE_WAVES = [5, 10, 15, 20, 25, 50, 75, 100]; // Show comparison at these waves

/**
 * Records engine position during a run for ghost replay.
 */
export class GhostRecorder {
    constructor(seed, difficulty) {
        this.positions = []; // { x, y, t, wave }
        this.seed = seed;
        this.difficulty = difficulty;
        this.lastRecordTime = 0;
        this.recordInterval = RECORD_INTERVAL_MS;
        this.runStartTime = Date.now();
    }

    /**
     * Record current engine position if enough time has passed.
     * @param {number} currentTime - Current game time in milliseconds
     * @param {number} x - Engine x position
     * @param {number} y - Engine y position
     * @param {number} wave - Current wave number
     */
    record(currentTime, x, y, wave) {
        // Check if enough time has passed since last record
        if (currentTime - this.lastRecordTime < this.recordInterval) {
            return;
        }

        // Don't exceed max points (keep storage bounded)
        if (this.positions.length >= MAX_POINTS) {
            // Remove oldest point to make room (FIFO queue)
            this.positions.shift();
        }

        // Compress data by rounding positions to integers
        this.positions.push({
            x: Math.round(x),
            y: Math.round(y),
            t: currentTime,
            wave: wave
        });

        this.lastRecordTime = currentTime;
    }

    /**
     * Finalize recording and return ghost data.
     * @param {number} finalWave - Wave number achieved
     * @param {number} runTimeSeconds - Total run time in seconds
     * @returns {object} Ghost data ready for storage
     */
    finalize(finalWave, runTimeSeconds) {
        return {
            positions: this.positions,
            seed: this.seed,
            difficulty: this.difficulty,
            score: finalWave, // Use wave as score for comparison
            finalWave: finalWave,
            date: this.runStartTime,
            runTimeSeconds: runTimeSeconds
        };
    }

    /**
     * Get current point count (for debugging).
     */
    getPointCount() {
        return this.positions.length;
    }
}

/**
 * Manages ghost data persistence and retrieval.
 */
export class GhostStorage {
    static STORAGE_KEY = 'ironspine_ghost';

    /**
     * Save ghost data to localStorage if it's a new best.
     * @param {object} ghostData - Ghost data from GhostRecorder.finalize()
     * @returns {boolean} True if saved (new best), false otherwise
     */
    static save(ghostData) {
        if (!ghostData || !ghostData.positions || ghostData.positions.length === 0) {
            return false;
        }

        // Check if this is better than existing ghost
        const existing = this.load();
        if (existing && existing.score >= ghostData.score) {
            return false; // Not a new best
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ghostData));
            return true;
        } catch (error) {
            console.warn('[GhostStorage] Failed to save ghost:', error);
            return false;
        }
    }

    /**
     * Load ghost data from localStorage.
     * @returns {object|null} Ghost data or null if none exists
     */
    static load() {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            if (!json) {
                return null;
            }
            return JSON.parse(json);
        } catch (error) {
            console.warn('[GhostStorage] Failed to load ghost:', error);
            return null;
        }
    }

    /**
     * Check if a ghost exists.
     * @returns {boolean}
     */
    static hasGhost() {
        return this.load() !== null;
    }

    /**
     * Clear saved ghost data.
     */
    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Get ghost stats for display.
     * @returns {object|null} { score, difficulty, date }
     */
    static getStats() {
        const ghost = this.load();
        if (!ghost) {
            return null;
        }
        return {
            score: ghost.score,
            difficulty: ghost.difficulty,
            date: ghost.date,
            runTimeSeconds: ghost.runTimeSeconds
        };
    }
}

/**
 * Renders ghost train visualization during gameplay.
 */
export class GhostRenderer {
    constructor(scene, ghostData) {
        this.scene = scene;
        this.ghostData = ghostData;
        this.positions = ghostData ? ghostData.positions : [];
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(5); // Above ground, below train
        this.enabled = true;
        this.currentIndex = 0; // Track which position we're at
        this.startTime = 0;
        this.milestoneComparisons = new Map(); // wave -> { ghostTime, playerTime, delta }
    }

    /**
     * Enable or disable ghost rendering.
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.graphics.clear();
        }
    }

    /**
     * Initialize ghost playback.
     * @param {number} startTime - Game start time in milliseconds
     */
    start(startTime) {
        this.startTime = startTime;
        this.currentIndex = 0;
        this.milestoneComparisons.clear();
    }

    /**
     * Update and render ghost train.
     * @param {number} currentTime - Current game time in milliseconds
     * @param {number} currentWave - Current wave number
     */
    update(currentTime, currentWave) {
        if (!this.enabled || !this.ghostData || this.positions.length === 0) {
            this.graphics.clear();
            return;
        }

        this.graphics.clear();

        // Calculate elapsed time since run start
        const elapsedTime = currentTime - this.startTime;

        // Find all positions that should be visible up to current time
        const visiblePositions = [];
        for (let i = 0; i < this.positions.length; i += 1) {
            const pos = this.positions[i];
            // Ghost positions use relative time from start
            const ghostRelativeTime = pos.t - (this.ghostData.positions[0]?.t || 0);

            if (ghostRelativeTime <= elapsedTime) {
                visiblePositions.push(pos);
                this.currentIndex = i;
            } else {
                break;
            }
        }

        // Render ghost trail as dotted line
        if (visiblePositions.length > 1) {
            this.graphics.lineStyle(2, GHOST_COLOR, GHOST_ALPHA);

            for (let i = 1; i < visiblePositions.length; i += 1) {
                const prev = visiblePositions[i - 1];
                const curr = visiblePositions[i];

                // Draw dotted line (every other segment)
                if (i % 2 === 0) {
                    this.graphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
                }
            }

            // Draw ghost engine at current position
            const currentPos = visiblePositions[visiblePositions.length - 1];
            this.drawGhostEngine(currentPos.x, currentPos.y);
        }

        // Check for milestone comparisons
        this.checkMilestoneComparison(currentWave, currentTime);
    }

    /**
     * Draw ghost engine sprite.
     * @param {number} x
     * @param {number} y
     */
    drawGhostEngine(x, y) {
        const { width, height } = TRAIN.engineSize;

        // Draw transparent engine outline
        this.graphics.fillStyle(GHOST_COLOR, GHOST_ALPHA * 0.5);
        this.graphics.fillRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );

        // Draw border
        this.graphics.lineStyle(2, GHOST_COLOR, GHOST_ALPHA);
        this.graphics.strokeRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );
    }

    /**
     * Check if we've reached a milestone wave and compare times.
     * @param {number} currentWave - Current wave number
     * @param {number} currentTime - Current game time in milliseconds
     */
    checkMilestoneComparison(currentWave, currentTime) {
        // Only check at milestone waves
        if (!MILESTONE_WAVES.includes(currentWave)) {
            return;
        }

        // Already compared this milestone
        if (this.milestoneComparisons.has(currentWave)) {
            return;
        }

        // Find ghost time at this wave
        const ghostTimeAtWave = this.findGhostTimeAtWave(currentWave);
        if (ghostTimeAtWave === null) {
            return;
        }

        const playerTime = currentTime - this.startTime;
        const delta = playerTime - ghostTimeAtWave;

        this.milestoneComparisons.set(currentWave, {
            ghostTime: ghostTimeAtWave,
            playerTime: playerTime,
            delta: delta
        });

        // Return comparison for HUD to display
        return {
            wave: currentWave,
            delta: delta,
            ahead: delta < 0
        };
    }

    /**
     * Find the time the ghost reached a specific wave.
     * @param {number} wave - Wave number to check
     * @returns {number|null} Time in milliseconds, or null if not found
     */
    findGhostTimeAtWave(wave) {
        for (let i = 0; i < this.positions.length; i += 1) {
            const pos = this.positions[i];
            if (pos.wave >= wave) {
                // Found first position at or past this wave
                const ghostRelativeTime = pos.t - (this.ghostData.positions[0]?.t || 0);
                return ghostRelativeTime;
            }
        }
        return null;
    }

    /**
     * Get all milestone comparisons for end screen display.
     * @returns {Map} wave -> { ghostTime, playerTime, delta }
     */
    getMilestoneComparisons() {
        return this.milestoneComparisons;
    }

    /**
     * Clean up graphics.
     */
    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}

/**
 * Create milestone comparison UI element.
 * @param {object} scene - Phaser scene
 * @param {number} delta - Time delta in milliseconds (negative = ahead)
 * @returns {object} Text object showing comparison
 */
export function createMilestoneComparisonText(scene, delta) {
    const { width, height } = scene.scale;

    // Format delta as seconds
    const deltaSeconds = Math.abs(delta / 1000);
    const ahead = delta < 0;
    const sign = ahead ? '-' : '+';
    const color = ahead ? '#44ff44' : '#ff4444';
    const label = ahead ? 'AHEAD' : 'BEHIND';

    const text = scene.add.text(
        width * 0.5,
        height * 0.3,
        `${sign}${deltaSeconds.toFixed(1)}s\n${label}`,
        {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '32px',
            color: color,
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            fontStyle: 'bold'
        }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(150);
    text.setAlpha(0);

    // Animate in and out
    scene.tweens.add({
        targets: text,
        alpha: 1,
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            scene.tweens.add({
                targets: text,
                alpha: 0,
                duration: 2000,
                delay: 1500,
                ease: 'Cubic.easeIn',
                onComplete: () => text.destroy()
            });
        }
    });

    return text;
}
