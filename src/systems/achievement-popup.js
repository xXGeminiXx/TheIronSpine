/**
 * achievement-popup.js - Procedural Achievement Pop-Up System
 *
 * Creates military medal visuals with procedural graphics when achievements unlock.
 * Medals appear as bronze/silver/gold/diamond with colored ribbons and tier stars.
 *
 * FEATURES:
 *   - Procedural medal graphics (circle + ribbon + embossed stars)
 *   - Slide-in animation from right
 *   - Tier-based colors (Bronze -> Diamond)
 *   - Achievement type determines ribbon color
 *   - Queue system for multiple unlocks
 *   - Optional procedural fanfare sound
 *
 * INTEGRATION:
 *   1. Call triggerPopup() from achievement unlock
 *   2. System handles queue automatically
 *   3. Non-blocking, async animations
 *
 * DESIGN PHILOSOPHY:
 *   - Military aesthetic (medals, not badges)
 *   - Clear tier progression visually
 *   - Non-intrusive (slides in/out smoothly)
 *   - No external assets (100% procedural)
 */

import { TIERS } from './achievements.js';
import { ACHIEVEMENT_POPUP, ACHIEVEMENT_RIBBON_COLORS } from '../config.js';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
// Import from config.js for centralized settings
const POPUP_CONFIG = ACHIEVEMENT_POPUP;
const RIBBON_COLORS = ACHIEVEMENT_RIBBON_COLORS;

// ----------------------------------------------------------------------------
// ACHIEVEMENT POPUP SYSTEM
// ----------------------------------------------------------------------------

export class AchievementPopupSystem {
    constructor(scene) {
        this.scene = scene;
        this.queue = [];
        this.currentPopup = null;
        this.isDisplaying = false;
    }

    /**
     * Trigger a popup for an unlocked achievement.
     *
     * @param {object} notification - Achievement notification from achievements.js
     * @param {object} notification.achievement - Achievement data
     * @param {number} notification.tier - Tier level (1-4)
     * @param {object} notification.tierInfo - Tier metadata (TIERS.BRONZE, etc.)
     * @param {number} notification.points - Points earned
     */
    triggerPopup(notification) {
        this.queue.push(notification);

        // Start processing if not already displaying
        if (!this.isDisplaying) {
            this.displayNext();
        }
    }

    /**
     * Display the next queued popup.
     */
    displayNext() {
        if (this.queue.length === 0) {
            this.isDisplaying = false;
            return;
        }

        this.isDisplaying = true;
        const notification = this.queue.shift();

        this.currentPopup = this.createPopup(notification);
        this.animatePopup(this.currentPopup, () => {
            this.displayNext();
        });
    }

    /**
     * Create the popup container with procedural medal graphics.
     *
     * @param {object} notification - Achievement notification
     * @returns {Phaser.GameObjects.Container} The popup container
     */
    createPopup(notification) {
        const { achievement, tierInfo, points } = notification;

        // Create container
        const container = this.scene.add.container(
            POPUP_CONFIG.startX,
            POPUP_CONFIG.yPosition
        );
        container.setDepth(POPUP_CONFIG.depth);
        container.setScrollFactor(0);

        // Background panel (dark backdrop)
        const panelWidth = 280;
        const panelHeight = 90;
        const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.9);
        panel.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(tierInfo.color).color);
        container.add(panel);

        // Medal graphic (left side)
        const medalX = -100;
        const medal = this.createMedalGraphic(achievement, tierInfo);
        medal.setPosition(medalX, 0);
        container.add(medal);

        // Achievement name (right side)
        const textX = -20;
        const nameText = this.scene.add.text(textX, -20, achievement.name, {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        container.add(nameText);

        // Tier + Points (right side)
        const tierText = this.scene.add.text(textX, 5, `${tierInfo.name} Tier`, {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '16px',
            color: tierInfo.color
        }).setOrigin(0, 0.5);
        container.add(tierText);

        const pointsText = this.scene.add.text(textX, 25, `+${points} pts`, {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffcc00'
        }).setOrigin(0, 0.5);
        container.add(pointsText);

        // Play fanfare sound
        if (POPUP_CONFIG.playSound) {
            this.playFanfareSound(tierInfo);
        }

        return container;
    }

    /**
     * Create procedural medal graphic.
     * Consists of: ribbon + medal circle + tier stars + emboss effect
     *
     * @param {object} achievement - Achievement data
     * @param {object} tierInfo - Tier metadata
     * @returns {Phaser.GameObjects.Container} Medal graphics container
     */
    createMedalGraphic(achievement, tierInfo) {
        const container = this.scene.add.container(0, 0);

        // Get ribbon color based on achievement category
        const ribbonColor = RIBBON_COLORS[achievement.category] || RIBBON_COLORS.combat;

        // 1. Draw ribbon (top to bottom stripe)
        const ribbon = this.scene.add.graphics();
        ribbon.fillStyle(ribbonColor, 1);
        ribbon.fillRect(
            -POPUP_CONFIG.ribbonWidth / 2,
            -POPUP_CONFIG.ribbonHeight,
            POPUP_CONFIG.ribbonWidth,
            POPUP_CONFIG.ribbonHeight + POPUP_CONFIG.medalRadius
        );
        container.add(ribbon);

        // 2. Draw medal circle with shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, POPUP_CONFIG.shadowAlpha);
        shadow.fillCircle(
            POPUP_CONFIG.shadowOffset,
            POPUP_CONFIG.shadowOffset,
            POPUP_CONFIG.medalRadius
        );
        container.add(shadow);

        // 3. Draw medal base (tier color)
        const medalBase = this.scene.add.graphics();
        const medalColor = Phaser.Display.Color.HexStringToColor(tierInfo.color).color;
        medalBase.fillStyle(medalColor, 1);
        medalBase.fillCircle(0, 0, POPUP_CONFIG.medalRadius);
        container.add(medalBase);

        // 4. Draw emboss effect (gradient highlight)
        const emboss = this.scene.add.graphics();
        emboss.fillStyle(0xffffff, POPUP_CONFIG.medalShineAlpha);
        emboss.fillCircle(-8, -8, POPUP_CONFIG.medalRadius * 0.4);
        container.add(emboss);

        // 5. Draw tier stars
        const stars = this.drawTierStars(tierInfo.level);
        stars.setPosition(0, 0);
        container.add(stars);

        // 6. Draw achievement icon (letter)
        const iconText = this.scene.add.text(0, 0, achievement.icon, {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(iconText);

        return container;
    }

    /**
     * Draw tier indicator stars around the medal.
     * Bronze: 1 star, Silver: 2 stars, Gold: 3 stars, Diamond: 4 stars (diamond shape)
     *
     * @param {number} tierLevel - Tier level (1-4)
     * @returns {Phaser.GameObjects.Graphics} Stars graphics
     */
    drawTierStars(tierLevel) {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xffffff, 1);

        // Star positions around medal (top, right, bottom, left)
        const positions = [
            { x: 0, y: -POPUP_CONFIG.medalRadius - 8 },  // Top
            { x: POPUP_CONFIG.medalRadius + 8, y: 0 },   // Right
            { x: 0, y: POPUP_CONFIG.medalRadius + 8 },   // Bottom
            { x: -POPUP_CONFIG.medalRadius - 8, y: 0 }   // Left
        ];

        // Draw stars based on tier level
        for (let i = 0; i < tierLevel && i < 4; i++) {
            const pos = positions[i];
            this.drawStar(graphics, pos.x, pos.y, POPUP_CONFIG.starSize, 5);
        }

        return graphics;
    }

    /**
     * Draw a 5-pointed star.
     *
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Outer radius
     * @param {number} points - Number of points (default 5)
     */
    drawStar(graphics, x, y, radius, points = 5) {
        const innerRadius = radius * 0.4;
        const angle = Math.PI / points;

        graphics.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? radius : innerRadius;
            const a = i * angle - Math.PI / 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;

            if (i === 0) {
                graphics.moveTo(px, py);
            } else {
                graphics.lineTo(px, py);
            }
        }
        graphics.closePath();
        graphics.fillPath();
    }

    /**
     * Animate the popup: slide in, hold, slide out.
     *
     * @param {Phaser.GameObjects.Container} popup - Popup container
     * @param {Function} onComplete - Callback when animation completes
     */
    animatePopup(popup, onComplete) {
        // Slide in from right
        this.scene.tweens.add({
            targets: popup,
            x: POPUP_CONFIG.endX,
            duration: POPUP_CONFIG.slideInDuration,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold position
                this.scene.time.delayedCall(POPUP_CONFIG.holdDuration, () => {
                    // Slide out to right
                    this.scene.tweens.add({
                        targets: popup,
                        x: POPUP_CONFIG.startX,
                        duration: POPUP_CONFIG.slideOutDuration,
                        ease: 'Power2',
                        onComplete: () => {
                            popup.destroy();
                            if (onComplete) onComplete();
                        }
                    });
                });
            }
        });
    }

    /**
     * Play procedural fanfare sound based on tier.
     * Higher tiers get richer, longer fanfares.
     *
     * @param {object} tierInfo - Tier metadata
     */
    playFanfareSound(tierInfo) {
        // Skip if Web Audio not available
        if (!this.scene.sound || !this.scene.sound.context) return;

        const audioContext = this.scene.sound.context;
        const now = audioContext.currentTime;

        // Fanfare parameters based on tier
        const fanfares = {
            1: [{ freq: 440, duration: 0.1 }], // Bronze: Single beep
            2: [{ freq: 440, duration: 0.08 }, { freq: 554, duration: 0.12 }], // Silver: Two notes
            3: [{ freq: 440, duration: 0.08 }, { freq: 554, duration: 0.08 }, { freq: 659, duration: 0.14 }], // Gold: Three notes
            4: [{ freq: 440, duration: 0.08 }, { freq: 554, duration: 0.08 }, { freq: 659, duration: 0.08 }, { freq: 880, duration: 0.16 }] // Diamond: Four notes
        };

        const notes = fanfares[tierInfo.level] || fanfares[1];
        let timeOffset = 0;

        notes.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = note.freq;

            gainNode.gain.setValueAtTime(0, now + timeOffset);
            gainNode.gain.linearRampToValueAtTime(POPUP_CONFIG.soundVolume, now + timeOffset + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + timeOffset + note.duration);

            oscillator.start(now + timeOffset);
            oscillator.stop(now + timeOffset + note.duration);

            timeOffset += note.duration;
        });
    }

    /**
     * Clear all popups and queue.
     */
    clear() {
        this.queue = [];
        if (this.currentPopup) {
            this.currentPopup.destroy();
            this.currentPopup = null;
        }
        this.isDisplaying = false;
    }

    /**
     * Destroy the system.
     */
    destroy() {
        this.clear();
    }
}
