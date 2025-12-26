/**
 * pause-overlay.js - Pause Menu Overlay System
 *
 * A self-contained pause system that can be plugged into any Phaser scene.
 * Provides pause/resume functionality with:
 *   - Pause menu with Resume, Settings, Quit options
 *   - Blur/dim effect on the game
 *   - Keyboard (ESC/P) and touch-friendly controls
 *   - Settings access without leaving the game
 *   - Focus trap (prevents game input while paused)
 *
 * DESIGN PHILOSOPHY:
 *   - Completely self-contained: doesn't require changes to game-scene.js
 *   - Can be enabled/disabled easily
 *   - Respects mobile vs desktop differences
 *   - Doesn't break game state on resume
 *
 * USAGE:
 *   import { PauseOverlay } from './systems/pause-overlay.js';
 *
 *   // In game scene create():
 *   this.pauseOverlay = new PauseOverlay(this, {
 *       onResume: () => console.log('Resumed!'),
 *       onQuit: () => this.scene.start('MenuScene'),
 *       onSettings: () => this.scene.launch('SettingsScene')
 *   });
 *
 *   // Toggle pause:
 *   this.pauseOverlay.toggle();
 *
 *   // Check if paused:
 *   if (this.pauseOverlay.isPaused()) {
 *       return; // Skip game update
 *   }
 *
 * KEYBOARD SHORTCUTS:
 *   ESC or P: Toggle pause
 *   R: Resume (when paused)
 *   Q: Quit to menu (when paused)
 *   S: Open settings (when paused)
 *
 * EXTENSIBILITY:
 *   Add new menu options by extending MENU_OPTIONS array
 *   Override visual styling via config
 */

import { PALETTE, UI, RENDER } from '../config.js';

// Default configuration
const DEFAULT_CONFIG = {
    // Visual
    overlayColor: 0x000000,
    overlayAlpha: 0.7,
    menuBgColor: 0x1a1a2e,
    menuBorderColor: 0xffa500,

    // Timing
    fadeInDuration: 150,
    fadeOutDuration: 100,

    // Controls
    pauseKey: 'ESC',
    alternateKey: 'P',
    enableKeyboard: true,

    // Behavior
    pauseOnBlur: true,  // Pause when window loses focus
    allowPauseButton: true  // Show pause button on mobile
};

// Menu button definitions
const MENU_OPTIONS = [
    { id: 'resume', label: 'RESUME', key: 'R', action: 'resume' },
    { id: 'settings', label: 'SETTINGS', key: 'S', action: 'settings' },
    { id: 'quit', label: 'QUIT TO MENU', key: 'Q', action: 'quit' }
];

// ----------------------------------------------------------------------------
// PAUSE OVERLAY CLASS
// ----------------------------------------------------------------------------

export class PauseOverlay {
    /**
     * Create a pause overlay for a scene.
     *
     * @param {Phaser.Scene} scene - The game scene
     * @param {Object} options - Configuration and callbacks
     * @param {Function} options.onResume - Called when game resumes
     * @param {Function} options.onQuit - Called when player quits
     * @param {Function} options.onSettings - Called to open settings
     * @param {Object} options.config - Override default config
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };

        // Callbacks
        this.onResume = options.onResume || (() => {});
        this.onQuit = options.onQuit || (() => {});
        this.onSettings = options.onSettings || (() => {});

        // State
        this._isPaused = false;
        this.container = null;
        this.menuItems = [];

        // Setup
        this.setupKeyboard();
        this.setupBlurHandler();
        this.setupPauseButton();
    }

    /**
     * Check if the game is currently paused.
     *
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._isPaused;
    }

    /**
     * Toggle pause state.
     */
    toggle() {
        if (this._isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Pause the game and show overlay.
     */
    pause() {
        if (this._isPaused) {
            return;
        }

        this._isPaused = true;
        this.createOverlay();

        // Pause physics/tweens if using them
        // this.scene.physics.pause();
        // this.scene.tweens.pauseAll();

        console.log('[Pause] Game paused');
    }

    /**
     * Resume the game and hide overlay.
     */
    resume() {
        if (!this._isPaused) {
            return;
        }

        this._isPaused = false;
        this.destroyOverlay();
        this.onResume();

        // Resume physics/tweens if paused
        // this.scene.physics.resume();
        // this.scene.tweens.resumeAll();

        console.log('[Pause] Game resumed');
    }

    /**
     * Create the pause overlay UI.
     */
    createOverlay() {
        const { width, height } = this.scene.scale;

        // Container for all pause elements (fixed to camera)
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(500);
        this.container.setScrollFactor(0);

        // Dim overlay
        this.overlay = this.scene.add.rectangle(
            width * 0.5,
            height * 0.5,
            width,
            height,
            this.config.overlayColor,
            0
        );
        this.container.add(this.overlay);

        // Fade in overlay
        this.scene.tweens.add({
            targets: this.overlay,
            alpha: this.config.overlayAlpha,
            duration: this.config.fadeInDuration
        });

        // Menu background
        const menuWidth = 220;
        const menuHeight = 180;
        this.menuBg = this.scene.add.rectangle(
            width * 0.5,
            height * 0.5,
            menuWidth,
            menuHeight,
            Phaser.Display.Color.HexStringToColor(PALETTE.background).color
        );
        this.menuBg.setStrokeStyle(2, this.config.menuBorderColor);
        this.menuBg.setAlpha(0);
        this.container.add(this.menuBg);

        // Fade in menu
        this.scene.tweens.add({
            targets: this.menuBg,
            alpha: 1,
            duration: this.config.fadeInDuration
        });

        // PAUSED title
        this.pauseTitle = this.scene.add.text(width * 0.5, height * 0.5 - 55, 'PAUSED', {
            fontFamily: UI.fontFamily,
            fontSize: '28px',
            color: PALETTE.warning,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.pauseTitle.setResolution(RENDER.textResolution);
        this.pauseTitle.setAlpha(0);
        this.container.add(this.pauseTitle);

        this.scene.tweens.add({
            targets: this.pauseTitle,
            alpha: 1,
            duration: this.config.fadeInDuration
        });

        // Menu options
        const startY = height * 0.5 - 10;
        const optionSpacing = 35;

        MENU_OPTIONS.forEach((option, index) => {
            const y = startY + index * optionSpacing;
            const label = `${option.label}`;
            const keyHint = option.key ? ` [${option.key}]` : '';

            const text = this.scene.add.text(width * 0.5, y, label + keyHint, {
                fontFamily: UI.fontFamily,
                fontSize: '18px',
                color: PALETTE.uiText
            }).setOrigin(0.5);
            text.setResolution(RENDER.textResolution);
            text.setAlpha(0);
            text.setInteractive({ useHandCursor: true });

            // Hover effects
            text.on('pointerover', () => {
                text.setColor(PALETTE.warning);
            });

            text.on('pointerout', () => {
                text.setColor(PALETTE.uiText);
            });

            // Click handler
            text.on('pointerdown', () => {
                this.handleAction(option.action);
            });

            this.container.add(text);
            this.menuItems.push(text);

            // Fade in
            this.scene.tweens.add({
                targets: text,
                alpha: 1,
                duration: this.config.fadeInDuration,
                delay: 50 * (index + 1)
            });
        });
    }

    /**
     * Destroy the pause overlay UI.
     */
    destroyOverlay() {
        if (!this.container) {
            return;
        }

        // Fade out and destroy
        this.scene.tweens.add({
            targets: this.container.list,
            alpha: 0,
            duration: this.config.fadeOutDuration,
            onComplete: () => {
                if (this.container) {
                    this.container.destroy();
                    this.container = null;
                }
            }
        });

        this.menuItems = [];
    }

    /**
     * Handle menu action.
     *
     * @param {string} action - The action ID
     */
    handleAction(action) {
        switch (action) {
            case 'resume':
                this.resume();
                break;
            case 'settings':
                this.onSettings();
                break;
            case 'quit':
                this.destroyOverlay();
                this._isPaused = false;
                this.onQuit();
                break;
        }
    }

    /**
     * Setup keyboard controls.
     */
    setupKeyboard() {
        if (!this.config.enableKeyboard || !this.scene.input.keyboard) {
            return;
        }

        // Pause toggle
        this.scene.input.keyboard.on('keydown-ESC', () => this.toggle());
        this.scene.input.keyboard.on('keydown-P', () => this.toggle());

        // Menu shortcuts (only when paused)
        MENU_OPTIONS.forEach(option => {
            if (option.key) {
                this.scene.input.keyboard.on(`keydown-${option.key}`, () => {
                    if (this._isPaused) {
                        this.handleAction(option.action);
                    }
                });
            }
        });
    }

    /**
     * Setup window blur handler (pause when tabbing away).
     */
    setupBlurHandler() {
        if (!this.config.pauseOnBlur) {
            return;
        }

        this.blurHandler = () => {
            if (!this._isPaused) {
                this.pause();
            }
        };

        // Note: Phaser handles this differently, but we can hook window events
        if (typeof window !== 'undefined') {
            window.addEventListener('blur', this.blurHandler);
        }
    }

    /**
     * Setup mobile pause button.
     */
    setupPauseButton() {
        if (!this.config.allowPauseButton) {
            return;
        }

        // Check if mobile
        const isMobile = this.scene.sys.game.device.input.touch
            && !this.scene.sys.game.device.os.desktop;

        if (!isMobile) {
            return;
        }

        const buttonSize = 40;
        const padding = 16;
        this.pauseButtonSize = buttonSize;
        this.pauseButtonPadding = padding;

        // Create pause button (two vertical bars = pause symbol)
        this.pauseButton = this.scene.add.container(0, 0);
        this.pauseButton.setDepth(100);
        this.pauseButton.setScrollFactor(0);

        const bg = this.scene.add.circle(buttonSize * 0.5, buttonSize * 0.5, buttonSize * 0.5, 0x000000, 0.5);
        this.pauseButton.add(bg);

        // Pause bars
        const bar1 = this.scene.add.rectangle(buttonSize * 0.35, buttonSize * 0.5, 6, 20, 0xffffff);
        const bar2 = this.scene.add.rectangle(buttonSize * 0.65, buttonSize * 0.5, 6, 20, 0xffffff);
        this.pauseButton.add(bar1);
        this.pauseButton.add(bar2);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.toggle());

        this.positionPauseButton();
        this.pauseResizeHandler = () => this.positionPauseButton();
        this.scene.scale.on('resize', this.pauseResizeHandler);
    }

    positionPauseButton() {
        if (!this.pauseButton) {
            return;
        }
        const { width } = this.scene.scale;
        const buttonSize = this.pauseButtonSize || 40;
        const padding = this.pauseButtonPadding || 16;
        this.pauseButton.setPosition(width - buttonSize - padding, padding);
    }

    /**
     * Cleanup when scene shuts down.
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
        }

        if (this.pauseButton) {
            this.pauseButton.destroy();
        }

        if (this.pauseResizeHandler) {
            this.scene.scale.off('resize', this.pauseResizeHandler);
            this.pauseResizeHandler = null;
        }

        // Remove window event listener
        if (typeof window !== 'undefined' && this.blurHandler) {
            window.removeEventListener('blur', this.blurHandler);
        }

        this._isPaused = false;
        this.menuItems = [];
    }
}

// ----------------------------------------------------------------------------
// QUICK INTEGRATION HELPER
// ----------------------------------------------------------------------------
// Call this once in your game scene's create() method
// ----------------------------------------------------------------------------

/**
 * Quick-add pause overlay to a scene.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @returns {PauseOverlay} The pause overlay instance
 */
export function addPauseOverlay(scene) {
    return new PauseOverlay(scene, {
        onResume: () => {
            // Game resumes automatically
        },
        onQuit: () => {
            scene.scene.start('MenuScene');
        },
        onSettings: () => {
            // Could launch settings as overlay or full scene
            // For now, just resume and go to settings
            scene.scene.start('SettingsScene');
        }
    });
}

// ----------------------------------------------------------------------------
// INTEGRATION EXAMPLE
// ----------------------------------------------------------------------------

/*
INTEGRATION EXAMPLE (do not uncomment, this is documentation):

// In game-scene.js:

import { addPauseOverlay } from './systems/pause-overlay.js';

// In create():
this.pauseOverlay = addPauseOverlay(this);

// In update():
update(time, delta) {
    // Skip update if paused
    if (this.pauseOverlay.isPaused()) {
        return;
    }

    // Normal game update...
}

// In cleanup():
cleanup() {
    this.pauseOverlay.destroy();
    // ... other cleanup
}
*/
