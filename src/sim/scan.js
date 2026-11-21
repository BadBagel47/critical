// Warden patrols scan the ship for smuggled goods (D-074, R-1218, R-1261, R-1262).
//
// A Warden ship that comes near scans the ship, which takes a few seconds and shows on every screen. Without
// smuggled goods nothing comes of it. With them, one of the crew can hide the goods: the scan shows a wave, the
// ship's own wave is set with two dials, and when the two waves have lain on top of each other for a moment the
// scan finds nothing. The Engineer works the dials; with no one on the Engineer's post the Captain does, and with
// no Captain either the Gunner (SM4). When the time runs out first, the goods are lost and the Wardens think less of
// the crew. Flying off fast cuts the scan short, which the Wardens also take amiss, if less so.
//
//   state.scan = null, or { by, left, hidden, target: { a, b }, dial: { a, b }, held }
//     by       the Warden ship that scans
//     left     seconds left of the scan
//     hidden   whether there were smuggled goods aboard when it began, and so whether the dials count
//     target   the scan's wave, and dial the ship's: each a number from 0 to 1 that goes round
//     held     how long the two waves have lain on top of each other
import { B } from './balance.js';
import { CREW, enemies, changeStanding } from './sides.js';
import { holderOf } from './players.js';
import { dist, rand } from './util.js';
import { speedOf } from './ship.js';
import { carryingContraband } from './jobs.js';

export const WARDENS = 'wardens';
// Who works the dials: the Engineer, else the Captain, else the Gunner (SM4).
export function scannerOf(state) {
  for (const post of ['engineer', 'captain', 'gunner']) {
    const p = holderOf(state, post);
    if (p) return p;
  }
  return null;
}
// How far apart two dial settings are, the short way round.
export const gap = (x, y) => {
  const d = Math.abs(x - y) % 1;
  return Math.min(d, 1 - d);
};
const wrap = (v) => ((v % 1) + 1) % 1;
export const wavesMeet = (sc) => gap(sc.dial.a, sc.target.a) < B.SCAN.near && gap(sc.dial.b, sc.target.b) < B.SCAN.near;

function startScan(state, v) {
  v.scannedAt = state.time;
  const hidden = carryingContraband(state);
  const target = { a: 0.1 + rand(state) * 0.8, b: rand(state) };
  // The ship's wave starts well away from the scan's, so that there is always something to do.
  const dial = { a: wrap(target.a + 0.3 + rand(state) * 0.4), b: wrap(target.b + 0.3 + rand(state) * 0.4) };
  state.scan = { by: v.id, left: B.SCAN.time, hidden, target, dial, held: 0 };
  state.events.push({ type: 'scanStart', hidden });
}

function caught(state) {
  const jobs = state.jobs;
  const lost = jobs.taken.filter((j) => j.kind === 'smuggle');
  jobs.taken = jobs.taken.filter((j) => j.kind !== 'smuggle');
  changeStanding(state, WARDENS, -B.SCAN.caught);
  state.events.push({ type: 'smuggleCaught', count: lost.length });
}

// While it scans, the Warden ship stays with the ship, as fast as it can: it does not just fly on.
function keepUp(v, ship, dt) {
  const d = dist(v.x, v.y, ship.x, ship.y) || 1;
  const want = { x: ship.x + ((v.x - ship.x) / d) * B.SCAN.follow, y: ship.y + ((v.y - ship.y) / d) * B.SCAN.follow };
  const gx = want.x - v.x;
  const gy = want.y - v.y;
  const g = Math.hypot(gx, gy);
  const speed = Math.min(B.SCAN.followSpeed, g / Math.max(dt, 1e-6));
  v.vx = g > 0.01 ? (gx / g) * speed : 0;
  v.vy = g > 0.01 ? (gy / g) * speed : 0;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
}

// `orders` is { [player id]: { a, b } }: how each player turns the dials this step, from -1 to 1 for a key held, or
// more for a click on the panel. Only the player whose turn it is (scannerOf) counts.
export function stepScan(state, orders, dt) {
  const ship = state.ship;
  const sc = state.scan;
  if (!sc) {
    if (ship.docked || state.over) return;
    const v = state.vessels.find(
      (x) =>
        x.side === WARDENS &&
        x.hp > 0 &&
        !x.gone &&
        !enemies(state, x.side, CREW) &&
        dist(x.x, x.y, ship.x, ship.y) < B.SCAN.range &&
        !(x.scannedAt !== undefined && state.time - x.scannedAt < B.SCAN.again),
    );
    if (v) startScan(state, v);
    return;
  }
  const v = state.vessels.find((x) => x.id === sc.by);
  if (!v || v.hp <= 0 || v.gone || ship.docked || enemies(state, WARDENS, CREW)) {
    state.scan = null;
    state.events.push({ type: 'scanOver' });
    return;
  }
  keepUp(v, ship, dt);
  if (dist(v.x, v.y, ship.x, ship.y) > B.SCAN.breaks) {
    // Out of reach: fled, if the ship got there fast; else the patrol has gone on its way.
    const fled = speedOf(ship) > B.SCAN.fleeSpeed;
    if (fled) changeStanding(state, WARDENS, -B.SCAN.fled);
    state.scan = null;
    state.events.push({ type: fled ? 'scanFled' : 'scanOver' });
    return;
  }
  if (sc.hidden) {
    const who = scannerOf(state);
    const o = who && orders ? orders[who.id] : null;
    if (o) {
      const turn = (x) => Math.max(-6, Math.min(6, Number(x) || 0)) * B.SCAN.turn * dt;
      sc.dial.a = wrap(sc.dial.a + turn(o.a));
      sc.dial.b = wrap(sc.dial.b + turn(o.b));
    }
    sc.held = wavesMeet(sc) ? sc.held + dt : 0;
    if (sc.held >= B.SCAN.hold) {
      state.scan = null;
      state.events.push({ type: 'scanFooled' });
      return;
    }
  }
  sc.left -= dt;
  if (sc.left > 0) return;
  state.scan = null;
  if (sc.hidden && carryingContraband(state)) caught(state);
  else state.events.push({ type: 'scanClear' });
}
