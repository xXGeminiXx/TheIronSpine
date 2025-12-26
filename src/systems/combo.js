/**
 * combo.js - Kill Combo System
 *
 * Rewards consecutive kills with damage multipliers and visual feedback.
 * Adds skill expression and excitement without complexity.
 *
 * MECHANICS:
 *   - Kill within 2 seconds = combo continues
 *   - Each kill increases multiplier tier
 *   - Multiplier applies to ALL damage (train weapons + pulse)
 *   - Visual feedback: combo counter + screen effects
 *
 * MULTIPLIER TIERS:
 *   0-4 kills:   1.0x (no bonus)
 *   5-9 kills:   1.2x (+20%)
 *   10-14 kills: 1.5x (+50%)
 *   15-19 kills: 2.0x (+100%)
 *   20+ kills:   3.0x (+200%)
 *
 * VOCAL CALLOUTS (optional):
 *   5 combo:  "ROLLING"
 *   10 combo: "UNSTOPPABLE"
 *   15 combo: "LEGENDARY"
 *   20 combo: "IRON SPINE"
 *
 * INTEGRATION:
 *   1. Call onKill() when an enemy is destroyed
 *   2. Call update(deltaSeconds) each frame
 *   3. Call getMultiplier() when calculating damage
 */

const COMBO_WINDOW = 2.0; // Seconds to maintain combo

const MULTIPLIER_TIERS = [
    { minKills: 0, multiplier: 1.0, label: null },
    { minKills: 5, multiplier: 1.2, label: 'ROLLING' },
    { minKills: 10, multiplier: 1.5, label: 'UNSTOPPABLE' },
    { minKills: 15, multiplier: 2.0, label: 'LEGENDARY' },
    { minKills: 20, multiplier: 3.0, label: 'IRON SPINE' }
];

export class ComboSystem {
    constructor(eventHandlers = {}, comboWindow = COMBO_WINDOW) {
        this.count = 0;
        this.timer = 0;
        this.maxTimer = comboWindow; // v1.5.0 Configurable for difficulty
        this.multiplier = 1.0;
        this.highestCombo = 0;

        // Event handlers for external systems
        this.onComboGain = eventHandlers.onComboGain || null;
        this.onComboLost = eventHandlers.onComboLost || null;
        this.onMilestone = eventHandlers.onMilestone || null;
    }

    /**
     * Register a kill and extend combo timer.
     */
    onKill() {
        this.count += 1;
        this.timer = this.maxTimer;

        if (this.count > this.highestCombo) {
            this.highestCombo = this.count;
        }

        // Update multiplier based on current tier
        const newMultiplier = this.calculateMultiplier();
        const tierChanged = newMultiplier !== this.multiplier;
        this.multiplier = newMultiplier;

        if (this.onComboGain) {
            this.onComboGain(this.count, this.multiplier);
        }

        // Check for milestone
        if (tierChanged) {
            const milestone = this.getCurrentMilestone();
            if (milestone && this.onMilestone) {
                this.onMilestone(milestone.minKills, milestone.label);
            }
        }
    }

    /**
     * Update combo timer.
     * @param {number} deltaSeconds - Time elapsed since last frame
     */
    update(deltaSeconds) {
        if (this.timer <= 0) {
            return;
        }

        this.timer = Math.max(0, this.timer - deltaSeconds);

        if (this.timer === 0) {
            this.resetCombo();
        }
    }

    calculateMultiplier() {
        for (let i = MULTIPLIER_TIERS.length - 1; i >= 0; i -= 1) {
            const tier = MULTIPLIER_TIERS[i];
            if (this.count >= tier.minKills) {
                return tier.multiplier;
            }
        }
        return 1.0;
    }

    getCurrentMilestone() {
        for (let i = MULTIPLIER_TIERS.length - 1; i >= 0; i -= 1) {
            const tier = MULTIPLIER_TIERS[i];
            if (this.count >= tier.minKills && tier.label) {
                return tier;
            }
        }
        return null;
    }

    resetCombo() {
        const hadCombo = this.count > 0;
        this.count = 0;
        this.multiplier = 1.0;

        if (hadCombo && this.onComboLost) {
            this.onComboLost();
        }
    }

    /**
     * Get current damage multiplier.
     * @returns {number} Current multiplier (1.0 - 3.0)
     */
    getMultiplier() {
        return this.multiplier;
    }

    /**
     * Get current combo count.
     * @returns {number} Number of kills in current combo
     */
    getCount() {
        return this.count;
    }

    /**
     * Get remaining time before combo expires.
     * @returns {number} Seconds remaining
     */
    getTimeRemaining() {
        return this.timer;
    }

    /**
     * Get combo progress as percentage (for UI).
     * @returns {number} 0.0 - 1.0
     */
    getProgress() {
        return this.timer / this.maxTimer;
    }

    /**
     * Get highest combo achieved this session.
     * @returns {number} Highest combo count
     */
    getHighestCombo() {
        return this.highestCombo;
    }

    /**
     * Reset combo and stats (e.g., new run).
     */
    clear() {
        this.count = 0;
        this.timer = 0;
        this.multiplier = 1.0;
        this.highestCombo = 0;
    }
}
