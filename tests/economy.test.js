// The economy sheet (docs/economy.md, D-221) is made from the code by tools/economy.mjs. These tests say when it
// no longer matches the code, and when a change moves the income of the simulated player out of its band, so
// that nobody makes the game much easier or harder without seeing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSheet, firstHourIncome } from '../tools/economy.mjs';

// What the simulated player earns alone in the first hour (a quarter in the sanctuary, the rest next door), as
// last decided. When the balance is changed on purpose, run node tools/economy.mjs and set the new figure here.
const SOLO_FIRST_HOUR = 4131;
const BAND = [0.6, 1.6];

test('the economy sheet matches the code (run node tools/economy.mjs after a change)', () => {
  const sheet = readFileSync(new URL('../docs/economy.md', import.meta.url), 'utf8');
  assert.equal(sheet, buildSheet());
});

test('the income of a player alone in the first hour stays in its band', () => {
  const credits = firstHourIncome();
  const k = credits / SOLO_FIRST_HOUR;
  assert.ok(
    k >= BAND[0] && k <= BAND[1],
    `an hour now brings ${Math.round(credits)} credits, ${Math.round(k * 100)}% of the ${SOLO_FIRST_HOUR} decided`,
  );
});
