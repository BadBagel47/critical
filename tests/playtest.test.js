// Playtest (D-288): the play-test list shared by every page, and the one other service the game may talk to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ITEMS } from '../src/playtest-items.js';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('R-1240: only Playtest talks to another service, network-kit admin page, and only by its light entry', () => {
  const start = read('src/playtest-start.js');
  assert.match(start, /'https:\/\/network-kit-admin\.l8p1\.workers\.dev'/);
  // The light entry loads nothing more without a tester link; the whole client would load on every page.
  assert.match(start, /vendor\/network-kit\/client\/playtest-entry\.js/);
  assert.doesNotMatch(start, /client\/index\.js/);
  // No other file of the game names an address on another site.
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true })) {
    if (!String(file).endsWith('.js') || file === 'playtest-start.js') continue;
    const text = read('src/' + file);
    assert.doesNotMatch(text, /https?:\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}\//i, `src/${file} names another site`);
  }
  // Every page where tests are run starts Playtest.
  const pages = ['index.html', 'playtest.html', 'docs/design/index.html'].concat(
    readdirSync(new URL('../docs/design/prototypes/', import.meta.url))
      .filter((f) => f.endsWith('.html'))
      .map((f) => 'docs/design/prototypes/' + f),
  );
  for (const page of pages) assert.match(read(page), /src\/playtest-start\.js/, `${page} does not start Playtest`);
});

test('D-288: each test on the list has what Playtest needs, with links that work from every page', () => {
  const root = new URL('../', import.meta.url).pathname;
  const ids = new Set();
  for (const it of ITEMS) {
    assert.ok(it.id && it.title && it.where, JSON.stringify(it));
    assert.ok(!ids.has(it.id), `${it.id} twice`);
    ids.add(it.id);
    assert.ok(Array.isArray(it.steps) && it.steps.length, `${it.id} has no steps`);
    assert.ok([].concat(it.ask).every((q) => typeof q === 'string' && q.length), `${it.id} has no question`);
    for (const [text, address] of it.links) {
      assert.ok(text, `${it.id} has a link without text`);
      assert.ok(address.startsWith(root), `${it.id}: ${address} does not start at the site's root`);
    }
  }
});
