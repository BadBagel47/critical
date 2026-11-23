// What the screen tells, and where (D-187, D-256, MD1–MD5): danger at the top that nothing pushes away, the state of
// things for the post it concerns, and what the sensors know in the strip at the right.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { makeVessel } from '../src/sim/vessels.js';
import { thingsOf } from '../src/sim/things.js';
import { statusLines, sensorLines } from '../src/render/hud.js';
import { RISK_NAMES } from '../src/sim/siege.js';
import { oldShip } from './helpers.js';

function game() {
  const s = createState(1);
  oldShip(s);
  s.spawn.timer = s.raidTimer = s.traffic.timer = s.siegeTimer = 1e9;
  s.vessels = [];
  return s;
}
const texts = (lines) => lines.map((l) => l.text);

test('R-1263: danger comes first at the top, and being docked cannot push it away', () => {
  const s = game();
  const st = thingsOf(s, 'station')[0];
  s.ship.docked = st.id;
  s.siege = { station: st.id, level: RISK_NAMES.length - 1 };
  const lines = texts(statusLines(s, s.players[0], { docked: true }));
  assert.match(lines[0], /UNDER ATTACK.*RISK HIGH/);
  assert.ok(
    lines.some((t) => /DOCKED AT/.test(t)),
    'the docked line comes after',
  );
});

test('R-1264: getting into position to dock is told to the Captain only', () => {
  const s = game();
  const me = s.players[0];
  assert.deepEqual(texts(statusLines(s, me, { ready: true })), ['IN POSITION TO DOCK']);
  me.post = 'gunner';
  assert.deepEqual(texts(statusLines(s, me, { ready: true })), []);
});

test('R-1265: the sensor strip tells of enemies in sight, and of an attack on a station that is not yet at its worst', () => {
  const s = game();
  assert.deepEqual(sensorLines(s), []);
  s.vessels.push(makeVessel(s, 'fighter', s.ship.x + 100, s.ship.y));
  s.vessels.push(makeVessel(s, 'fighter', s.ship.x + 9000, s.ship.y));
  assert.deepEqual(texts(sensorLines(s)), ['1 HOSTILE IN SIGHT'], 'only the one that can be seen');
  s.siege = { station: thingsOf(s, 'station')[0].id, level: 0 };
  assert.ok(texts(sensorLines(s)).some((t) => /UNDER ATTACK.*RISK LOW/.test(t)));
  assert.ok(!texts(statusLines(s, s.players[0], null)).some((t) => /UNDER ATTACK/.test(t)), 'not at the top');
});

test('R-1274: the tabs name who holds each post, FREE, AUTO, and both names on a post taken for a while', async () => {
  const { tabText } = await import('../src/render/hud.js');
  const { addPlayer } = await import('../src/sim/players.js');
  const alone = game();
  const me = alone.players[0];
  assert.equal(tabText(alone, 'captain', me).who, '', 'alone, the own tab needs no name');
  assert.equal(tabText(alone, 'gunner', me).who, '', 'nor the others');
  const s = game();
  addPlayer(s, 'BOOMER');
  s.players[0].name = 'HECTOR';
  const [hector, boomer] = s.players;
  assert.equal(tabText(s, 'captain', hector).who, 'HECTOR');
  assert.equal(tabText(s, 'gunner', hector).who, 'BOOMER');
  assert.equal(tabText(s, 'engineer', hector).who, 'FREE');
  // Boomer goes aboard, and Hector takes the Gunner's post for a while.
  boomer.post = null;
  boomer.inside = 1;
  hector.post = 'gunner';
  assert.equal(tabText(s, 'gunner', hector).who, 'HECTOR FOR BOOMER');
});
