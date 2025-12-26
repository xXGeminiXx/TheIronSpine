import { BUILD, COLORS, PALETTE, UI, OVERDRIVE, RENDER, SEEDING } from '../config.js';
import { SETTINGS } from '../core/settings.js';
import { formatCompact, formatNumber } from '../core/verylargenumbers.js';

const HUD_DEPTH = 100;
const DAMAGE_PING_DURATION = 0.35;
const DAMAGE_PING_SIZE = 18;
const DAMAGE_PING_MARGIN = 14;
const SPINE_PIP_SIZE = 3;
const SPINE_PIP_GAP = 2;
const SPINE_MAX_PIPS = 4;

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
        // Prevent text overflow - wordWrap with right alignment
        this.killText.setWordWrapWidth(200, false);
        this.killText.setAlign('right');

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

        // v1.4.0 Combo display
        this.comboText = scene.add.text(0, 0, '', {
            fontFamily: UI.fontFamily,
            fontSize: '32px',
            color: '#ffcc00',
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        });
        this.comboText.setResolution(RENDER.textResolution);
        this.comboText.setScrollFactor(0);
        this.comboText.setDepth(HUD_DEPTH + 1);
        this.comboText.setOrigin(1, 0);
        this.comboText.setAlpha(0);
        // Prevent text overflow - wordWrap with right alignment
        this.comboText.setWordWrapWidth(300, false);
        this.comboText.setAlign('right');

        // v1.4.0 Weather display
        this.weatherText = scene.add.text(0, 0, '', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: '#aaddff',
            stroke: PALETTE.uiShadow,
            strokeThickness: 3
        });
        this.weatherText.setResolution(RENDER.textResolution);
        this.weatherText.setScrollFactor(0);
        this.weatherText.setDepth(HUD_DEPTH);
        this.weatherText.setOrigin(0.5, 0);
        this.weatherText.setAlpha(0);

        // Station buff display
        this.stationBuffText = scene.add.text(0, 0, '', {
            fontFamily: UI.fontFamily,
            fontSize: '18px',
            color: '#ffcc00',
            stroke: PALETTE.uiShadow,
            strokeThickness: 4,
            fontStyle: 'bold'
        });
        this.stationBuffText.setResolution(RENDER.textResolution);
        this.stationBuffText.setScrollFactor(0);
        this.stationBuffText.setDepth(HUD_DEPTH);
        this.stationBuffText.setOrigin(0.5, 0);
        this.stationBuffText.setAlpha(0);

        this.stationBuffGraphics = scene.add.graphics();
        this.stationBuffGraphics.setScrollFactor(0);
        this.stationBuffGraphics.setDepth(HUD_DEPTH);

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

        // Seed display (v1.6.0)
        this.seedText = scene.add.text(0, 0, '', {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: '#888888',
            stroke: PALETTE.uiShadow,
            strokeThickness: 2
        });
        this.seedText.setResolution(RENDER.textResolution);
        this.seedText.setScrollFactor(0);
        this.seedText.setDepth(HUD_DEPTH);
        this.seedText.setOrigin(0, 0);
        this.seedText.setAlpha(0);

        this.damagePingGraphics = scene.add.graphics();
        this.damagePingGraphics.setScrollFactor(0);
        this.damagePingGraphics.setDepth(HUD_DEPTH);
        this.damagePings = [];
        this.mergePulseTime = 0;

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
        // Safe-area padding is handled by the game container; keep a small edge buffer.
        const edgeMargin = padding + 12;
        const textMargin = Math.max(16, edgeMargin * scale);
        const textPadding = Math.max(12, padding * scale);

        // Update text word wrap widths dynamically based on screen size
        // This ensures text never overflows regardless of screen size
        const maxRightTextWidth = Math.max(150, Math.min(width * 0.3, 260));
        const wrappedRightWidth = maxRightTextWidth / scale;
        if (this.killText) {
            this.killText.setWordWrapWidth(wrappedRightWidth, false);
            this.killText.setFixedSize(wrappedRightWidth, 0);
            this.killText.setAlign('right');
        }
        if (this.comboText) {
            this.comboText.setWordWrapWidth(wrappedRightWidth, false);
            this.comboText.setFixedSize(wrappedRightWidth, 0);
            this.comboText.setAlign('right');
        }

        this.engineLabel.setPosition(textMargin, textPadding - 2 * scale);
        this.engineWeaponText.setPosition(textMargin, textPadding + 16 * scale);

        this.engineBar = {
            x: edgeMargin + 70,
            y: padding + 2,
            width: 200,
            height: 12
        };
        this.carBar = {
            x: edgeMargin,
            y: padding + 36
        };
        this.pulseBar = {
            x: edgeMargin,
            y: padding + 58,
            width: 180,
            height: 10
        };
        this.pulseText.setPosition(textMargin, textPadding + 70 * scale);

        this.timerText.setPosition(width * 0.5, textPadding);
        this.waveText.setPosition(width * 0.5, textPadding + 22 * scale);
        this.killText.setPosition(width - textMargin, textPadding);
        this.mergeText.setPosition(width * 0.5, 120 * scale);

        // v1.4.0 New HUD elements positioning
        this.comboText.setPosition(width - textMargin, textPadding + 32 * scale);
        this.weatherText.setPosition(width * 0.5, textPadding + 46 * scale);

        // Station buff display (below weather)
        this.stationBuffText.setPosition(width * 0.5, textPadding + 70 * scale);

        if (this.debugText) {
            this.debugText.setPosition(textMargin, height - 80 * scale);
        }
        this.versionText.setPosition(
            width - textMargin,
            height - textPadding
        );

        // Position seed text below wave text
        if (this.seedText) {
            this.seedText.setPosition(textMargin, textPadding + 90 * scale);
        }

        this.clampRightEdge(this.killText, width);
        this.clampRightEdge(this.comboText, width);
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
        this.damagePingGraphics.setScale(scale);
        this.engineLabel.setScale(scale);
        this.engineWeaponText.setScale(scale);
        this.timerText.setScale(scale);
        this.killText.setScale(scale);
        this.waveText.setScale(scale);
        this.mergeText.setScale(scale);
        this.pulseText.setScale(scale);
        this.stationBuffText.setScale(scale);
        this.stationBuffGraphics.setScale(scale);
        this.debugText.setScale(scale);
        this.versionText.setScale(scale);
        if (this.seedText) {
            this.seedText.setScale(scale);
        }
    }

    clampRightEdge(text, width) {
        if (!text) {
            return;
        }
        const bounds = text.getBounds();
        const maxRight = width - 6;
        if (bounds.right > maxRight) {
            text.x -= bounds.right - maxRight;
        }
    }

    update(runTimeSeconds, waveStatus, deltaSeconds, overdriveState, engineWeaponState) {
        this.mergePulseTime += deltaSeconds;
        this.updateEngineBar();
        this.updateCarBar();

        // v1.4.0 Update combo display
        if (this.scene.combo) {
            const count = this.scene.combo.getCount();
            const multiplier = this.scene.combo.getMultiplier();
            if (count >= 5) {
                this.comboText.setText(`${count}x COMBO\n${multiplier.toFixed(1)}x DMG`);
                this.comboText.setAlpha(1);
            } else {
                this.comboText.setAlpha(0);
            }
        }

        // v1.4.0 Update weather display
        if (this.scene.weather) {
            const weatherName = this.scene.weather.getWeatherName();
            if (weatherName && weatherName !== 'Clear') {
                this.weatherText.setText(weatherName);
                this.weatherText.setAlpha(0.8);
            } else {
                this.weatherText.setAlpha(0);
            }
        }

        // Update station buff display
        this.updateStationBuff();

        this.updatePulseMeter(overdriveState);
        this.updateEngineWeaponText(engineWeaponState);
        this.timerText.setText(this.formatTime(runTimeSeconds));
        this.killText.setText(`Kills: ${formatCompact(this.combatSystem.stats.enemiesDestroyed)}`);
        this.updateWaveText(waveStatus);
        this.updateMergeFlash(deltaSeconds);
        this.updateDamagePings(deltaSeconds);
        this.updateDebugOverlay();
        this.updateSeedDisplay();
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
        const mergeCandidates = new Set();

        for (let i = 0; i < segments.length - 1; i += 1) {
            const first = segments[i];
            const second = segments[i + 1];
            if (first.colorKey === second.colorKey && first.tier === second.tier) {
                mergeCandidates.add(i);
                mergeCandidates.add(i + 1);
            }
        }

        this.hpGraphics.clear();
        let offsetX = startX;
        segments.forEach((segment, index) => {
            const x = offsetX;
            const y = startY;
            const ratio = segment.hp / segment.maxHp;

            this.hpGraphics.fillStyle(0x2c2c2c, 1);
            this.hpGraphics.fillRect(x, y, segmentWidth, segmentHeight);

            const fillWidth = Math.max(0, segmentWidth * ratio);
            this.hpGraphics.fillStyle(COLORS[segment.colorKey].phaser, 1);
            this.hpGraphics.fillRect(x, y, fillWidth, segmentHeight);

            const pipCount = Math.min(segment.tier, SPINE_MAX_PIPS);
            const pipWidth = pipCount * SPINE_PIP_SIZE + Math.max(0, pipCount - 1) * SPINE_PIP_GAP;
            const pipStartX = x + (segmentWidth - pipWidth) * 0.5;
            const pipY = y - 6;
            this.hpGraphics.fillStyle(0xffffff, 0.85);
            for (let pip = 0; pip < pipCount; pip += 1) {
                this.hpGraphics.fillRect(
                    pipStartX + pip * (SPINE_PIP_SIZE + SPINE_PIP_GAP),
                    pipY,
                    SPINE_PIP_SIZE,
                    SPINE_PIP_SIZE
                );
            }

            if (segment.tier > SPINE_MAX_PIPS) {
                const markerX = x + segmentWidth - 3;
                this.hpGraphics.fillRect(markerX, pipY, 2, SPINE_PIP_SIZE);
            }

            if (mergeCandidates.has(index)) {
                const pulse = 0.45 + 0.35 * Math.sin(this.mergePulseTime * 6);
                const highlight = Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;
                this.hpGraphics.lineStyle(2, highlight, pulse);
                this.hpGraphics.strokeRect(
                    x - 1,
                    y - 1,
                    segmentWidth + 2,
                    segmentHeight + 2
                );
            }

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
            const nextWave = waveStatus.number + 1;
            const remaining = Math.max(0, waveStatus.nextWaveIn);
            const nextWaveLabel = waveStatus.isEndless
                ? formatNumber(nextWave, 0)
                : `${nextWave}/${waveStatus.total}`;
            this.waveText.setText(`Wave ${nextWaveLabel} in ${remaining.toFixed(1)}s`);
            this.waveText.setColor(PALETTE.uiText);
            return;
        }

        let suffix = '';
        if (waveStatus.eliteType === 'boss') {
            suffix = ' - Boss';
        } else if (waveStatus.eliteType === 'champion') {
            suffix = ' - Champion';
        }

        const formationLabel = waveStatus.formationLabel
            ? ` (${waveStatus.formationLabel})`
            : '';
        const waveLabel = waveStatus.isEndless
            ? formatNumber(waveStatus.number, 0)
            : `${waveStatus.number}/${waveStatus.total}`;
        this.waveText.setText(`Wave ${waveLabel}${suffix}${formationLabel}`);
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

    /**
     * Show station buff notification and icon
     * Called when player selects a lane at a station event
     */
    showStationBuff(buff) {
        // No-op, update happens automatically via getActiveBuff()
    }

    /**
     * Update station buff display
     */
    updateStationBuff() {
        if (!this.scene.stationEvents) {
            this.stationBuffText.setAlpha(0);
            this.stationBuffGraphics.clear();
            return;
        }

        const buff = this.scene.stationEvents.getActiveBuff();
        if (!buff || buff.remaining <= 0) {
            this.stationBuffText.setAlpha(0);
            this.stationBuffGraphics.clear();
            return;
        }

        // Show buff text with timer
        const timeRemaining = Math.ceil(buff.remaining);
        this.stationBuffText.setText(`${buff.label} (${timeRemaining}s)`);
        this.stationBuffText.setAlpha(1);
        this.stationBuffText.setColor(buff.color);

        // Draw buff icon (simple colored circle)
        const { width } = this.scene.scale;
        const scale = this.uiScale || 1;
        const iconX = width * 0.5 / scale - 90;
        const iconY = UI.hudPadding + 76;
        const iconRadius = 8;

        this.stationBuffGraphics.clear();
        this.stationBuffGraphics.fillStyle(
            Phaser.Display.Color.HexStringToColor(buff.color).color,
            0.7
        );
        this.stationBuffGraphics.fillCircle(iconX, iconY, iconRadius);
        this.stationBuffGraphics.lineStyle(2, 0xffffff, 0.9);
        this.stationBuffGraphics.strokeCircle(iconX, iconY, iconRadius);
    }

    triggerDamagePing(sourceX, sourceY, color) {
        if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) {
            return;
        }

        const camera = this.scene.cameras.main;
        const dx = sourceX - camera.midPoint.x;
        const dy = sourceY - camera.midPoint.y;
        if (dx === 0 && dy === 0) {
            return;
        }

        const resolvedColor = Number.isFinite(color)
            ? color
            : Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;
        this.damagePings.push({
            angle: Math.atan2(dy, dx),
            time: DAMAGE_PING_DURATION,
            duration: DAMAGE_PING_DURATION,
            color: resolvedColor
        });
    }

    updateDamagePings(deltaSeconds) {
        if (this.damagePings.length === 0) {
            this.damagePingGraphics.clear();
            return;
        }

        const scale = this.uiScale || 1;
        const width = this.scene.scale.width / scale;
        const height = this.scene.scale.height / scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const halfWidth = width * 0.5 - DAMAGE_PING_MARGIN;
        const halfHeight = height * 0.5 - DAMAGE_PING_MARGIN;

        this.damagePingGraphics.clear();

        for (let i = this.damagePings.length - 1; i >= 0; i -= 1) {
            const ping = this.damagePings[i];
            ping.time -= deltaSeconds;
            if (ping.time <= 0) {
                this.damagePings.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1, ping.time / ping.duration);
            const dirX = Math.cos(ping.angle);
            const dirY = Math.sin(ping.angle);
            const tX = dirX === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dirX);
            const tY = dirY === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dirY);
            const t = Math.min(tX, tY);
            const edgeX = centerX + dirX * t;
            const edgeY = centerY + dirY * t;

            const size = DAMAGE_PING_SIZE;
            const tipX = edgeX - dirX * size;
            const tipY = edgeY - dirY * size;
            const baseHalf = size * 0.6;
            const perpX = -dirY;
            const perpY = dirX;
            const leftX = edgeX + perpX * baseHalf;
            const leftY = edgeY + perpY * baseHalf;
            const rightX = edgeX - perpX * baseHalf;
            const rightY = edgeY - perpY * baseHalf;

            this.damagePingGraphics.fillStyle(ping.color, alpha);
            this.damagePingGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
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

    updateSeedDisplay() {
        if (!this.seedText || !SEEDING.enabled || !SEEDING.showSeedOnHUD) {
            if (this.seedText) {
                this.seedText.setAlpha(0);
            }
            return;
        }

        // Get seed from the scene's RNG or seedManager
        let seedValue = 'RANDOM';
        if (this.scene.seedManager && this.scene.seedManager.getSeed) {
            seedValue = this.scene.seedManager.getSeed();
        } else if (this.scene.rng && this.scene.rng.getSeed) {
            seedValue = this.scene.rng.getSeed();
        }

        this.seedText.setText(`Seed: ${seedValue}`);
        this.seedText.setAlpha(0.7);
    }
}
