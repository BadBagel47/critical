// What the rooms of a wreck or a station are for, the things that stand in them, and the doors (F-152).
// Every room gets a use: the vault, the room with the mainframe, the engines of a wreck, and the rest by size.
// The things in a room are solid tiles ('K') that block a shot and a look like a wall, so that there is cover in
// every room, for the crew and the guards alike. They never close a way: a thing is only put down where every
// spot of the room can still be walked to from its door, and the middle of a room and its door are kept clear.
// The doors of the rooms shut when nobody is near them. A shut door blocks a look and a shot, not a step: it
// opens for whoever walks up to it.
import { TILE } from './layout.js';
import { dist } from './util.js';

export const USES = ['CARGO', 'CREW', 'MESS', 'BRIDGE', 'STORES', 'ENGINES', 'CONTROL', 'VAULT'];
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

// What each room is for. `far` is the room of a wreck that is furthest in, where its reactor stands.
export function usesOf(it, place, far) {
  const out = it.rooms.map(() => null);
  out[it.vault] = 'VAULT';
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

// How many tiles can be walked to from the first airlock, with the vault door counted as open.
const WALK = new Set(['.', ',', 'A', 'L']);
function reachable(it) {
  const a = it.airlocks[0];
  const first = Math.floor(a.y / TILE) * it.w + Math.floor(a.x / TILE);
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
      if (!WALK.has(at(it, tx + dx, ty + dy))) continue;
      const j = (ty + dy) * it.w + tx + dx;
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
  ].some(([dx, dy]) => [',', 'A', 'L'].includes(at(it, tx + dx, ty + dy)));

// Put the things into each room, where they fit. Only the room's own floor is used, never a corridor.
export function furnish(it) {
  it.rooms.forEach((r, i) => {
    const list = THINGS[it.uses[i]] || [];
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
      const before = reachable(it);
      for (const t of tiles) put(it, t.tx, t.ty, 'K');
      // Taken away again if it would cut off any part of the place.
      if (reachable(it) !== before - tiles.length) for (const t of tiles) put(it, t.tx, t.ty, '.');
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
    if (tiles.length) out.push({ x: r.door.x, y: r.door.y, room: i, tiles });
  });
  return out;
}

// A door is open while anyone stands near it, and shut otherwise. `it.shut` holds the tiles of the shut doors.
export const DOOR_REACH = 26;
export function stepDoors(it) {
  const who = [...it.avatars, ...it.guards, ...it.civilians];
  it.shut = [];
  for (const d of it.doors) {
    if (who.some((p) => dist(p.x, p.y, d.x, d.y) < DOOR_REACH)) continue;
    it.shut.push(...d.tiles);
  }
}
