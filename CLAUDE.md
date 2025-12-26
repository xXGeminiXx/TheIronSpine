# CLAUDE.md - Iron Spine

Project-specific instructions for Claude Code. These override defaults when working in this directory.

## Project Status: COMPLETE (v1)

**Live at:** https://xxgeminixx.github.io/TheIronSpine/

**Development Timeline:**
- v1.0.0: Built in ~8 hours on 2025-12-21
- v1.3.0: Purple/Orange cars, visual systems (2025-12-25)
- v1.4.0: Combat depth, weather, procedural bosses (2025-12-25 Night)
- v1.5.0: 100 waves, difficulty tiers, UI systems (2025-12-25 Late Night)
- v1.5.1: Polish & juice (boss cinematic, phase transitions, damage numbers, magnetism)
- v1.5.2: Balance audit + power scaling + headlight vacuum (2025-12-26)

Free, open-source, MIT licensed.

**IMPORTANT DEVELOPMENT PRACTICES:**
- **Always update CHANGELOG.md** when adding features or fixing bugs
- **Update achievements** when adding new mechanics or milestones
- **Test integration** before committing major system changes
- **Document new config** values with inline comments
- **Store an MCP memory summary** after major changes (code state + key ideas)

## Project Summary

**Iron Spine** is a browser-based action game inspired by the paywalled mobile game Colossatron. You command a train made of weapon cars linked by spherical couplings. Cars auto-fire based on their color (Red=rapid, Blue=slow/freeze, Yellow=armor-piercing). When 2 adjacent same-color, same-tier cars exist, they merge into a higher-tier version. The goal is to clear 20 waves in 2-5 minute runs while strategically collecting and arranging cars.

**Important**: This is a TRAIN, not a snake. Industrial, mechanical, armored. Spherical couplings, not biological joints. Steel and firepower, not slithering.

## Critical Constraints

### Technical Requirements (Non-Negotiable)
```
Platform:     Web browser only (HTML5 Canvas)
Framework:    Phaser 3 via CDN allowed, not required
Build tools:  NONE. No npm, webpack, vite, or any bundler.
Assets:       NONE. All graphics procedural (canvas primitives)
Deployment:   Single HTML file (or minimal file structure)
Dependencies: CDN-only, no node_modules
```

### V1 Physics Decision: Simple Follow (No Matter.js)
```
Movement model:  Simple lerp-based follow behavior
Physics engine:  NONE for V1. No Matter.js, no constraints.
Rationale:       Easier to tune, more deterministic, less debugging
Future:          Can add Matter.js later if we want wobbly chaos
```

**Do not implement physics constraints or Matter.js for V1.** Use the simple follow pattern:
```javascript
car.x += (leader.x - car.x) * followSpeed;
car.y += (leader.y - car.y) * followSpeed;
```

### Design Requirements (Non-Negotiable)
```
Merge rule:   Exactly 2 adjacent same-color, same-tier → 1 higher tier. No exceptions.
Run length:   100 waves campaign (~20-40 min) + optional endless mode (1k-100k wave goals)
Controls:     Pointer-following steering only. No manual aiming.
Weapons:      Auto-fire. Player never controls when/where to shoot.
Monetization: NONE. No paywalls, no energy systems, no premium currency.
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point - loads Phaser and main.js |
| `src/config.js` | **All game balance values** - tweak this to modify gameplay |
| `src/core/train.js` | Train + car logic, movement, merging |
| `src/scenes/game-scene.js` | Main gameplay loop orchestration |
| `src/systems/combat.js` | Enemies, projectiles, damage |
| `design-doc.md` | Full design specification (source of truth) |
| `ideas.md` | Future ideas parking lot (NOT in V1 scope) |

## Commands

### To Run The Game (Once Created)
```bash
# Option 1: Just open the file
start index.html  # Windows
open index.html   # macOS
xdg-open index.html  # Linux

# Option 2: Local server (if CORS issues arise)
python -m http.server 8000
# Then visit http://localhost:8000
```

### No Build Commands Exist
This is intentional. There is no build step. The game runs directly from source.

## Implementation Order

When implementing, follow this sequence:

1. **Train Rendering** - Draw engine + 3 test cars (no movement)
2. **Engine Steering** - Engine follows pointer, moves forward constantly
3. **Chain Physics** - Cars follow engine with spring-like delay
4. **Car Collection** - Spawn loose cars, collect on touch
5. **Merge System** - Detect adjacent pair merges, execute merge animation
6. **Basic Combat** - Cars auto-fire at dummy targets
7. **Enemy AI** - Spawn enemies, implement behaviors
8. **Game Loop** - Waves, win/lose states
9. **HUD** - HP bar, timer, kill count
10. **Polish** - Particles, screen shake, juice

Each step should be playable/testable before moving to the next.

## Code Style

### JavaScript Preferences
```javascript
// Use ES6+ but keep it simple
// Prefer 'const' and 'let' over 'var'
// Use arrow functions for callbacks, regular functions for methods
// No TypeScript (adds build complexity)

// GOOD: Clear, explicit, readable
function updateTrain(delta) {
    const engine = this.train[0];
    engine.rotation = Phaser.Math.Angle.RotateToAngle(
        engine.rotation,
        this.targetAngle,
        this.turnSpeed * delta
    );

    // Each car follows the one ahead of it
    for (let i = 1; i < this.train.length; i++) {
        const car = this.train[i];
        const leader = this.train[i - 1];
        car.followTarget(leader.x, leader.y, delta);
    }
}

// BAD: Clever, compact, but unreadable
const updateTrain = d => this.train.reduce((l,c,i) =>
    (i && c.followTarget(l.x,l.y,d), c.rotation = i ? c.rotation :
    Phaser.Math.Angle.RotateToAngle(c.rotation,this.targetAngle,this.turnSpeed*d), c));
```

### File Organization (If Multiple Files Needed)
```
tank-train/
├── index.html          # Main entry point, includes all scripts
├── js/
│   ├── game.js        # Phaser config and initialization
│   ├── train.js       # Train and car logic
│   ├── enemies.js     # Enemy types and spawning
│   ├── weapons.js     # Weapon systems per color
│   └── utils.js       # Helper functions
├── design-doc.md
├── ideas.md
├── agents.md
└── CLAUDE.md
```

### File Ownership Rules
- Each core system lives in its own file (example: merges belong in `src/core/merge.js`).
- Do not implement system logic in unrelated files; call into the owning module instead.
- Each file should represent one core idea; avoid cross-cutting logic across modules.
- Keep functions single-purpose and add intent-focused comments (favor "why" and sequencing) in core systems.

**Prefer single file** if total code stays under ~1500 lines.

## Physics Implementation Notes

### For Phaser 3 with Matter.js
```javascript
// Chain connection using distance constraints
const constraint = this.matter.add.constraint(
    carA.body,
    carB.body,
    60,  // Length between cars
    0.3  // Stiffness (0-1, lower = more springy)
);
```

### For Pure Canvas (No Phaser)
```javascript
// Simple follow behavior
car.x += (leader.x - car.x) * followSpeed * delta;
car.y += (leader.y - car.y) * followSpeed * delta;
car.rotation = Math.atan2(leader.y - car.y, leader.x - car.x);
```

## Merge Detection Algorithm

```javascript
// Reference implementation
function detectMerge(cars) {
    // Scan from engine toward tail
    for (let i = 0; i < cars.length - 1; i++) {
        const c1 = cars[i], c2 = cars[i+1];
        if (c1.color === c2.color && c1.tier === c2.tier) {
            return {
                indices: [i, i+1],
                color: c1.color,
                newTier: c1.tier + 1
            };
        }
    }
    return null;
}
```

## Color Constants

```javascript
const COLORS = {
    RED: {
        hex: '#ff4444',
        name: 'red',
        weapon: 'machinegun',
        fireRate: 8,      // shots per second
        damage: 5,
        range: 200
    },
    BLUE: {
        hex: '#4444ff',
        name: 'blue',
        weapon: 'cryo',
        fireRate: 2,
        damage: 8,
        range: 250,
        slowEffect: 0.4   // 40% slow
    },
    YELLOW: {
        hex: '#ffcc00',
        name: 'yellow',
        weapon: 'cannon',
        fireRate: 0.8,
        damage: 35,
        range: 300,
        armorPierce: 0.5  // 50% armor ignore
    }
};
```

## Testing Approach

No formal test framework. Instead:

1. **Visual testing**: Does it look right?
2. **Console logging**: Strategic `console.log()` for debugging
3. **Incremental builds**: Test each feature before adding the next
4. **Browser dev tools**: Use Phaser's debug features if available

## Common Pitfalls

### Phaser CDN Issues
```html
<!-- Use specific version, not latest -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
```

### Canvas Coordinate System
```javascript
// Canvas origin is top-left
// Y increases downward (opposite of math convention)
// Remember to translate/rotate around center of sprites
ctx.save();
ctx.translate(car.x, car.y);
ctx.rotate(car.rotation);
ctx.drawImage(sprite, -width/2, -height/2, width, height);
ctx.restore();
```

### Delta Time
```javascript
// Always use delta for movement
// Phaser provides delta in milliseconds, often need to divide by 1000
update(time, delta) {
    const dt = delta / 1000; // Convert to seconds
    this.engine.x += Math.cos(this.engine.rotation) * speed * dt;
}
```

## What Not To Do

- **Don't add npm/package.json**: Even if it seems convenient
- **Don't add TypeScript**: Adds build complexity
- **Don't add external asset files**: Keep everything procedural
- **Don't over-engineer**: This is a prototype, not production code
- **Don't add features beyond V1 scope**: Check `ideas.md` for what's deferred
- **Don't add monetization hooks**: Even "just in case"

## Questions To Ask Before Implementing

1. Is this in the V1 scope? (Check `design-doc.md`)
2. Does this add build complexity? (If yes, find another way)
3. Can this be simpler? (Probably yes)
4. Will this be fun? (The only question that really matters)

## Quick Reference: Game Values

```
Game:              Iron Spine
Run length:        100 waves campaign (20-30 min Normal, 40+ min Hard)
Endless goals:     Easy: 100 | Normal: 1,000 | Hard: 10,000 | Insane: 100,000
Difficulty tiers:  Easy, Normal, Hard, Insane (4 tiers)
  Easy:            -30% enemy HP, -25% damage, +30% pickups, +50% combo window, +20% player HP
  Normal:          Baseline balance
  Hard:            +40% enemy HP, +30% damage, -30% pickups, -25% combo window, -10% player HP
  Insane:          +80% enemy HP, +60% damage, -50% pickups, -50% combo window, -20% player HP
Engine HP:         55 (66 Easy, 55 Normal, 49.5 Hard, 44 Insane)
Car HP (Tier 1):   20
Car HP (Tier 2):   30
Car HP (Tier 3):   40
Max cars:          Unlimited (no cap)
Turn speed:        ~165°/second
Base move speed:   100 units/second
Boost:             +20% speed, 2 seconds, 5 second cooldown
Follow speed:      0.15 (lerp factor)
Physics:           Simple follow (NO Matter.js)
Connectors:        Spherical couplings (visual only)
Combo system:      2 second window (0.5-3 sec with difficulty), up to 3.0x damage at 20+ kills
Crit system:       Yellow 10% / 2.5x, Purple 7% / 2.2x, Base 5% / 2.0x
Weather:           5 types (Clear, Fog, Storm, Dust, Ash) with modifiers
Bosses:            Procedurally generated every 10 waves (5-10 with difficulty)
Achievements:      35+ achievements with gameplay bonuses, titles, 10 new in v1.5.0
Headlight Vacuum:  Pulls pickups (strength 200), repels enemies (strength 150) in light cone
Power Scaling:     Square root scaling: 1 + √(carCount) × 0.15 (100 cars = 2.5x damage)
```

## Debug Mode (Implemented)

- Toggle the dev console with **numpad decimal** (`NumpadDecimal`).
- Use the console to spawn pickups/enemies, force waves, toggle hitboxes/overlay, and win runs.
- Defaults live in `src/config.js` and are applied in `src/core/settings.js`.

## Performance Budget

- Target: 60 FPS on mid-range laptop
- Max entities: 100 (train + enemies + projectiles)
- Max particles: 200
- If FPS drops below 45: reduce particles first, then projectiles

## Working with AI Agents (Important for LLMs)

David works with multiple AI coding assistants. Here's what he expects:

### Code Comments
- **Heavy commenting expected**: This is for future LLMs, not just humans
- Focus on "why" and sequencing, not just "what"
- Explain intent, trade-offs, and rationale in core systems
- Document edge cases and assumptions

### Documentation Style
- **Mark completed work**: Use `[DONE]` tags in ideas.md
- **Scaffolding blocks**: Include `[SCAFFOLDING]` with implementation hints
- **Prioritize ruthlessly**: Organize ideas by priority (P1, P2, etc.)
- **Consolidate**: One ideas.md file, not scattered notes

### Feature Development
- **Modular design**: One file per system, clean imports
- **Procedural everything**: Push the limits of procedural generation
- **Cutting-edge concepts**: Modern game design (adaptive AI, emergent narrative, etc.)
- **Visual feedback**: Every mechanic needs clear visual communication

### Collaboration
- David uses both Claude (Sonnet) and Codex
- Leave clear context for next agent
- Don't delete work without asking (mark [DEPRECATED] instead)
- Update agents.md when completing major features

## When Stuck

1. Re-read `design-doc.md` - the answer is probably there
2. Simplify - cut features, don't add complexity to "fix" issues
3. Check `ideas.md` for scaffolding hints on similar systems
4. Ask David - he'd rather clarify than have wrong assumptions
