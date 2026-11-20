// Side missions (D-073, src/sim/jobs.js): taken at the table in the bar, done by doing what they ask, paid in
// every purse, with standing for whoever gave them, and a way back with a faction that shuts its bases (F-118).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { arrive } from '../src/sim/sectors.js';
import { thingsOf } from '../src/sim/things.js';
import { createInterior } from '../src/sim/boarding.js';
import { deposit } from '../src/sim/loot.js';
import { isTrading } from '../src/sim/stations.js';
import { offersAt, takeJob, stepJobs, jobText } from '../src/sim/jobs.js';
import { standingOf } from '../src/sim/sides.js';
import { B } from '../src/sim/balance.js';

const quiet = (s) => {
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  return s;
};
// A game docked at a base that trades, in the first system.
function atBar(seed = 1) {
  const s = quiet(createState(seed));
  const st = thingsOf(s, 'station').find(isTrading);
  s.ship.docked = st.id;
  return { s, st };
}
// Jobs of a kind offered at a base, made again until there is one.
function offerOf(s, st, kind) {
  for (let i = 0; i < 60; i++) {
    const job = offersAt(s, st).find((j) => j.kind === kind);
    if (job) return job;
    s.time += B.JOBS.refresh;
  }
  throw new Error('no ' + kind + ' job offered');
}
function go(s, sector) {
  arrive(s, sector);
  quiet(s);
  s.ship.docked = null;
}

test('R-1252: a base that trades has a table in the bar for jobs, and offers a few at a time', () => {
  const { s, st } = atBar();
  st.interior = createInterior(s, st);
  assert.ok(st.interior.desks.some((d) => d.type === 'jobs'));
  const list = offersAt(s, st);
  assert.ok(list.length >= 1 && list.length <= B.JOBS.offered);
  assert.equal(offersAt(s, st), list, 'the same jobs until a while has passed');
  for (const j of list) assert.ok(j.pay >= B.JOBS.pay[0] && j.pay <= B.JOBS.pay[1], `pay ${j.pay}`);
});

test('R-1251: a cargo job is done by docking at the base it names, and pays every purse', () => {
  const { s, st } = atBar(2);
  const job = offerOf(s, st, 'cargo');
  assert.ok(takeJob(s, st, job.id));
  assert.match(jobText(s, job), /^CARRY A CRATE TO /);
  const before = { ...s.purses };
  const standing = standingOf(s, job.side);
  go(s, job.to.sector);
  const there = thingsOf(s, 'station').find((x) => x.name === job.to.name);
  s.ship.docked = there.id;
  step(s, {}, 1 / 20);
  assert.equal(s.jobs.taken.length, 0);
  assert.equal(s.jobs.done, 1);
  for (const role of Object.keys(before)) assert.equal(s.purses[role], before[role] + job.pay);
  assert.ok(standingOf(s, job.side) > standing || standing >= 100);
});

test('R-1251: a bounty is done when the named pirate is shot down', () => {
  const { s, st } = atBar(3);
  const job = offerOf(s, st, 'bounty');
  takeJob(s, st, job.id);
  go(s, job.to.sector);
  s.events = [];
  stepJobs(s);
  const pirate = s.vessels.find((v) => v.job === job.id);
  assert.ok(pirate, 'the pirate is out in the system');
  assert.equal(pirate.storyName, job.target);
  s.events = [{ type: 'kill', id: pirate.id }];
  stepJobs(s);
  assert.equal(s.jobs.done, 1);
});

test('R-1251: a rescue is done when the survivor from the wreck is carried home', () => {
  const { s, st } = atBar(4);
  const job = offerOf(s, st, 'rescue');
  takeJob(s, st, job.id);
  go(s, job.to.sector);
  s.events = [];
  stepJobs(s);
  const wreck = thingsOf(s, 'wreck').find((w) => w.job === job.id);
  assert.ok(wreck, 'the wreck is out in the system');
  wreck.interior = createInterior(s, wreck);
  stepJobs(s);
  const survivor = wreck.interior.loot.find((l) => l.type === 'survivor');
  assert.ok(survivor, 'the survivor is inside');
  s.events = [];
  deposit(s, { player: 0, carry: [survivor] });
  stepJobs(s);
  assert.equal(s.jobs.done, 1);
});

test('R-1253: a job with a time limit that runs out pays nothing and costs a little standing', () => {
  const { s, st } = atBar(5);
  let job = null;
  for (let i = 0; i < 80 && !job; i++) {
    job = offersAt(s, st).find((j) => j.limit);
    if (!job) s.time += B.JOBS.refresh;
  }
  assert.ok(job, 'a job with a time limit');
  const plain = Math.round((B.JOBS.base[job.kind] + 0) / 10) * 10;
  assert.ok(job.pay >= Math.min(B.JOBS.pay[1], plain * B.JOBS.timedPay) - 1, 'it pays half as much again');
  takeJob(s, st, job.id);
  const purses = { ...s.purses };
  s.standing[job.side] = 0;
  s.time = job.deadline + 1;
  stepJobs(s);
  assert.equal(s.jobs.taken.length, 0);
  assert.deepEqual(s.purses, purses);
  assert.equal(standingOf(s, job.side), -B.JOBS.standing.failed);
});

test('R-1254: the crew holds at most five jobs', () => {
  const { s, st } = atBar(6);
  let taken = 0;
  for (let i = 0; i < 20 && taken < 8; i++) {
    for (const j of [...offersAt(s, st)]) if (takeJob(s, st, j.id)) taken++;
    s.time += B.JOBS.refresh;
  }
  assert.equal(s.jobs.taken.length, B.JOBS.max);
});

test('R-1255: a faction that has shut its bases to the crew gives jobs on free bases now and then', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const s = quiet(createState(seed));
    const free = thingsOf(s, 'station').find((x) => isTrading(x) && x.side.startsWith('free-'));
    if (!free) continue;
    s.standing.charter = -60;
    let seen = 0;
    for (let i = 0; i < 30; i++) {
      seen += offersAt(s, free).filter((j) => j.side === 'charter').length;
      s.time += B.JOBS.refresh;
    }
    assert.ok(seen > 0);
    return;
  }
  assert.fail('no free base that trades in the first systems');
});
