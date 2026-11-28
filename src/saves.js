// Saved games. A save is the whole game state as text, with a few words about it for the list of saves.
// Nothing here touches the screen: the place where saves are kept is passed in, so this can be tested.
import { currentSector } from './sim/sectors.js';
import { packInterior, unpackInterior } from './sim/interior.js';
import { crewOf } from './sim/players.js';

// Raised whenever the shape of the game state changes, so that an old save is refused instead of breaking.
export const SAVE_VERSION = 36;
// One save made by the game itself every time the ship docks, and five that the player makes.
export const AUTO = 'auto';
export const MANUAL = ['1', '2', '3', '4', '5'];
export const SLOTS = [AUTO, ...MANUAL];
const key = (slot) => 'critical-save-' + slot;

// What the list of saves shows about a game.
export function summaryOf(state) {
  return {
    sector: currentSector(state).name,
    time: Math.floor(state.time),
    // The richest purse, to say how rich the crew is.
    credits: Math.max(...Object.values(state.purses)),
    kills: state.kills,
    seed: state.seed,
    hardcore: !!state.hardcore,
    test: !!state.test,
    // Who held which post, so that a game played online can be told from another and continued (R-1245).
    crew: crewOf(state),
  };
}

// `now` is the time the save is made, in milliseconds since 1970.
export function packSave(state, now) {
  // What happened in the last step is not part of a save.
  return {
    game: 'critical-st8',
    version: SAVE_VERSION,
    savedAt: now,
    summary: summaryOf(state),
    state: packState({ ...state, events: [] }),
  };
}

// The insides of the places the crew has boarded, in the system the ship is in and in those it has left, are
// kept without their plans, which are made again from their seeds when the save is read (D-263). That keeps a
// save small: it is also what goes to the other players online.
function eachThing(state, fn) {
  const list = (things) => things.map((t) => (t.interior ? { ...t, interior: fn(t.interior) } : t));
  return {
    ...state,
    things: list(state.things),
    sectors: state.sectors.map((s) => (s.saved ? { ...s, saved: { ...s.saved, things: list(s.saved.things) } } : s)),
  };
}
export const packState = (state) => eachThing(state, packInterior);
export const unpackState = (state) => eachThing(state, unpackInterior);

// Read a save from text. Gives { save } or { error } with a line for the player.
export function parseSave(text) {
  let save;
  try {
    save = JSON.parse(text);
  } catch {
    return { error: 'THAT IS NOT A SAVE FILE' };
  }
  const st = save && save.state;
  const whole = st && st.ship && Array.isArray(st.players) && Array.isArray(st.things) && Array.isArray(st.sectors);
  if (!save || save.game !== 'critical-st8' || !whole) return { error: 'THAT IS NOT A SAVE FILE' };
  if (save.version !== SAVE_VERSION) return { error: 'THAT SAVE IS FROM ANOTHER VERSION OF THE GAME' };
  try {
    save.state = unpackState(st);
  } catch {
    return { error: 'THAT SAVE FILE IS DAMAGED' };
  }
  return { save };
}

// `storage` is the browser's localStorage, or anything with the same getItem, setItem and removeItem.
export function writeSlot(storage, slot, state, now) {
  if (!storage || !SLOTS.includes(slot)) return false;
  try {
    storage.setItem(key(slot), JSON.stringify(packSave(state, now)));
    return true;
  } catch {
    // The browser may be out of room, or may not allow storing at all.
    return false;
  }
}

export function readSlot(storage, slot) {
  if (!storage) return null;
  try {
    const text = storage.getItem(key(slot));
    return text ? parseSave(text).save || null : null;
  } catch {
    return null;
  }
}

export function clearSlot(storage, slot) {
  try {
    if (storage) storage.removeItem(key(slot));
  } catch {
    // nothing to clear
  }
}

// What every slot holds, without the games themselves: { [slot]: { savedAt, summary } or null }.
// Reading all saves takes a moment, so the screen keeps this list and asks again only when a save changes.
export function listSaves(storage) {
  const list = {};
  for (const slot of SLOTS) {
    const save = readSlot(storage, slot);
    list[slot] = save ? { savedAt: save.savedAt, summary: save.summary } : null;
  }
  return list;
}
// The slot in such a list that was saved last, or null when there is no save.
export function latestSlot(list) {
  let best = null;
  for (const slot of SLOTS) if (list[slot] && (!best || list[slot].savedAt > list[best].savedAt)) best = slot;
  return best;
}

// A hardcore run that ends takes its saves with it.
export function clearRun(storage, seed) {
  for (const slot of SLOTS) {
    const save = readSlot(storage, slot);
    if (save && save.summary.hardcore && save.summary.seed === seed) clearSlot(storage, slot);
  }
}

const two = (n) => String(n).padStart(2, '0');
// One line about a save for the list: where, how long played, credits, and when it was saved.
export function describeSave(save) {
  const s = save.summary;
  const d = new Date(save.savedAt);
  const when = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}  ${two(d.getHours())}:${two(d.getMinutes())}`;
  const played = `${Math.floor(s.time / 60)}:${two(s.time % 60)}`;
  const marks = (s.hardcore ? '  ·  HARDCORE' : '') + (s.test ? '  ·  TEST' : '');
  return { left: `${s.sector}  ·  ${played}  ·  ${s.credits} CR${marks}`, right: when };
}
