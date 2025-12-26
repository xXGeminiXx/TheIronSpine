/**
 * end-scene.js - Run Results Screen
 *
 * Displayed after a run ends (victory or defeat). Shows:
 *   - Run statistics (time, waves, kills, merges, etc.)
 *   - New personal bests achieved
 *   - Newly unlocked achievements with animated popups
 *   - Persistent stats updated via StatsTracker
 *
 * The scene also:
 *   - Records the run to persistent storage
 *   - Checks for newly unlocked achievements
 *   - Displays achievement unlock animations
 *
 * KEYBOARD SHORTCUTS:
 *   Enter/Space - Restart game
 *   S           - Open settings
 *   M           - Return to menu
 */

import { PALETTE, UI, RENDER } from '../config.js';
import { StatsTracker } from '../systems/stats-tracker.js';
import {
    AchievementTracker,
    popNotification,
    createAchievementPopup
} from '../systems/achievements.js';
import { formatNumber } from '../core/verylargenumbers.js';
import { DIFFICULTY_GOALS } from '../systems/endless-mode.js';
import { SETTINGS } from '../core/settings.js';

export class EndScene extends Phaser.Scene {
    constructor() {
        super('EndScene');
    }

    create(data) {
        const { width, height } = this.scale;
        const result = data.result || 'defeat';
        const stats = data.stats || {};

        // ------------------------------------------------------------------------
        // RECORD RUN TO PERSISTENT STORAGE
        // ------------------------------------------------------------------------
        // This saves the run data and returns any new personal bests
        const runResult = this.recordRun(result, stats);
        const newBests = runResult.newPersonalBests || [];

        // ------------------------------------------------------------------------
        // CHECK FOR NEW ACHIEVEMENTS
        // ------------------------------------------------------------------------
        // This compares run data against achievement thresholds
        const currentStats = StatsTracker.getStats();
        const runData = this.buildRunData(result, stats);
        AchievementTracker.checkAll(runData, currentStats);

        // ------------------------------------------------------------------------
        // BACKGROUND
        // ------------------------------------------------------------------------
        this.add.rectangle(0, 0, width, height,
            Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        // ------------------------------------------------------------------------
        // TITLE (Victory or Defeat)
        // ------------------------------------------------------------------------
        const titleText = result === 'victory' ? 'WAVES CLEARED' : 'ENGINE LOST';
        const titleColor = result === 'victory' ? PALETTE.warning : PALETTE.uiText;

        const title = this.add.text(width * 0.5, height * 0.15, titleText, {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: titleColor,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        title.setResolution(RENDER.textResolution);

        // ------------------------------------------------------------------------
        // RUN STATISTICS
        // ------------------------------------------------------------------------
        const statLines = this.buildStatLines(stats, newBests);
        const statsText = this.add.text(width * 0.5, height * 0.45, statLines.join('\n'), {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.statsFontSize}px`,
            color: PALETTE.uiText,
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5);
        statsText.setResolution(RENDER.textResolution);

        // ------------------------------------------------------------------------
        // NEW PERSONAL BESTS INDICATOR
        // ------------------------------------------------------------------------
        if (newBests.length > 0) {
            this.createNewBestsIndicator(width, height, newBests);
        }

        // ------------------------------------------------------------------------
        // ACTION BUTTONS
        // ------------------------------------------------------------------------
        // v1.5.0 Check if player completed 100-wave campaign and can continue to endless
        const canContinueToEndless = (
            result === 'victory' &&
            stats.wavesCleared >= 100 &&
            !SETTINGS.endlessMode
        );

        let retryText;
        let continueText;

        if (canContinueToEndless) {
            // Show "CONTINUE TO ENDLESS" option
            const difficulty = stats.difficulty || SETTINGS.difficulty || 'normal';
            const goalWave = DIFFICULTY_GOALS[difficulty] || 1000;
            const goalText = formatNumber(goalWave);

            continueText = this.add.text(width * 0.5, height * 0.72,
                `CONTINUE TO ENDLESS (Goal: Wave ${goalText})`, {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: '#00ff00'  // Green for continue
            }).setOrigin(0.5);
            continueText.setResolution(RENDER.textResolution);
            this.makeInteractive(continueText, () => {
                // Enable endless mode and restart
                SETTINGS.endlessMode = true;
                this.scene.start('GameScene');
            });

            // Retry button moved down
            retryText = this.add.text(width * 0.5, height * 0.82, 'RETRY CAMPAIGN [SPACE]', {
                fontFamily: UI.fontFamily,
                fontSize: '18px',
                color: PALETTE.uiText
            }).setOrigin(0.5);
        } else {
            // Standard retry button
            retryText = this.add.text(width * 0.5, height * 0.78, 'TAP OR CLICK TO RETRY', {
                fontFamily: UI.fontFamily,
                fontSize: `${UI.subtitleFontSize}px`,
                color: PALETTE.warning
            }).setOrigin(0.5);
        }
        retryText.setResolution(RENDER.textResolution);

        // Settings button (bottom left)
        const settingsText = this.add.text(width * 0.25, height * 0.88, 'SETTINGS [S]', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        settingsText.setResolution(RENDER.textResolution);
        this.makeInteractive(settingsText, () => this.scene.start('SettingsScene'));

        // Menu button (bottom right)
        const menuText = this.add.text(width * 0.75, height * 0.88, 'MENU [M]', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        menuText.setResolution(RENDER.textResolution);
        this.makeInteractive(menuText, () => this.scene.start('MenuScene'));

        // ------------------------------------------------------------------------
        // INPUT HANDLING
        // ------------------------------------------------------------------------
        // Click/tap to retry (but not if clicking settings/menu/continue)
        this.input.once('pointerdown', (pointer, gameObjects) => {
            const clickedButtons = gameObjects && (
                gameObjects.includes(settingsText) ||
                gameObjects.includes(menuText) ||
                (continueText && gameObjects.includes(continueText))
            );
            if (clickedButtons) {
                return;
            }
            this.scene.start('GameScene');
        });

        // Keyboard shortcuts
        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                    this.scene.start('GameScene');
                }
                if (event.code === 'KeyS') {
                    this.scene.start('SettingsScene');
                }
                if (event.code === 'KeyM') {
                    this.scene.start('MenuScene');
                }
            };
            this.input.keyboard.on('keydown', this.keyHandler);
        }

        // Cleanup on shutdown
        this.events.once('shutdown', () => {
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
        });

        // ------------------------------------------------------------------------
        // ACHIEVEMENT POPUP QUEUE
        // ------------------------------------------------------------------------
        // Process any pending achievement notifications with staggered timing
        this.time.delayedCall(500, () => this.processAchievementQueue());
    }

    /**
     * Record the completed run to persistent storage.
     *
     * @param {string} result - 'victory' or 'defeat'
     * @param {Object} stats - Run statistics
     * @returns {Object} Result with newPersonalBests array
     */
    recordRun(result, stats) {
        // Parse time string back to seconds if needed
        let timeSurvived = 0;
        if (typeof stats.timeSurvived === 'string') {
            // Format is "M:SS" - parse it
            const parts = stats.timeSurvived.split(':');
            if (parts.length === 2) {
                timeSurvived = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            }
        } else {
            timeSurvived = stats.timeSurvived || 0;
        }

        return StatsTracker.recordRun({
            result,
            timeSurvived,
            wavesCleared: stats.wavesCleared || 0,
            enemiesDestroyed: stats.enemiesDestroyed || 0,
            pulseHits: stats.pulseHits || 0,
            carsCollected: stats.carsCollected || 0,
            carsLost: stats.carsLost || 0,
            mergesCompleted: stats.mergesCompleted || 0,
            highestTier: stats.highestTier || 1
        });
    }

    /**
     * Build run data object for achievement checking.
     *
     * @param {string} result - 'victory' or 'defeat'
     * @param {Object} stats - Run statistics
     * @returns {Object} Run data for achievement checks
     */
    buildRunData(result, stats) {
        // Parse time if string
        let timeSurvived = 0;
        if (typeof stats.timeSurvived === 'string') {
            const parts = stats.timeSurvived.split(':');
            if (parts.length === 2) {
                timeSurvived = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            }
        } else {
            timeSurvived = stats.timeSurvived || 0;
        }

        return {
            result,
            timeSurvived,
            wavesCleared: stats.wavesCleared || 0,
            enemiesDestroyed: stats.enemiesDestroyed || 0,
            pulseHits: stats.pulseHits || 0,
            carsCollected: stats.carsCollected || 0,
            carsLost: stats.carsLost || 0,
            mergesCompleted: stats.mergesCompleted || 0,
            highestTier: stats.highestTier || 1,
            finalCarCount: stats.finalCarCount || 0
        };
    }

    /**
     * Build the stat lines for display, marking new personal bests.
     *
     * @param {Object} stats - Run statistics
     * @param {Array} newBests - Array of new personal best keys
     * @returns {Array<string>} Formatted stat lines
     */
    buildStatLines(stats, newBests) {
        const lines = [];

        // Time survived
        const timeLabel = newBests.includes('longestRun') ? 'Time: ' : 'Time: ';
        const timeSuffix = newBests.includes('fastestVictory') ? ' [BEST!]' : '';
        lines.push(`${timeLabel}${stats.timeSurvived || '0:00'}${timeSuffix}`);

        // Waves cleared
        const waveSuffix = newBests.includes('highestWave') ? ' [BEST!]' : '';
        const wavesFormatted = formatNumber(stats.wavesCleared || 0, 0);
        lines.push(`Waves Cleared: ${wavesFormatted}${waveSuffix}`);

        // Cars collected
        const carsSuffix = newBests.includes('mostCarsCollected') ? ' [BEST!]' : '';
        const carsCollectedFormatted = formatNumber(stats.carsCollected || 0, 0);
        lines.push(`Cars Collected: ${carsCollectedFormatted}${carsSuffix}`);

        // Cars lost
        const carsLostFormatted = formatNumber(stats.carsLost || 0, 0);
        lines.push(`Cars Lost: ${carsLostFormatted}`);

        // Merges
        const mergesSuffix = newBests.includes('mostMergesInRun') ? ' [BEST!]' : '';
        const mergesFormatted = formatNumber(stats.mergesCompleted || 0, 0);
        lines.push(`Merges: ${mergesFormatted}${mergesSuffix}`);

        // Enemies destroyed (use formatNumber for large counts)
        const killsSuffix = newBests.includes('mostKillsInRun') ? ' [BEST!]' : '';
        const killsFormatted = formatNumber(stats.enemiesDestroyed || 0, 0);
        lines.push(`Enemies Destroyed: ${killsFormatted}${killsSuffix}`);

        // Highest tier
        const tierSuffix = newBests.includes('highestTier') ? ' [BEST!]' : '';
        lines.push(`Highest Tier: ${stats.highestTier || 1}${tierSuffix}`);

        return lines;
    }

    /**
     * Create "NEW PERSONAL BESTS!" indicator.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @param {Array} newBests - Array of new best keys
     */
    createNewBestsIndicator(width, height, newBests) {
        const bestText = this.add.text(width * 0.5, height * 0.25,
            `NEW PERSONAL BEST${newBests.length > 1 ? 'S' : ''}!`, {
            fontFamily: UI.fontFamily,
            fontSize: '18px',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        bestText.setResolution(RENDER.textResolution);

        // Pulse animation
        this.tweens.add({
            targets: bestText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
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
            textObj.setColor(PALETTE.warning);
        });

        textObj.on('pointerout', () => {
            textObj.setColor(PALETTE.uiText);
        });

        textObj.on('pointerdown', callback);
    }

    /**
     * Process pending achievement notifications one at a time.
     * Creates staggered popups for satisfying feedback.
     */
    processAchievementQueue() {
        const notification = popNotification();

        if (!notification) {
            return;  // Queue empty
        }

        // Create the popup
        createAchievementPopup(this, notification);

        // Process next notification after delay (stagger for multiple unlocks)
        this.time.delayedCall(800, () => this.processAchievementQueue());
    }
}
