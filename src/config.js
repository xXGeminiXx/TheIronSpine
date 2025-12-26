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
 *   - TRAIN.maxCars: Allow longer trains (set to Number.POSITIVE_INFINITY for no cap)
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
    version: 'v2.0.3' // v2.0.3: Threat indicator redesign
});

export const SEEDING = Object.freeze({
    // Enable seeded runs for reproducible gameplay
    enabled: true,

    // Use daily seed by default (changes once per day)
    // If false, generates random seed per run
    useDailySeed: false,

    // Display seed on HUD (top-left, small text)
    showSeedOnHUD: true,

    // Display seed on end screen
    showSeedOnEndScreen: true,

    // Allow URL parameter override (?seed=ABCD1234)
    allowURLSeeds: true
});

const DEVICE_PIXEL_RATIO = typeof window !== 'undefined'
    ? window.devicePixelRatio || 1
    : 1;
const RENDER_RESOLUTION = Math.min(Math.max(DEVICE_PIXEL_RATIO, 1.5), 2);

export const RENDER = Object.freeze({
    resolution: RENDER_RESOLUTION,
    textResolution: RENDER_RESOLUTION
});

export const REMOTE_HIGHSCORE = Object.freeze({
    // Enable only on approved hosts (ex: production domain).
    enabled: true,
    // Default: allow only the official host; other sites can enable via config override.
    allowAnyHost: false,
    allowLocalOverride: true,
    overrideKey: 'ironspine_highscores_override',
    allowedHosts: ['xxgeminixx.github.io'],
    endpoint: '/api/highscores',
    maxEntries: 10,
    maxNameLength: 25,
    cacheTtlMs: 30000,
    requestTimeoutMs: 6000
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
    maxCars: Number.POSITIVE_INFINITY, // No cap on collected cars.
    engineHp: 55,
    carHpByTier: [20, 30, 40],
    engineSize: { width: 110, height: 34 },
    engineHitRadius: 32,
    headlightLength: 240,
    headlightSpreadDeg: 42,
    headlightOffset: 46,
    carSize: { width: 36, height: 26 },
    couplingRadius: 7,
    shadowOffsetY: 6,
    shadowWidth: 18,
    shadowAlpha: 0.18,
    chainReformDelaySeconds: 0.5,
    engineSpacing: 76,
    carSpacing: 42,
    attachSpacing: 44,
    engineGlowMinAlpha: 0.25,
    engineGlowMaxAlpha: 0.6,
    engineGlowPulseSeconds: 0.9,
    engineGlowScale: 1.2,
    heatGainPerShot: 0.18,
    heatDecayPerSecond: 0.7,
    heatGlowMaxAlpha: 0.6
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
    },
    orange: {
        key: 'orange',
        name: 'Orange',
        hex: '#ff8800',
        phaser: 0xff8800
    }
});

export const COLOR_KEYS = Object.freeze(['red', 'blue', 'yellow', 'purple', 'orange']);

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
    ],
    orange: [
        {
            fireRate: 0.6,
            damage: 20,
            range: 300,
            projectileSpeed: 350,
            splashRadius: 50,
            splashDamage: 12
        },
        {
            fireRate: 0.8,
            damage: 28,
            range: 330,
            projectileSpeed: 380,
            splashRadius: 65,
            splashDamage: 18
        },
        {
            fireRate: 1.0,
            damage: 38,
            range: 360,
            projectileSpeed: 400,
            splashRadius: 80,
            splashDamage: 25
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
        ],
        orange: [
            { fireRate: 0.4, damage: 12, range: 220, projectileSpeed: 320, splashRadius: 40, splashDamage: 8 },
            { fireRate: 0.5, damage: 16, range: 250, projectileSpeed: 350, splashRadius: 50, splashDamage: 12 },
            { fireRate: 0.6, damage: 20, range: 280, projectileSpeed: 380, splashRadius: 60, splashDamage: 16 }
        ]
    }
});

export const PROJECTILES = Object.freeze({
    red: { radius: 3 },
    blue: { radius: 5 },
    yellow: { radius: 7 },
    purple: { radius: 4 },
    orange: { radius: 8 }
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
    },
    harpooner: {
        name: 'Harpooner',
        hp: 55,
        speed: 70,
        damage: 6,
        radius: 18,
        armor: 2,
        color: 0xb0b0ff,
        trim: 0x6655ff,
        size: { width: 30, height: 22 },
        attackRange: 260,
        windupSeconds: 0.5,
        dragSeconds: 1.2,
        cooldownSeconds: 3.2,
        dragPullSpeed: 120,
        telegraphColor: 0xffaa66,
        tetherColor: 0xffcc66
    },
    minelayer: {
        name: 'Clamp Layer',
        hp: 65,
        speed: 65,
        damage: 8,
        radius: 20,
        armor: 3,
        color: 0xc0b090,
        trim: 0x6a5a3c,
        size: { width: 34, height: 24 },
        mineCooldown: 3.6,
        mineSpeed: 35,
        mineLifetime: 8,
        mineRadius: 10,
        clampDuration: 1.6,
        turnPenaltyMultiplier: 0.7,
        mineColor: 0xd6c5a0,
        mineTrim: 0x7a6244
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
    // Color spawn weights: [red, blue, yellow, purple, orange]
    // Early game (waves 1-5): Purple sniper favored, orange rare
    colorWeightsEarly: [1, 1, 1, 3, 0.5],
    // Mid game (waves 6-12): Orange artillery favored (enemy clustering)
    colorWeightsMid: [1, 1, 1, 1, 2.0],
    // Late game (waves 13+): Balanced, purple reduced
    colorWeightsLate: [1.5, 1.5, 1.5, 0.5, 1.2],
    pickupCaravanSpacing: 38,
    enemyFormationChance: 0.6,
    enemyFormationMinCount: 4,
    enemyFormationSpacing: 28,
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
    totalToWin: 100, // v1.4.0 Extended to 100 waves
    baseEnemyCount: 6,
    initialDelaySeconds: 5,
    interWaveDelaySeconds: 2.8,
    championEvery: 5,
    bossEvery: 10,
    rangerStartWave: 6,
    armoredStartWave: 9,
    harpoonerStartWave: 7,
    minelayerStartWave: 10,
    rangerIncreaseEvery: 5,
    armoredIncreaseEvery: 6,
    harpoonerIncreaseEvery: 6,
    minelayerIncreaseEvery: 7,
    rangerCountBase: 1,
    rangerCountMax: 5, // v1.4.0 Increased for late game
    armoredCountBase: 1,
    armoredCountMax: 3, // v1.4.0 Increased for late game
    harpoonerCountBase: 1,
    harpoonerCountMax: 3, // v1.4.0 Increased for late game
    minelayerCountBase: 1,
    minelayerCountMax: 3, // v1.4.0 Increased for late game
    enemyCountStep: 4,
    enemyCountIncrease: 1,
    maxExtraEnemies: 12, // v1.4.0 Increased for late game
    // v1.4.0 Reduced scaling for 100 waves (smoother curve)
    hpScalePerWave: 0.035, // Was 0.07, halved for 100 waves
    damageScalePerWave: 0.02, // Was 0.04, halved for 100 waves
    speedScalePerWave: 0.004, // Was 0.008, halved for 100 waves
    // v1.4.0 Milestone waves for extra difficulty spikes
    milestoneWaves: [25, 50, 75, 100],
    milestoneHpBonus: 0.5, // +50% HP on milestone waves
    milestoneDamageBonus: 0.3 // +30% damage on milestone waves
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
    carSmokeInterval: 0.45,
    sparkInterval: 0.5,
    sparkParticleCount: 3,
    sparkParticleSpeed: 90,
    sparkParticleLife: 0.35,
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

    // Scaling rates per wave (log-sqrt curve in endless-mode.js)
    // Tuned so wave 100 ~4x HP, ~2.6x damage, ~1.2x speed.
    enemyHpScaleRate: 0.15,
    enemyDamageScaleRate: 0.08,
    enemySpeedScaleRate: 0.012,

    // Caps to keep game playable even at wave 10000
    maxEnemiesAtOnce: 50,
    maxEnemyHpMultiplier: 1000,
    maxEnemyDamageMultiplier: 50,

    // Clamp wave used for scaling (prevents overflow at extreme wave counts)
    maxScalingWave: 1000000,

    // Milestone waves (celebrations)
    milestones: [10, 25, 50, 100, 150, 200, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],

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
// COMBO SYSTEM CONFIGURATION
// ============================================================================
// Rewards consecutive kills with damage multipliers
// ============================================================================

export const COMBO = Object.freeze({
    // Time window to maintain combo (seconds)
    comboWindow: 2.0,

    // Multiplier tiers (minKills -> multiplier)
    tiers: [
        { minKills: 0, multiplier: 1.0, label: null },
        { minKills: 5, multiplier: 1.2, label: 'ROLLING' },
        { minKills: 10, multiplier: 1.5, label: 'UNSTOPPABLE' },
        { minKills: 15, multiplier: 2.0, label: 'LEGENDARY' },
        { minKills: 20, multiplier: 3.0, label: 'IRON SPINE' }
    ],

    // Visual settings
    displayDuration: 3.0, // How long to show combo text (seconds)
    pulseSpeed: 3.0 // Pulse animation speed
});

// ============================================================================
// CRITICAL HIT CONFIGURATION
// ============================================================================
// Chance-based critical hits with visual feedback
// ============================================================================

export const CRIT = Object.freeze({
    // Base crit chance and multiplier
    baseCritChance: 0.05, // 5%
    baseCritMultiplier: 2.0,

    // Yellow has enhanced crit stats
    yellowCritChance: 0.10, // 10%
    yellowCritMultiplier: 2.5,

    // Purple has moderate crit bonus
    purpleCritChance: 0.07, // 7%
    purpleCritMultiplier: 2.2,

    // Visual settings
    flashDuration: 0.2, // Crit flash duration (seconds)
    textDuration: 0.8, // Floating damage text duration (seconds)
    scaleMultiplier: 1.5 // Visual size increase for crit projectiles
});

// ============================================================================
// WEATHER SYSTEM CONFIGURATION
// ============================================================================
// Procedural weather effects with gameplay modifiers
// ============================================================================

export const WEATHER = Object.freeze({
    // Enable/disable weather system
    enabled: true,

    // Weather change interval (seconds)
    changeIntervalMin: 60,
    changeIntervalMax: 90,

    // Lightning (storm only)
    lightningIntervalMin: 5,
    lightningIntervalMax: 12,
    lightningDamage: 25,
    lightningRadius: 60,

    // Particle limits
    maxParticles: 150,

    // Weather rotation pattern
    // Available: CLEAR, FOG, STORM, DUST, ASH
    rotation: ['CLEAR', 'FOG', 'CLEAR', 'STORM', 'CLEAR', 'DUST', 'CLEAR', 'ASH']
});

// ============================================================================
// TELEGRAPH SYSTEM CONFIGURATION
// ============================================================================
// Enemy attack warnings for fairness
// ============================================================================

export const TELEGRAPH = Object.freeze({
    // Telegraph durations per enemy type (seconds)
    rangerAimDuration: 0.4,
    championChargeDuration: 0.6,
    bossImpactDuration: 0.8,
    armoredChargeDuration: 0.6,

    // Visual settings
    pulseSpeed: 6, // Telegraph pulse frequency
    alphaBase: 0.6 // Base alpha for telegraph visuals
});

// ============================================================================
// THREAT INDICATOR CONFIGURATION
// ============================================================================
// Off-screen enemy awareness
// ============================================================================

export const THREAT = Object.freeze({
    // Max indicators shown
    maxIndicators: 8,

    // Edge margins
    edgeMargin: 40,

    // Arrow settings
    arrowSize: 16,
    pulseSpeed: 3,

    // Threat priority scores
    priority: {
        boss: 100,
        champion: 80,
        ranger: 60,
        harpooner: 55,
        minelayer: 50,
        armored: 40,
        skirmisher: 20
    }
});

// ============================================================================
// PROCEDURAL BOSS CONFIGURATION
// ============================================================================
// Boss factory settings
// ============================================================================

export const PROC_BOSS = Object.freeze({
    // Enable procedural bosses (false = use static boss from ENEMIES)
    enabled: true,

    // Difficulty scaling per wave
    difficultyPerWave: 0.1,
    maxDifficulty: 5,

    // Phase timing
    telegraphDurationMin: 0.6,
    telegraphDurationMax: 1.5,
    recoverDuration: 1.0,

    // Weak point settings
    weakPointDamageMultiplier: 2.0,
    weakPointSize: 12
});

// ============================================================================
// CHALLENGE MODES CONFIGURATION
// ============================================================================
// Special game modes with unique modifiers and rewards
// ============================================================================

export const CHALLENGES = Object.freeze({
    // Enable challenge modes feature
    enabled: true,

    // Achievement IDs for challenge completions
    achievements: {
        speedRun: 'speed_demon',
        purist: 'purist_master',
        glassCannon: 'glass_cannon_survivor',
        redLock: 'red_specialist',
        blueLock: 'blue_specialist',
        yellowLock: 'yellow_specialist',
        purpleLock: 'purple_specialist',
        orangeLock: 'orange_specialist'
    },

    // Reward multipliers
    rewards: {
        speedRun: 1.5, // 1.5x scrap
        purist: 2.0, // 2x scrap
        glassCannon: 1.0, // Achievement only
        colorLock: 1.0 // Achievement only
    }
});

// ============================================================================
// COLOR SYNERGY SYSTEM CONFIGURATION
// ============================================================================
// Rewards diverse train compositions with team-up effects between colors
// ============================================================================

export const SYNERGY = Object.freeze({
    // Enable synergy system
    enabled: true,

    // Red + Blue: Frozen targets take bonus Red damage
    redBlue: {
        requiredRed: 2,
        requiredBlue: 2,
        redBonusVsFrozen: 0.25  // +25% damage
    },

    // Blue + Yellow: Yellow pierces freeze enemies
    blueYellow: {
        requiredBlue: 2,
        requiredYellow: 2,
        freezeDuration: 2.0,    // seconds
        freezePercent: 0.8      // 80% slow
    },

    // Red + Yellow: Yellow explosions ignite (DoT)
    redYellow: {
        requiredRed: 2,
        requiredYellow: 2,
        igniteDamagePerSecond: 5,
        igniteDuration: 3.0     // seconds
    },

    // Tri-Force: All 3 colors present
    triForce: {
        requiredRed: 2,
        requiredBlue: 2,
        requiredYellow: 2,
        globalFireRateBonus: 0.15  // +15% fire rate
    }
});

// ============================================================================
// STATION EVENTS CONFIGURATION
// ============================================================================
// 3-lane buff gates that spawn periodically for strategic choice
// ============================================================================

export const STATION_EVENTS = Object.freeze({
    // Enable station events
    enabled: true,

    // Spawn frequency (every N waves)
    spawnEveryNWaves: 8,

    // Spawn distance ahead of train
    spawnDistance: 600,

    // Gate dimensions
    gateWidth: 300, // Total width of all 3 lanes
    laneWidth: 100, // Width of each lane
    laneHeight: 120, // Height of gate passage

    // Approach warning
    approachWarningDistance: 400,
    warningPulseSpeed: 4,

    // Label styling
    labelFontSize: 20,

    // Buff definitions
    buffs: {
        fireRate: {
            value: 0.30, // +30% fire rate
            duration: 20 // seconds
        },
        repair: {
            value: 0.25, // 25% HP restore
            duration: 0 // instant (no duration)
        },
        speed: {
            value: 0.25, // +25% speed
            duration: 20 // seconds
        }
    }
});

// ============================================================================
// GHOST REPLAY CONFIGURATION
// ============================================================================
// Records position trail during runs and displays ghost of previous best run
// ============================================================================

export const GHOST_REPLAY = Object.freeze({
    // Enable ghost recording and playback
    enabled: true,

    // Recording interval (milliseconds)
    recordIntervalMs: 100,

    // Maximum points to store (caps memory usage)
    maxPoints: 120,

    // Visual style
    ghostAlpha: 0.3,        // Transparency (0-1)
    ghostColor: 0x44aaff,   // Light blue
    lineStyle: 'dotted',    // 'dotted' or 'solid'
    lineWidth: 2,

    // Milestone waves for time comparisons
    milestoneWaves: [5, 10, 15, 20, 25, 50, 75, 100],

    // Display settings
    showMilestoneComparisons: true,
    comparisonDisplayDuration: 3.5 // Seconds to show comparison text
});

// ============================================================================
// ACHIEVEMENT POPUP CONFIGURATION
// ============================================================================
// Settings for procedural medal pop-ups when achievements unlock
// ============================================================================

export const ACHIEVEMENT_POPUP = Object.freeze({
    // Position settings
    startX: 1000, // Off-screen right
    endX: 760,    // Final X position (right side of screen)
    yPosition: 80, // Y position from top

    // Animation timings
    slideInDuration: 400,  // ms
    holdDuration: 2000,     // ms
    slideOutDuration: 300,  // ms

    // Medal dimensions
    medalRadius: 32,
    ribbonWidth: 20,
    ribbonHeight: 50,
    starSize: 6,

    // Visual style
    medalShineAlpha: 0.3,
    embossDepth: 2,
    shadowOffset: 3,
    shadowAlpha: 0.5,

    // Depth layering
    depth: 1000,

    // Sound
    playSound: true,
    soundVolume: 0.3
});

// Category -> Ribbon color mapping
export const ACHIEVEMENT_RIBBON_COLORS = Object.freeze({
    combat: 0xff4444,    // Red
    survival: 0x4444ff,  // Blue
    speed: 0xffcc00,     // Yellow
    collection: 0xaa44ff, // Purple
    mastery: 0xff8800,   // Orange
    hidden: 0xffffff     // White
});

// ============================================================================
// COUPLING TENSION CONFIGURATION
// ============================================================================
// Tight turns increase coupling stress, boosting damage but risking HP loss
// ============================================================================

export const COUPLING_TENSION = Object.freeze({
    // Enable coupling tension system
    enabled: true,

    // Tension calculation thresholds (0-100 scale)
    lowThreshold: 30,    // Below this: normal state
    mediumThreshold: 60, // Medium tension: visual feedback
    highThreshold: 85,   // High tension: damage bonus + risk

    // Damage bonus from high tension
    damageBonus: 0.25,   // +25% damage when tension > highThreshold
    bonusDuration: 1.0,  // Bonus lasts 1 second after tension drops

    // HP penalty from sustained high tension
    sustainedDuration: 3.0,  // Time at high tension before penalty
    hpPenaltyPercent: 0.02,  // -2% max HP per second while sustained

    // Visual effect parameters
    glowColor: 0xff8800,     // Orange glow for stressed couplings
    glowAlpha: 0.6,          // Max alpha for glow effect
    stressLineColor: 0xffaa44, // Color for stress lines
    stressLineWidth: 2,      // Width of stress lines
    sparkParticleCount: 3,   // Sparks per coupling at extreme tension
    sparkInterval: 0.3       // Seconds between spark bursts
});


// ============================================================================
// PRESTIGE SYSTEM CONFIGURATION
// ============================================================================
// Meta-progression upgrades purchased with scrap earned from runs
// ============================================================================

export const PRESTIGE = Object.freeze({
    // Enable prestige system
    enabled: true,

    // Scrap formula weights
    scrapPerWave: 10,
    scrapPerKill: 0.5,
    scrapPerMerge: 5,

    // Visual settings
    showScrapOnHUD: false,  // Don't clutter HUD, show in end screen only
    scrapNotificationDuration: 3000,  // ms

    // Balance tuning
    startingCarColors: ['red', 'blue', 'yellow'],  // Pool for starting car upgrades
    pickupFrequencyMax: 0.25,  // Maximum -25% pickup spawn time
    mergeTierBonusMax: 0.50    // Maximum +50% higher tier chance
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
