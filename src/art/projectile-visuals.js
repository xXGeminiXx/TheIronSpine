/**
 * projectile-visuals.js - Unique Projectile Shapes and Trails Per Color
 *
 * Makes each weapon type visually distinct beyond just color.
 * This is critical for game feel - players should instantly recognize
 * what's shooting just by the projectile shape.
 *
 * VISUAL LANGUAGE:
 *   Red (Machinegun):  Thin dart/tracer - rapid, light, aggressive
 *   Blue (Cryo):       Pulsing orb - slow, cold, controlling
 *   Yellow (Cannon):   Heavy bolt - powerful, armor-piercing, impactful
 *   Purple (Sniper):   Sleek needle - long-range, precise, penetrating
 *   Orange (Artillery): Large mortar shell - explosive, area damage, heavy arc
 *
 * TRAIL SYSTEM:
 *   Each projectile can have an optional trail effect that:
 *   - Stores recent positions (history array)
 *   - Draws fading segments behind the projectile
 *   - Updates each frame in updateProjectileVisuals()
 *
 * INTEGRATION:
 *   1. Combat.js calls createProjectileSprite() instead of add.circle()
 *   2. Combat.js calls updateProjectileVisuals() in projectile update loop
 *   3. On hit, combat.js can call spawnImpactEffect() for color-specific VFX
 *
 * PERFORMANCE:
 *   - Trail history is capped at MAX_TRAIL_POINTS
 *   - Trail graphics are reused, not recreated each frame
 *   - Sprites use simple primitives, not complex paths
 */

import { COLORS, PROJECTILES } from '../config.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TRAIL_CONFIG = Object.freeze({
    // Maximum number of trail points to store per projectile
    maxPoints: 8,

    // How often to sample position (in world units traveled)
    sampleDistance: 6,

    // Trail fade settings (alpha multiplier per point, oldest first)
    fadeStart: 0.6,
    fadeEnd: 0.05,

    // Trail visual settings per color
    red: {
        width: 2,
        enabled: true
    },
    blue: {
        width: 3,
        enabled: true,
        pulse: true,       // Blue projectiles pulse in size
        pulseSpeed: 8,     // Pulses per second
        pulseAmount: 0.3   // Scale variation
    },
    yellow: {
        width: 4,
        enabled: true,
        sparks: true       // Yellow leaves spark particles
    },
    purple: {
        width: 2.5,
        enabled: true,
        shimmer: true      // Purple projectiles shimmer with energy
    },
    orange: {
        width: 5,
        enabled: true,
        smoke: true        // Orange projectiles leave smoke trail
    }
});

// ============================================================================
// PROJECTILE SPRITE CREATORS
// ============================================================================
// Each function creates the visual representation for a projectile type.
// Returns an object with { sprite, trailData } for trail management.
// ============================================================================

/**
 * Creates a red machinegun projectile - thin tracer dart.
 *
 * Visual: Elongated triangle pointing in direction of travel.
 * Trail: Thin red streak behind.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData }
 */
export function createRedProjectile(scene, x, y, angle) {
    const color = COLORS.red.phaser;
    const baseRadius = PROJECTILES.red.radius;

    // Create container for projectile + potential trail graphics
    const container = scene.add.container(x, y);

    // Main dart shape - elongated triangle
    const dartLength = baseRadius * 3;
    const dartWidth = baseRadius * 1.2;
    const dart = scene.add.triangle(
        0, 0,
        dartLength, 0,           // Tip (front)
        -dartLength * 0.3, -dartWidth,  // Back left
        -dartLength * 0.3, dartWidth    // Back right
        , color
    );
    dart.setOrigin(0.5, 0.5);

    // Bright core for tracer effect
    const core = scene.add.circle(0, 0, baseRadius * 0.4, 0xffffff, 0.9);

    container.add([dart, core]);
    container.setRotation(angle);

    // Trail data for tracking position history
    const trailData = {
        enabled: TRAIL_CONFIG.red.enabled,
        history: [],
        distanceSinceLastSample: 0,
        graphics: scene.add.graphics(),
        config: TRAIL_CONFIG.red
    };
    trailData.graphics.setDepth(container.depth - 1);

    return { sprite: container, trailData };
}

/**
 * Creates a blue cryo projectile - pulsing frost orb.
 *
 * Visual: Glowing circle with frost ring.
 * Trail: Cold mist particles.
 * Special: Pulses in size to feel "alive".
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData }
 */
export function createBlueProjectile(scene, x, y, angle) {
    const color = COLORS.blue.phaser;
    const baseRadius = PROJECTILES.blue.radius;

    const container = scene.add.container(x, y);

    // Outer frost ring
    const ring = scene.add.circle(0, 0, baseRadius * 1.3, 0x000000, 0);
    ring.setStrokeStyle(2, 0x88ccff, 0.7);

    // Main orb
    const orb = scene.add.circle(0, 0, baseRadius, color, 0.9);

    // Inner bright core
    const core = scene.add.circle(0, 0, baseRadius * 0.5, 0xccffff, 0.95);

    // Frost spike accents (4 small triangles)
    const spikes = [];
    for (let i = 0; i < 4; i++) {
        const spikeAngle = (i / 4) * Math.PI * 2;
        const spikeX = Math.cos(spikeAngle) * baseRadius * 0.8;
        const spikeY = Math.sin(spikeAngle) * baseRadius * 0.8;
        const spike = scene.add.triangle(
            spikeX, spikeY,
            0, -3,
            2, 2,
            -2, 2,
            0x88ccff, 0.6
        );
        spike.setRotation(spikeAngle + Math.PI / 2);
        spikes.push(spike);
    }

    container.add([ring, orb, core, ...spikes]);

    // Store references for pulsing animation
    container.setData('ring', ring);
    container.setData('spikes', spikes);
    container.setData('pulsePhase', Math.random() * Math.PI * 2);

    const trailData = {
        enabled: TRAIL_CONFIG.blue.enabled,
        history: [],
        distanceSinceLastSample: 0,
        graphics: scene.add.graphics(),
        config: TRAIL_CONFIG.blue
    };
    trailData.graphics.setDepth(container.depth - 1);

    return { sprite: container, trailData };
}

/**
 * Creates a yellow cannon projectile - heavy armor-piercing bolt.
 *
 * Visual: Rectangular slug with metal sheen.
 * Trail: Spark particles.
 * Special: Feels heavy and impactful.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData }
 */
export function createYellowProjectile(scene, x, y, angle) {
    const color = COLORS.yellow.phaser;
    const baseRadius = PROJECTILES.yellow.radius;

    const container = scene.add.container(x, y);

    // Main slug body - thick rectangle
    const slugLength = baseRadius * 2.5;
    const slugWidth = baseRadius * 1.4;
    const slug = scene.add.rectangle(0, 0, slugLength, slugWidth, color);
    slug.setStrokeStyle(1, 0xaa8800);

    // Metal sheen highlight
    const sheen = scene.add.rectangle(
        slugLength * 0.1,
        -slugWidth * 0.2,
        slugLength * 0.4,
        slugWidth * 0.25,
        0xffffcc,
        0.5
    );

    // Penetrator tip - darker front
    const tip = scene.add.rectangle(
        slugLength * 0.4,
        0,
        slugLength * 0.2,
        slugWidth * 0.8,
        0xcc9900
    );

    // Exhaust flare at back
    const flare = scene.add.triangle(
        -slugLength * 0.5, 0,
        slugLength * 0.3, 0,
        0, slugWidth * 0.4,
        0, -slugWidth * 0.4,
        0xff8800, 0.7
    );

    container.add([flare, slug, tip, sheen]);
    container.setRotation(angle);

    // Store reference for spark spawning
    container.setData('sparkTimer', 0);

    const trailData = {
        enabled: TRAIL_CONFIG.yellow.enabled,
        history: [],
        distanceSinceLastSample: 0,
        graphics: scene.add.graphics(),
        config: TRAIL_CONFIG.yellow
    };
    trailData.graphics.setDepth(container.depth - 1);

    return { sprite: container, trailData };
}

/**
 * Creates a purple sniper projectile - sleek precision needle.
 *
 * Visual: Thin elongated needle with energy shimmer.
 * Trail: Precise energy trail.
 * Special: Feels precise and penetrating, emphasizing long range.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData }
 */
export function createPurpleProjectile(scene, x, y, angle) {
    const color = COLORS.purple.phaser;
    const baseRadius = PROJECTILES.purple ? PROJECTILES.purple.radius : 4;

    const container = scene.add.container(x, y);

    // Main needle body - very elongated, thin shape
    const needleLength = baseRadius * 4;
    const needleWidth = baseRadius * 0.8;
    const needle = scene.add.triangle(
        0, 0,
        needleLength, 0,              // Sharp tip (front)
        -needleLength * 0.2, -needleWidth,   // Back left
        -needleLength * 0.2, needleWidth     // Back right
        , color
    );
    needle.setOrigin(0.5, 0.5);

    // Energy shimmer ring around the projectile
    const shimmerRing = scene.add.ellipse(
        0, 0,
        needleLength * 1.3,
        needleWidth * 2.5,
        0xcc88ff,
        0.3
    );

    // Bright energy core
    const core = scene.add.circle(0, 0, baseRadius * 0.5, 0xffccff, 0.95);

    // Energy field at tip (gives penetrating feel)
    const tipGlow = scene.add.circle(
        needleLength * 0.7,
        0,
        baseRadius * 0.7,
        0xffffff,
        0.6
    );

    container.add([shimmerRing, needle, core, tipGlow]);
    container.setRotation(angle);

    // Store references for shimmer animation
    container.setData('shimmerRing', shimmerRing);
    container.setData('shimmerPhase', Math.random() * Math.PI * 2);

    const trailData = {
        enabled: TRAIL_CONFIG.purple.enabled,
        history: [],
        distanceSinceLastSample: 0,
        graphics: scene.add.graphics(),
        config: TRAIL_CONFIG.purple
    };
    trailData.graphics.setDepth(container.depth - 1);

    return { sprite: container, trailData };
}

/**
 * Creates an orange artillery projectile - explosive mortar shell.
 *
 * Visual: Large spherical shell with fire corona and smoke.
 * Trail: Heavy smoke particles.
 * Special: Feels heavy and explosive, area damage on impact.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData }
 */
export function createOrangeProjectile(scene, x, y, angle) {
    const color = COLORS.orange.phaser;
    const baseRadius = PROJECTILES.orange ? PROJECTILES.orange.radius : 8;

    const container = scene.add.container(x, y);

    // Outer fire corona - larger orange glow
    const corona = scene.add.circle(0, 0, baseRadius * 1.5, 0xff4400, 0.4);

    // Main shell body - large sphere
    const shell = scene.add.circle(0, 0, baseRadius, color, 0.95);
    shell.setStrokeStyle(2, 0xcc6600);

    // Inner hot core
    const core = scene.add.circle(0, 0, baseRadius * 0.6, 0xffff00, 0.9);

    // Fire streaks - 3 small flames trailing behind
    const flames = [];
    for (let i = 0; i < 3; i++) {
        const flameAngle = angle + Math.PI + (i - 1) * 0.3;
        const flameX = Math.cos(flameAngle) * baseRadius * 0.7;
        const flameY = Math.sin(flameAngle) * baseRadius * 0.7;
        const flame = scene.add.triangle(
            flameX, flameY,
            0, -4,
            3, 3,
            -3, 3,
            0xff6600, 0.8
        );
        flame.setRotation(flameAngle);
        flames.push(flame);
    }

    container.add([corona, shell, core, ...flames]);
    container.setRotation(angle);

    // Store references for animation
    container.setData('corona', corona);
    container.setData('flames', flames);
    container.setData('pulsePhase', Math.random() * Math.PI * 2);

    const trailData = {
        enabled: TRAIL_CONFIG.orange.enabled,
        history: [],
        distanceSinceLastSample: 0,
        graphics: scene.add.graphics(),
        config: TRAIL_CONFIG.orange
    };
    trailData.graphics.setDepth(container.depth - 1);

    return { sprite: container, trailData };
}

// ============================================================================
// MAIN FACTORY FUNCTION
// ============================================================================

/**
 * Creates a projectile sprite based on color type.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {string} colorKey - 'red', 'blue', 'yellow', 'purple', or 'orange'
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} angle - Direction of travel in radians
 * @returns {object} { sprite, trailData } or null if unknown color
 */
export function createProjectileSprite(scene, colorKey, x, y, angle) {
    switch (colorKey) {
        case 'red':
            return createRedProjectile(scene, x, y, angle);
        case 'blue':
            return createBlueProjectile(scene, x, y, angle);
        case 'yellow':
            return createYellowProjectile(scene, x, y, angle);
        case 'purple':
            return createPurpleProjectile(scene, x, y, angle);
        case 'orange':
            return createOrangeProjectile(scene, x, y, angle);
        default:
            // Fallback: simple circle for unknown colors
            const color = COLORS[colorKey] ? COLORS[colorKey].phaser : 0xffffff;
            const radius = PROJECTILES[colorKey] ? PROJECTILES[colorKey].radius : 4;
            const sprite = scene.add.circle(x, y, radius, color);
            return { sprite, trailData: null };
    }
}

// ============================================================================
// TRAIL UPDATE SYSTEM
// ============================================================================

/**
 * Updates all visual effects for a projectile.
 * Call this every frame for each projectile.
 *
 * @param {object} projectile - Projectile object from combat system
 * @param {number} deltaSeconds - Time since last frame
 */
export function updateProjectileVisuals(projectile, deltaSeconds) {
    if (!projectile.trailData || !projectile.trailData.enabled) {
        return;
    }

    const trail = projectile.trailData;
    const config = trail.config;

    // Sample new position if we've moved enough
    const dx = projectile.x - (trail.lastX || projectile.x);
    const dy = projectile.y - (trail.lastY || projectile.y);
    const distanceMoved = Math.hypot(dx, dy);
    trail.distanceSinceLastSample += distanceMoved;

    if (trail.distanceSinceLastSample >= TRAIL_CONFIG.sampleDistance) {
        trail.history.push({ x: projectile.x, y: projectile.y, age: 0 });
        trail.distanceSinceLastSample = 0;

        // Trim old points
        while (trail.history.length > TRAIL_CONFIG.maxPoints) {
            trail.history.shift();
        }
    }

    trail.lastX = projectile.x;
    trail.lastY = projectile.y;

    // Age all points
    for (const point of trail.history) {
        point.age += deltaSeconds;
    }

    // Draw trail
    drawTrail(trail, projectile.colorKey);

    // Handle blue pulsing
    if (projectile.colorKey === 'blue' && config.pulse) {
        updateBluePulse(projectile.sprite, deltaSeconds);
    }

    // Handle purple shimmer
    if (projectile.colorKey === 'purple' && config.shimmer) {
        updatePurpleShimmer(projectile.sprite, deltaSeconds);
    }

    // Handle orange fire pulse
    if (projectile.colorKey === 'orange' && config.smoke) {
        updateOrangeFirePulse(projectile.sprite, deltaSeconds);
    }
}

/**
 * Draws the trail graphics for a projectile.
 *
 * @param {object} trailData - Trail data object
 * @param {string} colorKey - Color for trail rendering
 */
function drawTrail(trailData, colorKey) {
    const graphics = trailData.graphics;
    const history = trailData.history;
    const config = trailData.config;

    graphics.clear();

    if (history.length < 2) {
        return;
    }

    const color = COLORS[colorKey] ? COLORS[colorKey].phaser : 0xffffff;

    // Draw connected line segments with fading alpha
    for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];

        // Calculate alpha based on position in history (newer = more opaque)
        const t = i / history.length;
        const alpha = TRAIL_CONFIG.fadeEnd + (TRAIL_CONFIG.fadeStart - TRAIL_CONFIG.fadeEnd) * t;

        // Calculate width (can taper toward tail)
        const width = config.width * (0.5 + t * 0.5);

        graphics.lineStyle(width, color, alpha);
        graphics.beginPath();
        graphics.moveTo(prev.x, prev.y);
        graphics.lineTo(curr.x, curr.y);
        graphics.strokePath();
    }
}

/**
 * Updates the pulsing animation for blue projectiles.
 *
 * @param {Phaser.GameObjects.Container} sprite - The projectile container
 * @param {number} deltaSeconds - Time since last frame
 */
function updateBluePulse(sprite, deltaSeconds) {
    const config = TRAIL_CONFIG.blue;
    let phase = sprite.getData('pulsePhase') || 0;
    phase += deltaSeconds * config.pulseSpeed * Math.PI * 2;
    sprite.setData('pulsePhase', phase);

    // Apply pulse to scale
    const pulseScale = 1 + Math.sin(phase) * config.pulseAmount;
    sprite.setScale(pulseScale);

    // Also pulse the ring opacity
    const ring = sprite.getData('ring');
    if (ring) {
        ring.setAlpha(0.5 + Math.sin(phase) * 0.3);
    }
}

/**
 * Updates the shimmer animation for purple projectiles.
 *
 * @param {Phaser.GameObjects.Container} sprite - The projectile container
 * @param {number} deltaSeconds - Time since last frame
 */
function updatePurpleShimmer(sprite, deltaSeconds) {
    let phase = sprite.getData('shimmerPhase') || 0;
    phase += deltaSeconds * 6 * Math.PI * 2; // Shimmer speed
    sprite.setData('shimmerPhase', phase);

    // Apply shimmer to energy ring opacity
    const shimmerRing = sprite.getData('shimmerRing');
    if (shimmerRing) {
        const shimmerAlpha = 0.2 + Math.sin(phase) * 0.15;
        shimmerRing.setAlpha(shimmerAlpha);
    }
}

/**
 * Updates the fire pulse animation for orange projectiles.
 *
 * @param {Phaser.GameObjects.Container} sprite - The projectile container
 * @param {number} deltaSeconds - Time since last frame
 */
function updateOrangeFirePulse(sprite, deltaSeconds) {
    let phase = sprite.getData('pulsePhase') || 0;
    phase += deltaSeconds * 4 * Math.PI * 2; // Fire pulse speed
    sprite.setData('pulsePhase', phase);

    // Pulse the corona (fire glow)
    const corona = sprite.getData('corona');
    if (corona) {
        const scale = 1 + Math.sin(phase) * 0.2;
        corona.setScale(scale);
        const alpha = 0.3 + Math.sin(phase) * 0.15;
        corona.setAlpha(alpha);
    }

    // Flicker the flames
    const flames = sprite.getData('flames');
    if (flames) {
        flames.forEach((flame, index) => {
            const flamePhase = phase + index * 0.5;
            const alpha = 0.6 + Math.sin(flamePhase) * 0.3;
            flame.setAlpha(alpha);
        });
    }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Destroys trail graphics when projectile is removed.
 * Call this when removing a projectile from the combat system.
 *
 * @param {object} trailData - Trail data object to clean up
 */
export function destroyTrailGraphics(trailData) {
    if (trailData && trailData.graphics) {
        trailData.graphics.destroy();
    }
}

// ============================================================================
// IMPACT EFFECTS
// ============================================================================
// These create color-specific hit effects. Designed to be called by VfxSystem.
// ============================================================================

/**
 * Returns impact effect configuration for a color.
 * VfxSystem uses this to spawn appropriate particles.
 *
 * @param {string} colorKey - 'red', 'blue', 'yellow', 'purple', or 'orange'
 * @returns {object} Impact effect configuration
 */
export function getImpactConfig(colorKey) {
    switch (colorKey) {
        case 'red':
            return {
                type: 'shrapnel',
                count: 5,
                speed: 120,
                life: 0.25,
                radius: 2,
                spread: 0.8,
                color: COLORS.red.phaser
            };
        case 'blue':
            return {
                type: 'frost',
                count: 6,
                speed: 60,
                life: 0.4,
                radius: 3,
                spread: 1.0,
                color: 0x88ccff,
                // Special: spawns ice crack effect
                crackEffect: true
            };
        case 'yellow':
            return {
                type: 'sparks',
                count: 8,
                speed: 180,
                life: 0.35,
                radius: 2.5,
                spread: 0.6,
                color: 0xffcc44,
                // Special: camera shake on hit
                cameraShake: true
            };
        case 'purple':
            return {
                type: 'pierce',
                count: 4,
                speed: 100,
                life: 0.3,
                radius: 2,
                spread: 0.4,
                color: 0xcc88ff,
                // Special: tight spread for precision feel
                tightSpread: true
            };
        case 'orange':
            return {
                type: 'explosion',
                count: 12,
                speed: 140,
                life: 0.5,
                radius: 3.5,
                spread: 1.0,
                color: 0xff8800,
                // Special: large explosion with heavy camera shake
                explosionRadius: 80,
                heavyShake: true
            };
        default:
            return {
                type: 'generic',
                count: 4,
                speed: 80,
                life: 0.3,
                radius: 2,
                spread: 1.0,
                color: 0xffffff
            };
    }
}
