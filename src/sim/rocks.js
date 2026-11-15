// Asteroids: the only things in space that the frigate runs into. They lie in a belt round the middle of the
// system and in a few denser fields, never close to a station. Shots break them apart, and new ones drift in
// out of sight, so that a field never runs dry.
import { B } from './balance.js';
import { addThing, removeThing, thingsOf, dockTargets } from './things.js';
import { rand, randRange, TAU, dist, forward } from './util.js';

// Variant 0 is a middling rock, 1 a small one and 2 a large one.
const ROCK_RADIUS = [13, 8, 19];
// What a broken rock leaves behind: a large one two middling ones, a middling one two small ones.
const PIECES = [1, null, 0];
// How much a rock counts for when the field is topped up.
const MASS = [2, 1, 4];
const at = (angle, d) => ({ x: Math.sin(angle) * d, y: -Math.cos(angle) * d });

export function newRock(s, x, y, variant, heading = randRange(s, 0, TAU)) {
  return { id: s.nextId++, kind: 'rock', x, y, heading, variant, r: ROCK_RADIUS[variant], hp: B.ROCK_HP[variant] };
}

// A rock may not lie where it is in the way of docking: well clear of stations, and a little clear of the rest.
function clear(s, x, y) {
  return dockTargets(s).every((t) => dist(t.x, t.y, x, y) >= (t.kind === 'station' ? B.ROCK_GAP_STATION : B.ROCK_GAP));
}
const massOf = (s) => thingsOf(s, 'rock').reduce((sum, r) => sum + MASS[r.variant], 0);

// A spot somewhere in the belt or in one of the fields.
function spotIn(s, field) {
  const pick = Math.floor(rand(s) * (field.clusters.length + 2));
  if (pick >= field.clusters.length) return at(rand(s) * TAU, randRange(s, field.belt[0], field.belt[1]));
  const c = field.clusters[pick];
  const p = at(rand(s) * TAU, Math.sqrt(rand(s)) * c.r);
  return { x: c.x + p.x, y: c.y + p.y };
}

// One rock of any size at p, unless that is too close to something.
function place(s, p) {
  const variant = Math.floor(rand(s) * 3);
  const heading = randRange(s, 0, TAU);
  if (clear(s, p.x, p.y)) addThing(s, newRock(s, p.x, p.y, variant, heading));
}
// `n` rocks spread over the field `c`.
function scatter(s, c, n) {
  for (let i = 0; i < n; i++) {
    const p = at(rand(s) * TAU, Math.sqrt(rand(s)) * c.r);
    place(s, { x: c.x + p.x, y: c.y + p.y });
  }
}

// A test game has one field of asteroids close to the start, to try flying through and shooting at. The belt
// lies far out, where the rocks that were left in place are.
export function layTestRocks(s, x, y) {
  const c = { x, y, r: 150 };
  scatter(s, c, 14);
  s.field = { belt: [1500, 1700], clusters: [c], target: massOf(s), timer: B.ROCK_REGROW };
}

// Lay out the asteroids of a system that is `radius` across from its middle to its edge. Stations, wrecks and
// pods have to be in place first.
export function layRocks(s, radius) {
  const belt = [radius * B.BELT[0], radius * B.BELT[1]];
  const clusters = [];
  const count = 2 + (radius > 1500 ? 1 : 0) + (radius > 2100 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const p = at(rand(s) * TAU, randRange(s, radius * 0.25, radius * 0.92));
    clusters.push({ x: p.x, y: p.y, r: randRange(s, B.CLUSTER_R[0], B.CLUSTER_R[1]) });
  }
  const field = { belt, clusters, target: 0, timer: B.ROCK_REGROW };
  const add = (p) => place(s, p);
  const area = Math.PI * (belt[1] ** 2 - belt[0] ** 2);
  const inBelt = Math.min(B.BELT_MAX, Math.round(area / B.BELT_SPACING ** 2));
  for (let i = 0; i < inBelt; i++) add(at(rand(s) * TAU, randRange(s, belt[0], belt[1])));
  for (const c of clusters) scatter(s, c, Math.round(randRange(s, B.CLUSTER_ROCKS[0], B.CLUSTER_ROCKS[1])));
  // A few lie on their own, anywhere outside the very middle.
  for (let i = 0; i < Math.round(radius / 200); i++) add(at(rand(s) * TAU, randRange(s, 260, radius)));
  field.target = massOf(s);
  s.field = field;
}

// A shot or a blast hits a rock. One that breaks leaves smaller pieces, down to nothing.
export function hurtRock(state, rock, dmg) {
  rock.hp -= dmg;
  if (rock.hp > 0) return;
  removeThing(state, rock);
  state.fx.push({ type: 'boom', x: rock.x, y: rock.y, t: 0, dur: 0.35, size: rock.r + 4 });
  // It is only heard and told of when it happens close to the ship.
  const ship = state.ship;
  if (dist(rock.x, rock.y, ship.x, ship.y) < B.VISION_SHIP * 1.5)
    state.events.push({ type: 'rockBroken', variant: rock.variant });
  const piece = PIECES[rock.variant];
  if (piece === null) return;
  const f = forward(rock.heading);
  for (const way of [-1, 1]) {
    const far = rock.r * 0.6 * way;
    addThing(state, newRock(state, rock.x + f.x * far, rock.y + f.y * far, piece, rock.heading + 1.3 * way));
  }
}

// New rocks drift in where nobody is looking, until the field is as rich as it was.
export function stepRocks(state, dt) {
  const field = state.field;
  if (!field) return;
  field.timer -= dt;
  if (field.timer > 0) return;
  field.timer = B.ROCK_REGROW;
  if (massOf(state) >= field.target) return;
  const ship = state.ship;
  for (let tries = 0; tries < 8; tries++) {
    const p = spotIn(state, field);
    if (dist(p.x, p.y, ship.x, ship.y) < B.VISION_SHIP * 1.5 || !clear(state, p.x, p.y)) continue;
    addThing(state, newRock(state, p.x, p.y, 2));
    return;
  }
}
