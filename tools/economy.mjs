// The economy sheet (D-221): every price and reward, read from the game's own code, and a simulated player who
// plays through an hour, so that the balance can be judged with numbers instead of guesses.
//
//   node tools/economy.mjs        writes docs/economy.md
//
// The simulated player uses the game where it can: real sectors with their real distances, real wrecks with the
// loot that is really in them, the real pace and size of the pirate waves, and the real prices. What the game
// cannot answer, such as how long a person takes over a lock, is an assumption in ASSUME below, and the sheet
// lists them. tests/economy.test.js checks that the sheet is up to date and that the income stays in its band.
import { writeFileSync } from 'node:fs';
import { createState } from '../src/sim/state.js';
import { generateSector } from '../src/sim/sectors.js';
import { createInterior } from '../src/sim/boarding.js';
import { thingsOf } from '../src/sim/things.js';
import { CATALOG } from '../src/sim/upgrades.js';
import { SHIPS } from '../src/sim/kinds.js';
import { B } from '../src/sim/balance.js';
import { dist } from '../src/sim/util.js';

// What the simulated player is like where the game cannot say. Seconds unless said otherwise.
export const ASSUME = {
  lockWreck: 40, // to bypass the lock of a wreck
  lockPod: 20, // to stop the needle three times on a pod
  boardOverhead: 90, // to find the way in a dark wreck and deal with its guards, besides walking to the loot
  fightPerPirate: 8, // to shoot one pirate down
  raidsHelped: 0.5, // the share of distress calls the crew answers
  rocksPerHour: 20, // rocks broken on the way, besides those mined on purpose
  orePerRock: 1.75, // a large rock breaks into 7 pieces over three sizes; an average rock gives this much ore
  walkFactor: 1.4, // how much longer the way to a piece of loot is than a straight line
  mineEvery: 20, // seconds to break one rock on purpose, while there is nothing else to do
};

const avg = ([a, b]) => (a + b) / 2;
const cruise = (B.ACCEL * B.ENGINE_POWER[2]) / B.DRAG;

// ---------- the price sheet ----------
function priceSheet() {
  const L = [];
  L.push(
    '## 1. Priser',
    '',
    '### Uppgraderingar och utrustning',
    '',
    '| Sak | Flik | Plats | Pris | Nivåer |',
    '|---|---|---|---|---|',
  );
  for (const [id, c] of Object.entries(CATALOG)) {
    L.push(`| ${c.name} | ${c.tab} | ${c.slot || '–'} | ${c.price} | ${c.levels || 1} |`);
  }
  L.push(
    '',
    '### Tjänster på stationer',
    '',
    '| Tjänst | Hemma | Vänlig | Neutral |',
    '|---|---|---|---|',
    `| Bränsle, per enhet | ${B.FUEL_PRICE.home} | ${B.FUEL_PRICE.friendly} | ${B.FUEL_PRICE.neutral} |`,
    `| Lagning, per hullpoäng | ${B.REPAIR_PRICE.friendly} | ${B.REPAIR_PRICE.friendly} | ${B.REPAIR_PRICE.neutral} |`,
    `| Raket | ${B.ROCKET_PRICE.friendly} | ${B.ROCKET_PRICE.friendly} | ${B.ROCKET_PRICE.neutral} |`,
    `| Stjärnkarta | ${B.CHART_PRICE.friendly} | ${B.CHART_PRICE.friendly} | ${B.CHART_PRICE.neutral} |`,
    '',
    `En avvaktande station tar ${B.WARY_PRICE} gånger priset. En station som står i skuld efter ett nödanrop ger ${Math.round((1 - B.FAVOR_DISCOUNT) * 100)} procent rabatt i ${B.FAVOR_TIME} sekunder.`,
    '',
    '### Egna stationer och prissumma',
    '',
    `- Försvar (sköld, kanoner, säkerhet inuti), per nivå: ${B.DEFENSE_PRICE.join(', ')} krediter.`,
    `- Prissumma från en fri station: ${B.BOUNTY} krediter, eller försvinner efter ${B.BOUNTY_GROUPS} besegrade grupper bounty hunters.`,
  );
  L.push('', '## 2. Inkomster', '', '| Källa | Krediter | Annat |', '|---|---|---|');
  for (const [kind, c] of Object.entries(SHIPS)) {
    if (!c.bounty && !c.salvage.count && !c.salvage.chance) continue;
    const count = c.salvage.count ?? c.salvage.chance;
    const salvage = count ? `bärgningsgods ${count} st à ${c.salvage.value.join('–')}` : '';
    L.push(`| Pirat: ${c.name || kind} | ${c.bounty} i prispengar | ${salvage} |`);
  }
  L.push(
    `| Låda i ett vrak | ${B.CRATE_CREDITS.join('–')} | |`,
    `| Låda i ett valv | ${B.VAULT_CREDITS.join('–')} | |`,
    `| Bränslecell | – | ${B.CELL_FUEL} bränsle |`,
    `| Stjärnkarta man redan har | 60 | |`,
    `| Pod | ${B.POD_CREDITS.join('–')} | hälften av gångerna ${B.CELL_FUEL} bränsle |`,
    `| Malm, per bit | ${B.ORE_PRICE} | eller ${B.ORE_FUEL} bränsle |`,
    `| Hjälp vid nödanrop | ${B.RAID_REWARD} hos en vänlig | rabatt hos en neutral |`,
  );
  return L;
}

// ---------- the simulated player ----------
// The loot of a wreck as it really is, and how long it takes to bring it home in trips of `carry`.
function wreckRun(state, wreck, carry, boarders) {
  const it = createInterior(state, wreck);
  const e = it.airlocks[0];
  let credits = 0,
    fuel = 0,
    walk = 0;
  const loot = [...it.loot].sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y));
  for (let i = 0; i < loot.length; i += carry) {
    const trip = loot.slice(i, i + carry);
    const far = Math.max(...trip.map((l) => dist(l.x, l.y, e.x, e.y)));
    walk += (2 * far * ASSUME.walkFactor) / B.CREW_SPEED_FOOT;
    for (const l of trip) {
      if (l.type === 'crate') credits += l.value;
      if (l.type === 'cell') fuel += B.CELL_FUEL;
      if (l.type === 'chart') credits += 60;
    }
  }
  // More boarders carry more at once. Whatever is not home before the reactor goes is lost.
  const time = ASSUME.boardOverhead + walk / boarders;
  const limit = B.REACTOR_TIME[wreck.difficulty] || 150;
  const kept = Math.min(1, limit / time);
  return { credits: credits * kept, fuel: fuel * kept, time: Math.min(time, limit) + ASSUME.lockWreck };
}

// One hour of play in a sector, for a crew of `players`. Gives what came in and what went out, and when each of
// a list of purchases could be afforded.
export function simulateHour(sector, players, seed = 1) {
  const state = createState(seed);
  if (sector !== 0) {
    state.sector = sector;
    generateSector(state, sector);
  }
  const tier = state.sectors[sector].tier;
  const pace = B.PIRATE_PACE[Math.min(3, players)];
  const carry = B.CARRY_MAX;
  let t = 0,
    credits = 0,
    fuelIn = 0,
    fuelOut = 0,
    kills = 0,
    wrecks = 0,
    pods = 0;
  const income = { pirater: 0, vrak: 0, pods: 0, malm: 0, nödanrop: 0 };
  let at = thingsOf(state, 'station').find((s) => s.home) || state.ship;
  const targets = [...thingsOf(state, 'wreck'), ...thingsOf(state, 'pod')];
  // A wreck that has been boarded blows up when its reactor runs out, and then a new one drifts in somewhere
  // else, as long as there are fewer than three (see blowUp in boarding.js). These are the times they come.
  const coming = [];
  let mined = 0;
  let wave = 0,
    nextWave = B.FIRST_WAVE_DELAY * pace;
  const fly = (to) => {
    const d = dist(at.x, at.y, to.x, to.y);
    const s = d / cruise;
    t += s;
    fuelOut += s * B.FUEL_BURN * B.ENGINE_POWER[2];
    at = to;
  };
  // Pirate waves come on their own clock, whatever the crew is doing.
  const waves = () => {
    while (t >= nextWave && t < 3600) {
      wave++;
      const n = Math.min(1 + Math.floor(wave / 3) + (tier >= 2 ? 1 : 0), 4);
      const gunboat = tier >= 1 && wave >= 2 ? 0.2 + 0.12 * tier : 0;
      const kinds = [];
      for (let i = 0; i < n; i++) kinds.push(i === 0 && gunboat >= 0.5 ? 'gunboat' : 'fighter');
      for (const k of kinds) {
        const c = SHIPS[k];
        const salvage = (c.salvage.count ?? c.salvage.chance) * avg(c.salvage.value);
        credits += c.bounty + salvage;
        income.pirater += c.bounty + salvage;
        kills++;
      }
      // A gunboat in a mixed wave is counted as its share.
      if (gunboat > 0 && gunboat < 0.5) {
        const extra = (SHIPS.gunboat.bounty - SHIPS.fighter.bounty) * gunboat;
        credits += extra;
        income.pirater += extra;
      }
      // Alone, the fight stops everything else. With more on board, someone stays on the ship and fights while
      // the others go on.
      if (players === 1) t += n * ASSUME.fightPerPirate;
      nextWave += Math.max(B.WAVE_INTERVAL_MIN, B.WAVE_INTERVAL - wave * 1.2) * pace;
    }
  };
  while (t < 3600) {
    waves();
    // The nearest thing that is left, and when there is none, a new wreck drifts in further out.
    while (coming.length && coming[0] <= t) {
      coming.shift();
      const a = wrecks * 2.1;
      targets.push({ kind: 'wreck', x: at.x + Math.sin(a) * 1750, y: at.y - Math.cos(a) * 1750, fresh: true });
    }
    let next = null;
    for (const x of targets)
      if (!x.done && (!next || dist(at.x, at.y, x.x, x.y) < dist(at.x, at.y, next.x, next.y))) next = x;
    if (!next) {
      // Nothing to board: rocks are mined until the next wreck drifts in.
      const until = coming.length ? Math.min(coming[0], 3600) : 3600;
      const wait = Math.max(1, until - t);
      mined += wait / ASSUME.mineEvery;
      t += wait;
      continue;
    }
    fly(next);
    if (next.kind === 'pod') {
      t += ASSUME.lockPod;
      credits += avg(B.POD_CREDITS);
      income.pods += avg(B.POD_CREDITS);
      fuelIn += B.CELL_FUEL / 2;
      pods++;
    } else {
      const wreck = next.fresh ? thingsOf(state, 'wreck')[wrecks % thingsOf(state, 'wreck').length] : next;
      // One player stays on the ship when there are more of them. The others go aboard.
      const run = wreckRun(state, wreck, carry, Math.max(1, players - 1));
      coming.push(t + (B.REACTOR_TIME[wreck.difficulty] || 150));
      coming.sort((a, b) => a - b);
      t += run.time;
      credits += run.credits;
      income.vrak += run.credits;
      fuelIn += run.fuel;
      wrecks++;
    }
    next.done = true;
  }
  // Rocks broken on the way, and distress calls, over the hour.
  const ore = (ASSUME.rocksPerHour + mined) * ASSUME.orePerRock * B.ORE_PRICE;
  const raids = (3600 / avg(B.RAID_GAP)) * ASSUME.raidsHelped * B.RAID_REWARD;
  credits += ore + raids;
  income.malm = ore;
  income.nödanrop = raids;
  return { credits, income, kills, wrecks, pods, fuelIn, fuelOut, tier };
}

// When each purchase in a plain order could be afforded, at the income of the first hour.
function purchases(perHour) {
  const order = ['twin', 'pack', 'armor', 'emit', 'heavy', 'core', 'tranq', 'alarm', 'rockets', 'solar', 'pd', 'bay'];
  let spent = 0;
  return order.map((id) => {
    spent += CATALOG[id].price;
    return { name: CATALOG[id].name, at: Math.round((spent / perHour) * 60) };
  });
}

export function buildSheet() {
  const L = [
    '# Ekonomin (D-221)',
    '',
    '**Skapad ur koden av `node tools/economy.mjs`. Ändra inte för hand.** Ett test säger till när bladet inte längre stämmer med koden, och när inkomsten flyttar sig utanför sitt band.',
    '',
  ];
  L.push(...priceSheet());
  const runs = [
    ['Ensam, första sektorn', 0, 1],
    ['Ensam, The Narrows (nivå 2)', 3, 1],
    ['Tre spelare, första sektorn', 0, 3],
  ].map(([name, sector, players]) => ({ name, ...simulateHour(sector, players) }));
  L.push(
    '',
    '## 3. En timme med den simulerade spelaren',
    '',
    'Spelaren flyger till närmaste vrak eller pod, bryter upp låset, bär hem lootet i vändor och skjuter ner varje piratvåg som kommer. Ett bordat vrak sprängs när reaktorn har gått, och då driver ett nytt in längre ut, som i spelet. Finns inget att borda bryts asteroider. Ensam avbryter en strid allt annat. Med fler spelare stannar någon på skeppet och slåss medan de andra bordar. Allt räknas med spelets egna avstånd, loot, vågor och priser.',
    '',
    '| | ' + runs.map((r) => r.name).join(' | ') + ' |',
    '|---|' + runs.map(() => '---').join('|') + '|',
    '| Krediter per timme | ' + runs.map((r) => Math.round(r.credits)).join(' | ') + ' |',
    '| varav pirater | ' + runs.map((r) => Math.round(r.income.pirater)).join(' | ') + ' |',
    '| varav vrak | ' + runs.map((r) => Math.round(r.income.vrak)).join(' | ') + ' |',
    '| varav pods | ' + runs.map((r) => Math.round(r.income.pods)).join(' | ') + ' |',
    '| varav malm | ' + runs.map((r) => Math.round(r.income.malm)).join(' | ') + ' |',
    '| varav nödanrop | ' + runs.map((r) => Math.round(r.income.nödanrop)).join(' | ') + ' |',
    '| Nedskjutna pirater | ' + runs.map((r) => r.kills).join(' | ') + ' |',
    '| Vrak tömda | ' + runs.map((r) => r.wrecks).join(' | ') + ' |',
    '| Pods öppnade | ' + runs.map((r) => r.pods).join(' | ') + ' |',
    '| Bränsle in (celler) | ' + runs.map((r) => Math.round(r.fuelIn)).join(' | ') + ' |',
    '| Bränsle ut (flygning) | ' + runs.map((r) => Math.round(r.fuelOut)).join(' | ') + ' |',
    '',
    '### Hur länge det dröjer till varje köp, ensam i första sektorn',
    '',
    'Köpen görs i en enkel ordning, och tiden är minuter från start vid inkomsten ovan.',
    '',
    '| Köp | Minuter |',
    '|---|---|',
    ...purchases(runs[0].credits).map((p) => `| ${p.name} | ${p.at} |`),
    '',
    '### Antaganden',
    '',
    'Det spelet inte kan svara på är antaget. Ändra dem i `ASSUME` i `tools/economy.mjs` när provspel visar bättre siffror.',
    '',
    '| Antagande | Värde |',
    '|---|---|',
    ...Object.entries(ASSUME).map(([k, v]) => `| ${k} | ${v} |`),
    `| Marschfart (beräknad ur spelet) | ${Math.round(cruise)} punkter i sekunden |`,
  );
  return L.join('\n') + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('economy.mjs')) {
  writeFileSync(new URL('../docs/economy.md', import.meta.url), buildSheet());
  console.log('docs/economy.md written');
}
