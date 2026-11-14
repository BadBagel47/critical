// The space view: world, ships, shots and effects. Used by the Captain and Gunner posts.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B, SHIP_GEOM, CRUISER_GEOM, WING_MOUNTS } from '../sim/balance.js';
import { nodeStatus } from '../sim/state.js';
import { dockCandidate, shipNose, speedOf, pirateRadius } from '../sim/step.js';
import { toWorld, dist, headingTo } from '../sim/util.js';
import { sprite, dashed, brackets, bar } from './draw.js';
import { isVisible, visionSources } from '../sim/map.js';
import { dockTargets, portsOf } from '../sim/dock.js';
import { has, level, shieldMax } from '../sim/upgrades.js';
import { rect } from './draw.js';
import { drawNebula, drawRipples } from './effects.js';
import { currentSector } from '../sim/sectors.js';

const STARS = (() => {
  let seed = 12345;
  const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  return [0.12, 0.28, 0.5].map((f, layer) => ({
    f,
    stars: Array.from({ length: [70, 50, 26][layer] }, () => ({
      x: r() * VIEW_W,
      y: r() * VIEW_H,
      c: ['#2a2b40', '#55587a', '#a9adc8'][layer],
      big: layer === 2 && r() < 0.25,
    })),
  }));
})();
const mod = (v, m) => ((v % m) + m) % m;
export const ALIGN_COL = { friendly: COL.engineer, neutral: COL.steel[3], hostile: COL.ember[1] };

// `fx` adds the sector's cloud layer and, right after a jump, stretches the stars into streaks.
export function drawStars(ctx, cam, fx = null, sector = 0) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (fx) drawNebula(ctx, fx, sector, cam);
  const warp = fx ? fx.warp : 0;
  for (const layer of STARS)
    for (const s of layer.stars) {
      const x = Math.floor(mod(s.x - cam.x * layer.f, VIEW_W)),
        y = Math.floor(mod(s.y - cam.y * layer.f, VIEW_H));
      ctx.fillStyle = s.c;
      ctx.fillRect(x, y, 1, 1);
      if (warp > 0) {
        const len = Math.round(warp * 90 * layer.f * 2);
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, 1, len);
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

function bolt(ctx, b) {
  const a = headingTo(b.vx, b.vy),
    player = b.owner === 'player',
    k = b.small ? 0.6 : 1;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(a);
  // A soft glow around every shot.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = player ? (b.small ? COL.ion[1] : COL.ochre[2]) : COL.acid[2];
  ctx.beginPath();
  ctx.ellipse(0, 1, 4 * k, 9 * k, 0, 0, 7);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = player ? (b.small ? COL.ion[1] : COL.ochre[1]) : COL.acid[1];
  ctx.fillRect(-1, 0, 2, 6 * k);
  ctx.fillStyle = player ? (b.small ? COL.ion[3] : COL.ochre[3]) : COL.acid[3];
  ctx.fillRect(-1, -4 * k, 2, 5 * k);
  ctx.restore();
}

function effect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    // The bright core of an explosion. Sparks, smoke and debris come from the particle system.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, 1 - u * 1.8);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (0.3 + u * 0.5), 0, 7);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 0.7 - u);
    ctx.fillStyle = COL.ember[1];
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (0.5 + u * 0.7), 0, 7);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  } else if (f.type === 'jump') {
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 20 + u * 260, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = f.type === 'shield' ? COL.ion[2] : COL.ochre[3];
    const s = f.type === 'shield' ? 5 : 3;
    ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x - 0.5, f.y - 0.5, 1, 1);
    ctx.globalAlpha = 1;
  }
}

function drawShip(ctx, state, img, fx) {
  const ship = state.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.heading);
  const th = Math.max(0, ship.throttle);
  if (th > 0.02 && !ship.docked) {
    const len = (3 + th * 9 + Math.random() * 2) * (ship.boosting ? 2.2 : 1);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COL.ion[1];
    ctx.beginPath();
    ctx.arc(0, 52, 5 + th * 7, 0, 7);
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
    ctx.beginPath();
    ctx.arc(0, -52, 2 + ship.charge * 6, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (state.jump) {
    const u = state.jump.t / (has(ship, 'jumpcoil') ? B.COIL_CHARGE : B.JUMP_CHARGE);
    ctx.globalAlpha = 0.25 + u * 0.5;
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 60 - u * 14, 78 - u * 14, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  const mount = toWorld(ship, SHIP_GEOM.turret);
  sprite(ctx, img.turret_pulse, mount.x, mount.y, ship.turretAngle, 6, 10.5);
  if (has(ship, 'twin'))
    for (const w of WING_MOUNTS) {
      const p = toWorld(ship, w);
      sprite(ctx, img.turret_pulse, p.x, p.y, ship.turretAngle, 6, 10.5);
    }
  // Sparks from critical parts of the ship.
  for (const n of ship.nodes) {
    if (nodeStatus(n.hp) !== 'critical' || Math.random() > 0.3) continue;
    const p = toWorld(ship, n);
    ctx.fillStyle = Math.random() < 0.5 ? COL.ochre[3] : COL.ember[1];
    ctx.fillRect(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, 1, 1);
  }
  const since = state.time - ship.lastHit,
    emit = has(ship, 'emit') && ship.shield > 0;
  if ((since < 0.45 && ship.shield > 0) || emit) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.heading);
    const flash = since < 0.45 ? 0.7 * (1 - since / 0.45) : 0;
    ctx.globalAlpha = Math.max(flash, emit ? 0.12 + 0.1 * (ship.shield / shieldMax(ship)) : 0);
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 44, 62, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha *= 0.15;
    ctx.fillStyle = COL.ion[2];
    ctx.fill();
    ctx.restore();
  }
  if (fx && ship.shield > 0) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.heading);
    drawRipples(ctx, fx);
    ctx.restore();
  }
}

function edgeMarker(ctx, font, cam, x, y, color, text) {
  const sx = x - cam.x + VIEW_W / 2,
    sy = y - cam.y + VIEW_H / 2;
  if (sx > 0 && sx < VIEW_W && sy > 24 && sy < VIEW_H - 24) return;
  const cx = VIEW_W / 2,
    cy = VIEW_H / 2,
    dx = sx - cx,
    dy = sy - cy;
  const k = Math.min((cx - 12) / Math.abs(dx || 1e-6), (cy - 30) / Math.abs(dy || 1e-6));
  const ex = cx + dx * k,
    ey = cy + dy * k,
    a = Math.atan2(dy, dx);
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
  if (text)
    font.draw(
      ctx,
      text,
      Math.max(30, Math.min(VIEW_W - 30, ex - Math.cos(a) * 16)),
      Math.max(30, Math.min(VIEW_H - 36, ey - Math.sin(a) * 12 - 3)),
      color,
      { align: 'c' },
    );
}

// Docking help is returned so the HUD can show the matching prompt.
export function dockingInfo(state) {
  const ship = state.ship;
  if (ship.docked) return { docked: true };
  const nose = shipNose(ship);
  let best = null;
  for (const t of dockTargets(state))
    for (const p of portsOf(t)) {
      const d = dist(nose.x, nose.y, p.x, p.y);
      if (d < B.DOCK_GUIDE_RANGE && (!best || d < best.d)) best = { w: t, p, d, nose };
    }
  if (!best) return null;
  best.ready = dockCandidate(state) === best.w;
  best.tooFast = best.d < B.DOCK_RANGE * 2.5 && speedOf(ship) > B.DOCK_SPEED;
  return best;
}

function hpBar(ctx, x, y, w, frac) {
  bar(ctx, x - w / 2, y, w, frac, COL.ember[1], 4);
}

export function drawSpace(ctx, state, view, assets) {
  const { img, font } = assets,
    cam = view.cam,
    ship = state.ship,
    scan = has(ship, 'tscan'),
    fx = view.fx;
  drawStars(ctx, cam, fx, state.sector);
  ctx.save();
  ctx.translate(VIEW_W / 2 - cam.x + (fx ? fx.offset.x : 0), VIEW_H / 2 - cam.y + (fx ? fx.offset.y : 0));
  const near = (o, m) => Math.abs(o.x - cam.x) < VIEW_W / 2 + m && Math.abs(o.y - cam.y) < VIEW_H / 2 + m;
  for (const r of state.rocks) if (near(r, 30)) sprite(ctx, img['rock' + r.kind], r.x, r.y, r.spin);
  for (const w of state.wrecks) if (near(w, 100)) sprite(ctx, img.wreck, w.x, w.y, w.heading);
  for (const pod of state.pods) if (near(pod, 40)) sprite(ctx, img.pod, pod.x, pod.y, pod.heading);
  for (const c of state.salvage) {
    if (!near(c, 20)) continue;
    if (c.pulled) {
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
    rect(ctx, c.x - 1, c.y - 1, 2, 2, Math.floor(state.time * 3 + c.id) % 2 ? COL.ochre[3] : COL.ochre[2]);
  }
  for (const st of state.stations) {
    if (!near(st, 80)) continue;
    sprite(ctx, img['station_' + st.align], st.x, st.y, st.heading);
    for (const g of st.guns)
      if (g.hp > 0) {
        const p = toWorld(st, g);
        sprite(ctx, img.turret_guard, p.x, p.y, g.heading);
        if (scan) hpBar(ctx, p.x, p.y - 14, 16, g.hp / B.STATION_GUN_HP);
      }
  }
  const dock = dockingInfo(state);
  if (dock && !dock.docked && view.post === 'captain') {
    dashed(ctx, dock.nose.x, dock.nose.y, dock.p.x, dock.p.y, dock.ready ? COL.ion[2] : COL.ion[0]);
    brackets(ctx, dock.p.x, dock.p.y, 9, dock.ready ? COL.ion[3] : COL.ion[1]);
  }
  for (const b of state.buoys) {
    ctx.fillStyle = COL.out;
    ctx.fillRect(b.x - 3, b.y - 4, 6, 9);
    ctx.fillStyle = COL.engineer;
    ctx.fillRect(b.x - 2, b.y - 3, 4, 7);
    ctx.fillRect(b.x - 0.5, b.y - 9, 1, 6);
    ctx.fillStyle = Math.floor(state.time * 2) % 2 ? COL.white : COL.engineer;
    ctx.fillRect(b.x - 0.5, b.y - 10, 1, 1);
  }
  for (const pr of state.probes) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = COL.ion[1];
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 5, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.ion[3];
    ctx.fillRect(pr.x - 1.5, pr.y - 1.5, 3, 3);
  }
  if (ship.pulse) {
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - ship.pulse.t / 1.2));
    ctx.strokeStyle = COL.ion[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ship.pulse.x, ship.pulse.y, 40 + ship.pulse.t * 500, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const b of state.beams) {
    const u = b.t / b.dur;
    ctx.globalAlpha = 1 - u;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = COL.ion[0];
    ctx.lineWidth = 22 * (1 - u);
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = COL.ion[1];
    ctx.lineWidth = 7 * (1 - u * 0.5);
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const b of state.bolts) bolt(ctx, b);
  for (const r of state.rockets) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COL.ochre[2];
    const t = toWorld(r, { x: 0, y: 7 });
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.5, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprite(ctx, img.rocket, r.x, r.y, r.heading);
  }
  for (const p of state.pirates) {
    if (!near(p, 110)) continue;
    if (p.kind === 'cruiser') {
      for (const x of [-11, 9]) {
        const e = toWorld(p, { x, y: 84 });
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = COL.ember[1];
        ctx.beginPath();
        ctx.arc(e.x, e.y, 5, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      sprite(ctx, img.cruiser, p.x, p.y, p.heading);
      for (const g of CRUISER_GEOM.guns) {
        const m = toWorld(p, g);
        sprite(ctx, img.turret_guard, m.x, m.y, headingTo(ship.x - m.x, ship.y - m.y));
      }
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = COL.ember[1];
      const e = toWorld(p, { x: 0, y: p.kind === 'gunboat' ? 28 : 14 });
      ctx.beginPath();
      ctx.arc(e.x, e.y, p.kind === 'gunboat' ? 5 : 3.5, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      sprite(ctx, img[p.kind], p.x, p.y, p.heading);
    }
    if (scan || p.kind === 'cruiser')
      hpBar(ctx, p.x, p.y - pirateRadius(p) - 12, p.kind === 'cruiser' ? 70 : 22, p.hp / p.hpMax);
    // The targeting computer marks where a shot fired now would meet the pirate.
    if (view.post === 'gunner' && has(ship, 'tcomp')) {
      const t = dist(p.x, p.y, ship.x, ship.y) / B.BOLT_SPEED,
        lx = p.x + (p.vx - ship.vx) * t,
        ly = p.y + (p.vy - ship.vy) * t;
      ctx.strokeStyle = COL.ochre[2];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  for (const d of state.darts) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COL.ion[1];
    const e = toWorld(d, { x: 0, y: 9 });
    ctx.beginPath();
    ctx.arc(e.x, e.y, 2.5, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    sprite(ctx, img.dart, d.x, d.y, d.heading);
  }
  if (fx) fx.space.draw(ctx);
  if (!state.over) drawShip(ctx, state, img, fx);
  for (const f of state.fx) effect(ctx, f);
  ctx.restore();
  // Arrows at the screen edge point at what the crew knows about: pirates in sight or inside the alarm range,
  // and wrecks and stations already found.
  const sources = visionSources(state),
    alarm = B.ALARM_RANGE[level(ship, 'alarm')];
  for (const p of state.pirates)
    if (isVisible(state, p.x, p.y, sources) || dist(p.x, p.y, ship.x, ship.y) < alarm)
      edgeMarker(ctx, font, cam, p.x, p.y, COL.ember[1]);
  const raided = state.raid ? state.raid.station : null;
  for (const k of state.known) {
    if (k.kind === 'pod') continue;
    const far = Math.round(dist(ship.x, ship.y, k.x, k.y) / 10) + ' M';
    if (k.id === raided)
      edgeMarker(
        ctx,
        font,
        cam,
        k.x,
        k.y,
        Math.floor(state.time * 3) % 2 ? COL.ochre[3] : COL.ember[2],
        'DISTRESS  ' + far,
      );
    else edgeMarker(ctx, font, cam, k.x, k.y, k.kind === 'station' ? ALIGN_COL[k.align] : COL.ochre[2], far);
  }
  return dock;
}
