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

| Tjänst | Hemma | Vänlig | Neutral |
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

## 3. En timme med den simulerade spelaren

Spelaren flyger till närmaste vrak eller pod, bryter upp låset, bär hem lootet i vändor och skjuter ner varje piratvåg som kommer. Ett bordat vrak sprängs när reaktorn har gått, och då driver ett nytt in längre ut, som i spelet. Finns inget att borda bryts asteroider. Ensam avbryter en strid allt annat. Med fler spelare stannar någon på skeppet och slåss medan de andra bordar. Allt räknas med spelets egna avstånd, loot, vågor och priser.

| | Ensam, första sektorn | Ensam, The Narrows (nivå 2) | Tre spelare, första sektorn |
|---|---|---|---|
| Krediter per timme | 8341 | 9206 | 16073 |
| varav pirater | 2236 | 2626 | 5218 |
| varav vrak | 4695 | 5170 | 9445 |
| varav pods | 300 | 300 | 300 |
| varav malm | 210 | 210 | 210 |
| varav nödanrop | 900 | 900 | 900 |
| Nedskjutna pirater | 201 | 205 | 469 |
| Vrak tömda | 11 | 12 | 22 |
| Pods öppnade | 3 | 3 | 3 |
| Bränsle in (celler) | 138 | 213 | 238 |
| Bränsle ut (flygning) | 27 | 27 | 55 |

### Hur länge det dröjer till varje köp, ensam i första sektorn

Köpen görs i en enkel ordning, och tiden är minuter från start vid inkomsten ovan.

| Köp | Minuter |
|---|---|
| TWIN WING TURRETS | 1 |
| CARGO PACK | 2 |
| ARMOR PLATING | 3 |
| SHIELD EMITTERS | 5 |
| HEAVY LASER | 6 |
| POWER CORE | 8 |
| TRANQ GUN | 9 |
| ENEMY ALARM | 10 |
| ROCKET PODS | 11 |
| SOLAR CELLS | 12 |
| POINT DEFENSE | 14 |
| FIGHTER BAY | 16 |

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
