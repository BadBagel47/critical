// The light drawn by the graphics card (R-1272, F-294, F-295): what in space gives light, and when the old light is
// used instead. How it looks is seen in a browser; the screen tests always draw with the old light.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { spaceLights } from '../src/render/space.js';
import { glLightOn, setLightStill } from '../src/render/gl-light.js';

test('R-1272 F-295: shots, explosions and the engines give light in space, and only what is near is counted', () => {
  const s = createState(1);
  Object.assign(s.ship, { x: 0, y: 0, heading: 0, throttle: 1, docked: null });
  s.bolts.push({ x: 30, y: 0, vx: 0, vy: 0, side: 'crew', dmg: 1, life: 1 });
  s.bolts.push({ x: 90000, y: 0, vx: 0, vy: 0, side: 'crew', dmg: 1, life: 1 });
  s.fx.push({ type: 'boom', x: 0, y: 40, size: 20, t: 0.2, dur: 1 });
  const near = (o, m) => Math.abs(o.x) < 500 + m && Math.abs(o.y) < 300 + m;
  const lights = spaceLights(s, { state: s, arms: null }, near);
  assert.ok(
    lights.some((l) => l.x === 30 && l.y === 0),
    'the shot near by',
  );
  assert.ok(!lights.some((l) => l.x === 90000), 'not the one far off');
  assert.ok(
    lights.some((l) => l.x === 0 && l.y === 40 && l.r === 60),
    'the explosion, three times its size',
  );
  assert.ok(
    lights.some((l) => l.rgb && l.y > 40),
    'the engine behind the ship',
  );
  for (const l of lights) assert.ok(l.power > 0.01 && l.r > 0 && /^\d+,\d+,\d+$/.test(l.rgb));
});

test('R-1272: the screen tests always draw with the old light, so that their pictures stay the same', () => {
  setLightStill(true);
  assert.equal(glLightOn(), false);
  setLightStill(false);
});
