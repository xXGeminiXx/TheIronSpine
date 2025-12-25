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
    COLOR_KEYS,
    DROP_PROTECTION,
    ENDLESS,
    EFFECTS,
    OVERDRIVE,
    PALETTE,
    TRAIN
} from '../config.js';
import { WorldManager } from '../art/world-gen.js';
import { PickupManager, resetPickupIdCounter } from '../core/pickups.js';
import { MergeManager } from '../core/merge.js';
import { ReorderManager } from '../core/reorder.js';
import { SETTINGS, getUiScale } from '../core/settings.js';
import { Train, resetSegmentIdCounter } from '../core/train.js';
import { pickRandom } from '../core/math.js';
import { InputController } from '../systems/input.js';
import { Spawner } from '../systems/spawner.js';
import { CombatSystem, resetCombatIdCounters } from '../systems/combat.js';
import { DevConsole } from '../systems/dev-console.js';
import { Hud } from '../systems/hud.js';
import { MobileControls } from '../systems/mobile-controls.js';
import { AudioManager } from '../systems/audio.js';
import { VfxSystem } from '../systems/vfx.js';
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

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Reset ID counters for clean run state
        resetSegmentIdCounter();
        resetPickupIdCounter();
        resetCombatIdCounters();

        this.runTimeSeconds = 0;
        this.isGameOver = false;
        this.setupBackground();

        // Initialize the parallax world system for visual depth
        this.worldManager = new WorldManager(this);

        const startX = 0;
        const startY = 0;

        this.achievementBonuses = getAchievementBonuses();
        this.bonusMultipliers = this.buildBonusMultipliers(this.achievementBonuses);
        this.overdriveChargeRate = this.bonusMultipliers.charge;

        this.train = new Train(this, startX, startY, {
            onCarDestroyed: (car, reason) => this.onCarDestroyed(car, reason),
            onEngineDestroyed: () => this.endRun('defeat'),
            isInvincible: () => SETTINGS.invincible
        });
        this.train.setSpeedMultiplier(this.bonusMultipliers.speed);
        this.train.setHpMultiplier(this.bonusMultipliers.hp);

        this.inputController = new InputController(this);
        this.audio = new AudioManager(this);
        this.combatSystem = new CombatSystem(this, this.train, {
            onTrainHit: (segment, result, source) => this.onTrainHit(segment, result, source),
            onEnemyDestroyed: (enemy) => this.onEnemyDestroyed(enemy),
            onWeaponFired: (colorKey) => this.audio.playWeapon(colorKey),
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
        this.spawner = new Spawner(
            this,
            this.train,
            this.pickupManager,
            this.combatSystem,
            this.endlessMode
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
                    onWin: () => this.endRun('victory')
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
        this.lastDropWarningAt = 0;
        this.lastDropDeniedAt = 0;

        this.overdriveState = {
            charge: 0,
            ready: false
        };

        this.lastGridSetting = SETTINGS.showGrid;

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
        if (this.devConsole) {
            this.devConsole.destroy();
        }
        if (this.mobileControls) {
            this.mobileControls.destroy();
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
        this.audio.updateEngine(
            this.train.currentSpeed / TRAIN.engineSpeed,
            this.train.boostRemaining > 0
        );
        this.handleTacticalInputs();
        this.pickupManager.update(deltaSeconds, this.train.engine);
        this.mergeManager.update(deltaSeconds);
        this.combatSystem.update(deltaSeconds);
        this.spawner.update(deltaSeconds);
        this.updateOverdrive(deltaSeconds);
        this.updateDropProtectionUi();
        this.vfxSystem.update(deltaSeconds);
        this.vfxSystem.updateEngineSmoke(this.train.engine, deltaSeconds);

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
        if (source && this.hud) {
            this.hud.triggerDamagePing(source.x, source.y, source.color);
        }
    }

    onEnemyDestroyed(enemy) {
        if (enemy) {
            this.vfxSystem.spawnEnemyPop({ x: enemy.x, y: enemy.y }, enemy.trim || PALETTE.uiText);
        }
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
            const reordered = this.reorderManager.requestReorder();
            if (reordered) {
                this.audio.playReorder();
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

    buildBonusMultipliers(bonuses) {
        const safeBonus = bonuses || {};
        const toMultiplier = (value) => 1 + Math.max(0, value || 0) / 100;

        return {
            damage: toMultiplier(safeBonus.damage_bonus),
            fireRate: toMultiplier(safeBonus.fire_rate_bonus),
            range: toMultiplier(safeBonus.range_bonus),
            speed: toMultiplier(safeBonus.speed_bonus),
            hp: toMultiplier(safeBonus.hp_bonus),
            charge: toMultiplier(safeBonus.charge_bonus)
        };
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
            finalCarCount: this.train.getWeaponCars().length
        };

        this.scene.start('EndScene', { result, stats });
    }
}
