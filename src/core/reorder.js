/**
 * reorder.js - Car reordering logic
 *
 * Reordering is a tactical sort that pushes higher tiers toward the engine
 * and groups same-color cars within each tier. This preserves the merge
 * rule while giving the player a deterministic recovery tool.
 *
 * This file owns the reordering algorithm. Train only applies a new order.
 */

import { COLOR_KEYS } from '../config.js';
import { debugLog, devAssert } from './debug.js';

export class ReorderManager {
    constructor(train, eventHandlers = {}) {
        this.train = train;
        this.eventHandlers = eventHandlers;
    }

    requestReorder() {
        if (this.eventHandlers.canReorder && !this.eventHandlers.canReorder()) {
            return false;
        }

        const currentOrder = [...this.train.getWeaponCars()];
        if (currentOrder.length < 2) {
            return false;
        }

        const reordered = this.buildReorderedCars(currentOrder);
        if (this.isSameOrder(currentOrder, reordered)) {
            return false;
        }

        const slots = this.train.getCarSlots();
        this.train.applyCarOrder(reordered, slots);

        debugLog('Cars reordered', {
            from: currentOrder.map((car) => car.id),
            to: reordered.map((car) => car.id)
        });

        if (this.eventHandlers.onReorder) {
            this.eventHandlers.onReorder(reordered);
        }

        return true;
    }

    buildReorderedCars(currentOrder) {
        // Descending tiers keep the highest numbers closest to the engine.
        const tiers = this.getSortedTiers(currentOrder);
        const buckets = this.buildTierBuckets(currentOrder);

        const ordered = [];
        const knownColors = new Set(COLOR_KEYS);

        for (const tier of tiers) {
            const bucket = buckets.get(tier);
            if (!bucket) {
                continue;
            }
            // Group by color inside each tier to maximize merge adjacency.
            for (const colorKey of COLOR_KEYS) {
                const group = bucket[colorKey];
                if (group && group.length > 0) {
                    ordered.push(...group);
                }
            }

            // Preserve any unexpected colors in a deterministic order.
            const extras = Object.keys(bucket)
                .filter((key) => !knownColors.has(key))
                .sort();
            for (const colorKey of extras) {
                const group = bucket[colorKey];
                if (group && group.length > 0) {
                    ordered.push(...group);
                }
            }
        }

        devAssert(
            ordered.length === currentOrder.length,
            'Reorder must keep all cars'
        );
        this.verifySameCars(currentOrder, ordered);

        return ordered;
    }

    getSortedTiers(cars) {
        const tiers = new Set();
        cars.forEach((car) => tiers.add(car.tier));
        return Array.from(tiers).sort((a, b) => b - a);
    }

    buildTierBuckets(cars) {
        const buckets = new Map();

        // Preserve original order within each tier+color bucket.
        for (const car of cars) {
            let bucket = buckets.get(car.tier);
            if (!bucket) {
                bucket = {};
                for (const colorKey of COLOR_KEYS) {
                    bucket[colorKey] = [];
                }
                buckets.set(car.tier, bucket);
            }

            if (!bucket[car.colorKey]) {
                bucket[car.colorKey] = [];
            }

            bucket[car.colorKey].push(car);
        }

        return buckets;
    }

    isSameOrder(currentOrder, newOrder) {
        if (currentOrder.length !== newOrder.length) {
            return false;
        }

        for (let index = 0; index < currentOrder.length; index += 1) {
            if (currentOrder[index].id !== newOrder[index].id) {
                return false;
            }
        }

        return true;
    }

    verifySameCars(currentOrder, newOrder) {
        const originalIds = new Set(currentOrder.map((car) => car.id));
        const newIds = new Set(newOrder.map((car) => car.id));

        devAssert(
            originalIds.size === currentOrder.length,
            'Reorder input should not contain duplicate IDs'
        );
        devAssert(
            newIds.size === newOrder.length,
            'Reorder output should not contain duplicate IDs'
        );
        devAssert(
            originalIds.size === newIds.size,
            'Reorder must preserve car count'
        );

        for (const id of originalIds) {
            devAssert(newIds.has(id), `Reorder missing car id ${id}`);
        }
    }
}
