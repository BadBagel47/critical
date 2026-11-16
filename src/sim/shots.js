// Shots in flight, and the frigate bumping into things. A shot carries the side that fired it.
// Everyone's shots hit their enemies. The crew's shots also hit those who are not enemies, but only when all
// is calm around them: a stray shot in the middle of a fight passes by.
import { B, SHIP_GEOM } from './balance.js';
import { damageShip } from './damage.js';
import { CREW, enemies } from './sides.js';
import { hurtVessel, classOf, struckByCrew } from './vessels.js';
import { damageStation, struckBy } from './stations.js';
import { hurtRock } from './rocks.js';
import { has } from './upgrades.js';
import { forward, headingTo, turnToward, toWorld, dist, rand } from './util.js';

const spark = (state, b, dur) => state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur });

function boltMeetsFrigate(state, b) {
  const ship = state.ship;
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
    damageShip(state, b.dmg, { x: b.x, y: b.y }, true);
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

function boltMeetsShips(state, b) {
  for (const v of state.vessels) {
    if (v.hp <= 0 || dist(b.x, b.y, v.x, v.y) >= classOf(v).radius) continue;
    if (b.side === CREW ? !struckByCrew(state, v) : !enemies(state, b.side, v.side)) continue;
    b.ttl = 0;
    spark(state, b, 0.2);
    // The crew's shots hit the ship that the Captain has marked a little harder.
    const marked = b.side === CREW && state.marks.captain === v.id;
    hurtVessel(state, v, b.dmg * (marked ? B.MARK_BONUS : 1), b.side);
    return;
  }
  if (enemies(state, b.side, CREW)) boltMeetsFrigate(state, b);
}

function boltMeetsThings(state, b, solids) {
  for (const c of solids) {
    if (Math.abs(b.x - c.x) >= c.r || Math.abs(b.y - c.y) >= c.r || dist(b.x, b.y, c.x, c.y) >= c.r) continue;
    const station = c.thing.kind === 'station' ? c.thing : null;
    // A station lets through the shots that are not meant for it, those of its own guns among them.
    if (station && !struckBy(state, station, b.side)) continue;
    b.ttl = 0;
    spark(state, b, 0.15);
    if (station) damageStation(state, station, b.dmg, b, b.side);
    else if (c.thing.kind === 'rock') hurtRock(state, c.thing, b.dmg);
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
    const near = state.vessels.some((v) => dist(v.x, v.y, r.x, r.y) < classOf(v).radius + 6 && struckByCrew(state, v));
    const wall = solids.find((c) => dist(c.x, c.y, r.x, r.y) < c.r);
    if (r.ttl > 0 && !near && !wall) continue;
    r.ttl = 0;
    state.fx.push({ type: 'boom', x: r.x, y: r.y, t: 0, dur: 0.5, size: B.ROCKET_RADIUS });
    for (const v of state.vessels) {
      if (dist(v.x, v.y, r.x, r.y) >= B.ROCKET_RADIUS + classOf(v).radius) continue;
      if (struckByCrew(state, v)) hurtVessel(state, v, B.ROCKET_DMG, CREW);
    }
    const station = wall && wall.thing.kind === 'station' ? wall.thing : null;
    if (station && struckBy(state, station, CREW)) damageStation(state, station, B.ROCKET_DMG, r, CREW);
    for (const c of solids) {
      if (c.thing.kind === 'rock' && dist(c.x, c.y, r.x, r.y) < B.ROCKET_RADIUS + c.r)
        hurtRock(state, c.thing, B.ROCKET_DMG);
    }
    state.events.push({ type: 'rocketHit' });
  }
  state.rockets = state.rockets.filter((r) => r.ttl > 0);
}

// Asteroids are the only things the frigate cannot fly through, and hitting them hard hurts. It passes over
// stations, wrecks and other ships.
export function stepCollisions(state, dt, solids) {
  const ship = state.ship;
  ship.ramCooldown = Math.max(0, ship.ramCooldown - dt);
  if (ship.docked) return;
  for (const h of SHIP_GEOM.hit) {
    for (const c of solids) {
      if (c.thing.kind !== 'rock') continue;
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
