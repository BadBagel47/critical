// The boarding view: the inside of a wreck seen from above.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, IW, IH, tileAt } from '../sim/boarding.js';
import { dist } from '../sim/util.js';
import { sprite, rect, label, bar } from './draw.js';
import { drawStars } from './space.js';

export const OX = 112, OY = 38;
const WALL = ['#2a2c3a', '#44475a', '#666a7e'];
const solid = (c) => c === '#' || c === 'L';
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

function drawTiles(ctx, it, time) {
  for (let ty = 0; ty < IH; ty++) for (let tx = 0; tx < IW; tx++) {
    const c = tileAt(it, tx, ty), x = tx * TILE, y = ty * TILE;
    if (c === '.' || c === 'A') {
      const corridor = ty >= 7 && ty <= 10;
      rect(ctx, x, y, TILE, TILE, corridor ? ((tx + ty) % 2 ? '#1e2029' : '#21232d') : (tx + ty) % 2 ? '#1a1b26' : '#1d1e2a');
      ctx.fillStyle = '#13131c'; ctx.fillRect(x, y + TILE - 1, TILE, 1); ctx.fillRect(x + TILE - 1, y, 1, TILE);
      ctx.fillStyle = '#2c2d3b'; ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + TILE - 4, y + 2, 1, 1);
      if (c === 'A') { ctx.fillStyle = COL.acid[1]; ctx.fillRect(x + 12, y + 1, 2, TILE - 2); }
      if (corridor && ty === 9) { ctx.fillStyle = '#2c3d40'; ctx.fillRect(x + 5, y - 1, 6, 2); }
    }
  }
  for (let ty = 0; ty < IH; ty++) for (let tx = 0; tx < IW; tx++) {
    const c = tileAt(it, tx, ty), x = tx * TILE, y = ty * TILE;
    if (!solid(c)) continue;
    const below = tileAt(it, tx, ty + 1), open = (dx, dy) => !solid(tileAt(it, tx + dx, ty + dy)) && tx + dx >= 0 && tx + dx < IW && ty + dy >= 0 && ty + dy < IH;
    rect(ctx, x, y, TILE, TILE, WALL[1]);
    if (c === 'L') {
      rect(ctx, x, y + 3, TILE, 10, '#1c1c28', COL.out);
      for (let k = 0; k < TILE; k += 6) { ctx.fillStyle = COL.ochre[1]; ctx.fillRect(x + k, y + 6, 3, 4); }
      if (it.doorCut > 0) { ctx.fillStyle = COL.ochre[3]; ctx.fillRect(x, y + 13, Math.round(TILE * Math.min(1, it.doorCut)), 2); }
      continue;
    }
    if (open(0, -1)) { ctx.fillStyle = WALL[2]; ctx.fillRect(x, y, TILE, 1); }
    if (below === '.' || below === 'A') {
      rect(ctx, x, y + 7, TILE, 9, WALL[0]); ctx.fillStyle = COL.out; ctx.fillRect(x, y + 7, TILE, 1);
      rect(ctx, x + 3, y + 10, 10, 3, '#1c1c28'); ctx.fillStyle = (tx * 7 + ty) % 5 === 0 ? COL.ochre[1] : '#2c2d3b'; ctx.fillRect(x + 5, y + 11, 1, 1);
    }
    ctx.fillStyle = COL.out;
    if (open(0, -1)) ctx.fillRect(x, y, TILE, 1);
    if (open(0, 1)) ctx.fillRect(x, y + TILE - 1, TILE, 1);
    if (open(-1, 0)) ctx.fillRect(x, y, 1, TILE);
    if (open(1, 0)) ctx.fillRect(x + TILE - 1, y, 1, TILE);
  }
}

function glow(ctx, x, y, r, color, a) {
  ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.globalAlpha = a * 1.6; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}

function effect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    ctx.globalAlpha = Math.max(0, 0.8 - u); ctx.fillStyle = COL.ember[3]; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.3 + u * 0.7), 0, 7); ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - u);
    for (let i = 0; i < 10; i++) { const a = i * 0.63, r = f.size * u; ctx.fillStyle = i % 2 ? COL.ochre[2] : COL.ember[1]; ctx.fillRect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, 2, 2); }
    ctx.globalAlpha = 1;
  } else if (f.type === 'teleport') {
    ctx.globalAlpha = 1 - u; ctx.fillStyle = COL.ion[2]; ctx.fillRect(f.x - 4 + u * 3, f.y - 40, 8 - u * 6, 46);
    ctx.strokeStyle = COL.ion[3]; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + u * 14, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 1 - u; ctx.fillStyle = COL.ochre[3]; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); ctx.globalAlpha = 1;
  }
}

export function drawBoarding(ctx, state, view, assets) {
  const { img, font } = assets, player = state.players[0];
  const wreck = state.wrecks.find((w) => w.id === player.inside), it = wreck.interior;
  const me = it.avatars.find((a) => a.player === player.id);
  drawStars(ctx, { x: wreck.x * 0.2, y: wreck.y * 0.2 });
  // The docked ship and the tunnel into the wreck.
  sprite(ctx, img.frigate, 16, OY + 9 * TILE, Math.PI / 2);
  rect(ctx, 60, OY + 8 * TILE - 2, OX - 60, 36, WALL[0], COL.out); rect(ctx, 61, OY + 8 * TILE + 2, OX - 61, 28, '#191a25');
  for (let x = 68; x < OX; x += 10) { ctx.fillStyle = WALL[0]; ctx.fillRect(x, OY + 8 * TILE + 2, 1, 28); }
  ctx.save(); ctx.translate(OX, OY);
  drawTiles(ctx, it, state.time);
  for (const l of it.loot) { glow(ctx, l.x, l.y, 9, l.type === 'cell' ? COL.ion[2] : COL.ochre[2], 0.14); sprite(ctx, img[l.type], l.x, l.y); }
  for (const t of it.turrets) sprite(ctx, img.turret_guard, t.x, t.y, t.heading);
  for (const g of it.guards) {
    sprite(ctx, img.guard, g.x, g.y, g.heading);
    if (g.mode === 'alert') { ctx.fillStyle = COL.ember[2]; ctx.fillRect(g.x - 1, g.y - 14, 2, 4); ctx.fillRect(g.x - 1, g.y - 9, 2, 2); }
  }
  for (const a of it.avatars) {
    sprite(ctx, img.boarder, a.x, a.y, a.heading);
    a.carry.forEach((c, i) => rect(ctx, a.x - 5 + i * 4, a.y - 13, 3, 3, c.type === 'cell' ? COL.ion[2] : COL.ochre[2], COL.out));
  }
  for (const b of it.bolts) {
    const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.fillStyle = b.owner === 'crew' ? COL.ochre[1] : COL.acid[1]; ctx.fillRect(-4, -1, 4, 2);
    ctx.fillStyle = b.owner === 'crew' ? COL.ochre[3] : COL.acid[3]; ctx.fillRect(0, -1, 3, 2); ctx.restore();
  }
  for (const g of it.grenades) {
    const u = g.t / g.dur, lift = Math.sin(u * Math.PI) * 14;
    ctx.globalAlpha = 0.4; ctx.fillStyle = COL.out; ctx.fillRect(g.x - 2, g.y - 1, 4, 3); ctx.globalAlpha = 1;
    rect(ctx, g.x - 2, g.y - 2 - lift, 4, 4, '#434557', COL.out); ctx.fillStyle = Math.floor(state.time * 12) % 2 ? COL.ember[2] : COL.ember[0]; ctx.fillRect(g.x - 1, g.y - 1 - lift, 2, 2);
    if (u >= 1) { ctx.strokeStyle = COL.ember[1]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(g.x, g.y, B.GRENADE_RADIUS, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  for (const f of it.fx) effect(ctx, f);
  ctx.restore();

  // ---- HUD ----
  let x = label(ctx, font, 8, 8, 'BOARDING', { fg: COL.out, bg: COL.white, border: null }) + 4;
  label(ctx, font, x, 8, 'RETURN TO THE AIRLOCK TO TAKE A POST', { fg: COL.faint });
  const low = it.timer < 30;
  label(ctx, font, VIEW_W / 2 + 60, 8, 'REACTOR UNSTABLE   ' + fmt(Math.max(0, it.timer)), { anchor: 'c', fg: low ? COL.ember[2] : COL.ochre[2], border: low ? COL.ember[0] : COL.ochre[0] });
  label(ctx, font, VIEW_W - 8, 8, `CARRY  ${me ? me.carry.length : 0} / ${B.CARRY_MAX}`, { anchor: 'r', fg: COL.ochre[2] });
  label(ctx, font, VIEW_W - 8, 22, `CREDITS  ${state.credits}`, { anchor: 'r', fg: COL.dim });
  rect(ctx, 8, 332, 100, 22, COL.panel, COL.line);
  font.draw(ctx, 'HP', 12, 340, COL.dim); bar(ctx, 28, 340, 74, player.hp / B.CREW_HP, player.hp < 40 ? COL.ember[1] : COL.engineer);
  x = label(ctx, font, 114, 336, 'TELEPORT READY', { fg: COL.ion[2], border: COL.ion[0] }) + 6;
  x = label(ctx, font, x, 336, 'RIFLE', { fg: COL.out, bg: COL.gunner, border: null, pad: 6 }) + 4;
  x = label(ctx, font, x, 336, 'GRENADES  ' + (me ? me.grenades : 0), { fg: me && me.grenades ? COL.text : COL.faint }) + 10;
  font.draw(ctx, 'SHIP', x, 334, COL.dim); bar(ctx, x + 26, 333, 50, state.ship.shield / B.SHIELD_MAX, COL.ion[1], 5); bar(ctx, x + 26, 340, 50, state.ship.hull / B.HULL_MAX, COL.steel[2], 5);
  if (state.time - state.ship.lastHit < 1.5) font.draw(ctx, 'UNDER FIRE', x, 346, COL.ember[2]);
  font.draw(ctx, 'W A S D MOVE  ·  CLICK FIRE  ·  G GRENADE  ·  F USE', VIEW_W - 8, 346, COL.faint, { align: 'r' });
  if (me) {
    const door = it.rooms[it.vault].door;
    if (me.x < TILE * 2.2 && Math.abs(me.y - it.entry.y) < TILE * 1.5) label(ctx, font, OX + me.x + 14, OY + me.y - 26, 'F  BACK TO THE SHIP', { fg: COL.acid[2], border: COL.acid[0] });
    else if (!it.doorOpen && dist(me.x, me.y, door.x, door.y) < 22) label(ctx, font, OX + door.x, OY + door.y + (door.y < 9 * TILE ? 22 : -34), it.cutting ? 'CUTTING THE LOCK' : 'HOLD F TO CUT THE LOCK', { anchor: 'c', fg: COL.ochre[2], border: COL.ochre[0] });
  }
  const m = view.mouse; ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of [[-6, 0, 3, 1], [4, 0, 3, 1], [0, -6, 1, 3], [0, 4, 1, 3]]) ctx.fillRect(Math.round(m.x) + dx, Math.round(m.y) + dy, w, h);
}
