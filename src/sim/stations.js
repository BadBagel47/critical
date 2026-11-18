// Stations. Each belongs to a side: the crew, the pirates, a faction, or itself. How it treats the crew
// follows from that: friendly and neutral ones trade, hostile ones shoot. All of them defend themselves.
import { B } from './balance.js';
import { THINGS, BASE } from './kinds.js';
import { CREW, PIRATE, ownSide, moodOf, enemies, changeStanding, provoke, isAngry, inSanctuary } from './sides.js';
import { thingsOf, findThing, findDock, mapInfo } from './things.js';
import { makeVessel } from './vessels.js';
import { currentSector } from './sectors.js';
import { teleportAllHome, setMood } from './boarding.js';
import { restorePower, openCommand } from './pressure.js';
import {
  buyUpgrade,
  installPart,
  removePart,
  sellPart,
  hullMax,
  fuelMax,
  priceOf,
  payerOf,
  CATALOG,
} from './upgrades.js';
import { payBounty } from './bounty.js';
import { fuelUnit } from './fuel.js';
import { readChart } from './intel.js';
import { earn, spend, mayBuyFor, ownPurse, ROLE_NAME } from './purses.js';
import { turnOnCrew } from './mainframe.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, rand, randRange, TAU } from './util.js';

// The guns a base has, of its ten places (R-1208): none with no defence bought, two, six and all ten. A base that
// is not the crew's gets a level of defence from how dangerous its system is when it is made (R-1230, sectors.js).
// The large gun is bought on its own (R-1164). `off` is a gun of the crew's own station that has been mended and
// waits to be switched on at the mainframe. Guns that are already there keep how they are.
export const GUNS_AT = [0, 2, 6, 10];
export function gunSlots(st) {
  const d = defenseOf(st);
  const n = GUNS_AT[d.guns];
  const list = BASE.guns.slice(0, n);
  return d.cannon ? [...list, BASE.cannon] : list;
}
export const remountGuns = (st) => (st.guns = mountGuns(st, st.guns));
function mountGuns(st, keep = []) {
  return gunSlots(st).map((g) => {
    const was = keep.find((k) => k.x === g.x && k.y === g.y);
    return was || { ...g, hp: gunHpMax(st), heading: 0, cool: 1, off: false };
  });
}
// What has been bought for a station's defence, level by level. It stays with the station whoever holds it.
export const defenseOf = (st) => ({ shield: 0, guns: 0, inner: 0, cannon: 0, ...st.defense });
export const stationShieldMax = (st) => B.STATION_SHIELD * (1 + B.DEFENSE_SHIELD * defenseOf(st).shield);
export const gunHpMax = (st) => B.STATION_GUN_HP * (1 + B.DEFENSE_GUN * defenseOf(st).guns);
export const gunDmg = (st, gun = null) =>
  (st.side === PIRATE ? B.PIRATE_STATION_GUN_DMG : B.STATION_GUN_DMG) *
  (1 + B.DEFENSE_GUN * defenseOf(st).guns) *
  (gun && gun.cannon ? B.CANNON_DMG : gun && gun.heavy ? B.HEAVY_GUN_DMG : 1);

// Every station in the world, also those in sectors the crew has left, each with the sector it is in.
export function allStations(state) {
  const list = thingsOf(state, 'station').map((st) => ({ st, sector: state.sector }));
  for (const sec of state.sectors) {
    if (!sec.saved) continue;
    for (const t of sec.saved.things) if (t.kind === 'station') list.push({ st: t, sector: sec.id });
  }
  return list;
}
// A station the crew can walk into and trade at.
export const isTrading = (t) => !!t && t.kind === 'station' && t.align !== 'hostile' && !t.closed;
const alignFor = (mood) => (mood === 'hostile' ? 'hostile' : mood === 'friendly' ? 'friendly' : 'neutral');

// `side` is 'crew', 'pirate', a faction, or null for a station that stands on its own.
// `home` marks the crew's own yard in the first sector, which pirates never raid.
export function createStation(s, x, y, side, shipyard, name, home = false) {
  const id = s.nextId++;
  const st = {
    id,
    kind: 'station',
    x,
    y,
    // Each base stands turned its own way (R-1162). It is read off its number, not drawn, so that a world made
    // from the same seed is laid out as it was. Its ring turns by itself: `ring` is how far, and `ringTo` where to.
    heading: (id * 2.39996) % TAU,
    ring: 0,
    ringTo: 0,
    side: side || ownSide(id),
    // How it treats the crew: 'friendly', 'neutral' or 'hostile'. `closed` is neutral but with no trade.
    align: 'neutral',
    closed: false,
    home,
    shipyard,
    name,
    difficulty: 3,
    lock: 'open',
    breakin: null,
    interior: null,
    chart: null,
    favor: 0,
    hp: B.STATION_HP,
    shield: B.STATION_SHIELD,
    lastHit: -99,
    defense: { shield: 0, guns: 0, inner: 0, cannon: 0 },
    // On a station of the crew's: the part being mended from the mainframe, 'hull' or a gun by number.
    fix: null,
    // When the crew took it, and whose it was before. `crewDefense` is what the crew gets back if it takes its own
    // base again after it fell (R-218).
    takenAt: null,
    from: null,
    crewDefense: null,
    guns: [],
    // A station of the crew's: its own purse for its defence, and the seconds towards its next income (F-088).
    purse: 0,
    incomeT: 0,
  };
  st.guns = mountGuns(st);
  if (st.side !== CREW && st.side !== PIRATE) s.standing[st.side] = s.standing[st.side] || 0;
  st.align = alignFor(moodOf(s, st.side));
  if (st.align === 'hostile') st.lock = 'locked';
  return st;
}

// ---------- how a station treats the crew ----------
function goHostile(state, st) {
  st.breakin = null;
  st.align = 'hostile';
  st.lock = 'locked';
  state.events.push({ type: 'stationHostile', name: st.name });
  // Those walking around inside stay, and the station sounds the alarm on them (docs/station-boarding.md,
  // section 1). With nobody inside, the trading floor is just gone.
  const it = st.interior;
  if (it && it.avatars.length) {
    turnOnCrew(state, st, null, false);
    return;
  }
  st.interior = null;
  if (state.ship.docked === st.id) state.ship.docked = null;
}

function makePeace(state, st, align) {
  st.align = align;
  st.lock = 'open';
  st.breakin = null;
  st.interior = null;
  state.events.push({ type: 'stationPeace', name: st.name });
}

// Bring a station in line with what its side thinks of the crew right now.
function syncStation(state, st) {
  const mood = moodOf(state, st.side);
  // A station that is busy fighting the crew off lets nobody in either. But a crew that is taking it from the
  // inside is not thrown out: the fight is in there.
  const closed = mood === 'closed' || isAngry(state, st.side);
  const seized = !!st.interior && st.interior.seize;
  if (closed && !st.closed && !seized) teleportAllHome(state, st.id);
  st.closed = closed;
  const want = alignFor(mood);
  if (want === st.align) return;
  if (want === 'hostile' && seized) {
    st.align = 'hostile';
    st.lock = 'locked';
  } else if (want === 'hostile') goHostile(state, st);
  else if (st.align === 'hostile') makePeace(state, st, want);
  else st.align = want;
}

// The crew takes a station over. It becomes theirs, with a shipyard.
// It is left in peace for a while, see siege.js. The base's security blows its own guns as it falls, so the
// mounts stand empty and the crew builds the defence up itself (R-1231). A base of the crew's own that is taken
// back gets what was left of what the crew bought (R-218). Shield and inner security stay as they were.
export function takeOver(state, st) {
  const blown = !st.crewDefense && (defenseOf(st).guns > 0 || defenseOf(st).cannon > 0);
  st.defense = st.crewDefense ? { ...st.crewDefense } : { ...defenseOf(st), guns: 0, cannon: 0 };
  st.crewDefense = null;
  st.from = st.side;
  st.side = CREW;
  st.takenAt = state.time;
  st.purse = 0;
  st.incomeT = 0;
  // The first attack on a station of theirs does not come at once.
  state.siegeTimer = Math.max(state.siegeTimer, B.SIEGE_FIRST);
  st.align = 'friendly';
  st.closed = false;
  st.shipyard = true;
  st.lock = 'open';
  st.breakin = null;
  st.hp = B.STATION_HP;
  st.shield = stationShieldMax(st);
  st.fix = null;
  st.guns = mountGuns(st);
  const it = st.interior;
  if (it) {
    it.guards = [];
    it.turrets = [];
    it.cameras = [];
    it.alarmed = [];
    it.hack = null;
    it.seize = false;
    // The power is back, and the command room stays open to the crew.
    restorePower(st);
    openCommand(it);
    setMood(it, null);
    it.desks = [];
  }
  state.events.push({ type: 'stationTaken', name: st.name, blown });
}

// A station falls to those who attacked it: pirates that overran it, or the attackers on a station of the
// crew's. Half of what was bought for its defence is left, so it is harder to take back than it was to take.
export function fall(state, st, by = PIRATE) {
  st.from = st.side;
  st.side = by;
  st.hp = B.STATION_HP / 2;
  st.shield = 0;
  st.fix = null;
  const d = defenseOf(st);
  st.defense = {
    shield: Math.floor(d.shield / 2),
    guns: Math.floor(d.guns / 2),
    inner: Math.floor(d.inner / 2),
    cannon: 0,
  };
  // What the crew gets back if it takes its base again (R-218).
  if (st.from === CREW) st.crewDefense = { ...st.defense };
  st.guns = mountGuns(st);
  st.favor = 0;
  state.events.push({ type: 'stationFell', name: st.name, side: by });
  if (state.things.includes(st)) syncStation(state, st);
  else {
    // A station in a sector the crew is not in is brought in line when they come back.
    st.align = 'hostile';
    st.lock = 'locked';
    st.interior = null;
  }
}

// ---------- trade ----------
export const yardOpen = (st) => st.shipyard;
// Why an item is not sold at a station, or null when it is. Every trading station sells everything: parts are
// installed at a shipyard afterwards (R-1132). The base of the sanctuary sells only the cheapest upgrades (R-882).
export function notSoldHere(state, st, id) {
  const item = CATALOG[id];
  if (!item || item.tab === 'armory' || !st.sanctuary) return null;
  return priceOf(state.ship, id) <= B.SANCTUARY_SHOP_MAX ? null : 'NOT SOLD IN THE SANCTUARY';
}
// What the crew pays compared with the listed price: less at a station that owes them a favour,
// more at one that is wary of them.
export function priceFactor(state, st) {
  const wary = moodOf(state, st.side) === 'wary' ? B.WARY_PRICE : 1;
  return (st.favor > 0 ? B.FAVOR_DISCOUNT : 1) * wary;
}

// What each service costs right now, and how much of it the ship needs. Used by the shop screen too.
export function servicePrices(state, st) {
  const ship = state.ship;
  const a = st.align;
  const k = priceFactor(state, st);
  const fuel = Math.ceil(fuelMax(ship) - ship.fuel);
  const wear = hullMax(ship) - ship.hull + ship.nodes.reduce((sum, n) => sum + (100 - n.hp) * 0.3, 0);
  const rockets = ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0;
  const chart = st.chart !== null && !state.charts.includes(st.chart) ? 1 : 0;
  return {
    refuel: { need: fuel, price: Math.ceil(fuel * fuelUnit(st) * k) },
    repair: { need: Math.ceil(wear), price: Math.ceil(wear * B.REPAIR_PRICE[a] * k) },
    rockets: { need: rockets, price: Math.ceil(rockets * B.ROCKET_PRICE[a] * k) },
    chart: { need: chart, price: Math.ceil(B.CHART_PRICE[a] * k) },
    // Probes and buoys are bought as many as the ship holds (R-1147).
    probes: {
      need: B.PROBE_STOCK - ship.probeStock,
      price: Math.ceil((B.PROBE_STOCK - ship.probeStock) * B.PROBE_PRICE * k),
    },
    buoys: {
      need: B.BUOY_STOCK - ship.buoyStock,
      price: Math.ceil((B.BUOY_STOCK - ship.buoyStock) * B.BUOY_PRICE * k),
    },
    // Ore from the hold is sold here. `price` is what it brings in.
    ore: { need: state.ship.ore, price: state.ship.ore * B.ORE_PRICE },
    // A bounty is paid in full wherever it is paid, and a station of the crew's own takes it too.
    bounty: { need: state.bounty ? 1 : 0, price: state.bounty ? state.bounty.amount : 0 },
  };
}

// Every service at the desk is paid by whoever orders it, from their own purse, so that the crew can take turns
// (R-1121). The bounty too (R-1117).
export const servicePayer = (state, action, playerId) => ownPurse(state, playerId);

const refuse = (state, reason) => state.events.push({ type: 'cannotBuy', reason });
function pay(state, role, price) {
  if (!spend(state, role, price)) {
    refuse(state, 'NOT ENOUGH CREDITS');
    return false;
  }
  return true;
}

// Each service, once it is known that the ship needs it.
const SERVICES = {
  ore(state, st, info) {
    earn(state, info.price);
    state.ship.ore = 0;
    state.ship.refined = 0;
    state.events.push({ type: 'oreSold', credits: info.price });
  },
  bounty(state, st, info, role) {
    if (!pay(state, role, info.price)) return;
    payBounty(state);
  },
  // With too few credits the tank is filled as far as the money goes.
  refuel(state, st, info, role) {
    const ship = state.ship;
    const unit = fuelUnit(st) * priceFactor(state, st);
    const amount = unit ? Math.min(info.need, Math.floor(state.purses[role] / unit)) : info.need;
    if (amount <= 0) return refuse(state, 'NOT ENOUGH CREDITS');
    state.purses[role] -= Math.ceil(amount * unit);
    ship.fuel = Math.min(fuelMax(ship), ship.fuel + amount);
    state.events.push({ type: 'refuelled', amount });
  },
  repair(state, st, info, role) {
    const ship = state.ship;
    if (!pay(state, role, info.price)) return;
    ship.hull = hullMax(ship);
    for (const n of ship.nodes) n.hp = 100;
    state.events.push({ type: 'repairedAll' });
  },
  rockets(state, st, info, role) {
    if (!pay(state, role, info.price)) return;
    state.ship.rockets = B.ROCKET_LOAD;
    state.events.push({ type: 'rearmed' });
  },
  probes(state, st, info, role) {
    if (!pay(state, role, info.price)) return;
    state.ship.probeStock = B.PROBE_STOCK;
    state.events.push({ type: 'restocked', what: 'PROBES' });
  },
  buoys(state, st, info, role) {
    if (!pay(state, role, info.price)) return;
    state.ship.buoyStock = B.BUOY_STOCK;
    state.events.push({ type: 'restocked', what: 'BUOYS' });
  },
  chart(state, st, info, role) {
    if (!pay(state, role, info.price)) return;
    state.charts.push(st.chart);
    // It shows the systems around the one it is of, as they are now (D-089).
    readChart(state, st.chart);
    state.events.push({ type: 'chart', sector: st.chart });
  },
};

// One order at a desk. `order.player` is who gave it: a player buys only for the roles they have (R-1106).
function shop(state, st, order) {
  const own = ownPurse(state, order.player);
  if (['buy', 'sell', 'install', 'remove'].includes(order.action)) {
    if (!CATALOG[order.item]) return;
    const role = payerOf(order.item, own);
    const verb = { buy: 'BUYS', sell: 'SELLS', install: 'INSTALLS', remove: 'REMOVES' }[order.action];
    if (!mayBuyFor(state, order.player, role)) return refuse(state, `ONLY THE ${ROLE_NAME[role]} ${verb} THIS`);
    if (order.action === 'buy') {
      const why = notSoldHere(state, st, order.item);
      if (why) return refuse(state, why);
      buyUpgrade(state, order.item, priceFactor(state, st), own);
      return;
    }
    if (order.action === 'sell') return sellPart(state, order.item, role, st.side === CREW);
    // Parts are installed and taken out at a shipyard, for free, and only there (R-1132, R-1138).
    if (!yardOpen(st)) return refuse(state, 'NO SHIPYARD HERE');
    if (order.action === 'install') installPart(state, order.item);
    else removePart(state, order.item);
    return;
  }
  const service = SERVICES[order.action];
  const info = service && servicePrices(state, st)[order.action];
  if (!info || info.need <= 0) return;
  // A service is ordered by whoever stands at the desk, and paid from the purse of the role it belongs to, so
  // that the Captain need not go aboard to refuel.
  if (order.action === 'ore') return service(state, st, info);
  service(state, st, info, servicePayer(state, order.action, order.player));
}

// ---------- defence ----------
// A station with enemy ships around it is in a fight.
const inFight = (state, st) =>
  state.vessels.some(
    (v) => v.hp > 0 && enemies(state, st.side, v.side) && dist(v.x, v.y, st.x, st.y) < B.STATION_FIGHT,
  );

// Whether a shot fired by `side` lands on the station. Its enemies hit it. Everyone else shoots past it,
// and so does the crew while the station is in a fight: a stray shot then is no attack on the station.
// When all is calm, a shot from the crew lands, and the station takes it for what it is.
export function struckBy(state, st, side) {
  if (enemies(state, side, st.side)) return true;
  return side === CREW && st.side !== CREW && !inFight(state, st);
}

// Something hits a station. The shield takes it first, then the gun it lands on, then the hull.
// `at` is where it hit, and `by` the side that fired.
export function damageStation(state, st, dmg, at, by) {
  st.lastHit = state.time;
  if (by === CREW && st.side !== PIRATE && st.side !== CREW) {
    // Shooting at someone who is not an enemy costs their good will, and they do not just take it. The base of
    // the sanctuary fights back for a while too, but forgets: it is always somewhere to come back to.
    if (!st.sanctuary) changeStanding(state, st.side, -B.STANDING_LOSS.stationHit);
    provoke(state, st.side);
  }
  const absorbed = Math.min(st.shield, dmg);
  st.shield -= absorbed;
  if (absorbed > 0) state.fx.push({ type: 'shield', x: at.x, y: at.y, t: 0, dur: 0.2 });
  const rest = dmg - absorbed;
  if (rest <= 0) return;
  for (const gun of st.guns) {
    const p = toWorld(st, gun);
    if (gun.hp <= 0 || dist(p.x, p.y, at.x, at.y) >= 16) continue;
    gun.hp -= rest;
    if (gun.hp <= 0) {
      state.fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, dur: 0.5, size: 16 });
      state.events.push({ type: 'gunDown' });
    }
    return;
  }
  st.hp = Math.max(0, st.hp - rest);
  if (st.hp > 0) return;
  // Pirates take a beaten station for themselves. Anyone else just silences its guns. A station of the crew's
  // only falls when attackers take its mainframe, see siege.js.
  if (by === PIRATE && st.side !== PIRATE && st.side !== CREW) fall(state, st);
  else for (const gun of st.guns) gun.hp = 0;
}

// What a gun would shoot at: the nearest enemy ship, or the frigate when the crew is the enemy.
function gunTarget(state, st, p) {
  const ship = state.ship;
  let best = null;
  let bestD = B.STATION_RANGE;
  if (!state.over && enemies(state, st.side, CREW)) {
    const d = dist(p.x, p.y, ship.x, ship.y);
    if (d <= bestD) {
      best = ship;
      bestD = d;
    }
  }
  for (const v of state.vessels) {
    if (v.hp <= 0 || !enemies(state, st.side, v.side)) continue;
    const d = dist(p.x, p.y, v.x, v.y);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

function stepGuns(state, st, dt) {
  for (const g of st.guns) {
    if (g.hp <= 0 || g.off) continue;
    const p = toWorld(st, g);
    g.cool -= dt;
    // A gun of a base is never shot by the ring that turns past it: it fires at what is out of its way.
    const target = gunTarget(state, st, p);
    if (!target) continue;
    // Aim a little ahead of where the target is going.
    const lead = dist(p.x, p.y, target.x, target.y) / B.PIRATE_BOLT_SPEED;
    const want = headingTo(target.x + target.vx * lead * 0.7 - p.x, target.y + target.vy * lead * 0.7 - p.y);
    g.heading = turnToward(g.heading, want, 2.2 * dt);
    if (g.cool > 0 || Math.abs(angleDiff(want, g.heading)) >= 0.12) continue;
    const f = forward(g.heading + randRange(state, -B.STATION_GUN_SPREAD, B.STATION_GUN_SPREAD));
    state.bolts.push({
      x: p.x + f.x * 8,
      y: p.y + f.y * 8,
      vx: f.x * B.PIRATE_BOLT_SPEED,
      vy: f.y * B.PIRATE_BOLT_SPEED,
      ttl: 1.8,
      side: st.side,
      dmg: gunDmg(st, g),
    });
    g.cool = B.STATION_GUN_COOLDOWN;
  }
}

// The shield comes back after a pause without hits. The hull and the guns of other stations are mended after a
// longer one. The crew's own are mended from the mainframe instead, see stepOwned.
function stepRepairs(st, time, dt) {
  const quiet = time - st.lastHit;
  if (quiet > B.STATION_SHIELD_DELAY)
    st.shield = Math.min(stationShieldMax(st), st.shield + B.STATION_SHIELD_RECHARGE * dt);
  if (quiet <= B.STATION_REPAIR_DELAY || st.side === CREW) return;
  st.hp = Math.min(B.STATION_HP, st.hp + B.STATION_REPAIR * dt);
  for (const g of st.guns) g.hp = Math.min(gunHpMax(st), g.hp + B.STATION_REPAIR * dt);
}

// The part of a station of the crew's that is being mended comes along, also while the crew is far away. A gun
// that is whole again waits to be switched on. Where the crew is not, the shield comes back too. Its income
// comes in.
function stepOwned(state, dt) {
  for (const { st, sector } of allStations(state)) {
    if (st.side !== CREW) continue;
    // Its income comes in once a minute, wherever the crew is (F-088): to its own purse, which pays for its
    // defence (R-1115), and to every role's purse (R-1116).
    st.incomeT = (st.incomeT || 0) + dt;
    while (st.incomeT >= B.STATION_INCOME_EVERY) {
      st.incomeT -= B.STATION_INCOME_EVERY;
      st.purse = (st.purse || 0) + B.STATION_INCOME.station;
      earn(state, B.STATION_INCOME.crew);
    }
    if (sector !== state.sector) st.shield = Math.min(stationShieldMax(st), st.shield + B.STATION_SHIELD_RECHARGE * dt);
    if (st.fix === null) continue;
    if (st.fix === 'hull') {
      st.hp = Math.min(B.STATION_HP, st.hp + B.STATION_FIX_HULL * dt);
      if (st.hp >= B.STATION_HP) mended(state, st);
      continue;
    }
    const g = st.guns[st.fix];
    const was = g.hp;
    g.hp = Math.min(gunHpMax(st), g.hp + B.STATION_FIX_GUN * dt);
    if (was <= 0 && g.hp > 0) g.off = true;
    if (g.hp >= gunHpMax(st)) mended(state, st);
  }
}
function mended(state, st) {
  state.events.push({ type: 'fixDone', name: st.name, part: st.fix });
  st.fix = null;
}

// ---------- the ring ----------
// A ship that docks at a port on the ring is turned with it to the bridge, a quarter turn at a time (R-1154).
// At the building dock of a shipyard the ring does not turn.
export const ringTurning = (st) => Math.abs((st.ring || 0) - (st.ringTo || 0)) > 1e-6;
const QUARTER = Math.PI / 2;
// Which of the ports on the ring a ship's nose is at, or -1.
function portAt(st, p) {
  const ports = THINGS.station.ports(st);
  let best = -1;
  let bestD = B.DOCK_RANGE * 3;
  for (let k = 0; k < BASE.ports.length; k++) {
    const w = toWorld(st, ports[k]);
    const d = dist(w.x, w.y, p.x, p.y);
    if (d < bestD) {
      best = k;
      bestD = d;
    }
  }
  return best;
}
// The frigate has docked at a station: the ring is set turning, so that its port comes to the bridge.
export function ringToBridge(st, nose) {
  const k = portAt(st, nose);
  if (k < 0) return;
  const now = BASE.ports.length ? DIAGONALS_OF(k) + (st.ring || 0) : 0;
  let turn = angleDiff(BASE.bridge, now);
  turn = Math.round(turn / QUARTER) * QUARTER;
  st.ringTo = (st.ring || 0) + turn;
}
const DIAGONALS_OF = (k) => Math.atan2(BASE.ports[k].y, BASE.ports[k].x);
function turnRing(state, st, dt) {
  if (!ringTurning(st)) return;
  const was = st.ring;
  const left = st.ringTo - st.ring;
  st.ring += Math.sign(left) * Math.min(Math.abs(left), B.RING_TURN * dt);
  if (!ringTurning(st)) {
    st.ring = st.ringTo;
    state.events.push({ type: 'ringDone', name: st.name });
  }
  // A ship docked at the ring goes round with it.
  const ship = state.ship;
  if (ship.docked !== st.id) return;
  const turn = st.ring - was;
  const c = Math.cos(turn),
    s = Math.sin(turn);
  const dx = ship.x - st.x,
    dy = ship.y - st.y;
  ship.x = st.x + dx * c - dy * s;
  ship.y = st.y + dx * s + dy * c;
  ship.heading = (ship.heading + turn + TAU) % TAU;
}

// ---------- distress calls ----------
// Now and then pirates raid a station that trades, and it calls for help. The crew's own yard is left alone,
// so that there is always somewhere to refuel and repair.
export function startRaid(state) {
  const ship = state.ship;
  // Nobody attacks in the sanctuary.
  if (inSanctuary(state)) {
    state.raidTimer = 60;
    return;
  }
  // The crew's own stations are attacked in a way of their own, see siege.js.
  const open = thingsOf(state, 'station').filter(
    (st) => st.align !== 'hostile' && !st.home && !st.sanctuary && st.side !== CREW && st.id !== ship.docked,
  );
  if (!open.length) {
    state.raidTimer = 60;
    return;
  }
  const st = open[Math.floor(rand(state) * open.length)];
  state.raid = { id: state.nextId++, station: st.id, timer: B.RAID_TIME, helped: false };
  const tier = currentSector(state).tier;
  const a = rand(state) * TAU;
  for (let i = 0; i < B.RAID_SIZE + Math.floor(tier / 2); i++) {
    const kind = tier >= 1 && i === 0 ? 'gunboat' : 'fighter';
    const raider = makeVessel(state, kind, st.x + Math.sin(a + i * 0.5) * 420, st.y - Math.cos(a + i * 0.5) * 420);
    raider.heading = headingTo(st.x - raider.x, st.y - raider.y);
    raider.raid = state.raid.id;
    state.vessels.push(raider);
  }
  // The call tells the crew where the station is, even if they have never seen it.
  if (!state.known.some((k) => k.id === st.id)) state.known.push(mapInfo(st));
  state.events.push({ type: 'distress', name: st.name });
}

function endRaid(state) {
  for (const v of state.vessels) if (v.raid === state.raid.id) v.raid = null;
  state.raid = null;
  state.raidTimer = randRange(state, B.RAID_GAP[0], B.RAID_GAP[1]);
}

// The raiders are gone. If the crew fought them, the station is grateful.
function thankCrew(state, st) {
  changeStanding(state, st.side, B.STANDING_GAIN.rescue);
  if (st.align === 'neutral') {
    st.favor = B.FAVOR_TIME;
    state.events.push({ type: 'distressSaved', name: st.name, favor: true });
  } else {
    earn(state, B.RAID_REWARD);
    state.events.push({ type: 'distressSaved', name: st.name, reward: B.RAID_REWARD });
  }
}

function stepRaids(state, dt) {
  const ship = state.ship;
  if (!state.raid) {
    // A test game has no raids unless they are asked for, see testing.js.
    if (state.test) return;
    state.raidTimer -= dt;
    if (state.raidTimer <= 0) startRaid(state);
    return;
  }
  const raid = state.raid;
  const st = findThing(state, raid.station);
  raid.timer -= dt;
  const raiders = state.vessels.filter((v) => v.raid === raid.id);
  if (!st || st.side === PIRATE) {
    // The station fell. The raiders stay to guard what they took.
    endRaid(state);
  } else if (raiders.length === 0) {
    if (raid.helped) thankCrew(state, st);
    else state.events.push({ type: 'distressHeld', name: st.name });
    endRaid(state);
  } else if (raid.timer <= 0) {
    // The raiders give up and leave. Those close to the frigate stay to fight.
    state.vessels = state.vessels.filter((v) => v.raid !== raid.id || dist(v.x, v.y, ship.x, ship.y) < 700);
    state.events.push({ type: 'distressHeld', name: st.name });
    endRaid(state);
  }
}

export function stepStations(state, cmds, dt) {
  const docked = findDock(state, state.ship.docked);
  for (const order of cmds.shop || []) {
    if (isTrading(docked)) shop(state, docked, order);
  }
  const stations = thingsOf(state, 'station');
  for (const st of stations) {
    st.favor = Math.max(0, st.favor - dt);
    syncStation(state, st);
    stepRepairs(st, state.time, dt);
  }
  stepOwned(state, dt);
  stepRaids(state, dt);
  for (const st of stations) turnRing(state, st, dt);
  for (const st of stations) stepGuns(state, st, dt);
}
