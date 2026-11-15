import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import {
  setPower,
  powerUsed,
  powerAvailable,
  dockCandidate,
  dockPort,
  fireInterval,
  speedOf,
  weaponPower,
} from '../src/sim/ship.js';
import { damageShip } from '../src/sim/damage.js';
import { thingsOf, portsOf, solidCircles, dockTargets } from '../src/sim/things.js';
import { hurtVessel, makeVessel } from '../src/sim/vessels.js';
import { weaponsOf } from '../src/sim/weapons.js';
import { SHIPS, HULLS } from '../src/sim/kinds.js';
import { summon } from '../src/sim/testing.js';
import { createWreck, jumpBlocked } from '../src/sim/sectors.js';
import { B, SHIP_GEOM, WING_MOUNTS } from '../src/sim/balance.js';
import { headingTo, dist, toWorld, angleDiff } from '../src/sim/util.js';

const wrecks = (s) => thingsOf(s, 'wreck');
const stations = (s) => thingsOf(s, 'station');
const pods = (s) => thingsOf(s, 'pod');
const salvage = (s) => thingsOf(s, 'salvage');
const buoys = (s) => thingsOf(s, 'buoy');

const DT = 1 / 60;
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, typeof cmds === 'function' ? cmds(s) : cmds, DT);
  return s;
};
const quiet = (s) => {
  s.spawn.timer = 1e9;
  return s;
};

test('same seed and commands give the same world', () => {
  const a = run(createState(7), { captain: { throttle: 1, turn: 0.3 } }, 5);
  const b = run(createState(7), { captain: { throttle: 1, turn: 0.3 } }, 5);
  assert.deepEqual(a, b);
});

test('throttle persists when the captain post is left', () => {
  const s = quiet(createState(1));
  run(s, { captain: { throttle: 1 } }, 2);
  const t = s.ship.throttle;
  assert.ok(t > 0.9);
  run(s, { captain: null }, 3);
  assert.equal(s.ship.throttle, t);
  assert.ok(speedOf(s.ship) > 40, 'ship keeps flying');
  assert.ok(s.ship.y < -100, 'ship moved forward (up)');
});

test('more engine power means more speed', () => {
  const fast = quiet(createState(1)),
    slow = quiet(createState(1));
  setPower(slow, 'engines', -2);
  setPower(fast, 'repair', -2);
  setPower(fast, 'engines', 2);
  run(fast, { captain: { throttle: 1 } }, 6);
  run(slow, { captain: { throttle: 1 } }, 6);
  assert.ok(speedOf(fast.ship) > speedOf(slow.ship) * 2);
});

test('power cannot exceed what the reactor gives', () => {
  const s = quiet(createState(1));
  assert.equal(powerUsed(s.ship), B.POWER_TOTAL);
  assert.equal(setPower(s, 'weapons', 1), false, 'no free power');
  assert.equal(setPower(s, 'repair', -1), true);
  assert.equal(setPower(s, 'weapons', 1), true);
  s.ship.nodes.find((n) => n.id === 'reactor').hp = 10;
  run(s, {}, 0.1);
  assert.equal(powerUsed(s.ship), powerAvailable(s.ship));
  assert.equal(powerAvailable(s.ship), B.POWER_TOTAL - 2);
});

test('gunner shoots only with weapon power, and bolts kill a pirate', () => {
  const s = quiet(createState(1));
  s.vessels.push({
    id: 99,
    kind: 'fighter',
    x: 0,
    y: -200,
    vx: 0,
    vy: 0,
    heading: 0,
    hp: SHIPS.fighter.hp,
    mode: 'breakoff',
    timer: 1e9,
    burst: 0,
    burstTimer: 0,
    cool: 1e9,
    veer: 1,
    side: 'pirate',
  });
  // Aim ahead of the target, the way a player has to.
  const aim = (st) => {
    const p = st.vessels[0];
    if (!p) return { gunner: { aim: { x: 0, y: -200 }, fire: true } };
    const t = Math.hypot(p.x - st.ship.x, p.y - st.ship.y) / (B.BOLT_SPEED - SHIPS.fighter.attackSpeed);
    return { gunner: { aim: { x: p.x + p.vx * t, y: p.y + p.vy * t }, fire: true } };
  };
  s.ship.power.weapons = 0;
  run(s, aim, 0.5);
  assert.equal(s.bolts.length, 0);
  assert.equal(fireInterval(s.ship), Infinity);
  s.ship.power.weapons = 2;
  run(s, aim, 6);
  assert.equal(s.kills, 1);
});

test('shield absorbs first, then hull and a node take damage', () => {
  const s = quiet(createState(1));
  damageShip(s, 30);
  assert.equal(s.ship.shield, B.SHIELD_MAX - 30);
  assert.equal(s.ship.hull, B.HULL_MAX);
  damageShip(s, 100);
  assert.equal(s.ship.shield, 0);
  assert.equal(s.ship.hull, B.HULL_MAX - 30);
  assert.ok(s.ship.nodes.some((n) => n.hp < 100));
});

test('shield recharges after a pause, faster with more power', () => {
  const s = quiet(createState(1));
  damageShip(s, 60);
  run(s, {}, B.SHIELD_DELAY - 0.2);
  assert.equal(s.ship.shield, B.SHIELD_MAX - 60);
  run(s, {}, 3);
  assert.ok(s.ship.shield > B.SHIELD_MAX - 60);
});

test('repair crew walks to the node, repairs it, then takes the next in the queue', () => {
  const s = quiet(createState(1));
  s.ship.nodes[4].hp = 40;
  s.ship.nodes[0].hp = 80;
  step(s, { engineer: { repair: { node: 4, queue: false } } }, DT);
  step(s, { engineer: { repair: { node: 0, queue: true } } }, DT);
  assert.deepEqual(s.ship.crew.queue, [4, 0]);
  run(s, {}, 1);
  assert.ok(s.ship.crew.moving, 'crew is on the way');
  assert.equal(s.ship.nodes[4].hp, 40);
  run(s, {}, 30);
  assert.equal(s.ship.nodes[4].hp, 100);
  assert.equal(s.ship.nodes[0].hp, 100);
  assert.deepEqual(s.ship.crew.queue, []);
});

test('no repair power means no repairs', () => {
  const s = quiet(createState(1));
  s.ship.power.repair = 0;
  s.ship.nodes[2].hp = 50;
  step(s, { engineer: { repair: { node: 2, queue: false } } }, DT);
  run(s, {}, 10);
  assert.equal(s.ship.nodes[2].hp, 50);
});

test('docking needs the nose at the port and low speed', () => {
  const s = quiet(createState(1));
  const w = wrecks(s)[0],
    port = portsOf(w)[0];
  // Put the ship so that its nose sits on the port, pointing at the wreck.
  const h = headingTo(w.x - port.x, w.y - port.y);
  s.ship.heading = h;
  s.ship.x = port.x + Math.sin(h) * SHIP_GEOM.nose.y;
  s.ship.y = port.y - Math.cos(h) * SHIP_GEOM.nose.y;
  s.ship.vx = 100;
  assert.equal(dockCandidate(s), null, 'too fast');
  s.ship.vx = 0;
  assert.equal(dockCandidate(s), w);
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, w.id);
  run(s, { captain: { throttle: 1 } }, 1);
  assert.equal(speedOf(s.ship), 0, 'a docked ship stays put');
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, null);
});

test('pause freezes the world for everyone', () => {
  const s = createState(1);
  run(s, { captain: { throttle: 1 } }, 1);
  step(s, { system: { pause: true, by: 'PLAYER 1' } }, DT);
  const snap = JSON.stringify(s);
  run(s, { captain: { throttle: 1 }, gunner: { aim: { x: 0, y: -100 }, fire: true } }, 2);
  assert.equal(JSON.stringify(s), snap);
  assert.equal(s.pausedBy, 'PLAYER 1');
  step(s, { system: { pause: true } }, DT);
  assert.equal(s.paused, false);
});

test('pirates arrive, attack and can destroy an idle ship', () => {
  const s = createState(3);
  // Far from any station, so that nobody else shoots the pirates.
  s.ship.x = 6000;
  s.ship.y = 6000;
  run(s, {}, 240);
  assert.ok(s.spawn.wave >= 3);
  assert.ok(s.ship.hull < B.HULL_MAX, 'ship took damage');
});

test('the ship cannot fly through a wreck, and ramming hurts', () => {
  const s = quiet(createState(1));
  const w = wrecks(s)[0];
  s.ship.x = w.x;
  s.ship.y = w.y + 400;
  s.ship.heading = 0;
  s.ship.vy = -150;
  s.ship.shield = 0;
  s.ship.power.shields = 0;
  s.ship.power.repair = 0;
  run(s, { captain: { throttle: 1 } }, 6);
  assert.ok(Math.hypot(s.ship.x - w.x, s.ship.y - w.y) > 40, 'the ship stays outside the wreck');
  assert.ok(s.ship.hull < B.HULL_MAX, 'ramming damages the hull');
});

// ---------- boarding ----------
import { createInterior, tryBoard, tileAt, TILE, blocked, los } from '../src/sim/boarding.js';
import { inSight, isLit } from '../src/sim/guards.js';

test('docking works from a little way off, and the ship is pulled in until its nose rests at the port', () => {
  const s = quiet(createState(1));
  s.traffic.timer = 1e9;
  const st = stations(s).find((x) => x.home);
  const port = portsOf(st)[1];
  // Off to the side of the port and turned away from it, well outside the old reach of 20.
  s.ship.heading = -0.5;
  s.ship.x = port.x + 26;
  s.ship.y = port.y + 70;
  s.ship.vx = s.ship.vy = 0;
  const nose = () => {
    const f = { x: Math.sin(s.ship.heading), y: -Math.cos(s.ship.heading) };
    return { x: s.ship.x + f.x * -SHIP_GEOM.nose.y, y: s.ship.y + f.y * -SHIP_GEOM.nose.y };
  };
  const off = Math.hypot(nose().x - port.x, nose().y - port.y);
  assert.ok(off > 25 && off <= B.DOCK_RANGE, 'the nose is ' + Math.round(off) + ' from the port');
  assert.equal(dockCandidate(s), st);
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, st.id);
  run(s, {}, 2.5);
  assert.ok(Math.hypot(nose().x - port.x, nose().y - port.y) < 0.5, 'the nose is at the port');
  const facing = headingTo(st.x - port.x, st.y - port.y);
  assert.ok(Math.abs(Math.atan2(Math.sin(s.ship.heading - facing), Math.cos(s.ship.heading - facing))) < 0.01);
  const rest = { x: s.ship.x, y: s.ship.y };
  run(s, {}, 1);
  assert.deepEqual({ x: s.ship.x, y: s.ship.y }, rest, 'and there it stays');
  s.ship.x += 400;
  run(s, {}, 1);
  assert.equal(s.ship.x, rest.x + 400, 'a ship that is nowhere near the port is left alone');
});

test('a wreck has the shape of the ship it was: its own port, its own size and how dangerous it can be', () => {
  const s = quiet(createState(1));
  assert.deepEqual(Object.keys(HULLS), ['hull', 'gunboat', 'freighter']);
  for (const hull of Object.keys(HULLS)) {
    for (const risk of [1, 2, 3]) {
      const w = createWreck(s, 5000, 5000, risk, hull);
      const [low, high] = HULLS[hull].risk;
      assert.equal(w.difficulty, Math.max(low, Math.min(high, risk)), hull + ' asked for risk ' + risk);
    }
  }
  const small = createWreck(s, 7000, 0, 1, 'gunboat');
  const long = createWreck(s, 9000, 0, 2, 'freighter');
  small.heading = long.heading = 0;
  s.things.push(small, long);
  assert.deepEqual(portsOf(small), [{ x: 7000 - 23, y: -4 }]);
  assert.deepEqual(portsOf(long), [{ x: 9000 - 26, y: -3 }]);
  const circles = (w) => solidCircles(s).filter((c) => c.thing === w);
  assert.equal(circles(small).length, 1);
  assert.equal(circles(long).length, 4, 'a long hull takes more circles to cover');
  // Without a hull given, one that can be that dangerous is picked.
  for (let i = 0; i < 20; i++) {
    const w = createWreck(s, 0, 0, 3);
    assert.ok(HULLS[w.hull].risk[1] >= 3, w.hull + ' can be boarded at risk 3');
  }
});

test('a destroyed gunboat or freighter leaves a wreck of its own kind', () => {
  const s = quiet(createState(1));
  s.traffic.timer = 1e9;
  s.ship.x = s.ship.y = 9000;
  const before = wrecks(s).length;
  const boat = makeVessel(s, 'gunboat', 8000, 8000);
  const hauler = makeVessel(s, 'freighter', 8500, 8000, 'charter');
  s.vessels.push(boat, hauler);
  hurtVessel(s, boat, 9999, 'pirate');
  hurtVessel(s, hauler, 9999, 'pirate');
  const left = wrecks(s).slice(before);
  assert.deepEqual(left.map((w) => w.hull).sort(), ['freighter', 'gunboat']);
  assert.ok(left.every((w) => w.lock === 'locked'));
});

test('the nearest port is the one the ship docks at', () => {
  const s = quiet(createState(1));
  const st = stations(s).find((x) => x.home);
  const [first, second] = [portsOf(st)[0], portsOf(st)[3]];
  s.ship.heading = 0;
  s.ship.x = second.x + 30;
  s.ship.y = second.y + 20 - SHIP_GEOM.nose.y;
  assert.equal(dockPort(s).thing, st);
  assert.deepEqual(dockPort(s).port, second);
  assert.notDeepEqual(dockPort(s).port, first);
});

function dockAt(s, w = wrecks(s)[0]) {
  s.ship.docked = w.id;
  s.ship.vx = s.ship.vy = 0;
  w.lock = 'open';
  return w;
}
function boarded(seed = 1) {
  const s = quiet(createState(seed)),
    w = dockAt(s);
  step(s, { system: { board: [0] } }, DT);
  return { s, w, it: w.interior, av: w.interior.avatars[0] };
}

// The middle of the first corridor of a place, and two spots in it with nothing between them.
const hallY = (it) => ((it.halls[0].r0 + it.halls[0].r1 + 1) / 2) * TILE;
function stretch(it, far = 90) {
  const x = ((it.halls[0].c0 + it.halls[0].c1 + 1) / 2) * TILE;
  return [
    { x: x - far / 2, y: hallY(it) },
    { x: x + far / 2, y: hallY(it) },
  ];
}

test('every interior lets the crew reach all loot and enemies', () => {
  const places = [
    { kind: 'wreck', hull: 'gunboat' },
    { kind: 'wreck', hull: 'hull' },
    { kind: 'wreck', hull: 'freighter' },
    { kind: 'station', align: 'hostile', side: 'pirate' },
  ];
  for (let seed = 1; seed <= 40; seed++) {
    const s = createState(seed),
      it = createInterior(s, { ...places[seed % places.length], difficulty: 1 + (seed % 3) });
    const seen = new Set(),
      key = (x, y) => y * it.w + x,
      start = [Math.floor(it.entry.x / TILE), Math.floor(it.entry.y / TILE)];
    const queue = [start];
    seen.add(key(...start));
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if ('# X'.includes(tileAt(it, nx, ny)) || seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny));
        queue.push([nx, ny]);
      }
    }
    for (const e of [...it.loot, ...it.guards, ...it.turrets]) {
      assert.ok(seen.has(key(Math.floor(e.x / TILE), Math.floor(e.y / TILE))), `seed ${seed}: everything is reachable`);
      assert.ok(!blocked(it, e.x, e.y, 4), `seed ${seed}: nothing is stuck in a wall`);
    }
    assert.ok(it.loot.length >= 7 && it.guards.length >= 2);
  }
});

test('boarding needs a docked ship, and loot carried to the airlock becomes fuel and credits', () => {
  const free = quiet(createState(1));
  assert.equal(tryBoard(free, 0), false, 'not docked');
  const { s, it, av } = boarded();
  assert.equal(s.players[0].inside, s.ship.docked);
  it.guards = [];
  it.turrets = [];
  const cell = it.loot.find((l) => l.type === 'cell'),
    crate = it.loot.find((l) => l.type === 'crate');
  av.x = cell.x;
  av.y = cell.y;
  step(s, { away: { 0: {} } }, DT);
  av.x = crate.x;
  av.y = crate.y;
  step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 2);
  const fuel = s.ship.fuel;
  av.x = it.entry.x - 8;
  av.y = it.entry.y;
  step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 0);
  assert.equal(s.ship.fuel, Math.min(B.FUEL_MAX, fuel + B.CELL_FUEL));
  assert.equal(s.credits, crate.value);
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(s.players[0].inside, null, 'the player is back on the ship');
});

test('a player can carry three things at most', () => {
  const { s, it, av } = boarded();
  it.guards = [];
  it.turrets = [];
  for (const item of it.loot.slice(0, 5)) {
    av.x = item.x;
    av.y = item.y;
    step(s, { away: { 0: {} } }, DT);
  }
  assert.equal(av.carry.length, B.CARRY_MAX);
});

test('near death the player is teleported home, drops the loot and cannot go back in', () => {
  const { s, w, it, av } = boarded();
  const item = it.loot[0];
  av.x = item.x;
  av.y = item.y;
  step(s, { away: { 0: {} } }, DT);
  const before = it.loot.length;
  s.players[0].hp = B.TELEPORT_HP + 5;
  it.bolts.push({ x: av.x, y: av.y, vx: 0, vy: 0, ttl: 1, owner: 'enemy', dmg: 8 });
  step(s, { away: { 0: {} } }, DT);
  assert.equal(s.players[0].inside, null);
  assert.equal(it.avatars.length, 0);
  assert.equal(it.loot.length, before + 1, 'the carried item was dropped');
  assert.equal(s.players[0].hp, B.CREW_HP, 'health comes back once everyone is on the ship');
  assert.equal(tryBoard(s, 0), false, 'teleporter is charging');
  s.players[0].tele = 0;
  assert.equal(tryBoard(s, 0), false, 'locked out of this boarding');
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, null);
  dockAt(s, w);
  assert.equal(tryBoard(s, 0), true, 'a new docking is a new boarding');
});

test('undocking with someone inside teleports them home at the usual cost', () => {
  const { s, it, av } = boarded();
  const item = it.loot[0];
  av.x = item.x;
  av.y = item.y;
  step(s, { away: { 0: {} } }, DT);
  const before = it.loot.length;
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, null, 'the ship is free');
  assert.equal(s.players[0].inside, null, 'the player is back on board');
  assert.equal(it.loot.length, before + 1, 'what was carried stays behind');
  assert.ok(s.players[0].tele > B.TELEPORT_COOLDOWN - 1, 'the teleporter has to recharge');
});

test('guards shoot at a player they can see, and the rifle kills them', () => {
  const { s, it, av } = boarded(4);
  it.turrets = [];
  it.guards = it.guards.slice(0, 1);
  const g = it.guards[0];
  const [here, there] = stretch(it);
  Object.assign(av, here);
  // A bold guard, that fights on when it is hurt, looking the boarder's way.
  Object.assign(g, there, { bold: true, route: [], looks: [headingTo(here.x - there.x, here.y - there.y)] });
  g.heading = g.looks[0];
  g.home = { x: g.x, y: g.y };
  // Guards do not hit with every shot, so give this one a little time.
  for (let i = 0; i < 20 && s.players[0].hp === B.CREW_HP && s.players[0].inside !== null; i++)
    run(s, { away: { 0: {} } }, 1);
  assert.ok(s.players[0].hp < B.CREW_HP || s.players[0].inside === null, 'the guard hurt the player');
  if (s.players[0].inside !== null) {
    // The guard steps in and out of cover, so the boarder has to keep aiming at it.
    s.players[0].hp = 10000;
    for (let i = 0; i < 60 * 40 && it.guards.length; i++) {
      step(s, { away: { 0: { aim: { x: g.x, y: g.y }, fire: true } } }, DT);
    }
    assert.equal(it.guards.length, 0);
  }
});

// Whether the guard and the boarder can see each other, sampled over some seconds of a fight.
function sightings(s, it, g, av, secs) {
  let seen = 0,
    hidden = 0;
  for (let i = 0; i < 60 * secs && it.guards.includes(g); i++) {
    step(s, { away: { 0: {} } }, DT);
    if (los(it, g.x, g.y, av.x, av.y)) seen++;
    else hidden++;
  }
  return { seen, hidden };
}

test('a guard fights from cover: it steps out to fire and steps back again', () => {
  const { s, it, av } = boarded(4);
  it.turrets = [];
  it.guards = it.guards.slice(0, 1);
  const g = it.guards[0];
  s.players[0].hp = 10000;
  const [here, there] = stretch(it);
  Object.assign(av, here);
  Object.assign(g, there);
  const before = it.bolts.length;
  const { seen, hidden } = sightings(s, it, g, av, 14);
  assert.equal(g.mode, 'alert');
  assert.ok(seen > 30, 'it shows itself to fire');
  assert.ok(hidden > 30, 'and is out of sight in between');
  assert.ok(s.players[0].hp < 10000 || it.bolts.length > before, 'it has fired');
  assert.ok(!blocked(it, g.x, g.y, B.CREW_RADIUS - 0.5), 'and it never ends up in a wall');
});

test('with two guards on an intruder, one of them goes round another way', () => {
  const { s, it, av } = boarded(4);
  it.turrets = [];
  it.guards = it.guards.slice(0, 2);
  s.players[0].hp = 10000;
  const [here, there] = stretch(it);
  Object.assign(av, here);
  // Both look the boarder's way, so that they notice at once.
  it.guards.forEach((g, i) => {
    const at = { x: there.x + i * 14, y: there.y };
    const way = headingTo(here.x - at.x, here.y - at.y);
    Object.assign(g, at, { route: [], path: [], looks: [way], heading: way, home: { ...at } });
  });
  let flankers = 0;
  for (let i = 0; i < 60 * 5; i++) {
    step(s, { away: { 0: {} } }, DT);
    flankers = Math.max(flankers, it.guards.filter((g) => g.plan === 'flank').length);
  }
  assert.equal(flankers, 1, 'one goes round, and never both');
});

test('a careful guard that is badly hurt falls back, and a bold one fights on', () => {
  for (const bold of [false, true]) {
    const { s, it, av } = boarded(4);
    it.turrets = [];
    it.guards = it.guards.slice(0, 1);
    const g = it.guards[0];
    s.players[0].hp = 10000;
    const [here, there] = stretch(it);
    Object.assign(av, here);
    Object.assign(g, there, { bold, hp: B.GUARD_HP * 0.3 });
    run(s, { away: { 0: {} } }, 3);
    assert.equal(g.plan, bold ? 'fight' : 'retreat');
  }
});

test('a guard that hears another one fire comes to help', () => {
  const { s, it, av } = boarded(4);
  it.turrets = [];
  it.guards = it.guards.slice(0, 2);
  s.players[0].hp = 10000;
  const [here, there] = stretch(it);
  Object.assign(av, here);
  const [first, second] = it.guards;
  Object.assign(first, there);
  // The other one is round a corner, where it sees nothing but is within earshot.
  const room = it.rooms.find(
    (r) => !los(it, r.mid.x, r.mid.y, av.x, av.y) && dist(r.mid.x, r.mid.y, there.x, there.y) < 140,
  );
  assert.ok(room, 'there is a room near by that the boarder cannot see into');
  Object.assign(second, room.mid);
  second.home = { ...room.mid };
  second.goal = { ...room.mid };
  for (let i = 0; i < 60 * 20 && second.mode !== 'alert'; i++) step(s, { away: { 0: {} } }, DT);
  assert.equal(second.mode, 'alert');
});

test('a grenade clears a group of guards', () => {
  const { s, it, av } = boarded();
  it.turrets = [];
  it.guards = it.guards.slice(0, 2);
  // Close by, so that they have no time to get out of the way.
  const [here, there] = stretch(it, 46);
  Object.assign(av, here);
  it.guards.forEach((g, i) => {
    g.x = there.x;
    g.y = there.y + i * 6;
    g.hp = 30;
  });
  step(s, { away: { 0: { grenade: { x: there.x, y: there.y + 3 } } } }, DT);
  assert.equal(av.grenades, B.GRENADES - 1);
  run(s, { away: { 0: {} } }, 2);
  assert.equal(it.guards.length, 0);
});

test('a wreck is dark inside and a station is not', () => {
  const { it, av } = boarded();
  assert.equal(it.dark, true);
  assert.equal(av.lamp, true, 'the lamp is on when the boarder comes in');
  const s = quiet(createState(2));
  const st = s.things.find((t) => t.kind === 'station');
  assert.equal(createInterior(s, st).dark, false);
});

test('the lamp is turned off and on with its key', () => {
  const { s, av } = boarded();
  step(s, { away: { 0: { lampPressed: true } } }, DT);
  assert.equal(av.lamp, false);
  step(s, { away: { 0: {} } }, DT);
  assert.equal(av.lamp, false, 'it stays off until the key is pressed again');
  step(s, { away: { 0: { lampPressed: true } } }, DT);
  assert.equal(av.lamp, true);
});

test('flares are bought in the armory, and a boarder has none without them', () => {
  const { s, it, av } = boarded();
  assert.equal(av.flares, 0);
  step(s, { away: { 0: { flare: { x: av.x + 50, y: av.y } } } }, DT);
  assert.equal(it.flares.length, 0);
});

test('a flare flies to where it was thrown, bounces off a wall, burns for a while and goes out', () => {
  const { s, it, av } = boarded();
  it.guards = [];
  it.turrets = [];
  s.ship.mods.flare = 1;
  av.flares = B.FLARES;
  const [here, there] = stretch(it, 80);
  Object.assign(av, here);
  step(s, { away: { 0: { flare: there } } }, DT);
  assert.equal(av.flares, B.FLARES - 1);
  assert.equal(it.flares.length, 1);
  run(s, { away: { 0: {} } }, 1);
  const f = it.flares[0];
  assert.ok(dist(f.x, f.y, there.x, there.y) < 3, 'it lands where the boarder aimed');
  assert.ok(f.burn < B.FLARE_BURN && f.burn > 0);
  // Thrown straight at a wall it comes back, and never ends up inside the wall.
  const up = { x: av.x, y: av.y - 400 };
  step(s, { away: { 0: { flare: up } } }, DT);
  for (let i = 0; i < 120; i++) {
    step(s, { away: { 0: {} } }, DT);
    for (const g of it.flares) assert.ok(!blocked(it, g.x, g.y, 0.5), 'a flare is never in a wall');
  }
  const back = it.flares[1];
  assert.equal(back.left, 0, 'it has come to rest');
  assert.ok(back.y > it.halls[0].r0 * TILE, 'it stayed in the corridor');
  run(s, { away: { 0: {} } }, B.FLARE_BURN);
  assert.equal(it.flares.length, 0, 'both have burnt out');
});

test('the vault door opens when a player holds the use key next to it', () => {
  const { s, it, av } = boarded();
  it.guards = [];
  it.turrets = [];
  const door = it.rooms[it.vault].door;
  av.x = door.x;
  av.y = door.y + (door.y < hallY(it) ? 14 : -14);
  run(s, { away: { 0: { use: true } } }, B.DOOR_CUT_TIME + 0.2);
  assert.equal(it.doorOpen, true);
  assert.ok(!it.tiles.includes('L'));
});

test('when the reactor timer runs out the wreck explodes and everyone is teleported home', () => {
  const { s, w, it } = boarded();
  it.guards = [];
  it.turrets = [];
  it.timer = 0.5;
  const hull = s.ship.hull + s.ship.shield;
  run(s, { away: { 0: {} } }, 1);
  assert.equal(s.players[0].inside, null);
  assert.ok(!wrecks(s).includes(w), 'the wreck is gone');
  assert.equal(wrecks(s).length, 3, 'a new wreck appears elsewhere');
  assert.equal(s.ship.docked, null);
  assert.ok(s.ship.hull + s.ship.shield < hull, 'a docked ship is caught in the blast');
});

test('fuel burns with throttle, and an empty tank leaves the ship crawling', () => {
  const s = quiet(createState(1));
  run(s, { captain: { throttle: 1 } }, 10);
  assert.ok(s.ship.fuel < B.FUEL_START);
  const full = speedOf(s.ship);
  s.ship.fuel = 0;
  run(s, { captain: { throttle: 1 } }, 15);
  assert.ok(speedOf(s.ship) < full * 0.4);
});

// ---------- break-in game ----------
import { createBreakin, flow, mask, PIPE_GRID } from '../src/sim/breakin.js';

test('every break-in puzzle starts unsolved and can be solved', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = createState(seed),
      bk = createBreakin(s, { kind: 'wreck', difficulty: 1 + (seed % 3) });
    const [w, h] = PIPE_GRID[1 + (seed % 3)];
    assert.equal(bk.tiles.length, w * h, 'riskier wrecks have larger locks');
    assert.equal(flow(bk).solved, false, `seed ${seed} starts unsolved`);
    bk.tiles.forEach((t, i) => {
      t.rot = bk.solution[i];
    });
    assert.equal(flow(bk).solved, true, `seed ${seed} has a solution`);
  }
});

test('the lock of an easy wreck is small and needs only a few turns, and riskier wrecks are harder', () => {
  // How many single turns it takes when every piece is turned the shortest way.
  const turnsNeeded = (bk) =>
    bk.tiles.reduce((sum, tile, i) => {
      const want = mask({ type: tile.type, rot: bk.solution[i] });
      const ways = [0, 1, 2, 3].filter((k) => mask({ type: tile.type, rot: (tile.rot + k) % 4 }) === want);
      return sum + Math.min(...ways.map((k) => Math.min(k, 4 - k)));
    }, 0);
  const average = (difficulty) => {
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const turns = turnsNeeded(createBreakin(createState(seed), { kind: 'wreck', difficulty }));
      assert.ok(turns >= 3, 'no lock is open or nearly open from the start');
      total += turns;
    }
    return total / 200;
  };
  assert.deepEqual(PIPE_GRID[1], [5, 3], 'fifteen pieces');
  const easy = average(1);
  assert.ok(easy < 6.5, `an easy lock takes about six turns, not ${easy}`);
  assert.ok(average(3) > easy + 1.5, 'the riskiest wrecks have clearly harder locks');
});

test('boarding a locked wreck opens the break-in game, and solving it opens the lock', () => {
  const s = quiet(createState(1)),
    w = wrecks(s)[0];
  s.ship.docked = w.id;
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, null, 'still locked out');
  assert.ok(w.breakin && w.breakin.started);
  const t0 = w.breakin.time;
  run(s, {}, 1);
  assert.ok(w.breakin.time < t0, 'the clock runs');
  // Turn every tile to its solution with rotate commands.
  const turns = [];
  w.breakin.tiles.forEach((t, i) => {
    for (let r = t.rot; r !== w.breakin.solution[i]; r = (r + 1) % 4)
      turns.push({ wreck: w.id, x: i % w.breakin.w, y: Math.floor(i / w.breakin.w), dir: 1 });
  });
  step(s, { hack: { 0: turns } }, DT);
  assert.equal(w.lock, 'open');
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, w.id);
});

test('a failed bypass costs the reactor time, and the third one blows the wreck up and hurts the docked ship', () => {
  const s = quiet(createState(1)),
    w = wrecks(s)[0];
  s.ship.docked = w.id;
  const fail = () => {
    step(s, { system: { board: [0] } }, DT);
    run(s, {}, w.breakin.total + 1);
  };
  fail();
  assert.ok(wrecks(s).includes(w), 'the wreck is still there after one failure');
  assert.equal(w.lockFails, 1);
  assert.equal(w.breakin, null, 'with a fresh lock to try');
  fail();
  assert.ok(wrecks(s).includes(w));
  // Getting in after two failures: the reactor has that much less time.
  const other = quiet(createState(1)),
    w2 = wrecks(other)[0];
  other.ship.docked = w2.id;
  w2.lockFails = 2;
  w2.lock = 'open';
  step(other, { system: { board: [0] } }, DT);
  assert.ok(Math.abs(w2.interior.timer - (B.REACTOR_TIME[w2.difficulty] - 2 * B.LOCK_FAIL_REACTOR)) < 1);
  const before = s.ship.hull + s.ship.shield + s.ship.dockShield;
  fail();
  assert.ok(!wrecks(s).includes(w), 'the third failure blows it up');
  assert.equal(s.ship.docked, null);
  assert.ok(s.ship.hull + s.ship.shield < before);
});

// ---------- map, scanner pulse, probes and buoys ----------
import { isSeen, isVisible, visionSources } from '../src/sim/map.js';

test('the map starts dark and the ship lifts the fog around itself', () => {
  const s = quiet(createState(1));
  assert.equal(isSeen(s, 0, 0), false);
  run(s, {}, 0.5);
  assert.equal(isSeen(s, 0, 0), true);
  assert.equal(isSeen(s, 2400, 2400), false, 'far corners are still dark');
  s.ship.x = 2300;
  s.ship.y = 2300;
  run(s, {}, 0.5);
  assert.equal(isSeen(s, 2400, 2400), true, 'going there reveals it');
});

test('a wreck stays on the map as last seen, and pirates show only while in sight', () => {
  const s = quiet(createState(1)),
    w = wrecks(s)[0];
  run(s, {}, 0.5);
  const wrecksKnown = () => s.known.filter((k) => k.kind === 'wreck').length;
  assert.equal(wrecksKnown(), 0, 'the first wreck is out of sight at the start');
  s.ship.x = w.x + 300;
  s.ship.y = w.y;
  run(s, {}, 0.5);
  assert.equal(wrecksKnown(), 1);
  s.ship.x = 0;
  s.ship.y = 0;
  s.things = s.things.filter((x) => x !== w);
  run(s, {}, 0.5);
  assert.equal(wrecksKnown(), 1, 'still shown where it was last seen');
  s.ship.x = w.x + 300;
  s.ship.y = w.y;
  run(s, {}, 0.5);
  assert.equal(wrecksKnown(), 0, 'gone once someone looks again');
  assert.equal(isVisible(s, s.ship.x + 100, s.ship.y), true);
  assert.equal(isVisible(s, s.ship.x + 2000, s.ship.y), false);
});

test('the scanner pulse sees far for a moment and then needs to recharge', () => {
  const s = quiet(createState(1));
  step(s, { engineer: { tool: { type: 'pulse' } } }, DT);
  run(s, {}, 1.5);
  assert.equal(isSeen(s, B.PULSE_RADIUS - 150, 0), true);
  assert.ok(
    s.known.some((k) => k.kind === 'wreck'),
    'the pulse finds the nearest wreck',
  );
  run(s, {}, B.PULSE_TIME);
  assert.equal(s.ship.pulse, null);
  step(s, { engineer: { tool: { type: 'pulse' } } }, DT);
  assert.equal(s.ship.pulse, null, 'still recharging');
  run(s, {}, B.PULSE_COOLDOWN);
  step(s, { engineer: { tool: { type: 'pulse' } } }, DT);
  assert.ok(s.ship.pulse);
});

test('a probe flies to its target, reveals the way, burns out and is restocked', () => {
  const s = quiet(createState(1));
  step(s, { engineer: { tool: { type: 'probe', x: 1500, y: 0 } } }, DT);
  assert.equal(s.ship.probeStock, B.PROBE_STOCK - 1);
  run(s, {}, 1500 / B.PROBE_SPEED + 1);
  assert.equal(isSeen(s, 1500, 0), true);
  assert.equal(isSeen(s, 900, 0), true, 'the way there is revealed too');
  assert.equal(s.probes.length, 1);
  run(s, {}, B.PROBE_LINGER + 1);
  assert.equal(s.probes.length, 0);
  run(s, {}, B.PROBE_REGEN);
  assert.equal(s.ship.probeStock, B.PROBE_STOCK);
});

test('a buoy keeps watching until pirates shoot it down', () => {
  const s = quiet(createState(1));
  step(s, { engineer: { tool: { type: 'buoy' } } }, DT);
  assert.equal(s.ship.buoyStock, B.BUOY_STOCK - 1);
  s.ship.x = 2000;
  s.ship.y = 2000;
  run(s, {}, 1);
  assert.equal(visionSources(s).filter((v) => v.kind === 'buoy').length, 1);
  assert.equal(isVisible(s, 100, 0), true, 'the buoy still sees its area');
  s.vessels.push({
    id: 99,
    kind: 'fighter',
    x: 40,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    hp: 24,
    mode: 'breakoff',
    timer: 0.5,
    burst: 0,
    burstTimer: 0,
    cool: 1e9,
    veer: 1,
    side: 'pirate',
  });
  run(s, {}, 1.5);
  assert.ok(buoys(s).length === 0 || buoys(s)[0].hp < B.BUOY_HP);
});

// ---------- stations, shop and upgrades ----------
import {
  CATALOG,
  blockedReason,
  buyUpgrade,
  hullMax,
  shieldMax,
  powerTotal,
  slotsUsed,
  fuelMax,
  jumpCharge,
  jumpFuel,
  crewHpMax,
  carryMax,
  rifleDmg,
  teleCooldown,
  itemsOf,
} from '../src/sim/upgrades.js';
import { servicePrices, takeOver } from '../src/sim/stations.js';

const station = (s, align) => stations(s).find((x) => x.align === align);
// The side of a station falls out with the crew for good, and the station turns on them.
function turnHostile(s, st) {
  s.standing[st.side] = -100;
  step(s, {}, DT);
}
function atStation(s, st) {
  s.ship.docked = st.id;
  s.ship.vx = s.ship.vy = 0;
  return st;
}

test('the first sector has a friendly shipyard in sight and a neutral station further out', () => {
  const s = quiet(createState(1));
  run(s, {}, 0.5);
  const yard = station(s, 'friendly');
  assert.ok(yard && yard.shipyard);
  assert.ok(
    s.known.some((k) => k.kind === 'station' && k.align === 'friendly'),
    'the yard is on the map from the start',
  );
  assert.ok(station(s, 'neutral'));
});

test('fuel is free at a friendly station and costs credits at a neutral one', () => {
  const s = quiet(createState(1));
  s.ship.fuel = 40;
  atStation(s, station(s, 'friendly'));
  step(s, { shop: [{ action: 'refuel' }] }, DT);
  assert.equal(s.ship.fuel, B.FUEL_MAX);
  assert.equal(s.credits, 0);
  s.ship.fuel = 40;
  s.credits = 30;
  atStation(s, station(s, 'neutral'));
  assert.equal(servicePrices(s, station(s, 'neutral')).refuel.price, 60);
  step(s, { shop: [{ action: 'refuel' }] }, DT);
  assert.equal(s.ship.fuel, 70, 'the tank is filled as far as the money goes');
  assert.equal(s.credits, 0);
});

test('upgrades need a shipyard, credits and a free slot', () => {
  const s = quiet(createState(1));
  atStation(s, station(s, 'neutral'));
  s.credits = 1000;
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(s.ship.mods.armor, undefined, 'no shipyard at this station');
  atStation(s, station(s, 'friendly'));
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(s.ship.mods.armor, 1);
  assert.equal(hullMax(s.ship), B.HULL_MAX + 80);
  assert.equal(s.credits, 1000 - CATALOG.armor.price);
  assert.equal(blockedReason(s, 'bay'), 'NO FREE HARDPOINT', 'the bay needs two hardpoints and one is taken');
  step(s, { shop: [{ action: 'buy', item: 'slotH' }] }, DT);
  assert.equal(blockedReason(s, 'bay'), null);
  step(s, { shop: [{ action: 'buy', item: 'bay' }] }, DT);
  assert.equal(slotsUsed(s.ship, 'hard'), 3);
  assert.equal(s.ship.dartStock, B.DART_COUNT);
  s.credits = 0;
  assert.equal(blockedReason(s, 'emit'), 'NOT ENOUGH CREDITS');
});

test('shield emitters and the power core raise the ship limits', () => {
  const s = quiet(createState(1));
  s.credits = 1000;
  buyUpgrade(s, 'emit');
  buyUpgrade(s, 'core');
  assert.equal(shieldMax(s.ship), B.SHIELD_MAX + 50);
  assert.equal(powerTotal(s.ship), B.POWER_TOTAL + 2);
  assert.equal(setPower(s, 'weapons', 1), true, 'the extra power can be used');
});

test('shooting a neutral station turns it hostile, and its guns open fire', () => {
  const s = quiet(createState(1)),
    st = station(s, 'neutral');
  s.ship.x = st.x;
  s.ship.y = st.y + 200;
  run(s, { gunner: { aim: { x: st.x, y: st.y }, fire: true } }, 4);
  assert.equal(st.align, 'hostile');
  const before = s.ship.shield + s.ship.hull;
  run(s, {}, 5);
  assert.ok(s.ship.shield + s.ship.hull < before, 'the station shoots back');
});

test('a hostile station is broken into, boarded and taken over from its terminal', () => {
  const s = quiet(createState(1)),
    st = station(s, 'neutral');
  turnHostile(s, st);
  s.ship.x = st.x;
  s.ship.y = st.y + 2000;
  atStation(s, st);
  step(s, { system: { board: [0] } }, DT);
  assert.ok(st.breakin, 'the lock must be bypassed first');
  st.breakin.time = 0.01;
  run(s, {}, 0.2);
  assert.ok(stations(s).includes(st), 'a station does not blow up');
  assert.equal(s.vessels.length, 2, 'it fights back instead');
  s.vessels = [];
  st.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = st.interior,
    av = it.avatars[0];
  assert.ok(it.terminal && it.timer === null, 'no reactor countdown in a station');
  it.guards = [];
  it.turrets = [];
  it.doorOpen = true;
  av.x = it.terminal.x;
  av.y = it.terminal.y;
  run(s, { away: { 0: { use: true } } }, B.TAKEOVER_TIME + 0.2);
  assert.equal(st.align, 'friendly');
  assert.equal(st.shipyard, true);
  assert.equal(st.side, 'crew', "the station is the crew's own now");
  assert.ok(
    st.guns.every((g) => g.hp > 0),
    'and its guns are theirs',
  );
});

// ---------- weapons and darts ----------
const target = (s, x, y, kind = 'fighter', hp = 24) => {
  const p = {
    id: s.nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    hp,
    hpMax: hp,
    mode: 'breakoff',
    timer: 1e9,
    burst: 0,
    burstTimer: 0,
    cool: 1e9,
    veer: 1,
    side: 'pirate',
    guns: [9, 9, 9],
    launch: 1e9,
  };
  s.vessels.push(p);
  return p;
};

test('the heavy laser charges while held and hits everything straight ahead', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  s.ship.mods.heavy = 1;
  assert.deepEqual(weaponsOf(s.ship), ['pulse', 'heavy']);
  target(s, 5000, 4800, 'gunboat', 60);
  target(s, 5000, 4600, 'gunboat', 60);
  const side = target(s, 5300, 4800, 'gunboat', 60);
  for (const p of s.vessels) p.mode = 'still';
  step(s, { gunner: { weapon: 'heavy' } }, DT);
  s.vessels.forEach((p) => {
    p.x0 = p.x;
    p.y0 = p.y;
  });
  const hold = (st) => {
    st.vessels.forEach((p) => {
      p.x = p.x0;
      p.y = p.y0;
    });
    return { gunner: { fire: true } };
  };
  run(s, hold, 0.4);
  step(s, { gunner: { fire: false } }, DT);
  assert.equal(s.kills, 0, 'letting go early wastes the charge');
  run(s, hold, B.HEAVY_CHARGE + 0.3);
  s.vessels.forEach((p) => {
    p.x = p.x0;
    p.y = p.y0;
  });
  step(s, { gunner: { fire: false } }, DT);
  assert.equal(s.kills, 2, 'both ships in line are destroyed');
  assert.ok(s.vessels.includes(side), 'the one off to the side is untouched');
});

test('rockets home in on a pirate and run out', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  s.credits = 500;
  buyUpgrade(s, 'rockets');
  assert.equal(s.ship.rockets, B.ROCKET_LOAD);
  const p = target(s, 5150, 4800, 'fighter', 24);
  step(s, { gunner: { weapon: 'rockets' } }, DT);
  run(s, (st) => ({ gunner: { aim: { x: p.x, y: p.y }, fire: st.rockets.length === 0 && st.kills === 0 } }), 4);
  assert.equal(s.kills, 1);
  assert.ok(s.ship.rockets < B.ROCKET_LOAD);
  s.ship.rockets = 0;
  run(s, { gunner: { aim: { x: 0, y: 0 }, fire: true } }, 1);
  assert.equal(s.rockets.length, 0);
});

test('twin turrets add two more bolts to every pulse shot', () => {
  const s = quiet(createState(1));
  step(s, { gunner: { aim: { x: 0, y: -300 }, fire: true } }, DT);
  assert.equal(s.bolts.length, 1);
  s.bolts = [];
  s.ship.fireCooldown = 0;
  s.ship.mods.twin = 1;
  step(s, { gunner: { aim: { x: 0, y: -300 }, fire: true } }, DT);
  assert.equal(s.bolts.length, 3);
});

test('engines without power give no thrust and no steering, and the ship drifts on', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  run(s, { captain: { throttle: 1 } }, 2);
  assert.ok(speedOf(s.ship) > 20, 'with power it gets going');
  s.ship.power.engines = 0;
  const heading = s.ship.heading;
  const before = speedOf(s.ship);
  run(s, { captain: { throttle: 1, turn: 1 } }, 1);
  assert.equal(s.ship.throttle, 0, 'the throttle falls to nothing');
  assert.ok(speedOf(s.ship) < before, 'the ship only slows down');
  assert.ok(speedOf(s.ship) > 0, 'but it drifts on');
  run(s, { captain: { throttle: 1, turn: 1 } }, 3);
  const turned = Math.abs(angleDiff(s.ship.heading, heading));
  run(s, { captain: { throttle: 1, turn: 1 } }, 1);
  assert.ok(Math.abs(Math.abs(angleDiff(s.ship.heading, heading)) - turned) < 0.001, 'it no longer turns');
  s.ship.power.engines = 1;
  run(s, { captain: { throttle: 1 } }, 2);
  assert.ok(s.ship.throttle > 0.5, 'with power back the Captain can throttle up again');
});

test('a shield without power falls in a couple of seconds, and holds as long as it has any', () => {
  const s = quiet(createState(1));
  s.ship.shield = shieldMax(s.ship);
  s.ship.power.shields = 1;
  run(s, {}, 3);
  assert.equal(s.ship.shield, shieldMax(s.ship));
  s.ship.power.shields = 0;
  run(s, {}, B.SHIELD_DROP / 2);
  assert.ok(s.ship.shield > 0 && s.ship.shield < shieldMax(s.ship), 'it is on its way down, not gone at once');
  run(s, {}, B.SHIELD_DROP / 2 + 0.1);
  assert.equal(s.ship.shield, 0);
});

test('every turret points at what the Gunner aims at, and fires the way it points', () => {
  const s = quiet(createState(1));
  s.ship.mods.twin = 1;
  // Something close by and off to one side, where the three turrets have to point in clearly different ways.
  const aim = { x: s.ship.x + 60, y: s.ship.y - 30 };
  run(s, { gunner: { aim, fire: false } }, 1);
  const mounts = [SHIP_GEOM.turret, ...WING_MOUNTS].map((m) => toWorld(s.ship, m));
  const angles = [s.ship.turretAngle, ...s.ship.wingAngles];
  mounts.forEach((m, i) => {
    assert.ok(
      Math.abs(angleDiff(angles[i], headingTo(aim.x - m.x, aim.y - m.y))) < 0.01,
      `turret ${i} points at the aim`,
    );
  });
  assert.ok(Math.abs(angleDiff(angles[1], angles[2])) > 0.3, 'the wing turrets do not point the same way');
  s.ship.fireCooldown = 0;
  step(s, { gunner: { aim, fire: true } }, DT);
  assert.equal(s.bolts.length, 3);
  s.bolts.forEach((b, i) => {
    const way = headingTo(b.vx - s.ship.vx, b.vy - s.ship.vy);
    assert.ok(Math.abs(angleDiff(way, angles[i])) < 0.03, `bolt ${i} flies the way its turret points`);
  });
});

test("darts launch on the captain's order, fight pirates and come home again", () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  step(s, { captain: { darts: true } }, DT);
  assert.equal(s.darts.length, 0, 'no fighter bay yet');
  s.credits = 1000;
  buyUpgrade(s, 'bay');
  step(s, { captain: { darts: true } }, DT);
  run(s, {}, 2);
  assert.equal(s.darts.length, B.DART_COUNT);
  assert.equal(s.ship.dartStock, 0);
  target(s, 5200, 4900, 'fighter', 30).mode = 'approach';
  run(s, {}, 12);
  assert.equal(s.kills, 1, 'the darts shot the pirate down');
  step(s, { captain: { darts: true } }, DT);
  run(s, {}, 8);
  assert.equal(s.darts.length, 0);
  assert.equal(s.ship.dartStock, B.DART_COUNT);
});

test('with autolaunch the Captain can still send the darts out when all is calm, and they stay out', () => {
  const s = quiet(createState(1));
  s.ship.x = s.ship.y = 9000;
  s.ship.mods.bay = 1;
  s.ship.mods.auto = 1;
  s.ship.dartStock = B.DART_COUNT;
  run(s, {}, 30);
  assert.equal(s.ship.dartsOut, false, 'nothing to launch for');
  step(s, { captain: { darts: true } }, DT);
  run(s, {}, 12);
  assert.equal(s.ship.dartsOut, true, 'the order stands, though it is quiet');
  assert.equal(s.darts.length, B.DART_COUNT);
  step(s, { captain: { darts: true } }, DT);
  run(s, {}, 8);
  assert.equal(s.ship.dartsOut, false);
  assert.equal(s.darts.length, 0, 'and they come home when called');
});

test('with autolaunch the darts go out by themselves when pirates show up', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  s.credits = 1000;
  buyUpgrade(s, 'bay');
  buyUpgrade(s, 'auto');
  run(s, {}, 1);
  assert.equal(s.darts.length, 0);
  target(s, 5300, 5000, 'fighter', 500);
  run(s, {}, 2);
  assert.ok(s.darts.length > 0);
});

// ---------- sectors, charts and the boss ----------
test('a jump needs a chart, a route, fuel and everyone on board', () => {
  const s = quiet(createState(1));
  assert.equal(jumpBlocked(s, 1), 'NO STAR CHART');
  s.charts.push(1);
  assert.equal(jumpBlocked(s, 4), 'NO ROUTE FROM HERE');
  s.ship.fuel = 5;
  assert.equal(jumpBlocked(s, 1), 'NOT ENOUGH FUEL');
  s.ship.fuel = 80;
  s.ship.docked = wrecks(s)[0].id;
  assert.equal(jumpBlocked(s, 1), 'UNDOCK FIRST');
  s.ship.docked = null;
  assert.equal(jumpBlocked(s, 1), null);
});

test('jumping takes time and fuel, changes the sector, and the old sector is remembered', () => {
  const s = quiet(createState(1));
  s.charts.push(1);
  s.ship.fuel = 80;
  run(s, {}, 0.5);
  const oldWrecks = wrecks(s).map((w) => w.id),
    seenBefore = s.map.seen.filter(Boolean).length;
  step(s, { captain: { jump: 1 } }, DT);
  assert.ok(s.jump);
  run(s, {}, B.JUMP_CHARGE / 2);
  assert.equal(s.sector, 0, 'still charging');
  run(s, {}, B.JUMP_CHARGE / 2 + 0.2);
  assert.equal(s.sector, 1);
  assert.equal(s.ship.fuel < 80 - B.JUMP_FUEL + 0.01, true);
  assert.ok(!wrecks(s).some((w) => oldWrecks.includes(w.id)), 'a new sector has its own wrecks');
  assert.ok(
    stations(s).some((x) => x.align === 'hostile'),
    'the second sector has a hostile station',
  );
  s.spawn.timer = 1e9;
  step(s, { captain: { jump: 0 } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, 0);
  assert.deepEqual(
    wrecks(s).map((w) => w.id),
    oldWrecks,
    'the first sector is as it was left',
  );
  assert.ok(s.map.seen.filter(Boolean).length >= seenBefore);
});

test('a star chart can be bought at a station or carried out of a vault', () => {
  const s = quiet(createState(1)),
    yard = station(s, 'friendly');
  atStation(s, yard);
  s.credits = 500;
  assert.ok(yard.chart !== null);
  step(s, { shop: [{ action: 'chart' }] }, DT);
  assert.ok(s.charts.includes(yard.chart));
  assert.equal(s.credits, 500 - B.CHART_PRICE.friendly);
});

test('destroying the cruiser in the last sector wins the game, and gunboats leave wrecks', () => {
  const s = quiet(createState(1));
  s.sector = 3;
  s.charts.push(4);
  s.ship.fuel = 80;
  step(s, { captain: { jump: 4 } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, 4);
  const boss = s.vessels.find((p) => p.kind === 'cruiser');
  assert.ok(boss);
  s.spawn.timer = 1e9;
  const before = wrecks(s).length;
  const gb = target(s, s.ship.x + 3000, s.ship.y, 'gunboat', 10);
  hurtVessel(s, gb, 50);
  assert.equal(wrecks(s).length, before + 1);
  hurtVessel(s, boss, SHIPS.cruiser.hp);
  assert.equal(s.won, true);
});

// ---------- enemy alarm ----------
test('the enemy alarm counts pirates far out, and a higher level reaches further', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000;
  s.ship.y = 5000;
  target(s, 5000, 5000 - 1200, 'fighter', 500);
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 0, 'no alarm installed');
  s.ship.mods.alarm = 1;
  s.vessels[0].y = 5000 - 1200;
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 0, 'level 1 does not reach that far');
  s.ship.mods.alarm = 2;
  s.vessels[0].y = 5000 - 1200;
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 1);
  assert.ok(s.alarm.eta > 0);
});

// ---------- cargo pods, more break-in games and distress calls ----------
test('the Engineer finds a station code one digit at a time, and someone enters it at the lock', () => {
  const s = quiet(createState(1)),
    st = station(s, 'neutral');
  turnHostile(s, st);
  s.ship.x = st.x;
  s.ship.y = st.y + 3000;
  atStation(s, st);
  step(s, { system: { board: [0] } }, DT);
  const bk = st.breakin;
  assert.equal(bk.kind, 'code');
  assert.equal(bk.code.length, B.CODE_LEN);
  assert.equal(bk.stage, 0, 'no digit is found from the start');
  // Stopping the needle outside the mark costs time and finds nothing.
  bk.angle = (bk.mark + Math.PI) % (Math.PI * 2);
  const t0 = bk.time;
  step(s, { engineer: { ring: true } }, DT);
  assert.equal(bk.stage, 0);
  assert.ok(bk.time < t0 - B.CODE_PENALTY + 0.1, 'a miss costs time');
  const ways = [];
  for (let i = 0; i < B.CODE_LEN; i++) {
    const from = bk.angle;
    step(s, {}, DT);
    ways.push(Math.sign(angleDiff(bk.angle, from)));
    bk.angle = bk.mark;
    step(s, { engineer: { ring: true } }, DT);
    assert.equal(bk.stage, i + 1);
  }
  assert.deepEqual(ways, [1, -1, 1, -1], 'the needle changes direction for every ring');
  assert.equal(st.lock, 'locked', 'finding the code does not open the lock');
  const wrong = bk.code.map((d) => (d % B.CODE_DIGITS) + 1),
    t1 = bk.time;
  step(s, { hack: { 0: wrong.map((digit) => ({ wreck: st.id, digit })) } }, DT);
  assert.equal(st.lock, 'locked');
  assert.ok(bk.time < t1 - B.CODE_PENALTY + 0.1, 'a wrong code costs time');
  const code = bk.code.join('');
  run(s, {}, 20);
  assert.equal(bk.code.join(''), code, 'the code no longer changes by itself');
  step(s, { hack: { 0: bk.code.map((digit) => ({ wreck: st.id, digit })) } }, DT);
  assert.equal(st.lock, 'open');
});

test('a cargo pod opens after three good stops of the needle and gives its cargo', () => {
  const s = quiet(createState(1)),
    pod = pods(s)[0];
  s.ship.docked = pod.id;
  step(s, { system: { board: [0] } }, DT);
  const bk = pod.breakin;
  assert.equal(bk.kind, 'dial');
  const ways = [];
  for (let stage = 0; stage < B.DIAL_STAGES; stage++) {
    const from = bk.angle;
    step(s, {}, DT);
    ways.push(Math.sign(angleDiff(bk.angle, from)));
    for (
      let i = 0;
      i < 2000 && Math.abs(((bk.angle - bk.mark + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > bk.width / 4;
      i++
    )
      step(s, {}, DT);
    step(s, { hack: { 0: [{ wreck: pod.id, stop: true }] } }, DT);
  }
  assert.deepEqual(ways, [1, -1, 1], 'the needle goes the other way round the ring in the middle');
  assert.equal(pod.looted, false, 'the middle of the lock has to turn first');
  run(s, {}, B.DIAL_OPEN + 0.1);
  assert.equal(pod.looted, true);
  assert.ok(pods(s).includes(pod), 'the empty shell stays where it is');
  assert.ok(!dockTargets(s).includes(pod), 'but nobody can dock with it again');
  assert.ok(s.credits >= B.POD_CREDITS[0]);
  assert.equal(s.ship.docked, null);
});

test('three misses on a cargo pod set off an alarm that brings pirates', () => {
  const s = quiet(createState(1)),
    pod = pods(s)[0];
  s.ship.docked = pod.id;
  step(s, { system: { board: [0] } }, DT);
  const bk = pod.breakin;
  for (let n = 0; n < B.DIAL_MISSES; n++) {
    for (
      let i = 0;
      i < 2000 && Math.abs(((bk.angle - bk.mark + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < bk.width;
      i++
    )
      step(s, {}, DT);
    step(s, { hack: { 0: [{ wreck: pod.id, stop: true }] } }, DT);
  }
  run(s, {}, 0.1);
  assert.ok(pods(s).includes(pod), 'the pod is still there');
  assert.equal(pod.breakin, null, 'with a fresh lock');
  assert.ok(s.vessels.length > 0, 'and pirates are on their way');
  assert.ok(pod.alarm > 0, 'its alarm sounds');
  run(s, {}, B.POD_ALARM + 5);
  assert.ok(pod.alarm > 0, 'for as long as there are pirates about');
  s.vessels = [];
  s.spawn.timer = 1e9;
  run(s, {}, 2);
  assert.equal(pod.alarm, 0, 'and stops when they are gone');
});

test('a station under attack calls for help, and a neutral one repays it with a discount', () => {
  const s = quiet(createState(1));
  s.sector = 0;
  s.charts.push(1);
  s.ship.fuel = 90;
  step(s, { captain: { jump: 1 } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  s.spawn.timer = 1e9;
  const st = station(s, 'neutral');
  assert.ok(st.shipyard, 'this neutral station has a shipyard');
  atStation(s, st);
  s.credits = 1000;
  step(s, { shop: [{ action: 'buy', item: 'emit' }] }, DT);
  assert.equal(s.ship.mods.emit, 1, 'a neutral shipyard is open to anyone who pays');
  assert.equal(s.credits, 1000 - CATALOG.emit.price, 'at the full price');
  s.ship.docked = null;
  s.ship.x = st.x + 2500;
  s.ship.y = st.y;
  s.things = s.things.filter((t) => t.kind !== 'station' || t === st);
  s.raidTimer = 0.1;
  run(s, {}, 0.5);
  assert.ok(s.raid && s.raid.station === st.id);
  const raiders = s.vessels.filter((p) => p.raid === s.raid.id);
  assert.ok(raiders.length >= 2);
  run(s, {}, 5);
  assert.ok(
    raiders.every((p) => Math.hypot(p.x - st.x, p.y - st.y) < 500),
    'the raiders stay at the station',
  );
  for (const p of raiders) hurtVessel(s, p, 999);
  run(s, {}, 0.2);
  assert.equal(s.raid, null);
  assert.ok(st.favor > 0);
  assert.equal(st.align, 'neutral', 'it stays neutral');
  atStation(s, st);
  const before = s.credits;
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(s.ship.mods.armor, 1);
  assert.equal(before - s.credits, Math.round(CATALOG.armor.price * B.FAVOR_DISCOUNT), 'at a discount');
  run(s, {}, B.FAVOR_TIME + 1);
  assert.equal(st.favor, 0, 'the favour runs out');
});

// A raid on the free station in the first sector, with the frigate far away.
function raidFarAway() {
  const s = quiet(createState(1));
  s.traffic.timer = 1e9;
  s.raidTimer = 0.1;
  s.ship.x = 9000;
  s.ship.y = 9000;
  run(s, {}, 0.5);
  const st = stations(s).find((x) => x.id === s.raid.station);
  return { s, st };
}

test('a station that nobody helps fights for itself, and is not grateful when it wins', () => {
  const { s, st } = raidFarAway();
  assert.equal(st.home, false, "the crew's own yard is never raided");
  const credits = s.credits;
  const seen = [];
  for (let i = 0; i < 200 * 60 && s.raid; i++) {
    step(s, {}, DT);
    seen.push(...s.events.map((e) => e.type));
    s.events.length = 0;
    s.traffic.timer = 1e9;
  }
  assert.equal(s.raid, null, 'the raid ends');
  assert.ok(seen.includes('distressHeld'), 'the station held out by itself');
  assert.equal(st.align, 'neutral');
  assert.equal(st.favor, 0);
  assert.equal(s.credits, credits, 'no reward for a crew that did not come');
});

test('a station that loses the fight falls to the pirates, and can be taken back', () => {
  const { s, st } = raidFarAway();
  // Weaken it so much that the raiders are sure to win.
  st.shield = 0;
  st.hp = 20;
  for (const g of st.guns) g.hp = 0;
  const seen = [];
  for (let i = 0; i < 120 * 60 && st.side !== 'pirate'; i++) {
    step(s, {}, DT);
    seen.push(...s.events.map((e) => e.type));
    s.events.length = 0;
  }
  assert.equal(st.side, 'pirate');
  assert.equal(st.align, 'hostile');
  assert.equal(st.lock, 'locked');
  assert.ok(seen.includes('stationFell'));
  assert.ok(
    st.guns.every((g) => g.hp > 0),
    'the pirates man its guns',
  );
  run(s, {}, 1);
  assert.equal(s.raid, null);
  takeOver(s, st);
  assert.equal(st.side, 'crew');
  assert.equal(st.align, 'friendly');
});

// ---------- more upgrades and boarding gear ----------

test('every catalog item belongs to a tab, and boarding gear is sold without a shipyard', () => {
  for (const id of Object.keys(CATALOG)) assert.ok(['hull', 'system', 'armory'].includes(CATALOG[id].tab), id);
  assert.ok(itemsOf('armory').length >= 6);
  const s = quiet(createState(1));
  atStation(s, station(s, 'neutral'));
  s.credits = 1000;
  step(s, { shop: [{ action: 'buy', item: 'pack' }] }, DT);
  assert.equal(s.ship.mods.pack, 1);
  step(s, { shop: [{ action: 'buy', item: 'tank' }] }, DT);
  assert.equal(s.ship.mods.tank, undefined, 'a hull upgrade still needs a shipyard');
});

test('fuel tank, jump coils and the afterburner change how the ship travels', () => {
  const s = quiet(createState(1));
  s.credits = 2000;
  buyUpgrade(s, 'tank');
  buyUpgrade(s, 'jumpcoil');
  buyUpgrade(s, 'boost');
  assert.equal(fuelMax(s.ship), B.FUEL_MAX + B.TANK_FUEL);
  assert.equal(jumpCharge(s.ship), B.COIL_CHARGE);
  assert.equal(jumpFuel(s.ship), B.COIL_FUEL);
  const plain = quiet(createState(1));
  s.ship.x = plain.ship.x = 6000;
  s.ship.fuel = plain.ship.fuel = 100;
  run(s, { captain: { throttle: 1, boost: true } }, 6);
  run(plain, { captain: { throttle: 1, boost: true } }, 6);
  assert.ok(speedOf(s.ship) > speedOf(plain.ship) * 1.5, 'the afterburner is much faster');
  assert.ok(100 - s.ship.fuel > (100 - plain.ship.fuel) * 3, 'and burns much more fuel');
});

test('destroyed pirates leave salvage, and the tractor beam pulls it in', () => {
  const s = quiet(createState(1));
  s.ship.x = 6000;
  s.ship.y = 6000;
  const gb = target(s, 6200, 6000, 'gunboat', 10);
  hurtVessel(s, gb, 99);
  assert.equal(salvage(s).length, 2);
  const credits = s.credits;
  run(s, {}, 3);
  assert.equal(s.credits, credits, 'too far away to collect');
  s.ship.mods.tractor = 1;
  run(s, {}, 4);
  assert.equal(salvage(s).length, 0);
  assert.ok(s.credits > credits);
});

test('point defense stops some incoming fire, and repair drones mend the ship', () => {
  const hits = (pd) => {
    const s = quiet(createState(1));
    s.ship.x = 6000;
    s.ship.y = 6000;
    s.ship.power.shields = 0;
    if (pd) s.ship.mods.pd = 1;
    for (let i = 0; i < 200; i++) {
      s.bolts.push({ x: 6000, y: 5800, vx: 0, vy: 290, ttl: 1.5, side: 'pirate', dmg: 1 });
      run(s, {}, 0.1);
    }
    run(s, {}, 2);
    return B.SHIELD_MAX + B.HULL_MAX - s.ship.shield - s.ship.hull;
  };
  const without = hits(false),
    withPd = hits(true);
  assert.ok(withPd < without * 0.85, `point defense lets less through (${withPd} against ${without})`);
  const s = quiet(createState(1));
  s.ship.power.repair = 0;
  s.ship.hull = 100;
  s.ship.nodes[1].hp = 40;
  s.ship.mods.drones = 1;
  run(s, {}, 10);
  assert.ok(s.ship.hull > 110 && s.ship.nodes[1].hp > 60);
});

test('boarding gear changes what a boarder can do', () => {
  const plain = quiet(createState(1));
  assert.equal(carryMax(plain.ship), B.CARRY_MAX);
  const s = quiet(createState(1)),
    w = dockAt(s);
  s.credits = 3000;
  for (const id of ['rifle', 'rifle', 'pack', 'suit', 'coils', 'charge', 'sentry', 'hack']) buyUpgrade(s, id);
  assert.equal(rifleDmg(s.ship), B.RIFLE_DMG + 2 * B.RIFLE_STEP);
  assert.equal(carryMax(s.ship), B.CARRY_MAX + B.PACK_EXTRA);
  assert.equal(crewHpMax(s.ship), B.CREW_HP + B.SUIT_HP);
  assert.equal(teleCooldown(s.ship), B.COIL_TELEPORT);
  run(s, {}, 0.1);
  assert.equal(s.players[0].hp, B.CREW_HP + B.SUIT_HP);
  step(s, { system: { board: [0] } }, DT);
  const it = w.interior,
    av = it.avatars[0];
  assert.equal(av.charges, B.CHARGES);
  assert.equal(av.sentries, 1);
  // The breaching charge opens the vault at once and alerts the guards.
  const door = it.rooms[it.vault].door;
  av.x = door.x;
  av.y = door.y + (door.y < hallY(it) ? 14 : -14);
  step(s, { away: { 0: { charge: true } } }, DT);
  assert.equal(it.doorOpen, true);
  assert.ok(it.guards.every((g) => g.mode === 'alert'));
  // The deployable turret shoots a guard on its own.
  it.turrets = [];
  it.guards = it.guards.slice(0, 1);
  const g = it.guards[0];
  const [here, there] = stretch(it, 80);
  Object.assign(av, here);
  step(s, { away: { 0: { deploy: true } } }, DT);
  assert.equal(it.sentries.length, 1);
  av.x = it.entry.x;
  av.y = it.entry.y - 20;
  // A guard at its post near the turret, that has not noticed anything.
  Object.assign(g, there, { mode: 'idle', home: { ...there }, goal: { ...there }, hp: 12 });
  for (let i = 0; i < 60 * 30 && it.guards.length; i++) step(s, { away: { 0: {} } }, DT);
  assert.equal(it.guards.length, 0, 'the sentry dealt with the guard');
});

test('a hacking kit gives more time in a break-in', () => {
  const a = quiet(createState(1)),
    b = quiet(createState(1));
  b.ship.mods.hack = 1;
  for (const s of [a, b]) {
    s.ship.docked = wrecks(s)[0].id;
    step(s, { system: { board: [0] } }, DT);
  }
  assert.ok(wrecks(b)[0].breakin.total > wrecks(a)[0].breakin.total * 1.3);
});

// ---------- test mode ----------
test('a test game has one of everything that can be docked with close to the start, and an ordinary game has not', () => {
  const s = createState(4, { test: true });
  const near = (t) => Math.hypot(t.x - s.ship.x, t.y - s.ship.y);
  const sides = stations(s).map((st) => (st.side.startsWith('free-') ? 'free' : st.side));
  assert.deepEqual(sides.sort(), ['charter', 'crew', 'drifters', 'free', 'pirate', 'wardens']);
  assert.deepEqual(
    wrecks(s)
      .map((w) => w.hull)
      .sort(),
    ['freighter', 'gunboat', 'hull'],
  );
  assert.equal(pods(s).length, 2);
  const all = [...stations(s), ...wrecks(s), ...pods(s)];
  assert.ok(
    all.every((t) => near(t) <= 1200),
    'everything is close by',
  );
  assert.ok(
    stations(s).find((st) => st.home && near(st) < 500),
    'the home yard is nearest',
  );
  const pirate = stations(s).find((st) => st.side === 'pirate');
  assert.ok(near(pirate) > B.STATION_RANGE + 200, 'the pirate station cannot shoot at the start');
  for (const a of all) {
    for (const b of all) {
      if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 200, 'nothing stands on top of anything else');
    }
  }
  assert.ok(
    s.things.every((t) => t.kind !== 'rock' || near(t) > 1500),
    'and no rocks are in the way',
  );
  assert.equal(s.known.length, all.length, 'all of it is on the map from the start');
  assert.ok(s.known.some((k) => k.id === pirate.id));
  assert.equal(isSeen(s, pirate.x, pirate.y), true, 'and the fog is lifted over it');
  const usual = createState(4);
  assert.equal(stations(usual).length, 2, 'an ordinary game is laid out as before');
  assert.ok(stations(usual).some((st) => near(st) > 1200));
});

test('a test game has no pirates of its own, and they can be called in', () => {
  const s = createState(6, { test: true });
  const pirates = () => s.vessels.filter((v) => v.side === 'pirate').length;
  run(s, {}, 400);
  assert.equal(pirates(), 0, 'no waves come by themselves');
  assert.equal(s.raid, null, 'and no raids');
  assert.equal(s.spawn.wave, 0);
  assert.equal(summon(s, 'fighters'), 'THREE PIRATE FIGHTERS');
  assert.equal(pirates(), 3);
  assert.ok(s.events.some((e) => e.type === 'wave'));
  summon(s, 'gunboat');
  assert.equal(s.vessels.filter((v) => v.kind === 'gunboat' && v.side === 'pirate').length, 1);
  summon(s, 'raid');
  assert.ok(s.raid, 'a raid starts when asked for');
  assert.ok(pirates() > 5);
  assert.equal(summon(s, 'raid'), 'A RAID IS ALREADY ON');
  summon(s, 'clear');
  assert.equal(pirates(), 0);
  assert.equal(s.raid, null);
  summon(s, 'traffic');
  run(s, {}, 0.1);
  assert.ok(
    s.vessels.some((v) => v.side !== 'pirate'),
    'traffic comes at once',
  );
  assert.equal(summon(s, 'nothing'), null);
  const usual = createState(6);
  assert.equal(summon(usual, 'fighters'), null, 'nothing can be called in in an ordinary game');
  assert.equal(usual.vessels.length, 0);
});

test('test mode starts with everything installed, room for it, credits and all charts', () => {
  const s = createState(1, { test: true });
  assert.equal(s.test, true);
  for (const id of Object.keys(CATALOG))
    assert.ok(['INSTALLED', 'MAXED', 'OWNED'].includes(blockedReason(s, id)), id + ' is in place');
  assert.ok(slotsUsed(s.ship, 'hard') <= s.ship.slots.hard && slotsUsed(s.ship, 'system') <= s.ship.slots.system);
  assert.equal(s.ship.hull, hullMax(s.ship));
  assert.equal(s.ship.fuel, fuelMax(s.ship));
  assert.equal(s.ship.rockets, B.ROCKET_LOAD);
  assert.equal(s.ship.dartStock, B.DART_COUNT);
  assert.equal(s.charts.length, s.sectors.length);
  assert.deepEqual(weaponsOf(s.ship), ['pulse', 'heavy', 'rockets']);
  assert.equal(createState(1).test, false, 'a normal game is unchanged');
  run(s, { captain: { throttle: 1, boost: true, darts: false }, gunner: { aim: { x: 0, y: -200 }, fire: true } }, 5);
});

// ---------- walking around on friendly and neutral stations ----------
test('a friendly station is walked into without a lock, and its desks open the shop', () => {
  const s = quiet(createState(1)),
    st = atStation(s, station(s, 'friendly'));
  s.players[0].tele = 30;
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, st.id, 'no lock and no teleporter needed');
  const it = st.interior,
    av = it.avatars[0];
  assert.equal(it.trade, true);
  assert.equal(it.guards.length + it.turrets.length, 0);
  assert.deepEqual(
    it.desks.map((d) => d.type),
    ['services', 'shipyard', 'armory'],
  );
  for (const d of it.desks) assert.ok(!blocked(it, d.x, d.y, 4), d.type + ' desk stands on the floor');
  step(s, { away: { 0: { fire: true, aim: { x: av.x + 50, y: av.y } } } }, DT);
  assert.equal(it.bolts.length, 0, 'weapons stay holstered');
  s.events.length = 0;
  av.x = it.desks[2].x;
  av.y = it.desks[2].y - 10;
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.ok(s.events.some((e) => e.type === 'deskUsed' && e.desk === 'armory'));
  s.credits = 500;
  step(s, { shop: [{ action: 'buy', item: 'pack' }] }, DT);
  assert.equal(s.ship.mods.pack, 1, 'buying works while standing inside');
  av.x = it.entry.x;
  av.y = it.entry.y;
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(s.players[0].inside, null);
  assert.equal(s.players[0].tele < 30.1 && s.players[0].lockedOut === null, true, 'walking out is not a teleport');
});

test('undocking calls people back from a trading station without a teleport, and a station that turns hostile throws them out', () => {
  const s = quiet(createState(1)),
    st = atStation(s, station(s, 'neutral'));
  step(s, { system: { board: [0] } }, DT);
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.players[0].inside, null);
  assert.equal(s.players[0].tele, 0, 'no teleporter cooldown');
  atStation(s, st);
  step(s, { system: { board: [0] } }, DT);
  turnHostile(s, st);
  assert.equal(s.players[0].inside, null);
  assert.equal(st.interior, null, 'the trading floor is gone');
});

test('a station that is taken over becomes a trading floor', () => {
  const s = quiet(createState(1)),
    st = station(s, 'neutral');
  turnHostile(s, st);
  atStation(s, st);
  st.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = st.interior,
    av = it.avatars[0];
  it.guards = [];
  it.turrets = [];
  it.doorOpen = true;
  it.tiles = it.tiles.map((c) => (c === 'L' ? '.' : c));
  av.x = it.terminal.x;
  av.y = it.terminal.y;
  run(s, { away: { 0: { use: true } } }, B.TAKEOVER_TIME + 0.2);
  assert.equal(st.align, 'friendly');
  av.x = it.entry.x;
  av.y = it.entry.y;
  step(s, { away: { 0: { usePressed: true } } }, DT);
  step(s, { system: { board: [0] } }, DT);
  assert.equal(st.interior.trade, true);
  assert.equal(st.interior.desks.length, 3);
});

// ---------- what the posts do for each other ----------
test('the Engineer builds up an overcharge and the post that runs the system lets it go', () => {
  const s = quiet(createState(1));
  const surge = s.ship.surge;
  step(s, { engineer: { surge: 'weapons' } }, DT);
  assert.equal(surge.sys, 'weapons');
  step(s, { gunner: { surge: true } }, DT);
  assert.equal(surge.left, 0, 'it cannot be let go before it is full');
  run(s, {}, B.SURGE_CHARGE + 0.1);
  assert.equal(surge.charge, 1);
  const before = weaponPower(s.ship);
  step(s, { captain: { surge: true } }, DT);
  assert.equal(surge.left, 0, 'the Captain does not run the weapons');
  step(s, { gunner: { surge: true } }, DT);
  assert.ok(surge.left > 0);
  assert.ok(Math.abs(weaponPower(s.ship) - before * B.SURGE_WEAPONS) < 1e-9, 'the weapons are stronger while it lasts');
  run(s, {}, B.SURGE_TIME + 0.1);
  assert.ok(Math.abs(weaponPower(s.ship) - before) < 1e-9, 'and as before when it is over');
  step(s, { engineer: { surge: 'engines' } }, DT);
  assert.equal(surge.sys, null, 'a new one cannot be started while it cools');
  run(s, {}, B.SURGE_COOL);
  step(s, { engineer: { surge: 'engines' } }, DT);
  assert.equal(surge.sys, 'engines');
  s.ship.power.engines = 0;
  step(s, {}, DT);
  assert.equal(surge.sys, null, 'a system without power loses its charge');
});

test('an overcharge of the shields gives some shield back at once, and the Engineer lets it go', () => {
  const s = quiet(createState(1));
  s.ship.shield = 0;
  s.ship.lastHit = s.time;
  step(s, { engineer: { surge: 'shields' } }, DT);
  run(s, {}, B.SURGE_CHARGE + 0.1);
  step(s, { engineer: { surge: 'shields' } }, DT);
  assert.ok(s.ship.surge.left > 0, 'the same key lets it go');
  assert.ok(s.ship.shield >= shieldMax(s.ship) * B.SURGE_SHIELD - 1);
});

test("the posts mark things for each other, and the Captain's mark makes shots hit harder", () => {
  const s = quiet(createState(1));
  const a = makeVessel(s, 'gunboat', s.ship.x + 200, s.ship.y, 'pirate');
  const b = makeVessel(s, 'gunboat', s.ship.x + 400, s.ship.y, 'pirate');
  s.vessels.push(a, b);
  step(s, { gunner: { mark: { x: b.x + 10, y: b.y } } }, DT);
  assert.equal(s.marks.gunner, b.id, 'the Gunner marks the one nearest the aim');
  step(s, { gunner: { mark: { x: b.x + 10, y: b.y } } }, DT);
  assert.equal(s.marks.gunner, null, 'and marking it again takes the mark away');
  step(s, { captain: { mark: true } }, DT);
  assert.equal(s.marks.captain, a.id, 'the Captain starts with the nearest');
  step(s, { captain: { mark: true } }, DT);
  assert.equal(s.marks.captain, b.id);
  // The same shot at both: the marked one loses more.
  const hpA = a.hp,
    hpB = b.hp;
  for (const v of [a, b]) s.bolts.push({ x: v.x, y: v.y, vx: 0, vy: 0, ttl: 1, side: 'crew', dmg: 10 });
  step(s, {}, DT);
  assert.ok(hpB - b.hp > hpA - a.hp, 'the marked ship is hit harder');
  assert.ok(Math.abs(hpB - b.hp - (hpA - a.hp) * B.MARK_BONUS) < 1e-6);
  s.vessels = [a];
  step(s, {}, DT);
  assert.equal(s.marks.captain, null, 'a mark goes when the ship is gone');
});

test('the Captain marks a spot inside the place the ship is docked at, and takes the mark away again', () => {
  const { s, it, av } = boarded();
  const spot = { x: av.x + 40, y: av.y };
  step(s, { captain: { pin: spot } }, DT);
  assert.deepEqual(it.pin, spot);
  step(s, { captain: { pin: { x: spot.x + 3, y: spot.y } } }, DT);
  assert.equal(it.pin, null, 'a second mark on the same spot removes it');
});

test('the ship that has to be destroyed to win is still there when the crew comes back', () => {
  const s = quiet(createState(1));
  const last = s.sectors.findIndex((sec) => sec.boss);
  const back = s.sectors[last].links[0];
  // Jump along a route, with the charts and the fuel that it takes.
  const jump = (to) => {
    s.ship.fuel = 100;
    if (!s.charts.includes(to)) s.charts.push(to);
    s.jump = { to, t: 1e9 };
    step(s, {}, DT);
    assert.equal(s.sector, to);
  };
  // The way to the last sector, one link at a time.
  const way = (function find(at, seen) {
    if (at === last) return [];
    for (const to of s.sectors[at].links) {
      if (seen.includes(to)) continue;
      const rest = find(to, [...seen, to]);
      if (rest) return [to, ...rest];
    }
    return null;
  })(s.sector, [s.sector]);
  for (const to of way) jump(to);
  const boss = s.vessels.find((v) => v.kind === 'cruiser');
  assert.ok(boss, 'it is there the first time');
  boss.hp -= 100;
  jump(back);
  assert.ok(!s.vessels.some((v) => v.kind === 'cruiser'), 'it does not follow the crew');
  jump(last);
  const again = s.vessels.filter((v) => v.kind === 'cruiser');
  assert.equal(again.length, 1, 'and it is there again, once');
  assert.equal(again[0].hp, boss.hp, 'as hurt as it was left');
});

test('the moment a part of the ship becomes critical is told once', () => {
  const s = quiet(createState(1));
  s.ship.shield = 0;
  s.ship.hull = 1e6;
  for (const n of s.ship.nodes) n.hp = 31;
  let told = 0;
  for (let i = 0; i < 40; i++) {
    s.events.length = 0;
    damageShip(s, 2, null);
    told += s.events.filter((e) => e.type === 'partCritical').length;
  }
  const critical = s.ship.nodes.filter((n) => n.hp < 30).length;
  assert.ok(critical > 0);
  assert.equal(told, critical, 'once for each part, and not again while it stays critical');
});

// ---------- sneaking: lockdown, alarm, guards that watch, the dart gun ----------
// Inside a hostile station with one guard, far from the boarder and looking away, and no turrets.
function sneaking() {
  const s = quiet(createState(1)),
    st = station(s, 'neutral');
  turnHostile(s, st);
  s.ship.x = st.x;
  s.ship.y = st.y + 2000;
  atStation(s, st);
  st.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = st.interior,
    av = it.avatars[0];
  it.turrets = [];
  it.guards = it.guards.slice(0, 1);
  const g = it.guards[0];
  // Somewhere with a clear line between two spots: where the boarder came in, and a little further in.
  const far = it.rooms
    .map((r) => r.mid)
    .filter((p) => los(it, av.x, av.y, p.x, p.y) && dist(av.x, av.y, p.x, p.y) > 60)
    .sort((a, b) => dist(av.x, av.y, a.x, a.y) - dist(av.x, av.y, b.x, b.y))[0];
  return { s, st, it, av, g, far };
}
// A free spot at a given distance from the boarder, with nothing between them, and the way from it to the boarder.
function spotNear(it, av, far) {
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const p = { x: av.x + Math.sin(a) * far, y: av.y - Math.cos(a) * far };
    if (!blocked(it, p.x, p.y, 6) && los(it, p.x, p.y, av.x, av.y))
      return { at: p, toward: headingTo(av.x - p.x, av.y - p.y) };
  }
  throw new Error('no free spot near the boarder');
}
// Put a guard at a spot as one that stands at its post and looks one way only.
function post(g, at, heading) {
  Object.assign(g, at, {
    route: [],
    path: [],
    looks: [heading],
    look: 0,
    heading,
    home: { ...at },
    mode: 'idle',
    pause: 0,
  });
}

test('a hostile station is in lockdown and dark, and a wreck has no alarm to sound', () => {
  const { it } = sneaking();
  assert.equal(it.mood, 'lockdown');
  assert.equal(it.dark, true);
  assert.equal(boarded().it.mood, null);
});

test('a guard sees what is in front of it and in the light, and not what is behind it or in the dark', () => {
  const { s, it, av, g } = sneaking();
  const { at, toward } = spotNear(it, av, 50);
  post(g, at, toward);
  av.lamp = true;
  assert.equal(inSight(it, g, av), true, 'in front and lit');
  post(g, at, toward + Math.PI);
  assert.equal(inSight(it, g, av), false, 'behind its back');
  post(g, at, toward);
  av.lamp = false;
  assert.equal(isLit(it, av.x, av.y), false, 'with the lamp off the boarder stands in the dark');
  const far = spotNear(it, av, B.GUARD_SIGHT_DARK + 20);
  post(g, far.at, far.toward);
  assert.equal(inSight(it, g, av), false, 'too far off to be seen in the dark');
  const close = spotNear(it, av, B.GUARD_SIGHT_DARK - 10);
  post(g, close.at, close.toward);
  assert.equal(inSight(it, g, av), true, 'near enough to be seen even so');
  assert.equal(s.players[0].inside !== null, true);
});

test('being seen takes a moment, and stepping out of sight in time is forgiven', () => {
  const { s, it, av, g } = sneaking();
  const { at, toward } = spotNear(it, av, 50);
  post(g, at, toward);
  run(s, { away: { 0: {} } }, B.GUARD_NOTICE * 0.2);
  assert.ok(av.spotted > 0 && av.spotted < 1, 'the guard is not sure yet');
  assert.equal(it.mood, 'lockdown');
  post(g, at, toward + Math.PI);
  run(s, { away: { 0: {} } }, 2);
  assert.equal(av.spotted, 0, 'it lets it go when it sees nothing more');
  post(g, at, toward);
  run(s, { away: { 0: {} } }, B.GUARD_NOTICE + 0.2);
  assert.equal(it.mood, 'alarm', 'watched for long enough, the boarder is found out');
  assert.equal(g.mode, 'alert');
});

test('an alarm wakes the whole place and lasts until the crew has left', () => {
  const { s, it, av } = sneaking();
  const st = s.things.find((t) => t.interior === it);
  step(s, { away: { 0: { aim: { x: av.x + 10, y: av.y }, fire: true } } }, DT);
  assert.equal(it.mood, 'alarm', 'a rifle shot is heard');
  assert.ok(it.guards.every((g) => g.mode === 'alert'));
  run(s, { away: { 0: {} } }, 30);
  assert.equal(it.mood, 'alarm', 'it cannot be waited out');
  s.players[0].hp = 10000;
  av.x = it.entry.x;
  av.y = it.entry.y;
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(s.players[0].inside, null);
  assert.equal(st.interior.mood, 'lockdown', 'with everyone out, the place is on its guard again');
});

test('a dart puts a guard to sleep without a sound, and it wakes again and goes back to its round', () => {
  const { s, it, av, g } = sneaking();
  s.ship.mods.tranq = 1;
  av.darts = B.TRANQ_DARTS;
  const { at, toward } = spotNear(it, av, 50);
  post(g, at, toward + Math.PI);
  step(s, { away: { 0: { swap: true } } }, DT);
  assert.equal(av.weapon, 'tranq');
  step(s, { away: { 0: { aim: { x: g.x, y: g.y }, fire: true } } }, DT);
  assert.equal(av.darts, B.TRANQ_DARTS - 1);
  run(s, { away: { 0: {} } }, 0.6);
  assert.ok(g.sleep > 0, 'the guard sleeps');
  assert.equal(it.mood, 'lockdown', 'and nobody heard a thing');
  run(s, { away: { 0: {} } }, B.TRANQ_SLEEP);
  assert.equal(g.sleep <= 0 && g.mode === 'idle', true, 'it wakes by itself and has seen nothing');
  assert.equal(it.mood, 'lockdown');
});

test('a sleeping guard can be taken down, and one that is found by another guard gives the crew away', () => {
  const { s, it, av, g } = sneaking();
  const { at, toward } = spotNear(it, av, 30);
  post(g, at, toward + Math.PI);
  g.sleep = B.TRANQ_SLEEP;
  const stood = { x: av.x, y: av.y };
  Object.assign(av, { x: g.x + Math.sin(toward) * 8, y: g.y - Math.cos(toward) * 8 });
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(g.down, true);
  run(s, { away: { 0: {} } }, B.TRANQ_SLEEP + 1);
  assert.equal(g.down, true, 'it is out for the rest of the boarding');
  assert.equal(it.mood, 'lockdown');
  // Another guard comes by and sees it lying there.
  const other = { ...JSON.parse(JSON.stringify(g)), id: s.nextId++, down: false, sleep: 0 };
  it.guards.push(other);
  // The boarder is back where they stood, in the dark, and the other guard stands there looking at the body.
  av.lamp = false;
  Object.assign(av, stood);
  post(other, { x: g.x + Math.sin(toward) * 14, y: g.y - Math.cos(toward) * 14 }, toward + Math.PI);
  assert.equal(inSight(it, other, g), true, 'the body is right in front of it');
  run(s, { away: { 0: {} } }, 0.2);
  assert.equal(it.mood, 'alarm');
});

test('guards walk the same round every time, and one at a post looks about in the same order', () => {
  const rounds = () => {
    const { s, st } = sneaking();
    const it = createInterior(s, st);
    return it.guards.map((g) => [g.route.length, g.looks.map((a) => a.toFixed(3)).join()]);
  };
  assert.deepEqual(rounds(), rounds());
  const { s, st } = sneaking();
  const guards = createInterior(s, st).guards;
  assert.ok(
    guards.some((g) => g.route.length >= 2),
    'some of them walk a round',
  );
  assert.ok(
    guards.every((g) => g.looks.length === 3),
    'and every one has ways to look',
  );
});

// ---------- turrets that watch a cone, cameras, and a light that leads a guard away ----------
// A hostile station with no guards and one turret, and a boarder in front of it or to the side of it.
function facingTurret() {
  const { s, it, av } = sneaking();
  it.guards = [];
  it.cameras = [];
  const { at, toward } = spotNear(it, av, 70);
  const t = {
    id: s.nextId++,
    ...at,
    hp: B.TURRET_HP,
    heading: toward,
    rest: toward,
    cool: 0,
    hot: 0,
    out: 0,
    turned: 0,
  };
  it.turrets = [t];
  s.players[0].hp = 10000;
  return { s, it, av, t, toward };
}

test('a turret watches a narrow cone: outside it nothing happens, inside it the turret fires and the alarm goes', () => {
  const { s, it, t, toward } = facingTurret();
  // Looking the other way, it does not see the boarder.
  t.rest = t.heading = toward + Math.PI;
  run(s, { away: { 0: {} } }, 2);
  assert.equal(it.mood, 'lockdown');
  assert.equal(t.hot, 0);
  t.rest = t.heading = toward;
  run(s, { away: { 0: {} } }, 0.5);
  assert.equal(it.mood, 'alarm', 'stepping into its cone gives the crew away');
  assert.ok(s.players[0].hp < 10000 || it.bolts.some((b) => b.owner === 'enemy'), 'and it fires');
});

test('an awake turret follows its target within an arc, and goes back to rest when it has lost it', () => {
  const { s, it, av, t, toward } = facingTurret();
  run(s, { away: { 0: {} } }, 0.3);
  assert.ok(t.hot > 0);
  // The boarder steps to the side: outside the narrow cone, but inside the arc.
  const side = toward + 0.7;
  Object.assign(av, { x: t.x + Math.sin(side) * 60, y: t.y - Math.cos(side) * 60 });
  if (los(it, t.x, t.y, av.x, av.y) && !blocked(it, av.x, av.y, 5)) {
    run(s, { away: { 0: {} } }, 1);
    assert.ok(Math.abs(angleDiff(t.heading, side)) < 0.2, 'it has turned after them');
  }
  // Behind it, out of the arc: it loses them and turns back.
  const behind = toward + Math.PI;
  Object.assign(av, { x: t.x + Math.sin(behind) * 12, y: t.y - Math.cos(behind) * 12 });
  it.mood = 'lockdown';
  run(s, { away: { 0: {} } }, B.TURRET_HOLD + 4);
  assert.equal(t.hot, 0);
  assert.ok(Math.abs(angleDiff(t.heading, t.rest)) < 0.05, 'it points the way it rests again');
});

test("a station's turret cannot be destroyed, only put out for a while by a grenade", () => {
  const { s, it, av, t } = facingTurret();
  t.rest = t.heading = t.rest + Math.PI;
  run(s, { away: { 0: { aim: { x: t.x, y: t.y }, fire: true } } }, 3);
  assert.equal(t.hp, B.TURRET_HP, 'shots do it no harm');
  assert.ok(it.turrets.includes(t));
  step(s, { away: { 0: { grenade: { x: t.x, y: t.y } } } }, DT);
  run(s, { away: { 0: {} } }, 1.5);
  assert.ok(t.out > B.TURRET_OUT - 3, 'a grenade puts it out');
  t.rest = t.heading = headingTo(av.x - t.x, av.y - t.y);
  const hp = s.players[0].hp;
  it.bolts = [];
  run(s, { away: { 0: {} } }, 2);
  assert.ok(!it.bolts.some((b) => b.owner === 'enemy') && s.players[0].hp === hp, 'while it is out it does nothing');
  run(s, { away: { 0: {} } }, B.TURRET_OUT);
  assert.ok(t.out <= 0, 'and then it is back');
  // In a wreck a turret can still be shot to pieces.
  const w = boarded();
  w.it.guards = [];
  const wt = w.it.turrets[0];
  if (wt) {
    wt.hp = 1;
    wt.rest = wt.heading = headingTo(w.av.x - wt.x, w.av.y - wt.y) + Math.PI;
    w.s.players[0].hp = 10000;
    Object.assign(w.av, { x: wt.x + Math.sin(wt.rest) * -20, y: wt.y - Math.cos(wt.rest) * -20 });
    for (let i = 0; i < 120 && w.it.turrets.includes(wt); i++) {
      step(w.s, { away: { 0: { aim: { x: wt.x, y: wt.y }, fire: true } } }, DT);
    }
    assert.ok(!w.it.turrets.includes(wt));
  }
});

test('the Engineer turns a turret to the crew, and nobody else can', () => {
  const { s, it, av, t } = facingTurret();
  t.rest = t.heading = t.rest + Math.PI;
  Object.assign(av, { x: t.x + Math.sin(t.rest) * -14, y: t.y - Math.cos(t.rest) * -14 });
  av.role = 'gunner';
  run(s, { away: { 0: { use: true } } }, B.TURRET_TURN_TIME + 0.5);
  assert.equal(t.turned, 0, 'a Gunner cannot');
  av.role = 'engineer';
  run(s, { away: { 0: { use: true } } }, B.TURRET_TURN_TIME / 2);
  assert.ok(it.turning > 0.3 && t.turned === 0, 'it takes a while');
  run(s, { away: { 0: {} } }, 0.1);
  assert.equal(it.turning, 0, 'and letting go loses the work');
  run(s, { away: { 0: { use: true } } }, B.TURRET_TURN_TIME + 0.1);
  assert.ok(t.turned > 0);
  // A guard in front of it is now what it fires at.
  const g = { ...JSON.parse(JSON.stringify(boarded().it.guards[0])), id: s.nextId++ };
  Object.assign(g, {
    x: t.x + Math.sin(t.rest) * 40,
    y: t.y - Math.cos(t.rest) * 40,
    hp: 5,
    mode: 'idle',
    route: [],
    path: [],
  });
  if (!blocked(it, g.x, g.y, 5) && los(it, t.x, t.y, g.x, g.y)) {
    it.guards = [g];
    run(s, { away: { 0: {} } }, 3);
    assert.equal(it.guards.length, 0, 'the turned turret shot the guard');
  }
  run(s, { away: { 0: {} } }, B.TURRET_TURNED + 1);
  assert.ok(t.turned <= 0, "after a while it is the station's again");
});

test("the crew's own turret can only be set down in a fight, and is gone when the fight is over", () => {
  const { s, it, av } = boarded();
  it.turrets = [];
  av.sentries = 1;
  for (const g of it.guards) Object.assign(g, { mode: 'idle', route: [], looks: [g.heading] });
  // Out of everyone's sight, so that nothing starts.
  it.guards = [];
  step(s, { away: { 0: { deploy: true } } }, DT);
  assert.equal(it.sentries.length, 0, 'with no fight on it stays in the pack');
  assert.equal(av.sentries, 1);
  const g = {
    ...JSON.parse(JSON.stringify(boarded().it.guards[0])),
    id: s.nextId++,
    mode: 'alert',
    seen: { x: av.x, y: av.y },
    lost: 0,
  };
  const far = it.rooms.map((r) => r.mid).find((p) => !los(it, p.x, p.y, av.x, av.y));
  Object.assign(g, far);
  it.guards = [g];
  step(s, { away: { 0: { deploy: true } } }, DT);
  assert.equal(it.sentries.length, 1);
  it.guards = [];
  run(s, { away: { 0: {} } }, B.SENTRY_LINGER + 0.5);
  assert.equal(it.sentries.length, 0, 'it does not outlast the fight');
});

test('a camera that sweeps over a boarder gives them away, and one that looks elsewhere does not', () => {
  const { s, it, av } = sneaking();
  it.guards = [];
  it.turrets = [];
  const { at, toward } = spotNear(it, av, 60);
  // A camera that does not sweep, to keep the test simple: it looks straight at the boarder, or away.
  const cam = { id: s.nextId++, ...at, rest: toward + Math.PI, phase: 0 };
  it.cameras = [cam];
  const still = B.CAMERA_SWEEP;
  B.CAMERA_SWEEP = 0;
  try {
    run(s, { away: { 0: {} } }, 2);
    assert.equal(it.mood, 'lockdown');
    cam.rest = toward;
    run(s, { away: { 0: {} } }, B.GUARD_NOTICE * 0.4);
    assert.ok(av.spotted > 0 && it.mood === 'lockdown', 'it takes a moment');
    run(s, { away: { 0: {} } }, B.GUARD_NOTICE);
    assert.equal(it.mood, 'alarm');
  } finally {
    B.CAMERA_SWEEP = still;
  }
});

test('a guard that sees a flare goes to look at it, once, and then back to its post', () => {
  const { s, it, av, g } = sneaking();
  s.ship.mods.flare = 1;
  av.flares = 2;
  av.lamp = false;
  const { at, toward } = spotNear(it, av, 110);
  // The guard looks toward where the flare will land, which is not where the boarder stands.
  const land = { x: (av.x + at.x) / 2, y: (av.y + at.y) / 2 };
  post(g, at, toward);
  // The boarder is out of its sight: in the dark and far enough off.
  assert.equal(inSight(it, g, av), false);
  step(s, { away: { 0: { flare: land } } }, DT);
  run(s, { away: { 0: {} } }, 1.5);
  if (inSight(it, g, av)) return;
  assert.ok(g.curious, 'it has seen the light');
  assert.equal(it.mood, 'lockdown', 'a light gives nobody away by itself');
  run(s, { away: { 0: {} } }, 14);
  if (it.mood === 'alarm') return;
  assert.equal(g.curious, null, 'when it has looked, it lets it be');
  assert.equal(it.flares[0].seen.includes(g.id), true);
  run(s, { away: { 0: {} } }, 3);
  assert.equal(g.curious, null, 'and it does not go back to the same light');
});

// ---------- alarmed doors, what each post is good at inside, and the reactor ----------
test('a station has alarmed doors, and there is always a way to the vault that goes through none of them', () => {
  let doors = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = quiet(createState(seed));
    for (const st of stations(s)) {
      turnHostile(s, st);
      const it = createInterior(s, st);
      doors += it.alarmed.length;
      assert.ok(it.alarmed.length <= B.ALARMED_DOORS);
      const shut = new Set(it.alarmed.map((d) => d.ty * it.w + d.tx));
      const vault = it.rooms[it.vault].door;
      const goal = { tx: Math.floor(vault.x / TILE), ty: Math.floor(vault.y / TILE) };
      for (const a of it.airlocks) {
        // Walk the tiles from the airlock, never stepping on an alarmed door.
        const from = { tx: Math.floor(a.x / TILE), ty: Math.floor(a.y / TILE) };
        const seen = new Set([from.ty * it.w + from.tx]);
        const queue = [from];
        let found = false;
        while (queue.length && !found) {
          const at = queue.shift();
          if (at.tx === goal.tx && at.ty === goal.ty) found = true;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const tx = at.tx + dx,
              ty = at.ty + dy,
              key = ty * it.w + tx;
            if (seen.has(key) || shut.has(key) || !'.,AL'.includes(tileAt(it, tx, ty))) continue;
            seen.add(key);
            queue.push({ tx, ty });
          }
        }
        assert.ok(found, `seed ${seed}: the vault can be reached without an alarmed door`);
      }
    }
  }
  assert.ok(doors > 0, 'some stations have alarmed doors');
});

test('walking through an alarmed door gives the crew away, unless the Engineer has switched it off', () => {
  const { s, it, av } = sneaking();
  it.guards = [];
  it.turrets = [];
  it.cameras = [];
  const door = { x: av.x + 4, y: av.y, tx: Math.floor((av.x + 4) / TILE), ty: Math.floor(av.y / TILE), off: false };
  it.alarmed = [door];
  // Standing beside it: a Gunner can do nothing about it, an Engineer switches it off.
  Object.assign(av, { x: door.x - 18, y: door.y });
  av.role = 'gunner';
  run(s, { away: { 0: { use: true } } }, B.DISARM_TIME + 0.5);
  assert.equal(door.off, false);
  av.role = 'engineer';
  run(s, { away: { 0: { use: true } } }, B.DISARM_TIME + 0.1);
  assert.equal(door.off, true);
  Object.assign(av, { x: (door.tx + 0.5) * TILE, y: (door.ty + 0.5) * TILE });
  step(s, { away: { 0: {} } }, DT);
  assert.equal(it.mood, 'lockdown', 'switched off, it can be walked through');
  door.off = false;
  step(s, { away: { 0: {} } }, DT);
  assert.equal(it.mood, 'alarm', 'and one that is on gives the crew away');
});

test('the post a boarder left makes a difference inside', () => {
  const dmgOf = (role) => {
    const { s, it, av } = boarded();
    it.guards = [];
    it.turrets = [];
    av.role = role;
    step(s, { away: { 0: { aim: { x: av.x + 50, y: av.y }, fire: true } } }, DT);
    return it.bolts[0].dmg;
  };
  assert.ok(Math.abs(dmgOf('gunner') - dmgOf('captain') * B.ROLE_RIFLE) < 1e-9, "the Gunner's rifle hits harder");
  // The vault door: the Engineer is quicker and makes no sound, anyone else is heard.
  const open = (role) => {
    const { s, it, av } = sneaking();
    it.turrets = [];
    it.cameras = [];
    it.alarmed = [];
    it.guards = [];
    av.role = role;
    const door = it.rooms[it.vault].door;
    const spot = [
      [0, 14],
      [0, -14],
      [14, 0],
      [-14, 0],
    ]
      .map(([dx, dy]) => ({ x: door.x + dx, y: door.y + dy }))
      .find((p) => !blocked(it, p.x, p.y, 5));
    Object.assign(av, spot);
    let t = 0;
    while (!it.doorOpen && t < 20) {
      step(s, { away: { 0: { use: true } } }, DT);
      t += DT;
    }
    return { t, mood: it.mood };
  };
  const eng = open('engineer'),
    cap = open('captain');
  assert.ok(eng.t < cap.t, 'the Engineer is quicker');
  assert.equal(eng.mood, 'lockdown', 'and is not heard');
  assert.equal(cap.mood, 'alarm', 'cutting the lock is heard');
  // A Gunner always brings a charge.
  const s = quiet(createState(1));
  s.players[0].post = 'gunner';
  const w = dockAt(s);
  step(s, { system: { board: [0] } }, DT);
  assert.equal(w.interior.avatars[0].charges, 1);
});

test('the Engineer steadies the reactor of a wreck and buys the crew more time, once', () => {
  const { s, it, av } = boarded();
  it.guards = [];
  it.turrets = [];
  assert.ok(it.reactor, 'a wreck has a reactor');
  Object.assign(av, { x: it.reactor.x + 8, y: it.reactor.y });
  av.role = 'captain';
  const before = it.timer;
  run(s, { away: { 0: { use: true } } }, B.STEADY_TIME + 0.5);
  assert.ok(it.timer < before, 'a Captain cannot');
  av.role = 'engineer';
  const t0 = it.timer;
  run(s, { away: { 0: { use: true } } }, B.STEADY_TIME + 0.1);
  assert.ok(it.timer > t0 + B.STEADY_GAIN - B.STEADY_TIME - 1);
  assert.equal(it.reactor.steadied, true);
  const t1 = it.timer;
  run(s, { away: { 0: { use: true } } }, B.STEADY_TIME + 0.5);
  assert.ok(it.timer < t1, 'it works only once');
});
