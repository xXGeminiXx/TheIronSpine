/**
 * tutorial-scene.js - Interactive How-to-Play Guide
 *
 * A multi-page tutorial that teaches players the core mechanics of Iron Spine.
 * Accessible from the main menu, this scene walks through:
 *   - Basic controls (steering, boost)
 *   - Car colors and their weapon types
 *   - The merge system (2048-style adjacent pair merging)
 *   - Combat and survival tips
 *   - Win/lose conditions
 *
 * DESIGN PHILOSOPHY:
 *   - Visual demonstrations over walls of text
 *   - Each page focuses on ONE concept
 *   - Players can skip or navigate freely
 *   - Mobile-friendly touch targets
 *
 * EXTENSIBILITY:
 *   To add a new tutorial page:
 *   1. Add a new entry to TUTORIAL_PAGES array
 *   2. Each page needs: title, content lines, and optional demo function
 *   3. Demo functions can draw animated examples on the page
 *
 * INTEGRATION:
 *   - Add 'HOW TO PLAY' button in menu-scene.js
 *   - Register TutorialScene in main.js scene array
 */

import { PALETTE, UI, RENDER, COLORS } from '../config.js';

// ----------------------------------------------------------------------------
// TUTORIAL PAGE DEFINITIONS
// ----------------------------------------------------------------------------
// Each page is an object with:
//   title:   Large header text
//   lines:   Array of instruction text lines
//   demo:    Optional function(scene, x, y, width, height) to draw visuals
// ----------------------------------------------------------------------------

const TUTORIAL_PAGES = [
    {
        title: 'THE IRON SPINE',
        lines: [
            'You command an articulated war train.',
            'Steel. Firepower. Destruction.',
            '',
            'Collect cars. Merge them. Obliterate.',
            'Clear 20 waves to win.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.4;

            // Draw a mini train
            const engine = scene.add.rectangle(centerX - 60, centerY, 54, 28, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);

            const colors = [0xff4444, 0x4444ff, 0xffcc00];
            for (let i = 0; i < 3; i++) {
                const car = scene.add.rectangle(centerX - 10 + i * 44, centerY, 36, 24, colors[i]);
                car.setStrokeStyle(2, 0xffffff);
                scene.tutorialElements.push(car);

                const coupling = scene.add.circle(centerX - 30 + i * 44, centerY, 5, 0x888888);
                scene.tutorialElements.push(coupling);
            }

            // Pulse the engine accent
            scene.tweens.add({
                targets: engine,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    },
    {
        title: 'CONTROLS',
        lines: [
            'POINTER/FINGER: Steer the train',
            'CLICK/TAP: Boost (2s speed, 5s cooldown)',
            'E or PULSE: Screen-wide attack',
            'R or SORT: Reorder cars for merges',
            '',
            'The engine always moves forward.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Engine
            const engine = scene.add.rectangle(centerX - 30, centerY, 50, 24, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);

            // Pointer with trail
            const pointer = scene.add.circle(centerX + 60, centerY - 20, 8, 0xffffff, 0.9);
            scene.tutorialElements.push(pointer);

            // Animate pointer in smooth arc
            scene.tweens.add({
                targets: pointer,
                x: centerX + 80,
                y: centerY + 30,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Speed lines on boost
            for (let i = 0; i < 4; i++) {
                const line = scene.add.rectangle(
                    centerX - 70 - i * 12,
                    centerY,
                    20 + i * 5,
                    2,
                    0xffa500,
                    0.5 - i * 0.1
                );
                scene.tutorialElements.push(line);

                scene.tweens.add({
                    targets: line,
                    x: line.x - 40,
                    alpha: 0,
                    duration: 400,
                    delay: 2000 + i * 80,
                    repeat: -1,
                    repeatDelay: 2500
                });
            }
        }
    },
    {
        title: 'WEAPONS',
        lines: [
            'Cars auto-fire. You just steer.',
            '',
            'RED: Rapid tracers (high DPS)',
            'BLUE: Frost orbs (slows enemies)',
            'YELLOW: Heavy bolts (pierces armor)'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const startY = y + h * 0.2;
            const spacing = 50;

            const weaponData = [
                { color: 0xff4444, label: 'RAPID FIRE', shape: 'dart' },
                { color: 0x4444ff, label: 'FREEZE', shape: 'orb' },
                { color: 0xffcc00, label: 'PIERCE', shape: 'bolt' }
            ];

            weaponData.forEach((data, i) => {
                const rowY = startY + i * spacing;

                // Car
                const car = scene.add.rectangle(centerX - 80, rowY, 40, 28, data.color);
                car.setStrokeStyle(2, 0xffffff);
                scene.tutorialElements.push(car);

                // Projectile based on shape
                let proj;
                if (data.shape === 'dart') {
                    proj = scene.add.rectangle(centerX, rowY, 12, 3, data.color);
                } else if (data.shape === 'orb') {
                    proj = scene.add.circle(centerX, rowY, 6, data.color);
                } else {
                    proj = scene.add.rectangle(centerX, rowY, 16, 5, data.color);
                }
                scene.tutorialElements.push(proj);

                // Fire animation
                scene.tweens.add({
                    targets: proj,
                    x: centerX + 80,
                    alpha: { from: 1, to: 0.3 },
                    duration: 350 + i * 100,
                    repeat: -1,
                    repeatDelay: 300 + i * 150
                });
            });
        }
    },
    {
        title: 'MERGING',
        lines: [
            '2 adjacent same-color, same-tier cars',
            'automatically MERGE into a stronger one.',
            '',
            'Tier 2 = 2x power. Tier 3 = 3x power.',
            'Strategic collection order matters!'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Two T1 cars
            const car1 = scene.add.rectangle(centerX - 55, centerY, 36, 26, 0xff4444);
            car1.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car1);

            const car2 = scene.add.rectangle(centerX + 55, centerY, 36, 26, 0xff4444);
            car2.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car2);

            const t1 = scene.add.text(centerX - 55, centerY, '1', {
                fontFamily: UI.fontFamily, fontSize: '18px', color: '#ffffff'
            }).setOrigin(0.5);
            t1.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(t1);

            const t2 = scene.add.text(centerX + 55, centerY, '1', {
                fontFamily: UI.fontFamily, fontSize: '18px', color: '#ffffff'
            }).setOrigin(0.5);
            t2.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(t2);

            // Merged T2 car
            const merged = scene.add.rectangle(centerX, centerY + 55, 48, 34, 0xff4444);
            merged.setStrokeStyle(3, 0xffffff);
            merged.setAlpha(0);
            scene.tutorialElements.push(merged);

            const mergedT = scene.add.text(centerX, centerY + 55, '2', {
                fontFamily: UI.fontFamily, fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            mergedT.setResolution(RENDER.textResolution);
            mergedT.setAlpha(0);
            scene.tutorialElements.push(mergedT);

            const arrow = scene.add.text(centerX, centerY + 28, 'v', {
                fontFamily: UI.fontFamily, fontSize: '20px', color: PALETTE.warning
            }).setOrigin(0.5).setAlpha(0);
            scene.tutorialElements.push(arrow);

            // Animation
            scene.tweens.timeline({
                loop: -1,
                loopDelay: 1200,
                tweens: [
                    { targets: [car1, t1], x: centerX - 22, duration: 600, ease: 'Power2' },
                    { targets: [car2, t2], x: centerX + 22, duration: 600, ease: 'Power2', offset: 0 },
                    { targets: [car1, car2, t1, t2], alpha: 0, duration: 150 },
                    { targets: arrow, alpha: 1, duration: 150 },
                    { targets: [merged, mergedT], alpha: 1, duration: 250 },
                    { targets: [merged, mergedT, arrow], alpha: 0, duration: 200, delay: 700 },
                    { targets: [car1, t1], x: centerX - 55, alpha: 1, duration: 0 },
                    { targets: [car2, t2], x: centerX + 55, alpha: 1, duration: 0 }
                ]
            });
        }
    },
    {
        title: 'SURVIVAL',
        lines: [
            'If a car is destroyed, the chain BREAKS.',
            'All cars behind it are LOST.',
            '',
            'Protect your engine (55 HP).',
            'Engine dies = Game Over.',
            '',
            'Press D to drop your tail car.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Engine
            const engine = scene.add.rectangle(centerX - 80, centerY, 50, 24, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);

            // Chain of cars
            const cars = [];
            for (let i = 0; i < 3; i++) {
                const car = scene.add.rectangle(centerX - 30 + i * 44, centerY, 36, 24, 0xff4444);
                car.setStrokeStyle(2, 0xffffff);
                scene.tutorialElements.push(car);
                cars.push(car);
            }

            // Enemy attacking middle car
            const enemy = scene.add.rectangle(centerX + 20, centerY - 50, 20, 14, 0xb0b0b0);
            enemy.setStrokeStyle(2, 0xff6666);
            scene.tutorialElements.push(enemy);

            // Break animation - middle car destroyed, trailing car fades
            scene.tweens.add({
                targets: cars[1],
                alpha: 0.3,
                duration: 300,
                delay: 1500,
                yoyo: true,
                hold: 200,
                repeat: -1,
                repeatDelay: 2000
            });

            scene.tweens.add({
                targets: cars[2],
                alpha: 0.2,
                y: centerY + 30,
                duration: 400,
                delay: 1650,
                yoyo: true,
                hold: 200,
                repeat: -1,
                repeatDelay: 1900
            });
        }
    },
    {
        title: 'OVERDRIVE PULSE',
        lines: [
            'The PULSE meter charges over 40 seconds.',
            'When ready, press E to blast ALL enemies.',
            '',
            'Deals 40 damage screen-wide.',
            'Save it for swarms or bosses!'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Meter
            const meterBg = scene.add.rectangle(centerX, centerY, 140, 18, 0x222222);
            meterBg.setStrokeStyle(1, 0x444444);
            scene.tutorialElements.push(meterBg);

            const meterFill = scene.add.rectangle(centerX - 70, centerY, 0, 14, 0xffcc00);
            meterFill.setOrigin(0, 0.5);
            scene.tutorialElements.push(meterFill);

            scene.tweens.add({
                targets: meterFill,
                width: 140,
                duration: 2500,
                repeat: -1,
                repeatDelay: 1200
            });

            // PULSE! explosion effect
            const pulseRing = scene.add.circle(centerX, centerY + 50, 10, 0xffcc00, 0);
            pulseRing.setStrokeStyle(3, 0xffcc00);
            pulseRing.setAlpha(0);
            scene.tutorialElements.push(pulseRing);

            scene.tweens.add({
                targets: pulseRing,
                radius: 60,
                alpha: { from: 1, to: 0 },
                duration: 500,
                delay: 2600,
                repeat: -1,
                repeatDelay: 3200
            });

            const pulseText = scene.add.text(centerX, centerY + 50, 'PULSE!', {
                fontFamily: UI.fontFamily, fontSize: '16px', color: PALETTE.warning
            }).setOrigin(0.5).setAlpha(0);
            pulseText.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(pulseText);

            scene.tweens.add({
                targets: pulseText,
                alpha: 1,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 300,
                delay: 2600,
                yoyo: true,
                hold: 300,
                repeat: -1,
                repeatDelay: 3000
            });
        }
    },
    {
        title: 'VICTORY',
        lines: [
            'Clear all 20 WAVES to win.',
            '',
            'Wave 5, 15: Champion (tougher enemy)',
            'Wave 10, 20: BOSS (heavy armor)',
            '',
            'Or enable ENDLESS MODE in settings',
            'for infinite waves. How far can you go?'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.3;

            const waveText = scene.add.text(centerX, centerY, 'WAVE 20', {
                fontFamily: UI.fontFamily,
                fontSize: '32px',
                color: PALETTE.warning,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            waveText.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(waveText);

            const victoryText = scene.add.text(centerX, centerY + 45, 'VICTORY!', {
                fontFamily: UI.fontFamily,
                fontSize: '24px',
                color: '#44ff44'
            }).setOrigin(0.5).setAlpha(0);
            victoryText.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(victoryText);

            scene.tweens.add({
                targets: victoryText,
                alpha: 1,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 600,
                delay: 800,
                yoyo: true,
                repeat: -1,
                repeatDelay: 1200
            });
        }
    }
];

// ----------------------------------------------------------------------------
// TUTORIAL SCENE CLASS
// ----------------------------------------------------------------------------

export class TutorialScene extends Phaser.Scene {
    constructor() {
        super('TutorialScene');
    }

    create() {
        const { width, height } = this.scale;

        // Track all elements for cleanup when changing pages
        this.tutorialElements = [];

        // Current page index
        this.currentPage = 0;

        // Background
        this.add.rectangle(0, 0, width, height,
            Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        // Title area
        this.titleText = this.add.text(width * 0.5, height * 0.08, '', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize * 0.7}px`,
            color: PALETTE.warning,
            stroke: PALETTE.uiShadow,
            strokeThickness: 3
        }).setOrigin(0.5);
        this.titleText.setResolution(RENDER.textResolution);

        // Content area
        this.contentText = this.add.text(width * 0.5, height * 0.55, '', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText,
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5, 0);
        this.contentText.setResolution(RENDER.textResolution);

        // Demo area bounds (for page demos to use)
        this.demoArea = {
            x: width * 0.15,
            y: height * 0.15,
            width: width * 0.7,
            height: height * 0.35
        };

        // Navigation buttons
        this.createNavigation(width, height);

        // Page indicator
        this.pageIndicator = this.add.text(width * 0.5, height * 0.95, '', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.pageIndicator.setResolution(RENDER.textResolution);

        // Back to menu button
        this.backButton = this.add.text(width * 0.5, height * 0.88, 'BACK TO MENU', {
            fontFamily: UI.fontFamily,
            fontSize: '18px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        this.backButton.setResolution(RENDER.textResolution);
        this.backButton.setInteractive({ useHandCursor: true });
        this.backButton.on('pointerdown', () => this.scene.start('MenuScene'));
        this.backButton.on('pointerover', () => this.backButton.setAlpha(0.7));
        this.backButton.on('pointerout', () => this.backButton.setAlpha(1));

        // Keyboard navigation
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-LEFT', () => this.prevPage());
            this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());
            this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
            this.input.keyboard.on('keydown-SPACE', () => this.nextPage());
        }

        // Load first page
        this.showPage(0);

        // Cleanup on shutdown
        this.events.once('shutdown', () => this.cleanup());
    }

    createNavigation(width, height) {
        const navY = height * 0.5;
        const buttonSize = 40;

        // Previous button (left arrow)
        this.prevButton = this.add.text(width * 0.08, navY, '<', {
            fontFamily: UI.fontFamily,
            fontSize: '36px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.prevButton.setResolution(RENDER.textResolution);
        this.prevButton.setInteractive({ useHandCursor: true });
        this.prevButton.on('pointerdown', () => this.prevPage());
        this.prevButton.on('pointerover', () => this.prevButton.setColor(PALETTE.warning));
        this.prevButton.on('pointerout', () => this.prevButton.setColor(PALETTE.uiText));

        // Next button (right arrow)
        this.nextButton = this.add.text(width * 0.92, navY, '>', {
            fontFamily: UI.fontFamily,
            fontSize: '36px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.nextButton.setResolution(RENDER.textResolution);
        this.nextButton.setInteractive({ useHandCursor: true });
        this.nextButton.on('pointerdown', () => this.nextPage());
        this.nextButton.on('pointerover', () => this.nextButton.setColor(PALETTE.warning));
        this.nextButton.on('pointerout', () => this.nextButton.setColor(PALETTE.uiText));
    }

    showPage(index) {
        // Clamp index
        index = Phaser.Math.Clamp(index, 0, TUTORIAL_PAGES.length - 1);
        this.currentPage = index;

        // Clear previous demo elements
        this.clearDemoElements();

        const page = TUTORIAL_PAGES[index];

        // Update title
        this.titleText.setText(page.title);

        // Update content
        this.contentText.setText(page.lines.join('\n'));

        // Update page indicator
        this.pageIndicator.setText(`${index + 1} / ${TUTORIAL_PAGES.length}`);

        // Update button visibility
        this.prevButton.setAlpha(index > 0 ? 1 : 0.3);
        this.nextButton.setAlpha(index < TUTORIAL_PAGES.length - 1 ? 1 : 0.3);

        // Run demo if exists
        if (page.demo) {
            page.demo(
                this,
                this.demoArea.x,
                this.demoArea.y,
                this.demoArea.width,
                this.demoArea.height
            );
        }
    }

    nextPage() {
        if (this.currentPage < TUTORIAL_PAGES.length - 1) {
            this.showPage(this.currentPage + 1);
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.showPage(this.currentPage - 1);
        }
    }

    clearDemoElements() {
        // Stop all tweens for tutorial elements
        this.tutorialElements.forEach(element => {
            this.tweens.killTweensOf(element);
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.tutorialElements = [];
    }

    cleanup() {
        this.clearDemoElements();
        if (this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
        }
    }
}
