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
 *
 * MODIFYING VALUES:
 *   Feel free to experiment! Good starting points:
 *   - TRAIN.engineSpeed: Make train faster/slower (default: 100)
 *   - TRAIN.maxCars: Allow longer trains (default: 12)
 *   - WAVES.totalToWin: Shorter/longer runs (default: 20)
 *   - WEAPON_STATS: Adjust damage/fire rates for balance
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
    spawnInvulnerableSeconds: 1.5
});

export const BUILD = Object.freeze({
    version: 'v1'
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
    lookAheadDistance: 90,
    followSmoothing: 8,
    baseZoom: 1.12,
    zoomAtSixCars: 1.0,
    zoomAtTenCars: 0.92,
    maxZoomOut: 0.85,
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
    engineHp: 50,
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
    }
});

export const COLOR_KEYS = Object.freeze(['red', 'blue', 'yellow']);

export const WEAPON_STATS = Object.freeze({
    red: [
        { fireRate: 8, damage: 5, range: 200, projectileSpeed: 600 },
        { fireRate: 10, damage: 7, range: 200, projectileSpeed: 600 },
        { fireRate: 12, damage: 10, range: 200, projectileSpeed: 600 }
    ],
    blue: [
        {
            fireRate: 2,
            damage: 8,
            range: 250,
            projectileSpeed: 400,
            slowPercent: 0.4,
            slowDuration: 1.5
        },
        {
            fireRate: 2.5,
            damage: 12,
            range: 250,
            projectileSpeed: 420,
            slowPercent: 0.5,
            slowDuration: 2.0
        },
        {
            fireRate: 3,
            damage: 18,
            range: 250,
            projectileSpeed: 440,
            slowPercent: 0.6,
            slowDuration: 2.5
        }
    ],
    yellow: [
        {
            fireRate: 0.8,
            damage: 35,
            range: 300,
            projectileSpeed: 800,
            armorPierce: 0.5
        },
        {
            fireRate: 1.0,
            damage: 50,
            range: 300,
            projectileSpeed: 840,
            armorPierce: 0.65
        },
        {
            fireRate: 1.2,
            damage: 70,
            range: 300,
            projectileSpeed: 880,
            armorPierce: 0.8
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
            { fireRate: 2.6, damage: 3, range: 160, projectileSpeed: 500 },
            { fireRate: 3.4, damage: 4, range: 175, projectileSpeed: 520 },
            { fireRate: 4.2, damage: 5, range: 190, projectileSpeed: 540 }
        ],
        blue: [
            { fireRate: 1.2, damage: 4, range: 180, projectileSpeed: 450, slowPercent: 0.25, slowDuration: 1.2 },
            { fireRate: 1.6, damage: 5, range: 195, projectileSpeed: 470, slowPercent: 0.35, slowDuration: 1.6 },
            { fireRate: 2.0, damage: 6, range: 210, projectileSpeed: 490, slowPercent: 0.45, slowDuration: 2.0 }
        ],
        yellow: [
            { fireRate: 0.5, damage: 16, range: 200, projectileSpeed: 650, armorPierce: 0.35 },
            { fireRate: 0.7, damage: 22, range: 220, projectileSpeed: 700, armorPierce: 0.45 },
            { fireRate: 0.9, damage: 28, range: 240, projectileSpeed: 760, armorPierce: 0.55 }
        ]
    }
});

export const PROJECTILES = Object.freeze({
    red: { radius: 3 },
    blue: { radius: 5 },
    yellow: { radius: 7 }
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
    }
});

export const SPAWN = Object.freeze({
    pickupCountMin: 2,
    pickupCountMax: 3,
    pickupSpawnMinSeconds: 10,
    pickupSpawnMaxSeconds: 14,
    pickupDriftSpeed: 30,
    pickupLifetimeSeconds: 15,
    spawnPadding: 60,
    pickupPaddingPerCar: 1.5,
    enemyPaddingPerCar: 3,
    maxExtraPadding: 50
});

export const WAVES = Object.freeze({
    totalToWin: 20,
    baseEnemyCount: 8,
    initialDelaySeconds: 4,
    interWaveDelaySeconds: 2.5,
    championEvery: 5,
    bossEvery: 10,
    hpScalePerWave: 0.09,
    damageScalePerWave: 0.05,
    speedScalePerWave: 0.01
});

export const OVERDRIVE = Object.freeze({
    chargeSeconds: 40,
    pulseDamage: 40,
    flashDuration: 0.35
});

export const EFFECTS = Object.freeze({
    carExplosionDamage: 15,
    carExplosionRadius: 50
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
