// The airlocks of a base (F-209). An airlock has a hatch in the outer wall, where the crew comes in from the
// ship, and an inner door. The two are never open at the same time: a button shuts the one that is open, and
// after a moment the other one opens. The inner door is sealed while it is shut, so that nobody walks or
// looks through it.
//   it.locks[k]  { open, to, busy } for the airlock it.airlocks[k]: which of 'outer' and 'inner' is open (null
//                while it is on its way from one to the other), which it is on its way to, and for how long yet
import { B } from './balance.js';
import { TILE } from './floor.js';
import { dist } from './util.js';

export const makeLocks = (plan) => plan.airlocks.map(() => ({ open: 'outer', to: null, busy: 0 }));

const innerDoor = (it, k) => it.doors.find((d) => d.kind === 'lock' && d.room === it.airlocks[k].room);
// The tiles of a place are never changed where they lie: what is drawn of them is kept until they are new.
export function setTiles(it, tiles, c) {
  const next = it.tiles.slice();
  for (const i of tiles) next[i] = c;
  it.tiles = next;
}
const tileOf = (it, p) => Math.floor(p.y / TILE) * it.w + Math.floor(p.x / TILE);

// The airlock that a boarder can work from where they stand: at its hatch, or by its inner door from either
// side. -1 when there is none.
export function lockNear(it, av) {
  for (let k = 0; k < it.locks.length; k++) {
    const door = innerDoor(it, k);
    const a = it.airlocks[k];
    if (door && dist(av.x, av.y, door.x, door.y) < B.LOCK_REACH) return k;
    if (dist(av.x, av.y, a.x, a.y) < TILE * 1.8) return k;
  }
  return -1;
}
// Whether the hatch that the crew came in through is open, so that they can go back to the ship. A place with
// no airlock of this kind, a wreck, is always open.
export function hatchOpen(it) {
  const lock = it.locks[it.airlocks.indexOf(it.entry)];
  return !lock || lock.open === 'outer';
}

// Press the button: what is open shuts, and the other side opens after a moment.
export function cycleLock(state, it, k) {
  const lock = it.locks[k];
  if (!lock || lock.busy > 0) return false;
  const door = innerDoor(it, k);
  if (lock.open === 'inner') {
    // The inner door does not shut on someone who stands in the doorway.
    const inWay = [...it.avatars, ...it.guards, ...it.civilians].some((p) => door.tiles.includes(tileOf(it, p)));
    if (inWay) {
      state.events.push({ type: 'lockBlocked' });
      return false;
    }
    setTiles(it, door.tiles, 'D');
  }
  lock.to = lock.open === 'outer' ? 'inner' : 'outer';
  lock.open = null;
  lock.busy = B.LOCK_CYCLE;
  state.events.push({ type: 'lockCycling' });
  return true;
}

export function stepLocks(state, it, dt) {
  it.locks.forEach((lock, k) => {
    if (lock.busy <= 0) return;
    lock.busy -= dt;
    if (lock.busy > 0) return;
    lock.busy = 0;
    lock.open = lock.to;
    lock.to = null;
    if (lock.open === 'inner') setTiles(it, innerDoor(it, k).tiles, ',');
    state.events.push({ type: 'lockOpen', side: lock.open });
  });
}
