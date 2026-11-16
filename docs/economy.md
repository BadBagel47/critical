# Ekonomin (D-221)

**Skapad ur koden av `node tools/economy.mjs`. Ändra inte för hand.** Ett test säger till när bladet inte längre stämmer med koden, och när inkomsten flyttar sig utanför sitt band.

## 1. Priser

### Uppgraderingar och utrustning

| Sak | Flik | Plats | Pris | Nivåer |
|---|---|---|---|---|
| TWIN WING TURRETS | hull | hard | 150 | 1 |
| HEAVY LASER | hull | hard | 220 | 1 |
| ROCKET PODS | hull | hard | 200 | 1 |
| FIGHTER BAY | hull | hard | 320 | 1 |
| ARMOR PLATING | hull | hard | 160 | 1 |
| POINT DEFENSE | hull | hard | 220 | 1 |
| FUEL TANK | hull | – | 140 | 1 |
| DART AUTOLAUNCH | hull | – | 150 | 1 |
| EXTRA HARDPOINT | hull | – | 250 | 2 |
| SHIELD EMITTERS | system | system | 180 | 1 |
| ENEMY ALARM | system | system | 120 | 3 |
| TARGET SCANNER | system | system | 140 | 1 |
| TARGETING COMPUTER | system | system | 130 | 1 |
| POWER CORE | system | system | 240 | 1 |
| AFTERBURNER | system | system | 160 | 1 |
| JUMP COILS | system | system | 180 | 1 |
| TRACTOR BEAM | system | system | 150 | 1 |
| REPAIR DRONES | system | system | 200 | 1 |
| SOLAR CELLS | system | system | 200 | 1 |
| DOCKING FIELD | system | system | 150 | 1 |
| EXTRA SYSTEM SLOT | system | – | 200 | 2 |
| SYSTEM RADAR | system | – | 200 | 2 |
| RIFLE UPGRADE | armory | – | 120 | 2 |
| CARGO PACK | armory | – | 140 | 1 |
| SUIT ARMOR | armory | – | 160 | 1 |
| BREACHING CHARGE | armory | – | 50 | 1 |
| TRANQ GUN | armory | – | 120 | 1 |
| FLARES | armory | – | 60 | 1 |
| DEPLOYABLE TURRET | armory | – | 180 | 1 |
| HACKING KIT | armory | – | 150 | 1 |
| TELEPORTER COILS | armory | – | 150 | 1 |

### Tjänster på stationer

Fristaden tar samma priser som en neutral bas (R-1091). Bränslet är gratis bara på ett eget varv.

| Tjänst | Eget varv | Vänlig | Neutral och fristaden |
|---|---|---|---|
| Bränsle, per enhet | 0 | 0.7 | 1 |
| Lagning, per hullpoäng | 0.25 | 0.25 | 0.5 |
| Raket | 2 | 2 | 4 |
| Stjärnkarta | 100 | 100 | 150 |

En avvaktande station tar 1.5 gånger priset. En station som står i skuld efter ett nödanrop ger 40 procent rabatt i 180 sekunder.

### Egna stationer och prissumma

- Försvar (sköld, kanoner, säkerhet inuti), per nivå: 250, 450, 700 krediter.
- Prissumma från en fri station: 300 krediter, eller försvinner efter 3 besegrade grupper bounty hunters.

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

Räknat över 8 världar av varje storlek, som nya spel gör dem. Ett hopp kostar 25 bränsle, och en bränslecell ger 25, alltså ett hopp. Full tank räcker till 4 hopp.

| Storlek | System | Bebodda | Tomma | Omstridda | Piraternas | Stationer | Vrak | Pods | Hopp till slutet |
|---|---|---|---|---|---|---|---|---|---|
| SHORT | 16 | 8 | 8 | 2 | 2 | 11.6 | 6.3 | 32 | 4.8 |
| MEDIUM | 24 | 12 | 12 | 2 | 3 | 17.5 | 14.3 | 48 | 5.9 |
| LONG | 36 | 18 | 18 | 4 | 5 | 27.3 | 18.3 | 72 | 6.5 |

Vrak och pods är de som finns när man först kommer till ett system. Vrak är en bonus (R-1097): inga i fristaden, flest där piraterna håller systemet. Inga nya vrak driver in när ett har sprängts. Kommer man tillbaka till ett system efter minst 300 sekunder kan ett nytt ligga där, med chansen 0.5 där piraterna håller systemet, 0.35 i ett omstritt och 0.15 annars. En nedskjuten gunboat eller ett fraktskepp lämnar vrak med chansen 0.4. Ett vrak har en bränslecell med chansen 0.5, en station har en i valvet. Slutet nås bara när man har dess stjärnkarta från valvet på en piratbas.

## 4. En timme med den simulerade spelaren

Spelaren flyger till närmaste vrak eller pod, bryter upp låset, bär hem lootet i vändor och skjuter ner varje piratvåg som kommer. Vraken är de som finns i systemet när man kommer. Ett bordat vrak sprängs, och inget nytt driver in, som i spelet. Vrak som nedskjutna gunboats ibland lämnar räknas inte. När det inte finns något kvar att borda bryts asteroider resten av timmen. Ensam avbryter en strid allt annat. Med fler spelare stannar någon på skeppet och slåss medan de andra bordar. Allt räknas med spelets egna avstånd, loot, vågor och priser.

| | Ensam, fristaden | Ensam, grannsystem (nivå 0) | Ensam, bebott system på nivå 2 | Ensam, tomt system (nivå 1) | Tre spelare, grannsystem (nivå 0) |
|---|---|---|---|---|---|
| Krediter per timme | 2341 | 4728 | 5562 | 5922 | 8737 |
| varav pirater | 0 | 2370 | 2951 | 2728 | 5485 |
| varav vrak | 0 | 0 | 374 | 1260 | 0 |
| varav pods | 300 | 300 | 300 | 100 | 300 |
| varav malm | 2041 | 1158 | 1036 | 934 | 2053 |
| varav nödanrop | 0 | 900 | 900 | 900 | 900 |
| Nedskjutna pirater | 0 | 213 | 221 | 213 | 493 |
| Vrak tömda | 0 | 0 | 1 | 3 | 0 |
| Pods öppnade | 3 | 3 | 3 | 1 | 3 |
| Bränsle in (celler) | 38 | 38 | 38 | 38 | 38 |
| Bränsle ut (flygning) | 9 | 5 | 5 | 6 | 5 |

Världen är den första av storleken SHORT (frö 1). Timmen spelas i ett och samma system, så hopp mellan system räknas inte här, se avsnitt 3 för vad de kostar.

### Hur länge det dröjer till varje köp, ensam den första timmen

Den första timmen räknas som en kvart i fristaden och resten i ett bebott grannsystem: 4131 krediter. Köpen görs i en enkel ordning, och tiden är minuter från start.

| Köp | Minuter |
|---|---|
| TWIN WING TURRETS | 2 |
| CARGO PACK | 4 |
| ARMOR PLATING | 7 |
| SHIELD EMITTERS | 9 |
| HEAVY LASER | 12 |
| POWER CORE | 16 |
| TRANQ GUN | 18 |
| ENEMY ALARM | 19 |
| ROCKET PODS | 22 |
| SOLAR CELLS | 25 |
| POINT DEFENSE | 28 |
| FIGHTER BAY | 33 |

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
