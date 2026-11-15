// What each post has that the others do not: the Gunner's list of targets and the Captain's course.
import { VIEW_W, VIEW_H, ZOOM, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { SHIPS } from '../sim/kinds.js';
import { isVisible, visionSources } from '../sim/map.js';
import { CREW, enemies } from '../sim/sides.js';
import { nameOf, findThing } from '../sim/things.js';
import { level } from '../sim/upgrades.js';
import { dist, headingTo, angleDiff } from '../sim/util.js';
import { nodeStatus } from '../sim/ship.js';
import { SURGE_BY } from '../sim/teamwork.js';
import { rect, bar, brackets, label } from './draw.js';

const onScreen = (cam, x, y) => ({ x: (x - cam.x) * ZOOM + VIEW_W / 2, y: (y - cam.y) * ZOOM + VIEW_H / 2 });
const metres = (d) => Math.round(d / 10) + ' M';

// ---------- the Gunner: targets ----------
// The enemies that the ship knows of, the most dangerous first: those that hit hardest and are nearest.
export function targetsOf(state) {
  const ship = state.ship;
  const sources = visionSources(state);
  const alarm = B.ALARM_RANGE[level(ship, 'alarm')];
  return state.vessels
    .filter((v) => enemies(state, v.side, CREW))
    .map((v) => ({ v, far: dist(v.x, v.y, ship.x, ship.y) }))
    .filter((t) => t.far < alarm || isVisible(state, t.v.x, t.v.y, sources))
    .map((t) => ({ ...t, danger: (SHIPS[t.v.kind].dmg + 2) / Math.max(80, t.far) }))
    .sort((a, b) => b.danger - a.danger);
}
const ROWS = 4;
export function drawTargets(ctx, font, state, cam) {
  const list = targetsOf(state);
  if (!list.length) return;
  const x = VIEW_W - 128,
    y = 122;
  rect(ctx, x, y, 120, 14 + Math.min(ROWS, list.length) * 11, COL.panel, COL.line);
  font.draw(ctx, 'TARGETS', x + 4, y + 3, COL.dim);
  if (list.length > ROWS) font.draw(ctx, '+' + (list.length - ROWS), x + 116, y + 3, COL.dim, { align: 'r' });
  list.slice(0, ROWS).forEach((t, i) => {
    const ry = y + 14 + i * 11;
    const first = i === 0;
    font.draw(ctx, SHIPS[t.v.kind].name, x + 4, ry, first ? COL.ember[2] : COL.text);
    font.draw(ctx, metres(t.far), x + 84, ry, COL.dim, { align: 'r' });
    bar(ctx, x + 88, ry, 28, t.v.hp / SHIPS[t.v.kind].hp, first ? COL.ember[1] : COL.steel[2], 5);
  });
  // The most dangerous one is picked out in space as well.
  const p = onScreen(cam, list[0].v.x, list[0].v.y);
  if (p.x > 0 && p.x < VIEW_W && p.y > 0 && p.y < VIEW_H) brackets(ctx, p.x, p.y, 12, COL.ember[2], 5);
}

// ---------- the Captain: a course ----------
// What a course can be set for: everything the map knows of, the nearest first.
const places = (state) =>
  state.known
    .map((k) => ({ k, far: dist(k.x, k.y, state.ship.x, state.ship.y) }))
    .sort((a, b) => a.far - b.far)
    .map((p) => p.k);
// The next place to set a course for, or null after the last one.
export function nextCourse(state, view) {
  const list = places(state);
  const at = list.findIndex((k) => k.id === view.course);
  const next = list[at + 1];
  return next ? next.id : null;
}
export function drawCourse(ctx, font, state, view, cam) {
  const ship = state.ship;
  const k = state.known.find((x) => x.id === view.course);
  if (!k) {
    if (state.known.length) font.draw(ctx, 'C  SET A COURSE', 8, 28, COL.faint);
    return;
  }
  const thing = findThing(state, k.id);
  const name = thing ? nameOf(thing) : k.name || 'MARK';
  const far = dist(k.x, k.y, ship.x, ship.y);
  // How fast the ship is closing on it, and so how long it will take.
  const closing = far > 1 ? (ship.vx * (k.x - ship.x) + ship.vy * (k.y - ship.y)) / far : 0;
  const secs = closing > 4 ? Math.round(far / closing) : null;
  const eta = secs === null || secs > 3599 ? '--:--' : Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  const off = angleDiff(headingTo(k.x - ship.x, k.y - ship.y), ship.heading);
  const deg = Math.round((Math.abs(off) * 180) / Math.PI);
  const turn = deg < 6 ? 'AHEAD' : (off > 0 ? 'RIGHT ' : 'LEFT ') + deg;
  rect(ctx, 8, 26, 168, 26, COL.panel, COL.captain);
  font.draw(ctx, 'COURSE', 12, 30, COL.dim);
  font.draw(ctx, name, 54, 30, COL.white);
  font.draw(ctx, `${metres(far)}  ·  ${eta}  ·  ${turn}`, 12, 41, deg < 6 ? COL.captain : COL.text);
  font.draw(ctx, 'C', 172, 30, COL.faint, { align: 'r' });
  // In space it is picked out with brackets, or with a marker at the edge of the screen when it is far off.
  const p = onScreen(cam, k.x, k.y);
  if (p.x > 0 && p.x < VIEW_W && p.y > 24 && p.y < VIEW_H - 24) {
    brackets(ctx, p.x, p.y, 20, COL.captain, 6);
    return;
  }
  const cx = VIEW_W / 2,
    cy = VIEW_H / 2;
  const dx = p.x - cx,
    dy = p.y - cy;
  const s = Math.min((cx - 26) / Math.abs(dx || 1e-6), (cy - 44) / Math.abs(dy || 1e-6));
  label(ctx, font, cx + dx * s, cy + dy * s, name, { anchor: 'c', fg: COL.captain, border: COL.captain });
}

// ---------- the overcharge and the marks ----------
// The line that tells a post about the overcharge: that one is ready for its system, or running.
export function surgeLine(state, post) {
  const s = state.ship.surge;
  if (!s.sys || SURGE_BY[s.sys] !== post) return null;
  const name = s.sys.toUpperCase();
  if (s.left > 0)
    return { text: `${name} OVERCHARGED  ·  ${Math.ceil(s.left)} S`, color: COL.ion[3], border: COL.ion[1] };
  if (s.charge >= 1) return { text: `Z  ·  OVERCHARGE ${name}`, color: COL.ion[3], border: COL.ion[1] };
  return null;
}
// What the Engineer sees of it: what is being built up, that it is ready, or that it is cooling.
export function surgeNote(state) {
  const s = state.ship.surge;
  if (s.left > 0) return { text: `${s.sys.toUpperCase()} OVERCHARGED  ${Math.ceil(s.left)} S`, color: COL.ion[3] };
  if (s.cool > 0) return { text: `OVERCHARGE COOLING  ${Math.ceil(s.cool)} S`, color: COL.dim };
  if (!s.sys) return { text: 'Z  OVERCHARGE THE PICKED SYSTEM', color: COL.faint };
  const name = s.sys.toUpperCase();
  if (s.charge < 1) return { text: `OVERCHARGE ${name}  ${Math.round(s.charge * 100)}%`, color: COL.ochre[2] };
  const who = SURGE_BY[s.sys] === 'engineer' ? 'PRESS Z' : `${SURGE_BY[s.sys].toUpperCase()} PRESSES Z`;
  return { text: `${name} READY  ·  ${who}`, color: COL.ion[3] };
}
// The marks that the other posts have set, drawn for the one who is looking: the ship that the Gunner wants
// kept in sight, and the one that the Captain has marked for harder hits.
export function drawMarks(ctx, font, state, cam, post) {
  const draw = (id, color, text) => {
    const v = state.vessels.find((x) => x.id === id);
    if (!v) return;
    const p = onScreen(cam, v.x, v.y);
    if (p.x > 0 && p.x < VIEW_W && p.y > 24 && p.y < VIEW_H - 24) {
      brackets(ctx, p.x, p.y, 15, color, 5);
      font.draw(ctx, text, p.x, p.y - 24, color, { align: 'c' });
      return;
    }
    const cx = VIEW_W / 2,
      cy = VIEW_H / 2;
    const dx = p.x - cx,
      dy = p.y - cy;
    const k = Math.min((cx - 40) / Math.abs(dx || 1e-6), (cy - 56) / Math.abs(dy || 1e-6));
    label(ctx, font, cx + dx * k, cy + dy * k, text, { anchor: 'c', fg: color, border: color });
  };
  const m = state.marks;
  if (m.gunner !== null) draw(m.gunner, COL.gunner, post === 'gunner' ? 'YOUR MARK' : "GUNNER'S MARK");
  if (m.captain !== null) draw(m.captain, COL.captain, post === 'captain' ? 'YOUR MARK' : 'MARKED  ·  HIT HARDER');
}
// The part of the ship that the Engineer has pointed out, as a line for the others.
export function engineerMark(state) {
  const i = state.marks.engineer;
  if (i === null) return null;
  const n = state.ship.nodes[i];
  const critical = nodeStatus(n.hp) === 'critical';
  return {
    text: `ENGINEER  ·  ${n.name} ${critical ? 'CRITICAL' : 'DAMAGED'}`,
    color: critical ? COL.ember[2] : COL.ochre[2],
    border: critical ? COL.ember[0] : COL.ochre[0],
  };
}
