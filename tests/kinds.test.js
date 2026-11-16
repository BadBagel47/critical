// Things and ships are described as data. These tests check that the data is whole,
// and that a new kind works without touching the rest of the game logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { THINGS, SHIPS } from '../src/sim/kinds.js';
import { addThing, thingsOf, solidCircles, dockTargets, portsOf } from '../src/sim/things.js';
import { makeVessel, hurtVessel } from '../src/sim/vessels.js';
import { WEAPONS, weaponsOf } from '../src/sim/weapons.js';
import { CATALOG } from '../src/sim/upgrades.js';
import { dockCandidate, shipNose } from '../src/sim/ship.js';
import { oldShip } from './helpers.js';

const DT = 1 / 60;
const run = (s, cmds, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, cmds, DT);
  return s;
};
// Empty space: no pirates of their own, and the ship at rest in the middle of a system without a star.
const quiet = (s) => {
  s.spawn.timer = 1e9;
  s.raidTimer = 1e9;
  s.sectors[s.sector].star = false;
  Object.assign(s.ship, { x: 0, y: 0, heading: 0, vx: 0, vy: 0, throttle: 0 });
  return oldShip(s);
};

test('things are kept sorted by kind, whatever order they are added in', () => {
  const s = quiet(createState(1));
  addThing(s, { id: s.nextId++, kind: 'buoy', x: 0, y: 0, heading: 0, hp: 20 });
  addThing(s, { id: s.nextId++, kind: 'rock', x: 9000, y: 0, heading: 0, variant: 0, r: 13 });
  addThing(s, { id: s.nextId++, kind: 'salvage', x: 9000, y: 9000, heading: 0, value: 5, ttl: 60 });
  const order = Object.keys(THINGS);
  const ranks = s.things.map((t) => order.indexOf(t.kind));
  assert.deepEqual(
    ranks,
    [...ranks].sort((a, b) => a - b),
  );
  const rocks = thingsOf(s, 'rock');
  assert.equal(rocks.at(-1).x, 9000, 'a new thing comes last within its own kind');
});

test('every ship class has the numbers its brain needs and can be flown and destroyed', () => {
  for (const kind of Object.keys(SHIPS)) {
    const s = quiet(createState(1));
    const c = SHIPS[kind];
    for (const key of [
      'name',
      'brain',
      'hp',
      'radius',
      'speed',
      'turn',
      'dmg',
      'cooldown',
      'bounty',
      'boom',
      'salvage',
    ]) {
      assert.ok(c[key] !== undefined, `${kind} needs ${key}`);
    }
    const v = makeVessel(s, kind, 250, -250);
    s.vessels.push(v);
    run(s, {}, 4);
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.heading), `${kind} flies`);
    const credits = s.purses.captain;
    hurtVessel(s, v, 1e6);
    assert.equal(s.purses.captain, credits + c.bounty, `${kind} pays its bounty`);
    run(s, {}, DT);
    assert.ok(!s.vessels.includes(v), `${kind} is gone`);
  }
});

test('a new ship class is one entry of data', () => {
  SHIPS.raider = {
    ...SHIPS.fighter,
    name: 'RAIDER',
    hp: 60,
    speed: 60,
    bounty: 40,
    salvage: { count: 3, value: [10, 20] },
  };
  try {
    const s = quiet(createState(1));
    const v = makeVessel(s, 'raider', 0, -300);
    s.vessels.push(v);
    run(s, {}, 6);
    assert.ok(s.ship.shield < 100 || s.ship.hull < 200, 'it attacks like the fighter it borrows its brain from');
    hurtVessel(s, v, 1e6);
    assert.equal(s.purses.captain, 40);
    assert.equal(thingsOf(s, 'salvage').length, 3);
  } finally {
    delete SHIPS.raider;
  }
});

test('a new kind of thing is one entry of data: it stops shots, can be docked with and is put on the map', () => {
  THINGS.beacon = {
    hit: [{ x: 0, y: 0, r: 20 }],
    ports: [{ x: 0, y: 30 }],
    onMap: (b) => ({ name: b.name }),
    label: 'BEACON',
    persist: true,
  };
  try {
    const s = quiet(createState(1));
    const beacon = addThing(s, { id: s.nextId++, kind: 'beacon', x: 0, y: -200, heading: 0, name: 'OLD BEACON' });
    assert.ok(
      solidCircles(s).some((c) => c.thing === beacon),
      'shots run into it',
    );
    assert.ok(dockTargets(s).includes(beacon));
    run(s, {}, 0.5);
    const known = s.known.find((k) => k.id === beacon.id);
    assert.equal(known.name, 'OLD BEACON', 'the map remembers it');
    // Put the nose at its port: the ship can dock.
    const port = portsOf(beacon)[0];
    s.ship.x += port.x - shipNose(s.ship).x;
    s.ship.y += port.y - shipNose(s.ship).y;
    assert.equal(dockCandidate(s), beacon);
    // It is still there after a jump away and back.
    s.charts.push(1);
    s.ship.shieldOn = false;
    s.ship.fuel = 1e3;
    step(s, { captain: { jump: 1 } }, DT);
    run(s, {}, 9);
    assert.equal(s.sector, 1);
    assert.equal(thingsOf(s, 'beacon').length, 0);
    step(s, { captain: { jump: 0 } }, DT);
    run(s, {}, 9);
    assert.equal(s.sector, 0);
    assert.equal(thingsOf(s, 'beacon')[0], beacon);
  } finally {
    delete THINGS.beacon;
  }
});

test('every weapon names itself, and shows up when its upgrade is installed', () => {
  const s = createState(1);
  assert.deepEqual(weaponsOf(s.ship), ['pulse']);
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.ok(w.name && typeof w.work === 'function', `${id} is whole`);
    if (!w.mod) continue;
    assert.ok(CATALOG[w.mod], `${id} needs an upgrade that is for sale`);
    s.ship.mods[w.mod] = 1;
    assert.ok(weaponsOf(s.ship).includes(id));
  }
});
