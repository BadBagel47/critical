// The crew: who holds which post, and who may do what.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { stepPlayers } from '../src/sim/step.js';
import { addPlayer, removePlayer, playerById, holderOf } from '../src/sim/players.js';
import { thingsOf } from '../src/sim/things.js';
import { speedOf } from '../src/sim/ship.js';

const DT = 1 / 60;
const run = (s, inputs, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++)
    stepPlayers(s, typeof inputs === 'function' ? inputs(s) : inputs, DT);
  return s;
};
const quiet = (s) => {
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  return s;
};
const crewOf = (n) => {
  const s = quiet(createState(1));
  for (let i = 1; i < n; i++) addPlayer(s);
  return s;
};
const types = (s) => s.events.map((e) => e.type);
// Dock at the first wreck with its lock already open, so that a player can board at once.
const dockAtOpenWreck = (s) => {
  const wreck = thingsOf(s, 'wreck')[0];
  wreck.lock = 'open';
  s.ship.docked = wreck.id;
  return wreck;
};

test('a solo player starts as Captain, and a post that is left keeps running', () => {
  const s = quiet(createState(1));
  assert.equal(s.players[0].post, 'captain');
  run(s, { 0: { captain: { throttle: 1 } } }, 2);
  const throttle = s.ship.throttle;
  run(s, { 0: { take: 'gunner' } }, DT);
  assert.equal(s.players[0].post, 'gunner');
  run(s, { 0: { gunner: { aim: { x: 0, y: -900 }, fire: true } } }, 1);
  assert.equal(s.ship.throttle, throttle, 'the throttle stays where the Captain left it');
  assert.ok(speedOf(s.ship) > 20, 'the ship keeps flying');
  assert.ok(s.bolts.length > 0, 'and the same player now fires the guns');
});

test('only the player who holds a post can work it', () => {
  const s = crewOf(2);
  assert.deepEqual(
    s.players.map((p) => p.post),
    ['captain', 'gunner'],
  );
  run(s, { 1: { captain: { throttle: 1 } } }, 1);
  assert.equal(s.ship.throttle, 0, 'the Gunner cannot fly the ship');
  run(s, { 0: { gunner: { fire: true } } }, 1);
  assert.equal(s.bolts.length, 0, 'the Captain cannot fire the guns');
  run(s, { 0: { captain: { throttle: 1 } }, 1: { gunner: { aim: { x: 0, y: -900 }, fire: true } } }, 1);
  assert.ok(s.ship.throttle > 0.5 && s.bolts.length > 0, 'both work their own posts in the same step');
});

test('a crew of three works all posts at once, and nobody else can join', () => {
  const s = crewOf(3);
  assert.equal(addPlayer(s), null, 'the ship is full');
  s.ship.nodes[4].hp = 40;
  run(
    s,
    {
      0: { captain: { throttle: 1 } },
      1: { gunner: { aim: { x: 0, y: -900 }, fire: true } },
      2: { engineer: { power: [], repair: { node: 4 } } },
    },
    3,
  );
  assert.ok(s.ship.throttle > 0.5 && s.bolts.length > 0);
  assert.ok(s.ship.nodes[4].hp > 40, 'the Engineer repairs while the others fly and shoot');
});

test("a held post cannot be taken, but two players who ask for each other's posts swap", () => {
  const s = crewOf(3);
  stepPlayers(s, { 1: { take: 'captain' } }, DT);
  assert.ok(types(s).includes('postTaken'));
  assert.equal(playerById(s, 1).post, 'gunner', 'the Gunner stays put');
  stepPlayers(s, { 0: { take: 'gunner' } }, DT);
  assert.equal(playerById(s, 0).post, 'gunner');
  assert.equal(playerById(s, 1).post, 'captain', 'they swapped');
  // A wish that is not answered is forgotten after a while.
  run(s, { 2: { take: 'captain' } }, DT);
  run(s, {}, 8);
  run(s, { 1: { take: 'engineer' } }, DT);
  assert.equal(playerById(s, 2).post, 'engineer', 'no swap after the wish has run out');
});

test('going inside leaves the post free, and coming back gives it back', () => {
  const s = crewOf(2);
  const wreck = dockAtOpenWreck(s);
  stepPlayers(s, { 1: { board: true } }, DT);
  const gunner = playerById(s, 1);
  assert.equal(gunner.inside, wreck.id);
  assert.equal(gunner.post, null);
  assert.equal(holderOf(s, 'gunner'), null, 'the post is free for someone else');
  run(s, { 1: { gunner: { fire: true } } }, 0.5);
  assert.equal(s.bolts.length, 0, 'a player who is inside cannot work a post');
  wreck.interior.guards = [];
  wreck.interior.turrets = [];
  stepPlayers(s, { 1: { away: { usePressed: true } } }, DT);
  assert.equal(gunner.inside, null);
  assert.equal(gunner.post, 'gunner', 'back at the old post');
});

test('a post taken while its holder was away stays taken, and the one who returns gets a free post', () => {
  const s = crewOf(2);
  const wreck = dockAtOpenWreck(s);
  stepPlayers(s, { 1: { board: true } }, DT);
  stepPlayers(s, { 0: { take: 'gunner' } }, DT);
  assert.equal(playerById(s, 0).post, 'gunner');
  wreck.interior.guards = [];
  wreck.interior.turrets = [];
  stepPlayers(s, { 1: { away: { usePressed: true } } }, DT);
  assert.equal(playerById(s, 1).inside, null);
  assert.equal(playerById(s, 1).post, 'captain', 'the first free post');
});

test('station desks only take orders from a player who is inside the station', () => {
  const s = crewOf(2);
  const station = thingsOf(s, 'station').find((st) => st.align === 'friendly');
  s.ship.docked = station.id;
  s.ship.fuel = 20;
  stepPlayers(s, { 1: { shop: [{ action: 'refuel' }] } }, DT);
  assert.equal(s.ship.fuel, 20, 'nothing is sold to someone still on the ship');
  stepPlayers(s, { 1: { board: true } }, DT);
  stepPlayers(s, { 1: { shop: [{ action: 'refuel' }] } }, DT);
  assert.ok(s.ship.fuel > 20, 'the player inside can buy');
});

test('any player can pause, and the pause names who did it', () => {
  const s = crewOf(3);
  stepPlayers(s, { 2: { pause: true } }, DT);
  assert.equal(s.paused, true);
  assert.equal(s.pausedBy, playerById(s, 2).name);
  const frozen = JSON.stringify(s);
  run(s, { 0: { captain: { throttle: 1 }, take: 'gunner' } }, 1);
  assert.equal(JSON.stringify(s), frozen, 'nothing moves and no posts change while paused');
  stepPlayers(s, { 0: { pause: true } }, DT);
  assert.equal(s.paused, false);
});

test('a player who leaves frees the post, and the last player cannot leave', () => {
  const s = crewOf(2);
  assert.equal(removePlayer(s, 1), true);
  assert.equal(holderOf(s, 'gunner'), null);
  assert.equal(removePlayer(s, 0), false);
  assert.equal(s.players.length, 1);
});
