// Heads-up display on top of the space view, plus overlays shared by all screens.
import { VIEW_W, VIEW_H, COL, POSTS } from '../config.js';
import { B } from '../sim/balance.js';
import { nodeStatus } from '../sim/state.js';
import { speedOf, fireInterval } from '../sim/step.js';
import { rect, label, bar } from './draw.js';

const POST_NAME = { captain: 'CAPTAIN', gunner: 'GUNNER', engineer: 'ENGINEER' };
const fmtTime = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

export function drawTabs(ctx, font, view) {
  let x = 8;
  POSTS.forEach((p, i) => {
    const active = view.post === p;
    x = label(ctx, font, x, 8, `${i + 1}  ${POST_NAME[p]}`, { fg: active ? COL.out : COL.dim, bg: active ? COL[p] : COL.panel, border: active ? null : COL.line }) + 4;
  });
  return x;
}

export function shipAlert(state) {
  const ship = state.ship;
  const crit = ship.nodes.find((n) => nodeStatus(n.hp) === 'critical');
  if (crit) return { text: crit.name + ' CRITICAL', color: COL.ember[2], border: COL.ember[0] };
  if (ship.hull < B.HULL_MAX * 0.3) return { text: 'HULL CRITICAL', color: COL.ember[2], border: COL.ember[0] };
  if (ship.fuel <= 0) return { text: 'OUT OF FUEL  ·  ADRIFT', color: COL.ember[2], border: COL.ember[0] };
  return null;
}

export function drawBars(ctx, font, state, x = 8, y = 314) {
  const ship = state.ship;
  rect(ctx, x, y, 136, 40, COL.panel, COL.line);
  font.draw(ctx, 'FUEL', x + 4, y + 5, COL.dim); bar(ctx, x + 46, y + 5, 84, ship.fuel / B.FUEL_MAX, ship.fuel < B.FUEL_MAX * 0.2 ? COL.ember[1] : COL.ochre[2]);
  font.draw(ctx, 'SHIELD', x + 4, y + 17, COL.dim); bar(ctx, x + 46, y + 17, 84, ship.shield / B.SHIELD_MAX, COL.ion[1]);
  font.draw(ctx, 'HULL', x + 4, y + 29, COL.dim); bar(ctx, x + 46, y + 29, 84, ship.hull / B.HULL_MAX, ship.hull < B.HULL_MAX * 0.3 ? COL.ember[1] : COL.steel[2]);
}

export function drawToasts(ctx, font, view, time, y = 44) {
  view.toasts = view.toasts.filter((t) => t.until > time);
  view.toasts.slice(-3).forEach((t, i) => label(ctx, font, VIEW_W / 2, y + i * 16, t.text, { anchor: 'c', fg: t.color || COL.text, border: COL.line }));
}

export function drawPowerMini(ctx, font, state, x, y) {
  const names = ['W', 'S', 'E', 'R'], cols = [COL.gunner, COL.ion[1], COL.captain, COL.ochre[3]];
  B.SYSTEMS.forEach((sys, i) => {
    const gx = x + i * 30; font.draw(ctx, names[i], gx, y, COL.dim);
    for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) rect(ctx, gx + 8 + k * 5, y, 4, 6, k < state.ship.power[sys] ? cols[i] : '#1c1c28');
  });
}

export function drawHud(ctx, state, view, assets, dock) {
  const { font } = assets, ship = state.ship;
  drawTabs(ctx, font, view);
  label(ctx, font, VIEW_W - 8, 8, 'CREDITS  ' + state.credits, { anchor: 'r', fg: COL.ochre[2] });
  label(ctx, font, VIEW_W - 8, 24, `KILLS  ${state.kills}   TIME  ${fmtTime(state.time)}`, { anchor: 'r', fg: COL.dim });
  // One line of status at the top centre, most urgent first.
  let top = null;
  const tele = state.players[0].tele;
  if (dock && dock.docked) top = { text: tele > 0 ? `DOCKED  ·  TELEPORTER CHARGING  ${Math.ceil(tele)} S  ·  E UNDOCK` : 'DOCKED  ·  F BOARD  ·  E UNDOCK', color: COL.ion[2], border: COL.ion[0] };
  else if (dock && dock.ready) top = { text: view.post === 'captain' ? 'PRESS E TO DOCK' : 'IN POSITION TO DOCK', color: COL.ion[3], border: COL.ion[1] };
  else if (dock && dock.tooFast) top = { text: 'TOO FAST TO DOCK', color: COL.ochre[2], border: COL.ochre[0] };
  else if (dock && view.post === 'captain') top = { text: 'DOCKING  ·  HOLD COURSE', color: COL.ion[2], border: COL.ion[0] };
  const alert = shipAlert(state);
  if (top) label(ctx, font, VIEW_W / 2, 8, top.text, { anchor: 'c', fg: top.color, border: top.border });
  if (alert) label(ctx, font, VIEW_W / 2, top ? 24 : 8, alert.text, { anchor: 'c', fg: alert.color, border: alert.border });
  drawBars(ctx, font, state);
  if (view.post === 'captain') {
    rect(ctx, 150, 326, 150, 28, COL.panel, COL.line);
    font.draw(ctx, 'THROTTLE', 154, 331, COL.dim);
    const bx = 208, bw = 86, zero = bx + Math.round(bw * B.REVERSE / (1 + B.REVERSE));
    rect(ctx, bx, 331, bw, 6, '#1c1c28', COL.out);
    const w = Math.round((bw - zero + bx - 1) * Math.max(0, ship.throttle)), wr = Math.round((zero - bx - 1) * Math.max(0, -ship.throttle) / B.REVERSE);
    if (w > 0) rect(ctx, zero, 332, w, 4, COL.captain);
    if (wr > 0) rect(ctx, zero - wr, 332, wr, 4, COL.ochre[1]);
    rect(ctx, zero, 330, 1, 8, COL.text);
    font.draw(ctx, 'SPEED', 154, 343, COL.dim); font.draw(ctx, String(Math.round(speedOf(ship))), 208, 343, COL.text);
    font.draw(ctx, 'W S THROTTLE  ·  A D TURN  ·  X STOP  ·  E DOCK', VIEW_W - 8, 346, COL.faint, { align: 'r' });
  } else if (view.post === 'gunner') {
    const off = fireInterval(ship) === Infinity;
    label(ctx, font, 150, 333, 'PULSE LASER', { fg: off ? COL.dim : COL.out, bg: off ? COL.panel : COL.gunner, border: off ? COL.line : null, pad: 6 });
    if (off) label(ctx, font, 232, 333, 'WEAPONS OFFLINE  ·  NO POWER', { fg: COL.ember[2], border: COL.ember[0] });
    font.draw(ctx, 'MOUSE AIM  ·  CLICK OR SPACE TO FIRE', VIEW_W - 8, 346, COL.faint, { align: 'r' });
    const m = view.mouse; ctx.fillStyle = COL.ochre[3];
    for (const [dx, dy, w, h] of [[-7, 0, 4, 1], [4, 0, 4, 1], [0, -7, 1, 4], [0, 4, 1, 4]]) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h);
  }
  drawPowerMini(ctx, font, state, VIEW_W - 126, 332);
}

export function drawOverlay(ctx, font, title, lines, color = COL.text) {
  ctx.globalAlpha = 0.72; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  font.draw(ctx, title, VIEW_W / 2, 130, color, { align: 'c', scale: 3 });
  lines.forEach((l, i) => font.draw(ctx, l, VIEW_W / 2, 176 + i * 14, i === lines.length - 1 ? COL.text : COL.dim, { align: 'c' }));
}

const HELP = [
  ['ALL POSTS', '1 2 3 OR TAB  SWITCH POST     P  PAUSE     H  THIS HELP     F  BOARD WHEN DOCKED'],
  ['CAPTAIN', 'W S  THROTTLE     A D  TURN     X  FULL STOP     E  DOCK AND UNDOCK'],
  ['GUNNER', 'MOUSE  AIM     CLICK OR SPACE  FIRE'],
  ['ENGINEER', 'CLICK A PIP  SET POWER     CLICK A NODE  SEND THE REPAIR CREW'],
  ['', 'SHIFT CLICK  ADD TO THE REPAIR QUEUE     ARROWS  SELECT AND ADJUST POWER'],
  ['BOARDING', 'W A S D  MOVE     MOUSE  AIM     CLICK  FIRE     G  GRENADE     F  USE'],
];
export function drawHelp(ctx, font, y0 = 96) {
  rect(ctx, 60, y0 - 18, 520, 168, COL.panel, COL.line);
  font.draw(ctx, 'CONTROLS', 72, y0 - 6, COL.text);
  HELP.forEach(([who, text], i) => {
    const y = y0 + 16 + i * 18;
    if (who) font.draw(ctx, who, 72, y, COL[who.toLowerCase()] || COL.text);
    font.draw(ctx, text, 146, y, COL.dim);
  });
  font.draw(ctx, 'A POST YOU LEAVE KEEPS DOING WHAT YOU SET IT TO.', 72, y0 + 130, COL.faint);
}

export function drawTitle(ctx, font, assets, t) {
  font.draw(ctx, 'CRITICAL ST8', VIEW_W / 2, 34, COL.text, { align: 'c', scale: 5 });
  font.draw(ctx, 'ONE SHIP  ·  THREE POSTS  ·  SOLO BUILD', VIEW_W / 2, 76, COL.ion[1], { align: 'c' });
  drawHelp(ctx, font, 116);
  if (Math.floor(t * 2) % 2 === 0) font.draw(ctx, 'PRESS ENTER TO LAUNCH', VIEW_W / 2, 304, COL.ochre[2], { align: 'c', scale: 2 });
  font.draw(ctx, 'EARLY VERSION  ·  ONLINE PLAY COMES LATER', VIEW_W / 2, 340, COL.faint, { align: 'c' });
}
