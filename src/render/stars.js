// The star map (D-089): every system the crew knows of, the jump lanes between them, and who holds each.
// A system shows as the crew last learnt of it: from having been there, a star chart, a scan or a probe. A buoy
// in a system, and the system radar for the systems near by, show it as it is now. From here the Captain picks
// the next system and where in it to arrive, and the Engineer sends a probe to a system next to this one.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { currentSector, jumpBlocked } from '../sim/sectors.js';
import { viewOf } from '../sim/intel.js';
import { hopsFrom } from '../sim/world.js';
import { jumpCharge, jumpFuel } from '../sim/upgrades.js';
import { playerById } from '../sim/players.js';
import { FACTIONS } from '../sim/sides.js';
import { rect } from './draw.js';
import { SIDE_COL, MOOD_COL } from './looks.js';

const AREA = { x: 12, y: 12, w: 336, h: 336 };
const PX = 364;
const PW = VIEW_W - PX;
const DANGER = ['CALM', 'LOW DANGER', 'MEDIUM DANGER', 'HIGH DANGER'];
const over = (m, r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
const spot = (sec) => ({
  x: Math.round(AREA.x + 14 + sec.x * (AREA.w - 28)),
  y: Math.round(AREA.y + 14 + sec.y * (AREA.h - 28)),
});

// Which systems the crew has been to or learnt of. The lanes out of them are known, and so are the systems at
// the other ends, if only as names on the map.
function known(state) {
  const learnt = (sec) => sec.id === state.sector || sec.visited || !!viewOf(state, sec.id);
  const lanes = [];
  const seen = new Set();
  for (const sec of state.sectors) {
    if (!learnt(sec)) continue;
    seen.add(sec.id);
    for (const j of sec.links) {
      seen.add(j);
      if (sec.id < j || !learnt(state.sectors[j])) lanes.push([sec.id, j]);
    }
  }
  return { lanes, systems: [...seen].map((id) => state.sectors[id]) };
}

// The system the player has picked to look at, or the one the ship is in.
export const pickedSystem = (state, view) =>
  view.starPick !== null && view.starPick !== undefined && state.sectors[view.starPick] ? view.starPick : state.sector;

// What can be clicked: the systems, and for a system next to this one, where to arrive and the probe. Every row
// has the same fields, with null for those it has nothing to do with.
const row = (name, x, y, w, h, more) => ({
  name,
  x,
  y,
  w,
  h,
  star: null,
  jump: null,
  at: null,
  probe: null,
  text: '',
  ...more,
});
function rows(state, view) {
  const id = pickedSystem(state, view);
  const next = currentSector(state).links.includes(id);
  const out = [];
  for (const sec of known(state).systems) {
    const p = spot(sec);
    out.push(row('star.' + sec.id, p.x - 6, p.y - 6, 13, 13, { star: sec.id }));
  }
  if (!next) return out;
  const v = viewOf(state, id);
  const bases = v ? v.stations.slice(0, 3).map((st) => ({ at: st.name, text: 'ARRIVE BY ' + st.name })) : [];
  [...bases, { at: 'open', text: 'ARRIVE IN OPEN SPACE' }].forEach((c, i) =>
    out.push(row('jump.' + i, PX + 10, 160 + i * 22, PW - 20, 20, { jump: id, at: c.at, text: c.text })),
  );
  if (!v || !v.live) out.push(row('starprobe', PX + 10, 256, PW - 20, 20, { probe: id, text: 'SEND A PROBE' }));
  return out;
}
export const starButtons = (state, view) => rows(state, view).map(({ name, x, y, w, h }) => ({ name, x, y, w, h }));
// The row under the mouse, or null.
export const starClick = (state, view, mx, my) => rows(state, view).find((r) => over({ x: mx, y: my }, r)) || null;

// Who holds a system, in words and in a colour, from what the crew knows of it.
function ownerOf(v) {
  if (!v) return ['NOTHING KNOWN', COL.faint];
  if (v.kind === 'sanctuary') return ['THE SANCTUARY  ·  NO ATTACKS', COL.acid[2]];
  if (v.kind === 'empty') return ['EMPTY  ·  NO STATIONS', COL.steel[3]];
  if (v.sides) return [`CONTESTED  ·  ${FACTIONS[v.sides[0]].short} AND ${FACTIONS[v.sides[1]].short}`, COL.ochre[2]];
  if (v.owner === 'pirate') return ['HELD BY THE PIRATES', SIDE_COL.pirate];
  return ['HELD BY ' + FACTIONS[v.owner].name, SIDE_COL[v.owner]];
}

// A system on the map: a square in the colour of whoever holds it, striped for one that two factions fight over.
function drawSystem(ctx, state, sec, picked) {
  const p = spot(sec);
  const v = viewOf(state, sec.id);
  const here = sec.id === state.sector;
  if (here) rect(ctx, p.x - 6, p.y - 6, 13, 13, null, COL.captain);
  else if (picked) rect(ctx, p.x - 6, p.y - 6, 13, 13, null, COL.ion[2]);
  if (!v) {
    rect(ctx, p.x - 2, p.y - 2, 5, 5, '#141420', COL.faint);
    return;
  }
  const size = v.kind === 'empty' ? 5 : 7;
  const h = Math.floor(size / 2);
  rect(ctx, p.x - h - 1, p.y - h - 1, size + 2, size + 2, COL.out);
  if (v.sides) {
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++)
        rect(ctx, p.x - h + i, p.y - h + j, 1, 1, SIDE_COL[v.sides[(i + j) % 4 < 2 ? 0 : 1]]);
  } else {
    const color =
      v.kind === 'sanctuary' ? COL.acid[2] : v.kind === 'empty' ? COL.steel[2] : SIDE_COL[v.owner] || COL.steel[3];
    rect(ctx, p.x - h, p.y - h, size, size, color);
  }
  // A system seen as it is now has a mark beside it.
  if (v.live && !here) rect(ctx, p.x + h + 2, p.y - h, 2, 2, COL.engineer);
}

function drawPanel(ctx, font, state, view, mouse) {
  const left = PX + 12;
  const id = pickedSystem(state, view);
  const sec = state.sectors[id];
  const v = viewOf(state, id);
  const hops = hopsFrom(state.sectors, state.sector)[id];
  const post = playerById(state, view.playerId).post;
  rect(ctx, PX, 0, PW, VIEW_H, COL.panel);
  rect(ctx, PX, 0, 1, VIEW_H, COL.line);
  const name = v || sec.visited || id === state.sector ? sec.name : 'UNKNOWN SYSTEM';
  font.draw(ctx, name, left, 14, COL.text, { scale: 2 });
  const where = id === state.sector ? 'YOU ARE HERE' : hops === 1 ? 'ONE JUMP AWAY' : `${hops} JUMPS AWAY`;
  font.draw(ctx, where, left, 34, id === state.sector ? COL.captain : COL.dim);
  const [owner, color] = ownerOf(v);
  font.draw(ctx, owner, left, 48, color);
  if (v) {
    const age = Math.floor((state.time - v.at) / 60);
    const when = v.live ? 'AS IT IS NOW' : age < 1 ? 'SEEN JUST NOW' : `AS SEEN ${age} MIN AGO`;
    font.draw(ctx, when, left, 60, v.live ? COL.engineer : COL.dim);
    font.draw(ctx, DANGER[sec.tier], VIEW_W - 12, 60, COL.dim, { align: 'r' });
    v.stations.slice(0, 4).forEach((st, i) => {
      const mood = MOOD_COL[st.align] || COL.steel[3];
      font.draw(ctx, st.name, left + 4, 78 + i * 12, mood);
    });
    if (!v.stations.length) font.draw(ctx, 'NO STATIONS KNOWN', left + 4, 78, COL.faint);
  }
  rect(ctx, left, 140, PW - 24, 1, COL.line);
  const next = currentSector(state).links.includes(id);
  if (!next) {
    const text = id === state.sector ? 'PICK A SYSTEM NEXT TO THIS ONE' : 'NO LANE FROM HERE';
    font.draw(ctx, text, left, 148, COL.faint);
  } else {
    const why = jumpBlocked(state, id);
    const jumping = state.jump && state.jump.to === id;
    const head = jumping
      ? `JUMP IN ${Math.ceil(jumpCharge(state.ship) - state.jump.t)} S  ·  CLICK IT AGAIN TO STOP`
      : why || `A JUMP COSTS ${jumpFuel(state.ship)} FUEL`;
    font.draw(ctx, head, left, 148, jumping ? COL.ion[3] : why ? COL.ember[2] : COL.dim);
  }
  for (const r of rows(state, view)) {
    if (r.star !== null) continue;
    const lit = over(mouse, r);
    const chosen = r.jump !== null && state.jump && state.jump.to === r.jump && state.jump.at === r.at;
    rect(ctx, r.x, r.y, r.w, r.h, lit ? '#1c2140' : '#141420', chosen ? COL.ion[2] : lit ? COL.ion[0] : COL.line);
    font.draw(ctx, r.text, r.x + 6, r.y + 7, r.probe !== null ? COL.engineer : COL.ochre[2]);
    if (r.probe !== null)
      font.draw(ctx, `${state.ship.probeStock} LEFT`, r.x + r.w - 6, r.y + 7, COL.dim, { align: 'r' });
  }
  const note =
    post === 'captain'
      ? 'THE CAPTAIN PICKS WHERE TO ARRIVE'
      : post === 'engineer'
        ? 'THE ENGINEER SENDS PROBES'
        : 'ONLY THE CAPTAIN (1) CAN START A JUMP';
  font.draw(ctx, note, left, 300, post === 'captain' ? COL.captain : post === 'engineer' ? COL.engineer : COL.faint);
  font.draw(ctx, 'J  CLOSE    M  SYSTEM MAP', VIEW_W - 12, 344, COL.dim, { align: 'r' });
}

export function drawStarMap(ctx, state, view, assets) {
  const { font } = assets;
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  rect(ctx, AREA.x - 1, AREA.y - 1, AREA.w + 2, AREA.h + 2, '#08080f', COL.line);
  const { lanes, systems } = known(state);
  const picked = pickedSystem(state, view);
  ctx.lineWidth = 1;
  for (const [a, b] of lanes) {
    const p = spot(state.sectors[a]);
    const q = spot(state.sectors[b]);
    const out = a === state.sector || b === state.sector;
    ctx.strokeStyle = out ? COL.ion[1] : COL.line;
    ctx.beginPath();
    ctx.moveTo(p.x + 0.5, p.y + 0.5);
    ctx.lineTo(q.x + 0.5, q.y + 0.5);
    ctx.stroke();
  }
  for (const sec of systems) drawSystem(ctx, state, sec, sec.id === picked);
  font.draw(ctx, 'STAR MAP', AREA.x + 6, AREA.y + 6, COL.dim);
  drawPanel(ctx, font, state, view, view.mouse);
}
