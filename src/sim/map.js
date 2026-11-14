// The shared map: fog of war lifted by what the ship and its tools can see.
// Space itself is never hidden. Only the map remembers what has been seen.
import { B } from './balance.js';
import { addThing, thingsOf, mapInfo } from './things.js';
import { dist, forward, headingTo } from './util.js';

export const MAP_N = Math.round((B.MAP_HALF * 2) / B.MAP_CELL);
export const cellOf = (v) => Math.floor((v + B.MAP_HALF) / B.MAP_CELL);
export const inMap = (x, y) => Math.abs(x) < B.MAP_HALF && Math.abs(y) < B.MAP_HALF;

export function createMap() {
  return { seen: new Array(MAP_N * MAP_N).fill(0), timer: 0 };
}

// Everything that currently sees: the ship, an active scanner pulse, probes, buoys and friendly stations.
export function visionSources(state) {
  const ship = state.ship;
  const out = [{ x: ship.x, y: ship.y, r: B.VISION_SHIP, kind: 'ship' }];
  if (ship.pulse) {
    const r = B.PULSE_RADIUS * Math.min(1, ship.pulse.t / 0.8);
    out.push({ x: ship.pulse.x, y: ship.pulse.y, r, kind: 'pulse' });
  }
  for (const p of state.probes) out.push({ x: p.x, y: p.y, r: B.PROBE_RADIUS, kind: 'probe' });
  for (const b of thingsOf(state, 'buoy')) out.push({ x: b.x, y: b.y, r: B.BUOY_RADIUS, kind: 'buoy' });
  // Friendly stations have radar of their own.
  for (const st of thingsOf(state, 'station')) {
    if (st.align === 'friendly') out.push({ x: st.x, y: st.y, r: B.STATION_VISION, kind: 'station' });
  }
  return out;
}
export function isVisible(state, x, y, sources = visionSources(state)) {
  return sources.some((s) => dist(s.x, s.y, x, y) <= s.r);
}
export const isSeen = (state, x, y) => inMap(x, y) && state.map.seen[cellOf(y) * MAP_N + cellOf(x)] === 1;

function liftFog(state, sources) {
  const seen = state.map.seen;
  const c = B.MAP_CELL;
  for (const s of sources) {
    const x0 = Math.max(0, cellOf(s.x - s.r));
    const x1 = Math.min(MAP_N - 1, cellOf(s.x + s.r));
    const y0 = Math.max(0, cellOf(s.y - s.r));
    const y1 = Math.min(MAP_N - 1, cellOf(s.y + s.r));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (seen[cy * MAP_N + cx]) continue;
        if (dist(s.x, s.y, (cx + 0.5) * c - B.MAP_HALF, (cy + 0.5) * c - B.MAP_HALF) <= s.r) seen[cy * MAP_N + cx] = 1;
      }
    }
  }
}

// Lift the fog over a round area at once, as if it had been seen.
export function reveal(state, x, y, r) {
  liftFog(state, [{ x, y, r }]);
}

// Things that stand still stay on the map as they were last seen.
function remember(state, sources) {
  for (const t of state.things) {
    const info = mapInfo(t);
    if (!info || !isVisible(state, t.x, t.y, sources)) continue;
    const known = state.known.find((k) => k.id === t.id);
    if (known) {
      Object.assign(known, info);
      continue;
    }
    state.known.push(info);
    state.events.push({ type: 'found', kind: t.kind, ...(t.align ? { align: t.align } : {}) });
  }
  // Something that is gone is forgotten once someone looks at where it was.
  const exists = (k) => state.things.some((t) => t.id === k.id);
  state.known = state.known.filter((k) => exists(k) || !isVisible(state, k.x, k.y, sources));
}

// The Engineer's tools: the scanner pulse, probes and radar buoys.
const notReady = (state, tool) => {
  state.events.push({ type: 'toolNotReady', tool });
  return false;
};
const TOOLS = {
  pulse(state, ship) {
    if (ship.pulseCool > 0) return notReady(state, 'pulse');
    ship.pulse = { x: ship.x, y: ship.y, t: 0 };
    ship.pulseCool = B.PULSE_COOLDOWN;
    return true;
  },
  // A probe flies to where it was sent, no further than its range.
  probe(state, ship, tool) {
    if (ship.probeStock <= 0) return notReady(state, 'probe');
    let tx = tool.x;
    let ty = tool.y;
    const d = dist(ship.x, ship.y, tx, ty);
    if (d > B.PROBE_RANGE) {
      tx = ship.x + ((tx - ship.x) * B.PROBE_RANGE) / d;
      ty = ship.y + ((ty - ship.y) * B.PROBE_RANGE) / d;
    }
    ship.probeStock--;
    state.probes.push({ id: state.nextId++, x: ship.x, y: ship.y, tx, ty, linger: B.PROBE_LINGER });
    return true;
  },
  buoy(state, ship) {
    if (ship.buoyStock <= 0) return notReady(state, 'buoy');
    ship.buoyStock--;
    addThing(state, { id: state.nextId++, kind: 'buoy', x: ship.x, y: ship.y, heading: 0, hp: B.BUOY_HP });
    return true;
  },
};

export function useTool(state, tool) {
  const use = TOOLS[tool.type];
  if (!use || !use(state, state.ship, tool)) return false;
  state.events.push({ type: tool.type });
  return true;
}

function stepProbes(state, dt) {
  for (const p of state.probes) {
    const d = dist(p.x, p.y, p.tx, p.ty);
    const stepLen = B.PROBE_SPEED * dt;
    if (d > stepLen) {
      const f = forward(headingTo(p.tx - p.x, p.ty - p.y));
      p.x += f.x * stepLen;
      p.y += f.y * stepLen;
    } else {
      // At its target the probe lingers for a while and then burns out.
      p.x = p.tx;
      p.y = p.ty;
      p.linger -= dt;
    }
  }
  state.probes = state.probes.filter((p) => p.linger > 0);
}

// Hostile ships shoot down buoys they come close to.
function stepBuoys(state, dt) {
  const buoys = thingsOf(state, 'buoy');
  for (const b of buoys) {
    for (const v of state.vessels) if (dist(b.x, b.y, v.x, v.y) < B.BUOY_DANGER) b.hp -= B.BUOY_DRAIN * dt;
  }
  const lost = buoys.filter((b) => b.hp <= 0);
  for (const b of lost) {
    state.fx.push({ type: 'boom', x: b.x, y: b.y, t: 0, dur: 0.5, size: 14 });
    state.events.push({ type: 'buoyLost' });
  }
  if (lost.length) state.things = state.things.filter((t) => !lost.includes(t));
}

export function stepMap(state, dt) {
  const ship = state.ship;
  ship.pulseCool = Math.max(0, ship.pulseCool - dt);
  if (ship.pulse) {
    ship.pulse.t += dt;
    if (ship.pulse.t >= B.PULSE_TIME) ship.pulse = null;
  }
  if (ship.probeStock < B.PROBE_STOCK) {
    ship.probeRegen += dt;
    if (ship.probeRegen >= B.PROBE_REGEN) {
      ship.probeStock++;
      ship.probeRegen = 0;
    }
  }
  stepProbes(state, dt);
  stepBuoys(state, dt);
  // The map is brought up to date a few times a second.
  state.map.timer -= dt;
  if (state.map.timer > 0) return;
  state.map.timer = 0.2;
  const sources = visionSources(state);
  liftFog(state, sources);
  remember(state, sources);
}
