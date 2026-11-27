// Touch controls (F-090, P1-P7): what is on the screen in each mode, how a finger becomes a stick, a button or a
// tap, and what the sticks do for each post. How it feels is tried on an iPad; the browser test drives it with
// fingers made up by the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { touchLayout, buttonAt, stickValue, STICK_SIZE } from '../src/touch.js';
import { createState } from '../src/sim/state.js';
import { createView, playerInput } from '../src/screens.js';
import { oldShip } from './helpers.js';

const B = { aim: 'B', size: 'M', big: false };

test('R-1282: the Captain flies on the left stick, with boost and docking, and fires on the right while the Gunner is away', () => {
  const free = touchLayout('captain', { gunnerFree: true }, B);
  assert.equal(free.left, true);
  assert.equal(free.right, true);
  const codes = free.buttons.map((b) => b.code);
  assert.ok(codes.includes('ShiftLeft') && codes.includes('KeyQ'));
  assert.ok(free.buttons.find((b) => b.code === 'ShiftLeft').hold, 'boost is held');
  assert.equal(touchLayout('captain', { gunnerFree: false }, B).right, false, 'the Gunner has the guns');
});

test('R-1281: the Gunner aims with the right stick by default, and on space or a tapped target when chosen', () => {
  assert.equal(touchLayout('gunner', {}, B).right, true);
  assert.equal(touchLayout('gunner', {}, B).left, false, 'the left thumb has the buttons');
  const drag = touchLayout('gunner', {}, { ...B, aim: 'A' });
  assert.deepEqual([drag.right, drag.aim], [false, 'drag']);
  const lock = touchLayout('gunner', {}, { ...B, aim: 'C' });
  assert.deepEqual([lock.right, lock.aim], [false, 'lock']);
});

test('R-1283: boarding on two sticks, with the buttons in rows down the edges', () => {
  const l = touchLayout('away', {}, B);
  assert.equal(l.left && l.right, true);
  const codes = l.buttons.map((b) => b.code);
  for (const c of ['KeyF', 'KeyQ', 'KeyG', 'KeyR', 'KeyX', 'ShiftLeft', 'KeyT', 'KeyC'])
    assert.ok(codes.includes(c), c);
  // The panels have a button that closes them, and are otherwise tapped.
  for (const mode of ['map', 'shop', 'lock', 'mainframe']) {
    const p = touchLayout(mode, {}, B);
    assert.equal(p.left || p.right, false);
    assert.equal(p.buttons.length, 1);
  }
});

test('R-1280: buttons do not lie on each other, and bigger hit areas take a tap further out', () => {
  for (const mode of ['captain', 'gunner', 'engineer', 'away'])
    for (const on of [{ gunnerFree: true }, { engOpen: true }]) {
      const bs = touchLayout(mode, on, B).buttons;
      for (const a of bs) for (const b of bs) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 8);
    }
  const l = touchLayout('away', {}, B);
  const b = l.buttons.find((x) => x.code === 'KeyG');
  assert.equal(buttonAt(l, b.x + b.r * 1.4, b.y, false), null);
  assert.equal(buttonAt(l, b.x + b.r * 1.4, b.y, true), b);
});

test('R-1280: a stick is pushed from where the thumb came down, no more than all the way, and drags its middle along', () => {
  const R = STICK_SIZE.M;
  const s = { ox: 100, oy: 100, x: 100 + R / 2, y: 100 };
  assert.deepEqual(stickValue(s, R), { x: 0.5, y: 0 });
  s.x = 100 + R * 3;
  assert.deepEqual(stickValue(s, R), { x: 1, y: 0 });
  assert.equal(s.ox, 100 + R * 2, 'the middle follows the thumb');
  s.x = s.ox - R / 2;
  assert.deepEqual(stickValue(s, R), { x: -0.5, y: 0 }, 'and turning back answers at once');
});

// The keys of a player on a touch screen with sticks held as given.
function game(post, sticks) {
  const state = createState(1);
  oldShip(state);
  state.players[0].post = post;
  const keys = {
    touch: true,
    sticks: { lx: 0, ly: 0, rx: 0, ry: 0, left: null, right: null, fire: false, ...sticks },
    mouse: { x: 320, y: 180, down: false, clicked: false, rightClicked: false, wheel: 0 },
    pad: { used: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0 },
    down: () => false,
    hit: () => false,
  };
  const view = createView(keys);
  view.started = true;
  return { state, view, keys, assets: { font: { width: (t) => t.length * 5 } } };
}

test('R-1282 R-1283: the left stick up gives throttle and to the side turns, and the right stick fires where it points', () => {
  const g = game('captain', { left: 1, ly: -1, lx: 0.5, right: 2, rx: 1, ry: 0, fire: true });
  const out = playerInput(g);
  assert.ok(out.captain.throttle > 0.9);
  assert.equal(out.captain.turn, 0.5);
  assert.equal(out.gunner.fire, true, 'the Captain fires while the Gunner is away');
  assert.ok(out.gunner.aim.x > g.state.ship.x + 100, 'to the right');
  const gun = playerInput(game('gunner', { right: 2, rx: 0, ry: 1, fire: true }));
  assert.equal(gun.gunner.fire, true);
  assert.ok(gun.gunner.aim.y > 100, 'down');
});
