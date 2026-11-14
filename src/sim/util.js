// Small math helpers. Headings are radians, 0 = up, clockwise positive.
export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const forward = (h) => ({ x: Math.sin(h), y: -Math.cos(h) });
export const headingTo = (dx, dy) => Math.atan2(dx, -dy);
export function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep;
}
// Rotate a body-local point by heading h and add the body position.
export function toWorld(body, p) {
  const c = Math.cos(body.heading),
    s = Math.sin(body.heading);
  return { x: body.x + p.x * c - p.y * s, y: body.y + p.x * s + p.y * c };
}
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
// Deterministic random numbers kept in the state so runs can be replayed.
export function rand(state) {
  let t = (state.rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (state, lo, hi) => lo + rand(state) * (hi - lo);
