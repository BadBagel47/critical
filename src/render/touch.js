// The touch controls on the screen (F-090, touch.js): the round buttons down the edges, and the sticks where the
// thumbs are, or a faint ring where a stick is to be had while no thumb is on it.
import { VIEW_W, COL } from '../config.js';
import { rect } from './draw.js';
import { STICK_SIZE, touchOptions } from '../touch.js';

function ring(ctx, x, y, r, color, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function disc(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fillStyle = color;
  ctx.fill();
}

// Where a stick rests while no thumb is on it, as a hint that one is there.
const REST = { left: { x: 92, y: 262 }, right: { x: VIEW_W - 150, y: 262 } };

export function drawTouch(ctx, font, touch, keys) {
  const layout = touch.layout;
  const R = STICK_SIZE[touchOptions().size] || STICK_SIZE.M;
  const held = new Map([...touch.fingers.values()].filter((f) => f.role === 'button').map((f) => [f.code, true]));
  for (const b of layout.buttons) {
    const on = held.has(b.code) || keys.held.has(b.code);
    ctx.globalAlpha = on ? 0.95 : 0.7;
    disc(ctx, b.x, b.y, b.r, on ? COL.ion[1] : COL.panel);
    ctx.globalAlpha = 1;
    ring(ctx, b.x, b.y, b.r, on ? COL.ion[3] : COL.steel[1]);
    const w = font.width(b.word);
    if (w <= b.r * 2 - 4) font.draw(ctx, b.word, b.x, b.y - 3, on ? COL.white : COL.text, { align: 'c' });
    else {
      // A small button has its word under it.
      ctx.globalAlpha = 0.8;
      rect(ctx, Math.round(b.x - w / 2 - 2), b.y + b.r + 1, w + 4, 10, COL.panel);
      ctx.globalAlpha = 1;
      font.draw(ctx, b.word, b.x, b.y + b.r + 3, COL.text, { align: 'c' });
    }
  }
  for (const side of ['left', 'right']) {
    if (!layout[side]) continue;
    const id = touch.sticks[side];
    const f = id === null ? null : touch.fingers.get(id);
    if (!f) {
      ctx.globalAlpha = 0.22;
      ring(ctx, REST[side].x, REST[side].y, R, COL.steel[2], 1.5);
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = 0.35;
    disc(ctx, f.ox, f.oy, R, COL.panel);
    ctx.globalAlpha = 0.8;
    ring(ctx, f.ox, f.oy, R, side === 'right' && touch.sticks.fire ? COL.ember[2] : COL.steel[2], 1.5);
    const dx = f.x - f.ox,
      dy = f.y - f.oy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, R / d);
    disc(ctx, f.ox + dx * k, f.oy + dy * k, R * 0.42, COL.steel[2]);
    ctx.globalAlpha = 1;
  }
}
