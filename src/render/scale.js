// How large the game's picture is drawn (B-282, R-1234). The picture is drawn at a whole, even number of screen
// pixels per game pixel, so that both the game's pixels and the finer text land on whole pixels, and the browser
// then fits it to the window. On a large or sharp screen that number could reach six, which on a Mac with a retina
// screen is a picture as large as a 4K screen every frame, and too slow. It stops at four, and drops a step while
// the frames come too slowly.
export const MAX_SCALE = 4;
export const MIN_SCALE = 2;
// Too slow: half the frames of the last two seconds took longer than this, in seconds (under about 45 a second).
const SLOW = 1 / 45;
const WINDOW = 2;
// After a change, and at the start, the frames are not counted for a while, so that loading does not count.
const SETTLE = 3;

// The scale for a wanted number of screen pixels per game pixel, below the limit.
export const pickScale = (wanted, limit = MAX_SCALE) =>
  Math.max(MIN_SCALE, Math.min(limit, MAX_SCALE, 2 * Math.ceil(wanted / 2 - 0.01)));

// Keeps an eye on how fast the frames come. `seen(dt)` is called every frame with its length in seconds, and
// returns a lower limit when the picture should get smaller, or null.
export function speedWatch(start = MAX_SCALE) {
  let limit = start;
  let wait = SETTLE;
  let times = [];
  let span = 0;
  return {
    get limit() {
      return limit;
    },
    seen(dt, scale) {
      // A long pause (a hidden tab, a breakpoint) is not slowness.
      if (dt > 0.5) return null;
      if (wait > 0) {
        wait -= dt;
        return null;
      }
      times.push(dt);
      span += dt;
      if (span < WINDOW) return null;
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];
      times = [];
      span = 0;
      if (median <= SLOW || scale <= MIN_SCALE) return null;
      limit = Math.max(MIN_SCALE, scale - 2);
      wait = SETTLE;
      return limit;
    },
  };
}
