// Side missions (D-073, R-1251 to R-1255): jobs taken at the table in the bar of a base, besides the main story.
//   cargo   a crate is taken on board at the bar, and is left at another base by docking there
//   bounty  a pirate with a name is shot down in a system that the star map marks
//   rescue  the boarders go into a wreck in a system that the star map marks, and carry a survivor out to the
//           airlock, as they carry loot
// A base offers a few jobs at a time, made again after a while. The crew holds at most five. A job with a time
// limit pays half as much again. A job done pays every purse and lifts the standing with whoever gave it; a job
// that runs out of time pays nothing and lowers it a little. Standing no longer mends by itself (F-118), so jobs
// are the way back: a faction whose bases are shut to the crew now and then gives jobs on free bases (R-1255).
//
//   state.jobs = { offers, taken, done }
//     offers   by base, '<system>:<name>': { at, list }, the jobs a base offers and when they were made
//     taken    the jobs the crew holds, at most B.JOBS.max
//     done     how many jobs the crew has done
import { B } from './balance.js';
import { rand, TAU } from './util.js';
import { hopsFrom } from './world.js';
import { FACTIONS, PIRATE, changeStanding, isFaction, moodOf } from './sides.js';
import { addThing, findThing } from './things.js';
import { createWreck } from './sectors.js';
import { makeVessel } from './vessels.js';
import { earn } from './purses.js';

export const createJobs = () => ({ offers: {}, taken: [], done: 0 });

export const JOB_KINDS = ['cargo', 'bounty', 'rescue'];
const PIRATE_NAMES = [
  'RED VESNA',
  'OLD KASSEL',
  'THE MAGPIE',
  'HOLLOW JUN',
  'SKARN',
  'MOTH QUILL',
  'DIRE OTTO',
  'LANTERN MAE',
];
const WRECK_NAMES = [
  'MERIDIAN',
  'SOFT LANDING',
  'ALBA ROSE',
  'NINTH HOUR',
  'CALLOW',
  'PATIENT STAR',
  'GRAY HERON',
  'TALLIS',
];
const pick = (state, list) => list[Math.floor(rand(state) * list.length)];

const keyOf = (sector, name) => sector + ':' + name;
// The bases of a system the crew may trade at: those that are not pirate bases.
const tradingBases = (sys) => sys.plan.filter(([side]) => side !== PIRATE).map(([, , , name]) => name);

// The side a job is given for, at a base of `side`: mostly the base's own side; now and then another faction, or
// on a free base a faction that the crew has fallen out with, so that there is always a way back (R-1255).
function giverAt(state, side) {
  const factions = Object.keys(FACTIONS);
  const r = rand(state);
  if (isFaction(side))
    return r < 0.75
      ? side
      : pick(
          state,
          factions.filter((f) => f !== side),
        );
  const shut = factions.filter((f) => ['closed', 'hostile'].includes(moodOf(state, f)));
  if (shut.length && r < 0.5) return pick(state, shut);
  return r < 0.75 ? side : pick(state, factions);
}

// A new job offered at a base in system `from`, or null when there is nowhere to send the crew.
function makeJob(state, from, baseName, side) {
  const hops = hopsFrom(state.sectors, from);
  const near = state.sectors.filter((s) => hops[s.id] >= 0 && hops[s.id] <= B.JOBS.reach && !s.boss);
  const kind = pick(state, JOB_KINDS);
  let to;
  if (kind === 'cargo') {
    const places = near
      .filter((s) => s.id !== from && s.kind !== 'empty')
      .flatMap((s) => tradingBases(s).map((name) => ({ sector: s.id, name })));
    if (!places.length) return null;
    to = pick(state, places);
  } else {
    const places = near.filter((s) => s.kind !== 'sanctuary');
    if (!places.length) return null;
    to = { sector: pick(state, places).id, name: null };
  }
  const far = hops[to.sector];
  const tier = state.sectors[to.sector].tier || 0;
  const timed = rand(state) < B.JOBS.timedShare;
  let pay = B.JOBS.base[kind] + far * B.JOBS.perHop + tier * B.JOBS.perTier;
  if (timed) pay *= B.JOBS.timedPay;
  pay = Math.max(B.JOBS.pay[0], Math.min(B.JOBS.pay[1], Math.round(pay / 10) * 10));
  return {
    id: state.nextId++,
    kind,
    side,
    from: { sector: from, name: baseName },
    to,
    target: kind === 'bounty' ? pick(state, PIRATE_NAMES) : kind === 'rescue' ? pick(state, WRECK_NAMES) : null,
    pay,
    limit: timed ? B.JOBS.timeBase + far * B.JOBS.timePerHop : null,
    deadline: null,
    spawned: null,
    placed: false,
  };
}

// The jobs a base offers now: made when the crew first asks, and made again after a while.
export function offersAt(state, st) {
  const key = keyOf(state.sector, st.name);
  const had = state.jobs.offers[key];
  if (had && state.time - had.at < B.JOBS.refresh) return had.list;
  const list = [];
  for (let i = 0; i < B.JOBS.offered; i++) {
    const job = makeJob(state, state.sector, st.name, giverAt(state, st.side));
    if (job) list.push(job);
  }
  state.jobs.offers[key] = { at: state.time, list };
  return list;
}

// The jobs a base has on offer, as last made, without making new ones: for the screen, which must not change the
// game. They are made when someone walks up to the table (see boarders.js) and when a job is taken.
export function listedAt(state, st) {
  const had = state.jobs && state.jobs.offers[keyOf(state.sector, st.name)];
  return had ? had.list : [];
}

// The crew takes a job offered at the base it is docked at. False when it is not offered or the crew has five.
export function takeJob(state, st, id) {
  const jobs = state.jobs;
  const list = offersAt(state, st);
  const job = list.find((j) => j.id === id);
  if (!job || jobs.taken.length >= B.JOBS.max) return false;
  list.splice(list.indexOf(job), 1);
  if (job.limit) job.deadline = state.time + job.limit;
  jobs.taken.push(job);
  state.events.push({ type: 'jobTaken', id: job.id, kind: job.kind });
  return true;
}

// Orders from the table in the bar, as cmds.jobs: [{ take: id }].
export function jobOrders(state, st, orders) {
  for (const o of orders || []) if (o.take !== undefined) takeJob(state, st, o.take);
}

function finish(state, job, ok) {
  const jobs = state.jobs;
  jobs.taken = jobs.taken.filter((j) => j !== job);
  if (ok) {
    earn(state, job.pay);
    changeStanding(state, job.side, B.JOBS.standing.done);
    jobs.done++;
    state.events.push({ type: 'jobDone', id: job.id, kind: job.kind, pay: job.pay });
  } else {
    changeStanding(state, job.side, -B.JOBS.standing.failed);
    state.events.push({ type: 'jobFailed', id: job.id, kind: job.kind });
  }
}

// Where in its system a job's pirate or wreck is: the same place every time.
export function jobSpot(state, job) {
  const sec = state.sectors[job.to.sector];
  const a = (job.id * 2.39996 + 1.9) % TAU;
  const d = sec.radius * 0.5;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}

function putOut(state, job) {
  if (job.spawned !== null && (findThing(state, job.spawned) || state.vessels.some((v) => v.id === job.spawned)))
    return;
  const p = jobSpot(state, job);
  if (job.kind === 'bounty') {
    const v = makeVessel(state, 'gunboat', p.x, p.y, PIRATE);
    v.job = job.id;
    v.storyName = job.target;
    state.vessels.push(v);
    job.spawned = v.id;
  } else if (job.kind === 'rescue' && !job.found) {
    const w = createWreck(state, p.x, p.y, Math.min(3, 1 + (state.sectors[job.to.sector].tier || 0)));
    w.job = job.id;
    w.storyName = job.target;
    addThing(state, w);
    job.spawned = w.id;
    job.found = true;
  }
}

export function stepJobs(state) {
  const jobs = state.jobs;
  if (!jobs) return;
  for (const job of [...jobs.taken]) {
    if (job.deadline !== null && state.time > job.deadline) {
      finish(state, job, false);
      continue;
    }
    if (state.sector !== job.to.sector) continue;
    if (job.kind === 'cargo') {
      const docked = findThing(state, state.ship.docked);
      if (docked && docked.kind === 'station' && docked.name === job.to.name && docked.align !== 'hostile')
        finish(state, job, true);
      continue;
    }
    if (job.kind === 'bounty') {
      const was = job.spawned;
      if (was !== null && state.events.some((e) => e.type === 'kill' && e.id === was)) {
        finish(state, job, true);
        continue;
      }
      putOut(state, job);
      continue;
    }
    // A rescue: the wreck is put out once and stays. Its survivor is put in the room furthest in when the wreck is
    // first boarded, and the job is done when the survivor is carried home.
    putOut(state, job);
    const wreck = findThing(state, job.spawned);
    const it = wreck && wreck.interior;
    if (it && !job.placed) {
      const room = it.rooms[it.deep >= 0 ? it.deep : it.vault] || it.rooms[0];
      it.loot.push({ type: 'survivor', job: job.id, value: 0, x: room.mid.x, y: room.mid.y });
      job.placed = true;
    }
    if (state.events.some((e) => e.type === 'survivorHome' && e.job === job.id)) finish(state, job, true);
  }
}

// What the log and the star map show of the jobs the crew holds.
export function jobText(state, job) {
  const sys = state.sectors[job.to.sector].name;
  if (job.kind === 'cargo') return `CARRY A CRATE TO ${job.to.name} IN ${sys}`;
  if (job.kind === 'bounty') return `SHOOT DOWN ${job.target} IN ${sys}`;
  return `BRING A SURVIVOR OUT OF THE WRECK ${job.target} IN ${sys}`;
}
export const jobSystems = (state) => (state.jobs ? state.jobs.taken.map((j) => j.to.sector) : []);
// For whom a job is done, as the list shows it: a faction, or the free base that gave it.
export const giverName = (job) => (isFaction(job.side) ? FACTIONS[job.side].short : job.from.name);
// Seconds left of a job with a time limit, or null.
export const timeLeft = (state, job) => (job.deadline === null ? null : Math.max(0, job.deadline - state.time));
