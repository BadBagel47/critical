// Stations: friendly, neutral or hostile. Friendly and neutral ones trade, hostile ones shoot.
import { B, STATION_GEOM } from './balance.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, rand, randRange, TAU } from './util.js';
import { buyUpgrade, hullMax } from './upgrades.js';
import { findDock } from './dock.js';

export function createStation(s, x, y, align, shipyard, name) {
  return {
    id: s.nextId++, kind: 'station', x, y, heading: 0, align, shipyard, name, difficulty: 3,
    lock: align === 'hostile' ? 'locked' : 'open', breakin: null, interior: null, anger: 0, chart: null,
    guns: align === 'hostile' ? STATION_GEOM.guns.map((g) => ({ ...g, hp: B.STATION_GUN_HP, heading: 0, cool: 1 })) : [],
  };
}

export function turnHostile(state, st) {
  if (st.align === 'hostile') return;
  st.align = 'hostile'; st.lock = 'locked';
  st.guns = STATION_GEOM.guns.map((g) => ({ ...g, hp: B.STATION_GUN_HP, heading: 0, cool: 1 }));
  if (state.ship.docked === st.id) state.ship.docked = null;
  state.events.push({ type: 'stationHostile', name: st.name });
}

export function takeOver(state, st) {
  st.align = 'friendly'; st.shipyard = true; st.lock = 'open'; st.guns = []; st.anger = 0;
  if (st.interior) { st.interior.guards = []; st.interior.turrets = []; }
  state.events.push({ type: 'stationTaken', name: st.name });
}

// What a service costs right now. Used by the shop screen too.
export function servicePrices(state, st) {
  const ship = state.ship, a = st.align;
  const fuelNeed = Math.ceil(B.FUEL_MAX - ship.fuel);
  const wear = hullMax(ship) - ship.hull + ship.nodes.reduce((sum, n) => sum + (100 - n.hp) * 0.3, 0);
  return {
    refuel: { need: fuelNeed, price: Math.ceil(fuelNeed * B.FUEL_PRICE[a]) },
    repair: { need: Math.ceil(wear), price: Math.ceil(wear * B.REPAIR_PRICE[a]) },
    rockets: { need: ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0, price: (ship.mods.rockets ? B.ROCKET_LOAD - ship.rockets : 0) * B.ROCKET_PRICE[a] },
    chart: { need: st.chart !== null && !state.charts.includes(st.chart) ? 1 : 0, price: B.CHART_PRICE[a] },
  };
}

function shop(state, st, order) {
  const ship = state.ship, prices = servicePrices(state, st);
  const pay = (p) => { if (state.credits < p) { state.events.push({ type: 'cannotBuy', reason: 'NOT ENOUGH CREDITS' }); return false; } state.credits -= p; return true; };
  if (order.action === 'refuel' && prices.refuel.need > 0) {
    // With too few credits the tank is filled as far as the money goes.
    const unit = B.FUEL_PRICE[st.align], amount = unit ? Math.min(prices.refuel.need, Math.floor(state.credits / unit)) : prices.refuel.need;
    if (amount <= 0) { state.events.push({ type: 'cannotBuy', reason: 'NOT ENOUGH CREDITS' }); return; }
    state.credits -= Math.ceil(amount * unit); ship.fuel = Math.min(B.FUEL_MAX, ship.fuel + amount);
    state.events.push({ type: 'refuelled', amount });
  } else if (order.action === 'repair' && prices.repair.need > 0) {
    if (!pay(prices.repair.price)) return;
    ship.hull = hullMax(ship); for (const n of ship.nodes) n.hp = 100;
    state.events.push({ type: 'repairedAll' });
  } else if (order.action === 'rockets' && prices.rockets.need > 0) {
    if (!pay(prices.rockets.price)) return;
    ship.rockets = B.ROCKET_LOAD; state.events.push({ type: 'rearmed' });
  } else if (order.action === 'chart' && prices.chart.need > 0) {
    if (!pay(prices.chart.price)) return;
    state.charts.push(st.chart); state.events.push({ type: 'chart', sector: st.chart });
  } else if (order.action === 'buy') {
    if (!st.shipyard) { state.events.push({ type: 'cannotBuy', reason: 'NO SHIPYARD HERE' }); return; }
    buyUpgrade(state, order.item);
  }
}

export function stepStations(state, cmds, dt) {
  const ship = state.ship, docked = findDock(state, ship.docked);
  for (const order of (cmds && cmds.shop) || []) {
    if (docked && docked.kind === 'station' && docked.align !== 'hostile') shop(state, docked, order);
  }
  for (const st of state.stations) {
    if (st.align !== 'hostile' || state.over) continue;
    for (const g of st.guns) {
      if (g.hp <= 0) continue;
      const p = toWorld(st, g), d = dist(p.x, p.y, ship.x, ship.y);
      g.cool -= dt;
      if (d > B.STATION_RANGE) continue;
      const want = headingTo(ship.x - p.x, ship.y - p.y);
      g.heading = turnToward(g.heading, want, 2.2 * dt);
      if (g.cool <= 0 && Math.abs(angleDiff(want, g.heading)) < 0.12) {
        const f = forward(g.heading + randRange(state, -0.03, 0.03));
        state.bolts.push({ x: p.x + f.x * 8, y: p.y + f.y * 8, vx: f.x * B.PIRATE_BOLT_SPEED, vy: f.y * B.PIRATE_BOLT_SPEED, ttl: 1.8, owner: 'pirate', dmg: B.STATION_GUN_DMG });
        g.cool = B.STATION_GUN_COOLDOWN;
      }
    }
  }
}

// A player bolt hit a station: hostile guns take damage, a neutral station loses patience.
export function boltHitsStation(state, st, bolt) {
  if (st.align === 'hostile') {
    for (const g of st.guns) { const p = toWorld(st, g); if (g.hp > 0 && dist(p.x, p.y, bolt.x, bolt.y) < 14) { g.hp -= bolt.dmg; if (g.hp <= 0) { state.fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, dur: 0.5, size: 16 }); state.events.push({ type: 'gunDown' }); } return; } }
  } else if (st.align === 'neutral') {
    st.anger++;
    if (st.anger >= B.STATION_ANGER) turnHostile(state, st);
    else if (st.anger === 2) state.events.push({ type: 'stationWarning', name: st.name });
  }
}
