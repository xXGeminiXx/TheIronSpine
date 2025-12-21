import { PALETTE, UI } from '../config.js';

const BUTTON_RADIUS = 32;
const BUTTON_PADDING = 14;
const MOBILE_BUTTON_DEPTH = 210;

export class MobileControls {
    constructor(scene, inputController) {
        this.scene = scene;
        this.input = inputController;
        this.buttons = [];
        this.container = scene.add.container();
        this.container.setDepth(MOBILE_BUTTON_DEPTH);
        this.createButton('drop', 'DROP', () => this.input.requestDrop());
        this.createButton('pulse', 'PULSE', () => this.input.requestPulse());
        this.positionButtons();

        this.resizeHandler = () => this.positionButtons();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    createButton(key, label, callback) {
        const background = this.scene.add.circle(0, 0, BUTTON_RADIUS, 0x000000, 0.25);
        background.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(PALETTE.warning).color);
        const text = this.scene.add.text(0, 0, label, {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        text.setResolution(2);
        const button = this.scene.add.container(0, 0, [background, text]);
        button.setSize(BUTTON_RADIUS * 2, BUTTON_RADIUS * 2);
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
            callback();
            this.scene.tweens.add({
                targets: button,
                scale: 0.9,
                duration: 80,
                yoyo: true
            });
        });

        this.buttons.push({ key, button });
        this.container.add(button);
    }

    positionButtons() {
        const { width, height } = this.scene.scale;
        const startX = BUTTON_RADIUS + BUTTON_PADDING;
        const startY = height - BUTTON_RADIUS - BUTTON_PADDING;
        this.buttons.forEach((entry, index) => {
            entry.button.setPosition(
                startX + index * (BUTTON_RADIUS * 2 + BUTTON_PADDING),
                startY
            );
        });
    }

    destroy() {
        this.scene.scale.off('resize', this.resizeHandler);
        this.buttons.forEach((entry) => {
            entry.button.destroy();
        });
        this.buttons.length = 0;
        this.container.destroy();
    }
}
