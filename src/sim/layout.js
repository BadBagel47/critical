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
import { TILE, AROUND, pickInt, pickOf, px, makeGrid, stepsFrom, midOf, boxOf } from './grid.js';
import { freighterPlan } from './freighter.js';
import { basePlan } from './base.js';

export { TILE };

// ---------------------------------------------------------------- wrecks
// Each hull: how long it is in tiles, half its width from the stern (0) to the bow (1), and how wide its rooms are.
const WRECKS = {
  gunboat: { length: 36, half: (t) => (t < 0.55 ? 8 : 8 - (t - 0.55) * 11), rooms: [6, 8] },
  hull: { length: 52, half: (t) => (t < 0.6 ? 7 + 3 * Math.min(1, t * 4) : 10 - (t - 0.6) * 17), rooms: [7, 10] },
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

// `place` is the wreck or the station that is boarded.
export function layOut(state, place) {
  if (place.kind === 'station') return basePlan(state, place);
  // A freighter has a plan of its own, see freighter.js.
  return place.hull === 'freighter' ? freighterPlan(state) : wreckPlan(state, place.hull);
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
    const steps = stepsFrom(grid, Math.floor(a.x / TILE), Math.floor(a.y / TILE), plan.jumps);
    return steps.has(inVault[1] * plan.w + inVault[0]);
  });
}
