// The main story in the game (D-052, src/sim/questline.js): it is made from the seed, the crew's progress is kept
// in the state, and each sort of step is done by doing the thing it asks for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { arrive } from '../src/sim/sectors.js';
import { thingsOf } from '../src/sim/things.js';
import { currentStep, storyMark, chooseStory, spotOf, storyLog } from '../src/sim/questline.js';
import { MAIN_STEPS } from '../src/sim/story.js';

const DT = 1 / 20;
const quiet = (s) => {
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  return s;
};
const tick = (s, n = 1) => {
  for (let i = 0; i < n; i++) step(s, {}, DT);
};

// Do what the step asks for, as directly as a test can.
function doStep(s) {
  const st = currentStep(s);
  if (s.sector !== st.system) {
    arrive(s, st.system);
    quiet(s);
  }
  s.ship.docked = null;
  if (['talk', 'acquire', 'deliver', 'choose'].includes(st.sort)) {
    const base = thingsOf(s, 'station').find((x) => x.name === st.base);
    assert.ok(base, `step ${st.index + 1}: the base ${st.base} is there`);
    s.ship.docked = base.id;
    tick(s);
    if (st.sort === 'choose') {
      assert.ok(s.story.choosing, 'docked at the choice, it waits');
      chooseStory(s, 0);
    }
  } else if (st.sort === 'search') {
    tick(s);
    const w = thingsOf(s, 'wreck').find((x) => x.story === st.index);
    assert.ok(w, 'the story put out a wreck to search');
    s.ship.docked = w.id;
    tick(s);
  } else if (st.sort === 'scan') {
    Object.assign(s.ship, spotOf(s, st));
    tick(s);
  } else if (st.sort === 'fight' || st.sort === 'board') {
    tick(s);
    const v = s.vessels.find((x) => x.story === st.index);
    assert.ok(v, 'the story put out a ship to shoot down');
    s.vessels = s.vessels.filter((x) => x !== v);
    s.events.push({ type: 'kill', id: v.id });
    tick(s);
  } else if (st.sort === 'raid') {
    s.charts.push(s.sectors.find((x) => x.boss).id);
    tick(s);
  }
  s.events = [];
}

test('a new game has a story from its first step in the sanctuary, and a test game has none', () => {
  const s = createState(7, { size: 'short' });
  const st = currentStep(s);
  assert.equal(st.index, 0);
  assert.equal(st.sort, 'talk');
  assert.equal(st.system, 0);
  assert.equal(storyMark(s), 0);
  assert.equal(createState(7, { test: true }).story, null);
});

test('R-1238: the story can be played from the start to the end, and a choice changes the standing', () => {
  for (const [seed, size] of [
    [7, 'short'],
    [4, 'medium'],
  ]) {
    const s = quiet(createState(seed, { size }));
    const before = { ...s.standing };
    let guard = 0;
    while (!s.story.finished && guard++ < 40) {
      const at = s.story.at;
      doStep(s);
      assert.equal(s.story.at, at + 1, `${size} ${seed}: step ${at + 1} (${currentStep(s)?.sort}) is done`);
    }
    assert.ok(s.story.finished);
    assert.equal(s.story.done.length, MAIN_STEPS[size]);
    assert.ok(Object.keys(s.story.picks).length >= 1, 'the choices were made');
    assert.notDeepEqual(s.standing, before, 'and changed what the sides think of the crew');
    assert.equal(storyLog(s).clues.length, 4, 'every clue was found on the way');
  }
});

test('R-1226 R-1229: a step without a mark is not marked until its system is found, or asked for in a bar in its region', () => {
  const s = quiet(createState(7, { size: 'short' }));
  let guard = 0;
  while (!currentStep(s).hidden && guard++ < 20) doStep(s);
  const st = currentStep(s);
  assert.ok(st.hidden);
  assert.equal(storyMark(s), null, 'no mark on the star map');
  arrive(s, st.system);
  tick(s);
  assert.equal(storyMark(s), st.system, 'found by coming to it');
});
