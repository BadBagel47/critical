# BACKLOG

IDs: en gemensam nummerserie. B = bugg, F = funktion, D = planering och design.
Prioritet: Hög, Medel, Låg.

## Proposed runs

**A** – standard model, medium level – Tester och verktyg
- D-058 – Låt provkörningen klicka på namngivna knappar, lägg till kontroll av stavfel och typer, och kör testerna automatiskt vid varje sparning

**B** – strong model, high level – Spara spelet
- F-079 – Spara och fortsätta en omgång i webbläsaren, och exportera och importera en sparfil, så att långa omgångar inte går förlorade

**C** – strong model, high level – Faktioner och trafik
- F-035 – Faktioner med egna stationer, områden och anseende, så att världen får sidor att förhålla sig till
- F-069 – Lägg till freighter som skeppsklass, större och långsam, så att trafiken får ett eget skepp
- F-066 – Låt andra skepp flyga fram till stationer, docka en stund och lämna, så att stationerna känns besökta
- F-067 – Låt handelsskepp, patruller och pirater hoppa in och ut ur systemet och slåss med varandra, så att miljön känns levande

**D** – strong model, high level – Sällsynta skepp
- F-070 – Juggernaut som långsamt och tungt bestyckat krigsskepp, på patrull hos faktioner och i mycket sällsynta fall som pirat
- F-086 – Namngivna unika skepp som dyker upp ibland, till exempel en känd pirat med prissumma

**E** – strong model, high level – Handel
- F-068 – Varor som köps och säljs hos stationer med olika priser, ett lastrum som går att bygga ut och en priskarta, så att man kan tjäna pengar på att frakta

**F** – strong model, medium level – Butik med bilder
- F-080 – Rita en bild för varje uppgradering, utrustning och vara och visa dem i butiken, så att det blir roligare att handla

**G** – strong model, high level – Värme
- F-084 – Vapen och motorer blir varma och Engineer måste kyla, med uppgraderingar som kyler bättre, så att Engineer får mer att göra

**H** – strong model, high level – Slå ut och borda
- F-081 – Skepp som skadas nog blir drivande och kan bordas medan besättningen är kvar, så att Gunner får välja mellan att slå ut och förstöra

**I** – strong model, high level – Missiler och raketer
- F-064 – Homing missiles som nytt vapen, raketer som släpper målet om de missar, och ammunition som köps på stationer. Båda kan träffa annat som ligger i banan

**J** – strong model, high level – Kontakt med andra skepp
- F-082 – Anropa skepp och stationer för att be om bränsle, muta eller kräva tribut, så att Captain får en ny uppgift
- F-083 – Skepp i nöd som ber om bränsle eller reparation, så att det händer saker som inte är strid
- D-071 – Eskorter som hyrs på stationer mot lön och tar enkla order, så att man kan få skydd

**K** – strong model, high level – Asteroider och anomalier
- F-085 – Skjut sönder asteroider och dra in malm att sälja, så att det finns ett lugnare sätt att tjäna pengar
- F-053 – Områden i rymden som påverkar skeppet, till exempel där man flyger och skjuter långsammare eller tar skada

**L** – strong model, high level – En värld som förändras
- F-087 – Händelser som ändrar världen: en station byter ägare, priser rör sig, en sektor blir farligare
- F-088 – Övertagna stationer betalar inkomst över tid, så att det lönar sig att ta över dem

**M** – strong model, high level – Svårare start och uppgraderingar som lönar sig
- F-050 – Justera nivåerna för vapen, sköld, motorer och engineering, så att början känns svår och uppgraderingar blir värda pengarna

**N** – strong model, high level – Musik och ljud
- F-049 – Gå igenom ljudeffekterna, lägg till de som saknas och förbättra de som finns
- F-048 – Musik för de olika lägena

Väntar på användaren: F-090 (pekskärm) behöver besked om det ska byggas. D-072 (två våningar), D-073 (uppdrag), D-074 (smuggelgods), D-089 (nät av system) och D-052 (storyläge) behöver ett samtal först. D-060, D-061 och D-062 (nätverksförberedelser) behöver besked om hur motorn fungerar. Dessutom besked i D-044 och D-045, och motorn för onlineläget (F-040).

## Hög

| ID | Vad | Status |
|---|---|---|
| F-079 | Med tanke på att detta kan bli långa spelomgångar så behöver vi också titta på hur man kan spara sin progress. Eftersom det är i webbläsaren så behöver man även kunna exportera och importera en sparfil | Ej påbörjad |
| F-050 | Justerade nivåer för vapen, sköld, motorer och engineering så att det känns att det är svårt i början och att det ska vara värt att uppgradera | Ej påbörjad |

## Medel

| ID | Vad | Status |
|---|---|---|
| F-030 | Automatisk paus när någon varit frånkopplad en stund | Ej påbörjad |
| D-058 | Tester och verktyg: provkörningen ska klicka på namngivna knappar i stället för fasta koordinater. Lägg till kontroll av stavfel och typer utan byggsteg. Kör testerna automatiskt vid varje sparning, vilket kräver en engångsåtgärd från användaren | Ej påbörjad |
| D-060 | Nätverksförberedelse: dela upp spelets tillstånd i tre lager. Det som aldrig ändras skickas en gång, det som ändras sällan skickas vid ändring, och det som rör sig skickas ofta. Mätt 2026-11-14: hela tillståndet är omkring 25 kB, varav 3 kB ändras hela tiden | Väntar på användaren |
| D-061 | Nätverksförberedelse: ge allt ett eget id. Skott, raketer och effekter saknar det i dag | Väntar på användaren |
| D-062 | Nätverksförberedelse: skicka skott som händelser (var och när de avfyrades) i stället för som positioner | Väntar på användaren |
| F-064 | Homing missiles (nytt vapen) och rockets som uppgraderingar. De ska söka sig mot mål. Missiler är mer rörliga medan raketer kan justera sin bana något, men missar den sitt mål så släpper den målet helt. Missar dessa vapen sitt mål så ska de kunna träffa andra som är i vägen för deras bana. I dag finns bara raketer, och de är för rörliga jämfört med det här. Från D-075: ammunition som köps på stationer | Ej påbörjad |
| F-048 | Musik för de olika lägena: startskärm, vanligt läge i rymden, varning för fiender, fientlig attack, lootattack och vänliga stationer | Ej påbörjad |
| F-049 | Genomgång av ljudeffekter, de som finns och de som saknas, och förbättrade effekter | Ej påbörjad |
| F-053 | Anomalier man kan hitta. Till exempel områden där man flyger och skjuter långsammare, och områden där man tar skada | Ej påbörjad |
| F-066 | Det vore trevligt om andra skepp kan besöka stationer. Att de åker fram, dockar en stund, och sedan lämnar. Från D-075: varje sektor har sin egen blandning av handelsskepp, patruller och pirater | Ej påbörjad |
| F-067 | Vänliga skepp kan hyperjumpa in och ut ur systemet. De kan stanna en stund och sedan antingen flyga till något annat ställe, eller hoppa vidare. Detta för att miljön ska kännas mer levande. Från D-075: skeppen slåss också med varandra, och pirater anfaller freighters | Ej påbörjad |
| F-068 | Handelssystem för goods. Att man kan köpa och sälja varor mellan olika stationer med olika priser. Det är inget som man själv kan använda, utan det är bara för att kunna tjäna pengar. Agentens förslag som användaren inte invänt mot: lastrum med begränsad plats som går att bygga ut, och priser som rör sig långsamt. Från D-075: prisnivåer per vara och station, och en kartvy som visar var det lönar sig | Ej påbörjad |
| F-069 | Skeppstypen freighter. Lite större långsamma skepp | Ej påbörjad |
| F-070 | Skeppstyp Juggernaut. Ett ovanligt krigsskepp som är långsamt och tungt bestyckat. Besked 2026-11-14: det kan både vara patrullerande skepp i faktioner, men i väldigt sällsynta fall även dyka upp som pirat. Kräver F-035 | Ej påbörjad |
| D-071 | Vi behöver en lösning för eskortskepp. Från D-075, godkänt av användaren: eskorter som hyrs mot lön och tar enkla order (följ, anfall mitt mål, håll avstånd). Hyrs på stationer, och i baren när den finns (D-072) | Ej påbörjad |
| D-072 | Baser ska ha två våningar med olika funktioner. Vi funderar lite på hur detta kan göras bra. Agentens första tanke: nedre våningen med luftsluss, services och shipyard, övre med armory och en bar, hiss eller trappa emellan | Väntar på användaren |
| D-073 | Det ska gå att få uppdrag på stationer man kan besöka genom att prata med folk. Detta kräver mer genomgång innan vi inför. Hänger ihop med D-052. Från D-075: fraktjobb och passagerare med tidsgräns på en anslagstavla, uppdrag med berättelse från folk i baren | Väntar på användaren |
| D-074 | Någon form av smuggelgods. Något man kan få i uppdrag att frakta som kan dra till sig pirater eller skepp som vill skydda sin faktion från handel med smuggelgods. Vi behöver titta närmare på hur detta funkar. Hänger ihop med F-068 (handel), D-073 (uppdrag) och F-035 (faktioner). Från D-075: patrullskepp skannar lasten, olaglig last ger böter och sämre anseende, och Engineer kan störa skanningen | Väntar på användaren |
| F-035 | Faktioner med egna stationer och områden. Tillbaka från parkerat 2026-11-14. Från D-075: anseende per faktion som stiger när man skjuter pirater och sjunker när man anfaller handelsskepp | Ej påbörjad |
| F-080 | Shoppen ska bli roligare med lite objektgrafik | Ej påbörjad |
| F-081 | Från D-075: skepp som slås ut i stället för att sprängas, så att de kan bordas medan besättningen är kvar. Gunner väljer mellan att slå ut och förstöra | Ej påbörjad |
| F-082 | Från D-075: anropa andra skepp och stationer. Be om bränsle eller hjälp, muta, kräva tribut. En ny uppgift för Captain | Ej påbörjad |
| F-083 | Från D-075: skepp i nöd som ber om bränsle eller reparation och betalar eller minns det | Ej påbörjad |
| F-084 | Från D-075: värme som en andra resurs bredvid energi. Vapen och motorer blir varma, och Engineer måste kyla. Användaren: det där med värme är riktigt bra, då kan vi även göra uppgraderingar som kyler systemen bättre | Ej påbörjad |
| F-085 | Från D-075: asteroidbrytning. Skjut sönder asteroider och dra in malm att sälja | Ej påbörjad |
| F-090 | Spela på mobil och surfplatta med pekskärm, i liggande format. I dag finns bara tangentbord, mus och handkontroll, så spelet går inte att styra med fingrarna. Användaren frågade 2026-11-14 och har inte bestämt om det ska byggas | Väntar på användaren |
| D-089 | Från D-075: fler och mindre system i ett nät av hoppvägar i stället för fem sektorer i rad. Stor ändring av världen som behöver pratas igenom först | Väntar på användaren |
| D-052 | Någon form av storyläge, eller åtminstone grund för vad spelet går ut på, behöver ses över | Väntar på användaren |
| F-040 | Onlinespel för upp till tre spelare via användarens motor, som bygger på Cloudflares realtidstjänster. Målet är att gratiskontot ska räcka | Väntar på motorn |
| D-031 | Hoppa tillbaka till gamla sektorer. Beslut tills vidare: det går, och sektorn är som den lämnades | Beslutat tills vidare |
| D-043 | Lägga ut medan någon är kvar inne. Beslut tills vidare: det går, och alla som är inne teleporteras hem på vanligt sätt | Beslutat tills vidare |
| D-044 | Neutrala shipyards. Beslut tills vidare: bara öppna en stund efter ett besvarat nödanrop. Det är agentens läsning av användarens ord och bör bekräftas | Väntar på användaren |
| D-045 | Nödanrop som ingen svarar på. Beslut tills vidare: inga följder. Alternativet är att stationen faller och blir fientlig | Väntar på användaren |

## Låg

| ID | Vad | Status |
|---|---|---|
| F-086 | Från D-075: namngivna unika skepp som dyker upp ibland, till exempel en känd pirat med prissumma | Ej påbörjad |
| F-087 | Från D-075: händelser som ändrar världen. En station byter ägare, priser rör sig, en sektor blir farligare | Ej påbörjad |
| F-088 | Från D-075: tribut från övertagna stationer som ger inkomst över tid | Ej påbörjad |
| D-046 | Gå igenom GDPR och lagring i webbläsaren igen när onlineläget byggs: spelarnamn, anslutningar och Cloudflare som ny tjänst | Ej påbörjad |

## Parkerat

| ID | Vad | Status |
|---|---|---|
| F-034 | Autopilot på lediga poster, för solo, två spelare och tappad anslutning | Parkerad |
| F-036 | Pirater som bordar er, med försvar i vågor i bordningsläget | Parkerad |
| F-037 | Paus och start som kräver allas godkännande | Parkerad |
| F-038 | Hoppa in mitt i ett pågående spel | Parkerad |
| F-039 | Fler skeppsklasser som fungerar olika, till exempel Interceptorn | Parkerad |
| F-076 | Köpa nya skepp och bygga flotta. Tittas på i framtiden. Går emot beslutet att spelarskeppet alltid är samma fregatt, så det beslutet behöver prövas om då. Kommer från D-075 | Parkerad |

## Klart

| ID | Vad | Klart |
|---|---|---|
| D-001 | Spelidé och designskiss, utkast 3 | 2026-11-14 |
| D-002 | Grafisk stil, skeppsklasser och fregattens uppgraderingssteg | 2026-11-14 |
| D-003 | Namn: Critical ST8 | 2026-11-14 |
| D-032 | Lootet blir kvar på platsen när någon teleporteras hem | 2026-11-14 |
| D-004 | Teknik och publicering: webbspel utan byggsteg, GitHub Pages nu och Cloudflare när nätverksmotorn byggs in | 2026-11-14 |
| F-005 | Projektgrund: spelet öppnas i webbläsaren och går att spela ensam | 2026-11-14 |
| F-006 | Captain: flyg fregatten i rymden uppifrån | 2026-11-14 |
| F-007 | Gunner: sikta och skjut med pulslaser | 2026-11-14 |
| F-008 | Engineer: fördela energi och styr reparationer | 2026-11-14 |
| F-009 | Växla fritt mellan de tre posterna | 2026-11-14 |
| F-010 | Pirater: en första fiendetyp (Fighter) | 2026-11-14 |
| F-011 | Vrak att docka med, med dockningshjälp | 2026-11-14 |
| F-012 | Pausknapp som fryser världen och visar vem som pausade | 2026-11-14 |
| D-013 | Grafik in i spelet: sprites och pixeltypsnitt exporteras från ritskripten | 2026-11-14 |
| F-014 | Bordning uppifrån: gå in och ut, vakter, kanontorn, granater och en låst valvdörr | 2026-11-14 |
| F-015 | Teleporter: hem vid nästan död, inte in igen samma bordning, liv åter när alla är tillbaka, laddning före nästa bordning | 2026-11-14 |
| F-017 | Loot: bränsleceller och lådor med krediter, högst tre saker per vända | 2026-11-14 |
| F-016 | Inbrottsspel för vrak: vrid rörbitar så att strömmen når dockningslåset innan tiden är ute | 2026-11-14 |
| F-018 | Gemensam karta med fog of war: stillastående saker ligger kvar, pirater syns bara inom sikt | 2026-11-14 |
| F-019 | Scannerpuls, sonder och radarbojar för Engineer, och en minikarta på skärmen | 2026-11-14 |
| F-020 | Stationer: vänliga, neutrala och fientliga. Tankning, reparation, butik, och övertagande av fientliga stationer | 2026-11-14 |
| F-021 | Hardpoints och system slots, köpta eller hittade, och uppgraderingar som syns på skeppet | 2026-11-14 |
| F-022 | Fler vapen: tung laser som laddas upp, målsökande raketer och dubbeltorn på vingarna | 2026-11-14 |
| F-023 | Fighter bay och Darts, med manuell start och autostart som uppgradering | 2026-11-14 |
| F-024 | Fem sektorer, stjärnkartor och hopp. Gunboats i senare sektorer och en Cruiser som boss i den sista | 2026-11-14 |
| F-026 | Enemy alarm i tre nivåer och target scanner som visar liv och bordningsrisk | 2026-11-14 |
| F-025 | Nödanrop: stationer som anfalls kallar på hjälp. En neutral station ger rabatt och öppet shipyard en stund som tack | 2026-11-14 |
| F-028 | Fler inbrottsspel: kod för stationer som bara Engineer-skärmen visar, och visarlås för fraktcontainrar | 2026-11-14 |
| F-027 | Bordarnas utrustning i en egen flik: bättre gevär, cargo pack, suit armor, breaching charges, deployable turret, hacking kit och teleporter coils | 2026-11-14 |
| F-029 | Fler skeppsuppgraderingar: afterburner, jump coils, tractor beam, point defense, targeting computer, repair drones och fuel tank | 2026-11-14 |
| F-041 | Ljud för skott, träffar, larm, motor och paneler, skapat i webbläsaren utan ljudfiler. N slår av och på | 2026-11-14 |
| F-042 | Stöd för handkontroll på alla poster, i bordning och i panelerna | 2026-11-14 |
| D-033 | Google Fonts borttaget från den publicerade designsidan. Genomgång av vad spelet laddar och sparar, med en kontroll som går att köra om | 2026-11-14 |
| F-051 | Testläge där man har alla saker från början: T på startskärmen, eller ?test i adressen | 2026-11-14 |
| F-047 | Gå ombord på alla stationer. Vänliga och neutrala har tre diskar där inne: services, shipyard och armory | 2026-11-14 |
| F-054 | Mer utarbetade visuella effekter: explosioner med tryckvåg, gnistor, rök och vrakdelar, mynningsflammor, sköldringar vid träff, motorspår, skakningar, hoppeffekt och moln i bakgrunden per sektor | 2026-11-14 |
| D-075 | Genomgång av vad från Escape Velocity med efterföljare och Endless Sky som kan passa. Användaren gillade alla förslag. De blev F-081 till F-088 och D-089, tillägg i D-056, F-064, F-066, F-067, F-068, F-035, D-071, D-072, D-073 och D-074, samt F-076 (parkerad). Valdes bort: banklån och dagar som går vid landning | 2026-11-14 |
| F-059 | Posterna finns i spellogiken. Flera spelare kan styra samma skepp, och spellogiken avgör vem som får göra vad | 2026-11-14 |
| D-055 | Skärmen är alltid i exakt ett läge, och varje läge beskrivs på ett ställe | 2026-11-14 |
| D-056 | Gemensam form för saker i rymden och för andra skepp. Saker, skeppsklasser och vapen beskrivs som data | 2026-11-14 |
| D-057 | Koden är formaterad med en sak per rad och de längsta funktionerna är uppdelade, utan att spelet beter sig annorlunda | 2026-11-14 |
| D-063 | Tester som vaktar att spelet är förutsägbart, även efter att det sparats och lästs in. Gäller varje ny funktion framöver | 2026-11-14 |
| F-077 | Text och ramar ritas på ett dubbelt så fint rutnät, i samma storlek som förut. Skeppet och rymden är som de var | 2026-11-14 |
| F-078 | Bilden fyller fönstret i stället för att hoppa mellan fasta storlekar | 2026-11-14 |
| F-065 | Stationerna är dubbelt så stora i rymdvyn, nyritade med ring, nav och fyra dockningsarmar. Dockning, kanoner och träffyta är flyttade efter det | 2026-11-14 |
