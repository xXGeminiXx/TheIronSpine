/**
 * challenge-scene.js - Challenge Mode Selection Screen
 *
 * Presents available challenge modes to the player with:
 *   - Mode descriptions and modifiers
 *   - Completion status indicators
 *   - Reward information
 *   - Quick access to start challenges
 *
 * NAVIGATION:
 *   - Click mode to start challenge
 *   - ESC or Back button to return to menu
 *   - Arrow keys to navigate modes (future)
 */

import { PALETTE, UI, RENDER, CHALLENGES } from '../config.js';
import { getAllChallengeModes, getChallengeMode } from '../modes/challenge-modes.js';

export class ChallengeScene extends Phaser.Scene {
    constructor() {
        super('ChallengeScene');
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
        // HEADER
        // ------------------------------------------------------------------------
        const titleText = this.add.text(width * 0.5, height * 0.12, 'CHALLENGE MODES', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.warning,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        titleText.setResolution(RENDER.textResolution);

        const subtitleText = this.add.text(width * 0.5, height * 0.19,
            'Test your skills with modified rules and earn rewards', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.uiText,
            alpha: 0.8
        }).setOrigin(0.5);
        subtitleText.setResolution(RENDER.textResolution);

        // ------------------------------------------------------------------------
        // CHALLENGE MODE CARDS
        // ------------------------------------------------------------------------
        this.createChallengeCards(width, height);

        // ------------------------------------------------------------------------
        // BACK BUTTON
        // ------------------------------------------------------------------------
        const backButton = this.add.text(width * 0.5, height * 0.92, '< BACK TO MENU', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.warning
        }).setOrigin(0.5);
        backButton.setResolution(RENDER.textResolution);
        this.makeInteractive(backButton, () => this.scene.start('MenuScene'));

        // ------------------------------------------------------------------------
        // KEYBOARD SHORTCUTS
        // ------------------------------------------------------------------------
        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Escape') {
                    this.scene.start('MenuScene');
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
     * Create challenge mode cards with descriptions and rewards.
     *
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     */
    createChallengeCards(width, height) {
        const challenges = getAllChallengeModes();

        // Layout: 2 columns, 4 rows
        const cardsPerRow = 2;
        const cardWidth = width * 0.38;
        const cardHeight = height * 0.14;
        const startX = width * 0.12;
        const startY = height * 0.28;
        const spacingX = width * 0.48;
        const spacingY = height * 0.18;

        challenges.forEach((challenge, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            this.createChallengeCard(challenge, x, y, cardWidth, cardHeight);
        });
    }

    /**
     * Create a single challenge card.
     *
     * @param {ChallengeMode} challenge - Challenge mode instance
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Card width
     * @param {number} height - Card height
     */
    createChallengeCard(challenge, x, y, width, height) {
        const displayInfo = challenge.getDisplayInfo();

        // Card background
        const cardBg = this.add.rectangle(x, y, width, height, 0x2a2a4e, 0.8)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x4a4a6e);

        // Make entire card clickable
        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', () => this.startChallenge(challenge.id));
        cardBg.on('pointerover', () => {
            cardBg.setFillStyle(0x3a3a5e, 0.9);
        });
        cardBg.on('pointerout', () => {
            cardBg.setFillStyle(0x2a2a4e, 0.8);
        });

        // Icon + Name
        const headerText = this.add.text(
            x + width * 0.05,
            y + height * 0.12,
            `${displayInfo.icon} ${displayInfo.name}`,
            {
                fontFamily: UI.fontFamily,
                fontSize: '20px',
                color: PALETTE.warning,
                fontStyle: 'bold'
            }
        );
        headerText.setResolution(RENDER.textResolution);

        // Description
        const descText = this.add.text(
            x + width * 0.05,
            y + height * 0.35,
            displayInfo.description,
            {
                fontFamily: UI.fontFamily,
                fontSize: '12px',
                color: PALETTE.uiText,
                alpha: 0.9,
                wordWrap: { width: width * 0.9 }
            }
        );
        descText.setResolution(RENDER.textResolution);

        // Modifiers
        const modifiers = displayInfo.modifiers.join(' • ');
        const modText = this.add.text(
            x + width * 0.05,
            y + height * 0.65,
            modifiers,
            {
                fontFamily: UI.fontFamily,
                fontSize: '11px',
                color: '#88ccff',
                alpha: 0.8
            }
        );
        modText.setResolution(RENDER.textResolution);

        // Reward
        const rewardText = this.add.text(
            x + width * 0.05,
            y + height * 0.82,
            `Reward: ${displayInfo.reward}`,
            {
                fontFamily: UI.fontFamily,
                fontSize: '11px',
                color: '#ffcc00',
                fontStyle: 'italic'
            }
        );
        rewardText.setResolution(RENDER.textResolution);

        // Completion indicator (if achieved)
        const completed = this.isChallengeCompleted(challenge.id);
        if (completed) {
            const checkmark = this.add.text(
                x + width * 0.92,
                y + height * 0.12,
                '✓',
                {
                    fontFamily: UI.fontFamily,
                    fontSize: '24px',
                    color: '#00ff00'
                }
            ).setOrigin(1, 0);
            checkmark.setResolution(RENDER.textResolution);
        }
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
     * Check if a challenge has been completed.
     *
     * @param {string} challengeId - Challenge mode ID
     * @returns {boolean} True if completed
     */
    isChallengeCompleted(challengeId) {
        // Check localStorage for completion
        const completions = JSON.parse(
            localStorage.getItem('ironspine_challenge_completions') || '{}'
        );
        return completions[challengeId]?.completed || false;
    }

    /**
     * Start a challenge mode.
     *
     * @param {string} challengeId - Challenge mode ID to start
     */
    startChallenge(challengeId) {
        const challenge = getChallengeMode(challengeId);
        if (!challenge) {
            console.error(`[ChallengeScene] Unknown challenge mode: ${challengeId}`);
            return;
        }

        // Store selected challenge in registry
        this.registry.set('selectedChallenge', challengeId);

        // Start game with challenge mode
        this.scene.start('GameScene', { challengeMode: challengeId });
    }
}
