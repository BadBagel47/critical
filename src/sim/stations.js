// Stations: friendly, neutral or hostile. Friendly and neutral ones trade, hostile ones shoot.
import { B } from './balance.js';
import { THINGS } from './kinds.js';
import { thingsOf, findThing, findDock, mapInfo } from './things.js';
import { makeVessel } from './vessels.js';
import { currentSector } from './sectors.js';
import { teleportAllHome } from './boarding.js';
import { buyUpgrade, hullMax, fuelMax, CATALOG } from './upgrades.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, rand, randRange, TAU } from './util.js';

const mountGuns = () => THINGS.station.guns.map((g) => ({ ...g, hp: B.STATION_GUN_HP, heading: 0, cool: 1 }));
export const isTrading = (t) => !!t && t.kind === 'station' && t.align !== 'hostile';

export function createStation(s, x, y, align, shipyard, name) {
  return {
    id: s.nextId++,
    kind: 'station',
    x,
    y,
    heading: 0,
    align,
    shipyard,
    name,
    difficulty: 3,
    lock: align === 'hostile' ? 'locked' : 'open',
    breakin: null,
    interior: null,
    anger: 0,
    chart: null,
    favor: 0,
    guns: align === 'hostile' ? mountGuns() : [],
  };
}

export function turnHostile(state, st) {
  if (st.align === 'hostile') return;
  // Anyone walking around inside is sent back to the ship, and the trading floor is gone.
  teleportAllHome(state, st.id);
  st.interior = null;
  st.breakin = null;
  st.align = 'hostile';
  st.lock = 'locked';
  st.guns = mountGuns();
  if (state.ship.docked === st.id) state.ship.docked = null;
  state.events.push({ type: 'stationHostile', name: st.name });
}

export function takeOver(state, st) {
  st.align = 'friendly';
  st.shipyard = true;
  st.lock = 'open';
  st.guns = [];
  st.anger = 0;
  if (st.interior) {
    st.interior.guards = [];
    st.interior.turrets = [];
  }
  state.events.push({ type: 'stationTaken', name: st.name });
}

// ---------- trade ----------
// A neutral shipyard only works for crews it owes a favour. Friendly yards are always open.
export const yardOpen = (st) => st.shipyard && (st.align === 'friendly' || st.favor > 0);
export const discount = (st) => (st.favor > 0 ? B.FAVOR_DISCOUNT : 1);

// What each service costs right now, and how much of it the ship needs. Used by the shop screen too.
export function servicePrices(state, st) {
  const ship = state.ship;
  const a = st.align;
  const k = discount(st);
  const fuel = Math.ceil(fuelMax(ship) - ship.fuel);
  const wear = hullMax(ship) - ship.hull + ship.nodes.reduce((sum, n) => sum + (100 - n.hp) * 0.3, 0);
  const rockets = ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0;
  const chart = st.chart !== null && !state.charts.includes(st.chart) ? 1 : 0;
  return {
    refuel: { need: fuel, price: Math.ceil(fuel * B.FUEL_PRICE[a] * k) },
    repair: { need: Math.ceil(wear), price: Math.ceil(wear * B.REPAIR_PRICE[a] * k) },
    rockets: { need: rockets, price: Math.ceil(rockets * B.ROCKET_PRICE[a] * k) },
    chart: { need: chart, price: Math.ceil(B.CHART_PRICE[a] * k) },
  };
}

const refuse = (state, reason) => state.events.push({ type: 'cannotBuy', reason });
function pay(state, price) {
  if (state.credits < price) {
    refuse(state, 'NOT ENOUGH CREDITS');
    return false;
  }
  state.credits -= price;
  return true;
}

// Each service, once it is known that the ship needs it.
const SERVICES = {
  // With too few credits the tank is filled as far as the money goes.
  refuel(state, st, info) {
    const ship = state.ship;
    const unit = B.FUEL_PRICE[st.align] * discount(st);
    const amount = unit ? Math.min(info.need, Math.floor(state.credits / unit)) : info.need;
    if (amount <= 0) return refuse(state, 'NOT ENOUGH CREDITS');
    state.credits -= Math.ceil(amount * unit);
    ship.fuel = Math.min(fuelMax(ship), ship.fuel + amount);
    state.events.push({ type: 'refuelled', amount });
  },
  repair(state, st, info) {
    const ship = state.ship;
    if (!pay(state, info.price)) return;
    ship.hull = hullMax(ship);
    for (const n of ship.nodes) n.hp = 100;
    state.events.push({ type: 'repairedAll' });
  },
  rockets(state, st, info) {
    if (!pay(state, info.price)) return;
    state.ship.rockets = B.ROCKET_LOAD;
    state.events.push({ type: 'rearmed' });
  },
  chart(state, st, info) {
    if (!pay(state, info.price)) return;
    state.charts.push(st.chart);
    state.events.push({ type: 'chart', sector: st.chart });
  },
};

function shop(state, st, order) {
  if (order.action === 'buy') {
    // Boarding gear is sold at any trading station. Everything else needs an open shipyard.
    if (CATALOG[order.item] && CATALOG[order.item].tab !== 'armory') {
      if (!st.shipyard) return refuse(state, 'NO SHIPYARD HERE');
      if (!yardOpen(st)) return refuse(state, 'THE SHIPYARD IS CLOSED TO STRANGERS');
    }
    buyUpgrade(state, order.item, discount(st));
    return;
  }
  const service = SERVICES[order.action];
  const info = service && servicePrices(state, st)[order.action];
  if (info && info.need > 0) service(state, st, info);
}

// ---------- guns ----------
function stepGuns(state, st, dt) {
  const ship = state.ship;
  for (const g of st.guns) {
    if (g.hp <= 0) continue;
    const p = toWorld(st, g);
    const d = dist(p.x, p.y, ship.x, ship.y);
    g.cool -= dt;
    if (d > B.STATION_RANGE) continue;
    const want = headingTo(ship.x - p.x, ship.y - p.y);
    g.heading = turnToward(g.heading, want, 2.2 * dt);
    if (g.cool > 0 || Math.abs(angleDiff(want, g.heading)) >= 0.12) continue;
    const f = forward(g.heading + randRange(state, -0.03, 0.03));
    state.bolts.push({
      x: p.x + f.x * 8,
      y: p.y + f.y * 8,
      vx: f.x * B.PIRATE_BOLT_SPEED,
      vy: f.y * B.PIRATE_BOLT_SPEED,
      ttl: 1.8,
      owner: 'pirate',
      dmg: B.STATION_GUN_DMG,
    });
    g.cool = B.STATION_GUN_COOLDOWN;
  }
}

// One of the crew's bolts hit a station: hostile guns take damage, a neutral station loses patience.
export function boltHitsStation(state, st, bolt) {
  if (st.align === 'hostile') {
    for (const g of st.guns) {
      const p = toWorld(st, g);
      if (g.hp <= 0 || dist(p.x, p.y, bolt.x, bolt.y) >= 14) continue;
      g.hp -= bolt.dmg;
      if (g.hp <= 0) {
        state.fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, dur: 0.5, size: 16 });
        state.events.push({ type: 'gunDown' });
      }
      return;
    }
  } else if (st.align === 'neutral') {
    st.anger++;
    if (st.anger >= B.STATION_ANGER) turnHostile(state, st);
    else if (st.anger === 2) state.events.push({ type: 'stationWarning', name: st.name });
  }
}

// ---------- distress calls ----------
// Now and then pirates raid a friendly or neutral station, and it calls for help.
function startRaid(state) {
  const open = thingsOf(state, 'station').filter((st) => st.align !== 'hostile' && st.id !== state.ship.docked);
  if (!open.length) {
    state.raidTimer = 60;
    return;
  }
  const st = open[Math.floor(rand(state) * open.length)];
  state.raid = { id: state.nextId++, station: st.id, timer: B.RAID_TIME };
  const n = 2 + (currentSector(state).tier >= 2 ? 1 : 0);
  const a = rand(state) * TAU;
  for (let i = 0; i < n; i++) {
    const raider = makeVessel(state, 'fighter', st.x + Math.sin(a + i * 0.5) * 320, st.y - Math.cos(a + i * 0.5) * 320);
    raider.raid = state.raid.id;
    state.vessels.push(raider);
  }
  // The call tells the crew where the station is, even if they have never seen it.
  if (!state.known.some((k) => k.id === st.id)) state.known.push(mapInfo(st));
  state.events.push({ type: 'distress', name: st.name });
}

function endRaid(state) {
  state.raid = null;
  state.raidTimer = randRange(state, B.RAID_GAP[0], B.RAID_GAP[1]);
}

function stepRaids(state, dt) {
  const ship = state.ship;
  if (!state.raid) {
    state.raidTimer -= dt;
    if (state.raidTimer <= 0) startRaid(state);
    return;
  }
  const raid = state.raid;
  const st = findThing(state, raid.station);
  raid.timer -= dt;
  const raiders = state.vessels.filter((v) => v.raid === raid.id);
  if (!st || raiders.length === 0) {
    // The crew drove the raiders off. A neutral station owes them a favour, a friendly one pays a reward.
    if (st && st.align === 'neutral') {
      st.favor = B.FAVOR_TIME;
      state.events.push({ type: 'distressSaved', name: st.name, favor: true });
    } else if (st) {
      state.credits += B.RAID_REWARD;
      state.events.push({ type: 'distressSaved', name: st.name, reward: B.RAID_REWARD });
    }
    endRaid(state);
  } else if (raid.timer <= 0) {
    // Nobody came. The raiders take what they want and leave. Those close to the frigate stay to fight.
    state.vessels = state.vessels.filter((v) => v.raid !== raid.id || dist(v.x, v.y, ship.x, ship.y) < 700);
    for (const v of state.vessels) if (v.raid === raid.id) v.raid = null;
    state.events.push({ type: 'distressOver', name: st.name });
    endRaid(state);
  }
}

export function stepStations(state, cmds, dt) {
  const docked = findDock(state, state.ship.docked);
  for (const order of cmds.shop || []) {
    if (isTrading(docked)) shop(state, docked, order);
  }
  const stations = thingsOf(state, 'station');
  for (const st of stations) st.favor = Math.max(0, st.favor - dt);
  stepRaids(state, dt);
  if (state.over) return;
  for (const st of stations) if (st.align === 'hostile') stepGuns(state, st, dt);
}
