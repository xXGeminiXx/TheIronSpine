# Iron Spine v1.4.0 - New Systems Integration Guide

**Created**: 2025-12-25 (Christmas Night Update)
**Status**: Ready for Integration

This document provides step-by-step instructions for integrating the 8 new systems added in v1.4.0.

---

## New Systems Overview

| System | File | Priority | Impact |
|--------|------|----------|--------|
| Attack Telegraphs | `src/systems/telegraph.js` | P2 | Combat Fairness |
| Threat Indicators | `src/systems/threat-indicator.js` | P2 | Situational Awareness |
| Combo System | `src/systems/combo.js` | P5 | Combat Depth |
| Critical Hits | `src/systems/critical-hits.js` | P5 | Combat Variety |
| Screen Effects | `src/systems/screen-effects.js` | P9 | Visual Polish |
| Weather System | `src/systems/weather.js` | P3 | Procedural Showcase |
| Procedural Bosses | `src/systems/boss-gen.js` | P3 | Procedural Showcase |
| Config Updates | `src/config.js` | - | Configuration |

---

## Quick Integration Checklist

- [ ] Import all new systems in `game-scene.js`
- [ ] Initialize systems in `create()` method
- [ ] Update combat system to support combo/crit
- [ ] Add telegraph calls before enemy attacks
- [ ] Update camera/HUD for threat indicators
- [ ] Integrate weather modifiers into spawner
- [ ] Replace static boss with procedural generation
- [ ] Update `BUILD.version` to `v1.4.0`
- [ ] Test all systems independently
- [ ] Test system interactions
- [ ] Update CHANGELOG.md

---

## Step 1: Import New Systems

Add these imports to `src/scenes/game-scene.js`:

```javascript
import { TelegraphSystem } from '../systems/telegraph.js';
import { ThreatIndicatorSystem } from '../systems/threat-indicator.js';
import { ComboSystem } from '../systems/combo.js';
import { CriticalHitSystem, spawnCritEffect } from '../systems/critical-hits.js';
import { ScreenEffectsSystem } from '../systems/screen-effects.js';
import { WeatherSystem } from '../systems/weather.js';
import { generateBoss, spawnBoss, updateBoss, getBossDamageMultiplier } from '../systems/boss-gen.js';
import { COMBO, CRIT, WEATHER, TELEGRAPH, THREAT, PROC_BOSS } from '../config.js';
```

---

## Step 2: Initialize Systems in GameScene

In `game-scene.js` `create()` method, after existing systems:

```javascript
// New systems initialization
this.telegraph = new TelegraphSystem(this);
this.threatIndicators = new ThreatIndicatorSystem(this);
this.screenEffects = new ScreenEffectsSystem(this);

// Combo system with event handlers
this.combo = new ComboSystem({
    onComboGain: (count, multiplier) => {
        // Update HUD with combo info
        if (this.hud && this.hud.updateCombo) {
            this.hud.updateCombo(count, multiplier);
        }
    },
    onComboLost: () => {
        // Clear combo display
        if (this.hud && this.hud.clearCombo) {
            this.hud.clearCombo();
        }
    },
    onMilestone: (kills, label) => {
        // Show milestone callout
        this.showComboMilestone(label);
    }
});

this.critSystem = new CriticalHitSystem();

// Weather system (if enabled)
if (WEATHER.enabled) {
    this.weather = new WeatherSystem(this);
}
```

---

## Step 3: Update Game Loop

In `game-scene.js` `update()` method:

```javascript
update(time, delta) {
    const deltaSeconds = delta / 1000;

    // ... existing update code ...

    // Update new systems
    if (this.telegraph) {
        this.telegraph.update(deltaSeconds);
    }

    if (this.threatIndicators) {
        this.threatIndicators.update(this.combat.enemies, this.cameras.main);
    }

    if (this.combo) {
        this.combo.update(deltaSeconds);
    }

    if (this.weather) {
        this.weather.update(deltaSeconds, this.cameras.main);
    }

    // Screen effects (update based on game state)
    if (this.screenEffects) {
        const hpPercent = this.train.engine.hp / this.train.engine.maxHp;
        const comboMultiplier = this.combo ? this.combo.getMultiplier() : 1.0;
        this.screenEffects.update({
            hpPercent,
            comboMultiplier,
            deltaSeconds
        });
    }

    // ... rest of update code ...
}
```

---

## Step 4: Integrate Combo System into Combat

In `src/systems/combat.js`, modify `destroyEnemyAtIndex()`:

```javascript
destroyEnemyAtIndex(index) {
    const [enemy] = this.enemies.splice(index, 1);
    this.cleanupEnemy(enemy);
    enemy.sprite.destroy();
    this.stats.enemiesDestroyed += 1;

    if (this.eventHandlers.onEnemyDestroyed) {
        this.eventHandlers.onEnemyDestroyed(enemy);
    }

    // NEW: Register kill with combo system
    if (this.scene.combo) {
        this.scene.combo.onKill();
    }
}
```

Modify `applyProjectileDamage()` to apply combo multiplier:

```javascript
applyProjectileDamage(projectile, enemy) {
    const effectiveArmor = enemy.armor * (1 - projectile.armorPierce);
    let damage = Math.max(0, projectile.damage - effectiveArmor);

    // NEW: Apply combo multiplier
    if (this.scene.combo) {
        damage *= this.scene.combo.getMultiplier();
    }

    // NEW: Apply crit multiplier if projectile is crit
    if (projectile.isCrit) {
        damage *= projectile.critMultiplier;
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    this.flashEnemy(enemy);

    // NEW: Show crit effect
    if (projectile.isCrit && this.scene.vfx) {
        spawnCritEffect(
            this.scene,
            { x: projectile.x, y: projectile.y },
            projectile.color || 0xffffff,
            damage
        );
    }

    if (projectile.slowPercent > 0) {
        enemy.slowMultiplier = 1 - projectile.slowPercent;
        enemy.slowTimer = Math.max(enemy.slowTimer, projectile.slowDuration);
    }
}
```

---

## Step 5: Integrate Critical Hits

In `src/systems/combat.js`, modify `spawnProjectile()`:

```javascript
spawnProjectile(car, target, weaponStats, source = 'car', tier = null, sourceSegment = null) {
    // ... existing code ...

    // NEW: Roll for critical hit
    let isCrit = false;
    let critMultiplier = 1.0;
    if (this.scene.critSystem) {
        const critRoll = this.scene.critSystem.rollCrit(car.colorKey);
        isCrit = critRoll.isCrit;
        critMultiplier = critRoll.multiplier;
    }

    const projectile = {
        id: projectileId,
        colorKey: car.colorKey,
        x: car.x,
        y: car.y,
        velocity: {
            x: velocity.x * speed,
            y: velocity.y * speed
        },
        speed,
        range: weaponStats.range,
        travelled: 0,
        damage: weaponStats.damage,
        slowPercent: weaponStats.slowPercent || 0,
        slowDuration: weaponStats.slowDuration || 0,
        armorPierce: weaponStats.armorPierce || 0,
        radius,
        sprite,
        trailData,
        isCrit,           // NEW
        critMultiplier,   // NEW
        color: COLORS[car.colorKey] ? COLORS[car.colorKey].phaser : 0xffffff  // NEW
    };

    // NEW: Visual enhancement for crits
    if (isCrit) {
        sprite.setScale(CRIT.scaleMultiplier);
        sprite.setAlpha(1.0);
    }

    this.projectiles.push(projectile);
    // ... rest of method ...
}
```

---

## Step 6: Integrate Attack Telegraphs

In `src/systems/combat.js`, modify `tryRangerFire()`:

```javascript
tryRangerFire(enemy, engine, deltaSeconds) {
    const fireCooldown = enemy.fireCooldown || ENEMIES.ranger.fireCooldown;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaSeconds);

    if (enemy.attackCooldown > 0) {
        return;
    }

    // NEW: Start telegraph before firing
    const target = { x: engine.x, y: engine.y };
    if (this.scene.telegraph && !enemy.telegraph) {
        this.scene.telegraph.startTelegraph(
            enemy,
            'RANGER_AIM',
            target,
            () => {
                // Fire after telegraph completes
                this.spawnEnemyProjectile(enemy, target);
            }
        );
        enemy.attackCooldown = fireCooldown;
    }
}
```

Apply similar pattern for Champion and Boss attacks.

---

## Step 7: Integrate Weather Modifiers

In `src/systems/spawner.js`, modify spawn calculations:

```javascript
// Get weather modifiers
let weatherMods = { enemyDetectionRange: 1.0, pickupSpawnRate: 1.0 };
if (this.scene.weather) {
    weatherMods = this.scene.weather.getModifiers();
}

// Apply to enemy spawn padding
const baseSpawnPadding = SPAWN.spawnPadding;
const adjustedPadding = baseSpawnPadding * weatherMods.enemyDetectionRange;

// Apply to pickup spawn rate
const basePickupInterval = SPAWN.pickupSpawnMinSeconds;
const adjustedInterval = basePickupInterval / weatherMods.pickupSpawnRate;
```

---

## Step 8: Integrate Procedural Bosses

In `src/systems/spawner.js`, modify boss spawning:

```javascript
spawnBoss() {
    const waveNumber = this.currentWave;
    const difficulty = Math.min(
        Math.floor(waveNumber * PROC_BOSS.difficultyPerWave),
        PROC_BOSS.maxDifficulty
    );

    if (PROC_BOSS.enabled) {
        // NEW: Generate procedural boss
        const bossConfig = generateBoss(difficulty);
        const position = this.getSpawnPosition();
        const boss = spawnBoss(this.scene, bossConfig, position);

        // Register with combat system as special enemy
        this.scene.combat.enemies.push({
            ...boss,
            type: 'boss',
            isProcedural: true
        });
    } else {
        // Fallback to static boss
        this.scene.combat.spawnEnemy('boss', this.getSpawnPosition());
    }
}
```

Update boss update loop in combat system:

```javascript
updateEnemies(deltaSeconds) {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
        const enemy = this.enemies[index];

        // NEW: Update procedural bosses
        if (enemy.isProcedural && enemy.config) {
            updateBoss(enemy, this.train, deltaSeconds);

            // Check collision with weak points
            const collisionSegment = this.findCollisionSegment(enemy);
            if (collisionSegment) {
                this.handleEnemyCollision(enemy, collisionSegment);
                this.destroyEnemyAtIndex(index);
            }
            continue;
        }

        // ... existing enemy update code ...
    }
}
```

---

## Step 9: Update HUD to Display New Info

Add to `src/systems/hud.js`:

```javascript
// Combo display
drawCombo(combo, multiplier) {
    if (!combo || combo < 5) {
        return; // Don't show until combo >= 5
    }

    const x = this.width - 200;
    const y = 100;

    this.add.text(x, y, `COMBO: ${combo}`, {
        fontSize: '28px',
        fontFamily: UI.fontFamily,
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);

    this.add.text(x, y + 35, `${multiplier.toFixed(1)}x DAMAGE`, {
        fontSize: '20px',
        fontFamily: UI.fontFamily,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
}

// Weather display
drawWeather(weatherName) {
    if (weatherName === 'Clear') {
        return;
    }

    this.add.text(this.width / 2, 50, weatherName, {
        fontSize: '18px',
        fontFamily: UI.fontFamily,
        color: '#aaddff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
}
```

---

## Step 10: Update Config Version

In `src/config.js`:

```javascript
export const BUILD = Object.freeze({
    version: 'v1.4.0'
});
```

---

## Step 11: Testing Checklist

### Individual System Tests

- [ ] **Telegraph**: Ranger shows laser before firing
- [ ] **Threat**: Arrows appear when enemies off-screen
- [ ] **Combo**: 5 kills shows "ROLLING", multiplier applies
- [ ] **Crit**: Yellow cars have more frequent large hits
- [ ] **Screen FX**: Low HP shows red vignette
- [ ] **Weather**: Storm spawns lightning, fog reduces detection
- [ ] **Boss Gen**: Each boss wave spawns unique boss

### Integration Tests

- [ ] Combo multiplier affects crit damage
- [ ] Weather modifiers affect enemy spawn distances
- [ ] Telegraph works with all enemy types
- [ ] Screen effects respond to combo milestones
- [ ] Boss weak points give 2x damage
- [ ] All systems clean up properly on scene end

---

## Optional Enhancements

### Add Combo Milestone Callout

```javascript
showComboMilestone(label) {
    const text = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        label,
        {
            fontSize: '64px',
            fontFamily: UI.fontFamily,
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 6
        }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(100);

    this.tweens.add({
        targets: text,
        scale: 1.5,
        alpha: 0,
        y: text.y - 100,
        duration: 1500,
        ease: 'Cubic.easeOut',
        onComplete: () => text.destroy()
    });
}
```

### Add Boss Intro Sequence

```javascript
onBossSpawn(boss) {
    if (this.screenEffects) {
        this.screenEffects.desaturate(800, 0.7);
    }

    // Show boss name/title
    const title = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 100,
        'WARNING',
        {
            fontSize: '48px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 5
        }
    );
    title.setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.tweens.add({
        targets: title,
        alpha: 0,
        duration: 2000,
        delay: 1000,
        onComplete: () => title.destroy()
    });
}
```

---

## Performance Notes

**Target Performance**: 60 FPS on mid-range hardware

**System Costs** (approximate):
- Telegraph: ~1-2ms (max 10 active)
- Threat Indicators: <1ms (fixed pool)
- Combo: <0.1ms (simple state)
- Crit: <0.1ms (roll per projectile)
- Screen Effects: ~2-3ms (gradient rendering)
- Weather: ~3-5ms (particle updates)
- Boss Gen: ~1-2ms per boss

**Total Added Cost**: ~8-15ms per frame (depends on active systems)

**Optimization Tips**:
- Disable weather on low-end devices
- Reduce max weather particles (150 -> 80)
- Lower telegraph pulse frequency
- Use object pooling for all particles

---

## Troubleshooting

### Combo not working
- Check that `onKill()` is called in `destroyEnemyAtIndex()`
- Verify combo multiplier is applied in damage calculation
- Check event handlers are connected

### Telegraph not showing
- Ensure `startTelegraph()` is called before attacks
- Check graphics depth (should be 13)
- Verify telegraph timer is updating

### Weather particles not visible
- Check camera scrollFactor (should follow world)
- Verify particle depth (should be 45)
- Check weather is enabled in config

### Boss not procedural
- Verify `PROC_BOSS.enabled = true` in config
- Check boss generation happens before spawn
- Look for errors in browser console

---

## What's Next?

After integrating these systems, consider:

1. **Balancing**: Tune combo tiers and crit chances
2. **Visual Polish**: Add more particle effects
3. **Sound**: Integrate audio cues for combo/crit
4. **Stats**: Track and display new metrics on end screen
5. **Achievements**: Add achievements for combo/crit milestones

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all imports are correct
3. Test systems individually before combining
4. Review the scaffolding in each system file

---

**Happy coding, and Merry Christmas!** 🎄
