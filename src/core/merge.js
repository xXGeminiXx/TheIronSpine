import { COLORS } from '../config.js';
import { debugLog } from './debug.js';

// Merge pacing keeps the sequence readable without stalling movement.
const MERGE_TIMINGS = Object.freeze({
    telegraph: 0.2,
    collapse: 0.1,
    flash: 0.05,
    spawn: 0.05
});

export class MergeManager {
    constructor(scene, train, eventHandlers = {}) {
        this.scene = scene;
        this.train = train;
        this.eventHandlers = eventHandlers;
        this.activeMerge = null;
    }

    update(deltaSeconds) {
        if (this.activeMerge) {
            this.updateActiveMerge(deltaSeconds);
            return;
        }

        const mergeCandidate = this.detectMergeCandidate();
        if (mergeCandidate) {
            this.startMerge(mergeCandidate);
        }
    }

    detectMergeCandidate() {
        const cars = this.train.getWeaponCars();
        if (cars.length < 2) {
            return null;
        }

        for (let index = 0; index < cars.length - 1; index += 1) {
            const first = cars[index];
            const second = cars[index + 1];

            if (first.isMerging || second.isMerging) {
                continue;
            }

            if (first.colorKey !== second.colorKey) {
                continue;
            }

            if (first.tier !== second.tier) {
                continue;
            }

            return {
                startIndex: index,
                colorKey: first.colorKey,
                newTier: first.tier + 1,
                carIds: [first.id, second.id]
            };
        }

        return null;
    }

    startMerge(mergeData) {
        const cars = mergeData.carIds.map((id) => this.train.getCarById(id));
        if (cars.some((car) => !car)) {
            return;
        }

        for (const car of cars) {
            car.isMerging = true;
        }

        this.activeMerge = {
            ...mergeData,
            elapsed: 0,
            phase: 'telegraph',
            collapseStartPositions: null,
            flashGraphic: null
        };

        debugLog('Merge started', mergeData);

        if (this.eventHandlers.onMergeStart) {
            this.eventHandlers.onMergeStart(mergeData);
        }
    }

    updateActiveMerge(deltaSeconds) {
        if (!this.activeMerge) {
            return;
        }

        const merge = this.activeMerge;
        const cars = merge.carIds.map((id) => this.train.getCarById(id));
        if (cars.some((car) => !car)) {
            this.cancelMerge('car missing');
            return;
        }

        merge.elapsed += deltaSeconds;

        if (merge.phase === 'telegraph') {
            const progress = Math.min(merge.elapsed / MERGE_TIMINGS.telegraph, 1);
            const pulse = 1 + Math.sin(progress * Math.PI) * 0.08;
            cars.forEach((car) => car.container.setScale(pulse));

            if (merge.elapsed >= MERGE_TIMINGS.telegraph) {
                merge.phase = 'collapse';
                merge.elapsed = 0;
                merge.collapseStartPositions = cars.map((car) => ({
                    x: car.x,
                    y: car.y
                }));
            }
            return;
        }

        if (merge.phase === 'collapse') {
            const progress = Math.min(merge.elapsed / MERGE_TIMINGS.collapse, 1);
            const [startA, startB] = merge.collapseStartPositions;
            const centerPosition = {
                x: (startA.x + startB.x) * 0.5,
                y: (startA.y + startB.y) * 0.5
            };

            cars[0].x = Phaser.Math.Linear(startA.x, centerPosition.x, progress);
            cars[0].y = Phaser.Math.Linear(startA.y, centerPosition.y, progress);
            cars[1].x = Phaser.Math.Linear(startB.x, centerPosition.x, progress);
            cars[1].y = Phaser.Math.Linear(startB.y, centerPosition.y, progress);

            cars[0].container.x = cars[0].x;
            cars[0].container.y = cars[0].y;
            cars[1].container.x = cars[1].x;
            cars[1].container.y = cars[1].y;

            if (merge.elapsed >= MERGE_TIMINGS.collapse) {
                merge.phase = 'flash';
                merge.elapsed = 0;
            }
            return;
        }

        if (merge.phase === 'flash') {
            const centerPosition = {
                x: (cars[0].x + cars[1].x) * 0.5,
                y: (cars[0].y + cars[1].y) * 0.5
            };
            if (!merge.flashGraphic) {
                merge.flashGraphic = this.scene.add.circle(
                    centerPosition.x,
                    centerPosition.y,
                    16,
                    0xffffff
                );
                merge.flashGraphic.setDepth(30);
            }

            const progress = Math.min(merge.elapsed / MERGE_TIMINGS.flash, 1);
            merge.flashGraphic.setAlpha(1 - progress);
            merge.flashGraphic.setScale(1 + progress * 1.5);
            merge.flashGraphic.x = centerPosition.x;
            merge.flashGraphic.y = centerPosition.y;

            if (merge.elapsed >= MERGE_TIMINGS.flash) {
                merge.phase = 'spawn';
                merge.elapsed = 0;
            }
            return;
        }

        if (merge.phase === 'spawn') {
            const spawnPosition = {
                x: (cars[0].x + cars[1].x) * 0.5,
                y: (cars[0].y + cars[1].y) * 0.5
            };
            this.train.mergeCars(
                merge.startIndex,
                merge.newTier,
                merge.colorKey,
                spawnPosition,
                merge.carIds.length
            );

            this.finishMerge();
        }
    }

    cancelMerge(reason) {
        if (!this.activeMerge) {
            return;
        }

        const cars = this.activeMerge.carIds.map((id) => this.train.getCarById(id));
        cars.forEach((car) => {
            if (car) {
                car.isMerging = false;
                car.container.setScale(1);
            }
        });

        if (this.activeMerge.flashGraphic) {
            this.activeMerge.flashGraphic.destroy();
        }

        debugLog('Merge canceled', reason);
        this.activeMerge = null;
    }

    finishMerge() {
        if (!this.activeMerge) {
            return;
        }

        const colorKey = this.activeMerge.colorKey;
        const colorHex = COLORS[colorKey] ? COLORS[colorKey].hex : '#ffffff';
        debugLog('Merge completed', { colorKey });

        if (this.activeMerge.flashGraphic) {
            this.activeMerge.flashGraphic.destroy();
        }

        if (this.eventHandlers.onMergeCompleted) {
            this.eventHandlers.onMergeCompleted(colorKey, colorHex);
        }

        this.activeMerge = null;
    }
}
