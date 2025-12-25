/**
 * config.js - Central configuration for Iron Spine
 *
 * All game balance values, visual constants, and tuning parameters live here.
 * This makes it easy to tweak gameplay without hunting through code.
 *
 * ORGANIZATION:
 *   DEBUG      - Development/debug flags (disabled in production)
 *   PALETTE    - Color scheme for UI and game objects
 *   GAME       - Core game dimensions and timing
 *   CAMERA     - Camera zoom, follow, and shake settings
 *   TRAIN      - Engine and car physics, HP, sizes
 *   COLORS     - The three weapon car types (red/blue/yellow)
 *   WEAPON_*   - Damage, fire rates, ranges per weapon tier
 *   ENEMIES    - Enemy type definitions
 *   SPAWN      - Pickup and enemy spawn rules
 *   WAVES      - Wave progression and scaling
 *   ENDLESS    - Endless mode configuration
 *   DROP_PROTECTION - Prevent accidental car drops
 *
 * ============================================================================
 * EXTENSIBILITY GUIDE - HOW TO ADD NEW CONTENT
 * ============================================================================
 *
 * ADDING A NEW CAR COLOR:
 * -----------------------
 * 1. Add entry to COLORS object (see orange example below)
 * 2. Add color key to COLOR_KEYS array
 * 3. Add weapon stats to WEAPON_STATS (3 tiers)
 * 4. Add engine weapon stats to ENGINE_WEAPON.stats
 * 5. Add projectile config to PROJECTILES
 *
 * Example (already included but commented out):
 *
 *   COLORS.orange = {
 *       key: 'orange',
 *       name: 'Orange',
 *       hex: '#ff8800',
 *       phaser: 0xff8800
 *   };
 *
 *   WEAPON_STATS.orange = [
 *       { fireRate: 0.5, damage: 50, range: 150, projectileSpeed: 300, aoeRadius: 60 },
 *       { fireRate: 0.7, damage: 75, range: 160, projectileSpeed: 320, aoeRadius: 80 },
 *       { fireRate: 0.9, damage: 100, range: 170, projectileSpeed: 340, aoeRadius: 100 }
 *   ];
 *
 * ADDING A NEW ENEMY TYPE:
 * ------------------------
 * 1. Add entry to ENEMIES object with all required fields
 * 2. Update spawner.js to include the new enemy type in spawn logic
 *
 * Required fields for enemies:
 *   - name: Display name
 *   - hp: Base health points
 *   - speed: Movement speed
 *   - damage: Contact damage
 *   - radius: Hit circle radius
 *   - armor: Damage reduction (0 = none)
 *   - color: Phaser hex color for body
 *   - trim: Phaser hex color for trim/accent
 *   - size: { width, height } for rendering
 *
 * Optional fields:
 *   - shootsProjectiles: boolean
 *   - projectileDamage: number
 *   - projectileSpeed: number
 *   - attackRange: number
 *   - abilities: ['charge', 'spawn_minions', etc.]
 *
 * MODIFYING VALUES:
 *   Feel free to experiment! Good starting points:
 *   - TRAIN.engineSpeed: Make train faster/slower (default: 100)
 *   - TRAIN.maxCars: Allow longer trains (default: 12)
 *   - WAVES.totalToWin: Shorter/longer runs (default: 20)
 *   - WEAPON_STATS: Adjust damage/fire rates for balance
 *   - ENDLESS.enabled: Toggle infinite mode
 */

export const DEBUG = Object.freeze({
    enabled: false,
    overlay: false,
    logEvents: false,
    showHitboxes: false,
    invincible: false
});

export const DEV_ASSERTIONS = false;

export const PALETTE = Object.freeze({
    background: '#1a1a2e',
    ground: '#16213e',
    engineBody: '#4a4a4a',
    engineAccent: '#ffa500',
    coupling: '#888888',
    uiText: '#ffffff',
    uiShadow: '#000000',
    pickupGlow: '#ffffff',
    enemyBody: '#b0b0b0',
    enemyTrim: '#ff6666',
    warning: '#ffcc00'
});

export const GAME = Object.freeze({
    width: 960,
    height: 540,
    backgroundColor: PALETTE.background,
    spawnInvulnerableSeconds: 2.0
});

export const BUILD = Object.freeze({
    version: 'v1.3.0'
});

const DEVICE_PIXEL_RATIO = typeof window !== 'undefined'
    ? window.devicePixelRatio || 1
    : 1;
const RENDER_RESOLUTION = Math.min(Math.max(DEVICE_PIXEL_RATIO, 1.5), 2);

export const RENDER = Object.freeze({
    resolution: RENDER_RESOLUTION,
    textResolution: RENDER_RESOLUTION
});

export const CAMERA = Object.freeze({
    lookAheadDistance: 110,
    followSmoothing: 8,
    // Zoomed out more so train doesn't dominate large monitors.
    // The world should feel big, the train should feel like it's IN the world.
    baseZoom: 0.85,
    zoomAtSixCars: 0.78,
    zoomAtTenCars: 0.70,
    maxZoomOut: 0.62,
    zoomSmoothing: 4,
    shakeLight: 0.008,
    shakeMedium: 0.015,
    shakeHeavy: 0.025
});

export const TRAIN = Object.freeze({
    engineSpeed: 100,
    turnSpeedDeg: 165,
    acceleration: 320,
    deceleration: 520,
    boostMultiplier: 1.2,
    boostDurationSeconds: 2,
    boostCooldownSeconds: 5,
    followFactor: 0.15,
    maxCars: 12,
    engineHp: 55,
    carHpByTier: [20, 30, 40],
    engineSize: { width: 110, height: 34 },
    engineHitRadius: 32,
    carSize: { width: 36, height: 26 },
    couplingRadius: 7,
    chainReformDelaySeconds: 0.5,
    engineSpacing: 76,
    carSpacing: 42,
    attachSpacing: 44
});

export const COLORS = Object.freeze({
    red: {
        key: 'red',
        name: 'Red',
        hex: '#ff4444',
        phaser: 0xff4444
    },
    blue: {
        key: 'blue',
        name: 'Blue',
        hex: '#4444ff',
        phaser: 0x4444ff
    },
    yellow: {
        key: 'yellow',
        name: 'Yellow',
        hex: '#ffcc00',
        phaser: 0xffcc00
    },
    purple: {
        key: 'purple',
        name: 'Purple',
        hex: '#aa44ff',
        phaser: 0xaa44ff
    }
});

export const COLOR_KEYS = Object.freeze(['red', 'blue', 'yellow', 'purple']);

export const WEAPON_STATS = Object.freeze({
    red: [
        { fireRate: 8, damage: 5, range: 240, projectileSpeed: 600 },
        { fireRate: 10, damage: 7, range: 260, projectileSpeed: 600 },
        { fireRate: 12, damage: 10, range: 280, projectileSpeed: 600 }
    ],
    blue: [
        {
            fireRate: 2,
            damage: 8,
            range: 280,
            projectileSpeed: 400,
            slowPercent: 0.4,
            slowDuration: 1.5
        },
        {
            fireRate: 2.5,
            damage: 12,
            range: 300,
            projectileSpeed: 420,
            slowPercent: 0.5,
            slowDuration: 2.0
        },
        {
            fireRate: 3,
            damage: 18,
            range: 320,
            projectileSpeed: 440,
            slowPercent: 0.6,
            slowDuration: 2.5
        }
    ],
    yellow: [
        {
            fireRate: 0.8,
            damage: 35,
            range: 340,
            projectileSpeed: 800,
            armorPierce: 0.5
        },
        {
            fireRate: 1.0,
            damage: 50,
            range: 360,
            projectileSpeed: 840,
            armorPierce: 0.65
        },
        {
            fireRate: 1.2,
            damage: 70,
            range: 380,
            projectileSpeed: 880,
            armorPierce: 0.8
        }
    ],
    purple: [
        {
            fireRate: 1.5,
            damage: 15,
            range: 450,
            projectileSpeed: 900,
            penetration: 1
        },
        {
            fireRate: 1.8,
            damage: 22,
            range: 500,
            projectileSpeed: 950,
            penetration: 2
        },
        {
            fireRate: 2.2,
            damage: 32,
            range: 550,
            projectileSpeed: 1000,
            penetration: 3
        }
    ]
});

export const ENGINE_WEAPON = Object.freeze({
    // Dominant color decides weapon type. Count thresholds decide tier.
    tier2Count: 3,
    tier3Count: 6,
    forwardDot: 0.2,
    stats: {
        red: [
            { fireRate: 2.6, damage: 3, range: 180, projectileSpeed: 500 },
            { fireRate: 3.4, damage: 4, range: 200, projectileSpeed: 520 },
            { fireRate: 4.2, damage: 5, range: 220, projectileSpeed: 540 }
        ],
        blue: [
            { fireRate: 1.2, damage: 4, range: 200, projectileSpeed: 450, slowPercent: 0.25, slowDuration: 1.2 },
            { fireRate: 1.6, damage: 5, range: 220, projectileSpeed: 470, slowPercent: 0.35, slowDuration: 1.6 },
            { fireRate: 2.0, damage: 6, range: 240, projectileSpeed: 490, slowPercent: 0.45, slowDuration: 2.0 }
        ],
        yellow: [
            { fireRate: 0.5, damage: 16, range: 240, projectileSpeed: 650, armorPierce: 0.35 },
            { fireRate: 0.7, damage: 22, range: 260, projectileSpeed: 700, armorPierce: 0.45 },
            { fireRate: 0.9, damage: 28, range: 280, projectileSpeed: 760, armorPierce: 0.55 }
        ],
        purple: [
            { fireRate: 1.0, damage: 8, range: 300, projectileSpeed: 800, penetration: 1 },
            { fireRate: 1.3, damage: 12, range: 340, projectileSpeed: 850, penetration: 1 },
            { fireRate: 1.6, damage: 16, range: 380, projectileSpeed: 900, penetration: 2 }
        ]
    }
});

export const PROJECTILES = Object.freeze({
    red: { radius: 3 },
    blue: { radius: 5 },
    yellow: { radius: 7 },
    purple: { radius: 4 }
});

export const ENEMIES = Object.freeze({
    skirmisher: {
        name: 'Skirmisher',
        hp: 15,
        speed: 120,
        damage: 5,
        radius: 14,
        armor: 0,
        color: 0xd0d0d0,
        trim: 0xff6666,
        size: { width: 24, height: 16 }
    },
    champion: {
        name: 'Champion',
        hp: 80,
        speed: 90,
        damage: 12,
        radius: 20,
        armor: 2,
        color: 0xb8b8b8,
        trim: 0xffcc00,
        size: { width: 34, height: 22 }
    },
    boss: {
        name: 'Boss',
        hp: 220,
        speed: 70,
        damage: 20,
        radius: 28,
        armor: 4,
        color: 0xa0a0a0,
        trim: 0xff8844,
        size: { width: 46, height: 30 }
    },
    armored: {
        name: 'Armored',
        hp: 120,
        speed: 40,
        damage: 15,
        radius: 22,
        armor: 10,
        color: 0x8f8f8f,
        trim: 0xffcc00,
        size: { width: 40, height: 30 }
    },
    ranger: {
        name: 'Ranger',
        hp: 30,
        speed: 80,
        damage: 8,
        radius: 16,
        armor: 0,
        color: 0xf0f0f0,
        trim: 0x66aaff,
        size: { width: 28, height: 20 },
        fireCooldown: 2,
        projectileSpeed: 300,
        projectileRange: 520,
        projectileSize: { width: 10, height: 10 },
        projectileColor: 0xff5555,
        projectileSpreadDeg: 8,
        orbitDistance: 220
    }
});

export const SPAWN = Object.freeze({
    pickupCountMin: 2,
    pickupCountMax: 3,
    pickupSpawnMinSeconds: 9,
    pickupSpawnMaxSeconds: 12,
    pickupDriftSpeed: 30,
    pickupLifetimeSeconds: 15,
    pickupCaravanChance: 0.35,
    pickupCaravanMinCount: 3,
    pickupCaravanMaxCount: 5,
    // Color spawn weights: [red, blue, yellow, purple]
    // Early game (waves 1-5): Purple sniper favored
    colorWeightsEarly: [1, 1, 1, 3],
    // Mid game (waves 6-12): Balanced
    colorWeightsMid: [1, 1, 1, 1],
    // Late game (waves 13+): Purple less common
    colorWeightsLate: [1.5, 1.5, 1.5, 0.5],
    pickupCaravanSpacing: 38,
    spawnPadding: 60,
    pickupPaddingPerCar: 1.5,
    enemyPaddingPerCar: 3,
    maxExtraPadding: 50,
    pickupTimeScalePerWave: 0.015,
    pickupTimeScaleMax: 1.6,
    pickupCountScalePerWave: 0.02,
    pickupCountScaleMin: 0.7,
    pickupTierScalePerTier: 0.12,
    pickupTierScaleMax: 1.5
});

export const WAVES = Object.freeze({
    totalToWin: 20,
    baseEnemyCount: 6,
    initialDelaySeconds: 5,
    interWaveDelaySeconds: 2.8,
    championEvery: 5,
    bossEvery: 10,
    rangerStartWave: 6,
    armoredStartWave: 9,
    rangerIncreaseEvery: 5,
    armoredIncreaseEvery: 6,
    rangerCountBase: 1,
    rangerCountMax: 3,
    armoredCountBase: 1,
    armoredCountMax: 2,
    enemyCountStep: 4,
    enemyCountIncrease: 1,
    maxExtraEnemies: 5,
    hpScalePerWave: 0.07,
    damageScalePerWave: 0.04,
    speedScalePerWave: 0.008
});

export const OVERDRIVE = Object.freeze({
    chargeSeconds: 40,
    pulseDamage: 40,
    flashDuration: 0.35
});

export const EFFECTS = Object.freeze({
    carExplosionDamage: 15,
    carExplosionRadius: 50,
    mergeParticleCount: 12,
    mergeParticleSpeed: 90,
    mergeParticleLife: 0.45,
    explosionParticleCount: 18,
    explosionParticleSpeed: 140,
    explosionParticleLife: 0.6,
    smokeInterval: 0.2,
    smokeLife: 0.8,
    smokeSpeed: 22,
    pulseRingDuration: 0.45
});

export const UI = Object.freeze({
    fontFamily: 'Trebuchet MS, Arial, sans-serif',
    baseFontSize: 18,
    titleFontSize: 48,
    subtitleFontSize: 24,
    statsFontSize: 20,
    // Generous padding to avoid browser chrome overlap (bookmark bars, etc)
    hudPadding: 32
});

// ============================================================================
// ENDLESS MODE CONFIGURATION
// ============================================================================
// Toggle ENDLESS.enabled to switch between 20-wave classic and infinite mode
// ============================================================================

export const ENDLESS = Object.freeze({
    // Set to true for infinite waves (no win condition)
    enabled: false,

    // Difficulty curve: 'linear', 'logarithmic', 'exponential'
    // logarithmic = fast early growth, slows down (recommended)
    curveType: 'logarithmic',

    // Scaling rates per wave (multipliers compound)
    enemyHpScaleRate: 0.09,
    enemyDamageScaleRate: 0.05,
    enemySpeedScaleRate: 0.01,

    // Caps to keep game playable even at wave 10000
    maxEnemiesAtOnce: 50,
    maxEnemyHpMultiplier: 1000,
    maxEnemyDamageMultiplier: 50,

    // Milestone waves (celebrations)
    milestones: [10, 25, 50, 100, 150, 200, 250, 500, 1000],

    // Rubber-banding (help struggling players)
    rubberBandEnabled: true,
    rubberBandThreshold: 3,
    rubberBandReduction: 0.15
});

// ============================================================================
// DROP PROTECTION CONFIGURATION
// ============================================================================
// Prevents accidental loss of all cars when spamming the drop button
// ============================================================================

export const DROP_PROTECTION = Object.freeze({
    // Base cooldown between drops (ms)
    dropCooldownMs: 200,

    // Cooldown multiplier for consecutive rapid drops
    consecutiveMultiplier: 1.5,

    // Maximum cooldown cap (ms)
    maxCooldownMs: 2000,

    // Hold time required to drop the LAST car (ms)
    lastCarHoldMs: 500,

    // Warn when this many cars or fewer remain
    warningThreshold: 3,

    // Reset consecutive counter after this idle time (ms)
    resetAfterMs: 3000,

    // Minimum cars to keep (0 = can drop all, 1 = keep at least one)
    minimumCars: 1
});

// ============================================================================
// FUTURE CAR COLORS (Uncomment to enable)
// ============================================================================
// These are ready-to-use color definitions for post-V1 content.
// To enable a new color:
//   1. Uncomment the COLORS entry below
//   2. Add the key to COLOR_KEYS
//   3. Add WEAPON_STATS for the color
// ============================================================================

/*
// ORANGE - Area damage / Explosions
COLORS.orange = {
    key: 'orange',
    name: 'Orange',
    hex: '#ff8800',
    phaser: 0xff8800
};

// GREEN - Damage over time / Corrosion
COLORS.green = {
    key: 'green',
    name: 'Green',
    hex: '#44ff44',
    phaser: 0x44ff44
};

// PURPLE - Chain lightning / Multi-target
COLORS.purple = {
    key: 'purple',
    name: 'Purple',
    hex: '#aa44ff',
    phaser: 0xaa44ff
};

// To enable, update COLOR_KEYS:
// export const COLOR_KEYS = Object.freeze(['red', 'blue', 'yellow', 'orange', 'green', 'purple']);
*/

// ============================================================================
// FUTURE ENEMY TYPES (Uncomment to enable)
// ============================================================================
// Ready-to-use enemy definitions for post-V1 content.
// ============================================================================

/*
ENEMIES.armored = {
    name: 'Armored',
    hp: 40,
    speed: 80,
    damage: 8,
    radius: 18,
    armor: 5,           // High armor - use yellow weapons!
    color: 0x606060,
    trim: 0x888888,
    size: { width: 28, height: 20 }
};

ENEMIES.ranger = {
    name: 'Ranger',
    hp: 25,
    speed: 60,
    damage: 3,          // Low contact damage
    radius: 12,
    armor: 0,
    color: 0xcc8844,
    trim: 0xffaa66,
    size: { width: 20, height: 14 },
    shootsProjectiles: true,
    projectileDamage: 8,
    projectileSpeed: 300,
    attackRange: 250
};

ENEMIES.swarm = {
    name: 'Swarm',
    hp: 5,              // Very low HP
    speed: 180,         // Very fast
    damage: 2,
    radius: 8,
    armor: 0,
    color: 0x88ff88,
    trim: 0xaaffaa,
    size: { width: 12, height: 10 }
};
*/
