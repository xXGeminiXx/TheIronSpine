# Iron Spine - Ideas Parking Lot (Non-Binding)

This file is a scratchpad for loose ideas. Nothing here is a commitment or in scope. Use it to offload thoughts so `design-doc.md` stays small and focused.

**Organizing principle**: Ideas should reinforce the "articulated war machine" identity. Generic roguelite tropes go to the bottom or get cut.

---

## Hard Rules (Never Violate)

1. **Merge rule is fixed**: Exactly 2 adjacent same-color, same-tier cars merge into 1. No exceptions.

2. **Color clarity beats cleverness**: If a color's role can't be explained in one sentence, it's too complex.

3. **Readable chaos is non-negotiable**: At peak action, players must understand their train, threats, and pickups.

4. **It's a train, not a snake**: Industrial, mechanical, armored. Spherical couplings, not biological joints.

5. **Anti-paywall philosophy**: No energy systems, forced ads, timers, or premium currency. Ever.

---

## Assault Train Identity Ideas

These ideas lean into the 1944 Assault Train patent and military train fantasy.

### Cabin Roles (From the Patent)
The original assault train had three distinct cabins with different roles:
- **Scout cabin** (front): Light weapons, forward vision
- **Command cabin** (middle): Engine, crew, main firepower
- **Heavy cabin** (rear): Big gun that fired backwards

**Possible implementation**: Special "role" cars that provide bonuses based on position:
- Front-position car gets range bonus (scout role)
- Middle cars get fire rate bonus (concentrated fire)
- Rear car gets damage bonus (heavy hitter)
- This creates positional strategy beyond just color matching

### Rear-Firing Module
The patent's 75mm cannon was mounted to fire backwards. What if:
- One special car type only fires at enemies behind the train
- Forces you to consider rear protection
- Creates "kiting" tactics where you lead enemies behind you
- Visual: Obvious backwards-facing turret

### Locking Couplings
The patent mentions couplings could be "locked solid, turning the vehicle into a rigid bridge."
- Utility pickup: Lock couplings for 5 seconds
- Train becomes rigid (faster, but can't turn as sharply)
- Use for quick escapes or crossing dangerous zones
- Tradeoff: mobility vs speed

### Bridge Mode
The assault train could extend across gaps.
- Not for V1, but: what if terrain had gaps?
- Long trains can bridge; short trains must go around
- Rewards growing your train
- Creates risk: you're vulnerable while bridging

### Armored Coupling Upgrade
Patent mentioned reinforced joints.
- Rare pickup: One coupling becomes armored
- If the car ahead is destroyed, chain doesn't break
- Protects your high-tier cars from chain separation

### Command Car (Special)
- Doesn't fire weapons
- Provides passive buff to all adjacent cars
- Visual: Antenna, command flags, distinct silhouette
- Creates interesting placement decisions

### Smokescreen Car
- Periodically emits smoke cloud behind the train
- Enemies in smoke can't target accurately
- Leaning into the industrial train aesthetic
- Visual: Obvious smokestacks, billowing clouds

---

## Color Ideas (Post-V1)

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

## Combat Readability Ideas

These focus on making combat clear under pressure.

### Threat Telegraphing
- Enemies flash before attacking (0.5s warning)
- Ranged enemies show trajectory line
- Big attacks have wind-up animations
- Goal: You always know what's about to hit you

### Damage Direction Indicator
- Brief flash on the side of screen where damage came from
- Helps locate off-screen threats
- Simple arrow pointing to attacker

### Merge Telegraph
- When 2 adjacent same-color, same-tier cars align, they pulse for 0.3s before merging
- Player sees it coming, feels intentional
- If car dies in this window, merge cancels (per design-doc)

### Hit Confirmation
- Enemies flash white when damaged
- Damage numbers optional (might add noise)
- Distinct sound per weapon type

### Presentation & Framing
- UI scale toggle (small/medium/large) to suit high-DPI displays
- Adaptive spawn padding based on train length to keep the action centered without crowding

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

## Merge Variations (Respect the Pair Rule)

### Merge Wind-Up (Recommended for V2)
- When a mergeable pair is detected, 0.5s countdown before merge
- Player can break the pair by inserting another car
- More forgiving of accidents
- Still automatic, just not instant

### Player-Triggered Merge
- Pair glows "merge-ready"
- Player taps to confirm
- Adds control but also cognitive load
- Test carefully before committing

**Not recommended**: Anything that changes the core pair merge rule.

---

## Future Modes (Minimal List)

### Endless Mode
- No wave target, survive as long as possible
- Leaderboard-friendly
- Simple to implement after core loop works

### Fixed Train Challenge
- Start with specific train (e.g., R-R-B-Y-R)
- No pickups during run
- Pure combat skill test

### Boss Rush
- Skip to bosses only
- Tests late-game power fantasy

---

## Discarded Ideas (and Why)

### Magnet Car
- **Why discarded**: Generic roguelite trope. Doesn't reinforce train identity. Pickup collection should require intentional steering.

### Daily Run / Leaderboards
- **Why discarded**: Scope creep for prototype. Consider post-MVP only.

### Run Modifiers
- **Why discarded**: Generic roguelite system. Focus on core identity first.

### Utility Cars (Repair, Radar)
- **Why discarded for now**: Dilutes weapon focus. Every car should shoot in V1. Reconsider if combat feels monotonous.

### Secondary Fire / Ability Button
- **Why discarded**: Violates "commander not gunner" fantasy.

### Lane-Based Movement
- **Why discarded**: Free steering with articulated follow is the interesting constraint.

### Energy / Ammo Systems
- **Why discarded**: Adds resource management that distracts from core loop.

---

## Questions for Playtesting

1. Does the train feel like a train, not a snake?
2. Is automatic merge intuitive or frustrating?
3. Do players instinctively collect same-colors to trigger merges?
4. At what enemy count does chaos become unreadable?
5. Does rear-position feel meaningful? (Or do all positions feel same?)
6. Is 2:30 run length right?
7. What causes most deaths? (Informs enemy balance)

---

## Reference

### Historical
- **1944 Assault Train Patent**: Three cabins, spherical couplings, hydraulic spine, rear-firing cannon. Never built.
- **WWI/WWII Armored Trains**: Real military railway vehicles. Industrial, brutal.

### Games
- **Colossatron**: Modular combat, color matching. Merge system inspiration.
- **Nuclear Throne**: Screen shake, juice, readable chaos.
- **Mini Metro**: Clean visual design under pressure.

Study these for feel. Iron Spine should feel like commanding an articulated war machine—industrial, mechanical, powerful.
