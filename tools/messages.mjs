// Writes docs/messages.md (D-256): every message the game can show, what kind it is and who sees it, read out of
// src/events.js and src/render/hud.js, so that the list stays true when messages change.
//   node tools/messages.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const events = readFileSync(root + 'src/events.js', 'utf8');
const hud = readFileSync(root + 'src/render/hud.js', 'utf8');

const block = (text, from, to) => {
  const i = text.indexOf(from);
  return text.slice(i, text.indexOf(to, i));
};
const toasts = block(events, 'const TOAST = {', '\n};');
const personal = new Set([...block(events, 'const PERSONAL = new Set([', ']);').matchAll(/'(\w+)'/g)].map((m) => m[1]));
const forPost = Object.fromEntries(
  [...block(events, 'const FOR_POST = {', '};').matchAll(/(\w+): '(\w+)'/g)].map((m) => [m[1], m[2]]),
);
const KIND = { BAD: 'fara', WARM: 'varning', GOOD: 'bra', LOOT: 'byte', TECH: 'teknik' };

const rows = [];
for (const m of toasts.matchAll(/^ {2}(\w+): \(([^)]*)\) =>\s*([\s\S]*?)(?=^ {2}\w+: \(|$(?![\s\S]))/gm)) {
  const [, type, , body] = m;
  const plain = body.replace(/\$\{[^}]*\}/g, '…');
  const texts = [...plain.matchAll(/['`]([^'`]{3,})['`]/g)].map((t) => t[1]);
  const color = (body.match(/\b(BAD|WARM|GOOD|LOOT|TECH)\b/) || [])[1];
  const who = personal.has(type) ? 'bara den det gäller' : forPost[type] ? `bara ${forPost[type]}` : 'alla';
  const text = /^\s*null/.test(body) ? '(inget meddelande)' : texts.join(' / ') || '(sätts i koden)';
  rows.push(`| ${type} | ${text.replace(/\|/g, '/')} | ${KIND[color] || '–'} | ${who} |`);
}

const lines = (fn) =>
  [
    ...block(hud, `function ${fn}(`, '\n}\n')
      .replace(/\$\{[^}]*\}/g, '…')
      .matchAll(/text: [`']([^`']+)[`']/g),
  ].map((m) => m[1]);

const out = `# Meddelanden i spelet (D-256)

Skapad av \`node tools/messages.mjs\` ur koden. Ändra inte för hand: kör verktyget igen när meddelanden ändras.

Spelet visar meddelanden på fyra ställen (D-187, besked MD1–MD5 2026-11-21):

- **Fara**, överst i mitten. Den trängs aldrig undan och visas för alla.
- **Läge**, under faran när det finns plats. Det som gäller en post visas bara för den.
- **Sensorremsan**, uppe till höger under minikartan: det skeppet vet om omgivningen.
- **Händelser**, tillfälliga rader under raderna överst. Alla sparas också i loggen på L, under SHIP'S MESSAGES.

## Fara

- anfall på en egen station med risk HIGH
- skeppets egen varning: en del kritisk, skrovet under 30 %, slut på bränsle
- fiendelarmet när fienderna är här (kräver Enemy Alarm)

## Läge

${lines('stateLines')
  .map((t) => `- ${t}`)
  .join('\n')}
- en överladdning som väntar på posten
- dockad vid en plats (för alla): vem som är ombord, låset, teleportern

## Sensorremsan

${lines('sensorLines')
  .map((t) => `- ${t}`)
  .join('\n')}
- fiendelarmet med tid kvar (kräver Enemy Alarm)
- anfall på en egen station med risk LOW eller MEDIUM

## Händelser (${rows.length})

| Händelse | Text | Sort | Vem ser den |
|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(root + 'docs/messages.md', out);
console.log(`docs/messages.md: ${rows.length} events`);
