// Puts together what is published on Cloudflare (DV2, 2026-11-20): the game's pages and files, as they are, in a
// folder of their own, with the commit they come from in version.txt so that a deploy can be checked.
//   node tools/site.mjs <folder> [commit]
// The game has no build step: this only copies. What is not part of the site (tests, tools, node_modules) stays out.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'dist';
const commit = process.argv[3] || 'local';
const root = new URL('../', import.meta.url).pathname;
const PARTS = ['index.html', 'playtest.html', 'privacy.html', 'viewer.html', 'src', 'assets', 'vendor', 'docs'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const part of PARTS) if (existsSync(join(root, part))) cpSync(join(root, part), join(out, part), { recursive: true });
writeFileSync(join(out, 'version.txt'), commit + '\n');
// The game on the Worker has rooms; the copy on GitHub Pages has not, and must not ask for them (F-040).
const page = join(out, 'index.html');
writeFileSync(page, readFileSync(page, 'utf8').replace('</head>', '  <meta name="critical-rooms" content="rooms" />\n  </head>'));
console.log(`site in ${out} (${commit})`);
