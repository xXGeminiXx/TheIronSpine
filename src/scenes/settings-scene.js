/**
 * settings-scene.js - Game settings menu
 *
 * Allows players to toggle visual effects and accessibility options.
 * Settings persist only for the current session (no localStorage).
 */
import { PALETTE, UI, RENDER } from '../config.js';
import { SETTINGS, toggleSetting } from '../core/settings.js';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        this.titleText = this.add.text(width * 0.5, height * 0.14, 'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        this.titleText.setResolution(RENDER.textResolution);

        const toggles = [
            { key: 'screenShake', label: 'Screen Shake', desc: 'Camera effects on hits' },
            { key: 'showGrid', label: 'Grid Background', desc: 'Show ground pattern' },
            { key: 'invincible', label: 'Easy Mode', desc: 'Train cannot take damage' },
            { key: 'debugOverlay', label: 'Debug Stats', desc: 'Show FPS and counts' }
        ];

        this.toggleTexts = [];
        this.descTexts = [];
        this.startY = height * 0.32;
        this.stepY = 58;

        toggles.forEach((toggle, index) => {
            const y = this.startY + index * this.stepY;
            const text = this.add.text(width * 0.5, y, '', {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: PALETTE.warning
            }).setOrigin(0.5);
            text.setResolution(RENDER.textResolution);

            // Add description text below each toggle
            const descText = this.add.text(width * 0.5, y + 22, toggle.desc, {
                fontFamily: UI.fontFamily,
                fontSize: '14px',
                color: '#888888'
            }).setOrigin(0.5);
            descText.setResolution(RENDER.textResolution);

            text.setInteractive({ useHandCursor: true });
            text.on('pointerdown', () => {
                toggleSetting(toggle.key);
                this.updateToggleText(text, toggle);
            });

            this.updateToggleText(text, toggle);
            this.toggleTexts.push({ text, toggle });
            this.descTexts.push(descText);
        });

        this.backText = this.add.text(width * 0.5, height * 0.8, 'BACK', {
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

        this.layout();
        this.resizeHandler = () => this.layout();
        this.scale.on('resize', this.resizeHandler);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.resizeHandler);
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
        });
    }

    updateToggleText(text, toggle) {
        const value = SETTINGS[toggle.key] ? 'ON' : 'OFF';
        text.setText(`${toggle.label}: ${value}`);
    }

    layout() {
        const { width, height } = this.scale;
        this.titleText.setPosition(width * 0.5, height * 0.14);
        this.startY = height * 0.32;
        this.toggleTexts.forEach((entry, index) => {
            const y = this.startY + index * this.stepY;
            entry.text.setPosition(width * 0.5, y);
        });
        this.descTexts.forEach((descText, index) => {
            const y = this.startY + index * this.stepY + 22;
            descText.setPosition(width * 0.5, y);
        });
        this.backText.setPosition(width * 0.5, height * 0.88);
    }
}
