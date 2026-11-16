// How each kind of thing and ship looks: in space, on the map and on the small map.
// What each kind is and does is described in src/sim/kinds.js. A new kind needs an entry in both.
import { COL } from '../config.js';
import { FACTIONS, moodOf } from '../sim/sides.js';
import { sprite, rect, bar } from './draw.js';
import { drawBase, baseLights } from './base.js';

export const ALIGN_COL = { friendly: COL.engineer, neutral: COL.steel[3], hostile: COL.ember[1] };
// The colour each side flies, and the colour for what a side thinks of the crew.
export const SIDE_COL = { charter: COL.ochre[2], wardens: COL.captain, drifters: '#b98562', pirate: COL.ember[1] };
export const MOOD_COL = {
  friendly: COL.engineer,
  neutral: COL.steel[3],
  wary: COL.ochre[2],
  closed: COL.ember[2],
  hostile: COL.ember[1],
};
export const RISK = ['', 'LOW', 'MEDIUM', 'HIGH'];
const risk = (difficulty) => 'BOARDING RISK  ' + RISK[difficulty];
export const hpBar = (ctx, x, y, w, frac, color = COL.ember[1]) => bar(ctx, x - w / 2, y, w, frac, color, 4);
const blink = (state, rate, offset = 0) => Math.floor(state.time * rate + offset) % 2 === 1;

// ---------- things ----------
// `env` is { img, state, scan }: the sprites, the game, and whether the ship has a target scanner.
// A station is a standard base, see render/base.js.
const drawStation = (ctx, st, env) => drawBase(ctx, st, env);
// Where the lights of a station are, and their colour, for the light they throw on what is near.
export const armLights = (st, env) => baseLights(env.state, st);

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
  if (c.ore) {
    // A lump of ore: grey rock with a glint of metal.
    rect(ctx, c.x - 3, c.y - 2, 6, 5, '#5d5a52', COL.out);
    rect(ctx, c.x - 2, c.y - 3, 4, 1, '#7a766a');
    rect(ctx, c.x, c.y - 1, 2, 2, blink(env.state, 3, c.id) ? '#9be4ee' : '#c7b98c');
    return;
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

// The line under a station's name on the map: whose it is, what it offers and how it treats the crew.
const MOOD_NOTE = { wary: 'WARY OF YOU', closed: 'CLOSED TO YOU' };
function aboutStation(k, env) {
  if (k.align === 'hostile') return env.scan ? risk(3) : 'HOSTILE';
  const owner = FACTIONS[k.side] ? FACTIONS[k.side].short : null;
  const note = MOOD_NOTE[moodOf(env.state, k.side)];
  const parts = [owner, k.shipyard ? 'SHIPYARD' : null, note].filter(Boolean);
  return parts.length ? parts.join('  ·  ') : k.align.toUpperCase();
}

// Marks on the big map. `k` is what the map remembers about the thing, `p` where it is on the screen.
function markStation(ctx, font, k, p, env) {
  const color = ALIGN_COL[k.align];
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  rect(ctx, x - 4, y - 4, 9, 9, color, COL.out);
  rect(ctx, x - 2, y - 2, 5, 5, COL.out);
  rect(ctx, x, y, 1, 1, color);
  return {
    reach: 5,
    lines: [
      [k.name, color],
      [aboutStation(k, env), COL.dim],
    ],
  };
}
function markWreck(ctx, font, k, p, env) {
  rect(ctx, Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6, COL.ochre[2], COL.out);
  const wreck = env.state.things.find((t) => t.id === k.id);
  const lines = [['WRECK', COL.ochre[2]]];
  if (env.scan && wreck) lines.push([risk(wreck.difficulty), COL.dim]);
  return { reach: 4, lines };
}
function markPod(ctx, font, k, p) {
  rect(ctx, Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4, COL.ochre[1], COL.out);
  return { reach: 3, lines: [['CARGO POD', COL.ochre[1]]] };
}

// The two lamps on the sides of a pod say how it is: a slow green blink when it can be opened, a quick double
// red one while its alarm sounds, and nothing when it has been emptied. The rhythms differ as well as the
// colours, for those who cannot tell red from green. `podLamp` gives the colour, or null when they are dark.
export function podLamp(pod, time) {
  if (pod.looted) return null;
  if (pod.alarm > 0) {
    const beat = time % 1;
    return beat < 0.15 || (beat > 0.3 && beat < 0.45) ? COL.ember[2] : null;
  }
  return time % 2 < 1 ? COL.acid[2] : null;
}
function drawPod(ctx, pod, env) {
  sprite(ctx, env.img.pod, pod.x, pod.y, pod.heading);
  const lamp = podLamp(pod, env.state.time + (pod.id % 7) * 0.13);
  ctx.save();
  ctx.translate(pod.x, pod.y);
  ctx.rotate(pod.heading);
  ctx.fillStyle = lamp || '#1c1c28';
  ctx.fillRect(-7, -2, 2, 4);
  ctx.fillRect(5, -2, 2, 4);
  ctx.restore();
}

const spriteOf = (name) => (ctx, t, env) =>
  sprite(ctx, env.img[typeof name === 'function' ? name(t) : name], t.x, t.y, t.heading);

//   margin  how far outside the screen it is still drawn
//   draw    how it is drawn in space
//   image   its own picture, which the light of the star is laid over
//   mark    how it is drawn on the big map, for the kinds the map remembers. It draws the mark itself and
//           gives back the lines of text that belong to it, which the map puts where there is room
//   dot     its size and colour on the small map
//   arrow   the colour of the arrow at the screen edge that points to it, for the kinds that get one
export const THING_LOOK = {
  rock: {
    margin: 30,
    draw: spriteOf((rock) => 'rock' + rock.variant),
    image: (rock, env) => env.img['rock' + rock.variant],
  },
  wreck: {
    margin: 110,
    draw: spriteOf((wreck) => (wreck.hull === 'hull' ? 'wreck' : 'wreck_' + wreck.hull)),
    image: (wreck, env) => env.img[wreck.hull === 'hull' ? 'wreck' : 'wreck_' + wreck.hull],
    mark: markWreck,
    dot: { size: 3, color: () => COL.ochre[2] },
    arrow: () => COL.ochre[2],
  },
  station: {
    margin: 330,
    draw: drawStation,
    mark: markStation,
    dot: { size: 4, color: (k) => ALIGN_COL[k.align] },
    arrow: (k) => ALIGN_COL[k.align],
  },
  pod: {
    margin: 40,
    draw: drawPod,
    image: (pod, env) => env.img.pod,
    mark: markPod,
    dot: { size: 2, color: () => COL.ochre[2] },
  },
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
  freighter: {
    sprite: 'freighter',
    glow: [
      { x: -12, y: 66, r: 4 },
      { x: 4, y: 66, r: 5 },
    ],
    exhaust: { y: 66, rate: 12, width: 22, size: 2 },
    bar: 40,
    mapSize: 4,
  },
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
// A ship is drawn in the colours of its side when there is a picture of that, and as the plain class otherwise.
export function spriteOfVessel(vessel, img) {
  const base = lookOf(vessel).sprite;
  return img[base + '_' + vessel.side] || img[base];
}
