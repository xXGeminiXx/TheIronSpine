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

### Added
- (nothing yet)

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
