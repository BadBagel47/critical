// What the makers of floor plans share: the size of a tile, a grid that is easy to write to, and how far it is
// to walk from one tile to the others. See layout.js for what a finished plan holds.
import { rand } from './util.js';

export const TILE = 16;
export const WALKABLE = new Set(['.', ',', 'A']);
export const AROUND = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const pickInt = (state, lo, hi) => lo + Math.floor(rand(state) * (hi - lo + 1));
export const pickOf = (state, list) => list[Math.floor(rand(state) * list.length)];
export const px = (tiles) => tiles * TILE;

// A grid that is easy to write to while a plan is made.
export function makeGrid(w, h) {
  const cells = new Array(w * h).fill(' ');
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  return {
    w,
    h,
    cells,
    get: (x, y) => (inside(x, y) ? cells[y * w + x] : ' '),
    set(x, y, c) {
      if (inside(x, y)) cells[y * w + x] = c;
    },
  };
}

// How many steps it is to every tile that can be walked to from the start. Locked doors and the doors of an
// airlock count as open. `jumps` are the ways between floors, from one tile to another, see base.js.
export function stepsFrom(grid, sx, sy, jumps = null) {
  const steps = new Map([[sy * grid.w + sx, 0]]);
  const todo = [[sx, sy]];
  const reach = (x, y, n) => {
    const c = grid.get(x, y);
    const key = y * grid.w + x;
    if (steps.has(key) || !(WALKABLE.has(c) || c === 'L' || c === 'D')) return;
    steps.set(key, n);
    todo.push([x, y]);
  };
  for (let i = 0; i < todo.length; i++) {
    const [x, y] = todo[i];
    const key = y * grid.w + x;
    const n = steps.get(key);
    for (const [dx, dy] of AROUND) reach(x + dx, y + dy, n + 1);
    const to = jumps ? jumps[key] : undefined;
    if (to !== undefined) reach(to % grid.w, Math.floor(to / grid.w), n + 1);
  }
  return steps;
}

// A tile in the middle of a room that is sure to be floor, in pixels. `shift` is how far the tiles are drawn
// in from the edge of the grid.
export function midOf(tiles, shift = 0) {
  const [x, y] = tiles[Math.floor(tiles.length / 2)];
  return { x: px(x + shift) + TILE / 2, y: px(y) + TILE / 2 };
}

// The walls round a set of floor tiles.
export function boxOf(tiles) {
  const xs = tiles.map((t) => t[0]);
  const ys = tiles.map((t) => t[1]);
  return { c0: Math.min(...xs) - 1, c1: Math.max(...xs) + 1, r0: Math.min(...ys) - 1, r1: Math.max(...ys) + 1 };
}
