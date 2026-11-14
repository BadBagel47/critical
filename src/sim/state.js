import { B, SHIP_GEOM } from './balance.js';
import { rand, randRange, TAU, dist } from './util.js';

export function nodeStatus(hp) {
  return hp >= 70 ? 'ok' : hp >= 30 ? 'damaged' : 'critical';
}

export function createShip() {
  return {
    x: 0, y: 0, vx: 0, vy: 0, heading: 0, turn: 0, throttle: 0,
    hull: B.HULL_MAX, shield: B.SHIELD_MAX, lastHit: -99, ramCooldown: 0,
    turretAngle: 0, fireCooldown: 0, firing: false,
    power: { weapons: 2, shields: 2, engines: 2, repair: 2 },
    nodes: SHIP_GEOM.nodes.map((n) => ({ ...n, hp: 100 })),
    crew: { at: 2, moving: null, queue: [] },
    docked: null,
  };
}

export function createState(seed = 1) {
  const s = {
    seed, rng: seed >>> 0, time: 0, paused: false, pausedBy: null, over: false,
    ship: createShip(), pirates: [], bolts: [], fx: [], wrecks: [], rocks: [],
    spawn: { timer: B.FIRST_WAVE_DELAY, wave: 0 }, kills: 0, nextId: 1, events: [],
  };
  // A first wreck close to the start, two more further out.
  const base = rand(s) * TAU;
  [[560, 0], [1250, 2.1], [1700, 4.0]].forEach(([d, off], i) => {
    const a = base + off + randRange(s, -0.3, 0.3);
    s.wrecks.push({ id: s.nextId++, x: Math.sin(a) * d, y: -Math.cos(a) * d, heading: randRange(s, 0, TAU), looted: false, name: 'WRECK ' + (i + 1) });
  });
  for (let i = 0; i < 46; i++) {
    const a = rand(s) * TAU, d = randRange(s, 260, 2400);
    const rock = { id: s.nextId++, x: Math.sin(a) * d, y: -Math.cos(a) * d, kind: Math.floor(rand(s) * 3), spin: randRange(s, 0, TAU) };
    rock.r = [13, 8, 19][rock.kind];
    if (s.wrecks.some((w) => dist(w.x, w.y, rock.x, rock.y) < 170)) continue;
    s.rocks.push(rock);
  }
  return s;
}
