// The simulation step. Pure logic: no DOM, no rendering. Each post sends a command object,
// or null when nobody is at that post, in which case the post keeps running as it was set.
import { B, SHIP_GEOM, WRECK_GEOM, CRUISER_GEOM, WING_MOUNTS } from './balance.js';
import { nodeStatus } from './state.js';
import { clamp, forward, headingTo, angleDiff, turnToward, toWorld, dist, rand, randRange, TAU } from './util.js';
import { stepBoarding, teleportAllHome } from './boarding.js';
import { damageShip } from './damage.js';
import { stepMap, useTool } from './map.js';
import { dockTargets, findDock, portsOf } from './dock.js';
import { has, level, hullMax, shieldMax, powerTotal } from './upgrades.js';
import { stepStations, boltHitsStation } from './stations.js';
import { stepDarts } from './darts.js';
import { stepJump, currentSector, createWreck, makePirate } from './sectors.js';
export { damageShip };

// ---------- derived values ----------
export function nodeFactor(ship, id) {
  const n = ship.nodes.find((x) => x.id === id);
  return B.NODE_FACTOR[nodeStatus(n.hp)];
}
export function powerAvailable(ship) {
  const st = nodeStatus(ship.nodes.find((n) => n.id === 'reactor').hp);
  return powerTotal(ship) - (st === 'critical' ? 2 : st === 'damaged' ? 1 : 0);
}
export const powerUsed = (ship) => B.SYSTEMS.reduce((a, k) => a + ship.power[k], 0);
export const speedOf = (b) => Math.hypot(b.vx, b.vy);
export const wreckPort = (w) => toWorld(w, WRECK_GEOM.port);
export const shipNose = (ship) => toWorld(ship, SHIP_GEOM.nose);
export const weaponPower = (ship) => B.WEAPON_POWER[ship.power.weapons] * nodeFactor(ship, 'bow');
export function fireInterval(ship) {
  const p = weaponPower(ship);
  return p > 0 ? B.FIRE_INTERVAL / p : Infinity;
}
export const weaponsOf = (ship) => [
  'pulse',
  ...(has(ship, 'heavy') ? ['heavy'] : []),
  ...(has(ship, 'rockets') ? ['rockets'] : []),
];
export const pirateRadius = (p) =>
  p.kind === 'cruiser' ? B.CRUISER_RADIUS : p.kind === 'gunboat' ? B.GUNBOAT_RADIUS : B.FIGHTER_RADIUS;
// The wreck or station the ship could dock with right now, if any.
export function dockCandidate(state) {
  const ship = state.ship;
  if (ship.docked || speedOf(ship) > B.DOCK_SPEED) return null;
  const nose = shipNose(ship);
  for (const t of dockTargets(state))
    for (const p of portsOf(t)) if (dist(nose.x, nose.y, p.x, p.y) <= B.DOCK_RANGE) return t;
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
      if (ship.docked) {
        const id = ship.docked;
        // Undocking with people still inside teleports them home. They lose what they carry.
        const recalled = teleportAllHome(state, id);
        if (recalled) state.events.push({ type: 'recalled', count: recalled });
        ship.docked = null;
        for (const p of state.players) p.lockedOut = null;
        const f = forward(ship.heading);
        ship.vx = -f.x * 14;
        ship.vy = -f.y * 14;
        state.events.push({ type: 'undock', target: id });
      } else {
        const t = dockCandidate(state);
        if (t) {
          ship.docked = t.id;
          ship.vx = 0;
          ship.vy = 0;
          ship.throttle = 0;
          ship.turn = 0;
          state.events.push({ type: 'dock', target: t.id, kind: t.kind });
        }
      }
    }
  }
  if (ship.docked) return;
  let eng = B.ENGINE_POWER[ship.power.engines] * nodeFactor(ship, 'engines');
  // The afterburner trades fuel for speed while it is held.
  ship.boosting = !!(cmd && cmd.boost && has(ship, 'boost') && ship.fuel > 0 && ship.throttle > 0);
  if (ship.boosting) eng *= B.BOOST_POWER;
  ship.fuel = Math.max(
    0,
    ship.fuel -
      B.FUEL_BURN *
        Math.abs(ship.throttle) *
        B.ENGINE_POWER[ship.power.engines] *
        (ship.boosting ? B.BOOST_BURN : 1) *
        dt,
  );
  if (ship.fuel <= 0) eng *= B.ADRIFT_FACTOR;
  ship.turn += (turnInput - ship.turn) * Math.min(1, B.TURN_SMOOTH * dt);
  ship.heading = (ship.heading + ship.turn * B.TURN_RATE * nodeFactor(ship, 'bridge') * dt + TAU) % TAU;
  const f = forward(ship.heading),
    a = B.ACCEL * eng * ship.throttle;
  ship.vx += f.x * a * dt;
  ship.vy += f.y * a * dt;
  const drag = Math.exp(-B.DRAG * dt);
  ship.vx *= drag;
  ship.vy *= drag;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}

// Damage a pirate, and handle what happens when it is destroyed.
export function hurtPirate(state, p, dmg) {
  if (p.hp <= 0) return;
  p.hp -= dmg;
  if (p.hp > 0) return;
  state.kills++;
  state.credits += B.BOUNTY[p.kind] || 0;
  state.fx.push({
    type: 'boom',
    x: p.x,
    y: p.y,
    t: 0,
    dur: p.kind === 'cruiser' ? 1.6 : 0.7,
    size: p.kind === 'cruiser' ? 110 : p.kind === 'gunboat' ? 40 : 26,
  });
  state.events.push({ type: 'kill', id: p.id, kind: p.kind, bounty: B.BOUNTY[p.kind] || 0 });
  // A destroyed gunboat is left drifting as a wreck that can be boarded.
  if (p.kind === 'gunboat' && state.wrecks.length < B.MAX_WRECKS) {
    const w = createWreck(state, p.x, p.y, Math.min(3, 1 + currentSector(state).tier));
    w.heading = p.heading;
    state.wrecks.push(w);
  }
  if (p.kind === 'cruiser') {
    state.won = true;
    state.events.push({ type: 'won' });
  }
  // Destroyed pirates sometimes leave salvage drifting where they died.
  const drops = p.kind === 'cruiser' ? 6 : p.kind === 'gunboat' ? 2 : rand(state) < 0.35 ? 1 : 0;
  for (let i = 0; i < drops; i++) {
    const value =
      Math.round(
        randRange(state, p.kind === 'fighter' ? 10 : 20, p.kind === 'cruiser' ? 80 : p.kind === 'gunboat' ? 40 : 25) /
          5,
      ) * 5;
    state.salvage.push({
      id: state.nextId++,
      x: p.x + randRange(state, -16, 16),
      y: p.y + randRange(state, -16, 16),
      value,
      ttl: B.SALVAGE_TTL,
    });
  }
}

// Salvage is collected by flying over it. A tractor beam pulls it in from a distance.
function stepSalvage(state, dt) {
  const ship = state.ship,
    tractor = has(ship, 'tractor');
  for (const c of state.salvage) {
    c.ttl -= dt;
    const d = dist(c.x, c.y, ship.x, ship.y);
    c.pulled = tractor && d < B.TRACTOR_RANGE;
    if (c.pulled && d > 1) {
      c.x += ((ship.x - c.x) / d) * B.TRACTOR_PULL * dt;
      c.y += ((ship.y - c.y) / d) * B.TRACTOR_PULL * dt;
    }
    if (d < B.SALVAGE_PICKUP) {
      c.ttl = 0;
      state.credits += c.value;
      state.events.push({ type: 'salvage', value: c.value });
    }
  }
  state.salvage = state.salvage.filter((c) => c.ttl > 0);
}

function fireHeavy(state) {
  const ship = state.ship,
    nose = shipNose(ship),
    f = forward(ship.heading);
  const end = { x: nose.x + f.x * B.HEAVY_RANGE, y: nose.y + f.y * B.HEAVY_RANGE };
  state.beams.push({ x0: nose.x, y0: nose.y, x1: end.x, y1: end.y, t: 0, dur: 0.3 });
  const along = (x, y) => (x - nose.x) * f.x + (y - nose.y) * f.y,
    across = (x, y) => Math.abs((x - nose.x) * f.y - (y - nose.y) * f.x);
  for (const p of state.pirates)
    if (
      along(p.x, p.y) > 0 &&
      along(p.x, p.y) < B.HEAVY_RANGE &&
      across(p.x, p.y) < B.HEAVY_WIDTH / 2 + pirateRadius(p)
    )
      hurtPirate(state, p, B.HEAVY_DMG);
  for (const st of state.stations)
    for (const g of st.guns) {
      const w = toWorld(st, g);
      if (g.hp > 0 && along(w.x, w.y) > 0 && along(w.x, w.y) < B.HEAVY_RANGE && across(w.x, w.y) < 14) {
        g.hp -= B.HEAVY_DMG;
        state.fx.push({ type: 'boom', x: w.x, y: w.y, t: 0, dur: 0.5, size: 16 });
      }
    }
  state.events.push({ type: 'heavyShot' });
}

function stepGunner(state, cmd, dt) {
  const ship = state.ship;
  const mount = toWorld(ship, SHIP_GEOM.turret);
  ship.firing = false;
  const weapons = weaponsOf(ship);
  if (!weapons.includes(ship.weapon)) ship.weapon = 'pulse';
  if (cmd && cmd.weapon) {
    const next =
      typeof cmd.weapon === 'number'
        ? weapons[(weapons.indexOf(ship.weapon) + cmd.weapon + weapons.length) % weapons.length]
        : cmd.weapon;
    if (weapons.includes(next) && next !== ship.weapon) {
      ship.weapon = next;
      ship.charge = 0;
    }
  }
  if (cmd && cmd.aim) {
    const want = headingTo(cmd.aim.x - mount.x, cmd.aim.y - mount.y);
    ship.turretAngle = turnToward(ship.turretAngle, want, B.TURRET_SLEW * dt);
  }
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  ship.heavyCool = Math.max(0, ship.heavyCool - dt);
  ship.rocketCool = Math.max(0, ship.rocketCool - dt);
  const power = weaponPower(ship),
    fire = !!(cmd && cmd.fire);
  if (fire && power <= 0) {
    state.events.push({ type: 'weaponsOffline' });
    ship.charge = 0;
    return;
  }
  if (ship.weapon === 'heavy') {
    // Hold to charge, let go to fire. Letting go early wastes the charge.
    if (fire && ship.heavyCool <= 0) {
      ship.firing = true;
      ship.charge = Math.min(1, ship.charge + (dt * power) / B.HEAVY_CHARGE);
    } else {
      if (ship.charge >= 1) {
        fireHeavy(state);
        ship.heavyCool = B.HEAVY_COOLDOWN;
      }
      ship.charge = 0;
    }
    return;
  }
  ship.charge = 0;
  if (!fire) return;
  ship.firing = true;
  if (ship.weapon === 'rockets') {
    if (ship.rocketCool > 0) return;
    if (ship.rockets <= 0) {
      state.events.push({ type: 'noRockets' });
      ship.rocketCool = 0.6;
      return;
    }
    // The rocket goes for the pirate closest to where the gunner is aiming.
    let target = null,
      best = B.ROCKET_LOCK;
    if (cmd.aim)
      for (const p of state.pirates) {
        const d = dist(p.x, p.y, cmd.aim.x, cmd.aim.y);
        if (d < best) {
          best = d;
          target = p;
        }
      }
    const from = toWorld(ship, WING_MOUNTS[ship.rockets % 2]);
    state.rockets.push({
      x: from.x,
      y: from.y,
      heading: ship.turretAngle,
      vx: ship.vx,
      vy: ship.vy,
      ttl: B.ROCKET_TTL,
      target: target ? target.id : null,
    });
    ship.rockets--;
    ship.rocketCool = B.ROCKET_INTERVAL / Math.max(0.5, power);
    state.events.push({ type: 'rocket' });
    return;
  }
  if (ship.fireCooldown <= 0) {
    const shoot = (from, dmg) => {
      const aim = cmd.aim ? headingTo(cmd.aim.x - from.x, cmd.aim.y - from.y) : ship.turretAngle;
      const d = forward((from === mount ? ship.turretAngle : aim) + randRange(state, -0.012, 0.012));
      state.bolts.push({
        x: from.x + d.x * 9,
        y: from.y + d.y * 9,
        vx: d.x * B.BOLT_SPEED + ship.vx,
        vy: d.y * B.BOLT_SPEED + ship.vy,
        ttl: B.BOLT_TTL,
        owner: 'player',
        dmg,
      });
    };
    shoot(mount, B.BOLT_DMG);
    if (has(ship, 'twin')) for (const w of WING_MOUNTS) shoot(toWorld(ship, w), B.WING_BOLT_DMG);
    ship.fireCooldown = B.FIRE_INTERVAL / power;
    state.events.push({ type: 'shot' });
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
  const ship = state.ship,
    crew = ship.crew;
  if (cmd) {
    for (const p of cmd.power || []) setPower(state, p.sys, p.delta);
    if (cmd.tool) useTool(state, cmd.tool);
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
  const rate = B.REPAIR_RATE[ship.power.repair],
    max = hullMax(ship);
  if (crew.moving) {
    crew.moving.t += dt;
    if (crew.moving.t >= crew.moving.dur) {
      crew.at = crew.moving.to;
      crew.moving = null;
    }
    return;
  }
  if (crew.queue.length) {
    const target = crew.queue[0];
    if (target !== crew.at) {
      const a = ship.nodes[crew.at],
        b = ship.nodes[target];
      crew.moving = { from: crew.at, to: target, t: 0, dur: Math.max(0.4, dist(a.x, a.y, b.x, b.y) / B.CREW_SPEED) };
      return;
    }
    const node = ship.nodes[target];
    node.hp = Math.min(100, node.hp + rate * dt);
    ship.hull = Math.min(max, ship.hull + rate * B.HULL_REPAIR_SHARE * dt);
    if (node.hp >= 100) {
      crew.queue.shift();
      state.events.push({ type: 'repaired', node: node.id });
    }
  } else {
    // With nothing queued the crew patches the hull slowly.
    ship.hull = Math.min(max, ship.hull + rate * B.HULL_REPAIR_SHARE * dt);
  }
}

// Repair drones work on their own, whatever the crew is doing.
function stepDrones(state, dt) {
  const ship = state.ship;
  if (!has(ship, 'drones')) return;
  ship.hull = Math.min(hullMax(ship), ship.hull + B.DRONE_HULL * dt);
  const worst = ship.nodes.reduce((b, n) => (n.hp < b.hp ? n : b), ship.nodes[0]);
  if (worst.hp < 100) worst.hp = Math.min(100, worst.hp + B.DRONE_NODE * dt);
}

// ---------- pirates ----------
function spawnWave(state) {
  const ship = state.ship,
    tier = currentSector(state).tier;
  state.spawn.wave++;
  const n = Math.min(1 + Math.floor(state.spawn.wave / 3) + (tier >= 2 ? 1 : 0), 4);
  const a = rand(state) * TAU;
  // From the second sector on, some waves bring a gunboat.
  const gunboat = tier >= 1 && state.spawn.wave >= 2 && rand(state) < 0.2 + 0.12 * tier;
  for (let i = 0; i < n && state.pirates.length < B.MAX_PIRATES; i++) {
    const d = randRange(state, 520, 620),
      aa = a + i * 0.25;
    state.pirates.push(
      makePirate(
        state,
        gunboat && i === 0 ? 'gunboat' : 'fighter',
        ship.x + Math.sin(aa) * d,
        ship.y - Math.cos(aa) * d,
      ),
    );
  }
  state.events.push({ type: 'wave', count: n });
}

function pirateBolt(state, x, y, heading, dmg) {
  const f = forward(heading);
  state.bolts.push({
    x: x + f.x * 14,
    y: y + f.y * 14,
    vx: f.x * B.PIRATE_BOLT_SPEED,
    vy: f.y * B.PIRATE_BOLT_SPEED,
    ttl: B.PIRATE_BOLT_TTL,
    owner: 'pirate',
    dmg,
  });
  state.events.push({ type: 'pirateShot' });
}

function stepPirates(state, dt) {
  const ship = state.ship;
  state.spawn.timer -= dt;
  if (state.spawn.timer <= 0) {
    if (state.pirates.length < B.MAX_PIRATES) spawnWave(state);
    const pace = B.PIRATE_PACE[Math.min(3, state.players.length)] || 1;
    state.spawn.timer = Math.max(B.WAVE_INTERVAL_MIN, B.WAVE_INTERVAL - state.spawn.wave * 1.2) * pace;
  }
  for (const p of state.pirates) {
    // Raiders go for the station they are raiding, unless the ship gets close.
    let tx = ship.x,
      ty = ship.y,
      tvx = ship.vx,
      tvy = ship.vy;
    if (p.raid && state.raid && state.raid.id === p.raid && dist(p.x, p.y, ship.x, ship.y) > 380) {
      const st = state.stations.find((x) => x.id === state.raid.station);
      if (st) {
        tx = st.x;
        ty = st.y;
        tvx = 0;
        tvy = 0;
      }
    }
    const dx = tx - p.x,
      dy = ty - p.y,
      d = Math.hypot(dx, dy);
    const lead = Math.min(1.2, d / B.PIRATE_BOLT_SPEED) * 0.8;
    const aimAt = headingTo(dx + tvx * lead, dy + tvy * lead);
    let want = aimAt,
      speed = B.FIGHTER_SPEED,
      turn = B.FIGHTER_TURN;
    p.cool -= dt;
    if (p.kind === 'gunboat') {
      // Gunboats keep their distance and circle, firing a turret that needs no lining up.
      speed = B.GUNBOAT_SPEED;
      turn = B.GUNBOAT_TURN;
      if (d < 290) want = headingTo(dx, dy) + p.side * 1.5;
      if (p.cool <= 0 && d < B.GUNBOAT_RANGE && !state.over) {
        pirateBolt(state, p.x, p.y, aimAt + randRange(state, -0.05, 0.05), B.GUNBOAT_DMG);
        p.cool = B.GUNBOAT_COOLDOWN;
      }
    } else if (p.kind === 'cruiser') {
      speed = d > 340 ? B.CRUISER_SPEED : B.CRUISER_SPEED * 0.6;
      turn = B.CRUISER_TURN;
      if (d < 340) want = headingTo(dx, dy) + 1.35;
      p.guns = p.guns.map((g, i) => {
        g -= dt;
        if (g <= 0 && d < B.CRUISER_RANGE && !state.over) {
          const m = toWorld(p, CRUISER_GEOM.guns[i]);
          const f = forward(
            headingTo(ship.x + ship.vx * lead - m.x, ship.y + ship.vy * lead - m.y) + randRange(state, -0.04, 0.04),
          );
          state.bolts.push({
            x: m.x + f.x * 8,
            y: m.y + f.y * 8,
            vx: f.x * B.PIRATE_BOLT_SPEED,
            vy: f.y * B.PIRATE_BOLT_SPEED,
            ttl: 2,
            owner: 'pirate',
            dmg: B.CRUISER_DMG,
          });
          return B.CRUISER_COOLDOWN;
        }
        return g;
      });
      p.spawn -= dt;
      if (p.spawn <= 0) {
        p.spawn = B.CRUISER_SPAWN;
        for (let i = 0; i < 2 && state.pirates.length < B.MAX_PIRATES + 2; i++)
          state.pirates.push(makePirate(state, 'fighter', p.x + (i ? 30 : -30), p.y));
      }
    } else {
      if (p.mode === 'approach') {
        if (d < 340) p.mode = 'attack';
      } else if (p.mode === 'attack') {
        speed = B.FIGHTER_ATTACK_SPEED;
        if (d < 85) {
          p.mode = 'breakoff';
          p.timer = randRange(state, 1.3, 2.2);
          p.side = rand(state) < 0.5 ? -1 : 1;
        } else if (d > 420) p.mode = 'approach';
      } else {
        speed = B.FIGHTER_ATTACK_SPEED;
        want = headingTo(-dx, -dy) + p.side * 0.7;
        p.timer -= dt;
        if (p.timer <= 0) p.mode = 'approach';
      }
      // Firing: a short burst when lined up.
      const aimErr = Math.abs(angleDiff(aimAt, p.heading));
      if (p.mode === 'attack' && p.burst === 0 && p.cool <= 0 && aimErr < 0.12 && d < 310 && !state.over) {
        p.burst = B.PIRATE_BURST;
        p.burstTimer = 0;
      }
      if (p.burst > 0) {
        p.burstTimer -= dt;
        if (p.burstTimer <= 0) {
          pirateBolt(state, p.x, p.y, p.heading, B.PIRATE_BOLT_DMG);
          p.burst--;
          p.burstTimer = B.PIRATE_BURST_GAP;
          if (p.burst === 0) p.cool = B.PIRATE_COOLDOWN;
        }
      }
    }
    // Keep some distance to other pirates.
    for (const o of state.pirates) {
      if (o === p || p.kind === 'cruiser') continue;
      const od = dist(o.x, o.y, p.x, p.y);
      if (od < 44 + pirateRadius(o) && od > 0.01) want += angleDiff(headingTo(p.x - o.x, p.y - o.y), want) * 0.35;
    }
    p.heading = turnToward(p.heading, want, turn * dt);
    const f = forward(p.heading);
    p.vx = f.x * speed;
    p.vy = f.y * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

// ---------- shots and collisions ----------
function solidCircles(state) {
  const out = [];
  for (const r of state.rocks) out.push({ x: r.x, y: r.y, r: r.r });
  for (const w of state.wrecks)
    for (const c of WRECK_GEOM.circles) {
      const p = toWorld(w, c);
      out.push({ x: p.x, y: p.y, r: c.r, wreck: w.id });
    }
  for (const st of state.stations) out.push({ x: st.x, y: st.y, r: B.STATION_RADIUS, station: st });
  for (const pod of state.pods) out.push({ x: pod.x, y: pod.y, r: B.POD_RADIUS });
  return out;
}

function stepBolts(state, dt, solids) {
  const ship = state.ship;
  for (const b of state.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (b.owner === 'player') {
      for (const p of state.pirates) {
        if (p.hp > 0 && dist(b.x, b.y, p.x, p.y) < pirateRadius(p)) {
          b.ttl = 0;
          state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.2 });
          hurtPirate(state, p, b.dmg);
          break;
        }
      }
    } else {
      // Point defense gets one try at each shot that comes close.
      if (has(ship, 'pd') && !b.pd && dist(b.x, b.y, ship.x, ship.y) < B.PD_RANGE) {
        b.pd = true;
        if (rand(state) < B.PD_CHANCE) {
          b.ttl = 0;
          state.fx.push({ type: 'shield', x: b.x, y: b.y, t: 0, dur: 0.2 });
          state.events.push({ type: 'pdHit' });
          continue;
        }
      }
      if (!state.over && dist(b.x, b.y, ship.x, ship.y) < B.SHIP_RADIUS) {
        b.ttl = 0;
        damageShip(state, b.dmg, { x: b.x, y: b.y });
      } else
        for (const d of state.darts)
          if (dist(b.x, b.y, d.x, d.y) < 8) {
            b.ttl = 0;
            d.hp -= b.dmg;
            state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.15 });
            break;
          }
    }
    if (b.ttl > 0) {
      for (const c of solids) {
        if (Math.abs(b.x - c.x) < c.r && Math.abs(b.y - c.y) < c.r && dist(b.x, b.y, c.x, c.y) < c.r) {
          // Hostile station guns sit on the ring, so their own shots must be able to leave.
          if (c.station && b.owner === 'pirate') continue;
          b.ttl = 0;
          state.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.15 });
          if (c.station && b.owner === 'player') boltHitsStation(state, c.station, b);
          break;
        }
      }
    }
  }
  state.bolts = state.bolts.filter((b) => b.ttl > 0);
}

function stepRockets(state, dt, solids) {
  for (const r of state.rockets) {
    r.ttl -= dt;
    const target = r.target !== null ? state.pirates.find((p) => p.id === r.target && p.hp > 0) : null;
    if (target) r.heading = turnToward(r.heading, headingTo(target.x - r.x, target.y - r.y), B.ROCKET_TURN * dt);
    const f = forward(r.heading);
    r.vx = f.x * B.ROCKET_SPEED;
    r.vy = f.y * B.ROCKET_SPEED;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    const near = state.pirates.some((p) => dist(p.x, p.y, r.x, r.y) < pirateRadius(p) + 6);
    const wall = solids.some((c) => dist(c.x, c.y, r.x, r.y) < c.r);
    if (r.ttl <= 0 || near || wall) {
      r.ttl = 0;
      state.fx.push({ type: 'boom', x: r.x, y: r.y, t: 0, dur: 0.5, size: B.ROCKET_RADIUS });
      for (const p of state.pirates)
        if (dist(p.x, p.y, r.x, r.y) < B.ROCKET_RADIUS + pirateRadius(p)) hurtPirate(state, p, B.ROCKET_DMG);
      state.events.push({ type: 'rocketHit' });
    }
  }
  state.rockets = state.rockets.filter((r) => r.ttl > 0);
}

function stepCollisions(state, dt, solids) {
  const ship = state.ship;
  ship.ramCooldown = Math.max(0, ship.ramCooldown - dt);
  if (ship.docked) return;
  for (const h of SHIP_GEOM.hit) {
    for (const c of solids) {
      const p = toWorld(ship, h),
        d = dist(p.x, p.y, c.x, c.y),
        min = c.r + h.r;
      if (d >= min || d < 0.001) continue;
      const nx = (p.x - c.x) / d,
        ny = (p.y - c.y) / d;
      ship.x += nx * (min - d);
      ship.y += ny * (min - d);
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn < 0) {
        ship.vx -= vn * nx;
        ship.vy -= vn * ny;
        if (-vn > B.RAM_SPEED && ship.ramCooldown <= 0) {
          ship.ramCooldown = 1;
          damageShip(state, (-vn - B.RAM_SPEED) * B.RAM_DMG + 2, { x: p.x - nx * h.r, y: p.y - ny * h.r });
        }
      }
    }
  }
}

// The enemy alarm counts pirates inside its range and estimates how soon the first one arrives.
function stepAlarm(state) {
  const ship = state.ship,
    range = B.ALARM_RANGE[level(ship, 'alarm')],
    before = state.alarm.count;
  let count = 0,
    eta = null;
  for (const p of state.pirates) {
    const d = dist(p.x, p.y, ship.x, ship.y);
    if (d > range) continue;
    count++;
    const t = Math.max(
      0,
      (d - 300) / (p.kind === 'cruiser' ? B.CRUISER_SPEED : p.kind === 'gunboat' ? B.GUNBOAT_SPEED : B.FIGHTER_SPEED),
    );
    if (eta === null || t < eta) eta = t;
  }
  state.alarm = { count, eta };
  if (count > 0 && before === 0) state.events.push({ type: 'alarm', count });
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
  for (const b of state.beams) b.t += dt;
  state.beams = state.beams.filter((b) => b.t < b.dur);
  if (state.over) {
    // The world keeps moving after the ship is lost, but nothing can be controlled.
    stepPirates(state, dt);
    stepBolts(state, dt, solidCircles(state));
    state.pirates = state.pirates.filter((p) => p.hp > 0);
    return state;
  }
  const ship = state.ship;
  stepCaptain(state, cmds && cmds.captain, dt);
  stepJump(state, cmds && cmds.captain, dt);
  stepEngineer(state, cmds && cmds.engineer, dt);
  stepDrones(state, dt);
  stepGunner(state, cmds && cmds.gunner, dt);
  stepPirates(state, dt);
  stepStations(state, cmds, dt);
  const solids = solidCircles(state);
  stepCollisions(state, dt, solids);
  stepBolts(state, dt, solids);
  stepRockets(state, dt, solids);
  state.pirates = state.pirates.filter((p) => p.hp > 0);
  stepSalvage(state, dt);
  stepAlarm(state);
  stepDarts(
    state,
    cmds && cmds.captain,
    dt,
    state.alarm.count > 0 || state.pirates.some((p) => dist(p.x, p.y, ship.x, ship.y) < B.VISION_SHIP),
  );
  stepBoarding(state, cmds, dt);
  stepMap(state, dt);
  if (state.time - ship.lastHit > B.SHIELD_DELAY) {
    const emit = (nodeFactor(ship, 'port') + nodeFactor(ship, 'starboard')) / 2;
    ship.shield = Math.min(shieldMax(ship), ship.shield + B.SHIELD_RECHARGE[ship.power.shields] * emit * dt);
  }
  return state;
}
