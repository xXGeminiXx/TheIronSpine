/**
 * audio.js - Procedural audio system
 *
 * Uses the Web Audio API to synthesize lightweight SFX and a looping engine tone.
 * No external assets or build steps required.
 */

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.context = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;

        this.unlocked = false;
        this.lastWeaponTime = {
            red: 0,
            blue: 0,
            yellow: 0
        };
        this.lastEnemyShotTime = 0;
        this.lastBoostTime = 0;
        this.lastReorderTime = 0;
    }

    unlock() {
        if (this.unlocked) {
            return;
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.context.destination);

        this.setupEngineLoop();
        this.context.resume();
        this.unlocked = true;
    }

    setupEngineLoop() {
        if (!this.context || this.engineOsc) {
            return;
        }

        this.engineOsc = this.context.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 40;

        this.engineGain = this.context.createGain();
        this.engineGain.gain.value = 0;

        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);
        this.engineOsc.start();
    }

    updateEngine(speedRatio, boosting) {
        if (!this.unlocked || !this.engineOsc || !this.engineGain) {
            return;
        }

        const clamped = Math.max(0, Math.min(speedRatio, 1.6));
        const now = this.context.currentTime;
        const baseFreq = 40 + clamped * 70 + (boosting ? 12 : 0);
        const baseGain = 0.02 + clamped * 0.035 + (boosting ? 0.01 : 0);

        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(baseGain, now, 0.12);
    }

    playWeapon(colorKey) {
        if (!this.unlocked) {
            return;
        }

        const now = this.context.currentTime;
        if (!(colorKey in this.lastWeaponTime)) {
            this.lastWeaponTime[colorKey] = 0;
        }
        const minInterval = {
            red: 0.08,
            blue: 0.18,
            yellow: 0.3
        }[colorKey] || 0.15;

        if (now - this.lastWeaponTime[colorKey] < minInterval) {
            return;
        }

        this.lastWeaponTime[colorKey] = now;

        if (colorKey === 'red') {
            this.playTone({ frequency: 520, duration: 0.05, type: 'square', gain: 0.12 });
        } else if (colorKey === 'blue') {
            this.playTone({ frequency: 320, frequencyEnd: 260, duration: 0.12, type: 'sine', gain: 0.1 });
        } else if (colorKey === 'yellow') {
            this.playTone({ frequency: 160, frequencyEnd: 90, duration: 0.18, type: 'triangle', gain: 0.14 });
        }
    }

    playEnemyShot() {
        if (!this.unlocked) {
            return;
        }
        const now = this.context.currentTime;
        if (now - this.lastEnemyShotTime < 0.2) {
            return;
        }
        this.lastEnemyShotTime = now;
        this.playTone({ frequency: 260, duration: 0.08, type: 'square', gain: 0.08 });
    }

    playMerge() {
        if (!this.unlocked) {
            return;
        }
        this.playTone({ frequency: 260, frequencyEnd: 420, duration: 0.12, type: 'sine', gain: 0.14 });
        this.playTone({ frequency: 420, frequencyEnd: 520, duration: 0.14, type: 'sine', gain: 0.12, delay: 0.06 });
    }

    playExplosion() {
        if (!this.unlocked) {
            return;
        }
        this.playTone({ frequency: 120, frequencyEnd: 60, duration: 0.22, type: 'triangle', gain: 0.18 });
    }

    playPulse() {
        if (!this.unlocked) {
            return;
        }
        this.playTone({ frequency: 80, frequencyEnd: 150, duration: 0.32, type: 'sine', gain: 0.16 });
    }

    playHit() {
        if (!this.unlocked) {
            return;
        }
        this.playTone({ frequency: 180, frequencyEnd: 140, duration: 0.1, type: 'square', gain: 0.1 });
    }

    playBoost() {
        if (!this.unlocked) {
            return;
        }
        const now = this.context.currentTime;
        if (now - this.lastBoostTime < 0.4) {
            return;
        }
        this.lastBoostTime = now;
        this.playTone({ frequency: 220, frequencyEnd: 420, duration: 0.16, type: 'sawtooth', gain: 0.1 });
    }

    playReorder() {
        if (!this.unlocked) {
            return;
        }
        const now = this.context.currentTime;
        if (now - this.lastReorderTime < 0.2) {
            return;
        }
        this.lastReorderTime = now;
        this.playTone({ frequency: 420, duration: 0.08, type: 'sine', gain: 0.08 });
    }

    playTone({
        frequency,
        frequencyEnd = null,
        duration = 0.12,
        type = 'sine',
        gain = 0.1,
        delay = 0
    }) {
        if (!this.context || !this.masterGain) {
            return;
        }

        const osc = this.context.createOscillator();
        const amp = this.context.createGain();
        const now = this.context.currentTime + delay;

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        if (frequencyEnd) {
            osc.frequency.linearRampToValueAtTime(frequencyEnd, now + duration);
        }

        amp.gain.setValueAtTime(0.0001, now);
        amp.gain.linearRampToValueAtTime(gain, now + 0.02);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(amp);
        amp.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.05);
    }

    destroy() {
        if (this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc.disconnect();
            this.engineOsc = null;
        }
        if (this.engineGain) {
            this.engineGain.disconnect();
            this.engineGain = null;
        }
        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        this.unlocked = false;
    }
}
