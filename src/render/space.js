// The space view: world, ships, shots and effects. Used by the Captain and Gunner posts.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B, SHIP_GEOM } from '../sim/balance.js';
import { nodeStatus } from '../sim/state.js';
import { dockCandidate, shipNose, wreckPort, speedOf } from '../sim/step.js';
import { toWorld, dist, headingTo } from '../sim/util.js';
import { sprite, dashed, brackets } from './draw.js';

const STARS = (() => {
  let seed = 12345; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  return [0.12, 0.28, 0.5].map((f, layer) => ({ f, stars: Array.from({ length: [70, 50, 26][layer] }, () => ({ x: r() * VIEW_W, y: r() * VIEW_H, c: ['#2a2b40', '#55587a', '#a9adc8'][layer], big: layer === 2 && r() < 0.25 })) }));
})();
const mod = (v, m) => ((v % m) + m) % m;

export function drawStars(ctx, cam) {
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const layer of STARS) for (const s of layer.stars) {
    const x = Math.floor(mod(s.x - cam.x * layer.f, VIEW_W)), y = Math.floor(mod(s.y - cam.y * layer.f, VIEW_H));
    ctx.fillStyle = s.c; ctx.fillRect(x, y, 1, 1);
    if (s.big) { ctx.fillStyle = '#55587a'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); ctx.fillStyle = s.c; ctx.fillRect(x, y, 1, 1); }
  }
}

function bolt(ctx, b) {
  const a = headingTo(b.vx, b.vy), player = b.owner === 'player';
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
  ctx.fillStyle = player ? COL.ochre[1] : COL.acid[1]; ctx.fillRect(-1, 0, 2, 6);
  ctx.fillStyle = player ? COL.ochre[3] : COL.acid[3]; ctx.fillRect(-1, -4, 2, 5);
  ctx.restore();
}

function effect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    ctx.globalAlpha = Math.max(0, 1 - u * 1.4); ctx.fillStyle = COL.ember[3];
    ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.25 + u * 0.4), 0, 7); ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - u);
    for (let i = 0; i < 14; i++) {
      const a = i * 0.449 + f.size, r = f.size * u * (0.6 + ((i * 37) % 10) / 14), s = i % 3 === 0 ? 3 : 2;
      ctx.fillStyle = i % 2 ? COL.ochre[2] : COL.ember[1];
      ctx.fillRect(f.x + Math.cos(a) * r - s / 2, f.y + Math.sin(a) * r - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 1 - u; ctx.fillStyle = f.type === 'shield' ? COL.ion[2] : COL.ochre[3];
    const s = f.type === 'shield' ? 5 : 3; ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(f.x - 0.5, f.y - 0.5, 1, 1); ctx.globalAlpha = 1;
  }
}

function drawShip(ctx, state, img) {
  const ship = state.ship;
  ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.heading);
  const th = Math.max(0, ship.throttle);
  if (th > 0.02 && !ship.docked) {
    const len = 3 + th * 9 + Math.random() * 2;
    ctx.globalAlpha = 0.35; ctx.fillStyle = COL.ion[1]; ctx.beginPath(); ctx.arc(0, 52, 5 + th * 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    for (const x of [-8, 4]) { ctx.fillStyle = COL.ion[1]; ctx.fillRect(x, 50, 4, len); ctx.fillStyle = COL.ion[3]; ctx.fillRect(x + 1, 50, 2, len * 0.6); }
  }
  ctx.drawImage(img.frigate, -36, -54);
  ctx.restore();
  const mount = toWorld(ship, SHIP_GEOM.turret);
  sprite(ctx, img.turret_pulse, mount.x, mount.y, ship.turretAngle, 6, 10.5);
  // Sparks from critical parts of the ship.
  for (const n of ship.nodes) {
    if (nodeStatus(n.hp) !== 'critical' || Math.random() > 0.3) continue;
    const p = toWorld(ship, n); ctx.fillStyle = Math.random() < 0.5 ? COL.ochre[3] : COL.ember[1];
    ctx.fillRect(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, 1, 1);
  }
  const since = state.time - ship.lastHit;
  if (since < 0.45 && ship.shield > 0) {
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.heading);
    ctx.globalAlpha = 0.7 * (1 - since / 0.45); ctx.strokeStyle = COL.ion[2]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 62, 0, 0, 7); ctx.stroke();
    ctx.globalAlpha *= 0.15; ctx.fillStyle = COL.ion[2]; ctx.fill(); ctx.restore();
  }
}

function edgeMarker(ctx, font, cam, x, y, color, text) {
  const sx = x - cam.x + VIEW_W / 2, sy = y - cam.y + VIEW_H / 2;
  if (sx > 0 && sx < VIEW_W && sy > 24 && sy < VIEW_H - 24) return;
  const cx = VIEW_W / 2, cy = VIEW_H / 2, dx = sx - cx, dy = sy - cy;
  const k = Math.min((cx - 12) / Math.abs(dx || 1e-6), (cy - 30) / Math.abs(dy || 1e-6));
  const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  if (text) font.draw(ctx, text, Math.max(30, Math.min(VIEW_W - 30, ex - Math.cos(a) * 16)), Math.max(30, Math.min(VIEW_H - 36, ey - Math.sin(a) * 12 - 3)), color, { align: 'c' });
}

// Docking help is returned so the HUD can show the matching prompt.
export function dockingInfo(state) {
  const ship = state.ship;
  if (ship.docked) return { docked: true };
  const nose = shipNose(ship); let best = null;
  for (const w of state.wrecks) {
    const p = wreckPort(w), d = dist(nose.x, nose.y, p.x, p.y);
    if (d < B.DOCK_GUIDE_RANGE && (!best || d < best.d)) best = { w, p, d, nose };
  }
  if (!best) return null;
  best.ready = dockCandidate(state) === best.w;
  best.tooFast = best.d < B.DOCK_RANGE * 2.5 && speedOf(ship) > B.DOCK_SPEED;
  return best;
}

export function drawSpace(ctx, state, view, assets) {
  const { img, font } = assets, cam = view.cam, ship = state.ship;
  drawStars(ctx, cam);
  ctx.save(); ctx.translate(VIEW_W / 2 - cam.x, VIEW_H / 2 - cam.y);
  const near = (o, m) => Math.abs(o.x - cam.x) < VIEW_W / 2 + m && Math.abs(o.y - cam.y) < VIEW_H / 2 + m;
  for (const r of state.rocks) if (near(r, 30)) sprite(ctx, img['rock' + r.kind], r.x, r.y, r.spin);
  for (const w of state.wrecks) if (near(w, 100)) sprite(ctx, img.wreck, w.x, w.y, w.heading);
  const dock = dockingInfo(state);
  if (dock && !dock.docked && view.post === 'captain') {
    dashed(ctx, dock.nose.x, dock.nose.y, dock.p.x, dock.p.y, dock.ready ? COL.ion[2] : COL.ion[0]);
    brackets(ctx, dock.p.x, dock.p.y, 9, dock.ready ? COL.ion[3] : COL.ion[1]);
  }
  for (const b of state.bolts) bolt(ctx, b);
  for (const p of state.pirates) {
    if (!near(p, 40)) continue;
    ctx.globalAlpha = 0.5; ctx.fillStyle = COL.ember[1];
    const e = toWorld(p, { x: 0, y: 14 }); ctx.beginPath(); ctx.arc(e.x, e.y, 3.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    sprite(ctx, img.fighter, p.x, p.y, p.heading);
  }
  if (!state.over) drawShip(ctx, state, img);
  for (const f of state.fx) effect(ctx, f);
  ctx.restore();
  for (const p of state.pirates) edgeMarker(ctx, font, cam, p.x, p.y, COL.ember[1]);
  for (const w of state.wrecks) edgeMarker(ctx, font, cam, w.x, w.y, COL.ochre[2], Math.round(dist(ship.x, ship.y, w.x, w.y) / 10) + ' M');
  return dock;
}
