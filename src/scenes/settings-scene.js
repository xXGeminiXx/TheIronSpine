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

        this.titleText = this.add.text(width * 0.5, height * 0.18, 'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        this.titleText.setResolution(RENDER.textResolution);

        const toggles = [
            { key: 'screenShake', label: 'Screen Shake' },
            { key: 'showGrid', label: 'Grid Background' },
            { key: 'debugOverlay', label: 'Debug Overlay' }
        ];

        this.toggleTexts = [];
        this.startY = height * 0.38;
        this.stepY = 52;

        toggles.forEach((toggle, index) => {
            const y = this.startY + index * this.stepY;
            const text = this.add.text(width * 0.5, y, '', {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: PALETTE.warning
            }).setOrigin(0.5);
            text.setResolution(RENDER.textResolution);

            text.setInteractive({ useHandCursor: true });
            text.on('pointerdown', () => {
                toggleSetting(toggle.key);
                this.updateToggleText(text, toggle);
            });

            this.updateToggleText(text, toggle);
            this.toggleTexts.push(text);
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
        this.titleText.setPosition(width * 0.5, height * 0.18);
        this.startY = height * 0.38;
        this.toggleTexts.forEach((text, index) => {
            text.setPosition(width * 0.5, this.startY + index * this.stepY);
        });
        this.backText.setPosition(width * 0.5, height * 0.8);
    }
}
