// Making the inside of a place that can be boarded, and filling it (D-227): the plan comes from layout.js, and
// here it gets its guards, turrets, cameras, loot, doors and the rest. Also how a place takes the crew: calm,
// lockdown or alarm, and whether it is dark.
import { B } from './balance.js';
import { currentSector } from './sectors.js';
import { layOut } from './layout.js';
import { TILE, blocked, tileAt } from './floor.js';
import { guardKind, newGuard, planRounds } from './guards.js';
import { CREW, PIRATE } from './sides.js';
import { defenseOf, isTrading } from './stations.js';
import { doorsOf, furnish, usesOf } from './furnish.js';
import { makeLocks } from './airlock.js';
import { openCommand } from './pressure.js';
import { TAU, dist, headingTo, rand } from './util.js';
import { newTurret } from './defences.js';
import { credits, fillVault } from './loot.js';
import { crewInside } from './hulks.js';

// ---------- generation ----------
// The floor plan itself is made in layout.js. Here it is filled with guards, turrets and loot.
// Whether a tile can be walked to from another without stepping on any of the tiles in `shut`.
function reachable(it, from, to, shut) {
  const seen = new Set([from.ty * it.w + from.tx]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift();
    if (at.tx === to.tx && at.ty === to.ty) return true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const tx = at.tx + dx,
        ty = at.ty + dy,
        key = ty * it.w + tx;
      if (seen.has(key) || shut.has(key)) continue;
      const c = tileAt(it, tx, ty);
      // The vault door counts as a way through here: it is the crew's to open. So do the doors of an airlock.
      if (c !== '.' && c !== ',' && c !== 'A' && c !== 'L' && c !== 'D') continue;
      seen.add(key);
      queue.push({ tx, ty });
    }
    // A way between two floors.
    const up = it.jumps ? it.jumps[at.ty * it.w + at.tx] : undefined;
    if (up !== undefined && !seen.has(up) && !shut.has(up)) {
      seen.add(up);
      queue.push({ tx: up % it.w, ty: Math.floor(up / it.w) });
    }
  }
  return false;
}

// Put alarms on some of a station's doors: the doors of rooms with something worth taking. There is always
// a way from where the crew comes in to the vault that goes through no alarmed door.
function alarmDoors(state, it) {
  const tile = (p) => ({ tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) });
  const vault = tile(it.rooms[it.vault].door);
  const holds = (r) =>
    it.loot.some((l) => l.x >= r.c0 * TILE && l.x < (r.c1 + 1) * TILE && l.y >= r.r0 * TILE && l.y < (r.r1 + 1) * TILE);
  const rooms = it.rooms.filter((r, i) => i !== it.vault && r.door && holds(r));
  const shut = new Set();
  for (const r of rooms) {
    if (it.alarmed.length >= B.ALARMED_DOORS) break;
    if (rand(state) < 0.35) continue;
    const t = tile(r.door);
    const key = t.ty * it.w + t.tx;
    shut.add(key);
    const free = it.airlocks.every((a) => reachable(it, tile(a), vault, shut));
    if (!free) {
      shut.delete(key);
      continue;
    }
    it.alarmed.push({ x: r.door.x, y: r.door.y, tx: t.tx, ty: t.ty, off: false });
  }
}

// How a place takes the crew, and whether it is dark with that. A wreck is always dark. A base is dim in
// lockdown, when it has shut itself in, and when its power is out. In an alarm every lamp is lit (R-1188).
export function relight(it) {
  it.dark = it.wreck || !it.power || it.mood === 'lockdown';
}

export function setMood(it, mood) {
  it.mood = mood;
  relight(it);
}

// How much floor a place has, in tiles.
export const floorArea = (it) => it.tiles.reduce((n, c) => n + (c === '.' || c === ',' ? 1 : 0), 0);

// A free spot on the floor inside a box of walls (a room or a corridor): not too close to anything in `taken`,
// and at least `away` from the way in.
export function spotIn(state, it, box, taken, away = 0) {
  for (let n = 0; n < 60; n++) {
    const x = (box.c0 + 1.5 + rand(state) * (box.c1 - box.c0 - 2)) * TILE;
    const y = (box.r0 + 1.5 + rand(state) * (box.r1 - box.r0 - 2)) * TILE;
    if (blocked(it, x, y, 7) || taken.some((t) => dist(t.x, t.y, x, y) < 18)) continue;
    if (away && dist(x, y, it.entry.x, it.entry.y) < away) continue;
    taken.push({ x, y });
    return { x, y };
  }
  const p = box.mid ? { ...box.mid } : { x: ((box.c0 + box.c1 + 1) / 2) * TILE, y: ((box.r0 + box.r1 + 1) / 2) * TILE };
  taken.push(p);
  return p;
}

// The plan of an inside is made from a seed of its own (D-263), drawn from the game's random numbers when the
// crew first boards the place. The plan, the rooms and what stands in them never change after that, so a save
// keeps only the seed, what the plan was made from, and the few tiles that have changed since (doors sealed or
// opened). The rest is made again from the seed when the save is read. See packInterior and unpackInterior.
// What a plan is made from: the place as it was then.
const planInput = (place) => ({
  kind: place.kind,
  hull: place.hull,
  heading: place.heading || 0,
  shipyard: !!place.shipyard,
});

export function createInterior(state, wreck) {
  const seed = Math.floor(rand(state) * 4294967296) >>> 0;
  const input = planInput(wreck);
  /** @type {any} */
  const it = { planSeed: seed, planFrom: input, ...madePlan(seed, input) };
  return fillInterior(state, it, wreck);
}

// The part of an inside that is made from its seed alone: the plan, the rooms and what each is for, the things
// that stand in them, and the doors. Made in the same order every time, with nothing from the game's state.
function madePlan(seed, input) {
  /** @type {any} */
  const plan = layOut({ rng: seed }, input);
  const base = input.kind === 'station';
  const it = {
    w: plan.w,
    h: plan.h,
    tiles: plan.tiles,
    rooms: plan.rooms,
    vault: plan.vault,
    halls: plan.halls,
    airlocks: plan.airlocks,
    far: plan.far,
    decks: plan.decks || null,
    links: plan.links || [],
    jumps: plan.jumps || null,
    docks: plan.docks || [],
    uses: [],
    doors: [],
  };
  const away = (r) => dist(r.mid.x, r.mid.y, it.airlocks[0].x, it.airlocks[0].y);
  const rest = it.rooms.filter((_, i) => i !== it.vault);
  const named = it.rooms.find((r, i) => i !== it.vault && r.use === 'ENGINES');
  const deep = base ? null : named || [...rest].sort((a, b) => away(b) - away(a))[0];
  if (base) it.mainframe = { ...it.rooms.find((r) => r.use === 'COMMAND').mid };
  it.uses = usesOf(it, input, deep);
  delete it.mainframe;
  furnish(it);
  it.doors = plan.doors ? plan.doors.map((d) => ({ ...d })) : doorsOf(it);
  it.deep = deep ? it.rooms.indexOf(deep) : -1;
  return it;
}

// The parts of an inside that madePlan makes, and that a save leaves out.
const PLANNED = [
  'w',
  'h',
  'rooms',
  'vault',
  'halls',
  'airlocks',
  'far',
  'decks',
  'links',
  'jumps',
  'docks',
  'uses',
  'doors',
  'deep',
];
// Plans made again from saves, kept while the page is open: a plan is the same every time it is made.
const planCache = new Map();
const planFor = (seed, input) => {
  const key = seed + ':' + JSON.stringify(input);
  if (!planCache.has(key)) {
    if (planCache.size > 40) planCache.clear();
    planCache.set(key, madePlan(seed, input));
  }
  return planCache.get(key);
};

// An inside as a save keeps it: without its plan, and with only the tiles that are not as the plan made them.
export function packInterior(it) {
  if (!it || it.planSeed === undefined) return it;
  const plan = planFor(it.planSeed, it.planFrom);
  const changed = {};
  for (let i = 0; i < it.tiles.length; i++) if (it.tiles[i] !== plan.tiles[i]) changed[i] = it.tiles[i];
  const out = { ...it, changed };
  for (const k of PLANNED) delete out[k];
  delete out.tiles;
  return out;
}

// An inside from a save, made whole again.
export function unpackInterior(saved) {
  if (!saved || saved.planSeed === undefined || saved.tiles) return saved;
  const plan = planFor(saved.planSeed, saved.planFrom);
  const copy = JSON.parse(JSON.stringify(plan));
  // In the same order as a new inside, so that a game read back is the same text as the game saved.
  const it = { planSeed: saved.planSeed, planFrom: saved.planFrom, ...copy, ...saved };
  for (const [i, c] of Object.entries(saved.changed || {})) it.tiles[+i] = c;
  delete it.changed;
  return it;
}

// The rest of a new inside: what is in it and who, from the game's own random numbers.
function fillInterior(state, it, wreck) {
  const { rooms } = it;
  const base = wreck.kind === 'station';
  Object.assign(it, {
    // The airlock the crew comes in through. tryBoard sets it to the one the frigate is docked at.
    entry: it.airlocks[0],
    // The airlocks of a base, each with a hatch and an inner door that are never open together. See airlock.js.
    locks: base ? makeLocks(it) : [],
    timer: null,
    live: false,
    // A wreck has no power. It is dark inside, and the crew finds its way by lamp and flare.
    wreck: !base,
    dark: !base,
    // How a place that counts the crew as an enemy takes them: 'lockdown' until someone is found out, then
    // 'alarm' until they have all left. A wreck has nobody to sound an alarm, and a place that trades is calm.
    mood: null,
    // A spot that the Captain has marked on the boarding radar, for the boarders to see.
    pin: null,
    // How far the Engineer has come with what they are working on with the use key: turning a turret,
    // switching off an alarmed door or steadying the reactor. From 0 to 1.
    turning: 0,
    doorCut: 0,
    doorOpen: false,
    // The station's mainframe, in the command room on the top floor, and what has been done at it: which
    // of the three levels of a hack are done, the one being worked on, how far each has come, and how full the
    // trace meter is. See mainframe.js.
    mainframe: null,
    hack: null,
    hacked: [false, false, false],
    work: [0, 0, 0],
    trace: 0,
    // Seconds left that the cameras and turrets are switched off from the mainframe.
    blackout: 0,
    // Whether the boarders have the floor plan from the mainframe, with the guards, cameras and alarmed doors.
    plan: false,
    // Whether the crew is taking a station that traded with them, from the inside.
    seize: false,
    // The power of a base, the switchgear that puts it out, the drone hangar, the console that stops a call for
    // help, the call itself, and how far things have gone since the power went out. See pressure.js.
    power: true,
    breaker: null,
    hangar: null,
    comms: null,
    call: null,
    pressure: null,
    // Where the turning lights of an alarm are, spread evenly over the floor (R-1182).
    beacons: [],
    // The tiles of the doors that are shut. What each room is for and the doors themselves are in the plan.
    shut: [],
    trade: false,
    // The rooms of a trading station that are for its staff only, by number. See makeTrade.
    staff: [],
    desks: [],
    civilians: [],
    avatars: [],
    guards: [],
    turrets: [],
    cameras: [],
    // Doors that give the crew away when someone walks through them, until the Engineer has switched them off.
    alarmed: [],
    // The reactor of a wreck, where the Engineer can buy the crew more time, once.
    reactor: null,
    sentries: [],
    loot: [],
    bolts: [],
    grenades: [],
    flares: [],
    fx: [],
  });
  const roomFor = (use) => rooms.find((r) => r.use === use);
  if (base) {
    // What stands in a base: the mainframe in the command room, the switchgear, the drone hangar and the comms.
    it.mainframe = { ...roomFor('COMMAND').mid };
    it.breaker = { ...roomFor('BREAKER').mid, out: false, loud: false };
    it.hangar = { ...roomFor('DRONES').mid, out: false };
    it.comms = { ...roomFor('COMMS').mid };
    it.beacons = beaconsFor(it);
  }
  // The reactor of a wreck stands where the plan put its engines, or in the room furthest in (see madePlan).
  const deep = it.deep >= 0 ? rooms[it.deep] : null;
  // A friendly or neutral station is a place to walk around and trade in, with nothing to fight.
  if (isTrading(wreck)) {
    makeTrade(state, it, wreck);
    return it;
  }
  if (base) fillBase(state, it, wreck);
  else fillWreck(state, it, wreck, deep);
  // A ship that was knocked out has its crew and power (F-081, R-590).
  if (wreck.crew) crewInside(state, it);
  return it;
}

// Rooms that nothing is put in: the ways in and out, the ways between floors, the rooms of the guns and those
// that have something of their own standing in the middle.
const KEPT_CLEAR = new Set(['AIRLOCK', 'LIFT', 'STAIRS', 'LADDER', 'GUN', 'VAULT', 'COMMAND', 'BREAKER', 'DRONES']);

const plainRooms = (it) => it.rooms.map((r, i) => i).filter((i) => !KEPT_CLEAR.has(it.uses[i]));

// Guards, turrets and loot for a wreck.
function fillWreck(state, it, wreck, deep) {
  const { rooms, vault } = it;
  const taken = [];
  const spot = (box, away = 0) => spotIn(state, it, box, taken, away);
  const difficulty = wreck.difficulty;
  const open = rooms.map((_, i) => i).filter((i) => i !== vault);
  const anyRoom = () => rooms[open[Math.floor(rand(state) * open.length)]];
  // `what` is called after the spot is found, so that the random numbers come in a fixed order.
  const addLoot = (room, what) => {
    const p = spot(room);
    it.loot.push({ id: state.nextId++, ...what(), ...p });
  };
  // Guards: the first one in the corridor, the rest in the rooms. More of them where it is more dangerous, and of
  // harder kinds the more dangerous the place and the sector are. A large hull has as many as its floor is
  // large, so that it feels as closely guarded as a small one (R-1182).
  const danger = difficulty + currentSector(state).tier;
  const count = Math.max(difficulty + 1, Math.round(floorArea(it) / B.GUARD_AREA));
  for (let i = 0; i < count; i++) {
    const hall = it.halls[Math.floor(rand(state) * it.halls.length)];
    const p = i === 0 ? spot(hall, 12 * TILE) : spot(anyRoom(), 7 * TILE);
    it.guards.push(newGuard(state, p, rand(state) * TAU, guardKind(state, 'wreck', danger)));
  }
  // Turrets: the first one at the far end of the corridor.
  for (let i = 0; i < difficulty - 1; i++) {
    const p = i === 0 ? { x: it.far.x, y: it.far.y + (rand(state) - 0.5) * TILE } : spot(anyRoom(), 8 * TILE);
    taken.push(p);
    it.turrets.push(newTurret(state, p, Math.PI * 1.5));
  }
  // Loot: crates in the rooms, and the best of it in the vault. A wreck holds one fuel cell or none, enough for
  // one jump (F-229).
  if (rand(state) < B.WRECK_CELL_CHANCE) addLoot(anyRoom(), () => ({ type: 'cell' }));
  for (let i = 0; i < 2 + difficulty; i++) {
    addLoot(anyRoom(), () => ({ type: 'crate', value: credits(state, B.CRATE_CREDITS) }));
  }
  fillVault(state, it, wreck, addLoot);
  if (deep) it.reactor = { ...spot(deep), steadied: false };
  // In a wreck most of the guards stand at a post.
  planRounds(state, it, 0.34);
}

// A spot for a camera in a box of walls: on a wall, looking out over the floor in front of it. Never in a
// doorway, and never with something tall right in front of it (R-1166). Null when the box has no such wall.
export function wallMount(state, it, box) {
  const open = (tx, ty) => '.,'.includes(tileAt(it, tx, ty));
  const doorway = new Set(it.doors.flatMap((d) => d.tiles));
  const fits = [];
  for (let ty = box.r0 + 1; ty < box.r1; ty++)
    for (let tx = box.c0 + 1; tx < box.c1; tx++) {
      if (!open(tx, ty) || doorway.has(ty * it.w + tx)) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        // A wall behind it, with wall on both sides of that, and three tiles of open floor in front.
        if (tileAt(it, tx - dx, ty - dy) !== '#') continue;
        if (tileAt(it, tx - dx + dy, ty - dy + dx) !== '#' || tileAt(it, tx - dx - dy, ty - dy - dx) !== '#') continue;
        if (![1, 2, 3].every((k) => open(tx + dx * k, ty + dy * k))) continue;
        const x = (tx + 0.5 - dx * 0.4) * TILE,
          y = (ty + 0.5 - dy * 0.4) * TILE;
        if (!blocked(it, x, y, 1)) fits.push({ x, y, rest: headingTo(dx, dy) });
      }
    }
  return fits.length ? fits[Math.floor(rand(state) * fits.length)] : null;
}

function addCamera(state, it, box) {
  const at = box && wallMount(state, it, box);
  if (at) it.cameras.push({ id: state.nextId++, ...at, phase: rand(state) * TAU });
}

// Where the turning lights of an alarm are: one for every 300 tiles of floor, spread evenly along the corridors
// and over the holds (R-1182).
export function beaconsFor(it) {
  const spots = [];
  const every = 9;
  for (const h of it.halls) {
    const w = h.c1 - h.c0 - 1,
      tall = h.r1 - h.r0 - 1;
    const n = Math.max(1, Math.round(Math.max(w, tall) / every));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      spots.push(
        w >= tall
          ? { x: (h.c0 + 1 + w * u) * TILE, y: (h.r0 + 1 + tall / 2) * TILE }
          : { x: (h.c0 + 1 + w / 2) * TILE, y: (h.r0 + 1 + tall * u) * TILE },
      );
    }
  }
  it.rooms.forEach((r) => {
    if (r.use !== 'HOLD' && r.use !== 'CARGO') return;
    for (let x = r.c0 + 5; x < r.c1 - 3; x += every) spots.push({ x: x * TILE, y: r.mid.y });
  });
  const want = Math.max(1, Math.round(floorArea(it) / B.BEACON_AREA));
  const free = spots.filter((p) => !blocked(it, p.x, p.y, 2));
  // Every so-and-so-many of them, so that those that are kept lie evenly.
  const out = [];
  for (let k = 0; k < Math.min(want, free.length); k++)
    out.push(free[Math.floor((k * free.length) / Math.min(want, free.length))]);
  return out;
}

// Guards, turrets, cameras and loot for a base that counts the crew as an enemy. It is in lockdown: dim, with
// its doors shut, and on its guard.
function fillBase(state, it, st) {
  const taken = [it.mainframe, it.breaker, it.hangar, it.comms].map((p) => ({ x: p.x, y: p.y }));
  const spot = (box, away = 0) => spotIn(state, it, box, taken, away);
  const pick = (list) => list[Math.floor(rand(state) * list.length)];
  const inner = defenseOf(st).inner;
  const danger = st.difficulty + currentSector(state).tier;
  const where = st.side === PIRATE ? 'pirate' : 'other';
  const plain = plainRooms(it);
  const onDeck = (deck) => plain.filter((i) => it.rooms[i].deck === deck).map((i) => it.rooms[i]);
  const hallsOn = (deck) => it.halls.filter((h) => h.deck === deck);
  const roomFor = (use, deck) => it.rooms.find((r) => r.use === use && (deck === undefined || r.deck === deck));
  const addLoot = (room, what) => {
    const p = spot(room);
    it.loot.push({ id: state.nextId++, ...what(), ...p });
  };
  // Guards: as many as the floor is large (R-1182), and more for the security that was bought for the base. The
  // first two are on the top floor, the rest are spread over all three.
  const count = Math.round(floorArea(it) / B.GUARD_AREA) + inner;
  for (let i = 0; i < count; i++) {
    const r = rand(state);
    const deck = i < 2 ? 2 : r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
    const box = rand(state) < 0.35 ? pick(hallsOn(deck)) : pick(onDeck(deck));
    it.guards.push(
      newGuard(state, spot(box, deck === 1 ? 10 * TILE : 0), rand(state) * TAU, guardKind(state, where, danger)),
    );
  }
  // Turrets: at the security checkpoint in the middle and outside the command room, and more with security.
  const posts = [roomFor('SECURITY', 1), pick(hallsOn(2)), roomFor('HOLD'), roomFor('SECURITY', 2), pick(hallsOn(0))];
  for (let i = 0; i < st.difficulty - 1 + inner && i < posts.length; i++) {
    const box = posts[i];
    if (!box) continue;
    const p = spot(box, 8 * TILE);
    const to = box.door || it.mainframe;
    it.turrets.push(newTurret(state, p, headingTo(to.x - p.x, to.y - p.y)));
  }
  // Cameras, on the walls: at the checkpoint, in the corridors and in the hold, and more with security.
  const watched = [roomFor('SECURITY', 1), pick(hallsOn(2)), pick(hallsOn(0)), roomFor('HOLD'), roomFor('OFFICE', 1)];
  for (let i = 0; i < 3 + inner && i < watched.length; i++) addCamera(state, it, watched[i]);
  // Loot: crates in the rooms, most of them in the basement, and the best of it in the vault with a fuel cell.
  for (let i = 0; i < 4 + st.difficulty; i++) {
    const room = pick(rand(state) < 0.6 ? onDeck(0) : [...onDeck(1), ...onDeck(2)]);
    addLoot(room, () => ({ type: 'crate', value: credits(state, B.CRATE_CREDITS) }));
  }
  fillVault(state, it, st, addLoot);
  setMood(it, 'lockdown');
  // The ladders are behind doors with an alarm on them, and so are some of the rooms with something to take.
  for (const d of it.doors) {
    if (d.kind !== 'alarm') continue;
    const first = d.tiles[0];
    it.alarmed.push({ x: d.x, y: d.y, tx: first % it.w, ty: Math.floor(first / it.w), tiles: d.tiles, off: false });
  }
  alarmDoors(state, it);
  // On a base most guards walk a round.
  planRounds(state, it, 0.7);
}

// Turn an interior into a trading floor: doors open, desks to trade at, people walking about. The rooms that
// are not open to visitors are for the staff (docs/station-boarding.md, section 3): guards walk there and
// cameras watch them, and a visitor who is seen there gives the crew away. The crew's own station has no staff
// to hide from.
export function makeTrade(state, it, st) {
  it.trade = true;
  it.doorOpen = true;
  it.timer = null;
  it.seize = false;
  it.hack = null;
  it.blackout = 0;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
  setMood(it, null);
  it.guards = [];
  it.turrets = [];
  it.cameras = [];
  it.alarmed = [];
  it.bolts = [];
  it.grenades = [];
  it.flares = [];
  // A desk in each of the rooms that visitors come for.
  const roomFor = (use) => it.rooms.find((r) => r.use === use);
  const yard = roomFor('SHIPYARD') || roomFor('LOUNGE');
  it.desks = [
    ['services', roomFor('SERVICES')],
    ['shipyard', yard],
    ['armory', roomFor('ARMORY')],
    // The table in the bar where side missions are taken (D-073, R-1252).
    [
      'jobs',
      roomFor('BAR') ||
        roomFor('MARKET') ||
        roomFor('HOTEL') ||
        (yard === roomFor('LOUNGE') ? null : roomFor('LOUNGE')),
    ],
  ]
    .filter(([, room]) => room)
    .map(([type, room]) => ({ type, ...room.mid }));
  it.staff = it.rooms.map((r, i) => i).filter((i) => it.rooms[i].staff);
  // People walk about in the concourse and in the rooms that are open to them.
  it.civilians = [];
  const taken = it.desks.map((d) => ({ x: d.x, y: d.y }));
  taken.push(it.mainframe);
  const halls = it.halls.filter((h) => h.deck === 1 && !h.staff);
  const open = plainRooms(it)
    .map((i) => it.rooms[i])
    .filter((r) => r.deck === 1 && !r.staff);
  for (let i = 0; i < 9; i++) {
    const box = i < 5 ? halls[i % halls.length] : open[i % open.length];
    const { x, y } = spotIn(state, it, box, taken);
    it.civilians.push({
      id: state.nextId++,
      x,
      y,
      heading: rand(state) * TAU,
      home: { x, y },
      goal: { x, y },
      wait: rand(state) * 3,
    });
  }
  if (st && st.side !== CREW) staffUp(state, it, st, taken);
  // The crew's own mainframe is theirs to walk up to.
  else if (st) openCommand(it);
}

// Guards and cameras for the staff's part of a trading station: the basement, the top and the back rooms of
// the middle. They keep to their rounds, and only take notice of a visitor who is somewhere they should not be.
// While all is calm there is one guard for every 1200 tiles of floor (R-1182).
function staffUp(state, it, st, taken) {
  const rooms = plainRooms(it)
    .map((i) => it.rooms[i])
    .filter((r) => r.staff);
  if (!rooms.length) return;
  const tier = currentSector(state).tier;
  const n = Math.round(floorArea(it) / B.GUARD_AREA_CALM) + ((st.defense && st.defense.inner) || 0);
  for (let i = 0; i < n; i++) {
    const p = spotIn(state, it, rooms[Math.floor(rand(state) * rooms.length)], taken);
    it.guards.push(newGuard(state, p, rand(state) * TAU, guardKind(state, 'other', tier + 1)));
  }
  const security = it.rooms.filter((r) => r.use === 'SECURITY');
  const halls = it.halls.filter((h) => h.staff);
  for (const box of [...security, halls[0], halls[halls.length - 1]]) addCamera(state, it, box);
  planRounds(state, it, 0.5);
}
