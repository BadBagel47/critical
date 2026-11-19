// The look of a standard base inside (F-208), as in the design test docs/design/prototypes/standard-base.html:
// each floor has a style of its own, and each room a floor, furniture and light that suit what it is for.
//   the basement  dirty industry: worn plates, grates, oil, tanks and crates, in a dim sodium light
//   the middle    light and clean: pale tiles, wood in the bar and the lounge, plants, in a warm white light
//   the top       cold command: dark blue floors, racks and consoles, in a cyan light
// The walls are drawn thin, down the middle of their tiles, with a shadow at their foot. Where one walks and
// what a wall stops are the same as before: only the picture changes.
//
// Nothing here moves, so each floor is drawn once into a picture of its own, the first time it is seen, and
// that picture is laid down every frame. The doors, the locked hatches and everything that moves are drawn on
// top of it, as on any other place.
import { TILE, tileAt } from '../sim/boarding.js';
import { DECK } from '../sim/base.js';

// A number from 0 to 1 that is always the same for the same arguments.
const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const clamp = (v) => Math.max(0, Math.min(255, v)) | 0;
const rgb = (c, k = 1) => `rgb(${clamp(c[0] * k)},${clamp(c[1] * k)},${clamp(c[2] * k)})`;
const shade = (s, k) => rgb(hex(s), k);

// What kind of floor a room or corridor has on each floor, by what it is for.
const KINDS = [
  {
    HOLD: 'hold',
    CARGO: 'hold',
    REACTOR: 'power',
    REFINERY: 'power',
    PUMPS: 'power',
    FUEL: 'power',
    BREAKER: 'power',
    DRONES: 'power',
    COOLING: 'power',
    RING: 'corridor',
    CROSS: 'corridor',
  },
  {
    CONCOURSE: 'concourse',
    SERVICE: 'service',
    BAR: 'bar',
    LOUNGE: 'lounge',
    HOTEL: 'cabin',
    QUARTERS: 'cabin',
    CLINIC: 'tiles',
    KITCHEN: 'tiles',
    LAUNDRY: 'tiles',
    SERVICES: 'services',
    ARMORY: 'services',
    MARKET: 'services',
    SHIPYARD: 'yard',
    SECURITY: 'service',
    OFFICE: 'service',
    LOCKERS: 'service',
    STORES: 'service',
    PANTRY: 'service',
    ARCHIVE: 'service',
    WORKSHOP: 'service',
    GUN: 'service',
  },
  {
    COMMAND: 'command',
    SERVERS: 'server',
    SECURITY: 'server',
    COMMS: 'server',
    SENSORS: 'server',
    COOLING: 'server',
    QUARTERS: 'chief',
    OFFICE: 'chief',
  },
];
// The ways in and out and between floors have a grate underfoot on every floor.
const GRATED = new Set(['AIRLOCK', 'LIFT', 'STAIRS', 'LADDER']);
const kindOf = (deck, use) => (GRATED.has(use) ? 'grate' : KINDS[deck][use] || 'plain');

// The colours of light, as in the design test.
const L = {
  white: [215, 225, 240],
  warm: [255, 200, 150],
  amber: [255, 178, 96],
  sodium: [255, 180, 100],
  cyan: [120, 200, 255],
  teal: [90, 220, 200],
  cold: [180, 205, 235],
};
// The light on each floor: the light that is everywhere, and for each kind of room the colour of its lamps,
// how strong they are, and how many tiles apart.
const LIGHT = [
  {
    amb: [66, 60, 56],
    room: {
      corridor: [L.sodium, 0.55, 6],
      hold: [L.sodium, 0.45, 7],
      power: [L.amber, 0.5, 6],
      grate: [L.white, 0.6, 4],
      plain: [L.warm, 0.6, 5],
    },
  },
  {
    amb: [150, 148, 142],
    room: {
      concourse: [L.warm, 0.85, 6],
      service: [L.white, 0.45, 6],
      bar: [L.warm, 0.7, 5],
      lounge: [L.warm, 0.8, 5],
      cabin: [L.warm, 0.7, 5],
      tiles: [L.cold, 0.9, 5],
      services: [L.white, 0.85, 5],
      yard: [L.sodium, 0.65, 6],
      grate: [L.white, 0.7, 4],
      plain: [L.white, 0.6, 5],
    },
  },
  {
    amb: [62, 68, 86],
    room: {
      command: [L.cyan, 0.4, 7],
      server: [L.teal, 0.55, 5],
      chief: [L.warm, 0.6, 5],
      grate: [L.white, 0.6, 4],
      plain: [L.cold, 0.5, 5],
    },
  },
];
// The walls of each floor: their top, the lit edge and the edge in shadow. Then the same for door frames.
// Then plating, where nobody goes.
const WALLS = [
  { 1: ['#4e4a46', '#6e6860', '#2c2a28'], 2: ['#3e3a36', '#5e5850', '#1c1a18'], 3: ['#5a5650', '#8a847a', '#30302c'] },
  { 1: ['#8a8c92', '#b4b6bc', '#5a5c62'], 2: ['#6a6c74', '#9a9ca4', '#3a3c42'], 3: ['#9a9ca2', '#c4c6cc', '#5a5c62'] },
  { 1: ['#3e4656', '#5e6a80', '#222834'], 2: ['#323a48', '#525e74', '#181c24'], 3: ['#4a5262', '#7a86a0', '#262c36'] },
];
// The round outer wall of each floor, for drawHull: its edge in shadow, its face and its lit edge.
export const HULLS = [
  { wall: ['#1c1a18', '#3e3a36', '#5e5850'] },
  { wall: ['#3a3c42', '#6a6c74', '#9a9ca4'] },
  { wall: ['#181c24', '#323a48', '#525e74'] },
];

// What is drawn where nobody can go: the inside of a thick wall, or a space that was filled in.
const SOLID = ['#1a1917', '#2a2b30', '#161a20'];

// A wall is drawn this many pixels thick, down the middle of its tile.
const CORE = 6;
const C0 = (TILE - CORE) / 2;

const WALLISH = new Set(['#', 'L', 'D', ' ', 'X']);

// Which room or corridor each tile of a floor belongs to, and what that is for. Rooms are filled from their
// middle out to their walls and doors; the corridors are what is left, by the boxes they were made of.
function regionsOf(it, deck) {
  const d = it.decks[deck];
  const n = DECK * DECK;
  const region = new Int32Array(n).fill(-1);
  const uses = [];
  const doorTiles = new Set();
  for (const door of it.doors || []) for (const i of door.tiles) doorTiles.add(i);
  const open = (tx, ty) => {
    if (tx < d.x0 || tx >= d.x0 + DECK || ty < 0 || ty >= DECK) return false;
    const c = tileAt(it, tx, ty);
    return !WALLISH.has(c) && !doorTiles.has(ty * it.w + tx);
  };
  const fill = (tx, ty, id, box) => {
    const todo = [[tx, ty]];
    while (todo.length) {
      const [x, y] = todo.pop();
      if (!open(x, y)) continue;
      if (box && (x < box.c0 || x > box.c1 || y < box.r0 || y > box.r1)) continue;
      const k = y * DECK + (x - d.x0);
      if (region[k] >= 0) continue;
      region[k] = id;
      todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  };
  it.rooms.forEach((r, i) => {
    if (r.deck !== deck) return;
    const tx = Math.floor(r.mid.x / TILE),
      ty = Math.floor(r.mid.y / TILE);
    if (tx < d.x0 || tx >= d.x0 + DECK) return;
    uses.push((it.uses && it.uses[i]) || r.use || 'ROOM');
    fill(tx, ty, uses.length - 1, r);
  });
  for (const h of it.halls || []) {
    if (h.deck !== deck) continue;
    uses.push(h.use || 'CORRIDOR');
    const id = uses.length - 1;
    for (let y = h.r0 + 1; y < h.r1; y++) for (let x = h.c0 + 1; x < h.c1; x++) fill(x, y, id, h);
  }
  // What is still left joins whatever it touches.
  for (let pass = 0; pass < 4; pass++)
    for (let y = 0; y < DECK; y++)
      for (let x = 0; x < DECK; x++) {
        const k = y * DECK + x;
        if (region[k] >= 0 || !open(d.x0 + x, y)) continue;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < DECK && yy < DECK && region[yy * DECK + xx] >= 0) {
            region[k] = region[yy * DECK + xx];
            break;
          }
        }
      }
  return { region, uses, doorTiles };
}

// How each floor looks, for the tests: the light that is everywhere, the top of its walls, and the floor a room
// gets by what it is for.
export const deckLook = (deck) => ({
  ambient: LIGHT[deck].amb,
  wall: hex(WALLS[deck][1][0]),
  kindOf: (use) => kindOf(deck, use),
});

// ------------------------------------------------------------------ floors
function floorTile(g, deck, kind, tx, ty, x, y, room) {
  const T = TILE;
  const box = (bx, by, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(bx | 0, by | 0, w | 0, h | 0);
  };
  const noise = (cols, count) => {
    for (let k = 0; k < count; k++)
      box(
        x + ((hash(tx, ty, k + 3) * 16) | 0),
        y + ((hash(tx, ty, k + 40) * 16) | 0),
        1 + (k % 2),
        1,
        cols[k % cols.length],
      );
  };
  const grate = (base, line, edge) => {
    box(x, y, T, T, base);
    for (let k = 1; k < T; k += 3) box(x + k, y + 1, 1, T - 2, line);
    box(x, y, T, 1, edge);
    box(x, y, 1, T, shade(base, 1.2));
  };
  const spot = (cx, cy, r, c) => {
    g.fillStyle = c;
    for (let j = -r; j <= r; j++) {
      const k = Math.floor(Math.sqrt(r * r - j * j + r * 0.6));
      g.fillRect((cx - k) | 0, (cy + j) | 0, k * 2 + 1, 1);
    }
  };
  if (kind === 'grate') return grate(deck === 1 ? '#3a3d42' : '#2c2b29', deck === 1 ? '#2e3136' : '#242321', '#1d1c1a');
  if (deck === 0) {
    if (kind === 'corridor') {
      grate('#2c2b29', '#242321', '#1d1c1a');
      noise(['#3a352c', '#1e1c1a'], 4);
      if (hash(tx, ty, 9) < 0.08) spot(x + 8, y + 8, 4, 'rgba(10,8,6,0.35)');
    } else if (kind === 'hold') {
      // Big worn plates, oil and scuffs.
      const px = tx % 3,
        py = ty % 3;
      box(x, y, T, T, (Math.floor(tx / 3) + Math.floor(ty / 3)) % 2 ? '#34312c' : '#2f2c28');
      if (px === 0) box(x, y, 1, T, '#24221f');
      if (py === 0) box(x, y, T, 1, '#24221f');
      if (px === 0 && py === 0) box(x + 2, y + 2, 2, 2, '#45413a');
      noise(['#3d3830', '#27241f', '#3a3024'], 6);
      if (hash(tx, ty, 21) < 0.06)
        spot(
          x + 6 + hash(tx, ty, 2) * 4,
          y + 6 + hash(ty, tx, 2) * 4,
          3 + ((hash(tx, ty, 5) * 3) | 0),
          'rgba(8,6,4,0.4)',
        );
    } else if (kind === 'power') {
      box(x, y, T, T, '#262624');
      if (ty % 3 === 0) box(x, y + 6, T, 3, '#3a2d26');
      for (let k = 0; k < T; k += 2) box(x, y + k, T, 1, 'rgba(10,10,8,0.5)');
      for (let k = 0; k < T; k += 4) box(x + k, y, 1, T, 'rgba(10,10,8,0.4)');
      noise(['#3a3024'], 2);
    } else {
      box(x, y, T, T, '#2e2c2a');
      box(x, y, T, 1, '#222120');
      box(x, y, 1, T, '#222120');
      box(x + 2, y + 2, 2, 2, '#383532');
      box(x + 12, y + 12, 2, 2, '#383532');
      noise(['#36332e', '#262420', '#3a3024'], 5);
    }
    return;
  }
  if (deck === 1) {
    if (kind === 'concourse') {
      box(x, y, T, T, ['#606164', '#5a5b5e'][(tx + ty) % 2]);
      box(x, y, T, 1, '#47494d');
      box(x, y, 1, T, '#47494d');
      box(x + 1, y + 1, T - 2, 1, '#68696d');
    } else if (kind === 'service') {
      box(x, y, T, T, '#3a3c3e');
      box(x, y, T, 1, '#2e3032');
      box(x, y, 1, T, '#2e3032');
      noise(['#424446'], 2);
    } else if (kind === 'bar' || kind === 'lounge') {
      const bar = kind === 'bar';
      box(x, y, T, T, bar ? '#4a3a2e' : '#4e3e30');
      for (let k = 0; k < T; k += 4) box(x, y + k, T, 1, bar ? '#3e3026' : '#423428');
      box(x + ((ty * 7) % 16), y, 1, T, '#3e3026');
    } else if (kind === 'cabin') {
      box(x, y, T, T, '#4a4a58');
      noise(['#52525f', '#44444f'], 8);
    } else if (kind === 'tiles') {
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) box(x + i * 8, y + j * 8, 8, 8, (i + j) % 2 ? '#64686c' : '#5e6266');
      box(x, y, T, 1, '#4e5256');
      box(x, y, 1, T, '#4e5256');
    } else if (kind === 'yard') {
      box(x, y, T, T, '#3a3a3c');
      box(x, y, T, 1, '#2c2c2e');
      box(x, y, 1, T, '#2c2c2e');
      if ((tx + ty) % 4 === 0) box(x + 6, y + 6, 4, 4, '#323234');
      noise(['#45443e', '#2e2d2a'], 3);
    } else if (kind === 'services') {
      box(x, y, T, T, (tx + ty) % 2 ? '#585a5e' : '#535559');
      box(x, y, T, 1, '#46484c');
      box(x, y, 1, T, '#46484c');
    } else {
      box(x, y, T, T, '#56585c');
      box(x, y, T, 1, '#46484c');
      box(x, y, 1, T, '#46484c');
    }
    return;
  }
  if (kind === 'command') {
    // A walkway of grates round the edge of the room, and dark tiles inside it.
    const edge = room ? Math.min(tx - room.c0, ty - room.r0, room.c1 - tx, room.r1 - ty) : 9;
    if (edge <= 2) {
      box(x, y, T, T, '#2a3240');
      for (let k = 1; k < T; k += 3) box(x + k, y + 1, 1, T - 2, '#222a36');
      box(x, y, T, 1, '#3a4456');
    } else {
      box(x, y, T, T, (tx + ty) % 2 ? '#22262e' : '#20242b');
      box(x, y, T, 1, '#1a1d23');
      box(x, y, 1, T, '#1a1d23');
      box(x + 7, y + 7, 2, 2, '#2c323c');
    }
  } else if (kind === 'server') {
    box(x, y, T, T, '#232830');
    box(x + 1, y + 1, T - 2, T - 2, '#272d36');
    for (let j = 3; j < T - 2; j += 3) for (let i = 3; i < T - 2; i += 3) box(x + i, y + j, 1, 1, '#1c2027');
  } else if (kind === 'chief') {
    box(x, y, T, T, '#3a3430');
    for (let k = 0; k < T; k += 4) box(x, y + k, T, 1, '#332d29');
  } else {
    box(x, y, T, T, '#262b33');
    box(x, y, T, 1, '#1e222a');
    box(x, y, 1, T, '#1e222a');
    box(x + 2, y + 2, T - 4, 1, '#2c323c');
  }
}

// ------------------------------------------------------------------ furniture
// The pieces of furniture, drawn on the floor (g) and, for what shines by itself, on the glow (e) that is laid on
// after the light. A piece fills the box it is given.
function pieces(g, e) {
  const box = (c, x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  const block = (x, y, w, h, c) => {
    const base = hex(c);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(x + 2, y + 2, w, h);
    box(g, x, y, w, h, rgb(base, 0.55));
    box(g, x + 1, y + 1, w - 2, h - 2, c);
    box(g, x + 1, y + 1, w - 2, 1, rgb(base, 1.3));
    box(g, x + 1, y + 1, 1, h - 2, rgb(base, 1.18));
    box(g, x + 1, y + h - 2, w - 2, 1, rgb(base, 0.78));
    box(g, x + w - 2, y + 1, 1, h - 2, rgb(base, 0.82));
  };
  const disc = (c, cx, cy, r, col) => {
    c.fillStyle = col;
    for (let j = -r; j <= r; j++) {
      const k = Math.floor(Math.sqrt(r * r - j * j + r * 0.6));
      c.fillRect((cx - k) | 0, (cy + j) | 0, k * 2 + 1, 1);
    }
  };
  const screen = (x, y, w, h, c) => {
    box(g, x, y, w, h, '#101820');
    box(e, x, y, w, h, shade(c, 0.3));
    for (let j = y + 1; j < y + h - 1; j += 2)
      box(e, x + 1, j, Math.max(1, ((w - 2) * (0.35 + 0.65 * hash(x, j))) | 0), 1, shade(c, 0.85));
  };
  const along = (w, h) => w >= h;
  return {
    crate(x, y, w, h, n) {
      const c = ['#6e4630', '#3f5f5a', '#5a5d3a', '#55586a'][n % 4];
      block(x, y, w, h, c);
      box(g, x + (w >> 1), y + 1, 1, h - 2, shade(c, 0.65));
      box(g, x + 1, y + (h >> 1), w - 2, 1, shade(c, 0.65));
    },
    container(x, y, w, h, n) {
      const c = ['#3f5f5a', '#6e4630', '#5a5d3a', '#55586a', '#5a3a4a'][n % 5];
      block(x, y, w, h, c);
      const al = along(w, h);
      for (let k = 4; k < (al ? w : h) - 3; k += 4)
        al ? box(g, x + k, y + 2, 1, h - 4, shade(c, 0.8)) : box(g, x + 2, y + k, w - 4, 1, shade(c, 0.8));
      box(g, x + 3, y + 3, 4, 2, '#c9c2a8');
    },
    shelf(x, y, w, h, n) {
      block(x, y, w, h, '#3d4250');
      const al = along(w, h);
      for (let k = 2; k < (al ? w : h) - 4; k += 6) {
        const c = ['#6a5040', '#4a5a50', '#5a5a64', '#6e6040', '#7a6a50'][(k + n) % 5];
        al ? box(g, x + k, y + 2, 4, h - 4, c) : box(g, x + 2, y + k, w - 4, 4, c);
      }
    },
    locker(x, y, w, h) {
      const c = '#4a4e5a';
      block(x, y, w, h, c);
      const al = along(w, h);
      for (let k = 6; k < (al ? w : h) - 2; k += 6)
        al ? box(g, x + k, y + 1, 1, h - 2, shade(c, 0.65)) : box(g, x + 1, y + k, w - 2, 1, shade(c, 0.65));
    },
    console(x, y, w, h, n, c = '#6fb8ff') {
      block(x, y, w, h, '#3a3f4b');
      along(w, h) ? screen(x + 2, y + 2, w - 4, h - 5, c) : screen(x + 2, y + 2, w - 5, h - 4, c);
    },
    rack(x, y, w, h) {
      block(x, y, w, h, '#2a2e36');
      const al = along(w, h);
      for (let k = 3; k < (al ? w : h) - 3; k += 5) {
        al ? box(g, x + k, y + 2, 3, h - 4, '#3a3f48') : box(g, x + 2, y + k, w - 4, 3, '#3a3f48');
        box(e, al ? x + k + 1 : x + 3, al ? y + 3 : y + k + 1, 1, 1, k % 10 ? '#62e08a' : '#5fd1e0');
      }
    },
    bed(x, y, w, h, n, top = '#5a5a6a', pillow = '#9a96a6', blanket = '#4a4e66') {
      block(x, y, w, h, '#3a3d48');
      const al = w > h;
      box(g, x + 2, y + 2, w - 4, h - 4, top);
      al ? box(g, x + 2, y + 2, 5, h - 4, pillow) : box(g, x + 2, y + 2, w - 4, 5, pillow);
      al ? box(g, x + 8, y + 2, w - 10, h - 4, blanket) : box(g, x + 2, y + 8, w - 4, h - 10, blanket);
    },
    table(x, y, w, h) {
      block(x, y, w, h, '#5a5650');
      box(g, x + 4, y + 3, 3, 3, '#c0b8a0');
    },
    sofa(x, y, w, h) {
      const c = '#7a5a4a';
      block(x, y, w, h, '#624838');
      const al = along(w, h);
      al ? box(g, x + 2, y + 2, w - 4, 3, shade(c, 1.15)) : box(g, x + 2, y + 2, 3, h - 4, shade(c, 1.15));
      al ? box(g, x + 2, y + 6, w - 4, h - 8, c) : box(g, x + 6, y + 2, w - 8, h - 4, c);
    },
    tank(x, y, w, h) {
      const c = '#4a6a62';
      const r = Math.max(3, (Math.min(w, h) >> 1) - 1);
      const cx = x + (w >> 1),
        cy = y + (h >> 1);
      disc(g, cx + 2, cy + 2, r, 'rgba(0,0,0,0.45)');
      disc(g, cx, cy, r, shade(c, 0.6));
      disc(g, cx, cy, r - 1, c);
      disc(g, cx - 2, cy - 2, Math.max(1, (r / 3) | 0), shade(c, 1.35));
      box(g, cx - 1, cy - 1, 3, 3, shade(c, 0.7));
    },
    machine(x, y, w, h) {
      block(x, y, w, h, '#3a3f48');
      const al = along(w, h);
      for (let k = 3; k < (al ? w : h) - 3; k += 7)
        al ? box(g, x + k, y + 3, 4, h - 6, '#2a2e36') : box(g, x + 3, y + k, w - 6, 4, '#2a2e36');
      box(e, x + 3, y + 3, 2, 2, '#ff9a46');
      box(g, x + 1, al ? y + (h >> 1) : y + 1, al ? w - 2 : 3, al ? 3 : h - 2, '#3b4650');
    },
    plant(x, y, w, h) {
      const r = Math.max(3, (Math.min(w, h) >> 1) - 1);
      const cx = x + (w >> 1),
        cy = y + (h >> 1);
      disc(g, cx + 1, cy + 2, r, 'rgba(0,0,0,0.4)');
      disc(g, cx, cy, r, '#4a3e30');
      for (let k = 0; k < r * 5; k++) {
        const a = hash(cx, cy, k) * 6.28,
          d = Math.sqrt(hash(cy, cx, k)) * r;
        box(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2, ['#3e6a34', '#4e8040', '#2e5228', '#5a9048'][k % 4]);
      }
    },
    counter(x, y, w, h, n, c = '#4a4c54') {
      block(x, y, w, h, c);
      box(g, x + 2, y + 2, w - 4, 1, shade(c, 1.4));
    },
    cabinet(x, y, w, h) {
      block(x, y, w, h, '#4a4c54');
      const al = along(w, h);
      for (let k = 4; k < (al ? w : h) - 4; k += 6) {
        al ? box(g, x + k, y + 2, 3, 6, '#2a2d34') : box(g, x + 2, y + k, 6, 3, '#2a2d34');
        al ? box(g, x + k + 1, y + 3, 1, 2, '#c9a441') : box(g, x + 3, y + k + 1, 2, 1, '#c9a441');
      }
    },
    guns(x, y, w, h) {
      block(x, y, w, h, '#3a3d44');
      const al = along(w, h);
      for (let k = 3; k < (al ? w : h) - 3; k += 5)
        al ? box(g, x + k, y + 1, 2, h - 2, '#1f2126') : box(g, x + 1, y + k, w - 2, 2, '#1f2126');
    },
    bench(x, y, w, h) {
      const c = '#6a5a48';
      block(x, y, w, h, c);
      const al = along(w, h);
      for (let k = 3; k < (al ? w : h) - 2; k += 4)
        al ? box(g, x + k, y + 2, 1, h - 4, shade(c, 0.75)) : box(g, x + 2, y + k, w - 4, 1, shade(c, 0.75));
    },
  };
}

// What stands in a room, by what the room is for: one piece for a run of things, or one for each.
const PIECE = {
  HOLD: 'container',
  CARGO: 'container',
  MARKET: 'crate',
  DRONES: 'crate',
  REACTOR: 'tank',
  REFINERY: 'machine',
  PUMPS: 'tank',
  COOLING: 'tank',
  FUEL: 'tank',
  BREAKER: 'cabinet',
  WORKSHOP: 'bench',
  BARRACKS: 'bed',
  QUARTERS: 'bed',
  HOTEL: 'bed',
  CLINIC: 'bed',
  BAR: 'counter',
  LOUNGE: 'sofa',
  KITCHEN: 'counter',
  PANTRY: 'shelf',
  SERVICES: 'console',
  SECURITY: 'console',
  OFFICE: 'console',
  SENSORS: 'console',
  COMMS: 'console',
  COMMAND: 'console',
  SERVERS: 'rack',
  STORES: 'shelf',
  LOCKERS: 'locker',
  ARCHIVE: 'shelf',
  LAUNDRY: 'locker',
  ARMORY: 'guns',
  ARMS: 'guns',
  SHIPYARD: 'crate',
};
// Rooms where a thing that stands alone is now and then a plant in a pot.
const GREEN = new Set(['LOUNGE', 'HOTEL', 'OFFICE', 'CLINIC', 'BAR', 'QUARTERS', 'SERVICES']);
// Pieces that are drawn one to a tile, side by side, when the things stand in a row.
const EACH = new Set(['bed', 'tank', 'crate']);
const SCREEN = { SECURITY: '#62e08a', COMMAND: '#5fd1e0', COMMS: '#5fd1e0', SENSORS: '#5fd1e0' };

function drawFurniture(g, e, it, deck, reg) {
  const d = it.decks[deck];
  const P = pieces(g, e);
  const seen = new Uint8Array(DECK * DECK);
  const isK = (x, y) => x >= 0 && y >= 0 && x < DECK && y < DECK && tileAt(it, d.x0 + x, y) === 'K';
  let n = 0;
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      if (seen[y * DECK + x] || !isK(x, y)) continue;
      // The run of things this one starts: as far right, and then as far down, as the whole row goes.
      let x1 = x;
      while (isK(x1 + 1, y) && !seen[y * DECK + x1 + 1]) x1++;
      let y1 = y;
      const row = (yy) => {
        for (let i = x; i <= x1; i++) if (!isK(i, yy) || seen[yy * DECK + i]) return false;
        return true;
      };
      while (y1 - y < 3 && row(y1 + 1)) y1++;
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen[yy * DECK + xx] = 1;
      const id = reg.region[y * DECK + x];
      const use = id >= 0 ? reg.uses[id] : 'ROOM';
      let kind = PIECE[use] || 'cabinet';
      const px = (d.x0 + x) * TILE,
        py = y * TILE;
      const w = (x1 - x + 1) * TILE,
        h = (y1 - y + 1) * TILE;
      n++;
      if (w === TILE && h === TILE && GREEN.has(use) && hash(x, y, 7) < 0.35) kind = 'plant';
      if (EACH.has(kind) && (w > TILE || h > TILE))
        for (let yy = py; yy < py + h; yy += TILE)
          for (let xx = px; xx < px + w; xx += TILE) P[kind](xx + 2, yy + 1, TILE - 4, TILE - 3, n++);
      else if (kind === 'console') P.console(px + 2, py + 2, w - 4, h - 5, n, SCREEN[use]);
      else P[kind](px + 2, py + 2, w - 4, h - 5, n);
    }
}

// What lies on the floor and can be walked over: a rug in the rooms where people live and sit, and the painted
// lanes of a hold.
const RUG = {
  LOUNGE: '#5a3a3a',
  HOTEL: '#3a4a5a',
  QUARTERS: '#4a3a52',
  OFFICE: '#3a4a3e',
  BAR: '#5a2e2a',
  CLINIC: '#3e5a5a',
};

function drawFloorMarks(g, it, deck) {
  it.rooms.forEach((r, i) => {
    if (r.deck !== deck) return;
    const use = (it.uses && it.uses[i]) || r.use;
    const w = r.c1 - r.c0 - 1,
      h = r.r1 - r.r0 - 1;
    const x0 = (r.c0 + 1) * TILE,
      y0 = (r.r0 + 1) * TILE;
    if (RUG[use] && w >= 5 && h >= 5) {
      const rx = x0 + TILE * 1.5,
        ry = y0 + TILE * 1.5,
        rw = (w - 3) * TILE,
        rh = (h - 3) * TILE;
      g.fillStyle = shade(RUG[use], 0.7);
      g.fillRect(rx, ry, rw, rh);
      g.fillStyle = RUG[use];
      g.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);
      g.fillStyle = shade(RUG[use], 1.35);
      g.fillRect(rx + 4, ry + 4, rw - 8, 1);
      g.fillRect(rx + 4, ry + rh - 5, rw - 8, 1);
      g.fillRect(rx + 4, ry + 4, 1, rh - 8);
      g.fillRect(rx + rw - 5, ry + 4, 1, rh - 8);
    }
    if ((use === 'HOLD' || use === 'CARGO') && w >= 6 && h >= 6) {
      // A yellow lane down the long way of the hold, dashed, and its edges hatched.
      const along = w >= h;
      g.fillStyle = 'rgba(201,164,65,0.55)';
      if (along) for (let x = x0 + 8; x < x0 + w * TILE - 8; x += 12) g.fillRect(x, y0 + (h * TILE) / 2 - 1, 7, 2);
      else for (let y = y0 + 8; y < y0 + h * TILE - 8; y += 12) g.fillRect(x0 + (w * TILE) / 2 - 1, y, 2, 7);
    }
  });
}

// Plants along the walls of the concourse and the lounge, where nobody needs to walk: in the corners.
function drawPlants(g, it, deck, reg) {
  if (deck !== 1) return;
  const d = it.decks[deck];
  const P = pieces(g, g);
  const wall = (x, y) => tileAt(it, d.x0 + x, y) === '#';
  for (let y = 1; y < DECK - 1; y++)
    for (let x = 1; x < DECK - 1; x++) {
      const id = reg.region[y * DECK + x];
      if (id < 0 || reg.uses[id] !== 'CONCOURSE' || tileAt(it, d.x0 + x, y) !== ',') continue;
      const corner = (wall(x - 1, y) || wall(x + 1, y)) && (wall(x, y - 1) || wall(x, y + 1));
      if (!corner || hash(x, y, 11) > 0.6) continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => reg.doorTiles.has(y * it.w + d.x0 + x + dx + dy * it.w));
      if (near) continue;
      P.plant((d.x0 + x) * TILE + 3, y * TILE + 3, 10, 10);
    }
}

// ------------------------------------------------------------------ walls
// The walls as a mask of pixels: 1 a wall, 3 a door's frame. Each wall tile has a thin wall down its middle that
// runs on into the tiles of wall beside it.
function wallMask(it, deck, reg) {
  const d = it.decks[deck];
  const S = DECK * TILE;
  const mask = new Uint8Array(S * S);
  // A wall goes over plating, and a door frame over both.
  const RANK = [0, 2, 1, 3];
  // Which tiles have any of it.
  const tiles = new Uint8Array(DECK * DECK);
  const put = (x, y, w, h, t) => {
    for (let j = Math.max(0, y >> 4); j <= Math.min(DECK - 1, (y + h - 1) >> 4); j++)
      for (let i = Math.max(0, x >> 4); i <= Math.min(DECK - 1, (x + w - 1) >> 4); i++) tiles[j * DECK + i] = 1;
    for (let j = Math.max(0, y); j < Math.min(S, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(S, x + w); i++)
        if (RANK[t] >= RANK[mask[j * S + i]]) mask[j * S + i] = t;
  };
  const c = (x, y) => tileAt(it, d.x0 + x, y);
  const isDoor = (x, y) => reg.doorTiles.has(y * it.w + d.x0 + x);
  const joins = (x, y) => x < 0 || y < 0 || x >= DECK || y >= DECK || WALLISH.has(c(x, y)) || isDoor(x, y);
  const AROUND = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  // Wall that has no floor round it: a space nobody goes into, drawn as plating (2).
  const solidAt = (x, y) => x >= 0 && y >= 0 && x < DECK && y < DECK && '#LDX'.includes(c(x, y)) && !isDoor(x, y);
  const deep = (x, y) => solidAt(x, y) && AROUND.every(([dx, dy]) => joins(x + dx, y + dy));
  const outside = (x, y) => x < 0 || y < 0 || x >= DECK || y >= DECK || c(x, y) === ' ';
  const rim = (x, y) => AROUND.some(([dx, dy]) => outside(x + dx, y + dy));
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      const t = c(x, y);
      const X = x * TILE,
        Y = y * TILE;
      if (isDoor(x, y)) {
        // A doorway: a frame at each end, where it meets the wall.
        const across = joins(x - 1, y) && !isDoor(x - 1, y) ? true : joins(x + 1, y) && !isDoor(x + 1, y);
        if (across) {
          if (joins(x - 1, y) && !isDoor(x - 1, y)) put(X, Y + C0 - 1, 3, CORE + 2, 3);
          if (joins(x + 1, y) && !isDoor(x + 1, y)) put(X + TILE - 3, Y + C0 - 1, 3, CORE + 2, 3);
        } else {
          if (joins(x, y - 1) && !isDoor(x, y - 1)) put(X + C0 - 1, Y, CORE + 2, 3, 3);
          if (joins(x, y + 1) && !isDoor(x, y + 1)) put(X + C0 - 1, Y + TILE - 3, CORE + 2, 3, 3);
        }
        continue;
      }
      if (t !== '#' && t !== 'L' && t !== 'D' && t !== 'X') continue;
      if (deep(x, y)) {
        put(X, Y, TILE, TILE, 2);
        continue;
      }
      // At the round outer wall the floor goes on out to the circle, and so do the walls that meet it
      // (as in the design test): the hull is drawn over the circle itself.
      if (rim(x, y)) {
        const inner = (dx, dy) => solidAt(x + dx, y + dy) && !rim(x + dx, y + dy) && !deep(x + dx, y + dy);
        if (inner(0, -1) || inner(0, 1)) put(X + C0, Y, CORE, TILE, 1);
        if (inner(-1, 0) || inner(1, 0)) put(X, Y + C0, TILE, CORE, 1);
        continue;
      }
      // Next to plating, the plating comes up to the wall.
      const M = C0 + CORE;
      for (const [dx, dy] of AROUND) {
        if (!deep(x + dx, y + dy)) continue;
        put(dx > 0 ? X + C0 : X, dy > 0 ? Y + C0 : Y, dx ? TILE - C0 : TILE, dy ? TILE - C0 : TILE, 2);
        if (dx && dy) put(dx > 0 ? X + C0 : X, dy > 0 ? Y + C0 : Y, M, M, 2);
      }
      const arm = (dx, dy) => joins(x + dx, y + dy) && !deep(x + dx, y + dy);
      put(X + C0, Y + C0, CORE, CORE, 1);
      if (arm(0, -1)) put(X + C0, Y, CORE, C0, 1);
      if (arm(0, 1)) put(X + C0, Y + C0 + CORE, CORE, TILE - C0 - CORE, 1);
      if (arm(-1, 0)) put(X, Y + C0, C0, CORE, 1);
      if (arm(1, 0)) put(X + C0 + CORE, Y + C0, TILE - C0 - CORE, CORE, 1);
    }
  return Object.assign(mask, { tiles });
}

function paintWalls(g, deck, mask) {
  const S = DECK * TILE;
  const img = g.getImageData(0, 0, S, S);
  const px = img.data;
  const m = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : mask[y * S + x]);
  const cols = {};
  for (const k in WALLS[deck]) cols[k] = WALLS[deck][k].map(hex);
  const stripe = hex('#8a7234');
  // Only the tiles with a wall in or next to them have anything to do.
  const busy = new Uint8Array(DECK * DECK);
  for (let ty = 0; ty < DECK; ty++)
    for (let tx = 0; tx < DECK; tx++) {
      if (!mask.tiles[ty * DECK + tx]) continue;
      for (let j = Math.max(0, ty - 1); j <= Math.min(DECK - 1, ty + 1); j++)
        for (let i = Math.max(0, tx - 1); i <= Math.min(DECK - 1, tx + 1); i++) busy[j * DECK + i] = 1;
    }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (!busy[((y / TILE) | 0) * DECK + ((x / TILE) | 0)]) {
        x += TILE - 1;
        continue;
      }
      const i = (y * S + x) * 4;
      const t = mask[y * S + x];
      if (t) {
        const [top, hi, lo] = cols[t];
        let c = top;
        if (!m(x, y - 1) || !m(x - 1, y)) c = hi;
        else if (!m(x, y + 1) || !m(x + 1, y)) c = lo;
        if (t === 3 && c === top && (x + y) % 4 < 2) c = stripe;
        let k = 1;
        if (t === 2 && c === top) {
          if (x % 16 === 0 || y % 16 === 0) k = 0.8;
          else if (x % 8 === 4 && y % 8 === 4) c = hi;
        }
        px[i] = c[0] * k;
        px[i + 1] = c[1] * k;
        px[i + 2] = c[2] * k;
        px[i + 3] = 255;
        continue;
      }
      if (!px[i + 3]) continue;
      // The floor at the foot of a wall is in its shadow, more so below it and to its right.
      let k = 1;
      if (m(x - 2, y - 2) || m(x - 1, y - 2) || m(x - 2, y - 1)) k = 0.6;
      else if (m(x, y - 1) || m(x - 1, y) || m(x + 1, y) || m(x, y + 1)) k = 0.78;
      else if (m(x, y - 4) || m(x - 4, y) || m(x + 4, y) || m(x, y + 4)) k = 0.88;
      if (k < 1) {
        px[i] *= k;
        px[i + 1] *= k;
        px[i + 2] *= k;
      }
    }
  g.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ along the walls
// What hangs on the walls or stands flush against them, at the foot of a wall where nobody can walk anyway:
// shelves of bottles in a bar, screens where people work, pipes in the basement, lockers where people sleep.
const FIXTURE = {
  BAR: 'bottles',
  KITCHEN: 'bottles',
  PANTRY: 'bottles',
  SERVICES: 'screen',
  SECURITY: 'screen',
  OFFICE: 'screen',
  COMMS: 'screen',
  SENSORS: 'screen',
  COMMAND: 'screen',
  SERVERS: 'leds',
  COOLING: 'pipe',
  HOLD: 'pipe',
  CARGO: 'pipe',
  REACTOR: 'pipe',
  REFINERY: 'pipe',
  PUMPS: 'pipe',
  FUEL: 'pipe',
  DRONES: 'pipe',
  BREAKER: 'panel',
  RING: 'pipe',
  CROSS: 'pipe',
  BARRACKS: 'locker',
  QUARTERS: 'locker',
  HOTEL: 'locker',
  LOCKERS: 'locker',
  CLINIC: 'panel',
  CONCOURSE: 'sign',
  LOUNGE: 'lamp',
};
const SCREENS = ['#6fb8ff', '#5fd1e0', '#62e08a'];

function drawFixtures(g, e, it, deck, reg) {
  const d = it.decks[deck];
  const box = (c, x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  const c = (x, y) => (x < 0 || y < 0 || x >= DECK || y >= DECK ? ' ' : tileAt(it, d.x0 + x, y));
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      if (c(x, y) !== '#' || reg.doorTiles.has(y * it.w + d.x0 + x)) continue;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const id = reg.region[(y + dy) * DECK + (x + dx)];
        if (!(x + dx >= 0 && y + dy >= 0 && x + dx < DECK && y + dy < DECK) || id < 0) continue;
        if (!'.,'.includes(c(x + dx, y + dy))) continue;
        const what = FIXTURE[reg.uses[id]];
        const n = hash(d.x0 + x, y, dx * 3 + dy);
        if (!what || n > (what === 'pipe' ? 0.9 : what === 'screen' ? 0.35 : 0.55)) continue;
        // The strip at the foot of the wall on the side of the room: along it (a) and out from the wall (b).
        const X = x * TILE,
          Y = y * TILE;
        const deep = C0 - 1;
        const strip = dy
          ? { x: X + 1, y: dy > 0 ? Y + TILE - deep : Y + 1, w: TILE - 2, h: deep - 1 }
          : { x: dx > 0 ? X + TILE - deep : X + 1, y: Y + 1, w: deep - 1, h: TILE - 2 };
        const { x: sx, y: sy, w, h } = strip;
        const long = w > h;
        if (what === 'bottles') {
          box(g, sx, sy, w, h, '#3a2c22');
          for (let k = 1; k < (long ? w : h) - 1; k += 2)
            box(
              g,
              long ? sx + k : sx + 1,
              long ? sy + 1 : sy + k,
              1,
              1,
              ['#7ab060', '#c9a441', '#a85a3a', '#6aa0c0'][(k + x) % 4],
            );
        } else if (what === 'screen') {
          box(g, sx, sy, w, h, '#2a2e36');
          box(e, sx + 1, sy + 1, long ? w - 2 : w - 1, long ? h - 1 : h - 2, shade(SCREENS[(x + y) % 3], 0.75));
        } else if (what === 'leds') {
          box(g, sx, sy, w, h, '#1e2228');
          for (let k = 2; k < (long ? w : h) - 1; k += 3)
            box(e, long ? sx + k : sx + 1, long ? sy + 1 : sy + k, 1, 1, k % 2 ? '#62e08a' : '#5fd1e0');
        } else if (what === 'pipe') {
          box(g, sx, sy, w, h, '#3b4650');
          box(g, long ? sx : sx + 1, long ? sy + 1 : sy, long ? w : 1, long ? 1 : h, shade('#3b4650', 1.4));
          if (n < 0.2) box(g, sx + (w >> 1) - 1, sy + (h >> 1) - 1, 3, 3, '#a8361e');
        } else if (what === 'panel') {
          box(g, sx + 2, sy, w - 4, h, '#4a4c54');
          box(e, sx + 4, sy + 1, 2, 1, n < 0.3 ? '#ff9a46' : '#62e08a');
        } else if (what === 'locker') {
          box(g, sx, sy, w, h, '#4a4e5a');
          for (let k = 4; k < (long ? w : h); k += 5)
            box(g, long ? sx + k : sx, long ? sy : sy + k, long ? 1 : w, long ? h : 1, '#363944');
        } else if (what === 'sign') {
          if (n > 0.25) continue;
          box(g, sx + 3, sy, w - 6, h, '#2a2e36');
          box(e, sx + 4, sy + 1, w - 8, Math.max(1, h - 2), shade('#d9a441', 0.8));
        } else if (what === 'lamp') {
          box(g, sx + 5, sy, 6, h, '#5a4a3a');
          box(e, sx + 6, sy + 1, 4, Math.max(1, h - 2), '#ffd9a0');
        }
      }
    }
}

// ------------------------------------------------------------------ light
// The light of a floor: what is everywhere, and the lamps of each room, which light that room and its walls.
function paintLight(it, deck, reg, size) {
  const S = DECK * TILE;
  const k = size / S;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = rgb(LIGHT[deck].amb);
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  const d = it.decks[deck];
  reg.uses.forEach((use, id) => {
    const kind = kindOf(deck, use);
    const spec = LIGHT[deck].room[kind] || LIGHT[deck].room.plain;
    const [col, power, step] = spec;
    g.save();
    g.beginPath();
    const spots = [];
    let any = null;
    for (let y = 0; y < DECK; y++)
      for (let x = 0; x < DECK; x++) {
        if (reg.region[y * DECK + x] !== id) continue;
        g.rect((x - 0.5) * TILE * k, (y - 0.5) * TILE * k, 2 * TILE * k, 2 * TILE * k);
        any = any || [x, y];
        const tx = d.x0 + x;
        if (tx % step === step >> 1 && y % step === step >> 1 && tileAt(it, tx, y) !== 'K') spots.push([x, y]);
      }
    if (!any) return g.restore();
    if (!spots.length) spots.push(any);
    g.clip();
    const r = (30 + step * 14) * k;
    for (const [x, y] of spots) {
      const cx = (x + 0.5) * TILE * k,
        cy = (y + 0.5) * TILE * k;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${col.join(',')},${power})`);
      grad.addColorStop(0.45, `rgba(${col.join(',')},${power * 0.45})`);
      grad.addColorStop(1, `rgba(${col.join(',')},0)`);
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    g.restore();
  });
  return c;
}

// ------------------------------------------------------------------ the picture of a floor
function buildDeck(it, deck) {
  const S = DECK * TILE;
  const d = it.decks[deck];
  const reg = regionsOf(it, deck);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const glow = document.createElement('canvas');
  glow.width = glow.height = S;
  const e = glow.getContext('2d');
  // Everything is drawn here in the floor's own pixels, from its left edge.
  g.translate(-d.x0 * TILE, 0);
  e.translate(-d.x0 * TILE, 0);
  const roomOf = (id) => {
    const use = reg.uses[id];
    return it.rooms.find((r) => r.use === use && r.deck === deck) || null;
  };
  const kindAt = (x, y) => {
    const id = x >= 0 && y >= 0 && x < DECK && y < DECK ? reg.region[y * DECK + x] : -1;
    return id < 0 ? null : { kind: kindOf(deck, reg.uses[id]), room: reg.uses[id] === 'COMMAND' ? roomOf(id) : null };
  };
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      const t = tileAt(it, d.x0 + x, y);
      if (t === ' ') continue;
      const tx = d.x0 + x;
      const here = kindAt(x, y);
      if (here) {
        floorTile(g, deck, here.kind, tx, y, tx * TILE, y * TILE, here.room);
        continue;
      }
      // A wall or a doorway takes the floor of what is on each side of it, half each.
      const sides = [
        [0, -1, 0, 0, TILE, TILE / 2],
        [0, 1, 0, TILE / 2, TILE, TILE / 2],
        [-1, 0, 0, 0, TILE / 2, TILE],
        [1, 0, TILE / 2, 0, TILE / 2, TILE],
      ];
      // First the whole tile, in case a corner has floor on none of the sides drawn below.
      const first = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
        .map(([dx, dy]) => kindAt(x + dx, y + dy))
        .find(Boolean);
      if (!first) {
        // Solid all round: a space that nobody can go into, filled in. It is drawn as a dark plate.
        g.fillStyle = SOLID[deck];
        g.fillRect(tx * TILE, y * TILE, TILE, TILE);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        if ((tx + y) % 2) g.fillRect(tx * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
        continue;
      }
      floorTile(g, deck, first.kind, tx, y, tx * TILE, y * TILE, first.room);
      for (const [dx, dy, ox, oy, w, h] of sides) {
        const n = kindAt(x + dx, y + dy);
        if (!n) continue;
        g.save();
        g.beginPath();
        g.rect(tx * TILE + ox, y * TILE + oy, w, h);
        g.clip();
        floorTile(g, deck, n.kind, tx, y, tx * TILE, y * TILE, n.room);
        g.restore();
      }
    }
  drawFloorMarks(g, it, deck);
  drawFurniture(g, e, it, deck, reg);
  drawPlants(g, it, deck, reg);
  // The way in from the airlock is marked on the floor.
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) {
      if (tileAt(it, d.x0 + x, y) !== 'A') continue;
      const X = (d.x0 + x) * TILE,
        Y = y * TILE;
      e.fillStyle = '#4a7a3a';
      e.fillRect(X + 2, Y + 2, TILE - 4, 1);
      e.fillRect(X + 2, Y + TILE - 3, TILE - 4, 1);
      e.fillRect(X + 6, Y + 6, 4, 4);
    }
  g.setTransform(1, 0, 0, 1, 0, 0);
  e.setTransform(1, 0, 0, 1, 0, 0);
  paintWalls(g, deck, wallMask(it, deck, reg));
  drawFixtures(g, e, it, deck, reg);
  // The light, laid on over everything, then what shines by itself.
  g.globalCompositeOperation = 'multiply';
  g.imageSmoothingEnabled = true;
  g.drawImage(paintLight(it, deck, reg, S / 2), 0, 0, S, S);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mark(it, deck), 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(glow, 0, 0);
  return canvas;
}

// Where a floor's picture has anything: the multiply of the light fills the whole square, and this takes it back
// to the tiles that are drawn, so that space shows round the floor.
function mark(it, deck) {
  const S = DECK * TILE;
  const d = it.decks[deck];
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  for (let y = 0; y < DECK; y++)
    for (let x = 0; x < DECK; x++) if (tileAt(it, d.x0 + x, y) !== ' ') g.fillRect(x * TILE, y * TILE, TILE, TILE);
  return c;
}

// The pictures of the floors of each base, made when a floor is first seen.
const made = new WeakMap();

// Lay down the picture of a floor of a base.
export function drawBaseDeck(ctx, it, deck) {
  let pics = made.get(it);
  if (!pics || pics.tiles !== it.tiles) {
    pics = { tiles: it.tiles, decks: [] };
    made.set(it, pics);
  }
  if (!pics.decks[deck]) pics.decks[deck] = buildDeck(it, deck);
  ctx.drawImage(pics.decks[deck], it.decks[deck].x0 * TILE, 0);
  // The other floors are made a little later, one at a time, so that going up or down does not stop the game.
  if (!pics.later && pics.decks.filter(Boolean).length < it.decks.length && typeof setTimeout === 'function') {
    pics.later = true;
    const next = () => {
      const k = it.decks.findIndex((d, i) => !pics.decks[i]);
      if (k < 0 || made.get(it) !== pics) return;
      pics.decks[k] = buildDeck(it, k);
      setTimeout(next, 300);
    };
    setTimeout(next, 300);
  }
}
