// The ship's computer on free posts (F-034, D-186): which posts it may run, and what it does on each.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { stepPlayers } from '../src/sim/step.js';
import { makeVessel, firstWaveDelay } from '../src/sim/vessels.js';
import { computerRuns, computerPosts } from '../src/sim/computer.js';
import { addPlayer } from '../src/sim/players.js';
import { dist } from '../src/sim/util.js';
import { B } from '../src/sim/balance.js';
import { FACTIONS } from '../src/sim/sides.js';
import { oldShip } from './helpers.js';

const DT = 1 / 60;
const run = (s, inputs, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++)
    stepPlayers(s, typeof inputs === 'function' ? inputs() : inputs, DT);
  return s;
};
function game(allowed = { captain: true, gunner: true, engineer: true }) {
  const s = createState(1, { computer: allowed });
  oldShip(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  s.vessels = [];
  s.ship.docked = null;
  return s;
}
// A player on the post switches the computer on with K, and then goes to another post.
function switchOn(s, post, then = 'captain') {
  run(s, { 0: { take: post } }, DT);
  run(s, { 0: { auto: true } }, DT);
  run(s, { 0: { take: then } }, DT);
}
const pirate = (s, x, y, kind = 'fighter') => {
  const v = makeVessel(s, kind, s.ship.x + x, s.ship.y + y);
  s.vessels.push(v);
  return v;
};

test('R-816 R-1112: by default the computer may run no post, and K does nothing', () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  run(s, { 0: { auto: true } }, DT);
  assert.equal(s.computer.on.captain, false);
  assert.equal(computerPosts(s), 0);
});

test('R-1257: switched on once, the computer runs the post whenever no one sits there, and lets go at once', () => {
  const s = game({ gunner: true });
  switchOn(s, 'gunner', 'captain');
  assert.equal(computerRuns(s, 'gunner'), true);
  run(s, { 0: { take: 'gunner' } }, DT);
  assert.equal(computerRuns(s, 'gunner'), false, 'the player has the post');
  assert.equal(s.computer.on.gunner, true, 'and it is still on for when the player leaves');
  run(s, { 0: { take: 'engineer' } }, DT);
  assert.equal(computerRuns(s, 'gunner'), true);
  // A post it may not run is not taken, even with K.
  run(s, { 0: { auto: true } }, DT);
  assert.equal(s.computer.on.engineer, false);
});

test('R-828 R-826: the computer as Gunner fires at a near enemy after half a second, and not with rockets', () => {
  const s = game({ gunner: true });
  switchOn(s, 'gunner', 'captain');
  s.ship.weapon = 'rockets';
  pirate(s, 0, -300);
  run(s, {}, B.COMPUTER_DELAY * 0.6);
  assert.equal(s.bolts.length, 0, 'not at once');
  run(s, {}, 1);
  assert.ok(s.bolts.length > 0, 'and then it fires');
  assert.equal(s.ship.weapon, 'pulse');
});

test('R-828: the computer as Gunner does not fire at ships that are not enemies, nor with nothing near', () => {
  const s = game({ gunner: true });
  switchOn(s, 'gunner', 'captain');
  run(s, {}, 2);
  assert.equal(s.bolts.length, 0);
  pirate(s, 0, -300, 'fighter').side = Object.keys(FACTIONS)[0];
  run(s, {}, 2);
  assert.equal(s.bolts.length, 0);
});

test('R-1256: with the computer on the Gunner post, the Captain still fires when clicking', () => {
  const s = game({ gunner: true });
  switchOn(s, 'gunner', 'captain');
  run(s, { 0: { gunner: { aim: { x: s.ship.x, y: s.ship.y - 900 }, fire: true } } }, 1);
  assert.ok(s.bolts.length > 0);
});

test('R-829: the computer as Engineer repairs, and moves power to the shield while the ship is hit', () => {
  const s = game({ engineer: true });
  switchOn(s, 'engineer', 'captain');
  s.ship.nodes[2].hp = 50;
  run(s, {}, 1);
  assert.ok(s.ship.crew.queue.includes(2) || s.ship.crew.moving || s.ship.nodes[2].hp > 50, 'it sends the crew');
  const before = s.ship.power.shields;
  // The ship is hit: the shield goes down, step by step.
  run(
    s,
    () => {
      s.ship.shield = Math.max(0, s.ship.shield - 0.5);
      return {};
    },
    2,
  );
  assert.ok(s.ship.power.shields > before, 'more power to the shield');
  // Quiet again: the power goes back.
  run(s, {}, B.COMPUTER_HURT_TIME * 4);
  assert.equal(s.ship.power.shields, before);
});

test('R-1258: the computer as Captain circles an enemy, neither lying still nor flying off', () => {
  const s = game({ captain: true });
  switchOn(s, 'captain', 'gunner');
  const v = pirate(s, 0, -300, 'gunboat');
  // Keep the enemy where it is, so that only the ship moves.
  const at = { x: v.x, y: v.y };
  let far = 0;
  let near = Infinity;
  let moved = 0;
  let last = { x: s.ship.x, y: s.ship.y };
  for (let t = 0; t < 20; t += 0.5) {
    run(s, {}, 0.5);
    Object.assign(v, at, { vx: 0, vy: 0, hp: v.hpMax });
    const d = dist(s.ship.x, s.ship.y, at.x, at.y);
    far = Math.max(far, d);
    near = Math.min(near, d);
    moved += dist(s.ship.x, s.ship.y, last.x, last.y);
    last = { x: s.ship.x, y: s.ship.y };
  }
  assert.ok(far < B.COMPUTER_FIGHT_RANGE, `it stays near: at most ${Math.round(far)}`);
  assert.ok(near > 60, `and does not ram it: at least ${Math.round(near)}`);
  assert.ok(moved > 400, `and keeps moving: ${Math.round(moved)}`);
});

test('R-827: out of a fight the computer as Captain follows the course that was set, and does nothing docked', () => {
  const s = game({ captain: true });
  const k = { id: 'test-place', x: s.ship.x + 2000, y: s.ship.y, name: 'TEST' };
  s.known.push(k);
  run(s, { 0: { captain: { course: k.id } } }, DT);
  switchOn(s, 'captain', 'gunner');
  const start = dist(s.ship.x, s.ship.y, k.x, k.y);
  run(s, {}, 25);
  const left = dist(s.ship.x, s.ship.y, k.x, k.y);
  assert.ok(left < start - 600, `it flies towards the place: ${Math.round(start)} -> ${Math.round(left)}`);
  // Docked, it leaves the ship alone.
  s.ship.docked = s.things[0].id;
  const throttle = s.ship.throttle;
  run(s, {}, 1);
  assert.equal(s.ship.throttle, throttle);
});

test('R-1259: each post the computer runs makes the pirates come a little more often, but less than a player', () => {
  const alone = game({});
  const helped = game({ gunner: true, engineer: true });
  switchOn(helped, 'gunner', 'captain');
  switchOn(helped, 'engineer', 'captain');
  const two = game({});
  addPlayer(two, 'BO');
  assert.ok(firstWaveDelay(helped) < firstWaveDelay(alone));
  assert.ok(firstWaveDelay(helped) > firstWaveDelay(two));
});
