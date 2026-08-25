import Matter from 'matter-js';

const { Engine, Bodies, Composite, Body } = Matter;

const WORLD = { w: 900, h: 1150 };
const PAGE = { w: 720, h: 1018, x: WORLD.w / 2, y: 66 + 1018 / 2 };
const PAGE_TOP = PAGE.y - PAGE.h / 2;
const PAGE_BOTTOM = PAGE.y + PAGE.h / 2;
const PAGE_LEFT = PAGE.x - PAGE.w / 2;
const PAGE_RIGHT = PAGE.x + PAGE.w / 2;

const DELTA = 1000 / 60;
const START = { x: PAGE.x, y: PAGE_BOTTOM - 40 };
const MAX_DRAG = 240;
const MAX_VELOCITY = 17;

// Phaser world.setGravity(0, 0.47) -> engine.gravity = { y: 0.47, scale: 0.001 } -> ~0.13 px/tick²
const engine = Engine.create({ positionIterations: 6, velocityIterations: 4 });
engine.gravity.y = 0.47;
engine.gravity.scale = 0.001;

const floor = Bodies.rectangle(PAGE.x, PAGE_BOTTOM, PAGE.w, 16, {
  isStatic: true,
  friction: 0.5,
});

const sharpener = Bodies.rectangle(START.x, START.y, 46, 32, {
  friction: 0.5,
  frictionStatic: 0.5,
  restitution: 0.2,
  frictionAir: 0.002,
  density: 0.002,
});

Composite.add(engine.world, [floor, sharpener]);

// pull = pointer - sharpener (screen coords, y down). Launch = opposite of pull.
function runLaunch(pullX, pullY) {
  const len = Math.hypot(pullX, pullY);
  if (len === 0) return null;
  const k = Math.min(len, MAX_DRAG) / len;
  const vx = -pullX * k * (MAX_VELOCITY / MAX_DRAG);
  const vy = -pullY * k * (MAX_VELOCITY / MAX_DRAG);

  Body.setPosition(sharpener, START);
  Body.setVelocity(sharpener, { x: vx, y: vy });
  Body.setAngularVelocity(sharpener, 0);

  let minY = sharpener.position.y;
  let maxSpeed = Math.hypot(vx, vy);
  let offPage = false;
  let offDir = '';
  let settledTick = -1;
  let landed = false;
  let settledFrames = 0;
  let airTime = 0;

  for (let t = 0; t < 900; t++) {
    Engine.update(engine, DELTA);
    const p = sharpener.position;
    const v = sharpener.velocity;
    const speed = Math.hypot(v.x, v.y);
    maxSpeed = Math.max(maxSpeed, speed);
    minY = Math.min(minY, p.y);

    if (p.x < PAGE_LEFT - 40 || p.x > PAGE_RIGHT + 40) {
      offPage = true;
      offDir = 'side';
      break;
    }
    if (p.y > PAGE_BOTTOM + 40) {
      offPage = true;
      offDir = 'bottom';
      break;
    }
    if (speed < 0.5) {
      settledFrames++;
      if (settledFrames > 20) {
        settledTick = t;
        landed = true;
        break;
      }
    } else {
      settledFrames = 0;
      airTime++;
    }
  }

  const clearTop = Math.round(PAGE_TOP - minY);
  return {
    vx: +vx.toFixed(1),
    vy: +vy.toFixed(1),
    maxSpeed: +maxSpeed.toFixed(1),
    clearTop,
    landed,
    settledTick,
    airTime,
    offPage,
    offDir,
    finalX: Math.round(sharpener.position.x),
    finalY: Math.round(sharpener.position.y),
  };
}

console.log('PAGE_TOP', PAGE_TOP, 'PAGE_BOTTOM', PAGE_BOTTOM, 'PAGE_LEFT', PAGE_LEFT, 'PAGE_RIGHT', PAGE_RIGHT);
console.log('--- max straight-up flick (pull down, full power) ---');
console.log(runLaunch(0, 240));
console.log('--- medium up-left flick ---');
console.log(runLaunch(180, 120));
console.log('--- short tap flick ---');
console.log(runLaunch(80, 60));
console.log('--- flat flick (no lift, pulled left) ---');
console.log(runLaunch(240, 0));
console.log('--- downward flick at footer (pull up) ---');
console.log(runLaunch(0, -80));
console.log('--- pull left+down (launch up-right, 70%) ---');
console.log(runLaunch(-170, 170));
