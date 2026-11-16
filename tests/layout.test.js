// The floor plans of wrecks and stations, which are made new for every game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { layOut, planHolds, TILE } from '../src/sim/layout.js';
import { thingsOf, portsOf } from '../src/sim/things.js';
import { blocked } from '../src/sim/boarding.js';
import { SHIP_GEOM } from '../src/sim/balance.js';
import { BASE } from '../src/sim/kinds.js';
import { ringTurning } from '../src/sim/stations.js';
import { toWorld, dist } from '../src/sim/util.js';

const PLACES = [
  { kind: 'wreck', hull: 'gunboat' },
  { kind: 'wreck', hull: 'hull' },
  { kind: 'wreck', hull: 'freighter' },
  { kind: 'station' },
];
const tile = (plan, x, y) => plan.tiles[Math.floor(y / TILE) * plan.w + Math.floor(x / TILE)];

test('in every plan the way from each airlock to the vault is open, and nothing stands in a wall', () => {
  const s = createState(11);
  for (const place of PLACES) {
    for (let i = 0; i < 400; i++) {
      const plan = layOut(s, place);
      const what = `${place.hull || place.kind} number ${i}`;
      assert.ok(planHolds(plan), what + ' can be walked from the airlock to the vault');
      assert.equal(plan.tiles.length, plan.w * plan.h);
      assert.ok(plan.rooms.length >= 3, what + ' has rooms');
      for (const room of plan.rooms) {
        assert.ok('.,'.includes(tile(plan, room.mid.x, room.mid.y)), what + ' has floor in the middle of each room');
      }
      assert.ok(plan.rooms[plan.vault].door, what + ' has a door to its vault');
      for (const a of plan.airlocks)
        assert.equal(tile(plan, a.x - 1, a.y), 'A', what + ' has an airlock where it says');
      assert.ok('.,'.includes(tile(plan, plan.far.x, plan.far.y)), what + ' has floor for the far turret');
      assert.ok(plan.tiles.includes('L'), what + ' has a locked vault door');
    }
  }
});

test('a plan follows the shape of what was boarded', () => {
  const s = createState(3);
  const gunboat = layOut(s, PLACES[0]);
  const freighter = layOut(s, PLACES[2]);
  const station = layOut(s, PLACES[3]);
  assert.ok(freighter.w > gunboat.w * 2, 'a freighter is much longer than a gunboat');
  assert.ok(freighter.w > freighter.h * 2.5, 'and long and narrow');
  assert.equal(station.decks.length, 3, 'a base has three floors');
  assert.ok(
    station.decks.every((d) => d.r * 2 <= station.h * TILE),
    'each of them round, side by side',
  );
  assert.equal(gunboat.airlocks.length, 1);
  assert.equal(station.airlocks.length, 1, 'a base without a shipyard has one airlock');
  assert.ok(freighter.w * TILE > 640 && station.h * TILE > 360, 'the larger places do not fit on one screen');
});

test('the same game makes the same plan, and another game another one', () => {
  const plan = (seed) => layOut(createState(seed), PLACES[3]).tiles.join('');
  assert.equal(plan(5), plan(5));
  assert.notEqual(plan(5), plan(6));
});

test('R-1154 R-1155: at a base the ring turns the ship to the bridge, and the crew comes in by the airlock there', () => {
  const entries = [];
  for (let port = 0; port < 4; port++) {
    const s = createState(1);
    s.spawn.timer = s.raidTimer = s.traffic.timer = 1e9;
    const st = thingsOf(s, 'station').find((x) => x.sanctuary);
    const p = portsOf(st)[port];
    const h = Math.atan2(st.x - p.x, -(st.y - p.y));
    s.ship.heading = h;
    s.ship.x = p.x + Math.sin(h) * SHIP_GEOM.nose.y;
    s.ship.y = p.y - Math.cos(h) * SHIP_GEOM.nose.y;
    s.ship.vx = s.ship.vy = 0;
    step(s, { captain: { dock: true } }, 1 / 60);
    // While the ring turns nobody goes aboard.
    if (ringTurning(st)) {
      step(s, { system: { board: [0] } }, 1 / 60);
      assert.equal(s.players[0].inside, null, 'not while the ring turns');
    }
    for (let i = 0; i < 60 * 9 && ringTurning(st); i++) step(s, {}, 1 / 60);
    for (let i = 0; i < 60; i++) step(s, {}, 1 / 60);
    // The port the ship lies at is now the one at the bridge, up and to the left of the base.
    const r = Math.hypot(BASE.ports[0].x, BASE.ports[0].y);
    const at = toWorld(st, { x: Math.cos(BASE.bridge) * r, y: Math.sin(BASE.bridge) * r });
    const nose = toWorld(s.ship, SHIP_GEOM.nose);
    assert.ok(dist(nose.x, nose.y, at.x, at.y) < 3, 'port ' + port + ' has come round to the bridge');
    step(s, { system: { board: [0] } }, 1 / 60);
    const it = st.interior;
    assert.equal(s.players[0].inside, st.id);
    assert.equal(it.entry, it.airlocks[0], 'every port on the ring leads to the same airlock');
    const av = it.avatars[0];
    assert.ok(!blocked(it, av.x, av.y, 5), 'the boarder stands on the floor just inside');
    entries.push(it.entry.x + ':' + it.entry.y);
  }
  assert.equal(new Set(entries).size, 1);
});

// ---------- the inside of a freighter (F-254) ----------
const FREIGHTER = { kind: 'wreck', hull: 'freighter' };
const at = (plan, x, y) => (x < 0 || y < 0 || x >= plan.w || y >= plan.h ? ' ' : plan.tiles[y * plan.w + x]);
// Every tile that can be walked to from a tile, without stepping on those in `shut`.
function walkFrom(plan, start, shut = new Set()) {
  const seen = new Set([start]);
  const todo = [start];
  while (todo.length) {
    const i = todo.pop();
    const x = i % plan.w,
      y = (i - x) / plan.w;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const j = (y + dy) * plan.w + x + dx;
      if (seen.has(j) || shut.has(j) || !'.,AL'.includes(at(plan, x + dx, y + dy))) continue;
      seen.add(j);
      todo.push(j);
    }
  }
  return seen;
}
const tilesOf = (plan, chars) => plan.tiles.map((c, i) => (chars.includes(c) ? i : -1)).filter((i) => i >= 0);

test('R-1183, R-1186: the inside of a freighter has the shape of the ship and is about 92 by 31 tiles', () => {
  const s = createState(21);
  for (let i = 0; i < 60; i++) {
    const plan = layOut(s, FREIGHTER);
    const xs = tilesOf(plan, '#.,ALX').map((k) => k % plan.w);
    const ys = tilesOf(plan, '#.,ALX').map((k) => Math.floor(k / plan.w));
    const length = Math.max(...xs) - Math.min(...xs) + 1;
    const width = Math.max(...ys) - Math.min(...ys) + 1;
    assert.ok(length >= 88 && length <= 96, 'it is about 92 tiles long, and was ' + length);
    assert.equal(width, 31);
    const uses = plan.rooms.map((r) => r.use);
    const first = (use) => plan.rooms[uses.indexOf(use)];
    assert.ok(uses.includes('ENGINES') && uses.includes('BRIDGE'), 'it has its engines and its bridge');
    assert.ok(first('ENGINES').c1 < 10, 'the engines are astern');
    assert.ok(first('BRIDGE').c0 > 80, 'the bridge is in the bow');
    // The bow narrows: the hull is not as wide at the bridge as amidships.
    const widthAt = (x) => ys.filter((_, k) => xs[k] === x).length;
    assert.ok(widthAt(93) < widthAt(50) - 10);
    // Containers on both sides of the spine: rooms above it and below it, between the stern and the bow.
    const amid = plan.rooms.filter((r) => r.c0 > 14 && r.c1 < 76);
    assert.ok(amid.some((r) => r.r1 < 16) && amid.some((r) => r.r0 > 16));
  }
});

test('R-1184: a freighter has a large hold and three ways along the ship, with no blind corridors', () => {
  const s = createState(22);
  for (let i = 0; i < 40; i++) {
    const plan = layOut(s, FREIGHTER);
    const what = 'freighter number ' + i;
    const hold = plan.rooms.find((r) => r.use === 'HOLD');
    assert.ok(hold && hold.c1 - hold.c0 > 22 && hold.r1 - hold.r0 > 8, what + ' has a hold two containers long');
    // The spine, and a service corridor along the hull, run the length of the containers.
    for (let x = 14; x <= 76; x++) {
      assert.equal(at(plan, x, 16), ',', what + ' has its spine');
      assert.equal(at(plan, x, 29), ',', what + ' has a service corridor along the lower flank');
    }
    // The hold is a way of its own: it can be walked into from more than one side.
    const a = plan.airlocks[0];
    const start = Math.floor(a.y / TILE) * plan.w + Math.floor((a.x - 1) / TILE);
    const all = walkFrom(plan, start);
    for (const k of tilesOf(plan, '.,L')) assert.ok(all.has(k), what + ' can be walked all through');
    // Nothing but a room is a dead end: with a piece of any corridor shut, whatever corridor is cut off from the
    // rest leads to a room.
    const corridor = tilesOf(plan, ',');
    for (let n = 0; n < corridor.length; n += 3) {
      const cx = corridor[n] % plan.w,
        cy = Math.floor(corridor[n] / plan.w);
      const shut = new Set();
      for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) shut.add(y * plan.w + x);
      const from = corridor.find((k) => !shut.has(k) && Math.abs((k % plan.w) - cx) > 12);
      const reach = walkFrom(plan, from, shut);
      for (const k of corridor) {
        if (shut.has(k) || reach.has(k)) continue;
        const stub = walkFrom(plan, k, shut);
        const rooms = [...stub].some((j) => '.L'.includes(plan.tiles[j]));
        assert.ok(rooms, `${what} has a blind corridor at ${cx}, ${cy}`);
        for (const j of stub) reach.add(j);
      }
    }
  }
});

test('R-1185: a freighter wreck has lost one or two of its containers', () => {
  const s = createState(23);
  const counts = new Set();
  for (let i = 0; i < 60; i++) {
    const plan = layOut(s, FREIGHTER);
    // Each container that was torn away leaves a hole of ten by nine tiles, and the wall outside it.
    const holes = tilesOf(plan, 'X').filter((k) => {
      const y = Math.floor(k / plan.w);
      return (y >= 5 && y <= 13) || (y >= 19 && y <= 27);
    }).length;
    assert.ok(holes === 90 || holes === 180, 'one or two containers are gone, and ' + holes + ' tiles were');
    counts.add(holes);
    assert.ok(
      plan.rooms.some((r) => r.use === 'HOLD'),
      'the large hold is never the one that is lost',
    );
  }
  assert.equal(counts.size, 2, 'sometimes one and sometimes two');
});
