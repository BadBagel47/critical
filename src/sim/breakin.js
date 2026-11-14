// The break-in game for wrecks: turn pipe tiles until power flows from the source to the lock.
import { B } from './balance.js';
import { rand } from './util.js';

export const GW = 7, GH = 4;
const N = 1, E = 2, S = 4, W = 8;
const BASE = { I: N | S, L: N | E, T: N | E | W, X: N | E | S | W, O: 0 };
const DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
const turn = (m) => ((m << 1) & 15) | (m >> 3);
export function mask(tile) { let m = BASE[tile.type]; for (let i = 0; i < tile.rot; i++) m = turn(m); return m; }

// Which tiles carry power, and whether it reaches the lock.
export function flow(bk) {
  const lit = new Set(), start = bk.source * GW;
  if (!(mask(bk.tiles[start]) & W)) return { lit, solved: false };
  const queue = [start]; lit.add(start);
  while (queue.length) {
    const i = queue.shift(), x = i % GW, y = Math.floor(i / GW), m = mask(bk.tiles[i]);
    for (const [bit, dx, dy, back] of DIRS) {
      const nx = x + dx, ny = y + dy, j = ny * GW + nx;
      if (!(m & bit) || nx < 0 || ny < 0 || nx >= GW || ny >= GH || lit.has(j)) continue;
      if (mask(bk.tiles[j]) & back) { lit.add(j); queue.push(j); }
    }
  }
  const end = bk.sink * GW + GW - 1;
  return { lit, solved: lit.has(end) && !!(mask(bk.tiles[end]) & E) };
}

export function createBreakin(state, wreck) {
  const source = Math.floor(rand(state) * GH), sink = Math.floor(rand(state) * GH);
  // A random path from the source on the left edge to the lock on the right edge.
  const path = [[0, source]], seen = new Set([source * GW]);
  const walk = () => {
    const [x, y] = path[path.length - 1];
    if (x === GW - 1 && y === sink) return true;
    const opts = [[1, 0], [1, 0], [0, 1], [0, -1], [-1, 0]].map((d) => ({ d, k: rand(state) })).sort((a, b) => a.k - b.k);
    for (const { d } of opts) {
      const nx = x + d[0], ny = y + d[1], key = ny * GW + nx;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || seen.has(key)) continue;
      seen.add(key); path.push([nx, ny]);
      if (walk()) return true;
      path.pop();
    }
    return false;
  };
  walk();
  const tiles = [];
  for (let i = 0; i < GW * GH; i++) {
    const r = rand(state);
    tiles.push({ type: r < 0.3 ? 'I' : r < 0.65 ? 'L' : r < 0.85 ? 'T' : 'O', rot: Math.floor(rand(state) * 4) });
  }
  const bitFor = (dx, dy) => (dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N);
  path.forEach(([x, y], i) => {
    const prev = path[i - 1], next = path[i + 1];
    const need = (prev ? bitFor(prev[0] - x, prev[1] - y) : W) | (next ? bitFor(next[0] - x, next[1] - y) : E);
    const type = need === (N | S) || need === (E | W) ? 'I' : 'L';
    let rot = 0; while (mask({ type, rot }) !== need) rot++;
    tiles[y * GW + x] = { type, rot };
  });
  const solution = tiles.map((t) => t.rot);
  for (const [x, y] of path) if (rand(state) < 0.75) tiles[y * GW + x].rot = (tiles[y * GW + x].rot + 1 + Math.floor(rand(state) * 3)) % 4;
  const bk = { tiles, solution, source, sink, time: B.BREAKIN_TIME[wreck.difficulty], total: B.BREAKIN_TIME[wreck.difficulty], started: false };
  if (flow(bk).solved) tiles[source * GW].rot = (tiles[source * GW].rot + 1) % 4;
  return bk;
}

// Returns 'solved', 'failed' or null.
export function stepBreakin(state, wreck, cmds, dt) {
  const bk = wreck.breakin;
  if (!bk || wreck.lock === 'open') return null;
  for (const byPlayer of Object.values((cmds && cmds.hack) || {})) for (const c of byPlayer) {
    if (c.wreck !== wreck.id) continue;
    const t = bk.tiles[c.y * GW + c.x];
    if (t) { t.rot = (t.rot + (c.dir < 0 ? 3 : 1)) % 4; state.events.push({ type: 'tileTurned' }); }
  }
  if (flow(bk).solved) { wreck.lock = 'open'; state.events.push({ type: 'lockOpen', wreck: wreck.id }); return 'solved'; }
  if (bk.started) { bk.time -= dt; if (bk.time <= 0) { state.events.push({ type: 'lockFailed', wreck: wreck.id }); return 'failed'; } }
  return null;
}
