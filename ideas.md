# Iron Spine - Ideas Parking Lot (Non-Binding)

This file is a scratchpad for loose ideas. Nothing here is a commitment or in scope. Use it to offload thoughts so `design-doc.md` stays small and focused.

**Organizing principle**: Ideas should reinforce the "articulated war machine" identity. Generic roguelite tropes go to the bottom or get cut.

**FOR FUTURE LLMs**: This document contains implementation scaffolding notes to help you understand HOW to build these features, not just WHAT they are. Look for `[SCAFFOLDING]` blocks.

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

## PRIORITY 1: Visual Identity Systems

These make the game look unique and professional. High impact, moderate effort.

### Unique Projectile Visuals Per Color

**Problem**: All projectiles are circles. Only color differs. They feel same-y.

**Solution**: Each color gets a unique shape, trail, and impact effect.

| Color | Shape | Trail | Impact Effect |
|-------|-------|-------|---------------|
| Red | Thin dart/triangle | Tracer streak (fading line) | Shrapnel spray |
| Blue | Pulsing orb | Frost particles | Ice crack overlay |
| Yellow | Thick bolt/rectangle | Spark trail | Armor chip fragments |

[SCAFFOLDING]
```
Location: src/systems/combat.js - spawnProjectile() method
Current: Creates circle with scene.add.circle()

Changes needed:
1. Create ProjectileRenderer class in new src/art/projectile-visuals.js
2. Export functions: createRedProjectile(scene, x, y), etc.
3. Each returns a container with:
   - Main shape (triangle/polygon/rectangle)
   - Trail graphics object that updates with position history
4. In combat.js, replace circle creation with ProjectileRenderer call
5. Add new updateProjectileVisuals(deltaSeconds) method that:
   - Updates trail positions
   - Handles any pulsing/animation effects
6. On projectile hit, call new VfxSystem method for color-specific impact

Key insight: Trail effect uses a render texture or array of fading circles
at previous positions. Update every frame, fade based on age.
```

### Car Damage States

**Problem**: Cars look the same at full HP and 1 HP. No visual feedback for damage.

**Solution**: Progressive visual damage - scratches, cracks, smoke emissions.

| HP Range | Visual State |
|----------|--------------|
| 100-75% | Clean |
| 75-50% | Scratches appear |
| 50-25% | Cracks + occasional sparks |
| 25-0% | Heavy damage + smoke emission |

[SCAFFOLDING]
```
Location: src/core/train.js - createCar() and new updateCarDamageVisuals()

Implementation:
1. Store damage overlay graphics in car object: car.damageOverlay = []
2. In createCar(), add empty container for overlays
3. Create new updateDamageState(car) called when HP changes:
   - Calculate damage percentage: 1 - (car.hp / car.maxHp)
   - If > 0.25: add scratch overlays (thin rectangles, random positions)
   - If > 0.50: add crack lines (polylines from edge toward center)
   - If > 0.75: spawn periodic spark particles via VfxSystem
4. Scratches/cracks are graphics objects added once, not recreated each frame
5. Smoke emission: check in VfxSystem.update(), spawn if car HP < 25%

Scratch generation:
- 2-4 thin rectangles at random angles
- Color: slightly darker than car color
- Position: random within car bounds
- Created once when threshold crossed, destroyed when car dies
```

### Engine Weapon Accent Glow

**Problem**: Engine weapon adapts to dominant color but this isn't visually obvious.

**Solution**: Engine accent parts pulse/glow with the current weapon color.

[SCAFFOLDING]
```
Location: src/core/train.js - setEngineAccentColor() already exists

Enhancement:
1. Add engineGlowTween property to Train class
2. In setEngineAccentColor(), if color changes:
   - Stop previous tween if exists
   - Create pulsing alpha tween on accent parts
   - Tween alpha between 0.7 and 1.0, yoyo: true, repeat: -1
3. Add subtle glow effect using second set of accent shapes
   with larger scale and lower alpha behind the main ones
```

---

## PRIORITY 2: Enemy Readability & Fairness

These make combat feel fair and skill-based rather than random.

### Attack Telegraphs

**Problem**: Enemies attack without warning. Player deaths feel unfair.

**Solution**: Visual wind-up before every attack.

| Enemy Type | Telegraph | Duration |
|------------|-----------|----------|
| Ranger | Red laser line toward target | 400ms before shot |
| Armored | Plating glows, charge line | 600ms before charge |
| Boss | Ground warning circle | 800ms before slam |
| Champion | Flash + speed boost indicator | 300ms before dash |

[SCAFFOLDING]
```
Location: src/systems/combat.js - new TelegraphSystem or inline in enemy update

Implementation approach:
1. Add telegraph state to enemy objects:
   - enemy.telegraphType = null | 'aim' | 'charge' | 'slam'
   - enemy.telegraphTimer = 0
   - enemy.telegraphGraphics = null

2. For Ranger aim line:
   - In tryRangerFire(), instead of immediate fire:
   - Set telegraphType = 'aim', telegraphTimer = 0.4
   - Create line graphics from enemy to predicted target
   - Update line position each frame during telegraph
   - When timer expires, fire and destroy line

3. Telegraph graphics:
   - Aim line: scene.add.graphics() with lineStyle(2, 0xff0000, 0.6)
   - Charge indicator: rectangle stretching from enemy to target
   - Slam warning: expanding circle on ground

4. Visual style: Semi-transparent, pulsing alpha, clear color coding
```

### Threat Indicators

**Problem**: Off-screen enemies are invisible threats.

**Solution**: Edge-of-screen arrows pointing to off-screen dangers.

[SCAFFOLDING]
```
Location: New src/systems/threat-indicator.js

Implementation:
1. Create ThreatIndicatorSystem class
2. In update(), for each enemy:
   - Calculate if enemy is off-screen (compare to camera bounds)
   - If off-screen, calculate angle from screen center to enemy
   - Position arrow indicator on screen edge at that angle
   - Arrow size/color based on enemy threat level
3. Use fixed pool of arrow sprites (max 8-10)
4. Priority system: show nearest/most dangerous first
5. Arrow fades when enemy is close to screen edge

Arrow rendering:
- Triangle pointing outward
- Color matches enemy type (red for boss, yellow for armored, etc.)
- Pulse faster as enemy gets closer
```

---

## PRIORITY 3: Procedural Art Showcase

These demonstrate what LLM + procedural generation can achieve.

### Procedural Boss Factory

**Problem**: Bosses are hand-designed. Limits variety.

**Solution**: Generate bosses from modular parts + behavior grammars.

**Boss Anatomy**:
- Core body (hexagon, octagon, or irregular)
- 1-3 weapon mounts (cannons, missile pods, tesla coils)
- 0-2 weak points (glowing nodes that take extra damage)
- Armor plates (visual only, implies toughness)

**Behavior Grammar**:
- CHARGE: Rush at player, deal contact damage
- SWEEP: Rotate and fire in arc
- BURST: Stand still, fire rapid burst
- SUMMON: Spawn minions
- SHIELD: Temporary invulnerability phase

[SCAFFOLDING]
```
Location: New src/systems/boss-gen.js

Boss generation algorithm:
1. selectBodyType() - returns shape definition
2. generateWeaponMounts(bodyType) - returns array of mount positions + weapon types
3. generateWeakPoints(bodyType) - returns array of weak point positions
4. selectBehaviorPattern(difficulty) - returns array of behavior phases
5. createBossSprite(scene, config) - assembles visuals from parts

Example config output:
{
  body: 'hexagon',
  size: { width: 60, height: 50 },
  weapons: [
    { position: { x: 20, y: 0 }, type: 'cannon', angle: 0 },
    { position: { x: -20, y: 0 }, type: 'tesla', angle: Math.PI }
  ],
  weakPoints: [
    { position: { x: 0, y: -20 }, radius: 8, damageMultiplier: 2.0 }
  ],
  behaviors: ['CHARGE', 'SWEEP', 'BURST'],
  phaseThresholds: [0.75, 0.5, 0.25] // HP percentages for phase changes
}

Boss behavior execution:
- currentPhase index based on HP thresholds
- Each behavior type is a state machine with TELEGRAPH -> EXECUTE -> RECOVER
- Boss AI in combat.js calls bossUpdate(enemy, deltaSeconds) that runs state machine
```

### Dynamic Environment Hazards

**Problem**: Background is purely visual. No interaction.

**Solution**: Occasional environmental elements that affect gameplay.

| Hazard | Effect | Visual |
|--------|--------|--------|
| Debris Field | Slows movement by 20% | Dark patches on ground |
| Fire Zone | Deals 2 DPS to train and enemies | Orange flickering area |
| EMP Zone | Disables weapons for 2 seconds | Blue crackling area |
| Repair Depot | Heals 5 HP/sec while inside | Green glowing circle |

[SCAFFOLDING]
```
Location: Extend src/art/world-gen.js or new src/systems/hazards.js

Implementation:
1. Add HAZARD_TYPES config with effects and visuals
2. In WorldManager, occasionally spawn hazard zones instead of debris
3. Hazard zones have larger radius and persist longer
4. In game-scene update:
   - Check if engine is inside any hazard zone
   - Apply appropriate effect (slow, damage, weapon disable, heal)
5. Visual: Circular area with animated effects
   - Fire: particles rising, orange tint
   - EMP: lightning bolts, blue flicker
   - Repair: green pulse, plus symbols

Hazard detection:
- Simple circle-circle intersection with engine
- Store active effects in train state
- Apply effects in train.update() based on active effects
```

### Weather/Biome System

**Problem**: World always looks the same. No variety.

**Solution**: Procedural weather effects that change visuals and sometimes gameplay.

| Weather | Visual Effect | Gameplay Effect |
|---------|---------------|-----------------|
| Clear | Normal | None |
| Fog | Reduced visibility, haze overlay | Enemy detection range -20% |
| Storm | Rain particles, lightning flashes | Occasional lightning strikes |
| Dust | Brown particle fog, reduced contrast | Pickup visibility reduced |

[SCAFFOLDING]
```
Location: New src/systems/weather.js

Implementation:
1. WeatherSystem class with currentWeather, transitionTimer
2. Randomly select weather every 60-90 seconds
3. Smooth transition between weather states (fade overlay, particle density)
4. Weather effects:
   - Fog: Full-screen semi-transparent overlay, fade particles at distance
   - Storm: RainRenderer with angled line particles, periodic lightning flash
   - Dust: Brown-tinted fog overlay + swirling particles

Visual implementation:
- Weather overlay container at high depth, setScrollFactor(0)
- Particle systems for rain/dust/fog
- Lightning: Full-screen white flash + camera shake

Gameplay hooks:
- Export getWeatherModifiers() returning { visionRange, detectRange, etc. }
- Combat system checks modifiers when calculating ranges
```

---

## PRIORITY 4: Incremental/Idle Game Inspirations

These add depth and replayability without complexity.

### Prestige System (Meta-Progression)

**Concept**: After winning/losing, earn "Scrap" currency that persists. Spend on permanent upgrades.

**Upgrade Categories**:
- Starting Loadout: +1 starting car, better starting tier
- Train Power: +5% damage, +5% fire rate
- Durability: +10% HP, +10% armor
- Luck: Better pickup spawns, higher tier chance

[SCAFFOLDING]
```
Location: New src/systems/prestige.js + extend stats-tracker.js

Data model:
{
  scrap: 0,
  upgrades: {
    startingCars: 0,      // 0-3 levels
    damageBonus: 0,       // 0-10 levels, each +5%
    fireRateBonus: 0,     // 0-10 levels, each +5%
    hpBonus: 0,           // 0-10 levels, each +10%
    luckBonus: 0          // 0-5 levels, affects spawn weights
  }
}

Implementation:
1. Calculate scrap earned at end of run (based on waves, kills, merges)
2. Store in localStorage alongside stats
3. New PrestigeScene or modal showing available upgrades
4. getPrestigeBonuses() returns multipliers, used alongside achievement bonuses
5. Upgrade costs scale exponentially

Scrap formula:
  baseScrap = wavesCleared * 10 + kills * 0.5 + merges * 5
  bonusScrap = highestTier * 50
  finalScrap = floor((baseScrap + bonusScrap) * (1 + luckBonus * 0.1))
```

### Challenge Modes

**Concept**: Special game modes with rule modifiers.

| Mode | Modification | Reward |
|------|--------------|--------|
| Speed Run | 10 waves, 2x spawn rate | Time-based scrap bonus |
| Purist | No pickups after wave 5 | 2x scrap |
| Glass Cannon | 1 HP everything, 3x damage | Unique achievement |
| Color Lock | Only one color spawns | Completion achievement |

[SCAFFOLDING]
```
Location: Extend game-scene.js create() with challenge mode config

Implementation:
1. Add challengeMode to game start data (from menu)
2. Challenge configs stored in config.js or challenges.js
3. Apply modifiers at scene create:
   - Override WAVES constants
   - Override SPAWN constants
   - Override TRAIN HP values
4. Display challenge name in HUD
5. Track challenge-specific achievements
6. Calculate bonus scrap at run end based on challenge

Menu integration:
- "Challenge Mode" button in menu-scene
- Opens ChallengeSelectScene with mode descriptions
- Selected mode passed to GameScene via scene data
```

### Seeded Runs

**Concept**: Deterministic runs that can be shared/competed on.

**Features**:
- Display seed on HUD and end screen
- URL parameter support: `?seed=ABCD1234`
- Daily seed that's same for everyone
- Leaderboard potential (local only for now)

[SCAFFOLDING]
```
Location: New src/core/seeded-random.js + modifications across spawning

Implementation:
1. Create SeededRandom class:
   - constructor(seed: string)
   - next(): number (0-1, deterministic)
   - nextInt(min, max): number
   - shuffle(array): array

2. Seed sources:
   - URL param: new URLSearchParams(window.location.search).get('seed')
   - Daily: Generate from date: `daily-${new Date().toISOString().slice(0,10)}`
   - Random: Generate random 8-char string

3. Replace Math.random() calls in:
   - spawner.js - enemy spawn positions, types
   - pickups.js - pickup spawn positions, colors
   - world-gen.js - debris generation
   - boss-gen.js - boss configuration

4. Display: Add seed to HUD bottom-left, copy button on end screen

Key insight: Create single SeededRandom instance at game start,
pass to all systems that need randomness. Store in game-scene for access.
```

---

## PRIORITY 5: Advanced Combat Systems

These add depth to moment-to-moment gameplay.

### Combo System

**Concept**: Reward rapid consecutive kills with damage bonuses.

**Mechanics**:
- Kill within 2 seconds of previous kill = combo continues
- Combo multiplier: 1x -> 1.2x -> 1.5x -> 2x -> 3x (max)
- Visual: Combo counter on HUD, screen edge glow at high combo
- Audio: Pitch increases with combo

[SCAFFOLDING]
```
Location: Extend src/systems/combat.js

Implementation:
1. Add combo state: { count: 0, multiplier: 1, timer: 0, maxTimer: 2 }
2. In destroyEnemyAtIndex():
   - Increment combo.count
   - Reset combo.timer = combo.maxTimer
   - Recalculate multiplier from count
3. In update():
   - Decrement combo.timer
   - If timer <= 0, reset combo
4. Apply multiplier in applyProjectileDamage()
5. HUD shows combo counter when > 1
6. VFX: Screen edge tint at high combo (use same technique as pulse flash)

Multiplier curve:
  if (count < 3) return 1;
  if (count < 6) return 1.2;
  if (count < 10) return 1.5;
  if (count < 15) return 2;
  return 3;
```

### Critical Hits

**Concept**: Random chance for extra damage with satisfying feedback.

**Mechanics**:
- Base 5% crit chance, 2x damage
- Yellow weapons: Higher crit damage (2.5x)
- Visual: Larger projectile, screen shake, damage number popup
- Audio: Distinct "crack" sound

[SCAFFOLDING]
```
Location: Extend src/systems/combat.js - applyProjectileDamage()

Implementation:
1. Add crit check: Math.random() < getCritChance(projectile.colorKey)
2. If crit, multiply damage by getCritMultiplier(projectile.colorKey)
3. On crit hit:
   - Camera shake (light)
   - Spawn floating damage number (new VFX type)
   - Play crit sound
4. Optional: Crit chance increases with tier

Damage number implementation:
- Create text at enemy position
- Tween upward + fade out over 0.8 seconds
- Color based on projectile color
- "!" suffix for crits
```

### Status Effects

**Concept**: Beyond slow, add more debuffs enemies can have.

| Effect | Source | Duration | Visual |
|--------|--------|----------|--------|
| Slow | Blue weapons | 1.5-2.5s | Blue tint, frost particles |
| Burn | Orange weapons (future) | 3s, DoT | Orange glow, flame particles |
| Shock | Purple weapons (future) | 0.5s stun | Blue arcs, frozen in place |
| Corrode | Green weapons (future) | 5s, armor reduction | Green drip particles |

[SCAFFOLDING]
```
Location: Extend enemy object in combat.js

Current state for slow:
  enemy.slowTimer, enemy.slowMultiplier

Generalized status system:
enemy.statusEffects = {
  slow: { active: false, timer: 0, strength: 0 },
  burn: { active: false, timer: 0, dps: 0 },
  shock: { active: false, timer: 0 },
  corrode: { active: false, timer: 0, armorReduction: 0 }
};

Status application:
1. In applyProjectileDamage(), check projectile for status properties
2. Apply status to enemy.statusEffects
3. In updateEnemies(), process all active statuses:
   - Decrement timers
   - Apply effects (damage, speed mod, armor mod)
   - Spawn appropriate particles
   - Clear when timer expires

Status particles: Add to VfxSystem - spawnStatusParticle(enemy, statusType)
```

---

## PRIORITY 6: Interactive World Elements

These make the world feel alive and give emergent gameplay moments.

### Station Events

**Concept**: Occasional "gates" that offer choices without menus.

**Mechanics**:
- Station appears ahead of player
- 3 lanes with different icons (buff types)
- Player steers through one lane to receive that buff
- Buffs last 20-30 seconds

| Lane | Buff | Icon |
|------|------|------|
| Left | Fire Rate +30% | Bullet icon |
| Center | Repair 25% HP | Heart icon |
| Right | Speed +25% | Arrow icon |

[SCAFFOLDING]
```
Location: New src/systems/station-events.js

Implementation:
1. StationEvent class:
   - Spawn gate structure (3 columns with icons)
   - Each lane is a trigger zone
   - When train passes through, apply buff and destroy station

2. Gate visuals:
   - Two tall pillars on each side
   - Hanging lane dividers
   - Icons at top of each lane
   - All procedural shapes

3. Integration with game-scene:
   - StationManager checks if should spawn (every 45-60 seconds)
   - Spawn station 600 units ahead of player
   - Track active buffs in train state
   - Apply buff effects in relevant systems

Lane detection:
- Divide gate width into 3 zones
- On engine crossing gate X position, check Y position
- Map to lane (left/center/right)
- Apply corresponding buff
```

### Convoy Allies

**Concept**: Occasional friendly units that fight alongside you.

**Mechanics**:
- Random spawn of ally train (2-3 cars)
- Follows player at distance, auto-fires at enemies
- Lasts 20-30 seconds then departs
- Cannot be damaged (invulnerable ally)

[SCAFFOLDING]
```
Location: New src/systems/allies.js

Implementation:
1. AllyTrain class:
   - Similar to Train but simpler (no player control)
   - Follows player's position with delay and offset
   - Cars auto-fire like player cars
   - Invulnerable flag prevents damage

2. Ally behavior:
   - Maintain distance of 200-300 units from player
   - Orbit around player's average position
   - Fire at enemies in range

3. Spawn trigger:
   - Random chance per wave (5-10%)
   - Or as station event reward
   - Announce with fanfare sound + "ALLY INCOMING" text

4. Departure:
   - After duration, ally speeds away off-screen
   - Farewell sound effect
```

### Destructible Obstacles

**Concept**: World debris that can be destroyed for benefits.

**Mechanics**:
- Some debris objects have HP
- Destroying them drops pickups or buffs
- Adds target prioritization decisions

[SCAFFOLDING]
```
Location: Extend src/art/world-gen.js

Implementation:
1. Mark some debris as destructible in spawn function
2. Add to combat system's target list
3. Give destructible debris HP and hit detection
4. On destruction:
   - Drop random pickup (50% chance)
   - Or small HP restore (25% chance)
   - Or nothing (25% chance)
5. Visual: Destructible debris has subtle glow/outline

Integration:
- Debris with isDestructible flag joins enemy list for targeting
- Separate debris array in combat system
- Car weapons target closest (enemy OR destructible debris)
```

---

## PRIORITY 7: Audio & Juice

These make the game feel responsive and satisfying.

### Dynamic Music System

**Concept**: Procedural music that responds to gameplay intensity.

**Layers**:
- Base drum loop (always playing)
- Bass layer (adds during combat)
- Melody layer (adds during high intensity)
- Danger layer (low HP warning)

[SCAFFOLDING]
```
Location: Extend src/systems/audio.js

Implementation:
1. Create oscillator-based loops for each layer
2. Track intensity: combatIntensity = enemies.length / 20
3. Cross-fade layers based on intensity thresholds
4. Danger layer triggered by engine HP < 30%

Procedural music approach:
- Use Web Audio API oscillators
- Create simple 4-bar loops per layer
- Schedule notes using AudioContext.currentTime
- Quantize layer changes to bar boundaries

Alternative (simpler):
- Generate short audio buffers for each layer
- Loop with AudioBufferSourceNode
- Gain node per layer for cross-fading
```

### Screen Effects

**Concept**: Full-screen effects for impactful moments.

| Trigger | Effect |
|---------|--------|
| Low HP | Red vignette pulsing |
| High Combo | Gold screen edge glow |
| Boss Spawn | Brief color desaturation |
| Victory | Expanding white flash |
| Milestone | Confetti particles |

[SCAFFOLDING]
```
Location: New src/systems/screen-effects.js

Implementation:
1. Create overlay graphics container, depth 500, scrollFactor 0
2. Vignette: Radial gradient from transparent to color at edges
3. Edge glow: Four rectangles at screen edges with alpha gradient
4. Flash: Full-screen rectangle with tween alpha 0.5 -> 0
5. Confetti: Particle burst from top of screen

Usage:
- ScreenEffects.triggerVignette('red', duration)
- ScreenEffects.triggerFlash('white', intensity)
- ScreenEffects.spawnConfetti(count, colors)

Performance: Use single graphics object, redraw as needed
```

---

## PRIORITY 8: Developer Experience

These make the codebase easier to understand and extend.

### Visual Debug Overlay

**Concept**: Developer tools for understanding game state.

**Panels**:
- Entity counts (enemies, projectiles, particles)
- Performance metrics (FPS, update time, render time)
- Train state (HP, cars, buffs)
- Current wave and spawn state

[SCAFFOLDING]
```
Location: Extend src/systems/dev-console.js

Implementation:
1. Add debug overlay mode (toggle with backtick `)
2. Create overlay container with dark semi-transparent background
3. Add text elements for each data point
4. Update text every frame or every 10 frames (for perf)
5. Show/hide with single key toggle

Data sources:
- scene.children.length for entity count
- performance.now() deltas for timing
- Direct access to train, combat system, spawner state
```

### Hot Reload Development Mode

**Concept**: Change values without restarting game.

**Implementation idea**: Config values editable via dev console.

[SCAFFOLDING]
```
Location: Extend src/systems/dev-console.js

Commands to add:
- set TRAIN.engineSpeed 150
- set CAMERA.baseZoom 0.7
- reload (restarts scene with new values)

Implementation:
1. Parse command as: set [CONFIG_OBJECT].[property] [value]
2. Deep clone frozen config, modify clone
3. Replace config export (requires module-level changes)
4. Restart scene to apply

Simpler alternative:
- Just expose settings that are already runtime-modifiable
- SETTINGS object in settings.js is already mutable
- Add more tunables to SETTINGS
```

### Architecture Documentation Generator

**Concept**: Auto-generate docs from code comments.

**Implementation**: Script that extracts JSDoc and generates markdown.

[SCAFFOLDING]
```
This is a build-time tool, runs outside the game.

Script: scripts/generate-docs.js (not in src/)

Process:
1. Glob all .js files in src/
2. Parse JSDoc comments with regex or simple parser
3. Extract: file description, class names, function signatures
4. Generate markdown files per module
5. Output to docs/ folder

Key patterns to extract:
- /** ... */ block comments at file top
- @param, @returns tags
- Class and method descriptions

Output format:
# module-name.js
[File description]

## Classes
### ClassName
[Class description]

#### Methods
- methodName(params) - [description]
```

---

## Future Color Ideas (Post-V1)

Each color must have a clear fantasy and mechanical niche.

### Orange (Explosive)
**Fantasy**: Big boom. Area damage.
- Low fire rate, but hits all enemies in radius
- **Niche**: Swarms. Tier-3 Orange clears waves.
- **Train tie-in**: Like a mortar car on an armored train

### Green (Corrosion)
**Fantasy**: Acid. Melts armor over time.
- Damage-over-time effect
- **Niche**: Tanky enemies that Yellow can't burst down
- **Train tie-in**: Chemical warfare car (historical, dark)

### Purple (Arc)
**Fantasy**: Electricity. Chain damage.
- Hits target + bounces to nearby enemies
- **Niche**: Mixed groups
- **Caution**: Might be too universally good

### Additional colors should wait until V1 colors feel mastered.

---

## Enemy Ideas (Train-Themed)

### The Decoupler
- Sniper enemy that targets couplings
- Hit doesn't destroy car, but severs connection
- Severed car drifts away (can be recollected)
- Forces movement, punishes sitting still
- **Train identity**: Attacking the train's structure, not just HP

### The Locomotive (Boss)
- Enemy train with its own cars
- Mirror match: your train vs theirs
- Ramming steals cars from each other
- Defeat by destroying their engine
- **Train identity**: Peak train-vs-train fantasy

### The Blockade
- Stationary armored position
- Must be destroyed or circumvented
- Spawns defenders
- **Train identity**: Trains vs fortifications (historical)

### Rail Bomber
- Fast enemy that crosses perpendicular to you
- Must time your movement to avoid collision
- Creates "crossing" moments
- **Train identity**: Railroad crossing danger

---

## Assault Train Identity Ideas

These ideas lean into the 1944 Assault Train patent and military train fantasy.

### Cabin Roles (From the Patent)
The original assault train had three distinct cabins with different roles:
- **Scout cabin** (front): Light weapons, forward vision
- **Command cabin** (middle): Engine, crew, main firepower
- **Heavy cabin** (rear): Big gun that fired backwards

**Possible implementation**: Special "role" cars that provide bonuses based on position.

### Rear-Firing Module
The patent's 75mm cannon was mounted to fire backwards.
- One special car type only fires at enemies behind the train
- Forces you to consider rear protection
- Creates "kiting" tactics where you lead enemies behind you

### Locking Couplings
The patent mentions couplings could be "locked solid, turning the vehicle into a rigid bridge."
- Utility pickup: Lock couplings for 5 seconds
- Train becomes rigid (faster, but can't turn as sharply)

---

## Discarded Ideas (and Why)

### Magnet Car
- **Why discarded**: Generic roguelite trope. Doesn't reinforce train identity.

### Daily Run / Leaderboards
- **Why discarded**: Scope creep for prototype. Consider post-MVP only.

### Run Modifiers
- **Why discarded**: Generic roguelite system. Focus on core identity first.

### Secondary Fire / Ability Button
- **Why discarded**: Violates "commander not gunner" fantasy.

### Lane-Based Movement
- **Why discarded**: Free steering with articulated follow is the interesting constraint.

### Energy / Ammo Systems
- **Why discarded**: Adds resource management that distracts from core loop.

---

## Performance Optimization Ideas

### Object Pooling
- Pre-create projectile, particle, enemy objects
- Reuse instead of create/destroy
- Reduces GC pressure

### Spatial Partitioning
- Grid-based collision detection
- Only check nearby cells
- O(n) instead of O(n^2) for collision

### Render Batching
- Group similar shapes for batch rendering
- Reduce draw calls

---

## Accessibility Ideas

### Colorblind Modes
- Unique shapes already help
- Add pattern fills or symbols
- High contrast mode

### Screen Reader Support
- Audio cues for key events
- Haptic feedback where available

### Control Remapping
- Custom key bindings
- Mouse-only mode option

---

## Mobile-Specific Ideas

### Gesture Controls
- Swipe to boost
- Pinch to zoom
- Long press for pulse

### Portrait Mode
- Vertical gameplay option
- Redesigned HUD placement

---

## Questions for Playtesting

1. Does the train feel like a train, not a snake?
2. Is automatic merge intuitive or frustrating?
3. Do players instinctively collect same-colors to trigger merges?
4. At what enemy count does chaos become unreadable?
5. Does rear-position feel meaningful?
6. Is 2:30 run length right?
7. What causes most deaths?

---

## Reference

### Historical
- **1944 Assault Train Patent**: Three cabins, spherical couplings, hydraulic spine, rear-firing cannon. Never built.
- **WWI/WWII Armored Trains**: Real military railway vehicles. Industrial, brutal.

### Games
- **Colossatron**: Modular combat, color matching. Merge system inspiration.
- **Nuclear Throne**: Screen shake, juice, readable chaos.
- **Mini Metro**: Clean visual design under pressure.
- **Vampire Survivors**: Shows how "simple" games can be incredibly engaging.
- **Factorio**: Inspiration for visual systems that communicate state clearly.

Study these for feel. Iron Spine should feel like commanding an articulated war machine.
