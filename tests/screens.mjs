// Screenshots of fixed scenes, compared with the ones kept in tests/screens/ (F-226). The game is opened with
// ?still, which keeps it the same every time, so that a picture only changes when the game does.
// Start a static server in the repo root first (npm run serve), then:
//   node tests/screens.mjs            compare, and say which scenes have changed
//   node tests/screens.mjs --update   keep the new pictures as the ones to compare with
// Commit the kept pictures with the change that made them, so that the change shows them before and after.
// Changed scenes are also written, with a picture of what differs, to the folder given by SCREENS_OUT (or a
// folder in the system's temporary folder).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:8080/';
const update = process.argv.includes('--update');
const kept = new URL('./screens/', import.meta.url).pathname;
const out = process.env.SCREENS_OUT || join(tmpdir(), 'critical-screens');
mkdirSync(kept, { recursive: true });
mkdirSync(out, { recursive: true });

// Each scene: where it starts, what is set up, and how many frames are drawn before the picture is taken.
const SCENES = [
  { name: 'title', query: '?still', frames: 30 },
  { name: 'captain', query: '?still&test', frames: 90 },
  { name: 'star', query: '?still&test&at=star', frames: 90 },
  { name: 'rocks', query: '?still&test&at=rocks', frames: 90 },
  {
    name: 'engineer',
    query: '?still&test',
    frames: 60,
    setup: () => {
      const c = window.__critical;
      c.state.players[0].post = 'engineer';
      c.view.engOpen = true;
    },
  },
  { name: 'map', query: '?still&test', frames: 60, setup: () => (window.__critical.view.panel = 'map') },
  { name: 'stars', query: '?still&test', frames: 60, setup: () => (window.__critical.view.panel = 'stars') },
  {
    name: 'station-floor',
    query: '?still&test',
    frames: 60,
    setup: () => {
      const c = window.__critical,
        s = c.state;
      const st = c.stations.find((x) => x.side === 'charter');
      s.ship.x = st.x;
      s.ship.y = st.y + 140;
      s.ship.docked = st.id;
      c.board();
      // At a desk, with the staff rooms and their doors near by.
      const it = st.interior,
        d = it.desks[0];
      Object.assign(it.avatars[0], { x: d.x, y: d.y + 14 });
    },
  },
  {
    name: 'shop',
    query: '?still&test',
    frames: 60,
    setup: () => {
      const c = window.__critical,
        s = c.state;
      const st = c.stations.find((x) => x.home);
      s.ship.x = st.x;
      s.ship.y = st.y + 140;
      s.ship.docked = st.id;
      c.board();
      c.view.panel = 'shop';
      Object.assign(c.view.shop, { mode: 'shop', role: 'all', cat: 'all', sel: 'tank', scroll: 0 });
      s.ship.mods.tank = 2;
      s.ship.owned.tank = 2;
    },
  },
  {
    name: 'shipyard',
    query: '?still&test',
    frames: 60,
    setup: () => {
      const c = window.__critical,
        s = c.state;
      const st = c.stations.find((x) => x.home);
      s.ship.x = st.x;
      s.ship.y = st.y + 140;
      s.ship.docked = st.id;
      c.board();
      c.view.panel = 'shop';
      Object.assign(c.view.shop, { mode: 'yard', slot: { role: 'gunner', kind: 'hull', i: 0 } });
    },
  },
  {
    name: 'hostile-inside',
    query: '?still&test',
    frames: 60,
    setup: () => {
      const c = window.__critical,
        s = c.state;
      const st = c.stations.find((x) => x.side === 'pirate');
      st.lock = 'open';
      s.ship.x = st.x;
      s.ship.y = st.y + 140;
      s.ship.docked = st.id;
      c.board();
      // At the mainframe, furthest in, where the rooms have things in them.
      const it = st.interior;
      Object.assign(it.avatars[0], { x: it.mainframe.x, y: it.mainframe.y + 14 });
    },
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// How many pixels differ clearly between two pictures, worked out in the browser, with a picture of where.
async function compare(a, b) {
  return page.evaluate(
    async ([a, b]) => {
      const load = (src) =>
        new Promise((ok) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { share: 1, diff: null };
      const cv = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return { c, g, d: g.getImageData(0, 0, img.width, img.height) };
      };
      const A = cv(ia),
        Bc = cv(ib);
      const out = A.g.createImageData(ia.width, ia.height);
      let n = 0;
      for (let i = 0; i < A.d.data.length; i += 4) {
        const diff =
          Math.abs(A.d.data[i] - Bc.d.data[i]) +
          Math.abs(A.d.data[i + 1] - Bc.d.data[i + 1]) +
          Math.abs(A.d.data[i + 2] - Bc.d.data[i + 2]);
        const changed = diff > 30;
        if (changed) n++;
        out.data[i] = changed ? 255 : Bc.d.data[i] / 4;
        out.data[i + 1] = changed ? 40 : Bc.d.data[i + 1] / 4;
        out.data[i + 2] = changed ? 40 : Bc.d.data[i + 2] / 4;
        out.data[i + 3] = 255;
      }
      A.g.putImageData(out, 0, 0);
      return { share: n / (ia.width * ia.height), diff: A.c.toDataURL('image/png') };
    },
    [a, b],
  );
}
const dataUrl = (buf) => 'data:image/png;base64,' + buf.toString('base64');

const changed = [];
for (const scene of SCENES) {
  await page.goto(base + scene.query);
  await page.waitForFunction(() => window.__critical && window.__critical.frames > 5, null, { timeout: 15000 });
  if (/test/.test(scene.query) || scene.setup) {
    // A scene that needs the game going starts it here, as a test game does by itself.
    if (scene.setup) await page.evaluate(scene.setup);
  }
  const at = await page.evaluate(() => window.__critical.frames);
  await page.waitForFunction((n) => window.__critical.frames >= n, at + scene.frames, { timeout: 30000 });
  const shot = await page.screenshot();
  const file = join(kept, scene.name + '.png');
  if (update || !existsSync(file)) {
    writeFileSync(file, shot);
    console.log(`  kept    ${scene.name}`);
    continue;
  }
  const { share, diff } = await compare(dataUrl(readFileSync(file)), dataUrl(shot));
  // A thousandth of the picture is allowed to differ, for the smoothing of the browser.
  if (share > 0.001) {
    changed.push(scene.name);
    writeFileSync(join(out, scene.name + '.png'), shot);
    if (diff) writeFileSync(join(out, scene.name + '-diff.png'), Buffer.from(diff.split(',')[1], 'base64'));
    console.log(`  changed ${scene.name}  ${(share * 100).toFixed(2)}% of the picture`);
  } else console.log(`  same    ${scene.name}`);
}
await browser.close();
if (errors.length) {
  console.log('\nERRORS\n' + errors.join('\n'));
  process.exit(1);
}
if (changed.length) {
  console.log(
    `\n${changed.length} scenes changed: ${changed.join(', ')}. The new pictures and what differs are in ${out}.`,
  );
  console.log('Run with --update to keep them, and commit them with the change.');
  process.exit(2);
}
console.log('\nno scene has changed');
