// The floor plans of wrecks and stations, which are made new for every game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { layOut, planHolds, TILE } from '../src/sim/layout.js';
import { thingsOf, portsOf } from '../src/sim/things.js';
import { blocked } from '../src/sim/boarding.js';
import { SHIP_GEOM } from '../src/sim/balance.js';

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
  assert.ok(freighter.w > freighter.h * 3, 'and long and narrow');
  assert.equal(station.w, station.h, 'a station is as wide as it is high');
  assert.equal(gunboat.airlocks.length, 1);
  assert.equal(station.airlocks.length, 4, 'a station has an airlock in each docking arm');
  assert.ok(freighter.w * TILE > 640 && station.h * TILE > 360, 'the larger places do not fit on one screen');
});

test('the same game makes the same plan, and another game another one', () => {
  const plan = (seed) => layOut(createState(seed), PLACES[3]).tiles.join('');
  assert.equal(plan(5), plan(5));
  assert.notEqual(plan(5), plan(6));
});

test('at a station the crew comes in through the arm the frigate is docked at', () => {
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
    step(s, { system: { board: [0] } }, 1 / 60);
    const it = st.interior;
    assert.equal(s.players[0].inside, st.id);
    assert.equal(it.entry, it.airlocks[port], 'port ' + port + ' leads to its own airlock');
    const av = it.avatars[0];
    assert.ok(!blocked(it, av.x, av.y, 5), 'the boarder stands on the floor just inside');
    entries.push(it.entry.x + ':' + it.entry.y);
  }
  assert.equal(new Set(entries).size, 4);
});
