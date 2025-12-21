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
