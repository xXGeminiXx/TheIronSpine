# Next Steps

Timestamp (UTC): 2025-12-24T20:53:34Z

## Audit Checklist (Initial Missing List)
- [x] `merge.js` (MergeManager lives in `src/core/merge.js`)
- [x] Weapons system (auto-fire + stats in `src/systems/combat.js`)
- [x] Enemy definitions (config + combat integration)
- [x] Projectiles system (spawn, travel, hit detection)
- [x] Overdrive/pulse system (charge + activation + HUD)
- [x] Merge telegraph/flash animation
- [x] Engine weapon logic (dominant color scaling)
- [x] Car-death AoE damage
- [x] Enemy targeting logic (nearest in range/front)
- [x] GameScene orchestration glue (merges/spawns/firing loop)
- [x] EndScene stats aggregation
- [x] MenuScene state handoff (start/settings)
- [x] Audio system (Web Audio / procedural SFX)
- [x] Effects/particles polish (trails, smoke, merge particles)
- [x] Camera controller (look-ahead + zoom)
- [x] HUD glue (HP, wave callouts, pulse meter)
- [x] Build tag/version constant
- [x] Single source of run state (GameScene orchestrator)
- [x] Input abstraction layer (`src/systems/input.js`)

## Checklist
- [x] Replace extraction win with wave-clear progression (champion every 5th, boss every 10th).
- [x] Switch merges to 2048-style adjacent pair merges with no tier cap.
- [x] Add settings screen (screen shake, grid, debug overlay).
- [x] Add dev console/mod menu (numpad decimal toggle).
- [x] Mark engine silhouette complete (cartoon locomotive silhouette).
- [x] Improve render scaling/AA for higher clarity on movement.
- [x] Tighten camera framing (zoom in early, zoom out with length).
- [x] Boost pickup readability and reduce bullet dominance.
- [x] Add micro weapon feedback (muzzle flash + enemy hit flash).
- [x] Slow early pickup cadence to soften early merge spikes.
- [x] Scale spawn padding with train length to reduce dead space.
- [x] Minor car silhouette polish (small shape cues only).
- [x] Decide + document car reordering mechanic (sort tiers toward engine, group colors).
- [x] Add Armored + Ranger enemies.
- [x] Add UI scale toggle (small/medium/large).
- [x] Add audio + light VFX polish.
- [x] Balance wave scaling, pickups, and tier growth.

## Current Checklist (v1.2.1 Execution)
- [x] Reorder cars: highest tiers to tail, grouped by color within tier.
- [x] Wire pause overlay into GameScene (ESC/P, resume/quit/settings).
- [x] Wire drop protection into tail jettison (cooldowns + hold-to-drop UI).
- [x] Apply achievement bonuses to train/combat/overdrive; track pulse hits.
- [x] Integrate endless mode into spawner/HUD/menu/settings.
- [x] Use big-number formatting for HUD/menu/end stats.
- [x] Ease early-game difficulty (enemy counts, elite timing, pickup cadence).
- [x] Update docs + rules (README, design-doc, CLAUDE/agents, changelog).
- [x] Run document mapper and refresh map.md.
- [x] Prep commit (exclude document_mapper.py).

## Current State (Brief)
- Wave-based run loop with champions/bosses, pair-merge system, and auto-fire combat.
- Menu + settings + end screen, HUD shows wave status.
- Higher-resolution rendering with smoothing; camera zoom scales with train length.
- Pickups have clearer glow/outline; weapon hits flash; muzzle flashes added.
- Dev console available on numpad decimal for spawn/debug shortcuts (hidden on touch devices).
- Touch controls provide Boost/Drop/Sort/Pulse buttons + tap-to-boost on mobile.
- Spawn padding scales with train length to keep composition readable.
- Armored + Ranger enemies are live; ranger uses ranged shots.
- UI scale toggle (small/medium/large) added to settings.
- Procedural audio + particle effects added (engine rumble, merge bursts, smoke).
