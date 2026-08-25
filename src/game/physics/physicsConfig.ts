export const physicsConfig = {
  // Top-down "table" physics: no gravity. The sharpener only moves along the
  // direction it was flicked and is slowed by frictionAir (linear damping).
  gravity: { x: 0, y: 0 },

  // Aiming: direction follows the pointer; power charges over hold time.
  maxLaunchVelocity: 17, // px/tick at 60Hz fixed step
  maxChargeMs: 1600,
  minHoldToFire: 100,

  // Sharpener body (also the displayed size of the sprite) — vertical,
  // matching the aspect of assets/Sharpner/sharpener-cut.png (226x420).
  sharpenerWidth: 47,
  sharpenerHeight: 88,
  density: 0.002,
  friction: 0.5,
  frictionStatic: 0.5,
  restitution: 0.2,
  // Linear/angular damping on the flat plane. At 0.02 a full-power shot
  // (~17 px/tick) glides roughly 850 px before stopping, and settles in ~2.8s.
  frictionAir: 0.02,

  // Page / fail detection
  failMargin: 40,
  // Below this speed the body is hard-stopped; after settledFrames ticks at
  // rest the shot resolves. Scoring only happens at that moment.
  settledSpeed: 0.25,
  settledFrames: 12,
  flightTimeoutTicks: 700,

  // Reset delay after result (ms)
  resetDelay: 750,
};