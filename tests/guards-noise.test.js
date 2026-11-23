// Guards and noise (F-300, VK1-VK3): a shot does not draw the whole place to one spot. The two nearest that hear
// it come to look, the others stay and are wary, the guard of the vault stays where it is, and those that came look
// round for a while and then go back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { thingsOf } from '../src/sim/things.js';
import { heard, vaultKeeper } from '../src/sim/boarding.js';
import { newGuard } from '../src/sim/guards.js';
import { dist } from '../src/sim/util.js';
import { B } from '../src/sim/balance.js';
import { withWreck, oldShip } from './helpers.js';

const DT = 1 / 60;
// A wreck with five guards standing on its loot spots, and the boarder kept out of sight at the airlock.
function place() {
  const s = createState(1);
  s.spawn.timer = 1e9;
  s.sectors[s.sector].star = false;
  Object.assign(s.ship, { x: 0, y: 0, heading: 0, vx: 0, vy: 0, throttle: 0 });
  oldShip(withWreck(s));
  const w = thingsOf(s, 'wreck')[0];
  s.ship.docked = w.id;
  w.lock = 'open';
  step(s, { system: { board: [0] } }, DT);
  const it = w.interior;
  it.turrets = [];
  it.guards = it.loot.slice(0, 5).map((l) => newGuard(s, { x: l.x, y: l.y }, 0));
  it.keeper = undefined;
  return { s, it };
}

test('R-1275: of the guards that hear a shot, the two nearest come to look and the others are wary', () => {
  const { s, it } = place();
  const keeper = vaultKeeper(it);
  const at = { x: it.guards[0].x + 4, y: it.guards[0].y };
  heard(s, it, at);
  const hearing = it.guards.filter((g) => g !== keeper && dist(g.x, g.y, at.x, at.y) < B.SHOT_HEARD);
  const came = it.guards.filter((g) => g.mode === 'alert');
  assert.equal(came.length, Math.min(B.GUARD_COME, hearing.length));
  // They are the nearest ones.
  const nearest = [...hearing].sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
  assert.deepEqual(
    came.map((g) => g.id).sort(),
    nearest
      .slice(0, B.GUARD_COME)
      .map((g) => g.id)
      .sort(),
  );
  for (const g of hearing.slice(B.GUARD_COME)) if (g.mode !== 'alert') assert.ok(g.wary > 0, 'the others are wary');
});

test('R-1276: the guard that keeps the vault does not leave it for a noise, while there are three guards or more', () => {
  const { s, it } = place();
  const keeper = vaultKeeper(it);
  assert.ok(keeper, 'there is one');
  heard(s, it, { x: keeper.x + 2, y: keeper.y });
  assert.notEqual(keeper.mode, 'alert');
  // With two guards left on their feet there is no keeper: both come.
  it.guards = it.guards.slice(0, 2);
  it.keeper = undefined;
  assert.equal(vaultKeeper(it), null);
});

test('R-1277: guards that came to look and found nobody go back in the end, also while the place is on alarm', () => {
  const { s, it } = place();
  const av = it.avatars[0];
  // A base on its guard, which the shot puts on alarm. The boarder is far off and out of every guard's sight.
  it.mood = 'lockdown';
  heard(s, it, { x: it.guards[0].x, y: it.guards[0].y });
  assert.equal(it.mood, 'alarm');
  const came = it.guards.filter((g) => g.mode === 'alert');
  assert.ok(came.length > 0);
  for (let t = 0; t < B.GUARD_SEARCH + 4; t += DT) {
    av.spotted = 0;
    av.x = it.entry.x;
    av.y = it.entry.y;
    s.players[0].hp = 10000;
    step(s, { away: { 0: {} } }, DT);
    if (came.every((g) => g.mode !== 'alert')) break;
  }
  assert.ok(
    came.every((g) => g.mode !== 'alert' || it.avatars.some((a) => dist(a.x, a.y, g.x, g.y) < B.GUARD_SIGHT)),
    'back to their rounds unless they see someone',
  );
});
