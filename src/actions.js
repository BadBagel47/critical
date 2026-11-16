// What the player can do right where they are: dock, go aboard, trade, cut a lock. At most two things at a
// time, each with the key that does it. The screen shows them as buttons that can also be clicked or tapped,
// so that nobody has to know the keys by heart. See render/actions.js for how they are drawn.
//   name      what it is, also the name of its button
//   code      the key that does it
//   label     what the button says, and `short` what it says where there is little room
//   main      the thing the player most likely wants here. The other one is drawn smaller
//   hold      the key has to be held, and `progress` is how far it has come, from 0 to 1
//   off       it cannot be done right now. The label says why
//   who       which posts can do it: 'can', 'best' for the post that is better at it than the others, and
//             'no' for a post that cannot. It is shown beside the button, see WHO below
//   gain      one or two words on what the post that is best at it gains, shown beside its mark
//   tip       a line that says what it is, shown the first times the button comes up
import { POSTS } from './sim/players.js';
import { THINGS } from './sim/kinds.js';
import { dockCandidate } from './sim/ship.js';
import { findDock, nameOf } from './sim/things.js';
import { isTrading } from './sim/stations.js';
import { useTarget } from './sim/boarding.js';
import { level } from './sim/upgrades.js';

const LOCK_VERB = { pipes: 'BYPASS', code: 'BYPASS', dial: 'PICK' };
// Who can do what, for the things that are not the same for every post. [captain, gunner, engineer].
const ALL = { captain: 'can', gunner: 'can', engineer: 'can' };
const only = (post) => ({ captain: 'no', gunner: 'no', engineer: 'no', [post]: 'can' });
const best = (post) => ({ ...ALL, [post]: 'best' });
const WHO = {
  dock: [only('captain'), 'ONLY THE CAPTAIN FLIES THE SHIP IN TO DOCK'],
  undock: [only('captain'), 'ONLY THE CAPTAIN CASTS OFF'],
  radar: [only('captain'), 'THE CAPTAIN FOLLOWS THE BOARDERS ON THE RADAR'],
  turn: [only('engineer'), 'ONLY THE ENGINEER CAN TURN A TURRET TO YOUR SIDE'],
  disarm: [only('engineer'), 'ONLY THE ENGINEER CAN SWITCH OFF AN ALARMED DOOR'],
  steady: [only('engineer'), 'ONLY THE ENGINEER CAN STEADY THE REACTOR'],
  cut: [best('engineer'), 'ANYONE CAN CUT THE LOCK, BUT IT IS HEARD. THE ENGINEER IS QUIET AND QUICK', 'QUIET'],
  blow: [
    only('gunner'),
    'ONLY THE GUNNER CARRIES THE CHARGE. IT OPENS THE DOOR AT ONCE, WAKES EVERYONE AND IS USED UP',
  ],
  mainframe: [
    best('engineer'),
    'ANYONE CAN WORK THE MAINFRAME. THE ENGINEER IS QUICKER, AND ALONE CAN SWITCH OFF CAMERAS AND TURRETS',
    'FASTER',
  ],
  takedown: [ALL, 'A SLEEPING GUARD THAT IS TAKEN DOWN IS OUT FOR THE REST OF THE BOARDING'],
  airlock: [ALL, 'ONLY ONE DOOR OF AN AIRLOCK IS EVER OPEN. THE BUTTON SHUTS ONE AND OPENS THE OTHER'],
  floor: [ALL, 'THE LIFT IS HEARD. THE STAIRS ARE QUIET. THE LADDER IS BEHIND AN ALARMED DOOR'],
  power: [
    best('engineer'),
    'THE BASE CANNOT BE TAKEN WHILE IT HAS POWER. QUIET TAKES TIME, AND A GUARD COMES TO LOOK LATER',
    'FASTER',
  ],
  hangar: [best('engineer'), 'NO MORE DRONES COME FROM A HANGAR THAT IS PUT OUT OF USE', 'FASTER'],
  comms: [best('engineer'), 'STOPS THE CALL FOR HELP, FOR GOOD', 'FASTER'],
};
// Every action has the same shape. `more` holds what differs from a plain press of a key.
const act = (name, code, label, short, more = {}) => ({
  name,
  code,
  label,
  short,
  main: false,
  hold: false,
  progress: 0,
  off: false,
  who: (WHO[name] || [ALL])[0],
  tip: (WHO[name] || [])[1] || null,
  gain: (WHO[name] || [])[2] || null,
  ...more,
});
const use = (name, label, short, more = {}) => act(name, 'KeyF', label, short, { main: true, ...more });

// What the use key does with the thing the ship is docked at.
function dockedUse(state, me, t) {
  if (isTrading(t)) return use('aboard', 'GO ABOARD', 'ABOARD');
  if (t.closed) return null;
  if (t.lock !== 'open') {
    if (t.breakin && t.breakin.started) return use('lock', 'BACK TO THE LOCK', 'LOCK');
    const code = THINGS[t.kind].lock === 'code';
    const more = code
      ? {
          who: best('engineer'),
          tip: 'THE ENGINEER FINDS THE CODE. ANYONE CAN ENTER IT AT THE LOCK',
          gain: 'FINDS THE CODE',
        }
      : {};
    return use('lock', LOCK_VERB[THINGS[t.kind].lock] + ' THE LOCK', 'LOCK', more);
  }
  if (!THINGS[t.kind].inside) return null;
  if (me.tele > 0) return use('board', `TELEPORTER  ${Math.ceil(me.tele)} S`, 'WAIT', { off: true });
  if (me.lockedOut === t.id) return use('board', 'YOU CANNOT GO BACK IN', 'NO', { off: true });
  return use('board', 'BOARD ' + nameOf(t), 'BOARD');
}

function onBoard(state, me) {
  const ship = state.ship;
  const captain = me.post === 'captain';
  if (!ship.docked) {
    return captain && dockCandidate(state) ? [act('dock', 'KeyE', 'DOCK', 'DOCK', { main: true })] : [];
  }
  const t = findDock(state, ship.docked);
  if (!t) return [];
  const list = [dockedUse(state, me, t)];
  if (captain) {
    const inside = state.players.some((p) => p.inside === t.id);
    list.push(act('undock', 'KeyE', inside ? 'UNDOCK AND RECALL' : 'UNDOCK', 'UNDOCK'));
    // With someone inside, the Captain can follow them on the boarding radar.
    if (inside && t.interior && !t.interior.trade) list.push(act('radar', 'KeyB', 'BOARDING RADAR', 'RADAR'));
  }
  return list.filter(Boolean);
}

const DESK = { services: 'SERVICES', shipyard: 'SHIPYARD', armory: 'ARMORY' };

function away(state, me) {
  const place = findDock(state, me.inside);
  const it = place && place.interior;
  const av = it && it.avatars.find((a) => a.player === me.id);
  const at = av && useTarget(it, av);
  if (!at) return [];
  if (at.type === 'guard') return [use('takedown', 'TAKE DOWN', 'TAKE DOWN')];
  if (at.type === 'turret') return [use('turn', 'TURN THE TURRET', 'TURN', { hold: true, progress: it.turning })];
  if (at.type === 'alarm')
    return [use('disarm', 'SWITCH OFF THE ALARM', 'DISARM', { hold: true, progress: it.turning })];
  if (at.type === 'reactor')
    return [use('steady', 'STEADY THE REACTOR', 'STEADY', { hold: true, progress: it.turning })];
  if (at.type === 'airlock') return [use('leave', 'BACK TO THE SHIP', 'LEAVE')];
  if (at.type === 'lock')
    return [use('airlock', at.busy ? 'THE AIRLOCK IS TURNING' : 'AIRLOCK BUTTON', 'BUTTON', { off: at.busy })];
  if (at.type === 'link') {
    const kind = { lift: 'LIFT', stairs: 'STAIRS', ladder: 'LADDER' }[at.link.kind];
    return [use('floor', `${kind} ${at.up ? 'UP' : 'DOWN'}`, at.up ? 'UP' : 'DOWN')];
  }
  if (at.type === 'breaker') {
    const list = [use('power', 'SWITCH OFF THE POWER  ·  QUIET', 'POWER', { hold: true, progress: it.turning })];
    if (av.charges > 0) list.push(act('blow', 'KeyC', 'BLOW IT  ·  LOUD', 'BLOW'));
    return list;
  }
  if (at.type === 'hangar')
    return [use('hangar', 'PUT THE DRONE HANGAR OUT', 'HANGAR', { hold: true, progress: it.turning })];
  if (at.type === 'comms')
    return [use('comms', 'STOP THE CALL FOR HELP', 'COMMS', { hold: true, progress: it.turning })];
  if (at.type === 'desk') return [use('trade', DESK[at.desk.type], 'TRADE')];
  if (at.type === 'mainframe') {
    const working = it.hack ? { progress: it.work[it.hack.level], hold: true } : {};
    return [use('mainframe', 'MAINFRAME', 'MAINFRAME', working)];
  }
  const list = [];
  // The Engineer goes round the lock without a sound. Anyone else cuts it, which is heard.
  const quiet = av.role === 'engineer';
  if (at.cut) {
    list.push(
      use('cut', quiet ? 'BYPASS THE LOCK' : 'CUT THE LOCK  ·  LOUD', quiet ? 'BYPASS' : 'CUT', {
        hold: true,
        progress: it.doorCut,
      }),
    );
  }
  // The charge is the Gunner's. The others see that the ship has one, and who can use it.
  const carried = level(state.ship, 'charge') > 0;
  if (av.charges > 0) list.push(act('blow', 'KeyC', 'BLOW THE DOOR', 'BLOW', { main: !at.cut }));
  else if (carried && av.role !== 'gunner') list.push(act('blow', 'KeyC', 'BLOW THE DOOR', 'BLOW', { off: true }));
  return list;
}

// `mode` is the screen the player is on, see screens.js.
export function actionsOf(game, mode) {
  const { state, me } = game;
  if (!me || state.paused || state.over) return [];
  if (mode === 'lock') return [use('back', 'STEP AWAY', 'BACK', { main: false })];
  if (mode === 'shop' || mode === 'mainframe') return [use('back', 'CLOSE', 'CLOSE', { main: false })];
  if (mode === 'away') return away(state, me);
  if (mode !== 'crew' && !POSTS.includes(mode)) return [];
  const list = onBoard(state, me);
  // The Engineer can fold their screen away to see space, and bring it back.
  if (mode === 'engineer') {
    const open = !!(game.view && game.view.engOpen);
    list.push(act('panel', 'KeyV', open ? 'SEE SPACE' : 'OPEN THE PANEL', open ? 'SPACE' : 'PANEL'));
  }
  return list;
}
