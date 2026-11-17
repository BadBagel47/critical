# Underlag för musiken (F-048)

Det här är allt en agent behöver för att göra musiken till Critical ST8 medan annat arbete pågår i samma repo. Läs också [AGENTS.md](../AGENTS.md) och [HANDOFF.md](../HANDOFF.md) först.

## Uppdraget

Musik för spelets olika lägen, skapad med kod. Användarens ord: "Musik för de olika lägena: startskärm, vanligt läge i rymden, varning för fiender, fientlig attack, lootattack och vänliga stationer" och "Jag tänker att vi använder musik som skapas med kod. Det passar spelstilen."

Ljudeffekterna (F-049) ingår inte. De ligger kvar som en egen punkt.

## Fasta förutsättningar

- Inga ljudfiler. Allt ljud skapas i webbläsaren med Web Audio API. Det är ett beslut i HANDOFF.md.
- Inget byggsteg och inga beroenden. Ren JavaScript som webbläsaren läser direkt.
- Spelet får inte ladda något från andra tjänster. `node tests/outside.mjs` kontrollerar det.
- Musiken får aldrig ändra spelets tillstånd. Den får läsa det den får skickat till sig, inget mer.
- Musiken ligger utanför `src/sim/`. Där får man använda `Math.random()` och verklig tid fritt. Inne i `src/sim/` är det förbjudet, och ett test vaktar det.
- Ljudet kan först starta efter en knapptryckning eller ett klick. Det sköter `initAudio()` i `src/audio.js` redan. Före det finns ingen ljudmotor, och musiken måste tåla det.
- Tangenten N slår av och på allt ljud. Valet sparas i webbläsaren under `critical-muted`. Musiken ska följa det, och gör det av sig själv om den kopplas in som beskrivs nedan.
- Varje spelare ska kunna ställa nivån på ljudeffekter och musik var för sig i spelets inställningar (F-105). Det byggs inte av musikagenten. Nivån för musik kommer att sättas på `out` från `musicOutput()`, så musiken behöver inte göra något annat än att koppla allt sitt ljud dit.
- All text i spelet är på engelska. Kod, kommentarer och commits är på engelska.
- All musik komponeras från grunden. Inga melodier från befintliga spel, filmer eller låtar, inte heller "i samma stil som" en namngiven låt så nära att den går att känna igen.

## Stilen

Spelet är pixelkonst uppifrån med dämpade färger, där stark färg bara används för ljus, skott och loot. Ljudeffekterna är korta syntljud med fyrkants-, sågtands- och triangelvågor. Musiken bör höra hemma i samma värld: syntar och enkla vågformer, hellre stämning än melodi som tar över, och aldrig så stark att den dränker effekterna.

Det här är utgångspunkter och inte krav. Användaren har inte bestämt stilen i detalj, så det första som levereras bör vara något att lyssna på och tycka till om.

## Lägena

Spelet talar om vilket slags ögonblick spelaren är i. Det räknas ut i `src/scene.js`, som redan finns och har tester.

| Scen | När | Användarens ord |
|---|---|---|
| `title` | Startskärmen | startskärm |
| `space` | Skeppet flyger och inget händer | vanligt läge i rymden |
| `warning` | Fiender är kända men inte framme: ett skepp i sikte, enemy alarm eller ett nödanrop | varning för fiender |
| `combat` | Fiender är nära, eller skeppet träffades för några sekunder sedan | fientlig attack |
| `boarding` | Spelaren är inne i ett vrak eller en fientlig station | lootattack |
| `station` | Dockad vid, eller inne på, en vänlig eller neutral station | vänliga stationer |
| `lost` | Skeppet är förstört | |

Att tänka på:
- Scenen kan växla snabbt fram och tillbaka, till exempel mellan `warning` och `combat` när en fiende cirklar. Musiken behöver egen tröghet, så att den inte hackar mellan två stycken.
- Övergångar ska vara mjuka. Inga tvära klipp.
- `combat` kan börja mitt i `boarding`: skeppet kan bli anfallet medan spelaren är inne i ett vrak. Då gäller `boarding`, eftersom scenen följer var spelaren är.
- Det finns fem sektorer i dag, numrerade från 0. Varje sektor får gärna en egen färg i musiken. Antalet kommer att bli valfritt senare (D-089), så utgå från numret och hårdkoda inte fem.
- Spelet kan vara pausat. Då är det rimligt att musiken dämpas eller filtreras, men det är ett förslag.
- När sista bossen är förstörd sätts `won`. Det kan få en egen markering.

## På väg in

Bordningen kommer att få två lägen (F-102 och F-107 i BACKLOG.md, inte byggda än). Användarens ord: "När man går in för att loota på ett fientligt ställe så ska vi ha roterande röda ljus och hela stället är mörkare än normalt. Detta är för att stället är i lockdown mode", och "först är stealth som gäller tills man blir upptäckt av patrullerande vakter".

- Smygande: stället är i lockdown, mörkt med röda ljus, och spelaren är inte upptäckt.
- Larm: spelaren är upptäckt och vakterna jagar.

I dag finns bara scenen `boarding`. När lägena byggs får scenen troligen ett syskon, till exempel `alarm`. Bygg därför så att en ny scen är lätt att lägga till, och låt `boarding` passa för smygande: spänt och dämpat snarare än strid.

## Hur musiken kopplas in

Kopplingen är redan gjord. Det enda som saknas är innehållet i en fil.

- **`src/music.js`** är musikens fil. Där finns i dag en tom `updateMusic(info, dt)`. Den anropas en gång per bildruta från `src/main.js`, även på startskärmen och när spelet är pausat.
  - `info.scene`: scenen enligt tabellen ovan.
  - `info.sector`: vilken sektor skeppet är i, från 0.
  - `info.paused`: spelet är pausat.
  - `info.won`: sista bossen är förstörd.
  - `dt`: verkliga sekunder sedan förra anropet.
- **`musicOutput()`** i `src/audio.js` ger `{ context, out }` när ljudet har startat, och `null` innan dess. `context` är spelets `AudioContext`. Koppla all musik till `out`. Den ligger under huvudvolymen, så N tystar musiken utan extra kod.
- Huvudvolymen är 0,22. Ljudeffekterna ligger på ungefär 0,1 till 0,3 av den. Musiken bör ligga tydligt under effekterna.

Tekniska råd:
- Schemalägg toner en kort stund framåt mot `context.currentTime`. Lita inte på att `updateMusic` anropas jämnt. Bildrutorna kommer ojämnt och upphör helt när fliken är dold.
- Schemalägg bara en kort stund framåt, runt en kvarts sekund. Då tystnar musiken av sig själv när fliken döljs, och det hörs inte en lång svans av gamla toner när den visas igen.
- Håll antalet ljudkällor som spelar samtidigt lågt. Spelet ritar mycket, och musiken får inte få det att hacka.
- Stäng av och koppla loss ljudkällor som spelat klart.

## Filer och krockar

Flera agenter arbetar i repot samtidigt. För att det inte ska krocka:

- Ändra bara i `src/music.js`, och lägg egna tester i `tests/music.test.js`. Fler egna filer går bra, till exempel `src/music/` för stycken och instrument.
- Ändra inte i `src/main.js`, `src/audio.js`, `src/scene.js` eller något under `src/sim/`. Behövs något därifrån, till exempel en ny scen eller mer information i `info`, skriv det som en punkt i BACKLOG.md och säg det till användaren, så görs det av den som arbetar med resten.
- I BACKLOG.md: rör bara raden för F-048 och flytta den till "Klart" när den är färdig. Ändra inte "Proposed runs".
- I HANDOFF.md: lägg till en kort rad under "Kod" om hur musiken är uppbyggd. Rör inget annat.
- Synka med main innan arbetet börjar och igen före varje push. Uppstår en konflikt i BACKLOG.md eller HANDOFF.md: behåll den andra agentens ändringar och lägg in de egna raderna på nytt.
- Arbetsgrenen ska börja med `claude/`. Då slås den ihop med main av sig själv, och main publiceras direkt på https://badbagel47.github.io/critical/.

## Test och kontroll

- `npm test` ska gå igenom. Där finns tester som vaktar radlängd (högst 140 tecken) och att spellogiken inte beror på något utanför `src/sim/`.
- `npm run format` formaterar koden med Prettier. Kör det före varje commit.
- `npm run serve` och sedan `npm run smoke` provkör spelet i en webbläsare. Det ska gå igenom utan fel i konsolen.
- `node tests/outside.mjs` ska visa att inget laddas från andra tjänster.
- Logik som inte behöver ljudmotorn, till exempel hur ett stycke byggs upp eller hur scenbyten trögas, bör ligga i rena funktioner och testas i `tests/music.test.js`.
- En agent kan inte lyssna. Säg därför tydligt i rapporten att musiken är byggd och provkörd utan fel men inte lyssnad på, och be användaren lyssna. Det som går att kontrollera utan öron är att det inte blir fel i konsolen, att ljudnivån håller sig under en rimlig gräns och att antalet ljudkällor inte växer över tid.
- Gör det lätt för användaren att lyssna på varje scen för sig. I webbläsarens konsol finns `window.__critical` med spelets tillstånd. Testläget (T på startskärmen, eller `?test` sist i adressen) ger alla uppgraderingar och stjärnkartor från start.

## Besked från användaren (2026-11-14)

- Startskärmen ska ha en melodi som fastnar och ger spelet en identitet. Av tre förslag valdes Signal (2026-11-14).
- Musiken finns i uppsättningar, var och en med eget introtema och ett stycke per scen. Uppsättning A (temat Signal) används och ska behållas tills användaren uttryckligen säger att den ska bytas (2026-11-14). Uppsättning B (temat Horizon) är ett fritt förslag från agenten att jämföra med. Inga låtar får vara för korta.
- Introtemat återkommer sparsamt och i förklädnad, som ett tema i en film: långsamt och dovt i rymden, varmt på stationer, fullt ut i dur vid vinst och långsamt i moll vid förlust, där det bryts av. Inte i strid, smyg eller larm.
- Rymden är mest stämning.
- Bordning har två lägen: smyg med spänning, där man väntar på att allt ska braka loss, och larm som höjer pulsen. Spelet skiljer inte på dem än, se F-120.
- Varje sektor har en egen färg: ljusare och lugnare i början, mörkare, råare och lite snabbare längre in.
- Larmet under bordning är en jakt som höjer pulsen utan larmljud. En version med siren prövades och valdes bort (2026-11-14).
- Introlåten är ungefär en och en halv minut innan den börjar om (2026-11-14).
- Introlåten ska vara melodisk och inte bara upprepa samma fras. De lugna delarna ska finnas kvar (2026-11-17). Temat Signal får därför sällskap av egna melodier: ett svar, en mellandel och ett slut.
- Vinsten har ett eget stycke som knyter an till introt. Förlusten har den korta mollvarianten.

## Öppna frågor till användaren

- Hur låter uppsättning B jämfört med A?
