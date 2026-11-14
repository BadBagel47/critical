// The music follows what kind of moment the player is in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { makeVessel } from '../src/sim/vessels.js';
import { thingsOf } from '../src/sim/things.js';
import { damageShip } from '../src/sim/damage.js';
import { sceneOf } from '../src/scene.js';

const quiet = () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  return s;
};

test('the scene follows the title screen, calm space, a warning and a fight', () => {
  const s = quiet();
  assert.equal(sceneOf(s, 0, false), 'title');
  assert.equal(sceneOf(s, 0), 'space');
  s.vessels.push(makeVessel(s, 'fighter', 5000, 0));
  assert.equal(sceneOf(s, 0), 'space', 'a ship nobody knows about is no warning');
  s.ship.mods.alarm = 3;
  s.vessels[0].x = 1000;
  step(s, {}, 1 / 60);
  assert.equal(sceneOf(s, 0), 'warning', 'the enemy alarm warns of it');
  s.vessels[0].x = s.ship.x + 300;
  assert.equal(sceneOf(s, 0), 'combat');
  s.vessels = [];
  damageShip(s, 5);
  assert.equal(sceneOf(s, 0), 'combat', 'still a fight just after a hit');
  for (let i = 0; i < 600; i++) step(s, {}, 1 / 60);
  assert.equal(sceneOf(s, 0), 'space', 'and calm again a while later');
});

test('the scene follows stations, boarding and the loss of the ship', () => {
  const s = quiet();
  const station = thingsOf(s, 'station').find((st) => st.align === 'friendly');
  s.ship.docked = station.id;
  assert.equal(sceneOf(s, 0), 'station');
  step(s, { system: { board: [0] } }, 1 / 60);
  assert.equal(sceneOf(s, 0), 'station', 'walking around inside it');
  const t = quiet();
  const wreck = thingsOf(t, 'wreck')[0];
  wreck.lock = 'open';
  t.ship.docked = wreck.id;
  step(t, { system: { board: [0] } }, 1 / 60);
  assert.equal(sceneOf(t, 0), 'boarding');
  t.over = true;
  assert.equal(sceneOf(t, 0), 'lost');
});
