// The system itself: the star in its middle, which burns a ship that comes too close, the haze of dust and ice
// at its edge, which slows a ship down until it stops, and where the ship arrives after a jump.
import { B } from './balance.js';
import { damageShip } from './damage.js';
import { thingsOf } from './things.js';
import { rand, randRange, TAU, dist, headingTo } from './util.js';

const at = (angle, d) => ({ x: Math.sin(angle) * d, y: -Math.cos(angle) * d });
export const systemRadius = (state) => state.sectors[state.sector].radius;

// How hot it is this far from the middle of the star: nothing outside its reach, and all of it in its heart.
export function starHeat(d) {
  if (d >= B.STAR_BURN) return 0;
  return Math.min(1, (B.STAR_BURN - d) / (B.STAR_BURN - B.STAR_CORE));
}

// The star burns the ship. The shield takes the heat first and keeps recharging while it does, so a strong
// shield with plenty of power carries a ship across. The hull takes it far worse.
function stepStar(state, dt) {
  const ship = state.ship;
  const heat = state.sectors[state.sector].star ? starHeat(Math.hypot(ship.x, ship.y)) : 0;
  if (heat > 0 && ship.heat <= 0) state.events.push({ type: 'starHeat' });
  ship.heat = heat;
  if (heat <= 0) return;
  const dmg = B.STAR_DPS * heat * heat * dt;
  const absorbed = Math.min(ship.shield, dmg);
  ship.shield -= absorbed;
  if (dmg > absorbed) damageShip(state, (dmg - absorbed) * B.STAR_HULL, null);
}

// How deep into the haze a place is: 0 at the edge of the system and inside it, 1 where nothing gets further.
export function hazeDepth(state, x, y) {
  if (!state.sectors[state.sector].haze) return 0;
  return Math.max(0, Math.min(1, (Math.hypot(x, y) - systemRadius(state)) / B.HAZE_DEPTH));
}

// The haze takes the speed out of a ship that is on its way out. It never holds a ship that turns back.
function stepHaze(state) {
  const ship = state.ship;
  const d = Math.hypot(ship.x, ship.y);
  const depth = hazeDepth(state, ship.x, ship.y);
  if (depth > 0 && ship.haze <= 0) state.events.push({ type: 'haze' });
  ship.haze = depth;
  if (depth <= 0) return;
  const nx = ship.x / d,
    ny = ship.y / d;
  // Nothing gets further than the far side of the haze: the last small step past it is taken back.
  const limit = systemRadius(state) + B.HAZE_DEPTH;
  if (d > limit && d < limit + 30) {
    ship.x = nx * limit;
    ship.y = ny * limit;
  }
  const out = ship.vx * nx + ship.vy * ny;
  const most = B.HAZE_SPEED * (1 - depth);
  if (out <= most) return;
  ship.vx -= (out - most) * nx;
  ship.vy -= (out - most) * ny;
}

export function stepSystem(state, dt) {
  if (state.ship.docked) return;
  stepStar(state, dt);
  stepHaze(state);
}

// Where the ship comes in, and how. At a base it knows of it arrives a little way off, with its nose toward the
// base and the engines on low, so that it glides in. A friendly base comes first, then a neutral one, and a
// hostile one last, and there it arrives out of reach of the guns. In a system where the crew knows of no
// base the place is anyone's guess, but never in the star or so close to it that there is no time to turn away,
// and never right by a hostile base or a ship that waits there.
const rank = (k) => (k.align === 'friendly' ? 0 : k.align === 'hostile' ? 2 : 1);
export function arrival(state) {
  const known = state.known.filter((k) => k.kind === 'station').sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  const base = known[0];
  if (base) {
    const far = Math.hypot(base.x, base.y) || 1;
    const gap = base.align === 'hostile' ? B.STATION_RANGE + B.ARRIVE_CLEAR : B.ARRIVE_GAP;
    // On the side of the base that faces away from the star, so that the star is never in the way.
    const x = base.x + (base.x / far) * gap,
      y = base.y + (base.y / far) * gap;
    return { x, y, heading: headingTo(base.x - x, base.y - y), throttle: B.ARRIVE_THROTTLE };
  }
  const radius = systemRadius(state);
  const hostile = thingsOf(state, 'station').filter((st) => st.align === 'hostile');
  let p = at(0, radius * 0.5);
  for (let tries = 0; tries < 12; tries++) {
    p = at(rand(state) * TAU, randRange(state, B.STAR_BURN + B.ARRIVE_STAR, radius * 0.9));
    const byBase = hostile.some((st) => dist(st.x, st.y, p.x, p.y) < B.STATION_RANGE + B.ARRIVE_CLEAR);
    const byShip = state.vessels.some((v) => dist(v.x, v.y, p.x, p.y) < B.ARRIVE_SHIPS);
    if (!byBase && !byShip) break;
  }
  // It comes in flying along the star, not at it.
  return { x: p.x, y: p.y, heading: headingTo(-p.y, p.x), throttle: 0 };
}

// Put the ship where it arrives, at rest.
export function placeShip(state, spot = arrival(state)) {
  Object.assign(state.ship, { x: spot.x, y: spot.y, heading: spot.heading, throttle: spot.throttle, vx: 0, vy: 0 });
}
