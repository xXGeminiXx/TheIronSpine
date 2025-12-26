import {
    COLOR_KEYS,
    ENDLESS,
    ENEMIES,
    ENGINE_WEAPON,
    WAVES,
    WEAPON_STATS
} from '../config.js';
import { formatNumber } from './verylargenumbers.js';
import { getDifficultyModifiers } from './difficulty.js';
import { EndlessMode } from '../systems/endless-mode.js';

const CLASSIC_SAMPLE_WAVES = [1, 5, 10, 25, 50, 75, 100];
const ENDLESS_SAMPLE_WAVES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

const TRAIN_PROFILES = [
    { label: 'Start (1x T1)', tiers: [1], engineTier: 1 },
    { label: 'Mid (6x T2)', tiers: [1, 1, 2, 2, 2, 2], engineTier: 2 },
    { label: 'Late (10x T3)', tiers: [1, 2, 2, 3, 3, 3, 3, 3, 2, 1], engineTier: 3 }
];

function average(values) {
    if (!values.length) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateWeaponDps(weapon) {
    return (weapon.fireRate || 0) * (weapon.damage || 0);
}

function estimateTierDps(tier) {
    const index = Math.max(0, tier - 1);
    const samples = COLOR_KEYS.map(colorKey => {
        const stats = WEAPON_STATS[colorKey][index];
        return estimateWeaponDps(stats);
    });
    return average(samples);
}

function estimateEngineDps(tier) {
    const index = Math.max(0, tier - 1);
    const samples = COLOR_KEYS.map(colorKey => {
        const stats = ENGINE_WEAPON.stats[colorKey][index];
        return estimateWeaponDps(stats);
    });
    return average(samples);
}

function estimateTrainDps(profile, tierDpsCache, engineDpsCache) {
    const carsDps = profile.tiers.reduce(
        (sum, tier) => sum + tierDpsCache[tier],
        0
    );
    return carsDps + engineDpsCache[profile.engineTier];
}

function getClassicScale(wave) {
    const step = Math.max(0, wave - 1);
    let milestoneBonus = { hp: 0, damage: 0 };
    if (WAVES.milestoneWaves && WAVES.milestoneWaves.includes(wave)) {
        milestoneBonus = {
            hp: WAVES.milestoneHpBonus || 0,
            damage: WAVES.milestoneDamageBonus || 0
        };
    }
    return {
        hp: 1 + step * WAVES.hpScalePerWave + milestoneBonus.hp,
        damage: 1 + step * WAVES.damageScalePerWave + milestoneBonus.damage,
        speed: 1 + step * WAVES.speedScalePerWave
    };
}

function clampNumber(value, fallback = 0) {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return value;
}

function buildRows(waves, getScale, profiles) {
    const rows = [];

    waves.forEach((wave) => {
        const scale = getScale(wave);
        const hpMult = clampNumber(scale.hp, 1);
        const damageMult = clampNumber(scale.damage, 1);
        const speedMult = clampNumber(scale.speed, 1);

        const skirmisherHp = ENEMIES.skirmisher.hp * hpMult;
        const skirmisherDamage = ENEMIES.skirmisher.damage * damageMult;

        const row = {
            wave,
            hpMult: hpMult.toFixed(2),
            dmgMult: damageMult.toFixed(2),
            spdMult: speedMult.toFixed(2),
            skirmisherHp: formatNumber(Math.round(skirmisherHp), 0),
            skirmisherDmg: formatNumber(Math.round(skirmisherDamage), 0)
        };

        profiles.forEach((profile) => {
            const dps = profile.dps || 1;
            const ttk = skirmisherHp / dps;
            row[`ttk_${profile.label}`] = ttk.toFixed(2) + 's';
        });

        rows.push(row);
    });

    return rows;
}

export function runBalanceAudit(options = {}) {
    const difficulty = options.difficulty || 'normal';
    const difficultyMods = getDifficultyModifiers(difficulty);

    const tierDpsCache = {
        1: estimateTierDps(1),
        2: estimateTierDps(2),
        3: estimateTierDps(3)
    };
    const engineDpsCache = {
        1: estimateEngineDps(1),
        2: estimateEngineDps(2),
        3: estimateEngineDps(3)
    };

    const profiles = TRAIN_PROFILES.map((profile) => ({
        ...profile,
        dps: estimateTrainDps(profile, tierDpsCache, engineDpsCache)
    }));

    const endless = new EndlessMode({ config: { ...ENDLESS, enabled: true } });

    const applyDifficulty = (scale) => ({
        hp: scale.hp * difficultyMods.enemyHp,
        damage: scale.damage * difficultyMods.enemyDamage,
        speed: scale.speed * difficultyMods.enemySpeed
    });

    const classicRows = buildRows(CLASSIC_SAMPLE_WAVES, (wave) => {
        return applyDifficulty(getClassicScale(wave));
    }, profiles);

    const endlessRows = buildRows(ENDLESS_SAMPLE_WAVES, (wave) => {
        const config = endless.getWaveConfig(wave);
        return applyDifficulty({
            hp: config.hpMultiplier,
            damage: config.damageMultiplier,
            speed: config.speedMultiplier
        });
    }, profiles);

    console.groupCollapsed('[Balance Audit] Iron Spine');
    console.log('Difficulty:', difficulty);
    console.log('DPS Profiles:', profiles.map(profile => ({
        profile: profile.label,
        dps: Math.round(profile.dps)
    })));
    console.groupCollapsed('Classic Wave Curve');
    console.table(classicRows);
    console.groupEnd();
    console.groupCollapsed('Endless Wave Curve');
    console.table(endlessRows);
    console.groupEnd();
    console.groupEnd();

    return { classicRows, endlessRows, profiles };
}

