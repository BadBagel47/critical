// The instruments. Each note builds a few Web Audio nodes, plays and then disconnects itself.
// Simple waves in the same world as the game's sound effects: square, sawtooth, triangle and sine, plus noise for drums.
import { midiToHz } from './theory.js';

// Loudness of each voice at g = 1, before the music's own level. Squares and saws are loud, so they sit lower.
const LEVEL = {
  pad: 0.07,
  dark: 0.08,
  soft: 0.2,
  lead: 0.09,
  bell: 0.16,
  keys: 0.14,
  pluck: 0.1,
  tick: 0.12,
  bass: 0.2,
  sub: 0.3,
  stab: 0.07,
  fall: 0.22,
  kick: 0.4,
  snare: 0.22,
  hat: 0.1,
  heart: 0.45,
  crash: 0.1,
  // set B
  mallet: 0.2,
  glass: 0.12,
  choir: 0.09,
  brass: 0.07,
  tom: 0.4,
  rim: 0.18,
  shaker: 0.07,
  drone: 0.1,
};
export const VOICES = Object.keys(LEVEL);

const noiseBuffers = new WeakMap();
function noise(context) {
  if (!noiseBuffers.has(context)) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return noiseBuffers.get(context);
}

// An envelope on a gain: rise to `peak` in `attack`, hold until `hold`, then fall away over `release`.
function envelope(param, t, peak, attack, hold, release) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.setValueAtTime(peak, t + Math.max(attack, hold));
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release);
  return t + Math.max(attack, hold) + release;
}

// Plays one note. `dest` is where it goes, `echo` an optional send to the echo, `step` the length of a step in seconds,
// and `grit` from 0 to 1 how raw the sector sounds. Gives the number of sources it started, and calls `done` for each.
export function play(context, note, t, { dest, echo, step, grit, done }) {
  const peak = (LEVEL[note.v] ?? 0.1) * note.g;
  const len = Math.max(0.03, note.d * step);
  const hz = midiToHz(note.m);
  const amp = context.createGain();
  // Silent until the note starts. A gain is 1 by default, and a source can start a sample before the envelope does,
  // which would be heard as a click.
  amp.gain.value = 0;
  amp.connect(dest);
  if (note.e && echo) amp.connect(echo);
  const nodes = [amp];
  const sources = [];
  const osc = (type, freq, detune = 0) => {
    const o = context.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    nodes.push(o);
    sources.push(o);
    return o;
  };
  const filter = (type, freq, q = 1) => {
    const f = context.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    nodes.push(f);
    return f;
  };
  const hiss = () => {
    const s = context.createBufferSource();
    s.buffer = noise(context);
    nodes.push(s);
    sources.push(s);
    return s;
  };
  let end;
  switch (note.v) {
    case 'pad':
    case 'dark': {
      const dark = note.v === 'dark';
      const spread = 6 + grit * 12;
      const f = filter('lowpass', dark ? 380 + grit * 200 : 700 + grit * 1300, 0.8 + grit * 4);
      for (const d of [-spread, spread]) osc('sawtooth', hz, d).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, Math.min(len / 2, dark ? 2 : 0.8), len, dark ? 2.5 : 1.4);
      break;
    }
    case 'soft':
    case 'fall': {
      const o = osc('triangle', hz);
      o.connect(amp);
      if (note.v === 'fall') o.frequency.exponentialRampToValueAtTime(hz / 2, t + len);
      end = envelope(amp.gain, t, peak, 0.06, len * 0.9, note.v === 'fall' ? 0.8 : 0.5);
      break;
    }
    case 'lead': {
      const f = filter('lowpass', 1800 + grit * 1500, 2);
      f.frequency.exponentialRampToValueAtTime(900 + grit * 900, t + Math.min(len, 0.6));
      const o = osc('square', hz);
      o.connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, 0.01, len * 0.85, 0.15);
      break;
    }
    case 'bell':
    case 'keys': {
      osc(note.v === 'bell' ? 'sine' : 'triangle', hz).connect(amp);
      const over = context.createGain();
      over.gain.value = note.v === 'bell' ? 0.35 : 0.2;
      nodes.push(over);
      osc('sine', hz * (note.v === 'bell' ? 3 : 2)).connect(over);
      over.connect(amp);
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(peak, t + 0.008);
      end = t + Math.max(0.4, Math.min(len * 1.5, note.v === 'bell' ? 1.8 : 1.1));
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      break;
    }
    case 'pluck':
    case 'stab': {
      const f = filter('lowpass', note.v === 'stab' ? 2400 : 2000, 1.5);
      f.frequency.exponentialRampToValueAtTime(300, t + 0.3);
      osc(note.v === 'stab' ? 'sawtooth' : 'square', hz).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, 0.004, 0, Math.min(0.35, len + 0.1));
      break;
    }
    case 'tick': {
      osc('sine', hz).connect(amp);
      end = envelope(amp.gain, t, peak, 0.002, 0, 0.06);
      break;
    }
    case 'bass': {
      const f = filter('lowpass', 380 + grit * 600, 3 + grit * 4);
      osc('sawtooth', hz).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, 0.005, len * 0.7, 0.08);
      break;
    }
    case 'sub': {
      osc('triangle', hz).connect(amp);
      end = envelope(amp.gain, t, peak, 0.03, len * 0.9, 0.3);
      break;
    }
    case 'kick':
    case 'heart': {
      const o = osc('sine', note.v === 'kick' ? 150 : 75);
      o.frequency.exponentialRampToValueAtTime(note.v === 'kick' ? 42 : 38, t + 0.12);
      o.connect(amp);
      end = envelope(amp.gain, t, peak, 0.003, 0, note.v === 'kick' ? 0.25 : 0.2);
      break;
    }
    case 'mallet': {
      // a struck bar: a sine and a high overtone that dies quickly
      osc('sine', hz).connect(amp);
      const over = context.createGain();
      nodes.push(over);
      over.gain.setValueAtTime(0.3, t);
      over.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc('sine', hz * 4).connect(over);
      over.connect(amp);
      end = envelope(amp.gain, t, peak, 0.003, 0, Math.min(0.9, 0.25 + len));
      break;
    }
    case 'glass': {
      // two sines a hair apart, which shimmer against each other
      osc('sine', hz).connect(amp);
      const over = context.createGain();
      over.gain.value = 0.3;
      nodes.push(over);
      osc('sine', hz * 2.01).connect(over);
      over.connect(amp);
      end = envelope(amp.gain, t, peak, 0.02, len * 0.8, 1.6);
      break;
    }
    case 'choir': {
      // three soft voices slightly out of tune with each other
      const f = filter('lowpass', 1300 + grit * 700, 0.7);
      for (const d of [-8, 8]) osc('triangle', hz, d).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, Math.min(len / 2, 0.6), len, 1.6);
      break;
    }
    case 'brass': {
      // a swell: the filter opens as the note starts, then settles
      const f = filter('lowpass', 300, 1.2);
      f.frequency.linearRampToValueAtTime(1700 + grit * 900, t + 0.12);
      f.frequency.linearRampToValueAtTime(1000 + grit * 500, t + 0.5);
      for (const d of [-5, 5]) osc('sawtooth', hz, d).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, 0.08, len * 0.85, 0.25);
      break;
    }
    case 'drone': {
      const f = filter('lowpass', 240 + grit * 160, 2);
      osc('sawtooth', hz).connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, Math.min(len / 2, 2), len, 3);
      break;
    }
    case 'tom': {
      const o = osc('sine', hz);
      o.frequency.exponentialRampToValueAtTime(hz * 0.45, t + 0.25);
      o.connect(amp);
      end = envelope(amp.gain, t, peak, 0.003, 0, 0.35);
      break;
    }
    case 'rim':
    case 'shaker': {
      const s = hiss();
      const f = note.v === 'rim' ? filter('bandpass', 2300, 4) : filter('highpass', 5500);
      s.connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, note.v === 'rim' ? 0.001 : 0.012, 0, note.v === 'rim' ? 0.035 : 0.07);
      break;
    }
    default: {
      // snare, hat and crash are filtered noise
      const s = hiss();
      const f = filter('highpass', note.v === 'hat' ? 7000 : note.v === 'crash' ? 3500 : 1200);
      s.connect(f);
      f.connect(amp);
      end = envelope(amp.gain, t, peak, 0.002, 0, note.v === 'hat' ? 0.05 : note.v === 'crash' ? 1.6 : 0.16);
    }
  }
  let left = sources.length;
  for (const s of sources) {
    s.start(t);
    s.stop(end + 0.05);
    s.onended = () => {
      done();
      if (--left === 0) for (const n of nodes) n.disconnect();
    };
  }
  return sources.length;
}
