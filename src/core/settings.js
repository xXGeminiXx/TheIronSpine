import { DEBUG, ENDLESS } from '../config.js';

export const SETTINGS = {
    debugEnabled: DEBUG.enabled,
    debugOverlay: DEBUG.overlay,
    logEvents: DEBUG.logEvents,
    showHitboxes: DEBUG.showHitboxes,
    invincible: DEBUG.invincible,
    screenShake: true,
    showGrid: true,
    uiScaleIndex: 1,
    endlessMode: ENDLESS.enabled
};

export const UI_SCALE_OPTIONS = Object.freeze([
    { label: 'Small', value: 0.85 },
    { label: 'Medium', value: 1 },
    { label: 'Large', value: 1.15 }
]);

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

export function cycleUiScale() {
    const next = (SETTINGS.uiScaleIndex + 1) % UI_SCALE_OPTIONS.length;
    SETTINGS.uiScaleIndex = next;
    return UI_SCALE_OPTIONS[next];
}

export function getUiScale() {
    return UI_SCALE_OPTIONS[SETTINGS.uiScaleIndex].value;
}

export function getUiScaleLabel() {
    return UI_SCALE_OPTIONS[SETTINGS.uiScaleIndex].label;
}
