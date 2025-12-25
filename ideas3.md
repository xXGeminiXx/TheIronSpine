# Iron Spine - Ideas v3 (New Concepts Only)

This list is entirely new (not in `ideas.md` or `ideas2.md`). It assumes the existing hard rules and V1 constraints.

---

## Priority 1: Readability Without UI Bloat

### [x] Spine Readout HUD Strip

**What**: A tiny horizontal strip showing car order, color, and tier from engine to tail.

**Why**: Lets players plan merges and drops without camera gymnastics.

Implemented: `src/systems/hud.js`

### [x] Damage Direction Pings

**What**: Brief edge-of-screen pings indicating the direction damage came from.

**Why**: Makes off-screen hits feel fair without full threat arrows.

Implemented: `src/systems/hud.js`, `src/systems/combat.js`, `src/scenes/game-scene.js`

### [ ] Optional Range Arcs

**What**: Faint arcs around each car showing current firing range.

**Why**: Clarifies weapon roles and spacing decisions in chaos.

Notes: Gate behind a Settings toggle to avoid clutter.

---

## Priority 2: Spawns That Create Intentional Decisions

### [x] Pickup Caravans

**What**: A short line of 3-5 pickups that drift together with consistent spacing.

**Why**: Encourages route planning and staged merges instead of random sniping.

Implemented: `src/systems/spawner.js`, `src/config.js`

### [ ] Enemy Formation Waves

**What**: Spawn squads in visible formations (wedge, column, pincer, ring).

**Why**: Improves readability and creates moment-to-moment steering puzzles.

[SCAFFOLDING]
```
Location: src/systems/spawner.js
Select a formation template and offset spawn points accordingly.
Show a small formation icon in the wave callout.
```

---

## Priority 3: Train Feel and Visual Identity

### [ ] Unified Ground Shadow

**What**: A single soft shadow path under the whole train, broken only at couplings.

**Why**: Grounds the machine and makes length legible at a glance.

### [ ] Headlight Scan Cone

**What**: The engine casts a subtle cone light that sweeps with pointer direction.

**Why**: Reinforces "commander on the front cab" and aids orientation.

### [ ] Heat Vent Glow

**What**: Vents glow and exhaust pulses scale with sustained firing.

**Why**: Shows combat intensity without adding new mechanics.

---

## Priority 4: Train-Specific Threats (Always Telegraphed)

### [ ] Harpooner Enemy

**What**: Fires a tether at a mid-car; if it connects, it drags that car sideways until destroyed.

**Why**: Attacks the spine identity, not just HP.

[SCAFFOLDING]
```
Enemy has a tether state: aim -> fire -> drag.
Drag applies a small lateral offset to the targeted car for ~1s.
```

### [ ] Clamp Mine Layer

**What**: Drops slow-moving mines that latch onto the first car they touch.

**Why**: Creates a visible, solve-by-steering problem with no new inputs.

[SCAFFOLDING]
```
On attach, apply a brief turn-rate penalty and a flashing countdown ring.
Destroy the mine when its timer ends or when shot.
```
