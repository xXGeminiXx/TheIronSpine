# Iron Spine - Ideas Parking Lot

This is the consolidated ideas file for AI agents and contributors. Nothing here is a commitment.

**FOR AI AGENTS**: Look for `[SCAFFOLDING]` blocks for implementation hints. Items marked `[DONE]` are already implemented.

---

## Hard Rules (Never Violate)

1. **Merge rule is fixed**: Exactly 2 adjacent same-color, same-tier cars merge into 1. No exceptions.
2. **Color clarity beats cleverness**: If a color's role can't be explained in one sentence, it's too complex.
3. **Readable chaos is non-negotiable**: At peak action, players must understand their train, threats, and pickups.
4. **It's a train, not a snake**: Industrial, mechanical, armored. Spherical couplings, not biological joints.
5. **Anti-paywall philosophy**: No energy systems, forced ads, timers, or premium currency. Ever.
6. **No build tools**: No npm, no webpack, no bundlers. CDN only. Double-click-to-play.
7. **Procedural graphics only**: No external asset files. Everything is canvas/Phaser primitives.

---

## COMPLETED IN v1.3.0

### [DONE] Unique Projectile Visuals Per Color
- Red: Thin tracer darts with streak trails
- Blue: Pulsing frost orbs with ice accents
- Yellow: Heavy armor-piercing bolts with spark trails
- Location: `src/art/projectile-visuals.js`

### [DONE] Parallax World System
- 3-layer scrolling background with mountains, debris, wrecks, warning signs
- Location: `src/art/world-gen.js`

### [DONE] Camera Zoom Fix
- Reduced base zoom (0.85 vs 1.12) so train doesn't dominate large screens
- Dynamic zoom based on train length already exists
- Location: `src/config.js` CAMERA settings

### [DONE] Tutorial Revamp
- 7 pages, punchier text, accurate values
- Location: `src/scenes/tutorial-scene.js`

### [DONE] HUD Improvements (Codex v1.3.0)
- Spine readout with tier pips per car
- Merge candidate highlighting (pulsing border on adjacent same-color/tier)
- Damage direction pings (edge arrows showing where damage came from)
- Optional range arcs toggle (Settings -> Range Arcs)
- Location: `src/systems/hud.js`, `src/scenes/game-scene.js`, `src/scenes/settings-scene.js`, `src/core/settings.js`

### [DONE] Pickup Caravans
- Groups of 3-5 pickups that spawn together
- Location: `src/systems/spawner.js`

### [DONE] Enemy Formation Waves
- Skirmisher squads spawn as wedge/column/line/pincer formations
- Formation label appended to wave HUD
- Location: `src/systems/spawner.js`, `src/systems/hud.js`

---

## PRIORITY 1: Visual Identity (High Impact)

### [DONE] Car Damage States
**Problem**: Cars look the same at full HP and 1 HP.

**Solution**: Progressive visual damage.
| HP Range | Visual State |
|----------|--------------|
| 100-75% | Clean |
| 75-50% | Scratches appear |
| 50-25% | Cracks + occasional sparks |
| 25-0% | Heavy damage + smoke emission |

Location: `src/core/train.js`, `src/systems/vfx.js`, `src/scenes/game-scene.js`

### [DONE] Armor Plate Language Per Tier
Make tiers look distinct instantly.
- Tier 1: Flat plates, few rivets
- Tier 2: Layered plating, bevels
- Tier 3: Reinforced edges, hazard stripes
- Tier 4+: Insignia marks, glowing seams

Location: `src/core/train.js`

### [DONE] Engine Accent Glow
Engine accent parts pulse with current weapon color.

Location: `src/core/train.js`

### [DONE] Directional Muzzle Systems
Each car gets visible turret/barrel that recoils on fire.

Location: `src/core/train.js`, `src/scenes/game-scene.js`

### [DONE] Heat Vent Glow
Vents glow and exhaust pulses scale with sustained firing.

Location: `src/core/train.js`, `src/systems/combat.js`, `src/systems/vfx.js`

---

## PRIORITY 2: Combat Fairness

### [DONE] Attack Telegraphs
**Implementation**: Full telegraph system with enemy-specific visuals (v1.4.0)

**Features**:
- Ranger: Red laser line toward target (400ms)
- Champion: Charging glow with speed indicator (600ms)
- Boss: Ground warning circle (800ms)
- Armored: Plating glow with charge line (600ms)

Location: `src/systems/telegraph.js`

### [DONE] Threat Indicators
**Implementation**: Off-screen enemy awareness system (v1.4.0)

**Features**:
- Edge-of-screen arrows pointing to off-screen enemies
- Color-coded by threat level
- Priority system (max 8 indicators)
- Pulse animation for visibility

Location: `src/systems/threat-indicator.js`

---

## PRIORITY 3: Procedural Showcase

### [DONE] Procedural Boss Factory
**Implementation**: Fully procedural boss generation system (v1.4.0)

**Features**:
- Modular boss anatomy (4 body types, variable weapon mounts)
- Procedural weak points (2x damage)
- Behavior state machine (TELEGRAPH -> EXECUTE -> RECOVER)
- 4 behavior patterns: CHARGE, SWEEP, BURST, SUMMON
- Difficulty scaling per wave
- Unique visuals for each generated boss

Location: `src/systems/boss-gen.js`

### [DONE] Weather/Biome System
**Implementation**: Procedural weather with gameplay modifiers (v1.4.0)

**Weather Types**:
- Clear: Normal conditions
- Fog: Haze overlay, -20% enemy detection
- Storm: Rain + lightning strikes (area damage)
- Dust: Brown fog, reduced pickup visibility
- Ash: Dark particles, ominous atmosphere

**Features**:
- Weather cycles every 60-90 seconds
- Procedural particles (rain, fog, dust, ash)
- Lightning strikes during storms (25 damage, 60 radius)
- Gameplay modifiers exported for spawn/combat systems

Location: `src/systems/weather.js`

### Cinematic Boss Arrival
- Screen desaturates
- Searchlights sweep
- Boss silhouette forms from scan lines before filling in

---

## PRIORITY 4: Incremental/Meta Systems

### Prestige System
After runs, earn "Scrap" for permanent upgrades.

**Categories**: Starting Loadout, Train Power, Durability, Luck

[SCAFFOLDING]
```
Location: New src/systems/prestige.js
Data: { scrap: 0, upgrades: { startingCars, damageBonus, hpBonus, luckBonus } }
Scrap formula: wavesCleared * 10 + kills * 0.5 + merges * 5
Store in localStorage alongside stats.
```

### Challenge Modes
| Mode | Modification | Reward |
|------|--------------|--------|
| Speed Run | 10 waves, 2x spawn | Time bonus |
| Purist | No pickups after wave 5 | 2x scrap |
| Glass Cannon | 1 HP everything, 3x damage | Achievement |
| Color Lock | Only one color spawns | Achievement |

### Seeded Runs
- Display seed on HUD and end screen
- URL parameter: `?seed=ABCD1234`
- Daily seed same for everyone

[SCAFFOLDING]
```
Location: New src/core/seeded-random.js
Create SeededRandom class with next(), nextInt(min, max), shuffle().
Replace Math.random() in spawner.js, world-gen.js, boss-gen.js.
```

---

## PRIORITY 5: Combat Depth

### [DONE] Combo System
**Implementation**: Kill chain system with multipliers (v1.4.0)

**Features**:
- 2 second combo window
- 5 multiplier tiers (1.0x -> 1.2x -> 1.5x -> 2.0x -> 3.0x)
- Vocal callouts: ROLLING, UNSTOPPABLE, LEGENDARY, IRON SPINE
- Visual feedback and HUD integration
- Stats tracking (highest combo)

Location: `src/systems/combo.js`

### [DONE] Critical Hits
**Implementation**: Chance-based critical hit system (v1.4.0)

**Features**:
- Base: 5% chance, 2.0x damage
- Yellow: 10% chance, 2.5x multiplier (precision theme)
- Purple: 7% chance, 2.2x multiplier
- Visual effects: bright flash, impact ring, floating damage text
- Per-color crit tracking

Location: `src/systems/critical-hits.js`

---

## PRIORITY 6: Interactive World

### Station Events
Gate with 3 lanes, player steers through one for buff.
| Lane | Buff | Duration |
|------|------|----------|
| Left | Fire Rate +30% | 20s |
| Center | Repair 25% HP | Instant |
| Right | Speed +25% | 20s |

### Rail Signal System (World Telemetry)
Signals appear ahead indicating upcoming events.
- Green: Normal
- Yellow: High spawn intensity
- Red: Elite wave
- Blue: Station event

### Bridge/Tunnel Moments
- Tunnel: Contrast increases, audio muffles
- Bridge: Wind particles, wider view

---

## PRIORITY 7: Train Feel

### Coupling Tension Visualization
Couplings stretch under tight turns. High tension = stress lines + sparks.

[SCAFFOLDING]
```
Compute tension from angle delta + distance drift.
Render coupling with stress overlay.
If tension > threshold for Y seconds, reduce turn rate briefly.
```

### Coupling Mode Pickup (Rigid vs Flexible)
Rare pickup toggles mode for 8s:
- Flexible: Tighter turns, more wobble
- Rigid: Faster speed, worse turning

### [DONE] Unified Ground Shadow
Single soft shadow under whole train, broken at couplings.

Location: `src/core/train.js`

### [DONE] Headlight Scan Cone
Engine casts subtle cone light sweeping with pointer direction.

Location: `src/core/train.js`

---

## PRIORITY 8: Enemy Ideas

### Rail Spike Enemy
Drops spike strip ahead. If engine crosses, couplings lock rigid for 1.5s.

### [DONE] Harpooner Enemy
Fires tether at mid-car, drags it sideways until destroyed.

Location: `src/systems/combat.js`, `src/systems/spawner.js`, `src/config.js`

### [DONE] Clamp Mine Layer
Drops mines that latch onto cars, apply turn penalty + countdown ring.

Location: `src/systems/combat.js`, `src/systems/spawner.js`, `src/config.js`, `src/core/train.js`

### The Decoupler (Sniper)
Targets couplings. Hit severs connection, car drifts away (can recollect).

### The Locomotive (Boss)
Enemy train with its own cars. Mirror match, ramming steals cars.

---

## PRIORITY 9: Polish & Juice

### Dynamic Music
Layers: base drum, bass (combat), melody (high intensity), danger (low HP).

[FUTURE] Requires Web Audio API synthesis or procedural audio generation

### [DONE] Screen Effects
**Implementation**: Dynamic screen effects system (v1.4.0)

**Features**:
- Low HP: Red vignette pulse (intensity scales with damage)
- High Combo: Gold edge glow (scales with multiplier)
- Boss Spawn: Color desaturation effect
- Victory: White flash fade
- Damage Taken: Screen flash

Location: `src/systems/screen-effects.js`

### War Report End Screen
Military after-action sheet: kills by color, highest tier, tension time, choices.

### Procedural Emblems
Generate regiment emblem per run on engine plate.

---

## PRIORITY 10: Modern Game Design (Cutting Edge)

### Ghost Train Replay System
**Concept**: Lightweight async competition without servers.

**Mechanics**:
- Record position trail every 100ms (60-120 points per run)
- Store as compressed array in localStorage
- Display ghost outline of previous best run
- Compare times at wave milestones

[SCAFFOLDING]
```
Location: New src/systems/ghost.js
Data: { positions: [{x,y,t}], seed, score, date }
Render: Dotted line or faded train sprite following recorded path
Storage: ~5KB per ghost in localStorage
Enable toggle in settings for performance
```

**Why it works**: Players compete against themselves, creates "one more try" loop.

---

### Adaptive Difficulty via Play Style Detection
**Concept**: Game learns if you're aggressive vs defensive and adjusts spawns.

**Detection Metrics**:
- Avg distance from center (kiting vs brawling)
- Boost usage frequency
- Car count preference (glass cannon vs tank)
- Pickup collection ratio

**Adaptations**:
- Aggressive players: More swarms, fewer champions
- Defensive players: More flankers, fewer direct charges
- Speedrunners: Bonus scrap for faster clears

[SCAFFOLDING]
```
Location: New src/systems/adaptive-ai.js
Track metrics in rolling window (last 10 waves)
Calculate playstyle score: aggression, mobility, efficiency
Modify spawner weights based on detected style
Store profile in localStorage for cross-run adaptation
```

**Why it works**: Emergent difficulty without explicit settings, respects player expression.

---

### Procedural Weapon Sound Design
**Concept**: Each weapon tier has unique synthesized audio.

**Parameters per Color/Tier**:
- Red T1: Short sharp crack (200Hz, 20ms)
- Red T2: Deeper thump (150Hz, 30ms)
- Red T3: Heavy BRRRT (120Hz, 50ms burst)
- Blue: Ice crack harmonics (high freq noise + low boom)
- Yellow: Metallic clang (sine + noise burst)

[SCAFFOLDING]
```
Location: Extend src/systems/audio.js
Use Web Audio API OscillatorNode + GainNode
Create sound profiles in config: { freq, duration, attack, decay, noise }
Generate AudioBuffer on demand, cache in Map
Play via AudioBufferSourceNode with randomized pitch variation
```

**Why it works**: No audio files needed, infinite variety, scales with progression.

---

### Tension-Based Damage Multiplier (Risk/Reward)
**Concept**: Tight turns increase coupling tension, which boosts damage temporarily.

**Mechanics**:
- High tension (sharp turns): +25% damage for 1s after
- Visual: Couplings glow orange at high tension
- Risk: Sustained high tension reduces max HP temporarily
- Skill expression: Weave aggressively for burst windows

[SCAFFOLDING]
```
Location: src/core/train.js + src/systems/combat.js
Calculate tension from angle deltas between segments
Store tension multiplier in train state
Apply multiplier in projectile damage calculation
Add coupling glow effect in render when tension > threshold
```

**Why it works**: Converts movement into combat mechanic, high skill ceiling.

---

### Dynamic Camera Effects (Cinematic Polish)
**Concept**: Camera responds to gameplay intensity.

| Event | Camera Effect |
|-------|--------------|
| Merge | Brief zoom in, hold, zoom out |
| Boss spawn | Slow zoom out revealing boss |
| Near death | Subtle chromatic aberration |
| Overdrive pulse | Fish-eye distortion burst |
| Victory | Dolly zoom (background moves, train stays) |

[SCAFFOLDING]
```
Location: New src/systems/camera-director.js
Use Phaser camera effects: zoom, shake, fade
Chromatic aberration: Render world 3 times with RGB offsets
Fish-eye: Apply radial displacement shader (if WebGL available)
Queue effects, don't overlap, blend smoothly
```

**Why it works**: AAA-feeling moments with no assets, pure code.

---

### Particle Debris from Hits
**Concept**: Every hit spawns contextual debris.

| Hit Type | Debris |
|----------|--------|
| Enemy destroyed | Metal shards in enemy color |
| Car damaged | Sparks + smoke puff |
| Boss phase change | Armor plates fall off |
| Critical hit | Larger burst + ring wave |

[SCAFFOLDING]
```
Location: Extend src/systems/vfx.js
Create debris particle pool (max 200)
On hit events, spawn 3-8 particles at impact point
Particles: rectangles with rotation, gravity, fade
Vary size/color based on damage and target type
Recycle particles after 1-2s lifespan
```

**Why it works**: Readable feedback, visceral impact, cheap to render.

---

### Train Heat State System
**Concept**: Sustained firing heats up cars, changes behavior.

**Mechanics**:
- Each car accumulates heat from firing
- At max heat: Weapon jams for 1s, then cooldown begins
- Red cars heat faster but hit harder
- Blue cars never overheat (cool themselves)
- Yellow cars have longest cooldown

**Visuals**: Heat glow overlay, steam vents at high temp

[SCAFFOLDING]
```
Location: src/systems/combat.js
Add car.heat (0-100) and car.coolingRate
Increment heat on fire, decrement in update()
At 100, disable weapon temporarily
Render heat as orange-to-red gradient overlay on car
Add steam particle emitter at 80+ heat
```

**Why it works**: Adds rhythm to combat, color differentiation deepens.

---

### Combo-Specific Vocal Callouts
**Concept**: Synthesized voice announces combo milestones.

**Callouts**:
- 5 combo: "ROLLING"
- 10 combo: "UNSTOPPABLE"
- 15 combo: "LEGENDARY"
- 20+ combo: "IRON SPINE"

[SCAFFOLDING]
```
Use Web Speech API (if available) or procedural beeps
speechSynthesis.speak(new SpeechSynthesisUtterance(text))
Fallback: Distinctive multi-tone chime per milestone
Volume scales with combo to avoid spam
```

**Why it works**: Hype moments, accessibility (audio cue), no files needed.

---

### Emergent Narrative through Event Logs
**Concept**: Build a story from what happened during the run.

**After each run, generate text like**:
> "Wave 7: A champion breached your formation, destroying your Tier 2 Blue car. You retaliated with an Overdrive Pulse."
> "Wave 14: You collected 4 Yellow cars in rapid succession, creating a T3 armor-buster that turned the tide."

[SCAFFOLDING]
```
Location: New src/systems/story-logger.js
Record significant events: merges, deaths, pulses, bosses
Store as array of { wave, type, details }
At end, convert to natural language via template system
Display in scrollable log on end screen
Enable "Copy Story" button for sharing
```

**Why it works**: Turns numbers into narrative, shareable content, emergent storytelling.

---

### World Curvature & Horizon (Depth Illusion)
**Concept**: Ground curves downward at distance, creating depth.

**Implementation**:
- Parallax layers fade and shrink toward horizon point
- Mountains get smaller and bluer (atmospheric perspective)
- Grid lines converge toward vanishing point
- Enemies shrink slightly when far from player

[SCAFFOLDING]
```
Location: Extend src/art/world-gen.js
Define horizon Y position (e.g., height * 0.3)
Scale parallax layers: closer = larger, farther = smaller
Apply blue tint to distant objects (lerp toward sky color)
For grid: Use trapezoid shapes instead of rectangles
Enemy scale: baseScale * (1 - distance * 0.0001)
```

**Why it works**: Huge visual upgrade, makes world feel vast, pure math.

---

### Damage Numbers with Context
**Concept**: Floating numbers show damage, but also damage type.

**Styles**:
- Critical: Large, bold, yellow
- Slow effect applied: Blue tint, snowflake icon
- Armor pierced: Orange, "PIERCED" suffix
- Overkill damage: Red, strike-through
- Status tick: Small, faded, dots for DoT

[SCAFFOLDING]
```
Location: New src/systems/damage-numbers.js
Create text pool (max 50 active)
On damage event, spawn text at enemy position
Tween upward + fade over 0.8s
Color and style based on damage type
Use bitmap font for performance (or regular text)
```

**Why it works**: Clarity, feedback, teaches mechanics visually.

---

### Boss Phase Transition Spectacles
**Concept**: Each boss phase change has a unique cinematic moment.

**Transitions**:
- Phase 2 (75% HP): Boss spins, sheds armor plates, screen shake
- Phase 3 (50% HP): Brief invulnerability, glowing charge-up, weapon swap
- Phase 4 (25% HP): Desperate mode, erratic movement, faster attacks
- Death: Explosion sequence, parts fly off, screen flash

[SCAFFOLDING]
```
Location: src/systems/combat.js - boss update logic
Detect HP thresholds crossing
Trigger transition: invulnerable flag + animation timer
During transition: dramatic visuals, audio stinger
After transition: new behavior state, weapon changes
```

**Why it works**: Memorable moments, teaches boss mechanics, feels epic.

---

### Pickup Magnetism with Skill Expression
**Concept**: Pickups drift toward you at close range, but can be "grabbed" early with boost.

**Mechanics**:
- Within 80 units: Slow drift toward engine
- Within 40 units: Fast pull-in
- Boost active: Pull range doubles
- Skillful play: Chain boost to collect distant pickups

[SCAFFOLDING]
```
Location: src/systems/spawner.js - updatePickups()
Calculate distance from engine to each pickup
If in range, apply velocity toward engine
Scale velocity by distance (closer = faster)
If boost active, multiply range by 2
Prevents tedious precision collection
```

**Why it works**: QoL improvement that rewards skill, feels satisfying.

---

### Color Synergy Bonuses
**Concept**: Having multiple colors provides team-up effects.

**Synergies**:
- 2+ Red + 2+ Blue: Frozen targets take +25% Red damage
- 2+ Blue + 2+ Yellow: Yellow pierces freeze enemies completely
- 2+ Red + 2+ Yellow: Yellow explosions ignite (future Orange effect)
- All 3 colors (2+ each): "Tri-Force" - all weapons +15% fire rate

[SCAFFOLDING]
```
Location: New src/systems/synergy.js
Scan train composition in update()
Count cars per color
Check synergy conditions
Apply temporary buffs to relevant weapons
Display active synergies as icons below HUD
```

**Why it works**: Encourages diversity, rewards composition planning, depth.

---

### Procedural Achievement Pop-Ups
**Concept**: Achievements appear as military medals with procedural insignia.

**Achievement Visuals**:
- Bronze/Silver/Gold/Diamond medals
- Procedural ribbon colors based on achievement type
- Embossed stars/bars showing tier
- Slide in from right with military fanfare sound

[SCAFFOLDING]
```
Location: Extend src/systems/achievements.js
On unlock, trigger medal animation
Generate medal graphic: circle + ribbon + stars
Use achievement color as ribbon tint
Tween: slide in, hold 2s, slide out
Achievement icon persists in menu unlocked gallery
```

**Why it works**: Satisfying visual reward, no assets, clear progression.

---

### Smart Enemy Formations
**Concept**: Enemies spawn in tactical patterns that telegraph their strategy.

**Formations**:
- **Pincer**: Two groups flank from sides - threatening sides
- **Wall**: Line formation - blocks forward path
- **Swarm**: Scattered cloud - overwhelming numbers
- **Spear**: V-formation - focused assault
- **Ring**: Surround player - escape challenge

[SCAFFOLDING]
```
Location: src/systems/spawner.js
Define formation templates with relative offsets
On wave start, select formation based on wave type
Spawn enemies at calculated positions
Show formation indicator on HUD: "PINCER FORMATION"
```

**Why it works**: Readable tactics, strategic response needed, professional feel.

---

### Destructible Environment (Background Wrecks)
**Concept**: Some debris can be destroyed for small rewards.

**Destructible Objects**:
- Old tanks: 50 HP, drop random pickup
- Supply crates: 20 HP, drop repair or buff
- Ammo dumps: 30 HP, explode damaging nearby enemies
- Fuel tanks: 40 HP, create fire zone on destruction

[SCAFFOLDING]
```
Location: Extend src/art/world-gen.js
Mark 20% of debris as destructible
Give HP and hitbox
Add to combat system's targetable list
On destruction: trigger effect and drop reward
Visual: Destructible debris has subtle outline glow
```

**Why it works**: Player agency, rewarding exploration, emergent tactics.

---

### Time Attack Mode with Leaderboard
**Concept**: Speedrun mode with ghost comparison.

**Features**:
- Fixed seed for fairness
- Time penalties for damage taken
- Bonus time for merges and combos
- Ghost of current best time
- Local leaderboard (top 10 runs)

[SCAFFOLDING]
```
Location: New src/modes/time-attack.js
Track completion time with precision
Store runs with: time, seed, date, score
Sort by time ascending
Display leaderboard on mode select
Export/import leaderboard data for sharing
```

**Why it works**: Competitive angle, replayability, speedrun community appeal.

---

### Dynamic Soundtrack Layers
**Concept**: Music builds as you progress through waves.

**Layers (4 total)**:
- Layer 1 (Always): Driving bassline
- Layer 2 (Wave 5+): Percussion
- Layer 3 (Wave 10+): Synth melody
- Layer 4 (Wave 15+): Lead guitar/brass

**Intensity Modifiers**:
- Boss fight: All layers + distortion
- Low HP: Muted highs, pulsing bass
- Victory: Triumphant finale flourish

[SCAFFOLDING]
```
Location: Extend src/systems/audio.js
Generate 4 looping audio buffers (Web Audio)
Use GainNode per layer for volume control
Cross-fade layers based on wave number
Modulate filter/distortion based on game state
Sync to BPM (e.g., 120 BPM = 0.5s per beat)
```

**Why it works**: Dynamic intensity, no music files, responds to gameplay.

---

### Realistic Ballistics (Optional Toggle)
**Concept**: Projectiles affected by train velocity and gravity.

**Mechanics**:
- Projectiles inherit train's velocity vector
- Moving forward: shots travel faster ahead
- Turning: shots arc outward slightly
- Optional gravity drop for Yellow projectiles

[SCAFFOLDING]
```
Location: src/systems/combat.js - spawnProjectile()
Calculate train velocity from position delta
Add velocity vector to projectile
If realism mode enabled, apply gravity to Yellow
Toggle in settings: "Realistic Ballistics"
```

**Why it works**: Skill ceiling increase, satisfying for advanced players.

---

### Photo Mode
**Concept**: Pause and capture epic moments.

**Features**:
- Freeze frame at any time
- Hide HUD
- Camera pan and zoom
- Apply filters: grayscale, sepia, high contrast
- Save as PNG (download)

[SCAFFOLDING]
```
Location: New src/systems/photo-mode.js
On activate: pause game, hide HUD
Enable camera drag with mouse/touch
Enable zoom with scroll/pinch
Render to offscreen canvas
Use canvas.toDataURL() for download
```

**Why it works**: Shareable moments, marketing material, player expression.

---

## Future Colors (Post-V1)

### Orange (Explosive)
Low fire rate, AoE damage. Niche: swarms.

### Green (Corrosion)
DoT effect, melts armor. Niche: tanky enemies.

### Purple (Arc)
Chain damage, bounces to nearby enemies. Niche: mixed groups.

---

## Discarded Ideas

- **Magnet Car**: Generic roguelite trope
- **Secondary Fire**: Violates "commander not gunner"
- **Lane-Based Movement**: Free steering is the interesting constraint
- **Energy/Ammo Systems**: Distracts from core loop

---

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `src/config.js` | All balance values |
| `src/core/train.js` | Train + car logic |
| `src/systems/combat.js` | Enemies, projectiles, damage |
| `src/systems/spawner.js` | Enemy + pickup spawning |
| `src/art/world-gen.js` | Parallax background |
| `src/art/projectile-visuals.js` | Unique projectile shapes |
| `src/systems/hud.js` | HUD rendering |

### Adding New Features
1. Check if it hits 2+ of: visual read, systemic interaction, train identity, procedural flex
2. Add [SCAFFOLDING] block with implementation hints
3. Keep it modular - one file per system
4. Heavy comments for future LLMs
