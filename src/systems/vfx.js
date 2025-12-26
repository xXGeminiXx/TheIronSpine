/**
 * vfx.js - Lightweight visual effects and particle handling.
 *
 * Keeps effects centralized so core gameplay files stay focused.
 * All particles are simple shapes and remain within the performance budget.
 */

import { EFFECTS, PALETTE, TRAIN } from '../config.js';

const VFX_DEPTH = 15;
const VFX_RING_DEPTH = 19;
const MAX_PARTICLES = 200;

export class VfxSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.smokeTimer = 0;
    }

    update(deltaSeconds) {
        for (let index = this.particles.length - 1; index >= 0; index -= 1) {
            const particle = this.particles[index];
            particle.age += deltaSeconds;

            if (particle.age >= particle.life) {
                particle.sprite.destroy();
                this.particles.splice(index, 1);
                continue;
            }

            particle.x += particle.vx * deltaSeconds;
            particle.y += particle.vy * deltaSeconds;
            particle.sprite.x = particle.x;
            particle.sprite.y = particle.y;

            const t = particle.age / particle.life;
            particle.sprite.setAlpha(particle.alpha * (1 - t));
            particle.sprite.setScale(1 + t * 0.4);
        }
    }

    updateCarDamageEffects(cars, deltaSeconds) {
        if (!cars || cars.length === 0) {
            return;
        }

        for (const car of cars) {
            if (!car || car.hp <= 0 || car.maxHp <= 0) {
                continue;
            }

            const ratio = car.hp / car.maxHp;
            if (ratio <= 0.25) {
                car.smokeTimer = Math.max(0, (car.smokeTimer || 0) - deltaSeconds);
                if (car.smokeTimer === 0) {
                    this.spawnSmoke({
                        x: car.x + (Math.random() - 0.5) * TRAIN.carSize.width * 0.4,
                        y: car.y + (Math.random() - 0.5) * TRAIN.carSize.height * 0.3
                    });
                    car.smokeTimer = EFFECTS.carSmokeInterval;
                }
            } else {
                car.smokeTimer = 0;
            }

            if (ratio <= 0.5 && ratio > 0.25) {
                car.sparkTimer = Math.max(0, (car.sparkTimer || 0) - deltaSeconds);
                if (car.sparkTimer === 0) {
                    this.spawnSparks({
                        x: car.x + (Math.random() - 0.5) * TRAIN.carSize.width * 0.3,
                        y: car.y + (Math.random() - 0.5) * TRAIN.carSize.height * 0.2
                    });
                    car.sparkTimer = EFFECTS.sparkInterval;
                }
            } else {
                car.sparkTimer = 0;
            }
        }
    }

    updateEngineSmoke(engine, deltaSeconds, heatLevel = 0) {
        if (!engine) {
            return;
        }

        this.smokeTimer -= deltaSeconds;
        if (this.smokeTimer > 0) {
            return;
        }

        const heat = Math.max(0, Math.min(1, heatLevel || 0));
        const interval = Math.max(0.05, EFFECTS.smokeInterval * (1 - heat * 0.6));
        const offset = TRAIN.engineSize.width * 0.35;
        const smokePosition = {
            x: engine.x - Math.cos(engine.rotation) * offset,
            y: engine.y - Math.sin(engine.rotation) * offset
        };

        this.spawnSmoke(smokePosition);
        this.smokeTimer = interval;
    }

    spawnSparks(position) {
        const color = this.resolveColor(PALETTE.warning);
        this.spawnBurst(position, color, {
            count: EFFECTS.sparkParticleCount,
            speed: EFFECTS.sparkParticleSpeed,
            life: EFFECTS.sparkParticleLife,
            radius: 2.2,
            alpha: 0.9,
            spread: 0.6
        });
    }

    spawnMergeBurst(position, colorHex) {
        const color = this.resolveColor(colorHex || PALETTE.warning);
        this.spawnBurst(position, color, {
            count: EFFECTS.mergeParticleCount,
            speed: EFFECTS.mergeParticleSpeed,
            life: EFFECTS.mergeParticleLife,
            radius: 2.6,
            alpha: 0.9
        });
    }

    spawnExplosion(position) {
        const color = this.resolveColor(PALETTE.warning);
        this.spawnBurst(position, color, {
            count: EFFECTS.explosionParticleCount,
            speed: EFFECTS.explosionParticleSpeed,
            life: EFFECTS.explosionParticleLife,
            radius: 3.2,
            alpha: 0.9
        });

        this.spawnShockRing(position, color);
    }

    spawnEnemyPop(position, colorHex) {
        const color = this.resolveColor(colorHex || PALETTE.uiText);
        this.spawnBurst(position, color, {
            count: 6,
            speed: 90,
            life: 0.35,
            radius: 2.4,
            alpha: 0.8,
            spread: 0.7
        });
    }

    spawnPulseRing(center) {
        const color = this.resolveColor(PALETTE.warning);
        const ring = this.scene.add.circle(
            center.x,
            center.y,
            40,
            color,
            0
        );
        ring.setDepth(VFX_RING_DEPTH);
        ring.setStrokeStyle(4, color, 0.8);
        ring.setScrollFactor(0);

        this.scene.tweens.add({
            targets: ring,
            radius: 380,
            alpha: 0,
            duration: EFFECTS.pulseRingDuration * 1000,
            onComplete: () => ring.destroy()
        });
    }

    spawnShockRing(position, color) {
        const ring = this.scene.add.circle(
            position.x,
            position.y,
            8,
            color,
            0
        );
        ring.setDepth(VFX_RING_DEPTH);
        ring.setStrokeStyle(3, color, 0.9);

        this.scene.tweens.add({
            targets: ring,
            radius: 60,
            alpha: 0,
            duration: 220,
            onComplete: () => ring.destroy()
        });
    }

    spawnSmoke(position) {
        const color = this.resolveColor(PALETTE.engineBody);
        this.spawnBurst(position, color, {
            count: 2,
            speed: EFFECTS.smokeSpeed,
            life: EFFECTS.smokeLife,
            radius: 4,
            alpha: 0.5,
            spread: 0.6
        });
    }

    spawnBurst(position, color, options) {
        const count = options.count || 8;
        const speed = options.speed || 80;
        const life = options.life || 0.5;
        const radius = options.radius || 2.5;
        const alpha = options.alpha || 0.8;
        const spread = options.spread || 1;

        for (let i = 0; i < count; i += 1) {
            if (this.particles.length >= MAX_PARTICLES) {
                return;
            }

            const angle = Math.random() * Math.PI * 2;
            const magnitude = speed * (0.4 + Math.random() * 0.6) * spread;
            this.spawnParticle({
                x: position.x,
                y: position.y,
                vx: Math.cos(angle) * magnitude,
                vy: Math.sin(angle) * magnitude,
                life,
                radius,
                color,
                alpha
            });
        }
    }

    spawnParticle({ x, y, vx, vy, life, radius, color, alpha }) {
        const sprite = this.scene.add.circle(x, y, radius, color, alpha);
        sprite.setDepth(VFX_DEPTH);

        this.particles.push({
            x,
            y,
            vx,
            vy,
            life,
            age: 0,
            alpha,
            sprite
        });
    }

    resolveColor(colorValue) {
        if (typeof colorValue === 'number') {
            return colorValue;
        }
        return Phaser.Display.Color.HexStringToColor(colorValue).color;
    }

    /**
     * v1.5.1 - Spawn metal shards when enemy is destroyed.
     * @param {object} position - {x, y}
     * @param {number} enemyColor - Enemy base color
     */
    spawnMetalShards(position, enemyColor) {
        const color = this.resolveColor(enemyColor);
        this.spawnBurst(position, color, {
            count: 8,
            speed: 100,
            life: 0.6,
            radius: 3,
            alpha: 0.9,
            spread: 1.2
        });

        // Add some gray metal pieces
        this.spawnBurst(position, 0x888888, {
            count: 5,
            speed: 80,
            life: 0.5,
            radius: 2.5,
            alpha: 0.8,
            spread: 0.8
        });
    }

    /**
     * v1.5.1 - Spawn impact debris on hit.
     * @param {object} position - {x, y}
     * @param {number} damage - Damage dealt
     */
    spawnImpactDebris(position, damage) {
        const count = Math.min(8, 3 + Math.floor(damage / 10));
        this.spawnBurst(position, 0xffaa44, {
            count,
            speed: 60,
            life: 0.4,
            radius: 2,
            alpha: 0.7,
            spread: 0.6
        });
    }

    /**
     * v1.5.1 - Spawn larger burst for critical hits.
     * @param {object} position - {x, y}
     * @param {number} color - Projectile color
     */
    spawnCriticalBurst(position, color) {
        this.spawnBurst(position, this.resolveColor(color), {
            count: 12,
            speed: 120,
            life: 0.8,
            radius: 4,
            alpha: 1.0,
            spread: 1.5
        });

        // Add expanding ring effect
        const ring = this.scene.add.circle(position.x, position.y, 10);
        ring.setDepth(VFX_RING_DEPTH);
        ring.setStrokeStyle(3, this.resolveColor(color), 0.8);
        ring.setFillStyle(0x000000, 0);

        this.scene.tweens.add({
            targets: ring,
            radius: 40,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    /**
     * v1.5.1 - Spawn armor plates falling off boss.
     * @param {object} position - {x, y}
     * @param {number} bossSize - Boss radius
     */
    spawnArmorPlates(position, bossSize = 60) {
        const plateCount = 6;
        for (let i = 0; i < plateCount; i++) {
            const angle = (i / plateCount) * Math.PI * 2;
            const distance = bossSize * 0.8;
            const plateX = position.x + Math.cos(angle) * distance;
            const plateY = position.y + Math.sin(angle) * distance;

            // Create rectangular armor plate
            const plate = this.scene.add.rectangle(
                plateX,
                plateY,
                12,
                18,
                0x888888,
                0.9
            );
            plate.setDepth(VFX_DEPTH);
            plate.setRotation(angle + Math.PI / 2);

            // Animate plate falling
            this.scene.tweens.add({
                targets: plate,
                x: plateX + Math.cos(angle) * 30,
                y: plateY + Math.sin(angle) * 30 + 40, // Gravity
                rotation: angle + Math.PI / 2 + Math.random() * Math.PI * 2,
                alpha: 0,
                duration: 800,
                ease: 'Cubic.easeOut',
                onComplete: () => plate.destroy()
            });
        }
    }

    destroy() {
        this.particles.forEach((particle) => particle.sprite.destroy());
        this.particles.length = 0;
    }
}
