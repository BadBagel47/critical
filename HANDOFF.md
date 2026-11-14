# HANDOFF

Rules version: v1.7
Inventory: 2026-11-14
Project language: English (all text in the game and README)

## Nuläge

Spelet går att spela ensam från start till mål. Du flyger fregatten, skjuter pirater, sköter energi och reparationer, byter fritt mellan de tre posterna, dockar med vrak och stationer, bryter dig in, bordar uppifrån och hämtar bränsle, krediter, stjärnkartor och slots. Vid stationer köps uppgraderingar som syns på skeppet och utrustning för bordarna. Stationer som anfalls sänder nödanrop, och varje sorts mål har sitt eget inbrottsspel. Det finns fem sektorer som nås med stjärnkartor, och i den sista väntar en Cruiser som boss.

Ingen människa har provspelat än, så känsla och balans är otestade. Onlineläget saknas och väntar på användarens motor.

## Nästa steg

1. Fortsätt enligt "Proposed runs" i BACKLOG.md. Den tekniska översynen kommer först, eftersom den gör allt som följer lättare att bygga.
   - Starta gärna en ny session för varje körning. Allt som behövs står i repot.
2. Användaren provspelar och ger synpunkter.
3. Prata igenom vad spelet går ut på (D-052).
4. Onlineläget (F-040) väntar på användarens motor.

## Mål

Ett co-op-spel online där upp till tre spelare delar på ett rymdskepp. Det ska också gå att spela ensam. Främst ett hobbyprojekt som inte är tänkt att släppas i någon spelbutik.

## Arbetssätt

Idéer spånas i chatten och samlas i designskissen. Det som ska byggas läggs i BACKLOG.md och körs i grupper efter godkännande.

## Publicering

GitHub Pages direkt från main, rotmappen. Spelet har inget byggsteg, så det som ligger på main är det som publiceras. Adress: https://badbagel47.github.io/critical/

Pages slogs på 2026-11-14. Flytt till Cloudflare sker när nätverksmotorn byggs in.

Kontrollera den publicerade sidan med `node tests/smoke.mjs https://badbagel47.github.io/critical/`.

## Dokumentkarta

- [docs/design/index.html](docs/design/index.html): designskissen (utkast 3), på svenska. Samma sida finns som privat sida hos användaren: https://claude.ai/artifact/Ebx9u3e5cy33EHWXoViYJz
- [docs/design/img/](docs/design/img/): exempelskärmar och skeppsbilder.
- [docs/design/tools/](docs/design/tools/): Python-skript som ritar bilderna. Kräver Pillow och typsnittet DejaVu Sans Bold. Kör `python3 frigate.py`, `python3 rot.py` och `python3 screens2.py`.
- [tools/export_assets.py](tools/export_assets.py): gör spelets bilder och pixeltypsnitt av ritskripten. Kör `npm run assets`.

## Kod

- `index.html` och `src/`: spelet. Ren JavaScript utan byggsteg.
- `src/sim/`: spellogiken, helt skild från bild och inmatning. Varje post skickar kommandon till `step()`. Det är här nätverksmotorn ska kopplas in.
- `src/sim/balance.js`: alla siffror för fart, skada och liknande.
- `src/render/`: skärmarna. `effects.js` och `particles.js` ritar effekterna. De läser bara spelets tillstånd och ändrar det aldrig, så de påverkar inte ett kommande onlineläge.
- `assets/`: bilder och typsnitt som skapas av `tools/export_assets.py`.

## Test

- `npm test`: tester av spellogiken.
- `npm run serve` och sedan `npm run smoke`: provkör spelet i en webbläsare. Kräver Playwright installerat globalt.
- `node tests/outside.mjs`: kontrollerar att spelet och designsidan inte laddar något från andra tjänster, och visar vad som sparas i webbläsaren.

## Decisions

Spelet
- Namn: Critical ST8.
- Upp till tre spelare online. Går också att spela ensam, och då börjar spelaren som Captain.
- All text i spelet är på engelska.
- Inget moment pausar spelet. En pausknapp fryser världen för alla.
- Automatisk paus vid tappad anslutning sker först efter en stund. Gränsen prövas ut.
- Publicering: GitHub Pages så länge, flytt till Cloudflare när nätverksmotorn byggs in (2026-11-14).
- Testläge: T på startskärmen, eller `?test` sist i adressen, startar spelet med alla uppgraderingar, all utrustning, alla stjärnkartor och 5000 krediter (2026-11-14).
- Styrning: tangentbord och mus, eller handkontroll. Agentens val, användaren har inte provat än.
- Ljudet skapas i webbläsaren utan ljudfiler. N slår av och på, och valet sparas i webbläsaren.
- Handkontroll: vänster spak styr eller flyttar pekaren, höger spak siktar, avtryckarna gasar och skjuter, RB och LB byter post, START pausar och BACK öppnar kartan. Tabellen finns i `src/input.js`.
- Onlineläget ska använda användarens egen motor, som byggs just nu och bygger på Cloudflares realtidstjänster. Målet är att ett gratiskonto ska räcka för det här kompisspelet (2026-11-14).

Poster
- Tre poster: Captain, Gunner, Engineer. "Post" betyder spelarens plats på skeppet, "station" betyder rymdstation.
- Captain flyger, dockar, skickar ut Darts och avgör när skeppet lägger ut och hoppar.
- Gunner sköter alla vapen.
- Engineer fördelar energi mellan vapen, sköld, motorer och reparation, och flyttar en reparationssymbol mellan skadepunkter på en bild av skeppet.
- Den som går in för att loota lämnar sin post ledig för någon annan och får tillbaka den när den är ombord igen.
- Första versionen har alla tre posterna och fritt byte mellan dem.
- En post som lämnas fortsätter som den ställdes in. Gasen ligger därför kvar när Captain lämnar sin post, så att en ensam spelare kan flyga och skjuta.

Värld
- Sektorer som nås med stjärnkartor som hittas eller köps. Hopp kostar bränsle.
- Tills vidare: det går att hoppa tillbaka till sektorer man varit i, och de är som de lämnades (D-031, 2026-11-14).
- Fri sikt i rymden. Fog of war finns bara på kartan. Stillastående objekt ligger kvar som senast kända läge, skepp syns bara medan de ses.
- Stationer är vänliga, neutrala eller fientliga. Gratis tankning hos vänliga, betalning hos neutrala.
- Skeppet kan bara byggas om vid en station med shipyard.
- En vänlig eller neutral station som anfalls kan sända nödanrop. En neutral station som får hjälp förblir neutral men ger rabatt och tillgång till sin shipyard under en tid.
- Pirater är fristående och aggressiva mot alla.

Bordning
- Bordning sker uppifrån, i samma vinkel som rymden.
- Vem som bordar bestäms genom att spelarna pratar. Vem som helst kan gå in eller ut medan skeppet ligger dockat.
- Den som nästan dör teleporteras hem och kan inte gå in igen under samma bordning. När alla är tillbaka får alla tillbaka sitt liv.
- Teleportern måste vara laddad för att spelaren ska kunna borda nästa gång.
- Det som bärs blir kvar på platsen när någon teleporteras hem, så att en annan bordare kan plocka upp det (2026-11-14).
- Tills vidare: Captain kan lägga ut medan någon är kvar inne. Alla som är inne teleporteras då hem, tappar det de bär och måste ladda om teleportern (D-043, 2026-11-14).
- Mål är olika svåra att borda. En scanner visar det.
- Varje typ av mål har ett eget inbrottsspel på tid.

Bordning, agentens val som användaren inte har sett än (2026-11-14)
- Valvdörren i ett vrak öppnas genom att hålla in F bredvid den, inte med ett eget inbrottsspel.
- Reaktorn räknar ner från första steget in. Vid noll sprängs vraket, alla teleporteras hem, ett dockat skepp skadas och ett nytt vrak dyker upp på annat håll.
- Bränsle förbrukas av gasen. Tom tank ger ett skepp som nästan står still.

Stationer, vapen och sektorer, agentens val som användaren inte har sett än (2026-11-14)
- Fem fasta sektorer: Kestrel Drift, Ash Belt, Hollow Reach, The Narrows och The Maw. Stationer säljer kartan till nästa sektor, och kartor kan ligga i valv.
- En neutral station blir fientlig efter sex träffar från skeppet. Den varnar först.
- En fientlig station tas över från en terminal i dess valv. Misslyckas inbrottet slår stationen tillbaka med två Fighters, och låset får ett nytt pussel.
- En övertagen station får shipyard.
- Den tunga lasern skjuter rakt fram längs skeppet, så Captain siktar med skeppet och Gunner laddar och avfyrar.
- Pirater ger en liten belöning i krediter. En nedskjuten Gunboat blir ett vrak som går att borda.
- Från andra sektorn kommer Gunboats, och pirater tål mer i senare sektorer.
- Reparation vid station lagar allt på en gång. Priser och uppgraderingar finns i `src/sim/balance.js` och `src/sim/upgrades.js`.
- Spelet är vunnet när Cruisern i The Maw är förstörd. Det går att flyga vidare efteråt.

Nödanrop, lås och utrustning, agentens val som användaren inte har sett än (2026-11-14)
- Ett neutralt shipyard är bara öppet för den som stationen står i skuld till, alltså en stund efter ett besvarat nödanrop. Det är agentens läsning av användarens ord "får nyttja shipyard under denna tid om en sådan finns" (se D-044). Vänliga och övertagna stationer har alltid öppet.
- Ett besvarat nödanrop ger 40 procent rabatt och öppet shipyard i tre minuter hos en neutral station. En vänlig station betalar 100 krediter.
- Ett nödanrop som ingen svarar på får inga följder. Piraterna ger sig av (se D-045).
- Nödanropet visar var stationen ligger, även om den inte är hittad.
- Stationslåset är en kod som bara syns på Engineer-skärmen och som byts var sextonde sekund. Ensam får man växla mellan låset och Engineer-posten.
- Fraktcontainrar (cargo pods) har ingen insida. När låset är uppe tas lasten direkt ombord och containern försvinner.
- Bordarnas utrustning säljs i en egen flik, Armory, hos alla stationer som handlar. Den kräver inget shipyard och tar inga slots.
- Pirater lämnar ibland bärgningsgods som plockas upp genom att flyga över det. Tractor beam drar in det på avstånd.
- Point defense stoppar ungefär en tredjedel av skotten som kommer nära. Pirater har inga raketer än.

Ombord på stationer, agentens val som användaren inte har sett än (2026-11-14)
- F vid en vänlig eller neutral station går ombord, utan lås och utan krav på laddad teleporter.
- Butiken finns bara där inne, vid tre diskar: Services nära luftslussen, Shipyard och Armory i var sitt rum. F vid en disk öppnar panelen.
- Vapnen går inte att använda på en handelsstation.
- Att lägga ut kallar hem dem som är ombord utan teleport och utan kostnad.
- En station som blir fientlig kastar ut alla och får en ny insida.
- En övertagen station får diskar nästa gång någon går in.

Balans, agentens val (2026-11-14)
- Piratvågorna kommer glesare ju färre som är ombord, så att en ensam spelare hinner lämna skeppet. Ensam är det drygt en minut mellan vågorna.
- Provat med en simulerad spelare, inte av en människa: den som stannar vid vapnen klarar sig, och ett obevakat skepp går förlorat på drygt två minuter.

Karta, agentens val som användaren inte har sett än (2026-11-14)
- Scannerpuls, sonder och radarbojar finns från start tills butiken är byggd. Enligt designen ska de sedan köpas.
- Sonder och bojar fylls på av sig själva med tiden.
- Pilarna i skärmkanten visar bara pirater inom sikt och vrak som redan hittats.
- Kartan öppnas med M av vem som helst. Verktygen används från Engineer-posten.

Skepp och uppgraderingar
- Spelarskeppet är alltid samma fregatt. Uppgraderingar syns på skrovet.
- Två sorters slots: hardpoints och system slots. Båda kan köpas eller hittas som loot.
- Fighter bay är en uppgradering. Darts är den minsta skeppsklassen.
- Skeppsklasser: Dart, Fighter, Interceptor, Gunboat, Frigate, Cruiser.

Grafik
- En pixelstil för hela spelet, alltid uppifrån, med dämpade färger. Stark färg används bara för ljus, skott och loot.
- Hela skeppet vrids som en bild. Pixlarna ritas inte om i ett rutnät.
- All grafik görs från grunden. Referensbilder används bara som inspiration.

## Miljö och begränsningar

- 2026-11-14: Agenten kan klona och pusha via git. GitHub-verktygen (gh och GitHub-kopplingen) fungerade inte i sessionen, så agenten kunde inte läsa eller ändra repoinställningar, till exempel GitHub Pages.
- 2026-11-14, senare session: GitHub-kopplingen fungerar för att läsa pull requests och issues. Kommandot gh finns inte. Sessionen fick bara pusha till sin egen gren (claude/), inte direkt till main, och repot saknar automatisk merge.

## Engångsåtgärder

- Klar 2026-11-14: `badbagel47.github.io` är tillåten i användarens molnmiljö, så att agenten kan kontrollera den publicerade sidan.
- Klar 2026-11-14: användaren slog på GitHub Pages för repot (Deploy from a branch, main, rot).

## Teknisk bedömning

2026-11-14, efter drygt trettio byggda funktioner:
- Bra: spellogiken är skild från bild och inmatning, hela tillståndet går att spara och läsa in mitt i en omgång med identiskt förlopp efteråt, och testerna körs innan något sparas.
- Bör åtgärdas före fler funktioner: se F-059, D-055, D-056 och D-057.
- Inför onlineläget: se D-060 till D-063. De tre första behöver besked om hur användarens motor fungerar, om den räknar ut spelet på servern eller bara förmedlar meddelanden, och vilka gränser den har.
- Effekter och ljud läser bara av spelet och behöver aldrig skickas över nätet.

## Lagar och regler

Genomgång 2026-11-14 (D-033). Agenten är ingen jurist, och inget här är juridisk rådgivning. Officiella källor är IMY (imy.se) för personuppgifter och PTS (pts.se) för kakor och liknande lagring.

- Spelet och designsidan laddar inget från andra tjänster. Det kontrolleras med `node tests/outside.mjs`.
- Designsidan laddade tidigare typsnitt från Google Fonts. De är borttagna och sidan använder systemets typsnitt.
- Spelet hanterar inga personuppgifter: inga namn, konton eller formulär.
- Spelet sparar en enda sak i webbläsaren: om ljudet är av eller på (`critical-muted`), och bara efter att spelaren själv tryckt N. Inga kakor. Regeln som kan beröras är lagen om elektronisk kommunikation, 9 kap. 28 §, om lagring i användarens utrustning. Lagring som behövs för något användaren själv har bett om brukar vara undantagen från samtycke. Agentens rekommendation är att behålla sparandet. Användaren har inte tagit ställning än.
- Webbhotellet GitHub Pages får besökarnas IP-adresser, vilket följer av att sidan ligger där.
- Ny genomgång behövs när onlineläget byggs (D-046): spelarnamn, anslutningar och Cloudflare som ny tjänst.
