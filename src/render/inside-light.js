// The light inside a place (D-227): which lights there are in the dark, what glows by itself, the still red
// filter of a lockdown and the turning lights of an alarm. How light is laid on is in light.js.
import { COL, VIEW_H, VIEW_W } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, tileAt } from '../sim/boarding.js';
import { rect } from './draw.js';
import { flareLevel, lampLevel, litArea } from './light.js';
import { forward } from '../sim/util.js';
import { awake } from '../sim/guards.js';
import { lampAt, scatter } from './inside-tiles.js';

const WARM = '255,240,214';

const COLD = '196,214,236';

const RED = '255,74,52';

// Every light in a dark place: the few lamps that still work, the way home, what the crew carries and
// throws, and the small lights that guards and turrets carry themselves, so that nothing shoots unseen.
const EMERGENCY = '255,150,70';

// The colour of a place that has shut itself in: red at an enemy, yellow at a base of the crew's own (R-1149).
export const lockColour = (place) => (place.side === 'crew' ? '255,200,90' : '255,96,74');

export function lightsOf(state, place, it, style, origin) {
  const time = state.time;
  const lights = [];
  const round = (x, y, r, rgb, power) => lights.push({ x, y, r, rgb, power, area: litArea(it, x, y, r) });
  const small = (x, y, r, rgb, power) => lights.push({ x, y, r, rgb, power });
  const tx0 = Math.max(0, Math.floor(-origin.x / TILE) - 3),
    ty0 = Math.max(0, Math.floor(-origin.y / TILE) - 3),
    tx1 = Math.min(it.w, Math.ceil((VIEW_W - origin.x) / TILE) + 3),
    ty1 = Math.min(it.h, Math.ceil((VIEW_H - origin.y) / TILE) + 3);
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      const x = tx * TILE + TILE / 2,
        y = ty * TILE;
      if (tileAt(it, tx, ty) === 'L') small(x, y + 9, 20, '219,164,69', 0.5);
      else if (lampAt(it, style, tx, ty)) {
        const n = scatter(tx, ty);
        if (it.wreck) round(x, y + TILE + 2, 40, COLD, 0.5 * lampLevel(n, time));
        // With the power out only the emergency lamps burn, one in three, weak and orange.
        else if (!it.power) {
          if (n % 3 === 0) round(x, y + TILE + 2, 46, EMERGENCY, 0.42);
        }
        // In lockdown every lamp burns red, and still (R-1149). On a base of the crew's own it is yellow.
        else round(x, y + TILE + 2, 58, lockColour(place), 0.5);
      }
    }
  round(it.entry.x, it.entry.y, 46, '190,236,200', 0.55);
  for (const l of it.loot) small(l.x, l.y, 11, l.type === 'crate' ? '219,164,69' : '155,228,238', 0.4);
  const armed = it.turrets.filter((t) => t.out <= 0 && t.turned <= 0);
  for (const e of [...it.guards.filter(awake), ...armed]) round(e.x, e.y, 19, RED, 0.6);
  for (const t of it.turrets) if (t.turned > 0) round(t.x, t.y, 19, '150,214,110', 0.6);
  for (const c of it.cameras) small(c.x, c.y, 10, '155,228,238', 0.5);
  if (it.reactor) small(it.reactor.x, it.reactor.y, 24, it.reactor.steadied ? '150,214,110' : '219,164,69', 0.6);
  for (const e of it.sentries) round(e.x, e.y, 19, '155,228,238', 0.6);
  for (const a of it.avatars) {
    round(a.x, a.y, B.LAMP_NEAR, WARM, 0.6);
    if (!a.lamp) continue;
    // The beam, and a weaker and wider one around it so that its edge is not sharp.
    const f = forward(a.heading);
    const way = Math.atan2(f.y, f.x);
    const beam = (half, power) => {
      const area = litArea(it, a.x, a.y, B.LAMP_RANGE, way, half);
      lights.push({ x: a.x, y: a.y, r: B.LAMP_RANGE, rgb: WARM, power, area, far: true });
    };
    beam(B.LAMP_ANGLE, 0.75);
    beam(B.LAMP_ANGLE + 0.16, 0.3);
  }
  for (const f of it.flares) {
    const lv = flareLevel(f.burn, B.FLARE_FADE, time);
    round(f.x, f.y, B.FLARE_LIGHT * (0.7 + 0.3 * lv), '255,206,140', lv);
  }
  for (const b of it.bolts) small(b.x, b.y, 22, b.owner === 'crew' ? '242,210,122' : '150,214,110', 0.6);
  for (const g of it.grenades) small(g.x, g.y, 12, RED, 0.5);
  for (const f of it.fx) {
    const left = 1 - f.t / f.dur;
    if (f.type === 'boom') round(f.x, f.y, f.size * 2.6, '255,190,120', left);
    else if (f.type === 'teleport') small(f.x, f.y, 40, '155,228,238', left);
  }
  return lights;
}

// What shines by itself in the dark, drawn after the light has been laid on: the lamps themselves, a red
// eye on every guard and turret, and a glint on the loot.
export function drawGlows(ctx, state, it, style, origin) {
  const time = state.time;
  const tx0 = Math.max(0, Math.floor(-origin.x / TILE) - 1),
    ty0 = Math.max(0, Math.floor(-origin.y / TILE) - 1),
    tx1 = Math.min(it.w, Math.ceil((VIEW_W - origin.x) / TILE) + 1),
    ty1 = Math.min(it.h, Math.ceil((VIEW_H - origin.y) / TILE) + 1);
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      if (!lampAt(it, style, tx, ty)) continue;
      ctx.globalAlpha = lampLevel(scatter(tx, ty), time);
      rect(ctx, tx * TILE + 3, ty * TILE + 10, 10, 3, style.lamp[1]);
      ctx.fillStyle = style.lamp[3];
      ctx.fillRect(tx * TILE + 4, ty * TILE + 11, 8, 1);
    }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COL.ember[2];
  for (const e of [...it.guards.filter(awake), ...it.turrets.filter((t) => t.out <= 0 && t.turned <= 0)]) {
    const f = forward(e.heading);
    ctx.fillRect(Math.round(e.x + f.x * 3) - 1, Math.round(e.y + f.y * 3) - 1, 2, 2);
  }
  ctx.fillStyle = COL.white;
  for (const l of it.loot) {
    if (Math.floor(time * 2 + l.x * 0.37 + l.y * 0.11) % 4 === 0) ctx.fillRect(l.x + 2, l.y - 4, 1, 1);
  }
}

// The turning lights of an alarm, spread over the floor (R-1182): each a red beam that goes round.
export function drawBeacons(ctx, it, time, origin) {
  if (it.mood !== 'alarm') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  it.beacons.forEach((b, i) => {
    const sx = b.x + origin.x,
      sy = b.y + origin.y;
    if (sx < -120 || sy < -120 || sx > VIEW_W + 120 || sy > VIEW_H + 120) return;
    const way = time * 2.6 + i * 1.7;
    const area = litArea(it, b.x, b.y, 110, way, 0.42);
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 110);
    g.addColorStop(0, 'rgba(255,60,40,0.42)');
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(area[0][0], area[0][1]);
    for (let k = 1; k < area.length; k++) ctx.lineTo(area[k][0], area[k][1]);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  for (const b of it.beacons) {
    rect(ctx, b.x - 3, b.y - 3, 6, 6, '#5a1a16', COL.out);
    ctx.fillStyle = COL.ember[2];
    ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }
}

// Lockdown: a still red filter over the whole floor, and no light that moves (R-1149). Yellow on the crew's own.
export function lockdownFilter(ctx, place, it, origin) {
  if (it.mood !== 'lockdown' || it.wreck || !it.power) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = place.side === 'crew' ? '#ffe0a0' : '#ffaa9c';
  ctx.fillRect(-origin.x, -origin.y, VIEW_W, VIEW_H);
  ctx.restore();
}
