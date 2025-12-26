# Changelog

All notable changes to Iron Spine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Rules

When updating this game, follow these conventions:

### Version Format: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or complete gameplay overhauls
  - New game modes that change win conditions
  - Fundamental mechanic changes (e.g., changing merge rules)
  - Save file incompatibility

- **MINOR**: New features or significant improvements
  - New car colors or enemy types
  - New scenes (tutorial, achievements, etc.)
  - New mechanics that don't break existing gameplay
  - Significant balance changes

- **PATCH**: Bug fixes and polish
  - Bug fixes
  - Performance improvements
  - Visual polish (particles, animations)
  - Text/typo corrections

### When to Increment

1. Before pushing to GitHub Pages (production), update version in `src/config.js`
2. Add entry to this CHANGELOG under a new version header
3. Move items from [Unreleased] to the new version section
4. Commit with message: `vX.Y.Z: Brief description`

---

## [Unreleased]

---

## [1.5.2] - 2025-12-26 (Balance + Infinite Scaling)

### Added
- Balance audit tool (`src/core/balance-audit.js`) with console tables for classic/endless curves and TTK estimates.
- Dev console shortcut: **B** runs the balance audit and prints results to console.
- BigInt-aware stats persistence (JSON uses `n` suffix for huge counters).

### Changed
- Endless scaling curve retuned to log-sqrt growth (smoother early, safer late).
- Endless milestones extended through 100,000 waves.
- Mobile safe-area handling moved to the game container; HUD and mobile buttons use tighter edge buffers.
- Pause button now repositions on resize/orientation changes.

### Fixed
- BigInt formatting edge cases (negative values, zero-decimal suffixes).
- Enemy scaling guards now clamp non-finite multipliers in combat spawn.

### Files Added
- `src/core/balance-audit.js`

### Files Modified
- `src/config.js` (v1.5.2 version bump, endless scaling + milestones)
- `src/core/verylargenumbers.js` (BigInt formatting + safe coercion)
- `src/systems/combat.js` (safe scaling guards for huge numbers)
- `src/systems/stats-tracker.js` (BigInt persistence + safe comparisons)
- `src/systems/achievements.js` (BigInt-safe thresholds/progress)
- `src/systems/dev-console.js` (balance audit shortcut)
- `src/scenes/game-scene.js` (DEV_ASSERTIONS audit hook)
- `src/systems/mobile-controls.js` (mobile edge buffer update)
- `src/systems/hud.js` (HUD edge buffer update)
- `src/systems/pause-overlay.js` (resize-aware pause button)
- `index.html` (safe-area CSS variables + padding)

---

## [1.5.1] - 2025-12-25 (Polish & Juice Update)

### Major Features

#### Cinematic Boss Arrival
- **Searchlight Sweep**: 3 rotating searchlight beams scan the screen
- **Scan Line Build-up**: 20 horizontal lines expand to form boss silhouette
- **Dramatic Materialization**: Boss fades in from darkness over 1.6 second sequence
- **Screen Desaturation**: Background desaturates during boss entrance
- Location: `src/systems/boss-gen.js`

#### Boss Phase Transitions
- **HP-Based Phases**: 4 distinct phases at 75%, 50%, 25% HP thresholds
- **Phase 2 (75% HP)**: Boss spins, sheds armor plates, screen shake
- **Phase 3 (50% HP)**: Invulnerability, glowing charge-up, +30% speed
- **Phase 4 (25% HP)**: Desperate mode, red flash, +50% speed, reset cooldowns
- **Transition Lockout**: Prevents damage spam during dramatic moments
- Location: `src/systems/boss-gen.js`

#### Damage Numbers System
- **Contextual Styling**: Visual feedback based on damage type
  - Normal: White, 16px
  - Critical: Yellow, 24px, bold
  - Slow Applied: Blue with ❄ snowflake prefix
  - Armor Pierced: Orange with "PIERCED" suffix
  - Overkill: Red with animated strikethrough
  - DoT Ticks: Small, faded gray
- **Performance Pool**: Max 50 active numbers with automatic cleanup
- **Rise Animation**: Float upward 40 units over 800ms with fade
- Location: `src/systems/damage-numbers.js`

#### Particle Debris System
- **Metal Shards**: 8 colored + 5 gray particles on enemy destruction
- **Impact Debris**: Scaled particle count based on damage dealt
- **Critical Burst**: 12 particles + expanding ring wave for crits
- **Armor Plates**: 6 animated plates fall off during boss phase transitions
- **Contextual Effects**: Different visuals for different hit types
- Location: `src/systems/vfx.js`

#### Pickup Magnetism
- **Slow Range**: 80 units, pull strength 40
- **Fast Range**: 40 units, pull strength 120
- **Boost Integration**: 2x range when boosting (160/80 units)
- **Velocity-Based Pull**: Smooth acceleration toward engine
- **Skill Reward**: Strategic boost usage extends collection range
- Location: `src/core/pickups.js`

### Visual & Polish

#### Enhanced VFX
- `spawnMetalShards()` - Enemy destruction debris
- `spawnImpactDebris()` - Hit feedback particles
- `spawnCriticalBurst()` - Enhanced critical hit effects with ring wave
- `spawnArmorPlates()` - Boss phase change visual spectacle

#### Combat Feedback
- Damage numbers appear on all projectile hits
- Damage numbers show on splash damage
- Metal shards spawn when enemies are destroyed
- Critical hits trigger larger particle bursts
- Boss invulnerability during phase transitions

### Bug Fixes
- Fixed boss telegraph effect (Graphics API compatibility)
  - Changed from `setStrokeStyle()` to container alpha pulsing
  - Boss telegraphs now pulse correctly before attacks

### Technical Improvements
- DamageNumberSystem class with pooling for performance
- Phase transition state machine for bosses
- Boss scene reference for cinematic effects
- Invulnerability flag prevents damage during transitions

### Files Changed
- `src/systems/boss-gen.js` - Cinematic arrival, phase transitions
- `src/systems/damage-numbers.js` - NEW - Floating damage numbers
- `src/systems/vfx.js` - Added debris particle methods
- `src/systems/combat.js` - Integrated damage numbers, debris, invulnerability
- `src/core/pickups.js` - Magnetism with boost integration
- `src/systems/spawner.js` - Cinematic boss arrival integration
- `ideas.md` - Marked 5 features as [DONE]

---

## [1.5.0] - 2025-12-25 (Late Night Expansion)

### Major Features

#### Game Length Extension
- **100 Wave Campaign**: Extended from 20 to 100 waves for epic runs
  - Halved scaling rates for smoother progression (HP: 0.035/wave, Damage: 0.02/wave)
  - Milestone waves at 25, 50, 75, 100 with +50% HP / +30% damage spikes
  - Late game enemy caps increased (Rangers: 5, Armored/Harpooner/Minelayer: 3)
  - Max extra enemies increased to 12 for intense late-game combat
  - Estimated runtime: 20-30min (Normal), 40+ min (Hard)

#### Difficulty System (FULLY INTEGRATED)
- **4 Difficulty Tiers**: Easy, Normal, Hard, Insane
  - **Easy**: -30% enemy HP, -25% damage, +30% pickups, +50% combo window, +20% player HP
  - **Normal**: Baseline (current balance)
  - **Hard**: +40% enemy HP, +30% damage, -30% pickups, -25% combo window, -10% player HP
  - **Insane**: +80% enemy HP, +60% damage, -50% pickups, -50% combo window, -20% player HP
  - Difficulty saved to localStorage, persists across sessions
  - **Fully integrated**: Modifiers applied to spawner, combat, combo system, player stats
  - Selectable in Settings menu with cycle button

#### Enemy Behavior Improvements
- **Off-Screen Teleport**: Enemies now teleport back when 800+ units off-screen
  - Prevents enemies from wandering forever
  - Teleports to opposite edge, maintains pressure
  - Always moves toward player after teleporting

#### UI Systems
- **Reusable Scrollbar Module**: Created `src/ui/scrollbar.js`
  - Mouse wheel scrolling
  - Touch drag scrolling
  - Draggable scrollbar thumb with hover effects
  - Auto-hide when content fits
  - Smooth momentum scrolling
  - **INTEGRATED into Settings menu** - no more floating back button issue
  - Difficulty selector added to Settings menu

#### Endless Mode Extensions
- **Continue to Endless Option**: After completing 100-wave campaign, players can continue to endless mode
  - Displays difficulty-based goal (Normal: 1,000 waves, Hard: 10,000, Insane: 100,000)
  - New "CONTINUE TO ENDLESS" button on victory screen
  - "RETRY CAMPAIGN" option still available
- **Difficulty-Based Goals**: Endless mode now has tier-specific goals
  - Easy: 100 waves (campaign completion)
  - Normal: 1,000 waves
  - Hard: 10,000 waves
  - Insane: 100,000 waves
- **Extended Milestones**: New celebration milestones at 1000, 2500, 5000, 10000, 25000, 50000, 100000

#### Achievement System Expansion
- **10 New Achievements** added for v1.5.0 features:
  - **Combo Master**: Highest kill combo (5/10/15/20) → Fire rate bonuses
  - **Century**: Complete 100 waves → +10% damage
  - **Iron Will**: Win on Hard difficulty → +5% damage
  - **Iron Legend**: Complete 100 waves on Hard → "The Iron Legend" title
  - **Absolute Mastery**: Win on Insane → +10% damage
  - **Iron God**: Complete 100 waves on Insane → "The Iron God" title
  - **Millennium**: Reach wave 1,000 (Normal goal) → +15% damage
  - **Decamillennium**: Reach wave 10,000 (Hard goal) → "The Eternal" title
  - **Centimillennium**: Reach wave 100,000 (Insane goal) → "The Transcendent" title
- **Updated Wave Record** achievement thresholds to 25/50/75/100 (was 10/20/25/50)

#### Threat Indicator Fix
- **Arrow Direction Corrected**: Arrows now point INWARD toward enemies (not outward)
  - Fixed rotation calculation (angle - PI/2)
  - Proper edge-clamping for screen boundaries
  - Better situational awareness

### Files Added
- `src/core/difficulty.js` - Difficulty tier system with modifiers
- `src/ui/scrollbar.js` - Reusable scrollable container

### Files Modified
- `src/config.js` - Extended WAVES to 100, added milestone config, version bump to v1.5.0
- `src/core/settings.js` - Added difficulty setting with localStorage persistence
- `src/core/difficulty.js` - **UPDATED** - Added Insane difficulty tier
- `src/systems/combat.js` - Added enemy teleport logic in updateMeleeEnemy()
- `src/systems/spawner.js` - **UPDATED** - Integrated difficulty modifiers, milestone bonuses
- `src/systems/combo.js` - **UPDATED** - Made combo window configurable for difficulty
- `src/systems/endless-mode.js` - **UPDATED** - Added difficulty-based goals, extended milestones
- `src/systems/achievements.js` - **UPDATED** - Added 10 new achievements, updated thresholds
- `src/scenes/game-scene.js` - **UPDATED** - Applied difficulty to spawner/combo/player HP, added highestCombo tracking
- `src/scenes/settings-scene.js` - **UPDATED** - Integrated scrollbar, added difficulty selector
- `src/scenes/end-scene.js` - **UPDATED** - Added "Continue to Endless" option after 100-wave victory
- `src/systems/threat-indicator.js` - Fixed arrow rotation (inward pointing)
- `CLAUDE.md` - Updated development practices, game values, timeline
- `CHANGELOG.md` - Comprehensive v1.5.0 documentation
- `agents.md` - Updated current state, priorities, development practices

### Configuration
- `WAVES.totalToWin` - Now 100 waves (was 20)
- `WAVES.milestoneWaves` - [25, 50, 75, 100]
- `WAVES.milestoneHpBonus` - 0.5 (+50% on milestones)
- `WAVES.milestoneDamageBonus` - 0.3 (+30% on milestones)
- `SETTINGS.difficulty` - 'easy', 'normal', 'hard', or 'insane'
- `DIFFICULTY_GOALS` - Endless mode goals: {easy: 100, normal: 1000, hard: 10000, insane: 100000}
- `ENDLESS.milestones` - Extended to [10, 25, 50, 100, 150, 200, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

### Balance Changes
- Enemy spawn caps increased for late game viability
- Scaling rates halved to accommodate 5x longer campaigns
- Difficulty modifiers provide meaningful choice without breaking balance
- Insane difficulty added for extreme challenge seekers
- Combo window adjusts based on difficulty (0.5x to 1.5x base)
- Pickup spawn rates scale with difficulty (-50% to +30%)
- Player HP scales with difficulty (-20% to +20%)

---

## [Unreleased - Old Content]

### Added
- **Purple Sniper Car**: Long-range precision weapon with extended range (450-550 vs 240-380)
  - Penetration mechanic: Projectiles pierce through 1-3 enemies based on tier
  - Unique needle-shaped projectile with energy shimmer effect
  - Slower fire rate (1.5-2.2 shots/sec) emphasizes precision over volume
  - Weighted spawn: 3x more common in early game (waves 1-5), reduced late game
- **Orange Artillery Car**: Area damage specialist with splash damage mechanics
  - Slowest fire rate (0.6-1.0 shots/sec) but hits multiple enemies per shot
  - Splash damage: 50-80 unit radius dealing 12-25 damage to nearby enemies
  - Large mortar shell projectile with fire corona and pulsing animation
  - Weighted spawn: 2x more common in mid game (waves 6-12) when enemies cluster
  - New `applySplashDamage()` system in combat.js
- **HUD Readability Upgrades**
  - Spine readout strip with tier pips and merge candidate pulses
  - Damage direction pings for off-screen hits
  - Optional range arcs toggle in Settings
- **Pickup Caravans**: Groups of 3-5 pickups drift together for intentional merge planning
- **Skirmisher Formation Waves**: Wedge/column/line/pincer formations with wave label callout
- **Train Visual Identity Pack**
  - Car damage states (scratches, cracks, sparks, smoke)
  - Tier armor plating language (t2+ plates, t3 edge/stripe, t4 insignia)
  - Engine accent glow pulsing with dominant weapon color
  - Directional muzzle recoil on car weapons
  - Heat vent glow tied to firing intensity
  - Unified ground shadow and engine headlight scan cone
- **New Enemies**
  - Harpooner: telegraphed tether that drags a mid-car sideways
  - Clamp Mine Layer: drops mines that latch onto cars and apply a temporary turn penalty

### Changed
- **All weapon ranges extended and varied**:
  - Red (Machinegun): 240-280 (was 200, +40-80 range)
  - Blue (Cryo): 280-320 (was 250, +30-70 range)
  - Yellow (Cannon): 340-380 (was 300, +40-80 range)
  - Purple (Sniper): 450-550 (new)
  - Orange (Artillery): 300-360 (new)
- **Weighted color spawning system**: Spawn rates now change based on wave progression
  - Early game favors purple snipers to help with range
  - Mid game favors orange artillery for crowd control
  - Late game reduces purple, balances others
- Settings menu spacing updated to accommodate new toggles
- Projectile visual system updated with purple needle and orange mortar visuals
- Color impact effects updated (purple: tight spread, orange: massive explosion)

### Fixed
- Guarded against missing heat/mine update helpers to prevent runtime crashes during gameplay.
- Defensive checks around optional recoil and damage-effect hooks to keep runs stable if modules drift.
- Clamp mines now clean up on combat reset so turn penalties do not persist between runs.

### Developer Notes
- New `weightedRandom()` helper function in spawner.js for dynamic spawn rates
- Splash damage excludes direct hit target (no double-dipping)
- Splash damage ignores armor for balance (slow fire rate compensation)
- Purple penetration uses existing penetration counter system
- Orange fire pulse animation uses corona scaling and flame flickering
- Harpoon tether uses a wind-up -> drag loop with per-car lateral pull
- Clamp mines can be shot off before they expire

---

## [1.4.0] - 2025-12-25 (Christmas Night Update)

### Major Features

#### Combat Fairness Systems
- **Attack Telegraphs**: Enemy attacks now show visual warnings before firing
  - Ranger: Red laser aim line (400ms warning)
  - Champion: Charging aura with speed indicators (600ms warning)
  - Boss: Ground warning circle at impact point (800ms warning)
  - Armored: Plating glow with charge particles (600ms warning)
- **Threat Indicators**: Off-screen enemy awareness system
  - Edge-of-screen arrows pointing to dangerous enemies
  - Color-coded by threat level (gray=skirmisher, gold=champion, orange=boss)
  - Priority system shows 8 most dangerous threats
  - Pulse animation for visibility

#### Combat Depth Systems
- **Combo System**: Kill chains reward skilled play
  - 2 second combo window - keep killing to maintain
  - 5 multiplier tiers (1.0x -> 1.2x -> 1.5x -> 2.0x -> 3.0x damage)
  - Milestone callouts: ROLLING (5), UNSTOPPABLE (10), LEGENDARY (15), IRON SPINE (20+)
  - Applies to ALL damage sources (weapons + pulse)
  - HUD displays current combo count and multiplier
- **Critical Hits**: Chance-based damage spikes
  - Base: 5% crit chance, 2.0x damage multiplier
  - Yellow (Precision): 10% crit chance, 2.5x multiplier
  - Purple (Sniper): 7% crit chance, 2.2x multiplier
  - Visual effects: bright flash, impact ring, floating damage numbers

#### Procedural Systems
- **Weather/Biome System**: Dynamic atmospheric variety
  - 5 weather types: Clear, Fog, Storm, Dust, Ash
  - Procedural particles (rain, fog, dust, ash)
  - Gameplay modifiers (Fog: -20% enemy detection, Storm: lightning strikes)
  - Weather cycles every 60-90 seconds
- **Procedural Boss Factory**: Unique bosses every wave
  - 4 body types (hexagon, octagon, star, fortress)
  - Modular anatomy: 1-3 weapon mounts, 0-2 weak points
  - 4 behavior patterns: CHARGE, SWEEP, BURST, SUMMON
  - Weak points take 2x damage

#### Visual Polish
- **Screen Effects System**: Reactive cinematic overlays
  - Low HP: Red vignette pulse
  - High Combo: Gold edge glow
  - Boss Spawn: Color desaturation
  - Victory: White flash fade

### Configuration
All new systems configurable via `src/config.js`:
- COMBO, CRIT, WEATHER, TELEGRAPH, THREAT, PROC_BOSS

### Files Added
- `src/systems/telegraph.js`, `threat-indicator.js`, `combo.js`, `critical-hits.js`
- `src/systems/screen-effects.js`, `weather.js`, `boss-gen.js`
- `INTEGRATION-GUIDE.md`

### Files Modified
- `src/config.js` - Added 6 new config sections
- `src/scenes/game-scene.js` - Integrated all new systems
- `src/systems/combat.js` - Combo/crit damage, boss updates
- `src/systems/spawner.js` - Weather modifiers, procedural bosses
- `src/systems/hud.js` - Combo and weather display

---

## [1.3.0] - 2025-12-25 (Christmas Edition)

### Added - Visual Systems
- **Parallax World System**: 3-layer scrolling background with procedural mountain terrain, debris, vehicle wrecks, warning signs, and craters. Creates sense of moving through an industrial wasteland.
- **Unique Projectile Visuals**: Each weapon color now has distinct shapes and trails:
  - Red: Thin tracer darts with streak trails
  - Blue: Pulsing frost orbs with ice accents
  - Yellow: Heavy armor-piercing bolts with spark trails
- **New `src/art/` folder**: Dedicated space for procedural art systems

### Changed
- Camera zoom significantly reduced (0.85 base vs 1.12) so train doesn't dominate large screens
- Look-ahead distance increased (110 vs 90) for better forward visibility
- **Tutorial revamped**: Reduced from 8 to 7 pages, punchier text, accurate game values (55 HP, 40s pulse, etc.), mentions SORT key and Endless mode
- HUD right margin now matches left margin (prevents "Kills" text cutoff)

### Documentation
- **ideas.md completely rewritten**: Now contains 30+ feature concepts with [SCAFFOLDING] implementation notes for future LLMs. Organized by priority with code location hints and pseudocode.
- ideas.md covers: projectile identity, enemy telegraphs, procedural bosses, weather systems, prestige meta-progression, challenge modes, seeded runs, combo systems, station events, and more

### Developer Notes
- New art systems are modular: `WorldManager` and projectile visuals can be disabled without breaking gameplay
- Trail system uses position history with fading for smooth visual feedback
- All new graphics are procedural (no external assets)

---

## [1.2.1] - 2025-12-24

### Added
- Wired achievements bonuses into combat, train stats, and overdrive charge.
- Integrated drop protection with cooldown/hold feedback and HUD indicators.
- Integrated pause overlay (ESC/P) into the gameplay loop.
- Endless mode wiring with HUD formatting for large wave counts.
- Big-number formatting for HUD/menu/end stats.

### Changed
- Early-game difficulty eased (lower base wave counts, later ranger/armored spawns, more pickups).
- Engine HP increased to 55 and spawn invulnerability to 2.0s.
- Reordering now places higher tiers closer to the engine to protect from jettison.

---

## [1.2.0] - 2025-12-24

### Added - New Systems (Claude)
- **Tutorial Scene**: 8 interactive pages teaching all game mechanics
- **Stats Tracker**: Persistent run statistics with localStorage
- **Deep Achievement System**: 25+ achievements with Bronze/Silver/Gold/Diamond tiers, actual gameplay bonuses (damage, speed, HP increases), and satisfying unlock animations
- **Large Number System**: Support for numbers up to 10^308, idle-game style suffixes (K, M, B, T, Qa, Qi...), animated counters
- **Endless Mode**: Infinite wave progression with logarithmic scaling, milestone celebrations, rubber-banding for struggling players
- **Drop Protection**: Prevents accidental car loss with cooldowns, warnings, and hold-to-confirm for last car
- **Pause Overlay**: ESC/P to pause with Resume/Settings/Quit menu

### Added - Car Reordering (Codex)
- **R/SORT key**: Reorders train cars by tier (highest toward tail) and color grouping
- Mobile SORT button for touch devices

### Changed
- Config.js now includes extensive documentation for adding new car colors and enemy types
- Future color definitions (Orange, Green, Purple) ready to uncomment
- Future enemy definitions (Armored, Ranger, Swarm) ready to uncomment
- Version bumped to v1.2

### Developer Notes
- All new systems are modular and can be plugged in without modifying game-scene.js
- Achievement bonuses are applied via `getAchievementBonuses()` - integrate where damage/speed/etc are calculated
- Endless mode activated by setting `ENDLESS.enabled = true` in config.js

---

## [1.1.0] - 2025-12-21

### Added
- Significantly increased left margins for mobile safe areas
- Build version overlay in HUD (bottom-right corner)

### Fixed
- Viewport clipping on mobile and desktop browsers
- Steering bug that caused erratic movement
- Mobile controls polish and responsiveness

---

## [1.0.0] - 2025-12-21

### Added
- Initial release of Iron Spine
- Core gameplay loop: steer, collect, merge, survive
- Engine + weapon cars with follow physics
- 3 car colors: Red (rapid), Blue (freeze), Yellow (pierce)
- 2048-style pair merge system (adjacent same-color, same-tier)
- 3 enemy types: Skirmisher, Champion, Boss
- Wave-based progression (20 waves to win)
- Auto-fire weapons with color-specific behaviors
- Engine weapon that adapts to dominant car color
- Overdrive Pulse (screen-wide damage)
- HUD with HP bars, timer, wave counter, pulse meter
- Menu, Settings, and End scenes
- Dev console for debugging (numpad decimal)
- Mobile touch controls (BOOST, DROP, PULSE buttons)

### Technical
- Phaser 3 via CDN (no build tools)
- Procedural graphics (no external assets)
- ES modules for code organization
- Responsive scaling for desktop and mobile

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| v1.5.0 | 2025-12-25 | 100 waves, 4 difficulties (+ Insane), endless goals, 10 new achievements, scrollbar, Continue option |
| v1.4.0 | 2025-12-25 | Telegraphs, combos, crits, weather, procedural bosses, screen effects |
| v1.3.0 | 2025-12-25 | Parallax world, unique projectiles, tutorial revamp, HUD fixes |
| v1.2.1 | 2025-12-24 | Pause/drop protection wired, endless HUD, easier early game |
| v1.2.0 | 2025-12-24 | Endless mode, achievements, tutorial, reordering |
| v1.1.0 | 2025-12-21 | Mobile fixes, viewport improvements |
| v1.0.0 | 2025-12-21 | Initial public release |

---

## Links

- **Live Game**: https://xxgeminixx.github.io/TheIronSpine/
- **Repository**: https://github.com/xxgeminixx/TheIronSpine
- **License**: MIT
