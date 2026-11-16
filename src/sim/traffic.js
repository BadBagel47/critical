// Traffic: ships of the factions that jump into the sector, go about their business and jump out again.
// Freighters dock at stations for a while. Patrols make a round and fight whoever is their enemy.
import { B } from './balance.js';
import { SHIPS, BASE } from './kinds.js';
import { FACTIONS, PIRATE, sectorHere } from './sides.js';
import { thingsOf } from './things.js';
import { makeVessel } from './vessels.js';
import { headingTo, toWorld, rand, randRange, TAU } from './util.js';

const around = (state, centre, near, far) => {
  const a = rand(state) * TAU;
  const d = randRange(state, near, far);
  return { x: centre.x + Math.sin(a) * d, y: centre.y - Math.cos(a) * d };
};
const pick = (state, list) => list[Math.floor(rand(state) * list.length)];
const warp = (state, at) => state.fx.push({ type: 'warp', x: at.x, y: at.y, t: 0, dur: 0.7 });
// The last leg of every errand: fly clear of the station and jump out.
const leave = (state, from) => ({ ...around(state, from, 600, 900), hold: 0, jump: true });

// Factions are seen most in the systems they own, and in those they fight over.
function pickFaction(state) {
  const sides = Object.keys(FACTIONS);
  const sec = sectorHere(state);
  const mine = (side) => sec.owner === side || (!!sec.sides && sec.sides.includes(side));
  const weights = sides.map((side) => (mine(side) ? 4 : 1));
  let roll = rand(state) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < sides.length; i++) {
    roll -= weights[i];
    if (roll < 0) return sides[i];
  }
  return sides[0];
}

// Where a ship of the given class stops to dock at a base: nose at the tip of one of its cargo arms, facing it
// (R-1153). The arm to the right is the building dock's at a base with a shipyard.
export function armBerth(st, k, length) {
  const arm = toWorld({ x: 0, y: 0, heading: st.heading }, BASE.arms[k]);
  const reach = Math.hypot(arm.x, arm.y);
  const out = (reach + length / 2 + 4) / reach;
  return { x: st.x + arm.x * out, y: st.y + arm.y * out, face: headingTo(-arm.x, -arm.y) };
}
export const armsOf = (st) => [0, 1, 2, 3].filter((k) => !(st.shipyard && k === 1));
function dockLeg(state, st, c) {
  const at = armBerth(st, pick(state, armsOf(st)), c.length);
  return { ...at, hold: randRange(state, B.TRAFFIC_VISIT[0], B.TRAFFIC_VISIT[1]) };
}

// A freighter jumps in, docks at one or two stations and leaves.
function sendFreighter(state, side, stations) {
  const first = pick(state, stations);
  const second =
    stations.length > 1 && rand(state) < 0.5
      ? pick(
          state,
          stations.filter((st) => st !== first),
        )
      : null;
  const stops = second ? [first, second] : [first];
  const at = around(state, first, 700, 1000);
  const v = makeVessel(state, 'freighter', at.x, at.y, side);
  v.heading = headingTo(first.x - at.x, first.y - at.y);
  v.legs = [...stops.map((st) => dockLeg(state, st, SHIPS.freighter)), leave(state, stops[stops.length - 1])];
  state.vessels.push(v);
  warp(state, at);
}

// A patrol jumps in, makes a round past the stations and leaves. It fights its enemies on the way.
function sendPatrol(state, side, stations) {
  const first = pick(state, stations);
  const at = around(state, first, 700, 1000);
  const round = [];
  for (let i = 0; i < 3; i++) {
    round.push({ ...around(state, pick(state, stations), 220, 340), hold: randRange(state, 4, 9) });
  }
  round.push(leave(state, first));
  const kinds = rand(state) < 0.4 ? ['gunboat', 'fighter'] : ['fighter', 'fighter'];
  kinds.forEach((kind, i) => {
    const offset = i * 46;
    const v = makeVessel(state, kind, at.x + offset, at.y, side);
    v.heading = headingTo(first.x - at.x, first.y - at.y);
    v.legs = round.map((leg) => ({ ...leg, x: leg.x + offset }));
    state.vessels.push(v);
  });
  warp(state, at);
}

export function stepTraffic(state, dt) {
  if (state.over) return;
  state.traffic.timer -= dt;
  if (state.traffic.timer > 0) return;
  state.traffic.timer = randRange(state, B.TRAFFIC_GAP[0], B.TRAFFIC_GAP[1]);
  // Traffic needs somewhere to go: a station that the pirates do not hold.
  const stations = thingsOf(state, 'station').filter((st) => st.side !== PIRATE);
  const others = state.vessels.reduce((n, v) => n + (v.side === PIRATE ? 0 : 1), 0);
  if (!stations.length || others >= B.TRAFFIC_MAX) return;
  const side = pickFaction(state);
  if (rand(state) < B.TRAFFIC_FREIGHTERS) sendFreighter(state, side, stations);
  else sendPatrol(state, side, stations);
}
