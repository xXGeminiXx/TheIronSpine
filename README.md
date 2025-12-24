# Iron Spine

A free, open-source browser game where you command a modular weapon train. Collect cars, merge matching pairs into powerful upgrades, and survive 20 waves of enemies.

## Play Now

**[https://xxgeminixx.github.io/TheIronSpine/](https://xxgeminixx.github.io/TheIronSpine/)**

Works on desktop and mobile. No downloads, no installs, no paywalls.

## Run Locally / Host Your Own

1. Clone or download this repository
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge)
3. If your browser blocks ES modules from `file://`, run a local server:
   ```bash
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`

**Want to host it yourself?** Go for it. Copy the files to any static web host (GitHub Pages, Netlify, your own server) and it just works. No build step required.

## What Is This?

Built in about 8 hours as a free alternative to a paywalled mobile game I used to enjoy. The graphics are procedurally generated (forgive the programmer art), but the gameplay is solid:

- **Collect** weapon cars (Red, Blue, Yellow)
- **Merge** adjacent same-color, same-tier cars into stronger versions
- **Survive** 20 waves of increasingly tough enemies
- **Win** by clearing all waves before your engine is destroyed

## Technical Details

- Browser-only (HTML5 Canvas)
- Phaser 3 via CDN (no npm, no bundlers, no build step)
- ES modules (Chrome/Firefox/Edge)
- Procedural graphics (no external assets)

## Controls

- **Move pointer**: Steer the engine toward cursor/touch position.
- **Click/tap**: Trigger a speed boost (2s duration, 5s cooldown).
- **Collect pickups**: Drive the engine into colored rectangles to add cars.
- **Spacebar**: Jettison the tail car (counts as lost). Hold to drop to the last car.
- **R**: Reorder cars (higher tiers toward the engine; group colors within tiers).
- **E**: Trigger Overdrive Pulse when the meter is full.
- **ESC / P**: Pause overlay (Resume / Settings / Quit).
- **Numpad .**: Toggle dev console (debug/mod menu). (Numpad decimal only, not the main period key.)

## What Is Implemented (MVP)

- Engine + weapon cars with simple follow physics
- Pointer-following steering with acceleration/deceleration
- Boost mechanic (tap to activate)
- Pickup spawning and collection
- Merge system: adjacent same-color, same-tier cars merge into 1 higher-tier car
- Skirmisher + Champion + Boss enemy types (milestone waves)
- Armored + Ranger enemy types (heavy tanks and ranged pressure)
- Auto-fire weapons (Red=rapid, Blue=slow, Yellow=cannon)
- Engine weapon that adapts to dominant car color and count
- Car reordering (R / SORT) sorts tiers toward the engine and groups colors
- Overdrive Pulse (screen-wide damage) on charge
- Wave-based enemy spawning with escalation and elite milestones
- Wave-clear win condition (default 20 waves)
- HUD: engine HP bar, car HP segments, timer, kill count, wave prompt, pulse meter
- Tutorial scene (How to Play)
- Achievements + stats tracker with gameplay bonuses
- Endless mode toggle (in Settings)
- Big-number formatting for high wave/kill counts
- Pause overlay (ESC/P) with Resume/Settings/Quit
- Drop protection (cooldown + hold-to-drop near last car)
- Menu + settings screen
- UI scale toggle (small/medium/large)
- Procedural audio + light VFX polish
- Dev console (spawn pickups/enemies, win run, toggle debug flags)
- End screen with run stats + settings shortcut

## Intentionally Deferred

- Music
- Meta-progression / unlocks
- Mobile-specific optimizations
- Leaderboards / save system

## Debug Options

Debug features can be toggled at runtime via the dev console (numpad `.`).
Defaults are set in `src/config.js` and applied in `src/core/settings.js`.

## Mobile Support

Works on phones and tablets! Just open the link and play.

- Touch anywhere to steer the train toward your finger
- Tap to boost (or use the BOOST button)
- On-screen buttons for BOOST, DROP, SORT, and PULSE appear automatically
- SORT button appears alongside other controls to reorder the chain
- Dev console is disabled on mobile (no keyboard needed)

## Versioning

- The HUD displays the current build tag (starting at `v1`) in the bottom-right so you can verify the deployed version.

## License & Contributions

- **MIT Licensed**: Free to use, modify, distribute, and commercialize.
- **Free updates**: No paid tiers, no gatekeeping.
- **PRs welcome**: Issues and pull requests are open and encouraged.

## Manual Test Plan (2 minutes)

1. **Start game**: Click/tap on menu. Verify game starts with engine + 1 car (plus any achievement bonus cars).
2. **Steering**: Move pointer around. Engine should follow smoothly.
3. **Boost**: Tap/click while moving. Train should speed up briefly.
4. **Collect pickups**: Steer into colored rectangles. Cars should attach to tail.
5. **Trigger merge**: Collect 2 same-color, same-tier cars adjacent. They should merge with flash + camera shake.
6. **Jettison + Protection**: Press Spacebar. Tail drops without explosion; dropping to last car requires a short hold.
7. **Reorder**: Press R (or SORT on mobile). Higher tiers should shift toward the engine and colors group.
8. **Overdrive**: Wait for pulse meter, press E. Enemies should take damage.
9. **Pause overlay**: Press ESC/P, resume, and verify the game continues.
10. **Combat**: Let enemies spawn and attack. Verify cars auto-fire and kill enemies.
11. **Armored/Ranger**: Survive until they spawn; confirm armored is slow/tanky and ranger fires from range.
12. **UI Scale + Endless**: Open settings, cycle UI scale, toggle Endless Mode, start a run and verify the wave HUD shows no total.
13. **Tutorial**: From menu, open How to Play and page through tips.
14. **Audio/VFX**: Confirm engine hum, merge sound, pulse sound, smoke and particle bursts.
15. **Take damage**: Let an enemy hit your train. Verify engine HP bar decreases.
16. **Waves**: Clear waves until a champion/boss appears. Verify elites spawn after skirmishers.
17. **Stats/Achievements**: End a run and confirm stats + unlock popups appear.
18. **Restart**: Die or win, then tap to restart. Verify stats reset and game restarts cleanly.

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
│   │   ├── reorder.js   # Car reordering logic
│   │   ├── verylargenumbers.js # Big-number formatting/scaling
│   │   ├── math.js      # Utility math functions
│   │   ├── debug.js     # Debug logging
│   │   └── settings.js  # Runtime settings toggles
│   ├── systems/
│   │   ├── combat.js       # Enemies + projectiles
│   │   ├── spawner.js      # Wave spawning
│   │   ├── hud.js          # UI overlay
│   │   ├── input.js        # Keyboard/mouse input
│   │   ├── mobile-controls.js # Touch buttons
│   │   ├── pause-overlay.js # Pause menu overlay
│   │   ├── drop-protection.js # Drop cooldown/hold protection
│   │   ├── endless-mode.js # Infinite wave logic
│   │   ├── achievements.js # Persistent achievements + bonuses
│   │   ├── stats-tracker.js # Run history + totals
│   │   ├── dev-console.js  # Debug/mod menu
│   │   ├── audio.js        # Procedural SFX
│   │   └── vfx.js          # Particle effects
│   └── scenes/
│       ├── menu-scene.js
│       ├── tutorial-scene.js
│       ├── settings-scene.js
│       ├── game-scene.js
│       └── end-scene.js
├── design-doc.md        # Full design specification
├── agents.md            # AI assistant context
├── ideas.md             # Future ideas (parking lot)
├── CLAUDE.md            # Project constraints
└── README.md            # This file
```
