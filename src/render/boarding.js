// The boarding view: the inside of a wreck seen from above.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, tileAt, useTarget } from '../sim/boarding.js';
import { FACTIONS } from '../sim/sides.js';
import { sprite, rect, label, bar } from './draw.js';
import { drawStars } from './space.js';
import { findDock } from '../sim/things.js';
import { playerById } from '../sim/players.js';
import { hullMax, shieldMax, level, carryMax, crewHpMax } from '../sim/upgrades.js';
import { alarmText } from './hud.js';
import { shade, litArea, flareLevel, lampLevel } from './light.js';
import { forward } from '../sim/util.js';

// Where on the screen the inside of a place is drawn. The camera follows the player's own figure. A place
// that is smaller than the screen is kept still in the middle of it, and at the edges of a larger one the
// camera goes a little way outside, so that the frigate at the airlock can be seen.
export function insideOrigin(it, me) {
  const at = me || it.entry;
  const along = (view, size, pos, lo, hi) => {
    const room = view - lo - hi;
    if (size + 2 * OUTSIDE <= room) return lo + (room - size) / 2;
    return Math.round(Math.max(view - hi - size - OUTSIDE, Math.min(lo + OUTSIDE, view / 2 - pos)));
  };
  return { x: along(VIEW_W, it.w * TILE, at.x, 0, 0), y: along(VIEW_H, it.h * TILE, at.y, 28, 30) };
}
const OUTSIDE = 96;
const FLOOR = new Set(['.', ',', 'A']);
const WALL = ['#2a2c3a', '#44475a', '#666a7e'];
// How the inside of each side's places looks. The pieces are the same everywhere, in the side's own colours.
//   wall     the face of a wall, its top and the edge of the top
//   floor    two tones for the tiles of a room, two for a corridor, and the line between tiles
//   lamp     the strip lights on the walls: dark, lit and bright
//   dead     how large a share of the lamps are out
//   marks    what is drawn on the floor, see drawMarks
const STYLES = {
  plain: { wall: WALL, floor: ['#1a1b26', '#1d1e2a', '#1e2029', '#21232d', '#13131c'], lamp: COL.ochre, dead: 0 },
  // A wreck is dark inside, see light.js. These are its colours where light falls on them. The few lamps
  // that still work are cold white: red light is kept for places that count the crew as an enemy.
  wreck: {
    wall: ['#35333c', '#56535f', '#7b7786'],
    floor: ['#25252d', '#292932', '#2a2a33', '#2e2e38', '#191920'],
    lamp: ['#3a4450', '#7f93a8', '#c5d6e6', '#f2f8ff'],
    dead: 0.65,
    marks: 'debris',
  },
  charter: {
    wall: ['#3a3d4e', '#5d6174', '#8a8ea0'],
    floor: ['#23242f', '#272833', '#262733', '#2a2b37', '#1a1b24'],
    lamp: COL.ochre,
    dead: 0,
    marks: 'runner',
  },
  wardens: {
    wall: ['#222838', '#3a4358', '#58647e'],
    floor: ['#161b28', '#19202e', '#1a2030', '#1d2434', '#10141e'],
    lamp: ['#1c3566', '#2c5fae', '#5a9be0', '#cfe9ff'],
    dead: 0,
    marks: 'stripes',
  },
  drifters: {
    wall: ['#4a2f26', '#6e4434', '#8f5d44'],
    floor: ['#1f1a18', '#231d1a', '#231e1c', '#27211e', '#161211'],
    lamp: ['#2e6b5f', '#3f8f80', '#58b0a0', '#a0e0d0'],
    dead: 0.2,
    marks: 'patches',
  },
  pirate: {
    wall: ['#231629', '#3d2640', '#5a3a5a'],
    floor: ['#1b1620', '#1f1925', '#1e1924', '#221c29', '#130f17'],
    lamp: COL.ember,
    dead: 0.1,
    marks: 'grates',
  },
};
const styleOf = (place) =>
  STYLES[
    place.kind !== 'station'
      ? 'wreck'
      : place.side === 'pirate'
        ? 'pirate'
        : FACTIONS[place.side]
          ? place.side
          : 'plain'
  ];
// A number that is always the same for a tile, to scatter things over the floor without them moving about.
const scatter = (tx, ty) => ((tx * 73856093) ^ (ty * 19349663)) >>> 0;

// What a side leaves on its floors.
function drawMarks(ctx, style, c, tx, ty, x, y) {
  const n = scatter(tx, ty);
  if (style.marks === 'grates') {
    ctx.fillStyle = style.floor[4];
    for (let k = 3; k < TILE - 2; k += 4) ctx.fillRect(x + 3, y + k, TILE - 7, 1);
  } else if (style.marks === 'patches' && n % 5 === 0) {
    rect(ctx, x + 2, y + 2, TILE - 5, TILE - 5, ['#2a211d', '#1a2422', '#24242c'][n % 3]);
    ctx.fillStyle = '#6b6658';
    ctx.fillRect(x + 3, y + 3, 1, 1);
    ctx.fillRect(x + TILE - 5, y + TILE - 5, 1, 1);
  } else if (style.marks === 'debris' && n % 7 === 0) {
    ctx.fillStyle = ['#3d3b44', '#5d5a66', '#121218'][n % 3];
    ctx.fillRect(x + 2 + (n % 9), y + 3 + ((n >> 4) % 8), 2 + (n % 3), 1 + ((n >> 2) % 2));
  } else if (style.marks === 'stripes' && c === ',' && (tx + ty) % 2 === 0) {
    ctx.fillStyle = '#2c5fae';
    ctx.fillRect(x + 6, y + 7, 4, 2);
  } else if (style.marks === 'runner' && c === ',') {
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(x + 6, y + 6, 4, 4);
  }
}
const solid = (c) => c === '#' || c === 'L';
// Every other stretch of wall that faces a floor has a strip light in the side's colour. Some of them are out.
const lampAt = (it, style, tx, ty) =>
  tx % 2 === 0 &&
  tileAt(it, tx, ty) === '#' &&
  FLOOR.has(tileAt(it, tx, ty + 1)) &&
  (scatter(tx, ty) % 100) / 100 >= style.dead;
// The shadow on the floor under something that stands on it.
function shadow(ctx, x, y, r) {
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COL.out;
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 2, r, r * 0.8, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

// The tiles that are on the screen, given where the place is drawn.
function drawTiles(ctx, it, origin, style) {
  const wall = style.wall;
  const tx0 = Math.max(0, Math.floor(-origin.x / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(-origin.y / TILE) - 1);
  const tx1 = Math.min(it.w, Math.ceil((VIEW_W - origin.x) / TILE) + 1);
  const ty1 = Math.min(it.h, Math.ceil((VIEW_H - origin.y) / TILE) + 1);
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      const c = tileAt(it, tx, ty),
        x = tx * TILE,
        y = ty * TILE;
      if (c === 'X') {
        // A room torn open to space: only a plate of the floor here and there is left.
        if ((tx * 3 + ty * 5) % 4 === 0) rect(ctx, x + 2, y + 3, TILE - 5, TILE - 6, '#14141c', '#22232d');
        continue;
      }
      if (!FLOOR.has(c)) continue;
      rect(ctx, x, y, TILE, TILE, style.floor[(c === ',' ? 2 : 0) + ((tx + ty) % 2)]);
      ctx.fillStyle = style.floor[4];
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
      drawMarks(ctx, style, c, tx, ty, x, y);
      // The floor is a little darker along the walls.
      ctx.fillStyle = COL.out;
      ctx.globalAlpha = 0.28;
      if (solid(tileAt(it, tx, ty - 1))) ctx.fillRect(x, y, TILE, 3);
      ctx.globalAlpha = 0.16;
      if (solid(tileAt(it, tx - 1, ty))) ctx.fillRect(x, y, 2, TILE);
      if (solid(tileAt(it, tx + 1, ty))) ctx.fillRect(x + TILE - 2, y, 2, TILE);
      ctx.globalAlpha = 1;
      if (c === 'A') {
        ctx.fillStyle = COL.acid[1];
        ctx.fillRect(x + 2, y + 2, TILE - 4, 1);
        ctx.fillRect(x + 2, y + TILE - 3, TILE - 4, 1);
        ctx.fillRect(x + 6, y + 6, 4, 4);
      }
    }
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      const c = tileAt(it, tx, ty),
        x = tx * TILE,
        y = ty * TILE;
      if (!solid(c)) continue;
      const below = tileAt(it, tx, ty + 1),
        open = (dx, dy) => !solid(tileAt(it, tx + dx, ty + dy));
      rect(ctx, x, y, TILE, TILE, wall[1]);
      if (c === 'L') {
        rect(ctx, x + 1, y + 3, TILE - 2, 10, '#1c1c28', COL.out);
        for (let k = 2; k < TILE - 2; k += 6) {
          ctx.fillStyle = COL.ochre[1];
          ctx.fillRect(x + k, y + 6, 3, 4);
        }
        if (it.doorCut > 0) {
          ctx.fillStyle = COL.ochre[3];
          ctx.fillRect(x, y + 13, Math.round(TILE * Math.min(1, it.doorCut)), 2);
        }
        continue;
      }
      if (open(0, -1)) {
        ctx.fillStyle = wall[2];
        ctx.fillRect(x, y, TILE, 1);
      }
      if (FLOOR.has(below)) {
        rect(ctx, x, y + 7, TILE, 9, wall[0]);
        ctx.fillStyle = COL.out;
        ctx.fillRect(x, y + 7, TILE, 1);
        const lit = lampAt(it, style, tx, ty);
        rect(ctx, x + 3, y + 10, 10, 3, lit ? style.lamp[1] : '#1c1c28');
        if (lit) {
          ctx.fillStyle = style.lamp[3];
          ctx.fillRect(x + 4, y + 11, 8, 1);
          glow(ctx, x + 8, y + TILE + 4, 13, style.lamp[2], 0.05);
        }
      }
      ctx.fillStyle = COL.out;
      if (open(0, -1)) ctx.fillRect(x, y, TILE, 1);
      if (open(0, 1)) ctx.fillRect(x, y + TILE - 1, TILE, 1);
      if (open(-1, 0)) ctx.fillRect(x, y, 1, TILE);
      if (open(1, 0)) ctx.fillRect(x + TILE - 1, y, 1, TILE);
    }
}

// A small plan of the whole place in the corner, since it no longer fits on the screen. It is drawn once and
// kept, and drawn again when a door has opened.
const plans = new WeakMap();
function drawPlan(ctx, it, me, x, y) {
  let kept = plans.get(it);
  if (!kept || kept.tiles !== it.tiles) {
    const canvas = document.createElement('canvas');
    canvas.width = it.w;
    canvas.height = it.h;
    const g = canvas.getContext('2d');
    for (let ty = 0; ty < it.h; ty++)
      for (let tx = 0; tx < it.w; tx++) {
        const c = tileAt(it, tx, ty);
        if (c === ' ') continue;
        g.fillStyle =
          c === '#'
            ? '#3a3d4e'
            : c === 'L'
              ? COL.ochre[2]
              : c === 'A'
                ? COL.acid[2]
                : c === 'X'
                  ? '#0d0d14'
                  : '#1d1f2b';
        g.fillRect(tx, ty, 1, 1);
      }
    kept = { canvas, tiles: it.tiles };
    plans.set(it, kept);
  }
  rect(ctx, x - 3, y - 3, it.w + 6, it.h + 6, COL.panel, COL.line);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(kept.canvas, x, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COL.acid[2];
  ctx.fillRect(x + Math.floor(it.entry.x / TILE) - 1, y + Math.floor(it.entry.y / TILE) - 1, 2, 2);
  if (!me) return;
  ctx.fillStyle = COL.white;
  ctx.fillRect(x + Math.floor(me.x / TILE) - 1, y + Math.floor(me.y / TILE) - 1, 3, 3);
}

function glow(ctx, x, y, r, color, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.globalAlpha = a * 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function effect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    ctx.globalAlpha = Math.max(0, 0.8 - u);
    ctx.fillStyle = COL.ember[3];
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (0.3 + u * 0.7), 0, 7);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - u);
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63,
        r = f.size * u;
      ctx.fillStyle = i % 2 ? COL.ochre[2] : COL.ember[1];
      ctx.fillRect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (f.type === 'teleport') {
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = COL.ion[2];
    ctx.fillRect(f.x - 4 + u * 3, f.y - 40, 8 - u * 6, 46);
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4 + u * 14, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = COL.ochre[3];
    ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    ctx.globalAlpha = 1;
  }
}

const DESK = {
  services: () => ['SERVICES', COL.ochre[2]],
  shipyard: (place) => (place.shipyard ? ['SHIPYARD', COL.captain] : ['NO SHIPYARD', COL.faint]),
  armory: () => ['ARMORY', COL.ember[1]],
};
const CROSSHAIR = [
  [-6, 0, 3, 1],
  [4, 0, 3, 1],
  [0, -6, 1, 3],
  [0, 4, 1, 3],
];

// The docked frigate and the tunnel from it into the airlock, outside the hull at the way in.
function drawTunnel(ctx, img, it) {
  const e = it.entry;
  ctx.save();
  ctx.translate(e.x, e.y);
  // Turned so that up is the way in.
  ctx.rotate(Math.atan2(e.nx, -e.ny));
  rect(ctx, -18, 8, 36, 50, WALL[0], COL.out);
  rect(ctx, -14, 8, 28, 50, '#191a25');
  ctx.fillStyle = WALL[0];
  for (let y = 14; y < 58; y += 10) ctx.fillRect(-14, y, 28, 1);
  sprite(ctx, img.frigate, 0, 58 + 44);
  ctx.restore();
}

// A trading desk with someone behind it.
function drawDesk(ctx, img, font, place, desk) {
  const [name, color] = DESK[desk.type](place);
  const up = true;
  glow(ctx, desk.x, desk.y, 16, color, 0.1);
  rect(ctx, desk.x - 18, desk.y - 5, 36, 10, '#2a2c3a', COL.out);
  rect(ctx, desk.x - 17, desk.y - 4, 34, 2, '#44475a');
  rect(ctx, desk.x - 14, desk.y - 1, 8, 4, color);
  rect(ctx, desk.x + 6, desk.y - 1, 3, 3, COL.acid[1]);
  sprite(ctx, img.boarder, desk.x, desk.y + (up ? -12 : 12), up ? Math.PI : 0);
  font.draw(ctx, name, desk.x, desk.y + (up ? 10 : -16), color, { align: 'c' });
}

// The terminal a hostile station is taken over from.
function drawTerminal(ctx, it, time) {
  const t = it.terminal;
  glow(ctx, t.x, t.y, 12, COL.ember[1], 0.16);
  rect(ctx, t.x - 7, t.y - 6, 14, 12, '#1c1c28', COL.out);
  rect(ctx, t.x - 5, t.y - 4, 10, 5, Math.floor(time * 3) % 2 ? COL.ember[1] : COL.ember[0]);
  rect(ctx, t.x - 5, t.y + 3, 3, 1, COL.ochre[2]);
  if (it.takeover <= 0) return;
  ctx.fillStyle = COL.acid[2];
  ctx.fillRect(t.x - 7, t.y + 8, Math.round(14 * Math.min(1, it.takeover)), 2);
}

function drawInsideBolt(ctx, b) {
  const col = b.owner === 'crew' ? COL.ochre : COL.acid;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = col[1];
  ctx.fillRect(-4, -1, 4, 2);
  ctx.fillStyle = col[3];
  ctx.fillRect(0, -1, 3, 2);
  ctx.restore();
}

// A grenade in the air, with its shadow on the floor. Once it has landed, a ring shows what it will reach.
function drawGrenade(ctx, g, time) {
  const u = g.t / g.dur;
  const lift = Math.sin(u * Math.PI) * 14;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = COL.out;
  ctx.fillRect(g.x - 2, g.y - 1, 4, 3);
  ctx.globalAlpha = 1;
  rect(ctx, g.x - 2, g.y - 2 - lift, 4, 4, '#434557', COL.out);
  ctx.fillStyle = Math.floor(time * 12) % 2 ? COL.ember[2] : COL.ember[0];
  ctx.fillRect(g.x - 1, g.y - 1 - lift, 2, 2);
  if (u < 1) return;
  ctx.strokeStyle = COL.ember[1];
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(g.x, g.y, B.GRENADE_RADIUS, 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A flare: a short stick with a white-hot end that throws sparks.
function drawFlare(ctx, f, time) {
  const lv = flareLevel(f.burn, B.FLARE_FADE, time);
  glow(ctx, f.x, f.y, 8, '#ffcf8a', 0.22 * lv);
  ctx.fillStyle = '#5a2a22';
  ctx.fillRect(f.x - 2, f.y, 4, 2);
  ctx.globalAlpha = Math.min(1, 0.3 + lv);
  ctx.fillStyle = '#fff6e0';
  ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
  ctx.fillStyle = COL.ochre[3];
  for (let i = 0; i < 3; i++) {
    const a = time * 9 + i * 2.1 + f.burn;
    const r = 3 + ((time * 14 + i * 5) % 5);
    ctx.fillRect(f.x + Math.cos(a) * r, f.y - 1 + Math.sin(a) * r, 1, 1);
  }
  ctx.globalAlpha = 1;
}

const WARM = '255,240,214';
const COLD = '196,214,236';
const RED = '255,74,52';
// Every light in a dark place: the few lamps that still work, the way home, what the crew carries and
// throws, and the small lights that guards and turrets carry themselves, so that nothing shoots unseen.
function lightsOf(state, it, style, origin) {
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
      else if (lampAt(it, style, tx, ty)) round(x, y + TILE + 2, 40, COLD, 0.5 * lampLevel(scatter(tx, ty), time));
    }
  round(it.entry.x, it.entry.y, 46, '190,236,200', 0.55);
  for (const l of it.loot) small(l.x, l.y, 11, l.type === 'crate' ? '219,164,69' : '155,228,238', 0.4);
  for (const e of [...it.guards, ...it.turrets]) round(e.x, e.y, 19, RED, 0.6);
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
function drawGlows(ctx, state, it, style, origin) {
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
  for (const e of [...it.guards, ...it.turrets]) {
    const f = forward(e.heading);
    ctx.fillRect(Math.round(e.x + f.x * 3) - 1, Math.round(e.y + f.y * 3) - 1, 2, 2);
  }
  ctx.fillStyle = COL.white;
  for (const l of it.loot) {
    if (Math.floor(time * 2 + l.x * 0.37 + l.y * 0.11) % 4 === 0) ctx.fillRect(l.x + 2, l.y - 4, 1, 1);
  }
}

// Everything on the floor, in the interior's own pixels.
function drawFloor(ctx, state, place, me, assets, fx, origin) {
  const { img, font } = assets;
  const it = place.interior;
  const style = styleOf(place);
  drawTunnel(ctx, img, it);
  drawTiles(ctx, it, origin, style);
  for (const desk of it.desks) drawDesk(ctx, img, font, place, desk);
  for (const c of it.civilians) {
    shadow(ctx, c.x, c.y, 5);
    sprite(ctx, img.boarder, c.x, c.y, c.heading);
  }
  for (const l of it.loot) {
    shadow(ctx, l.x, l.y, 5);
    glow(ctx, l.x, l.y, 9, l.type === 'crate' ? COL.ochre[2] : COL.ion[2], 0.14);
    sprite(ctx, img[l.type], l.x, l.y);
  }
  if (it.terminal) drawTerminal(ctx, it, state.time);
  for (const t of it.turrets) {
    shadow(ctx, t.x, t.y, 6);
    sprite(ctx, img.turret_guard, t.x, t.y, t.heading);
  }
  for (const s of it.sentries) {
    glow(ctx, s.x, s.y, 9, COL.ion[2], 0.12);
    sprite(ctx, img.turret_pulse, s.x, s.y, s.heading, 6, 10.5);
  }
  for (const g of it.guards) {
    shadow(ctx, g.x, g.y, 5);
    sprite(ctx, img.guard, g.x, g.y, g.heading);
  }
  for (const a of it.avatars) {
    shadow(ctx, a.x, a.y, 5);
    sprite(ctx, img.boarder, a.x, a.y, a.heading);
  }
  if (it.dark) {
    const off = fx ? fx.offset : { x: 0, y: 0 };
    shade(ctx, it, origin.x + off.x, origin.y + off.y, lightsOf(state, it, style, origin));
    drawGlows(ctx, state, it, style, origin);
  }
  // What is drawn from here on is not dimmed by the dark.
  ctx.fillStyle = COL.ember[2];
  for (const g of it.guards) {
    if (g.mode !== 'alert') continue;
    ctx.fillRect(g.x - 1, g.y - 14, 2, 4);
    ctx.fillRect(g.x - 1, g.y - 9, 2, 2);
  }
  for (const a of it.avatars) {
    // A ring marks the player's own figure.
    if (a === me) {
      ctx.strokeStyle = COL.ion[2];
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 9, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    a.carry.forEach((c, i) => {
      rect(ctx, a.x - 5 + i * 4, a.y - 13, 3, 3, c.type === 'crate' ? COL.ochre[2] : COL.ion[2], COL.out);
    });
  }
  for (const b of it.bolts) drawInsideBolt(ctx, b);
  for (const g of it.grenades) drawGrenade(ctx, g, state.time);
  for (const f of it.flares) drawFlare(ctx, f, state.time);
  for (const f of it.fx) effect(ctx, f);
  if (fx) fx.inside.draw(ctx);
}

// The line at the top that says where the player is and what is going on there.
function drawPlaceLine(ctx, font, place) {
  const it = place.interior;
  const x = VIEW_W / 2 + 60;
  if (it.trade) {
    const text = `${place.name}  ·  ${place.align.toUpperCase()} STATION`;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: place.align === 'friendly' ? COL.engineer : COL.text });
  } else if (place.kind === 'station') {
    const text = it.terminal ? `${place.name}  ·  FIND THE TERMINAL IN THE VAULT` : `${place.name} IS YOURS`;
    const col = it.terminal ? COL.ember : COL.acid;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
  } else {
    const col = it.timer < 30 ? COL.ember : COL.ochre;
    const text = 'REACTOR UNSTABLE   ' + fmt(Math.max(0, it.timer));
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
  }
}

// On a trading station: where to go. What can be done at a desk or the airlock shows as a button, see actions.js.
function drawVisitorHud(ctx, font) {
  const keys = 'W A S D MOVE  ·  WALK UP TO A DESK TO TRADE, OR TO THE AIRLOCK TO LEAVE';
  font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
}

// While boarding: health, weapons, how the ship is doing, and a prompt for what the use key does here.
function drawBoarderHud(ctx, font, state, view, player, place, me, origin) {
  const it = place.interior;
  const ship = state.ship;
  rect(ctx, 8, 332, 100, 22, COL.panel, COL.line);
  font.draw(ctx, 'HP', 12, 340, COL.dim);
  bar(ctx, 28, 340, 74, player.hp / crewHpMax(ship), player.hp < 40 ? COL.ember[1] : COL.engineer);
  let x = label(ctx, font, 114, 336, 'TELEPORT READY', { fg: COL.ion[2], border: COL.ion[0] }) + 6;
  x = label(ctx, font, x, 336, 'RIFLE', { fg: COL.out, bg: COL.gunner, border: null, pad: 6 }) + 4;
  const grenades = me ? me.grenades : 0;
  x = label(ctx, font, x, 336, 'GRENADES  ' + grenades, { fg: grenades ? COL.text : COL.faint }) + 4;
  if (me && me.charges) x = label(ctx, font, x, 336, 'C  CHARGES  ' + me.charges) + 4;
  if (me && me.sentries) x = label(ctx, font, x, 336, 'T  TURRET') + 4;
  // What is carried for the dark has a line of its own above the rest.
  if (me && it.dark) {
    const lamp = label(ctx, font, 114, 320, me.lamp ? 'L  LAMP' : 'L  LAMP OFF', {
      fg: me.lamp ? COL.text : COL.faint,
    });
    if (me.flares) label(ctx, font, lamp + 4, 320, 'Q  FLARES  ' + me.flares);
  }
  x += 6;
  font.draw(ctx, 'SHIP', x, 334, COL.dim);
  bar(ctx, x + 26, 333, 50, ship.shield / shieldMax(ship), COL.ion[1], 5);
  bar(ctx, x + 26, 340, 50, ship.hull / hullMax(ship), COL.steel[2], 5);
  if (state.time - ship.lastHit < 1.5) font.draw(ctx, 'UNDER FIRE', x, 346, COL.ember[2]);
  if (x < 470) {
    const keys = x < 400 ? 'W A S D MOVE  ·  CLICK FIRE  ·  G GRENADE' : 'G GRENADE';
    font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  }
  // What is being worked on shows where it happens. The key for it is on a button, see actions.js.
  const at = me && useTarget(it, me);
  if (at && at.type === 'terminal' && it.hacking) {
    const look = { anchor: 'c', fg: COL.acid[2], border: COL.acid[0] };
    label(ctx, font, origin.x + it.terminal.x, origin.y + it.terminal.y - 30, 'TAKING OVER THE STATION', look);
  } else if (at && at.type === 'door' && it.cutting) {
    const look = { anchor: 'c', fg: COL.ochre[2], border: COL.ochre[0] };
    label(ctx, font, origin.x + at.door.x, origin.y + at.door.y + 22, 'CUTTING THE LOCK', look);
  }
  ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of CROSSHAIR)
    ctx.fillRect(Math.round(view.mouse.x) + dx, Math.round(view.mouse.y) + dy, w, h);
}

export function drawBoarding(ctx, state, view, assets) {
  const { font } = assets;
  const player = playerById(state, view.playerId);
  const place = findDock(state, player.inside);
  const it = place.interior;
  const me = it.avatars.find((a) => a.player === player.id);
  const fx = view.fx;
  const origin = insideOrigin(it, me);
  drawStars(ctx, { x: place.x * 0.2 - origin.x * 0.3, y: place.y * 0.2 - origin.y * 0.3 }, fx, state.sector);
  ctx.save();
  ctx.translate(origin.x + (fx ? fx.offset.x : 0), origin.y + (fx ? fx.offset.y : 0));
  drawFloor(ctx, state, place, me, assets, fx, origin);
  ctx.restore();

  const where = label(ctx, font, 8, 8, it.trade ? 'ON THE STATION' : 'BOARDING', {
    fg: COL.out,
    bg: COL.white,
    border: null,
  });
  label(ctx, font, where + 4, 8, 'AWAY FROM YOUR POST', { fg: COL.faint });
  drawPlaceLine(ctx, font, place);
  // Only the best enemy alarm reaches the people inside.
  const alarm = level(state.ship, 'alarm') >= 3 && alarmText(state);
  if (alarm) label(ctx, font, VIEW_W / 2 + 60, 24, alarm, { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
  if (!it.trade) {
    const carried = `CARRY  ${me ? me.carry.length : 0} / ${carryMax(state.ship)}`;
    label(ctx, font, VIEW_W - 8, 8, carried, { anchor: 'r', fg: COL.ochre[2] });
  }
  const credits = { anchor: 'r', fg: it.trade ? COL.ochre[2] : COL.dim };
  label(ctx, font, VIEW_W - 8, it.trade ? 8 : 22, `CREDITS  ${state.credits}`, credits);
  // The plan of the place sits under the lines in the corner.
  drawPlan(ctx, it, me, VIEW_W - 11 - it.w, it.trade ? 28 : 42);
  if (it.trade) drawVisitorHud(ctx, font);
  else drawBoarderHud(ctx, font, state, view, player, place, me, origin);
}
