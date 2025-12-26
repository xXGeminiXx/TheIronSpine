/**
 * hotkey-overlay.js - Hold-to-view hotkey reference
 */

import { PALETTE, UI, RENDER } from '../config.js';

const OVERLAY_DEPTH = 170;
const PANEL_BG = 0x0c1220;
const PANEL_BORDER = 0x2d3b5c;
const PANEL_PADDING = 14;
const PANEL_ALPHA = 0.9;
const HINT_ALPHA = 0.55;

export class HotkeyOverlay {
    constructor(scene) {
        this.scene = scene;
        this.uiScale = 1;
        this.isActive = false;

        this.container = scene.add.container(0, 0);
        this.container.setDepth(OVERLAY_DEPTH);
        this.container.setScrollFactor(0);
        this.container.setVisible(false);

        this.panel = scene.add.rectangle(0, 0, 10, 10, PANEL_BG, PANEL_ALPHA);
        this.panel.setStrokeStyle(2, PANEL_BORDER, 0.9);
        this.panel.setOrigin(0, 0);

        this.text = scene.add.text(0, 0, this.getHotkeyText(), {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText,
            lineSpacing: 6,
            align: 'left'
        });
        this.text.setResolution(RENDER.textResolution);
        this.text.setOrigin(0, 0);

        this.container.add([this.panel, this.text]);

        this.hintText = scene.add.text(0, 0, 'Hold ALT for hotkeys', {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: HINT_ALPHA
        });
        this.hintText.setResolution(RENDER.textResolution);
        this.hintText.setOrigin(0, 1);
        this.hintText.setScrollFactor(0);
        this.hintText.setDepth(OVERLAY_DEPTH - 1);

        this.layout();

        if (scene.input.keyboard) {
            this.keyDownHandler = (event) => {
                if (event.code === 'AltLeft' || event.code === 'AltRight') {
                    this.setActive(true);
                }
            };
            this.keyUpHandler = (event) => {
                if (event.code === 'AltLeft' || event.code === 'AltRight') {
                    this.setActive(false);
                }
            };
            scene.input.keyboard.on('keydown', this.keyDownHandler);
            scene.input.keyboard.on('keyup', this.keyUpHandler);
        }

        this.resizeHandler = () => this.layout();
        scene.scale.on('resize', this.resizeHandler);
    }

    getHotkeyText() {
        return [
            'HOTKEYS',
            '',
            'Boost: Click / Hold',
            'Pulse: E',
            'Drop Car: SPACE',
            'Sort Cars: R',
            'Pause: ESC / P'
        ].join('\n');
    }

    setActive(isActive) {
        this.isActive = isActive;
        this.container.setVisible(isActive);
        this.hintText.setAlpha(isActive ? 0.25 : HINT_ALPHA);
    }

    setUiScale(scale) {
        const clamped = Math.max(0.6, Math.min(scale, 1.2));
        this.uiScale = clamped;
        this.container.setScale(clamped);
        this.hintText.setScale(clamped);
        this.layout();
    }

    layout() {
        const { width, height } = this.scene.scale;
        const margin = 16;
        const bounds = this.text.getBounds();
        const panelWidth = bounds.width + PANEL_PADDING * 2;
        const panelHeight = bounds.height + PANEL_PADDING * 2;

        this.panel.setSize(panelWidth, panelHeight);
        this.text.setPosition(PANEL_PADDING, PANEL_PADDING);

        const x = margin;
        const y = height - panelHeight - margin - 32;
        this.container.setPosition(x, y);

        this.hintText.setPosition(margin, height - margin);
    }

    destroy() {
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.keyDownHandler);
            this.scene.input.keyboard.off('keyup', this.keyUpHandler);
        }
        this.scene.scale.off('resize', this.resizeHandler);
        this.container.destroy();
        this.hintText.destroy();
    }
}
