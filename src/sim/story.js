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
// The story draws its own random numbers from the seed, so the game's own random numbers are left as they were.
import { FACTIONS, PIRATE } from './sides.js';
import { hopsFrom } from './world.js';
import { createSectors } from './sectors.js';
import { rand } from './util.js';

// How many steps the main story has for each size of map (R-1210), and how many choices split it (R-1212).
export const MAIN_STEPS = { short: 8, medium: 12, long: 16 };
export const CHOICES = { short: 1, medium: 2, long: 2 };

// The skeleton: one slot per step, in order. `act` is the part of the story, `kind` what may stand in the slot.
const slot = (act, kind = 'normal') => ({ act, kind });
const inv = (n) => Array.from({ length: n }, () => slot('investigation'));
const esc = (n) => Array.from({ length: n }, () => slot('escalation'));
export const SKELETON = {
  short: [
    slot('hook', 'hook'),
    ...inv(1),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(2),
    slot('finale', 'finale'),
  ],
  medium: [
    slot('hook', 'hook'),
    ...inv(3),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(1),
    slot('escalation', 'choose'),
    ...esc(2),
    slot('finale', 'finale'),
  ],
  long: [
    slot('hook', 'hook'),
    ...inv(3),
    slot('investigation', 'choose'),
    ...inv(1),
    slot('twist', 'twist'),
    ...esc(1),
    slot('escalation', 'choose'),
    ...esc(2),
    slot('twist', 'twist'),
    ...esc(3),
    slot('finale', 'finale'),
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
const EPITHETS = ['THE KNIFE', 'REDHAND', 'THE COLD', 'SIXFINGERS', 'THE LAUGH', 'BLACKSTAR', 'THE TALLY'];
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
// What the story is about. Each one has its own things to find and its own opening.
export const PREMISES = {
  cruiser: {
    name: 'Den försvunna kryssaren',
    items: ['THE FLIGHT RECORDER', 'A NAV CORE', 'A CIPHER KEY', 'THE CREW MANIFEST', 'A HULL TAG'],
    opening:
      'A Warden cruiser vanished with all hands, and now its parts are turning up for sale. ' +
      '{contact} wants to know who is selling them, and who is buying.',
  },
  convoy: {
    name: 'Konvojen',
    items: ['THE CONVOY CODES', 'A LEDGER', 'A SEALED CRATE', 'A PAY CHIT', 'A SIGNET RING'],
    opening:
      'A Charter convoy was taken whole, and the pirates had its codes before it left the dock. ' +
      '{contact} thinks someone inside sold them, and wants a name.',
  },
  signal: {
    name: 'Signalen',
    items: ['A BEACON SHARD', 'A DATA SPIKE', 'A CHART FRAGMENT', 'A RELAY CORE', 'A BLACK BOX'],
    opening:
      'Something out in the dark is sending, and every time it does, the pirates move. ' +
      '{contact} has heard it on an old band and wants it found.',
  },
};

const pick = (s, list) => list[Math.floor(rand(s) * list.length)];
function shuffle(s, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
// A pick where each entry has a weight.
function weighted(s, list, weight) {
  const total = list.reduce((sum, x) => sum + weight(x), 0);
  let r = rand(s) * total;
  for (const x of list) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

// ---------- the chain ----------
// What may stand in a slot, for a crew that knows or has `need`: a list of { sort, twist, gives }.
function candidates(kind, need) {
  if (kind === 'hook') return [{ sort: 'talk', twist: null, gives: SORTS.talk.gives.filter((g) => g !== 'vault') }];
  if (kind === 'finale') return need === 'vault' ? [{ sort: 'raid', twist: null, gives: ['map'] }] : [];
  if (kind === 'choose') return need === 'item' ? [{ sort: 'choose', twist: null, gives: SORTS.choose.gives }] : [];
  if (kind === 'twist')
    return Object.entries(TWISTS)
      .filter(([, t]) => SORTS[t.sort].needs === need)
      .map(([id, t]) => ({ sort: t.sort, twist: id, gives: t.gives }));
  return Object.entries(SORTS)
    .filter(([id, c]) => id !== 'choose' && id !== 'raid' && c.needs === need)
    .map(([id, c]) => ({ sort: id, twist: null, gives: c.gives.filter((g) => g !== 'vault') }));
}
// Whether the slot `next` can take `token`, with a sort other than those in `not`. The vault is only for the
// finale, and the finale only takes the vault.
function canTake(next, token, not) {
  if (!next) return token === 'map';
  if (token === 'vault') return next.kind === 'finale';
  return candidates(next.kind, token).some((c) => !not.includes(c.sort));
}
// The gives that a candidate may use here: for the step before the finale only the vault.
const givesHere = (c, next) =>
  next && next.kind === 'finale' ? SORTS[c.sort].gives.filter((g) => g === 'vault') : c.gives;

// How much each sort and each lead is wanted, so that the story is not mostly talk (R-1213).
const SORT_WEIGHT = { talk: 0.7, acquire: 1.4, deliver: 1.1 };
const GIVE_WEIGHT = { shop: 1.6, item: 1.2, person: 0.8 };

// The plan of the story: for each slot, the sort, the twist and what it needs and gives. A choice has two
// options, and the slot after it two branches, which both give the same thing, so that the story goes on as one.
// The plan is searched for depth first, in a random order, so that a slot that cannot be filled sends the search
// back to try something else before it.
function planChain(s, skeleton) {
  const weight = (c, used) =>
    ((SORT_WEIGHT[c.sort] || 1) / (1 + (used[c.sort] || 0))) * (c.twist ? 1.5 : 1) * (GIVE_WEIGHT[c.give] || 1);
  // The entries of `list` in a random order, those with more weight more often first.
  const order = (list, w) => {
    const left = [...list];
    const out = [];
    while (left.length) {
      const x = weighted(s, left, w);
      out.push(x);
      left.splice(left.indexOf(x), 1);
    }
    return out;
  };
  const bump = (used, sorts) => {
    const next = { ...used };
    for (const x of sorts) next[x] = (next[x] || 0) + 1;
    return next;
  };
  let budget = 4000;
  const go = (i, need, not, used) => {
    if (i === skeleton.length) return need === 'map' ? [] : null;
    if (--budget < 0) return null;
    const here = skeleton[i];
    const next = skeleton[i + 1];
    if (here.kind === 'choose') {
      if (need !== 'item') return null;
      const after = skeleton[i + 2];
      const pairs = [];
      for (const ta of SORTS.choose.gives)
        for (const tb of SORTS.choose.gives) {
          if (ta >= tb) continue;
          for (const a of candidates(next.kind, ta))
            for (const b of candidates(next.kind, tb)) {
              if (a.sort === b.sort || not.includes(a.sort) || not.includes(b.sort)) continue;
              for (const g of givesHere(a, after))
                if (givesHere(b, after).includes(g) && canTake(after, g, [a.sort, b.sort]))
                  pairs.push({ ta, tb, a, b, g, give: g });
            }
        }
      for (const p of order(pairs, (x) => weight(x.a, used) * weight(x.b, used) * (GIVE_WEIGHT[x.g] || 1))) {
        const rest = go(i + 2, p.g, [p.a.sort, p.b.sort], bump(used, ['choose', p.a.sort, p.b.sort]));
        if (!rest) continue;
        return [
          { ...here, sort: 'choose', twist: null, needs: need, gives: [p.ta, p.tb] },
          {
            ...next,
            branches: [
              { sort: p.a.sort, twist: p.a.twist, needs: p.ta, gives: p.g },
              { sort: p.b.sort, twist: p.b.twist, needs: p.tb, gives: p.g },
            ],
          },
          ...rest,
        ];
      }
      return null;
    }
    const options = [];
    for (const c of candidates(here.kind, need)) {
      if (not.includes(c.sort)) continue;
      for (const g of givesHere(c, next))
        if (canTake(next, g, [c.sort]) && (next?.kind !== 'choose' || g === 'item')) options.push({ ...c, give: g });
    }
    for (const c of order(options, (x) => weight(x, used))) {
      const rest = go(i + 1, c.give, [c.sort], bump(used, [c.sort]));
      if (rest) return [{ ...here, sort: c.sort, twist: c.twist, needs: need, gives: c.give }, ...rest];
    }
    return null;
  };
  return go(0, null, [], {});
}

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
  const fresh = (make) => {
    let n = make();
    for (let k = 0; k < 40 && taken.has(n); k++) n = make();
    taken.add(n);
    return n;
  };
  return {
    person: () => fresh(() => `${pick(s, GIVEN)} ${pick(s, FAMILY)}`),
    pirate: () => fresh(() => `${pick(s, GIVEN)} '${pick(s, EPITHETS)}' ${pick(s, FAMILY)}`),
    gang: () => fresh(() => `THE ${pick(s, GANG_WORDS)} ${pick(s, GANG_KINDS)}`),
    ship: () => fresh(() => `THE ${pick(s, SHIP_NAMES)}`),
    signal: () => fresh(() => pick(s, SIGNALS)),
    item: (premise) => fresh(() => pick(s, PREMISES[premise].items)),
  };
}

// The story for a game: `sectors` is the map of the game (state.sectors), `seed` the game's seed and `size` the
// size of the map. Returns { size, premise, cast, steps }, where a step is either one step or, after a choice,
// { branches: [a, b] }.
export function createStory(sectors, seed, size = 'short') {
  const s = { rng: (Math.imul(seed >>> 0, 2654435761) ^ 0x51a7) >>> 0 };
  const skeleton = SKELETON[size] || SKELETON.short;
  let plan = null;
  for (let tries = 0; tries < 5 && !plan; tries++) plan = planChain(s, skeleton);
  if (!plan) throw new Error('no story could be made for seed ' + seed);
  const world = { systems: sectors, hops: sectors.map((x) => hopsFrom(sectors, x.id)) };
  const end = sectors.find((x) => x.boss);
  const names = namer(s);
  const premise = pick(s, Object.keys(PREMISES));
  const factions = Object.keys(FACTIONS);
  const cast = {
    contact: { name: names.person(), trade: pick(s, TRADES), side: pick(s, factions) },
    rival: { name: names.person(), ship: names.ship() },
    villain: { name: names.pirate(), base: end ? end.plan[0][3] : 'THE BASTION', system: end ? end.id : null },
  };
  const usedSystems = {};
  const n = plan.length;
  /** @type {Record<string, any>[]} */
  const steps = [];
  let from = 0;
  let carried = null;
  // The thing a step is about, made when the step is placed: who to see, what to buy, which wreck, and so on.
  const make = (p, i, at, item) => {
    const progress = i / (n - 1);
    const where =
      p.sort === 'talk' && p.act === 'hook'
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
      const again = p.act === 'hook' || p.twist === 'betrayed' || (i > 2 && rand(s) < 0.3);
      step.who = again ? cast.contact.name : names.person();
      step.trade = again ? null : pick(s, TRADES);
      step.isContact = again;
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
      const two = p.branches.map((b) => make({ ...p, ...b, branches: undefined }, i, from, carried));
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
  const story = { seed, size, premise, cast, end: end ? end.id : null, steps };
  writeTexts(story, sectors);
  return story;
}

// Every way through the story, as lists of steps: one for each combination of the choices (R-1212).
export function pathsOf(story) {
  let paths = [[]];
  for (const st of story.steps) {
    if (st.branches) paths = paths.flatMap((p) => st.branches.map((b) => [...p, b]));
    else paths = paths.map((p) => [...p, st]);
  }
  return paths;
}

// ---------- the texts ----------
// The texts are in English, as in the game. `{name}` is filled from the story.
const OPENERS = {
  talk: [
    '{intro} keeps a corner table at {base}.',
    '{intro} only talks once the drinks are paid for.',
    '{intro} looks around twice before saying anything.',
  ],
  acquire: [
    'The trader at {base} has one of these and knows exactly what it is worth.',
    '{item} sits behind the counter at {base}, under a cloth.',
  ],
  search: [
    '{wreck} lies dark and cold. Its last log is still running.',
    'The hold of {wreck} has been picked over, but not well.',
  ],
  scan: [
    'The scan finds {signal}, strongest near the edge of the system.',
    '{signal} cuts in and out, but it is there.',
  ],
  fight: ['{target} turns to fight instead of running.', '{target} has been waiting for someone to come asking.'],
  board: [
    'With the engines out, {targetLong} drifts. Someone aboard is still shooting.',
    'The crew of {target} locks the doors and waits for the boarders.',
  ],
  deliver: [
    '{intro} takes {carries} without a word, and then talks.',
    '{intro} has been waiting for {carries} for a long time.',
  ],
  choose: ['{whoA} and {whoB} both want {carries}. Whoever gets it owes the crew. The other will remember.'],
  raid: ['The vault of {base} is behind three decks of pirates.'],
};
const TWIST_OPENERS = {
  dead: '{who} is dead. Nobody at {base} wants to say how, but {who} left something behind.',
  betrayed: '{who} sold the crew out. The pirates knew they were coming, and the money came from {next}.',
  fake: '{carries} is a fake. The real one never left the hands of {next}.',
  ambush: 'As soon as {item} is aboard, the crew of {rivalShip} opens fire at the dock.',
  trap: '{wreck} is bait. Pirates come out of the dust the moment the boarders are inside.',
};
// A ship to board with its owner, if it has one: "THE CANDLE, THE SHIP OF ...,".
const longTarget = (n) =>
  n.owner ? `${n.target}, THE SHIP OF ${n.owner},` : n.sort === 'board' ? `${n.target}, A COURIER,` : n.target;
// The lead at the end of a step: where the thing it gives can be found. `n` is the step that takes it.
function lead(token, n, w) {
  switch (token) {
    case 'person':
      return `Ask for ${n.who} at ${n.base} in ${w(n.system)}.`;
    case 'shop':
      return `${n.base} in ${w(n.system)} has ${n.item} for sale, but only for as long as this lasts.`;
    case 'wreck':
      return `${n.wreck} went down in ${w(n.system)}. What the crew wants is still aboard.`;
    case 'signal':
      return `Something is sending from ${w(n.system)}. Scan for it.`;
    case 'target':
      return `${longTarget(n)} is out in ${w(n.system)}.`;
    case 'item':
      return n.sort === 'choose'
        ? `The crew now has ${n.carries}, and more than one side wants it.`
        : `The crew now has ${n.carries}. ${n.who} at ${n.base} in ${w(n.system)} is waiting for it.`;
    case 'vault':
      return `The star map that opens the way to the end lies in the vault of ${n.base} in ${w(n.system)}.`;
    default:
      return '';
  }
}
const GOALS = {
  talk: 'Talk to {who} at {base} in {system}.',
  acquire: 'Buy {item} at {base} in {system}.',
  search: 'Search {wreck} in {system}.',
  scan: 'Scan {system} for {signal}.',
  fight: 'Shoot down {target} in {system}.',
  board: 'Disable {target} in {system} and board her.',
  deliver: 'Bring {carries} to {who} at {base} in {system}.',
  choose: 'Decide who gets {carries}: {sideA} or {sideB}.',
  raid: 'Take the star map from the vault of {base} in {system}.',
};
// The way out if something goes wrong, so that the crew never gets stuck (R-1214).
export const FALLBACKS = {
  talk: 'If the base is closed to the crew, the person meets them in the sanctuary instead.',
  acquire: 'The price is never more than the crew has. With no credits, the trader takes ore or a favour.',
  search: 'The wreck cannot be blown up while the story needs it, and what is in it is never lost.',
  scan: 'The signal shows on the system map once the crew is there, also without a bought sensor.',
  fight:
    'If the target gets away, it turns up again in a system next to this one. What it carries drops when it is shot down.',
  board: 'If the ship is destroyed instead of disabled, what the crew wanted is found in the wreck it leaves.',
  deliver: 'If the base is closed to the crew, the person meets them in the sanctuary instead.',
  choose: 'Either choice leads on to the end.',
  raid: 'The star map cannot be destroyed. If the crew loses, it is still in the vault for the next try.',
};
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (all, key) => (values[key] != null ? values[key] : all));

function writeTexts(story, sectors) {
  const w = (id) => sectors[id].name;
  const side = (f) => FACTIONS[f].name;
  // The step that comes after the step at index i on the way through `branch` (0 or 1).
  const nextOf = (i, branch) => {
    const n = story.steps[i + 1];
    if (!n) return null;
    return n.branches ? n.branches[branch] : n;
  };
  const write = (st, i, branch, s) => {
    const values = {
      who: st.who,
      intro: st.trade ? `${st.who}, ${st.trade},` : st.who,
      targetLong: st.sort === 'board' ? longTarget(st) : st.target,
      base: st.base,
      system: st.system != null ? w(st.system) : '',
      item: st.item,
      carries: st.carries,
      wreck: st.wreck,
      signal: st.signal,
      target: st.target,
      contact: story.cast.contact.name,
      rivalShip: story.cast.rival.ship,
    };
    if (st.sort === 'choose') {
      values.sideA = side(st.sides[0]);
      values.sideB = side(st.sides[1]);
      values.whoA = values.sideA;
      values.whoB = values.sideB;
    }
    st.goal = fill(GOALS[st.sort], values);
    st.fallback = FALLBACKS[st.sort];
    const parts = [];
    if (st.act === 'hook')
      parts.push(
        `${story.cast.contact.name}, ${story.cast.contact.trade}, is waiting at ${st.base}.`,
        fill(PREMISES[story.premise].opening, values),
      );
    else if (st.twist) {
      const n = nextOf(i, branch);
      values.next = n ? n.owner || n.target || n.who || n.base || '' : '';
      parts.push(fill(TWIST_OPENERS[st.twist], values));
    } else parts.push(fill(OPENERS[st.sort][s % OPENERS[st.sort].length], values));
    if (st.sort === 'choose') {
      st.options = st.sides.map((f, k) => {
        const n = story.steps[i + 1].branches[k];
        return {
          side: f,
          text:
            `Give it to ${side(f)}: +${CHOICE_STANDING.gain} with them, ` +
            `-${CHOICE_STANDING.loss} with ${side(st.sides[1 - k])}. ${lead(st.gives[k], n, w)}`,
        };
      });
    } else if (st.sort === 'raid') {
      parts.push(
        `With the map, the way to ${w(story.end)} is open. ${story.cast.villain.name} is waiting at ${story.cast.villain.base}.`,
      );
    } else {
      const n = nextOf(i, branch);
      if (n) parts.push(lead(st.gives, n, w));
    }
    st.text = parts.join(' ');
  };
  story.steps.forEach((st, i) => {
    if (st.branches) st.branches.forEach((b, k) => write(b, i, k, i + k));
    else write(st, i, 0, i);
  });
}

// The map of a game without the rest of the game: the same systems as createState(seed, { size }) makes, since the
// map is the first thing a new game draws random numbers for (checked in tests/story.test.js). Much quicker, for
// the tester's summary of many games.
export const sectorsFor = (seed, size) => createSectors({ rng: seed >>> 0, nextId: 1 }, size);

// ---------- the checks ----------
// What is wrong with a story: an empty list when it can be played from the start to the end on every way through
// it (R-1209 to R-1214).
export function checkStory(story, sectors) {
  const problems = [];
  const paths = pathsOf(story);
  const want = MAIN_STEPS[story.size];
  const choices = story.steps.filter((st) => st.sort === 'choose').length;
  if (choices !== CHOICES[story.size]) problems.push(`${choices} choices, not ${CHOICES[story.size]}`);
  const hops = hopsFrom(sectors, 0);
  for (const path of paths) {
    if (path.length !== want) problems.push(`a way through has ${path.length} steps, not ${want}`);
    const first = path[0];
    if (first.sort !== 'talk' || first.system !== 0) problems.push('the story does not start in the sanctuary');
    const last = path[path.length - 1];
    if (last.sort !== 'raid' || last.gives !== 'map') problems.push('the story does not end with the star map');
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
        if (!st[key] || /\{\w+\}|undefined|null/.test(st[key])) problems.push(`step ${k + 1} has a broken ${key}`);
      const prev = path[k - 1];
      if (!prev) return;
      if (prev.sort === st.sort) problems.push(`steps ${k} and ${k + 1} are both ${st.sort}`);
      const gave = prev.sort === 'choose' ? prev.gives : [prev.gives];
      if (!gave.includes(st.needs))
        problems.push(`step ${k + 1} needs ${st.needs}, but step ${k} gives ${gave.join(' or ')}`);
      if (st.needs === 'item' && !st.carries) problems.push(`step ${k + 1} needs an item that has no name`);
    });
  }
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
