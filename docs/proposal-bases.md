# Standardbaser, fristaden och varvet

**Plan. Standardbasen (avsnitt 3, 4 om trycket, 8 och 9) är byggd 2026-11-16, se regelboken. Fristaden är byggd sedan tidigare. Varvet som köps, skeppet medan man bordar, anpassningen efter antal spelare och piraternas slutbas är inte byggda.** Skriven 2026-11-16 efter en lång genomgång med användaren i chatten. Det mesta här är besked från användaren och står som **Bestämt**. Det som är agentens förslag står som **Förslag**. Öppna frågor står sist.

Ett ja här är ett ja till designen, inte klartecken att bygga (se Arbetssätt i HANDOFF.md). Uppgifterna ligger i BACKLOG.md.

Designtester som hör till planen ligger i `docs/design/prototypes/`:
- `interior-ship.html`: ett fraktskepp inuti, med tunna väggar, figurer och ljussättning i tre lägen (normal, lockdown, vrak).
- `interior-station.html`: en handelsstation i tre våningar med dockor, planvy och genomskärning.
- `interior-pirate-base.html`: piraternas slutbas i en urholkad asteroid, genererad för varje frö, med boss, skydd, tunnor och utsidan i rymden.

Sidorna är designtester. De används inte av spelet, och koden i dem är inte tänkt att flyttas rakt in.

## 1. Vad som ändras jämfört med tidigare beslut

| Tidigare | Nu (bestämt 2026-11-16) |
|---|---|
| Besättningens egen varvsstation i första sektorn anfalls aldrig och ger gratis bränsle | Det finns inget eget varv i början. Spelet börjar i en fristad, se avsnitt 5. Inga anfall sker i fristaden |
| En övertagen station får shipyard | En övertagen bas får inget varv. Varvet är en permanent uppgradering som köps till basen, se avsnitt 7 |
| Små stationer får en våning och större två (D-072), stora baser 1,5 gånger större (F-103) | Tills vidare finns en vanlig bastyp, standardbasen med tre våningar, plus piraternas slutbas. Fler bastyper kan komma senare |
| Lägga ut medan någon är kvar inne: alla teleporteras hem (D-043) | Ingen flyttas tillbaka till skeppet av sig själv. Man går själv till luftslussen, se avsnitt 4 |

Övriga regler för anfall på egna baser gäller som förut (docs/station-boarding.md, avsnitt 14): varning med LOW, MEDIUM och HIGH, tid att hinna dit, högst ett anfall åt gången och halva försvaret kvar om basen faller.

## 2. Grundregler för allt här

**Bestämt.**
- Spelet ska vara roligt att spela, inte ett ständigt underhåll.
- Man ska kunna spela med en kompis i några timmar och klara en liten omgång. Det minsta valet av antal system ska ge ungefär två timmar (som i docs/proposal-world.md).
- Det ska fungera för en till tre spelare.

**Förslag.**
- Det man måste kunna för att nå slutet ska vara enkelt. Att ta över baser, köpa varv och bygga försvar är det man gör när man vill spela längre. På den minsta kartan ska slutet gå att nå utan att ta en enda bas.
- Saker som kräver att man håller koll mellan omgångar undviks. Ett förråd för delar valdes bort av den anledningen.
- Grov tidsbudget för den minsta kartan: start i fristaden cirka 15 minuter, några uppdrag på cirka 15 minuter vardera, slutbasen 30 till 40 minuter. Tar en standardbas med källare och översta våning mer än cirka 40 minuter behöver den kortas.

## 3. Standardbasen

**Bestämt.**
- Basen genereras för varje omgång, så att den blir ny varje gång.
- Föremål ska ha samma form inne som de har i rymden.
- Tre våningar med var sin stil:
  - **Mitten:** ljus, ren och städad. Här bor och umgås folk. Här kommer man in, och här finns det man gör lagligt: services, shipyard om basen har det, armory och bar. Det ska vara lätt att komma åt.
  - **Källaren:** smutsig industri med dockor och ett stort lastutrymme med vakter.
  - **Översta våningen:** kall kommandodel med mainframen. Här tas basen över.
- Entrén är en luftsluss där båda dörrarna aldrig kan vara öppna samtidigt. Den styrs med knappar.
- Att ta över basen kräver något i källaren först, och sedan mainframen på översta våningen. Det ska kräva en insats.
- Efter att man har gjort det i källaren går det inte på tid. I stället skärps läget steg för steg ju längre man dröjer.
- En blandning av öppna ytor och föremål att ta skydd bakom. Inga rum så små att striderna blir svåra. Några korridorer och rum där man måste välja väg, inte en rak väg till nästa steg.
- Bränsletunnor bara där de passar in, till exempel i last och verkstad, inte i bostäderna.
- Rum som fyller ut och gör att basen känns som en riktig plats.

**Förslag.**
- Det man gör i källaren är att slå ut strömmen. Nödkraften slår då på med svagare ljus och nödlampor, och dörrarna uppe går att forcera. Det kan göras tyst (smyga till ställverket) eller högljutt (spränga det), med olika följder för larmet.
- Två sorters skydd:
  - **Lågt skydd** (lådor, bänkar, räcken) stoppar skott men inte blickar. Man ser över det.
  - **Högt skydd** (pelare, skåp, maskiner) stoppar skott, blickar och ljus.
- Personaldelen (F-206) ligger i källaren och på översta våningen. Mitten är öppen för besökare.

## 4. Tryck, skeppet och anpassningen för små besättningar

### Tryck medan man är inne

**Bestämt.**
- Det ska finnas något som tvingar besättningen vidare även när vakterna är nedskjutna.
- Drönare kan fyllas på vid larm, och vakter kan komma med ett skepp som dockar.
- Förstärkningsskeppet anfaller inte ett dockat skepp som ingen sitter i. Sitter någon i skeppet kan det anfalla, och då finns det någon som kan försvara.

**Förslag.**
- Drönarna kommer från en drönarhangar som går att slå ut. Förstärkningen kommer med en nedräkning som syns. Ingenting dyker upp från ingenstans.
- Ett kommunikationsrum stoppar anropet om förstärkning om man hinner dit.
- Trycket ökar med hur farlig sektorn är.

### Skeppet medan man bordar

**Bestämt.**
- Datorn kan sköta skeppet, enligt de roller man valde vid start (docs/proposal-computer.md). Skeppet försvarar sig bara om datorn sköter Gunner eller om en spelare är kvar.
- Vapen som är riktade rakt fram kan inte skjuta medan skeppet ligger dockat, eftersom de skulle träffa basen. Den som vill försvara sig dockad behöver kanontorn, och de köps.
- Skeppet får lämna dockan och röra sig i systemet, men aldrig hoppa härifrån så länge någon är kvar inne i basen.
- Ingen flyttas tillbaka till skeppet av sig själv. Man går själv till luftslussen.
- När skrovet nästan är slut:
  - **En spelare är kvar i skeppet:** spelaren bestämmer själv om skeppet ska backa ut, och kör tillbaka.
  - **Ingen är kvar, men datorn sköter Captain:** skeppet backar ut till en säker plats och kommer tillbaka när någon kallar på det från luftslussen. Det är det enda undantaget från att datorn aldrig gör något stort på egen hand.
  - **Ingen är kvar och datorn sköter inte Captain:** skeppet ligger kvar och skyddas av basens dockningssköld.
- Flykten ut ur basen ska vara ett eget moment och inte gå att hoppa över.

### Vägen ut

**Bestämt:** det ska provas i ett designtest före bygge.

**Förslag.** Markeringar i golvet som visar snabbaste vägen till luftslussen, bara genom dörrar man har öppnat och platser man har varit på. Svagt vitgrönt sken som är starkast närmast, med en långsam våg mot utgången. Det ska se bra ut även när inget larm går.

### Anpassning efter antal spelare

**Bestämt:** det får inte bli för svårt för den som spelar ensam, så baserna anpassas.

**Förslag.** Anpassningen styrs av hur många människor som spelar, inte av vilka roller datorn sköter. Siffrorna sätts när man har provspelat en bas ensam.

| | 1 spelare | 2 spelare | 3 spelare |
|---|---|---|---|
| Vakter i basen | ungefär hälften | ungefär tre fjärdedelar | alla |
| Drönare som fylls på vid larm | långsamt | mellan | normalt |
| Tid tills förstärkningen dockar | dubbelt så lång | en och en halv gång | normal |
| Hur fort läget skärps efter källaren | långsamt | mellan | normalt |
| Bossens liv | lägre | mellan | fullt |

## 5. Fristaden och kartan

**Bestämt.**
- Startsystemet är en fristad, utan pirater och utan faktioner som bråkar. Där finns bara en neutral bas.
- Fristaden ligger i mitten av stjärnkartan eller nära mitten.
- Kartan får inte vara symmetrisk.
- Det ska inte finnas ett varv i startsystemet. Man ska behöva ge sig ut när man har skaffat pengar.
- Basen i fristaden kan inte tas över, och inga anfall sker i systemet. Den är alltid en trygg plats att komma tillbaka till.
- Man måste kunna bryta malm för att få pengar om de tar slut.

**Förslag.**
- Basen i fristaden har bara grunderna: sälja malm, billigt bränsle, lagning, de enklaste uppgraderingarna och enkla jobb. Bättre saker finns ute i andra system, och varje faktion säljer sina egna.
- Asteroiderna i fristaden räcker till att komma igång, men de större pengarna finns längre ut. Systemen närmast är lätta.
- Kartan: systemen sprids ut i klungor med tomrum emellan. Hoppvägarna går mellan närmaste grannar, med några långa genvägar, några återvändsgränder och några slingor. Faktionerna får var sitt område som en klump, inte jämna tårtbitar. Piraternas slutbas ligger långt ut, och dolda system ligger utanför de vanliga vägarna.

## 6. Startkanonen

**Bestämt.**
- Skeppet börjar med en enkel, fast kanon som skjuter rakt fram. Den sitter alltid kvar.
- Den går att uppgradera och är billig.
- Den kommer förmodligen mest att användas för att bryta malm, eftersom den är svårare att träffa med än kanontorn.
- Kanontorn är inte standard. De köps som uppgraderingar.

**Förslag.**
- Kanonen tar ingen plats. Captain siktar med skeppet och Gunner skjuter, så det kräver samspel från början.
- Uppgraderingar i några billiga steg: mer skada, långsammare uppvärmning och mer malm per asteroid.
- Heavy Laser skjuter också rakt fram och ska vara klart starkare än en fullt uppgraderad startkanon, annars finns ingen anledning att köpa den.

## 7. Varvet

**Bestämt.**
- En övertagen bas får inget varv. Varvet är en permanent uppgradering som köps till basen.
- Alla standardbaser kan köpa varv. Om fler bastyper kommer kan det begränsas till de större.
- Byter man bort en del på sitt eget varv får man tillbaka tre fjärdedelar av priset. På andra varv får man hälften.
- Inget förråd för delar. Det blir för avancerat.
- Försvaret köps i mainframen som i dag (sköld, kanontorn och inre säkerhet). Med fullt utbyggt försvar ska risken att basen tas över vara mycket låg.

**Förslag.**
- Varvet är dyrt, ett av de stora målen i mitten av en omgång.
- Ett eget varv ger gratis bränsle och gratis lagning.
- Utifrån syns varvet som en byggdocka utanpå basen, en öppen ram med kranar och strålkastare, och skeppet ligger i den när man dockar. Egna baser har besättningens färg (ockra) på ljusen.
- Inne finns ett varvsrum som en hangar med fönster mot dockan, arbetsbänkar, delar på hyllor och en mekaniker vid disken.
- Det personliga kommer av det man har gjort, inte av saker man köper: en karta på väggen med de baser man har tagit, troféer från bossar, skeppets namn på byggdockan och en brits per spelare.
- Försvaret syns: fler och större kanontorn och skölden som ett skimmer utanpå, och fler vakter, kameror och låsta dörrar inne.

## 8. Utsidan i rymden

**Avgjort 2026-11-16 efter designtestet D-217** (`docs/design/prototypes/standard-base.html`): kupoler, sluten skiva, en ring som vrids till bron, lampor som visar hållningen, ST8 på en egen bas, tio tornplatser och en stor kanon som köps. Det som gäller står i regelboken, R-1149 till R-1169. Texten nedan är underlaget.

**Bestämt.**
- Utsidan ska bli större än i dag, där den är liten och mer symbolisk. Den ska inte vara i skala 1:1, men den behöver växa.
- Den ska kännas som att den hänger ihop med hur basen är byggd med våningar.
- Den gamla designen behöver inte följas, men den måste passa in i världen.
- En designskiss av varvet och utsidan görs före bygge.

**Förslag.**
- Utsidan byggs av samma data som insidan, så att den alltid stämmer med den genererade basen.
- Ungefär tre gånger dagens storlek, så att fregatten ser liten ut bredvid men basen ändå får plats på skärmen när man närmar sig.
- Våningarna syns som terrasser uppifrån: källaren bredast ytterst, mitten ovanpå och den översta, minsta, överst.
- Varje våning har sin stil även utifrån: orange arbetsljus och lastdockor nere, ljusa fönster och dockningsringen i mitten, kallt blått ljus och antenner uppe.
- Saker sitter på samma plats ute som inne: dockor där luftslussarna är, fönster där rummen ligger, byggdockan utanför varvsrummet.

## 9. Dockningsringen

**Avgjort 2026-11-16:** fyra portar på diagonalerna, och ringen vrids ett kvarts varv åt gången till bron (R-1153, R-1154). Texten nedan är underlaget.

**Bestämt.**
- Problemet: tar man en annan dockningsarm når man inte sitt skepp.
- Idén: en ytterring runt basen som kan vridas, med ett fast nav. Ringen vrids i fasta lägen, en port i taget.
- Den behöver en demo med full design innan den byggs.

**Förslag.** Åtta portar i ringen, och lägen för vanlig drift, service och stängd. Detaljerna bestäms i demon.

## 10. Piraternas slutbas

**Bestämt.**
- Slutbasen är piraternas egen, i tre våningar, och genereras för varje omgång. Utsidan är en urholkad asteroid.
- Våningarna: smutsig industri med dock och last, ljust boende, kall kommandodel med mainframe.
- Ett stort lastutrymme med vakter finns kvar.
- Bossen är en pirat i en mech-dräkt, och bossrummet har mekanik som man använder för att besegra den.
- När bossen är besegrad tar man över basen. Den sprängs inte, och det finns ingen flykt på tid.
- Vad som händer när någon faller följer reglerna som redan finns.
- Slutbasen börjar i botten (användaren, 2026-11-16): man kommer in vid dockorna i industrivåningen och arbetar sig uppåt, till skillnad från standardbasen där man kommer in i mitten.
- En skattkammare och bränsletunnor finns med.

**Förslag** (visat i `interior-pirate-base.html`, inte provspelat):
- Tre pyloner håller uppe bossens sköld och måste slås ut.
- Faser vid 60 och 25 procent liv. Bossens svep visas i förväg som en röd linje på golvet. I sista fasen kommer drönare.
- Tunnor som exploderar och kan sätta igång varandra.

## 11. Ljussättning inomhus (från designtesterna)

**Förslag**, visat i designtesterna och inte beslutat:
- Bilden multipliceras med en ljuskarta i halv upplösning, självlysande saker läggs ovanpå och ett mjukt sken (bloom) runt de starkaste.
- Väggar, stängda dörrar och höga föremål kastar skugga.
- Rött används bara för fiender och fara. Blinkande ljus blinkar långsammare än två gånger i sekunden.
- Tunna väggar i kanten mellan rutor i stället för hela rutor av vägg.

Spelet gör i dag ljussättning med en ljuskarta bara på mörka ställen (vrak och lockdown), i `src/render/light.js`.

## 12. Öppna frågor

1. Hur tar sig den som spelar ensam tillbaka på fötter när hen faller i en bas? Förslag: en medkit eller en nödsändare som för en tillbaka till slussen. Behöver stämmas av mot reglerna för när någon faller.
2. ~~Ska det man gör i källaren kunna göras både tyst och högljutt, och vad skiljer i så fall?~~ Avgjort 2026-11-16: ja, se R-1167 i regelboken.
3. ~~Exakt vilka steg skärper läget efter källaren, och hur fort?~~ Avgjort 2026-11-16: stegen står i R-1168, och takten sätts vid provspel.
4. Vad kostar ett varv, och vad kostar startkanonens uppgraderingar?
5. Siffrorna för anpassningen efter antal spelare (sätts vid provspel).
6. Datorns undantag i avsnitt 4 bygger på docs/proposal-computer.md, som inte är godkänt än. Det behöver hänga med när det förslaget besvaras.
7. Regeln om att aldrig fastna (D-100) håller utan eget varv i början: skeppet gör redan bränsle av malm när tanken inte räcker till ett hopp, och solceller fyller på. Det som ändras är att gratis bränsle hemma försvinner tills man har köpt ett varv, och att testet för D-100 inte kan räkna med det.
