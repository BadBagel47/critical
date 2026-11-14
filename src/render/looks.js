// How each kind of thing and ship looks: in space, on the map and on the small map.
// What each kind is and does is described in src/sim/kinds.js. A new kind needs an entry in both.
import { COL } from '../config.js';
import { B } from '../sim/balance.js';
import { toWorld } from '../sim/util.js';
import { sprite, rect, bar } from './draw.js';

export const ALIGN_COL = { friendly: COL.engineer, neutral: COL.steel[3], hostile: COL.ember[1] };
export const RISK = ['', 'LOW', 'MEDIUM', 'HIGH'];
const risk = (difficulty) => 'BOARDING RISK  ' + RISK[difficulty];
export const hpBar = (ctx, x, y, w, frac) => bar(ctx, x - w / 2, y, w, frac, COL.ember[1], 4);
const blink = (state, rate, offset = 0) => Math.floor(state.time * rate + offset) % 2 === 1;

// ---------- things ----------
// `env` is { img, state, scan }: the sprites, the game, and whether the ship has a target scanner.
function drawStation(ctx, st, env) {
  sprite(ctx, env.img['station_' + st.align], st.x, st.y, st.heading);
  for (const gun of st.guns) {
    if (gun.hp <= 0) continue;
    const p = toWorld(st, gun);
    sprite(ctx, env.img.turret_guard, p.x, p.y, gun.heading);
    if (env.scan) hpBar(ctx, p.x, p.y - 14, 16, gun.hp / B.STATION_GUN_HP);
  }
}

function drawSalvage(ctx, c, env) {
  const ship = env.state.ship;
  if (c.pulled) {
    // The tractor beam.
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  rect(ctx, c.x - 3, c.y - 3, 6, 6, COL.ochre[1], COL.out);
  rect(ctx, c.x - 1, c.y - 1, 2, 2, blink(env.state, 3, c.id) ? COL.ochre[3] : COL.ochre[2]);
}

function drawBuoy(ctx, b, env) {
  ctx.fillStyle = COL.out;
  ctx.fillRect(b.x - 3, b.y - 4, 6, 9);
  ctx.fillStyle = COL.engineer;
  ctx.fillRect(b.x - 2, b.y - 3, 4, 7);
  ctx.fillRect(b.x - 0.5, b.y - 9, 1, 6);
  ctx.fillStyle = blink(env.state, 2) ? COL.white : COL.engineer;
  ctx.fillRect(b.x - 0.5, b.y - 10, 1, 1);
}

// Marks on the big map. `k` is what the map remembers about the thing, `p` where it is on the screen.
function markStation(ctx, font, k, p, env) {
  const color = ALIGN_COL[k.align];
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  rect(ctx, x - 4, y - 4, 9, 9, color, COL.out);
  rect(ctx, x - 2, y - 2, 5, 5, COL.out);
  rect(ctx, x, y, 1, 1, color);
  font.draw(ctx, k.name, p.x + 8, p.y - 8, color);
  const what =
    k.align === 'hostile' ? (env.scan ? risk(3) : 'HOSTILE') : k.shipyard ? 'SHIPYARD' : k.align.toUpperCase();
  font.draw(ctx, what, p.x + 8, p.y + 2, COL.dim);
}
function markWreck(ctx, font, k, p, env) {
  rect(ctx, Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6, COL.ochre[2], COL.out);
  font.draw(ctx, 'WRECK', p.x + 6, p.y - 3, COL.ochre[2]);
  const wreck = env.state.things.find((t) => t.id === k.id);
  if (env.scan && wreck) font.draw(ctx, risk(wreck.difficulty), p.x + 6, p.y + 7, COL.dim);
}
function markPod(ctx, font, k, p) {
  rect(ctx, Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4, COL.ochre[1], COL.out);
  font.draw(ctx, 'CARGO POD', p.x + 5, p.y - 3, COL.ochre[1]);
}

const spriteOf = (name) => (ctx, t, env) =>
  sprite(ctx, env.img[typeof name === 'function' ? name(t) : name], t.x, t.y, t.heading);

//   margin  how far outside the screen it is still drawn
//   draw    how it is drawn in space
//   mark    how it is drawn on the big map, for the kinds the map remembers
//   dot     its size and colour on the small map
//   arrow   the colour of the arrow at the screen edge that points to it, for the kinds that get one
export const THING_LOOK = {
  rock: { margin: 30, draw: spriteOf((rock) => 'rock' + rock.variant) },
  wreck: {
    margin: 100,
    draw: spriteOf('wreck'),
    mark: markWreck,
    dot: { size: 3, color: () => COL.ochre[2] },
    arrow: () => COL.ochre[2],
  },
  station: {
    margin: 130,
    draw: drawStation,
    mark: markStation,
    dot: { size: 4, color: (k) => ALIGN_COL[k.align] },
    arrow: (k) => ALIGN_COL[k.align],
  },
  pod: { margin: 40, draw: spriteOf('pod'), mark: markPod, dot: { size: 2, color: () => COL.ochre[2] } },
  salvage: { margin: 20, draw: drawSalvage },
  buoy: { margin: 20, draw: drawBuoy },
};

// ---------- ships ----------
//   glow     engine glows behind the sprite, in the ship's own pixels
//   exhaust  the particle trail: where it starts, how many a second, how wide and how big
//   bar      width of the health bar. alwaysBar shows it without a target scanner
//   mapSize  size of its mark on the map
//   turrets  it has turrets on the mounts listed for its class, which follow the frigate
const FIGHTER_LOOK = {
  sprite: 'fighter',
  glow: [{ x: 0, y: 14, r: 3.5 }],
  exhaust: { y: 14, rate: 9, width: 4, size: 2 },
  bar: 22,
  mapSize: 3,
};
export const SHIP_LOOK = {
  fighter: FIGHTER_LOOK,
  gunboat: {
    sprite: 'gunboat',
    glow: [{ x: 0, y: 28, r: 5 }],
    exhaust: { y: 28, rate: 14, width: 4, size: 2 },
    bar: 22,
    mapSize: 3,
  },
  cruiser: {
    sprite: 'cruiser',
    glow: [
      { x: -11, y: 84, r: 5 },
      { x: 9, y: 84, r: 5 },
    ],
    exhaust: { y: 84, rate: 26, width: 22, size: 3 },
    bar: 70,
    alwaysBar: true,
    mapSize: 6,
    turrets: true,
  },
};
// A class without a look of its own is drawn as a fighter, so that new data never breaks the screen.
export const lookOf = (vessel) => SHIP_LOOK[vessel.kind] || FIGHTER_LOOK;
