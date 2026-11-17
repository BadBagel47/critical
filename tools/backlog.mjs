// A tool for the backlog (F-228): the steps that the agent rules ask for, done the same way every time, so that
// nothing is forgotten or mistyped when they are done by hand.
//
//   node tools/backlog.mjs start F-090 D-223      mark as in progress today ("Pågår YYYY-MM-DD")
//   node tools/backlog.mjs done D-223 "what was done"
//                                                 move to the done section with today's date, and take it out of
//                                                 the proposed runs. Without a text the row keeps its own
//   node tools/backlog.mjs park F-084             set aside for later: to the parked section, out of the proposed runs
//   node tools/backlog.mjs letters                give the run groups new letters from A (after Z: AA, AB …)
//   node tools/backlog.mjs next F                 the next free ID of a kind (B bug, F feature, D design)
//   node tools/backlog.mjs check                  say what is out of order, and exit with 1 if anything is
//
// `--date YYYY-MM-DD` sets the date instead of today. Every change writes BACKLOG.md and runs the check after.
// The functions take and give the text of the backlog, so that the tests can use them without a file.
import { readFileSync, writeFileSync } from 'node:fs';

const ID = /^[BFD]-\d{3,}$/;
const ROW = /^\| ([BFD]-\d{3,}) \|(.*)\| ([^|]*) \|$/;
// The tables with work that is not done, in order. A row there can be started.
const OPEN = ['Hög', 'Medel', 'Låg'];
const PARKED = 'Parkerat';
const DONE = 'Klart';

// The sections of the backlog: each `## Name` heading, the lines under it, and where they are.
function sections(text) {
  const lines = text.split('\n');
  const out = [];
  lines.forEach((l, i) => {
    if (l.startsWith('## ')) out.push({ name: l.slice(3).trim(), start: i, end: lines.length });
  });
  out.forEach((s, k) => {
    if (out[k + 1]) s.end = out[k + 1].start;
  });
  return { lines, out };
}
const sectionOf = (out, i) => out.find((s) => i >= s.start && i < s.end);

// Every row of the tables: its ID, what it says, its status (the last column) and where it is.
export function rows(text) {
  const { lines, out } = sections(text);
  const list = [];
  lines.forEach((l, i) => {
    const m = ROW.exec(l);
    if (!m) return;
    const s = sectionOf(out, i);
    list.push({ id: m[1], what: m[2].trim(), status: m[3].trim(), section: s ? s.name : null, line: i });
  });
  return list;
}

// The run groups in "Proposed runs": the heading line of each, its ID lines, and where it is.
export function groups(text) {
  const { lines, out } = sections(text);
  const runs = out.find((s) => s.name === 'Proposed runs');
  if (!runs) return [];
  const list = [];
  for (let i = runs.start; i < runs.end; i++) {
    const m = /^\*\*([A-Z]{1,2})\*\* – (.*)$/.exec(lines[i]);
    if (m) {
      list.push({ letter: m[1], rest: m[2], line: i, ids: [] });
      continue;
    }
    const item = /^- ([BFD]-\d{3,}) – /.exec(lines[i]);
    if (item && list.length) list[list.length - 1].ids.push({ id: item[1], line: i });
  }
  return list;
}

// A, B … Z, AA, AB … (agent rules, "Proposed runs").
export const letterOf = (k) => (k < 26 ? String.fromCharCode(65 + k) : letterOf(Math.floor(k / 26) - 1) + letterOf(k % 26));

// Give the groups new letters from A, in the order they stand.
export function reletter(text) {
  const lines = text.split('\n');
  groups(text).forEach((g, k) => {
    lines[g.line] = `**${letterOf(k)}** – ${g.rest}`;
  });
  return lines.join('\n');
}

// Take IDs out of the proposed runs. A group that is left with none is taken away, with the blank line after it.
// The groups get new letters after.
export function unpropose(text, ids) {
  const lines = text.split('\n');
  const drop = new Set();
  for (const g of groups(text)) {
    const gone = g.ids.filter((x) => ids.includes(x.id));
    for (const x of gone) drop.add(x.line);
    if (gone.length && gone.length === g.ids.length) {
      drop.add(g.line);
      if (lines[g.line + g.ids.length + 1] === '') drop.add(g.line + g.ids.length + 1);
    }
  }
  return reletter(lines.filter((_, i) => !drop.has(i)).join('\n'));
}

function rowFor(text, id) {
  if (!ID.test(id)) throw new Error(`${id} is not an ID like F-123`);
  const found = rows(text).filter((r) => r.id === id);
  if (!found.length) throw new Error(`${id} is not in the backlog`);
  if (found.length > 1) throw new Error(`${id} is in the backlog more than once`);
  return found[0];
}
// Put a row at the end of a section's table.
function addRow(lines, name, row) {
  const { out } = sections(lines.join('\n'));
  const s = out.find((x) => x.name === name);
  if (!s) throw new Error(`there is no section "${name}"`);
  let at = s.end;
  while (at > s.start && lines[at - 1].trim() === '') at--;
  lines.splice(at, 0, row);
}

// Mark as in progress, with the date (agent rules, "Several agents in the same repo"). One that is already in
// progress is left alone: it may be another agent's.
export function start(text, ids, date) {
  const lines = text.split('\n');
  for (const id of ids) {
    const r = rowFor(text, id);
    if (!OPEN.includes(r.section)) throw new Error(`${id} is under ${r.section}, not among the work to do`);
    if (r.status.startsWith('Pågår')) throw new Error(`${id} is already marked: ${r.status}`);
    lines[r.line] = `| ${id} |${lines[r.line].split('|').slice(2, -2).join('|')}| Pågår ${date} |`;
  }
  return lines.join('\n');
}

// Move to the done section with the date, and out of the proposed runs (agent rules, "Documentation" and "Workflow").
export function finish(text, ids, date, what = null) {
  let lines = text.split('\n');
  for (const id of ids) {
    const r = rowFor(lines.join('\n'), id);
    if (r.section === DONE) throw new Error(`${id} is already done`);
    lines.splice(r.line, 1);
    addRow(lines, DONE, `| ${id} | ${what || r.what} | ${date} |`);
  }
  return unpropose(lines.join('\n'), ids);
}

// Set aside for later: to the parked section with the status Parkerad, and out of the proposed runs.
export function park(text, ids) {
  const lines = text.split('\n');
  for (const id of ids) {
    const r = rowFor(lines.join('\n'), id);
    if (!OPEN.includes(r.section)) throw new Error(`${id} is under ${r.section}, not among the work to do`);
    lines.splice(r.line, 1);
    addRow(lines, PARKED, `| ${id} | ${r.what} | Parkerad |`);
  }
  return unpropose(lines.join('\n'), ids);
}

// The next free number of the shared series, with the kind's letter before it (agent rules, "ID system").
export function nextId(text, kind) {
  if (!['B', 'F', 'D'].includes(kind)) throw new Error('the kind is B, F or D');
  const numbers = (text.match(/\b[BFD]-(\d{3,})\b/g) || []).map((x) => Number(x.slice(2)));
  return `${kind}-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
}

// What is out of order. An empty list when all is well.
export function check(text) {
  const problems = [];
  const all = rows(text);
  const seen = new Map();
  for (const r of all) {
    if (seen.has(r.id)) problems.push(`${r.id} is in the backlog twice, under ${seen.get(r.id)} and ${r.section}`);
    seen.set(r.id, r.section);
    if (r.section === DONE && !/^\d{4}-\d{2}-\d{2}/.test(r.status)) problems.push(`${r.id} is done but has no date`);
    if (OPEN.includes(r.section) && r.status.startsWith('Pågår') && !/^Pågår \d{4}-\d{2}-\d{2}$/.test(r.status))
      problems.push(`${r.id} is in progress without a date`);
  }
  groups(text).forEach((g, k) => {
    if (g.letter !== letterOf(k)) problems.push(`the group ${g.letter} should be ${letterOf(k)}`);
    if (!g.ids.length) problems.push(`the group ${g.letter} has no IDs`);
    for (const { id } of g.ids) {
      const where = seen.get(id);
      if (!where) problems.push(`${id} in group ${g.letter} is not in the backlog`);
      else if (where === DONE) problems.push(`${id} in group ${g.letter} is already done`);
      else if (where === PARKED) problems.push(`${id} in group ${g.letter} is parked`);
    }
  });
  return problems;
}

// ---------- the command ----------
const today = () => new Date().toISOString().slice(0, 10);
function main(argv) {
  const file = new URL('../BACKLOG.md', import.meta.url);
  const args = [...argv];
  const at = args.indexOf('--date');
  const date = at >= 0 ? args.splice(at, 2)[1] : today();
  const [command, ...rest] = args;
  const text = readFileSync(file, 'utf8');
  let next = null;
  if (command === 'start') next = start(text, rest, date);
  else if (command === 'done') {
    const ids = rest.filter((x) => ID.test(x));
    const what = rest.filter((x) => !ID.test(x)).join(' ') || null;
    next = finish(text, ids, date, what);
  } else if (command === 'park') next = park(text, rest);
  else if (command === 'letters') next = reletter(text);
  else if (command === 'next') {
    console.log(nextId(text, rest[0]));
    return 0;
  } else if (command !== 'check') {
    console.log('use: start, done, park, letters, next or check. See the top of tools/backlog.mjs.');
    return 1;
  }
  if (next !== null && next !== text) writeFileSync(file, next);
  const problems = check(next ?? text);
  for (const p of problems) console.log('  ' + p);
  console.log(problems.length ? `${problems.length} things out of order in BACKLOG.md` : 'BACKLOG.md is in order');
  return problems.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('backlog.mjs')) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.log(e.message);
    process.exitCode = 1;
  }
}
