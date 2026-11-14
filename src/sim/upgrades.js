// What stations sell, and what the bought upgrades do to the ship's numbers.
import { B } from './balance.js';

// slot: 'hard' sits on the hull and shows, 'system' sits inside, null takes no slot.
// tab: where it is sold. 'hull' and 'system' need a shipyard, 'armory' is boarding gear sold at any trading station.
export const CATALOG = {
  twin: { tab: 'hull', name: 'TWIN WING TURRETS', slot: 'hard', size: 1, price: 150, desc: 'TWO MORE PULSE TURRETS' },
  heavy: { tab: 'hull', name: 'HEAVY LASER', slot: 'hard', size: 1, price: 220, desc: 'CHARGED BEAM, FIRES STRAIGHT AHEAD' },
  rockets: { tab: 'hull', name: 'ROCKET PODS', slot: 'hard', size: 1, price: 200, desc: 'HOMING ROCKETS, 8 PER LOAD' },
  bay: { tab: 'hull', name: 'FIGHTER BAY', slot: 'hard', size: 2, price: 320, desc: 'THREE DARTS, LAUNCHED BY THE CAPTAIN' },
  armor: { tab: 'hull', name: 'ARMOR PLATING', slot: 'hard', size: 1, price: 160, desc: 'HULL +80' },
  pd: { tab: 'hull', name: 'POINT DEFENSE', slot: 'hard', size: 1, price: 220, desc: 'SHOOTS DOWN SOME INCOMING FIRE' },
  tank: { tab: 'hull', name: 'FUEL TANK', slot: null, price: 140, desc: 'FUEL +60' },
  auto: { tab: 'hull', name: 'DART AUTOLAUNCH', slot: null, needs: 'bay', price: 150, desc: 'DARTS LAUNCH WHEN PIRATES SHOW UP' },
  slotH: { tab: 'hull', name: 'EXTRA HARDPOINT', slot: null, price: 250, levels: 2, desc: 'ROOM FOR ONE MORE HULL UPGRADE' },
  emit: { tab: 'system', name: 'SHIELD EMITTERS', slot: 'system', size: 1, price: 180, desc: 'SHIELD +50' },
  alarm: { tab: 'system', name: 'ENEMY ALARM', slot: 'system', size: 1, price: 120, levels: 3, desc: 'WARNS OF PIRATES FAR OUT' },
  tscan: { tab: 'system', name: 'TARGET SCANNER', slot: 'system', size: 1, price: 140, desc: 'SHOWS HEALTH AND BOARDING RISK' },
  tcomp: { tab: 'system', name: 'TARGETING COMPUTER', slot: 'system', size: 1, price: 130, desc: 'SHOWS THE GUNNER WHERE TO AIM' },
  core: { tab: 'system', name: 'POWER CORE', slot: 'system', size: 1, price: 240, desc: 'POWER +2' },
  boost: { tab: 'system', name: 'AFTERBURNER', slot: 'system', size: 1, price: 160, desc: 'HOLD SHIFT FOR SPEED, BURNS FUEL FAST' },
  jumpcoil: { tab: 'system', name: 'JUMP COILS', slot: 'system', size: 1, price: 180, desc: 'JUMPS CHARGE FASTER AND COST LESS FUEL' },
  tractor: { tab: 'system', name: 'TRACTOR BEAM', slot: 'system', size: 1, price: 150, desc: 'PULLS IN SALVAGE FROM A DISTANCE' },
  drones: { tab: 'system', name: 'REPAIR DRONES', slot: 'system', size: 1, price: 200, desc: 'SLOWLY REPAIR THE SHIP ON THEIR OWN' },
  slotS: { tab: 'system', name: 'EXTRA SYSTEM SLOT', slot: null, price: 200, levels: 2, desc: 'ROOM FOR ONE MORE SYSTEM' },
  rifle: { tab: 'armory', name: 'RIFLE UPGRADE', slot: null, price: 120, levels: 2, desc: 'BOARDERS HIT HARDER' },
  pack: { tab: 'armory', name: 'CARGO PACK', slot: null, price: 140, desc: 'CARRY TWO MORE THINGS PER TRIP' },
  suit: { tab: 'armory', name: 'SUIT ARMOR', slot: null, price: 160, desc: 'BOARDERS TAKE MORE BEFORE THE TELEPORT' },
  charge: { tab: 'armory', name: 'BREACHING CHARGES', slot: null, price: 130, desc: 'C BLOWS A VAULT DOOR, BUT WAKES EVERYONE' },
  sentry: { tab: 'armory', name: 'DEPLOYABLE TURRET', slot: null, price: 180, desc: 'T SETS DOWN A SMALL TURRET' },
  hack: { tab: 'armory', name: 'HACKING KIT', slot: null, price: 150, desc: 'MORE TIME IN EVERY BREAK-IN' },
  coils: { tab: 'armory', name: 'TELEPORTER COILS', slot: null, price: 150, desc: 'THE TELEPORTER RECHARGES FASTER' },
};
export const TABS = ['hull', 'system', 'armory'];
export const TAB_NAME = { hull: 'HULL', system: 'SYSTEMS', armory: 'ARMORY' };
export const itemsOf = (tab) => Object.keys(CATALOG).filter((id) => CATALOG[id].tab === tab);

export const level = (ship, id) => ship.mods[id] || 0;
export const has = (ship, id) => level(ship, id) > 0;
export const hullMax = (ship) => B.HULL_MAX + (has(ship, 'armor') ? 80 : 0);
export const shieldMax = (ship) => B.SHIELD_MAX + (has(ship, 'emit') ? 50 : 0);
export const powerTotal = (ship) => B.POWER_TOTAL + (has(ship, 'core') ? 2 : 0);
export const fuelMax = (ship) => B.FUEL_MAX + (has(ship, 'tank') ? B.TANK_FUEL : 0);
export const jumpCharge = (ship) => (has(ship, 'jumpcoil') ? B.COIL_CHARGE : B.JUMP_CHARGE);
export const jumpFuel = (ship) => (has(ship, 'jumpcoil') ? B.COIL_FUEL : B.JUMP_FUEL);
export const crewHpMax = (ship) => B.CREW_HP + (has(ship, 'suit') ? B.SUIT_HP : 0);
export const carryMax = (ship) => B.CARRY_MAX + (has(ship, 'pack') ? B.PACK_EXTRA : 0);
export const rifleDmg = (ship) => B.RIFLE_DMG + B.RIFLE_STEP * level(ship, 'rifle');
export const teleCooldown = (ship) => (has(ship, 'coils') ? B.COIL_TELEPORT : B.TELEPORT_COOLDOWN);
export const breakinBonus = (ship) => (has(ship, 'hack') ? B.HACK_BONUS : 1);
export const slotsUsed = (ship, kind) => Object.keys(ship.mods).reduce((a, id) => a + (CATALOG[id].slot === kind && has(ship, id) ? CATALOG[id].size : 0), 0);
export const priceOf = (ship, id, discount = 1) => Math.round(CATALOG[id].price * (1 + 0.5 * level(ship, id)) * discount);

// Why an item cannot be bought right now, or null when it can.
export function blockedReason(state, id, discount = 1) {
  const item = CATALOG[id], ship = state.ship, lv = level(ship, id);
  if (!item) return 'UNKNOWN';
  if (lv >= (item.levels || 1)) return item.levels ? 'MAXED' : item.tab === 'armory' ? 'OWNED' : 'INSTALLED';
  if (item.needs && !has(ship, item.needs)) return 'NEEDS ' + CATALOG[item.needs].name;
  if (item.slot && lv === 0 && slotsUsed(ship, item.slot) + item.size > ship.slots[item.slot]) return item.slot === 'hard' ? 'NO FREE HARDPOINT' : 'NO FREE SYSTEM SLOT';
  if (state.credits < priceOf(ship, id, discount)) return 'NOT ENOUGH CREDITS';
  return null;
}

// Test mode: everything is installed from the start, with slots to hold it all and plenty of credits.
export function applyTestLoadout(state) {
  const ship = state.ship;
  for (const id of Object.keys(CATALOG)) ship.mods[id] = CATALOG[id].levels || 1;
  ship.slots.hard = Math.max(ship.slots.hard + 2, slotsUsed(ship, 'hard'));
  ship.slots.system = Math.max(ship.slots.system + 2, slotsUsed(ship, 'system'));
  ship.hull = hullMax(ship); ship.shield = shieldMax(ship); ship.fuel = fuelMax(ship);
  ship.rockets = B.ROCKET_LOAD; ship.dartStock = B.DART_COUNT;
  state.credits = 5000; state.charts = state.sectors.map((s) => s.id);
  for (const p of state.players) p.hp = crewHpMax(ship);
  state.test = true;
}

export function buyUpgrade(state, id, discount = 1) {
  const reason = blockedReason(state, id, discount);
  if (reason) { state.events.push({ type: 'cannotBuy', reason }); return false; }
  const ship = state.ship;
  state.credits -= priceOf(ship, id, discount);
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
