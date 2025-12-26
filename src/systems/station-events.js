/**
 * station-events.js - Station Event System
 *
 * Spawns 3-lane gates at configured intervals where the player steers through
 * one lane to receive a buff. This adds strategic choice to runs.
 *
 * LANE BUFFS:
 *   Left   - Fire Rate +30% for 20s
 *   Center - Repair 25% HP instant
 *   Right  - Speed +25% for 20s
 *
 * IMPLEMENTATION:
 *   - StationEvent class manages gate lifecycle
 *   - Lane detection uses engine X position vs lane boundaries
 *   - Buff application through callback system
 *   - Visual telegraph: 3 vertical barriers, labeled lanes, approach warning
 */

import { STATION_EVENTS, COLORS } from '../config.js';

function normalizeVector(x, y) {
    const length = Math.hypot(x, y);
    if (!length) {
        return { x: 1, y: 0 };
    }
    return { x: x / length, y: y / length };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

/**
 * Station Event - A 3-lane gate with buff rewards
 */
export class StationEvent {
    constructor(scene, position, callbacks = {}) {
        this.scene = scene;
        this.position = position;
        this.onBuffApplied = callbacks.onBuffApplied || (() => {});
        this.onCompleted = callbacks.onCompleted || (() => {});
        const forward = normalizeVector(callbacks.forward?.x ?? 1, callbacks.forward?.y ?? 0);
        this.forward = forward;
        this.right = { x: -forward.y, y: forward.x };

        this.active = true;
        this.consumed = false;

        // Lane boundaries (left, center, right)
        const laneWidth = STATION_EVENTS.laneWidth;
        const gateWidth = STATION_EVENTS.gateWidth;
        const halfGate = gateWidth * 0.5;

        this.lanes = [
            {
                key: 'left',
                label: 'FIRE RATE',
                buffType: 'fireRate',
                color: COLORS.red.phaser,
                colorHex: COLORS.red.hex,
                minOffset: -halfGate,
                maxOffset: -halfGate + laneWidth,
                centerOffset: -halfGate + laneWidth * 0.5
            },
            {
                key: 'center',
                label: 'REPAIR',
                buffType: 'repair',
                color: 0x00ff00,
                colorHex: '#00ff00',
                minOffset: -laneWidth * 0.5,
                maxOffset: laneWidth * 0.5,
                centerOffset: 0
            },
            {
                key: 'right',
                label: 'SPEED',
                buffType: 'speed',
                color: COLORS.blue.phaser,
                colorHex: COLORS.blue.hex,
                minOffset: halfGate - laneWidth,
                maxOffset: halfGate,
                centerOffset: halfGate - laneWidth * 0.5
            }
        ];

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(5); // Below train, above world

        this.labels = this.lanes.map((lane) => {
            const labelPosition = this.getOffsetPoint(
                lane.centerOffset,
                -STATION_EVENTS.laneHeight * 0.5 - 40
            );
            const text = scene.add.text(
                labelPosition.x,
                labelPosition.y,
                lane.label,
                {
                    fontSize: `${STATION_EVENTS.labelFontSize}px`,
                    fontFamily: 'Trebuchet MS, Arial, sans-serif',
                    color: lane.colorHex,
                    stroke: '#000000',
                    strokeThickness: 4,
                    fontStyle: 'bold',
                    align: 'center'
                }
            );
            text.setOrigin(0.5);
            text.setDepth(6);
            return text;
        });

        // Approach warning indicator (shows when close)
        const warningPosition = this.getOffsetPoint(
            0,
            -STATION_EVENTS.laneHeight * 0.5 - 80
        );
        this.warningText = scene.add.text(
            warningPosition.x,
            warningPosition.y,
            'STATION AHEAD',
            {
                fontSize: '32px',
                fontFamily: 'Trebuchet MS, Arial, sans-serif',
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 6,
                fontStyle: 'bold'
            }
        );
        this.warningText.setOrigin(0.5);
        this.warningText.setDepth(6);
        this.warningText.setAlpha(0);

        this.warningTimer = 0;
    }

    update(deltaSeconds, engine) {
        if (!this.active) {
            return;
        }

        // Draw gate visuals
        this.render();

        // Update approach warning (flash when within range)
        const distanceToGate = Phaser.Math.Distance.Between(
            engine.x,
            engine.y,
            this.position.x,
            this.position.y
        );

        if (distanceToGate < STATION_EVENTS.approachWarningDistance) {
            this.warningTimer += deltaSeconds;
            const pulse = Math.sin(this.warningTimer * STATION_EVENTS.warningPulseSpeed) * 0.5 + 0.5;
            this.warningText.setAlpha(pulse * 0.8 + 0.2);
        } else {
            this.warningText.setAlpha(0);
        }

        // Check for lane selection
        if (!this.consumed) {
            this.checkLaneSelection(engine);
        }

        // Auto-complete only after the engine has clearly passed beyond the gate.
        const forwardDist = this.getForwardOffset(engine);
        const autoCompleteBuffer = 180;
        const forwardThreshold = STATION_EVENTS.laneHeight * 0.5 + autoCompleteBuffer;
        const distanceThreshold = STATION_EVENTS.laneHeight + autoCompleteBuffer;
        if (forwardDist > forwardThreshold && distanceToGate > distanceThreshold) {
            this.complete();
        }

    }

    getOffsetPoint(lateralOffset, forwardOffset) {
        return {
            x: this.position.x + this.right.x * lateralOffset + this.forward.x * forwardOffset,
            y: this.position.y + this.right.y * lateralOffset + this.forward.y * forwardOffset
        };
    }

    getForwardOffset(point) {
        const relative = {
            x: point.x - this.position.x,
            y: point.y - this.position.y
        };
        return dot(relative, this.forward);
    }

    getLateralOffset(point) {
        const relative = {
            x: point.x - this.position.x,
            y: point.y - this.position.y
        };
        return dot(relative, this.right);
    }

    /**
     * Detect which lane the engine is in and apply buff
     */
    checkLaneSelection(engine) {
        const forwardOffset = this.getForwardOffset(engine);
        if (Math.abs(forwardOffset) > STATION_EVENTS.laneHeight * 0.5) {
            return;
        }

        const lateralOffset = this.getLateralOffset(engine);
        // Find which lane the engine is in based on lateral offset
        for (const lane of this.lanes) {
            if (lateralOffset >= lane.minOffset && lateralOffset < lane.maxOffset) {
                this.selectLane(lane);
                return;
            }
        }
    }

    /**
     * Apply the selected lane's buff
     */
    selectLane(lane) {
        if (this.consumed) {
            return;
        }

        this.consumed = true;

        // Get buff config
        const buff = STATION_EVENTS.buffs[lane.buffType];
        if (!buff) {
            console.warn(`[StationEvent] Unknown buff type: ${lane.buffType}`);
            return;
        }

        // Visual feedback: flash the selected lane
        this.flashLane(lane);

        // Notify callback with buff details
        this.onBuffApplied({
            type: lane.buffType,
            label: lane.label,
            value: buff.value,
            duration: buff.duration,
            color: lane.colorHex
        });

        // Complete event shortly after selection
        this.scene.time.delayedCall(500, () => this.complete());
    }

    /**
     * Flash effect for selected lane
     */
    flashLane(lane) {
        const flash = this.scene.add.graphics();
        flash.setDepth(5);

        const halfLaneWidth = STATION_EVENTS.laneWidth * 0.5 - 4;
        const halfLaneHeight = STATION_EVENTS.laneHeight * 0.5 - 4;
        const leftOffset = lane.centerOffset - halfLaneWidth;
        const rightOffset = lane.centerOffset + halfLaneWidth;
        const topLeft = this.getOffsetPoint(leftOffset, halfLaneHeight);
        const topRight = this.getOffsetPoint(rightOffset, halfLaneHeight);
        const bottomRight = this.getOffsetPoint(rightOffset, -halfLaneHeight);
        const bottomLeft = this.getOffsetPoint(leftOffset, -halfLaneHeight);

        flash.fillStyle(lane.color, 0.55);
        flash.beginPath();
        flash.moveTo(topLeft.x, topLeft.y);
        flash.lineTo(topRight.x, topRight.y);
        flash.lineTo(bottomRight.x, bottomRight.y);
        flash.lineTo(bottomLeft.x, bottomLeft.y);
        flash.closePath();
        flash.fillPath();

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });
    }

    /**
     * Render gate visuals
     */
    render() {
        if (!this.graphics) {
            return;
        }

        this.graphics.clear();

        const halfLaneWidth = STATION_EVENTS.laneWidth * 0.5;
        const halfLaneHeight = STATION_EVENTS.laneHeight * 0.5;

        // Draw each lane barrier
        for (const lane of this.lanes) {
            const leftOffset = lane.centerOffset - halfLaneWidth;
            const rightOffset = lane.centerOffset + halfLaneWidth;
            const topLeft = this.getOffsetPoint(leftOffset, halfLaneHeight);
            const topRight = this.getOffsetPoint(rightOffset, halfLaneHeight);
            const bottomRight = this.getOffsetPoint(rightOffset, -halfLaneHeight);
            const bottomLeft = this.getOffsetPoint(leftOffset, -halfLaneHeight);

            // Lane background (semi-transparent)
            this.graphics.fillStyle(lane.color, this.consumed ? 0.05 : 0.15);
            this.graphics.beginPath();
            this.graphics.moveTo(topLeft.x, topLeft.y);
            this.graphics.lineTo(topRight.x, topRight.y);
            this.graphics.lineTo(bottomRight.x, bottomRight.y);
            this.graphics.lineTo(bottomLeft.x, bottomLeft.y);
            this.graphics.closePath();
            this.graphics.fillPath();

            // Lane border (vertical barriers)
            this.graphics.lineStyle(4, lane.color, this.consumed ? 0.3 : 0.7);

            // Left border
            this.graphics.strokeLineShape(
                new Phaser.Geom.Line(topLeft.x, topLeft.y, bottomLeft.x, bottomLeft.y)
            );

            // Right border
            this.graphics.strokeLineShape(
                new Phaser.Geom.Line(topRight.x, topRight.y, bottomRight.x, bottomRight.y)
            );

            // Decorative cross-bars
            const crossCount = 3;
            for (let i = 0; i <= crossCount; i++) {
                const t = i / crossCount;
                const forwardOffset = halfLaneHeight - (halfLaneHeight * 2 * t);
                const leftPoint = this.getOffsetPoint(leftOffset, forwardOffset);
                const rightPoint = this.getOffsetPoint(rightOffset, forwardOffset);
                this.graphics.lineStyle(2, lane.color, this.consumed ? 0.2 : 0.4);
                this.graphics.strokeLineShape(
                    new Phaser.Geom.Line(leftPoint.x, leftPoint.y, rightPoint.x, rightPoint.y)
                );
            }
        }
    }

    /**
     * Complete the event and clean up
     */
    complete() {
        if (!this.active) {
            return;
        }

        this.active = false;
        this.onCompleted();

        // Fade out and destroy
        const targets = [...this.labels, this.warningText];
        this.scene.tweens.add({
            targets,
            alpha: 0,
            duration: 600,
            onComplete: () => {
                targets.forEach((t) => t.destroy());
            }
        });

        this.scene.tweens.add({
            targets: this.graphics,
            alpha: 0,
            duration: 600,
            onComplete: () => {
                this.graphics.destroy();
                this.graphics = null;
            }
        });
    }

    destroy() {
        this.active = false;
        if (this.graphics) {
            this.graphics.destroy();
        }
        this.labels.forEach((label) => label.destroy());
        if (this.warningText) {
            this.warningText.destroy();
        }
    }
}

/**
 * Station Event Manager - Handles event spawning and active buffs
 */
export class StationEventManager {
    constructor(scene, train, callbacks = {}) {
        this.scene = scene;
        this.train = train;
        this.onBuffApplied = callbacks.onBuffApplied || (() => {});

        this.activeEvent = null;
        this.activeBuff = null;
        this.buffTimer = 0;

        // Track which waves have had station events
        this.lastEventWave = 0;
    }

    /**
     * Check if it's time to spawn a station event
     */
    shouldSpawnEvent(waveNumber) {
        if (!STATION_EVENTS.enabled) {
            return false;
        }

        if (this.activeEvent) {
            return false; // Only one event at a time
        }

        const wavesSinceLastEvent = waveNumber - this.lastEventWave;
        return wavesSinceLastEvent >= STATION_EVENTS.spawnEveryNWaves;
    }

    /**
     * Spawn a station event ahead of the train
     */
    spawnEvent(waveNumber) {
        if (this.activeEvent) {
            return;
        }

        const engine = this.train.engine;
        const forward = {
            x: Math.cos(engine.rotation),
            y: Math.sin(engine.rotation)
        };

        // Spawn station ahead of train
        const position = {
            x: engine.x + forward.x * STATION_EVENTS.spawnDistance,
            y: engine.y + forward.y * STATION_EVENTS.spawnDistance
        };

        this.activeEvent = new StationEvent(this.scene, position, {
            forward,
            onBuffApplied: (buff) => this.applyBuff(buff),
            onCompleted: () => {
                this.activeEvent = null;
            }
        });

        this.lastEventWave = waveNumber;
    }

    /**
     * Apply a buff from lane selection
     */
    applyBuff(buff) {
        // Clear any existing buff
        if (this.activeBuff) {
            this.clearBuff();
        }

        this.activeBuff = {
            type: buff.type,
            label: buff.label,
            value: buff.value,
            duration: buff.duration,
            color: buff.color,
            remaining: buff.duration
        };

        // Apply buff effect based on type
        switch (buff.type) {
            case 'fireRate':
                // Fire rate buff: increase combat system fire rate multiplier
                if (this.scene.combatSystem) {
                    const currentMultiplier = this.scene.combatSystem.fireRateMultiplier || 1.0;
                    this.scene.combatSystem.fireRateMultiplier = currentMultiplier * (1 + buff.value);
                }
                break;

            case 'repair':
                // Repair buff: instant HP restore to all segments
                const healAmount = buff.value;
                const segments = this.train.getAllSegments();
                segments.forEach((segment) => {
                    const healValue = segment.maxHp * healAmount;
                    segment.hp = Math.min(segment.maxHp, segment.hp + healValue);
                });
                // No duration for instant heal
                this.activeBuff.remaining = 0;
                this.activeBuff = null;
                break;

            case 'speed':
                // Speed buff: increase train speed multiplier
                const currentSpeedMultiplier = this.train.speedMultiplier || 1.0;
                this.train.setSpeedMultiplier(currentSpeedMultiplier * (1 + buff.value));
                break;

            default:
                console.warn(`[StationEvent] Unknown buff type: ${buff.type}`);
                this.activeBuff = null;
                break;
        }

        // Notify callback for HUD update
        this.onBuffApplied(this.activeBuff);

        // Play feedback sound
        if (this.scene.audio && typeof this.scene.audio.playMerge === 'function') {
            this.scene.audio.playMerge(); // Reuse merge sound for buff pickup
        }
    }

    /**
     * Update active buff timers
     */
    update(deltaSeconds) {
        // Update active event
        if (this.activeEvent) {
            this.activeEvent.update(deltaSeconds, this.train.engine);
        }

        // Update buff timer
        if (this.activeBuff && this.activeBuff.duration > 0) {
            this.activeBuff.remaining -= deltaSeconds;

            if (this.activeBuff.remaining <= 0) {
                this.clearBuff();
            }
        }
    }

    /**
     * Clear active buff and restore stats
     */
    clearBuff() {
        if (!this.activeBuff) {
            return;
        }

        const buff = this.activeBuff;

        // Restore stats based on buff type
        switch (buff.type) {
            case 'fireRate':
                if (this.scene.combatSystem) {
                    const currentMultiplier = this.scene.combatSystem.fireRateMultiplier || 1.0;
                    this.scene.combatSystem.fireRateMultiplier = currentMultiplier / (1 + buff.value);
                }
                break;

            case 'speed':
                const currentSpeedMultiplier = this.train.speedMultiplier || 1.0;
                this.train.setSpeedMultiplier(currentSpeedMultiplier / (1 + buff.value));
                break;

            case 'repair':
                // No restoration needed for instant heal
                break;

            default:
                console.warn(`[StationEvent] Unknown buff type to clear: ${buff.type}`);
                break;
        }

        this.activeBuff = null;
    }

    /**
     * Get current active buff for HUD display
     */
    getActiveBuff() {
        return this.activeBuff;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.activeEvent) {
            this.activeEvent.destroy();
        }
        this.clearBuff();
    }
}
