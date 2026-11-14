// Darts: small fighters launched from the fighter bay. They escort the ship and attack hostile ships.
import { B } from './balance.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, TAU } from './util.js';
import { has } from './upgrades.js';

// The Captain sends the Darts out and calls them home. With autolaunch they go out when hostile ships
// show up, and come home when it has been quiet for a while.
function decide(state, cmd, dt, hostilesNear) {
  const ship = state.ship;
  if (cmd && cmd.darts) ship.dartsOut = !ship.dartsOut;
  if (has(ship, 'auto')) {
    if (hostilesNear) {
      ship.dartsOut = true;
      ship.dartQuiet = 0;
    } else {
      ship.dartQuiet += dt;
      if (ship.dartQuiet > 5 && ship.dartsOut) ship.dartsOut = false;
    }
  }
  if (ship.docked) ship.dartsOut = false;
}

// Darts leave the bay one at a time, and lost ones are rebuilt slowly.
function launchAndBuild(state, dt) {
  const ship = state.ship;
  ship.dartGap = Math.max(0, ship.dartGap - dt);
  if (ship.dartsOut && ship.dartStock > 0 && ship.dartGap <= 0) {
    const p = toWorld(ship, { x: 0, y: 26 });
    ship.dartStock--;
    ship.dartGap = B.DART_LAUNCH_GAP;
    state.darts.push({
      id: state.nextId++,
      x: p.x,
      y: p.y,
      heading: ship.heading + Math.PI + (state.darts.length - 1) * 0.6,
      hp: B.DART_HP,
      cool: 0.5,
      slot: state.darts.length,
    });
    state.events.push({ type: 'dartOut' });
  }
  if (ship.dartStock + state.darts.length >= B.DART_COUNT) return;
  ship.dartRegen += dt;
  if (ship.dartRegen < B.DART_REGEN) return;
  ship.dartStock++;
  ship.dartRegen = 0;
  state.events.push({ type: 'dartBuilt' });
}

// The hostile ship closest to the frigate, if one is within reach.
function pickTarget(state) {
  const ship = state.ship;
  let target = null;
  let best = B.DART_RANGE;
  for (const v of state.vessels) {
    const d = dist(v.x, v.y, ship.x, ship.y);
    if (d < best) {
      best = d;
      target = v;
    }
  }
  return target;
}

// Each of these answers with the heading and speed a Dart wants, or null when it has landed.
// Coming home: slow down near the ship so the Dart does not circle it forever.
function flyHome(state, d) {
  const ship = state.ship;
  const away = dist(d.x, d.y, ship.x, ship.y);
  if (away < 30) return null;
  return { want: headingTo(ship.x - d.x, ship.y - d.y), speed: Math.min(B.DART_SPEED, Math.max(60, away * 1.6)) };
}

function attack(state, d, target) {
  const away = dist(d.x, d.y, target.x, target.y);
  const lead = away / 420;
  let want = headingTo(target.x + target.vx * lead - d.x, target.y + target.vy * lead - d.y);
  if (away < 60) want += 1.2;
  if (d.cool <= 0 && away < 270 && Math.abs(angleDiff(want, d.heading)) < 0.16) {
    const f = forward(d.heading);
    state.bolts.push({
      x: d.x + f.x * 9,
      y: d.y + f.y * 9,
      vx: f.x * 420,
      vy: f.y * 420,
      ttl: 0.7,
      owner: 'player',
      dmg: B.DART_DMG,
      small: true,
    });
    d.cool = B.DART_COOLDOWN;
  }
  return { want, speed: B.DART_SPEED };
}

// Nothing to fight: circle the ship, each Dart in its own place in the ring.
function patrol(state, d) {
  const ship = state.ship;
  const a = state.time * 0.9 + (d.slot * TAU) / B.DART_COUNT;
  const gx = ship.x + Math.sin(a) * 78;
  const gy = ship.y - Math.cos(a) * 78;
  return { want: headingTo(gx - d.x, gy - d.y), speed: B.DART_SPEED * (dist(d.x, d.y, gx, gy) > 60 ? 1 : 0.75) };
}

export function stepDarts(state, cmd, dt, hostilesNear) {
  const ship = state.ship;
  if (!has(ship, 'bay')) return;
  decide(state, cmd, dt, hostilesNear);
  launchAndBuild(state, dt);
  for (const d of state.darts) {
    d.cool -= dt;
    let fly;
    if (!ship.dartsOut) fly = flyHome(state, d);
    else {
      const target = pickTarget(state);
      fly = target ? attack(state, d, target) : patrol(state, d);
    }
    if (!fly) {
      d.home = true;
      ship.dartStock++;
      continue;
    }
    d.heading = turnToward(d.heading, fly.want, B.DART_TURN * dt);
    const f = forward(d.heading);
    d.vx = f.x * fly.speed;
    d.vy = f.y * fly.speed;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  for (const d of state.darts) {
    if (d.hp > 0) continue;
    state.fx.push({ type: 'boom', x: d.x, y: d.y, t: 0, dur: 0.5, size: 14 });
    state.events.push({ type: 'dartLost' });
  }
  state.darts = state.darts.filter((d) => d.hp > 0 && !d.home);
}
