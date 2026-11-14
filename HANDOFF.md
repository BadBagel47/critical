# HANDOFF

Rules version: v1.7
Inventory: 2026-11-14
Project language: English (all text in the game and README)

## Nuläge

Spelet går att spela ensam från start till mål. Du flyger fregatten, skjuter pirater, sköter energi och reparationer, byter fritt mellan de tre posterna, dockar med vrak och stationer, bryter dig in, bordar uppifrån och hämtar bränsle, krediter, stjärnkartor och slots. Vid stationer köps uppgraderingar som syns på skeppet och utrustning för bordarna. Stationer som anfalls sänder nödanrop, och varje sorts mål har sitt eget inbrottsspel. Det finns fem sektorer som nås med stjärnkartor, och i den sista väntar en Cruiser som boss.

Sedan dess är koden omgjord i grunden utan att spelet beter sig annorlunda (den tekniska översynen), texten är skarpare, bilden fyller fönstret och stationerna är dubbelt så stora. Spelet har en meny (O) där man sparar, laddar och ställer ljudnivåer, det sparar sig självt vid dockning, det finns ett hardcore-läge, och inbrottet i vrak är lättare. Musiken görs av en annan agent enligt docs/music-brief.md.

Världen har fått sidor och liv: tre faktioner med egna stationer och anseende, fraktskepp och patruller som hoppar in, dockar och hoppar ut, stationer med kanontorn och sköld som försvarar sig och kan falla till piraterna, och en extra sköld för dockade skepp.

Dockningen är enklare, och en knapp dyker upp nere till höger när det finns något att göra (docka, gå ombord, handla, skära upp ett lås). Den visar tangenten, handkontrollens knapp eller en symbol för pekskärm. Ett samlat förslag för hur bordning av stationer ska fungera, med lockdown, smygande, roller, mainframe och övertagande, ligger i docs/station-boarding.md och väntar på användarens ja.

Användaren har provspelat lite (2026-11-14) och tycker att det är ett bra första steg. Synpunkterna blev F-065 till D-089 i BACKLOG.md. Balansen är inte genomgången än. Onlineläget saknas och väntar på användarens motor.

## Nästa steg

1. Fortsätt enligt "Proposed runs" i BACKLOG.md. Den tekniska översynen är gjord, så nya saker kan byggas direkt.
   - Starta gärna en ny session för varje körning. Allt som behövs står i repot.
2. Användaren fortsätter provspela och ger synpunkter.
3. Prata igenom vad spelet går ut på (D-052), tillsammans med uppdrag (D-073), två våningar på baser (D-072) och eskortskepp (D-071).
4. Onlineläget (F-040) väntar på användarens motor.

## Mål

Ett co-op-spel online där upp till tre spelare delar på ett rymdskepp. Det ska också gå att spela ensam. Främst ett hobbyprojekt som inte är tänkt att släppas i någon spelbutik.

Världen ska vara av samma typ som i Escape Velocity med efterföljare och Endless Sky, fast med egna idéer och multiplayer (2026-11-14). Spelen används bara som inspiration för idéer och spelmekanik. Inget innehåll, ingen text, grafik eller kod hämtas därifrån.

## Arbetssätt

Idéer spånas i chatten och samlas i designskissen. Det som ska byggas läggs i BACKLOG.md och körs i grupper efter godkännande.

## Publicering

GitHub Pages direkt från main, rotmappen. Spelet har inget byggsteg, så det som ligger på main är det som publiceras. Agentens grenar (claude/) slås ihop med main automatiskt. Adress: https://badbagel47.github.io/critical/

Pages slogs på 2026-11-14. Flytt till Cloudflare sker när nätverksmotorn byggs in.

Kontrollera den publicerade sidan med `node tests/smoke.mjs https://badbagel47.github.io/critical/`.

## Dokumentkarta

- [docs/design/index.html](docs/design/index.html): designskissen (utkast 3), på svenska. Samma sida finns som privat sida hos användaren: https://claude.ai/artifact/Ebx9u3e5cy33EHWXoViYJz
- [docs/design/img/](docs/design/img/): exempelskärmar och skeppsbilder.
- [docs/design/tools/](docs/design/tools/): Python-skript som ritar bilderna. Kräver Pillow och typsnittet DejaVu Sans Bold. Kör `python3 frigate.py`, `python3 rot.py` och `python3 screens2.py`, samt `python3 ships2.py` för förslagen på nya skeppsklasser.
- [tools/export_assets.py](tools/export_assets.py): gör spelets bilder av ritskripten, och typsnittet av DejaVu Sans Bold. Kör `npm run assets`.
- [docs/station-boarding.md](docs/station-boarding.md): samlat förslag för bordning av stationer (D-117): lockdown, smygande, roller, mainframe och övertagande. Säger vad användaren har bestämt och vad som är agentens förslag. Väntar på användarens ja.
- [docs/music-brief.md](docs/music-brief.md): underlag för den agent som gör musiken (F-048). Säger vad som gäller, hur musiken kopplas in och vilka filer den får röra.

## Kod

- `index.html` och `src/`: spelet. Ren JavaScript utan byggsteg.
- `src/sim/`: spellogiken, helt skild från bild och inmatning. Den läser aldrig klockan, skärmen eller egna slumptal, och ett test vaktar det.
  - `state.js`: hela spelet som ett enda vanligt objekt, som går att spara och skicka som det är.
  - `step.js`: ett steg i spelet. `stepPlayers()` tar emot vad varje spelare ber om. Det är här nätverksmotorn ska kopplas in.
  - `players.js`: besättningen och posterna. Här avgörs vem som får göra vad.
  - `kinds.js`: allt som finns i rymden beskrivet som data, både saker (`THINGS`) och skeppsklasser (`SHIPS`). En ny sort börjar här.
  - `things.js`: saker som står still (stenar, vrak, stationer, containrar, bärgningsgods, bojar). De ligger i `state.things`.
  - `vessels.js`: andra skepp än fregatten. De ligger i `state.vessels`. Hur en klass flyger och slåss är dess "brain". Ett skepp med ett ärende flyger sina `legs` i tur och ordning.
  - `sides.js`: vem som står på vems sida, och vad varje sida tycker om besättningen (anseendet i `state.standing`). Allt som kan skjuta eller bli skjutet har en `side`: besättningen, piraterna, en faktion, eller en station som står för sig själv.
  - `stations.js`: stationerna. Hur en station behandlar besättningen (`align`, `closed`) räknas fram ur dess sida och anseendet i varje steg, så ändra sidan eller anseendet och aldrig `align` direkt. Här finns också försvaret och piratanfallen.
  - `traffic.js`: faktionernas skepp som hoppar in, gör sitt ärende och hoppar ut.
  - `weapons.js`: fregattens vapen som data. Ett nytt vapen är en ny rad i `WEAPONS`.
  - `posts.js`, `ship.js`, `shots.js`: de tre posterna, fregatten och skotten.
  - `balance.js`: siffror för spelets regler. Siffror för varje skeppsklass står i `kinds.js`.
- `src/screens.js`: vad spelaren ser. Det finns alltid exakt ett läge, och varje läge är en rad i `SCREENS` som säger hur det ritas och vad tangenterna gör. Ett nytt läge läggs till där.
- `src/main.js`: start och huvudloop, och det menyn kan göra (nytt spel, spara, ladda, exportera, importera). `src/events.js`: meddelanden, ljud och paneler som svar på det som hänt i spelet.
- `src/actions.js`: vad spelaren kan göra just där hen är (docka, gå ombord, handla, skära upp ett lås), som högst två handlingar med var sin tangent. `src/render/actions.js` ritar dem som knappar och låter ett klick eller tryck på en knapp fungera som tangenten. En ny sak att göra läggs till i `actions.js` och får en symbol i `ICON`. Mus och fingrar läses med samma händelser i `src/input.js`, som också vet om senaste trycket kom från en pekskärm. Resten av pekstyrningen är F-090.
- `src/menu.js`: startskärmen och spelmenyn bakom O, som sidor av rader. En ny rad eller sida läggs till i `PAGES`.
- `src/saves.js`: sparade spel. En sparning är hela spelets tillstånd som text. `SAVE_VERSION` måste höjas när tillståndet byter form, och ett test i `tests/saves.test.js` säger till när det behövs. Sparningar från en äldre version nekas då i stället för att gå sönder.
- `src/scene.js`: vilket slags ögonblick spelaren är i (lugnt, varning, strid, bordning, station), för musiken. `src/music.js`: musiken. Den anropas en gång per bildruta och kopplar sitt ljud till `musicOutput()` i `src/audio.js`. Delarna ligger i `src/music/`: `theory.js` (toner, introtemat och varje sektors färg), `pieces.js` (ett stycke per scen, som rena funktioner), `director.js` (vilket stycke som ska spela, med tröghet), `synth.js` (instrumenten) och `engine.js` (spelar och tonar mellan styckena). Lyssningssidan är `docs/music/index.html`.
- `src/render/`: skärmarna. `looks.js` beskriver hur varje sorts sak och skepp ser ut, på samma sätt som `kinds.js` beskriver vad de är. `effects.js` och `particles.js` ritar effekterna. Allt här läser bara spelets tillstånd och ändrar det aldrig.
- `assets/`: bilder och typsnitt som skapas av `tools/export_assets.py`.
- Spelet ritas på 640 × 360 punkter. Text och ramar ritas på ett dubbelt så fint rutnät (typsnittet är dubbelt så stort och ritas i halv skala, se `src/font.js` och `HAIR` i `src/render/draw.js`). Bilden fyller alltid fönstret så långt formen 16:9 tillåter: den ritas i ett jämnt antal skärmpunkter per spelpunkt och webbläsaren passar sedan in den, se `resize()` i `src/main.js`.
- Koden formateras med Prettier: `npm run format`.

## Test

- `npm test`: tester av spellogiken, besättningen, sakerna som data och förutsägbarheten. Vilka knappar som erbjuds var testas i `tests/actions.test.js`. Faktioner, stationsförsvar, dockningssköld och trafik testas i `tests/sides.test.js`.
  - `tests/determinism.test.js` kör en lång inspelad omgång med tre spelare (`tests/tour.js`) och kontrollerar att samma start och samma kommandon ger exakt samma spel, även efter att spelet sparats som text och lästs in igen. Varje ny funktion måste klara det (D-063).
  - `tests/style.test.js` vaktar radlängd och att spellogiken inte beror på något utanför `src/sim/`.
- `npm run lint`: letar efter stavfel i namn, sådant som aldrig används och liknande. `npm run types`: kontrollerar typer utan byggsteg. `npm run check` kör tester, lint och typer i ett svep.
- `npm run serve` och sedan `npm run smoke`: provkör spelet i en webbläsare. Kräver Playwright installerat globalt. Provkörningen klickar på namngivna knappar: varje skärm som styrs med klick listar sina knappar i `SCREENS` i `src/screens.js`, och de går att se med `window.__critical.buttons()`. En ny klickbar skärm ska lista sina knappar där.
- GitHub kör alla kontroller, också provkörningen i webbläsare, vid varje push (`.github/workflows/test.yml`). Den automatiska sammanslagningen till main väntar inte på dem, så ett rött kryss betyder att main redan kan vara trasig och ska lagas direkt.
- `node tests/outside.mjs`: kontrollerar att spelet och designsidan inte laddar något från andra tjänster, och visar vad som sparas i webbläsaren.
- I webbläsarens konsol finns `window.__critical` med spelets tillstånd, aktuellt läge (`mode`) och genvägar till vrak, stationer och containrar.
- När ett test i `tests/saves.test.js` säger att tillståndet bytt form: höj `SAVE_VERSION` i `src/saves.js` och skriv in de nya värdena i testet.

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
- Knappar som visar vad man kan göra (F-112, 2026-11-14): en knapp dyker upp när det finns något att göra, med kortkommandot för tangentbord och en lösning för touch. Agentens utformning, som användaren har godkänt i ord men inte sett: knapparna ligger nere till höger, högst två åt gången med huvudsaken störst. Tangentbord visar tangenten som en ruta följd av ordet, handkontroll visar kontrollens knapp, och pekskärm visar en rund knapp med symbol och ordet under. Text finns alltid med.
- Dockning ska vara enkel (F-111, 2026-11-14). Agentens val: nosen behöver vara 48 punkter från dockningsarmen (förut 20), närmaste arm väljs, och skeppet dras in och vrids rätt av sig självt på ungefär en sekund. Farten får fortfarande vara högst 32.
- Ljudet skapas i webbläsaren utan ljudfiler. N slår av och på allt ljud. Varje spelare ställer nivån på ljudeffekter och musik var för sig under SOUND i menyn, och valen sparas i webbläsaren (F-105, 2026-11-14).
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
- En post kan bara hållas av en spelare i taget. Två spelare byter post genom att be om varandras poster inom några sekunder. Den som kommer tillbaka från en bordning får sin gamla post om den är ledig, annars en annan ledig post. Godkänt av användaren 2026-11-14, så länge det går att göra intuitivt utan att kladda ner UI.

Värld
- Sektorer som nås med stjärnkartor som hittas eller köps. Hopp kostar bränsle.
- Tills vidare: det går att hoppa tillbaka till sektorer man varit i, och de är som de lämnades (D-031, 2026-11-14).
- Fri sikt i rymden. Fog of war finns bara på kartan. Stillastående objekt ligger kvar som senast kända läge, skepp syns bara medan de ses.
- Stationer är vänliga, neutrala eller fientliga. Gratis tankning hos vänliga, betalning hos neutrala.
- Skeppet kan bara byggas om vid en station med shipyard.
- En vänlig eller neutral station som anfalls kan sända nödanrop. En neutral station som får hjälp förblir neutral men ger rabatt under en tid.
- Neutrala shipyards är alltid öppna mot betalning, till samma priser som hos vänliga så länge spelet testas (D-044, 2026-11-14).
- En station som inte överlever ett anfall blir fientlig (D-045, byggt 2026-11-14): den faller till piraterna och måste tas över för att bli vänlig igen.
- Anseendet hör till den faktion som stationen tillhör. Hos en station utan faktion gäller anseendet just den stationen (2026-11-14).
- Baser har turrets och sköld, och dockade skepp får en liten extra sköld som syns på sköldmätaren och går att uppgradera (F-098, F-099, byggt 2026-11-14).
- Pirater är fristående och aggressiva mot alla.
- Faktioner finns (F-035, byggt 2026-11-14). Namn och karaktär är platshållare, se D-095.
- Värme blir en andra resurs bredvid energi, med uppgraderingar som kyler bättre (F-084, 2026-11-14).
- Omgången ska gå att spara, och sparfilen ska gå att exportera och importera (F-079, 2026-11-14).
- Varor (goods) som köps och säljs mellan stationer är bara till för att tjäna pengar. Spelaren kan inte använda dem själv (F-068, 2026-11-14).

Bordning
- Bordning sker uppifrån, i samma vinkel som rymden.
- Vem som bordar bestäms genom att spelarna pratar. Vem som helst kan gå in eller ut medan skeppet ligger dockat.
- Den som nästan dör teleporteras hem och kan inte gå in igen under samma bordning. När alla är tillbaka får alla tillbaka sitt liv.
- Teleportern måste vara laddad för att spelaren ska kunna borda nästa gång.
- Det som bärs blir kvar på platsen när någon teleporteras hem, så att en annan bordare kan plocka upp det (2026-11-14).
- Tills vidare: Captain kan lägga ut medan någon är kvar inne. Alla som är inne teleporteras då hem, tappar det de bär och måste ladda om teleportern (D-043, 2026-11-14).
- Mål är olika svåra att borda. En scanner visar det.
- Varje typ av mål har ett eget inbrottsspel på tid.
- Inbrottet i vrak ska vara lätt snarare än ha lång tid: 15 rutor och ungefär sex vridningar för de lättaste vraken, större lås för vrak med högre risk (B-092, 2026-11-14).

Bordning, agentens val som användaren inte har sett än (2026-11-14)
- Valvdörren i ett vrak öppnas genom att hålla in F bredvid den, inte med ett eget inbrottsspel.
- Reaktorn räknar ner från första steget in. Vid noll sprängs vraket, alla teleporteras hem, ett dockat skepp skadas och ett nytt vrak dyker upp på annat håll.
- Bränsle förbrukas av gasen. Tom tank ger ett skepp som nästan står still.

Stationer, vapen och sektorer, agentens val som användaren inte har sett än (2026-11-14)
- Fem fasta sektorer: Kestrel Drift, Ash Belt, Hollow Reach, The Narrows och The Maw. Stationer säljer kartan till nästa sektor, och kartor kan ligga i valv.
- En station som besättningen skjuter på i lugn och ro blir avvaktande efter två träffar, stänger efter fem och öppnar eld efter åtta. Den varnar vid varje träff.
- En fientlig station tas över från en terminal i dess valv. Misslyckas inbrottet slår stationen tillbaka med två Fighters, och låset får ett nytt pussel.
- En övertagen station får shipyard.
- Stationerna är dubbelt så stora som förut, 192 punkter tvärs över mot fregattens 108 på längden. Storleken är agentens val (F-065, 2026-11-14).
- Den tunga lasern skjuter rakt fram längs skeppet, så Captain siktar med skeppet och Gunner laddar och avfyrar.
- Pirater ger en liten belöning i krediter. En nedskjuten Gunboat blir ett vrak som går att borda.
- Från andra sektorn kommer Gunboats, och pirater tål mer i senare sektorer.
- Reparation vid station lagar allt på en gång. Priser och uppgraderingar finns i `src/sim/balance.js` och `src/sim/upgrades.js`.
- Spelet är vunnet när Cruisern i The Maw är förstörd. Det går att flyga vidare efteråt.

Nödanrop, lås och utrustning, agentens val som användaren inte har sett än (2026-11-14)
- Ett neutralt shipyard var först bara öppet efter ett besvarat nödanrop. Det ändrades 2026-11-14, se Värld.
- Ett besvarat nödanrop ger 40 procent rabatt i tre minuter hos en neutral station. En vänlig station betalar 100 krediter.
- Ett nödanrop som ingen svarar på avgörs av stationens eget försvar: den klarar sig eller faller till piraterna, se avsnittet om faktioner nedan.
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
- Pilarna i skärmkanten visar bara fiender inom sikt och vrak som redan hittats.
- Kartan öppnas med M av vem som helst. Verktygen används från Engineer-posten.

Faktioner, platshållare som ska ses över i D-095 (2026-11-14)
- Tre faktioner. Man börjar som neutral hos alla. Piraterna står utanför.
- THE CHARTER: ett handelsförbund med rika stationer och bra priser. Betalar för frakt och eskort.
- THE WARDENS: en ordningsmakt som patrullerar med tunga skepp och har de bästa varven. Skannar efter smuggelgods.
- THE DRIFTERS: fria bärgare och nybyggare i utkanten. Billiga reparationer, köper allt och bryr sig inte om smuggelgods.
- Dåligt anseende ger först högre priser, sedan stängda stationer, sedan patruller som anfaller. Det ska alltid gå att höja ett lågt anseende.

Faktioner, stationsförsvar och trafik, agentens val som användaren inte har sett än (2026-11-14)
- Var faktionerna finns: Kestrel Yard i första sektorn är besättningens egen, Drift Post står för sig själv, Ash Depot är Drifters, Hollow Market är Charter och Narrows Dock är Wardens. Övriga stationer är piraternas. Faktionerna syns oftast i sina hemsektorer.
- Färger: Charter gult, Wardens blått, Drifters rostbrunt, pirater lila med röda märken. Stationens egen färg visar fortfarande hur den behandlar besättningen (vänlig, neutral, fientlig), inte vems den är.
- Anseendet går från -100 till 100 och börjar på 0. Vänlig från 50 (gratis bränsle, billig reparation), avvaktande från -20 (priser gånger 1,5), stängd från -50 (ingen handel, ingen släpps in), fientlig från -80 (stationer och skepp öppnar eld).
- Anseendet sjunker av att skjuta på den som inte är fiende: 10 per träff på en station, 2 per träff på ett skepp och 25 för ett förstört skepp. Har det väl gått till eld faller det till botten.
- Anseendet stiger av att skjuta ner pirater (0,5 hos alla per pirat), av att rädda en station ur ett anfall (20 hos dess sida), och av sig självt med tiden upp till avvaktande. Från botten tar det ungefär sju minuter till stängd och tjugo till avvaktande. Så finns det alltid en väg tillbaka. Ingen förlåter medan besättningen ligger dockad vid en av deras fientliga stationer.
- Skott som går snett mitt i en strid räknas inte: besättningens skott går förbi en station eller ett skepp som själv har fiender nära. I lugn och ro träffar de, och det är ett anfall.
- Andras skott träffar bara deras fiender. Faktionerna slåss inte med varandra, alla slåss med pirater.
- Bara besättningens egna nedskjutningar ger belöning, räknas som kills och höjer anseendet.
- Stationer: fyra kanontorn, sköld 200 som börjar laddas efter fem sekunder utan träffar, skrov 1500 som lagas efter tjugo. En träff på ett kanontorn slår ut tornet. En piratstations kanoner gör dubbel skada, så att de fortfarande är farliga för fregatten.
- Piratanfall: fyra skepp, fler i senare sektorer, och från andra sektorn är ett av dem en Gunboat. Provat i simulering utan hjälp från besättningen: i första sektorn håller stationen nästan alltid, i andra faller den i ungefär fyra fall av tio, och i fjärde faller den nästan alltid. Tacken (rabatt eller krediter) kommer bara om besättningen själv träffat någon av angriparna.
- Besättningens egen varvsstation anfalls aldrig, så att det alltid finns någonstans att tanka och laga. En station som fallit till piraterna tas över som andra piratstationer och blir då besättningens.
- En station som besättningen själv skjutit ner till noll tystnar bara. Den byter inte ägare.
- Dockningsskölden är 40, och 90 med uppgraderingen Docking Field (150 krediter, en system slot). Den laddas på fyra sekunder och försvinner när skeppet lägger ut.
- Trafik: ett nytt skepp eller en patrull var tjugonde till fyrtiofemte sekund, högst fem samtidigt, två av tre är fraktskepp. Fraktskepp besöker en eller två stationer i 12 till 25 sekunder var. Patruller är två skepp som går en runda förbi stationerna. Ingen trafik kommer till en sektor där piraterna har alla stationer.
- Pirater jagar närmaste fiende inom sikt och annars fregatten. Darts skjuter bara på fiender.
- Sparningar gjorda före den här ändringen går inte att läsa in (`SAVE_VERSION` är 2).

Bordning av stationer, besked från användaren (2026-11-14, inget av det är byggt än)
- Tre lägen inne på ett ställe: lugnt (handelsgolv), lockdown (stället räknar besättningen som fiende: mörkt, roterande röda ljus, stängda dörrar, och man smyger) och larm (upptäckt). Ett larm ligger kvar tills man gått. Man kan inte gömma sig och vänta ut det.
- Smygande gäller inte i vrak. Där räknar reaktorn ner.
- Sövda vakter vaknar efter en stund. Den som går fram till en sövd vakt innan den vaknar kan oskadliggöra den. Knappen heter TAKE DOWN.
- En vakt som hittar en sövd vakt utlöser larmet direkt.
- Alla tre rollerna har en bonus vid bordning: Gunner slåss bättre, Engineer hackar mainframen snabbare och når fler funktioner, Captain ger överblick (ser vakter och kameror en bit genom väggar, och hela gruppen får se det). Alla kan använda mainframen. Bonusen får inte ge mycket övertag.
- Mainframen står längst in, på översta våningen där det finns flera. Man måste alltid ta sig förbi vakterna för att nå den.
- Stationens egna turrets inomhus ska gå att smyga förbi och är bara aggressiva mot fiender. Spelarnas egna turrets är engångssaker.
- En neutral bas ska gå att ta över inifrån, med stor risk: red alert, bounty hunters som anfaller skeppet och sjunkande anseende.
- Anseende ska inte förlåtas med tiden. Man ska få jobba för det, främst genom uppdrag som tillhör faktioner och som kan ge plus hos en och minus hos en annan (F-118, D-073). Det som är byggt i dag förlåter fortfarande med tiden och ska ändras när uppdragen finns.
- Faktioner ska kunna vara i krig med varandra (F-119).
- Användaren har godkänt agentens förslag i samtalet (2026-11-14): bounty hunters som en kombination av prissumma och anfall då och då, ett krig mellan två faktioner per omgång, att förlåtelsen med tiden tas bort först när uppdragen finns, och att en faktion vars station besättningen håller som bäst kan bli "stängd".
- Det samlade förslaget ligger i docs/station-boarding.md och väntar på ja. Det som då var kvar att bestämma: hur en attack inifrån börjar på en neutral bas (agentens förslag: en öppen del och en del bara för personal), att ingen längre kastas ut när stationen blir fientlig, hur larm skiljer sig från lockdown i bild, hur oförstörbara turrets aldrig kan låsa spelet, hur hårt bounty hunters slår, och vad panelen på en ägd station ska kunna när stationer i dag lagar sig själva.

Sparande, uppdrag och omgångar (2026-11-14)
- En autosparfil vid dockning och fem manuella platser. Vid död laddas senaste sparfilen om. Byggt 2026-11-14 (F-079).
- Hardcore mode: ett liv. Spelet sparar sig bara självt, det går inte att ladda eller exportera under en omgång, och omgångens sparning tas bort när skeppet går förlorat. Hur hardcore ska fungera i detalj är agentens val (F-096, 2026-11-14).
- Sparningar från en äldre version av spelet går inte att läsa in efter att spelets tillstånd har ändrat form. Det är agentens val: hellre ett tydligt nej än en trasig omgång.
- Menyn öppnas med O. Spelet går vidare bakom den, i linje med att inget moment pausar spelet.
- Varje omgång ska vara genererad: systemen, en röd tråd av berättelse och frivilliga sidouppdrag. Kartans storlek väljs vid start. Ingen färdigskriven story från början till slut.
- Uppdrag: alla sorter, högst fem samtidigt för stunden. Vissa har tidsgräns och betalar mer. Ett misslyckat uppdrag kostar lönen och lite anseende hos stationens faktion, eller hos just den stationen om den är neutral.
- Det får aldrig gå att låsa sig, till exempel utan pengar eller bränsle (D-100).
- Små stationer har en våning, större har två. Samma gäller för fientliga.
- Mobil är viktigt (F-090).
- Onlineläget: spelare ansluter med rumskod eller länk. Motorns gränser är inte kända än. Att hoppa in mitt i ett spel (F-038) görs i samband med nätverkskoden.

Skepp och uppgraderingar
- Spelarskeppet är alltid samma fregatt. Uppgraderingar syns på skrovet.
- Två sorters slots: hardpoints och system slots. Båda kan köpas eller hittas som loot.
- Fighter bay är en uppgradering. Darts är den minsta skeppsklassen.
- Skeppsklasser: Dart, Fighter, Interceptor, Gunboat, Frigate, Cruiser.
- Två nya skeppsklasser ska in: Freighter, lite större och långsam (F-069), och Juggernaut, ett ovanligt krigsskepp som är långsamt och tungt bestyckat (F-070). Juggernaut patrullerar hos faktioner och dyker i mycket sällsynta fall upp som pirat (2026-11-14).
- Designen är vald för båda de nya skeppen: Freighter är en ryggrad med containrar (förslag A), och Juggernaut är ett kantigt ägg med smala änden fram, pansarplåtar och monterade kanontorn, mindre än Cruisern (förslag E). Båda finns i `docs/design/tools/ships2.py` (D-094, 2026-11-14).
- Stationernas storlek är godkänd. Stora baser med två våningar blir 1,5 gånger större, med annan design, mer vapen och starkare sköld (F-103, 2026-11-14).
- Nya skepp designas och visas för användaren innan de läggs in i spelet (2026-11-14). Förslagen ritas av `docs/design/tools/ships2.py`.

Grafik
- En pixelstil för hela spelet, alltid uppifrån, med dämpade färger. Stark färg används bara för ljus, skott och loot.
- Hela skeppet vrids som en bild. Pixlarna ritas inte om i ett rutnät.
- All grafik görs från grunden. Referensbilder används bara som inspiration.

## Miljö och begränsningar

- 2026-11-14: Skarpare text och fönsterfyllnad (F-077, F-078) flyter på användarens dator. De är i övrigt bara provade i en automatisk webbläsare i tre fönsterstorlekar. På en full-HD-skärm ritas bilden i 2560 × 1440 och krymps, vilket kostar mer grafikkraft än förut. Om det hackar: sänk `MAX_SCALE` i `src/main.js`.

- 2026-11-14: Agenten kan klona och pusha via git. GitHub-verktygen (gh och GitHub-kopplingen) fungerade inte i sessionen, så agenten kunde inte läsa eller ändra repoinställningar, till exempel GitHub Pages.
- 2026-11-14, senare session: GitHub-kopplingen fungerar för att läsa pull requests och issues. Kommandot gh finns inte. Sessionen fick bara pusha till sin egen gren (claude/), inte direkt till main. Därför finns nu automatisk merge, se Engångsåtgärder.

## Engångsåtgärder

- Klar 2026-11-14: `badbagel47.github.io` är tillåten i användarens molnmiljö, så att agenten kan kontrollera den publicerade sidan.
- Klar 2026-11-14: användaren slog på GitHub Pages för repot (Deploy from a branch, main, rot).
- Klar 2026-11-14: automatisk merge enligt agentreglernas mall (`.github/workflows/auto-merge.yml`), vald av användaren. Grenar som börjar med claude/ slås ihop med main av sig själva.
- Klar 2026-11-14: tester körs automatiskt på GitHub vid varje push. Det krävde ingen åtgärd från användaren.

## Teknisk bedömning

2026-11-14, efter den tekniska översynen (F-059, D-055, D-056, D-057, D-063):
- Spellogiken är skild från bild och inmatning, och hela tillståndet går att spara som text och läsa in mitt i en omgång med identiskt förlopp efteråt. Testerna vaktar det.
- Posterna finns i spellogiken, och flera spelare kan styra samma skepp i samma steg. Skärmen visar fortfarande bara en spelare, den lokala.
- Saker och skepp beskrivs som data. En ny skeppsklass eller en ny sorts sak behöver en rad i `src/sim/kinds.js` och en i `src/render/looks.js`, och ett nytt beteende om den ska bete sig på ett nytt sätt.
- Översynen ändrade inte hur spelet beter sig. Sex långa inspelade omgångar gav samma resultat steg för steg före och efter.
- Kvar att känna till:
  - Sidor finns sedan F-035: varje skepp, station och skott har en `side`, och `enemies()` i `src/sim/sides.js` avgör vem som slåss med vem.
  - Darts ligger kvar för sig i `state.darts` och är inte skepp i `state.vessels`. Det bör ändras när eskorter byggs (D-071).
  - Skärmarna för Engineer, inbrott och butik är formaterade men inte omskrivna. Butiken görs om i F-080.
  - Förutsägbarheten gäller inom en och samma webbläsare. Olika webbläsare kan räkna vinklar med olika avrundning, så om nätverksmotorn bygger på att alla räknar själva behövs egna vinkelfunktioner. Det hör till D-060 till D-062.
- Inför onlineläget: se D-060 till D-062. De behöver besked om hur användarens motor fungerar, om den räknar ut spelet på servern eller bara förmedlar meddelanden, och vilka gränser den har.
- Effekter och ljud läser bara av spelet och behöver aldrig skickas över nätet.

## Lagar och regler

Genomgång 2026-11-14 (D-033). Agenten är ingen jurist, och inget här är juridisk rådgivning. Officiella källor är IMY (imy.se) för personuppgifter och PTS (pts.se) för kakor och liknande lagring.

- Spelet och designsidan laddar inget från andra tjänster. Det kontrolleras med `node tests/outside.mjs`.
- Designsidan laddade tidigare typsnitt från Google Fonts. De är borttagna och sidan använder systemets typsnitt.
- Spelet hanterar inga personuppgifter: inga namn, konton eller formulär.
- Spelet sparar tre sorters saker i webbläsaren, alla på spelarens egen begäran och utan personuppgifter: om ljudet är av eller på (`critical-muted`), ljudnivåerna (`critical-volume`) och sparade spel (`critical-save-auto` och `critical-save-1` till `5`). Inga kakor. Regeln som kan beröras är lagen om elektronisk kommunikation, 9 kap. 28 §, om lagring i användarens utrustning. Lagring som behövs för något användaren själv har bett om brukar vara undantagen från samtycke. Användaren bedömer att det är okej (2026-11-14).
- Webbhotellet GitHub Pages får besökarnas IP-adresser, vilket följer av att sidan ligger där.
- Ny genomgång behövs när onlineläget byggs (D-046): spelarnamn, anslutningar och Cloudflare som ny tjänst.
