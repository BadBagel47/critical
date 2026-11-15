// Flames from engines and thrusters. A flame narrows to a point, has a white-hot heart with colour around
// it, and flutters in both length and width, so that it looks alive and not like a block.
import { COL } from '../config.js';
import { B } from '../sim/balance.js';

export const FLAME_ION = [COL.ion[0], COL.ion[1], COL.ion[2], '#f4ffff'];
export const FLAME_FIRE = [COL.ember[0], COL.ember[1], COL.ochre[2], '#fff3c4'];

// One tongue of a flame: as wide as `w` at its root, bending a little on the way to its tip.
function tongue(ctx, x, y, way, len, w, sway, color) {
  const tip = y + way * len;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w / 2 + sway * 0.4, y + way * len * 0.55, x + sway, tip);
  ctx.quadraticCurveTo(x + w / 2 + sway * 0.4, y + way * len * 0.55, x + w / 2, y);
  ctx.closePath();
  ctx.fill();
}

// A flame at x, y in the ship's own pixels. `way` is 1 for one that goes back and -1 for one that goes
// forward. `colors` run from the outside in. `seed` keeps flames next to each other from moving as one.
export function drawFlame(ctx, x, y, way, len, w, colors, time, seed = 0) {
  if (len <= 0.5) return;
  const a = time * 37 + seed * 5.1,
    b = time * 23 + seed * 2.7;
  // It flutters fast and a little, never so much that it flashes.
  const stretch = 1 + 0.12 * Math.sin(a) + 0.08 * Math.sin(b * 1.9);
  const wide = 1 + 0.1 * Math.sin(b);
  const sway = w * 0.22 * Math.sin(a * 0.6 + 1) * Math.min(1, len / 8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.ellipse(x, y + way * len * 0.45, w * 0.8, len * 0.62, 0, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 0.85;
  tongue(ctx, x, y, way, len * stretch, w * wide, sway, colors[1]);
  ctx.globalAlpha = 1;
  tongue(ctx, x, y, way, len * stretch * 0.7, w * wide * 0.68, sway * 0.7, colors[2]);
  tongue(ctx, x, y, way, len * stretch * 0.42, w * wide * 0.36, sway * 0.4, colors[3]);
}

// The steering thrusters sit at the ends of the pods on the wings, pointing forward and back. To turn right
// the left pod pushes forward and the right one back, and the other way round to turn left. Both forward
// ones fire when the ship backs. Each is { x, y, way, power }: where it is on the ship, whether its flame
// goes back (1) or forward (-1), and how hard it fires from 0 to 1.
const POD_X = 27.5;
const POD_FRONT = 8;
const POD_REAR = 34;
export function steering(ship) {
  if (ship.docked) return [];
  const back = Math.max(0, -ship.throttle) / B.REVERSE;
  const list = [];
  const add = (x, y, way, power) => {
    if (power > 0.08) list.push({ x, y, way, power: Math.min(1, power) });
  };
  add(-POD_X, POD_REAR, 1, ship.turn);
  add(POD_X, POD_FRONT, -1, Math.max(ship.turn, back));
  add(POD_X, POD_REAR, 1, -ship.turn);
  add(-POD_X, POD_FRONT, -1, Math.max(-ship.turn, back));
  return list;
}
