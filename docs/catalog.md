# Innehållskatalog

Allt som finns i spelet med sina viktigaste siffror (D-223). Skapad ur koden med `npm run catalog`: ändra inte här för hand, utan i koden, och kör kommandot igen. `tests/catalog.test.js` säger till när katalogen inte stämmer med koden. Priser och inkomster räknas igenom i ekonomibladet, docs/economy.md.

## Skeppsklasser

Skepp utom besättningens fregatt (`SHIPS` i `src/sim/kinds.js`). Liv och skada i spelets enheter, fart i punkter per sekund.

| Skepp | Liv | Fart | Skada per skott | Belöning | Lämnar vrak |  |
|---|---|---|---|---|---|---|
| FIGHTER (fighter) | 24, mer längre ut | 135 | 5 × 3 | 5 | – |  |
| GUNBOAT (gunboat) | 90, mer längre ut | 85 | 9 | 25 | ja |  |
| FREIGHTER (freighter) | 140 | 55 | – | – | ja |  |
| CRUISER (cruiser) | 1400 | 38 | 8 | 500 | – | bossen |

## Vrak

Skroven som vrak finns i (`HULLS` i `src/sim/kinds.js`). Risken avgör vakter och lås, och insidans storlek är i rutor.

| Skrov | Från | Risk | Insidan |
|---|---|---|---|
| hull | okänt skrov | 1–3 | 54 × 25 |
| gunboat | GUNBOAT | 1–2 | 38 × 21 |
| freighter | FREIGHTER | 2–3 | 96 × 33 |

## Baser

Alla stationer är standardbaser (D-217): tre runda våningar, BASEMENT med radien 35,6 rutor, MIDDLE med radien 29 rutor, TOP med radien 16 rutor. Insidan är 272 × 80 rutor med våningarna bredvid varandra. Utanpå är basen 464 punkter bred, med 4 portar på ringen, 4 lastarmar och 10 platser för kanontorn.

|  | Värde |
|---|---|
| Skrov | 1500 |
| Sköld | 200, +50 % per köpt nivå |
| Kanontorn | liv 45, skada 3 (pirater 6), +35 % per köpt nivå |
| Torn per köpt nivå (R-1208) | 0, 2, 6, 10 |
| Andra sidors baser (R-1230) | försvarsnivå efter fara 1, 1, 2, 2, alltså 2, 2, 6, 6 torn. En bas som besättningen tar spränger sina torn (R-1231) |
| Tunga torn på toppen | 1,5 gånger skadan |
| Stor kanon (R-1164) | 600 krediter, 3 gånger skadan |
| Försvar i mainframen, per nivå | 250, 450, 700 krediter (sköld, kanoner, säkerhet inne) |
| Vakter (R-1182) | en per 500 rutor golv i lockdown och larm, en per 1200 i lugnt läge |
| Larmljus (R-1182) | ett per 300 rutor golv |
| Trycket efter strömmen (R-1168) | steg efter 30, 60, 90 sekunder, 2 drönare och högst 4, hjälp efter 90 sekunder med 3 vakter |

## Vakter

Vakternas sorter (`GUARD_KINDS` i `src/sim/guards.js`). Fart, skada och tid att märka någon är andelar av en vanlig vakt; mindre tid att märka är snabbare. "Från fara" är hur farligt stället och systemet måste vara.

| Vakt | Liv | Fart | Skada | Märker | Tar skydd | Sover av dart | Från fara | Finns i |  |
|---|---|---|---|---|---|---|---|---|---|
| WATCHMAN | 18 | 1 | 0,6 | 0,6 | ja | 1 | 0 | andra baser | väcker alla |
| SOLDIER | 30 | 1 | 1 | 1 | ja | 1 | 0 | vrak, piratbaser, andra baser |  |
| TECHNICIAN | 24 | 1,05 | 0,7 | 1 | ja | 1 | 2 | andra baser | lagar turrets |
| DRONE | 15 | 1,7 | 0,5 | 0,8 | nej | nej | 2 | vrak, piratbaser |  |
| HEAVY | 78 | 0,6 | 1,5 | 1,2 | nej | 0,5 | 4 | vrak, piratbaser, andra baser |  |

## Sidor

| Namn | Id | Vad |
|---|---|---|
| THE CHARTER | charter | A TRADE LEAGUE WITH RICH STATIONS |
| THE WARDENS | wardens | KEEPERS OF ORDER WITH HEAVY SHIPS |
| THE DRIFTERS | drifters | FREE SALVAGERS OUT ON THE EDGE |
| PIRATES | pirate | Alltid fiender. Håller de yttersta systemen och slutet |
| BOUNTY HUNTERS | hunter | Kommer när en fri station satt en prissumma på besättningen |

## Fregattens vapen

| Vapen | Skada | Takt |
|---|---|---|
| PULSE (startkanonen och tornen) | 6, vingtornen 4 | ett skott per 0,2 sekunder |
| HEAVY LASER | 70 | laddas i 1,3 sekunder |
| ROCKET PODS | – | 8 raketer, en per 0,6 sekunder |

## Uppgraderingar och utrustning

Allt som köps (`CATALOG` i `src/sim/upgrades.js`). Varje roll har högst 3 platser av varje sort. Priset är för första nivån och, där det finns fler, den sista.

### Delar på skrovet

| Sak | Betalas av | Plats | Nivåer | Pris | Vad |
|---|---|---|---|---|---|
| NOSE TURRET | GUNNER | hull | 1 | 140 | THE NOSE GUN TURNS TO WHERE YOU AIM |
| TWIN WING TURRETS | GUNNER | hull | 1 | 150 | TWO MORE PULSE TURRETS |
| HEAVY LASER | GUNNER | hull | 1 | 220 | CHARGED BEAM, FIRES STRAIGHT AHEAD |
| ION CANNON | GUNNER | hull | 1 | 180 | KNOCKS SHIPS OUT TO BOARD, BARELY HURTS A HULL |
| ROCKET PODS | GUNNER | hull | 1 | 200 | HOMING ROCKETS, 8 PER LOAD |
| FIGHTER BAY | GUNNER | hull | 3 | 320–200 | DARTS THAT FIGHT AT YOUR SIDE, ONE MORE FOR EACH LEVEL |
| ARMOR PLATING | ENGINEER | hull | 1 | 160 | HULL +80 |
| POINT DEFENSE | ENGINEER | hull | 1 | 220 | SHOOTS DOWN SOME INCOMING FIRE |
| FUEL TANK | CAPTAIN | – | 5 | 140–300 | ONE MORE JUMP OF FUEL FOR EACH LEVEL |
| EXTRA HULL SLOT | CAPTAIN | – | 2 | 250–375 | ONE MORE HULL SLOT, FOR GOOD |
| EXTRA HULL SLOT | GUNNER | – | 2 | 250–375 | ONE MORE HULL SLOT, FOR GOOD |
| EXTRA HULL SLOT | ENGINEER | – | 2 | 250–375 | ONE MORE HULL SLOT, FOR GOOD |

### System

| Sak | Betalas av | Plats | Nivåer | Pris | Vad |
|---|---|---|---|---|---|
| SCANNER PULSE | ENGINEER | system | 1 | 160 | SHOWS ALL OF THE SYSTEM FOR A MOMENT, FOR A LITTLE FUEL |
| SHIELD EMITTERS | ENGINEER | system | 1 | 180 | SHIELD +50 |
| ENEMY ALARM | CAPTAIN | system | 3 | 120–240 | WARNS OF PIRATES FAR OUT |
| TARGET SCANNER | CAPTAIN | system | 1 | 140 | SHOWS HEALTH AND BOARDING RISK |
| TARGETING COMPUTER | GUNNER | system | 1 | 130 | SHOWS THE GUNNER WHERE TO AIM |
| POWER CORE | ENGINEER | system | 1 | 240 | POWER +2 |
| AFTERBURNER | CAPTAIN | system | 1 | 160 | HOLD SHIFT FOR SPEED, BURNS FUEL FAST |
| JUMP COILS | CAPTAIN | system | 1 | 180 | JUMPS CHARGE FASTER AND COST LESS FUEL |
| TRACTOR BEAM | CAPTAIN | system | 1 | 150 | PULLS IN SALVAGE FROM A DISTANCE |
| REPAIR DRONES | ENGINEER | system | 1 | 200 | SLOWLY REPAIR THE SHIP ON THEIR OWN |
| SOLAR CELLS | CAPTAIN | system | 1 | 200 | SLOWLY FILL THE TANK FROM STARLIGHT |
| DOCKING FIELD | ENGINEER | system | 1 | 150 | A STRONGER EXTRA SHIELD WHILE DOCKED |
| SYSTEM RADAR | CAPTAIN | – | 2 | 200–350 | SHOWS WHO HOLDS THE SYSTEMS NEAR BY, AS THEY ARE NOW |
| EXTRA SYSTEM SLOT | CAPTAIN | – | 2 | 200–300 | ONE MORE SYSTEM SLOT, FOR GOOD |
| EXTRA SYSTEM SLOT | GUNNER | – | 2 | 200–300 | ONE MORE SYSTEM SLOT, FOR GOOD |
| EXTRA SYSTEM SLOT | ENGINEER | – | 2 | 200–300 | ONE MORE SYSTEM SLOT, FOR GOOD |

### Bordarnas utrustning

| Sak | Betalas av | Plats | Nivåer | Pris | Vad |
|---|---|---|---|---|---|
| BREACHING CHARGE | GUNNER | – | 1 | 50 | THE GUNNER BLOWS A VAULT DOOR OPEN WITH C  ·  WAKES EVERYONE  ·  USED UP |
| HACKING KIT | den som köper | – | 1 | 150 | MORE TIME IN EVERY BREAK-IN |
| TELEPORTER COILS | den som köper | – | 1 | 150 | THE TELEPORTER RECHARGES FASTER |
| RIFLE UPGRADE | CAPTAIN | – | 2 | 120–180 | BOARDERS HIT HARDER |
| RIFLE UPGRADE | GUNNER | – | 2 | 120–180 | BOARDERS HIT HARDER |
| RIFLE UPGRADE | ENGINEER | – | 2 | 120–180 | BOARDERS HIT HARDER |
| BACKPACK | CAPTAIN | – | 2 | 160–280 | ROOM FOR MORE, AND A LIGHTER STEP UNDER A LOAD |
| BACKPACK | GUNNER | – | 2 | 160–280 | ROOM FOR MORE, AND A LIGHTER STEP UNDER A LOAD |
| BACKPACK | ENGINEER | – | 2 | 160–280 | ROOM FOR MORE, AND A LIGHTER STEP UNDER A LOAD |
| SUIT ARMOR | CAPTAIN | – | 1 | 160 | BOARDERS TAKE MORE BEFORE THE TELEPORT |
| SUIT ARMOR | GUNNER | – | 1 | 160 | BOARDERS TAKE MORE BEFORE THE TELEPORT |
| SUIT ARMOR | ENGINEER | – | 1 | 160 | BOARDERS TAKE MORE BEFORE THE TELEPORT |
| TRANQ GUN | CAPTAIN | – | 1 | 120 | R SWAPS TO SILENT DARTS THAT PUT GUARDS TO SLEEP |
| TRANQ GUN | GUNNER | – | 1 | 120 | R SWAPS TO SILENT DARTS THAT PUT GUARDS TO SLEEP |
| TRANQ GUN | ENGINEER | – | 1 | 120 | R SWAPS TO SILENT DARTS THAT PUT GUARDS TO SLEEP |
| FLARES | CAPTAIN | – | 1 | 60 | Q THROWS A FLARE THAT LIGHTS A DARK ROOM |
| FLARES | GUNNER | – | 1 | 60 | Q THROWS A FLARE THAT LIGHTS A DARK ROOM |
| FLARES | ENGINEER | – | 1 | 60 | Q THROWS A FLARE THAT LIGHTS A DARK ROOM |
| DEPLOYABLE TURRET | CAPTAIN | – | 1 | 180 | T SETS DOWN A SMALL TURRET |
| DEPLOYABLE TURRET | GUNNER | – | 1 | 180 | T SETS DOWN A SMALL TURRET |
| DEPLOYABLE TURRET | ENGINEER | – | 1 | 180 | T SETS DOWN A SMALL TURRET |

## Lås

| Lås | Var | Hur | Siffror |
|---|---|---|---|
| pipes | vrak | vrid rören så att strömmen når låset | rutnät 5 × 3, 6 × 3, 6 × 4 efter risk, tid 60, 50, 42 sekunder. 3 misslyckanden spränger vraket |
| code | baser | Engineer hittar koden siffra för siffra, och någon slår in den vid låset | 4 siffror av 6, 50 sekunder |
| dial | containrar | stoppa nålen i märket | 3 gånger, 25 sekunder, 3 missar |
