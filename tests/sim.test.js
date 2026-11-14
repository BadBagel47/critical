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

function dockAt(s, w = s.wrecks[0]) { s.ship.docked = w.id; s.ship.vx = s.ship.vy = 0; w.lock = 'open'; return w; }
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

test('undocking with someone inside teleports them home at the usual cost', () => {
  const { s, it, av } = boarded();
  const item = it.loot[0]; av.x = item.x; av.y = item.y; step(s, { away: { 0: {} } }, DT);
  const before = it.loot.length;
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, null, 'the ship is free');
  assert.equal(s.players[0].inside, null, 'the player is back on board');
  assert.equal(it.loot.length, before + 1, 'what was carried stays behind');
  assert.ok(s.players[0].tele > B.TELEPORT_COOLDOWN - 1, 'the teleporter has to recharge');
});

test('guards shoot at a player they can see, and the rifle kills them', () => {
  const { s, it, av } = boarded(4);
  it.turrets = []; it.guards = it.guards.slice(0, 1);
  const g = it.guards[0]; g.x = av.x + 90; g.y = av.y; g.home = { x: g.x, y: g.y };
  // Guards do not hit with every shot, so give this one a little time.
  for (let i = 0; i < 20 && s.players[0].hp === B.CREW_HP && s.players[0].inside !== null; i++) run(s, { away: { 0: {} } }, 1);
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

// ---------- break-in game ----------
import { createBreakin, flow, GW, GH } from '../src/sim/breakin.js';

test('every break-in puzzle starts unsolved and can be solved', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = createState(seed), bk = createBreakin(s, { difficulty: 1 + (seed % 3) });
    assert.equal(bk.tiles.length, GW * GH);
    assert.equal(flow(bk).solved, false, `seed ${seed} starts unsolved`);
    bk.tiles.forEach((t, i) => { t.rot = bk.solution[i]; });
    assert.equal(flow(bk).solved, true, `seed ${seed} has a solution`);
  }
});

test('boarding a locked wreck opens the break-in game, and solving it opens the lock', () => {
  const s = quiet(createState(1)), w = s.wrecks[0];
  s.ship.docked = w.id;
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, null, 'still locked out');
  assert.ok(w.breakin && w.breakin.started);
  const t0 = w.breakin.time;
  run(s, {}, 1);
  assert.ok(w.breakin.time < t0, 'the clock runs');
  // Turn every tile to its solution with rotate commands.
  const turns = [];
  w.breakin.tiles.forEach((t, i) => { for (let r = t.rot; r !== w.breakin.solution[i]; r = (r + 1) % 4) turns.push({ wreck: w.id, x: i % GW, y: Math.floor(i / GW), dir: 1 }); });
  step(s, { hack: { 0: turns } }, DT);
  assert.equal(w.lock, 'open');
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, w.id);
});

test('running out of time blows the wreck up and hurts the docked ship', () => {
  const s = quiet(createState(1)), w = s.wrecks[0];
  s.ship.docked = w.id;
  step(s, { system: { board: [0] } }, DT);
  const before = s.ship.hull + s.ship.shield;
  run(s, {}, w.breakin.total + 1);
  assert.ok(!s.wrecks.includes(w));
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
  s.ship.x = 2300; s.ship.y = 2300;
  run(s, {}, 0.5);
  assert.equal(isSeen(s, 2400, 2400), true, 'going there reveals it');
});

test('a wreck stays on the map as last seen, and pirates show only while in sight', () => {
  const s = quiet(createState(1)), w = s.wrecks[0];
  run(s, {}, 0.5);
  const wrecksKnown = () => s.known.filter((k) => k.kind === 'wreck').length;
  assert.equal(wrecksKnown(), 0, 'the first wreck is out of sight at the start');
  s.ship.x = w.x + 300; s.ship.y = w.y;
  run(s, {}, 0.5);
  assert.equal(wrecksKnown(), 1);
  s.ship.x = 0; s.ship.y = 0;
  s.wrecks = s.wrecks.filter((x) => x !== w);
  run(s, {}, 0.5);
  assert.equal(wrecksKnown(), 1, 'still shown where it was last seen');
  s.ship.x = w.x + 300; s.ship.y = w.y;
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
  assert.ok(s.known.some((k) => k.kind === 'wreck'), 'the pulse finds the nearest wreck');
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
  s.ship.x = 2000; s.ship.y = 2000;
  run(s, {}, 1);
  assert.equal(visionSources(s).filter((v) => v.kind === 'buoy').length, 1);
  assert.equal(isVisible(s, 100, 0), true, 'the buoy still sees its area');
  s.pirates.push({ id: 99, kind: 'fighter', x: 40, y: 0, vx: 0, vy: 0, heading: 0, hp: 24, mode: 'breakoff', timer: 0.5, burst: 0, burstTimer: 0, cool: 1e9, side: 1 });
  run(s, {}, 1.5);
  assert.ok(s.buoys.length === 0 || s.buoys[0].hp < B.BUOY_HP);
});

// ---------- stations, shop and upgrades ----------
import { CATALOG, blockedReason, buyUpgrade, hullMax, shieldMax, powerTotal, slotsUsed } from '../src/sim/upgrades.js';
import { servicePrices, turnHostile } from '../src/sim/stations.js';
import { jumpBlocked } from '../src/sim/sectors.js';
import { weaponsOf, hurtPirate } from '../src/sim/step.js';

const station = (s, align) => s.stations.find((x) => x.align === align);
function atStation(s, st) { s.ship.docked = st.id; s.ship.vx = s.ship.vy = 0; return st; }

test('the first sector has a friendly shipyard in sight and a neutral station further out', () => {
  const s = quiet(createState(1));
  run(s, {}, 0.5);
  const yard = station(s, 'friendly');
  assert.ok(yard && yard.shipyard);
  assert.ok(s.known.some((k) => k.kind === 'station' && k.align === 'friendly'), 'the yard is on the map from the start');
  assert.ok(station(s, 'neutral'));
});

test('fuel is free at a friendly station and costs credits at a neutral one', () => {
  const s = quiet(createState(1));
  s.ship.fuel = 40;
  atStation(s, station(s, 'friendly'));
  step(s, { shop: [{ action: 'refuel' }] }, DT);
  assert.equal(s.ship.fuel, B.FUEL_MAX);
  assert.equal(s.credits, 0);
  s.ship.fuel = 40; s.credits = 30;
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
  buyUpgrade(s, 'emit'); buyUpgrade(s, 'core');
  assert.equal(shieldMax(s.ship), B.SHIELD_MAX + 50);
  assert.equal(powerTotal(s.ship), B.POWER_TOTAL + 2);
  assert.equal(setPower(s, 'weapons', 1), true, 'the extra power can be used');
});

test('shooting a neutral station turns it hostile, and its guns open fire', () => {
  const s = quiet(createState(1)), st = station(s, 'neutral');
  s.ship.x = st.x; s.ship.y = st.y + 200;
  run(s, (x) => ({ gunner: { aim: { x: st.x, y: st.y }, fire: true } }), 4);
  assert.equal(st.align, 'hostile');
  const before = s.ship.shield + s.ship.hull;
  run(s, {}, 5);
  assert.ok(s.ship.shield + s.ship.hull < before, 'the station shoots back');
});

test('a hostile station is broken into, boarded and taken over from its terminal', () => {
  const s = quiet(createState(1)), st = station(s, 'neutral');
  turnHostile(s, st);
  s.ship.x = st.x; s.ship.y = st.y + 2000;
  atStation(s, st);
  step(s, { system: { board: [0] } }, DT);
  assert.ok(st.breakin, 'the lock must be bypassed first');
  st.breakin.time = 0.01;
  run(s, {}, 0.2);
  assert.ok(s.stations.includes(st), 'a station does not blow up');
  assert.equal(s.pirates.length, 2, 'it fights back instead');
  s.pirates = [];
  st.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = st.interior, av = it.avatars[0];
  assert.ok(it.terminal && it.timer === null, 'no reactor countdown in a station');
  it.guards = []; it.turrets = []; it.doorOpen = true;
  av.x = it.terminal.x; av.y = it.terminal.y;
  run(s, { away: { 0: { use: true } } }, B.TAKEOVER_TIME + 0.2);
  assert.equal(st.align, 'friendly');
  assert.equal(st.shipyard, true);
  assert.equal(st.guns.length, 0);
});

// ---------- weapons and darts ----------
const target = (s, x, y, kind = 'fighter', hp = 24) => { const p = { id: s.nextId++, kind, x, y, vx: 0, vy: 0, heading: 0, hp, hpMax: hp, mode: 'breakoff', timer: 1e9, burst: 0, burstTimer: 0, cool: 1e9, side: 1, guns: [9, 9, 9], spawn: 1e9 }; s.pirates.push(p); return p; };

test('the heavy laser charges while held and hits everything straight ahead', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000; s.ship.y = 5000;
  s.ship.mods.heavy = 1;
  assert.deepEqual(weaponsOf(s.ship), ['pulse', 'heavy']);
  const a = target(s, 5000, 4800, 'gunboat', 60), b = target(s, 5000, 4600, 'gunboat', 60), side = target(s, 5300, 4800, 'gunboat', 60);
  for (const p of s.pirates) p.mode = 'still';
  step(s, { gunner: { weapon: 'heavy' } }, DT);
  s.pirates.forEach((p) => { p.x0 = p.x; p.y0 = p.y; });
  const hold = (st) => { st.pirates.forEach((p) => { p.x = p.x0; p.y = p.y0; }); return { gunner: { fire: true } }; };
  run(s, hold, 0.4);
  step(s, { gunner: { fire: false } }, DT);
  assert.equal(s.kills, 0, 'letting go early wastes the charge');
  run(s, hold, B.HEAVY_CHARGE + 0.3);
  s.pirates.forEach((p) => { p.x = p.x0; p.y = p.y0; });
  step(s, { gunner: { fire: false } }, DT);
  assert.equal(s.kills, 2, 'both ships in line are destroyed');
  assert.ok(s.pirates.includes(side), 'the one off to the side is untouched');
});

test('rockets home in on a pirate and run out', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000; s.ship.y = 5000;
  s.credits = 500; buyUpgrade(s, 'rockets');
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
  s.bolts = []; s.ship.fireCooldown = 0; s.ship.mods.twin = 1;
  step(s, { gunner: { aim: { x: 0, y: -300 }, fire: true } }, DT);
  assert.equal(s.bolts.length, 3);
});

test('darts launch on the captain\'s order, fight pirates and come home again', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000; s.ship.y = 5000;
  step(s, { captain: { darts: true } }, DT);
  assert.equal(s.darts.length, 0, 'no fighter bay yet');
  s.credits = 1000; buyUpgrade(s, 'bay');
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

test('with autolaunch the darts go out by themselves when pirates show up', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000; s.ship.y = 5000;
  s.credits = 1000; buyUpgrade(s, 'bay'); buyUpgrade(s, 'auto');
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
  s.ship.fuel = 80; s.ship.docked = s.wrecks[0].id;
  assert.equal(jumpBlocked(s, 1), 'UNDOCK FIRST');
  s.ship.docked = null;
  assert.equal(jumpBlocked(s, 1), null);
});

test('jumping takes time and fuel, changes the sector, and the old sector is remembered', () => {
  const s = quiet(createState(1));
  s.charts.push(1); s.ship.fuel = 80;
  run(s, {}, 0.5);
  const oldWrecks = s.wrecks.map((w) => w.id), seenBefore = s.map.seen.filter(Boolean).length;
  step(s, { captain: { jump: 1 } }, DT);
  assert.ok(s.jump);
  run(s, {}, B.JUMP_CHARGE / 2);
  assert.equal(s.sector, 0, 'still charging');
  run(s, {}, B.JUMP_CHARGE / 2 + 0.2);
  assert.equal(s.sector, 1);
  assert.equal(s.ship.fuel < 80 - B.JUMP_FUEL + 0.01, true);
  assert.ok(!s.wrecks.some((w) => oldWrecks.includes(w.id)), 'a new sector has its own wrecks');
  assert.ok(s.stations.some((x) => x.align === 'hostile'), 'the second sector has a hostile station');
  s.spawn.timer = 1e9;
  step(s, { captain: { jump: 0 } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, 0);
  assert.deepEqual(s.wrecks.map((w) => w.id), oldWrecks, 'the first sector is as it was left');
  assert.ok(s.map.seen.filter(Boolean).length >= seenBefore);
});

test('a star chart can be bought at a station or carried out of a vault', () => {
  const s = quiet(createState(1)), yard = station(s, 'friendly');
  atStation(s, yard); s.credits = 500;
  assert.ok(yard.chart !== null);
  step(s, { shop: [{ action: 'chart' }] }, DT);
  assert.ok(s.charts.includes(yard.chart));
  assert.equal(s.credits, 500 - B.CHART_PRICE.friendly);
});

test('destroying the cruiser in the last sector wins the game, and gunboats leave wrecks', () => {
  const s = quiet(createState(1));
  s.sector = 3; s.charts.push(4); s.ship.fuel = 80;
  step(s, { captain: { jump: 4 } }, DT);
  run(s, {}, B.JUMP_CHARGE + 0.2);
  assert.equal(s.sector, 4);
  const boss = s.pirates.find((p) => p.kind === 'cruiser');
  assert.ok(boss);
  s.spawn.timer = 1e9;
  const wrecks = s.wrecks.length;
  const gb = target(s, s.ship.x + 3000, s.ship.y, 'gunboat', 10);
  hurtPirate(s, gb, 50);
  assert.equal(s.wrecks.length, wrecks + 1);
  hurtPirate(s, boss, B.CRUISER_HP);
  assert.equal(s.won, true);
});

// ---------- enemy alarm ----------
test('the enemy alarm counts pirates far out, and a higher level reaches further', () => {
  const s = quiet(createState(1));
  s.ship.x = 5000; s.ship.y = 5000;
  target(s, 5000, 5000 - 1200, 'fighter', 500);
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 0, 'no alarm installed');
  s.ship.mods.alarm = 1; s.pirates[0].y = 5000 - 1200;
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 0, 'level 1 does not reach that far');
  s.ship.mods.alarm = 2; s.pirates[0].y = 5000 - 1200;
  run(s, {}, 0.1);
  assert.equal(s.alarm.count, 1);
  assert.ok(s.alarm.eta > 0);
});

// ---------- cargo pods, more break-in games and distress calls ----------
test('a station lock wants the code the engineer can see, and the code changes', () => {
  const s = quiet(createState(1)), st = station(s, 'neutral');
  turnHostile(s, st); s.ship.x = st.x; s.ship.y = st.y + 3000; atStation(s, st);
  step(s, { system: { board: [0] } }, DT);
  const bk = st.breakin;
  assert.equal(bk.kind, 'code');
  assert.equal(bk.code.length, B.CODE_LEN);
  const wrong = bk.code.map((d) => (d % B.CODE_DIGITS) + 1), t0 = bk.time;
  step(s, { hack: { 0: wrong.map((digit) => ({ wreck: st.id, digit })) } }, DT);
  assert.equal(st.lock, 'locked');
  assert.ok(bk.time < t0 - B.CODE_PENALTY + 0.1, 'a wrong code costs time');
  const first = bk.code.join('');
  run(s, {}, B.CODE_SHIFT + 0.5);
  assert.notEqual(bk.code.join(''), first, 'the code has changed');
  step(s, { hack: { 0: bk.code.map((digit) => ({ wreck: st.id, digit })) } }, DT);
  assert.equal(st.lock, 'open');
});

test('a cargo pod opens after three good stops of the needle and gives its cargo', () => {
  const s = quiet(createState(1)), pod = s.pods[0];
  s.ship.docked = pod.id;
  step(s, { system: { board: [0] } }, DT);
  const bk = pod.breakin;
  assert.equal(bk.kind, 'dial');
  for (let stage = 0; stage < B.DIAL_STAGES; stage++) {
    for (let i = 0; i < 2000 && Math.abs(((bk.angle - bk.mark + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > bk.width / 4; i++) step(s, {}, DT);
    step(s, { hack: { 0: [{ wreck: pod.id, stop: true }] } }, DT);
  }
  assert.ok(!s.pods.includes(pod), 'the pod is emptied and gone');
  assert.ok(s.credits >= B.POD_CREDITS[0]);
  assert.equal(s.ship.docked, null);
});

test('three misses on a cargo pod set off an alarm that brings pirates', () => {
  const s = quiet(createState(1)), pod = s.pods[0];
  s.ship.docked = pod.id;
  step(s, { system: { board: [0] } }, DT);
  const bk = pod.breakin;
  for (let n = 0; n < B.DIAL_MISSES; n++) {
    for (let i = 0; i < 2000 && Math.abs(((bk.angle - bk.mark + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < bk.width; i++) step(s, {}, DT);
    step(s, { hack: { 0: [{ wreck: pod.id, stop: true }] } }, DT);
  }
  run(s, {}, 0.1);
  assert.ok(s.pods.includes(pod), 'the pod is still there');
  assert.equal(pod.breakin, null, 'with a fresh lock');
  assert.ok(s.pirates.length > 0, 'and pirates are on their way');
});

test('a station under attack calls for help, and a neutral one repays it with a discount and its shipyard', () => {
  const s = quiet(createState(1));
  s.sector = 0; s.charts.push(1); s.ship.fuel = 90;
  step(s, { captain: { jump: 1 } }, DT); run(s, {}, B.JUMP_CHARGE + 0.2);
  s.spawn.timer = 1e9;
  const st = station(s, 'neutral');
  assert.ok(st.shipyard, 'this neutral station has a shipyard');
  atStation(s, st); s.credits = 1000;
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(s.ship.mods.armor, undefined, 'closed to strangers');
  s.ship.docked = null; s.ship.x = st.x + 2500; s.ship.y = st.y;
  s.stations = [st]; s.raidTimer = 0.1;
  run(s, {}, 0.5);
  assert.ok(s.raid && s.raid.station === st.id);
  const raiders = s.pirates.filter((p) => p.raid === s.raid.id);
  assert.ok(raiders.length >= 2);
  run(s, {}, 5);
  assert.ok(raiders.every((p) => Math.hypot(p.x - st.x, p.y - st.y) < 500), 'the raiders stay at the station');
  for (const p of raiders) hurtPirate(s, p, 999);
  run(s, {}, 0.2);
  assert.equal(s.raid, null);
  assert.ok(st.favor > 0);
  assert.equal(st.align, 'neutral', 'it stays neutral');
  atStation(s, st);
  const before = s.credits;
  step(s, { shop: [{ action: 'buy', item: 'armor' }] }, DT);
  assert.equal(s.ship.mods.armor, 1, 'the shipyard is open now');
  assert.equal(before - s.credits, Math.round(CATALOG.armor.price * B.FAVOR_DISCOUNT), 'at a discount');
  run(s, {}, B.FAVOR_TIME + 1);
  assert.equal(st.favor, 0, 'the favour runs out');
});

test('a distress call that nobody answers just ends', () => {
  const s = quiet(createState(1));
  s.raidTimer = 0.1; s.ship.x = 9000; s.ship.y = 9000;
  run(s, {}, 0.5);
  assert.ok(s.raid);
  run(s, {}, B.RAID_TIME + 1);
  assert.equal(s.raid, null);
  assert.equal(s.pirates.length, 0, 'the raiders are gone');
  assert.ok(s.stations.every((st) => st.favor === 0));
});

// ---------- more upgrades and boarding gear ----------
import { fuelMax, jumpCharge, jumpFuel, crewHpMax, carryMax, rifleDmg, teleCooldown, itemsOf } from '../src/sim/upgrades.js';

test('every catalog item belongs to a tab, and boarding gear is sold without a shipyard', () => {
  for (const id of Object.keys(CATALOG)) assert.ok(['hull', 'system', 'armory'].includes(CATALOG[id].tab), id);
  assert.ok(itemsOf('armory').length >= 6);
  const s = quiet(createState(1));
  atStation(s, station(s, 'neutral')); s.credits = 1000;
  step(s, { shop: [{ action: 'buy', item: 'pack' }] }, DT);
  assert.equal(s.ship.mods.pack, 1);
  step(s, { shop: [{ action: 'buy', item: 'tank' }] }, DT);
  assert.equal(s.ship.mods.tank, undefined, 'a hull upgrade still needs a shipyard');
});

test('fuel tank, jump coils and the afterburner change how the ship travels', () => {
  const s = quiet(createState(1));
  s.credits = 2000; buyUpgrade(s, 'tank'); buyUpgrade(s, 'jumpcoil'); buyUpgrade(s, 'boost');
  assert.equal(fuelMax(s.ship), B.FUEL_MAX + B.TANK_FUEL);
  assert.equal(jumpCharge(s.ship), B.COIL_CHARGE);
  assert.equal(jumpFuel(s.ship), B.COIL_FUEL);
  const plain = quiet(createState(1));
  s.ship.x = plain.ship.x = 6000; s.ship.fuel = plain.ship.fuel = 100;
  run(s, { captain: { throttle: 1, boost: true } }, 6); run(plain, { captain: { throttle: 1, boost: true } }, 6);
  assert.ok(speedOf(s.ship) > speedOf(plain.ship) * 1.5, 'the afterburner is much faster');
  assert.ok(100 - s.ship.fuel > (100 - plain.ship.fuel) * 3, 'and burns much more fuel');
});

test('destroyed pirates leave salvage, and the tractor beam pulls it in', () => {
  const s = quiet(createState(1));
  s.ship.x = 6000; s.ship.y = 6000;
  const gb = target(s, 6200, 6000, 'gunboat', 10);
  hurtPirate(s, gb, 99);
  assert.equal(s.salvage.length, 2);
  const credits = s.credits;
  run(s, {}, 3);
  assert.equal(s.credits, credits, 'too far away to collect');
  s.ship.mods.tractor = 1;
  run(s, {}, 4);
  assert.equal(s.salvage.length, 0);
  assert.ok(s.credits > credits);
});

test('point defense stops some incoming fire, and repair drones mend the ship', () => {
  const hits = (pd) => {
    const s = quiet(createState(1));
    s.ship.x = 6000; s.ship.y = 6000; s.ship.power.shields = 0;
    if (pd) s.ship.mods.pd = 1;
    for (let i = 0; i < 200; i++) { s.bolts.push({ x: 6000, y: 5800, vx: 0, vy: 290, ttl: 1.5, owner: 'pirate', dmg: 1 }); run(s, {}, 0.1); }
    run(s, {}, 2);
    return B.SHIELD_MAX + B.HULL_MAX - s.ship.shield - s.ship.hull;
  };
  const without = hits(false), withPd = hits(true);
  assert.ok(withPd < without * 0.85, `point defense lets less through (${withPd} against ${without})`);
  const s = quiet(createState(1));
  s.ship.power.repair = 0; s.ship.hull = 100; s.ship.nodes[1].hp = 40; s.ship.mods.drones = 1;
  run(s, {}, 10);
  assert.ok(s.ship.hull > 110 && s.ship.nodes[1].hp > 60);
});

test('boarding gear changes what a boarder can do', () => {
  const plain = quiet(createState(1));
  assert.equal(carryMax(plain.ship), B.CARRY_MAX);
  const s = quiet(createState(1)), w = dockAt(s);
  s.credits = 3000;
  for (const id of ['rifle', 'rifle', 'pack', 'suit', 'coils', 'charge', 'sentry', 'hack']) buyUpgrade(s, id);
  assert.equal(rifleDmg(s.ship), B.RIFLE_DMG + 2 * B.RIFLE_STEP);
  assert.equal(carryMax(s.ship), B.CARRY_MAX + B.PACK_EXTRA);
  assert.equal(crewHpMax(s.ship), B.CREW_HP + B.SUIT_HP);
  assert.equal(teleCooldown(s.ship), B.COIL_TELEPORT);
  run(s, {}, 0.1);
  assert.equal(s.players[0].hp, B.CREW_HP + B.SUIT_HP);
  step(s, { system: { board: [0] } }, DT);
  const it = w.interior, av = it.avatars[0];
  assert.equal(av.charges, B.CHARGES); assert.equal(av.sentries, 1);
  // The breaching charge opens the vault at once and alerts the guards.
  const door = it.rooms[it.vault].door;
  av.x = door.x; av.y = door.y + (door.y < 9 * TILE ? 14 : -14);
  step(s, { away: { 0: { charge: true } } }, DT);
  assert.equal(it.doorOpen, true);
  assert.ok(it.guards.every((g) => g.mode === 'alert'));
  // The deployable turret shoots a guard on its own.
  it.turrets = []; it.guards = it.guards.slice(0, 1);
  const g = it.guards[0]; av.x = it.entry.x + 40; av.y = it.entry.y; g.x = av.x + 80; g.y = av.y; g.hp = 12;
  step(s, { away: { 0: { deploy: true } } }, DT);
  assert.equal(it.sentries.length, 1);
  av.x = it.entry.x; av.y = it.entry.y - 20;
  run(s, { away: { 0: {} } }, 4);
  assert.equal(it.guards.length, 0, 'the sentry dealt with the guard');
});

test('a hacking kit gives more time in a break-in', () => {
  const a = quiet(createState(1)), b = quiet(createState(1));
  b.ship.mods.hack = 1;
  for (const s of [a, b]) { s.ship.docked = s.wrecks[0].id; step(s, { system: { board: [0] } }, DT); }
  assert.ok(b.wrecks[0].breakin.total > a.wrecks[0].breakin.total * 1.3);
});

// ---------- test mode ----------
test('test mode starts with everything installed, room for it, credits and all charts', () => {
  const s = createState(1, { test: true });
  assert.equal(s.test, true);
  for (const id of Object.keys(CATALOG)) assert.ok(['INSTALLED', 'MAXED', 'OWNED'].includes(blockedReason(s, id)), id + ' is in place');
  assert.ok(slotsUsed(s.ship, 'hard') <= s.ship.slots.hard && slotsUsed(s.ship, 'system') <= s.ship.slots.system);
  assert.equal(s.ship.hull, hullMax(s.ship)); assert.equal(s.ship.fuel, fuelMax(s.ship));
  assert.equal(s.ship.rockets, B.ROCKET_LOAD); assert.equal(s.ship.dartStock, B.DART_COUNT);
  assert.equal(s.charts.length, s.sectors.length);
  assert.deepEqual(weaponsOf(s.ship), ['pulse', 'heavy', 'rockets']);
  assert.equal(createState(1).test, false, 'a normal game is unchanged');
  run(s, { captain: { throttle: 1, boost: true, darts: false }, gunner: { aim: { x: 0, y: -200 }, fire: true } }, 5);
});
