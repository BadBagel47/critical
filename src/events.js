// What the screen does about what just happened in the game: messages at the top, sound, and panels that open.
import { COL } from './config.js';
import { playEvents, setEngine } from './audio.js';

const WARM = COL.ochre[2];
const GOOD = COL.acid[2];
const BAD = COL.ember[2];
const LOOT = COL.ochre[3];
const TECH = COL.ion[2];
const FOUND = {
  station: (e) => `${e.align.toUpperCase()} STATION FOUND  ·  MARKED ON THE MAP`,
  pod: () => 'CARGO POD FOUND  ·  MARKED ON THE MAP',
  wreck: () => 'WRECK FOUND  ·  MARKED ON THE MAP',
};
// What it means for the crew when a side changes its mind about them.
const MOOD_NEWS = {
  friendly: 'YOU ARE AMONG FRIENDS NOW',
  neutral: 'TRADES WITH YOU AT NORMAL PRICES',
  wary: 'IS WARY OF YOU  ·  PRICES ARE UP',
  closed: 'WILL NOT TRADE WITH YOU',
  hostile: 'OPENS FIRE ON SIGHT',
};
const RISK = ['LOW', 'MEDIUM', 'HIGH'];
// What an attack on a station of the crew's has come to, for its warning.
const SIEGE_NEWS = {
  siege: 'UNDER ATTACK',
  docking: 'UNDER ATTACK',
  boarding: 'BOARDERS INSIDE',
  hack: 'BOARDERS AT THE MAINFRAME',
};
const HACKED = [
  'PLAN READ  ·  GUARDS AND CAMERAS ON THE MAP',
  'CAMERAS AND TURRETS OFF  ·  VAULT OPEN',
  'MAINFRAME TAKEN',
];
const FIXED = (e) => (e.part === 'hull' ? 'HULL MENDED' : 'GUN MENDED  ·  SWITCH IT ON AT THE MAINFRAME');
const NOT_READY = { pulse: 'SCANNER RECHARGING', probe: 'NO PROBES LEFT', buoy: 'NO BUOYS LEFT' };

// Short messages for things that just happened: event type -> [text, colour], or null for no message.
const TOAST = {
  boarded: (e) => (e.trade ? null : ['BOARDING', WARM]),
  teleported: () => ['TELEPORTED HOME  ·  TELEPORTER CHARGING', BAD],
  returned: () => ['BACK ON THE SHIP', GOOD],
  deposit: (e) => [`STOWED ${e.count}  ·  +${e.fuel} FUEL  ·  +${e.credits} CREDITS`, LOOT],
  teleCharging: (e) => [`TELEPORTER CHARGING  ·  ${Math.ceil(e.left)} S`, TECH],
  lockedOut: () => ['TELEPORTED OUT  ·  NO WAY BACK IN THIS DOCKING', BAD],
  recalled: (e) => [`UNDOCKED  ·  ${e.count} TELEPORTED HOME`, BAD],
  doorOpen: () => ['VAULT OPEN', LOOT],
  wreckExploded: () => ['THE WRECK BLEW UP', BAD],
  lockOpen: (e) => (e.kind === 'pod' ? null : ['LOCK BYPASSED  ·  F TO BOARD', GOOD]),
  reactorShaken: (e) => [
    `BYPASS FAILED  ·  THE REACTOR LOSES ${e.lost} S` + (e.last ? '  ·  ONE MORE BLOWS THE WRECK' : ''),
    BAD,
  ],
  podLooted: (e) => [
    `POD OPEN  ·  +${e.credits} CREDITS` + (e.fuel ? `  ·  +${e.fuel} FUEL` : '') + (e.part ? '  ·  A SPARE SLOT' : ''),
    LOOT,
  ],
  podAlarm: () => ['THE POD ALARM IS RINGING  ·  PIRATES INCOMING', BAD],
  codeWrong: () => ['WRONG CODE', BAD],
  doorDisarmed: () => ['THE ALARM ON THE DOOR IS OFF', TECH],
  reactorSteadied: (e) => [`REACTOR STEADIED  ·  ${e.gain} S MORE`, TECH],
  turretTurned: () => ['THE TURRET IS YOURS FOR A WHILE', TECH],
  sentryNoFight: () => ['THE TURRET IS FOR A FIGHT  ·  NOTHING TO SHOOT AT HERE', WARM],
  foundOut: () => ['ALARM  ·  THEY KNOW YOU ARE HERE', BAD],
  guardAsleep: () => ['GUARD ASLEEP', TECH],
  takeDown: () => ['GUARD TAKEN DOWN', TECH],
  digitFound: (e) => [e.left ? `DIGIT FOUND  ·  ${e.left} TO GO` : 'THE WHOLE CODE IS FOUND', TECH],
  distress: (e) => [`DISTRESS CALL FROM ${e.name}`, LOOT],
  distressSaved: (e) => [
    e.favor ? `${e.name} OWES YOU  ·  DISCOUNT FOR A WHILE` : `${e.name} IS SAFE  ·  +${e.reward} CREDITS`,
    GOOD,
  ],
  salvage: (e) => [`SALVAGE  ·  +${e.value} CREDITS`, LOOT],
  breached: () => ['DOOR BREACHED  ·  EVERY GUARD HEARD THAT', BAD],
  sentryDown: () => ['TURRET DEPLOYED', TECH],
  pulse: () => null,
  scanned: (e) => [e.fresh ? `SYSTEM SCANNED  ·  ${e.fresh} NEW ON THE MAP` : 'SYSTEM SCANNED  ·  NOTHING NEW', TECH],
  probe: () => ['PROBE AWAY', TECH],
  buoy: () => ['RADAR BUOY DROPPED', COL.engineer],
  buoyLost: () => ['A RADAR BUOY WAS SHOT DOWN', BAD],
  starHeat: () => ['THE STAR BURNS THE SHIP  ·  TURN AWAY', BAD],
  haze: () => ['DUST AND ICE  ·  THE SYSTEM ENDS HERE', TECH],
  found: (e) => (FOUND[e.kind] ? [FOUND[e.kind](e), WARM] : null),
  bought: (e) => [`INSTALLED  ·  ${e.name}`, GOOD],
  cannotBuy: (e) => [e.reason, WARM],
  refuelled: (e) => [`REFUELLED  ·  +${Math.round(e.amount)} FUEL`, LOOT],
  repairedAll: () => ['SHIP REPAIRED', GOOD],
  rearmed: () => ['ROCKETS REARMED', LOOT],
  chart: (e, state) => [`STAR CHART  ·  ${state.sectors[e.sector].name}  ·  J FOR THE STAR MAP`, TECH],
  laneOpen: (e) => [`THE LANE TO ${e.name} IS OPEN`, GOOD],
  probedSystem: (e) => [`PROBE REPORT  ·  ${e.name}  ·  ON THE STAR MAP`, TECH],
  slotFound: (e) => [e.slot === 'hard' ? 'FOUND A SPARE HARDPOINT' : 'FOUND A SPARE SYSTEM SLOT', GOOD],
  holdFire: (e) => [`${e.name}:  HOLD YOUR FIRE`, WARM],
  fightBack: (e) => [`${e.name}  ·  FIGHTING BACK`, BAD],
  standDown: (e) => [`${e.name}  ·  STANDING DOWN`, GOOD],
  stationHostile: (e) => [`${e.name} IS NOW HOSTILE`, BAD],
  stationFightsBack: (e) => [`BYPASS FAILED  ·  ${e.name} FIGHTS BACK`, BAD],
  stationTaken: (e) => [`${e.name} IS YOURS  ·  SHIPYARD OPEN`, GOOD],
  gunDown: () => ['STATION GUN DESTROYED', LOOT],
  noRockets: () => ['OUT OF ROCKETS', WARM],
  dartLost: () => ['A DART WAS SHOT DOWN', BAD],
  dartBuilt: () => ['A NEW DART IS READY', TECH],
  jumpCharging: (e) => [`JUMP DRIVE CHARGING  ·  ${e.name}`, TECH],
  jumpCancelled: () => ['JUMP CANCELLED', WARM],
  cannotJump: (e) => ['CANNOT JUMP  ·  ' + e.reason, WARM],
  jumped: (e) => ['ARRIVED IN ' + e.name, COL.ion[3]],
  alarm: (e) => [`ENEMY ALARM  ·  ${e.count} ${e.count === 1 ? 'HOSTILE' : 'HOSTILES'} INCOMING`, BAD],
  // Only the crew's own kills are news: a pirate pays, and anyone else is someone's loss.
  kill(e) {
    if (e.by !== 'crew') return null;
    if (e.side !== 'pirate') return [`${e.name} DESTROYED  ·  THAT WILL BE REMEMBERED`, BAD];
    return e.kind === 'fighter' ? null : [`${e.name} DESTROYED  ·  +${e.bounty} CREDITS`, LOOT];
  },
  standing: (e) => [`${e.name}  ·  ${MOOD_NEWS[e.mood]}`, e.better ? GOOD : BAD],
  stationFell: (e) => [`${e.name} HAS FALLEN${e.side === 'pirate' ? ' TO THE PIRATES' : ''}`, BAD],
  siege: (e) => [
    `${e.name} ${SIEGE_NEWS[e.stage]}  ·  ${e.by}  ·  RISK ${RISK[e.level]}  ·  ${e.minutes} MIN`,
    e.level === 2 ? BAD : WARM,
  ],
  siegeBeaten: (e) => [`${e.name} BEAT THE ATTACK OFF`, GOOD],
  ore: () => ['ORE TO THE HOLD', LOOT],
  refined: (e) => [`ORE REFINED  ·  +${e.fuel} FUEL`, TECH],
  oreSold: (e) => [`ORE SOLD  ·  +${e.credits} CREDITS`, LOOT],
  surgeBroken: () => ['HIT  ·  THE BOOST LOST ITS CHARGE', BAD],
  jumpBroken: () => ['HIT  ·  THE JUMP STARTS OVER', BAD],
  boardersMet: () => ['BOARDERS INSIDE  ·  STOP THEM BEFORE THEY TAKE THE MAINFRAME', BAD],
  turretMended: () => ['A TECHNICIAN SWITCHED A TURRET BACK ON', WARM],
  hackStarted: () => null,
  hackDone: (e) => [HACKED[e.level], TECH],
  cannotHack: (e) => [e.reason, WARM],
  traced: () => ['TRACED  ·  THE ALARM IS RAISED', BAD],
  redAlert: (e) => [`RED ALERT ON ${e.name}  ·  IT CALLS FOR HELP`, BAD],
  huntersIn: (e) => [e.side === 'hunter' ? 'BOUNTY HUNTERS JUMPED IN' : 'THEY SENT SHIPS AFTER YOU', BAD],
  bounty: (e) => [`${e.name} PUT A BOUNTY ON YOU  ·  ${e.amount} CREDITS`, BAD],
  bountyPaid: () => ['BOUNTY PAID  ·  THE HUNTERS GIVE UP', GOOD],
  bountyGone: () => ['THE BOUNTY IS DROPPED  ·  NOBODY WANTS IT ANY MORE', GOOD],
  fixStarted: () => ['REPAIRS STARTED', TECH],
  fixDone: (e) => [`${e.name}  ·  ${FIXED(e)}`, GOOD],
  gunOn: () => ['GUN SWITCHED ON', GOOD],
  defenseBought: () => ['DEFENCE UPGRADED', GOOD],
  distressHeld: (e) => [`${e.name} HELD OUT ON ITS OWN`, COL.dim],
  stationPeace: (e) => [`${e.name} DEALS WITH YOU AGAIN`, GOOD],
  stationClosed: (e) => [`${e.name} WILL NOT LET YOU ABOARD`, WARM],
  toolNotReady: (e) => [NOT_READY[e.tool], WARM],
  noPower: () => ['NO FREE POWER  ·  LOWER ANOTHER SYSTEM FIRST', WARM],
  surgeReady: () => ['BOOST READY  ·  CAPTAIN PRESSES Z', TECH],
  surgeUsed: () => ['BOOST', TECH],
  surgeCooling: (e) => [`BOOST COOLING  ·  ${Math.ceil(e.left)} S`, WARM],
  surgeNoPower: () => ['THE ENGINES HAVE NO POWER FOR A BOOST', WARM],
  powerLost: () => ['REACTOR DAMAGED  ·  POWER LOST', BAD],
  postTaken: (e) => [`${e.post.toUpperCase()} IS HELD BY ${e.by}  ·  THEY CAN SWAP BY ASKING FOR YOUR POST`, WARM],
  playerJoined: (e) => [`${e.name} JOINED THE CREW`, TECH],
  playerLeft: (e) => [`${e.name} LEFT THE CREW`, COL.dim],
};
// Things that only concern the player they happened to.
const PERSONAL = new Set([
  'boarded',
  'teleported',
  'returned',
  'deposit',
  'teleCharging',
  'lockedOut',
  'postTaken',
  'stationClosed',
  'cannotHack',
]);

export function toast(view, state, text, color = COL.text, seconds = 3.5) {
  if (view.toasts.some((t) => t.text === text)) return;
  view.toasts.push({ text, color, until: state.time + seconds });
}

// Called once per frame, after the game has been stepped and before its event list is emptied.
export function readEvents(game) {
  const { state, view } = game;
  const ship = state.ship;
  playEvents(state.events);
  const quiet = state.over || state.paused || ship.docked;
  setEngine(quiet ? 0 : Math.abs(ship.throttle) * (ship.boosting ? 1.6 : 1));
  for (const e of state.events) {
    const mine = e.player === view.playerId;
    // The lock panel and the shop open for the player who walked up to them.
    if (e.type === 'breakinOpened' && mine) view.panel = 'lock';
    if (e.type === 'mainframeUsed' && mine) view.panel = 'mainframe';
    if (e.type === 'deskUsed' && mine) {
      view.panel = 'shop';
      view.shopTab = e.desk === 'armory' ? 'armory' : 'hull';
    }
    // The game saves itself every time the ship docks.
    if (e.type === 'dock') game.actions.autosave();
    if (e.type === 'jumped') {
      view.cam = { x: 0, y: 0 };
      view.panel = null;
    }
    if (PERSONAL.has(e.type) && !mine) continue;
    const made = TOAST[e.type] && TOAST[e.type](e, state);
    if (made) toast(view, state, made[0], made[1]);
  }
}
