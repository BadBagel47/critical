// Set B: a second, completely different sound for the game, to compare with set A by ear.
// Where A is driving synths in 4/4, B is wide and floating: struck mallets, glass-like tones, a soft choir, warm brass
// and toms, and other metres. The title theme Horizon is a slow 6/8, combat runs in 7/8 and the stations in 3/4.
// The pieces work like those in pieces.js: asked for one step (a sixteenth) at a time, they give the notes on it.
// `bar` on a piece is its number of steps per bar when that is not 16.
import { chordOn, degree, majorChord, noteAt, rand, toDark, toMajor, triad } from './theory.js';

const at = (step, len) => ({ bar: Math.floor(step / len), pos: step % len });
const chord = (v, notes, base, d, g, extra = {}) => notes.map((n) => ({ v, m: base + n, d, g, ...extra }));
const tonesOf = (c) => [...triad(c), c[0] + 12];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

function themeNote(theme, step, slow = 1) {
  if (step < 0 || step % slow) return null;
  const n = noteAt(theme, step / slow);
  return n && { semi: n.semi, len: n.len * slow };
}

// A tom fill over the last steps of a bar, falling in pitch.
function tomFill(pos, from, every = 2, g = 0.6) {
  if (pos < from || (pos - from) % every) return [];
  return [{ v: 'tom', m: 57 - (pos - from), d: 1, g }];
}

// Title: the theme Horizon, in 6/8. 56 bars, about a minute and a half, before it loops:
//   0-7    a mallet figure over a low drone, the choir comes in
//   8-15   the theme on glass
//   16-23  the theme on brass, with toms and a shaker
//   24-31  a bridge with a melody of its own through new chords, back to the theme by way of A major
//   32-39  the theme on brass and glass together, with everything
//   40-47  a quiet break: the theme's first half, slow, on mallets
//   48-55  winding down to the start
/** @type {[number, string][]} */
const TITLE_PARTS = [
  [0, 'intro'],
  [8, 'glass'],
  [16, 'brass'],
  [24, 'bridge'],
  [32, 'full'],
  [40, 'break'],
  [48, 'outro'],
];
/** @type {[number, string][]} */
const BRIDGE_CHORDS = [
  [-4, 'maj'],
  [-2, 'maj'],
  [3, 'maj'],
  [5, 'maj'],
  [-4, 'maj'],
  [-2, 'maj'],
  [0, 'min'],
  [7, 'maj'],
];
// The bridge melody, bar by bar: [step, semitones from the root, length].
const BRIDGE_TUNE = [
  [
    [0, 3, 6],
    [6, 0, 6],
  ],
  [
    [0, 2, 6],
    [6, 5, 6],
  ],
  [
    [0, 7, 9],
    [9, 10, 3],
  ],
  [
    [0, 12, 6],
    [6, 9, 6],
  ],
  [
    [0, 8, 6],
    [6, 7, 3],
    [9, 3, 3],
  ],
  [
    [0, 5, 6],
    [6, 2, 6],
  ],
  [
    [0, 3, 6],
    [6, 7, 6],
  ],
  [
    [0, 11, 6],
    [6, 7, 6],
  ],
];
const FIGURE = [0, 2, 3, 1, 2, 3];
const title = {
  name: 'title',
  bpm: 120,
  bar: 12,
  fixedColour: true,
  notes(step, { colour, theme }) {
    const { bar: abs, pos } = at(step, 12);
    const bar = abs % 56;
    const [start, part] = TITLE_PARTS.filter(([b]) => b <= bar).pop();
    const inPart = bar - start;
    const root = colour.root;
    const c = part === 'bridge' ? BRIDGE_CHORDS[inPart] : theme.chords[bar % 8];
    const tones = tonesOf(c);
    const out = [];
    if (pos === 0 && bar % 4 === 0) out.push({ v: 'drone', m: root - 12, d: 48, g: part === 'full' ? 0.3 : 0.5 });
    if (pos === 0 && (part !== 'intro' || inPart >= 4)) {
      out.push(...chord('choir', triad(c), root + 12, 12, part === 'break' || part === 'intro' ? 0.5 : 0.4));
    }
    // The mallet figure that runs through it all, softer while the melody plays.
    if (part !== 'break' && pos % 2 === 0) {
      const quiet = part === 'intro' || part === 'outro';
      const fade = part === 'outro' ? 1 - inPart / 9 : 1;
      out.push({ v: 'mallet', m: root + 12 + tones[FIGURE[pos / 2]], d: 2, g: (quiet ? 0.5 : 0.28) * fade, e: quiet });
    }
    // The melody.
    const n = themeNote(theme, inPart * 12 + pos);
    if (part === 'glass' && n) out.push({ v: 'glass', m: root + 24 + n.semi, d: n.len, g: 0.6, e: true });
    if ((part === 'brass' || part === 'full') && n) {
      out.push({ v: 'brass', m: root + 12 + n.semi, d: n.len, g: 0.6 });
      if (part === 'full') out.push({ v: 'glass', m: root + 24 + n.semi, d: n.len, g: 0.45, e: true });
    }
    if (part === 'bridge') {
      for (const [p, semi, d] of BRIDGE_TUNE[inPart]) {
        if (pos === p)
          out.push({ v: 'brass', m: root + 12 + semi, d, g: 0.5 }, { v: 'glass', m: root + 24 + semi, d, g: 0.3 });
      }
    }
    if (part === 'break') {
      const slow = themeNote(theme, inPart * 12 + pos, 2);
      if (slow) out.push({ v: 'mallet', m: root + 12 + slow.semi, d: slow.len, g: 0.5, e: true });
    }
    // Bass and drums.
    if (['brass', 'bridge', 'full'].includes(part)) {
      if (pos === 0 || pos === 6) out.push({ v: 'sub', m: root - 12 + c[0] + (pos === 6 ? 7 : 0), d: 6, g: 0.55 });
      if (pos % 2 === 0) out.push({ v: 'shaker', m: 70, d: 1, g: pos % 6 === 0 ? 0.45 : 0.25 });
    }
    if (part === 'glass' && pos === 0) out.push({ v: 'tom', m: 50, d: 1, g: 0.35 });
    if (part === 'brass' && (pos === 0 || pos === 6)) out.push({ v: 'tom', m: pos ? 52 : 48, d: 1, g: 0.45 });
    if (part === 'bridge') {
      if (pos === 0) out.push({ v: 'tom', m: 48, d: 1, g: 0.45 });
      if (pos === 6) out.push({ v: 'rim', m: 70, d: 1, g: 0.4 });
    }
    if (part === 'full') {
      if (pos === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.8 });
      if (pos === 6) out.push({ v: 'snare', m: 38, d: 1, g: 0.45 });
      if (pos === 3 || pos === 9) out.push({ v: 'rim', m: 70, d: 1, g: 0.3 });
      if (inPart === 0 && pos === 0) out.push({ v: 'crash', m: 49, d: 8, g: 0.4 });
    }
    if ((part === 'brass' || part === 'bridge' || part === 'full') && inPart === 7) out.push(...tomFill(pos, 6));
    return out;
  },
};

// Space: floating, in a slow 6/8. Choir chords that change every two bars over a low drone, mallet notes like
// far-off stars, now and then a glass tone, and once in a long while the first half of Horizon, slow, on glass.
const space = {
  name: 'space',
  bpm: 84,
  bar: 12,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step, 12);
    const root = colour.root;
    const cycle = bar % 48;
    const echo = cycle >= 24 && cycle < 32 ? cycle - 24 : -1;
    const ch =
      echo >= 0 ? triad(theme.chords[echo >> 1]) : chordOn(colour.scale, [0, 3, 6, 2, 0, 3, 4, 6][(bar >> 1) % 8]);
    const out = [];
    if (pos === 0 && bar % 2 === 0) out.push(...chord('choir', ch, root + 12, 24, 0.4));
    if (pos === 0 && bar % 8 === 0) out.push({ v: 'drone', m: root - 12, d: 96, g: 0.45 });
    if (echo >= 0) {
      const n = themeNote(theme, echo * 12 + pos, 2);
      if (n) out.push({ v: 'glass', m: root + 12 + n.semi, d: n.len, g: 0.45, e: true });
    } else {
      if (pos % 3 === 0 && rand(step, 21) < 0.14) {
        out.push({
          v: 'mallet',
          m: root + 24 + degree(colour.scale, Math.floor(rand(step, 22) * 9)),
          d: 2,
          g: 0.3,
          e: true,
        });
      }
      if (pos === 0 && bar % 4 === 1 && rand(bar, 23) < 0.6)
        out.push({ v: 'glass', m: root + 24 + ch[2], d: 18, g: 0.22 });
    }
    return out;
  },
};

// Warning: the same floating space, but toms pulse like footsteps, a rim ticks, and the low drone creeps up a semitone.
const warning = {
  name: 'warning',
  bpm: 96,
  bar: 12,
  notes(step, { colour }) {
    const { bar, pos } = at(step, 12);
    const root = colour.root;
    const ch = chordOn(colour.scale, [0, 6, 3, 4][(bar >> 1) % 4]);
    const out = [];
    if (pos === 0 && bar % 2 === 0) out.push(...chord('choir', ch, root + 12, 24, 0.35));
    if (pos === 0 && bar % 4 === 0)
      out.push({ v: 'drone', m: root - 12 + [0, 0, 1, 1][(bar >> 2) % 4], d: 48, g: 0.5 });
    if (pos === 0 || pos === 6) out.push({ v: 'tom', m: 48, d: 1, g: pos ? 0.4 : 0.55 });
    if (pos === 9 && bar % 2) out.push({ v: 'tom', m: 52, d: 1, g: 0.3 });
    if (pos === 3 || pos === 9) out.push({ v: 'rim', m: 70, d: 1, g: 0.25 });
    if (pos % 2 === 0) out.push({ v: 'mallet', m: root + 12 + [0, 7, 3, 7, 0, 8][pos / 2], d: 2, g: 0.22 });
    return out;
  },
};

// Combat: in 7/8, counted 1-2, 1-2, 1-2-3, so it never quite settles. Three parts of eight bars:
// brass stabs, then a mallet riff, then long brass chords with a glass line over them.
/** @type {[number, string][][]} */
const COMBAT_CHORDS = [
  [
    [0, 'min'],
    [0, 'min'],
    [-4, 'maj'],
    [-2, 'maj'],
  ],
  [
    [0, 'min'],
    [1, 'maj'],
    [-4, 'maj'],
    [-5, 'min'],
  ],
  [
    [-4, 'maj'],
    [-2, 'maj'],
    [0, 'min'],
    [7, 'maj'],
  ],
];
const COMBAT_BASS = { 0: 0, 2: 0, 4: 0, 6: 7, 8: 0, 10: 3, 12: -2 };
const SEVEN_RIFF = [12, null, 10, null, 7, null, 8, null, 7, null, 3, null, 5, null];
const combat = {
  name: 'combat',
  bpm: 144,
  bar: 14,
  notes(step, { colour }) {
    const { bar, pos } = at(step, 14);
    const root = colour.root;
    const part = Math.floor((bar % 24) / 8);
    const c = COMBAT_CHORDS[part][bar % 4];
    const tones = tonesOf(c);
    const out = [];
    if (pos === 0 || pos === 8 || (part && pos === 11)) out.push({ v: 'kick', m: 36, d: 1, g: pos ? 0.7 : 0.9 });
    if (pos === 4 || pos === 11) out.push({ v: 'snare', m: 38, d: 1, g: 0.6 });
    if (pos % 2 === 0) out.push({ v: 'shaker', m: 70, d: 1, g: 0.35 });
    else if (part === 2) out.push({ v: 'shaker', m: 70, d: 1, g: 0.15 });
    if (pos === 0 || pos === 4 || pos === 8) out.push({ v: 'rim', m: 70, d: 1, g: 0.3 });
    if (bar % 8 === 7) out.push(...tomFill(pos, 8, 2, 0.55));
    if (pos in COMBAT_BASS)
      out.push({ v: 'bass', m: root - 12 + c[0] + COMBAT_BASS[pos], d: 1.6, g: pos % 4 === 0 ? 0.7 : 0.5 });
    if (part < 2 && pos === 0) out.push(...chord('choir', triad(c), root + 12, 14, 0.3));
    if (part === 0 && (pos === 0 || pos === 8)) out.push(...chord('brass', triad(c), root + 12, 2, 0.4));
    if (part === 1) {
      if (pos === 0) out.push(...chord('brass', triad(c), root + 12, 2, 0.35));
      if (SEVEN_RIFF[pos] !== null) out.push({ v: 'mallet', m: root + 12 + SEVEN_RIFF[pos], d: 2, g: 0.4 });
    }
    if (part === 2) {
      if (pos === 0) out.push(...chord('brass', triad(c), root + 12, 14, 0.3));
      if (pos === 0) out.push({ v: 'glass', m: root + 24 + tones[2], d: 8, g: 0.35 });
      if (pos === 8) out.push({ v: 'glass', m: root + 24 + tones[1], d: 6, g: 0.3 });
    }
    return out;
  },
};

// Boarding, sneaking: very still. An uneven heartbeat on a low tom that sometimes holds its breath, clicks that come
// and go, a low drone with a semitone rubbing against it, and high glass tones that do not belong to any chord.
const boarding = {
  name: 'boarding',
  bpm: 76,
  notes(step, { colour }) {
    const { bar, pos } = at(step, 16);
    const root = colour.root;
    const out = [];
    if (pos === 0 && bar % 8 === 0) {
      out.push({ v: 'drone', m: root - 12, d: 128, g: 0.5 }, { v: 'drone', m: root - 11, d: 128, g: 0.3 });
    }
    if (pos === 0) out.push({ v: 'tom', m: 45, d: 1, g: 0.55 });
    if (pos === 5 && bar % 8 !== 7) out.push({ v: 'tom', m: 45, d: 1, g: 0.35 });
    if (rand(step, 31) < 0.1) out.push({ v: 'rim', m: 70, d: 1, g: 0.12 + 0.12 * rand(step, 32) });
    if (pos === 0 && bar % 4 === 0) out.push({ v: 'glass', m: root + 25, d: 32, g: 0.18 });
    if (pos === 8 && bar % 4 === 2) out.push({ v: 'glass', m: root + 30, d: 24, g: 0.14 });
    if (pos % 4 === 0 && rand(step, 33) < 0.06) {
      out.push({ v: 'mallet', m: root + 12, d: 1, g: 0.2 }, { v: 'mallet', m: root + 13, d: 1, g: 0.2 });
    }
    if (pos === 0 && bar % 16 === 12) out.push(...chord('choir', [0, 3, 6], root, 64, 0.3));
    return out;
  },
};

// Boarding, alarm: a chase in a broken beat. Four parts of eight bars:
//   A  drums, a bass that jumps between octaves, and brass hits
//   B  mallet runs over moving chords
//   C  half time: the choir swells and a glass line climbs
//   D  everything, with a long brass melody
/** @type {[number, string][][]} */
const ALARM_CHORDS = [
  [
    [0, 'min'],
    [0, 'min'],
    [-2, 'maj'],
    [-2, 'maj'],
  ],
  [
    [0, 'min'],
    [-4, 'maj'],
    [-2, 'maj'],
    [1, 'maj'],
  ],
  [
    [0, 'min'],
    [0, 'min'],
    [-4, 'maj'],
    [-4, 'maj'],
  ],
  [
    [0, 'min'],
    [-4, 'maj'],
    [-5, 'min'],
    [-2, 'maj'],
  ],
];
const JUMP = [0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 7, 12];
const RUN = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 0];
const alarm = {
  name: 'alarm',
  bpm: 152,
  notes(step, { colour }) {
    const { bar, pos } = at(step, 16);
    const root = colour.root;
    const cycle = bar % 32;
    const part = Math.floor(cycle / 8);
    const c = ALARM_CHORDS[part][(cycle >> 1) % 4];
    const tones = tonesOf(c);
    const out = [];
    if (part === 2) {
      if (pos === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.8 });
      if (pos === 8) out.push({ v: 'snare', m: 38, d: 1, g: 0.5 });
      if (pos % 2 === 0) out.push({ v: 'shaker', m: 70, d: 1, g: 0.3 });
      if (pos === 0 && cycle % 2 === 0)
        out.push(...chord('choir', triad(c), root + 12, 32, 0.35 + 0.05 * (cycle - 16)));
      if (pos === 0) out.push({ v: 'glass', m: root + 24 + degree(colour.scale, cycle - 16), d: 16, g: 0.3 });
      if (pos % 4 === 0) out.push({ v: 'sub', m: root - 12 + c[0], d: 4, g: 0.5 });
    } else {
      if (pos === 0 || pos === 10) out.push({ v: 'kick', m: 36, d: 1, g: 0.85 });
      if (pos === 4 || pos === 12) out.push({ v: 'snare', m: 38, d: 1, g: 0.6 });
      out.push({ v: 'shaker', m: 70, d: 1, g: pos % 2 ? 0.16 : 0.32 });
      if (pos === 7 || pos === 15) out.push({ v: 'rim', m: 70, d: 1, g: 0.25 });
      out.push({ v: 'bass', m: root - 12 + c[0] + JUMP[pos], d: 0.8, g: 0.55 });
      if ((part === 0 || part === 3) && (pos === 0 || pos === 6))
        out.push(...chord('brass', triad(c), root + 12, 2, 0.4));
      if (part === 1 || part === 3) out.push({ v: 'mallet', m: root + 24 + tones[RUN[pos]], d: 1, g: 0.3 });
      if (part === 3 && pos === 0) out.push({ v: 'brass', m: root + 24 + tones[cycle % 2 ? 1 : 2], d: 14, g: 0.4 });
    }
    if (cycle % 8 === 7) out.push(...tomFill(pos, 8, 2, 0.55));
    return out;
  },
};

// Station: a calm waltz in 3/4, bright in the early sectors (the lydian mode) and plainer further in.
// A round bass on the first beat, mallet chords on the other two, a few glass notes, and now and then Horizon in major.
const station = {
  name: 'station',
  bpm: 104,
  bar: 12,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step, 12);
    const root = colour.root;
    const scale = colour.dark < 0.3 ? LYDIAN : colour.warm;
    const cycle = bar % 24;
    const themeBar = cycle >= 12 && cycle < 20 ? cycle - 12 : -1;
    const ch = themeBar >= 0 ? triad(majorChord(theme.chords[themeBar])) : chordOn(scale, [0, 1, 5, 4][(bar >> 1) % 4]);
    const out = [];
    if (pos === 0) out.push({ v: 'sub', m: root - 12 + ch[0], d: 4, g: 0.5 });
    if (pos === 8) out.push({ v: 'sub', m: root - 12 + ch[2], d: 4, g: 0.35 });
    if (pos === 4 || pos === 8) out.push(...chord('mallet', ch, root + 12, 2, 0.25));
    if (pos === 2 || pos === 6 || pos === 10) out.push({ v: 'shaker', m: 70, d: 1, g: 0.15 });
    if (pos === 0 && bar % 2 === 0) out.push(...chord('choir', ch, root + 12, 24, 0.22));
    if (themeBar >= 0) {
      const n = themeNote(theme, themeBar * 12 + pos);
      if (n) out.push({ v: 'glass', m: root + 24 + toMajor(n.semi), d: n.len, g: 0.45, e: true });
    } else if (pos === 0 && rand(bar, 41) < 0.35) {
      out.push({ v: 'glass', m: root + 24 + ch[Math.floor(rand(bar, 42) * 3)], d: 8, g: 0.3, e: true });
    }
    return out;
  },
};

// Victory: Horizon in major on brass and glass, with toms and the choir. Played once.
const won = {
  name: 'won',
  bpm: 120,
  bar: 12,
  fixedColour: true,
  length: 22 * 12,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step, 12);
    const root = colour.root;
    const out = [];
    /** @type {[number, string]} */
    let c = [0, 'maj'];
    if (bar >= 2 && bar < 18) c = majorChord(theme.chords[(bar - 2) % 8]);
    else if (bar === 18) c = [-4, 'maj'];
    else if (bar === 19) c = [-2, 'maj'];
    const ch = triad(c);
    if (pos === 0) out.push(...chord('choir', ch, root + 12, bar >= 20 ? 24 : 12, 0.45));
    if (bar < 2 && pos % 2 === 0) out.push({ v: 'tom', m: 50, d: 1, g: 0.2 + (bar * 12 + pos) / 40 });
    if ((bar === 2 || bar === 10 || bar === 20) && pos === 0) out.push({ v: 'crash', m: 49, d: 8, g: 0.5 });
    if (bar >= 2 && bar < 18) {
      const n = themeNote(theme, ((bar - 2) % 8) * 12 + pos);
      if (n) {
        out.push({ v: 'brass', m: root + 12 + toMajor(n.semi), d: n.len, g: 0.6 });
        out.push({ v: 'glass', m: root + 24 + toMajor(n.semi), d: n.len, g: 0.4, e: true });
      }
      if (pos === 0) out.push({ v: 'kick', m: 36, d: 1, g: 0.7 });
      if (pos === 6) out.push({ v: 'tom', m: 50, d: 1, g: 0.45 });
      if (pos % 2 === 0) out.push({ v: 'shaker', m: 70, d: 1, g: 0.3 });
      if (pos === 0 || pos === 6) out.push({ v: 'sub', m: root - 12 + ch[0], d: 6, g: 0.5 });
      if (bar >= 10 && pos % 2 === 0)
        out.push({ v: 'mallet', m: root + 24 + tonesOf(c)[FIGURE[pos / 2]], d: 2, g: 0.25 });
    }
    if (bar === 18 || bar === 19) {
      if (pos === 0)
        out.push(...chord('brass', ch, root + 12, 12, 0.45), { v: 'sub', m: root - 12 + ch[0], d: 12, g: 0.5 });
      if (bar === 19) out.push(...tomFill(pos, 4, 2, 0.55));
    }
    if (bar === 20 && pos === 0) {
      out.push(...chord('brass', ch, root + 12, 24, 0.45), { v: 'glass', m: root + 24, d: 24, g: 0.45, e: true });
      out.push({ v: 'kick', m: 36, d: 1, g: 0.7 }, { v: 'sub', m: root - 12, d: 24, g: 0.55 });
    }
    return out;
  },
};

// Lost: Horizon slow and dark on glass in a low register. It breaks off and its last note falls away.
// Then only a low drone, now and then.
const BREAK = 40;
const lost = {
  name: 'lost',
  bpm: 66,
  bar: 12,
  fixedColour: true,
  notes(step, { colour, theme }) {
    const { bar, pos } = at(step, 12);
    const root = colour.root;
    const out = [];
    if (step < 2 * BREAK) {
      const n = themeNote(theme, step, 2);
      if (n) {
        const end = step + n.len >= 2 * BREAK;
        out.push({
          v: end ? 'fall' : 'glass',
          m: root + 12 + toDark(n.semi),
          d: end ? 2 * BREAK - step + 6 : n.len,
          g: 0.6,
        });
      }
      if (pos === 0 && bar % 2 === 0)
        out.push(...chord('choir', triad(theme.chords[(bar / 2) % 8]).map(toDark), root, 24, 0.45));
    }
    if (step === 2 * BREAK + 8 || (step > 2 * BREAK && pos === 0 && bar % 8 === 0)) {
      out.push({ v: 'drone', m: root - 12, d: 72, g: 0.45 }, { v: 'drone', m: root - 5, d: 72, g: 0.3 });
    }
    return out;
  },
};

export const PIECES = { title, space, warning, combat, boarding, alarm, station, won, lost };
