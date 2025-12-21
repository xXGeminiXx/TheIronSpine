import { DEBUG } from '../config.js';

export const SETTINGS = {
    debugEnabled: DEBUG.enabled,
    debugOverlay: DEBUG.overlay,
    logEvents: DEBUG.logEvents,
    showHitboxes: DEBUG.showHitboxes,
    invincible: DEBUG.invincible,
    screenShake: true,
    showGrid: true
};

export function toggleSetting(key) {
    if (!(key in SETTINGS)) {
        return null;
    }
    SETTINGS[key] = !SETTINGS[key];
    return SETTINGS[key];
}

export function setSetting(key, value) {
    if (!(key in SETTINGS)) {
        return false;
    }
    SETTINGS[key] = value;
    return true;
}
