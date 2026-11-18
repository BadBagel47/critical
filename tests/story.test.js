// The story of a game (D-274, src/sim/story.js, docs/proposal-missions.md). Not in the game yet: these tests check
// that every story the generator makes can be played from the start to the end, on every map size and every way
// through the choices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import {
  createStory,
  checkStory,
  pathsOf,
  sectorsFor,
  MAIN_STEPS,
  CHOICES,
  SORTS,
  FALLBACKS,
  PREMISES,
  HIDDEN_STEPS,
  summarize,
  namesSystem,
} from '../src/sim/story.js';
import { regionLayout } from '../src/sim/world.js';

const SIZES = ['short', 'medium', 'long'];
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const storyOf = (seed, size) => {
  const sectors = sectorsFor(seed, size);
  return { story: createStory(sectors, seed, size), sectors };
};

test('the tester makes the same map as the game for the same seed', () => {
  for (const size of SIZES)
    for (const seed of [1, 2, 3, 17]) {
      const game = createState(seed, { size }).sectors.map((x) => [x.name, x.kind, x.owner, x.links]);
      const quick = sectorsFor(seed, size).map((x) => [x.name, x.kind, x.owner, x.links]);
      assert.deepEqual(quick, game, `${size} ${seed}`);
    }
});

test('R-1210: the main story has 8, 12 or 16 steps on every way through, after the size of the map', () => {
  assert.deepEqual(MAIN_STEPS, { short: 8, medium: 12, long: 16 });
  for (const size of SIZES)
    for (const seed of SEEDS.slice(0, 10)) {
      const { story } = storyOf(seed, size);
      for (const path of pathsOf(story)) assert.equal(path.length, MAIN_STEPS[size], `${size} ${seed}`);
    }
});

test('R-1212: one choice on the small map and two on the others, and every way through leads to the end', () => {
  for (const size of SIZES) {
    const { story } = storyOf(5, size);
    const choices = story.steps.filter((st) => st.sort === 'choose');
    assert.equal(choices.length, CHOICES[size]);
    assert.equal(pathsOf(story).length, 2 ** CHOICES[size]);
    for (const path of pathsOf(story)) assert.equal(path[path.length - 1].gives, 'map');
    for (const c of choices) {
      assert.equal(c.options.length, 2);
      assert.notEqual(c.sides[0], c.sides[1], 'two different sides want the item');
    }
  }
});

test('R-1209, R-1211, R-1213, R-1214: every story on every map size can be played to the end', () => {
  for (const size of SIZES)
    for (const seed of SEEDS) {
      const { story, sectors } = storyOf(seed, size);
      assert.deepEqual(checkStory(story, sectors), [], `${size} seed ${seed}`);
    }
});

test('R-1209: the story starts in the sanctuary and ends at a pirate base with the star map, never in the end', () => {
  for (const seed of SEEDS.slice(0, 10)) {
    const { story, sectors } = storyOf(seed, 'medium');
    for (const path of pathsOf(story)) {
      assert.equal(path[0].act, 'hook');
      assert.equal(sectors[path[0].system].kind, 'sanctuary');
      const last = path[path.length - 1];
      assert.equal(last.sort, 'raid');
      assert.ok(sectors[last.system].plan.some(([side, , , name]) => side === 'pirate' && name === last.base));
      assert.ok(path.every((st) => !sectors[st.system].boss));
    }
  }
});

test('R-1214: every sort of step has a way out if something goes wrong', () => {
  for (const sort of Object.keys(SORTS)) assert.ok(FALLBACKS[sort], sort);
});

test('the same seed gives the same story, and another seed another', () => {
  const a = storyOf(11, 'long').story;
  const b = storyOf(11, 'long').story;
  assert.deepEqual(a, b);
  const c = storyOf(12, 'long').story;
  assert.notDeepEqual(
    a.steps.map((st) => st.text || st.branches[0].text),
    c.steps.map((st) => st.text || st.branches[0].text),
  );
});

test('making a story leaves the random numbers of the game alone', () => {
  const s = createState(3, { size: 'short' });
  const before = s.rng;
  createStory(s.sectors, 3, 'short');
  assert.equal(s.rng, before);
});

test('R-1222: the hidden truth is told in four clues spread over the story, and in full at the end', () => {
  for (const size of SIZES)
    for (const seed of SEEDS.slice(0, 10)) {
      const { story } = storyOf(seed, size);
      assert.deepEqual(
        story.clues.map((c) => c.kind),
        ['method', 'motive', 'side', 'name'],
      );
      const at = story.clues.map((c) => c.index);
      assert.deepEqual(
        [...at].sort((a, b) => a - b),
        at,
        'in order',
      );
      for (const i of at) assert.notEqual(story.steps[i].sort, 'choose', 'a choice tells no clue');
      assert.ok(story.reveal.length > 20);
    }
});

test('R-1223: the contact, the villain and the rival call over the radio, and the contact goes quiet once gone', () => {
  let rivalCalls = 0;
  for (const seed of SEEDS) {
    const { story } = storyOf(seed, 'long');
    const path = pathsOf(story)[0];
    const calls = path.flatMap((st) => st.radio.map((r) => ({ from: r.from, at: st.index })));
    assert.ok(
      calls.some((c) => c.from === story.cast.villain.name),
      `seed ${seed}: the villain speaks`,
    );
    if (story.contactOut === Infinity)
      assert.ok(
        calls.some((c) => c.from === story.cast.contact.name),
        `seed ${seed}`,
      );
    else
      assert.ok(
        calls.every((c) => c.from !== story.cast.contact.name || c.at <= story.contactOut),
        `seed ${seed}: the contact is quiet after ${story.contactOut}`,
      );
    if (calls.some((c) => c.from === story.cast.rival.ship)) rivalCalls++;
  }
  assert.ok(rivalCalls > 0, 'the rival calls in some stories');
});

test('R-1224: after a choice, a base of the side left out is cool to the crew, only if it was left out', () => {
  let found = 0;
  for (const seed of SEEDS) {
    const { story } = storyOf(seed, 'long');
    for (const path of pathsOf(story))
      for (const st of path)
        if (st.cooled) {
          found++;
          const choice = story.steps[st.cooled.choice];
          assert.equal(choice.sort, 'choose');
          assert.ok(choice.sides.includes(st.cooled.side));
        }
  }
  assert.ok(found > 0);
});

test('the tester can pick the premise, and the convoy is written in full', () => {
  const sectors = sectorsFor(4, 'medium');
  for (const premise of Object.keys(PREMISES)) {
    const story = createStory(sectors, 4, 'medium', { premise });
    assert.equal(story.premise, premise);
    assert.deepEqual(checkStory(story, sectors), []);
  }
  assert.ok(PREMISES.convoy.full);
});

test('R-1227, R-1235: the map has four regions, five on the large map, about as large as each other, and the sanctuary in none', () => {
  for (const size of SIZES)
    for (const seed of [1, 2, 3]) {
      const sectors = sectorsFor(seed, size);
      const lay = regionLayout(sectors, size);
      assert.equal(lay.count, size === 'long' ? 5 : 4);
      assert.deepEqual(lay.names.slice(0, 4), ['ALPHA', 'BETA', 'GAMMA', 'DELTA']);
      assert.equal(lay.of(0), null);
      const counts = Array(lay.count).fill(0);
      for (const s of sectors.slice(1)) counts[lay.of(s.id)]++;
      assert.ok(
        Math.max(...counts) - Math.min(...counts) <= Math.ceil(sectors.length / lay.count / 2),
        `${size} ${seed}: ${counts}`,
      );
    }
});

test('R-1228: almost every story uses every region of the map', () => {
  for (const size of SIZES) {
    const list = SEEDS.map((seed) => storyOf(seed, size));
    assert.ok(summarize(list).allRegions >= SEEDS.length * 0.9, size);
  }
});

test('R-1229: one step on the small map and two on the others are found without a mark, with a clue that does not name the system', () => {
  for (const size of SIZES)
    for (const seed of SEEDS.slice(0, 15)) {
      const { story, sectors } = storyOf(seed, size);
      const hidden = story.steps.filter((st) => st.hidden);
      assert.equal(hidden.length, HIDDEN_STEPS[size]);
      for (const st of hidden) {
        assert.notEqual(st.sort, 'raid');
        assert.ok(st.goal.startsWith('Find ') && st.goal.includes(st.hidden.region));
        assert.ok(!namesSystem(st.goal, sectors[st.system].name));
        assert.ok(st.fallback.includes('Asking in a bar'));
      }
    }
});

test('a system is named only by its whole name', () => {
  assert.ok(namesSystem('out in LOW WAKE, DELTA.', 'LOW WAKE'));
  assert.ok(!namesSystem('2 jumps from HOLLOW WAKE, GAMMA.', 'LOW WAKE'));
});
