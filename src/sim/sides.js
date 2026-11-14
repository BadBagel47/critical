// Who is on whose side, and what each side thinks of the crew.
// Everything that can shoot or be shot has a side: the crew, the pirates, one of the factions,
// or a station that stands on its own.
import { B } from './balance.js';

export const CREW = 'crew';
export const PIRATE = 'pirate';

// The factions. Names and characters are placeholders until they have been gone through (D-095).
//   home     the sectors where most of its stations and ships are, by sector number
export const FACTIONS = {
  charter: { name: 'THE CHARTER', short: 'CHARTER', about: 'A TRADE LEAGUE WITH RICH STATIONS', home: [0, 2] },
  wardens: { name: 'THE WARDENS', short: 'WARDENS', about: 'KEEPERS OF ORDER WITH HEAVY SHIPS', home: [3] },
  drifters: { name: 'THE DRIFTERS', short: 'DRIFTERS', about: 'FREE SALVAGERS OUT ON THE EDGE', home: [1, 2] },
};
export const isFaction = (side) => side in FACTIONS;
// A station that belongs to no faction stands on its own, with a standing of its own.
export const ownSide = (stationId) => 'free-' + stationId;

// What a side thinks of the crew, from -100 to 100. Everyone starts out neutral.
export const standingOf = (state, side) => state.standing[side] || 0;

// How a side treats the crew, from its standing:
//   friendly  fuel is free and repairs are cheap
//   neutral   trade at normal prices
//   wary      trade at higher prices
//   closed    no trade and nobody is let aboard
//   hostile   its stations and ships open fire
export function moodOf(state, side) {
  if (side === CREW) return 'friendly';
  if (side === PIRATE) return 'hostile';
  const s = standingOf(state, side);
  if (s >= B.STANDING.friendly) return 'friendly';
  if (s > B.STANDING.wary) return 'neutral';
  if (s > B.STANDING.closed) return 'wary';
  if (s > B.STANDING.hostile) return 'closed';
  return 'hostile';
}

// Two sides that shoot at each other on sight. Pirates fight everyone. Factions and free stations
// leave each other alone, and fight the crew only when the crew has made enemies of them.
export function enemies(state, a, b) {
  if (a === b) return false;
  if (a === PIRATE || b === PIRATE) return true;
  if (a === CREW) return moodOf(state, b) === 'hostile';
  if (b === CREW) return moodOf(state, a) === 'hostile';
  return false;
}

export function nameOfSide(state, side) {
  if (isFaction(side)) return FACTIONS[side].name;
  if (side === PIRATE) return 'THE PIRATES';
  if (side === CREW) return 'YOUR CREW';
  const station = state.things.find((t) => t.side === side);
  return station ? station.name : 'A FREE STATION';
}

// The crew's standing with a side changes. Says so when it moves into another mood.
export function changeStanding(state, side, by) {
  if (side === CREW || side === PIRATE || !by) return;
  const before = moodOf(state, side);
  let next = Math.max(-100, Math.min(100, standingOf(state, side) + by));
  // Once it has come to shooting there is no quick way back.
  if (by < 0 && next <= B.STANDING.hostile) next = -100;
  state.standing[side] = next;
  const after = moodOf(state, side);
  if (after !== before)
    state.events.push({ type: 'standing', side, name: nameOfSide(state, side), mood: after, better: by > 0 });
}

// Everyone is glad to see a pirate gone.
export function thankForPirate(state) {
  for (const side of Object.keys(state.standing)) changeStanding(state, side, B.STANDING_GAIN.pirate);
}

// A side that the crew has fallen out with comes round by itself in time, as far as trading at a high price.
// That way there is always a way back.
export function stepStanding(state, dt) {
  // Nobody forgives a crew that is busy breaking into one of their stations.
  const docked = state.ship.docked && state.things.find((t) => t.id === state.ship.docked);
  const busy = docked && docked.align === 'hostile' ? docked.side : null;
  for (const side of Object.keys(state.standing)) {
    if (side === busy) continue;
    if (state.standing[side] < B.STANDING.mends) changeStanding(state, side, B.STANDING_GAIN.forgive * dt);
  }
}
