// The standard base seen from space (F-244, D-217): three low domes on top of each other, a closed disc out to
// the ring that turns, four ports on the ring, the bridge from the airlock, cargo arms under the ring, the
// building dock of a shipyard, ten places for guns and the large gun. The lamps say how the base sees the crew.
// Rules R-1151 to R-1164 and R-1169.
//
// What does not change is drawn once for each base and kept: the disc, the arms, the domes with their light and
// shadow from the star, the bridge and the building dock. The ring is kept as a picture of its own and turned,
// and the windows, lamps and guns are drawn every frame.
import { COL } from '../config.js';
import { B } from '../sim/balance.js';
import { BASE } from '../sim/kinds.js';
import { CREW, PIRATE, FACTIONS, moodOf, enemies } from '../sim/sides.js';
import { defenseOf, gunSlots } from '../sim/stations.js';
import { toWorld } from '../sim/util.js';
import { sprite, bar } from './draw.js';

const [RING0, RING1] = BASE.ring;
const [R0, R1, R2] = BASE.domes;
const SIZE = 680;
const MID = SIZE / 2;
// How each side's bases look: the plates of the domes, darker and lighter, and the trim.
const LOOK = {
  free: { plate: [74, 78, 92], trim: '#8a8ea0' },
  charter: { plate: [92, 80, 66], trim: '#b8752c' },
  wardens: { plate: [60, 72, 98], trim: '#4f7fc8' },
  drifters: { plate: [96, 70, 58], trim: '#b98562' },
  pirate: { plate: [78, 58, 82], trim: '#8a4a7a' },
  crew: { plate: [62, 84, 86], trim: '#58b0a0' },
};
const lookOf = (st) =>
  LOOK[st.side === CREW ? 'crew' : st.side === PIRATE ? 'pirate' : FACTIONS[st.side] ? st.side : 'free'];
// The colour of the lamps: red for an enemy, white neutral, green friendly, and a bluer turquoise on the crew's
// own base, so that it cannot be taken for a friendly one (R-1159, R-1160).
export const ATTITUDE = {
  hostile: '#ff4637',
  neutral: '#d7e1f0',
  friendly: '#5ce020',
  wary: COL.ochre[2],
  own: '#20d4f0',
  closed: '#3a3a48',
};
// As the lights on the docking arms used to (R-172): green friendly, white neutral, yellow wary, out when closed and
// red for an enemy.
export function attitudeOf(state, st) {
  if (st.side === CREW) return ATTITUDE.own;
  if (enemies(state, CREW, st.side)) return ATTITUDE.hostile;
  return ATTITUDE[moodOf(state, st.side)] || ATTITUDE.neutral;
}
// Which of the 48 lamps on the ring is the dim one right now: it goes round once every eight seconds (R-1159).
export const dimLamp = (time) => Math.floor(((time / 8) % 1) * 48);
// What is painted on a base: ST8 on one the crew has taken, and nothing on any other (R-1161).
export const paintedName = (st) => (st.side === CREW ? 'ST8' : null);
// One window of a floor: whether it is lit, its colour and how strongly it shines. `seed` is new each time the crew
// arrives (R-1158). Red and still in lockdown, slowly breathing red in an alarm (R-1151).
const TIER_WARM = [
  [255, 170, 90],
  [255, 226, 170],
  [140, 200, 255],
];
export function windowLook(st, tier, i, seed, time, hostile) {
  if (hash(st.id * 7 + tier, i, seed) <= 0.22) return null;
  const level = 0.6 + 0.4 * hash(i, tier, seed + 1);
  const alarm = !!st.interior && st.interior.mood === 'alarm';
  if (alarm) return { rgb: [255, 70, 55], alpha: level * (0.55 + 0.45 * Math.sin((time * Math.PI * 2) / 2)) };
  if (hostile) return { rgb: [255, 70, 55], alpha: level * 0.8 };
  return { rgb: TIER_WARM[tier], alpha: level };
}
const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
// A number that is always the same for the same arguments, from 0 to 1.
const hash = (a, b, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---------- what is kept ----------
const kept = new Map();
function canvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}
// Which way the light of the star comes from, in the base's own frame: from the base toward the middle of the
// system, where the star is.
function lightOf(st) {
  const d = Math.hypot(st.x, st.y) || 1;
  const wx = -st.x / d,
    wy = -st.y / d;
  const c = Math.cos(-st.heading),
    s = Math.sin(-st.heading);
  return { x: wx * c - wy * s, y: wx * s + wy * c };
}

// A dome: lit on the side toward the star and dark away from it, with seams.
function dome(g, r, plate, light, seams) {
  const grad = g.createRadialGradient(MID + light.x * r * 0.45, MID + light.y * r * 0.45, r * 0.1, MID, MID, r * 1.05);
  grad.addColorStop(0, rgb(plate, 1.55));
  grad.addColorStop(0.55, rgb(plate, 1.05));
  grad.addColorStop(1, rgb(plate, 0.55));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(MID, MID, r, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 1;
  for (let k = 0; k < seams; k++) {
    const a = (k / seams) * Math.PI * 2;
    g.beginPath();
    g.moveTo(MID + Math.cos(a) * r * 0.25, MID + Math.sin(a) * r * 0.25);
    g.lineTo(MID + Math.cos(a) * r, MID + Math.sin(a) * r);
    g.stroke();
  }
  for (const k of [0.45, 0.72]) {
    g.beginPath();
    g.arc(MID, MID, r * k, 0, 7);
    g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.beginPath();
  g.arc(MID, MID, r, 0, 7);
  g.stroke();
}
// The shadow that a dome throws on the one under it, away from the star.
function shadowOf(g, r, under, light) {
  g.save();
  g.beginPath();
  g.arc(MID, MID, under, 0, 7);
  g.clip();
  g.fillStyle = 'rgba(0,0,0,0.38)';
  g.beginPath();
  g.arc(MID - light.x * 7, MID - light.y * 7, r + 2, 0, 7);
  g.fill();
  g.restore();
}
const plank = (g, x0, y0, x1, y1, w, fill) => {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.save();
  g.translate(MID + x0, MID + y0);
  g.rotate(a);
  g.fillStyle = fill;
  g.fillRect(0, -w / 2, Math.hypot(x1 - x0, y1 - y0), w);
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.strokeRect(0, -w / 2, Math.hypot(x1 - x0, y1 - y0), w);
  g.restore();
};

function buildBody(st) {
  const c = canvas();
  const g = c.getContext('2d');
  const look = lookOf(st);
  const light = lightOf(st);
  // The cargo arms, straight out under the ring (R-1153). The arm to the right is the building dock's at a base with
  // a shipyard.
  BASE.arms.forEach((a, k) => {
    if (st.shipyard && k === 1) return;
    plank(g, a.x * 0.8, a.y * 0.8, a.x, a.y, 16, '#3a3c48');
    plank(g, a.x * 0.8, a.y * 0.8, a.x, a.y, 4, '#6a5a3a');
  });
  // The closed disc from the basement out to the ring (R-1152).
  g.fillStyle = rgb(look.plate, 0.45);
  g.beginPath();
  g.arc(MID, MID, RING0 + 1, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    g.beginPath();
    g.moveTo(MID + Math.cos(a) * R0, MID + Math.sin(a) * R0);
    g.lineTo(MID + Math.cos(a) * RING0, MID + Math.sin(a) * RING0);
    g.stroke();
  }
  // The three domes, the basement widest and the top smallest, each throwing its shadow on the one below (R-1156).
  dome(
    g,
    R0,
    look.plate.map((v) => v * 0.85),
    light,
    24,
  );
  // Hazard stripes and grime on the basement, the dirty industry.
  g.fillStyle = 'rgba(200,150,60,0.35)';
  for (let k = 0; k < 40; k++) {
    const a = hash(st.id, k) * Math.PI * 2;
    const r = R1 + 4 + hash(k, st.id, 3) * (R0 - R1 - 8);
    g.fillRect(MID + Math.cos(a) * r, MID + Math.sin(a) * r, 2, 2);
  }
  shadowOf(g, R1, R0, light);
  dome(
    g,
    R1,
    look.plate.map((v) => v * 1.15),
    light,
    16,
  );
  shadowOf(g, R2, R1, light);
  dome(
    g,
    R2,
    look.plate.map((v) => v * 0.7),
    light,
    12,
  );
  // The bridge from the airlock on the middle floor out to the ring (R-1155).
  const b = BASE.bridge;
  plank(
    g,
    Math.cos(b) * (R1 - 4),
    Math.sin(b) * (R1 - 4),
    Math.cos(b) * (RING0 + 2),
    Math.sin(b) * (RING0 + 2),
    12,
    '#4a4d5c',
  );
  // A building dock to the right, with beams, cranes and a gangway over the ring (R-1169).
  if (st.shipyard) {
    for (const y of [-26, 26]) plank(g, RING0 - 6, y, RING1 + 112, y, 7, '#5a5d6c');
    for (const x of [RING1 + 20, RING1 + 60, RING1 + 100]) plank(g, x, -26, x, 26, 3, '#4a4d5c');
    plank(g, R1 - 4, 0, RING1 + 24, 0, 6, '#6a6d7c');
    g.fillStyle = COL.ochre[1];
    for (const x of [RING1 + 40, RING1 + 84]) g.fillRect(MID + x - 4, MID - 34, 8, 8);
  }
  // On a base the crew has taken, ST8 is painted on the middle dome between two ports, away from the bridge
  // (R-1161). The paint lies under the dome's shadow, so it is drawn before the light is laid on.
  if (paintedName(st)) {
    g.save();
    g.fillStyle = '#58b0a0';
    g.font = 'bold 30px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const letters = paintedName(st).split('');
    letters.forEach((ch, i) => {
      const a = Math.PI / 2 - (i - 1) * 0.2;
      g.save();
      g.translate(MID + Math.cos(a) * (R1 - 24), MID + Math.sin(a) * (R1 - 24));
      g.rotate(a - Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
    });
    g.restore();
  }
  return c;
}

// The ring: a band with seams and the four ports, drawn the way up it is when it has not turned.
function buildRing(st) {
  const c = canvas();
  const g = c.getContext('2d');
  const look = lookOf(st);
  g.lineWidth = RING1 - RING0;
  g.strokeStyle = rgb(look.plate, 1.1);
  g.beginPath();
  g.arc(MID, MID, (RING0 + RING1) / 2, 0, 7);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  for (const r of [RING0, RING1]) {
    g.beginPath();
    g.arc(MID, MID, r, 0, 7);
    g.stroke();
  }
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2 + Math.PI / 48;
    g.beginPath();
    g.moveTo(MID + Math.cos(a) * RING0, MID + Math.sin(a) * RING0);
    g.lineTo(MID + Math.cos(a) * RING1, MID + Math.sin(a) * RING1);
    g.stroke();
  }
  g.strokeStyle = look.trim;
  g.lineWidth = 2;
  for (const p of BASE.ports) {
    const a = Math.atan2(p.y, p.x);
    g.beginPath();
    g.arc(MID, MID, RING1 - 1, a - 0.06, a + 0.06);
    g.stroke();
  }
  return c;
}

function keptFor(st) {
  const key = [st.side, st.shipyard ? 1 : 0, Math.round(st.x), Math.round(st.y), st.heading].join(':');
  let k = kept.get(st.id);
  if (!k || k.key !== key) {
    k = { key, body: buildBody(st), ring: buildRing(st), seen: -1e9, seed: 0 };
    kept.set(st.id, k);
  }
  return k;
}

// ---------- what is drawn every frame ----------
// The windows round every floor (R-1158): most lit, some dark, mixed anew each time the crew arrives. They are
// red and still in lockdown, and breathe slowly red in an alarm (R-1151).
function drawWindows(ctx, st, k, time, hostile) {
  // The top has wide windows, for the view (R-1158).
  const TIERS = [
    { r: R0 - 7, gap: 14, w: 3 },
    { r: R1 - 6, gap: 12, w: 3 },
    { r: R2 - 5, gap: 14, w: 7 },
  ];
  TIERS.forEach((t, tier) => {
    const n = Math.floor((Math.PI * 2 * t.r) / t.gap);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const look = windowLook(st, tier, i, k.seed, time, hostile);
      if (!look) continue;
      ctx.save();
      ctx.rotate(a);
      ctx.globalAlpha = look.alpha;
      ctx.fillStyle = `rgb(${look.rgb.join(',')})`;
      ctx.fillRect(t.r - 1, -t.w / 2, 2, t.w);
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}

// The 48 lamps on the ring, the lamps of the ports and the beacon on top, in the colour of how the base sees the
// crew. One lamp at a time is dim, and the dim one goes round once every eight seconds (R-1159).
function drawLamps(ctx, st, colour, time) {
  const dim = dimLamp(time);
  ctx.save();
  ctx.rotate(st.ring || 0);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x = Math.cos(a) * ((RING0 + RING1) / 2),
      y = Math.sin(a) * ((RING0 + RING1) / 2);
    ctx.globalAlpha = i === dim ? 0.25 : 1;
    ctx.fillStyle = colour;
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    ctx.globalAlpha = i === dim ? 0.05 : 0.22;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of BASE.ports) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(p.x * 0.985, p.y * 0.985, 3, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  // The beacon on top.
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 2);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(0, -R2 * 0.55, 3.5, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The tips of the cargo arms.
  BASE.arms.forEach((a, i) => {
    if (st.shipyard && i === 1) return;
    ctx.fillStyle = colour;
    ctx.fillRect(a.x - 2, a.y - 2, 4, 4);
  });
}

// Empty mounts on the places where no gun has been bought (R-1163). The place of the large gun is a shut hatch
// until it is bought (R-1164). Drawn in the base's own frame.
function drawMounts(ctx, st) {
  const live = gunSlots(st);
  for (const p of BASE.guns) {
    if (live.includes(p)) continue;
    ctx.fillStyle = '#20222a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.heavy ? 7 : 5, 0, 7);
    ctx.fill();
  }
  if (!defenseOf(st).cannon) {
    ctx.fillStyle = '#20222a';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = '#3a3c48';
    ctx.fillRect(-8, -8, 7, 16);
    ctx.fillRect(1, -8, 7, 16);
  }
}
// The guns that are there, each turned its own way.
function drawGuns(ctx, st, env) {
  const pirate = st.side === PIRATE;
  for (const gun of st.guns) {
    if (gun.hp <= 0) continue;
    const p = toWorld(st, gun);
    const big = gun.cannon ? 2 : gun.heavy ? 1.5 : 1;
    ctx.fillStyle = '#20222a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 * big, 0, 7);
    ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(big, big);
    if (pirate) sprite(ctx, env.img.turret_guard, 0, 0, gun.heading);
    else sprite(ctx, env.img.turret_pulse, 0, 0, gun.heading, 6, 10.5);
    ctx.restore();
  }
}

export function drawBase(ctx, st, env) {
  const state = env.state;
  const k = keptFor(st);
  // The windows are mixed anew when the crew comes back after a while away.
  if (state.time - k.seen > 2 || state.time < k.seen) k.seed = Math.floor(state.time * 7) + st.id;
  k.seen = state.time;
  const hostile = enemies(state, CREW, st.side);
  const colour = attitudeOf(state, st);
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate(st.heading);
  ctx.save();
  ctx.rotate(st.ring || 0);
  ctx.drawImage(k.ring, -MID, -MID);
  ctx.restore();
  ctx.drawImage(k.body, -MID, -MID);
  // The docking tube is out at the port where the frigate lies, and at the building dock (R-1155).
  if (state.ship.docked === st.id) {
    const nose = toWorld({ x: 0, y: 0, heading: -st.heading }, { x: state.ship.x - st.x, y: state.ship.y - st.y });
    const a = Math.atan2(nose.y, nose.x);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = '#5a5d6c';
    ctx.fillRect(RING0 - 2, -5, RING1 - RING0 + 10, 10);
    ctx.restore();
  }
  drawWindows(ctx, st, k, state.time, hostile);
  drawLamps(ctx, st, colour, state.time);
  drawMounts(ctx, st);
  ctx.restore();
  drawGuns(ctx, st, env);
  // The shield shows for a moment when it is hit, and faintly all the time where one has been bought.
  const since = state.time - st.lastHit;
  if (st.shield > 0 && (since < 0.6 || defenseOf(st).shield)) {
    ctx.globalAlpha = since < 0.6 ? 0.6 * (1 - since / 0.6) : 0.08;
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(st.x, st.y, RING1 + 18, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (env.scan || since < 6) {
    bar(ctx, st.x - 30, st.y + RING1 + 26, 60, st.shield / B.STATION_SHIELD, COL.ion[1], 4);
    bar(ctx, st.x - 30, st.y + RING1 + 31, 60, st.hp / B.STATION_HP, COL.steel[2], 4);
  }
}

// Where the lamps of a base throw their light in space, and in what colour, for the light that falls on what is
// near: the ports and the tips of the cargo arms.
export function baseLights(state, st) {
  const colour = attitudeOf(state, st);
  const ring = BASE.ports.map((p) => {
    const c = Math.cos(st.ring || 0),
      s = Math.sin(st.ring || 0);
    return toWorld(st, { x: p.x * c - p.y * s, y: p.x * s + p.y * c });
  });
  const arms = BASE.arms.filter((a, i) => !(st.shipyard && i === 1)).map((a) => toWorld(st, a));
  return { color: colour, tips: [...ring, ...arms] };
}
