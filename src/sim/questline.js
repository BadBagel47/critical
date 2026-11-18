// The main story in the game (D-052, F-276, docs/proposal-missions.md): the story of storytext.js and story.js,
// played step by step. The story itself is not kept in the game state: it is made again from the seed and the
// map size whenever it is needed, so that saves stay small. The state keeps only how far the crew has come.
//
//   state.story = { at, picks, found, done, finished, choosing, spawned }
//     at        the step the crew is on
//     picks     what was given to whom at each choice, by the choice's index: 0 or 1
//     found     the steps without a mark whose system the crew has found (R-1229)
//     done      the steps done, in order, so that the screen can tell what happened
//     choosing  docked where a choice is made, waiting for it
//     spawned   the id of the ship or wreck put out for the step the crew is on
//
// How a step is done, by its sort (R-1211):
//   talk, acquire, deliver   dock at its base
//   choose                   dock at its base and pick who gets the item
//   search                   dock at the wreck the story put out in the system
//   scan                     fly close to where the signal comes from, marked on the system map
//   fight, board             shoot down the ship the story put out. Boarding ships comes with F-081, so a ship
//                            to board is shot down for now
//   raid                     hold the end's star chart, from the vault of a pirate base (R-1098)
// A test game has no story.
import { createStory, sectorsFor, CHOICE_STANDING } from './story.js';
import { regionLayout } from './world.js';
import { findThing, addThing, thingsOf } from './things.js';
import { createWreck } from './sectors.js';
import { makeVessel } from './vessels.js';
import { changeStanding, PIRATE } from './sides.js';
import { dist, TAU } from './util.js';

export const createStoryState = (test) =>
  test ? null : { at: 0, picks: {}, found: [], done: [], finished: false, choosing: false, spawned: null };

// The story of a game, made again from its seed and map size, kept for as long as the page is open.
const made = new Map();
export function storyOf(state) {
  if (!state.story) return null;
  const key = `${state.seed}:${state.size}`;
  if (!made.has(key)) {
    try {
      made.set(key, createStory(sectorsFor(state.seed, state.size), state.seed, state.size));
    } catch {
      made.set(key, null);
    }
  }
  return made.get(key);
}

// The step at index i, on the way the crew's choices took.
export function stepOf(state, i) {
  const story = storyOf(state);
  const st = story && story.steps[i];
  if (!st) return null;
  return st.branches ? st.branches[state.story.picks[i - 1] ?? 0] : st;
}
export const currentStep = (state) => (state.story && !state.story.finished ? stepOf(state, state.story.at) : null);

// Where in its system a step's ship, wreck or signal is: the same place every time.
export function spotOf(state, st) {
  const sec = state.sectors[st.system];
  const a = (st.index * 2.39996 + 0.7) % TAU;
  const d = sec.radius * 0.55;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}

// The system the star map marks for the story, if any: only where it is, and only once a step without a mark has
// been found (R-1226, R-1229).
export function storyMark(state) {
  const st = currentStep(state);
  if (!st) return null;
  if (st.hidden && !state.story.found.includes(st.index)) return null;
  return st.system;
}

function done(state, st) {
  const q = state.story;
  q.done.push(st.index);
  q.choosing = false;
  q.spawned = null;
  q.at = st.index + 1;
  if (st.sort === 'raid' || !storyOf(state).steps[q.at]) q.finished = true;
  state.events.push({ type: 'story', index: st.index });
}

// The crew picks who gets the item at a choice: 0 or 1. The side that gets it likes the crew more, the other less
// (R-1215).
export function chooseStory(state, k) {
  const q = state.story;
  const st = currentStep(state);
  if (!q || !q.choosing || !st || st.sort !== 'choose' || (k !== 0 && k !== 1)) return false;
  q.picks[st.index] = k;
  changeStanding(state, st.sides[k], CHOICE_STANDING.gain);
  changeStanding(state, st.sides[1 - k], -CHOICE_STANDING.loss);
  done(state, st);
  return true;
}

// Put out what the step needs in this system, once: a wreck to search, or a ship to shoot down.
function putOut(state, st) {
  const q = state.story;
  if (q.spawned !== null && (findThing(state, q.spawned) || state.vessels.some((v) => v.id === q.spawned))) return;
  const p = spotOf(state, st);
  if (st.sort === 'search') {
    const w = createWreck(state, p.x, p.y, Math.min(3, 1 + state.sectors[st.system].tier));
    w.story = st.index;
    w.storyName = st.wreck;
    addThing(state, w);
    q.spawned = w.id;
  } else if (st.sort === 'fight' || st.sort === 'board') {
    // A target that got away turns up again when the crew comes back (R-1214).
    const v = makeVessel(state, 'gunboat', p.x, p.y, PIRATE);
    v.story = st.index;
    v.storyName = st.target;
    state.vessels.push(v);
    q.spawned = v.id;
  }
}

export function stepStory(state) {
  const q = state.story;
  const st = currentStep(state);
  if (!st) return;
  if (st.sort === 'raid') {
    const end = state.sectors.find((x) => x.boss);
    if (end && state.charts.includes(end.id)) done(state, st);
    return;
  }
  const docked = findThing(state, state.ship.docked);
  // A step without a mark is found by coming to its system, or by asking in a bar in its region (R-1229).
  if (st.hidden && !q.found.includes(st.index)) {
    const asked =
      docked &&
      docked.kind === 'station' &&
      docked.side !== PIRATE &&
      regionLayout(state.sectors, state.size).nameOf(state.sector) === st.hidden.region;
    if (state.sector === st.system || asked) {
      q.found.push(st.index);
      state.events.push({ type: 'storyFound', index: st.index });
    }
  }
  if (state.sector !== st.system) return;
  if (st.sort === 'talk' || st.sort === 'acquire' || st.sort === 'deliver' || st.sort === 'choose') {
    const here = docked && docked.kind === 'station' && docked.name === st.base;
    if (!here) {
      q.choosing = false;
      return;
    }
    if (st.sort === 'choose') q.choosing = true;
    else done(state, st);
    return;
  }
  if (st.sort === 'scan') {
    const p = spotOf(state, st);
    if (dist(state.ship.x, state.ship.y, p.x, p.y) < 400) done(state, st);
    return;
  }
  // A search, a fight or a ship to board: what the story put out.
  const was = q.spawned;
  if (st.sort === 'search') {
    putOut(state, st);
    if (docked && docked.id === q.spawned) done(state, st);
    return;
  }
  if (was !== null && !state.vessels.some((v) => v.id === was)) {
    if (state.events.some((e) => e.type === 'kill' && e.id === was)) return done(state, st);
    q.spawned = null;
  }
  putOut(state, st);
}

// What the story asks of the crew right now, for the log: the step's task, and how far the story has come.
export function storyLog(state) {
  const story = storyOf(state);
  if (!story) return null;
  const q = state.story;
  const st = currentStep(state);
  const steps = q.done.map((i) => stepOf(state, i));
  return {
    story,
    step: st,
    done: steps,
    clues: story.clues.filter((c) => q.done.includes(c.index)),
    finished: q.finished,
    found: st ? !st.hidden || q.found.includes(st.index) : true,
    of: story.steps.length,
  };
}

// Things the story put out are known by these, for the screen.
export const storyThings = (state) => thingsOf(state, 'wreck').filter((w) => w.story !== undefined);
