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

import { PALETTE, UI, RENDER, SEEDING, PRESTIGE } from '../config.js';
import { StatsTracker } from '../systems/stats-tracker.js';
import { Leaderboard } from '../systems/leaderboard.js';
import { PrestigeManager } from '../systems/prestige.js';
import {
    getHighscoreMaxNameLength,
    getSavedHighscoreName,
    isRemoteHighscoreEnabled,
    sanitizeHighscoreName,
    submitRemoteHighscore
} from '../systems/remote-highscores.js';
import {
    AchievementTracker,
    popNotification
} from '../systems/achievements.js';
import { AchievementPopupSystem } from '../systems/achievement-popup.js';
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
        this.isHighscoreInputActive = false;

        // Initialize achievement popup system
        this.achievementPopupSystem = new AchievementPopupSystem(this);

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
        // UPDATE LEADERBOARD (eligible runs only)
        // ------------------------------------------------------------------------
        const leaderboardResult = this.recordLeaderboard(runData, stats);

        // ------------------------------------------------------------------------
        // AWARD SCRAP (prestige currency)
        // ------------------------------------------------------------------------
        const scrapEarned = PRESTIGE.enabled
            ? this.awardPrestigeScrap(runData)
            : 0;

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
        const statLines = this.buildStatLines(stats, newBests, scrapEarned);
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
        // LEADERBOARD STATUS
        // ------------------------------------------------------------------------
        this.createLeaderboardStatus(width, height, leaderboardResult);

        // ------------------------------------------------------------------------
        // SEED DISPLAY (if seeded runs enabled)
        // ------------------------------------------------------------------------
        this.createSeedDisplay(width, height);

        // ------------------------------------------------------------------------
        // REMOTE HIGHSCORE SUBMISSION
        // ------------------------------------------------------------------------
        this.createRemoteHighscoreSection(width, height, runData, stats);

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

        let highscoresText = null;
        if (isRemoteHighscoreEnabled()) {
            highscoresText = this.add.text(width * 0.5, height * 0.88, 'HIGHSCORES [H]', {
                fontFamily: UI.fontFamily,
                fontSize: '16px',
                color: PALETTE.uiText
            }).setOrigin(0.5);
            highscoresText.setResolution(RENDER.textResolution);
            this.makeInteractive(highscoresText, () => this.scene.start('HighscoreScene'));
            this.highscoreMenuText = highscoresText;
        }

        // ------------------------------------------------------------------------
        // INPUT HANDLING
        // ------------------------------------------------------------------------
        this.setupRetryTap(settingsText, menuText, continueText);

        // Keyboard shortcuts
        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (this.isHighscoreInputActive) {
                    return;
                }
                if (event.code === 'Enter' || event.code === 'Space') {
                    this.scene.start('GameScene');
                }
                if (event.code === 'KeyS') {
                    this.scene.start('SettingsScene');
                }
                if (event.code === 'KeyM') {
                    this.scene.start('MenuScene');
                }
                if (event.code === 'KeyH' && highscoresText) {
                    this.scene.start('HighscoreScene');
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
            finalCarCount: stats.finalCarCount || 0,
            challengeMode: stats.challengeMode || null // v1.6.2 Challenge mode tracking
        };
    }

    /**
     * Record the run on the local leaderboard (if eligible).
     *
     * @param {Object} runData - Parsed run data
     * @param {Object} stats - Original stats payload
     * @returns {Object} Leaderboard result metadata
     */
    recordLeaderboard(runData, stats) {
        const endlessMode = typeof stats.endlessMode === 'boolean'
            ? stats.endlessMode
            : SETTINGS.endlessMode;

        return Leaderboard.recordRun({
            ...runData,
            difficulty: stats.difficulty || SETTINGS.difficulty,
            endlessMode,
            devConsoleUsed: Boolean(stats.devConsoleUsed)
        });
    }

    /**
     * Build the stat lines for display, marking new personal bests.
     *
     * @param {Object} stats - Run statistics
     * @param {Array} newBests - Array of new personal best keys
     * @param {number} scrapEarned - Scrap awarded this run
     * @returns {Array<string>} Formatted stat lines
     */
    buildStatLines(stats, newBests, scrapEarned = 0) {
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

        // Scrap earned (if prestige enabled)
        if (PRESTIGE.enabled && scrapEarned > 0) {
            const prestigeData = PrestigeManager.getData();
            lines.push('');  // Blank line for spacing
            lines.push(`Scrap Earned: ${scrapEarned} (Total: ${prestigeData.currentScrap})`);
        }

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
     * Show leaderboard result messaging on the end screen.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @param {Object} leaderboardResult - Result metadata
     */
    createLeaderboardStatus(width, height, leaderboardResult) {
        if (!leaderboardResult) {
            return;
        }

        let statusText = '';
        let statusColor = PALETTE.uiText;

        if (!leaderboardResult.eligible) {
            statusText = 'Leaderboard: Not recorded (Dev Console used)';
            statusColor = '#ff6666';
        } else if (leaderboardResult.added) {
            statusText = leaderboardResult.rank
                ? `Leaderboard: New Rank #${leaderboardResult.rank}`
                : 'Leaderboard: Updated';
            statusColor = '#00ff00';
        } else {
            statusText = 'Leaderboard: Not in Top 10';
        }

        const status = this.add.text(width * 0.5, height * 0.62, statusText, {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: statusColor,
            alpha: 0.8
        }).setOrigin(0.5);
        status.setResolution(RENDER.textResolution);
    }

    /**
     * Display the run seed for sharing and reproducibility.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     */
    createSeedDisplay(width, height) {
        // Only show if seeding is enabled and configured to show on end screen
        if (!SEEDING.enabled || !SEEDING.showSeedOnEndScreen) {
            return;
        }

        // Get seed from registry (set by GameScene)
        const seedManager = this.registry.get('seedManager');
        if (!seedManager) {
            return;
        }

        const seed = seedManager.getSeed();
        const seedType = seedManager.getSeedType();

        // Display seed just below the stats (above leaderboard status)
        const seedText = this.add.text(
            width * 0.5,
            height * 0.58,
            `Run Seed: ${seed} (${seedType})`,
            {
                fontFamily: UI.fontFamily,
                fontSize: '14px',
                color: PALETTE.uiText,
                alpha: 0.9
            }
        ).setOrigin(0.5);
        seedText.setResolution(RENDER.textResolution);

        // Make it interactive for easy copying
        seedText.setInteractive({ useHandCursor: true });

        seedText.on('pointerover', () => {
            seedText.setColor('#00ff00');
            seedText.setAlpha(1.0);
        });

        seedText.on('pointerout', () => {
            seedText.setColor(PALETTE.uiText);
            seedText.setAlpha(0.9);
        });

        seedText.on('pointerdown', () => {
            // Copy seed to clipboard if available
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(seed).then(() => {
                    // Flash green to indicate copy success
                    seedText.setText(`Run Seed: ${seed} (COPIED!)`);
                    seedText.setColor('#00ff00');
                    this.time.delayedCall(1000, () => {
                        seedText.setText(`Run Seed: ${seed} (${seedType})`);
                        seedText.setColor(PALETTE.uiText);
                    });
                }).catch(() => {
                    // Fallback: show prompt with seed
                    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
                        window.prompt('Copy this seed:', seed);
                    }
                });
            } else {
                // Fallback: show prompt with seed
                if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
                    window.prompt('Copy this seed:', seed);
                }
            }
        });
    }

    /**
     * Create the remote highscore submission UI (official host only).
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @param {Object} runData - Parsed run data
     * @param {Object} stats - Original stats payload
     */
    createRemoteHighscoreSection(width, height, runData, stats) {
        if (!isRemoteHighscoreEnabled()) {
            return;
        }

        this.highscoreRunData = runData;
        this.highscoreMeta = {
            difficulty: stats.difficulty || SETTINGS.difficulty,
            endlessMode: typeof stats.endlessMode === 'boolean'
                ? stats.endlessMode
                : SETTINGS.endlessMode
        };
        this.highscoreSubmitInProgress = false;

        const submitText = this.add.text(width * 0.5, height * 0.66, 'SUBMIT HIGHSCORE', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        submitText.setResolution(RENDER.textResolution);
        this.makeInteractive(submitText, () => this.promptHighscoreSubmission());
        this.highscoreSubmitText = submitText;

        this.highscoreStatusText = this.add.text(width * 0.5, height * 0.695, '', {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.8
        }).setOrigin(0.5);
        this.highscoreStatusText.setResolution(RENDER.textResolution);

        const infoText = this.add.text(width * 0.5, height * 0.72,
            'Anonymous arcade board. Same name updates your entry.', {
                fontFamily: UI.fontFamily,
                fontSize: '12px',
                color: PALETTE.uiText,
                alpha: 0.6
            }).setOrigin(0.5);
        infoText.setResolution(RENDER.textResolution);
    }

    async promptHighscoreSubmission() {
        if (this.highscoreSubmitInProgress || this.isHighscoreInputActive) {
            return;
        }

        const isMobile = this.sys.game.device.input.touch
            && !this.sys.game.device.os.desktop;

        if (isMobile || !this.input.keyboard) {
            this.promptHighscoreSubmissionFallback();
            return;
        }

        this.openHighscoreInput();
    }

    promptHighscoreSubmissionFallback() {
        if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
            this.setHighscoreStatus('Submission unavailable.');
            return;
        }

        const maxLength = getHighscoreMaxNameLength();
        const lastName = getSavedHighscoreName();
        const promptText = `Enter your name (max ${maxLength} chars):`;
        const rawName = window.prompt(promptText, lastName || '');
        const name = sanitizeHighscoreName(rawName);
        if (!name) {
            this.setHighscoreStatus('Submission canceled.');
            return;
        }

        this.submitHighscoreName(name);
    }

    openHighscoreInput() {
        if (this.isHighscoreInputActive) {
            return;
        }

        const { width, height } = this.scale;
        this.isHighscoreInputActive = true;
        this.highscoreInputName = getSavedHighscoreName();
        this.highscoreMaxNameLength = getHighscoreMaxNameLength();
        this.highscoreInputObjects = [];
        this.highscoreCursorVisible = true;

        const overlay = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x000000, 0.65);
        overlay.setScrollFactor(0);
        overlay.setDepth(1000);
        overlay.setInteractive();

        const panelWidth = Math.min(420, width * 0.9);
        const panelHeight = 220;
        const panel = this.add.rectangle(width * 0.5, height * 0.5, panelWidth, panelHeight, 0x101522, 0.95);
        panel.setScrollFactor(0);
        panel.setDepth(1001);
        panel.setStrokeStyle(2, 0x2d3b5c);

        const title = this.add.text(width * 0.5, height * 0.42, 'ENTER CALLSIGN', {
            fontFamily: UI.fontFamily,
            fontSize: '18px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1002);
        title.setResolution(RENDER.textResolution);

        this.highscoreInputText = this.add.text(width * 0.5, height * 0.49, '', {
            fontFamily: UI.fontFamily,
            fontSize: '20px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.highscoreInputText.setScrollFactor(0);
        this.highscoreInputText.setDepth(1002);
        this.highscoreInputText.setResolution(RENDER.textResolution);

        this.highscoreCountText = this.add.text(width * 0.5, height * 0.54, '', {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.7
        }).setOrigin(0.5);
        this.highscoreCountText.setScrollFactor(0);
        this.highscoreCountText.setDepth(1002);
        this.highscoreCountText.setResolution(RENDER.textResolution);

        const helpText = this.add.text(width * 0.5, height * 0.57,
            'Enter to submit • Esc to cancel', {
                fontFamily: UI.fontFamily,
                fontSize: '12px',
                color: PALETTE.uiText,
                alpha: 0.6
            }).setOrigin(0.5);
        helpText.setScrollFactor(0);
        helpText.setDepth(1002);
        helpText.setResolution(RENDER.textResolution);

        const submitText = this.add.text(width * 0.44, height * 0.62, 'SUBMIT', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        submitText.setScrollFactor(0);
        submitText.setDepth(1002);
        submitText.setResolution(RENDER.textResolution);
        this.makeInteractive(submitText, () => this.submitHighscoreFromInput());

        const cancelText = this.add.text(width * 0.56, height * 0.62, 'CANCEL', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        cancelText.setScrollFactor(0);
        cancelText.setDepth(1002);
        cancelText.setResolution(RENDER.textResolution);
        this.makeInteractive(cancelText, () => this.closeHighscoreInput());

        this.highscoreInputObjects.push(
            overlay,
            panel,
            title,
            this.highscoreInputText,
            this.highscoreCountText,
            helpText,
            submitText,
            cancelText
        );

        this.refreshHighscoreInputText();
        this.highscoreCursorEvent = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.highscoreCursorVisible = !this.highscoreCursorVisible;
                this.refreshHighscoreInputText();
            }
        });

        if (this.input.keyboard) {
            this.highscoreKeyHandler = (event) => this.handleHighscoreKey(event);
            this.input.keyboard.on('keydown', this.highscoreKeyHandler);
        }
    }

    handleHighscoreKey(event) {
        if (!this.isHighscoreInputActive) {
            return;
        }

        if (event.code === 'Escape') {
            this.closeHighscoreInput();
            return;
        }
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            this.submitHighscoreFromInput();
            return;
        }
        if (event.code === 'Backspace') {
            this.highscoreInputName = this.highscoreInputName.slice(0, -1);
            this.refreshHighscoreInputText();
            return;
        }

        if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (this.highscoreInputName.length < this.highscoreMaxNameLength) {
                this.highscoreInputName += event.key;
                this.refreshHighscoreInputText();
            }
        }
    }

    refreshHighscoreInputText() {
        if (!this.highscoreInputText || !this.highscoreCountText) {
            return;
        }

        const sanitized = sanitizeHighscoreName(this.highscoreInputName);
        const cursor = this.highscoreCursorVisible ? '|' : ' ';
        if (sanitized) {
            this.highscoreInputText.setText(`${sanitized}${cursor}`);
            this.highscoreInputText.setAlpha(1);
        } else {
            this.highscoreInputText.setText(`(type name)${cursor}`);
            this.highscoreInputText.setAlpha(0.6);
        }
        this.highscoreCountText.setText(`${sanitized.length}/${this.highscoreMaxNameLength}`);
    }

    submitHighscoreFromInput() {
        if (this.highscoreSubmitInProgress) {
            return;
        }

        const name = sanitizeHighscoreName(this.highscoreInputName);
        if (!name) {
            this.setHighscoreStatus('Enter a name first.');
            return;
        }

        this.submitHighscoreName(name);
    }

    async submitHighscoreName(name) {
        if (this.highscoreSubmitInProgress) {
            return;
        }

        this.highscoreSubmitInProgress = true;
        this.setHighscoreStatus('Submitting...');

        const result = await submitRemoteHighscore(
            this.highscoreRunData,
            name,
            this.highscoreMeta
        );

        if (result.ok) {
            const rankLabel = Number.isFinite(result.rank) ? ` Rank #${result.rank}` : '';
            this.setHighscoreStatus(`Submitted!${rankLabel}`);
        } else {
            this.setHighscoreStatus('Submission failed.');
        }

        this.highscoreSubmitInProgress = false;
        this.closeHighscoreInput();
    }

    closeHighscoreInput() {
        if (!this.isHighscoreInputActive) {
            return;
        }

        this.isHighscoreInputActive = false;
        if (this.input.keyboard && this.highscoreKeyHandler) {
            this.input.keyboard.off('keydown', this.highscoreKeyHandler);
            this.highscoreKeyHandler = null;
        }
        if (this.highscoreCursorEvent) {
            this.highscoreCursorEvent.remove(false);
            this.highscoreCursorEvent = null;
        }

        if (this.highscoreInputObjects) {
            this.highscoreInputObjects.forEach((obj) => obj.destroy());
            this.highscoreInputObjects = [];
        }
        this.highscoreInputText = null;
        this.highscoreCountText = null;
        this.highscoreInputName = '';
    }

    setHighscoreStatus(message) {
        if (this.highscoreStatusText) {
            this.highscoreStatusText.setText(message || '');
        }
    }

    setupRetryTap(settingsText, menuText, continueText) {
        if (!this.input) {
            return;
        }

        this.retryTapHandler = (pointer, gameObjects) => {
            const clickedButtons = gameObjects && (
                gameObjects.includes(settingsText) ||
                gameObjects.includes(menuText) ||
                (continueText && gameObjects.includes(continueText)) ||
                (this.highscoreSubmitText && gameObjects.includes(this.highscoreSubmitText)) ||
                (this.highscoreMenuText && gameObjects.includes(this.highscoreMenuText))
            );
            if (clickedButtons || this.isHighscoreInputActive) {
                this.setupRetryTap(settingsText, menuText, continueText);
                return;
            }
            this.scene.start('GameScene');
        };

        this.input.once('pointerdown', this.retryTapHandler);
    }

    /**
     * Make a text element interactive with hover effects.
     *
     * @param {Phaser.GameObjects.Text} textObj - The text to make interactive
     * @param {Function} callback - Function to call on click
     */
    makeInteractive(textObj, callback) {
        const baseColor = textObj.style && textObj.style.color
            ? textObj.style.color
            : PALETTE.uiText;
        textObj.setInteractive({ useHandCursor: true });

        textObj.on('pointerover', () => {
            textObj.setColor(PALETTE.warning);
        });

        textObj.on('pointerout', () => {
            textObj.setColor(baseColor);
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

        // Trigger the procedural medal popup
        this.achievementPopupSystem.triggerPopup(notification);

        // Process next notification after delay (stagger for multiple unlocks)
        this.time.delayedCall(800, () => this.processAchievementQueue());
    }

    /**
     * Calculate and award prestige scrap for the completed run.
     *
     * @param {Object} runData - Run data with wavesCleared, enemiesDestroyed, mergesCompleted
     * @returns {number} Scrap amount awarded
     */
    awardPrestigeScrap(runData) {
        const scrap = PrestigeManager.calculateScrap({
            wavesCleared: runData.wavesCleared || 0,
            enemiesDestroyed: runData.enemiesDestroyed || 0,
            mergesCompleted: runData.mergesCompleted || 0
        });

        if (scrap > 0) {
            PrestigeManager.awardScrap(scrap);
        }

        return scrap;
    }
}
