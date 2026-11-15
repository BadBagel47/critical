// The shared map screen and the small map on the space HUD.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { visionSources, isVisible } from '../sim/map.js';
import { currentSector, jumpBlocked } from '../sim/sectors.js';
import { playerById } from '../sim/players.js';
import { has, jumpCharge, jumpFuel } from '../sim/upgrades.js';
import { rect, label } from './draw.js';
import { THING_LOOK, lookOf, SIDE_COL, MOOD_COL } from './looks.js';
import { CREW, FACTIONS, enemies, moodOf, standingOf } from '../sim/sides.js';

export const MAP = { x: 12, y: 12, size: 336 };
// The map is drawn to fit the system the ship is in: `HALF` is how far it reaches from the middle, and `K` how
// many pixels on the screen one step in space is.
let HALF = B.SYSTEM_R[2] + B.MAP_MARGIN;
let K = MAP.size / (HALF * 2);
function fit(state) {
  HALF = currentSector(state).radius + B.MAP_MARGIN;
  K = MAP.size / (HALF * 2);
}
// The panel to the right of the map.
const PX = 364;
const PW = VIEW_W - PX;
const toMap = (wx, wy) => ({ x: MAP.x + (wx + HALF) * K, y: MAP.y + (wy + HALF) * K });
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
export function mapPoint(state, mx, my) {
  if (mx < MAP.x || my < MAP.y || mx >= MAP.x + MAP.size || my >= MAP.y + MAP.size) return null;
  fit(state);
  return { x: (mx - MAP.x) / K - HALF, y: (my - MAP.y) / K - HALF };
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

// The system itself: a round patch of space that fades into the haze at its edge, with the star in the middle
// and a ring where its heat begins. Once the system has been scanned the belt of asteroids is marked too.
function drawSystem(ctx, state) {
  const mid = toMap(0, 0);
  const radius = currentSector(state).radius;
  const out = currentSector(state).haze ? (radius + B.HAZE_DEPTH) * K : radius * K;
  const g = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, out);
  const edge = (radius * K) / out;
  g.addColorStop(0, '#12162c');
  g.addColorStop(edge * 0.96, '#12162c');
  if (edge < 1) {
    g.addColorStop(edge + (1 - edge) * 0.4, '#262431');
    g.addColorStop(1, '#0c0c14');
  } else g.addColorStop(1, '#12162c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, out, 0, 7);
  ctx.fill();
  const field = state.field;
  if (state.map.scanned && field && field.belt) {
    ctx.strokeStyle = 'rgba(140,136,150,0.13)';
    ctx.lineWidth = (field.belt[1] - field.belt[0]) * K;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, ((field.belt[0] + field.belt[1]) / 2) * K, 0, 7);
    ctx.stroke();
  }
  if (!currentSector(state).star) return;
  ring(ctx, mid.x, mid.y, B.STAR_BURN * K, COL.ember[0]);
  ctx.fillStyle = COL.ember[2];
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, Math.max(3, B.STAR_R * K), 0, 7);
  ctx.fill();
  ctx.fillStyle = COL.ochre[3];
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, Math.max(2, B.STAR_R * K * 0.6), 0, 7);
  ctx.fill();
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
// The texts beside the marks on the map. Each is put where nothing else is: to the right of its mark if that
// is free, otherwise to the left, below or above it. `labels` are { p, reach, lines }. `own` is where the
// crew's ship is, which no text should cover.
const LINE = 10;
function placeLabels(ctx, font, labels, own) {
  const taken = [{ p: own, reach: 6 }, ...labels].map((l) => ({
    x: l.p.x - l.reach,
    y: l.p.y - l.reach,
    w: l.reach * 2,
    h: l.reach * 2,
  }));
  for (const l of labels) {
    const w = Math.max(...l.lines.map(([text]) => font.width(text)));
    const h = l.lines.length * LINE;
    const gap = l.reach + 3;
    const right = l.p.x + gap,
      left = l.p.x - gap - w,
      level = l.p.y - h / 2 + 2,
      below = l.p.y + gap,
      above = l.p.y - gap - h;
    const mid = l.p.x - w / 2;
    const spots = [
      [right, level],
      [left, level],
      [right, below],
      [right, above],
      [left, below],
      [left, above],
      [mid, below],
      [mid, above],
      [mid, below + LINE],
      [mid, above - LINE],
    ];
    // How much of a text at this spot would lie over something else, or outside the map.
    const clash = (x, y) => {
      const out = x < MAP.x || y < MAP.y || x + w > MAP.x + MAP.size || y + h > MAP.y + MAP.size;
      let area = out ? w * h : 0;
      for (const t of taken) {
        const ox = Math.min(x + w, t.x + t.w) - Math.max(x, t.x),
          oy = Math.min(y + h, t.y + t.h) - Math.max(y, t.y);
        if (ox > 0 && oy > 0) area += ox * oy;
      }
      return area;
    };
    // The first spot that is free, or else the one where the least is covered.
    let best = spots[0];
    for (const spot of spots) if (clash(spot[0], spot[1]) < clash(best[0], best[1])) best = spot;
    const x = best[0],
      y = best[1];
    taken.push({ x, y, w, h });
    l.lines.forEach(([text, color], i) => font.draw(ctx, text, x, y + i * LINE, color));
  }
}

function drawMapContents(ctx, font, state, sources) {
  const env = { state, scan: has(state.ship, 'tscan') };
  // Asteroids are on the map where someone can see them, and everywhere once the system has been scanned.
  const scanned = state.map.scanned;
  for (const t of state.things) {
    if (t.kind !== 'rock') continue;
    const inSight = isVisible(state, t.x, t.y, sources);
    if (!scanned && !inSight) continue;
    ctx.fillStyle = inSight ? '#9a96a4' : '#5c5868';
    const p = toMap(t.x, t.y);
    const size = t.variant === 1 ? 1 : 2;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
  }
  for (const s of sources) {
    const p = toMap(s.x, s.y);
    ring(ctx, p.x, p.y, s.r * K, SOURCE_COL[s.kind]);
  }
  const labels = [];
  for (const k of state.known) {
    const look = THING_LOOK[k.kind];
    if (!look || !look.mark) continue;
    const p = toMap(k.x, k.y);
    const raided = state.raid && state.raid.station === k.id;
    if (raided) {
      ctx.strokeStyle = COL.ochre[3];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 + ((state.time * 12) % 12), 0, 7);
      ctx.stroke();
    }
    const text = look.mark(ctx, font, k, p, env);
    if (raided) text.lines.push(['DISTRESS CALL', COL.ochre[3]]);
    labels.push({ p, ...text });
  }
  // Stations get their place first, since their names matter most.
  labels.sort((a, b) => b.lines.length - a.lines.length);
  placeLabels(ctx, font, labels, toMap(state.ship.x, state.ship.y));
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
  // Enemies are marked in red, and everyone else in the colour of their side.
  let hostiles = 0;
  for (const v of state.vessels) {
    if (!isVisible(state, v.x, v.y, sources)) continue;
    const p = toMap(v.x, v.y);
    const foe = enemies(state, v.side, CREW);
    diamond(ctx, p.x, p.y, lookOf(v).mapSize, foe ? COL.ember[1] : SIDE_COL[v.side] || COL.steel[3]);
    if (foe) hostiles++;
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
  // What each faction thinks of the crew: the name in the colour of its mood, and the standing as a number.
  let fx = left;
  for (const side of Object.keys(FACTIONS)) {
    const text = `${FACTIONS[side].short} ${Math.round(standingOf(state, side))}`;
    fx += font.draw(ctx, text, fx, 82, MOOD_COL[moodOf(state, side)]) + 12;
  }
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
    const text = `${hostiles} ${hostiles === 1 ? 'HOSTILE' : 'HOSTILES'} IN SIGHT`;
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
  fit(state);
  drawSystem(ctx, state);
  ctx.save();
  ctx.beginPath();
  ctx.rect(MAP.x, MAP.y, MAP.size, MAP.size);
  ctx.clip();
  const hostiles = drawMapContents(ctx, font, state, sources);
  ctx.restore();
  drawSidePanel(ctx, font, state, post, m, hostiles);
  if (post === 'engineer' && mapPoint(state, m.x, m.y)) {
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
  ring(ctx, x + size / 2, y + size / 2, B.VISION_SHIP * k, COL.ion[0]);
  if (currentSector(state).star) dot(0, 0, 4, 4, COL.ember[2]);
  for (const known of state.known) {
    const look = THING_LOOK[known.kind];
    if (look && look.dot) dot(known.x, known.y, look.dot.size, look.dot.size, look.dot.color(known));
  }
  for (const b of state.things) if (b.kind === 'buoy') dot(b.x, b.y, 2, 3, COL.engineer);
  for (const v of state.vessels) {
    if (!isVisible(state, v.x, v.y, sources)) continue;
    dot(v.x, v.y, 2, 2, enemies(state, v.side, CREW) ? COL.ember[1] : SIDE_COL[v.side] || COL.steel[3]);
  }
  ctx.restore();
  rect(ctx, x + size / 2 - 1, y + size / 2 - 1, 3, 3, COL.captain);
}
