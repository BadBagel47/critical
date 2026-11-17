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
} from '../src/sim/story.js';

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
