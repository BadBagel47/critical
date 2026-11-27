// The second screen (F-137): a window of its own, opened from the game's menu and put on another screen of the same
// computer, a TV for one, as a big view of the bridge. It reads the game straight from the window that opened it and
// draws it in its own way; it changes nothing in the game, and nothing in the game needs it (2026-11-14).
//
// What it shows follows what goes on (VW3, 2026-11-27): the boarders' view while someone is aboard a place, a wide
// view of the fight while there are enemies near, and the star map while the ship travels. Any post can send its own
// view there instead (VW2), with Y, and that stays a while before the second screen goes back to following.
import { VIEW_W, VIEW_H, COL } from './config.js';
import { drawSpace } from './render/space.js';
import { drawStarMap } from './render/stars.js';
import { drawMap } from './render/map.js';
import { drawBoarding } from './render/boarding.js';
import { drawEngineer } from './render/engineer.js';
import { drawRadar } from './render/radar.js';
import { createEffects, updateEffects, updateInside } from './render/effects.js';
import { findDock } from './sim/things.js';
import { CREW, enemies } from './sim/sides.js';
import { label } from './render/draw.js';

// How near an enemy must be for the second screen to show the fight, and how wide it shows it.
export const FIGHT_NEAR = 900;
const WIDE = 0.45;
// A view chosen by itself stays at least this long, so that the screen does not flicker between two.
const HOLD_MS = 4000;
// How long the name of a view is shown when it comes up.
const NAME_MS = 4000;

// What the second screen shows by itself: 'boarding' with the boarder, 'fight', or 'stars'.
export function autoView(state) {
  const aboard = state.players.find((p) => {
    if (p.inside === null || p.inside === undefined) return false;
    const place = findDock(state, p.inside);
    return place && place.interior && !place.interior.trade;
  });
  if (aboard) return { what: 'boarding', playerId: aboard.id };
  const ship = state.ship;
  const near = state.vessels.some(
    (v) => enemies(state, CREW, v.side) && Math.hypot(v.x - ship.x, v.y - ship.y) < FIGHT_NEAR,
  );
  if (near || (state.alarm && state.alarm.count > 0 && state.alarm.eta <= 0)) return { what: 'fight' };
  return { what: 'stars' };
}

// What a view is called in the corner of the second screen.
const NAMES = {
  boarding: 'BOARDING',
  fight: 'THE FIGHT',
  stars: 'STAR MAP',
  space: 'SPACE',
  map: 'SYSTEM MAP',
  engineer: 'SHIP SYSTEMS',
  radar: 'BOARDING RADAR',
};

export function startViewer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = {
    playerId: 0,
    cam: { x: 0, y: 0 },
    fx: createEffects(),
    lights: true,
    starPick: null,
    mouse: { x: -1, y: -1 },
    engRow: -1,
    zoom: 0,
  };
  let shown = null;
  let named = '';
  let namedAt = 0;
  let since = 0;
  let last = performance.now();
  let scale = 1;
  // The picture is as big as the window allows, in the game's own shape.
  const fitToScreen = () => {
    scale = Math.min(
      (window.innerWidth * (window.devicePixelRatio || 1)) / VIEW_W,
      (window.innerHeight * (window.devicePixelRatio || 1)) / VIEW_H,
    );
    canvas.width = Math.floor(VIEW_W * scale);
    canvas.height = Math.floor(VIEW_H * scale);
    canvas.style.width = Math.floor((VIEW_W * scale) / (window.devicePixelRatio || 1)) + 'px';
    canvas.style.height = Math.floor((VIEW_H * scale) / (window.devicePixelRatio || 1)) + 'px';
  };
  window.addEventListener('resize', fitToScreen);
  fitToScreen();
  // A click or F makes the window fill its screen.
  const full = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen().catch(() => {});
  };
  canvas.addEventListener('click', full);
  window.addEventListener('keydown', (e) => e.code === 'KeyF' && full());

  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let game = null;
    try {
      game = window.opener && !window.opener.closed ? window.opener['__critical'] : null;
    } catch {
      game = null;
    }
    if (!game || !game.assets || !game.view.started) {
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const font = game && game.assets && game.assets.font;
      const text = game ? 'WAITING FOR A GAME TO START' : 'THE GAME IS CLOSED  ·  OPEN THE SECOND SCREEN FROM ITS MENU';
      if (font) font.draw(ctx, text, VIEW_W / 2, VIEW_H / 2, COL.dim, { align: 'c' });
      requestAnimationFrame(frame);
      return;
    }
    // The real game, not a guest's guess of it (D-264), so that the effects see the same things each frame.
    const state = (game.online && game.online.confirmed) || game.state;
    const assets = game.assets;
    // A view a post has sent, while it lasts; otherwise what goes on, held a moment against flicker.
    const sent = game.view.sent && game.view.sent.until > Date.now() ? game.view.sent : null;
    const auto = autoView(state);
    if (sent) shown = sent;
    else if (
      !shown ||
      shown.until ||
      (auto.what !== shown.what && now - since > HOLD_MS) ||
      (auto.what === shown.what && auto.playerId !== shown.playerId)
    ) {
      if (!shown || auto.what !== shown.what) since = now;
      shown = auto;
    }
    view.playerId = shown.playerId ?? game.view.playerId;
    view.starPick = game.view.starPick;
    const ship = state.ship;
    const wide = shown.what === 'fight';
    view.zoom = wide ? WIDE : shown.what === 'space' ? 0.75 : 0;
    // The camera: on the ship, and in a fight between it and the enemies near it.
    let cx = ship.x,
      cy = ship.y;
    if (wide) {
      const foes = state.vessels.filter(
        (v) => enemies(state, CREW, v.side) && Math.hypot(v.x - ship.x, v.y - ship.y) < FIGHT_NEAR,
      );
      for (const v of foes) {
        cx += (v.x - ship.x) / (foes.length + 1);
        cy += (v.y - ship.y) / (foes.length + 1);
      }
    }
    view.cam.x += (cx - view.cam.x) * Math.min(1, dt * 4);
    view.cam.y += (cy - view.cam.y) * Math.min(1, dt * 4);
    if (Math.hypot(cx - view.cam.x, cy - view.cam.y) > 3000) Object.assign(view.cam, { x: cx, y: cy });
    updateEffects(view.fx, state, view, dt);
    const me = state.players.find((p) => p.id === view.playerId);
    const place = me && findDock(state, me.inside);
    if (place && place.interior) updateInside(view.fx, place.interior, dt, state.paused);
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const what = shown.what === 'boarding' && !(place && place.interior) ? 'fight' : shown.what;
    if (what === 'boarding') drawBoarding(ctx, state, view, assets);
    else if (what === 'stars') drawStarMap(ctx, state, view, assets);
    else if (what === 'map') drawMap(ctx, state, view, assets);
    else if (what === 'engineer') drawEngineer(ctx, state, view, assets);
    else if (what === 'radar') drawRadar(ctx, state, view, assets);
    else drawSpace(ctx, state, { ...view, zoom: view.zoom || WIDE }, assets);
    // At the top: what is shown, and who sent it, for a few seconds after it changes, so that it does not lie over
    // the picture.
    const by = sent ? state.players.find((p) => p.id === sent.by) : null;
    const text = 'SECOND SCREEN  ·  ' + NAMES[what] + (by ? '  ·  SENT BY ' + by.name : '');
    if (text !== named) {
      named = text;
      namedAt = now;
    }
    if (now - namedAt < NAME_MS) {
      ctx.globalAlpha = Math.min(1, (NAME_MS - (now - namedAt)) / 600);
      label(ctx, assets.font, VIEW_W / 2, VIEW_H - 40, text, { anchor: 'c', fg: COL.text });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
