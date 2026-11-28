// Knocked out instead of blown up (F-081, D-248, R-590, R-591). A gunboat or a freighter whose hull falls low
// enough, or whose systems the ion gun has burned through, stops fighting and drifts with its crew aboard. It is
// then a place like a wreck, docked at and boarded the same way, but its crew is alive and its power on: inside it
// is in lockdown, with guards that hunt the boarders once they are found out (R-590). Its hold is whole, so there
// is more to carry out, and a pirate's bounty is paid when its crew is beaten (SL4). Shot on, it blows up as the
// ship would have (SL1). Left alone, its crew has it flying again in a while (SL3).
//
// The knocked-out ship is kept on the place as `crew`: the ship as it was, its side, and how long the repair has
// left. A place without `crew` is an ordinary wreck.
import { B } from './balance.js';
import { SHIPS } from './kinds.js';
import { CREW, PIRATE } from './sides.js';
import { addThing, removeThing, findThing } from './things.js';
import { createWreck, currentSector } from './sectors.js';
import { awake } from './guards.js';
import { leave } from './boarders.js';
import { rewardKill } from './vessels.js';
import { earn } from './purses.js';
import { damageShip } from './damage.js';
import { beaconsFor, setMood } from './interior.js';
import { forward, headingTo } from './util.js';

// The ships that can be knocked out and boarded: those that have an inside (SL2).
export const boardable = (kind) => !!SHIPS[kind] && !!SHIPS[kind].leavesWreck;

// Whether a ship hurt by the crew is knocked out now.
export function knockedOut(v) {
  if (!boardable(v.kind) || v.hp <= 0) return false;
  return v.hp <= v.hpMax * B.DISABLE_AT || (v.ion || 0) >= v.hpMax * B.ION_DISABLE;
}

// The ship stops and becomes a place to board. It is taken out of the ships, and comes back if it is repaired.
export function knockOut(state, v) {
  const tier = currentSector(state).tier;
  const place = createWreck(state, v.x, v.y, Math.min(3, 1 + tier), v.kind);
  place.heading = v.heading;
  const ship = { ...v, vx: 0, vy: 0, ion: 0 };
  place.crew = { side: v.side, ship, repair: B.DISABLED_FOR, beaten: false };
  addThing(state, place);
  state.vessels = state.vessels.filter((o) => o !== v);
  for (const post of ['captain', 'gunner']) if (state.marks[post] === v.id) state.marks[post] = null;
  state.fx.push({ type: 'boom', x: v.x, y: v.y, t: 0, dur: 0.5, size: 18 });
  state.events.push({ type: 'knockedOut', id: place.id, kind: v.kind, name: SHIPS[v.kind].name, side: v.side });
  return place;
}

// A knocked-out ship is hit. Its hull is the ship's own, and when that is gone it blows up, as the ship would have.
export function hurtHulk(state, place, dmg, by = CREW, ion = false) {
  const ship = place.crew.ship;
  ship.hp -= ion ? dmg * B.ION_HULL : dmg;
  if (ship.hp > 0) return;
  blowHulk(state, place, by);
}

function blowHulk(state, place, by) {
  const it = place.interior;
  if (it) for (const av of [...it.avatars]) leave(state, it, av, true);
  for (const p of state.players) if (p.lockedOut === place.id) p.lockedOut = null;
  removeThing(state, place);
  // A ship whose crew was already beaten has paid its bounty; it is not paid twice.
  rewardKill(state, { ...place.crew.ship, x: place.x, y: place.y }, by, place.crew.beaten);
  const ship = state.ship;
  if (ship.docked === place.id) {
    ship.docked = null;
    const f = forward(headingTo(ship.x - place.x, ship.y - place.y));
    ship.vx = f.x * 60;
    ship.vy = f.y * 60;
    damageShip(state, B.WRECK_BLAST_DMG, { x: ship.x, y: ship.y });
  }
}

// Each step: the crew of each knocked-out ship works on it while nobody is docked at it and someone aboard is
// still on their feet. When it is done, the ship flies and fights again. A crew that has been beaten repairs
// nothing, and a pirate's bounty is paid for it once (SL4).
export function stepHulks(state, dt) {
  for (const place of state.things) {
    const crew = place.crew;
    if (!crew || place.kind !== 'wreck') continue;
    const it = place.interior;
    if (it && !crew.beaten && it.guards.length && !it.guards.some(awake)) {
      crew.beaten = true;
      const c = SHIPS[crew.ship.kind];
      if (crew.side === PIRATE) {
        state.kills++;
        earn(state, c.bounty);
      }
      state.events.push({
        type: 'crewBeaten',
        id: place.id,
        name: c.name,
        bounty: crew.side === PIRATE ? c.bounty : 0,
      });
    }
    if (crew.beaten || state.ship.docked === place.id || (it && it.avatars.length)) continue;
    crew.repair -= dt;
    if (crew.repair > 0) continue;
    repaired(state, place);
  }
}

function repaired(state, place) {
  const ship = { ...place.crew.ship, x: place.x, y: place.y, heading: place.heading };
  removeThing(state, place);
  state.vessels.push(ship);
  state.events.push({ type: 'hulkRepaired', id: ship.id, name: SHIPS[ship.kind].name });
}

// The inside of a knocked-out ship, once it has been made as a wreck's: its power is on and its crew on its guard
// (R-590), there is no reactor about to blow, and its hold is whole (SL4).
export function crewInside(state, it) {
  it.wreck = false;
  it.power = true;
  it.reactor = null;
  it.timer = null;
  it.beacons = beaconsFor(it);
  setMood(it, 'lockdown');
  const crates = it.loot.filter((l) => l.type === 'crate');
  for (let k = 1; k < B.CREWED_LOOT; k++)
    for (const l of crates) it.loot.push({ ...l, id: state.nextId++, x: l.x + 6 * k, y: l.y + 3 * k });
  return it;
}

// The place a knocked-out ship has become, by the id it had as a ship or as a place.
export const hulkOf = (state, id) => {
  const t = findThing(state, id);
  return t && t.crew ? t : null;
};
