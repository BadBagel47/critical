// Damage to the player ship: shield first, then hull and one random part of the ship.
import { B } from './balance.js';
import { rand } from './util.js';
import { nodeStatus } from './ship.js';
import { breakSurge } from './teamwork.js';

// `shot` is a hit from a weapon. It breaks off a boost that is charging and a jump that is being charged, so that
// nobody can simply fly or jump out of a fight (F-197). A hit on the shield counts, a miss does not.
export function damageShip(state, dmg, at, shot = false) {
  const ship = state.ship;
  ship.lastHit = state.time;
  if (shot) {
    breakSurge(state);
    if (state.jump && state.jump.t > 0) {
      state.jump.t = 0;
      state.events.push({ type: 'jumpBroken' });
    }
  }
  // A docked ship has an extra shield from what it is docked at. That one is used up first.
  const extra = Math.min(ship.dockShield, dmg);
  ship.dockShield -= extra;
  dmg -= extra;
  // A shield that is switched off takes nothing (R-1129).
  const absorbed = ship.shieldOn ? Math.min(ship.shield, dmg) : 0;
  ship.shield -= absorbed;
  const rest = dmg - absorbed;
  if (rest > 0) {
    ship.hull = Math.max(0, ship.hull - rest);
    const node = ship.nodes[Math.floor(rand(state) * ship.nodes.length)];
    const was = nodeStatus(node.hp);
    node.hp = Math.max(0, node.hp - rest * B.NODE_DMG_MULT);
    state.events.push({ type: 'hullHit', node: node.id });
    // The moment a part becomes critical is told once, so that it can be heard.
    if (was !== 'critical' && nodeStatus(node.hp) === 'critical')
      state.events.push({ type: 'partCritical', node: node.id });
  } else {
    state.events.push({ type: 'shieldHit' });
  }
  if (at) state.fx.push({ type: rest > 0 ? 'hit' : 'shield', x: at.x, y: at.y, t: 0, dur: 0.25 });
  if (ship.hull <= 0 && !state.over) {
    state.over = true;
    state.fx.push({ type: 'boom', x: ship.x, y: ship.y, t: 0, dur: 1.4, size: 70 });
    state.events.push({ type: 'shipLost' });
  }
}
