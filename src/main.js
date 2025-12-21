/**
 * main.js - Entry point for Iron Spine
 *
 * This file initializes the Phaser 3 game instance with all scene configurations.
 * The game uses ES modules loaded via CDN (no build tools required).
 *
 * SCENE FLOW:
 *   MenuScene     - Title screen, start button
 *   SettingsScene - Toggle screen shake, grid overlay, etc.
 *   GameScene     - Main gameplay loop
 *   EndScene      - Victory/defeat stats, restart option
 *
 * SCALING:
 *   The game uses Phaser.Scale.FIT to maintain aspect ratio while filling
 *   the browser window. Base resolution is 960x540 (16:9).
 *
 * TO RUN:
 *   Open index.html in a browser, or use a local server:
 *   python -m http.server 8000
 */

import { GAME, PALETTE, RENDER } from './config.js';
import { MenuScene } from './scenes/menu-scene.js';
import { SettingsScene } from './scenes/settings-scene.js';
import { GameScene } from './scenes/game-scene.js';
import { EndScene } from './scenes/end-scene.js';

const config = {
    type: Phaser.AUTO,
    width: GAME.width,
    height: GAME.height,
    backgroundColor: PALETTE.background,
    parent: 'game-root',
    resolution: RENDER.resolution,
    render: {
        pixelArt: false,
        antialias: true,
        antialiasGL: true,
        antialiasFXAA: true,
        roundPixels: false
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME.width,
        height: GAME.height
    },
    scene: [MenuScene, SettingsScene, GameScene, EndScene]
};

new Phaser.Game(config);
