// How the floors of a standard base look (F-208): a style of their own each, as in the design test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckLook } from '../src/render/inside-base.js';

const warmth = ([r, , b]) => r - b;
const light = ([r, g, b]) => r + g + b;

test('R-267 R-268 R-269 R-270 R-288: each floor of a base has a style of its own', () => {
  const [basement, middle, top] = [0, 1, 2].map(deckLook);
  // The middle is light and clean, the basement dim and warm like dirty industry, the top cold like command.
  assert.ok(light(middle.ambient) > light(basement.ambient) * 1.5);
  assert.ok(light(middle.ambient) > light(top.ambient) * 1.5);
  assert.ok(warmth(basement.ambient) > 0 && warmth(basement.wall) > 0);
  assert.ok(warmth(top.ambient) < 0 && warmth(top.wall) < 0);
  // Each room gets a floor that suits what it is for, on its own floor.
  assert.equal(basement.kindOf('HOLD'), 'hold');
  assert.equal(basement.kindOf('REACTOR'), 'power');
  assert.equal(middle.kindOf('CONCOURSE'), 'concourse');
  assert.equal(middle.kindOf('BAR'), 'bar');
  assert.equal(middle.kindOf('SERVICES'), 'services');
  assert.equal(top.kindOf('COMMAND'), 'command');
  assert.equal(top.kindOf('SERVERS'), 'server');
  for (const look of [basement, middle, top]) assert.equal(look.kindOf('LIFT'), 'grate');
});
