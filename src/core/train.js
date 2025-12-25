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
            boiler,
            cab,
            plow,
            smokestack,
            cabWindowTop,
            cabWindowBottom,
            heatGlow
        ]);
        const accentParts = [plow, smokestack];

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
            container,
            heat: 0,
            heatGlow
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
        const colorAttachments = this.createColorAttachment(colorKey);
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
            wheelLeft,
            wheelRight,
            heatGlow,
            ...colorAttachments,
            tierLabel
        ]);

        nextSegmentId += 1;
        const id = nextSegmentId;
        const maxHp = this.getCarHpForTier(tier);
        return {
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
            heat: 0,
            heatGlow,
            dragTimer: 0,
            dragStrength: 0,
            dragDirection: null
        };
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
        }
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
            return [vent, barrelLeft, barrelRight];
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
            return [base, coil];
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
            return [recoilPlate, cannon];
        }

        return [];
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
        const fallback = Phaser.Display.Color.HexStringToColor(PALETTE.engineAccent).color;
        const color = colorKey && COLORS[colorKey] ? COLORS[colorKey].phaser : fallback;
        for (const part of this.engine.accentParts) {
            part.fillColor = color;
        }
    }

    getCameraLookAhead() {
        return {
            x: Math.cos(this.engine.rotation) * CAMERA.lookAheadDistance,
            y: Math.sin(this.engine.rotation) * CAMERA.lookAheadDistance
        };
    }
}
