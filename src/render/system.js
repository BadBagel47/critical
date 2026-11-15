// What a system looks like from inside it: the star in its middle and the haze of dust and ice at its edge.
// Both are drawn in the coordinates of space, see sim/system.js for what they do.
import { VIEW_W, VIEW_H, ZOOM } from '../config.js';
import { B } from '../sim/balance.js';
import { systemRadius } from '../sim/system.js';
import { TAU } from '../sim/util.js';

// ---------- the star ----------
// The star is worked out one pixel at a time, in the few colours and the fixed dither pattern that the ships
// are drawn with: a surface that is brightest in the middle, with grains that move and spots that drift, a
// crown of rays, and arcs of fire that rise and sink at its edge. That is a lot of work, so a new picture is
// worked out a little at a time over several frames, and shown when it is whole. It was tried out first in
// docs/design/prototypes/star.html, which has the same code.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// From the dark edge of the surface to its white heart, the glow outside it from faint to strong, and the
// light it throws on what is near.
const KINDS = {
  yellow: {
    surface: ['#7a2a1c', '#a83c1e', '#d0563a', '#f09a5a', '#f6c458', '#f2d27a', '#fff0b4', '#fffbe6'].map(rgb),
    glow: ['#2a1210', '#4a1a14', '#7a2a1c', '#b04424', '#e07a3c'].map(rgb),
    spark: '#ffd08a',
    light: '255,196,128',
  },
};
// How much of what is behind the glow still shows through each of its colours.
const GLOW_ALPHA = [120, 150, 180, 205, 230];

function grid(x, y, z) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, z) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  let u = x - xi,
    v = y - yi,
    w = z - zi;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  w = w * w * (3 - 2 * w);
  const a = grid(xi, yi, zi),
    b = grid(xi + 1, yi, zi),
    c = grid(xi, yi + 1, zi),
    d = grid(xi + 1, yi + 1, zi);
  const e = grid(xi, yi, zi + 1),
    f = grid(xi + 1, yi, zi + 1),
    g = grid(xi, yi + 1, zi + 1),
    h = grid(xi + 1, yi + 1, zi + 1);
  const near = a + (b - a) * u + (c + (d - c) * u - a - (b - a) * u) * v;
  const far = e + (f - e) * u + (g + (h - g) * u - e - (f - e) * u) * v;
  return near + (far - near) * w;
}
const fbm = (x, y, z) =>
  noise(x, y, z) * 0.6 + noise(x * 2.1, y * 2.1, z * 1.7) * 0.28 + noise(x * 4.3, y * 4.3, z * 2.9) * 0.12;
const fbm2 = (x, y, z) => noise(x, y, z) * 0.68 + noise(x * 2.3, y * 2.3, z * 1.9) * 0.32;
// Ordered dither: which of two neighbouring colours a pixel gets depends on where it is, in a fixed pattern.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// The star on the screen: its radius in pixels of the screen, and how far its picture reaches.
const SIZE = B.STAR_R * ZOOM;
const REACH = Math.ceil(SIZE * 2.6);
const SIDE = REACH * 2;
// The edge of the surface for each direction, and how fast the glow fades for each direction and distance.
// Both change slowly from place to place, so they are worked out for a few thousand places and looked up.
const EDGE = new Float32Array(720);
const TURNS = 360,
  STEPS = 14,
  FAR = 1.7;
const RAYS = new Float32Array(TURNS * STEPS);

// The arcs of fire: each rises and sinks at a place of its own, and then moves on.
function arcsAt(t, seed) {
  const list = [];
  for (let k = 0; k < 4; k++) {
    const span = 14 + k * 3;
    const turn = Math.floor(t / span + k * 0.37);
    const life = (t / span + k * 0.37) % 1;
    list.push({
      at: grid(k, turn, seed) * TAU - Math.PI,
      wide: 0.13 + grid(k, turn, seed + 1) * 0.1,
      high: (0.1 + grid(k, turn, seed + 2) * 0.13) * Math.sin(life * Math.PI) ** 0.7,
    });
  }
  return list;
}

// The picture that is shown, and the one that is being worked out.
let shown = null;
let work = null;
let pass = null;

// Begin a new picture of the star as it is at time t.
function begin(t, seed) {
  for (let k = 0; k < 720; k++) {
    const a = (k / 720) * TAU;
    EDGE[k] = 1 + 0.036 * (noise(Math.cos(a) * 2.2 + 9, Math.sin(a) * 2.2, t * 0.12 + seed) - 0.5);
  }
  for (let k = 0; k < TURNS; k++) {
    const a = (k / TURNS) * TAU - Math.PI;
    for (let n = 0; n < STEPS; n++) {
      const out = (n / (STEPS - 1)) * FAR;
      const ray = fbm2(Math.cos(a) * 2.6 + 5 + seed, Math.sin(a) * 2.6, t * 0.05 + out * 0.5);
      RAYS[k * STEPS + n] = 1.05 + 5.2 * (1 - ray) ** 1.5;
    }
  }
  const bumps = arcsAt(t, seed);
  work.data.fill(0);
  pass = { t, seed, row: 0, bumps, high: bumps.reduce((most, b) => Math.max(most, b.high), 0) };
}

// Work out one row of the picture.
function paintRow(y, kind) {
  const { surface, glow } = kind;
  const { t, seed, bumps, high } = pass;
  const data = work.data;
  const grain = 5 / SIZE;
  const dy = y - REACH;
  for (let x = 0; x < SIDE; x++) {
    const dx = x - REACH;
    const d = Math.hypot(dx, dy);
    if (d > REACH) continue;
    const r = d / SIZE;
    const a = Math.atan2(dy, dx);
    const edge = EDGE[Math.floor(((a + Math.PI) / TAU) * 719.99)];
    const i = (y * SIDE + x) * 4;
    const th = BAYER[(y & 3) * 4 + (x & 3)];
    let c = null;
    let alpha = 255;
    if (r < edge) {
      // The surface: brightest in the middle, darker toward the edge, with grains that move and spots that drift.
      const mu = Math.sqrt(1 - (r / edge) ** 2);
      let v = 0.12 + 0.62 * mu ** 0.6;
      v += (fbm(dx * grain + 40, dy * grain, t * 0.22 + seed) - 0.5) * 0.62 * (0.35 + 0.65 * mu);
      const spot = noise(dx * grain * 0.3 + t * 0.012 + seed, dy * grain * 0.3 + 20, t * 0.02);
      if (spot > 0.68) v -= (spot - 0.68) * 2.4 * mu;
      c = surface[Math.max(0, Math.min(surface.length - 1, Math.floor(v * (surface.length - 1) + th)))];
    } else {
      // An arc of fire is a loop that stands on the edge: a band of flame with dimmer fire under its top.
      let flame = 0;
      for (let k = 0; r < edge + high && k < bumps.length; k++) {
        const b = bumps[k];
        let turn = a - b.at;
        if (turn > Math.PI) turn -= TAU;
        else if (turn < -Math.PI) turn += TAU;
        const off = Math.abs(turn) / b.wide;
        if (off >= 1) continue;
        const top = b.high * Math.sqrt(1 - off * off);
        const up = r - edge;
        if (up > top) continue;
        const thick = Math.max(0.028, b.high * 0.3);
        const band = up > top - thick || off > 0.72;
        flame = Math.max(flame, band ? 1 - (up / Math.max(top, 0.001)) * 0.55 : 0.34);
      }
      if (flame > 0) c = surface[Math.max(1, Math.min(5, Math.floor(flame * 4.4 + th)))];
      else {
        // The glow outside reaches out in rays that turn slowly, and ends in nothing well inside the picture.
        const out = r - edge;
        const k = Math.min(TURNS - 1, Math.floor(((a + Math.PI) / TAU) * TURNS)) * STEPS;
        const n = Math.min(STEPS - 1.001, (out / FAR) * (STEPS - 1));
        const lo = Math.floor(n);
        const fall = RAYS[k + lo] + (RAYS[k + lo + 1] - RAYS[k + lo]) * (n - lo);
        const g = Math.exp(-out * fall) * 1.06 - 0.06 - Math.max(0, d / REACH - 0.75) * 0.5;
        const idx = Math.floor(g * glow.length + th * 0.95);
        if (idx <= 0) continue;
        c = glow[Math.min(glow.length - 1, idx - 1)];
        alpha = GLOW_ALPHA[Math.min(glow.length - 1, idx - 1)];
      }
    }
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = alpha;
  }
}

// How long one frame may spend on the next picture of the star, in milliseconds.
const BUDGET = 3;
function workOn(time, seed, kind) {
  if (!shown) {
    shown = document.createElement('canvas');
    shown.width = SIDE;
    shown.height = SIDE;
    work = shown.getContext('2d').createImageData(SIDE, SIDE);
  }
  if (!pass) begin(time, seed);
  // The very first picture is worked out at once, so that there is something to show.
  const until = pass.first === false ? performance.now() + BUDGET : Infinity;
  while (pass.row < SIDE) {
    paintRow(pass.row++, kind);
    if (performance.now() > until) return;
  }
  shown.getContext('2d').putImageData(work, 0, 0);
  begin(time, seed);
  pass.first = false;
}

// Sparks drift outward through the reach of the heat and fade as they go, which shows where it does harm.
function drawSparks(ctx, time, seed, color) {
  ctx.fillStyle = color;
  const one = 1 / ZOOM;
  for (let k = 0; k < 130; k++) {
    const a = grid(k, 11, seed) * TAU + Math.sin(time * 0.05 + k) * 0.05;
    const life = (time * (0.035 + grid(k, 12, seed) * 0.05) + grid(k, 13, seed)) % 1;
    const r = B.STAR_R * (1.02 + life * (B.STAR_BURN / B.STAR_R - 1.02));
    ctx.globalAlpha = (1 - life) ** 1.5 * 0.9;
    const size = grid(k, 14, seed) > 0.75 && life < 0.4 ? 2 * one : one;
    ctx.fillRect(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r), size, size);
  }
  ctx.globalAlpha = 1;
}

const kindOf = () => KINDS.yellow;

// The star, in the coordinates of space. `seed` makes the stars of different systems differ.
export function drawStar(ctx, cam, time, seed = 0) {
  const far = REACH / ZOOM + Math.hypot(VIEW_W, VIEW_H) / 2 / ZOOM;
  if (Math.hypot(cam.x, cam.y) > far) return;
  const kind = kindOf();
  workOn(time, seed, kind);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shown, -REACH / ZOOM, -REACH / ZOOM, SIDE / ZOOM, SIDE / ZOOM);
  ctx.imageSmoothingEnabled = smooth;
  drawSparks(ctx, time, seed, kind.spark);
  // A faint ring where the heat begins to do harm.
  ctx.strokeStyle = 'rgba(240,154,90,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, B.STAR_BURN, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------- light that falls on things ----------
// The side of a thing that faces the star is lit by it, and the far side is darker, more so the closer to the
// star it is. The light is laid over the thing's own picture, so it never spills outside it. Things do not
// throw shadows on each other.
// Work out the light on one picture: `side` is the size of the square it is drawn in.
function lightOn(canvas, img, x, y, angle, px, py, side, k) {
  const g = canvas.getContext('2d');
  const mid = side / 2;
  const d = Math.hypot(x, y);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, side, side);
  g.translate(mid, mid);
  g.rotate(angle);
  g.drawImage(img, -px, -py);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // From the side that faces the star to the side that faces away.
  const nx = x / d,
    ny = y / d;
  const reach = mid * 0.85;
  const light = kindOf().light;
  const shade = g.createLinearGradient(mid - nx * reach, mid - ny * reach, mid + nx * reach, mid + ny * reach);
  shade.addColorStop(0, `rgba(${light},${0.62 * k})`);
  shade.addColorStop(0.45, `rgba(${light},0)`);
  shade.addColorStop(0.55, 'rgba(4,4,14,0)');
  shade.addColorStop(1, `rgba(4,4,14,${0.66 * k})`);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = shade;
  g.fillRect(0, 0, side, side);
}

let scratch = null;
// What lies still is lit the same way every frame, so its light is worked out once and kept. `keep` is what
// to keep it under: the thing itself. Ships move and turn, and are worked out anew each time.
const kept = new WeakMap();
export function starLight(ctx, state, img, x, y, angle = 0, px = img.width / 2, py = img.height / 2, keep = null) {
  if (!state.sectors[state.sector].star) return;
  const d = Math.hypot(x, y);
  const k = Math.min(1, 1.25 / (1 + (d / 800) ** 2));
  if (k < 0.04 || d < 1) return;
  const side = Math.ceil(Math.hypot(img.width, img.height)) + 2;
  let canvas = null;
  if (keep) {
    const had = kept.get(keep);
    if (had && had.img === img && had.x === x && had.y === y && had.angle === angle) canvas = had.canvas;
    else {
      canvas = had ? had.canvas : document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      lightOn(canvas, img, x, y, angle, px, py, side, k);
      kept.set(keep, { img, x, y, angle, canvas });
    }
  } else {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < side) {
      scratch.width = side;
      scratch.height = side;
    }
    canvas = scratch;
    lightOn(canvas, img, x, y, angle, px, py, side, k);
  }
  ctx.drawImage(canvas, 0, 0, side, side, x - side / 2, y - side / 2, side, side);
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
