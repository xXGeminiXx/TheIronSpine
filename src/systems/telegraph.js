/**
 * telegraph.js - Enemy Attack Telegraph System
 *
 * Provides visual warnings before enemy attacks to prevent unfair deaths.
 * Each enemy type has a distinct telegraph pattern that shows attack intent.
 *
 * TELEGRAPH TYPES:
 *   - Ranger: Red laser line showing aim direction (400ms windup)
 *   - Champion: Charging glow with speed indicator (600ms windup)
 *   - Boss: Ground warning circle at impact point (800ms windup)
 *   - Armored: Plating glow with charge line (600ms windup)
 *
 * INTEGRATION:
 *   1. Call startTelegraph(enemy, type, duration, target) before attacks
 *   2. Call updateTelegraphs(deltaSeconds) in combat update loop
 *   3. Telegraphs auto-expire and trigger attack callbacks
 */

import { ENEMIES } from '../config.js';

const TELEGRAPH_DEPTH = 13; // Above enemies, below projectiles

export const TELEGRAPH_TYPES = Object.freeze({
    RANGER_AIM: {
        duration: 0.4,
        color: 0xff4444,
        alpha: 0.6
    },
    CHAMPION_CHARGE: {
        duration: 0.6,
        color: 0xffcc00,
        alpha: 0.7
    },
    BOSS_IMPACT: {
        duration: 0.8,
        color: 0xff8844,
        alpha: 0.7
    },
    ARMORED_CHARGE: {
        duration: 0.6,
        color: 0xffcc00,
        alpha: 0.7
    }
});

export class TelegraphSystem {
    constructor(scene) {
        this.scene = scene;
        this.telegraphs = [];
    }

    /**
     * Start a new attack telegraph for an enemy.
     * @param {object} enemy - The attacking enemy
     * @param {string} type - Telegraph type (RANGER_AIM, CHAMPION_CHARGE, etc.)
     * @param {object} target - Attack target {x, y}
     * @param {function} onComplete - Callback when telegraph expires
     */
    startTelegraph(enemy, type, target, onComplete) {
        const config = TELEGRAPH_TYPES[type];
        if (!config) {
            return null;
        }

        // Clear any existing telegraph for this enemy
        this.clearTelegraph(enemy);

        const graphics = this.scene.add.graphics();
        graphics.setDepth(TELEGRAPH_DEPTH);

        const telegraph = {
            enemy,
            type,
            target,
            graphics,
            timer: config.duration,
            maxDuration: config.duration,
            color: config.color,
            alpha: config.alpha,
            onComplete
        };

        this.telegraphs.push(telegraph);
        enemy.telegraph = telegraph;

        return telegraph;
    }

    /**
     * Update all active telegraphs.
     * @param {number} deltaSeconds - Time elapsed since last frame
     */
    update(deltaSeconds) {
        for (let i = this.telegraphs.length - 1; i >= 0; i -= 1) {
            const telegraph = this.telegraphs[i];
            telegraph.timer -= deltaSeconds;

            if (telegraph.timer <= 0) {
                // Telegraph complete - trigger attack
                if (telegraph.onComplete) {
                    telegraph.onComplete();
                }
                this.removeTelegraphAtIndex(i);
                continue;
            }

            // Update visuals based on type
            this.updateTelegraphVisuals(telegraph);
        }
    }

    updateTelegraphVisuals(telegraph) {
        const { enemy, type, target, graphics, timer, maxDuration, color, alpha } = telegraph;

        if (!enemy || !enemy.sprite || !enemy.sprite.active) {
            return;
        }

        graphics.clear();

        const progress = 1 - (timer / maxDuration);
        const pulseAlpha = alpha * (0.5 + 0.5 * Math.sin(progress * Math.PI * 6));

        switch (type) {
            case 'RANGER_AIM':
                this.drawRangerAim(graphics, enemy, target, color, pulseAlpha);
                break;
            case 'CHAMPION_CHARGE':
                this.drawChampionCharge(graphics, enemy, target, color, pulseAlpha, progress);
                break;
            case 'BOSS_IMPACT':
                this.drawBossImpact(graphics, enemy, target, color, pulseAlpha, progress);
                break;
            case 'ARMORED_CHARGE':
                this.drawArmoredCharge(graphics, enemy, target, color, pulseAlpha, progress);
                break;
        }
    }

    drawRangerAim(graphics, enemy, target, color, alpha) {
        // Red laser line from enemy to target
        graphics.lineStyle(2, color, alpha);
        graphics.lineBetween(enemy.x, enemy.y, target.x, target.y);

        // Crosshair at target
        const crossSize = 8;
        graphics.lineStyle(1.5, color, alpha * 1.2);
        graphics.lineBetween(
            target.x - crossSize, target.y,
            target.x + crossSize, target.y
        );
        graphics.lineBetween(
            target.x, target.y - crossSize,
            target.x, target.y + crossSize
        );
    }

    drawChampionCharge(graphics, enemy, target, color, alpha, progress) {
        // Glowing aura that intensifies
        const radius = enemy.radius * (1.2 + progress * 0.4);
        graphics.lineStyle(3, color, alpha);
        graphics.strokeCircle(enemy.x, enemy.y, radius);

        // Speed indicator lines
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const lineLength = 20 + progress * 20;
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 10;
            const startX = enemy.x + Math.cos(angle) * enemy.radius;
            const startY = enemy.y + Math.sin(angle) * enemy.radius;
            const endX = startX + Math.cos(angle) * lineLength;
            const endY = startY + Math.sin(angle) * lineLength;

            graphics.lineStyle(2, color, alpha * (1 - i * 0.2));
            graphics.lineBetween(
                startX + Math.cos(angle + Math.PI / 2) * offset,
                startY + Math.sin(angle + Math.PI / 2) * offset,
                endX + Math.cos(angle + Math.PI / 2) * offset,
                endY + Math.sin(angle + Math.PI / 2) * offset
            );
        }
    }

    drawBossImpact(graphics, enemy, target, color, alpha, progress) {
        // Warning circle on ground at impact point
        const warningRadius = 45 + progress * 10;
        graphics.lineStyle(4, color, alpha);
        graphics.strokeCircle(target.x, target.y, warningRadius);

        // Inner danger zone
        const dangerRadius = warningRadius * 0.6;
        graphics.lineStyle(2, color, alpha * 0.6);
        graphics.strokeCircle(target.x, target.y, dangerRadius);

        // Flash effect at center
        if (progress > 0.7) {
            graphics.fillStyle(color, alpha * 0.3 * (progress - 0.7) * 3.33);
            graphics.fillCircle(target.x, target.y, dangerRadius * 0.8);
        }

        // Connect enemy to impact point
        graphics.lineStyle(1, color, alpha * 0.4);
        graphics.lineBetween(enemy.x, enemy.y, target.x, target.y);
    }

    drawArmoredCharge(graphics, enemy, target, color, alpha, progress) {
        // Plating glow effect
        const radius = enemy.radius * (1 + progress * 0.3);
        graphics.lineStyle(3 + progress * 2, color, alpha);
        graphics.strokeCircle(enemy.x, enemy.y, radius);

        // Charge particles
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const t = (i / particleCount + progress) % 1;
            const distance = enemy.radius + t * 40;
            const px = enemy.x + Math.cos(angle) * distance;
            const py = enemy.y + Math.sin(angle) * distance;
            const size = 3 * (1 - t);
            graphics.fillStyle(color, alpha * (1 - t));
            graphics.fillCircle(px, py, size);
        }
    }

    /**
     * Clear telegraph for a specific enemy.
     * @param {object} enemy - Enemy to clear telegraph for
     */
    clearTelegraph(enemy) {
        const index = this.telegraphs.findIndex(t => t.enemy === enemy);
        if (index !== -1) {
            this.removeTelegraphAtIndex(index);
        }
        if (enemy.telegraph) {
            enemy.telegraph = null;
        }
    }

    removeTelegraphAtIndex(index) {
        const telegraph = this.telegraphs[index];
        if (telegraph.graphics) {
            telegraph.graphics.destroy();
        }
        if (telegraph.enemy) {
            telegraph.enemy.telegraph = null;
        }
        this.telegraphs.splice(index, 1);
    }

    /**
     * Clear all telegraphs (e.g., on scene end).
     */
    clear() {
        for (const telegraph of this.telegraphs) {
            if (telegraph.graphics) {
                telegraph.graphics.destroy();
            }
            if (telegraph.enemy) {
                telegraph.enemy.telegraph = null;
            }
        }
        this.telegraphs.length = 0;
    }
}
