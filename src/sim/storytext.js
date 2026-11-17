// The texts of the story (F-276, docs/proposal-missions.md): what the crew reads and hears, in English as in the
// game. They are written by hand for each premise and act, as pieces that are put together with the hidden truth,
// the map and the people of a game, so that the stories still differ from game to game (US12).
//   - The hidden truth: who is behind it, why and how. Each part is told by one step, and the parts are kept as
//     clues in the log, until the end shows the whole of it (R-1222).
//   - The contact, the rival and the villain each have a voice, and call over the radio between the steps (R-1223).
//   - A step is a scene: how it opens, what happens there, and where it leads. The task itself is only in the log.
//   - The side left out of a choice comes back later, and the contact remembers what the crew chose (R-1224).
// The convoy is written in full. The cruiser and the signal are drafts with one text of each kind.
import { FACTIONS } from './sides.js';
import { fill } from '../quest/core.js';

// The things a premise is about, how it opens, its hidden truth, and what is talked about in its acts.
export const PREMISES = {
  convoy: {
    name: 'Konvojen',
    full: true,
    items: ['THE CONVOY CODES', 'A LEDGER', 'A SEALED CRATE', 'A PAY CHIT', 'A SIGNET RING', 'A ROUTE CARD'],
    hooks: [
      'Eleven ships left port together as the {thing} convoy. None of them arrived. ' +
        '{contact} lost {loss} on the third ship, and has been asking questions ever since. ' +
        '"The pirates were waiting at the exact jump point. Nobody guesses that. Somebody sold it."',
      'The {thing} convoy was taken whole: eleven ships, no wrecks, no distress call. ' +
        '{contact} has the only survivor\'s account, and it does not add up. "They knew our codes. ' +
        'They hailed us by name before they opened fire."',
    ],
    culprits: {
      quartermaster: {
        who: "{name}, THE CONVOY'S OWN QUARTERMASTER,",
        hint: "Only someone with the convoy's own papers could have known the jump points.",
      },
      official: {
        who: '{name}, A WARDEN CUSTOMS OFFICER,',
        hint: 'The convoy was inspected twice before it left. The second inspection was never logged.',
      },
      partner: {
        who: "{name}, {contact}'S OLD PARTNER,",
        hint: "Whoever did this knew {contact} well enough to know which ship to spare. It was not {contact}'s.",
      },
      rival: {
        who: '{name}, CAPTAIN OF {rivalShip},',
        hint: 'A ship flew escort for the convoy for the first two jumps, and then turned back. It was {rivalShip}.',
      },
    },
    methods: {
      codes: {
        clue: 'The convoy codes were not cracked. They were copied, whole, the night before the convoy left.',
        reveal: 'copied the convoy codes',
      },
      route: {
        clue: 'The route card the convoy flew by was forged. It led them straight to the pirates.',
        reveal: "forged the convoy's route",
      },
      beacon: {
        clue: "The escort's beacon went dark one jump before the attack. Someone switched it off from inside.",
        reveal: "switched off the escort's beacon",
      },
    },
    color: {
      investigation: [
        'Every dock worker has a theory about the convoy. None of them are good.',
        'A memorial board by the docks lists the crews of the convoy. Someone has left flowers under the third ship.',
        'Two Charter clerks stop talking when the crew walks past. The word "convoy" hangs in the air behind them.',
        'Insurance agents in grey coats go from bar to bar, asking about the convoy and paying nobody.',
        'Someone has scratched eleven marks into the bar counter, one for each ship of the convoy.',
      ],
      escalation: [
        'Charter and Warden patrols are watching each other now, not the pirates.',
        'Word is out that someone is asking about the convoy. The bar goes quiet when the crew walks in.',
        'A pirate ship shadows them for a jump, then turns away. Someone is keeping count.',
        'The Charter has doubled the price of an escort. Nobody can afford one now, which may be the point.',
        'An old convoy pilot at the bar drinks alone and will not say a word to anyone wearing a crew patch.',
      ],
    },
  },
  cruiser: {
    name: 'Den försvunna kryssaren',
    full: false,
    items: ['THE FLIGHT RECORDER', 'A NAV CORE', 'A CIPHER KEY', 'THE CREW MANIFEST', 'A HULL TAG'],
    hooks: [
      'The Warden cruiser {thing} vanished with all hands, and now her parts are turning up for sale. ' +
        '{contact} served aboard her once. "Ships like that don\'t just disappear. ' +
        'Somebody made her disappear."',
    ],
    culprits: {
      captain: {
        who: '{name}, HER OWN CAPTAIN,',
        hint: "The last course change was made from the bridge, with the captain's own key.",
      },
      broker: {
        who: '{name}, A CHARTER SALVAGE BROKER,',
        hint: 'Every part sold so far went through Charter salvage papers.',
      },
      rival: {
        who: '{name}, CAPTAIN OF {rivalShip},',
        hint: "A ship was seen near the cruiser's last position, just leaving. It was {rivalShip}.",
      },
    },
    methods: {
      course: {
        clue: 'She was sent off course on purpose, into a field nobody patrols.',
        reveal: 'sent her off course',
      },
      crew: {
        clue: 'Half her crew was swapped the week before she left. The new names are fake.',
        reveal: 'swapped out her crew',
      },
    },
    color: {
      investigation: ['A Warden recruiting poster in the bar still shows the {thing}. Nobody has taken it down.'],
      escalation: ['Warden patrols stop every ship that carries salvage now. They are looking for the {thing}.'],
    },
  },
  signal: {
    name: 'Signalen',
    full: false,
    items: ['A BEACON SHARD', 'A DATA SPIKE', 'A CHART FRAGMENT', 'A RELAY CORE', 'A BLACK BOX'],
    hooks: [
      'Something out in the dark is sending, and every time it does, the pirates move. ' +
        '{contact} has heard it on an old band. "It\'s not random. It\'s orders."',
    ],
    culprits: {
      operator: {
        who: '{name}, A WARDEN SIGNAL OPERATOR,',
        hint: 'The signal uses a Warden cipher, one that was retired years ago.',
      },
      hunter: {
        who: '{name}, A DRIFTER RELIC HUNTER,',
        hint: 'The relay it comes from was found by Drifters, and never reported.',
      },
      rival: {
        who: '{name}, CAPTAIN OF {rivalShip},',
        hint: 'One ship is always near when the signal starts. It is {rivalShip}.',
      },
    },
    methods: {
      relay: {
        clue: 'Someone repaired an old relay out past the lanes, and uses it to talk to the pirates.',
        reveal: 'rebuilt an old relay',
      },
      cipher: {
        clue: 'The orders are hidden in a public trade broadcast. Anyone could hear them. Nobody listened.',
        reveal: 'hid the orders in a trade broadcast',
      },
    },
    color: {
      investigation: ['Ships in the bar argue about the signal. Half of them say it is a ghost.'],
      escalation: ['The signal comes more often now, and the pirates move faster after it.'],
    },
  },
};
// Why: the same for every premise.
export const MOTIVES = {
  debt: {
    clue: 'Whoever did this owed the pirates, and owed them more than a life is worth.',
    reveal: 'to clear a debt to {villain}',
  },
  revenge: {
    clue: 'The people who lost the most here once ruined someone. That someone has been waiting a long time.',
    reveal: 'to get even with the people who once ruined them',
  },
  war: {
    clue: "The pirates did not keep what they took. They sold it to both sides. Someone wants the factions at each other's throats.",
    reveal: 'to start a war between the factions, and get rich on it',
  },
  hostage: {
    clue: 'Someone close to the traitor has been aboard a pirate ship for a year. Not as crew.',
    reveal: 'because {villain} held someone they loved',
  },
};
const NAME_CLUES = [
  'The money went through {culpritBase}, and it was signed with one name: {culprit}.',
  'One name keeps coming up, and it is always whispered: {culprit}.',
];
export const LOSSES = ['a brother', 'a sister', 'everything they owned', 'an old friend', 'a daughter'];

// The voices. Each line is in quotes in the radio, and `{case}` is what the story is about.
export const VOICES = {
  contact: {
    worried: {
      ask: "Please. I can't do this alone, and nobody else will help.",
      early: "Did you find anything? Sorry. I'll stop asking. Call me when you do.",
      good: ["Thank you. They'll remember this. So will I.", 'Good. Good. That buys us some friends, at least.'],
      bad: ["You gave it to them? I hope you know what you're doing.", 'Again? Please tell me you have a plan.'],
      last: "This is it, isn't it? Come back. All of you.",
      betray: "They had my family. I'm sorry. I'm so sorry.",
    },
    gruff: {
      ask: "I'm not asking for pity. I am asking for a name.",
      early: "Don't call me with nothing. Call me with a name.",
      good: ['Right call. Keep going.', 'Twice now. I owe you a drink.'],
      bad: ["That wasn't yours to give away.", "You're making this harder than it needs to be."],
      last: 'End it.',
      betray: "You'd have done the same. Don't look at me like that.",
    },
    dry: {
      ask: "I'd do it myself, but I'd like to live.",
      early: 'Still alive? Good. That puts you ahead of the last crew I hired.',
      good: ['Look at you, making friends.', 'Careful. People will start to trust you.'],
      bad: ['Bold. Stupid, maybe, but bold.', 'Well. That should keep things interesting.'],
      last: "If you die in there, I'm not paying.",
      betray: 'Nothing personal. It never is.',
    },
  },
  villain: {
    cold: {
      twist: 'You are asking about {case}. Stop.',
      end: 'You found the name. It changes nothing.',
    },
    mocking: {
      twist: "Little crew, big questions. I like you. That's going to make this sad.",
      end: 'So now you know. Congratulations. Come up and tell me all about it.',
    },
  },
  rival: {
    cocky: { meet: "Whatever they're paying you, I'm getting paid more to stop you." },
    weary: { meet: "Turn around. I don't want to do this either." },
  },
};
const SNUBBED = [
  '{side} will remember who you sided with.',
  'Noted. {side} has a long memory.',
  'That is twice now. {side} does not forget.',
];
const COOLED = [
  'The {short} dock officer at {base} knows what the crew did with {lost}, and makes them wait.',
  'Nobody from {side} at {base} will look the crew in the eye. Word of {lost} has got here first.',
];

// How a step opens, for each sort, and for each twist.
const OPENERS = {
  talk: [
    '{intro} keeps a corner table at {base}, back to the wall.',
    'It takes two drinks and a long wait before {intro} sits down across from the crew.',
    '{intro} meets them by the cargo lifts at {base}, where the noise covers everything.',
  ],
  acquire: [
    '{item} sits behind the counter at {base}, under a cloth. The trader knows exactly what it is.',
    'The trader at {base} has {item} in the back, and makes a show of not wanting to sell.',
  ],
  search: [
    '{wreck} hangs dark and cold, her emergency lights still blinking.',
    '{wreck} has been picked over by scavengers, but not well.',
  ],
  scan: [
    'The sensors sweep {system} twice before they find {signal}, near the edge, where the haze begins.',
    '{signal} cuts in and out on the scanner, but it is there.',
  ],
  fight: [
    '{target} turns to fight instead of running.',
    '{target} has been waiting for someone to come asking, and is not alone.',
  ],
  board: [
    'With her engines out, {targetLong} drifts. Someone aboard is still shooting.',
    'The crew of {target} seals the doors and waits for the boarders.',
  ],
  deliver: [
    '{intro} takes {carries} without a word, turns it over twice, and finally looks up.',
    '{intro} has been waiting for {carries} a long time, and it shows.',
  ],
  choose: [
    '{sideA} and {sideB} both want {carries}, and both have sent someone to {base} to say so. ' +
      'Whoever gets it will owe the crew. The other will remember.',
  ],
  raid: ['The vault of {base} lies behind three decks of pirates, and every one of them knows the crew is coming.'],
};
const TWIST_OPENERS = {
  dead:
    '{who} will not be talking. The bartender at {base} says it was an accident. ' +
    'Nobody believes the bartender. In a locker there is a note, written in a hurry.',
  betrayed:
    '{who} is waiting, but not alone. The doors seal behind the crew, and it takes a fight to get out. The money for it came from {next}.',
  fake: '{intro} turns {carries} over once and laughs, without any joy. "It\'s a copy. A good one. The real one never left {next}."',
  ambush: '{item} is barely aboard when {rivalShip} drops out of the dark beside the dock and opens fire.',
  trap: '{wreck} is bait. The moment the boarders are inside, pirate ships come out of the dust around it.',
};
// How a clue is found, for each sort.
const CLUE_WRAPS = {
  talk: ['{who} leans closer. "{clue}"', '"{clue}" {who} says it quietly, and does not say it again.'],
  deliver: ['"Fair\'s fair," {who} says. "{clue}"', 'In return, {who} tells them what they came for. "{clue}"'],
  acquire: [
    'The trader talks while wrapping it up. "{clue}"',
    'There is a note folded inside the wrapping. It says: "{clue}"',
  ],
  search: [
    'One entry in the ship\'s log was never erased: "{clue}"',
    'Taped under the captain\'s bunk is a message: "{clue}"',
  ],
  scan: [
    'Under the static, a recorded voice repeats the same thing: "{clue}"',
    'Decoded, the signal is a single message: "{clue}"',
  ],
  fight: [
    'The pilot\'s last words come over the open channel: "{clue}"',
    'In the debris, a black box is still recording. The last thing on it: "{clue}"',
  ],
  board: [
    'In the captain\'s cabin there is a letter that was never sent: "{clue}"',
    'The prisoner they find in the hold has one thing to say: "{clue}"',
  ],
};
// Where a step leads: the thing it gives, told so that the next step can be found.
const LEADS = {
  person: ['Ask for {who} at {base} in {system}.', 'There is one more name: {who}, at {base} in {system}.'],
  shop: [
    '{base} in {system} has {item} for sale, but only for as long as this lasts.',
    'Someone is selling {item} at {base} in {system}. It will not be there long.',
  ],
  wreck: [
    '{wreck} went down in {system}. What the crew wants is still aboard.',
    'The trail ends at a wreck: {wreck}, in {system}.',
  ],
  signal: [
    'Something is sending from {system}. Scan for it.',
    'Whatever this is, it is being broadcast from {system}.',
  ],
  target: ['{targetLong} is out in {system}.', '{targetLong} was last seen in {system}.'],
  item: ['The crew now has {carries}. {who} at {base} in {system} is waiting for it.'],
  itemChoice: ['The crew now has {carries}, and more than one side wants it.'],
  vault: [
    'The star map that opens the way to the end lies in the vault of {base} in {system}.',
    'Everything points to the vault of {base}, in {system}. The star map is there.',
  ],
};
// The task, as the log shows it.
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

const vary = (list, k) => list[k % list.length];
// A ship to board with its owner, if it has one.
const longTarget = (n) =>
  n.owner ? `${n.target}, THE SHIP OF ${n.owner},` : n.sort === 'board' ? `${n.target}, A COURIER,` : n.target;

// The clue that each step tells: the parts of the truth in order (how, why, which side, the name), spread over the
// story, and something about the case at the other steps. A choice tells no clue, and the clue goes to the step
// after it. Returns { index: kind }.
export function placeClues(story) {
  const n = story.steps.length;
  const kinds = ['method', 'motive', 'side', 'name'];
  const at = {};
  let last = 0;
  kinds.forEach((kind, k) => {
    let i = Math.max(last + 1, Math.round(((k + 1) * (n - 1)) / (kinds.length + 1)));
    while (i < n - 1 && story.steps[i].sort === 'choose') i++;
    at[i] = kind;
    last = i;
  });
  return at;
}

// Write every text of the story: the goal for the log, the scene, the radio calls, and the clues.
export function writeTexts(story, sectors) {
  const premise = PREMISES[story.premise];
  const { cast, truth } = story;
  const w = (id) => sectors[id].name;
  const side = (f) => FACTIONS[f].name;
  const sideOfBase = (sys, base) => {
    const entry = sectors[sys].plan.find((p) => p[3] === base);
    return entry ? entry[0] : null;
  };
  const culpritName = truth.culprit === 'rival' ? cast.rival.name : truth.name;
  const common = {
    contact: cast.contact.name,
    rivalShip: cast.rival.ship,
    villain: cast.villain.name,
    thing: story.thing,
    loss: story.loss,
    case: `the ${story.premise}`,
    culprit: culpritName,
    culpritBase: truth.base,
  };
  const culpritFull = fill(premise.culprits[truth.culprit].who, { ...common, name: culpritName });
  const clueText = (kind) => {
    if (kind === 'method') return premise.methods[truth.method].clue;
    if (kind === 'motive') return fill(MOTIVES[truth.motive].clue, common);
    if (kind === 'side') return fill(premise.culprits[truth.culprit].hint, common);
    return fill(vary(NAME_CLUES, story.seed), common);
  };
  const clueAt = placeClues(story);
  story.clues = Object.entries(clueAt).map(([i, kind]) => ({ index: Number(i), kind, text: clueText(kind) }));
  const contactVoice = VOICES.contact[cast.contact.voice];
  const villainVoice = VOICES.villain[cast.villain.voice];
  const rivalVoice = VOICES.rival[cast.rival.voice];
  /** @returns {Record<string, any>} */
  const valuesOf = (st) => ({
    ...common,
    who: st.who,
    intro: st.trade ? `${st.who}, ${st.trade},` : st.who,
    target: st.target,
    targetLong: longTarget(st),
    base: st.base,
    system: st.system != null ? w(st.system) : '',
    item: st.item,
    carries: st.carries,
    wreck: st.wreck,
    signal: st.signal,
  });
  // The step after the one at index i, on the way through `branch`.
  const nextOf = (i, branch) => {
    const n = story.steps[i + 1];
    return n ? (n.branches ? n.branches[branch] : n) : null;
  };
  const lead = (token, n, k) => {
    const list = token === 'item' && n.sort === 'choose' ? LEADS.itemChoice : LEADS[token];
    return fill(vary(list, k), valuesOf(n));
  };
  // The latest choice: the side that was left out of it is cool to the crew at its bases from then on.
  let lastChoice = null;
  // How many choices came before this one, so that the second choice gets lines of its own.
  let choices = 0;
  let villainSpoke = false;
  let rivalSpoke = false;
  const firstTwist = story.steps.findIndex((st) => st.twist);
  // The lines about the case are taken in turn, so that the same line does not come twice in a story.
  const colorUsed = {};
  const colorFor = (act) => {
    const list = premise.color[act] || [];
    colorUsed[act] = (colorUsed[act] || 0) + 1;
    return colorUsed[act] <= list.length ? list[(story.seed + colorUsed[act]) % list.length] : null;
  };
  const write = (st, i, branch) => {
    const values = valuesOf(st);
    if (st.sort === 'choose') {
      values.sideA = side(st.sides[0]);
      values.sideB = side(st.sides[1]);
    }
    const k = story.seed + i;
    const scene = [];
    const radio = [];
    const n = nextOf(i, branch);
    if (st.act === 'hook') {
      scene.push(fill(`${cast.contact.name}, ${cast.contact.trade}, is waiting at {base}.`, values));
      scene.push(fill(vary(premise.hooks, story.seed), values));
      scene.push(`"${contactVoice.ask}"`);
    } else if (st.twist) {
      values.next = n ? n.owner || n.target || n.who || n.base || '' : '';
      scene.push(fill(TWIST_OPENERS[st.twist], values));
    } else scene.push(fill(vary(OPENERS[st.sort], k), values));
    // Shown only if the crew did not give the item to the side that holds this base (R-1224).
    const holder = lastChoice && st.base ? sideOfBase(st.system, st.base) : null;
    st.cooled =
      holder && lastChoice.sides.includes(holder)
        ? {
            choice: lastChoice.index,
            side: holder,
            text: fill(vary(COOLED, k), {
              ...values,
              side: side(holder),
              short: FACTIONS[holder].short,
              lost: lastChoice.carries,
            }),
          }
        : null;
    if (clueAt[i]) scene.push(fill(vary(CLUE_WRAPS[st.sort], k), { ...values, clue: clueText(clueAt[i]) }));
    else {
      const line = colorFor(st.act);
      if (line) scene.push(fill(line, values));
    }
    if (st.sort === 'raid') {
      scene.push(
        `Beside the star map lies the rest of the story. ${culpritFull} ${premise.methods[truth.method].reveal} ` +
          `${fill(MOTIVES[truth.motive].reveal, common)}. ${cast.villain.name} paid for all of it.`,
      );
      scene.push(`With the map, the way to ${w(story.end)} is open.`);
      radio.push({ from: cast.villain.name, text: fill(villainVoice.end, common) });
    } else if (st.sort === 'choose') {
      st.options = st.sides.map((f, j) => {
        const b = story.steps[i + 1].branches[j];
        const mine = f === cast.contact.side;
        return {
          side: f,
          text:
            `Give it to ${side(f)}: +${story.standing.gain} with them, ` +
            `-${story.standing.loss} with ${side(st.sides[1 - j])}. ${lead(st.gives[j], b, k)}`,
          radio: [
            ...(story.contactOut > i
              ? [{ from: cast.contact.name, text: `"${vary(mine ? contactVoice.good : contactVoice.bad, choices)}"` }]
              : []),
            {
              from: side(st.sides[1 - j]),
              text: `"${fill(SNUBBED[(choices + (choices ? 1 : 0)) % SNUBBED.length], { side: side(st.sides[1 - j]) })}"`,
            },
          ],
        };
      });
    } else if (n) scene.push(lead(st.gives, n, k));
    // The radio after the step.
    if (st.twist === 'betrayed' && st.isContact) radio.push({ from: cast.contact.name, text: contactVoice.betray });
    if (i === firstTwist && !villainSpoke) {
      radio.push({ from: cast.villain.name, text: fill(villainVoice.twist, common) });
      villainSpoke = true;
    }
    if (!rivalSpoke && (st.target === cast.rival.ship || st.twist === 'ambush')) {
      radio.unshift({ from: cast.rival.ship, text: rivalVoice.meet });
      rivalSpoke = true;
    }
    if (story.contactOut > i) {
      if (i === 1) radio.push({ from: cast.contact.name, text: contactVoice.early });
      if (n && n.sort === 'raid') radio.push({ from: cast.contact.name, text: contactVoice.last });
    }
    st.goal = fill(GOALS[st.sort], values);
    st.fallback = FALLBACKS[st.sort];
    st.scene = scene;
    st.radio = radio.map((r) => ({ from: r.from, text: `"${r.text}"` }));
    st.clue = clueAt[i] ? clueText(clueAt[i]) : null;
    st.text = [
      ...scene,
      ...(st.cooled ? [st.cooled.text] : []),
      ...(st.options || []).map((o) => o.text),
      ...st.radio.map((r) => r.text),
    ].join(' ');
  };
  story.steps.forEach((st, i) => {
    if (st.branches) st.branches.forEach((b, j) => write(b, i, j));
    else write(st, i, 0);
    if (st.sort === 'choose') {
      lastChoice = st;
      choices++;
    }
  });
  story.reveal = `${culpritFull} ${premise.methods[truth.method].reveal} ${fill(MOTIVES[truth.motive].reveal, common)}.`;
}
