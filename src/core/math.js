export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, t) {
    return start + (end - start) * t;
}

export function approach(current, target, maxDelta) {
    if (current < target) {
        return Math.min(current + maxDelta, target);
    }
    if (current > target) {
        return Math.max(current - maxDelta, target);
    }
    return current;
}

export function distanceSquared(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
}

export function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}

export function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function normalizeVector(x, y) {
    const length = Math.hypot(x, y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return { x: x / length, y: y / length };
}
