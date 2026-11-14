// The shared map screen and the small map on the space HUD.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { MAP_N, visionSources, isVisible } from '../sim/map.js';
import { rect, label } from './draw.js';

export const MAP = { x: 12, y: 12, size: 336 };
const CELL = MAP.size / MAP_N, K = MAP.size / (B.MAP_HALF * 2);
const toMap = (wx, wy) => ({ x: MAP.x + (wx + B.MAP_HALF) * K, y: MAP.y + (wy + B.MAP_HALF) * K });
const SOURCE_COL = { ship: COL.captain, pulse: COL.ion[2], probe: COL.ion[1], buoy: COL.engineer };

// World position under the mouse on the map screen, or null when outside the map.
export function mapPoint(mx, my) {
  if (mx < MAP.x || my < MAP.y || mx >= MAP.x + MAP.size || my >= MAP.y + MAP.size) return null;
  return { x: (mx - MAP.x) / K - B.MAP_HALF, y: (my - MAP.y) / K - B.MAP_HALF };
}

function ring(ctx, x, y, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}
function diamond(ctx, x, y, r, color) {
  ctx.fillStyle = COL.out; ctx.beginPath(); ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
}

export function drawMap(ctx, state, view, assets) {
  const { font } = assets, ship = state.ship, seen = state.map.seen, sources = visionSources(state);
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
    const p = toMap(k.x, k.y); rect(ctx, Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6, COL.ochre[2], COL.out);
    font.draw(ctx, 'WRECK', p.x + 6, p.y - 3, COL.ochre[2]);
  }
  for (const b of state.buoys) { const p = toMap(b.x, b.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 2, 3, 5, COL.engineer, COL.out); ctx.fillStyle = COL.engineer; ctx.fillRect(Math.round(p.x), Math.round(p.y) - 6, 1, 4); }
  for (const pr of state.probes) {
    const p = toMap(pr.x, pr.y), t = toMap(pr.tx, pr.ty);
    ctx.strokeStyle = COL.ion[0]; ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COL.ion[2]; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
  }
  let hostiles = 0;
  for (const p of state.pirates) if (isVisible(state, p.x, p.y, sources)) { const m = toMap(p.x, p.y); diamond(ctx, m.x, m.y, 3, COL.ember[1]); hostiles++; }
  const sp = toMap(ship.x, ship.y);
  ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(ship.heading);
  ctx.fillStyle = COL.out; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COL.captain; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3.5, 4); ctx.lineTo(-3.5, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  // Right-hand panel.
  const px = 364;
  rect(ctx, px, 0, VIEW_W - px, VIEW_H, COL.panel); rect(ctx, px, 0, 1, VIEW_H, COL.line);
  font.draw(ctx, 'SECTOR MAP', px + 12, 30, COL.text); rect(ctx, px + 12, 42, VIEW_W - px - 24, 1, COL.line);
  const rows = [[COL.captain, 'YOUR SHIP'], [COL.ochre[2], 'WRECK, LAST SEEN'], [COL.ember[1], 'PIRATE, ONLY WHILE IN SIGHT'], [COL.engineer, 'RADAR BUOY'], [COL.ion[2], 'PROBE']];
  rows.forEach(([c, t], i) => { rect(ctx, px + 14, 54 + i * 14, 6, 6, c, COL.out); font.draw(ctx, t, px + 28, 54 + i * 14, COL.dim); });
  font.draw(ctx, 'DARK AREAS HAVE NOT BEEN SEEN YET.', px + 12, 130, COL.faint);
  font.draw(ctx, 'ENGINEER TOOLS', px + 12, 158, COL.text); rect(ctx, px + 12, 170, VIEW_W - px - 24, 1, COL.line);
  drawTools(ctx, font, state, px + 12, 180, VIEW_W - px - 24);
  const eng = view.post === 'engineer';
  font.draw(ctx, eng ? 'CLICK THE MAP TO SEND A PROBE' : 'TAKE THE ENGINEER POST (3) TO USE THE TOOLS', px + 12, 240, eng ? COL.engineer : COL.faint);
  if (hostiles) label(ctx, font, px + 12, 270, `${hostiles} ${hostiles === 1 ? 'PIRATE' : 'PIRATES'} IN SIGHT`, { fg: COL.ember[2], border: COL.ember[0] });
  font.draw(ctx, 'M  CLOSE THE MAP', px + 12, 340, COL.dim);
  if (eng) { const m = view.mouse; if (mapPoint(m.x, m.y)) { ctx.fillStyle = COL.ion[3]; for (const [dx, dy, w, h] of [[-6, 0, 3, 1], [4, 0, 3, 1], [0, -6, 1, 3], [0, 4, 1, 3]]) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h); } }
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
  for (const kn of state.known) { const p = at(kn.x, kn.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3, COL.ochre[2]); }
  for (const b of state.buoys) { const p = at(b.x, b.y); rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 3, COL.engineer); }
  for (const p of state.pirates) if (isVisible(state, p.x, p.y, sources)) { const m = at(p.x, p.y); rect(ctx, Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 2, COL.ember[1]); }
  ctx.restore();
  rect(ctx, x + size / 2 - 1, y + size / 2 - 1, 3, 3, COL.captain);
}
