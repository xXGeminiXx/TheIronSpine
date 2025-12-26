/**
 * settings-scene.js - Game settings menu
 *
 * Allows players to toggle visual effects and accessibility options.
 * Settings persist only for the current session (no localStorage).
 *
 * v1.5.0: Integrated Scrollbar for overflow handling
 */
import { PALETTE, UI, RENDER } from '../config.js';
import {
    SETTINGS,
    toggleSetting,
    cycleUiScale,
    getUiScaleLabel,
    setSetting
} from '../core/settings.js';
import { Scrollbar } from '../ui/scrollbar.js';
import { getAllDifficulties, saveDifficulty } from '../core/difficulty.js';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        this.titleText = this.add.text(width * 0.5, height * 0.12, 'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        this.titleText.setResolution(RENDER.textResolution);

        // v1.5.0 Scrollable settings area
        const scrollX = width * 0.15;
        const scrollTop = height * 0.23;
        const scrollWidth = width * 0.7;
        const scrollHeight = height * 0.58;

        const toggles = [
            { key: 'difficulty', label: 'Difficulty', desc: 'Easy / Normal / Hard', type: 'difficulty' },
            { key: 'uiScale', label: 'UI Scale', desc: 'Small / Medium / Large', type: 'cycle' },
            { key: 'endlessMode', label: 'Endless Mode', desc: 'Infinite waves (no win)' },
            { key: 'ghostReplay', label: 'Ghost Replay', desc: 'Show previous best run ghost' },
            { key: 'screenShake', label: 'Screen Shake', desc: 'Camera effects on hits' },
            { key: 'showGrid', label: 'Grid Background', desc: 'Show ground pattern' },
            { key: 'showRangeArcs', label: 'Range Arcs', desc: 'Show car weapon ranges' },
            { key: 'invincible', label: 'Easy Mode', desc: 'Train cannot take damage' },
            { key: 'debugOverlay', label: 'Debug Stats', desc: 'Show FPS and counts' }
        ];

        this.toggleTexts = [];
        this.descTexts = [];

        // Calculate content height
        const spacing = 60; // Space between each toggle
        const contentPadding = 24;
        const contentHeight = toggles.length * spacing + contentPadding * 2;

        // Create scrollbar
        this.scrollbar = new Scrollbar(this, {
            x: scrollX,
            y: scrollTop,
            width: scrollWidth,
            height: scrollHeight,
            contentHeight: contentHeight
        });

        // Create toggles inside scrollable content
        let currentY = contentPadding;
        toggles.forEach((toggle, index) => {
            const y = currentY;

            const text = this.add.text(scrollWidth * 0.5, y, '', {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: PALETTE.warning
            }).setOrigin(0.5);
            text.setResolution(RENDER.textResolution);

            // Add description text below each toggle
            const descText = this.add.text(scrollWidth * 0.5, y + 22, toggle.desc, {
                fontFamily: UI.fontFamily,
                fontSize: '14px',
                color: '#888888'
            }).setOrigin(0.5);
            descText.setResolution(RENDER.textResolution);

            text.setInteractive({ useHandCursor: true });
            text.on('pointerup', () => {
                if (this.scrollbar && this.scrollbar.consumeDragFlag()) {
                    return;
                }
                if (toggle.type === 'cycle') {
                    cycleUiScale();
                } else if (toggle.type === 'difficulty') {
                    this.cycleDifficulty();
                } else {
                    toggleSetting(toggle.key);
                }
                this.updateToggleText(text, toggle);
            });

            this.updateToggleText(text, toggle);
            this.toggleTexts.push({ text, toggle });
            this.descTexts.push(descText);

            // Add to scrollbar content
            this.scrollbar.addContent(text);
            this.scrollbar.addContent(descText);

            currentY += spacing;
        });

        // Back button - FIXED at bottom, outside scrollable area
        this.backText = this.add.text(width * 0.5, height * 0.88, 'BACK', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.backText.setResolution(RENDER.textResolution);
        this.backText.setInteractive({ useHandCursor: true });
        this.backText.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Escape' || event.code === 'Backspace') {
                    this.scene.start('MenuScene');
                }
            };
            this.input.keyboard.on('keydown', this.keyHandler);
        }

        this.events.once('shutdown', () => {
            if (this.scrollbar) {
                this.scrollbar.destroy();
            }
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
        });
    }

    update() {
        if (this.scrollbar) {
            this.scrollbar.update();
        }
    }

    cycleDifficulty() {
        const difficulties = getAllDifficulties();
        const current = SETTINGS.difficulty;
        const currentIndex = difficulties.findIndex(d => d.id === current);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        const next = difficulties[nextIndex];

        setSetting('difficulty', next.id);
        saveDifficulty(next.id);
    }

    updateToggleText(text, toggle) {
        if (toggle.type === 'cycle') {
            const label = getUiScaleLabel().toUpperCase();
            text.setText(`${toggle.label}: ${label}`);
            return;
        }

        if (toggle.type === 'difficulty') {
            const difficulties = getAllDifficulties();
            const current = SETTINGS.difficulty;
            const info = difficulties.find(d => d.id === current);
            const label = info ? info.name.toUpperCase() : 'NORMAL';
            text.setText(`${toggle.label}: ${label}`);
            return;
        }

        const value = SETTINGS[toggle.key] ? 'ON' : 'OFF';
        text.setText(`${toggle.label}: ${value}`);
    }
}
