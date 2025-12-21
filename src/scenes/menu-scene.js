import { PALETTE, UI, RENDER } from '../config.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        const titleText = this.add.text(width * 0.5, height * 0.35, 'IRON SPINE', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        titleText.setResolution(RENDER.textResolution);

        const subtitleText = this.add.text(width * 0.5, height * 0.47, 'STEER. COLLECT. MERGE. SURVIVE.', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.uiText
        }).setOrigin(0.5);
        subtitleText.setResolution(RENDER.textResolution);

        const loreText = this.add.text(width * 0.5, height * 0.55, 'An articulated war machine, reborn from a 1944 patent.', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        loreText.setResolution(RENDER.textResolution);

        const winText = this.add.text(width * 0.5, height * 0.6, 'Clear 20 waves to win.', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        winText.setResolution(RENDER.textResolution);

        const startText = this.add.text(width * 0.5, height * 0.68, 'START', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        startText.setResolution(RENDER.textResolution);

        const settingsText = this.add.text(width * 0.5, height * 0.76, 'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        settingsText.setResolution(RENDER.textResolution);

        startText.setInteractive({ useHandCursor: true });
        settingsText.setInteractive({ useHandCursor: true });

        startText.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        settingsText.on('pointerdown', () => {
            this.scene.start('SettingsScene');
        });

        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                    this.scene.start('GameScene');
                }
                if (event.code === 'KeyS') {
                    this.scene.start('SettingsScene');
                }
            };
            this.input.keyboard.on('keydown', this.keyHandler);
        }

        this.events.once('shutdown', () => {
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
        });
    }
}
