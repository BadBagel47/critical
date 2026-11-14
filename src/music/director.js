// Which piece should play. The game's scene can flick back and forth, for example between warning and combat
// while an enemy circles, so the music has inertia of its own: it rises at once but calms down only slowly.
// Plain functions without sound, so they can be tested.

// The piece a moment asks for. Boarding is split into sneaking and alarm once the game tells the two apart.
export function wanted(info) {
  if (info.scene === 'alarm' || (info.scene === 'boarding' && info.alarm)) return 'alarm';
  return info.scene in INTENSITY ? info.scene : 'space';
}

export const INTENSITY = { title: 0, station: 0, lost: 0, space: 1, warning: 2, boarding: 2, combat: 3, alarm: 4 };

// Seconds a calmer moment must last before the music follows it down.
export const HOLD = { combat: 7, warning: 5, alarm: 3 };
// Seconds any other change must last, so that a single frame is never heard.
export const SETTLE = 0.4;

export const startSteer = (piece = 'title') => ({ piece, candidate: null, held: 0 });

// One frame of inertia. Gives the new memory; `piece` in it is what should play.
export function steer(mem, want, dt) {
  if (want === mem.piece) return { piece: mem.piece, candidate: null, held: 0 };
  const held = want === mem.candidate ? mem.held + dt : dt;
  const calmer = INTENSITY[want] < INTENSITY[mem.piece];
  // The title screen and the lost ship are no moments to linger in.
  const fixed = mem.piece === 'title' || want === 'lost' || mem.piece === 'lost';
  const need = calmer && !fixed ? (HOLD[mem.piece] ?? SETTLE) : SETTLE;
  if (held >= need) return { piece: want, candidate: null, held: 0 };
  return { piece: mem.piece, candidate: want, held };
}

// How fast pieces fade, in seconds: quick when the music rises, slow when it calms down.
export function fades(from, to) {
  if (from === null) return { in: 1.5, out: 0 };
  if (to === 'won' || to === 'lost') return { in: 0.3, out: 1.5 };
  if (INTENSITY[to] > INTENSITY[from]) return { in: 0.6, out: 1.2 };
  return { in: 2.5, out: 3 };
}
