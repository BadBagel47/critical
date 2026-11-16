// The floor plan of the standard base (D-217, docs/proposal-bases.md): three round floors, one above the other.
//   the basement  dirty industry: a large hold and a cargo bay at each cargo arm, the reactor, the drone hangar,
//                 the switchgear that has to be put out before the base can be taken, and the vault
//   the middle    where one comes in, through the airlock: an open concourse with what is done lawfully round
//                 it, and the staff's core in the middle with the ways up and down
//   the top       cold command: the mainframe in the command room in the middle, and the comms room
// Between two floors there are always three ways: the lift through the security checkpoint, which is heard,
// the stairs off a service corridor, which are quiet, and a ladder behind an alarmed door.
//
// All three floors lie side by side in one grid, so that everything else in the game can go on treating a
// place as one floor. Each floor is drawn in a square of its own (`decks`), and the ways between them are
// `links`: the same tiles on both floors they join, and `jumps` from each of those tiles to its twin.
//
// The outer wall of a floor is round (R-1165). The tiles do not know that: the floor reaches out to every tile
// that the circle touches, and floor.js stops whoever walks, looks or shoots at the circle itself.
//
// A floor is first drawn up as who owns each tile: a corridor, a room, or nobody. Walls are then put where two
// owners meet, always taken from a room and never from a corridor, and the ways between floors are set down
// on top of that. Last come the doors, and whatever floor cannot be reached is filled in again.
import { rand, dist } from './util.js';
import { TILE, AROUND, pickInt, pickOf, px, makeGrid, stepsFrom } from './grid.js';

// The side of the square each floor is drawn in, in tiles, the space between two squares, and the middle.
export const DECK = 80;
const GAP = 16;
const MID = 40;
// How far each floor reaches from the middle, in tiles: the basement, the middle and the top.
export const RADIUS = [35.6, 29, 16];
export const DECK_NAMES = ['BASEMENT', 'MIDDLE', 'TOP'];
const NOBODY = 0;

// The ways between floors: where their floor is, on both floors they join, and which side their door is on.
//   lift    loud: whoever is near hears it come
//   stairs  quiet, off a service corridor
//   ladder  behind a door with an alarm on it
const LINKS = [
  { name: 'LIFT', kind: 'lift', decks: [0, 1], box: [38, 47, 41, 49], door: ['n', 'n'] },
  { name: 'STAIRS', kind: 'stairs', decks: [0, 1], box: [29, 31, 31, 35], door: ['e', 'e'] },
  { name: 'LADDER', kind: 'ladder', decks: [0, 1], box: [48, 44, 49, 45], door: ['w', 'w'] },
  { name: 'LIFT', kind: 'lift', decks: [1, 2], box: [38, 30, 41, 32], door: ['s', 's'] },
  { name: 'STAIRS', kind: 'stairs', decks: [1, 2], box: [29, 42, 31, 46], door: ['e', 'e'] },
  { name: 'LADDER', kind: 'ladder', decks: [1, 2], box: [48, 36, 49, 37], door: ['w', 'w'] },
];
const SIDE = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
// What the rooms that fill out each floor are, in turn: the ones a floor must have first.
const BASEMENT_ROOMS = ['WORKSHOP', 'BARRACKS', 'REFINERY', 'PUMPS', 'STORES', 'FUEL'];
const PUBLIC_ROOMS = ['SERVICES', 'ARMORY', 'BAR', 'MARKET', 'CLINIC', 'HOTEL'];
const BACK_ROOMS = ['KITCHEN', 'LAUNDRY', 'STORES', 'PANTRY', 'LOCKERS', 'ARCHIVE', 'QUARTERS'];
const TOP_ROOMS = [
  'COMMS',
  'SERVERS',
  'SECURITY',
  'ARMS',
  'SENSORS',
  'OFFICE',
  'COOLING',
  'ARCHIVE',
  'QUARTERS',
  'STORES',
];

// Whether any part of a tile is inside a floor that reaches r tiles from the middle.
const within = (x, y, r) =>
  Math.hypot(Math.max(x, Math.min(MID, x + 1)) - MID, Math.max(y, Math.min(MID, y + 1)) - MID) < r;

// One floor while it is being made. `owner` says whose each tile is: 0 nobody's, otherwise the number of a
// space in `spaces`, which is a corridor or a room.
function newFloor(state, deck) {
  const r = RADIUS[deck];
  const owner = new Array(DECK * DECK).fill(-1);
  for (let y = 0; y < DECK; y++) for (let x = 0; x < DECK; x++) if (within(x, y, r)) owner[y * DECK + x] = NOBODY;
  const spaces = [null];
  const f = {
    deck,
    r,
    owner,
    spaces,
    grid: makeGrid(DECK, DECK),
    doors: [],
    at: (x, y) => (x < 0 || y < 0 || x >= DECK || y >= DECK ? -1 : owner[y * DECK + x]),
    // A new corridor or room. `staff` is whether visitors are kept out of it.
    space(use, o = {}) {
      spaces.push({ id: spaces.length, use, corridor: !!o.corridor, staff: !!o.staff, fixed: !!o.fixed, deck });
      return spaces.length - 1;
    },
    // Give the tiles of a box that nobody has yet to a space. Says how many it got.
    claim(id, [x0, y0, x1, y1]) {
      let n = 0;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (f.at(x, y) === NOBODY) {
            owner[y * DECK + x] = id;
            n++;
          }
      return n;
    },
    // A room cut out of a box, or nothing when too little of the box is left for one.
    cut(box, least, o = {}) {
      const id = f.space('ROOM', o);
      if (f.claim(id, box) >= least) return id;
      for (let i = 0; i < owner.length; i++) if (owner[i] === id) owner[i] = NOBODY;
      spaces[id] = null;
      return 0;
    },
    room(use, box, o = {}) {
      const id = f.space(use, o);
      f.claim(id, box);
      return id;
    },
    corridor(use, boxes, staff = deck !== 1) {
      const id = f.space(use, { corridor: true, staff });
      for (const box of boxes) f.claim(id, box);
      return id;
    },
  };
  // Cut a box into rooms, differently each time: in two again and again until the pieces are small enough.
  // `uses` says what each room is, given how many there are so far.
  f.split = (box, lo, hi, make) => {
    const [x0, y0, x1, y1] = box;
    const w = x1 - x0 + 1,
      h = y1 - y0 + 1;
    const wide = w >= h;
    const long = wide ? w : h;
    if (long > hi || (long >= lo * 2 && rand(state) < 0.5)) {
      const cut = pickInt(state, lo, long - lo);
      if (wide) {
        f.split([x0, y0, x0 + cut - 1, y1], lo, hi, make);
        f.split([x0 + cut, y0, x1, y1], lo, hi, make);
      } else {
        f.split([x0, y0, x1, y0 + cut - 1], lo, hi, make);
        f.split([x0, y0 + cut, x1, y1], lo, hi, make);
      }
      return;
    }
    make(box);
  };
  return f;
}

// Put the walls where two owners meet, and write the floor out as tiles.
function raiseWalls(f) {
  const { grid, spaces } = f;
  const AROUND8 = [...AROUND, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      const id = f.at(x, y);
      if (id < 0) {
        // Just outside the round wall there is a tile of wall, for the light to stop at.
        if (AROUND8.some(([dx, dy]) => f.at(x + dx, y + dy) >= 0)) grid.set(x, y, '#');
        continue;
      }
      if (id === NOBODY) {
        grid.set(x, y, '#');
        continue;
      }
      const me = spaces[id];
      if (me.corridor) {
        grid.set(x, y, ',');
        continue;
      }
      // A room gives up its tile to a wall next to a corridor, and to the room on its right or below it.
      const other = (dx, dy) => {
        const o = f.at(x + dx, y + dy);
        return o > 0 && o !== id ? spaces[o] : null;
      };
      const byCorridor = AROUND8.some(([dx, dy]) => {
        const o = other(dx, dy);
        return o && o.corridor;
      });
      const byRoom = [
        [1, 0],
        [0, 1],
        [1, 1],
      ].some(([dx, dy]) => other(dx, dy));
      grid.set(x, y, byCorridor || byRoom ? '#' : '.');
    }
}

// Set down a way between floors: its floor, the wall round it and its door. Whatever was there is gone.
function setLink(f, link, k) {
  const [x0, y0, x1, y1] = link.box;
  const id = f.space(link.name, { staff: true, fixed: true });
  for (let y = y0 - 1; y <= y1 + 1; y++)
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (f.at(x, y) < 0) continue;
      const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      f.owner[y * DECK + x] = inside ? id : NOBODY;
      f.grid.set(x, y, inside ? '.' : '#');
    }
  // The door, two tiles wide, in the middle of the side it is on.
  const [dx, dy] = SIDE[link.door[k]];
  const tiles = [];
  if (dx) {
    const y = Math.floor((y0 + y1) / 2);
    tiles.push([dx > 0 ? x1 + 1 : x0 - 1, y], [dx > 0 ? x1 + 1 : x0 - 1, y + 1]);
  } else {
    const x = Math.floor((x0 + x1) / 2);
    tiles.push([x, dy > 0 ? y1 + 1 : y0 - 1], [x + 1, dy > 0 ? y1 + 1 : y0 - 1]);
  }
  // What lies outside the door has to be floor. A wall there is opened up.
  for (const [x, y] of tiles)
    if (f.grid.get(x + dx, y + dy) === '#' && f.at(x + dx, y + dy) >= 0) f.grid.set(x + dx, y + dy, ',');
  f.doors.push(doorOf(f, tiles, link.kind === 'ladder' ? 'alarm' : 'slide', id));
  return id;
}

// A door through the tiles given, of a kind:
//   slide    opens for whoever comes up to it        staff   the same, with a sign that keeps visitors out
//   alarm    gives the crew away, see boarding.js    lock    an inner door of an airlock, worked with a button
//   command  shut until the power is out             vault   the locked door of the vault
const SEALED = { lock: 'D', command: 'D', vault: 'L' };
function doorOf(f, tiles, kind, room) {
  for (const [x, y] of tiles) f.grid.set(x, y, SEALED[kind] || ',');
  const x = tiles.reduce((sum, t) => sum + t[0] + 0.5, 0) / tiles.length;
  const y = tiles.reduce((sum, t) => sum + t[1] + 0.5, 0) / tiles.length;
  return { x: px(x), y: px(y), tiles, kind, room };
}

// Every place on a floor where a door two tiles wide can be cut straight through a wall, between the floor of
// two spaces. Gives the two tiles of each, whose floor is on the near side (`a`) and whose on the far side.
function allDoorSpots(f) {
  const out = [];
  const floor = (x, y) => (f.grid.get(x, y) === '.' || f.grid.get(x, y) === ',' ? f.at(x, y) : 0);
  const wall = (x, y) => f.grid.get(x, y) === '#' && f.at(x, y) >= 0;
  for (let y = 1; y < DECK - 1; y++)
    for (let x = 1; x < DECK - 1; x++) {
      if (!wall(x, y)) continue;
      for (const [sx, sy] of [
        [1, 0],
        [0, 1],
      ]) {
        // The wall runs along (sx, sy), and the door goes through it across that.
        if (!wall(x + sx, y + sy)) continue;
        for (const way of [1, -1]) {
          const nx = sy * way,
            ny = sx * way;
          const a = floor(x - nx, y - ny);
          const b = floor(x + nx, y + ny);
          if (a <= 0 || b <= 0 || a === b) continue;
          if (floor(x + sx - nx, y + sy - ny) !== a || floor(x + sx + nx, y + sy + ny) !== b) continue;
          out.push({
            tiles: [
              [x, y],
              [x + sx, y + sy],
            ],
            a,
            other: b,
          });
        }
      }
    }
  return out;
}
const doorSpots = (f, a, to) => f.spots.filter((s) => s.a === a && to(f.spaces[s.other]));

// Join the rooms of a floor up with doors. A room opens onto a corridor where it can, and otherwise into a
// room that is already joined up. `only` are rooms with a single door: nothing else opens into them.
function cutDoors(state, f, only) {
  const { spaces } = f;
  f.spots = allDoorSpots(f);
  const joined = new Set(spaces.filter((s) => s && (s.corridor || s.joined)).map((s) => s.id));
  const kindFor = (a, b) =>
    a.use === 'VAULT' || b.use === 'VAULT' ? 'vault' : a.staff !== b.staff ? 'staff' : 'slide';
  const rooms = spaces.filter((s) => s && !s.corridor && !s.fixed && !s.joined);
  const open = (room, to, count = 1) => {
    const spots = doorSpots(f, room.id, to);
    let made = 0;
    const used = new Set();
    while (made < count && spots.length) {
      const spot = spots.splice(Math.floor(rand(state) * spots.length), 1)[0];
      if (used.has(spot.other)) continue;
      // A door that another door has just been cut next to is no longer there to cut.
      if (spot.tiles.some(([x, y]) => f.grid.get(x, y) !== '#')) continue;
      used.add(spot.other);
      f.doors.push(doorOf(f, spot.tiles, kindFor(room, spaces[spot.other]), room.id));
      made++;
    }
    return made;
  };
  for (let again = true; again; ) {
    again = false;
    for (const room of rooms) {
      if (joined.has(room.id)) continue;
      const single = only.includes(room.use);
      // A corridor first. A room with one door only never opens into another room that has only one.
      let made = open(room, (s) => s.corridor, single ? 1 : 2);
      if (!made) made = open(room, (s) => joined.has(s.id) && !only.includes(s.use) && !s.fixed);
      if (!made) continue;
      joined.add(room.id);
      room.joined = true;
      again = true;
      // Now and then one more door, into a neighbour, so that there is more than one way round.
      if (!single && rand(state) < 0.35) open(room, (s) => !s.corridor && !s.fixed && !only.includes(s.use));
    }
  }
}

// ---------------------------------------------------------------- the three floors
// The basement. Corridors in a ring with a cross in it, a bay at each of the four cargo arms, with the large
// hold at one of them, and rooms between the bays.
function basement(state) {
  const f = newFloor(state, 0);
  f.corridor('RING', [
    [18, 18, 61, 20],
    [18, 59, 61, 61],
    [18, 18, 20, 61],
    [59, 18, 61, 61],
  ]);
  f.corridor('CROSS', [
    [21, 39, 58, 41],
    [39, 21, 41, 38],
    [39, 42, 41, 45],
  ]);
  // The bays at the cargo arms: straight up, right, down and left. The large hold is the one below.
  f.room('CARGO', [32, 3, 47, 17], { staff: true });
  f.room('CARGO', [62, 32, 76, 47], { staff: true });
  f.room('HOLD', [22, 62, 57, 76], { staff: true });
  f.room('CARGO', [3, 32, 17, 47], { staff: true });
  // Four rooms for guns, out towards the corners, each with its door onto the ring (R-1163).
  const guns = [
    [13, 21, 17, 24, 17, 22],
    [62, 21, 66, 24, 62, 22],
    [62, 55, 66, 58, 62, 55],
    [13, 55, 17, 58, 17, 55],
  ].map(([x0, y0, x1, y1, dx, dy]) => [f.room('GUN', [x0, y0, x1, y1], { staff: true, fixed: true }), dx, dy]);
  // Inside the ring: the reactor, the drone hangar, and smaller rooms in the two other quarters.
  f.room('REACTOR', [42, 21, 58, 38], { staff: true });
  f.room('DRONES', [21, 42, 38, 58], { staff: true });
  const made = [];
  const any = (box) => {
    const id = f.cut(box, 20, { staff: true });
    if (id) made.push(id);
  };
  f.split([21, 21, 38, 38], 8, 12, any);
  f.split([42, 42, 58, 58], 8, 12, any);
  const inner = made.length;
  // Outside the ring, between the bays.
  for (const box of [
    [3, 3, 31, 17],
    [48, 3, 76, 17],
    [3, 62, 21, 76],
    [58, 62, 76, 76],
    [3, 18, 17, 31],
    [3, 48, 17, 61],
    [62, 18, 76, 31],
    [62, 48, 76, 61],
  ])
    f.split(box, 9, 15, any);
  raiseWalls(f);
  const links = [LINKS[0], LINKS[1], LINKS[2]].map((l) => setLink(f, l, 0));
  // The switchgear is far from the lift (docs/proposal-bases.md), and the vault is inside the ring.
  const mid = (id) => middleOf(f, id);
  const lift = { x: 39.5, y: 48 };
  const far = (id) => {
    const m = mid(id);
    return m ? dist(m.x, m.y, lift.x, lift.y) : -1;
  };
  const outer = made.slice(inner).sort((a, b) => far(b) - far(a));
  const breaker = outer[pickInt(state, 0, Math.min(2, outer.length - 1))];
  f.spaces[breaker].use = 'BREAKER';
  const vault = pickOf(state, made.slice(0, inner));
  f.spaces[vault].use = 'VAULT';
  let n = pickInt(state, 0, BASEMENT_ROOMS.length - 1);
  for (const id of made)
    if (f.spaces[id].use === 'ROOM') f.spaces[id].use = BASEMENT_ROOMS[n++ % BASEMENT_ROOMS.length];
  for (const [id, x, y] of guns)
    f.doors.push(
      doorOf(
        f,
        [
          [x, y],
          [x, y + 1],
        ],
        'slide',
        id,
      ),
    );
  cutDoors(state, f, ['VAULT', 'GUN']);
  return { f, links };
}

// The middle. The airlock sits on the diagonal, up and to the left, with the concourse inside it. Round the
// concourse lies what visitors come for, and in the middle the staff's core with the ways up and down.
function middle(state, yard) {
  const f = newFloor(state, 1);
  const lock = f.room('AIRLOCK', [19, 19, 23, 23], { fixed: true });
  const concourse = f.corridor('CONCOURSE', [
    [24, 19, 27, 23],
    [19, 24, 23, 27],
    [24, 24, 55, 27],
    [24, 52, 55, 55],
    [24, 24, 27, 55],
    [52, 24, 55, 55],
  ]);
  // The core: a service corridor, the security checkpoint with the lifts, and the office with the ladders.
  f.corridor('SERVICE', [[33, 29, 34, 50]], true);
  f.room('SECURITY', [35, 29, 45, 50], { staff: true });
  f.room('OFFICE', [46, 29, 50, 50], { staff: true });
  // A room for a gun on the edge, between the ports (R-1163).
  for (const [x, y] of [
    [49, 12],
    [64, 49],
    [27, 64],
    [12, 27],
  ])
    f.room('GUN', [x, y, x + 3, y + 3], { staff: true, fixed: true });
  // Where the shipyard is on a base that has bought one, and a lounge with a view on one that has not (R-1169).
  // A shipyard has an airlock of its own, at the end of the gangway from the building dock.
  const yardLock = yard ? f.room('AIRLOCK', [65, 37, 69, 42], { fixed: true }) : 0;
  const lounge = f.room(yard ? 'SHIPYARD' : 'LOUNGE', [56, 34, 69, 45]);
  // The rest is rooms: open to visitors where they face the concourse, and for the staff out by the hull.
  const made = [];
  const any = (box) => {
    const id = f.cut(box, 24);
    if (id) made.push(id);
  };
  for (const box of [
    [28, 10, 69, 23],
    [56, 24, 69, 69],
    [10, 56, 55, 69],
    [10, 28, 23, 55],
  ])
    f.split(box, 9, 14, any);
  raiseWalls(f);
  const links = LINKS.map((l) => setLink(f, l, l.decks.indexOf(1)));
  // The largest rooms are the ones visitors come for. The others are back rooms for the staff.
  const size = (id) => f.owner.filter((o, i) => o === id && f.grid.cells[i] === '.').length;
  const bySize = [...made].sort((a, b) => size(b) - size(a) || a - b);
  bySize.forEach((id, k) => {
    const s = f.spaces[id];
    s.use = k < PUBLIC_ROOMS.length ? PUBLIC_ROOMS[k] : BACK_ROOMS[(k - PUBLIC_ROOMS.length) % BACK_ROOMS.length];
    s.staff = k >= PUBLIC_ROOMS.length;
  });
  // The inner door of the airlock, on one of its two sides, and the doors of the core.
  const fixed = (tiles, kind, room) => f.doors.push(doorOf(f, tiles, kind, room));
  if (rand(state) < 0.5)
    fixed(
      [
        [23, 20],
        [23, 21],
      ],
      'lock',
      lock,
    );
  else
    fixed(
      [
        [20, 23],
        [21, 23],
      ],
      'lock',
      lock,
    );
  if (yardLock)
    fixed(
      [
        [64, 39],
        [64, 40],
      ],
      'lock',
      yardLock,
    );
  const security = f.spaces.find((s) => s && s.use === 'SECURITY').id;
  const office = f.spaces.find((s) => s && s.use === 'OFFICE').id;
  fixed(
    [
      [33, 28],
      [34, 28],
    ],
    'staff',
    0,
  );
  fixed(
    [
      [33, 51],
      [34, 51],
    ],
    'staff',
    0,
  );
  fixed(
    [
      [43, 28],
      [44, 28],
    ],
    'staff',
    security,
  );
  fixed(
    [
      [43, 51],
      [44, 51],
    ],
    'staff',
    security,
  );
  fixed(
    [
      [35, 39],
      [35, 40],
    ],
    'slide',
    security,
  );
  fixed(
    [
      [45, 40],
      [45, 41],
    ],
    'slide',
    office,
  );
  fixed(
    [
      [51, 40],
      [51, 41],
    ],
    'staff',
    office,
  );
  fixed(
    [
      [56, 39],
      [56, 40],
    ],
    'slide',
    lounge,
  );
  for (const id of [security, office, lock, lounge]) f.spaces[id].joined = true;
  cutDoors(state, f, ['GUN']);
  gunDoors(state, f);
  // The hatches in the round wall, where the crew comes in: a little inside the wall, and which way is inwards.
  const rim = (RADIUS[1] - 0.3) * Math.SQRT1_2;
  const hatches = [{ lock, x: MID - rim, y: MID - rim, nx: Math.SQRT1_2, ny: Math.SQRT1_2 }];
  f.grid.set(19, 19, 'A');
  if (yardLock) {
    hatches.push({ lock: yardLock, x: MID + RADIUS[1] - 0.3, y: MID, nx: -1, ny: 0 });
    f.grid.set(68, 39, 'A');
    f.grid.set(68, 40, 'A');
  }
  return { f, links, hatches, concourse };
}

// The top. The command room with the mainframe is in the middle, with a corridor round it and three doors that
// stay shut while the base has power. Round that: comms, servers, security and the rest.
function top(state) {
  const f = newFloor(state, 2);
  f.corridor('RING', [
    [33, 34, 46, 35],
    [33, 47, 46, 48],
    [33, 34, 34, 48],
    [45, 34, 46, 48],
  ]);
  const command = f.room('COMMAND', [35, 36, 44, 46], { staff: true, fixed: true });
  // Two rooms for heavy guns, each with its door onto the corridor (R-1163).
  const guns = [
    [28, 35, 32, 38, 32, 36],
    [47, 42, 51, 45, 47, 43],
  ].map(([x0, y0, x1, y1, dx, dy]) => [f.room('GUN', [x0, y0, x1, y1], { staff: true, fixed: true }), dx, dy]);
  const made = [];
  const any = (box) => {
    const id = f.cut(box, 12, { staff: true });
    if (id) made.push(id);
  };
  for (const box of [
    [24, 24, 55, 33],
    [24, 49, 55, 55],
    [24, 34, 32, 48],
    [47, 34, 55, 48],
  ])
    f.split(box, 6, 10, any);
  raiseWalls(f);
  const links = [LINKS[3], LINKS[4], LINKS[5]].map((l) => setLink(f, l, 1));
  for (const [id, x, y] of guns)
    f.doors.push(
      doorOf(
        f,
        [
          [x, y],
          [x, y + 1],
        ],
        'slide',
        id,
      ),
    );
  for (const tiles of [
    [
      [39, 36],
      [40, 36],
    ],
    [
      [39, 46],
      [40, 46],
    ],
    [
      [35, 41],
      [35, 42],
    ],
  ])
    f.doors.push(doorOf(f, tiles, 'command', command));
  cutDoors(state, f, ['GUN']);
  // The rooms that the corridor reaches get their names, the ones the floor must have first.
  const order = [...made.filter((id) => f.spaces[id].joined), ...made.filter((id) => !f.spaces[id].joined)];
  order.forEach((id, k) => (f.spaces[id].use = TOP_ROOMS[k % TOP_ROOMS.length]));
  return { f, links };
}

// A room for a gun has one door, into whatever lies inside it.
function gunDoors(state, f) {
  for (const s of f.spaces) {
    if (!s || s.use !== 'GUN') continue;
    const spots = doorSpots(f, s.id, (o) => !o.fixed);
    if (spots.length) f.doors.push(doorOf(f, pickOf(state, spots).tiles, 'slide', s.id));
  }
}

// A tile of a space's own floor, as near the middle of it as there is one. In tiles.
function middleOf(f, id) {
  let sx = 0,
    sy = 0,
    n = 0;
  const tiles = [];
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      if (f.at(x, y) !== id || f.grid.get(x, y) !== '.') continue;
      tiles.push([x, y]);
      sx += x;
      sy += y;
      n++;
    }
  if (!n) return null;
  let best = tiles[0];
  for (const t of tiles) if (dist(t[0], t[1], sx / n, sy / n) < dist(best[0], best[1], sx / n, sy / n)) best = t;
  return { x: best[0], y: best[1], tiles };
}

// ---------------------------------------------------------------- the whole base
// How many quarter turns a base that stands at `heading` in space is turned inside (R-1162).
export const turnsOf = (heading) => ((Math.round(heading / (Math.PI / 2)) % 4) + 4) % 4;

// `place` is the station. Its heading says how the plan is turned, and its shipyard whether it has one.
export function basePlan(state, place) {
  for (let tries = 0; tries < 40; tries++) {
    const plan = tryBase(state, place);
    if (plan) return { ...plan, tries };
  }
  throw new Error('no plan for a base could be made');
}

function tryBase(state, place) {
  const turns = turnsOf(place.heading || 0);
  const floors = [basement(state), middle(state, !!place.shipyard), top(state)];
  const w = DECK * 3 + GAP * 2;
  const grid = makeGrid(w, DECK);
  const x0 = (deck) => deck * (DECK + GAP);
  // A tile of a floor, turned with the base and moved to where that floor lies in the grid.
  const turn = (x, y) => {
    for (let k = 0; k < turns; k++) [x, y] = [DECK - 1 - y, x];
    return [x, y];
  };
  // The same for a spot given in tiles and parts of tiles, and for a direction.
  const turnAt = (x, y) => {
    for (let k = 0; k < turns; k++) [x, y] = [DECK - y, x];
    return [x, y];
  };
  const turnWay = (x, y) => {
    for (let k = 0; k < turns; k++) [x, y] = [-y, x];
    return [x, y];
  };
  const index = (deck, x, y) => {
    const [tx, ty] = turn(x, y);
    return ty * w + x0(deck) + tx;
  };
  const spot = (deck, x, y) => {
    const [tx, ty] = turnAt(x, y);
    return { x: px(x0(deck) + tx), y: px(ty) };
  };
  for (const { f } of floors)
    for (let y = 0; y < DECK; y++) for (let x = 0; x < DECK; x++) grid.cells[index(f.deck, x, y)] = f.grid.get(x, y);

  // The ways between the floors.
  const jumps = {};
  const links = LINKS.map((l) => {
    const [bx0, by0, bx1, by1] = l.box;
    for (let y = by0; y <= by1; y++)
      for (let x = bx0; x <= bx1; x++) {
        const a = index(l.decks[0], x, y),
          b = index(l.decks[1], x, y);
        jumps[a] = b;
        jumps[b] = a;
      }
    // Where its floor is on each of the two floors it joins, and where its door is there.
    const doorAt = (k) => {
      const [dx, dy] = SIDE[l.door[k]];
      if (dx) return [dx > 0 ? bx1 + 1.5 : bx0 - 0.5, Math.floor((by0 + by1) / 2) + 1];
      return [Math.floor((bx0 + bx1) / 2) + 1, dy > 0 ? by1 + 1.5 : by0 - 0.5];
    };
    return {
      kind: l.kind,
      decks: l.decks,
      at: l.decks.map((d) => spot(d, (bx0 + bx1 + 1) / 2, (by0 + by1 + 1) / 2)),
      doors: l.decks.map((d, k) => spot(d, ...doorAt(k))),
    };
  });

  // What cannot be walked to from the airlock is filled in again.
  const [hx, hy] = turn(19, 19);
  const steps = stepsFrom(grid, x0(1) + hx, hy, jumps);
  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i];
    if ((c === '.' || c === ',' || c === 'D' || c === 'L') && !steps.has(i)) grid.cells[i] = '#';
  }

  // The rooms, the corridors and the doors, as the rest of the game wants them.
  const rooms = [];
  const halls = [];
  const number = new Map();
  for (const { f } of floors) {
    for (const s of f.spaces) {
      if (!s) continue;
      const tiles = [];
      for (let y = 0; y < DECK; y++)
        for (let x = 0; x < DECK; x++) {
          if (f.at(x, y) !== s.id) continue;
          const [tx, ty] = turn(x, y);
          const c = grid.get(x0(f.deck) + tx, ty);
          if (c === '.' || c === ',') tiles.push([x0(f.deck) + tx, ty]);
        }
      if (tiles.length < (s.corridor ? 1 : 4)) continue;
      const xs = tiles.map((t) => t[0]),
        ys = tiles.map((t) => t[1]);
      const box = {
        c0: Math.min(...xs) - 1,
        c1: Math.max(...xs) + 1,
        r0: Math.min(...ys) - 1,
        r1: Math.max(...ys) + 1,
      };
      if (s.corridor) {
        // A corridor is cut into its straight runs, for whatever is to stand or walk in one.
        for (const run of runsOf(tiles)) halls.push({ ...run, deck: f.deck, staff: s.staff, use: s.use });
        continue;
      }
      // The middle of a room is a tile of its own floor, as near the middle as there is one.
      const cx = (box.c0 + box.c1) / 2,
        cy = (box.r0 + box.r1) / 2;
      const m = tiles.reduce((a, b) => (dist(b[0], b[1], cx, cy) < dist(a[0], a[1], cx, cy) ? b : a));
      number.set(f.deck + ':' + s.id, rooms.length);
      rooms.push({
        ...box,
        door: null,
        mid: { x: px(m[0]) + TILE / 2, y: px(m[1]) + TILE / 2 },
        use: s.use,
        deck: f.deck,
        staff: s.staff,
      });
    }
  }
  const doors = [];
  for (const { f } of floors) {
    for (const d of f.doors) {
      const tiles = d.tiles.map(([x, y]) => index(f.deck, x, y));
      // A door whose doorway was filled in again is no door.
      if (tiles.some((i) => !',DL'.includes(grid.cells[i]))) continue;
      const room = number.has(f.deck + ':' + d.room) ? number.get(f.deck + ':' + d.room) : -1;
      const at = spot(f.deck, d.x / TILE, d.y / TILE);
      doors.push({ ...at, tiles, kind: d.kind, room, deck: f.deck });
      if (room >= 0 && !rooms[room].door) rooms[room].door = at;
    }
  }
  // A visitor has to be able to walk from the airlock to every desk without going through a door for the staff.
  const open = new Set();
  for (const d of doors) if (d.kind === 'staff' || d.kind === 'alarm') for (const i of d.tiles) open.add(i);
  const visitor = stepsFrom(
    { w, h: DECK, get: (x, y) => (open.has(y * w + x) ? '#' : grid.get(x, y)) },
    x0(1) + hx,
    hy,
  );
  const walkedTo = (r) => visitor.has(Math.floor(r.mid.y / TILE) * w + Math.floor(r.mid.x / TILE));
  // Everything the game needs has to be there, and within reach.
  const find = (use) => rooms.findIndex((r) => r.use === use);
  const need = ['VAULT', 'BREAKER', 'COMMAND', 'COMMS', 'DRONES', 'HOLD', 'SECURITY', 'SERVICES', 'ARMORY', 'REACTOR'];
  if (need.some((use) => find(use) < 0 || !rooms[find(use)].door)) return null;
  if (rooms.filter((r) => r.use === 'LIFT' || r.use === 'STAIRS' || r.use === 'LADDER').length !== 12) return null;
  if (rooms.filter((r) => r.use === 'GUN' && r.door).length !== 10) return null;
  const desks = ['SERVICES', 'ARMORY', place.shipyard ? 'SHIPYARD' : 'LOUNGE'];
  if (desks.some((use) => find(use) < 0 || !walkedTo(rooms[find(use)]))) return null;

  const decks = floors.map(({ f }) => ({
    x0: x0(f.deck),
    cx: px(x0(f.deck) + MID),
    cy: px(MID),
    r: px(f.r),
    name: DECK_NAMES[f.deck],
  }));
  const airlocks = floors[1].hatches.map((h) => {
    const at = spot(1, h.x, h.y);
    const [nx, ny] = turnWay(h.nx, h.ny);
    return { ...at, nx, ny, room: number.get('1:' + h.lock) };
  });
  // Where reinforcements come in: at the cargo arms of the basement.
  const docks = [
    [MID, 5],
    [75, MID],
    [MID, 75],
    [5, MID],
  ].map(([x, y]) => spot(0, x, y));
  return {
    w,
    h: DECK,
    tiles: grid.cells,
    rooms,
    vault: find('VAULT'),
    halls,
    airlocks,
    // A spot in the corridor round the command room.
    far: (() => {
      const h = halls.find((x) => x.deck === 2);
      return { x: px((h.c0 + h.c1 + 1) / 2), y: px((h.r0 + h.r1 + 1) / 2) };
    })(),
    decks,
    links,
    jumps,
    doors,
    docks,
    turns,
  };
}

// The straight runs of a corridor, as boxes with the walls round them, like the rooms.
function runsOf(tiles) {
  const key = (x, y) => x + ':' + y;
  const left = new Set(tiles.map(([x, y]) => key(x, y)));
  const runs = [];
  // From the top left, so that each run grows to the right and down from its first tile.
  const sorted = [...tiles].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of sorted) {
    if (!left.has(key(x, y))) continue;
    // The largest box of this corridor's floor that begins here.
    let x1 = x;
    while (left.has(key(x1 + 1, y))) x1++;
    let y1 = y;
    const whole = (row) => {
      for (let i = x; i <= x1; i++) if (!left.has(key(i, row))) return false;
      return true;
    };
    while (whole(y1 + 1)) y1++;
    for (let j = y; j <= y1; j++) for (let i = x; i <= x1; i++) left.delete(key(i, j));
    if ((x1 - x + 1) * (y1 - y + 1) >= 6) runs.push({ c0: x - 1, c1: x1 + 1, r0: y - 1, r1: y1 + 1 });
  }
  return runs;
}
