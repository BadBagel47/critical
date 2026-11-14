// Music (F-048). Made in the browser with the Web Audio API, with no audio files.
// How it fits together:
//   music/theory.js    notes, scales, the title theme and each sector's colour
//   music/pieces.js    one piece for each kind of moment, as plain functions that give the notes of each step
//   music/director.js  which piece should play, with inertia so that a flickering scene is never heard
//   music/synth.js     the instruments
//   music/engine.js    plays the pieces on the audio clock and fades between them
// A listening page with a button for every piece is in docs/music/index.html.
import { musicOutput } from './audio.js';
import { createEngine } from './music/engine.js';
import { startSteer, steer, wanted } from './music/director.js';

// The title theme, as an index into THEMES in music/theory.js. Chosen by ear on the listening page.
export const THEME = 0;
// Which piece plays when the alarm goes off during boarding: 'alarm' or the alternative 'chase'. Chosen by ear.
export const ALARM = 'alarm';

let engine = null;
let engineOut = null;
let theme = THEME;
let mem = startSteer();
let wonBefore = null;
let victory = false;
let instant = false;

// Called once per frame, also on the title screen and while the game is paused.
//   info.scene    the kind of moment the player is in, see src/scene.js
//   info.sector   which sector the ship is in, 0 and up, for giving each place its own colour
//   info.paused   the game is paused
//   info.won      the last boss is destroyed
//   info.alarm    optional: the alarm has gone off while boarding
//   dt            real seconds since the last call
export function updateMusic(info, dt) {
  const output = musicOutput();
  if (!output) return; // no sound until the first key press or click
  if (!engine || engineOut !== output.out) {
    engine = createEngine(output.context, output.out);
    engineOut = output.out;
    engine.setTheme(theme);
  }
  // The victory plays once, when the boss falls. A game loaded after the victory does not play it again.
  if (wonBefore === false && info.won && info.scene !== 'title') victory = true;
  wonBefore = info.scene === 'title' ? null : Boolean(info.won);
  mem = instant ? { piece: wanted(info), candidate: null, held: 0 } : steer(mem, wanted(info), Math.min(dt, 0.5));
  let piece = mem.piece;
  if (victory) {
    if (engine.status().piece === 'won' && engine.finished('won')) victory = false;
    else if (mem.piece !== 'lost' && mem.piece !== 'title') piece = 'won';
    else victory = false;
  }
  engine.setPaused(Boolean(info.paused));
  engine.update(piece === 'alarm' ? ALARM : piece, info.sector || 0);
}

// For the listening page: choose the title theme, and see what is playing.
export function setMusicTheme(i) {
  theme = i;
  if (engine) engine.setTheme(i);
}
// The listening page can switch at once instead of with the game's inertia.
export function setMusicInstant(on) {
  instant = Boolean(on);
}
export const musicStatus = () => (engine ? engine.status() : null);
