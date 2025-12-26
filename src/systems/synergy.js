/**
 * synergy.js - Color Synergy Bonus System
 *
 * Rewards diverse train compositions with team-up effects between colors.
 * Scans train state each frame and applies temporary buffs when synergy
 * conditions are met.
 *
 * SYNERGIES:
 *   Red + Blue:    Frozen targets take +25% damage from Red weapons
 *   Blue + Yellow: Yellow projectiles freeze on pierce (full stop)
 *   Red + Yellow:  Yellow explosions ignite targets (DoT effect)
 *   Tri-Force:     All 3 colors present → all weapons +15% fire rate
 *
 * DESIGN PRINCIPLES:
 *   - Encourages color diversity (avoid mono-color stacking)
 *   - Rewards composition planning
 *   - Visual feedback (icons + effects)
 *   - Clear mechanical benefits
 *
 * INTEGRATION:
 *   1. Create SynergyManager in game-scene.js
 *   2. Call update(deltaSeconds) each frame
 *   3. Combat system queries active synergies for damage/effect modifiers
 *   4. HUD displays active synergy icons
 */

import { COLORS } from '../config.js';

/**
 * Synergy configuration with thresholds and effects.
 * Each synergy requires a minimum count per color to activate.
 */
export const SYNERGY_CONFIG = Object.freeze({
    // Red + Blue: Frozen enemies take bonus damage from Red weapons
    redBlue: {
        name: 'Frost Shatter',
        requiredColors: { red: 2, blue: 2 },
        effects: {
            // Red weapons deal +25% damage to frozen/slowed enemies
            redBonusVsFrozen: 0.25
        },
        icon: '❄️🔴',
        description: 'Red weapons deal +25% damage to frozen targets'
    },

    // Blue + Yellow: Yellow pierces freeze enemies completely
    blueYellow: {
        name: 'Cryo Pierce',
        requiredColors: { blue: 2, yellow: 2 },
        effects: {
            // Yellow projectiles apply full freeze on armor pierce
            yellowFreezeOnPierce: true,
            freezeDuration: 2.0,
            freezePercent: 0.8  // 80% slow
        },
        icon: '❄️🟡',
        description: 'Yellow armor-piercing shots freeze enemies'
    },

    // Red + Yellow: Yellow explosions ignite enemies (DoT)
    redYellow: {
        name: 'Ignition',
        requiredColors: { red: 2, yellow: 2 },
        effects: {
            // Yellow explosions apply burning DoT
            yellowIgniteOnHit: true,
            igniteDamagePerSecond: 5,
            igniteDuration: 3.0
        },
        icon: '🔥🟡',
        description: 'Yellow explosions ignite enemies (5 dmg/sec for 3s)'
    },

    // Tri-Force: All 3 colors present (2+ each)
    triForce: {
        name: 'Tri-Force',
        requiredColors: { red: 2, blue: 2, yellow: 2 },
        effects: {
            // All weapons gain +15% fire rate
            globalFireRateBonus: 0.15
        },
        icon: '⚡',
        description: 'All weapons +15% fire rate'
    }
});

export class SynergyManager {
    constructor(train, eventHandlers = {}) {
        this.train = train;
        this.eventHandlers = eventHandlers;

        // Active synergies (updated each frame)
        this.activeSynergies = new Set();

        // Previous frame's synergies (for change detection)
        this.previousSynergies = new Set();

        // Color counts from last scan
        this.colorCounts = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };

        // Cached effects for quick lookups
        this.cachedEffects = {};
    }

    /**
     * Update synergy state based on current train composition.
     * Call this each frame before combat update.
     * @param {number} deltaSeconds - Time elapsed since last frame
     */
    update(deltaSeconds) {
        // Scan train composition
        this.scanTrainComposition();

        // Check synergy conditions
        this.checkSynergies();

        // Apply cached effects for combat system
        this.updateEffectCache();

        // Notify listeners of synergy changes
        this.notifySynergyChanges();
    }

    /**
     * Scan current train composition and count cars per color.
     */
    scanTrainComposition() {
        const cars = this.train.getWeaponCars();

        // Reset counts
        this.colorCounts = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };

        // Count cars per color
        for (const car of cars) {
            if (car.colorKey && this.colorCounts.hasOwnProperty(car.colorKey)) {
                this.colorCounts[car.colorKey] += 1;
            }
        }
    }

    /**
     * Check all synergy conditions and update active set.
     */
    checkSynergies() {
        // Store previous state for change detection
        this.previousSynergies = new Set(this.activeSynergies);
        this.activeSynergies.clear();

        // Check each synergy condition
        for (const [synergyKey, config] of Object.entries(SYNERGY_CONFIG)) {
            if (this.isSynergyActive(config)) {
                this.activeSynergies.add(synergyKey);
            }
        }
    }

    /**
     * Check if a specific synergy's requirements are met.
     * @param {object} config - Synergy configuration
     * @returns {boolean} True if synergy is active
     */
    isSynergyActive(config) {
        const required = config.requiredColors;
        for (const [color, count] of Object.entries(required)) {
            if (this.colorCounts[color] < count) {
                return false;
            }
        }
        return true;
    }

    /**
     * Update cached effects for quick combat system lookups.
     */
    updateEffectCache() {
        this.cachedEffects = {
            redBonusVsFrozen: 0,
            yellowFreezeOnPierce: false,
            yellowIgniteOnHit: false,
            globalFireRateBonus: 0
        };

        // Accumulate effects from all active synergies
        for (const synergyKey of this.activeSynergies) {
            const config = SYNERGY_CONFIG[synergyKey];
            const effects = config.effects;

            // Merge effects into cache
            if (effects.redBonusVsFrozen) {
                this.cachedEffects.redBonusVsFrozen = Math.max(
                    this.cachedEffects.redBonusVsFrozen,
                    effects.redBonusVsFrozen
                );
            }

            if (effects.yellowFreezeOnPierce) {
                this.cachedEffects.yellowFreezeOnPierce = true;
                this.cachedEffects.yellowFreezeDuration = effects.freezeDuration;
                this.cachedEffects.yellowFreezePercent = effects.freezePercent;
            }

            if (effects.yellowIgniteOnHit) {
                this.cachedEffects.yellowIgniteOnHit = true;
                this.cachedEffects.igniteDamagePerSecond = effects.igniteDamagePerSecond;
                this.cachedEffects.igniteDuration = effects.igniteDuration;
            }

            if (effects.globalFireRateBonus) {
                this.cachedEffects.globalFireRateBonus += effects.globalFireRateBonus;
            }
        }
    }

    /**
     * Notify event handlers when synergies activate or deactivate.
     */
    notifySynergyChanges() {
        // Check for newly activated synergies
        for (const synergyKey of this.activeSynergies) {
            if (!this.previousSynergies.has(synergyKey)) {
                if (this.eventHandlers.onSynergyActivated) {
                    const config = SYNERGY_CONFIG[synergyKey];
                    this.eventHandlers.onSynergyActivated(synergyKey, config);
                }
            }
        }

        // Check for deactivated synergies
        for (const synergyKey of this.previousSynergies) {
            if (!this.activeSynergies.has(synergyKey)) {
                if (this.eventHandlers.onSynergyDeactivated) {
                    const config = SYNERGY_CONFIG[synergyKey];
                    this.eventHandlers.onSynergyDeactivated(synergyKey, config);
                }
            }
        }
    }

    /**
     * Get all currently active synergies.
     * @returns {Array<object>} Array of { key, config } for active synergies
     */
    getActiveSynergies() {
        const active = [];
        for (const synergyKey of this.activeSynergies) {
            active.push({
                key: synergyKey,
                config: SYNERGY_CONFIG[synergyKey]
            });
        }
        return active;
    }

    /**
     * Check if a specific synergy is currently active.
     * @param {string} synergyKey - Key from SYNERGY_CONFIG
     * @returns {boolean} True if synergy is active
     */
    hasSynergy(synergyKey) {
        return this.activeSynergies.has(synergyKey);
    }

    /**
     * Get Red bonus damage multiplier vs frozen targets.
     * @returns {number} Multiplier (1.0 = no bonus, 1.25 = +25%)
     */
    getRedBonusVsFrozen() {
        return 1.0 + this.cachedEffects.redBonusVsFrozen;
    }

    /**
     * Check if Yellow should apply freeze on pierce.
     * @returns {boolean} True if synergy is active
     */
    shouldYellowFreezeOnPierce() {
        return this.cachedEffects.yellowFreezeOnPierce;
    }

    /**
     * Get Yellow freeze effect parameters.
     * @returns {object} { duration, percent } or null
     */
    getYellowFreezeEffect() {
        if (!this.cachedEffects.yellowFreezeOnPierce) {
            return null;
        }
        return {
            duration: this.cachedEffects.yellowFreezeDuration,
            percent: this.cachedEffects.yellowFreezePercent
        };
    }

    /**
     * Check if Yellow should ignite on hit.
     * @returns {boolean} True if synergy is active
     */
    shouldYellowIgnite() {
        return this.cachedEffects.yellowIgniteOnHit;
    }

    /**
     * Get Yellow ignite effect parameters.
     * @returns {object} { damagePerSecond, duration } or null
     */
    getYellowIgniteEffect() {
        if (!this.cachedEffects.yellowIgniteOnHit) {
            return null;
        }
        return {
            damagePerSecond: this.cachedEffects.igniteDamagePerSecond,
            duration: this.cachedEffects.igniteDuration
        };
    }

    /**
     * Get global fire rate bonus multiplier.
     * @returns {number} Multiplier (1.0 = no bonus, 1.15 = +15%)
     */
    getFireRateBonus() {
        return 1.0 + this.cachedEffects.globalFireRateBonus;
    }

    /**
     * Get current color counts for debugging.
     * @returns {object} { red, blue, yellow, purple, orange }
     */
    getColorCounts() {
        return { ...this.colorCounts };
    }

    /**
     * Reset synergy state (e.g., new run).
     */
    clear() {
        this.activeSynergies.clear();
        this.previousSynergies.clear();
        this.colorCounts = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
        this.cachedEffects = {};
    }
}
