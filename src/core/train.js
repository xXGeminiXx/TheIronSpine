/**
 * train.js - Train entity and car management
 *
 * The Train class represents the player's vehicle: a locomotive engine
 * followed by a chain of weapon cars connected by spherical couplings.
 *
 * KEY CONCEPTS:
 *   - Engine: The lead segment that follows the pointer. Has HP but no weapon.
 *   - Cars: Weapon segments that follow the engine in a chain. Each has a
 *     color (red/blue/yellow) and tier (1-3+).
 *   - Couplings: Visual spheres drawn between segments for the "articulated
 *     train" look inspired by the Bartellami Jet patent.
 *
 * MOVEMENT MODEL:
 *   The engine steers toward the pointer using rotation clamped to turnSpeedDeg.
 *   Cars follow their leader (engine or previous car) using lerp-based smoothing.
 *   This creates a satisfying train-snake effect without physics engine overhead.
 *
 * MERGE SYSTEM:
 *   When two adjacent cars share the same color AND tier, they merge into one
 *   higher-tier car. The MergeManager (merge.js) handles detection and animation.
 *
 * DAMAGE:
 *   Both engine and cars have HP. When a car dies, it explodes (dealing AoE
 *   damage to enemies). When the engine dies, the run ends.
 *
 * ADDING NEW CAR TYPES:
 *   1. Add color definition to COLORS in config.js
 *   2. Add weapon stats to WEAPON_STATS in config.js
 *   3. Add visual attachment in createColorAttachment() below
 */

import { CAMERA, COLORS, GAME, PALETTE, TRAIN, UI, RENDER } from '../config.js';
import { angleTo, approach, lerp } from './math.js';
import { debugLog, devAssert } from './debug.js';

const ENGINE_DEPTH = 20;
const CAR_DEPTH = 18;
const COUPLING_DEPTH = 16;
const SHADOW_DEPTH = 6;
const HEADLIGHT_DEPTH = 9;

let nextSegmentId = 0;

export function resetSegmentIdCounter() {
    nextSegmentId = 0;
}

export class Train {
    constructor(scene, startX, startY, eventHandlers = {}) {
        this.scene = scene;
        this.eventHandlers = eventHandlers;
        this.speedMultiplier = 1;
        this.turnSpeedMultiplier = 1;
        this.hpMultiplier = 1;
        this.engineAccentTween = null;
        this.engineAccentColorKey = null;
        this.engine = this.createEngine(startX, startY);
        this.cars = [];
        this.couplings = [];
        this.currentSpeed = 0;
        this.boostRemaining = 0;
        this.boostCooldown = 0;
        this.invulnerableTimer = GAME.spawnInvulnerableSeconds;
        this.spawnOrderCounter = 0;
        this.stats = {
            carsCollected: 0,
            carsLost: 0,
            mergesCompleted: 0,
            highestTier: 1
        };
        this.turnPenalties = new Map();
        this.turnPenaltyMultiplier = 1;
        this.heatIntensity = 0;
        this.thrusterTimer = 0;
        this.shadowGraphics = this.scene.add.graphics();
        this.shadowGraphics.setDepth(SHADOW_DEPTH);
        this.headlightGraphics = this.scene.add.graphics();
        this.headlightGraphics.setDepth(HEADLIGHT_DEPTH);
    }

    update(deltaSeconds, inputState) {
        this.updateInvulnerability(deltaSeconds);
        this.updateBoostTimers(deltaSeconds, inputState.boostRequested);
        this.updateTurnPenalties(deltaSeconds);
        this.updateEngineMovement(deltaSeconds, inputState.targetX, inputState.targetY);
        this.updateEngineThrusters(deltaSeconds);
        this.updateCarFollow(deltaSeconds);
        this.applyDragForces(deltaSeconds);
        this.updateCouplings();
        this.updateHeat(deltaSeconds);
        this.updateShadowPath();
        this.updateHeadlight();
    }

    updateInvulnerability(deltaSeconds) {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer = Math.max(0, this.invulnerableTimer - deltaSeconds);
        }
    }

    updateBoostTimers(deltaSeconds, boostRequested) {
        if (this.boostRemaining > 0) {
            this.boostRemaining = Math.max(0, this.boostRemaining - deltaSeconds);
        } else if (this.boostCooldown > 0) {
            this.boostCooldown = Math.max(0, this.boostCooldown - deltaSeconds);
        }

        if (boostRequested && this.boostRemaining === 0 && this.boostCooldown === 0) {
            this.boostRemaining = TRAIN.boostDurationSeconds;
            this.boostCooldown = TRAIN.boostCooldownSeconds;
        }
    }

    updateTurnPenalties(deltaSeconds) {
        if (this.turnPenalties.size === 0) {
            this.turnPenaltyMultiplier = 1;
            return;
        }

        let changed = false;
        for (const [id, penalty] of this.turnPenalties) {
            penalty.timer = Math.max(0, penalty.timer - deltaSeconds);
            if (penalty.timer === 0) {
                this.turnPenalties.delete(id);
                changed = true;
            }
        }

        if (changed) {
            this.recalculateTurnPenalty();
        }
    }

    updateEngineMovement(deltaSeconds, targetX, targetY) {
        const engine = this.engine;
        const desiredAngle = angleTo(engine.x, engine.y, targetX, targetY);
        const turnSpeed = Phaser.Math.DegToRad(
            TRAIN.turnSpeedDeg * this.turnSpeedMultiplier * this.turnPenaltyMultiplier
        );
        engine.rotation = Phaser.Math.Angle.RotateTo(
            engine.rotation,
            desiredAngle,
            turnSpeed * deltaSeconds
        );

        const boostMultiplier = this.boostRemaining > 0
            ? TRAIN.boostMultiplier
            : 1;
        const desiredSpeed = TRAIN.engineSpeed
            * boostMultiplier
            * this.speedMultiplier;
        const acceleration = desiredSpeed >= this.currentSpeed
            ? TRAIN.acceleration * this.speedMultiplier
            : TRAIN.deceleration * this.speedMultiplier;
        this.currentSpeed = approach(
            this.currentSpeed,
            desiredSpeed,
            acceleration * deltaSeconds
        );

        engine.x += Math.cos(engine.rotation) * this.currentSpeed * deltaSeconds;
        engine.y += Math.sin(engine.rotation) * this.currentSpeed * deltaSeconds;

        engine.container.x = engine.x;
        engine.container.y = engine.y;
        engine.container.rotation = engine.rotation;
    }

    updateCarFollow(deltaSeconds) {
        const followFactor = this.getFrameFollowFactor(deltaSeconds);
        let leader = this.engine;

        for (const car of this.cars) {
            if (car.followHoldSeconds > 0) {
                car.followHoldSeconds = Math.max(
                    0,
                    car.followHoldSeconds - deltaSeconds
                );
                leader = car;
                continue;
            }

            // Maintain consistent spacing so the spine reads as a train, not a pile.
            const spacing = leader.type === 'engine'
                ? TRAIN.engineSpacing
                : TRAIN.carSpacing;
            const targetX = leader.x - Math.cos(leader.rotation) * spacing;
            const targetY = leader.y - Math.sin(leader.rotation) * spacing;

            car.x = lerp(car.x, targetX, followFactor);
            car.y = lerp(car.y, targetY, followFactor);
            car.rotation = angleTo(car.x, car.y, leader.x, leader.y);
            car.container.x = car.x;
            car.container.y = car.y;
            car.container.rotation = car.rotation;
            leader = car;
        }
    }

    applyDragForces(deltaSeconds) {
        for (const car of this.cars) {
            if (car.dragTimer <= 0 || !car.dragDirection) {
                continue;
            }

            car.dragTimer = Math.max(0, car.dragTimer - deltaSeconds);
            const strength = car.dragStrength || 0;
            car.x += car.dragDirection.x * strength * deltaSeconds;
            car.y += car.dragDirection.y * strength * deltaSeconds;
            car.container.x = car.x;
            car.container.y = car.y;

            if (car.dragTimer === 0) {
                car.dragDirection = null;
                car.dragStrength = 0;
            }
        }
    }

    updateCouplings() {
        const requiredCouplings = this.cars.length;
        while (this.couplings.length < requiredCouplings) {
            const coupling = this.scene.add.circle(
                this.engine.x,
                this.engine.y,
                TRAIN.couplingRadius,
                Phaser.Display.Color.HexStringToColor(PALETTE.coupling).color
            );
            coupling.setStrokeStyle(2, 0x4a4a4a);
            coupling.setDepth(COUPLING_DEPTH);
            this.couplings.push(coupling);
        }

        while (this.couplings.length > requiredCouplings) {
            const coupling = this.couplings.pop();
            coupling.destroy();
        }

        for (let index = 0; index < this.cars.length; index += 1) {
            const leader = index === 0 ? this.engine : this.cars[index - 1];
            const follower = this.cars[index];
            const coupling = this.couplings[index];
            coupling.x = (leader.x + follower.x) * 0.5;
            coupling.y = (leader.y + follower.y) * 0.5;
        }
    }

    updateHeat(deltaSeconds) {
        let peakHeat = 0;
        const heatDecay = TRAIN.heatDecayPerSecond * deltaSeconds;
        const maxAlpha = TRAIN.heatGlowMaxAlpha;

        const segments = [this.engine, ...this.cars];
        for (const segment of segments) {
            segment.heat = Math.max(0, (segment.heat || 0) - heatDecay);
            peakHeat = Math.max(peakHeat, segment.heat);

            if (segment.heatGlow) {
                const alpha = segment.heat * maxAlpha;
                segment.heatGlow.setAlpha(alpha);
                const scale = 1 + segment.heat * 0.6;
                segment.heatGlow.setScale(scale);
            }
        }

        this.heatIntensity = peakHeat;
    }

    updateEngineThrusters(deltaSeconds) {
        if (!this.engine || !this.engine.thrusterFlames) {
            return;
        }

        this.thrusterTimer += deltaSeconds;
        const maxSpeed = TRAIN.engineSpeed * TRAIN.boostMultiplier * this.speedMultiplier;
        const speedRatio = maxSpeed > 0
            ? Math.min(1, this.currentSpeed / maxSpeed)
            : 0;

        const baseAlpha = 0.15 + speedRatio * 0.75;
        const baseScale = 0.35 + speedRatio * 0.9;

        this.engine.thrusterFlames.forEach((flame, index) => {
            const flicker = 0.85 + 0.15 * Math.sin(this.thrusterTimer * 18 + index * 1.7);
            flame.setScale(baseScale * flicker, 0.9 + 0.1 * flicker);
            flame.setAlpha(baseAlpha * flicker);
            flame.setVisible(speedRatio > 0.05);
        });
    }

    updateShadowPath() {
        if (!this.shadowGraphics) {
            return;
        }

        this.shadowGraphics.clear();
        const segments = this.getAllSegments();
        if (segments.length === 0) {
            return;
        }

        const offsetY = TRAIN.shadowOffsetY;
        const width = TRAIN.shadowWidth;
        const alpha = TRAIN.shadowAlpha;
        const gap = TRAIN.couplingRadius * 1.6;

        this.shadowGraphics.lineStyle(width, 0x000000, alpha);
        for (let index = 0; index < segments.length - 1; index += 1) {
            const leader = segments[index];
            const follower = segments[index + 1];
            const dx = follower.x - leader.x;
            const dy = follower.y - leader.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 0.001) {
                continue;
            }

            const ux = dx / distance;
            const uy = dy / distance;
            const startX = leader.x + ux * gap;
            const startY = leader.y + uy * gap + offsetY;
            const endX = follower.x - ux * gap;
            const endY = follower.y - uy * gap + offsetY;
            this.shadowGraphics.lineBetween(startX, startY, endX, endY);
        }

        this.shadowGraphics.fillStyle(0x000000, alpha * 0.9);
        for (const segment of segments) {
            this.shadowGraphics.fillCircle(
                segment.x,
                segment.y + offsetY,
                width * 0.45
            );
        }
    }

    updateHeadlight() {
        if (!this.headlightGraphics || !this.engine) {
            return;
        }

        this.headlightGraphics.clear();

        const angle = this.engine.rotation;
        const length = TRAIN.headlightLength;
        const spread = Phaser.Math.DegToRad(TRAIN.headlightSpreadDeg);
        const offset = TRAIN.headlightOffset;
        const baseX = this.engine.x + Math.cos(angle) * offset;
        const baseY = this.engine.y + Math.sin(angle) * offset;
        const leftX = baseX + Math.cos(angle - spread * 0.5) * length;
        const leftY = baseY + Math.sin(angle - spread * 0.5) * length;
        const rightX = baseX + Math.cos(angle + spread * 0.5) * length;
        const rightY = baseY + Math.sin(angle + spread * 0.5) * length;

        const warm = 0xfff2cc;
        this.headlightGraphics.fillStyle(warm, 0.12);
        this.headlightGraphics.fillTriangle(baseX, baseY, leftX, leftY, rightX, rightY);

        const innerLength = length * 0.7;
        const innerSpread = spread * 0.6;
        const innerLeftX = baseX + Math.cos(angle - innerSpread * 0.5) * innerLength;
        const innerLeftY = baseY + Math.sin(angle - innerSpread * 0.5) * innerLength;
        const innerRightX = baseX + Math.cos(angle + innerSpread * 0.5) * innerLength;
        const innerRightY = baseY + Math.sin(angle + innerSpread * 0.5) * innerLength;
        this.headlightGraphics.fillStyle(warm, 0.2);
        this.headlightGraphics.fillTriangle(
            baseX,
            baseY,
            innerLeftX,
            innerLeftY,
            innerRightX,
            innerRightY
        );

        // v1.5.2 Store cone data for vacuum effect
        this.headlightCone = {
            baseX, baseY, angle, length, spread
        };
    }

    /**
     * v1.5.2 - Apply vacuum effect from headlight cone.
     * Pulls in pickups and pushes enemies away.
     */
    applyHeadlightVacuum(pickups, enemies, deltaSeconds) {
        if (!this.headlightCone || !this.engine) {
            return;
        }

        const { baseX, baseY, angle, length, spread } = this.headlightCone;
        const vacuumStrength = 200; // Pull strength for pickups
        const repelStrength = 150;  // Push strength for enemies

        // Helper to check if point is in cone
        const isInCone = (x, y) => {
            const dx = x - baseX;
            const dy = y - baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > length || dist < 10) return false;

            const pointAngle = Math.atan2(dy, dx);
            let angleDiff = pointAngle - angle;

            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            return Math.abs(angleDiff) <= spread * 0.5;
        };

        // Pull in pickups
        if (pickups && pickups.pickups) {
            for (const pickup of pickups.pickups) {
                if (isInCone(pickup.x, pickup.y)) {
                    const dx = baseX - pickup.x;
                    const dy = baseY - pickup.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.1) {
                        const pull = vacuumStrength * deltaSeconds / dist;
                        pickup.velocity.x += dx * pull;
                        pickup.velocity.y += dy * pull;
                    }
                }
            }
        }

        // Push enemies away
        if (enemies && enemies.enemies) {
            for (const enemy of enemies.enemies) {
                if (isInCone(enemy.x, enemy.y)) {
                    const dx = enemy.x - baseX;
                    const dy = enemy.y - baseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.1) {
                        const push = repelStrength * deltaSeconds / dist;
                        enemy.x += dx * push;
                        enemy.y += dy * push;
                    }
                }
            }
        }
    }

    getFrameFollowFactor(deltaSeconds) {
        // Convert a per-frame follow factor into a frame-rate independent lerp.
        const frames = deltaSeconds * 60;
        return 1 - Math.pow(1 - TRAIN.followFactor, frames);
    }

    recordWeaponFire(segment) {
        if (!segment) {
            return;
        }
        segment.heat = Math.min(1, (segment.heat || 0) + TRAIN.heatGainPerShot);
    }

    applyDragToCar(car, direction, durationSeconds, strength) {
        if (!car || car.type !== 'car' || !direction) {
            return;
        }
        car.dragDirection = direction;
        car.dragTimer = Math.max(car.dragTimer || 0, durationSeconds);
        car.dragStrength = strength;
    }

    clearDragOnCar(car) {
        if (!car || car.type !== 'car') {
            return;
        }
        car.dragTimer = 0;
        car.dragStrength = 0;
        car.dragDirection = null;
    }

    applyTurnPenalty(id, multiplier, durationSeconds) {
        if (!id) {
            return;
        }
        const existing = this.turnPenalties.get(id);
        if (existing) {
            existing.timer = Math.max(existing.timer, durationSeconds);
            existing.multiplier = Math.min(existing.multiplier, multiplier);
        } else {
            this.turnPenalties.set(id, {
                multiplier,
                timer: durationSeconds
            });
        }
        this.recalculateTurnPenalty();
    }

    clearTurnPenalty(id) {
        if (!id || !this.turnPenalties.has(id)) {
            return;
        }
        this.turnPenalties.delete(id);
        this.recalculateTurnPenalty();
    }

    recalculateTurnPenalty() {
        if (this.turnPenalties.size === 0) {
            this.turnPenaltyMultiplier = 1;
            return;
        }
        let multiplier = 1;
        for (const penalty of this.turnPenalties.values()) {
            multiplier = Math.min(multiplier, penalty.multiplier);
        }
        this.turnPenaltyMultiplier = multiplier;
    }

    getHeatIntensity() {
        return this.heatIntensity || 0;
    }

    createEngine(x, y) {
        const container = this.scene.add.container(x, y);
        container.setDepth(ENGINE_DEPTH);

        const bodyColor = Phaser.Display.Color.HexStringToColor(PALETTE.engineBody).color;
        const accentColor = Phaser.Display.Color.HexStringToColor(PALETTE.engineAccent).color;
        const width = TRAIN.engineSize.width;
        const height = TRAIN.engineSize.height;

        const wheelRadius = height * 0.32;
        const wheelY = height * 0.5;
        const groundY = wheelY + wheelRadius;

        const boilerWidth = width * 0.64;
        const boilerHeight = height * 0.75;
        const cabWidth = width * 0.28;
        const cabHeight = height * 1.15;
        const plowWidth = width * 0.42;
        const plowHeight = height * 0.48;

        const boilerBottom = wheelY - wheelRadius * 0.35;
        const boilerY = boilerBottom - boilerHeight * 0.5;
        const cabBottom = boilerBottom;
        const cabY = cabBottom - cabHeight * 0.5;

        const boilerX = width * 0.05;
        const cabX = boilerX - boilerWidth * 0.5 - cabWidth * 0.5 + width * 0.02;
        const plowBackX = boilerX + boilerWidth * 0.5 - plowWidth * 0.08;

        const plow = this.scene.add.triangle(
            0,
            0,
            0,
            0,
            plowWidth,
            0,
            0,
            -plowHeight,
            accentColor
        );
        plow.setOrigin(0, 1);
        plow.x = plowBackX;
        plow.y = groundY;
        plow.setStrokeStyle(2, 0x1a1a1a);

        const plowGlow = this.scene.add.triangle(
            0,
            0,
            0,
            0,
            plowWidth,
            0,
            0,
            -plowHeight,
            accentColor
        );
        plowGlow.setOrigin(0, 1);
        plowGlow.x = plowBackX;
        plowGlow.y = groundY;
        plowGlow.setScale(TRAIN.engineGlowScale);
        plowGlow.setAlpha(TRAIN.engineGlowMinAlpha);
        plowGlow.setBlendMode(Phaser.BlendModes.ADD);

        const boiler = this.scene.add.rectangle(
            boilerX,
            boilerY,
            boilerWidth,
            boilerHeight,
            bodyColor
        );
        boiler.setStrokeStyle(2, 0x1a1a1a);

        const cab = this.scene.add.rectangle(
            cabX,
            cabY,
            cabWidth,
            cabHeight,
            bodyColor
        );
        cab.setStrokeStyle(2, 0x1a1a1a);

        const stackWidth = width * 0.08;
        const stackHeight = height * 0.45;
        const stackX = boilerX + boilerWidth * 0.22;
        const stackY = boilerY - boilerHeight * 0.5 - stackHeight * 0.5;
        const smokestack = this.scene.add.rectangle(
            stackX,
            stackY,
            stackWidth,
            stackHeight,
            accentColor
        );
        smokestack.setStrokeStyle(2, 0x1a1a1a);

        const stackGlow = this.scene.add.rectangle(
            stackX,
            stackY,
            stackWidth,
            stackHeight,
            accentColor
        );
        stackGlow.setScale(TRAIN.engineGlowScale);
        stackGlow.setAlpha(TRAIN.engineGlowMinAlpha);
        stackGlow.setBlendMode(Phaser.BlendModes.ADD);

        const windowWidth = cabWidth * 0.32;
        const windowHeight = cabHeight * 0.22;
        const windowX = cabX + cabWidth * 0.1;
        const cabWindowTop = this.scene.add.rectangle(
            windowX,
            cabY - cabHeight * 0.18,
            windowWidth,
            windowHeight,
            0xcce6ff
        );
        cabWindowTop.setStrokeStyle(2, 0x1a1a1a);
        const cabWindowBottom = this.scene.add.rectangle(
            windowX,
            cabY + cabHeight * 0.12,
            windowWidth,
            windowHeight,
            0xcce6ff
        );
        cabWindowBottom.setStrokeStyle(2, 0x1a1a1a);

        const heatColor = Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;
        const heatGlow = this.scene.add.rectangle(
            boilerX + boilerWidth * 0.12,
            boilerY - boilerHeight * 0.1,
            boilerWidth * 0.18,
            boilerHeight * 0.3,
            heatColor
        );
        heatGlow.setAlpha(0);
        heatGlow.setBlendMode(Phaser.BlendModes.ADD);

        const rocketBodyWidth = width * 0.16;
        const rocketBodyHeight = height * 0.22;
        const rocketNozzleLength = rocketBodyWidth * 0.35;
        const rocketNozzleHeight = rocketBodyHeight * 0.7;
        const rocketFlameLength = rocketBodyWidth * 0.7;
        const rocketFlameHeight = rocketBodyHeight * 0.9;
        const cabBackX = cabX - cabWidth * 0.5;
        const rocketBaseX = cabBackX - rocketBodyWidth * 0.3;
        const rocketOffsets = [
            cabY - cabHeight * 0.18,
            cabY + cabHeight * 0.18
        ];
        const rocketFlames = [];
        const rocketBodies = [];
        const rocketNozzles = [];

        rocketOffsets.forEach((offsetY) => {
            const body = this.scene.add.rectangle(
                rocketBaseX,
                offsetY,
                rocketBodyWidth,
                rocketBodyHeight,
                bodyColor
            );
            body.setStrokeStyle(2, 0x1a1a1a);

            const band = this.scene.add.rectangle(
                rocketBaseX + rocketBodyWidth * 0.15,
                offsetY,
                rocketBodyWidth * 0.22,
                rocketBodyHeight * 0.5,
                accentColor
            );
            band.setStrokeStyle(2, 0x1a1a1a);

            const nozzle = this.scene.add.triangle(
                0,
                0,
                0,
                -rocketNozzleHeight * 0.5,
                0,
                rocketNozzleHeight * 0.5,
                -rocketNozzleLength,
                0,
                accentColor
            );
            nozzle.setOrigin(0, 0.5);
            nozzle.x = rocketBaseX - rocketBodyWidth * 0.5 + 1;
            nozzle.y = offsetY;
            nozzle.setStrokeStyle(2, 0x1a1a1a);

            const flame = this.scene.add.triangle(
                0,
                0,
                0,
                -rocketFlameHeight * 0.5,
                0,
                rocketFlameHeight * 0.5,
                -rocketFlameLength,
                0,
                0xffb36b
            );
            flame.setOrigin(0, 0.5);
            flame.x = nozzle.x - rocketNozzleLength + 2;
            flame.y = offsetY;
            flame.setAlpha(0.35);
            flame.setBlendMode(Phaser.BlendModes.ADD);
            flame.setVisible(false);

            rocketFlames.push(flame);
            rocketBodies.push(body, band);
            rocketNozzles.push(nozzle);
        });

        const wheelPositions = [
            cabX - cabWidth * 0.1,
            boilerX - boilerWidth * 0.25,
            boilerX + boilerWidth * 0.05,
            boilerX + boilerWidth * 0.35
        ];
        const engineWheels = wheelPositions.map((offsetX) =>
            this.scene.add.circle(
                offsetX,
                wheelY,
                wheelRadius,
                0x1a1a1a
            )
        );
        engineWheels.forEach((wheel) => wheel.setStrokeStyle(2, 0x000000));

        container.add([
            ...engineWheels,
            ...rocketFlames,
            ...rocketNozzles,
            ...rocketBodies,
            boiler,
            cab,
            plowGlow,
            plow,
            stackGlow,
            smokestack,
            cabWindowTop,
            cabWindowBottom,
            heatGlow
        ]);
        const accentParts = [plow, smokestack];
        const accentGlowParts = [plowGlow, stackGlow];

        nextSegmentId += 1;
        const id = nextSegmentId;
        return {
            id,
            type: 'engine',
            x,
            y,
            rotation: 0,
            // Keep collision radius stable while silhouette proportions change.
            radius: TRAIN.engineHitRadius,
            hp: this.getEngineMaxHp(),
            maxHp: this.getEngineMaxHp(),
            weaponCooldown: 0,
            accentParts,
            accentGlowParts,
            container,
            heat: 0,
            heatGlow,
            thrusterFlames: rocketFlames
        };
    }

    createCar(x, y, colorKey, tier) {
        const container = this.scene.add.container(x, y);
        container.setDepth(CAR_DEPTH);

        const carColor = COLORS[colorKey] ? COLORS[colorKey].phaser : 0xffffff;
        const carBody = this.scene.add.rectangle(
            0,
            0,
            TRAIN.carSize.width,
            TRAIN.carSize.height,
            carColor
        );
        carBody.setStrokeStyle(2, 0x1a1a1a);
        const detail = this.scene.add.rectangle(
            -TRAIN.carSize.width * 0.2,
            0,
            TRAIN.carSize.width * 0.2,
            TRAIN.carSize.height * 0.6,
            Phaser.Display.Color.HexStringToColor(PALETTE.engineBody).color
        );
        const tierPlates = this.createTierPlates(tier, carColor);
        const wheelLeft = this.scene.add.circle(
            -TRAIN.carSize.width * 0.2,
            TRAIN.carSize.height * 0.35,
            TRAIN.carSize.height * 0.12,
            0x1a1a1a
        );
        const wheelRight = this.scene.add.circle(
            TRAIN.carSize.width * 0.2,
            TRAIN.carSize.height * 0.35,
            TRAIN.carSize.height * 0.12,
            0x1a1a1a
        );
        const heatColor = Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;
        const heatGlow = this.scene.add.rectangle(
            TRAIN.carSize.width * 0.1,
            -TRAIN.carSize.height * 0.2,
            TRAIN.carSize.width * 0.22,
            TRAIN.carSize.height * 0.28,
            heatColor
        );
        heatGlow.setAlpha(0);
        heatGlow.setBlendMode(Phaser.BlendModes.ADD);
        const attachmentData = this.createColorAttachment(colorKey);
        const colorAttachments = attachmentData.parts;
        const weaponBarrels = attachmentData.barrels;
        const damageOverlay = this.scene.add.graphics();
        const tierLabel = this.scene.add.text(
            TRAIN.carSize.width * 0.15,
            -TRAIN.carSize.height * 0.35,
            `${tier}`,
            {
                fontFamily: UI.fontFamily,
                fontSize: '12px',
                color: PALETTE.uiText,
                stroke: PALETTE.uiShadow,
                strokeThickness: 2
            }
        );
        tierLabel.setResolution(RENDER.textResolution);
        tierLabel.setOrigin(0.5, 0.5);
        container.add([
            carBody,
            detail,
            ...tierPlates,
            damageOverlay,
            wheelLeft,
            wheelRight,
            heatGlow,
            ...colorAttachments,
            tierLabel
        ]);

        nextSegmentId += 1;
        const id = nextSegmentId;
        const maxHp = this.getCarHpForTier(tier);
        const car = {
            id,
            type: 'car',
            colorKey,
            tier,
            x,
            y,
            rotation: 0,
            radius: TRAIN.carSize.width * 0.4,
            hp: maxHp,
            maxHp,
            weaponCooldown: 0,
            spawnOrder: this.spawnOrderCounter += 1,
            isMerging: false,
            followHoldSeconds: 0,
            container,
            tierLabel,
            carBody,
            weaponBarrels,
            damageOverlay,
            damageState: -1,
            damageSeed: id * 13 + tier * 7,
            heat: 0,
            heatGlow,
            dragTimer: 0,
            dragStrength: 0,
            dragDirection: null,
            smokeTimer: 0,
            sparkTimer: 0
        };
        this.updateCarDamageState(car);
        return car;
    }

    getCarHpForTier(tier) {
        const base = this.getBaseCarHpForTier(tier);
        return Math.round(base * this.hpMultiplier);
    }

    getBaseCarHpForTier(tier) {
        const tiers = TRAIN.carHpByTier;
        if (tier <= tiers.length) {
            return tiers[tier - 1];
        }

        const last = tiers[tiers.length - 1];
        const previous = tiers.length > 1 ? tiers[tiers.length - 2] : last;
        const step = last - previous;
        return last + step * (tier - tiers.length);
    }

    getEngineMaxHp() {
        return Math.round(TRAIN.engineHp * this.hpMultiplier);
    }

    setSpeedMultiplier(multiplier) {
        const clamped = Math.max(0.5, multiplier);
        this.speedMultiplier = clamped;
        this.turnSpeedMultiplier = clamped;
    }

    setHpMultiplier(multiplier) {
        const clamped = Math.max(0.5, multiplier);
        const engineRatio = this.engine.maxHp > 0
            ? this.engine.hp / this.engine.maxHp
            : 1;
        this.hpMultiplier = clamped;
        this.engine.maxHp = this.getEngineMaxHp();
        this.engine.hp = Math.min(
            this.engine.maxHp,
            Math.round(this.engine.maxHp * engineRatio)
        );

        for (const car of this.cars) {
            const ratio = car.maxHp > 0 ? car.hp / car.maxHp : 1;
            car.maxHp = this.getCarHpForTier(car.tier);
            car.hp = Math.min(car.maxHp, Math.round(car.maxHp * ratio));
            this.updateCarDamageState(car);
        }
    }

    applyWeaponRecoil(segment) {
        if (!segment || !segment.weaponBarrels || segment.weaponBarrels.length === 0) {
            return;
        }

        const recoilDistance = 4;
        const recoilDuration = 80;
        for (const barrel of segment.weaponBarrels) {
            const baseX = Number.isFinite(barrel.recoilBaseX)
                ? barrel.recoilBaseX
                : barrel.x;
            this.scene.tweens.killTweensOf(barrel);
            barrel.x = baseX - recoilDistance;
            this.scene.tweens.add({
                targets: barrel,
                x: baseX,
                duration: recoilDuration,
                ease: 'Quad.Out'
            });
        }
    }

    updateCarDamageState(car) {
        if (!car || !car.damageOverlay) {
            return;
        }

        const ratio = car.maxHp > 0 ? car.hp / car.maxHp : 0;
        let state = 0;
        if (ratio <= 0.25) {
            state = 3;
        } else if (ratio <= 0.5) {
            state = 2;
        } else if (ratio <= 0.75) {
            state = 1;
        }

        if (state === car.damageState) {
            return;
        }

        car.damageState = state;
        car.damageOverlay.clear();
        if (state === 0) {
            return;
        }

        const rng = this.createDamageRng(car.damageSeed + state * 31);
        const halfW = TRAIN.carSize.width * 0.5;
        const halfH = TRAIN.carSize.height * 0.5;
        const scratchColor = this.shadeColor(car.carBody.fillColor, -40);
        const crackColor = this.shadeColor(car.carBody.fillColor, -80);

        if (state >= 1) {
            const scratchCount = 2 + Math.floor(rng() * 2);
            car.damageOverlay.lineStyle(1, scratchColor, 0.7);
            for (let i = 0; i < scratchCount; i += 1) {
                const startX = (rng() * 2 - 1) * halfW * 0.75;
                const startY = (rng() * 2 - 1) * halfH * 0.55;
                const length = 4 + rng() * 8;
                const angle = rng() * Math.PI * 2;
                const endX = startX + Math.cos(angle) * length;
                const endY = startY + Math.sin(angle) * length;
                car.damageOverlay.strokeLineShape(
                    new Phaser.Geom.Line(startX, startY, endX, endY)
                );
            }
        }

        if (state >= 2) {
            const crackCount = state >= 3 ? 3 : 2;
            car.damageOverlay.lineStyle(1.4, crackColor, 0.85);
            for (let i = 0; i < crackCount; i += 1) {
                const edge = Math.floor(rng() * 4);
                let startX = 0;
                let startY = 0;
                if (edge === 0) {
                    startX = -halfW * 0.9;
                    startY = (rng() * 2 - 1) * halfH * 0.6;
                } else if (edge === 1) {
                    startX = halfW * 0.9;
                    startY = (rng() * 2 - 1) * halfH * 0.6;
                } else if (edge === 2) {
                    startX = (rng() * 2 - 1) * halfW * 0.7;
                    startY = -halfH * 0.75;
                } else {
                    startX = (rng() * 2 - 1) * halfW * 0.7;
                    startY = halfH * 0.75;
                }

                const midX = startX * 0.5 + (rng() - 0.5) * 6;
                const midY = startY * 0.5 + (rng() - 0.5) * 6;
                const endX = (rng() * 2 - 1) * halfW * 0.25;
                const endY = (rng() * 2 - 1) * halfH * 0.25;
                car.damageOverlay.beginPath();
                car.damageOverlay.moveTo(startX, startY);
                car.damageOverlay.lineTo(midX, midY);
                car.damageOverlay.lineTo(endX, endY);
                car.damageOverlay.strokePath();
            }
        }
    }

    createDamageRng(seed) {
        let value = seed % 2147483647;
        if (value <= 0) {
            value += 2147483646;
        }
        return () => {
            value = (value * 16807) % 2147483647;
            return (value - 1) / 2147483646;
        };
    }

    shadeColor(colorValue, amount) {
        const color = Phaser.Display.Color.IntegerToColor(colorValue);
        const r = Phaser.Math.Clamp(color.r + amount, 0, 255);
        const g = Phaser.Math.Clamp(color.g + amount, 0, 255);
        const b = Phaser.Math.Clamp(color.b + amount, 0, 255);
        return Phaser.Display.Color.GetColor(r, g, b);
    }

    createTierPlates(tier, carColor) {
        const plates = [];
        const plateColor = this.shadeColor(carColor, -25);
        const edgeColor = this.shadeColor(carColor, -55);

        if (tier >= 2) {
            const plate = this.scene.add.rectangle(
                -TRAIN.carSize.width * 0.08,
                -TRAIN.carSize.height * 0.05,
                TRAIN.carSize.width * 0.46,
                TRAIN.carSize.height * 0.45,
                plateColor
            );
            plate.setStrokeStyle(1, 0x1a1a1a, 0.8);
            const rivetLeft = this.scene.add.circle(
                -TRAIN.carSize.width * 0.26,
                -TRAIN.carSize.height * 0.18,
                1.6,
                0x1a1a1a
            );
            const rivetRight = this.scene.add.circle(
                -TRAIN.carSize.width * 0.02,
                TRAIN.carSize.height * 0.12,
                1.6,
                0x1a1a1a
            );
            plates.push(plate, rivetLeft, rivetRight);
        }

        if (tier >= 3) {
            const topEdge = this.scene.add.rectangle(
                0,
                -TRAIN.carSize.height * 0.38,
                TRAIN.carSize.width * 0.9,
                3,
                edgeColor
            );
            const stripe = this.scene.add.graphics();
            stripe.lineStyle(2, 0x1a1a1a, 0.7);
            stripe.lineBetween(
                -TRAIN.carSize.width * 0.25,
                -TRAIN.carSize.height * 0.32,
                TRAIN.carSize.width * 0.05,
                -TRAIN.carSize.height * 0.05
            );
            plates.push(topEdge, stripe);
        }

        if (tier >= 4) {
            const insignia = this.scene.add.circle(
                TRAIN.carSize.width * 0.22,
                -TRAIN.carSize.height * 0.05,
                TRAIN.carSize.height * 0.18,
                this.shadeColor(carColor, 20)
            );
            insignia.setStrokeStyle(1, 0x1a1a1a, 0.8);
            const seam = this.scene.add.rectangle(
                0,
                TRAIN.carSize.height * 0.32,
                TRAIN.carSize.width * 0.52,
                2,
                Phaser.Display.Color.HexStringToColor(PALETTE.warning).color
            );
            seam.setAlpha(0.4);
            seam.setBlendMode(Phaser.BlendModes.ADD);
            plates.push(insignia, seam);
        }

        return plates;
    }

    addCar(colorKey, tier = 1) {
        const tail = this.cars.length > 0
            ? this.cars[this.cars.length - 1]
            : this.engine;
        const offsetX = Math.cos(tail.rotation + Math.PI) * TRAIN.attachSpacing;
        const offsetY = Math.sin(tail.rotation + Math.PI) * TRAIN.attachSpacing;
        const car = this.createCar(tail.x + offsetX, tail.y + offsetY, colorKey, tier);
        this.cars.push(car);

        this.stats.carsCollected += 1;
        this.stats.highestTier = Math.max(this.stats.highestTier, tier);

        if (this.eventHandlers.onCarAdded) {
            this.eventHandlers.onCarAdded(car);
        }

        this.enforceMaxCars();
        return car;
    }

    createColorAttachment(colorKey) {
        if (colorKey === 'red') {
            // Red = assault: forward vents + twin barrel block.
            const vent = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.05,
                -TRAIN.carSize.height * 0.32,
                TRAIN.carSize.width * 0.32,
                TRAIN.carSize.height * 0.12,
                0x1a1a1a
            );
            const barrelLeft = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.42,
                -TRAIN.carSize.height * 0.2,
                TRAIN.carSize.width * 0.22,
                TRAIN.carSize.height * 0.12,
                0x1a1a1a
            );
            const barrelRight = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.42,
                TRAIN.carSize.height * 0.2,
                TRAIN.carSize.width * 0.22,
                TRAIN.carSize.height * 0.12,
                0x1a1a1a
            );
            barrelLeft.recoilBaseX = barrelLeft.x;
            barrelRight.recoilBaseX = barrelRight.x;
            return { parts: [vent, barrelLeft, barrelRight], barrels: [barrelLeft, barrelRight] };
        }

        if (colorKey === 'blue') {
            // Blue = control: coil pod + stabilizer housing.
            const base = this.scene.add.rectangle(
                0,
                -TRAIN.carSize.height * 0.1,
                TRAIN.carSize.width * 0.32,
                TRAIN.carSize.height * 0.16,
                0x1a1a1a
            );
            const coil = this.scene.add.circle(
                0,
                -TRAIN.carSize.height * 0.35,
                TRAIN.carSize.height * 0.22,
                0xcce6ff
            );
            coil.setStrokeStyle(2, 0x1a1a1a);
            const nozzle = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.36,
                0,
                TRAIN.carSize.width * 0.16,
                TRAIN.carSize.height * 0.12,
                0x1a1a1a
            );
            nozzle.recoilBaseX = nozzle.x;
            return { parts: [base, coil, nozzle], barrels: [nozzle] };
        }

        if (colorKey === 'yellow') {
            // Yellow = piercing: long cannon block + recoil plates.
            const recoilPlate = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.22,
                0,
                TRAIN.carSize.width * 0.1,
                TRAIN.carSize.height * 0.5,
                0x1a1a1a
            );
            const cannon = this.scene.add.rectangle(
                TRAIN.carSize.width * 0.5,
                0,
                TRAIN.carSize.width * 0.3,
                TRAIN.carSize.height * 0.2,
                0x1a1a1a
            );
            cannon.recoilBaseX = cannon.x;
            return { parts: [recoilPlate, cannon], barrels: [cannon] };
        }

        return { parts: [], barrels: [] };
    }

    jettisonTail() {
        if (this.cars.length === 0) {
            return null;
        }
        const tail = this.cars[this.cars.length - 1];
        this.removeCarById(tail.id, 'jettison');
        return tail;
    }

    enforceMaxCars() {
        if (!Number.isFinite(TRAIN.maxCars)) {
            return;
        }
        if (this.cars.length <= TRAIN.maxCars) {
            return;
        }

        const oldestCar = this.cars.reduce((oldest, car) => {
            if (!oldest || car.spawnOrder < oldest.spawnOrder) {
                return car;
            }
            return oldest;
        }, null);

        if (!oldestCar) {
            return;
        }

        this.removeCarById(oldestCar.id, 'max');
    }

    mergeCars(startIndex, newTier, colorKey, spawnPosition, mergeCount = 2) {
        devAssert(startIndex >= 0, 'Merge start index must be non-negative');
        devAssert(startIndex + mergeCount - 1 < this.cars.length, 'Merge index must fit');

        const removedCars = this.cars.splice(startIndex, mergeCount);
        for (const car of removedCars) {
            car.container.destroy();
        }

        const car = this.createCar(
            spawnPosition.x,
            spawnPosition.y,
            colorKey,
            newTier
        );
        this.cars.splice(startIndex, 0, car);
        this.stats.mergesCompleted += 1;
        this.stats.highestTier = Math.max(this.stats.highestTier, newTier);

        if (this.eventHandlers.onMergeCompleted) {
            this.eventHandlers.onMergeCompleted(car);
        }

        return car;
    }

    getCarSlots() {
        return this.cars.map((car) => ({
            x: car.x,
            y: car.y,
            rotation: car.rotation
        }));
    }

    applyCarOrder(newOrder, slots = null) {
        devAssert(Array.isArray(newOrder), 'Car order must be an array');
        devAssert(
            newOrder.length === this.cars.length,
            'Car order length must match current car count'
        );
        if (slots) {
            devAssert(
                slots.length === newOrder.length,
                'Car slot count must match car order length'
            );
        }

        // Apply the new ordering first so the chain logic sees the updated spine.
        this.cars = [...newOrder];

        this.cars.forEach((car, index) => {
            // Clear any hold so reordering takes effect immediately.
            car.followHoldSeconds = 0;

            if (!slots) {
                return;
            }

            const slot = slots[index];
            if (!slot) {
                return;
            }

            car.x = slot.x;
            car.y = slot.y;
            car.rotation = slot.rotation;
            car.container.x = car.x;
            car.container.y = car.y;
            car.container.rotation = car.rotation;
        });

        this.updateCouplings();
    }

    applyDamageToSegment(segment, amount) {
        if (segment.type === 'engine') {
            if (this.invulnerableTimer > 0) {
                return { destroyed: false, type: 'engine' };
            }
        }

        if (segment.type === 'engine' && this.isInvincible()) {
            return { destroyed: false, type: 'engine' };
        }

        if (segment.type === 'car' && this.isInvincible()) {
            return { destroyed: false, type: 'car' };
        }

        segment.hp = Math.max(0, segment.hp - amount);
        if (segment.type === 'car') {
            this.updateCarDamageState(segment);
        }
        if (segment.hp > 0) {
            return { destroyed: false, type: segment.type };
        }

        if (segment.type === 'engine') {
            if (this.eventHandlers.onEngineDestroyed) {
                this.eventHandlers.onEngineDestroyed(segment);
            }
            return { destroyed: true, type: 'engine', position: { x: segment.x, y: segment.y } };
        }

        if (segment.type === 'car') {
            this.removeCarById(segment.id, 'damage');
            return { destroyed: true, type: 'car', position: { x: segment.x, y: segment.y } };
        }

        return { destroyed: false, type: segment.type };
    }

    removeCarById(id, reason) {
        const index = this.cars.findIndex((car) => car.id === id);
        if (index === -1) {
            return;
        }

        const [car] = this.cars.splice(index, 1);
        car.container.destroy();

        if (reason === 'damage' || reason === 'max' || reason === 'jettison') {
            this.stats.carsLost += 1;
        }

        if (index < this.cars.length) {
            this.cars[index].followHoldSeconds = TRAIN.chainReformDelaySeconds;
        }

        if (this.eventHandlers.onCarDestroyed) {
            this.eventHandlers.onCarDestroyed(car, reason);
        }

        debugLog('Car removed', { id, reason });
    }

    getAllSegments() {
        return [this.engine, ...this.cars];
    }

    getWeaponCars() {
        return this.cars;
    }

    getCarById(id) {
        return this.cars.find((car) => car.id === id) || null;
    }

    isInvincible() {
        return this.eventHandlers.isInvincible
            ? this.eventHandlers.isInvincible()
            : false;
    }

    setEngineAccentColor(colorKey) {
        if (this.engineAccentColorKey === colorKey) {
            return;
        }
        this.engineAccentColorKey = colorKey;
        const fallback = Phaser.Display.Color.HexStringToColor(PALETTE.engineAccent).color;
        const color = colorKey && COLORS[colorKey] ? COLORS[colorKey].phaser : fallback;
        for (const part of this.engine.accentParts) {
            part.fillColor = color;
        }

        if (this.engine.accentGlowParts) {
            for (const part of this.engine.accentGlowParts) {
                part.fillColor = color;
            }
        }

        if (this.engineAccentTween) {
            this.scene.tweens.killTweensOf(this.engine.accentGlowParts);
            this.engineAccentTween = null;
        }

        if (!this.engine.accentGlowParts || this.engine.accentGlowParts.length === 0) {
            return;
        }

        if (!colorKey) {
            this.engine.accentGlowParts.forEach((part) => {
                part.setAlpha(TRAIN.engineGlowMinAlpha * 0.4);
            });
            return;
        }

        this.engine.accentGlowParts.forEach((part) => {
            part.setAlpha(TRAIN.engineGlowMinAlpha);
        });

        this.engineAccentTween = this.scene.tweens.add({
            targets: this.engine.accentGlowParts,
            alpha: TRAIN.engineGlowMaxAlpha,
            duration: TRAIN.engineGlowPulseSeconds * 1000,
            yoyo: true,
            repeat: -1
        });
    }

    getCameraLookAhead() {
        return {
            x: Math.cos(this.engine.rotation) * CAMERA.lookAheadDistance,
            y: Math.sin(this.engine.rotation) * CAMERA.lookAheadDistance
        };
    }
}
