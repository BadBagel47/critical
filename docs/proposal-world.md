# Värld, röd tråd och uppdrag: samlat förslag (D-089, D-052, D-073, F-118, D-100)

**Förslag, inte godkänt.** Inget av det är byggt. Skrivet 2026-11-15. Det samlar fem punkter som hör ihop: genererade system (D-089), en röd tråd (D-052), uppdrag (D-073), anseende genom uppdrag (F-118) och att spelet aldrig får låsa sig (D-100).

Det som är märkt **Bestämt** kommer från dig och står i HANDOFF.md eller BACKLOG.md. Det som är märkt **Förslag** är agentens. Alla siffror är startvärden att provspela med. Text som syns i spelet är på engelska och skrivs här som den skulle stå på skärmen.

## Besked 2026-11-15 som ändrar förslaget

Du har läst förslaget och gett en ny riktning. Resten av texten är inte omskriven än, så där den säger emot det här gäller det här.

- **Vad spelet går ut på.** Utforskning och äventyr som binder ihop systemen. Det gör också uppgraderingarna intressantare.
- **Slutet.** Ett anfall på en svår piratbas, inte The Maw med Cruisern. Cruisern kan i stället bli en del av ett mystiskt uppdrag där man inte riktigt vet vad det är. Det avgör fråga 4.
- **Kartan.** Mer som i Escape Velocity: många system, men inte fullt så stora, och i olika storlekar så att de känns fräscha. Hoppen med bränsle blir viktiga. Storlekarna 6, 10 och 16 i avsnitt 2 är för få och görs om. Fråga 1 och 2 ställs om på nytt.
- **Runda system.** Systemen ska vara cirkulära, som ett solsystem uppfattas, inte fyrkantiga (F-196).
- **Bränsle och pengar.** Man ska kunna få slut på båda, och bränslet ska inte komma tillbaka av sig självt, men man ska ändå komma vidare. Reservtanken (avsnitt 6, regel 1) stryks, och det avgör fråga 10. Vägarna ut är asteroider som ger resurser som fyller på bränsle (F-085) och solceller som man köper och som laddar bränslet (F-194). Du tror mest på solcellerna. Det man bryter ur asteroider kan också säljas på en bas, så brytningen ger både bränsle och pengar.
- **Systemradar.** En uppgradering som visar om närliggande system är vänliga och vilken faktion de tillhör. Den scannar grannsystemen av sig själv, och statusen uppdateras när man kommer inom räckvidd (F-195).

Öppet efter beskeden:
- Hur många system, ungefär, och om storleken fortfarande väljs vid start.
- Vad som är golvet för den som har slut på både bränsle och pengar och inte har köpt solceller: räcker asteroiderna, och finns de i varje system?
- Om det mystiska uppdraget med Cruisern är en del av den röda tråden eller ett sidospår.

## Sammanfattning

- Varje nytt spel får en egen karta: 6, 10 eller 16 system i ett nät av hoppvägar, med egna namn, ägare och faror. Storleken väljs på startskärmen.
- Varje nytt spel får en egen röd tråd: en öppning, två till fyra kapitel som dras ur en samling byggstenar, och ett slutmål som också dras.
- Stationerna får en fjärde disk med uppdrag. Nio sorter beskrivs, och sju av dem går att bygga på det som redan finns.
- Anseende ändras bara av det besättningen gör. Förlåtelsen med tiden tas bort när uppdragen kommer och ersätts av gottgörelseuppdrag som alltid går att få.
- Tre golv gör att spelet aldrig låser sig: en reservtank som fyller sig själv upp till ett hopp, ett betalt jobb som alltid finns på den egna varvsstationen, och en röd tråd som aldrig kräver pengar.
- Automatiska tester gör hundratals kartor och kontrollerar reglerna innan något publiceras.
- Under läsningen hittades ett fel i dagens spel: den som lämnar sista sektorn och kommer tillbaka möter ingen Cruiser, och då går spelet inte att vinna. Se avsnitt 1.

## 1. Så fungerar det i dag

Allt här är läst ur spelets kod, och två saker är dessutom provkörda i spellogiken (märkta så). Inget är provat av en människa i webbläsaren.

**Kartan**
- Fem sektorer med fasta namn: Kestrel Drift, Ash Belt, Hollow Reach, The Narrows och The Maw. De hänger ihop likadant varje gång: från den första når man två, båda leder till den fjärde, och därifrån går enda vägen till den sista.
- Tio stationer, alltid samma, med samma namn och ägare: en egen varvsstation, en fri station, en per faktion och fem piratstationer.
- Det enda som skiljer två spel åt är var saker ligger inne i varje sektor: stationer, vrak (tre per sektor, fem i Hollow Reach), tre pods och ett fyrtiotal stenar.
- En sektor skapas första gången besättningen kommer dit. Lämnar man den sparas stationer, vrak och karta som de var. Skepp sparas inte.
- Varje nytt spel får ett nummer från klockan. Samma nummer ger exakt samma spel, och testerna bygger på det.

**Stjärnkartor och hopp**
- Man börjar med kartan till första sektorn. Varje station som handlar säljer en karta till en grannsektor: 100 krediter hos vänliga, 150 hos neutrala.
- Valvet i en station har alltid en karta som saknas. Valvet i ett vrak har det i ungefär ett fall av tre. En karta man redan har ger 60 krediter.
- Provkört: ingen station säljer kartan till The Maw. Stationen i The Narrows säljer kartan tillbaka till Ash Belt. Kartan till The Maw finns alltså bara i valv.
- Ett hopp kostar 25 bränsle och laddas i 8 sekunder. Med uppgraderingen Jump Coils kostar det 15 och tar 4.

**Bränsle och pengar**
- Tanken rymmer 100 och man börjar med 60. Full gas drar 0,2 i sekunden vid normal energi till motorerna, så en full tank räcker drygt åtta minuter. Med tom tank går skeppet på en femtedels kraft.
- Bränsle är gratis hos vänliga stationer, också den egna. Hos neutrala kostar det 1 kredit per enhet, hos avvaktande 1,5. Räcker pengarna inte fylls tanken så långt de räcker.
- En bränslecell ur ett vrak ger 25. En pod ger 25 i hälften av fallen.
- Man börjar med 0 krediter. Inkomster: Fighter 5, Gunboat 25, Cruiser 500, lådor i vrak 30 till 70, lådor i valv 90 till 160, en pod 60 till 140, och 100 för ett besvarat nödanrop hos en vänlig station. Ett lätt vrak ger ungefär 400 krediter om allt bärs ut.
- Engineer lagar skrov och system utan kostnad, bara det får ta tid.

**Anseende**
- Från -100 till 100, start på 0. Gränserna står i HANDOFF.md och stämmer med koden.
- Det stiger av sig självt med 3 per minut upp till -30, som är avvaktande. Det är den förlåtelse som F-118 (anseende genom uppdrag) ska ta bort.

**Uppdrag, varor och berättelse**
- Det finns inga uppdrag och inga varor. Det enda målet är att förstöra Cruisern i The Maw.

**Kan man låsa sig i dag?**
- Ingen regel och inget test vaktar det. Det enda skyddet är att den egna varvsstationen aldrig anfalls, så att det alltid finns gratis bränsle i första sektorn.
- Provkört: Cruisern placeras bara första gången The Maw skapas. Hoppar man ut och kommer tillbaka finns den inte kvar, och då går spelet inte att vinna. Det är ett fel som bör få ett eget nummer i backloggen.
- Inte provat, bara läst: den som står i en annan sektor med mindre än 25 bränsle och utan pengar får leta bränsleceller eller skjuta pirater och köpa bränsle. Har sektorns enda handelsstation fallit och vraken är tömda ser jag ingen säker väg ut utom att ta över en piratstation. Om det händer i praktiken vet jag inte.

## 2. Genererade system och kartans storlek (D-089)

**Bestämt.** Systemen genereras för varje omgång. Man väljer vid start hur stor kartan ska vara, och innehållet anpassas efter det. System nås med stjärnkartor som hittas eller köps, och hopp kostar bränsle. Tills vidare går det att hoppa tillbaka, och systemet är som det lämnades. Den egna varvsstationen anfalls aldrig.

Backloggens rad utgår från idén om fler och mindre system i ett nät av hoppvägar. Den idén är inte uttryckligen bestämd, och ingår därför i förslaget nedan.

Ordet "system" här är samma sak som dagens "sektor".

**Förslag: tre storlekar.** Startskärmen får ett val, `MAP SIZE`, med tre lägen.

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| System | 6 | 10 | 16 |
| Egen varvsstation | 1 | 1 | 1 |
| Stationer per faktion | 2 | 3 | 5 |
| Fria stationer | 2 | 3 | 4 |
| Piratstationer | 4 | 6 | 10 |
| Stationer totalt | 13 | 19 | 30 |
| Kapitel i röda tråden, utöver öppning och slut | 2 | 3 | 4 |

Dagens spel har 5 system och 10 stationer. Hur lång tid en omgång tar i dag vet jag inte, så speltiden per storlek får mätas vid provspel.

**Förslag: så byggs kartan.**
1. Hemsystemet görs först och är alltid av samma slag: den egna varvsstationen, en fri station och lätta vrak. De första minuterna lär ut spelet och ska inte bero på tur.
2. Övriga system läggs i lager efter hur många hopp hemifrån de ligger. Farligheten stiger med avståndet, i samma fyra nivåer som i dag.
3. Varje system får två till fyra hoppvägar, och alla vägar går åt båda håll. Det finns alltid minst två helt skilda vägar från hemsystemet fram till systemet före slutmålet. Slutmålet har en enda väg in, som The Maw i dag.
4. Varje faktion får ett hemområde av grannsystem där den äger de flesta stationerna, och alltid minst ett varv. Piraterna äger mer ju längre ut man kommer.
5. Ungefär vart tredje system är stort som i dag, med två eller tre stationer. De andra är mindre: en station eller ingen, ett eller två vrak, och allt ligger inom 1500 punkter från mitten i stället för 2400. Det ger kortare flygningar och gör att fler system inte betyder mer transportsträcka.
6. Namnen sätts ihop av två egna ordlistor, i samma stil som dagens (ett ord och en sorts plats). Stationer får systemets ord och sin sort, till exempel Yard, Depot, Market eller Dock.

**Förslag: stommen bestäms vid start.** Vilka system som finns, hur de hänger ihop, vem som äger varje station och vad allt heter bestäms när spelet startar. Insidan av ett system görs som i dag första gången man kommer dit. Stommen behövs för att uppdrag och den röda tråden ska kunna peka på platser man inte har besökt.

**Förslag: stjärnkartan blir en bild.** I dag är hoppmålen en lista. Med ett nät behövs en bild med punkter och linjer. System man har karta till visas med namn. Grannar man saknar karta till visas som `UNCHARTED`. Bilden ska fungera med mus, handkontroll och finger.

**Exempel: en MEDIUM-karta.** Namnen är påhittade för exemplet.

| System | Hopp hemifrån | Farlighet | Stationer | Hoppvägar till |
|---|---|---|---|---|
| LANTERN REST (hem) | 0 | 0 | Egen varvsstation, en fri | Tinder Row, Pale Shelf |
| TINDER ROW | 1 | 1 | Drifters, en fri | Hem, Salt Meridian, Cold Anvil |
| PALE SHELF | 1 | 1 | Charter | Hem, Cold Anvil, Mercer Step |
| SALT MERIDIAN | 2 | 1 | Drifters, pirat | Tinder Row, Blue Assize |
| COLD ANVIL | 2 | 2 | En fri, pirat | Tinder Row, Pale Shelf, Blue Assize, Hollow Tally |
| MERCER STEP (stort) | 2 | 1 | Charter, Charter | Pale Shelf, Hollow Tally |
| BLUE ASSIZE (stort) | 3 | 2 | Wardens, Wardens, Drifters | Salt Meridian, Cold Anvil, The Sieve |
| HOLLOW TALLY | 3 | 2 | Wardens, pirat | Cold Anvil, Mercer Step, The Sieve |
| THE SIEVE | 4 | 3 | Pirat, pirat | Blue Assize, Hollow Tally, Nine Fathoms |
| NINE FATHOMS (slutmål) | 5 | 3 | Pirat | The Sieve |

Två skilda vägar till The Sieve: över Tinder Row, Salt Meridian och Blue Assize, eller över Pale Shelf, Mercer Step och Hollow Tally.

**Ensam.** Inget i kartan beror på hur många som spelar. Storleken väljer speltid, inte svårighet. Piratvågorna är redan glesare för en ensam spelare.

**Kostnad: stor.** Det är den största delen i förslaget. Kartan, stjärnkartans bild, namnen och startskärmens val är nytt, och mycket som i dag utgår från fem fasta sektorer måste följa med (se avsnitt 7).

## 3. Den röda tråden (D-052)

**Bestämt.** Både berättelse och öppen värld. En röd tråd genereras när ett nytt spel startar, med frivilliga sidouppdrag, så att varje omgång känns ny. Ingen färdigskriven story från början till slut. Tråden får inte innehålla onödigt svåra moment som låser spelet. Inget moment pausar spelet.

**Förslag: tråden sätts ihop av byggstenar.** Vid start dras ett slutmål, och sedan två till fyra kapitel utan upprepning. Varje byggsten placeras i ett system på vägen mot slutmålet och knyts till en faktion som också dras. Texten är korta mallar där spelet fyller i platser och namn.

| Del | Vad som dras | Bygger på |
|---|---|---|
| Öppning (alltid) | Ett meddelande på den egna varvsstationen som ger första ledtråden och lär ut uppdragslistan | Uppdrag, avsnitt 4 |
| FIND THE TRAIL | Borda ett utpekat vrak och bär hem en färdskrivare ur valvet | Dagens vrak |
| WIN AN ALLY | Gör ett namngivet uppdrag åt en dragen faktion. Den ger kartan vidare | Uppdrag, avsnitt 4 |
| BREAK THE OUTPOST | Ta över en utpekad piratstation som vaktar vägen | Dagens övertagande |
| HOLD THE LINE | Försvara en utpekad station, som anfalls när besättningen kommer fram | Dagens nödanrop |
| THE COURIER | Bär något från en station till en annan medan piraterna jagar hårdare än vanligt | Uppdrag, avsnitt 4 |
| HUNT THE LIEUTENANT | Skjut ner en namngiven Gunboat med följe | Dagens Gunboat, rikare med F-086 (namngivna unika skepp) |
| Slut A: THE CRUISER | Förstör piraternas Cruiser i det yttersta systemet | Finns i dag |
| Slut B: THE STRONGHOLD | Ta över piraternas huvudstation i det yttersta systemet | Dagens övertagande, senare F-109 (mainframen) |

Fler slut kan läggas till när deras delar finns: ett krig att avgöra med F-119 (krig mellan faktioner) och en Juggernaut som slutstrid med F-070 (skeppstypen Juggernaut).

**Förslag: regler som håller tråden ofarlig.**
- Ett kapitel kan aldrig misslyckas, bara dröja. Det har ingen tidsgräns.
- Försvinner målet flyttas det. Sprängs vraket hamnar färdskrivaren i ett nytt vrak. Faller stationen till piraterna ligger saken i dess valv.
- Varje avklarat kapitel ger kartan till nästa plats utan kostnad. Tråden kräver aldrig pengar.
- Nästa steg kommer som ett meddelande till skeppet och går alltid att hämta på den egna varvsstationen. Ingen stängd station kan stå i vägen.
- Tråden kräver aldrig ett visst anseende. WIN AN ALLY ber om ett uppdrag, inte om en nivå. Är faktionen fientlig ges uppdraget på den egna varvsstationen.
- Slutmålet finns kvar som det lämnades om besättningen drar sig ur och kommer tillbaka. Det följer av beslutet om att system är som de lämnades, och rättar felet i avsnitt 1.
- Efter slutet är spelet vunnet och det går att flyga vidare, som i dag.

**Förslag: så visas tråden.** Överst i uppdragslistan, på en egen rad märkt `STORY`. Nya steg kommer som ett kort meddelande. Inga filmer och inga rutor som stoppar spelet.

**Exempel på MEDIUM-kartan ovan.** Slutet blir THE CRUISER i Nine Fathoms, med tre kapitel.
1. Öppning: `A FREIGHTER WENT SILENT IN SALT MERIDIAN. FIND THE WRECK. BRING BACK ITS FLIGHT LOG.`
2. FIND THE TRAIL i Salt Meridian. Belöning: kartan till Blue Assize.
3. WIN AN ALLY hos Wardens: `THE WARDENS KNOW WHERE THE RAIDERS GATHER. DO ONE JOB FOR THEM.` Belöning: kartan till The Sieve.
4. BREAK THE OUTPOST i The Sieve. Kartan till Nine Fathoms ligger i piratstationens valv.
5. Slut: Cruisern väntar i Nine Fathoms.

**Hur nytt blir det?** Med sex byggstenar och två slut har en spelare sett alla delar efter två eller tre omgångar, men i annan ordning, på andra platser och med andra faktioner. Fler byggstenar ger mer variation, och de kan läggas till en i taget.

**Ensam.** Varje byggsten använder sådant en ensam spelare redan gör i dag: borda ett vrak, slåss, docka, ta över en station.

**Kostnad: medel.** Stommen med öppning, fyra byggstenar och två slut är medel. Varje ny byggsten därefter är liten. Texterna är få, men tonen i dem behöver ditt godkännande.

## 4. Uppdrag (D-073)

**Bestämt.**
- Uppdrag fås på stationer man kan besöka, genom att prata med folk.
- Alla sorter: frakt, passagerare, prisjakt, eskort och räddning.
- Högst fem samtidigt, för stunden.
- Vissa har tidsgräns och betalar mer.
- Ett misslyckat uppdrag kostar lönen och lite anseende hos stationens faktion, eller hos just den stationen om den är fri.
- Uppdrag kan tillhöra en faktion. På en faktions station finns flest uppdrag för den faktionen, ibland från andra. Fria stationer har mer blandat.
- Ett uppdrag kan ge plus hos en faktion och minus hos en annan.

**Förslag: var uppdragen finns.** En fjärde disk, `CONTRACTS`, bredvid Services, Shipyard och Armory. Där står en person, och F öppnar listan. Baren med uppdrag som har mer berättelse kommer med D-072 (två våningar på baser). Disken visar tre till sex erbjudanden. De byts när besättningen har varit i ett annat system, eller efter tio minuter.

**Förslag: vem som erbjuder vad.**

| Station | Uppdrag för stationens egen sida | För andra faktioner | För fria stationer |
|---|---|---|---|
| En faktions station | 7 av 10 | 2 av 10 | 1 av 10 |
| Fri station | 3 av 10 | 6 av 10, jämnt fördelat | 1 av 10 |
| Besättningens egna stationer | Inga egna | Minst ett per faktion, alltid | Resten |
| Piratstation | Inga | Inga | Inga |

**Förslag: sorterna.**

| Sort | Ges av | Spelaren gör | Lön | Anseende | Misslyckande | Bygger på |
|---|---|---|---|---|---|---|
| CARGO (frakt) | Alla som handlar, mest Charter | Tar last på stationen och lämnar den på en namngiven station | 100 + 50 per hopp | +5 hos givaren | Tiden går ut eller uppdraget överges: ingen lön, -3 | Går att bygga nu. Delar lastrum med varor när F-068 (handel med varor) finns |
| PASSENGER (passagerare) | Alla som handlar | Kör en person till en namngiven station. Har oftare tidsgräns | 80 + 50 per hopp | +4 | Samma: ingen lön, -3 | Går att bygga nu |
| BOUNTY (prisjakt) | Mest Wardens, även fria | Skjuter ner ett namngivet piratskepp med följe i ett utpekat system | 200 till 350 | +8 | Bara om det överges eller har tidsgräns: ingen lön, -3 | Dagens Gunboat. Rikare med F-086 (namngivna unika skepp) |
| RESCUE (räddning) | Alla som handlar | Flyger till en station som anfalls när besättningen kommer fram, och slår tillbaka anfallet | 150 | +15 hos stationens sida | Stationen faller: ingen lön, -5 | Dagens nödanrop. Senare även F-083 (skepp i nöd) |
| ESCORT (eskort) | Mest Charter | Skyddar ett fraktskepp från att det lägger ut tills det hoppar ut ur systemet | 150 till 250 | +8 | Fraktskeppet förstörs: ingen lön, -5 | Dagens fraktskepp. Första versionen inom ett system, eftersom skepp inte följer med mellan system i dag |
| RETRIEVE (hämtning) | Mest Drifters | Bordar ett utpekat vrak och bär hem en namngiven sak | 150 till 250 | +6 | Vraket sprängs med saken kvar: ingen lön, -3 | Dagens vrak. Finns inte i din lista, se fråga 6 |
| STRIKE (anfall) | Mest Wardens | Tar över en namngiven piratstation | 300 till 400 | +12 | Ingen tidsgräns. Bara om det överges: ingen lön, -3 | Dagens övertagande. Finns inte i din lista, se fråga 6 |
| SMUGGLE (smuggling) | Drifters och fria | Fraktar förbjuden last förbi patruller | Högre än frakt | Plus hos givaren, minus hos Wardens om lasten upptäcks | Inte utrett | D-074 (smuggelgods), som inte är utrett. Inte i första versionen |
| WAR (krigsuppdrag) | De två faktioner som är i krig | Någon av sorterna ovan, riktad mot den andra sidan | Högre | Plus hos givaren, större minus hos motståndaren | Som sorten | F-119 (krig mellan faktioner). Inte i första versionen |

Prisjakt här betyder att besättningen jagar pirater mot betalning. Det är inte samma sak som de bounty hunters som jagar besättningen, och de kommer fortfarande bara från stationer utan faktion.

Eskort här betyder att besättningen skyddar någon annan. Eskortskepp som besättningen hyr är en annan punkt: D-071 (eskortskepp mot lön).

**Förslag: regler.**
- **Tidsgräns.** Vissa erbjudanden finns i en `RUSH`-variant: samma uppdrag med tidsgräns och hälften mer i lön. Tiden är 3 minuter per hopp plus 2 minuter. Den räknas i spelets tid. Den går alltså medan menyn är öppen, och står still när någon pausar.
- **Plus och minus.** Det som ändras i anseende står alltid på erbjudandet innan man tackar ja. Ungefär vart femte vanligt uppdrag sänker anseendet hos en annan sida med 3 till 5. Krigsuppdrag och smuggling gör det alltid.
- **Fem åt gången.** Listan delas av hela besättningen och öppnas från kartan (M). Varje uppdrag får ett märke på kartan. Den röda tråden räknas inte in i de fem.
- **Överge.** Ett uppdrag kan överges när som helst. Det räknas som misslyckat.
- **Misslyckande.** Ingen lön, och -3 till -5 i anseende. Aldrig böter och aldrig förskott som ska betalas tillbaka. Enbart misslyckade uppdrag kan inte sänka ett anseende under avvaktande.
- **Hos vem anseendet sjunker.** Det som är bestämt säger stationens faktion. Sedan kom tillägget att ett uppdrag kan tillhöra en annan faktion än stationens. Förslag: anseendet sjunker hos den som uppdraget tillhör. I sju fall av tio är det samma sida. Se fråga 8.
- **Inget fel.** Faller målstationen till pirater medan besättningen är på väg stryks uppdraget utan kostnad: `CONTRACT CANCELLED  ·  NO FAULT`.
- **Bara dit man kan ta sig.** Ett uppdrag erbjuds bara till system som besättningen har karta till, eller så ingår kartan i lönen.

Lönerna ska vägas mot att ett lätt vrak i dag ger ungefär 400 krediter. Det görs i D-104 (översikten över ekonomin).

**Exempel.** Besättningen går ombord på Charter-stationen i Pale Shelf, med anseende 0 hos alla. Disken visar:

```
CARGO      THE CHARTER   TO MERCER STEP    1 JUMP    150 CR   +5 CHARTER
  RUSH  5 MIN                                        225 CR
PASSENGER  THE CHARTER   TO TINDER ROW     2 JUMPS   180 CR   +4 CHARTER
ESCORT     THE CHARTER   HERE                        200 CR   +8 CHARTER
BOUNTY     THE WARDENS   IN COLD ANVIL     1 JUMP    250 CR   +8 WARDENS
RETRIEVE   THE DRIFTERS  IN COLD ANVIL     1 JUMP    180 CR   +6 DRIFTERS  -3 WARDENS
```

De tar frakten som RUSH, prisjakten och hämtningen. Frakten kommer fram på fyra minuter: 225 krediter och 5 hos Charter. Prisjakten lyckas: 250 krediter och 8 hos Wardens. Vraket i Cold Anvil sprängs innan saken är ute: ingen lön och -3 hos Drifters, som uppdraget tillhörde. De -3 hos Wardens uteblir eftersom uppdraget inte blev gjort. Summa: 475 krediter, Charter 5, Wardens 8, Drifters -3.

**Ensam.** Ingen sort kräver mer än en spelare. Tidsgränser blir längre för mindre besättning, på samma sätt som piratvågorna redan är glesare: gånger 1,25 ensam och 1,1 för två.

**Kostnad: medel.** Disken, listan, märkena på kartan och de fyra första sorterna (frakt, passagerare, prisjakt, räddning) är medel tillsammans. Hämtning och anfall är små var för sig. Eskort är medel, eftersom fraktskeppet måste gå att följa och skydda.

## 5. Anseende genom uppdrag (F-118)

**Bestämt.**
- Anseende ska inte förlåtas med tiden. Man ska få jobba för det, främst genom uppdrag.
- Förlåtelsen som är byggd i dag tas bort först när uppdragen finns.
- Det ska alltid gå att höja ett lågt anseende, också när faktionens stationer är stängda, till exempel genom uppdrag för den som erbjuds på andras stationer.
- Så länge besättningen håller en faktions station kan anseendet hos den faktionen som bäst bli "stängd".

**Förslag.**
- Förlåtelsen stängs av i samma steg som de första uppdragen byggs, inte före.
- Anseende rör sig aldrig av sig självt, åt något håll.
- Det som redan höjer anseendet finns kvar: 0,5 hos alla för varje nedskjuten pirat och 20 för en räddad station.
- **Gottgörelse.** För varje sida som besättningen är stängd eller fientlig hos finns alltid ett uppdrag märkt `MAKE AMENDS`. Det erbjuds på den egna varvsstationen och på fria stationer. Det betalar lite eller inget och ger 12 i anseende. Uppdraget är en av de vanliga sorterna, oftast prisjakt eller hämtning.
- Också en fri station som har stängt om sig får ett sådant uppdrag, och det erbjuds på den egna varvsstationen.
- Det går inte att betala sig till bättre anseende. Det skulle gå emot att man ska jobba för det.
- Håller besättningen en faktions station står det på erbjudandet att anseendet inte kan gå över stängd: `STANDING CAPPED WHILE YOU HOLD IRON GATE`.

| Sätt att höja anseendet | Hur mycket | Finns i dag |
|---|---|---|
| Skjuta ner en pirat | 0,5 hos alla | Ja |
| Rädda en station ur ett anfall | 20 hos stationens sida | Ja |
| Vanligt uppdrag | 4 till 15 hos givaren | Nej |
| MAKE AMENDS | 12 hos den sidan | Nej |

**Exempel.** Besättningen har skjutit sönder en Wardens-patrull. Anseendet är -100 och Wardens öppnar eld.

| Efter | Anseende | Wardens är |
|---|---|---|
| 2 gottgörelseuppdrag | -76 | Stängda: skjuter inte, släpper inte in |
| 5 | -40 | Avvaktande: handlar till högre pris, och ger egna uppdrag igen |
| 7 | -16 | Neutrala |

I dag tar samma resa ungefär sju minuter till stängd och sjutton till avvaktande, räknat på kodens siffror och utan att man gör något. HANDOFF.md säger tjugo.

**Ensam.** Ingen skillnad.

**Kostnad: liten**, när uppdragen väl finns.

**Att tänka på.** Med uppdrag blir det lättare att nå vänlig (50), och vänliga stationer ger gratis bränsle. Hur det påverkar ekonomin hör till D-104 (översikten över ekonomin).

## 6. Aldrig låsa sig (D-100)

**Bestämt.** Det får aldrig gå att låsa sig, till exempel utan pengar eller bränsle. Den egna varvsstationen kan aldrig anfallas, tas över eller bli fientlig. Ett lågt anseende går alltid att höja. En prissumma går alltid att bli av med, även utan pengar.

**Vad "låst" betyder här.** Ett läge där inget spelaren gör kan leda vidare, hur skicklig hen än är. Svårt är inte låst. Reglerna ska också hålla i hardcore, där man inte kan ladda en äldre sparning.

**Förslag: regler.**

| Nr | Regel | Vad den skyddar mot |
|---|---|---|
| 1 | **Reservtank.** Har skeppet mindre bränsle än ett hopp kostar, och gasen är noll, fylls tanken långsamt upp till precis ett hopp: 1 enhet var sjätte sekund, alltså två och en halv minut från tom tank | Slut på bränsle långt hemifrån |
| 2 | **Vägen hem.** Alla hoppvägar går åt båda håll och kartor försvinner aldrig. Besättningen kan alltså alltid hoppa samma väg tillbaka | Att bli kvar i ett system |
| 3 | **Jobb på varvet.** Den egna varvsstationen erbjuder alltid ett uppdrag i hemsystemet som betalar 100 krediter och inte kräver något köp, så länge besättningen har under 150 krediter: `YARD WORK  ·  CLEAR THE NEXT PIRATE WAVE  ·  100 CR` | Slut på pengar |
| 4 | **Tråden är gratis.** Varje kapitel ger kartan till nästa plats. Kapitel misslyckas inte och mål som försvinner flyttas | Att huvudmålet blir oåtkomligt |
| 5 | **Slutmålet finns kvar.** Den eller det som ska besegras ligger kvar i sitt system, med de skador det fått | Dagens fel med Cruisern |
| 6 | **Grunderna kostar inget.** Grundvapnet behöver aldrig ammunition, Engineer lagar utan pengar och bränsle är gratis på den egna varvsstationen. Det är så i dag och ska förbli så | Att inte kunna slåss eller laga |
| 7 | **Uppdrag kan inte skuldsätta.** Inga böter, inga förskott, och krediterna går aldrig under noll. Ett uppdrag kan alltid överges, så en full lista spärrar aldrig något | Skuld och full lista |
| 8 | **Alltid en öppen dörr.** Den egna varvsstationen handlar alltid, och har alltid ett gottgörelseuppdrag för varje sida som stängt om sig | Att alla har stängt |
| 9 | **Stationer spärrar inte vägar.** Ett hopp kräver bara karta och bränsle, aldrig en station. En station som faller tar bort service men aldrig en väg | Att kartan klipps av |

Regel 1 är billig för spelaren i tid men inte gratis: piratvågorna fortsätter medan tanken fylls. Ligger det yttersta systemet på en LARGE-karta sex hopp hemifrån tar resan hem som värst en kvart för den som inte har någonting.

**Förslag: automatiska tester.** De körs tillsammans med övriga tester, och enligt dagens ordning publiceras inget om ett test misslyckas.

| Test | Vad det kontrollerar |
|---|---|
| Kartan | Gör 300 kartor av varje storlek. Varje system går att nå hemifrån. Det finns två skilda vägar fram till systemet före slutmålet. Varje faktion har ett varv. Hemsystemet har den egna varvsstationen. Antalet stationer stämmer med tabellen i avsnitt 2 |
| Tråden | Går igenom den röda tråden på varje karta med en osårbar provspelare. Varje kapitel går att börja och avsluta, och vinsten registreras. Samma sak efter att målet har sprängts eller fallit, efter att slutsystemet har lämnats och besökts igen, och efter spara och ladda mitt i ett kapitel |
| Botten | Ställer besättningen i varje system med 0 krediter, tom tank, inga uppgraderingar, alla vrak tömda, alla andra stationer i piraternas händer och alla faktioner fientliga. Kontrollerar att reservtanken fylls, att vägen hem går att hoppa, att jobbet på varvet erbjuds och att det betalar |
| Uppdragen | Varje erbjudande har ett mål som finns, en väg dit med kartor besättningen har, och en tidsgräns som är minst dubbelt så lång som den snabbaste resan. Fem misslyckade uppdrag om och om igen gör ingen stängd och ger aldrig krediter under noll |
| Anseendet | Från -100 hos alla finns gottgörelseuppdrag på den egna varvsstationen, och sju avklarade ger neutral |

**Vad testerna inte kan lova.** De visar att en väg finns, inte att varje spelare klarar striderna längs den. Är slutstriden för svår är det en fråga om balans, och den får provspelas. Jag har inte heller något test för en automatisk sparning som görs i ett hopplöst läge. Den görs bara vid dockning, så risken är liten, men den är inte noll.

**Exempel.** Besättningen står i The Sieve med 4 bränsle, 0 krediter och ett skadat skepp. Båda stationerna där är piraternas. De släpper gasen och håller sig undan. Efter drygt två minuter finns 25 bränsle. De hoppar till Blue Assize, väntar igen, och är hemma efter fyra hopp och ungefär tio minuter. På vägen lagar Engineer skeppet. Hemma är bränslet gratis och varvet har ett jobb för 100 krediter.

**Ensam.** Regel 1 till 9 kräver aldrig mer än en spelare. Testet "Botten" körs med en ensam besättning.

**Kostnad: liten till medel.** Reglerna är små var för sig. Testerna är medel, och de växer med varje del som byggs.

## 7. Det här ändras i det som redan är byggt

- De fem fasta sektorerna och deras namn försvinner och ersätts av genererade system (avsnitt 2). De var agentens val och du har inte sett dem.
- "Spelet är vunnet när Cruisern i The Maw är förstörd" blir ett av flera slut (avsnitt 3).
- Slutmålet ligger kvar när besättningen lämnar systemet (avsnitt 6, regel 5).
- Stationer får en fjärde disk, och startskärmen får valet `MAP SIZE` (avsnitt 2 och 4).
- Förlåtelsen med tiden tas bort (avsnitt 5).
- Faktionernas hemsektorer är i dag en fast lista. De bestäms i stället av kartan.
- Musiken blir i dag mörkare för varje sektor i nummerordning. I ett nät finns ingen sådan ordning, så den bör i stället följa farligheten eller antalet hopp hemifrån. Det måste stämmas av med agenten som gör musiken.
- Sparningar från före ändringen går inte att läsa in, enligt den regel som redan gäller.
- Den inspelade omgång som testerna spelar upp måste spelas in på nytt.
- Testläget behåller sin samlade uppställning nära startpunkten.

## 8. Lagar och regler

Agenten är ingen jurist, och inget här är juridisk rådgivning.

- **Idéer och innehåll.** Hoppnät, uppdragstavlor, frakt, passagerare och anseende hos faktioner är spelmekanik som finns i många spel. Mekanik i sig brukar inte skyddas av upphovsrätt, men text, namn, bilder och bestämda berättelser gör det. Beslutet i HANDOFF.md går längre än lagen: inget innehåll hämtas från Escape Velocity eller Endless Sky. Alla ordlistor, uppdragstexter och byggstenar i tråden skrivs därför från grunden.
- **Genererade namn.** En namngenerator kan av en slump sätta ihop ett namn som finns i ett annat spel. Ordlistorna är korta, så alla möjliga namn kan skrivas ut och granskas en gång innan de läggs in. Namnen i exemplen här är inte granskade så.
- **Kestrel.** Dagens hemsektor och varvsstation heter Kestrel Drift och Kestrel Yard. Kestrel är en fågel (tornfalk), men såvitt jag vet också namnet på ett känt skepp i Escape Velocity och på spelarens skepp i ett annat rymdspel. Risken är liten eftersom ordet är vanligt, men det går emot andan i beslutet. Förslag: ordet tas inte med i de nya ordlistorna.
- **Disken och baren.** En tavla med jobb och en bar med berättande uppdrag är just det upplägg som de två spelen är kända för. Upplägget får användas, men ord och utseende ska vara egna. Därför föreslås `CONTRACTS` som namn på disken.
- **Faktionernas namn.** Platshållarna ses över i D-095 (genomgång av faktionerna). Ordet Drifters används såvitt jag vet som faktionsnamn i minst ett annat rymdspel. Det bör tas med i den genomgången.
- **Personuppgifter och lagring.** Inget nytt. Förslaget sparar inget utöver dagens sparfiler.

## 9. Byggordning

Varje steg går att provspela för sig. Steg 1 till 4 byggs på dagens fem sektorer, som då fungerar som en fast karta. När kartan genereras i steg 5 byts bara stommen ut.

Punkterna i tabellen är D-100 (aldrig låsa sig), D-073 (uppdrag), F-118 (anseende genom uppdrag), D-089 (genererade system) och D-052 (röd tråd).

| Steg | Innehåll | Punkter | Storlek |
|---|---|---|---|
| 1 | Cruisern ligger kvar när man kommer tillbaka. Reservtanken. Testet "Botten" på dagens karta | D-100 | Liten |
| 2 | Disken CONTRACTS, uppdragslistan med fem platser, märken på kartan, RUSH. Sorterna frakt och passagerare, och jobbet på varvet | D-073, D-100 | Medel |
| 3 | Sorterna prisjakt, räddning, hämtning och anfall | D-073 | Liten till medel |
| 4 | Gottgörelseuppdrag, och förlåtelsen med tiden stängs av | F-118 | Liten |
| 5 | Genererad karta i tre storlekar, namn, stjärnkartan som bild, testet "Kartan" | D-089 | Stor |
| 6 | Röda tråden: öppning, fyra byggstenar, två slut, testet "Tråden" | D-052 | Medel |
| 7 | Eskort, och fler byggstenar till tråden | D-073, D-052 | Medel |
| Senare | Sådant som väntar på andra punkter: D-074 (smuggelgods), F-119 (krig mellan faktioner), D-072 (två våningar med bar) och F-068 (handel med varor, som ger ett lastrum att dela) | | |

Steg 5 är störst och bör provspelas ordentligt innan tråden byggs ovanpå.

## 10. Frågor till dig

1. **Är storlekarna 6, 10 och 16 system rätt att börja med?** Rekommendation: ja. Dagens spel har 5, så SMALL känns igen och LARGE är tre gånger större.
2. **Ska vanliga system vara mindre än dagens, med ungefär vart tredje i dagens storlek?** Rekommendation: ja. Annars blir fler system mest längre transportsträckor.
3. **Ska hemsystemet alltid vara av samma slag (egen varvsstation, en fri station, lätta vrak)?** Rekommendation: ja. Det är både skolan och den trygga punkten som reglerna i avsnitt 6 lutar sig mot.
4. **Räcker två slut till en början (Cruisern, eller piraternas huvudstation)?** Rekommendation: ja. Båda går att bygga på det som finns, och fler kan komma med kriget och Juggernaut.
5. **Ska den röda tråden stå för sig: utanför de fem uppdragsplatserna, utan tidsgränser och omöjlig att misslyckas med?** Rekommendation: ja. Då kan varken en full lista eller ett missat kapitel spärra huvudmålet.
6. **Får sorterna hämtning (RETRIEVE) och anfall (STRIKE) läggas till dina fem?** Rekommendation: ja. De använder bordning och övertagande, som är spelets starkaste delar och annars saknas bland uppdragen.
7. **Betyder "kostar lönen" att lönen uteblir, utan böter och utan förskott att betala tillbaka?** Rekommendation: ja. Då kan ett uppdrag aldrig göra besättningen fattigare än förut.
8. **Hos vem sjunker anseendet när ett uppdrag misslyckas: stationens faktion, som det står i dag, eller den faktion uppdraget tillhör?** Rekommendation: den uppdraget tillhör. Det är den som blev sviken, och det stämmer med att plus och minus följer uppdraget.
9. **Ska misslyckade uppdrag ensamma kunna göra en faktion stängd eller fientlig?** Rekommendation: nej, de stannar vid avvaktande. Otur med tidsgränser ska inte kosta lika mycket som att skjuta på någon.
10. **Vilket golv för bränsle: reservtank som fyller sig själv upp till ett hopp, en bogsering hem, eller att anropa någon och be om bränsle?** Rekommendation: reservtanken. Den är enklast, gäller överallt och går att testa. Anrop kan komma senare med F-082 (anropa skepp och stationer).
11. **Ska gottgörelseuppdrag (MAKE AMENDS) finnas, och erbjudas på den egna varvsstationen även för sidor som är fientliga?** Rekommendation: ja. Utan dem finns ingen säker väg tillbaka när förlåtelsen med tiden är borta.
12. **Ska tidsgränser vara längre för mindre besättning (gånger 1,25 ensam)?** Rekommendation: ja. Samma tanke som att piratvågorna redan är glesare för den som spelar ensam.
13. **Ska uppdragen byggas före den genererade kartan?** Rekommendation: ja. De går att provspela på dagens karta, och F-118 (anseende genom uppdrag) väntar på dem.
14. **Ska disken heta CONTRACTS, och ska ordet Kestrel lämnas utanför de nya ordlistorna?** Rekommendation: ja på båda. Det kostar inget och håller avståndet till förebilderna.
