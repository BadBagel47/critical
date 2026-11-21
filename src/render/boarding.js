// The boarding view: the inside of a wreck or a station seen from above, one floor at a time. The parts are split
// by subject (D-227): inside-tiles.js draws the floor, the walls, the doors and what stands in the rooms,
// inside-things.js the people and the things that move, inside-light.js the light and the dark, and inside-hud.js
// the lines, the small plan and the buttons' keys round the edge.
import { COL, VIEW_H, VIEW_W } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE } from '../sim/boarding.js';
import { label, rect, sprite } from './draw.js';
import { drawStars } from './space.js';
import { findDock } from '../sim/things.js';
import { playerById } from '../sim/players.js';
import { carryMax, level } from '../sim/upgrades.js';
import { alarmText } from './hud.js';
import { shade } from './light.js';
import { dist } from '../sim/util.js';
import { hunters, roomName } from './radar.js';
import { awake } from '../sim/guards.js';
import { deckOf } from '../sim/floor.js';
import { DECK } from '../sim/base.js';
import { drawFigure } from './figures.js';
import { ROLE_NAME, shownPurse } from '../sim/purses.js';
import { drawBoarderHud, drawHunters, drawPlaceLine, drawPlan, drawVisitorHud } from './inside-hud.js';
import { drawBeacons, drawGlows, lightsOf, lockdownFilter } from './inside-light.js';
import {
  drawConsoles,
  drawDesk,
  drawFlare,
  drawGrenade,
  drawGuard,
  drawInsideBolt,
  drawMainframe,
  drawStaffDoors,
  drawTunnel,
  drawWatch,
  effect,
  glow,
  shadow,
} from './inside-things.js';
import { HULL, drawBaseChanges, drawHull, drawLinks, drawTiles, styleOf } from './inside-tiles.js';
import { HULLS, drawBaseDeck } from './inside-base.js';
export { doorLamp } from './inside-tiles.js';
export { lockColour } from './inside-light.js';

// Where on the screen the inside of a place is drawn. The camera follows the player's own figure. A place
// that is smaller than the screen is kept still in the middle of it, and at the edges of a larger one the
// camera goes a little way outside, so that the frigate at the airlock can be seen.
export function insideOrigin(it, me) {
  const at = me || it.entry;
  const along = (view, size, pos, lo, hi) => {
    const room = view - lo - hi;
    if (size + 2 * OUTSIDE <= room) return lo + (room - size) / 2;
    return Math.round(Math.max(view - hi - size - OUTSIDE, Math.min(lo + OUTSIDE, view / 2 - pos)));
  };
  // A base has its floors side by side: the camera keeps to the floor the player is on.
  const d = deckBox(it, at);
  return {
    x: along(VIEW_W, d.w * TILE, at.x - d.x0 * TILE, 0, 0) - d.x0 * TILE,
    y: along(VIEW_H, it.h * TILE, at.y, 28, 30),
  };
}

// Where the floor that a spot is on lies in the grid, in tiles: all of it in a place with one floor.
export function deckBox(it, at) {
  if (!it.decks) return { x0: 0, w: it.w, deck: null };
  const deck = it.decks[deckOf(it, at.x)];
  return { x0: deck.x0, w: DECK, deck };
}

const OUTSIDE = 96;

// Everything on the floor, in the interior's own pixels.
function drawFloor(ctx, state, place, me, assets, fx, origin) {
  const { img, font } = assets;
  const it = place.interior;
  const style = styleOf(place);
  drawTunnel(ctx, img, it);
  // A base is seen one floor at a time, round, inside its outer wall (R-1165).
  const box = deckBox(it, me || it.entry);
  ctx.save();
  if (box.deck) {
    ctx.beginPath();
    ctx.arc(box.deck.cx, box.deck.cy, box.deck.r + HULL, 0, 7);
    ctx.clip();
  }
  // A base is drawn as in its design test (F-208), each floor in a style of its own.
  if (box.deck) {
    const deck = it.decks.indexOf(box.deck);
    drawBaseDeck(ctx, it, deck);
    drawBaseChanges(ctx, it, origin, state.time);
    drawHull(ctx, box.deck, HULLS[deck]);
  } else drawTiles(ctx, it, origin, style, state.time);
  drawLinks(ctx, font, it);
  drawConsoles(ctx, font, it, state.time, me);
  for (const desk of it.desks) drawDesk(ctx, img, font, place, desk);
  if (it.trade) drawStaffDoors(ctx, font, it);
  for (const c of it.civilians) {
    shadow(ctx, c.x, c.y, 5);
    drawFigure(ctx, img.boarder, c, state.time);
  }
  for (const l of it.loot) {
    shadow(ctx, l.x, l.y, 5);
    // A survivor of a rescue job (D-073) lies on the floor, waiting to be carried out.
    if (l.type === 'survivor') {
      glow(ctx, l.x, l.y, 12, COL.acid[2], 0.2);
      sprite(ctx, img.boarder, l.x, l.y, Math.PI / 2);
      font.draw(ctx, 'SURVIVOR', l.x, l.y - 14, COL.acid[2], { align: 'c' });
      continue;
    }
    glow(ctx, l.x, l.y, 9, l.type === 'crate' ? COL.ochre[2] : COL.ion[2], 0.14);
    sprite(ctx, img[l.type], l.x, l.y);
  }
  if (it.mainframe) drawMainframe(ctx, place, it, state.time);
  if (it.reactor) {
    const r = it.reactor;
    rect(ctx, r.x - 7, r.y - 7, 14, 14, '#1c1c28', COL.out);
    rect(
      ctx,
      r.x - 4,
      r.y - 4,
      8,
      8,
      r.steadied ? COL.acid[1] : Math.floor(state.time * 2) % 2 ? COL.ochre[2] : COL.ochre[0],
    );
  }
  for (const t of it.turrets) {
    shadow(ctx, t.x, t.y, 6);
    sprite(ctx, img.turret_guard, t.x, t.y, t.heading);
  }
  for (const s of it.sentries) {
    glow(ctx, s.x, s.y, 9, COL.ion[2], 0.12);
    sprite(ctx, img.turret_pulse, s.x, s.y, s.heading, 6, 10.5);
  }
  for (const g of it.guards) {
    shadow(ctx, g.x, g.y, g.kind === 'heavy' ? 7 : 5);
    // One that is taken down lies on the floor, and is drawn fainter.
    ctx.globalAlpha = g.down ? 0.6 : 1;
    drawGuard(ctx, img, g, state.time);
    ctx.globalAlpha = 1;
  }
  for (const a of it.avatars) {
    shadow(ctx, a.x, a.y, 5);
    const interval = a.weapon === 'tranq' ? B.TRANQ_INTERVAL : B.RIFLE_INTERVAL;
    drawFigure(ctx, img.boarder, a, state.time, {
      hp: playerById(state, a.player).hp,
      firing: a.cool > interval - 0.08,
      carrying: a.carry.length > 0,
    });
  }
  if (it.dark) {
    const off = fx ? fx.offset : { x: 0, y: 0 };
    shade(ctx, it, origin.x + off.x, origin.y + off.y, lightsOf(state, place, it, style, origin));
    drawGlows(ctx, state, it, style, origin);
  }
  lockdownFilter(ctx, place, it, origin);
  drawBeacons(ctx, it, state.time, origin);
  // What is drawn from here on is not dimmed by the dark.
  drawWatch(ctx, font, state, it, me);
  ctx.fillStyle = COL.ember[2];
  for (const g of it.guards) {
    if (g.mode !== 'alert' || !awake(g)) continue;
    ctx.fillRect(g.x - 1, g.y - 14, 2, 4);
    ctx.fillRect(g.x - 1, g.y - 9, 2, 2);
  }
  for (const a of it.avatars) {
    // A ring marks the player's own figure.
    if (a === me) {
      ctx.strokeStyle = COL.ion[2];
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 9, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    a.carry.forEach((c, i) => {
      rect(
        ctx,
        a.x - 5 + i * 4,
        a.y - 13,
        3,
        3,
        c.type === 'crate' ? COL.ochre[2] : c.type === 'survivor' ? COL.acid[2] : COL.ion[2],
        COL.out,
      );
    });
  }
  // The names of the rooms stand on signs at their doors, the same as on the Captain's radar.
  if (!it.trade) {
    it.rooms.forEach((r, i) => {
      if (!r.door) return;
      const text = roomName(i) + (it.uses[i] ? '  ' + it.uses[i] : '');
      const w = font.width(text);
      rect(ctx, Math.round(r.door.x - w / 2 - 3), r.door.y - 14, w + 6, 9, '#14141c', COL.line);
      font.draw(ctx, text, r.door.x, r.door.y - 12, COL.dim, { align: 'c' });
    });
  }
  if (it.pin) {
    ctx.strokeStyle = '#9cf7b0';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(it.pin.x) - 5.5, Math.round(it.pin.y) - 5.5, 11, 11);
    font.draw(ctx, "CAPTAIN'S MARK", it.pin.x, it.pin.y - 15, '#9cf7b0', { align: 'c' });
  }
  for (const b of it.bolts) drawInsideBolt(ctx, b);
  for (const g of it.grenades) drawGrenade(ctx, g, state.time);
  for (const f of it.flares) drawFlare(ctx, f, state.time);
  for (const f of it.fx) effect(ctx, f);
  if (fx) fx.inside.draw(ctx);
  ctx.restore();
}

export function drawBoarding(ctx, state, view, assets) {
  const { font } = assets;
  const player = playerById(state, view.playerId);
  const place = findDock(state, player.inside);
  const it = place.interior;
  const me = it.avatars.find((a) => a.player === player.id);
  const fx = view.fx;
  const origin = insideOrigin(it, me);
  drawStars(ctx, { x: place.x * 0.2 - origin.x * 0.3, y: place.y * 0.2 - origin.y * 0.3 }, fx, state.sector);
  ctx.save();
  ctx.translate(origin.x + (fx ? fx.offset.x : 0), origin.y + (fx ? fx.offset.y : 0));
  drawFloor(ctx, state, place, me, assets, fx, origin);
  ctx.restore();

  const where = label(ctx, font, 8, 8, it.trade ? 'ON THE STATION' : 'BOARDING', {
    fg: COL.out,
    bg: COL.white,
    border: null,
  });
  label(ctx, font, where + 4, 8, 'AWAY FROM YOUR POST', { fg: COL.faint });
  const gift = {
    gunner: 'GUNNER  ·  RIFLE HITS HARDER  ·  ONE CHARGE',
    engineer: 'ENGINEER  ·  QUIET AND QUICK WITH LOCKS AND MACHINES',
    captain: 'CAPTAIN  ·  RADAR  ·  SEES INTO THE VAULT',
  }[me && !it.trade ? me.role : ''];
  if (gift) label(ctx, font, 8, 24, gift, { fg: COL.text });
  drawPlaceLine(ctx, font, state, place);
  // An alarm puts a red frame round the picture, so that it is seen at once and without sound. It swells and
  // fades slowly and does not flash, see "Lagar och regler" in HANDOFF.md.
  if (it.mood === 'alarm') {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(state.time * 2.6);
    ctx.strokeStyle = COL.ember[1];
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3);
    ctx.globalAlpha = 1;
  }
  // Only the best enemy alarm reaches the people inside.
  const alarm = level(state.ship, 'alarm') >= 3 && alarmText(state);
  if (alarm) label(ctx, font, VIEW_W / 2 + 60, 24, alarm, { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
  if (!it.trade) {
    const carried = `CARRY  ${me ? me.carry.length : 0} / ${carryMax(state.ship, me)}`;
    label(ctx, font, VIEW_W - 8, 8, carried, { anchor: 'r', fg: COL.ochre[2] });
  }
  const credits = { anchor: 'r', fg: it.trade ? COL.ochre[2] : COL.dim };
  const purse = shownPurse(state, playerById(state, view.playerId));
  label(ctx, font, VIEW_W - 8, it.trade ? 8 : 22, `${ROLE_NAME[purse.role]}  ${purse.credits} CR`, credits);
  // The plan of the place sits under the lines in the corner.
  const carries = me && player.backTo === 'captain' && !it.trade;
  const near = carries ? hunters(it).filter((e) => dist(e.x, e.y, me.x, me.y) < B.RADAR_REACH * TILE) : [];
  drawPlan(ctx, font, it, me, VIEW_W - 11 - deckBox(it, me || it.entry).w, it.trade ? 28 : 42, near);
  if (!it.trade) drawHunters(ctx, it, origin);
  if (it.trade) drawVisitorHud(ctx, font);
  else drawBoarderHud(ctx, font, state, view, player, place, me, origin);
}
