// The shared map screen and the small map on the space HUD.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { MAP_N, cellOf, visionSources, isVisible } from '../sim/map.js';
import { currentSector, jumpBlocked } from '../sim/sectors.js';
import { playerById } from '../sim/players.js';
import { has, jumpCharge, jumpFuel } from '../sim/upgrades.js';
import { rect, label } from './draw.js';
import { THING_LOOK, lookOf } from './looks.js';

export const MAP = { x: 12, y: 12, size: 336 };
const CELL = MAP.size / MAP_N;
const K = MAP.size / (B.MAP_HALF * 2);
// The panel to the right of the map.
const PX = 364;
const PW = VIEW_W - PX;
const toMap = (wx, wy) => ({ x: MAP.x + (wx + B.MAP_HALF) * K, y: MAP.y + (wy + B.MAP_HALF) * K });
const SOURCE_COL = {
  ship: COL.captain,
  pulse: COL.ion[2],
  probe: COL.ion[1],
  buoy: COL.engineer,
  station: COL.engineer,
};
const LEGEND = [
  [COL.captain, 'YOU'],
  [COL.ochre[2], 'WRECK'],
  [COL.ember[1], 'PIRATE'],
  [COL.engineer, 'FRIENDLY'],
  [COL.steel[3], 'NEUTRAL'],
  [COL.ember[1], 'HOSTILE'],
];
const CROSSHAIR = [
  [-6, 0, 3, 1],
  [4, 0, 3, 1],
  [0, -6, 1, 3],
  [0, 4, 1, 3],
];
const over = (m, r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;

// World position under the mouse on the map screen, or null when outside the map.
export function mapPoint(mx, my) {
  if (mx < MAP.x || my < MAP.y || mx >= MAP.x + MAP.size || my >= MAP.y + MAP.size) return null;
  return { x: (mx - MAP.x) / K - B.MAP_HALF, y: (my - MAP.y) / K - B.MAP_HALF };
}
// The star chart rows in the side panel, one per sector that can be reached from here.
export function chartRows(state) {
  return currentSector(state).links.map((id, i) => ({ id, x: PX + 10, y: 126 + i * 30, w: PW - 20, h: 27 }));
}
export function chartClick(state, mx, my) {
  const row = chartRows(state).find((r) => over({ x: mx, y: my }, r));
  return row ? row.id : null;
}

// Everything that can be clicked on the map screen, by name. Used by the browser test.
export function mapButtons(state) {
  const charts = chartRows(state).map((r) => ({ name: 'chart.' + r.id, x: r.x, y: r.y, w: r.w, h: r.h }));
  return [{ name: 'map', x: MAP.x, y: MAP.y, w: MAP.size, h: MAP.size }, ...charts];
}

function ring(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.stroke();
  ctx.setLineDash([]);
}
function diamond(ctx, x, y, r, color) {
  const shape = (size) => {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = COL.out;
  shape(r + 1);
  ctx.fillStyle = color;
  shape(r);
}

// Seen cells are lit, unseen ones only show a faint grid.
function drawFog(ctx, seen) {
  for (let cy = 0; cy < MAP_N; cy++) {
    for (let cx = 0; cx < MAP_N; cx++) {
      const x = MAP.x + cx * CELL;
      const y = MAP.y + cy * CELL;
      if (seen[cy * MAP_N + cx]) {
        ctx.fillStyle = (cx + cy) % 2 ? '#141830' : '#12162c';
        ctx.fillRect(x, y, CELL, CELL);
      } else if ((cx + cy) % 2) {
        ctx.fillStyle = '#0d0d17';
        ctx.fillRect(x + 2, y + 2, 2, 2);
      }
    }
  }
}

function drawOwnShip(ctx, ship) {
  const p = toMap(ship.x, ship.y);
  const arrow = (nose, half, tail) => {
    ctx.beginPath();
    ctx.moveTo(0, -nose);
    ctx.lineTo(half, tail);
    ctx.lineTo(-half, tail);
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ship.heading);
  ctx.fillStyle = COL.out;
  arrow(7, 5, 5);
  ctx.fillStyle = COL.captain;
  arrow(5, 3.5, 4);
  ctx.restore();
}

// Everything inside the map square. Returns how many hostile ships are in sight.
function drawMapContents(ctx, font, state, sources) {
  const seen = state.map.seen;
  const env = { state, scan: has(state.ship, 'tscan') };
  ctx.fillStyle = '#3b3840';
  for (const t of state.things) {
    if (t.kind !== 'rock' || !seen[cellOf(t.y) * MAP_N + cellOf(t.x)]) continue;
    const p = toMap(t.x, t.y);
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  for (const s of sources) {
    const p = toMap(s.x, s.y);
    ring(ctx, p.x, p.y, s.r * K, SOURCE_COL[s.kind]);
  }
  for (const k of state.known) {
    const look = THING_LOOK[k.kind];
    if (!look || !look.mark) continue;
    const p = toMap(k.x, k.y);
    if (state.raid && state.raid.station === k.id) {
      ctx.strokeStyle = COL.ochre[3];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 + ((state.time * 12) % 12), 0, 7);
      ctx.stroke();
      font.draw(ctx, 'DISTRESS CALL', p.x + 8, p.y + 12, COL.ochre[3]);
    }
    look.mark(ctx, font, k, p, env);
  }
  for (const b of state.things) {
    if (b.kind !== 'buoy') continue;
    const p = toMap(b.x, b.y);
    rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 2, 3, 5, COL.engineer, COL.out);
    ctx.fillStyle = COL.engineer;
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - 6, 1, 4);
  }
  for (const probe of state.probes) {
    const p = toMap(probe.x, probe.y);
    const target = toMap(probe.tx, probe.ty);
    ctx.strokeStyle = COL.ion[0];
    ctx.setLineDash([1, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.ion[2];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, 7);
    ctx.fill();
  }
  // Other ships show only while something sees them.
  let hostiles = 0;
  for (const v of state.vessels) {
    if (!isVisible(state, v.x, v.y, sources)) continue;
    const p = toMap(v.x, v.y);
    diamond(ctx, p.x, p.y, lookOf(v).mapSize, COL.ember[1]);
    hostiles++;
  }
  drawOwnShip(ctx, state.ship);
  return hostiles;
}

function drawChartRow(ctx, font, state, row, mouse) {
  const ship = state.ship;
  const to = state.sectors[row.id];
  const charted = state.charts.includes(row.id);
  const why = jumpBlocked(state, row.id);
  const jumping = state.jump && state.jump.to === row.id;
  const lit = over(mouse, row) && charted;
  rect(
    ctx,
    row.x,
    row.y,
    row.w,
    row.h,
    lit ? '#1c2140' : '#141420',
    jumping ? COL.ion[2] : lit ? COL.ion[0] : COL.line,
  );
  font.draw(ctx, charted ? to.name : 'UNKNOWN SECTOR', row.x + 6, row.y + 4, charted ? COL.ion[2] : COL.dim);
  let status = 'NO CHART';
  let color = COL.faint;
  if (jumping) {
    status = `JUMP IN ${Math.ceil(jumpCharge(ship) - state.jump.t)} S`;
    color = COL.ion[3];
  } else if (charted) {
    status = why || 'CLICK TO JUMP';
    if (!why) color = COL.ochre[2];
  }
  font.draw(ctx, status, row.x + row.w - 6, row.y + 4, color, { align: 'r' });
  font.draw(ctx, charted ? to.hint : 'FIND OR BUY THE CHART', row.x + 6, row.y + 16, COL.dim);
}

function drawSidePanel(ctx, font, state, post, mouse, hostiles) {
  const ship = state.ship;
  const sec = currentSector(state);
  const left = PX + 12;
  rect(ctx, PX, 0, PW, VIEW_H, COL.panel);
  rect(ctx, PX, 0, 1, VIEW_H, COL.line);
  font.draw(ctx, sec.name, left, 14, COL.text, { scale: 2 });
  font.draw(ctx, `SECTOR ${state.sector + 1} OF ${state.sectors.length}`, left, 34, COL.dim);
  LEGEND.forEach(([color, text], i) => {
    const x = left + (i % 3) * 88;
    const y = 52 + Math.floor(i / 3) * 13;
    rect(ctx, x, y, 6, 6, color, COL.out);
    font.draw(ctx, text, x + 10, y, COL.dim);
  });
  font.draw(ctx, 'THINGS THAT STAND STILL STAY AS LAST SEEN.', left, 82, COL.faint);
  font.draw(ctx, 'STAR CHARTS', left, 104, COL.text);
  font.draw(ctx, `JUMP COSTS ${jumpFuel(ship)} FUEL`, VIEW_W - 12, 104, COL.dim, { align: 'r' });
  rect(ctx, left, 116, PW - 24, 1, COL.line);
  for (const row of chartRows(state)) drawChartRow(ctx, font, state, row, mouse);
  const captain = post === 'captain';
  const jumpNote = captain ? 'THE CAPTAIN STARTS AND STOPS A JUMP HERE' : 'ONLY THE CAPTAIN (1) CAN START A JUMP';
  font.draw(ctx, jumpNote, left, 222, captain ? COL.captain : COL.faint);
  font.draw(ctx, 'ENGINEER TOOLS', left, 244, COL.text);
  rect(ctx, left, 256, PW - 24, 1, COL.line);
  drawTools(ctx, font, state, left, 264, PW - 24);
  const engineer = post === 'engineer';
  const toolNote = engineer ? 'CLICK THE MAP TO SEND A PROBE' : 'TAKE THE ENGINEER POST (3) TO USE THE TOOLS';
  font.draw(ctx, toolNote, left, 310, engineer ? COL.engineer : COL.faint);
  if (hostiles) {
    const text = `${hostiles} ${hostiles === 1 ? 'PIRATE' : 'PIRATES'} IN SIGHT`;
    label(ctx, font, left, 324, text, { fg: COL.ember[2], border: COL.ember[0] });
  }
  font.draw(ctx, 'M  CLOSE', VIEW_W - 12, 344, COL.dim, { align: 'r' });
}

export function drawMap(ctx, state, view, assets) {
  const { font } = assets;
  const post = playerById(state, view.playerId).post;
  const sources = visionSources(state);
  const m = view.mouse;
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  rect(ctx, MAP.x - 1, MAP.y - 1, MAP.size + 2, MAP.size + 2, '#08080f', COL.line);
  drawFog(ctx, state.map.seen);
  ctx.save();
  ctx.beginPath();
  ctx.rect(MAP.x, MAP.y, MAP.size, MAP.size);
  ctx.clip();
  const hostiles = drawMapContents(ctx, font, state, sources);
  ctx.restore();
  drawSidePanel(ctx, font, state, post, m, hostiles);
  if (post === 'engineer' && mapPoint(m.x, m.y)) {
    ctx.fillStyle = COL.ion[3];
    for (const [dx, dy, w, h] of CROSSHAIR) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h);
  }
}

// The three Engineer tools with their state. Shared by the map and the Engineer screen.
export function drawTools(ctx, font, state, x, y, w) {
  const ship = state.ship;
  const pulse = ship.pulse ? 'ACTIVE' : ship.pulseCool > 0 ? Math.ceil(ship.pulseCool) + ' S' : 'READY';
  const rows = [
    ['Q', 'SCANNER PULSE', pulse, ship.pulse || ship.pulseCool <= 0],
    ['MAP', 'PROBES', ship.probeStock + ' LEFT', ship.probeStock > 0],
    ['B', 'RADAR BUOYS', ship.buoyStock + ' LEFT', ship.buoyStock > 0],
  ];
  rows.forEach(([key, name, status, ready], i) => {
    font.draw(ctx, name, x + 4, y + i * 14, COL.dim);
    font.draw(ctx, status, x + w - 34, y + i * 14, ready ? COL.ion[2] : COL.faint, { align: 'r' });
    font.draw(ctx, key, x + w, y + i * 14, COL.faint, { align: 'r' });
  });
}

// Small map of the area around the ship, for the space HUD.
export function drawMiniMap(ctx, state, x, y) {
  const ship = state.ship;
  const size = 60;
  const range = 1000;
  const k = size / (range * 2);
  const seen = state.map.seen;
  const sources = visionSources(state);
  const at = (wx, wy) => ({ x: x + (wx - ship.x + range) * k, y: y + (wy - ship.y + range) * k });
  const dot = (wx, wy, w, h, color) => {
    const p = at(wx, wy);
    rect(ctx, Math.round(p.x) - 1, Math.round(p.y) - 1, w, h, color);
  };
  rect(ctx, x - 1, y - 1, size + 2, size + 2, '#08080f', COL.line);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  const cellSize = Math.ceil(B.MAP_CELL * k) + 1;
  const c0x = cellOf(ship.x - range);
  const c0y = cellOf(ship.y - range);
  ctx.fillStyle = '#141830';
  for (let cy = c0y; cy <= c0y + 20; cy++) {
    for (let cx = c0x; cx <= c0x + 20; cx++) {
      if (cx < 0 || cy < 0 || cx >= MAP_N || cy >= MAP_N || !seen[cy * MAP_N + cx]) continue;
      const p = at(cx * B.MAP_CELL - B.MAP_HALF, cy * B.MAP_CELL - B.MAP_HALF);
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), cellSize, cellSize);
    }
  }
  ring(ctx, x + size / 2, y + size / 2, B.VISION_SHIP * k, COL.ion[0]);
  for (const known of state.known) {
    const look = THING_LOOK[known.kind];
    if (look && look.dot) dot(known.x, known.y, look.dot.size, look.dot.size, look.dot.color(known));
  }
  for (const b of state.things) if (b.kind === 'buoy') dot(b.x, b.y, 2, 3, COL.engineer);
  for (const v of state.vessels) if (isVisible(state, v.x, v.y, sources)) dot(v.x, v.y, 2, 2, COL.ember[1]);
  ctx.restore();
  rect(ctx, x + size / 2 - 1, y + size / 2 - 1, 3, 3, COL.captain);
}
