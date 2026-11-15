// The shared map. Space itself is never hidden, and neither is the map: it shows the system, what the ship and
// its tools can see right now, and what has been seen before as it was then. One scan shows everything in the
// system at once, as it is at that moment.
import { B } from './balance.js';
import { addThing, thingsOf, mapInfo } from './things.js';
import { dist, forward, headingTo } from './util.js';

// `scanned` is set once the system has been scanned, and the map then shows its asteroid fields too.
export function createMap() {
  return { timer: 0, scanned: false };
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

// A scan puts everything that stands still in the system on the map as it is right now, and takes away what
// is no longer there. What happens afterwards is only seen by looking, or by scanning again.
export function scan(state) {
  let fresh = 0;
  for (const t of state.things) {
    const info = mapInfo(t);
    if (!info) continue;
    const known = state.known.find((k) => k.id === t.id);
    if (known) Object.assign(known, info);
    else {
      state.known.push(info);
      fresh++;
    }
  }
  state.known = state.known.filter((k) => state.things.some((t) => t.id === k.id));
  state.map.scanned = true;
  state.events.push({ type: 'scanned', fresh });
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
    scan(state);
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
  remember(state, visionSources(state));
}
