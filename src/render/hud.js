// Heads-up display on top of the space view, plus overlays shared by all screens.
import { VIEW_W, VIEW_H, COL, POSTS } from '../config.js';
import { B } from '../sim/balance.js';
import { nodeStatus } from '../sim/state.js';
import { speedOf, weaponPower, weaponsOf } from '../sim/step.js';
import { findDock } from '../sim/dock.js';
import { has, level, hullMax, shieldMax, fuelMax, jumpCharge } from '../sim/upgrades.js';
import { dist } from '../sim/util.js';
import { currentSector } from '../sim/sectors.js';
import { rect, label, bar } from './draw.js';
import { drawMiniMap } from './map.js';

const POST_NAME = { captain: 'CAPTAIN', gunner: 'GUNNER', engineer: 'ENGINEER' };
const fmtTime = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const RISK = ['', 'LOW', 'MEDIUM', 'HIGH'];

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
  if (ship.hull < hullMax(ship) * 0.3) return { text: 'HULL CRITICAL', color: COL.ember[2], border: COL.ember[0] };
  if (ship.fuel <= 0) return { text: 'OUT OF FUEL  ·  ADRIFT', color: COL.ember[2], border: COL.ember[0] };
  return null;
}

// The enemy alarm line, or null when there is nothing to warn about.
export function alarmText(state) {
  if (!has(state.ship, 'alarm') || state.alarm.count === 0) return null;
  const n = state.alarm.count, eta = Math.round(state.alarm.eta);
  return `ENEMY ALARM  ·  ${n} ${n === 1 ? 'PIRATE' : 'PIRATES'}  ·  ${eta > 0 ? eta + ' S OUT' : 'HERE'}`;
}

export function drawBars(ctx, font, state, x = 8, y = 314) {
  const ship = state.ship;
  rect(ctx, x, y, 136, 40, COL.panel, COL.line);
  font.draw(ctx, 'FUEL', x + 4, y + 5, COL.dim); bar(ctx, x + 46, y + 5, 84, ship.fuel / fuelMax(ship), ship.fuel < fuelMax(ship) * 0.2 ? COL.ember[1] : COL.ochre[2]);
  font.draw(ctx, 'SHIELD', x + 4, y + 17, COL.dim); bar(ctx, x + 46, y + 17, 84, ship.shield / shieldMax(ship), COL.ion[1]);
  font.draw(ctx, 'HULL', x + 4, y + 29, COL.dim); bar(ctx, x + 46, y + 29, 84, ship.hull / hullMax(ship), ship.hull < hullMax(ship) * 0.3 ? COL.ember[1] : COL.steel[2]);
}

export function drawToasts(ctx, font, view, time, y = 44, x = VIEW_W / 2) {
  view.toasts = view.toasts.filter((t) => t.until > time);
  view.toasts.slice(-3).forEach((t, i) => label(ctx, font, x, y + i * 16, t.text, { anchor: 'c', fg: t.color || COL.text, border: COL.line }));
}

export function drawPowerMini(ctx, font, state, x, y) {
  const names = ['W', 'S', 'E', 'R'], cols = [COL.gunner, COL.ion[1], COL.captain, COL.ochre[3]];
  B.SYSTEMS.forEach((sys, i) => {
    const gx = x + i * 30; font.draw(ctx, names[i], gx, y, COL.dim);
    for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) rect(ctx, gx + 8 + k * 5, y, 4, 6, k < state.ship.power[sys] ? cols[i] : '#1c1c28');
  });
}

// What to show at the top when the ship is docked.
function dockedLine(state) {
  const ship = state.ship, t = findDock(state, ship.docked), tele = state.players[0].tele;
  if (!t) return null;
  const calm = { color: COL.ion[2], border: COL.ion[0] }, warm = { color: COL.ochre[2], border: COL.ochre[0] };
  const inside = state.players.filter((p) => p.inside === t.id).length;
  if (inside) return { text: t.interior && t.interior.trade ? `${inside} ABOARD ${t.name}  ·  E UNDOCKS AND CALLS THEM BACK` : `${inside} INSIDE  ·  E UNDOCKS AND TELEPORTS ${inside === 1 ? 'THEM' : 'THEM ALL'} HOME`, ...warm };
  if (t.kind === 'station' && t.align !== 'hostile') return { text: `DOCKED AT ${t.name}  ·  F GO ABOARD  ·  E UNDOCK`, ...calm };
  const what = t.kind === 'station' ? t.name : t.kind === 'pod' ? 'CARGO POD' : 'WRECK';
  if (t.lock !== 'open') {
    if (t.breakin && t.breakin.started) return { text: `${what}  ·  F BACK TO THE LOCK  ·  0:${String(Math.max(0, Math.ceil(t.breakin.time))).padStart(2, '0')}`, ...warm };
    return { text: `DOCKED AT ${what}  ·  F ${t.kind === 'pod' ? 'PICK' : 'BYPASS'} THE LOCK  ·  E UNDOCK` + (has(ship, 'tscan') && t.kind !== 'pod' ? `  ·  RISK ${RISK[t.difficulty]}` : ''), ...calm };
  }
  return { text: tele > 0 ? `DOCKED  ·  TELEPORTER CHARGING  ${Math.ceil(tele)} S  ·  E UNDOCK` : `DOCKED AT ${what}  ·  F BOARD  ·  E UNDOCK`, ...calm };
}

export function drawHud(ctx, state, view, assets, dock) {
  const { font } = assets, ship = state.ship;
  drawTabs(ctx, font, view);
  label(ctx, font, VIEW_W - 8, 8, (state.test ? 'TEST MODE   ' : '') + 'CREDITS  ' + state.credits, { anchor: 'r', fg: COL.ochre[2] });
  label(ctx, font, VIEW_W - 8, 24, `${currentSector(state).name}   KILLS  ${state.kills}   ${fmtTime(state.time)}`, { anchor: 'r', fg: COL.dim });
  // Status lines at the top centre, most urgent first.
  const lines = [];
  if (state.jump) lines.push({ text: `JUMPING TO ${state.sectors[state.jump.to].name} IN ${Math.ceil(jumpCharge(ship) - state.jump.t)} S`, color: COL.ion[3], border: COL.ion[1] });
  if (dock && dock.docked) { const d = dockedLine(state); if (d) lines.push(d); }
  else if (dock && dock.ready) lines.push({ text: view.post === 'captain' ? 'PRESS E TO DOCK' : 'IN POSITION TO DOCK', color: COL.ion[3], border: COL.ion[1] });
  else if (dock && dock.tooFast) lines.push({ text: 'TOO FAST TO DOCK', color: COL.ochre[2], border: COL.ochre[0] });
  else if (dock && view.post === 'captain') lines.push({ text: 'DOCKING  ·  HOLD COURSE', color: COL.ion[2], border: COL.ion[0] });
  const alert = shipAlert(state); if (alert) lines.push(alert);
  if (state.raid) { const st = state.stations.find((x) => x.id === state.raid.station); if (st) lines.push({ text: `DISTRESS CALL  ·  ${st.name}  ·  ${Math.round(dist(ship.x, ship.y, st.x, st.y) / 10)} M  ·  ${fmtTime(state.raid.timer)}`, color: COL.ochre[3], border: COL.ochre[1] }); }
  const alarm = alarmText(state); if (alarm) lines.push({ text: alarm, color: COL.ember[2], border: COL.ember[0] });
  lines.slice(0, 2).forEach((l, i) => label(ctx, font, VIEW_W / 2, 8 + i * 16, l.text, { anchor: 'c', fg: l.color, border: l.border }));
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
    if (has(ship, 'bay')) label(ctx, font, 306, 333, ship.dartsOut ? `DARTS OUT  ${state.darts.length}  ·  R RECALL` : `DARTS  ${ship.dartStock}  ·  R LAUNCH`, { fg: ship.dartsOut ? COL.ion[2] : COL.text, border: ship.dartsOut ? COL.ion[0] : COL.line });
    font.draw(ctx, has(ship, 'boost') ? 'W S THROTTLE  ·  A D TURN  ·  SHIFT BOOST  ·  E DOCK' : 'W S THROTTLE  ·  A D TURN  ·  X STOP  ·  E DOCK', VIEW_W - 8, 346, ship.boosting ? COL.ion[2] : COL.faint, { align: 'r' });
  } else if (view.post === 'gunner') {
    const off = weaponPower(ship) <= 0, names = { pulse: 'PULSE', heavy: 'HEAVY', rockets: 'ROCKETS  ' + ship.rockets };
    let x = 150;
    for (const w of weaponsOf(ship)) {
      const sel = ship.weapon === w && !off;
      x = label(ctx, font, x, 333, names[w], { fg: sel ? COL.out : ship.weapon === w ? COL.dim : COL.text, bg: sel ? COL.gunner : COL.panel, border: sel ? null : COL.line, pad: 6 }) + 4;
    }
    if (ship.weapon === 'heavy' && !off) { bar(ctx, x + 4, 337, 60, ship.charge, ship.charge >= 1 ? COL.ion[3] : COL.ion[1], 7); font.draw(ctx, ship.charge >= 1 ? 'RELEASE' : 'HOLD', x + 70, 338, ship.charge >= 1 ? COL.ion[3] : COL.dim); }
    if (off) label(ctx, font, x + 4, 333, 'WEAPONS OFFLINE  ·  NO POWER', { fg: COL.ember[2], border: COL.ember[0] });
    font.draw(ctx, weaponsOf(ship).length > 1 ? 'MOUSE AIM  ·  CLICK FIRE  ·  Q E WEAPON' : 'MOUSE AIM  ·  CLICK OR SPACE TO FIRE', VIEW_W - 8, 346, COL.faint, { align: 'r' });
    const m = view.mouse; ctx.fillStyle = COL.ochre[3];
    for (const [dx, dy, w, h] of [[-7, 0, 4, 1], [4, 0, 4, 1], [0, -7, 1, 4], [0, 4, 1, 4]]) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h);
  }
  drawPowerMini(ctx, font, state, VIEW_W - 126, 332);
  drawMiniMap(ctx, state, VIEW_W - 70, 44);
  font.draw(ctx, 'M  MAP', VIEW_W - 8, 110, COL.faint, { align: 'r' });
}

export function drawOverlay(ctx, font, title, lines, color = COL.text) {
  ctx.globalAlpha = 0.72; ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  font.draw(ctx, title, VIEW_W / 2, 130, color, { align: 'c', scale: 3 });
  lines.forEach((l, i) => font.draw(ctx, l, VIEW_W / 2, 176 + i * 14, i === lines.length - 1 ? COL.text : COL.dim, { align: 'c' }));
}

const HELP = [
  ['ALL POSTS', '1 2 3 OR TAB  SWITCH POST     P  PAUSE     H  HELP     M  MAP     F  USE WHAT YOU ARE DOCKED AT'],
  ['CAPTAIN', 'W S  THROTTLE     A D  TURN     X  FULL STOP     E  DOCK AND UNDOCK     R  DARTS     SHIFT  BOOST'],
  ['', 'ON THE MAP  CLICK A STAR CHART TO JUMP TO THAT SECTOR'],
  ['GUNNER', 'MOUSE  AIM     CLICK OR SPACE  FIRE     Q E  CHANGE WEAPON'],
  ['ENGINEER', 'CLICK A PIP  SET POWER     CLICK A NODE  SEND THE REPAIR CREW     SHIFT CLICK  QUEUE'],
  ['', 'Q  SCANNER PULSE     B  DROP A BUOY     ON THE MAP  CLICK TO SEND A PROBE'],
  ['BOARDING', 'W A S D  MOVE     MOUSE  AIM     CLICK  FIRE     G  GRENADE     F  USE     C  CHARGE     T  TURRET'],
  ['', 'N  SOUND ON AND OFF     A GAMEPAD WORKS TOO'],
];
export function drawHelp(ctx, font, y0 = 96) {
  rect(ctx, 30, y0 - 18, 580, 186, COL.panel, COL.line);
  font.draw(ctx, 'CONTROLS', 42, y0 - 6, COL.text);
  HELP.forEach(([who, text], i) => {
    const y = y0 + 14 + i * 16;
    if (who) font.draw(ctx, who, 42, y, COL[who.toLowerCase()] || COL.text);
    font.draw(ctx, text, 110, y, COL.dim);
  });
  font.draw(ctx, 'A POST YOU LEAVE KEEPS DOING WHAT YOU SET IT TO.', 42, y0 + 150, COL.faint);
}

export function drawTitle(ctx, font, assets, t) {
  font.draw(ctx, 'CRITICAL ST8', VIEW_W / 2, 30, COL.text, { align: 'c', scale: 5 });
  font.draw(ctx, 'ONE SHIP  ·  THREE POSTS  ·  FIVE SECTORS  ·  SOLO BUILD', VIEW_W / 2, 72, COL.ion[1], { align: 'c' });
  drawHelp(ctx, font, 106);
  if (Math.floor(t * 2) % 2 === 0) font.draw(ctx, 'PRESS ENTER TO LAUNCH', VIEW_W / 2, 302, COL.ochre[2], { align: 'c', scale: 2 });
  font.draw(ctx, 'PRESS T FOR TEST MODE  ·  EVERYTHING UNLOCKED FROM THE START', VIEW_W / 2, 326, COL.ion[1], { align: 'c' });
  font.draw(ctx, 'EARLY VERSION  ·  ONLINE PLAY COMES LATER', VIEW_W / 2, 344, COL.faint, { align: 'c' });
}
