// The boarding view: the inside of a wreck seen from above.
import { VIEW_W, COL } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, IW, IH, tileAt } from '../sim/boarding.js';
import { dist } from '../sim/util.js';
import { sprite, rect, label, bar } from './draw.js';
import { drawStars } from './space.js';
import { findDock } from '../sim/things.js';
import { playerById } from '../sim/players.js';
import { hullMax, shieldMax, level, carryMax, crewHpMax } from '../sim/upgrades.js';
import { alarmText } from './hud.js';

export const OX = 112,
  OY = 38;
const WALL = ['#2a2c3a', '#44475a', '#666a7e'];
const solid = (c) => c === '#' || c === 'L';
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

function drawTiles(ctx, it) {
  for (let ty = 0; ty < IH; ty++)
    for (let tx = 0; tx < IW; tx++) {
      const c = tileAt(it, tx, ty),
        x = tx * TILE,
        y = ty * TILE;
      if (c === '.' || c === 'A') {
        const corridor = ty >= 7 && ty <= 10;
        rect(
          ctx,
          x,
          y,
          TILE,
          TILE,
          corridor ? ((tx + ty) % 2 ? '#1e2029' : '#21232d') : (tx + ty) % 2 ? '#1a1b26' : '#1d1e2a',
        );
        ctx.fillStyle = '#13131c';
        ctx.fillRect(x, y + TILE - 1, TILE, 1);
        ctx.fillRect(x + TILE - 1, y, 1, TILE);
        ctx.fillStyle = '#2c2d3b';
        ctx.fillRect(x + 2, y + 2, 1, 1);
        ctx.fillRect(x + TILE - 4, y + 2, 1, 1);
        if (c === 'A') {
          ctx.fillStyle = COL.acid[1];
          ctx.fillRect(x + 12, y + 1, 2, TILE - 2);
        }
        if (corridor && ty === 9) {
          ctx.fillStyle = '#2c3d40';
          ctx.fillRect(x + 5, y - 1, 6, 2);
        }
      }
    }
  for (let ty = 0; ty < IH; ty++)
    for (let tx = 0; tx < IW; tx++) {
      const c = tileAt(it, tx, ty),
        x = tx * TILE,
        y = ty * TILE;
      if (!solid(c)) continue;
      const below = tileAt(it, tx, ty + 1),
        open = (dx, dy) =>
          !solid(tileAt(it, tx + dx, ty + dy)) && tx + dx >= 0 && tx + dx < IW && ty + dy >= 0 && ty + dy < IH;
      rect(ctx, x, y, TILE, TILE, WALL[1]);
      if (c === 'L') {
        rect(ctx, x, y + 3, TILE, 10, '#1c1c28', COL.out);
        for (let k = 0; k < TILE; k += 6) {
          ctx.fillStyle = COL.ochre[1];
          ctx.fillRect(x + k, y + 6, 3, 4);
        }
        if (it.doorCut > 0) {
          ctx.fillStyle = COL.ochre[3];
          ctx.fillRect(x, y + 13, Math.round(TILE * Math.min(1, it.doorCut)), 2);
        }
        continue;
      }
      if (open(0, -1)) {
        ctx.fillStyle = WALL[2];
        ctx.fillRect(x, y, TILE, 1);
      }
      if (below === '.' || below === 'A') {
        rect(ctx, x, y + 7, TILE, 9, WALL[0]);
        ctx.fillStyle = COL.out;
        ctx.fillRect(x, y + 7, TILE, 1);
        rect(ctx, x + 3, y + 10, 10, 3, '#1c1c28');
        ctx.fillStyle = (tx * 7 + ty) % 5 === 0 ? COL.ochre[1] : '#2c2d3b';
        ctx.fillRect(x + 5, y + 11, 1, 1);
      }
      ctx.fillStyle = COL.out;
      if (open(0, -1)) ctx.fillRect(x, y, TILE, 1);
      if (open(0, 1)) ctx.fillRect(x, y + TILE - 1, TILE, 1);
      if (open(-1, 0)) ctx.fillRect(x, y, 1, TILE);
      if (open(1, 0)) ctx.fillRect(x + TILE - 1, y, 1, TILE);
    }
}

function glow(ctx, x, y, r, color, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.globalAlpha = a * 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function effect(ctx, f) {
  const u = f.t / f.dur;
  if (f.type === 'boom') {
    ctx.globalAlpha = Math.max(0, 0.8 - u);
    ctx.fillStyle = COL.ember[3];
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (0.3 + u * 0.7), 0, 7);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - u);
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63,
        r = f.size * u;
      ctx.fillStyle = i % 2 ? COL.ochre[2] : COL.ember[1];
      ctx.fillRect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (f.type === 'teleport') {
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = COL.ion[2];
    ctx.fillRect(f.x - 4 + u * 3, f.y - 40, 8 - u * 6, 46);
    ctx.strokeStyle = COL.ion[3];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4 + u * 14, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = COL.ochre[3];
    ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    ctx.globalAlpha = 1;
  }
}

const DESK = {
  services: () => ['SERVICES', COL.ochre[2]],
  shipyard: (place) => (place.shipyard ? ['SHIPYARD', COL.captain] : ['NO SHIPYARD', COL.faint]),
  armory: () => ['ARMORY', COL.ember[1]],
};
const upper = (o) => o.y < 9 * TILE;
const atAirlockDoor = (it, me) => me.x < TILE * 2.2 && Math.abs(me.y - it.entry.y) < TILE * 1.5;
const CROSSHAIR = [
  [-6, 0, 3, 1],
  [4, 0, 3, 1],
  [0, -6, 1, 3],
  [0, 4, 1, 3],
];

// The docked frigate and the tunnel from it into the airlock.
function drawTunnel(ctx, img) {
  sprite(ctx, img.frigate, 16, OY + 9 * TILE, Math.PI / 2);
  rect(ctx, 60, OY + 8 * TILE - 2, OX - 60, 36, WALL[0], COL.out);
  rect(ctx, 61, OY + 8 * TILE + 2, OX - 61, 28, '#191a25');
  ctx.fillStyle = WALL[0];
  for (let x = 68; x < OX; x += 10) ctx.fillRect(x, OY + 8 * TILE + 2, 1, 28);
}

// A trading desk with someone behind it.
function drawDesk(ctx, img, font, place, desk) {
  const [name, color] = DESK[desk.type](place);
  const up = upper(desk);
  glow(ctx, desk.x, desk.y, 16, color, 0.1);
  rect(ctx, desk.x - 18, desk.y - 5, 36, 10, '#2a2c3a', COL.out);
  rect(ctx, desk.x - 17, desk.y - 4, 34, 2, '#44475a');
  rect(ctx, desk.x - 14, desk.y - 1, 8, 4, color);
  rect(ctx, desk.x + 6, desk.y - 1, 3, 3, COL.acid[1]);
  sprite(ctx, img.boarder, desk.x, desk.y + (up ? -12 : 12), up ? Math.PI : 0);
  font.draw(ctx, name, desk.x, desk.y + (up ? 10 : -16), color, { align: 'c' });
}

// The terminal a hostile station is taken over from.
function drawTerminal(ctx, it, time) {
  const t = it.terminal;
  glow(ctx, t.x, t.y, 12, COL.ember[1], 0.16);
  rect(ctx, t.x - 7, t.y - 6, 14, 12, '#1c1c28', COL.out);
  rect(ctx, t.x - 5, t.y - 4, 10, 5, Math.floor(time * 3) % 2 ? COL.ember[1] : COL.ember[0]);
  rect(ctx, t.x - 5, t.y + 3, 3, 1, COL.ochre[2]);
  if (it.takeover <= 0) return;
  ctx.fillStyle = COL.acid[2];
  ctx.fillRect(t.x - 7, t.y + 8, Math.round(14 * Math.min(1, it.takeover)), 2);
}

function drawInsideBolt(ctx, b) {
  const col = b.owner === 'crew' ? COL.ochre : COL.acid;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = col[1];
  ctx.fillRect(-4, -1, 4, 2);
  ctx.fillStyle = col[3];
  ctx.fillRect(0, -1, 3, 2);
  ctx.restore();
}

// A grenade in the air, with its shadow on the floor. Once it has landed, a ring shows what it will reach.
function drawGrenade(ctx, g, time) {
  const u = g.t / g.dur;
  const lift = Math.sin(u * Math.PI) * 14;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = COL.out;
  ctx.fillRect(g.x - 2, g.y - 1, 4, 3);
  ctx.globalAlpha = 1;
  rect(ctx, g.x - 2, g.y - 2 - lift, 4, 4, '#434557', COL.out);
  ctx.fillStyle = Math.floor(time * 12) % 2 ? COL.ember[2] : COL.ember[0];
  ctx.fillRect(g.x - 1, g.y - 1 - lift, 2, 2);
  if (u < 1) return;
  ctx.strokeStyle = COL.ember[1];
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(g.x, g.y, B.GRENADE_RADIUS, 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Everything on the floor, in the interior's own pixels.
function drawFloor(ctx, state, place, me, assets, fx) {
  const { img, font } = assets;
  const it = place.interior;
  drawTiles(ctx, it);
  for (const desk of it.desks) drawDesk(ctx, img, font, place, desk);
  for (const c of it.civilians) sprite(ctx, img.boarder, c.x, c.y, c.heading);
  for (const l of it.loot) {
    glow(ctx, l.x, l.y, 9, l.type === 'crate' ? COL.ochre[2] : COL.ion[2], 0.14);
    sprite(ctx, img[l.type], l.x, l.y);
  }
  if (it.terminal) drawTerminal(ctx, it, state.time);
  for (const t of it.turrets) sprite(ctx, img.turret_guard, t.x, t.y, t.heading);
  for (const s of it.sentries) {
    glow(ctx, s.x, s.y, 9, COL.ion[2], 0.12);
    sprite(ctx, img.turret_pulse, s.x, s.y, s.heading, 6, 10.5);
  }
  for (const g of it.guards) {
    sprite(ctx, img.guard, g.x, g.y, g.heading);
    if (g.mode !== 'alert') continue;
    ctx.fillStyle = COL.ember[2];
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
    sprite(ctx, img.boarder, a.x, a.y, a.heading);
    a.carry.forEach((c, i) => {
      rect(ctx, a.x - 5 + i * 4, a.y - 13, 3, 3, c.type === 'crate' ? COL.ochre[2] : COL.ion[2], COL.out);
    });
  }
  for (const b of it.bolts) drawInsideBolt(ctx, b);
  for (const g of it.grenades) drawGrenade(ctx, g, state.time);
  for (const f of it.fx) effect(ctx, f);
  if (fx) fx.inside.draw(ctx);
}

// The line at the top that says where the player is and what is going on there.
function drawPlaceLine(ctx, font, place) {
  const it = place.interior;
  const x = VIEW_W / 2 + 60;
  if (it.trade) {
    const text = `${place.name}  ·  ${place.align.toUpperCase()} STATION`;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: place.align === 'friendly' ? COL.engineer : COL.text });
  } else if (place.kind === 'station') {
    const text = it.terminal ? `${place.name}  ·  FIND THE TERMINAL IN THE VAULT` : `${place.name} IS YOURS`;
    const col = it.terminal ? COL.ember : COL.acid;
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
  } else {
    const col = it.timer < 30 ? COL.ember : COL.ochre;
    const text = 'REACTOR UNSTABLE   ' + fmt(Math.max(0, it.timer));
    label(ctx, font, x, 8, text, { anchor: 'c', fg: col[2], border: col[0] });
  }
}

// On a trading station: where to go, and a prompt at the desk or the airlock the player stands by.
function drawVisitorHud(ctx, font, place, me) {
  const it = place.interior;
  const keys = 'W A S D MOVE  ·  F AT A DESK TO TRADE  ·  F AT THE AIRLOCK TO LEAVE';
  font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  if (!me) return;
  const desk = it.desks.find((d) => dist(d.x, d.y, me.x, me.y) < 20);
  if (atAirlockDoor(it, me)) {
    label(ctx, font, OX + me.x + 14, OY + me.y - 26, 'F  BACK TO THE SHIP', { fg: COL.acid[2], border: COL.acid[0] });
  } else if (desk) {
    const text = 'F  ' + DESK[desk.type](place)[0];
    const y = OY + desk.y + (upper(desk) ? 22 : -32);
    label(ctx, font, OX + desk.x, y, text, { anchor: 'c', fg: COL.ochre[3], border: COL.ochre[1] });
  }
}

// While boarding: health, weapons, how the ship is doing, and a prompt for what the use key does here.
function drawBoarderHud(ctx, font, state, view, player, place, me) {
  const it = place.interior;
  const ship = state.ship;
  rect(ctx, 8, 332, 100, 22, COL.panel, COL.line);
  font.draw(ctx, 'HP', 12, 340, COL.dim);
  bar(ctx, 28, 340, 74, player.hp / crewHpMax(ship), player.hp < 40 ? COL.ember[1] : COL.engineer);
  let x = label(ctx, font, 114, 336, 'TELEPORT READY', { fg: COL.ion[2], border: COL.ion[0] }) + 6;
  x = label(ctx, font, x, 336, 'RIFLE', { fg: COL.out, bg: COL.gunner, border: null, pad: 6 }) + 4;
  const grenades = me ? me.grenades : 0;
  x = label(ctx, font, x, 336, 'GRENADES  ' + grenades, { fg: grenades ? COL.text : COL.faint }) + 4;
  if (me && me.charges) x = label(ctx, font, x, 336, 'C  CHARGES  ' + me.charges) + 4;
  if (me && me.sentries) x = label(ctx, font, x, 336, 'T  TURRET') + 4;
  x += 6;
  font.draw(ctx, 'SHIP', x, 334, COL.dim);
  bar(ctx, x + 26, 333, 50, ship.shield / shieldMax(ship), COL.ion[1], 5);
  bar(ctx, x + 26, 340, 50, ship.hull / hullMax(ship), COL.steel[2], 5);
  if (state.time - ship.lastHit < 1.5) font.draw(ctx, 'UNDER FIRE', x, 346, COL.ember[2]);
  if (x < 470) {
    const keys = x < 400 ? 'W A S D MOVE  ·  CLICK FIRE  ·  G GRENADE  ·  F USE' : 'G GRENADE  ·  F USE';
    font.draw(ctx, keys, VIEW_W - 8, 346, COL.faint, { align: 'r' });
  }
  if (me) {
    const door = it.rooms[it.vault].door;
    const atTerminal = it.terminal && it.doorOpen && dist(me.x, me.y, it.terminal.x, it.terminal.y) < 16;
    if (atAirlockDoor(it, me)) {
      label(ctx, font, OX + me.x + 14, OY + me.y - 26, 'F  BACK TO THE SHIP', { fg: COL.acid[2], border: COL.acid[0] });
    } else if (atTerminal) {
      const text = it.hacking ? 'TAKING OVER THE STATION' : 'HOLD F TO TAKE OVER THE STATION';
      const look = { anchor: 'c', fg: COL.acid[2], border: COL.acid[0] };
      label(ctx, font, OX + it.terminal.x, OY + it.terminal.y - 30, text, look);
    } else if (!it.doorOpen && dist(me.x, me.y, door.x, door.y) < 22) {
      const text = it.cutting ? 'CUTTING THE LOCK' : 'HOLD F TO CUT THE LOCK';
      const look = { anchor: 'c', fg: COL.ochre[2], border: COL.ochre[0] };
      label(ctx, font, OX + door.x, OY + door.y + (upper(door) ? 22 : -34), text, look);
    }
  }
  ctx.fillStyle = COL.ochre[3];
  for (const [dx, dy, w, h] of CROSSHAIR)
    ctx.fillRect(Math.round(view.mouse.x) + dx, Math.round(view.mouse.y) + dy, w, h);
}

export function drawBoarding(ctx, state, view, assets) {
  const { img, font } = assets;
  const player = playerById(state, view.playerId);
  const place = findDock(state, player.inside);
  const it = place.interior;
  const me = it.avatars.find((a) => a.player === player.id);
  const fx = view.fx;
  drawStars(ctx, { x: place.x * 0.2, y: place.y * 0.2 }, fx, state.sector);
  drawTunnel(ctx, img);
  ctx.save();
  ctx.translate(OX + (fx ? fx.offset.x : 0), OY + (fx ? fx.offset.y : 0));
  drawFloor(ctx, state, place, me, assets, fx);
  ctx.restore();

  const where = label(ctx, font, 8, 8, it.trade ? 'ON THE STATION' : 'BOARDING', {
    fg: COL.out,
    bg: COL.white,
    border: null,
  });
  label(ctx, font, where + 4, 8, 'AWAY FROM YOUR POST', { fg: COL.faint });
  drawPlaceLine(ctx, font, place);
  // Only the best enemy alarm reaches the people inside.
  const alarm = level(state.ship, 'alarm') >= 3 && alarmText(state);
  if (alarm) label(ctx, font, VIEW_W / 2 + 60, 24, alarm, { anchor: 'c', fg: COL.ember[2], border: COL.ember[0] });
  if (!it.trade) {
    const carried = `CARRY  ${me ? me.carry.length : 0} / ${carryMax(state.ship)}`;
    label(ctx, font, VIEW_W - 8, 8, carried, { anchor: 'r', fg: COL.ochre[2] });
  }
  const credits = { anchor: 'r', fg: it.trade ? COL.ochre[2] : COL.dim };
  label(ctx, font, VIEW_W - 8, it.trade ? 8 : 22, `CREDITS  ${state.credits}`, credits);
  if (it.trade) drawVisitorHud(ctx, font, place, me);
  else drawBoarderHud(ctx, font, state, view, player, place, me);
}
