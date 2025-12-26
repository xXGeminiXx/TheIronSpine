/**
 * weather.js - Procedural Weather and Biome System
 *
 * Adds atmospheric variety and tactical depth through weather effects.
 * All visuals are procedural - no external assets required.
 *
 * WEATHER TYPES:
 *   - Clear: Normal conditions, no modifiers
 *   - Fog: Haze overlay, reduces enemy detection range
 *   - Storm: Rain + lightning, occasional strikes damage enemies
 *   - Dust: Brown fog, reduces pickup visibility
 *   - Ash: Dark particles, ominous atmosphere
 *
 * GAMEPLAY MODIFIERS:
 *   - Fog: Enemies spawn closer (detection range -20%)
 *   - Storm: Random lightning strikes (area damage)
 *   - Dust: Pickup spawn rate reduced slightly
 *
 * INTEGRATION:
 *   1. Create instance in game scene
 *   2. Call update() each frame
 *   3. Use getModifiers() for spawn/combat adjustments
 *   4. Weather changes every 60-90 seconds
 */

const WEATHER_DEPTH = 50; // Below HUD, above everything else
const PARTICLE_DEPTH = 45;
const MAX_WEATHER_PARTICLES = 150;
const WEATHER_CHANGE_INTERVAL = { min: 60, max: 90 }; // Seconds
const LIGHTNING_INTERVAL = { min: 5, max: 12 }; // Seconds during storm

export const WEATHER_TYPES = Object.freeze({
    CLEAR: {
        name: 'Clear',
        particleCount: 0,
        overlayColor: null,
        overlayAlpha: 0,
        modifiers: {
            enemyDetectionRange: 1.0,
            pickupSpawnRate: 1.0
        }
    },
    FOG: {
        name: 'Fog',
        particleCount: 60,
        particleType: 'fog',
        overlayColor: 0xcccccc,
        overlayAlpha: 0.15,
        modifiers: {
            enemyDetectionRange: 0.8, // Enemies spawn closer
            pickupSpawnRate: 1.0
        }
    },
    STORM: {
        name: 'Storm',
        particleCount: 120,
        particleType: 'rain',
        overlayColor: 0x4444aa,
        overlayAlpha: 0.12,
        modifiers: {
            enemyDetectionRange: 1.0,
            pickupSpawnRate: 0.95
        },
        hasLightning: true
    },
    DUST: {
        name: 'Dust Storm',
        particleCount: 80,
        particleType: 'dust',
        overlayColor: 0xaa8866,
        overlayAlpha: 0.18,
        modifiers: {
            enemyDetectionRange: 1.0,
            pickupSpawnRate: 0.85 // Harder to spot pickups
        }
    },
    ASH: {
        name: 'Ashfall',
        particleCount: 50,
        particleType: 'ash',
        overlayColor: 0x333333,
        overlayAlpha: 0.2,
        modifiers: {
            enemyDetectionRange: 1.0,
            pickupSpawnRate: 1.0
        }
    }
});

const WEATHER_ROTATION = ['CLEAR', 'FOG', 'CLEAR', 'STORM', 'CLEAR', 'DUST', 'CLEAR', 'ASH'];

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentWeather = WEATHER_TYPES.CLEAR;
        this.weatherIndex = 0;
        this.changeTimer = this.getRandomChangeTime();
        this.lightningTimer = 0;
        this.particles = [];

        // Graphics layers
        this.overlay = this.scene.add.graphics();
        this.overlay.setDepth(WEATHER_DEPTH);
        this.overlay.setScrollFactor(0);
        this.overlay.setAlpha(0);

        this.lightningGraphics = this.scene.add.graphics();
        this.lightningGraphics.setDepth(WEATHER_DEPTH - 1);
        this.lightningGraphics.setScrollFactor(0);
    }

    /**
     * Update weather system.
     * @param {number} deltaSeconds - Time elapsed since last frame
     * @param {object} camera - Phaser camera for particle positioning
     */
    update(deltaSeconds, camera) {
        // Weather change timer
        this.changeTimer -= deltaSeconds;
        if (this.changeTimer <= 0) {
            this.cycleWeather();
            this.changeTimer = this.getRandomChangeTime();
        }

        // Update particles
        this.updateParticles(deltaSeconds, camera);

        // Update lightning (storm only)
        if (this.currentWeather.hasLightning) {
            this.updateLightning(deltaSeconds, camera);
        }
    }

    cycleWeather() {
        this.weatherIndex = (this.weatherIndex + 1) % WEATHER_ROTATION.length;
        const weatherKey = WEATHER_ROTATION[this.weatherIndex];
        this.setWeather(weatherKey);
    }

    setWeather(weatherKey) {
        const newWeather = WEATHER_TYPES[weatherKey];
        if (!newWeather) {
            return;
        }

        this.currentWeather = newWeather;

        // Update overlay
        if (newWeather.overlayColor) {
            this.updateOverlay(newWeather.overlayColor, newWeather.overlayAlpha);
        } else {
            this.overlay.setAlpha(0);
        }

        // Clear old particles
        this.clearParticles();

        // Spawn new particles
        if (newWeather.particleCount > 0) {
            this.spawnInitialParticles(newWeather);
        }

        // Reset lightning timer
        if (newWeather.hasLightning) {
            this.lightningTimer = this.getRandomLightningTime();
        }
    }

    updateOverlay(color, alpha) {
        this.overlay.clear();
        this.overlay.fillStyle(color, 1);
        this.overlay.fillRect(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height
        );

        this.scene.tweens.add({
            targets: this.overlay,
            alpha,
            duration: 1500,
            ease: 'Cubic.easeInOut'
        });
    }

    spawnInitialParticles(weather) {
        const camera = this.scene.cameras.main;
        for (let i = 0; i < weather.particleCount; i++) {
            this.spawnParticle(weather.particleType, camera, true);
        }
    }

    spawnParticle(type, camera, randomY = false) {
        if (this.particles.length >= MAX_WEATHER_PARTICLES) {
            return;
        }

        const worldView = camera.worldView;
        const padding = 100;

        const particle = {
            x: worldView.left + Math.random() * worldView.width,
            y: randomY
                ? worldView.top + Math.random() * worldView.height
                : worldView.top - padding,
            type,
            sprite: null
        };

        // Create sprite based on type
        switch (type) {
            case 'rain':
                particle.sprite = this.scene.add.line(
                    particle.x, particle.y,
                    0, 0,
                    0, 12,
                    0x88ccff,
                    0.6
                );
                particle.sprite.setLineWidth(1.5);
                particle.vx = -20;
                particle.vy = 400;
                break;

            case 'fog':
                particle.sprite = this.scene.add.circle(
                    particle.x, particle.y,
                    20 + Math.random() * 30,
                    0xdddddd,
                    0.15
                );
                particle.vx = 15 * (Math.random() - 0.5);
                particle.vy = 8 * (Math.random() - 0.5);
                break;

            case 'dust':
                particle.sprite = this.scene.add.circle(
                    particle.x, particle.y,
                    15 + Math.random() * 20,
                    0xccaa88,
                    0.2
                );
                particle.vx = 40 + Math.random() * 20;
                particle.vy = 10 * (Math.random() - 0.5);
                break;

            case 'ash':
                particle.sprite = this.scene.add.circle(
                    particle.x, particle.y,
                    2 + Math.random() * 3,
                    0x666666,
                    0.5
                );
                particle.vx = 5 * (Math.random() - 0.5);
                particle.vy = 30 + Math.random() * 20;
                break;
        }

        if (particle.sprite) {
            particle.sprite.setDepth(PARTICLE_DEPTH);
            this.particles.push(particle);
        }
    }

    updateParticles(deltaSeconds, camera) {
        const worldView = camera.worldView;
        const padding = 100;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            particle.x += particle.vx * deltaSeconds;
            particle.y += particle.vy * deltaSeconds;
            particle.sprite.x = particle.x;
            particle.sprite.y = particle.y;

            // Remove if off-screen
            if (particle.y > worldView.bottom + padding ||
                particle.x < worldView.left - padding ||
                particle.x > worldView.right + padding) {
                particle.sprite.destroy();
                this.particles.splice(i, 1);
            }
        }

        // Spawn new particles to maintain count
        const targetCount = this.currentWeather.particleCount || 0;
        while (this.particles.length < targetCount) {
            this.spawnParticle(this.currentWeather.particleType, camera);
        }
    }

    updateLightning(deltaSeconds, camera) {
        this.lightningTimer -= deltaSeconds;
        if (this.lightningTimer <= 0) {
            this.strikeLightning(camera);
            this.lightningTimer = this.getRandomLightningTime();
        }
    }

    strikeLightning(camera) {
        const worldView = camera.worldView;
        const x = worldView.left + Math.random() * worldView.width;
        const y = worldView.top + Math.random() * worldView.height;

        // Flash effect
        this.lightningGraphics.clear();
        this.lightningGraphics.fillStyle(0xffffff, 0.3);
        this.lightningGraphics.fillRect(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height
        );

        this.scene.tweens.add({
            targets: this.lightningGraphics,
            alpha: 0,
            duration: 150,
            onComplete: () => this.lightningGraphics.clear()
        });

        // Lightning bolt visual
        this.drawLightningBolt(x, y - 300, x, y);

        // Damage enemies in radius (if combat system exists)
        if (this.scene.combat) {
            const strikeRadius = 60;
            const strikeDamage = 25;

            for (const enemy of this.scene.combat.enemies) {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distSq = dx * dx + dy * dy;

                if (distSq <= strikeRadius * strikeRadius) {
                    enemy.hp = Math.max(0, enemy.hp - strikeDamage);
                    if (this.scene.combat.flashEnemy) {
                        this.scene.combat.flashEnemy(enemy);
                    }
                }
            }
        }
    }

    drawLightningBolt(x1, y1, x2, y2) {
        const segments = 8;
        const variance = 30;
        const points = [{ x: x1, y: y1 }];

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * variance;
            const y = y1 + (y2 - y1) * t;
            points.push({ x, y });
        }
        points.push({ x: x2, y: y2 });

        const graphics = this.scene.add.graphics();
        graphics.setDepth(WEATHER_DEPTH - 2);
        graphics.lineStyle(3, 0xccffff, 0.9);

        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.strokePath();

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => graphics.destroy()
        });
    }

    clearParticles() {
        for (const particle of this.particles) {
            particle.sprite.destroy();
        }
        this.particles.length = 0;
    }

    getRandomChangeTime() {
        return WEATHER_CHANGE_INTERVAL.min +
            Math.random() * (WEATHER_CHANGE_INTERVAL.max - WEATHER_CHANGE_INTERVAL.min);
    }

    getRandomLightningTime() {
        return LIGHTNING_INTERVAL.min +
            Math.random() * (LIGHTNING_INTERVAL.max - LIGHTNING_INTERVAL.min);
    }

    /**
     * Get current weather modifiers for gameplay systems.
     * @returns {object} { enemyDetectionRange, pickupSpawnRate }
     */
    getModifiers() {
        return this.currentWeather.modifiers;
    }

    /**
     * Get current weather name (for HUD display).
     * @returns {string}
     */
    getWeatherName() {
        return this.currentWeather.name;
    }

    /**
     * Clear all weather effects.
     */
    clear() {
        this.clearParticles();
        this.overlay.setAlpha(0);
        this.lightningGraphics.clear();
    }

    /**
     * Destroy system (scene end).
     */
    destroy() {
        this.clearParticles();
        this.overlay.destroy();
        this.lightningGraphics.destroy();
    }
}
