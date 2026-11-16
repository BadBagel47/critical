// Boarding: the top-down interior of a wreck, with guards, turrets, loot and the teleporter.
import { B } from './balance.js';
import { earn } from './purses.js';
import { currentSector } from './sectors.js';
import { removeThing, thingsOf, dockTargets, findDock, portsOf } from './things.js';
import { shipNose } from './ship.js';
import { layOut } from './layout.js';
import { TILE, tileAt, solidAt, blocked, move, los } from './floor.js';
import { newGuard, stepGuard, alertGuard, planRounds, awake, guardKind, kindOf, inStaff } from './guards.js';
import { makeVessel } from './vessels.js';
import { PIRATE, CREW } from './sides.js';
import { playerById, leavePost, returnToPost } from './players.js';
import { isTrading } from './stations.js';
import { stepHack, stepMainframe, turnOnCrew, MAINFRAME_REACH } from './mainframe.js';
import { usesOf, furnish, doorsOf, stepDoors } from './furnish.js';
import { has, level, fuelMax, crewHpMax, carryMax, rifleDmg, teleCooldown, breakinBonus } from './upgrades.js';
import { damageShip } from './damage.js';
import { createBreakin, stepBreakin } from './breakin.js';
import { hopsFrom } from './world.js';
import { readChart } from './intel.js';
import { clamp, forward, headingTo, angleDiff, turnToward, dist, rand, randRange, TAU } from './util.js';

export { TILE, tileAt, blocked, los };

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
      // The vault door counts as a way through here: it is the crew's to open.
      if (c !== '.' && c !== ',' && c !== 'A' && c !== 'L') continue;
      seen.add(key);
      queue.push({ tx, ty });
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

// A turret. `rest` is the way it points while it watches. `hot` is how long it still follows what it has
// seen, `out` how long it is still knocked out, and `turned` how long it is still on the crew's side.
const newTurret = (state, p, rest) => ({
  id: state.nextId++,
  x: p.x,
  y: p.y,
  hp: B.TURRET_HP,
  heading: rest,
  rest,
  cool: 1,
  hot: 0,
  out: 0,
  turned: 0,
});
// Which way a camera looks right now.
export const cameraWay = (state, c) => c.rest + Math.sin(state.time * B.CAMERA_SPEED + c.phase) * B.CAMERA_SWEEP;

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

export function createInterior(state, wreck) {
  const plan = layOut(state, wreck);
  const { rooms, vault } = plan;
  const it = {
    w: plan.w,
    h: plan.h,
    tiles: plan.tiles,
    rooms,
    vault,
    halls: plan.halls,
    airlocks: plan.airlocks,
    far: plan.far,
    // The airlock the crew comes in through. tryBoard sets it to the one at the arm the frigate is docked at.
    entry: plan.airlocks[0],
    timer: null,
    live: false,
    // A wreck has no power. It is dark inside, and the crew finds its way by lamp and flare.
    dark: wreck.kind === 'wreck',
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
    // The station's mainframe, in the room furthest in apart from the vault, and what has been done at it: which
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
    // What each room is for, the doors of the rooms, and the tiles of those that are shut. See furnish.js.
    uses: [],
    doors: [],
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
  };
  // Every station has a mainframe, as far in as it goes. It stands in the room furthest from the way in that is
  // not the vault, so that a hack can open the vault.
  if (wreck.kind === 'station') {
    const rest = rooms.filter((_, i) => i !== vault);
    const away = (r) => dist(r.mid.x, r.mid.y, it.entry.x, it.entry.y);
    const far = [...rest].sort((a, b) => away(b) - away(a))[0] || rooms[vault];
    it.mainframe = { ...far.mid };
  }
  // What the rooms are for, and the things in them. The engines of a wreck are in the room furthest in, where
  // its reactor stands.
  const away = (r) => dist(r.mid.x, r.mid.y, it.entry.x, it.entry.y);
  const rest = rooms.filter((_, i) => i !== vault);
  const deep = wreck.kind === 'wreck' ? [...rest].sort((a, b) => away(b) - away(a))[0] : null;
  it.uses = usesOf(it, wreck, deep);
  furnish(it);
  it.doors = doorsOf(it);
  // A friendly or neutral station is a place to walk around and trade in, with nothing to fight.
  if (isTrading(wreck)) {
    makeTrade(state, it, wreck);
    return it;
  }
  // Nothing is put down on top of the mainframe.
  const taken = it.mainframe ? [it.mainframe] : [];
  const spot = (box, away = 0) => spotIn(state, it, box, taken, away);
  const difficulty = wreck.difficulty;
  const vaultRoom = rooms[vault];
  const open = rooms.map((_, i) => i).filter((i) => i !== vault);
  const anyRoom = () => rooms[open[Math.floor(rand(state) * open.length)]];
  const credits = (range) => Math.round(randRange(state, range[0], range[1]) / 5) * 5;
  // `what` is called after the spot is found, so that the random numbers come in a fixed order.
  const addLoot = (room, what) => {
    const p = spot(room);
    it.loot.push({ id: state.nextId++, ...what(), ...p });
  };

  // Guards: the first one in the corridor, the rest in the rooms. More of them where it is more dangerous, and of
  // harder kinds the more dangerous the place and the sector are.
  const where = wreck.kind !== 'station' ? 'wreck' : wreck.side === PIRATE ? 'pirate' : 'other';
  const danger = difficulty + currentSector(state).tier;
  const kind = () => guardKind(state, where, danger);
  for (let i = 0; i < difficulty + 1; i++) {
    const hall = it.halls[Math.floor(rand(state) * it.halls.length)];
    const p = i === 0 ? spot(hall, 12 * TILE) : spot(anyRoom(), 7 * TILE);
    it.guards.push(newGuard(state, p, rand(state) * TAU, kind()));
  }
  // Turrets: the first one at the far end of the corridor.
  for (let i = 0; i < difficulty - 1; i++) {
    const p = i === 0 ? { x: it.far.x, y: it.far.y + (rand(state) - 0.5) * TILE } : spot(anyRoom(), 8 * TILE);
    taken.push(p);
    it.turrets.push(newTurret(state, p, Math.PI * 1.5));
  }
  // Loot: crates in the rooms, and the best of it in the vault. A wreck holds one fuel cell or none, enough for
  // one jump (F-229). A station keeps one in its vault.
  if (wreck.kind !== 'station' && rand(state) < B.WRECK_CELL_CHANCE) addLoot(anyRoom(), () => ({ type: 'cell' }));
  for (let i = 0; i < 2 + difficulty; i++) {
    addLoot(anyRoom(), () => ({ type: 'crate', value: credits(B.CRATE_CREDITS) }));
  }
  for (let i = 0; i < 2; i++) addLoot(vaultRoom, () => ({ type: 'crate', value: credits(B.VAULT_CREDITS) }));
  if (wreck.kind === 'station') addLoot(vaultRoom, () => ({ type: 'cell' }));
  // Vaults sometimes hold a star chart of the nearest system the crew knows nothing of, or a spare slot. A
  // station vault always has a chart while there are such systems left. The vault of a pirate station holds
  // the chart that opens the lane to the end, until the crew has it (R-1098).
  const hops = hopsFrom(state.sectors, state.sector);
  const end = state.sectors.find((x) => x.boss);
  const key = wreck.kind === 'station' && wreck.side === PIRATE && end && !state.charts.includes(end.id);
  const missing = state.sectors
    .filter((x) => x.id !== state.sector && !x.boss && !x.intel && !state.charts.includes(x.id))
    .sort((a, b) => hops[a.id] - hops[b.id] || a.id - b.id);
  if (key) missing.unshift(end);
  if (missing.length && (wreck.kind === 'station' || rand(state) < 0.35)) {
    addLoot(vaultRoom, () => ({ type: 'chart', sector: missing[0].id }));
  }
  if (rand(state) < 0.2) addLoot(vaultRoom, () => ({ type: 'part', slot: rand(state) < 0.5 ? 'hard' : 'system' }));
  // A hostile station is taken over from its mainframe, and has two more guards, and more again for the
  // security that the crew bought for it while it was theirs.
  if (wreck.kind === 'station') {
    const more = 2 + ((wreck.defense && wreck.defense.inner) || 0);
    for (let i = 0; i < more; i++) it.guards.push(newGuard(state, spot(anyRoom(), 8 * TILE), 0, kind()));
    // A station that counts the crew as an enemy is in lockdown: dark, and on its guard.
    it.mood = 'lockdown';
    it.dark = true;
    // Cameras in some of its rooms. Each sweeps from side to side about the way to the room's door.
    for (const room of open
      .map((i) => rooms[i])
      .filter((r) => r.door)
      .slice(0, 3)) {
      const rest = headingTo(room.door.x - room.mid.x, room.door.y - room.mid.y);
      it.cameras.push({ id: state.nextId++, x: room.mid.x, y: room.mid.y, rest, phase: rand(state) * TAU });
    }
  }
  if (wreck.kind === 'station') alarmDoors(state, it);
  // The reactor of a wreck stands in the room that is furthest from the way in.
  else {
    const far = open
      .map((i) => rooms[i])
      .sort(
        (a, b) => dist(b.mid.x, b.mid.y, it.entry.x, it.entry.y) - dist(a.mid.x, a.mid.y, it.entry.x, it.entry.y),
      )[0];
    if (far) it.reactor = { ...spot(far), steadied: false };
  }
  // On a station most guards walk a round. In a wreck most of them stand at a post.
  planRounds(state, it, wreck.kind === 'station' ? 0.7 : 0.34);
  return it;
}

// Turn an interior into a trading floor: doors open, desks to trade at, people walking about. The rooms without a
// desk are for the staff (docs/station-boarding.md, section 3): guards walk there and cameras watch them, and a
// visitor who is seen there gives the crew away. The crew's own station has no staff to hide from.
export function makeTrade(state, it, st) {
  it.trade = true;
  it.mood = null;
  it.dark = false;
  it.doorOpen = true;
  it.timer = null;
  it.seize = false;
  it.hack = null;
  it.blackout = 0;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
  it.guards = [];
  it.turrets = [];
  it.cameras = [];
  it.alarmed = [];
  it.bolts = [];
  it.grenades = [];
  it.flares = [];
  // A desk in each of the three largest rooms, apart from the vault and the room with the mainframe.
  const mf = it.mainframe;
  const all = it.rooms.filter((_, i) => i !== it.vault);
  const free = all.filter((r) => !mf || r.mid.x !== mf.x || r.mid.y !== mf.y);
  const open = free.length ? free : all;
  const area = (rm) => (rm.c1 - rm.c0) * (rm.r1 - rm.r0);
  const largest = [...open].sort((a, b) => area(b) - area(a) || a.c0 - b.c0 || a.r0 - b.r0);
  it.desks = ['services', 'shipyard', 'armory'].map((type, k) => ({ type, ...largest[k % largest.length].mid }));
  const front = largest.slice(0, 3);
  it.staff = it.rooms.map((r, i) => i).filter((i) => !front.includes(it.rooms[i]));
  it.civilians = [];
  const taken = it.desks.map((d) => ({ x: d.x, y: d.y }));
  if (it.mainframe) taken.push(it.mainframe);
  for (let i = 0; i < 6; i++) {
    const box = i < 3 ? it.halls[i % it.halls.length] : front[i % front.length];
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
}

// Guards and cameras for the staff rooms of a trading station. They keep to their rounds, and only take notice of
// a visitor who is somewhere they should not be.
function staffUp(state, it, st, taken) {
  const rooms = it.staff.map((i) => it.rooms[i]);
  if (!rooms.length) return;
  const tier = currentSector(state).tier;
  const n = 1 + tier + ((st.defense && st.defense.inner) || 0);
  for (let i = 0; i < n; i++) {
    const p = spotIn(state, it, rooms[i % rooms.length], taken);
    it.guards.push(newGuard(state, p, rand(state) * TAU, guardKind(state, 'other', tier + 1)));
  }
  for (const room of rooms.filter((r) => r.door).slice(0, 2)) {
    const rest = headingTo(room.door.x - room.mid.x, room.door.y - room.mid.y);
    it.cameras.push({ id: state.nextId++, x: room.mid.x, y: room.mid.y, rest, phase: rand(state) * TAU });
  }
  planRounds(state, it, 0.5);
}

// Where a boarder stands when they have just come in: a step inside the airlock, side by side.
function comeIn(it, k) {
  const e = it.entry;
  const side = k * 8 - 6;
  return { x: e.x + e.nx * 14 - e.ny * side, y: e.y + e.ny * 14 + e.nx * side, heading: Math.atan2(e.nx, -e.ny) };
}
// The crew comes in through the airlock at the port the frigate is docked at.
function useAirlock(state, place, it) {
  const nose = shipNose(state.ship);
  const ports = portsOf(place);
  let best = 0;
  ports.forEach((p, i) => {
    if (dist(p.x, p.y, nose.x, nose.y) < dist(ports[best].x, ports[best].y, nose.x, nose.y)) best = i;
  });
  it.entry = it.airlocks[best] || it.airlocks[0];
}

// ---------- players ----------
export const anyoneInside = (state, wreckId) =>
  state.players.some((p) => (wreckId === undefined ? p.inside !== null : p.inside === wreckId));

export function tryBoard(state, playerId) {
  const player = playerById(state, playerId);
  const ship = state.ship;
  if (!player || player.inside !== null || !ship.docked) return false;
  const wreck = findDock(state, ship.docked);
  if (!wreck) return false;
  // A station that will not deal with the crew lets nobody aboard.
  if (wreck.kind === 'station' && wreck.closed) {
    state.events.push({ type: 'stationClosed', player: playerId, name: wreck.name });
    return false;
  }
  // Friendly and neutral stations are open to walk into. No lock, no teleporter needed.
  if (isTrading(wreck)) {
    if (!wreck.interior) wreck.interior = createInterior(state, wreck);
    const floor = wreck.interior;
    if (!floor.trade) makeTrade(state, floor, wreck);
    floor.live = true;
    if (!floor.avatars.length) useAirlock(state, wreck, floor);
    player.inside = wreck.id;
    leavePost(player);
    floor.avatars.push({
      player: playerId,
      ...comeIn(floor, floor.avatars.length),
      carry: [],
      cool: 0,
      grenades: 0,
      charges: 0,
      sentries: 0,
      flares: 0,
      lamp: false,
      role: player.backTo,
      spotted: 0,
      watched: false,
      weapon: 'rifle',
      darts: 0,
    });
    state.events.push({ type: 'boarded', player: playerId, wreck: wreck.id, trade: true });
    return true;
  }
  if (wreck.lock !== 'open') {
    // The docking lock has to be bypassed first. Opening the panel starts the clock.
    if (!wreck.breakin) wreck.breakin = createBreakin(state, wreck, breakinBonus(ship));
    wreck.breakin.started = true;
    state.events.push({ type: 'breakinOpened', player: playerId, wreck: wreck.id });
    return false;
  }
  if (player.tele > 0) {
    state.events.push({ type: 'teleCharging', player: playerId, left: player.tele });
    return false;
  }
  if (player.lockedOut === wreck.id) {
    state.events.push({ type: 'lockedOut', player: playerId });
    return false;
  }
  if (!wreck.interior) wreck.interior = createInterior(state, wreck);
  const it = wreck.interior;
  if (wreck.kind === 'wreck' && it.timer === null) {
    // Every failed bypass has cost the reactor some of its time.
    it.timer = Math.max(30, B.REACTOR_TIME[wreck.difficulty] - wreck.lockFails * B.LOCK_FAIL_REACTOR);
  }
  it.live = true;
  if (!it.avatars.length) useAirlock(state, wreck, it);
  player.inside = wreck.id;
  leavePost(player);
  const av = {
    player: playerId,
    ...comeIn(it, it.avatars.length),
    carry: [],
    cool: 0,
    lamp: true,
    // The post that the boarder left to come here. Some things inside can only be done by one post.
    role: player.backTo,
    // How sure the guards are that they have seen this boarder, from 0 to 1, and whether one is watching now.
    spotted: 0,
    watched: false,
    // The rifle, or the tranquilliser gun with its darts.
    weapon: 'rifle',
  };
  gearUp(state, av);
  it.avatars.push(av);
  state.events.push({ type: 'boarded', player: playerId, wreck: wreck.id });
  return true;
}

// What a boarder brings to a fight: grenades, the Gunner's breaching charge, the turret, flares and darts. A
// visitor on a trading station brings none of it, until the station turns on the crew while they are inside.
export function gearUp(state, av) {
  const ship = state.ship;
  av.grenades = B.GRENADES;
  // Only the Gunner carries the ship's breaching charge.
  av.charges = av.role === 'gunner' ? level(ship, 'charge') : 0;
  av.sentries = has(ship, 'sentry') ? 1 : 0;
  av.flares = has(ship, 'flare') ? B.FLARES : 0;
  av.darts = has(ship, 'tranq') ? B.TRANQ_DARTS : 0;
}

function leave(state, it, av, teleported) {
  const player = playerById(state, av.player);
  it.avatars = it.avatars.filter((a) => a !== av);
  if (teleported) {
    // What was carried stays where the player stood.
    for (const item of av.carry)
      it.loot.push({ ...item, x: av.x + randRange(state, -6, 6), y: av.y + randRange(state, -6, 6) });
    player.lockedOut = player.inside;
    player.tele = teleCooldown(state.ship);
    player.hp = Math.max(1, player.hp);
    it.fx.push({ type: 'teleport', x: av.x, y: av.y, t: 0, dur: 0.6 });
    state.events.push({ type: 'teleported', player: av.player });
  } else {
    state.events.push({ type: 'returned', player: av.player });
  }
  player.inside = null;
  returnToPost(state, player);
  // An alarm lasts until the last boarder has left. Then the place is on its guard again.
  if (!it.avatars.length) it.hack = null;
  if (!it.avatars.length && it.mood === 'alarm') {
    it.mood = 'lockdown';
    it.seize = false;
    for (const g of it.guards) {
      g.mode = 'idle';
      g.path = [];
      g.pause = 0;
    }
  }
}

// Whether there is a fight on: the place is hunting the crew, or a guard or a turret is after someone.
const fighting = (it) =>
  it.mood === 'alarm' || it.guards.some((g) => g.mode === 'alert' && awake(g)) || it.turrets.some((t) => t.hot > 0);

// Something has given the crew away at `at`. A place with an alarm sounds it, and every guard that is awake
// knows where to look. A wreck has no alarm: there only the guards that noticed are after the crew.
export function foundOut(state, it, at) {
  if (!it.mood) return;
  if (it.mood !== 'alarm') state.events.push({ type: 'foundOut' });
  it.mood = 'alarm';
  for (const g of it.guards) alertGuard(g, at);
}
// The crew is seen where it should not be. On a trading station that turns the station on them, see mainframe.js.
function giveAway(state, place, it, at) {
  if (it.trade) turnOnCrew(state, place, at, true);
  else foundOut(state, it, at);
}
// A loud noise at `at`: guards near enough to hear it come looking, and it gives the crew away.
function heard(state, it, at) {
  for (const g of it.guards) if (dist(g.x, g.y, at.x, at.y) < B.SHOT_HEARD) alertGuard(g, at);
  foundOut(state, it, at);
}

// The ship is leaving: everyone still inside is teleported home, at the usual cost.
export function teleportAllHome(state, targetId) {
  const target = findDock(state, targetId);
  if (!target || !target.interior) return 0;
  const inside = [...target.interior.avatars];
  // Leaving a trading station is just walking out. Anywhere else it is a teleport.
  for (const av of inside) leave(state, target.interior, av, !target.interior.trade);
  return inside.length;
}

function deposit(state, av) {
  if (!av.carry.length) return;
  let fuel = 0,
    credits = 0;
  for (const item of av.carry) {
    if (item.type === 'cell') fuel += B.CELL_FUEL;
    else if (item.type === 'chart') {
      if (state.charts.includes(item.sector)) credits += 60;
      else {
        state.charts.push(item.sector);
        readChart(state, item.sector);
        state.events.push({ type: 'chart', sector: item.sector });
        if (state.sectors[item.sector].boss)
          state.events.push({ type: 'laneOpen', name: state.sectors[item.sector].name });
      }
    } else if (item.type === 'part') {
      state.ship.slots[item.slot]++;
      state.events.push({ type: 'slotFound', slot: item.slot });
    } else credits += item.value;
  }
  state.ship.fuel = Math.min(fuelMax(state.ship), state.ship.fuel + fuel);
  earn(state, credits);
  state.events.push({ type: 'deposit', player: av.player, fuel, credits, count: av.carry.length });
  av.carry = [];
}

function hurtAvatar(state, it, av, dmg) {
  const player = playerById(state, av.player);
  player.hp -= dmg;
  it.fx.push({ type: 'hit', x: av.x, y: av.y, t: 0, dur: 0.2 });
  if (player.hp <= B.TELEPORT_HP) leave(state, it, av, true);
}

function explode(state, it, g) {
  it.fx.push({ type: 'boom', x: g.x, y: g.y, t: 0, dur: 0.45, size: B.GRENADE_RADIUS });
  state.events.push({ type: 'grenade' });
  const inBlast = (e) => dist(e.x, e.y, g.x, g.y) < B.GRENADE_RADIUS && los(it, g.x, g.y, e.x, e.y);
  for (const e of it.guards) if (inBlast(e)) e.hp -= B.GRENADE_DMG;
  for (const e of it.turrets) {
    if (!inBlast(e)) continue;
    if (it.mood) e.out = B.TURRET_OUT;
    else e.hp -= B.GRENADE_DMG;
  }
  for (const av of [...it.avatars]) if (inBlast(av)) hurtAvatar(state, it, av, B.GRENADE_SELF_DMG);
  heard(state, it, g);
}

// ---------- what a boarder does ----------
const atAirlockDoor = (it, av) => dist(av.x, av.y, it.entry.x, it.entry.y) < TILE * 1.8;
// What there is to work with where a boarder stands, for the screen to show: the airlock, a desk,
// the mainframe, or the vault door (`cut` when they are near enough to cut it and not only to blow it).
export function useTarget(it, av) {
  // A guard that sleeps can be taken down for the rest of the boarding, by the one who gets to it in time.
  const asleep = it.guards.find((g) => g.sleep > 0 && !g.down && dist(g.x, g.y, av.x, av.y) < B.TAKE_DOWN_REACH);
  if (asleep) return { type: 'guard', guard: asleep };
  if (av.role === 'engineer') {
    // The Engineer can turn a turret to the crew's side for a while, standing next to it, switch off an
    // alarmed door from beside it, and steady the reactor of a wreck.
    const turret = it.turrets.find((t) => t.turned <= 0 && dist(t.x, t.y, av.x, av.y) < 20);
    if (turret) return { type: 'turret', turret };
    const door = it.alarmed.find((d) => !d.off && dist(d.x, d.y, av.x, av.y) < 26);
    if (door && it.mood === 'lockdown') return { type: 'alarm', door };
    if (it.reactor && !it.reactor.steadied && dist(it.reactor.x, it.reactor.y, av.x, av.y) < 18)
      return { type: 'reactor' };
  }
  if (atAirlockDoor(it, av)) return { type: 'airlock' };
  if (it.mainframe && dist(av.x, av.y, it.mainframe.x, it.mainframe.y) < MAINFRAME_REACH) return { type: 'mainframe' };
  if (it.trade) {
    const desk = it.desks.find((d) => dist(d.x, d.y, av.x, av.y) < 20);
    return desk ? { type: 'desk', desk } : null;
  }
  if (it.doorOpen) return null;
  const door = it.rooms[it.vault].door;
  const away = dist(av.x, av.y, door.x, door.y);
  return away < 28 ? { type: 'door', door, cut: away < 22 } : null;
}
export const openVault = (it) => {
  it.doorOpen = true;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
};

function walk(it, av, cmd, dt) {
  const mx = clamp(cmd.mx || 0, -1, 1);
  const my = clamp(cmd.my || 0, -1, 1);
  const len = Math.hypot(mx, my);
  if (len <= 0) return;
  // Carrying things slows the boarder down.
  const sp = (B.CREW_SPEED_FOOT * (1 - B.CARRY_SLOW * av.carry.length) * dt) / Math.max(1, len);
  move(it, av, mx * sp, my * sp, B.CREW_RADIUS);
}

function fireRifle(state, it, av) {
  const f = forward(av.heading + randRange(state, -0.02, 0.02));
  it.bolts.push({
    x: av.x + f.x * 7,
    y: av.y + f.y * 7,
    vx: f.x * B.RIFLE_SPEED,
    vy: f.y * B.RIFLE_SPEED,
    ttl: B.RIFLE_TTL,
    owner: 'crew',
    dmg: rifleDmg(state.ship) * (av.role === 'gunner' ? B.ROLE_RIFLE : 1),
  });
  av.cool = B.RIFLE_INTERVAL;
  state.events.push({ type: 'rifle' });
  heard(state, it, av);
}

// A dart from the tranquilliser gun makes no sound, and puts the guard it hits to sleep.
function fireDart(state, it, av) {
  const f = forward(av.heading);
  it.bolts.push({
    x: av.x + f.x * 7,
    y: av.y + f.y * 7,
    vx: f.x * B.TRANQ_SPEED,
    vy: f.y * B.TRANQ_SPEED,
    ttl: 1,
    owner: 'crew',
    dmg: 0,
    tranq: true,
  });
  av.darts--;
  av.cool = B.TRANQ_INTERVAL;
  if (av.darts <= 0) av.weapon = 'rifle';
  state.events.push({ type: 'dart' });
}

function throwGrenade(it, av, at) {
  let tx = at.x;
  let ty = at.y;
  const d = dist(av.x, av.y, tx, ty);
  if (d > B.GRENADE_RANGE) {
    tx = av.x + ((tx - av.x) * B.GRENADE_RANGE) / d;
    ty = av.y + ((ty - av.y) * B.GRENADE_RANGE) / d;
  }
  // A grenade stops at the first wall on its way.
  const n = Math.ceil(dist(av.x, av.y, tx, ty) / 4);
  let ex = av.x;
  let ey = av.y;
  for (let i = 1; i <= n; i++) {
    const x = av.x + ((tx - av.x) * i) / n;
    const y = av.y + ((ty - av.y) * i) / n;
    if (solidAt(it, x, y)) break;
    ex = x;
    ey = y;
  }
  av.grenades--;
  it.grenades.push({
    x: av.x,
    y: av.y,
    sx: av.x,
    sy: av.y,
    tx: ex,
    ty: ey,
    t: 0,
    dur: Math.max(0.15, dist(av.x, av.y, ex, ey) / B.GRENADE_SPEED),
    fuse: B.GRENADE_FUSE,
  });
}

// A flare is thrown toward where the boarder aims. It lights up what is around it, in the air as well.
function throwFlare(state, it, av, at) {
  const d = dist(av.x, av.y, at.x, at.y);
  const dir = d > 1 ? { x: (at.x - av.x) / d, y: (at.y - av.y) / d } : forward(av.heading);
  av.flares--;
  // `seen` are the guards that have been to look at it, so that each of them comes only once.
  const flare = {
    x: av.x,
    y: av.y,
    dx: dir.x,
    dy: dir.y,
    left: Math.min(d, B.FLARE_RANGE),
    burn: B.FLARE_BURN,
    seen: [],
  };
  it.flares.push(flare);
  state.events.push({ type: 'flare' });
}

// Loot is picked up by walking over it.
function pickUpLoot(state, it, av) {
  for (const item of [...it.loot]) {
    if (av.carry.length >= carryMax(state.ship)) break;
    if (dist(item.x, item.y, av.x, av.y) >= 9) continue;
    av.carry.push(item);
    it.loot = it.loot.filter((l) => l !== item);
    state.events.push({ type: 'pickup', item: item.type });
  }
}

// The locked vault door: hold the use key next to it to cut it open, or blow it with a breaching charge.
function workVaultDoor(state, it, av, cmd, dt) {
  if (it.doorOpen) return;
  const door = it.rooms[it.vault].door;
  const away = dist(av.x, av.y, door.x, door.y);
  if (cmd.charge && av.charges > 0 && away < 28) {
    // A breaching charge opens the door at once, and every guard comes running. It is used up.
    av.charges--;
    state.ship.mods.charge = Math.max(0, level(state.ship, 'charge') - 1);
    openVault(it);
    it.fx.push({ type: 'boom', x: door.x, y: door.y, t: 0, dur: 0.45, size: 24 });
    for (const g of it.guards) alertGuard(g, door);
    foundOut(state, it, door);
    state.events.push({ type: 'breached' });
  }
  if (cmd.use && away < 22) {
    // Anyone can cut the lock, and it is heard when the door gives way. The Engineer goes round the lock
    // instead, which is quicker and makes no sound.
    const quiet = av.role === 'engineer';
    it.doorCut += (dt / B.DOOR_CUT_TIME) * (quiet ? B.ROLE_HACK : 1);
    it.cutting = true;
    if (it.doorCut >= 1) {
      openVault(it);
      state.events.push({ type: 'doorOpen' });
      if (!quiet) heard(state, it, door);
    }
  }
}

// On a trading station weapons stay holstered. The use key works the desks and the airlock.
function stepVisitor(state, it, av, cmd) {
  if (!cmd.usePressed) return;
  if (atAirlockDoor(it, av)) {
    leave(state, it, av, false);
    return;
  }
  const at = useTarget(it, av);
  if (at && at.type === 'mainframe') state.events.push({ type: 'mainframeUsed', player: av.player });
  const desk = it.desks.find((d) => dist(d.x, d.y, av.x, av.y) < 20);
  if (desk && (!at || at.type === 'desk')) state.events.push({ type: 'deskUsed', player: av.player, desk: desk.type });
}

function stepAvatar(state, it, av, cmd, dt) {
  const player = playerById(state, av.player);
  av.cool = Math.max(0, av.cool - dt);
  if (!cmd) return;
  if (cmd.aim) av.heading = headingTo(cmd.aim.x - av.x, cmd.aim.y - av.y);
  walk(it, av, cmd, dt);
  if (it.trade) {
    stepVisitor(state, it, av, cmd);
    return;
  }
  if (cmd.swap && av.darts > 0) av.weapon = av.weapon === 'rifle' ? 'tranq' : 'rifle';
  if (cmd.fire && av.cool <= 0) (av.weapon === 'tranq' ? fireDart : fireRifle)(state, it, av);
  // Take down a guard that sleeps, before anything else that the use key does here.
  const at = cmd.usePressed ? useTarget(it, av) : null;
  if (at && at.type === 'guard') {
    at.guard.down = true;
    at.guard.sleep = 0;
    state.events.push({ type: 'takeDown' });
    return;
  }
  // The mainframe is worked from its own panel, see mainframe.js.
  if (at && at.type === 'mainframe') state.events.push({ type: 'mainframeUsed', player: av.player });
  if (cmd.grenade && av.grenades > 0) throwGrenade(it, av, cmd.grenade);
  if (cmd.lampPressed) av.lamp = !av.lamp;
  if (cmd.flare && av.flares > 0) throwFlare(state, it, av, cmd.flare);
  pickUpLoot(state, it, av);
  // What is carried is stowed on the ship at the airlock.
  const atAirlock = tileAt(it, Math.floor(av.x / TILE), Math.floor(av.y / TILE)) === 'A' || atAirlockDoor(it, av);
  if (atAirlock) deposit(state, av);
  if (cmd.usePressed && atAirlockDoor(it, av)) {
    deposit(state, av);
    leave(state, it, av, false);
    return;
  }
  // The crew's own turret is for a fight: it can only be set down while one is on, and it is gone when the
  // fight is over.
  if (cmd.deploy && av.sentries > 0) {
    if (!fighting(it)) state.events.push({ type: 'sentryNoFight' });
    else {
      av.sentries--;
      const sentry = { id: state.nextId++, x: av.x, y: av.y, hp: B.SENTRY_HP, heading: av.heading, cool: 0.3, calm: 0 };
      it.sentries.push(sentry);
      state.events.push({ type: 'sentryDown' });
    }
  }
  // What the Engineer does by holding the use key next to it.
  const near = cmd.use ? useTarget(it, av) : null;
  const work = near && { turret: B.TURRET_TURN_TIME, alarm: B.DISARM_TIME, reactor: B.STEADY_TIME }[near.type];
  if (work) {
    it.turning = Math.min(1, it.turning + dt / work);
    it.working = true;
    if (it.turning >= 1) {
      it.turning = 0;
      if (near.type === 'turret') {
        near.turret.turned = B.TURRET_TURNED;
        near.turret.out = 0;
        near.turret.hot = 0;
        state.events.push({ type: 'turretTurned' });
      } else if (near.type === 'alarm') {
        near.door.off = true;
        state.events.push({ type: 'doorDisarmed' });
      } else {
        it.reactor.steadied = true;
        it.timer += B.STEADY_GAIN;
        state.events.push({ type: 'reactorSteadied', gain: B.STEADY_GAIN });
      }
    }
  }
  // Walking through an alarmed door gives the crew away.
  if (it.mood === 'lockdown') {
    const tx = Math.floor(av.x / TILE),
      ty = Math.floor(av.y / TILE);
    if (it.alarmed.some((d) => !d.off && d.tx === tx && d.ty === ty)) foundOut(state, it, av);
  }
  workVaultDoor(state, it, av, cmd, dt);
  if (player.hp <= 0) leave(state, it, av, true);
}

// A turret set down by a boarder. It shoots at guards and turrets it can see.
function stepSentry(state, it, s, dt) {
  s.cool -= dt;
  let target = null,
    best = B.SENTRY_RANGE;
  for (const e of [...it.guards.filter(awake), ...(it.mood ? [] : it.turrets)]) {
    const d = dist(s.x, s.y, e.x, e.y);
    if (d < best && los(it, s.x, s.y, e.x, e.y)) {
      best = d;
      target = e;
    }
  }
  if (!target) return;
  const want = headingTo(target.x - s.x, target.y - s.y);
  s.heading = turnToward(s.heading, want, 4 * dt);
  if (s.cool <= 0 && Math.abs(angleDiff(want, s.heading)) < 0.12) {
    const f = forward(s.heading);
    it.bolts.push({
      x: s.x + f.x * 8,
      y: s.y + f.y * 8,
      vx: f.x * B.RIFLE_SPEED,
      vy: f.y * B.RIFLE_SPEED,
      ttl: B.RIFLE_TTL,
      owner: 'crew',
      dmg: B.SENTRY_DMG,
    });
    s.cool = B.SENTRY_COOLDOWN;
  }
}

// Says whether the turret has just noticed someone, for the place to act on.
function stepTurret(state, it, t, dt) {
  t.cool -= dt;
  if (t.out > 0) {
    t.out -= dt;
    return false;
  }
  // Switched off from the mainframe. One that the Engineer has turned still works for the crew.
  if (it.blackout > 0 && t.turned <= 0) return false;
  const shoot = (owner, dmg) => {
    const f = forward(t.heading);
    it.bolts.push({
      x: t.x + f.x * 9,
      y: t.y + f.y * 9,
      vx: f.x * B.TURRET_BOLT_SPEED,
      vy: f.y * B.TURRET_BOLT_SPEED,
      ttl: 1.4,
      owner,
      dmg,
    });
    t.cool = B.TURRET_COOLDOWN;
  };
  const nearest = (list, ok) => {
    let found = null,
      best = B.TURRET_SIGHT;
    for (const e of list) {
      const d = dist(t.x, t.y, e.x, e.y);
      if (d < best && ok(e) && los(it, t.x, t.y, e.x, e.y)) {
        best = d;
        found = e;
      }
    }
    return found;
  };
  // Turned by the Engineer, it fires at the guards for a while, all round.
  if (t.turned > 0) {
    t.turned -= dt;
    const foe = nearest(it.guards.filter(awake), () => true);
    if (!foe) return false;
    const want = headingTo(foe.x - t.x, foe.y - t.y);
    t.heading = turnToward(t.heading, want, B.TURRET_TURN * dt);
    if (t.cool <= 0 && Math.abs(angleDiff(want, t.heading)) < 0.1) shoot('crew', B.TURRET_DMG);
    return false;
  }
  // It watches a narrow cone. Awake, it follows what it sees within a wider arc about the way it rests.
  const wasHot = t.hot > 0 || it.mood === 'alarm';
  const arc = wasHot ? B.TURRET_ARC : B.TURRET_FOV;
  const off = (e) => angleDiff(headingTo(e.x - t.x, e.y - t.y), t.rest);
  const target = nearest(it.avatars, (e) => Math.abs(off(e)) < arc);
  if (!target) {
    t.hot = Math.max(0, t.hot - dt);
    if (t.hot <= 0) t.heading = turnToward(t.heading, t.rest, B.TURRET_TURN * 0.5 * dt);
    return false;
  }
  t.hot = B.TURRET_HOLD;
  const want = headingTo(target.x - t.x, target.y - t.y);
  t.heading = turnToward(t.heading, want, B.TURRET_TURN * dt);
  if (t.cool <= 0 && Math.abs(angleDiff(want, t.heading)) < 0.1) shoot('enemy', B.TURRET_DMG);
  if (!wasHot) t.seen = { x: target.x, y: target.y };
  return !wasHot;
}

// A camera sees a boarder that is in its cone, in the light or not. It gives them away like a guard does:
// not at once, but when it has watched them for long enough.
function stepCamera(state, it, c, dt) {
  if (it.mood === 'alarm' || it.blackout > 0) return null;
  const way = cameraWay(state, c);
  for (const av of it.avatars) {
    // On a trading station a camera only cares about who is in the staff rooms.
    if (it.trade && !inStaff(it, av)) continue;
    const d = dist(c.x, c.y, av.x, av.y);
    if (d > B.CAMERA_RANGE || d < 4) continue;
    if (Math.abs(angleDiff(headingTo(av.x - c.x, av.y - c.y), way)) > B.CAMERA_FOV) continue;
    if (!los(it, c.x, c.y, av.x, av.y)) continue;
    av.spotted = Math.min(1, av.spotted + dt / B.GUARD_NOTICE);
    av.watched = true;
    if (av.spotted >= 1) return av;
  }
  return null;
}

// People on a trading station wander about near where they started.
function stepCivilian(state, it, c, dt) {
  c.wait -= dt;
  if (c.wait <= 0) {
    c.goal = { x: c.home.x + randRange(state, -40, 40), y: c.home.y + randRange(state, -26, 26) };
    c.wait = randRange(state, 2, 6);
  }
  if (dist(c.x, c.y, c.goal.x, c.goal.y) <= 4) return;
  c.heading = turnToward(c.heading, headingTo(c.goal.x - c.x, c.goal.y - c.y), 4 * dt);
  const f = forward(c.heading);
  move(it, c, f.x * 22 * dt, f.y * 22 * dt, B.CREW_RADIUS);
}

function stepInsideBolts(state, it, dt) {
  const spark = (b, dur) => it.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur });
  for (const b of it.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (solidAt(it, b.x, b.y)) {
      b.ttl = 0;
      spark(b, 0.12);
      continue;
    }
    if (b.owner === 'crew') {
      const guard = it.guards.find((g) => !g.down && dist(g.x, g.y, b.x, b.y) < 6.5);
      const e = guard || it.turrets.find((t) => dist(t.x, t.y, b.x, b.y) < 7.5);
      if (!e) continue;
      b.ttl = 0;
      if (b.tranq) {
        // A dart only works on a guard, and not on a drone. A heavy guard sleeps for a shorter while. It falls
        // asleep where it stands, and nobody hears it.
        if (guard && kindOf(guard).sleep > 0) {
          guard.sleep = B.TRANQ_SLEEP * kindOf(guard).sleep;
          guard.mode = 'idle';
          guard.path = [];
          state.events.push({ type: 'guardAsleep' });
        }
        continue;
      }
      if (guard || !it.mood) e.hp -= b.dmg;
      spark(b, 0.15);
      // A guard that is shot wakes if it slept, and knows roughly where the shot came from.
      if (guard) {
        guard.sleep = 0;
        alertGuard(guard, guard.mode === 'alert' ? guard.seen : { x: b.x - b.vx * 0.2, y: b.y - b.vy * 0.2 });
      }
      continue;
    }
    const av = it.avatars.find((a) => dist(a.x, a.y, b.x, b.y) < 6);
    const sentry = it.sentries.find((x) => dist(x.x, x.y, b.x, b.y) < 7);
    if (av) {
      b.ttl = 0;
      hurtAvatar(state, it, av, b.dmg);
    } else if (sentry) {
      b.ttl = 0;
      sentry.hp -= b.dmg;
      spark(b, 0.15);
    }
  }
  it.bolts = it.bolts.filter((b) => b.ttl > 0);
}

// A grenade flies to where it was thrown, lies there for a moment and goes off.
function stepGrenades(state, it, dt) {
  for (const g of it.grenades) {
    if (g.t < g.dur) {
      g.t = Math.min(g.dur, g.t + dt);
      const u = g.t / g.dur;
      g.x = g.sx + (g.tx - g.sx) * u;
      g.y = g.sy + (g.ty - g.sy) * u;
      continue;
    }
    g.fuse -= dt;
    if (g.fuse > 0) continue;
    explode(state, it, g);
    g.done = true;
  }
  it.grenades = it.grenades.filter((g) => !g.done);
}

// A flare in the air bounces off the walls and loses half of what is left of its way each time. It burns
// from the moment it is thrown, and is gone when it has burnt out.
function stepFlares(it, dt) {
  for (const f of it.flares) {
    f.burn -= dt;
    if (f.left <= 0) continue;
    const step = Math.min(f.left, B.FLARE_SPEED * dt);
    f.left -= step;
    const hitX = solidAt(it, f.x + f.dx * step, f.y),
      hitY = solidAt(it, f.x, f.y + f.dy * step),
      corner = !hitX && !hitY && solidAt(it, f.x + f.dx * step, f.y + f.dy * step);
    if (hitX || corner) f.dx = -f.dx;
    if (hitY || corner) f.dy = -f.dy;
    if (hitX || hitY || corner) f.left *= 0.5;
    else {
      f.x += f.dx * step;
      f.y += f.dy * step;
    }
  }
  it.flares = it.flares.filter((f) => f.burn > 0);
}

function clearFallen(state, it) {
  for (const e of [...it.guards, ...it.turrets]) {
    if (e.hp > 0) continue;
    it.fx.push({ type: 'boom', x: e.x, y: e.y, t: 0, dur: 0.4, size: 14 });
    state.events.push({ type: 'guardDown' });
  }
  it.guards = it.guards.filter((g) => g.hp > 0);
  it.turrets = it.turrets.filter((t) => t.hp > 0);
  it.sentries = it.sentries.filter((x) => x.hp > 0);
}

function stepInterior(state, wreck, cmds, dt) {
  const it = wreck.interior;
  stepDoors(it);
  it.cutting = false;
  it.hacking = false;
  // Work on a turret that is let go of is lost.
  if (!it.working) it.turning = 0;
  it.working = false;
  for (const f of it.fx) f.t += dt;
  it.fx = it.fx.filter((f) => f.t < f.dur);
  for (const av of [...it.avatars]) stepAvatar(state, it, av, cmds.away ? cmds.away[av.player] : null, dt);
  stepHack(state, wreck, it, dt);
  // Guards that have noticed nobody watch for boarders, and for other guards that lie still.
  for (const av of it.avatars) av.watched = false;
  for (const g of it.guards) {
    const found = stepGuard(state, it, g, dt);
    if (!found) continue;
    const at = found.intruder || found.body;
    // A watchman calls everyone, also in a wreck where there is no alarm.
    if (kindOf(g).rouses) for (const o of it.guards) alertGuard(o, at);
    giveAway(state, wreck, it, at);
  }
  for (const c of it.civilians) stepCivilian(state, it, c, dt);
  for (const t of it.turrets) if (stepTurret(state, it, t, dt)) foundOut(state, it, t.seen);
  for (const c of it.cameras) {
    const caught = stepCamera(state, it, c, dt);
    if (caught) giveAway(state, wreck, it, caught);
  }
  // A boarder that nobody is watching any more is forgotten again, little by little.
  for (const av of it.avatars) if (!av.watched) av.spotted = Math.max(0, av.spotted - dt * 1.5);
  // The crew's own turrets are gone a little while after the fight is over.
  const on = fighting(it);
  for (const s of it.sentries) {
    s.calm = on ? 0 : s.calm + dt;
    stepSentry(state, it, s, dt);
  }
  it.sentries = it.sentries.filter((s) => s.calm < B.SENTRY_LINGER);
  stepInsideBolts(state, it, dt);
  stepGrenades(state, it, dt);
  stepFlares(it, dt);
  clearFallen(state, it);
  // The reactor of a wreck runs down from the first step inside.
  if (it.timer === null) return;
  it.timer -= dt;
  if (it.timer <= 0) blowUp(state, wreck);
}

function blowUp(state, wreck) {
  const it = wreck.interior;
  const ship = state.ship;
  if (it) for (const av of [...it.avatars]) leave(state, it, av, true);
  for (const p of state.players) if (p.lockedOut === wreck.id) p.lockedOut = null;
  state.fx.push({ type: 'boom', x: wreck.x, y: wreck.y, t: 0, dur: 1.3, size: 90 });
  removeThing(state, wreck);
  state.events.push({ type: 'wreckExploded', wreck: wreck.id });
  if (ship.docked === wreck.id) {
    ship.docked = null;
    const f = forward(headingTo(ship.x - wreck.x, ship.y - wreck.y));
    ship.vx = f.x * 60;
    ship.vy = f.y * 60;
    damageShip(state, B.WRECK_BLAST_DMG, { x: ship.x, y: ship.y });
  }
  // No new wreck drifts in to take its place: wrecks are a bonus (R-1097). See returnWreck in sectors.js.
}

// A station does not blow up. It fights back: fighters scramble and the lock resets.
function fightBack(state, st) {
  st.breakin = null;
  for (let i = 0; i < 2; i++) {
    state.vessels.push(makeVessel(state, 'fighter', st.x + (i ? 130 : -130), st.y - 130, st.side));
  }
  state.events.push({ type: 'stationFightsBack', name: st.name });
}

// A cargo pod sounds an alarm that brings the next pirate wave at once.
function soundAlarm(state, pod) {
  pod.breakin = null;
  pod.alarm = B.POD_ALARM;
  state.spawn.timer = 0;
  state.events.push({ type: 'podAlarm' });
}

// A pod has no inside. Its cargo is taken straight on board.
function lootPod(state, pod) {
  const ship = state.ship;
  const credits = Math.round(randRange(state, B.POD_CREDITS[0], B.POD_CREDITS[1]) / 5) * 5;
  const fuel = rand(state) < 0.5 ? B.CELL_FUEL : 0;
  earn(state, credits);
  ship.fuel = Math.min(fuelMax(ship), ship.fuel + fuel);
  const part = rand(state) < 0.15 ? (rand(state) < 0.5 ? 'hard' : 'system') : null;
  if (part) ship.slots[part]++;
  // The empty shell stays where it is, so that the crew can see that they have been here.
  pod.looted = true;
  pod.breakin = null;
  pod.alarm = 0;
  state.known = state.known.filter((k) => k.id !== pod.id);
  if (ship.docked === pod.id) ship.docked = null;
  state.fx.push({ type: 'hit', x: pod.x, y: pod.y, t: 0, dur: 0.4 });
  state.events.push({ type: 'podLooted', credits, fuel, part });
}

// What happens to each kind of thing when its lock is failed, and when it is opened without an inside to board.
// A failed bypass shakes the wreck's reactor: it loses time, and the third failure blows it up.
function shakeReactor(state, wreck) {
  wreck.lockFails++;
  if (wreck.lockFails >= B.LOCK_FAILS_BLOW) {
    blowUp(state, wreck);
    return;
  }
  wreck.breakin = null;
  state.events.push({
    type: 'reactorShaken',
    lost: B.LOCK_FAIL_REACTOR,
    last: wreck.lockFails === B.LOCK_FAILS_BLOW - 1,
  });
}

const LOCK_FAILED = { wreck: shakeReactor, station: fightBack, pod: soundAlarm };
const LOCK_OPENED = { pod: lootPod };

export function stepBoarding(state, cmds, dt) {
  for (const id of (cmds.system && cmds.system.board) || []) tryBoard(state, id);
  stepMainframe(state, cmds);
  for (const p of state.players) p.tele = Math.max(0, p.tele - dt);
  // The Captain marks a spot inside the place the ship is docked at. Marking it again takes the mark away.
  const pin = cmds.captain && cmds.captain.pin;
  const pinned = pin && findDock(state, state.ship.docked);
  if (pinned && pinned.interior) {
    const it = pinned.interior;
    it.pin = it.pin && dist(it.pin.x, it.pin.y, pin.x, pin.y) < TILE ? null : { x: pin.x, y: pin.y };
  }
  for (const target of dockTargets(state)) {
    const result = stepBreakin(state, target, cmds, dt);
    if (result === 'failed') LOCK_FAILED[target.kind](state, target);
    else if (result === 'solved' && LOCK_OPENED[target.kind]) LOCK_OPENED[target.kind](state, target);
    else if (target.interior && target.interior.live) stepInterior(state, target, cmds, dt);
  }
  // A pod that has sounded its alarm goes on doing so for as long as there are pirates about.
  const pirates = state.vessels.some((v) => v.side === PIRATE);
  for (const pod of thingsOf(state, 'pod')) {
    if (pod.alarm > 0) pod.alarm = Math.max(pirates ? 1 : 0, pod.alarm - dt);
  }
  // Everyone gets their health back once the whole crew is on the ship again.
  if (!anyoneInside(state)) for (const p of state.players) p.hp = crewHpMax(state.ship);
}
