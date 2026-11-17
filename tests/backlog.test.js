// The tool for the backlog (F-228, tools/backlog.mjs). It does what the agent rules ask for when work is started,
// finished or set aside, and gives the run groups their letters. These tests use a small backlog of their own,
// and check that the real one is in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rows, groups, start, finish, park, reletter, nextId, check, letterOf } from '../tools/backlog.mjs';

const SMALL = `# BACKLOG

## Proposed runs

**A** – strong model, high level – First
- F-002 – Do the first thing
- B-003 – Mend the second

**B** – strong model, medium level – Second
- F-004 – Do the fourth thing

Something written under the groups.

## Hög

| ID | Vad | Status |
|---|---|---|
| F-002 | The first thing | Ej påbörjad |
| B-003 | The second | Pågår 2026-11-01 |

## Medel

| ID | Vad | Status |
|---|---|---|
| F-004 | The fourth thing | Väntar på användaren |

## Låg

| ID | Vad | Status |
|---|---|---|

## Parkerat

| ID | Vad | Status |
|---|---|---|

## Klart

| ID | Vad | Klart |
|---|---|---|
| D-001 | The plan | 2026-10-01 |
`;

test('it reads the rows and the run groups', () => {
  assert.deepEqual(
    rows(SMALL).map((r) => [r.id, r.section, r.status]),
    [
      ['F-002', 'Hög', 'Ej påbörjad'],
      ['B-003', 'Hög', 'Pågår 2026-11-01'],
      ['F-004', 'Medel', 'Väntar på användaren'],
      ['D-001', 'Klart', '2026-10-01'],
    ],
  );
  assert.deepEqual(
    groups(SMALL).map((g) => [g.letter, g.ids.map((x) => x.id)]),
    [
      ['A', ['F-002', 'B-003']],
      ['B', ['F-004']],
    ],
  );
  assert.deepEqual(check(SMALL), []);
});

test('starting marks the date, and leaves what another has started alone', () => {
  const next = start(SMALL, ['F-002'], '2026-11-17');
  assert.ok(next.includes('| F-002 | The first thing | Pågår 2026-11-17 |'));
  assert.throws(() => start(SMALL, ['B-003'], '2026-11-17'), /already marked/);
  assert.throws(() => start(SMALL, ['D-001'], '2026-11-17'), /not among the work to do/);
  assert.throws(() => start(SMALL, ['F-099'], '2026-11-17'), /not in the backlog/);
});

test('finishing moves the row to done with the date, and takes it out of the runs, and an empty group with it', () => {
  const next = finish(SMALL, ['F-004'], '2026-11-17', 'Did the fourth thing');
  assert.ok(next.endsWith('| D-001 | The plan | 2026-10-01 |\n| F-004 | Did the fourth thing | 2026-11-17 |\n'));
  assert.ok(!next.includes('| F-004 | The fourth thing |'));
  assert.deepEqual(
    groups(next).map((g) => g.letter),
    ['A'],
  );
  assert.ok(next.includes('**A** – strong model, high level – First\n- F-002 – Do the first thing\n- B-003'));
  assert.ok(next.includes('Something written under the groups.'), 'what is written under the groups stays');
  assert.deepEqual(check(next), []);
  // Done with the first of two: the group keeps the other, and the next group gets the letter after.
  const one = finish(SMALL, ['F-002'], '2026-11-17');
  assert.deepEqual(
    groups(one).map((g) => [g.letter, g.ids.map((x) => x.id)]),
    [
      ['A', ['B-003']],
      ['B', ['F-004']],
    ],
  );
  assert.ok(one.includes('| F-002 | The first thing | 2026-11-17 |'), 'without a text the row keeps its own');
});

test('the first group done gives the rest new letters from A', () => {
  const next = finish(SMALL, ['F-002', 'B-003'], '2026-11-17');
  assert.deepEqual(
    groups(next).map((g) => [g.letter, g.ids.map((x) => x.id)]),
    [['A', ['F-004']]],
  );
  assert.deepEqual(check(next), []);
});

test('parking sets a row aside and takes it out of the runs', () => {
  const next = park(SMALL, ['F-004']);
  assert.ok(
    next.includes('## Parkerat\n\n| ID | Vad | Status |\n|---|---|---|\n| F-004 | The fourth thing | Parkerad |'),
  );
  assert.deepEqual(
    groups(next).map((g) => g.letter),
    ['A'],
  );
});

test('letters go A to Z and then AA, AB, and a group out of turn is found and put right', () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(letterOf), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
  const wrong = SMALL.replace('**B** – strong', '**D** – strong');
  assert.deepEqual(check(wrong), ['the group D should be B']);
  assert.deepEqual(check(reletter(wrong)), []);
});

test('the next ID follows the highest of the shared series, whatever its kind', () => {
  assert.equal(nextId(SMALL, 'B'), 'B-005');
  assert.equal(nextId(SMALL, 'D'), 'D-005');
});

test('agent rules v1.12: the mark says who started, and an older mark without it is still in order', () => {
  const next = start(SMALL, ['F-002'], '2026-11-17', 'claude/some-branch');
  assert.ok(next.includes('| F-002 | The first thing | Pågår 2026-11-17 (claude/some-branch) |'));
  assert.deepEqual(check(next), []);
});

test('the checks find what is out of order', () => {
  const twice = SMALL.replace('| F-004 | The fourth thing | Väntar på användaren |', '| F-002 | Again | Ej påbörjad |');
  assert.ok(check(twice).some((p) => p.includes('F-002 is in the backlog twice')));
  const gone = SMALL.replace('- F-004 – Do the fourth thing', '- F-009 – Something else');
  assert.ok(check(gone).includes('F-009 in group B is not in the backlog'));
  const undated = SMALL.replace('Pågår 2026-11-01', 'Pågår');
  assert.ok(check(undated).includes('B-003 is in progress without a date'));
});

test('the real backlog is in order (run node tools/backlog.mjs check)', () => {
  const text = readFileSync(new URL('../BACKLOG.md', import.meta.url), 'utf8');
  assert.deepEqual(check(text), []);
});

test('F-273: a group with questions loses them with its last ID, and keeps them while it has IDs', () => {
  const asked = SMALL.replace(
    '- B-003 – Mend the second\n',
    '- B-003 – Mend the second\n- Fråga XY1: Red or blue? Rekommendation: red.\n',
  );
  assert.deepEqual(
    groups(asked).map((g) => [g.letter, g.questions.map((q) => q.text)]),
    [
      ['A', ['Fråga XY1: Red or blue? Rekommendation: red.']],
      ['B', []],
    ],
  );
  const one = finish(asked, ['F-002'], '2026-11-17');
  assert.ok(one.includes('- B-003 – Mend the second\n- Fråga XY1: Red or blue?'), 'the question stays with its group');
  const both = finish(asked, ['F-002', 'B-003'], '2026-11-17');
  assert.ok(!both.includes('Fråga XY1'), 'and goes with it');
  assert.ok(both.includes('## Proposed runs\n\n**A** – strong model, medium level – Second\n- F-004'));
  assert.deepEqual(check(both), []);
});
