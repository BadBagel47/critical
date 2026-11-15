// The crew's frigate: how it starts, and values worked out from its state.
import { B, SHIP_GEOM } from './balance.js';
import { dockTargets, portsOf, localPorts } from './things.js';
import { powerTotal } from './upgrades.js';
import { clamp, toWorld, dist, headingTo } from './util.js';

export function nodeStatus(hp) {
  return hp >= 70 ? 'ok' : hp >= 30 ? 'damaged' : 'critical';
}

export function createShip() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    turn: 0,
    throttle: 0,
    boosting: false,
    hull: B.HULL_MAX,
    shield: B.SHIELD_MAX,
    dockShield: 0,
    lastHit: -99,
    ramCooldown: 0,
    fuel: B.FUEL_START,
    turretAngle: 0,
    // The turrets on the wings turn by themselves, so that all of them point at what the Gunner aims at.
    wingAngles: [0, 0],
    fireCooldown: 0,
    firing: false,
    power: { weapons: 2, shields: 2, engines: 2, repair: 2 },
    nodes: SHIP_GEOM.nodes.map((n) => ({ ...n, hp: 100 })),
    crew: { at: 2, moving: null, queue: [] },
    docked: null,
    pulse: null,
    pulseCool: 0,
    probeStock: B.PROBE_STOCK,
    probeRegen: 0,
    buoyStock: B.BUOY_STOCK,
    // Upgrades: id -> level. Slots say how many the hull and the systems can take.
    mods: {},
    slots: { hard: 2, system: 2 },
    weapon: 'pulse',
    charge: 0,
    heavyCool: 0,
    rockets: 0,
    rocketCool: 0,
    dartStock: 0,
    dartsOut: false,
    dartGap: 0,
    dartRegen: 0,
    dartQuiet: 0,
  };
}

const node = (ship, id) => ship.nodes.find((n) => n.id === id);
// How well a part of the ship works: 1 when whole, less when damaged.
export const nodeFactor = (ship, id) => B.NODE_FACTOR[nodeStatus(node(ship, id).hp)];

// A damaged reactor gives less power.
export function powerAvailable(ship) {
  const status = nodeStatus(node(ship, 'reactor').hp);
  return powerTotal(ship) - (status === 'critical' ? 2 : status === 'damaged' ? 1 : 0);
}
export const powerUsed = (ship) => B.SYSTEMS.reduce((sum, sys) => sum + ship.power[sys], 0);

export function setPower(state, sys, delta) {
  const ship = state.ship;
  if (!B.SYSTEMS.includes(sys)) return false;
  const next = clamp(ship.power[sys] + delta, 0, B.POWER_MAX_PER_SYSTEM);
  if (next === ship.power[sys]) return false;
  if (next > ship.power[sys] && powerUsed(ship) + (next - ship.power[sys]) > powerAvailable(ship)) {
    state.events.push({ type: 'noPower' });
    return false;
  }
  ship.power[sys] = next;
  return true;
}

export const speedOf = (body) => Math.hypot(body.vx, body.vy);
export const shipNose = (ship) => toWorld(ship, SHIP_GEOM.nose);
export const weaponPower = (ship) => B.WEAPON_POWER[ship.power.weapons] * nodeFactor(ship, 'bow');
export function fireInterval(ship) {
  const power = weaponPower(ship);
  return power > 0 ? B.FIRE_INTERVAL / power : Infinity;
}

// The port the ship could dock at right now, if any: the nearest one within reach of the nose.
export function dockPort(state) {
  const ship = state.ship;
  if (ship.docked || speedOf(ship) > B.DOCK_SPEED) return null;
  const nose = shipNose(ship);
  let best = null;
  let bestD = B.DOCK_RANGE;
  for (const t of dockTargets(state)) {
    for (const p of portsOf(t)) {
      const d = dist(nose.x, nose.y, p.x, p.y);
      if (d <= bestD) {
        best = { thing: t, port: p };
        bestD = d;
      }
    }
  }
  return best;
}
// The thing the ship could dock with right now, if any.
export function dockCandidate(state) {
  const at = dockPort(state);
  return at ? at.thing : null;
}

// Where a docked ship comes to rest: its nose at the port nearest to it, pointing at what it is docked to.
// Null when the ship is nowhere near a port, which only happens when something else has put it there.
export function dockPose(ship, thing) {
  const nose = shipNose(ship);
  let best = null;
  let bestD = B.DOCK_RANGE * 3;
  for (const local of localPorts(thing)) {
    const p = toWorld(thing, local);
    const d = dist(nose.x, nose.y, p.x, p.y);
    if (d < bestD) {
      best = { p, inward: toWorld(thing, local.toward || { x: 0, y: 0 }) };
      bestD = d;
    }
  }
  if (!best) return null;
  const heading = headingTo(best.inward.x - best.p.x, best.inward.y - best.p.y);
  const reach = toWorld({ x: 0, y: 0, heading }, SHIP_GEOM.nose);
  return { x: best.p.x - reach.x, y: best.p.y - reach.y, heading };
}
