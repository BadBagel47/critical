// Pictures and memories kept from frame to frame, for a thing, a place or a figure (found online 2026-11-28).
// A guest draws a fresh copy of the game nearly every frame (D-264), so what is kept is kept under what stays the
// same from copy to copy, and not under the object itself: an inside by the seed of its plan, a thing or a guard
// by its id, a boarder by its player. Kept under the object, a guest made the floors of a base anew every frame and
// fell to a few frames a second inside it.
export function keyOf(o) {
  if (o.planSeed !== undefined) return 'place:' + o.planSeed;
  if (o.id !== undefined) return 'id:' + o.id;
  if (o.player !== undefined) return 'player:' + o.player;
  return o;
}

// A store for what is kept: by key where there is one, and by the object (let go with it) where there is none.
export function keeper() {
  const byKey = new Map();
  const byObject = new WeakMap();
  return {
    get(o) {
      const k = keyOf(o);
      return typeof k === 'string' ? byKey.get(k) : byObject.get(k);
    },
    set(o, value) {
      const k = keyOf(o);
      if (typeof k === 'string') byKey.set(k, value);
      else byObject.set(k, value);
    },
  };
}

// The tiles of a place as one text, to see whether a door has opened or a wall gone since a picture was made.
export const tilesOf = (it) => (Array.isArray(it.tiles) ? it.tiles.join('\n') : String(it.tiles));
