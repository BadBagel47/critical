// What kind of moment the player is in, for the music. This reads the game and never changes it.
//   title     the title screen
//   space     flying with nothing going on
//   warning   hostile ships are known to be around, but not here yet
//   combat    hostile ships are close, or the ship was hit moments ago
//   boarding  inside a wreck or a hostile station
//   station   docked at or walking around a friendly or neutral station
//   lost      the ship is destroyed
import { B } from './sim/balance.js';
import { playerById } from './sim/players.js';
import { findDock } from './sim/things.js';
import { isTrading } from './sim/stations.js';
import { visionSources, isVisible } from './sim/map.js';
import { has } from './sim/upgrades.js';
import { CREW, enemies } from './sim/sides.js';
import { dist } from './sim/util.js';

// How long after the last hit the ship still counts as in a fight, in seconds.
const UNDER_FIRE = 4;

// Whether the boarding that this player is on has been found out: the place has sounded its alarm, or, where
// there is no alarm, a guard is after someone. The music changes from sneaking to a chase.
export function foundOutFor(state, playerId) {
  const me = playerById(state, playerId);
  const place = me && me.inside !== null ? findDock(state, me.inside) : null;
  const it = place && place.interior;
  if (!it || it.trade) return false;
  return it.mood ? it.mood === 'alarm' : it.guards.some((g) => g.mode === 'alert');
}

export function sceneOf(state, playerId, started = true) {
  if (!started) return 'title';
  if (state.over) return 'lost';
  const ship = state.ship;
  const me = playerById(state, playerId);
  if (me.inside !== null) return isTrading(findDock(state, me.inside)) ? 'station' : 'boarding';
  // Only ships that are the crew's enemies make for a warning or a fight.
  const foes = state.vessels.filter((v) => enemies(state, v.side, CREW));
  const close = foes.some((v) => dist(v.x, v.y, ship.x, ship.y) < B.VISION_SHIP + 100);
  if (close || state.time - ship.lastHit < UNDER_FIRE) return 'combat';
  // A warning needs something that tells the crew: a ship in sight, the enemy alarm, or a distress call.
  const sources = visionSources(state);
  const inSight = foes.some((v) => isVisible(state, v.x, v.y, sources));
  const alarm = has(ship, 'alarm') && state.alarm.count > 0;
  if (inSight || alarm || state.raid) return 'warning';
  if (isTrading(findDock(state, ship.docked))) return 'station';
  return 'space';
}
