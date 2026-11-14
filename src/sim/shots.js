// Shots in flight, and the frigate bumping into things.
import { B, SHIP_GEOM } from './balance.js';
import { damageShip } from './damage.js';
import { hurtVessel, classOf } from './vessels.js';
import { boltHitsStation } from './stations.js';
import { has } from './upgrades.js';
import { forward, headingTo, turnToward, toWorld, dist, rand } from './util.js';

// What happens when the crew's shots hit a thing, for the kinds that care.
const WHEN_SHOT = { station: boltHitsStation };
const spark = (state, b, dur) => state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur });

function boltMeetsShips(state, b) {
  const ship = state.ship;
  if (b.owner === 'player') {
    for (const v of state.vessels) {
      if (v.hp <= 0 || dist(b.x, b.y, v.x, v.y) >= classOf(v).radius) continue;
      b.ttl = 0;
      spark(state, b, 0.2);
      hurtVessel(state, v, b.dmg);
      return;
    }
    return;
  }
  // Point defense gets one try at each shot that comes close.
  if (has(ship, 'pd') && !b.pd && dist(b.x, b.y, ship.x, ship.y) < B.PD_RANGE) {
    b.pd = true;
    if (rand(state) < B.PD_CHANCE) {
      b.ttl = 0;
      state.fx.push({ type: 'shield', x: b.x, y: b.y, t: 0, dur: 0.2 });
      state.events.push({ type: 'pdHit' });
      return;
    }
  }
  if (!state.over && dist(b.x, b.y, ship.x, ship.y) < B.SHIP_RADIUS) {
    b.ttl = 0;
    damageShip(state, b.dmg, { x: b.x, y: b.y });
    return;
  }
  for (const d of state.darts) {
    if (dist(b.x, b.y, d.x, d.y) >= 8) continue;
    b.ttl = 0;
    d.hp -= b.dmg;
    spark(state, b, 0.15);
    return;
  }
}

function boltMeetsThings(state, b, solids) {
  for (const c of solids) {
    if (Math.abs(b.x - c.x) >= c.r || Math.abs(b.y - c.y) >= c.r || dist(b.x, b.y, c.x, c.y) >= c.r) continue;
    // Hostile station guns sit on the ring, so their own shots must be able to leave.
    if (c.thing.kind === 'station' && b.owner === 'pirate') continue;
    b.ttl = 0;
    spark(state, b, 0.15);
    const react = WHEN_SHOT[c.thing.kind];
    if (react && b.owner === 'player') react(state, c.thing, b);
    return;
  }
}

export function stepBolts(state, dt, solids) {
  for (const b of state.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    boltMeetsShips(state, b);
    if (b.ttl > 0) boltMeetsThings(state, b, solids);
  }
  state.bolts = state.bolts.filter((b) => b.ttl > 0);
}

export function stepRockets(state, dt, solids) {
  for (const r of state.rockets) {
    r.ttl -= dt;
    const target = r.target !== null ? state.vessels.find((v) => v.id === r.target && v.hp > 0) : null;
    if (target) r.heading = turnToward(r.heading, headingTo(target.x - r.x, target.y - r.y), B.ROCKET_TURN * dt);
    const f = forward(r.heading);
    r.vx = f.x * B.ROCKET_SPEED;
    r.vy = f.y * B.ROCKET_SPEED;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    const near = state.vessels.some((v) => dist(v.x, v.y, r.x, r.y) < classOf(v).radius + 6);
    const wall = solids.some((c) => dist(c.x, c.y, r.x, r.y) < c.r);
    if (r.ttl > 0 && !near && !wall) continue;
    r.ttl = 0;
    state.fx.push({ type: 'boom', x: r.x, y: r.y, t: 0, dur: 0.5, size: B.ROCKET_RADIUS });
    for (const v of state.vessels) {
      if (dist(v.x, v.y, r.x, r.y) < B.ROCKET_RADIUS + classOf(v).radius) hurtVessel(state, v, B.ROCKET_DMG);
    }
    state.events.push({ type: 'rocketHit' });
  }
  state.rockets = state.rockets.filter((r) => r.ttl > 0);
}

// The frigate cannot fly through solid things, and hitting them hard hurts.
export function stepCollisions(state, dt, solids) {
  const ship = state.ship;
  ship.ramCooldown = Math.max(0, ship.ramCooldown - dt);
  if (ship.docked) return;
  for (const h of SHIP_GEOM.hit) {
    for (const c of solids) {
      const p = toWorld(ship, h);
      const d = dist(p.x, p.y, c.x, c.y);
      const min = c.r + h.r;
      if (d >= min || d < 0.001) continue;
      const nx = (p.x - c.x) / d;
      const ny = (p.y - c.y) / d;
      ship.x += nx * (min - d);
      ship.y += ny * (min - d);
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn >= 0) continue;
      ship.vx -= vn * nx;
      ship.vy -= vn * ny;
      if (-vn > B.RAM_SPEED && ship.ramCooldown <= 0) {
        ship.ramCooldown = 1;
        damageShip(state, (-vn - B.RAM_SPEED) * B.RAM_DMG + 2, { x: p.x - nx * h.r, y: p.y - ny * h.r });
      }
    }
  }
}
