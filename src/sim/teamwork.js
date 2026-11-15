// What the posts do for each other: the overcharge that the Engineer builds up and another post lets go,
// and the marks that the Captain and the Gunner can set for each other to see.
import { B } from './balance.js';
import { CREW, enemies } from './sides.js';
import { shieldMax } from './upgrades.js';
import { dist } from './util.js';

// ---------- the overcharge ----------
// The Engineer charges it for one system. When it is full, the post that runs that system lets it go, and
// the system is stronger for a few seconds. Then it has to cool before the next one.
export const SURGE_BY = { weapons: 'gunner', shields: 'engineer', engines: 'captain' };

export function startSurge(state, sys) {
  const ship = state.ship,
    s = ship.surge;
  if (!SURGE_BY[sys] || s.left > 0) return;
  if (s.cool > 0) {
    state.events.push({ type: 'surgeCooling', left: s.cool });
    return;
  }
  if (ship.power[sys] <= 0) {
    state.events.push({ type: 'surgeNoPower', sys });
    return;
  }
  if (s.sys === sys) return;
  s.sys = sys;
  s.charge = 0;
}

export function fireSurge(state, post) {
  const ship = state.ship,
    s = ship.surge;
  if (!s.sys || s.charge < 1 || s.left > 0 || SURGE_BY[s.sys] !== post) return;
  s.left = B.SURGE_TIME;
  s.charge = 0;
  // The shield gets a part of itself back at once, and then recharges fast.
  if (s.sys === 'shields') ship.shield = Math.min(shieldMax(ship), ship.shield + shieldMax(ship) * B.SURGE_SHIELD);
  state.events.push({ type: 'surgeUsed', sys: s.sys });
}

export function stepSurge(state, dt) {
  const ship = state.ship,
    s = ship.surge;
  s.cool = Math.max(0, s.cool - dt);
  if (s.left > 0) {
    s.left -= dt;
    if (s.left > 0) return;
    s.left = 0;
    s.sys = null;
    s.cool = B.SURGE_COOL;
    return;
  }
  if (!s.sys || s.charge >= 1) return;
  // A system without power cannot be charged.
  if (ship.power[s.sys] <= 0) {
    s.sys = null;
    s.charge = 0;
    return;
  }
  s.charge = Math.min(1, s.charge + dt / B.SURGE_CHARGE);
  if (s.charge >= 1) state.events.push({ type: 'surgeReady', sys: s.sys });
}

// ---------- marks ----------
// state.marks holds what each post has pointed out: the Gunner a ship for the Captain to keep in sight, and
// the Captain a ship that the crew's shots hurt a little more.
const foes = (state) => state.vessels.filter((v) => enemies(state, v.side, CREW));

// The Gunner marks the enemy nearest to where they aim. Marking it again takes the mark away.
export function markByGunner(state, at) {
  let best = null,
    least = B.MARK_REACH;
  for (const v of foes(state)) {
    const d = dist(v.x, v.y, at.x, at.y);
    if (d < least) {
      least = d;
      best = v;
    }
  }
  state.marks.gunner = best && best.id !== state.marks.gunner ? best.id : null;
}
// The Captain goes through the enemies from the nearest one out, and then to none.
export function markByCaptain(state) {
  const ship = state.ship;
  const list = foes(state)
    .map((v) => ({ id: v.id, far: dist(v.x, v.y, ship.x, ship.y) }))
    .filter((t) => t.far < B.MARK_RANGE)
    .sort((a, b) => a.far - b.far);
  const at = list.findIndex((t) => t.id === state.marks.captain);
  const next = list[at + 1];
  state.marks.captain = next ? next.id : null;
}
// A mark goes when the ship it points at is gone.
export function stepMarks(state) {
  const m = state.marks;
  for (const post of ['gunner', 'captain']) {
    if (m[post] !== null && !state.vessels.some((v) => v.id === m[post])) m[post] = null;
  }
}
