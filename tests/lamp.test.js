// The boarder's lamp (F): it is switched on and off in every place, also by a visitor on a trading station whose
// power has gone out, where the screen says F LAMP OFF (found 2026-11-28).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { tryBoard } from '../src/sim/boarding.js';
import { isTrading } from '../src/sim/stations.js';
import { cutPower } from '../src/sim/pressure.js';

const DT = 1 / 60;

test('a visitor on a trading station lights the lamp with F when the power has gone out', () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  const st = thingsOf(s, 'station').find((t) => isTrading(t));
  assert.ok(st, 'a station that trades');
  Object.assign(s.ship, { docked: st.id, vx: 0, vy: 0, throttle: 0 });
  tryBoard(s, 0);
  const it = st.interior;
  assert.ok(it && it.trade, 'aboard as a visitor');
  const av = it.avatars[0];
  cutPower(s, st, false);
  assert.equal(it.dark, true);
  assert.equal(av.lamp, false);
  step(s, { away: { 0: { lampPressed: true } } }, DT);
  assert.equal(av.lamp, true);
  step(s, { away: { 0: { lampPressed: true } } }, DT);
  assert.equal(av.lamp, false);
});
