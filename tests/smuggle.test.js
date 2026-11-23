// Smuggling (D-257, D-074): jobs from Drifter and free bases, and Warden patrols that scan the ship for the goods,
// which the crew hides by matching two waves with two dials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { stepPlayers } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { isTrading } from '../src/sim/stations.js';
import { offersAt, takeJob, smugglesAt, carryingContraband } from '../src/sim/jobs.js';
import { standingOf } from '../src/sim/sides.js';
import { makeVessel } from '../src/sim/vessels.js';
import { addPlayer } from '../src/sim/players.js';
import { scannerOf, gap } from '../src/sim/scan.js';
import { B } from '../src/sim/balance.js';

const DT = 1 / 60;
const run = (s, inputs, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++)
    stepPlayers(s, typeof inputs === 'function' ? inputs() : inputs, DT);
};
const quiet = (s) => {
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  return s;
};
// A base of the given side: a trading base in the first system, made to be of that side.
function baseOf(s, side) {
  const st = thingsOf(s, 'station').find(isTrading);
  st.side = side;
  return st;
}
function smuggleJob(s, side = 'drifters') {
  const st = baseOf(s, side);
  for (let i = 0; i < 60; i++) {
    const job = offersAt(s, st).find((j) => j.kind === 'smuggle');
    if (job) return { st, job };
    s.time += B.JOBS.refresh;
  }
  return { st, job: null };
}
// Out in space with a Warden ship close by, holding still.
function warden(s, d = 150) {
  s.ship.docked = null;
  s.vessels = [];
  s.ship.vx = s.ship.vy = 0;
  s.ship.throttle = 0;
  const v = makeVessel(s, 'gunboat', s.ship.x + d, s.ship.y, 'wardens');
  s.vessels.push(v);
  return v;
}
// Keep the Warden ship where it is, so that only what is tested moves.
const pin = (s, v) => () => {
  v.x = s.ship.x + 150;
  v.y = s.ship.y;
  v.vx = v.vy = 0;
  return {};
};

test('R-1260: Drifter and free bases offer smuggling jobs, paid about twice a crate, never to a Warden base', () => {
  assert.ok(smugglesAt('drifters') && smugglesAt('free-12'));
  assert.ok(!smugglesAt('wardens') && !smugglesAt('charter'));
  const s = quiet(createState(1));
  const { job } = smuggleJob(s, 'drifters');
  assert.ok(job, 'a Drifter base offers one');
  assert.equal(job.side, 'drifters', 'for itself');
  const to = s.sectors[job.to.sector].plan.find((p) => p[3] === job.to.name);
  assert.notEqual(to[0], 'wardens');
  assert.ok(job.pay >= B.JOBS.pay[0] * 1.5, `it pays well: ${job.pay}`);
  const w = quiet(createState(1));
  assert.equal(smuggleJob(w, 'wardens').job, null, 'a Warden base never does');
});

test('R-1261: a Warden ship that comes near scans the ship, and without smuggled goods nothing comes of it', () => {
  const s = quiet(createState(1));
  const v = warden(s);
  run(s, {}, DT * 2);
  assert.ok(s.scan, 'the scan starts');
  assert.equal(s.scan.hidden, false);
  const before = standingOf(s, 'wardens');
  run(s, pin(s, v), B.SCAN.time + 0.5);
  assert.equal(s.scan, null, 'and ends');
  assert.equal(standingOf(s, 'wardens'), before);
  run(s, pin(s, v), 2);
  assert.equal(s.scan, null, 'the same ship does not scan again at once');
});

test('R-1261: flying off fast cuts the scan short, and the Wardens take it amiss', () => {
  const s = quiet(createState(1));
  warden(s);
  run(s, {}, DT * 2);
  assert.ok(s.scan);
  const before = standingOf(s, 'wardens');
  s.ship.x -= B.SCAN.breaks + 100;
  s.ship.vx = -B.SCAN.fleeSpeed * 2;
  run(s, {}, DT * 2);
  assert.equal(s.scan, null);
  assert.ok(standingOf(s, 'wardens') < before);
});

test('R-1262 R-1218: with smuggled goods, a scan that runs out finds them: the goods are lost and standing falls', () => {
  const s = quiet(createState(1));
  const { st, job } = smuggleJob(s);
  s.ship.docked = st.id;
  assert.ok(takeJob(s, st, job.id));
  assert.ok(carryingContraband(s));
  const v = warden(s);
  run(s, {}, DT * 2);
  assert.equal(s.scan.hidden, true);
  const before = standingOf(s, 'wardens');
  run(s, pin(s, v), B.SCAN.time + 0.5);
  assert.equal(carryingContraband(s), false);
  assert.ok(standingOf(s, 'wardens') <= before - B.SCAN.caught + 0.001);
});

test('R-1262: the one whose turn it is matches the waves with the dials, and the scan finds nothing', () => {
  const s = quiet(createState(1));
  const { st, job } = smuggleJob(s);
  s.ship.docked = st.id;
  takeJob(s, st, job.id);
  const v = warden(s);
  run(s, {}, DT * 2);
  const sc = s.scan;
  // Alone, the player is the Captain, and so turns the dials. Turn each towards the scan's wave.
  const toward = (have, want) => {
    const d = ((((want - have) % 1) + 1.5) % 1) - 0.5;
    return Math.abs(d) < B.SCAN.near / 3 ? 0 : Math.sign(d);
  };
  for (let t = 0; t < B.SCAN.time - 0.2 && s.scan; t += DT) {
    pin(s, v)();
    stepPlayers(s, { 0: { scan: { a: toward(sc.dial.a, sc.target.a), b: toward(sc.dial.b, sc.target.b) } } }, DT);
  }
  assert.equal(s.scan, null, 'the scan is over early');
  assert.ok(gap(sc.dial.a, sc.target.a) < B.SCAN.near && gap(sc.dial.b, sc.target.b) < B.SCAN.near);
  assert.equal(carryingContraband(s), true, 'and the goods are still aboard');
});

test('R-1262 R-935: the Engineer works the dials, else the Captain, else the Gunner, and no one else', () => {
  const s = quiet(createState(1));
  assert.equal(scannerOf(s).post, 'captain', 'alone as Captain');
  s.players[0].post = 'gunner';
  assert.equal(scannerOf(s).post, 'gunner');
  addPlayer(s, 'BO');
  addPlayer(s, 'CY');
  s.players[0].post = 'captain';
  s.players[1].post = 'gunner';
  s.players[2].post = 'engineer';
  assert.equal(scannerOf(s).name, s.players[2].name);
  // Dials turned by someone else do nothing.
  const { st, job } = smuggleJob(s);
  s.ship.docked = st.id;
  takeJob(s, st, job.id);
  warden(s);
  run(s, {}, DT * 2);
  const was = { ...s.scan.dial };
  run(s, { 0: { scan: { a: 1, b: 1 } }, 1: { scan: { a: 1, b: 1 } } }, 0.5);
  assert.deepEqual(s.scan.dial, was);
  run(s, { 2: { scan: { a: 1, b: 0 } } }, 0.5);
  assert.notEqual(s.scan.dial.a, was.a);
});
