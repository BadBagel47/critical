// The whole game in one plain object. It holds only numbers, strings, lists and plain objects,
// so it can be saved, sent and compared as it is.
import { createShip } from './ship.js';
import { createPlayer } from './players.js';
import { createSectors, generateSector, gatherForTesting } from './sectors.js';
import { applyTestLoadout } from './upgrades.js';

// `options.test` starts the game with everything unlocked, for trying things out.
// `options.hardcore` gives the crew a single life: a lost ship ends the run for good.
export function createState(seed = 1, options = {}) {
  const state = {
    seed,
    // Random numbers are drawn from here, so the same seed and commands always give the same game.
    rng: seed >>> 0,
    time: 0,
    paused: false,
    pausedBy: null,
    over: false,
    won: false,
    test: false,
    hardcore: !!options.hardcore,
    nextId: 1,
    credits: 0,
    kills: 0,
    // What happened in this step. The screen reads it for messages and sound, and then empties it.
    events: [],
    // The crew. A solo player starts as Captain.
    players: [createPlayer(0, 'PLAYER 1', 'captain')],
    ship: createShip(),
    // Space around the ship: things that stand still, other ships, the crew's Darts, and shots in flight.
    things: [],
    vessels: [],
    darts: [],
    bolts: [],
    rockets: [],
    beams: [],
    probes: [],
    fx: [],
    // The map: what has been seen, and where things were when last seen.
    map: null,
    known: [],
    // Where the asteroids of this system lie, and how rich the field is meant to be. See rocks.js.
    field: null,
    alarm: { count: 0, eta: null },
    // What each faction thinks of the crew, from -100 to 100. Free stations get an entry of their own.
    standing: { charter: 0, wardens: 0, drifters: 0 },
    // Pirate waves and raids on stations.
    spawn: { timer: 0, wave: 0 },
    raid: null,
    raidTimer: 0,
    traffic: { timer: 0 },
    // sides that the crew is in trouble with right here, see sides.js
    strife: {},
    // What each post has pointed out for the others, see teamwork.js.
    marks: { gunner: null, captain: null },
    // Sectors, the star charts the crew holds, and a jump being charged.
    sectors: createSectors(),
    sector: 0,
    charts: [0],
    jump: null,
  };
  generateSector(state, 0);
  if (options.test) {
    applyTestLoadout(state);
    // A test game has everything that can be docked with close to the start.
    gatherForTesting(state);
  }
  return state;
}
