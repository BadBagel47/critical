// The pieces, one for each kind of moment, written as plain functions without sound.
// A piece is asked for one step (a sixteenth note) at a time and answers with the notes that start on it:
//   { v: voice, m: midi note, d: length in steps, g: loudness 0 to 1, e: true to send it to the echo }
// The voices are in synth.js. `c` holds the sector's colour (theory.js) and the chosen title theme.
import { BAR, chordOn, degree, majorChord, noteAt, rand, toDark, toMajor, triad } from './theory.js';

const at = (step) => ({ bar: Math.floor(step / BAR), pos: step % BAR });
const chord = (v, notes, base, d, g, extra = {}) => notes.map((n) => ({ v, m: base + n, d, g, ...extra }));

// The theme's melody on a step, played `slow` times slower. Bars outside the theme give nothing.
function themeNote(theme, step, slow = 1) {
  if (step < 0 || step % slow) return null;
  const n = noteAt(theme, step / slow);
  return n && { semi: n.semi, len: n.len * slow };
}

function drums(pos, bar, { fill = false, busy = false, g = 1 } = {}) {
  const out = [];
  if (pos % 4 === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.9 * g });
  if (pos === 4 || pos === 12) out.push({ v: 'snare', m: 38, d: 1, g: 0.7 * g });
  if (pos % 2 === 0 && pos % 4) out.push({ v: 'hat', m: 42, d: 1, g: 0.5 * g });
  if (busy && pos % 2) out.push({ v: 'hat', m: 42, d: 1, g: 0.25 * g });
  if (fill && pos >= 8 && pos !== 12) out.push({ v: 'snare', m: 38, d: 1, g: (0.3 + pos / 32) * g });
  return out;
}

// Tense drums: a broken kick instead of four on the floor, which sounds too cheerful in a fight.
// Now and then a quiet ghost note on the snare, different from bar to bar.
function tense(pos, step, { kicks = [0, 3, 8, 10], hats = 2, fill = false, g = 1 } = {}) {
  const out = [];
  if (kicks.includes(pos)) out.push({ v: 'kick', m: 36, d: 1, g: (pos === 0 ? 0.95 : 0.75) * g });
  if (pos === 4 || pos === 12) out.push({ v: 'snare', m: 38, d: 1, g: 0.7 * g });
  if (hats && pos % hats === 0) out.push({ v: 'hat', m: 42, d: 1, g: (pos % 4 === 2 ? 0.45 : 0.25) * g });
  if (pos % 2 && pos > 4 && rand(step, 7) < 0.12) out.push({ v: 'snare', m: 38, d: 1, g: 0.2 * g });
  if (fill && pos >= 10 && pos !== 12) out.push({ v: 'snare', m: 38, d: 1, g: (0.3 + pos / 32) * g });
  return out;
}

// Title: the theme, so that the game has a tune of its own. Twelve bars that loop:
// two of build-up, the theme, the theme again an octave up with drums, and two to breathe.
const title = {
  name: 'title',
  bpm: 100,
  fixedColour: true,
  notes(step, { colour, theme }) {
    const { bar: abs, pos } = at(step);
    const bar = abs % 12;
    const root = colour.root;
    const ch = triad(theme.chords[bar % 4]);
    const out = [];
    if (pos === 0) out.push(...chord('pad', ch, root + 12, BAR, 0.55));
    const quiet = bar < 2 || bar > 9;
    if (pos % 2 === 0 && (quiet || pos % 4 === 0 || bar >= 6)) {
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12];
      out.push({ v: 'pluck', m: root + 24 + arp[(pos / 2) % 4], d: 2, g: quiet ? 0.35 : 0.22, e: true });
    }
    if (bar >= 2 && bar <= 9) {
      const n = themeNote(theme, ((bar - 2) % 4) * BAR + pos);
      const up = bar >= 6;
      if (n) {
        out.push({ v: 'lead', m: root + (up ? 24 : 12) + n.semi, d: n.len, g: 0.75, e: true });
        if (up) out.push({ v: 'soft', m: root + 12 + n.semi, d: n.len, g: 0.5 });
      }
      for (const [p, d, o] of [
        [0, 6, 0],
        [6, 2, 0],
        [8, 4, 0],
        [12, 4, 12],
      ]) {
        if (pos === p) out.push({ v: 'bass', m: root - 12 + ch[0] + o, d, g: 0.75 });
      }
      if (up) out.push(...drums(pos, bar, { fill: bar === 9 }));
      else if (pos % 4 === 2) out.push({ v: 'hat', m: 42, d: 1, g: 0.3 });
    }
    return out;
  },
};

// Space: mostly mood. Slow chords, a low drone, a few notes that drift by with an echo,
// and now and then a distant, slow echo of the title theme.
const space = {
  name: 'space',
  bpm: 70,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const echoBar = bar % 32 >= 16 && bar % 32 < 20 ? (bar % 32) - 16 : -1;
    // While the theme echoes, the chords follow it. Otherwise i, VI, III, VII, two bars each.
    const ch =
      echoBar >= 0 ? triad(theme.chords[echoBar >> 1]) : chordOn(colour.scale, [0, 5, 2, 6][Math.floor(bar / 2) % 4]);
    const out = [];
    if (pos === 0 && bar % 2 === 0) {
      out.push(...chord('pad', ch, root + 12, 2 * BAR, 0.32));
      out.push({ v: 'sub', m: root - 12 + ch[0], d: 2 * BAR, g: 0.4 });
    }
    if (echoBar >= 0) {
      const n = themeNote(theme, echoBar * BAR + pos, 2);
      if (n) out.push({ v: 'soft', m: root + 12 + n.semi, d: n.len, g: 0.45, e: true });
    } else if (pos % 2 === 0 && rand(step, 1) < 0.12) {
      const d = Math.floor(rand(step, 2) * 8);
      out.push({ v: 'pluck', m: root + 24 + degree(colour.scale, d), d: 2, g: 0.3, e: true });
    }
    return out;
  },
};

// Warning: the same space, but a low pulse says that something is on its way.
const warning = {
  name: 'warning',
  bpm: 84,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const ch = chordOn(colour.scale, [0, 5, 3, 4][Math.floor(bar / 2) % 4]);
    const out = [];
    if (pos === 0 && bar % 2 === 0) out.push(...chord('pad', ch, root + 12, 2 * BAR, 0.45));
    if (pos % 2 === 0) out.push({ v: 'bass', m: root - 12 + ch[0], d: 1.5, g: pos === 0 ? 0.7 : 0.45 });
    if (pos % 4 === 0) out.push({ v: 'tick', m: root + 36, d: 1, g: pos === 0 ? 0.5 : 0.3 });
    if (bar % 4 === 3 && pos === 8) out.push({ v: 'soft', m: root + 18, d: 8, g: 0.35 });
    return out;
  },
};

// Combat: tense and driving in a dark minor key. A chugging bass, a broken beat instead of four on the floor,
// and a riff with a lowered second. Two halves of eight bars with chords of their own, so a long fight keeps moving.
/** @type {[number, string][][]} */
const COMBAT_CHORDS = [
  [
    [0, 'min'],
    [0, 'min'],
    [-4, 'maj'],
    [-5, 'min'],
  ],
  [
    [0, 'min'],
    [1, 'maj'],
    [-4, 'maj'],
    [-5, 'min'],
  ],
];
// How hard each sixteenth of the bass is played.
const CHUG = [1, 0.35, 0.35, 0.8, 0.35, 0.35, 0.8, 0.35, 0.35, 0.35, 0.8, 0.35, 0.35, 0.35, 0.6, 0.5];
const DARK_RIFF = [0, null, 1, null, 0, null, -2, null, 3, null, 1, null, 0, null, null, null];
const combat = {
  name: 'combat',
  bpm: 128,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const half = Math.floor(bar / 8) % 2;
    const c = COMBAT_CHORDS[half][bar % 4];
    const kicks = half ? [0, 3, 6, 8, 11] : [0, 3, 8, 10];
    const out = tense(pos, step, { kicks, hats: half && colour.grit > 0.3 ? 1 : 2, fill: bar % 8 === 7, g: 0.9 });
    out.push({ v: 'bass', m: root - 12 + c[0] + (pos === 15 && bar % 4 === 3 ? 1 : 0), d: 0.8, g: 0.75 * CHUG[pos] });
    if (pos === 0) out.push(...chord('dark', triad(c), root, BAR, 0.5));
    if (!half && bar % 2 === 1 && (pos === 0 || pos === 6)) out.push(...chord('stab', triad(c), root + 12, 1.5, 0.4));
    const riff = half ? bar % 4 >= 2 : bar % 8 >= 6;
    if (riff && DARK_RIFF[pos] !== null) {
      out.push({ v: half ? 'lead' : 'pluck', m: root + 12 + DARK_RIFF[pos], d: 1.5, g: 0.45 });
    }
    return out;
  },
};

// Boarding, sneaking: quiet and tense. A heartbeat, a ticking clock, a low cluster that never resolves,
// and now and then a swell. It waits for everything to go off.
const DRONE = [0, 1, 7];
const boarding = {
  name: 'boarding',
  bpm: 92,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const out = [];
    if (pos === 0) out.push({ v: 'heart', m: 33, d: 1, g: 0.8 });
    if (pos === 3) out.push({ v: 'heart', m: 33, d: 1, g: 0.5 });
    if (pos === 0 && bar % 4 === 0) out.push(...chord('dark', DRONE, root - 12, 4 * BAR, 0.6));
    if (pos % 4 === 2) out.push({ v: 'tick', m: root + 43, d: 1, g: 0.18 });
    if (pos === 0 && bar % 8 === 6) out.push({ v: 'soft', m: root + 13, d: 24, g: 0.25 });
    if (pos % 2 === 0 && rand(step, 3) < 0.08) {
      out.push({ v: 'pluck', m: root + degree(colour.scale, Math.floor(rand(step, 4) * 7)), d: 2, g: 0.3, e: true });
    }
    return out;
  },
};

// Boarding, alarm: the pulse races. Four sections of eight bars, with the siren only now and then,
// so that a long alarm keeps moving instead of nagging:
//   A  broken drums, a grinding bass and the siren at the start
//   B  the chords move and a riff comes in
//   C  the drums drop out: a racing heartbeat and a rising arpeggio build up again
//   D  everything, with the siren once more
const ALARM_ROOTS = [
  [0, 0, 1, 0],
  [0, -4, -2, 1],
  [0, 0, 0, 0],
  [0, -4, 1, -5],
];
const GRIND = [1, 0.35, 0.6, 0.35, 0.35, 0.6, 0.35, 0.35, 1, 0.35, 0.6, 0.35, 0.35, 0.6, 0.35, 0.6];
const ALARM_RIFF = [7, null, null, 8, null, null, 7, null, 3, null, null, 1, null, null, 0, null];
const RISING = [0, 1, 7, 12, 13, 12, 7, 1];
const alarm = {
  name: 'alarm',
  bpm: 140,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const cycle = bar % 32;
    const part = Math.floor(cycle / 8);
    const r = ALARM_ROOTS[part][Math.floor(cycle / 2) % 4];
    const out = [];
    if (pos === 0 && bar % 4 === 0) out.push(...chord('dark', DRONE, root - 12, 4 * BAR, part === 2 ? 0.6 : 0.35));
    if (part === 2) {
      if ([0, 3, 8, 11].includes(pos)) out.push({ v: 'heart', m: 33, d: 1, g: pos % 8 === 0 ? 0.8 : 0.5 });
      if (pos === 0 && cycle % 2 === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.6 });
      const rise = (cycle - 16 + pos / 16) / 8;
      out.push({ v: 'pluck', m: root + 12 + RISING[pos % 8], d: 1, g: 0.15 + 0.35 * rise });
      if (cycle === 23) out.push(...tense(pos, step, { kicks: [], hats: 0, fill: true, g: 0.9 }));
      return out;
    }
    out.push(
      ...tense(pos, step, {
        kicks: [0, 6, 8, 11],
        hats: part === 3 ? 1 : 2,
        fill: cycle % 8 === 7 && part !== 1,
        g: 0.85,
      }),
    );
    out.push({ v: 'bass', m: root - 12 + r + (pos === 14 && part === 3 ? 12 : 0), d: 0.8, g: 0.6 * GRIND[pos] });
    if (part === 1 || (part === 3 && cycle % 4 >= 2)) {
      // The riff starts on either half of the bar, chosen anew each bar, so it is never quite the same.
      const n = ALARM_RIFF[(pos + (rand(bar, 9) < 0.35 ? 8 : 0)) % 16];
      if (n !== null) out.push({ v: 'lead', m: root + 12 + r + n, d: 1.5, g: 0.4 });
    }
    if (part === 0 && cycle >= 4 && cycle % 2 === 0 && pos === 0) out.push({ v: 'soft', m: root + 13, d: 8, g: 0.25 });
    if (cycle < 2 || cycle === 24) {
      if (pos === 0) out.push({ v: 'siren', m: root + 27, d: 7, g: 0.45 });
      if (pos === 8) out.push({ v: 'siren', m: root + 26, d: 7, g: 0.45 });
    }
    return out;
  },
};

// Boarding, alarm, the alternative: a chase that raises the pulse without any alarm sounds.
// A sequencer-like arpeggio drives it, and it is built in four sections of eight bars that each add something:
//   A  the arpeggio and a steady kick
//   B  the chords move, a backbeat and a dark pad come in
//   C  half time: the drums thin out while the arpeggio climbs an octave
//   D  everything, with a long melody on top and a turn back to the start
/** @type {[number, string][][]} */
const CHASE_CHORDS = [
  [
    [0, 'min'],
    [0, 'min'],
    [0, 'min'],
    [0, 'min'],
  ],
  [
    [0, 'min'],
    [-4, 'maj'],
    [-2, 'maj'],
    [-5, 'min'],
  ],
  [
    [0, 'min'],
    [-4, 'maj'],
    [0, 'min'],
    [-4, 'maj'],
  ],
  [
    [0, 'min'],
    [-4, 'maj'],
    [-2, 'maj'],
    [-5, 'maj'],
  ],
];
// Which note of the chord (root, third, fifth, octave) each sixteenth plays. Two shapes, chosen anew each bar.
const RUNS = [
  [0, 1, 2, 1, 0, 2, 3, 2, 0, 1, 2, 1, 3, 2, 1, 2],
  [0, 2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 2, 1, 3, 2, 1],
];
// The melody on top in the last section: [step in a two-bar phrase, note of the chord + octaves, length].
const SOAR = [
  [0, 2, 6],
  [6, 1, 4],
  [10, 0, 6],
  [16, 2, 8],
  [24, 3, 8],
];
const chase = {
  name: 'chase',
  bpm: 146,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const cycle = bar % 32;
    const part = Math.floor(cycle / 8);
    const c = CHASE_CHORDS[part][Math.floor(cycle / 2) % 4];
    const tones = [...triad(c), c[0] + 12];
    const out = [];
    const up = part === 2 && cycle >= 20 ? 12 : 0;
    const run = RUNS[rand(bar, 11) < 0.5 ? 0 : 1];
    out.push({ v: 'pluck', m: root + 12 + up + tones[run[pos]], d: 1, g: pos % 4 === 0 ? 0.5 : 0.32 });
    if (pos === 0 && cycle % 2 === 0 && part > 0) out.push(...chord('dark', triad(c), root, 2 * BAR, 0.45));
    if (part === 2) {
      if (pos === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.85 });
      if (pos === 8) out.push({ v: 'snare', m: 38, d: 1, g: 0.55 });
      if (cycle === 23 && pos >= 8) out.push({ v: 'snare', m: 38, d: 1, g: 0.25 + pos / 32 });
      if (pos === 0 && cycle % 2 === 0) out.push({ v: 'sub', m: root - 12 + c[0], d: 2 * BAR, g: 0.5 });
      return out;
    }
    const kicks = part === 0 ? [0, 8] : [0, 6, 8, 10];
    const g = part === 0 ? 0.7 : 0.9;
    const drums = tense(pos, step, { kicks, hats: part === 3 ? 1 : 2, fill: part > 0 && cycle % 8 === 7, g });
    out.push(...drums.filter((n) => part > 0 || n.v !== 'snare'));
    if (pos % 2 === 0)
      out.push({ v: 'bass', m: root - 12 + c[0] + (part === 3 && pos === 14 ? 12 : 0), d: 1.6, g: 0.6 });
    if (part === 3) {
      for (const [at2, tone, d] of SOAR) {
        if ((cycle % 2) * BAR + pos === at2) out.push({ v: 'lead', m: root + 12 + tones[tone], d, g: 0.45, e: true });
      }
    }
    return out;
  },
};

// Station: warm and calm, a safe place. Soft keys over major seventh chords, a round bass,
// and now and then the title theme in a warm major key on a bell.
const station = {
  name: 'station',
  bpm: 86,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const themeBar = bar % 16 >= 8 && bar % 16 < 12 ? (bar % 16) - 8 : -1;
    const ch =
      themeBar >= 0
        ? triad(majorChord(theme.chords[themeBar]))
        : chordOn(colour.warm, [0, 5, 3, 4][Math.floor(bar / 2) % 4], 4);
    const out = [];
    if (pos === 0 && (themeBar >= 0 || bar % 2 === 0)) {
      out.push(...chord('pad', ch, root + 12, themeBar >= 0 ? BAR : 2 * BAR, 0.25));
    }
    const arp = [0, 1, 2, ch.length - 1, 2, 1, 0, 1];
    if (pos % 2 === 0) out.push({ v: 'keys', m: root + 12 + ch[arp[pos / 2]] + (pos >= 8 ? 12 : 0), d: 2, g: 0.35 });
    for (const [p, d] of [
      [0, 6],
      [6, 2],
      [8, 8],
    ]) {
      if (pos === p) out.push({ v: 'sub', m: root - 12 + ch[0], d, g: 0.4 });
    }
    if (pos === 4 || pos === 12) out.push({ v: 'hat', m: 42, d: 1, g: 0.15 });
    if (themeBar >= 0) {
      const n = themeNote(theme, themeBar * BAR + pos);
      if (n) out.push({ v: 'bell', m: root + 24 + toMajor(n.semi), d: n.len, g: 0.5, e: true });
    }
    return out;
  },
};

// Victory: the title theme in full, in a major key, with everything. Played once, then the game's own music returns.
const won = {
  name: 'won',
  bpm: 108,
  fixedColour: true,
  length: 14 * BAR,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const out = [];
    let ch;
    if (bar < 2) ch = triad(majorChord(theme.chords[0]));
    else if (bar < 10) ch = triad(majorChord(theme.chords[(bar - 2) % 4]));
    else if (bar === 10) ch = triad([-4, 'maj']);
    else if (bar === 11) ch = triad([-2, 'maj']);
    else ch = triad([0, 'maj']);
    if (pos === 0) out.push(...chord('pad', ch, root + 12, bar >= 12 ? 2 * BAR : BAR, 0.55));
    if ((bar === 0 || bar === 2 || bar === 6 || bar === 12) && pos === 0) out.push({ v: 'crash', m: 49, d: 8, g: 0.6 });
    if (bar < 2 && pos % 2 === 0) {
      out.push({ v: 'pluck', m: root + 12 + ch[(pos / 2) % 3] + 12 * Math.floor(pos / 6), d: 2, g: 0.4, e: true });
    }
    if (bar >= 2 && bar < 10) {
      const n = themeNote(theme, ((bar - 2) % 4) * BAR + pos);
      const up = bar >= 6;
      if (n) {
        out.push({ v: 'lead', m: root + (up ? 24 : 12) + toMajor(n.semi), d: n.len, g: 0.8, e: true });
        out.push({ v: 'soft', m: root + (up ? 12 : 0) + toMajor(n.semi), d: n.len, g: 0.5 });
      }
    }
    if (bar >= 2 && bar < 12) {
      out.push(...drums(pos, bar, { fill: bar === 11, busy: bar >= 6, g: 0.75 }));
      if (pos % 4 === 0) out.push({ v: 'bass', m: root - 12 + ch[0] + (pos === 12 ? 12 : 0), d: 3, g: 0.75 });
    }
    if (bar === 12 && pos === 0) {
      out.push({ v: 'lead', m: root + 24, d: 2 * BAR, g: 0.7, e: true });
      out.push({ v: 'kick', m: 36, d: 1, g: 0.6 }, { v: 'sub', m: root - 12, d: 2 * BAR, g: 0.7 });
    }
    return out;
  },
};

// Lost: the title theme slow and dark in a low register. It breaks off in the middle and the last note falls away.
// After that only a low drone is left, now and then.
const BREAK = 22;
const lost = {
  name: 'lost',
  bpm: 64,
  fixedColour: true,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const out = [];
    if (step < 2 * BREAK) {
      const n = themeNote(theme, step, 2);
      if (n) {
        const end = step + n.len >= 2 * BREAK;
        out.push({ v: end ? 'fall' : 'soft', m: root + toDark(n.semi), d: end ? 2 * BREAK - step + 6 : n.len, g: 0.7 });
      }
      if (pos === 0 && bar % 2 === 0) {
        const ch = triad(theme.chords[(bar / 2) % 4]).map(toDark);
        out.push(...chord('dark', ch, root, 2 * BAR, 0.5));
      }
    }
    if (step === 2 * BREAK + 8 || (step > 2 * BREAK && pos === 0 && bar % 8 === 0)) {
      out.push({ v: 'dark', m: root - 12, d: 6 * BAR, g: 0.45 }, { v: 'dark', m: root - 5, d: 6 * BAR, g: 0.3 });
    }
    return out;
  },
};

export const PIECES = { title, space, warning, combat, boarding, alarm, chase, station, won, lost };
