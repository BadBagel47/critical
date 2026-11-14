// The buttons for what the player can do right where they are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf, portsOf } from '../src/sim/things.js';
import { SHIP_GEOM } from '../src/sim/balance.js';
import { actionsOf } from '../src/actions.js';
import { padButtonFor } from '../src/input.js';

const DT = 1 / 60;
const quiet = () => {
  const s = createState(1);
  s.spawn.timer = s.raidTimer = s.traffic.timer = 1e9;
  return s;
};
// What the first player is offered on the screen they are on.
const offered = (s, mode) => actionsOf({ state: s, me: s.players[0] }, mode || s.players[0].post || 'crew');
const names = (s, mode) => offered(s, mode).map((a) => a.name);
const yard = (s) => thingsOf(s, 'station').find((st) => st.home);
function atPort(s, thing) {
  const port = portsOf(thing)[0];
  const h = Math.atan2(thing.x - port.x, -(thing.y - port.y));
  s.ship.heading = h;
  s.ship.x = port.x + Math.sin(h) * SHIP_GEOM.nose.y;
  s.ship.y = port.y - Math.cos(h) * SHIP_GEOM.nose.y;
  s.ship.vx = s.ship.vy = 0;
}

test('the Captain is offered to dock only when the ship is in position, and nobody else is', () => {
  const s = quiet();
  assert.deepEqual(names(s), [], 'nothing to do out in the empty');
  atPort(s, yard(s));
  assert.deepEqual(names(s), ['dock']);
  assert.equal(offered(s)[0].code, 'KeyE');
  assert.equal(offered(s)[0].main, true);
  s.players[0].post = 'gunner';
  assert.deepEqual(names(s), [], 'the Gunner cannot dock the ship');
});

test('docked at a station that trades, anyone can go aboard and the Captain can undock', () => {
  const s = quiet();
  atPort(s, yard(s));
  step(s, { captain: { dock: true } }, DT);
  assert.deepEqual(names(s), ['aboard', 'undock']);
  assert.equal(offered(s)[1].main, false, 'going aboard is the main thing, undocking the other');
  s.players[0].post = 'engineer';
  assert.deepEqual(names(s), ['aboard']);
});

test('a locked wreck offers its lock, an open one a boarding, and a charging teleporter says so', () => {
  const s = quiet();
  const wreck = thingsOf(s, 'wreck')[0];
  atPort(s, wreck);
  step(s, { captain: { dock: true } }, DT);
  assert.equal(s.ship.docked, wreck.id);
  assert.deepEqual(names(s), ['lock', 'undock']);
  assert.match(offered(s)[0].label, /BYPASS/);
  wreck.lock = 'open';
  assert.deepEqual(names(s), ['board', 'undock']);
  assert.equal(offered(s)[0].off, false);
  s.players[0].tele = 12;
  assert.equal(offered(s)[0].off, true, 'it shows, but cannot be used');
  assert.match(offered(s)[0].label, /12 S/);
});

test('inside a station the airlock and the desks offer themselves when the player walks up to them', () => {
  const s = quiet();
  const st = yard(s);
  atPort(s, st);
  step(s, { captain: { dock: true } }, DT);
  step(s, { system: { board: [0] } }, DT);
  assert.equal(s.players[0].inside, st.id);
  assert.deepEqual(names(s, 'away'), ['leave'], 'the player comes in at the airlock');
  const it = st.interior;
  const av = it.avatars[0];
  av.x = it.entry.x + 80;
  assert.deepEqual(names(s, 'away'), [], 'nothing in the middle of the floor');
  const desk = it.desks[0];
  av.x = desk.x;
  av.y = desk.y - 8;
  assert.deepEqual(names(s, 'away'), ['trade']);
  assert.equal(offered(s, 'away')[0].label, 'SERVICES');
  assert.deepEqual(names(s, 'shop'), ['back'], 'a panel can always be closed');
  assert.deepEqual(names(s, 'map'), [], 'the map has its own buttons');
});

test('at a vault door the lock can be cut by holding, or blown with a charge', () => {
  const s = quiet();
  const wreck = thingsOf(s, 'wreck')[0];
  atPort(s, wreck);
  step(s, { captain: { dock: true } }, DT);
  wreck.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = wreck.interior;
  const av = it.avatars[0];
  it.guards = [];
  it.turrets = [];
  const door = it.rooms[it.vault].door;
  av.x = door.x;
  av.y = door.y + 8;
  assert.deepEqual(names(s, 'away'), ['cut']);
  assert.equal(offered(s, 'away')[0].hold, true);
  av.charges = 1;
  assert.deepEqual(names(s, 'away'), ['cut', 'blow']);
  for (let i = 0; i < 30; i++) step(s, { away: { 0: { use: true } } }, DT);
  const cut = offered(s, 'away')[0];
  assert.ok(cut.progress > 0 && cut.progress < 1, 'the button shows how far the cutting has come');
});

test('nothing is offered while the game is paused or the ship is lost', () => {
  const s = quiet();
  atPort(s, yard(s));
  s.paused = true;
  assert.deepEqual(names(s), []);
  s.paused = false;
  s.over = true;
  assert.deepEqual(names(s), []);
});

test('a gamepad shows the button that stands in for the key', () => {
  assert.equal(padButtonFor('captain', 'KeyE'), 'A');
  assert.equal(padButtonFor('captain', 'KeyF'), 'B', 'a button that works on every screen');
  assert.equal(padButtonFor('away', 'KeyF'), 'A');
  assert.equal(padButtonFor('away', 'KeyC'), 'X');
  assert.equal(padButtonFor('gunner', 'KeyZ'), null);
});
