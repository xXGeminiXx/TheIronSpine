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
const RING_RADIUS = 7;
const SHAFT_LENGTH = 14;
const SHAFT_WIDTH = 3;
const HEAD_LENGTH = 10;
const HEAD_WIDTH = 14;
const OUTLINE_COLOR = 0x000000;
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

        const indicator = this.scene.add.graphics();
        container.add(indicator);
        container.indicator = indicator;
        container.currentColor = null;

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

        if (indicator.currentColor !== color) {
            this.drawIndicator(indicator, color);
            indicator.currentColor = color;
        }

        // Pulse effect
        const pulse = 1 + 0.15 * Math.sin(this.pulseTimer * PULSE_SPEED);
        indicator.setScale(pulse);
    }

    drawIndicator(indicator, color) {
        const gfx = indicator.indicator;
        gfx.clear();

        const ringRadius = RING_RADIUS;
        const stemStartY = -ringRadius + 1;
        const stemEndY = stemStartY - SHAFT_LENGTH;
        const tipY = stemEndY - HEAD_LENGTH;
        const halfHead = HEAD_WIDTH * 0.5;

        // Ring with inner core for anchoring.
        gfx.lineStyle(3, OUTLINE_COLOR, 0.6);
        gfx.strokeCircle(0, 0, ringRadius + 1);
        gfx.lineStyle(2, color, 0.9);
        gfx.strokeCircle(0, 0, ringRadius);
        gfx.fillStyle(0x000000, 0.25);
        gfx.fillCircle(0, 0, ringRadius - 1);
        gfx.fillStyle(color, 0.85);
        gfx.fillCircle(0, 0, ringRadius * 0.45);

        // Shaft line for clearer direction.
        gfx.lineStyle(SHAFT_WIDTH + 1, OUTLINE_COLOR, 0.6);
        gfx.beginPath();
        gfx.moveTo(0, stemStartY);
        gfx.lineTo(0, stemEndY);
        gfx.strokePath();
        gfx.lineStyle(SHAFT_WIDTH, color, 0.95);
        gfx.beginPath();
        gfx.moveTo(0, stemStartY);
        gfx.lineTo(0, stemEndY);
        gfx.strokePath();

        // Arrow head.
        gfx.fillStyle(color, 1);
        gfx.beginPath();
        gfx.moveTo(0, tipY);
        gfx.lineTo(halfHead, stemEndY + 1);
        gfx.lineTo(-halfHead, stemEndY + 1);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(2, OUTLINE_COLOR, 0.7);
        gfx.strokePath();
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
