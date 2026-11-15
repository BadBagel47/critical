// Guards. One that has seen an intruder fights from cover: it steps out, fires and steps back. A bold one
// moves up from cover to cover, a careful one keeps its distance and falls back when it is hurt. When there
// are several, one of them goes round another way to come at the intruder from the side.
import { B } from './balance.js';
import { TILE, tileAt, solidTile, move, los, waysFrom, wayTo, middleOf } from './floor.js';
import { forward, headingTo, angleDiff, turnToward, dist, rand, randRange } from './util.js';

export const newGuard = (state, p, heading) => ({
  id: state.nextId++,
  x: p.x,
  y: p.y,
  hp: B.GUARD_HP,
  heading,
  mode: 'idle',
  cool: 1,
  home: { ...p },
  goal: { ...p },
  wait: 1,
  lost: 0,
  // What it is like, and what it is doing about an intruder: see stepGuard.
  bold: rand(state) < 0.5,
  plan: 'fight',
  phase: 'peek',
  timer: 0,
  think: 0,
  cover: null,
  peek: null,
  path: [],
});

// Make a guard aware of an intruder at `at`.
export function alertGuard(g, at) {
  if (g.mode !== 'alert') {
    g.plan = 'fight';
    g.phase = 'peek';
    g.timer = 0;
    g.think = 0;
  }
  g.mode = 'alert';
  g.lost = 0;
  g.seen = { x: at.x, y: at.y };
}

const tileOf = (p) => ({ tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) });
const FLOOR = new Set(['.', ',', 'A']);

// Walk along g.path, at a share of full speed. Says whether there is still some way to go.
function follow(it, g, dt, pace = 1) {
  while (g.path.length && dist(g.x, g.y, g.path[0].x, g.path[0].y) < 3) g.path.shift();
  if (!g.path.length) return false;
  const to = g.path[0];
  g.heading = turnToward(g.heading, headingTo(to.x - g.x, to.y - g.y), 8 * dt);
  const d = dist(g.x, g.y, to.x, to.y);
  const sp = Math.min(d, B.GUARD_SPEED * pace * dt);
  move(it, g, ((to.x - g.x) / d) * sp, ((to.y - g.y) / d) * sp, B.CREW_RADIUS);
  return true;
}

function fire(state, it, g) {
  const s = forward(g.heading + randRange(state, -0.09, 0.09));
  it.bolts.push({
    x: g.x + s.x * 7,
    y: g.y + s.y * 7,
    vx: s.x * B.GUARD_BOLT_SPEED,
    vy: s.y * B.GUARD_BOLT_SPEED,
    ttl: 1.4,
    owner: 'enemy',
    dmg: B.GUARD_DMG,
  });
  g.cool = B.GUARD_COOLDOWN * randRange(state, 0.85, 1.2);
  // The others nearby hear the shot and know where the intruder is.
  for (const o of it.guards) {
    if (o !== g && o.mode !== 'alert' && dist(o.x, o.y, g.x, g.y) < B.GUARD_HEARING) alertGuard(o, g.seen);
  }
}

// A place to fight from: a tile where the intruder cannot see the guard, next to one where they can. A bold
// guard picks one nearer the intruder, a careful one further off, and one that falls back the furthest it can.
function findCover(it, g, ways, away) {
  const at = tileOf(g);
  const pull = away ? -1.2 : g.bold ? 0.7 : -0.25;
  let best = null,
    least = Infinity;
  for (let ty = at.ty - B.GUARD_REACH; ty <= at.ty + B.GUARD_REACH; ty++)
    for (let tx = at.tx - B.GUARD_REACH; tx <= at.tx + B.GUARD_REACH; tx++) {
      if (!FLOOR.has(tileAt(it, tx, ty))) continue;
      const steps = ways.steps[ty * it.w + tx];
      if (steps > B.GUARD_REACH * 2) continue;
      const here = middleOf(tx, ty);
      if (los(it, here.x, here.y, g.seen.x, g.seen.y)) continue;
      const far = dist(here.x, here.y, g.seen.x, g.seen.y);
      let peek = null;
      for (const [dx, dy] of AROUND) {
        if (solidTile(it, tx + dx, ty + dy)) continue;
        const p = middleOf(tx + dx, ty + dy);
        if (dist(p.x, p.y, g.seen.x, g.seen.y) < B.GUARD_SIGHT && los(it, p.x, p.y, g.seen.x, g.seen.y)) peek = p;
      }
      if (!peek && !away) continue;
      const score = steps + (pull * far) / TILE;
      if (score < least) {
        least = score;
        best = { cover: here, peek, tx, ty };
      }
    }
  return best;
}
const AROUND = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Decide what to do about the intruder, now and then: where to fight from, or which way to go round.
function decide(state, it, g) {
  g.think = randRange(state, 0.7, 1.1);
  const at = tileOf(g);
  const hurt = g.hp < B.GUARD_HP * 0.4;
  if (hurt && !g.bold) g.plan = 'retreat';
  else if (g.plan !== 'flank') {
    // With several on the same intruder, the one furthest from it goes round. One at a time.
    const others = it.guards.filter((o) => o !== g && o.mode === 'alert');
    const far = dist(g.x, g.y, g.seen.x, g.seen.y);
    const furthest = others.every((o) => dist(o.x, o.y, g.seen.x, g.seen.y) < far);
    g.plan = others.length && furthest && !others.some((o) => o.plan === 'flank') && !g.flanked ? 'flank' : 'fight';
  }
  if (g.plan === 'flank') {
    // The way round: ground that the intruder sees costs more than ground that they do not.
    const seen = new Map();
    const cost = (tx, ty) => {
      const p = middleOf(tx, ty);
      if (dist(p.x, p.y, g.seen.x, g.seen.y) > B.GUARD_SIGHT) return 1;
      const key = ty * it.w + tx;
      if (!seen.has(key)) seen.set(key, los(it, p.x, p.y, g.seen.x, g.seen.y) ? 6 : 1);
      return seen.get(key);
    };
    const goal = tileOf(g.seen);
    g.path = wayTo(it, waysFrom(it, at.tx, at.ty, cost), goal.tx, goal.ty);
    if (!g.path.length) g.plan = 'fight';
    return;
  }
  const ways = waysFrom(it, at.tx, at.ty);
  const spot = findCover(it, g, ways, g.plan === 'retreat');
  g.cover = spot ? spot.cover : null;
  g.peek = spot ? spot.peek : null;
  // Where to go now depends on whether it is time to hide or to look out.
  const hide = g.phase === 'hide' || !g.peek;
  if (!spot) g.path = [];
  else if (hide) g.path = wayTo(it, ways, spot.tx, spot.ty);
  else g.path = [...wayTo(it, ways, spot.tx, spot.ty), g.peek];
}

// How long a guard looks out and how long it stays in cover.
const LOOK = { bold: [1.8, 2.8], careful: [1.2, 1.9], retreat: [0.8, 1.2] };
const HIDE = { bold: [0.5, 0.9], careful: [1.1, 1.8], retreat: [2.4, 3.4] };

export function stepGuard(state, it, g, dt) {
  g.cool -= dt;
  let target = null,
    best = B.GUARD_SIGHT;
  for (const av of it.avatars) {
    const d = dist(g.x, g.y, av.x, av.y);
    if (d < best && los(it, g.x, g.y, av.x, av.y)) {
      best = d;
      target = av;
    }
  }
  if (target) alertGuard(g, target);
  if (g.mode !== 'alert') {
    wander(state, it, g, dt);
    return;
  }
  if (!target) g.lost += dt;
  if (g.lost > B.GUARD_FORGET) {
    // Nobody has been seen for a while. The guard stays where it has ended up.
    g.mode = 'idle';
    g.plan = 'fight';
    g.flanked = false;
    g.home = { x: g.x, y: g.y };
    g.goal = { ...g.home };
    g.wait = 1;
    g.path = [];
    return;
  }
  g.think -= dt;
  g.timer -= dt;
  const kind = g.plan === 'retreat' ? 'retreat' : g.bold ? 'bold' : 'careful';
  if (g.plan === 'flank') {
    if (g.think <= 0) decide(state, it, g);
    // Round the corner and close enough: from here it fights like the others.
    if (target && best < B.GUARD_SIGHT * 0.65) {
      g.plan = 'fight';
      g.flanked = true;
      g.think = 0;
    } else if (!follow(it, g, dt) && !target) {
      g.plan = 'fight';
      g.flanked = true;
    }
  } else {
    if (g.timer <= 0) {
      g.phase = g.phase === 'peek' ? 'hide' : 'peek';
      g.timer = randRange(state, ...(g.phase === 'peek' ? LOOK : HIDE)[kind]);
      g.think = 0;
    }
    if (g.think <= 0) decide(state, it, g);
    const moving = follow(it, g, dt, g.plan === 'retreat' ? 1.15 : 1);
    if (!moving && !g.cover && target) {
      // Nowhere to hide: it fights in the open, and keeps its distance.
      const dir = best > 95 ? 1 : best < 55 ? -0.7 : 0;
      const f = forward(headingTo(target.x - g.x, target.y - g.y));
      if (dir) move(it, g, f.x * B.GUARD_SPEED * dir * dt, f.y * B.GUARD_SPEED * dir * dt, B.CREW_RADIUS);
    } else if (!moving && !g.cover && !target && dist(g.x, g.y, g.seen.x, g.seen.y) > 8) {
      // Nothing in sight and nowhere to fight from: go and look where the intruder was last seen.
      const at = tileOf(g),
        goal = tileOf(g.seen);
      g.path = wayTo(it, waysFrom(it, at.tx, at.ty), goal.tx, goal.ty);
    }
    if (!moving) {
      const look = target || g.seen;
      g.heading = turnToward(g.heading, headingTo(look.x - g.x, look.y - g.y), 6 * dt);
    }
  }
  if (target && g.cool <= 0) {
    const want = headingTo(target.x - g.x, target.y - g.y);
    // A guard on the move fires from the hip when the intruder is right in front of it.
    if (Math.abs(angleDiff(want, g.heading)) < 0.25) fire(state, it, g);
  }
}

// A guard that has seen nobody stays near its post and takes a few steps now and then.
function wander(state, it, g, dt) {
  g.wait -= dt;
  if (g.wait <= 0) {
    g.goal = { x: g.home.x + randRange(state, -30, 30), y: g.home.y + randRange(state, -22, 22) };
    g.wait = randRange(state, 2, 4.5);
  }
  if (dist(g.x, g.y, g.goal.x, g.goal.y) > 4) {
    g.heading = turnToward(g.heading, headingTo(g.goal.x - g.x, g.goal.y - g.y), 4 * dt);
    const f = forward(g.heading);
    move(it, g, f.x * B.GUARD_SPEED * 0.45 * dt, f.y * B.GUARD_SPEED * 0.45 * dt, B.CREW_RADIUS);
  }
}
