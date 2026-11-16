// The world (docs/proposal-world.md, step 3; D-089): a map of systems made anew for every game from the game's
// random numbers. It replaces the five fixed sectors. A sector in the code is one system of this map.
//   - The number of inhabited systems is chosen at the start (8, 12 or 18), and as many empty ones bind them
//     together, more of them further out.
//   - The start is a sanctuary near the middle: one neutral base, no pirates, no attacks.
//   - Danger rises one step for every two jumps from the sanctuary, up to three.
//   - Each faction has an area of its own, in one piece. Some systems on the borders are contested, with the
//     stations of two factions whose ships fight each other. The pirates hold the systems furthest out, and
//     the end waits in one of the three inhabited systems that lie furthest away.
//   - Most systems have two or three jump lanes. A few empty ones far out are dead ends.
//   - Every system has asteroids, so that fuel can always be mined.
import { B } from './balance.js';
import { FACTIONS, PIRATE } from './sides.js';
import { rand, randRange } from './util.js';

export const SIZES = { short: 8, medium: 12, long: 18 };
export const SIZE_NAMES = { short: 'SHORT', medium: 'MEDIUM', long: 'LONG' };

const FIRST = [
  'ASH',
  'PALE',
  'IRON',
  'COLD',
  'QUIET',
  'BROKEN',
  'DEEP',
  'GREY',
  'FAR',
  'RED',
  'SILENT',
  'BLACK',
  'HOLLOW',
  'NARROW',
  'BRIGHT',
  'LOW',
  'HIGH',
  'OLD',
  'BARE',
  'SALT',
  'GLASS',
  'DUSK',
  'EMBER',
  'TIN',
];
const SECOND = [
  'REACH',
  'DRIFT',
  'GATE',
  'BELT',
  'PIER',
  'WAKE',
  'SHOAL',
  'VERGE',
  'SPUR',
  'FORD',
  'HOLLOW',
  'MARCH',
  'RIDGE',
  'BASIN',
  'CROSS',
  'STRAND',
  'HAVEN',
  'REST',
  'TIDE',
  'FIELD',
  'MOUTH',
  'SOUND',
  'KEEP',
  'RUN',
];
const STATION = ['POST', 'DOCK', 'MARKET', 'DEPOT', 'HOLD', 'FORT', 'PIER', 'YARD', 'EXCHANGE', 'OUTPOST'];
const pick = (s, list) => list[Math.floor(rand(s) * list.length)];

function names(s, n) {
  const used = new Set();
  const out = [];
  while (out.length < n) {
    const name = `${pick(s, FIRST)} ${pick(s, SECOND)}`;
    if (used.has(name) || name.split(' ')[0] === name.split(' ')[1]) continue;
    used.add(name);
    out.push(name);
  }
  return out;
}

// Whether two lines between systems cross, so that the map stays easy to read.
function cross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  if (a === c || a === d || b === c || b === d) return false;
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// How many jumps every system is from `from`.
export function hopsFrom(sectors, from) {
  const hops = sectors.map(() => Infinity);
  hops[from] = 0;
  const todo = [from];
  while (todo.length) {
    const i = todo.shift();
    for (const j of sectors[i].links) {
      if (hops[j] !== Infinity) continue;
      hops[j] = hops[i] + 1;
      todo.push(j);
    }
  }
  return hops;
}

// Where the systems lie on the star map, from 0 to 1 each way: in a few clusters with gaps between, never
// evenly, and the sanctuary near the middle.
function placeSystems(s, total) {
  const pts = [{ x: 0.5 + randRange(s, -0.05, 0.05), y: 0.5 + randRange(s, -0.05, 0.05) }];
  const clusters = [];
  const k = 3 + Math.floor(rand(s) * 3);
  for (let i = 0; i < k; i++) clusters.push({ x: randRange(s, 0.12, 0.88), y: randRange(s, 0.12, 0.88) });
  const gap = 0.62 / Math.sqrt(total);
  for (let tries = 0; pts.length < total && tries < 20000; tries++) {
    const c = clusters[Math.floor(rand(s) * clusters.length)];
    const loose = rand(s) < 0.3;
    const p = loose
      ? { x: randRange(s, 0.04, 0.96), y: randRange(s, 0.04, 0.96) }
      : { x: c.x + randRange(s, -0.22, 0.22), y: c.y + randRange(s, -0.22, 0.22) };
    if (p.x < 0.03 || p.x > 0.97 || p.y < 0.03 || p.y > 0.97) continue;
    if (pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < gap)) continue;
    pts.push(p);
  }
  return pts;
}

// Jump lanes: first a tree that reaches every system, by the shortest lanes, then more short lanes until most
// systems have two or three. Lanes never cross.
function layLanes(s, pts) {
  const n = pts.length;
  const d = (i, j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
  const links = pts.map(() => []);
  const lanes = [];
  const join = (i, j) => {
    links[i].push(j);
    links[j].push(i);
    lanes.push([i, j]);
  };
  const ok = (i, j) => !lanes.some(([a, b]) => cross(pts[i], pts[j], pts[a], pts[b]));
  const inTree = new Set([0]);
  while (inTree.size < n) {
    let best = null;
    for (const i of inTree)
      for (let j = 0; j < n; j++) {
        if (inTree.has(j)) continue;
        if (!best || d(i, j) < best.d) best = { i, j, d: d(i, j) };
      }
    join(best.i, best.j);
    inTree.add(best.j);
  }
  // The systems in a random order, the same for the same seed in every browser.
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order) {
    if (links[i].length >= 2 && rand(s) < 0.6) continue;
    const near = [...Array(n).keys()]
      .filter((j) => j !== i && !links[i].includes(j) && links[j].length < 3)
      .sort((a, b) => d(i, a) - d(i, b));
    for (const j of near.slice(0, 3)) {
      if (links[i].length >= 3) break;
      if (d(i, j) > 0.34) break;
      if (ok(i, j)) join(i, j);
    }
  }
  return links;
}

// One more lane from system `i`, to the nearest system it can reach without crossing a lane, if there is one.
function addLane(pts, links, i) {
  const d = (j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
  const lanes = links.flatMap((l, a) => l.filter((b) => a < b).map((b) => [a, b]));
  const ok = (j) => !lanes.some(([a, b]) => cross(pts[i], pts[j], pts[a], pts[b]));
  const near = [...pts.keys()]
    .filter((j) => j !== i && !links[i].includes(j) && links[j].length < 4)
    .sort((a, b) => d(a) - d(b));
  const j = near.find(ok);
  if (j === undefined) return;
  links[i].push(j);
  links[j].push(i);
}

// The world for a new game: one entry for each system, in the shape the rest of the game reads.
export function createWorld(s, size = 'short') {
  const inhabited = SIZES[size] || SIZES.short;
  const total = inhabited * 2;
  const pts = placeSystems(s, total);
  const links = layLanes(s, pts);
  const sectors = pts.map((p, id) => ({ id, x: p.x, y: p.y, links: links[id] }));
  let hops = hopsFrom(sectors, 0);
  let deepest = Math.max(...hops);
  // Which are inhabited: the sanctuary, and those nearer in, with more empty ones the further out.
  const score = (i) => hops[i] / Math.max(1, deepest) + rand(s) * 0.55;
  const rest = sectors
    .slice(1)
    .map((x) => x.id)
    .sort((a, b) => score(a) - score(b));
  const lived = new Set([0, ...rest.slice(0, inhabited - 1)]);
  // Only an empty system far out may be a dead end, with a single lane (R-1089). Others get another lane.
  for (const i of [...pts.keys()]) {
    if (links[i].length === 1 && (lived.has(i) || hops[i] < deepest / 2)) addLane(pts, links, i);
  }
  hops = hopsFrom(sectors, 0);
  deepest = Math.max(...hops);
  // The end: one of the three inhabited systems furthest away.
  const far = [...lived]
    .filter((i) => i !== 0)
    .sort((a, b) => hops[b] - hops[a] || a - b)
    .slice(0, 3);
  const end = far[Math.floor(rand(s) * far.length)];
  // The pirates hold the end and the inhabited systems furthest out: about one in four.
  const owner = sectors.map(() => null);
  owner[end] = PIRATE;
  const outer = [...lived].filter((i) => i !== 0 && i !== end).sort((a, b) => hops[b] - hops[a] || a - b);
  for (const i of outer.slice(0, Math.max(0, Math.round(inhabited / 4) - 1))) owner[i] = PIRATE;
  // Each faction grows its area out from a seed, one system at a time, so that it lies in one piece.
  const factions = Object.keys(FACTIONS);
  const free = () => [...lived].filter((i) => i !== 0 && !owner[i]);
  const seeds = [];
  for (const f of factions) {
    const left = free();
    if (!left.length) break;
    const spread = (i) => Math.min(...seeds.map((j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)), 9);
    const seed = seeds.length ? left.sort((a, b) => spread(b) - spread(a))[0] : pick(s, left);
    seeds.push(seed);
    owner[seed] = f;
  }
  const area = hopsFrom(sectors, 0).map(() => null);
  seeds.forEach((seed, k) => (area[seed] = factions[k]));
  for (let round = 0; round < total; round++) {
    let grew = false;
    for (const i of sectors.map((x) => x.id)) {
      if (!area[i]) continue;
      for (const j of sectors[i].links) {
        if (area[j] || j === 0) continue;
        area[j] = area[i];
        grew = true;
      }
    }
    if (!grew) break;
  }
  for (const i of free()) owner[i] = area[i] || pick(s, factions);
  // Contested: about one inhabited system in five, on the border of two faction areas.
  const contested = new Map();
  // A border system has another faction's area within two jumps.
  const otherNear = (i) => {
    const h = hopsFrom(sectors, i);
    const near = sectors.filter((x) => h[x.id] > 0 && h[x.id] <= 2 && area[x.id] && area[x.id] !== owner[i]);
    near.sort((a, b) => h[a.id] - h[b.id] || a.id - b.id);
    return near.length ? area[near[0].id] : null;
  };
  const border = [...lived].filter((i) => factions.includes(owner[i]) && otherNear(i));
  for (const i of border.slice(0, Math.max(1, Math.round(inhabited / 5)))) contested.set(i, [owner[i], otherNear(i)]);
  const allNames = names(s, total);
  return sectors.map((sec, i) => {
    const kind = i === 0 ? 'sanctuary' : lived.has(i) ? 'inhabited' : 'empty';
    const tier = Math.min(3, Math.floor(hops[i] / 2));
    const sides = contested.get(i) || null;
    const roll = rand(s);
    const sizeIdx = kind === 'empty' ? (roll < 0.7 ? 0 : 1) : roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2;
    const special = kind === 'empty' && rand(s) < 0.35 ? (rand(s) < 0.5 ? 'rocks' : 'wrecks') : null;
    return {
      id: i,
      name: allNames[i],
      x: sec.x,
      y: sec.y,
      kind,
      tier,
      hops: hops[i],
      owner: kind === 'empty' ? null : sides ? 'contested' : owner[i],
      sides,
      special,
      boss: i === end,
      size: sizeIdx,
      plan: stationsFor(s, kind, owner[i], sides, tier, i === end, allNames[i]),
      wrecks: kind === 'empty' ? (special === 'wrecks' ? 5 : Math.floor(rand(s) * 3)) : 3,
      pods: kind === 'empty' ? 1 : 3,
      links: sec.links,
    };
  });
}

// What stations a system has: [side, shipyard, how far out in the largest size, name, sanctuary].
function stationsFor(s, kind, owner, sides, tier, end, sysName) {
  const word = sysName.split(' ')[0];
  const name = () => `${word} ${pick(s, STATION)}`;
  if (kind === 'sanctuary') return [[null, false, 700, `${word} HAVEN`, true]];
  if (kind === 'empty') return [];
  if (sides)
    return [
      [sides[0], true, 900, name()],
      [sides[1], true, 1600, name()],
    ];
  if (owner === PIRATE) {
    const list = [['pirate', false, 1400, end ? `${word} BASTION` : name()]];
    if (!end && rand(s) < 0.4) list.push(['pirate', false, 2000, name()]);
    return list;
  }
  const list = [[owner, true, 950, name()]];
  if (rand(s) < 0.45) list.push([null, false, 1500, name()]);
  if (tier >= 2 && rand(s) < 0.5) list.push(['pirate', false, 1900, name()]);
  return list;
}

// The radius of a system of the size it was given.
export const radiusOf = (sec) => B.SYSTEM_R[sec.size];
