// Heads-up display on top of the space view, plus overlays shared by all screens.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { THINGS } from '../sim/kinds.js';
import { nodeStatus, speedOf, weaponPower } from '../sim/ship.js';
import { WEAPONS, weaponsOf } from '../sim/weapons.js';
import { POSTS, playerById, holderOf } from '../sim/players.js';
import { findDock, findThing, nameOf } from '../sim/things.js';
import { isTrading } from '../sim/stations.js';
import { currentSector } from '../sim/sectors.js';
import { has, hullMax, shieldMax, dockShieldMax, fuelMax, jumpCharge } from '../sim/upgrades.js';
import { dist } from '../sim/util.js';
import { rect, label, bar } from './draw.js';
import { drawMiniMap } from './map.js';
import { drawEngineerStrip } from './engineer.js';
import { RISK } from './looks.js';
import { drawTargets, drawCourse } from './instruments.js';

const fmtTime = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
// Colours for the status lines at the top: calm, a warning, an alarm, good news.
const CALM = { color: COL.ion[2], border: COL.ion[0] };
const READY = { color: COL.ion[3], border: COL.ion[1] };
const WARM = { color: COL.ochre[2], border: COL.ochre[0] };
const ALARM = { color: COL.ember[2], border: COL.ember[0] };

// The three posts. The player's own is lit, and one held by someone else carries their name.
export function drawTabs(ctx, font, state, view) {
  const me = playerById(state, view.playerId);
  let x = 8;
  POSTS.forEach((post, i) => {
    const mine = me.post === post;
    const holder = holderOf(state, post);
    const other = holder && !mine ? '  ' + holder.name : '';
    const look = mine ? { fg: COL.out, bg: COL[post], border: null } : { fg: COL.dim, bg: COL.panel, border: COL.line };
    x = label(ctx, font, x, 8, `${i + 1}  ${post.toUpperCase()}${other}`, look) + 4;
  });
  return x;
}

export function shipAlert(state) {
  const ship = state.ship;
  const critical = ship.nodes.find((n) => nodeStatus(n.hp) === 'critical');
  if (critical) return { text: critical.name + ' CRITICAL', ...ALARM };
  if (ship.hull < hullMax(ship) * 0.3) return { text: 'HULL CRITICAL', ...ALARM };
  if (ship.fuel <= 0) return { text: 'OUT OF FUEL  ·  ADRIFT', ...ALARM };
  return null;
}

// The enemy alarm line, or null when there is nothing to warn about.
export function alarmText(state) {
  if (!has(state.ship, 'alarm') || state.alarm.count === 0) return null;
  const n = state.alarm.count;
  const eta = Math.round(state.alarm.eta);
  return `ENEMY ALARM  ·  ${n} ${n === 1 ? 'HOSTILE' : 'HOSTILES'}  ·  ${eta > 0 ? eta + ' S OUT' : 'HERE'}`;
}

export function drawBars(ctx, font, state, x = 8, y = 314) {
  const ship = state.ship;
  const rows = [
    ['FUEL', ship.fuel / fuelMax(ship), ship.fuel < fuelMax(ship) * 0.2 ? COL.ember[1] : COL.ochre[2]],
    ['SHIELD', ship.shield / shieldMax(ship), COL.ion[1]],
    ['HULL', ship.hull / hullMax(ship), ship.hull < hullMax(ship) * 0.3 ? COL.ember[1] : COL.steel[2]],
  ];
  rect(ctx, x, y, 136, 40, COL.panel, COL.line);
  rows.forEach(([name, frac, color], i) => {
    font.draw(ctx, name, x + 4, y + 5 + i * 12, COL.dim);
    bar(ctx, x + 46, y + 5 + i * 12, 84, frac, color);
  });
  // A docked ship is lent an extra shield. It shows as a bright line on top of the shield bar.
  if (ship.dockShield > 0) {
    const w = Math.round(82 * (ship.dockShield / dockShieldMax(ship)));
    rect(ctx, x + 47, y + 15, w, 1.5, COL.ion[3]);
    font.draw(ctx, '+', x + 38, y + 17, COL.ion[3]);
  }
}

export function drawToasts(ctx, font, view, time, y = 44, x = VIEW_W / 2) {
  view.toasts = view.toasts.filter((t) => t.until > time);
  view.toasts.slice(-3).forEach((t, i) => {
    label(ctx, font, x, y + i * 16, t.text, { anchor: 'c', fg: t.color || COL.text, border: COL.line });
  });
}

// The system that a post depends on, and how much power the Engineer has given it. The Captain and the
// Gunner see only their own. The Engineer sets them all and sees them where that is done.
const OWN_SYSTEM = {
  captain: { sys: 'engines', name: 'ENGINES', color: COL.captain },
  gunner: { sys: 'weapons', name: 'WEAPONS', color: COL.gunner },
};
function drawOwnPower(ctx, font, state, post) {
  const own = OWN_SYSTEM[post];
  if (!own) return;
  const power = state.ship.power[own.sys];
  const x = VIEW_W - 8 - B.POWER_MAX_PER_SYSTEM * 7;
  font.draw(ctx, power ? own.name : own.name + '  NO POWER', x - 5, 332, power ? COL.dim : COL.ember[2], {
    align: 'r',
  });
  for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) {
    rect(ctx, x + k * 7, 332, 6, 6, k < power ? own.color : '#1c1c28', COL.out);
  }
}

// What to show at the top when the ship is docked.
function dockedLine(state, me) {
  const ship = state.ship;
  const t = findDock(state, ship.docked);
  if (!t) return null;
  const inside = state.players.filter((p) => p.inside === t.id).length;
  if (inside && t.interior && t.interior.trade) {
    return { text: `${inside} ABOARD ${t.name}  ·  UNDOCKING CALLS THEM BACK`, ...WARM };
  }
  if (inside) {
    const who = inside === 1 ? 'THEM' : 'THEM ALL';
    return { text: `${inside} INSIDE  ·  UNDOCKING TELEPORTS ${who} HOME`, ...WARM };
  }
  if (isTrading(t)) return { text: `DOCKED AT ${t.name}`, ...CALM };
  if (t.closed) return { text: `DOCKED AT ${t.name}  ·  THEY WILL NOT LET YOU ABOARD`, ...WARM };
  const what = nameOf(t);
  const kind = THINGS[t.kind];
  if (t.lock !== 'open' && t.breakin && t.breakin.started) {
    const left = fmtTime(Math.max(0, Math.ceil(t.breakin.time)));
    return { text: `${what}  ·  THE LOCK IS RUNNING  ·  ${left}`, ...WARM };
  }
  if (t.lock !== 'open') {
    // The target scanner tells how dangerous it is in there.
    const risk = has(ship, 'tscan') && kind.inside ? `  ·  RISK ${RISK[t.difficulty]}` : '';
    return { text: `DOCKED AT ${what}  ·  LOCKED` + risk, ...CALM };
  }
  if (me.tele > 0) return { text: `DOCKED AT ${what}  ·  TELEPORTER CHARGING  ${Math.ceil(me.tele)} S`, ...CALM };
  return { text: `DOCKED AT ${what}  ·  THE LOCK IS OPEN`, ...CALM };
}

// Status lines at the top centre, most urgent first.
function statusLines(state, me, dock) {
  const ship = state.ship;
  const captain = me.post === 'captain';
  const lines = [];
  // Why the ship does not answer when the engines have been given no power. The Gunner is told the same about
  // the weapons next to them, see drawGunnerPanel.
  if (captain && ship.power.engines <= 0) lines.push({ text: 'ENGINES OFFLINE  ·  NO POWER', ...ALARM });
  if (state.jump) {
    const left = Math.ceil(jumpCharge(ship) - state.jump.t);
    lines.push({ text: `JUMPING TO ${state.sectors[state.jump.to].name} IN ${left} S`, ...READY });
  }
  if (dock && dock.docked) lines.push(dockedLine(state, me));
  else if (dock && dock.ready) lines.push({ text: 'IN POSITION TO DOCK', ...READY });
  else if (dock && dock.tooFast) lines.push({ text: 'TOO FAST TO DOCK', ...WARM });
  else if (dock && captain) lines.push({ text: 'DOCKING  ·  HOLD COURSE', ...CALM });
  lines.push(shipAlert(state));
  const raided = state.raid && findThing(state, state.raid.station);
  if (raided) {
    const far = Math.round(dist(ship.x, ship.y, raided.x, raided.y) / 10);
    const text = `DISTRESS CALL  ·  ${raided.name}  ·  ${far} M  ·  ${fmtTime(state.raid.timer)}`;
    lines.push({ text, color: COL.ochre[3], border: COL.ochre[1] });
  }
  const alarm = alarmText(state);
  if (alarm) lines.push({ text: alarm, ...ALARM });
  return lines.filter(Boolean);
}

function drawCaptainPanel(ctx, font, state) {
  const ship = state.ship;
  rect(ctx, 150, 326, 150, 28, COL.panel, COL.line);
  font.draw(ctx, 'THROTTLE', 154, 331, COL.dim);
  // The throttle bar has a mark at zero, with reverse to the left of it.
  const bx = 208;
  const bw = 86;
  const zero = bx + Math.round((bw * B.REVERSE) / (1 + B.REVERSE));
  rect(ctx, bx, 331, bw, 6, '#1c1c28', COL.out);
  const ahead = Math.round((bw - zero + bx - 1) * Math.max(0, ship.throttle));
  const astern = Math.round(((zero - bx - 1) * Math.max(0, -ship.throttle)) / B.REVERSE);
  if (ahead > 0) rect(ctx, zero, 332, ahead, 4, COL.captain);
  if (astern > 0) rect(ctx, zero - astern, 332, astern, 4, COL.ochre[1]);
  rect(ctx, zero, 330, 1, 8, COL.text);
  font.draw(ctx, 'SPEED', 154, 343, COL.dim);
  font.draw(ctx, String(Math.round(speedOf(ship))), 208, 343, COL.text);
  if (has(ship, 'bay')) {
    const out = ship.dartsOut;
    // Darts cannot leave the bay while the ship is docked.
    const launch = ship.docked ? 'UNDOCK TO LAUNCH' : 'R LAUNCH';
    const text = out ? `DARTS OUT  ${state.darts.length}  ·  R RECALL` : `DARTS  ${ship.dartStock}  ·  ${launch}`;
    label(ctx, font, 306, 333, text, { fg: out ? COL.ion[2] : COL.text, border: out ? COL.ion[0] : COL.line });
  }
  const keys = has(ship, 'boost')
    ? 'W S THROTTLE  ·  A D TURN  ·  X STOP  ·  SHIFT BOOST'
    : 'W S THROTTLE  ·  A D TURN  ·  X STOP';
  font.draw(ctx, keys, VIEW_W - 8, 346, ship.boosting ? COL.ion[2] : COL.faint, { align: 'r' });
}

const CROSSHAIR = [
  [-7, 0, 4, 1],
  [4, 0, 4, 1],
  [0, -7, 1, 4],
  [0, 4, 1, 4],
];
function drawGunnerPanel(ctx, font, state, view) {
  const ship = state.ship;
  const offline = weaponPower(ship) <= 0;
  const weapons = weaponsOf(ship);
  let x = 150;
  for (const id of weapons) {
    const w = WEAPONS[id];
    const picked = ship.weapon === id;
    const lit = picked && !offline;
    const text = w.ammo ? `${w.name}  ${w.ammo(ship)}` : w.name;
    const look = lit ? { fg: COL.out, bg: COL.gunner, border: null } : { fg: picked ? COL.dim : COL.text };
    x = label(ctx, font, x, 333, text, { ...look, pad: 6 }) + 4;
  }
  if (WEAPONS[ship.weapon].charges && !offline) {
    const full = ship.charge >= 1;
    bar(ctx, x + 4, 337, 60, ship.charge, full ? COL.ion[3] : COL.ion[1], 7);
    font.draw(ctx, full ? 'RELEASE' : 'HOLD', x + 70, 338, full ? COL.ion[3] : COL.dim);
  }
  if (offline) label(ctx, font, x + 4, 333, 'WEAPONS OFFLINE  ·  NO POWER', { fg: ALARM.color, border: ALARM.border });
  const keys = weapons.length > 1 ? 'MOUSE AIM  ·  CLICK FIRE  ·  Q E WEAPON' : 'MOUSE AIM  ·  CLICK OR SPACE TO FIRE';
  font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of CROSSHAIR)
    ctx.fillRect(Math.round(view.mouse.x) + dx, Math.round(view.mouse.y) + dy, w, h);
}

export function drawHud(ctx, state, view, assets, dock) {
  const { font } = assets;
  const me = playerById(state, view.playerId);
  drawTabs(ctx, font, state, view);
  const credits = (state.test ? 'TEST MODE   ' : '') + 'CREDITS  ' + state.credits;
  label(ctx, font, VIEW_W - 8, 8, credits, { anchor: 'r', fg: COL.ochre[2] });
  const where = `${currentSector(state).name}   KILLS  ${state.kills}   ${fmtTime(state.time)}`;
  label(ctx, font, VIEW_W - 8, 24, where, { anchor: 'r', fg: COL.dim });
  statusLines(state, me, dock)
    .slice(0, 2)
    .forEach((l, i) =>
      label(ctx, font, VIEW_W / 2, 8 + i * 16, l.text, { anchor: 'c', fg: l.color, border: l.border }),
    );
  drawBars(ctx, font, state);
  if (me.post === 'captain') {
    drawCaptainPanel(ctx, font, state);
    drawCourse(ctx, font, state, view, view.cam);
  } else if (me.post === 'gunner') {
    drawTargets(ctx, font, state, view.cam);
    drawGunnerPanel(ctx, font, state, view);
  } else if (me.post === 'engineer') {
    drawEngineerStrip(ctx, font, state, view);
    font.draw(ctx, 'Q PULSE  ·  B BUOY', VIEW_W - 8, 346, COL.faint, { align: 'r' });
  } else if (!me.post) font.draw(ctx, '1 2 3  TAKE A FREE POST', VIEW_W - 8, 346, COL.faint, { align: 'r' });
  drawOwnPower(ctx, font, state, me.post);
  drawMiniMap(ctx, state, VIEW_W - 70, 44);
  font.draw(ctx, 'M  MAP', VIEW_W - 8, 110, COL.faint, { align: 'r' });
}

export function drawOverlay(ctx, font, title, lines, color = COL.text) {
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  font.draw(ctx, title, VIEW_W / 2, 130, color, { align: 'c', scale: 3 });
  lines.forEach((text, i) => {
    font.draw(ctx, text, VIEW_W / 2, 176 + i * 14, i === lines.length - 1 ? COL.text : COL.dim, { align: 'c' });
  });
}

const HELP = [
  ['ALL POSTS', '1 2 3 OR TAB  SWITCH POST     P  PAUSE     H  HELP     M  MAP     F  USE WHAT YOU ARE DOCKED AT'],
  ['CAPTAIN', 'W S  THROTTLE     A D  TURN     X  FULL STOP     E  DOCK AND UNDOCK     R  DARTS     SHIFT  BOOST'],
  ['', 'C  SET A COURSE FOR THE NEXT PLACE ON THE MAP'],
  ['', 'ON THE MAP  CLICK A STAR CHART TO JUMP TO THAT SECTOR'],
  ['GUNNER', 'MOUSE  AIM     CLICK OR SPACE  FIRE     Q E  CHANGE WEAPON'],
  ['ENGINEER', 'CLICK A PIP  SET POWER     CLICK A NODE  SEND THE REPAIR CREW     SHIFT CLICK  QUEUE'],
  ['', 'V  OPEN AND FOLD AWAY THE PANEL     Q  SCANNER PULSE     B  DROP A BUOY     ON THE MAP  CLICK FOR A PROBE'],
  ['BOARDING', 'W A S D  MOVE     MOUSE  AIM     CLICK  FIRE     G  GRENADE     F  USE     C  CHARGE     T  TURRET'],
  ['', 'IN THE DARK  L  LAMP ON AND OFF     Q  THROW A FLARE'],
  ['', 'O  MENU: SAVE, LOAD AND SOUND     N  ALL SOUND ON AND OFF     A GAMEPAD WORKS TOO'],
  ['TEST MODE', '7  PIRATE FIGHTERS     8  PIRATE GUNBOAT     9  A RAID ON A STATION     0  REMOVE ALL PIRATES'],
];
export function drawHelp(ctx, font, y0 = 96) {
  rect(ctx, 30, y0 - 18, 580, 202, COL.panel, COL.line);
  font.draw(ctx, 'CONTROLS', 42, y0 - 6, COL.text);
  HELP.forEach(([who, text], i) => {
    const y = y0 + 14 + i * 16;
    if (who) font.draw(ctx, who, 42, y, COL[who.toLowerCase()] || COL.text);
    font.draw(ctx, text, 110, y, COL.dim);
  });
  font.draw(ctx, 'A POST YOU LEAVE KEEPS DOING WHAT YOU SET IT TO.', 42, y0 + 166, COL.faint);
}
