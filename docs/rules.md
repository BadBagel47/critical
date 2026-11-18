# Regelboken (D-220)

Alla spelregler på ett ställe. Det som står här gäller. Förslagsdokumenten och besluten i HANDOFF.md är underlag och resonemang. Projektregeln i AGENTS.md säger hur boken används: läs den innan arbetet börjar, kontrollera varje nytt beslut mot den, och skriv in ett beslut som ändrar en regel i samma commit, med den gamla regeln märkt som ersatt.

**Första versionen, 2026-11-16.** Den är sammanställd ur besluten i HANDOFF.md, beskeden i backloggen och förslagsdokumenten. Det kan finnas dubbletter och regler som säger nästan samma sak. De rättas när de hittas.

## Så läser man den

Varje regel är en rad: `| Nr | Regel | Status | Källa | Test |`
- **Nr** är regelns eget nummer, R-001 och uppåt. Ett nummer används bara en gång och byts aldrig.
- **Status:**
  - `byggd`: så fungerar spelet i dag.
  - `bestämd`: användaren har bestämt det, men det är inte byggt än.
  - `förslag`: en agents förslag, inte godkänt.
  - `ersatt av: …`: gäller inte längre. Det som står efter "av" säger vad som ersatte den. Är den nya regeln också här skrivs dess nummer.
- **Källa** är beslutet eller dokumentet regeln kommer från.
- **Test** är testfilen som kontrollerar en byggd regel, med regelns nummer i testets namn. `saknas` betyder att testet inte är skrivet än.

`tests/rules.test.js` kontrollerar boken vid varje ändring: varje nummer en gång, en känd status och en källa för varje regel, att en ersatt regel säger vad som ersatte den, och att en byggd regel som säger sig vara testad verkligen har ett test med sitt nummer. Antalet byggda regler som saknar test får bara gå ner.

## Krockar som behöver användarens beslut

Funna när boken sattes ihop. Varje punkt har en rekommendation. Tills ett beslut finns gäller det som är byggt.

1. ~~**Bränsle i fristaden.**~~ Avgjort 2026-11-16: fristadens bas säljer billigt bränsle, och bränslet blir gratis först på ett eget köpt varv. Det ersätter gratis bränsle på den egna varvsstationen.
2. ~~**Neutrala varv.**~~ Avgjort 2026-11-16: ungefär en fjärdedel av baserna har varv, räknat för varje sida för sig, och varv på neutrala baser är öppna mot betalning. En egen bas kan köpa ett varv (R-1194). Piraternas baser räknas med (K5). Antalet system ses över (K6), så att fjärdedelen ger varv åt varje sida.
3. ~~**Ett anseende som aldrig går att höja.**~~ Avgjort 2026-11-16: inget är för gott. Ett anseende som har gått till fientligt kan återtas, med uppdrag när de finns (R-1190).
4. ~~**Gunnerns sprängladdning.**~~ Avgjort 2026-11-16: Gunner har inte alltid en laddning. Den köps och förbrukas, som byggt (R-529, R-847).
5. ~~**Engineers hackfart.**~~ Avgjort 2026-11-16: en och en halv gång så snabbt, som byggt (R-526, R-788).
6. ~~**Captains överblick vid bordning.**~~ Avgjort 2026-11-16: den bärbara radarn, som byggt (R-447, R-561).
7. ~~**Fiender mot ett dockat skepp.**~~ Avgjort 2026-11-16: risken beror på hur många som spelar. En spelare: skeppet anfalls aldrig. Två: mycket låg risk. Tre: låg risk. Det gäller alla fiender (R-1191).
8. ~~**Hur fort larmet blinkar.**~~ Avgjort 2026-11-16: larmet blinkar högst en gång i sekunden (R-1193).
9. ~~**Återvändsgränder på kartan.**~~ Avgjort 2026-11-16: de flesta system har 2–3 hoppvägar, och några tomma system längst ut får vara återvändsgränder.
10. ~~**Datorn och ett dockat skepp.**~~ Avgjort 2026-11-16: planen för baser gäller (R-813, R-731). Förslaget om datorn skrivs om efter den när det besvaras.
11. ~~**Tangenten L.**~~ Flyttad 2026-11-16: loggen och dess tangent avgörs i D-187 (meddelanden från skeppet), där användaren vill ha ett gränssnitt för skeppets meddelanden.
12. ~~**Sprängladdningens pris.**~~ Avgjort 2026-11-16: 50 krediter, som byggt, tills ekonomin ses över (R-529).
13. ~~**Bränslet i fristaden.**~~ Avgjort 2026-11-16: alla priser i fristaden är som hos en neutral bas, också bränslet (R-1091). Gratis bränsle på ett eget köpt varv gäller som förut (R-1092).
14. ~~**Pengarna i fristaden.**~~ Avgjort 2026-11-16: vrak är en bonus, och fristaden har inga (R-1097, R-1100). Där ger malmen och poddarna nog för att komma igång.

## Beslut som inte är byggda än

Här säger reglerna en sak och spelet en annan, eftersom beslutet inte är byggt. Det är inte fel, men det ska byggas. Reglerna står med status `bestämd`, och de gamla som `ersatt av`.
- Slutet är piraternas slutbas med en boss. I dag är det Cruisern i The Maw.
- Ingen flyttas tillbaka till skeppet av sig själv, och skeppet får inte hoppa medan någon är inne. I dag kallas alla hem när skeppet lägger ut.
- En övertagen bas får inget varv, utan det köps. I dag får en övertagen station shipyard.
- Faktioner kan vara i krig med varandra. I dag slåss de bara i omstridda system.
- En station som har blivit fientlig av träffar är det inte för gott, utan anseendet kan återtas (R-1190). I dag är den fientlig för gott efter åtta träffar.
- Medan besättningen är inne anfalls det dockade skeppet aldrig när en spelar, och sällan när två eller tre spelar (R-1191). I dag anfaller bounty hunters det dockade skeppet efter ungefär en minut.
- Anseendet förbättras inte av sig självt med tiden. I dag gör det det, fram till avvaktande, tills uppdragen finns.
- Kanontorn köps, och skeppet börjar med en fast kanon rakt fram. I dag har skeppet ett torn i nosen och torn på vingarna.

## Bränsle och färd

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1090 | Fristadens bas säljer billigt bränsle. Bränslet är gratis först på ett eget köpt varv. | ersatt av: R-1091 och R-1092 | Användaren 2026-11-16 (krock 1) | tests/world.test.js |
| R-1091 | Alla priser i fristadens butik är som hos en neutral bas, också bränslet, så att man inte vinner på att åka dit och handla. | byggd | Användaren 2026-11-16 (krock 13) | tests/world.test.js |
| R-1092 | Bränslet är gratis först på ett eget köpt varv. | bestämd | Användaren 2026-11-16 (krock 1) | – |
| R-1093 | Vrak ska inte finnas i överflöd. | byggd | Användaren 2026-11-16 | tests/world.test.js |
| R-1094 | I system där det finns pirater är chansen större att hitta vrak. | byggd | Användaren 2026-11-16 | tests/world.test.js |
| R-1095 | Slutet ska vara svårare att nå än andra system. | byggd | Användaren 2026-11-16 (F-234) | tests/world.test.js |
| R-1096 | Vägen till slutet öppnas också genom uppdrag som öppnar nya vägar. | bestämd | Användaren 2026-11-16 (F-234) | – |
| R-1097 | Vrak är en bonus för den som hittar dem, inte en stor inkomst som man kan räkna med. | byggd | Användaren 2026-11-16 | tests/world.test.js |
| R-1098 | Tills uppdragen finns är vägen till slutet stängd, och den öppnas av slutets stjärnkarta, som ligger i valvet på en piratbas. | byggd | Användaren 2026-11-16 (F-234, förslag 7) | tests/sim.test.js |
| R-1099 | Slutet ligger i det system som ligger längst bort, minst 4, 5 eller 6 hopp från fristaden efter kartans storlek, med en enda hoppväg in. | ersatt av: R-1199 | Användaren 2026-11-16 (F-234, förslag 5 och 6) | tests/world.test.js |
| R-1199 | Slutet ligger i det system som ligger längst bort, minst 5, 6 eller 7 hopp från fristaden efter kartans storlek, med en enda hoppväg in. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/world.test.js |
| R-1100 | Fristaden har inga vrak. Där piraterna håller systemet finns oftast ett vrak och ibland två, i vartannat omstritt system ett, och annars sällan något. | byggd | Användaren 2026-11-16 (F-233, förslag 1 och 2) | tests/world.test.js |
| R-1101 | Inget nytt vrak driver in när ett har sprängts. Kommer man tillbaka till ett system efter en stund kan ett nytt ligga där, oftast där piraterna finns, aldrig i fristaden. | byggd | Användaren 2026-11-16 (F-233, förslag 3) | tests/world.test.js |
| R-1102 | En nedskjuten gunboat eller ett fraktskepp lämnar ett vrak ibland, inte varje gång. | byggd | Användaren 2026-11-16 (F-233, förslag 4) | tests/sim.test.js |
| R-1086 | Ett vrak har 0 eller 1 bränslecell, och en cell räcker till ett hopp. En station har en cell i valvet. | byggd | Användaren 2026-11-16 | tests/world.test.js |
| R-1087 | Bränslemätaren visar med markeringar hur många hopp skeppet kan göra, utan siffror. | byggd | Användaren 2026-11-16 | tests/world.test.js |
| R-1088 | Krediterna från alla belöningar räknas om efter antalet spelare, gånger 1, 0,75 och 0,6 för en, två och tre, så att en besättning på tre tjänar ungefär en femtedel mer än en ensam spelare totalt. | förslag | Agenten 2026-11-16, utifrån docs/economy.md | – |
| R-001 | Överladdningen av vapen och sköld är borttagen, och bara motorernas överladdning (boosten) finns kvar. | byggd | HANDOFF beslut 2026-11-16 | saknas |
| R-002 | En träff på skölden nollställer en boost som håller på att laddas. | byggd | HANDOFF beslut 2026-11-16; proposal-world.md steg 2 fråga 2, BACKLOG F-197 | tests/fuel.test.js |
| R-003 | Bränslet är gratis bara på besättningens egen varvsstation. | byggd | HANDOFF beslut 2026-11-16; proposal-world.md steg 2, BACKLOG D-100, proposal-economy.md 1.5 regel 9 (bestämt) | saknas |
| R-004 | Solcellerna tar en slot. | byggd | HANDOFF beslut 2026-11-16 | saknas |
| R-005 | Solcellerna fyller bränsle för ett hopp på ungefär fem minuter. | byggd | HANDOFF beslut 2026-11-16 | tests/fuel.test.js |
| R-006 | Hopp kostar bränsle. | byggd | HANDOFF beslut | saknas |
| R-007 | Bränsle kostar pengar hos neutrala stationer. | byggd | HANDOFF beslut | saknas |
| R-008 | Bränsle förbrukas av gasen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-009 | Med tom tank står skeppet nästan still. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-010 | Man ska kunna få slut på både bränsle och pengar. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 2 och "Aldrig låsa sig", BACKLOG D-100 | tests/fuel.test.js |
| R-011 | Bränsle kommer inte tillbaka av sig självt; vägarna ut är asteroider som ger bränsle och solceller som köps. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-012 | Långa sträckor inom ett system tas med en speed boost som laddas upp. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-013 | Boosten laddas fortare med mer energi till motorerna. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 2, BACKLOG F-197 | saknas |
| R-014 | Boosten nollställs av beskjutning, och samma regel gäller hoppet till ett nytt system. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-015 | Boosten är samma sak som överladdningen av motorerna. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-016 | Tanken rymmer 100 bränsle, och Fuel Tank ger 60 till. | byggd | proposal-world.md steg 2 (Läget i dag), proposal-economy.md 1.1, proposal-items.md 1 | saknas |
| R-017 | Ett hopp kostar 25 bränsle, eller 15 med Jump Coils. | byggd | proposal-world.md steg 2, proposal-economy.md 1.2 | saknas |
| R-018 | Ett hopp laddas i 8 sekunder, och Jump Coils kortar tiden (4 sekunder enligt src). | byggd | proposal-world.md steg 2, src/sim/balance.js | saknas |
| R-019 | Bränslet kommer inte tillbaka av sig självt. | byggd | proposal-world.md steg 2, BACKLOG D-100 | saknas |
| R-020 | Med tom tank kryper skeppet fram på en femtedels kraft. | byggd | proposal-world.md steg 2 och "Aldrig låsa sig", BACKLOG D-100 | tests/fuel.test.js |
| R-021 | Full gas drar ungefär 0,2 bränsle i sekunden, så en full tank räcker till åtta till tio minuters gas. | byggd | proposal-economy.md 1.2 | saknas |
| R-022 | Speed boost är motorernas överladdning. Engineer eller Captain laddar den med Z, och Captain släpper den. | byggd | proposal-world.md steg 2, BACKLOG F-197 | saknas |
| R-023 | Boosten ger 1,7 gånger dragkraften i 12 sekunder. | byggd | BACKLOG F-197 | saknas |
| R-024 | Boosten drar bränsle i samma takt som den ökar farten, så den sparar tid men inte bränsle. | byggd | BACKLOG F-197, proposal-world.md steg 2 (förslag) | saknas |
| R-025 | Ett hopp som laddas börjar om vid en träff, så att man inte kan fly ur en strid. | byggd | proposal-world.md steg 2, BACKLOG F-197 | tests/fuel.test.js |
| R-026 | En scanning kostar 3 bränsle. | byggd | proposal-world.md steg 2, BACKLOG D-100, src/sim/balance.js | saknas |
| R-027 | Varje asteroid som går sönder lämnar en bit malm. | byggd | proposal-world.md steg 2, BACKLOG F-085 | tests/fuel.test.js |
| R-028 | Man plockar upp malm genom att flyga över den eller dra in den med traktorstrålen, och lastrummet tar högst 30 bitar. | byggd | BACKLOG F-085 | saknas |
| R-029 | Malm blir bränsle av sig själv, men bara när tanken inte räcker till ett hopp. | byggd | proposal-world.md steg 2, BACKLOG F-085, D-100 | saknas |
| R-030 | Den malm som inte går till bränsle säljs på stationer (SELL ORE). | byggd | proposal-world.md steg 2, BACKLOG F-085 | saknas |
| R-031 | En bit malm ger 4 bränsle eller säljs för 6 krediter. | byggd | src/sim/balance.js | saknas |
| R-032 | Vanliga vapen bryter asteroider och behöver ingen ammunition. | byggd | BACKLOG F-085, D-100, proposal-world.md steg 2 (förslag) | saknas |
| R-033 | Solceller kostar 200 krediter, tar en systemslot och fyller ungefär ett hopps bränsle på fem minuter. | byggd | proposal-world.md steg 2, BACKLOG F-194 | saknas |
| R-034 | Bränsle hos vänliga stationer kostar 70 procent av normalpriset. | byggd | proposal-world.md steg 2, BACKLOG D-100 | saknas |
| R-035 | Bränsle hos neutrala stationer kostar 1 kredit per enhet, alltså 100 för en full tank. | byggd | proposal-economy.md 1.2 | saknas |
| R-036 | En bränslecell ger 25 bränsle. | byggd | proposal-economy.md 1.1 | saknas |
| R-037 | Man kan inte hoppa medan skeppet ligger dockat eller någon i besättningen är kvar i det man bordat. | byggd | src/sim/sectors.js, BACKLOG F-211 | saknas |
| R-038 | Man anländer en liten bit från basen, med nosen mot den och svag motoreffekt, och glider dit. | byggd | proposal-world.md steg 3, BACKLOG F-196 och D-089, src/sim/balance.js | saknas |
| R-039 | Man hamnar aldrig i stjärnan efter ett hopp, och aldrig så nära att man inte hinner styra bort. | byggd | proposal-world.md steg 3, BACKLOG D-089, src/sim/balance.js | saknas |
| R-040 | Vid en fientlig bas anländer man utanför basens räckvidd. | byggd | proposal-world.md steg 3 (förslag), src/sim/balance.js | saknas |
| R-041 | Man kan hoppa tillbaka, och ett system är som man lämnade det. | byggd | proposal-world.md steg 3, BACKLOG D-031, src/sim/sectors.js | saknas |
| R-042 | Hoppen med bränsle är en viktig del av spelet. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-043 | Vid hopp till ett utforskat system väljer Captain vilken bas man anländer vid, med förvald bas i ordningen vänlig, neutral, fientlig. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 3, BACKLOG D-089 | tests/world.test.js |
| R-044 | Vid hopp till ett okänt system slumpas ankomstplatsen. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 3, BACKLOG D-089 | tests/world.test.js |
| R-045 | Ett hopp tar under en halv minut, så man hinner fram även två hopp bort. | bestämd | station-boarding.md §14 | – |
| R-046 | Skeppet får lämna dockan och röra sig i systemet, men aldrig hoppa så länge någon är kvar inne i basen. | bestämd | proposal-bases.md §4 | – |
| R-047 | Ett hopp till ett outforskat system kostar lika mycket bränsle som andra hopp. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-048 | Captain ser senast kända status på baserna, eller aktuell status om en boj ligger i systemet. | byggd | proposal-world.md steg 3, BACKLOG D-089 | tests/world.test.js |
| R-049 | Utan val anländer man vid en förvald bas: först en känd vänlig, sedan en neutral, sist en fientlig. | byggd | proposal-world.md steg 3, BACKLOG D-089 | tests/world.test.js |
| R-050 | Alla hoppvägar går åt båda håll, så vägen hem finns alltid. | byggd | proposal-world.md "Aldrig låsa sig" och steg 3 (förslag) | tests/world.test.js |
| R-051 | Varje system har 2–3 hoppvägar. | ersatt av: R-1089 | proposal-world.md steg 3 besked, BACKLOG D-089 | – |
| R-052 | Ett eget varv ger gratis bränsle och gratis lagning. | förslag | proposal-bases.md §7 | – |
| R-053 | En slumpad ankomst hamnar aldrig intill en fientlig bas eller mitt i en samling asteroider. | förslag | proposal-world.md steg 3 | – |
| R-054 | Besättningens egen varvsstation i första sektorn ger gratis bränsle. | ersatt av: ett senare beslut, se källan | proposal-bases.md §1 (ersatt av fristaden utan varv, §5) | – |
| R-055 | Ett hopp som laddas bryts inte av beskjutning. | ersatt av: f-197: en träff gör att hoppet börjar om | proposal-world.md steg 2 (Läget i dag) | – |
| R-056 | Bränsle är gratis hos vänliga stationer. | ersatt av: steg 2 2026-11-16: 70 procent av priset hos vänliga | proposal-world.md steg 2 (Läget i dag), proposal-economy.md 1.1 och 1.2 | – |
| R-057 | Man kan bara hoppa till en sektor man har stjärnkarta till. | ersatt av: R-115 | BACKLOG D-089 besked 2026-11-15, src/sim/sectors.js | – |

## Kartan och systemen

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1089 | De flesta system har 2–3 hoppvägar, och några tomma system längst ut är återvändsgränder med en enda väg. Slutet har också en enda väg in (R-1099). | byggd | Användaren 2026-11-16 (krock 9) | tests/world.test.js |
| R-058 | Sektorer nås med stjärnkartor som hittas eller köps. | ersatt av: R-115 och R-120 | HANDOFF beslut | – |
| R-059 | Det går att hoppa tillbaka till sektorer man varit i, och de är som de lämnades (tills vidare). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-060 | Det är fri sikt i rymden. | byggd | HANDOFF beslut | saknas |
| R-061 | Stillastående objekt ligger kvar på kartan i senast kända läge, och skepp syns bara medan de ses. | byggd | HANDOFF beslut | saknas |
| R-062 | Det finns fem fasta sektorer: Kestrel Drift, Ash Belt, Hollow Reach, The Narrows och The Maw. | byggd | HANDOFF beslut 2026-11-14; proposal-economy.md 1.5 regel 3, src/sim/sectors.js | saknas |
| R-063 | Stjärnkartor kan ligga i valv. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-064 | Ett nödanrop visar var stationen ligger, även om den inte är hittad. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-065 | Scannerpuls, sonder och radarbojar finns från start tills butiken är byggd. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-066 | Sonder och bojar fylls på av sig själva med tiden. | ersatt av: R-1148; fortfarande byggt | HANDOFF beslut 2026-11-14 | – |
| R-067 | Kartan öppnas med M av vem som helst. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-068 | Kartans verktyg används från Engineer-posten. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-069 | Systemen finns i tre storlekar. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-070 | Kartans skala följer systemets storlek. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-071 | Asteroider finns i varje system men aldrig runt baser, och i större samlingar på vissa ställen. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-072 | Asteroider genereras så att de inte tar slut. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-073 | Varje system har en stjärna i mitten och ett asteroidbälte. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-074 | Kartan inuti ett system har ingen fog of war och visar stjärnan och det skeppet ser. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 1, BACKLOG F-199 | saknas |
| R-075 | En scanning kostar bränsle och visar hela systemet som en engångsbild av nuläget. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-076 | Asteroider är det enda skeppet krockar med. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-077 | Stjärnans mitt spränger ett skepp utan bra sköld, men med mycket sköld klarar man sig. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-078 | Systemets kant är ett dis av stoft och is som bromsar skeppet tills det stannar. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 1, BACKLOG F-196 | saknas |
| R-079 | Stjärnan och diset är påslagna i alla spel. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-080 | Andra skepp påverkas inte av stjärnan eller diset (avvikelse). | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-196 | saknas |
| R-081 | Systemen är runda som ett solsystem, med en stjärna i mitten och ett asteroidbälte. | byggd | proposal-world.md steg 1, BACKLOG F-196 | saknas |
| R-082 | Systemen finns i tre storlekar: 1200, 1800 och 2400 punkter från mitten. | ersatt av: R-1200 | proposal-world.md steg 1 (förslag), BACKLOG F-196, src/sim/balance.js | saknas |
| R-1200 | Systemen finns i tre storlekar: 3000, 4000 och 5000 punkter från mitten till kanten. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/sim.test.js |
| R-083 | Diset ritas som en mjuk ring på kartan. | byggd | proposal-world.md steg 1 | saknas |
| R-084 | Stjärnans mitt bränner först skölden och sedan skrovet tre gånger hårdare. | byggd | proposal-world.md steg 1, BACKLOG F-196 | saknas |
| R-085 | Med vanlig sköld går skeppet förlorat rakt över stjärnan, men med den bättre skölden och all energi på sköld och motorer klarar det sig. | byggd | proposal-world.md steg 1, BACKLOG F-196 | saknas |
| R-086 | Stjärnans farliga område är litet, och skadan stiger ju närmare mitten man kommer. | byggd | proposal-world.md steg 1 (förslag), src/sim/balance.js | saknas |
| R-087 | Det finns asteroider i varje system, så att man alltid kan skaffa bränsle. | byggd | proposal-world.md steg 1 och steg 3 besked, BACKLOG D-089 och D-100 | tests/world.test.js |
| R-088 | Asteroiderna ligger i ett bälte och i två till fyra tätare fält, aldrig närmare en station än 330. | byggd | proposal-world.md steg 1, BACKLOG F-200 | saknas |
| R-089 | Nya asteroider kommer till utom synhåll, så att fälten aldrig tar slut. | byggd | proposal-world.md steg 1, BACKLOG F-200 | saknas |
| R-090 | Asteroider är det enda skeppet krockar med. Över baser, skepp, vrak och pods flyger man. | byggd | proposal-world.md steg 1, BACKLOG F-200 | saknas |
| R-091 | En stor asteroid som skjuts sönder blir två mellanstora, en mellanstor blir två små, och en liten försvinner. | byggd | BACKLOG F-200 | saknas |
| R-092 | En scanning (Q) lägger allt i systemet på kartan som en engångsbild och visar asteroidfälten. | byggd | proposal-world.md steg 1, BACKLOG F-199 | saknas |
| R-093 | Engineer har sonder och bojar som förbrukas och fylls på (3 sonder och 2 bojar enligt src). | byggd | proposal-items.md 1, src/sim/balance.js | saknas |
| R-094 | En stjärnkarta kostar 100 hos en vänlig station och 150 hos en neutral. | byggd | proposal-economy.md 1.2 | saknas |
| R-095 | Ett vraks valv har 35 procents chans på en stjärnkarta om en saknas, en stations valv har den alltid, och en karta man redan har ger 60 krediter. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-096 | Det ska finnas många system, mindre än dagens sektorer och runda som ett solsystem. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-097 | En systemradar som köps visar vilken sida grannsystemen hör till. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-098 | Det minsta antalet system ska vara fler än fem. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-099 | System ska gå att upptäcka själv genom att hoppa dit, inte bara genom kartor. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-100 | En boj håller sitt system uppdaterat och syns på stjärnkartan. | byggd | HANDOFF beslut 2026-11-15; proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-101 | En sond skickas till ett grannsystem. | byggd | HANDOFF beslut 2026-11-15 | tests/world.test.js |
| R-102 | Stjärnkartan visar obesökta grannar som outforskade. | byggd | HANDOFF beslut 2026-11-15 | tests/world.test.js |
| R-103 | Dolda system syns inte förrän storyn lagt till dem. | bestämd | HANDOFF beslut 2026-11-15; proposal-world.md steg 3, BACKLOG D-089 | – |
| R-104 | Olika system får olika stjärnor när kartan blir genererad. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-105 | Kartans storlek väljs vid start. | byggd | HANDOFF beslut 2026-11-14 | tests/world.test.js |
| R-106 | Startsystemet är en fristad nära kartans mitt, utan pirater och utan faktioner som bråkar. | byggd | HANDOFF beslut 2026-11-16; proposal-world.md steg 3 besked, BACKLOG F-213 och D-089 | tests/world.test.js |
| R-107 | Kartan ska inte vara symmetrisk. | byggd | HANDOFF beslut 2026-11-16; proposal-bases.md §5; BACKLOG F-213 och D-089 | saknas |
| R-108 | Det minsta valet av antal system ska ge ungefär två timmars spel. | bestämd | proposal-bases.md §2 | – |
| R-109 | Startsystemet är en fristad utan pirater och utan bråkande faktioner, med bara en neutral bas. | byggd | proposal-bases.md §5 | tests/sim.test.js |
| R-110 | Fristaden ligger i eller nära mitten av stjärnkartan. | byggd | proposal-bases.md §5 | tests/world.test.js |
| R-111 | Systemen genereras för varje omgång. | byggd | proposal-world.md steg 3, BACKLOG D-089 | tests/world.test.js |
| R-112 | Vid start väljer man 8, 12 eller 18 bebodda system (det ska provas). | ersatt av: R-1195 | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-1195 | Kartan har 20 system på SHORT, 35 på MEDIUM och 50 på LONG, bebodda och tomma tillsammans. Hur många som är bebodda är inte bestämt. | ersatt av: R-1196 | Användaren 2026-11-16 (K6, F-258) | – |
| R-1196 | Kartan har 25 system på SHORT, 40 på MEDIUM och 55 på LONG, bebodda och tomma tillsammans. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/world.test.js |
| R-113 | Det finns lika många tomma system som bebodda, alltså 16, 24 eller 36 totalt, och fler tomma ju längre ut man kommer. | ersatt av: R-1197 | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-1197 | 40 procent av systemen är bebodda, alltså 10, 16 eller 22, och resten är tomma, fler ju längre ut man kommer. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen), K7 | tests/world.test.js |
| R-1198 | Piraterna håller ungefär en femtedel av de bebodda systemen, de som ligger längst ut, och slutet räknas in. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/world.test.js |
| R-1202 | Tomma system väljs ett i taget, oftare längre ut, men mer sällan bredvid ett system som redan är tomt, så att tomma system inte ligger i klumpar. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/world.test.js |
| R-1203 | På den kortaste vägen från fristaden till slutet ligger högst ett tomt system i rad. | byggd | Användaren 2026-11-16 (F-258, kartsimuleringen) | tests/world.test.js |
| R-1204 | Två baser i samma system har aldrig samma namn. | byggd | Agentens rättelse 2026-11-16 (F-258), så att Captain kan välja rätt bas att hoppa till | tests/world.test.js |
| R-114 | Antalet system avgör hur många uppdrag det finns före slutet. | bestämd | proposal-world.md steg 3, BACKLOG D-052 | – |
| R-115 | Man upptäcker system genom att hoppa dit, och stjärnkartan visar närliggande obesökta system som outforskade. | byggd | proposal-world.md steg 3, BACKLOG D-089 | tests/sim.test.js |
| R-116 | En sond skickas till ett närliggande system, ett hopp bort, och visar vad som finns där. | byggd | proposal-world.md steg 3 | tests/world.test.js |
| R-117 | Systemradarn köps och visar vems de närliggande systemen är och om de är vänliga eller omstridda. | byggd | proposal-world.md steg 3, BACKLOG F-195 | tests/world.test.js |
| R-118 | Systemradarn scannar grannsystemen av sig själv, och statusen uppdateras när man kommer inom räckvidd. | byggd | BACKLOG F-195 | tests/world.test.js |
| R-119 | Systemradarns nivå 1 når ett hopp för 200 krediter, och nivå 2 når två hopp för 350. | byggd | proposal-world.md steg 3 besked, BACKLOG F-195 | tests/world.test.js |
| R-120 | En köpt eller hittad stjärnkarta visar 3 system i närheten med status som när den köptes: stationer, ägare och farlighet. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/sim.test.js |
| R-121 | En stjärnkarta uppdateras inte efteråt och fungerar som en scanning av de systemen. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/sim.test.js |
| R-122 | Ett tomt system har asteroider, ibland ett vrak eller en pod och ibland pirater. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-123 | Ett tomt system kan ibland ha något eget: ett tätt asteroidfält, ett vrakfält eller senare anomalier. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-124 | Systemen har tre storlekar blandat, med flest små, och tomma system kan vara mindre. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-125 | Farligheten ökar ett steg för varje två hopp från startsystemet, upp till steg 3. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-126 | Slutet ligger slumpat i ett av de tre bebodda system som ligger längst bort. | ersatt av: R-1099 | proposal-world.md steg 3 besked, BACKLOG D-089 | – |
| R-127 | Olika system får olika stjärnor i färg och storlek (förslag D), och de kommer med den genererade kartan. | bestämd | BACKLOG D-089 och F-201 | – |
| R-128 | Stjärnkartan visar ett system i ägarens färg och ett omstritt system randigt i båda färgerna. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | saknas |
| R-129 | Status syns bara för system som man har köpt karta över, scannat eller satt ut en boj i. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-130 | Systemen närmast fristaden är lätta. | byggd | proposal-bases.md §5 | tests/world.test.js |
| R-131 | Systemen sprids i klungor med tomrum emellan, och hoppvägar går mellan närmaste grannar med några genvägar, återvändsgränder och slingor. | byggd | proposal-bases.md §5; BACKLOG D-089 (agentens förslag i proposal-bases.md avsnitt 5) Byggt som agentens förslag i världssteg 3. | saknas |
| R-132 | Varje faktion får ett sammanhängande område, inte jämna tårtbitar. | förslag | proposal-bases.md §5 | – |
| R-133 | Piraternas slutbas ligger långt ut, och dolda system ligger utanför de vanliga vägarna. | förslag | proposal-bases.md §5 | – |
| R-134 | Baserna ligger stilla på olika avstånd från stjärnan, och inget rör sig i banor. | förslag | proposal-world.md steg 1 | – |
| R-135 | Stjärnkartan blir en bild med punkter och linjer i stället för en lista. | förslag | proposal-world.md steg 3 | – |
| R-136 | Hemsystemet är alltid av samma slag, och farligheten stiger med avståndet hemifrån. | förslag | proposal-world.md steg 3 | – |
| R-137 | Systemnamn sätts ihop av egna ordlistor. | förslag | proposal-world.md steg 3 | – |
| R-138 | Fog of war finns bara på kartan, men det ersattes 2026-11-15 av en karta utan fog of war inuti systemet. | ersatt av: ett senare beslut, se källan | HANDOFF beslut | – |
| R-139 | Spelet börjar vid besättningens egen varvsstation i första sektorn. | ersatt av: R-109 | BACKLOG F-196 | – |

## Stationer och baser

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-140 | Dockning ska vara enkel. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-141 | Nosen behöver vara inom 48 punkter från dockningsarmen för att docka (förut 20). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-142 | Närmaste dockningsarm väljs. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-143 | Skeppet dras in och vrids rätt av sig självt på ungefär en sekund. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-144 | Farten får vara högst 32 vid dockning. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-145 | Stationer är vänliga, neutrala eller fientliga mot besättningen. | byggd | HANDOFF beslut | saknas |
| R-146 | Skeppet kan bara byggas om vid en station med shipyard. | byggd | HANDOFF beslut | saknas |
| R-147 | En vänlig eller neutral station som anfalls kan sända nödanrop. | byggd | HANDOFF beslut | saknas |
| R-148 | En station som inte överlever ett anfall faller till piraterna och blir fientlig. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-149 | En station som fallit till piraterna måste tas över för att bli vänlig igen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-150 | Baser har turrets och sköld. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-151 | Dockade skepp får en liten extra sköld som syns på sköldmätaren och går att uppgradera. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-152 | En fientlig station tas över från en terminal i dess valv. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-153 | Stationerna är 192 punkter tvärs över, mot fregattens 108 på längden. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-154 | Ett nödanrop som ingen svarar på avgörs av stationens eget försvar, som klarar sig eller faller till piraterna. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-155 | F vid en vänlig eller neutral station går ombord, utan lås och utan krav på laddad teleporter. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-156 | Att lägga ut kallar hem dem som är ombord på en station, utan teleport och utan kostnad. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-157 | En station som blir fientlig får en ny insida. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-158 | En övertagen station får diskar nästa gång någon går in. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-159 | En station har fyra kanontorn. | ersatt av: R-1163 | HANDOFF beslut 2026-11-14 | saknas |
| R-160 | En stations sköld är 200 och börjar laddas efter fem sekunder utan träffar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-161 | En stations skrov är 1500 och lagas efter tjugo sekunder utan träffar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-162 | En träff på ett kanontorn slår ut tornet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-163 | En piratstations kanoner gör dubbel skada. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-164 | En station som fallit till piraterna tas över som andra piratstationer och blir då besättningens. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-165 | En station som besättningen själv skjutit ner till noll tystnar bara och byter inte ägare. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-166 | Dockningsskölden är 40, och 90 med uppgraderingen Docking Field. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-167 | Dockningsskölden laddas på fyra sekunder och försvinner när skeppet lägger ut. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-168 | Under en sådan strid släpper stationen inte in någon. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-169 | En neutral bas ska gå att ta över inifrån, med stor risk: red alert, bounty hunters som anfaller skeppet och sjunkande anseende. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-170 | Stationer kan falla till angripare även när besättningen är i ett annat system (på prov). | byggd | HANDOFF beslut 2026-11-14; station-boarding.md §14 | saknas |
| R-171 | En station som anfalls varnar i tre nivåer, low, medium och high, efter hur stor risken är att den faller. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-172 | Ljusen på dockningsarmarnas spetsar visar hållningen: grönt vänlig, vitt neutral, gult avvaktande, släckt stängd och rött fientlig. | byggd | HANDOFF beslut 2026-11-14 | tests/base.test.js |
| R-173 | Dockningsarmarna är infällda och fälls ut när ett skepp är inom 150 punkter och rör sig långsamt. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-174 | Spelet börjar vid den egna varvsstationen och inte i systemets mitt. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-175 | Skeppet startar så nära varvsstationen att ett F-tryck kan börja docka. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-176 | En station under attack ska ge dockningssköld tills angriparna hackat mainframen. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-173 | saknas |
| R-177 | Wardens extra plattor på stationsringen är bara utseende och har inga kanoner. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-178 | En station är en ring runt ett nav med en luftsluss i varje arm. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-179 | Anfall på egna stationer sker i tre steg. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-180 | En station som faller behåller halva försvaret. | byggd | HANDOFF beslut 2026-11-14; BACKLOG F-122, proposal-bases.md avsnitt 1 | saknas |
| R-181 | Stationernas nuvarande storlek är godkänd. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-182 | Dörrarna till butik och armory är öppna i lugnt läge och stängda i lockdown och vid larm. | byggd | station-boarding.md §1 | saknas |
| R-183 | Den egna stationen är alltid i lugnt läge. | byggd | station-boarding.md §2 | saknas |
| R-184 | En vänlig eller neutral station är i lugnt läge när man kommer in, och går till larm om man blir upptäckt där man inte får vara. | byggd | station-boarding.md §2 | saknas |
| R-185 | En fientlig station är i lockdown när man kommer in. | byggd | station-boarding.md §2 | saknas |
| R-186 | En stängd station släpper inte in någon alls. | byggd | station-boarding.md §2 | saknas |
| R-187 | Mainframen står längst in, och man måste alltid ta sig förbi vakterna för att nå den. | byggd | station-boarding.md §3 | saknas |
| R-188 | Mainframen står i det rum som ligger längst från luftslussen, utom valvet. | byggd | station-boarding.md §8 | saknas |
| R-189 | Varje station har en öppen del för besökare och en personaldel. | byggd | station-boarding.md §3 | saknas |
| R-190 | I det byggda är personaldelen rummen utan disk, eftersom planlösningen ännu saknar nav. | byggd | station-boarding.md §9 | saknas |
| R-191 | Handelsstationer får vakter, kameror och en personaldel. | byggd | station-boarding.md §13 | saknas |
| R-192 | Det finns en mainframe-panel på varje station, och innehållet beror på vem man är för stationen. | byggd | station-boarding.md §8 | saknas |
| R-193 | Övertagandet flyttar från terminalen i valvet till mainframen. | byggd | station-boarding.md §8, §13 | saknas |
| R-194 | På en ägd station kan man i mainframen reparera stationen, slå på lagade kanontorn och uppgradera försvaret. | byggd | station-boarding.md §8 | saknas |
| R-195 | Ägda stationer lagar sig inte själva, utan man väljer i panelen vad som ska lagas och arbetet fortsätter när man är borta. | byggd | station-boarding.md §8, §13 | saknas |
| R-196 | Säkerheten inuti ger fler vakter om stationen faller och ska tas tillbaka. | byggd | station-boarding.md §8 | saknas |
| R-197 | Övertagandet av en neutral bas startas med två klick i panelen och tar 30 sekunder. | byggd | station-boarding.md §9 | saknas |
| R-198 | Stationens kanoner vänder sig mot skeppet medan övertagandet pågår. | byggd | station-boarding.md §9 | saknas |
| R-199 | Det pågår aldrig mer än ett anfall åt gången på era stationer i hela världen, och det går alltid att hinna dit. | byggd | station-boarding.md §11, §14 | saknas |
| R-200 | En station som anfalls skickar ett meddelande med varningen LOW, MEDIUM eller HIGH. | byggd | station-boarding.md §14 | saknas |
| R-201 | Varningen är LOW under en fjärdedels risk att falla, MEDIUM mellan en fjärdedel och hälften och HIGH över hälften. | byggd | station-boarding.md §14 | saknas |
| R-202 | Varningsnivån uppdateras när läget ändras. | byggd | station-boarding.md §14 | saknas |
| R-203 | Ett anfall sker i tre steg: belägring, bordning och avgörande, likadant vare sig ni är på plats eller inte. | byggd | station-boarding.md §14 | saknas |
| R-204 | Belägringen avgörs av angriparnas styrka mot stationens sköld och kanontorn. | byggd | station-boarding.md §14 | saknas |
| R-205 | När det yttre försvaret är nere dockar ett bordningsskepp och striden flyttar in. | byggd | station-boarding.md §14 | saknas |
| R-206 | Bordningen avgörs av bordarnas styrka mot vakter, turrets och säkerhetsnivå. | byggd | station-boarding.md §14 | saknas |
| R-207 | Bordarna behöver ungefär en och en halv minut inne för att nå mainframen och ta stationen. | byggd | station-boarding.md §14 | saknas |
| R-208 | Är besättningen på plats spelas belägringen som en vanlig strid i rymden. | byggd | station-boarding.md §14 | saknas |
| R-209 | Är besättningen i ett annat system räknas varje steg ut med samma styrkor och lite slump. | byggd | station-boarding.md §14 | saknas |
| R-210 | Kommer besättningen fram mitt i ett anfall blir det en riktig strid i det steg anfallet nått, med stationen så skadad som den är. | byggd | station-boarding.md §14 | saknas |
| R-211 | Att skjuta sönder det dockade bordningsskeppet stoppar inte övertagandet, bara förstärkning och flykt. | byggd | station-boarding.md §14 | saknas |
| R-212 | Bordningsskeppet skyddas av stationens dockningssköld, precis som ert eget skepp. | byggd | station-boarding.md §14 | saknas |
| R-213 | Övertagandet stoppas bara inne i stationen, av det inre försvaret eller av besättningen. | byggd | station-boarding.md §14 | saknas |
| R-214 | Varje bordare som slås ut försvagar anfallet, men klockan fram till mainframen går ändå. | byggd | station-boarding.md §14 | saknas |
| R-215 | Ett anfall tar fyra till sex minuter från första varningen till avgörandet om ingen hjälper till. | byggd | station-boarding.md §14 | saknas |
| R-216 | En nyss övertagen station lämnas i fred i fem minuter. | byggd | station-boarding.md §14 | saknas |
| R-217 | Det går minst åtta minuter mellan två anfall, och fler egna stationer ger inte fler anfall. | byggd | station-boarding.md §14 | saknas |
| R-218 | En station som faller blir angriparens och behåller halva det försvar ni köpt, och ni får tillbaka den halvan om ni tar den igen. | byggd | station-boarding.md §14 | saknas |
| R-219 | Bordningsskeppet dockar vid den arm som ligger längst från fregatten. | byggd | station-boarding.md §14 | saknas |
| R-220 | Går besättningen in medan stationen bordas möter den bordarna som vakter. | byggd | station-boarding.md §14; BACKLOG F-122 | saknas |
| R-221 | Försvaret för en egen station köps i mainframen: sköld, kanoner och säkerhet inuti, i tre nivåer för 250, 450 och 700 krediter. | byggd | BACKLOG F-110 och F-215 | saknas |
| R-222 | En egen station lagas från mainframen del för del, även från ett annat system, och lagar sig inte själv. | byggd | BACKLOG F-110 | saknas |
| R-223 | Ett lagat kanontorn står avslaget tills man slår på det i panelen. | byggd | BACKLOG F-110 | saknas |
| R-224 | Uppgraderingar i HULL och SYSTEMS kräver shipyard, och ARMORY säljs på alla stationer som handlar. | byggd | proposal-economy.md 1.2 | saknas |
| R-225 | Alla stationer har en mainframe längst in i det rum som ligger längst från luftslussen. | ersatt av: R-563 | BACKLOG F-109 | saknas |
| R-226 | Hos en fiende hackar man mainframen i tre nivåer, och varje nivå fyller en spårningsmätare som utlöser larmet när den är full. | byggd | BACKLOG F-109 | saknas |
| R-227 | Nivå 1 visar planritningen för alla, nivå 2 låter Engineer stänga av kameror och turrets i 60 sekunder och öppna valvet, och nivå 3 tar över stationen. | byggd | BACKLOG F-109 | saknas |
| R-228 | Alla poster kan ta över en station, så den som spelar ensam är aldrig utelåst. | byggd | BACKLOG F-109 | saknas |
| R-229 | Ett övertagande av en station som handlar med en tar 30 sekunder, och Engineer gör det snabbare. | byggd | BACKLOG F-114 | saknas |
| R-230 | En egen station rapporterar anfall med risk LOW, MEDIUM eller HIGH och ungefär hur många minuter som är kvar, även när besättningen är i ett annat system. | byggd | BACKLOG F-121, proposal-bases.md avsnitt 1 | saknas |
| R-231 | Högst ett anfall pågår åt gången i hela världen. | byggd | BACKLOG F-123, proposal-bases.md avsnitt 1 | saknas |
| R-232 | En nytagen station lämnas i fred i fem minuter, och det går minst åtta minuter mellan anfall. | byggd | BACKLOG F-123 | saknas |
| R-233 | Pirater anfaller oftare i farliga sektorer med piratstationer, i en grupp på fyra till sex med en Gunboat som bordar. | byggd | BACKLOG F-123 | saknas |
| R-234 | En faktion anfaller bara när den är fientlig, oftare ju sämre anseendet är, och helst stationer som tagits från den. | byggd | BACKLOG F-123 | saknas |
| R-235 | En faktion anfaller med två Gunboats och håller sig till stationens försvar. | byggd | BACKLOG F-123 | saknas |
| R-236 | Ett anfall på en egen station har tre steg: belägring, bordning och avgörande. Där besättningen inte är räknas de ut. | byggd | BACKLOG F-122 | saknas |
| R-237 | Handelsstationer har en personaldel (skylt STAFF) med vakter och kameror, och den som blir sedd där utlöser larmet. | byggd | BACKLOG F-206 | saknas |
| R-238 | Ingen kastas ut när en station blir fientlig. Stationen larmar i stället. | byggd | BACKLOG F-206 och F-114 | saknas |
| R-239 | Egna stationer har ingen personal att smyga förbi. | byggd | BACKLOG F-206 | saknas |
| R-240 | En station kan inte förstöras, den tystnar bara, och dess kanontorn lämnar inget. | byggd | proposal-economy.md 2.1 | saknas |
| R-241 | Ett övertagande ska inte gå att fuska sig ur genom att skjuta sönder skeppet som har dockat. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-242 | En fiende som skeppet ligger dockat vid ger ingen extra sköld. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-243 | En attack inifrån på en neutral bas börjar i en öppen del, och det finns en del bara för personal. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-244 | Tills vidare finns en vanlig bastyp, standardbasen, plus piraternas slutbas. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §1; BACKLOG D-072, proposal-bases.md avsnitt 1 | – |
| R-245 | Standardbasen genereras varje gång. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §3; BACKLOG F-208 | – |
| R-246 | Standardbasen har tre våningar: entré i den ljusa, rena mitten där det lagliga finns, smutsig industri med last och vakter i källaren, och kommandodelen med mainframen överst. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-247 | Entrén är en luftsluss med knappar där båda dörrarna aldrig är öppna samtidigt. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §3; BACKLOG F-209 | – |
| R-248 | Ett övertagande kräver något i källaren först och sedan mainframen överst. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §3; BACKLOG F-209 | – |
| R-249 | Efter källaren går övertagandet inte på tid, utan läget skärps steg för steg. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §3; BACKLOG F-209 | – |
| R-250 | Baserna anpassas efter antalet spelare, så att det inte blir för svårt ensam. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-251 | Fristaden har en neutral bas som inte kan tas över. | byggd | HANDOFF beslut 2026-11-16; BACKLOG F-213 | tests/world.test.js |
| R-252 | Inga anfall sker i fristaden. | byggd | HANDOFF beslut 2026-11-16; proposal-bases.md §1, §5; BACKLOG F-213, proposal-bases.md avsnitt 1 | tests/sim.test.js |
| R-253 | Det finns inget varv i fristaden. | byggd | HANDOFF beslut 2026-11-16; proposal-bases.md avsnitt 1, BACKLOG F-213 | tests/sim.test.js |
| R-254 | En övertagen bas får inget varv. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-255 | Basens försvar köps i mainframen, och fullt utbyggt gör det risken för övertagande mycket låg. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-256 | Basernas utsida ska bli större (inte 1:1) och hänga ihop med våningarna. | bestämd | HANDOFF beslut 2026-11-16; BACKLOG D-217 | – |
| R-257 | Piraternas slutbas börjar i botten: man kommer in vid dockorna i industrivåningen och arbetar sig uppåt. | bestämd | HANDOFF beslut 2026-11-16; BACKLOG F-219 | – |
| R-258 | Dockningsringen vrids i fasta lägen. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-259 | Där det finns flera våningar står mainframen på den översta. | bestämd | station-boarding.md §3 | – |
| R-260 | Den öppna delen har luftsluss, services, shipyard och armory, och där får besökare vara. | bestämd | station-boarding.md §3 | – |
| R-261 | Personaldelen har korridorer, vaktrum, valv och mainframe, och en markerad dörr skiljer delarna åt. | bestämd | station-boarding.md §3 | – |
| R-262 | Varje turret har en väg runt, eller en strömbrytare som går att nå utan att passera den, och det vaktas av ett test. | bestämd | station-boarding.md §6 | – |
| R-263 | Lockdown tar slut av sig själv när stationen tas över. | bestämd | station-boarding.md §8 | – |
| R-264 | Det finns inget eget varv i början, utan spelet börjar i en fristad. | byggd | proposal-bases.md §1, §5 | tests/sim.test.js |
| R-265 | Anfall på egna baser följer fortfarande reglerna i station-boarding.md §14. | bestämd | proposal-bases.md §1 | – |
| R-266 | Föremål har samma form inne som i rymden. | bestämd | proposal-bases.md §3; BACKLOG F-208 | – |
| R-267 | Standardbasen har tre våningar: källare, mitten och översta våningen, med var sin stil. | bestämd | proposal-bases.md §3 | – |
| R-268 | Mittenvåningen är ljus och ren, man kommer in där, och där finns services, shipyard om basen har det, armory och bar. | bestämd | proposal-bases.md §3; BACKLOG F-208 och D-072 | – |
| R-269 | Källaren är smutsig industri med dockor och ett stort lastutrymme med vakter. | bestämd | proposal-bases.md §3; BACKLOG F-208 | – |
| R-270 | Översta våningen är en kall kommandodel med mainframen, där basen tas över. | bestämd | proposal-bases.md §3 | – |
| R-271 | Basen har både öppna ytor och skydd, inga rum så små att striderna blir svåra, och vägval i stället för en rak väg. | bestämd | proposal-bases.md §3 | – |
| R-272 | Bränsletunnor finns bara där de passar, som i last och verkstad, inte i bostäderna. | bestämd | proposal-bases.md §3; BACKLOG F-208 | – |
| R-273 | Basen har rum som fyller ut så att den känns som en riktig plats. | bestämd | proposal-bases.md §3 | – |
| R-274 | Det finns inget varv i startsystemet, så man måste ge sig ut när man skaffat pengar. | bestämd | proposal-bases.md §5 | – |
| R-275 | Basen i fristaden kan inte tas över och är alltid en trygg plats att komma tillbaka till. | byggd | proposal-bases.md §5 | tests/world.test.js |
| R-276 | En övertagen bas får inget varv, utan varvet är en permanent uppgradering som köps till basen. | bestämd | proposal-bases.md §1, §7 | – |
| R-277 | Alla standardbaser kan köpa varv. | bestämd | proposal-bases.md §7 | – |
| R-1194 | Ungefär en fjärdedel av baserna har varv, räknat för varje sida för sig: en fjärdedel av de neutrala baserna, en fjärdedel av THE DRIFTERS baser och så vidare, också piraternas. Varv på neutrala baser är öppna mot betalning. | byggd | Användaren 2026-11-16 (krock 2, K1, K5) | tests/world.test.js |
| R-1201 | Varje gruppering som har baser som kan få varv har minst ett varv, också när en fjärdedel avrundas till noll. Fristaden och piraternas slutbas får aldrig varv. | byggd | Användaren 2026-11-16 (K8) | tests/world.test.js |
| R-278 | Försvaret köps i mainframen (sköld, kanontorn och inre säkerhet), och fullt utbyggt ska risken att basen tas över vara mycket låg. | bestämd | proposal-bases.md §7 | – |
| R-279 | Basens utsida i rymden ska bli större än i dag, men inte i skala 1:1. | bestämd | proposal-bases.md §8 | – |
| R-280 | Utsidan ska hänga ihop med hur basen är byggd med våningar. | bestämd | proposal-bases.md §8 | – |
| R-281 | En designskiss av varvet och utsidan görs före bygge. | bestämd | proposal-bases.md §8 | – |
| R-282 | Basen får en vridbar dockningsring med fast nav, som vrids i fasta lägen en port i taget. | bestämd | proposal-bases.md §9 | – |
| R-283 | Dockningsringen ska ha en demo med full design innan den byggs. | bestämd | proposal-bases.md §9 | – |
| R-284 | Den egna varvsstationen handlar alltid. | bestämd | proposal-world.md "Aldrig låsa sig" | – |
| R-285 | Varvet är en permanent uppgradering som köps till en bas, och alla standardbaser kan köpa det. | bestämd | BACKLOG F-215, proposal-bases.md avsnitt 1 | – |
| R-286 | På eget varv får man tillbaka tre fjärdedelar när man byter bort en del, annars hälften. | bestämd | BACKLOG F-215 | – |
| R-287 | Det finns inget förråd för delar. | bestämd | BACKLOG F-215 | – |
| R-288 | Standardbasens översta våning är en kall kommandodel med mainframen. | bestämd | BACKLOG F-208 | – |
| R-289 | Baserna har öppna ytor och skydd, inga för små rum och flera vägar att välja mellan. | bestämd | BACKLOG F-208 | – |
| R-290 | Under bordning fylls drönare på vid larm, och vakter kan komma med ett skepp som dockar. | bestämd | BACKLOG F-210 | – |
| R-291 | Förstärkningsskeppet anfaller inte ett dockat skepp som ingen sitter i. | ersatt av: R-1191 | BACKLOG F-210 (ersatt av krock 7) | – |
| R-292 | Baserna anpassas efter antalet spelare: vakter, drönare, tid till förstärkning, hur fort läget skärps och bossens liv. | bestämd | BACKLOG F-212 | – |
| R-293 | Piraternas slutbas är en urholkad asteroid i tre våningar, genererad varje gång, med lastutrymme, vakter, skattkammare och bränsletunnor. | bestämd | BACKLOG F-219 | – |
| R-294 | Slutbasens boss är en pirat i en mech-dräkt, och bossrummet har en mekanik för att besegra den. | bestämd | BACKLOG F-219 | – |
| R-295 | Efter bossen tar man över slutbasen. Det blir ingen sprängning och ingen flykt. | bestämd | BACKLOG F-219 | – |
| R-296 | Tar en standardbas med källare och översta våning mer än cirka 40 minuter ska den kortas. | förslag | proposal-bases.md §2 | – |
| R-297 | Källarsteget är att slå ut strömmen, varpå nödkraft ger svagare ljus och dörrarna uppe går att forcera. | bestämd | proposal-bases.md §3; Användaren 2026-11-16 (fråga 2 och 3 i proposal-bases.md §12) | – |
| R-298 | Strömmen kan slås ut tyst vid ställverket eller högljutt genom att spränga det, med olika följder för larmet. | ersatt av: R-1167 | proposal-bases.md §3 | – |
| R-299 | Personaldelen ligger i källaren och på översta våningen, och mitten är öppen för besökare. | förslag | proposal-bases.md §3 | – |
| R-300 | Varvet syns utifrån som en byggdocka utanpå basen, och egna baser har ockra ljus. | ersatt av: R-1160 och R-1169 | proposal-bases.md §7 | – |
| R-301 | Inne finns ett varvsrum som en hangar med mekaniker vid disken. | förslag | proposal-bases.md §7 | – |
| R-302 | Det personliga på egna baser kommer av det man gjort, som karta över tagna baser, bosstroféer, skeppets namn och en brits per spelare. | förslag | proposal-bases.md §7 | – |
| R-303 | Försvaret syns: fler och större kanontorn, skölden som ett skimmer och fler vakter, kameror och låsta dörrar inne. | bestämd | proposal-bases.md §7; Användaren 2026-11-16 (designtest D-217) | – |
| R-304 | Utsidan byggs av samma data som insidan. | ersatt av: R-1157 | proposal-bases.md §8 | – |
| R-305 | Utsidan blir ungefär tre gånger dagens storlek. | förslag | proposal-bases.md §8 | – |
| R-306 | Våningarna syns som terrasser uppifrån, med källaren bredast och den översta minst. | ersatt av: R-1156 | proposal-bases.md §8 | – |
| R-307 | Saker sitter på samma plats ute som inne: dockor vid luftslussarna, fönster vid rummen och byggdockan utanför varvsrummet. | ersatt av: R-1157 | proposal-bases.md §8 | – |
| R-308 | Dockningsringen har åtta portar och lägen för drift, service och stängd. | ersatt av: R-1153 | proposal-bases.md §9 | – |
| R-309 | Eget varv ger gratis bränsle och lagning. | förslag | BACKLOG F-215 | – |
| R-310 | Det man gör i källaren är att slå ut strömmen. | bestämd | BACKLOG F-209; Användaren 2026-11-16 (fråga 2 och 3 i proposal-bases.md §12) | – |
| R-311 | Drönarhangar och kommunikationsrum går att slå ut, förstärkningen har en synlig nedräkning, och inget dyker upp från ingenstans. | bestämd | BACKLOG F-210; Användaren 2026-11-16 (designtest D-217) | – |
| R-312 | Bossstriden har tre pyloner, faser och svep som visas i förväg. | förslag | BACKLOG F-219 | – |
| R-313 | Basernas utsida byggs av samma data som insidan, ungefär tre gånger dagens storlek, med våningarna som terrasser. | ersatt av: R-1156 och R-1157 | BACKLOG D-217 | – |
| R-314 | Dockningsringen är en ytterring runt ett fast nav som vrids i fasta lägen, så att man når sitt skepp från en annan arm. | ersatt av: R-1154 | BACKLOG D-218 | – |
| R-315 | En station som blir fientlig kastar ut alla, men det ersattes av att ingen längre kastas ut (beslutat i docs/station-boarding.md, inte byggt). | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 | – |
| R-316 | Besättningens egen varvsstation i första sektorn kan aldrig anfallas, tas över eller bli fientlig. | ersatt av: ett senare beslut, se källan | station-boarding.md §11, §14 (ersatt av fristaden, proposal-bases.md §1, §5) | – |
| R-317 | Små stationer får en våning och större två (D-072), och stora baser är 1,5 gånger större (F-103). | ersatt av: ett senare beslut, se källan | proposal-bases.md §1 (ersatt av en vanlig bastyp, standardbasen med tre våningar, plus piraternas slutbas) | – |
| R-318 | En övertagen station får shipyard. | ersatt av: ett senare beslut, se källan | proposal-bases.md §1 (ersatt av att varvet köps som permanent uppgradering, §7); proposal-economy.md 1.1 | – |
| R-1152 | Mellan basen och ringen är en sluten skiva: källaren går ända ut till ringen, och ringen glider runt på dess kant. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1153 | Ringen har fyra portar för skepp, på diagonalerna. Fraktskepp dockar vid lastarmar som går rakt ut från källaren åt fyra håll, under ringen. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1154 | Ett skepp dockar vid en ledig port, och sedan vrids ringen ett kvarts varv åt gången tills porten står vid bron. Vid byggdockan vrids ringen inte. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/layout.test.js |
| R-1155 | En fast bro går från luftslussen på mittvåningen rakt ut till ringen, och porten har en dockningstub som fälls ut när ett skepp kommer och in när det har åkt. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1156 | Våningarna syns utifrån som låga, runda kupoler ovanpå varandra, källaren bredast och toppen minst, med ljus och skuggor från stjärnans håll. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1157 | Utsidan stämmer med insidan där det spelar roll: bron går från luftslussen, byggdockan ligger utanför varvsrummet och tornen sitter på sina rum. Fönster och andra detaljer är bara utseende. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1158 | Fönster finns runt om på alla våningar. De flesta lyser, några är släckta, och blandningen slumpas vid varje ankomst. Toppen har breda utsiktsfönster. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1159 | Utsidans lampor visar hållningen som dockningsarmarna (R-172): 48 lampor runt ringen, portarnas ljus, fyren på toppen och tornens ljus. En dämpad lampa går runt ringen ett varv på åtta sekunder. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1160 | En egen bas lyser blåturkos utanpå, så att den inte går att ta för en vänlig. Det som är målat på en egen bas har besättningens turkos. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1161 | När besättningen har tagit en bas målas ST8 på mittens kupol, mellan två portar på andra sidan från bron. Andra baser har inget namn målat. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1162 | Utanpå står varje bas vriden i en slumpad vinkel. Inne vrids planen bara i kvarts varv, och bron och luftslussen ska ändå passa ihop. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1163 | Basen har tio platser för kanontorn: fyra på källaren, fyra på mittens kant mellan portarna och två tunga på toppen. Lätt försvar ger två torn, medel sex och sköld, fullt alla tio och en starkare sköld. | ersatt av: R-1208 | Användaren 2026-11-16 (designtest D-217) | – |
| R-1164 | En stor kanon kan köpas för sig, oberoende av försvarsnivån, och står mitt på toppens kupol. Utan den är platsen en stängd lucka. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1165 | Ytterväggarna inne följer basens runda form, både i bilden och när man går och krockar. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1166 | Höga föremål och stängda dörrar skymmer också synfälten, och kameror sitter bara på riktiga väggar, inte i dörröppningar eller bakom höga föremål. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1167 | Strömmen kan slås ut tyst vid ställverket eller högljutt genom att spränga det. Tyst ändrar inte läget, men efter en stund skickas en vakt för att se efter. Högljutt går fort, men larmet går direkt. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1168 | Efter källaren skärps läget i steg ju längre man dröjer: vakterna drar sig upp mot hissen och trapporna till toppen, drönare släpps från hangaren om den är hel, basen ropar på förstärkning med en synlig nedräkning som kommunikationsrummet kan stoppa, och förstärkningen dockar med fler vakter. Takten sätts vid provspel. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1169 | Varvet syns utifrån som en byggdocka med balkar, kranar och strålkastare, och en gångbro över ringen till varvsrummet. Utan varv är rummet en utsiktssalong. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |

## Faktioner och anseende

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-319 | En neutral station som får hjälp förblir neutral men ger rabatt under en tid. | byggd | HANDOFF beslut | saknas |
| R-320 | Anseendet hör till den faktion som stationen tillhör. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-321 | Hos en station utan faktion gäller anseendet bara just den stationen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-322 | Pirater är fristående och aggressiva mot alla. | byggd | HANDOFF beslut | saknas |
| R-323 | Faktioner finns i spelet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-324 | En station som besättningen skjuter på i lugn och ro varnar vid första träffen och slår tillbaka från nästa. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-325 | Av träffar på en station blir den avvaktande efter två, stängd efter fem och fientlig för gott efter åtta. | ersatt av: R-1190 | HANDOFF beslut 2026-11-14 (ersatt av krock 3) | saknas |
| R-1190 | Av träffar blir en station avvaktande efter två, stängd efter fem och fientlig efter åtta. Det är inte för gott: anseendet kan återtas, med uppdrag när de finns. | bestämd | Användaren 2026-11-16 (krock 3) | – |
| R-326 | Ett besvarat nödanrop ger 40 procent rabatt i tre minuter hos en neutral station. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-327 | En vänlig station betalar 100 krediter för ett besvarat nödanrop. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-328 | Man börjar som neutral hos alla faktioner. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-329 | Piraterna står utanför faktionerna. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-330 | Dåligt anseende ger först högre priser, sedan stängda stationer och sist patruller som anfaller. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-331 | Det ska alltid gå att höja ett lågt anseende. | byggd | HANDOFF beslut 2026-11-14; station-boarding.md §11 | saknas |
| R-332 | Drift Post står för sig själv, Ash Depot är Drifters, Hollow Market är Charter, Narrows Dock är Wardens och övriga stationer är piraternas. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-333 | Faktionerna syns oftast i sina hemsektorer. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-334 | Faktionernas färger är Charter gult, Wardens blått, Drifters rostbrunt och pirater lila med röda märken. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-335 | Anseendet går från -100 till 100 och börjar på 0. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-336 | Vid anseende från 50 är man vänlig och får billig reparation. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-337 | Från -20 är man avvaktande och priserna blir 1,5 gånger högre. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-338 | Från -50 är man stängd: ingen handel och ingen släpps in. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-339 | Från -80 är man fientlig och stationer och skepp öppnar eld. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-340 | Anseendet sjunker 10 per träff på en station, 2 per träff på ett skepp och 25 för ett förstört skepp. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-341 | Har det väl gått till eld faller anseendet till botten. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-342 | Anseendet stiger 0,5 hos alla för varje nedskjuten pirat. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-343 | Anseendet stiger 20 hos stationens sida för att rädda en station ur ett anfall. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-344 | Anseendet stiger av sig självt med tiden upp till avvaktande. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-345 | Från botten tar det ungefär sju minuter till stängd och tjugo minuter till avvaktande. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-346 | Ingen förlåter medan besättningen ligger dockad vid en av deras fientliga stationer. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-347 | Faktionerna slåss inte med varandra, och alla slåss med pirater. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-348 | Tacken för hjälp vid ett anfall (rabatt eller krediter) kommer bara om besättningen själv träffat någon av angriparna. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-349 | Ett nytt trafikskepp eller en patrull kommer var tjugonde till fyrtiofemte sekund, högst fem samtidigt. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-350 | Två av tre trafikskepp är fraktskepp. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-351 | Fraktskepp besöker en eller två stationer i 12 till 25 sekunder var. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-352 | Patruller är två skepp som går en runda förbi stationerna. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-353 | Ingen trafik kommer till en sektor där piraterna har alla stationer. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-354 | Den första träffen på någon som inte är fiende ger en varning. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-355 | En träff till inom en halv minut efter varningen startar en strid där sidans skepp och stationens kanoner i sektorn behandlar besättningen som fiende. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-356 | Skott som redan var på väg när varningen kom räknas inte. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-357 | Striden lägger sig 25 sekunder efter besättningens sista skott. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-358 | Striden gäller bara i sektorn och är skild från anseendet, som fortsätter sjunka för varje träff. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-359 | Beväpnade skepp från samma sida kommer till hjälp från längre håll än de annars ser, både mot besättningen och när pirater anfaller sidans station. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-360 | Obeväpnade skepp flyr från fiender som kommer nära och från besättningens första skott. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-361 | Skepp från andra sidor nära en strid mellan besättningen och någon annan ger upp sitt ärende och hoppar ut. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-362 | När det blir strid vid en bas ger sig skepp med intresse av striden in i den, och skepp utan intresse håller sig undan eller lämnar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-363 | Bounty hunters är en kombination av en prissumma och anfall då och då. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-364 | En faktion man är ovän med kan anfalla ens stationer, mer organiserat och aggressivt än pirater, och oftare ju sämre anseendet är och ju mer utbredd faktionen är i systemet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-365 | Den som har en egen flotta kommer själv, och den som inte har det sätter ett pris på besättningen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-366 | Stationer utan faktion sätter prissumma, både vid övertagande och när de skjuts till fiende utifrån. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-367 | Faktioner svarar med egna skepp och anfall, aldrig med bounty hunters. | byggd | HANDOFF beslut 2026-11-14; station-boarding.md §16 | saknas |
| R-368 | Att ta över en neutral bas ska vara svårt och en stor risk. | byggd | station-boarding.md §9 | saknas |
| R-369 | När larmet går på en neutral bas sjunker anseendet hos basens sida direkt med 40. | byggd | station-boarding.md §9 | saknas |
| R-370 | Tar man över en bas som tillhör en faktion blir faktionen fientlig. | byggd | station-boarding.md §9 | saknas |
| R-371 | Vid övertagande tappar alla andra sidor 10 i anseende. | byggd | station-boarding.md §9 | saknas |
| R-372 | Dåligt anseende förbättras av sig själv med tiden, men bara upp till "misstänksam". | byggd | station-boarding.md §10 (ska ersättas när uppdragen finns) | saknas |
| R-373 | Anseendet "stängd" betyder ingen handel och att ingen släpps in, men de skjuter inte. | byggd | station-boarding.md §10 | saknas |
| R-374 | Pirater anfaller oftare ju farligare sektorn är och ju fler piratstationer där finns. | byggd | station-boarding.md §14 | saknas |
| R-375 | En ovän faktion anfaller oftare ju sämre anseendet är och ju fler stationer den har i och nära sektorn, helst mot stationer ni tagit från den. | byggd | station-boarding.md §14 | saknas |
| R-376 | En faktion anfaller bara när anseendet är "fientlig", och vid "stängd" håller den bara er ute. | byggd | station-boarding.md §14 | saknas |
| R-377 | Varje nedskjuten pirat ger 0,5 i anseende hos alla sidor man har träffat. | byggd | proposal-economy.md 1.4 punkt 5 | saknas |
| R-378 | Ett besvarat nödanrop ger 20 i anseende. | byggd | proposal-economy.md 1.1 och 1.5 regel 6 | saknas |
| R-379 | Stegen i anseende är vänlig, neutral, avvaktande (högre priser), stängd (ingen handel) och fientlig (öppnar eld). | byggd | proposal-economy.md 1.5 regel 5, src/sim/balance.js | saknas |
| R-380 | Att skjuta ett fraktskepp eller en faktionspatrull kostar 25 i anseende plus 2 per träff. | byggd | proposal-economy.md 1.4 punkt 8 och 2.1 | saknas |
| R-381 | Den som tar över en station som handlar med en förlorar 40 i anseende hos stationens sida, och larmet går direkt. | byggd | BACKLOG F-114 | saknas |
| R-382 | När en station har tagits över blir dess faktion fiende, alla andra sidor sänker anseendet med 10, och en fri station sätter en prissumma på 300 krediter. | byggd | BACKLOG F-114 | saknas |
| R-383 | En minut efter att ett övertagande börjat kommer hjälp: bounty hunters från en fri station eller faktionens egna skepp. | byggd | BACKLOG F-114 | saknas |
| R-384 | Bounty hunters (två Fighters och en Gunboat) kommer var tredje till fjärde minut, högst en grupp åt gången. | byggd | BACKLOG F-114 | saknas |
| R-385 | Jakten slutar när prissumman betalas på en station som handlar med en, eller när tre grupper är besegrade. | byggd | BACKLOG F-114 | saknas |
| R-386 | Faktionernas namn och karaktär är platshållare som ses över i D-095. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-387 | THE CHARTER är ett handelsförbund med rika stationer och bra priser som betalar för frakt och eskort (platshållare). | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-388 | THE WARDENS är en ordningsmakt som patrullerar med tunga skepp, har de bästa varven och skannar efter smuggelgods (platshållare). | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-389 | THE DRIFTERS är fria bärgare och nybyggare i utkanten med billiga reparationer, som köper allt och inte bryr sig om smuggelgods (platshållare). | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-390 | Anseende ska inte förlåtas med tiden utan förtjänas, främst genom faktionsuppdrag som kan ge plus hos en och minus hos en annan. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-391 | Förlåtelsen med tiden tas bort först när uppdragen finns. | bestämd | HANDOFF beslut 2026-11-14; station-boarding.md §10, §13 | – |
| R-392 | Faktioner ska kunna vara i krig med varandra. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-393 | Det blir ett krig mellan två faktioner per omgång. | bestämd | HANDOFF beslut 2026-11-14; BACKLOG F-119 | – |
| R-394 | En faktion vars station besättningen håller kan bli "stängd". | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-395 | Juggernaut patrullerar hos faktioner och dyker i mycket sällsynta fall upp som pirat. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-396 | Man ska inte bli förlåten med tiden, utan får jobba för anseendet främst genom faktionsuppdrag. | bestämd | station-boarding.md §10 | – |
| R-397 | Faktioner ska kunna vara i krig med varandra (F-119). | bestämd | station-boarding.md §10 | – |
| R-398 | Så länge ni håller en faktions station kan anseendet hos den faktionen som bäst bli "stängd". | bestämd | station-boarding.md §10 | – |
| R-399 | Det ska alltid finnas en väg tillbaka: pirater, nödanrop och faktionsuppdrag som erbjuds på andras baser. | bestämd | station-boarding.md §10; proposal-economy.md 1.5 regel 6, BACKLOG F-118 | – |
| R-400 | Ett system kan ägas av en faktion eller vara omstritt. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-401 | Ungefär ett av fem bebodda system är omstritt och ligger på gränsen mellan två faktioners områden. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-402 | I ett omstritt system har båda faktionerna stationer, och deras patruller skjuter på varandra när de möts. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 | tests/world.test.js |
| R-403 | Hjälper man den ena sidan stiger anseendet hos den och sjunker hos den andra. | byggd | proposal-world.md steg 3 besked, BACKLOG D-089 och D-073 | tests/world.test.js |
| R-404 | Ett system byter inte ägare i steg 3. Det kommer med F-087. | bestämd | proposal-world.md steg 3 besked | – |
| R-405 | Anseende höjs genom uppdrag och inte av sig självt med tiden. | bestämd | proposal-world.md steg 4, BACKLOG F-118, proposal-economy.md 1.5 regel 6 | – |
| R-406 | Ett dåligt anseende stiger i dag av sig självt upp till avvaktande. Det ska tas bort när uppdragen finns. | bestämd | proposal-economy.md 1.5 regel 6, BACKLOG F-118 | – |
| R-407 | Faktionernas platshållarnamn gäller tills de gås igenom, och orden Kestrel och Drifters ses över. | bestämd | BACKLOG D-095, proposal-world.md "Lagar och regler" | – |
| R-408 | Varje faktion har ett eget område av grannsystem. | förslag | proposal-world.md steg 3 | – |
| R-409 | En pirat ska ge 0,1 i anseende i stället för 0,5. | förslag | proposal-economy.md 1.5 regel 6 och 1.6 | – |
| R-410 | Ett uppdrag ger 8 i anseende, och ett misslyckat kostar 5. | förslag | proposal-economy.md 1.5 regel 6 | – |
| R-411 | Vänliga stationer ska ge 10 procent rabatt på uppgraderingar när testperioden i D-044 är över. | förslag | proposal-economy.md 1.5 regel 5 och 1.6 | – |
| R-412 | Stationens egen färg visar hur den behandlar besättningen, men det ersattes 2026-11-14 av ljusen på dockningsarmarna. | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 | – |

## Bordning

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-413 | Bordning visas uppifrån, i samma vinkel som rymden. | byggd | HANDOFF beslut | saknas |
| R-414 | Vem som bordar bestäms genom att spelarna pratar med varandra. | byggd | HANDOFF beslut | saknas |
| R-415 | Vem som helst kan gå in eller ut medan skeppet ligger dockat. | byggd | HANDOFF beslut | saknas |
| R-416 | Den som nästan dör teleporteras hem och kan inte gå in igen under samma bordning. | byggd | HANDOFF beslut | saknas |
| R-417 | När alla är tillbaka på skeppet får alla tillbaka sitt liv. | byggd | HANDOFF beslut | saknas |
| R-418 | Teleportern måste vara laddad för att en spelare ska kunna borda nästa gång. | byggd | HANDOFF beslut | saknas |
| R-419 | Det som bärs blir kvar på platsen när någon teleporteras hem, så att en annan bordare kan plocka upp det. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-420 | Captain kan lägga ut medan någon är kvar inne. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-421 | Mål är olika svåra att borda. | byggd | HANDOFF beslut | saknas |
| R-422 | En scanner visar hur svårt ett mål är att borda. | byggd | HANDOFF beslut | saknas |
| R-423 | Vrakets reaktor räknar ner från första steget in. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-424 | När reaktorn når noll sprängs vraket och alla som är inne teleporteras hem. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-425 | När ett vrak sprängs skadas ett dockat skepp. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-426 | När ett vrak sprängs dyker ett nytt vrak upp på annat håll. | ersatt av: R-1097 | HANDOFF beslut 2026-11-14 | – |
| R-427 | En nedskjuten Gunboat blir ett vrak som går att borda. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-428 | Inne på ett ställe finns tre lägen: lugnt (handelsgolv), lockdown (stället räknar besättningen som fiende) och larm (upptäckt). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-429 | Lockdown är mörkt med roterande röda ljus och stängda dörrar, och man smyger. | ersatt av: R-1149 | HANDOFF beslut 2026-11-14 | saknas |
| R-430 | Ett larm ligger kvar tills man gått, och man kan inte gömma sig och vänta ut det. | byggd | HANDOFF beslut 2026-11-14; station-boarding.md §1 | saknas |
| R-431 | Smygande med larm, kameror och lockdown gäller inte i vrak, där räknar reaktorn ner i stället. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-432 | Sövda vakter vaknar efter en stund. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-433 | Den som går fram till en sövd vakt innan den vaknar kan oskadliggöra den med knappen TAKE DOWN. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-434 | En vakt som hittar en sövd vakt utlöser larmet direkt. | byggd | HANDOFF beslut 2026-11-14; station-boarding.md §4 | saknas |
| R-435 | Alla tre rollerna har en bonus vid bordning, och bonusen får inte ge mycket övertag. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-436 | Gunner slåss bättre vid bordning. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-437 | Engineer hackar mainframen snabbare och når fler funktioner. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-438 | Alla kan använda mainframen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-439 | Stationens egna turrets inomhus ska gå att smyga förbi och är bara aggressiva mot fiender. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-440 | Spelarnas egna turrets är engångssaker. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-441 | Inomhusmiljöns form matchar objektet man bordat. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-442 | Planlösningen slumpas för varje omgång, så att alla objekt har olika vägar och rum. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-443 | Skepp och stationer ser olika ut inuti. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-444 | Vakter slåss från skydd, går runt när de är flera och hör varandras skott. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-445 | Vakter av det försiktiga slaget drar sig undan när de är skadade. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-446 | Den stora radarn finns bara på skeppet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-447 | Captain har en bärbar radar med kort räckvidd när hen själv går in, och det är Captains bonus vid bordning. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-448 | Den som spelar ensam väljer mellan mer skada (Gunner), snabbare hack (Engineer) och bärbar radar (Captain). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-449 | Bordarens lampa går att tända och släcka så att man inte syns. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-450 | Bordarens lampa lyser bara framåt, som en ficklampa. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-451 | Vakter ser åt ett håll, ser spelare i ljus på långt håll och i mörker bara på nära håll. | byggd | HANDOFF beslut 2026-11-15; station-boarding.md §2; BACKLOG F-161 | saknas |
| R-452 | Den som blir sedd i ett vrak får vakten på sig, men larmet går inte. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-453 | En vakt som ser ljus utan att se någon går dit och tittar, så en flare kan användas som lockbete. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-161 | saknas |
| R-454 | Rött ljus betyder alltid att stället räknar besättningen som fiende: roterande i lockdown och blinkande vid larm. | ersatt av: R-1150 | HANDOFF beslut 2026-11-15; station-boarding.md §2 | saknas |
| R-455 | Vrakens nödlampor är kallt vita. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-456 | Vakter och turrets har ett rött öga. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-457 | Vrak är mörka, och man letar sig fram med ficklampa och flares. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-458 | Mörkernivån i vraken ändras inte nu. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-459 | Flares studsar mot väggar och brinner i 30 sekunder. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-460 | Ett vrak är dött och mörkt. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-461 | Larmade dörrar syns på nära håll även utan radar. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-462 | Engineer kan koppla ur larmade dörrar på plats. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-463 | Det finns alltid en väg till mainframen och till valvet utan larmad dörr. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-158 | saknas |
| R-464 | Vakter går fasta rundor i stället för slumpat, så att smygandet går att planera. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-465 | En fientlig station är i lockdown när man kommer in och går till larm när besättningen upptäcks. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-466 | Vakter har synfält och går antingen fasta rundor eller står på en post och ser sig om. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-467 | Det som påverkar vakternas syn är flares och bordarnas lampor, inte nödlamporna. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-468 | En turret inomhus vaktar en smal kon och följer målet inom en bredare vinkel när den vaknat. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-469 | En turret på en station går inte att förstöra, bara att slå ut med en granat eller vända med Engineer. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-470 | En turret i ett vrak går att skjuta sönder. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-471 | Kameror sveper och ger besättningen bort men skadar ingen. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-472 | Besättningens egna turrets går bara att sätta ut i strid och försvinner efteråt. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-473 | En bordares roll är den post hen lämnade, och den avgör vad bara en viss post kan göra. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-474 | Gunner gör mer skada med geväret vid bordning. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-113 | saknas |
| R-475 | Gunner har alltid en sprängladdning vid bordning. | ersatt av: R-529 och R-847 | HANDOFF beslut 2026-11-15 (ersatt av krock 4) | saknas |
| R-476 | Engineer är tyst och snabbare med lås och övertagande vid bordning. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-477 | Engineer kan vända turrets och stänga av larmade dörrar. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-113 | saknas |
| R-478 | Engineer kan stabilisera reaktorn i ett vrak en gång, vilket ger en minut till. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-479 | Captain har radarn och ser vad valvet innehåller. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-113 och F-181 | saknas |
| R-480 | Att skära upp valvdörren hörs av vakterna för alla utom Engineer. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-481 | Vakter går inte genom dörrar och utlöser därför inga larm (avvikelse). | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-482 | Skeppet bär en sprängladdning åt gången. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-483 | Bara Gunner tar med sprängladdningen in. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-484 | Ett fraktskepp som förstörs lämnar ett vrak. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-485 | Insidans storlek i rutor är Gunboat 38 gånger 21, okänt skrov 54 gånger 25, fraktskepp 80 gånger 21 och station 73 gånger 73. | ersatt av: R-1186 och R-1206 | HANDOFF beslut 2026-11-14 | saknas |
| R-486 | Vrak har ibland rum som är uppslitna mot rymden och inte går att gå in i. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-487 | Valvet är rummet längst från luftslussen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-488 | En station har tills vidare en enda väg in till navet, som är valvet, genom en låst dörr. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-489 | Luftslussen ligger i vrakets sida, med en korridor längs vrakets mitt. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-490 | Vid larm blinkar lamporna och ljuskäglor snurrar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-491 | Insidorna byggs av samma bitar i varje sidas färger. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-492 | Varje ställe man går in på är alltid i ett av tre lägen: lugnt, lockdown eller larm. | byggd | station-boarding.md §1 | saknas |
| R-493 | Lugnt läge gäller när stället handlar med besättningen. | byggd | station-boarding.md §1 | saknas |
| R-494 | Lockdown gäller när stället räknar besättningen som fiende men inte har upptäckt den. | byggd | station-boarding.md §1 | saknas |
| R-495 | Larm gäller när besättningen är upptäckt. | byggd | station-boarding.md §1 | saknas |
| R-496 | I lugnt läge är ljuset normalt. | byggd | station-boarding.md §1 | saknas |
| R-497 | I lockdown är det mörkare än normalt, med roterande röda ljus. | byggd | station-boarding.md §1 | saknas |
| R-498 | Vid larm är det lika mörkt som i lockdown, men ljusen blinkar snabbt och en siren ljuder. | ersatt av: R-1188 och R-1193 | station-boarding.md §1 (ersatt av krock 8) | saknas |
| R-1193 | Vid larm blinkar ljusen högst en gång i sekunden, av hänsyn till ljuskänslig epilepsi. En siren ljuder. | bestämd | Användaren 2026-11-16 (krock 8) | – |
| R-499 | Larmet syns också på en röd ram runt bilden, så att det märks direkt även utan ljud. | byggd | station-boarding.md §1 | saknas |
| R-500 | I lugnt läge är vakterna fredliga och går sina rundor. | byggd | station-boarding.md §1 | saknas |
| R-501 | I lockdown patrullerar vakterna och letar. | byggd | station-boarding.md §1 | saknas |
| R-502 | Vid larm jagar vakterna besättningen. | byggd | station-boarding.md §1 | saknas |
| R-503 | I lugnt läge vilar kameror och turrets, och i lockdown vaktar de. | byggd | station-boarding.md §1 | saknas |
| R-504 | Vid larm skjuter turrets, och kamerorna spelar ingen roll längre. | byggd | station-boarding.md §1 | saknas |
| R-505 | Den som är inne när en station blir fientlig kastas inte ut, utan blir kvar och stället går till larm. | byggd | station-boarding.md §1, §13 | saknas |
| R-506 | I vrak finns inget smygande: vakter och turrets slåss direkt och reaktorn räknar ner. | byggd | station-boarding.md §2 | saknas |
| R-507 | I vrak finns inget larm, inga kameror och ingen lockdown, så den som blir sedd får bara vakten på sig. | byggd | station-boarding.md §2 | saknas |
| R-508 | Vrak som man hittar i rymden är strömlösa och nästan helt mörka, utan rött ljus. | byggd | station-boarding.md §2 | saknas |
| R-509 | I vrak har spelarna ficklampa och flares. | byggd | station-boarding.md §2 | saknas |
| R-510 | På en vänlig eller neutral station börjar smygandet i personaldelen, och den som blir sedd där utlöser larmet. | byggd | station-boarding.md §3 | saknas |
| R-511 | På en fientlig station är hela stället personaldel. | byggd | station-boarding.md §3 | saknas |
| R-512 | Larmet går när en vakt ser en spelare. | byggd | station-boarding.md §4 | saknas |
| R-513 | Vakter och kameror har ett synfält som ritas på golvet, och väggar skymmer. | byggd | station-boarding.md §4 | saknas |
| R-514 | Att bli sedd tar ungefär en sekund medan en mätare över spelaren fylls, och den töms om man hinner ur synfältet. | byggd | station-boarding.md §4; BACKLOG F-107 | saknas |
| R-515 | Att bli upptäckt är inget misslyckande, utan då blir det strid. | byggd | station-boarding.md §4 | saknas |
| R-516 | En vakt som vaknar av sig själv och inte ser någon går tillbaka till sin runda utan att utlösa larmet. | byggd | station-boarding.md §5 | saknas |
| R-517 | Varje vakt har en fast runda mellan bestämda punkter, som är densamma under hela besöket. | byggd | station-boarding.md §5 | saknas |
| R-518 | Vid vissa punkter stannar vakten och ser sig om åt bestämda håll, och somliga vakter står på post och vrider bara blicken. | byggd | station-boarding.md §5 | saknas |
| R-519 | Rundan ändras bara av något spelaren gör, som ljus från flare eller ficklampa, ett skott eller en sövd vakt. | byggd | station-boarding.md §5 | saknas |
| R-520 | En vakt som undersökt något och inte hittat någon går tillbaka till sin runda. | byggd | station-boarding.md §5 | saknas |
| R-521 | Radarn visar var vakterna är. | byggd | station-boarding.md §5 | saknas |
| R-522 | Kameror sveper fram och tillbaka och skadar ingen. | byggd | station-boarding.md §6 | saknas |
| R-523 | Kameror går att stänga av från mainframen men inte att skjuta sönder. | byggd | station-boarding.md §6 | saknas |
| R-524 | Är besättningen på plats under bordningen kan den docka vid en annan arm, gå in och slå ut bordarna. | byggd | station-boarding.md §14 | saknas |
| R-525 | Rollen vid bordning är den post man lämnade, och en rad under rubriken säger vad den ger. | byggd | BACKLOG F-113 | saknas |
| R-526 | Engineer är tyst och en och en halv gång så snabb med lås och övertagande. | byggd | BACKLOG F-113 | saknas |
| R-527 | Valvdörren öppnas på tre sätt: Engineer kopplar förbi tyst och snabbare, och Gunner spränger den, vilket hörs. | byggd | BACKLOG F-181 | saknas |
| R-528 | Alla kan skära upp valvlåset, men det hörs av vakterna. | byggd | BACKLOG F-181 | saknas |
| R-529 | Sprängladdningen är Gunners: den kostar 50 krediter, skeppet bär en åt gången, och den förbrukas. | byggd | BACKLOG F-191, proposal-items.md 1 | saknas |
| R-530 | Bara den som lämnade Gunners post tar med laddningen in. De andra ser knappen släckt. | byggd | BACKLOG F-191 | saknas |
| R-531 | Engineer stabiliserar reaktorn i ett vrak genom att hålla F i tre sekunder, och besättningen får en minut till, en gång per vrak. | byggd | BACKLOG F-182 | saknas |
| R-532 | Reaktorn står i det rum som ligger längst från ingången. | byggd | BACKLOG F-182 | saknas |
| R-533 | Ett vrak sprängs alltid när reaktorn har räknat ner, 130 till 170 sekunder efter första steget in, även om alla har gått ut. | byggd | proposal-economy.md 1.1 och 3.4 (bestämt) | saknas |
| R-534 | När färre än tre vrak finns kvar dyker ett nytt upp, så vrak tar aldrig slut. | byggd | proposal-economy.md 1.1 och 1.5 regel 9 (bestämt) | saknas |
| R-535 | När ett vrak sprängs med skeppet dockat kastas skeppet loss och tar 60 i skada, först på dockningsskölden (40) och sedan på skölden. | byggd | proposal-economy.md 3.1 | saknas |
| R-536 | Ett skepp som är dockat vid en fiende får ingen extra sköld. | byggd | BACKLOG F-173 | saknas |
| R-537 | En bordare bär tre saker åt gången, eller fem med Cargo Pack. | byggd | proposal-economy.md 2.3, BACKLOG F-192 | saknas |
| R-538 | Vakter som inte märkt något går en fast runda eller står på post, och deras synfält ritas på golvet. | byggd | BACKLOG F-107 | saknas |
| R-539 | Skott och granater hörs av vakterna. | byggd | BACKLOG F-107 | saknas |
| R-540 | Tranq gun kostar 120 krediter och ger sex pilar per bordning, och man växlar till den med R. | byggd | BACKLOG F-107, proposal-items.md 1 | saknas |
| R-541 | En sövd vakt vaknar efter 30 sekunder. Den som hinner fram kan ta ner den med F (TAKE DOWN), och då är den borta resten av bordningen. | byggd | BACKLOG F-107 | saknas |
| R-542 | En vakt som hittar en sövd eller nedtagen vakt slår larm. | byggd | BACKLOG F-107 | saknas |
| R-543 | I vrak finns inget larm. Där anfaller bara den vakt som såg en. | byggd | BACKLOG F-107 | saknas |
| R-544 | Flares kostar 60 krediter och ger tre per bordning. Q kastar en, och den lyser upp ungefär ett rum i 30 sekunder. | byggd | BACKLOG F-160 | saknas |
| R-545 | Väggar stoppar ljus från lampa och flares. | byggd | BACKLOG F-160 och F-136 | saknas |
| R-546 | Vrak är mörka inuti, och L tänder och släcker ficklampan. | byggd | BACKLOG F-159 | saknas |
| R-547 | Fientliga stationer är i lockdown med mörker och röda ljus. Blir man upptäckt går larmet, och det ligger kvar tills alla har lämnat stället. | byggd | BACKLOG F-102 | saknas |
| R-548 | Kameror på fientliga stationer upptäcker en efter ungefär en sekund, även i mörker, och går inte att förstöra. | byggd | BACKLOG F-108 | saknas |
| R-549 | Kameror stängs av från mainframen. | byggd | BACKLOG F-108 och F-109 | saknas |
| R-550 | Turrets inomhus skjuter på den som går in i deras kon, och på en station går larmet. | byggd | BACKLOG F-115 | saknas |
| R-551 | Turrets på stationer går inte att förstöra, men en granat slår ut dem i 20 sekunder. I vrak går de att skjuta sönder. | byggd | BACKLOG F-115 | saknas |
| R-552 | Besättningens egna turrets kan bara sättas ut när en strid pågår, och de försvinner några sekunder efter striden. | byggd | BACKLOG F-116 | saknas |
| R-553 | Engineer vänder en turret genom att hålla F i två och en halv sekund, och den skjuter sedan på vakterna i 15 sekunder. | byggd | BACKLOG F-183 | saknas |
| R-554 | Engineer stänger av en larmad dörr genom att hålla F i två och en halv sekund. Vrak har inga larmade dörrar. | byggd | BACKLOG F-158 | saknas |
| R-555 | Vaktsorterna är väktare, soldat, tekniker, drönare och tung vakt, och vilka som finns beror på stället och farligheten. | byggd | BACKLOG F-126 | saknas |
| R-556 | Drönare kan inte sövas eller tas ner, och tekniker slår på turrets som en granat har slagit ut. | byggd | BACKLOG F-126 | saknas |
| R-557 | Vakter slåss från skydd, och vakter i närheten hör skott och kommer till hjälp. | byggd | BACKLOG F-125 | saknas |
| R-558 | Saker i rummen går att ta skydd bakom och stänger aldrig en väg, och ungefär tre av fyra rum har något att gömma sig bakom. | byggd | BACKLOG F-152 | saknas |
| R-559 | Dörrar stängs när ingen är nära och skymmer då sikt och skott, men de öppnas för den som går fram. | byggd | BACKLOG F-152 | saknas |
| R-560 | Captain öppnar bordningsradarn med B när skeppet ligger dockat och någon har varit inne, och ett klick sätter en markering som bordarna ser. | byggd | BACKLOG F-140 | saknas |
| R-561 | Går Captain själv in bär hen en radar som visar fiender inom åtta rutor. | byggd | BACKLOG F-140 | saknas |
| R-562 | Granater är gratis, tre per bordning. | byggd | proposal-items.md 1; proposal-items.md fråga 2 | saknas |
| R-563 | Mainframen står längst in, på översta våningen där det finns flera. | byggd | HANDOFF beslut 2026-11-14 | tests/base.test.js |
| R-564 | Man måste alltid ta sig förbi vakterna för att nå mainframen. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-565 | Vakter ska finnas i flera typer, lättare i början och svårare längre fram. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-566 | Ett skepp som besättningen själv slagit ut har besättning och ström kvar och är i lockdown, med röda ljus och smygande. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-567 | Längre fram kommer en vakttyp som väljer väg själv men visar vart den är på väg. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-568 | Vänliga och neutrala stationer ska ha en personaldel. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-569 | Den som är inne blir kvar när en station blir fientlig. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-570 | Att bära fler än en sprängladdning väntar på ryggsäcken. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-571 | Föremål har samma form inne som i rymden. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-572 | Drönare kan fyllas på vid larm. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-573 | Vakter kan komma med ett skepp som dockar, och det skeppet anfaller inte ett dockat skepp som ingen sitter i. | ersatt av: R-1191 och R-1192 | HANDOFF beslut 2026-11-16 (ersatt av krock 7) | – |
| R-1192 | Vakter kan komma med ett skepp som dockar. | bestämd | HANDOFF beslut 2026-11-16 (från R-573) | – |
| R-574 | Skeppet får lämna dockan men inte hoppa från systemet så länge någon är kvar i basen. | bestämd | HANDOFF beslut 2026-11-16; BACKLOG F-211 och D-043 | – |
| R-575 | Ingen flyttas tillbaka till skeppet av sig själv. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §1, §4; BACKLOG F-211 och D-043, proposal-bases.md avsnitt 1 | – |
| R-576 | Flykten ut ur basen ska inte gå att hoppa över. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §4 | – |
| R-577 | När skrovet nästan är slut backar skeppet ut om en spelare i skeppet väljer det, eller av sig självt om datorn sköter Captain. | bestämd | HANDOFF beslut 2026-11-16; BACKLOG F-211 | – |
| R-578 | Skeppet som backat ut kommer tillbaka när någon kallar från luftslussen. | bestämd | HANDOFF beslut 2026-11-16; BACKLOG F-211 | – |
| R-579 | Annars ligger skeppet kvar dockat under dockningsskölden. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-580 | Ett skepp som spelarna själva har slagit ut har besättning och ström kvar och är i lockdown som en fientlig station. | bestämd | station-boarding.md §2 | – |
| R-581 | Svårigheten ligger i rundorna: lätta ställen har korta rundor med luckor, svåra har längre rundor som överlappar. | bestämd | station-boarding.md §5 | – |
| R-582 | En senare vakttyp kan välja nästa rum själv men visar vart den ska innan den går (F-126). | bestämd | station-boarding.md §5 | – |
| R-583 | Planritningen från hack nivå 1 visar vakternas rundor. | bestämd | station-boarding.md §5 | – |
| R-584 | I vrak står de flesta vakter på post och ser sig om i ett mönster, och ett fåtal går en kort runda. | bestämd | station-boarding.md §5 | – |
| R-585 | Ingen turret eller kamera spärrar en väg som måste gås utan att det finns ett sätt förbi. | bestämd | station-boarding.md §11 | – |
| R-586 | Något ska tvinga besättningen vidare även när vakterna är nedskjutna. | bestämd | proposal-bases.md §4 | – |
| R-587 | Drönare kan fyllas på vid larm, och vakter kan komma med ett skepp som dockar. | bestämd | proposal-bases.md §4 | – |
| R-588 | En ryggsäck köps och uppgraderas och avgör hur mycket utrustning och hur många turrets man får med sig. Utan den får man med sig lite. | bestämd | BACKLOG F-192 | – |
| R-589 | Vapen som skjuter rakt fram skjuter inte när skeppet ligger dockat, och försvar vid dockning kräver köpta kanontorn. | bestämd | BACKLOG F-211 | – |
| R-590 | Ett skepp som slagits ut har besättning och ström kvar och är i lockdown, men ett vrak är dött och mörkt. | bestämd | BACKLOG F-081 | – |
| R-591 | Skepp som skadas nog blir drivande och kan bordas, och Gunner väljer mellan att slå ut och förstöra. | bestämd | BACKLOG F-081 | – |
| R-592 | Drönarna kommer från en drönarhangar som går att slå ut. | förslag | proposal-bases.md §4 | – |
| R-593 | Ett kommunikationsrum stoppar anropet om förstärkning om man hinner dit. | förslag | proposal-bases.md §4 | – |
| R-594 | Trycket inne ökar med hur farlig sektorn är. | förslag | proposal-bases.md §4 | – |
| R-595 | Ryggsäcken ersätter Cargo Pack och gäller både utrustning och byte. | förslag | proposal-items.md 2.4 och fråga 4 | – |
| R-596 | Det som sitter på skeppet är permanent, och det som bärs ombord förbrukas. | förslag | proposal-items.md 2 och fråga 1 | – |
| R-597 | Förbrukningsvaror kostar per styck: granat 15, flare 10, pil 5, sprängladdning 50 och turret 60. | förslag | proposal-items.md 2.2 | – |
| R-598 | Gevär, lampa, teleporter, Suit Armor och Rifle Upgrade är permanenta och tar ingen plats i ryggsäcken. | förslag | proposal-items.md 2.3 | – |
| R-599 | Gevär, lampa och teleporter kostar aldrig något. | förslag | proposal-items.md sammanfattning och 3 | – |
| R-600 | Captain ger överblick vid bordning genom att se vakter och kameror en bit genom väggar, och hela gruppen får se det. | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 (ersatt samma dag av Captains bärbara radar, F-140) | – |
| R-601 | Lägger skeppet ut medan någon är kvar inne teleporteras alla hem (D-043). | ersatt av: ett senare beslut, se källan | proposal-bases.md §1 (ersatt av att ingen flyttas tillbaka av sig själv, §4) | – |
| R-1149 | Lockdown har ett stilla rött filter över ljuset och stilla röda dörrlampor, med stängda dörrar och utan roterande ljus. På en egen bas är det gult i stället för rött. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1150 | Rött ljus betyder alltid att stället räknar besättningen som fiende: stilla i lockdown, roterande och blinkande vid larm. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1151 | Fönstren utanpå lyser stilla rött i lockdown och pulserar långsamt rött vid larm. | byggd | Användaren 2026-11-16 (designtest D-217) | tests/base.test.js |
| R-1182 | Antalet vakter och roterande larmljus följer hur stor ytan är, så att det känns lika tätt överallt, och larmljusen sprids jämnt i gångar och lastrum. Utgångsläge: ett larmljus per 300 rutor golv och en vakt per 500 rutor i lockdown och larm (en per 1200 i lugnt läge), justeras vid provspel. | byggd | Användaren 2026-11-16 (designtest D-249) | tests/base.test.js |
| R-1183 | Ett fraktskepps insida genereras varje gång och följer skeppets form: aktern med motorerna, fyra rader containrar på båda sidor om en ryggrad och fören med bryggan. | byggd | BACKLOG D-249; Användaren 2026-11-16 (designtestet godkänt) | tests/layout.test.js |
| R-1184 | Varje fraktskepp har minst ett stort lastrum för eldstrider, och tre vägar längs skeppet: ryggraden, lastrummen och servicegångar längs skrovet, med tvärgångar emellan och inga återvändsgränder utom rummen. | byggd | BACKLOG D-249; Användaren 2026-11-16 (designtestet godkänt) | tests/layout.test.js |
| R-1185 | Ett fraktskeppsvrak är samma skepp med en eller två containrar bortslitna. | byggd | BACKLOG D-249; Användaren 2026-11-16 (designtestet godkänt) | tests/layout.test.js |
| R-1186 | Fraktskeppets insida blir ungefär 92 gånger 31 rutor, större än i dag (R-485). | byggd | BACKLOG D-249; Användaren 2026-11-16 (designtestet godkänt) | tests/layout.test.js |
| R-1188 | Vid larm tänds alla lampor fullt, som om stället vaknar och letar. Det röda filtret finns bara i lockdown. | byggd | Användaren 2026-11-16 (designtest D-217 och D-249) | tests/base.test.js |
| R-1205 | Mellan två våningar finns alltid tre vägar: hissen genom säkerhetskontrollen, som hörs, trappan från en servicegång, som är tyst, och en stege bakom en larmad dörr. | byggd | Designtest D-217 (godkänt 2026-11-16) | tests/base.test.js |
| R-1206 | Insidan av en Gunboat är 38 gånger 21 rutor och av ett okänt skrov 54 gånger 25. | byggd | HANDOFF beslut 2026-11-14 (R-485, utan fraktskeppet och stationen) | tests/layout.test.js |
| R-1207 | En bas som inte är besättningens har alltid minst de fyra kanontornen på källaren, som den alltid har haft, så att den kan försvara sig. Besättningens egen bas har bara de torn som är köpta. | ersatt av: R-1230 och R-1231 | Agentens tolkning av R-1163 och R-159 2026-11-16 (F-244) | – |
| R-1208 | Kanontornen på basens tio platser följer köpt försvar: inget köpt ger inga torn, sedan två, sex och alla tio (delen av R-1163 som gäller tornen). Skölden köps fortfarande för sig. | byggd | Användaren 2026-11-16 (designtest D-217, R-1163); Användaren 2026-11-17 (SB1) | tests/base.test.js |
| R-1230 | En bas som inte är besättningens har kanontorn efter hur farligt systemet är, i stället för alltid fyra. | bestämd | Användaren 2026-11-17 (SB2, F-279) | – |
| R-1231 | När besättningen tar en bas spränger basens säkerhetssystem sina egna kanontorn, så att fästena står tomma och besättningen bygger upp försvaret själv. En egen bas som tas tillbaka får tillbaka det besättningen köpt, enligt R-218. | bestämd | Användaren 2026-11-17 (SB2, F-279) | – |
| R-1189 | Ingen markering visar vägen ut, varken spår i golvet eller pilar. | bestämd | Användaren 2026-11-16 (D-216 skippad) | – |

## Lås och inbrott

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-602 | Varje typ av mål har ett eget inbrottsspel på tid. | byggd | HANDOFF beslut | saknas |
| R-603 | Inbrottet i vrak ska vara lätt snarare än ha lång tid. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-604 | De lättaste vraken har lås med 15 rutor och ungefär sex vridningar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-605 | Vrak med högre risk har större lås. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-606 | Valvdörren i ett vrak öppnas genom att hålla in F bredvid den, inte med ett eget inbrottsspel. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-607 | Misslyckas inbrottet på en station slår den tillbaka med två Fighters. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-608 | Misslyckas inbrottet på en station får låset ett nytt pussel. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-609 | Den som är ensam får växla mellan stationslåset och Engineer-posten. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-610 | Fraktcontainrar (cargo pods) har ingen insida. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-611 | När låset på en fraktcontainer är uppe tas lasten direkt ombord. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-612 | Stationens kod hackas fram av Engineer, en siffra i taget, på fyra ringar som fungerar som låset på en pod. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-613 | Stationshacket har två steg: Engineer får fram siffrorna och någon slår in dem på låset. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-614 | Stationskoden byter inte längre av sig själv. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-615 | Ett misslyckat lås på ett vrak kostar 40 sekunder av reaktortiden. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-616 | En pods lås visar tre ringar samtidigt och öppnas utifrån och in. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-617 | Visaren går medurs på den yttersta och innersta ringen och moturs på den mellersta. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-163 | saknas |
| R-618 | Mitten av podlåset vrids ett kvarts varv när den innersta ringen är upplåst. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-619 | En pod blinkar grönt när den går att öppna, dubbelblinkar rött när den larmar och är släckt när den är tömd. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-162 | saknas |
| R-620 | En tömd pod ligger kvar som ett släckt skal. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-162 | saknas |
| R-621 | En pod larmar tills piraterna den kallade på är borta. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-622 | In på en stängd station kommer man bara genom att bryta upp låset, och då är stället i lockdown. | byggd | station-boarding.md §2 | saknas |
| R-623 | Den som öppnar en larmad dörr utlöser larmet. | byggd | station-boarding.md §4 | saknas |
| R-624 | Det finns alltid en väg till mainframen utan larmad dörr. | byggd | station-boarding.md §4 | saknas |
| R-625 | En larmad dörr syns på nära håll som en liten lampa i dörrkarmen, gul i det byggda. | byggd | station-boarding.md §4 | saknas |
| R-626 | Radarn visar larmade dörrar på håll och genom väggar, som gula rutor. | byggd | station-boarding.md §4 | saknas |
| R-627 | Engineer kan koppla ur en larmad dörr på plats på två och en halv sekund och står då stilla och oskyddad. | byggd | station-boarding.md §4 | saknas |
| R-628 | Planritningen från hack nivå 1 visar de larmade dörrarna. | byggd | station-boarding.md §4 | saknas |
| R-629 | När larmet väl har gått spelar de larmade dörrarna ingen roll längre. | byggd | station-boarding.md §4 | saknas |
| R-630 | Larmade dörrar finns bara där smygande gäller, alltså inte i vrak. | byggd | station-boarding.md §4 | saknas |
| R-631 | En fientlig station har tre larmade dörrar. | byggd | station-boarding.md §4 | saknas |
| R-632 | Hos en fiende eller neutral hackas mainframen i tre nivåer som var och en tar tid och fyller en spårningsmätare. | byggd | station-boarding.md §8 | saknas |
| R-633 | När spårningsmätaren är full går larmet. | byggd | station-boarding.md §8 | saknas |
| R-634 | Man kan sluta efter varje hacknivå. | byggd | station-boarding.md §8 | saknas |
| R-635 | Hack nivå 1 ger planritning med vakter och kameror och visar vad som finns i valvet. | byggd | station-boarding.md §8 | saknas |
| R-636 | Hack nivå 2 stänger av kameror och turrets i 60 sekunder och öppnar personaldörrar och valvet. | byggd | station-boarding.md §8 | saknas |
| R-637 | Hack nivå 3 tar över stationen, och larmet går alltid innan den är klar. | byggd | station-boarding.md §8 | saknas |
| R-638 | Hacknivåerna tar 8, 10 och 20 sekunder och fyller spårningsmätaren med 15, 30 och 115 procent. | byggd | station-boarding.md §8 | saknas |
| R-639 | Vrakets lås är ett rörspel med rutnätet 5 × 3, 6 × 3 eller 6 × 4 efter risk. | byggd | proposal-economy.md 3.1 | saknas |
| R-640 | Rörspelet har 60, 50 eller 42 sekunder efter risk, och 84, 70 eller 59 med Hacking Kit. | byggd | proposal-economy.md 3.1 | saknas |
| R-641 | Ett enstaka misstag i rörspelet kostar ingenting utom tiden. | byggd | proposal-economy.md 3.1 och 3.4 | saknas |
| R-642 | Ett misslyckat vraklås kostar 40 sekunder av reaktortiden och ger ett nytt pussel, utan skada på skeppet. | byggd | proposal-economy.md 3.4 och 3.5, BACKLOG D-172 | saknas |
| R-643 | Det tredje misslyckandet på samma vrak spränger det. | byggd | proposal-economy.md 3.5, BACKLOG D-172 | saknas |
| R-644 | Stationens kod är fyra siffror mellan 1 och 6, och man har 50 sekunder, eller 70 med Hacking Kit. | byggd | proposal-economy.md 3.1 | saknas |
| R-645 | Fel kod rensar allt och drar av 6 sekunder, utan att säga vilken siffra som var fel. | byggd | proposal-economy.md 3.1 | saknas |
| R-646 | Går tiden ut på stationens lås skickar stationen ut två Fighters, och låset får ny kod och full tid. | byggd | proposal-economy.md 3.1 och 3.4 (två Fighters bestämt) | saknas |
| R-647 | Engineer hackar fram koden en siffra i taget genom att stoppa en visare i en markering på fyra ringar, och koden byts inte av sig själv. | byggd | BACKLOG F-171, proposal-economy.md 3.5 | saknas |
| R-648 | En miss i Engineers hack kostar 6 sekunder. | byggd | BACKLOG F-171 | saknas |
| R-649 | Koden syns bara hos Engineer, och någon slår sedan in den på låset. | byggd | BACKLOG F-171 | saknas |
| R-650 | Podens lås har tre ringar som öppnas utifrån och in, med markeringar på 54, 42 och 33 grader. | byggd | proposal-economy.md 3.1, BACKLOG F-163 | saknas |
| R-651 | Podens lås har 25 sekunder, eller 35 med Hacking Kit. | byggd | proposal-economy.md 3.1 | saknas |
| R-652 | En miss på poden förbrukar ett av tre försök för hela låset, och ringar som är upplåsta förblir upplåsta. | byggd | proposal-economy.md 3.1 | saknas |
| R-653 | Tre missar eller slut på tiden gör att poden larmar och nästa piratvåg kommer direkt. Låset börjar om, och lasten är kvar. | byggd | proposal-economy.md 3.1 | saknas |
| R-654 | En pod larmar i minst 20 sekunder och så länge det finns pirater kvar. | byggd | BACKLOG F-162, proposal-economy.md 3.1 | saknas |
| R-655 | Klockan startar när låset öppnas på skärmen, och raden om straffet står i samma ruta. | byggd | proposal-economy.md 3.1 | saknas |
| R-656 | Klockan går vidare om man stänger rutan och även om skeppet lägger ut. | byggd | proposal-economy.md 3.1 | saknas |
| R-657 | Innan låset öppnas står bara att målet är låst, och med Target Scanner står också risken. | byggd | proposal-economy.md 3.1 | saknas |
| R-658 | Larmade dörrar sitter på genvägar och på sidorum med loot. | bestämd | station-boarding.md §4 | – |
| R-659 | Vakter går igenom larmade dörrar utan att larmet går. | bestämd | station-boarding.md §4 | – |
| R-660 | En fel siffra förbrukar ett av tre försök, en rätt siffra låses fast, och tredje felet ger två Fighters och ny kod. | förslag | proposal-economy.md 3.4 och steg 7 | – |
| R-661 | En pod går inte att öppna medan den larmar. | förslag | proposal-economy.md 3.4 och 3.5 | – |
| R-662 | Ett enstaka misstag kostar aldrig något utanför låset, i alla lås och kommande minispel. | förslag | proposal-economy.md 3.3 och fråga 11 | – |
| R-663 | Priset för ett misstag och för ett misslyckande står på skärmen innan klockan startar. | förslag | proposal-economy.md 3.3 och 3.5 | – |
| R-664 | Ett helt misslyckande gör att stället svarar i proportion till bytet, förstör aldrig bytet första gången och ger ett nytt pussel. | förslag | proposal-economy.md 3.3 | – |
| R-665 | Alla lås visar marginalen likadant: tiden som en klocka och försöken som tre markeringar. | förslag | proposal-economy.md 3.3 | – |
| R-666 | Efter ett misslyckat stationslås är stationen i larm, inte i lockdown, när besättningen kommer in. | förslag | proposal-economy.md 3.4 och 3.5 | – |
| R-667 | En tömd fraktcontainer försvinner, men det ersattes 2026-11-15 av att den ligger kvar som ett släckt skal. | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 | – |
| R-668 | Det tredje misslyckandet på ett vraklås spränger vraket. | ersatt av: d-172: reaktorn tappar 40 sekunder | HANDOFF beslut 2026-11-15; proposal-economy.md 3.1, BACKLOG D-172 | – |
| R-669 | Koden visas färdig på Engineers skärm och byts var sextonde sekund. | ersatt av: f-171 | proposal-economy.md 3.1 | – |

## Strid och vapen

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-670 | Den tunga lasern skjuter rakt fram längs skeppet, så Captain siktar med skeppet och Gunner laddar och avfyrar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-671 | Gunboats kommer från andra sektorn. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-672 | Pirater tål mer i senare sektorer. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-673 | Point defense stoppar ungefär en tredjedel av skotten som kommer nära. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-674 | Pirater har inga raketer än. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-675 | Vapnen går inte att använda inne på en handelsstation. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-676 | Piratvågorna kommer glesare ju färre som är ombord, så att en ensam spelare hinner lämna skeppet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-677 | För en ensam spelare är det drygt en minut mellan piratvågorna. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-678 | Den som stannar vid vapnen ska klara sig, och ett obevakat skepp går förlorat på drygt två minuter (provat med simulerad spelare). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-679 | Besättningens skott går förbi en station eller ett skepp som själv har fiender nära, så snedskott mitt i en strid räknas inte. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-680 | I lugn och ro träffar besättningens skott, och det räknas som ett anfall. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-681 | Andras skott träffar bara deras egna fiender. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-682 | Bara besättningens egna nedskjutningar ger belöning, räknas som kills och höjer anseendet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-683 | Ett piratanfall på en station är fyra skepp, fler i senare sektorer. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-684 | Från andra sektorn är ett av skeppen i ett piratanfall en Gunboat. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-685 | Utan hjälp håller stationen nästan alltid i första sektorn, faller i ungefär fyra fall av tio i andra och nästan alltid i fjärde (provat i simulering). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-686 | Pirater jagar närmaste fiende inom sikt och annars fregatten. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-687 | Darts skjuter bara på fiender. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-688 | Asteroider går att skjuta sönder, och Gunner skjuter bort dem. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-689 | Darts är den minsta skeppsklassen. | byggd | HANDOFF beslut | saknas |
| R-690 | Skeppsklasserna är Dart, Fighter, Interceptor, Gunboat, Frigate och Cruiser (Interceptor hittas bara i assets.js, inte i sim/). | byggd | HANDOFF beslut | saknas |
| R-691 | Freighter är en ny skeppsklass, lite större och långsam. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-692 | Vapen är hölstrade i lugnt läge och tillåtna i lockdown och vid larm. | byggd | station-boarding.md §1 | saknas |
| R-693 | Skott från vanliga vapen hörs och utlöser larmet. | byggd | station-boarding.md §4 | saknas |
| R-694 | Tranq gun är tyst. | byggd | station-boarding.md §4 | saknas |
| R-695 | En tranq gun köps i armory och söver vakter. | byggd | station-boarding.md §5 | saknas |
| R-696 | En sövd vakt vaknar efter 30 sekunder. | byggd | station-boarding.md §5 | saknas |
| R-697 | Den som går fram till en sövd vakt innan den vaknar kan oskadliggöra den med knappen TAKE DOWN. | byggd | station-boarding.md §5 | saknas |
| R-698 | En vakt som fått TAKE DOWN är borta resten av bordningen, men kroppen ligger kvar och kan hittas av en annan vakt. | byggd | station-boarding.md §5 | saknas |
| R-699 | Tranq gun har sex pilar per bordning. | byggd | station-boarding.md §5 | saknas |
| R-700 | Man växlar mellan tranq gun och gevär med en tangent. | byggd | station-boarding.md §5 | saknas |
| R-701 | Stationens egna turrets inomhus är något man smyger förbi och är placerade så att det går att komma runt dem. | byggd | station-boarding.md §6 | saknas |
| R-702 | Stationens turrets är bara aggressiva mot fiender. | byggd | station-boarding.md §6 | saknas |
| R-703 | Stationens turrets går inte att förstöra. | byggd | station-boarding.md §6, §13; station-boarding.md §6 | saknas |
| R-704 | Stationens turrets går att slå ut i 20 sekunder med en granat. | byggd | station-boarding.md §6 | saknas |
| R-705 | En turret ser i en smal kon rakt fram, och den som går in i konen blir beskjuten och larmet går. | byggd | station-boarding.md §6 | saknas |
| R-706 | Turretens kon står still medan den vaktar, och efter att någon gått in i den eller larmet gått följer den målet inom en begränsad vinkel. | byggd | station-boarding.md §6 | saknas |
| R-707 | En turret som tappat målet en stund går tillbaka till sitt läge. | byggd | station-boarding.md §6 | saknas |
| R-708 | Engineer kan vända en turret till besättningens sida en stund (F-183). | byggd | station-boarding.md §6 | saknas |
| R-709 | Spelarnas egna turrets är engångssaker som försvinner när striden är över. | byggd | station-boarding.md §6, §13 | saknas |
| R-710 | Efter ungefär en minut hoppar en grupp bounty hunters in och anfaller det dockade skeppet. | ersatt av: R-1191 | station-boarding.md §9 (ersatt av krock 7) | saknas |
| R-1191 | Medan besättningen är inne anfalls det dockade skeppet aldrig när en spelar, med mycket låg risk när två spelar och låg risk när tre spelar. Det gäller alla fiender: bounty hunters, förstärkningsskeppet och andra. Det räknas på hur många spelare som är anslutna till omgången, oavsett vem som sitter i skeppet. Bounty hunters hoppar in efter ungefär en minut som förut. | bestämd | Användaren 2026-11-16 (krock 7, K3) | – |
| R-711 | En grupp bounty hunters är två Fighters och en Gunboat, och de slåss bara mot besättningen. | byggd | station-boarding.md §9 | saknas |
| R-712 | Det kommer aldrig mer än en grupp bounty hunters åt gången, med tre till fyra minuter mellan grupperna. | byggd | station-boarding.md §9 | saknas |
| R-713 | Pirater anfaller som en lös grupp på fyra till sex skepp med en Gunboat som bordningsskepp. | byggd | station-boarding.md §14 | saknas |
| R-714 | En faktion anfaller med fler skepp, alltid minst en Gunboat (senare Juggernaut) och eget bordningsskepp, och går rakt på det yttre försvaret. | byggd | station-boarding.md §14 | saknas |
| R-715 | Bara besättningens egna nedskjutningar ger krediter. | byggd | proposal-economy.md 1.1 (bestämt) | saknas |
| R-716 | Bärgningsgods blir liggande oavsett vem som sköt och försvinner efter 90 sekunder. | byggd | proposal-economy.md 1.1 och 2.3 | saknas |
| R-717 | Grundvapnet behöver ingen ammunition. | byggd | proposal-world.md "Aldrig låsa sig", BACKLOG D-100 | saknas |
| R-718 | Skott träffar stationer och skepp, och Gunner skjuter bort asteroider som är i vägen. | byggd | proposal-world.md steg 1, BACKLOG F-200 | saknas |
| R-719 | Gunner märker ett skepp med T så att Captain får det utpekat. | byggd | BACKLOG F-141 | saknas |
| R-720 | Captain märker ett skepp med T, och besättningens skott träffar det 15 procent hårdare. | byggd | BACKLOG F-141 | saknas |
| R-721 | Märkena ligger kvar när man byter post. | byggd | BACKLOG F-141 | saknas |
| R-722 | Överladdningen av vapen och sköld är borttagen. | byggd | proposal-world.md steg 2, BACKLOG F-198 | saknas |
| R-723 | Kanontornen på vingarna vrider sig var för sig mot det Gunner siktar på. | byggd | BACKLOG B-166 | saknas |
| R-724 | Rocket Pods har 8 raketer per laddning, och raketer kostar 2 styck hos vänliga och 4 hos neutrala. | byggd | proposal-items.md 1, proposal-economy.md 1.2 | saknas |
| R-725 | Piratvågor har 1 till 4 skepp, och för en ensam spelare kommer de var 60:e till 85:e sekund. | byggd | proposal-economy.md 1.1 | saknas |
| R-726 | Piratvågorna kommer mer än dubbelt så glest för en ensam spelare, och drygt dubbelt så ofta för tre. | byggd | proposal-computer.md (Läget i dag), proposal-economy.md 1.4 punkt 11 | saknas |
| R-727 | Gunboats kommer från andra sektorn, ungefär var tredje våg där och varannan i de sista sektorerna. | byggd | proposal-economy.md 1.1 | saknas |
| R-728 | Pirater tål 15 procent mer per sektornivå. | byggd | proposal-economy.md 1.4 punkt 3 | saknas |
| R-729 | En egen Dart som förstörs ersätts av en ny efter 40 sekunder. | byggd | proposal-economy.md 2.1 | saknas |
| R-730 | Juggernaut är en ny, ovanlig skeppsklass: ett långsamt och tungt bestyckat krigsskepp, mindre än Cruisern. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-731 | Vapen riktade rakt fram kan inte skjuta medan skeppet ligger dockat. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §4 | – |
| R-732 | Försvar medan skeppet ligger dockat kräver kanontorn, som köps. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-733 | Skeppet börjar med en enkel fast kanon rakt fram som alltid sitter kvar och går att uppgradera billigt. | byggd | HANDOFF beslut 2026-11-16; proposal-bases.md §6; BACKLOG F-214 | tests/stores.test.js |
| R-734 | Startkanonen används mest för att bryta malm. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-735 | Spelarnas turrets får sättas ut hos fiender när som helst, hos neutrala först när larmet gått och aldrig på egna eller lugna stationer. | bestämd | station-boarding.md §6 (byggt i enklare form: bara under strid) | – |
| R-736 | Förstärkningsskeppet anfaller inte ett dockat skepp som ingen sitter i, men kan anfalla om någon sitter i det. | ersatt av: R-1191 | proposal-bases.md §4 (ersatt av krock 7) | – |
| R-737 | Den som vill försvara sig dockad behöver kanontorn, som köps. | bestämd | proposal-bases.md §4 | – |
| R-738 | Kanontorn är inte standard utan köps som uppgraderingar. | bestämd | proposal-bases.md §6; BACKLOG F-214 | – |
| R-739 | Homing missiles söker mål och är rörligare, medan raketer bara kan justera banan lite och släpper målet om de missar. | bestämd | BACKLOG F-064 | – |
| R-740 | Missiler och raketer som missar kan träffa annat som ligger i banan, och ammunitionen köps på stationer. | bestämd | BACKLOG F-064 | – |
| R-741 | Vapen och motorer blir varma, Engineer måste kyla, och det finns uppgraderingar som kyler bättre. | bestämd | BACKLOG F-084 | – |
| R-742 | Juggernauten är ett ovanligt, långsamt och tungt bestyckat krigsskepp som patrullerar hos faktioner och mycket sällan dyker upp som pirat. | bestämd | BACKLOG F-070 | – |
| R-743 | Juggernauten är ett kantigt ägg med smala änden fram, pansarplåtar och kanontorn, och den är mindre än Cruisern. | bestämd | BACKLOG F-070 | – |
| R-744 | Eskorter hyrs på stationer och i baren mot lön och tar enkla order: följ, anfall mitt mål, håll avstånd. | bestämd | BACKLOG D-071 | – |
| R-745 | Lågt skydd (lådor, bänkar, räcken) stoppar skott men inte blickar. | förslag | proposal-bases.md §3 | – |
| R-746 | Högt skydd (pelare, skåp, maskiner) stoppar skott, blickar och ljus. | förslag | proposal-bases.md §3 | – |
| R-747 | Heavy Laser skjuter rakt fram och ska vara klart starkare än en fullt uppgraderad startkanon. | förslag | proposal-bases.md §6 | – |
| R-748 | Tunnor kan explodera och sätta igång varandra. | förslag | proposal-bases.md §10 | – |
| R-749 | Startkanonen tar ingen plats och kan uppgraderas för skada, värme och malm per asteroid, och Heavy Laser är klart starkare. | förslag | BACKLOG F-214 | – |
| R-750 | Namngivna unika skepp dyker upp ibland, till exempel en känd pirat med prissumma. | förslag | BACKLOG F-086 | – |
| R-751 | Engineer laddar upp vapen, motorer eller sköld med Z, som blir starkare i 5 sekunder och sedan svalnar i 20. | ersatt av: f-198 och f-197: bara motorernas överladdning finns kvar, som speed boost | BACKLOG F-142 | – |
| R-752 | Spelet vinns i dag genom att förstöra Cruisern i The Maw, som ligger kvar där den lämnades och lika skadad. | ersatt av: steg 4: slutet är anfallet på piraternas slutbas; fortfarande byggt | BACKLOG B-175, proposal-economy.md 1.1 | – |

## Skeppet och posterna

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1108 | Varje spelare har sina primära roller från start. | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1109 | När en spelare lämnar skeppet blir hens roller tillfälligt lediga, och de som är kvar kan ta över en ledig roll tills den som har den på riktigt kommer tillbaka. | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1110 | Bara en spelare åt gången har en roll. Den som tillfälligt tar en ledig roll håller också kvar sin egen, så ingen annan kan ta någon av dem. | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1118 | När den som har en roll kommer tillbaka får hen den direkt, och den som hade tagit över går tillbaka till sin egen roll. | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1111 | Med två spelare tas den tredje rollen över på samma sätt, eller sköts av datorn. | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1112 | Om datorn får sköta roller, och vilka, bestäms när omgången startar och gäller hela omgången. Datorn slås på i vyn för en roll där det är tillåtet. | bestämd | Användaren 2026-11-16 (D-189, D-186) | – |
| R-1113 | Varje roll köper utrustningen till sin egen bordare ur sin egen kassa. I dag betalar den som köper, men utrustningen gäller alla bordare (F-235). | bestämd | Användaren 2026-11-16 (D-189) | – |
| R-1114 | Engineer köper det som rör skeppets skydd och energi, Gunner vapnen, och Captain motorer, bränsle och sensorer. | byggd | Användaren 2026-11-16 (F-188, agentens förslag godkänt) | tests/purses.test.js |
| R-753 | Uppgraderingar går inte sönder var för sig tills vidare, och frågan tas upp igen med värmen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-754 | Engineer ser rymden som de andra, med energi och skadevarningar i en smal remsa, och börjar i det läget. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-755 | V eller en knapp öppnar Engineers panel och fäller undan den. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-756 | I rymdvyn byter Engineer system med vänster och höger och ändrar energin med upp och ner. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-757 | På Engineers panel är tangenterna tvärtom, eftersom systemen där ligger i en kolumn. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-758 | Det finns tre poster: Captain, Gunner och Engineer. | byggd | HANDOFF beslut | saknas |
| R-759 | Captain flyger, dockar och avgör när skeppet lägger ut och hoppar. | byggd | HANDOFF beslut | saknas |
| R-760 | Gunner sköter alla vapen. | byggd | HANDOFF beslut | saknas |
| R-761 | Engineer fördelar energi mellan vapen, sköld, motorer och reparation. | byggd | HANDOFF beslut | saknas |
| R-762 | Engineer flyttar en reparationssymbol mellan skadepunkter på en bild av skeppet. | byggd | HANDOFF beslut | saknas |
| R-763 | Den som går in för att loota lämnar sin post ledig för någon annan och får tillbaka den när hen är ombord igen. | byggd | HANDOFF beslut | saknas |
| R-764 | Alla tre posterna finns från första versionen, och man byter fritt mellan dem. | ersatt av: R-1108, R-1109 och R-1110; fortfarande byggt | HANDOFF beslut | – |
| R-765 | En post som lämnas fortsätter som den ställdes in. | byggd | HANDOFF beslut | saknas |
| R-766 | Gasen ligger kvar när Captain lämnar sin post, så att en ensam spelare kan flyga och skjuta. | byggd | HANDOFF beslut | saknas |
| R-767 | En post kan bara hållas av en spelare i taget. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-768 | Två spelare byter post genom att be om varandras poster inom några sekunder. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-769 | Den som kommer tillbaka från en bordning får sin gamla post om den är ledig, annars en annan ledig post. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-770 | Skeppet har fem delar: WEAPONS, STEERING, REACTOR, SHIELD EMITTER och ENGINES. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-177 | saknas |
| R-771 | Captain och Gunner ser sina egna delar i procent, med lagningens läge. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-772 | Engineers märkning av en skada är borttagen. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-773 | Captain och Gunner har T för att märka ett skepp åt varandra. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-774 | Captain har C för kurs och B för bordningsradarn. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-775 | Gunner har en mållista. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-776 | Captains kurs sparas inte, men märken och överladdning sparas i spelets tillstånd. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-777 | Bordningsradarn kan bara öppnas av Captain och bara när någon har varit inne. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-778 | Ett system som Engineer inte ger någon energi fungerar inte alls. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-779 | Utan energi till motorerna kan skeppet varken gasa eller svänga. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-780 | En sköld utan energi faller på två sekunder i stället för direkt. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-169 | saknas |
| R-781 | Captain och Gunner ser bara energin till sitt eget system, och bara Engineer ser alla. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-782 | Spelarskeppet är alltid samma fregatt. | byggd | HANDOFF beslut; BACKLOG F-076 | saknas |
| R-783 | Uppgraderingar syns på skrovet. | byggd | HANDOFF beslut | saknas |
| R-784 | Det finns två sorters slots: hardpoints och system slots. | byggd | HANDOFF beslut; proposal-economy.md 2.1 och fråga 7 | saknas |
| R-785 | Fighter bay är en uppgradering. | byggd | HANDOFF beslut | saknas |
| R-786 | Rollen inne är den post man lämnade när man gick in, och alla tre roller har en liten bonus. | byggd | station-boarding.md §7 | saknas |
| R-787 | Gunner gör 25 procent mer skada med gevär. | byggd | station-boarding.md §7 | saknas |
| R-788 | Engineer hackar och arbetar med lås en och en halv gång så snabbt. | byggd | station-boarding.md §8 | saknas |
| R-789 | Bara Engineer kan göra hack nivå 2. | byggd | station-boarding.md §7, §8 | saknas |
| R-790 | Captain ser vakter och kameror åtta rutor bort genom väggar, och hela gruppen får se det. | ersatt av: R-447 och R-561 | station-boarding.md §7 (ersatt av krock 6) | saknas |
| R-791 | Man börjar med 0 krediter, 60 av 100 i bränsle, två hardpoints och två system slots. | byggd | proposal-economy.md 1.1 | saknas |
| R-792 | En ensam spelare byter fritt mellan posterna, och det som ställts in på en post fortsätter när man lämnar den. | byggd | proposal-computer.md (Läget i dag) | saknas |
| R-793 | Ingen post gör något av sig själv, så en Gunner-post som ingen sitter vid skjuter inte. | byggd | proposal-computer.md (Läget i dag) | saknas |
| R-794 | Motorer utan energi ger varken dragkraft eller sväng, och Captain får raden ENGINES OFFLINE · NO POWER. | byggd | BACKLOG F-169 | saknas |
| R-795 | Captain ser bara motorernas energi och Gunner bara vapnens. Engineer ser all energi i sin egen panel. | byggd | BACKLOG F-170 | saknas |
| R-796 | Captain ser hur STEERING och ENGINES mår i procent, och Gunner ser WEAPONS, och en kritisk del blinkar. | byggd | BACKLOG F-176 | saknas |
| R-797 | Engineers skärm visar monterade uppgraderingar och vad en skada gör, till exempel GUNS AT 70%. | byggd | BACKLOG F-153 | saknas |
| R-798 | Uppgraderingar går inte sönder var för sig. | byggd | BACKLOG F-153 | saknas |
| R-799 | Gunner har en mållista med de farligaste fienderna först. | byggd | BACKLOG F-138 | saknas |
| R-800 | Captain sätter kurs mot en plats på kartan med C och ser avstånd, tid dit och åt vilket håll hen ska svänga. | byggd | BACKLOG F-138 | saknas |
| R-801 | Engineer lagar skeppet utan att det kostar pengar. | byggd | proposal-world.md "Aldrig låsa sig" | saknas |
| R-802 | En reparation på station lagar allt på en gång för 0,25 krediter per skadepoäng hos vänliga och 0,50 hos neutrala. | byggd | proposal-economy.md 1.2 | saknas |
| R-803 | Att skeppet går förlorat kostar inga krediter, och senaste sparningen laddas om. | byggd | proposal-economy.md 1.2 | saknas |
| R-804 | Man kan köpa högst två Extra Hardpoint och två Extra System Slot. | byggd | proposal-economy.md 1.4 punkt 9 | saknas |
| R-805 | Ett valv har 20 procents chans på en slot och en pod 15 procent, utan tak för hittade slots. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-806 | Engineers skärm ska visa allt som sitter på skeppet och säga tydligt vad som är skadat och vad skadan gör. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-807 | Värme blir en andra resurs bredvid energi, med uppgraderingar som kyler bättre. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-808 | Allt samspel mellan posterna ska fungera för den som spelar ensam. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-809 | Datorn kan sköta skeppet under bordning enligt rollerna man valde vid start. | bestämd | proposal-bases.md §4 | – |
| R-810 | Skeppet försvarar sig bara om datorn sköter Gunner eller om en spelare är kvar. | bestämd | proposal-bases.md §4 | – |
| R-811 | När skrovet nästan är slut och en spelare är kvar i skeppet bestämmer spelaren om skeppet ska backa ut. | bestämd | proposal-bases.md §4 | – |
| R-812 | När skrovet nästan är slut, ingen är kvar och datorn sköter Captain, backar skeppet till en säker plats och kommer tillbaka när någon kallar från luftslussen. | bestämd | proposal-bases.md §4 | – |
| R-813 | Datorn gör aldrig något stort på egen hand, utom att backa ut skeppet när den sköter Captain. | bestämd | proposal-bases.md §4 | – |
| R-814 | När skrovet nästan är slut, ingen är kvar och datorn inte sköter Captain, ligger skeppet kvar och skyddas av basens dockningssköld. | bestämd | proposal-bases.md §4 | – |
| R-815 | Det ska synas när skeppets dator sköter något. | bestämd | proposal-computer.md (Det som är bestämt), BACKLOG D-186 | – |
| R-816 | Vid start väljer man vilka roller datorn får sköta, och som standard är det ingen. | bestämd | proposal-computer.md (Det som är bestämt), BACKLOG D-186 | – |
| R-817 | En roll som datorn sköter är öppen för alla spelare att handla åt i butiken. | bestämd | proposal-computer.md (Det som är bestämt), BACKLOG D-186 och D-189 | – |
| R-818 | Uppgraderingarna sorteras efter kategori och roll. | bestämd | BACKLOG F-188 | – |
| R-819 | Ekonomin delas mellan rollerna, så att varje roll bestämmer över sina egna förbättringar. | bestämd | BACKLOG D-189 | – |
| R-820 | Startkanonen tar ingen plats, Captain siktar med skeppet och Gunner skjuter. | förslag | proposal-bases.md §6 | – |
| R-821 | Skeppets delar (vapen, pansar, sköld och energi) får nivå 2 och 3 i stället för att köpas en gång. | förslag | proposal-items.md 2.1 och fråga 3 | – |
| R-822 | En post som datorn sköter visar AUTO på sin flik, och den som tar posten tar över direkt. | förslag | proposal-computer.md | – |
| R-823 | Datorn tar en ikryssad post av sig själv när ingen sitter där. | förslag | proposal-computer.md fråga 1 | – |
| R-824 | Valet av datorposter kan ändras från menyn under omgången, men bara när alla spelare är överens. | förslag | proposal-computer.md fråga 2 | – |
| R-825 | Datorn följer det som är utpekat och gör aldrig något stort på egen hand, som att docka eller hoppa. | ersatt av: R-813 | proposal-computer.md fråga 3 (ersatt av krock 10) | – |
| R-826 | Datorn reagerar en halv sekund senare och träffar ungefär hälften så ofta som en van spelare, lika för alla svårighetsgrader. | förslag | proposal-computer.md fråga 4 | – |
| R-827 | Datorn som Captain håller satt kurs och låg fart nära stationer och vrak. | förslag | proposal-computer.md | – |
| R-828 | Datorn som Gunner skjuter på den fiende Captain märkt, annars den närmaste som skjuter på skeppet, och aldrig på stationer, med raketer eller med Heavy Laser. | förslag | proposal-computer.md | – |
| R-829 | Datorn som Engineer lagar det som är värst skadat och flyttar energi till skölden när skeppet blir beskjutet. | förslag | proposal-computer.md | – |
| R-830 | Under bordning försvarar och lagar datorn skeppet. | förslag | proposal-computer.md fråga 5 | – |
| R-831 | Piratvågorna är glesare för en ensam spelare men något tätare när datorn hjälper till. | förslag | proposal-computer.md fråga 6 | – |
| R-832 | Skeppet har sex skadedelar som förut, men det ersattes av fem delar 2026-11-15. | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 | – |
| R-833 | Engineer hackar mainframen dubbelt så snabbt. | ersatt av: ett senare beslut, se källan | station-boarding.md §7 (ersatt av byggd avvikelse: en och en halv gång så snabbt, §8) | – |

## Ekonomi och butik

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1103 | Varje roll har sin egen kassa: Captain, Gunner och Engineer. | byggd | Användaren 2026-11-16 (D-189) | tests/purses.test.js |
| R-1104 | När besättningen tjänar pengar får varje rolls kassa hela beloppet, oavsett vilken roll som tjänade dem och hur många som spelar. | byggd | Användaren 2026-11-16 (D-189) | tests/purses.test.js |
| R-1105 | Captain betalar bränsle och stjärnkartor, Engineer lagning och Gunner raketer. | ersatt av: R-1121; fortfarande byggt | Användaren 2026-11-16 (D-189) | – |
| R-1106 | Butiken visar vad alla roller kan köpa, men man köper bara det som hör till de roller man har. Den som har alla roller kan köpa i alla avdelningar. | byggd | Användaren 2026-11-16 (F-188, D-189) | tests/purses.test.js |
| R-1107 | Butikens utseende får en design innan den ritas om. | bestämd | Användaren 2026-11-16 (F-080) | – |
| R-1115 | En övertagen station har en egen kassa som fylls av stationens inkomst över tid, och dess försvar köps ur den kassan. | byggd | Användaren 2026-11-16 (D-189, F-088) | tests/stations.test.js |
| R-1116 | Stationens inkomst ger också spelarna pengar: varje rolls kassa får lika mycket. | byggd | Användaren 2026-11-16 (D-189, F-088) | tests/stations.test.js |
| R-1117 | Prissumman betalas av den som står vid disken, ur den egna kassan. | byggd | Användaren 2026-11-16 (D-189) | tests/purses.test.js |
| R-1119 | En tjänst vid disken (bränsle, lagning, raketer, kartor) kan beställas av vem som helst, men betalas ur kassan för den roll den hör till, så att Captain inte måste gå in för att tanka. | ersatt av: R-1121; fortfarande byggt | Agentens tolkning 2026-11-16, väntar på användaren | – |
| R-1120 | Med flera spelare har den första spelaren rollen Captain, den andra Gunner och den tredje Engineer. En roll som ingen spelare har är öppen för alla att köpa åt. | byggd | Agentens tolkning av R-1108 och R-1111 2026-11-16 | tests/purses.test.js |
| R-1121 | Alla tjänster vid disken (bränsle, lagning, raketer och kartor) betalas av den som beställer, ur den egna kassan, så att man kan turas om. | byggd | Användaren 2026-11-16 | tests/purses.test.js |
| R-1122 | Butiken visar tydligt att tjänsterna kan köpas av alla. | byggd | Användaren 2026-11-16 | tests/shop.test.js |
| R-1123 | Butiken har filterknappar som visar vad varje roll kan köpa, med den egna rollen som förval. | byggd | Användaren 2026-11-16 (F-080) | tests/shop.test.js |
| R-1124 | Fighter bay hör till Captain, som skjuter ut dartsen. | ersatt av: R-1126 | Användaren 2026-11-16 | – |
| R-1125 | Skeppet börjar med bränsle för ett hopp. Bränsletanken ger ett hopp till när den köps, och den uppgraderas ett hopp i taget, högst fem gånger, så att skeppet kan ha högst sex hopp. | byggd | Användaren 2026-11-16 (D-238) | tests/world.test.js |
| R-1126 | Fighter bay hör till Gunner. Den har plats för en dart och uppgraderas en dart i taget till högst tre. | byggd | Användaren 2026-11-16 (D-238) | tests/sim.test.js |
| R-1127 | Darts skjuts bara ut för hand. Uppgraderingen som skjuter ut dem av sig själv tas bort. | byggd | Användaren 2026-11-16 (D-238) | tests/sim.test.js |
| R-1128 | Butiken visar vad varje nivå av en uppgradering ger, både de man har och de man inte har än. | byggd | Användaren 2026-11-16 (D-238) | tests/shop.test.js |
| R-1129 | Skölden slås på och av för hand, och den drar lite bränsle medan den är på. Gunner sköter den, den är av när spelet startar, och den slås inte på av sig själv vid en träff. | byggd | Användaren 2026-11-16 | tests/stores.test.js |
| R-1130 | Informationen om en vald sak i butiken visas i en fast panel vid sidan av listan. | byggd | Användaren 2026-11-16 (D-238) | tests/shop.test.js |
| R-1131 | Saker kan både köpas och säljas i butiken, redan nu. | byggd | Användaren 2026-11-16 (D-238) | tests/stores.test.js |
| R-1132 | Delar som hör till skeppet installeras på ett varv. På varvet går det varken att köpa eller sälja. | byggd | Användaren 2026-11-16 (D-238) | tests/sim.test.js |
| R-1133 | Sprängladdningen hör till Gunner. | byggd | Användaren 2026-11-16 (D-238, B2) | tests/stores.test.js |
| R-1134 | Kanontornen och Engineers verktyg (scannerpuls, sonder och radarbojar) läggs in i butiken nu. | byggd | Användaren 2026-11-16 (D-238, B3) | tests/stores.test.js |
| R-1135 | Köpta delar till skeppet hamnar i ett förråd som ser ut som butiken: alla ser vad som finns och vilken roll som styr över vad. | byggd | Användaren 2026-11-16 (D-238, V1) | tests/sim.test.js |
| R-1136 | Bara den som köpt en del installerar den eller tar bort den. | byggd | Användaren 2026-11-16 (D-238, V1) | tests/purses.test.js |
| R-1137 | Platserna att installera i är inte gemensamma: varje roll köper sina egna. | byggd | Användaren 2026-11-16 (D-238, V1) | tests/stores.test.js |
| R-1138 | Installationen på varvet är gratis. | byggd | Användaren 2026-11-16 (D-238, V2) | tests/sim.test.js |
| R-1139 | En del som säljs ger hälften av priset tillbaka i en vanlig butik, och tre fjärdedelar i butiken på en egen bas. | byggd | Användaren 2026-11-16 (D-238, V3) | tests/stores.test.js |
| R-1140 | I fristaden kan man köpa delar men inte installera dem, eftersom det inte finns något varv där. | byggd | Användaren 2026-11-16 (D-238, V4) | tests/shop.test.js |
| R-1141 | Varje nivå av en uppgradering är en del som installeras på varvet, så att uppgraderingar också kan hittas som loot. | byggd | Användaren 2026-11-16 (D-238, V5) | tests/stores.test.js |
| R-1142 | Allt man bär, som bordarnas utrustning och varor, gäller direkt när man köper det, utan varv. | byggd | Användaren 2026-11-16 (D-238, V6) | tests/stores.test.js |
| R-1143 | Varor köps och säljs i butiken, så att det går att ha handelsrutter. I början är priserna fasta. | bestämd | Användaren 2026-11-16 (D-238, V6) | – |
| R-1144 | Senare blir varupriserna rörliga, så att man inte blir rik på att köra samma rutt fram och tillbaka. | bestämd | Användaren 2026-11-16 (D-238, V6) | – |
| R-1145 | En uppgradering som hittas som loot hamnar i förrådet hos den roll som saken hör till, oavsett vem som bar hem den. | bestämd | Användaren 2026-11-16 (L1) | – |
| R-1146 | Kanontornen och scannerpulsen är delar som andra: de köps, installeras på varvet och kan hittas som loot. | byggd | Användaren 2026-11-16 (L2) | tests/stores.test.js |
| R-1147 | Sonder och radarbojar köps i antal vid disken, som raketer, och kan ibland hittas som loot. | byggd | Användaren 2026-11-16 (L3) | tests/sim.test.js |
| R-1148 | Sonder och radarbojar fylls inte längre på av sig själva när de går att köpa. | byggd | Användaren 2026-11-16 (L4) | tests/sim.test.js |
| R-1170 | Butiken, förrådet och varvet kan också filtreras på vad sakerna är, till exempel uppgraderingar och utrustning för bordning. | byggd | Användaren 2026-11-16 (D-243, U1) | tests/shop.test.js |
| R-1171 | Förrådet öppnas med en tangent var som helst ombord, och syns också i butiken och på varvet. | byggd | Användaren 2026-11-16 (D-243, U3) | tests/shop.test.js |
| R-1172 | En sak som går att köpa och uppgradera visar sin nivå som LV 0/5 innan den är köpt, och LV 2/5 och så vidare efter. | byggd | Användaren 2026-11-16 (D-243) | tests/shop.test.js |
| R-1173 | Man kan inte ha fler delar än man kan installera: när en roll har lika många delar som platser, installerade eller i förrådet, går det inte att köpa fler, och inga fler dyker upp som loot. | byggd | Användaren 2026-11-16 (D-243) | tests/sim.test.js |
| R-1174 | Platser är permanenta uppgraderingar: en plats som är köpt finns kvar, och det som sitter i den byts när man vill. | byggd | Användaren 2026-11-16 (D-243) | tests/stores.test.js |
| R-1175 | En sak man har max av, installerad och i förrådet tillsammans, finns inte i butiken och dyker inte upp som loot. | byggd | Användaren 2026-11-16 (D-243) | tests/stores.test.js |
| R-1176 | Filtret på vad sakerna är har UPGRADES (delar till skeppet), BOARDING (bordarnas utrustning) och SLOTS (extra platser). Tjänsterna syns alltid för sig. | byggd | Användaren 2026-11-16 (D-243, K1) | tests/stores.test.js |
| R-1177 | Varvet visar skeppet med varje rolls platser, och butiken och förrådet visar platserna som en rad rutor per roll. Det provas. | byggd | Användaren 2026-11-16 (D-243, O1) | tests/shop.test.js |
| R-1178 | Varje roll kan ha tre platser på skrovet och tre för system, och en av varje är öppen från start. Det provas. | byggd | Användaren 2026-11-16 (D-243, O2) | tests/stores.test.js |
| R-1179 | Platser kan hittas som loot, men sällan. | byggd | Användaren 2026-11-16 (D-243, O3) | tests/shop.test.js |
| R-1180 | En plats blir aktiv direkt, både när den köps och när den hittas och bärs hem. En hittad plats hör till en bestämd roll och sort, och hamnar hos den rollen. | byggd | Användaren 2026-11-16 (D-243, O4) | tests/sim.test.js |
| R-1181 | I spelet heter platserna HULL SLOT och SYSTEM SLOT. Ordet hardpoint används inte. | byggd | Agenten 2026-11-16, efter användarens fråga om ordet | tests/shop.test.js |
| R-1187 | Gunner skickar ut dartsen och kallar hem dem (R på tangentbordet). En dart som kommer hem går in i fighter bay och kommer ut hel nästa gång. | byggd | Användaren 2026-11-16 | tests/sim.test.js |
| R-834 | Neutrala shipyards är alltid öppna mot betalning. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-835 | Neutrala shipyards har samma priser som vänliga så länge spelet testas. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-836 | Stationer säljer kartan till nästa sektor. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-837 | Pirater ger en liten belöning i krediter. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-838 | Reparation vid station lagar allt på en gång. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-839 | Bordarnas utrustning säljs i en egen flik, Armory, hos alla stationer som handlar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-840 | Bordarnas utrustning kräver inget shipyard och tar inga slots. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-841 | Pirater lämnar ibland bärgningsgods som plockas upp genom att flyga över det. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-842 | Tractor beam drar in bärgningsgods på avstånd. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-843 | Butiken finns bara inne på stationen, vid tre diskar: Services nära luftslussen, och Shipyard och Armory i var sitt rum. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-844 | F vid en disk öppnar butikspanelen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-845 | Docking Field kostar 150 krediter och tar en system slot. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-846 | Flares köps en gång i Armory och ger tre per bordning. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-847 | Sprängladdningen köps och förbrukas när den används. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-848 | Det man bryter ur asteroider ger bränsle och kan säljas. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-849 | Diskarna på en handelsstation står i de tre största rummen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-850 | Båda sorters slots kan köpas eller hittas som loot. | byggd | HANDOFF beslut | saknas |
| R-851 | Försvaret på en ägd station köps för krediter i tre nivåer för sköld, kanoner och säkerhet inuti. | byggd | station-boarding.md §8 | saknas |
| R-852 | Den som tar över en bas utan faktion får en prissumma på 300 krediter på sig. | byggd | station-boarding.md §9, §16 | saknas |
| R-853 | Prissumman betalas på valfri station som handlar med besättningen, eller försvinner när tre grupper är besegrade. | byggd | station-boarding.md §9 | saknas |
| R-854 | En prissumma går alltid att bli av med, även utan pengar. | byggd | station-boarding.md §11 | saknas |
| R-855 | Priset på en uppgradering stiger med hälften för varje nivå man redan har. | byggd | proposal-economy.md 1.2 | saknas |
| R-856 | HULL kostar i dag: Twin Wing Turrets 150, Heavy Laser 220, Rocket Pods 200, Fighter Bay 320 (två hardpoints), Armor Plating 160, Point Defense 220, Fuel Tank 140, Dart Autolaunch 150 och Extra Hardpoint 250 och 375. | byggd | proposal-economy.md 1.2 | saknas |
| R-857 | SYSTEMS kostar i dag: Shield Emitters 180, Enemy Alarm 120/180/240, Target Scanner 140, Targeting Computer 130, Power Core 240, Afterburner 160, Jump Coils 180, Tractor Beam 150, Repair Drones 200, Docking Field 150, Extra System Slot 200 och 300 och Solar Cells 200. | byggd | proposal-economy.md 1.2, BACKLOG F-194 | saknas |
| R-858 | ARMORY kostar i dag: Rifle Upgrade 120 och 180, Cargo Pack 140, Suit Armor 160, Flares 60, Deployable Turret 180, Hacking Kit 150, Teleporter Coils 150, Tranq Gun 120 och sprängladdning 50. | byggd | proposal-economy.md 1.2, proposal-items.md 1, BACKLOG F-107 och F-191 | saknas |
| R-859 | Uppgraderingar kostar lika mycket hos vänliga och neutrala stationer så länge spelet testas. | byggd | proposal-economy.md 1.2 (bestämt i D-044) | saknas |
| R-860 | En avvaktande station tar 1,5 gånger priset på allt. | byggd | proposal-economy.md 1.2 och 1.5 regel 5 | saknas |
| R-861 | En Fighter ger 5 krediter och 35 procents chans på ett bärgningsgods värt 10 till 25. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-862 | En Gunboat ger 25 krediter, alltid två gods à 20 till 40, och ett vrak om sektorn har färre än fem. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-863 | En faktions Fighter eller Gunboat lämnar samma gods som piraternas men inga prispengar. | byggd | proposal-economy.md 2.1 | saknas |
| R-864 | Ett fraktskepp lämnar alltid tre gods à 15 till 35 och ett vrak. | byggd | proposal-economy.md 2.1 | saknas |
| R-865 | Cruisern ger 500 krediter och sex gods à 20 till 80, men inget vrak. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-866 | Ett vrak med risk 1 har 3 lådor à 30 till 70, 2 lådor i valvet à 90 till 160 och 4 bränsleceller. | ersatt av: R-1086 | proposal-economy.md 1.1 | – |
| R-867 | Risk 2 ger en låda och en bränslecell till, och risk 3 ytterligare en av varje. | ersatt av: R-1086 | proposal-economy.md 1.1 | – |
| R-868 | En fientlig station har innehåll som ett vrak med risk 3, och alltid kartan om den saknas. | byggd | proposal-economy.md 1.1 och 2.1 | saknas |
| R-869 | En pod ger 60 till 140 krediter och 50 procents chans på 25 bränsle. | byggd | proposal-economy.md 1.1 | saknas |
| R-870 | Vakter och turrets inne lämnar inget. | byggd | proposal-economy.md 2.1 | saknas |
| R-871 | Varor (goods) köps och säljs mellan stationer bara för att tjäna pengar, och spelaren kan inte använda dem själv. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-872 | Scannerpuls, sonder och radarbojar ska enligt designen köpas. | byggd | HANDOFF beslut 2026-11-14 | tests/stores.test.js |
| R-873 | Kanontorn köps. | byggd | HANDOFF beslut 2026-11-16 | tests/stores.test.js |
| R-874 | Varvet köps som en permanent uppgradering, och alla standardbaser kan köpa det. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-875 | På eget varv får man tillbaka tre fjärdedelar när man byter bort en del, annars hälften. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §7 | – |
| R-876 | Det finns inget förråd för delar. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §7 | – |
| R-877 | En ägd station ger inkomst över tid (F-088). | bestämd | station-boarding.md §8 | – |
| R-878 | Man måste kunna bryta malm för att få pengar om de tar slut. | bestämd | proposal-bases.md §5 | – |
| R-879 | Startkanonen går att uppgradera och är billig. | bestämd | proposal-bases.md §6 | – |
| R-880 | Handel finns bara för att tjäna pengar, inte för att använda varorna själv. | bestämd | BACKLOG F-068 | – |
| R-881 | Början ska kännas svår, och uppgraderingar ska vara värda pengarna. | bestämd | BACKLOG F-050 | – |
| R-882 | Basen i fristaden har bara grunderna: sälja malm, bränsle, lagning, de billigaste uppgraderingarna (högst 150) och enkla jobb. Fristaden är bara en startpunkt för att ta sig vidare. | byggd | proposal-bases.md §5; godkänt av användaren 2026-11-16 (F1) | tests/world.test.js |
| R-883 | Bättre saker finns i andra system, och varje faktion säljer sina egna. | förslag | proposal-bases.md §5 | – |
| R-884 | Asteroiderna i fristaden räcker för att komma igång, men de större pengarna finns längre ut. | förslag | proposal-bases.md §5 | – |
| R-885 | Startkanonen uppgraderas i några billiga steg: mer skada, långsammare uppvärmning och mer malm per asteroid. | förslag | proposal-bases.md §6 | – |
| R-886 | Varvet är dyrt och ett av de stora målen i mitten av en omgång. | förslag | proposal-bases.md §7 | – |
| R-887 | En ensam spelare i första sektorn ska ha råd med ungefär fem köp i timmen, och det första efter ungefär tio minuter. | förslag | proposal-economy.md 1.5 regel 1 och fråga 1 | – |
| R-888 | Priserna i shipyard och armory dubblas, och krediterna i lådor och pods halveras. | förslag | proposal-economy.md 1.6 och fråga 2 | – |
| R-889 | Tjänster som bränsle, reparation, raketer och kartor kostar som i dag. | förslag | proposal-economy.md 1.5 regel 4 och 1.6 | – |
| R-890 | En Fighter ger 5 krediter och 25 procents chans på ett gods à 10 till 20. | förslag | proposal-economy.md 1.6 | – |
| R-891 | Lådor, pods och prispengar ger 25 procent mer per sektornivå. | förslag | proposal-economy.md 1.5 regel 3 och fråga 4 | – |
| R-892 | Ungefär hälften av inkomsten kommer från bordning, en fjärdedel från strid och en fjärdedel från jobb, och ingen källa ger mer än hälften. | förslag | proposal-economy.md 1.5 regel 2 | – |
| R-893 | Löpande kostnader ska ta 10 till 15 procent av inkomsten. | förslag | proposal-economy.md 1.5 regel 4 | – |
| R-894 | Kartor ska alltid vara billiga nog att köpa efter ett enda vrak. | förslag | proposal-economy.md 1.5 regel 9 | – |
| R-895 | En egen station ger 2 krediter i minuten, sparar högst 200 och betalar när man dockar där. | förslag | proposal-economy.md 1.5 regel 8 och 1.6, BACKLOG F-088 | – |
| R-896 | Ett uppdrag betalar ungefär 150 krediter för tio minuters arbete, och hälften mer med tidsgräns. | förslag | proposal-economy.md 1.6 | – |
| R-897 | Vrakets innehåll följer skrovet: Gunboat-vrak 2 lådor, 1 i valvet och 2 celler, okänt skrov 3, 2 och 3, och fraktskepp 5, 2 och 4. | förslag | proposal-economy.md 2.1 och fråga 8 | – |
| R-898 | Högre risk ger 25 procent mer i valvets lådor, fler vakter och kortare tid, men inte fler lådor. | förslag | proposal-economy.md 2.2 regel 2 | – |
| R-899 | Ett fraktskepp lämnar ett gods och en pod i stället för tre gods, när handeln finns. | förslag | proposal-economy.md 2.1 och fråga 9 | – |
| R-900 | Chansen för en slot i ett valv är 10 procent i Gunboat-vrak, 20 i andra vrak och 30 i fientliga stationer, och 10 i en pod. | förslag | proposal-economy.md 2.1 | – |
| R-901 | Tre spelare får tjäna mer än en ensam, tills vidare. | förslag | proposal-economy.md fråga 12 | – |
| R-902 | Lastrummet har begränsad plats som går att bygga ut, priserna rör sig långsamt, och en priskarta visar var det lönar sig. | förslag | BACKLOG F-068 | – |
| R-903 | En timmes handel ger ungefär 70 procent av en timmes strid och bordning. | förslag | proposal-economy.md 1.6 | – |
| R-904 | Armory har en knapp som fyller på alla förbrukningsvaror, med priset på knappen. | förslag | proposal-items.md 2.5 och fråga 5 | – |
| R-905 | Ett neutralt shipyard är bara öppet efter ett besvarat nödanrop, men det ersattes 2026-11-14 av att det alltid är öppet mot betalning. | ersatt av: ett senare beslut, se källan | HANDOFF beslut 2026-11-14 | – |

## Uppdrag och story

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-906 | Spelet är vunnet när Cruisern i The Maw är förstörd. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-907 | Det går att flyga vidare efter att spelet är vunnet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-908 | Det första nödanropet kommer två till tre minuter efter att man kommit till en ny sektor, och nästa två och en halv till fyra minuter efter att det förra är över. | byggd | proposal-economy.md 1.1 | saknas |
| R-909 | Ett besvarat nödanrop ger 100 krediter hos en vänlig station, eller 40 procent rabatt på allt i tre minuter hos en neutral, men bara om besättningen själv träffat en angripare. | byggd | proposal-economy.md 1.1 och 1.2 | saknas |
| R-910 | Spelet går ut på utforskning och äventyr som binder ihop systemen. | bestämd | HANDOFF beslut 2026-11-15; proposal-world.md "Riktningen", BACKLOG D-052 | – |
| R-911 | Slutet är ett anfall på en svår piratbas. | bestämd | HANDOFF beslut 2026-11-15; proposal-world.md steg 4, BACKLOG D-052 | – |
| R-912 | Cruisern blir en del av ett mystiskt uppdrag. | bestämd | HANDOFF beslut 2026-11-15; proposal-world.md steg 4, BACKLOG D-052 | – |
| R-913 | Antalet system väljs i starten och avgör hur många uppdrag det finns före slutet. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-914 | Storyn kan låsa upp vägar till dolda system, med en karta från ett uppdrag eller från ett skepp man bordar. | bestämd | HANDOFF beslut 2026-11-15; proposal-world.md steg 4, BACKLOG D-052 och F-081 | – |
| R-915 | Varje omgång är genererad: systemen, en röd tråd av berättelse och frivilliga sidouppdrag. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-916 | Det finns ingen färdigskriven story från början till slut. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-917 | Alla sorters uppdrag finns, högst fem samtidigt för stunden. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-918 | Vissa uppdrag har tidsgräns och betalar mer. | bestämd | HANDOFF beslut 2026-11-14; proposal-world.md steg 4, BACKLOG D-073 | – |
| R-919 | Ett misslyckat uppdrag kostar lönen och lite anseende hos stationens faktion, eller hos just stationen om den är neutral. | bestämd | HANDOFF beslut 2026-11-14; proposal-world.md steg 4, BACKLOG D-073 | – |
| R-920 | Faktionsuppdrag kan ge plus hos en faktion och minus hos en annan (F-118, D-073). | bestämd | station-boarding.md §10 | – |
| R-921 | Piraternas slutbas har tre våningar, genereras för varje omgång och är en urholkad asteroid utanpå. | bestämd | proposal-bases.md §10 | – |
| R-922 | Slutbasens våningar är industri med dock och last, ljust boende och kall kommandodel med mainframe. | bestämd | proposal-bases.md §10 | – |
| R-923 | Slutbasen har ett stort lastutrymme med vakter, en skattkammare och bränsletunnor. | bestämd | proposal-bases.md §10 | – |
| R-924 | Bossen är en pirat i mech-dräkt, och bossrummet har mekanik som används för att besegra den. | bestämd | proposal-bases.md §10 | – |
| R-925 | När bossen är besegrad tar man över slutbasen, som inte sprängs och inte har någon flykt på tid. | bestämd | proposal-bases.md §10 | – |
| R-926 | I slutbasen kommer man in vid dockorna i industrivåningen och arbetar sig uppåt. | bestämd | proposal-bases.md §10 | – |
| R-927 | Det finns ingen handskriven fast story. En röd tråd med frivilliga sidouppdrag genereras för varje omgång. | bestämd | proposal-world.md "Riktningen", BACKLOG D-052 | – |
| R-928 | Man får aldrig låsas av att man råkar förstöra ett skepp man skulle borda, och ett mål som förstörs flyttas. | bestämd | proposal-world.md steg 4 och "Aldrig låsa sig", BACKLOG D-052 | – |
| R-929 | Storyn kräver aldrig pengar. | bestämd | proposal-world.md "Aldrig låsa sig" | – |
| R-930 | Inga onödigt svåra moment får kunna låsa spelet. | bestämd | BACKLOG D-052 | – |
| R-931 | Uppdrag fås på stationer genom att prata med folk, högst fem åt gången. | bestämd | proposal-world.md steg 4, BACKLOG D-073 | – |
| R-932 | Uppdragen finns i flera sorter: frakt, passagerare, prisjakt, eskort och räddning. | bestämd | BACKLOG D-073 | – |
| R-933 | En faktions bas har flest uppdrag för den faktionen, ibland från andra, och neutrala baser har mer blandat. | bestämd | BACKLOG D-073 | – |
| R-934 | Ett uppdrag kan ge plus i anseende hos en faktion och minus hos en annan. | bestämd | BACKLOG D-073 | – |
| R-935 | Engineer kan störa en skanning av smuggelgods med ett aktivt minispel som inte är svårt men roligt. | bestämd | BACKLOG D-074 | – |
| R-936 | Det finns anomalier i rymden, till exempel områden där man flyger och skjuter långsammare eller tar skada. | bestämd | BACKLOG F-053, proposal-world.md steg 3 besked | – |
| R-937 | På den minsta kartan ska slutet gå att nå utan att ta en enda bas. | förslag | proposal-bases.md §2 | – |
| R-938 | Tre pyloner håller uppe bossens sköld och måste slås ut. | förslag | proposal-bases.md §10 | – |
| R-939 | Bossen byter fas vid 60 och 25 procent liv, och i sista fasen kommer drönare. | förslag | proposal-bases.md §10 | – |
| R-940 | Fraktjobb och passagerare med tidsgräns finns på en anslagstavla, och uppdrag med berättelse fås av folk i baren. | ersatt av: R-1220 | BACKLOG D-073 (från D-075) | – |
| R-941 | Patrullskepp skannar lasten, och olaglig last ger böter och sämre anseende. | förslag | BACKLOG D-074 (från D-075) | – |
| R-942 | Händelser ändrar världen: en station byter ägare, priser rör sig och en sektor blir farligare. | förslag | BACKLOG F-087 | – |
| R-1209 | Huvudstoryn har ett skelett i akter: krok, utredning, vändning, upptrappning och slut. Akterna fylls med genererade steg. Storyn börjar med kontakten i fristaden och slutar med att besättningen tar slutets stjärnkarta ur valvet på en piratbas. | bestämd | Användaren 2026-11-17 (D-274, US1); början och slutet är agentens förslag i docs/proposal-missions.md | – |
| R-1210 | Huvudstoryn har 8 steg på den lilla kartan, 12 på den mellersta och 16 på den stora, så att en stor värld inte känns tom. Den stora kartan har två vändningar. | bestämd | Användaren 2026-11-17 (D-274, US1 och US5) | – |
| R-1211 | Ett steg är en sak besättningen gör, på en plats, av ett skäl: prata, skaffa, leta, spana, strida, borda, leverera, välja och plundra. Varje steg säger vad det behöver och vad det ger (en person, en butik, ett vrak, en signal, ett mål, en sak eller valvet), och nästa steg behöver det som steget före gav. | förslag | docs/proposal-missions.md (D-274) | – |
| R-1212 | Ett val delar storyn på den lilla kartan och två på de andra. Två sidor vill ha samma sak, och båda vägarna leder vidare till slutet. | bestämd | Användaren 2026-11-17 (D-274, US2) | – |
| R-1213 | Samma sorts steg kommer aldrig två gånger i rad, och stegen flyttar ut mot farligare system ju längre storyn har kommit. | förslag | docs/proposal-missions.md (D-274) | – |
| R-1214 | Varje sorts steg har en väg ut om något går fel, så att besättningen aldrig fastnar: en person på en stängd bas möter besättningen i fristaden, ett mål som flyr dyker upp i ett system bredvid, och det man skulle hämta finns kvar i vraket om ett skepp sprängs. | förslag | docs/proposal-missions.md (D-274); följer R-928 och R-929 | – |
| R-1215 | Ett val ger +10 i anseende hos sidan som får saken och -5 hos den andra. | förslag | docs/proposal-missions.md (D-274) | – |
| R-1216 | Uppdragsloggen har en egen tangent och är gemensam för besättningen. Huvudstoryn står överst, med nuvarande steg, avklarade steg och de ledtrådar man fått, sidouppdragen under, och det valda uppdragets mål markeras på stjärnkartan och systemkartan. | bestämd | Användaren 2026-11-17 (D-274, US3) | – |
| R-1217 | Saker som hör till storyn finns bara medan storyn pågår, till exempel en sak som säljs på en bas eller ligger i ett vrak. De kan inte säljas eller tappas. | förslag | Användaren 2026-11-17 (D-274), docs/proposal-missions.md | – |
| R-1218 | En patrull kan skanna skeppet efter smuggelgods. Skanningen går på tid, och Engineer kan undvika att bli upptäckt genom att vrida två rattar tills skeppets våg ligger ovanpå skanningens. Den som åker fast förlorar godset och lite anseende. | bestämd | Användaren 2026-11-17 (UP3, D-074); vågen är förslag A för Engineers hack 2026-11-15; preciserar R-935 och R-941 | – |
| R-1219 | En del av samtalen i storyn sker inne på basen, så att någon går dit till fots. | bestämd | Användaren 2026-11-17 (US7, D-274) | – |
| R-1220 | Sidouppdragen väljs i baren på en bas, i ett gränssnitt som butikens. | bestämd | Användaren 2026-11-17 (US9, D-073); ersätter förslaget om en anslagstavla i R-940 för valet av uppdrag | – |
| R-1221 | De första sidouppdragen är frakt, prisjakt och räddning. Eskort kommer när eskortskeppen finns, och passagerare sist. | bestämd | Användaren 2026-11-17 (UP2, D-073) | – |
| R-1222 | Varje omgång har en dold sanning: vem som ligger bakom, varför och hur. Varje steg i huvudstoryn avslöjar en bit, och bitarna samlas som ledtrådar i uppdragsloggen. | bestämd | Användaren 2026-11-17 (US10, F-276) | – |
| R-1223 | Kontakten, rivalen och skurken talar med egen röst, i repliker, och hör av sig över radion mellan stegen. | bestämd | Användaren 2026-11-17 (US11, F-276) | – |
| R-1224 | Den sida som valdes bort i ett val kommer tillbaka: på dess baser senare i storyn blir besättningen kyligt mottagen, och kontakten säger vad den tycker om valet. | förslag | docs/proposal-missions.md (F-276) | – |
| R-1225 | Oftast visar stjärnkartan vart storyn pekar, men ibland ska besättningen hitta ett system eller en bas själv. | bestämd | Användaren 2026-11-17 (OM2, F-278) | – |
| R-1226 | När storyn pekar på ett system markeras bara var det ligger på stjärnkartan. Vägen dit visas bara där besättningen själv har upptäckt den, och om systemet visas ingenting förrän besättningen vet mer på vanligt sätt. Loggen säger området, men inte hur många hopp det är. | bestämd | Användaren 2026-11-17 (F-278); loggens del är agentens följd av beslutet | – |
| R-1227 | Kartan delas i områden runt fristaden: ALPHA, BETA, GAMMA och DELTA, och på den stora kartan också EPSILON. Områdena syns på stjärnkartan och nämns i storyns texter. | bestämd | Användaren 2026-11-17 (OM1, OM4, F-278) | – |
| R-1228 | Storyns utredning börjar i området runt fristaden, och varje akt flyttar storyn till ett nytt område, så att hela kartan används. Ibland återvänder storyn till ett system den varit i. | bestämd | Användaren 2026-11-17 (OM3, F-278) | – |
| R-1229 | I ett steg på den lilla kartan och två på de större, aldrig slutet, är målet inte markerat. Ledtråden säger området och något att känna igen, och den som frågar i baren på en bas i området får systemet markerat. | bestämd | Användaren 2026-11-17 (OM5, F-278) | – |
| R-1232 | Om storyn får röster i spelet läser berättaren bara meningar utan genererade namn, och namnen står i texten på skärmen. Karaktärernas repliker är inspelade i förväg. | bestämd | Användaren 2026-11-17 (VO3, D-280) | – |
| R-1233 | Critical behåller sin pixelstil utan detaljerade ytor. Ljus, skuggor och effekter ska bli mer genomarbetade. | bestämd | Användaren 2026-11-17 (F-283) | – |
| R-1234 | Spelets bild ritas med högst fyra skärmpunkter per spelpunkt, och ett steg mindre så länge bilderna kommer för långsamt. | byggd | Agentens mätning 2026-11-17 (B-282): sex gånger blev 4K-stort på en retinaskärm | tests/scale.test.js |
| R-1235 | Stjärnkartan visar områdena ALPHA, BETA, GAMMA, DELTA och på den stora kartan EPSILON, med gränser ut från fristaden, och säger i vilket område ett system ligger. Varje område har ungefär lika många system. | byggd | Användaren 2026-11-17 (OM1, OM4, F-278); byggt 2026-11-18 | tests/story.test.js |
| R-1236 | Spelet försöker starta ljudet vid varje tangent, när en tangent släpps, vid klick och när ett finger lyfts, och startskärmen visar PRESS ANY KEY FOR SOUND så länge ljudet inte har startat. | byggd | Användaren 2026-11-17 (B-281, Brave på macOS) | saknas |
| R-943 | Skepp i nöd ber om bränsle eller reparation och betalar eller minns det. | förslag | BACKLOG F-083 | – |
| R-944 | Captain kan anropa skepp och stationer för att be om bränsle, muta eller kräva tribut. | förslag | BACKLOG F-082 | – |

## Spelare och co-op

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-945 | Spelet går också att spela ensam. | byggd | HANDOFF beslut | saknas |
| R-946 | Den som spelar ensam börjar som Captain. | byggd | HANDOFF beslut | saknas |
| R-947 | Inget moment i spelet pausar spelet. | byggd | HANDOFF beslut | saknas |
| R-948 | En pausknapp fryser världen för alla spelare. | byggd | HANDOFF beslut | saknas |
| R-949 | Hardcore mode ger ett liv. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-950 | I hardcore sparar spelet sig bara självt, och det går inte att ladda eller exportera under en omgång. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-951 | I hardcore tas omgångens sparning bort när skeppet går förlorat. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-952 | Alla kan använda mainframen, så den som spelar ensam aldrig är utelåst. | byggd | station-boarding.md §7 | saknas |
| R-953 | Upp till tre spelare kan spela tillsammans online. | bestämd | HANDOFF beslut | – |
| R-954 | Spelet pausas automatiskt vid tappad anslutning först efter en stund, och gränsen prövas ut. | bestämd | HANDOFF beslut | – |
| R-955 | Onlineläget ska använda användarens egen motor, som bygger på Cloudflares realtidstjänster. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-956 | Ett gratiskonto ska räcka för onlineläget. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-957 | Spelare ansluter till onlineläget med rumskod eller länk. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-958 | Att hoppa in mitt i ett spel görs i samband med nätverkskoden. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-959 | En omgång ska gå att klara på några timmar, med en till tre spelare. | bestämd | HANDOFF beslut 2026-11-16 | – |
| R-960 | Den som spelar ensam kan alltid göra allt som krävs för att komma vidare, oavsett roll. | bestämd | station-boarding.md §11 | – |
| R-961 | Man ska kunna klara en liten omgång med en kompis på några timmar. | bestämd | proposal-bases.md §2 | – |
| R-962 | Spelet ska fungera för en till tre spelare. | bestämd | proposal-bases.md §2 | – |
| R-963 | Baserna anpassas så att det inte blir för svårt för den som spelar ensam. | bestämd | proposal-bases.md §4 | – |
| R-964 | Vad som händer när någon faller i slutbasen följer de regler som redan finns. | bestämd | proposal-bases.md §10 | – |
| R-965 | En kort omgång i co-op tar ett par timmar, och man kan spela längre om man vill. | bestämd | proposal-world.md "Riktningen", BACKLOG D-089 | – |
| R-966 | Det minsta valet av antal system ska ge en omgång på ungefär två timmar. | bestämd | BACKLOG D-089, proposal-world.md steg 3 fråga 1 | – |
| R-967 | Allt ska fungera för den som spelar ensam. | bestämd | proposal-world.md "Riktningen" | – |
| R-968 | Online spelar upp till tre spelare via network-kit, och man ansluter med rumskod eller länk. | bestämd | BACKLOG F-040 | – |
| R-969 | Man ska kunna hoppa in mitt i ett pågående spel. Det byggs med nätverkskoden. | bestämd | BACKLOG F-038 | – |
| R-970 | Viewern på en extra skärm är en bonus, och inget i spelet får kräva den. | bestämd | BACKLOG F-137 | – |
| R-971 | Anpassningen styrs av antalet människor som spelar, inte av vilka roller datorn sköter. | förslag | proposal-bases.md §4 | – |
| R-972 | Vakter i basen är ungefär hälften med 1 spelare, tre fjärdedelar med 2 och alla med 3. | förslag | proposal-bases.md §4 | – |
| R-973 | Drönare fylls på långsamt med 1 spelare, mellan med 2 och normalt med 3. | förslag | proposal-bases.md §4 | – |
| R-974 | Tiden tills förstärkningen dockar är dubbelt så lång med 1 spelare, en och en halv gång med 2 och normal med 3. | förslag | proposal-bases.md §4 | – |
| R-975 | Läget skärps efter källaren långsamt med 1 spelare, mellan med 2 och normalt med 3. | förslag | proposal-bases.md §4 | – |
| R-976 | Bossens liv är lägre med 1 spelare, mellan med 2 och fullt med 3. | förslag | proposal-bases.md §4 | – |

## Gränssnitt

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-977 | All text i spelet är på engelska. | byggd | HANDOFF beslut | saknas |
| R-978 | Spelet styrs med tangentbord och mus eller med handkontroll (agentens val, inte provat av användaren). | byggd | HANDOFF beslut | saknas |
| R-979 | En knapp dyker upp när det finns något att göra, med kortkommandot för tangentbord och en lösning för touch. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-980 | Knapparna för det man kan göra ligger nere till höger, högst två åt gången, med huvudsaken störst. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-981 | Med tangentbord visas tangenten som en ruta följd av ordet, och med handkontroll visas kontrollens knapp. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-982 | På pekskärm visas en rund knapp med symbol och ordet under. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-983 | Knapparna har alltid text. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-984 | På handkontrollen styr vänster spak skeppet eller flyttar pekaren, och höger spak siktar. | byggd | HANDOFF beslut | saknas |
| R-985 | På handkontrollen gasar och skjuter avtryckarna. | byggd | HANDOFF beslut | saknas |
| R-986 | På handkontrollen byter RB och LB post. | byggd | HANDOFF beslut | saknas |
| R-987 | På handkontrollen pausar START och BACK öppnar kartan. | byggd | HANDOFF beslut | saknas |
| R-988 | Pilarna i skärmkanten visar bara fiender inom sikt och vrak som redan hittats. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-989 | Bredvid varje knapp vid bordning visas vilka poster som kan göra momentet och vem som gör det bäst. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-990 | En förklarande rad visas de tre första gångerna, och den går inte att stänga av än. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-991 | Den som spelar ensam ser inte bordningsradarn medan hen själv är inne, utan använder pilarna i skärmkanten. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-992 | Zoomen i rymdvyn är fast, på tre fjärdedels storlek (på prov). | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-993 | Skärmen vid bordning visar 40 gånger 22 rutor. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-994 | En liten planritning i hörnet visar hela platsen, var man är och var luftslussen är, från början. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-995 | Menyn öppnas med O, och spelet går vidare bakom den. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-996 | Två statusrader överst visas efter en fast ordning: motorer utan energi, överladdning, hopp, dockning, skeppets varning, nödanrop, anfall på egen station och fiendelarm. | byggd | proposal-messages.md 1 | saknas |
| R-997 | Tillfälliga meddelanden visas under statusraderna och ser likadana ut, bara färgen skiljer. | byggd | proposal-messages.md 1 | saknas |
| R-998 | Bredvid varje knapp syns de tre posterna som märken för vem som kan och vem som gör det bäst, och en förklarande rad visas de tre första gångerna. | byggd | BACKLOG F-179 | saknas |
| R-999 | Intill märket för den post som gör ett moment bäst står vad den vinner: QUIET, FASTER eller FINDS THE CODE. | byggd | BACKLOG F-190 | saknas |
| R-1000 | Rymdvyn ritas i fast zoom på tre fjärdedels storlek, så att man ser en tredjedel längre åt varje håll. | byggd | BACKLOG F-165 | saknas |
| R-1001 | Texter på kartan läggs där det är ledigt, och ingen text täcker besättningens eget skepp. | byggd | BACKLOG B-106 | saknas |
| R-1002 | Handkontrollen har knappar för märkning, överladdning, Captains kurs och bordningsradarn. | byggd | BACKLOG B-178 | saknas |
| R-1003 | En viewer, en extra skärm som kaptenen eller alla kan skicka sin vy till, ska finnas. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1004 | Inget i spelet får kräva en viewer. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1005 | Det ska finnas en inställning som dämpar rörligt ljus. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-1006 | Spelet ska fungera bra på mobil. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1007 | När man går in visas rollen och bonusen i en rad överst, och Gunnerns bonus syns som ett märke vid vapnet. | bestämd | station-boarding.md §7 | – |
| R-1008 | Anfallsmeddelandet säger station, angripare, risknivå och ungefär tid kvar, till exempel "DRIFT POST UNDER ATTACK · PIRATES · RISK MEDIUM · 3 MIN". | bestämd | station-boarding.md §14 | – |
| R-1009 | Vägen ut ska provas i ett designtest före bygge. | bestämd | proposal-bases.md §4 | – |
| R-1010 | Vitgröna markeringar i golvet visar snabbaste vägen till luftslussen, bara genom öppnade dörrar och platser man varit på. | bestämd | proposal-bases.md §4; BACKLOG D-216 | – |
| R-1011 | Spelet ska gå att spela med pekskärm på mobil och surfplatta i liggande format, även L och Q vid bordning. | bestämd | BACKLOG F-090 | – |
| R-1012 | Butiken visar en bild för varje uppgradering, utrustning och vara. | bestämd | BACKLOG F-080 | – |
| R-1013 | Förstärkningen kommer med en synlig nedräkning, och ingenting dyker upp från ingenstans. | förslag | proposal-bases.md §4 | – |
| R-1014 | Bossens svep visas i förväg som en röd linje på golvet. | förslag | proposal-bases.md §10 | – |
| R-1015 | Ljuset inomhus görs med en ljuskarta i halv upplösning, självlysande saker ovanpå och bloom runt de starkaste. | förslag | proposal-bases.md §11 (byggt i dag bara på mörka ställen) | – |
| R-1016 | Väggar, stängda dörrar och höga föremål kastar skugga. | förslag | proposal-bases.md §11 | – |
| R-1017 | Rött används bara för fiender och fara. | förslag | proposal-bases.md §11 | – |
| R-1018 | Blinkande ljus blinkar långsammare än två gånger i sekunden. | förslag | proposal-bases.md §11 | – |
| R-1019 | Väggar ritas tunna i kanten mellan rutor i stället för hela rutor. | förslag | proposal-bases.md §11 | – |
| R-1020 | Meddelanden delas i tre nivåer: fara, händelse och läge. | förslag | proposal-messages.md 3.1 | – |
| R-1021 | Fara visas överst i rött med ram, försvinner först när faran är över och trängs aldrig undan. | förslag | proposal-messages.md 3.1 och fråga 1 | – |
| R-1022 | Händelser visas i en egen lista till vänster som sparar de fem senaste. | förslag | proposal-messages.md 3.1 | – |
| R-1023 | Läge, som dockning, visas bara i postens egen del av skärmen. | förslag | proposal-messages.md 3.1 och fråga 5 | – |
| R-1024 | En sensorremsa under krediterna visar fiender på väg, anfall på egna stationer, nödanrop, prissumma och nyheter från bojar och sonder. | förslag | proposal-messages.md 3.2 | – |
| R-1025 | Sensorremsan visar mer ju fler sensorer som är köpta, men det som syns på skärmen visas alltid. | förslag | proposal-messages.md 3.2 och fråga 3 | – |
| R-1026 | Bordare ser fara från skeppet i en egen rad. | förslag | proposal-messages.md 3.3 | – |
| R-1027 | En logg med de senaste händelserna öppnas från menyn eller med L. | förslag | proposal-messages.md 3.4 och fråga 4 | – |
| R-1028 | Armory visar en rad per förbrukningsvara med antal och pris för påfyllning, och Engineers skärm visar skeppets lager. | förslag | proposal-items.md 2.5 | – |

## Ljud och musik

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1029 | Ljudet skapas i webbläsaren utan ljudfiler. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1030 | N slår av och på allt ljud. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1031 | Varje spelare ställer nivån på ljudeffekter och musik var för sig under SOUND i menyn. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1032 | Ljudvalen sparas i webbläsaren. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1033 | Det senaste musikvalet gäller tills vidare. | byggd | HANDOFF beslut 2026-11-15; BACKLOG F-048 | saknas |
| R-1034 | Captain och Gunner hör ett varningsljud när en av deras delar blir kritisk. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1035 | Musiken är station i lugnt läge, smygande i lockdown och larm vid larm. | byggd | station-boarding.md §1 | saknas |
| R-1036 | Musiken under bordning delas i boarding för smygande och vrak, och alarm när larmet gått. | byggd | station-boarding.md §12 | saknas |
| R-1037 | Musiken skapas med kod och har lägen för startskärm, rymden, varning för fiender, fientlig attack, lootattack och vänliga stationer. | byggd | BACKLOG F-048 | saknas |
| R-1038 | Musiken byter från smyg till larm när stället har slagit larm, eller i ett vrak när en vakt är efter någon. | byggd | BACKLOG F-120 | saknas |
| R-1039 | Ett varningsljud spelas en gång när en del av skeppet blir kritisk. | byggd | BACKLOG F-176 | saknas |

## Övrigt

| Nr | Regel | Status | Källa | Test |
|---|---|---|---|---|
| R-1040 | Spelet heter Critical ST8. | byggd | HANDOFF beslut | saknas |
| R-1041 | Testläget startas med T på startskärmen eller med ?test sist i adressen. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1042 | Testläget ger alla uppgraderingar, all utrustning, alla stjärnkartor och 5000 krediter. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1043 | I testläget ligger en station av varje sida, ett vrak av varje skrov och två fraktcontainrar samlade nära startpunkten. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1044 | I testläget står piratstationen längre ut, utom räckhåll för sina kanoner. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1045 | Samlingen nära starten är en testfunktion som inte ska finnas i det vanliga spelet. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1046 | I testläget är allt utmärkt på kartan från början, med dimman lyft över området. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1047 | I testläget kommer inga pirater och inga piratanfall av sig själva. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1048 | I testläget kallas pirater in med 7 (tre Fighters), 8 (Gunboat och Fighter), 9 (anfall på en station) och 0 (ta bort alla pirater). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1049 | Sidan TEST i menyn kan också kalla in pirater, Cruisern och faktionernas trafik. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1050 | Faktionernas trafik är på i testläget tills vidare. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1051 | Omgången ska gå att spara. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1052 | Sparningar gjorda före den senaste ändringen av spelets tillstånd går inte att läsa in (texten säger SAVE_VERSION 5). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1053 | Vrak har egna former, en per skeppsklass som finns (Gunboat och fraktskepp, senare Juggernaut). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1054 | Stationer har färg, märken och påbyggnader per sida på dagens ringform. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1055 | Ljus görs inte som halvgenomskinliga färgytor, utan bilden multipliceras med en ljuskarta så att svärtan finns kvar. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1056 | Flimmer i ljuset hålls långsamt. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1057 | Testlägets uppställning ligger en bit från stjärnan, i ett system av största storleken. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1058 | Stjärnans ljus läggs över sakernas egen bild, och andra ljus än stjärnan har ingen riktning än. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1059 | Stjärnan har levande yta, krans av strålar, eldbågar och gnistor (förslag C). | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1060 | Styrraketerna längst ut på vingarna tänds vid sväng och back och lyser upp vingen. | byggd | HANDOFF beslut 2026-11-15 | saknas |
| R-1061 | Ett vrak med lägre risk är oftare ett litet skrov. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1062 | Ett vrak är skeppet det var, grått och trasigt, i samma skala. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1063 | Det finns en autosparfil vid dockning och fem manuella sparplatser. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1064 | Vid död laddas senaste sparfilen om. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1065 | Sparningar från en äldre version går inte att läsa in efter att spelets tillstånd har ändrat form. | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1066 | Det får aldrig gå att låsa sig, till exempel utan pengar eller bränsle. | byggd | HANDOFF beslut 2026-11-14; proposal-world.md "Aldrig låsa sig", BACKLOG D-100 | saknas |
| R-1067 | Freighter ser ut som en ryggrad med containrar (förslag A). | byggd | HANDOFF beslut 2026-11-14 | saknas |
| R-1068 | Hela spelet har en pixelstil, alltid uppifrån, med dämpade färger. | byggd | HANDOFF beslut | saknas |
| R-1069 | Stark färg används bara för ljus, skott och loot. | byggd | HANDOFF beslut | saknas |
| R-1070 | Hela skeppet vrids som en bild, och pixlarna ritas inte om i ett rutnät. | byggd | HANDOFF beslut | saknas |
| R-1071 | Med fps i adressen visas bildrutor i sekunden, och i testläget startar at=star, at=haze eller at=rocks spelet vid stjärnan, diset eller asteroidfältet. | byggd | BACKLOG F-204 | saknas |
| R-1072 | "Post" betyder spelarens plats på skeppet och "station" betyder rymdstation. | bestämd | HANDOFF beslut | – |
| R-1073 | Sparfilen ska gå att exportera och importera. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1074 | Stationer får egna former först med de stora baserna. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1075 | Ljus och skuggor för mer djup ska provas. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1076 | Spelet görs färdigt i 2D först, och ingen tid läggs på 3D nu. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1077 | Stjärnans ljus ska falla på skepp och asteroider från rätt håll. | bestämd | HANDOFF beslut 2026-11-15 | – |
| R-1078 | Mörkret ska ha mer kontrast så att detaljer syns. | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1079 | Juggernaut ser ut som ett kantigt ägg med smala änden fram, pansarplåtar och monterade kanontorn (förslag E). | bestämd | HANDOFF beslut 2026-11-14 | – |
| R-1080 | Spelet ska vara roligt att spela, inte ett ständigt underhåll. | bestämd | HANDOFF beslut 2026-11-16; proposal-bases.md §2 | – |
| R-1081 | Nya saker ska hellre förenkla spelet än lägga till. | bestämd | proposal-world.md "Riktningen" | – |
| R-1082 | Mekanik får lånas, men inga namn, texter, bilder eller berättelser hämtas från Escape Velocity eller Endless Sky. | bestämd | proposal-world.md "Lagar och regler" | – |
| R-1083 | Spelet görs färdigt i 2D först. | bestämd | BACKLOG D-146 | – |
| R-1084 | Saker som kräver att man håller koll mellan omgångar undviks. | förslag | proposal-bases.md §2 | – |
| R-1085 | Tidsbudget för minsta kartan: fristaden cirka 15 minuter, uppdrag cirka 15 minuter vardera och slutbasen 30 till 40 minuter. | förslag | proposal-bases.md §2 | – |
