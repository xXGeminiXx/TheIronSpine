/**
 * remote-highscores.js - Shared highscore service (site-locked)
 *
 * Anonymous, arcade-style highscores for a single trusted host.
 * This is intentionally lightweight and does not attempt to prevent cheating.
 *
 * Expected API (same-origin by default):
 *   GET  /api/highscores?limit=10
 *     -> { entries: [{ name, score, wavesCleared, enemiesDestroyed, timeSurvived, difficulty, endless }] }
 *   POST /api/highscores
 *     body: { name, score, wavesCleared, enemiesDestroyed, timeSurvived, difficulty, endless }
 *     -> { ok: true, rank?: number }
 *
 * Server behavior:
 *   - Upsert by name (case-insensitive recommended).
 *   - Return updated rank if available.
 *
 * Overrides:
 *   - window.IRON_SPINE_HIGHSCORES can override endpoint/hosts for other deployments.
 *   - localStorage key (REMOTE_HIGHSCORE.overrideKey) enables on non-official hosts.
 *
 * Example override:
 *   window.IRON_SPINE_HIGHSCORES = { allowAnyHost: true, endpoint: 'https://example.com/api/highscores' };
 */

import { REMOTE_HIGHSCORE } from '../config.js';
import { formatNumber } from '../core/verylargenumbers.js';

const CACHE = {
    entries: [],
    fetchedAt: 0,
    pending: null,
    lastError: null
};

const NAME_STORAGE_KEY = 'ironspine_highscore_name';

function getWindowOverrides() {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.IRON_SPINE_HIGHSCORES || null;
}

function getHighscoreConfig() {
    const overrides = getWindowOverrides();
    if (!overrides || typeof overrides !== 'object') {
        return REMOTE_HIGHSCORE;
    }

    const merged = {
        ...REMOTE_HIGHSCORE,
        ...overrides
    };

    if (Array.isArray(overrides.allowedHosts)) {
        merged.allowedHosts = overrides.allowedHosts;
    }

    return merged;
}

function matchesHost(hostname, allowedHosts) {
    if (!hostname || !Array.isArray(allowedHosts)) {
        return false;
    }
    return allowedHosts.some((allowed) => {
        if (!allowed) {
            return false;
        }
        if (allowed === hostname) {
            return true;
        }
        if (allowed.startsWith('*.')) {
            const suffix = allowed.slice(1);
            return hostname.endsWith(suffix);
        }
        return false;
    });
}

export function isRemoteHighscoreEnabled() {
    const config = getHighscoreConfig();
    if (!config || !config.enabled) {
        return false;
    }
    if (typeof window === 'undefined' || !window.location) {
        return false;
    }
    if (config.allowAnyHost) {
        return true;
    }
    if (config.allowLocalOverride && hasLocalOverride(config.overrideKey)) {
        return true;
    }
    return matchesHost(window.location.hostname, config.allowedHosts);
}

export function sanitizeHighscoreName(input) {
    if (typeof input !== 'string') {
        return '';
    }
    const trimmed = input.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    const singleSpaced = trimmed.replace(/\s+/g, ' ');
    const config = getHighscoreConfig();
    const maxLength = Number.isFinite(config.maxNameLength) ? config.maxNameLength : 25;
    return singleSpaced.slice(0, maxLength);
}

export function escapeHighscoreName(input) {
    return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function clampInt(value, fallback = 0) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
}

function formatDifficulty(difficulty) {
    if (typeof difficulty === 'string') {
        return difficulty.toLowerCase();
    }
    return 'normal';
}

function calculateScore(runData) {
    const waves = clampInt(runData.wavesCleared, 0);
    const kills = clampInt(runData.enemiesDestroyed, 0);
    const tier = clampInt(runData.highestTier, 1);
    const time = clampInt(runData.timeSurvived, 0);

    return waves * 100000 + kills * 10 + tier * 1000 + time;
}

function normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const name = sanitizeHighscoreName(raw.name || raw.player || '');
    if (!name) {
        return null;
    }
    const score = Number.isFinite(raw.score)
        ? Math.max(0, Math.floor(raw.score))
        : calculateScore(raw);
    return {
        name,
        score,
        wavesCleared: clampInt(raw.wavesCleared ?? raw.waves, 0),
        enemiesDestroyed: clampInt(raw.enemiesDestroyed ?? raw.kills, 0),
        timeSurvived: safeNumber(raw.timeSurvived ?? raw.time, 0),
        highestTier: clampInt(raw.highestTier ?? raw.tier, 1),
        difficulty: formatDifficulty(raw.difficulty),
        endless: Boolean(raw.endless ?? raw.endlessMode)
    };
}

async function fetchWithTimeout(url, options, timeoutMs) {
    if (typeof AbortController === 'undefined') {
        return fetch(url, options);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export function formatHighscoreValue(value) {
    return formatNumber(value, 0);
}

export async function fetchRemoteHighscores() {
    if (!isRemoteHighscoreEnabled()) {
        return [];
    }

    const config = getHighscoreConfig();
    const now = Date.now();
    const maxEntries = Number.isFinite(config.maxEntries) ? config.maxEntries : 10;
    const cacheTtlMs = Number.isFinite(config.cacheTtlMs) ? config.cacheTtlMs : 30000;
    if (CACHE.entries.length > 0 && now - CACHE.fetchedAt < cacheTtlMs) {
        return CACHE.entries.slice(0, maxEntries);
    }

    if (CACHE.pending) {
        return CACHE.pending;
    }

    const url = new URL(config.endpoint, window.location.origin);
    url.searchParams.set('limit', maxEntries.toString());

    CACHE.pending = (async () => {
        try {
            const response = await fetchWithTimeout(url.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'omit',
                cache: 'no-store'
            }, Number.isFinite(config.requestTimeoutMs) ? config.requestTimeoutMs : 6000);

            if (!response.ok) {
                throw new Error(`Highscore fetch failed: ${response.status}`);
            }

            const data = await response.json();
            const list = Array.isArray(data) ? data : data.entries;
            const entries = Array.isArray(list)
                ? list.map(normalizeEntry).filter(Boolean)
                : [];

            CACHE.entries = entries.slice(0, maxEntries);
            CACHE.fetchedAt = Date.now();
            CACHE.lastError = null;
            return CACHE.entries;
        } catch (error) {
            CACHE.lastError = error;
            return CACHE.entries.slice(0, maxEntries);
        } finally {
            CACHE.pending = null;
        }
    })();

    return CACHE.pending;
}

export async function submitRemoteHighscore(runData, playerName, meta = {}) {
    if (!isRemoteHighscoreEnabled()) {
        return { ok: false, reason: 'disabled' };
    }
    if (runData && runData.devConsoleUsed) {
        return { ok: false, reason: 'dev-console' };
    }

    const config = getHighscoreConfig();
    const name = sanitizeHighscoreName(playerName);
    if (!name) {
        return { ok: false, reason: 'invalid-name' };
    }

    const payload = {
        name,
        score: calculateScore(runData),
        wavesCleared: clampInt(runData.wavesCleared, 0),
        enemiesDestroyed: clampInt(runData.enemiesDestroyed, 0),
        timeSurvived: clampInt(runData.timeSurvived, 0),
        highestTier: clampInt(runData.highestTier, 1),
        difficulty: formatDifficulty(meta.difficulty || runData.difficulty),
        endless: Boolean(meta.endlessMode ?? runData.endlessMode)
    };

    try {
        const url = new URL(config.endpoint, window.location.origin).toString();
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            cache: 'no-store',
            body: JSON.stringify(payload)
        }, Number.isFinite(config.requestTimeoutMs) ? config.requestTimeoutMs : 6000);

        if (!response.ok) {
            CACHE.lastError = new Error(`Highscore submit failed: ${response.status}`);
            return { ok: false, reason: `http-${response.status}` };
        }

        const data = await response.json().catch(() => ({}));
        CACHE.fetchedAt = 0;
        saveHighscoreName(name);

        return {
            ok: true,
            rank: Number.isFinite(data.rank) ? data.rank : null
        };
    } catch (error) {
        CACHE.lastError = error;
        return { ok: false, reason: 'network-error' };
    }
}

export function fetchRemoteHighscoresForced() {
    CACHE.fetchedAt = 0;
    return fetchRemoteHighscores();
}

export function getSavedHighscoreName() {
    try {
        const stored = localStorage.getItem(NAME_STORAGE_KEY);
        return sanitizeHighscoreName(stored || '');
    } catch (error) {
        return '';
    }
}

export function saveHighscoreName(name) {
    const sanitized = sanitizeHighscoreName(name);
    if (!sanitized) {
        return false;
    }
    try {
        localStorage.setItem(NAME_STORAGE_KEY, sanitized);
        return true;
    } catch (error) {
        return false;
    }
}

export function getHighscoreMaxNameLength() {
    const config = getHighscoreConfig();
    return Number.isFinite(config.maxNameLength) ? config.maxNameLength : 25;
}

export function getHighscoreLastError() {
    return CACHE.lastError;
}

function hasLocalOverride(key) {
    if (!key) {
        return false;
    }
    try {
        const stored = localStorage.getItem(key);
        if (!stored) {
            return false;
        }
        return stored === '1' || stored.toLowerCase() === 'true';
    } catch (error) {
        return false;
    }
}
