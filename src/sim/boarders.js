// The crew inside a place (D-227): going aboard and back, what the use key does where a boarder stands, the ways
// between floors, and each boarder's step. What gives them away is here too.
import { offersAt } from './jobs.js';
import { B } from './balance.js';
import { findDock, localPorts } from './things.js';
import { shipNose } from './ship.js';
import { TILE, deckOf, move, tileAt } from './floor.js';
import { alertGuard, awake } from './guards.js';
import { leavePost, playerById, returnToPost } from './players.js';
import { isTrading, ringTurning } from './stations.js';
import { MAINFRAME_REACH, turnOnCrew } from './mainframe.js';
import { cycleLock, hatchOpen, lockNear } from './airlock.js';
import { cutPower, restorePower, stopCall, wreckHangar } from './pressure.js';
import { breakinBonus, level, teleCooldown, gearLevel, carrySlow } from './upgrades.js';
import { createBreakin } from './breakin.js';
import { forward, clamp, dist, headingTo, randRange, toWorld } from './util.js';
import { fireDart, fireRifle, throwFlare, throwGrenade } from './firearms.js';
import { createInterior, makeTrade, setMood } from './interior.js';
import { deposit, lootNear, pickUp, dropAll } from './loot.js';

// Where a boarder stands when they have just come in: a step inside the airlock, side by side.
function comeIn(it, k) {
  const e = it.entry;
  const side = k * 8 - 6;
  return { x: e.x + e.nx * 14 - e.ny * side, y: e.y + e.ny * 14 + e.nx * side, heading: Math.atan2(e.nx, -e.ny) };
}

// The crew comes in through the airlock that the port the frigate is docked at leads to. At a base every port
// on the ring leads to the bridge and the main airlock, and the building dock of a shipyard to its own.
function useAirlock(state, place, it) {
  const nose = shipNose(state.ship);
  const ports = localPorts(place);
  let best = 0;
  ports.forEach((p, i) => {
    const at = toWorld(place, p),
      now = toWorld(place, ports[best]);
    if (dist(at.x, at.y, nose.x, nose.y) < dist(now.x, now.y, nose.x, nose.y)) best = i;
  });
  it.entry = it.airlocks[ports[best].airlock || 0] || it.airlocks[0];
}

// Whether the way in is ready: the hatch of the airlock is open. If it is not, the airlock is set going, and
// the one who asked has to ask again in a moment.
function hatchReady(state, it, playerId) {
  if (hatchOpen(it)) return true;
  cycleLock(state, it, it.airlocks.indexOf(it.entry));
  state.events.push({ type: 'lockWait', player: playerId });
  return false;
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
  // The ring is still turning the ship to the bridge.
  if (wreck.kind === 'station' && ringTurning(wreck)) {
    state.events.push({ type: 'ringTurning', player: playerId });
    return false;
  }
  // Friendly and neutral stations are open to walk into. No lock, no teleporter needed.
  if (isTrading(wreck)) {
    if (!wreck.interior) wreck.interior = createInterior(state, wreck);
    const floor = wreck.interior;
    if (!floor.trade) makeTrade(state, floor, wreck);
    floor.live = true;
    if (!floor.avatars.length) useAirlock(state, wreck, floor);
    if (!hatchReady(state, floor, playerId)) return false;
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
  if (wreck.kind === 'wreck' && !wreck.crew && it.timer === null) {
    // Every failed bypass has cost the reactor some of its time.
    it.timer = Math.max(30, B.REACTOR_TIME[wreck.difficulty] - wreck.lockFails * B.LOCK_FAIL_REACTOR);
  }
  it.live = true;
  if (!it.avatars.length) useAirlock(state, wreck, it);
  if (!hatchReady(state, it, playerId)) return false;
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
  // Each role has its own gear (F-235, R-1113).
  av.sentries = gearLevel(ship, 'sentry', av.role) ? 1 : 0;
  av.flares = gearLevel(ship, 'flare', av.role) ? B.FLARES : 0;
  av.darts = gearLevel(ship, 'tranq', av.role) ? B.TRANQ_DARTS : 0;
}

export function leave(state, it, av, teleported) {
  const player = playerById(state, av.player);
  const placeId = player.inside;
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
  // An alarm lasts until the last boarder has left. Then the place is on its guard again, and a base that had
  // its power put out has it back.
  if (!it.avatars.length) it.hack = null;
  const place = it.avatars.length ? null : findDock(state, placeId);
  if (place && place.interior === it) restorePower(place);
  if (!it.avatars.length && it.mood === 'alarm') {
    setMood(it, 'lockdown');
    it.seize = false;
    for (const g of it.guards) {
      g.mode = 'idle';
      g.path = [];
      g.pause = 0;
    }
  }
}

// Whether there is a fight on: the place is hunting the crew, or a guard or a turret is after someone.
export const fighting = (it) =>
  it.mood === 'alarm' || it.guards.some((g) => g.mode === 'alert' && awake(g)) || it.turrets.some((t) => t.hot > 0);

// Something has given the crew away at `at`. A place with an alarm sounds it, and every guard that is awake
// knows where to look. A wreck has no alarm: there only the guards that noticed are after the crew.
export function foundOut(state, it, at) {
  if (!it.mood) return;
  if (it.mood !== 'alarm') state.events.push({ type: 'foundOut' });
  setMood(it, 'alarm');
  for (const g of it.guards) alertGuard(g, at);
}

// The crew is seen where it should not be. On a trading station that turns the station on them, see mainframe.js.
export function giveAway(state, place, it, at) {
  if (it.trade) turnOnCrew(state, place, at, true);
  else foundOut(state, it, at);
}

// A loud noise at `at`: guards near enough to hear it come looking, and it gives the crew away.
// Running footsteps (F-292, R-1269): guards near enough come to look where they were heard, but are not yet sure.
function footsteps(state, it, av) {
  for (const g of it.guards) {
    if (g.down || g.sleep > 0 || g.mode !== 'idle') continue;
    if (dist(g.x, g.y, av.x, av.y) < B.SPRINT_HEARD) g.curious = { x: av.x, y: av.y, wait: B.GUARD_CURIOUS };
  }
}

// A noise (F-300, VK1-VK3): of the guards that hear it, the two nearest come to look, and the others stay where
// they are but are wary for a while. The guard nearest the vault never leaves it for a noise. The place knows now.
export function heard(state, it, at) {
  const keeper = vaultKeeper(it);
  const near = it.guards
    .filter((g) => awake(g) && g !== keeper && dist(g.x, g.y, at.x, at.y) < B.SHOT_HEARD)
    .sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
  near.forEach((g, i) => {
    if (i < B.GUARD_COME) alertGuard(g, at);
    else g.wary = B.GUARD_WARY;
  });
  if (keeper && dist(keeper.x, keeper.y, at.x, at.y) < B.SHOT_HEARD) keeper.wary = B.GUARD_WARY;
  if (!it.mood) return;
  if (it.mood !== 'alarm') state.events.push({ type: 'foundOut' });
  setMood(it, 'alarm');
}

// The guard that keeps the vault: the one that started nearest its door, as long as it is up (VK3).
export function vaultKeeper(it) {
  if (it.vault === undefined || it.vault === null || !it.rooms[it.vault]) return null;
  const door = it.rooms[it.vault].door;
  if (it.keeper === undefined) {
    let best = null;
    for (const g of it.guards) {
      const home = g.home || g;
      if (!best || dist(home.x, home.y, door.x, door.y) < dist(best.home.x, best.home.y, door.x, door.y)) best = g;
    }
    it.keeper = best && best.home ? best.id : null;
  }
  // With only one or two guards on their feet, the keeper goes to look like the others.
  if (it.guards.filter(awake).length < 3) return null;
  const g = it.guards.find((x) => x.id === it.keeper);
  return g && awake(g) ? g : null;
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
  // An airlock is worked with its button: at the hatch when the hatch is shut, and at the inner door.
  const lock = lockNear(it, av);
  if (atAirlockDoor(it, av) && hatchOpen(it)) return { type: 'airlock' };
  if (lock >= 0) return { type: 'lock', lock, busy: it.locks[lock].busy > 0 };
  // A way to another floor: the lift, the stairs or the ladder.
  const link = linkAt(it, av);
  if (link) return { type: 'link', link: link.link, to: link.to, up: link.up };
  if (it.breaker && !it.breaker.out && dist(av.x, av.y, it.breaker.x, it.breaker.y) < B.CONSOLE_REACH)
    return { type: 'breaker' };
  if (it.hangar && !it.hangar.out && !it.trade && dist(av.x, av.y, it.hangar.x, it.hangar.y) < B.CONSOLE_REACH)
    return { type: 'hangar' };
  if (it.call && dist(av.x, av.y, it.comms.x, it.comms.y) < B.CONSOLE_REACH) return { type: 'comms' };
  // Loot is picked up with the use key, one thing at a time (F-293), when there is nothing else to use here.
  const item = it.loot && lootNear(it, av);
  if (item) return { type: 'loot', item };
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

// The way between floors that a boarder stands in, with the floor it leads to, or null.
export function linkAt(it, av) {
  if (!it.jumps) return null;
  const to = it.jumps[Math.floor(av.y / TILE) * it.w + Math.floor(av.x / TILE)];
  if (to === undefined) return null;
  const deck = deckOf(it, av.x);
  const link = it.links.find(
    (l) =>
      l.decks.includes(deck) &&
      dist(l.at[l.decks.indexOf(deck)].x, l.at[l.decks.indexOf(deck)].y, av.x, av.y) < TILE * 4,
  );
  const other = link.decks[0] === deck ? link.decks[1] : link.decks[0];
  return { link, to: other, up: other > deck };
}

// Go to the other floor, to the same spot there. A lift is heard on both floors: whoever is near and has
// noticed nobody comes to look.
function takeLink(state, it, av, at) {
  const from = it.decks[deckOf(it, av.x)],
    to = it.decks[at.to];
  const k = at.link.decks.indexOf(at.to);
  av.x += (to.x0 - from.x0) * TILE;
  state.events.push({ type: 'floor', player: av.player, deck: at.to, kind: at.link.kind });
  if (at.link.kind !== 'lift' || it.trade) return;
  for (const g of it.guards) {
    if (!awake(g) || g.mode === 'alert' || g.curious) continue;
    const near = at.link.doors.some((d) => dist(g.x, g.y, d.x, d.y) < B.GUARD_HEARING);
    if (near) g.curious = { x: at.link.doors[k].x, y: at.link.doors[k].y, wait: B.GUARD_CURIOUS };
  }
}

export const openVault = (it) => {
  it.doorOpen = true;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
};

function walk(state, it, av, cmd, dt) {
  const mx = clamp(cmd.mx || 0, -1, 1);
  const my = clamp(cmd.my || 0, -1, 1);
  const len = Math.hypot(mx, my);
  if (len <= 0) return;
  // Carrying things slows the boarder down, less with a better backpack (R-1268). With nothing carried, Shift runs,
  // and is heard (F-292, R-1269).
  // Slower to the side and backwards than ahead, measured against where the boarder looks (F-299, R-1278), and
  // running only ahead.
  const f = forward(av.heading || 0);
  const c = (mx * f.x + my * f.y) / len;
  const facing = c >= 0 ? B.SIDE_PACE + (1 - B.SIDE_PACE) * c : B.SIDE_PACE + (B.SIDE_PACE - B.BACK_PACE) * c;
  const run = cmd.sprint && !av.carry.length && c > Math.cos(B.RUN_CONE);
  const pace = run ? B.SPRINT : facing * (1 - carrySlow(state.ship, av.role) * av.carry.length);
  const sp = (B.CREW_SPEED_FOOT * pace * dt) / Math.max(1, len);
  if (run) footsteps(state, it, av);
  move(it, av, mx * sp, my * sp, B.CREW_RADIUS);
}

// The locked vault door: hold the use key next to it to cut it open, or blow it with a breaching charge.
function workVaultDoor(state, it, av, cmd, dt) {
  if (it.doorOpen) return;
  const door = it.rooms[it.vault].door;
  const away = dist(av.x, av.y, door.x, door.y);
  if (cmd.charge && av.charges > 0 && away < 28) {
    // A breaching charge opens the door at once, and every guard comes running. It is used up.
    av.charges--;
    // A charge is used up, so a new one can be bought (R-1133).
    state.ship.mods.charge = Math.max(0, level(state.ship, 'charge') - 1);
    state.ship.owned.charge = state.ship.mods.charge;
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
function stepVisitor(state, place, it, av, cmd, dt) {
  // The switchgear can be switched off by a visitor too, if nobody sees it done.
  if (cmd.use) workConsole(state, place, it, av, useTarget(it, av), dt);
  if (!cmd.usePressed) return;
  const at = useTarget(it, av);
  if (at && at.type === 'airlock') {
    leave(state, it, av, false);
    return;
  }
  if (at && at.type === 'lock') cycleLock(state, it, at.lock);
  if (at && at.type === 'link') takeLink(state, it, av, at);
  if (at && at.type === 'mainframe') state.events.push({ type: 'mainframeUsed', player: av.player });
  const desk = it.desks.find((d) => dist(d.x, d.y, av.x, av.y) < 20);
  if (desk && (!at || at.type === 'desk')) {
    // The table in the bar has its jobs ready when someone walks up to it (D-073).
    if (desk.type === 'jobs') offersAt(state, place);
    state.events.push({ type: 'deskUsed', player: av.player, desk: desk.type });
  }
}

// What is done by holding the use key at a console of a base: the switchgear is switched off, the drone hangar
// is put out of use and the call for help is stopped. The Engineer is quicker at all of it.
function workConsole(state, place, it, av, at, dt) {
  const time = at && { breaker: B.BREAKER_TIME, hangar: B.HANGAR_TIME, comms: B.COMMS_TIME }[at.type];
  if (!time) return;
  it.turning = Math.min(1, it.turning + (dt / time) * (av.role === 'engineer' ? B.ROLE_HACK : 1));
  it.working = true;
  if (it.turning < 1) return;
  it.turning = 0;
  if (at.type === 'breaker') cutPower(state, place, false);
  else if (at.type === 'hangar') wreckHangar(state, it);
  else stopCall(state, it);
}

export function stepAvatar(state, place, it, av, cmd, dt) {
  const player = playerById(state, av.player);
  av.cool = Math.max(0, av.cool - dt);
  if (!cmd) return;
  if (cmd.aim) av.heading = headingTo(cmd.aim.x - av.x, cmd.aim.y - av.y);
  walk(state, it, av, cmd, dt);
  // The lamp works everywhere, also for a visitor on a trading station whose power has gone out (found 2026-11-28).
  if (cmd.lampPressed) av.lamp = !av.lamp;
  if (it.trade) {
    stepVisitor(state, place, it, av, cmd, dt);
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
  if (at && at.type === 'lock') cycleLock(state, it, at.lock);
  if (at && at.type === 'link') {
    takeLink(state, it, av, at);
    return;
  }
  if (at && at.type === 'loot') pickUp(state, it, av, at.item);
  if (cmd.drop) dropAll(state, it, av);
  if (cmd.grenade && av.grenades > 0) throwGrenade(it, av, cmd.grenade);
  if (cmd.flare && av.flares > 0) throwFlare(state, it, av, cmd.flare);
  // What is carried is stowed on the ship at the airlock, through its open hatch.
  const onHatch = tileAt(it, Math.floor(av.x / TILE), Math.floor(av.y / TILE)) === 'A' || atAirlockDoor(it, av);
  const atAirlock = onHatch && hatchOpen(it);
  if (atAirlock) deposit(state, av);
  if (cmd.usePressed && atAirlockDoor(it, av) && hatchOpen(it)) {
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
  // A breaching charge at the switchgear puts the power out at once, and is heard (R-1167).
  if (cmd.charge && av.charges > 0 && it.breaker && !it.breaker.out) {
    if (dist(av.x, av.y, it.breaker.x, it.breaker.y) < 28) {
      av.charges--;
      state.ship.mods.charge = Math.max(0, level(state.ship, 'charge') - 1);
      state.ship.owned.charge = state.ship.mods.charge;
      it.fx.push({ type: 'boom', x: it.breaker.x, y: it.breaker.y, t: 0, dur: 0.45, size: 24 });
      cutPower(state, place, true);
      state.events.push({ type: 'breached' });
    }
  }
  // What the Engineer does by holding the use key next to it.
  const near = cmd.use ? useTarget(it, av) : null;
  workConsole(state, place, it, av, near, dt);
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
    const on = (d) => (d.tiles ? d.tiles.includes(ty * it.w + tx) : d.tx === tx && d.ty === ty);
    if (it.alarmed.some((d) => !d.off && on(d))) foundOut(state, it, av);
  }
  workVaultDoor(state, it, av, cmd, dt);
  if (player.hp <= 0) leave(state, it, av, true);
}
