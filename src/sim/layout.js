// Floor plans. Every wreck and station gets a plan of its own, made from the game's random numbers, so a
// place is the same for as long as a game lasts and new in the next one. The plan follows the shape of what
// was boarded: a wreck is long and narrow like the ship it was, and a station is a ring round a hub.
//
// A plan is { w, h, tiles, rooms, vault, halls, airlocks, far }:
//   w, h      its size in tiles
//   tiles     one character for each tile, row by row:
//             ' ' space outside the hull   '#' wall   '.' the floor of a room   ',' the floor of a corridor
//             'L' the locked door of the vault   'A' an airlock   'X' a room torn open to space
//   rooms     { c0, c1, r0, r1, door, mid }: the walls round each room, in tiles, and the middle of its door
//             and a spot in the middle of its floor, in pixels
//   vault     which of the rooms is the vault
//   halls     the corridors, as boxes like the rooms
//   airlocks  { x, y, nx, ny }: where the crew comes in, in pixels, and which way is inwards.
//             A station has one for each docking arm, in the order of its ports in kinds.js
//   far       a spot in a corridor far from the way in, where the first turret stands
import { rand } from './util.js';

export const TILE = 16;
const WALKABLE = new Set(['.', ',', 'A']);
const AROUND = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const pickInt = (state, lo, hi) => lo + Math.floor(rand(state) * (hi - lo + 1));
const pickOf = (state, list) => list[Math.floor(rand(state) * list.length)];
const px = (tiles) => tiles * TILE;

// A grid that is easy to write to while a plan is made.
function makeGrid(w, h) {
  const cells = new Array(w * h).fill(' ');
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  return {
    w,
    h,
    cells,
    get: (x, y) => (inside(x, y) ? cells[y * w + x] : ' '),
    set(x, y, c) {
      if (inside(x, y)) cells[y * w + x] = c;
    },
  };
}

// How many steps it is to every tile that can be walked to from the start. Locked doors count as open.
function stepsFrom(grid, sx, sy) {
  const steps = new Map([[sy * grid.w + sx, 0]]);
  const todo = [[sx, sy]];
  for (let i = 0; i < todo.length; i++) {
    const [x, y] = todo[i];
    const n = steps.get(y * grid.w + x);
    for (const [dx, dy] of AROUND) {
      const c = grid.get(x + dx, y + dy);
      const key = (y + dy) * grid.w + x + dx;
      if (steps.has(key) || !(WALKABLE.has(c) || c === 'L')) continue;
      steps.set(key, n + 1);
      todo.push([x + dx, y + dy]);
    }
  }
  return steps;
}

// A tile in the middle of a room that is sure to be floor, in pixels. `shift` is how far the tiles are drawn
// in from the edge of the grid.
function midOf(tiles, shift = 0) {
  const [x, y] = tiles[Math.floor(tiles.length / 2)];
  return { x: px(x + shift) + TILE / 2, y: px(y) + TILE / 2 };
}

// The walls round a set of floor tiles.
function boxOf(tiles) {
  const xs = tiles.map((t) => t[0]);
  const ys = tiles.map((t) => t[1]);
  return { c0: Math.min(...xs) - 1, c1: Math.max(...xs) + 1, r0: Math.min(...ys) - 1, r1: Math.max(...ys) + 1 };
}

// ---------------------------------------------------------------- wrecks
// Each hull: how long it is in tiles, half its width from the stern (0) to the bow (1), and how wide its rooms are.
const WRECKS = {
  gunboat: { length: 36, half: (t) => (t < 0.55 ? 8 : 8 - (t - 0.55) * 11), rooms: [6, 8] },
  hull: { length: 52, half: (t) => (t < 0.6 ? 7 + 3 * Math.min(1, t * 4) : 10 - (t - 0.6) * 17), rooms: [7, 10] },
  freighter: { length: 78, half: (t) => (t < 0.14 ? 8 : t < 0.84 ? 7 : 4), rooms: [10, 14] },
};

// A wreck lies along the screen with its bow to the right: a corridor along its spine, rooms on both sides,
// the engines astern and the bridge in the bow. The airlock is in the lower flank, where the frigate docks.
function wreckPlan(state, hull) {
  const spec = WRECKS[hull] || WRECKS.hull;
  const L = spec.length;
  const halves = [];
  for (let x = 0; x < L; x++) halves.push(Math.max(3, Math.round(spec.half(x / (L - 1)))));
  const top = Math.max(...halves);
  const cy = top + 2;
  const grid = makeGrid(L + 2, cy * 2 + 1);
  // x counts along the hull. One column of space is left before the stern.
  const hullAt = (x, y) => x >= 0 && x < L && Math.abs(y - cy) <= halves[x];
  const roomy = (x, y) => hullAt(x, y) && AROUND.every(([dx, dy]) => hullAt(x + dx, y + dy));
  const get = (x, y) => grid.get(x + 1, y);
  const set = (x, y, c) => grid.set(x + 1, y, c);
  for (let y = 0; y < grid.h; y++) for (let x = 0; x < L; x++) if (hullAt(x, y)) set(x, y, '#');
  // The spine, three tiles wide.
  for (let x = 2; x < L - 2; x++) for (let y = cy - 1; y <= cy + 1; y++) if (roomy(x, y)) set(x, y, ',');

  // Rooms in segments along the spine. The first is the engine room and the last the bridge.
  const rooms = [];
  for (let x = 2; x < L - 3; ) {
    let w = pickInt(state, spec.rooms[0], spec.rooms[1]);
    if (L - 3 - (x + w) < 5) w = L - 3 - x;
    const ends = x === 2 || x + w >= L - 3;
    for (const side of [-1, 1]) {
      const tiles = [];
      for (let i = x; i < x + w; i++) {
        for (let j = side < 0 ? 1 : cy + 3; j <= (side < 0 ? cy - 3 : grid.h - 2); j++)
          if (roomy(i, j)) tiles.push([i, j]);
      }
      if (tiles.length >= 10) rooms.push({ tiles, side, x0: x, w, ends, torn: false, door: null, at: x });
    }
    x += w + 1;
  }
  // The airlock is in the lower flank near the middle. That room is always whole.
  const lower = rooms.filter((r) => r.side > 0 && !r.ends);
  const bay = (lower.length ? lower : rooms.filter((r) => r.side > 0)).reduce((a, b) =>
    Math.abs(a.x0 + a.w / 2 - L * 0.45) <= Math.abs(b.x0 + b.w / 2 - L * 0.45) ? a : b,
  );
  // Now and then a room is torn open to space, and there is no way through it. One whole room is always left
  // for the vault.
  const spare = rooms.filter((r) => !r.ends && r !== bay);
  for (const r of spare) r.torn = rand(state) < 0.18;
  if (spare.length && spare.every((r) => r.torn)) pickOf(state, spare).torn = false;

  const wallRow = (r) => (r.side < 0 ? cy - 2 : cy + 2);
  for (const r of rooms) {
    for (const [i, j] of r.tiles) set(i, j, r.torn ? 'X' : '.');
    if (r.torn) continue;
    if (r.ends) {
      // The bridge and the engine room open straight onto the spine.
      for (let i = r.x0; i < r.x0 + r.w; i++) if (roomy(i, wallRow(r))) set(i, wallRow(r), '.');
      continue;
    }
    // A door two tiles wide onto the spine, where there is floor on both sides of the wall.
    const inner = wallRow(r) + r.side;
    const fits = [];
    for (let i = r.x0; i < r.x0 + r.w - 1; i++) {
      if ([i, i + 1].every((k) => get(k, inner) === '.' && get(k, wallRow(r) - r.side) === ',')) fits.push(i);
    }
    const at = fits.length ? pickOf(state, fits) : r.x0;
    for (const i of [at, at + 1]) {
      set(i, wallRow(r), '.');
      // Where the hull narrows there may be wall just inside the door. Then that is opened up too.
      if (get(i, inner) === '#' && roomy(i, inner)) set(i, inner, '.');
    }
    r.at = at;
    r.door = { x: px(at + 2), y: px(wallRow(r)) + TILE / 2 };
  }
  // Doors between neighbours make loops, so that there is more than one way round.
  for (let k = 0; k + 2 < rooms.length; k++) {
    const a = rooms[k];
    const b = rooms[k + 2];
    if (a.side !== b.side || a.torn || b.torn || rand(state) >= 0.45) continue;
    const wall = b.x0 - 1;
    const rows = [];
    for (let j = 1; j < grid.h - 1; j++) if (get(wall - 1, j) === '.' && get(wall + 1, j) === '.') rows.push(j);
    if (!rows.length) continue;
    const j = pickOf(state, rows);
    set(wall, j, '.');
    if (rows.includes(j + 1)) set(wall, j + 1, '.');
  }
  // The airlock: two tiles in the hull below the bay.
  const columns = [...new Set(bay.tiles.map((t) => t[0]))].sort((a, b) => a - b);
  const ax = columns[Math.floor(columns.length / 2) - 1];
  const ay = Math.max(...bay.tiles.filter((t) => t[0] === ax || t[0] === ax + 1).map((t) => t[1])) + 1;
  // Whatever hull is left below the airlock is cut away, so that the tunnel from the frigate reaches it.
  for (const i of [ax, ax + 1]) {
    for (let j = ay; j < grid.h; j++) set(i, j, j === ay ? 'A' : ' ');
  }
  const airlock = { x: px(ax + 2), y: px(ay) + TILE / 2, nx: 0, ny: -1 };

  // The vault is the room furthest from the airlock. Its door is locked.
  const steps = stepsFrom(grid, ax + 1, ay);
  const far = (r) => steps.get(r.tiles[0][1] * grid.w + r.tiles[0][0] + 1) || 0;
  const usable = rooms.filter((r) => !r.torn && !r.ends && r !== bay && far(r) > 0);
  const vaultRoom = usable.reduce((a, b) => (far(b) > far(a) ? b : a), usable[0]);
  for (const i of [vaultRoom.at, vaultRoom.at + 1]) set(i, wallRow(vaultRoom), 'L');
  // Doors that other rooms have into the vault would be a way round the lock, so they are walled up again.
  for (const [i, j] of vaultRoom.tiles) {
    for (const dx of [-1, 1])
      if (get(i + dx, j) === '.' && !vaultRoom.tiles.some((t) => t[0] === i + dx && t[1] === j)) set(i + dx, j, '#');
  }
  const whole = rooms.filter((r) => !r.torn);
  const bow = L - 5;
  const stern = 4;
  return {
    w: grid.w,
    h: grid.h,
    tiles: grid.cells,
    rooms: whole.map((r) => ({ ...boxShift(boxOf(r.tiles)), door: r.door, mid: midOf(r.tiles, 1) })),
    vault: whole.indexOf(vaultRoom),
    halls: [{ c0: 2, c1: L - 1, r0: cy - 2, r1: cy + 2 }],
    airlocks: [airlock],
    far: { x: px((ax < L / 2 ? bow : stern) + 1) + TILE / 2, y: px(cy) + TILE / 2 },
  };
}
// The wreck is drawn one column in from the edge of its grid.
const boxShift = (box) => ({ ...box, c0: box.c0 + 1, c1: box.c1 + 1 });

// ---------------------------------------------------------------- stations
const SIZE = 73;
const MID = 36;
// How far a tile is from the middle of the station, measured so that the station comes out eight-sided.
const reach = (x, y) => Math.max(Math.abs(x - MID), Math.abs(y - MID), (Math.abs(x - MID) + Math.abs(y - MID)) * 0.72);
// The four docking arms, in the order of the ports of a station in kinds.js: up, down, left, right.
const ARMS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

// A station is a ring round a hub, with four docking arms. The crew comes in through the arm they docked at.
// Rooms lie between the ring and the hub. The hub is the vault, behind a locked door at the end of one spoke.
function stationPlan(state) {
  const grid = makeGrid(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = reach(x, y);
      if (d <= 27) grid.set(x, y, '#');
      if (d >= 21 && d <= 23) grid.set(x, y, ',');
      if (d <= 7) grid.set(x, y, '.');
    }
  }
  // The docking arms: a corridor out from the ring to an airlock at the tip.
  const airlocks = ARMS.map(([dx, dy]) => {
    // The airlock is the last tile of the arm, with nothing outside it, so that the tunnel from the frigate
    // reaches it.
    for (let k = 24; k <= 35; k++) {
      for (let side = -2; side <= 2; side++) {
        grid.set(MID + dx * k + dy * side, MID + dy * k + dx * side, Math.abs(side) === 2 ? '#' : k === 35 ? 'A' : ',');
      }
    }
    return { x: px(MID + dx * 35) + TILE / 2, y: px(MID + dy * 35) + TILE / 2, nx: -dx, ny: -dy };
  });
  // One spoke leads from the ring in to the hub. Which one it is differs from station to station.
  const [sx, sy] = pickOf(state, ARMS);
  for (let k = 8; k <= 20; k++) {
    for (let side = -1; side <= 1; side++)
      grid.set(MID + sx * k + sy * side, MID + sy * k + sx * side, k === 8 ? 'L' : ',');
  }
  const hubDoor = { x: px(MID + sx * 8) + TILE / 2, y: px(MID + sy * 8) + TILE / 2 };

  // The four blocks between the ring and the hub are cut into rooms, differently each time. Each block is
  // split once or twice into boxes, in its own measure: u and v count tiles out from the two spokes beside it.
  const cut = (box, axis, at) => {
    const [u0, v0, u1, v1] = box;
    return axis === 'u'
      ? [
          [u0, v0, at, v1],
          [at, v0, u1, v1],
        ]
      : [
          [u0, v0, u1, at],
          [u0, at, u1, v1],
        ];
  };
  const rooms = [];
  const owner = new Map();
  for (const qx of [-1, 1]) {
    for (const qy of [-1, 1]) {
      const axis = rand(state) < 0.5 ? 'u' : 'v';
      let boxes = cut([3, 3, 20, 20], axis, pickInt(state, 9, 13));
      boxes = boxes.flatMap((box) =>
        rand(state) < 0.6 ? cut(box, axis === 'u' ? 'v' : 'u', pickInt(state, 9, 13)) : [box],
      );
      for (const [u0, v0, u1, v1] of boxes) {
        const tiles = [];
        for (let u = u0 + 1; u < u1; u++) {
          for (let v = v0 + 1; v < v1; v++) {
            const d = reach(MID + u, MID + v);
            if (d >= 9 && d <= 19) tiles.push([MID + qx * u, MID + qy * v]);
          }
        }
        if (tiles.length < 12) continue;
        const room = { tiles, open: false, door: null };
        rooms.push(room);
        for (const [x, y] of tiles) owner.set(y * SIZE + x, room);
      }
    }
  }
  // Cut a door from a room straight through its wall to a tile that `wanted` says yes to, at most `far` away.
  // The door is two tiles wide where there is room for that.
  const doorFrom = (room, far, wanted) => {
    const fits = [];
    for (const [x, y] of room.tiles) {
      for (const [dx, dy] of AROUND) {
        const walls = [];
        for (let k = 1; k <= far; k++) {
          const p = [x + dx * k, y + dy * k];
          if (grid.get(p[0], p[1]) === '#' && !owner.has(p[1] * SIZE + p[0])) {
            walls.push(p);
            continue;
          }
          if (walls.length && wanted(p[0], p[1])) fits.push({ walls, dx, dy });
          break;
        }
      }
    }
    if (!fits.length) return null;
    const { walls, dx, dy } = pickOf(state, fits);
    for (const [x, y] of walls) grid.set(x, y, '.');
    // The same again one tile to the side, if that is wall all the way too.
    const beside = walls.map(([x, y]) => [x + dy, y + dx]);
    const before = [beside[0][0] - dx, beside[0][1] - dy];
    const after = [beside[beside.length - 1][0] + dx, beside[beside.length - 1][1] + dy];
    const clear = beside.every(([x, y]) => grid.get(x, y) === '#' && !owner.has(y * SIZE + x));
    if (clear && owner.get(before[1] * SIZE + before[0]) === room && wanted(after[0], after[1])) {
      for (const [x, y] of beside) grid.set(x, y, '.');
    }
    const [mx, my] = walls[Math.floor(walls.length / 2)];
    return { x: px(mx) + TILE / 2, y: px(my) + TILE / 2 };
  };
  // Rooms open onto the ring. A room that cannot reach the ring opens into a neighbour that can.
  const carve = (room, c) => room.tiles.forEach(([x, y]) => grid.set(x, y, c));
  for (const room of rooms) {
    carve(room, '.');
    room.door = doorFrom(room, 5, (x, y) => grid.get(x, y) === ',' && reach(x, y) >= 21);
    room.open = !!room.door;
    if (!room.open) carve(room, '#');
  }
  for (let again = true; again; ) {
    again = false;
    for (const room of rooms) {
      if (room.open) continue;
      carve(room, '.');
      room.door = doorFrom(room, 2, (x, y) => {
        const other = owner.get(y * SIZE + x);
        return !!other && other !== room && other.open;
      });
      room.open = !!room.door;
      if (room.open) again = true;
      else carve(room, '#');
    }
  }
  const whole = rooms.filter((r) => r.open);
  const hub = {
    c0: MID - 8,
    c1: MID + 8,
    r0: MID - 8,
    r1: MID + 8,
    door: hubDoor,
    mid: { x: px(MID) + TILE / 2, y: px(MID) + TILE / 2 },
  };
  return {
    w: SIZE,
    h: SIZE,
    tiles: grid.cells,
    rooms: [...whole.map((r) => ({ ...boxOf(r.tiles), door: r.door, mid: midOf(r.tiles) })), hub],
    vault: whole.length,
    // The ring is cut into the four straight runs it has, for whatever is to stand in a corridor.
    halls: ARMS.map(([dx, dy]) =>
      dx === 0
        ? { c0: MID - 9, c1: MID + 9, r0: MID + dy * 22 - 2, r1: MID + dy * 22 + 2 }
        : { c0: MID + dx * 22 - 2, c1: MID + dx * 22 + 2, r0: MID - 9, r1: MID + 9 },
    ),
    airlocks,
    far: { x: px(MID + sx * 12) + TILE / 2, y: px(MID + sy * 12) + TILE / 2 },
  };
}

// `place` is the wreck or the station that is boarded.
export function layOut(state, place) {
  return place.kind === 'station' ? stationPlan(state) : wreckPlan(state, place.hull);
}

// Whether every airlock of a plan has an open way to the vault, counting its locked door as open.
// A plan that fails this would be a place the crew could get stuck in. The tests go through many plans with it.
export function planHolds(plan) {
  const grid = {
    w: plan.w,
    h: plan.h,
    get: (x, y) => (x >= 0 && y >= 0 && x < plan.w && y < plan.h ? plan.tiles[y * plan.w + x] : ' '),
  };
  const vault = plan.rooms[plan.vault];
  if (!vault || !vault.door) return false;
  const inVault = [Math.floor(vault.mid.x / TILE), Math.floor(vault.mid.y / TILE)];
  return plan.airlocks.every((a) => {
    const steps = stepsFrom(grid, Math.floor(a.x / TILE), Math.floor(a.y / TILE));
    return steps.has(inVault[1] * plan.w + inVault[0]);
  });
}
