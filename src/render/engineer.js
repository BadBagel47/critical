// The Engineer post: a blueprint of the ship with damage nodes, and the power panel.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B, WING_MOUNTS } from '../sim/balance.js';
import { nodeStatus, nodeFactor, powerAvailable, powerUsed } from '../sim/ship.js';
import { rect, label, dashed } from './draw.js';
import { drawTabs, drawBars } from './hud.js';
import { drawTools } from './map.js';
import { powerTotal, has } from '../sim/upgrades.js';
import { surgeNote } from './instruments.js';

const BX = 150,
  BY = 72,
  PANEL_X = 440;
const SYS = [
  {
    key: 'weapons',
    name: 'WEAPONS',
    color: COL.gunner,
    notes: ['OFFLINE', 'FIRE RATE  LOW', 'FIRE RATE  NORMAL', 'FIRE RATE  HIGH', 'FIRE RATE  MAX'],
  },
  {
    key: 'shields',
    name: 'SHIELDS',
    color: COL.ion[1],
    notes: ['OFFLINE  ·  SHIELD FALLS', 'RECHARGE  SLOW', 'RECHARGE  NORMAL', 'RECHARGE  FAST', 'RECHARGE  MAX'],
  },
  {
    key: 'engines',
    name: 'ENGINES',
    color: COL.captain,
    notes: ['OFFLINE  ·  NO THRUST', 'SPEED  LOW', 'SPEED  NORMAL', 'SPEED  HIGH', 'SPEED  MAX'],
  },
  {
    key: 'repair',
    name: 'REPAIR',
    color: COL.ochre[3],
    notes: ['NO REPAIRS', 'REPAIR  SLOW', 'REPAIR  NORMAL', 'REPAIR  FAST', 'REPAIR  MAX'],
  },
];
const STATUS_COL = { ok: COL.engineer, damaged: COL.ochre[2], critical: COL.ember[1] };
// The upgrades that sit at each part of the ship, with the short names they go by on the drawing. They do
// not break by themselves: when the part is damaged, what they do is weakened with it.
const FITTED = {
  weapons: [
    ['heavy', 'HEAVY LASER'],
    ['twin', 'WING TURRETS'],
    ['rockets', 'ROCKETS'],
    ['tcomp', 'TARGETING'],
    ['tractor', 'TRACTOR'],
  ],
  steering: [
    ['tscan', 'SCANNER'],
    ['alarm', 'ALARM'],
  ],
  reactor: [
    ['core', 'CORE'],
    ['bay', 'BAY'],
    ['drones', 'DRONES'],
    ['dockfield', 'DOCK FIELD'],
  ],
  shields: [
    ['emit', 'EMITTERS'],
    ['armor', 'POINT DEFENSE'],
  ],
  engines: [
    ['boost', 'AFTERBURNER'],
    ['jumpcoil', 'JUMP COILS'],
    ['tank', 'TANK'],
  ],
};
// As many of the names as fit on a line, and how many more there are.
function fitted(font, ship, id, room) {
  const names = FITTED[id].filter(([mod]) => has(ship, mod)).map(([, name]) => name);
  let shown = names.length;
  const line = () => names.slice(0, shown).join('  ·  ') + (shown < names.length ? `  +${names.length - shown}` : '');
  while (shown > 1 && font.width(line()) > room) shown--;
  return line();
}
// What damage to a part does, in the words of the system it weakens.
function effectOf(ship, n) {
  const pct = (f) => Math.round(f * 100) + '%';
  const f = nodeFactor(ship, n.id);
  if (n.id === 'weapons') return 'GUNS AT ' + pct(f);
  if (n.id === 'steering') return 'TURNING AT ' + pct(f);
  if (n.id === 'engines') return 'THRUST AT ' + pct(f);
  if (n.id === 'reactor') return 'POWER  -' + (powerTotal(ship) - powerAvailable(ship));
  return 'SHIELD RECHARGE AT ' + pct(f);
}

export const nodePos = (n) => ({ x: BX + (n.x + 36) * 2, y: BY + (n.y + 54) * 2 });
const rowY = (i) => 54 + i * 40;
const pipRect = (i, k) => ({ x: PANEL_X + 100 + k * 20, y: rowY(i) - 2, w: 16, h: 11 });

// Turn a click on the Engineer screen into a command, or null.
export function engineerClick(state, mx, my, shift) {
  for (let i = 0; i < SYS.length; i++)
    for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) {
      const r = pipRect(i, k);
      if (mx >= r.x - 2 && mx < r.x + r.w + 2 && my >= r.y - 3 && my < r.y + r.h + 3) {
        const cur = state.ship.power[SYS[i].key],
          want = cur === k + 1 ? k : k + 1;
        return {
          power: Array.from({ length: Math.abs(want - cur) }, () => ({
            sys: SYS[i].key,
            delta: Math.sign(want - cur),
          })),
        };
      }
    }
  for (let i = 0; i < state.ship.nodes.length; i++) {
    const p = nodePos(state.ship.nodes[i]);
    if (Math.hypot(mx - p.x, my - p.y) <= 10) return { repair: { node: i, queue: shift } };
  }
  return null;
}
export const SYSTEM_KEYS = SYS.map((s) => s.key);
// The system whose row of pips the pointer is on, or null: the mouse wheel changes its power (F-285).
export function engineerSystemAt(mx, my) {
  for (let i = 0; i < SYS.length; i++) {
    const first = pipRect(i, 0);
    const last = pipRect(i, B.POWER_MAX_PER_SYSTEM - 1);
    if (mx >= first.x - 6 && mx < last.x + last.w + 6 && my >= first.y - 4 && my < first.y + first.h + 4)
      return SYS[i].key;
  }
  return null;
}

// Everything that can be clicked on this screen, by name. Used by the browser test.
export function engineerButtons(state) {
  const pips = SYS.flatMap((s, i) =>
    Array.from({ length: B.POWER_MAX_PER_SYSTEM }, (_, k) => ({ name: `power.${s.key}.${k + 1}`, ...pipRect(i, k) })),
  );
  const nodes = state.ship.nodes.map((n) => {
    const p = nodePos(n);
    return { name: 'node.' + n.id, x: p.x - 6, y: p.y - 6, w: 12, h: 12 };
  });
  return [...pips, ...nodes];
}

export function drawEngineer(ctx, state, view, assets) {
  const { img, font } = assets,
    ship = state.ship,
    crew = ship.crew;
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#12121e';
  for (let x = 0; x < PANEL_X; x += 16) ctx.fillRect(x, 0, 1, VIEW_H);
  for (let y = 0; y < VIEW_H; y += 16) ctx.fillRect(0, y, PANEL_X, 1);
  ctx.drawImage(img.frigate_blueprint, BX, BY);
  // What has been bought and fitted is drawn on the plan, where it sits on the ship.
  ctx.globalAlpha = 0.6;
  for (const m of ['armor', 'emit', 'bay', 'rockets', 'heavy']) {
    if (has(ship, m)) ctx.drawImage(img['mod_' + m], BX, BY, 144, 216);
  }
  if (has(ship, 'twin')) {
    for (const w of WING_MOUNTS)
      ctx.drawImage(img.turret_pulse, BX + (w.x + 36) * 2 - 12, BY + (w.y + 54) * 2 - 21, 24, 42);
  }
  ctx.globalAlpha = 1;
  // Queue path: from the crew through every queued node.
  const cp = crewPos(ship);
  let from = cp;
  crew.queue.forEach((ni, qi) => {
    const p = nodePos(ship.nodes[ni]);
    if (!(qi === 0 && !crew.moving && crew.at === ni)) dashed(ctx, from.x, from.y, p.x, p.y, COL.ochre[1], 2, 3);
    from = p;
  });
  ship.nodes.forEach((n, i) => {
    const p = nodePos(n),
      st = nodeStatus(n.hp),
      c = STATUS_COL[st];
    const lx = 310;
    ctx.fillStyle = st === 'ok' ? '#2f4f58' : c;
    ctx.fillRect(p.x + 8, p.y, lx - 6 - p.x - 8, 1);
    const status = st === 'ok' ? 'OK' : (st === 'damaged' ? 'DAMAGED  ' : 'CRITICAL  ') + Math.round(n.hp) + '%';
    // Under the name and the state: what the damage does, or else what is fitted here.
    font.draw(ctx, n.name, lx, p.y - 9, COL.text);
    font.draw(ctx, status, lx, p.y + 2, c);
    if (st === 'ok') font.draw(ctx, fitted(font, ship, n.id, 124), lx, p.y + 13, COL.faint);
    else font.draw(ctx, effectOf(ship, n), lx, p.y + 13, c);
    ctx.fillStyle = COL.panel;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, 7);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.5, 0, 7);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, 7);
    ctx.fill();
    const qi = crew.queue.indexOf(i);
    if (qi > 0) font.draw(ctx, String(qi + 1), p.x + 9, p.y - 12, COL.ochre[2]);
    // A damaged part blinks: slowly when it is damaged, faster when it is critical.
    const blink = st === 'critical' ? Math.floor(state.time * 4) % 2 === 0 : st === 'damaged' && state.time % 1.6 < 0.8;
    if (blink) {
      ctx.strokeStyle = st === 'critical' ? COL.ember[2] : COL.ochre[2];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10.5, 0, 7);
      ctx.stroke();
    }
  });
  // The repair crew token, with a progress ring while it works.
  const working = !crew.moving && crew.queue[0] === crew.at;
  if (working) {
    const n = ship.nodes[crew.at],
      p = nodePos(n);
    ctx.strokeStyle = COL.ochre[3];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, -Math.PI / 2, -Math.PI / 2 + (n.hp / 100) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = COL.out;
  ctx.beginPath();
  ctx.moveTo(cp.x - 10, cp.y + 14);
  ctx.lineTo(cp.x - 4, cp.y + 7);
  ctx.lineTo(cp.x + 2, cp.y + 14);
  ctx.lineTo(cp.x - 4, cp.y + 21);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COL.ochre[2];
  ctx.beginPath();
  ctx.moveTo(cp.x - 9, cp.y + 14);
  ctx.lineTo(cp.x - 4, cp.y + 8);
  ctx.lineTo(cp.x + 1, cp.y + 14);
  ctx.lineTo(cp.x - 4, cp.y + 20);
  ctx.closePath();
  ctx.fill();
  rect(ctx, cp.x - 5, cp.y + 13, 2, 2, COL.out);
  const crewText = crew.moving
    ? 'REPAIR CREW  ·  ON THE WAY'
    : working
      ? `REPAIR CREW  ·  WORKING ON ${ship.nodes[crew.at].name}  ·  ${Math.round(ship.nodes[crew.at].hp)}%`
      : ship.power.repair === 0
        ? 'REPAIR CREW  ·  NO POWER'
        : 'REPAIR CREW  ·  IDLE, PATCHING HULL';
  font.draw(ctx, crewText, 8, 306, working || crew.moving ? COL.ochre[2] : COL.dim);
  // Power panel.
  rect(ctx, PANEL_X, 0, VIEW_W - PANEL_X, VIEW_H, COL.panel);
  rect(ctx, PANEL_X, 0, 1, VIEW_H, COL.line);
  const avail = powerAvailable(ship),
    used = powerUsed(ship);
  font.draw(ctx, 'POWER', PANEL_X + 12, 30, COL.text);
  font.draw(ctx, `${used} / ${avail}`, VIEW_W - 12, 30, used < avail ? COL.ochre[3] : COL.ochre[1], { align: 'r' });
  rect(ctx, PANEL_X + 12, 42, VIEW_W - PANEL_X - 24, 1, COL.line);
  SYS.forEach((s, i) => {
    const y = rowY(i),
      v = ship.power[s.key];
    rect(ctx, PANEL_X + 10, y - 6, VIEW_W - PANEL_X - 20, 34, '#141420', view.engRow === i ? s.color : COL.line);
    font.draw(ctx, s.name, PANEL_X + 16, y, COL.text);
    for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) {
      const r = pipRect(i, k);
      rect(ctx, r.x, r.y, r.w, r.h, k < v ? s.color : '#1c1c28', COL.out);
    }
    font.draw(ctx, s.notes[v], PANEL_X + 16, y + 14, v === 0 ? COL.ember[1] : COL.dim);
  });
  if (avail < powerTotal(ship)) font.draw(ctx, 'REACTOR DAMAGED  ·  LESS POWER', PANEL_X + 12, 218, COL.ember[2]);
  else if (used < avail) font.draw(ctx, avail - used + ' FREE', PANEL_X + 12, 218, COL.ochre[3]);
  else font.draw(ctx, 'LOWER ONE TO RAISE ANOTHER', PANEL_X + 12, 218, COL.faint);
  font.draw(ctx, 'TOOLS', PANEL_X + 12, 244, COL.text);
  rect(ctx, PANEL_X + 12, 256, VIEW_W - PANEL_X - 24, 1, COL.line);
  drawTools(ctx, font, state, PANEL_X + 12, 266, VIEW_W - PANEL_X - 24);
  font.draw(ctx, 'M  OPEN THE MAP TO SEND PROBES', PANEL_X + 12, 316, COL.faint);
  const surge = surgeNote(state);
  font.draw(ctx, surge.text, PANEL_X + 12, 230, surge.color);
  drawTabs(ctx, font, state, view);
  if (state.time - ship.lastHit < 1.5)
    label(ctx, font, 222, 30, 'UNDER FIRE', { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
  drawLockCode(ctx, font, state);
  drawBars(ctx, font, state);
  font.draw(ctx, 'CLICK PIPS AND NODES  ·  SHIFT CLICK QUEUES', PANEL_X - 8, 346, COL.faint, { align: 'r' });
}

// While a station lock is being worked on, only the Engineer is shown its code: on this screen, and beside
// the view of space when the screen is folded away.
// The lock that the Engineer is hacking, or nothing: a station's code lock that someone has started on.
export const hackTarget = (state) =>
  state.things.find((st) => st.breakin && st.breakin.kind === 'code' && st.breakin.started && st.lock !== 'open');
const HACK = { x: 8, y: 28, w: 136, h: 162, cx: 76, cy: 98, rings: [46, 36, 26, 16] };
const RING_COL = [COL.ochre[2], COL.ion[1], '#a878c8', '#6ebeaa'];
// Where a click stops the needle.
export const hackBox = () => ({ name: 'hack', x: HACK.x, y: HACK.y, w: HACK.w, h: HACK.h });
export function drawLockCode(ctx, font, state) {
  const locked = hackTarget(state);
  if (!locked) return;
  const bk = locked.breakin;
  const { cx, cy } = HACK;
  const turn = (a) => a - Math.PI / 2;
  rect(ctx, HACK.x, HACK.y, HACK.w, HACK.h, COL.panel, COL.ochre[1]);
  font.draw(ctx, 'STATION LOCK', HACK.x + 6, HACK.y + 6, COL.ochre[2]);
  const secs = Math.max(0, Math.ceil(bk.time));
  font.draw(ctx, secs + ' S', HACK.x + HACK.w - 6, HACK.y + 6, secs < 10 ? COL.ember[2] : COL.dim, { align: 'r' });
  HACK.rings.forEach((r, i) => {
    const ring = (color, from = 0, to = 7) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, r, from, to);
      ctx.stroke();
    };
    if (i < bk.stage) ring(COL.acid[2]);
    else if (i > bk.stage) ring('#262a44');
    else {
      ctx.globalAlpha = 0.4;
      ring(RING_COL[i]);
      ctx.globalAlpha = 1;
      ring(RING_COL[i], turn(bk.mark - bk.width / 2), turn(bk.mark + bk.width / 2));
      const sx = Math.sin(bk.angle),
        sy = -Math.cos(bk.angle);
      ctx.strokeStyle = COL.white;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + sx * (r - 5), cy + sy * (r - 5));
      ctx.lineTo(cx + sx * (r + 5), cy + sy * (r + 5));
      ctx.stroke();
    }
  });
  // The digits that are found so far. Only the Engineer sees them: someone has to enter them at the lock.
  for (let i = 0; i < B.CODE_LEN; i++) {
    const got = i < bk.stage;
    const x = cx - 44 + i * 23;
    rect(ctx, x, HACK.y + 126, 19, 18, got ? '#16281c' : '#141420', got ? COL.acid[2] : COL.line);
    font.draw(ctx, got ? String(bk.code[i]) : '?', x + 9.5, HACK.y + 131, got ? COL.acid[2] : COL.dim, { align: 'c' });
  }
  const done = bk.stage >= B.CODE_LEN;
  font.draw(
    ctx,
    done ? 'ENTER IT AT THE LOCK' : 'SPACE  STOP THE NEEDLE',
    cx,
    HACK.y + 150,
    done ? COL.acid[2] : COL.dim,
    { align: 'c' },
  );
}

// What the Engineer keeps an eye on while looking at space: the power, with the system that the keys work
// picked out, and what is damaged.
export function drawEngineerStrip(ctx, font, state, view) {
  const ship = state.ship;
  const names = ['WEAPONS', 'SHIELDS', 'ENGINES', 'REPAIR'];
  const colors = [COL.gunner, COL.ion[1], COL.captain, COL.ochre[3]];
  rect(ctx, 150, 326, 322, 28, COL.panel, COL.line);
  SYSTEM_KEYS.forEach((sys, i) => {
    const x = 156 + i * 79;
    const picked = i === view.engRow;
    if (picked) rect(ctx, x - 3, 328, 76, 11, '#1c1c28', COL.engineer);
    font.draw(ctx, names[i], x, 331, picked ? COL.white : COL.dim);
    for (let k = 0; k < B.POWER_MAX_PER_SYSTEM; k++) {
      rect(ctx, x + 49 + k * 6, 331, 5, 6, k < ship.power[sys] ? colors[i] : '#1c1c28');
    }
  });
  const hurt = ship.nodes.filter((n) => nodeStatus(n.hp) !== 'ok');
  const worst = hurt.some((n) => nodeStatus(n.hp) === 'critical');
  const text = hurt.length ? 'DAMAGED  ·  ' + hurt.map((n) => n.name).join(', ') : 'ALL SYSTEMS OK';
  font.draw(ctx, text, 156, 343, hurt.length ? (worst ? COL.ember[2] : COL.ochre[2]) : COL.faint);
  // The keys for the power are shown as long as there is no damage to tell about.
  // Beside it: the overcharge, or the keys for the power as long as there is nothing else to tell.
  const surge = surgeNote(state);
  const busy = state.ship.surge.sys || state.ship.surge.cool > 0;
  if (!hurt.length)
    font.draw(
      ctx,
      busy ? surge.text : 'LEFT RIGHT PICK  ·  UP DOWN POWER  ·  Z CHARGE THE BOOST',
      466,
      343,
      busy ? surge.color : COL.faint,
      { align: 'r' },
    );
  else if (busy) label(ctx, font, 478, 333, surge.text, { fg: surge.color });
  drawLockCode(ctx, font, state);
}

function crewPos(ship) {
  const c = ship.crew;
  if (!c.moving) return nodePos(ship.nodes[c.at]);
  const a = nodePos(ship.nodes[c.moving.from]),
    b = nodePos(ship.nodes[c.moving.to]),
    u = Math.min(1, c.moving.t / c.moving.dur);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
