/**
 * main.js - Entry point for Iron Spine
 *
 * This file initializes the Phaser 3 game instance with all scene configurations.
 * The game uses ES modules loaded via CDN (no build tools required).
 *
 * SCENE FLOW:
 *   MenuScene      - Title screen, start/settings/tutorial buttons
 *   TutorialScene  - Interactive how-to-play guide (8 pages)
 *   SettingsScene  - Toggle screen shake, grid overlay, endless mode, etc.
 *   GameScene      - Main gameplay loop
 *   EndScene       - Victory/defeat stats, achievements, restart option
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
import { TutorialScene } from './scenes/tutorial-scene.js';
import { SettingsScene } from './scenes/settings-scene.js';
import { ChallengeScene } from './scenes/challenge-scene.js';
import { GameScene } from './scenes/game-scene.js';
import { EndScene } from './scenes/end-scene.js';
import { HighscoreScene } from './scenes/highscore-scene.js';

// ----------------------------------------------------------------------------
// PHASER CONFIGURATION
// ----------------------------------------------------------------------------
// Scene order matters: first scene in array is the initial scene.
// TutorialScene added between Menu and Settings for logical flow.
// ----------------------------------------------------------------------------

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
    // Scene registration order: Menu -> Tutorial -> Settings -> Challenge -> Highscores -> Game -> End
    scene: [MenuScene, TutorialScene, SettingsScene, ChallengeScene, HighscoreScene, GameScene, EndScene]
};

// Initialize the game
new Phaser.Game(config);
