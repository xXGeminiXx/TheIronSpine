/**
 * InputController - Handles all player input for the game.
 *
 * IMPORTANT: The steering target (targetX, targetY) is derived from the pointer's
 * SCREEN position converted to world coordinates using the camera transform each frame.
 * This prevents the "runaway train" bug where stale worldX/worldY values cause
 * the engine to steer toward an outdated position when the camera moves but
 * the pointer stays still.
 */
export class InputController {
    constructor(scene) {
        this.scene = scene;
        this.pointer = scene.input.activePointer;
        this.targetX = 0;
        this.targetY = 0;
        this.boostRequested = false;
        this.dropRequested = false;
        this.pulseRequested = false;

        // Track whether the pointer has ever been used so we don't steer
        // toward (0,0) before the player touches the screen.
        this.hasPointerMoved = false;

        // Store last known screen position so we can recalculate world
        // position each frame as the camera moves.
        this.lastPointerScreenX = 0;
        this.lastPointerScreenY = 0;

        this.keys = scene.input.keyboard
            ? scene.input.keyboard.addKeys({ drop: 'SPACE', pulse: 'E' })
            : null;

        this.pointerDownHandler = (pointer) => {
            this.boostRequested = true;
            this.hasPointerMoved = true;
            this.lastPointerScreenX = pointer.x;
            this.lastPointerScreenY = pointer.y;
        };

        this.pointerMoveHandler = (pointer) => {
            this.hasPointerMoved = true;
            this.lastPointerScreenX = pointer.x;
            this.lastPointerScreenY = pointer.y;
        };

        scene.input.on('pointerdown', this.pointerDownHandler);
        scene.input.on('pointermove', this.pointerMoveHandler);
    }

    update() {
        // Convert the last known screen position to world coordinates using
        // the camera. This ensures correct targeting even when the camera
        // moves but the pointer stays still on screen.
        const camera = this.scene.cameras.main;

        if (this.hasPointerMoved) {
            // Calculate world position from screen position using camera transform
            const worldPoint = camera.getWorldPoint(
                this.lastPointerScreenX,
                this.lastPointerScreenY
            );
            this.targetX = worldPoint.x;
            this.targetY = worldPoint.y;
        } else {
            // Before first pointer input, aim ahead of the engine so it moves forward
            const train = this.scene.train;
            if (train && train.engine) {
                this.targetX = train.engine.x + Math.cos(train.engine.rotation) * 200;
                this.targetY = train.engine.y + Math.sin(train.engine.rotation) * 200;
            }
        }

        if (this.keys) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.drop)) {
                this.dropRequested = true;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.pulse)) {
                this.pulseRequested = true;
            }
        }
        if (!this.keys && this.scene.sys.game.device.input.touch) {
            // Prevent mobile taps from triggering pulses/drops by default.
            this.dropRequested = false;
            this.pulseRequested = false;
        }
    }

    consumeBoostRequest() {
        const requested = this.boostRequested;
        this.boostRequested = false;
        return requested;
    }

    consumeDropRequest() {
        const requested = this.dropRequested;
        this.dropRequested = false;
        return requested;
    }

    consumePulseRequest() {
        const requested = this.pulseRequested;
        this.pulseRequested = false;
        return requested;
    }

    requestDrop() {
        this.dropRequested = true;
    }

    requestPulse() {
        this.pulseRequested = true;
    }

    destroy() {
        this.scene.input.off('pointerdown', this.pointerDownHandler);
        this.scene.input.off('pointermove', this.pointerMoveHandler);
    }
}
