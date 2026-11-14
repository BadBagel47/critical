// The break-in panel: a close-up of the lock, drawn on top of whatever the player was looking at.
// Each kind of target has its own game. See src/sim/breakin.js.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { GW, GH, mask, flow } from '../sim/breakin.js';
import { rect, bar } from './draw.js';

const T = 28, PW = 330, PH = 204, PX = (VIEW_W - PW) / 2, PY = (VIEW_H - PH) / 2;
const GX = PX + (PW - GW * T) / 2, GY = PY + 52;
const DIGIT = { w: 34, gap: 8 }, DX = PX + (PW - (B.CODE_DIGITS * DIGIT.w + (B.CODE_DIGITS - 1) * DIGIT.gap)) / 2, DY = PY + 104;
const CX = VIEW_W / 2, CY = PY + 100, DR = 46;
const TEXT = {
  pipes: { title: 'BYPASS THE DOCKING LOCK', hint: 'CLICK A TILE TO TURN IT  ·  F TO STEP AWAY', fail: 'IF TIME RUNS OUT THE WRECK BLOWS UP' },
  code: { title: 'ENTER THE STATION CODE', hint: 'THE ENGINEER SCREEN SHOWS THE CODE  ·  F TO STEP AWAY', fail: 'IF TIME RUNS OUT THE STATION FIGHTS BACK' },
  dial: { title: 'PICK THE POD LOCK', hint: 'CLICK OR PRESS SPACE WHEN THE NEEDLE IS IN THE MARK', fail: 'THREE MISSES SET OFF AN ALARM THAT BRINGS PIRATES' },
};

const inside = (mx, my) => mx >= PX && mx < PX + PW && my >= PY && my < PY + PH;
const tileAt = (mx, my) => { const x = Math.floor((mx - GX) / T), y = Math.floor((my - GY) / T); return x >= 0 && y >= 0 && x < GW && y < GH ? { x, y } : null; };
const digitAt = (mx, my) => { for (let i = 0; i < B.CODE_DIGITS; i++) { const x = DX + i * (DIGIT.w + DIGIT.gap); if (mx >= x && mx < x + DIGIT.w && my >= DY && my < DY + DIGIT.w) return i + 1; } return null; };

// Turn a click (or the space bar) into an order for the break-in game, or null.
export function breakinAction(target, mx, my, click, right, space) {
  const kind = target.breakin.kind, id = target.id;
  if (kind === 'dial') return (click && inside(mx, my)) || space ? { wreck: id, stop: true } : null;
  if (!click && !right) return null;
  if (kind === 'code') { const digit = click ? digitAt(mx, my) : null; return digit ? { wreck: id, digit } : null; }
  const t = tileAt(mx, my);
  return t ? { wreck: id, x: t.x, y: t.y, dir: right ? -1 : 1 } : null;
}

function drawPipes(ctx, font, bk, mouse) {
  const { lit } = flow(bk), hover = mouse ? tileAt(mouse.x, mouse.y) : null;
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
}

function drawCode(ctx, font, bk, mouse) {
  for (let i = 0; i < B.CODE_LEN; i++) {
    const x = VIEW_W / 2 - (B.CODE_LEN * 30) / 2 + i * 30, d = bk.entered[i];
    rect(ctx, x, PY + 54, 26, 30, '#151a36', d ? COL.ion[2] : '#2a3160');
    if (d) font.draw(ctx, String(d), x + 13, PY + 62, COL.ion[3], { align: 'c', scale: 2 });
  }
  const hover = mouse ? digitAt(mouse.x, mouse.y) : null;
  for (let i = 0; i < B.CODE_DIGITS; i++) {
    const x = DX + i * (DIGIT.w + DIGIT.gap);
    rect(ctx, x, DY, DIGIT.w, DIGIT.w, hover === i + 1 ? '#1c2140' : '#141420', hover === i + 1 ? COL.ochre[3] : COL.steel[1]);
    font.draw(ctx, String(i + 1), x + DIGIT.w / 2, DY + 11, COL.text, { align: 'c', scale: 2 });
  }
  font.draw(ctx, bk.wrong ? `WRONG CODE  ·  ${B.CODE_PENALTY} S LOST EACH TIME` : `THE CODE CHANGES IN ${Math.ceil(bk.shift)} S`, VIEW_W / 2, DY + DIGIT.w + 8, bk.wrong ? COL.ember[2] : COL.dim, { align: 'c' });
}

function drawDial(ctx, font, bk) {
  const arc = (a) => a - Math.PI / 2;
  ctx.fillStyle = '#151a36'; ctx.beginPath(); ctx.arc(CX, CY, DR + 6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a3160'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(CX, CY, DR + 6, 0, 7); ctx.stroke();
  ctx.strokeStyle = COL.steel[0]; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(CX, CY, DR - 4, 0, 7); ctx.stroke();
  ctx.strokeStyle = COL.ochre[2]; ctx.beginPath(); ctx.arc(CX, CY, DR - 4, arc(bk.mark - bk.width / 2), arc(bk.mark + bk.width / 2)); ctx.stroke();
  ctx.strokeStyle = COL.ion[3]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.sin(bk.angle) * DR, CY - Math.cos(bk.angle) * DR); ctx.stroke();
  ctx.fillStyle = COL.ion[2]; ctx.beginPath(); ctx.arc(CX, CY, 4, 0, 7); ctx.fill();
  font.draw(ctx, 'HITS', PX + 22, PY + 62, COL.dim); font.draw(ctx, 'MISSES', PX + PW - 22, PY + 62, COL.dim, { align: 'r' });
  for (let i = 0; i < B.DIAL_STAGES; i++) rect(ctx, PX + 22 + i * 12, PY + 74, 9, 9, i < bk.stage ? COL.acid[2] : '#1c1c28', COL.out);
  for (let i = 0; i < B.DIAL_MISSES; i++) rect(ctx, PX + PW - 31 - i * 12, PY + 74, 9, 9, i < bk.misses ? COL.ember[1] : '#1c1c28', COL.out);
}

export function drawBreakin(ctx, font, target, mouse) {
  const bk = target.breakin, text = TEXT[bk.kind];
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  rect(ctx, PX, PY, PW, PH, COL.panel, COL.steel[1]); rect(ctx, PX + 3, PY + 3, PW - 6, PH - 6, null, COL.line);
  for (const [x, y] of [[6, 6], [PW - 9, 6], [6, PH - 9], [PW - 9, PH - 9]]) rect(ctx, PX + x, PY + y, 3, 3, COL.steel[1]);
  font.draw(ctx, text.title, VIEW_W / 2, PY + 14, COL.ochre[2], { align: 'c' });
  const low = bk.time < 10, secs = Math.max(0, Math.ceil(bk.time));
  bar(ctx, PX + 60, PY + 30, PW - 150, bk.time / bk.total, low ? COL.ember[1] : COL.ochre[2], 7);
  font.draw(ctx, Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), PX + PW - 82, PY + 30, low ? COL.ember[2] : COL.ochre[2]);
  if (bk.kind === 'pipes') drawPipes(ctx, font, bk, mouse);
  else if (bk.kind === 'code') drawCode(ctx, font, bk, mouse);
  else drawDial(ctx, font, bk);
  font.draw(ctx, text.hint, VIEW_W / 2, PY + PH - 30, COL.dim, { align: 'c' });
  font.draw(ctx, text.fail, VIEW_W / 2, PY + PH - 18, COL.ember[1], { align: 'c' });
}
