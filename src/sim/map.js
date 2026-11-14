// The shared map: fog of war lifted by what the ship and its tools can see.
// Space itself is never hidden. Only the map remembers what has been seen.
import { B } from './balance.js';
import { dist, forward, headingTo } from './util.js';

export const MAP_N = Math.round((B.MAP_HALF * 2) / B.MAP_CELL);
export const cellOf = (v) => Math.floor((v + B.MAP_HALF) / B.MAP_CELL);
export const inMap = (x, y) => Math.abs(x) < B.MAP_HALF && Math.abs(y) < B.MAP_HALF;

export function createMap() {
  return { seen: new Array(MAP_N * MAP_N).fill(0), timer: 0 };
}

// Everything that currently sees: the ship, an active scanner pulse, probes and buoys.
export function visionSources(state) {
  const ship = state.ship, out = [{ x: ship.x, y: ship.y, r: B.VISION_SHIP, kind: 'ship' }];
  if (ship.pulse) out.push({ x: ship.pulse.x, y: ship.pulse.y, r: B.PULSE_RADIUS * Math.min(1, ship.pulse.t / 0.8), kind: 'pulse' });
  for (const p of state.probes) out.push({ x: p.x, y: p.y, r: B.PROBE_RADIUS, kind: 'probe' });
  for (const b of state.buoys) out.push({ x: b.x, y: b.y, r: B.BUOY_RADIUS, kind: 'buoy' });
  // Friendly stations have radar of their own.
  for (const st of state.stations) if (st.align === 'friendly') out.push({ x: st.x, y: st.y, r: B.STATION_VISION, kind: 'station' });
  return out;
}
export function isVisible(state, x, y, sources = visionSources(state)) {
  return sources.some((s) => dist(s.x, s.y, x, y) <= s.r);
}
export const isSeen = (state, x, y) => inMap(x, y) && state.map.seen[cellOf(y) * MAP_N + cellOf(x)] === 1;

function reveal(state, sources) {
  const seen = state.map.seen, c = B.MAP_CELL;
  for (const s of sources) {
    const x0 = Math.max(0, cellOf(s.x - s.r)), x1 = Math.min(MAP_N - 1, cellOf(s.x + s.r));
    const y0 = Math.max(0, cellOf(s.y - s.r)), y1 = Math.min(MAP_N - 1, cellOf(s.y + s.r));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (seen[cy * MAP_N + cx]) continue;
      if (dist(s.x, s.y, (cx + 0.5) * c - B.MAP_HALF, (cy + 0.5) * c - B.MAP_HALF) <= s.r) seen[cy * MAP_N + cx] = 1;
    }
  }
  // Things that stand still stay on the map as they were last seen.
  for (const w of state.wrecks) {
    if (!isVisible(state, w.x, w.y, sources)) continue;
    const k = state.known.find((e) => e.id === w.id);
    if (k) { k.x = w.x; k.y = w.y; } else { state.known.push({ id: w.id, kind: 'wreck', x: w.x, y: w.y }); state.events.push({ type: 'found', kind: 'wreck' }); }
  }
  for (const st of state.stations) {
    if (!isVisible(state, st.x, st.y, sources)) continue;
    const k = state.known.find((e) => e.id === st.id), info = { id: st.id, kind: 'station', x: st.x, y: st.y, align: st.align, shipyard: st.shipyard, name: st.name };
    if (k) Object.assign(k, info); else { state.known.push(info); state.events.push({ type: 'found', kind: 'station', align: st.align }); }
  }
  for (const pod of state.pods) {
    if (!isVisible(state, pod.x, pod.y, sources) || state.known.some((e) => e.id === pod.id)) continue;
    state.known.push({ id: pod.id, kind: 'pod', x: pod.x, y: pod.y }); state.events.push({ type: 'found', kind: 'pod' });
  }
  const exists = (k) => k.kind === 'station' || state.wrecks.some((w) => w.id === k.id) || state.pods.some((w) => w.id === k.id);
  state.known = state.known.filter((k) => exists(k) || !isVisible(state, k.x, k.y, sources));
}

export function useTool(state, tool) {
  const ship = state.ship;
  if (tool.type === 'pulse') {
    if (ship.pulseCool > 0) { state.events.push({ type: 'toolNotReady', tool: 'pulse' }); return false; }
    ship.pulse = { x: ship.x, y: ship.y, t: 0 }; ship.pulseCool = B.PULSE_COOLDOWN;
    state.events.push({ type: 'pulse' }); return true;
  }
  if (tool.type === 'probe') {
    if (ship.probeStock <= 0) { state.events.push({ type: 'toolNotReady', tool: 'probe' }); return false; }
    let tx = tool.x, ty = tool.y; const d = dist(ship.x, ship.y, tx, ty);
    if (d > B.PROBE_RANGE) { tx = ship.x + ((tx - ship.x) * B.PROBE_RANGE) / d; ty = ship.y + ((ty - ship.y) * B.PROBE_RANGE) / d; }
    ship.probeStock--;
    state.probes.push({ id: state.nextId++, x: ship.x, y: ship.y, tx, ty, linger: B.PROBE_LINGER });
    state.events.push({ type: 'probe' }); return true;
  }
  if (tool.type === 'buoy') {
    if (ship.buoyStock <= 0) { state.events.push({ type: 'toolNotReady', tool: 'buoy' }); return false; }
    ship.buoyStock--;
    state.buoys.push({ id: state.nextId++, x: ship.x, y: ship.y, hp: B.BUOY_HP });
    state.events.push({ type: 'buoy' }); return true;
  }
  return false;
}

export function stepMap(state, dt) {
  const ship = state.ship;
  ship.pulseCool = Math.max(0, ship.pulseCool - dt);
  if (ship.pulse) { ship.pulse.t += dt; if (ship.pulse.t >= B.PULSE_TIME) ship.pulse = null; }
  if (ship.probeStock < B.PROBE_STOCK) { ship.probeRegen += dt; if (ship.probeRegen >= B.PROBE_REGEN) { ship.probeStock++; ship.probeRegen = 0; } }
  for (const p of state.probes) {
    const d = dist(p.x, p.y, p.tx, p.ty), stepLen = B.PROBE_SPEED * dt;
    if (d > stepLen) { const f = forward(headingTo(p.tx - p.x, p.ty - p.y)); p.x += f.x * stepLen; p.y += f.y * stepLen; }
    else { p.x = p.tx; p.y = p.ty; p.linger -= dt; }
  }
  state.probes = state.probes.filter((p) => p.linger > 0);
  // Pirates shoot down buoys they come close to.
  for (const b of state.buoys) for (const p of state.pirates) if (dist(b.x, b.y, p.x, p.y) < B.BUOY_DANGER) b.hp -= B.BUOY_DRAIN * dt;
  for (const b of state.buoys) if (b.hp <= 0) { state.fx.push({ type: 'boom', x: b.x, y: b.y, t: 0, dur: 0.5, size: 14 }); state.events.push({ type: 'buoyLost' }); }
  state.buoys = state.buoys.filter((b) => b.hp > 0);
  state.map.timer -= dt;
  if (state.map.timer <= 0) { state.map.timer = 0.2; reveal(state, visionSources(state)); }
}
