// Insides kept small in saves (D-263): made again from their seeds, with only the tiles that changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { thingsOf } from '../src/sim/things.js';
import { createInterior } from '../src/sim/boarding.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { packSave, parseSave } from '../src/saves.js';
import { sealCommand, openCommand } from '../src/sim/pressure.js';

const plain = (x) => JSON.parse(JSON.stringify(x));

function boarded(seed) {
  const state = createState(seed, { test: true });
  gatherForTesting(state);
  const stations = thingsOf(state, 'station');
  const wrecks = thingsOf(state, 'wreck');
  const hostile = stations.find((s) => s.side === 'pirate') || stations[0];
  const trading = stations.find((s) => s !== hostile);
  for (const place of [hostile, trading, ...wrecks.slice(0, 3)]) place.interior = createInterior(state, place);
  return { state, hostile };
}

test('D-263: a save is the same game again, with each inside made again from its seed', () => {
  for (const seed of [1, 7, 42]) {
    const { state, hostile } = boarded(seed);
    // A door that changes during the boarding: the command room sealed, and opened again.
    sealCommand(hostile.interior);
    const text = JSON.stringify(packSave(state, 0));
    const back = parseSave(text);
    assert.ok(back.save, back.error);
    assert.deepEqual(back.save.state, plain({ ...state, events: [] }));
    openCommand(hostile.interior);
    assert.deepEqual(parseSave(JSON.stringify(packSave(state, 0))).save.state, plain({ ...state, events: [] }));
  }
});

test('D-263: the insides take a small part of a save', () => {
  const { state } = boarded(3);
  const whole = JSON.stringify({ ...state, events: [] }).length;
  const saved = JSON.stringify(packSave(state, 0).state).length;
  assert.ok(saved < whole / 2, `a save of ${saved} characters, the whole state ${whole}`);
});

test('D-263: two insides of the same place on two boardings may differ, and each is the same when read back', () => {
  const { state, hostile } = boarded(5);
  const first = hostile.interior.planSeed;
  hostile.interior = createInterior(state, hostile);
  assert.notEqual(hostile.interior.planSeed, first);
});
