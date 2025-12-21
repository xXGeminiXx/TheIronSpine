import { DEV_ASSERTIONS } from '../config.js';
import { SETTINGS } from './settings.js';

export function debugLog(...args) {
    if (SETTINGS.debugEnabled && SETTINGS.logEvents) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
}

export function devAssert(condition, message) {
    if (!DEV_ASSERTIONS) {
        return;
    }
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

export function isDebugEnabled() {
    return SETTINGS.debugEnabled;
}
