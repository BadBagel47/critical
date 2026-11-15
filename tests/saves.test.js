// Saved games: what is kept, what is refused, and that a save made by this version can be read by it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createState } from '../src/sim/state.js';
import {
  SAVE_VERSION,
  AUTO,
  packSave,
  parseSave,
  writeSlot,
  readSlot,
  listSaves,
  latestSlot,
  clearRun,
  describeSave,
} from '../src/saves.js';
import { startTour, runTour } from './tour.js';

// Stands in for the browser's storage.
function fakeStorage(limit = Infinity) {
  const items = new Map();
  return {
    items,
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem(k, v) {
      if (v.length > limit) throw new Error('out of room');
      items.set(k, v);
    },
    removeItem: (k) => items.delete(k),
  };
}

test('a saved game comes back exactly as it was, and plays on the same way', () => {
  const storage = fakeStorage();
  const tour = startTour(3);
  runTour(tour, 40);
  assert.equal(writeSlot(storage, '1', tour.state, 1000), true);
  const loaded = readSlot(storage, '1');
  assert.deepEqual(loaded.state, { ...tour.state, events: [] });
  const copy = { state: loaded.state, i: tour.i };
  assert.deepEqual(runTour(copy, 70), runTour(tour, 70));
  assert.equal(JSON.stringify(copy.state), JSON.stringify(tour.state));
});

test('the list of saves says where, how long and how rich, and which one is the latest', () => {
  const storage = fakeStorage();
  const s = createState(1);
  s.credits = 250;
  s.time = 90.4;
  writeSlot(storage, '2', s, 5000);
  writeSlot(storage, AUTO, s, 9000);
  writeSlot(storage, '4', s, 7000);
  const list = listSaves(storage);
  assert.equal(list['1'], null);
  assert.equal(latestSlot(list), AUTO);
  assert.equal(latestSlot(listSaves(fakeStorage())), null);
  assert.equal(describeSave(list['2']).left, 'KESTREL DRIFT  ·  1:30  ·  250 CR');
  const hard = createState(2, { hardcore: true, test: true });
  assert.match(describeSave(packSave(hard, 0)).left, /HARDCORE {2}· {2}TEST$/);
});

test('text that is not a save, or a save from another version, is refused with a reason', () => {
  assert.equal(parseSave('hello').error, 'THAT IS NOT A SAVE FILE');
  assert.equal(parseSave('{"game":"something else"}').error, 'THAT IS NOT A SAVE FILE');
  assert.equal(
    parseSave(JSON.stringify({ game: 'critical-st8', version: SAVE_VERSION, state: {} })).error,
    'THAT IS NOT A SAVE FILE',
  );
  const old = { ...packSave(createState(1), 0), version: SAVE_VERSION - 1 };
  assert.equal(parseSave(JSON.stringify(old)).error, 'THAT SAVE IS FROM ANOTHER VERSION OF THE GAME');
  assert.ok(parseSave(JSON.stringify(packSave(createState(1), 0))).save);
});

test('saving fails quietly when the browser has no room or does not allow it', () => {
  assert.equal(writeSlot(fakeStorage(10), '1', createState(1), 0), false);
  assert.equal(writeSlot(null, '1', createState(1), 0), false);
  assert.equal(readSlot(null, '1'), null);
  assert.equal(writeSlot(fakeStorage(), 'nine', createState(1), 0), false, 'only the known slots can be written');
});

test('a hardcore run that ends takes its own saves with it and leaves the others', () => {
  const storage = fakeStorage();
  const run = createState(41, { hardcore: true });
  assert.equal(run.hardcore, true);
  assert.equal(createState(1).hardcore, false);
  writeSlot(storage, AUTO, run, 1);
  writeSlot(storage, '1', createState(41), 2);
  writeSlot(storage, '2', createState(42, { hardcore: true }), 3);
  clearRun(storage, run.seed);
  assert.equal(readSlot(storage, AUTO), null);
  assert.ok(readSlot(storage, '1'), 'an ordinary game with the same seed is kept');
  assert.ok(readSlot(storage, '2'), 'another hardcore run is kept');
});

// Which fields the game state holds, without their values. Lists are described by all their entries together.
function shapeOf(value) {
  if (Array.isArray(value)) {
    const entries = value.map(shapeOf);
    const objects = entries.filter((e) => e && typeof e === 'object');
    const merged = objects.length ? Object.assign({}, ...objects) : [...new Set(entries)].sort().join('|');
    return { list: typeof merged === 'string' ? merged : sortKeys(merged) };
  }
  if (value && typeof value === 'object')
    return sortKeys(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shapeOf(v)])));
  return value === null ? 'empty' : typeof value;
}
const sortKeys = (o) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );

test('the save version is raised whenever the game state changes shape', () => {
  const tour = startTour(3, true);
  runTour(tour, 100);
  const print = createHash('sha1')
    .update(JSON.stringify(shapeOf(tour.state)))
    .digest('hex')
    .slice(0, 12);
  // When this fails the game state has new, renamed or removed fields, and saves made before the change
  // would no longer load correctly. Raise SAVE_VERSION in src/saves.js and put the new values here.
  assert.deepEqual({ version: SAVE_VERSION, print }, { version: 15, print: 'e432fef2bac6' });
});
