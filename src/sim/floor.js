// The floor of a place that can be boarded: what is solid, who can stand where, and what can be seen from where.
import { TILE } from './layout.js';
import { clamp, dist } from './util.js';

export { TILE };
// Walls, the locked vault door, space outside the hull, rooms that are torn open to it, and the things that stand
// in the rooms (see furnish.js).
const SOLID = new Set(['#', 'L', ' ', 'X', 'K']);
export const tileAt = (it, tx, ty) => (tx < 0 || ty < 0 || tx >= it.w || ty >= it.h ? ' ' : it.tiles[ty * it.w + tx]);
export const solidTile = (it, tx, ty) => SOLID.has(tileAt(it, tx, ty));
// What a look or a shot cannot pass: what is solid, and a door that is shut. A shut door is no wall to walk
// into or to find a way round, since it opens for whoever comes up to it.
export function solidAt(it, x, y) {
  const tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  return solidTile(it, tx, ty) || (!!it.shut && it.shut.length > 0 && it.shut.includes(ty * it.w + tx));
}

export function blocked(it, x, y, r) {
  const x0 = Math.floor((x - r) / TILE),
    x1 = Math.floor((x + r) / TILE),
    y0 = Math.floor((y - r) / TILE),
    y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (!SOLID.has(tileAt(it, tx, ty))) continue;
      const nx = clamp(x, tx * TILE, tx * TILE + TILE),
        ny = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
    }
  return false;
}
export function move(it, e, dx, dy, r) {
  if (dx && !blocked(it, e.x + dx, e.y, r)) e.x += dx;
  if (dy && !blocked(it, e.x, e.y + dy, r)) e.y += dy;
}
export function los(it, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1),
    n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) if (solidAt(it, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

// How many steps it is from one tile to every other that can be walked to, and the way there. `cost` says
// what it costs to step onto a tile, as a whole number of at least 1, so that some ground can be avoided.
// Gives { steps, from }: for each tile the cost of getting there and the tile before it on the way.
export function waysFrom(it, tx, ty, cost = null) {
  const n = it.w * it.h;
  const steps = new Array(n).fill(Infinity);
  const from = new Array(n).fill(-1);
  const start = ty * it.w + tx;
  steps[start] = 0;
  const rounds = [[start]];
  for (let d = 0; d < rounds.length; d++) {
    const round = rounds[d];
    if (!round) continue;
    for (const i of round) {
      if (steps[i] !== d) continue;
      const x = i % it.w,
        y = (i - x) / it.w;
      for (const [dx, dy] of NEXT) {
        const nx = x + dx,
          ny = y + dy;
        if (solidTile(it, nx, ny)) continue;
        const j = ny * it.w + nx;
        const to = d + (cost ? cost(nx, ny) : 1);
        if (to >= steps[j]) continue;
        steps[j] = to;
        from[j] = i;
        if (!rounds[to]) rounds[to] = [];
        rounds[to].push(j);
      }
    }
  }
  return { steps, from };
}
const NEXT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export const middleOf = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
// The way to a tile as the middles of the tiles to walk through, from the result of waysFrom.
export function wayTo(it, ways, tx, ty) {
  const path = [];
  let i = ty * it.w + tx;
  if (ways.steps[i] === Infinity) return path;
  while (ways.from[i] !== -1) {
    const x = i % it.w;
    path.unshift(middleOf(x, (i - x) / it.w));
    i = ways.from[i];
  }
  return path;
}
