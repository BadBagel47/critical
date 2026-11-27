// The menu: the title screen, and the game menu behind the O key. Both are pages of rows that are worked
// with the arrow keys and Enter, the mouse, or a gamepad. A page is a function that lists its rows, so a new
// choice is one more row and a new page one more entry in PAGES.
//   row.run       what happens when the row is chosen
//   row.confirm   a question shown first, for choices that throw something away. Choosing again goes ahead.
//   row.slider    the row sets a volume instead: 'effects' or 'music'
//   row.off       the row cannot be chosen right now, and `right` says why
import { knownAvailable } from './online.js';
import { glLightChoice, glLightFellBack, setGlLight } from './render/gl-light.js';
import { touchOptions, setTouchOption } from './touch.js';
import { VIEW_W, VIEW_H, COL } from './config.js';
import { rect, bar } from './render/draw.js';
import { volumeOf, setVolume, isMuted, toggleMute } from './audio.js';
import { AUTO, MANUAL, latestSlot, describeSave } from './saves.js';
import { SIZES, SIZE_NAMES } from './sim/world.js';

const SIZE_ORDER = Object.keys(SIZES);

const W = 430;
const X = (VIEW_W - W) / 2;
const ROW_H = 16;
const STEP_Y = 20;
const SLIDER = { x: X + W - 150, w: 110 };

// `size` is how big a world a new game gets, see sim/world.js.
// `computer` is which posts the ship's computer may run in a new game; none by default (R-816, F-034).
export const createMenu = () => ({
  page: 'title',
  row: 0,
  confirm: null,
  note: null,
  size: 'short',
  computer: { captain: false, gunner: false, engineer: false },
});
// What the ship's computer may run, in a few words.
export function computerSummary(computer) {
  const posts = Object.keys(computer).filter((p) => computer[p]);
  return posts.length ? posts.map((p) => p.toUpperCase()).join('  ') : 'NO POSTS';
}
// Open a page with the first row that can be chosen picked.
export function openPage(game, page) {
  const menu = game.view.menu;
  Object.assign(menu, { page, row: 0, confirm: null, note: null });
  const rows = PAGES[page].rows(game);
  menu.row = Math.max(
    0,
    rows.findIndex((r) => !r.off),
  );
}
const storedNameOf = (game) => {
  try {
    return (game.storage && game.storage.getItem('critical-name')) || '';
  } catch {
    return '';
  }
};
const rootOf = (game) => (game.view.started ? 'main' : 'title');

const slotName = (slot) => (slot === AUTO ? 'AUTOSAVE' : 'SLOT ' + slot);
// A row for one save slot. `use` is what choosing it does, and `whenEmpty` whether an empty slot can be chosen.
function slotRow(game, slot, use, whenEmpty, confirm) {
  const save = game.saves[slot];
  const about = save ? describeSave(save) : null;
  return {
    id: 'slot' + slot,
    label: slotName(slot) + (about ? '   ' + about.left : ''),
    right: about ? about.right : 'EMPTY',
    off: !save && !whenEmpty,
    confirm: save ? confirm : null,
    run: () => use(slot),
  };
}
const back = (game) => ({ id: 'back', label: 'BACK', run: () => openPage(game, rootOf(game)) });
const noStorage = (game) => (game.storage ? null : 'THIS BROWSER DOES NOT ALLOW SAVING');

// Fullscreen (F-286), where the browser can show the game so: the same as the button in the corner (src/fullscreen.js).
// The menu is chosen within a frame of the key or the click, which the browser still counts as the player's own act.
// The light inside and in space drawn by the graphics card, or as before (F-294, F-295, WG2): NEW or CLASSIC, and
// why it went back.
function lightRow() {
  const choice = glLightChoice();
  const right = choice === 'new' ? 'NEW' : glLightFellBack() ? 'CLASSIC  ·  TOO SLOW HERE' : 'CLASSIC';
  return [{ id: 'light', label: 'LIGHT', right, run: () => setGlLight(choice === 'new' ? 'classic' : 'new') }];
}
function fullscreenRow() {
  const fs = typeof window !== 'undefined' ? /** @type {any} */ (window).criticalFullscreen : null;
  if (!fs || !fs.supported) return [];
  return [{ id: 'fullscreen', label: 'FULLSCREEN', right: fs.active() ? 'ON' : 'OFF', run: fs.toggle }];
}

const PAGES = {
  title: {
    rows(game) {
      const a = game.actions;
      const latest = latestSlot(game.saves);
      const size = game.view.menu.size;
      const computer = { ...game.view.menu.computer };
      return [
        {
          id: 'continue',
          label: 'CONTINUE',
          right: latest ? slotName(latest) : 'NO SAVED GAME',
          off: !latest,
          run: () => a.load(latest),
        },
        { id: 'new', label: 'NEW GAME', run: () => a.newGame({ size, computer }) },
        {
          id: 'hardcore',
          label: 'NEW GAME  ·  HARDCORE',
          right: 'ONE LIFE',
          run: () => a.newGame({ hardcore: true, size, computer }),
        },
        {
          id: 'size',
          label: 'MAP SIZE',
          right: `${SIZE_NAMES[size]}  ·  ${SIZES[size]} SYSTEMS`,
          run: () => (game.view.menu.size = SIZE_ORDER[(SIZE_ORDER.indexOf(size) + 1) % SIZE_ORDER.length]),
        },
        {
          id: 'computer',
          label: "SHIP'S COMPUTER",
          right: computerSummary(computer),
          run: () => openPage(game, 'computer'),
        },
        { id: 'load', label: 'LOAD GAME', run: () => openPage(game, 'load') },
        { id: 'sound', label: 'SOUND', run: () => openPage(game, 'sound') },
        ...fullscreenRow(),
        ...(knownAvailable()
          ? [{ id: 'online', label: 'PLAY ONLINE', right: 'WITH UP TO THREE', run: () => openPage(game, 'online') }]
          : []),
        {
          id: 'test',
          label: 'TEST MODE',
          right: 'EVERYTHING UNLOCKED',
          run: () => a.newGame({ test: true, computer }),
        },
      ];
    },
  },
  main: {
    title: 'MENU',
    rows(game) {
      const a = game.actions;
      const state = game.state;
      // A hardcore run is saved only by the game itself, and cannot be copied to a file and brought back.
      const hard = state.hardcore ? 'NOT IN HARDCORE' : null;
      const noSave =
        noStorage(game) || (state.over ? 'THE SHIP IS LOST' : null) || (hard && 'HARDCORE SAVES ITSELF WHEN YOU DOCK');
      const quit = 'THE GAME IS LEFT AS IT WAS LAST SAVED  ·  CHOOSE AGAIN TO QUIT';
      return [
        { id: 'resume', label: 'BACK TO THE GAME', run: a.closeMenu },
        { id: 'save', label: 'SAVE GAME', right: noSave, off: !!noSave, run: () => openPage(game, 'save') },
        { id: 'load', label: 'LOAD GAME', right: hard, off: !!hard, run: () => openPage(game, 'load') },
        { id: 'sound', label: 'SOUND', run: () => openPage(game, 'sound') },
        { id: 'export', label: 'EXPORT THIS GAME TO A FILE', right: hard, off: !!hard, run: a.exportGame },
        // Online (F-040): the invitation, a pause for everyone by vote (R-1250), and leaving the room.
        ...(game.online && game.online.active()
          ? [
              { id: 'invite', label: 'INVITE', right: game.online.code || '', run: a.invite },
              { id: 'votepause', label: 'PAUSE FOR EVERYONE', right: 'THE OTHERS AGREE WITH P', run: a.votePause },
              { id: 'leaveroom', label: 'LEAVE THE ROOM', run: a.leaveOnline },
            ]
          : []),
        // A second screen for a TV or another screen beside this one (F-137). Not on a touch screen, where there is
        // no second screen to put it on.
        ...(game.keys && game.keys.touch
          ? []
          : [
              {
                id: 'viewer',
                label: 'SECOND SCREEN',
                right: game.viewerOpen && game.viewerOpen() ? 'OPEN  ·  Y SENDS YOUR VIEW' : 'A WINDOW FOR A TV',
                run: a.openViewer,
              },
            ]),
        ...fullscreenRow(),
        ...lightRow(),
        // The touch controls (F-090), for a player on a touch screen.
        ...(game.keys && game.keys.touch
          ? [{ id: 'touch', label: 'TOUCH CONTROLS', run: () => openPage(game, 'touch') }]
          : []),
        // Only a test game has this.
        ...(state.test
          ? [{ id: 'testing', label: 'TEST  ·  CALL IN SHIPS', run: () => openPage(game, 'testing') }]
          : []),
        { id: 'quit', label: 'QUIT TO THE TITLE SCREEN', confirm: quit, run: a.quit },
      ];
    },
  },
  save: {
    title: 'SAVE GAME',
    rows(game) {
      const overwrite = 'CHOOSE AGAIN TO SAVE OVER THIS ONE';
      return [...MANUAL.map((slot) => slotRow(game, slot, game.actions.save, true, overwrite)), back(game)];
    },
  },
  load: {
    title: 'LOAD GAME',
    rows(game) {
      const leave = game.view.started ? 'THE GAME YOU ARE IN IS LEFT  ·  CHOOSE AGAIN TO LOAD' : null;
      const slots = [AUTO, ...MANUAL].map((slot) => slotRow(game, slot, game.actions.load, false, leave));
      return [...slots, { id: 'import', label: 'IMPORT A SAVE FILE', run: game.actions.importGame }, back(game)];
    },
  },
  // What a test game can call in. Each is on a key too, so that it can be done without opening the menu.
  // Online play (F-040, docs/design/prototypes/online.html).
  online: {
    title: 'PLAY ONLINE',
    rows(game) {
      const a = game.actions;
      const latest = latestSlot(game.saves);
      return [
        { id: 'name', label: 'YOUR NAME', right: storedNameOf(game) || 'NOT SET', run: a.askName },
        { id: 'hostnew', label: 'NEW ROOM  ·  NEW GAME', run: () => a.hostOnline(false) },
        {
          id: 'hostsave',
          label: 'NEW ROOM  ·  CONTINUE',
          right: latest ? slotName(latest) : 'NO SAVED GAME',
          off: !latest,
          run: () => a.hostOnline(true),
        },
        { id: 'join', label: 'JOIN WITH A CODE', run: a.joinOnline },
        {
          id: 'privacy',
          label: 'ABOUT ONLINE PLAY',
          right: 'WHAT IS SENT',
          run: () => window.open('privacy.html', '_blank'),
        },
        back(game),
      ];
    },
  },
  testing: {
    title: 'TEST  ·  CALL IN SHIPS',
    rows(game) {
      const call = (id, label, key) => ({ id, label, right: 'KEY ' + key, run: () => game.actions.summon(id) });
      return [
        call('fighters', 'THREE PIRATE FIGHTERS', 7),
        call('gunboat', 'A PIRATE GUNBOAT AND A FIGHTER', 8),
        call('raid', 'A RAID ON A STATION', 9),
        call('clear', 'REMOVE ALL PIRATES', 0),
        { id: 'cruiser', label: 'THE PIRATE CRUISER', run: () => game.actions.summon('cruiser') },
        { id: 'traffic', label: 'FACTION TRAFFIC', run: () => game.actions.summon('traffic') },
        back(game),
      ];
    },
  },
  // Which posts the ship's computer may run in a new game (F-034, R-816, R-1112). It holds for the whole game.
  computer: {
    title: "SHIP'S COMPUTER",
    rows(game) {
      const c = game.view.menu.computer;
      const row = (post) => ({
        id: 'computer.' + post,
        label: post.toUpperCase(),
        right: c[post] ? 'MAY RUN IT' : 'NO',
        run: () => (c[post] = !c[post]),
      });
      return [row('captain'), row('gunner'), row('engineer'), back(game)];
    },
  },
  // The touch controls (F-090): how the Gunner aims (P6), how big the sticks are, and whether the buttons take taps
  // a good way round them (P7).
  touch: {
    title: 'TOUCH CONTROLS',
    rows(game) {
      const o = touchOptions();
      const AIMS = { A: 'DRAG ON SPACE', B: 'RIGHT STICK', C: 'TAP THE TARGET' };
      const SIZES = { S: 'SMALL', M: 'MEDIUM', L: 'LARGE' };
      const next = (list, v) => list[(list.indexOf(v) + 1) % list.length];
      return [
        {
          id: 'aim',
          label: 'GUNNER AIMS',
          right: AIMS[o.aim],
          run: () => setTouchOption('aim', next(['B', 'A', 'C'], o.aim)),
        },
        {
          id: 'size',
          label: 'STICKS',
          right: SIZES[o.size],
          run: () => setTouchOption('size', next(['S', 'M', 'L'], o.size)),
        },
        { id: 'big', label: 'BIGGER BUTTONS', right: o.big ? 'ON' : 'OFF', run: () => setTouchOption('big', !o.big) },
        back(game),
      ];
    },
  },
  sound: {
    title: 'SOUND',
    rows(game) {
      return [
        { id: 'effects', label: 'EFFECTS', slider: 'effects' },
        { id: 'music', label: 'MUSIC', slider: 'music' },
        { id: 'mute', label: 'ALL SOUND', right: isMuted() ? 'OFF' : 'ON', run: toggleMute },
        back(game),
      ];
    },
  },
};

// Every row of the current page with its place on the screen. Shared by drawing and clicking.
export function menuRows(game) {
  const page = PAGES[game.view.menu.page];
  const rows = page.rows(game);
  const y0 = game.view.started ? (VIEW_H - rows.length * STEP_Y) / 2 + 8 : 100;
  return rows.map((row, i) => ({ ...row, x: X, y: y0 + i * STEP_Y, w: W, h: ROW_H }));
}
// Every row of the current page by name. Used by the browser test.
export const menuButtons = (game) =>
  menuRows(game).map((r) => ({ name: 'menu.' + r.id, x: r.x, y: r.y, w: r.w, h: r.h }));
const over = (m, r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;

function choose(game, row) {
  const menu = game.view.menu;
  if (!row || row.off || !row.run) return;
  if (row.confirm && menu.confirm !== row.id) {
    menu.confirm = row.id;
    return;
  }
  menu.confirm = null;
  row.run();
}

// Keys, mouse and gamepad on a menu page.
export function menuInput(game) {
  const { keys, view } = game;
  const menu = view.menu;
  const rows = menuRows(game);
  const m = keys.mouse;
  const move = (dir) => {
    for (let n = 0; n < rows.length; n++) {
      menu.row = (menu.row + dir + rows.length) % rows.length;
      if (!rows[menu.row].off) break;
    }
    menu.confirm = null;
  };
  const hovered = rows.findIndex((r) => over(m, r));
  if (hovered >= 0 && !rows[hovered].off && (m.moved || m.clicked) && hovered !== menu.row) {
    menu.row = hovered;
    menu.confirm = null;
  }
  if (keys.hit('ArrowUp', 'KeyW')) move(-1);
  if (keys.hit('ArrowDown', 'KeyS')) move(1);
  const row = rows[menu.row];
  if (row && row.slider) {
    const step = (keys.hit('ArrowRight', 'KeyD') ? 0.1 : 0) - (keys.hit('ArrowLeft', 'KeyA') ? 0.1 : 0);
    if (step) setVolume(row.slider, volumeOf(row.slider) + step);
    if (m.clicked && hovered === menu.row && m.x >= SLIDER.x - 4) {
      setVolume(row.slider, (m.x - SLIDER.x) / SLIDER.w);
    }
  }
  if (keys.hit('Enter', 'NumpadEnter', 'Space') || (m.clicked && hovered === menu.row)) choose(game, row);
  if (!view.started && keys.hit('KeyT')) game.actions.newGame({ test: true });
  if (keys.hit('Escape', 'Backspace', 'KeyO')) {
    if (menu.page !== rootOf(game)) openPage(game, rootOf(game));
    else if (view.started) game.actions.closeMenu();
  }
}

export function drawMenu(game, t) {
  const { ctx, view } = game;
  const font = game.assets.font;
  const menu = view.menu;
  const page = PAGES[menu.page];
  const rows = menuRows(game);
  const top = rows[0].y;
  const bottom = rows[rows.length - 1].y + ROW_H;
  if (view.started) {
    // In the game the menu is a panel on top of whatever the player was looking at.
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    rect(ctx, X - 14, top - 34, W + 28, bottom - top + 66, COL.panel, COL.steel[1]);
  } else {
    font.draw(ctx, 'CRITICAL ST8', VIEW_W / 2, 26, COL.text, { align: 'c', scale: 5 });
    font.draw(ctx, 'ONE SHIP  ·  THREE POSTS  ·  A NEW STAR MAP EVERY GAME', VIEW_W / 2, 68, COL.ion[1], {
      align: 'c',
    });
  }
  if (page.title) font.draw(ctx, page.title, X, top - 20, COL.ochre[2]);
  rows.forEach((row, i) => {
    const picked = i === menu.row;
    const asking = picked && menu.confirm === row.id;
    const ink = row.off ? COL.faint : picked ? COL.white : COL.text;
    rect(
      ctx,
      row.x,
      row.y,
      row.w,
      row.h,
      picked ? '#1c2140' : '#141420',
      asking ? COL.ember[1] : picked ? COL.ochre[2] : COL.line,
    );
    font.draw(ctx, row.label, row.x + 8, row.y + 5, ink);
    if (row.slider) {
      const v = volumeOf(row.slider);
      bar(ctx, SLIDER.x, row.y + 5, SLIDER.w, v, picked ? COL.ochre[2] : COL.steel[2]);
      font.draw(ctx, Math.round(v * 100) + '%', row.x + row.w - 8, row.y + 5, ink, { align: 'r' });
    } else if (row.right)
      font.draw(ctx, row.right, row.x + row.w - 8, row.y + 5, row.off ? COL.faint : COL.dim, { align: 'r' });
  });
  // One line below the rows: a question to confirm, a message, or how to work the menu.
  const row = rows[menu.row];
  const asking = row && menu.confirm === row.id;
  const sliding = row && row.slider;
  const hint = sliding ? 'LEFT AND RIGHT CHANGE THE LEVEL' : 'ARROWS AND ENTER, OR THE MOUSE';
  const line = asking
    ? row.confirm
    : menu.note || hint + (menu.page === 'title' ? '  ·  H  CONTROLS' : '  ·  ESC  BACK');
  font.draw(ctx, line, VIEW_W / 2, bottom + 12, asking ? COL.ember[2] : menu.note ? COL.ochre[2] : COL.faint, {
    align: 'c',
  });
  if (!view.started) {
    const later = knownAvailable() ? 'EARLY VERSION' : 'EARLY VERSION  ·  ONLINE PLAY COMES LATER';
    font.draw(ctx, later, VIEW_W / 2, 344, COL.faint, { align: 'c' });
    void t;
  }
}
