// What is fired and thrown inside a place (D-227): the rifle and the tranquilliser gun, grenades and flares, what a
// hit does, and taking away what has fallen.
import { B } from './balance.js';
import { los, solidAt } from './floor.js';
import { alertGuard, kindOf } from './guards.js';
import { playerById } from './players.js';
import { cutPower, wreckHangar } from './pressure.js';
import { rifleDmg } from './upgrades.js';
import { dist, forward, randRange } from './util.js';
import { heard, leave } from './boarders.js';

function hurtAvatar(state, it, av, dmg) {
  const player = playerById(state, av.player);
  player.hp -= dmg;
  it.fx.push({ type: 'hit', x: av.x, y: av.y, t: 0, dur: 0.2 });
  if (player.hp <= B.TELEPORT_HP) leave(state, it, av, true);
}

function explode(state, it, g) {
  it.fx.push({ type: 'boom', x: g.x, y: g.y, t: 0, dur: 0.45, size: B.GRENADE_RADIUS });
  state.events.push({ type: 'grenade' });
  const inBlast = (e) => dist(e.x, e.y, g.x, g.y) < B.GRENADE_RADIUS && los(it, g.x, g.y, e.x, e.y);
  for (const e of it.guards) if (inBlast(e)) e.hp -= B.GRENADE_DMG;
  for (const e of it.turrets) {
    if (!inBlast(e)) continue;
    if (it.mood) e.out = B.TURRET_OUT;
    else e.hp -= B.GRENADE_DMG;
  }
  for (const av of [...it.avatars]) if (inBlast(av)) hurtAvatar(state, it, av, B.GRENADE_SELF_DMG);
  heard(state, it, g);
  // A blast puts the switchgear of a base out, the loud way (R-1167), and wrecks its drone hangar.
  const place = it.breaker ? state.things.find((t) => t.interior === it) : null;
  if (place && inBlast(it.breaker)) cutPower(state, place, true);
  if (place && inBlast(it.hangar)) wreckHangar(state, it);
}

export function fireRifle(state, it, av) {
  const f = forward(av.heading + randRange(state, -0.02, 0.02));
  it.bolts.push({
    x: av.x + f.x * 7,
    y: av.y + f.y * 7,
    vx: f.x * B.RIFLE_SPEED,
    vy: f.y * B.RIFLE_SPEED,
    ttl: B.RIFLE_TTL,
    owner: 'crew',
    dmg: rifleDmg(state.ship) * (av.role === 'gunner' ? B.ROLE_RIFLE : 1),
  });
  av.cool = B.RIFLE_INTERVAL;
  state.events.push({ type: 'rifle' });
  heard(state, it, av);
}

// A dart from the tranquilliser gun makes no sound, and puts the guard it hits to sleep.
export function fireDart(state, it, av) {
  const f = forward(av.heading);
  it.bolts.push({
    x: av.x + f.x * 7,
    y: av.y + f.y * 7,
    vx: f.x * B.TRANQ_SPEED,
    vy: f.y * B.TRANQ_SPEED,
    ttl: 1,
    owner: 'crew',
    dmg: 0,
    tranq: true,
  });
  av.darts--;
  av.cool = B.TRANQ_INTERVAL;
  if (av.darts <= 0) av.weapon = 'rifle';
  state.events.push({ type: 'dart' });
}

export function throwGrenade(it, av, at) {
  let tx = at.x;
  let ty = at.y;
  const d = dist(av.x, av.y, tx, ty);
  if (d > B.GRENADE_RANGE) {
    tx = av.x + ((tx - av.x) * B.GRENADE_RANGE) / d;
    ty = av.y + ((ty - av.y) * B.GRENADE_RANGE) / d;
  }
  // A grenade stops at the first wall on its way.
  const n = Math.ceil(dist(av.x, av.y, tx, ty) / 4);
  let ex = av.x;
  let ey = av.y;
  for (let i = 1; i <= n; i++) {
    const x = av.x + ((tx - av.x) * i) / n;
    const y = av.y + ((ty - av.y) * i) / n;
    if (solidAt(it, x, y)) break;
    ex = x;
    ey = y;
  }
  av.grenades--;
  it.grenades.push({
    x: av.x,
    y: av.y,
    sx: av.x,
    sy: av.y,
    tx: ex,
    ty: ey,
    t: 0,
    dur: Math.max(0.15, dist(av.x, av.y, ex, ey) / B.GRENADE_SPEED),
    fuse: B.GRENADE_FUSE,
  });
}

// A flare is thrown toward where the boarder aims. It lights up what is around it, in the air as well.
export function throwFlare(state, it, av, at) {
  const d = dist(av.x, av.y, at.x, at.y);
  const dir = d > 1 ? { x: (at.x - av.x) / d, y: (at.y - av.y) / d } : forward(av.heading);
  av.flares--;
  // `seen` are the guards that have been to look at it, so that each of them comes only once.
  const flare = {
    x: av.x,
    y: av.y,
    dx: dir.x,
    dy: dir.y,
    left: Math.min(d, B.FLARE_RANGE),
    burn: B.FLARE_BURN,
    seen: [],
  };
  it.flares.push(flare);
  state.events.push({ type: 'flare' });
}

export function stepInsideBolts(state, it, dt) {
  const spark = (b, dur) => it.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur });
  for (const b of it.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (solidAt(it, b.x, b.y)) {
      b.ttl = 0;
      spark(b, 0.12);
      continue;
    }
    if (b.owner === 'crew') {
      const guard = it.guards.find((g) => !g.down && dist(g.x, g.y, b.x, b.y) < 6.5);
      const e = guard || it.turrets.find((t) => dist(t.x, t.y, b.x, b.y) < 7.5);
      if (!e) continue;
      b.ttl = 0;
      if (b.tranq) {
        // A dart only works on a guard, and not on a drone. A heavy guard sleeps for a shorter while. It falls
        // asleep where it stands, and nobody hears it.
        if (guard && kindOf(guard).sleep > 0) {
          guard.sleep = B.TRANQ_SLEEP * kindOf(guard).sleep;
          guard.mode = 'idle';
          guard.path = [];
          state.events.push({ type: 'guardAsleep' });
        }
        continue;
      }
      if (guard || !it.mood) e.hp -= b.dmg;
      spark(b, 0.15);
      // A guard that is shot wakes if it slept, and knows roughly where the shot came from.
      if (guard) {
        guard.sleep = 0;
        alertGuard(guard, guard.mode === 'alert' ? guard.seen : { x: b.x - b.vx * 0.2, y: b.y - b.vy * 0.2 });
      }
      continue;
    }
    const av = it.avatars.find((a) => dist(a.x, a.y, b.x, b.y) < 6);
    const sentry = it.sentries.find((x) => dist(x.x, x.y, b.x, b.y) < 7);
    if (av) {
      b.ttl = 0;
      hurtAvatar(state, it, av, b.dmg);
    } else if (sentry) {
      b.ttl = 0;
      sentry.hp -= b.dmg;
      spark(b, 0.15);
    }
  }
  it.bolts = it.bolts.filter((b) => b.ttl > 0);
}

// A grenade flies to where it was thrown, lies there for a moment and goes off.
export function stepGrenades(state, it, dt) {
  for (const g of it.grenades) {
    if (g.t < g.dur) {
      g.t = Math.min(g.dur, g.t + dt);
      const u = g.t / g.dur;
      g.x = g.sx + (g.tx - g.sx) * u;
      g.y = g.sy + (g.ty - g.sy) * u;
      continue;
    }
    g.fuse -= dt;
    if (g.fuse > 0) continue;
    explode(state, it, g);
    g.done = true;
  }
  it.grenades = it.grenades.filter((g) => !g.done);
}

// A flare in the air bounces off the walls and loses half of what is left of its way each time. It burns
// from the moment it is thrown, and is gone when it has burnt out.
export function stepFlares(it, dt) {
  for (const f of it.flares) {
    f.burn -= dt;
    if (f.left <= 0) continue;
    const step = Math.min(f.left, B.FLARE_SPEED * dt);
    f.left -= step;
    const hitX = solidAt(it, f.x + f.dx * step, f.y),
      hitY = solidAt(it, f.x, f.y + f.dy * step),
      corner = !hitX && !hitY && solidAt(it, f.x + f.dx * step, f.y + f.dy * step);
    if (hitX || corner) f.dx = -f.dx;
    if (hitY || corner) f.dy = -f.dy;
    if (hitX || hitY || corner) f.left *= 0.5;
    else {
      f.x += f.dx * step;
      f.y += f.dy * step;
    }
  }
  it.flares = it.flares.filter((f) => f.burn > 0);
}

export function clearFallen(state, it) {
  for (const e of [...it.guards, ...it.turrets]) {
    if (e.hp > 0) continue;
    it.fx.push({ type: 'boom', x: e.x, y: e.y, t: 0, dur: 0.4, size: 14 });
    state.events.push({ type: 'guardDown' });
  }
  it.guards = it.guards.filter((g) => g.hp > 0);
  it.turrets = it.turrets.filter((t) => t.hp > 0);
  it.sentries = it.sentries.filter((x) => x.hp > 0);
}
