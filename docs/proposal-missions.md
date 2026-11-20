# Uppdragsstrukturen (D-274)

Förslag 2026-11-17. Storyn är inte byggd i spelet. Generatorn och uppdragstestaren finns, så att storys kan läsas och bedömas innan något byggs. Reglerna står i regelboken under "Uppdrag och story" (R-1209 till R-1217).

Uppdragstestaren: [docs/design/prototypes/missions.html](design/prototypes/missions.html). Välj kartstorlek och frö. Testaren visar storyn som ett flöde, som berättelse, på stjärnkartan och som en sammanställning över hundra omgångar per kartstorlek. Den använder spelets egen kod och samma karta som spelet gör för samma frö.

## Bestämt (användaren 2026-11-17)

- Storyn ska vara engagerande, inte bara "åk dit och docka". Den kan till exempel handla om att prata med någon på en bas, köpa en sak som bara finns medan uppdraget pågår, skjuta ner en pirat eller ett gäng, eller loota ett bestämt vrak.
- Huvudstoryn har ett skelett i akter som fylls med genererade steg (US1).
- Antalet steg följer kartans storlek: 8 på den lilla, 12 på den mellersta och 16 på den stora (US1, US5).
- Ett eller två val delar storyn, och alla vägar leder till slutet (US2).
- Uppdragsloggen har huvudstoryn överst och sidouppdragen under, och målen markeras på kartorna (US3).
- Simulerade storys läses i testaren innan något byggs i spelet (US4).
- Testaren är en sida bredvid spelet som fungerar på iPad (US6).

## Stegen

Ett steg är en sak besättningen gör, på en plats, av ett skäl. Under utvecklingen sorteras stegen efter vad man gör:

| Sort | Vad | Behöver | Kan ge | Plats | Mest jobb för |
|---|---|---|---|---|---|
| Prata | Träffa en person på en bas | en person | en person, butik, vrak, signal, mål, sak eller valvet | baren på en bas | Captain |
| Skaffa | Köpa en sak som bara finns medan storyn pågår | en butik | en sak | butiken på en bas | Captain, Engineer |
| Leta | Leta i ett bestämt vrak | ett vrak | en sak, person, signal eller valvet | ett vrak | bordarna |
| Spana | Skanna ett system efter en signal | en signal | ett vrak, mål, person eller valvet | rymden | Engineer, Captain |
| Strida | Skjuta ner en namngiven pirat, ett gäng eller rivalen | ett mål | en sak, vrak, person eller valvet | rymden | Gunner, Captain |
| Borda | Slå ut ett skepp och borda det | ett mål | en sak, person eller valvet | ett skepp | Gunner, bordarna |
| Leverera | Lämna en sak till någon | en sak | en person, butik, signal eller ett mål | baren på en bas | Captain |
| Välja | Två sidor vill ha samma sak | en sak | en väg för varje val | baren på en bas | alla |
| Plundra | Ta stjärnkartan ur valvet | valvet | stjärnkartan | en piratbas | alla |

Det steget ger är en ledtråd som leder till nästa steg. Därför hänger storyn ihop: ett vrak man letar i har en logg som nämner en person, personen säljer en sak, och en annan sida vill ha saken.

## Skelettet

| Akt | Liten (8) | Mellan (12) | Stor (16) |
|---|---|---|---|
| Krok: kontakten i fristaden berättar vad det gäller | 1 | 1 | 1 |
| Utredning, med ett val | 3 | 5 | 5 |
| Vändning | 1 | 1 | 1 |
| Upptrappning, med ett val på de större kartorna | 2 | 4 | 4 |
| En vändning till | – | – | 1 |
| Upptrappning | – | – | 3 |
| Slut: plundra valvet och få kartan till slutet | 1 | 1 | 1 |

Stegen flyttar ut mot farligare system ju längre storyn har kommit, oftast ett eller två hopp från förra steget. Samma sorts steg kommer aldrig två gånger i rad. Slutets system används aldrig, eftersom det är stängt tills man har kartan (R-1098).

**Premissen.** Varje omgång får en av tre: den försvunna kryssaren, konvojen eller signalen. Premissen avgör vilka saker som finns och hur kontakten beskriver det hela.

**Personerna.** Kontakten (en person från en av faktionerna), rivalen (en annan besättning) och skurken (bossen i slutbasen) får genererade namn. Kontakten kommer tillbaka ibland, och rivalen dyker upp först när storyn har kommit en bit.

**Vändningarna:**

| Vändning | Vad händer |
|---|---|
| Kontakten är död | Personen man skulle träffa är död men har lämnat något efter sig |
| Förrådd | Kontakten har sålt besättningen till någon, som blir nästa mål |
| Saken är falsk | Saken man har med sig är falsk, och den riktiga har någon annan |
| Bakhåll | Rivalen anfaller vid dockan när saken är köpt |
| Vraket är ett bete | Pirater kommer fram när bordarna är inne i vraket |

**Valen.** Två sidor vill ha samma sak. Den som får den ger +10 i anseende och den andra -5 (förslag). Varje val leder till ett eget nästa steg, och sedan går vägarna ihop igen.

## Man fastnar aldrig

Varje sorts steg har en väg ut om något går fel (R-1214). Det följer de regler som redan är bestämda: ett mål som förstörs flyttas (R-928), och storyn kräver aldrig pengar (R-929).

- En person på en bas som är stängd för besättningen möter dem i fristaden i stället.
- En sak som ska köpas kostar aldrig mer än besättningen har. Utan krediter tar säljaren malm eller en tjänst.
- Ett vrak som storyn behöver kan inte sprängas, och det som ligger i det försvinner aldrig.
- En signal syns på systemkartan när besättningen är där, också utan köpta sensorer.
- Ett mål som flyr dyker upp igen i ett system bredvid.
- Om ett skepp sprängs i stället för att slås ut finns det man skulle hämta kvar i vraket.
- Stjärnkartan kan inte förstöras, och om besättningen förlorar ligger den kvar i valvet.

## Uppdragsloggen

- Den har en egen tangent och är gemensam för besättningen.
- Huvudstoryn står överst, med nuvarande steg, avklarade steg avbockade och de ledtrådar man har fått, så att man kan läsa om dem.
- Sidouppdragen står under, högst fem, med mål, lön, tidsgräns och faktion.
- Det valda uppdragets mål markeras på stjärnkartan och systemkartan.
- Skeppet säger till när ett steg är klart eller ändras, genom skeppets meddelanden.

## Översikten under utvecklingen

- Uppdragstestaren visar varje story som ett flöde av akter och steg, med vad varje steg behöver och ger, var det sker, hur farligt det är och vem som får jobb. Den visar också hela storyn som berättelse och vägen på stjärnkartan.
- Sammanställningen kör hundra omgångar per kartstorlek och visar tid, hopp, hur ofta varje sort och vändning kommer, vem som får jobb, och om någon story inte går att klara.
- Testerna kontrollerar varje gång att alla storys på alla kartstorlekar går att klara på alla vägar genom valen.

## Vad sammanställningen visar i dag

| | Liten | Mellan | Stor |
|---|---|---|---|
| Ungefärlig tid för huvudstoryn | 70 min | 99 min | 129 min |
| Hopp | 16 | 25 | 33 |
| Storys som inte går att klara | 0 av 100 | 0 av 100 | 0 av 100 |
| Captains del av jobbet | 44 % | 45 % | 48 % |
| Bordarnas del av jobbet | 15 % | 12 % | 12 % |

Tiden är bara stegen och hoppen, utan sidouppdrag och utan det man gör på vägen.

## Besked efter första läsningen (2026-11-17)

- Sidouppdragen byggs först som frakt, prisjakt och räddning (UP2). De väljs i baren på en bas, i ett gränssnitt som butikens (US9).
- En del av samtalen sker inne på basen, så att någon går dit till fots (US7).
- Smuggelgods kan upptäckas av en patrull. Engineer kan undvika det med ett minispel på tid: två rattar vrids tills skeppets våg ligger ovanpå skanningens (UP3).
- Storyn blev mest beskrivning och sedan "gör det här nu", inte så mycket berättande som användaren hade hoppats (US8). Förslaget till lösning är F-276:
  - **En dold sanning.** Varje omgång bestämmer i början vem som ligger bakom, varför och hur. Varje steg avslöjar en bit, och bitarna samlas som ledtrådar i loggen tills slutet visar hela bilden.
  - **Personer med egen röst.** Kontakten, rivalen och skurken har var sitt sätt att prata och var sitt eget mål. De talar i repliker och hör av sig över radion mellan stegen, till exempel kontakten som oroar sig eller skurken som hånar efter en vändning.
  - **Scener i stället för uppgifter.** Varje steg har en början (varför man är där), något som händer på plats (en logg, ett anrop, någon som dyker upp) och ett efteråt (vad det betyder). Själva uppgiften står bara i loggen.
  - **Följder.** Den sida man valde bort i ett val dyker upp igen senare, och personerna minns vad besättningen har gjort.
  - **Handskrivna texter.** Texterna skrivs för hand för varje premiss och akt, inte som gemensamma mallar för varje sorts steg. Först konvojen fullt ut i testaren, så att den kan bedömas innan de andra skrivs.

## Berättandet, prövat i testaren (F-276, 2026-11-17)

Besked: ja till en dold sanning (US10) och till personer med egen röst (US11). Texterna skrivs för hand som byggstenar (US12), så att omgångarna fortfarande varierar.

- **Den dolda sanningen.** I början bestäms vem som ligger bakom, hur och varför. Fyra steg berättar var sin del i ordning: hur, varför, en ledtråd om vem, och namnet. Delarna samlas som ledtrådar i loggen, och slutet berättar hela sanningen. Konvojen har fyra möjliga skyldiga, tre sätt och fyra skäl.
- **Rösterna.** Kontakten är orolig, butter eller torr. Skurken är kall eller hånfull, och rivalen kaxig eller trött. De hör av sig över radion: kontakten efter första steget, efter varje val och före slutet, skurken efter första vändningen och i slutet, rivalen första gången den dyker upp. En kontakt som dör eller förråder besättningen tystnar.
- **Scener.** Varje steg börjar med en scen, har sedan en ledtråd eller något om fallet, och slutar med var det leder. Uppgiften står bara i loggen.
- **Följder.** Kontakten säger vad den tycker om ett val. Den sida som valdes bort hör av sig, och på dess baser senare blir besättningen kyligt mottagen.
- **Variation.** Kedjan, kartan, personerna, rösterna och sanningen kombineras fritt. Varje text har två till tre varianter, och raderna om fallet upprepas aldrig i samma story.
- **Status.** Konvojen är fullt skriven. Kryssaren och signalen är utkast med en text av varje sort.

## Questmotorn (D-277)

Motorns kärna är skild från spelet och hämtar ingen annan kod. Den kedjar steg som behöver och ger, söker en kedja som håller, hanterar val och vändningar, fyller texter och kontrollerar att man aldrig fastnar. Handskrivna quester går igenom samma kontroller, så samma kärna kan bära både genererade och skrivna quester. Critical's egen del är stegens sorter, platserna, personerna och texterna. Kärnan flyttas till ett eget repo, som network-kit, när det andra spelet behöver den.

## Frågor innan storyn byggs i spelet (besvarade 2026-11-17)

- **US7 (ja):** Captain får nästan hälften av jobbet, eftersom det är Captain som pratar och lämnar saker. Ska samtalen ske inne på basen, så att någon går dit till fots? Rekommendation: ja, för en del av samtalen. Då får bordarna mer att göra, och baserna används till mer än handel.
- **US8 (se ovan):** Hur ska texterna låta? Rekommendation: läs några storys i testaren och säg vad som känns fel. Texterna är korta mallar med luckor, och fler varianter läggs till när tonen är bestämd.
- **US9 (se ovan):** Ska sidouppdragen också visas i testaren innan de byggs? Rekommendation: ja, när uppdragen (D-073) tas fram.

## Sidouppdragen (D-073, byggda 2026-11-20)

Besked SU1–SU5 (Kör B rek): frakt, prisjakt och räddning tas vid bordet JOBS i baren på en bas. Lön 300–1500 krediter efter avstånd och fara, hälften till med tidsgräns. Ett misslyckat uppdrag ger ingen lön och kostar lite anseende. Anseendet förbättras bara genom uppdrag, och en faktion med stängda baser ger ibland uppdrag på fria baser. Smugglingen (D-257) kommer i en egen körning. Reglerna är R-1251 till R-1255.
