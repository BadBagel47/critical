// The simulation step. Pure logic: no DOM, no rendering. Each post sends a command object,
// or null when nobody is at that post, in which case the post keeps running as it was set.
import { B, SHIP_GEOM, WRECK_GEOM } from './balance.js';
import { nodeStatus } from './state.js';
import { clamp, forward, headingTo, angleDiff, turnToward, toWorld, dist, rand, randRange, TAU } from './util.js';
import { stepBoarding, anyoneInside } from './boarding.js';
import { damageShip } from './damage.js';
export { damageShip };

// ---------- derived values ----------
export function nodeFactor(ship, id) {
  const n = ship.nodes.find((x) => x.id === id);
  return B.NODE_FACTOR[nodeStatus(n.hp)];
}
export function powerAvailable(ship) {
  const st = nodeStatus(ship.nodes.find((n) => n.id === 'reactor').hp);
  return B.POWER_TOTAL - (st === 'critical' ? 2 : st === 'damaged' ? 1 : 0);
}
export const powerUsed = (ship) => B.SYSTEMS.reduce((a, k) => a + ship.power[k], 0);
export const speedOf = (b) => Math.hypot(b.vx, b.vy);
export const wreckPort = (w) => toWorld(w, WRECK_GEOM.port);
export const shipNose = (ship) => toWorld(ship, SHIP_GEOM.nose);
export function fireInterval(ship) {
  const p = B.WEAPON_POWER[ship.power.weapons] * nodeFactor(ship, 'bow');
  return p > 0 ? B.FIRE_INTERVAL / p : Infinity;
}
// The wreck the ship could dock with right now, if any.
export function dockCandidate(state) {
  const ship = state.ship;
  if (ship.docked || speedOf(ship) > B.DOCK_SPEED) return null;
  const nose = shipNose(ship);
  for (const w of state.wrecks) {
    const p = wreckPort(w);
    if (dist(nose.x, nose.y, p.x, p.y) <= B.DOCK_RANGE) return w;
  }
  return null;
}

// ---------- posts ----------
function stepCaptain(state, cmd, dt) {
  const ship = state.ship;
  let turnInput = 0;
  if (cmd) {
    if (cmd.stop) ship.throttle = 0;
    else if (cmd.throttle) ship.throttle = clamp(ship.throttle + cmd.throttle * B.THROTTLE_RATE * dt, -B.REVERSE, 1);
    turnInput = clamp(cmd.turn || 0, -1, 1);
    if (cmd.dock) {
      if (ship.docked && anyoneInside(state, ship.docked)) {
        state.events.push({ type: 'crewInside' });
      } else if (ship.docked) {
        const w = state.wrecks.find((x) => x.id === ship.docked);
        ship.docked = null;
        for (const p of state.players) p.lockedOut = null;
        const f = forward(ship.heading);
        ship.vx = -f.x * 14; ship.vy = -f.y * 14;
        state.events.push({ type: 'undock', wreck: w && w.id });
      } else {
        const w = dockCandidate(state);
        if (w) {
          ship.docked = w.id; ship.vx = 0; ship.vy = 0; ship.throttle = 0; ship.turn = 0;
          state.events.push({ type: 'dock', wreck: w.id });
        }
      }
    }
  }
  if (ship.docked) return;
  let eng = B.ENGINE_POWER[ship.power.engines] * nodeFactor(ship, 'engines');
  ship.fuel = Math.max(0, ship.fuel - B.FUEL_BURN * Math.abs(ship.throttle) * B.ENGINE_POWER[ship.power.engines] * dt);
  if (ship.fuel <= 0) eng *= B.ADRIFT_FACTOR;
  ship.turn += (turnInput - ship.turn) * Math.min(1, B.TURN_SMOOTH * dt);
  ship.heading = (ship.heading + ship.turn * B.TURN_RATE * nodeFactor(ship, 'bridge') * dt + TAU) % TAU;
  const f = forward(ship.heading), a = B.ACCEL * eng * ship.throttle;
  ship.vx += f.x * a * dt; ship.vy += f.y * a * dt;
  const drag = Math.exp(-B.DRAG * dt);
  ship.vx *= drag; ship.vy *= drag;
  ship.x += ship.vx * dt; ship.y += ship.vy * dt;
}

function stepGunner(state, cmd, dt) {
  const ship = state.ship;
  const mount = toWorld(ship, SHIP_GEOM.turret);
  ship.firing = false;
  if (cmd && cmd.aim) {
    const want = headingTo(cmd.aim.x - mount.x, cmd.aim.y - mount.y);
    ship.turretAngle = turnToward(ship.turretAngle, want, B.TURRET_SLEW * dt);
  }
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  if (cmd && cmd.fire) {
    const interval = fireInterval(ship);
    if (interval === Infinity) { state.events.push({ type: 'weaponsOffline' }); return; }
    ship.firing = true;
    if (ship.fireCooldown <= 0) {
      const d = forward(ship.turretAngle + randRange(state, -0.012, 0.012));
      state.bolts.push({ x: mount.x + d.x * 9, y: mount.y + d.y * 9, vx: d.x * B.BOLT_SPEED + ship.vx, vy: d.y * B.BOLT_SPEED + ship.vy, ttl: B.BOLT_TTL, owner: 'player', dmg: B.BOLT_DMG });
      ship.fireCooldown = interval;
      state.events.push({ type: 'shot' });
    }
  }
}

export function setPower(state, sys, delta) {
  const ship = state.ship;
  if (!B.SYSTEMS.includes(sys)) return false;
  const next = clamp(ship.power[sys] + delta, 0, B.POWER_MAX_PER_SYSTEM);
  if (next === ship.power[sys]) return false;
  if (next > ship.power[sys] && powerUsed(ship) + (next - ship.power[sys]) > powerAvailable(ship)) {
    state.events.push({ type: 'noPower' });
    return false;
  }
  ship.power[sys] = next;
  return true;
}

function stepEngineer(state, cmd, dt) {
  const ship = state.ship, crew = ship.crew;
  if (cmd) {
    for (const p of cmd.power || []) setPower(state, p.sys, p.delta);
    if (cmd.repair && ship.nodes[cmd.repair.node]) {
      const i = cmd.repair.node;
      if (!cmd.repair.queue) crew.queue = [i];
      else if (!crew.queue.includes(i) && crew.queue.length < 3) crew.queue.push(i);
    }
  }
  // A damaged reactor takes power away. Drop it from the fullest system first.
  while (powerUsed(ship) > powerAvailable(ship)) {
    const order = ['repair', 'engines', 'weapons', 'shields'];
    const sys = order.reduce((best, k) => (ship.power[k] > ship.power[best] ? k : best), order[0]);
    ship.power[sys]--;
    state.events.push({ type: 'powerLost', sys });
  }
  const rate = B.REPAIR_RATE[ship.power.repair];
  if (crew.moving) {
    crew.moving.t += dt;
    if (crew.moving.t >= crew.moving.dur) { crew.at = crew.moving.to; crew.moving = null; }
    return;
  }
  if (crew.queue.length) {
    const target = crew.queue[0];
    if (target !== crew.at) {
      const a = ship.nodes[crew.at], b = ship.nodes[target];
      crew.moving = { from: crew.at, to: target, t: 0, dur: Math.max(0.4, dist(a.x, a.y, b.x, b.y) / B.CREW_SPEED) };
      return;
    }
    const node = ship.nodes[target];
    node.hp = Math.min(100, node.hp + rate * dt);
    ship.hull = Math.min(B.HULL_MAX, ship.hull + rate * B.HULL_REPAIR_SHARE * dt);
    if (node.hp >= 100) { crew.queue.shift(); state.events.push({ type: 'repaired', node: node.id }); }
  } else {
    // With nothing queued the crew patches the hull slowly.
    ship.hull = Math.min(B.HULL_MAX, ship.hull + rate * B.HULL_REPAIR_SHARE * dt);
  }
}

// ---------- pirates ----------
function spawnWave(state) {
  const ship = state.ship;
  state.spawn.wave++;
  const n = Math.min(1 + Math.floor(state.spawn.wave / 3), 3);
  const a = rand(state) * TAU;
  for (let i = 0; i < n && state.pirates.length < B.MAX_PIRATES; i++) {
    const d = randRange(state, 520, 620), aa = a + i * 0.25;
    const x = ship.x + Math.sin(aa) * d, y = ship.y - Math.cos(aa) * d;
    state.pirates.push({ id: state.nextId++, kind: 'fighter', x, y, vx: 0, vy: 0, heading: headingTo(ship.x - x, ship.y - y), hp: B.FIGHTER_HP, mode: 'approach', timer: 0, burst: 0, burstTimer: 0, cool: randRange(state, 0.3, 1.2), side: rand(state) < 0.5 ? -1 : 1 });
  }
  state.events.push({ type: 'wave', count: n });
}

function stepPirates(state, dt) {
  const ship = state.ship;
  state.spawn.timer -= dt;
  if (state.spawn.timer <= 0) {
    if (state.pirates.length < B.MAX_PIRATES) spawnWave(state);
    state.spawn.timer = Math.max(B.WAVE_INTERVAL_MIN, B.WAVE_INTERVAL - state.spawn.wave * 1.5);
  }
  for (const p of state.pirates) {
    const dx = ship.x - p.x, dy = ship.y - p.y, d = Math.hypot(dx, dy);
    const lead = Math.min(1.2, d / B.PIRATE_BOLT_SPEED) * 0.8;
    let want = headingTo(dx + ship.vx * lead, dy + ship.vy * lead), speed = B.FIGHTER_SPEED;
    if (p.mode === 'approach') {
      if (d < 340) p.mode = 'attack';
    } else if (p.mode === 'attack') {
      speed = B.FIGHTER_ATTACK_SPEED;
      if (d < 85) { p.mode = 'breakoff'; p.timer = randRange(state, 1.3, 2.2); p.side = rand(state) < 0.5 ? -1 : 1; }
      else if (d > 420) p.mode = 'approach';
    } else {
      speed = B.FIGHTER_ATTACK_SPEED;
      want = headingTo(-dx, -dy) + p.side * 0.7;
      p.timer -= dt;
      if (p.timer <= 0) p.mode = 'approach';
    }
    // Keep some distance to other pirates.
    for (const o of state.pirates) {
      if (o === p) continue;
      const od = dist(o.x, o.y, p.x, p.y);
      if (od < 44 && od > 0.01) want += angleDiff(headingTo(p.x - o.x, p.y - o.y), want) * 0.35;
    }
    p.heading = turnToward(p.heading, want, B.FIGHTER_TURN * dt);
    const f = forward(p.heading);
    p.vx = f.x * speed; p.vy = f.y * speed;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // Firing: a short burst when lined up.
    p.cool -= dt;
    const aimErr = Math.abs(angleDiff(headingTo(dx + ship.vx * lead, dy + ship.vy * lead), p.heading));
    if (p.mode === 'attack' && p.burst === 0 && p.cool <= 0 && aimErr < 0.12 && d < 310 && !state.over) { p.burst = B.PIRATE_BURST; p.burstTimer = 0; }
    if (p.burst > 0) {
      p.burstTimer -= dt;
      if (p.burstTimer <= 0) {
        state.bolts.push({ x: p.x + f.x * 14, y: p.y + f.y * 14, vx: f.x * B.PIRATE_BOLT_SPEED, vy: f.y * B.PIRATE_BOLT_SPEED, ttl: B.PIRATE_BOLT_TTL, owner: 'pirate', dmg: B.PIRATE_BOLT_DMG });
        p.burst--; p.burstTimer = B.PIRATE_BURST_GAP;
        if (p.burst === 0) p.cool = B.PIRATE_COOLDOWN;
        state.events.push({ type: 'pirateShot' });
      }
    }
  }
}

// ---------- bolts and collisions ----------
function solidCircles(state) {
  const out = [];
  for (const r of state.rocks) out.push({ x: r.x, y: r.y, r: r.r });
  for (const w of state.wrecks) for (const c of WRECK_GEOM.circles) { const p = toWorld(w, c); out.push({ x: p.x, y: p.y, r: c.r, wreck: w.id }); }
  return out;
}

function stepBolts(state, dt, solids) {
  const ship = state.ship;
  for (const b of state.bolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (b.owner === 'player') {
      for (const p of state.pirates) {
        if (p.hp > 0 && dist(b.x, b.y, p.x, p.y) < B.FIGHTER_RADIUS) {
          p.hp -= b.dmg; b.ttl = 0;
          state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.2 });
          if (p.hp <= 0) {
            state.kills++;
            state.fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, dur: 0.7, size: 26 });
            state.events.push({ type: 'kill', id: p.id });
          }
          break;
        }
      }
    } else if (!state.over && dist(b.x, b.y, ship.x, ship.y) < B.SHIP_RADIUS) {
      b.ttl = 0;
      damageShip(state, b.dmg, { x: b.x, y: b.y });
    }
    if (b.ttl > 0) {
      for (const c of solids) {
        if (Math.abs(b.x - c.x) < c.r && Math.abs(b.y - c.y) < c.r && dist(b.x, b.y, c.x, c.y) < c.r) {
          b.ttl = 0; state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.15 }); break;
        }
      }
    }
  }
  state.bolts = state.bolts.filter((b) => b.ttl > 0);
  state.pirates = state.pirates.filter((p) => p.hp > 0);
}

function stepCollisions(state, dt, solids) {
  const ship = state.ship;
  ship.ramCooldown = Math.max(0, ship.ramCooldown - dt);
  if (ship.docked) return;
  for (const h of SHIP_GEOM.hit) {
    for (const c of solids) {
      const p = toWorld(ship, h), d = dist(p.x, p.y, c.x, c.y), min = c.r + h.r;
      if (d >= min || d < 0.001) continue;
      const nx = (p.x - c.x) / d, ny = (p.y - c.y) / d;
      ship.x += nx * (min - d); ship.y += ny * (min - d);
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn < 0) {
        ship.vx -= vn * nx; ship.vy -= vn * ny;
        if (-vn > B.RAM_SPEED && ship.ramCooldown <= 0) {
          ship.ramCooldown = 1;
          damageShip(state, (-vn - B.RAM_SPEED) * B.RAM_DMG + 2, { x: p.x - nx * h.r, y: p.y - ny * h.r });
        }
      }
    }
  }
}

// ---------- main entry ----------
export function step(state, cmds, dt) {
  const sys = (cmds && cmds.system) || {};
  if (sys.pause) {
    state.paused = !state.paused;
    state.pausedBy = state.paused ? sys.by || 'PLAYER 1' : null;
  }
  if (state.paused) return state;
  state.time += dt;
  for (const f of state.fx) f.t += dt;
  state.fx = state.fx.filter((f) => f.t < f.dur);
  if (state.over) {
    // The world keeps moving after the ship is lost, but nothing can be controlled.
    stepPirates(state, dt);
    stepBolts(state, dt, solidCircles(state));
    return state;
  }
  const ship = state.ship;
  stepCaptain(state, cmds && cmds.captain, dt);
  stepEngineer(state, cmds && cmds.engineer, dt);
  stepGunner(state, cmds && cmds.gunner, dt);
  stepPirates(state, dt);
  const solids = solidCircles(state);
  stepCollisions(state, dt, solids);
  stepBolts(state, dt, solids);
  stepBoarding(state, cmds, dt);
  if (state.time - ship.lastHit > B.SHIELD_DELAY) {
    const emit = (nodeFactor(ship, 'port') + nodeFactor(ship, 'starboard')) / 2;
    ship.shield = Math.min(B.SHIELD_MAX, ship.shield + B.SHIELD_RECHARGE[ship.power.shields] * emit * dt);
  }
  return state;
}
