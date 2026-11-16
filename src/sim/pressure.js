// Taking a base starts in its basement (F-209, R-1167): the power has to be put out at the switchgear before
// the mainframe on the top floor will give the base up. That can be done quietly, by switching it off, or
// loudly, by blowing it up. Quietly changes nothing at first, but after a while a guard is sent to see what is
// wrong, and sounds the alarm when it finds out. Loudly is quick, and the alarm sounds at once.
//
// With the power out, things get worse step by step the longer the crew stays (F-210, R-1168):
//   1  the guards fall back to the lift and the stairs to the top
//   2  drones are let out of the hangar, if it is whole, and more of them come while the alarm sounds
//   3  the base calls for help. A countdown shows, and the call can be stopped in the comms room
//   4  the help docks at a cargo arm, with more guards
// Nothing comes out of nowhere: the drones come from the hangar, which can be put out of use, and the guards
// come with a ship, which can be shot down on its way in.
//   it.breaker   { x, y, out, loud }: the switchgear       it.hangar  { x, y, out }: the drone hangar
//   it.comms     { x, y }: the console in the comms room   it.call    { left } while the base calls for help
//   it.pressure  { t, stage, drone, check, checker, relief } from the moment the power goes out
import { B } from './balance.js';
import { TILE, los } from './floor.js';
import { newGuard, alertGuard, awake, guardKind } from './guards.js';
import { giveAway, spotIn, relight } from './boarding.js';
import { setTiles } from './airlock.js';
import { makeVessel } from './vessels.js';
import { PIRATE, CREW } from './sides.js';
import { currentSector } from './sectors.js';
import { dist, forward } from './util.js';
import { armBerth, armsOf } from './traffic.js';
import { SHIPS } from './kinds.js';

const doorTiles = (it, kind) => it.doors.filter((d) => d.kind === kind).flatMap((d) => d.tiles);
// The doors of the command room are shut while the base has power, except on a base of the crew's own.
export const openCommand = (it) => setTiles(it, doorTiles(it, 'command'), ',');
export const sealCommand = (it) => setTiles(it, doorTiles(it, 'command'), 'D');

// Put the power out. `loud` is whether it was blown up, which is heard all through the base.
export function cutPower(state, place, loud) {
  const it = place.interior;
  if (!it.breaker || it.breaker.out) return;
  it.breaker.out = true;
  it.breaker.loud = loud;
  it.power = false;
  openCommand(it);
  relight(it);
  it.pressure = { t: 0, stage: 0, drone: 0, check: loud ? 0 : B.BREAKER_CHECK, checker: null, relief: null };
  state.events.push({ type: 'powerOut', loud });
  if (loud) giveAway(state, place, it, it.breaker);
}

// The power comes back and the base is as it was, once the crew has left it.
export function restorePower(place) {
  const it = place.interior;
  if (!it.breaker || !it.breaker.out) return;
  it.breaker.out = false;
  it.power = true;
  it.pressure = null;
  it.call = null;
  it.guards = it.guards.filter((g) => !g.relief && !g.launched);
  if (place.side !== CREW) sealCommand(it);
  relight(it);
}

// Where the guards of a base stand to hold the ways to the top: at the doors of the lift, the stairs and the
// ladder, on the middle floor and on the top.
const waysUp = (it) => it.links.filter((l) => l.decks[1] === 2).flatMap((l) => l.doors);

function fallBack(state, it) {
  const posts = waysUp(it);
  let k = 0;
  for (const g of it.guards) {
    if (!awake(g) || g.mode === 'alert' || g.boarder || g.kind === 'drone') continue;
    const to = posts[k++ % posts.length];
    g.route = [];
    g.home = { x: to.x, y: to.y };
    g.path = [];
    g.pause = 0;
  }
}

// A drone leaves the hangar. While nobody has been found out it flies a round between the hangar and the way to
// the top. In an alarm it goes for the crew.
function launchDrone(state, it) {
  const tx = Math.floor(it.hangar.x / TILE),
    ty = Math.floor(it.hangar.y / TILE);
  const box = { c0: tx - 4, c1: tx + 4, r0: ty - 4, r1: ty + 4 };
  const g = newGuard(state, spotIn(state, it, box, [it.hangar]), 0, 'drone');
  g.launched = true;
  const lifts = it.links.filter((l) => l.kind === 'lift');
  g.route = [{ x: g.x, y: g.y }, lifts[0].doors[0], lifts[1].doors[1]];
  it.guards.push(g);
  const near = it.avatars[0];
  if (it.mood === 'alarm' && near) alertGuard(g, near);
}
const dronesOut = (it) => it.guards.filter((g) => g.launched && g.hp > 0 && !g.down).length;

// The cargo arm that help docks at: the one furthest from the frigate. Gives which arm it is and where a ship
// lies at it, in space.
function berth(state, st) {
  const ship = state.ship;
  let best = null;
  for (const k of armsOf(st)) {
    const at = { k, ...armBerth(st, k, SHIPS.gunboat.radius * 2) };
    if (!best || dist(at.x, at.y, ship.x, ship.y) > dist(best.x, best.y, ship.x, ship.y)) best = at;
  }
  return best;
}

// The call was not stopped: a ship jumps in with guards and makes for a cargo arm. It carries no fight to the
// frigate, and is no use to the base if it is shot down on its way.
function sendRelief(state, st, it) {
  const at = berth(state, st);
  const f = forward(st.heading + (at.k * Math.PI) / 2);
  const from = { x: st.x + f.x * B.RELIEF_FROM, y: st.y + f.y * B.RELIEF_FROM };
  const v = makeVessel(state, 'gunboat', from.x, from.y, st.side);
  v.heading = at.face;
  v.boarding = true;
  v.legs = [
    { x: at.x, y: at.y, hold: B.RELIEF_STAY, face: at.face },
    { x: from.x, y: from.y, hold: 0, jump: true },
  ];
  state.vessels.push(v);
  state.fx.push({ type: 'warp', x: from.x, y: from.y, t: 0, dur: 0.7 });
  it.pressure.relief = { ship: v.id, arm: at.k };
  state.events.push({ type: 'reliefComing', name: st.name });
}

// The ship has docked: its guards come in at the cargo arm, and know that something is wrong.
function reliefIn(state, st, it, arm) {
  const dock = it.docks[arm] || it.docks[0];
  const tx = Math.floor(dock.x / TILE),
    ty = Math.floor(dock.y / TILE);
  const box = { c0: tx - 4, c1: tx + 4, r0: ty - 4, r1: ty + 4 };
  const tier = currentSector(state).tier;
  const taken = [];
  for (let i = 0; i < B.RELIEF_GUARDS + tier; i++) {
    const kind = guardKind(state, st.side === PIRATE ? 'pirate' : 'other', tier + 3);
    const g = newGuard(state, spotIn(state, it, box, taken), 0, kind);
    g.relief = true;
    alertGuard(g, it.avatars[0] || it.mainframe);
    it.guards.push(g);
  }
  state.events.push({ type: 'reliefDocked', name: st.name });
}

// A guard goes to see why the lights went out.
function sendChecker(it, p) {
  const b = it.breaker;
  const free = it.guards.filter((g) => awake(g) && g.mode !== 'alert' && g.kind !== 'drone' && !g.boarder);
  if (!free.length) {
    p.check = B.BREAKER_CHECK;
    return;
  }
  const g = free.reduce((a, c) => (dist(c.x, c.y, b.x, b.y) < dist(a.x, a.y, b.x, b.y) ? c : a));
  g.route = [];
  g.home = { x: b.x, y: b.y + TILE };
  g.path = [];
  g.pause = 0;
  p.checker = g.id;
}

export function stepPressure(state, st, it, dt) {
  const p = it.pressure;
  if (!p) return;
  p.t += dt;
  // The guard that was sent to look. One that never gets there buys the crew time, until the next is sent.
  if (p.check > 0) {
    p.check -= dt;
    if (p.check <= 0) sendChecker(it, p);
  }
  if (p.checker !== null) {
    const g = it.guards.find((x) => x.id === p.checker);
    const b = it.breaker;
    if (!g || !awake(g)) {
      p.checker = null;
      p.check = B.BREAKER_CHECK;
    } else if (g.mode === 'alert') p.checker = null;
    else if (dist(g.x, g.y, b.x, b.y) < B.BREAKER_SEEN && los(it, g.x, g.y, b.x, b.y - 6)) {
      p.checker = null;
      state.events.push({ type: 'powerFound' });
      giveAway(state, st, it, b);
    }
  }
  const stage = B.PRESSURE.filter((t) => p.t >= t).length;
  while (p.stage < stage) {
    p.stage++;
    if (p.stage === 1) fallBack(state, it);
    if (p.stage === 2 && it.hangar && !it.hangar.out) for (let i = 0; i < B.DRONE_WAVE; i++) launchDrone(state, it);
    if (p.stage === 3 && !p.stopped) it.call = { left: B.RELIEF_TIME };
    state.events.push({ type: 'pressure', stage: p.stage, drones: !!it.hangar && !it.hangar.out });
  }
  // More drones while the alarm sounds, as long as the hangar is whole.
  if (p.stage >= 2 && it.mood === 'alarm' && it.hangar && !it.hangar.out) {
    p.drone += dt;
    if (p.drone >= B.DRONE_EVERY) {
      p.drone = 0;
      if (dronesOut(it) < B.DRONE_MAX) launchDrone(state, it);
    }
  }
  if (it.call) {
    it.call.left -= dt;
    if (it.call.left <= 0) {
      it.call = null;
      sendRelief(state, st, it);
    }
  }
  if (p.relief) {
    const v = state.vessels.find((x) => x.id === p.relief.ship);
    if (!v || v.hp <= 0) {
      p.relief = null;
      state.events.push({ type: 'reliefLost' });
    } else if (v.hold > 0 && v.legs && v.legs.length === 2) {
      reliefIn(state, st, it, p.relief.arm);
      p.relief = null;
    }
  }
}

// The call for help is stopped at the console in the comms room, for good.
export function stopCall(state, it) {
  if (!it.call) return;
  it.call = null;
  it.pressure.stopped = true;
  state.events.push({ type: 'callStopped' });
}
// The hangar is put out of use: no more drones come.
export function wreckHangar(state, it) {
  if (!it.hangar || it.hangar.out) return;
  it.hangar.out = true;
  state.events.push({ type: 'hangarOut' });
}
