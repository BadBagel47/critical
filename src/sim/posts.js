// The three posts on the frigate. Each takes the command of whoever holds the post,
// or null when nobody does, in which case the post keeps running as it was set.
import { B, WING_MOUNTS } from './balance.js';
import {
  nodeFactor,
  powerAvailable,
  powerUsed,
  setPower,
  dockCandidate,
  dockPose,
  weaponPower,
  surging,
  shipNose,
} from './ship.js';
import { startSurge, fireSurge, markByCaptain, markByGunner } from './teamwork.js';
import { findDock } from './things.js';
import { ringToBridge } from './stations.js';
import { WEAPONS, weaponsOf, turretMount } from './weapons.js';
import { teleportAllHome } from './boarding.js';
import { useTool } from './map.js';
import { has, hullMax } from './upgrades.js';
import { clamp, forward, headingTo, turnToward, toWorld, dist, TAU } from './util.js';

// ---------- Captain ----------
function undock(state) {
  const ship = state.ship;
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
}

function dock(state) {
  const ship = state.ship;
  const t = dockCandidate(state);
  if (!t) return;
  ship.docked = t.id;
  // At a base the ring turns the port to the bridge (R-1154).
  if (t.kind === 'station') ringToBridge(t, shipNose(ship));
  ship.vx = 0;
  ship.vy = 0;
  ship.throttle = 0;
  ship.turn = 0;
  state.events.push({ type: 'dock', target: t.id, kind: t.kind });
}

// The docking clamps pull a docked ship the last bit in, until its nose rests at the port and points at
// what it is docked to.
function settleInDock(state, dt) {
  const ship = state.ship;
  const thing = findDock(state, ship.docked);
  const pose = thing && dockPose(ship, thing);
  if (!pose) return;
  const dx = pose.x - ship.x;
  const dy = pose.y - ship.y;
  const d = Math.hypot(dx, dy);
  const step = Math.min(d, B.DOCK_PULL * dt);
  if (d > 0.01) {
    ship.x += (dx / d) * step;
    ship.y += (dy / d) * step;
  }
  ship.heading = (turnToward(ship.heading, pose.heading, B.DOCK_TURN * dt) + TAU) % TAU;
}

export function stepCaptain(state, cmd, dt) {
  const ship = state.ship;
  let turnInput = 0;
  if (cmd) {
    if (cmd.stop) ship.throttle = 0;
    else if (cmd.throttle) ship.throttle = clamp(ship.throttle + cmd.throttle * B.THROTTLE_RATE * dt, -B.REVERSE, 1);
    turnInput = clamp(cmd.turn || 0, -1, 1);
    if (cmd.dock) {
      if (ship.docked) undock(state);
      else dock(state);
    }
    // Z starts to charge the boost, and lets it go when it is full.
    if (cmd.surge) {
      if (ship.surge.sys) fireSurge(state, 'captain');
      else startSurge(state, 'engines');
    }
    if (cmd.mark) markByCaptain(state);
  }
  // Without power the engines give nothing: no thrust and no steering. The ship drifts on.
  if (ship.power.engines <= 0) {
    ship.throttle = 0;
    turnInput = 0;
  }
  if (ship.docked) {
    settleInDock(state, dt);
    return;
  }
  const enginePower = B.ENGINE_POWER[ship.power.engines];
  let thrust = enginePower * nodeFactor(ship, 'engines') * (surging(ship, 'engines') ? B.SURGE_ENGINES : 1);
  // The afterburner trades fuel for speed while it is held.
  ship.boosting = !!(cmd && cmd.boost && has(ship, 'boost') && ship.fuel > 0 && ship.throttle > 0);
  if (ship.boosting) thrust *= B.BOOST_POWER;
  // The boost burns fuel as much faster as it goes, so that a stretch costs the same fuel with or without it.
  const surge = surging(ship, 'engines') ? B.SURGE_ENGINES : 1;
  const burn = B.FUEL_BURN * Math.abs(ship.throttle) * enginePower * (ship.boosting ? B.BOOST_BURN : 1) * surge;
  ship.fuel = Math.max(0, ship.fuel - burn * dt);
  if (ship.fuel <= 0) thrust *= B.ADRIFT_FACTOR;
  ship.turn += (turnInput - ship.turn) * Math.min(1, B.TURN_SMOOTH * dt);
  ship.heading = (ship.heading + ship.turn * B.TURN_RATE * nodeFactor(ship, 'steering') * dt + TAU) % TAU;
  const f = forward(ship.heading);
  const a = B.ACCEL * thrust * ship.throttle;
  ship.vx += f.x * a * dt;
  ship.vy += f.y * a * dt;
  const drag = Math.exp(-B.DRAG * dt);
  ship.vx *= drag;
  ship.vy *= drag;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}

// ---------- Gunner ----------
function pickWeapon(ship, want) {
  const weapons = weaponsOf(ship);
  if (!weapons.includes(ship.weapon)) ship.weapon = 'pulse';
  if (!want) return;
  // A number steps through the weapons, a name picks one.
  const step = (weapons.indexOf(ship.weapon) + want + weapons.length) % weapons.length;
  const next = typeof want === 'number' ? weapons[step] : want;
  if (weapons.includes(next) && next !== ship.weapon) {
    ship.weapon = next;
    ship.charge = 0;
  }
}

export function stepGunner(state, cmd, dt) {
  const ship = state.ship;
  ship.firing = false;
  pickWeapon(ship, cmd && cmd.weapon);
  // The Gunner switches the shield on and off (R-1129).
  if (cmd && cmd.shield) {
    ship.shieldOn = !ship.shieldOn;
    state.events.push({ type: ship.shieldOn ? 'shieldOn' : 'shieldOff' });
  }
  if (cmd && cmd.mark) markByGunner(state, cmd.mark);
  if (cmd && cmd.aim) {
    const mount = turretMount(ship);
    const want = headingTo(cmd.aim.x - mount.x, cmd.aim.y - mount.y);
    ship.turretAngle = turnToward(ship.turretAngle, want, B.TURRET_SLEW * dt);
    WING_MOUNTS.forEach((w, i) => {
      const from = toWorld(ship, w);
      const way = headingTo(cmd.aim.x - from.x, cmd.aim.y - from.y);
      ship.wingAngles[i] = turnToward(ship.wingAngles[i], way, B.TURRET_SLEW * dt);
    });
  }
  // Without the nose turret the gun is fixed and fires straight ahead (R-733).
  if (!has(ship, 'nose')) ship.turretAngle = ship.heading;
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  ship.heavyCool = Math.max(0, ship.heavyCool - dt);
  ship.rocketCool = Math.max(0, ship.rocketCool - dt);
  const power = weaponPower(ship);
  const fire = !!(cmd && cmd.fire);
  if (fire && power <= 0) {
    state.events.push({ type: 'weaponsOffline' });
    ship.charge = 0;
    return;
  }
  const weapon = WEAPONS[ship.weapon];
  if (!weapon.charges) ship.charge = 0;
  weapon.work(state, ship, { fire, aim: cmd ? cmd.aim : null, power }, dt);
}

// ---------- Engineer ----------
// A damaged reactor takes power away. It is dropped from the fullest system first.
function shedPower(state) {
  const ship = state.ship;
  const order = ['repair', 'engines', 'weapons', 'shields'];
  while (powerUsed(ship) > powerAvailable(ship)) {
    const sys = order.reduce((best, k) => (ship.power[k] > ship.power[best] ? k : best), order[0]);
    ship.power[sys]--;
    state.events.push({ type: 'powerLost', sys });
  }
}

function stepRepairCrew(state, dt) {
  const ship = state.ship;
  const crew = ship.crew;
  const rate = B.REPAIR_RATE[ship.power.repair];
  const max = hullMax(ship);
  if (crew.moving) {
    crew.moving.t += dt;
    if (crew.moving.t >= crew.moving.dur) {
      crew.at = crew.moving.to;
      crew.moving = null;
    }
    return;
  }
  if (!crew.queue.length) {
    // With nothing queued the crew patches the hull slowly.
    ship.hull = Math.min(max, ship.hull + rate * B.HULL_REPAIR_SHARE * dt);
    return;
  }
  const target = crew.queue[0];
  if (target !== crew.at) {
    const a = ship.nodes[crew.at];
    const b = ship.nodes[target];
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
}

export function stepEngineer(state, cmd, dt) {
  const crew = state.ship.crew;
  if (cmd) {
    for (const p of cmd.power || []) setPower(state, p.sys, p.delta);
    if (cmd.tool) useTool(state, cmd.tool);
    // The Engineer starts to charge the boost for the Captain, whichever system is picked.
    if (cmd.surge) startSurge(state, 'engines');
    if (cmd.repair && state.ship.nodes[cmd.repair.node]) {
      const i = cmd.repair.node;
      if (!cmd.repair.queue) crew.queue = [i];
      else if (!crew.queue.includes(i) && crew.queue.length < 3) crew.queue.push(i);
    }
  }
  shedPower(state);
  stepRepairCrew(state, dt);
}

// Repair drones work on their own, whatever the crew is doing.
export function stepDrones(state, dt) {
  const ship = state.ship;
  if (!has(ship, 'drones')) return;
  ship.hull = Math.min(hullMax(ship), ship.hull + B.DRONE_HULL * dt);
  const worst = ship.nodes.reduce((b, n) => (n.hp < b.hp ? n : b), ship.nodes[0]);
  if (worst.hp < 100) worst.hp = Math.min(100, worst.hp + B.DRONE_NODE * dt);
}
