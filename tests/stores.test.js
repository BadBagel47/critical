// Parts, the stores and the shipyard (F-240, F-242), and the shield switched by hand (F-239).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { gatherForTesting } from '../src/sim/sectors.js';
import { damageShip } from '../src/sim/damage.js';
import {
  CATALOG,
  level,
  owned,
  stored,
  offered,
  levelsOf,
  kindOf,
  catOf,
  slotsOpen,
  priceOf,
  levelPrice,
  shieldMax,
} from '../src/sim/upgrades.js';
import { fillPurses } from '../src/sim/purses.js';
import { B } from '../src/sim/balance.js';

const DT = 1 / 20;
// The crew docked at its own yard in a test layout, with a plain ship.
function atYard() {
  const s = createState(1);
  gatherForTesting(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = 1e9;
  s.ship.docked = thingsOf(s, 'station').find((st) => st.home).id;
  fillPurses(s, 5000);
  return s;
}
const order = (s, action, item) => step(s, { shop: [{ action, item }] }, DT);

test('R-1178 R-1137: every role starts with one hull slot and one system slot of its own', () => {
  const s = createState(1);
  for (const role of ['captain', 'gunner', 'engineer']) {
    assert.equal(slotsOpen(s.ship, role, 'hull'), 1);
    assert.equal(slotsOpen(s.ship, role, 'system'), 1);
  }
});

test('R-1141: every level of a part is installed at a shipyard, one at a time', () => {
  const s = atYard();
  order(s, 'buy', 'tank');
  order(s, 'buy', 'tank');
  assert.equal(owned(s.ship, 'tank'), 2);
  assert.equal(level(s.ship, 'tank'), 0);
  order(s, 'install', 'tank');
  assert.equal(level(s.ship, 'tank'), 1);
  assert.equal(stored(s.ship, 'tank'), 1, 'the next level waits in the stores');
  order(s, 'install', 'tank');
  assert.equal(level(s.ship, 'tank'), 2);
  order(s, 'remove', 'tank');
  assert.equal(level(s.ship, 'tank'), 0, 'taken out, all of it goes back to the stores');
  assert.equal(stored(s.ship, 'tank'), 2);
  assert.ok(s.ship.fuel <= B.FUEL_MAX, 'and the tank holds what it held before');
});

test('R-1131 R-1139: a part is sold from the stores for half, three quarters at a base of the crew’s own, a slot never', () => {
  const s = atYard();
  order(s, 'buy', 'armor');
  order(s, 'install', 'armor');
  const before = s.purses.engineer;
  order(s, 'sell', 'armor');
  assert.equal(owned(s.ship, 'armor'), 1, 'not while it is installed');
  order(s, 'remove', 'armor');
  order(s, 'sell', 'armor');
  assert.equal(owned(s.ship, 'armor'), 0);
  assert.equal(
    s.purses.engineer - before,
    Math.floor(CATALOG.armor.price * B.SELL_OWN),
    'three quarters at the own yard',
  );
  const t = atYard();
  t.ship.docked = thingsOf(t, 'station').find((st) => st.align === 'neutral').id;
  order(t, 'buy', 'emit');
  const was = t.purses.engineer;
  order(t, 'sell', 'emit');
  assert.equal(t.purses.engineer - was, Math.floor(CATALOG.emit.price * B.SELL_BACK), 'half elsewhere');
  order(t, 'buy', 'slotH_gunner');
  order(t, 'sell', 'slotH_gunner');
  assert.equal(slotsOpen(t.ship, 'gunner', 'hull'), 2, 'R-1174: a slot stays');
});

test('R-1142 R-1133: what a boarder carries works at once, and the breaching charge is the Gunner’s', () => {
  const s = atYard();
  order(s, 'buy', 'suit');
  assert.equal(level(s.ship, 'suit'), 1, 'no shipyard needed');
  assert.equal(kindOf('suit'), 'gear');
  assert.equal(CATALOG.charge.role, 'gunner');
});

test('R-1175 R-1176: what the crew has the most of is not offered, and every thing is an upgrade, boarding gear or a slot', () => {
  const s = atYard();
  for (let k = 0; k < levelsOf('tank'); k++) order(s, 'buy', 'tank');
  assert.equal(owned(s.ship, 'tank'), 5);
  assert.equal(offered(s.ship, 'tank'), false);
  for (const id of Object.keys(CATALOG)) assert.ok(['upgrade', 'boarding', 'slot'].includes(catOf(id)), id);
  assert.equal(priceOf(s.ship, 'tank'), levelPrice('tank', 5));
});

test('R-733 R-873 R-1134: the ship starts with a fixed gun ahead, and the nose turret turns it', () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.ship.heading = 0.5;
  step(s, { gunner: { aim: { x: s.ship.x - 500, y: s.ship.y }, fire: false } }, DT);
  assert.equal(s.ship.turretAngle, s.ship.heading, 'fixed, straight ahead');
  s.ship.mods.nose = 1;
  for (let i = 0; i < 40; i++) step(s, { gunner: { aim: { x: s.ship.x - 500, y: s.ship.y }, fire: false } }, DT);
  assert.notEqual(s.ship.turretAngle, s.ship.heading, 'the turret turns to the aim');
  assert.ok(CATALOG.nose && CATALOG.nose.role === 'gunner');
});

test('R-872 R-1146: the scanner pulse is a part that has to be installed', () => {
  const s = createState(1);
  step(s, { engineer: { tool: { type: 'pulse' } } }, DT);
  assert.equal(s.ship.pulse, null, 'without it, no pulse');
  s.ship.mods.scanner = 1;
  step(s, { engineer: { tool: { type: 'pulse' } } }, DT);
  assert.ok(s.ship.pulse, 'with it, the pulse goes off');
});

test('R-1129: the Gunner switches the shield on and off, it starts off, takes nothing when off and draws fuel when on', () => {
  const s = createState(1);
  s.spawn.timer = 1e9;
  assert.equal(s.ship.shieldOn, false, 'off when the game starts');
  const hull = s.ship.hull;
  damageShip(s, 10);
  assert.equal(s.ship.hull, hull - 10, 'a shield that is off takes nothing');
  step(s, { gunner: { shield: true } }, DT);
  assert.equal(s.ship.shieldOn, true);
  s.ship.shield = shieldMax(s.ship);
  const before = s.ship.hull;
  damageShip(s, 10);
  assert.equal(s.ship.hull, before, 'on, it takes the hit');
  s.ship.fuel = 10;
  for (let i = 0; i < 20 * 10; i++) step(s, {}, DT);
  assert.ok(Math.abs(10 - s.ship.fuel - B.SHIELD_FUEL * 10) < 0.01, 'and draws a little fuel');
  s.ship.fuel = 0.001;
  step(s, {}, DT);
  assert.equal(s.ship.shieldOn, false, 'without fuel it goes off');
  step(s, { captain: { shield: true } }, DT);
  assert.equal(s.ship.shieldOn, false, 'only the Gunner switches it');
});
