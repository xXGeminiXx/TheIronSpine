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
        title: 'STEERING',
        lines: [
            'Move your pointer (or finger) to steer.',
            'The engine always moves forward.',
            'Your train follows where you point.',
            '',
            'TIP: Wide turns keep your cars safe.'
        ],
        demo: (scene, x, y, w, h) => {
            // Draw a simple pointer-to-engine visualization
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.4;

            // Engine representation
            const engine = scene.add.rectangle(centerX - 40, centerY, 50, 24, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);

            // Pointer indicator
            const pointer = scene.add.circle(centerX + 60, centerY - 30, 10, 0xffffff, 0.8);
            scene.tutorialElements.push(pointer);

            // Dashed line from engine to pointer
            const line = scene.add.graphics();
            line.lineStyle(2, 0xffffff, 0.4);
            line.lineBetween(centerX - 15, centerY, centerX + 60, centerY - 30);
            scene.tutorialElements.push(line);

            // Animate pointer in circle
            scene.tweens.add({
                targets: pointer,
                x: centerX + 80,
                y: centerY + 40,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    },
    {
        title: 'BOOST',
        lines: [
            'Tap or click to activate BOOST.',
            'Your train speeds up for 2 seconds.',
            '5 second cooldown between boosts.',
            '',
            'Use boost to escape danger or',
            'quickly reach pickups.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.4;

            // Speed lines effect
            for (let i = 0; i < 5; i++) {
                const lineY = centerY - 30 + i * 15;
                const speedLine = scene.add.rectangle(
                    centerX - 20 - i * 10,
                    lineY,
                    40 + i * 8,
                    3,
                    0xffa500,
                    0.6 - i * 0.1
                );
                scene.tutorialElements.push(speedLine);

                scene.tweens.add({
                    targets: speedLine,
                    x: speedLine.x - 30,
                    alpha: 0,
                    duration: 600,
                    delay: i * 100,
                    repeat: -1,
                    repeatDelay: 800
                });
            }

            // Engine
            const engine = scene.add.rectangle(centerX + 30, centerY, 50, 24, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);
        }
    },
    {
        title: 'CAR COLORS',
        lines: [
            'Each color has a unique weapon:',
            '',
            'RED - Rapid-fire machine gun',
            'BLUE - Slow cryo (freezes enemies)',
            'YELLOW - Armor-piercing cannon',
            '',
            'Cars fire automatically at enemies.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const startY = y + h * 0.25;
            const spacing = 45;

            const colorData = [
                { key: 'red', label: 'RAPID', color: 0xff4444 },
                { key: 'blue', label: 'FREEZE', color: 0x4444ff },
                { key: 'yellow', label: 'PIERCE', color: 0xffcc00 }
            ];

            colorData.forEach((data, i) => {
                const carY = startY + i * spacing;

                // Car box
                const car = scene.add.rectangle(centerX - 60, carY, 36, 26, data.color);
                car.setStrokeStyle(2, 0xffffff);
                scene.tutorialElements.push(car);

                // Weapon label
                const label = scene.add.text(centerX - 20, carY, data.label, {
                    fontFamily: UI.fontFamily,
                    fontSize: '14px',
                    color: PALETTE.uiText
                }).setOrigin(0, 0.5);
                label.setResolution(RENDER.textResolution);
                scene.tutorialElements.push(label);

                // Bullet representation
                const bulletX = centerX + 50;
                const bullet = scene.add.circle(bulletX, carY, 4, data.color);
                scene.tutorialElements.push(bullet);

                scene.tweens.add({
                    targets: bullet,
                    x: bulletX + 40,
                    alpha: 0,
                    duration: 400,
                    repeat: -1,
                    repeatDelay: 600 - i * 150
                });
            });
        }
    },
    {
        title: 'MERGING',
        lines: [
            'When 2 adjacent same-color,',
            'same-tier cars touch...',
            '',
            'They MERGE into 1 stronger car!',
            '',
            'Higher tiers = more damage.',
            'This is the core strategy.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Two cars approaching
            const car1 = scene.add.rectangle(centerX - 50, centerY, 36, 26, 0xff4444);
            car1.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car1);

            const car2 = scene.add.rectangle(centerX + 50, centerY, 36, 26, 0xff4444);
            car2.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car2);

            // Tier 1 labels
            const t1 = scene.add.text(centerX - 50, centerY, '1', {
                fontFamily: UI.fontFamily,
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);
            t1.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(t1);

            const t2 = scene.add.text(centerX + 50, centerY, '1', {
                fontFamily: UI.fontFamily,
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);
            t2.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(t2);

            // Merged car (hidden initially)
            const merged = scene.add.rectangle(centerX, centerY + 60, 44, 32, 0xff4444);
            merged.setStrokeStyle(3, 0xffffff);
            merged.setAlpha(0);
            scene.tutorialElements.push(merged);

            const mergedLabel = scene.add.text(centerX, centerY + 60, '2', {
                fontFamily: UI.fontFamily,
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            mergedLabel.setResolution(RENDER.textResolution);
            mergedLabel.setAlpha(0);
            scene.tutorialElements.push(mergedLabel);

            // Arrow
            const arrow = scene.add.text(centerX, centerY + 30, 'v', {
                fontFamily: UI.fontFamily,
                fontSize: '24px',
                color: PALETTE.warning
            }).setOrigin(0.5);
            arrow.setAlpha(0);
            scene.tutorialElements.push(arrow);

            // Animation sequence
            scene.tweens.timeline({
                loop: -1,
                loopDelay: 1500,
                tweens: [
                    {
                        targets: [car1, t1],
                        x: centerX - 20,
                        duration: 800,
                        ease: 'Power2'
                    },
                    {
                        targets: [car2, t2],
                        x: centerX + 20,
                        duration: 800,
                        ease: 'Power2',
                        offset: 0
                    },
                    {
                        targets: [car1, car2, t1, t2],
                        alpha: 0,
                        duration: 200
                    },
                    {
                        targets: arrow,
                        alpha: 1,
                        duration: 200
                    },
                    {
                        targets: [merged, mergedLabel],
                        alpha: 1,
                        duration: 300
                    },
                    {
                        targets: [merged, mergedLabel, arrow],
                        alpha: 0,
                        duration: 300,
                        delay: 800
                    },
                    {
                        targets: [car1, t1],
                        x: centerX - 50,
                        alpha: 1,
                        duration: 0
                    },
                    {
                        targets: [car2, t2],
                        x: centerX + 50,
                        alpha: 1,
                        duration: 0
                    }
                ]
            });
        }
    },
    {
        title: 'COLLECTING',
        lines: [
            'Pickups spawn around the arena.',
            'Drive your ENGINE into them.',
            '',
            'New cars attach to your tail.',
            'Arrange wisely for merges!',
            '',
            'Max train length: 12 cars.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Pickup representation
            const pickup = scene.add.rectangle(centerX + 60, centerY, 30, 30, 0xffcc00, 0.8);
            pickup.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(pickup);

            // Glow effect
            scene.tweens.add({
                targets: pickup,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Engine approaching
            const engine = scene.add.rectangle(centerX - 60, centerY, 50, 24, 0x4a4a4a);
            engine.setStrokeStyle(2, 0xffa500);
            scene.tutorialElements.push(engine);

            // Car following engine
            const car = scene.add.rectangle(centerX - 100, centerY, 36, 26, 0x4444ff);
            car.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car);

            // Coupling
            const coupling = scene.add.circle(centerX - 80, centerY, 5, 0x888888);
            scene.tutorialElements.push(coupling);
        }
    },
    {
        title: 'COMBAT',
        lines: [
            'Enemies attack your train.',
            'Cars auto-fire when enemies are near.',
            '',
            'If a car is destroyed, the chain',
            'breaks and trailing cars are lost!',
            '',
            'Protect your engine at all costs.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Enemy
            const enemy = scene.add.rectangle(centerX + 70, centerY, 24, 16, 0xb0b0b0);
            enemy.setStrokeStyle(2, 0xff6666);
            scene.tutorialElements.push(enemy);

            // Train segment
            const car = scene.add.rectangle(centerX - 40, centerY, 36, 26, 0xff4444);
            car.setStrokeStyle(2, 0xffffff);
            scene.tutorialElements.push(car);

            // Projectiles firing
            for (let i = 0; i < 3; i++) {
                const bullet = scene.add.circle(centerX, centerY, 3, 0xff4444);
                bullet.setAlpha(0);
                scene.tutorialElements.push(bullet);

                scene.tweens.add({
                    targets: bullet,
                    x: centerX + 60,
                    alpha: { from: 1, to: 0 },
                    duration: 300,
                    delay: i * 400,
                    repeat: -1,
                    repeatDelay: 900
                });
            }

            // Enemy flash on hit
            scene.tweens.add({
                targets: enemy,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: -1,
                repeatDelay: 400
            });
        }
    },
    {
        title: 'OVERDRIVE',
        lines: [
            'The PULSE meter charges over time.',
            'When full, press E (or PULSE button)',
            'to damage ALL enemies on screen.',
            '',
            'Save it for emergencies!',
            'Takes 40 seconds to recharge.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.35;

            // Pulse meter representation
            const meterBg = scene.add.rectangle(centerX, centerY, 120, 16, 0x333333);
            meterBg.setStrokeStyle(1, 0x666666);
            scene.tutorialElements.push(meterBg);

            const meterFill = scene.add.rectangle(centerX - 60, centerY, 0, 14, 0xffcc00);
            meterFill.setOrigin(0, 0.5);
            scene.tutorialElements.push(meterFill);

            // Fill animation
            scene.tweens.add({
                targets: meterFill,
                width: 120,
                duration: 3000,
                repeat: -1,
                repeatDelay: 1000
            });

            // READY text
            const readyText = scene.add.text(centerX, centerY + 30, 'PULSE READY!', {
                fontFamily: UI.fontFamily,
                fontSize: '14px',
                color: PALETTE.warning
            }).setOrigin(0.5);
            readyText.setResolution(RENDER.textResolution);
            readyText.setAlpha(0);
            scene.tutorialElements.push(readyText);

            scene.tweens.add({
                targets: readyText,
                alpha: 1,
                duration: 200,
                delay: 3000,
                yoyo: true,
                hold: 800,
                repeat: -1,
                repeatDelay: 3000
            });
        }
    },
    {
        title: 'WIN CONDITION',
        lines: [
            'Survive and clear 20 WAVES.',
            '',
            'Every 5th wave: Champion enemy',
            'Every 10th wave: BOSS enemy',
            '',
            'Enemies get stronger each wave.',
            'Build your train. Survive. Win.'
        ],
        demo: (scene, x, y, w, h) => {
            const centerX = x + w * 0.5;
            const centerY = y + h * 0.3;

            // Wave counter
            const waveText = scene.add.text(centerX, centerY, 'WAVE 20', {
                fontFamily: UI.fontFamily,
                fontSize: '28px',
                color: PALETTE.warning,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            waveText.setResolution(RENDER.textResolution);
            scene.tutorialElements.push(waveText);

            // Victory text
            const victoryText = scene.add.text(centerX, centerY + 40, 'VICTORY!', {
                fontFamily: UI.fontFamily,
                fontSize: '20px',
                color: '#00ff00'
            }).setOrigin(0.5);
            victoryText.setResolution(RENDER.textResolution);
            victoryText.setAlpha(0);
            scene.tutorialElements.push(victoryText);

            scene.tweens.add({
                targets: victoryText,
                alpha: 1,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 500,
                yoyo: true,
                repeat: -1,
                repeatDelay: 1500
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
