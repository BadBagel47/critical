// Sectors: the world is split into sectors, and a star chart unlocks the jump to the next one.
// Only the sector the ship is in is simulated. The others are stored as they were left.
import { B } from './balance.js';
import { THINGS, HULLS, SHIPS } from './kinds.js';
import { addThing, dockTargets, mapInfo } from './things.js';
import { makeVessel, firstWaveDelay } from './vessels.js';
import { createMap } from './map.js';
import { layRocks, layTestRocks } from './rocks.js';
import { placeShip } from './system.js';
import { createStation } from './stations.js';
import { jumpCharge, jumpFuel } from './upgrades.js';
import { rand, randRange, TAU, dist } from './util.js';

// links: the sectors that can be reached from here. size: which of the three sizes in B.SYSTEM_R it has.
// stations: [side, shipyard, how far out it lies in the largest size, name].
// A station's side is 'crew', 'pirate', a faction, or null for one that stands on its own.
const SECTORS = [
  {
    name: 'KESTREL DRIFT',
    size: 1,
    tier: 0,
    links: [1, 2],
    hint: 'QUIET  ·  A FRIENDLY SHIPYARD',
    wrecks: 3,
    stations: [
      ['crew', true, 330, 'KESTREL YARD'],
      [null, false, 1500, 'DRIFT POST'],
    ],
  },
  {
    name: 'ASH BELT',
    size: 0,
    tier: 1,
    links: [0, 3],
    hint: 'RICH IN FUEL  ·  ONE HOSTILE STATION',
    wrecks: 3,
    stations: [
      ['drifters', true, 900, 'ASH DEPOT'],
      ['pirate', false, 1700, 'CINDER HOLD'],
    ],
  },
  {
    name: 'HOLLOW REACH',
    size: 2,
    tier: 1,
    links: [0, 3],
    hint: 'MANY WRECKS  ·  PIRATE PATROLS',
    wrecks: 5,
    stations: [
      ['charter', true, 1000, 'HOLLOW MARKET'],
      ['pirate', false, 1800, 'REACH FORT'],
    ],
  },
  {
    name: 'THE NARROWS',
    size: 1,
    tier: 2,
    links: [1, 2, 4],
    hint: 'GUNBOATS  ·  TWO HOSTILE STATIONS',
    wrecks: 3,
    stations: [
      ['wardens', true, 950, 'NARROWS DOCK'],
      ['pirate', false, 1500, 'IRON GATE'],
      ['pirate', false, 2000, 'BLACK PIER'],
    ],
  },
  {
    name: 'THE MAW',
    size: 0,
    tier: 3,
    links: [3],
    boss: 'cruiser',
    hint: 'THE PIRATE CRUISER WAITS HERE',
    wrecks: 3,
    stations: [['pirate', false, 1400, 'MAW BASTION']],
  },
];

// What the state keeps for each sector. `saved` holds a sector the crew has left.
export const createSectors = () =>
  SECTORS.map((s, id) => ({
    id,
    name: s.name,
    tier: s.tier,
    // How far it is from the middle of the system to its edge.
    radius: B.SYSTEM_R[s.size],
    // Whether it has a haze at its edge, and a star in its middle. The star waits for the user to approve how
    // it looks. Until then only a test game has one, see gatherForTesting.
    haze: true,
    star: false,
    links: s.links,
    hint: s.hint,
    boss: !!s.boss,
    visited: false,
    saved: null,
  }));
export const currentSector = (state) => state.sectors[state.sector];

// `hull` is the shape of the wreck, see HULLS in kinds.js. Without one it is picked among those that can be as
// dangerous as asked for, and a hull that cannot be that dangerous makes the wreck less so.
export function createWreck(s, x, y, difficulty, hull = null) {
  const fits = Object.keys(HULLS).filter((h) => HULLS[h].risk[0] <= difficulty && difficulty <= HULLS[h].risk[1]);
  // The hull is read off the heading instead of drawing one more random number, so that a world made from
  // the same seed is laid out as it was before wrecks had hulls.
  const heading = randRange(s, 0, TAU);
  if (!hull) hull = fits[Math.floor(heading * 7919) % fits.length];
  const [low, high] = HULLS[hull].risk;
  return {
    id: s.nextId++,
    kind: 'wreck',
    hull,
    x,
    y,
    heading,
    difficulty: Math.max(low, Math.min(high, difficulty)),
    // How many times the crew has failed to bypass its lock, see boarding.js.
    lockFails: 0,
    interior: null,
    lock: 'locked',
    breakin: null,
  };
}

export function createPod(s, x, y) {
  return {
    id: s.nextId++,
    kind: 'pod',
    // An emptied pod stays where it is as a dark shell. `alarm` is how long its alarm still sounds.
    looted: false,
    alarm: 0,
    x,
    y,
    heading: randRange(s, 0, TAU),
    difficulty: 1,
    interior: null,
    lock: 'locked',
    breakin: null,
  };
}

const at = (angle, d) => ({ x: Math.sin(angle) * d, y: -Math.cos(angle) * d });

// Everything that only lasts while the crew is in the sector.
function clearTraffic(s, raidDelay) {
  s.vessels = [];
  s.bolts = [];
  s.rockets = [];
  s.probes = [];
  s.beams = [];
  s.things = s.things.filter((t) => THINGS[t.kind].persist);
  s.raid = null;
  s.strife = {};
  s.raidTimer = randRange(s, raidDelay[0], raidDelay[1]);
  s.traffic = { timer: randRange(s, 8, 20) };
}

// Fill the world with a fresh sector around the origin.
export function generateSector(s, id) {
  const sec = s.sectors[id];
  const spec = SECTORS[id];
  const tier = sec.tier;
  s.things = [];
  s.map = createMap();
  s.known = [];
  // Distances are given for the largest size. Nothing lies in the very middle.
  const k = sec.radius / B.SYSTEM_R[2];
  const out = (d) => Math.max(B.SYSTEM_CORE, d * k);
  const base = rand(s) * TAU;
  for (let i = 0; i < spec.wrecks; i++) {
    const angle = base + i * (TAU / spec.wrecks) + randRange(s, -0.3, 0.3);
    const p = at(angle, out(i === 0 ? 620 : randRange(s, 1000, 1900)));
    // The first sector has easy wrecks. Later ones are a gamble.
    const difficulty = tier === 0 ? (i === 2 ? 2 : 1) : Math.min(3, 1 + Math.floor(rand(s) * (tier + 1)));
    addThing(s, createWreck(s, p.x, p.y, difficulty));
  }
  // Each trading station sells the chart to one of the sectors you can jump to from here.
  const onward = sec.links.filter((l) => l !== 0);
  spec.stations.forEach(([side, yard, d, name], i) => {
    const p = at(base + 1.1 + i * 2.3 + randRange(s, -0.2, 0.2), out(d));
    // The crew's own yard in the first sector is their home.
    const st = createStation(s, p.x, p.y, side, yard, name, side === 'crew');
    if (side !== 'pirate') st.chart = onward[i % Math.max(1, onward.length)] ?? null;
    addThing(s, st);
  });
  for (let i = 0; i < 3; i++) {
    const angle = base + 0.5 + i * 2.1 + randRange(s, -0.4, 0.4);
    const p = at(angle, out(randRange(s, 700, 2000)));
    addThing(s, createPod(s, p.x, p.y));
  }
  layRocks(s, sec.radius);
  clearTraffic(s, B.RAID_FIRST);
  if (spec.boss) {
    const p = at(base + 3.3, out(1000));
    s.vessels.push(makeVessel(s, spec.boss, p.x, p.y));
  }
  s.spawn = { timer: firstWaveDelay(s), wave: 0 };
  sec.visited = true;
}

// For trying things out: a test game has one of everything that can be docked with close to where the ship
// starts. A station of every side, a wreck of every hull and two cargo pods stand in rings round the start,
// and one field of asteroids lies near by. The start is well away from the star, in a system of the largest
// size so that all of it fits. This is only for test games. An ordinary game is never laid out like this.
export const TEST_START = { x: 0, y: 1150 };
export function gatherForTesting(s) {
  const turn = (deg) => (deg * Math.PI) / 180;
  const from = (deg, far) => {
    const p = at(turn(deg), far);
    return { x: TEST_START.x + p.x, y: TEST_START.y + p.y };
  };
  currentSector(s).radius = B.SYSTEM_R[2];
  for (const sec of s.sectors) Object.assign(sec, { star: true, haze: true });
  // Whatever was laid out near the start is cleared away, rocks too, so that nothing is in the way.
  s.things = s.things.filter((t) => t.kind === 'rock' && dist(t.x, t.y, TEST_START.x, TEST_START.y) > 1500);
  s.known = [];
  const onward = currentSector(s).links.filter((l) => l !== 0);
  // side, shipyard, where (degrees from straight ahead, and how far), name
  const stations = [
    ['crew', true, 0, 470, 'KESTREL YARD'],
    [null, false, 60, 950, 'FREE TEST POST'],
    ['charter', true, 120, 950, 'CHARTER TEST DOCK'],
    ['wardens', true, 180, 950, 'WARDENS TEST DOCK'],
    ['drifters', true, 240, 950, 'DRIFTERS TEST DOCK'],
    // The pirates' station stands further out, so that its guns do not reach the start.
    ['pirate', false, 300, 1150, 'PIRATE TEST HOLD'],
  ];
  stations.forEach(([side, yard, deg, far, name], i) => {
    const p = from(deg, far);
    const st = createStation(s, p.x, p.y, side, yard, name, side === 'crew');
    if (side !== 'pirate') st.chart = onward[i % Math.max(1, onward.length)] ?? null;
    addThing(s, st);
  });
  // hull, how dangerous, where
  const wrecks = [
    ['gunboat', 1, 35, 320],
    ['hull', 2, 145, 360],
    ['freighter', 3, 215, 380],
  ];
  for (const [hull, risk, deg, far] of wrecks) {
    const p = from(deg, far);
    const wreck = createWreck(s, p.x, p.y, risk, hull);
    wreck.heading = 0;
    addThing(s, wreck);
  }
  for (const deg of [90, 270]) {
    const p = from(deg, 250);
    addThing(s, createPod(s, p.x, p.y));
  }
  const rocks = from(30, 850);
  layTestRocks(s, rocks.x, rocks.y);
  // All of it is on the map from the start, so that nothing has to be looked for.
  s.known = dockTargets(s).map(mapInfo);
  placeShip(s, { ...TEST_START, heading: 0, throttle: 0 });
}

// Why the ship cannot jump to a sector right now, or null when it can.
export function jumpBlocked(state, to) {
  const sec = currentSector(state);
  const ship = state.ship;
  if (!state.sectors[to] || to === state.sector) return 'NOT A SECTOR';
  if (!sec.links.includes(to)) return 'NO ROUTE FROM HERE';
  if (!state.charts.includes(to)) return 'NO STAR CHART';
  if (ship.docked) return 'UNDOCK FIRST';
  if (state.players.some((p) => p.inside !== null)) return 'CREW STILL AWAY';
  if (ship.fuel < jumpFuel(ship)) return 'NOT ENOUGH FUEL';
  return null;
}

// The Captain starts a jump, or stops the one being charged by asking for the same sector again.
function orderJump(state, to) {
  if (state.jump && state.jump.to === to) {
    state.jump = null;
    state.events.push({ type: 'jumpCancelled' });
    return;
  }
  const why = jumpBlocked(state, to);
  if (why) {
    state.events.push({ type: 'cannotJump', reason: why });
    return;
  }
  state.jump = { to, t: 0 };
  state.events.push({ type: 'jumpCharging', name: state.sectors[to].name });
}

// Store this sector as it is, then load or create the next one.
function arrive(state, to) {
  const ship = state.ship;
  const from = currentSector(state);
  const next = state.sectors[to];
  // Ships come and go, but the one that has to be destroyed to win stays where it was left.
  const bosses = state.vessels.filter((v) => SHIPS[v.kind].boss);
  from.saved = {
    things: state.things.filter((t) => THINGS[t.kind].persist),
    map: state.map,
    known: state.known,
    field: state.field,
    bosses,
  };
  ship.fuel -= jumpFuel(ship);
  ship.dartStock += state.darts.length;
  state.darts = [];
  ship.dartsOut = false;
  state.sector = to;
  state.jump = null;
  if (next.saved) {
    state.things = next.saved.things;
    state.map = next.saved.map;
    state.known = next.saved.known;
    state.field = next.saved.field;
    const bosses = next.saved.bosses || [];
    next.saved = null;
    clearTraffic(state, B.RAID_GAP);
    state.vessels.push(...bosses);
    state.spawn = { timer: firstWaveDelay(state), wave: Math.floor(state.spawn.wave / 2) };
  } else generateSector(state, to);
  placeShip(state);
  ship.pulse = null;
  state.fx = [{ type: 'jump', x: ship.x, y: ship.y, t: 0, dur: 1 }];
  state.events.push({ type: 'jumped', name: next.name });
}

export function stepJump(state, cmd, dt) {
  if (cmd && cmd.jump !== undefined && cmd.jump !== null) orderJump(state, cmd.jump);
  if (!state.jump) return;
  if (jumpBlocked(state, state.jump.to)) {
    state.jump = null;
    state.events.push({ type: 'jumpCancelled' });
    return;
  }
  state.jump.t += dt;
  if (state.jump.t >= jumpCharge(state.ship)) arrive(state, state.jump.to);
}
