// Visual effects for space and for boarding. This watches the game state for new explosions,
// shots and so on and adds particles for them. It never changes the game state.
import { VIEW_W, VIEW_H, ZOOM, COL } from '../config.js';
import { SHIP_GEOM } from '../sim/balance.js';
import { nodeStatus } from '../sim/ship.js';
import { toWorld, forward, headingTo, dist } from '../sim/util.js';
import { hullMax, jumpCharge } from '../sim/upgrades.js';
import { Particles } from './particles.js';
import { lookOf } from './looks.js';
import { steering } from './flames.js';
import { CREW, PIRATE } from '../sim/sides.js';

const FIRE = ['#fff3c4', COL.ochre[3], COL.ochre[2], COL.ember[1], COL.ember[0]];
const SMOKE = ['#6b6f82', '#44475a', '#2a2c3a'];
const ION = [COL.ion[3], COL.ion[2], COL.ion[1], COL.ion[0]];
const ACID = [COL.acid[3], COL.acid[2], COL.acid[1]];
const EMBER = [COL.ember[3], COL.ember[2], COL.ember[1], COL.ember[0]];
const STEEL = ['#ffffff', COL.steel[3], COL.steel[2], COL.steel[1]];
const SECTOR_TINT = [
  ['#141a3c', '#1c2450'],
  ['#2a1a16', '#3a2418'],
  ['#102a2c', '#16383a'],
  ['#22163a', '#30204c'],
  ['#2c1016', '#40161c'],
];

export function createEffects() {
  return {
    space: new Particles(800),
    inside: new Particles(400),
    seen: new WeakSet(),
    shake: 0,
    flash: 0,
    warp: 0,
    ripples: [],
    acc: {},
    nebula: new Map(),
    // How far out the docking arms of each station are, see looks.js.
    arms: new Map(),
    // How hard the frigate's engines burn, as the flames show it. It follows the throttle with a little lag.
    burn: 0,
    offset: { x: 0, y: 0 },
  };
}
export function resetEffects(fx) {
  fx.space.clear();
  fx.inside.clear();
  fx.ripples.length = 0;
  fx.arms.clear();
  fx.shake = 0;
  fx.burn = 0;
}

// Emit `rate` things per second, spread evenly over frames.
function tick(fx, key, rate, dt, fn) {
  fx.acc[key] = (fx.acc[key] || 0) + rate * dt;
  while (fx.acc[key] >= 1) {
    fx.acc[key] -= 1;
    fn();
  }
}

function explode(p, f, big) {
  const s = f.size;
  p.ring(f.x, f.y, s * 0.2, s * 1.5, 0.45 + s / 160, big ? '#fff3c4' : COL.ochre[3], big ? 3 : 2);
  p.burst(f.x, f.y, Math.min(70, Math.round(s * 1.1)), {
    speed: 40 + s * 3.2,
    life: 0.5 + s / 120,
    drag: 2.6,
    size0: 2.5,
    size1: 1,
    colors: FIRE,
    jitter: s * 0.3,
  });
  p.burst(f.x, f.y, Math.min(24, Math.round(s * 0.4)), {
    speed: 20 + s,
    life: 0.5 + s / 90,
    drag: 1.5,
    size0: s * 0.35,
    size1: s * 0.1,
    colors: FIRE,
    glow: true,
    jitter: s * 0.4,
  });
  p.burst(f.x, f.y, Math.min(20, Math.round(s * 0.3)), {
    speed: 14 + s * 0.5,
    life: 1 + s / 60,
    drag: 1.2,
    size0: 3,
    size1: s * 0.28 + 4,
    colors: SMOKE,
    jitter: s * 0.4,
  });
  if (s > 20)
    p.burst(f.x, f.y, Math.min(16, Math.round(s * 0.2)), {
      speed: 30 + s * 1.6,
      life: 1.2 + s / 80,
      drag: 0.8,
      size0: 3,
      size1: 2,
      colors: ['#5d6174', '#3a3d4e', '#2a2c3a'],
      jitter: s * 0.3,
    });
}

const rnd = (spread) => (Math.random() - 0.5) * spread;
const once = (fx, thing) => {
  if (fx.seen.has(thing)) return false;
  fx.seen.add(thing);
  return true;
};

// New explosions, hits and jumps that the game reports.
function watchBlasts(fx, state, near) {
  const ship = state.ship;
  const p = fx.space;
  for (const f of state.fx) {
    if (!once(fx, f) || !near(f, 200)) continue;
    const away = dist(f.x, f.y, ship.x, ship.y);
    if (f.type === 'boom') {
      explode(p, f, f.size > 60);
      fx.shake = Math.min(9, fx.shake + f.size / 14 / (1 + away / 300));
      if (f.size > 60) fx.flash = Math.max(fx.flash, 0.5);
    } else if (f.type === 'hit') {
      p.burst(f.x, f.y, 6, { speed: 70, life: 0.3, drag: 3, size0: 2, size1: 1, colors: FIRE });
      if (away < 40) fx.shake = Math.min(6, fx.shake + 1.6);
    } else if (f.type === 'shield') {
      p.burst(f.x, f.y, 5, { speed: 50, life: 0.35, drag: 3, size0: 2, size1: 1, colors: ION });
      if (away < 80) fx.ripples.push({ a: headingTo(f.x - ship.x, f.y - ship.y) - ship.heading, t: 0 });
    } else if (f.type === 'warp') {
      // Another ship jumping in or out.
      p.ring(f.x, f.y, 6, 90, 0.6, COL.ion[3], 3);
      p.burst(f.x, f.y, 14, { speed: 90, life: 0.5, drag: 2, size0: 2, size1: 1, colors: ION });
    } else if (f.type === 'jump') {
      fx.flash = 1;
      fx.warp = 0.7;
      p.clear();
      p.ring(f.x, f.y, 10, 320, 0.8, COL.ion[3], 4);
    }
  }
}

// A muzzle flash for every new bolt, and sparks along every new heavy laser beam.
function watchShots(fx, state, near) {
  const p = fx.space;
  for (const b of state.bolts) {
    if (!once(fx, b) || !near(b)) continue;
    const colors = b.side === CREW ? (b.small ? ION : FIRE) : b.side === PIRATE ? ACID : STEEL;
    p.add({ x: b.x, y: b.y, life: 0.09, size0: b.small ? 6 : 11, size1: 3, glow: true, colors });
    const look = { angle: Math.atan2(b.vy, b.vx), spread: 0.7, speed: 90, life: 0.15, drag: 4, size0: 1.5, size1: 1 };
    p.burst(b.x, b.y, 2, { ...look, colors });
  }
  for (const b of state.beams) {
    if (!once(fx, b)) continue;
    fx.shake = Math.min(8, fx.shake + 4);
    const n = 40;
    const a = Math.atan2(b.y1 - b.y0, b.x1 - b.x0);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const side = a + (Math.PI / 2) * (i % 2 ? 1 : -1);
      const look = { angle: side, spread: 0.8, speed: 50, life: 0.5, drag: 3, size0: 2, size1: 1, colors: ION };
      p.burst(b.x0 + (b.x1 - b.x0) * u, b.y0 + (b.y1 - b.y0) * u, 1, look);
    }
    p.add({ x: b.x0, y: b.y0, life: 0.25, size0: 34, size1: 8, glow: true, colors: ION });
  }
}

// What trails behind and around the frigate: engine exhaust, smoke from damage, and the glow of
// the jump drive and the heavy laser as they charge.
function shipTrails(fx, state, dt) {
  const ship = state.ship;
  const p = fx.space;
  if (state.over) return;
  const f = forward(ship.heading);
  const th = Math.max(0, ship.throttle);
  if (!ship.docked && th > 0.05) {
    tick(fx, 'engine', 34 * th * (ship.boosting ? 2.4 : 1), dt, () => {
      const n = toWorld(ship, { x: Math.random() < 0.5 ? -6 : 6, y: 52 });
      p.add({
        x: n.x,
        y: n.y,
        vx: ship.vx - f.x * (50 + Math.random() * 40) + rnd(16),
        vy: ship.vy - f.y * (50 + Math.random() * 40) + rnd(16),
        life: 0.35 + Math.random() * 0.3,
        drag: 1.5,
        size0: 2.5,
        size1: 1,
        colors: ship.boosting ? ['#ffffff', ...FIRE] : ION,
      });
    });
    // Sparks that break loose from the flames.
    tick(fx, 'sparks', 9 * th * (ship.boosting ? 2.5 : 1), dt, () => {
      const n = toWorld(ship, { x: Math.random() < 0.5 ? -6 : 6, y: 56 });
      p.add({
        x: n.x,
        y: n.y,
        vx: ship.vx - f.x * (90 + Math.random() * 70) + rnd(50),
        vy: ship.vy - f.y * (90 + Math.random() * 70) + rnd(50),
        life: 0.25 + Math.random() * 0.25,
        drag: 2.2,
        size0: 1.2,
        size1: 0.6,
        colors: ship.boosting ? FIRE : ION,
      });
    });
    if (ship.boosting) {
      tick(fx, 'boost', 16, dt, () => {
        const n = toWorld(ship, { x: 0, y: 54 });
        p.add({
          x: n.x,
          y: n.y,
          vx: ship.vx * 0.6,
          vy: ship.vy * 0.6,
          life: 0.3,
          size0: 14,
          size1: 4,
          glow: true,
          colors: FIRE,
        });
      });
    }
  }
  for (const [i, t] of steering(ship).entries()) {
    tick(fx, 'steer' + i, 14 * t.power, dt, () => {
      const n = toWorld(ship, { x: t.x, y: t.y + t.way * 4 });
      const out = t.way * (40 + Math.random() * 30);
      p.add({
        x: n.x,
        y: n.y,
        vx: ship.vx - f.x * out + rnd(14),
        vy: ship.vy - f.y * out + rnd(14),
        life: 0.18 + Math.random() * 0.15,
        drag: 2.5,
        size0: 1.4,
        size1: 0.6,
        colors: ION,
      });
    });
  }
  const hurt = ship.nodes.filter((n) => nodeStatus(n.hp) !== 'ok');
  if (hurt.length || ship.hull < hullMax(ship) * 0.4) {
    tick(fx, 'smoke', 3 + hurt.length * 2.5, dt, () => {
      const pool = hurt.length ? hurt : SHIP_GEOM.nodes;
      const n = pool[Math.floor(Math.random() * pool.length)];
      const w = toWorld(ship, n);
      p.add({
        x: w.x,
        y: w.y,
        vx: ship.vx * 0.4 + rnd(10),
        vy: ship.vy * 0.4 + rnd(10),
        life: 0.9 + Math.random() * 0.6,
        drag: 0.8,
        size0: 2,
        size1: 7,
        colors: SMOKE,
      });
      const critical = n.hp !== undefined && nodeStatus(n.hp) === 'critical';
      if (critical && Math.random() < 0.5) {
        p.burst(w.x, w.y, 2, { speed: 50, life: 0.3, drag: 3, size0: 1.5, size1: 1, colors: FIRE });
      }
    });
  }
  // Motes drawn in towards a point, faster the closer the charge is to full.
  const drawnIn = (x, y, r, pull, life, size1) => {
    const a = Math.random() * 7;
    p.add({
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r,
      vx: ship.vx - Math.cos(a) * r * pull,
      vy: ship.vy - Math.sin(a) * r * pull,
      life,
      drag: 0,
      size0: 1.5,
      size1,
      colors: ION,
    });
  };
  if (state.jump) {
    const u = state.jump.t / jumpCharge(ship);
    tick(fx, 'jump', 20 + u * 90, dt, () => drawnIn(ship.x, ship.y, 150 - u * 50, 1.6, 0.55, 2.5));
  }
  if (ship.charge > 0) {
    const nose = toWorld(ship, SHIP_GEOM.nose);
    tick(fx, 'charge', 30 * ship.charge + 8, dt, () => drawnIn(nose.x, nose.y, 26, 2.6, 0.36, 2));
  }
}

// Exhaust behind other ships, Darts and rockets, smoke from ships that are badly hurt, and a glint on salvage.
function otherTrails(fx, state, near, dt) {
  const p = fx.space;
  for (const e of state.vessels) {
    if (!near(e)) continue;
    const exhaust = lookOf(e).exhaust;
    const ef = forward(e.heading);
    tick(fx, 'p' + e.id, exhaust.rate, dt, () => {
      const n = toWorld(e, { x: rnd(exhaust.width), y: exhaust.y });
      p.add({
        x: n.x,
        y: n.y,
        vx: e.vx - ef.x * 40 + rnd(10),
        vy: e.vy - ef.y * 40 + rnd(10),
        life: 0.3 + Math.random() * 0.25,
        drag: 1.5,
        size0: exhaust.size,
        size1: 1,
        colors: e.side === PIRATE ? EMBER : ION,
      });
    });
    if (e.hp < e.hpMax * 0.5) {
      tick(fx, 's' + e.id, 5, dt, () => {
        p.add({
          x: e.x + rnd(8),
          y: e.y + rnd(8),
          vx: e.vx * 0.3,
          vy: e.vy * 0.3,
          life: 0.8,
          drag: 0.8,
          size0: 2,
          size1: 6,
          colors: SMOKE,
        });
      });
    }
  }
  for (const d of state.darts) {
    if (!near(d)) continue;
    tick(fx, 'd' + d.id, 10, dt, () => {
      const df = forward(d.heading);
      p.add({
        x: d.x - df.x * 9,
        y: d.y - df.y * 9,
        vx: d.vx * 0.3,
        vy: d.vy * 0.3,
        life: 0.25,
        drag: 1,
        size0: 1.5,
        size1: 1,
        colors: ION,
      });
    });
  }
  for (const r of state.rockets) {
    if (!near(r)) continue;
    tick(fx, 'r' + (r.x | 0), 40, dt, () => {
      const rf = forward(r.heading);
      p.add({
        x: r.x - rf.x * 5,
        y: r.y - rf.y * 5,
        vx: rnd(12),
        vy: rnd(12),
        life: 0.5 + Math.random() * 0.3,
        drag: 1,
        size0: 1.5,
        size1: 4.5,
        colors: ['#fff3c4', COL.ochre[2], ...SMOKE],
      });
    });
  }
  for (const c of state.things) {
    if (c.kind !== 'salvage' || !near(c) || Math.random() >= dt * 2) continue;
    p.add({ x: c.x + rnd(8), y: c.y + rnd(8), life: 0.4, size0: 1, size1: 2, colors: [COL.ochre[3], COL.ochre[1]] });
  }
}

// Called once per frame. `dt` is real time, so effects keep moving at a steady pace.
export function updateEffects(fx, state, view, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 14);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  fx.warp = Math.max(0, fx.warp - dt);
  fx.offset = fx.shake > 0.05 ? { x: rnd(fx.shake), y: rnd(fx.shake) } : { x: 0, y: 0 };
  for (const r of fx.ripples) r.t += dt;
  fx.ripples = fx.ripples.filter((r) => r.t < 0.5);
  const cam = view.cam;
  const near = (o, m = 80) =>
    Math.abs(o.x - cam.x) < VIEW_W / 2 / ZOOM + m && Math.abs(o.y - cam.y) < VIEW_H / 2 / ZOOM + m;
  if (!state.paused) {
    const th = state.ship.docked ? 0 : Math.max(0, state.ship.throttle);
    fx.burn += (th - fx.burn) * Math.min(1, dt * 7);
    watchBlasts(fx, state, near);
    watchShots(fx, state, near);
    shipTrails(fx, state, dt);
    otherTrails(fx, state, near, dt);
  }
  fx.space.update(dt);
  fx.inside.update(dt);
}

// The same idea for the inside of a wreck or station.
export function updateInside(fx, it, dt, paused) {
  if (paused) return;
  const p = fx.inside;
  for (const f of it.fx) {
    if (fx.seen.has(f)) continue;
    fx.seen.add(f);
    if (f.type === 'boom') {
      explode(p, { ...f, size: f.size * 0.8 }, false);
      fx.shake = Math.min(7, fx.shake + f.size / 7);
    } else if (f.type === 'teleport') {
      p.ring(f.x, f.y, 4, 36, 0.5, COL.ion[3], 2);
      p.burst(f.x, f.y, 26, {
        angle: -Math.PI / 2,
        spread: 0.9,
        speed: 120,
        life: 0.6,
        drag: 2,
        size0: 2,
        size1: 1,
        colors: ION,
      });
      fx.flash = Math.max(fx.flash, 0.35);
    } else p.burst(f.x, f.y, 5, { speed: 55, life: 0.25, drag: 3, size0: 1.5, size1: 1, colors: FIRE });
  }
  for (const b of it.bolts) {
    if (fx.seen.has(b)) continue;
    fx.seen.add(b);
    const col = b.owner === 'crew' ? FIRE : ACID;
    p.add({ x: b.x, y: b.y, life: 0.08, size0: 9, size1: 3, glow: true, colors: col });
    p.burst(b.x, b.y, 2, {
      angle: Math.atan2(b.vy, b.vx),
      spread: 0.8,
      speed: 70,
      life: 0.14,
      drag: 4,
      size0: 1.5,
      size1: 1,
      colors: col,
    });
  }
  for (const g of it.grenades)
    if (g.t < g.dur)
      tick(fx, 'g', 30, dt, () =>
        p.add({
          x: g.x,
          y: g.y - Math.sin((g.t / g.dur) * Math.PI) * 14,
          life: 0.3,
          size0: 1.5,
          size1: 3,
          colors: SMOKE,
        }),
      );
}

// A drifting cloud layer, different for every sector, drawn behind the stars.
function nebula(fx, sector) {
  if (fx.nebula.has(sector)) return fx.nebula.get(sector);
  const c = document.createElement('canvas');
  c.width = VIEW_W;
  c.height = VIEW_H;
  const g = c.getContext('2d'),
    [dim, bright] = SECTOR_TINT[sector % SECTOR_TINT.length];
  let seed = 977 + sector * 131;
  const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const blobs = Array.from({ length: 9 }, () => ({
    x: r() * VIEW_W,
    y: r() * VIEW_H,
    rx: 60 + r() * 130,
    ry: 30 + r() * 70,
  }));
  for (let y = 0; y < VIEW_H; y += 2)
    for (let x = 0; x < VIEW_W; x += 2) {
      let d = 0;
      for (const b of blobs) {
        // Wrap around the edges so the layer can repeat without a seam.
        let dx = Math.abs(x - b.x),
          dy = Math.abs(y - b.y);
        dx = Math.min(dx, VIEW_W - dx);
        dy = Math.min(dy, VIEW_H - dy);
        d += Math.max(0, 1 - (dx / b.rx) ** 2 - (dy / b.ry) ** 2);
      }
      // Denser parts are filled, thinner parts are dithered, so the cloud fades out at its edges.
      const checker = ((x + y) / 2) % 2 === 0,
        sparse = (x / 2) % 2 === 0 && (y / 2) % 2 === 0;
      if (d > 0.9) {
        g.fillStyle = bright;
        g.fillRect(x, y, 2, 2);
      } else if (d > 0.6) {
        g.fillStyle = checker ? bright : dim;
        g.fillRect(x, y, 2, 2);
      } else if (d > 0.35) {
        g.fillStyle = dim;
        g.fillRect(x, y, 2, 2);
      } else if (d > 0.18 && checker) {
        g.fillStyle = dim;
        g.fillRect(x, y, 2, 2);
      } else if (d > 0.06 && sparse) {
        g.fillStyle = dim;
        g.fillRect(x, y, 2, 2);
      }
    }
  fx.nebula.set(sector, c);
  return c;
}
export function drawNebula(ctx, fx, sector, cam) {
  const img = nebula(fx, sector),
    ox = -(((cam.x * 0.06) % VIEW_W) + VIEW_W) % VIEW_W,
    oy = -(((cam.y * 0.06) % VIEW_H) + VIEW_H) % VIEW_H;
  ctx.globalAlpha = 0.3;
  for (const dx of [0, VIEW_W])
    for (const dy of [0, VIEW_H]) ctx.drawImage(img, Math.round(ox + dx), Math.round(oy + dy));
  ctx.globalAlpha = 1;
}

// Shield ripples where shots land, drawn in ship-local space.
export function drawRipples(ctx, fx) {
  for (const r of fx.ripples) {
    const u = r.t / 0.5,
      spread = 0.35 + u * 0.9;
    ctx.globalAlpha = (1 - u) * 0.9;
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 2.5 * (1 - u) + 0.5;
    // Heading 0 points up, so the canvas angle is turned a quarter back.
    ctx.beginPath();
    ctx.ellipse(0, 0, 44, 62, 0, r.a - Math.PI / 2 - spread, r.a - Math.PI / 2 + spread);
    ctx.stroke();
    ctx.globalAlpha = (1 - u) * 0.25;
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 44, 62, 0, 0, 7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
export function drawFlash(ctx, fx) {
  if (fx.flash <= 0.01) return;
  ctx.globalAlpha = Math.min(0.85, fx.flash);
  ctx.fillStyle = '#eaffff';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
}
