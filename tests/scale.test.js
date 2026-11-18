// How large the game's picture is drawn (B-282, src/render/scale.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickScale, speedWatch, MAX_SCALE } from '../src/render/scale.js';

test('R-1234: the picture is at most four times the game size, an even number, and at least two', () => {
  assert.equal(MAX_SCALE, 4);
  // A Mac with a retina screen, full window: about 4.7 screen pixels per game pixel, once six.
  assert.equal(pickScale(4.7), 4);
  assert.equal(pickScale(2.36), 4);
  assert.equal(pickScale(2), 2);
  assert.equal(pickScale(1.2), 2);
  assert.equal(pickScale(4.7, 2), 2, 'under a lower limit');
});

test('R-1234: slow frames make the picture a step smaller, fast ones leave it', () => {
  const fast = speedWatch();
  let changed = null;
  for (let i = 0; i < 600; i++) changed = fast.seen(1 / 60, 4) ?? changed;
  assert.equal(changed, null);
  const slow = speedWatch();
  for (let i = 0; i < 200 && changed === null; i++) changed = slow.seen(1 / 20, 4);
  assert.equal(changed, 2);
  assert.equal(slow.limit, 2);
  // At the smallest it stays, and a long pause such as a hidden tab does not count.
  for (let i = 0; i < 200; i++) assert.equal(slow.seen(1 / 20, 2), null);
  assert.equal(speedWatch().seen(3, 4), null);
});
