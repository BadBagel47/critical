// Boarding: the top-down interior of a wreck, with guards, turrets, loot and the teleporter.
import { B } from './balance.js';
import { createWreck, currentSector } from './sectors.js';
import { addThing, removeThing, thingsOf, dockTargets, findDock } from './things.js';
import { makeVessel } from './vessels.js';
import { playerById, leavePost, returnToPost } from './players.js';
import { takeOver, isTrading } from './stations.js';
import { has, fuelMax, crewHpMax, carryMax, rifleDmg, teleCooldown, breakinBonus } from './upgrades.js';
import { damageShip } from './damage.js';
import { createBreakin, stepBreakin } from './breakin.js';
import { clamp, forward, headingTo, angleDiff, turnToward, dist, rand, randRange, TAU } from './util.js';

export const TILE = 16,
  IW = 32,
  IH = 18;
const SOLID = new Set(['#', 'L']);
export const tileAt = (it, tx, ty) => (tx < 0 || ty < 0 || tx >= IW || ty >= IH ? '#' : it.tiles[ty * IW + tx]);
const solidAt = (it, x, y) => SOLID.has(tileAt(it, Math.floor(x / TILE), Math.floor(y / TILE)));

export function blocked(it, x, y, r) {
  const x0 = Math.floor((x - r) / TILE),
    x1 = Math.floor((x + r) / TILE),
    y0 = Math.floor((y - r) / TILE),
    y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (!SOLID.has(tileAt(it, tx, ty))) continue;
      const nx = clamp(x, tx * TILE, tx * TILE + TILE),
        ny = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
    }
  return false;
}
function move(it, e, dx, dy, r) {
  if (dx && !blocked(it, e.x + dx, e.y, r)) e.x += dx;
  if (dy && !blocked(it, e.x, e.y + dy, r)) e.y += dy;
}
export function los(it, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1),
    n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) if (solidAt(it, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

// ---------- generation ----------
export function createInterior(state, wreck) {
  const tiles = new Array(IW * IH).fill('#');
  const set = (tx, ty, c) => {
    tiles[ty * IW + tx] = c;
  };
  const s1 = 9 + Math.floor(rand(state) * 4),
    s2 = 19 + Math.floor(rand(state) * 5);
  const rooms = [];
  for (const [r0, r1] of [
    [0, 6],
    [11, 17],
  ])
    for (const [c0, c1] of [
      [0, s1],
      [s1, s2],
      [s2, IW - 1],
    ])
      rooms.push({ c0, c1, r0, r1 });
  for (const rm of rooms)
    for (let ty = rm.r0 + 1; ty < rm.r1; ty++) for (let tx = rm.c0 + 1; tx < rm.c1; tx++) set(tx, ty, '.');
  for (let ty = 7; ty <= 10; ty++) for (let tx = 1; tx < IW - 1; tx++) set(tx, ty, '.');
  const vault = [2, 5, 1, 4][Math.floor(rand(state) * 4)];
  rooms.forEach((rm, i) => {
    const dc = rm.c0 + 2 + Math.floor(rand(state) * Math.max(1, rm.c1 - rm.c0 - 4)),
      row = rm.r0 === 0 ? 6 : 11;
    set(dc, row, i === vault ? 'L' : '.');
    set(dc + 1, row, i === vault ? 'L' : '.');
    rm.door = { x: (dc + 1) * TILE, y: row * TILE + TILE / 2 };
  });
  set(0, 8, 'A');
  set(0, 9, 'A');
  const it = {
    tiles,
    rooms,
    vault,
    entry: { x: 1.5 * TILE, y: 9 * TILE },
    timer: null,
    live: false,
    doorCut: 0,
    doorOpen: false,
    terminal: null,
    takeover: 0,
    trade: false,
    desks: [],
    civilians: [],
    avatars: [],
    guards: [],
    turrets: [],
    sentries: [],
    loot: [],
    bolts: [],
    grenades: [],
    fx: [],
  };
  const taken = [];
  const spot = (rm, minX = 0) => {
    for (let n = 0; n < 40; n++) {
      const x = (rm.c0 + 1.5 + rand(state) * (rm.c1 - rm.c0 - 2)) * TILE,
        y = (rm.r0 + 1.5 + rand(state) * (rm.r1 - rm.r0 - 2)) * TILE;
      if (x < minX || taken.some((t) => dist(t.x, t.y, x, y) < 18)) continue;
      taken.push({ x, y });
      return { x, y };
    }
    const p = { x: ((rm.c0 + rm.c1 + 1) / 2) * TILE, y: ((rm.r0 + rm.r1 + 1) / 2) * TILE };
    taken.push(p);
    return p;
  };
  // A friendly or neutral station is a place to walk around and trade in, with nothing to fight.
  if (isTrading(wreck)) {
    makeTrade(state, it);
    return it;
  }
  const corridor = { c0: 0, c1: IW - 1, r0: 6, r1: 11 };
  const d = wreck.difficulty,
    open = rooms.map((_, i) => i).filter((i) => i !== vault);
  const pick = () => rooms[open[Math.floor(rand(state) * open.length)]];
  for (let i = 0; i < d + 1; i++) {
    const p = i === 0 ? spot(corridor, 13 * TILE) : spot(pick(), 6 * TILE);
    it.guards.push({
      id: state.nextId++,
      x: p.x,
      y: p.y,
      hp: B.GUARD_HP,
      heading: rand(state) * TAU,
      mode: 'idle',
      cool: 1,
      home: { ...p },
      goal: { ...p },
      wait: 1,
      lost: 0,
    });
  }
  for (let i = 0; i < d - 1; i++) {
    const p = i === 0 ? { x: (IW - 2.5) * TILE, y: (8 + rand(state) * 2) * TILE } : spot(pick(), 8 * TILE);
    taken.push(p);
    it.turrets.push({ id: state.nextId++, x: p.x, y: p.y, hp: B.TURRET_HP, heading: Math.PI * 1.5, cool: 1 });
  }
  const credits = (range) => Math.round(randRange(state, range[0], range[1]) / 5) * 5;
  for (let i = 0; i < 2 + d; i++) {
    const p = spot(pick());
    it.loot.push({ id: state.nextId++, type: 'cell', ...p });
  }
  for (let i = 0; i < 2 + d; i++) {
    const p = spot(pick());
    it.loot.push({ id: state.nextId++, type: 'crate', value: credits(B.CRATE_CREDITS), ...p });
  }
  for (let i = 0; i < 2; i++) {
    const p = spot(rooms[vault]);
    it.loot.push({ id: state.nextId++, type: 'crate', value: credits(B.VAULT_CREDITS), ...p });
  }
  {
    const p = spot(rooms[vault]);
    it.loot.push({ id: state.nextId++, type: 'cell', ...p });
  }
  // Vaults sometimes hold a star chart or a spare slot. A station vault always has a chart if one is missing.
  const missing = state.sectors
    ? currentSector(state)
        .links.filter((l) => !state.charts.includes(l))
        .sort((a, b) => b - a)
    : [];
  if (missing.length && (wreck.kind === 'station' || rand(state) < 0.35)) {
    const p = spot(rooms[vault]);
    it.loot.push({ id: state.nextId++, type: 'chart', sector: missing[0], ...p });
  }
  if (rand(state) < 0.2) {
    const p = spot(rooms[vault]);
    it.loot.push({ id: state.nextId++, type: 'part', slot: rand(state) < 0.5 ? 'hard' : 'system', ...p });
  }
  // A hostile station is taken over from the terminal in its vault.
  if (wreck.kind === 'station') {
    it.terminal = spot(rooms[vault]);
    for (let i = 0; i < 2; i++) {
      const p = spot(pick(), 8 * TILE);
      it.guards.push({
        id: state.nextId++,
        x: p.x,
        y: p.y,
        hp: B.GUARD_HP,
        heading: 0,
        mode: 'idle',
        cool: 1,
        home: { ...p },
        goal: { ...p },
        wait: 1,
        lost: 0,
      });
    }
  }
  return it;
}

// Turn an interior into a trading floor: doors open, desks to trade at, people walking about.
export function makeTrade(state, it) {
  it.trade = true;
  it.doorOpen = true;
  it.terminal = null;
  it.timer = null;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
  it.guards = [];
  it.turrets = [];
  it.bolts = [];
  it.grenades = [];
  const mid = (rm) => ((rm.c0 + rm.c1 + 1) / 2) * TILE;
  it.desks = [
    { type: 'services', x: 5.5 * TILE, y: 7.5 * TILE },
    { type: 'shipyard', x: mid(it.rooms[1]), y: 2.5 * TILE },
    { type: 'armory', x: mid(it.rooms[4]), y: 15.5 * TILE },
  ];
  it.civilians = [];
  for (let i = 0; i < 5; i++) {
    const rm = i < 2 ? { c0: 8, c1: IW - 2, r0: 6, r1: 11 } : it.rooms[(i * 2) % it.rooms.length];
    const x = (rm.c0 + 2 + rand(state) * (rm.c1 - rm.c0 - 3)) * TILE,
      y = (rm.r0 + 2 + rand(state) * (rm.r1 - rm.r0 - 3)) * TILE;
    it.civilians.push({
      id: state.nextId++,
      x,
      y,
      heading: rand(state) * TAU,
      home: { x, y },
      goal: { x, y },
      wait: rand(state) * 3,
    });
  }
}

// ---------- players ----------
export const anyoneInside = (state, wreckId) =>
  state.players.some((p) => (wreckId === undefined ? p.inside !== null : p.inside === wreckId));

export function tryBoard(state, playerId) {
  const player = playerById(state, playerId);
  const ship = state.ship;
  if (!player || player.inside !== null || !ship.docked) return false;
  const wreck = findDock(state, ship.docked);
  if (!wreck) return false;
  // Friendly and neutral stations are open to walk into. No lock, no teleporter needed.
  if (isTrading(wreck)) {
    if (!wreck.interior) wreck.interior = createInterior(state, wreck);
    const floor = wreck.interior;
    if (!floor.trade) makeTrade(state, floor);
    floor.live = true;
    player.inside = wreck.id;
    leavePost(player);
    floor.avatars.push({
      player: playerId,
      x: floor.entry.x + 6,
      y: floor.entry.y - 6 + floor.avatars.length * 8,
      heading: Math.PI / 2,
      carry: [],
      cool: 0,
      grenades: 0,
      charges: 0,
      sentries: 0,
    });
    state.events.push({ type: 'boarded', player: playerId, wreck: wreck.id, trade: true });
    return true;
  }
  if (wreck.lock !== 'open') {
    // The docking lock has to be bypassed first. Opening the panel starts the clock.
    if (!wreck.breakin) wreck.breakin = createBreakin(state, wreck, breakinBonus(ship));
    wreck.breakin.started = true;
    state.events.push({ type: 'breakinOpened', player: playerId, wreck: wreck.id });
    return false;
  }
  if (player.tele > 0) {
    state.events.push({ type: 'teleCharging', player: playerId, left: player.tele });
    return false;
  }
  if (player.lockedOut === wreck.id) {
    state.events.push({ type: 'lockedOut', player: playerId });
    return false;
  }
  if (!wreck.interior) wreck.interior = createInterior(state, wreck);
  const it = wreck.interior;
  if (wreck.kind === 'wreck' && it.timer === null) it.timer = B.REACTOR_TIME[wreck.difficulty];
  it.live = true;
  player.inside = wreck.id;
  leavePost(player);
  it.avatars.push({
    player: playerId,
    x: it.entry.x + 6,
    y: it.entry.y - 6 + it.avatars.length * 8,
    heading: Math.PI / 2,
    carry: [],
    cool: 0,
    grenades: B.GRENADES,
    charges: has(ship, 'charge') ? B.CHARGES : 0,
    sentries: has(ship, 'sentry') ? 1 : 0,
  });
  state.events.push({ type: 'boarded', player: playerId, wreck: wreck.id });
  return true;
}

function leave(state, it, av, teleported) {
  const player = playerById(state, av.player);
  it.avatars = it.avatars.filter((a) => a !== av);
  if (teleported) {
    // What was carried stays where the player stood.
    for (const item of av.carry)
      it.loot.push({ ...item, x: av.x + randRange(state, -6, 6), y: av.y + randRange(state, -6, 6) });
    player.lockedOut = player.inside;
    player.tele = teleCooldown(state.ship);
    player.hp = Math.max(1, player.hp);
    it.fx.push({ type: 'teleport', x: av.x, y: av.y, t: 0, dur: 0.6 });
    state.events.push({ type: 'teleported', player: av.player });
  } else {
    state.events.push({ type: 'returned', player: av.player });
  }
  player.inside = null;
  returnToPost(state, player);
}

// The ship is leaving: everyone still inside is teleported home, at the usual cost.
export function teleportAllHome(state, targetId) {
  const target = findDock(state, targetId);
  if (!target || !target.interior) return 0;
  const inside = [...target.interior.avatars];
  // Leaving a trading station is just walking out. Anywhere else it is a teleport.
  for (const av of inside) leave(state, target.interior, av, !target.interior.trade);
  return inside.length;
}

function deposit(state, av) {
  if (!av.carry.length) return;
  let fuel = 0,
    credits = 0;
  for (const item of av.carry) {
    if (item.type === 'cell') fuel += B.CELL_FUEL;
    else if (item.type === 'chart') {
      if (state.charts.includes(item.sector)) credits += 60;
      else {
        state.charts.push(item.sector);
        state.events.push({ type: 'chart', sector: item.sector });
      }
    } else if (item.type === 'part') {
      state.ship.slots[item.slot]++;
      state.events.push({ type: 'slotFound', slot: item.slot });
    } else credits += item.value;
  }
  state.ship.fuel = Math.min(fuelMax(state.ship), state.ship.fuel + fuel);
  state.credits += credits;
  state.events.push({ type: 'deposit', player: av.player, fuel, credits, count: av.carry.length });
  av.carry = [];
}

function hurtAvatar(state, it, av, dmg) {
  const player = playerById(state, av.player);
  player.hp -= dmg;
  it.fx.push({ type: 'hit', x: av.x, y: av.y, t: 0, dur: 0.2 });
  if (player.hp <= B.TELEPORT_HP) leave(state, it, av, true);
}

function explode(state, it, g) {
  it.fx.push({ type: 'boom', x: g.x, y: g.y, t: 0, dur: 0.45, size: B.GRENADE_RADIUS });
  state.events.push({ type: 'grenade' });
  const inBlast = (e) => dist(e.x, e.y, g.x, g.y) < B.GRENADE_RADIUS && los(it, g.x, g.y, e.x, e.y);
  for (const e of it.guards) if (inBlast(e)) e.hp -= B.GRENADE_DMG;
  for (const e of it.turrets) if (inBlast(e)) e.hp -= B.GRENADE_DMG;
  for (const av of [...it.avatars]) if (inBlast(av)) hurtAvatar(state, it, av, B.GRENADE_SELF_DMG);
}

function stepAvatar(state, it, av, cmd, dt) {
  const player = playerById(state, av.player);
  av.cool = Math.max(0, av.cool - dt);
  if (!cmd) return;
  if (cmd.aim) av.heading = headingTo(cmd.aim.x - av.x, cmd.aim.y - av.y);
  const mx = clamp(cmd.mx || 0, -1, 1),
    my = clamp(cmd.my || 0, -1, 1),
    len = Math.hypot(mx, my);
  if (len > 0) {
    const sp = (B.CREW_SPEED_FOOT * (1 - B.CARRY_SLOW * av.carry.length) * dt) / Math.max(1, len);
    move(it, av, mx * sp, my * sp, B.CREW_RADIUS);
  }
  if (it.trade) {
    // Weapons stay holstered on a trading station. The use key works the desks and the airlock.
    if (cmd.usePressed && av.x < TILE * 2.2 && Math.abs(av.y - it.entry.y) < TILE * 1.5) {
      leave(state, it, av, false);
      return;
    }
    const desk = cmd.usePressed ? it.desks.find((d) => dist(d.x, d.y, av.x, av.y) < 20) : null;
    if (desk) state.events.push({ type: 'deskUsed', player: av.player, desk: desk.type });
    return;
  }
  if (cmd.fire && av.cool <= 0) {
    const f = forward(av.heading + randRange(state, -0.02, 0.02));
    it.bolts.push({
      x: av.x + f.x * 7,
      y: av.y + f.y * 7,
      vx: f.x * B.RIFLE_SPEED,
      vy: f.y * B.RIFLE_SPEED,
      ttl: B.RIFLE_TTL,
      owner: 'crew',
      dmg: rifleDmg(state.ship),
    });
    av.cool = B.RIFLE_INTERVAL;
    state.events.push({ type: 'rifle' });
  }
  if (cmd.grenade && av.grenades > 0) {
    let tx = cmd.grenade.x,
      ty = cmd.grenade.y;
    const d = dist(av.x, av.y, tx, ty);
    if (d > B.GRENADE_RANGE) {
      tx = av.x + ((tx - av.x) * B.GRENADE_RANGE) / d;
      ty = av.y + ((ty - av.y) * B.GRENADE_RANGE) / d;
    }
    // A grenade stops at the first wall on its way.
    const n = Math.ceil(dist(av.x, av.y, tx, ty) / 4);
    let ex = av.x,
      ey = av.y;
    for (let i = 1; i <= n; i++) {
      const x = av.x + ((tx - av.x) * i) / n,
        y = av.y + ((ty - av.y) * i) / n;
      if (solidAt(it, x, y)) break;
      ex = x;
      ey = y;
    }
    av.grenades--;
    it.grenades.push({
      x: av.x,
      y: av.y,
      sx: av.x,
      sy: av.y,
      tx: ex,
      ty: ey,
      t: 0,
      dur: Math.max(0.15, dist(av.x, av.y, ex, ey) / B.GRENADE_SPEED),
      fuse: B.GRENADE_FUSE,
    });
  }
  // Loot is picked up by walking over it.
  for (const item of [...it.loot]) {
    if (av.carry.length >= carryMax(state.ship)) break;
    if (dist(item.x, item.y, av.x, av.y) < 9) {
      av.carry.push(item);
      it.loot = it.loot.filter((l) => l !== item);
      state.events.push({ type: 'pickup', item: item.type });
    }
  }
  const atAirlock = tileAt(it, Math.floor(av.x / TILE), Math.floor(av.y / TILE)) === 'A' || av.x < TILE * 1.2;
  if (atAirlock) deposit(state, av);
  if (cmd.usePressed && av.x < TILE * 2.2 && Math.abs(av.y - it.entry.y) < TILE * 1.5) {
    deposit(state, av);
    leave(state, it, av, false);
    return;
  }
  if (cmd.deploy && av.sentries > 0) {
    av.sentries--;
    it.sentries.push({ id: state.nextId++, x: av.x, y: av.y, hp: B.SENTRY_HP, heading: av.heading, cool: 0.3 });
    state.events.push({ type: 'sentryDown' });
  }
  // Hold the use key next to the locked door to cut it open.
  if (!it.doorOpen) {
    const door = it.rooms[it.vault].door,
      near = dist(av.x, av.y, door.x, door.y) < 22;
    if (cmd.charge && av.charges > 0 && dist(av.x, av.y, door.x, door.y) < 28) {
      // A breaching charge opens the door at once, and every guard comes running.
      av.charges--;
      it.doorOpen = true;
      it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
      it.fx.push({ type: 'boom', x: door.x, y: door.y, t: 0, dur: 0.45, size: 24 });
      for (const g of it.guards) {
        g.mode = 'alert';
        g.lost = 0;
        g.seen = { x: door.x, y: door.y };
      }
      state.events.push({ type: 'breached' });
    }
    if (cmd.use && near) {
      it.doorCut += dt / B.DOOR_CUT_TIME;
      it.cutting = true;
      if (it.doorCut >= 1) {
        it.doorOpen = true;
        it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
        state.events.push({ type: 'doorOpen' });
      }
    }
  }
  if (it.terminal && it.doorOpen && cmd.use && dist(av.x, av.y, it.terminal.x, it.terminal.y) < 16) {
    it.takeover += dt / B.TAKEOVER_TIME;
    it.hacking = true;
    if (it.takeover >= 1) {
      const st = thingsOf(state, 'station').find((x) => x.interior === it);
      if (st) takeOver(state, st);
      it.terminal = null;
      it.desks = [];
    }
  }
  if (player.hp <= 0) leave(state, it, av, true);
}

function stepGuard(state, it, g, dt) {
  g.cool -= dt;
  let target = null,
    best = B.GUARD_SIGHT;
  for (const av of it.avatars) {
    const d = dist(g.x, g.y, av.x, av.y);
    if (d < best && los(it, g.x, g.y, av.x, av.y)) {
      best = d;
      target = av;
    }
  }
  if (target) {
    g.mode = 'alert';
    g.lost = 0;
    g.seen = { x: target.x, y: target.y };
    g.heading = turnToward(g.heading, headingTo(target.x - g.x, target.y - g.y), 5 * dt);
    const f = forward(g.heading),
      dir = best > 95 ? 1 : best < 55 ? -0.7 : 0;
    if (dir) move(it, g, f.x * B.GUARD_SPEED * dir * dt, f.y * B.GUARD_SPEED * dir * dt, B.CREW_RADIUS);
    if (g.cool <= 0 && Math.abs(angleDiff(headingTo(target.x - g.x, target.y - g.y), g.heading)) < 0.2) {
      const s = forward(g.heading + randRange(state, -0.09, 0.09));
      it.bolts.push({
        x: g.x + s.x * 7,
        y: g.y + s.y * 7,
        vx: s.x * B.GUARD_BOLT_SPEED,
        vy: s.y * B.GUARD_BOLT_SPEED,
        ttl: 1.4,
        owner: 'enemy',
        dmg: B.GUARD_DMG,
      });
      g.cool = B.GUARD_COOLDOWN * randRange(state, 0.85, 1.2);
    }
    return;
  }
  if (g.mode === 'alert') {
    // Walk to where the intruder was last seen, then give up.
    g.lost += dt;
    const d = dist(g.x, g.y, g.seen.x, g.seen.y);
    if (d > 6 && g.lost < 4) {
      g.heading = turnToward(g.heading, headingTo(g.seen.x - g.x, g.seen.y - g.y), 5 * dt);
      const f = forward(g.heading);
      move(it, g, f.x * B.GUARD_SPEED * dt, f.y * B.GUARD_SPEED * dt, B.CREW_RADIUS);
    } else if (g.lost >= 4 || d <= 6) {
      g.mode = 'idle';
      g.home = { x: g.x, y: g.y };
      g.goal = { ...g.home };
      g.wait = 1;
    }
    return;
  }
  g.wait -= dt;
  if (g.wait <= 0) {
    g.goal = { x: g.home.x + randRange(state, -30, 30), y: g.home.y + randRange(state, -22, 22) };
    g.wait = randRange(state, 2, 4.5);
  }
  if (dist(g.x, g.y, g.goal.x, g.goal.y) > 4) {
    g.heading = turnToward(g.heading, headingTo(g.goal.x - g.x, g.goal.y - g.y), 4 * dt);
    const f = forward(g.heading);
    move(it, g, f.x * B.GUARD_SPEED * 0.45 * dt, f.y * B.GUARD_SPEED * 0.45 * dt, B.CREW_RADIUS);
  }
}

// A turret set down by a boarder. It shoots at guards and turrets it can see.
function stepSentry(state, it, s, dt) {
  s.cool -= dt;
  let target = null,
    best = B.SENTRY_RANGE;
  for (const e of [...it.guards, ...it.turrets]) {
    const d = dist(s.x, s.y, e.x, e.y);
    if (d < best && los(it, s.x, s.y, e.x, e.y)) {
      best = d;
      target = e;
    }
  }
  if (!target) return;
  const want = headingTo(target.x - s.x, target.y - s.y);
  s.heading = turnToward(s.heading, want, 4 * dt);
  if (s.cool <= 0 && Math.abs(angleDiff(want, s.heading)) < 0.12) {
    const f = forward(s.heading);
    it.bolts.push({
      x: s.x + f.x * 8,
      y: s.y + f.y * 8,
      vx: f.x * B.RIFLE_SPEED,
      vy: f.y * B.RIFLE_SPEED,
      ttl: B.RIFLE_TTL,
      owner: 'crew',
      dmg: B.SENTRY_DMG,
    });
    s.cool = B.SENTRY_COOLDOWN;
  }
}

function stepTurret(state, it, t, dt) {
  t.cool -= dt;
  let target = null,
    best = B.TURRET_SIGHT;
  for (const av of it.avatars) {
    const d = dist(t.x, t.y, av.x, av.y);
    if (d < best && los(it, t.x, t.y, av.x, av.y)) {
      best = d;
      target = av;
    }
  }
  if (!target) return;
  const want = headingTo(target.x - t.x, target.y - t.y);
  t.heading = turnToward(t.heading, want, B.TURRET_TURN * dt);
  if (t.cool <= 0 && Math.abs(angleDiff(want, t.heading)) < 0.1) {
    const f = forward(t.heading);
    it.bolts.push({
      x: t.x + f.x * 9,
      y: t.y + f.y * 9,
      vx: f.x * B.TURRET_BOLT_SPEED,
      vy: f.y * B.TURRET_BOLT_SPEED,
      ttl: 1.4,
      owner: 'enemy',
      dmg: B.TURRET_DMG,
    });
    t.cool = B.TURRET_COOLDOWN;
  }
}

function stepInterior(state, wreck, cmds, dt) {
  const it = wreck.interior;
  it.cutting = false;
  it.hacking = false;
  for (const f of it.fx) f.t += dt;
  it.fx = it.fx.filter((f) => f.t < f.dur);
  for (const av of [...it.avatars]) stepAvatar(state, it, av, cmds.away ? cmds.away[av.player] : null, dt);
  for (const g of it.guards) stepGuard(state, it, g, dt);
  for (const c of it.civilians) {
    c.wait -= dt;
    if (c.wait <= 0) {
      c.goal = { x: c.home.x + randRange(state, -40, 40), y: c.home.y + randRange(state, -26, 26) };
      c.wait = randRange(state, 2, 6);
    }
    if (dist(c.x, c.y, c.goal.x, c.goal.y) > 4) {
      c.heading = turnToward(c.heading, headingTo(c.goal.x - c.x, c.goal.y - c.y), 4 * dt);
      const f = forward(c.heading);
      move(it, c, f.x * 22 * dt, f.y * 22 * dt, B.CREW_RADIUS);
    }
  }
  for (const t of it.turrets) stepTurret(state, it, t, dt);
  for (const s of it.sentries) stepSentry(state, it, s, dt);
  for (const b of it.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (solidAt(it, b.x, b.y)) {
      b.ttl = 0;
      it.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.12 });
      continue;
    }
    if (b.owner === 'crew') {
      const e =
        it.guards.find((g) => dist(g.x, g.y, b.x, b.y) < 6.5) || it.turrets.find((t) => dist(t.x, t.y, b.x, b.y) < 7.5);
      if (e) {
        e.hp -= b.dmg;
        b.ttl = 0;
        it.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.15 });
        if (e.mode) {
          e.mode = 'alert';
          e.lost = 0;
          e.seen = e.seen || { x: b.x - b.vx * 0.2, y: b.y - b.vy * 0.2 };
        }
      }
    } else {
      const av = it.avatars.find((a) => dist(a.x, a.y, b.x, b.y) < 6),
        sentry = it.sentries.find((x) => dist(x.x, x.y, b.x, b.y) < 7);
      if (av) {
        b.ttl = 0;
        hurtAvatar(state, it, av, b.dmg);
      } else if (sentry) {
        b.ttl = 0;
        sentry.hp -= b.dmg;
        it.fx.push({ type: 'hit', x: b.x, y: b.y, t: 0, dur: 0.15 });
      }
    }
  }
  it.bolts = it.bolts.filter((b) => b.ttl > 0);
  for (const g of it.grenades) {
    if (g.t < g.dur) {
      g.t = Math.min(g.dur, g.t + dt);
      const u = g.t / g.dur;
      g.x = g.sx + (g.tx - g.sx) * u;
      g.y = g.sy + (g.ty - g.sy) * u;
    } else {
      g.fuse -= dt;
      if (g.fuse <= 0) {
        explode(state, it, g);
        g.done = true;
      }
    }
  }
  it.grenades = it.grenades.filter((g) => !g.done);
  for (const e of [...it.guards, ...it.turrets])
    if (e.hp <= 0) {
      it.fx.push({ type: 'boom', x: e.x, y: e.y, t: 0, dur: 0.4, size: 14 });
      state.events.push({ type: 'guardDown' });
    }
  it.guards = it.guards.filter((g) => g.hp > 0);
  it.turrets = it.turrets.filter((t) => t.hp > 0);
  it.sentries = it.sentries.filter((x) => x.hp > 0);
  if (it.timer !== null) {
    it.timer -= dt;
    if (it.timer <= 0) blowUp(state, wreck);
  }
}

function blowUp(state, wreck) {
  const it = wreck.interior;
  const ship = state.ship;
  if (it) for (const av of [...it.avatars]) leave(state, it, av, true);
  for (const p of state.players) if (p.lockedOut === wreck.id) p.lockedOut = null;
  state.fx.push({ type: 'boom', x: wreck.x, y: wreck.y, t: 0, dur: 1.3, size: 90 });
  removeThing(state, wreck);
  state.events.push({ type: 'wreckExploded', wreck: wreck.id });
  if (ship.docked === wreck.id) {
    ship.docked = null;
    const f = forward(headingTo(ship.x - wreck.x, ship.y - wreck.y));
    ship.vx = f.x * 60;
    ship.vy = f.y * 60;
    damageShip(state, B.WRECK_BLAST_DMG, { x: ship.x, y: ship.y });
  }
  // A new wreck drifts in somewhere else so there is always something to find.
  const a = rand(state) * TAU;
  const d = randRange(state, 1300, 2200);
  if (thingsOf(state, 'wreck').length >= 3) return;
  const x = ship.x + Math.sin(a) * d;
  const y = ship.y - Math.cos(a) * d;
  addThing(state, createWreck(state, x, y, 1 + Math.floor(rand(state) * 3)));
}

// A station does not blow up. It fights back: fighters scramble and the lock resets.
function fightBack(state, st) {
  st.breakin = null;
  for (let i = 0; i < 2; i++) state.vessels.push(makeVessel(state, 'fighter', st.x + (i ? 60 : -60), st.y - 60));
  state.events.push({ type: 'stationFightsBack', name: st.name });
}

// A cargo pod sounds an alarm that brings the next pirate wave at once.
function soundAlarm(state, pod) {
  pod.breakin = null;
  state.spawn.timer = 0;
  state.events.push({ type: 'podAlarm' });
}

// A pod has no inside. Its cargo is taken straight on board.
function lootPod(state, pod) {
  const ship = state.ship;
  const credits = Math.round(randRange(state, B.POD_CREDITS[0], B.POD_CREDITS[1]) / 5) * 5;
  const fuel = rand(state) < 0.5 ? B.CELL_FUEL : 0;
  state.credits += credits;
  ship.fuel = Math.min(fuelMax(ship), ship.fuel + fuel);
  const part = rand(state) < 0.15 ? (rand(state) < 0.5 ? 'hard' : 'system') : null;
  if (part) ship.slots[part]++;
  removeThing(state, pod);
  state.known = state.known.filter((k) => k.id !== pod.id);
  if (ship.docked === pod.id) ship.docked = null;
  state.fx.push({ type: 'hit', x: pod.x, y: pod.y, t: 0, dur: 0.4 });
  state.events.push({ type: 'podLooted', credits, fuel, part });
}

// What happens to each kind of thing when its lock is failed, and when it is opened without an inside to board.
const LOCK_FAILED = { wreck: blowUp, station: fightBack, pod: soundAlarm };
const LOCK_OPENED = { pod: lootPod };

export function stepBoarding(state, cmds, dt) {
  for (const id of (cmds.system && cmds.system.board) || []) tryBoard(state, id);
  for (const p of state.players) p.tele = Math.max(0, p.tele - dt);
  for (const target of dockTargets(state)) {
    const result = stepBreakin(state, target, cmds, dt);
    if (result === 'failed') LOCK_FAILED[target.kind](state, target);
    else if (result === 'solved' && LOCK_OPENED[target.kind]) LOCK_OPENED[target.kind](state, target);
    else if (target.interior && target.interior.live) stepInterior(state, target, cmds, dt);
  }
  // Everyone gets their health back once the whole crew is on the ship again.
  if (!anyoneInside(state)) for (const p of state.players) p.hp = crewHpMax(state.ship);
}
