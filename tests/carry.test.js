// Carrying aboard (F-192, F-292, F-293): picking up with the use key one thing at a time, putting it all down, the
// backpack that makes a load lighter, and running when nothing is carried.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { carrySlow, gearId } from '../src/sim/upgrades.js';
import { B } from '../src/sim/balance.js';
import { withWreck, oldShip } from './helpers.js';

const DT = 1 / 60;
function boarded() {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.sectors[s.sector].star = false;
  Object.assign(s.ship, { x: 0, y: 0, heading: 0, vx: 0, vy: 0, throttle: 0 });
  oldShip(withWreck(s));
  const w = thingsOf(s, 'wreck')[0];
  s.ship.docked = w.id;
  w.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = w.interior;
  it.guards = [];
  it.turrets = [];
  return { s, it, av: it.avatars[0] };
}
// A straight stretch of the first corridor, to walk along.
function hall(it) {
  const h = it.halls[0];
  return { x: ((h.c0 + h.c1 + 1) / 2) * 16 - 60, y: ((h.r0 + h.r1 + 1) / 2) * 16 };
}
function walked(s, av, away, seconds = 0.4) {
  const x0 = av.x;
  for (let i = 0; i < seconds / DT; i++) step(s, { away: { 0: { mx: 1, my: 0, ...away } } }, DT);
  return av.x - x0;
}

test('R-1270: loot is picked up with the use key, one thing at a time, and X puts it all down again', () => {
  const { s, it, av } = boarded();
  const [a, b] = it.loot;
  b.x = a.x + 4;
  b.y = a.y;
  Object.assign(av, { x: a.x, y: a.y });
  step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 0, 'walking over it picks up nothing');
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(av.carry.length, 1, 'one thing');
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(av.carry.length, 2, 'and the next');
  const left = it.loot.length;
  step(s, { away: { 0: { drop: true } } }, DT);
  assert.equal(av.carry.length, 0);
  assert.equal(it.loot.length, left + 2, 'on the floor again');
  step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 0, 'and not picked up again by standing there');
});

test('R-1268: the backpack makes a load lighter: all of it, half, and none', () => {
  const s = createState(1);
  assert.equal(carrySlow(s.ship, 'captain'), B.CARRY_SLOW);
  s.ship.mods[gearId('pack', 'captain')] = 1;
  assert.equal(carrySlow(s.ship, 'captain'), B.CARRY_SLOW / 2);
  assert.equal(carrySlow(s.ship, 'gunner'), B.CARRY_SLOW, "the Gunner's own backpack is still the first");
  s.ship.mods[gearId('pack', 'captain')] = 2;
  assert.equal(carrySlow(s.ship, 'captain'), 0);
});

test('R-1269: Shift runs when nothing is carried, and not with a load', () => {
  const { s, it, av } = boarded();
  const start = hall(it);
  Object.assign(av, start);
  const walk = walked(s, av, {});
  Object.assign(av, start);
  const run = walked(s, av, { sprint: true });
  assert.ok(run > walk * 1.4, `running is faster: ${run.toFixed(1)} against ${walk.toFixed(1)}`);
  av.carry.push({ type: 'crate', value: 10 });
  Object.assign(av, start);
  const laden = walked(s, av, { sprint: true });
  assert.ok(laden < walk, 'with a load it is no faster than walking with one');
});
