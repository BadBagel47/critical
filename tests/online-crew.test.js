// The crew when playing online (D-266, D-267, D-268): a player whose connection is lost, and one who comes back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { tryBoard } from '../src/sim/boarding.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { addPlayer, dropPlayer, backPlayer, holderOf, takePost, postOf, crewOf, connectedPlayers } from '../src/sim/players.js';
import { rolesOf } from '../src/sim/purses.js';
import { packSave } from '../src/saves.js';
import { B } from '../src/sim/balance.js';
import { oldShip } from './helpers.js';

const DT = 1 / 20;
function crew() {
  const s = createState(1);
  oldShip(s);
  gatherForTesting(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  addPlayer(s, 'BO');
  addPlayer(s, 'CY');
  s.players[0].name = 'ADA';
  return s;
}

test('R-1241: the post of a player who loses the connection is free for the others at once', () => {
  const s = crew();
  const bo = s.players[1];
  assert.equal(bo.post, 'gunner');
  assert.ok(dropPlayer(s, bo.id));
  assert.equal(holderOf(s, 'gunner'), null);
  assert.ok(takePost(s, s.players[2], 'gunner'));
  assert.equal(holderOf(s, 'gunner').name, 'CY');
});

test('R-1242: a player who comes back keeps their own purse and gets a free post', () => {
  const s = crew();
  const bo = s.players[1];
  s.purses.gunner = 777;
  dropPlayer(s, bo.id);
  assert.deepEqual(rolesOf(s, bo.id), ['gunner']);
  assert.ok(backPlayer(s, bo.id));
  assert.equal(bo.post, 'gunner');
  assert.equal(s.purses.gunner, 777);
  // Taken meanwhile: another free post.
  dropPlayer(s, bo.id);
  takePost(s, s.players[2], 'gunner');
  backPlayer(s, bo.id);
  assert.equal(bo.post, 'engineer');
});

test('R-1243: a boarder who is still gone when the wait is over is sent home, and the post stays free', () => {
  const s = crew();
  const st = thingsOf(s, 'station').find((x) => !x.home && !x.sanctuary && x.side !== 'pirate');
  step(s, {}, DT);
  s.ship.docked = st.id;
  s.ship.vx = s.ship.vy = 0;
  st.lock = 'open';
  assert.ok(tryBoard(s, 0));
  const ada = s.players[0];
  assert.equal(ada.inside, st.id);
  dropPlayer(s, ada.id);
  for (let t = 0; t < B.AWAY_HOME - 1; t += DT) step(s, {}, DT);
  assert.equal(ada.inside, st.id, 'still inside before the wait is over');
  for (let t = 0; t < 2; t += DT) step(s, {}, DT);
  assert.equal(ada.inside, null);
  assert.equal(ada.post, null);
  assert.equal(st.interior.avatars.length, 0);
  backPlayer(s, ada.id);
  assert.equal(ada.post, 'captain');
});

test('R-1244: only the players who are there count for how hard the game is', () => {
  const s = crew();
  assert.equal(connectedPlayers(s).length, 3);
  dropPlayer(s, 1);
  dropPlayer(s, 2);
  assert.equal(connectedPlayers(s).length, 1);
});

test('R-1245 R-1246: a save says who held which post, and offers the same post to whoever comes back by name', () => {
  const s = crew();
  dropPlayer(s, 1);
  const save = packSave(s, 0);
  assert.deepEqual(save.summary.crew, { captain: 'ADA', gunner: 'BO', engineer: 'CY' });
  assert.deepEqual(crewOf(s), save.summary.crew);
  assert.equal(postOf(s, 'BO'), 'gunner');
  assert.equal(postOf(s, 'DAN'), null);
});
