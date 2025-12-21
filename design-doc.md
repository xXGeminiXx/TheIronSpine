# Iron Spine

---

## V1.1 BUILD SPEC (Authoritative)

**Read this first. This is the contract. Everything below is elaboration.**

### The Loop (One Sentence)
Steer to survive and collect; the train auto-fires; merges happen automatically; tactical drops and pulses help you recover from bad pickups.

### V1 Run Length
**Target 2-5 minutes** based on clearing a fixed number of waves (default: 20).

### Movement Model (V1 Decision)
**Simple follow behavior. No Matter.js physics.**
- Engine moves toward pointer at constant speed
- Each car lerps toward the car ahead of it
- Deterministic, readable, easy to tune
- Add physics later if we want chaos

### MVP Entities
| Entity | Count in MVP |
|--------|--------------|
| Engine | 1 |
| Weapon Cars (R/B/Y) | Unlimited (max 12 attached) |
| Pickup Cars | Spawn from edges |
| Skirmisher enemy | Core wave unit |
| Champion enemy | Every 5th wave |
| Boss enemy | Every 10th wave |

### The Merge Rule
**2 adjacent same-color, same-tier cars → 1 higher-tier car. Always. No exceptions.**

### MVP Stop Line
**MVP is done when:**
1. Movement feels good (engine + following cars)
2. Pickups spawn and can be collected
3. Merge detection and animation works
4. One enemy type (Skirmisher) spawns and attacks
5. You can lose (engine dies) and win (clear target waves)
6. One-button restart works

**Stop here and playtest before adding anything else.**

### V1.1 Additions (Playtest Approved)
- **Tail jettison**: Press Spacebar to drop the last car. Counts as lost. No explosion.
- **Engine light weapon**: The engine auto-fires a weak, short-range weapon.
- **Overdrive Pulse**: Screen-wide shockwave when fully charged, manual activation.
- **Distinct car silhouettes**: Each color has a unique shape cue beyond color.
- **Wave clarity**: UI must show current wave and elite (champion/boss) callouts.
- **No healing**: HP only decreases in V1.1 unless a future system is added.

---

## TUNING DEFAULTS

**All values below are starting points, expected to change during playtesting.**

### Core Values
| Parameter | Default | Notes |
|-----------|---------|-------|
| Run length | 20 waves | Target 2-5 minutes |
| Engine HP | 50 | Separate from car HP |
| Car HP (Tier 1) | 20 | |
| Car HP (Tier 2) | 30 | |
| Car HP (Tier 3) | 40 | |
| Max cars | 12 | + engine = 13 total |
| Follow speed | 0.15 | Lerp factor per frame |

### Movement
| Parameter | Default | Notes |
|-----------|---------|-------|
| Engine speed | 100 | units/sec |
| Turn speed | 165 | degrees/sec |
| Boost multiplier | 1.2 | 20% faster |
| Boost duration | 2s | |
| Boost cooldown | 5s | |

### Weapons (Tier 1)
| Color | Fire Rate | Damage | Range |
|-------|-----------|--------|-------|
| Red | 8/sec | 5 | 200 |
| Blue | 2/sec | 8 | 250 |
| Yellow | 0.8/sec | 35 | 300 |

### Engine Weapon (V1.1)
Engine weapon **evolves based on the cars behind it**.

- **Weapon type**: Dominant color in the chain (highest count).
- **Tie-break**: If tied, use the color of the car closest to the engine.
- **Tier**: Based on count of that dominant color:
  - 1-2 cars = Tier 1
  - 3-5 cars = Tier 2
  - 6+ cars = Tier 3
- **Behavior**: Auto-fire, forward-biased, short range.

**Base stats (Tier 1 reference)**:
| Color | Fire Rate | Damage | Range |
|-------|-----------|--------|-------|
| Red | 2.6/sec | 3 | 160 |
| Blue | 1.2/sec | 4 | 180 |
| Yellow | 0.5/sec | 16 | 200 |

### Enemies
| Type | HP | Speed | Damage |
|------|----|----- |--------|
| Skirmisher | 15 | 120 | 5 |
| Champion | 80 | 90 | 12 |
| Boss | 220 | 70 | 20 |
| Armored | 120 | 40 | 15 |
| Ranger | 30 | 80 | 8 |

### Spawning
| Parameter | Default |
|-----------|---------|
| Car spawn cadence | 2-3 every 10-14s |
| Car drift speed | 30 units/sec |
| Car despawn time | 15s |
| Wave cadence | Fixed size, short inter-wave delay |
| Champion cadence | Every 5th wave |
| Boss cadence | Every 10th wave |

### Overdrive Pulse (V1.1)
| Parameter | Default | Notes |
|-----------|---------|-------|
| Charge time | 40s | Time to full charge |
| Pulse damage | 40 | Screen-wide damage |

---

## Purpose
Build a tiny, mechanics-first prototype that proves the iron spine + color-merge idea is fun. This is a graybox experiment and can be abandoned at any time.

## Why This Exists
- Sparked by historical armored trains and a memory of modular weapon segments.
- Goal is to explore a fresh, original system, not to remake anything.
- The unique appeal: managing a physical chain of weapons under pressure, where spatial arrangement matters.
- The name "Iron Spine" captures the industrial strength and articulated structure of the train.

## Historical Inspiration: The Assault Train (1944)

In 1944, a French engineer filed a patent for an "articulated war machine" called the **Assault Train**. Three armored cabins, each with its own tracks and turret, linked together by huge **spherical couplings** moved by a **hydraulic spine**. Each cabin had a different role: a scout cabin at the front, the engine and crew in the middle, heavy firepower at the rear.

The couplings could pivot up and down or swing side to side. Step by step, one section at a time, it could theoretically scale obstacles as tall as itself.

It never left the drawing board. Too complex, too many crew, hydraulics that would clog with mud or freeze in winter. But as impractical as it was, it represents how inventors dreamed big—sometimes too big for reality.

**Iron Spine is our answer**: What if that articulated war machine actually worked? What if you could command it?

*Note: The engineer's name appears in sources as "Victor Bartellami Jet" but this may be a transcription artifact. For prototype purposes, we reference the concept, not the biography. Verify before any public release.*

## Important: This Is A Train, Not A Snake

The "spine" in Iron Spine refers to the linked structure of armored cars—like vertebrae in a backbone, or the spherical couplings of Bartellami Jet's assault train. This is NOT a snake game. Key distinctions:

- **Visual identity**: Industrial, military, armored train aesthetic. Smokestacks, rivets, steel plating, cast armor.
- **Movement feel**: Weighty, mechanical, locomotive. Not slithery or organic.
- **Sound design**: Clanking metal, engine rumble, grinding gears. Not hissing.
- **Fantasy**: You're a commander of an articulated war machine, not controlling a creature.
- **Cars, not segments**: We call them "cars" (train cars), not "segments" or "body parts."
- **Couplings, not joints**: The connections are mechanical spherical couplings, not biological joints.

The train can curve and wind through the battlefield, but it's always a TRAIN—a mechanical centipede of steel, not a living thing.

## Core Fantasy
You command the Iron Spine—a monstrous armored train snaking across the battlefield. Each car is a weapon module that fires autonomously. Your job isn't to aim—it's to collect the right cars, arrange them smartly, and steer through chaos while your spine becomes an ever-evolving death machine. The color-merge system rewards tactical thinking mid-combat: do you grab that red car to pair into a merge, or avoid it because it would break your blue chain?

## Core Pillars

### 1. Modular Spine Combat
The spine is your body. Each car is a vertebra. Losing cars hurts. Growing longer is power but also vulnerability. The physical chain creates emergent gameplay—enemies can target your middle, pickups require steering your whole length through danger.

### 2. Simple, Deterministic Color Rules
No randomness in merges. 2 adjacent same-color, same-tier = merge. Always. Players build intuition fast. The complexity comes from spatial arrangement under time pressure, not from learning obscure rules.

### 3. Readable Chaos
Dozens of bullets, explosions, and enemies—but you always know:
- What color each car is (bold, distinct hues)
- Which cars are about to merge (visual telegraph)
- Where damage is coming from (clear enemy attacks)
- Your spine's current state (instant HP read)

### 4. Short, Complete Runs
2-5 minutes from start to wave-clear/death. No grinding. No "just one more upgrade." Each run is a complete arc: weak start → frantic growth → powerful climax → resolution. Respect the player's time.

## Tech Constraints
- **Web-only**: HTML5 Canvas + JavaScript
- **Phaser 3 allowed** via CDN (provides physics, rendering, input handling)
- **No build tools**: Single HTML file or simple file structure, no npm/webpack
- **No external assets**: All graphics procedurally generated or drawn with canvas primitives

## Scope Boundaries (Prototype Only)
- No monetization (this is explicitly an anti-paywall passion project)
- No multiplayer
- No meta-progression beyond the current run
- No mobile-specific builds (but touch input should work)
- No asset pipeline or sprite sheets

---

## Core Loop (V1) - Detailed

### Phase 1: Start (Waves 1-2)
- Player spawns with **Engine + 1 random-color Tier-1 car**
- Brief invulnerability (1.5 seconds) to orient
- First enemies appear at edges, approaching slowly

### Phase 2: Growth (Waves 3-8)
- Loose cars drift onto the battlefield from the top/sides
- Cars spawn in waves, not constantly (prevents visual noise)
- **Car spawn cadence**: 2-3 cars every 10-14 seconds
- Player steers to collect cars (touch train head to car hitbox)
- New cars append to tail
- Enemy waves escalate per wave; champions every 5th wave, bosses every 10th

### Phase 3: Climax (Wave 9+)
- Car spawns reduce, enemy pressure increases
- Player must survive with what they've built
- Boss wave (every 10th) serves as the endcap of the run

### Phase 4: Resolution
- Run ends with stats screen:
  - Time survived
  - Cars collected / Cars lost
  - Merges completed
  - Enemies destroyed
  - Highest tier achieved
- One-button restart

---

## Controls (V1.1) - Detailed

### Primary: Pointer Following
- Train engine rotates toward pointer/touch position
- Engine moves forward at constant speed (always moving)
- Turn rate is limited to prevent instant direction changes
- **Turn speed**: ~165°/second (allows responsive steering without whipping)

### Movement Feel
The train should feel **weighty but responsive**. Like a muscle car, not a shopping cart.
- Engine has slight acceleration curve (0.3 seconds to full speed)
- Deceleration is faster than acceleration (stops feeling snappy)
- Cars follow with slight delay (creates satisfying trailing effect)
- The convoy should feel like a formation, not a rigid bar

### Optional: Boost
- Tap/click to boost (20% speed increase for 2 seconds)
- 5-second cooldown
- Visual: engine glows, smoke trail intensifies
- Audio: engine pitch rises

### Tactical: Jettison + Pulse
- **Spacebar**: Jettison the tail car (last in the chain). No explosion. Counts as lost.
- **E**: Trigger Overdrive Pulse when fully charged (screen-wide shockwave).

### What You DON'T Control
- Aiming (cars auto-target nearest enemy in range)
- Firing (continuous when enemies in range)
- Merging (automatic when conditions met)
This constraint is core to the fantasy—you're a conductor, not a gunner.

---

## Spine System (V1.1) - Detailed

### Physical Structure
```
[ENGINE]---●---[CAR]---●---[CAR]---●---[CAR]
           ↑           ↑           ↑
        Ball joints (connection points)
```

### Engine
- Unique visual (larger, distinctive shape, maybe smokestacks)
- Fires a light, forward-facing weapon (auto-fire)
- Has its own HP pool (50 HP, separate from cars)
- If engine dies, run ends immediately
- Engine HP does NOT regenerate

### Cars (Weapon Modules)
- Square/rectangular body with visible color coding
- Each car: 20 HP at Tier 1, +10 HP per tier
- Cars have individual HP (damage tracked per-car)
- When a car reaches 0 HP, it detaches and explodes
- Explosion deals 15 damage to enemies in small radius (satisfying destruction)

### Spherical Couplings (Connectors)
- Visual: large steel spheres connecting cars (inspired by the assault train patent)
- Couplings are NOT targetable (simplifies combat)
- Couplings are purely visual in V1—movement uses simple follow behavior, not physics simulation

### Chain Behavior
- Max chain length: 12 cars (engine + 12 = 13 total)
- Beyond 12, oldest car is forcibly ejected (prevents infinite growth)
- Cars follow previous car's position with delay
- This creates the signature articulated convoy movement—cars trailing in formation, not slithering
- **Tail jettison**: Spacebar removes the last car. No explosion. Counts as lost.

### Car Reordering (TBD)
- No manual reordering in the current build; pickups append to the tail.
- Candidates to evaluate:
  - Switchyard pickup (pause + swap two cars)
  - Coupler shuffle (rotate last 3 cars)
  - Drag mode (slow time + drag car)

### Damage Model (V1.1 - Simple)
- Damage applies to the car that was hit
- No splash damage to adjacent cars
- Dead car creates gap, chain reforms after 0.5 seconds
- When reforming, cars slide forward to close gap
- No healing in V1.1 (HP only decreases)

---

## Color Roles (V1.1) - Detailed

**Silhouette rule**: Each color is identifiable even in grayscale by shape cues.

### Red (Assault)
**Fantasy**: Suppressive fire. Constant damage. Keeps enemies at bay.
- Weapon: Rapid-fire machine gun
- Fire rate: 8 shots/second
- Damage per shot: 5
- Range: Medium (200 units)
- Projectile speed: Fast (600 units/sec)
- Visual: Small red bullets, tracer effect every 4th shot
- Silhouette: Boxy car with forward vents / twin barrel block
- Sound: Rhythmic "dakka dakka" (pitched by tier)

**Tier Scaling**:
| Tier | Fire Rate | Damage | Visual Change |
|------|-----------|--------|---------------|
| 1 | 8/sec | 5 | Single barrel |
| 2 | 10/sec | 7 | Dual barrel |
| 3 | 12/sec | 10 | Quad barrel, smoke |

### Blue (Control)
**Fantasy**: Crowd control. Slows enemies, creates breathing room.
- Weapon: Cryo cannon / slowing pulse
- Fire rate: 2 shots/second
- Damage per shot: 8
- Range: Medium-Long (250 units)
- Slow effect: 40% speed reduction for 1.5 seconds
- Projectile speed: Medium (400 units/sec)
- Visual: Blue orbs with frost trail
- Silhouette: Rounded top housing or coil pod
- Sound: "Whoosh-crack" freeze sound

**Tier Scaling**:
| Tier | Fire Rate | Damage | Slow % | Slow Duration |
|------|-----------|--------|--------|---------------|
| 1 | 2/sec | 8 | 40% | 1.5s |
| 2 | 2.5/sec | 12 | 50% | 2.0s |
| 3 | 3/sec | 18 | 60% | 2.5s |

### Yellow (Piercing)
**Fantasy**: Tank killer. High damage, punches through armor.
- Weapon: Armor-piercing cannon
- Fire rate: 0.8 shots/second
- Damage per shot: 35
- Range: Long (300 units)
- Special: Ignores 50% of enemy armor
- Projectile speed: Very fast (800 units/sec)
- Visual: Large golden shell, visible arc
- Silhouette: Long forward cannon block / recoil plates
- Sound: Deep "THOOM" cannon blast

**Tier Scaling**:
| Tier | Fire Rate | Damage | Armor Ignore |
|------|-----------|--------|--------------|
| 1 | 0.8/sec | 35 | 50% |
| 2 | 1.0/sec | 50 | 65% |
| 3 | 1.2/sec | 70 | 80% |

### Color Balance Philosophy
- **Red** beats swarms (high fire rate clears weak enemies)
- **Blue** beats rushers (slows fast enemies, creates distance)
- **Yellow** beats tanks (armor penetration handles beefy targets)
- No color is universally best—this creates merge decisions

---

## Merge System (V1) - Detailed

### Core Rule
**Exactly 2 adjacent same-color, same-tier cars merge into 1 higher-tier car of that color.**

This is inviolable. No exceptions. Predictability is sacred.

### Merge Detection
- Check runs every frame (or every 0.1 seconds for performance)
- Scans chain from engine to tail
- First valid adjacent pair found triggers merge
- Only one merge per frame (prevents cascade confusion)

### Merge Sequence (0.4 seconds total)
1. **Telegraph** (0.2s): Two cars pulse/glow, slight scale increase
2. **Collapse** (0.1s): Cars slide toward midpoint
3. **Flash** (0.05s): White flash at merge point
4. **Spawn** (0.05s): New tier car appears at midpoint
5. **Settle**: Chain physics normalizes

### Merge Positioning
The new car appears at the **midpoint** between the merging pair.

### What Merging Does
- 2 Tier-1 → 1 Tier-2
- 2 Tier-2 → 1 Tier-3
- Continues upward with no hard cap (higher tiers cost more cars)
- Merging is always beneficial—higher tier = better stats

### Merge Edge Cases
- **3+ adjacent same-color, same-tier**: Only the first pair (from engine-side) merges. Remaining cars stay.
- **Two separate pairs same frame**: Only first (closest to engine) merges. Other merges next frame.
- **Car destroyed mid-merge**: Merge cancels. This is more intuitive—you don't get rewarded for losing a car. Simpler to implement, easier to understand.

### Why Automatic Merges (V1 Decision)
Manual merge control adds depth but also friction. For V1, automatic merges:
- Reduce cognitive load during frantic combat
- Create interesting "accident" merges (grabbed wrong car, whoops!)
- Keep the core loop snappy
- Can revisit for V2 if too chaotic

---

## Overdrive Pulse (V1.1)

**Purpose**: A manual, map-wide pressure release without adding aiming complexity.

- **Charge**: Fills over 40 seconds of active play.
- **Activation**: Press **E** when fully charged.
- **Effect**: Screen-wide shockwave deals 40 damage to all enemies. Ignores armor.
- **Rules**: Does not affect pickups or the train. Charge resets to 0 on use.
- **UI**: Meter fills; shows “PULSE READY” when full.

---

## Enemy Types (V1) - Detailed

### Design Philosophy
Enemies exist to create pressure and force decisions. They should be:
- **Instantly readable**: Shape + color = behavior
- **Threatening but fair**: Clear tells before damage
- **Complementary**: Each type counters a playstyle

### Skirmisher (Grunt)
**Role**: Swarm pressure. Punishes ignoring weak enemies.
- Shape: Small triangle (points toward player)
- Color: Light gray with red trim
- HP: 15
- Speed: Fast (120 units/sec)
- Damage: 5 per hit
- Attack: Melee (rams train)
- Behavior: Beelines to nearest car, rams, dies on impact
- Spawn pattern: Groups of 5-8
- **Counter**: Red cars (rapid fire clears swarms)

### Champion (Elite)
**Role**: Wave gate. Forces focus fire and movement discipline.
- Shape: Medium triangle, thicker outline
- Color: Light gray with gold trim
- HP: 80
- Speed: Medium (90 units/sec)
- Damage: 12 per hit
- Attack: Melee (rams train)
- Behavior: Tracks nearest segment, tankier than skirmishers
- Spawn pattern: Single spawn after wave skirmishers (every 5th wave)
- **Counter**: Any focused fire, avoid cornering

### Boss (Elite)
**Role**: Endcap threat. Big HP, heavy impact.
- Shape: Large triangle, heavy outline
- Color: Dark gray with orange trim
- HP: 220
- Speed: Slow (70 units/sec)
- Damage: 20 per hit
- Attack: Melee (rams train)
- Behavior: Tracks engine, punishes mistakes
- Spawn pattern: Single spawn after wave skirmishers (every 10th wave)
- **Counter**: Yellow cars or stacked merges

### Armored (Tank)
**Role**: HP sponge. Punishes low-damage builds.
- Shape: Large hexagon
- Color: Dark gray with yellow trim
- HP: 120
- Armor: 10 (reduces incoming damage by flat 10)
- Speed: Slow (40 units/sec)
- Damage: 15 per hit
- Attack: Melee (slow but devastating ram)
- Behavior: Marches toward engine, ignores other cars
- Spawn pattern: Singles or pairs
- **Counter**: Yellow cars (armor piercing)

### Ranger (Pressure)
**Role**: Forces movement. Punishes camping.
- Shape: Diamond
- Color: White with blue trim
- HP: 30
- Speed: Medium (80 units/sec)
- Damage: 8 per shot
- Attack: Ranged (fires every 2 seconds, medium accuracy)
- Behavior: Keeps distance, circles train, fires projectiles
- Projectile: Red diamond, 300 units/sec, visible trajectory
- Spawn pattern: 2-4 at screen edges
- **Counter**: Blue cars (slowing helps you close distance or escape)

### Spawn System
- Wave-based, fixed-size waves that scale per wave
- Each wave spawns a base count of skirmishers
- After skirmishers are cleared, spawn an elite on milestone waves:
  - **Champion** every 5th wave
  - **Boss** every 10th wave
- Short inter-wave delay between waves
- Enemies spawn at screen edges, 50+ units outside visible area
- Spawn padding scales up slightly with train length (keeps framing breathable as the spine grows)

---

## Level Format (V1) - Detailed

### Map Structure
- Single continuous scrolling battlefield
- Camera follows train engine (slight lead in movement direction)
- Battlefield size: Effectively infinite (procedural)
- Visual: Simple ground texture, parallax background optional

### Terrain (V1 - Minimal)
- No walls or hard obstacles (keeps movement fluid)
- Visual variety through ground coloring/patterns only
- Future consideration: debris that slows train, cover for enemies

### Car Pickup Spawning
- Cars spawn at screen edges, drift toward center slowly
- Drift speed: 30 units/sec (gives time to intercept)
- Cars have slight glow/pulse to draw attention
- Spawn positions weighted toward player's forward direction (rewards aggression)
- Spawn padding scales up slightly with train length (reduces center crowding as the train grows)
- Uncollected cars persist for 15 seconds, then fade out

### Run Endpoint (V1)
- Clear a fixed number of waves (default 20) to win.
- Every 5th wave spawns a **Champion** after skirmishers.
- Every 10th wave spawns a **Boss** after skirmishers.
- Victory triggers after the final boss wave is defeated.

---

## Camera System

### Following Behavior
- Camera centered on engine
- **Look-ahead**: Camera shifts 15% in movement direction (see what's coming)
- Smooth follow with 0.1s interpolation (no jarring snaps)
- Slight zoom out as spine gets longer (keep whole spine visible)

### Zoom Levels
- Base zoom: 1.12x (tighter framing early)
- At 6+ cars: 1.0x
- At 10+ cars: 0.92x
- Max zoom out: 0.85x (keep long trains in frame)

### Screen Shake
- Light shake on taking damage
- Medium shake on car destruction
- Heavy shake on merge completion (power moment!)
- Boss attacks = big shake

---

## UI/HUD (V1.1)

### Always Visible
1. **Spine HP Bar**: Top-left, segmented by car count
   - Each segment = one car's HP
   - Engine HP shown separately (gold segment)
   - Color-coded segments match car colors
   - Engine HP is a long green→red bar (Runescape-style clarity)

2. **Timer**: Top-center, elapsed time (informational)

3. **Kill Counter**: Top-right, simple number

4. **Wave Indicator**: Current wave / total with elite callouts
5. **Overdrive Meter**: Shows charge progress and “PULSE READY”

### Contextual
- **Merge Flash**: Brief "MERGED!" text when merge occurs
- **Tier Indicator**: Small number on each car (tier 1+)
- **Danger Indicators**: Edge arrows pointing to off-screen enemies
- **Wave Prompt**: “Wave X/Y” with champion/boss label

### Menus
- **Start Screen**: Title, Start + Settings buttons
- **Settings Screen**: Toggle screen shake, grid, debug overlay
- **Death Screen**: Stats, Retry + Settings
- **Victory Screen**: Stats, Play Again + Settings

---

## Visuals (V1) - Art Direction

### Philosophy
"Bold shapes, clear colors, readable at a glance"

Crisp edges and high contrast. Anti-aliasing is fine only if silhouettes stay sharp. If you squint, you should still understand the game state.

**Status**: Engine silhouette is complete. Car silhouettes need minor polish only.

### Color Palette
```
Background: #1a1a2e (dark blue-gray, recedes)
Ground: #16213e (slightly lighter, defines play area)
Train Engine: #4a4a4a (dark gray) with #ffa500 (orange) accents
Red Cars: #ff4444 (pure red)
Blue Cars: #4444ff (pure blue)
Yellow Cars: #ffcc00 (gold-yellow)
Enemies: Grayscale with colored trim
UI: White with colored accents
```

### Shape Language
- **Player (Train)**: Rectangles + circles (mechanical, industrial)
- **Enemies**: Triangles, diamonds, hexagons (aggressive, alien)
- **Pickups**: Rounded rectangles (friendly, collectible)
- **Projectiles**: Simple shapes matching source (circles for bullets, diamonds for enemy shots)
- **Color Silhouettes**: Each car color has a unique silhouette (vents, coils, cannon block)

### Visual Hierarchy (brightest to dimmest)
1. Player train (you)
2. Pickups (opportunities)
3. Enemies (targets/threats)
4. Your projectiles (feedback)
5. Effects
6. Background (context)

### Juice Elements
- Projectile trails
- Hit flashes (white frame on damage)
- Merge particles (explosion of small particles)
- Screen shake (as noted above)
- Car destruction explosion
- Subtle engine smoke/exhaust

---

## Audio Direction (Optional but Recommended)

### Sound Categories
1. **Engine Loop**: Constant low rumble, pitch varies with speed
2. **Weapon Fire**: Distinct per color (red=dakka, blue=whoosh, yellow=boom)
3. **Impacts**: Enemy hit, car hit, car destroyed
4. **Merge**: Satisfying "power up" sound
5. **UI**: Menu clicks, game start, game over

### Implementation
- Web Audio API for low-latency
- Procedural generation possible (simple oscillators for retro feel)
- Or: Source free SFX from sfxr/bfxr generators

---

## Difficulty Curve

### Within a Single Run
```
Wave    | Enemy Pressure | Car Spawns | Player State
--------|----------------|------------|---------------
1       | Low            | High       | Learning
3       | Medium         | High       | Growing
5       | Medium-High    | Medium     | Champion check
10      | High           | Low        | Boss pressure
15      | Very High      | Low        | Surviving
20      | Maximum        | Low        | Final boss
```

### Tuning Philosophy
- Early game should feel generous (hook the player)
- Mid game introduces real challenge
- Late game is desperate survival
- Nobody should expect to win first try
- Skilled players should win ~40% of runs

---

## Resolved Design Questions

### Q: Lane-based or free 2D steering?
**A: Free 2D steering.**
- Lanes feel restrictive for a train fantasy
- Free movement allows more expressive play
- Physics-based chain is the interesting constraint, not lanes
- Easier to implement (no lane-switching logic)

### Q: Immediate auto-merge or player-triggered?
**A: Immediate auto-merge for V1.**
- Reduces decision paralysis in fast combat
- Creates "happy accidents" when merges surprise you
- Keeps cognitive load on steering + collecting
- Player agency comes from car collection/arrangement
- Revisit if playtesting shows desire for control

### Q: Engine firing weapons?
**A: Yes, but minimal.**
- Light forward weapon helps early pressure without replacing car roles
- Engine remains weaker than any weapon car
- Keeps the fantasy while reducing helpless openings

### Q: Car ordering/rearrangement?
**A: No manual rearrangement.**
- Cars still append to tail only
- **Tail jettison** is the only corrective tool
- Wrong pickups remain a penalty, but are recoverable

---

## Technical Implementation Notes

### Recommended Stack
- **Phaser 3** via CDN (handles rendering, input, game loop)
- **Simple follow physics** (no Matter.js for V1—too much tuning complexity)
- **Single HTML file** for portability
- **ES6 modules** if needed, but prefer simplicity
- **High-DPI rendering**: Scale render resolution and UI text to device pixel ratio for crisp output

### V1 Movement Implementation
```javascript
// Simple follow behavior - deterministic, readable
function updateCar(car, leader, dt) {
    const followSpeed = 0.15; // Tune this
    car.x += (leader.x - car.x) * followSpeed;
    car.y += (leader.y - car.y) * followSpeed;
    car.rotation = Math.atan2(leader.y - car.y, leader.x - car.x);
}
```
This is easier to understand, debug, and tune than physics constraints. Add Matter.js later if you want wobbly chaos.

### Performance Targets
- 60 FPS on mid-range devices
- Max 100 entities on screen
- Particle budget: 200 particles max
- If performance dips, reduce particle effects first

### State Machine
```
MENU → PLAYING → VICTORY/DEFEAT → MENU
              ↓
            PAUSE (optional)
```

---

## What Success Looks Like

After a 3-minute playtest, the player should feel:
1. "I want to try again" (core loop is engaging)
2. "That merge was satisfying" (color system works)
3. "My spine felt powerful" (fantasy delivered)
4. "I understood what happened" (readable chaos achieved)
5. "That was complete" (short run felt like full experience)

If any of these fail, the prototype needs iteration. If all succeed, consider expanding scope.

---

## Next Steps (Implementation Order)

1. **Static spine rendering**: Draw engine + 3 cars, no movement
2. **Engine steering**: Engine follows pointer, moves forward
3. **Chain physics**: Cars follow engine with spring delay
4. **Car collection**: Spawn pickups, collect on touch
5. **Color system**: Cars have colors, visual distinction
6. **Merge system**: Detect and execute adjacent pair merges
7. **Basic combat**: Cars fire at dummy enemies
8. **Enemy AI**: Enemies spawn and attack
9. **Game loop**: Wave progression, win/lose conditions
10. **Polish**: Particles, sound, juice
