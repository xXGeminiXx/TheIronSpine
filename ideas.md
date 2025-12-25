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
- Location: `src/systems/hud.js`

### [DONE] Pickup Caravans
- Groups of 3-5 pickups that spawn together
- Location: `src/systems/spawner.js`

---

## PRIORITY 1: Visual Identity (High Impact)

### Car Damage States
**Problem**: Cars look the same at full HP and 1 HP.

**Solution**: Progressive visual damage.
| HP Range | Visual State |
|----------|--------------|
| 100-75% | Clean |
| 75-50% | Scratches appear |
| 50-25% | Cracks + occasional sparks |
| 25-0% | Heavy damage + smoke emission |

[SCAFFOLDING]
```
Location: src/core/train.js
1. Store damage overlay graphics in car.damageOverlay
2. Create updateDamageState(car) called when HP changes
3. Scratches: thin darker rectangles at random angles
4. Cracks: polylines from edge toward center
5. Smoke: VfxSystem.update() spawns particles if HP < 25%
```

### Armor Plate Language Per Tier
Make tiers look distinct instantly.
- Tier 1: Flat plates, few rivets
- Tier 2: Layered plating, bevels
- Tier 3: Reinforced edges, hazard stripes
- Tier 4+: Insignia marks, glowing seams

[SCAFFOLDING]
```
Location: src/core/train.js - car renderer
Generate plates from rectangles + corner bevels.
Use deterministic seed from (color, tier, index).
```

### Engine Accent Glow
Engine accent parts pulse with current weapon color.

[SCAFFOLDING]
```
Location: src/core/train.js - setEngineAccentColor()
Add pulsing alpha tween (0.7-1.0) when color changes.
Add glow effect: larger scale shapes behind accents at lower alpha.
```

### Directional Muzzle Systems
Each car gets visible turret/barrel that recoils on fire.

---

## PRIORITY 2: Combat Fairness

### Attack Telegraphs
**Problem**: Enemies attack without warning. Deaths feel unfair.

| Enemy Type | Telegraph | Duration |
|------------|-----------|----------|
| Ranger | Red laser line toward target | 400ms |
| Armored | Plating glows, charge line | 600ms |
| Boss | Ground warning circle | 800ms |
| Champion | Flash + speed indicator | 300ms |

[SCAFFOLDING]
```
Location: src/systems/combat.js
1. Add enemy.telegraphType, enemy.telegraphTimer, enemy.telegraphGraphics
2. In tryRangerFire(): set telegraph, create aim line, fire when timer expires
3. Telegraph graphics: semi-transparent, pulsing alpha
```

### Threat Indicators
Edge-of-screen arrows pointing to off-screen dangers.

[SCAFFOLDING]
```
Location: New src/systems/threat-indicator.js
1. For each off-screen enemy, calculate angle from screen center
2. Position arrow on screen edge at that angle
3. Use fixed pool of 8-10 arrows, priority by threat level
```

---

## PRIORITY 3: Procedural Showcase

### Procedural Boss Factory
Generate bosses from modular parts + behavior grammars.

**Boss Anatomy**:
- Core body (hexagon, octagon, irregular)
- 1-3 weapon mounts
- 0-2 weak points (extra damage)
- Armor plates

**Behaviors**: CHARGE, SWEEP, BURST, SUMMON, SHIELD

[SCAFFOLDING]
```
Location: New src/systems/boss-gen.js
1. selectBodyType() - shape definition
2. generateWeaponMounts(bodyType) - positions + types
3. selectBehaviorPattern(difficulty) - behavior phases
4. createBossSprite(scene, config) - assemble visuals
Boss AI uses state machine: TELEGRAPH -> EXECUTE -> RECOVER
```

### Weather/Biome System
| Weather | Visual | Gameplay |
|---------|--------|----------|
| Clear | Normal | None |
| Fog | Haze overlay | -20% enemy detection |
| Storm | Rain, lightning | Occasional strikes |
| Dust | Brown fog | Reduced pickup visibility |

[SCAFFOLDING]
```
Location: New src/systems/weather.js
Randomly select weather every 60-90s.
Weather overlay at high depth, scrollFactor 0.
Export getWeatherModifiers() for combat system.
```

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

### Combo System
Kill within 2s = combo continues. Multiplier: 1x -> 1.2x -> 1.5x -> 2x -> 3x

[SCAFFOLDING]
```
Location: src/systems/combat.js
Add combo state: { count, multiplier, timer, maxTimer: 2 }
In destroyEnemyAtIndex(): increment, reset timer
In update(): decrement timer, reset combo if expired
Apply multiplier in applyProjectileDamage()
```

### Critical Hits
5% crit chance, 2x damage. Yellow: 2.5x. Visual: larger projectile, damage popup.

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

### Unified Ground Shadow
Single soft shadow under whole train, broken at couplings.

### Headlight Scan Cone
Engine casts subtle cone light sweeping with pointer direction.

---

## PRIORITY 8: Enemy Ideas

### Rail Spike Enemy
Drops spike strip ahead. If engine crosses, couplings lock rigid for 1.5s.

### Harpooner Enemy
Fires tether at mid-car, drags it sideways until destroyed.

### Clamp Mine Layer
Drops mines that latch onto cars, apply turn penalty + countdown ring.

### The Decoupler (Sniper)
Targets couplings. Hit severs connection, car drifts away (can recollect).

### The Locomotive (Boss)
Enemy train with its own cars. Mirror match, ramming steals cars.

---

## PRIORITY 9: Polish & Juice

### Dynamic Music
Layers: base drum, bass (combat), melody (high intensity), danger (low HP).

### Screen Effects
| Trigger | Effect |
|---------|--------|
| Low HP | Red vignette pulse |
| High Combo | Gold edge glow |
| Boss Spawn | Color desaturation |
| Victory | White flash |

### War Report End Screen
Military after-action sheet: kills by color, highest tier, tension time, choices.

### Procedural Emblems
Generate regiment emblem per run on engine plate.

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
