// For trying things out. A test game has no pirates unless they are asked for, and this is how they are
// asked for. Nothing here does anything in an ordinary game.
import { PIRATE } from './sides.js';
import { makeVessel } from './vessels.js';
import { startRaid } from './stations.js';
import { startSiege } from './siege.js';
import { thingsOf } from './things.js';
import { rand, randRange, TAU } from './util.js';

// Pirates of the given kinds jump in round the frigate, as a wave of them would.
function pirates(state, kinds, far) {
  const ship = state.ship;
  const a = rand(state) * TAU;
  kinds.forEach((kind, i) => {
    const d = randRange(state, far, far + 100);
    const aa = a + i * 0.25;
    state.vessels.push(makeVessel(state, kind, ship.x + Math.sin(aa) * d, ship.y - Math.cos(aa) * d));
  });
  state.events.push({ type: 'wave', count: kinds.length });
}

// What can be called in, by name. Each answers with what to tell the player.
export const SUMMONS = {
  fighters(state) {
    pirates(state, ['fighter', 'fighter', 'fighter'], 520);
    return 'THREE PIRATE FIGHTERS';
  },
  gunboat(state) {
    pirates(state, ['gunboat', 'fighter'], 560);
    return 'A PIRATE GUNBOAT AND A FIGHTER';
  },
  cruiser(state) {
    pirates(state, ['cruiser'], 900);
    return 'THE PIRATE CRUISER';
  },
  // Pirates raid one of the stations that trade, as when a distress call comes.
  raid(state) {
    if (state.raid) return 'A RAID IS ALREADY ON';
    startRaid(state);
    return state.raid ? 'A RAID ON A STATION' : 'NO STATION TO RAID';
  },
  // A ship or a patrol of the factions jumps in at once.
  traffic(state) {
    state.traffic.timer = 0;
    return 'FACTION TRAFFIC';
  },
  // An attack on the crew's own base in this system, as when one comes on its own (F-222). A test game has none
  // unless it is asked for.
  siege(state) {
    if (state.siege) return 'AN ATTACK IS ALREADY ON';
    const own = thingsOf(state, 'station').find((st) => st.side === 'crew');
    if (!own) return 'NO BASE OF YOURS HERE';
    startSiege(state, own, state.sector, PIRATE);
    return 'PIRATES ATTACK YOUR BASE';
  },
  clear(state) {
    state.vessels = state.vessels.filter((v) => v.side !== PIRATE);
    state.raid = null;
    return 'ALL PIRATES REMOVED';
  },
};

// Call something in. Answers with what was done, or null in an ordinary game.
export function summon(state, what) {
  if (!state.test || state.over || !SUMMONS[what]) return null;
  return SUMMONS[what](state);
}
