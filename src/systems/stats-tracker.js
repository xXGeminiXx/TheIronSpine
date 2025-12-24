/**
 * stats-tracker.js - Persistent Statistics Tracking System
 *
 * Tracks player performance across multiple runs and persists to localStorage.
 * Provides aggregate statistics, personal bests, and run history for potential
 * future features like leaderboards and achievements.
 *
 * STORAGE KEY: 'ironspine_stats'
 *
 * DATA STRUCTURE:
 *   {
 *     totalRuns: number,
 *     totalVictories: number,
 *     totalDefeats: number,
 *     totalPlayTimeSeconds: number,
 *     totalEnemiesDestroyed: number,
 *     totalCarsCollected: number,
 *     totalMerges: number,
 *     personalBests: {
 *       fastestVictory: number (seconds),
 *       highestWave: number,
 *       highestTier: number,
 *       mostKills: number,
 *       longestRun: number (seconds),
 *       mostCarsCollected: number,
 *       mostMerges: number
 *     },
 *     recentRuns: [ ...last 10 runs ],
 *     firstPlayDate: ISO string,
 *     lastPlayDate: ISO string
 *   }
 *
 * USAGE:
 *   import { StatsTracker } from './systems/stats-tracker.js';
 *
 *   // At end of run:
 *   StatsTracker.recordRun({
 *       result: 'victory' | 'defeat',
 *       timeSurvived: 145.5,  // seconds
 *       wavesCleared: 20,
 *       enemiesDestroyed: 87,
 *       carsCollected: 15,
 *       carsLost: 3,
 *       mergesCompleted: 8,
 *       highestTier: 3
 *   });
 *
 *   // To read stats:
 *   const stats = StatsTracker.getStats();
 *   console.log(stats.totalVictories);
 *
 * EXTENSIBILITY:
 *   To track a new statistic:
 *   1. Add the field to DEFAULT_STATS
 *   2. Update recordRun() to increment/track it
 *   3. Add personal best check if applicable
 *
 * PRIVACY NOTE:
 *   All data is stored locally in the browser. Nothing is sent to any server.
 *   Players can clear their stats by clearing localStorage or calling reset().
 */

const STORAGE_KEY = 'ironspine_stats';
const MAX_RECENT_RUNS = 10;

// ----------------------------------------------------------------------------
// DEFAULT STATS STRUCTURE
// ----------------------------------------------------------------------------
// This is the initial state for new players or after a reset.
// When adding new fields, add them here with sensible defaults.
// ----------------------------------------------------------------------------

const DEFAULT_STATS = {
    // Aggregate totals
    totalRuns: 0,
    totalVictories: 0,
    totalDefeats: 0,
    totalPlayTimeSeconds: 0,
    totalEnemiesDestroyed: 0,
    totalPulseHits: 0,
    totalCarsCollected: 0,
    totalCarsLost: 0,
    totalMerges: 0,
    totalWavesCleared: 0,

    // Personal bests (null = not yet achieved)
    personalBests: {
        fastestVictory: null,       // Seconds to complete 20 waves
        highestWave: 0,             // Furthest wave reached
        highestTier: 0,             // Highest car tier achieved
        mostKillsInRun: 0,          // Most enemies killed in single run
        longestRun: 0,              // Longest survival time (seconds)
        mostCarsCollected: 0,       // Most cars collected in single run
        mostMergesInRun: 0,         // Most merges in single run
        longestWinStreak: 0,        // Consecutive victories
        currentWinStreak: 0         // Current streak (resets on defeat)
    },

    // Recent run history (newest first)
    recentRuns: [],

    // Timestamps
    firstPlayDate: null,
    lastPlayDate: null,

    // Version for future migrations
    statsVersion: 1
};

// ----------------------------------------------------------------------------
// STATS TRACKER CLASS
// ----------------------------------------------------------------------------

export class StatsTracker {
    /**
     * Get current stats from localStorage.
     * Returns a copy to prevent accidental mutation.
     *
     * @returns {Object} Current stats object
     */
    static getStats() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return this._deepCopy(DEFAULT_STATS);
            }

            const parsed = JSON.parse(stored);

            // Merge with defaults to handle missing fields from older versions
            return this._mergeWithDefaults(parsed);
        } catch (error) {
            console.warn('[StatsTracker] Failed to load stats:', error);
            return this._deepCopy(DEFAULT_STATS);
        }
    }

    /**
     * Record a completed run and update all relevant statistics.
     *
     * @param {Object} runData - Data from the completed run
     * @param {string} runData.result - 'victory' or 'defeat'
     * @param {number} runData.timeSurvived - Run duration in seconds
     * @param {number} runData.wavesCleared - Number of waves completed
     * @param {number} runData.enemiesDestroyed - Total enemies killed
     * @param {number} runData.carsCollected - Cars picked up
     * @param {number} runData.carsLost - Cars destroyed or dropped
     * @param {number} runData.mergesCompleted - Number of merges
     * @param {number} runData.highestTier - Max tier reached
     * @returns {Object} Updated stats with any new personal bests flagged
     */
    static recordRun(runData) {
        const stats = this.getStats();
        const now = new Date().toISOString();

        // First play tracking
        if (!stats.firstPlayDate) {
            stats.firstPlayDate = now;
        }
        stats.lastPlayDate = now;

        // Increment totals
        stats.totalRuns++;
        stats.totalPlayTimeSeconds += runData.timeSurvived || 0;
        stats.totalEnemiesDestroyed += runData.enemiesDestroyed || 0;
        stats.totalPulseHits += runData.pulseHits || 0;
        stats.totalCarsCollected += runData.carsCollected || 0;
        stats.totalCarsLost += runData.carsLost || 0;
        stats.totalMerges += runData.mergesCompleted || 0;
        stats.totalWavesCleared += runData.wavesCleared || 0;

        // Track victories/defeats
        const isVictory = runData.result === 'victory';
        if (isVictory) {
            stats.totalVictories++;
            stats.personalBests.currentWinStreak++;

            // Check for longest win streak
            if (stats.personalBests.currentWinStreak > stats.personalBests.longestWinStreak) {
                stats.personalBests.longestWinStreak = stats.personalBests.currentWinStreak;
            }
        } else {
            stats.totalDefeats++;
            stats.personalBests.currentWinStreak = 0;
        }

        // Track personal bests
        const newBests = [];

        // Fastest victory (only on wins)
        if (isVictory) {
            if (stats.personalBests.fastestVictory === null ||
                runData.timeSurvived < stats.personalBests.fastestVictory) {
                stats.personalBests.fastestVictory = runData.timeSurvived;
                newBests.push('fastestVictory');
            }
        }

        // Highest wave
        if (runData.wavesCleared > stats.personalBests.highestWave) {
            stats.personalBests.highestWave = runData.wavesCleared;
            newBests.push('highestWave');
        }

        // Highest tier
        if (runData.highestTier > stats.personalBests.highestTier) {
            stats.personalBests.highestTier = runData.highestTier;
            newBests.push('highestTier');
        }

        // Most kills in a run
        if (runData.enemiesDestroyed > stats.personalBests.mostKillsInRun) {
            stats.personalBests.mostKillsInRun = runData.enemiesDestroyed;
            newBests.push('mostKillsInRun');
        }

        // Longest run
        if (runData.timeSurvived > stats.personalBests.longestRun) {
            stats.personalBests.longestRun = runData.timeSurvived;
            newBests.push('longestRun');
        }

        // Most cars collected
        if (runData.carsCollected > stats.personalBests.mostCarsCollected) {
            stats.personalBests.mostCarsCollected = runData.carsCollected;
            newBests.push('mostCarsCollected');
        }

        // Most merges
        if (runData.mergesCompleted > stats.personalBests.mostMergesInRun) {
            stats.personalBests.mostMergesInRun = runData.mergesCompleted;
            newBests.push('mostMergesInRun');
        }

        // Add to recent runs (newest first)
        const runRecord = {
            date: now,
            result: runData.result,
            timeSurvived: runData.timeSurvived,
            wavesCleared: runData.wavesCleared,
            enemiesDestroyed: runData.enemiesDestroyed,
            carsCollected: runData.carsCollected,
            pulseHits: runData.pulseHits || 0,
            highestTier: runData.highestTier
        };

        stats.recentRuns.unshift(runRecord);

        // Trim to max recent runs
        if (stats.recentRuns.length > MAX_RECENT_RUNS) {
            stats.recentRuns = stats.recentRuns.slice(0, MAX_RECENT_RUNS);
        }

        // Save to localStorage
        this._saveStats(stats);

        // Return stats with new bests flagged
        return {
            stats,
            newPersonalBests: newBests
        };
    }

    /**
     * Get a summary suitable for display on the end screen.
     *
     * @returns {Object} Formatted summary object
     */
    static getSummary() {
        const stats = this.getStats();

        return {
            totalRuns: stats.totalRuns,
            winRate: stats.totalRuns > 0
                ? Math.round((stats.totalVictories / stats.totalRuns) * 100)
                : 0,
            totalPlayTime: this._formatDuration(stats.totalPlayTimeSeconds),
            totalKills: stats.totalEnemiesDestroyed,
            totalMerges: stats.totalMerges,
            bestTime: stats.personalBests.fastestVictory
                ? this._formatDuration(stats.personalBests.fastestVictory)
                : '--:--',
            highestWave: stats.personalBests.highestWave,
            currentStreak: stats.personalBests.currentWinStreak,
            bestStreak: stats.personalBests.longestWinStreak
        };
    }

    /**
     * Reset all statistics to defaults.
     * Use with caution - this cannot be undone!
     */
    static reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[StatsTracker] Stats reset to defaults');
        } catch (error) {
            console.warn('[StatsTracker] Failed to reset stats:', error);
        }
    }

    /**
     * Export stats as JSON string (for backup/sharing).
     *
     * @returns {string} JSON string of current stats
     */
    static export() {
        return JSON.stringify(this.getStats(), null, 2);
    }

    /**
     * Import stats from JSON string.
     * Validates structure before saving.
     *
     * @param {string} jsonString - JSON stats data
     * @returns {boolean} True if import succeeded
     */
    static import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);

            // Basic validation - ensure required fields exist
            if (typeof imported.totalRuns !== 'number') {
                throw new Error('Invalid stats format');
            }

            const merged = this._mergeWithDefaults(imported);
            this._saveStats(merged);
            console.log('[StatsTracker] Stats imported successfully');
            return true;
        } catch (error) {
            console.error('[StatsTracker] Failed to import stats:', error);
            return false;
        }
    }

    // ------------------------------------------------------------------------
    // PRIVATE HELPERS
    // ------------------------------------------------------------------------

    static _saveStats(stats) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        } catch (error) {
            console.warn('[StatsTracker] Failed to save stats:', error);
        }
    }

    static _deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static _mergeWithDefaults(stored) {
        const result = this._deepCopy(DEFAULT_STATS);

        // Shallow merge top-level
        Object.keys(stored).forEach(key => {
            if (key === 'personalBests') {
                // Deep merge personal bests
                Object.keys(stored.personalBests || {}).forEach(bestKey => {
                    if (result.personalBests.hasOwnProperty(bestKey)) {
                        result.personalBests[bestKey] = stored.personalBests[bestKey];
                    }
                });
            } else if (result.hasOwnProperty(key)) {
                result[key] = stored[key];
            }
        });

        return result;
    }

    static _formatDuration(seconds) {
        if (seconds === null || seconds === undefined) {
            return '--:--';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// ----------------------------------------------------------------------------
// CONVENIENCE FUNCTIONS (for quick access without class syntax)
// ----------------------------------------------------------------------------

export function recordRun(runData) {
    return StatsTracker.recordRun(runData);
}

export function getStats() {
    return StatsTracker.getStats();
}

export function getStatsSummary() {
    return StatsTracker.getSummary();
}

export function resetStats() {
    StatsTracker.reset();
}
