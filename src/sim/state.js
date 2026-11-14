import { B, SHIP_GEOM } from './balance.js';
import { createSectors, generateSector, createWreck } from './sectors.js';
import { applyTestLoadout } from './upgrades.js';

export { createWreck };

export function nodeStatus(hp) {
  return hp >= 70 ? 'ok' : hp >= 30 ? 'damaged' : 'critical';
}

export function createShip() {
  return {
    x: 0, y: 0, vx: 0, vy: 0, heading: 0, turn: 0, throttle: 0,
    hull: B.HULL_MAX, shield: B.SHIELD_MAX, lastHit: -99, ramCooldown: 0,
    fuel: B.FUEL_START, turretAngle: 0, fireCooldown: 0, firing: false,
    power: { weapons: 2, shields: 2, engines: 2, repair: 2 },
    nodes: SHIP_GEOM.nodes.map((n) => ({ ...n, hp: 100 })),
    crew: { at: 2, moving: null, queue: [] },
    docked: null,
    pulse: null, pulseCool: 0, probeStock: B.PROBE_STOCK, probeRegen: 0, buoyStock: B.BUOY_STOCK,
    // Upgrades: id -> level. Slots say how many the hull and the systems can take.
    mods: {}, slots: { hard: 2, system: 2 },
    weapon: 'pulse', charge: 0, heavyCool: 0, rockets: 0, rocketCool: 0,
    dartStock: 0, dartsOut: false, dartGap: 0, dartRegen: 0, dartQuiet: 0,
  };
}

// `options.test` starts the game with everything unlocked, for trying things out.
export function createState(seed = 1, options = {}) {
  const s = {
    seed, rng: seed >>> 0, time: 0, paused: false, pausedBy: null, over: false, won: false, test: false,
    ship: createShip(), pirates: [], bolts: [], rockets: [], beams: [], darts: [], fx: [],
    wrecks: [], rocks: [], stations: [], pods: [], map: null, known: [], probes: [], buoys: [],
    raid: null, raidTimer: 0, salvage: [],
    spawn: { timer: 0, wave: 0 }, kills: 0, credits: 0, nextId: 1, events: [],
    // People on board. `inside` is the id of the wreck or station a player is boarding, or null when on the ship.
    players: [{ id: 0, name: 'PLAYER 1', hp: B.CREW_HP, inside: null, lockedOut: null, tele: 0 }],
    sectors: createSectors(), sector: 0, charts: [0], jump: null, alarm: { count: 0, eta: null },
  };
  generateSector(s, 0);
  if (options.test) applyTestLoadout(s);
  return s;
}
