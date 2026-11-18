// The world (docs/proposal-world.md, step 3; D-089): a map of systems made anew for every game from the game's
// random numbers. It replaces the five fixed sectors. A sector in the code is one system of this map.
//   - The number of systems is chosen at the start (25, 40 or 55, R-1196). Two in five are inhabited, and the
//     empty ones bind them together, more of them further out but seldom next to each other (R-1197, R-1202).
//   - The start is a sanctuary near the middle: one neutral base, no pirates, no attacks.
//   - Danger rises one step for every two jumps from the sanctuary, up to three.
//   - Each faction has an area of its own, in one piece. Some systems on the borders are contested, with the
//     stations of two factions whose ships fight each other. The pirates hold the systems furthest out, and
//     the end.
//   - Most systems have two or three jump lanes. A few empty ones far out are dead ends.
//   - Every system has asteroids, so that fuel can always be mined.
//   - The end lies furthest out, at least END_MIN jumps away, with a single lane in. On the way there, no more
//     than one empty system lies in a row (R-1203).
//   - About a quarter of each side's bases have a shipyard, and each side at least one (R-1194, R-1201).
//   - Wrecks are few, a bonus for whoever finds one, and most where the pirates are (wrecksFor).
import { B } from './balance.js';
import { FACTIONS, PIRATE } from './sides.js';
import { rand, randRange } from './util.js';

// How many systems a world has, inhabited and empty together (R-1196).
export const SIZES = { short: 25, medium: 40, long: 55 };
// The share of the systems that are inhabited (R-1197), the share of those that the pirates hold, the end
// counted in (R-1198), and the share that is contested.
const LIVED_SHARE = 0.4;
const PIRATE_SHARE = 0.2;
const CONTESTED_SHARE = 0.2;
// How the empty systems are picked (R-1202): how much further out counts, how much chance, and how much an
// empty neighbour counts against. And how many empty systems may lie in a row on the way to the end (R-1203).
const SPREAD = { out: 0.6, noise: 0.5, neighbour: 0.6 };
const MOST_EMPTY_IN_ROW = 1;
// The share of each side's bases that have a shipyard (R-1194).
const YARD_SHARE = 0.25;
export const inhabitedOf = (size) => Math.round((SIZES[size] || SIZES.short) * LIVED_SHARE);
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

// One more lane from system `i`, to the nearest system it can reach without crossing a lane, if there is one,
// other than `not`.
function addLane(pts, links, i, not = -1) {
  const d = (j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
  const lanes = links.flatMap((l, a) => l.filter((b) => a < b).map((b) => [a, b]));
  const ok = (j) => !lanes.some(([a, b]) => cross(pts[i], pts[j], pts[a], pts[b]));
  const near = [...pts.keys()]
    .filter((j) => j !== i && j !== not && !links[i].includes(j) && links[j].length < 4)
    .sort((a, b) => d(a) - d(b));
  const j = near.find(ok);
  if (j === undefined) return;
  links[i].push(j);
  links[j].push(i);
}

// How few jumps from the sanctuary the end may lie, by the size of the world (R-1199).
export const END_MIN = { short: 5, medium: 6, long: 7 };

// Whether every system can still be reached when the lane between `a` and `b` is gone.
function canCut(links, a, b) {
  const without = links.map((l, i) => l.filter((j) => !((i === a && j === b) || (i === b && j === a))));
  return hopsFrom(
    without.map((l) => ({ links: l })),
    0,
  ).every((h) => h < Infinity);
}

// Where the systems lie, their lanes, which are inhabited, and the end.
function layout(s, inhabited, total) {
  const pts = placeSystems(s, total);
  const links = layLanes(s, pts);
  const sectors = pts.map((p, id) => ({ id, x: p.x, y: p.y, links: links[id] }));
  let hops = hopsFrom(sectors, 0);
  let deepest = Math.max(...hops);
  // Which are empty: picked one at a time, more often further out, but seldom next to one that is already empty,
  // so that empty systems do not lie in clumps (R-1202). The rest are inhabited, the sanctuary always.
  const empty = new Set();
  const others = sectors.slice(1).map((x) => x.id);
  const chance = new Map(others.map((i) => [i, rand(s)]));
  while (empty.size < total - inhabited) {
    let best = null;
    let most = -Infinity;
    for (const i of others) {
      if (empty.has(i)) continue;
      const near = links[i].filter((j) => empty.has(j)).length;
      const v = (hops[i] / Math.max(1, deepest)) * SPREAD.out + chance.get(i) * SPREAD.noise - near * SPREAD.neighbour;
      if (v > most) {
        most = v;
        best = i;
      }
    }
    empty.add(best);
  }
  const lived = new Set(sectors.map((x) => x.id).filter((i) => !empty.has(i)));
  // Only an empty system far out may be a dead end, with a single lane (R-1089). Others get another lane.
  for (const i of [...pts.keys()]) {
    if (links[i].length === 1 && (lived.has(i) || hops[i] < deepest / 2)) addLane(pts, links, i);
  }
  hops = hopsFrom(sectors, 0);
  // The end is the system furthest away, and it is inhabited (R-1095). Another inhabited system far out is
  // left empty instead, so that the count stays the same.
  const end = sectors
    .slice(1)
    .map((x) => x.id)
    .sort((a, b) => hops[b] - hops[a] || a - b)[0];
  if (!lived.has(end)) {
    const out = [...lived].filter((i) => i !== 0).sort((a, b) => hops[b] - hops[a] || a - b)[0];
    lived.delete(out);
    lived.add(end);
  }
  // It has a single lane in, from the side that is furthest out: the others are cut where the map stays in one
  // piece and a system at the other end that may not be a dead end keeps two lanes.
  const keep = [...links[end]].sort((a, b) => hops[b] - hops[a] || a - b)[0];
  for (const j of [...links[end]]) {
    if (j === keep) continue;
    // Only an empty system far out may be left with a single lane.
    const guard = lived.has(j) || hops[j] < Math.max(...hops) / 2;
    if (links[j].length <= 2 && guard) addLane(pts, links, j, end);
    if ((links[j].length <= 2 && guard) || !canCut(links, end, j)) continue;
    links[end] = links[end].filter((x) => x !== j);
    links[j] = links[j].filter((x) => x !== end);
  }
  for (const x of sectors) x.links = links[x.id];
  hops = hopsFrom(sectors, 0);
  // The map is deeper now, so a dead end that was far out may no longer be.
  deepest = Math.max(...hops);
  for (const i of [...pts.keys()]) {
    if (i !== end && links[i].length === 1 && (lived.has(i) || hops[i] < deepest / 2)) addLane(pts, links, i, end);
  }
  for (const x of sectors) x.links = links[x.id];
  hops = hopsFrom(sectors, 0);
  return { pts, links, sectors, hops, lived, end };
}

// The way from the sanctuary to the end may not run through more than MOST_EMPTY_IN_ROW empty systems in a row
// (R-1203). An empty system too many on the way is made inhabited, and an inhabited one off the way, with the
// most inhabited neighbours, is left empty instead, so that the count stays the same.
function shortenTail(s, sectors, lived, end) {
  const back = new Map([[0, null]]);
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    for (const j of sectors[i].links) {
      if (back.has(j)) continue;
      back.set(j, i);
      queue.push(j);
    }
  }
  // How far each system lies from the sanctuary. One far out is left empty rather than one near in (R-1197).
  const depth = new Map([[0, 0]]);
  for (const i of back.keys()) if (i !== 0) depth.set(i, depth.get(back.get(i)) + 1);
  const deepest = Math.max(1, ...depth.values());
  const way = [];
  for (let i = end; i !== null && i !== undefined; i = back.get(i)) way.unshift(i);
  const onWay = new Set(way);
  let run = 0;
  for (const i of way) {
    run = lived.has(i) ? 0 : run + 1;
    if (run <= MOST_EMPTY_IN_ROW) continue;
    const swap = [...lived]
      .filter((k) => k !== 0 && k !== end && !onWay.has(k))
      .map((k) => [
        k,
        depth.get(k) / deepest + sectors[k].links.filter((j) => lived.has(j)).length * 0.25 + rand(s) * 0.3,
      ])
      .sort((a, b) => b[1] - a[1])[0];
    if (!swap) return;
    lived.delete(swap[0]);
    lived.add(i);
    run = 0;
  }
}

// About a quarter of each side's bases have a shipyard, and every side that has a base that can have one has at
// least one (R-1194, R-1201). The sanctuary's base and the pirates' final base never have one.
function giveShipyards(s, systems) {
  const bySide = new Map();
  for (const sys of systems) {
    for (const entry of sys.plan) {
      entry[1] = false;
      if (entry[4] || sys.boss) continue;
      const side = entry[0] || 'free';
      if (!bySide.has(side)) bySide.set(side, []);
      bySide.get(side).push(entry);
    }
  }
  for (const list of bySide.values()) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand(s) * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const yards = Math.max(1, Math.round(list.length * YARD_SHARE));
    list.slice(0, yards).forEach((entry) => (entry[1] = true));
  }
}

// The world for a new game: one entry for each system, in the shape the rest of the game reads. A layout whose
// end is too close is made again, with the next random numbers, so that the same seed still gives the same world.
export function createWorld(s, size = 'short') {
  const total = SIZES[size] || SIZES.short;
  const inhabited = inhabitedOf(size);
  const need = END_MIN[size] || END_MIN.short;
  const worth = (l) => Math.min(l.hops[l.end], need) * 2 + (l.links[l.end].length === 1 ? 1 : 0);
  let best = null;
  for (let tries = 0; tries < 60; tries++) {
    const l = layout(s, inhabited, total);
    if (!best || worth(l) > worth(best)) best = l;
    if (worth(best) === need * 2 + 1) break;
  }
  const { pts, sectors, lived, end } = best;
  const hops = best.hops;
  shortenTail(s, sectors, lived, end);
  // The pirates hold the end and the inhabited systems furthest out: about one in five (R-1198).
  const owner = sectors.map(() => null);
  owner[end] = PIRATE;
  const outer = [...lived].filter((i) => i !== 0 && i !== end).sort((a, b) => hops[b] - hops[a] || a - b);
  for (const i of outer.slice(0, Math.max(0, Math.round(inhabited * PIRATE_SHARE) - 1))) owner[i] = PIRATE;
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
  for (const i of border.slice(0, Math.max(1, Math.round(inhabited * CONTESTED_SHARE))))
    contested.set(i, [owner[i], otherNear(i)]);
  const allNames = names(s, total);
  const systems = sectors.map((sec, i) => {
    const kind = i === 0 ? 'sanctuary' : lived.has(i) ? 'inhabited' : 'empty';
    const tier = Math.min(3, Math.floor(hops[i] / 2));
    const sides = contested.get(i) || null;
    const roll = rand(s);
    const sizeIdx = kind === 'empty' ? (roll < 0.7 ? 0 : 1) : roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2;
    const special = kind === 'empty' && rand(s) < 0.35 ? (rand(s) < 0.5 ? 'rocks' : 'wrecks') : null;
    const plan = stationsFor(s, kind, owner[i], sides, tier, i === end, allNames[i]);
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
      plan,
      wrecks: wrecksFor(s, kind, owner[i], sides, special, plan),
      pods: kind === 'empty' ? 1 : 3,
      links: sec.links,
    };
  });
  giveShipyards(s, systems);
  return systems;
}

// How many wrecks a system has when the crew first comes (R-1093, R-1094, R-1097). A wreck is a bonus for whoever
// finds one, not an income to count on: none in the sanctuary, most where the pirates are, one at times where two
// factions fight, and seldom anywhere else. Now and then an empty system has a field of them.
function wrecksFor(s, kind, owner, sides, special, plan) {
  if (kind === 'sanctuary') return 0;
  const r = rand(s);
  if (special === 'wrecks') return 3;
  if (owner === PIRATE) return r < 0.3 ? 2 : 1;
  if (sides) return r < 0.5 ? 1 : 0;
  const pirates = plan.some(([side]) => side === PIRATE);
  return r < (pirates ? 0.35 : 0.15) ? 1 : 0;
}

// What stations a system has: [side, shipyard, how far out in the largest size, name, sanctuary].
function stationsFor(s, kind, owner, sides, tier, end, sysName) {
  const word = sysName.split(' ')[0];
  // Two bases in the same system never have the same name, so that the Captain can tell them apart.
  const used = new Set();
  const name = () => {
    let n = `${word} ${pick(s, STATION)}`;
    while (used.has(n)) n = `${word} ${pick(s, STATION)}`;
    used.add(n);
    return n;
  };
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

// The regions of the map (F-278, R-1227): slices around the sanctuary, four on the small and middle maps and five on
// the large one, so that a system can be named with where it lies, as "DEEP GATE, DELTA". They are worked out from
// where the systems lie, so nothing more is saved. Each slice holds as many systems as the others, give or take
// one, and its edges lie in the widest gaps between systems. The sanctuary is in none of them.
export const REGION_NAMES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON'];
const TAU2 = 2 * Math.PI;
const norm = (a) => ((a % TAU2) + TAU2) % TAU2;
export function regionLayout(sectors, size) {
  const n = size === 'long' ? 5 : 4;
  const mid = sectors[0];
  const angle = (s) => norm(Math.atan2(s.y - mid.y, s.x - mid.x));
  const around = sectors
    .slice(1)
    .map((s) => angle(s))
    .sort((a, b) => a - b);
  const m = around.length;
  // The edge before system k (in order around): halfway between it and the one before.
  const edge = (k) => {
    const a = around[((k % m) + m) % m];
    const b = around[(((k - 1) % m) + m) % m];
    return norm(b + norm(a - b) / 2);
  };
  const gap = (k) => norm(around[((k % m) + m) % m] - around[(((k - 1) % m) + m) % m]);
  // Try every start, and keep the one whose edges have the most room around them.
  let best = null;
  for (let start = 0; start < m; start++) {
    const at = Array.from({ length: n }, (_, i) => start + Math.round((i * m) / n));
    const room = Math.min(...at.map(gap));
    if (!best || room > best.room) best = { room, at };
  }
  const bounds = best.at.map(edge);
  const of = (id) => {
    if (id === 0) return null;
    const a = angle(sectors[id]);
    for (let i = 0; i < n; i++) {
      const from = bounds[i];
      const to = bounds[(i + 1) % n];
      if (norm(a - from) < norm(to - from)) return i;
    }
    return n - 1;
  };
  return {
    count: n,
    bounds,
    names: REGION_NAMES.slice(0, n),
    of,
    nameOf: (id) => (id === 0 ? null : REGION_NAMES[of(id)]),
    // The middle of a region's slice, for its name on a map.
    middle: (i) => norm(bounds[i] + norm(bounds[(i + 1) % n] - bounds[i]) / 2),
  };
}

// The radius of a system of the size it was given.
export const radiusOf = (sec) => B.SYSTEM_R[sec.size];
