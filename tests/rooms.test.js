// The rooms for online play (F-040): Critical's options pass network-kit's own smoke test in plain Node, and they say
// what the decisions say.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

// The old address on GitHub Pages sends on to the game on Cloudflare (D-269), with the rest of the address.
function movedFrom(href) {
  const u = new URL(href);
  let went = null;
  const where = { hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash, replace: (to) => (went = to) };
  new Function('location', readFileSync(new URL('../src/moved.js', import.meta.url), 'utf8'))(where);
  return went;
}
test('R-1248: the old address on GitHub sends on to the game on Cloudflare, and nothing else moves', () => {
  assert.equal(movedFrom('https://badbagel47.github.io/critical/'), 'https://critical.l8p1.workers.dev/');
  assert.equal(
    movedFrom('https://badbagel47.github.io/critical/#room=ABC123'),
    'https://critical.l8p1.workers.dev/#room=ABC123',
  );
  assert.equal(
    movedFrom('https://badbagel47.github.io/critical/playtest.html?x=1'),
    'https://critical.l8p1.workers.dev/playtest.html?x=1',
  );
  assert.equal(movedFrom('https://critical.l8p1.workers.dev/'), null);
  assert.equal(movedFrom('https://critical-dev.l8p1.workers.dev/#room=ABC123'), null);
  assert.equal(movedFrom('http://localhost:8080/'), null);
  for (const page of ['index.html', 'playtest.html'])
    assert.match(readFileSync(new URL('../' + page, import.meta.url), 'utf8'), /<script src="src\/moved\.js"><\/script>/);
});
