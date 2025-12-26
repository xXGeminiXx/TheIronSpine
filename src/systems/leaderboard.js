/**
 * leaderboard.js - Local, persistent leaderboard for Iron Spine
 *
 * Stores top runs in localStorage and filters out runs that used dev tools.
 * This is intentionally tamper-evident (not tamper-proof) to keep the UX
 * smooth while discouraging casual edits.
 */

const STORAGE_KEY = 'ironspine_leaderboard';
const SECRET_KEY = 'ironspine_leaderboard_secret';
const SIGNATURE_VERSION = 1;
const MAX_ENTRIES = 10;

const DEFAULT_STATE = Object.freeze({
    version: 1,
    entries: []
});

let inMemorySecret = null;

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function clampInt(value, fallback = 0) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
}

function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const rand = Math.random().toString(16).slice(2, 10);
    return `run_${Date.now().toString(36)}_${rand}`;
}

function createRandomSecret() {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function getSecret() {
    try {
        let secret = localStorage.getItem(SECRET_KEY);
        if (!secret) {
            secret = createRandomSecret();
            localStorage.setItem(SECRET_KEY, secret);
        }
        return secret;
    } catch (error) {
        if (!inMemorySecret) {
            inMemorySecret = createRandomSecret();
        }
        return inMemorySecret;
    }
}

function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

function buildPayload(entry) {
    return [
        entry.id,
        entry.date,
        entry.result,
        entry.wavesCleared,
        entry.timeSurvived,
        entry.enemiesDestroyed,
        entry.highestTier,
        entry.finalCarCount,
        entry.difficulty,
        entry.endless ? 1 : 0
    ].join('|');
}

function signEntry(entry, secret) {
    const payload = buildPayload(entry);
    return `${SIGNATURE_VERSION}:${hashString(`${payload}|${secret}`)}`;
}

function verifyEntry(entry, secret) {
    if (!entry || typeof entry !== 'object' || !entry.signature) {
        return false;
    }
    const expected = signEntry(entry, secret);
    return entry.signature === expected;
}

function sanitizeRunData(runData = {}) {
    return {
        result: runData.result === 'victory' ? 'victory' : 'defeat',
        timeSurvived: Math.max(0, safeNumber(runData.timeSurvived, 0)),
        wavesCleared: clampInt(runData.wavesCleared, 0),
        enemiesDestroyed: clampInt(runData.enemiesDestroyed, 0),
        highestTier: Math.max(1, clampInt(runData.highestTier, 1)),
        finalCarCount: clampInt(runData.finalCarCount, 0),
        difficulty: typeof runData.difficulty === 'string' ? runData.difficulty : 'normal',
        endless: Boolean(runData.endlessMode),
        devConsoleUsed: Boolean(runData.devConsoleUsed)
    };
}

function compareEntries(a, b) {
    if (a.wavesCleared !== b.wavesCleared) {
        return b.wavesCleared - a.wavesCleared;
    }
    if (a.result !== b.result) {
        return a.result === 'victory' ? -1 : 1;
    }
    if (a.enemiesDestroyed !== b.enemiesDestroyed) {
        return b.enemiesDestroyed - a.enemiesDestroyed;
    }
    return b.timeSurvived - a.timeSurvived;
}

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { ...DEFAULT_STATE };
        }
        const parsed = JSON.parse(stored);
        if (!parsed || !Array.isArray(parsed.entries)) {
            return { ...DEFAULT_STATE };
        }
        return {
            version: parsed.version || DEFAULT_STATE.version,
            entries: parsed.entries
        };
    } catch (error) {
        return { ...DEFAULT_STATE };
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        // Ignore storage failures to avoid impacting gameplay.
    }
}

function normalizeEntries(entries, secret) {
    const cleaned = [];
    for (const entry of entries) {
        if (verifyEntry(entry, secret)) {
            cleaned.push(entry);
        }
    }
    cleaned.sort(compareEntries);
    return cleaned.slice(0, MAX_ENTRIES);
}

function buildEntry(runData, secret) {
    const entry = {
        id: createId(),
        date: new Date().toISOString(),
        result: runData.result,
        timeSurvived: runData.timeSurvived,
        wavesCleared: runData.wavesCleared,
        enemiesDestroyed: runData.enemiesDestroyed,
        highestTier: runData.highestTier,
        finalCarCount: runData.finalCarCount,
        difficulty: runData.difficulty,
        endless: runData.endless
    };

    entry.signature = signEntry(entry, secret);
    return entry;
}

export function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) {
        return '--:--';
    }
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export class Leaderboard {
    static recordRun(runData) {
        const sanitized = sanitizeRunData(runData);
        if (sanitized.devConsoleUsed) {
            return {
                added: false,
                eligible: false,
                reason: 'dev-console'
            };
        }

        const secret = getSecret();
        const state = loadState();
        const entries = normalizeEntries(state.entries, secret);
        const entry = buildEntry(sanitized, secret);

        entries.push(entry);
        entries.sort(compareEntries);
        const trimmed = entries.slice(0, MAX_ENTRIES);
        const rankIndex = trimmed.findIndex(item => item.id === entry.id);

        saveState({
            version: DEFAULT_STATE.version,
            entries: trimmed
        });

        return {
            added: rankIndex !== -1,
            eligible: true,
            reason: rankIndex === -1 ? 'ranked-out' : 'ranked',
            rank: rankIndex === -1 ? null : rankIndex + 1
        };
    }

    static getTopEntries(limit = MAX_ENTRIES) {
        const secret = getSecret();
        const state = loadState();
        const entries = normalizeEntries(state.entries, secret);

        if (entries.length !== state.entries.length) {
            saveState({
                version: DEFAULT_STATE.version,
                entries
            });
        }

        return entries.slice(0, limit);
    }

    static reset() {
        saveState({ ...DEFAULT_STATE });
    }
}
