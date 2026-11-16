// What stations sell, and what the bought upgrades do to the ship's numbers.
import { B } from './balance.js';
import { learn } from './intel.js';
import { fillPurses } from './purses.js';

// slot: 'hard' sits on the hull and shows, 'system' sits inside, null takes no slot.
// tab: where it is sold. 'hull' and 'system' need a shipyard, 'armory' is boarding gear sold at any trading station.
// role: whose purse pays for it (R-1114). Boarding gear has none: whoever buys it pays (R-1113).
export const CATALOG = {
  twin: {
    tab: 'hull',
    role: 'gunner',
    name: 'TWIN WING TURRETS',
    slot: 'hard',
    size: 1,
    price: 150,
    desc: 'TWO MORE PULSE TURRETS',
  },
  heavy: {
    tab: 'hull',
    role: 'gunner',
    name: 'HEAVY LASER',
    slot: 'hard',
    size: 1,
    price: 220,
    desc: 'CHARGED BEAM, FIRES STRAIGHT AHEAD',
  },
  rockets: {
    tab: 'hull',
    role: 'gunner',
    name: 'ROCKET PODS',
    slot: 'hard',
    size: 1,
    price: 200,
    desc: 'HOMING ROCKETS, 8 PER LOAD',
  },
  bay: {
    tab: 'hull',
    role: 'gunner',
    name: 'FIGHTER BAY',
    slot: 'hard',
    size: 2,
    price: 320,
    desc: 'THREE DARTS, LAUNCHED BY THE CAPTAIN',
  },
  armor: { tab: 'hull', role: 'engineer', name: 'ARMOR PLATING', slot: 'hard', size: 1, price: 160, desc: 'HULL +80' },
  pd: {
    tab: 'hull',
    role: 'engineer',
    name: 'POINT DEFENSE',
    slot: 'hard',
    size: 1,
    price: 220,
    desc: 'SHOOTS DOWN SOME INCOMING FIRE',
  },
  tank: { tab: 'hull', role: 'captain', name: 'FUEL TANK', slot: null, price: 140, desc: 'FUEL +60' },
  auto: {
    tab: 'hull',
    role: 'gunner',
    name: 'DART AUTOLAUNCH',
    slot: null,
    needs: 'bay',
    price: 150,
    desc: 'DARTS LAUNCH WHEN PIRATES SHOW UP',
  },
  slotH: {
    tab: 'hull',
    role: 'gunner',
    name: 'EXTRA HARDPOINT',
    slot: null,
    price: 250,
    levels: 2,
    desc: 'ROOM FOR ONE MORE HULL UPGRADE',
  },
  emit: {
    tab: 'system',
    role: 'engineer',
    name: 'SHIELD EMITTERS',
    slot: 'system',
    size: 1,
    price: 180,
    desc: 'SHIELD +50',
  },
  alarm: {
    tab: 'system',
    role: 'captain',
    name: 'ENEMY ALARM',
    slot: 'system',
    size: 1,
    price: 120,
    levels: 3,
    desc: 'WARNS OF PIRATES FAR OUT',
  },
  tscan: {
    tab: 'system',
    role: 'captain',
    name: 'TARGET SCANNER',
    slot: 'system',
    size: 1,
    price: 140,
    desc: 'SHOWS HEALTH AND BOARDING RISK',
  },
  tcomp: {
    tab: 'system',
    role: 'gunner',
    name: 'TARGETING COMPUTER',
    slot: 'system',
    size: 1,
    price: 130,
    desc: 'SHOWS THE GUNNER WHERE TO AIM',
  },
  core: { tab: 'system', role: 'engineer', name: 'POWER CORE', slot: 'system', size: 1, price: 240, desc: 'POWER +2' },
  boost: {
    tab: 'system',
    role: 'captain',
    name: 'AFTERBURNER',
    slot: 'system',
    size: 1,
    price: 160,
    desc: 'HOLD SHIFT FOR SPEED, BURNS FUEL FAST',
  },
  jumpcoil: {
    tab: 'system',
    role: 'captain',
    name: 'JUMP COILS',
    slot: 'system',
    size: 1,
    price: 180,
    desc: 'JUMPS CHARGE FASTER AND COST LESS FUEL',
  },
  tractor: {
    tab: 'system',
    role: 'captain',
    name: 'TRACTOR BEAM',
    slot: 'system',
    size: 1,
    price: 150,
    desc: 'PULLS IN SALVAGE FROM A DISTANCE',
  },
  drones: {
    tab: 'system',
    role: 'engineer',
    name: 'REPAIR DRONES',
    slot: 'system',
    size: 1,
    price: 200,
    desc: 'SLOWLY REPAIR THE SHIP ON THEIR OWN',
  },
  solar: {
    tab: 'system',
    role: 'captain',
    name: 'SOLAR CELLS',
    slot: 'system',
    size: 1,
    price: 200,
    desc: 'SLOWLY FILL THE TANK FROM STARLIGHT',
  },
  dockfield: {
    tab: 'system',
    role: 'engineer',
    name: 'DOCKING FIELD',
    slot: 'system',
    size: 1,
    price: 150,
    desc: 'A STRONGER EXTRA SHIELD WHILE DOCKED',
  },
  slotS: {
    tab: 'system',
    role: 'engineer',
    name: 'EXTRA SYSTEM SLOT',
    slot: null,
    price: 200,
    levels: 2,
    desc: 'ROOM FOR ONE MORE SYSTEM',
  },
  // It needs no slot. Level one shows the systems one jump away as they are now, level two those two jumps away
  // (F-195). The second level costs what `prices` says.
  sysradar: {
    tab: 'system',
    role: 'captain',
    name: 'SYSTEM RADAR',
    slot: null,
    price: 200,
    prices: [200, 350],
    levels: 2,
    desc: 'SHOWS WHO HOLDS THE SYSTEMS NEAR BY, AS THEY ARE NOW',
  },
  rifle: { tab: 'armory', name: 'RIFLE UPGRADE', slot: null, price: 120, levels: 2, desc: 'BOARDERS HIT HARDER' },
  pack: { tab: 'armory', name: 'CARGO PACK', slot: null, price: 140, desc: 'CARRY TWO MORE THINGS PER TRIP' },
  suit: { tab: 'armory', name: 'SUIT ARMOR', slot: null, price: 160, desc: 'BOARDERS TAKE MORE BEFORE THE TELEPORT' },
  // The one thing in the armory that is used up: the ship carries one at a time, and buys a new one after.
  charge: {
    tab: 'armory',
    name: 'BREACHING CHARGE',
    slot: null,
    price: 50,
    used: true,
    desc: 'THE GUNNER BLOWS A VAULT DOOR OPEN WITH C  ·  WAKES EVERYONE  ·  USED UP',
  },
  tranq: {
    tab: 'armory',
    name: 'TRANQ GUN',
    slot: null,
    price: 120,
    desc: 'R SWAPS TO SILENT DARTS THAT PUT GUARDS TO SLEEP',
  },
  flare: { tab: 'armory', name: 'FLARES', slot: null, price: 60, desc: 'Q THROWS A FLARE THAT LIGHTS A DARK ROOM' },
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
export const dockShieldMax = (ship) => B.DOCK_SHIELD + (has(ship, 'dockfield') ? B.DOCK_SHIELD_MORE : 0);
export const fuelMax = (ship) => B.FUEL_MAX + (has(ship, 'tank') ? B.TANK_FUEL : 0);
export const jumpCharge = (ship) => (has(ship, 'jumpcoil') ? B.COIL_CHARGE : B.JUMP_CHARGE);
export const jumpFuel = (ship) => (has(ship, 'jumpcoil') ? B.COIL_FUEL : B.JUMP_FUEL);
// Where on the fuel gauge each jump's worth of fuel ends, from 0 to 1, so that the gauge shows how many jumps
// the tank holds without a number (F-229).
export function fuelMarks(ship) {
  const step = jumpFuel(ship) / fuelMax(ship);
  const marks = [];
  for (let k = 1; k * step < 0.999; k++) marks.push(k * step);
  return marks;
}
export const crewHpMax = (ship) => B.CREW_HP + (has(ship, 'suit') ? B.SUIT_HP : 0);
export const carryMax = (ship) => B.CARRY_MAX + (has(ship, 'pack') ? B.PACK_EXTRA : 0);
export const rifleDmg = (ship) => B.RIFLE_DMG + B.RIFLE_STEP * level(ship, 'rifle');
export const teleCooldown = (ship) => (has(ship, 'coils') ? B.COIL_TELEPORT : B.TELEPORT_COOLDOWN);
export const breakinBonus = (ship) => (has(ship, 'hack') ? B.HACK_BONUS : 1);
export const slotsUsed = (ship, kind) =>
  Object.keys(ship.mods).reduce((a, id) => a + (CATALOG[id].slot === kind && has(ship, id) ? CATALOG[id].size : 0), 0);
export const priceOf = (ship, id, discount = 1) => {
  const item = CATALOG[id];
  const base = item.prices
    ? item.prices[Math.min(level(ship, id), item.prices.length - 1)]
    : item.price * (1 + 0.5 * level(ship, id));
  return Math.round(base * discount);
};

// The purse an item is paid from: the role it belongs to, or for boarding gear the one given (R-1113, R-1114).
export const payerOf = (id, own = 'captain') => (CATALOG[id] && CATALOG[id].role) || own;

// Why an item cannot be bought right now, or null when it can. `own` is the purse boarding gear is paid from.
export function blockedReason(state, id, discount = 1, own = 'captain') {
  const item = CATALOG[id],
    ship = state.ship,
    lv = level(ship, id);
  if (!item) return 'UNKNOWN';
  if (lv >= (item.levels || 1)) {
    if (item.used) return 'CARRIED';
    return item.levels ? 'MAXED' : item.tab === 'armory' ? 'OWNED' : 'INSTALLED';
  }
  if (item.needs && !has(ship, item.needs)) return 'NEEDS ' + CATALOG[item.needs].name;
  if (item.slot && lv === 0 && slotsUsed(ship, item.slot) + item.size > ship.slots[item.slot])
    return item.slot === 'hard' ? 'NO FREE HARDPOINT' : 'NO FREE SYSTEM SLOT';
  if (state.purses[payerOf(id, own)] < priceOf(ship, id, discount)) return 'NOT ENOUGH CREDITS';
  return null;
}

// Test mode: everything is installed from the start, with slots to hold it all and plenty of credits.
export function applyTestLoadout(state) {
  const ship = state.ship;
  for (const id of Object.keys(CATALOG)) ship.mods[id] = CATALOG[id].levels || 1;
  ship.slots.hard = Math.max(ship.slots.hard + 2, slotsUsed(ship, 'hard'));
  ship.slots.system = Math.max(ship.slots.system + 2, slotsUsed(ship, 'system'));
  ship.hull = hullMax(ship);
  ship.shield = shieldMax(ship);
  ship.fuel = fuelMax(ship);
  ship.rockets = B.ROCKET_LOAD;
  ship.dartStock = B.DART_COUNT;
  fillPurses(state, 5000);
  // Every system is known, as it is at the start.
  state.charts = state.sectors.map((s) => s.id);
  for (const sec of state.sectors) learn(state, sec.id);
  for (const p of state.players) p.hp = crewHpMax(ship);
  state.test = true;
}

export function buyUpgrade(state, id, discount = 1, own = 'captain') {
  const reason = blockedReason(state, id, discount, own);
  if (reason) {
    state.events.push({ type: 'cannotBuy', reason });
    return false;
  }
  const ship = state.ship;
  state.purses[payerOf(id, own)] -= priceOf(ship, id, discount);
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
