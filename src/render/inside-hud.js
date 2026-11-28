// What is drawn round the edge while inside (D-227): the line at the top, the small plan, arrows to enemies off
// the screen, and the boarder's health, weapons and keys.
import { COL, VIEW_H, VIEW_W } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, tileAt, useTarget } from '../sim/boarding.js';
import { bar, label, rect } from './draw.js';
import { crewHpMax, hullMax, shieldMax } from '../sim/upgrades.js';
import { hunters } from './radar.js';
import { deckBox } from './boarding.js';
import { keeper, tilesOf } from './keep.js';

const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

// A small plan of the whole place in the corner, since it no longer fits on the screen. It is drawn once and
// kept, and drawn again when a door has opened.
const plans = keeper();

export function drawPlan(ctx, font, it, me, x, y, radar = []) {
  // On a base only the floor the player is on.
  const box = deckBox(it, me || it.entry);
  const ox = box.x0;
  let kept = plans.get(it);
  const text = kept && kept.tiles === it.tiles ? kept.text : tilesOf(it);
  if (!kept || kept.text !== text) {
    const canvas = document.createElement('canvas');
    canvas.width = it.w;
    canvas.height = it.h;
    const g = canvas.getContext('2d');
    for (let ty = 0; ty < it.h; ty++)
      for (let tx = 0; tx < it.w; tx++) {
        const c = tileAt(it, tx, ty);
        if (c === ' ') continue;
        g.fillStyle =
          c === '#'
            ? '#3a3d4e'
            : c === 'L'
              ? COL.ochre[2]
              : c === 'A'
                ? COL.acid[2]
                : c === 'X'
                  ? '#0d0d14'
                  : c === 'K'
                    ? '#2c2d3b'
                    : '#1d1f2b';
        g.fillRect(tx, ty, 1, 1);
      }
    kept = { canvas, tiles: it.tiles, text };
    plans.set(it, kept);
  }
  rect(ctx, x - 3, y - 3, box.w + 6, it.h + 6, COL.panel, COL.line);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(kept.canvas, ox, 0, box.w, it.h, x, y, box.w, it.h);
  ctx.globalAlpha = 1;
  if (box.deck) font.draw(ctx, box.deck.name, x + box.w / 2, y + it.h + 5, COL.dim, { align: 'c' });
  // Everything below is placed on the floor that is shown, and what is on other floors is left out.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, box.w, it.h);
  ctx.clip();
  x -= ox;
  ctx.fillStyle = COL.acid[2];
  ctx.fillRect(x + Math.floor(it.entry.x / TILE) - 1, y + Math.floor(it.entry.y / TILE) - 1, 2, 2);
  if (it.pin) {
    ctx.fillStyle = '#9cf7b0';
    ctx.fillRect(x + Math.floor(it.pin.x / TILE) - 1, y + Math.floor(it.pin.y / TILE) - 1, 3, 3);
  }
  // The mainframe is on the plan, so that it can be found.
  if (it.mainframe) {
    ctx.fillStyle = it.trade || !it.mood ? COL.acid[1] : COL.ember[1];
    ctx.fillRect(x + Math.floor(it.mainframe.x / TILE) - 1, y + Math.floor(it.mainframe.y / TILE) - 1, 3, 3);
  }
  // With the plan read from the mainframe, everyone sees the guards, the cameras, the alarmed doors and the loot.
  if (it.plan) {
    const dot = (p, col, n = 2) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + Math.floor(p.x / TILE) - 1, y + Math.floor(p.y / TILE) - 1, n, n);
    };
    for (const l of it.loot) dot(l, COL.ochre[3], 1);
    for (const c of it.cameras) dot(c, COL.ion[2]);
    for (const d of it.alarmed) if (!d.off) dot(d, COL.ochre[2]);
    for (const g of it.guards) if (!g.down) dot(g, COL.ember[1]);
  }
  // The Captain carries a small radar: enemies that are after someone show on the plan when they are near.
  for (const e of radar) {
    ctx.fillStyle = COL.ember[2];
    ctx.fillRect(x + Math.floor(e.x / TILE) - 1, y + Math.floor(e.y / TILE) - 1, 2, 2);
  }
  if (me) {
    ctx.fillStyle = COL.white;
    ctx.fillRect(x + Math.floor(me.x / TILE) - 1, y + Math.floor(me.y / TILE) - 1, 3, 3);
  }
  ctx.restore();
}

// Enemies that are after someone and are not on the screen: an arrow at the edge says where they come from.
export function drawHunters(ctx, it, origin) {
  for (const e of hunters(it)) {
    const sx = origin.x + e.x,
      sy = origin.y + e.y;
    if (sx > 0 && sx < VIEW_W && sy > 30 && sy < VIEW_H - 34) continue;
    const cx = VIEW_W / 2,
      cy = VIEW_H / 2;
    const dx = sx - cx,
      dy = sy - cy;
    const k = Math.min((cx - 10) / Math.abs(dx || 1e-6), (cy - 40) / Math.abs(dy || 1e-6));
    ctx.save();
    ctx.translate(cx + dx * k, cy + dy * k);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = COL.ember[2];
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

const CROSSHAIR = [
  [-6, 0, 3, 1],
  [4, 0, 3, 1],
  [0, -6, 1, 3],
  [0, 4, 1, 3],
];

// The line at the top that says where the player is and what is going on there.
export function drawPlaceLine(ctx, font, state, place) {
  const it = place.interior;
  const x = VIEW_W / 2 + 60;
  // Boarders in the crew's own station: how long until they have the mainframe.
  const s = state.siege;
  if (s && s.inside && s.station === place.id) {
    const left = s.stage === 'hack' ? B.SIEGE_HACK_TIME - s.t : B.SIEGE_BOARD_TIME + B.SIEGE_HACK_TIME - s.t;
    const text = `BOARDERS INSIDE  ·  ${Math.ceil(s.boarders)} LEFT  ·  MAINFRAME LOST IN ${fmt(Math.max(0, left))}`;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
    return;
  }
  if (it.trade) {
    const text = `${place.name}  ·  ${place.align.toUpperCase()} STATION`;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: place.align === 'friendly' ? COL.engineer : COL.text });
  } else if (place.kind === 'station') {
    const mine = place.side === 'crew';
    const text = mine
      ? `${place.name} IS YOURS`
      : it.power
        ? `${place.name}  ·  POWER FIRST, THEN THE MAINFRAME`
        : `${place.name}  ·  POWER OUT`;
    const col = mine ? COL.acid : COL.ember;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
    // How the place takes the crew: on its guard, or hunting them.
    if (it.mood === 'alarm')
      label(ctx, font, x, 24, 'ALARM  ·  THEY ARE HUNTING YOU', {
        anchor: 'c',
        fg: COL.ember[2],
        border: COL.ember[0],
      });
    else if (it.mood)
      label(ctx, font, x, 24, 'LOCKDOWN  ·  STAY OUT OF SIGHT', {
        anchor: 'c',
        fg: COL.ochre[2],
        border: COL.ochre[0],
      });
    // The call for help, with the time until help docks (R-1168).
    if (it.call) {
      const text = `HELP CALLED  ·  DOCKS IN ${fmt(Math.max(0, it.call.left))}  ·  STOP IT IN COMMS ON TOP`;
      label(ctx, font, x, 40, text, { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
    } else if (it.pressure && it.pressure.relief) {
      label(ctx, font, x, 40, 'HELP IS COMING IN TO DOCK', { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
    }
  } else if (it.timer !== null) {
    // A ship knocked out with its crew aboard has no reactor running down (F-081).
    const col = it.timer < 30 ? COL.ember : COL.ochre;
    const text = 'REACTOR UNSTABLE   ' + fmt(Math.max(0, it.timer));
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
  }
}

// On a trading station: where to go. What can be done at a desk or the airlock shows as a button, see actions.js.
export function drawVisitorHud(ctx, font) {
  const keys = 'W A S D MOVE  ·  WALK UP TO A DESK TO TRADE, OR TO THE AIRLOCK TO LEAVE';
  font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
}

// While boarding: health, weapons, how the ship is doing, and a prompt for what the use key does here.
export function drawBoarderHud(ctx, font, state, view, player, place, me, origin) {
  const it = place.interior;
  const ship = state.ship;
  rect(ctx, 8, 332, 100, 22, COL.panel, COL.line);
  font.draw(ctx, 'HP', 12, 340, COL.dim);
  bar(ctx, 28, 340, 74, player.hp / crewHpMax(ship), player.hp < 40 ? COL.ember[1] : COL.engineer);
  let x = label(ctx, font, 114, 336, 'TELEPORT READY', { fg: COL.ion[2], border: COL.ion[0] }) + 6;
  const tranq = me && me.weapon === 'tranq';
  const held = tranq ? 'TRANQ  ' + me.darts : 'RIFLE';
  x = label(ctx, font, x, 336, held, { fg: COL.out, bg: tranq ? COL.ion[2] : COL.gunner, border: null, pad: 6 }) + 4;
  if (me && me.darts > 0 && !tranq) x = label(ctx, font, x, 336, 'R  TRANQ  ' + me.darts) + 4;
  else if (tranq) x = label(ctx, font, x, 336, 'R  RIFLE') + 4;
  const grenades = me ? me.grenades : 0;
  x = label(ctx, font, x, 336, 'GRENADES  ' + grenades, { fg: grenades ? COL.text : COL.faint }) + 4;
  if (me && me.charges) x = label(ctx, font, x, 336, 'C  CHARGES  ' + me.charges) + 4;
  if (me && me.sentries) x = label(ctx, font, x, 336, 'T  TURRET') + 4;
  // What is carried for the dark has a line of its own above the rest.
  if (me && it.dark) {
    const lamp = label(ctx, font, 114, 320, me.lamp ? 'F  LAMP' : 'F  LAMP OFF', {
      fg: me.lamp ? COL.text : COL.faint,
    });
    if (me.flares) label(ctx, font, lamp + 4, 320, 'Q  FLARES  ' + me.flares);
  }
  x += 6;
  font.draw(ctx, 'SHIP', x, 334, COL.dim);
  bar(ctx, x + 26, 333, 50, ship.shield / shieldMax(ship), COL.ion[1], 5);
  bar(ctx, x + 26, 340, 50, ship.hull / hullMax(ship), COL.steel[2], 5);
  if (state.time - ship.lastHit < 1.5) font.draw(ctx, 'UNDER FIRE', x, 346, COL.ember[2]);
  if (x < 470) {
    const keys = x < 400 ? 'W A S D MOVE  ·  CLICK FIRE  ·  G GRENADE' : 'G GRENADE';
    font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  }
  // What is being worked on shows where it happens. The key for it is on a button, see actions.js.
  const at = me && useTarget(it, me);
  if (it.hacking && it.hack && it.mainframe) {
    const look = { anchor: 'c', fg: COL.acid[2], border: COL.acid[0] };
    const what = ['READING THE PLAN', 'TAKING CONTROL', 'TAKING THE STATION'][it.hack.level];
    label(ctx, font, origin.x + it.mainframe.x, origin.y + it.mainframe.y - 30, what, look);
  }
  if (it.blackout > 0) {
    const look = { anchor: 'c', fg: COL.ion[2], border: COL.ion[0] };
    label(ctx, font, VIEW_W / 2 + 60, 40, `CAMERAS AND TURRETS OFF  ·  ${Math.ceil(it.blackout)} S`, look);
  }
  if (at && at.type === 'door' && it.cutting) {
    const look = { anchor: 'c', fg: COL.ochre[2], border: COL.ochre[0] };
    label(ctx, font, origin.x + at.door.x, origin.y + at.door.y + 22, 'CUTTING THE LOCK', look);
  }
  ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of CROSSHAIR)
    ctx.fillRect(Math.round(view.mouse.x) + dx, Math.round(view.mouse.y) + dy, w, h);
}
