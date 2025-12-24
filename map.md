# Project Structure

This document provides a visual representation of the project directory structure.
It was automatically generated using the document_mapper.py utility.

## Directory Tree

```
📁 Root
    📁 agents.md
    │   └── 📝 agents.md (9.2KB)
    📁 CHANGELOG.md
    │   └── 📝 CHANGELOG.md (5.0KB)
    📁 CLAUDE.md
    │   └── 📝 CLAUDE.md (10.2KB)
    📁 design-doc.md
    │   └── 📝 design-doc.md (29.7KB)
    📁 ideas.md
    │   └── 📝 ideas.md (8.2KB)
    📁 index.html
    │   └── 🌐 index.html (1.8KB)
    📁 LICENSE
    │   └── 📄 LICENSE (1.0KB)
    📁 map.md
    │   └── 📝 map.md (8.7KB)
    📁 next-steps.md
    │   └── 📝 next-steps.md (3.5KB)
    📁 README.md
    │   └── 📝 README.md (8.0KB)
    📁 run.bat
    │   └── ⚡ run.bat (0.1KB)
    📁 src
        📁 config.js
        │   └── 📜 config.js (15.0KB)
        📁 core
        │   📁 debug.js
        │   │   └── 📜 debug.js (0.5KB)
        │   📁 math.js
        │   │   └── 📜 math.js (1.1KB)
        │   📁 merge.js
        │   │   └── 📜 merge.js (6.8KB)
        │   📁 pickups.js
        │   │   └── 📜 pickups.js (3.3KB)
        │   📁 reorder.js
        │   │   └── 📜 reorder.js (4.6KB)
        │   📁 settings.js
        │   │   └── 📜 settings.js (1.1KB)
        │   📁 train.js
        │   │   └── 📜 train.js (23.4KB)
        │   📁 verylargenumbers.js
        │       └── 📜 verylargenumbers.js (21.1KB)
        📁 main.js
        │   └── 📜 main.js (2.2KB)
        📁 scenes
        │   📁 end-scene.js
        │   │   └── 📜 end-scene.js (13.0KB)
        │   📁 game-scene.js
        │   │   └── 📜 game-scene.js (20.8KB)
        │   📁 menu-scene.js
        │   │   └── 📜 menu-scene.js (9.3KB)
        │   📁 settings-scene.js
        │   │   └── 📜 settings-scene.js (4.9KB)
        │   📁 tutorial-scene.js
        │       └── 📜 tutorial-scene.js (22.9KB)
        📁 systems
            📁 achievements.js
            │   └── 📜 achievements.js (28.8KB)
            📁 audio.js
            │   └── 📜 audio.js (6.3KB)
            📁 combat.js
            │   └── 📜 combat.js (24.3KB)
            📁 dev-console.js
            │   └── 📜 dev-console.js (8.0KB)
            📁 drop-protection.js
            │   └── 📜 drop-protection.js (13.4KB)
            📁 endless-mode.js
            │   └── 📜 endless-mode.js (14.4KB)
            📁 hud.js
            │   └── 📜 hud.js (13.2KB)
            📁 input.js
            │   └── 📜 input.js (4.6KB)
            📁 mobile-controls.js
            │   └── 📜 mobile-controls.js (4.9KB)
            📁 pause-overlay.js
            │   └── 📜 pause-overlay.js (13.2KB)
            📁 spawner.js
            │   └── 📜 spawner.js (13.5KB)
            📁 stats-tracker.js
            │   └── 📜 stats-tracker.js (13.1KB)
            📁 vfx.js
                └── 📜 vfx.js (5.7KB)
```

## File Statistics

| Category | Count |
|----------|--------|
| Total Files | 39 |
| Total Directories | 5 |
| Total Size | 0.39MB |
| Maximum Depth | 3 |

### File Types

- 📄 no extension: 1 files
- ⚡ .bat: 1 files
- 🌐 .html: 1 files
- 📜 .js: 28 files
- 📝 .md: 8 files

### File Summaries

| File | Summary |
|------|---------|
| `CHANGELOG.md` | All notable changes to Iron Spine will be documented in this file. |
| `CLAUDE.md` | Project-specific instructions for Claude Code. These override defaults when working in this directory. |
| `README.md` | A free, open-source browser game where you command a modular weapon train. Collect cars, merge matching pairs into powerful upgrades, and survive 2... |
| `agents.md` | This document provides context for AI coding assistants working on Iron Spine. Read this first to understand the project's philosophy, constraints,... |
| `design-doc.md` | --- |
| `ideas.md` | This file is a scratchpad for loose ideas. Nothing here is a commitment or in scope. Use it to offload thoughts so `design-doc.md` stays small and ... |
| `map.md` | Binary file (text/markdown) |
| `next-steps.md` | Timestamp (UTC): 2025-12-24T20:53:34Z |
| `src/config.js` | * config.js - Central configuration for Iron Spine * * All game balance values, visual constants, and tuning parameters live here. * This makes it ... |
| `src/core/debug.js` | eslint-disable-next-line no-console |
| `src/core/merge.js` | Merge pacing keeps the sequence readable without stalling movement. |
| `src/core/pickups.js` | Stronger outline so pickups read against the ground pattern. |
| `src/core/reorder.js` | * reorder.js - Car reordering logic * * Reordering is a tactical sort that pushes higher tiers toward the engine * and groups same-color cars withi... |
| `src/core/train.js` | * train.js - Train entity and car management * * The Train class represents the player's vehicle: a locomotive engine * followed by a chain of weap... |
| `src/core/verylargenumbers.js` | * verylargenumbers.js - Infinite Number Scaling System * * Handles absurdly large numbers for endless mode gameplay. When players * survive for hou... |
| `src/main.js` | * main.js - Entry point for Iron Spine * * This file initializes the Phaser 3 game instance with all scene configurations. * The game uses ES modul... |
| `src/scenes/end-scene.js` | * end-scene.js - Run Results Screen * * Displayed after a run ends (victory or defeat). Shows: * - Run statistics (time, waves, kills, merges, etc.... |
| `src/scenes/game-scene.js` | * game-scene.js - Main gameplay scene * * This is where the action happens. GameScene orchestrates all gameplay * systems: train movement, combat, ... |
| `src/scenes/menu-scene.js` | * menu-scene.js - Main Menu Screen * * The first screen players see. Provides access to: * - START: Begin a new game run * - HOW TO PLAY: Interacti... |
| `src/scenes/settings-scene.js` | * settings-scene.js - Game settings menu * * Allows players to toggle visual effects and accessibility options. * Settings persist only for the cur... |
| `src/scenes/tutorial-scene.js` | * tutorial-scene.js - Interactive How-to-Play Guide * * A multi-page tutorial that teaches players the core mechanics of Iron Spine. * Accessible f... |
| `src/systems/achievements.js` | * achievements.js - Deep Achievement System with Rewards * * A comprehensive achievement system that: * - Tracks player accomplishments across mult... |
| `src/systems/audio.js` | * audio.js - Procedural audio system * * Uses the Web Audio API to synthesize lightweight SFX and a looping engine tone. * No external assets or bu... |
| `src/systems/combat.js` | Orbit uses a tangential push plus a gentle radial correction. |
| `src/systems/dev-console.js` | Only open with the numpad decimal key to avoid the main period key. |
| `src/systems/drop-protection.js` | * drop-protection.js - Accidental Car Drop Prevention System * * Prevents players from accidentally losing all their cars by implementing: * - Cool... |
| `src/systems/endless-mode.js` | * endless-mode.js - Infinite Gameplay System * * Transforms Iron Spine from a 20-wave game into an infinite experience. * Players can choose betwee... |
| `src/systems/hud.js` | Large left margin to prevent clipping on devices with notches/safe areas |
| `src/systems/input.js` | * InputController - Handles all player input for the game. * * IMPORTANT: The steering target (targetX, targetY) is derived from the pointer's * SC... |
| `src/systems/mobile-controls.js` | * MobileControls - On-screen touch buttons for mobile devices. * * Displays BOOST, DROP, SORT, and PULSE buttons in the bottom-left corner. * All b... |
| `src/systems/pause-overlay.js` | * pause-overlay.js - Pause Menu Overlay System * * A self-contained pause system that can be plugged into any Phaser scene. * Provides pause/resume... |
| `src/systems/spawner.js` | Wave phases: waiting -> skirmish -> elite (optional) -> waiting. |
| `src/systems/stats-tracker.js` | * stats-tracker.js - Persistent Statistics Tracking System * * Tracks player performance across multiple runs and persists to localStorage. * Provi... |
| `src/systems/vfx.js` | * vfx.js - Lightweight visual effects and particle handling. * * Keeps effects centralized so core gameplay files stay focused. * All particles are... |

*Generated on 2025-12-24 14:59:06*

*This tree visualization excludes hidden files, common build directories, and system files.*