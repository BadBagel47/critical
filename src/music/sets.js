// The sets of music. Each set has its own title theme and one piece for each kind of moment,
// so a whole new sound for the game can be tried without touching the one in use. SET in src/music.js chooses.
import { PIECES as A } from './pieces.js';
import { PIECES as B } from './pieces-b.js';
import { HORIZON, SIGNAL } from './theory.js';

export const SETS = {
  A: { name: 'A', theme: SIGNAL, pieces: A },
  B: { name: 'B', theme: HORIZON, pieces: B },
};
