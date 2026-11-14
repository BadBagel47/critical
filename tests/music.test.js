// The music's logic, without sound: the pieces, the theme, the sectors' colours and the inertia between scenes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR, THEMES, THEME_STEPS, colourOf, majorChord, noteAt, toDark, toMajor } from '../src/music/theory.js';
import { PIECES } from '../src/music/pieces.js';
import { HOLD, SETTLE, fades, startSteer, steer, wanted } from '../src/music/director.js';
import { VOICES } from '../src/music/synth.js';

const run = (mem, want, seconds, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) mem = steer(mem, want, dt);
  return mem;
};

test('every theme is four bars long and stays in a singable range', () => {
  for (const theme of THEMES) {
    assert.equal(
      theme.notes.reduce((sum, [, len]) => sum + len, 0),
      THEME_STEPS,
      theme.name,
    );
    assert.equal(theme.chords.length, 4, theme.name);
    for (const [semi] of theme.notes) if (semi !== null) assert.ok(semi >= -12 && semi <= 24, `${theme.name} ${semi}`);
    assert.deepEqual(noteAt(theme, 0), { semi: theme.notes[0][0], len: theme.notes[0][1] });
  }
});

test('every piece gives well-formed notes, and not too many at once', () => {
  for (const [name, piece] of Object.entries(PIECES)) {
    for (const theme of THEMES) {
      for (const sector of [0, 2, 4, 9]) {
        const c = { colour: colourOf(sector), theme };
        let notes = 0;
        for (let step = 0; step < 40 * BAR; step++) {
          const out = piece.notes(step, c);
          assert.ok(out.length <= 12, `${name} step ${step} has ${out.length} notes`);
          for (const n of out) {
            assert.ok(VOICES.includes(n.v), `${name} uses an unknown voice ${n.v}`);
            assert.ok(Number.isFinite(n.m) && n.m >= 20 && n.m <= 110, `${name} note ${n.m}`);
            assert.ok(n.d > 0 && n.g > 0 && n.g <= 1, `${name} length ${n.d} loudness ${n.g}`);
          }
          notes += out.length;
        }
        assert.ok(notes > (name === 'lost' ? 10 : 40), `${name} is nearly silent`);
      }
    }
  }
});

test('the same step always gives the same notes', () => {
  const c = { colour: colourOf(1), theme: THEMES[0] };
  for (const piece of Object.values(PIECES)) {
    for (let step = 0; step < 8 * BAR; step++) assert.deepEqual(piece.notes(step, c), piece.notes(step, c));
  }
});

test('later sectors are darker and a little faster, without a limit on how many there are', () => {
  let before = colourOf(0);
  assert.equal(before.dark, 0);
  for (let s = 1; s < 30; s++) {
    const now = colourOf(s);
    assert.ok(now.dark > before.dark && now.dark < 1);
    assert.ok(now.tempo > before.tempo && now.tempo < 1.13);
    before = now;
  }
  assert.equal(colourOf(0).mode, 'dorian');
  assert.equal(colourOf(4).mode, 'phrygian');
  assert.deepEqual(colourOf(undefined), colourOf(0));
});

test('the theme is heard where it should be, and not in the tense pieces', () => {
  const theme = THEMES[0];
  const c = { colour: colourOf(0), theme };
  const melody = (piece, voice, steps) =>
    Array.from({ length: steps }, (_, s) => PIECES[piece].notes(s, c))
      .flat()
      .filter((n) => n.v === voice);
  assert.ok(melody('title', 'lead', 12 * BAR).length > 20);
  assert.ok(melody('space', 'soft', 32 * BAR).length > 0, 'space echoes the theme');
  assert.ok(melody('station', 'bell', 16 * BAR).length > 0, 'stations play it warm');
  for (const piece of ['combat', 'boarding', 'alarm', 'warning']) {
    for (const voice of ['bell', 'soft']) {
      const notes = melody(piece, voice, 32 * BAR).filter((n) => n.d < 8);
      assert.equal(notes.length, 0, `${piece} plays the theme on ${voice}`);
    }
  }
});

test('the victory plays once in a major key, and the lost ship breaks off the theme', () => {
  assert.equal(PIECES.won.length, 14 * BAR);
  assert.equal(toMajor(3), 4);
  assert.equal(toMajor(8 + 12), 9 + 12);
  assert.equal(toMajor(7), 7);
  assert.deepEqual(majorChord([0, 'min']), [0, 'maj']);
  assert.equal(toDark(2), 1);
  const c = { colour: colourOf(0), theme: THEMES[0] };
  const lost = Array.from({ length: 64 * BAR }, (_, s) => PIECES.lost.notes(s, c).map((n) => ({ ...n, s }))).flat();
  const falls = lost.filter((n) => n.v === 'fall');
  assert.equal(falls.length, 1, 'the last note falls away');
  assert.ok(lost.filter((n) => n.v === 'soft').every((n) => n.s < falls[0].s));
  assert.equal(PIECES.lost.length, undefined, 'the lost ship keeps a drone going');
});

test('the music rises at once but calms down slowly', () => {
  let mem = startSteer('space');
  mem = run(mem, 'combat', SETTLE + 0.05);
  assert.equal(mem.piece, 'combat');
  mem = run(mem, 'warning', HOLD.combat - 1);
  assert.equal(mem.piece, 'combat', 'too early to calm down');
  mem = run(mem, 'warning', 1.5);
  assert.equal(mem.piece, 'warning');
});

test('a scene that flickers is never heard', () => {
  let mem = run(startSteer('space'), 'combat', 1);
  for (let i = 0; i < 40; i++) mem = run(mem, i % 2 ? 'combat' : 'warning', 0.8);
  assert.equal(mem.piece, 'combat');
  mem = run(startSteer('space'), 'space', 1);
  for (let i = 0; i < 40; i++) mem = run(mem, i % 2 ? 'space' : 'warning', 0.2);
  assert.equal(mem.piece, 'space', 'a warning shorter than a moment does not start');
});

test('the title screen and the lost ship change at once', () => {
  assert.equal(run(startSteer('title'), 'space', SETTLE + 0.05).piece, 'space');
  assert.equal(run(startSteer('combat'), 'lost', SETTLE + 0.05).piece, 'lost');
  assert.equal(fades(null, 'title').out, 0);
  assert.ok(fades('space', 'combat').in < fades('combat', 'space').in);
});

test('boarding is split into sneaking and alarm when the game says so', () => {
  assert.equal(wanted({ scene: 'boarding' }), 'boarding');
  assert.equal(wanted({ scene: 'boarding', alarm: true }), 'alarm');
  assert.equal(wanted({ scene: 'space', alarm: true }), 'space');
  assert.equal(wanted({ scene: 'something new' }), 'space');
});

test('a long alarm keeps changing, and the siren is only heard now and then', () => {
  const c = { colour: colourOf(1), theme: THEMES[0] };
  const bars = Array.from({ length: 32 }, (_, bar) =>
    JSON.stringify(Array.from({ length: BAR }, (_, pos) => PIECES.alarm.notes(bar * BAR + pos, c))),
  );
  assert.ok(new Set(bars).size >= 16, `only ${new Set(bars).size} different bars in 32`);
  const sirenBars = bars.filter((b) => b.includes('"siren"')).length;
  assert.ok(sirenBars > 0 && sirenBars <= 4, `the siren is heard in ${sirenBars} bars of 32`);
});

test('combat has no cheerful four on the floor and no major tonic', () => {
  const c = { colour: colourOf(0), theme: THEMES[0] };
  for (let bar = 0; bar < 16; bar++) {
    const kicks = [0, 4, 8, 12].filter((pos) => PIECES.combat.notes(bar * BAR + pos, c).some((n) => n.v === 'kick'));
    assert.ok(kicks.length < 4, `bar ${bar} has a kick on every beat`);
    const pad = PIECES.combat.notes(bar * BAR, c).filter((n) => n.v === 'dark');
    if (pad[0].m === c.colour.root) assert.equal(pad[1].m - pad[0].m, 3, 'the tonic chord is minor');
  }
});

test('the alternative alarm raises the pulse without any alarm sounds, and keeps changing', () => {
  const c = { colour: colourOf(2), theme: THEMES[0] };
  const bars = Array.from({ length: 32 }, (_, bar) =>
    Array.from({ length: BAR }, (_, pos) => PIECES.chase.notes(bar * BAR + pos, c)).flat(),
  );
  assert.ok(bars.flat().every((n) => n.v !== 'siren'));
  assert.ok(new Set(bars.map((b) => JSON.stringify(b))).size >= 20);
  assert.ok(PIECES.chase.bpm > PIECES.boarding.bpm);
  assert.equal(wanted({ scene: 'chase' }), 'chase');
});
