// How each kind of thing and ship looks: in space, on the map and on the small map.
// What each kind is and does is described in src/sim/kinds.js. A new kind needs an entry in both.
import { COL } from '../config.js';
import { B } from '../sim/balance.js';
import { toWorld, dist, forward } from '../sim/util.js';
import { CREW, PIRATE, FACTIONS, moodOf, enemies } from '../sim/sides.js';
import { THINGS, SHIPS } from '../sim/kinds.js';
import { portsOf } from '../sim/things.js';
import { shipNose, speedOf } from '../sim/ship.js';
import { sprite, rect, bar } from './draw.js';

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
// Which picture a station has: its side's own, or the plain one for a station that stands on its own.
const stationLook = (st) =>
  st.side === CREW ? 'crew' : st.side === PIRATE ? 'pirate' : FACTIONS[st.side] ? st.side : 'free';
const ARM_LOOK = { drifters: 'rust', pirate: 'plum' };
// The lights on the docking arms say how the station treats the crew.
const ARM_LIGHT = { friendly: COL.acid[2], neutral: COL.white, wary: COL.ochre[2], closed: '#1c1c28' };

// Which docking arms have a ship at them, or coming in: 1 for an arm that should be out, 0 for one that is folded.
function armsWanted(st, state) {
  const ports = portsOf(st);
  const want = ports.map(() => 0);
  const reach = (nose) => {
    let best = -1;
    let bestD = 150;
    ports.forEach((p, i) => {
      const d = dist(nose.x, nose.y, p.x, p.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    if (best >= 0) want[best] = 1;
  };
  const ship = state.ship;
  if (ship.docked === st.id || (!ship.docked && speedOf(ship) < B.DOCK_SPEED * 3)) reach(shipNose(ship));
  for (const v of state.vessels) {
    // A visiting ship that is heading for a berth, or lying at one.
    if (!v.legs || !v.legs[0] || v.legs[0].face === undefined) continue;
    const f = forward(v.heading);
    const half = (SHIPS[v.kind].length || 0) / 2;
    reach({ x: v.x + f.x * half, y: v.y + f.y * half });
  }
  return want;
}

// How far out each arm is, from 0 to 1. It is kept between frames in `env.arms`, and follows the game's clock.
function armsNow(st, env) {
  const want = armsWanted(st, env.state);
  const now = env.state.time;
  let kept = env.arms && env.arms.get(st.id);
  if (!kept || now < kept.t) kept = { t: now, out: want.map(() => 0) };
  const step = Math.min(0.1, now - kept.t) / B.ARM_TIME;
  kept.out = kept.out.map((e, i) => e + Math.max(-step, Math.min(step, want[i] - e)));
  kept.t = now;
  if (env.arms) env.arms.set(st.id, kept);
  return kept.out;
}

function drawArms(ctx, st, env) {
  const state = env.state;
  const img = env.img['arm_' + (ARM_LOOK[stationLook(st)] || 'steel')];
  const hostile = enemies(state, CREW, st.side);
  const light = hostile ? (blink(state, 3) ? COL.ember[3] : COL.ember[1]) : ARM_LIGHT[moodOf(state, st.side)];
  const out = armsNow(st, env);
  THINGS.station.ports.forEach((p, i) => {
    const far = Math.hypot(p.x, p.y);
    // The arm slides 12 pixels: folded, its tip is at the ring. Out, it reaches the port.
    const mid = far - 26 + 12 * out[i];
    ctx.save();
    ctx.translate(st.x + (p.x / far) * mid, st.y + (p.y / far) * mid);
    ctx.rotate(Math.atan2(p.x, -p.y));
    ctx.drawImage(img, -11, -12);
    ctx.fillStyle = light;
    ctx.fillRect(-6, -12, 12, 2);
    ctx.restore();
  });
}

// Where the lights at the tips of a station's docking arms are, and their colour.
export function armLights(st, env) {
  const state = env.state;
  const hostile = enemies(state, CREW, st.side);
  const color = hostile ? (blink(state, 3) ? COL.ember[3] : COL.ember[1]) : ARM_LIGHT[moodOf(state, st.side)];
  const out = armsNow(st, env);
  const tips = THINGS.station.ports.map((p, i) => {
    const far = Math.hypot(p.x, p.y);
    const tip = far - 26 + 12 * out[i] + 11;
    return { x: st.x + (p.x / far) * tip, y: st.y + (p.y / far) * tip };
  });
  return { color, tips };
}

function drawStation(ctx, st, env) {
  sprite(ctx, env.img['station_' + stationLook(st)], st.x, st.y, st.heading);
  drawArms(ctx, st, env);
  // Pirate strongholds have their own guns. Everyone else mounts the same turrets as the frigate.
  const pirate = st.side === 'pirate';
  for (const gun of st.guns) {
    if (gun.hp <= 0) continue;
    const p = toWorld(st, gun);
    if (pirate) sprite(ctx, env.img.turret_guard, p.x, p.y, gun.heading);
    else sprite(ctx, env.img.turret_pulse, p.x, p.y, gun.heading, 6, 10.5);
    // Only the guns of an enemy are targets worth a health bar.
    if (env.scan && st.align === 'hostile') hpBar(ctx, p.x, p.y - 14, 16, gun.hp / B.STATION_GUN_HP);
  }
  // The shield shows for a moment when it is hit.
  const since = env.state.time - st.lastHit;
  if (st.shield > 0 && since < 0.6) {
    ctx.globalAlpha = 0.6 * (1 - since / 0.6);
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(st.x, st.y, 100, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // With a target scanner, or while it is being hit, a station shows how its shield and hull are holding.
  if (env.scan || since < 6) {
    bar(ctx, st.x - 30, st.y + 104, 60, st.shield / B.STATION_SHIELD, COL.ion[1], 4);
    bar(ctx, st.x - 30, st.y + 109, 60, st.hp / B.STATION_HP, COL.steel[2], 4);
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
  font.draw(ctx, k.name, p.x + 8, p.y - 8, color);
  font.draw(ctx, aboutStation(k, env), p.x + 8, p.y + 2, COL.dim);
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
    margin: 110,
    draw: spriteOf((wreck) => (wreck.hull === 'hull' ? 'wreck' : 'wreck_' + wreck.hull)),
    mark: markWreck,
    dot: { size: 3, color: () => COL.ochre[2] },
    arrow: () => COL.ochre[2],
  },
  station: {
    margin: 170,
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
