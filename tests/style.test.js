// Guards that keep the code easy to read and the game logic free of anything to do with the screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const filesIn = (dir) =>
  readdirSync(new URL(dir, root))
    .filter((f) => /\.m?js$/.test(f))
    .map((f) => dir + f);
const all = ['src/', 'src/sim/', 'src/render/', 'tests/'].flatMap(filesIn);
const read = (file) => readFileSync(new URL(file, root), 'utf8').split('\n');

test('no line is longer than 140 characters', () => {
  for (const file of all) {
    read(file).forEach((line, n) =>
      assert.ok(line.length <= 140, `${file}:${n + 1} is ${line.length} characters long`),
    );
  }
});

test('the game logic only depends on itself, and on the quest engine core (D-277)', () => {
  for (const file of filesIn('src/sim/')) {
    for (const line of read(file)) {
      const from = /^import .* from '(.*)';$/.exec(line);
      if (from) assert.ok(/^(\.\/|\.\.\/quest\/)[\w-]+\.js$/.test(from[1]), `${file} imports ${from[1]}`);
    }
  }
});

test('the quest engine core depends on nothing, so that it can move to a library of its own (D-277)', () => {
  for (const file of filesIn('src/quest/'))
    for (const line of read(file)) assert.ok(!/^import /.test(line), `${file} imports: ${line}`);
});
