/**
 * achievements.js - Deep Achievement System with Rewards
 *
 * A comprehensive achievement system that:
 *   - Tracks player accomplishments across multiple categories
 *   - Provides ACTUAL REWARDS (damage bonuses, unlock cosmetics, etc.)
 *   - Uses tiered progression (Bronze -> Silver -> Gold -> Diamond)
 *   - Triggers dopamine responses with visual/audio cues
 *   - Persists to localStorage
 *
 * MONKEY BRAIN PSYCHOLOGY:
 *   - Small frequent unlocks keep players engaged
 *   - Tiered achievements create "just one more" loops
 *   - Visible progress bars show how close you are
 *   - Rewards that affect gameplay make achievements feel meaningful
 *   - Hidden achievements create discovery moments
 *   - Streak-based achievements encourage consistency
 *
 * REWARD TYPES:
 *   - damage_bonus: Permanent % damage increase
 *   - speed_bonus: Permanent % speed increase
 *   - starting_car: Start with an extra car
 *   - title: Unlockable player title
 *   - cosmetic: Visual effect unlock
 *
 * STORAGE KEY: 'ironspine_achievements_v2'
 *
 * EXTENSIBILITY:
 *   To add a new achievement:
 *   1. Add entry to appropriate category in ACHIEVEMENT_REGISTRY
 *   2. Include: id, name, tiers array, category, reward
 *   3. Each tier has: threshold, points, reward multiplier
 */

const STORAGE_KEY = 'ironspine_achievements_v2';

// ----------------------------------------------------------------------------
// TIER DEFINITIONS
// ----------------------------------------------------------------------------
// Visual styling and multipliers for each tier level
// ----------------------------------------------------------------------------

export const TIERS = {
    BRONZE: {
        level: 1,
        name: 'Bronze',
        color: '#cd7f32',
        symbol: '*',
        rewardMultiplier: 1.0
    },
    SILVER: {
        level: 2,
        name: 'Silver',
        color: '#c0c0c0',
        symbol: '**',
        rewardMultiplier: 1.5
    },
    GOLD: {
        level: 3,
        name: 'Gold',
        color: '#ffd700',
        symbol: '***',
        rewardMultiplier: 2.0
    },
    DIAMOND: {
        level: 4,
        name: 'Diamond',
        color: '#b9f2ff',
        symbol: '<>',
        rewardMultiplier: 3.0
    }
};

// ----------------------------------------------------------------------------
// REWARD DEFINITIONS
// ----------------------------------------------------------------------------
// What players get for achievements. These stack!
// ----------------------------------------------------------------------------

export const REWARD_TYPES = {
    DAMAGE_BONUS: 'damage_bonus',       // % increase to all damage
    SPEED_BONUS: 'speed_bonus',         // % increase to movement speed
    FIRE_RATE_BONUS: 'fire_rate_bonus', // % increase to fire rate
    RANGE_BONUS: 'range_bonus',         // % increase to weapon range
    HP_BONUS: 'hp_bonus',               // % increase to car HP
    CHARGE_BONUS: 'charge_bonus',       // % faster overdrive charge
    TITLE: 'title',                     // Unlockable title
    COSMETIC: 'cosmetic',               // Visual effect
    STARTING_CAR: 'starting_car'        // Extra car at start
};

// ----------------------------------------------------------------------------
// ACHIEVEMENT REGISTRY
// ----------------------------------------------------------------------------
// All achievements organized by category. Each has tiered progression.
// The check function receives (runData, stats) and returns current value.
// ----------------------------------------------------------------------------

export const ACHIEVEMENT_REGISTRY = {

    // ========================================================================
    // COMBAT - Damage and kills
    // ========================================================================
    combat: [
        {
            id: 'total_kills',
            name: 'Exterminator',
            description: 'Total enemies destroyed',
            icon: 'X',
            getValue: (run, stats) => stats.totalEnemiesDestroyed,
            tiers: [
                { threshold: 10, points: 5 },
                { threshold: 100, points: 15 },
                { threshold: 500, points: 30 },
                { threshold: 2000, points: 75 }
            ],
            reward: { type: REWARD_TYPES.DAMAGE_BONUS, value: 1 } // +1% per tier
        },
        {
            id: 'run_kills',
            name: 'Killing Spree',
            description: 'Most kills in a single run',
            icon: 'K',
            getValue: (run) => run.enemiesDestroyed,
            tiers: [
                { threshold: 25, points: 10 },
                { threshold: 50, points: 20 },
                { threshold: 100, points: 40 },
                { threshold: 200, points: 80 }
            ],
            reward: { type: REWARD_TYPES.FIRE_RATE_BONUS, value: 1 }
        },
        {
            id: 'boss_kills',
            name: 'Boss Hunter',
            description: 'Boss enemies defeated (wave 10, 20)',
            icon: 'B',
            getValue: (run, stats) => Math.floor(stats.totalWavesCleared / 10),
            tiers: [
                { threshold: 1, points: 15 },
                { threshold: 5, points: 30 },
                { threshold: 20, points: 60 },
                { threshold: 50, points: 100 }
            ],
            reward: { type: REWARD_TYPES.DAMAGE_BONUS, value: 2 }
        },
        {
            id: 'champion_kills',
            name: 'Champion Slayer',
            description: 'Champion enemies defeated (wave 5, 15)',
            icon: 'C',
            getValue: (run, stats) => Math.floor(stats.totalWavesCleared / 5),
            tiers: [
                { threshold: 2, points: 10 },
                { threshold: 10, points: 25 },
                { threshold: 40, points: 50 },
                { threshold: 100, points: 100 }
            ],
            reward: { type: REWARD_TYPES.RANGE_BONUS, value: 1 }
        },
        {
            id: 'pulse_kills',
            name: 'Pulse Master',
            description: 'Enemies hit by Overdrive Pulse',
            icon: 'P',
            getValue: (run, stats) => stats.totalPulseHits || 0,
            tiers: [
                { threshold: 10, points: 10 },
                { threshold: 50, points: 25 },
                { threshold: 200, points: 50 },
                { threshold: 500, points: 100 }
            ],
            reward: { type: REWARD_TYPES.CHARGE_BONUS, value: 2 }
        }
    ],

    // ========================================================================
    // SURVIVAL - Staying alive and winning
    // ========================================================================
    survival: [
        {
            id: 'total_victories',
            name: 'Victorious',
            description: 'Total runs won',
            icon: 'W',
            getValue: (run, stats) => stats.totalVictories,
            tiers: [
                { threshold: 1, points: 25 },
                { threshold: 5, points: 50 },
                { threshold: 20, points: 100 },
                { threshold: 50, points: 200 }
            ],
            reward: { type: REWARD_TYPES.HP_BONUS, value: 2 }
        },
        {
            id: 'total_waves',
            name: 'Wave Crusher',
            description: 'Total waves cleared',
            icon: '#',
            getValue: (run, stats) => stats.totalWavesCleared,
            tiers: [
                { threshold: 20, points: 10 },
                { threshold: 100, points: 30 },
                { threshold: 500, points: 75 },
                { threshold: 2000, points: 150 }
            ],
            reward: { type: REWARD_TYPES.SPEED_BONUS, value: 1 }
        },
        {
            id: 'highest_wave',
            name: 'Wave Record',
            description: 'Highest wave reached',
            icon: '^',
            getValue: (run, stats) => stats.personalBests?.highestWave || run.wavesCleared,
            tiers: [
                { threshold: 10, points: 15 },
                { threshold: 20, points: 50 },
                { threshold: 25, points: 100 }, // For endless mode
                { threshold: 50, points: 200 }
            ],
            reward: { type: REWARD_TYPES.DAMAGE_BONUS, value: 2 }
        },
        {
            id: 'win_streak',
            name: 'Unstoppable',
            description: 'Consecutive victories',
            icon: '!',
            getValue: (run, stats) => stats.personalBests?.longestWinStreak || 0,
            tiers: [
                { threshold: 2, points: 20 },
                { threshold: 5, points: 50 },
                { threshold: 10, points: 100 },
                { threshold: 20, points: 200 }
            ],
            reward: { type: REWARD_TYPES.STARTING_CAR, value: 1 } // Extra starting car!
        },
        {
            id: 'flawless_run',
            name: 'Flawless',
            description: 'Win without losing any cars',
            icon: 'F',
            getValue: (run) => (run.result === 'victory' && run.carsLost === 0) ? 1 : 0,
            tiers: [
                { threshold: 1, points: 100 }
            ],
            reward: { type: REWARD_TYPES.TITLE, value: 'The Untouchable' }
        },
        {
            id: 'total_playtime',
            name: 'Dedicated',
            description: 'Total time played (minutes)',
            icon: 'T',
            getValue: (run, stats) => Math.floor(stats.totalPlayTimeSeconds / 60),
            tiers: [
                { threshold: 30, points: 15 },
                { threshold: 120, points: 40 },
                { threshold: 300, points: 80 },
                { threshold: 600, points: 150 }
            ],
            reward: { type: REWARD_TYPES.HP_BONUS, value: 1 }
        }
    ],

    // ========================================================================
    // SPEED - Time-based achievements
    // ========================================================================
    speed: [
        {
            id: 'fast_victory',
            name: 'Speedrunner',
            description: 'Fastest victory time (seconds)',
            icon: 'S',
            getValue: (run, stats) => {
                if (run.result !== 'victory') return Infinity;
                const best = stats.personalBests?.fastestVictory;
                return best ? Math.min(best, run.timeSurvived) : run.timeSurvived;
            },
            tiers: [
                { threshold: 180, points: 25, compare: '<=' },   // Under 3 min
                { threshold: 150, points: 50, compare: '<=' },   // Under 2:30
                { threshold: 120, points: 100, compare: '<=' },  // Under 2 min
                { threshold: 90, points: 200, compare: '<=' }    // Under 1:30
            ],
            reward: { type: REWARD_TYPES.SPEED_BONUS, value: 2 }
        },
        {
            id: 'long_survival',
            name: 'Survivor',
            description: 'Longest single run (minutes)',
            icon: 'L',
            getValue: (run, stats) => Math.floor((stats.personalBests?.longestRun || run.timeSurvived) / 60),
            tiers: [
                { threshold: 3, points: 15 },
                { threshold: 5, points: 30 },
                { threshold: 10, points: 75 },
                { threshold: 20, points: 150 }
            ],
            reward: { type: REWARD_TYPES.HP_BONUS, value: 2 }
        }
    ],

    // ========================================================================
    // COLLECTION - Cars and merges
    // ========================================================================
    collection: [
        {
            id: 'total_cars',
            name: 'Collector',
            description: 'Total cars collected',
            icon: '+',
            getValue: (run, stats) => stats.totalCarsCollected,
            tiers: [
                { threshold: 25, points: 10 },
                { threshold: 100, points: 25 },
                { threshold: 500, points: 60 },
                { threshold: 2000, points: 120 }
            ],
            reward: { type: REWARD_TYPES.SPEED_BONUS, value: 1 }
        },
        {
            id: 'run_cars',
            name: 'Hoarder',
            description: 'Most cars in a single run',
            icon: 'H',
            getValue: (run) => run.carsCollected,
            tiers: [
                { threshold: 10, points: 15 },
                { threshold: 20, points: 35 },
                { threshold: 35, points: 70 },
                { threshold: 50, points: 140 }
            ],
            reward: { type: REWARD_TYPES.RANGE_BONUS, value: 1 }
        },
        {
            id: 'total_merges',
            name: 'Fusion Expert',
            description: 'Total merges completed',
            icon: '=',
            getValue: (run, stats) => stats.totalMerges,
            tiers: [
                { threshold: 10, points: 10 },
                { threshold: 50, points: 30 },
                { threshold: 200, points: 70 },
                { threshold: 1000, points: 150 }
            ],
            reward: { type: REWARD_TYPES.DAMAGE_BONUS, value: 1 }
        },
        {
            id: 'run_merges',
            name: 'Merge Maniac',
            description: 'Most merges in a single run',
            icon: 'M',
            getValue: (run) => run.mergesCompleted,
            tiers: [
                { threshold: 5, points: 15 },
                { threshold: 10, points: 35 },
                { threshold: 20, points: 75 },
                { threshold: 30, points: 150 }
            ],
            reward: { type: REWARD_TYPES.FIRE_RATE_BONUS, value: 1 }
        },
        {
            id: 'highest_tier',
            name: 'Power Level',
            description: 'Highest car tier achieved',
            icon: '>',
            getValue: (run, stats) => Math.max(stats.personalBests?.highestTier || 0, run.highestTier),
            tiers: [
                { threshold: 2, points: 10 },
                { threshold: 3, points: 30 },
                { threshold: 4, points: 75 },
                { threshold: 5, points: 150 }
            ],
            reward: { type: REWARD_TYPES.DAMAGE_BONUS, value: 3 }
        }
    ],

    // ========================================================================
    // MASTERY - Skill and consistency
    // ========================================================================
    mastery: [
        {
            id: 'total_runs',
            name: 'Persistent',
            description: 'Total runs played',
            icon: 'R',
            getValue: (run, stats) => stats.totalRuns,
            tiers: [
                { threshold: 10, points: 15 },
                { threshold: 50, points: 40 },
                { threshold: 100, points: 80 },
                { threshold: 250, points: 175 }
            ],
            reward: { type: REWARD_TYPES.CHARGE_BONUS, value: 1 }
        },
        {
            id: 'efficiency',
            name: 'Efficient',
            description: 'Kills per minute in a run',
            icon: 'E',
            getValue: (run) => {
                if (run.timeSurvived < 60) return 0;
                return Math.floor(run.enemiesDestroyed / (run.timeSurvived / 60));
            },
            tiers: [
                { threshold: 20, points: 20 },
                { threshold: 35, points: 50 },
                { threshold: 50, points: 100 },
                { threshold: 75, points: 200 }
            ],
            reward: { type: REWARD_TYPES.FIRE_RATE_BONUS, value: 2 }
        },
        {
            id: 'win_rate',
            name: 'Consistent',
            description: 'Win rate percentage (min 10 runs)',
            icon: '%',
            getValue: (run, stats) => {
                if (stats.totalRuns < 10) return 0;
                return Math.floor((stats.totalVictories / stats.totalRuns) * 100);
            },
            tiers: [
                { threshold: 50, points: 30 },
                { threshold: 70, points: 75 },
                { threshold: 85, points: 150 },
                { threshold: 95, points: 300 }
            ],
            reward: { type: REWARD_TYPES.HP_BONUS, value: 3 }
        }
    ],

    // ========================================================================
    // HIDDEN - Secret achievements
    // ========================================================================
    hidden: [
        {
            id: 'quick_death',
            name: 'Speed Fail',
            description: 'Die within 10 seconds',
            icon: '?',
            hidden: true,
            getValue: (run) => (run.result === 'defeat' && run.timeSurvived < 10) ? 1 : 0,
            tiers: [{ threshold: 1, points: 5 }],
            reward: { type: REWARD_TYPES.TITLE, value: 'The Reckless' }
        },
        {
            id: 'no_merge',
            name: 'Purist',
            description: 'Win without merging any cars',
            icon: '?',
            hidden: true,
            getValue: (run) => (run.result === 'victory' && run.mergesCompleted === 0) ? 1 : 0,
            tiers: [{ threshold: 1, points: 100 }],
            reward: { type: REWARD_TYPES.TITLE, value: 'The Purist' }
        },
        {
            id: 'minimal_win',
            name: 'Minimalist',
            description: 'Win with only 1 car',
            icon: '?',
            hidden: true,
            getValue: (run) => (run.result === 'victory' && run.finalCarCount === 1) ? 1 : 0,
            tiers: [{ threshold: 1, points: 200 }],
            reward: { type: REWARD_TYPES.TITLE, value: 'The Lone Wolf' }
        },
        {
            id: 'comeback',
            name: 'Comeback Kid',
            description: 'Win after reaching wave 15 with only engine remaining',
            icon: '?',
            hidden: true,
            getValue: () => 0, // Requires special tracking
            tiers: [{ threshold: 1, points: 150 }],
            reward: { type: REWARD_TYPES.TITLE, value: 'The Phoenix' }
        }
    ]
};

// ----------------------------------------------------------------------------
// ACHIEVEMENT NOTIFICATION QUEUE
// ----------------------------------------------------------------------------
// Stores pending notifications for the UI to display
// ----------------------------------------------------------------------------

let notificationQueue = [];

export function getNotificationQueue() {
    return notificationQueue;
}

export function clearNotificationQueue() {
    notificationQueue = [];
}

export function popNotification() {
    return notificationQueue.shift();
}

// ----------------------------------------------------------------------------
// ACHIEVEMENT TRACKER CLASS
// ----------------------------------------------------------------------------

export class AchievementTracker {
    /**
     * Get all unlocked achievements from storage.
     * Returns: { [achievementId]: tierLevel }
     */
    static getUnlocked() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return {};
            return JSON.parse(stored);
        } catch (error) {
            console.warn('[Achievements] Failed to load:', error);
            return {};
        }
    }

    /**
     * Check all achievements after a run and return newly unlocked ones.
     *
     * @param {Object} runData - Data from completed run
     * @param {Object} stats - Current stats from StatsTracker
     * @returns {Array} Array of { achievement, newTier, tierData } objects
     */
    static checkAll(runData, stats) {
        const unlocked = this.getUnlocked();
        const newUnlocks = [];

        // Iterate all categories
        Object.values(ACHIEVEMENT_REGISTRY).forEach(categoryAchievements => {
            categoryAchievements.forEach(achievement => {
                const currentValue = achievement.getValue(runData, stats);
                const currentTier = unlocked[achievement.id] || 0;

                // Check each tier
                achievement.tiers.forEach((tierData, tierIndex) => {
                    const tierLevel = tierIndex + 1;

                    // Skip already unlocked tiers
                    if (tierLevel <= currentTier) return;

                    // Check if threshold is met
                    const compare = tierData.compare || '>=';
                    let earned = false;

                    if (compare === '>=') {
                        earned = currentValue >= tierData.threshold;
                    } else if (compare === '<=') {
                        earned = currentValue <= tierData.threshold && currentValue > 0;
                    }

                    if (earned) {
                        // Unlock this tier
                        unlocked[achievement.id] = tierLevel;

                        const tierInfo = Object.values(TIERS)[tierIndex] || TIERS.BRONZE;

                        newUnlocks.push({
                            achievement,
                            newTier: tierLevel,
                            tierData,
                            tierInfo
                        });

                        // Add to notification queue
                        notificationQueue.push({
                            type: 'achievement',
                            achievement,
                            tier: tierLevel,
                            tierInfo,
                            points: tierData.points,
                            reward: achievement.reward
                        });

                        console.log(
                            `[Achievement] ${tierInfo.symbol} ${achievement.name} - ${tierInfo.name}!`
                        );
                    }
                });
            });
        });

        // Save updated unlocks
        if (newUnlocks.length > 0) {
            this._save(unlocked);
        }

        return newUnlocks;
    }

    /**
     * Get all achievements with current progress.
     *
     * @param {Object} stats - Current stats for progress calculation
     * @returns {Object} Achievements grouped by category with progress
     */
    static getAllWithProgress(stats) {
        const unlocked = this.getUnlocked();
        const result = {};

        Object.entries(ACHIEVEMENT_REGISTRY).forEach(([category, achievements]) => {
            result[category] = achievements.map(achievement => {
                const currentTier = unlocked[achievement.id] || 0;
                const nextTier = achievement.tiers[currentTier]; // Next to unlock
                const currentValue = stats ? achievement.getValue({}, stats) : 0;

                return {
                    ...achievement,
                    currentTier,
                    maxTier: achievement.tiers.length,
                    currentValue,
                    nextThreshold: nextTier?.threshold || null,
                    progress: nextTier
                        ? Math.min(100, Math.floor((currentValue / nextTier.threshold) * 100))
                        : 100,
                    isMaxed: currentTier >= achievement.tiers.length,
                    displayDescription: achievement.hidden && currentTier === 0
                        ? '???'
                        : achievement.description
                };
            });
        });

        return result;
    }

    /**
     * Calculate total active bonuses from unlocked achievements.
     *
     * @returns {Object} Bonus values by type
     */
    static getActiveBonuses() {
        const unlocked = this.getUnlocked();
        const bonuses = {
            [REWARD_TYPES.DAMAGE_BONUS]: 0,
            [REWARD_TYPES.SPEED_BONUS]: 0,
            [REWARD_TYPES.FIRE_RATE_BONUS]: 0,
            [REWARD_TYPES.RANGE_BONUS]: 0,
            [REWARD_TYPES.HP_BONUS]: 0,
            [REWARD_TYPES.CHARGE_BONUS]: 0,
            [REWARD_TYPES.STARTING_CAR]: 0,
            titles: [],
            cosmetics: []
        };

        Object.values(ACHIEVEMENT_REGISTRY).forEach(categoryAchievements => {
            categoryAchievements.forEach(achievement => {
                const tierLevel = unlocked[achievement.id] || 0;

                if (tierLevel > 0 && achievement.reward) {
                    const tierInfo = Object.values(TIERS)[tierLevel - 1] || TIERS.BRONZE;
                    const multiplier = tierInfo.rewardMultiplier;

                    if (achievement.reward.type === REWARD_TYPES.TITLE) {
                        bonuses.titles.push(achievement.reward.value);
                    } else if (achievement.reward.type === REWARD_TYPES.COSMETIC) {
                        bonuses.cosmetics.push(achievement.reward.value);
                    } else {
                        // Numeric bonus - multiply by tier multiplier
                        const baseValue = achievement.reward.value * tierLevel;
                        bonuses[achievement.reward.type] += baseValue * multiplier;
                    }
                }
            });
        });

        // Round bonuses
        Object.keys(bonuses).forEach(key => {
            if (typeof bonuses[key] === 'number') {
                bonuses[key] = Math.round(bonuses[key] * 10) / 10;
            }
        });

        return bonuses;
    }

    /**
     * Get summary stats for achievements.
     */
    static getSummary() {
        const unlocked = this.getUnlocked();
        let totalPoints = 0;
        let earnedPoints = 0;
        let totalAchievements = 0;
        let completedAchievements = 0;

        Object.values(ACHIEVEMENT_REGISTRY).forEach(categoryAchievements => {
            categoryAchievements.forEach(achievement => {
                const tierLevel = unlocked[achievement.id] || 0;
                totalAchievements++;

                if (tierLevel >= achievement.tiers.length) {
                    completedAchievements++;
                }

                achievement.tiers.forEach((tierData, index) => {
                    totalPoints += tierData.points;
                    if (index < tierLevel) {
                        earnedPoints += tierData.points;
                    }
                });
            });
        });

        return {
            earnedPoints,
            totalPoints,
            completedAchievements,
            totalAchievements,
            percentComplete: Math.round((earnedPoints / totalPoints) * 100)
        };
    }

    /**
     * Reset all achievements.
     */
    static reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            notificationQueue = [];
            console.log('[Achievements] Reset complete');
        } catch (error) {
            console.warn('[Achievements] Failed to reset:', error);
        }
    }

    static _save(unlocked) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
        } catch (error) {
            console.warn('[Achievements] Failed to save:', error);
        }
    }
}

// ----------------------------------------------------------------------------
// ACHIEVEMENT NOTIFICATION RENDERER
// ----------------------------------------------------------------------------
// Call this from your game to show achievement popups
// ----------------------------------------------------------------------------

export function createAchievementPopup(scene, notification) {
    const { achievement, tierInfo, points } = notification;
    const { width, height } = scene.scale;

    // Container for the popup
    const container = scene.add.container(width * 0.5, -80);
    container.setDepth(1000);
    container.setScrollFactor(0);

    // Background
    const bg = scene.add.rectangle(0, 0, 280, 70, 0x000000, 0.85);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(tierInfo.color).color);
    container.add(bg);

    // Tier symbol
    const symbol = scene.add.text(-120, 0, tierInfo.symbol, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '28px',
        color: tierInfo.color,
        fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(symbol);

    // Achievement name
    const name = scene.add.text(-80, -12, achievement.name, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(name);

    // Tier name
    const tier = scene.add.text(-80, 12, `${tierInfo.name} - +${points} pts`, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '14px',
        color: tierInfo.color
    }).setOrigin(0, 0.5);
    container.add(tier);

    // Animate in
    scene.tweens.add({
        targets: container,
        y: 60,
        duration: 400,
        ease: 'Back.easeOut'
    });

    // Hold, then animate out
    scene.tweens.add({
        targets: container,
        y: -80,
        duration: 300,
        delay: 2500,
        ease: 'Power2',
        onComplete: () => container.destroy()
    });

    return container;
}

// ----------------------------------------------------------------------------
// CONVENIENCE EXPORTS
// ----------------------------------------------------------------------------

export function checkAchievements(runData, stats) {
    return AchievementTracker.checkAll(runData, stats);
}

export function getAchievementBonuses() {
    return AchievementTracker.getActiveBonuses();
}

export function getAchievementSummary() {
    return AchievementTracker.getSummary();
}
