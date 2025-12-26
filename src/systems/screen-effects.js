/**
 * screen-effects.js - Dynamic Screen Effects System
 *
 * Provides cinematic screen effects that respond to gameplay intensity.
 * All effects are procedural overlays - no external assets required.
 *
 * EFFECTS:
 *   - Low HP: Red vignette pulse
 *   - High Combo: Gold edge glow
 *   - Boss Spawn: Color desaturation
 *   - Victory: White flash
 *   - Damage Taken: Screen flash
 *
 * INTEGRATION:
 *   1. Create instance in game scene
 *   2. Call update() each frame with game state
 *   3. Trigger effects via setLowHP(), setComboGlow(), etc.
 */

const EFFECT_DEPTH = 100; // Above everything

export class ScreenEffectsSystem {
    constructor(scene) {
        this.scene = scene;

        // Create effect layers
        this.vignette = this.createVignette();
        this.comboGlow = this.createComboGlow();
        this.flash = this.createFlash();

        // State
        this.lowHpActive = false;
        this.comboActive = false;
        this.pulseTimer = 0;
    }

    createVignette() {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(EFFECT_DEPTH);
        graphics.setScrollFactor(0);
        graphics.setAlpha(0);
        return graphics;
    }

    createComboGlow() {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(EFFECT_DEPTH);
        graphics.setScrollFactor(0);
        graphics.setAlpha(0);
        return graphics;
    }

    createFlash() {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(EFFECT_DEPTH + 1);
        graphics.setScrollFactor(0);
        graphics.setAlpha(0);
        return graphics;
    }

    /**
     * Update screen effects based on game state.
     * @param {object} state - Game state { hpPercent, comboMultiplier, deltaSeconds }
     */
    update(state) {
        const { hpPercent, comboMultiplier, deltaSeconds } = state;

        this.pulseTimer += deltaSeconds;

        // Low HP vignette
        if (hpPercent < 0.3) {
            this.updateLowHPVignette(hpPercent);
        } else {
            this.vignette.setAlpha(0);
            this.lowHpActive = false;
        }

        // Combo glow
        if (comboMultiplier > 1.2) {
            this.updateComboGlow(comboMultiplier);
        } else {
            this.comboGlow.setAlpha(0);
            this.comboActive = false;
        }
    }

    updateLowHPVignette(hpPercent) {
        this.lowHpActive = true;

        // Intensity increases as HP drops
        const intensity = Phaser.Math.Clamp((0.3 - hpPercent) / 0.3, 0, 1);

        // Pulse effect
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * 3);
        const alpha = intensity * 0.4 * pulse;

        this.vignette.clear();
        this.vignette.setAlpha(alpha);

        // Draw radial gradient vignette
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        const maxRadius = Math.max(this.scene.cameras.main.width, this.scene.cameras.main.height);

        // Multiple circles for gradient effect
        for (let i = 0; i < 8; i++) {
            const radius = maxRadius * (1 - i / 8);
            const circleAlpha = i / 8;
            this.vignette.fillStyle(0xff0000, circleAlpha);
            this.vignette.fillCircle(centerX, centerY, radius);
        }
    }

    updateComboGlow(multiplier) {
        this.comboActive = true;

        // Glow intensity based on multiplier
        const intensity = Phaser.Math.Clamp((multiplier - 1.0) / 2.0, 0, 1);

        // Pulse effect
        const pulse = 0.6 + 0.4 * Math.sin(this.pulseTimer * 4);
        const alpha = intensity * 0.5 * pulse;

        this.comboGlow.clear();
        this.comboGlow.setAlpha(alpha);

        // Draw golden edge glow
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const glowWidth = 80 * intensity;

        // Top edge
        this.comboGlow.fillGradientStyle(0xffcc00, 0xffcc00, 0xffcc00, 0xffcc00, 1, 1, 0, 0);
        this.comboGlow.fillRect(0, 0, width, glowWidth);

        // Bottom edge
        this.comboGlow.fillGradientStyle(0xffcc00, 0xffcc00, 0xffcc00, 0xffcc00, 0, 0, 1, 1);
        this.comboGlow.fillRect(0, height - glowWidth, width, glowWidth);

        // Left edge
        this.comboGlow.fillGradientStyle(0xffcc00, 0xffcc00, 0xffcc00, 0xffcc00, 1, 0, 1, 0);
        this.comboGlow.fillRect(0, 0, glowWidth, height);

        // Right edge
        this.comboGlow.fillGradientStyle(0xffcc00, 0xffcc00, 0xffcc00, 0xffcc00, 0, 1, 0, 1);
        this.comboGlow.fillRect(width - glowWidth, 0, glowWidth, height);
    }

    /**
     * Flash the screen (e.g., on damage taken).
     * @param {number} color - Phaser hex color (default: white)
     * @param {number} duration - Flash duration in ms (default: 100)
     */
    flashScreen(color = 0xffffff, duration = 100) {
        this.flash.clear();
        this.flash.fillStyle(color, 1);
        this.flash.fillRect(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height
        );
        this.flash.setAlpha(0.6);

        this.scene.tweens.add({
            targets: this.flash,
            alpha: 0,
            duration,
            ease: 'Cubic.easeOut'
        });
    }

    /**
     * Desaturate screen (e.g., boss spawn).
     * @param {number} duration - Desaturation duration in ms
     * @param {number} intensity - 0.0 (no effect) to 1.0 (full grayscale)
     */
    desaturate(duration = 500, intensity = 0.7) {
        const camera = this.scene.cameras.main;

        // Tween to grayscale
        this.scene.tweens.add({
            targets: camera,
            // Phaser doesn't have built-in desaturation, so we'll use a dark overlay
            // For true desaturation, you'd need a shader
            duration,
            onStart: () => {
                this.flash.clear();
                this.flash.fillStyle(0x000000, 0);
                this.flash.fillRect(0, 0, camera.width, camera.height);
            },
            onUpdate: (tween) => {
                const progress = tween.progress;
                const alpha = intensity * Math.sin(progress * Math.PI);
                this.flash.setAlpha(alpha * 0.3);
            }
        });
    }

    /**
     * Victory flash (white flash + fade).
     */
    victoryFlash() {
        this.flash.clear();
        this.flash.fillStyle(0xffffff, 1);
        this.flash.fillRect(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height
        );
        this.flash.setAlpha(1);

        this.scene.tweens.add({
            targets: this.flash,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut'
        });
    }

    /**
     * Clear all effects.
     */
    clear() {
        this.vignette.setAlpha(0);
        this.comboGlow.setAlpha(0);
        this.flash.setAlpha(0);
        this.lowHpActive = false;
        this.comboActive = false;
    }

    /**
     * Destroy all graphics (e.g., scene end).
     */
    destroy() {
        this.vignette.destroy();
        this.comboGlow.destroy();
        this.flash.destroy();
    }
}
