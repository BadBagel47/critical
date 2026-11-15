// The space view: world, ships, shots and effects. Used by the Captain and Gunner posts.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B, SHIP_GEOM, WING_MOUNTS } from '../sim/balance.js';
import { SHIPS } from '../sim/kinds.js';
import { nodeStatus, dockCandidate, shipNose, speedOf } from '../sim/ship.js';
import { dockTargets, portsOf } from '../sim/things.js';
import { isVisible, visionSources } from '../sim/map.js';
import { playerById } from '../sim/players.js';
import { has, level, shieldMax, dockShieldMax, jumpCharge } from '../sim/upgrades.js';
import { toWorld, dist, headingTo } from '../sim/util.js';
import { sprite, dashed, brackets } from './draw.js';
import { drawNebula, drawRipples } from './effects.js';
import { THING_LOOK, lookOf, spriteOfVessel, hpBar, SIDE_COL, armLights } from './looks.js';
import { CREW, PIRATE, enemies } from '../sim/sides.js';

// Three layers of stars that move at different speeds, always the same ones.
const STARS = (() => {
  let seed = 12345;
  const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const layers = [
    { f: 0.12, count: 70, color: '#2a2b40' },
    { f: 0.28, count: 50, color: '#55587a' },
    { f: 0.5, count: 26, color: '#a9adc8' },
  ];
  return layers.map((layer, i) => ({
    f: layer.f,
    stars: Array.from({ length: layer.count }, () => ({
      x: r() * VIEW_W,
      y: r() * VIEW_H,
      c: layer.color,
      big: i === 2 && r() < 0.25,
    })),
  }));
})();
const mod = (v, m) => ((v % m) + m) % m;
const circle = (ctx, x, y, r) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
};
const line = (ctx, x0, y0, x1, y1) => {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
};

// `fx` adds the sector's cloud layer and, right after a jump, stretches the stars into streaks.
export function drawStars(ctx, cam, fx = null, sector = 0) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (fx) drawNebula(ctx, fx, sector, cam);
  const warp = fx ? fx.warp : 0;
  for (const layer of STARS) {
    for (const s of layer.stars) {
      const x = Math.floor(mod(s.x - cam.x * layer.f, VIEW_W));
      const y = Math.floor(mod(s.y - cam.y * layer.f, VIEW_H));
      ctx.fillStyle = s.c;
      ctx.fillRect(x, y, 1, 1);
      if (warp > 0) {
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, 1, Math.round(warp * 90 * layer.f * 2));
        ctx.globalAlpha = 1;
      }
      if (s.big) {
        ctx.fillStyle = '#55587a';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = s.c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

// ---------- shots ----------
// Shots are coloured by who fired them: the crew, its Darts, the pirates, and everyone else.
const BOLT_COL = {
  crew: COL.ochre,
  dart: COL.ion,
  pirate: COL.acid,
  other: [COL.steel[1], COL.steel[2], COL.steel[3], '#ffffff'],
};
const boltKind = (b) => (b.side === CREW ? (b.small ? 'dart' : 'crew') : b.side === PIRATE ? 'pirate' : 'other');
function drawBolt(ctx, b) {
  const k = b.small ? 0.6 : 1;
  const col = BOLT_COL[boltKind(b)];
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(headingTo(b.vx, b.vy));
  // A soft glow around every shot.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = b.small ? col[1] : col[2];
  ctx.beginPath();
  ctx.ellipse(0, 1, 4 * k, 9 * k, 0, 0, 7);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = col[1];
  ctx.fillRect(-1, 0, 2, 6 * k);
  ctx.fillStyle = col[3];
  ctx.fillRect(-1, -4 * k, 2, 5 * k);
  ctx.restore();
}

function drawBeam(ctx, b) {
  const u = b.t / b.dur;
  ctx.globalAlpha = 1 - u;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = COL.ion[0];
  ctx.lineWidth = 22 * (1 - u);
  line(ctx, b.x0, b.y0, b.x1, b.y1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = COL.ion[1];
  ctx.lineWidth = 7 * (1 - u * 0.5);
  line(ctx, b.x0, b.y0, b.x1, b.y1);
  ctx.strokeStyle = COL.ion[3];
  ctx.lineWidth = 2;
  line(ctx, b.x0, b.y0, b.x1, b.y1);
  ctx.globalAlpha = 1;
}

function drawRocket(ctx, r, img) {
  const tail = toWorld(r, { x: 0, y: 7 });
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COL.ochre[2];
  circle(ctx, tail.x, tail.y, 2.5);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprite(ctx, img.rocket, r.x, r.y, r.heading);
}

function drawProbe(ctx, p) {
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = COL.ion[1];
  circle(ctx, p.x, p.y, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = COL.ion[3];
  ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
}

// What the game itself asks to have shown: the core of an explosion, the jump ring, a hit.
function drawEffect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    // The bright core of an explosion. Sparks, smoke and debris come from the particle system.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, 1 - u * 1.8);
    ctx.fillStyle = '#fff3c4';
    circle(ctx, f.x, f.y, f.size * (0.3 + u * 0.5));
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 0.7 - u);
    ctx.fillStyle = COL.ember[1];
    circle(ctx, f.x, f.y, f.size * (0.5 + u * 0.7));
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else if (f.type === 'jump' || f.type === 'warp') {
    // The crew's own jump is a wide ring. Another ship jumping in or out is a small one.
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 3;
    circle(ctx, f.x, f.y, f.type === 'jump' ? 20 + u * 260 : 6 + u * 70);
    ctx.stroke();
  } else {
    const s = f.type === 'shield' ? 5 : 3;
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = f.type === 'shield' ? COL.ion[2] : COL.ochre[3];
    ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x - 0.5, f.y - 0.5, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------- the frigate ----------
// Drawn in the ship's own pixels: the engine flames, the hull, the upgrades that show, and what is charging.
function drawHull(ctx, state, img) {
  const ship = state.ship;
  const th = Math.max(0, ship.throttle);
  if (th > 0.02 && !ship.docked) {
    const len = (3 + th * 9 + Math.random() * 2) * (ship.boosting ? 2.2 : 1);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COL.ion[1];
    circle(ctx, 0, 52, 5 + th * 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (const x of [-8, 4]) {
      ctx.fillStyle = COL.ion[1];
      ctx.fillRect(x, 50, 4, len);
      ctx.fillStyle = COL.ion[3];
      ctx.fillRect(x + 1, 50, 2, len * 0.6);
    }
  }
  ctx.drawImage(img.frigate, -36, -54);
  // Bought upgrades are drawn on top of the bare hull.
  for (const m of ['armor', 'emit', 'bay', 'rockets', 'heavy'])
    if (has(ship, m)) ctx.drawImage(img['mod_' + m], -36, -54);
  if (ship.charge > 0) {
    ctx.globalAlpha = 0.3 + ship.charge * 0.6;
    ctx.fillStyle = COL.ion[2];
    circle(ctx, 0, -52, 2 + ship.charge * 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (state.jump) {
    const u = state.jump.t / jumpCharge(ship);
    ctx.globalAlpha = 0.25 + u * 0.5;
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 60 - u * 14, 78 - u * 14, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// The shield shows when it is hit, and faintly all the time with shield emitters installed.
function drawShield(ctx, state, fx) {
  const ship = state.ship;
  const since = state.time - ship.lastHit;
  const emitters = has(ship, 'emit') && ship.shield > 0;
  const hit = since < 0.45 && ship.shield > 0;
  if (hit || emitters) {
    const flash = since < 0.45 ? 0.7 * (1 - since / 0.45) : 0;
    const steady = emitters ? 0.12 + 0.1 * (ship.shield / shieldMax(ship)) : 0;
    ctx.globalAlpha = Math.max(flash, steady);
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 44, 62, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha *= 0.15;
    ctx.fillStyle = COL.ion[2];
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (fx && ship.shield > 0) drawRipples(ctx, fx);
  // The extra shield that a docked ship is lent is a second, wider ring.
  if (ship.dockShield > 0) {
    ctx.globalAlpha = 0.15 + 0.25 * (ship.dockShield / dockShieldMax(ship));
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 50, 68, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawShip(ctx, state, img, fx) {
  const ship = state.ship;
  const inShipSpace = (draw) => {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.heading);
    draw();
    ctx.restore();
  };
  inShipSpace(() => drawHull(ctx, state, img));
  const mounts = [SHIP_GEOM.turret, ...(has(ship, 'twin') ? WING_MOUNTS : [])];
  for (const mount of mounts) {
    const p = toWorld(ship, mount);
    sprite(ctx, img.turret_pulse, p.x, p.y, ship.turretAngle, 6, 10.5);
  }
  // Sparks from critical parts of the ship.
  for (const n of ship.nodes) {
    if (nodeStatus(n.hp) !== 'critical' || Math.random() > 0.3) continue;
    const p = toWorld(ship, n);
    ctx.fillStyle = Math.random() < 0.5 ? COL.ochre[3] : COL.ember[1];
    ctx.fillRect(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, 1, 1);
  }
  inShipSpace(() => drawShield(ctx, state, fx));
}

// ---------- other ships ----------
function drawVessel(ctx, v, env) {
  const look = lookOf(v);
  const c = SHIPS[v.kind];
  const ship = env.state.ship;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = v.side === PIRATE ? COL.ember[1] : COL.ion[1];
  for (const g of look.glow) {
    const p = toWorld(v, g);
    circle(ctx, p.x, p.y, g.r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  sprite(ctx, spriteOfVessel(v, env.img), v.x, v.y, v.heading);
  if (look.turrets) {
    for (const mount of c.guns) {
      const m = toWorld(v, mount);
      sprite(ctx, env.img.turret_guard, m.x, m.y, headingTo(ship.x - m.x, ship.y - m.y));
    }
  }
  // Enemies show their health to a ship with a target scanner. Others only show that they have been hurt.
  const y = v.y - c.radius - 12;
  if (!enemies(env.state, v.side, CREW)) {
    if (v.hp < v.hpMax) hpBar(ctx, v.x, y, look.bar, v.hp / v.hpMax, SIDE_COL[v.side] || COL.steel[3]);
  } else if (env.scan || look.alwaysBar) hpBar(ctx, v.x, y, look.bar, v.hp / v.hpMax);
  if (!env.aimHelp) return;
  // The targeting computer marks where a shot fired now would meet the ship.
  const t = dist(v.x, v.y, ship.x, ship.y) / B.BOLT_SPEED;
  const lx = v.x + (v.vx - ship.vx) * t;
  const ly = v.y + (v.vy - ship.vy) * t;
  ctx.strokeStyle = COL.ochre[2];
  ctx.lineWidth = 1;
  circle(ctx, lx, ly, 4);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  line(ctx, v.x, v.y, lx, ly);
  ctx.globalAlpha = 1;
}

function drawDart(ctx, d, img) {
  const tail = toWorld(d, { x: 0, y: 9 });
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COL.ion[1];
  circle(ctx, tail.x, tail.y, 2.5);
  ctx.fill();
  ctx.globalAlpha = 1;
  sprite(ctx, img.dart, d.x, d.y, d.heading);
}

// ---------- help for the crew ----------
// Docking help is returned so the HUD can show the matching prompt.
export function dockingInfo(state) {
  const ship = state.ship;
  const none = { docked: false, w: null, p: null, d: 0, nose: null, ready: false, tooFast: false };
  if (ship.docked) return { ...none, docked: true };
  const nose = shipNose(ship);
  let best = null;
  for (const t of dockTargets(state)) {
    for (const p of portsOf(t)) {
      const d = dist(nose.x, nose.y, p.x, p.y);
      if (d < B.DOCK_GUIDE_RANGE && (!best || d < best.d)) best = { ...none, w: t, p, d, nose };
    }
  }
  if (!best) return null;
  best.ready = dockCandidate(state) === best.w;
  best.tooFast = best.d < B.DOCK_RANGE * 2.5 && speedOf(ship) > B.DOCK_SPEED;
  return best;
}

// An arrow at the screen edge for something that is off the screen.
function edgeMarker(ctx, font, cam, x, y, color, text) {
  const sx = x - cam.x + VIEW_W / 2;
  const sy = y - cam.y + VIEW_H / 2;
  if (sx > 0 && sx < VIEW_W && sy > 24 && sy < VIEW_H - 24) return;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const k = Math.min((cx - 12) / Math.abs(dx || 1e-6), (cy - 30) / Math.abs(dy || 1e-6));
  const ex = cx + dx * k;
  const ey = cy + dy * k;
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-3, -4);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (!text) return;
  const tx = Math.max(30, Math.min(VIEW_W - 30, ex - Math.cos(a) * 16));
  const ty = Math.max(30, Math.min(VIEW_H - 36, ey - Math.sin(a) * 12 - 3));
  font.draw(ctx, text, tx, ty, color, { align: 'c' });
}

// Arrows point at what the crew knows about: hostile ships in sight or inside the alarm range,
// and wrecks and stations already found.
function drawArrows(ctx, font, state, cam) {
  const ship = state.ship;
  const sources = visionSources(state);
  const alarm = B.ALARM_RANGE[level(ship, 'alarm')];
  for (const v of state.vessels) {
    if (!enemies(state, v.side, CREW)) continue;
    const known = isVisible(state, v.x, v.y, sources) || dist(v.x, v.y, ship.x, ship.y) < alarm;
    if (known) edgeMarker(ctx, font, cam, v.x, v.y, COL.ember[1]);
  }
  const raided = state.raid ? state.raid.station : null;
  for (const k of state.known) {
    const look = THING_LOOK[k.kind];
    if (!look || !look.arrow) continue;
    const far = Math.round(dist(ship.x, ship.y, k.x, k.y) / 10) + ' M';
    if (k.id !== raided) edgeMarker(ctx, font, cam, k.x, k.y, look.arrow(k), far);
    else {
      const color = Math.floor(state.time * 3) % 2 ? COL.ochre[3] : COL.ember[2];
      edgeMarker(ctx, font, cam, k.x, k.y, color, 'DISTRESS  ' + far);
    }
  }
}

// ---------- light in space: a proposal (D-147), on only with ?lights in the address ----------
// A light brightens the hulls and stars near it and leaves black space black.
function shine(ctx, x, y, r, rgb, power) {
  if (power <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${power})`);
  g.addColorStop(0.5, `rgba(${rgb},${power * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
}
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
function drawSpaceLights(ctx, state, env, near) {
  const ship = state.ship;
  ctx.save();
  ctx.globalCompositeOperation = 'color-dodge';
  for (const b of state.bolts)
    if (near(b, 40)) shine(ctx, b.x, b.y, b.small ? 22 : 34, rgbOf(BOLT_COL[boltKind(b)][2]), 0.5);
  for (const r of state.rockets) shine(ctx, r.x, r.y, 34, rgbOf(COL.ember[2]), 0.5);
  for (const f of state.fx)
    if (f.type === 'boom') shine(ctx, f.x, f.y, f.size * 3, '255,214,150', 0.8 * (1 - f.t / f.dur));
  // Engines light up what is behind them.
  const th = Math.max(0, ship.throttle);
  if (th > 0.02 && !ship.docked) {
    const p = toWorld(ship, { x: 0, y: 56 });
    shine(ctx, p.x, p.y, 26 + th * 24, rgbOf(COL.ion[2]), 0.2 + th * 0.25);
  }
  for (const v of state.vessels) {
    if (!near(v, 110)) continue;
    for (const g of lookOf(v).glow) {
      const p = toWorld(v, g);
      shine(ctx, p.x, p.y, 16 + g.r * 5, rgbOf(v.side === PIRATE ? COL.ember[2] : COL.ion[2]), 0.45);
    }
  }
  // The lights on a station's docking arms fall on the station itself, in the colour that says how it
  // treats the crew.
  for (const t of state.things) {
    if (t.kind !== 'station' || !near(t, 140)) continue;
    const { color, tips } = armLights(t, env);
    if (color === '#1c1c28') continue;
    for (const p of tips) shine(ctx, p.x, p.y, 58, rgbOf(color), 0.5);
  }
  ctx.restore();
}

// A ship over a station or a wreck throws a shadow on it, which says that it is above it.
const shapes = new WeakMap();
function shapeOf(img) {
  let c = shapes.get(img);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  shapes.set(img, c);
  return c;
}
function drawShadow(ctx, state, v, env) {
  const under = state.things.find(
    (t) => (t.kind === 'station' || t.kind === 'wreck') && dist(t.x, t.y, v.x, v.y) < (t.kind === 'station' ? 150 : 90),
  );
  if (!under) return;
  const own = v === state.ship;
  const img = own ? env.img.frigate : spriteOfVessel(v, env.img);
  ctx.save();
  circle(ctx, under.x, under.y, under.kind === 'station' ? 112 : 70);
  ctx.clip();
  ctx.globalAlpha = 0.4;
  // The frigate's picture turns about a point that is not its middle.
  if (own) sprite(ctx, shapeOf(img), v.x + 5, v.y + 7, v.heading, 36, 54);
  else sprite(ctx, shapeOf(img), v.x + 5, v.y + 7, v.heading);
  ctx.restore();
}

export function drawSpace(ctx, state, view, assets) {
  const { img, font } = assets;
  const cam = view.cam;
  const ship = state.ship;
  const fx = view.fx;
  const post = playerById(state, view.playerId).post;
  const env = {
    img,
    state,
    scan: has(ship, 'tscan'),
    aimHelp: post === 'gunner' && has(ship, 'tcomp'),
    arms: view.fx ? view.fx.arms : null,
  };
  drawStars(ctx, cam, fx, state.sector);
  ctx.save();
  ctx.translate(VIEW_W / 2 - cam.x + (fx ? fx.offset.x : 0), VIEW_H / 2 - cam.y + (fx ? fx.offset.y : 0));
  const near = (o, margin) =>
    Math.abs(o.x - cam.x) < VIEW_W / 2 + margin && Math.abs(o.y - cam.y) < VIEW_H / 2 + margin;
  for (const t of state.things) {
    const look = THING_LOOK[t.kind];
    if (look && near(t, look.margin)) look.draw(ctx, t, env);
  }
  const dock = dockingInfo(state);
  if (dock && !dock.docked && post === 'captain') {
    dashed(ctx, dock.nose.x, dock.nose.y, dock.p.x, dock.p.y, dock.ready ? COL.ion[2] : COL.ion[0]);
    brackets(ctx, dock.p.x, dock.p.y, 9, dock.ready ? COL.ion[3] : COL.ion[1]);
  }
  for (const p of state.probes) drawProbe(ctx, p);
  if (ship.pulse) {
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - ship.pulse.t / 1.2));
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    circle(ctx, ship.pulse.x, ship.pulse.y, 40 + ship.pulse.t * 500);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const b of state.beams) drawBeam(ctx, b);
  for (const b of state.bolts) drawBolt(ctx, b);
  for (const r of state.rockets) drawRocket(ctx, r, img);
  if (view.lights) for (const v of [...state.vessels, ship]) if (near(v, 110)) drawShadow(ctx, state, v, env);
  for (const v of state.vessels) if (near(v, 110)) drawVessel(ctx, v, env);
  for (const d of state.darts) drawDart(ctx, d, img);
  if (fx) fx.space.draw(ctx);
  if (!state.over) drawShip(ctx, state, img, fx);
  for (const f of state.fx) drawEffect(ctx, f);
  if (view.lights) drawSpaceLights(ctx, state, env, near);
  ctx.restore();
  drawArrows(ctx, font, state, cam);
  return dock;
}
