# Världen: förslag i fyra steg

**Förslag, inte byggt.** Skrivet 2026-11-15 efter dina besked. Det ersätter det långa förslaget, som ligger kvar i [proposal-world-v1.md](proposal-world-v1.md).

Varje steg går att provspela innan nästa börjar. Under varje steg står vad du har bestämt, vad agenten föreslår och vilka frågor som behöver svar innan just det steget byggs. **Bara frågorna i steg 1 behöver svar nu.**

## Riktningen (bestämt)

- Spelet går ut på utforskning och äventyr som binder ihop systemen.
- En kort omgång i co-op tar ett par timmar, och man kan spela längre om man vill.
- Ingen handskriven fast story. Storyn genereras för varje omgång.
- Spelet upplevs redan som avancerat, så nya saker ska hellre förenkla än lägga till.
- Allt ska fungera för den som spelar ensam.
- Man får aldrig låsa sig, se sist på sidan.

## Steg 1 – Ett system som känns rätt

Byggs på dagens fem system, så att stjärnkartan inte behöver röras än.

**Bestämt**
- Systemen är runda som ett solsystem, med en stjärna i mitten och ett asteroidbälte (F-196).
- Asteroider finns i varje system. Aldrig runt baser, fler en bit bort, och större samlingar i vissa områden. De genereras och tar inte slut.
- Systemen är olika stora, och mindre än i dag.
- Skeppet krockar med asteroider, men inte med baser och skepp (F-200). Skepp och baser går att beskjuta som förut. Gunner skjuter bort asteroider som är i vägen, och det svårstyrda skeppet gör bältet till en utmaning.
- Kartan över ett system provas utan fog of war (F-199). Den visar stjärnan och det skeppet ser. En scanning visar allt i systemet som en engångsbild.

**Läget i dag**
- Allt i ett system läggs redan ut i en rund yta, upp till 2400 punkter från mitten. Det är kartan som är fyrkantig. Det finns ingen kant: man kan flyga hur långt ut som helst.
- Att korsa ett system tar ungefär 40 sekunder i full fart.
- Skeppet stöter emot stenar, vrak och stationer och tar skada i hög fart. Stenar stoppar skott men går inte att skjuta sönder.

**Agentens förslag**
- Stjärnan är något man flyger förbi. Bara det allra innersta är farligt.
- Baserna ligger stilla på olika avstånd från stjärnan. Inget rör sig i banor, så att kartan alltid stämmer.
- Utanför systemets kant finns inget, och kartan visar en rund gräns. Skeppet stoppas inte.
- De fem systemen får tre storlekar att prova: 1200, 1800 och 2400 punkter från mitten.
- Att skjuta sönder asteroider flyttas hit från steg 2, utan malm och bränsle än, så att bältet går att ta sig igenom från början.

**Frågor före bygget**
1. Ska stjärnan skada skeppet om man flyger för nära? Rekommendation: ja, men bara allra innerst, så att den är en plats och inte ett hinder.
2. Besvarad: asteroider går att krocka med. Ny fråga: ska vrak också gå att krocka med, som i dag? Rekommendation: nej, samma regel som för baser, så att bara asteroider är hinder.
3. Ska det synas var systemet tar slut, utan att skeppet stoppas? Rekommendation: ja.

## Steg 2 – Bränsle och färd

**Bestämt**
- Bränslet kommer inte tillbaka av sig självt. Man ska kunna få slut på både bränsle och pengar, och ändå komma vidare.
- Det man bryter ur asteroider ger bränsle och går att sälja på en bas (F-085).
- Solceller är en uppgradering som laddar bränslet (F-194).
- Speed boosten är samma sak som dagens överladdning av motorerna (F-197). Den laddas upp, fortare ju mer energi motorerna har, och nollställs om skeppet blir beskjutet innan den är klar.
- Samma regel gäller hoppet till ett annat system, så att man inte bara kan fly ur en strid. Uppgraderingar kortar tiderna.
- En scanning kostar bränsle.

**Läget i dag**
- Tanken rymmer 100 och ett hopp kostar 25. Med tom tank går skeppet på en femtedels kraft.
- Bränsle är gratis hos vänliga stationer.
- Hoppet laddas i 8 sekunder och bryts inte av beskjutning.

**Agentens förslag**
- Golvet för den som har slut på allt: skeppet kryper fram på en femtedels kraft som i dag, asteroider finns i varje system, och de bryts med de vanliga vapnen, som aldrig behöver ammunition.
- Boosten drar mer bränsle per sekund men lika mycket per sträcka. Den sparar tid, inte bränsle.
- Överladdningen av vapen och sköld tas bort (F-198).

**Frågor före bygget**
1. Ska överladdningen av vapen och sköld tas bort? Rekommendation: ja.
2. Räknas en träff på skölden som beskjutning? Rekommendation: ja. Varje träff nollställer, skott som missar gör det inte.
3. Ska bränsle fortfarande vara gratis hos vänliga stationer? Rekommendation: bara på den egna varvsstationen. Annars betyder bränslet inte så mycket.
4. Tar solcellerna en slot, och hur fort laddar de? Rekommendation: en slot, och ett hopps bränsle på ungefär fem minuter.

## Steg 3 – Många system

**Bestämt**
- Systemen genereras för varje omgång. Antalet väljs vid start och är fler än fem.
- Antalet system avgör hur många uppdrag det finns före slutet, och därmed hur lång omgången blir.
- Man upptäcker system själv genom att hoppa dit. Stjärnkartan visar närliggande system man inte har besökt som outforskade.
- Dolda system syns inte alls förrän storyn har lagt till dem.
- En sond skickas till ett närliggande system, ett steg bort, och visar vad som finns där.
- En boj håller sitt system uppdaterat, och det syns också på stjärnkartan.
- En systemradar som man köper visar om närliggande system är vänliga och vems de är (F-195).
- **Ankomst.** Vid hopp till ett utforskat system väljer Captain vilken bas skeppet ska anlända vid. Captain ser senast kända status på baserna, eller aktuell status om en boj ligger där. Utan val gäller en förvald bas: i första hand en känd vänlig, sedan en neutral, sist en fientlig. Man anländer en liten bit från basen, med nosen mot den och motorerna på svag effekt, så att skeppet glider dit. Vid hopp till ett system man inte vet något om slumpas ankomstplatsen, och då får man scanna eller utforska.
- Det går att hoppa tillbaka, och ett system är som det lämnades. Den egna varvsstationen anfalls aldrig.

**Agentens förslag**
- Stjärnkartan blir en bild med punkter och linjer, i stället för dagens lista.
- Hemsystemet är alltid av samma slag, och farligheten stiger med avståndet hemifrån.
- Alla hoppvägar går åt båda håll.
- Vid en fientlig bas anländer man utanför dess räckvidd. En slumpad ankomst hamnar aldrig i stjärnans farliga del eller intill en fientlig bas.
- Varje faktion har ett eget område av grannsystem.
- Namnen sätts ihop av egna ordlistor.

**Frågor före bygget**
1. Vilka antal system ska man få välja mellan? Rekommendation: bestäm det när steg 2 är provspelat. Då vet vi hur lång tid ett system tar, och det minsta valet ska ge ungefär två timmar.
2. Vad ger en karta som man köper eller hittar, nu när man kan upptäcka själv? Rekommendation: den visar en grupp system som om man hade varit där.
3. Ska ett hopp ut i det outforskade kosta mer? Rekommendation: nej. Risken är att man inte vet vad som väntar.

## Steg 4 – Uppdrag och story

**Bestämt**
- Slutet är ett anfall på en svår piratbas. Cruisern blir en del av ett mystiskt uppdrag.
- Storyn låser upp vägar till dolda system, med en karta från ett uppdrag eller från ett vrak eller skepp man bordar.
- Man får aldrig låsas av att man råkar förstöra ett skepp man skulle borda.
- Uppdrag fås på stationer, högst fem åt gången, i flera sorter. Vissa har tidsgräns och betalar mer.
- Ett misslyckat uppdrag kostar lönen och lite anseende.
- Anseende höjs genom uppdrag och inte av sig självt med tiden (F-118).

Detaljerna finns i det gamla förslaget, avsnitt 3 till 5. De är inte genomgångna efter den nya riktningen. Frågorna ställs när vi kommer hit.

## Aldrig låsa sig (gäller alla steg)

- Alla hoppvägar går åt båda håll, så vägen hem finns alltid.
- Med tom tank kryper skeppet, och asteroider att bryta finns i varje system.
- Grundvapnet behöver ingen ammunition, och Engineer lagar utan pengar.
- Den egna varvsstationen handlar alltid.
- Storyn kräver aldrig pengar, och ett mål som förstörs flyttas.
- Varje steg får automatiska tester som kontrollerar detta innan något publiceras.

## Lagar och regler

Agenten är ingen jurist. Idéer och spelmekanik, som ett nät av system, solceller och outforskade grannar, får lånas. Namn, texter, bilder och berättelser ska vara egna. Inget innehåll hämtas från Escape Velocity eller Endless Sky, enligt beslutet i HANDOFF.md. Orden Kestrel och Drifters ses över, se D-095.
