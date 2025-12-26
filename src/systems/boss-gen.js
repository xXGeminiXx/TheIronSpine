/**
 * boss-gen.js - Procedural Boss Factory
 *
 * Generates unique bosses from modular parts and behavior grammars.
 * Each boss is procedurally assembled with distinct visuals and tactics.
 *
 * BOSS ANATOMY:
 *   - Core body (hexagon, octagon, irregular polygon)
 *   - 1-3 weapon mounts with distinct behaviors
 *   - 0-2 weak points (extra damage when hit)
 *   - Armor plates and visual decorations
 *
 * BEHAVIOR PHASES:
 *   - CHARGE: Rush toward player
 *   - SWEEP: Circle and fire
 *   - BURST: Rapid multi-shot
 *   - SUMMON: Spawn minions
 *   - SHIELD: Temporary invulnerability
 *
 * STATE MACHINE:
 *   TELEGRAPH -> EXECUTE -> RECOVER -> (next phase)
 *
 * INTEGRATION:
 *   1. Call generateBoss(scene, difficulty) to create a boss config
 *   2. Use spawnBoss(scene, config, position) to instantiate
 *   3. Update boss with updateBoss(boss, train, deltaSeconds)
 */

const BOSS_DEPTH = 14; // Just above regular enemies

// Boss body shapes (procedurally generated)
const BODY_TYPES = [
    {
        name: 'hexagon',
        sides: 6,
        sizeRange: { min: 50, max: 70 },
        armorPlates: 3
    },
    {
        name: 'octagon',
        sides: 8,
        sizeRange: { min: 55, max: 75 },
        armorPlates: 4
    },
    {
        name: 'star',
        sides: 10,
        sizeRange: { min: 60, max: 80 },
        armorPlates: 5,
        irregular: true
    },
    {
        name: 'fortress',
        sides: 12,
        sizeRange: { min: 65, max: 85 },
        armorPlates: 6
    }
];

// Weapon mount types
const WEAPON_MOUNTS = [
    {
        type: 'cannon',
        fireRate: 0.8,
        damage: 30,
        range: 350,
        projectileSpeed: 600,
        projectileColor: 0xff6666
    },
    {
        type: 'rapid',
        fireRate: 3.0,
        damage: 8,
        range: 300,
        projectileSpeed: 500,
        projectileColor: 0xffaa66
    },
    {
        type: 'beam',
        fireRate: 0.3,
        damage: 50,
        range: 400,
        projectileSpeed: 1000,
        projectileColor: 0x66ffff
    }
];

// Behavior patterns (states)
const BEHAVIORS = [
    {
        name: 'CHARGE',
        duration: 3.0,
        telegraph: 1.0,
        speed: 140,
        description: 'Rush toward engine'
    },
    {
        name: 'SWEEP',
        duration: 4.0,
        telegraph: 0.6,
        speed: 80,
        description: 'Circle and fire'
    },
    {
        name: 'BURST',
        duration: 2.0,
        telegraph: 0.8,
        speed: 20,
        description: 'Stationary rapid-fire'
    },
    {
        name: 'SUMMON',
        duration: 5.0,
        telegraph: 1.5,
        speed: 0,
        description: 'Spawn minions'
    }
];

/**
 * Generate a procedural boss configuration.
 * @param {number} difficulty - Boss difficulty tier (1-5)
 * @returns {object} Boss configuration
 */
export function generateBoss(difficulty = 1) {
    const bodyType = BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)];
    const size = bodyType.sizeRange.min +
        Math.random() * (bodyType.sizeRange.max - bodyType.sizeRange.min);

    // Scale stats with difficulty
    const hpScale = 1 + difficulty * 0.5;
    const damageScale = 1 + difficulty * 0.3;

    // Select weapon mounts (1-3 based on difficulty)
    const mountCount = Math.min(1 + Math.floor(difficulty / 2), 3);
    const mounts = [];
    for (let i = 0; i < mountCount; i++) {
        mounts.push(WEAPON_MOUNTS[Math.floor(Math.random() * WEAPON_MOUNTS.length)]);
    }

    // Select behavior pattern (3-4 phases)
    const phaseCount = 3 + Math.floor(Math.random() * 2);
    const phases = [];
    for (let i = 0; i < phaseCount; i++) {
        phases.push(BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)]);
    }

    // Weak points (0-2)
    const weakPointCount = Math.floor(Math.random() * 3);
    const weakPoints = [];
    for (let i = 0; i < weakPointCount; i++) {
        const angle = (i / weakPointCount) * Math.PI * 2;
        weakPoints.push({
            angle,
            radius: size * 0.7,
            size: 12,
            damageMultiplier: 2.0
        });
    }

    return {
        bodyType,
        size,
        baseHp: Math.round(300 * hpScale),
        baseDamage: Math.round(25 * damageScale),
        baseSpeed: 60,
        weaponMounts: mounts,
        phases,
        weakPoints,
        armorColor: 0x888888,
        coreColor: 0xff8844,
        trimColor: 0xffcc00,
        difficulty
    };
}

/**
 * Spawn a boss from a configuration.
 * @param {object} scene - Phaser scene
 * @param {object} config - Boss config from generateBoss()
 * @param {object} position - Spawn position {x, y}
 * @returns {object} Boss entity
 */
export function spawnBoss(scene, config, position) {
    // Create visual container
    const container = scene.add.container(position.x, position.y);
    container.setDepth(BOSS_DEPTH);

    // Draw body
    const body = createBossBody(scene, config);
    container.add(body);

    // Draw weak points
    const weakPointSprites = [];
    for (const wp of config.weakPoints) {
        const wpSprite = scene.add.circle(
            Math.cos(wp.angle) * wp.radius,
            Math.sin(wp.angle) * wp.radius,
            wp.size,
            0xff4444,
            0.8
        );
        wpSprite.setStrokeStyle(2, 0xffff00);
        weakPointSprites.push(wpSprite);
        container.add(wpSprite);
    }

    // Draw weapon mounts
    const mountSprites = [];
    const mountCount = config.weaponMounts.length;
    for (let i = 0; i < mountCount; i++) {
        const angle = (i / mountCount) * Math.PI * 2;
        const distance = config.size * 0.8;
        const mountSprite = scene.add.circle(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            8,
            0x666666
        );
        mountSprite.setStrokeStyle(2, 0xaaaaaa);
        mountSprites.push(mountSprite);
        container.add(mountSprite);
    }

    // Create boss entity
    const boss = {
        x: position.x,
        y: position.y,
        rotation: 0,
        hp: config.baseHp,
        maxHp: config.baseHp,
        damage: config.baseDamage,
        speed: config.baseSpeed,
        radius: config.size,
        config,
        container,
        body,
        weakPointSprites,
        mountSprites,

        // AI state
        currentPhase: 0,
        phaseTimer: 0,
        phaseState: 'TELEGRAPH', // TELEGRAPH, EXECUTE, RECOVER
        stateTimer: 0,
        attackCooldown: 0,

        // Behavior data
        orbitAngle: Math.random() * Math.PI * 2,
        summonCooldown: 0
    };

    return boss;
}

/**
 * Update boss AI and behavior.
 * @param {object} boss - Boss entity
 * @param {object} train - Player train (target)
 * @param {number} deltaSeconds - Time delta
 */
export function updateBoss(boss, train, deltaSeconds) {
    if (!boss || !train || !train.engine) {
        return;
    }

    const phase = boss.config.phases[boss.currentPhase];
    const engine = train.engine;

    // Phase state machine
    switch (boss.phaseState) {
        case 'TELEGRAPH':
            updateTelegraphState(boss, phase, deltaSeconds);
            break;
        case 'EXECUTE':
            updateExecuteState(boss, phase, engine, deltaSeconds);
            break;
        case 'RECOVER':
            updateRecoverState(boss, deltaSeconds);
            break;
    }

    // Update visuals
    boss.container.setPosition(boss.x, boss.y);
    boss.container.setRotation(boss.rotation);

    // Pulse weak points
    const pulse = 1 + 0.2 * Math.sin(Date.now() * 0.003);
    for (const wpSprite of boss.weakPointSprites) {
        wpSprite.setScale(pulse);
    }
}

function updateTelegraphState(boss, phase, deltaSeconds) {
    boss.stateTimer += deltaSeconds;

    // Visual telegraph (pulse effect using container alpha)
    const pulseAlpha = Math.sin(boss.stateTimer * 4) * 0.2 + 0.8;
    boss.container.setAlpha(pulseAlpha);

    if (boss.stateTimer >= phase.telegraph) {
        boss.phaseState = 'EXECUTE';
        boss.stateTimer = 0;
        boss.container.setAlpha(1.0); // Reset to full opacity
    }
}

function updateExecuteState(boss, phase, engine, deltaSeconds) {
    boss.stateTimer += deltaSeconds;

    // Execute behavior
    switch (phase.name) {
        case 'CHARGE':
            executeCharge(boss, engine, phase, deltaSeconds);
            break;
        case 'SWEEP':
            executeSweep(boss, engine, phase, deltaSeconds);
            break;
        case 'BURST':
            executeBurst(boss, engine, deltaSeconds);
            break;
        case 'SUMMON':
            executeSummon(boss, deltaSeconds);
            break;
    }

    if (boss.stateTimer >= phase.duration) {
        boss.phaseState = 'RECOVER';
        boss.stateTimer = 0;
    }
}

function updateRecoverState(boss, deltaSeconds) {
    boss.stateTimer += deltaSeconds;

    if (boss.stateTimer >= 1.0) {
        // Move to next phase
        boss.currentPhase = (boss.currentPhase + 1) % boss.config.phases.length;
        boss.phaseState = 'TELEGRAPH';
        boss.stateTimer = 0;
    }
}

function executeCharge(boss, engine, phase, deltaSeconds) {
    const angle = Math.atan2(engine.y - boss.y, engine.x - boss.x);
    boss.rotation = angle;

    const speed = phase.speed;
    boss.x += Math.cos(angle) * speed * deltaSeconds;
    boss.y += Math.sin(angle) * speed * deltaSeconds;
}

function executeSweep(boss, engine, phase, deltaSeconds) {
    // Circle around engine
    const distance = 250;
    boss.orbitAngle += deltaSeconds * 0.8;

    const targetX = engine.x + Math.cos(boss.orbitAngle) * distance;
    const targetY = engine.y + Math.sin(boss.orbitAngle) * distance;

    boss.x += (targetX - boss.x) * 0.1;
    boss.y += (targetY - boss.y) * 0.1;

    boss.rotation = Math.atan2(engine.y - boss.y, engine.x - boss.x);
}

function executeBurst(boss, engine, deltaSeconds) {
    // Stationary, face engine
    boss.rotation = Math.atan2(engine.y - boss.y, engine.x - boss.x);
}

function executeSummon(boss, deltaSeconds) {
    // Stationary during summon
    boss.summonCooldown -= deltaSeconds;

    // Note: Actual minion spawning would be handled by spawner system
}

function createBossBody(scene, config) {
    const graphics = scene.add.graphics();

    // Draw main body polygon
    const points = [];
    const sides = config.bodyType.sides;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const radius = config.size * (config.bodyType.irregular
            ? (0.9 + Math.random() * 0.2)
            : 1.0);
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }

    // Fill body
    graphics.fillStyle(config.armorColor, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();

    // Draw armor plates
    graphics.lineStyle(4, config.trimColor, 0.8);
    for (let i = 0; i < config.bodyType.armorPlates; i++) {
        const angle = (i / config.bodyType.armorPlates) * Math.PI * 2;
        const inner = config.size * 0.5;
        const outer = config.size * 0.95;
        graphics.lineBetween(
            Math.cos(angle) * inner,
            Math.sin(angle) * inner,
            Math.cos(angle) * outer,
            Math.sin(angle) * outer
        );
    }

    // Draw core
    graphics.fillStyle(config.coreColor, 1);
    graphics.fillCircle(0, 0, config.size * 0.3);

    graphics.lineStyle(3, config.trimColor, 1);
    graphics.strokeCircle(0, 0, config.size * 0.3);

    return graphics;
}

/**
 * Check if projectile hit boss weak point.
 * @param {object} boss - Boss entity
 * @param {object} projectile - Projectile {x, y, radius}
 * @returns {boolean} True if hit weak point
 */
export function checkWeakPointHit(boss, projectile) {
    for (const wp of boss.config.weakPoints) {
        const wpX = boss.x + Math.cos(wp.angle) * wp.radius;
        const wpY = boss.y + Math.sin(wp.angle) * wp.radius;

        const dx = projectile.x - wpX;
        const dy = projectile.y - wpY;
        const distSq = dx * dx + dy * dy;
        const hitRadius = wp.size + projectile.radius;

        if (distSq <= hitRadius * hitRadius) {
            return true;
        }
    }

    return false;
}

/**
 * Get damage multiplier for boss hit.
 * @param {object} boss - Boss entity
 * @param {object} projectile - Projectile {x, y}
 * @returns {number} Damage multiplier (1.0 or 2.0 for weak point)
 */
export function getBossDamageMultiplier(boss, projectile) {
    return checkWeakPointHit(boss, projectile) ? 2.0 : 1.0;
}
