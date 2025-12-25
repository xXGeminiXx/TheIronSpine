import {
    COLOR_KEYS,
    COLORS,
    ENGINE_WEAPON,
    ENEMIES,
    PROJECTILES,
    WEAPON_STATS
} from '../config.js';
import { angleTo, distanceSquared, normalizeVector } from '../core/math.js';
import {
    createProjectileSprite,
    updateProjectileVisuals,
    destroyTrailGraphics
} from '../art/projectile-visuals.js';

const ENEMY_DEPTH = 12;
const PROJECTILE_DEPTH = 11;
const ENEMY_PROJECTILE_DEPTH = 10;
const MINE_DEPTH = 9;

let nextEnemyId = 1;
let nextProjectileId = 1;
let nextEnemyProjectileId = 1;
let nextMineId = 1;

export function resetCombatIdCounters() {
    nextEnemyId = 1;
    nextProjectileId = 1;
    nextEnemyProjectileId = 1;
    nextMineId = 1;
}

export class CombatSystem {
    constructor(scene, train, eventHandlers = {}) {
        this.scene = scene;
        this.train = train;
        this.eventHandlers = eventHandlers;
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.mines = [];
        this.bonusMultipliers = {
            damage: 1,
            fireRate: 1,
            range: 1
        };
        this.stats = {
            enemiesDestroyed: 0,
            pulseHits: 0
        };
    }

    update(deltaSeconds) {
        this.updateEnemies(deltaSeconds);
        this.updateMines(deltaSeconds);
        this.updateProjectiles(deltaSeconds);
        this.updateEnemyProjectiles(deltaSeconds);
        this.updateAutoFire(deltaSeconds);
        this.updateEngineAutoFire(deltaSeconds);
    }

    updateEnemies(deltaSeconds) {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];

            this.updateEnemySlow(enemy, deltaSeconds);

            if (enemy.type === 'ranger') {
                this.updateRangerEnemy(enemy, deltaSeconds);
            } else if (enemy.type === 'harpooner') {
                this.updateHarpoonerEnemy(enemy, deltaSeconds);
            } else if (enemy.type === 'minelayer') {
                this.updateMinelayerEnemy(enemy, deltaSeconds);
            } else {
                this.updateMeleeEnemy(enemy, deltaSeconds);
            }

            const collisionSegment = this.findCollisionSegment(enemy);
            if (collisionSegment) {
                this.handleEnemyCollision(enemy, collisionSegment);
                this.destroyEnemyAtIndex(index);
            }
        }
    }

    updateEnemySlow(enemy, deltaSeconds) {
        if (enemy.slowTimer <= 0) {
            return;
        }

        enemy.slowTimer = Math.max(0, enemy.slowTimer - deltaSeconds);
        if (enemy.slowTimer === 0) {
            enemy.slowMultiplier = 1;
        }
    }

    updateMeleeEnemy(enemy, deltaSeconds) {
        const target = this.getTargetForEnemy(enemy);
        if (!target) {
            return;
        }

        const targetAngle = angleTo(enemy.x, enemy.y, target.x, target.y);
        enemy.rotation = targetAngle;

        const speed = enemy.speed * enemy.slowMultiplier;
        enemy.x += Math.cos(targetAngle) * speed * deltaSeconds;
        enemy.y += Math.sin(targetAngle) * speed * deltaSeconds;
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.rotation = enemy.rotation;
    }

    updateRangerEnemy(enemy, deltaSeconds) {
        const engine = this.train.engine;
        if (!engine) {
            return;
        }

        const toEngine = {
            x: engine.x - enemy.x,
            y: engine.y - enemy.y
        };
        const distance = Math.hypot(toEngine.x, toEngine.y);
        const desired = enemy.orbitDistance || ENEMIES.ranger.orbitDistance;
        const radial = distance > 0
            ? { x: toEngine.x / distance, y: toEngine.y / distance }
            : { x: 1, y: 0 };

        // Orbit uses a tangential push plus a gentle radial correction.
        const orbitDirection = enemy.orbitDirection || 1;
        const tangential = { x: -radial.y * orbitDirection, y: radial.x * orbitDirection };
        const radialError = distance - desired;
        const radialStrength = Phaser.Math.Clamp(radialError / desired, -1, 1);

        const move = normalizeVector(
            tangential.x + radial.x * radialStrength,
            tangential.y + radial.y * radialStrength
        );

        const speed = enemy.speed * enemy.slowMultiplier;
        enemy.x += move.x * speed * deltaSeconds;
        enemy.y += move.y * speed * deltaSeconds;
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.rotation = angleTo(enemy.x, enemy.y, engine.x, engine.y);
        enemy.sprite.rotation = enemy.rotation;

        this.tryRangerFire(enemy, engine, deltaSeconds);
    }

    tryRangerFire(enemy, engine, deltaSeconds) {
        const fireCooldown = enemy.fireCooldown || ENEMIES.ranger.fireCooldown;
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaSeconds);
        if (enemy.attackCooldown > 0) {
            return;
        }

        const target = {
            x: engine.x,
            y: engine.y
        };
        this.spawnEnemyProjectile(enemy, target);
        enemy.attackCooldown = fireCooldown;
    }

    updateHarpoonerEnemy(enemy, deltaSeconds) {
        const config = ENEMIES.harpooner;
        if (!config) {
            this.updateMeleeEnemy(enemy, deltaSeconds);
            return;
        }

        this.updateMeleeEnemy(enemy, deltaSeconds);

        if (enemy.harpoonState === 'windup') {
            enemy.harpoonTimer = Math.max(0, enemy.harpoonTimer - deltaSeconds);
            const target = this.train.getCarById(enemy.harpoonTargetId);
            if (!target) {
                this.clearHarpoon(enemy);
                enemy.attackCooldown = config.cooldownSeconds;
                return;
            }
            this.updateHarpoonLine(enemy, target, config.telegraphColor, 2, 0.7);
            if (enemy.harpoonTimer === 0) {
                enemy.harpoonState = 'drag';
                enemy.harpoonTimer = config.dragSeconds;
                const direction = normalizeVector(
                    enemy.x - target.x,
                    enemy.y - target.y
                );
                this.train.applyDragToCar(
                    target,
                    direction,
                    config.dragSeconds,
                    config.dragPullSpeed
                );
                this.updateHarpoonLine(enemy, target, config.tetherColor, 3, 0.9);
            }
            return;
        }

        if (enemy.harpoonState === 'drag') {
            enemy.harpoonTimer = Math.max(0, enemy.harpoonTimer - deltaSeconds);
            const target = this.train.getCarById(enemy.harpoonTargetId);
            if (!target) {
                this.clearHarpoon(enemy);
                enemy.attackCooldown = config.cooldownSeconds;
                return;
            }
            this.updateHarpoonLine(enemy, target, config.tetherColor, 3, 0.9);
            if (enemy.harpoonTimer === 0) {
                this.train.clearDragOnCar(target);
                this.clearHarpoon(enemy);
                enemy.attackCooldown = config.cooldownSeconds;
            }
            return;
        }

        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaSeconds);
        if (enemy.attackCooldown > 0) {
            return;
        }

        const target = this.findHarpoonTarget(enemy, config.attackRange);
        if (!target) {
            return;
        }

        enemy.harpoonState = 'windup';
        enemy.harpoonTimer = config.windupSeconds;
        enemy.harpoonTargetId = target.id;
        this.ensureHarpoonLine(enemy);
        this.updateHarpoonLine(enemy, target, config.telegraphColor, 2, 0.7);
    }

    updateMinelayerEnemy(enemy, deltaSeconds) {
        const config = ENEMIES.minelayer;
        this.updateMeleeEnemy(enemy, deltaSeconds);

        if (!config) {
            return;
        }

        enemy.mineTimer = Math.max(0, enemy.mineTimer - deltaSeconds);
        if (enemy.mineTimer > 0) {
            return;
        }

        this.spawnMine(enemy);
        enemy.mineTimer = config.mineCooldown;
    }

    ensureHarpoonLine(enemy) {
        if (enemy.harpoonLine) {
            return;
        }
        enemy.harpoonLine = this.scene.add.graphics();
        enemy.harpoonLine.setDepth(ENEMY_PROJECTILE_DEPTH);
    }

    updateHarpoonLine(enemy, target, color, width, alpha) {
        if (!enemy.harpoonLine) {
            this.ensureHarpoonLine(enemy);
        }
        enemy.harpoonLine.clear();
        enemy.harpoonLine.lineStyle(width, color, alpha);
        enemy.harpoonLine.lineBetween(enemy.x, enemy.y, target.x, target.y);
    }

    clearHarpoon(enemy) {
        if (enemy.harpoonLine) {
            enemy.harpoonLine.destroy();
        }
        enemy.harpoonLine = null;
        enemy.harpoonState = 'idle';
        enemy.harpoonTargetId = null;
        enemy.harpoonTimer = 0;
    }

    getTargetForEnemy(enemy) {
        if (enemy.type === 'boss' || enemy.type === 'armored') {
            return this.train.engine;
        }
        return this.findNearestSegment(enemy.x, enemy.y);
    }

    findCollisionSegment(enemy) {
        const segments = this.train.getAllSegments();
        for (const segment of segments) {
            const collisionRadius = enemy.radius + segment.radius;
            if (distanceSquared(enemy.x, enemy.y, segment.x, segment.y) <= collisionRadius ** 2) {
                return segment;
            }
        }
        return null;
    }

    updateProjectiles(deltaSeconds) {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            projectile.x += projectile.velocity.x * deltaSeconds;
            projectile.y += projectile.velocity.y * deltaSeconds;
            projectile.travelled += projectile.speed * deltaSeconds;
            projectile.sprite.x = projectile.x;
            projectile.sprite.y = projectile.y;

            // Update visual effects (trails, pulsing, etc.)
            updateProjectileVisuals(projectile, deltaSeconds);

            if (projectile.travelled >= projectile.range) {
                this.removeProjectileAtIndex(index);
                continue;
            }

            const hitIndex = this.findProjectileHitIndex(projectile);
            if (hitIndex !== -1) {
                const enemy = this.enemies[hitIndex];
                this.applyProjectileDamage(projectile, enemy);

                // Handle orange splash damage
                if (projectile.stats && projectile.stats.splashRadius && projectile.stats.splashDamage) {
                    this.applySplashDamage(
                        projectile.x,
                        projectile.y,
                        projectile.stats.splashRadius,
                        projectile.stats.splashDamage,
                        hitIndex // Exclude the direct hit enemy (already damaged)
                    );
                }

                this.removeProjectileAtIndex(index);
                if (enemy.hp <= 0) {
                    this.destroyEnemyAtIndex(hitIndex);
                }
                continue;
            }

            const mineIndex = this.findMineHitIndex(projectile);
            if (mineIndex !== -1) {
                this.destroyMineAtIndex(mineIndex);
                this.removeProjectileAtIndex(index);
            }
        }
    }

    updateEnemyProjectiles(deltaSeconds) {
        for (let index = this.enemyProjectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.enemyProjectiles[index];
            projectile.x += projectile.velocity.x * deltaSeconds;
            projectile.y += projectile.velocity.y * deltaSeconds;
            projectile.travelled += projectile.speed * deltaSeconds;
            projectile.sprite.x = projectile.x;
            projectile.sprite.y = projectile.y;

            if (projectile.travelled >= projectile.range) {
                this.removeEnemyProjectileAtIndex(index);
                continue;
            }

            const hitSegment = this.findEnemyProjectileHitSegment(projectile);
            if (hitSegment) {
                const result = this.train.applyDamageToSegment(hitSegment, projectile.damage);
                if (this.eventHandlers.onTrainHit) {
                    this.eventHandlers.onTrainHit(hitSegment, result, {
                        x: projectile.origin ? projectile.origin.x : projectile.x,
                        y: projectile.origin ? projectile.origin.y : projectile.y,
                        color: projectile.color
                    });
                }
                this.removeEnemyProjectileAtIndex(index);
            }
        }
    }

    updateMines(deltaSeconds) {
        for (let index = this.mines.length - 1; index >= 0; index -= 1) {
            const mine = this.mines[index];
            if (mine.attachedToId) {
                const car = this.train.getCarById(mine.attachedToId);
                if (!car) {
                    this.destroyMineAtIndex(index);
                    continue;
                }

                mine.timer = Math.max(0, mine.timer - deltaSeconds);
                mine.x = car.x + mine.attachOffset.x;
                mine.y = car.y + mine.attachOffset.y;
                mine.sprite.x = mine.x;
                mine.sprite.y = mine.y;
                mine.ring.x = mine.x;
                mine.ring.y = mine.y;

                const progress = mine.timer / mine.duration;
                mine.ring.setScale(0.6 + progress * 0.6);
                mine.ring.setAlpha(0.4 + progress * 0.4);

                if (mine.timer === 0) {
                    this.train.clearTurnPenalty(mine.id);
                    this.destroyMineAtIndex(index);
                }
                continue;
            }

            mine.life = Math.max(0, mine.life - deltaSeconds);
            if (mine.life === 0) {
                this.destroyMineAtIndex(index);
                continue;
            }

            mine.x += mine.velocity.x * deltaSeconds;
            mine.y += mine.velocity.y * deltaSeconds;
            mine.sprite.x = mine.x;
            mine.sprite.y = mine.y;
            mine.ring.x = mine.x;
            mine.ring.y = mine.y;

            const pulse = 0.2 + 0.2 * Math.sin(mine.pulse);
            mine.ring.setAlpha(0.2 + pulse);
            mine.pulse += deltaSeconds * 6;

            const target = this.findMineTarget(mine);
            if (target) {
                mine.attachedToId = target.id;
                mine.duration = mine.clampDuration;
                mine.timer = mine.clampDuration;
                mine.attachOffset = {
                    x: mine.x - target.x,
                    y: mine.y - target.y
                };
                this.train.applyTurnPenalty(
                    mine.id,
                    mine.turnPenaltyMultiplier,
                    mine.clampDuration
                );
            }
        }
    }

    spawnMine(enemy) {
        const config = ENEMIES.minelayer;
        if (!config) {
            return null;
        }

        const dropOffset = config.radius || 16;
        const dropX = enemy.x - Math.cos(enemy.rotation) * dropOffset;
        const dropY = enemy.y - Math.sin(enemy.rotation) * dropOffset;
        const velocity = {
            x: -Math.cos(enemy.rotation) * config.mineSpeed,
            y: -Math.sin(enemy.rotation) * config.mineSpeed
        };

        const sprite = this.scene.add.circle(
            dropX,
            dropY,
            config.mineRadius,
            config.mineColor || config.color
        );
        sprite.setStrokeStyle(2, config.mineTrim || config.trim);
        sprite.setDepth(MINE_DEPTH);

        const ring = this.scene.add.circle(
            dropX,
            dropY,
            config.mineRadius * 1.6,
            config.mineTrim || config.trim,
            0
        );
        ring.setStrokeStyle(2, config.mineTrim || config.trim, 0.3);
        ring.setDepth(MINE_DEPTH);

        nextMineId += 1;
        const id = nextMineId;
        const mine = {
            id,
            x: dropX,
            y: dropY,
            velocity,
            radius: config.mineRadius,
            sprite,
            ring,
            attachedToId: null,
            clampDuration: config.clampDuration,
            turnPenaltyMultiplier: config.turnPenaltyMultiplier,
            duration: config.clampDuration,
            timer: config.clampDuration,
            life: config.mineLifetime,
            pulse: Math.random() * Math.PI * 2,
            attachOffset: { x: 0, y: 0 }
        };

        this.mines.push(mine);
        return mine;
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
            this.spawnProjectile(car, target, weaponStats, 'car', car.tier, car);
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
            engineWeapon,
            'engine',
            engineWeapon.tier,
            engine
        );
    }

    spawnEnemy(type, position, scale = { hp: 1, damage: 1, speed: 1 }) {
        const base = ENEMIES[type];
        if (!base) {
            return null;
        }

        const sprite = this.createEnemySprite(type, position, base);

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
            trim: base.trim,
            slowTimer: 0,
            slowMultiplier: 1,
            attackCooldown: type === 'ranger'
                ? (base.fireCooldown * (0.5 + Math.random()))
                : type === 'harpooner'
                    ? (base.cooldownSeconds * (0.4 + Math.random() * 0.6))
                    : 0,
            fireCooldown: base.fireCooldown || 0,
            orbitDistance: base.orbitDistance || 0,
            orbitDirection: type === 'ranger' ? (enemyId % 2 === 0 ? 1 : -1) : 0,
            sprite
        };

        if (type === 'harpooner') {
            enemy.harpoonState = 'idle';
            enemy.harpoonTimer = 0;
            enemy.harpoonTargetId = null;
            enemy.harpoonLine = null;
        }

        if (type === 'minelayer') {
            enemy.mineTimer = base.mineCooldown * (0.4 + Math.random() * 0.6);
        }

        this.enemies.push(enemy);
        return enemy;
    }

    spawnSkirmisher(position) {
        return this.spawnEnemy('skirmisher', position);
    }

    createEnemySprite(type, position, base) {
        const size = base.size || { width: 24, height: 16 };
        let sprite = null;

        if (type === 'armored') {
            const halfW = size.width * 0.5;
            const halfH = size.height * 0.5;
            sprite = this.scene.add.polygon(
                position.x,
                position.y,
                [
                    0, -halfH,
                    halfW, -halfH * 0.4,
                    halfW, halfH * 0.4,
                    0, halfH,
                    -halfW, halfH * 0.4,
                    -halfW, -halfH * 0.4
                ],
                base.color
            );
        } else if (type === 'ranger') {
            const halfW = size.width * 0.5;
            const halfH = size.height * 0.5;
            sprite = this.scene.add.polygon(
                position.x,
                position.y,
                [
                    0, -halfH,
                    halfW, 0,
                    0, halfH,
                    -halfW, 0
                ],
                base.color
            );
        } else if (type === 'harpooner') {
            const halfW = size.width * 0.5;
            const halfH = size.height * 0.5;
            sprite = this.scene.add.polygon(
                position.x,
                position.y,
                [
                    0, -halfH,
                    halfW, -halfH * 0.25,
                    halfW * 0.7, halfH * 0.4,
                    0, halfH,
                    -halfW * 0.7, halfH * 0.4,
                    -halfW, 0,
                    -halfW * 0.7, -halfH * 0.4
                ],
                base.color
            );
        } else if (type === 'minelayer') {
            const halfW = size.width * 0.5;
            const halfH = size.height * 0.5;
            sprite = this.scene.add.polygon(
                position.x,
                position.y,
                [
                    0, -halfH,
                    halfW, -halfH * 0.3,
                    halfW, halfH * 0.3,
                    0, halfH,
                    -halfW, halfH * 0.3,
                    -halfW, -halfH * 0.3
                ],
                base.color
            );
        } else {
            sprite = this.scene.add.triangle(
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
        }

        const strokeWidth = type === 'boss' ? 4 : 2;
        sprite.setStrokeStyle(strokeWidth, base.trim);
        sprite.setDepth(ENEMY_DEPTH);
        return sprite;
    }

    spawnProjectile(car, target, weaponStats, source = 'car', tier = null, sourceSegment = null) {
        const angle = angleTo(car.x, car.y, target.x, target.y);
        const velocity = normalizeVector(Math.cos(angle), Math.sin(angle));
        const speed = weaponStats.projectileSpeed;
        const radius = PROJECTILES[car.colorKey].radius;

        // Create unique projectile visuals based on color type.
        // Each color has distinct shape, trail, and impact effects.
        const { sprite, trailData } = createProjectileSprite(
            this.scene,
            car.colorKey,
            car.x,
            car.y,
            angle
        );
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
            sprite,
            trailData  // Trail data for visual effects
        };

        this.projectiles.push(projectile);
        this.spawnMuzzleFlash(car, angle);
        if (this.eventHandlers.onWeaponFired) {
            this.eventHandlers.onWeaponFired(
                car.colorKey,
                source,
                tier,
                sourceSegment || car
            );
        }
        return projectile;
    }

    spawnEnemyProjectile(enemy, target) {
        const base = ENEMIES.ranger;
        const angle = angleTo(enemy.x, enemy.y, target.x, target.y);
        const spread = Phaser.Math.DegToRad(base.projectileSpreadDeg || 0);
        const offset = spread > 0 ? (Math.random() * 2 - 1) * spread : 0;
        const finalAngle = angle + offset;
        const velocity = normalizeVector(Math.cos(finalAngle), Math.sin(finalAngle));
        const speed = base.projectileSpeed;
        const size = base.projectileSize || { width: 10, height: 10 };
        const color = base.projectileColor || 0xff5555;

        const sprite = this.scene.add.rectangle(
            enemy.x,
            enemy.y,
            size.width,
            size.height,
            color
        );
        sprite.setDepth(ENEMY_PROJECTILE_DEPTH);
        sprite.rotation = finalAngle + Math.PI / 4;
        sprite.setStrokeStyle(2, 0xffffff, 0.5);

        nextEnemyProjectileId += 1;
        const projectileId = nextEnemyProjectileId;
        const projectile = {
            id: projectileId,
            x: enemy.x,
            y: enemy.y,
            velocity: {
                x: velocity.x * speed,
                y: velocity.y * speed
            },
            speed,
            range: base.projectileRange,
            travelled: 0,
            damage: enemy.damage,
            radius: Math.max(size.width, size.height) * 0.5,
            sprite,
            origin: { x: enemy.x, y: enemy.y },
            color
        };

        this.enemyProjectiles.push(projectile);
        if (this.eventHandlers.onEnemyWeaponFired) {
            this.eventHandlers.onEnemyWeaponFired(enemy);
        }
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

    /**
     * Applies splash damage from orange artillery projectiles.
     * Damages all enemies within radius except the direct hit target.
     * @param {number} x - Explosion center X
     * @param {number} y - Explosion center Y
     * @param {number} radius - Splash damage radius
     * @param {number} damage - Splash damage amount
     * @param {number} excludeIndex - Index of direct hit enemy to exclude
     */
    applySplashDamage(x, y, radius, damage, excludeIndex) {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            if (index === excludeIndex) {
                continue; // Skip the direct hit enemy (already damaged)
            }

            const enemy = this.enemies[index];
            const hitRadius = radius + enemy.radius;
            const distSq = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;

            if (distSq <= hitRadius ** 2) {
                // Apply splash damage (no armor reduction for splash)
                enemy.hp = Math.max(0, enemy.hp - damage);
                this.flashEnemy(enemy);

                if (enemy.hp <= 0) {
                    this.destroyEnemyAtIndex(index);
                }
            }
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
        let hits = 0;
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            enemy.hp = Math.max(0, enemy.hp - damage);
            hits += 1;
            if (enemy.hp <= 0) {
                this.destroyEnemyAtIndex(index);
            }
        }
        if (hits > 0) {
            this.stats.pulseHits += hits;
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

    findMineHitIndex(projectile) {
        for (let index = 0; index < this.mines.length; index += 1) {
            const mine = this.mines[index];
            const maxDistance = mine.radius + projectile.radius;
            if (distanceSquared(projectile.x, projectile.y, mine.x, mine.y)
                <= maxDistance ** 2) {
                return index;
            }
        }
        return -1;
    }

    findEnemyProjectileHitSegment(projectile) {
        const segments = this.train.getAllSegments();
        for (const segment of segments) {
            const maxDistance = segment.radius + projectile.radius;
            if (distanceSquared(projectile.x, projectile.y, segment.x, segment.y)
                <= maxDistance ** 2) {
                return segment;
            }
        }
        return null;
    }

    handleEnemyCollision(enemy, target) {
        const result = this.train.applyDamageToSegment(target, enemy.damage);
        if (this.eventHandlers.onTrainHit) {
            this.eventHandlers.onTrainHit(target, result, {
                x: enemy.x,
                y: enemy.y,
                color: enemy.trim || enemy.baseColor
            });
        }
    }

    destroyEnemyAtIndex(index) {
        const [enemy] = this.enemies.splice(index, 1);
        this.cleanupEnemy(enemy);
        enemy.sprite.destroy();
        this.stats.enemiesDestroyed += 1;

        if (this.eventHandlers.onEnemyDestroyed) {
            this.eventHandlers.onEnemyDestroyed(enemy);
        }
    }

    cleanupEnemy(enemy) {
        if (!enemy) {
            return;
        }

        if (enemy.harpoonLine) {
            enemy.harpoonLine.destroy();
            enemy.harpoonLine = null;
        }

        if (enemy.harpoonTargetId) {
            const target = this.train.getCarById(enemy.harpoonTargetId);
            if (target) {
                this.train.clearDragOnCar(target);
            }
        }
    }

    removeProjectileAtIndex(index) {
        const [projectile] = this.projectiles.splice(index, 1);
        projectile.sprite.destroy();
        // Clean up trail graphics to prevent memory leaks
        destroyTrailGraphics(projectile.trailData);
    }

    removeEnemyProjectileAtIndex(index) {
        const [projectile] = this.enemyProjectiles.splice(index, 1);
        projectile.sprite.destroy();
    }

    destroyMineAtIndex(index) {
        const [mine] = this.mines.splice(index, 1);
        if (mine.attachedToId) {
            this.train.clearTurnPenalty(mine.id);
        }
        mine.sprite.destroy();
        mine.ring.destroy();
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

    findNearestCar(x, y, range = null) {
        const cars = this.train.getWeaponCars();
        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        const maxRangeSq = range ? range * range : null;

        for (const car of cars) {
            const distance = distanceSquared(x, y, car.x, car.y);
            if (maxRangeSq !== null && distance > maxRangeSq) {
                continue;
            }
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = car;
            }
        }

        return nearest;
    }

    findHarpoonTarget(enemy, range) {
        const cars = this.train.getWeaponCars();
        if (cars.length === 0) {
            return null;
        }

        const midIndex = Math.floor(cars.length / 2);
        const midCar = cars[midIndex];
        const maxRangeSq = range ? range * range : null;
        if (midCar && maxRangeSq !== null) {
            const distance = distanceSquared(enemy.x, enemy.y, midCar.x, midCar.y);
            if (distance <= maxRangeSq) {
                return midCar;
            }
        }

        return this.findNearestCar(enemy.x, enemy.y, range);
    }

    findMineTarget(mine) {
        const cars = this.train.getWeaponCars();
        for (const car of cars) {
            const maxDistance = mine.radius + car.radius;
            if (distanceSquared(mine.x, mine.y, car.x, car.y) <= maxDistance ** 2) {
                return car;
            }
        }
        return null;
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

        return this.applyWeaponBonuses({
            colorKey: dominant,
            tier,
            count,
            ...stats
        });
    }

    getWeaponStatsForTier(colorKey, tier) {
        const tiers = WEAPON_STATS[colorKey];
        if (tier <= tiers.length) {
            return this.applyWeaponBonuses(tiers[tier - 1]);
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

        return this.applyWeaponBonuses(next);
    }

    getEngineWeaponState() {
        return this.getEngineWeaponProfile();
    }

    setBonusMultipliers(multipliers) {
        if (!multipliers) {
            return;
        }
        this.bonusMultipliers = {
            damage: multipliers.damage || 1,
            fireRate: multipliers.fireRate || 1,
            range: multipliers.range || 1
        };
    }

    applyWeaponBonuses(stats) {
        const adjusted = { ...stats };
        if (typeof adjusted.damage === 'number') {
            adjusted.damage *= this.bonusMultipliers.damage;
        }
        if (typeof adjusted.fireRate === 'number') {
            adjusted.fireRate *= this.bonusMultipliers.fireRate;
        }
        if (typeof adjusted.range === 'number') {
            adjusted.range *= this.bonusMultipliers.range;
        }
        return adjusted;
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
            destroyTrailGraphics(projectile.trailData);
        }
        this.projectiles.length = 0;

        for (const projectile of this.enemyProjectiles) {
            projectile.sprite.destroy();
        }
        this.enemyProjectiles.length = 0;
    }
}
