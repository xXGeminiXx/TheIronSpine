/**
 * scrollbar.js - Reusable Scrollbar Module
 *
 * Provides scrollable container with draggable scrollbar for menus/settings.
 * Handles mouse wheel, touch drag, and scrollbar thumb dragging.
 *
 * USAGE:
 *   const scrollbar = new Scrollbar(scene, {
 *       x: 100, y: 100,
 *       width: 400, height: 300,
 *       contentHeight: 800
 *   });
 *   scrollbar.addContent(someDisplayObject);
 *
 * FEATURES:
 *   - Mouse wheel scrolling
 *   - Touch drag scrolling
 *   - Draggable scrollbar thumb
 *   - Auto-hide when content fits
 *   - Smooth scrolling with momentum
 */

const SCROLLBAR_WIDTH = 12;
const SCROLLBAR_TRACK_COLOR = 0x333333;
const SCROLLBAR_THUMB_COLOR = 0x666666;
const SCROLLBAR_THUMB_HOVER_COLOR = 0x888888;
const SCROLL_SPEED = 30; // Pixels per wheel tick
const MOMENTUM_DECAY = 0.92;

export class Scrollbar {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 400;
        this.height = config.height || 300;
        this.contentHeight = config.contentHeight || 0;

        this.scrollY = 0;
        this.scrollVelocity = 0;
        this.isDragging = false;
        this.dragStartY = 0;
        this.scrollStartY = 0;

        this.container = scene.add.container(this.x, this.y);
        this.contentContainer = scene.add.container(0, 0);
        this.container.add(this.contentContainer);

        // Mask for content clipping
        const maskGraphics = scene.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(this.x, this.y, this.width, this.height);
        const mask = maskGraphics.createGeometryMask();
        this.contentContainer.setMask(mask);
        this.mask = mask;

        // Scrollbar track
        this.track = scene.add.graphics();
        this.track.fillStyle(SCROLLBAR_TRACK_COLOR, 0.5);
        this.track.fillRect(
            this.x + this.width - SCROLLBAR_WIDTH,
            this.y,
            SCROLLBAR_WIDTH,
            this.height
        );
        this.track.setDepth(1000);
        this.track.setScrollFactor(0);

        // Scrollbar thumb
        this.thumb = scene.add.graphics();
        this.thumb.setDepth(1001);
        this.thumb.setScrollFactor(0);
        this.updateThumb();

        // Make thumb interactive
        const thumbHitArea = new Phaser.Geom.Rectangle(
            this.x + this.width - SCROLLBAR_WIDTH,
            this.y,
            SCROLLBAR_WIDTH,
            this.getThumbHeight()
        );
        this.thumb.setInteractive(thumbHitArea, Phaser.Geom.Rectangle.Contains);

        this.setupInteractivity();
        this.updateVisibility();
    }

    setupInteractivity() {
        // Mouse wheel scrolling
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.isPointerOver(pointer)) {
                return;
            }
            this.scroll(deltaY * SCROLL_SPEED / 100);
        });

        // Thumb dragging
        this.thumb.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.dragStartY = pointer.y;
            this.scrollStartY = this.scrollY;
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (!this.isDragging) {
                return;
            }

            const deltaY = pointer.y - this.dragStartY;
            const scrollDelta = deltaY / this.height * this.contentHeight;
            this.setScroll(this.scrollStartY + scrollDelta);
        });

        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });

        // Thumb hover effect
        this.thumb.on('pointerover', () => {
            this.updateThumb(true);
        });

        this.thumb.on('pointerout', () => {
            if (!this.isDragging) {
                this.updateThumb(false);
            }
        });
    }

    isPointerOver(pointer) {
        return pointer.x >= this.x &&
               pointer.x <= this.x + this.width &&
               pointer.y >= this.y &&
               pointer.y <= this.y + this.height;
    }

    addContent(displayObject) {
        this.contentContainer.add(displayObject);
    }

    scroll(delta) {
        this.scrollVelocity += delta;
    }

    setScroll(value) {
        const maxScroll = Math.max(0, this.contentHeight - this.height);
        this.scrollY = Phaser.Math.Clamp(value, 0, maxScroll);
        this.contentContainer.y = -this.scrollY;
        this.updateThumb();
    }

    update() {
        // Apply momentum
        if (Math.abs(this.scrollVelocity) > 0.1) {
            this.scroll(this.scrollVelocity);
            this.setScroll(this.scrollY + this.scrollVelocity);
            this.scrollVelocity *= MOMENTUM_DECAY;
        } else {
            this.scrollVelocity = 0;
        }
    }

    getThumbHeight() {
        const visibleRatio = this.height / this.contentHeight;
        return Math.max(30, this.height * visibleRatio);
    }

    getThumbY() {
        const maxScroll = Math.max(1, this.contentHeight - this.height);
        const scrollRatio = this.scrollY / maxScroll;
        const maxThumbY = this.height - this.getThumbHeight();
        return this.y + scrollRatio * maxThumbY;
    }

    updateThumb(hover = false) {
        this.thumb.clear();

        if (this.contentHeight <= this.height) {
            return; // No scrollbar needed
        }

        const thumbHeight = this.getThumbHeight();
        const thumbY = this.getThumbY();
        const color = hover ? SCROLLBAR_THUMB_HOVER_COLOR : SCROLLBAR_THUMB_COLOR;

        this.thumb.fillStyle(color, 0.8);
        this.thumb.fillRoundedRect(
            this.x + this.width - SCROLLBAR_WIDTH + 2,
            thumbY + 2,
            SCROLLBAR_WIDTH - 4,
            thumbHeight - 4,
            4
        );

        // Update hit area for dragging
        const hitArea = new Phaser.Geom.Rectangle(
            this.x + this.width - SCROLLBAR_WIDTH,
            thumbY,
            SCROLLBAR_WIDTH,
            thumbHeight
        );
        this.thumb.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    }

    updateVisibility() {
        const needsScrollbar = this.contentHeight > this.height;
        this.track.setVisible(needsScrollbar);
        this.thumb.setVisible(needsScrollbar);
    }

    setContentHeight(height) {
        this.contentHeight = height;
        this.updateVisibility();
        this.updateThumb();
        this.setScroll(this.scrollY); // Clamp if needed
    }

    destroy() {
        this.track.destroy();
        this.thumb.destroy();
        this.container.destroy();
        if (this.mask) {
            this.mask.destroy();
        }
    }
}
