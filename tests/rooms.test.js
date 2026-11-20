// The rooms for online play (F-040): Critical's options pass network-kit's own smoke test in plain Node, and they say
// what the decisions say.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import options from '../rooms-options.js';

test('the room options pass network-kit smoke test', () => {
  const run = spawnSync(process.execPath, ['vendor/network-kit/smoke.mjs', '--options', 'rooms-options.js'], {
    cwd: new URL('../', import.meta.url).pathname,
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('R-1248 R-1250: three posts, a new player takes one at once, the code is enough, the game pauses itself', () => {
  assert.deepEqual(options.places, ['captain', 'gunner', 'engineer']);
  assert.equal(options.mode, 'host');
  assert.equal(options.takeover, true);
  assert.equal(options.lateJoin, 'now');
  assert.equal(options.access, 'open');
  assert.equal(options.pauseBy, 'nobody');
});
