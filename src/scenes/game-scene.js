/**
 * game-scene.js - Main gameplay scene
 *
 * This is where the action happens. GameScene orchestrates all gameplay
 * systems: train movement, combat, spawning, merging, and HUD.
 *
 * GAME LOOP (each frame):
 *   1. Process input (pointer position, button presses)
 *   2. Update train (engine steering, car following)
 *   3. Handle tactical inputs (drop car, overdrive pulse)
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
    EFFECTS,
    OVERDRIVE,
    PALETTE
} from '../config.js';
import { PickupManager, resetPickupIdCounter } from '../core/pickups.js';
import { MergeManager } from '../core/merge.js';
import { SETTINGS } from '../core/settings.js';
import { Train, resetSegmentIdCounter } from '../core/train.js';
import { pickRandom } from '../core/math.js';
import { InputController } from '../systems/input.js';
import { Spawner } from '../systems/spawner.js';
import { CombatSystem, resetCombatIdCounters } from '../systems/combat.js';
import { DevConsole } from '../systems/dev-console.js';
import { Hud } from '../systems/hud.js';
import { MobileControls } from '../systems/mobile-controls.js';

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

        const startX = 0;
        const startY = 0;

        this.train = new Train(this, startX, startY, {
            onCarDestroyed: (car, reason) => this.onCarDestroyed(car, reason),
            onEngineDestroyed: () => this.endRun('defeat'),
            isInvincible: () => SETTINGS.invincible
        });

        this.inputController = new InputController(this);
        this.combatSystem = new CombatSystem(this, this.train, {
            onTrainHit: (segment) => this.onTrainHit(segment),
            onEnemyDestroyed: () => this.onEnemyDestroyed()
        });
        this.pickupManager = new PickupManager(this, {
            onPickupCollected: (pickup) => this.onPickupCollected(pickup)
        });
        this.spawner = new Spawner(this, this.train, this.pickupManager, this.combatSystem);
        this.mergeManager = new MergeManager(this, this.train, {
            onMergeCompleted: () => this.onMergeCompleted()
        });
        this.hud = new Hud(this, this.train, this.combatSystem);
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

        this.overdriveState = {
            charge: 0,
            ready: false
        };

        this.lastGridSetting = SETTINGS.showGrid;

        this.createInitialCar();
        this.setupCamera();
        this.applyUiScale();

        this.events.on('shutdown', this.cleanup, this);
    }

    cleanup() {
        this.inputController.destroy();
        this.hud.destroy();
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

        const deltaSeconds = delta / 1000;
        this.runTimeSeconds += deltaSeconds;

        this.inputController.update();

        const inputState = {
            targetX: this.inputController.targetX,
            targetY: this.inputController.targetY,
            boostRequested: this.inputController.consumeBoostRequest()
        };

        this.train.update(deltaSeconds, inputState);
        this.handleTacticalInputs();
        this.pickupManager.update(deltaSeconds, this.train.engine);
        this.mergeManager.update(deltaSeconds);
        this.combatSystem.update(deltaSeconds);
        this.spawner.update(deltaSeconds);
        this.updateOverdrive(deltaSeconds);

        this.updateCamera(deltaSeconds);
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
        const uiScale = camera.zoom > 0 ? 1 / camera.zoom : 1;
        this.hud.setUiScale(uiScale);
        if (this.devConsole) {
            this.devConsole.setUiScale(uiScale);
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
        const colorKey = pickRandom(COLOR_KEYS);
        this.train.addCar(colorKey, 1);
    }

    onPickupCollected(pickup) {
        this.train.addCar(pickup.colorKey, 1);
    }

    onCarDestroyed(car, reason) {
        if (reason === 'damage') {
            this.combatSystem.applyExplosionDamage(
                { x: car.x, y: car.y },
                EFFECTS.carExplosionRadius,
                EFFECTS.carExplosionDamage
            );
            this.spawnExplosionEffect(car.x, car.y);
            this.applyScreenShake(120, CAMERA.shakeMedium);
        }
    }

    onMergeCompleted() {
        this.hud.triggerMergeFlash();
        this.applyScreenShake(120, CAMERA.shakeHeavy);
    }

    onTrainHit() {
        this.applyScreenShake(80, CAMERA.shakeLight);
    }

    onEnemyDestroyed() {
        // Reserved for future enemy death effects.
    }

    handleTacticalInputs() {
        if (this.inputController.consumeDropRequest()) {
            this.train.jettisonTail();
        }

        if (this.inputController.consumePulseRequest()) {
            this.tryActivateOverdrive();
        }
    }

    updateOverdrive(deltaSeconds) {
        if (this.overdriveState.ready) {
            return;
        }

        this.overdriveState.charge = Math.min(
            OVERDRIVE.chargeSeconds,
            this.overdriveState.charge + deltaSeconds
        );
        this.overdriveState.ready = this.overdriveState.charge >= OVERDRIVE.chargeSeconds;
    }

    tryActivateOverdrive() {
        if (!this.overdriveState.ready) {
            return;
        }

        this.combatSystem.applyPulseDamage(OVERDRIVE.pulseDamage);
        this.spawnPulseFlash();
        this.applyScreenShake(160, CAMERA.shakeHeavy);

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

    spawnExplosionEffect(x, y) {
        const flash = this.add.circle(
            x,
            y,
            10,
            Phaser.Display.Color.HexStringToColor(PALETTE.warning).color,
            0.8
        );
        flash.setDepth(25);

        this.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 250,
            onComplete: () => flash.destroy()
        });
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

    endRun(result) {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;
        const stats = {
            timeSurvived: this.hud.formatTime(this.runTimeSeconds),
            wavesCleared: this.spawner.getWaveStatus().number,
            carsCollected: this.train.stats.carsCollected,
            carsLost: this.train.stats.carsLost,
            mergesCompleted: this.train.stats.mergesCompleted,
            enemiesDestroyed: this.combatSystem.stats.enemiesDestroyed,
            highestTier: this.train.stats.highestTier
        };

        this.scene.start('EndScene', { result, stats });
    }
}
