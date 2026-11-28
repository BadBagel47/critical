// The fixed parts of an inside (D-227): the floor and its marks, the walls with their lamps, the things that
// stand in the rooms, the doors, the round outer wall of a base and the ways between its floors.
import { COL, VIEW_H, VIEW_W } from '../config.js';
import { TILE, tileAt } from '../sim/boarding.js';
import { FACTIONS } from '../sim/sides.js';
import { rect } from './draw.js';
import { DECK_NAMES } from '../sim/base.js';
import { likeOf } from '../sim/furnish.js';
import { glow } from './inside-things.js';
import { keeper } from './keep.js';

const FLOOR = new Set(['.', ',', 'A']);

export const WALL = ['#2a2c3a', '#44475a', '#666a7e'];

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

export const styleOf = (place) =>
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
export const scatter = (tx, ty) => ((tx * 73856093) ^ (ty * 19349663)) >>> 0;

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
// A locked door, such as the vault's: a heavy slab with bolts, and how far the crew has cut through it.
function drawLock(ctx, it, x, y) {
  rect(ctx, x + 1, y + 3, TILE - 2, 10, '#1c1c28', COL.out);
  for (let k = 2; k < TILE - 2; k += 6) {
    ctx.fillStyle = COL.ochre[1];
    ctx.fillRect(x + k, y + 6, 3, 4);
  }
  if (it.doorCut > 0) {
    ctx.fillStyle = COL.ochre[3];
    ctx.fillRect(x, y + 13, Math.round(TILE * Math.min(1, it.doorCut)), 2);
  }
}

// What changes on a floor of a base, drawn over its picture (F-208): the locked doors and the doors.
export function drawBaseChanges(ctx, it, origin, time = 0) {
  const tx0 = Math.max(0, Math.floor(-origin.x / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(-origin.y / TILE) - 1);
  const tx1 = Math.min(it.w, Math.ceil((VIEW_W - origin.x) / TILE) + 1);
  const ty1 = Math.min(it.h, Math.ceil((VIEW_H - origin.y) / TILE) + 1);
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) if (tileAt(it, tx, ty) === 'L') drawLock(ctx, it, tx * TILE, ty * TILE);
  drawDoors(ctx, it, time);
}

export const lampAt = (it, style, tx, ty) =>
  tx % 2 === 0 &&
  tileAt(it, tx, ty) === '#' &&
  FLOOR.has(tileAt(it, tx, ty + 1)) &&
  (scatter(tx, ty) % 100) / 100 >= style.dead;

// The tiles that are on the screen, given where the place is drawn.
export function drawTiles(ctx, it, origin, style, time = 0) {
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
      if (!FLOOR.has(c) && c !== 'K' && c !== 'D') continue;
      rect(ctx, x, y, TILE, TILE, style.floor[(c === ',' || c === 'D' ? 2 : 0) + ((tx + ty) % 2)]);
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
        drawLock(ctx, it, x, y);
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
  drawThings(ctx, it, tx0, ty0, tx1, ty1);
  drawDoors(ctx, it, time);
}

// What each tile of furniture belongs to: the use of the room it stands in. Worked out once for each place.
const thingUses = keeper();

function useAt(it, tx, ty) {
  let map = thingUses.get(it);
  if (!map) {
    map = new Map();
    it.rooms.forEach((r, i) => {
      for (let y = r.r0; y <= r.r1; y++) for (let x = r.c0; x <= r.c1; x++) map.set(y * it.w + x, likeOf(it.uses[i]));
    });
    thingUses.set(it, map);
  }
  return map.get(ty * it.w + tx);
}

// The things that stand in the rooms (F-152): crates in a cargo hold, bunks and lockers for the crew, tables in a
// mess, consoles on a bridge and at the mainframe, shelves in the stores and machines in the engine room.
function drawThings(ctx, it, tx0, ty0, tx1, ty1) {
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      if (tileAt(it, tx, ty) !== 'K') continue;
      const x = tx * TILE,
        y = ty * TILE;
      const use = useAt(it, tx, ty);
      const same = (dx, dy) => tileAt(it, tx + dx, ty + dy) === 'K';
      // A shadow on the floor, so that it stands up from it.
      ctx.fillStyle = COL.out;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 1, y + 3, TILE - 1, TILE - 2);
      ctx.globalAlpha = 1;
      const l = same(-1, 0) ? 0 : 1,
        r = same(1, 0) ? TILE : TILE - 1;
      if (use === 'CARGO') {
        rect(ctx, x + 1, y + 1, TILE - 2, TILE - 3, COL.ochre[1], COL.out);
        rect(ctx, x + 1, y + 1, TILE - 2, 2, COL.ochre[2]);
        ctx.fillStyle = COL.ochre[0];
        ctx.fillRect(x + 7, y + 1, 2, TILE - 3);
        ctx.fillRect(x + 1, y + 7, TILE - 2, 1);
      } else if (use === 'CREW') {
        rect(ctx, x + l, y + 2, r - l, TILE - 5, COL.steel[1], COL.out);
        if (!same(-1, 0)) rect(ctx, x + 3, y + 4, 5, 5, '#d2cbb0');
        ctx.fillStyle = COL.steel[3];
        ctx.fillRect(x + l + 1, y + 3, r - l - 2, 1);
      } else if (use === 'MESS') {
        rect(ctx, x + l, y + 3, r - l, TILE - 7, '#a39c84', COL.out);
        ctx.fillStyle = '#d2cbb0';
        ctx.fillRect(x + l + 1, y + 4, r - l - 2, 1);
      } else if (use === 'BRIDGE' || use === 'CONTROL') {
        const screen = use === 'BRIDGE' ? COL.ion : COL.acid;
        rect(ctx, x + 2, y + 2, TILE - 4, TILE - 5, '#2a2c3a', COL.out);
        rect(ctx, x + 4, y + 4, TILE - 8, 4, screen[1]);
        ctx.fillStyle = screen[3];
        ctx.fillRect(x + 5, y + 5, 2, 1);
      } else if (use === 'STORES') {
        rect(ctx, x + 2, y + 1, TILE - 4, TILE - 3, COL.steel[0], COL.out);
        for (let k = 3; k < TILE - 4; k += 4) rect(ctx, x + 4, y + k, TILE - 8, 2, COL.ochre[1]);
      } else {
        // An engine room's machines, and anything else: a housing with a warm light.
        rect(ctx, x + 1, y + 1, TILE - 2, TILE - 3, '#2a2c3a', COL.out);
        ctx.fillStyle = '#44475a';
        ctx.fillRect(x + 3, y + 3, TILE - 6, 2);
        ctx.fillStyle = COL.ember[1];
        ctx.fillRect(x + 6, y + 8, 3, 2);
      }
    }
}

// The lamp on a door. Green where all is calm. In lockdown every door lamp is red and still, and in an alarm it
// blinks, once a second at most (R-1149, R-1150, R-1193). The doors of an airlock are yellow while it turns, and
// those of the command room red while they are sealed.
export function doorLamp(it, d, closed, time) {
  if (it.mood === 'alarm') return time % 1 < 0.5 ? COL.ember[2] : COL.ember[0];
  if (it.mood === 'lockdown') return it.power === false ? '#ff9a46' : '#ff5a48';
  if (d.kind === 'lock') {
    const lock = it.locks && it.locks[it.airlocks.findIndex((a) => a.room === d.room)];
    return lock && lock.busy > 0 ? COL.ochre[2] : COL.acid[2];
  }
  if (d.kind === 'command' && closed) return '#ff5a48';
  return COL.acid[2];
}

// The doors of the rooms: shut, a slab with a lamp, and open, two halves slid into the frame. A sealed door (of an
// airlock or the command room) is shut while its tiles are sealed.
export function drawDoors(ctx, it, time = 0) {
  const shut = new Set(it.shut || []);
  for (const d of it.doors || []) {
    const sealed = d.tiles.some((i) => it.tiles[i] === 'D');
    const closed = sealed || d.tiles.some((i) => shut.has(i));
    const lamp = doorLamp(it, d, closed, time);
    const heavy = d.kind === 'lock' || d.kind === 'command';
    for (const i of d.tiles) {
      const tx = i % it.w,
        ty = (i - tx) / it.w;
      const x = tx * TILE,
        y = ty * TILE;
      // Which way the doorway runs: across a wall above and below it, or one to its left and right.
      const across = solid(tileAt(it, tx - 1, ty)) || solid(tileAt(it, tx + 1, ty));
      if (closed) {
        const t = heavy ? 4 : 5;
        if (across) rect(ctx, x, y + t, TILE, TILE - 2 * t, heavy ? '#3a3b4c' : '#2c2d3b', COL.out);
        else rect(ctx, x + t, y, TILE - 2 * t, TILE, heavy ? '#3a3b4c' : '#2c2d3b', COL.out);
        // Hazard stripes on the heavy doors.
        if (heavy) {
          ctx.fillStyle = '#8a7234';
          if (across) for (let k = 1; k < TILE; k += 4) ctx.fillRect(x + k, y + t + 1, 2, 1);
          else for (let k = 1; k < TILE; k += 4) ctx.fillRect(x + t + 1, y + k, 1, 2);
        }
        ctx.fillStyle = lamp;
        ctx.fillRect(x + 7, y + 7, 2, 2);
      } else {
        ctx.fillStyle = '#434557';
        if (across) {
          ctx.fillRect(x, y + 5, 2, 6);
          ctx.fillRect(x + TILE - 2, y + 5, 2, 6);
        } else {
          ctx.fillRect(x + 5, y, 6, 2);
          ctx.fillRect(x + 5, y + TILE - 2, 6, 2);
        }
      }
    }
  }
}

// How thick the round outer wall of a floor of a base is drawn, in pixels.
export const HULL = 9;

// The round outer wall: a band along the circle, lit a little on its inner edge.
export function drawHull(ctx, deck, style) {
  ctx.lineWidth = HULL;
  ctx.strokeStyle = style.wall[1];
  ctx.beginPath();
  ctx.arc(deck.cx, deck.cy, deck.r + HULL / 2, 0, 7);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = style.wall[2];
  ctx.beginPath();
  ctx.arc(deck.cx, deck.cy, deck.r + 0.5, 0, 7);
  ctx.stroke();
  ctx.strokeStyle = COL.out;
  ctx.beginPath();
  ctx.arc(deck.cx, deck.cy, deck.r + HULL - 0.5, 0, 7);
  ctx.stroke();
}

// The ways between floors: the floor of the lift, the steps of the stairs and the rungs of a ladder, and a sign
// that says where they go.
const LINK_NAME = { lift: 'LIFT', stairs: 'STAIRS', ladder: 'LADDER' };

export function drawLinks(ctx, font, it) {
  for (const l of it.links || []) {
    l.at.forEach((p, k) => {
      const up = k === 0;
      if (l.kind === 'lift') {
        rect(ctx, p.x - 22, p.y - 14, 44, 28, '#23252f', COL.out);
        ctx.fillStyle = '#3a3d4e';
        for (let i = -18; i < 20; i += 6) ctx.fillRect(p.x + i, p.y - 12, 1, 24);
      } else if (l.kind === 'stairs') {
        for (let i = 0; i < 6; i++)
          rect(ctx, p.x - 14, p.y - 30 + i * 10, 28, 8, i % 2 ? '#2e303c' : '#363846', COL.out);
      } else {
        ctx.fillStyle = '#6a6e80';
        ctx.fillRect(p.x - 6, p.y - 12, 1, 24);
        ctx.fillRect(p.x + 5, p.y - 12, 1, 24);
        for (let i = -10; i < 12; i += 5) ctx.fillRect(p.x - 6, p.y + i, 12, 1);
      }
      const where = DECK_NAMES[l.decks[up ? 1 : 0]];
      font.draw(ctx, `${LINK_NAME[l.kind]}  ${up ? 'UP' : 'DOWN'} TO ${where}`, p.x, p.y - 28, COL.ion[2], {
        align: 'c',
      });
    });
  }
}
