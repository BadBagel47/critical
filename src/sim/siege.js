// Attacks on the stations the crew owns (docs/station-boarding.md, section 14). One attack at a time in the
// whole world, in three steps:
//   siege     the attackers fight the shield and the guns. Where the crew is, it is a real fight with ships.
//             Elsewhere it is worked out from the same strengths.
//   docking   the outer defence is down and a ship with boarders is on its way in (only where the crew is).
//   boarding  the boarders are inside, on their way to the mainframe. The security bought for the station wears
//             them down, and if it beats them the attack is over.
//   hack      the boarders are at the mainframe. When they have it, the station falls to them.
// The boarding and the hack are always worked out, also where the crew is: going in to fight the boarders is
// the next round of building (F-122). Shooting the ship that brought them changes nothing once they are in.
// The station warns with a risk of LOW, MEDIUM or HIGH, worked out from where the attack stands.
//   state.siege       { id, station, sector, side, stage, t, ships, here, boarders, start, luck, level }
//                     `ships` are the attacking ships as { kind, hp } while the crew is not there to see them.
//   state.siegeTimer  seconds until the next attack may come.
import { B } from './balance.js';
import { SHIPS } from './kinds.js';
import { CREW, PIRATE, FACTIONS, isFaction, moodOf, standingOf, nameOfSide } from './sides.js';
import { allStations, fall, gunDmg, defenseOf } from './stations.js';
import { makeVessel, fleeFrom } from './vessels.js';
import { portsOf, mapInfo } from './things.js';
import { clamp, dist, rand, randRange, TAU } from './util.js';

export const RISK_NAMES = ['LOW', 'MEDIUM', 'HIGH'];
const findStation = (state, id) => allStations(state).find((x) => x.st.id === id) || null;
const tierOf = (state, sector) => state.sectors[sector].tier;
const shipHp = (state, kind, sector) => {
  const c = SHIPS[kind];
  return Math.round(c.hp * (c.tierHp ? 1 + B.TIER_HP * tierOf(state, sector) : 1));
};

// ---------- who attacks, where and how often (F-123) ----------
// A station can be attacked once the crew has held it for a while. Their own yard in the first sector never is.
export const canBeAttacked = (state, st) =>
  st.side === CREW && !st.home && st.takenAt !== null && state.time - st.takenAt >= B.SIEGE_CALM;

const stationsOf = (state, side, sectors) =>
  allStations(state).filter((x) => x.st.side === side && sectors.includes(x.sector)).length;

// Every attack that could come now, each with how likely it is compared with the others. Pirates come more often
// to dangerous sectors with pirate stations. A faction the crew has made an enemy of comes more often the worse
// it thinks of them and the more stations it has near by, and above all to a station that was taken from it.
export function attackChoices(state) {
  const out = [];
  for (const { st, sector } of allStations(state)) {
    if (!canBeAttacked(state, st)) continue;
    const near = [sector, ...state.sectors[sector].links];
    const pirates = 1 + tierOf(state, sector) + stationsOf(state, PIRATE, [sector]);
    out.push({ st, sector, side: PIRATE, weight: pirates });
    for (const f of Object.keys(FACTIONS)) {
      if (moodOf(state, f) !== 'hostile') continue;
      const hate = Math.max(0, -standingOf(state, f) - 80) / 10;
      const weight = 2 + 2 * stationsOf(state, f, near) + (st.from === f ? 4 : 0) + hate;
      out.push({ st, sector, side: f, weight });
    }
  }
  return out;
}

// What comes: pirates in a loose group of four to six with a gunboat that carries the boarders, or a faction in
// an ordered force with a gunboat to fight and another to carry its boarders.
function fleetFor(state, side) {
  if (isFaction(side)) return ['gunboat', 'gunboat', 'fighter', 'fighter', 'fighter', 'fighter', 'fighter'];
  const fighters = 3 + Math.floor(rand(state) * 3);
  return ['gunboat', ...Array(fighters).fill('fighter')];
}

export function startSiege(state, st, sector, side) {
  const tier = tierOf(state, sector);
  const boarders = (isFaction(side) ? B.SIEGE_BOARDERS.faction : B.SIEGE_BOARDERS.pirate) + tier;
  state.siege = {
    id: state.nextId++,
    station: st.id,
    sector,
    side,
    stage: 'siege',
    t: 0,
    ships: fleetFor(state, side).map((kind) => ({ kind, hp: shipHp(state, kind, sector) })),
    here: false,
    boarders,
    start: boarders,
    // How well it goes for the attackers where nobody sees it, a little better or worse than their strength.
    luck: randRange(state, 0.8, 1.2),
    level: -1,
  };
  if (sector === state.sector) {
    comeIn(state, st);
    if (!state.known.some((k) => k.id === st.id)) state.known.push(mapInfo(st));
  }
  warn(state, st, true);
}

// ---------- the attack where the crew is ----------
const shipsHere = (state, s) => state.vessels.filter((v) => v.siege === s.id && v.hp > 0 && !v.gone);

// The attackers jump in round the station. Coming in after the outer defence fell, their boarding ship is
// already docked.
function comeIn(state, st) {
  const s = state.siege;
  const a = rand(state) * TAU;
  s.ships.forEach((ship, i) => {
    const angle = a + (i - s.ships.length / 2) * 0.35;
    const v = makeVessel(state, ship.kind, st.x + Math.sin(angle) * 650, st.y - Math.cos(angle) * 650, s.side);
    v.hp = ship.hp;
    v.siege = s.id;
    state.vessels.push(v);
    state.fx.push({ type: 'warp', x: v.x, y: v.y, t: 0, dur: 0.7 });
  });
  s.ships = [];
  s.here = true;
  if (s.stage === 'boarding' || s.stage === 'hack') {
    const v = shipsHere(state, s).find((x) => x.kind === 'gunboat') || shipsHere(state, s)[0];
    if (v) {
      const at = dockSpot(state, st);
      v.x = at.x;
      v.y = at.y;
      sendIn(v, at);
    }
  }
}

// Where the boarding ship docks: at the arm furthest from the frigate.
function dockSpot(state, st) {
  const ship = state.ship;
  const ports = portsOf(st);
  let best = ports[0];
  for (const p of ports) if (dist(p.x, p.y, ship.x, ship.y) > dist(best.x, best.y, ship.x, ship.y)) best = p;
  const away = Math.hypot(best.x - st.x, best.y - st.y) || 1;
  return { x: best.x + ((best.x - st.x) / away) * 22, y: best.y + ((best.y - st.y) / away) * 22 };
}
function sendIn(v, at) {
  v.boarding = true;
  v.legs = [{ x: at.x, y: at.y, hold: 1e9 }];
  v.hold = 0;
}

// The ship goes off to another sector. What is left of the attackers here goes on with the attack unseen.
export function leaveSiege(state) {
  const s = state.siege;
  if (!s || !s.here) return;
  s.ships = shipsHere(state, s).map((v) => ({ kind: v.kind, hp: v.hp }));
  s.here = false;
  if (s.stage === 'docking') next(state, s, 'boarding');
}

// ---------- worked out ----------
const outerDown = (st) => st.shield <= 0 && (st.guns.every((g) => g.hp <= 0) || st.hp <= B.STATION_HP / 2);
const liveGuns = (st) => st.guns.filter((g) => g.hp > 0 && !g.off).length;
const attackDps = (ships) => ships.reduce((sum, x) => sum + (B.SIEGE_DPS[x.kind] || 1), 0);
const stationDps = (st) => (liveGuns(st) * gunDmg(st) * B.SIEGE_GUN_HITS) / B.STATION_GUN_COOLDOWN;
// What is left of the outer defence: the shield, the guns, and the hull down to half.
const outerLeft = (st) =>
  st.shield + st.guns.reduce((sum, g) => sum + Math.max(0, g.hp), 0) + Math.max(0, st.hp - B.STATION_HP / 2);
const innerOf = (st) => 1 + defenseOf(st).inner;

// Damage where nobody sees it lands like shots would: on the shield, then on a gun and the hull by turns.
function hitStation(st, dmg) {
  const absorbed = Math.min(st.shield, dmg);
  st.shield -= absorbed;
  let rest = dmg - absorbed;
  st.lastHit = -99;
  const gun = st.guns.find((g) => g.hp > 0);
  if (gun && rest > 0) {
    const onGun = Math.min(gun.hp, rest / 2);
    gun.hp -= onGun;
    rest -= onGun;
  }
  st.hp = Math.max(0, st.hp - rest);
}

function stepAway(state, s, st, dt) {
  hitStation(st, attackDps(s.ships) * s.luck * dt);
  let shots = stationDps(st) * dt;
  while (shots > 0 && s.ships.length) {
    const target = s.ships[0];
    const hit = Math.min(target.hp, shots);
    target.hp -= hit;
    shots -= hit;
    if (target.hp <= 0) s.ships.shift();
  }
}

// ---------- the warning ----------
// How likely the station thinks it is to fall, and about how long until it is decided.
export function riskOf(state, s, st) {
  const inner = innerOf(st) * B.SIEGE_INNER;
  const ships = s.here ? shipsHere(state, s).map((v) => ({ kind: v.kind, hp: v.hp })) : s.ships;
  let tOut = 0,
    pOut = 1;
  if (s.stage === 'siege') {
    tOut = outerLeft(st) / Math.max(0.01, attackDps(ships));
    const kill = ships.reduce((sum, x) => sum + x.hp, 0) / Math.max(0.01, stationDps(st));
    pOut = clamp(kill / (kill + tOut), 0, 1);
  }
  const total = B.SIEGE_BOARD_TIME + B.SIEGE_HACK_TIME;
  const done = s.stage === 'hack' ? B.SIEGE_BOARD_TIME + s.t : s.stage === 'boarding' ? s.t : 0;
  const tIn = total - done;
  const left = s.boarders - inner * tIn;
  const pIn = clamp(0.5 + left / (2 * s.start), 0, 1);
  return { risk: pOut * pIn, time: tOut + tIn };
}
const levelOf = (risk) => (risk >= B.SIEGE_RISK[1] ? 2 : risk >= B.SIEGE_RISK[0] ? 1 : 0);

// The station reports the attack, and again when the risk changes or the boarders are in.
function warn(state, st, always) {
  const s = state.siege;
  const { risk, time } = riskOf(state, s, st);
  const level = levelOf(risk);
  if (!always && level === s.level) return;
  s.level = level;
  state.events.push({
    type: 'siege',
    name: st.name,
    side: s.side,
    by: nameOfSide(state, s.side),
    level,
    minutes: Math.max(1, Math.round(time / 60)),
    stage: s.stage,
  });
}

function next(state, s, stage) {
  s.stage = stage;
  s.t = 0;
  const found = findStation(state, s.station);
  if (found && (stage === 'boarding' || stage === 'hack')) warn(state, found.st, true);
}

// The attack is over. Those of the attackers that are left leave.
function end(state, won, st) {
  const s = state.siege;
  for (const v of state.vessels) {
    if (v.siege !== s.id) continue;
    v.siege = null;
    v.boarding = false;
    if (!won) fleeFrom(state, v, st || state.ship);
  }
  state.siege = null;
  state.siegeTimer = randRange(state, B.SIEGE_GAP[0], B.SIEGE_GAP[1]);
  if (!won && st) state.events.push({ type: 'siegeBeaten', name: st.name });
}

// ---------- each step ----------
function stepAttack(state, s, st, sector, dt) {
  const here = sector === state.sector;
  if (here && !s.here) comeIn(state, st);
  s.t += dt;
  if (s.stage === 'siege' || s.stage === 'docking') {
    if (!here) stepAway(state, s, st, dt);
    const ships = here ? shipsHere(state, s) : s.ships;
    if (!ships.length) return end(state, false, st);
    if (s.stage === 'siege' && outerDown(st)) {
      if (!here) return next(state, s, 'boarding');
      // The gunboat goes in with the boarders, or another ship if it is gone.
      const v = ships.find((x) => x.kind === 'gunboat') || ships[0];
      sendIn(v, dockSpot(state, st));
      next(state, s, 'docking');
    }
    if (s.stage === 'docking') {
      let v = ships.find((x) => x.boarding);
      if (!v) {
        v = ships.find((x) => x.kind === 'gunboat') || ships[0];
        sendIn(v, dockSpot(state, st));
      }
      if (dist(v.x, v.y, v.legs[0].x, v.legs[0].y) < 10) next(state, s, 'boarding');
    }
    warn(state, st, false);
    return;
  }
  // Inside: the security wears the boarders down while they make for the mainframe and take it.
  s.boarders -= innerOf(st) * B.SIEGE_INNER * dt;
  if (s.boarders <= 0) return end(state, false, st);
  if (s.stage === 'boarding' && s.t >= B.SIEGE_BOARD_TIME) next(state, s, 'hack');
  else if (s.stage === 'hack' && s.t >= B.SIEGE_HACK_TIME) {
    // The mainframe is theirs, and with it the station.
    const side = s.side;
    end(state, true, st);
    fall(state, st, side);
    return;
  }
  warn(state, st, false);
}

export function stepSiege(state, dt) {
  const s = state.siege;
  if (!s) {
    // A test game has no attacks unless they are asked for.
    if (state.test || state.over) return;
    const choices = attackChoices(state);
    if (!choices.length) return;
    state.siegeTimer -= dt;
    if (state.siegeTimer > 0) return;
    let pick = rand(state) * choices.reduce((sum, c) => sum + c.weight, 0);
    const c = choices.find((x) => (pick -= x.weight) < 0) || choices[choices.length - 1];
    startSiege(state, c.st, c.sector, c.side);
    return;
  }
  const found = findStation(state, s.station);
  // The station is no longer the crew's, or no longer there: the attack has nothing left to take.
  if (!found || found.st.side !== CREW) return end(state, true, found && found.st);
  stepAttack(state, s, found.st, found.sector, dt);
}
