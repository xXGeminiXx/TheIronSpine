/**
 * threat-indicator.js - Off-Screen Indicator System
 *
 * Displays edge-of-screen indicators for off-screen entities.
 * Threats use sharp arrows (negative), pickups use diamonds (positive),
 * and stations use gate markers.
 */

import { COLORS, PALETTE } from '../config.js';

const INDICATOR_DEPTH = 25; // Above HUD
const EDGE_MARGIN = 36; // Distance from screen edge
const MAX_THREAT_INDICATORS = 8;
const MAX_PICKUP_INDICATORS = 6;
const MAX_STATION_INDICATORS = 1;
const OUTLINE_COLOR = 0x000000;
const PULSE_SPEED = 3.4;

const DISTANCE_NEAR = 180;
const DISTANCE_FAR = 1600;

const POSITIVE_RING_COLOR = 0x33ffcc;
const STATION_COLOR = Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;

const INDICATOR_STYLES = Object.freeze({
    threat: {
        ringRadius: 8,
        shaftMin: 8,
        shaftMax: 46,
        shaftWidth: 3,
        headLength: 14,
        headWidth: 18,
        dotScale: 0.45
    },
    pickup: {
        ringRadius: 7,
        shaftMin: 6,
        shaftMax: 40,
        shaftWidth: 2.6,
        headLength: 12,
        headWidth: 14,
        dotScale: 0.5
    },
    station: {
        ringRadius: 9,
        shaftMin: 10,
        shaftMax: 52,
        shaftWidth: 3.2,
        headLength: 14,
        headWidth: 20,
        dotScale: 0.5
    }
});

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

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function shadeColor(color, factor) {
    const clamped = clamp01(factor);
    const base = Phaser.Display.Color.ValueToColor(color);
    const r = Math.round(base.r * clamped);
    const g = Math.round(base.g * clamped);
    const b = Math.round(base.b * clamped);
    return Phaser.Display.Color.GetColor(r, g, b);
}

function getDistanceFactor(distance) {
    const span = Math.max(1, DISTANCE_FAR - DISTANCE_NEAR);
    return clamp01((distance - DISTANCE_NEAR) / span);
}

export class ThreatIndicatorSystem {
    constructor(scene) {
        this.scene = scene;
        this.pulseTimer = 0;

        this.threatIndicators = this.createIndicators(MAX_THREAT_INDICATORS, 'threat');
        this.pickupIndicators = this.createIndicators(MAX_PICKUP_INDICATORS, 'pickup');
        this.stationIndicators = this.createIndicators(MAX_STATION_INDICATORS, 'station');
    }

    createIndicators(count, kind) {
        const pool = [];
        for (let i = 0; i < count; i += 1) {
            const indicator = this.createIndicator(kind);
            indicator.setVisible(false);
            pool.push(indicator);
        }
        return pool;
    }

    createIndicator(kind) {
        const container = this.scene.add.container(0, 0);
        container.setDepth(INDICATOR_DEPTH);
        container.setScrollFactor(0);
        container.kind = kind;

        const graphics = this.scene.add.graphics();
        container.add(graphics);
        container.graphics = graphics;

        return container;
    }

    update(payload, camera) {
        let enemies = [];
        let pickups = [];
        let stationEvent = null;

        if (Array.isArray(payload)) {
            enemies = payload;
        } else if (payload && typeof payload === 'object') {
            enemies = payload.enemies || [];
            pickups = payload.pickups || [];
            stationEvent = payload.stationEvent || null;
        }

        if (!camera) {
            this.hideAllIndicators();
            return;
        }

        this.pulseTimer += this.scene.game.loop.delta / 1000;

        const threats = this.getOffScreenThreats(enemies, camera);
        threats.sort((a, b) => b.priority - a.priority);
        this.updatePool(this.threatIndicators, threats, camera);

        const pickupTargets = this.getOffScreenPickups(pickups, camera);
        pickupTargets.sort((a, b) => a.distance - b.distance);
        this.updatePool(this.pickupIndicators, pickupTargets, camera);

        const stationTargets = this.getOffScreenStations(stationEvent, camera);
        this.updatePool(this.stationIndicators, stationTargets, camera);
    }

    updatePool(pool, targets, camera) {
        for (let i = 0; i < pool.length; i += 1) {
            const indicator = pool[i];
            const target = targets[i];
            if (target) {
                this.updateIndicator(indicator, target, camera);
                indicator.setVisible(true);
            } else {
                indicator.setVisible(false);
            }
        }
    }

    getOffScreenThreats(enemies, camera) {
        const threats = [];
        const camBounds = camera.worldView;
        const margin = 40;

        for (const enemy of enemies || []) {
            const isOffScreen =
                enemy.x < camBounds.left - margin ||
                enemy.x > camBounds.right + margin ||
                enemy.y < camBounds.top - margin ||
                enemy.y > camBounds.bottom + margin;

            if (!isOffScreen) {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(
                camBounds.centerX,
                camBounds.centerY,
                enemy.x,
                enemy.y
            );

            threats.push({
                x: enemy.x,
                y: enemy.y,
                kind: 'threat',
                color: THREAT_COLORS[enemy.type] || 0xaaaaaa,
                priority: THREAT_PRIORITY[enemy.type] || 10,
                distance
            });
        }

        return threats;
    }

    getOffScreenPickups(pickups, camera) {
        const targets = [];
        if (!pickups || pickups.length === 0) {
            return targets;
        }

        const camBounds = camera.worldView;
        const margin = 40;

        for (const pickup of pickups) {
            const isOffScreen =
                pickup.x < camBounds.left - margin ||
                pickup.x > camBounds.right + margin ||
                pickup.y < camBounds.top - margin ||
                pickup.y > camBounds.bottom + margin;

            if (!isOffScreen) {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(
                camBounds.centerX,
                camBounds.centerY,
                pickup.x,
                pickup.y
            );

            const color = COLORS[pickup.colorKey]
                ? COLORS[pickup.colorKey].phaser
                : 0xffffff;

            targets.push({
                x: pickup.x,
                y: pickup.y,
                kind: 'pickup',
                color,
                distance
            });
        }

        return targets;
    }

    getOffScreenStations(stationEvent, camera) {
        if (!stationEvent || !stationEvent.active || stationEvent.consumed) {
            return [];
        }

        const camBounds = camera.worldView;
        const margin = 40;
        const isOffScreen =
            stationEvent.position.x < camBounds.left - margin ||
            stationEvent.position.x > camBounds.right + margin ||
            stationEvent.position.y < camBounds.top - margin ||
            stationEvent.position.y > camBounds.bottom + margin;

        if (!isOffScreen) {
            return [];
        }

        const distance = Phaser.Math.Distance.Between(
            camBounds.centerX,
            camBounds.centerY,
            stationEvent.position.x,
            stationEvent.position.y
        );

        return [{
            x: stationEvent.position.x,
            y: stationEvent.position.y,
            kind: 'station',
            color: STATION_COLOR,
            distance
        }];
    }

    updateIndicator(indicator, target, camera) {
        const camBounds = camera.worldView;
        const camCenterX = camBounds.centerX;
        const camCenterY = camBounds.centerY;

        const angle = Math.atan2(
            target.y - camCenterY,
            target.x - camCenterX
        );

        const edgePoint = this.getEdgePoint(angle);

        indicator.setPosition(edgePoint.x, edgePoint.y);
        indicator.setRotation(angle - Math.PI / 2);

        const distance = target.distance || Phaser.Math.Distance.Between(
            camCenterX,
            camCenterY,
            target.x,
            target.y
        );
        const distanceFactor = getDistanceFactor(distance);
        const proximity = 1 - distanceFactor;

        const style = INDICATOR_STYLES[indicator.kind];
        const shaftLength = lerp(style.shaftMin, style.shaftMax, distanceFactor);
        const alpha = lerp(0.55, 1, proximity);
        indicator.setAlpha(alpha);

        const pulse = 1 + 0.06 * proximity * Math.sin(this.pulseTimer * PULSE_SPEED);
        indicator.setScale(pulse);

        const colors = this.getIndicatorColors(indicator.kind, target.color, distanceFactor);
        this.drawIndicator(indicator, style, colors, shaftLength);
    }

    getIndicatorColors(kind, baseColor, distanceFactor) {
        const fade = lerp(1, 0.4, distanceFactor);

        if (kind === 'pickup') {
            const ringColor = shadeColor(POSITIVE_RING_COLOR, fade);
            const headColor = shadeColor(baseColor, fade);
            return {
                ring: ringColor,
                shaft: ringColor,
                head: headColor,
                dot: headColor,
                accent: ringColor
            };
        }

        if (kind === 'station') {
            const station = shadeColor(baseColor, fade);
            return {
                ring: station,
                shaft: station,
                head: station,
                dot: station,
                accent: station
            };
        }

        const threat = shadeColor(baseColor, fade);
        return {
            ring: threat,
            shaft: threat,
            head: threat,
            dot: threat,
            accent: threat
        };
    }

    drawIndicator(indicator, style, colors, shaftLength) {
        const gfx = indicator.graphics;
        gfx.clear();

        const ringRadius = style.ringRadius;
        const stemStartY = -ringRadius - 1;
        const stemEndY = stemStartY - shaftLength;
        const tipY = stemEndY - style.headLength;
        const halfHead = style.headWidth * 0.5;

        gfx.lineStyle(3, OUTLINE_COLOR, 0.6);
        gfx.strokeCircle(0, 0, ringRadius + 1);
        gfx.lineStyle(2, colors.ring, 0.95);
        gfx.strokeCircle(0, 0, ringRadius);
        gfx.fillStyle(0x000000, 0.25);
        gfx.fillCircle(0, 0, ringRadius - 1);
        gfx.fillStyle(colors.dot, 0.9);
        gfx.fillCircle(0, 0, ringRadius * style.dotScale);

        gfx.lineStyle(style.shaftWidth + 1, OUTLINE_COLOR, 0.6);
        gfx.beginPath();
        gfx.moveTo(0, stemStartY);
        gfx.lineTo(0, stemEndY);
        gfx.strokePath();
        gfx.lineStyle(style.shaftWidth, colors.shaft, 0.95);
        gfx.beginPath();
        gfx.moveTo(0, stemStartY);
        gfx.lineTo(0, stemEndY);
        gfx.strokePath();

        if (indicator.kind === 'pickup') {
            const diamondTipY = tipY + style.headLength * 0.1;
            const diamondBaseY = stemEndY + 1;
            const diamondMidY = (diamondTipY + diamondBaseY) * 0.5;

            gfx.fillStyle(colors.head, 1);
            gfx.beginPath();
            gfx.moveTo(0, diamondTipY);
            gfx.lineTo(halfHead, diamondMidY);
            gfx.lineTo(0, diamondBaseY);
            gfx.lineTo(-halfHead, diamondMidY);
            gfx.closePath();
            gfx.fillPath();
            gfx.lineStyle(2, OUTLINE_COLOR, 0.7);
            gfx.strokePath();

            const plusSize = ringRadius * 0.6;
            gfx.lineStyle(2, colors.accent, 0.9);
            gfx.beginPath();
            gfx.moveTo(-plusSize * 0.5, 0);
            gfx.lineTo(plusSize * 0.5, 0);
            gfx.moveTo(0, -plusSize * 0.5);
            gfx.lineTo(0, plusSize * 0.5);
            gfx.strokePath();
            return;
        }

        if (indicator.kind === 'station') {
            const headTop = tipY + style.headLength * 0.05;
            const headHeight = style.headLength * 0.9;
            const headWidth = style.headWidth;
            const headLeft = -headWidth * 0.5;

            gfx.fillStyle(colors.head, 1);
            gfx.fillRoundedRect(headLeft, headTop, headWidth, headHeight, 3);
            gfx.lineStyle(2, OUTLINE_COLOR, 0.7);
            gfx.strokeRoundedRect(headLeft, headTop, headWidth, headHeight, 3);

            const barCount = 3;
            const barWidth = headWidth / (barCount * 2 + 1);
            for (let i = 0; i < barCount; i += 1) {
                const x = headLeft + barWidth + i * barWidth * 2;
                gfx.lineStyle(2, OUTLINE_COLOR, 0.55);
                gfx.beginPath();
                gfx.moveTo(x, headTop + 3);
                gfx.lineTo(x, headTop + headHeight - 3);
                gfx.strokePath();
            }
            return;
        }

        gfx.fillStyle(colors.head, 1);
        gfx.beginPath();
        gfx.moveTo(0, tipY);
        gfx.lineTo(halfHead, stemEndY + 1);
        gfx.lineTo(-halfHead, stemEndY + 1);
        gfx.closePath();
        gfx.fillPath();
        gfx.lineStyle(2, OUTLINE_COLOR, 0.7);
        gfx.strokePath();

        if (indicator.kind === 'threat') {
            const chevronInset = Math.max(4, halfHead * 0.45);
            gfx.lineStyle(2, colors.accent, 0.85);
            gfx.beginPath();
            gfx.moveTo(0, tipY + 2);
            gfx.lineTo(chevronInset, stemEndY + 2);
            gfx.moveTo(0, tipY + 2);
            gfx.lineTo(-chevronInset, stemEndY + 2);
            gfx.strokePath();
        }
    }

    getEdgePoint(angle) {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        const margin = EDGE_MARGIN;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cosAbs = Math.abs(cos) || 1;
        const sinAbs = Math.abs(sin) || 1;

        const tx = cos > 0
            ? (halfWidth - margin) / cosAbs
            : (-halfWidth + margin) / cosAbs;

        const ty = sin > 0
            ? (halfHeight - margin) / sinAbs
            : (-halfHeight + margin) / sinAbs;

        const t = Math.min(tx, ty);

        return {
            x: halfWidth + cos * t,
            y: halfHeight + sin * t
        };
    }

    hideAllIndicators() {
        [...this.threatIndicators, ...this.pickupIndicators, ...this.stationIndicators]
            .forEach((indicator) => indicator.setVisible(false));
    }

    clear() {
        [...this.threatIndicators, ...this.pickupIndicators, ...this.stationIndicators]
            .forEach((indicator) => indicator.destroy());
        this.threatIndicators.length = 0;
        this.pickupIndicators.length = 0;
        this.stationIndicators.length = 0;
    }
}
