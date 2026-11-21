// Heads-up display on top of the space view, plus overlays shared by all screens.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { THINGS } from '../sim/kinds.js';
import { nodeStatus, speedOf, weaponPower } from '../sim/ship.js';
import { WEAPONS, weaponsOf } from '../sim/weapons.js';
import { POSTS, playerById, holderOf } from '../sim/players.js';
import { computerAllowed, computerOn } from '../sim/computer.js';
import { findDock, findThing, nameOf } from '../sim/things.js';
import { isTrading, allStations } from '../sim/stations.js';
import { RISK_NAMES } from '../sim/siege.js';
import { enemies, CREW } from '../sim/sides.js';
import { currentSector } from '../sim/sectors.js';
import { has, hullMax, shieldMax, dockShieldMax, fuelMax, jumpCharge, fuelMarks, dartsMax } from '../sim/upgrades.js';
import { dist } from '../sim/util.js';
import { rect, label, bar } from './draw.js';
import { drawMiniMap } from './map.js';
import { drawEngineerStrip } from './engineer.js';
import { RISK } from './looks.js';
import { drawTargets, drawCourse, drawMarks, surgeLine } from './instruments.js';
import { shownPurse, ROLE_NAME } from '../sim/purses.js';

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
    // The ship's computer runs the post: AUTO on its tab (R-815, R-822).
    const auto = !holder && computerOn(state, post) ? '  AUTO' : '';
    const look = mine ? { fg: COL.out, bg: COL[post], border: null } : { fg: COL.dim, bg: COL.panel, border: COL.line };
    if (auto) look.fg = COL.ion[2];
    x = label(ctx, font, x, 8, `${i + 1}  ${post.toUpperCase()}${other}${auto}`, look) + 4;
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
    // A shield that is switched off is shown dark (R-1129).
    [ship.shieldOn ? 'SHIELD' : 'SH OFF', ship.shield / shieldMax(ship), ship.shieldOn ? COL.ion[1] : COL.steel[1]],
    ['HULL', ship.hull / hullMax(ship), ship.hull < hullMax(ship) * 0.3 ? COL.ember[1] : COL.steel[2]],
  ];
  rect(ctx, x, y, 136, 40, COL.panel, COL.line);
  rows.forEach(([name, frac, color], i) => {
    font.draw(ctx, name, x + 4, y + 5 + i * 12, COL.dim);
    bar(ctx, x + 46, y + 5 + i * 12, 84, frac, color);
  });
  // The fuel gauge is marked where each jump's worth of fuel ends, so that it shows how many jumps the tank
  // holds without a number (F-229). The marks stand out from the bar in the dark, and are lit where it is full.
  for (const at of fuelMarks(ship)) {
    const mx = x + 46 + Math.round(84 * at);
    rect(ctx, mx, y + 4, 1, 8, ship.fuel / fuelMax(ship) >= at ? COL.out : COL.steel[2]);
  }
  // Ore in the hold, just above the panel. It turns into fuel by itself when the tank is too low for a jump.
  if (ship.ore > 0)
    label(ctx, font, x, y - 14, `ORE  ${ship.ore}${ship.refined > 0 ? '  ·  REFINING' : ''}`, { fg: COL.ochre[3] });
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

// What a post depends on: the system whose power the Engineer sets, and the parts of the ship that run it.
// The Captain and the Gunner see only their own. The Engineer sets and mends them all, and sees them there.
const OWN = {
  captain: { sys: 'engines', power: 'ENGINE POWER', color: COL.captain, parts: ['steering', 'engines'] },
  gunner: { sys: 'weapons', power: 'WEAPON POWER', color: COL.gunner, parts: ['weapons'] },
};
const PART_COL = { ok: COL.engineer, damaged: COL.ochre[2], critical: COL.ember[2] };
// What the repair crew is doing about a part, or nothing.
function mending(ship, i) {
  const crew = ship.crew;
  if (crew.queue[0] === i) return crew.moving || crew.at !== i ? 'CREW ON THE WAY' : 'REPAIRING';
  return crew.queue.includes(i) ? 'REPAIR QUEUED' : null;
}
function drawOwnSystem(ctx, font, state, post) {
  const own = OWN[post];
  if (!own) return;
  const ship = state.ship;
  const power = ship.power[own.sys];
  const x = VIEW_W - 8 - B.POWER_MAX_PER_SYSTEM * 7;
  font.draw(ctx, power ? own.power : own.power + '  NONE', x - 5, 332, power ? COL.dim : COL.ember[2], { align: 'r' });
  for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) {
    rect(ctx, x + k * 7, 332, 6, 6, k < power ? own.color : '#1c1c28', COL.out);
  }
  // Above it, each part with how whole it is. A critical one blinks slowly, see "Lagar och regler" in HANDOFF.md.
  own.parts.forEach((id, row) => {
    const i = ship.nodes.findIndex((n) => n.id === id);
    const n = ship.nodes[i];
    const st = nodeStatus(n.hp);
    const y = 321 - (own.parts.length - 1 - row) * 11;
    const dimmed = st === 'critical' && state.time % 1.2 < 0.5;
    const color = dimmed ? COL.ember[0] : PART_COL[st];
    const work = mending(ship, i);
    const text = `${n.name}  ${Math.round(n.hp)}%` + (work ? '  ·  ' + work : '');
    font.draw(ctx, text, x - 5, y, work && st !== 'critical' ? COL.ochre[3] : color, { align: 'r' });
    bar(ctx, x, y, B.POWER_MAX_PER_SYSTEM * 7 - 1, n.hp / 100, color, 5);
  });
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

// The lines at the top centre (D-187, MD1, MD5): danger first, which nothing else can push away, then the state of
// things that concern this player's post. What the sensors know of the surroundings is in the strip at the right.
export function statusLines(state, me, dock) {
  return [...dangerLines(state), ...stateLines(state, me, dock)].filter(Boolean);
}

// Danger: what can cost the ship, a station of the crew's or someone aboard, for everyone.
function dangerLines(state) {
  const lines = [shipAlert(state)];
  const siege = state.siege;
  if (siege && siege.level >= RISK_NAMES.length - 1) lines.push(siegeLine(state));
  if (has(state.ship, 'alarm') && state.alarm.count > 0 && state.alarm.eta <= 0)
    lines.push({ text: alarmText(state), ...ALARM });
  return lines.filter(Boolean);
}

// The state of things: the post's own (MD5), and what the whole ship is doing.
function stateLines(state, me, dock) {
  const ship = state.ship;
  const captain = me.post === 'captain';
  const lines = [];
  // Why the ship does not answer when the engines have been given no power. The Gunner is told the same about
  // the weapons next to them, see drawGunnerPanel.
  if (captain && ship.power.engines <= 0) lines.push({ text: 'ENGINES OFFLINE  ·  NO POWER', ...ALARM });
  // An overcharge that waits for this post comes first.
  lines.push(surgeLine(state, me.post));
  if (state.jump) {
    const left = Math.ceil(jumpCharge(ship) - state.jump.t);
    lines.push({ text: `JUMPING TO ${state.sectors[state.jump.to].name} IN ${left} S`, ...READY });
  }
  // Docked is for everyone, since anyone may go aboard; getting there is the Captain's.
  if (dock && dock.docked) lines.push(dockedLine(state, me));
  else if (captain && dock && dock.ready) lines.push({ text: 'IN POSITION TO DOCK', ...READY });
  else if (captain && dock && dock.tooFast) lines.push({ text: 'TOO FAST TO DOCK', ...WARM });
  else if (dock && captain) lines.push({ text: 'DOCKING  ·  HOLD COURSE', ...CALM });
  return lines;
}

function siegeLine(state) {
  const siege = state.siege;
  const found = allStations(state).find((x) => x.st.id === siege.station);
  const where = found && found.sector !== state.sector ? '  ·  ' + state.sectors[found.sector].name : '';
  const text = `${found ? found.st.name : 'YOUR STATION'} UNDER ATTACK${where}  ·  RISK ${RISK_NAMES[siege.level]}`;
  return { text, color: COL.ember[2], border: COL.ember[0] };
}

// The sensor strip (D-187, MD2, MD3): what the ship knows of its surroundings, under the credits at the right. What
// can be seen on the screen is always there; what lies beyond needs the sensors bought for it, as before.
export function sensorLines(state) {
  const ship = state.ship;
  const lines = [];
  const seen = state.vessels.filter(
    (v) => v.hp > 0 && enemies(state, v.side, CREW) && Math.abs(v.x - ship.x) < 360 && Math.abs(v.y - ship.y) < 210,
  ).length;
  if (seen) lines.push({ text: `${seen} HOSTILE${seen > 1 ? 'S' : ''} IN SIGHT`, color: COL.ember[2] });
  if (has(ship, 'alarm') && state.alarm.count > 0 && state.alarm.eta > 0)
    lines.push({ text: alarmText(state), color: COL.ochre[2] });
  const raided = state.raid && findThing(state, state.raid.station);
  if (raided) {
    const far = Math.round(dist(ship.x, ship.y, raided.x, raided.y) / 10);
    lines.push({
      text: `DISTRESS  ·  ${raided.name}  ·  ${far} M  ·  ${fmtTime(state.raid.timer)}`,
      color: COL.ochre[3],
    });
  }
  const siege = state.siege;
  if (siege && siege.level >= 0 && siege.level < RISK_NAMES.length - 1)
    lines.push({ ...siegeLine(state), border: null });
  if (state.bounty) lines.push({ text: `BOUNTY ON YOU  ·  ${state.bounty.amount} CR`, color: COL.ochre[2] });
  return lines;
}
function drawSensors(ctx, font, state) {
  sensorLines(state)
    .slice(0, 4)
    .forEach((l, i) => font.draw(ctx, l.text, VIEW_W - 8, 124 + i * 12, l.color, { align: 'r' }));
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
  const keys = has(ship, 'boost')
    ? 'W S THROTTLE  ·  A D TURN  ·  X STOP  ·  SHIFT AFTERBURNER'
    : 'W S THROTTLE  ·  A D TURN  ·  X STOP';
  font.draw(ctx, keys, VIEW_W - 8, 346, ship.boosting ? COL.ion[2] : COL.faint, { align: 'r' });
  // With no one on the Gunner's post the Captain has the guns too (R-1256, F-291).
  if (!holderOf(state, 'gunner') && weaponsOf(ship).length) {
    const w = WEAPONS[ship.weapon];
    const name = w ? (w.ammo ? `${w.name}  ${w.ammo(ship)}` : w.name) : 'NO WEAPON';
    const off = weaponPower(ship) <= 0;
    const wide = font.draw(
      ctx,
      `GUNS  ${name}${off ? '  ·  NO POWER' : ''}`,
      154,
      314,
      off ? COL.ember[2] : COL.gunner,
    );
    font.draw(ctx, '  ·  CLICK FIRE  ·  WHEEL WEAPON', 154 + wide, 314, COL.faint);
  }
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
  // The Gunner sends the Darts out and calls them home (R-1187). Darts cannot leave the bay while docked.
  if (has(ship, 'bay')) {
    const out = ship.dartsOut;
    const launch = ship.docked ? 'UNDOCK TO LAUNCH' : 'R LAUNCH';
    // How many are whole, and when the next lost one is built again (F-255).
    const whole = ship.dartStock + state.darts.length;
    const max = dartsMax(ship);
    const next = whole < max ? `  ·  NEXT IN ${Math.ceil(B.DART_REGEN - ship.dartRegen)} S` : '';
    const text = out
      ? `DARTS OUT  ${state.darts.length} OF ${max}  ·  R RECALL${next}`
      : `DARTS  ${ship.dartStock} OF ${max}  ·  ${launch}${next}`;
    label(ctx, font, 150, 314, text, { fg: out ? COL.ion[2] : COL.text, border: out ? COL.ion[0] : COL.line });
  }
  const keys =
    weapons.length > 1 ? 'MOUSE AIM  ·  CLICK FIRE  ·  Q OR WHEEL WEAPON' : 'MOUSE AIM  ·  CLICK OR SPACE TO FIRE';
  font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of CROSSHAIR)
    ctx.fillRect(Math.round(view.mouse.x) + dx, Math.round(view.mouse.y) + dy, w, h);
}

export function drawHud(ctx, state, view, assets, dock) {
  const { font } = assets;
  const me = playerById(state, view.playerId);
  drawTabs(ctx, font, state, view);
  const purse = shownPurse(state, me);
  const credits = (state.test ? 'TEST MODE   ' : '') + `${ROLE_NAME[purse.role]}  ${purse.credits} CR`;
  label(ctx, font, VIEW_W - 8, 8, credits, { anchor: 'r', fg: COL.ochre[2] });
  const where = `${currentSector(state).name}   KILLS  ${state.kills}   ${fmtTime(state.time)}`;
  label(ctx, font, VIEW_W - 8, 24, where, { anchor: 'r', fg: COL.dim });
  statusLines(state, me, dock)
    .slice(0, 2)
    .forEach((l, i) =>
      label(ctx, font, VIEW_W / 2, 8 + i * 16, l.text, { anchor: 'c', fg: l.color, border: l.border }),
    );
  drawBars(ctx, font, state);
  drawMarks(ctx, font, state, view.cam, me.post);
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
  drawOwnSystem(ctx, font, state, me.post);
  // Where the computer may run this post: K switches it, and whether it is on (R-1257).
  if (me.post && computerAllowed(state, me.post)) {
    const on = computerOn(state, me.post);
    const text = `K  SHIP'S COMPUTER ${on ? 'ON  ·  RUNS THIS POST WHEN YOU LEAVE' : 'OFF'}`;
    font.draw(ctx, text, 8, 298, on ? COL.ion[2] : COL.faint);
  }
  drawMiniMap(ctx, state, VIEW_W - 70, 44);
  drawSensors(ctx, font, state);
  font.draw(ctx, 'M  MAP    J  STARS', VIEW_W - 8, 110, COL.faint, { align: 'r' });
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

// One line each, short enough for the box (R-1239).
const HELP = [
  ['ALL POSTS', '1 2 3 OR TAB  SWITCH POST     P  PAUSE     H  HELP     M  MAP     J  STAR MAP'],
  ['', 'I  STORES     L  LOG     E  GO ABOARD WHERE DOCKED     O  MENU     N  SOUND'],
  ['', "K  THE SHIP'S COMPUTER ON OR OFF ON THIS POST, WHERE IT WAS ALLOWED AT THE START"],
  ['', 'Z  CHARGE THE BOOST, THE CAPTAIN LETS IT GO     T  MARK A SHIP FOR THE OTHERS'],
  ['CAPTAIN', 'W S  THROTTLE     A D  TURN     X  FULL STOP     Q  DOCK AND UNDOCK'],
  ['', 'R  DARTS     SHIFT  AFTERBURNER     C  COURSE TO THE NEXT PLACE ON THE MAP'],
  ['', 'ON THE STAR MAP  PICK A SYSTEM NEXT TO THIS ONE, AND WHERE TO ARRIVE'],
  ['', 'NO ONE ON GUNNER  MOUSE  AIM     CLICK OR SPACE  FIRE     WHEEL  WEAPON'],
  ['GUNNER', 'MOUSE  AIM     CLICK OR SPACE  FIRE     Q OR THE WHEEL  CHANGE WEAPON'],
  ['', 'X  SHIELD ON AND OFF     R  DARTS OUT AND HOME'],
  ['ENGINEER', 'CLICK A PIP  SET POWER     CLICK A NODE  REPAIR CREW     SHIFT CLICK  QUEUE'],
  ['', 'V  FOLD THE PANEL     Q  SCANNER PULSE     B  BUOY     CLICK THE MAP  PROBE'],
  ['', 'WHEEL  MORE OR LESS POWER TO THE SYSTEM UNDER THE POINTER, OR THE ONE PICKED'],
  ['BOARDING', 'W A S D  MOVE     MOUSE  AIM     CLICK  FIRE     G  GRENADE     E  USE'],
  ['', 'C  CHARGE     T  TURRET     F  LAMP     Q  FLARE     R OR WHEEL  TRANQ GUN AND BACK'],
  ['', 'E  PICK UP ONE THING     X  PUT DOWN ALL     SHIFT  RUN, WITH NOTHING CARRIED'],
  ['', 'E BY A SLEEPING GUARD  TAKE IT DOWN     A GAMEPAD WORKS TOO'],
  ['TEST MODE', '6  ATTACK ON YOUR BASE   7  FIGHTERS   8  GUNBOAT   9  RAID   0  NO PIRATES'],
  ['', 'A POST YOU LEAVE KEEPS DOING WHAT YOU SET IT TO.'],
];
export function drawHelp(ctx, font, y0 = 96) {
  // The box grows with the list, and is moved up when it would reach below the screen.
  const h = HELP.length * 15 + 44;
  const top = Math.min(y0 - 18, VIEW_H - 6 - h);
  rect(ctx, 30, top, 580, h, COL.panel, COL.line);
  font.draw(ctx, 'CONTROLS', 42, top + 12, COL.text);
  HELP.forEach(([who, text], i) => {
    const y = top + 30 + i * 15;
    if (who) font.draw(ctx, who, 42, y, COL[who.toLowerCase()] || COL.text);
    font.draw(ctx, text, 110, y, COL.dim);
  });
}
