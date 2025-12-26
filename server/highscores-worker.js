/**
 * highscores-worker.js - Cloudflare Worker for Iron Spine highscores
 *
 * Anonymous, arcade-style leaderboard with upsert-by-name behavior.
 * No auth. Minimal validation. CORS configurable via env.
 */

const STORAGE_KEY = 'ironspine_highscores';
const STORE_LIMIT = 200;
const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_MAX_NAME_LENGTH = 25;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const cors = getCorsHeaders(request, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        if (url.pathname !== '/api/highscores') {
            return jsonResponse({ error: 'Not found' }, 404, cors);
        }

        if (request.method === 'GET') {
            return handleGet(request, env, url, cors);
        }

        if (request.method === 'POST') {
            return handlePost(request, env, cors);
        }

        return jsonResponse({ error: 'Method not allowed' }, 405, cors);
    }
};

function getCorsHeaders(request, env) {
    const headers = new Headers();
    const origin = request.headers.get('Origin');
    const allowList = parseAllowList(env.ALLOWED_ORIGINS);
    const strict = env.STRICT_ORIGIN === '1';

    let allowOrigin = '*';
    if (allowList.length > 0 && origin) {
        if (allowList.includes('*') || allowList.includes(origin)) {
            allowOrigin = origin;
        } else if (strict) {
            allowOrigin = '';
        } else {
            allowOrigin = allowList[0];
        }
        headers.set('Vary', 'Origin');
    }

    headers.set('Access-Control-Allow-Origin', allowOrigin || 'null');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
    return headers;
}

function parseAllowList(value) {
    if (!value) {
        return [];
    }
    return String(value)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function jsonResponse(data, status, headers) {
    const responseHeaders = new Headers(headers || {});
    responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

async function handleGet(request, env, url, cors) {
    if (!isOriginAllowed(request, env, cors)) {
        return jsonResponse({ error: 'Origin not allowed' }, 403, cors);
    }

    const limit = clampInt(url.searchParams.get('limit'), 1, getMaxEntries(env), 10);
    const entries = await readEntries(env);
    entries.sort(compareEntries);
    const trimmed = entries.slice(0, limit).map(stripEntry);
    return jsonResponse({ entries: trimmed, total: entries.length }, 200, cors);
}

async function handlePost(request, env, cors) {
    if (!isOriginAllowed(request, env, cors)) {
        return jsonResponse({ error: 'Origin not allowed' }, 403, cors);
    }

    let body = null;
    try {
        body = await request.json();
    } catch (error) {
        return jsonResponse({ error: 'Invalid JSON' }, 400, cors);
    }

    const entry = sanitizeEntry(body, env);
    if (!entry) {
        return jsonResponse({ error: 'Invalid payload' }, 400, cors);
    }

    const entries = await readEntries(env);
    const nameKey = entry.name.toLowerCase();
    const now = Date.now();
    let updatedEntry = null;

    const existingIndex = entries.findIndex(item => item.nameKey === nameKey);
    if (existingIndex >= 0) {
        const existing = entries[existingIndex];
        if (entry.score >= existing.score) {
            entries[existingIndex] = {
                ...existing,
                ...entry,
                nameKey,
                updatedAt: now
            };
        } else {
            entries[existingIndex] = {
                ...existing,
                updatedAt: now
            };
        }
        updatedEntry = entries[existingIndex];
    } else {
        updatedEntry = {
            ...entry,
            nameKey,
            createdAt: now,
            updatedAt: now
        };
        entries.push(updatedEntry);
    }

    entries.sort(compareEntries);
    const trimmed = entries.slice(0, getStoreLimit(env));
    await writeEntries(env, trimmed);

    const rank = trimmed.findIndex(item => item.nameKey === nameKey);
    return jsonResponse({ ok: true, rank: rank >= 0 ? rank + 1 : null }, 200, cors);
}

function isOriginAllowed(request, env, cors) {
    const strict = env.STRICT_ORIGIN === '1';
    if (!strict) {
        return true;
    }
    const allowList = parseAllowList(env.ALLOWED_ORIGINS);
    if (!allowList.length || allowList.includes('*')) {
        return true;
    }
    const origin = request.headers.get('Origin');
    if (!origin) {
        return false;
    }
    return allowList.includes(origin);
}

function sanitizeEntry(input, env) {
    if (!input || typeof input !== 'object') {
        return null;
    }
    const maxNameLength = getMaxNameLength(env);
    const name = sanitizeName(input.name, maxNameLength);
    if (!name) {
        return null;
    }

    const wavesCleared = clampInt(input.wavesCleared ?? input.waves, 0, 1000000, 0);
    const enemiesDestroyed = clampInt(input.enemiesDestroyed ?? input.kills, 0, 1000000000, 0);
    const timeSurvived = clampInt(input.timeSurvived ?? input.time, 0, 10000000, 0);
    const highestTier = clampInt(input.highestTier ?? input.tier, 1, 99, 1);
    const difficulty = sanitizeDifficulty(input.difficulty);
    const endless = Boolean(input.endless ?? input.endlessMode);

    const score = computeScore({
        wavesCleared,
        enemiesDestroyed,
        timeSurvived,
        highestTier
    });

    return {
        name,
        score,
        wavesCleared,
        enemiesDestroyed,
        timeSurvived,
        highestTier,
        difficulty,
        endless
    };
}

function sanitizeName(name, maxLength) {
    if (typeof name !== 'string') {
        return '';
    }
    const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ');
    return cleaned.slice(0, maxLength);
}

function sanitizeDifficulty(value) {
    const diff = String(value || 'normal').toLowerCase();
    if (diff === 'easy' || diff === 'hard' || diff === 'insane') {
        return diff;
    }
    return 'normal';
}

function computeScore(entry) {
    return entry.wavesCleared * 100000
        + entry.enemiesDestroyed * 10
        + entry.highestTier * 1000
        + entry.timeSurvived;
}

function compareEntries(a, b) {
    if (a.score !== b.score) {
        return b.score - a.score;
    }
    if (a.wavesCleared !== b.wavesCleared) {
        return b.wavesCleared - a.wavesCleared;
    }
    if (a.enemiesDestroyed !== b.enemiesDestroyed) {
        return b.enemiesDestroyed - a.enemiesDestroyed;
    }
    return b.timeSurvived - a.timeSurvived;
}

function stripEntry(entry) {
    return {
        name: entry.name,
        score: entry.score,
        wavesCleared: entry.wavesCleared,
        enemiesDestroyed: entry.enemiesDestroyed,
        timeSurvived: entry.timeSurvived,
        highestTier: entry.highestTier,
        difficulty: entry.difficulty,
        endless: entry.endless
    };
}

function clampInt(value, min, max, fallback) {
    const num = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
    return Math.min(max, Math.max(min, num));
}

function getMaxEntries(env) {
    const maxEntries = Number(env.MAX_ENTRIES);
    return Number.isFinite(maxEntries) ? Math.max(1, Math.min(maxEntries, STORE_LIMIT)) : DEFAULT_MAX_ENTRIES;
}

function getStoreLimit(env) {
    const storeLimit = Number(env.STORE_LIMIT);
    return Number.isFinite(storeLimit) ? Math.max(10, storeLimit) : STORE_LIMIT;
}

function getMaxNameLength(env) {
    const maxLength = Number(env.MAX_NAME_LENGTH);
    return Number.isFinite(maxLength) ? Math.max(1, maxLength) : DEFAULT_MAX_NAME_LENGTH;
}

async function readEntries(env) {
    try {
        const raw = await env.HIGHSCORES.get(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

async function writeEntries(env, entries) {
    try {
        await env.HIGHSCORES.put(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        // Ignore storage errors to avoid throwing in handler.
    }
}
