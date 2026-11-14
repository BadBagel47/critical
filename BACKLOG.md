# BACKLOG

IDs: en gemensam nummerserie. B = bugg, F = funktion, D = planering och design.
Prioritet: Hög, Medel, Låg.

## Proposed runs

**A** – strong model, high level – Teknisk översyn
- F-059 – Lägg posterna i spellogiken och ta bort antagandet om en enda spelare, så att onlineläget går att bygga
- D-055 – Gör skärmlägena till ett enda tydligt läge i taget, så att nya lägen blir enkla att lägga till
- D-056 – Ge alla saker i rymden en gemensam form, så att en ny sort inte kräver ändringar i sex filer
- D-057 – Städa upp den tätt skrivna koden utan att ändra hur spelet beter sig
- D-063 – Håll spelet förutsägbart, med testet som vaktar det

**B** – standard model, medium level – Tester och verktyg
- D-058 – Låt provkörningen klicka på namngivna knappar, lägg till kontroll av stavfel och typer, och kör testerna automatiskt vid varje sparning

**C** – strong model, medium level – Större stationer
- F-065 – Rita stationerna större i rymdvyn och flytta dockning, kanoner och träffyta efter det, så att de känns som stora platser bredvid skeppet

**D** – strong model, high level – Levande rymd
- F-069 – Lägg till freighter som skeppsklass, större och långsam, så att trafiken får ett eget skepp
- F-066 – Låt andra skepp flyga fram till stationer, docka en stund och lämna, så att stationerna känns besökta
- F-067 – Låt vänliga skepp hoppa in i systemet, stanna en stund och sedan flyga vidare eller hoppa ut, så att miljön känns levande

**E** – strong model, high level – Handel
- F-068 – Varor som köps och säljs hos stationer med olika priser, så att man kan tjäna pengar på att frakta mellan dem

**F** – strong model, high level – Missiler och raketer
- F-064 – Homing missiles som nytt vapen, och raketer som släpper målet om de missar. Båda kan träffa annat som ligger i banan

**G** – strong model, high level – Svårare start och uppgraderingar som lönar sig
- F-050 – Justera nivåerna för vapen, sköld, motorer och engineering, så att början känns svår och uppgraderingar blir värda pengarna

**H** – strong model, high level – Anomalier
- F-053 – Områden i rymden som påverkar skeppet, till exempel där man flyger och skjuter långsammare eller tar skada

**I** – strong model, high level – Musik och ljud
- F-049 – Gå igenom ljudeffekterna, lägg till de som saknas och förbättra de som finns
- F-048 – Musik för de olika lägena

Väntar på användaren: F-070 (Jaggernaut) behöver besked om vems skepp det är. D-071 (eskortskepp), D-072 (två våningar) och D-073 (uppdrag) behöver ett samtal först, liksom D-052 (storyläge). D-060, D-061 och D-062 (nätverksförberedelser) behöver besked om hur motorn fungerar. Dessutom besked i D-044 och D-045, och motorn för onlineläget (F-040).

## Hög

| ID | Vad | Status |
|---|---|---|
| F-059 | Posterna ska finnas i spellogiken, inte bara på den egna skärmen. Ta bort antagandet om en enda spelare. Förutsättning för onlineläget oavsett motor | Ej påbörjad |
| D-055 | Skärmlägena (karta, butik, inbrott, bordning, hjälp) hålls i dag isär med enskilda flaggor. Gör dem till ett enda tydligt läge i taget | Ej påbörjad |
| D-056 | Gemensam form för saker i rymden (vrak, stationer, containrar, pirater, bärgningsgods), så att rörelse, ritning, karta och kollision inte skrivs om för varje ny sort | Ej påbörjad |
| D-057 | Städa upp den tätt skrivna koden, bland annat 46 rader längre än 220 tecken, utan att ändra hur spelet beter sig | Ej påbörjad |
| F-050 | Justerade nivåer för vapen, sköld, motorer och engineering så att det känns att det är svårt i början och att det ska vara värt att uppgradera | Ej påbörjad |

## Medel

| ID | Vad | Status |
|---|---|---|
| F-030 | Automatisk paus när någon varit frånkopplad en stund | Ej påbörjad |
| D-058 | Tester och verktyg: provkörningen ska klicka på namngivna knappar i stället för fasta koordinater. Lägg till kontroll av stavfel och typer utan byggsteg. Kör testerna automatiskt vid varje sparning, vilket kräver en engångsåtgärd från användaren | Ej påbörjad |
| D-060 | Nätverksförberedelse: dela upp spelets tillstånd i tre lager. Det som aldrig ändras skickas en gång, det som ändras sällan skickas vid ändring, och det som rör sig skickas ofta. Mätt 2026-11-14: hela tillståndet är omkring 25 kB, varav 3 kB ändras hela tiden | Väntar på användaren |
| D-061 | Nätverksförberedelse: ge allt ett eget id. Skott, raketer och effekter saknar det i dag | Väntar på användaren |
| D-062 | Nätverksförberedelse: skicka skott som händelser (var och när de avfyrades) i stället för som positioner | Väntar på användaren |
| D-063 | Nätverksförberedelse: håll spelet förutsägbart. Samma start och samma kommandon ska ge exakt samma förlopp. Testet som vaktar det finns, och varje ny funktion måste klara det | Ej påbörjad |
| F-064 | Homing missiles (nytt vapen) och rockets som uppgraderingar. De ska söka sig mot mål. Missiler är mer rörliga medan raketer kan justera sin bana något, men missar den sitt mål så släpper den målet helt. Missar dessa vapen sitt mål så ska de kunna träffa andra som är i vägen för deras bana. I dag finns bara raketer, och de är för rörliga jämfört med det här | Ej påbörjad |
| F-048 | Musik för de olika lägena: startskärm, vanligt läge i rymden, varning för fiender, fientlig attack, lootattack och vänliga stationer | Ej påbörjad |
| F-049 | Genomgång av ljudeffekter, de som finns och de som saknas, och förbättrade effekter | Ej påbörjad |
| F-053 | Anomalier man kan hitta. Till exempel områden där man flyger och skjuter långsammare, och områden där man tar skada | Ej påbörjad |
| F-065 | Låt oss göra så att stationerna är större i rymdvyn | Ej påbörjad |
| F-066 | Det vore trevligt om andra skepp kan besöka stationer. Att de åker fram, dockar en stund, och sedan lämnar | Ej påbörjad |
| F-067 | Vänliga skepp kan hyperjumpa in och ut ur systemet. De kan stanna en stund och sedan antingen flyga till något annat ställe, eller hoppa vidare. Detta för att miljön ska kännas mer levande | Ej påbörjad |
| F-068 | Handelssystem för goods. Att man kan köpa och sälja varor mellan olika stationer med olika priser. Det är inget som man själv kan använda, utan det är bara för att kunna tjäna pengar | Ej påbörjad |
| F-069 | Skeppstypen freighter. Lite större långsamma skepp | Ej påbörjad |
| F-070 | Skeppstyp Jaggernaut. Ett ovanligt krigsskepp som är långsamt och tungt bestyckat. Öppet: vems skepp det är (pirat, vänligt eller båda), och stavningen i spelet | Väntar på användaren |
| D-071 | Vi behöver en lösning för eskortskepp. Öppet: vad som menas, till exempel skepp som följer och skyddar spelaren, skydd för freighters eller eskortuppdrag | Väntar på användaren |
| D-072 | Baser ska ha två våningar med olika funktioner. Vi funderar lite på hur detta kan göras bra | Väntar på användaren |
| D-073 | Det ska gå att få uppdrag på stationer man kan besöka genom att prata med folk. Detta kräver mer genomgång innan vi inför. Hänger ihop med D-052 | Väntar på användaren |
| D-052 | Någon form av storyläge, eller åtminstone grund för vad spelet går ut på, behöver ses över | Väntar på användaren |
| F-040 | Onlinespel för upp till tre spelare via användarens motor, som bygger på Cloudflares realtidstjänster. Målet är att gratiskontot ska räcka | Väntar på motorn |
| D-031 | Hoppa tillbaka till gamla sektorer. Beslut tills vidare: det går, och sektorn är som den lämnades | Beslutat tills vidare |
| D-043 | Lägga ut medan någon är kvar inne. Beslut tills vidare: det går, och alla som är inne teleporteras hem på vanligt sätt | Beslutat tills vidare |
| D-044 | Neutrala shipyards. Beslut tills vidare: bara öppna en stund efter ett besvarat nödanrop. Det är agentens läsning av användarens ord och bör bekräftas | Väntar på användaren |
| D-045 | Nödanrop som ingen svarar på. Beslut tills vidare: inga följder. Alternativet är att stationen faller och blir fientlig | Väntar på användaren |

## Låg

| ID | Vad | Status |
|---|---|---|
| D-046 | Gå igenom GDPR och lagring i webbläsaren igen när onlineläget byggs: spelarnamn, anslutningar och Cloudflare som ny tjänst | Ej påbörjad |

## Parkerat

| ID | Vad | Status |
|---|---|---|
| F-034 | Autopilot på lediga poster, för solo, två spelare och tappad anslutning | Parkerad |
| F-035 | Faktioner med egna stationer och områden | Parkerad |
| F-036 | Pirater som bordar er, med försvar i vågor i bordningsläget | Parkerad |
| F-037 | Paus och start som kräver allas godkännande | Parkerad |
| F-038 | Hoppa in mitt i ett pågående spel | Parkerad |
| F-039 | Fler skeppsklasser som fungerar olika, till exempel Interceptorn | Parkerad |

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
