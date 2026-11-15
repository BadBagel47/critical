// Guards. One that has noticed nobody walks its round or stands at its post and looks about, always the same
// way, so that it can be watched and slipped past. It sees what is in front of it: far when that is in the
// light, and only close by in the dark. One that has seen an intruder fights from cover: it steps out, fires
// and steps back. A bold one moves up from cover to cover, a careful one keeps its distance and falls back
// when it is hurt. When there are several, one of them goes round another way to come at the intruder from
// the side.
import { B } from './balance.js';
import { TILE, tileAt, solidTile, move, los, waysFrom, wayTo, middleOf } from './floor.js';
import { forward, headingTo, angleDiff, turnToward, dist, rand, randRange, TAU } from './util.js';

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
  // Its round: the spots it walks between, which one it is on its way to, and how long it still stands there.
  // A guard with no round stands at its post. `looks` are the ways it turns to look, one after the other.
  route: [],
  leg: 0,
  pause: 0,
  looks: [heading],
  look: 0,
  // Put to sleep by a dart for this many seconds more, or taken down for the rest of the boarding.
  sleep: 0,
  down: false,
});
export const awake = (g) => !g.down && g.sleep <= 0;

// Whether a spot is in the light. A place that is not dark is lit everywhere. In the dark, light comes from
// flares and from the lamps that the boarders carry, and a boarder with a lit lamp is always seen.
export function isLit(it, x, y) {
  if (!it.dark) return true;
  for (const f of it.flares) {
    const reach = B.FLARE_LIGHT * Math.min(1, f.burn / B.FLARE_FADE);
    if (dist(f.x, f.y, x, y) < reach && los(it, f.x, f.y, x, y)) return true;
  }
  for (const a of it.avatars) {
    if (!a.lamp) continue;
    const d = dist(a.x, a.y, x, y);
    if (d < 8) return true;
    if (d > B.LAMP_RANGE) continue;
    const off = angleDiff(headingTo(x - a.x, y - a.y), a.heading);
    if (Math.abs(off) < B.LAMP_ANGLE && los(it, a.x, a.y, x, y)) return true;
  }
  return false;
}
// Whether a guard that has noticed nobody would see something at p: right next to it, or in front of it and
// near enough for the light that p is in, with no wall in between.
export function inSight(it, g, p) {
  const d = dist(g.x, g.y, p.x, p.y);
  if (d > B.GUARD_SIGHT) return false;
  if (d > B.GUARD_FEEL) {
    if (d > (isLit(it, p.x, p.y) ? B.GUARD_SIGHT : B.GUARD_SIGHT_DARK)) return false;
    if (Math.abs(angleDiff(headingTo(p.x - g.x, p.y - g.y), g.heading)) > B.GUARD_FOV) return false;
  }
  return los(it, g.x, g.y, p.x, p.y);
}

// Give every guard of a place its round, or the ways it looks from its post. They are made once, with the
// place, so that they are the same for the whole visit. `share` is how many of the guards walk a round.
export function planRounds(state, it, share) {
  for (const g of it.guards) {
    const at = tileOf(g);
    const ways = waysFrom(it, at.tx, at.ty);
    const walks = rand(state) < share;
    const first = rand(state) * TAU;
    g.looks = [first, first + 1.3 + rand(state) * 0.8, first - 1.3 - rand(state) * 0.8];
    g.heading = g.looks[0];
    if (!walks) continue;
    // Somewhere to walk to and back: the middles of rooms and corridors that are a little way off.
    const spots = [...it.rooms, ...it.halls]
      .map((box) => box.mid || { x: ((box.c0 + box.c1 + 1) / 2) * TILE, y: ((box.r0 + box.r1 + 1) / 2) * TILE })
      .filter((p) => {
        const t = tileOf(p);
        const steps = ways.steps[t.ty * it.w + t.tx];
        return steps >= 5 && steps <= B.GUARD_ROUND;
      });
    if (!spots.length) continue;
    const a = spots[Math.floor(rand(state) * spots.length)];
    const b = spots[Math.floor(rand(state) * spots.length)];
    g.route = [{ x: g.x, y: g.y }, a, ...(b !== a ? [b] : [])];
  }
}

// What a guard does while it has noticed nobody: it walks its round, or looks about from its post.
function patrol(it, g, dt) {
  const spot = g.route.length ? g.route[g.leg] : g.home;
  if (g.pause > 0 || (!g.path.length && dist(g.x, g.y, spot.x, spot.y) < 6)) {
    // Standing: it looks one way and then the next. At the end of a stop on a round, it walks on.
    if (g.pause <= 0) g.pause = g.route.length ? B.GUARD_PAUSE : 1e9;
    g.pause -= dt;
    g.wait -= dt;
    if (g.wait <= 0) {
      g.look = (g.look + 1) % g.looks.length;
      g.wait = B.GUARD_LOOK;
    }
    g.heading = turnToward(g.heading, g.looks[g.look], 2.2 * dt);
    if (g.pause <= 0 && g.route.length) g.leg = (g.leg + 1) % g.route.length;
    return;
  }
  if (!g.path.length) {
    const at = tileOf(g),
      to = tileOf(spot);
    g.path = wayTo(it, waysFrom(it, at.tx, at.ty), to.tx, to.ty);
    // A spot that cannot be reached is skipped.
    if (!g.path.length) {
      if (g.route.length) g.leg = (g.leg + 1) % g.route.length;
      else g.home = { x: g.x, y: g.y };
      return;
    }
  }
  follow(it, g, dt, 0.45);
}

// Make a guard aware of an intruder at `at`.
export function alertGuard(g, at) {
  if (!awake(g)) return;
  if (g.mode !== 'alert') {
    g.path = [];
    g.pause = 0;
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

// What a guard sees while it has noticed nobody. Says what it has found: nothing, an intruder that it has
// watched for long enough, or another guard that lies asleep or taken down. Being seen is not at once: a
// boarder in sight is `spotted` a little more for every moment, and it is the boarding that lets it sink again.
function watch(it, g, dt) {
  for (const av of it.avatars) {
    if (!inSight(it, g, av)) continue;
    const near = 1 + 1.5 * (1 - dist(g.x, g.y, av.x, av.y) / B.GUARD_SIGHT);
    av.spotted = Math.min(1, av.spotted + (dt * near) / B.GUARD_NOTICE);
    av.watched = true;
    if (av.spotted >= 1) return { intruder: av };
  }
  const body = it.guards.find((o) => o !== g && !awake(o) && inSight(it, g, o));
  return body ? { body } : null;
}

// Returns what the guard has found this step, for the place to act on: see boarding.js.
export function stepGuard(state, it, g, dt) {
  if (g.down) return null;
  if (g.sleep > 0) {
    g.sleep -= dt;
    // One that wakes by itself has seen nothing, and goes back to its round.
    if (g.sleep <= 0) {
      g.mode = 'idle';
      g.path = [];
      g.pause = 0;
    }
    return null;
  }
  g.cool -= dt;
  if (g.mode !== 'alert') {
    const found = watch(it, g, dt);
    if (!found) {
      patrol(it, g, dt);
      return null;
    }
    alertGuard(g, found.intruder || found.body);
    return found;
  }
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
  if (!target) g.lost += dt;
  // Nobody has been seen for a while: back to the round, unless the whole place is hunting.
  if (g.lost > B.GUARD_FORGET && it.mood !== 'alarm') {
    g.mode = 'idle';
    g.plan = 'fight';
    g.flanked = false;
    g.wait = 1;
    g.path = [];
    g.pause = 0;
    return null;
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
  return null;
}
