// What a shipyard sells, and what the installed upgrades do to the ship's numbers.
import { B } from './balance.js';

// slot: 'hard' sits on the hull and shows, 'system' sits inside, null takes no slot.
export const CATALOG = {
  twin: { name: 'TWIN WING TURRETS', slot: 'hard', size: 1, price: 150, desc: 'TWO MORE PULSE TURRETS' },
  heavy: { name: 'HEAVY LASER', slot: 'hard', size: 1, price: 220, desc: 'CHARGED BEAM, FIRES STRAIGHT AHEAD' },
  rockets: { name: 'ROCKET PODS', slot: 'hard', size: 1, price: 200, desc: 'HOMING ROCKETS, 8 PER LOAD' },
  bay: { name: 'FIGHTER BAY', slot: 'hard', size: 2, price: 320, desc: 'THREE DARTS, LAUNCHED BY THE CAPTAIN' },
  armor: { name: 'ARMOR PLATING', slot: 'hard', size: 1, price: 160, desc: 'HULL +80' },
  emit: { name: 'SHIELD EMITTERS', slot: 'system', size: 1, price: 180, desc: 'SHIELD +50' },
  alarm: { name: 'ENEMY ALARM', slot: 'system', size: 1, price: 120, levels: 3, desc: 'WARNS OF PIRATES FAR OUT' },
  tscan: { name: 'TARGET SCANNER', slot: 'system', size: 1, price: 140, desc: 'SHOWS HEALTH AND BOARDING RISK' },
  core: { name: 'POWER CORE', slot: 'system', size: 1, price: 240, desc: 'POWER +2' },
  auto: { name: 'DART AUTOLAUNCH', slot: null, needs: 'bay', price: 150, desc: 'DARTS LAUNCH WHEN PIRATES SHOW UP' },
  slotH: { name: 'EXTRA HARDPOINT', slot: null, price: 250, levels: 2, desc: 'ROOM FOR ONE MORE HULL UPGRADE' },
  slotS: { name: 'EXTRA SYSTEM SLOT', slot: null, price: 200, levels: 2, desc: 'ROOM FOR ONE MORE SYSTEM' },
};
export const SHOP_ORDER = ['twin', 'heavy', 'rockets', 'bay', 'armor', 'emit', 'alarm', 'tscan', 'core', 'auto', 'slotH', 'slotS'];

export const level = (ship, id) => ship.mods[id] || 0;
export const has = (ship, id) => level(ship, id) > 0;
export const hullMax = (ship) => B.HULL_MAX + (has(ship, 'armor') ? 80 : 0);
export const shieldMax = (ship) => B.SHIELD_MAX + (has(ship, 'emit') ? 50 : 0);
export const powerTotal = (ship) => B.POWER_TOTAL + (has(ship, 'core') ? 2 : 0);
export const slotsUsed = (ship, kind) => Object.keys(ship.mods).reduce((a, id) => a + (CATALOG[id].slot === kind && has(ship, id) ? CATALOG[id].size : 0), 0);
export const priceOf = (ship, id) => Math.round(CATALOG[id].price * (1 + 0.5 * level(ship, id)));

// Why an item cannot be bought right now, or null when it can.
export function blockedReason(state, id) {
  const item = CATALOG[id], ship = state.ship, lv = level(ship, id);
  if (!item) return 'UNKNOWN';
  if (lv >= (item.levels || 1)) return item.levels ? 'MAXED' : 'INSTALLED';
  if (item.needs && !has(ship, item.needs)) return 'NEEDS ' + CATALOG[item.needs].name;
  if (item.slot && lv === 0 && slotsUsed(ship, item.slot) + item.size > ship.slots[item.slot]) return item.slot === 'hard' ? 'NO FREE HARDPOINT' : 'NO FREE SYSTEM SLOT';
  if (state.credits < priceOf(ship, id)) return 'NOT ENOUGH CREDITS';
  return null;
}

export function buyUpgrade(state, id) {
  const reason = blockedReason(state, id);
  if (reason) { state.events.push({ type: 'cannotBuy', reason }); return false; }
  const ship = state.ship;
  state.credits -= priceOf(ship, id);
  ship.mods[id] = level(ship, id) + 1;
  if (id === 'slotH') ship.slots.hard++;
  if (id === 'slotS') ship.slots.system++;
  if (id === 'rockets') ship.rockets = B.ROCKET_LOAD;
  if (id === 'bay') ship.dartStock = B.DART_COUNT;
  if (id === 'armor') ship.hull += 80;
  if (id === 'emit') ship.shield += 50;
  state.events.push({ type: 'bought', item: id, name: CATALOG[id].name });
  return true;
}
