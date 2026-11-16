// What the rooms of a wreck or a station are for, the things that stand in them, and the doors (F-152).
// Every room gets a use: the vault, the room with the mainframe, the engines of a wreck, and the rest by size.
// The things in a room are solid tiles ('K') that block a shot and a look like a wall, so that there is cover in
// every room, for the crew and the guards alike. They never close a way: a thing is only put down where every
// spot of the room can still be walked to from its door, and the middle of a room and its door are kept clear.
// The doors of the rooms shut when nobody is near them. A shut door blocks a look and a shot, not a step: it
// opens for whoever walks up to it.
import { TILE } from './layout.js';
import { dist } from './util.js';

// What the things in a room look like, and how they stand: a kind of its own, or like one of the older kinds.
const LIKE = {
  HOLD: 'CARGO',
  FUEL: 'ENGINES',
  SPARES: 'STORES',
  GALLEY: 'MESS',
  SICKBAY: 'CREW',
  WORKSHOP: 'ENGINES',
  CAPTAIN: 'CREW',
  RADIO: 'BRIDGE',
  // The rooms of a base, see base.js.
  REACTOR: 'ENGINES',
  REFINERY: 'ENGINES',
  PUMPS: 'ENGINES',
  COOLING: 'ENGINES',
  BARRACKS: 'CREW',
  HOTEL: 'CREW',
  CLINIC: 'CREW',
  QUARTERS: 'CREW',
  LOCKERS: 'STORES',
  ARMORY: 'STORES',
  ARMS: 'STORES',
  SERVERS: 'STORES',
  ARCHIVE: 'STORES',
  LAUNDRY: 'STORES',
  PANTRY: 'STORES',
  SHIPYARD: 'STORES',
  MARKET: 'CARGO',
  BAR: 'MESS',
  KITCHEN: 'MESS',
  LOUNGE: 'MESS',
  SERVICES: 'BRIDGE',
  SECURITY: 'BRIDGE',
  OFFICE: 'BRIDGE',
  SENSORS: 'BRIDGE',
  COMMS: 'BRIDGE',
  COMMAND: 'CONTROL',
  // Rooms that are left bare: the ways in and out and between floors, and those with something of their own.
  AIRLOCK: 'VAULT',
  LIFT: 'VAULT',
  STAIRS: 'VAULT',
  LADDER: 'VAULT',
  GUN: 'VAULT',
  BREAKER: 'ENGINES',
  DRONES: 'CARGO',
};
export const likeOf = (use) => LIKE[use] || use;
export const USES = ['CARGO', 'CREW', 'MESS', 'BRIDGE', 'STORES', 'ENGINES', 'CONTROL', 'VAULT', ...Object.keys(LIKE)];
// What the other rooms are, in turn from the largest: in a wreck and on a station.
const IN_TURN = { wreck: ['CARGO', 'CREW', 'MESS', 'BRIDGE'], station: ['CARGO', 'CREW', 'MESS', 'STORES'] };
// The things in each kind of room, as [column, row, width, height] in tiles from the room's first floor tile.
// A negative column or row counts from the far side.
const THINGS = {
  CARGO: [
    [1, 1, 2, 2],
    [-3, -3, 2, 1],
    [-2, 1, 1, 2],
    [1, -2, 2, 1],
  ],
  CREW: [
    [1, 0, 2, 1],
    [4, 0, 2, 1],
    [7, 0, 2, 1],
    [1, -1, 1, 1],
    [-2, -1, 1, 1],
  ],
  MESS: [
    [1, 2, 2, 1],
    [-3, 2, 2, 1],
    [1, -3, 2, 1],
    [-3, -3, 2, 1],
  ],
  BRIDGE: [
    [1, 0, 1, 1],
    [3, 0, 1, 1],
    [5, 0, 1, 1],
    [7, 0, 1, 1],
    [-3, -2, 2, 1],
  ],
  STORES: [
    [0, 1, 1, 2],
    [-1, 1, 1, 2],
    [2, -1, 2, 1],
  ],
  ENGINES: [
    [1, 1, 1, 2],
    [-2, 1, 1, 2],
    [2, -2, 2, 1],
  ],
  CONTROL: [
    [0, 0, 1, 1],
    [-1, 0, 1, 1],
    [0, -1, 1, 1],
    [-1, -1, 1, 1],
  ],
  VAULT: [],
};

const tileOf = (p) => ({ tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) });
const at = (it, tx, ty) => (tx < 0 || ty < 0 || tx >= it.w || ty >= it.h ? ' ' : it.tiles[ty * it.w + tx]);
const put = (it, tx, ty, c) => {
  it.tiles[ty * it.w + tx] = c;
};

// What each room is for. A plan that knows what its rooms are says so itself (`use`). Otherwise `far` is the
// room of a wreck that is furthest in, where its reactor stands, and the rest go by size.
export function usesOf(it, place, far) {
  const out = it.rooms.map((r) => r.use || null);
  out[it.vault] = 'VAULT';
  if (out.every(Boolean)) return out;
  it.rooms.forEach((r, i) => {
    if (it.mainframe && r.mid.x === it.mainframe.x && r.mid.y === it.mainframe.y) out[i] = 'CONTROL';
    if (far && r === far) out[i] = 'ENGINES';
  });
  const area = (r) => (r.c1 - r.c0) * (r.r1 - r.r0);
  const rest = it.rooms.map((r, i) => i).filter((i) => !out[i]);
  rest.sort((a, b) => area(it.rooms[b]) - area(it.rooms[a]) || a - b);
  const turn = IN_TURN[place.kind === 'station' ? 'station' : 'wreck'];
  rest.forEach((i, k) => (out[i] = turn[k % turn.length]));
  return out;
}

// How many tiles of a room can be walked to from its door without leaving the room.
const WALK = new Set(['.', ',', 'A', 'L', 'D']);
function reachable(it, r) {
  const door = tileOf(r.door);
  const first = door.ty * it.w + door.tx;
  const seen = new Set([first]);
  const todo = [first];
  while (todo.length) {
    const i = todo.pop();
    const tx = i % it.w,
      ty = (i - tx) / it.w;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = tx + dx,
        ny = ty + dy;
      if (nx < r.c0 || nx > r.c1 || ny < r.r0 || ny > r.r1 || !WALK.has(at(it, nx, ny))) continue;
      const j = ny * it.w + nx;
      if (seen.has(j)) continue;
      seen.add(j);
      todo.push(j);
    }
  }
  return seen.size;
}
// Not by a doorway or the edge of a corridor, so that no way in is ever narrowed.
const byWayIn = (it, tx, ty) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => [',', 'A', 'L', 'D'].includes(at(it, tx + dx, ty + dy)));

// A room much larger than the lists above are made for gets more of the same, in rows with ways between them:
// stacks of crates in a hold, and so on. `n` is a number that is always the same for a spot, to leave gaps.
const ROWS = {
  CARGO: [2, 2, 5, 4],
  STORES: [1, 2, 4, 4],
  ENGINES: [2, 1, 6, 4],
  MESS: [2, 1, 5, 4],
  CREW: [2, 1, 5, 4],
};
const LARGE = 90;
const gap = (tx, ty) => (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 5 === 0;
function rowsFor(use, r) {
  const rows = ROWS[use];
  const w = r.c1 - r.c0 - 1,
    h = r.r1 - r.r0 - 1;
  if (!rows || w * h < LARGE) return [];
  const [bw, bh, dx, dy] = rows;
  const out = [];
  for (let row = 2; row + bh <= h - 2; row += dy)
    for (let c = 2; c + bw <= w - 2; c += dx) if (!gap(r.c0 + c, r.r0 + row)) out.push([c, row, bw, bh]);
  return out;
}

// Put the things into each room, where they fit. Only the room's own floor is used, never a corridor.
export function furnish(it) {
  it.rooms.forEach((r, i) => {
    const use = likeOf(it.uses[i]);
    const large = rowsFor(use, r);
    const list = large.length ? large : THINGS[use] || [];
    if (!r.door || !list.length) return;
    const door = tileOf(r.door);
    const mid = tileOf(r.mid);
    const fx0 = r.c0 + 1,
      fx1 = r.c1 - 1,
      fy0 = r.r0 + 1,
      fy1 = r.r1 - 1;
    for (const [c, row, w, h] of list) {
      const x0 = c >= 0 ? fx0 + c : fx1 + c + 1;
      const y0 = row >= 0 ? fy0 + row : fy1 + row + 1;
      const tiles = [];
      for (let ty = y0; ty < y0 + h; ty++) for (let tx = x0; tx < x0 + w; tx++) tiles.push({ tx, ty });
      const fits = tiles.every(
        ({ tx, ty }) =>
          tx >= fx0 &&
          tx <= fx1 &&
          ty >= fy0 &&
          ty <= fy1 &&
          at(it, tx, ty) === '.' &&
          Math.max(Math.abs(tx - mid.tx), Math.abs(ty - mid.ty)) > 1 &&
          dist(tx, ty, door.tx, door.ty) > 2.5 &&
          !byWayIn(it, tx, ty),
      );
      if (!fits) continue;
      const before = reachable(it, r);
      for (const t of tiles) put(it, t.tx, t.ty, 'K');
      // Taken away again if it would cut off any part of the room.
      if (reachable(it, r) !== before - tiles.length) for (const t of tiles) put(it, t.tx, t.ty, '.');
    }
  });
}

// The doors of the rooms, each as the floor tiles in its doorway. The vault has its own locked door.
export function doorsOf(it) {
  const out = [];
  it.rooms.forEach((r, i) => {
    if (!r.door || i === it.vault) return;
    const t = tileOf(r.door);
    const tiles = [];
    for (let ty = t.ty - 1; ty <= t.ty + 1; ty++)
      for (let tx = t.tx - 1; tx <= t.tx + 1; tx++) {
        const c = at(it, tx, ty);
        if ((c === '.' || c === ',') && dist((tx + 0.5) * TILE, (ty + 0.5) * TILE, r.door.x, r.door.y) < 12) {
          tiles.push(ty * it.w + tx);
        }
      }
    if (tiles.length) out.push({ x: r.door.x, y: r.door.y, room: i, tiles, kind: 'slide' });
  });
  return out;
}

// A door is open while anyone stands near it, and shut otherwise. `it.shut` holds the tiles of the shut doors.
// The doors that are sealed (of an airlock, the command room and the vault) are not worked this way: they are
// tiles of their own, see floor.js.
export const DOOR_REACH = 26;
const SLIDES = new Set(['slide', 'staff', 'alarm']);
export function stepDoors(it) {
  const who = [...it.avatars, ...it.guards, ...it.civilians];
  it.shut = [];
  for (const d of it.doors) {
    if (!SLIDES.has(d.kind)) continue;
    if (who.some((p) => dist(p.x, p.y, d.x, d.y) < DOOR_REACH)) continue;
    it.shut.push(...d.tiles);
  }
}
