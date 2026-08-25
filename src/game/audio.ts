import Phaser from 'phaser';

/**
 * Zero-asset sound effects synthesized with the Web Audio API.
 * The context is created lazily on first use (always a user gesture,
 * satisfying autoplay policies).
 */
class Sfx {
  enabled = true;

  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      this.enabled = false;
      return null;
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise || this.noise.sampleRate !== ctx.sampleRate) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    return this.noise;
  }

  /** Slingshot release: filtered noise sweep, brighter + louder with power. */
  flick(power = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(900 + power * 1600, t + 0.16);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 + power * 0.14, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.25);
  }

  /** Soft paper/wood thump when the sharpener settles. */
  thud(strength = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = Phaser.Math.Clamp(strength, 0.15, 1);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 + s * 60, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.10 + s * 0.16, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Target hit: quick two-note marker-pen pluck. */
  hit() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [
      [660, 0],
      [990, 0.07],
    ].forEach(([freq, dt]) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.16, t + dt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22);

      osc.connect(g).connect(ctx.destination);
      osc.start(t + dt);
      osc.stop(t + dt + 0.25);
    });
  }

  /** Level clear arpeggio. */
  win() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.14, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);

      osc.connect(g).connect(ctx.destination);
      osc.start(st);
      osc.stop(st + 0.35);
    });
  }

  /** Out of attempts: gentle descending buzz, not harsh. */
  lose() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [330, 262].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      const st = t + i * 0.14;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.07, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.28);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;

      osc.connect(lp).connect(g).connect(ctx.destination);
      osc.start(st);
      osc.stop(st + 0.32);
    });
  }
}

export const sfx = new Sfx();
