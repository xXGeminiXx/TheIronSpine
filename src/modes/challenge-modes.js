/**
 * challenge-modes.js - Challenge Mode System
 *
 * Provides specialized game modes with unique modifiers and rewards.
 * Each challenge mode changes core gameplay parameters to create
 * distinct experiences and test different player skills.
 *
 * CHALLENGE TYPES:
 *   - Speed Run: Fast-paced 10-wave blitz with time rewards
 *   - Purist: No pickups after wave 5, rewards smart car management
 *   - Glass Cannon: 1 HP everything, 3x damage, ultimate precision test
 *   - Color Lock: Single color only, forces mastery of one weapon type
 *
 * MODIFIERS:
 *   - waveCount: Override total waves to win
 *   - spawnRateMultiplier: Increase enemy spawn rate
 *   - playerHpMultiplier: Scale player HP
 *   - playerDamageMultiplier: Scale player damage output
 *   - enemyHpMultiplier: Scale enemy HP
 *   - pickupsDisabledAfterWave: Disable pickup spawns after N waves
 *   - lockedColor: Restrict spawns to single color
 *   - rewardMultiplier: Bonus multiplier for achievements/scrap
 *
 * STORAGE: Challenge completion tracked in achievements system
 */

/**
 * ChallengeMode class - Represents a single challenge configuration
 */
export class ChallengeMode {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '⚔️';

        // Gameplay modifiers
        this.waveCount = config.waveCount || null;
        this.spawnRateMultiplier = config.spawnRateMultiplier || 1.0;
        this.playerHpMultiplier = config.playerHpMultiplier || 1.0;
        this.playerDamageMultiplier = config.playerDamageMultiplier || 1.0;
        this.enemyHpMultiplier = config.enemyHpMultiplier || 1.0;
        this.pickupsDisabledAfterWave = config.pickupsDisabledAfterWave || null;
        this.lockedColor = config.lockedColor || null;

        // Reward system
        this.rewardMultiplier = config.rewardMultiplier || 1.0;
        this.achievementId = config.achievementId || null;
        this.rewardDescription = config.rewardDescription || '';
    }

    /**
     * Apply this challenge mode's modifiers to game systems.
     * @param {Object} gameScene - The GameScene instance
     */
    applyModifiers(gameScene) {
        // Store original values for restoration
        if (!gameScene.registry.has('originalWaveCount')) {
            const WAVES = gameScene.game.config.WAVES || {};
            gameScene.registry.set('originalWaveCount', WAVES.totalToWin || 20);
        }

        // Apply wave count override
        if (this.waveCount !== null) {
            // This will be read by spawner during initialization
            gameScene.registry.set('challengeWaveCount', this.waveCount);
        }

        // Apply spawn rate multiplier
        if (gameScene.spawner && this.spawnRateMultiplier !== 1.0) {
            gameScene.spawner.spawnRateMultiplier = this.spawnRateMultiplier;
        }

        // Apply player HP multiplier
        if (gameScene.train && this.playerHpMultiplier !== 1.0) {
            const currentMultiplier = gameScene.train.hpMultiplier || 1.0;
            gameScene.train.setHpMultiplier(currentMultiplier * this.playerHpMultiplier);
        }

        // Apply player damage multiplier
        if (gameScene.combatSystem && this.playerDamageMultiplier !== 1.0) {
            const bonuses = gameScene.bonusMultipliers || {};
            bonuses.damage = (bonuses.damage || 1.0) * this.playerDamageMultiplier;
            gameScene.combatSystem.setBonusMultipliers(bonuses);
        }

        // Apply enemy HP multiplier
        if (gameScene.combatSystem && this.enemyHpMultiplier !== 1.0) {
            gameScene.combatSystem.enemyHpMultiplier = this.enemyHpMultiplier;
        }

        // Configure pickup disabling
        if (this.pickupsDisabledAfterWave !== null && gameScene.spawner) {
            gameScene.spawner.pickupsDisabledAfterWave = this.pickupsDisabledAfterWave;
        }

        // Configure color lock
        if (this.lockedColor !== null && gameScene.spawner) {
            gameScene.spawner.lockedColor = this.lockedColor;
        }

        // Store reward multiplier for end screen
        gameScene.registry.set('challengeRewardMultiplier', this.rewardMultiplier);
        gameScene.registry.set('challengeMode', this.id);
    }

    /**
     * Get the display info for this challenge (for menu UI).
     * @returns {Object} Display info
     */
    getDisplayInfo() {
        return {
            name: this.name,
            description: this.description,
            icon: this.icon,
            reward: this.rewardDescription,
            modifiers: this.getModifierSummary()
        };
    }

    /**
     * Get a human-readable summary of modifiers.
     * @returns {string[]} Array of modifier descriptions
     */
    getModifierSummary() {
        const mods = [];

        if (this.waveCount !== null) {
            mods.push(`${this.waveCount} waves`);
        }

        if (this.spawnRateMultiplier > 1.0) {
            mods.push(`${Math.round(this.spawnRateMultiplier * 100)}% spawn rate`);
        }

        if (this.playerDamageMultiplier !== 1.0) {
            mods.push(`${Math.round(this.playerDamageMultiplier * 100)}% damage`);
        }

        if (this.playerHpMultiplier !== 1.0) {
            mods.push(`${Math.round(this.playerHpMultiplier * 100)}% HP`);
        }

        if (this.pickupsDisabledAfterWave !== null) {
            mods.push(`No pickups after wave ${this.pickupsDisabledAfterWave}`);
        }

        if (this.lockedColor !== null) {
            mods.push(`${this.lockedColor.toUpperCase()} only`);
        }

        return mods;
    }
}

/**
 * Challenge Mode Registry - All available challenges
 */
export const CHALLENGE_MODES = {
    SPEED_RUN: new ChallengeMode({
        id: 'speed_run',
        name: 'Speed Run',
        description: 'Blitz through 10 waves as fast as possible. High spawn rate, time bonus rewards.',
        icon: '⚡',
        waveCount: 10,
        spawnRateMultiplier: 2.0,
        rewardMultiplier: 1.5,
        achievementId: 'speed_demon',
        rewardDescription: 'Time Bonus + 1.5x Scrap'
    }),

    PURIST: new ChallengeMode({
        id: 'purist',
        name: 'Purist',
        description: 'No pickups spawn after wave 5. Manage your cars wisely or perish.',
        icon: '🎯',
        pickupsDisabledAfterWave: 5,
        rewardMultiplier: 2.0,
        achievementId: 'purist_master',
        rewardDescription: '2x Scrap'
    }),

    GLASS_CANNON: new ChallengeMode({
        id: 'glass_cannon',
        name: 'Glass Cannon',
        description: 'Everything has 1 HP. You deal 3x damage, but one hit and you\'re done.',
        icon: '💀',
        playerHpMultiplier: 0.018, // ~1 HP (from base 55)
        playerDamageMultiplier: 3.0,
        enemyHpMultiplier: 0.067, // ~1 HP for skirmishers (from base 15)
        rewardMultiplier: 1.0,
        achievementId: 'glass_cannon_survivor',
        rewardDescription: 'Achievement Unlock'
    }),

    COLOR_LOCK_RED: new ChallengeMode({
        id: 'color_lock_red',
        name: 'Red Lock',
        description: 'Only red weapon cars spawn. Master the machinegun or fail.',
        icon: '🔴',
        lockedColor: 'red',
        rewardMultiplier: 1.0,
        achievementId: 'red_specialist',
        rewardDescription: 'Achievement Unlock'
    }),

    COLOR_LOCK_BLUE: new ChallengeMode({
        id: 'color_lock_blue',
        name: 'Blue Lock',
        description: 'Only blue weapon cars spawn. Freeze or be frozen.',
        icon: '🔵',
        lockedColor: 'blue',
        rewardMultiplier: 1.0,
        achievementId: 'blue_specialist',
        rewardDescription: 'Achievement Unlock'
    }),

    COLOR_LOCK_YELLOW: new ChallengeMode({
        id: 'color_lock_yellow',
        name: 'Yellow Lock',
        description: 'Only yellow weapon cars spawn. Precision armor-piercing required.',
        icon: '🟡',
        lockedColor: 'yellow',
        rewardMultiplier: 1.0,
        achievementId: 'yellow_specialist',
        rewardDescription: 'Achievement Unlock'
    }),

    COLOR_LOCK_PURPLE: new ChallengeMode({
        id: 'color_lock_purple',
        name: 'Purple Lock',
        description: 'Only purple weapon cars spawn. Arc lightning everything.',
        icon: '🟣',
        lockedColor: 'purple',
        rewardMultiplier: 1.0,
        achievementId: 'purple_specialist',
        rewardDescription: 'Achievement Unlock'
    }),

    COLOR_LOCK_ORANGE: new ChallengeMode({
        id: 'color_lock_orange',
        name: 'Orange Lock',
        description: 'Only orange weapon cars spawn. Explosive artillery mode.',
        icon: '🟠',
        lockedColor: 'orange',
        rewardMultiplier: 1.0,
        achievementId: 'orange_specialist',
        rewardDescription: 'Achievement Unlock'
    })
};

/**
 * Get a challenge mode by ID.
 * @param {string} id - Challenge mode ID
 * @returns {ChallengeMode|null} The challenge mode or null if not found
 */
export function getChallengeMode(id) {
    const key = Object.keys(CHALLENGE_MODES).find(
        k => CHALLENGE_MODES[k].id === id
    );
    return key ? CHALLENGE_MODES[key] : null;
}

/**
 * Get all challenge modes as an array.
 * @returns {ChallengeMode[]} Array of all challenge modes
 */
export function getAllChallengeModes() {
    return Object.values(CHALLENGE_MODES);
}

/**
 * Check if a challenge mode is completed.
 * @param {string} modeId - Challenge mode ID
 * @returns {boolean} True if completed
 */
export function isChallengeCompleted(modeId) {
    const mode = getChallengeMode(modeId);
    if (!mode || !mode.achievementId) {
        return false;
    }

    // Check if achievement is unlocked
    // This will integrate with the achievements system
    const achievements = JSON.parse(
        localStorage.getItem('ironspine_achievements_v2') || '{}'
    );

    return achievements[mode.achievementId]?.unlocked || false;
}

/**
 * Record challenge mode completion.
 * @param {string} modeId - Challenge mode ID
 * @param {Object} stats - Run statistics
 */
export function recordChallengeCompletion(modeId, stats) {
    const mode = getChallengeMode(modeId);
    if (!mode || !mode.achievementId) {
        return;
    }

    // This will be handled by the achievements system
    // Store completion flag for now
    const completions = JSON.parse(
        localStorage.getItem('ironspine_challenge_completions') || '{}'
    );

    completions[modeId] = {
        completed: true,
        timestamp: Date.now(),
        stats: {
            time: stats.timeSurvived,
            waves: stats.wavesCleared,
            kills: stats.enemiesDestroyed
        }
    };

    localStorage.setItem(
        'ironspine_challenge_completions',
        JSON.stringify(completions)
    );
}
