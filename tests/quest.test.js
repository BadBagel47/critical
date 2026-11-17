// The quest engine's core (D-277, src/quest/core.js): it knows nothing of any game, makes chains of steps that hang
// together, and checks handwritten quests the same way as generated ones. The catalogue here is made up for a city
// game, to show that the core is not bound to Critical.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planChain, writtenChain, checkChain, pathsOf, fill } from '../src/quest/core.js';

const CITY = {
  sorts: {
    meet: { needs: 'name', gives: ['name', 'car', 'place', 'package'] },
    steal: { needs: 'car', gives: ['package', 'place'] },
    drive: { needs: 'place', gives: ['name', 'car', 'package', 'hideout'] },
    chase: { needs: 'place', gives: ['package', 'name', 'hideout'] },
    drop: { needs: 'package', gives: ['name', 'place', 'car'] },
    pick: { needs: 'package', gives: ['name', 'car'] },
    storm: { needs: 'hideout', gives: ['done'] },
  },
  twists: { setup: { sort: 'meet', gives: ['place'] } },
  start: 'meet',
  choice: 'pick',
  end: 'storm',
  finalToken: 'hideout',
  endToken: 'done',
};
const SKELETON = [
  { act: 'start', kind: 'start' },
  { act: 'middle', kind: 'normal' },
  { act: 'middle', kind: 'normal' },
  { act: 'middle', kind: 'choose' },
  { act: 'middle', kind: 'normal' },
  { act: 'middle', kind: 'normal' },
  { act: 'turn', kind: 'twist' },
  { act: 'middle', kind: 'normal' },
  { act: 'end', kind: 'end' },
];
// A small random number maker, so that the tests do not need the game's.
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

test('the core makes a chain that hangs together for a game it knows nothing of', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const chain = planChain(seeded(seed), SKELETON, CITY);
    assert.ok(chain, `seed ${seed}`);
    assert.deepEqual(checkChain(chain, CITY), [], `seed ${seed}`);
    assert.equal(pathsOf(chain).length, 2);
    assert.equal(chain[6].twist, 'setup');
  }
});

test('a handwritten quest goes through the same checks, and keeps what the author wrote', () => {
  const quest = writtenChain([
    { sort: 'meet', needs: null, gives: 'car', text: 'Vinnie wants a car. Any car. Fast.' },
    { sort: 'steal', needs: 'car', gives: 'package', text: 'There is something in the trunk.' },
    {
      branches: [
        { sort: 'drop', needs: 'package', gives: 'place' },
        { sort: 'chase', needs: 'place', gives: 'hideout' },
      ],
    },
  ]);
  assert.equal(quest[0].text, 'Vinnie wants a car. Any car. Fast.');
  const problems = checkChain(quest, CITY);
  assert.ok(problems.includes('the last step gives place, not done'));
  assert.ok(problems.some((p) => p.startsWith('step 3 needs place')));
  const fixed = writtenChain([
    { sort: 'meet', needs: null, gives: 'car' },
    { sort: 'steal', needs: 'car', gives: 'place' },
    { sort: 'chase', needs: 'place', gives: 'hideout' },
    { sort: 'storm', needs: 'hideout', gives: 'done' },
  ]);
  assert.deepEqual(checkChain(fixed, CITY), []);
});

test('the same sort twice in a row is found, and a text is filled from its values', () => {
  const twice = writtenChain([
    { sort: 'meet', needs: null, gives: 'name' },
    { sort: 'meet', needs: 'name', gives: 'place' },
    { sort: 'chase', needs: 'place', gives: 'hideout' },
    { sort: 'storm', needs: 'hideout', gives: 'done' },
  ]);
  assert.deepEqual(checkChain(twice, CITY), ['steps 1 and 2 are both meet']);
  assert.equal(fill('Meet {who} at {where}.', { who: 'VINNIE' }), 'Meet VINNIE at {where}.');
});
