// Things in space that stand still or drift: rocks, wrecks, stations, cargo pods, salvage and buoys.
// They all live in state.things and share the same shape: { id, kind, x, y, heading, ... }.
// What a kind can do is read from THINGS in kinds.js, so nothing here needs to know the kinds by name.
import { B } from './balance.js';
import { THINGS } from './kinds.js';
import { has } from './upgrades.js';
import { toWorld, dist } from './util.js';

const rank = (kind) => Object.keys(THINGS).indexOf(kind);

// Things are kept sorted by kind, oldest first within a kind, so the game never depends on creation order.
export function addThing(state, thing) {
  const r = rank(thing.kind);
  let i = state.things.length;
  while (i > 0 && rank(state.things[i - 1].kind) > r) i--;
  state.things.splice(i, 0, thing);
  return thing;
}
// The map keeps showing a removed thing where it was last seen, until someone looks there again.
export function removeThing(state, thing) {
  state.things = state.things.filter((t) => t !== thing);
}
export const thingsOf = (state, kind) => state.things.filter((t) => t.kind === kind);
export const findThing = (state, id) => (id == null ? null : state.things.find((t) => t.id === id) || null);

// ---------- collisions ----------
// Every circle the frigate and shots can run into, in world coordinates.
export function solidCircles(state) {
  const out = [];
  for (const t of state.things) {
    const hit = THINGS[t.kind].hit;
    if (!hit) continue;
    for (const c of typeof hit === 'function' ? hit(t) : hit) {
      const p = toWorld(t, c);
      out.push({ x: p.x, y: p.y, r: c.r, thing: t });
    }
  }
  return out;
}

// ---------- docking ----------
export const canDock = (t) => !!THINGS[t.kind].ports;
export const dockTargets = (state) => state.things.filter(canDock);
export const findDock = (state, id) => {
  const t = findThing(state, id);
  return t && canDock(t) ? t : null;
};
export const portsOf = (t) => THINGS[t.kind].ports.map((p) => toWorld(t, p));
// What the HUD calls a thing: its own name, or what kind of thing it is.
export const nameOf = (t) => t.name || THINGS[t.kind].label;

// ---------- the map ----------
// What the map remembers about a thing, or null when that kind is never put on the map.
export function mapInfo(t) {
  const onMap = THINGS[t.kind].onMap;
  return onMap ? { id: t.id, kind: t.kind, x: t.x, y: t.y, ...onMap(t) } : null;
}

// ---------- salvage ----------
// Salvage is collected by flying over it. A tractor beam pulls it in from a distance.
export function stepSalvage(state, dt) {
  const ship = state.ship;
  const tractor = has(ship, 'tractor');
  let gone = false;
  for (const c of state.things) {
    if (c.kind !== 'salvage') continue;
    c.ttl -= dt;
    const d = dist(c.x, c.y, ship.x, ship.y);
    c.pulled = tractor && d < B.TRACTOR_RANGE;
    if (c.pulled && d > 1) {
      c.x += ((ship.x - c.x) / d) * B.TRACTOR_PULL * dt;
      c.y += ((ship.y - c.y) / d) * B.TRACTOR_PULL * dt;
    }
    if (d < B.SALVAGE_PICKUP) {
      c.ttl = 0;
      state.credits += c.value;
      state.events.push({ type: 'salvage', value: c.value });
    }
    if (c.ttl <= 0) gone = true;
  }
  if (gone) state.things = state.things.filter((c) => c.kind !== 'salvage' || c.ttl > 0);
}
