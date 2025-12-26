# Iron Spine - Agent Context Document

This document provides context for AI coding assistants working on Iron Spine. Read this first to understand the project's philosophy, constraints, and current state.

---

## Project Identity

**What this is:**
- A tiny, mechanics-first browser game prototype
- Inspired by Bartellami Jet's 1944 Assault Train patent and modular combat systems
- A reaction against predatory mobile game monetization
- An articulated war machine—a train, not a snake
- David's passion project, built with AI assistance

**What this is NOT:**
- A clone or remake of any existing game
- A commercial product (at least not yet)
- A live service with monetization
- A mobile app (browser-only for now)
- A snake game (it's a TRAIN with spherical couplings, not a slithering creature)

---

## Core Concept (One Paragraph)

You command the Iron Spine—an articulated armored train, a chain of weapon cars linked by spherical couplings. Each car has a color (Red, Blue, Yellow) that determines its weapon type. Cars auto-fire at enemies while you steer to collect more cars. When 2 adjacent same-color, same-tier cars exist, they automatically merge into a single higher-tier car with improved stats (2048-style growth). The challenge is surviving wave-based combat while strategically building your train through collection order. Runs are 2-5 minutes. The fantasy: you're the commander of an articulated war machine, not a gunner aiming weapons.

---

## Technical Stack (Strict Constraints)

| Requirement | Constraint |
|-------------|------------|
| Platform | Web browser only |
| Rendering | HTML5 Canvas |
| Framework | Phaser 3 via CDN (allowed but not required) |
| Physics | **Simple follow behavior. NO Matter.js for V1.** |
| Build tools | NONE. No npm, no webpack, no bundlers. |
| File structure | Single HTML file preferred, or minimal file structure |
| External assets | NONE. All graphics are procedural or canvas primitives. |
| Audio | Web Audio API if needed, procedural preferred |
| Dependencies | CDN-only, no package.json |

**Why these constraints?**
- Portability: The game should run by double-clicking an HTML file
- Simplicity: No build step means faster iteration
- AI-friendly: LLMs can read/write the entire codebase easily
- Low overhead: David doesn't want to maintain tooling
- **Simple physics**: Lerp-based follow is easier to tune and debug than constraint systems

---

## Design Pillars (Internalize These)

### 1. Determinism Over Randomness
The merge system is predictable. 2 adjacent same-color, same-tier = merge. Always. No exceptions. No random outcomes. Player actions have consistent results.

### 2. Readability Over Complexity
At peak chaos, players must understand:
- Their train's composition and health
- Incoming threats
- Available pickups

If any of these become unclear, add visual clarity, don't add complexity.

### 3. Short, Complete Experiences
2-5 minute runs. No grinding. Each run has a beginning, middle, climax, and end. Players should feel satisfied after one run, eager for another.

### 4. Minimal Input, Emergent Output
Player controls: steering (and maybe boost). That's it. Weapons fire automatically. Merges happen automatically. Complexity emerges from spatial arrangement of the train, not from button combos or skill trees.

### 5. Anti-Paywall Philosophy
This project exists because David hit a paywall in a game he loved. No energy systems, no premium currency, no artificial friction. If this ever monetizes, it's premium purchase or free.

---

## Current State (Update As Progress Happens)

### Phase: Production (v2.0.0 - Live on GitHub Pages)

**Completed:**
- Engine silhouette finalized (cartoon locomotive)
- Engine + cars with follow physics and couplings
- Pointer-following steering with boost
- Pickup spawning and collection
- 2048-style pair merges with telegraph/flash
- Wave-based spawning with champions/bosses
- Auto-fire weapons + engine weapon scaling
- HUD, menus, settings, end screen
- Dev console (numpad decimal toggle)
- Tutorial scene (8 interactive pages)
- Achievement system (25+ achievements with bonuses)
- Endless mode with logarithmic scaling
- Drop protection and pause overlay
- Car reordering (R key / SORT button)
- Armored and Ranger enemies
- Procedural audio system
- **Parallax world system** (v1.3)
- **Unique projectile visuals per color** (v1.3)
- **Attack telegraphs** (v1.4.0) - Enemy attack warnings
- **Threat indicators** (v1.4.0) - Off-screen enemy arrows
- **Combo system** (v1.4.0) - Kill chain multipliers (5 tiers)
- **Critical hits** (v1.4.0) - Chance-based damage spikes
- **Weather system** (v1.4.0) - 5 dynamic weather types with modifiers
- **Procedural bosses** (v1.4.0) - Generated bosses with modular weapons
- **Screen effects** (v1.4.0) - Cinematic overlays (low HP, combo glow)
- **100-wave campaign** (v1.5.0) - Extended from 20 to 100 waves with milestones
- **Difficulty system** (v1.5.0) - Easy/Normal/Hard with full modifiers
- **Enemy teleport** (v1.5.0) - Prevents off-screen wandering
- **Scrollbar module** (v1.5.0) - Reusable UI component
- **Balance audit tool** (v1.5.2) - Console table for scaling/TTK sanity checks
- **BigInt stats persistence** (v1.5.2) - Safe counters beyond Number.MAX_SAFE_INTEGER
- **Endless scaling retune** (v1.5.2) - Log-sqrt curve for smoother infinite mode
- **Mobile safe-area padding** (v1.5.2) - Container-level safe area handling
- **Resize-aware pause button** (v1.5.2) - Repositions on orientation changes
- **Cinematic boss arrival** (v1.5.1) - Searchlights, scan lines, 1.6s sequence
- **Boss phase transitions** (v1.5.1) - HP-based at 75%, 50%, 25% with invulnerability
- **Damage numbers system** (v1.5.1) - Contextual styling (critical, overkill, pierced, slow)
- **Particle debris** (v1.5.1) - Metal shards, impact debris, armor plates, critical bursts
- **Pickup magnetism** (v1.5.1) - 2x range when boosting, smooth collection
- **Headlight vacuum** (v1.5.2) - Light cone pulls pickups (200), pushes enemies (150)
- **Power scaling** (v1.5.2) - Square root car count multiplier (√100 = 2.5x damage)
- **Persistent leaderboard** (v1.5.3) - Local top runs with dev-console eligibility gating
- **Remote highscores** (v1.5.4) - Host-locked anonymous submissions + highscore scene
- **Seeded runs** (v1.6.0) - Reproducible runs with daily/random seeds
- **Highscore arcade UI** (v1.6.1) - Filters, refresh, and in-game name entry overlay
- **Prestige system** (v2.0.0) - Scrap currency + permanent upgrade paths
- **Challenge modes** (v2.0.0) - 8 rulesets with selection scene + achievements
- **Ghost replay** (v2.0.0) - Local best-run ghost with milestone comparisons
- **Procedural achievement pop-ups** (v2.0.0) - Medal visuals with ribbon + fanfare
- **Station events** (v2.0.0) - 3-lane buff gates every 8 waves

**New Art Systems (v1.3):**
- `src/art/world-gen.js` - Parallax background with mountain terrain, debris, wrecks, signs
- `src/art/projectile-visuals.js` - Unique shapes and trails per weapon color (tracers, orbs, bolts)

**New Polish Systems (v1.5.1):**
- `src/systems/damage-numbers.js` - Pooled damage number display with contextual styling
- Cinematic boss arrival in `src/systems/boss-gen.js` - 4-phase sequence with searchlights
- Boss phase transitions in `src/systems/boss-gen.js` - HP-based invulnerability phases
- Particle debris methods in `src/systems/vfx.js` - Metal shards, impact, armor plates, critical bursts
- Pickup magnetism in `src/core/pickups.js` - Distance-based pull with boost multiplier
- Headlight vacuum in `src/core/train.js` - Geometric cone intersection with force application (v1.5.2)
- Power scaling in `src/systems/combat.js` - Car count multiplier for exponential growth (v1.5.2)

**New Combat Systems (v1.4.0):**
- `src/systems/telegraph.js` - Visual warnings before enemy attacks (Rangers, Champions, Bosses, Armored)
- `src/systems/threat-indicator.js` - Edge-of-screen arrows pointing to off-screen threats
- `src/systems/combo.js` - Kill chain multipliers (1.0x → 1.2x → 1.5x → 2.0x → 3.0x)
- `src/systems/critical-hits.js` - Weapon-specific crit chances (Yellow: 10%, Purple: 7%, Base: 5%)
- `src/systems/screen-effects.js` - Reactive overlays (low HP vignette, combo glow, boss desaturation)

**New Environmental Systems (v1.4.0):**
- `src/systems/weather.js` - 5 weather types (Clear, Fog, Storm, Dust, Ash) with gameplay modifiers
- `src/systems/boss-gen.js` - Procedural boss factory (4 body types, modular weapons, weak points)

**New Core Systems (v1.5.0):**
- `src/core/difficulty.js` - 3-tier difficulty system (Easy/Normal/Hard) with modifiers
- `src/ui/scrollbar.js` - Reusable scrollbar with mouse wheel, touch drag, scrollbar thumb

**New Meta Systems (v2.0.0):**
- `src/systems/prestige.js` - Scrap-based meta progression + upgrade registry
- `src/modes/challenge-modes.js` - Challenge rulesets + modifiers
- `src/scenes/challenge-scene.js` - Challenge selection UI scene
- `src/systems/ghost.js` - Ghost recording, storage, rendering
- `src/systems/achievement-popup.js` - Medal-style achievement popups
- `src/systems/station-events.js` - Buff gate event system

**New HUD Systems (v1.3 - Codex):**
- Tier pips per car in spine readout
- Merge candidate highlighting (pulsing borders)
- Damage direction pings (edge arrows)
- Pickup caravans (3-5 grouped spawns)
- Combo display (top-right, shows kill count + multiplier)
- Weather display (top-center, shows current weather type)

**Current Priority (see ideas.md for comprehensive list):**
1. **P1**: Apply difficulty modifiers to spawner/combat systems
2. **P1**: Integrate scrollbar into Settings menu
3. **P1**: Update achievements for combo milestones, 100-wave completion, difficulty tiers
4. **P2**: Infinite mode extension (1000/10k/100k waves for different difficulties)
5. **P2**: Car damage states (visual HP feedback)
6. **P2**: Armor plate language per tier (visual identity)

---

## Code Patterns (When Implementation Begins)

### Preferred Style
```javascript
// Clear, readable over clever
// Explicit over implicit
// Comments explain "why", code explains "what"

// GOOD: Self-documenting with clear naming
function detectMerge(cars) {
    for (let i = 0; i < cars.length - 1; i++) {
        const first = cars[i];
        const second = cars[i + 1];
        if (first.color === second.color && first.tier === second.tier) {
            return { startIndex: i, color: first.color, tier: first.tier };
        }
    }
    return null;
}

// BAD: Clever but unclear
const detectMerge = c => c.findIndex((x,i) =>
    c[i+1] && c[i+1].color === x.color && c[i+1].tier === x.tier);
```

### Phaser 3 Usage (If Used)
```javascript
// Scene-based structure
class GameScene extends Phaser.Scene {
    preload() { /* procedural assets, no external files */ }
    create() { /* setup game objects */ }
    update(time, delta) { /* game loop */ }
}

// Config - NOTE: No physics engine for V1
const config = {
    type: Phaser.AUTO, // Use WebGL if available, fallback to Canvas
    width: 800,
    height: 600,
    // NO physics config - we use simple follow behavior
    scene: [MenuScene, GameScene, GameOverScene]
};
```

### Pure Canvas (If Not Using Phaser)
```javascript
// Simple game loop pattern
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let lastTime = 0;
function gameLoop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    render(ctx);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `design-doc.md` | Authoritative design specification. All mechanics, numbers, decisions. Includes historical context on Bartellami Jet's Assault Train. |
| `ideas.md` | **EXPANDED** - 30+ feature concepts with [SCAFFOLDING] implementation notes for future LLMs. Priority-organized with code location hints. |
| `agents.md` | This file. Context for AI assistants. |
| `CLAUDE.md` | Project-specific Claude Code instructions. Updated with development practices and game values. |
| `CHANGELOG.md` | Version history with detailed feature documentation (v1.0.0 through v2.0.0). |
| `INTEGRATION-GUIDE.md` | Step-by-step integration guide for v1.4.0 systems. |
| `index.html` | Main game file for Iron Spine. |
| `src/config.js` | Central configuration for all game values. **EXTENDED for 100 waves, milestones, difficulty.** |
| `src/art/` | Procedural art systems (world-gen, projectile-visuals). |
| `src/core/` | Core game logic (train, merge, pickups, math, **difficulty**). |
| `src/core/balance-audit.js` | Balance audit console report (scaling + TTK sanity checks). |
| `src/systems/` | Game systems (combat, spawner, audio, hud, achievements, **telegraph, threat-indicator, combo, critical-hits, screen-effects, weather, boss-gen**). |
| `src/systems/leaderboard.js` | Persistent leaderboard storage with dev-console eligibility gating. |
| `src/systems/remote-highscores.js` | Host-locked remote highscores (anonymous submissions). |
| `src/systems/prestige.js` | Prestige meta-progression system (scrap + upgrades). |
| `src/modes/challenge-modes.js` | Challenge mode definitions + modifiers. |
| `src/scenes/challenge-scene.js` | Challenge selection UI scene. |
| `src/systems/ghost.js` | Ghost replay recording + rendering. |
| `src/systems/achievement-popup.js` | Procedural medal popups for achievements. |
| `src/systems/station-events.js` | Station event buff gates. |
| `src/systems/synergy.js` | Color synergy scaffold (not integrated). |
| `server/highscores-worker.js` | Cloudflare Worker API for remote highscores. |
| `server/README.md` | Deployment notes for the highscore worker. |
| `src/scenes/` | Phaser scenes (game, menu, end, tutorial, settings). |
| `src/scenes/highscore-scene.js` | Remote highscores display scene. |
| `src/ui/` | UI components (**scrollbar**). |

---

## What Makes This Game Unique

1. **Articulated War Machine Fantasy**: Inspired by Bartellami Jet's 1944 Assault Train—three armored cabins linked by a hydraulic spine. Not a snake, not a centipede—a mechanical train of steel and firepower.

2. **Color = Role**: Each color isn't just a visual—it's a complete weapon archetype. Red = assault, Blue = control, Yellow = armor-piercing.

3. **Merge as Strategy**: The 2048-style pair-merge rule creates puzzle-like decisions during action gameplay. Collection order matters. Spatial thinking.

4. **Commander, Not Gunner**: You don't aim. You don't fire. You steer and collect. The train IS the weapon. This is the key differentiator from twin-stick shooters.

5. **Readable Chaos**: The goal is chaotic combat that remains understandable. Most action games sacrifice clarity for spectacle. This game must do both.

6. **Historical Soul**: The Assault Train never left the drawing board in 1944. Iron Spine is our answer—what if it had worked?

---

## Working With David

### Communication Style
- Direct and concise
- Prefers actionable information over preamble
- Appreciates technical accuracy
- Values "why" explanations for design decisions

### Expectations
- Code that works, not perfect code
- Prototype-first mentality
- Willingness to experiment and throw away failed experiments
- Clear documentation of what was tried and why

### Red Flags (Avoid These)
- Over-engineering (keep it simple)
- Scope creep (V1 only, defer the rest)
- Build tool suggestions (no npm, period)
- Asset pipeline complexity (procedural graphics only)

---

## Quick Reference: V1 Scope

**In Scope:**
- Engine + cars with physics-based chain movement
- Pointer-following steering
- Red, Blue, Yellow car types with auto-fire
- 2048-style pair merge to higher tier
- Skirmisher + Champion + Boss enemy types
- Wave-based spawning
- Wave-clear win condition
- Minimal HUD (HP, timer, kills, wave)
- Procedural graphics (shapes and colors)
- Single HTML file deployment

**Completed Beyond V1 Scope:**
- Enemy attack telegraphs ✅ (v1.4.0)
- Procedural boss generation ✅ (v1.4.0)
- Weather/biome system ✅ (v1.4.0)
- Additional colors (Purple, Orange) ✅ (see ideas.md [Unreleased])
- Combo system ✅ (v1.4.0)
- Critical hits ✅ (v1.4.0)
- Difficulty tiers ✅ (v1.5.0)
- 100-wave campaign ✅ (v1.5.0)

**Still Out of Scope (V2+):**
- Utility cars (Armor, Repair, Magnet)
- Meta-progression / prestige system
- Multiplayer
- Leaderboards
- Station events / interactive background elements
- Challenge modes (pacifist, speedrun, etc.)

---

## Development Practices (Established v1.4.0-v1.5.0)

### Documentation Requirements
1. **Always update CHANGELOG.md** when adding features or fixing bugs
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Document all new systems, files, and configuration changes
   - Include rationale and implementation notes

2. **Update CLAUDE.md** with development practices and game values
   - Keep game values current (wave count, scaling rates, etc.)
   - Document new patterns and architectural decisions
   - Add warnings about common pitfalls

3. **Update agents.md** after major feature additions
   - Keep "Current State" section current
   - Add new files to Key Files Reference
   - Update priorities based on remaining work

4. **Test integration** before committing major system changes
   - Verify ES6 module imports (not CommonJS require())
   - Test new systems in game loop
   - Check for console errors
5. **Update MCP memory** after major changes
   - Store a concise summary of code state + new ideas
   - Capture balance or scaling shifts that future LLMs need to know

### Configuration Architecture
- **src/config.js is the source of truth** for all game balance
- New systems should export config constants (e.g., `COMBO`, `CRIT`, `WEATHER`)
- Always include inline comments explaining formulas and rationale
- Use `Object.freeze()` for immutable config objects

### Modular System Design
- Each system lives in its own file (e.g., `combo.js`, `weather.js`)
- Systems export initialization functions and update loops
- Integration happens in `game-scene.js` with clear lifecycle:
  1. Import at top
  2. Initialize in `create()`
  3. Update in `update()`
  4. Cleanup in `destroy()`
- Use callbacks for cross-system communication (e.g., combo milestones)

### Common Pitfalls
- **ES6 modules**: Always use `import/export`, never `require()`
- **Rotation math**: Remember `angle - Math.PI / 2` for inward-pointing arrows
- **Enemy behavior**: Implement teleport for off-screen enemies (800+ unit margin)
- **Scaling rates**: Halve rates when extending campaign length (20 → 100 waves)

---

## Final Notes for Agents

1. **Read design-doc.md first** before implementing anything. It has the numbers, the decisions, the edge cases.

2. **Prototype speed over production quality.** This is an experiment. Hacky-but-working beats elegant-but-slow.

3. **Ask if uncertain.** David prefers questions over wrong assumptions.

4. **Document as you go.** Comments explaining "why" are valuable. Heavier-than-normal rationale comments are expected for core systems.

5. **Keep core systems isolated.** Each file represents one core idea (merge logic in `src/core/merge.js`, reordering in its own module). Functions stay single-purpose; avoid mixing system logic across files.

6. **Update documentation comprehensively.** After major features, update CHANGELOG.md, CLAUDE.md, and agents.md (this file).

7. **The game should be fun.** If something isn't fun, it should be cut or changed, regardless of how clever the implementation is.
