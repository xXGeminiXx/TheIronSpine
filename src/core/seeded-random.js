/**
 * Seeded Random Number Generator
 *
 * Provides deterministic pseudo-random numbers for reproducible runs.
 * Based on a simple LCG (Linear Congruential Generator) for speed and simplicity.
 *
 * Usage:
 *   const rng = new SeededRandom('SEED1234');
 *   const val = rng.next();           // Returns 0-1
 *   const num = rng.nextInt(1, 10);   // Returns integer 1-10
 *   const arr = rng.shuffle([...]);   // Returns shuffled copy
 */

export class SeededRandom {
  /**
   * Create a seeded RNG
   * @param {string|number} seed - Seed value (converted to number via hash if string)
   */
  constructor(seed) {
    if (typeof seed === 'string') {
      // Simple string hash function
      this.seed = this.hashString(seed);
    } else {
      this.seed = seed >>> 0; // Convert to unsigned 32-bit int
    }

    // Store original seed for display
    this.originalSeed = seed;

    // LCG parameters (from Numerical Recipes)
    this.a = 1664525;
    this.c = 1013904223;
    this.m = Math.pow(2, 32);

    // Current state
    this.state = this.seed;
  }

  /**
   * Hash a string to a 32-bit unsigned integer
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) >>> 0; // Unsigned 32-bit
  }

  /**
   * Get next random number [0, 1)
   * @returns {number} Random number between 0 and 1
   */
  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  /**
   * Get random integer in range [min, max] (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random float
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Shuffle an array (returns new array, doesn't modify original)
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled copy of array
   */
  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Pick a random element from an array
   * @param {Array} array - Array to pick from
   * @returns {*} Random element
   */
  choice(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Roll dice - return true with given probability
   * @param {number} probability - Probability 0-1
   * @returns {boolean} True if roll succeeded
   */
  chance(probability) {
    return this.next() < probability;
  }

  /**
   * Reset RNG to initial seed
   */
  reset() {
    this.state = this.seed;
  }

  /**
   * Get current seed for display
   * @returns {string|number} Original seed value
   */
  getSeed() {
    return this.originalSeed;
  }

  /**
   * Generate a random seed string
   * @returns {string} Random 8-character seed
   */
  static generateSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let seed = '';
    for (let i = 0; i < 8; i++) {
      seed += chars[Math.floor(Math.random() * chars.length)];
    }
    return seed;
  }

  /**
   * Get today's daily seed (YYYY-MM-DD format)
   * @returns {string} Daily seed
   */
  static getDailySeed() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Parse seed from URL parameter
   * @returns {string|null} Seed from URL or null
   */
  static getSeedFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('seed');
  }
}

/**
 * Seed Manager
 *
 * Manages seed selection from multiple sources:
 * 1. URL parameter (?seed=ABCD1234)
 * 2. Daily seed (automatic)
 * 3. Custom seed (player input)
 * 4. Random seed (default)
 */
export class SeedManager {
  constructor() {
    this.currentSeed = null;
    this.seedType = null; // 'url', 'daily', 'custom', 'random'
  }

  /**
   * Initialize seed based on priority:
   * URL > Daily (if enabled) > Random
   * @param {boolean} useDailySeed - Whether to use daily seed by default
   * @returns {string} Selected seed
   */
  initialize(useDailySeed = false) {
    // Priority 1: URL parameter
    const urlSeed = SeededRandom.getSeedFromURL();
    if (urlSeed) {
      this.currentSeed = urlSeed;
      this.seedType = 'url';
      console.log('[SeedManager] Using URL seed:', urlSeed);
      return urlSeed;
    }

    // Priority 2: Daily seed (if enabled)
    if (useDailySeed) {
      this.currentSeed = SeededRandom.getDailySeed();
      this.seedType = 'daily';
      console.log('[SeedManager] Using daily seed:', this.currentSeed);
      return this.currentSeed;
    }

    // Priority 3: Random seed
    this.currentSeed = SeededRandom.generateSeed();
    this.seedType = 'random';
    console.log('[SeedManager] Generated random seed:', this.currentSeed);
    return this.currentSeed;
  }

  /**
   * Set a custom seed
   * @param {string} seed - Custom seed
   */
  setSeed(seed) {
    this.currentSeed = seed;
    this.seedType = 'custom';
    console.log('[SeedManager] Set custom seed:', seed);
  }

  /**
   * Get current seed
   * @returns {string} Current seed
   */
  getSeed() {
    return this.currentSeed;
  }

  /**
   * Get seed type
   * @returns {string} Seed type
   */
  getSeedType() {
    return this.seedType;
  }

  /**
   * Generate shareable URL with current seed
   * @returns {string} URL with seed parameter
   */
  getShareableURL() {
    const baseURL = window.location.origin + window.location.pathname;
    return `${baseURL}?seed=${this.currentSeed}`;
  }
}
