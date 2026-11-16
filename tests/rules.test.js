// The rule book (docs/rules.md, D-220): every game rule with a number, a status, where it comes from, and the
// test that checks it once it is built. These tests keep the book in order: every number once, every replaced
// rule pointing at the one that replaced it, and every built rule either checked by a test that carries its
// number or marked as still lacking one. The rules that still lack a test are counted, so that the count can
// only go down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const book = readFileSync(new URL('../docs/rules.md', import.meta.url), 'utf8');
const STATUSES = ['byggd', 'bestämd', 'förslag', 'ersatt'];

// Every row of a rule table: | R-001 | the rule | status | source | test |
const rules = book
  .split('\n')
  .filter((l) => /^\| R-\d{3,} \|/.test(l))
  .map((l) => {
    const [id, text, status, source, check] = l
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    return { id, text, status, source, check };
  });

// All the test names in the test files, to find the rule numbers in them.
const testText = readdirSync(new URL('.', import.meta.url))
  .filter((f) => f.endsWith('.test.js') && f !== 'rules.test.js')
  .map((f) => readFileSync(new URL(f, import.meta.url), 'utf8'))
  .join('\n');
const tested = new Set(testText.match(/R-\d{3,}/g) || []);

// How many built rules may still lack a test. Lower it as tests are written; never raise it.
const LACKING = 672;

test('the rule book has rules, each number once, each with a known status and a source', () => {
  assert.ok(rules.length > 20, 'the book has rules in it');
  const seen = new Set();
  for (const r of rules) {
    assert.ok(!seen.has(r.id), `${r.id} is used twice`);
    seen.add(r.id);
    assert.ok(
      STATUSES.some((s) => r.status.startsWith(s)),
      `${r.id} has the status "${r.status}"`,
    );
    assert.ok(r.source.length > 0, `${r.id} says where it comes from`);
    assert.ok(r.text.length > 0, `${r.id} says something`);
  }
});

test('a replaced rule says what replaced it, and a rule it names is in the book', () => {
  const ids = new Set(rules.map((r) => r.id));
  for (const r of rules.filter((x) => x.status.startsWith('ersatt'))) {
    assert.ok(/^ersatt av: \S/.test(r.status), `${r.id} is replaced, but does not say by what`);
    for (const by of r.status.match(/R-\d{3,}/g) || []) {
      assert.ok(ids.has(by), `${r.id} is replaced by ${by}, which is not in the book`);
    }
  }
});

test('every built rule has a test that carries its number, or is marked as lacking one', () => {
  let lacking = 0;
  for (const r of rules.filter((x) => x.status === 'byggd')) {
    if (r.check === 'saknas') {
      lacking++;
      continue;
    }
    assert.ok(tested.has(r.id), `${r.id} is built and says it is tested, but no test carries its number`);
  }
  assert.ok(lacking <= LACKING, `${lacking} built rules lack a test, more than the ${LACKING} allowed`);
});

test('a test that names a rule names one that is in the book', () => {
  const ids = new Set(rules.map((r) => r.id));
  for (const id of tested) assert.ok(ids.has(id), `a test names ${id}, which is not in the book`);
});
