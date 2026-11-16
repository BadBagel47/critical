// The mainframe: a panel on every station, as far in as it goes (docs/station-boarding.md, section 8).
// What it offers depends on whose the station is:
//   enemy   a station that counts the crew as an enemy is hacked in three levels. Each level takes time and
//           fills a trace meter, and a full meter sounds the alarm. Level 1 reads the floor plan, level 2 (only the
//           Engineer) switches the cameras and turrets off for a while and opens the vault, level 3 takes the
//           station over.
//   trade   a station that trades with the crew can be taken from the inside, at a high price (section 9): the
//           alarm sounds at once, guards come, the station calls for help and its side thinks much less of the
//           crew. Taken, a faction becomes an enemy and a free station puts a bounty on the crew.
//   own     the crew's own station is mended from here, part by part, its guns are switched back on when
//           mended, and its defence is bought here.
// The panel itself is drawn by render/mainframe.js. Orders from it come in as cmds.mainframe.
import { B } from './balance.js';
import { CREW, isFaction, changeStanding } from './sides.js';
import { newGuard, alertGuard, guardKind } from './guards.js';
import { takeOver, stationShieldMax, gunHpMax, defenseOf } from './stations.js';
import { foundOut, gearUp, openVault, spotIn, setMood } from './boarding.js';
import { callHelp, putBounty } from './bounty.js';
import { currentSector } from './sectors.js';
import { findDock } from './things.js';
import { playerById } from './players.js';
import { dist } from './util.js';

// How close a boarder has to stand to work the mainframe.
export const MAINFRAME_REACH = 18;
export const LEVEL_NAMES = ['READ THE PLAN', 'CONTROL', 'TAKE OVER'];
// The parts of its defence that the crew can buy for a station of theirs.
export const DEFENSES = ['shield', 'guns', 'inner'];
export const DEFENSE_NAMES = { shield: 'SHIELD', guns: 'GUNS', inner: 'SECURITY INSIDE' };

// How the station stands to the crew, for the panel: 'own', 'trade' or 'enemy'.
export function relationOf(st) {
  if (st.side === CREW) return 'own';
  return st.interior && st.interior.trade ? 'trade' : 'enemy';
}

// The station a player is inside, with its interior and the player's boarder, or null.
function placeOf(state, playerId) {
  const player = playerById(state, playerId);
  const st = player && findDock(state, player.inside);
  if (!st || st.kind !== 'station' || !st.interior) return null;
  const av = st.interior.avatars.find((a) => a.player === playerId);
  return av ? { st, it: st.interior, av } : null;
}
export const atMainframe = (it, av) =>
  !!it.mainframe && dist(av.x, av.y, it.mainframe.x, it.mainframe.y) < MAINFRAME_REACH;

// How long a level takes, before the Engineer's bonus.
export const hackTime = (it, level) => (level === 2 && it.seize ? B.SEIZE_TIME : B.HACK_TIME[level]);

// Why a level cannot be started right now, or null when it can.
export function hackBlocked(it, av, level) {
  if (it.hacked[level]) return 'DONE';
  // A base is not given up while it has power: the switchgear in the basement comes first (F-209).
  if (level === 2 && it.breaker && !it.breaker.out) return 'CUT THE POWER IN THE BASEMENT FIRST';
  if (level === 1 && av.role !== 'engineer') return 'ONLY THE ENGINEER';
  if (it.hack && it.hack.level === level) return 'WORKING';
  return null;
}

// What mending a part of the crew's own station would do: the hull, or one of its guns by number.
export function fixNeed(st, part) {
  if (part === 'hull') return B.STATION_HP - st.hp;
  const gun = st.guns[part];
  return gun ? gunHpMax(st) - gun.hp : 0;
}

// The price of the next level of a part of the defence, or null when it is at the top.
export function defensePrice(st, what) {
  const lv = defenseOf(st)[what];
  return lv >= B.DEFENSE_MAX ? null : B.DEFENSE_PRICE[lv];
}

// ---------- orders from the panel ----------
function startHack(state, it, av, level) {
  const why = hackBlocked(it, av, level);
  if (why) {
    state.events.push({ type: 'cannotHack', player: av.player, reason: why });
    return;
  }
  it.hack = { level, by: av.player };
  state.events.push({ type: 'hackStarted', level });
}

// A station that traded with the crew turns on those inside: the alarm sounds, the trading stops, the boarders
// get their gear out and more guards come, from the rooms furthest from where it began. Nobody is thrown out
// (docs/station-boarding.md, section 1). `caught` is when the crew brought it on themselves, by being seen in the
// staff rooms or by starting to take the station: then its side thinks much less of them, its guns turn on the
// ship and it calls for help.
export function turnOnCrew(state, st, at, caught) {
  const it = st.interior;
  if (!it.trade) return;
  const from = at || it.mainframe;
  it.trade = false;
  it.seize = true;
  it.desks = [];
  it.civilians = [];
  setMood(it, 'alarm');
  for (const a of it.avatars) gearUp(state, a);
  const tier = currentSector(state).tier;
  const n = B.SEIZE_GUARDS + tier + defenseOf(st).inner;
  const away = (r) => dist(r.mid.x, r.mid.y, from.x, from.y);
  const rooms = [...it.rooms].sort((a, b) => away(b) - away(a));
  const taken = [it.mainframe, ...it.avatars.map((a) => ({ x: a.x, y: a.y }))];
  for (let i = 0; i < n; i++) {
    const p = spotIn(state, it, rooms[i % rooms.length], taken);
    it.guards.push(newGuard(state, p, 0, guardKind(state, 'other', tier + 2)));
  }
  for (const g of it.guards) alertGuard(g, from);
  state.events.push({ type: 'redAlert', name: st.name });
  if (!caught) return;
  changeStanding(state, st.side, -B.SEIZE_STANDING);
  holdGrudge(state, st);
  callHelp(state, st);
}

// Taking a station that trades with the crew, from its mainframe. It turns on them at once.
function seize(state, st, it, av) {
  if (it.breaker && !it.breaker.out) {
    state.events.push({ type: 'cannotHack', player: av.player, reason: 'CUT THE POWER IN THE BASEMENT FIRST' });
    return;
  }
  turnOnCrew(state, st, it.mainframe, true);
  it.hack = { level: 2, by: av.player };
}

// A station that is being taken from the inside fights back outside too: its guns turn on the ship.
function holdGrudge(state, st) {
  if (st.side === CREW) return;
  const now = state.strife[st.side] || (state.strife[st.side] = { warned: 0, angry: 0 });
  now.angry = Math.max(now.angry, B.GRUDGE_TIME);
}

function fix(state, st, part) {
  if (fixNeed(st, part) <= 0) return;
  st.fix = part;
  state.events.push({ type: 'fixStarted', part });
}

function switchOn(state, st, gun) {
  const g = st.guns[gun];
  if (!g || !g.off || g.hp < gunHpMax(st)) return;
  g.off = false;
  state.events.push({ type: 'gunOn' });
}

function upgrade(state, st, what) {
  const price = defensePrice(st, what);
  if (price === null) return;
  // The station pays for its own defence, from the income it has saved up (R-1115).
  if ((st.purse || 0) < price) {
    state.events.push({ type: 'cannotBuy', reason: 'THE STATION HAS TOO LITTLE SAVED' });
    return;
  }
  st.purse -= price;
  st.defense[what]++;
  if (what === 'shield') st.shield = stationShieldMax(st);
  state.events.push({ type: 'defenseBought', what, level: st.defense[what] });
}

// One order from a player at the panel. They must stand at the mainframe.
function order(state, o) {
  const at = placeOf(state, o.player);
  if (!at || !atMainframe(at.it, at.av)) return;
  const { st, it, av } = at;
  const rel = relationOf(st);
  if (rel === 'enemy' && o.action === 'hack') startHack(state, it, av, o.level);
  else if (rel === 'trade' && o.action === 'seize') seize(state, st, it, av);
  else if (o.action === 'stop' && it.hack) it.hack = null;
  else if (rel === 'own' && o.action === 'fix') fix(state, st, o.part);
  else if (rel === 'own' && o.action === 'switchOn') switchOn(state, st, o.gun);
  else if (rel === 'own' && o.action === 'upgrade') upgrade(state, st, o.what);
}

export function stepMainframe(state, cmds) {
  for (const o of cmds.mainframe || []) order(state, o);
}

// ---------- the hack ----------
function done(state, st, it, level) {
  it.hacked[level] = true;
  it.hack = null;
  it.hacking = false;
  state.events.push({ type: 'hackDone', level });
  if (level === 0) it.plan = true;
  if (level === 1) {
    it.blackout = B.BLACKOUT;
    openVault(it);
  }
  if (level !== 2) return;
  // The base of the sanctuary cannot be taken (docs/proposal-bases.md, section 5).
  if (st.sanctuary) {
    state.events.push({ type: 'cannotBuy', reason: 'THE SANCTUARY CANNOT BE TAKEN' });
    return;
  }
  const side = st.side;
  const seized = it.seize;
  takeOver(state, st);
  if (!seized) return;
  // Word gets about. A faction does not forgive the loss of a station, and a free station puts a price on the crew.
  for (const other of Object.keys(state.standing)) if (other !== side) changeStanding(state, other, -B.SEIZE_RUMOUR);
  if (isFaction(side)) changeStanding(state, side, -200);
  else putBounty(state, st);
}

// The level being worked on comes along while whoever started it stands at the mainframe. Walking away pauses it.
export function stepHack(state, st, it, dt) {
  it.blackout = Math.max(0, it.blackout - dt);
  if (it.seize && it.mood === 'alarm') holdGrudge(state, st);
  if (!it.hack) return;
  const av = it.avatars.find((a) => a.player === it.hack.by);
  if (!av) {
    it.hack = null;
    return;
  }
  if (!atMainframe(it, av)) return;
  const level = it.hack.level;
  const step = (dt / hackTime(it, level)) * (av.role === 'engineer' ? B.ROLE_HACK : 1);
  it.work[level] = Math.min(1, it.work[level] + step);
  it.hacking = true;
  // The trace only matters while nobody has been found out yet.
  if (it.mood === 'lockdown') {
    it.trace = Math.min(1, it.trace + step * B.HACK_TRACE[level]);
    if (it.trace >= 1) {
      state.events.push({ type: 'traced' });
      foundOut(state, it, it.mainframe);
    }
  }
  if (it.work[level] >= 1) done(state, st, it, level);
}
