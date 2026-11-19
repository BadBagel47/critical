// Playtest on this page (D-288, network-kit 0.15, R-1240): Playtest-rutan, where a test from the play-test list is
// started, its steps are shown and the answers are sent to network-kit's admin page, and Playtest Remote, the same
// on a phone. Every page where tests are run loads this, the game and the design tests alike:
//   <script type="module" src="…/src/playtest-start.js"></script>     (with the path to it from the page)
// Without a tester link from the admin page nothing more is loaded and nothing is sent anywhere: network-kit's
// light entry looks for the link first. The panel is left out in ?still, so that the screenshot tests stay the same.
import { ITEMS } from './playtest-items.js';

// network-kit's admin page, the only other service the game may talk to, and only for this (R-1240).
export const PLAYTEST_ADMIN = 'https://network-kit-admin.l8p1.workers.dev';

// What the game adds to each report: where in the game the tester was. Pages that are not the game add their name.
function context() {
  const c = /** @type {any} */ (window).__critical;
  if (!c || !c.state) return { page: window.location.pathname.split('/').pop() || 'index.html' };
  const s = c.state;
  const me = s.players && s.players.find((p) => p.id === (c.view && c.view.playerId));
  return {
    mode: c.mode,
    post: me ? me.post : null,
    inside: me ? me.inside || null : null,
    system: s.sectors && s.sectors[s.sector] ? s.sectors[s.sector].name : s.sector,
    test: !!s.test,
    hardcore: !!s.hardcore,
    mapSize: s.size,
    time: Math.round(s.time || 0),
  };
}

async function start() {
  // The entry is loaded by its address, so that the type check leaves network-kit's own copy alone.
  const entry = new URL('../vendor/network-kit/client/playtest-entry.js', import.meta.url).href;
  const kit = await import(entry);
  await kit.startPlaytest({
    admin: PLAYTEST_ADMIN,
    items: ITEMS,
    // The game has no build step: the time the page was published says which version it is.
    version: new Date(document.lastModified).toISOString().slice(0, 16).replace('T', ' '),
    context,
    canvas: () => document.querySelector('canvas'),
  });
}

start().catch((e) => console.warn('Playtest could not start:', e));
