import { PALETTE, UI, RENDER } from '../config.js';

export class EndScene extends Phaser.Scene {
    constructor() {
        super('EndScene');
    }

    create(data) {
        const { width, height } = this.scale;
        const result = data.result || 'defeat';
        const stats = data.stats || {};

        this.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        const titleText = result === 'victory' ? 'WAVES CLEARED' : 'ENGINE LOST';
        const titleColor = result === 'victory' ? PALETTE.warning : PALETTE.uiText;

        const title = this.add.text(width * 0.5, height * 0.2, titleText, {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: titleColor,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        title.setResolution(RENDER.textResolution);

        const statLines = [
            `Time: ${stats.timeSurvived || '0:00'}`,
            `Waves Cleared: ${stats.wavesCleared || 0}`,
            `Cars Collected: ${stats.carsCollected || 0}`,
            `Cars Lost: ${stats.carsLost || 0}`,
            `Merges: ${stats.mergesCompleted || 0}`,
            `Enemies Destroyed: ${stats.enemiesDestroyed || 0}`,
            `Highest Tier: ${stats.highestTier || 1}`
        ];

        const statsText = this.add.text(width * 0.5, height * 0.5, statLines.join('\n'), {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.statsFontSize}px`,
            color: PALETTE.uiText,
            align: 'center'
        }).setOrigin(0.5);
        statsText.setResolution(RENDER.textResolution);

        const retryText = this.add.text(width * 0.5, height * 0.8, 'TAP OR CLICK TO RETRY', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        retryText.setResolution(RENDER.textResolution);

        const settingsText = this.add.text(width * 0.5, height * 0.86, 'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: '18px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        settingsText.setResolution(RENDER.textResolution);
        settingsText.setInteractive({ useHandCursor: true });
        settingsText.on('pointerdown', () => {
            this.scene.start('SettingsScene');
        });

        this.input.once('pointerdown', (pointer, gameObjects) => {
            if (gameObjects && gameObjects.includes(settingsText)) {
                return;
            }
            this.scene.start('GameScene');
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
