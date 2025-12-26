/**
 * damage-numbers.js - Floating Damage Numbers with Context
 *
 * Displays damage dealt with visual styling based on damage type:
 * - Critical hits: Large, bold, yellow
 * - Slow effects: Blue tint with freeze icon
 * - Armor pierced: Orange with "PIERCED" suffix
 * - Overkill: Red with strike-through
 * - Status ticks: Small, faded for DoT
 *
 * Uses a pooling system for performance (max 50 active numbers).
 *
 * USAGE:
 *   const damageNumbers = new DamageNumberSystem(scene);
 *   damageNumbers.show(x, y, damage, {
 *       isCritical: true,
 *       isSlowApplied: false,
 *       isArmorPierced: false,
 *       isOverkill: false
 *   });
 */

import { PALETTE, UI, RENDER } from '../config.js';
import { formatNumber } from '../core/verylargenumbers.js';

const MAX_ACTIVE_NUMBERS = 50;
const NUMBER_DEPTH = 100; // Above most game elements
const RISE_DISTANCE = 40;
const FADE_DURATION = 800; // milliseconds

/**
 * Damage number visual styles.
 */
const STYLES = {
    NORMAL: {
        fontSize: 16,
        color: '#ffffff',
        fontStyle: 'normal',
        strokeThickness: 2
    },
    CRITICAL: {
        fontSize: 24,
        color: '#ffff00',
        fontStyle: 'bold',
        strokeThickness: 3
    },
    SLOW: {
        fontSize: 16,
        color: '#4444ff',
        fontStyle: 'normal',
        strokeThickness: 2,
        prefix: '❄ ' // Snowflake icon
    },
    PIERCED: {
        fontSize: 18,
        color: '#ff8844',
        fontStyle: 'bold',
        strokeThickness: 2,
        suffix: ' PIERCED'
    },
    OVERKILL: {
        fontSize: 20,
        color: '#ff4444',
        fontStyle: 'bold',
        strokeThickness: 3,
        strikethrough: true
    },
    DOT: {
        fontSize: 12,
        color: '#888888',
        fontStyle: 'normal',
        strokeThickness: 1,
        alpha: 0.6
    }
};

export class DamageNumberSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeNumbers = [];
    }

    /**
     * Show a damage number at a position with contextual styling.
     *
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} damage - Damage amount
     * @param {object} context - Damage context
     * @param {boolean} context.isCritical - Is critical hit
     * @param {boolean} context.isSlowApplied - Slow effect applied
     * @param {boolean} context.isArmorPierced - Armor was pierced
     * @param {boolean} context.isOverkill - Damage exceeds HP
     * @param {boolean} context.isDoT - Damage over time tick
     */
    show(x, y, damage, context = {}) {
        // Limit active numbers for performance
        if (this.activeNumbers.length >= MAX_ACTIVE_NUMBERS) {
            this.removeOldest();
        }

        // Determine style based on context
        let style = STYLES.NORMAL;
        if (context.isDoT) {
            style = STYLES.DOT;
        } else if (context.isCritical) {
            style = STYLES.CRITICAL;
        } else if (context.isOverkill) {
            style = STYLES.OVERKILL;
        } else if (context.isArmorPierced) {
            style = STYLES.PIERCED;
        } else if (context.isSlowApplied) {
            style = STYLES.SLOW;
        }

        // Format damage text
        const damageText = formatNumber(damage, 0);
        const prefix = style.prefix || '';
        const suffix = style.suffix || '';
        const displayText = `${prefix}${damageText}${suffix}`;

        // Create text object
        const text = this.scene.add.text(x, y, displayText, {
            fontFamily: UI.fontFamily,
            fontSize: `${style.fontSize}px`,
            color: style.color,
            fontStyle: style.fontStyle,
            stroke: PALETTE.uiShadow,
            strokeThickness: style.strokeThickness
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(NUMBER_DEPTH);
        text.setResolution(RENDER.textResolution);

        if (style.alpha) {
            text.setAlpha(style.alpha);
        }

        // Add strikethrough effect if needed
        if (style.strikethrough) {
            const line = this.scene.add.graphics();
            line.lineStyle(2, Phaser.Display.Color.HexStringToColor(style.color).color);
            line.setDepth(NUMBER_DEPTH + 1);

            this.scene.tweens.add({
                targets: text,
                y: y - RISE_DISTANCE,
                alpha: 0,
                duration: FADE_DURATION,
                ease: 'Cubic.easeOut',
                onUpdate: () => {
                    // Update strikethrough position
                    const bounds = text.getBounds();
                    line.clear();
                    line.lineStyle(2, Phaser.Display.Color.HexStringToColor(style.color).color);
                    line.lineBetween(
                        bounds.left,
                        bounds.centerY,
                        bounds.right,
                        bounds.centerY
                    );
                },
                onComplete: () => {
                    text.destroy();
                    line.destroy();
                    this.removeNumber(text);
                }
            });

            this.activeNumbers.push({ text, line });
        } else {
            // Standard animation
            this.scene.tweens.add({
                targets: text,
                y: y - RISE_DISTANCE,
                alpha: 0,
                duration: FADE_DURATION,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    text.destroy();
                    this.removeNumber(text);
                }
            });

            this.activeNumbers.push({ text });
        }
    }

    /**
     * Remove a specific damage number from active tracking.
     *
     * @param {Phaser.GameObjects.Text} text - Text object to remove
     */
    removeNumber(text) {
        const index = this.activeNumbers.findIndex(n => n.text === text);
        if (index !== -1) {
            this.activeNumbers.splice(index, 1);
        }
    }

    /**
     * Remove the oldest damage number to make room for new ones.
     */
    removeOldest() {
        if (this.activeNumbers.length === 0) {
            return;
        }

        const oldest = this.activeNumbers.shift();
        if (oldest.text && !oldest.text.scene) {
            // Already destroyed
            return;
        }

        oldest.text.destroy();
        if (oldest.line) {
            oldest.line.destroy();
        }
    }

    /**
     * Clear all active damage numbers (on scene transition).
     */
    clear() {
        for (const number of this.activeNumbers) {
            if (number.text && number.text.scene) {
                number.text.destroy();
            }
            if (number.line && number.line.scene) {
                number.line.destroy();
            }
        }
        this.activeNumbers = [];
    }
}
