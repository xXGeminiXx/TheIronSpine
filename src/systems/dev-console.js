import { COLORS, PALETTE, TRAIN, UI, RENDER } from '../config.js';
import { pickRandom } from '../core/math.js';
import { SETTINGS, toggleSetting } from '../core/settings.js';

const CONSOLE_DEPTH = 220;

export class DevConsole {
    constructor(scene, train, spawner, combatSystem, pickupManager, eventHandlers = {}) {
        this.scene = scene;
        this.train = train;
        this.spawner = spawner;
        this.combatSystem = combatSystem;
        this.pickupManager = pickupManager;
        this.eventHandlers = eventHandlers;
        this.isOpen = false;

        this.panel = scene.add.rectangle(0, 0, 520, 360, 0x101522, 0.92);
        this.panel.setStrokeStyle(2, 0x2d3b5c);
        this.panel.setScrollFactor(0);
        this.panel.setDepth(CONSOLE_DEPTH);

        this.titleText = scene.add.text(0, 0, 'DEV CONSOLE', {
            fontFamily: UI.fontFamily,
            fontSize: '20px',
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 3
        });
        this.titleText.setResolution(RENDER.textResolution);
        this.titleText.setScrollFactor(0);
        this.titleText.setDepth(CONSOLE_DEPTH + 1);
        this.titleText.setOrigin(0.5, 0);

        this.bodyText = scene.add.text(0, 0, '', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText,
            lineSpacing: 6
        });
        this.bodyText.setResolution(RENDER.textResolution);
        this.bodyText.setScrollFactor(0);
        this.bodyText.setDepth(CONSOLE_DEPTH + 1);
        this.bodyText.setOrigin(0.5, 0);

        this.uiScale = 1;
        this.setVisible(false);
        this.layout();
        this.refreshText();

        this.toggleHandler = (event) => {
            // Only open with the numpad decimal key to avoid the main period key.
            if (event.code === 'NumpadDecimal') {
                this.toggle();
            }
        };
        this.keyHandler = (event) => {
            if (!this.isOpen) {
                return;
            }
            this.handleKey(event.code);
        };

        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown', this.toggleHandler);
            this.scene.input.keyboard.on('keydown', this.keyHandler);
        }

        this.resizeHandler = () => this.layout();
        this.scene.scale.on('resize', this.resizeHandler);
    }

    layout() {
        const { width, height } = this.scene.scale;
        const scale = this.uiScale || 1;
        const panelWidth = Math.min(520, width * 0.9);
        const panelHeight = Math.min(360, height * 0.9);
        const panelX = width * 0.5;
        const panelY = height * 0.5;

        this.panel.setPosition(panelX * scale, panelY * scale);
        this.panel.setSize(panelWidth, panelHeight);

        this.titleText.setPosition(
            panelX * scale,
            (panelY - panelHeight * 0.5 + 18) * scale
        );
        this.bodyText.setPosition(
            panelX * scale,
            (panelY - panelHeight * 0.5 + 52) * scale
        );

        this.panel.setScale(scale);
        this.titleText.setScale(scale);
        this.bodyText.setScale(scale);
    }

    setUiScale(scale) {
        const clamped = Math.max(0.6, Math.min(scale, 1.2));
        if (Math.abs(clamped - this.uiScale) < 0.001) {
            return;
        }
        this.uiScale = clamped;
        this.layout();
    }

    setVisible(isVisible) {
        this.panel.setVisible(isVisible);
        this.titleText.setVisible(isVisible);
        this.bodyText.setVisible(isVisible);
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.setVisible(this.isOpen);
        if (this.isOpen) {
            this.refreshText();
        }
    }

    refreshText() {
        const lines = [
            '1: Pickup (random)',
            '2: Pickup (red)  3: Pickup (blue)  4: Pickup (yellow)',
            '5: Spawn skirmishers x5',
            '6: Spawn champion  7: Spawn boss',
            '8: Clear enemies',
            `9: Invincible [${SETTINGS.invincible ? 'ON' : 'OFF'}]`,
            `H: Hitboxes [${SETTINGS.showHitboxes ? 'ON' : 'OFF'}]`,
            `O: Debug overlay [${SETTINGS.debugOverlay ? 'ON' : 'OFF'}]`,
            `D: Debug enabled [${SETTINGS.debugEnabled ? 'ON' : 'OFF'}]`,
            `L: Log events [${SETTINGS.logEvents ? 'ON' : 'OFF'}]`,
            `G: Grid [${SETTINGS.showGrid ? 'ON' : 'OFF'}]`,
            `S: Screen shake [${SETTINGS.screenShake ? 'ON' : 'OFF'}]`,
            'N: Force next wave',
            'W: Win run'
        ];

        this.bodyText.setText(lines.join('\n'));
    }

    handleKey(code) {
        switch (code) {
            case 'Digit1':
            case 'Numpad1':
                this.spawnPickup(pickRandom(Object.keys(COLORS)));
                break;
            case 'Digit2':
            case 'Numpad2':
                this.spawnPickup('red');
                break;
            case 'Digit3':
            case 'Numpad3':
                this.spawnPickup('blue');
                break;
            case 'Digit4':
            case 'Numpad4':
                this.spawnPickup('yellow');
                break;
            case 'Digit5':
            case 'Numpad5':
                this.spawner.spawnDebugSkirmishers(5);
                break;
            case 'Digit6':
            case 'Numpad6':
                this.spawner.spawnDebugEnemy('champion');
                break;
            case 'Digit7':
            case 'Numpad7':
                this.spawner.spawnDebugEnemy('boss');
                break;
            case 'Digit8':
            case 'Numpad8':
                this.combatSystem.clear();
                break;
            case 'Digit9':
            case 'Numpad9':
                toggleSetting('invincible');
                this.refreshText();
                break;
            case 'KeyH':
                toggleSetting('showHitboxes');
                this.refreshText();
                break;
            case 'KeyO':
                toggleSetting('debugOverlay');
                this.refreshText();
                break;
            case 'KeyD':
                toggleSetting('debugEnabled');
                this.refreshText();
                break;
            case 'KeyL':
                toggleSetting('logEvents');
                this.refreshText();
                break;
            case 'KeyG':
                toggleSetting('showGrid');
                this.refreshText();
                break;
            case 'KeyS':
                toggleSetting('screenShake');
                this.refreshText();
                break;
            case 'KeyN':
                this.spawner.forceNextWave();
                break;
            case 'KeyW':
                if (this.eventHandlers.onWin) {
                    this.eventHandlers.onWin();
                }
                break;
            default:
                break;
        }
    }

    spawnPickup(colorKey) {
        const engine = this.train.engine;
        const offset = TRAIN.engineSize.width * 0.9;
        const position = {
            x: engine.x + Math.cos(engine.rotation) * offset,
            y: engine.y + Math.sin(engine.rotation) * offset
        };
        const velocity = { x: 0, y: 0 };
        this.pickupManager.spawnPickup(position, colorKey, velocity);
    }

    destroy() {
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.toggleHandler);
            this.scene.input.keyboard.off('keydown', this.keyHandler);
        }
        this.scene.scale.off('resize', this.resizeHandler);
        this.panel.destroy();
        this.titleText.destroy();
        this.bodyText.destroy();
    }
}
