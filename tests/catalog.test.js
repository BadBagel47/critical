// The content catalogue (docs/catalog.md, D-223) is made from the code by tools/catalog.mjs. This test says when it no
// longer matches the code, so that the overview is never out of date.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../tools/catalog.mjs';

test('the content catalogue matches the code (run npm run catalog after a change)', () => {
  const kept = readFileSync(new URL('../docs/catalog.md', import.meta.url), 'utf8');
  assert.equal(kept, buildCatalog());
});
