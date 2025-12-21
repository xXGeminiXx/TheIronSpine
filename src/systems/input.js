export class InputController {
    constructor(scene) {
        this.scene = scene;
        this.pointer = scene.input.activePointer;
        this.targetX = 0;
        this.targetY = 0;
        this.boostRequested = false;
        this.dropRequested = false;
        this.pulseRequested = false;
        this.keys = scene.input.keyboard
            ? scene.input.keyboard.addKeys({ drop: 'SPACE', pulse: 'E' })
            : null;

        this.pointerDownHandler = () => {
            this.boostRequested = true;
        };
        scene.input.on('pointerdown', this.pointerDownHandler);
    }

    update() {
        this.targetX = this.pointer.worldX;
        this.targetY = this.pointer.worldY;

        if (this.keys) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.drop)) {
                this.dropRequested = true;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.pulse)) {
                this.pulseRequested = true;
            }
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

    destroy() {
        this.scene.input.off('pointerdown', this.pointerDownHandler);
    }
}
