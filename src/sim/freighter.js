// The inside of a freighter (F-254, R-1183 to R-1186). It is made new each time and follows the shape of the
// ship: the engines astern, four columns of containers on both sides of a spine, and the bridge in the bow.
// There are three ways along the ship: the spine, the holds, and the service corridors along the hull, with
// cross corridors between them, so that nothing but a room is a dead end. One hold is always two containers
// long, for a fight in the open. A wreck is the same ship with one or two containers torn away.
//
// The ship lies along the screen with its bow to the right, one column in from the edge of its grid:
//   columns  1 the stern · 2-6 the engines · 8-12 two rooms astern · 14-16 the first cross corridor ·
//            17-73 the four columns of containers with a cross corridor between each · 74-76 the last cross
//            corridor · 78-86 four rooms in the bow · 88-93 the bridge
//   rows     1 and 31 the hull · 2-3 and 29-30 the service corridors · 5-13 and 19-27 the containers ·
//            15-17 the spine
import { rand } from './util.js';
import { TILE, AROUND, pickInt, pickOf, px, makeGrid, midOf, boxOf } from './grid.js';

const W = 96;
const H = 33;
const CY = 16;
const LENGTH = 94;
// Half the width of the hull at each column: cut at the corners astern, and narrowing to the bow.
const half = (x) => (x <= 1 ? 13 : x === 2 ? 14 : x <= 76 ? 15 : 15 - Math.round(((x - 76) * 8) / 18));
// Where each column of containers begins, with a wall on each side of ten tiles of floor, and where the five
// cross corridors begin.
const COLUMNS = [17, 32, 47, 62];
const CROSSES = [14, 29, 44, 59, 74];
// The rows of the two sides, from the hull inwards: the service corridor, the wall inside it, the containers
// and the wall to the spine.
const SIDES = {
  upper: { service: [2, 3], outer: 4, rows: [5, 13], inner: 14, hull: 1 },
  lower: { service: [29, 30], outer: 28, rows: [19, 27], inner: 18, hull: 31 },
};
// What the rooms in the containers are, in turn.
const QUARTERS = ['CREW', 'MESS', 'GALLEY', 'SICKBAY', 'WORKSHOP', 'STORES'];

export function freighterPlan(state) {
  const grid = makeGrid(W, H);
  const inHull = (x, y) => x >= 1 && x <= LENGTH && Math.abs(y - CY) <= half(x);
  // Not in the outermost layer of the hull, so that there is always a wall round the floor.
  const roomy = (x, y) => inHull(x, y) && AROUND.every(([dx, dy]) => inHull(x + dx, y + dy));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inHull(x, y)) grid.set(x, y, '#');
  const fill = (x0, y0, x1, y1, c) => {
    const tiles = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (roomy(x, y)) {
          grid.set(x, y, c);
          tiles.push([x, y]);
        }
    return tiles;
  };
  const rooms = [];
  const addRoom = (tiles, use, door) => {
    const room = { tiles, use, door };
    rooms.push(room);
    return room;
  };
  // A door two tiles wide through a wall that runs along the ship, and one two tiles high through a wall across it.
  // A doorway has the floor of a corridor, so that nothing is ever put down in front of it (see furnish.js).
  const doorAlong = (x, row, c = ',') => {
    grid.set(x, row, c);
    grid.set(x + 1, row, c);
    return { x: px(x + 1), y: px(row) + TILE / 2 };
  };
  const doorAcross = (x, row, c = ',') => {
    grid.set(x, row, c);
    grid.set(x, row + 1, c);
    return { x: px(x) + TILE / 2, y: px(row + 1) };
  };

  // ---- the skeleton: the spine, the cross corridors and the service corridors
  fill(8, CY - 1, 86, CY + 1, ',');
  for (const x of CROSSES) fill(x, 2, x + 2, 30, ',');
  for (const side of Object.values(SIDES)) fill(CROSSES[0], side.service[0], CROSSES[4] + 2, side.service[1], ',');

  // ---- the large hold: on one side the cross corridor between two columns is left out
  const bigSide = rand(state) < 0.5 ? 'upper' : 'lower';
  const bigAt = pickInt(state, 0, 2);
  const gone = CROSSES[bigAt + 1];
  {
    const side = SIDES[bigSide];
    for (let x = gone; x <= gone + 2; x++) {
      grid.set(x, side.outer, '#');
      grid.set(x, side.inner, '#');
      for (let y = side.rows[0]; y <= side.rows[1]; y++) grid.set(x, y, '#');
    }
  }
  // The cross corridors that each side still has, and the stretches of service corridor between them.
  const crossesOf = (name) => CROSSES.filter((x) => !(name === bigSide && x === gone));
  // On the side away from the airlock a stretch of the service corridor is missing now and then. Never one at an
  // end, so that every cross corridor still leads somewhere.
  const upper = crossesOf('upper');
  let closed = null;
  if (rand(state) < 0.35 && upper.length > 3) {
    const k = pickInt(state, 1, upper.length - 3);
    closed = [upper[k] + 3, upper[k + 1] - 1];
    for (let x = closed[0]; x <= closed[1]; x++) for (const y of SIDES.upper.service) grid.set(x, y, '#');
  }
  const hasService = (name, x0, x1) => name === 'lower' || !closed || x1 < closed[0] || x0 > closed[1];

  // ---- the containers: a hold, or two rooms
  const containers = [];
  for (const name of ['upper', 'lower']) {
    for (let k = 0; k < COLUMNS.length; k++) {
      const big = name === bigSide && (k === bigAt || k === bigAt + 1);
      if (big && k === bigAt + 1) continue;
      containers.push({ name, k, big, x0: COLUMNS[k] + 1, x1: COLUMNS[big ? k + 1 : k] + 10 });
    }
  }
  // A wreck has lost one or two of them, never the large hold.
  const small = containers.filter((c) => !c.big);
  const torn = [pickOf(state, small)];
  if (rand(state) < 0.5) {
    const other = pickOf(state, small);
    if (other !== torn[0]) torn.push(other);
  }
  let quarters = 0;
  for (const c of containers) {
    const side = SIDES[c.name];
    const [r0, r1] = side.rows;
    const service = hasService(c.name, c.x0, c.x1);
    if (torn.includes(c)) {
      // Torn away: space is seen through the hole, also from the service corridor outside it.
      fill(c.x0, r0, c.x1, r1, 'X');
      for (let x = c.x0; x <= c.x1; x++) {
        grid.set(x, side.outer, 'X');
        if (!service) for (const y of [...side.service, side.hull]) grid.set(x, y, 'X');
      }
      continue;
    }
    const holds = c.big || rand(state) < 0.45;
    if (holds) {
      const room = addRoom(fill(c.x0, r0, c.x1, r1, '.'), c.big ? 'HOLD' : 'CARGO', null);
      // Doors onto the spine, onto the cross corridors at its ends, and now and then onto the service corridor.
      room.door = doorAlong(pickInt(state, c.x0 + 1, c.x0 + 7), side.inner);
      if (c.big) doorAlong(pickInt(state, c.x1 - 8, c.x1 - 2), side.inner);
      doorAcross(c.x0 - 1, pickInt(state, r0 + 1, r1 - 2));
      doorAcross(c.x1 + 1, pickInt(state, r0 + 1, r1 - 2));
      if (service && rand(state) < (c.big ? 0.6 : 0.5)) doorAlong(pickInt(state, c.x0 + 2, c.x1 - 3), side.outer);
      continue;
    }
    // Two rooms with a wall between them, each with a door onto the spine.
    const wall = c.x0 + 5;
    for (const [x0, x1, cross] of [
      [c.x0, wall - 1, c.x0 - 1],
      [wall + 1, c.x1, c.x1 + 1],
    ]) {
      const room = addRoom(fill(x0, r0, x1, r1, '.'), QUARTERS[quarters++ % QUARTERS.length], null);
      room.door = doorAlong(pickInt(state, x0, x1 - 1), side.inner);
      if (rand(state) < 0.4) doorAcross(cross, pickInt(state, r0 + 1, r1 - 2));
    }
  }

  // ---- the stern: the engines furthest aft, and a room on each side of the spine
  addRoom(fill(2, 2, 6, 30, '.'), 'ENGINES', doorAcross(7, CY - 1));
  /** @type {[number, number, number, string][]} */
  const AFT = [
    [2, 13, 14, 'FUEL'],
    [19, 30, 18, 'SPARES'],
  ];
  for (const [r0, r1, wall, use] of AFT) {
    const room = addRoom(fill(8, r0, 12, r1, '.'), use, null);
    room.door = doorAlong(pickInt(state, 9, 10), wall);
    if (rand(state) < 0.5) doorAcross(13, pickInt(state, r0 + 3, r1 - 4));
  }

  // ---- the bow: four rooms, one of them the vault, and the bridge
  addRoom(fill(88, 2, 93, 30, '.'), 'BRIDGE', doorAcross(87, CY - 1));
  const bowUses = ['CAPTAIN', 'RADIO', 'STORES'];
  const vaultAt = pickInt(state, 0, 3);
  let vault = null;
  let n = 0;
  for (const [r0, r1, wall] of [
    [2, 13, 14],
    [19, 30, 18],
  ]) {
    for (const x0 of [78, 83]) {
      const isVault = n++ === vaultAt;
      const room = addRoom(fill(x0, r0, x0 + 3, r1, '.'), isVault ? 'VAULT' : bowUses.shift(), null);
      room.door = doorAlong(x0 + 1, wall, isVault ? 'L' : ',');
      if (isVault) vault = room;
      else if (x0 === 78 && rand(state) < 0.4)
        doorAcross(77, wall === 14 ? pickInt(state, 5, 10) : pickInt(state, 21, 26));
    }
  }

  // ---- the airlock: in the lower flank, at the end of the cross corridor nearest the middle
  const lower = crossesOf('lower').filter((x) => x !== CROSSES[0] && x !== CROSSES[4]);
  const ax = lower.includes(CROSSES[2]) ? CROSSES[2] : pickOf(state, lower);
  grid.set(ax, SIDES.lower.hull, 'A');
  grid.set(ax + 1, SIDES.lower.hull, 'A');
  const airlock = { x: px(ax + 1), y: px(SIDES.lower.hull) + TILE / 2, nx: 0, ny: -1 };

  const box = (x0, y0, x1, y1) => ({ c0: x0 - 1, c1: x1 + 1, r0: y0 - 1, r1: y1 + 1 });
  const halls = [
    box(8, CY - 1, 86, CY + 1),
    box(CROSSES[0], SIDES.lower.service[0], CROSSES[4] + 2, SIDES.lower.service[1]),
    ...crossesOf('upper')
      .filter((x) => crossesOf('lower').includes(x))
      .map((x) => box(x, 5, x + 2, 27)),
  ];
  return {
    w: W,
    h: H,
    tiles: grid.cells,
    rooms: rooms.map((r) => ({ ...boxOf(r.tiles), door: r.door, mid: midOf(r.tiles), use: r.use })),
    vault: rooms.indexOf(vault),
    halls,
    airlocks: [airlock],
    // The first turret stands in the spine, at the end that is furthest from the way in.
    far: { x: px(ax < 47 ? 82 : 11) + TILE / 2, y: px(CY) + TILE / 2 },
  };
}
