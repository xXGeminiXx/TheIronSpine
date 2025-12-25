/**
 * world-gen.js - Procedural Parallax World Generation
 *
 * Creates a living, scrolling background that makes the player feel like
 * they're moving through an industrial wasteland. All graphics are
 * procedurally generated - no external assets required.
 *
 * ARCHITECTURE:
 *   The world consists of multiple parallax layers, each scrolling at
 *   different speeds relative to camera movement. Slower layers feel
 *   farther away, creating depth without 3D rendering.
 *
 * LAYERS (back to front):
 *   1. FAR_HAZE    - Distant atmospheric color gradient (0.1x scroll)
 *   2. TERRAIN     - Silhouetted hills/structures (0.3x scroll)
 *   3. DEBRIS      - Scattered wreckage and obstacles (0.6x scroll)
 *   4. GROUND      - The existing tile grid (1.0x scroll, handled by game-scene)
 *
 * PERFORMANCE:
 *   - Objects are pooled and recycled as they scroll off-screen
 *   - Only visible objects are updated each frame
 *   - Maximum entity count is capped to stay within budget
 *
 * EXTENSION:
 *   To add new debris types, add a generator function to DEBRIS_GENERATORS
 *   and include its key in the spawn weights. Each generator receives a
 *   Phaser scene and returns a container with the procedural graphics.
 *
 * WHY THIS MATTERS:
 *   A static background makes the game feel like a tech demo. A living,
 *   scrolling world makes it feel like an actual place. This is pure
 *   presentation polish - zero gameplay impact, maximum vibe improvement.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
// All tuning values in one place for easy experimentation.
// ============================================================================

const WORLD_CONFIG = Object.freeze({
    // Layer parallax speeds (multiplier of camera scroll)
    // Lower = appears farther away
    layers: {
        farHaze: 0.08,      // Distant atmosphere, barely moves
        terrain: 0.25,      // Mid-ground silhouettes
        debris: 0.55        // Near-ground scattered objects
    },

    // Color palette for procedural elements
    // Designed to complement PALETTE.background (#1a1a2e) and ground (#16213e)
    colors: {
        farHaze: 0x0d0d1a,          // Near-black blue, very dark
        hazeGradientTop: 0x1a1a2e,  // Matches background
        hazeGradientBottom: 0x0d0d1a,
        terrainDark: 0x0f1520,      // Silhouette color
        terrainMid: 0x151d28,       // Slightly lighter ridge
        debrisBase: 0x252530,       // Neutral gray-blue
        debrisAccent: 0x3a3a48,     // Highlight
        debrisDark: 0x18181f,       // Shadow
        warning: 0x8a7a00,          // Muted danger signs (was too bright)
        rust: 0x8b4513             // Rusty metal accents
    },

    // Debris spawning
    debris: {
        spawnDistance: 600,         // How far ahead to spawn debris
        despawnDistance: 400,       // How far behind to despawn
        density: 0.4,               // Probability per spawn check
        checkInterval: 0.3,         // Seconds between spawn checks
        maxObjects: 40,             // Maximum debris objects in world
        minScale: 0.6,              // Smallest debris scale
        maxScale: 1.4               // Largest debris scale
    },

    // Terrain silhouettes
    terrain: {
        segmentWidth: 200,          // Width of each terrain segment
        heightVariation: 40,        // Max height difference
        baseHeight: 80              // Base height from bottom
    }
});

// ============================================================================
// DEBRIS GENERATORS
// ============================================================================
// Each function creates a procedural debris object.
// Returns a Phaser container with all graphics attached.
// ============================================================================

const DEBRIS_GENERATORS = {
    /**
     * Destroyed vehicle hulk - burned out cars/trucks.
     * Creates a recognizable vehicle silhouette with damage.
     */
    vehicleWreck(scene) {
        const container = scene.add.container(0, 0);
        const colors = WORLD_CONFIG.colors;

        // Main chassis
        const bodyWidth = 40 + Math.random() * 20;
        const bodyHeight = 16 + Math.random() * 8;
        const body = scene.add.rectangle(0, 0, bodyWidth, bodyHeight, colors.debrisBase);
        body.setStrokeStyle(1, colors.debrisDark);

        // Cab section (if truck-like)
        const hasCab = Math.random() > 0.5;
        if (hasCab) {
            const cabWidth = bodyWidth * 0.3;
            const cabHeight = bodyHeight * 0.8;
            const cab = scene.add.rectangle(
                -bodyWidth * 0.3,
                -bodyHeight * 0.4,
                cabWidth,
                cabHeight,
                colors.debrisAccent
            );
            cab.setStrokeStyle(1, colors.debrisDark);
            container.add(cab);
        }

        // Wheels (or where wheels were)
        const wheelRadius = bodyHeight * 0.3;
        const wheelLeft = scene.add.circle(-bodyWidth * 0.3, bodyHeight * 0.3, wheelRadius, colors.debrisDark);
        const wheelRight = scene.add.circle(bodyWidth * 0.3, bodyHeight * 0.3, wheelRadius, colors.debrisDark);

        // Damage marks - random scratches
        const scratchCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < scratchCount; i++) {
            const scratch = scene.add.rectangle(
                (Math.random() - 0.5) * bodyWidth * 0.8,
                (Math.random() - 0.5) * bodyHeight * 0.6,
                bodyWidth * 0.2,
                2,
                colors.debrisDark
            );
            scratch.setRotation(Math.random() * Math.PI);
            container.add(scratch);
        }

        container.add([body, wheelLeft, wheelRight]);

        // Random rotation for variety
        container.setRotation((Math.random() - 0.5) * 0.3);

        return container;
    },

    /**
     * Warning sign - triangular danger markers.
     * Adds a splash of yellow to break up the monotony.
     */
    warningSign(scene) {
        const container = scene.add.container(0, 0);
        const colors = WORLD_CONFIG.colors;

        // Post
        const postHeight = 30 + Math.random() * 15;
        const post = scene.add.rectangle(0, postHeight * 0.3, 4, postHeight, colors.debrisBase);
        post.setStrokeStyle(1, colors.debrisDark);

        // Triangle sign
        const signSize = 16 + Math.random() * 8;
        const sign = scene.add.triangle(
            0,
            -postHeight * 0.2,
            0, -signSize,
            signSize, signSize * 0.5,
            -signSize, signSize * 0.5,
            colors.warning
        );
        sign.setStrokeStyle(2, colors.debrisDark);

        // Maybe the sign is damaged/tilted
        if (Math.random() > 0.6) {
            container.setRotation((Math.random() - 0.5) * 0.5);
        }

        container.add([post, sign]);
        return container;
    },

    /**
     * Metal debris pile - scattered junk.
     * Abstract shapes that suggest industrial waste.
     */
    debrisPile(scene) {
        const container = scene.add.container(0, 0);
        const colors = WORLD_CONFIG.colors;

        const pieceCount = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < pieceCount; i++) {
            const isRect = Math.random() > 0.4;
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 20;
            const color = Math.random() > 0.5 ? colors.debrisBase : colors.debrisAccent;

            let piece;
            if (isRect) {
                const width = 8 + Math.random() * 16;
                const height = 4 + Math.random() * 10;
                piece = scene.add.rectangle(offsetX, offsetY, width, height, color);
            } else {
                const radius = 4 + Math.random() * 8;
                const sides = Math.floor(Math.random() * 3) + 3; // 3-5 sides
                piece = scene.add.polygon(offsetX, offsetY,
                    this.generatePolygonPoints(radius, sides), color);
            }

            piece.setStrokeStyle(1, colors.debrisDark);
            piece.setRotation(Math.random() * Math.PI * 2);
            container.add(piece);
        }

        return container;
    },

    /**
     * Rail track segment - broken railway pieces.
     * Reinforces the train theme of the game.
     */
    railSegment(scene) {
        const container = scene.add.container(0, 0);
        const colors = WORLD_CONFIG.colors;

        // Two rails
        const railLength = 40 + Math.random() * 30;
        const railSpacing = 12;
        const rail1 = scene.add.rectangle(0, -railSpacing / 2, railLength, 3, colors.rust);
        const rail2 = scene.add.rectangle(0, railSpacing / 2, railLength, 3, colors.rust);

        // Cross ties
        const tieCount = Math.floor(railLength / 12);
        for (let i = 0; i < tieCount; i++) {
            const tieX = -railLength / 2 + (i + 0.5) * (railLength / tieCount);
            const tie = scene.add.rectangle(tieX, 0, 4, railSpacing + 6, colors.debrisDark);
            container.add(tie);
        }

        container.add([rail1, rail2]);

        // Random rotation - could be at any angle
        container.setRotation(Math.random() * Math.PI * 2);

        return container;
    },

    /**
     * Crater - explosion impact marks.
     * Circular depressions suggesting past battles.
     */
    crater(scene) {
        const container = scene.add.container(0, 0);
        const colors = WORLD_CONFIG.colors;

        const radius = 15 + Math.random() * 20;

        // Outer ring (darker)
        const outer = scene.add.circle(0, 0, radius, colors.debrisDark);
        outer.setAlpha(0.6);

        // Inner depression (even darker)
        const inner = scene.add.circle(0, 0, radius * 0.6, 0x0a0a0f);
        inner.setAlpha(0.5);

        // Scattered debris around edge
        const debrisCount = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < debrisCount; i++) {
            const angle = (i / debrisCount) * Math.PI * 2 + Math.random() * 0.5;
            const dist = radius * (0.8 + Math.random() * 0.4);
            const size = 3 + Math.random() * 5;
            const debris = scene.add.rectangle(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                size,
                size * 0.6,
                colors.debrisBase
            );
            debris.setRotation(angle);
            container.add(debris);
        }

        container.add([outer, inner]);
        return container;
    },

    // Helper function for polygon generation
    generatePolygonPoints(radius, sides) {
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const r = radius * (0.7 + Math.random() * 0.3); // Irregular shape
            points.push(Math.cos(angle) * r);
            points.push(Math.sin(angle) * r);
        }
        return points;
    }
};

// Spawn weights determine how often each debris type appears.
// Higher weight = more common.
// NOTE: Rail segments removed - they were too distracting crossing the play area
const DEBRIS_WEIGHTS = [
    { type: 'vehicleWreck', weight: 3 },
    { type: 'debrisPile', weight: 5 },
    { type: 'warningSign', weight: 2 },
    { type: 'crater', weight: 3 }
];

// Calculate total weight for random selection
const TOTAL_WEIGHT = DEBRIS_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

// ============================================================================
// WORLD MANAGER CLASS
// ============================================================================
// Handles creation, updating, and cleanup of all world layers.
// ============================================================================

export class WorldManager {
    /**
     * Creates the world manager and initializes all layers.
     *
     * @param {Phaser.Scene} scene - The game scene to add graphics to
     */
    constructor(scene) {
        this.scene = scene;

        // Track camera position for parallax calculation
        this.lastCameraX = 0;
        this.lastCameraY = 0;

        // Debris object pool
        this.debrisObjects = [];
        this.spawnTimer = 0;

        // Track spawned positions to avoid clustering
        this.recentSpawnPositions = [];

        // Create the layer containers in order (back to front)
        this.initializeLayers();
    }

    /**
     * Sets up the parallax layer containers.
     * Each layer is a container that scrolls at its own rate.
     */
    initializeLayers() {
        // Haze layer disabled - band edges were creating visible horizontal lines
        this.hazeLayer = this.scene.add.container(0, 0);
        this.hazeLayer.setDepth(1);
        // this.createHazeGradient();  // Disabled - caused dark horizontal lines

        // Terrain layer - silhouetted hills/structures at bottom
        this.terrainLayer = this.scene.add.container(0, 0);
        this.terrainLayer.setDepth(2);
        this.createTerrainSilhouettes();

        // Debris layer - scattered objects
        this.debrisLayer = this.scene.add.container(0, 0);
        this.debrisLayer.setDepth(3);
        // Debris spawns dynamically as the player moves
    }

    /**
     * Creates the far atmospheric haze layer.
     * A subtle gradient that adds depth without being distracting.
     */
    createHazeGradient() {
        const { width, height } = this.scene.scale;
        const colors = WORLD_CONFIG.colors;

        // Simple gradient approximation using stacked rectangles
        const bandCount = 4;
        for (let i = 0; i < bandCount; i++) {
            const bandHeight = height / bandCount;
            const y = (i + 0.5) * bandHeight;

            // Interpolate color from top to bottom
            const t = i / (bandCount - 1);
            const alpha = 0.15 + t * 0.25; // Darker at bottom

            const band = this.scene.add.rectangle(
                width / 2,
                y,
                width * 3, // Extra wide for scrolling
                bandHeight + 2,
                colors.farHaze
            );
            band.setAlpha(alpha);
            band.setScrollFactor(0); // Stays fixed, creates atmosphere
            this.hazeLayer.add(band);
        }
    }

    /**
     * Creates the terrain silhouette layer with actual mountain shapes.
     * Uses Phaser Graphics to draw filled mountain peaks.
     * Creates a distant mountain range effect at the bottom of the screen.
     */
    createTerrainSilhouettes() {
        const { width, height } = this.scene.scale;
        const colors = WORLD_CONFIG.colors;
        const config = WORLD_CONFIG.terrain;

        // Create a graphics object for the mountain range
        const mountains = this.scene.add.graphics();
        mountains.setScrollFactor(WORLD_CONFIG.layers.terrain, 0);
        mountains.setAlpha(0.8);

        // Generate mountain peaks across the width (with extra buffer for scrolling)
        const totalWidth = width * 4;
        const startX = -width;

        // Back layer - darker, taller mountains
        mountains.fillStyle(colors.terrainDark, 1);
        mountains.beginPath();
        mountains.moveTo(startX, height); // Start at bottom-left

        let x = startX;
        while (x < totalWidth) {
            // Randomized peak spacing and height
            const peakWidth = 150 + Math.random() * 200;
            const peakHeight = config.baseHeight + config.heightVariation * (0.6 + Math.random() * 0.4);

            // Draw up to peak
            mountains.lineTo(x + peakWidth * 0.5, height - peakHeight);
            // Draw down from peak
            mountains.lineTo(x + peakWidth, height - config.baseHeight * 0.3);

            x += peakWidth * 0.8; // Overlap peaks slightly
        }

        mountains.lineTo(totalWidth, height); // End at bottom-right
        mountains.closePath();
        mountains.fillPath();

        // Front layer - lighter, shorter mountains for depth
        mountains.fillStyle(colors.terrainMid, 1);
        mountains.beginPath();
        mountains.moveTo(startX, height);

        x = startX + 80; // Offset from back layer
        while (x < totalWidth) {
            const peakWidth = 100 + Math.random() * 150;
            const peakHeight = config.baseHeight * 0.6 + config.heightVariation * 0.4 * Math.random();

            mountains.lineTo(x + peakWidth * 0.5, height - peakHeight);
            mountains.lineTo(x + peakWidth, height - config.baseHeight * 0.2);

            x += peakWidth * 0.75;
        }

        mountains.lineTo(totalWidth, height);
        mountains.closePath();
        mountains.fillPath();

        this.terrainLayer.add(mountains);
    }

    /**
     * Main update loop. Call this every frame.
     *
     * @param {number} deltaSeconds - Time since last frame in seconds
     * @param {Phaser.Cameras.Scene2D.Camera} camera - The main camera
     */
    update(deltaSeconds, camera) {
        // Calculate camera movement delta
        const cameraDeltaX = camera.scrollX - this.lastCameraX;
        const cameraDeltaY = camera.scrollY - this.lastCameraY;
        this.lastCameraX = camera.scrollX;
        this.lastCameraY = camera.scrollY;

        // Update parallax layers
        this.updateParallax(cameraDeltaX, cameraDeltaY);

        // Handle debris spawning and cleanup
        this.spawnTimer += deltaSeconds;
        if (this.spawnTimer >= WORLD_CONFIG.debris.checkInterval) {
            this.spawnTimer = 0;
            this.trySpawnDebris(camera);
        }

        this.cleanupDebris(camera);
    }

    /**
     * Applies parallax scrolling to each layer based on camera movement.
     * NOTE: Terrain uses native scrollFactor, so we only manually move debris.
     *
     * @param {number} deltaX - Camera X movement this frame
     * @param {number} deltaY - Camera Y movement this frame
     */
    updateParallax(deltaX, deltaY) {
        const layers = WORLD_CONFIG.layers;

        // Terrain parallax is handled by scrollFactor on individual elements
        // No manual update needed for terrain layer

        // Debris layer - parallax both directions but less vertically
        this.debrisLayer.x -= deltaX * (1 - layers.debris);
        this.debrisLayer.y -= deltaY * (1 - layers.debris) * 0.3; // Reduced vertical movement
    }

    /**
     * Attempts to spawn new debris ahead of the camera.
     *
     * @param {Phaser.Cameras.Scene2D.Camera} camera - The main camera
     */
    trySpawnDebris(camera) {
        const config = WORLD_CONFIG.debris;

        // Don't exceed max objects
        if (this.debrisObjects.length >= config.maxObjects) {
            return;
        }

        // Random chance to spawn
        if (Math.random() > config.density) {
            return;
        }

        // Calculate spawn position ahead of camera
        const { width, height } = this.scene.scale;
        const cameraRight = camera.scrollX + width;

        // Spawn in a band ahead of the camera
        const spawnX = cameraRight + Math.random() * config.spawnDistance;
        // Only spawn in the lower 40% of the screen to avoid cluttering play area
        const spawnY = camera.scrollY + height * 0.6 + Math.random() * height * 0.4;

        // Check if too close to recent spawns
        const minDistance = 80;
        for (const pos of this.recentSpawnPositions) {
            const dx = spawnX - pos.x;
            const dy = spawnY - pos.y;
            if (dx * dx + dy * dy < minDistance * minDistance) {
                return; // Too close, skip spawn
            }
        }

        // Create the debris object
        const debris = this.spawnRandomDebris(spawnX, spawnY);
        if (debris) {
            this.debrisObjects.push({
                container: debris,
                worldX: spawnX,
                worldY: spawnY
            });

            // Track spawn position to avoid clustering
            this.recentSpawnPositions.push({ x: spawnX, y: spawnY });
            if (this.recentSpawnPositions.length > 10) {
                this.recentSpawnPositions.shift();
            }
        }
    }

    /**
     * Creates a random debris object at the specified position.
     *
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @returns {Phaser.GameObjects.Container} The debris container
     */
    spawnRandomDebris(x, y) {
        // Weighted random selection of debris type
        let roll = Math.random() * TOTAL_WEIGHT;
        let selectedType = 'debrisPile'; // Default fallback

        for (const item of DEBRIS_WEIGHTS) {
            roll -= item.weight;
            if (roll <= 0) {
                selectedType = item.type;
                break;
            }
        }

        // Get the generator function
        const generator = DEBRIS_GENERATORS[selectedType];
        if (!generator) {
            return null;
        }

        // Create the debris
        const container = generator.call(DEBRIS_GENERATORS, this.scene);

        // Position in world space
        container.setPosition(x, y);

        // Random scale for variety
        const config = WORLD_CONFIG.debris;
        const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
        container.setScale(scale);

        // Low alpha so debris stays in background and doesn't compete with gameplay
        container.setAlpha(0.2 + Math.random() * 0.15);

        // Add to debris layer
        this.debrisLayer.add(container);

        return container;
    }

    /**
     * Removes debris objects that have scrolled off-screen behind the camera.
     *
     * @param {Phaser.Cameras.Scene2D.Camera} camera - The main camera
     */
    cleanupDebris(camera) {
        const config = WORLD_CONFIG.debris;
        const cameraLeft = camera.scrollX - config.despawnDistance;

        // Remove debris that's too far behind
        for (let i = this.debrisObjects.length - 1; i >= 0; i--) {
            const debris = this.debrisObjects[i];

            // Calculate debris world position (accounting for parallax offset)
            const worldX = debris.worldX - this.debrisLayer.x * (1 / WORLD_CONFIG.layers.debris);

            if (worldX < cameraLeft) {
                debris.container.destroy();
                this.debrisObjects.splice(i, 1);
            }
        }
    }

    /**
     * Cleans up all world objects when the scene shuts down.
     */
    destroy() {
        // Destroy all debris
        for (const debris of this.debrisObjects) {
            debris.container.destroy();
        }
        this.debrisObjects.length = 0;

        // Destroy layer containers
        this.hazeLayer.destroy();
        this.terrainLayer.destroy();
        this.debrisLayer.destroy();
    }
}
