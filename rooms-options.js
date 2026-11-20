// The rooms for online play (F-040, docs/proposal-online.md), as plain data so that network-kit's smoke test can
// load them outside Cloudflare: node vendor/network-kit/smoke.mjs --options rooms-options.js
// The host's browser runs the game and the others follow it step by step; another player takes over if the host
// is lost. A new player takes the first free post (ON7, ON8). The code alone lets one in (ON6). Pausing is decided
// by the game itself, by everyone agreeing (R-1250, F-037), so the room never pauses by itself.
export default {
  mode: 'host',
  takeover: true,
  takeoverMs: 5_000,
  places: ['captain', 'gunner', 'engineer'],
  roles: { player: { seats: 3 }, viewer: { seats: 2 } },
  access: 'open',
  lateJoin: 'now',
  pauseBy: 'nobody',
  // A dropped player keeps the seat and the post this long, the same as the wait before a boarder is sent home
  // (R-1243, B.AWAY_HOME).
  graceMs: 60_000,
  heartbeatMs: 2_000,
  // The host sends the steps of the game about 20 times a second while others play: an evening of four hours is
  // under 300,000 messages. A host left alone keeps the room for a while, in case the others come back.
  maxMessagesPerDay: 400_000,
  maxActiveMinutesPerDay: 480,
  closeAloneAfterMs: 20 * 60_000,
  codeLength: 6,
};
