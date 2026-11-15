// Help that a station calls when the crew turns on it from the inside, and the bounty that a free station puts on
// a crew that took it (docs/station-boarding.md, section 9).
//   state.hunt    the next group on its way to the crew: { side, timer, out }. `out` is true while the group is
//                 in the sector. A faction sends its own ships. A free station sends bounty hunters.
//   state.bounty  the price on the crew: { amount, beaten, from }. Hunters come for it, one group at a time, until
//                 it is paid at a station that trades with the crew, or BOUNTY_GROUPS groups have been beaten.
import { B } from './balance.js';
import { CREW, HUNTER, isFaction, enemies } from './sides.js';
import { makeVessel, fleeFrom } from './vessels.js';
import { rand, randRange, TAU } from './util.js';

// The station sends for help. Its own faction comes, and a free station sends bounty hunters.
export function callHelp(state, st) {
  if (state.hunt) return;
  state.hunt = { side: isFaction(st.side) ? st.side : HUNTER, timer: B.HUNT_FIRST, out: false };
}

export function putBounty(state, st) {
  state.bounty = { amount: B.BOUNTY, beaten: 0, from: st.name };
  state.events.push({ type: 'bounty', amount: B.BOUNTY, name: st.name });
  if (!state.hunt) state.hunt = { side: HUNTER, timer: randRange(state, B.HUNT_GAP[0], B.HUNT_GAP[1]), out: false };
}

// The bounty is paid. Hunters already here give up and leave.
export function payBounty(state) {
  if (!state.bounty) return;
  state.bounty = null;
  if (state.hunt && state.hunt.side === HUNTER) state.hunt = null;
  for (const v of state.vessels) {
    if (!v.hunt || v.side !== HUNTER) continue;
    v.hunt = false;
    fleeFrom(state, v, state.ship);
  }
  state.events.push({ type: 'bountyPaid' });
}

// A group comes in a little way from the ship: two fighters and a gunboat.
function sendGroup(state) {
  const ship = state.ship;
  const a = rand(state) * TAU;
  for (const kind of ['gunboat', 'fighter', 'fighter']) {
    const v = makeVessel(state, kind, ship.x + Math.sin(a) * 950, ship.y - Math.cos(a) * 950, state.hunt.side);
    v.hunt = true;
    state.vessels.push(v);
    state.fx.push({ type: 'warp', x: v.x, y: v.y, t: 0, dur: 0.7 });
  }
  state.hunt.out = true;
  state.events.push({ type: 'huntersIn', side: state.hunt.side });
}

// The group is gone from the sector: beaten, or left behind by a jump (`beaten` false).
function groupOver(state, beaten) {
  const b = state.bounty;
  if (beaten && b && state.hunt.side === HUNTER) {
    b.beaten++;
    if (b.beaten >= B.BOUNTY_GROUPS) {
      state.bounty = null;
      state.events.push({ type: 'bountyGone' });
    }
  }
  if (state.bounty) state.hunt = { side: HUNTER, timer: randRange(state, B.HUNT_GAP[0], B.HUNT_GAP[1]), out: false };
  else state.hunt = null;
}

// The ship jumped away from the group that hunted it. The bounty still stands, and a new group will find it.
export function huntAfterJump(state) {
  if (state.hunt && state.hunt.out) groupOver(state, false);
}

export function stepHunt(state, dt) {
  const hunt = state.hunt;
  if (!hunt || state.over) return;
  if (!hunt.out) {
    // Nobody comes while the ship is between sectors.
    if (state.jump) return;
    hunt.timer -= dt;
    if (hunt.timer <= 0) sendGroup(state);
    return;
  }
  const left = state.vessels.filter((v) => v.hunt && v.hp > 0 && !v.gone);
  if (!left.length) groupOver(state, true);
  // A faction that has made its peace with the crew calls its ships off.
  else if (!enemies(state, hunt.side, CREW)) {
    for (const v of left) {
      v.hunt = false;
      fleeFrom(state, v, state.ship);
    }
    groupOver(state, false);
  }
}
