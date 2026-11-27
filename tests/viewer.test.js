// The second screen (F-137): what it shows by itself, and what a post sends there. How it looks is seen in a
// browser; it never changes the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { autoView, FIGHT_NEAR } from '../src/viewer.js';
import { sentView } from '../src/screens.js';
import { makeVessel } from '../src/sim/vessels.js';
import { PIRATE } from '../src/sim/sides.js';
import { withWreck, oldShip } from './helpers.js';
import { thingsOf } from '../src/sim/things.js';
import { step } from '../src/sim/step.js';

test('R-1284: the second screen shows the star map on the way, the fight when enemies are near, and the boarders aboard', () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.vessels = [];
  assert.deepEqual(autoView(s), { what: 'stars' });
  const v = makeVessel(s, 'fighter', s.ship.x + FIGHT_NEAR / 2, s.ship.y);
  v.side = PIRATE;
  s.vessels.push(v);
  assert.deepEqual(autoView(s), { what: 'fight' });
  v.x = s.ship.x + FIGHT_NEAR * 3;
  assert.deepEqual(autoView(s), { what: 'stars' }, 'one far off is no fight');
  // Aboard a wreck: the boarder's view, before anything else.
  oldShip(withWreck(s));
  const w = thingsOf(s, 'wreck')[0];
  s.ship.docked = w.id;
  w.lock = 'open';
  step(s, { system: { board: [0] } }, 1 / 60);
  v.x = s.ship.x + 10;
  assert.deepEqual(autoView(s), { what: 'boarding', playerId: 0 });
});

test("R-1285: every post sends its own view: space, the Engineer's systems, a map, or the boarders", () => {
  const g = (engOpen, inside = null) => ({ view: { engOpen }, me: { inside } });
  assert.equal(sentView(g(false), 'captain'), 'space');
  assert.equal(sentView(g(false), 'gunner'), 'space');
  assert.equal(sentView(g(true), 'engineer'), 'engineer');
  assert.equal(sentView(g(false), 'engineer'), 'space');
  assert.equal(sentView(g(false), 'map'), 'map');
  assert.equal(sentView(g(false), 'stars'), 'stars');
  assert.equal(sentView(g(false, 7), 'away'), 'boarding');
});
