import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step, setPower, powerUsed, powerAvailable, damageShip, wreckPort, dockCandidate, fireInterval, speedOf } from '../src/sim/step.js';
import { B, SHIP_GEOM } from '../src/sim/balance.js';
import { headingTo } from '../src/sim/util.js';

const DT = 1 / 60;
const run = (s, cmds, seconds) => { for (let i = 0; i < Math.round(seconds / DT); i++) step(s, typeof cmds === 'function' ? cmds(s) : cmds, DT); return s; };
const quiet = (s) => { s.spawn.timer = 1e9; return s; };

test('same seed and commands give the same world', () => {
  const a = run(createState(7), { captain: { throttle: 1, turn: 0.3 } }, 5);
  const b = run(createState(7), { captain: { throttle: 1, turn: 0.3 } }, 5);
  assert.deepEqual(a, b);
});

test('throttle persists when the captain post is left', () => {
  const s = quiet(createState(1));
  run(s, { captain: { throttle: 1 } }, 2);
  const t = s.ship.throttle;
  assert.ok(t > 0.9);
  run(s, { captain: null }, 3);
  assert.equal(s.ship.throttle, t);
  assert.ok(speedOf(s.ship) > 40, 'ship keeps flying');
  assert.ok(s.ship.y < -100, 'ship moved forward (up)');
});

test('more engine power means more speed', () => {
  const fast = quiet(createState(1)), slow = quiet(createState(1));
  setPower(slow, 'engines', -2);
  setPower(fast, 'repair', -2); setPower(fast, 'engines', 2);
  run(fast, { captain: { throttle: 1 } }, 6); run(slow, { captain: { throttle: 1 } }, 6);
  assert.ok(speedOf(fast.ship) > speedOf(slow.ship) * 2);
});

test('power cannot exceed what the reactor gives', () => {
  const s = quiet(createState(1));
  assert.equal(powerUsed(s.ship), B.POWER_TOTAL);
  assert.equal(setPower(s, 'weapons', 1), false, 'no free power');
  assert.equal(setPower(s, 'repair', -1), true);
  assert.equal(setPower(s, 'weapons', 1), true);
  s.ship.nodes.find((n) => n.id === 'reactor').hp = 10;
  run(s, {}, 0.1);
  assert.equal(powerUsed(s.ship), powerAvailable(s.ship));
  assert.equal(powerAvailable(s.ship), B.POWER_TOTAL - 2);
});

test('gunner shoots only with weapon power, and bolts kill a pirate', () => {
  const s = quiet(createState(1));
  s.pirates.push({ id: 99, kind: 'fighter', x: 0, y: -200, vx: 0, vy: 0, heading: 0, hp: B.FIGHTER_HP, mode: 'breakoff', timer: 1e9, burst: 0, burstTimer: 0, cool: 1e9, side: 1 });
  // Aim ahead of the target, the way a player has to.
  const aim = (st) => {
    const p = st.pirates[0];
    if (!p) return { gunner: { aim: { x: 0, y: -200 }, fire: true } };
    const t = Math.hypot(p.x - st.ship.x, p.y - st.ship.y) / (B.BOLT_SPEED - B.FIGHTER_ATTACK_SPEED);
    return { gunner: { aim: { x: p.x + p.vx * t, y: p.y + p.vy * t }, fire: true } };
  };
  s.ship.power.weapons = 0;
  run(s, aim, 0.5);
  assert.equal(s.bolts.length, 0);
  assert.equal(fireInterval(s.ship), Infinity);
  s.ship.power.weapons = 2;
  run(s, aim, 6);
  assert.equal(s.kills, 1);
});

test('shield absorbs first, then hull and a node take damage', () => {
  const s = quiet(createState(1));
  damageShip(s, 30);
  assert.equal(s.ship.shield, B.SHIELD_MAX - 30);
  assert.equal(s.ship.hull, B.HULL_MAX);
  damageShip(s, 100);
  assert.equal(s.ship.shield, 0);
  assert.equal(s.ship.hull, B.HULL_MAX - 30);
  assert.ok(s.ship.nodes.some((n) => n.hp < 100));
});

test('shield recharges after a pause, faster with more power', () => {
  const s = quiet(createState(1));
  damageShip(s, 60);
  run(s, {}, B.SHIELD_DELAY - 0.2);
  assert.equal(s.ship.shield, B.SHIELD_MAX - 60);
  run(s, {}, 3);
  assert.ok(s.ship.shield > B.SHIELD_MAX - 60);
});

test('repair crew walks to the node, repairs it, then takes the next in the queue', () => {
  const s = quiet(createState(1));
  s.ship.nodes[5].hp = 40; s.ship.nodes[0].hp = 80;
  step(s, { engineer: { repair: { node: 5, queue: false } } }, DT);
  step(s, { engineer: { repair: { node: 0, queue: true } } }, DT);
  assert.deepEqual(s.ship.crew.queue, [5, 0]);
  run(s, {}, 1);
  assert.ok(s.ship.crew.moving, 'crew is on the way');
  assert.equal(s.ship.nodes[5].hp, 40);
  run(s, {}, 30);
  assert.equal(s.ship.nodes[5].hp, 100);
  assert.equal(s.ship.nodes[0].hp, 100);
  assert.deepEqual(s.ship.crew.queue, []);
});

test('no repair power means no repairs', () => {
  const s = quiet(createState(1));
  s.ship.power.repair = 0; s.ship.nodes[2].hp = 50;
  step(s, { engineer: { repair: { node: 2, queue: false } } }, DT);
  run(s, {}, 10);
  assert.equal(s.ship.nodes[2].hp, 50);
});

test('docking needs the nose at the port and low speed', () => {
  const s = quiet(createState(1));
  const w = s.wrecks[0], port = wreckPort(w);
  // Put the ship so that its nose sits on the port, pointing at the wreck.
  const h = headingTo(w.x - port.x, w.y - port.y);
  s.ship.heading = h;
  s.ship.x = port.x + Math.sin(h) * SHIP_GEOM.nose.y; s.ship.y = port.y - Math.cos(h) * SHIP_GEOM.nose.y;
  s.ship.vx = 100;
  assert.equal(dockCandidate(s), null, 'too fast');
  s.ship.vx = 0;
  assert.equal(dockCandidate(s), w);
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, w.id);
  run(s, { captain: { throttle: 1 } }, 1);
  assert.equal(speedOf(s.ship), 0, 'a docked ship stays put');
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, null);
});

test('pause freezes the world for everyone', () => {
  const s = createState(1);
  run(s, { captain: { throttle: 1 } }, 1);
  step(s, { system: { pause: true, by: 'PLAYER 1' } }, DT);
  const snap = JSON.stringify(s);
  run(s, { captain: { throttle: 1 }, gunner: { aim: { x: 0, y: -100 }, fire: true } }, 2);
  assert.equal(JSON.stringify(s), snap);
  assert.equal(s.pausedBy, 'PLAYER 1');
  step(s, { system: { pause: true } }, DT);
  assert.equal(s.paused, false);
});

test('pirates arrive, attack and can destroy an idle ship', () => {
  const s = createState(3);
  run(s, {}, 240);
  assert.ok(s.spawn.wave >= 3);
  assert.ok(s.ship.hull < B.HULL_MAX, 'ship took damage');
});

test('the ship cannot fly through a wreck, and ramming hurts', () => {
  const s = quiet(createState(1));
  const w = s.wrecks[0];
  s.ship.x = w.x; s.ship.y = w.y + 400; s.ship.heading = 0; s.ship.vy = -150;
  s.ship.shield = 0; s.ship.power.shields = 0; s.ship.power.repair = 0;
  run(s, { captain: { throttle: 1 } }, 6);
  assert.ok(Math.hypot(s.ship.x - w.x, s.ship.y - w.y) > 40, 'the ship stays outside the wreck');
  assert.ok(s.ship.hull < B.HULL_MAX, 'ramming damages the hull');
});
