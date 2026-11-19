// A button for fullscreen (F-286), on the game and on every page beside it: the play-test list, the mission tester
// and the design tests, so that each can be seen as it will be on a phone, a tablet and a computer. It is a plain
// script with nothing to import, so that every page can load it the same way:
//   <script src="src/fullscreen.js" defer></script>     (with the path to it from the page)
// The button sits in the top right corner of the window, faint until the pointer is over it. It is left out of the
// fixed pictures of the screenshot test (?still). Where a browser cannot show a page in fullscreen, as Safari on an
// iPhone, there is no button (F-287 will put the game on the home screen there).
// `window.criticalFullscreen` lets the game's own menu do the same: { supported, active(), toggle() }.
(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
  const current = () => doc.fullscreenElement || doc.webkitFullscreenElement || null;
  const supported = !!request && (doc.fullscreenEnabled !== false || doc.webkitFullscreenEnabled === true);
  const active = () => !!current();
  const toggle = () => {
    try {
      const done = active() ? exit.call(doc) : request.call(root, { navigationUI: 'hide' });
      if (done && done.catch) done.catch(() => {});
    } catch {
      // The browser said no: nothing changes.
    }
  };
  window.criticalFullscreen = { supported, active, toggle };
  if (!supported || /[?&]still\b/.test(window.location.search)) return;

  const ENTER =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" ' +
    'fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const LEAVE =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 1v5H1M15 6h-5V1M10 15v-5h5M1 10h5v5" ' +
    'fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const style = doc.createElement('style');
  style.textContent = `
    .critical-fullscreen { position: fixed; top: 6px; right: 6px; z-index: 2147483647; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 8px;
      border: 1px solid rgba(160, 168, 200, 0.45); background: rgba(10, 12, 24, 0.72); color: #e9ebf7;
      opacity: 0.45; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
      transition: opacity 0.15s; }
    .critical-fullscreen:hover, .critical-fullscreen:focus-visible { opacity: 1; }
    .critical-fullscreen:active { background: rgba(60, 70, 110, 0.9); opacity: 1; }
    .critical-fullscreen:focus { outline: none; }
    .critical-fullscreen:focus-visible { outline: 2px solid #7db4ff; outline-offset: 2px; }`;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'critical-fullscreen';
  const show = () => {
    const on = active();
    button.innerHTML = on ? LEAVE : ENTER;
    button.title = on ? 'Leave fullscreen' : 'Fullscreen';
    button.setAttribute('aria-label', button.title);
  };
  // The game listens for the pointer and the keys on the whole window: what happens on the button stays there.
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'keydown', 'keyup'])
    button.addEventListener(type, (e) => e.stopPropagation());
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
    // Back to the game's own screen, so that its keys work again at once.
    const canvas = doc.querySelector('canvas[tabindex]');
    if (canvas) canvas.focus();
    else button.blur();
  });
  doc.addEventListener('fullscreenchange', show);
  doc.addEventListener('webkitfullscreenchange', show);
  const add = () => {
    doc.head.appendChild(style);
    doc.body.appendChild(button);
    show();
  };
  if (doc.body) add();
  else doc.addEventListener('DOMContentLoaded', add);
})();
