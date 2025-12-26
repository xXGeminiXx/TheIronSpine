# Color Synergy System Implementation Guide

## Overview
The Color Synergy Bonus System rewards diverse train compositions with team-up effects between colors. This implementation follows the combo.js pattern for buff management with clear visual feedback.

## Files Created

### 1. `src/systems/synergy.js`
✅ **COMPLETE** - Full synergy manager implementation with:
- SynergyManager class
- Synergy condition checking
- Effect caching for combat lookups
- Event handlers for activation/deactivation

## Files to Update

### 2. `src/config.js`
✅ **COMPLETE** - Added SYNERGY configuration section with:
```javascript
export const SYNERGY = Object.freeze({
    enabled: true,
    redBlue: { requiredRed: 2, requiredBlue: 2, redBonusVsFrozen: 0.25 },
    blueYellow: { requiredBlue: 2, requiredYellow: 2, freezeDuration: 2.0, freezePercent: 0.8 },
    redYellow: { requiredRed: 2, requiredYellow: 2, igniteDamagePerSecond: 5, igniteDuration: 3.0 },
    triForce: { requiredRed: 2, requiredBlue: 2, requiredYellow: 2, globalFireRateBonus: 0.15 }
});
```

### 3. `src/scenes/game-scene.js`
**TODO** - Manual integration required (linter is modifying file):

#### Step 1: Import SynergyManager
Add to imports section (line ~83):
```javascript
import { SynergyManager } from '../systems/synergy.js';
```

#### Step 2: Import SYNERGY config
Add to config imports (line ~41):
```javascript
    SYNERGY,
```

#### Step 3: Create synergy system in create()
Add after weather system (line ~322):
```javascript
// Synergy system - rewards diverse train compositions
if (SYNERGY.enabled) {
    this.synergy = new SynergyManager(this.train, {
        onSynergyActivated: (key, config) => {
            this.onSynergyActivated(key, config);
        },
        onSynergyDeactivated: (key, config) => {
            this.onSynergyDeactivated(key, config);
        }
    });
}
```

#### Step 4: Update synergy in update()
Add after combo.update() (line ~437):
```javascript
if (this.synergy) {
    this.synergy.update(deltaSeconds);
}
```

#### Step 5: Cleanup synergy
Add to cleanup() method (line ~383):
```javascript
if (this.synergy) {
    this.synergy.clear();
}
```

#### Step 6: Add event handlers (end of class)
```javascript
onSynergyActivated(key, config) {
    if (this.hud && typeof this.hud.showSynergyActivated === 'function') {
        this.hud.showSynergyActivated(key, config);
    }
    this.audio.playMerge(); // Reuse merge sound for synergy activation
}

onSynergyDeactivated(key, config) {
    // Visual feedback when synergy is lost
    if (this.hud && typeof this.hud.showSynergyDeactivated === 'function') {
        this.hud.showSynergyDeactivated(key, config);
    }
}
```

### 4. `src/systems/combat.js`
**TODO** - Manual integration for damage calculations:

#### Step 1: Update applyProjectileDamage() method
Add after line 895 (armor calculation):
```javascript
// Apply synergy bonuses
if (this.scene.synergy) {
    // Red + Blue: Frozen targets take +25% Red damage
    if (projectile.colorKey === 'red' && enemy.slowTimer > 0) {
        const redBonus = this.scene.synergy.getRedBonusVsFrozen();
        damage *= redBonus;
    }

    // Blue + Yellow: Yellow pierces freeze enemies
    if (projectile.colorKey === 'yellow' && projectile.armorPierce > 0) {
        if (this.scene.synergy.shouldYellowFreezeOnPierce()) {
            const freezeEffect = this.scene.synergy.getYellowFreezeEffect();
            if (freezeEffect) {
                enemy.slowMultiplier = 1 - freezeEffect.percent;
                enemy.slowTimer = Math.max(enemy.slowTimer, freezeEffect.duration);
            }
        }
    }

    // Red + Yellow: Yellow explosions ignite (DoT)
    if (projectile.colorKey === 'yellow') {
        if (this.scene.synergy.shouldYellowIgnite()) {
            const igniteEffect = this.scene.synergy.getYellowIgniteEffect();
            if (igniteEffect) {
                this.applyIgniteEffect(enemy, igniteEffect);
            }
        }
    }
}
```

#### Step 2: Add ignite effect system
Add new method to CombatSystem class:
```javascript
applyIgniteEffect(enemy, effect) {
    if (!enemy.igniteDamage) {
        enemy.igniteDamage = 0;
        enemy.igniteDuration = 0;
    }

    // Refresh ignite effect (doesn't stack, just refreshes)
    enemy.igniteDamage = effect.damagePerSecond;
    enemy.igniteDuration = Math.max(enemy.igniteDuration, effect.duration);
}
```

#### Step 3: Update enemy DoT in updateEnemies()
Add after line 115 (slow timer update):
```javascript
// Update ignite DoT
if (enemy.igniteDuration > 0) {
    enemy.igniteDuration = Math.max(0, enemy.igniteDuration - deltaSeconds);
    if (enemy.igniteDamage > 0) {
        const dotDamage = enemy.igniteDamage * deltaSeconds;
        enemy.hp = Math.max(0, enemy.hp - dotDamage);

        // Show damage number for DoT
        if (this.damageNumbers) {
            this.damageNumbers.show(enemy.x, enemy.y - enemy.radius, dotDamage, {
                isCritical: false,
                isSlowApplied: false,
                isArmorPierced: false,
                isOverkill: false,
                isDoT: true
            });
        }
    }
}
```

#### Step 4: Apply Tri-Force fire rate bonus
Modify getWeaponStatsForTier() method (line ~1280):
Add before return statement:
```javascript
// Apply Tri-Force synergy bonus
if (this.scene.synergy) {
    const fireRateBonus = this.scene.synergy.getFireRateBonus();
    if (fireRateBonus > 1.0 && stats.fireRate) {
        stats.fireRate *= fireRateBonus;
    }
}
```

### 5. `src/systems/hud.js`
**TODO** - Add synergy display:

#### Add synergy icon row
Add new method to Hud class:
```javascript
drawSynergyIcons(activeSynergies) {
    const { width, height } = this.scene.scale;
    const iconSize = 32 * this.uiScale;
    const spacing = 8 * this.uiScale;
    const startX = width / 2 - (activeSynergies.length * (iconSize + spacing)) / 2;
    const y = height - 60 * this.uiScale;

    activeSynergies.forEach((synergy, index) => {
        const x = startX + index * (iconSize + spacing);
        const config = synergy.config;

        // Draw icon background
        this.graphics.fillStyle(0x000000, 0.6);
        this.graphics.fillRoundedRect(x, y, iconSize, iconSize, 4);

        // Draw icon
        this.text.setText(config.icon);
        this.text.setPosition(x + iconSize / 2, y + iconSize / 2);
        this.text.setOrigin(0.5);
        this.text.setFontSize(18 * this.uiScale);
        this.text.draw();

        // Draw description on hover (future enhancement)
    });
}
```

#### Update render() method
Add synergy icon rendering:
```javascript
// Draw active synergies
if (this.scene.synergy) {
    const activeSynergies = this.scene.synergy.getActiveSynergies();
    if (activeSynergies.length > 0) {
        this.drawSynergyIcons(activeSynergies);
    }
}
```

#### Add activation notifications
```javascript
showSynergyActivated(key, config) {
    const text = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 50,
        `${config.name.toUpperCase()} ACTIVATED!`,
        {
            fontSize: '32px',
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 6,
            fontStyle: 'bold'
        }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(150);
    text.setAlpha(0);

    this.scene.tweens.add({
        targets: text,
        alpha: 1,
        scale: { from: 0.5, to: 1 },
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
            this.scene.tweens.add({
                targets: text,
                alpha: 0,
                y: text.y - 40,
                duration: 800,
                delay: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => text.destroy()
            });
        }
    });
}
```

## Testing Checklist

- [ ] Red + Blue synergy: Collect 2+ red and 2+ blue cars, verify frozen enemies take +25% damage from red
- [ ] Blue + Yellow synergy: Collect 2+ blue and 2+ yellow, verify yellow pierces freeze enemies
- [ ] Red + Yellow synergy: Collect 2+ red and 2+ yellow, verify yellow hits apply ignite DoT
- [ ] Tri-Force synergy: Collect 2+ of each color (red, blue, yellow), verify +15% fire rate
- [ ] Synergy activation notification appears when conditions met
- [ ] Synergy icons display at bottom of screen when active
- [ ] Synergy deactivates when car count drops below threshold
- [ ] Combat damage modifiers apply correctly with synergies
- [ ] DoT damage numbers show correctly for ignite effect
- [ ] Fire rate bonus applies to all weapon types

## Implementation Notes

1. **Synergy Priority**: If multiple synergies apply bonuses to the same stat, take the maximum (not additive)
2. **DoT System**: Ignite effect uses simple timer-based damage per second
3. **Visual Feedback**: Icons use emoji for quick implementation (can be replaced with custom graphics later)
4. **Performance**: Synergy state recalculated each frame but uses cached effects for lookups
5. **Config-Driven**: All synergy effects tunable via SYNERGY config in config.js

## Future Enhancements

- [ ] Synergy tooltips on hover
- [ ] Particle effects when synergies activate
- [ ] Synergy achievement tracking
- [ ] Additional synergies for purple/orange colors
- [ ] Synergy combo with achievements (e.g., "Win with all synergies active")
