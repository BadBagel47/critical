// What is on the floor of an inside besides the floor itself (D-227): people, desks, the mainframe and the
// consoles of a base, what is fired and thrown, effects, and what sneaking needs to be seen.
import { COL } from '../config.js';
import { B } from '../sim/balance.js';
import { TILE, cameraWay } from '../sim/boarding.js';
import { rect, sprite } from './draw.js';
import { flareLevel, litArea } from './light.js';
import { dist, forward } from '../sim/util.js';
import { awake } from '../sim/guards.js';
import { drawFigure } from './figures.js';
import { WALL } from './inside-tiles.js';

// The shadow on the floor under something that stands on it.
export function shadow(ctx, x, y, r) {
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COL.out;
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 2, r, r * 0.8, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function glow(ctx, x, y, r, color, a) {
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

export function effect(ctx, f) {
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
    // The figure comes apart in sparks that rise up the beam (F-151).
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 3 ? COL.ion[2] : COL.ion[3];
      ctx.fillRect(f.x + ((i * 7) % 11) - 5, f.y + 6 - u * 30 - (i % 4) * 4, 1, 1);
    }
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

// The docked frigate and the tunnel from it into the airlock, outside the hull at the way in.
export function drawTunnel(ctx, img, it) {
  const e = it.entry;
  ctx.save();
  ctx.translate(e.x, e.y);
  // Turned so that up is the way in.
  ctx.rotate(Math.atan2(e.nx, -e.ny));
  rect(ctx, -18, 8, 36, 50, WALL[0], COL.out);
  rect(ctx, -14, 8, 28, 50, '#191a25');
  ctx.fillStyle = WALL[0];
  for (let y = 14; y < 58; y += 10) ctx.fillRect(-14, y, 28, 1);
  sprite(ctx, img.frigate, 0, 58 + 44);
  ctx.restore();
}

// A trading desk with someone behind it.
export function drawDesk(ctx, img, font, place, desk) {
  const [name, color] = DESK[desk.type](place);
  const up = true;
  glow(ctx, desk.x, desk.y, 16, color, 0.1);
  rect(ctx, desk.x - 18, desk.y - 5, 36, 10, '#2a2c3a', COL.out);
  rect(ctx, desk.x - 17, desk.y - 4, 34, 2, '#44475a');
  rect(ctx, desk.x - 14, desk.y - 1, 8, 4, color);
  rect(ctx, desk.x + 6, desk.y - 1, 3, 3, COL.acid[1]);
  sprite(ctx, img.boarder, desk.x, desk.y + (up ? -12 : 12), up ? Math.PI : 0);
  font.draw(ctx, name, desk.x, desk.y + (up ? 10 : -16), color, { align: 'c' });
}

// The station's mainframe: a tall cabinet with a screen, red at an enemy and green at a station that is the
// crew's or trades with them. A bar under it shows how far a hack has come.
export function drawMainframe(ctx, place, it, time) {
  const t = it.mainframe;
  const own = place.side === 'crew' || it.trade;
  const col = own ? COL.acid : COL.ember;
  glow(ctx, t.x, t.y, 14, col[1], 0.16);
  rect(ctx, t.x - 8, t.y - 8, 16, 16, '#1c1c28', COL.out);
  rect(ctx, t.x - 6, t.y - 6, 12, 6, Math.floor(time * 3) % 2 ? col[1] : col[0]);
  for (let i = 0; i < 3; i++)
    rect(ctx, t.x - 6 + i * 4, t.y + 3, 2, 2, i === Math.floor(time * 4) % 3 ? COL.ochre[2] : COL.dim);
  if (!it.hack) return;
  ctx.fillStyle = COL.acid[2];
  ctx.fillRect(t.x - 8, t.y + 10, Math.round(16 * Math.min(1, it.work[it.hack.level])), 2);
}

export function drawInsideBolt(ctx, b) {
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
export function drawGrenade(ctx, g, time) {
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

// A flare: a short stick with a white-hot end that throws sparks.
export function drawFlare(ctx, f, time) {
  const lv = flareLevel(f.burn, B.FLARE_FADE, time);
  glow(ctx, f.x, f.y, 8, '#ffcf8a', 0.22 * lv);
  ctx.fillStyle = '#5a2a22';
  ctx.fillRect(f.x - 2, f.y, 4, 2);
  ctx.globalAlpha = Math.min(1, 0.3 + lv);
  ctx.fillStyle = '#fff6e0';
  ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
  ctx.fillStyle = COL.ochre[3];
  for (let i = 0; i < 3; i++) {
    const a = time * 9 + i * 2.1 + f.burn;
    const r = 3 + ((time * 14 + i * 5) % 5);
    ctx.fillRect(f.x + Math.cos(a) * r, f.y - 1 + Math.sin(a) * r, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// What sneaking needs to be seen: where each guard that has noticed nobody is looking, how sure the guards
// are of having seen the player, and which guards sleep. It is drawn over the dark, since it is there to be
// planned by. A guard sees far in the light and only near in the dark, so the near part is drawn stronger.
export function drawWatch(ctx, font, state, it, me) {
  for (const g of it.guards) {
    if (!awake(g)) {
      if (g.sleep > 0) font.draw(ctx, 'Z', g.x + 5, g.y - 15, COL.ion[2]);
      continue;
    }
    if (g.mode === 'alert') continue;
    const f = forward(g.heading);
    const way = Math.atan2(f.y, f.x);
    const wedge = (r, alpha) => {
      const area = litArea(it, g.x, g.y, r, way, B.GUARD_FOV);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COL.ember[2];
      ctx.beginPath();
      ctx.moveTo(area[0][0], area[0][1]);
      for (let i = 1; i < area.length; i++) ctx.lineTo(area[i][0], area[i][1]);
      ctx.closePath();
      ctx.fill();
    };
    wedge(B.GUARD_SIGHT, 0.06);
    wedge(B.GUARD_SIGHT_DARK, 0.14);
    ctx.globalAlpha = 1;
  }
  // A turret watches a narrow cone, and an awake one follows within a wider arc about the way it rests.
  for (const t of it.turrets) {
    if (t.out > 0) {
      font.draw(ctx, 'OUT  ' + Math.ceil(t.out), t.x, t.y - 18, COL.ion[2], { align: 'c' });
      continue;
    }
    if (t.turned > 0) {
      font.draw(ctx, 'YOURS  ' + Math.ceil(t.turned), t.x, t.y - 18, COL.acid[2], { align: 'c' });
      continue;
    }
    if (it.blackout > 0) {
      font.draw(ctx, 'OFF', t.x, t.y - 18, COL.ion[2], { align: 'c' });
      continue;
    }
    const hot = t.hot > 0 || it.mood === 'alarm';
    const f = forward(t.rest);
    const area = litArea(it, t.x, t.y, B.TURRET_SIGHT, Math.atan2(f.y, f.x), hot ? B.TURRET_ARC : B.TURRET_FOV);
    ctx.globalAlpha = hot ? 0.07 : 0.16;
    ctx.fillStyle = COL.ember[1];
    ctx.beginPath();
    ctx.moveTo(area[0][0], area[0][1]);
    for (let i = 1; i < area.length; i++) ctx.lineTo(area[i][0], area[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // A camera, and what it sees right now. It sweeps, and hurts nobody.
  for (const c of it.cameras) {
    const live = it.mood !== 'alarm' && it.blackout <= 0;
    if (live) {
      const f = forward(cameraWay(state, c));
      const area = litArea(it, c.x, c.y, B.CAMERA_RANGE, Math.atan2(f.y, f.x), B.CAMERA_FOV);
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = COL.ion[2];
      ctx.beginPath();
      ctx.moveTo(area[0][0], area[0][1]);
      for (let i = 1; i < area.length; i++) ctx.lineTo(area[i][0], area[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    rect(ctx, c.x - 3, c.y - 3, 6, 6, '#1c1c28', COL.out);
    rect(ctx, c.x - 1, c.y - 1, 2, 2, live ? COL.ion[2] : COL.dim);
  }
  // An alarmed door has a small lamp in its frame. It is seen from close by, and a Captain's radar shows it
  // from further off. One that the Engineer has switched off is green.
  const reach = me && me.role === 'captain' ? B.RADAR_REACH * TILE : 76;
  for (const d of it.alarmed) {
    if (!me || dist(me.x, me.y, d.x, d.y) > reach) continue;
    const lit = d.off || state.time % 1.4 < 0.9;
    rect(ctx, d.x - 2, d.y - 2, 4, 4, d.off ? COL.acid[2] : lit ? COL.ember[2] : COL.ember[0], COL.out);
    if (!d.off) font.draw(ctx, 'ALARMED', d.x, d.y - 12, COL.ember[2], { align: 'c' });
  }
  // The reactor of a wreck, which the Engineer can steady.
  if (it.reactor && me && dist(me.x, me.y, it.reactor.x, it.reactor.y) < 70) {
    const text = it.reactor.steadied ? 'REACTOR  ·  STEADIED' : 'REACTOR';
    font.draw(ctx, text, it.reactor.x, it.reactor.y - 16, it.reactor.steadied ? COL.acid[2] : COL.ochre[2], {
      align: 'c',
    });
  }
  // A Captain who stands at the vault door sees what is behind it, before anyone decides how to open it.
  if (me && me.role === 'captain' && !it.doorOpen && !it.trade) {
    const room = it.rooms[it.vault];
    if (dist(me.x, me.y, room.door.x, room.door.y) < 60) {
      const inside = it.loot.filter(
        (l) =>
          l.x >= room.c0 * TILE && l.x < (room.c1 + 1) * TILE && l.y >= room.r0 * TILE && l.y < (room.r1 + 1) * TILE,
      );
      const count = (type) => inside.filter((l) => l.type === type).length;
      const parts = [
        [count('crate'), 'CRATES'],
        [count('cell'), 'FUEL'],
        [count('chart'), 'STAR CHART'],
        [count('part'), 'SPARE SLOT'],
      ]
        .filter(([n]) => n)
        .map(([n, name]) => (n > 1 ? `${n} ${name}` : name));
      font.draw(ctx, 'IN THE VAULT  ·  ' + parts.join('  ·  '), room.door.x, room.door.y - 22, COL.captain, {
        align: 'c',
      });
    }
  }
  // Over the player: how close the guards are to being sure.
  if (me && me.spotted > 0) {
    rect(ctx, me.x - 9, me.y - 20, 18, 4, COL.out, COL.out);
    rect(ctx, me.x - 8, me.y - 19, Math.round(16 * me.spotted), 2, me.spotted > 0.66 ? COL.ember[2] : COL.ochre[2]);
  }
}

// A guard, by its kind (F-126): a drone is a small machine with four rotors, a heavy guard is bigger and darker,
// a watchman wears a yellow cap, a technician carries a blue tool, and a boarder on the crew's own station has a
// red band.
export function drawGuard(ctx, img, g, time) {
  if (g.kind === 'drone') {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.heading);
    ctx.fillStyle = COL.out;
    const spin = time * 30;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      ctx.fillRect(Math.round(Math.cos(a) * 4) - 1, Math.round(Math.sin(a) * 4) - 1, 3, 3);
      ctx.fillStyle = Math.floor(spin + i) % 2 ? COL.steel[2] : COL.steel[1];
    }
    rect(ctx, -2, -2, 4, 4, COL.steel[1], COL.out);
    ctx.fillStyle = COL.ember[2];
    ctx.fillRect(-1, -3, 2, 1);
    ctx.restore();
    return;
  }
  const mark = { heavy: COL.steel[0], watchman: COL.ochre[2], tech: COL.ion[2] }[g.kind];
  // A guard has just fired when its weapon has only just begun to cool.
  const firing = g.mode === 'alert' && g.cool > B.GUARD_COOLDOWN * 0.85 - 0.08;
  drawFigure(ctx, img.guard, g, time, {
    hp: g.hp,
    firing,
    down: g.down,
    size: g.kind === 'heavy' ? 1.35 : 0,
    mark: (c) => {
      if (mark) rect(c, -1, -1, 2, 2, mark);
      if (g.boarder) rect(c, -3, 1, 6, 1, COL.ember[2]);
    },
  });
}

// On a trading station the doors to the staff rooms are marked, so that a visitor knows where not to go.
export function drawStaffDoors(ctx, font, it) {
  for (const i of it.staff) {
    const d = it.rooms[i].door;
    if (!d) continue;
    for (let k = -6; k < 6; k += 4) rect(ctx, d.x + k, d.y - 1, 2, 2, COL.ochre[2]);
    font.draw(ctx, 'STAFF', d.x, d.y - 10, COL.ochre[2], { align: 'c' });
  }
}

// What stands in a base besides the mainframe: the switchgear in the basement, the drone hangar and the comms.
export function drawConsoles(ctx, font, it, time, me) {
  const near = (p) => me && dist(me.x, me.y, p.x, p.y) < 90;
  const b = it.breaker;
  if (b) {
    rect(ctx, b.x - 10, b.y - 8, 20, 16, '#24262f', COL.out);
    for (let i = 0; i < 4; i++) {
      const on = !b.out && Math.floor(time * 2 + i) % 3 !== 0;
      rect(ctx, b.x - 8 + i * 4, b.y - 6, 3, 5, on ? COL.acid[1] : '#1a1b22');
    }
    ctx.fillStyle = b.out ? COL.ember[0] : COL.ochre[2];
    ctx.fillRect(b.x - 8, b.y + 2, 16, 2);
    if (b.out && b.loud && Math.floor(time * 6) % 3 === 0) {
      ctx.fillStyle = COL.ochre[3];
      ctx.fillRect(b.x + ((time * 37) % 14) - 7, b.y - 9, 1, 1);
    }
    if (near(b))
      font.draw(ctx, b.out ? 'SWITCHGEAR  ·  OUT' : 'SWITCHGEAR', b.x, b.y - 20, COL.ochre[2], { align: 'c' });
  }
  const h = it.hangar;
  if (h) {
    rect(ctx, h.x - 16, h.y - 16, 32, 32, '#1e2028', COL.out);
    ctx.fillStyle = h.out ? '#3a2a22' : COL.ochre[1];
    for (let k = -14; k < 14; k += 6) {
      ctx.fillRect(h.x + k, h.y - 15, 3, 2);
      ctx.fillRect(h.x + k, h.y + 13, 3, 2);
    }
    if (h.out) {
      ctx.fillStyle = COL.out;
      ctx.fillRect(h.x - 10, h.y - 2, 20, 4);
    }
    if (near(h))
      font.draw(ctx, h.out ? 'DRONE HANGAR  ·  WRECKED' : 'DRONE HANGAR', h.x, h.y - 26, COL.ochre[2], { align: 'c' });
  }
  const c = it.comms;
  if (c) {
    rect(ctx, c.x - 9, c.y - 6, 18, 12, '#24262f', COL.out);
    const calling = !!it.call;
    rect(ctx, c.x - 7, c.y - 4, 14, 5, calling && time % 1 < 0.5 ? COL.ember[2] : COL.acid[1]);
    if (near(c) || calling) {
      const text = calling ? 'COMMS  ·  CALLING FOR HELP' : 'COMMS';
      font.draw(ctx, text, c.x, c.y - 18, calling ? COL.ember[2] : COL.acid[2], { align: 'c' });
    }
  }
}
