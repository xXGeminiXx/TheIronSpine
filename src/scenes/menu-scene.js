/**
 * menu-scene.js - Main Menu Screen
 *
 * The first screen players see. Provides access to:
 *   - START: Begin a new game run
 *   - HOW TO PLAY: Interactive tutorial (8 pages)
 *   - SETTINGS: Configure screen shake, grid, endless mode
 *
 * Also displays:
 *   - Player stats summary (total runs, win rate, best wave)
 *   - Achievement progress
 *   - Current version
 *
 * KEYBOARD SHORTCUTS:
 *   Enter/Space - Start game
 *   T           - Open tutorial
 *   S           - Open settings
 */

import { PALETTE, UI, RENDER, BUILD } from '../config.js';
import { SETTINGS } from '../core/settings.js';
import { formatNumber, toNumberSafe } from '../core/verylargenumbers.js';
import { getStatsSummary } from '../systems/stats-tracker.js';
import { getAchievementSummary } from '../systems/achievements.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // ------------------------------------------------------------------------
        // BACKGROUND
        // ------------------------------------------------------------------------
        this.add.rectangle(0, 0, width, height,
            Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        // ------------------------------------------------------------------------
        // TITLE AND SUBTITLE
        // ------------------------------------------------------------------------
        const titleText = this.add.text(width * 0.5, height * 0.22, 'IRON SPINE', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.uiText,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        titleText.setResolution(RENDER.textResolution);

        const subtitleText = this.add.text(width * 0.5, height * 0.32, 'STEER. COLLECT. MERGE. SURVIVE.', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.uiText
        }).setOrigin(0.5);
        subtitleText.setResolution(RENDER.textResolution);

        // Lore text
        const loreText = this.add.text(width * 0.5, height * 0.39,
            'An articulated war machine, reborn from a 1944 patent.', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText,
            alpha: 0.8
        }).setOrigin(0.5);
        loreText.setResolution(RENDER.textResolution);

        // Mode indicator (Classic vs Endless)
        const modeText = SETTINGS.endlessMode ? 'ENDLESS MODE' : 'Clear 20 waves to win.';
        const modeColor = SETTINGS.endlessMode ? PALETTE.warning : PALETTE.uiText;
        const winText = this.add.text(width * 0.5, height * 0.44, modeText, {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: modeColor
        }).setOrigin(0.5);
        winText.setResolution(RENDER.textResolution);

        // ------------------------------------------------------------------------
        // MENU BUTTONS
        // ------------------------------------------------------------------------
        // Adjusted positions to fit all three buttons nicely
        const buttonStartY = height * 0.54;
        const buttonSpacing = 0.08;

        // START button
        const startText = this.add.text(width * 0.5, buttonStartY, 'START', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        startText.setResolution(RENDER.textResolution);
        this.makeInteractive(startText, () => this.scene.start('GameScene'));

        // HOW TO PLAY button
        const tutorialText = this.add.text(width * 0.5, buttonStartY + height * buttonSpacing,
            'HOW TO PLAY', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        tutorialText.setResolution(RENDER.textResolution);
        this.makeInteractive(tutorialText, () => this.scene.start('TutorialScene'));

        // SETTINGS button
        const settingsText = this.add.text(width * 0.5, buttonStartY + height * buttonSpacing * 2,
            'SETTINGS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        settingsText.setResolution(RENDER.textResolution);
        this.makeInteractive(settingsText, () => this.scene.start('SettingsScene'));

        // ------------------------------------------------------------------------
        // PLAYER STATS SUMMARY (bottom left)
        // ------------------------------------------------------------------------
        // Show stats from previous runs to encourage replayability
        this.createStatsSummary(width, height);

        // ------------------------------------------------------------------------
        // ACHIEVEMENT PROGRESS (bottom right)
        // ------------------------------------------------------------------------
        this.createAchievementProgress(width, height);

        // ------------------------------------------------------------------------
        // VERSION DISPLAY (bottom center)
        // ------------------------------------------------------------------------
        const versionText = this.add.text(width * 0.5, height * 0.96, BUILD.version, {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.5
        }).setOrigin(0.5);
        versionText.setResolution(RENDER.textResolution);

        // ------------------------------------------------------------------------
        // KEYBOARD SHORTCUTS
        // ------------------------------------------------------------------------
        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                    this.scene.start('GameScene');
                }
                if (event.code === 'KeyT') {
                    this.scene.start('TutorialScene');
                }
                if (event.code === 'KeyS') {
                    this.scene.start('SettingsScene');
                }
            };
            this.input.keyboard.on('keydown', this.keyHandler);
        }

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
        });
    }

    /**
     * Make a text element interactive with hover effects.
     *
     * @param {Phaser.GameObjects.Text} textObj - The text to make interactive
     * @param {Function} callback - Function to call on click
     */
    makeInteractive(textObj, callback) {
        textObj.setInteractive({ useHandCursor: true });

        textObj.on('pointerover', () => {
            textObj.setAlpha(0.7);
        });

        textObj.on('pointerout', () => {
            textObj.setAlpha(1);
        });

        textObj.on('pointerdown', callback);
    }

    /**
     * Create the stats summary display in bottom-left corner.
     * Shows total runs, win rate, and best wave reached.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     */
    createStatsSummary(width, height) {
        // Get stats from tracker (returns defaults if no data)
        const stats = getStatsSummary();
        const totalRuns = toNumberSafe(stats.totalRuns, 0);

        // Only show if player has at least one run
        if (totalRuns === 0) {
            return;
        }

        const statsLines = [
            `Runs: ${formatNumber(stats.totalRuns, 0)}`,
            `Win Rate: ${stats.winRate}%`,
            `Best Wave: ${formatNumber(stats.highestWave, 0)}`
        ];

        // Add streak if relevant
        if (toNumberSafe(stats.currentStreak, 0) > 0) {
            statsLines.push(`Streak: ${formatNumber(stats.currentStreak, 0)}`);
        }

        const statsText = this.add.text(width * 0.05, height * 0.88, statsLines.join('\n'), {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.7,
            lineSpacing: 2
        }).setOrigin(0, 0);
        statsText.setResolution(RENDER.textResolution);
    }

    /**
     * Create the achievement progress display in bottom-right corner.
     * Shows percentage complete and total points.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     */
    createAchievementProgress(width, height) {
        const progress = getAchievementSummary();

        // Only show if player has earned any points
        if (progress.earnedPoints === 0) {
            return;
        }

        const progressLines = [
            `Achievements: ${progress.percentComplete}%`,
            `Points: ${formatNumber(progress.earnedPoints, 0)}/${formatNumber(progress.totalPoints, 0)}`
        ];

        const progressText = this.add.text(width * 0.95, height * 0.88,
            progressLines.join('\n'), {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.7,
            align: 'right',
            lineSpacing: 2
        }).setOrigin(1, 0);
        progressText.setResolution(RENDER.textResolution);
    }
}
