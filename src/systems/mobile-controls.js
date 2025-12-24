/**
 * MobileControls - On-screen touch buttons for mobile devices.
 *
 * Displays BOOST, DROP, SORT, and PULSE buttons in the bottom-left corner.
 * All buttons are screen-fixed (ignore camera scroll) so they stay
 * in position as the camera follows the train.
 *
 * Button layout (left to right):
 *   BOOST - Triggers speed boost (same as tapping anywhere)
 *   DROP  - Jettisons the tail car
 *   SORT  - Reorders cars by tier/color
 *   PULSE - Activates overdrive when charged
 */
import { PALETTE, UI } from '../config.js';

const BUTTON_RADIUS = 36;
const BUTTON_PADDING = 12;
const MOBILE_BUTTON_DEPTH = 210;

export class MobileControls {
    constructor(scene, inputController) {
        this.scene = scene;
        this.input = inputController;
        this.buttons = [];
        this.uiScale = 1;

        // Container anchors all buttons to screen space, not world space
        this.container = scene.add.container();
        this.container.setDepth(MOBILE_BUTTON_DEPTH);
        this.container.setScrollFactor(0);

        // Create buttons in logical order
        this.createButton('boost', 'BOOST', () => {
            this.input.boostRequested = true;
        }, 0x44aa44);
        this.createButton(
            'drop',
            'DROP',
            () => this.input.requestDrop(),
            0xaa4444,
            {
                onHoldStart: () => this.input.setDropHeld(true),
                onHoldEnd: () => this.input.setDropHeld(false)
            }
        );
        this.createButton('sort', 'SORT', () => this.input.requestReorder(), 0x6688aa);
        this.createButton('pulse', 'PULSE', () => this.input.requestPulse(), 0xffcc00);

        this.positionButtons();

        this.resizeHandler = () => this.positionButtons();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    createButton(key, label, callback, strokeColor = null, holdHandlers = null) {
        const stroke = strokeColor || Phaser.Display.Color.HexStringToColor(PALETTE.warning).color;
        const background = this.scene.add.circle(0, 0, BUTTON_RADIUS, 0x000000, 0.4);
        background.setStrokeStyle(3, stroke);

        const text = this.scene.add.text(0, 0, label, {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        text.setResolution(2);

        const button = this.scene.add.container(0, 0, [background, text]);
        button.setSize(BUTTON_RADIUS * 2, BUTTON_RADIUS * 2);
        button.setInteractive({ useHandCursor: true });

        // Prevent button taps from propagating to the scene (would trigger
        // steering changes and double-boosts)
        button.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
            callback();
            if (holdHandlers && holdHandlers.onHoldStart) {
                holdHandlers.onHoldStart();
            }
            this.scene.tweens.add({
                targets: button,
                scale: 0.9,
                duration: 80,
                yoyo: true
            });
        });
        if (holdHandlers && holdHandlers.onHoldEnd) {
            const stopHold = () => holdHandlers.onHoldEnd();
            button.on('pointerup', stopHold);
            button.on('pointerout', stopHold);
        }

        this.buttons.push({ key, button, background });
        this.container.add(button);
    }

    positionButtons() {
        const { width, height } = this.scene.scale;
        // Account for notches/safe areas - large left padding needed
        const safeAreaLeft = 60;
        const buttonDiameter = BUTTON_RADIUS * 2;
        const spacing = buttonDiameter + BUTTON_PADDING;
        const totalWidth = buttonDiameter * this.buttons.length
            + BUTTON_PADDING * Math.max(0, this.buttons.length - 1);
        const usableWidth = Math.max(1, width - safeAreaLeft - BUTTON_PADDING * 2);
        const layoutScale = totalWidth > usableWidth
            ? usableWidth / totalWidth
            : 1;

        const finalScale = layoutScale * this.uiScale;
        this.container.setScale(finalScale);

        const startX = (BUTTON_RADIUS + BUTTON_PADDING + safeAreaLeft) / finalScale;
        const startY = (height - BUTTON_RADIUS - BUTTON_PADDING - 20) / finalScale;

        this.buttons.forEach((entry, index) => {
            entry.button.setPosition(startX + index * spacing, startY);
        });
    }

    setUiScale(scale) {
        const clamped = Math.max(0.6, Math.min(scale, 1.3));
        if (Math.abs(clamped - this.uiScale) < 0.001) {
            return;
        }
        this.uiScale = clamped;
        this.positionButtons();
    }

    destroy() {
        this.scene.scale.off('resize', this.resizeHandler);
        this.buttons.forEach((entry) => {
            entry.button.destroy();
        });
        this.buttons.length = 0;
        this.container.destroy();
        this.input.setDropHeld(false);
    }
}
