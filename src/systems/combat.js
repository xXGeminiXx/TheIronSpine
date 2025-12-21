import {
    COLOR_KEYS,
    COLORS,
    ENGINE_WEAPON,
    ENEMIES,
    PROJECTILES,
    WEAPON_STATS
} from '../config.js';
import { angleTo, distanceSquared, normalizeVector } from '../core/math.js';

const ENEMY_DEPTH = 12;
const PROJECTILE_DEPTH = 11;

let nextEnemyId = 1;
let nextProjectileId = 1;

export function resetCombatIdCounters() {
    nextEnemyId = 1;
    nextProjectileId = 1;
}

export class CombatSystem {
    constructor(scene, train, eventHandlers = {}) {
        this.scene = scene;
        this.train = train;
        this.eventHandlers = eventHandlers;
        this.enemies = [];
        this.projectiles = [];
        this.stats = {
            enemiesDestroyed: 0
        };
    }

    update(deltaSeconds) {
        this.updateEnemies(deltaSeconds);
        this.updateProjectiles(deltaSeconds);
        this.updateAutoFire(deltaSeconds);
        this.updateEngineAutoFire(deltaSeconds);
    }

    updateEnemies(deltaSeconds) {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];

            if (enemy.slowTimer > 0) {
                enemy.slowTimer = Math.max(0, enemy.slowTimer - deltaSeconds);
                if (enemy.slowTimer === 0) {
                    enemy.slowMultiplier = 1;
                }
            }

            const target = this.findNearestSegment(enemy.x, enemy.y);
            if (!target) {
                continue;
            }

            const targetAngle = angleTo(enemy.x, enemy.y, target.x, target.y);
            enemy.rotation = targetAngle;

            const speed = enemy.speed * enemy.slowMultiplier;
            enemy.x += Math.cos(targetAngle) * speed * deltaSeconds;
            enemy.y += Math.sin(targetAngle) * speed * deltaSeconds;
            enemy.sprite.x = enemy.x;
            enemy.sprite.y = enemy.y;
            enemy.sprite.rotation = enemy.rotation;

            const collisionRadius = enemy.radius + target.radius;
            if (distanceSquared(enemy.x, enemy.y, target.x, target.y) <= collisionRadius ** 2) {
                this.handleEnemyCollision(enemy, target);
                this.destroyEnemyAtIndex(index);
            }
        }
    }

    updateProjectiles(deltaSeconds) {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            projectile.x += projectile.velocity.x * deltaSeconds;
            projectile.y += projectile.velocity.y * deltaSeconds;
            projectile.travelled += projectile.speed * deltaSeconds;
            projectile.sprite.x = projectile.x;
            projectile.sprite.y = projectile.y;

            if (projectile.travelled >= projectile.range) {
                this.removeProjectileAtIndex(index);
                continue;
            }

            const hitIndex = this.findProjectileHitIndex(projectile);
            if (hitIndex !== -1) {
                const enemy = this.enemies[hitIndex];
                this.applyProjectileDamage(projectile, enemy);
                this.removeProjectileAtIndex(index);
                if (enemy.hp <= 0) {
                    this.destroyEnemyAtIndex(hitIndex);
                }
            }
        }
    }

    updateAutoFire(deltaSeconds) {
        for (const car of this.train.getWeaponCars()) {
            if (car.weaponCooldown > 0) {
                car.weaponCooldown = Math.max(0, car.weaponCooldown - deltaSeconds);
            }

            const weaponStats = this.getWeaponStatsForTier(car.colorKey, car.tier);
            const target = this.findClosestEnemyWithinRange(car, weaponStats.range);
            if (!target) {
                continue;
            }

            if (car.weaponCooldown > 0) {
                continue;
            }

            const fireInterval = 1 / weaponStats.fireRate;
            car.weaponCooldown = fireInterval;
            this.spawnProjectile(car, target, weaponStats);
        }
    }

    updateEngineAutoFire(deltaSeconds) {
        const engine = this.train.engine;
        if (engine.weaponCooldown > 0) {
            engine.weaponCooldown = Math.max(0, engine.weaponCooldown - deltaSeconds);
        }

        const engineWeapon = this.getEngineWeaponProfile();
        if (!engineWeapon) {
            return;
        }

        if (engine.weaponCooldown > 0) {
            return;
        }

        const forward = {
            x: Math.cos(engine.rotation),
            y: Math.sin(engine.rotation)
        };
        const target = this.findClosestEnemyInFront(
            engine,
            forward,
            engineWeapon.range
        );
        if (!target) {
            return;
        }

        const fireInterval = 1 / engineWeapon.fireRate;
        engine.weaponCooldown = fireInterval;
        this.spawnProjectile(
            { x: engine.x, y: engine.y, colorKey: engineWeapon.colorKey },
            target,
            engineWeapon
        );
    }

    spawnEnemy(type, position, scale = { hp: 1, damage: 1, speed: 1 }) {
        const base = ENEMIES[type];
        if (!base) {
            return null;
        }

        const size = base.size || { width: 24, height: 16 };
        const sprite = this.scene.add.triangle(
            position.x,
            position.y,
            0,
            -size.height,
            size.width,
            0,
            0,
            size.height,
            base.color
        );
        const strokeWidth = type === 'boss' ? 4 : 2;
        sprite.setStrokeStyle(strokeWidth, base.trim);
        sprite.setDepth(ENEMY_DEPTH);

        nextEnemyId += 1;
        const enemyId = nextEnemyId;
        const hp = Math.round(base.hp * scale.hp);
        const enemy = {
            id: enemyId,
            type,
            x: position.x,
            y: position.y,
            rotation: 0,
            hp,
            maxHp: hp,
            speed: base.speed * scale.speed,
            damage: Math.round(base.damage * scale.damage),
            radius: base.radius,
            armor: base.armor,
            baseColor: base.color,
            slowTimer: 0,
            slowMultiplier: 1,
            sprite
        };

        this.enemies.push(enemy);
        return enemy;
    }

    spawnSkirmisher(position) {
        return this.spawnEnemy('skirmisher', position);
    }

    spawnProjectile(car, target, weaponStats) {
        const angle = angleTo(car.x, car.y, target.x, target.y);
        const velocity = normalizeVector(Math.cos(angle), Math.sin(angle));
        const speed = weaponStats.projectileSpeed;
        const color = COLORS[car.colorKey].phaser;
        const radius = PROJECTILES[car.colorKey].radius;

        const sprite = this.scene.add.circle(car.x, car.y, radius, color);
        sprite.setDepth(PROJECTILE_DEPTH);

        nextProjectileId += 1;
        const projectileId = nextProjectileId;
        const projectile = {
            id: projectileId,
            colorKey: car.colorKey,
            x: car.x,
            y: car.y,
            velocity: {
                x: velocity.x * speed,
                y: velocity.y * speed
            },
            speed,
            range: weaponStats.range,
            travelled: 0,
            damage: weaponStats.damage,
            slowPercent: weaponStats.slowPercent || 0,
            slowDuration: weaponStats.slowDuration || 0,
            armorPierce: weaponStats.armorPierce || 0,
            radius,
            sprite
        };

        this.projectiles.push(projectile);
        this.spawnMuzzleFlash(car, angle);
        return projectile;
    }

    applyProjectileDamage(projectile, enemy) {
        const effectiveArmor = enemy.armor * (1 - projectile.armorPierce);
        const damage = Math.max(0, projectile.damage - effectiveArmor);
        enemy.hp = Math.max(0, enemy.hp - damage);
        this.flashEnemy(enemy);

        if (projectile.slowPercent > 0) {
            enemy.slowMultiplier = 1 - projectile.slowPercent;
            enemy.slowTimer = Math.max(enemy.slowTimer, projectile.slowDuration);
        }
    }

    applyExplosionDamage(position, radius, damage) {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            const hitRadius = radius + enemy.radius;
            if (distanceSquared(position.x, position.y, enemy.x, enemy.y) <= hitRadius ** 2) {
                enemy.hp = Math.max(0, enemy.hp - damage);
                if (enemy.hp <= 0) {
                    this.destroyEnemyAtIndex(index);
                }
            }
        }
    }

    applyPulseDamage(damage) {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            enemy.hp = Math.max(0, enemy.hp - damage);
            if (enemy.hp <= 0) {
                this.destroyEnemyAtIndex(index);
            }
        }
    }

    findProjectileHitIndex(projectile) {
        for (let index = 0; index < this.enemies.length; index += 1) {
            const enemy = this.enemies[index];
            const maxDistance = enemy.radius + projectile.radius;
            if (distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y)
                <= maxDistance ** 2) {
                return index;
            }
        }
        return -1;
    }

    handleEnemyCollision(enemy, target) {
        const result = this.train.applyDamageToSegment(target, enemy.damage);
        if (this.eventHandlers.onTrainHit) {
            this.eventHandlers.onTrainHit(target, result);
        }
    }

    destroyEnemyAtIndex(index) {
        const [enemy] = this.enemies.splice(index, 1);
        enemy.sprite.destroy();
        this.stats.enemiesDestroyed += 1;

        if (this.eventHandlers.onEnemyDestroyed) {
            this.eventHandlers.onEnemyDestroyed(enemy);
        }
    }

    removeProjectileAtIndex(index) {
        const [projectile] = this.projectiles.splice(index, 1);
        projectile.sprite.destroy();
    }

    findNearestSegment(x, y) {
        const segments = this.train.getAllSegments();
        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const segment of segments) {
            const distance = distanceSquared(x, y, segment.x, segment.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = segment;
            }
        }

        return nearest;
    }

    findClosestEnemyWithinRange(car, range) {
        let closest = null;
        let closestDistance = range * range;
        for (const enemy of this.enemies) {
            const distance = distanceSquared(car.x, car.y, enemy.x, enemy.y);
            if (distance <= closestDistance) {
                closestDistance = distance;
                closest = enemy;
            }
        }

        return closest;
    }

    findClosestEnemyInFront(origin, forward, range) {
        let closest = null;
        let closestDistance = range * range;

        for (const enemy of this.enemies) {
            const dx = enemy.x - origin.x;
            const dy = enemy.y - origin.y;
            const distance = dx * dx + dy * dy;
            if (distance > closestDistance) {
                continue;
            }

            const length = Math.hypot(dx, dy);
            if (length === 0) {
                continue;
            }
            const dot = (dx / length) * forward.x + (dy / length) * forward.y;
            if (dot < ENGINE_WEAPON.forwardDot) {
                continue;
            }

            closestDistance = distance;
            closest = enemy;
        }

        return closest;
    }

    getEngineWeaponProfile() {
        const cars = this.train.getWeaponCars();
        if (cars.length === 0) {
            return null;
        }

        const counts = { red: 0, blue: 0, yellow: 0 };
        cars.forEach((car) => {
            counts[car.colorKey] += 1;
        });

        const maxCount = Math.max(counts.red, counts.blue, counts.yellow);
        const tied = COLOR_KEYS.filter((key) => counts[key] === maxCount);
        let dominant = tied[0];
        if (tied.length > 1) {
            for (const car of cars) {
                if (tied.includes(car.colorKey)) {
                    dominant = car.colorKey;
                    break;
                }
            }
        }

        const count = counts[dominant];
        const tier = count >= ENGINE_WEAPON.tier3Count
            ? 3
            : count >= ENGINE_WEAPON.tier2Count
                ? 2
                : 1;
        const stats = ENGINE_WEAPON.stats[dominant][tier - 1];

        return {
            colorKey: dominant,
            tier,
            count,
            ...stats
        };
    }

    getWeaponStatsForTier(colorKey, tier) {
        const tiers = WEAPON_STATS[colorKey];
        if (tier <= tiers.length) {
            return tiers[tier - 1];
        }

        const last = tiers[tiers.length - 1];
        const previous = tiers.length > 1 ? tiers[tiers.length - 2] : last;
        const step = tier - tiers.length;
        const next = {};
        for (const key of Object.keys(last)) {
            const lastValue = last[key];
            const previousValue = previous[key];
            if (typeof lastValue === 'number' && typeof previousValue === 'number') {
                const delta = lastValue - previousValue;
                let value = lastValue + delta * step;
                if (key === 'slowPercent' || key === 'armorPierce') {
                    value = Math.min(0.9, Math.max(0, value));
                }
                next[key] = value;
            } else {
                next[key] = lastValue;
            }
        }

        return next;
    }

    getEngineWeaponState() {
        return this.getEngineWeaponProfile();
    }

    spawnMuzzleFlash(car, angle) {
        const color = COLORS[car.colorKey] ? COLORS[car.colorKey].phaser : 0xffffff;
        const baseRadius = PROJECTILES[car.colorKey]
            ? PROJECTILES[car.colorKey].radius
            : 4;
        const flashRadius = Math.max(3, baseRadius * 0.9);
        const offset = 10;
        const depth = car.container && typeof car.container.depth === 'number'
            ? car.container.depth + 1
            : this.train && this.train.engine && this.train.engine.container
                ? this.train.engine.container.depth + 1
                : PROJECTILE_DEPTH + 8;
        const flash = this.scene.add.circle(
            car.x + Math.cos(angle) * offset,
            car.y + Math.sin(angle) * offset,
            flashRadius,
            color,
            0.85
        );
        flash.setDepth(depth);

        this.scene.tweens.add({
            targets: flash,
            scale: 1.8,
            alpha: 0,
            duration: 80,
            onComplete: () => flash.destroy()
        });
    }

    flashEnemy(enemy) {
        if (!enemy || !enemy.sprite) {
            return;
        }
        const original = enemy.baseColor || ENEMIES[enemy.type].color;
        enemy.sprite.setFillStyle(0xffffff, 1);
        this.scene.time.delayedCall(60, () => {
            if (enemy.sprite && enemy.sprite.active) {
                enemy.sprite.setFillStyle(original, 1);
            }
        });
    }

    clear() {
        // Destroy sprites without incrementing stats
        for (const enemy of this.enemies) {
            enemy.sprite.destroy();
        }
        this.enemies.length = 0;

        for (const projectile of this.projectiles) {
            projectile.sprite.destroy();
        }
        this.projectiles.length = 0;
    }
}
