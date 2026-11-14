// Stations: friendly, neutral or hostile. Friendly and neutral ones trade, hostile ones shoot.
import { B, STATION_GEOM } from './balance.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, rand, randRange, TAU } from './util.js';
import { buyUpgrade, hullMax, fuelMax, CATALOG } from './upgrades.js';
import { findDock } from './dock.js';
import { makePirate, currentSector } from './sectors.js';
import { teleportAllHome } from './boarding.js';

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
    guns:
      align === 'hostile' ? STATION_GEOM.guns.map((g) => ({ ...g, hp: B.STATION_GUN_HP, heading: 0, cool: 1 })) : [],
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
  st.guns = STATION_GEOM.guns.map((g) => ({ ...g, hp: B.STATION_GUN_HP, heading: 0, cool: 1 }));
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

// A neutral shipyard only works for crews it owes a favour. Friendly yards are always open.
export const yardOpen = (st) => st.shipyard && (st.align === 'friendly' || st.favor > 0);
export const discount = (st) => (st.favor > 0 ? B.FAVOR_DISCOUNT : 1);

// What a service costs right now. Used by the shop screen too.
export function servicePrices(state, st) {
  const ship = state.ship,
    a = st.align,
    k = discount(st);
  const fuelNeed = Math.ceil(fuelMax(ship) - ship.fuel);
  const wear = hullMax(ship) - ship.hull + ship.nodes.reduce((sum, n) => sum + (100 - n.hp) * 0.3, 0);
  return {
    refuel: { need: fuelNeed, price: Math.ceil(fuelNeed * B.FUEL_PRICE[a] * k) },
    repair: { need: Math.ceil(wear), price: Math.ceil(wear * B.REPAIR_PRICE[a] * k) },
    rockets: {
      need: ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0,
      price: Math.ceil((ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0) * B.ROCKET_PRICE[a] * k),
    },
    chart: {
      need: st.chart !== null && !state.charts.includes(st.chart) ? 1 : 0,
      price: Math.ceil(B.CHART_PRICE[a] * k),
    },
  };
}

function shop(state, st, order) {
  const ship = state.ship,
    prices = servicePrices(state, st);
  const pay = (p) => {
    if (state.credits < p) {
      state.events.push({ type: 'cannotBuy', reason: 'NOT ENOUGH CREDITS' });
      return false;
    }
    state.credits -= p;
    return true;
  };
  if (order.action === 'refuel' && prices.refuel.need > 0) {
    // With too few credits the tank is filled as far as the money goes.
    const unit = B.FUEL_PRICE[st.align] * discount(st),
      amount = unit ? Math.min(prices.refuel.need, Math.floor(state.credits / unit)) : prices.refuel.need;
    if (amount <= 0) {
      state.events.push({ type: 'cannotBuy', reason: 'NOT ENOUGH CREDITS' });
      return;
    }
    state.credits -= Math.ceil(amount * unit);
    ship.fuel = Math.min(fuelMax(ship), ship.fuel + amount);
    state.events.push({ type: 'refuelled', amount });
  } else if (order.action === 'repair' && prices.repair.need > 0) {
    if (!pay(prices.repair.price)) return;
    ship.hull = hullMax(ship);
    for (const n of ship.nodes) n.hp = 100;
    state.events.push({ type: 'repairedAll' });
  } else if (order.action === 'rockets' && prices.rockets.need > 0) {
    if (!pay(prices.rockets.price)) return;
    ship.rockets = B.ROCKET_LOAD;
    state.events.push({ type: 'rearmed' });
  } else if (order.action === 'chart' && prices.chart.need > 0) {
    if (!pay(prices.chart.price)) return;
    state.charts.push(st.chart);
    state.events.push({ type: 'chart', sector: st.chart });
  } else if (order.action === 'buy') {
    // Boarding gear is sold at any trading station. Everything else needs an open shipyard.
    if (CATALOG[order.item] && CATALOG[order.item].tab !== 'armory') {
      if (!st.shipyard) {
        state.events.push({ type: 'cannotBuy', reason: 'NO SHIPYARD HERE' });
        return;
      }
      if (!yardOpen(st)) {
        state.events.push({ type: 'cannotBuy', reason: 'THE SHIPYARD IS CLOSED TO STRANGERS' });
        return;
      }
    }
    buyUpgrade(state, order.item, discount(st));
  }
}

export function stepStations(state, cmds, dt) {
  const ship = state.ship,
    docked = findDock(state, ship.docked);
  for (const order of (cmds && cmds.shop) || []) {
    if (docked && docked.kind === 'station' && docked.align !== 'hostile') shop(state, docked, order);
  }
  for (const st of state.stations) st.favor = Math.max(0, st.favor - dt);
  stepRaids(state, dt);
  for (const st of state.stations) {
    if (st.align !== 'hostile' || state.over) continue;
    for (const g of st.guns) {
      if (g.hp <= 0) continue;
      const p = toWorld(st, g),
        d = dist(p.x, p.y, ship.x, ship.y);
      g.cool -= dt;
      if (d > B.STATION_RANGE) continue;
      const want = headingTo(ship.x - p.x, ship.y - p.y);
      g.heading = turnToward(g.heading, want, 2.2 * dt);
      if (g.cool <= 0 && Math.abs(angleDiff(want, g.heading)) < 0.12) {
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
  }
}

// A player bolt hit a station: hostile guns take damage, a neutral station loses patience.
export function boltHitsStation(state, st, bolt) {
  if (st.align === 'hostile') {
    for (const g of st.guns) {
      const p = toWorld(st, g);
      if (g.hp > 0 && dist(p.x, p.y, bolt.x, bolt.y) < 14) {
        g.hp -= bolt.dmg;
        if (g.hp <= 0) {
          state.fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, dur: 0.5, size: 16 });
          state.events.push({ type: 'gunDown' });
        }
        return;
      }
    }
  } else if (st.align === 'neutral') {
    st.anger++;
    if (st.anger >= B.STATION_ANGER) turnHostile(state, st);
    else if (st.anger === 2) state.events.push({ type: 'stationWarning', name: st.name });
  }
}

// Distress calls: now and then pirates raid a friendly or neutral station, and it calls for help.
function stepRaids(state, dt) {
  const ship = state.ship;
  if (!state.raid) {
    state.raidTimer -= dt;
    if (state.raidTimer > 0) return;
    const open = state.stations.filter((st) => st.align !== 'hostile' && st.id !== ship.docked);
    if (!open.length) {
      state.raidTimer = 60;
      return;
    }
    const st = open[Math.floor(rand(state) * open.length)];
    state.raid = { id: state.nextId++, station: st.id, timer: B.RAID_TIME };
    const n = 2 + (currentSector(state).tier >= 2 ? 1 : 0),
      a = rand(state) * TAU;
    for (let i = 0; i < n; i++) {
      const p = makePirate(state, 'fighter', st.x + Math.sin(a + i * 0.5) * 320, st.y - Math.cos(a + i * 0.5) * 320);
      p.raid = state.raid.id;
      state.pirates.push(p);
    }
    // The call tells the crew where the station is, even if they have never seen it.
    if (!state.known.some((k) => k.id === st.id))
      state.known.push({
        id: st.id,
        kind: 'station',
        x: st.x,
        y: st.y,
        align: st.align,
        shipyard: st.shipyard,
        name: st.name,
      });
    state.events.push({ type: 'distress', name: st.name });
    return;
  }
  const raid = state.raid,
    st = state.stations.find((x) => x.id === raid.station);
  raid.timer -= dt;
  const raiders = state.pirates.filter((p) => p.raid === raid.id);
  if (!st || raiders.length === 0) {
    // The crew drove the raiders off. A neutral station owes them a favour, a friendly one pays a reward.
    if (st && st.align === 'neutral') {
      st.favor = B.FAVOR_TIME;
      state.events.push({ type: 'distressSaved', name: st.name, favor: true });
    } else if (st) {
      state.credits += B.RAID_REWARD;
      state.events.push({ type: 'distressSaved', name: st.name, reward: B.RAID_REWARD });
    }
    state.raid = null;
    state.raidTimer = randRange(state, B.RAID_GAP[0], B.RAID_GAP[1]);
  } else if (raid.timer <= 0) {
    // Nobody came. The raiders take what they want and leave.
    state.pirates = state.pirates.filter((p) => p.raid !== raid.id || dist(p.x, p.y, ship.x, ship.y) < 700);
    for (const p of state.pirates) if (p.raid === raid.id) p.raid = null;
    state.events.push({ type: 'distressOver', name: st.name });
    state.raid = null;
    state.raidTimer = randRange(state, B.RAID_GAP[0], B.RAID_GAP[1]);
  }
}
