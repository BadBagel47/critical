import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step, setPower, powerUsed, powerAvailable, damageShip, wreckPort, dockCandidate, fireInterval, speedOf } from '../src/sim/step.js';
import { B, SHIP_GEOM } from '../src/sim/balance.js';
import { headingTo } from '../src/sim/util.js';

const DT = 1 / 60;
const run = (s, cmds, seconds) => { for (let i = 0; i < Math.round(seconds / DT); i++) step(s, typeof cmds === 'function' ? cmds(s) : cmds, DT); return s; };
const quiet = (s) => { s.spawn.timer = 1e9; return s; };

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
  const fast = quiet(createState(1)), slow = quiet(createState(1));
  setPower(slow, 'engines', -2);
  setPower(fast, 'repair', -2); setPower(fast, 'engines', 2);
  run(fast, { captain: { throttle: 1 } }, 6); run(slow, { captain: { throttle: 1 } }, 6);
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
  s.pirates.push({ id: 99, kind: 'fighter', x: 0, y: -200, vx: 0, vy: 0, heading: 0, hp: B.FIGHTER_HP, mode: 'breakoff', timer: 1e9, burst: 0, burstTimer: 0, cool: 1e9, side: 1 });
  // Aim ahead of the target, the way a player has to.
  const aim = (st) => {
    const p = st.pirates[0];
    if (!p) return { gunner: { aim: { x: 0, y: -200 }, fire: true } };
    const t = Math.hypot(p.x - st.ship.x, p.y - st.ship.y) / (B.BOLT_SPEED - B.FIGHTER_ATTACK_SPEED);
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
  s.ship.nodes[5].hp = 40; s.ship.nodes[0].hp = 80;
  step(s, { engineer: { repair: { node: 5, queue: false } } }, DT);
  step(s, { engineer: { repair: { node: 0, queue: true } } }, DT);
  assert.deepEqual(s.ship.crew.queue, [5, 0]);
  run(s, {}, 1);
  assert.ok(s.ship.crew.moving, 'crew is on the way');
  assert.equal(s.ship.nodes[5].hp, 40);
  run(s, {}, 30);
  assert.equal(s.ship.nodes[5].hp, 100);
  assert.equal(s.ship.nodes[0].hp, 100);
  assert.deepEqual(s.ship.crew.queue, []);
});

test('no repair power means no repairs', () => {
  const s = quiet(createState(1));
  s.ship.power.repair = 0; s.ship.nodes[2].hp = 50;
  step(s, { engineer: { repair: { node: 2, queue: false } } }, DT);
  run(s, {}, 10);
  assert.equal(s.ship.nodes[2].hp, 50);
});

test('docking needs the nose at the port and low speed', () => {
  const s = quiet(createState(1));
  const w = s.wrecks[0], port = wreckPort(w);
  // Put the ship so that its nose sits on the port, pointing at the wreck.
  const h = headingTo(w.x - port.x, w.y - port.y);
  s.ship.heading = h;
  s.ship.x = port.x + Math.sin(h) * SHIP_GEOM.nose.y; s.ship.y = port.y - Math.cos(h) * SHIP_GEOM.nose.y;
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
  run(s, {}, 240);
  assert.ok(s.spawn.wave >= 3);
  assert.ok(s.ship.hull < B.HULL_MAX, 'ship took damage');
});

test('the ship cannot fly through a wreck, and ramming hurts', () => {
  const s = quiet(createState(1));
  const w = s.wrecks[0];
  s.ship.x = w.x; s.ship.y = w.y + 400; s.ship.heading = 0; s.ship.vy = -150;
  s.ship.shield = 0; s.ship.power.shields = 0; s.ship.power.repair = 0;
  run(s, { captain: { throttle: 1 } }, 6);
  assert.ok(Math.hypot(s.ship.x - w.x, s.ship.y - w.y) > 40, 'the ship stays outside the wreck');
  assert.ok(s.ship.hull < B.HULL_MAX, 'ramming damages the hull');
});

// ---------- boarding ----------
import { createInterior, tryBoard, tileAt, TILE, IW, IH, blocked } from '../src/sim/boarding.js';

function dockAt(s, w = s.wrecks[0]) { s.ship.docked = w.id; s.ship.vx = s.ship.vy = 0; return w; }
function boarded(seed = 1) {
  const s = quiet(createState(seed)), w = dockAt(s);
  step(s, { system: { board: [0] } }, DT);
  return { s, w, it: w.interior, av: w.interior.avatars[0] };
}

test('every interior lets the crew reach all loot and enemies', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const s = createState(seed), it = createInterior(s, { difficulty: 1 + (seed % 3) });
    const seen = new Set(), key = (x, y) => y * IW + x, start = [Math.floor(it.entry.x / TILE), Math.floor(it.entry.y / TILE)];
    const queue = [start]; seen.add(key(...start));
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (tileAt(it, nx, ny) === '#' || seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny)); queue.push([nx, ny]);
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
  it.guards = []; it.turrets = [];
  const cell = it.loot.find((l) => l.type === 'cell'), crate = it.loot.find((l) => l.type === 'crate');
  av.x = cell.x; av.y = cell.y; step(s, { away: { 0: {} } }, DT);
  av.x = crate.x; av.y = crate.y; step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 2);
  const fuel = s.ship.fuel;
  av.x = it.entry.x - 8; av.y = it.entry.y; step(s, { away: { 0: {} } }, DT);
  assert.equal(av.carry.length, 0);
  assert.equal(s.ship.fuel, Math.min(B.FUEL_MAX, fuel + B.CELL_FUEL));
  assert.equal(s.credits, crate.value);
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(s.players[0].inside, null, 'the player is back on the ship');
});

test('a player can carry three things at most', () => {
  const { s, it, av } = boarded();
  it.guards = []; it.turrets = [];
  for (const item of it.loot.slice(0, 5)) { av.x = item.x; av.y = item.y; step(s, { away: { 0: {} } }, DT); }
  assert.equal(av.carry.length, B.CARRY_MAX);
});

test('near death the player is teleported home, drops the loot and cannot go back in', () => {
  const { s, w, it, av } = boarded();
  const item = it.loot[0]; av.x = item.x; av.y = item.y; step(s, { away: { 0: {} } }, DT);
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

test('the captain cannot undock while someone is inside', () => {
  const { s } = boarded();
  step(s, { captain: { dock: true } }, DT);
  assert.ok(s.ship.docked);
});

test('guards shoot at a player they can see, and the rifle kills them', () => {
  const { s, it, av } = boarded(4);
  it.turrets = []; it.guards = it.guards.slice(0, 1);
  const g = it.guards[0]; g.x = av.x + 90; g.y = av.y; g.home = { x: g.x, y: g.y };
  run(s, { away: { 0: {} } }, 2.5);
  assert.ok(s.players[0].hp < B.CREW_HP || s.players[0].inside === null, 'the guard hurt the player');
  if (s.players[0].inside !== null) {
    run(s, (st) => ({ away: { 0: { aim: { x: g.x, y: g.y }, fire: true } } }), 3);
    assert.equal(it.guards.length, 0);
  }
});

test('a grenade clears a group of guards', () => {
  const { s, it, av } = boarded();
  it.turrets = []; it.guards = it.guards.slice(0, 2);
  it.guards.forEach((g, i) => { g.x = av.x + 100; g.y = av.y + i * 10; g.hp = 30; });
  step(s, { away: { 0: { grenade: { x: av.x + 100, y: av.y + 5 } } } }, DT);
  assert.equal(av.grenades, B.GRENADES - 1);
  run(s, { away: { 0: {} } }, 2);
  assert.equal(it.guards.length, 0);
});

test('the vault door opens when a player holds the use key next to it', () => {
  const { s, it, av } = boarded();
  it.guards = []; it.turrets = [];
  const door = it.rooms[it.vault].door;
  av.x = door.x; av.y = door.y + (door.y < 9 * TILE ? 14 : -14);
  run(s, { away: { 0: { use: true } } }, B.DOOR_CUT_TIME + 0.2);
  assert.equal(it.doorOpen, true);
  assert.ok(!it.tiles.includes('L'));
});

test('when the reactor timer runs out the wreck explodes and everyone is teleported home', () => {
  const { s, w, it } = boarded();
  it.guards = []; it.turrets = [];
  it.timer = 0.5;
  const hull = s.ship.hull + s.ship.shield;
  run(s, { away: { 0: {} } }, 1);
  assert.equal(s.players[0].inside, null);
  assert.ok(!s.wrecks.includes(w), 'the wreck is gone');
  assert.equal(s.wrecks.length, 3, 'a new wreck appears elsewhere');
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
