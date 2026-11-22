// Light inside a dark place. The floor is drawn as if it were fully lit, and is then multiplied by a map of
// how much light falls where and in what colour, so that black stays black. Walls stop the light. What
// glows by itself is drawn on top afterwards, see render/boarding.js.
import { VIEW_W, VIEW_H } from '../config.js';
import { TILE, tileAt } from '../sim/boarding.js';
import { TAU } from '../sim/util.js';
import { glLightOn, shadeGL } from './gl-light.js';

// What is left of the picture where no light falls: the shapes of the walls and little else, in a colder tone.
const DARK = '#1f2338';
// A little of the light is laid on top of the picture as well, so that what is lit also shines.
const SHINE = 0.07;
// Light reaches a little way into the wall it falls on, so that the wall itself is seen. How far is measured
// straight into the wall, so that a beam along a wall lights an even strip of it. A wall is drawn with its
// front toward the bottom of the screen: light from below falls on that front, and light from above or from
// the side only on the edge of its top.
const INTO_FRONT = 10;
const INTO_TOP = 6;
const INTO_SIDE = 8;
const stops = (c) => c === '#' || c === 'L' || c === 'D';

// How far a ray from x, y gets, at most r: to the first wall and a little way into it.
function reach(it, x, y, dx, dy, r) {
  let tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  const sx = dx > 0 ? 1 : -1,
    sy = dy > 0 ? 1 : -1;
  const perX = dx ? TILE / Math.abs(dx) : Infinity,
    perY = dy ? TILE / Math.abs(dy) : Infinity;
  let nextX = dx ? (dx > 0 ? (tx + 1) * TILE - x : x - tx * TILE) / Math.abs(dx) : Infinity,
    nextY = dy ? (dy > 0 ? (ty + 1) * TILE - y : y - ty * TILE) / Math.abs(dy) : Infinity;
  // One step to the next line between tiles. Says how far along the ray that is, and sets `fromSide`.
  let fromSide = false;
  const step = () => {
    fromSide = nextX < nextY;
    const d = fromSide ? nextX : nextY;
    if (fromSide) {
      nextX += perX;
      tx += sx;
    } else {
      nextY += perY;
      ty += sy;
    }
    return d;
  };
  for (;;) {
    const d = step();
    if (d >= r) return r;
    if (!stops(tileAt(it, tx, ty))) continue;
    const deep = fromSide ? INTO_SIDE / Math.abs(dx) : (dy < 0 ? INTO_FRONT : INTO_TOP) / Math.abs(dy);
    const end = Math.min(r, d + deep);
    // Inside the wall the light goes on until it is deep enough, or until the wall ends.
    for (;;) {
      const e = step();
      if (e >= end) return end;
      if (!stops(tileAt(it, tx, ty))) return e;
    }
  }
}

const ROUND = 40;
// The outline of what a light at x, y reaches within r. With a heading it is a cone, `half` wide to each side.
// Rays go out evenly all round and just past every corner of a wall, which is where a shadow begins.
export function litArea(it, x, y, r, heading = null, half = Math.PI) {
  const cone = heading !== null;
  const mid = cone ? heading : 0;
  const offs = [];
  for (let i = 0; i <= ROUND; i++) offs.push(-half + (2 * half * i) / ROUND);
  const tx0 = Math.floor((x - r) / TILE),
    tx1 = Math.floor((x + r) / TILE),
    ty0 = Math.floor((y - r) / TILE),
    ty1 = Math.floor((y + r) / TILE);
  const far = (r + TILE) ** 2;
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!stops(tileAt(it, tx, ty))) continue;
      for (let k = 0; k < 4; k++) {
        const cx = (tx + (k & 1)) * TILE - x,
          cy = (ty + (k >> 1)) * TILE - y;
        if (cx * cx + cy * cy > far) continue;
        const a = Math.atan2(cy, cx) - mid;
        const off = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(off) >= half) continue;
        offs.push(off - 0.0015, off + 0.0015);
      }
    }
  offs.sort((a, b) => a - b);
  const points = cone ? [[x, y]] : [];
  for (const off of offs) {
    const dx = Math.cos(mid + off),
      dy = Math.sin(mid + off);
    const end = reach(it, x, y, dx, dy, r);
    points.push([x + dx * end, y + dy * end]);
  }
  return points;
}

// A light is { x, y, r, rgb, power, area, far }: where it is, how far it reaches, its colour as 'r,g,b',
// how strong it is from 0 to 1, the outline from litArea (or nothing, for a small light that walls do not
// stop), and `far` for a beam that stays strong most of the way out.
function paint(c, light, strength) {
  const { x, y, r, rgb, area } = light;
  const power = light.power * strength;
  if (power <= 0.004 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${power})`);
  g.addColorStop(light.far ? 0.65 : 0.45, `rgba(${rgb},${power * (light.far ? 0.7 : 0.4)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  if (area) {
    c.moveTo(area[0][0], area[0][1]);
    for (let i = 1; i < area.length; i++) c.lineTo(area[i][0], area[i][1]);
    c.closePath();
  } else c.arc(x, y, r, 0, TAU);
  c.fill();
}

let map = null;
// Darken what has been drawn of the place so far, except where the lights fall. `ox` and `oy` are where the
// place is drawn on the screen. Space outside the hull is left as it is.
export function shade(ctx, it, ox, oy, lights) {
  // Drawn by the graphics card where it works and is chosen (F-294); otherwise the light map below.
  if (glLightOn() && shadeGL(ctx, it, ox, oy, lights)) return;
  if (!map) {
    map = document.createElement('canvas');
    map.width = VIEW_W;
    map.height = VIEW_H;
  }
  const c = map.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#fff';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  c.translate(ox, oy);
  c.fillStyle = DARK;
  const tx0 = Math.max(0, Math.floor(-ox / TILE)),
    ty0 = Math.max(0, Math.floor(-oy / TILE)),
    tx1 = Math.min(it.w, Math.ceil((VIEW_W - ox) / TILE)),
    ty1 = Math.min(it.h, Math.ceil((VIEW_H - oy) / TILE));
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      const t = tileAt(it, tx, ty);
      if (t !== ' ' && t !== 'X') c.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  // Only the lights that reach the screen are worth the work.
  const seen = lights.filter(
    (l) => l.x + l.r > -ox && l.x - l.r < VIEW_W - ox && l.y + l.r > -oy && l.y - l.r < VIEW_H - oy,
  );
  c.globalCompositeOperation = 'lighter';
  for (const l of seen) paint(c, l, 1);

  ctx.save();
  ctx.translate(-ox, -oy);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(map, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(ox, oy);
  for (const l of seen) paint(ctx, l, SHINE);
  ctx.restore();
}

// How strongly a flare burns, from 0 to 1. It shimmers a little all the time. In its last seconds it fades,
// and dips now and then. The dips are slow: light that flashes fast over a large area can harm people who
// are sensitive to it, see "Lagar och regler" in HANDOFF.md.
export function flareLevel(burn, fade, time) {
  const shimmer = 1 - 0.04 * (0.5 + 0.5 * Math.sin(time * 23 + burn));
  if (burn >= fade) return shimmer;
  const u = Math.max(0, burn / fade);
  const beat = (time * 1.4) % 1;
  const dip = beat < 0.12 ? 0.72 : 1;
  return u * dip * shimmer;
}

// How strongly an emergency lamp is lit. One in three flickers: a short double dip every few seconds.
export function lampLevel(n, time) {
  if (n % 3) return 1;
  const beat = (time * 0.4 + (n % 89) / 89) % 1;
  return beat < 0.03 || (beat > 0.06 && beat < 0.08) ? 0.3 : 1;
}
