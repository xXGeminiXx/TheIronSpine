/**
 * threat-indicator.js - Off-Screen Enemy Threat System
 *
 * Displays edge-of-screen arrows pointing to off-screen dangers.
 * Helps players maintain situational awareness during intense combat.
 *
 * FEATURES:
 *   - Arrows appear on screen edges pointing to off-screen enemies
 *   - Color-coded by threat level (gray=basic, gold=elite, orange=boss)
 *   - Priority system ensures most dangerous threats are always visible
 *   - Fixed pool of 8 arrows to maintain performance
 *
 * THREAT PRIORITY:
 *   1. Boss (highest)
 *   2. Champion
 *   3. Ranger (ranged enemies)
 *   4. Other enemies
 *
 * INTEGRATION:
 *   Call update(enemies, camera) each frame to refresh indicators.
 */

import { GAME } from '../config.js';

const INDICATOR_DEPTH = 25; // Above HUD
const MAX_INDICATORS = 8;
const EDGE_MARGIN = 40; // Distance from screen edge
const ARROW_SIZE = 16;
const PULSE_SPEED = 3;

const THREAT_COLORS = Object.freeze({
    skirmisher: 0xc0c0c0,
    champion: 0xffcc00,
    boss: 0xff8844,
    armored: 0xd0d0d0,
    ranger: 0xff6666,
    harpooner: 0xaa88ff,
    minelayer: 0xb0a080
});

const THREAT_PRIORITY = Object.freeze({
    boss: 100,
    champion: 80,
    ranger: 60,
    harpooner: 55,
    minelayer: 50,
    armored: 40,
    skirmisher: 20
});

export class ThreatIndicatorSystem {
    constructor(scene) {
        this.scene = scene;
        this.indicators = [];
        this.pulseTimer = 0;

        // Pre-create indicator pool
        for (let i = 0; i < MAX_INDICATORS; i++) {
            const indicator = this.createIndicator();
            indicator.setVisible(false);
            this.indicators.push(indicator);
        }
    }

    createIndicator() {
        const container = this.scene.add.container(0, 0);
        container.setDepth(INDICATOR_DEPTH);
        container.setScrollFactor(0); // Fixed to screen

        // Arrow triangle
        const arrow = this.scene.add.triangle(
            0, 0,
            0, -ARROW_SIZE,
            ARROW_SIZE * 0.7, ARROW_SIZE * 0.5,
            -ARROW_SIZE * 0.7, ARROW_SIZE * 0.5,
            0xffffff
        );
        arrow.setStrokeStyle(2, 0x000000, 0.8);

        // Pulse ring for emphasis
        const ring = this.scene.add.circle(0, 0, ARROW_SIZE * 1.2, 0xffffff, 0);
        ring.setStrokeStyle(1.5, 0xffffff, 0.5);

        container.add([ring, arrow]);
        container.arrow = arrow;
        container.ring = ring;

        return container;
    }

    /**
     * Update threat indicators for current frame.
     * @param {array} enemies - All active enemies
     * @param {object} camera - Phaser camera
     */
    update(enemies, camera) {
        if (!enemies || !camera) {
            this.hideAllIndicators();
            return;
        }

        this.pulseTimer += this.scene.game.loop.delta / 1000;

        // Find off-screen enemies
        const threats = this.getOffScreenThreats(enemies, camera);

        // Sort by priority
        threats.sort((a, b) => b.priority - a.priority);

        // Update indicators
        for (let i = 0; i < MAX_INDICATORS; i++) {
            const indicator = this.indicators[i];

            if (i < threats.length) {
                this.updateIndicator(indicator, threats[i], camera);
                indicator.setVisible(true);
            } else {
                indicator.setVisible(false);
            }
        }
    }

    getOffScreenThreats(enemies, camera) {
        const threats = [];
        const camBounds = camera.worldView;
        const margin = 40; // Consider enemy "off-screen" if beyond this margin

        for (const enemy of enemies) {
            // Check if enemy is off-screen
            const isOffScreen =
                enemy.x < camBounds.left - margin ||
                enemy.x > camBounds.right + margin ||
                enemy.y < camBounds.top - margin ||
                enemy.y > camBounds.bottom + margin;

            if (!isOffScreen) {
                continue;
            }

            threats.push({
                enemy,
                priority: THREAT_PRIORITY[enemy.type] || 10,
                color: THREAT_COLORS[enemy.type] || 0xaaaaaa
            });
        }

        return threats;
    }

    updateIndicator(indicator, threat, camera) {
        const { enemy, color } = threat;
        const camCenterX = camera.worldView.centerX;
        const camCenterY = camera.worldView.centerY;

        // Calculate angle from screen center to enemy
        const angle = Math.atan2(
            enemy.y - camCenterY,
            enemy.x - camCenterX
        );

        // Find point on screen edge
        const edgePoint = this.getEdgePoint(angle, camera);

        // Position indicator
        indicator.setPosition(edgePoint.x, edgePoint.y);

        // Arrow points INWARD toward enemy (not outward)
        // Subtract PI to flip direction, add PI/2 to rotate triangle
        indicator.setRotation(angle - Math.PI / 2);

        // Update color
        indicator.arrow.setFillStyle(color);
        indicator.ring.setStrokeStyle(1.5, color, 0.5);

        // Pulse effect
        const pulse = 1 + 0.15 * Math.sin(this.pulseTimer * PULSE_SPEED);
        indicator.setScale(pulse);
    }

    getEdgePoint(angle, camera) {
        const halfWidth = GAME.width / 2;
        const halfHeight = GAME.height / 2;
        const margin = EDGE_MARGIN;

        // Calculate intersection with screen rectangle
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Check which edge the angle intersects
        const tx = cos > 0
            ? (halfWidth - margin) / Math.abs(cos)
            : (-halfWidth + margin) / Math.abs(cos);

        const ty = sin > 0
            ? (halfHeight - margin) / Math.abs(sin)
            : (-halfHeight + margin) / Math.abs(sin);

        const t = Math.min(tx, ty);

        return {
            x: halfWidth + cos * t,
            y: halfHeight + sin * t
        };
    }

    hideAllIndicators() {
        for (const indicator of this.indicators) {
            indicator.setVisible(false);
        }
    }

    /**
     * Clear all indicators (e.g., on scene end).
     */
    clear() {
        for (const indicator of this.indicators) {
            indicator.destroy();
        }
        this.indicators.length = 0;
    }
}
