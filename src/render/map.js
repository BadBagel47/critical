// The shared map screen and the small map on the space HUD.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { MAP_N, visionSources, isVisible } from '../sim/map.js';
import { currentSector, jumpBlocked } from '../sim/sectors.js';
import { has } from '../sim/upgrades.js';
import { rect, label } from './draw.js';
import { ALIGN_COL } from './space.js';

export const MAP = { x: 12, y: 12, size: 336 };
const CELL = MAP.size / MAP_N, K = MAP.size / (B.MAP_HALF * 2), PX = 364;
const toMap = (wx, wy) => ({ x: MAP.x + (wx + B.MAP_HALF) * K, y: MAP.y + (wy + B.MAP_HALF) * K });
const SOURCE_COL = { ship: COL.captain, pulse: COL.ion[2], probe: COL.ion[1], buoy: COL.engineer, station: COL.engineer };

// World position under the mouse on the map screen, or null when outside the map.
export function mapPoint(mx, my) {
  if (mx < MAP.x || my < MAP.y || mx >= MAP.x + MAP.size || my >= MAP.y + MAP.size) return null;
  return { x: (mx - MAP.x) / K - B.MAP_HALF, y: (my - MAP.y) / K - B.MAP_HALF };
}
// The star chart rows in the side panel, one per sector that can be reached from here.
export function chartRows(state) {
  return currentSector(state).links.map((id, i) => ({ id, x: PX + 10, y: 126 + i * 30, w: VIEW_W - PX - 20, h: 27 }));
}
export function chartClick(state, mx, my) {
  const row = chartRows(state).find((r) => mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h);
  return row ? row.id : null;
}

function ring(ctx, x, y, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}
function diamond(ctx, x, y, r, color) {
  ctx.fillStyle = COL.out; ctx.beginPath(); ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
}
function stationIcon(ctx, x, y, color) { rect(ctx, x - 4, y - 4, 9, 9, color, COL.out); rect(ctx, x - 2, y - 2, 5, 5, COL.out); rect(ctx, x, y, 1, 1, color); }
const risk = (d) => 'BOARDING RISK  ' + ['', 'LOW', 'MEDIUM', 'HIGH'][d];

export function drawMap(ctx, state, view, assets) {
  const { font } = assets, ship = state.ship, seen = state.map.seen, sources = visionSources(state), sec = currentSector(state), scan = has(ship, 'tscan');
  ctx.fillStyle = '#0d0d18'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  rect(ctx, MAP.x - 1, MAP.y - 1, MAP.size + 2, MAP.size + 2, '#08080f', COL.line);
  for (let cy = 0; cy < MAP_N; cy++) for (let cx = 0; cx < MAP_N; cx++) {
    const x = MAP.x + cx * CELL, y = MAP.y + cy * CELL;
    if (seen[cy * MAP_N + cx]) { ctx.fillStyle = (cx + cy) % 2 ? '#141830' : '#12162c'; ctx.fillRect(x, y, CELL, CELL); }
    else if ((cx + cy) % 2) { ctx.fillStyle = '#0d0d17'; ctx.fillRect(x + 2, y + 2, 2, 2); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(MAP.x, MAP.y, MAP.size, MAP.size); ctx.clip();
  ctx.fillStyle = '#3b3840';
  for (const r of state.rocks) { const c = Math.floor((r.y + B.MAP_HALF) / B.MAP_CELL) * MAP_N + Math.floor((r.x + B.MAP_HALF) / B.MAP_CELL); if (seen[c]) { const p = toMap(r.x, r.y); ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); } }
  for (const s of sources) { const p = toMap(s.x, s.y); ring(ctx, p.x, p.y, s.r * K, SOURCE_COL[s.kind]); }
  for (const k of state.known) {
    const p = toMap(k.x, k.y);
    if (k.kind === 'station') {
      stationIcon(ctx, Math.round(p.x), Math.round(p.y), ALIGN_COL[k.align]);
      font.draw(ctx, k.name, p.x + 8, p.y - 8, ALIGN_COL[k.align]);
      font.draw(ctx, k.align === 'hostile' ? (scan ? risk(3) : 'HOSTILE') : k.shipyard ? 'SHIPYARD' : k.align.toUpperCase(), p.x + 8, p.y + 2, COL.dim);
    } else {
      rect(ctx, Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6, COL.ochre[2], COL.out);
      const w = state.wrecks.find((x) => x.id === k.id);
      font.draw(ctx, 'WRECK', p.x + 6, p.y - 3, COL.ochre[2]);
      if (scan && w) font.draw(ctx, risk(w.difficulty), p.x + 6, p.y + 7, COL.dim);
    }
  }
  for (const b of state.buoys) { const p = toMap(b.x, b.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 2, 3, 5, COL.engineer, COL.out); ctx.fillStyle = COL.engineer; ctx.fillRect(Math.round(p.x), Math.round(p.y) - 6, 1, 4); }
  for (const pr of state.probes) {
    const p = toMap(pr.x, pr.y), t = toMap(pr.tx, pr.ty);
    ctx.strokeStyle = COL.ion[0]; ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COL.ion[2]; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
  }
  let hostiles = 0;
  for (const p of state.pirates) if (isVisible(state, p.x, p.y, sources)) { const m = toMap(p.x, p.y); diamond(ctx, m.x, m.y, p.kind === 'cruiser' ? 6 : 3, COL.ember[1]); hostiles++; }
  const sp = toMap(ship.x, ship.y);
  ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(ship.heading);
  ctx.fillStyle = COL.out; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COL.captain; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3.5, 4); ctx.lineTo(-3.5, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  // Right-hand panel.
  rect(ctx, PX, 0, VIEW_W - PX, VIEW_H, COL.panel); rect(ctx, PX, 0, 1, VIEW_H, COL.line);
  font.draw(ctx, sec.name, PX + 12, 14, COL.text, { scale: 2 });
  font.draw(ctx, `SECTOR ${state.sector + 1} OF ${state.sectors.length}`, PX + 12, 34, COL.dim);
  const legend = [[COL.captain, 'YOU'], [COL.ochre[2], 'WRECK'], [COL.ember[1], 'PIRATE'], [COL.engineer, 'FRIENDLY'], [COL.steel[3], 'NEUTRAL'], [COL.ember[1], 'HOSTILE']];
  legend.forEach(([c, t], i) => { const x = PX + 12 + (i % 3) * 88, y = 52 + Math.floor(i / 3) * 13; rect(ctx, x, y, 6, 6, c, COL.out); font.draw(ctx, t, x + 10, y, COL.dim); });
  font.draw(ctx, 'THINGS THAT STAND STILL STAY AS LAST SEEN.', PX + 12, 82, COL.faint);
  font.draw(ctx, 'STAR CHARTS', PX + 12, 104, COL.text); font.draw(ctx, `JUMP COSTS ${B.JUMP_FUEL} FUEL`, VIEW_W - 12, 104, COL.dim, { align: 'r' });
  rect(ctx, PX + 12, 116, VIEW_W - PX - 24, 1, COL.line);
  const m = view.mouse;
  for (const r of chartRows(state)) {
    const to = state.sectors[r.id], charted = state.charts.includes(r.id), why = jumpBlocked(state, r.id), jumping = state.jump && state.jump.to === r.id;
    const over = m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
    rect(ctx, r.x, r.y, r.w, r.h, over && charted ? '#1c2140' : '#141420', jumping ? COL.ion[2] : over && charted ? COL.ion[0] : COL.line);
    font.draw(ctx, charted ? to.name : 'UNKNOWN SECTOR', r.x + 6, r.y + 4, charted ? COL.ion[2] : COL.dim);
    font.draw(ctx, jumping ? `JUMP IN ${Math.ceil(B.JUMP_CHARGE - state.jump.t)} S` : charted ? (why || 'CLICK TO JUMP') : 'NO CHART', r.x + r.w - 6, r.y + 4, jumping ? COL.ion[3] : charted && !why ? COL.ochre[2] : COL.faint, { align: 'r' });
    font.draw(ctx, charted ? to.hint : 'FIND OR BUY THE CHART', r.x + 6, r.y + 16, COL.dim);
  }
  font.draw(ctx, view.post === 'captain' ? 'THE CAPTAIN STARTS AND STOPS A JUMP HERE' : 'ONLY THE CAPTAIN (1) CAN START A JUMP', PX + 12, 222, view.post === 'captain' ? COL.captain : COL.faint);
  font.draw(ctx, 'ENGINEER TOOLS', PX + 12, 244, COL.text); rect(ctx, PX + 12, 256, VIEW_W - PX - 24, 1, COL.line);
  drawTools(ctx, font, state, PX + 12, 264, VIEW_W - PX - 24);
  const eng = view.post === 'engineer';
  font.draw(ctx, eng ? 'CLICK THE MAP TO SEND A PROBE' : 'TAKE THE ENGINEER POST (3) TO USE THE TOOLS', PX + 12, 310, eng ? COL.engineer : COL.faint);
  if (hostiles) label(ctx, font, PX + 12, 324, `${hostiles} ${hostiles === 1 ? 'PIRATE' : 'PIRATES'} IN SIGHT`, { fg: COL.ember[2], border: COL.ember[0] });
  font.draw(ctx, 'M  CLOSE', VIEW_W - 12, 344, COL.dim, { align: 'r' });
  if (eng && mapPoint(m.x, m.y)) { ctx.fillStyle = COL.ion[3]; for (const [dx, dy, w, h] of [[-6, 0, 3, 1], [4, 0, 3, 1], [0, -6, 1, 3], [0, 4, 1, 3]]) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h); }
}

// The three Engineer tools with their state. Shared by the map and the Engineer screen.
export function drawTools(ctx, font, state, x, y, w) {
  const ship = state.ship;
  const rows = [
    ['Q', 'SCANNER PULSE', ship.pulse ? 'ACTIVE' : ship.pulseCool > 0 ? Math.ceil(ship.pulseCool) + ' S' : 'READY', ship.pulse || ship.pulseCool <= 0],
    ['MAP', 'PROBES', ship.probeStock + ' LEFT', ship.probeStock > 0],
    ['B', 'RADAR BUOYS', ship.buoyStock + ' LEFT', ship.buoyStock > 0],
  ];
  rows.forEach(([key, name, status, ok], i) => {
    font.draw(ctx, name, x + 4, y + i * 14, COL.dim);
    font.draw(ctx, status, x + w - 34, y + i * 14, ok ? COL.ion[2] : COL.faint, { align: 'r' });
    font.draw(ctx, key, x + w, y + i * 14, COL.faint, { align: 'r' });
  });
}

// Small map of the area around the ship, for the space HUD.
export function drawMiniMap(ctx, state, x, y) {
  const ship = state.ship, size = 60, range = 1000, k = size / (range * 2), seen = state.map.seen, sources = visionSources(state);
  rect(ctx, x - 1, y - 1, size + 2, size + 2, '#08080f', COL.line);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  const c0x = Math.floor((ship.x - range + B.MAP_HALF) / B.MAP_CELL), c0y = Math.floor((ship.y - range + B.MAP_HALF) / B.MAP_CELL);
  for (let cy = c0y; cy <= c0y + 20; cy++) for (let cx = c0x; cx <= c0x + 20; cx++) {
    if (cx < 0 || cy < 0 || cx >= MAP_N || cy >= MAP_N || !seen[cy * MAP_N + cx]) continue;
    const wx = cx * B.MAP_CELL - B.MAP_HALF, wy = cy * B.MAP_CELL - B.MAP_HALF;
    ctx.fillStyle = '#141830'; ctx.fillRect(Math.floor(x + (wx - ship.x + range) * k), Math.floor(y + (wy - ship.y + range) * k), Math.ceil(B.MAP_CELL * k) + 1, Math.ceil(B.MAP_CELL * k) + 1);
  }
  const at = (wx, wy) => ({ x: x + (wx - ship.x + range) * k, y: y + (wy - ship.y + range) * k });
  ring(ctx, x + size / 2, y + size / 2, B.VISION_SHIP * k, COL.ion[0]);
  for (const kn of state.known) { const p = at(kn.x, kn.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 1, kn.kind === 'station' ? 4 : 3, kn.kind === 'station' ? 4 : 3, kn.kind === 'station' ? ALIGN_COL[kn.align] : COL.ochre[2]); }
  for (const b of state.buoys) { const p = at(b.x, b.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 3, COL.engineer); }
  for (const p of state.pirates) if (isVisible(state, p.x, p.y, sources)) { const mm = at(p.x, p.y); rect(ctx, Math.round(mm.x) - 1, Math.round(mm.y) - 1, 2, 2, COL.ember[1]); }
  ctx.restore();
  rect(ctx, x + size / 2 - 1, y + size / 2 - 1, 3, 3, COL.captain);
}
