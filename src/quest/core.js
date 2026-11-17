// The quest engine's core (D-277): the part that knows nothing of any game, so that it can move to a library of
// its own when another game needs it. A game gives it a catalogue of sorts of steps and a skeleton, and gets back a
// chain of steps that hangs together. Handwritten quests use the same chain and the same checks.
//
//   - A step has a sort, and says what it needs and what it gives (a token, such as "person" or "item"). The next
//     step needs what the one before gave.
//   - A skeleton is a list of slots. Each slot has a kind: 'start' (needs nothing), 'normal', 'twist', 'choose'
//     (two options that lead to two branches in the next slot, which both give the same thing) and 'end' (takes the
//     final token and gives the end token).
//   - The chain is searched for depth first in a random order, so that a slot that cannot be filled sends the
//     search back to try something else before it.
//   - The same sort never comes twice in a row.
//
// The catalogue:
//   sorts       { id: { needs, gives: [tokens] } }
//   twists      { id: { sort, gives: [tokens] } }: a step of an ordinary sort where something is not what it seemed
//   start       the sort of the first step
//   choice      the sort of a choice
//   end         the sort of the last step
//   finalToken  what the last step needs. Only the step before the last gives it
//   endToken    what the last step gives
//   sortWeight  { sort: weight }, how much a sort is wanted (1 if not given)
//   giveWeight  { token: weight }, how much a token is wanted as what a step gives
// `random` is a function that gives a number from 0 up to 1, from the game's own random numbers.

export const pick = (random, list) => list[Math.floor(random() * list.length)];

// A pick where each entry has a weight.
export function weighted(random, list, weight) {
  const total = list.reduce((sum, x) => sum + weight(x), 0);
  let r = random() * total;
  for (const x of list) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

// The entries of `list` in a random order, those with more weight more often first.
export function order(random, list, weight) {
  const left = [...list];
  const out = [];
  while (left.length) {
    const x = weighted(random, left, weight);
    out.push(x);
    left.splice(left.indexOf(x), 1);
  }
  return out;
}

// Fill `{name}` in a text from `values`. A name without a value is left as it is, so that the checks find it.
export const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (all, key) => (values[key] != null ? String(values[key]) : all));

// What may stand in a slot of `kind`, for a step that needs `need`: a list of { sort, twist, gives }.
export function candidates(catalog, kind, need) {
  const { sorts, twists, start, choice, end, finalToken, endToken } = catalog;
  const ordinary = (g) => g !== finalToken && g !== endToken;
  if (kind === 'start') return [{ sort: start, twist: null, gives: sorts[start].gives.filter(ordinary) }];
  if (kind === 'end') return need === finalToken ? [{ sort: end, twist: null, gives: [endToken] }] : [];
  if (kind === 'choose')
    return need === sorts[choice].needs
      ? [{ sort: choice, twist: null, gives: sorts[choice].gives.filter(ordinary) }]
      : [];
  if (kind === 'twist')
    return Object.entries(twists || {})
      .filter(([, t]) => sorts[t.sort].needs === need)
      .map(([id, t]) => ({ sort: t.sort, twist: id, gives: t.gives.filter(ordinary) }));
  return Object.entries(sorts)
    .filter(([id, c]) => id !== choice && id !== end && c.needs === need)
    .map(([id, c]) => ({ sort: id, twist: null, gives: c.gives.filter(ordinary) }));
}

// Whether the slot `next` can take `token`, with a sort other than those in `not`.
function canTake(catalog, next, token, not) {
  if (!next) return token === catalog.endToken;
  if (token === catalog.finalToken) return next.kind === 'end';
  return candidates(catalog, next.kind, token).some((c) => !not.includes(c.sort));
}
// What a candidate may give here: before the last step only the final token.
function givesHere(catalog, c, next) {
  if (next && next.kind === 'end') return catalog.sorts[c.sort].gives.filter((g) => g === catalog.finalToken);
  return c.gives;
}

// A chain for a skeleton: one entry per slot with { act, kind, sort, twist, needs, gives }. A choice gives a list of
// two tokens, and the slot after it is { act, kind, branches: [a, b] }. Null if no chain fits.
export function planChain(random, skeleton, catalog) {
  const sortWeight = catalog.sortWeight || {};
  const giveWeight = catalog.giveWeight || {};
  const weight = (c, used) =>
    ((sortWeight[c.sort] || 1) / (1 + (used[c.sort] || 0))) * (c.twist ? 1.5 : 1) * (giveWeight[c.give] || 1);
  const bump = (used, list) => {
    const next = { ...used };
    for (const x of list) next[x] = (next[x] || 0) + 1;
    return next;
  };
  let budget = 4000;
  const go = (i, need, not, used) => {
    if (i === skeleton.length) return need === catalog.endToken ? [] : null;
    if (--budget < 0) return null;
    const here = skeleton[i];
    const next = skeleton[i + 1];
    if (here.kind === 'choose') {
      const [choice] = candidates(catalog, 'choose', need);
      if (!choice || !next) return null;
      const after = skeleton[i + 2];
      const pairs = [];
      for (const ta of choice.gives)
        for (const tb of choice.gives) {
          if (ta >= tb) continue;
          for (const a of candidates(catalog, next.kind, ta))
            for (const b of candidates(catalog, next.kind, tb)) {
              if (a.sort === b.sort || not.includes(a.sort) || not.includes(b.sort)) continue;
              for (const g of givesHere(catalog, a, after))
                if (givesHere(catalog, b, after).includes(g) && canTake(catalog, after, g, [a.sort, b.sort]))
                  pairs.push({ ta, tb, a, b, g });
            }
        }
      for (const p of order(random, pairs, (x) => weight(x.a, used) * weight(x.b, used) * (giveWeight[x.g] || 1))) {
        const rest = go(i + 2, p.g, [p.a.sort, p.b.sort], bump(used, [choice.sort, p.a.sort, p.b.sort]));
        if (!rest) continue;
        return [
          { ...here, sort: choice.sort, twist: null, needs: need, gives: [p.ta, p.tb] },
          {
            ...next,
            branches: [
              { act: next.act, kind: next.kind, sort: p.a.sort, twist: p.a.twist, needs: p.ta, gives: p.g },
              { act: next.act, kind: next.kind, sort: p.b.sort, twist: p.b.twist, needs: p.tb, gives: p.g },
            ],
          },
          ...rest,
        ];
      }
      return null;
    }
    const options = [];
    for (const c of candidates(catalog, here.kind, need)) {
      if (not.includes(c.sort)) continue;
      for (const g of givesHere(catalog, c, next)) {
        if (!canTake(catalog, next, g, [c.sort])) continue;
        if (next && next.kind === 'choose' && g !== catalog.sorts[catalog.choice].needs) continue;
        options.push({ ...c, give: g });
      }
    }
    for (const c of order(random, options, (x) => weight(x, used))) {
      const rest = go(i + 1, c.give, [c.sort], bump(used, [c.sort]));
      if (rest) return [{ ...here, sort: c.sort, twist: c.twist, needs: need, gives: c.give }, ...rest];
    }
    return null;
  };
  return go(0, null, [], {});
}

// A handwritten chain: the steps as the author wrote them, each with at least { sort, needs, gives }, and after a
// choice an entry { branches: [a, b] }. Anything else the author wrote stays on the step. The same checks as for a
// generated chain apply (checkChain).
export function writtenChain(steps) {
  return steps.map((st, i) =>
    st.branches
      ? { index: i, ...st, branches: st.branches.map((b) => ({ index: i, twist: null, ...b })) }
      : { index: i, twist: null, ...st },
  );
}

// Every way through a chain, as lists of steps: one for each combination of the choices.
export function pathsOf(chain) {
  let paths = [[]];
  for (const st of chain) {
    if (st.branches) paths = paths.flatMap((p) => st.branches.map((b) => [...p, b]));
    else paths = paths.map((p) => [...p, st]);
  }
  return paths;
}

// What is wrong with a chain, on every way through it: an empty list when each step gets what it needs from the one
// before, no sort comes twice in a row, the first step needs nothing and the last gives the end token.
export function checkChain(chain, catalog) {
  const problems = [];
  for (const path of pathsOf(chain)) {
    if (!path.length) return ['the chain is empty'];
    if (path[0].needs != null) problems.push(`the first step needs ${path[0].needs}`);
    const last = path[path.length - 1];
    if (last.gives !== catalog.endToken) problems.push(`the last step gives ${last.gives}, not ${catalog.endToken}`);
    path.forEach((st, k) => {
      if (!catalog.sorts[st.sort]) problems.push(`step ${k + 1} has an unknown sort, ${st.sort}`);
      const prev = path[k - 1];
      if (!prev) return;
      if (prev.sort === st.sort) problems.push(`steps ${k} and ${k + 1} are both ${st.sort}`);
      const gave = Array.isArray(prev.gives) ? prev.gives : [prev.gives];
      if (!gave.includes(st.needs))
        problems.push(`step ${k + 1} needs ${st.needs}, but step ${k} gives ${gave.join(' or ')}`);
    });
  }
  return [...new Set(problems)];
}
