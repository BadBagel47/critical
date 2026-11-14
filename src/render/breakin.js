// The break-in panel: a close-up of the docking lock, drawn on top of whatever the player was looking at.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { GW, GH, mask, flow } from '../sim/breakin.js';
import { rect, bar } from './draw.js';

const T = 28, PW = 330, PH = 204, PX = (VIEW_W - PW) / 2, PY = (VIEW_H - PH) / 2;
const GX = PX + (PW - GW * T) / 2, GY = PY + 52;

// Which tile is under the mouse, or null.
export function breakinTile(mx, my) {
  const x = Math.floor((mx - GX) / T), y = Math.floor((my - GY) / T);
  return x >= 0 && y >= 0 && x < GW && y < GH ? { x, y } : null;
}

export function drawBreakin(ctx, font, wreck, mouse) {
  const bk = wreck.breakin, { lit } = flow(bk);
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  rect(ctx, PX, PY, PW, PH, COL.panel, COL.steel[1]); rect(ctx, PX + 3, PY + 3, PW - 6, PH - 6, null, COL.line);
  for (const [x, y] of [[6, 6], [PW - 9, 6], [6, PH - 9], [PW - 9, PH - 9]]) rect(ctx, PX + x, PY + y, 3, 3, COL.steel[1]);
  font.draw(ctx, 'BYPASS THE DOCKING LOCK', VIEW_W / 2, PY + 14, COL.ochre[2], { align: 'c' });
  const low = bk.time < 10, secs = Math.max(0, Math.ceil(bk.time));
  bar(ctx, PX + 60, PY + 30, PW - 150, bk.time / bk.total, low ? COL.ember[1] : COL.ochre[2], 7);
  font.draw(ctx, '0:' + String(secs).padStart(2, '0'), PX + PW - 82, PY + 30, low ? COL.ember[2] : COL.ochre[2]);
  const hover = mouse ? breakinTile(mouse.x, mouse.y) : null;
  bk.tiles.forEach((t, i) => {
    const x = GX + (i % GW) * T, y = GY + Math.floor(i / GW) * T, m = mask(t), c = lit.has(i) ? COL.ion[2] : COL.steel[1], h = T / 2;
    rect(ctx, x, y, T, T, '#151a36', '#2a3160');
    ctx.fillStyle = c;
    if (m & 1) ctx.fillRect(x + h - 3, y + 1, 6, h + 2);
    if (m & 4) ctx.fillRect(x + h - 3, y + h - 3, 6, h + 2);
    if (m & 8) ctx.fillRect(x + 1, y + h - 3, h + 2, 6);
    if (m & 2) ctx.fillRect(x + h - 3, y + h - 3, h + 2, 6);
    if (m === 0) { ctx.fillStyle = '#252b52'; ctx.fillRect(x + h - 2, y + h - 2, 4, 4); }
    if (lit.has(i) && m) { ctx.fillStyle = COL.ion[3]; ctx.fillRect(x + h - 1, y + h - 1, 2, 2); }
  });
  if (hover) rect(ctx, GX + hover.x * T - 1, GY + hover.y * T - 1, T + 2, T + 2, null, COL.ochre[3]);
  const sy = GY + bk.source * T + T / 2, ey = GY + bk.sink * T + T / 2;
  rect(ctx, GX - 22, sy - 6, 22, 12, COL.ion[2], COL.out); font.draw(ctx, 'POWER', GX - 11, sy - 18, COL.ion[2], { align: 'c' });
  rect(ctx, GX + GW * T, ey - 6, 22, 12, COL.steel[0], COL.out); rect(ctx, GX + GW * T + 8, ey - 3, 6, 6, COL.ember[1]); font.draw(ctx, 'LOCK', GX + GW * T + 11, ey - 18, COL.text, { align: 'c' });
  font.draw(ctx, 'CLICK A TILE TO TURN IT  ·  F TO STEP AWAY', VIEW_W / 2, PY + PH - 30, COL.dim, { align: 'c' });
  font.draw(ctx, 'IF TIME RUNS OUT THE WRECK BLOWS UP', VIEW_W / 2, PY + PH - 18, COL.ember[1], { align: 'c' });
}
