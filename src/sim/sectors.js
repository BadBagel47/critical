// Sectors: the world is split into sectors, and a star chart unlocks the jump to the next one.
// Only the sector the ship is in is simulated. The others are stored as they were left.
import { B } from './balance.js';
import { rand, randRange, TAU, dist } from './util.js';
import { createMap } from './map.js';
import { createStation } from './stations.js';

const SPEC = [
  { name: 'KESTREL DRIFT', tier: 0, links: [1, 2], hint: 'QUIET  ·  A FRIENDLY SHIPYARD' },
  { name: 'ASH BELT', tier: 1, links: [0, 3], hint: 'RICH IN FUEL  ·  ONE HOSTILE STATION' },
  { name: 'HOLLOW REACH', tier: 1, links: [0, 3], hint: 'MANY WRECKS  ·  PIRATE PATROLS' },
  { name: 'THE NARROWS', tier: 2, links: [1, 2, 4], hint: 'GUNBOATS  ·  TWO HOSTILE STATIONS' },
  { name: 'THE MAW', tier: 3, links: [3], boss: true, hint: 'THE PIRATE CRUISER WAITS HERE' },
];
export const createSectors = () => SPEC.map((s, id) => ({ ...s, id, visited: false, saved: null }));
export const currentSector = (state) => state.sectors[state.sector];

export function createWreck(s, x, y, difficulty) {
  return { id: s.nextId++, kind: 'wreck', x, y, heading: randRange(s, 0, TAU), difficulty, interior: null, lock: 'locked', breakin: null };
}

const at = (a, d) => ({ x: Math.sin(a) * d, y: -Math.cos(a) * d });

// Fill the world with a fresh sector around the origin.
export function generateSector(s, id) {
  const sec = s.sectors[id], tier = sec.tier;
  s.wrecks = []; s.rocks = []; s.stations = []; s.map = createMap(); s.known = []; s.buoys = [];
  const base = rand(s) * TAU;
  const wreckCount = id === 2 ? 5 : 3;
  for (let i = 0; i < wreckCount; i++) {
    const p = at(base + i * (TAU / wreckCount) + randRange(s, -0.3, 0.3), i === 0 ? 620 : randRange(s, 1000, 1900));
    const diff = tier === 0 ? (i === 2 ? 2 : 1) : Math.min(3, 1 + Math.floor(rand(s) * (tier + 1)));
    s.wrecks.push(createWreck(s, p.x, p.y, diff));
  }
  const plan = [
    [['friendly', true, 330, 'KESTREL YARD'], ['neutral', false, 1500, 'DRIFT POST']],
    id === 1 ? [['neutral', true, 900, 'ASH DEPOT'], ['hostile', false, 1700, 'CINDER HOLD']] : [['neutral', true, 1000, 'HOLLOW MARKET'], ['hostile', false, 1800, 'REACH FORT']],
    [['neutral', true, 950, 'NARROWS DOCK'], ['hostile', false, 1500, 'IRON GATE'], ['hostile', false, 2000, 'BLACK PIER']],
    [['hostile', false, 1400, 'MAW BASTION']],
  ][tier];
  plan.forEach(([align, yard, d, name], i) => {
    const p = at(base + 1.1 + i * 2.3 + randRange(s, -0.2, 0.2), d);
    const st = createStation(s, p.x, p.y, align, yard, name);
    // Each trading station sells the chart to one of the sectors you can jump to from here.
    if (align !== 'hostile') st.chart = sec.links.filter((l) => l !== 0)[i % Math.max(1, sec.links.filter((l) => l !== 0).length)] ?? null;
    s.stations.push(st);
  });
  for (let i = 0; i < 46; i++) {
    const p = at(rand(s) * TAU, randRange(s, 260, 2400));
    const rock = { id: s.nextId++, x: p.x, y: p.y, kind: Math.floor(rand(s) * 3), spin: randRange(s, 0, TAU) };
    rock.r = [13, 8, 19][rock.kind];
    if ([...s.wrecks, ...s.stations].some((w) => dist(w.x, w.y, rock.x, rock.y) < 190)) continue;
    s.rocks.push(rock);
  }
  s.pirates = []; s.bolts = []; s.rockets = []; s.probes = []; s.beams = [];
  if (sec.boss) {
    const p = at(base + 3.3, 1000);
    s.pirates.push({ id: s.nextId++, kind: 'cruiser', x: p.x, y: p.y, vx: 0, vy: 0, heading: 0, hp: B.CRUISER_HP, hpMax: B.CRUISER_HP, mode: 'approach', timer: 0, cool: 1, spawn: 10, guns: [0, 0.4, 0.8] });
  }
  s.spawn = { timer: B.FIRST_WAVE_DELAY * (B.PIRATE_PACE[Math.min(3, s.players.length)] || 1), wave: 0 };
  sec.visited = true;
}

const KEEP = ['wrecks', 'rocks', 'stations', 'map', 'known', 'buoys'];

// Why the ship cannot jump to a sector right now, or null when it can.
export function jumpBlocked(state, to) {
  const sec = currentSector(state), ship = state.ship;
  if (!state.sectors[to] || to === state.sector) return 'NOT A SECTOR';
  if (!sec.links.includes(to)) return 'NO ROUTE FROM HERE';
  if (!state.charts.includes(to)) return 'NO STAR CHART';
  if (ship.docked) return 'UNDOCK FIRST';
  if (state.players.some((p) => p.inside !== null)) return 'CREW STILL AWAY';
  if (ship.fuel < B.JUMP_FUEL) return 'NOT ENOUGH FUEL';
  return null;
}

export function stepJump(state, cmd, dt) {
  const ship = state.ship;
  if (cmd && cmd.jump !== undefined && cmd.jump !== null) {
    if (state.jump && state.jump.to === cmd.jump) { state.jump = null; state.events.push({ type: 'jumpCancelled' }); }
    else {
      const why = jumpBlocked(state, cmd.jump);
      if (why) state.events.push({ type: 'cannotJump', reason: why });
      else { state.jump = { to: cmd.jump, t: 0 }; state.events.push({ type: 'jumpCharging', name: state.sectors[cmd.jump].name }); }
    }
  }
  if (!state.jump) return;
  if (jumpBlocked(state, state.jump.to)) { state.jump = null; state.events.push({ type: 'jumpCancelled' }); return; }
  state.jump.t += dt;
  if (state.jump.t < B.JUMP_CHARGE) return;
  // Jump: store this sector as it is, then load or create the next one.
  const from = currentSector(state), to = state.jump.to;
  from.saved = {}; for (const k of KEEP) from.saved[k] = state[k];
  ship.fuel -= B.JUMP_FUEL;
  ship.dartStock += state.darts.length; state.darts = []; ship.dartsOut = false;
  state.sector = to; state.jump = null;
  const next = state.sectors[to];
  if (next.saved) {
    for (const k of KEEP) state[k] = next.saved[k];
    next.saved = null;
    state.pirates = []; state.bolts = []; state.rockets = []; state.probes = []; state.beams = [];
    state.spawn = { timer: B.FIRST_WAVE_DELAY * (B.PIRATE_PACE[Math.min(3, state.players.length)] || 1), wave: Math.floor(state.spawn.wave / 2) };
  } else generateSector(state, to);
  ship.x = 0; ship.y = 0; ship.vx = 0; ship.vy = 0; ship.throttle = 0; ship.pulse = null;
  state.fx = [{ type: 'jump', x: 0, y: 0, t: 0, dur: 1 }];
  state.events.push({ type: 'jumped', name: next.name });
}
