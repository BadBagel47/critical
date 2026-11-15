// What the player can do right where they are: dock, go aboard, trade, cut a lock. At most two things at a
// time, each with the key that does it. The screen shows them as buttons that can also be clicked or tapped,
// so that nobody has to know the keys by heart. See render/actions.js for how they are drawn.
//   name      what it is, also the name of its button
//   code      the key that does it
//   label     what the button says, and `short` what it says where there is little room
//   main      the thing the player most likely wants here. The other one is drawn smaller
//   hold      the key has to be held, and `progress` is how far it has come, from 0 to 1
//   off       it cannot be done right now. The label says why
import { POSTS } from './sim/players.js';
import { THINGS } from './sim/kinds.js';
import { dockCandidate } from './sim/ship.js';
import { findDock, nameOf } from './sim/things.js';
import { isTrading } from './sim/stations.js';
import { useTarget } from './sim/boarding.js';

const LOCK_VERB = { pipes: 'BYPASS', code: 'BYPASS', dial: 'PICK' };
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
  ...more,
});
const use = (name, label, short, more = {}) => act(name, 'KeyF', label, short, { main: true, ...more });

// What the use key does with the thing the ship is docked at.
function dockedUse(state, me, t) {
  if (isTrading(t)) return use('aboard', 'GO ABOARD', 'ABOARD');
  if (t.closed) return null;
  if (t.lock !== 'open') {
    if (t.breakin && t.breakin.started) return use('lock', 'BACK TO THE LOCK', 'LOCK');
    return use('lock', LOCK_VERB[THINGS[t.kind].lock] + ' THE LOCK', 'LOCK');
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
  if (at.type === 'airlock') return [use('leave', 'BACK TO THE SHIP', 'LEAVE')];
  if (at.type === 'desk') return [use('trade', DESK[at.desk.type], 'TRADE')];
  if (at.type === 'terminal') {
    return [use('takeover', 'TAKE OVER THE STATION', 'TAKE OVER', { hold: true, progress: it.takeover })];
  }
  const list = [];
  if (at.cut) list.push(use('cut', 'CUT THE LOCK', 'CUT', { hold: true, progress: it.doorCut }));
  if (av.charges > 0) list.push(act('blow', 'KeyC', 'BLOW THE DOOR', 'BLOW', { main: !at.cut }));
  return list;
}

// `mode` is the screen the player is on, see screens.js.
export function actionsOf(game, mode) {
  const { state, me } = game;
  if (!me || state.paused || state.over) return [];
  if (mode === 'lock') return [use('back', 'STEP AWAY', 'BACK', { main: false })];
  if (mode === 'shop') return [use('back', 'CLOSE', 'CLOSE', { main: false })];
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
