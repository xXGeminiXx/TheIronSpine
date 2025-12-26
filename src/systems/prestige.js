/**
 * prestige.js - Prestige System for Iron Spine
 *
 * Meta-progression system that allows players to earn "Scrap" currency from
 * completed runs and spend it on permanent upgrades that carry across runs.
 *
 * PHILOSOPHY:
 *   - Rewards ALL runs (not just victories) to reduce frustration
 *   - Exponential costs prevent instant maxing
 *   - Meaningful choices between upgrade categories
 *   - Synergizes with achievements (achievements give bonuses, prestige gives choice)
 *
 * SCRAP FORMULA:
 *   scrap = (wavesCleared × 10) + (kills × 0.5) + (merges × 5)
 *
 * UPGRADE CATEGORIES:
 *   1. Starting Loadout - Extra cars at game start
 *   2. Train Power - Damage and fire rate bonuses
 *   3. Durability - HP bonuses for engine and cars
 *   4. Luck - Better pickup spawns and merge rewards
 *
 * STORAGE KEY: 'ironspine_prestige_v1'
 *
 * DATA STRUCTURE:
 *   {
 *     totalScrap: number,           // Lifetime scrap earned
 *     currentScrap: number,          // Available to spend
 *     totalSpent: number,            // Total scrap spent
 *     upgrades: {
 *       startingCars: number,        // +1 car per level (max 5)
 *       damageBonus: number,         // +5% damage per level (max 10)
 *       fireRateBonus: number,       // +3% fire rate per level (max 10)
 *       engineHpBonus: number,       // +10% engine HP per level (max 10)
 *       carHpBonus: number,          // +8% car HP per level (max 10)
 *       pickupFrequency: number,     // -5% spawn time per level (max 5)
 *       mergeBonus: number           // Higher tier merges more likely (max 5)
 *     },
 *     lastUpdated: ISO string
 *   }
 *
 * INTEGRATION POINTS:
 *   - end-scene.js: Calculate and award scrap on run completion
 *   - game-scene.js: Apply prestige bonuses at run start
 *   - menu-scene.js: Show prestige menu button and stats
 *   - New prestige-scene.js: UI for viewing/purchasing upgrades
 *
 * EXTENSIBILITY:
 *   To add a new upgrade:
 *   1. Add entry to UPGRADE_REGISTRY
 *   2. Add field to DEFAULT_PRESTIGE.upgrades
 *   3. Update applyPrestigeBonuses() in game-scene.js
 *   4. Update prestige-scene.js UI
 */

const STORAGE_KEY = 'ironspine_prestige_v1';

// ----------------------------------------------------------------------------
// UPGRADE REGISTRY
// ----------------------------------------------------------------------------
// Defines all available prestige upgrades with costs, limits, and effects
// ----------------------------------------------------------------------------

export const UPGRADE_REGISTRY = {
    // ========================================================================
    // STARTING LOADOUT - Begin runs with extra cars
    // ========================================================================
    startingCars: {
        id: 'startingCars',
        name: 'Starting Arsenal',
        description: 'Begin each run with additional cars',
        category: 'loadout',
        icon: '+',
        maxLevel: 5,
        baseCost: 100,
        costScaling: 1.8,  // Cost multiplier per level
        effect: {
            perLevel: 1,
            format: '+{value} car(s)',
            tooltip: 'Adds random colored cars to your starting train'
        }
    },

    // ========================================================================
    // TRAIN POWER - Offensive bonuses
    // ========================================================================
    damageBonus: {
        id: 'damageBonus',
        name: 'Heavy Munitions',
        description: 'Increase all weapon damage',
        category: 'power',
        icon: 'D',
        maxLevel: 10,
        baseCost: 80,
        costScaling: 1.6,
        effect: {
            perLevel: 5,  // 5% per level
            format: '+{value}%',
            tooltip: 'Applies to all weapons and engine'
        }
    },

    fireRateBonus: {
        id: 'fireRateBonus',
        name: 'Rapid Cycling',
        description: 'Increase fire rate for all weapons',
        category: 'power',
        icon: 'F',
        maxLevel: 10,
        baseCost: 70,
        costScaling: 1.5,
        effect: {
            perLevel: 3,  // 3% per level
            format: '+{value}%',
            tooltip: 'Makes all cars shoot faster'
        }
    },

    // ========================================================================
    // DURABILITY - Defensive bonuses
    // ========================================================================
    engineHpBonus: {
        id: 'engineHpBonus',
        name: 'Reinforced Core',
        description: 'Increase engine maximum HP',
        category: 'durability',
        icon: 'E',
        maxLevel: 10,
        baseCost: 90,
        costScaling: 1.7,
        effect: {
            perLevel: 10,  // 10% per level
            format: '+{value}%',
            tooltip: 'Survive longer before defeat'
        }
    },

    carHpBonus: {
        id: 'carHpBonus',
        name: 'Armored Plating',
        description: 'Increase car HP for all tiers',
        category: 'durability',
        icon: 'C',
        maxLevel: 10,
        baseCost: 75,
        costScaling: 1.55,
        effect: {
            perLevel: 8,  // 8% per level
            format: '+{value}%',
            tooltip: 'Cars take more hits before destruction'
        }
    },

    // ========================================================================
    // LUCK - Economic bonuses
    // ========================================================================
    pickupFrequency: {
        id: 'pickupFrequency',
        name: 'Supply Routes',
        description: 'Increase pickup spawn frequency',
        category: 'luck',
        icon: 'P',
        maxLevel: 5,
        baseCost: 120,
        costScaling: 1.9,
        effect: {
            perLevel: 5,  // -5% spawn time per level
            format: '+{value}%',
            tooltip: 'More frequent car drops during runs'
        }
    },

    mergeBonus: {
        id: 'mergeBonus',
        name: 'Quality Control',
        description: 'Higher tier pickups spawn more often',
        category: 'luck',
        icon: 'M',
        maxLevel: 5,
        baseCost: 150,
        costScaling: 2.0,
        effect: {
            perLevel: 10,  // +10% higher tier chance per level
            format: '+{value}%',
            tooltip: 'Biases pickup tiers toward higher values'
        }
    }
};

// ----------------------------------------------------------------------------
// DEFAULT PRESTIGE DATA
// ----------------------------------------------------------------------------

const DEFAULT_PRESTIGE = {
    totalScrap: 0,
    currentScrap: 0,
    totalSpent: 0,
    upgrades: {
        startingCars: 0,
        damageBonus: 0,
        fireRateBonus: 0,
        engineHpBonus: 0,
        carHpBonus: 0,
        pickupFrequency: 0,
        mergeBonus: 0
    },
    lastUpdated: null,
    prestigeVersion: 1
};

// ----------------------------------------------------------------------------
// PRESTIGE MANAGER CLASS
// ----------------------------------------------------------------------------

export class PrestigeManager {
    /**
     * Get current prestige data from localStorage.
     *
     * @returns {Object} Current prestige data
     */
    static getData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return this._deepCopy(DEFAULT_PRESTIGE);
            }

            const parsed = JSON.parse(stored);
            return this._mergeWithDefaults(parsed);
        } catch (error) {
            console.warn('[PrestigeManager] Failed to load data:', error);
            return this._deepCopy(DEFAULT_PRESTIGE);
        }
    }

    /**
     * Calculate scrap earned from a completed run.
     *
     * Formula: (wavesCleared × 10) + (kills × 0.5) + (merges × 5)
     *
     * @param {Object} runStats - Run statistics
     * @param {number} runStats.wavesCleared - Waves completed
     * @param {number} runStats.enemiesDestroyed - Total kills
     * @param {number} runStats.mergesCompleted - Merges performed
     * @returns {number} Scrap amount (rounded down)
     */
    static calculateScrap(runStats) {
        const waves = runStats.wavesCleared || 0;
        const kills = runStats.enemiesDestroyed || 0;
        const merges = runStats.mergesCompleted || 0;

        const scrap = (waves * 10) + (kills * 0.5) + (merges * 5);
        return Math.floor(scrap);
    }

    /**
     * Award scrap to the player after a run.
     *
     * @param {number} amount - Scrap to award
     * @returns {Object} Updated prestige data
     */
    static awardScrap(amount) {
        const data = this.getData();

        data.totalScrap += amount;
        data.currentScrap += amount;
        data.lastUpdated = new Date().toISOString();

        this._save(data);

        console.log(`[PrestigeManager] Awarded ${amount} scrap (total: ${data.totalScrap})`);

        return data;
    }

    /**
     * Get the cost for the next level of an upgrade.
     *
     * Formula: baseCost × (costScaling ^ currentLevel)
     *
     * @param {string} upgradeId - Upgrade identifier
     * @returns {number|null} Cost in scrap, or null if maxed
     */
    static getUpgradeCost(upgradeId) {
        const upgrade = UPGRADE_REGISTRY[upgradeId];
        if (!upgrade) {
            console.warn(`[PrestigeManager] Unknown upgrade: ${upgradeId}`);
            return null;
        }

        const data = this.getData();
        const currentLevel = data.upgrades[upgradeId] || 0;

        if (currentLevel >= upgrade.maxLevel) {
            return null;  // Already maxed
        }

        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
        return cost;
    }

    /**
     * Purchase an upgrade level if player has enough scrap.
     *
     * @param {string} upgradeId - Upgrade to purchase
     * @returns {Object} Result with success flag and message
     */
    static purchaseUpgrade(upgradeId) {
        const upgrade = UPGRADE_REGISTRY[upgradeId];
        if (!upgrade) {
            return { success: false, message: 'Unknown upgrade' };
        }

        const data = this.getData();
        const currentLevel = data.upgrades[upgradeId] || 0;

        // Check max level
        if (currentLevel >= upgrade.maxLevel) {
            return { success: false, message: 'Already at max level' };
        }

        // Calculate cost
        const cost = this.getUpgradeCost(upgradeId);
        if (cost === null) {
            return { success: false, message: 'Cannot calculate cost' };
        }

        // Check funds
        if (data.currentScrap < cost) {
            return {
                success: false,
                message: `Not enough scrap (need ${cost}, have ${data.currentScrap})`
            };
        }

        // Purchase!
        data.currentScrap -= cost;
        data.totalSpent += cost;
        data.upgrades[upgradeId] = currentLevel + 1;
        data.lastUpdated = new Date().toISOString();

        this._save(data);

        console.log(
            `[PrestigeManager] Purchased ${upgrade.name} level ${currentLevel + 1} for ${cost} scrap`
        );

        return {
            success: true,
            message: `${upgrade.name} upgraded to level ${currentLevel + 1}`,
            newLevel: currentLevel + 1,
            scrapSpent: cost,
            scrapRemaining: data.currentScrap
        };
    }

    /**
     * Get all upgrades with current levels and next costs.
     *
     * @returns {Object} Upgrades grouped by category
     */
    static getAllUpgrades() {
        const data = this.getData();
        const result = {
            loadout: [],
            power: [],
            durability: [],
            luck: []
        };

        Object.values(UPGRADE_REGISTRY).forEach(upgrade => {
            const currentLevel = data.upgrades[upgrade.id] || 0;
            const nextCost = this.getUpgradeCost(upgrade.id);
            const isMaxed = currentLevel >= upgrade.maxLevel;

            const upgradeData = {
                ...upgrade,
                currentLevel,
                nextCost,
                isMaxed,
                currentEffect: upgrade.effect.perLevel * currentLevel,
                nextEffect: isMaxed ? null : upgrade.effect.perLevel * (currentLevel + 1),
                canAfford: nextCost !== null && data.currentScrap >= nextCost
            };

            result[upgrade.category].push(upgradeData);
        });

        return result;
    }

    /**
     * Calculate total active bonuses from prestige upgrades.
     * Returns multipliers ready to apply in game-scene.js.
     *
     * @returns {Object} Bonus multipliers
     */
    static getActiveBonuses() {
        const data = this.getData();

        return {
            // Starting loadout
            startingCars: data.upgrades.startingCars || 0,

            // Power bonuses (as multipliers, e.g., 1.15 = +15%)
            damageMultiplier: 1.0 + (data.upgrades.damageBonus * 0.05),
            fireRateMultiplier: 1.0 + (data.upgrades.fireRateBonus * 0.03),

            // Durability bonuses (as multipliers)
            engineHpMultiplier: 1.0 + (data.upgrades.engineHpBonus * 0.10),
            carHpMultiplier: 1.0 + (data.upgrades.carHpBonus * 0.08),

            // Luck bonuses
            pickupFrequencyBonus: data.upgrades.pickupFrequency * 0.05,  // -5% spawn time per level
            mergeTierBonus: data.upgrades.mergeBonus * 0.10  // +10% higher tier chance per level
        };
    }

    /**
     * Get prestige summary for display.
     *
     * @returns {Object} Summary stats
     */
    static getSummary() {
        const data = this.getData();
        const upgrades = this.getAllUpgrades();

        let totalLevels = 0;
        let maxedCount = 0;

        Object.values(data.upgrades).forEach((level, index) => {
            totalLevels += level;
            const upgradeId = Object.keys(data.upgrades)[index];
            const upgrade = UPGRADE_REGISTRY[upgradeId];
            if (upgrade && level >= upgrade.maxLevel) {
                maxedCount++;
            }
        });

        const totalUpgrades = Object.keys(UPGRADE_REGISTRY).length;

        return {
            totalScrap: data.totalScrap,
            currentScrap: data.currentScrap,
            totalSpent: data.totalSpent,
            totalLevels,
            maxedCount,
            totalUpgrades,
            percentComplete: Math.round((maxedCount / totalUpgrades) * 100)
        };
    }

    /**
     * Reset all prestige data (confirmation required in UI).
     */
    static reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[PrestigeManager] Prestige data reset');
        } catch (error) {
            console.warn('[PrestigeManager] Failed to reset:', error);
        }
    }

    // ------------------------------------------------------------------------
    // PRIVATE HELPERS
    // ------------------------------------------------------------------------

    static _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[PrestigeManager] Failed to save:', error);
        }
    }

    static _deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static _mergeWithDefaults(stored) {
        const result = this._deepCopy(DEFAULT_PRESTIGE);

        // Merge top-level fields
        Object.keys(stored).forEach(key => {
            if (key === 'upgrades') {
                // Deep merge upgrades
                Object.keys(stored.upgrades || {}).forEach(upgradeKey => {
                    if (result.upgrades.hasOwnProperty(upgradeKey)) {
                        result.upgrades[upgradeKey] = stored.upgrades[upgradeKey];
                    }
                });
            } else if (result.hasOwnProperty(key)) {
                result[key] = stored[key];
            }
        });

        return result;
    }
}

// ----------------------------------------------------------------------------
// CONVENIENCE EXPORTS
// ----------------------------------------------------------------------------

export function getPrestigeData() {
    return PrestigeManager.getData();
}

export function calculateScrap(runStats) {
    return PrestigeManager.calculateScrap(runStats);
}

export function awardScrap(amount) {
    return PrestigeManager.awardScrap(amount);
}

export function purchaseUpgrade(upgradeId) {
    return PrestigeManager.purchaseUpgrade(upgradeId);
}

export function getPrestigeBonuses() {
    return PrestigeManager.getActiveBonuses();
}

export function getPrestigeSummary() {
    return PrestigeManager.getSummary();
}

export function getAllUpgrades() {
    return PrestigeManager.getAllUpgrades();
}
