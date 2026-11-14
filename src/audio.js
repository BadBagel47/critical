// Sound. Everything is synthesised with the Web Audio API, so the game ships no audio files.
// The sound runs through three volumes: effects and music each have their own, and both go through the master,
// which the N key turns off and on. Every player sets these for themselves, and the browser remembers them.
const MASTER = 0.22;
const STORED = { muted: 'critical-muted', volume: 'critical-volume' };
let ac = null;
let master = null;
let effects = null;
let musicGain = null;
let engineGain = null;
let muted = false;
const volume = { effects: 1, music: 0.7 };
const last = new Map();

const stored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage may be unavailable
  }
};
const store = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage may be unavailable
  }
};
muted = stored(STORED.muted) === '1';
try {
  const saved = JSON.parse(stored(STORED.volume) || '{}');
  for (const kind of Object.keys(volume)) {
    if (typeof saved[kind] === 'number') volume[kind] = Math.max(0, Math.min(1, saved[kind]));
  }
} catch {
  // an unreadable setting falls back to the default
}

// The audio context can only start after a key press or click, so this is called from those.
export function initAudio() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return;
  }
  const AC = window.AudioContext || window['webkitAudioContext'];
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(ac.destination);
  effects = ac.createGain();
  effects.gain.value = volume.effects;
  effects.connect(master);
  musicGain = ac.createGain();
  musicGain.gain.value = volume.music;
  musicGain.connect(master);
  // A low engine hum that follows the throttle.
  const osc = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.value = 52;
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  engineGain = ac.createGain();
  engineGain.gain.value = 0;
  osc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(effects);
  osc.start();
}

// Where music connects: its own volume under the master, so that the settings and the N key reach it too.
// Gives { context, out } once sound has started, and null before that.
export function musicOutput() {
  return ac ? { context: ac, out: musicGain } : null;
}

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER;
  store(STORED.muted, muted ? '1' : '0');
  return muted;
}

// The volume of 'effects' or 'music', from 0 to 1.
export const volumeOf = (kind) => volume[kind];
export function setVolume(kind, value) {
  if (!(kind in volume)) return;
  volume[kind] = Math.round(Math.max(0, Math.min(1, value)) * 10) / 10;
  const node = kind === 'music' ? musicGain : effects;
  if (node) node.gain.value = volume[kind];
  store(STORED.volume, JSON.stringify(volume));
  // A short sound to judge the new effects level by.
  if (kind === 'effects' && ac && !muted) tone(660, 660, 0.08, 'triangle', 0.2);
}

export function setEngine(level) {
  if (engineGain) engineGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.35, ac.currentTime, 0.15);
}

function tone(from, to, dur, type = 'square', gain = 0.3, delay = 0) {
  const t = ac.currentTime + delay,
    osc = ac.createOscillator(),
    g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(effects);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
function noise(dur, gain = 0.3, cutoff = 1200, delay = 0) {
  const t = ac.currentTime + delay,
    n = Math.floor(ac.sampleRate * dur),
    buf = ac.createBuffer(1, n, ac.sampleRate),
    data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource(),
    filter = ac.createBiquadFilter(),
    g = ac.createGain();
  src.buffer = buf;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(effects);
  src.start(t);
}

// One small sound per kind of event. The number is the shortest gap in seconds between two of the same.
const SOUNDS = {
  shot: [0.05, () => tone(900, 420, 0.07, 'square', 0.12)],
  pirateShot: [0.06, () => tone(360, 190, 0.09, 'sawtooth', 0.08)],
  otherShot: [0.08, () => tone(520, 300, 0.07, 'square', 0.05)],
  rifle: [0.05, () => tone(700, 380, 0.05, 'square', 0.1)],
  heavyShot: [
    0.2,
    () => {
      tone(260, 50, 0.5, 'sawtooth', 0.35);
      noise(0.35, 0.25, 2400);
    },
  ],
  rocket: [0.1, () => noise(0.3, 0.2, 900)],
  rocketHit: [
    0.1,
    () => {
      noise(0.4, 0.35, 700);
      tone(140, 45, 0.35, 'sine', 0.3);
    },
  ],
  grenade: [
    0.1,
    () => {
      noise(0.4, 0.35, 700);
      tone(140, 45, 0.35, 'sine', 0.3);
    },
  ],
  kill: [
    0.08,
    () => {
      noise(0.45, 0.35, 900);
      tone(180, 40, 0.4, 'sine', 0.3);
    },
  ],
  guardDown: [0.08, () => noise(0.2, 0.25, 1400)],
  hullHit: [
    0.07,
    () => {
      noise(0.12, 0.3, 500);
      tone(110, 60, 0.12, 'square', 0.15);
    },
  ],
  shieldHit: [0.07, () => tone(1300, 700, 0.1, 'sine', 0.18)],
  pdHit: [0.07, () => tone(1800, 1200, 0.05, 'sine', 0.1)],
  shipLost: [
    1,
    () => {
      noise(1.4, 0.5, 500);
      tone(160, 30, 1.2, 'sawtooth', 0.4);
    },
  ],
  wreckExploded: [
    0.5,
    () => {
      noise(1, 0.45, 600);
      tone(130, 35, 0.9, 'sine', 0.35);
    },
  ],
  alarm: [
    1,
    () => {
      tone(880, 880, 0.14, 'square', 0.16);
      tone(660, 660, 0.14, 'square', 0.16, 0.18);
      tone(880, 880, 0.14, 'square', 0.16, 0.36);
    },
  ],
  distress: [
    1,
    () => {
      tone(520, 780, 0.25, 'sine', 0.2);
      tone(520, 780, 0.25, 'sine', 0.2, 0.35);
    },
  ],
  dock: [
    0.3,
    () => {
      tone(220, 330, 0.18, 'sine', 0.25);
      noise(0.1, 0.15, 400);
    },
  ],
  undock: [0.3, () => tone(330, 200, 0.18, 'sine', 0.2)],
  pickup: [0.05, () => tone(660, 990, 0.08, 'triangle', 0.2)],
  deposit: [
    0.2,
    () => {
      tone(520, 780, 0.1, 'triangle', 0.2);
      tone(780, 1040, 0.12, 'triangle', 0.2, 0.1);
    },
  ],
  salvage: [0.1, () => tone(700, 1050, 0.1, 'triangle', 0.18)],
  bought: [
    0.2,
    () => {
      tone(440, 660, 0.1, 'triangle', 0.2);
      tone(660, 880, 0.14, 'triangle', 0.2, 0.1);
    },
  ],
  cannotBuy: [0.2, () => tone(200, 150, 0.15, 'square', 0.12)],
  noPower: [0.2, () => tone(200, 150, 0.15, 'square', 0.12)],
  tileTurned: [0.03, () => tone(500, 520, 0.03, 'square', 0.08)],
  dialHit: [0.05, () => tone(700, 1100, 0.1, 'triangle', 0.2)],
  dialMiss: [0.05, () => tone(240, 160, 0.16, 'square', 0.14)],
  codeWrong: [0.2, () => tone(240, 140, 0.25, 'square', 0.15)],
  lockOpen: [
    0.3,
    () => [0, 0.09, 0.18].forEach((d, i) => tone(520 * (1 + i * 0.25), 520 * (1 + i * 0.25), 0.1, 'triangle', 0.2, d)),
  ],
  lockFailed: [0.3, () => tone(300, 80, 0.5, 'sawtooth', 0.2)],
  teleported: [
    0.3,
    () => {
      tone(1400, 200, 0.4, 'sine', 0.2);
      tone(1700, 300, 0.4, 'sine', 0.12, 0.05);
    },
  ],
  boarded: [0.3, () => tone(300, 450, 0.2, 'sine', 0.2)],
  pulse: [0.3, () => tone(300, 1400, 0.6, 'sine', 0.18)],
  probe: [0.2, () => tone(500, 900, 0.2, 'sine', 0.14)],
  buoy: [0.2, () => tone(420, 420, 0.12, 'sine', 0.16)],
  dartOut: [0.1, () => tone(400, 800, 0.15, 'sawtooth', 0.08)],
  jumpCharging: [0.5, () => tone(120, 480, 1.2, 'sawtooth', 0.12)],
  jumped: [
    0.5,
    () => {
      tone(200, 1800, 0.5, 'sine', 0.25);
      noise(0.5, 0.2, 3000, 0.3);
    },
  ],
  stationTaken: [
    0.5,
    () =>
      [0, 0.12, 0.24, 0.36].forEach((d, i) => tone(440 * (1 + i * 0.2), 440 * (1 + i * 0.2), 0.14, 'triangle', 0.2, d)),
  ],
  won: [
    1,
    () =>
      [0, 0.15, 0.3, 0.45, 0.6].forEach((d, i) =>
        tone(392 * (1 + i * 0.25), 392 * (1 + i * 0.25), 0.2, 'triangle', 0.22, d),
      ),
  ],
};

// Play the sounds for this frame's events.
export function playEvents(events) {
  if (!ac || muted) return;
  for (const e of events) {
    const s = SOUNDS[e.type];
    if (!s) continue;
    const now = ac.currentTime;
    if (now - (last.get(e.type) || -9) < s[0]) continue;
    last.set(e.type, now);
    s[1]();
  }
}
