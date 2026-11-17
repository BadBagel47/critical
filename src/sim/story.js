// The story of a game (D-274, docs/proposal-missions.md): a chain of steps made anew for every game from its seed
// and its map. Not in the game yet: the mission tester (docs/design/prototypes/missions.html) and the tests use
// it, so that the stories can be read and judged before anything is built in the game.
//
//   - The main story has a skeleton of acts: a hook, an investigation, a twist, an escalation and a finale. The
//     acts are filled with generated steps (R-1209). The number of steps follows the size of the map: 8, 12 or 16
//     (R-1210), so that a big world does not feel empty.
//   - A step is one thing the crew does, in one place, for one reason. Each step says what it needs and what it
//     gives (a person to see, a shop, a wreck, a signal, a target, an item, the vault), and the next step needs
//     what the one before gave. That is what makes the story hang together (R-1211).
//   - One or two choices split the story, and every way leads to the end (R-1212).
//   - The same sort of step never comes twice in a row, and the steps move out to more dangerous systems as the
//     story goes on (R-1213).
//   - The crew can never get stuck: every step has a way out if something goes wrong (R-1214).
//
// The chain itself is made by the quest engine's core (src/quest/core.js), which knows nothing of this game. This
// file holds what is the game's own: the sorts of steps, where they happen, the people and the checks. The texts
// are in storytext.js. The story draws its own random numbers from the seed, so the game's own random numbers are
// left as they were.
import { FACTIONS, PIRATE } from './sides.js';
import { hopsFrom } from './world.js';
import { createSectors } from './sectors.js';
import { rand } from './util.js';
import { planChain, pathsOf as chainPaths, checkChain, pick as corePick } from '../quest/core.js';
import { PREMISES, LOSSES, VOICES, FALLBACKS, writeTexts } from './storytext.js';

export { PREMISES, FALLBACKS };

// How many steps the main story has for each size of map (R-1210), and how many choices split it (R-1212).
export const MAIN_STEPS = { short: 8, medium: 12, long: 16 };
export const CHOICES = { short: 1, medium: 2, long: 2 };

// The skeleton: one slot per step, in order. `act` is the part of the story, `kind` what may stand in the slot.
const slot = (act, kind = 'normal') => ({ act, kind });
const inv = (n) => Array.from({ length: n }, () => slot('investigation'));
const esc = (n) => Array.from({ length: n }, () => slot('escalation'));
export const SKELETON = {
  short: [
    slot('hook', 'start'),
    ...inv(1),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(2),
    slot('finale', 'end'),
  ],
  medium: [
    slot('hook', 'start'),
    ...inv(3),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(1),
    slot('escalation', 'choose'),
    ...esc(2),
    slot('finale', 'end'),
  ],
  long: [
    slot('hook', 'start'),
    ...inv(3),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(1),
    slot('escalation', 'choose'),
    ...esc(2),
    slot('twist', 'twist'),
    ...esc(3),
    slot('finale', 'end'),
  ],
};
export const ACT_NAMES = {
  hook: 'Krok',
  investigation: 'Utredning',
  twist: 'Vändning',
  escalation: 'Upptrappning',
  finale: 'Slut',
};

// The sorts of steps (R-1211). `needs` is what the crew must know or have, `gives` what the step can lead to,
// `place` where it happens, `minutes` about how long it takes once there, and `roles` who gets the most to do.
export const SORTS = {
  talk: {
    name: 'Prata',
    needs: 'person',
    gives: ['person', 'shop', 'wreck', 'signal', 'target', 'item', 'vault'],
    place: 'bar',
    minutes: 3,
    roles: ['captain'],
  },
  acquire: {
    name: 'Skaffa',
    needs: 'shop',
    gives: ['item'],
    place: 'shop',
    minutes: 4,
    roles: ['captain', 'engineer'],
  },
  search: {
    name: 'Leta',
    needs: 'wreck',
    gives: ['item', 'person', 'signal', 'vault'],
    place: 'wreck',
    minutes: 8,
    roles: ['boarders'],
  },
  scan: {
    name: 'Spana',
    needs: 'signal',
    gives: ['wreck', 'target', 'person', 'vault'],
    place: 'space',
    minutes: 5,
    roles: ['engineer', 'captain'],
  },
  fight: {
    name: 'Strida',
    needs: 'target',
    gives: ['item', 'wreck', 'person', 'vault'],
    place: 'space',
    minutes: 6,
    roles: ['gunner', 'captain'],
  },
  board: {
    name: 'Borda',
    needs: 'target',
    gives: ['item', 'person', 'vault'],
    place: 'ship',
    minutes: 9,
    roles: ['gunner', 'boarders'],
  },
  deliver: {
    name: 'Leverera',
    needs: 'item',
    gives: ['person', 'target', 'shop', 'signal'],
    place: 'bar',
    minutes: 3,
    roles: ['captain'],
  },
  choose: {
    name: 'Välja',
    needs: 'item',
    gives: ['person', 'shop', 'wreck', 'signal', 'target'],
    place: 'bar',
    minutes: 2,
    roles: ['captain', 'gunner', 'engineer'],
  },
  raid: {
    name: 'Plundra',
    needs: 'vault',
    gives: ['map'],
    place: 'pirate',
    minutes: 15,
    roles: ['captain', 'gunner', 'engineer', 'boarders'],
  },
};
// What a sort of step leads to, as the tester names it.
export const TOKEN_NAMES = {
  person: 'en person',
  shop: 'en butik',
  wreck: 'ett vrak',
  signal: 'en signal',
  target: 'ett mål',
  item: 'en sak',
  vault: 'valvet',
  map: 'stjärnkartan',
};
// The twists: a step of an ordinary sort where something is not what it seemed.
export const TWISTS = {
  dead: { sort: 'talk', name: 'Kontakten är död', gives: ['wreck', 'signal'] },
  betrayed: { sort: 'talk', name: 'Förrådd', gives: ['target'] },
  fake: { sort: 'deliver', name: 'Saken är falsk', gives: ['target', 'person'] },
  ambush: { sort: 'acquire', name: 'Bakhåll', gives: ['item'] },
  trap: { sort: 'search', name: 'Vraket är ett bete', gives: ['target', 'signal'] },
};
// About how long a jump between systems takes, in minutes, counting the travel inside the systems.
const JUMP_MINUTES = 1.5;
// What a choice does to the standing (R-1215, a proposal): the side that gets the item likes the crew more, and
// the other less.
export const CHOICE_STANDING = { gain: 10, loss: 5 };

// ---------- the people, things and places of a story ----------
const GIVEN = [
  'ADA',
  'BRAM',
  'CORA',
  'DESH',
  'EVI',
  'FENN',
  'GALE',
  'HOLT',
  'IRIS',
  'JUNO',
  'KASS',
  'LEV',
  'MARA',
  'NIKO',
  'ORLA',
  'PIK',
  'QUILL',
  'ROAN',
  'SABLE',
  'TAMSIN',
  'URI',
  'VESNA',
  'WREN',
  'YARA',
  'ZED',
  'ODO',
  'RHEA',
];
const FAMILY = [
  'VOSS',
  'KADE',
  'MORROW',
  'STEEL',
  'HALLORAN',
  'IBARRA',
  'QUINT',
  'TOLLAND',
  'REYES',
  'OKONJO',
  'BRANT',
  'SAYER',
  'LUND',
  'MARSH',
  'CROWE',
  'DALE',
  'FARROW',
  'NYE',
];
const TRADES = [
  'A DOCK CHIEF',
  'A SALVAGER',
  'A FENCE',
  'AN OLD PILOT',
  'A BARKEEP',
  'A CUSTOMS CLERK',
  'A SMUGGLER',
  'A MEDIC',
  'A CARTOGRAPHER',
  'A DESERTER',
  'A MECHANIC',
  'A PREACHER',
];
const EPITHETS = [
  'THE KNIFE',
  'REDHAND',
  'THE COLD',
  'SIXFINGERS',
  'THE LAUGH',
  'BLACKSTAR',
  'THE TALLY',
  'GLASSJAW',
  'THE QUIET',
  'LUCKY',
];
const GANG_WORDS = ['RUST', 'HOLLOW', 'ASH', 'GLASS', 'NINE', 'TALLOW', 'GRIN'];
const GANG_KINDS = ['GANG', 'PACK', 'CREW', 'KNIVES'];
const SHIP_NAMES = [
  'MERIDIAN',
  'LANTERN',
  'OXBOW',
  'SPARROW',
  'HALCYON',
  'KESTREL',
  'TALLY HO',
  'GOOD HOPE',
  'PILGRIM',
  'WINTERSET',
  'NIGHTJAR',
  'CANDLE',
  'ORISON',
  'BARLEY',
];
const SIGNALS = [
  'A FAINT DISTRESS BEACON',
  'A SIGNAL ON AN OLD WARDEN BAND',
  'A REPEATING BURST OF NUMBERS',
  'A VOICE READING NAMES',
  'A TRANSPONDER THAT SHOULD BE DEAD',
];
const pick = (s, list) => corePick(() => rand(s), list);
function shuffle(s, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- the chain ----------
// What the quest engine needs to know of the sorts (src/quest/core.js). Talk opens the story and the raid ends it,
// and the vault is only given by the step before the raid. How much each sort and each lead is wanted, so that the
// story is not mostly talk (R-1213).
export const CATALOG = {
  sorts: SORTS,
  twists: TWISTS,
  start: 'talk',
  choice: 'choose',
  end: 'raid',
  finalToken: 'vault',
  endToken: 'map',
  sortWeight: { talk: 0.7, acquire: 1.4, deliver: 1.1 },
  giveWeight: { shop: 1.6, item: 1.2, person: 0.8 },
};

// ---------- the places ----------
const stationsIn = (sys, ok) =>
  sys.plan.map(([side, , , name, sanctuary]) => ({ side, name, sanctuary: !!sanctuary })).filter(ok);
const friendlyBase = (st) => st.side !== PIRATE;
const pirateBase = (st) => st.side === PIRATE;
// Where a sort of step can happen: the systems, and for a step at a base, the base.
function fits(place, sys) {
  if (sys.boss) return false;
  if (place === 'bar' || place === 'shop') return stationsIn(sys, friendlyBase).length > 0;
  if (place === 'pirate') return stationsIn(sys, pirateBase).length > 0;
  return sys.kind !== 'sanctuary';
}

// Pick the system for a step: about as dangerous as the story is far along, a jump or two from the last step,
// and seldom one the story has used before.
function placeStep(s, world, sort, progress, from, usedSystems) {
  const place = SORTS[sort].place;
  const maxTier = Math.max(...world.systems.filter((x) => !x.boss).map((x) => x.tier));
  const want = Math.round(progress * maxTier);
  const hops = world.hops[from];
  const list = world.systems.filter((x) => fits(place, x) && hops[x.id] !== Infinity);
  const score = (x) =>
    3 * Math.abs(x.tier - want) +
    Math.abs(hops[x.id] - 2) +
    (x.id === from ? 6 : 0) +
    2 * (usedSystems[x.id] || 0) +
    1.5 * rand(s);
  let best = null;
  let bestScore = Infinity;
  for (const x of list) {
    const v = score(x);
    if (v < bestScore) [best, bestScore] = [x, v];
  }
  if (!best) return null;
  usedSystems[best.id] = (usedSystems[best.id] || 0) + 1;
  const bases = place === 'pirate' ? stationsIn(best, pirateBase) : stationsIn(best, friendlyBase);
  return {
    system: best.id,
    base: bases.length && (place === 'bar' || place === 'shop' || place === 'pirate') ? pick(s, bases).name : null,
  };
}

// ---------- the story ----------
// A new name that the story has not used.
function namer(s) {
  const taken = new Set();
  const bynames = new Set();
  const fresh = (make) => {
    let n = make();
    for (let k = 0; k < 40 && taken.has(n); k++) n = make();
    taken.add(n);
    return n;
  };
  return {
    person: () => fresh(() => `${pick(s, GIVEN)} ${pick(s, FAMILY)}`),
    // A pirate's byname is never used twice in a story, so that two pirates are not mixed up.
    pirate: () => {
      const free = EPITHETS.filter((e) => !bynames.has(e));
      const byname = pick(s, free.length ? free : EPITHETS);
      bynames.add(byname);
      return fresh(() => `${pick(s, GIVEN)} '${byname}' ${pick(s, FAMILY)}`);
    },
    gang: () => fresh(() => `THE ${pick(s, GANG_WORDS)} ${pick(s, GANG_KINDS)}`),
    ship: () => fresh(() => `THE ${pick(s, SHIP_NAMES)}`),
    signal: () => fresh(() => pick(s, SIGNALS)),
    item: (premise) => fresh(() => pick(s, PREMISES[premise].items)),
    word: () => fresh(() => pick(s, SHIP_NAMES)),
  };
}

// The story for a game: `sectors` is the map of the game (state.sectors), `seed` the game's seed and `size` the
// size of the map. `options.premise` picks what the story is about, for the tester. Returns { size, premise, cast,
// truth, steps, clues }, where a step is either one step or, after a choice, { branches: [a, b] }.
export function createStory(sectors, seed, size = 'short', options = {}) {
  const s = { rng: (Math.imul(seed >>> 0, 2654435761) ^ 0x51a7) >>> 0 };
  const random = () => rand(s);
  const skeleton = SKELETON[size] || SKELETON.short;
  let plan = null;
  for (let tries = 0; tries < 5 && !plan; tries++) plan = planChain(random, skeleton, CATALOG);
  if (!plan) throw new Error('no story could be made for seed ' + seed);
  const world = { systems: sectors, hops: sectors.map((x) => hopsFrom(sectors, x.id)) };
  const end = sectors.find((x) => x.boss);
  const names = namer(s);
  const premise = PREMISES[options.premise] ? options.premise : pick(s, Object.keys(PREMISES));
  const factions = Object.keys(FACTIONS);
  const cast = {
    contact: {
      name: names.person(),
      trade: pick(s, TRADES),
      side: pick(s, factions),
      voice: pick(s, Object.keys(VOICES.contact)),
    },
    rival: { name: names.person(), ship: names.ship(), voice: pick(s, Object.keys(VOICES.rival)) },
    villain: {
      name: names.pirate(),
      base: end ? end.plan[0][3] : 'THE BASTION',
      system: end ? end.id : null,
      voice: pick(s, Object.keys(VOICES.villain)),
    },
  };
  // The hidden truth (R-1222): who is behind it, how and why, and the base the money went through.
  const towns = sectors.filter((x) => x.kind === 'inhabited' && !x.boss && x.plan.some(([side]) => side !== PIRATE));
  const town = pick(s, towns);
  const truth = {
    culprit: pick(s, Object.keys(PREMISES[premise].culprits)),
    method: pick(s, Object.keys(PREMISES[premise].methods)),
    motive: pick(s, ['debt', 'revenge', 'war', 'hostage']),
    name: names.person(),
    base: town.plan.find(([side]) => side !== PIRATE)[3],
  };
  const usedSystems = {};
  const n = plan.length;
  /** @type {Record<string, any>[]} */
  const steps = [];
  let from = 0;
  let carried = null;
  // The contact is gone from the step where a twist kills them or shows them to be a traitor.
  let contactOut = Infinity;
  // The thing a step is about, made when the step is placed: who to see, what to buy, which wreck, and so on.
  const make = (p, i, at, item) => {
    const progress = i / (n - 1);
    const where =
      p.kind === 'start'
        ? { system: 0, base: stationsIn(sectors[0], () => true)[0].name }
        : placeStep(s, world, p.sort, progress, at, usedSystems);
    /** @type {Record<string, any>} */
    const step = {
      index: i,
      act: p.act,
      sort: p.sort,
      twist: p.twist || null,
      needs: p.needs,
      gives: p.gives,
      ...where,
    };
    if (p.sort === 'talk' || p.sort === 'deliver' || p.sort === 'choose') {
      const here = i < contactOut;
      const again =
        here &&
        (p.kind === 'start' ||
          p.twist === 'betrayed' ||
          (p.twist === 'dead' && rand(s) < 0.5) ||
          (i > 2 && rand(s) < 0.3));
      step.who = again ? cast.contact.name : names.person();
      step.trade = again ? null : pick(s, TRADES);
      step.isContact = again;
      if (again && (p.twist === 'betrayed' || p.twist === 'dead')) contactOut = i;
    }
    // The rival comes in once the story is under way, not as the first target.
    const rivalHere = p.act === 'escalation' && !p.twist && rand(s) < 0.35;
    if (p.sort === 'fight') step.target = rivalHere ? cast.rival.ship : rand(s) < 0.5 ? names.gang() : names.pirate();
    if (p.sort === 'board') {
      step.target = names.ship();
      step.owner = rand(s) < 0.4 ? null : names.pirate();
    }
    if (p.sort === 'search') step.wreck = names.ship();
    if (p.sort === 'scan') step.signal = names.signal();
    if (p.sort === 'acquire') step.item = names.item(premise);
    if (p.needs === 'item') step.carries = item;
    if (p.gives === 'item' && !step.item) step.item = names.item(premise);
    if (p.sort === 'choose') {
      const other = shuffle(
        s,
        factions.filter((f) => f !== cast.contact.side),
      )[0];
      step.sides = [cast.contact.side, other];
    }
    return step;
  };
  for (let i = 0; i < n; i++) {
    const p = plan[i];
    if (p.branches) {
      const two = p.branches.map((b) => make(b, i, from, carried));
      steps.push({ index: i, act: p.act, branches: two });
      from = two[0].system;
      carried = two[0].item || null;
      continue;
    }
    const step = make(p, i, from, carried);
    steps.push(step);
    from = step.system;
    if (step.item) carried = step.item;
    else if (p.needs === 'item') carried = null;
  }
  // The items given in a branch are the same in both, so that the rest of the story reads the same.
  for (const st of steps)
    if (st.branches && st.branches[0].item && st.branches[1].item) st.branches[1].item = st.branches[0].item;
  const story = {
    seed,
    size,
    premise,
    cast,
    truth,
    thing: names.word(),
    loss: pick(s, LOSSES),
    standing: CHOICE_STANDING,
    contactOut,
    end: end ? end.id : null,
    steps,
    clues: [],
    reveal: '',
  };
  writeTexts(story, sectors);
  return story;
}

// Every way through the story, as lists of steps: one for each combination of the choices (R-1212).
export const pathsOf = (story) => chainPaths(story.steps);

// The map of a game without the rest of the game: the same systems as createState(seed, { size }) makes, since the
// map is the first thing a new game draws random numbers for (checked in tests/story.test.js). Much quicker, for
// the tester's summary of many games.
export const sectorsFor = (seed, size) => createSectors({ rng: seed >>> 0, nextId: 1 }, size);

// ---------- the checks ----------
// What is wrong with a story: an empty list when it can be played from the start to the end on every way through
// it (R-1209 to R-1214).
export function checkStory(story, sectors) {
  const problems = checkChain(story.steps, CATALOG);
  const paths = pathsOf(story);
  const want = MAIN_STEPS[story.size];
  const choices = story.steps.filter((st) => st.sort === 'choose').length;
  if (choices !== CHOICES[story.size]) problems.push(`${choices} choices, not ${CHOICES[story.size]}`);
  if (story.clues.length !== 4) problems.push(`${story.clues.length} clues, not 4`);
  const hops = hopsFrom(sectors, 0);
  const broken = (t) => !t || /\{\w+\}|undefined|null/.test(t);
  for (const path of paths) {
    if (path.length !== want) problems.push(`a way through has ${path.length} steps, not ${want}`);
    if (path[0].system !== 0) problems.push('the story does not start in the sanctuary');
    path.forEach((st, k) => {
      const sys = sectors[st.system];
      if (!sys) return problems.push(`step ${k + 1} has no system`);
      if (sys.boss) problems.push(`step ${k + 1} is in the end, which is closed until the map`);
      if (hops[st.system] === Infinity) problems.push(`step ${k + 1} cannot be reached`);
      if (!fits(SORTS[st.sort].place, sys) && !(k === 0 && sys.kind === 'sanctuary'))
        problems.push(`step ${k + 1} (${st.sort}) is in a system without the right place`);
      if (['bar', 'shop', 'pirate'].includes(SORTS[st.sort].place) && !st.base)
        problems.push(`step ${k + 1} has no base`);
      for (const key of ['goal', 'text', 'fallback'])
        if (broken(st[key])) problems.push(`step ${k + 1} has a broken ${key}`);
      if (st.needs === 'item' && !st.carries) problems.push(`step ${k + 1} needs an item that has no name`);
      if (k > story.contactOut && st.isContact) problems.push(`step ${k + 1} has the contact, who is gone`);
    });
  }
  if (broken(story.reveal)) problems.push('the truth is not told at the end');
  return [...new Set(problems)];
}

// About how long one way through the story takes, in minutes: the steps and the jumps between them.
export function minutesOf(path, sectors) {
  let jumps = 0;
  for (let k = 1; k < path.length; k++) jumps += hopsFrom(sectors, path[k - 1].system)[path[k].system];
  const steps = path.reduce((sum, st) => sum + SORTS[st.sort].minutes, 0);
  return { minutes: Math.round(steps + jumps * JUMP_MINUTES), jumps };
}

// A summary of many stories: how long they are, how often each sort comes, who gets work, and what is wrong.
export function summarize(list) {
  const sorts = {};
  const roles = {};
  const twists = {};
  const minutes = [];
  const jumps = [];
  let problems = 0;
  const examples = [];
  for (const { story, sectors } of list) {
    const found = checkStory(story, sectors);
    if (found.length) {
      problems++;
      if (examples.length < 5) examples.push(`frö ${story.seed}: ${found[0]}`);
    }
    const path = pathsOf(story)[0];
    const t = minutesOf(path, sectors);
    minutes.push(t.minutes);
    jumps.push(t.jumps);
    for (const st of path) {
      sorts[st.sort] = (sorts[st.sort] || 0) + 1;
      for (const r of SORTS[st.sort].roles) roles[r] = (roles[r] || 0) + 1;
      if (st.twist) twists[st.twist] = (twists[st.twist] || 0) + 1;
    }
  }
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    count: list.length,
    minutes: { avg: avg(minutes), min: Math.min(...minutes), max: Math.max(...minutes) },
    jumps: avg(jumps),
    sorts,
    roles,
    twists,
    problems,
    examples,
  };
}
