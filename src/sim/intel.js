// What the crew knows of the systems it is not in (D-089): the owner and the stations of a system, as they were
// when the crew last learnt of them. It is learnt by being there, by a scan, from a star chart or by a probe.
// A buoy left in a system keeps it up to date, and the system radar (F-195) shows the owners of the systems near
// by as they are now.
import { THINGS } from './kinds.js';
import { moodOf } from './sides.js';
import { has, level } from './upgrades.js';
import { hopsFrom } from './world.js';

// The stations of a system as they are: from its things if the crew has been there, or from its plan if not.
function stationsOf(state, sec) {
  const things = sec.id === state.sector ? state.things : sec.saved ? sec.saved.things : null;
  if (things) {
    return things
      .filter((t) => t.kind === 'station')
      .map((t) => ({ id: t.id, name: t.name, side: t.side, align: t.align, x: t.x, y: t.y }));
  }
  return sec.plan.map(([side, , , name]) => ({
    id: null,
    name,
    side: side || 'free',
    align: side ? moodOf(state, side) : 'neutral',
  }));
}

// What is known of a system right now, as a snapshot to keep.
export function snapshot(state, sec) {
  return { at: state.time, owner: sec.owner, sides: sec.sides, kind: sec.kind, stations: stationsOf(state, sec) };
}
// Learn of a system now.
export function learn(state, id) {
  const sec = state.sectors[id];
  if (sec) sec.intel = snapshot(state, sec);
}

// Whether a buoy lies in a system the crew has left, so that it reports from there.
const buoyIn = (sec) => !!sec.saved && sec.saved.things.some((t) => t.kind === 'buoy' && THINGS.buoy);

// What the crew sees of a system on the star map: null for a system it knows nothing of, or what it knows with
// `live` true when that is how it is now.
export function viewOf(state, id) {
  const sec = state.sectors[id];
  if (id === state.sector || buoyIn(sec)) return { ...snapshot(state, sec), live: true };
  const radar = level(state.ship, 'sysradar');
  if (radar > 0 && hopsFrom(state.sectors, state.sector)[id] <= radar) {
    const known = sec.intel || { stations: [] };
    return { ...known, owner: sec.owner, sides: sec.sides, kind: sec.kind, live: true, radar: true };
  }
  return sec.intel ? { ...sec.intel, live: false } : null;
}

// A star chart shows three systems around the one it is of, as they are when it is bought.
export function readChart(state, center) {
  const hops = hopsFrom(state.sectors, center);
  const order = state.sectors
    .filter((x) => x.id !== state.sector)
    .sort((a, b) => hops[a.id] - hops[b.id] || a.id - b.id)
    .slice(0, 3);
  for (const sec of order) learn(state, sec.id);
  return order.map((x) => x.id);
}

export const knowsOf = (state, id) => !!viewOf(state, id);
export { has };
