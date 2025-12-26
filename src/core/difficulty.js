/**
 * difficulty.js - Difficulty System
 *
 * Provides 3 difficulty tiers (Easy, Normal, Hard) with gameplay modifiers.
 * Players select difficulty at game start, affecting enemy stats, spawn rates, etc.
 *
 * DIFFICULTY TIERS:
 *   Easy:   Enemy HP -30%, Damage -25%, More pickups, Longer combo window
 *   Normal: Baseline (current balance)
 *   Hard:   Enemy HP +40%, Damage +30%, Fewer pickups, Shorter combo window
 *
 * INTEGRATION:
 *   Call getDifficultyModifiers(difficulty) to get multipliers for game systems.
 */

export const DIFFICULTY_TIERS = Object.freeze({
    EASY: {
        id: 'easy',
        name: 'Easy',
        description: 'Relaxed pace, forgiving combat',
        color: '#44ff44',
        modifiers: {
            enemyHp: 0.7,          // -30% enemy HP
            enemyDamage: 0.75,     // -25% enemy damage
            enemySpeed: 0.9,       // -10% enemy speed
            pickupSpawnRate: 1.3,  // +30% pickup spawn rate
            comboWindow: 1.5,      // +50% combo window (3 seconds instead of 2)
            playerHp: 1.2,         // +20% player HP
            bossEvery: 8           // Boss every 8 waves instead of 10
        }
    },
    NORMAL: {
        id: 'normal',
        name: 'Normal',
        description: 'Balanced challenge',
        color: '#ffcc00',
        modifiers: {
            enemyHp: 1.0,
            enemyDamage: 1.0,
            enemySpeed: 1.0,
            pickupSpawnRate: 1.0,
            comboWindow: 1.0,
            playerHp: 1.0,
            bossEvery: 10
        }
    },
    HARD: {
        id: 'hard',
        name: 'Hard',
        description: 'Brutal combat, scarce resources',
        color: '#ff4444',
        modifiers: {
            enemyHp: 1.4,          // +40% enemy HP
            enemyDamage: 1.3,      // +30% enemy damage
            enemySpeed: 1.1,       // +10% enemy speed
            pickupSpawnRate: 0.7,  // -30% pickup spawn rate
            comboWindow: 0.75,     // -25% combo window (1.5 seconds)
            playerHp: 0.9,         // -10% player HP
            bossEvery: 7           // Boss every 7 waves (more frequent)
        }
    },
    INSANE: {
        id: 'insane',
        name: 'Insane',
        description: 'For absolute mastery only',
        color: '#ff00ff',
        modifiers: {
            enemyHp: 1.8,          // +80% enemy HP
            enemyDamage: 1.6,      // +60% enemy damage
            enemySpeed: 1.2,       // +20% enemy speed
            pickupSpawnRate: 0.5,  // -50% pickup spawn rate
            comboWindow: 0.5,      // -50% combo window (1 second)
            playerHp: 0.8,         // -20% player HP
            bossEvery: 5           // Boss every 5 waves (very frequent)
        }
    }
});

/**
 * Get difficulty modifiers for the selected tier.
 * @param {string} difficultyId - 'easy', 'normal', or 'hard'
 * @returns {object} Modifier values
 */
export function getDifficultyModifiers(difficultyId = 'normal') {
    const tier = Object.values(DIFFICULTY_TIERS).find(t => t.id === difficultyId);
    return tier ? tier.modifiers : DIFFICULTY_TIERS.NORMAL.modifiers;
}

/**
 * Get difficulty tier info (for display).
 * @param {string} difficultyId - 'easy', 'normal', or 'hard'
 * @returns {object} Tier info
 */
export function getDifficultyInfo(difficultyId = 'normal') {
    const tier = Object.values(DIFFICULTY_TIERS).find(t => t.id === difficultyId);
    return tier || DIFFICULTY_TIERS.NORMAL;
}

/**
 * Get all difficulty tiers (for menu).
 * @returns {array} All tiers
 */
export function getAllDifficulties() {
    return Object.values(DIFFICULTY_TIERS);
}

/**
 * Apply difficulty modifiers to enemy stats.
 * @param {object} baseStats - Base enemy stats
 * @param {string} difficultyId - Selected difficulty
 * @returns {object} Modified stats
 */
export function applyDifficultyToEnemy(baseStats, difficultyId) {
    const mods = getDifficultyModifiers(difficultyId);
    return {
        ...baseStats,
        hp: Math.round(baseStats.hp * mods.enemyHp),
        damage: Math.round(baseStats.damage * mods.enemyDamage),
        speed: baseStats.speed * mods.enemySpeed
    };
}

/**
 * Save selected difficulty to localStorage.
 * @param {string} difficultyId - Selected difficulty
 */
export function saveDifficulty(difficultyId) {
    try {
        localStorage.setItem('ironspine_difficulty', difficultyId);
    } catch (err) {
        console.warn('Failed to save difficulty:', err);
    }
}

/**
 * Load selected difficulty from localStorage.
 * @returns {string} Saved difficulty or 'normal'
 */
export function loadDifficulty() {
    try {
        const saved = localStorage.getItem('ironspine_difficulty');
        if (saved && DIFFICULTY_TIERS[saved.toUpperCase()]) {
            return saved;
        }
    } catch (err) {
        console.warn('Failed to load difficulty:', err);
    }
    return 'normal';
}
