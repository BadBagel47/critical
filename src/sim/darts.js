// Darts: small fighters launched from the fighter bay. They escort the ship and attack pirates.
import { B, SHIP_GEOM } from './balance.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, TAU } from './util.js';
import { has } from './upgrades.js';

export function stepDarts(state, cmd, dt, piratesNear) {
  const ship = state.ship;
  if (!has(ship, 'bay')) return;
  if (cmd && cmd.darts) ship.dartsOut = !ship.dartsOut;
  // With autolaunch the Darts go out when pirates show up and come home when it is quiet again.
  if (has(ship, 'auto')) {
    if (piratesNear) { ship.dartsOut = true; ship.dartQuiet = 0; }
    else { ship.dartQuiet += dt; if (ship.dartQuiet > 5 && ship.dartsOut) ship.dartsOut = false; }
  }
  if (ship.docked) ship.dartsOut = false;
  ship.dartGap = Math.max(0, ship.dartGap - dt);
  if (ship.dartsOut && ship.dartStock > 0 && ship.dartGap <= 0) {
    const p = toWorld(ship, { x: 0, y: 26 });
    ship.dartStock--; ship.dartGap = B.DART_LAUNCH_GAP;
    state.darts.push({ id: state.nextId++, x: p.x, y: p.y, heading: ship.heading + Math.PI + (state.darts.length - 1) * 0.6, hp: B.DART_HP, cool: 0.5, slot: state.darts.length });
    state.events.push({ type: 'dartOut' });
  }
  if (ship.dartStock + state.darts.length < B.DART_COUNT) {
    ship.dartRegen += dt;
    if (ship.dartRegen >= B.DART_REGEN) { ship.dartStock++; ship.dartRegen = 0; state.events.push({ type: 'dartBuilt' }); }
  }
  for (const d of state.darts) {
    d.cool -= dt;
    let want, speed = B.DART_SPEED;
    if (!ship.dartsOut) {
      // Coming home: slow down near the ship so the Dart does not circle it forever.
      const hd = dist(d.x, d.y, ship.x, ship.y);
      want = headingTo(ship.x - d.x, ship.y - d.y); speed = Math.min(B.DART_SPEED, Math.max(60, hd * 1.6));
      if (hd < 30) { d.home = true; ship.dartStock++; continue; }
    } else {
      let target = null, best = B.DART_RANGE;
      for (const p of state.pirates) { const pd = dist(p.x, p.y, ship.x, ship.y); if (pd < best) { best = pd; target = p; } }
      if (target) {
        const td = dist(d.x, d.y, target.x, target.y), lead = td / 420;
        want = headingTo(target.x + target.vx * lead - d.x, target.y + target.vy * lead - d.y);
        if (td < 60) want += 1.2;
        if (d.cool <= 0 && td < 270 && Math.abs(angleDiff(want, d.heading)) < 0.16) {
          const f = forward(d.heading);
          state.bolts.push({ x: d.x + f.x * 9, y: d.y + f.y * 9, vx: f.x * 420, vy: f.y * 420, ttl: 0.7, owner: 'player', dmg: B.DART_DMG, small: true });
          d.cool = B.DART_COOLDOWN;
        }
      } else {
        // Nothing to fight: circle the ship.
        const a = state.time * 0.9 + (d.slot * TAU) / B.DART_COUNT, gx = ship.x + Math.sin(a) * 78, gy = ship.y - Math.cos(a) * 78;
        want = headingTo(gx - d.x, gy - d.y);
        speed = B.DART_SPEED * (dist(d.x, d.y, gx, gy) > 60 ? 1 : 0.75);
      }
    }
    d.heading = turnToward(d.heading, want, B.DART_TURN * dt);
    const f = forward(d.heading);
    d.vx = f.x * speed; d.vy = f.y * speed; d.x += d.vx * dt; d.y += d.vy * dt;
  }
  for (const d of state.darts) if (d.hp <= 0) { state.fx.push({ type: 'boom', x: d.x, y: d.y, t: 0, dur: 0.5, size: 14 }); state.events.push({ type: 'dartLost' }); }
  state.darts = state.darts.filter((d) => d.hp > 0 && !d.home);
}
