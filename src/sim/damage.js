// Damage to the player ship: shield first, then hull and one random part of the ship.
import { B } from './balance.js';
import { rand } from './util.js';

export function damageShip(state, dmg, at) {
  const ship = state.ship;
  ship.lastHit = state.time;
  // A docked ship has an extra shield from what it is docked at. That one is used up first.
  const extra = Math.min(ship.dockShield, dmg);
  ship.dockShield -= extra;
  dmg -= extra;
  const absorbed = Math.min(ship.shield, dmg);
  ship.shield -= absorbed;
  const rest = dmg - absorbed;
  if (rest > 0) {
    ship.hull = Math.max(0, ship.hull - rest);
    const node = ship.nodes[Math.floor(rand(state) * ship.nodes.length)];
    node.hp = Math.max(0, node.hp - rest * B.NODE_DMG_MULT);
    state.events.push({ type: 'hullHit', node: node.id });
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
