# Iron Spine Prototype

## How to Run

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge).
2. If your browser blocks ES module imports from `file://`, run a local server:
   ```bash
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## Requirements & Constraints

- Browser-only (HTML5 + Canvas).
- Phaser 3 via CDN (no npm, no bundlers, no build step).
- ES module support required (Chrome/Firefox/Edge).
- Procedural graphics only (no external art/assets).

## Controls

- **Move pointer**: Steer the engine toward cursor/touch position.
- **Click/tap**: Trigger a speed boost (2s duration, 5s cooldown).
- **Collect pickups**: Drive the engine into colored rectangles to add cars.
- **Spacebar**: Jettison the tail car (counts as lost).
- **E**: Trigger Overdrive Pulse when the meter is full.
- **Numpad .**: Toggle dev console (debug/mod menu). (Numpad decimal only, not the main period key.)

## What Is Implemented (MVP)

- Engine + weapon cars with simple follow physics
- Pointer-following steering with acceleration/deceleration
- Boost mechanic (tap to activate)
- Pickup spawning and collection
- Merge system: adjacent same-color, same-tier cars merge into 1 higher-tier car
- Skirmisher + Champion + Boss enemy types (milestone waves)
- Auto-fire weapons (Red=rapid, Blue=slow, Yellow=cannon)
- Engine weapon that adapts to dominant car color and count
- Overdrive Pulse (screen-wide damage) on charge
- Wave-based enemy spawning with escalation and elite milestones
- Wave-clear win condition (default 20 waves)
- HUD: engine HP bar, car HP segments, timer, kill count, wave prompt, pulse meter
- Menu + settings screen
- Dev console (spawn pickups/enemies, win run, toggle debug flags)
- End screen with run stats + settings shortcut

## Intentionally Deferred

- Additional enemy types (Armored, Ranger)
- Car reordering mechanic
- Sound/music
- Particles and visual polish
- Meta-progression / unlocks
- Mobile-specific optimizations
- Leaderboards / save system

## Debug Options

Debug features can be toggled at runtime via the dev console (numpad `.`).
Defaults are set in `src/config.js` and applied in `src/core/settings.js`.

## Mobile Support

- Touch input works out of the box; tap anywhere to steer and boost.
- On-screen buttons appear in the bottom-left for Drop and Pulse.
- The dev console is automatically disabled on touch-first devices.

## License & Contributions

- **MIT Licensed**: Free to use, modify, distribute, and commercialize.
- **Free updates**: No paid tiers, no gatekeeping.
- **PRs welcome**: Issues and pull requests are open and encouraged.

## Manual Test Plan (2 minutes)

1. **Start game**: Click/tap on menu. Verify game starts with engine + 1 car.
2. **Steering**: Move pointer around. Engine should follow smoothly.
3. **Boost**: Tap/click while moving. Train should speed up briefly.
4. **Collect pickups**: Steer into colored rectangles. Cars should attach to tail.
5. **Trigger merge**: Collect 2 same-color, same-tier cars adjacent. They should merge with flash + camera shake.
6. **Jettison**: Press Spacebar. Tail car should drop without explosion.
7. **Overdrive**: Wait for pulse meter, press E. Enemies should take damage.
8. **Combat**: Let enemies spawn and attack. Verify cars auto-fire and kill enemies.
9. **Take damage**: Let an enemy hit your train. Verify engine HP bar decreases.
10. **Waves**: Clear waves until a champion/boss appears. Verify elites spawn after skirmishers.
11. **Settings**: Return to menu, toggle screen shake/grid, and confirm they apply on a new run.
12. **Restart**: Die or win, then tap to restart. Verify stats reset and game restarts cleanly.

## File Structure

```
tank-train/
├── LICENSE              # MIT license
├── .gitignore
├── index.html           # Entry point
├── src/
│   ├── main.js          # Phaser config
│   ├── config.js        # All game constants
│   ├── core/
│   │   ├── train.js     # Train + car logic
│   │   ├── pickups.js   # Pickup spawning/collection
│   │   ├── merge.js     # Merge detection + animation
│   │   ├── math.js      # Utility math functions
│   │   ├── debug.js     # Debug logging
│   │   └── settings.js  # Runtime settings toggles
│   ├── systems/
│   │   ├── combat.js    # Enemies + projectiles
│   │   ├── spawner.js   # Wave spawning
│   │   ├── hud.js       # UI overlay
│   │   ├── dev-console.js # Debug/mod menu
│   │   └── input.js     # Input handling
│   └── scenes/
│       ├── menu-scene.js
│       ├── settings-scene.js
│       ├── game-scene.js
│       └── end-scene.js
├── design-doc.md        # Full design specification
├── agents.md            # AI assistant context
├── ideas.md             # Future ideas (parking lot)
├── CLAUDE.md            # Project constraints
└── README.md            # This file
```
