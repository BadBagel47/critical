# Ekonomin (D-221)

**Skapad ur koden av `node tools/economy.mjs`. Ändra inte för hand.** Ett test säger till när bladet inte längre stämmer med koden, och när inkomsten flyttar sig utanför sitt band.

## 1. Priser

### Uppgraderingar och utrustning

| Sak | Flik | Betalas av | Plats | Pris | Nivåer |
|---|---|---|---|---|---|
| NOSE TURRET | hull | GUNNER | hull | 140 | 1 |
| TWIN WING TURRETS | hull | GUNNER | hull | 150 | 1 |
| HEAVY LASER | hull | GUNNER | hull | 220 | 1 |
| ROCKET PODS | hull | GUNNER | hull | 200 | 1 |
| FIGHTER BAY | hull | GUNNER | hull | 320 | 3 |
| ARMOR PLATING | hull | ENGINEER | hull | 160 | 1 |
| POINT DEFENSE | hull | ENGINEER | hull | 220 | 1 |
| FUEL TANK | hull | CAPTAIN | – | 140 | 5 |
| SCANNER PULSE | system | ENGINEER | system | 160 | 1 |
| SHIELD EMITTERS | system | ENGINEER | system | 180 | 1 |
| ENEMY ALARM | system | CAPTAIN | system | 120 | 3 |
| TARGET SCANNER | system | CAPTAIN | system | 140 | 1 |
| TARGETING COMPUTER | system | GUNNER | system | 130 | 1 |
| POWER CORE | system | ENGINEER | system | 240 | 1 |
| AFTERBURNER | system | CAPTAIN | system | 160 | 1 |
| JUMP COILS | system | CAPTAIN | system | 180 | 1 |
| TRACTOR BEAM | system | CAPTAIN | system | 150 | 1 |
| REPAIR DRONES | system | ENGINEER | system | 200 | 1 |
| SOLAR CELLS | system | CAPTAIN | system | 200 | 1 |
| DOCKING FIELD | system | ENGINEER | system | 150 | 1 |
| SYSTEM RADAR | system | CAPTAIN | – | 200 | 2 |
| RIFLE UPGRADE | armory | den som köper | – | 120 | 2 |
| CARGO PACK | armory | den som köper | – | 140 | 1 |
| SUIT ARMOR | armory | den som köper | – | 160 | 1 |
| BREACHING CHARGE | armory | GUNNER | – | 50 | 1 |
| TRANQ GUN | armory | den som köper | – | 120 | 1 |
| FLARES | armory | den som köper | – | 60 | 1 |
| DEPLOYABLE TURRET | armory | den som köper | – | 180 | 1 |
| HACKING KIT | armory | den som köper | – | 150 | 1 |
| TELEPORTER COILS | armory | den som köper | – | 150 | 1 |
| EXTRA HULL SLOT | hull | CAPTAIN | – | 250 | 2 |
| EXTRA SYSTEM SLOT | system | CAPTAIN | – | 200 | 2 |
| EXTRA HULL SLOT | hull | GUNNER | – | 250 | 2 |
| EXTRA SYSTEM SLOT | system | GUNNER | – | 200 | 2 |
| EXTRA HULL SLOT | hull | ENGINEER | – | 250 | 2 |
| EXTRA SYSTEM SLOT | system | ENGINEER | – | 200 | 2 |

### Tjänster på stationer

Fristaden tar samma priser som en neutral bas (R-1091). Bränslet är gratis bara på ett eget varv. Varje roll har en egen kassa som får hela inkomsten (R-1103, R-1104). Tjänsterna vid disken betalas av den som beställer, ur den egna kassan (R-1121). Delar hamnar i förrådet och installeras gratis på ett varv (R-1135, R-1138), och en sålt del ger hälften tillbaka, tre fjärdedelar på en egen bas (R-1139).

| Tjänst | Eget varv | Vänlig | Neutral och fristaden |
|---|---|---|---|
| Bränsle, per enhet | 0 | 0.7 | 1 |
| Lagning, per hullpoäng | 0.25 | 0.25 | 0.5 |
| Raket | 2 | 2 | 4 |
| Stjärnkarta | 100 | 100 | 150 |

En avvaktande station tar 1.5 gånger priset. En station som står i skuld efter ett nödanrop ger 40 procent rabatt i 180 sekunder.

### Egna stationer och prissumma

- Försvar (sköld, kanoner, säkerhet inuti), per nivå: 250, 450, 700 krediter, betalt ur stationens egen kassa (R-1115).
- En egen station ger var 60:e sekund 50 krediter till sin egen kassa och 25 till varje rolls kassa (R-1116), alltså 1500 i timmen per roll. Första försvarsnivån går att köpa efter 5 minuter.
- Prissumma från en fri station: 300 krediter, eller försvinner efter 3 besegrade grupper bounty hunters. Den som står vid disken betalar ur sin egen kassa (R-1117).

## 2. Inkomster

| Källa | Krediter | Annat |
|---|---|---|
| Pirat: FIGHTER | 5 i prispengar | bärgningsgods 0.35 st à 10–25 |
| Pirat: GUNBOAT | 25 i prispengar | bärgningsgods 2 st à 20–40 |
| Pirat: FREIGHTER | 0 i prispengar | bärgningsgods 3 st à 15–35 |
| Pirat: CRUISER | 500 i prispengar | bärgningsgods 6 st à 20–80 |
| Låda i ett vrak | 30–70 | |
| Låda i ett valv | 90–160 | |
| Bränslecell | – | 25 bränsle |
| Stjärnkarta man redan har | 60 | |
| Pod | 60–140 | hälften av gångerna 25 bränsle |
| Malm, per bit | 6 | eller 4 bränsle |
| Hjälp vid nödanrop | 100 hos en vänlig | rabatt hos en neutral |

## 3. Världen

Räknat över 8 världar av varje storlek, som nya spel gör dem. Ett hopp kostar 25 bränsle, och en bränslecell ger 25, alltså ett hopp. Full tank räcker till 1 hopp.

| Storlek | System | Bebodda | Tomma | Omstridda | Piraternas | Stationer | Vrak | Pods | Hopp till slutet |
|---|---|---|---|---|---|---|---|---|---|
| SHORT | 25 | 10 | 15 | 2 | 2 | 15 | 14.5 | 45 | 6.3 |
| MEDIUM | 40 | 16 | 24 | 3 | 3 | 24.4 | 23.4 | 72 | 7.4 |
| LONG | 55 | 22 | 33 | 4 | 4 | 36.4 | 29 | 99 | 9.4 |

Vrak och pods är de som finns när man först kommer till ett system. Vrak är en bonus (R-1097): inga i fristaden, flest där piraterna håller systemet. Inga nya vrak driver in när ett har sprängts. Kommer man tillbaka till ett system efter minst 300 sekunder kan ett nytt ligga där, med chansen 0.5 där piraterna håller systemet, 0.35 i ett omstritt och 0.15 annars. En nedskjuten gunboat eller ett fraktskepp lämnar vrak med chansen 0.4. Ett vrak har en bränslecell med chansen 0.5, en station har en i valvet. Slutet nås bara när man har dess stjärnkarta från valvet på en piratbas.

## 4. En timme med den simulerade spelaren

Spelaren flyger till närmaste vrak eller pod, bryter upp låset, bär hem lootet i vändor och skjuter ner varje piratvåg som kommer. Vraken är de som finns i systemet när man kommer. Ett bordat vrak sprängs, och inget nytt driver in, som i spelet. Vrak som nedskjutna gunboats ibland lämnar räknas inte. När det inte finns något kvar att borda bryts asteroider resten av timmen. Ensam avbryter en strid allt annat. Med fler spelare stannar någon på skeppet och slåss medan de andra bordar. Allt räknas med spelets egna avstånd, loot, vågor och priser.

| | Ensam, fristaden | Ensam, grannsystem (nivå 0) | Ensam, bebott system på nivå 2 | Ensam, tomt system (nivå 2) | Tre spelare, grannsystem (nivå 0) |
|---|---|---|---|---|---|
| Krediter per timme | 2333 | 4702 | 5821 | 6115 | 8712 |
| varav pirater | 0 | 2370 | 2951 | 2951 | 5485 |
| varav vrak | 0 | 0 | 755 | 1314 | 0 |
| varav pods | 300 | 300 | 300 | 100 | 300 |
| varav malm | 2033 | 1133 | 915 | 850 | 2027 |
| varav nödanrop | 0 | 900 | 900 | 900 | 900 |
| Nedskjutna pirater | 0 | 213 | 221 | 221 | 493 |
| Vrak tömda | 0 | 0 | 2 | 3 | 0 |
| Pods öppnade | 3 | 3 | 3 | 1 | 3 |
| Bränsle in (celler) | 38 | 38 | 76 | 57 | 38 |
| Bränsle ut (flygning) | 11 | 13 | 12 | 13 | 13 |

Världen är den första av storleken SHORT (frö 1). Timmen spelas i ett och samma system, så hopp mellan system räknas inte här, se avsnitt 3 för vad de kostar.

### Hur länge det dröjer till varje köp, ensam den första timmen

Den första timmen räknas som en kvart i fristaden och resten i ett bebott grannsystem: 4110 krediter. Varje roll har en egen kassa som får hela inkomsten (R-1104), och köper sitt i en enkel ordning. Bränslet, räknat som ett hopp var tionde minut (150 krediter i timmen), betalas av rollerna i tur och ordning, alltså en tredjedel var. Tiden är minuter från start.

| Roll | Köp | Minuter |
|---|---|---|
| CAPTAIN | FUEL TANK | 2 |
| CAPTAIN | ENEMY ALARM | 4 |
| CAPTAIN | EXTRA SYSTEM SLOT | 7 |
| CAPTAIN | JUMP COILS | 9 |
| CAPTAIN | SYSTEM RADAR | 12 |
| CAPTAIN | FUEL TANK  LV 2 | 15 |
| CAPTAIN | EXTRA SYSTEM SLOT  LV 2 | 20 |
| CAPTAIN | AFTERBURNER | 22 |
| GUNNER | NOSE TURRET | 2 |
| GUNNER | EXTRA HULL SLOT | 6 |
| GUNNER | TWIN WING TURRETS | 8 |
| GUNNER | TARGETING COMPUTER | 10 |
| GUNNER | EXTRA HULL SLOT  LV 2 | 15 |
| GUNNER | ROCKET PODS | 18 |
| GUNNER | CARGO PACK | 20 |
| ENGINEER | SCANNER PULSE | 2 |
| ENGINEER | ARMOR PLATING | 5 |
| ENGINEER | EXTRA HULL SLOT | 8 |
| ENGINEER | POINT DEFENSE | 12 |
| ENGINEER | EXTRA SYSTEM SLOT | 15 |
| ENGINEER | SHIELD EMITTERS | 17 |
| ENGINEER | FLARES | 18 |

### Antaganden

Det spelet inte kan svara på är antaget. Ändra dem i `ASSUME` i `tools/economy.mjs` när provspel visar bättre siffror.

| Antagande | Värde |
|---|---|
| lockWreck | 40 |
| lockPod | 20 |
| boardOverhead | 90 |
| fightPerPirate | 8 |
| raidsHelped | 0.5 |
| rocksPerHour | 20 |
| orePerRock | 1.75 |
| walkFactor | 1.4 |
| mineEvery | 20 |
| Marschfart (beräknad ur spelet) | 108 punkter i sekunden |
