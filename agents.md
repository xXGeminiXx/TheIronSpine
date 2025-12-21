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

### Phase: Active Prototype

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

**Next Steps:**
1. Refine car silhouettes (minor shape polish)
2. Decide and implement car reordering mechanic
3. Add Armored and Ranger enemies
4. Add audio + light VFX polish
5. Iterate balance based on playtests

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
| `ideas.md` | Future concepts parking lot. NOT in scope for V1. |
| `agents.md` | This file. Context for AI assistants. |
| `CLAUDE.md` | Project-specific Claude Code instructions. |
| `index.html` | Main game file for Iron Spine. |

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

**Out of Scope (V2+):**
- Additional colors (Green, Orange, Purple, etc.)
- Utility cars (Armor, Repair, Magnet)
- Meta-progression / unlocks
- Sound effects / music
- Mobile-specific optimizations
- Multiplayer
- Leaderboards
- Save system

---

## Final Notes for Agents

1. **Read design-doc.md first** before implementing anything. It has the numbers, the decisions, the edge cases.

2. **Prototype speed over production quality.** This is an experiment. Hacky-but-working beats elegant-but-slow.

3. **Ask if uncertain.** David prefers questions over wrong assumptions.

4. **Document as you go.** Comments explaining "why" are valuable. Comments explaining "what" are usually code smell.

5. **The game should be fun.** If something isn't fun, it should be cut or changed, regardless of how clever the implementation is.
