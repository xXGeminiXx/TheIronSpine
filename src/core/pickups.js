import { COLORS, PALETTE, SPAWN, TRAIN } from '../config.js';
import { distanceSquared } from './math.js';

const PICKUP_DEPTH = 14;

let nextPickupId = 1;

export function resetPickupIdCounter() {
    nextPickupId = 1;
}

export class PickupManager {
    constructor(scene, eventHandlers = {}) {
        this.scene = scene;
        this.eventHandlers = eventHandlers;
        this.pickups = [];
    }

    update(deltaSeconds, engine, cars = null) {
        const now = this.scene.time.now / 1000;

        // v1.5.1 Check if boost is active (train has isBoosting property)
        const train = this.scene.train;
        const isBoostActive = train && train.isBoosting;

        for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
            const pickup = this.pickups[index];

            // v1.5.1 Pickup Magnetism - drift toward engine when close
            if (engine) {
                const dx = engine.x - pickup.x;
                const dy = engine.y - pickup.y;
                const distSq = dx * dx + dy * dy;

                // Range multiplier (2x when boosting)
                const rangeMult = isBoostActive ? 2 : 1;
                const slowRange = 80 * rangeMult;
                const fastRange = 40 * rangeMult;

                const slowRangeSq = slowRange * slowRange;
                const fastRangeSq = fastRange * fastRange;

                if (distSq <= slowRangeSq) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.1) {
                        const pullStrength = distSq <= fastRangeSq ? 120 : 40;
                        const pull = pullStrength * deltaSeconds / dist;

                        pickup.velocity.x += dx * pull;
                        pickup.velocity.y += dy * pull;
                    }
                }
            }

            pickup.x += pickup.velocity.x * deltaSeconds;
            pickup.y += pickup.velocity.y * deltaSeconds;
            pickup.sprite.x = pickup.x;
            pickup.sprite.y = pickup.y;
            pickup.glow.x = pickup.x;
            pickup.glow.y = pickup.y;

            pickup.pulse += deltaSeconds * 4;
            const pulseScale = 1 + Math.sin(pickup.pulse) * 0.06;
            pickup.sprite.setScale(pulseScale);
            pickup.glow.setScale(1 + Math.sin(pickup.pulse) * 0.12);

            if (now - pickup.spawnTime >= SPAWN.pickupLifetimeSeconds) {
                this.removePickupByIndex(index);
                continue;
            }

            const collectedByEngine = engine && this.isCollected(engine, pickup);
            const collectedByCar = !collectedByEngine && this.isCollectedByAny(cars, pickup);
            if (collectedByEngine || collectedByCar) {
                this.handleCollection(pickup);
                this.removePickupByIndex(index);
            }
        }
    }

    spawnPickup(position, colorKey, velocity) {
        const color = COLORS[colorKey];
        const glow = this.scene.add.circle(
            position.x,
            position.y,
            TRAIN.carSize.width * 0.65,
            color.phaser,
            0.18
        );
        glow.setDepth(PICKUP_DEPTH - 1);
        const sprite = this.scene.add.rectangle(
            position.x,
            position.y,
            TRAIN.carSize.width,
            TRAIN.carSize.height,
            color.phaser
        );
        sprite.setDepth(PICKUP_DEPTH);
        // Stronger outline so pickups read against the ground pattern.
        sprite.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(PALETTE.pickupGlow).color);
        sprite.setAlpha(0.95);

        nextPickupId += 1;
        const id = nextPickupId;
        const pickup = {
            id,
            colorKey,
            x: position.x,
            y: position.y,
            velocity,
            radius: TRAIN.carSize.width * 0.4,
            sprite,
            glow,
            spawnTime: this.scene.time.now / 1000,
            pulse: Math.random() * Math.PI * 2
        };

        this.pickups.push(pickup);
        return pickup;
    }

    isCollected(segment, pickup) {
        const maxDistance = segment.radius + pickup.radius;
        return distanceSquared(segment.x, segment.y, pickup.x, pickup.y) <= maxDistance * maxDistance;
    }

    isCollectedByAny(segments, pickup) {
        if (!segments || segments.length === 0) {
            return false;
        }
        for (const segment of segments) {
            if (segment && this.isCollected(segment, pickup)) {
                return true;
            }
        }
        return false;
    }

    handleCollection(pickup) {
        if (this.eventHandlers.onPickupCollected) {
            this.eventHandlers.onPickupCollected(pickup);
        }
    }

    removePickupByIndex(index) {
        const [pickup] = this.pickups.splice(index, 1);
        pickup.sprite.destroy();
        pickup.glow.destroy();
    }

    clear() {
        while (this.pickups.length > 0) {
            this.removePickupByIndex(this.pickups.length - 1);
        }
    }
}
