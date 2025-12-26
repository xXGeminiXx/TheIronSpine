import { COLOR_KEYS, PROC_BOSS, SPAWN, WAVES } from '../config.js';
import { pickRandom, randomBetween, randomInt, normalizeVector } from '../core/math.js';
import { generateBoss, spawnBoss, updateBoss } from './boss-gen.js';
import { getDifficultyModifiers } from '../core/difficulty.js';

/**
 * Picks a random element from array based on weights.
 * @param {Array} array - Elements to choose from
 * @param {Array<number>} weights - Weight for each element (higher = more likely)
 * @returns {*} Randomly selected element
 */
function weightedRandom(array, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < array.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return array[i];
        }
    }

    return array[array.length - 1];
}

export class Spawner {
    constructor(scene, train, pickupManager, combatSystem, endlessMode = null, difficulty = 'normal') {
        this.scene = scene;
        this.train = train;
        this.pickupManager = pickupManager;
        this.combatSystem = combatSystem;
        this.endlessMode = endlessMode;
        this.difficulty = difficulty; // v1.5.0 Difficulty tier
        this.difficultyMods = getDifficultyModifiers(difficulty); // v1.5.0
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
        this.waveKillStart = 0;
        this.currentFormationLabel = null;
    }

    update(deltaSeconds) {
        this.updatePickupSpawns(deltaSeconds);
        this.updateEnemySpawns(deltaSeconds);
    }

    /**
     * Returns color spawn weights based on current wave number.
     * Early game favors purple snipers, late game reduces them.
     * @returns {Array<number>} Weights for [red, blue, yellow, purple]
     */
    getColorWeights() {
        const wave = this.waveNumber;
        if (wave <= 5) {
            return SPAWN.colorWeightsEarly;
        } else if (wave <= 12) {
            return SPAWN.colorWeightsMid;
        } else {
            return SPAWN.colorWeightsLate;
        }
    }

    updatePickupSpawns(deltaSeconds) {
        this.pickupTimer -= deltaSeconds;
        if (this.pickupTimer > 0) {
            return;
        }

        const waveNumber = Math.max(1, this.waveNumber);
        const waveScale = Math.min(
            SPAWN.pickupTimeScaleMax,
            1 + (waveNumber - 1) * SPAWN.pickupTimeScalePerWave
        );
        const countScale = Math.max(
            SPAWN.pickupCountScaleMin,
            1 - (waveNumber - 1) * SPAWN.pickupCountScalePerWave
        );
        const tierScale = this.getTierPickupScale();

        // v1.5.0 Apply difficulty modifier (higher pickupSpawnRate = MORE pickups = FASTER spawns)
        // So we DIVIDE by the modifier to make pickups spawn faster on Easy, slower on Hard
        const difficultyScale = 1 / this.difficultyMods.pickupSpawnRate;
        const timeScale = waveScale * tierScale * difficultyScale;

        const countMin = Math.max(1, Math.round(SPAWN.pickupCountMin * countScale));
        const countMax = Math.max(countMin, Math.round(SPAWN.pickupCountMax * countScale));
        const pickupCount = randomInt(countMin, countMax);

        let remaining = pickupCount;
        if (remaining >= SPAWN.pickupCaravanMinCount && Math.random() < SPAWN.pickupCaravanChance) {
            const caravanCount = Math.min(
                remaining,
                randomInt(SPAWN.pickupCaravanMinCount, SPAWN.pickupCaravanMaxCount)
            );
            this.spawnPickupCaravan(caravanCount);
            remaining -= caravanCount;
        }

        for (let i = 0; i < remaining; i += 1) {
            this.spawnPickup();
        }

        this.pickupTimer = randomBetween(
            SPAWN.pickupSpawnMinSeconds * timeScale,
            SPAWN.pickupSpawnMaxSeconds * timeScale
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
            if (!this.hasWaveEnemies()) {
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

        const colorKey = weightedRandom(COLOR_KEYS, this.getColorWeights());
        this.pickupManager.spawnPickup(spawnPoint, colorKey, velocity);
    }

    spawnPickupCaravan(count) {
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
        const spacing = SPAWN.pickupCaravanSpacing;
        const colors = this.buildCaravanColors(count);

        for (let i = 0; i < count; i += 1) {
            const offset = spacing * i;
            const position = {
                x: spawnPoint.x - driftDirection.x * offset,
                y: spawnPoint.y - driftDirection.y * offset
            };
            this.pickupManager.spawnPickup(position, colors[i], velocity);
        }
    }

    buildCaravanColors(count) {
        const colors = [];
        const weights = this.getColorWeights();
        if (count >= 2) {
            const pairColor = weightedRandom(COLOR_KEYS, weights);
            colors.push(pairColor, pairColor);
            for (let i = 2; i < count; i += 1) {
                colors.push(weightedRandom(COLOR_KEYS, weights));
            }
            return colors;
        }

        colors.push(weightedRandom(COLOR_KEYS, weights));
        return colors;
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

    spawnSkirmisherAt(position, scale) {
        this.combatSystem.spawnEnemy('skirmisher', position, scale);
    }

    spawnSkirmisherFormation(count, scale) {
        const formation = this.pickFormationType(count);
        if (!formation) {
            for (let i = 0; i < count; i += 1) {
                this.spawnSkirmisher(scale);
            }
            return null;
        }

        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 40,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        const center = camera.midPoint;
        const driftDirection = normalizeVector(
            center.x - spawnPoint.x,
            center.y - spawnPoint.y
        );
        const right = { x: -driftDirection.y, y: driftDirection.x };
        const spacing = SPAWN.enemyFormationSpacing;
        const offsets = this.buildFormationOffsets(formation.key, count, spacing);

        offsets.forEach((offset) => {
            const position = {
                x: spawnPoint.x + driftDirection.x * offset.forward + right.x * offset.lateral,
                y: spawnPoint.y + driftDirection.y * offset.forward + right.y * offset.lateral
            };
            this.spawnSkirmisherAt(position, scale);
        });

        return formation.label;
    }

    pickFormationType(count) {
        const formations = [
            { key: 'wedge', label: 'Wedge', min: 4 },
            { key: 'column', label: 'Column', min: 3 },
            { key: 'line', label: 'Line', min: 4 },
            { key: 'pincer', label: 'Pincer', min: 5 }
        ];
        const options = formations.filter((formation) => count >= formation.min);
        if (options.length === 0) {
            return null;
        }
        return pickRandom(options);
    }

    buildFormationOffsets(type, count, spacing) {
        if (type === 'column') {
            return Array.from({ length: count }, (_, i) => ({
                forward: -spacing * i,
                lateral: 0
            }));
        }

        if (type === 'line') {
            const mid = (count - 1) * 0.5;
            return Array.from({ length: count }, (_, i) => ({
                forward: 0,
                lateral: (i - mid) * spacing
            }));
        }

        if (type === 'pincer') {
            const offsets = [];
            const leftCount = Math.ceil(count / 2);
            const rightCount = count - leftCount;
            for (let i = 0; i < leftCount; i += 1) {
                offsets.push({
                    forward: -spacing * i,
                    lateral: -spacing * 1.1
                });
            }
            for (let i = 0; i < rightCount; i += 1) {
                offsets.push({
                    forward: -spacing * i,
                    lateral: spacing * 1.1
                });
            }
            return offsets.slice(0, count);
        }

        const offsets = [];
        let row = 0;
        while (offsets.length < count) {
            const inRow = row + 1;
            const rowMid = (inRow - 1) * 0.5;
            for (let col = 0; col < inRow; col += 1) {
                offsets.push({
                    forward: -spacing * row,
                    lateral: (col - rowMid) * spacing
                });
                if (offsets.length >= count) {
                    break;
                }
            }
            row += 1;
        }
        return offsets;
    }

    spawnRanger(scale) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 50,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        this.combatSystem.spawnEnemy('ranger', spawnPoint, scale);
    }

    spawnArmored(scale) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 70,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        this.combatSystem.spawnEnemy('armored', spawnPoint, scale);
    }

    spawnHarpooner(scale) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 60,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        this.combatSystem.spawnEnemy('harpooner', spawnPoint, scale);
    }

    spawnMinelayer(scale) {
        const camera = this.scene.cameras.main;
        const forward = this.getForwardVector();
        const padding = this.getDynamicPadding(
            SPAWN.spawnPadding + 60,
            SPAWN.enemyPaddingPerCar
        );
        const spawnPoint = this.getEdgeSpawnPoint(camera, forward, padding);
        this.combatSystem.spawnEnemy('minelayer', spawnPoint, scale);
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

        // v1.4.0 Procedural boss generation
        if (type === 'boss' && PROC_BOSS.enabled) {
            const difficulty = Math.min(
                Math.floor(this.waveNumber * PROC_BOSS.difficultyPerWave),
                PROC_BOSS.maxDifficulty
            );
            const bossConfig = generateBoss(difficulty);
            const boss = spawnBoss(this.scene, bossConfig, spawnPoint);

            // Register as special enemy with combat system
            this.combatSystem.enemies.push({
                ...boss,
                type: 'boss',
                isProcedural: true,
                baseColor: boss.config.coreColor,
                trim: boss.config.trimColor
            });

            // Show boss intro if screen effects available
            if (this.scene.screenEffects) {
                this.scene.screenEffects.desaturate(1000, 0.6);
            }
        } else {
            // Standard static enemy
            this.combatSystem.spawnEnemy(type, spawnPoint, scale);
        }
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
        let padding = basePadding + extra;

        // v1.4.0 Apply weather modifiers
        if (this.scene.weather) {
            const weatherMods = this.scene.weather.getModifiers();
            padding *= weatherMods.enemyDetectionRange;
        }

        return padding;
    }

    getTierPickupScale() {
        // Use current highest tier so recovery is still possible after losses.
        const cars = this.train ? this.train.getWeaponCars() : [];
        const maxTier = cars.reduce((max, car) => Math.max(max, car.tier), 1);
        const tierSteps = Math.max(0, maxTier - 2);
        const scale = 1 + tierSteps * SPAWN.pickupTierScalePerTier;
        return Math.min(SPAWN.pickupTierScaleMax, scale);
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
        const skirmisherCount = this.getSkirmisherCount(this.waveNumber);
        const rangerCount = this.getRangerCount(this.waveNumber);
        const armoredCount = this.getArmoredCount(this.waveNumber);
        const harpoonerCount = this.getHarpoonerCount(this.waveNumber);
        const minelayerCount = this.getMinelayerCount(this.waveNumber);
        this.waveKillStart = this.combatSystem.stats.enemiesDestroyed;

        this.currentFormationLabel = null;
        if (skirmisherCount >= SPAWN.enemyFormationMinCount
            && Math.random() < SPAWN.enemyFormationChance) {
            this.currentFormationLabel = this.spawnSkirmisherFormation(
                skirmisherCount,
                scale
            );
        } else {
            for (let i = 0; i < skirmisherCount; i += 1) {
                this.spawnSkirmisher(scale);
            }
        }
        for (let i = 0; i < rangerCount; i += 1) {
            this.spawnRanger(scale);
        }
        for (let i = 0; i < armoredCount; i += 1) {
            this.spawnArmored(scale);
        }
        for (let i = 0; i < harpoonerCount; i += 1) {
            this.spawnHarpooner(scale);
        }
        for (let i = 0; i < minelayerCount; i += 1) {
            this.spawnMinelayer(scale);
        }

        this.pendingEliteType = this.getEliteTypeForWave(this.waveNumber);
        this.activeEliteType = null;
        this.wavePhase = 'skirmish';
    }

    finishWave() {
        if (this.isEndless()) {
            const waveKills = this.combatSystem.stats.enemiesDestroyed - this.waveKillStart;
            this.endlessMode.completeWave(this.waveNumber, Math.max(0, waveKills));
        }

        this.currentFormationLabel = null;
        if (!this.isEndless() && this.waveNumber >= WAVES.totalToWin) {
            this.wavePhase = 'complete';
            this.victoryReady = true;
            return;
        }

        this.wavePhase = 'waiting';
        this.waveTimer = WAVES.interWaveDelaySeconds;
    }

    getEliteTypeForWave(waveNumber) {
        if (this.isEndless()) {
            const config = this.endlessMode.getWaveConfig(waveNumber);
            if (config.spawnBoss) {
                return 'boss';
            }
            if (config.spawnChampion) {
                return 'champion';
            }
            if (Math.random() < config.eliteChance) {
                return 'champion';
            }
            return null;
        }

        if (waveNumber % WAVES.bossEvery === 0) {
            return 'boss';
        }
        if (waveNumber % WAVES.championEvery === 0) {
            return 'champion';
        }
        return null;
    }

    getWaveScale(waveNumber) {
        let baseScale;

        if (this.isEndless()) {
            const config = this.endlessMode.getWaveConfig(waveNumber);
            baseScale = {
                hp: config.hpMultiplier,
                damage: config.damageMultiplier,
                speed: config.speedMultiplier
            };
        } else {
            const step = Math.max(0, waveNumber - 1);

            // v1.5.0 Milestone wave bonuses
            let milestoneBonus = { hp: 0, damage: 0 };
            if (WAVES.milestoneWaves && WAVES.milestoneWaves.includes(waveNumber)) {
                milestoneBonus = {
                    hp: WAVES.milestoneHpBonus || 0,
                    damage: WAVES.milestoneDamageBonus || 0
                };
            }

            baseScale = {
                hp: 1 + step * WAVES.hpScalePerWave + milestoneBonus.hp,
                damage: 1 + step * WAVES.damageScalePerWave + milestoneBonus.damage,
                speed: 1 + step * WAVES.speedScalePerWave
            };
        }

        // v1.5.0 Apply difficulty modifiers on top of wave scaling
        return {
            hp: baseScale.hp * this.difficultyMods.enemyHp,
            damage: baseScale.damage * this.difficultyMods.enemyDamage,
            speed: baseScale.speed * this.difficultyMods.enemySpeed
        };
    }

    getSkirmisherCount(waveNumber) {
        if (this.isEndless()) {
            const config = this.endlessMode.getWaveConfig(waveNumber);
            return config.enemyCount;
        }

        const step = Math.max(0, waveNumber - 1);
        const extra = Math.min(
            WAVES.maxExtraEnemies,
            Math.floor(step / WAVES.enemyCountStep) * WAVES.enemyCountIncrease
        );
        return WAVES.baseEnemyCount + extra;
    }

    getRangerCount(waveNumber) {
        if (waveNumber < WAVES.rangerStartWave) {
            return 0;
        }

        const step = Math.floor((waveNumber - WAVES.rangerStartWave) / WAVES.rangerIncreaseEvery);
        const count = WAVES.rangerCountBase + step;
        return Math.min(WAVES.rangerCountMax, count);
    }

    getArmoredCount(waveNumber) {
        if (waveNumber < WAVES.armoredStartWave) {
            return 0;
        }

        const step = Math.floor((waveNumber - WAVES.armoredStartWave) / WAVES.armoredIncreaseEvery);
        const count = WAVES.armoredCountBase + step;
        return Math.min(WAVES.armoredCountMax, count);
    }

    getHarpoonerCount(waveNumber) {
        if (waveNumber < WAVES.harpoonerStartWave) {
            return 0;
        }

        const step = Math.floor((waveNumber - WAVES.harpoonerStartWave) / WAVES.harpoonerIncreaseEvery);
        const count = WAVES.harpoonerCountBase + step;
        return Math.min(WAVES.harpoonerCountMax, count);
    }

    getMinelayerCount(waveNumber) {
        if (waveNumber < WAVES.minelayerStartWave) {
            return 0;
        }

        const step = Math.floor((waveNumber - WAVES.minelayerStartWave) / WAVES.minelayerIncreaseEvery);
        const count = WAVES.minelayerCountBase + step;
        return Math.min(WAVES.minelayerCountMax, count);
    }

    hasEnemyType(type) {
        if (!type) {
            return false;
        }
        return this.combatSystem.enemies.some((enemy) => enemy.type === type);
    }

    hasWaveEnemies() {
        return this.combatSystem.enemies.some((enemy) => (
            enemy.type === 'skirmisher'
            || enemy.type === 'ranger'
            || enemy.type === 'armored'
            || enemy.type === 'harpooner'
            || enemy.type === 'minelayer'
        ));
    }

    isVictoryReady() {
        return this.victoryReady && !this.isEndless();
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
        const isEndless = this.isEndless();
        const formattedWave = isEndless
            ? this.endlessMode.getWaveConfig(this.waveNumber || 1).formattedWave
            : `${this.waveNumber}`;
        return {
            number: this.waveNumber,
            total: isEndless ? null : WAVES.totalToWin,
            phase: this.wavePhase,
            eliteType: this.activeEliteType || this.pendingEliteType,
            nextWaveIn: this.wavePhase === 'waiting' ? this.waveTimer : 0,
            formattedWave,
            isEndless,
            formationLabel: this.currentFormationLabel
        };
    }

    isEndless() {
        return Boolean(this.endlessMode && this.endlessMode.isEnabled());
    }
}
