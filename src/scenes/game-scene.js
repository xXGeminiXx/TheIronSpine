/**
 * game-scene.js - Main gameplay scene
 *
 * This is where the action happens. GameScene orchestrates all gameplay
 * systems: train movement, combat, spawning, merging, and HUD.
 *
 * GAME LOOP (each frame):
 *   1. Process input (pointer position, button presses)
 *   2. Update train (engine steering, car following)
 *   3. Handle tactical inputs (drop car, reorder, overdrive pulse)
 *   4. Update pickups (spawning, collection, drift)
 *   5. Check/execute merges
 *   6. Update combat (enemy AI, projectiles, damage)
 *   7. Update spawner (wave progression, enemy spawning)
 *   8. Update camera (follow train, dynamic zoom)
 *   9. Draw HUD (HP bars, timer, wave info)
 *   10. Check win/lose conditions
 *
 * WIN CONDITION: Clear all 20 waves (configurable in WAVES.totalToWin)
 * LOSE CONDITION: Engine HP reaches 0
 *
 * OVERDRIVE PULSE:
 *   Charges over 40 seconds, then player can trigger a screen-wide damage
 *   burst that hits all enemies. Press E (keyboard) or PULSE button (mobile).
 */

import {
    CAMERA,
    COLORS,
    COLOR_KEYS,
    COMBO,
    CRIT,
    DEV_ASSERTIONS,
    DROP_PROTECTION,
    ENDLESS,
    EFFECTS,
    OVERDRIVE,
    PALETTE,
    PROC_BOSS,
    SEEDING,
    SYNERGY,
    TRAIN,
    WEATHER
} from '../config.js';
import { WorldManager } from '../art/world-gen.js';
import { PickupManager, resetPickupIdCounter } from '../core/pickups.js';
import { MergeManager } from '../core/merge.js';
import { ReorderManager } from '../core/reorder.js';
import { SETTINGS, getUiScale } from '../core/settings.js';
import { getDifficultyModifiers } from '../core/difficulty.js';
import { Train, resetSegmentIdCounter } from '../core/train.js';
import { pickRandom } from '../core/math.js';
import { SeededRandom, SeedManager } from '../core/seeded-random.js';
import { InputController } from '../systems/input.js';
import { Spawner } from '../systems/spawner.js';
import { CombatSystem, resetCombatIdCounters } from '../systems/combat.js';
import { DevConsole } from '../systems/dev-console.js';
import { Hud } from '../systems/hud.js';
import { MobileControls } from '../systems/mobile-controls.js';
import { AudioManager } from '../systems/audio.js';
import { VfxSystem } from '../systems/vfx.js';
import { runBalanceAudit } from '../core/balance-audit.js';
import {
    DropProtection,
    createDeniedFlash,
    createLastCarWarning,
    drawCooldownBar,
    drawHoldProgress
} from '../systems/drop-protection.js';
import {
    EndlessMode,
    createMilestoneCelebration,
    createNewRecordEffect
} from '../systems/endless-mode.js';
import { addPauseOverlay } from '../systems/pause-overlay.js';
import { getAchievementBonuses } from '../systems/achievements.js';
import { getPrestigeBonuses } from '../systems/prestige.js';
import { TelegraphSystem } from '../systems/telegraph.js';
import { ThreatIndicatorSystem } from '../systems/threat-indicator.js';
import { ComboSystem } from '../systems/combo.js';
import { CriticalHitSystem, spawnCritEffect } from '../systems/critical-hits.js';
import { ScreenEffectsSystem } from '../systems/screen-effects.js';
import { WeatherSystem } from '../systems/weather.js';
import { SynergyManager } from '../systems/synergy.js';
import {
    generateBoss,
    spawnBoss,
    updateBoss,
    getBossDamageMultiplier,
    checkWeakPointHit
} from '../systems/boss-gen.js';
import { getChallengeMode } from '../modes/challenge-modes.js';
import { StationEventManager } from '../systems/station-events.js';
import {
    GhostRecorder,
    GhostStorage,
    GhostRenderer,
    createMilestoneComparisonText
} from '../systems/ghost.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create(data) {
        // Reset ID counters for clean run state
        resetSegmentIdCounter();
        resetPickupIdCounter();
        resetCombatIdCounters();

        // v1.6.2 Challenge mode support
        this.challengeMode = null;
        if (data && data.challengeMode) {
            this.challengeMode = getChallengeMode(data.challengeMode);
            if (this.challengeMode) {
                console.log(`[GameScene] Starting challenge mode: ${this.challengeMode.name}`);
            }
        }

        // Initialize seeded RNG for reproducible runs
        if (SEEDING.enabled) {
            if (!this.registry.has('seedManager')) {
                // Create seed manager if it doesn't exist
                this.seedManager = new SeedManager();
                const seed = SEEDING.allowURLSeeds
                    ? this.seedManager.initialize(SEEDING.useDailySeed)
                    : SEEDING.useDailySeed
                        ? SeededRandom.getDailySeed()
                        : SeededRandom.generateSeed();

                this.seedManager.currentSeed = seed;
                this.seedManager.seedType = SEEDING.allowURLSeeds && SeededRandom.getSeedFromURL()
                    ? 'url'
                    : SEEDING.useDailySeed
                        ? 'daily'
                        : 'random';

                this.registry.set('seedManager', this.seedManager);
            } else {
                // Reuse existing seed manager
                this.seedManager = this.registry.get('seedManager');
            }

            // Create RNG instance for this run
            this.rng = new SeededRandom(this.seedManager.getSeed());
            console.log(`[GameScene] Using seed: ${this.seedManager.getSeed()} (${this.seedManager.getSeedType()})`);
        } else {
            // No seeding - use Math.random wrapper
            this.rng = {
                next: () => Math.random(),
                nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
                nextFloat: (min, max) => Math.random() * (max - min) + min,
                choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
                chance: (prob) => Math.random() < prob,
                shuffle: (arr) => {
                    const copy = [...arr];
                    for (let i = copy.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [copy[i], copy[j]] = [copy[j], copy[i]];
                    }
                    return copy;
                },
                getSeed: () => 'RANDOM'
            };
            this.seedManager = null;
        }

        this.runTimeSeconds = 0;
        this.isGameOver = false;
        this.devConsoleUsed = false;
        this.setupBackground();

        // Initialize the parallax world system for visual depth
        // v1.5.3 Pass seeded RNG for deterministic world generation
        this.worldManager = new WorldManager(this, this.rng);

        const startX = 0;
        const startY = 0;

        this.achievementBonuses = getAchievementBonuses();
        this.bonusMultipliers = this.buildBonusMultipliers(this.achievementBonuses);
        this.overdriveChargeRate = this.bonusMultipliers.charge;

        // v1.5.0 Apply difficulty modifiers to player stats
        const difficulty = getDifficultyModifiers(SETTINGS.difficulty);
        const finalHpMultiplier = this.bonusMultipliers.hp * difficulty.playerHp;

        this.train = new Train(this, startX, startY, {
            onCarDestroyed: (car, reason) => this.onCarDestroyed(car, reason),
            onEngineDestroyed: () => this.endRun('defeat'),
            isInvincible: () => SETTINGS.invincible
        });
        this.train.setSpeedMultiplier(this.bonusMultipliers.speed);
        this.train.setHpMultiplier(finalHpMultiplier);

        // Apply prestige starting cars bonus
        this.applyPrestigeStartingCars();

        this.inputController = new InputController(this);
        this.audio = new AudioManager(this);
        this.combatSystem = new CombatSystem(this, this.train, {
            onTrainHit: (segment, result, source) => this.onTrainHit(segment, result, source),
            onEnemyDestroyed: (enemy) => this.onEnemyDestroyed(enemy),
            onWeaponFired: (colorKey, source, tier, segment) => {
                this.audio.playWeapon(colorKey);
                if (segment) {
                    if (typeof this.train.recordWeaponFire === 'function') {
                        this.train.recordWeaponFire(segment);
                    }
                    if (typeof this.train.applyWeaponRecoil === 'function') {
                        this.train.applyWeaponRecoil(segment);
                    }
                }
            },
            onEnemyWeaponFired: () => this.audio.playEnemyShot()
        });
        this.combatSystem.setBonusMultipliers(this.bonusMultipliers);
        this.pickupManager = new PickupManager(this, {
            onPickupCollected: (pickup) => this.onPickupCollected(pickup)
        });
        this.endlessMode = new EndlessMode({
            config: {
                ...ENDLESS,
                enabled: SETTINGS.endlessMode
            },
            onMilestone: (wave, message) => {
                createMilestoneCelebration(this, wave, message);
            },
            onNewRecord: (wave) => {
                createNewRecordEffect(this, wave);
            }
        });
        // v1.5.0 Pass difficulty to spawner for modifiers
        // v1.5.3 Pass seeded RNG for reproducible runs
        this.spawner = new Spawner(
            this,
            this.train,
            this.pickupManager,
            this.combatSystem,
            this.endlessMode,
            SETTINGS.difficulty,
            this.rng
        );
        this.mergeManager = new MergeManager(this, this.train, {
            onMergeCompleted: (...args) => this.onMergeCompleted(...args)
        });
        this.reorderManager = new ReorderManager(this.train, {
            canReorder: () => !this.mergeManager.isBusy()
        });
        this.hud = new Hud(this, this.train, this.combatSystem);
        this.vfxSystem = new VfxSystem(this);
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(200);
        this.rangeArcGraphics = this.add.graphics();
        this.rangeArcGraphics.setDepth(9);
        this.isMobileTarget = this.sys.game.device.input.touch
            && !this.sys.game.device.os.desktop;

        if (!this.isMobileTarget) {
            this.devConsole = new DevConsole(
                this,
                this.train,
                this.spawner,
                this.combatSystem,
                this.pickupManager,
                {
                    onWin: () => this.endRun('victory'),
                    onUsed: () => {
                        this.devConsoleUsed = true;
                    }
                }
            );
        } else {
            this.devConsole = null;
        }

        if (this.isMobileTarget) {
            this.mobileControls = new MobileControls(this, this.inputController);
        } else {
            this.mobileControls = null;
        }

        this.pauseOverlay = addPauseOverlay(this);
        this.dropProtection = new DropProtection(this, {
            onDropDenied: (reason) => this.handleDropDenied(reason),
            onLastCarWarning: () => this.handleLastCarWarning(),
            onCooldownActive: (remaining, total) => {
                this.dropCooldownRemaining = remaining;
                this.dropCooldownTotal = total;
            },
            config: DROP_PROTECTION
        });
        this.dropCooldownRemaining = 0;
        this.dropCooldownTotal = 0;
        this.dropCooldownGraphics = this.add.graphics().setScrollFactor(0).setDepth(150);
        this.dropHoldGraphics = this.add.graphics().setScrollFactor(0).setDepth(151);
        this.awaitingDropHold = false;
        this.pendingReorder = false;
        this.lastDropWarningAt = 0;
        this.lastDropDeniedAt = 0;

        this.overdriveState = {
            charge: 0,
            ready: false
        };

        if (DEV_ASSERTIONS) {
            runBalanceAudit({ difficulty: SETTINGS.difficulty });
        }

        // v1.4.0 NEW SYSTEMS
        this.telegraph = new TelegraphSystem(this);
        this.threatIndicators = new ThreatIndicatorSystem(this);
        this.screenEffects = new ScreenEffectsSystem(this);

        // v1.5.0 Apply difficulty modifier to combo window
        const difficultyMods = getDifficultyModifiers(SETTINGS.difficulty);
        const modifiedComboWindow = COMBO.comboWindow * difficultyMods.comboWindow;

        this.combo = new ComboSystem({
            onComboGain: (count, multiplier) => {
                // Visual feedback for combo gains
                if (count >= 5 && this.hud && typeof this.hud.showComboGain === 'function') {
                    this.hud.showComboGain(count, multiplier);
                }
            },
            onComboLost: () => {
                // Combo lost - no action needed, HUD will update automatically
            },
            onMilestone: (kills, label) => {
                this.showComboMilestone(label);
            }
        }, modifiedComboWindow);

        this.critSystem = new CriticalHitSystem();

        if (WEATHER.enabled) {
            this.weather = new WeatherSystem(this);
        }

        // Station events system
        this.stationEvents = new StationEventManager(this, this.train, {
            onBuffApplied: (buff) => this.onStationBuffApplied(buff)
        });

        // Ghost replay system (v1.6.1)
        if (SETTINGS.ghostReplay) {
            // Initialize ghost recorder for current run
            const seed = this.seedManager ? this.seedManager.getSeed() : 'RANDOM';
            this.ghostRecorder = new GhostRecorder(seed, SETTINGS.difficulty);
            this.ghostStartTime = Date.now();

            // Load and display previous best ghost (if exists)
            const ghostData = GhostStorage.load();
            if (ghostData) {
                this.ghostRenderer = new GhostRenderer(this, ghostData);
                this.ghostRenderer.start(this.ghostStartTime);
            } else {
                this.ghostRenderer = null;
            }
        } else {
            this.ghostRecorder = null;
            this.ghostRenderer = null;
            this.ghostStartTime = 0;
        }

        this.lastGridSetting = SETTINGS.showGrid;

        // v1.6.2 Apply challenge mode modifiers
        if (this.challengeMode) {
            this.challengeMode.applyModifiers(this);
        }

        this.createInitialCar();
        this.setupCamera();
        this.applyUiScale();

        this.input.once('pointerdown', () => this.audio.unlock());
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown', () => this.audio.unlock());
        }

        this.events.on('shutdown', this.cleanup, this);
    }

    cleanup() {
        this.inputController.destroy();
        this.hud.destroy();
        this.vfxSystem.destroy();
        this.audio.destroy();
        if (this.worldManager) {
            this.worldManager.destroy();
        }
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
        }
        if (this.dropCooldownGraphics) {
            this.dropCooldownGraphics.destroy();
        }
        if (this.dropHoldGraphics) {
            this.dropHoldGraphics.destroy();
        }
        if (this.rangeArcGraphics) {
            this.rangeArcGraphics.destroy();
        }
        if (this.devConsole) {
            this.devConsole.destroy();
        }
        if (this.mobileControls) {
            this.mobileControls.destroy();
        }
        // v1.4.0 new systems cleanup
        if (this.telegraph) {
            this.telegraph.clear();
        }
        if (this.threatIndicators) {
            this.threatIndicators.clear();
        }
        if (this.screenEffects) {
            this.screenEffects.destroy();
        }
        if (this.combo) {
            this.combo.clear();
        }
        if (this.critSystem) {
            this.critSystem.clear();
        }
        if (this.weather) {
            this.weather.destroy();
        }
        if (this.stationEvents) {
            this.stationEvents.destroy();
        }
        // v1.6.1 Ghost system cleanup
        if (this.ghostRenderer) {
            this.ghostRenderer.destroy();
        }
    }

    update(time, delta) {
        if (this.isGameOver) {
            return;
        }
        if (this.pauseOverlay && this.pauseOverlay.isPaused()) {
            this.audio.updateEngine(0, false);
            return;
        }

        const deltaSeconds = delta / 1000;
        this.runTimeSeconds += deltaSeconds;

        this.inputController.update();

        const inputState = {
            targetX: this.inputController.targetX,
            targetY: this.inputController.targetY,
            boostRequested: this.inputController.consumeBoostRequest()
        };

        const previousBoost = this.train.boostRemaining;
        this.train.update(deltaSeconds, inputState);
        if (this.train.boostRemaining > previousBoost) {
            this.audio.playBoost();
        }

        // v1.5.2 Apply headlight vacuum effect
        if (typeof this.train.applyHeadlightVacuum === 'function') {
            this.train.applyHeadlightVacuum(this.pickupManager, this.combatSystem, deltaSeconds);
        }

        this.audio.updateEngine(
            this.train.currentSpeed / TRAIN.engineSpeed,
            this.train.boostRemaining > 0
        );
        this.handleTacticalInputs();
        this.pickupManager.update(deltaSeconds, this.train.engine, this.train.getWeaponCars());
        this.mergeManager.update(deltaSeconds);
        if (this.pendingReorder && !this.mergeManager.isBusy()) {
            this.pendingReorder = false;
            this.attemptReorder();
        }
        this.combatSystem.update(deltaSeconds);
        this.spawner.update(deltaSeconds);
        this.updateOverdrive(deltaSeconds);
        this.updateDropProtectionUi();

        // v1.4.0 new systems update
        if (this.telegraph) {
            this.telegraph.update(deltaSeconds);
        }
        if (this.threatIndicators) {
            this.threatIndicators.update(this.combatSystem.enemies, this.cameras.main);
        }
        if (this.combo) {
            this.combo.update(deltaSeconds);
        }
        if (this.weather) {
            this.weather.update(deltaSeconds, this.cameras.main);
        }
        if (this.stationEvents) {
            this.stationEvents.update(deltaSeconds);
        }
        // v1.6.1 Ghost system update
        if (this.ghostRecorder) {
            const currentTime = Date.now();
            const waveStatus = this.spawner.getWaveStatus();
            this.ghostRecorder.record(
                currentTime,
                this.train.engine.x,
                this.train.engine.y,
                waveStatus.number
            );
        }
        if (this.ghostRenderer) {
            const currentTime = Date.now();
            const waveStatus = this.spawner.getWaveStatus();
            const comparison = this.ghostRenderer.update(currentTime, waveStatus.number);
            // Show milestone comparison if we hit one
            if (comparison && !this.lastMilestoneWave) {
                createMilestoneComparisonText(this, comparison.delta);
                this.lastMilestoneWave = comparison.wave;
            }
            // Reset milestone tracker on wave change
            if (this.lastMilestoneWave && this.lastMilestoneWave !== waveStatus.number) {
                this.lastMilestoneWave = null;
            }
        }
        if (this.screenEffects) {
            const hpPercent = this.train.engine.hp / this.train.engine.maxHp;
            const comboMultiplier = this.combo ? this.combo.getMultiplier() : 1.0;
            this.screenEffects.update({
                hpPercent,
                comboMultiplier,
                deltaSeconds
            });
        }
        this.vfxSystem.update(deltaSeconds);
        const heatIntensity = typeof this.train.getHeatIntensity === 'function'
            ? this.train.getHeatIntensity()
            : (this.train.heatIntensity || 0);
        if (typeof this.vfxSystem.updateEngineSmoke === 'function') {
            this.vfxSystem.updateEngineSmoke(this.train.engine, deltaSeconds, heatIntensity);
        }
        if (typeof this.vfxSystem.updateCarDamageEffects === 'function') {
            this.vfxSystem.updateCarDamageEffects(this.train.getWeaponCars(), deltaSeconds);
        }

        this.updateCamera(deltaSeconds);
        this.worldManager.update(deltaSeconds, this.cameras.main);
        this.applyUiScale();
        this.updateGridVisibility();
        if (this.spawner.isVictoryReady()) {
            this.endRun('victory');
            return;
        }
        const engineWeaponState = this.combatSystem.getEngineWeaponState();
        this.train.setEngineAccentColor(engineWeaponState ? engineWeaponState.colorKey : null);
        this.hud.update(
            this.runTimeSeconds,
            this.spawner.getWaveStatus(),
            deltaSeconds,
            this.overdriveState,
            engineWeaponState
        );
        this.updateRangeArcs();
        this.drawDebugHitboxes();
    }

    setupBackground() {
        const { width, height } = this.scale;
        const backgroundColor = Phaser.Display.Color.HexStringToColor(PALETTE.background).color;
        const groundColor = Phaser.Display.Color.HexStringToColor(PALETTE.ground).color;

        this.background = this.add.rectangle(0, 0, width, height, backgroundColor)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        if (!this.textures.exists('ground-pattern')) {
            const patternGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            patternGraphics.fillStyle(groundColor, 1);
            patternGraphics.fillRect(0, 0, 64, 64);
            patternGraphics.lineStyle(1, 0x1f2a44, 0.8);
            patternGraphics.strokeRect(0, 0, 64, 64);
            patternGraphics.strokeLineShape(new Phaser.Geom.Line(0, 32, 64, 32));
            patternGraphics.strokeLineShape(new Phaser.Geom.Line(32, 0, 32, 64));
            patternGraphics.generateTexture('ground-pattern', 64, 64);
            patternGraphics.destroy();
        }

        this.ground = this.add.tileSprite(0, 0, width, height, 'ground-pattern')
            .setOrigin(0, 0)
            .setScrollFactor(0);
        // Lower alpha so the train reads cleanly over the pattern.
        this.ground.setAlpha(SETTINGS.showGrid ? 0.45 : 0);
    }

    setupCamera() {
        const camera = this.cameras.main;
        camera.setZoom(CAMERA.baseZoom);
        camera.centerOn(this.train.engine.x, this.train.engine.y);
        camera.roundPixels = false;
    }

    updateCamera(deltaSeconds) {
        const camera = this.cameras.main;
        const lookAhead = this.train.getCameraLookAhead();
        const targetX = this.train.engine.x + lookAhead.x;
        const targetY = this.train.engine.y + lookAhead.y;

        const currentCenterX = camera.midPoint.x;
        const currentCenterY = camera.midPoint.y;

        const lerpFactor = 1 - Math.exp(-CAMERA.followSmoothing * deltaSeconds);
        camera.scrollX += (targetX - currentCenterX) * lerpFactor;
        camera.scrollY += (targetY - currentCenterY) * lerpFactor;

        const zoomTarget = this.getZoomTarget();
        const zoomLerp = 1 - Math.exp(-CAMERA.zoomSmoothing * deltaSeconds);
        camera.zoom = Phaser.Math.Linear(camera.zoom, zoomTarget, zoomLerp);

        // Keep the grid locked to world space so the train doesn't appear to drift off it.
        this.ground.tilePositionX = camera.scrollX;
        this.ground.tilePositionY = camera.scrollY;
    }

    applyUiScale() {
        const camera = this.cameras.main;
        const baseScale = camera.zoom > 0 ? 1 / camera.zoom : 1;
        const uiScale = baseScale * getUiScale();
        this.hud.setUiScale(uiScale);
        if (this.devConsole) {
            this.devConsole.setUiScale(uiScale);
        }
        if (this.mobileControls) {
            this.mobileControls.setUiScale(uiScale);
        }
    }

    getZoomTarget() {
        const carCount = this.train.getWeaponCars().length;
        if (carCount >= 12) {
            return CAMERA.maxZoomOut;
        }
        if (carCount >= 10) {
            return CAMERA.zoomAtTenCars;
        }
        if (carCount >= 6) {
            return CAMERA.zoomAtSixCars;
        }
        return CAMERA.baseZoom;
    }

    createInitialCar() {
        const bonusCars = Math.max(0, Math.floor(this.achievementBonuses.starting_car || 0));
        const totalCars = Math.min(TRAIN.maxCars, 1 + bonusCars);
        for (let i = 0; i < totalCars; i += 1) {
            const colorKey = pickRandom(COLOR_KEYS);
            this.train.addCar(colorKey, 1);
        }
    }

    onPickupCollected(pickup) {
        this.train.addCar(pickup.colorKey, 1);
    }

    onCarDestroyed(car, reason) {
        if (reason === 'damage') {
            const explosionDamage = EFFECTS.carExplosionDamage * this.bonusMultipliers.damage;
            this.combatSystem.applyExplosionDamage(
                { x: car.x, y: car.y },
                EFFECTS.carExplosionRadius,
                explosionDamage
            );
            this.vfxSystem.spawnExplosion({ x: car.x, y: car.y });
            this.applyScreenShake(120, CAMERA.shakeMedium);
            this.audio.playExplosion();
        }
    }

    onMergeCompleted(colorKey, colorHex, position) {
        this.hud.triggerMergeFlash();
        this.applyScreenShake(120, CAMERA.shakeHeavy);
        if (position) {
            this.vfxSystem.spawnMergeBurst(position, colorHex);
        }
        this.audio.playMerge();
    }

    onTrainHit(segment, result, source) {
        this.applyScreenShake(80, CAMERA.shakeLight);
        this.audio.playHit();
        if (source && this.hud && typeof this.hud.triggerDamagePing === 'function') {
            this.hud.triggerDamagePing(source.x, source.y, source.color);
        }
    }

    onEnemyDestroyed(enemy) {
        if (enemy) {
            this.vfxSystem.spawnEnemyPop({ x: enemy.x, y: enemy.y }, enemy.trim || PALETTE.uiText);
        }
        // v1.4.0 Register kill with combo system
        if (this.combo) {
            this.combo.onKill();
        }
    }

    onStationBuffApplied(buff) {
        // Buff applied notification - HUD will display this
        if (this.hud && typeof this.hud.showStationBuff === 'function') {
            this.hud.showStationBuff(buff);
        }

        // Visual feedback: screen flash
        this.applyScreenShake(100, CAMERA.shakeLight);
    }

    showComboMilestone(label) {
        if (!label) {
            return;
        }

        const text = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            label,
            {
                fontSize: '72px',
                fontFamily: 'Trebuchet MS, Arial, sans-serif',
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 8,
                fontStyle: 'bold'
            }
        );
        text.setOrigin(0.5);
        text.setScrollFactor(0);
        text.setDepth(150);
        text.setAlpha(0);

        this.audio.playMerge(); // Reuse merge sound for milestone

        // Animate in and out
        this.tweens.add({
            targets: text,
            alpha: 1,
            scale: { from: 0.5, to: 1.2 },
            duration: 300,
            ease: 'Back.easeOut',
            yoyo: false,
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    scale: 1.5,
                    y: text.y - 100,
                    duration: 1200,
                    ease: 'Cubic.easeOut',
                    onComplete: () => text.destroy()
                });
            }
        });
    }

    attemptReorder() {
        const reordered = this.reorderManager.requestReorder();
        if (reordered) {
            this.audio.playReorder();
        }
        return reordered;
    }

    handleTacticalInputs() {
        const dropRequested = this.inputController.consumeDropRequest();
        const isHoldingDrop = this.inputController.isDropHeld();
        if (dropRequested || (this.awaitingDropHold && isHoldingDrop)) {
            this.tryDropTail(isHoldingDrop);
        } else if (!isHoldingDrop) {
            this.awaitingDropHold = false;
        }

        if (this.inputController.consumeReorderRequest()) {
            if (this.mergeManager.isBusy()) {
                this.pendingReorder = true;
            } else {
                this.pendingReorder = false;
                this.attemptReorder();
            }
        }

        if (this.inputController.consumePulseRequest()) {
            this.tryActivateOverdrive();
        }
    }

    tryDropTail(isHoldingDrop) {
        const carCount = this.train.getWeaponCars().length;
        if (carCount === 0) {
            this.awaitingDropHold = false;
            return;
        }

        const canDrop = this.dropProtection
            ? this.dropProtection.canDrop(carCount, isHoldingDrop)
            : true;

        if (!canDrop) {
            this.awaitingDropHold = isHoldingDrop;
            return;
        }

        const dropped = this.train.jettisonTail();
        if (dropped && this.dropProtection) {
            this.dropProtection.recordDrop();
        }
        this.awaitingDropHold = false;
    }

    handleDropDenied(reason) {
        const now = this.time.now || 0;
        if (now - this.lastDropDeniedAt < 200) {
            return;
        }
        this.lastDropDeniedAt = now;
        createDeniedFlash(this, reason);
    }

    handleLastCarWarning() {
        const now = this.time.now || 0;
        if (now - this.lastDropWarningAt < 900) {
            return;
        }
        this.lastDropWarningAt = now;
        createLastCarWarning(this);
    }

    updateDropProtectionUi() {
        if (!this.dropProtection) {
            return;
        }

        const state = this.dropProtection.getState();
        drawCooldownBar(
            this,
            state.cooldownRemaining,
            state.currentCooldown,
            this.dropCooldownGraphics
        );

        if (state.holdProgress > 0) {
            const { width, height } = this.scale;
            drawHoldProgress(
                this,
                state.holdProgress,
                width * 0.5,
                height * 0.82,
                this.dropHoldGraphics
            );
        } else {
            this.dropHoldGraphics.clear();
        }
    }

    updateOverdrive(deltaSeconds) {
        if (this.overdriveState.ready) {
            return;
        }

        this.overdriveState.charge = Math.min(
            OVERDRIVE.chargeSeconds,
            this.overdriveState.charge + deltaSeconds * this.overdriveChargeRate
        );
        this.overdriveState.ready = this.overdriveState.charge >= OVERDRIVE.chargeSeconds;
    }

    tryActivateOverdrive() {
        if (!this.overdriveState.ready) {
            return;
        }

        const pulseDamage = OVERDRIVE.pulseDamage * this.bonusMultipliers.damage;
        this.combatSystem.applyPulseDamage(pulseDamage);
        this.spawnPulseFlash();
        this.vfxSystem.spawnPulseRing({
            x: this.scale.width * 0.5,
            y: this.scale.height * 0.5
        });
        this.applyScreenShake(160, CAMERA.shakeHeavy);
        this.audio.playPulse();

        this.overdriveState.charge = 0;
        this.overdriveState.ready = false;
    }

    spawnPulseFlash() {
        const { width, height } = this.scale;
        const flash = this.add.rectangle(
            width * 0.5,
            height * 0.5,
            width,
            height,
            Phaser.Display.Color.HexStringToColor(PALETTE.warning).color,
            0.22
        );
        flash.setScrollFactor(0);
        flash.setDepth(150);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: OVERDRIVE.flashDuration * 1000,
            onComplete: () => flash.destroy()
        });
    }

    drawDebugHitboxes() {
        if (!this.debugGraphics) {
            return;
        }

        if (!SETTINGS.showHitboxes) {
            this.debugGraphics.clear();
            return;
        }

        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(1, 0x00ff00, 0.8);
        for (const segment of this.train.getAllSegments()) {
            this.debugGraphics.strokeCircle(segment.x, segment.y, segment.radius);
        }

        this.debugGraphics.lineStyle(1, 0xff0000, 0.8);
        for (const enemy of this.combatSystem.enemies) {
            this.debugGraphics.strokeCircle(enemy.x, enemy.y, enemy.radius);
        }

        this.debugGraphics.lineStyle(1, 0x00ccff, 0.8);
        for (const pickup of this.pickupManager.pickups) {
            this.debugGraphics.strokeCircle(pickup.x, pickup.y, pickup.radius);
        }
    }

    applyScreenShake(durationMs, intensity) {
        if (!SETTINGS.screenShake) {
            return;
        }
        this.cameras.main.shake(durationMs, intensity);
    }

    updateGridVisibility() {
        if (this.lastGridSetting === SETTINGS.showGrid) {
            return;
        }
        this.lastGridSetting = SETTINGS.showGrid;
        this.ground.setAlpha(SETTINGS.showGrid ? 0.45 : 0);
    }

    updateRangeArcs() {
        if (!this.rangeArcGraphics) {
            return;
        }

        if (!SETTINGS.showRangeArcs) {
            this.rangeArcGraphics.clear();
            return;
        }

        this.rangeArcGraphics.clear();
        const cars = this.train.getWeaponCars();
        for (const car of cars) {
            const stats = this.combatSystem.getWeaponStatsForTier(car.colorKey, car.tier);
            const color = COLORS[car.colorKey].phaser;
            this.rangeArcGraphics.lineStyle(1, color, 0.18);
            this.rangeArcGraphics.strokeCircle(car.x, car.y, stats.range);
        }
    }

    buildBonusMultipliers(bonuses) {
        const safeBonus = bonuses || {};
        const toMultiplier = (value) => 1 + Math.max(0, value || 0) / 100;

        // Get prestige bonuses and combine with achievement bonuses
        const prestigeBonuses = getPrestigeBonuses();

        // Prestige bonuses are already multipliers, achievements are percentages
        // Apply average of engine and car HP bonuses for overall HP multiplier
        const avgHpMultiplier = (prestigeBonuses.engineHpMultiplier + prestigeBonuses.carHpMultiplier) / 2;

        return {
            damage: toMultiplier(safeBonus.damage_bonus) * prestigeBonuses.damageMultiplier,
            fireRate: toMultiplier(safeBonus.fire_rate_bonus) * prestigeBonuses.fireRateMultiplier,
            range: toMultiplier(safeBonus.range_bonus),
            speed: toMultiplier(safeBonus.speed_bonus),
            hp: toMultiplier(safeBonus.hp_bonus) * avgHpMultiplier,
            charge: toMultiplier(safeBonus.charge_bonus)
        };
    }

    /**
     * Apply prestige starting cars bonus.
     * Adds random colored cars to the train at game start based on prestige upgrades.
     */
    applyPrestigeStartingCars() {
        const prestigeBonuses = getPrestigeBonuses();
        const startingCars = prestigeBonuses.startingCars || 0;

        if (startingCars <= 0) {
            return;
        }

        // Add random cars from the pool
        const colorPool = ['red', 'blue', 'yellow'];  // Match PRESTIGE.startingCarColors
        for (let i = 0; i < startingCars; i++) {
            const randomColor = this.rng.choice(colorPool);
            this.train.addCar(randomColor, 1);
        }

        console.log(`[GameScene] Applied ${startingCars} prestige starting car(s)`);
    }

    endRun(result) {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;
        const waveStatus = this.spawner.getWaveStatus();
        if (result === 'defeat' && this.endlessMode && this.endlessMode.isEnabled()) {
            this.endlessMode.recordDeath(waveStatus.number);
        }
        const stats = {
            timeSurvived: this.hud.formatTime(this.runTimeSeconds),
            wavesCleared: waveStatus.number,
            carsCollected: this.train.stats.carsCollected,
            carsLost: this.train.stats.carsLost,
            mergesCompleted: this.train.stats.mergesCompleted,
            enemiesDestroyed: this.combatSystem.stats.enemiesDestroyed,
            pulseHits: this.combatSystem.stats.pulseHits,
            highestTier: this.train.stats.highestTier,
            finalCarCount: this.train.getWeaponCars().length,
            highestCombo: this.combo ? this.combo.getHighestCombo() : 0, // v1.5.0
            difficulty: SETTINGS.difficulty, // v1.5.0
            endlessMode: this.endlessMode ? this.endlessMode.isEnabled() : SETTINGS.endlessMode,
            devConsoleUsed: this.devConsoleUsed,
            challengeMode: this.challengeMode ? this.challengeMode.id : null // v1.6.2 Challenge mode tracking
        };

        // v1.6.1 Save ghost if this is a new best run
        if (this.ghostRecorder && SETTINGS.ghostReplay) {
            const ghostData = this.ghostRecorder.finalize(
                waveStatus.number,
                this.runTimeSeconds
            );
            const saved = GhostStorage.save(ghostData);
            if (saved) {
                console.log(`[Ghost] New best run saved: Wave ${waveStatus.number}`);
            }
        }

        this.scene.start('EndScene', { result, stats });
    }
}
