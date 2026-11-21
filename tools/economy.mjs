// The economy sheet (D-221): every price and reward, read from the game's own code, and a simulated player who
// plays through an hour, so that the balance can be judged with numbers instead of guesses.
//
//   node tools/economy.mjs        writes docs/economy.md
//
// The simulated player uses the game where it can: real systems of a real world with their real distances, real
// wrecks with the loot that is really in them, the real pace and size of the pirate waves (none in the
// sanctuary), and the real prices. What the game
// cannot answer, such as how long a person takes over a lock, is an assumption in ASSUME below, and the sheet
// lists them. tests/economy.test.js checks that the sheet is up to date and that the income stays in its band.
import { writeFileSync } from 'node:fs';
import { createState } from '../src/sim/state.js';
import { SIZES, SIZE_NAMES } from '../src/sim/world.js';
import { generateSector } from '../src/sim/sectors.js';
import { createInterior } from '../src/sim/boarding.js';
import { thingsOf } from '../src/sim/things.js';
import { CATALOG, levelPrice, forBuyer } from '../src/sim/upgrades.js';
import { ROLE_NAME } from '../src/sim/purses.js';
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
    '| Sak | Flik | Betalas av | Plats | Pris | Nivåer |',
    '|---|---|---|---|---|---|',
  );
  for (const [id, c] of Object.entries(CATALOG)) {
    const payer = c.role ? ROLE_NAME[c.role] : 'den som köper';
    L.push(`| ${c.name} | ${c.tab} | ${payer} | ${c.slot || '–'} | ${c.price} | ${c.levels || 1} |`);
  }
  L.push(
    '',
    '### Tjänster på stationer',
    '',
    'Fristaden tar samma priser som en neutral bas (R-1091). Bränslet är gratis bara på ett eget varv. Varje roll har en egen kassa som får hela inkomsten (R-1103, R-1104). Tjänsterna vid disken betalas av den som beställer, ur den egna kassan (R-1121). Delar hamnar i förrådet och installeras gratis på ett varv (R-1135, R-1138), och en sålt del ger hälften tillbaka, tre fjärdedelar på en egen bas (R-1139).',
    '',
    '| Tjänst | Eget varv | Vänlig | Neutral och fristaden |',
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
    `- Försvar (sköld, kanoner, säkerhet inuti), per nivå: ${B.DEFENSE_PRICE.join(', ')} krediter, betalt ur stationens egen kassa (R-1115).`,
    `- En egen station ger var ${B.STATION_INCOME_EVERY}:e sekund ${B.STATION_INCOME.station} krediter till sin egen kassa och ${B.STATION_INCOME.crew} till varje rolls kassa (R-1116), alltså ${(3600 / B.STATION_INCOME_EVERY) * B.STATION_INCOME.crew} i timmen per roll. Första försvarsnivån går att köpa efter ${Math.ceil(B.DEFENSE_PRICE[0] / B.STATION_INCOME.station)} minuter.`,
    `- Prissumma från en fri station: ${B.BOUNTY} krediter, eller försvinner efter ${B.BOUNTY_GROUPS} besegrade grupper bounty hunters. Den som står vid disken betalar ur sin egen kassa (R-1117).`,
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
    // Side missions (D-073, R-1253): paid to every purse, preliminary values (SU3).
    ...['cargo', 'bounty', 'rescue'].map(
      (k) =>
        `| Sidouppdrag: ${{ cargo: 'frakt', bounty: 'prisjakt', rescue: 'räddning' }[k]} | ${B.JOBS.base[k]} + ${B.JOBS.perHop} per hopp + ${B.JOBS.perTier} per farlighetsnivå, ${B.JOBS.pay[0]}–${B.JOBS.pay[1]} | ${B.JOBS.timedPay} gånger så mycket med tidsgräns; inget och −${B.JOBS.standing.failed} anseende om tiden går ut |`,
    ),
  );
  return L;
}

// ---------- the world ----------
// What a world holds, counted over a few worlds of each size, as new games make them.
const WORLD_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
function worldSheet() {
  const L = [
    '## 3. Världen',
    '',
    `Räknat över ${WORLD_SEEDS.length} världar av varje storlek, som nya spel gör dem. Ett hopp kostar ${B.JUMP_FUEL} bränsle, och en bränslecell ger ${B.CELL_FUEL}, alltså ett hopp. Full tank räcker till ${Math.floor(B.FUEL_MAX / B.JUMP_FUEL)} hopp.`,
    '',
    '| Storlek | System | Bebodda | Tomma | Omstridda | Piraternas | Stationer | Vrak | Pods | Hopp till slutet |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const size of Object.keys(SIZES)) {
    const sum = { systems: 0, lived: 0, empty: 0, contested: 0, pirate: 0, stations: 0, wrecks: 0, pods: 0, end: 0 };
    for (const seed of WORLD_SEEDS) {
      const w = createState(seed, { size }).sectors;
      sum.systems += w.length;
      sum.lived += w.filter((x) => x.kind !== 'empty').length;
      sum.empty += w.filter((x) => x.kind === 'empty').length;
      sum.contested += w.filter((x) => x.owner === 'contested').length;
      sum.pirate += w.filter((x) => x.owner === 'pirate').length;
      sum.stations += w.reduce((n, x) => n + x.plan.length, 0);
      sum.wrecks += w.reduce((n, x) => n + x.wrecks, 0);
      sum.pods += w.reduce((n, x) => n + x.pods, 0);
      sum.end += w.find((x) => x.boss).hops;
    }
    const k = (v) => Math.round((v / WORLD_SEEDS.length) * 10) / 10;
    L.push(
      `| ${SIZE_NAMES[size]} | ${k(sum.systems)} | ${k(sum.lived)} | ${k(sum.empty)} | ${k(sum.contested)} | ${k(sum.pirate)} | ${k(sum.stations)} | ${k(sum.wrecks)} | ${k(sum.pods)} | ${k(sum.end)} |`,
    );
  }
  L.push(
    '',
    `Vrak och pods är de som finns när man först kommer till ett system. Vrak är en bonus (R-1097): inga i fristaden, flest där piraterna håller systemet. Inga nya vrak driver in när ett har sprängts. Kommer man tillbaka till ett system efter minst ${B.WRECK_RETURN_TIME} sekunder kan ett nytt ligga där, med chansen ${B.WRECK_RETURN_CHANCE.pirate} där piraterna håller systemet, ${B.WRECK_RETURN_CHANCE.contested} i ett omstritt och ${B.WRECK_RETURN_CHANCE.other} annars. En nedskjuten gunboat eller ett fraktskepp lämnar vrak med chansen ${B.KILL_WRECK_CHANCE}. Ett vrak har en bränslecell med chansen ${B.WRECK_CELL_CHANCE}, en station har en i valvet. Slutet nås bara när man har dess stjärnkarta från valvet på en piratbas.`,
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
// The sanctuary has no pirate waves and no distress calls.
export function simulateHour(sector, players, seed = 1) {
  const state = createState(seed);
  if (sector !== 0) {
    state.sector = sector;
    generateSector(state, sector);
  }
  const tier = state.sectors[sector].tier;
  const calm = state.sectors[sector].kind === 'sanctuary';
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
  let at = thingsOf(state, 'station').find((s) => s.home || s.sanctuary) || state.ship;
  const targets = [...thingsOf(state, 'wreck'), ...thingsOf(state, 'pod')];
  // A wreck that has been boarded blows up, and no new one takes its place (R-1097). A wreck that a shot-down
  // gunboat leaves now and then is not counted.
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
    while (!calm && nextWave <= Math.min(t, 3600)) {
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
    // The nearest thing that is left.
    let next = null;
    for (const x of targets)
      if (!x.done && (!next || dist(at.x, at.y, x.x, x.y) < dist(at.x, at.y, next.x, next.y))) next = x;
    if (!next) {
      // Nothing left to board: rocks are mined for the rest of the hour.
      const wait = Math.max(1, 3600 - t);
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
      const wreck = next;
      // One player stays on the ship when there are more of them. The others go aboard.
      const run = wreckRun(state, wreck, carry, Math.max(1, players - 1));
      t += run.time;
      credits += run.credits;
      income.vrak += run.credits;
      fuelIn += run.fuel;
      wrecks++;
    }
    next.done = true;
  }
  // The waves that came while the crew was mining at the end of the hour. Time spent fighting them is time not
  // spent mining.
  const mining = t;
  waves();
  mined = Math.max(0, mined - (t - mining) / ASSUME.mineEvery);
  // Rocks broken on the way, and distress calls, over the hour.
  const ore = (ASSUME.rocksPerHour + mined) * ASSUME.orePerRock * B.ORE_PRICE;
  const raids = calm ? 0 : (3600 / avg(B.RAID_GAP)) * ASSUME.raidsHelped * B.RAID_REWARD;
  credits += ore + raids;
  income.malm = ore;
  income.nödanrop = raids;
  return { credits, income, kills, wrecks, pods, fuelIn, fuelOut, tier, system: state.sectors[sector].name };
}

// The places the simulated player spends an hour in, in the first world of the smallest size: the sanctuary, an
// inhabited system next to it, one at danger level 2 and an empty one, alone, and the one next door with three.
const FIRST_HOUR_SANCTUARY = 0.25;
export function places() {
  const w = createState(1).sectors;
  const next = w.find((x) => x.kind === 'inhabited' && x.hops === 1) || w.find((x) => x.hops === 1);
  const deep = w.find((x) => x.kind === 'inhabited' && x.tier === 2) || w.find((x) => x.tier >= 1);
  const empty = w.find((x) => x.kind === 'empty' && x.wrecks > 0) || w.find((x) => x.kind === 'empty');
  return [
    ['Ensam, fristaden', 0, 1],
    [`Ensam, grannsystem (nivå ${next.tier})`, next.id, 1],
    [`Ensam, bebott system på nivå ${deep.tier}`, deep.id, 1],
    [`Ensam, tomt system (nivå ${empty.tier})`, empty.id, 1],
    [`Tre spelare, grannsystem (nivå ${next.tier})`, next.id, 3],
  ];
}

// What a player alone earns in the first hour: a quarter of an hour in the sanctuary, as the time budget has
// it, and then out in the inhabited system next door.
export function firstHourIncome() {
  const [sanctuary, next] = places();
  const a = simulateHour(sanctuary[1], 1).credits;
  const b = simulateHour(next[1], 1).credits;
  return a * FIRST_HOUR_SANCTUARY + b * (1 - FIRST_HOUR_SANCTUARY);
}

// When each purchase in a plain order could be afforded, at the income of the first hour.
// Every role has its own purse, and each gets all the income (R-1104), so each role buys its own things in its
// own time. Fuel, counted as one jump every ten minutes, is paid by the roles in turn.
// Each role starts with one hull slot and one system slot (R-1178), so the plan buys a slot before a part that
// would need one more.
const BUYS = {
  captain: ['tank', 'alarm', 'slotS_captain', 'jumpcoil', 'sysradar', 'tank', 'slotS_captain', 'boost'],
  gunner: ['nose', 'slotH_gunner', 'twin', 'tcomp', 'slotH_gunner', 'rockets', 'pack'],
  engineer: ['scanner', 'armor', 'slotH_engineer', 'pd', 'slotS_engineer', 'emit', 'flare'],
};
const FUEL_PER_HOUR = 6 * B.JUMP_FUEL * B.FUEL_PRICE.neutral;
function purchases(perHour) {
  const out = [];
  for (const [role, order] of Object.entries(BUYS)) {
    // The crew takes turns at buying fuel (R-1121): each role pays a third of it.
    const left = perHour - FUEL_PER_HOUR / 3;
    let spent = 0;
    const times = {};
    for (const plain of order) {
      // Boarding gear is the role's own (F-235).
      const id = forBuyer(plain, role);
      const k = times[id] || 0;
      times[id] = k + 1;
      spent += levelPrice(id, k);
      const name = CATALOG[id].name + (k ? '  LV ' + (k + 1) : '');
      out.push({ role: ROLE_NAME[role], name, at: Math.round((spent / left) * 60) });
    }
  }
  return out;
}

export function buildSheet() {
  const L = [
    '# Ekonomin (D-221)',
    '',
    '**Skapad ur koden av `node tools/economy.mjs`. Ändra inte för hand.** Ett test säger till när bladet inte längre stämmer med koden, och när inkomsten flyttar sig utanför sitt band.',
    '',
  ];
  L.push(...priceSheet());
  L.push('', ...worldSheet());
  const runs = places().map(([name, sector, players]) => ({ name, ...simulateHour(sector, players) }));
  // The first hour: a quarter of an hour in the sanctuary, as the time budget has it, and then out next door.
  const firstHour = firstHourIncome();
  L.push(
    '',
    '## 4. En timme med den simulerade spelaren',
    '',
    'Spelaren flyger till närmaste vrak eller pod, bryter upp låset, bär hem lootet i vändor och skjuter ner varje piratvåg som kommer. Vraken är de som finns i systemet när man kommer. Ett bordat vrak sprängs, och inget nytt driver in, som i spelet. Vrak som nedskjutna gunboats ibland lämnar räknas inte. När det inte finns något kvar att borda bryts asteroider resten av timmen. Ensam avbryter en strid allt annat. Med fler spelare stannar någon på skeppet och slåss medan de andra bordar. Allt räknas med spelets egna avstånd, loot, vågor och priser.',
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
    `Världen är den första av storleken ${SIZE_NAMES.short} (frö 1). Timmen spelas i ett och samma system, så hopp mellan system räknas inte här, se avsnitt 3 för vad de kostar.`,
    '',
    '### Hur länge det dröjer till varje köp, ensam den första timmen',
    '',
    `Den första timmen räknas som en kvart i fristaden och resten i ett bebott grannsystem: ${Math.round(firstHour)} krediter. Varje roll har en egen kassa som får hela inkomsten (R-1104), och köper sitt i en enkel ordning. Bränslet, räknat som ett hopp var tionde minut (${FUEL_PER_HOUR} krediter i timmen), betalas av rollerna i tur och ordning, alltså en tredjedel var. Tiden är minuter från start.`,
    '',
    '| Roll | Köp | Minuter |',
    '|---|---|---|',
    ...purchases(firstHour).map((p) => `| ${p.role} | ${p.name} | ${p.at} |`),
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
