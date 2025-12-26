/**
 * critical-hits.js - Critical Hit System
 *
 * Adds chance-based critical hits for visual excitement and damage variety.
 * Yellow cars have higher crit chance to reinforce their "precision" fantasy.
 *
 * MECHANICS:
 *   - Base crit chance: 5%
 *   - Yellow crit chance: 10%
 *   - Base crit multiplier: 2.0x
 *   - Yellow crit multiplier: 2.5x
 *
 * VISUAL FEEDBACK:
 *   - Larger projectile on crit
 *   - Brighter color
 *   - Impact flash
 *   - Floating damage number (if implemented)
 *
 * INTEGRATION:
 *   1. Call rollCrit(colorKey) before firing to determine if shot is a crit
 *   2. Apply crit multiplier to damage in combat system
 *   3. Use isCrit flag to trigger visual effects
 */

const BASE_CRIT_CHANCE = 0.05; // 5%
const BASE_CRIT_MULTIPLIER = 2.0;

const COLOR_CRIT_CONFIG = Object.freeze({
    red: {
        chance: 0.05,
        multiplier: 2.0
    },
    blue: {
        chance: 0.05,
        multiplier: 2.0
    },
    yellow: {
        chance: 0.10, // Double chance
        multiplier: 2.5 // Higher multiplier
    },
    purple: {
        chance: 0.05,
        multiplier: 2.0
    },
    orange: {
        chance: 0.05,
        multiplier: 2.0
    }
});

export class CriticalHitSystem {
    constructor() {
        this.totalCrits = 0;
        this.critsByColor = {
            red: 0,
            blue: 0,
            yellow: 0,
            purple: 0,
            orange: 0
        };
    }

    /**
     * Roll for critical hit.
     * @param {string} colorKey - Weapon color (red, blue, yellow, etc.)
     * @returns {object} { isCrit: boolean, multiplier: number }
     */
    rollCrit(colorKey) {
        const config = COLOR_CRIT_CONFIG[colorKey] || {
            chance: BASE_CRIT_CHANCE,
            multiplier: BASE_CRIT_MULTIPLIER
        };

        const roll = Math.random();
        const isCrit = roll < config.chance;

        if (isCrit) {
            this.totalCrits += 1;
            if (this.critsByColor[colorKey] !== undefined) {
                this.critsByColor[colorKey] += 1;
            }
        }

        return {
            isCrit,
            multiplier: isCrit ? config.multiplier : 1.0
        };
    }

    /**
     * Get crit stats for end-screen display.
     * @returns {object} { total, byColor }
     */
    getStats() {
        return {
            total: this.totalCrits,
            byColor: { ...this.critsByColor }
        };
    }

    /**
     * Reset stats (e.g., new run).
     */
    clear() {
        this.totalCrits = 0;
        this.critsByColor = {
            red: 0,
            blue: 0,
            yellow: 0,
            purple: 0,
            orange: 0
        };
    }
}

/**
 * Visual effects helper for critical hits.
 * Call this from VFX system when a crit lands.
 *
 * @param {object} scene - Phaser scene
 * @param {object} position - Impact position {x, y}
 * @param {number} color - Phaser hex color
 * @param {number} damage - Damage amount (for floating text)
 */
export function spawnCritEffect(scene, position, color, damage) {
    // Bright flash at impact
    const flash = scene.add.circle(
        position.x,
        position.y,
        20,
        color,
        1.0
    );
    flash.setDepth(20);

    scene.tweens.add({
        targets: flash,
        scale: 2.5,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy()
    });

    // Impact ring
    const ring = scene.add.circle(
        position.x,
        position.y,
        15,
        color,
        0
    );
    ring.setDepth(20);
    ring.setStrokeStyle(3, color, 1.0);

    scene.tweens.add({
        targets: ring,
        radius: 50,
        alpha: 0,
        duration: 300,
        onComplete: () => ring.destroy()
    });

    // Floating damage text
    if (damage && scene.add.text) {
        const text = scene.add.text(
            position.x,
            position.y,
            Math.round(damage).toString(),
            {
                fontSize: '32px',
                fontFamily: 'Trebuchet MS, Arial, sans-serif',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        text.setOrigin(0.5);
        text.setDepth(21);

        scene.tweens.add({
            targets: text,
            y: position.y - 60,
            alpha: 0,
            scale: 1.3,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy()
        });
    }
}
