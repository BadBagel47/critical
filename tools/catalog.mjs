// The content catalogue (D-223): everything there is in the game with its most important numbers, read from the
// game's own code, so that the overview always matches the game.
//
//   node tools/catalog.mjs        writes docs/catalog.md
//
// tests/catalog.test.js says when the catalogue no longer matches the code. Prices and incomes are worked through
// in the economy sheet (docs/economy.md, tools/economy.mjs); here they are only listed.
import { writeFileSync } from 'node:fs';
import { createState } from '../src/sim/state.js';
import { SHIPS, HULLS, BASE } from '../src/sim/kinds.js';
import { GUARD_KINDS, KINDS_AT } from '../src/sim/guards.js';
import { FACTIONS } from '../src/sim/sides.js';
import { CATALOG, levelPrice, levelsOf, MAX_SLOTS } from '../src/sim/upgrades.js';
import { ROLE_NAME } from '../src/sim/purses.js';
import { PIPE_GRID } from '../src/sim/breakin.js';
import { layOut } from '../src/sim/layout.js';
import { RADIUS, DECK_NAMES } from '../src/sim/base.js';
import { B } from '../src/sim/balance.js';
import { GUNS_AT, OTHERS_GUNS } from '../src/sim/stations.js';

const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join(
    '\n',
  );
const num = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100).replace('.', ','));
const yes = (v) => (v ? 'ja' : '–');

function ships() {
  const rows = Object.entries(SHIPS).map(([id, c]) => [
    `${c.name} (${id})`,
    num(c.hp) + (c.tierHp ? ', mer längre ut' : ''),
    num(c.speed),
    c.dmg ? num(c.dmg) + (c.burst ? ` × ${c.burst}` : '') : '–',
    c.bounty ? num(c.bounty) : '–',
    yes(c.leavesWreck),
    c.boss ? 'bossen' : '',
  ]);
  return [
    '## Skeppsklasser',
    '',
    'Skepp utom besättningens fregatt (`SHIPS` i `src/sim/kinds.js`). Liv och skada i spelets enheter, fart i punkter per sekund.',
    '',
    table(['Skepp', 'Liv', 'Fart', 'Skada per skott', 'Belöning', 'Lämnar vrak', ''], rows),
  ];
}

function wrecks() {
  const s = createState(1);
  const rows = Object.entries(HULLS).map(([id, h]) => {
    const plan = layOut(s, { kind: 'wreck', hull: id });
    return [id, h.ship ? SHIPS[h.ship].name : 'okänt skrov', `${h.risk[0]}–${h.risk[1]}`, `${plan.w} × ${plan.h}`];
  });
  return [
    '## Vrak',
    '',
    'Skroven som vrak finns i (`HULLS` i `src/sim/kinds.js`). Risken avgör vakter och lås, och insidans storlek är i rutor.',
    '',
    table(['Skrov', 'Från', 'Risk', 'Insidan'], rows),
  ];
}

function bases() {
  const plan = layOut(createState(1), { kind: 'station', heading: 0, shipyard: false });
  return [
    '## Baser',
    '',
    `Alla stationer är standardbaser (D-217): tre runda våningar, ${DECK_NAMES.map((n, i) => `${n} med radien ${num(RADIUS[i])} rutor`).join(', ')}. Insidan är ${plan.w} × ${plan.h} rutor med våningarna bredvid varandra. Utanpå är basen ${Math.round(BASE.ring[1] * 2)} punkter bred, med ${BASE.ports.length} portar på ringen, ${BASE.arms.length} lastarmar och ${BASE.guns.length} platser för kanontorn.`,
    '',
    table(
      ['', 'Värde'],
      [
        ['Skrov', num(B.STATION_HP)],
        ['Sköld', num(B.STATION_SHIELD) + `, +${num(B.DEFENSE_SHIELD * 100)} % per köpt nivå`],
        [
          'Kanontorn',
          `liv ${num(B.STATION_GUN_HP)}, skada ${num(B.STATION_GUN_DMG)} (pirater ${num(B.PIRATE_STATION_GUN_DMG)}), +${num(B.DEFENSE_GUN * 100)} % per köpt nivå`,
        ],
        ['Torn per köpt nivå (R-1208)', `${GUNS_AT.join(', ')}. Andra sidors baser har minst ${OTHERS_GUNS} (R-1207)`],
        ['Tunga torn på toppen', `${num(B.HEAVY_GUN_DMG)} gånger skadan`],
        ['Stor kanon (R-1164)', `${num(B.CANNON_PRICE)} krediter, ${num(B.CANNON_DMG)} gånger skadan`],
        ['Försvar i mainframen, per nivå', B.DEFENSE_PRICE.join(', ') + ' krediter (sköld, kanoner, säkerhet inne)'],
        [
          'Vakter (R-1182)',
          `en per ${B.GUARD_AREA} rutor golv i lockdown och larm, en per ${B.GUARD_AREA_CALM} i lugnt läge`,
        ],
        ['Larmljus (R-1182)', `ett per ${B.BEACON_AREA} rutor golv`],
        [
          'Trycket efter strömmen (R-1168)',
          `steg efter ${B.PRESSURE.join(', ')} sekunder, ${B.DRONE_WAVE} drönare och högst ${B.DRONE_MAX}, hjälp efter ${B.RELIEF_TIME} sekunder med ${B.RELIEF_GUARDS} vakter`,
        ],
      ],
    ),
  ];
}

function guards() {
  const where = (k) =>
    Object.entries(KINDS_AT)
      .filter(([, list]) => list.includes(k))
      .map(([at]) => ({ wreck: 'vrak', pirate: 'piratbaser', other: 'andra baser' })[at])
      .join(', ');
  const rows = Object.entries(GUARD_KINDS).map(([id, g]) => [
    g.name,
    num(g.hp * B.GUARD_HP),
    num(g.speed),
    num(g.dmg),
    num(g.notice),
    g.cover ? 'ja' : 'nej',
    g.sleep ? num(g.sleep) : 'nej',
    num(g.from),
    where(id),
    [g.rouses && 'väcker alla', g.mends && 'lagar turrets'].filter(Boolean).join(', '),
  ]);
  return [
    '## Vakter',
    '',
    'Vakternas sorter (`GUARD_KINDS` i `src/sim/guards.js`). Fart, skada och tid att märka någon är andelar av en vanlig vakt; mindre tid att märka är snabbare. "Från fara" är hur farligt stället och systemet måste vara.',
    '',
    table(['Vakt', 'Liv', 'Fart', 'Skada', 'Märker', 'Tar skydd', 'Sover av dart', 'Från fara', 'Finns i', ''], rows),
  ];
}

function sides() {
  const rows = Object.entries(FACTIONS).map(([id, f]) => [f.name, id, f.about]);
  rows.push(['PIRATES', 'pirate', 'Alltid fiender. Håller de yttersta systemen och slutet']);
  rows.push(['BOUNTY HUNTERS', 'hunter', 'Kommer när en fri station satt en prissumma på besättningen']);
  return ['## Sidor', '', table(['Namn', 'Id', 'Vad'], rows)];
}

function weapons() {
  return [
    '## Fregattens vapen',
    '',
    table(
      ['Vapen', 'Skada', 'Takt'],
      [
        [
          'PULSE (startkanonen och tornen)',
          `${num(B.BOLT_DMG)}, vingtornen ${num(B.WING_BOLT_DMG)}`,
          `ett skott per ${num(B.FIRE_INTERVAL)} sekunder`,
        ],
        ['HEAVY LASER', num(B.HEAVY_DMG), `laddas i ${num(B.HEAVY_CHARGE)} sekunder`],
        ['ROCKET PODS', '–', `${B.ROCKET_LOAD} raketer, en per ${num(B.ROCKET_INTERVAL)} sekunder`],
      ],
    ),
  ];
}

function upgrades() {
  const TABS = { hull: 'Delar på skrovet', system: 'System', armory: 'Bordarnas utrustning' };
  const out = [
    '## Uppgraderingar och utrustning',
    '',
    `Allt som köps (\`CATALOG\` i \`src/sim/upgrades.js\`). Varje roll har högst ${MAX_SLOTS} platser av varje sort. Priset är för första nivån och, där det finns fler, den sista.`,
  ];
  for (const [tab, title] of Object.entries(TABS)) {
    const rows = Object.entries(CATALOG)
      .filter(([, c]) => c.tab === tab)
      .map(([id, c]) => {
        const n = levelsOf(id);
        const price =
          n > 1
            ? `${Math.round(levelPrice(id, 0))}–${Math.round(levelPrice(id, n - 1))}`
            : String(Math.round(levelPrice(id, 0)));
        return [c.name, c.role ? ROLE_NAME[c.role] : 'den som köper', c.slot || '–', String(n), price, c.desc || ''];
      });
    out.push('', `### ${title}`, '', table(['Sak', 'Betalas av', 'Plats', 'Nivåer', 'Pris', 'Vad'], rows));
  }
  return out;
}

function locks() {
  return [
    '## Lås',
    '',
    table(
      ['Lås', 'Var', 'Hur', 'Siffror'],
      [
        [
          'pipes',
          'vrak',
          'vrid rören så att strömmen når låset',
          `rutnät ${PIPE_GRID.slice(1)
            .map((g) => g.join(' × '))
            .join(
              ', ',
            )} efter risk, tid ${B.BREAKIN_TIME.slice(1).join(', ')} sekunder. ${B.LOCK_FAILS_BLOW} misslyckanden spränger vraket`,
        ],
        [
          'code',
          'baser',
          'Engineer hittar koden siffra för siffra, och någon slår in den vid låset',
          `${B.CODE_LEN} siffror av ${B.CODE_DIGITS}, ${B.CODE_TIME} sekunder`,
        ],
        [
          'dial',
          'containrar',
          'stoppa nålen i märket',
          `${B.DIAL_STAGES} gånger, ${B.DIAL_TIME} sekunder, ${B.DIAL_MISSES} missar`,
        ],
      ],
    ),
  ];
}

export function buildCatalog() {
  return [
    '# Innehållskatalog',
    '',
    'Allt som finns i spelet med sina viktigaste siffror (D-223). Skapad ur koden med `npm run catalog`: ändra inte här för hand, utan i koden, och kör kommandot igen. `tests/catalog.test.js` säger till när katalogen inte stämmer med koden. Priser och inkomster räknas igenom i ekonomibladet, docs/economy.md.',
    '',
    ...ships(),
    '',
    ...wrecks(),
    '',
    ...bases(),
    '',
    ...guards(),
    '',
    ...sides(),
    '',
    ...weapons(),
    '',
    ...upgrades(),
    '',
    ...locks(),
    '',
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('catalog.mjs')) {
  writeFileSync(new URL('../docs/catalog.md', import.meta.url), buildCatalog());
  console.log('docs/catalog.md written');
}
