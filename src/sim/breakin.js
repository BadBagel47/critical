// Break-in games. Each kind of target has its own:
//   wreck   - 'pipes': turn pipe tiles until power flows from the source to the lock
//   station - 'code':  enter the code that the Engineer screen shows, before it changes
//   pod     - 'dial':  stop the needle inside the mark three times in a row
import { B } from './balance.js';
import { rand, randRange, angleDiff, TAU } from './util.js';

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

function createPipes(state) {
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
  const bk = { tiles, solution, source, sink };
  if (flow(bk).solved) tiles[source * GW].rot = (tiles[source * GW].rot + 1) % 4;
  return bk;
}

const newCode = (state) => Array.from({ length: B.CODE_LEN }, () => 1 + Math.floor(rand(state) * B.CODE_DIGITS));
const newMark = (state, bk) => { bk.mark = (bk.angle + Math.PI * randRange(state, 0.6, 1.4)) % TAU; };

// `bonus` stretches the time, for crews that bought a hacking kit.
export function createBreakin(state, target, bonus = 1) {
  const kind = target.kind === 'station' ? 'code' : target.kind === 'pod' ? 'dial' : 'pipes';
  const seconds = (kind === 'code' ? B.CODE_TIME : kind === 'dial' ? B.DIAL_TIME : B.BREAKIN_TIME[target.difficulty]) * bonus;
  const bk = { kind, time: seconds, total: seconds, started: false };
  if (kind === 'pipes') Object.assign(bk, createPipes(state));
  if (kind === 'code') Object.assign(bk, { code: newCode(state), entered: [], shift: B.CODE_SHIFT, wrong: 0 });
  if (kind === 'dial') { Object.assign(bk, { angle: 0, speed: B.DIAL_SPEED, width: B.DIAL_WIDTH, stage: 0, misses: 0, mark: 0 }); newMark(state, bk); }
  return bk;
}

// Returns 'solved', 'failed' or null.
export function stepBreakin(state, target, cmds, dt) {
  const bk = target.breakin;
  if (!bk || target.lock === 'open') return null;
  const orders = [];
  for (const byPlayer of Object.values((cmds && cmds.hack) || {})) for (const c of byPlayer) if (c.wreck === target.id) orders.push(c);
  let solved = false, failed = false;
  if (bk.kind === 'pipes') {
    for (const c of orders) {
      const t = bk.tiles[c.y * GW + c.x];
      if (t) { t.rot = (t.rot + (c.dir < 0 ? 3 : 1)) % 4; state.events.push({ type: 'tileTurned' }); }
    }
    solved = flow(bk).solved;
  } else if (bk.kind === 'code') {
    if (bk.started) {
      // The code changes now and then, so it has to be read and entered quickly.
      bk.shift -= dt;
      if (bk.shift <= 0) { bk.code = newCode(state); bk.entered = []; bk.shift = B.CODE_SHIFT; state.events.push({ type: 'codeChanged' }); }
    }
    for (const c of orders) {
      if (!(c.digit >= 1 && c.digit <= B.CODE_DIGITS)) continue;
      bk.entered.push(c.digit); state.events.push({ type: 'tileTurned' });
      if (bk.entered.length < B.CODE_LEN) continue;
      if (bk.entered.every((d, i) => d === bk.code[i])) solved = true;
      else { bk.entered = []; bk.time -= B.CODE_PENALTY; bk.wrong++; state.events.push({ type: 'codeWrong' }); }
    }
  } else {
    if (bk.started) bk.angle = (bk.angle + bk.speed * dt) % TAU;
    for (const c of orders) {
      if (!c.stop) continue;
      if (Math.abs(angleDiff(bk.angle, bk.mark)) <= bk.width / 2) {
        bk.stage++; state.events.push({ type: 'dialHit' });
        if (bk.stage >= B.DIAL_STAGES) solved = true;
        else { bk.width *= 0.78; bk.speed *= 1.22; newMark(state, bk); }
      } else {
        bk.misses++; state.events.push({ type: 'dialMiss' });
        if (bk.misses >= B.DIAL_MISSES) failed = true;
      }
    }
  }
  if (solved) { target.lock = 'open'; state.events.push({ type: 'lockOpen', wreck: target.id, kind: target.kind }); return 'solved'; }
  if (bk.started && !failed) { bk.time -= dt; if (bk.time <= 0) failed = true; }
  if (failed) { state.events.push({ type: 'lockFailed', wreck: target.id, kind: target.kind }); return 'failed'; }
  return null;
}
