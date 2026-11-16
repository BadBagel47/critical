// What stations sell, and what the bought upgrades do to the ship's numbers.
import { B } from './balance.js';
import { learn } from './intel.js';
import { fillPurses } from './purses.js';

// slot: 'hard' sits on the hull and shows, 'system' sits inside, null takes no slot.
// tab: where it is sold. 'hull' and 'system' need a shipyard, 'armory' is boarding gear sold at any trading station.
// role: whose purse pays for it (R-1114). Boarding gear has none: whoever buys it pays (R-1113).
export const CATALOG = {
  // The ship starts with a fixed gun that fires straight ahead. The nose turret turns it (R-733, R-1134).
  nose: {
    tab: 'hull',
    role: 'gunner',
    name: 'NOSE TURRET',
    slot: 'hull',
    price: 140,
    desc: 'THE NOSE GUN TURNS TO WHERE YOU AIM',
  },
  twin: {
    tab: 'hull',
    role: 'gunner',
    name: 'TWIN WING TURRETS',
    slot: 'hull',
    price: 150,
    desc: 'TWO MORE PULSE TURRETS',
  },
  heavy: {
    tab: 'hull',
    role: 'gunner',
    name: 'HEAVY LASER',
    slot: 'hull',
    price: 220,
    desc: 'CHARGED BEAM, FIRES STRAIGHT AHEAD',
  },
  rockets: {
    tab: 'hull',
    role: 'gunner',
    name: 'ROCKET PODS',
    slot: 'hull',
    price: 200,
    desc: 'HOMING ROCKETS, 8 PER LOAD',
  },
  // One Dart for each level, up to three (R-1126). They are launched by hand only (R-1127).
  bay: {
    tab: 'hull',
    role: 'gunner',
    name: 'FIGHTER BAY',
    slot: 'hull',
    price: 320,
    prices: [320, 160, 200],
    levels: 3,
    desc: 'DARTS THAT FIGHT AT YOUR SIDE, ONE MORE FOR EACH LEVEL',
  },
  armor: { tab: 'hull', role: 'engineer', name: 'ARMOR PLATING', slot: 'hull', price: 160, desc: 'HULL +80' },
  pd: {
    tab: 'hull',
    role: 'engineer',
    name: 'POINT DEFENSE',
    slot: 'hull',
    price: 220,
    desc: 'SHOOTS DOWN SOME INCOMING FIRE',
  },
  // The ship starts with fuel for one jump. The tank holds one jump more for each level (R-1125).
  tank: {
    tab: 'hull',
    role: 'captain',
    name: 'FUEL TANK',
    slot: null,
    price: 140,
    prices: [140, 180, 220, 260, 300],
    levels: 5,
    desc: 'ONE MORE JUMP OF FUEL FOR EACH LEVEL',
  },
  // The Engineer's scanner pulse is a part like the others (R-1146).
  scanner: {
    tab: 'system',
    role: 'engineer',
    name: 'SCANNER PULSE',
    slot: 'system',
    price: 160,
    desc: 'SHOWS ALL OF THE SYSTEM FOR A MOMENT, FOR A LITTLE FUEL',
  },
  emit: {
    tab: 'system',
    role: 'engineer',
    name: 'SHIELD EMITTERS',
    slot: 'system',
    price: 180,
    desc: 'SHIELD +50',
  },
  alarm: {
    tab: 'system',
    role: 'captain',
    name: 'ENEMY ALARM',
    slot: 'system',
    price: 120,
    levels: 3,
    desc: 'WARNS OF PIRATES FAR OUT',
  },
  tscan: {
    tab: 'system',
    role: 'captain',
    name: 'TARGET SCANNER',
    slot: 'system',
    price: 140,
    desc: 'SHOWS HEALTH AND BOARDING RISK',
  },
  tcomp: {
    tab: 'system',
    role: 'gunner',
    name: 'TARGETING COMPUTER',
    slot: 'system',
    price: 130,
    desc: 'SHOWS THE GUNNER WHERE TO AIM',
  },
  core: { tab: 'system', role: 'engineer', name: 'POWER CORE', slot: 'system', price: 240, desc: 'POWER +2' },
  boost: {
    tab: 'system',
    role: 'captain',
    name: 'AFTERBURNER',
    slot: 'system',
    price: 160,
    desc: 'HOLD SHIFT FOR SPEED, BURNS FUEL FAST',
  },
  jumpcoil: {
    tab: 'system',
    role: 'captain',
    name: 'JUMP COILS',
    slot: 'system',
    price: 180,
    desc: 'JUMPS CHARGE FASTER AND COST LESS FUEL',
  },
  tractor: {
    tab: 'system',
    role: 'captain',
    name: 'TRACTOR BEAM',
    slot: 'system',
    price: 150,
    desc: 'PULLS IN SALVAGE FROM A DISTANCE',
  },
  drones: {
    tab: 'system',
    role: 'engineer',
    name: 'REPAIR DRONES',
    slot: 'system',
    price: 200,
    desc: 'SLOWLY REPAIR THE SHIP ON THEIR OWN',
  },
  solar: {
    tab: 'system',
    role: 'captain',
    name: 'SOLAR CELLS',
    slot: 'system',
    price: 200,
    desc: 'SLOWLY FILL THE TANK FROM STARLIGHT',
  },
  dockfield: {
    tab: 'system',
    role: 'engineer',
    name: 'DOCKING FIELD',
    slot: 'system',
    price: 150,
    desc: 'A STRONGER EXTRA SHIELD WHILE DOCKED',
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
    role: 'gunner',
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
}; // Extra slots, for each role its own (R-1137): a hull slot and a system slot, two more of each. They are
// permanent and open at once (R-1174, R-1180).
for (const role of ['captain', 'gunner', 'engineer']) {
  CATALOG['slotH_' + role] = {
    tab: 'hull',
    role,
    kind: 'slot',
    opens: 'hull',
    name: 'EXTRA HULL SLOT',
    slot: null,
    price: 250,
    prices: [250, 375],
    levels: 2,
    desc: 'ONE MORE HULL SLOT, FOR GOOD',
  };
  CATALOG['slotS_' + role] = {
    tab: 'system',
    role,
    kind: 'slot',
    opens: 'system',
    name: 'EXTRA SYSTEM SLOT',
    slot: null,
    price: 200,
    prices: [200, 300],
    levels: 2,
    desc: 'ONE MORE SYSTEM SLOT, FOR GOOD',
  };
}

export const TABS = ['hull', 'system', 'armory'];
export const TAB_NAME = { hull: 'HULL', system: 'SYSTEMS', armory: 'ARMORY' };
export const itemsOf = (tab) => Object.keys(CATALOG).filter((id) => CATALOG[id].tab === tab);

// What a thing is: a part of the ship that is installed at a shipyard, gear that a boarder carries and that
// works at once, or a slot (R-1132, R-1142, R-1174). And the filter it is under in the shop (R-1176).
export const kindOf = (id) => CATALOG[id].kind || (CATALOG[id].tab === 'armory' ? 'gear' : 'part');
export const CATS = { upgrade: 'UPGRADES', boarding: 'BOARDING', slot: 'SLOTS' };
export const catOf = (id) => ({ part: 'upgrade', gear: 'boarding', slot: 'slot' })[kindOf(id)];
export const levelsOf = (id) => CATALOG[id].levels || 1;

// `ship.mods[id]` is the level that works: installed, or carried. `ship.owned[id]` is the levels the crew has
// bought or found, also those that lie in the stores (R-1135).
export const level = (ship, id) => ship.mods[id] || 0;
export const has = (ship, id) => level(ship, id) > 0;
export const owned = (ship, id) => Math.max(level(ship, id), (ship.owned && ship.owned[id]) || 0);
export const stored = (ship, id) => owned(ship, id) - level(ship, id);

// The slots of every role (R-1137): how many are open, and how many parts of the role take them. A part in the
// stores takes its slot too, so that the crew never has more parts than it can install (R-1173).
export const MAX_SLOTS = 3;
export const SLOT_KINDS = ['hull', 'system'];
export const slotsOpen = (ship, role, kind) => ship.roleSlots[role][kind];
const partsOf = (role, kind) =>
  Object.keys(CATALOG).filter((id) => CATALOG[id].role === role && CATALOG[id].slot === kind && kindOf(id) === 'part');
export const slotsUsed = (ship, role, kind) => partsOf(role, kind).filter((id) => has(ship, id)).length;
export const slotsTaken = (ship, role, kind) => partsOf(role, kind).filter((id) => owned(ship, id) > 0).length;

export const hullMax = (ship) => B.HULL_MAX + (has(ship, 'armor') ? 80 : 0);
export const shieldMax = (ship) => B.SHIELD_MAX + (has(ship, 'emit') ? 50 : 0);
export const powerTotal = (ship) => B.POWER_TOTAL + (has(ship, 'core') ? 2 : 0);
export const dockShieldMax = (ship) => B.DOCK_SHIELD + (has(ship, 'dockfield') ? B.DOCK_SHIELD_MORE : 0);
export const fuelMax = (ship) => B.FUEL_MAX + level(ship, 'tank') * B.TANK_FUEL;
export const jumpCharge = (ship) => (has(ship, 'jumpcoil') ? B.COIL_CHARGE : B.JUMP_CHARGE);
export const jumpFuel = (ship) => (has(ship, 'jumpcoil') ? B.COIL_FUEL : B.JUMP_FUEL);
// How many Darts the fighter bay holds: one for each level (R-1126).
export const dartsMax = (ship) => level(ship, 'bay');
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
// What level `k` (from 0) of a thing costs.
export const levelPrice = (id, k) => {
  const item = CATALOG[id];
  return item.prices ? item.prices[Math.min(k, item.prices.length - 1)] : item.price * (1 + 0.5 * k);
};
// What the next level costs.
export const priceOf = (ship, id, discount = 1) => Math.round(levelPrice(id, owned(ship, id)) * discount);
// What a level brings back when it is sold: half, or three quarters at a base of the crew's own (R-1139).
export const sellPrice = (ship, id, own = false) =>
  Math.floor(levelPrice(id, owned(ship, id) - 1) * (own ? B.SELL_OWN : B.SELL_BACK));

// The purse an item is paid from: the role it belongs to, or for boarding gear the one given (R-1113, R-1114).
export const payerOf = (id, own = 'captain') => (CATALOG[id] && CATALOG[id].role) || own;

// Why an item cannot be bought right now, or null when it can. `own` is the purse boarding gear is paid from.
export function blockedReason(state, id, discount = 1, own = 'captain') {
  const item = CATALOG[id],
    ship = state.ship,
    have = owned(ship, id);
  if (!item) return 'UNKNOWN';
  if (have >= levelsOf(id)) return item.used ? 'CARRIED' : 'MAXED';
  if (item.needs && !owned(ship, item.needs)) return 'NEEDS ' + CATALOG[item.needs].name;
  // A new part needs a slot of its role that no other part has taken (R-1173).
  if (kindOf(id) === 'part' && item.slot && have === 0) {
    if (slotsTaken(ship, item.role, item.slot) >= slotsOpen(ship, item.role, item.slot)) return 'NO FREE SLOT';
  }
  if (state.purses[payerOf(id, own)] < priceOf(ship, id, discount)) return 'NOT ENOUGH CREDITS';
  return null;
}
// Whether the shop offers a thing at all: not when the crew has the most of it that there is (R-1175).
export const offered = (ship, id) => owned(ship, id) < levelsOf(id);

// What a level does when it starts to work: a full load of rockets, more Darts, and the hull or shield it adds.
function takesEffect(ship, id) {
  if (id === 'rockets' && level(ship, id) === 1) ship.rockets = B.ROCKET_LOAD;
  if (id === 'bay') ship.dartStock++;
  if (id === 'armor') ship.hull += 80;
  if (id === 'emit') ship.shield += 50;
}

// Test mode: everything is installed from the start, with every slot open and plenty of credits.
export function applyTestLoadout(state) {
  const ship = state.ship;
  for (const id of Object.keys(CATALOG)) {
    ship.mods[id] = levelsOf(id);
    ship.owned[id] = levelsOf(id);
  }
  for (const role of Object.keys(ship.roleSlots)) for (const kind of SLOT_KINDS) ship.roleSlots[role][kind] = MAX_SLOTS;
  ship.hull = hullMax(ship);
  ship.shield = shieldMax(ship);
  ship.fuel = fuelMax(ship);
  ship.rockets = B.ROCKET_LOAD;
  ship.dartStock = dartsMax(ship);
  fillPurses(state, 5000);
  // Every system is known, as it is at the start.
  state.charts = state.sectors.map((s) => s.id);
  for (const sec of state.sectors) learn(state, sec.id);
  for (const p of state.players) p.hp = crewHpMax(ship);
  state.test = true;
}

// Buy the next level of a thing. A part goes into the stores, to be installed at a shipyard (R-1135). Gear works
// at once (R-1142). A slot opens at once (R-1180).
export function buyUpgrade(state, id, discount = 1, own = 'captain') {
  const reason = blockedReason(state, id, discount, own);
  if (reason) {
    state.events.push({ type: 'cannotBuy', reason });
    return false;
  }
  const ship = state.ship;
  const item = CATALOG[id];
  state.purses[payerOf(id, own)] -= priceOf(ship, id, discount);
  ship.owned[id] = owned(ship, id) + 1;
  const kind = kindOf(id);
  if (kind === 'slot') {
    ship.roleSlots[item.role][item.opens]++;
    ship.mods[id] = ship.owned[id];
  } else if (kind === 'gear') {
    ship.mods[id] = level(ship, id) + 1;
    takesEffect(ship, id);
  }
  state.events.push({ type: 'bought', item: id, name: item.name, stored: kind === 'part' });
  return true;
}

// Why a part cannot be installed right now, or null when it can.
export function installBlocked(ship, id) {
  const item = CATALOG[id];
  if (!item || kindOf(id) !== 'part') return 'NOTHING TO INSTALL';
  if (stored(ship, id) <= 0) return 'NOTHING IN THE STORES';
  if (
    item.slot &&
    level(ship, id) === 0 &&
    slotsUsed(ship, item.role, item.slot) >= slotsOpen(ship, item.role, item.slot)
  )
    return 'NO FREE SLOT';
  return null;
}
// Install the next level of a part from the stores, at a shipyard, for free (R-1138, R-1141).
export function installPart(state, id) {
  const ship = state.ship;
  const why = installBlocked(ship, id);
  if (why) {
    state.events.push({ type: 'cannotBuy', reason: why });
    return false;
  }
  ship.mods[id] = level(ship, id) + 1;
  takesEffect(ship, id);
  state.events.push({ type: 'installed', item: id, name: CATALOG[id].name, level: ship.mods[id] });
  return true;
}
// Take a part out, with all its levels, back into the stores. What it gave goes with it.
export function removePart(state, id) {
  const ship = state.ship;
  if (kindOf(id) !== 'part' || !has(ship, id)) return false;
  ship.owned[id] = owned(ship, id);
  ship.mods[id] = 0;
  ship.hull = Math.min(ship.hull, hullMax(ship));
  ship.shield = Math.min(ship.shield, shieldMax(ship));
  ship.fuel = Math.min(ship.fuel, fuelMax(ship));
  ship.dartStock = Math.min(ship.dartStock, dartsMax(ship));
  if (id === 'rockets') ship.rockets = 0;
  state.events.push({ type: 'removed', item: id, name: CATALOG[id].name });
  return true;
}
// Why a level of a thing cannot be sold right now, or null when it can. A part is sold from the stores, gear from
// what the boarders carry, and a slot never (R-1131, R-1174).
export function sellBlocked(ship, id) {
  const kind = kindOf(id);
  if (!owned(ship, id)) return 'NOTHING TO SELL';
  if (kind === 'slot') return 'SLOTS ARE PERMANENT';
  if (kind === 'part' && stored(ship, id) <= 0) return 'REMOVE IT AT A SHIPYARD FIRST';
  return null;
}
// Sell one level. `own` is true at a base of the crew's own, where more comes back.
export function sellPart(state, id, role, own = false) {
  const ship = state.ship;
  const why = sellBlocked(ship, id);
  if (why) {
    state.events.push({ type: 'cannotBuy', reason: why });
    return false;
  }
  const back = sellPrice(ship, id, own);
  ship.owned[id] = owned(ship, id) - 1;
  if (kindOf(id) === 'gear') ship.mods[id] = Math.min(level(ship, id), ship.owned[id]);
  state.purses[role] += back;
  state.events.push({ type: 'sold', item: id, name: CATALOG[id].name, credits: back });
  return true;
}
