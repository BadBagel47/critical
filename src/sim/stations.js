// Stations. Each belongs to a side: the crew, the pirates, a faction, or itself. How it treats the crew
// follows from that: friendly and neutral ones trade, hostile ones shoot. All of them defend themselves.
import { B } from './balance.js';
import { THINGS } from './kinds.js';
import { CREW, PIRATE, ownSide, moodOf, enemies, changeStanding, provoke, isAngry } from './sides.js';
import { thingsOf, findThing, findDock, mapInfo } from './things.js';
import { makeVessel } from './vessels.js';
import { currentSector } from './sectors.js';
import { teleportAllHome } from './boarding.js';
import { buyUpgrade, hullMax, fuelMax, CATALOG } from './upgrades.js';
import { payBounty } from './bounty.js';
import { forward, headingTo, turnToward, angleDiff, toWorld, dist, rand, randRange, TAU } from './util.js';

// `off` is a gun of the crew's own station that has been mended and waits to be switched on at the mainframe.
const mountGuns = (st) => THINGS.station.guns.map((g) => ({ ...g, hp: gunHpMax(st), heading: 0, cool: 1, off: false }));
// What has been bought for a station's defence, level by level. It stays with the station whoever holds it.
export const defenseOf = (st) => st.defense || { shield: 0, guns: 0, inner: 0 };
export const stationShieldMax = (st) => B.STATION_SHIELD * (1 + B.DEFENSE_SHIELD * defenseOf(st).shield);
export const gunHpMax = (st) => B.STATION_GUN_HP * (1 + B.DEFENSE_GUN * defenseOf(st).guns);
export const gunDmg = (st) =>
  (st.side === PIRATE ? B.PIRATE_STATION_GUN_DMG : B.STATION_GUN_DMG) * (1 + B.DEFENSE_GUN * defenseOf(st).guns);

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
    heading: 0,
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
    defense: { shield: 0, guns: 0, inner: 0 },
    // On a station of the crew's: the part being mended from the mainframe, 'hull' or a gun by number.
    fix: null,
    // When the crew took it, and whose it was before.
    takenAt: null,
    from: null,
    guns: [],
  };
  st.guns = mountGuns(st);
  if (st.side !== CREW && st.side !== PIRATE) s.standing[st.side] = s.standing[st.side] || 0;
  st.align = alignFor(moodOf(s, st.side));
  if (st.align === 'hostile') st.lock = 'locked';
  return st;
}

// ---------- how a station treats the crew ----------
function goHostile(state, st) {
  // Anyone walking around inside is sent back to the ship, and the trading floor is gone.
  teleportAllHome(state, st.id);
  st.interior = null;
  st.breakin = null;
  st.align = 'hostile';
  st.lock = 'locked';
  if (state.ship.docked === st.id) state.ship.docked = null;
  state.events.push({ type: 'stationHostile', name: st.name });
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
// It is left in peace for a while, see siege.js. What was bought for its defence before is still there.
export function takeOver(state, st) {
  st.from = st.side;
  st.side = CREW;
  st.takenAt = state.time;
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
    it.mood = null;
    it.dark = false;
    it.desks = [];
  }
  state.events.push({ type: 'stationTaken', name: st.name });
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
  st.defense = { shield: Math.floor(d.shield / 2), guns: Math.floor(d.guns / 2), inner: Math.floor(d.inner / 2) };
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
    refuel: { need: fuel, price: Math.ceil(fuel * B.FUEL_PRICE[a] * k) },
    repair: { need: Math.ceil(wear), price: Math.ceil(wear * B.REPAIR_PRICE[a] * k) },
    rockets: { need: rockets, price: Math.ceil(rockets * B.ROCKET_PRICE[a] * k) },
    chart: { need: chart, price: Math.ceil(B.CHART_PRICE[a] * k) },
    // A bounty is paid in full wherever it is paid, and a station of the crew's own takes it too.
    bounty: { need: state.bounty ? 1 : 0, price: state.bounty ? state.bounty.amount : 0 },
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
  bounty(state, st, info) {
    if (!pay(state, info.price)) return;
    payBounty(state);
  },
  // With too few credits the tank is filled as far as the money goes.
  refuel(state, st, info) {
    const ship = state.ship;
    const unit = B.FUEL_PRICE[st.align] * priceFactor(state, st);
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
    // Boarding gear is sold at any trading station. Everything else needs a shipyard.
    const needsYard = CATALOG[order.item] && CATALOG[order.item].tab !== 'armory';
    if (needsYard && !yardOpen(st)) return refuse(state, 'NO SHIPYARD HERE');
    buyUpgrade(state, order.item, priceFactor(state, st));
    return;
  }
  const service = SERVICES[order.action];
  const info = service && servicePrices(state, st)[order.action];
  if (info && info.need > 0) service(state, st, info);
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
    // Shooting at someone who is not an enemy costs their good will, and they do not just take it.
    changeStanding(state, st.side, -B.STANDING_LOSS.stationHit);
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
      dmg: gunDmg(st),
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
// that is whole again waits to be switched on. Where the crew is not, the shield comes back too.
function stepOwned(state, dt) {
  for (const { st, sector } of allStations(state)) {
    if (st.side !== CREW) continue;
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

// ---------- distress calls ----------
// Now and then pirates raid a station that trades, and it calls for help. The crew's own yard is left alone,
// so that there is always somewhere to refuel and repair.
export function startRaid(state) {
  const ship = state.ship;
  // The crew's own stations are attacked in a way of their own, see siege.js.
  const open = thingsOf(state, 'station').filter(
    (st) => st.align !== 'hostile' && !st.home && st.side !== CREW && st.id !== ship.docked,
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
    state.credits += B.RAID_REWARD;
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
  for (const st of stations) stepGuns(state, st, dt);
}
