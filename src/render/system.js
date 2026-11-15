// What a system looks like from inside it: the star in its middle and the haze of dust and ice at its edge.
// Both are drawn in the coordinates of space, see sim/system.js for what they do.
import { VIEW_W, VIEW_H, ZOOM, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { systemRadius } from '../sim/system.js';
import { TAU } from '../sim/util.js';

// The body of the star, from the outside in: how far out each band reaches, and its colour.
/** @type {[number, string][]} */
const BANDS = [
  [1, COL.ember[0]],
  [0.92, COL.ember[1]],
  [0.8, COL.ember[2]],
  [0.64, COL.ochre[3]],
  [0.44, '#fff6dc'],
];
const GLOW = B.STAR_BURN * 1.9;

// The star. Its edge waves slowly, and its glow reaches about as far as its heat does harm.
export function drawStar(ctx, cam, time) {
  const reach = GLOW + Math.hypot(VIEW_W, VIEW_H) / 2 / ZOOM;
  if (Math.hypot(cam.x, cam.y) > reach) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, B.STAR_R * 0.6, 0, 0, GLOW);
  g.addColorStop(0, 'rgba(255,170,90,0.5)');
  g.addColorStop(0.3, 'rgba(240,120,60,0.2)');
  g.addColorStop(1, 'rgba(200,80,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, GLOW, 0, TAU);
  ctx.fill();
  ctx.restore();
  for (const [k, color] of BANDS) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * TAU;
      const wave = 0.035 * Math.sin(a * 5 + time * 0.5 + k * 7) + 0.02 * Math.sin(a * 9 - time * 0.33 + k * 3);
      const r = B.STAR_R * k * (1 + wave);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  // A thin ring where the heat begins to do harm.
  ctx.strokeStyle = 'rgba(240,154,90,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, B.STAR_BURN, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

const hash = (x, y, k) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const CELL = 44;
const START = 90;

// The haze at the edge of the system. It thickens little by little, with no line where it begins, and specks of
// ice and dust drift in it.
export function drawHaze(ctx, state, cam, time) {
  if (!state.sectors[state.sector].haze) return;
  const radius = systemRadius(state);
  const w = VIEW_W / 2 / ZOOM + CELL,
    h = VIEW_H / 2 / ZOOM + CELL;
  if (Math.hypot(Math.abs(cam.x) + w, Math.abs(cam.y) + h) < radius - START) return;
  const g = ctx.createRadialGradient(0, 0, radius - START, 0, 0, radius + B.HAZE_DEPTH);
  g.addColorStop(0, 'rgba(62,58,78,0)');
  g.addColorStop(0.3, 'rgba(62,58,78,0.34)');
  g.addColorStop(0.65, 'rgba(52,49,66,0.72)');
  g.addColorStop(1, 'rgba(40,38,52,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(cam.x - w, cam.y - h, w * 2, h * 2);
  const x0 = Math.floor((cam.x - w) / CELL),
    x1 = Math.ceil((cam.x + w) / CELL);
  const y0 = Math.floor((cam.y - h) / CELL),
    y1 = Math.ceil((cam.y + h) / CELL);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const drift = Math.sin(time * 0.15 + hash(cx, cy, 5) * 6) * 6;
      const x = (cx + hash(cx, cy, 1)) * CELL + drift,
        y = (cy + hash(cx, cy, 2)) * CELL + drift * 0.6;
      const depth = (Math.hypot(x, y) - (radius - START)) / (B.HAZE_DEPTH + START);
      if (depth <= 0) continue;
      const ice = hash(cx, cy, 3) > 0.6;
      ctx.globalAlpha = Math.min(1, depth * 1.5) * (0.3 + 0.6 * hash(cx, cy, 4));
      ctx.fillStyle = ice ? '#c4cee0' : '#8d8794';
      const size = hash(cx, cy, 6) > 0.8 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
  }
  ctx.globalAlpha = 1;
}
