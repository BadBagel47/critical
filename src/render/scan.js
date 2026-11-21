// The Warden scan on the screen (D-074, R-1262): a small box at the left edge, so that the Captain and the Gunner
// still see what they are doing (SM3). Everyone sees that a scan is going on and how long it has left. The one whose
// turn it is to hide the goods also sees the two waves and the dials: F and G turn the first dial, V and B the
// second, the arrows on the box can be clicked, and the Engineer can use the arrow keys too (SM5).
import { COL } from '../config.js';
import { playerById } from '../sim/players.js';
import { scannerOf, wavesMeet } from '../sim/scan.js';
import { B } from '../sim/balance.js';
import { rect } from './draw.js';

const BOX = { x: 8, y: 118, w: 160, h: 92 };
const WAVE = { x: BOX.x + 6, y: BOX.y + 22, w: BOX.w - 12, h: 34 };
// The dials' arrows: which key each presses, and where it is.
const ARROWS = [
  { name: 'scan.a-', code: 'KeyF', x: BOX.x + 6, label: 'F' },
  { name: 'scan.a+', code: 'KeyG', x: BOX.x + 40, label: 'G' },
  { name: 'scan.b-', code: 'KeyV', x: BOX.x + 86, label: 'V' },
  { name: 'scan.b+', code: 'KeyB', x: BOX.x + 120, label: 'B' },
];
const ARROW_Y = BOX.y + BOX.h - 22;

// Whether this player is the one to work the dials now.
export function myScanTurn(game) {
  const { state, view } = game;
  const sc = state.scan;
  if (!sc || !sc.hidden || !view.started) return false;
  const who = scannerOf(state);
  return !!who && who.id === view.playerId;
}

// The arrows on the box, for clicking, and for the browser test.
export function scanButtons(game) {
  if (!myScanTurn(game)) return [];
  return ARROWS.map((a) => ({ name: a.name, x: a.x, y: ARROW_Y, w: 30, h: 16, code: a.code }));
}

function wave(ctx, a, b, color) {
  const cycles = 1.5 + a * 4;
  const phase = b * Math.PI * 2;
  ctx.fillStyle = color;
  for (let i = 0; i < WAVE.w; i++) {
    const y = WAVE.y + WAVE.h / 2 + Math.sin((i / WAVE.w) * cycles * Math.PI * 2 + phase) * (WAVE.h / 2 - 2);
    ctx.fillRect(WAVE.x + i, Math.round(y), 1, 2);
  }
}

export function drawScan(ctx, font, game) {
  const { state, view } = game;
  const sc = state.scan;
  if (!sc || !view.started) return;
  const me = playerById(state, view.playerId);
  if (!me || me.inside !== null) return;
  const left = Math.ceil(sc.left);
  if (!sc.hidden) {
    rect(ctx, BOX.x, BOX.y, BOX.w, 18, COL.panel, COL.line);
    font.draw(ctx, `WARDEN SCAN  ·  ${left} S`, BOX.x + 6, BOX.y + 5, COL.ion[2]);
    return;
  }
  const turn = myScanTurn(game);
  const who = scannerOf(state);
  const h = turn ? BOX.h : 30;
  rect(ctx, BOX.x, BOX.y, BOX.w, h, COL.panel, COL.ember[1]);
  font.draw(ctx, `WARDEN SCAN  ·  ${left} S`, BOX.x + 6, BOX.y + 5, COL.ember[2]);
  if (!turn) {
    const text = who ? `${who.name} HIDES THE GOODS` : 'NO ONE CAN HIDE THE GOODS';
    font.draw(ctx, text, BOX.x + 6, BOX.y + 17, COL.dim);
    return;
  }
  rect(ctx, WAVE.x, WAVE.y, WAVE.w, WAVE.h, '#0b0b14', COL.line);
  const meet = wavesMeet(sc);
  wave(ctx, sc.target.a, sc.target.b, COL.ember[1]);
  wave(ctx, sc.dial.a, sc.dial.b, meet ? COL.acid[2] : COL.ion[2]);
  // How long the waves have lain together, against how long they must.
  const held = Math.min(1, sc.held / B.SCAN.hold);
  if (held > 0) rect(ctx, WAVE.x, WAVE.y + WAVE.h + 1, Math.round(WAVE.w * held), 2, COL.acid[2]);
  const m = game.keys.mouse;
  for (const a of ARROWS) {
    const over = m.x >= a.x && m.x < a.x + 30 && m.y >= ARROW_Y && m.y < ARROW_Y + 16;
    rect(ctx, a.x, ARROW_Y, 30, 16, over ? '#1c2140' : '#141420', over ? COL.ion[2] : COL.line);
    const arrow = a.name.endsWith('-') ? '<' : '>';
    font.draw(ctx, `${arrow} ${a.label}`, a.x + 15, ARROW_Y + 4, COL.text, { align: 'c' });
  }
  font.draw(ctx, 'LENGTH', BOX.x + 36, ARROW_Y - 9, COL.faint, { align: 'c' });
  font.draw(ctx, 'SHIFT', BOX.x + 116, ARROW_Y - 9, COL.faint, { align: 'c' });
}
