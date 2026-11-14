// Small drawing helpers shared by all screens. Coordinates are game pixels.
import { COL } from '../config.js';

export function sprite(ctx, img, x, y, angle = 0, px = img.width / 2, py = img.height / 2) {
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.drawImage(img, -px, -py);
  ctx.restore();
}
export function rect(ctx, x, y, w, h, fill, stroke) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.fillStyle = stroke;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  }
}
// A text label in a box. Returns the x just right of the box.
export function label(ctx, font, x, y, text, o = {}) {
  const pad = o.pad ?? 4,
    w = font.width(text) + pad * 2;
  const x0 = Math.round(o.anchor === 'c' ? x - w / 2 : o.anchor === 'r' ? x - w : x);
  rect(ctx, x0, y, w, 14, o.bg ?? COL.panel, o.border === undefined ? COL.line : o.border);
  font.draw(ctx, text, x0 + pad, y + 4, o.fg ?? COL.text);
  return x0 + w;
}
export function bar(ctx, x, y, w, frac, color, h = 6) {
  rect(ctx, x, y, w, h, '#1c1c28', COL.out);
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) rect(ctx, x + 1, y + 1, Math.max(1, Math.round((w - 2) * f)), h - 2, color);
}
export function dashed(ctx, x0, y0, x1, y1, color, on = 5, off = 4) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let t = 0; t < len; t += on + off) {
    const a = t / len,
      b = Math.min(1, (t + on) / len);
    ctx.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a);
    ctx.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
  }
  ctx.stroke();
}
export function brackets(ctx, x, y, r, color, len = 4) {
  ctx.fillStyle = color;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const cx = x + sx * r,
        cy = y + sy * r;
      ctx.fillRect(sx < 0 ? cx : cx - len + 1, cy, len, 1);
      ctx.fillRect(cx, sy < 0 ? cy : cy - len + 1, 1, len);
    }
}
