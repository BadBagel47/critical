// The music's building blocks: notes, scales, the title theme and the colour of each sector.
// Everything here is plain functions without sound, so it can be tested without a browser.

// Steps are sixteenth notes, so a bar of 4/4 is 16 steps.
export const BAR = 16;

// The lowest root, D3. Every sector moves it a little.
export const BASE_ROOT = 50;

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Scales as semitones from the root.
export const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

// A degree of a scale as semitones, wrapping into higher and lower octaves.
export function degree(scale, d) {
  const n = scale.length;
  return scale[((d % n) + n) % n] + 12 * Math.floor(d / n);
}

// The chord built on a degree: every other note of the scale, `size` notes in all.
export function chordOn(scale, d, size = 3) {
  return Array.from({ length: size }, (_, i) => degree(scale, d + 2 * i));
}

// A chord given as a root and a quality, as the themes write them.
export const triad = (c) => [c[0], c[0] + (c[1] === 'maj' ? 4 : 3), c[0] + 7];

// A random number from 0 up to 1 that is always the same for the same step and salt.
// The music may use real randomness, but this makes it repeatable and testable.
export function rand(n, salt = 0) {
  let x = (Math.imul(n | 0, 374761393) + Math.imul(salt | 0, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// The colour of a sector. Early sectors are lighter and calmer, later ones darker, rawer and a little faster.
// The number of sectors is not fixed, so the darkness grows towards 1 without ever reaching it.
const SHIFTS = [0, -2, 1, -3, 2, -4, -1, 3];
export function colourOf(sector) {
  const s = Math.max(0, Math.floor(Number(sector) || 0));
  const dark = 1 - Math.pow(0.75, s);
  const mode = dark < 0.2 ? 'dorian' : dark < 0.5 ? 'aeolian' : 'phrygian';
  return {
    sector: s,
    dark,
    root: BASE_ROOT + SHIFTS[s % SHIFTS.length],
    tempo: 1 + 0.12 * dark,
    grit: dark,
    scale: SCALES[mode],
    mode,
    warm: dark < 0.5 ? SCALES.ionian : SCALES.mixolydian,
  };
}

// The title themes, one for each set of music. Notes are [semitones from the root, length in steps], null for a rest,
// and there is one chord per bar, given as [semitones from the root, 'maj' or 'min']. `bar` is the steps in a bar.
// Signal belongs to set A: four bars of 4/4 in a minor key.
export const SIGNAL = {
  name: 'Signal',
  bar: BAR,
  // prettier-ignore
  notes: [
    [0, 4], [7, 4], [5, 2], [3, 2], [5, 4],
    [3, 2], [2, 2], [0, 4], [-2, 4], [0, 4],
    [0, 4], [7, 4], [10, 2], [8, 2], [7, 4],
    [5, 2], [3, 2], [2, 4], [7, 8],
  ],
  chords: [
    [0, 'min'],
    [-2, 'maj'],
    [0, 'min'],
    [7, 'min'],
  ],
};
// Horizon belongs to set B: eight bars of a slow 6/8 in the dorian mode, whose raised sixth (bar four) gives it
// a hopeful, far-away colour.
export const HORIZON = {
  name: 'Horizon',
  bar: 12,
  // prettier-ignore
  notes: [
    [0, 6], [2, 3], [3, 3],
    [7, 9], [5, 3],
    [3, 6], [5, 3], [7, 3],
    [9, 12],
    [10, 6], [9, 3], [7, 3],
    [5, 6], [3, 3], [2, 3],
    [3, 6], [2, 3], [-2, 3],
    [0, 12],
  ],
  chords: [
    [0, 'min'],
    [-2, 'maj'],
    [-4, 'maj'],
    [5, 'maj'],
    [-2, 'maj'],
    [3, 'maj'],
    [-2, 'maj'],
    [0, 'min'],
  ],
};
export const THEMES = [SIGNAL, HORIZON];
export const themeSteps = (theme) => theme.notes.reduce((sum, [, len]) => sum + len, 0);

// The note of a theme that starts on a step, or null. Steps outside the theme have none.
const starts = new Map();
export function noteAt(theme, step) {
  if (!starts.has(theme)) {
    const at = new Map();
    let s = 0;
    for (const [semi, len] of theme.notes) {
      if (semi !== null) at.set(s, { semi, len });
      s += len;
    }
    starts.set(theme, at);
  }
  return starts.get(theme).get(step) || null;
}

// The theme in a major key, for the friendly stations and the victory: the minor third, sixth and second are raised.
const RAISE = { 1: 1, 3: 1, 8: 1 };
export function toMajor(semi) {
  return semi + (RAISE[((semi % 12) + 12) % 12] || 0);
}
// A chord of the theme in the major key. The tonic and the fifth become major, chords that moved become minor.
/** @returns {[number, string]} */
export function majorChord(c) {
  const [root, quality] = c;
  const moved = toMajor(root);
  const pc = ((moved % 12) + 12) % 12;
  if (pc === 0 || pc === 7) return [moved, 'maj'];
  return [moved, moved !== root ? 'min' : quality];
}

// The theme made darker, for the lost ship: the second, third and sixth are lowered.
const LOWER = { 2: -1, 4: -1, 9: -1 };
export function toDark(semi) {
  return semi + (LOWER[((semi % 12) + 12) % 12] || 0);
}
