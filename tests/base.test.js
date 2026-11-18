// The standard base (D-217, F-244, F-209, F-210, F-245 to F-247, F-250): its outside in space, its three floors,
// the airlock, the power, what gets worse once it is out, and how lockdown and an alarm look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf, portsOf } from '../src/sim/things.js';
import { createInterior, tryBoard, floorArea } from '../src/sim/boarding.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { layOut } from '../src/sim/layout.js';
import { basePlan, turnsOf, RADIUS } from '../src/sim/base.js';
import { BASE } from '../src/sim/kinds.js';
import { gunSlots, remountGuns, takeOver, fall, defenseOf, GUNS_AT } from '../src/sim/stations.js';
import { cutPower } from '../src/sim/pressure.js';
import { blocked, los, solidAt, deckOf, TILE } from '../src/sim/floor.js';
import { stepDoors } from '../src/sim/furnish.js';
import { B } from '../src/sim/balance.js';
import { dist } from '../src/sim/util.js';
import { attitudeOf, ATTITUDE, dimLamp, paintedName, windowLook } from '../src/render/base.js';
import { doorLamp, lockColour } from '../src/render/boarding.js';
import { oldShip } from './helpers.js';

const DT = 1 / 20;
const quiet = (seed = 1) => {
  const s = createState(seed);
  oldShip(s);
  gatherForTesting(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  return s;
};
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, cmds, DT);
};
const free = (s) => thingsOf(s, 'station').find((st) => !st.home && !st.sanctuary && st.side !== 'pirate');
// A base that counts the crew as an enemy, with player 0 just inside it.
function insideHostile(seed = 1) {
  const s = quiet(seed);
  const st = free(s);
  s.standing[st.side] = -100;
  step(s, {}, DT);
  for (const g of st.guns) g.hp = 0;
  s.ship.docked = st.id;
  s.ship.vx = s.ship.vy = 0;
  st.lock = 'open';
  assert.ok(tryBoard(s, 0));
  const it = st.interior;
  return { s, st, it, av: it.avatars[0] };
}

// ---------- the outside ----------
test('R-1152 R-1153 R-1155 R-1156: the shape of a base: a closed disc to the ring, ports, arms and three domes', () => {
  // The basement reaches all the way out to the ring, with no gap between.
  assert.ok(BASE.domes[0] >= BASE.ring[0] - 2 * BASE.scale, 'the basement reaches the ring');
  // Three domes, the basement widest and the top smallest.
  assert.ok(BASE.domes[0] > BASE.domes[1] && BASE.domes[1] > BASE.domes[2]);
  // Four ports on the ring, on the diagonals, and four cargo arms straight out, under the ring.
  assert.equal(BASE.ports.length, 4);
  for (const p of BASE.ports) {
    assert.ok(Math.abs(Math.abs(p.x) - Math.abs(p.y)) < 1e-6, 'a port sits on a diagonal');
    assert.ok(Math.hypot(p.x, p.y) > BASE.ring[1], 'out at the edge of the ring');
  }
  assert.equal(BASE.arms.length, 4);
  for (const a of BASE.arms) assert.ok(a.x === 0 || a.y === 0, 'a cargo arm goes straight out');
  // The bridge runs from the airlock to a port: up and to the left, where the airlock of the middle floor is.
  assert.ok(BASE.ports.some((p) => Math.abs(Math.atan2(p.y, p.x) - BASE.bridge) < 1e-6));
  const plan = basePlan(createState(2), { heading: 0 });
  const lock = plan.airlocks[0];
  const mid = plan.decks[1];
  const out = Math.atan2(lock.y - mid.cy, lock.x - mid.cx);
  assert.ok(Math.abs(out - BASE.bridge) < 0.05, 'the airlock is where the bridge meets the middle floor');
});

test('R-1157 R-1162 R-1169: outside and inside agree, the base stands its own way, and a shipyard has its dock', () => {
  const s = quiet(3);
  const stations = thingsOf(s, 'station');
  assert.ok(new Set(stations.map((st) => st.heading.toFixed(3))).size > 1, 'bases stand turned their own ways');
  for (const st of stations) {
    const plan = layOut(s, st);
    // Inside, the plan is turned in quarter turns only, the nearest to how the base stands outside.
    assert.equal(plan.turns, turnsOf(st.heading));
    // The airlock of the middle floor lies, turned with the plan, the way the bridge goes outside.
    const lock = plan.airlocks[0];
    const inside = Math.atan2(lock.y - plan.decks[1].cy, lock.x - plan.decks[1].cx);
    const outside = BASE.bridge + (plan.turns * Math.PI) / 2;
    assert.ok(Math.abs(Math.atan2(Math.sin(inside - outside), Math.cos(inside - outside))) < 0.05);
    // A shipyard has its building dock as a port of its own, with its own airlock to the shipyard room.
    assert.equal(portsOf(st).length, st.shipyard ? 5 : 4);
    assert.equal(plan.airlocks.length, st.shipyard ? 2 : 1);
    assert.ok(
      plan.rooms.some((r) => r.use === (st.shipyard ? 'SHIPYARD' : 'LOUNGE')),
      'or a lounge with a view',
    );
  }
});

test('R-1163 R-1208 R-1164: ten places for guns, filled as the defence is bought, and a large gun bought on its own', () => {
  assert.equal(BASE.guns.length, 10);
  const r = BASE.guns.map((g) => Math.hypot(g.x, g.y));
  assert.equal(r.filter((x) => x > BASE.domes[1]).length, 4, 'four on the basement');
  assert.equal(r.filter((x) => x <= BASE.domes[1] && x > BASE.domes[2]).length, 4, 'four on the edge of the middle');
  assert.equal(BASE.guns.filter((g) => g.heavy).length, 2, 'and two heavy ones on the top');
  const s = quiet();
  const st = free(s);
  takeOver(s, st);
  const counts = [0, 1, 2, 3].map((level) => {
    st.defense = { ...st.defense, guns: level };
    return gunSlots(st).length;
  });
  assert.deepEqual(counts, [0, 2, 6, 10], 'none, two, six and all ten');
  st.defense = { ...st.defense, guns: 1, cannon: 1 };
  remountGuns(st);
  assert.ok(
    st.guns.some((g) => g.cannon),
    'the large gun, whatever the level',
  );
  assert.equal(st.guns.length, 3);
});

test('R-1230 R-1231 R-218: guns by danger, a taken base blows its own, and a base taken back gets its own back', () => {
  // Two guns where it is calm, six further out.
  const st0 = free(quiet(2));
  assert.equal(gunSlots(st0).length, 2, 'a calm system: two');
  assert.deepEqual(
    B.OTHERS_DEFENSE.map((lv) => GUNS_AT[lv]),
    [2, 2, 6, 6],
  );
  // Taken by the crew: the mounts stand empty, and the message says why.
  const s = quiet();
  const st = free(s);
  st.defense = { ...st.defense, guns: 2, shield: 1 };
  remountGuns(st);
  assert.equal(st.guns.length, 6);
  takeOver(s, st);
  assert.equal(st.guns.length, 0, 'the guns are blown');
  assert.equal(defenseOf(st).guns, 0);
  assert.equal(defenseOf(st).shield, 1, 'the shield stays');
  assert.ok(s.events.some((e) => e.type === 'stationTaken' && e.blown));
  // The crew buys guns, loses the base, and takes it back: half of what it bought is there again (R-218).
  st.defense = { ...st.defense, guns: 3 };
  remountGuns(st);
  fall(s, st, 'pirate');
  assert.equal(defenseOf(st).guns, 1);
  takeOver(s, st);
  assert.equal(defenseOf(st).guns, 1, 'not blown: what was left of its own');
  assert.equal(st.guns.length, 2);
});

test('R-172 R-1159 R-1160 R-1161: the lamps show how the base sees the crew, and ST8 is painted on a taken base', () => {
  const s = quiet();
  const st = free(s);
  s.standing[st.side] = 0;
  step(s, {}, DT);
  assert.equal(attitudeOf(s, st), ATTITUDE.neutral);
  s.standing[st.side] = -100;
  step(s, {}, DT);
  assert.equal(attitudeOf(s, st), ATTITUDE.hostile);
  assert.equal(paintedName(st), null, 'no name on a base that is not the crew’s');
  takeOver(s, st);
  assert.equal(attitudeOf(s, st), ATTITUDE.own);
  assert.notEqual(ATTITUDE.own, ATTITUDE.friendly, 'a base of the crew’s cannot be taken for a friendly one');
  assert.equal(paintedName(st), 'ST8');
  // One lamp at a time is dim, and it goes round the 48 once every eight seconds.
  assert.equal(dimLamp(0), 0);
  assert.equal(dimLamp(4), 24);
  assert.equal(dimLamp(8), 0);
});

test('R-1151 R-1158: windows all round, mixed anew on each arrival, red and still in lockdown, breathing in an alarm', () => {
  const st = { id: 7, interior: null };
  const lit = (seed) => Array.from({ length: 120 }, (_, i) => !!windowLook(st, 1, i, seed, 0, false)).join('');
  const share =
    lit(1)
      .split('')
      .filter((c) => c === 't').length / 120;
  assert.ok(share > 0.6 && share < 0.95, 'most are lit and some are dark');
  assert.notEqual(lit(1), lit(2), 'and another arrival mixes them anew');
  const calm = windowLook(st, 1, 3, 5, 0, false) || windowLook(st, 1, 4, 5, 0, false);
  assert.notDeepEqual(calm.rgb, [255, 70, 55]);
  const lockdown = [0, 0.5, 1].map((t) => windowLook(st, 1, 3, 5, t, true) || windowLook(st, 1, 4, 5, t, true));
  assert.deepEqual(lockdown[0].rgb, [255, 70, 55]);
  assert.ok(
    lockdown.every((w) => w.alpha === lockdown[0].alpha),
    'still',
  );
  st.interior = { mood: 'alarm' };
  const breath = [0, 0.5, 1].map((t) => windowLook(st, 1, 3, 5, t, true) || windowLook(st, 1, 4, 5, t, true));
  assert.ok(breath[0].alpha !== breath[1].alpha, 'an alarm breathes, once in two seconds');
  assert.ok(
    Math.abs(breath[0].alpha - (windowLook(st, 1, 3, 5, 2, true) || windowLook(st, 1, 4, 5, 2, true)).alpha) < 1e-9,
  );
});

// ---------- the inside ----------
test('R-563 R-1165: three round floors, with the mainframe on the top, and walls that follow the circle', () => {
  const { it } = insideHostile();
  assert.equal(it.decks.length, 3);
  assert.equal(deckOf(it, it.mainframe.x), 2, 'the mainframe is on the top floor');
  assert.equal(deckOf(it, it.entry.x), 1, 'the crew comes in on the middle floor');
  assert.equal(deckOf(it, it.breaker.x), 0, 'the switchgear is in the basement');
  // Out at the round wall nobody gets through, though the tile there is floor.
  for (const d of it.decks) {
    const inside = { x: d.cx + d.r - 8, y: d.cy };
    const beyond = { x: d.cx + Math.SQRT1_2 * (d.r + 4), y: d.cy + Math.SQRT1_2 * (d.r + 4) };
    assert.ok(!solidAt(it, inside.x, inside.y) || blocked(it, inside.x, inside.y, 1), 'the wall is round');
    assert.ok(solidAt(it, beyond.x, beyond.y), 'and solid just outside the circle');
  }
  assert.deepEqual(
    it.decks.map((d) => Math.round(d.r / TILE)),
    RADIUS.map((r) => Math.round(r)),
  );
});

test('R-1166: tall things and shut doors block a look, and cameras sit on real walls', () => {
  const { s, it, av } = insideHostile(4);
  // Every camera has a wall behind it, and floor in front of it.
  for (const c of it.cameras) {
    const back = { x: c.x - Math.sin(c.rest) * 10, y: c.y + Math.cos(c.rest) * 10 };
    const front = { x: c.x + Math.sin(c.rest) * 24, y: c.y - Math.cos(c.rest) * 24 };
    assert.ok(solidAt(it, back.x, back.y), 'a camera has a wall behind it');
    assert.ok(!solidAt(it, front.x, front.y), 'and looks out over the floor');
    assert.ok(!it.doors.some((d) => d.tiles.includes(Math.floor(c.y / TILE) * it.w + Math.floor(c.x / TILE))));
  }
  assert.ok(it.cameras.length > 0);
  // A tall thing stops a look as a wall does.
  const k = it.tiles.indexOf('K');
  const kx = ((k % it.w) + 0.5) * TILE,
    ky = (Math.floor(k / it.w) + 0.5) * TILE;
  assert.equal(los(it, kx - 20, ky, kx + 20, ky) && !solidAt(it, kx, ky), false);
  // A door that nobody is near is shut, and blocks a look.
  it.guards = [];
  av.x = it.entry.x;
  av.y = it.entry.y;
  stepDoors(it);
  const d = it.doors.find((x) => x.kind === 'slide' && it.shut.includes(x.tiles[0]));
  assert.ok(d && solidAt(it, d.x, d.y));
  assert.ok(s);
});

test('R-1188 R-1149: lockdown is dim, and in an alarm every lamp is lit', () => {
  const { s, st, it } = insideHostile();
  assert.equal(it.mood, 'lockdown');
  assert.equal(it.dark, true, 'lockdown is dim');
  assert.equal(lockColour(st), '255,96,74', 'red at an enemy');
  assert.equal(lockColour({ side: 'crew' }), '255,200,90', 'yellow on the crew’s own');
  const door = it.doors.find((d) => d.kind === 'slide');
  assert.equal(doorLamp(it, door, true, 0), doorLamp(it, door, true, 0.5), 'the door lamps are still in lockdown');
  it.guards[0].x = it.avatars[0].x;
  it.guards[0].y = it.avatars[0].y;
  run(s, { away: { 0: {} } }, 2);
  assert.equal(it.mood, 'alarm');
  assert.equal(it.dark, false, 'the place wakes and every lamp is lit');
});

test('R-1150: red means the place counts the crew as an enemy: still in lockdown, moving in an alarm', () => {
  const { it } = insideHostile();
  const door = it.doors.find((d) => d.kind === 'slide');
  const still = doorLamp(it, door, true, 0);
  assert.equal(still, doorLamp(it, door, true, 0.7));
  it.mood = 'alarm';
  assert.notEqual(doorLamp(it, door, true, 0.2), doorLamp(it, door, true, 0.7), 'it blinks in an alarm');
  assert.equal(doorLamp(it, door, true, 0.2), doorLamp(it, door, true, 1.2), 'once a second');
  it.mood = null;
  assert.notEqual(doorLamp(it, door, false, 0), still, 'and is not red where all is calm');
});

test('R-1182: guards and the lights of an alarm follow how much floor a place has', () => {
  const { it } = insideHostile();
  const area = floorArea(it);
  assert.ok(Math.abs(it.beacons.length - area / B.BEACON_AREA) <= 2, 'a turning light for every 300 tiles');
  assert.ok(it.guards.length >= Math.round(area / B.GUARD_AREA), 'a guard for every 500 tiles');
  // The lights are spread out, not in a heap.
  let close = 0;
  for (const a of it.beacons) for (const b of it.beacons) if (a !== b && dist(a.x, a.y, b.x, b.y) < TILE * 4) close++;
  assert.ok(close <= it.beacons.length / 2);
  // A trading base, calm, has one guard for every 1200 tiles.
  const s = quiet(5);
  const st = free(s);
  const calm = createInterior(s, st);
  assert.ok(calm.trade);
  assert.equal(calm.guards.length, Math.round(floorArea(calm) / B.GUARD_AREA_CALM) + st.defense.inner);
});

test('R-1167: the power is put out quietly or loudly, and the base cannot be taken while it has it', () => {
  const quietly = insideHostile();
  cutPower(quietly.s, quietly.st, false);
  assert.equal(quietly.it.mood, 'lockdown', 'quietly changes nothing at first');
  assert.equal(quietly.it.power, false);
  // After a while a guard is sent to look at the switchgear.
  run(quietly.s, { away: { 0: {} } }, B.BREAKER_CHECK + 1);
  assert.ok(quietly.it.pressure.checker !== null || quietly.it.mood === 'alarm', 'a guard goes to see');
  const loudly = insideHostile(2);
  cutPower(loudly.s, loudly.st, true);
  assert.equal(loudly.it.mood, 'alarm', 'loudly sounds the alarm at once');
  // The switchgear is switched off by holding the use key at it, quicker for the Engineer.
  const by = insideHostile(3);
  by.it.guards = [];
  by.av.x = by.it.breaker.x;
  by.av.y = by.it.breaker.y + 12;
  run(by.s, { away: { 0: { use: true } } }, B.BREAKER_TIME + 0.2);
  assert.equal(by.it.power, false);
});

test('R-1168: with the power out it gets worse step by step: guards fall back, drones, a call for help, and help', () => {
  const { s, st, it } = insideHostile();
  it.guards = it.guards.slice(0, 3);
  for (const g of it.guards) g.x = it.mainframe.x;
  s.players[0].hp = 1e6;
  cutPower(s, st, false);
  it.pressure.check = 1e9;
  const stages = [];
  for (let i = 0; i < (B.PRESSURE[2] + B.RELIEF_TIME + 30) / DT && !s.vessels.some((v) => v.boarding); i++) {
    step(s, { away: { 0: {} } }, DT);
    if (it.pressure.stage !== stages[stages.length - 1]) stages.push(it.pressure.stage);
  }
  assert.deepEqual(stages.slice(0, 4), [0, 1, 2, 3], 'one step after another');
  assert.ok(
    it.guards.some((g) => g.launched),
    'drones came from the hangar',
  );
  const relief = s.vessels.find((v) => v.boarding);
  assert.ok(relief, 'the call was not stopped, and a ship comes with help');
  // It docks at a cargo arm, and its guards come in in the basement.
  for (let i = 0; i < 60 / DT && !it.guards.some((g) => g.relief); i++) step(s, { away: { 0: {} } }, DT);
  assert.ok(
    it.guards.some((g) => g.relief && deckOf(it, g.x) === 0),
    'more guards come in at the cargo arm',
  );
});

test('R-1168: the call is stopped in the comms room, and a hangar that is out lets out no drones', () => {
  const { s, st, it, av } = insideHostile(6);
  it.guards = [];
  s.players[0].hp = 1e6;
  it.hangar.out = true;
  cutPower(s, st, false);
  it.pressure.check = 1e9;
  run(s, { away: { 0: {} } }, B.PRESSURE[2] + 1);
  assert.ok(it.call, 'the base calls for help');
  assert.ok(!it.guards.some((g) => g.launched), 'no drones from a hangar that is out');
  av.x = it.comms.x;
  av.y = it.comms.y + 12;
  run(s, { away: { 0: { use: true } } }, B.COMMS_TIME + 0.2);
  assert.equal(it.call, null);
  run(s, { away: { 0: {} } }, B.RELIEF_TIME + 5);
  assert.ok(!s.vessels.some((v) => v.boarding), 'nobody comes');
});

test('R-1155: an airlock never has both doors open, and is worked with its button', () => {
  const { s, it, av } = insideHostile();
  it.guards = [];
  const k = it.airlocks.indexOf(it.entry);
  const door = it.doors.find((d) => d.kind === 'lock' && d.room === it.entry.room);
  const mid = it.rooms[it.entry.room].mid;
  const toward = (from, to, d) => {
    const n = dist(from.x, from.y, to.x, to.y);
    return { x: from.x + ((to.x - from.x) / n) * d, y: from.y + ((to.y - from.y) / n) * d };
  };
  assert.equal(it.locks[k].open, 'outer', 'the crew came in by the hatch');
  assert.ok(
    door.tiles.every((i) => it.tiles[i] === 'D'),
    'and the inner door is shut',
  );
  // At the button by the inner door.
  Object.assign(av, toward(door, mid, 14));
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(it.locks[k].open, null, 'the button shuts the hatch first');
  assert.ok(
    door.tiles.every((i) => it.tiles[i] === 'D'),
    'and the inner door stays shut meanwhile',
  );
  run(s, { away: { 0: {} } }, B.LOCK_CYCLE + 0.2);
  assert.equal(it.locks[k].open, 'inner');
  assert.ok(
    door.tiles.every((i) => it.tiles[i] === ','),
    'then the inner door opens',
  );
  // Out in the concourse, the button by the door turns it back, and then the way to the ship is open.
  Object.assign(av, toward(door, mid, -16));
  assert.ok(!blocked(it, av.x, av.y, 4), 'the boarder stands outside the airlock');
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.ok(
    door.tiles.every((i) => it.tiles[i] === 'D'),
    'the inner door shuts first',
  );
  run(s, { away: { 0: {} } }, B.LOCK_CYCLE + 0.2);
  assert.equal(it.locks[k].open, 'outer');
});

test('R-1205: three ways between floors: the lift is heard, and the ways lead to the same spot on the other floor', () => {
  const { s, it, av } = insideHostile();
  assert.equal(it.links.length, 6, 'a lift, stairs and a ladder between each two floors');
  for (const kind of ['lift', 'stairs', 'ladder']) assert.equal(it.links.filter((l) => l.kind === kind).length, 2);
  // The ladders are behind alarmed doors.
  for (const l of it.links.filter((x) => x.kind === 'ladder'))
    for (const d of l.doors) assert.ok(it.alarmed.some((a) => dist(a.x, a.y, d.x, d.y) < TILE * 1.5));
  const lift = it.links.find((l) => l.kind === 'lift' && l.decks[0] === 1);
  const g = it.guards[0];
  it.guards = [g];
  Object.assign(g, { x: lift.doors[1].x, y: lift.doors[1].y + 30, mode: 'idle', curious: null, path: [], route: [] });
  Object.assign(av, lift.at[0]);
  step(s, { away: { 0: { usePressed: true } } }, DT);
  assert.equal(deckOf(it, av.x), 2, 'up on the top');
  assert.ok(Math.abs(av.y - lift.at[1].y) < 1 && Math.abs(av.x - lift.at[1].x) < 1, 'at the same spot');
  assert.ok(g.curious, 'and a guard near the lift comes to see who it was');
});
