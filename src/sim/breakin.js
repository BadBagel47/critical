// Break-in games. Each kind of target has its own:
//   wreck   - 'pipes': turn pipe tiles until power flows from the source to the lock
//   station - 'code':  enter the code that the Engineer screen shows, before it changes
//   pod     - 'dial':  stop the needle inside the mark three times in a row
import { B } from './balance.js';
import { THINGS } from './kinds.js';
import { rand, randRange, angleDiff, TAU } from './util.js';

// How large the pipe grid is for each level of risk: [columns, rows]. Riskier wrecks have harder locks.
export const PIPE_GRID = [null, [5, 3], [6, 3], [6, 4]];
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const BASE = { I: N | S, L: N | E, T: N | E | W, X: N | E | S | W, O: 0 };
const DIRS = [
  [N, 0, -1, S],
  [E, 1, 0, W],
  [S, 0, 1, N],
  [W, -1, 0, E],
];
const turn = (m) => ((m << 1) & 15) | (m >> 3);
export function mask(tile) {
  let m = BASE[tile.type];
  for (let i = 0; i < tile.rot; i++) m = turn(m);
  return m;
}

// Which tiles carry power, and whether it reaches the lock. Power comes in from the left at row `source`
// and has to leave to the right at row `sink`.
export function flow(bk) {
  const { w, h } = bk;
  const lit = new Set();
  const start = bk.source * w;
  if (!(mask(bk.tiles[start]) & W)) return { lit, solved: false };
  const queue = [start];
  lit.add(start);
  while (queue.length) {
    const i = queue.shift();
    const x = i % w;
    const y = Math.floor(i / w);
    const m = mask(bk.tiles[i]);
    for (const [bit, dx, dy, back] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const j = ny * w + nx;
      if (!(m & bit) || nx < 0 || ny < 0 || nx >= w || ny >= h || lit.has(j)) continue;
      if (mask(bk.tiles[j]) & back) {
        lit.add(j);
        queue.push(j);
      }
    }
  }
  const end = bk.sink * w + w - 1;
  return { lit, solved: lit.has(end) && !!(mask(bk.tiles[end]) & E) };
}

// A random path from the source on the left edge to the lock on the right edge.
function randomPath(state, w, h, source, sink, winding) {
  // The path mostly heads for the lock. Only the hardest locks let it double back.
  const steps = [
    [1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  if (winding) steps.push([-1, 0]);
  const path = [[0, source]];
  const seen = [source * w];
  const walk = () => {
    const [x, y] = path[path.length - 1];
    if (x === w - 1 && y === sink) return true;
    const order = steps.map((d) => ({ d, k: rand(state) })).sort((a, b) => a.k - b.k);
    for (const { d } of order) {
      const nx = x + d[0];
      const ny = y + d[1];
      const key = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.includes(key)) continue;
      seen.push(key);
      path.push([nx, ny]);
      if (walk()) return true;
      path.pop();
    }
    return false;
  };
  walk();
  return path;
}

function createPipes(state, difficulty) {
  const [w, h] = PIPE_GRID[difficulty] || PIPE_GRID[1];
  const source = Math.floor(rand(state) * h);
  const sink = Math.floor(rand(state) * h);
  const path = randomPath(state, w, h, source, sink, difficulty >= 3);
  // Fill the grid with loose pieces, then lay the path through them.
  const tiles = [];
  for (let i = 0; i < w * h; i++) {
    const r = rand(state);
    tiles.push({ type: r < 0.3 ? 'I' : r < 0.65 ? 'L' : r < 0.85 ? 'T' : 'O', rot: Math.floor(rand(state) * 4) });
  }
  const bitFor = (dx, dy) => (dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N);
  path.forEach(([x, y], i) => {
    const prev = path[i - 1];
    const next = path[i + 1];
    const need = (prev ? bitFor(prev[0] - x, prev[1] - y) : W) | (next ? bitFor(next[0] - x, next[1] - y) : E);
    const type = need === (N | S) || need === (E | W) ? 'I' : 'L';
    let rot = 0;
    while (mask({ type, rot }) !== need) rot++;
    tiles[y * w + x] = { type, rot };
  });
  const solution = tiles.map((t) => t.rot);
  // Turn most of the pieces on the path one step out of place, so that each needs a single turn back.
  // At least three are always turned, so that no lock opens by itself.
  let turned = 0;
  for (const [x, y] of path) {
    const tile = tiles[y * w + x];
    if (rand(state) >= 0.7) continue;
    tile.rot = (tile.rot + (rand(state) < 0.5 ? 1 : 3)) % 4;
    turned++;
  }
  for (const [x, y] of path) {
    const i = y * w + x;
    if (turned >= 3) break;
    if (tiles[i].rot !== solution[i]) continue;
    tiles[i].rot = (tiles[i].rot + 1) % 4;
    turned++;
  }
  const bk = { w, h, tiles, solution, source, sink };
  if (flow(bk).solved) tiles[source * w].rot = (tiles[source * w].rot + 1) % 4;
  return bk;
}

const newCode = (state) => Array.from({ length: B.CODE_LEN }, () => 1 + Math.floor(rand(state) * B.CODE_DIGITS));
// The needle goes clockwise round the outermost and the innermost ring of a pod's lock, and the other way
// round the one between them.
export const dialWay = (bk) => (bk.stage % 2 ? -1 : 1);
const newMark = (state, bk) => {
  bk.mark = (bk.angle + dialWay(bk) * Math.PI * randRange(state, 0.6, 1.4) + TAU) % TAU;
};

// `bonus` stretches the time, for crews that bought a hacking kit.
export function createBreakin(state, target, bonus = 1) {
  const kind = THINGS[target.kind].lock;
  const seconds =
    (kind === 'code' ? B.CODE_TIME : kind === 'dial' ? B.DIAL_TIME : B.BREAKIN_TIME[target.difficulty]) * bonus;
  const bk = { kind, time: seconds, total: seconds, started: false };
  if (kind === 'pipes') Object.assign(bk, createPipes(state, target.difficulty));
  if (kind === 'code') {
    // `stage` is how many digits the Engineer has found. The needle and the mark are for the next one.
    const ring = { angle: 0, speed: B.HACK_SPEED, width: B.HACK_WIDTH, stage: 0, mark: 0 };
    Object.assign(bk, { code: newCode(state), entered: [], wrong: 0 }, ring);
    newMark(state, bk);
  }
  if (kind === 'dial') {
    // `opening` counts down while the middle of the lock turns, once the last ring is open.
    Object.assign(bk, { angle: 0, speed: B.DIAL_SPEED, width: B.DIAL_WIDTH, stage: 0, misses: 0, mark: 0, opening: 0 });
    newMark(state, bk);
  }
  return bk;
}

// Returns 'solved', 'failed' or null.
export function stepBreakin(state, target, cmds, dt) {
  const bk = target.breakin;
  if (!bk || target.lock === 'open') return null;
  const orders = [];
  for (const byPlayer of Object.values(cmds.hack || {}))
    for (const c of byPlayer) if (c.wreck === target.id) orders.push(c);
  let solved = false,
    failed = false;
  if (bk.kind === 'pipes') {
    for (const c of orders) {
      const onGrid = c.x >= 0 && c.y >= 0 && c.x < bk.w && c.y < bk.h;
      const t = onGrid ? bk.tiles[c.y * bk.w + c.x] : null;
      if (t) {
        t.rot = (t.rot + (c.dir < 0 ? 3 : 1)) % 4;
        state.events.push({ type: 'tileTurned' });
      }
    }
    solved = flow(bk).solved;
  } else if (bk.kind === 'code') {
    // The Engineer finds the digits one at a time, on their own screen: a needle goes round a ring, and has
    // to be stopped in the mark. A miss costs time. Whoever is at the lock enters the code.
    const hacking = bk.started && bk.stage < B.CODE_LEN;
    if (hacking) bk.angle = (bk.angle + dialWay(bk) * bk.speed * dt + TAU) % TAU;
    if (hacking && cmds.engineer && cmds.engineer.ring && state.ship.docked === target.id) {
      if (Math.abs(angleDiff(bk.angle, bk.mark)) <= bk.width / 2) {
        bk.stage++;
        bk.speed *= B.HACK_FASTER;
        bk.width *= B.HACK_NARROWER;
        if (bk.stage < B.CODE_LEN) newMark(state, bk);
        state.events.push({ type: 'digitFound', left: B.CODE_LEN - bk.stage });
      } else {
        bk.time -= B.CODE_PENALTY;
        state.events.push({ type: 'dialMiss' });
      }
    }
    for (const c of orders) {
      if (!(c.digit >= 1 && c.digit <= B.CODE_DIGITS)) continue;
      bk.entered.push(c.digit);
      state.events.push({ type: 'tileTurned' });
      if (bk.entered.length < B.CODE_LEN) continue;
      if (bk.entered.every((d, i) => d === bk.code[i])) solved = true;
      else {
        bk.entered = [];
        bk.time -= B.CODE_PENALTY;
        bk.wrong++;
        state.events.push({ type: 'codeWrong' });
      }
    }
  } else {
    if (bk.opening > 0) {
      // Every ring is open. The lock is open when its middle has turned.
      bk.opening -= dt;
      if (bk.opening > 0) return null;
      solved = true;
    } else if (bk.started) bk.angle = (bk.angle + dialWay(bk) * bk.speed * dt + TAU) % TAU;
    for (const c of solved ? [] : orders) {
      if (!c.stop) continue;
      if (Math.abs(angleDiff(bk.angle, bk.mark)) <= bk.width / 2) {
        bk.stage++;
        state.events.push({ type: 'dialHit' });
        if (bk.stage >= B.DIAL_STAGES) {
          bk.opening = B.DIAL_OPEN;
          break;
        } else {
          bk.width *= 0.78;
          bk.speed *= 1.22;
          newMark(state, bk);
        }
      } else {
        bk.misses++;
        state.events.push({ type: 'dialMiss' });
        if (bk.misses >= B.DIAL_MISSES) failed = true;
      }
    }
  }
  if (solved) {
    target.lock = 'open';
    state.events.push({ type: 'lockOpen', wreck: target.id, kind: target.kind });
    return 'solved';
  }
  if (bk.started && !failed) {
    bk.time -= dt;
    if (bk.time <= 0) failed = true;
  }
  if (failed) {
    state.events.push({ type: 'lockFailed', wreck: target.id, kind: target.kind });
    return 'failed';
  }
  return null;
}
