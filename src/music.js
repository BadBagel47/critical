// Music. Not written yet: see docs/music-brief.md for what goes here (F-048).
// Like all sound in the game it is to be made in the browser with the Web Audio API, with no audio files.
import { musicOutput } from './audio.js';

// Called once per frame, also on the title screen and while the game is paused.
//   info.scene    the kind of moment the player is in, see src/scene.js
//   info.sector   which sector the ship is in, 0 and up, for giving each place its own colour
//   info.paused   the game is paused
//   info.won      the last boss is destroyed
//   dt            real seconds since the last call
// musicOutput() gives { context, out } once sound has started, and null before that. Connect to `out`.
export function updateMusic(info, dt) {
  void info;
  void dt;
  void musicOutput;
}
