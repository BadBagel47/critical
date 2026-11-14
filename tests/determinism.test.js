// The game has to be predictable: the same start and the same commands must always give exactly the same game.
// Online play depends on it, and so does saving. Every new feature has to keep these tests passing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { startTour, runTour } from './tour.js';

const LENGTH = 170;

test('the tour touches most of the game', () => {
  const seen = new Set();
  for (const [seed, testMode] of [
    [3, false],
    [5, true],
  ]) {
    const tour = startTour(seed, testMode);
    for (const type of runTour(tour, LENGTH)) seen.add(type);
  }
  const expected = [
    'shot',
    'pirateShot',
    'kill',
    'wave',
    'repaired',
    'pulse',
    'probe',
    'buoy',
    'found',
    'breakinOpened',
    'lockOpen',
    'boarded',
    'rifle',
    'grenade',
    'returned',
    'undock',
    'bought',
    'refuelled',
    'deskUsed',
    'jumpCharging',
    'jumped',
    'postChanged',
    'postTaken',
    'heavyShot',
    'rocket',
    'dartOut',
  ];
  for (const type of expected) assert.ok(seen.has(type), `the tour should cause "${type}"`);
});

test('the same seed and the same commands give exactly the same game', () => {
  for (const [seed, testMode] of [
    [3, false],
    [5, true],
  ]) {
    const a = startTour(seed, testMode);
    const b = startTour(seed, testMode);
    assert.deepEqual(runTour(a, LENGTH), runTour(b, LENGTH), 'the same things happen in the same order');
    assert.deepEqual(a.state, b.state);
  }
});

test('a game saved as text and read back continues exactly as it would have', () => {
  for (const [seed, testMode] of [
    [3, false],
    [5, true],
  ]) {
    for (const savedAt of [20, 45, 90, 126]) {
      const original = startTour(seed, testMode);
      runTour(original, savedAt);
      const copy = { state: JSON.parse(JSON.stringify(original.state)), i: original.i };
      assert.deepEqual(runTour(copy, LENGTH), runTour(original, LENGTH), `saved at ${savedAt} s`);
      assert.equal(JSON.stringify(copy.state), JSON.stringify(original.state), `saved at ${savedAt} s`);
    }
  }
});

test('the game logic never reads the clock, the screen or its own random numbers', () => {
  const dir = new URL('../src/sim/', import.meta.url);
  const banned = /Math\.random|Date\.|performance\.|\bwindow\b|\bdocument\b|setTimeout|setInterval/;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n');
    lines.forEach((line, n) => {
      const code = line.replace(/\/\/.*$/, '');
      assert.ok(!banned.test(code), `src/sim/${file}:${n + 1} uses something unpredictable: ${line.trim()}`);
    });
  }
});
