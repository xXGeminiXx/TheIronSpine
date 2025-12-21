import { BUILD, COLORS, PALETTE, UI, OVERDRIVE, RENDER } from '../config.js';
import { SETTINGS } from '../core/settings.js';

const HUD_DEPTH = 100;

export class Hud {
    constructor(scene, train, combatSystem) {
        this.scene = scene;
        this.train = train;
        this.combatSystem = combatSystem;

        this.engineHpGraphics = scene.add.graphics();
        this.engineHpGraphics.setScrollFactor(0);
        this.engineHpGraphics.setDepth(HUD_DEPTH);

        this.hpGraphics = scene.add.graphics();
        this.hpGraphics.setScrollFactor(0);
        this.hpGraphics.setDepth(HUD_DEPTH);

        this.pulseGraphics = scene.add.graphics();
        this.pulseGraphics.setScrollFactor(0);
        this.pulseGraphics.setDepth(HUD_DEPTH);

        this.engineLabel = scene.add.text(0, 0, 'ENGINE', this.getSmallTextStyle());
        this.engineLabel.setResolution(RENDER.textResolution);
        this.engineLabel.setScrollFactor(0);
        this.engineLabel.setDepth(HUD_DEPTH);

        this.engineWeaponText = scene.add.text(0, 0, '', this.getSmallTextStyle());
        this.engineWeaponText.setResolution(RENDER.textResolution);
        this.engineWeaponText.setScrollFactor(0);
        this.engineWeaponText.setDepth(HUD_DEPTH);

        this.timerText = scene.add.text(0, 0, '0:00', this.getBaseTextStyle());
        this.timerText.setResolution(RENDER.textResolution);
        this.timerText.setScrollFactor(0);
        this.timerText.setOrigin(0.5, 0);
        this.timerText.setDepth(HUD_DEPTH);

        this.killText = scene.add.text(0, 0, 'Kills: 0', this.getBaseTextStyle());
        this.killText.setResolution(RENDER.textResolution);
        this.killText.setScrollFactor(0);
        this.killText.setOrigin(1, 0);
        this.killText.setDepth(HUD_DEPTH);

        this.waveText = scene.add.text(
            0,
            0,
            '',
            this.getBaseTextStyle()
        );
        this.waveText.setResolution(RENDER.textResolution);
        this.waveText.setScrollFactor(0);
        this.waveText.setOrigin(0.5, 0);
        this.waveText.setDepth(HUD_DEPTH);

        this.mergeText = scene.add.text(
            0,
            0,
            '',
            {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: PALETTE.warning,
                stroke: PALETTE.uiShadow,
                strokeThickness: 4
            }
        );
        this.mergeText.setResolution(RENDER.textResolution);
        this.mergeText.setScrollFactor(0);
        this.mergeText.setOrigin(0.5, 0.5);
        this.mergeText.setAlpha(0);
        this.mergeText.setDepth(HUD_DEPTH);
        this.mergeFlashTimer = 0;

        this.pulseText = scene.add.text(0, 0, '', this.getSmallTextStyle());
        this.pulseText.setResolution(RENDER.textResolution);
        this.pulseText.setScrollFactor(0);
        this.pulseText.setDepth(HUD_DEPTH);

        this.versionText = scene.add.text(0, 0, BUILD.version, {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText
        });
        this.versionText.setResolution(RENDER.textResolution);
        this.versionText.setScrollFactor(0);
        this.versionText.setDepth(HUD_DEPTH);
        this.versionText.setOrigin(1, 1);

        this.debugText = scene.add.text(
            0,
            0,
            '',
            {
                fontFamily: UI.fontFamily,
                fontSize: '14px',
                color: PALETTE.uiText
            }
        );
        this.debugText.setResolution(RENDER.textResolution);
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(HUD_DEPTH);
        this.debugText.setAlpha(0);

        this.uiScale = 1;
        this.layout();
        this.applyUiScale();

        this.resizeHandler = () => this.layout();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    destroy() {
        this.scene.scale.off('resize', this.resizeHandler);
    }

    layout() {
        const { width, height } = this.scene.scale;
        const padding = UI.hudPadding;
        const scale = this.uiScale || 1;
        // Large left margin to prevent clipping on devices with notches/safe areas
        // Mobile browsers and notches can clip 50+ pixels on the left
        const leftMargin = padding + 50;

        this.engineLabel.setPosition(leftMargin * scale, (padding - 2) * scale);
        this.engineWeaponText.setPosition(leftMargin * scale, (padding + 16) * scale);

        this.engineBar = {
            x: leftMargin + 70,
            y: padding + 2,
            width: 200,
            height: 12
        };
        this.carBar = {
            x: leftMargin,
            y: padding + 36
        };
        this.pulseBar = {
            x: leftMargin,
            y: padding + 58,
            width: 180,
            height: 10
        };
        this.pulseText.setPosition(leftMargin * scale, (padding + 70) * scale);

        this.timerText.setPosition(width * 0.5 * scale, padding * scale);
        this.waveText.setPosition(width * 0.5 * scale, (padding + 22) * scale);
        this.killText.setPosition((width - padding) * scale, padding * scale);
        this.mergeText.setPosition(width * 0.5 * scale, 120 * scale);

        if (this.debugText) {
            this.debugText.setPosition(leftMargin * scale, (height - 80) * scale);
        }
        this.versionText.setPosition(
            width * scale - padding * scale,
            height * scale - padding * scale
        );
    }

    setUiScale(scale) {
        const clamped = Math.max(0.6, Math.min(scale, 1.2));
        if (Math.abs(clamped - this.uiScale) < 0.001) {
            return;
        }
        this.uiScale = clamped;
        this.applyUiScale();
        this.layout();
    }

    applyUiScale() {
        const scale = this.uiScale || 1;
        this.engineHpGraphics.setScale(scale);
        this.hpGraphics.setScale(scale);
        this.pulseGraphics.setScale(scale);
        this.engineLabel.setScale(scale);
        this.engineWeaponText.setScale(scale);
        this.timerText.setScale(scale);
        this.killText.setScale(scale);
        this.waveText.setScale(scale);
        this.mergeText.setScale(scale);
        this.pulseText.setScale(scale);
        this.debugText.setScale(scale);
        this.versionText.setScale(scale);
    }

    update(runTimeSeconds, waveStatus, deltaSeconds, overdriveState, engineWeaponState) {
        this.updateEngineBar();
        this.updateCarBar();
        this.updatePulseMeter(overdriveState);
        this.updateEngineWeaponText(engineWeaponState);
        this.timerText.setText(this.formatTime(runTimeSeconds));
        this.killText.setText(`Kills: ${this.combatSystem.stats.enemiesDestroyed}`);
        this.updateWaveText(waveStatus);
        this.updateMergeFlash(deltaSeconds);
        this.updateDebugOverlay();
    }

    updateEngineBar() {
        const engine = this.train.engine;
        const ratio = engine.hp / engine.maxHp;
        const { x, y, width, height } = this.engineBar;
        const fillWidth = Math.max(0, width * ratio);

        this.engineHpGraphics.clear();
        this.engineHpGraphics.fillStyle(0x1e1e1e, 1);
        this.engineHpGraphics.fillRect(x, y, width, height);
        this.engineHpGraphics.fillStyle(this.getEngineBarColor(ratio), 1);
        this.engineHpGraphics.fillRect(x, y, fillWidth, height);
        this.engineHpGraphics.lineStyle(1, 0x000000, 1);
        this.engineHpGraphics.strokeRect(x, y, width, height);
    }

    updateCarBar() {
        const segments = this.train.getWeaponCars();
        const segmentWidth = 20;
        const segmentHeight = 12;
        const gap = 4;
        const startX = this.carBar.x;
        const startY = this.carBar.y;

        this.hpGraphics.clear();
        let offsetX = startX;
        segments.forEach((segment) => {
            const x = offsetX;
            const y = startY;
            const ratio = segment.hp / segment.maxHp;

            this.hpGraphics.fillStyle(0x2c2c2c, 1);
            this.hpGraphics.fillRect(x, y, segmentWidth, segmentHeight);

            const fillWidth = Math.max(0, segmentWidth * ratio);
            this.hpGraphics.fillStyle(COLORS[segment.colorKey].phaser, 1);
            this.hpGraphics.fillRect(x, y, fillWidth, segmentHeight);

            offsetX += segmentWidth + gap;
        });
    }

    updateWaveText(waveStatus) {
        if (!waveStatus) {
            this.waveText.setText('');
            return;
        }

        if (waveStatus.phase === 'complete') {
            this.waveText.setText('All waves cleared');
            this.waveText.setColor(PALETTE.warning);
            return;
        }

        if (waveStatus.phase === 'waiting') {
            const nextWave = Math.min(waveStatus.number + 1, waveStatus.total);
            const remaining = Math.max(0, waveStatus.nextWaveIn);
            this.waveText.setText(`Wave ${nextWave}/${waveStatus.total} in ${remaining.toFixed(1)}s`);
            this.waveText.setColor(PALETTE.uiText);
            return;
        }

        let suffix = '';
        if (waveStatus.eliteType === 'boss') {
            suffix = ' - Boss';
        } else if (waveStatus.eliteType === 'champion') {
            suffix = ' - Champion';
        }

        this.waveText.setText(`Wave ${waveStatus.number}/${waveStatus.total}${suffix}`);
        this.waveText.setColor(suffix ? PALETTE.warning : PALETTE.uiText);
    }

    triggerMergeFlash() {
        this.mergeFlashTimer = 0.6;
        this.mergeText.setText('MERGED!');
        this.mergeText.setAlpha(1);
    }

    updateMergeFlash(deltaSeconds) {
        if (this.mergeFlashTimer <= 0) {
            return;
        }

        this.mergeFlashTimer = Math.max(0, this.mergeFlashTimer - deltaSeconds);
        const alpha = this.mergeFlashTimer / 0.6;
        this.mergeText.setAlpha(alpha);
        if (this.mergeFlashTimer === 0) {
            this.mergeText.setText('');
        }
    }

    updateDebugOverlay() {
        if (!this.debugText || !SETTINGS.debugOverlay) {
            if (this.debugText) {
                this.debugText.setAlpha(0);
            }
            return;
        }

        this.debugText.setAlpha(1);
        const fps = Math.round(this.scene.game.loop.actualFps);
        const cars = this.train.getWeaponCars().length;
        const enemies = this.combatSystem.enemies.length;
        const projectiles = this.combatSystem.projectiles.length;
        this.debugText.setText(
            `FPS: ${fps}\nCars: ${cars}\nEnemies: ${enemies}\nShots: ${projectiles}`
        );
    }

    updatePulseMeter(overdriveState) {
        if (!overdriveState) {
            return;
        }

        const { x, y, width, height } = this.pulseBar;
        const ratio = overdriveState.charge / OVERDRIVE.chargeSeconds;
        const fillWidth = Math.max(0, width * ratio);

        this.pulseGraphics.clear();
        this.pulseGraphics.fillStyle(0x1e1e1e, 1);
        this.pulseGraphics.fillRect(x, y, width, height);
        this.pulseGraphics.fillStyle(0xffcc00, 1);
        this.pulseGraphics.fillRect(x, y, fillWidth, height);
        this.pulseGraphics.lineStyle(1, 0x000000, 1);
        this.pulseGraphics.strokeRect(x, y, width, height);

        if (overdriveState.ready) {
            this.pulseText.setText('PULSE READY (E)');
            this.pulseText.setColor(PALETTE.warning);
        } else {
            this.pulseText.setText('Pulse charging');
            this.pulseText.setColor(PALETTE.uiText);
        }
    }

    updateEngineWeaponText(engineWeaponState) {
        if (!engineWeaponState) {
            this.engineWeaponText.setText('Engine: Unarmed');
            this.engineWeaponText.setColor(PALETTE.uiText);
            return;
        }

        const colorName = engineWeaponState.colorKey.toUpperCase();
        this.engineWeaponText.setText(
            `Engine: ${colorName} T${engineWeaponState.tier} (${engineWeaponState.count})`
        );
        this.engineWeaponText.setColor(COLORS[engineWeaponState.colorKey].hex);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60);
        const padded = remainder.toString().padStart(2, '0');
        return `${minutes}:${padded}`;
    }

    getBaseTextStyle() {
        return {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.baseFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 3
        };
    }

    getSmallTextStyle() {
        return {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 2
        };
    }

    getEngineBarColor(ratio) {
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
            { r: 200, g: 40, b: 40 },
            { r: 40, g: 200, b: 80 },
            100,
            Math.round(ratio * 100)
        );
        return Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    }
}
