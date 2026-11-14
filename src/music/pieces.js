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

// Combat: driving drums and bass, short chord stabs and a riff of its own. Loud enough to lift, but under the effects.
const RIFF = [7, null, 6, null, 4, null, 3, 4, null, null, 2, null, 3, null, null, null];
const BASSLINE = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12];
const combat = {
  name: 'combat',
  bpm: 132,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const ch = chordOn(colour.scale, [0, 5, 6, 4][bar % 4]);
    const out = drums(pos, bar, { fill: bar % 8 === 7, busy: colour.grit > 0.3, g: 0.9 });
    out.push({ v: 'bass', m: root - 12 + ch[0] + BASSLINE[pos], d: 0.9, g: 0.6 });
    if (bar % 2 === 1 && (pos === 6 || pos === 14)) out.push(...chord('stab', ch, root + 12, 1.5, 0.5));
    if (bar % 4 >= 2 && RIFF[pos] !== null) {
      out.push({
        v: 'lead',
        m: root + 12 + degree(colour.scale, RIFF[pos] + (bar % 4 === 3 ? -2 : 0)),
        d: 1.5,
        g: 0.5,
      });
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

// Boarding, alarm: the same ground, but the pulse races, the bass grinds and a siren cuts through.
const GRIND = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 1, 0, 1];
const alarm = {
  name: 'alarm',
  bpm: 150,
  notes(step, { colour }) {
    const { bar, pos } = at(step);
    const root = colour.root;
    const out = drums(pos, bar, { busy: true, fill: bar % 4 === 3, g: 0.9 });
    if (pos === 2) out.push({ v: 'heart', m: 33, d: 1, g: 0.6 });
    if (pos === 0 && bar % 4 === 0) out.push(...chord('dark', DRONE, root - 12, 4 * BAR, 0.45));
    out.push({ v: 'bass', m: root - 12 + GRIND[pos] + (bar % 4 === 2 ? 5 : 0), d: 0.9, g: 0.6 });
    if (pos === 0) out.push({ v: 'siren', m: root + 27, d: 7, g: 0.6 });
    if (pos === 8) out.push({ v: 'siren', m: root + 26, d: 7, g: 0.6 });
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

export const PIECES = { title, space, warning, combat, boarding, alarm, station, won, lost };
