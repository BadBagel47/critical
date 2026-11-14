// The Engineer post: a blueprint of the ship with damage nodes, and the power panel.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { nodeStatus, powerAvailable, powerUsed } from '../sim/ship.js';
import { rect, label, dashed } from './draw.js';
import { drawTabs, drawBars } from './hud.js';
import { drawTools } from './map.js';
import { powerTotal } from '../sim/upgrades.js';

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
    notes: ['NO RECHARGE', 'RECHARGE  SLOW', 'RECHARGE  NORMAL', 'RECHARGE  FAST', 'RECHARGE  MAX'],
  },
  {
    key: 'engines',
    name: 'ENGINES',
    color: COL.captain,
    notes: ['CRAWLING', 'SPEED  LOW', 'SPEED  NORMAL', 'SPEED  HIGH', 'SPEED  MAX'],
  },
  {
    key: 'repair',
    name: 'REPAIR',
    color: COL.ochre[3],
    notes: ['NO REPAIRS', 'REPAIR  SLOW', 'REPAIR  NORMAL', 'REPAIR  FAST', 'REPAIR  MAX'],
  },
];
const STATUS_COL = { ok: COL.engineer, damaged: COL.ochre[2], critical: COL.ember[1] };

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
    const left = n.id === 'port';
    const lx = left ? 130 : 310,
      oy = n.id === 'reactor' ? -8 : n.id === 'starboard' ? 8 : 0;
    ctx.fillStyle = st === 'ok' ? '#2f4f58' : c;
    if (left) ctx.fillRect(lx + 6, p.y, p.x - 8 - lx - 6, 1);
    else ctx.fillRect(p.x + 8, p.y, lx - 6 - p.x - 8, 1);
    const status = st === 'ok' ? 'OK' : (st === 'damaged' ? 'DAMAGED  ' : 'CRITICAL  ') + Math.round(n.hp) + '%';
    if (left) {
      font.draw(ctx, n.name, lx, p.y - 12, COL.text, { align: 'r' });
      font.draw(ctx, status, lx, p.y - 1, c, { align: 'r' });
    } else if (oy) {
      const w = font.draw(ctx, n.name, lx, p.y - 3 + oy, COL.text);
      font.draw(ctx, status, lx + w + 8, p.y - 3 + oy, c);
    } else {
      font.draw(ctx, n.name, lx, p.y - 9, COL.text);
      font.draw(ctx, status, lx, p.y + 2, c);
    }
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
    if (st === 'critical' && Math.floor(state.time * 4) % 2 === 0) {
      ctx.strokeStyle = COL.ember[2];
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
      ? 'REPAIR CREW  ·  WORKING'
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
  drawTabs(ctx, font, state, view);
  if (state.time - ship.lastHit < 1.5)
    label(ctx, font, 222, 30, 'UNDER FIRE', { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
  // While a station lock is being worked on, this screen is the only place that shows its code.
  const locked = state.things.find(
    (st) => st.breakin && st.breakin.kind === 'code' && st.breakin.started && st.lock !== 'open',
  );
  if (locked) {
    rect(ctx, 8, 28, 132, 58, COL.panel, COL.ochre[1]);
    font.draw(ctx, 'STATION LOCK CODE', 14, 34, COL.ochre[2]);
    font.draw(ctx, locked.breakin.code.join('  '), 74, 48, COL.white, { align: 'c', scale: 2 });
    font.draw(
      ctx,
      `CHANGES IN ${Math.ceil(locked.breakin.shift)} S`,
      14,
      72,
      locked.breakin.shift < 5 ? COL.ember[2] : COL.dim,
    );
  }
  drawBars(ctx, font, state);
  font.draw(ctx, 'CLICK PIPS AND NODES  ·  SHIFT CLICK QUEUES', PANEL_X - 8, 346, COL.faint, { align: 'r' });
}

function crewPos(ship) {
  const c = ship.crew;
  if (!c.moving) return nodePos(ship.nodes[c.at]);
  const a = nodePos(ship.nodes[c.moving.from]),
    b = nodePos(ship.nodes[c.moving.to]),
    u = Math.min(1, c.moving.t / c.moving.dur);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
