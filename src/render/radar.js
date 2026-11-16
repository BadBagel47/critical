// The boarding radar: what the Captain sees of the place the ship is docked at while others are inside it.
// It looks like an old terminal: the plan and the crew in green, and enemies that are after someone in red.
// It is for warning and for showing the way, not for aiming. A click sets a mark that the boarders see.
import { VIEW_W, VIEW_H } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, tileAt, los } from '../sim/boarding.js';
import { findDock, nameOf } from '../sim/things.js';
import { playerById } from '../sim/players.js';
import { crewHpMax } from '../sim/upgrades.js';
import { dist } from '../sim/util.js';
import { rect, bar } from './draw.js';

const GREEN = ['#0a2a14', '#145a28', '#2fae52', '#9cf7b0'];
const RED = '#ff5a48';
const SIDE = 150;

// The place that the radar looks into: what the ship is docked at, once someone has been inside it.
export function radarPlace(state) {
  const at = findDock(state, state.ship.docked);
  return at && at.interior && !at.interior.trade ? at : null;
}
// A room is called by a letter, on the radar and at its door.
export const roomName = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
// The enemies that are after someone: guards that have seen an intruder, and turrets with one in their sights.
export function hunters(it) {
  const tracking = (t) =>
    it.avatars.some((a) => dist(t.x, t.y, a.x, a.y) < B.TURRET_SIGHT && los(it, t.x, t.y, a.x, a.y));
  return [...it.guards.filter((g) => g.mode === 'alert'), ...it.turrets.filter(tracking)];
}

// How the plan lies on the screen: its corner and how many pixels a tile is.
function frame(it) {
  const k = Math.max(2, Math.min(5, Math.floor(Math.min((VIEW_W - SIDE - 24) / it.w, (VIEW_H - 60) / it.h))));
  return { k, x: Math.round((VIEW_W - SIDE - it.w * k) / 2), y: Math.round(34 + (VIEW_H - 60 - it.h * k) / 2) };
}
// The spot inside the place that a point on the radar screen stands for, or null outside the plan.
export function radarPoint(state, mx, my) {
  const place = radarPlace(state);
  if (!place) return null;
  const it = place.interior,
    f = frame(it);
  const tx = (mx - f.x) / f.k,
    ty = (my - f.y) / f.k;
  if (tx < 0 || ty < 0 || tx >= it.w || ty >= it.h) return null;
  const c = tileAt(it, Math.floor(tx), Math.floor(ty));
  return c === '.' || c === ',' || c === 'A' ? { x: tx * TILE, y: ty * TILE } : null;
}

export function drawRadar(ctx, state, view, assets) {
  const { font } = assets;
  const place = radarPlace(state);
  ctx.fillStyle = '#020a05';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!place) return;
  const it = place.interior,
    f = frame(it);
  const at = (p) => ({ x: f.x + (p.x / TILE) * f.k, y: f.y + (p.y / TILE) * f.k });
  for (let ty = 0; ty < it.h; ty++)
    for (let tx = 0; tx < it.w; tx++) {
      const c = tileAt(it, tx, ty);
      if (c === ' ' || c === 'X') continue;
      ctx.fillStyle = c === '#' || c === 'K' ? GREEN[1] : c === 'L' ? GREEN[3] : c === 'A' ? GREEN[2] : GREEN[0];
      ctx.fillRect(f.x + tx * f.k, f.y + ty * f.k, f.k, f.k);
    }
  it.rooms.forEach((r, i) => {
    const p = at(r.mid);
    font.draw(ctx, roomName(i), p.x, p.y - 3, GREEN[2], { align: 'c' });
    // What the room is for, under its letter, where there is room for it.
    if (it.uses && it.uses[i] && f.k >= 3) font.draw(ctx, it.uses[i], p.x, p.y + 5, GREEN[1], { align: 'c' });
  });
  const dot = (p, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 7);
    ctx.fill();
  };
  // Enemies show only once they are after someone. They blink slowly.
  const lit = state.time % 1 < 0.6;
  for (const e of hunters(it)) {
    const p = at(e);
    dot(p, 3, lit ? RED : '#7a2a22');
  }
  for (const a of it.avatars) {
    const p = at(a);
    dot(p, 3.5, GREEN[3]);
    font.draw(ctx, playerById(state, a.player).name, p.x, p.y - 12, GREEN[3], { align: 'c' });
  }
  // Doors with an alarm on them, which the boarders only see from close by.
  for (const d of it.alarmed) {
    if (d.off) continue;
    const p = at(d);
    ctx.fillStyle = '#e8c04a';
    ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5);
  }
  if (it.pin) {
    const p = at(it.pin);
    ctx.strokeStyle = GREEN[3];
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(p.x) - 4.5, Math.round(p.y) - 4.5, 9, 9);
    font.draw(ctx, 'MARK', p.x, p.y + 8, GREEN[3], { align: 'c' });
  }
  // Scan lines, as on an old screen.
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.22;
  for (let y = 0; y < VIEW_H; y += 3) ctx.fillRect(0, y, VIEW_W - SIDE, 1);
  ctx.globalAlpha = 1;
  font.draw(ctx, 'BOARDING RADAR', 12, 10, GREEN[3]);
  font.draw(ctx, nameOf(place), 12, 22, GREEN[2]);
  if (it.timer !== null) {
    const t = Math.max(0, it.timer);
    const text = 'REACTOR  ' + Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    font.draw(ctx, text, VIEW_W - SIDE - 12, 10, t < 30 ? RED : GREEN[2], { align: 'r' });
  }
  // Beside it: who is inside and how they are, and what the colours mean.
  const sx = VIEW_W - SIDE;
  rect(ctx, sx, 0, SIDE, VIEW_H, '#04140a');
  rect(ctx, sx, 0, 1, VIEW_H, GREEN[1]);
  font.draw(ctx, 'INSIDE', sx + 12, 14, GREEN[3]);
  if (!it.avatars.length) font.draw(ctx, 'NOBODY', sx + 12, 30, GREEN[1]);
  it.avatars.forEach((a, i) => {
    const p = playerById(state, a.player);
    font.draw(ctx, p.name, sx + 12, 30 + i * 22, GREEN[3]);
    bar(ctx, sx + 12, 41 + i * 22, SIDE - 24, p.hp / crewHpMax(state.ship), p.hp < 40 ? RED : GREEN[2], 4);
  });
  const hunt = hunters(it).length;
  font.draw(ctx, hunt ? `${hunt} AFTER THEM` : 'NOBODY AFTER THEM', sx + 12, 130, hunt ? RED : GREEN[2]);
  const legend = [
    [GREEN[3], 'CREW'],
    [RED, 'ENEMY AFTER THEM'],
    [GREEN[2], 'AIRLOCK'],
    ['#e8c04a', 'ALARMED DOOR'],
  ];
  legend.forEach(([color, text], i) => {
    rect(ctx, sx + 12, 160 + i * 14, 5, 5, color);
    font.draw(ctx, text, sx + 22, 159 + i * 14, GREEN[2]);
  });
  font.draw(ctx, 'ENEMIES THAT HAVE SEEN', sx + 12, 214, GREEN[1]);
  font.draw(ctx, 'NOBODY DO NOT SHOW', sx + 12, 225, GREEN[1]);
  font.draw(ctx, 'CLICK  SET A MARK', sx + 12, 300, GREEN[2]);
  font.draw(ctx, 'B  BACK TO THE BRIDGE', sx + 12, 314, GREEN[2]);
  // The pointer, since the mouse is hidden on the game's own screens.
  const m = view.mouse;
  ctx.fillStyle = GREEN[3];
  ctx.fillRect(Math.round(m.x) - 5, Math.round(m.y), 11, 1);
  ctx.fillRect(Math.round(m.x), Math.round(m.y) - 5, 1, 11);
}
