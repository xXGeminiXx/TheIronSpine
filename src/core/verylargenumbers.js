/**
 * verylargenumbers.js - Infinite Number Scaling System
 *
 * Handles absurdly large numbers for endless mode gameplay. When players
 * survive for hours and rack up billions of kills, this system keeps
 * everything working smoothly.
 *
 * FEATURES:
 *   - Arbitrary precision for numbers up to 10^308 (JavaScript limit)
 *   - Beyond that: BigInt support for truly infinite numbers
 *   - Human-readable formatting (1.5M, 2.3B, 999.9T, etc.)
 *   - Scientific notation fallback for cosmic numbers
 *   - Idle game style suffixes (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc...)
 *   - Safe math operations that won't overflow
 *   - Animated number counters (satisfying tick-up effect)
 *
 * ENDLESS MODE SCALING:
 *   This system enables truly infinite gameplay:
 *   - Wave numbers: 1, 2, 3... 1000... 1M... infinity
 *   - Enemy HP scales smoothly without overflow
 *   - Damage numbers display beautifully at any scale
 *   - Stats persist correctly even at astronomical values
 *
 * WHY THIS MATTERS:
 *   Players LOVE big numbers. The dopamine hit of seeing "1.5 TRILLION DAMAGE"
 *   is real. Cookie Clicker, Adventure Capitalist, and countless idle games
 *   prove this. We're giving Iron Spine that same satisfaction.
 *
 * USAGE:
 *   import { BigNum, formatNumber, formatCompact } from './verylargenumbers.js';
 *
 *   // Format any number nicely:
 *   formatNumber(1500)           // "1,500"
 *   formatNumber(1500000)        // "1.50M"
 *   formatNumber(1.5e12)         // "1.50T"
 *   formatNumber(1.5e100)        // "1.50e100"
 *
 *   // For truly huge calculations:
 *   const damage = new BigNum("999999999999999999999999");
 *   damage.add(1);
 *   damage.format();  // "1.00Sp" (Septillion)
 */

// ----------------------------------------------------------------------------
// NUMBER SUFFIXES (Idle Game Style)
// ----------------------------------------------------------------------------
// Standard short scale naming used in most idle/incremental games
// Each suffix represents 10^3 more than the previous
// ----------------------------------------------------------------------------

const SUFFIXES = [
    '',           // 10^0  - ones
    'K',          // 10^3  - Thousand
    'M',          // 10^6  - Million
    'B',          // 10^9  - Billion
    'T',          // 10^12 - Trillion
    'Qa',         // 10^15 - Quadrillion
    'Qi',         // 10^18 - Quintillion
    'Sx',         // 10^21 - Sextillion
    'Sp',         // 10^24 - Septillion
    'Oc',         // 10^27 - Octillion
    'No',         // 10^30 - Nonillion
    'Dc',         // 10^33 - Decillion
    'UDc',        // 10^36 - Undecillion
    'DDc',        // 10^39 - Duodecillion
    'TDc',        // 10^42 - Tredecillion
    'QaDc',       // 10^45 - Quattuordecillion
    'QiDc',       // 10^48 - Quindecillion
    'SxDc',       // 10^51 - Sexdecillion
    'SpDc',       // 10^54 - Septendecillion
    'OcDc',       // 10^57 - Octodecillion
    'NoDc',       // 10^60 - Novemdecillion
    'Vg',         // 10^63 - Vigintillion
    'UVg',        // 10^66 - Unvigintillion
    'DVg',        // 10^69 - Duovigintillion (nice)
    'TVg',        // 10^72 - Trevigintillion
    'QaVg',       // 10^75 - Quattuorvigintillion
    'QiVg',       // 10^78 - Quinvigintillion
    'SxVg',       // 10^81 - Sexvigintillion
    'SpVg',       // 10^84 - Septenvigintillion
    'OcVg',       // 10^87 - Octovigintillion
    'NoVg',       // 10^90 - Novemvigintillion
    'Tg',         // 10^93 - Trigintillion
    'UTg',        // 10^96 - Untrigintillion
    'DTg',        // 10^99 - Duotrigintillion
    'Ce'          // 10^102 - Centillion
];

// After Centillion, we switch to pure scientific notation
// (because nobody can pronounce "Uncentillion" anyway)

const LARGE_INTEGER_DIGITS = 15;

function isIntegerString(value) {
    return /^-?\d+$/.test(value);
}

function isLargeIntegerString(value) {
    const trimmed = value.trim();
    if (!isIntegerString(trimmed)) {
        return false;
    }
    const digits = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed;
    return digits.length > LARGE_INTEGER_DIGITS;
}

function isBigNumLike(value) {
    return Boolean(value && typeof value === 'object' && typeof value.value === 'bigint');
}

// ----------------------------------------------------------------------------
// CORE FORMATTING FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Format a number with commas and optional decimals.
 * For numbers < 1000, returns the full number.
 * For larger numbers, uses suffix notation.
 *
 * @param {number|string|BigInt} value - The number to format
 * @param {number} decimals - Decimal places for suffix notation (default: 2)
 * @returns {string} Formatted string
 */
export function formatNumber(value, decimals = 2) {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return '0';
    }

    if (isBigNumLike(value)) {
        return formatBigInt(value.value, decimals);
    }

    // Convert BigInt to number if small enough, else use BigInt formatting
    if (typeof value === 'bigint') {
        if (value >= -BigInt(Number.MAX_SAFE_INTEGER)
            && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
            value = Number(value);
        } else {
            return formatBigInt(value, decimals);
        }
    }

    // Parse string numbers
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+n$/.test(trimmed)) {
            return formatBigInt(BigInt(trimmed.slice(0, -1)), decimals);
        }
        if (isLargeIntegerString(trimmed)) {
            return formatBigInt(BigInt(trimmed), decimals);
        }
        value = parseFloat(trimmed);
    }

    // Handle NaN and Infinity
    if (isNaN(value)) {
        return '0';
    }
    if (!isFinite(value)) {
        return value > 0 ? 'INFINITY' : '-INFINITY';
    }

    // Handle negative numbers
    const isNegative = value < 0;
    value = Math.abs(value);

    // Small numbers: just add commas
    if (value < 1000) {
        const formatted = value % 1 === 0
            ? value.toLocaleString()
            : value.toFixed(decimals);
        return isNegative ? '-' + formatted : formatted;
    }

    // Find appropriate suffix
    const tier = Math.floor(Math.log10(value) / 3);

    // Within our suffix range
    if (tier < SUFFIXES.length) {
        const suffix = SUFFIXES[tier];
        const scaled = value / Math.pow(10, tier * 3);
        const formatted = scaled.toFixed(decimals) + suffix;
        return isNegative ? '-' + formatted : formatted;
    }

    // Beyond suffix range: scientific notation
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exponent);
    const formatted = `${mantissa.toFixed(decimals)}e${exponent}`;
    return isNegative ? '-' + formatted : formatted;
}

/**
 * Format a BigInt for display.
 *
 * @param {BigInt} value - The BigInt to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
function formatBigInt(value, decimals = 2) {
    const isNegative = value < 0n;
    const absValue = isNegative ? -value : value;
    const str = absValue.toString();
    const len = str.length;

    // Calculate tier (groups of 3 digits)
    const tier = Math.floor((len - 1) / 3);

    if (tier < SUFFIXES.length) {
        // Extract significant digits
        const significantDigits = tier * 3;
        const intPart = str.slice(0, len - significantDigits);
        const decPart = str
            .slice(len - significantDigits, len - significantDigits + decimals)
            .padEnd(decimals, '0');

        const formatted = decimals > 0
            ? `${intPart}.${decPart}${SUFFIXES[tier]}`
            : `${intPart}${SUFFIXES[tier]}`;
        return isNegative ? `-${formatted}` : formatted;
    }

    // Scientific notation for truly cosmic numbers
    const mantissa = decimals > 0
        ? str[0] + '.' + str.slice(1, decimals + 1)
        : str[0];
    const formatted = `${mantissa}e${len - 1}`;
    return isNegative ? `-${formatted}` : formatted;
}

/**
 * Compact format - shorter version for HUD elements.
 * Uses fewer decimal places and shorter format.
 *
 * @param {number} value - The number to format
 * @returns {string} Compact formatted string
 */
export function formatCompact(value) {
    return formatNumber(value, 1);
}

/**
 * Format with full precision (for stats screens).
 *
 * @param {number} value - The number to format
 * @returns {string} Full precision formatted string
 */
export function formatFull(value) {
    if (value < 1000000) {
        return value.toLocaleString();
    }
    return formatNumber(value, 3);
}

/**
 * Format time in a readable way.
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time (e.g., "2:30", "1h 23m", "5d 12h")
 */
export function formatTime(seconds) {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    }

    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
}

/**
 * Format a percentage nicely.
 *
 * @param {number} value - The percentage (0-100 or 0-1)
 * @param {boolean} isDecimal - If true, value is 0-1 instead of 0-100
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, isDecimal = false) {
    if (isDecimal) {
        value *= 100;
    }

    if (value >= 1000) {
        return formatNumber(value, 0) + '%';
    }

    if (value >= 100) {
        return Math.floor(value) + '%';
    }

    if (value >= 10) {
        return value.toFixed(1) + '%';
    }

    return value.toFixed(2) + '%';
}

export function toNumberSafe(value, fallback = 0) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : fallback;
    }

    if (typeof value === 'bigint') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (isLargeIntegerString(trimmed)) {
            return Number.MAX_SAFE_INTEGER;
        }
        const parsed = parseFloat(trimmed);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

// ----------------------------------------------------------------------------
// BIGNUM CLASS - For Truly Infinite Numbers
// ----------------------------------------------------------------------------
// When JavaScript's Number isn't enough, BigNum handles arbitrary precision
// ----------------------------------------------------------------------------

export class BigNum {
    /**
     * Create a BigNum from any numeric type.
     *
     * @param {number|string|BigInt|BigNum} value - Initial value
     */
    constructor(value = 0) {
        if (value instanceof BigNum) {
            this.value = value.value;
        } else if (typeof value === 'bigint') {
            this.value = value;
        } else if (typeof value === 'string') {
            // Handle scientific notation
            if (value.includes('e') || value.includes('E')) {
                const [mantissa, exp] = value.toLowerCase().split('e');
                const exponent = parseInt(exp);
                const mantissaNum = parseFloat(mantissa);
                // Convert to BigInt-friendly format
                if (exponent > 15) {
                    const wholePart = Math.floor(mantissaNum);
                    const zeros = '0'.repeat(exponent);
                    this.value = BigInt(wholePart.toString() + zeros);
                } else {
                    this.value = BigInt(Math.floor(mantissaNum * Math.pow(10, exponent)));
                }
            } else {
                this.value = BigInt(value.replace(/[^0-9-]/g, '') || '0');
            }
        } else if (typeof value === 'number') {
            if (!isFinite(value)) {
                this.value = BigInt(0);
            } else {
                this.value = BigInt(Math.floor(value));
            }
        } else {
            this.value = BigInt(0);
        }
    }

    /**
     * Add to this BigNum.
     *
     * @param {number|string|BigInt|BigNum} other - Value to add
     * @returns {BigNum} This instance (for chaining)
     */
    add(other) {
        const otherBig = other instanceof BigNum ? other.value : new BigNum(other).value;
        this.value += otherBig;
        return this;
    }

    /**
     * Subtract from this BigNum.
     *
     * @param {number|string|BigInt|BigNum} other - Value to subtract
     * @returns {BigNum} This instance
     */
    subtract(other) {
        const otherBig = other instanceof BigNum ? other.value : new BigNum(other).value;
        this.value -= otherBig;
        if (this.value < 0n) this.value = 0n;
        return this;
    }

    /**
     * Multiply this BigNum.
     *
     * @param {number|string|BigInt|BigNum} other - Multiplier
     * @returns {BigNum} This instance
     */
    multiply(other) {
        const otherBig = other instanceof BigNum ? other.value : new BigNum(other).value;
        this.value *= otherBig;
        return this;
    }

    /**
     * Divide this BigNum (integer division).
     *
     * @param {number|string|BigInt|BigNum} other - Divisor
     * @returns {BigNum} This instance
     */
    divide(other) {
        const otherBig = other instanceof BigNum ? other.value : new BigNum(other).value;
        if (otherBig === 0n) {
            console.warn('[BigNum] Division by zero');
            return this;
        }
        this.value /= otherBig;
        return this;
    }

    /**
     * Format for display.
     *
     * @param {number} decimals - Decimal places
     * @returns {string} Formatted string
     */
    format(decimals = 2) {
        return formatBigInt(this.value, decimals);
    }

    /**
     * Convert to JavaScript number (may lose precision).
     *
     * @returns {number} Number value
     */
    toNumber() {
        if (this.value > BigInt(Number.MAX_SAFE_INTEGER)) {
            return Number(this.value);  // Will lose precision but won't crash
        }
        return Number(this.value);
    }

    /**
     * Compare to another value.
     *
     * @param {number|string|BigInt|BigNum} other - Value to compare
     * @returns {number} -1 if less, 0 if equal, 1 if greater
     */
    compare(other) {
        const otherBig = other instanceof BigNum ? other.value : new BigNum(other).value;
        if (this.value < otherBig) return -1;
        if (this.value > otherBig) return 1;
        return 0;
    }

    /**
     * Clone this BigNum.
     *
     * @returns {BigNum} New BigNum with same value
     */
    clone() {
        return new BigNum(this.value);
    }

    /**
     * Get string representation.
     *
     * @returns {string} String value
     */
    toString() {
        return this.value.toString();
    }
}

// ----------------------------------------------------------------------------
// SAFE MATH OPERATIONS
// ----------------------------------------------------------------------------
// These won't overflow or produce NaN
// ----------------------------------------------------------------------------

/**
 * Safe addition that handles edge cases.
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum (capped at MAX_SAFE_INTEGER)
 */
export function safeAdd(a, b) {
    const result = a + b;
    if (!isFinite(result)) {
        return Number.MAX_SAFE_INTEGER;
    }
    return result;
}

/**
 * Safe multiplication that handles edge cases.
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Product (capped at MAX_SAFE_INTEGER)
 */
export function safeMultiply(a, b) {
    const result = a * b;
    if (!isFinite(result)) {
        return Number.MAX_SAFE_INTEGER;
    }
    return result;
}

/**
 * Safe exponential scaling for endless mode.
 * Prevents numbers from exploding too fast while still feeling impactful.
 *
 * @param {number} base - Base value
 * @param {number} wave - Current wave number
 * @param {number} rate - Scaling rate (default 0.1 = 10% per wave)
 * @returns {number} Scaled value
 */
export function scaleForWave(base, wave, rate = 0.1) {
    // Use logarithmic scaling to prevent explosion
    // At wave 100: ~10x base
    // At wave 1000: ~100x base
    // At wave 10000: ~1000x base (still playable!)
    const multiplier = 1 + (rate * Math.log10(Math.max(1, wave)) * wave * 0.1);
    return Math.floor(base * multiplier);
}

/**
 * Soft cap a value to prevent runaway scaling.
 * Value grows linearly up to the cap, then logarithmically after.
 *
 * @param {number} value - The value to cap
 * @param {number} softCap - Where soft cap kicks in
 * @param {number} hardCap - Maximum possible value (optional)
 * @returns {number} Soft-capped value
 */
export function softCap(value, softCap, hardCap = Infinity) {
    if (value <= softCap) {
        return value;
    }

    // Logarithmic scaling beyond soft cap
    const excess = value - softCap;
    const scaledExcess = softCap * Math.log10(1 + excess / softCap);

    const result = softCap + scaledExcess;
    return Math.min(result, hardCap);
}

// ----------------------------------------------------------------------------
// ANIMATED NUMBER DISPLAY
// ----------------------------------------------------------------------------
// Creates satisfying tick-up effects for counters
// ----------------------------------------------------------------------------

/**
 * Create an animated number that ticks up/down smoothly.
 * Returns an object that can be updated and read.
 *
 * @param {number} initialValue - Starting value
 * @param {Object} options - Animation options
 * @returns {Object} Animated number controller
 */
export function createAnimatedNumber(initialValue = 0, options = {}) {
    const config = {
        tickSpeed: options.tickSpeed || 0.15,  // Lerp factor
        minDelta: options.minDelta || 0.01,    // Stop animating when this close
        formatFn: options.formatFn || formatNumber
    };

    let displayValue = initialValue;
    let targetValue = initialValue;

    return {
        /**
         * Set the target value (will animate toward it).
         *
         * @param {number} value - New target
         */
        set(value) {
            targetValue = value;
        },

        /**
         * Add to the target value.
         *
         * @param {number} delta - Amount to add
         */
        add(delta) {
            targetValue += delta;
        },

        /**
         * Update the display value (call each frame).
         *
         * @param {number} deltaTime - Frame delta in seconds
         */
        update(deltaTime = 1/60) {
            const diff = targetValue - displayValue;

            if (Math.abs(diff) < config.minDelta) {
                displayValue = targetValue;
                return;
            }

            // Smooth lerp toward target
            displayValue += diff * config.tickSpeed;
        },

        /**
         * Get the current display value.
         *
         * @returns {number} Current animated value
         */
        getValue() {
            return displayValue;
        },

        /**
         * Get the formatted display string.
         *
         * @returns {string} Formatted value
         */
        getFormatted() {
            return config.formatFn(displayValue);
        },

        /**
         * Snap immediately to target (skip animation).
         */
        snap() {
            displayValue = targetValue;
        },

        /**
         * Check if currently animating.
         *
         * @returns {boolean} True if still ticking
         */
        isAnimating() {
            return Math.abs(targetValue - displayValue) >= config.minDelta;
        }
    };
}

// ----------------------------------------------------------------------------
// ENDLESS MODE SCALING HELPERS
// ----------------------------------------------------------------------------

/**
 * Calculate enemy HP for a given wave in endless mode.
 * Scales smoothly but keeps the game playable even at wave 1000+.
 *
 * @param {number} baseHp - Base enemy HP
 * @param {number} wave - Current wave number
 * @returns {number} Scaled HP value
 */
export function endlessEnemyHp(baseHp, wave, rate = 0.15) {
    // Log-sqrt scaling with diminishing returns
    // Wave 100: ~4x base (default rate)
    // Wave 1000: ~15x base
    const waveValue = Math.max(1, toNumberSafe(wave, 1));
    const scaleFactor = 1 + rate * Math.log10(waveValue + 9) * Math.sqrt(waveValue);
    return Math.floor(baseHp * scaleFactor);
}

/**
 * Calculate enemy damage for a given wave.
 *
 * @param {number} baseDamage - Base damage
 * @param {number} wave - Current wave
 * @returns {number} Scaled damage
 */
export function endlessEnemyDamage(baseDamage, wave, rate = 0.08) {
    // Gentler scaling than HP to keep player viable
    const waveValue = Math.max(1, toNumberSafe(wave, 1));
    const scaleFactor = 1 + rate * Math.log10(waveValue + 9) * Math.sqrt(waveValue);
    return Math.floor(baseDamage * scaleFactor);
}

/**
 * Calculate score multiplier for endless mode.
 * Higher waves = more points per kill.
 *
 * @param {number} wave - Current wave
 * @returns {number} Score multiplier
 */
export function endlessScoreMultiplier(wave) {
    return 1 + Math.floor(wave / 5) * 0.5;
}

/**
 * Calculate how many enemies spawn per wave in endless.
 *
 * @param {number} baseCount - Base enemy count
 * @param {number} wave - Current wave
 * @param {number} maxCap - Maximum enemies at once (performance)
 * @returns {number} Enemy count for this wave
 */
export function endlessEnemyCount(baseCount, wave, maxCap = 50) {
    // Logarithmic growth to prevent overwhelming the player/CPU
    const waveValue = Math.max(1, toNumberSafe(wave, 1));
    const count = baseCount + Math.floor(Math.log2(waveValue + 1) * 3);
    return Math.min(count, maxCap);
}

// ----------------------------------------------------------------------------
// EXPORTS SUMMARY
// ----------------------------------------------------------------------------
//
// Formatting:
//   formatNumber(value, decimals)  - Smart number formatting with suffixes
//   formatCompact(value)           - Short format for HUD
//   formatFull(value)              - Full precision for stats
//   formatTime(seconds)            - Time duration formatting
//   formatPercent(value)           - Percentage formatting
//   toNumberSafe(value, fallback)  - Safe numeric coercion
//
// Big Numbers:
//   BigNum                         - Class for arbitrary precision math
//
// Safe Math:
//   safeAdd(a, b)                  - Addition without overflow
//   safeMultiply(a, b)             - Multiplication without overflow
//   scaleForWave(base, wave, rate) - Endless mode scaling
//   softCap(value, soft, hard)     - Prevent runaway numbers
//
// Animation:
//   createAnimatedNumber(initial)  - Smooth counting animations
//
// Endless Mode:
//   endlessEnemyHp(base, wave)     - Enemy HP scaling
//   endlessEnemyDamage(base, wave) - Enemy damage scaling
//   endlessScoreMultiplier(wave)   - Score bonus per wave
//   endlessEnemyCount(base, wave)  - Spawn count scaling
//
// ----------------------------------------------------------------------------
