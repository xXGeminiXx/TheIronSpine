/**
 * drop-protection.js - Accidental Car Drop Prevention System
 *
 * Prevents players from accidentally losing all their cars by implementing:
 *   - Cooldown between consecutive drops
 *   - Warning when dropping to last car
 *   - Confirmation hold for rapid drops
 *   - Visual/audio feedback for denied drops
 *
 * PROBLEM THIS SOLVES:
 *   A player could spend 10 minutes building up a powerful train in endless mode,
 *   then accidentally spam the drop key and lose everything in seconds.
 *   This feels terrible and makes players quit.
 *
 * SOLUTION:
 *   - After each drop, there's a brief cooldown before another is allowed
 *   - Drops accelerate in cooldown the more consecutive drops happen
 *   - Dropping the last car requires a longer hold
 *   - Visual warning when train is getting short
 *
 * CONFIGURATION (in config.js under DROP_PROTECTION):
 *   dropCooldownMs:       Base cooldown between drops (200ms)
 *   consecutiveMultiplier: Cooldown multiplier per consecutive drop (1.5x)
 *   maxCooldownMs:        Maximum cooldown cap (2000ms)
 *   lastCarHoldMs:        Hold time required to drop last car (500ms)
 *   warningThreshold:     Warn when this many cars remain (3)
 *   resetAfterMs:         Reset consecutive counter after this idle time (3000ms)
 *
 * USAGE:
 *   import { DropProtection } from './systems/drop-protection.js';
 *
 *   // In game scene create():
 *   this.dropProtection = new DropProtection(this, {
 *       onDropDenied: () => this.showDropDeniedFeedback(),
 *       onLastCarWarning: () => this.showLastCarWarning()
 *   });
 *
 *   // When player requests a drop:
 *   if (this.dropProtection.canDrop(carCount)) {
 *       this.train.jettisonTail();
 *       this.dropProtection.recordDrop();
 *   }
 *
 * EXTENSIBILITY:
 *   - Adjust config values to tune feel
 *   - Override onDropDenied/onLastCarWarning callbacks for custom feedback
 *   - Add new protection modes (e.g., confirm dialog for drops > 50% of train)
 */

// Default configuration - can be overridden via constructor or config.js
const DEFAULT_CONFIG = {
    // Base cooldown between drops (milliseconds)
    dropCooldownMs: 200,

    // Multiplier applied to cooldown for each consecutive drop
    // After 5 rapid drops: 200 * 1.5^5 = ~1.5 seconds
    consecutiveMultiplier: 1.5,

    // Maximum cooldown cap (don't make player wait forever)
    maxCooldownMs: 2000,

    // How long to hold drop key to jettison the LAST car
    // This is the "are you sure?" mechanic
    lastCarHoldMs: 500,

    // Show warning when this many cars or fewer remain
    warningThreshold: 3,

    // Reset consecutive drop counter after this much idle time
    resetAfterMs: 3000,

    // Minimum cars required to allow dropping (0 = can drop all)
    // Set to 1 to always keep at least one car
    minimumCars: 1
};

// ----------------------------------------------------------------------------
// DROP PROTECTION CLASS
// ----------------------------------------------------------------------------

export class DropProtection {
    /**
     * Create a new DropProtection instance.
     *
     * @param {Phaser.Scene} scene - The game scene (for timing)
     * @param {Object} options - Configuration and callbacks
     * @param {Function} options.onDropDenied - Called when drop is rejected
     * @param {Function} options.onLastCarWarning - Called when dropping to danger zone
     * @param {Function} options.onCooldownActive - Called each frame while cooling down
     * @param {Object} options.config - Override default config values
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };

        // Callbacks
        this.onDropDenied = options.onDropDenied || (() => {});
        this.onLastCarWarning = options.onLastCarWarning || (() => {});
        this.onCooldownActive = options.onCooldownActive || (() => {});

        // State
        this.lastDropTime = 0;
        this.consecutiveDrops = 0;
        this.holdStartTime = 0;
        this.isHolding = false;

        // For visual feedback
        this.cooldownRemaining = 0;
    }

    /**
     * Check if a drop is currently allowed.
     *
     * @param {number} currentCarCount - Current number of cars attached
     * @param {boolean} isHoldingDropKey - Whether the drop key is being held
     * @returns {boolean} True if drop is allowed
     */
    canDrop(currentCarCount, isHoldingDropKey = false) {
        const now = Date.now();

        // Reset consecutive counter if enough time has passed
        if (now - this.lastDropTime > this.config.resetAfterMs) {
            this.consecutiveDrops = 0;
        }

        // Check minimum cars
        if (currentCarCount <= this.config.minimumCars) {
            this.onDropDenied('minimum_reached');
            return false;
        }

        // Calculate current cooldown
        const cooldownMs = this.getCurrentCooldown();
        const timeSinceLastDrop = now - this.lastDropTime;

        // Check cooldown
        if (timeSinceLastDrop < cooldownMs) {
            this.cooldownRemaining = cooldownMs - timeSinceLastDrop;
            this.onCooldownActive(this.cooldownRemaining, cooldownMs);
            this.onDropDenied('cooldown');
            return false;
        }

        // Last car protection: require hold
        if (currentCarCount === this.config.minimumCars + 1) {
            // Warn the player
            this.onLastCarWarning();

            if (isHoldingDropKey) {
                if (!this.isHolding) {
                    // Just started holding
                    this.holdStartTime = now;
                    this.isHolding = true;
                }

                const holdDuration = now - this.holdStartTime;
                if (holdDuration < this.config.lastCarHoldMs) {
                    // Still need to hold longer
                    this.onDropDenied('hold_required');
                    return false;
                }
                // Held long enough, allow drop
            } else {
                // Not holding - require hold for last car
                this.isHolding = false;
                this.onDropDenied('hold_required');
                return false;
            }
        }

        // Low car warning (not blocking, just informative)
        if (currentCarCount <= this.config.warningThreshold) {
            this.onLastCarWarning();
        }

        this.cooldownRemaining = 0;
        return true;
    }

    /**
     * Record that a drop just happened.
     * Call this AFTER successfully dropping a car.
     */
    recordDrop() {
        const now = Date.now();

        // Check if this is a consecutive drop (within reset window)
        if (now - this.lastDropTime < this.config.resetAfterMs) {
            this.consecutiveDrops++;
        } else {
            this.consecutiveDrops = 1;
        }

        this.lastDropTime = now;
        this.isHolding = false;
    }

    /**
     * Get the current cooldown based on consecutive drops.
     *
     * @returns {number} Current cooldown in milliseconds
     */
    getCurrentCooldown() {
        const baseCooldown = this.config.dropCooldownMs;
        const multiplier = Math.pow(this.config.consecutiveMultiplier, this.consecutiveDrops);
        return Math.min(baseCooldown * multiplier, this.config.maxCooldownMs);
    }

    /**
     * Get the progress of the current hold (for UI display).
     *
     * @returns {number} 0-1 progress toward completing the hold
     */
    getHoldProgress() {
        if (!this.isHolding) {
            return 0;
        }

        const elapsed = Date.now() - this.holdStartTime;
        return Math.min(1, elapsed / this.config.lastCarHoldMs);
    }

    /**
     * Reset all state (call when starting a new run).
     */
    reset() {
        this.lastDropTime = 0;
        this.consecutiveDrops = 0;
        this.holdStartTime = 0;
        this.isHolding = false;
        this.cooldownRemaining = 0;
    }

    /**
     * Get current state for debugging/UI.
     *
     * @returns {Object} Current protection state
     */
    getState() {
        const currentCooldown = this.getCurrentCooldown();
        const timeSinceLastDrop = Date.now() - this.lastDropTime;
        const cooldownRemaining = Math.max(0, currentCooldown - timeSinceLastDrop);
        this.cooldownRemaining = cooldownRemaining;
        return {
            consecutiveDrops: this.consecutiveDrops,
            currentCooldown,
            cooldownRemaining,
            isHolding: this.isHolding,
            holdProgress: this.getHoldProgress()
        };
    }
}

// ----------------------------------------------------------------------------
// VISUAL FEEDBACK HELPERS
// ----------------------------------------------------------------------------
// Ready-made functions to create visual feedback for drop protection events
// ----------------------------------------------------------------------------

/**
 * Create a "drop denied" screen flash.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {string} reason - Why the drop was denied
 */
export function createDeniedFlash(scene, reason = 'cooldown') {
    const { width, height } = scene.scale;

    // Red tint flash
    const flash = scene.add.rectangle(
        width * 0.5,
        height * 0.5,
        width,
        height,
        0xff0000,
        0.15
    );
    flash.setScrollFactor(0);
    flash.setDepth(150);

    scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy()
    });
}

/**
 * Create a "last car warning" indicator.
 *
 * @param {Phaser.Scene} scene - The game scene
 */
export function createLastCarWarning(scene) {
    const { width, height } = scene.scale;

    // Pulsing warning text
    const warning = scene.add.text(width * 0.5, height * 0.2, 'LAST CAR!', {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold'
    });
    warning.setOrigin(0.5);
    warning.setScrollFactor(0);
    warning.setDepth(150);

    scene.tweens.add({
        targets: warning,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 500,
        onComplete: () => warning.destroy()
    });
}

/**
 * Create a cooldown progress bar (call each frame while cooling down).
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} remaining - Remaining cooldown in ms
 * @param {number} total - Total cooldown in ms
 * @param {Phaser.GameObjects.Graphics} graphics - Reusable graphics object
 */
export function drawCooldownBar(scene, remaining, total, graphics) {
    const { width, height } = scene.scale;

    graphics.clear();

    if (remaining <= 0) {
        return;
    }

    const progress = remaining / total;
    const barWidth = 80;
    const barHeight = 6;
    const x = width * 0.5 - barWidth * 0.5;
    const y = height * 0.85;

    // Background
    graphics.fillStyle(0x333333, 0.7);
    graphics.fillRect(x, y, barWidth, barHeight);

    // Fill (shrinks as cooldown completes)
    graphics.fillStyle(0xff6666, 0.9);
    graphics.fillRect(x, y, barWidth * progress, barHeight);
}

/**
 * Create a hold progress indicator.
 *
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} progress - 0-1 hold progress
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {Phaser.GameObjects.Graphics} graphics - Reusable graphics object
 */
export function drawHoldProgress(scene, progress, x, y, graphics) {
    const radius = 20;

    graphics.clear();

    if (progress <= 0) {
        return;
    }

    // Background circle
    graphics.lineStyle(4, 0x666666, 0.5);
    graphics.strokeCircle(x, y, radius);

    // Progress arc
    graphics.lineStyle(4, 0xffcc00, 1);
    graphics.beginPath();
    graphics.arc(
        x,
        y,
        radius,
        -Math.PI * 0.5,  // Start at top
        -Math.PI * 0.5 + (Math.PI * 2 * progress),  // Progress clockwise
        false
    );
    graphics.strokePath();
}

// ----------------------------------------------------------------------------
// INTEGRATION EXAMPLE
// ----------------------------------------------------------------------------
// This shows how to integrate DropProtection into your game scene.
// Copy and adapt this code to your game-scene.js.
// ----------------------------------------------------------------------------

/*
INTEGRATION EXAMPLE (do not uncomment, this is documentation):

// In game-scene.js create():

import { DropProtection, createDeniedFlash, createLastCarWarning } from './systems/drop-protection.js';

// Create protection instance
this.dropProtection = new DropProtection(this, {
    onDropDenied: (reason) => {
        createDeniedFlash(this, reason);
        // Optional: play denied sound
        // this.sound.play('denied');
    },
    onLastCarWarning: () => {
        createLastCarWarning(this);
    },
    config: {
        minimumCars: 1,  // Keep at least 1 car
        warningThreshold: 3
    }
});

// In handleTacticalInputs():

handleTacticalInputs() {
    const dropRequested = this.inputController.consumeDropRequest();
    const isHoldingDrop = this.inputController.isHoldingDrop();  // Need to add this to input controller
    const carCount = this.train.getWeaponCars().length;

    if (dropRequested || isHoldingDrop) {
        if (this.dropProtection.canDrop(carCount, isHoldingDrop)) {
            this.train.jettisonTail();
            this.dropProtection.recordDrop();
        }
    }

    // ... rest of tactical inputs
}

// In cleanup():

cleanup() {
    this.dropProtection.reset();
    // ... rest of cleanup
}
*/
