// The frigate's weapons, described as data. A new weapon is one more entry in WEAPONS.
//   name     what the Gunner's HUD calls it
//   mod      the upgrade that has to be installed, or null when it is always there
//   ammo     how many shots are left, for weapons that run out
//   charges  it uses ship.charge, so the charge is not cleared while it is selected
//   work     called every step while the weapon is selected
import { B, SHIP_GEOM, WING_MOUNTS } from './balance.js';
import { THINGS } from './kinds.js';
import { shipNose } from './ship.js';
import { hurtVessel, classOf, struckByCrew } from './vessels.js';
import { hurtHulk } from './hulks.js';
import { damageStation, struckBy } from './stations.js';
import { CREW } from './sides.js';
import { has } from './upgrades.js';
import { forward, toWorld, dist, randRange } from './util.js';

export const WEAPONS = {
  pulse: { name: 'PULSE', mod: null, work: workPulse },
  heavy: { name: 'HEAVY', mod: 'heavy', charges: true, work: workHeavy },
  rockets: { name: 'ROCKETS', mod: 'rockets', ammo: (ship) => ship.rockets, work: workRockets },
  // Knocks a ship out instead of blowing it up (SL1, F-081).
  ion: { name: 'ION', mod: 'ion', work: workIon },
};
export const weaponsOf = (ship) => Object.keys(WEAPONS).filter((id) => !WEAPONS[id].mod || has(ship, WEAPONS[id].mod));
export const turretMount = (ship) => toWorld(ship, SHIP_GEOM.turret);

// `ctl` is what the Gunner wants this step: { fire, aim, power }.
function workPulse(state, ship, ctl) {
  if (!ctl.fire) return;
  ship.firing = true;
  if (ship.fireCooldown > 0) return;
  const mount = turretMount(ship);
  // Every turret fires the way it points.
  const shoot = (from, dmg, angle) => {
    const d = forward(angle + randRange(state, -0.012, 0.012));
    state.bolts.push({
      x: from.x + d.x * 9,
      y: from.y + d.y * 9,
      vx: d.x * B.BOLT_SPEED + ship.vx,
      vy: d.y * B.BOLT_SPEED + ship.vy,
      ttl: B.BOLT_TTL,
      side: CREW,
      dmg,
    });
  };
  shoot(mount, B.BOLT_DMG, ship.turretAngle);
  if (has(ship, 'twin')) WING_MOUNTS.forEach((w, i) => shoot(toWorld(ship, w), B.WING_BOLT_DMG, ship.wingAngles[i]));
  ship.fireCooldown = B.FIRE_INTERVAL / ctl.power;
  state.events.push({ type: 'shot' });
}

// The ion gun fires from the nose turret like the pulse gun, a little slower, with bolts that burn through a ship's
// systems more than its hull (SL1).
function workIon(state, ship, ctl) {
  if (!ctl.fire) return;
  ship.firing = true;
  if (ship.fireCooldown > 0) return;
  const from = turretMount(ship);
  const d = forward(ship.turretAngle + randRange(state, -0.01, 0.01));
  state.bolts.push({
    x: from.x + d.x * 9,
    y: from.y + d.y * 9,
    vx: d.x * B.BOLT_SPEED + ship.vx,
    vy: d.y * B.BOLT_SPEED + ship.vy,
    ttl: B.BOLT_TTL,
    side: CREW,
    dmg: B.ION_DMG,
    ion: true,
  });
  ship.fireCooldown = B.ION_INTERVAL / ctl.power;
  state.events.push({ type: 'ionShot' });
}

// Hold to charge, let go to fire. Letting go early wastes the charge.
function workHeavy(state, ship, ctl, dt) {
  if (ctl.fire && ship.heavyCool <= 0) {
    ship.firing = true;
    ship.charge = Math.min(1, ship.charge + (dt * ctl.power) / B.HEAVY_CHARGE);
    return;
  }
  if (ship.charge >= 1) {
    fireHeavy(state);
    ship.heavyCool = B.HEAVY_COOLDOWN;
  }
  ship.charge = 0;
}

// The heavy laser fires straight ahead along the ship and hits everything in its way.
function fireHeavy(state) {
  const ship = state.ship;
  const nose = shipNose(ship);
  const f = forward(ship.heading);
  const end = { x: nose.x + f.x * B.HEAVY_RANGE, y: nose.y + f.y * B.HEAVY_RANGE };
  state.beams.push({ x0: nose.x, y0: nose.y, x1: end.x, y1: end.y, t: 0, dur: 0.3 });
  const along = (x, y) => (x - nose.x) * f.x + (y - nose.y) * f.y;
  const across = (x, y) => Math.abs((x - nose.x) * f.y - (y - nose.y) * f.x);
  const inBeam = (x, y, width) => along(x, y) > 0 && along(x, y) < B.HEAVY_RANGE && across(x, y) < width;
  for (const v of state.vessels) {
    if (inBeam(v.x, v.y, B.HEAVY_WIDTH / 2 + classOf(v).radius) && struckByCrew(state, v))
      hurtVessel(state, v, B.HEAVY_DMG);
  }
  // A knocked-out ship in the way takes the beam on its own hull (F-081).
  for (const t of [...state.things]) {
    if (!t.crew || !inBeam(t.x, t.y, B.HEAVY_WIDTH / 2 + 24)) continue;
    hurtHulk(state, t, B.HEAVY_DMG, CREW);
  }
  // A station in the way takes the beam on its shield, and then on the first gun it crosses, or its hull.
  for (const st of state.things) {
    if (st.kind !== 'station' || !struckBy(state, st, CREW)) continue;
    if (!inBeam(st.x, st.y, B.HEAVY_WIDTH / 2 + THINGS.station.hit[0].r)) continue;
    const gun = st.guns.map((g) => toWorld(st, g)).find((w, i) => st.guns[i].hp > 0 && inBeam(w.x, w.y, 14));
    damageStation(state, st, B.HEAVY_DMG, gun || { x: st.x, y: st.y }, CREW);
  }
  state.events.push({ type: 'heavyShot' });
}

function workRockets(state, ship, ctl) {
  if (!ctl.fire) return;
  ship.firing = true;
  if (ship.rocketCool > 0) return;
  if (ship.rockets <= 0) {
    state.events.push({ type: 'noRockets' });
    ship.rocketCool = 0.6;
    return;
  }
  // The rocket goes for the ship closest to where the Gunner is aiming.
  let target = null;
  let best = B.ROCKET_LOCK;
  if (ctl.aim) {
    for (const v of state.vessels) {
      const d = dist(v.x, v.y, ctl.aim.x, ctl.aim.y);
      if (d < best) {
        best = d;
        target = v;
      }
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
  ship.rocketCool = B.ROCKET_INTERVAL / Math.max(0.5, ctl.power);
  state.events.push({ type: 'rocket' });
}
