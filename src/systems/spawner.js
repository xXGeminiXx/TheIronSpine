import { COLOR_KEYS, SPAWN, WAVES } from '../config.js';
import { pickRandom, randomBetween, randomInt, normalizeVector } from '../core/math.js';

export class Spawner {
    constructor(scene, train, pickupManager, combatSystem) {
        this.scene = scene;
        this.train = train;
        this.pickupManager = pickupManager;
        this.combatSystem = combatSystem;
        this.pickupTimer = randomBetween(
            SPAWN.pickupSpawnMinSeconds,
            SPAWN.pickupSpawnMaxSeconds
        );
        this.waveTimer = WAVES.initialDelaySeconds;
        this.waveNumber = 0;
        this.wavePhase = 'waiting';
        this.pendingEliteType = null;
        this.activeEliteType = null;
        this.victoryReady = false;
    }

    update(deltaSeconds) {
        this.updatePickupSpawns(deltaSeconds);
        this.updateEnemySpawns(deltaSeconds);
    }

    updatePickupSpawns(deltaSeconds) {
        this.pickupTimer -= deltaSeconds;
        if (this.pickupTimer > 0) {
            return;
        }

        const waveNumber = Math.max(1, this.waveNumber);
        const lateRun = waveNumber >= 10;
        const scale = lateRun ? 1.5 : 1;
        const countMin = lateRun
            ? Math.max(1, Math.floor(SPAWN.pickupCountMin / 2))
            : SPAWN.pickupCountMin;
        const countMax = lateRun
            ? Math.max(2, Math.floor(SPAWN.pickupCountMax / 2))
            : SPAWN.pickupCountMax;
        const pickupCount = randomInt(countMin, countMax);

        for (let i = 0; i < pickupCount; i += 1) {
            this.spawnPickup();
        }

        this.pickupTimer = randomBetween(
            SPAWN.pickupSpawnMinSeconds * scale,
            SPAWN.pickupSpawnMaxSeconds * scale
        );
    }

    updateEnemySpawns(deltaSeconds) {
        if (this.victoryReady) {
            return;
        }

        // Wave phases: waiting -> skirmish -> elite (optional) -> waiting.
        if (this.wavePhase === 'waiting') {
            this.waveTimer = Math.max(0, this.waveTimer - deltaSeconds);
            if (this.waveTimer === 0) {
                this.startWave();
            }
            return;
        }

        if (this.wavePhase === 'skirmish') {
            if (!this.hasEnemyType('skirmisher')) {
                if (this.pendingEliteType) {
                    this.spawnElite(this.pendingEliteType);
                    this.activeEliteType = this.pendingEliteType;
                    this.pendingEliteType = null;
                    this.wavePhase = 'elite';
                } else {
                    this.finishWave();
                }
            }
            return;
        }

        if (this.wavePhase === 'elite') {
            if (!this.hasEnemyType(this.activeEliteType)) {
                this.finishWave();
            }
        }
    }

    spawnPickup() {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding,
            SPAWN.pickupPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        const center = camera.midPoint;
        const driftDirection = normalizeVector(
            center.x - spawnPoint.x,
            center.y - spawnPoint.y
        );

        const velocity = {
            x: driftDirection.x * SPAWN.pickupDriftSpeed,
            y: driftDirection.y * SPAWN.pickupDriftSpeed
        };

        const colorKey = pickRandom(COLOR_KEYS);
        this.pickupManager.spawnPickup(spawnPoint, colorKey, velocity);
    }

    spawnSkirmisher(scale) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 40,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        this.combatSystem.spawnEnemy('skirmisher', spawnPoint, scale);
    }

    spawnElite(type) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 60,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        const scale = this.getWaveScale(this.waveNumber);
        this.combatSystem.spawnEnemy(type, spawnPoint, scale);
    }

    getForwardVector() {
        return {
            x: Math.cos(this.train.engine.rotation),
            y: Math.sin(this.train.engine.rotation)
        };
    }

    getDynamicPadding(basePadding, perCarPadding) {
        const carCount = this.train ? this.train.cars.length : 0;
        const extra = Math.min(SPAWN.maxExtraPadding, carCount * perCarPadding);
        return basePadding + extra;
    }

    getEdgeSpawnPoint(camera, forward, padding) {
        const view = camera.worldView;
        const left = view.x - padding;
        const right = view.x + view.width + padding;
        const top = view.y - padding;
        const bottom = view.y + view.height + padding;

        const edges = [
            {
                name: 'top',
                normal: { x: 0, y: -1 },
                pick: () => ({ x: randomBetween(left, right), y: top })
            },
            {
                name: 'bottom',
                normal: { x: 0, y: 1 },
                pick: () => ({ x: randomBetween(left, right), y: bottom })
            },
            {
                name: 'left',
                normal: { x: -1, y: 0 },
                pick: () => ({ x: left, y: randomBetween(top, bottom) })
            },
            {
                name: 'right',
                normal: { x: 1, y: 0 },
                pick: () => ({ x: right, y: randomBetween(top, bottom) })
            }
        ];

        // Favor edges in front of the engine to reward forward steering.
        const weights = edges.map((edge) => {
            const dot = edge.normal.x * forward.x + edge.normal.y * forward.y;
            return 0.2 + Math.max(0, dot);
        });

        const totalWeight = weights.reduce((sum, value) => sum + value, 0);
        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        for (let index = 0; index < edges.length; index += 1) {
            cumulative += weights[index];
            if (roll <= cumulative) {
                return edges[index].pick();
            }
        }

        return pickRandom(edges).pick();
    }

    startWave() {
        this.waveNumber += 1;
        const scale = this.getWaveScale(this.waveNumber);
        for (let i = 0; i < WAVES.baseEnemyCount; i += 1) {
            this.spawnSkirmisher(scale);
        }

        this.pendingEliteType = this.getEliteTypeForWave(this.waveNumber);
        this.activeEliteType = null;
        this.wavePhase = 'skirmish';
    }

    finishWave() {
        if (this.waveNumber >= WAVES.totalToWin) {
            this.wavePhase = 'complete';
            this.victoryReady = true;
            return;
        }

        this.wavePhase = 'waiting';
        this.waveTimer = WAVES.interWaveDelaySeconds;
    }

    getEliteTypeForWave(waveNumber) {
        if (waveNumber % WAVES.bossEvery === 0) {
            return 'boss';
        }
        if (waveNumber % WAVES.championEvery === 0) {
            return 'champion';
        }
        return null;
    }

    getWaveScale(waveNumber) {
        const step = Math.max(0, waveNumber - 1);
        return {
            hp: 1 + step * WAVES.hpScalePerWave,
            damage: 1 + step * WAVES.damageScalePerWave,
            speed: 1 + step * WAVES.speedScalePerWave
        };
    }

    hasEnemyType(type) {
        if (!type) {
            return false;
        }
        return this.combatSystem.enemies.some((enemy) => enemy.type === type);
    }

    isVictoryReady() {
        return this.victoryReady;
    }

    forceNextWave() {
        if (this.wavePhase === 'waiting') {
            this.waveTimer = 0;
            return;
        }

        if (this.wavePhase === 'skirmish' || this.wavePhase === 'elite') {
            this.finishWave();
        }
    }

    spawnDebugSkirmishers(count = 5) {
        const scale = this.getWaveScale(this.waveNumber || 1);
        for (let i = 0; i < count; i += 1) {
            this.spawnSkirmisher(scale);
        }
    }

    spawnDebugEnemy(type) {
        const scale = this.getWaveScale(this.waveNumber || 1);
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 60,
            SPAWN.enemyPaddingPerCar
        );
        this.combatSystem.spawnEnemy(type, this.getEdgeSpawnPoint(
            this.scene.cameras.main,
            this.getForwardVector(),
            padding
        ), scale);
    }

    getWaveStatus() {
        return {
            number: this.waveNumber,
            total: WAVES.totalToWin,
            phase: this.wavePhase,
            eliteType: this.activeEliteType || this.pendingEliteType,
            nextWaveIn: this.wavePhase === 'waiting' ? this.waveTimer : 0
        };
    }
}
