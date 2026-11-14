# BACKLOG

IDs: en gemensam nummerserie. B = bugg, F = funktion, D = planering och design.
Prioritet: Hög, Medel, Låg.

## Proposed runs

**A** – strong model, high level – Projektgrund
- D-004 – Slå fast var spelet publiceras, så att det går att prova efter varje körning
- F-005 – Sätt upp spelet så att det öppnas i webbläsaren och går att spela ensam

**B** – strong model, high level – Flyga och slåss
- D-013 – Exportera skepp och figurer från ritskripten som färdiga bilder till spelet
- F-006 – Captain flyger fregatten i rymden
- F-007 – Gunner siktar och skjuter med pulslasern
- F-010 – En första pirat att slåss mot

**C** – strong model, high level – Engineer och postbyten
- F-008 – Engineer fördelar energi och styr reparationer
- F-009 – Fritt byte mellan de tre posterna, även för en ensam spelare
- F-012 – Pausknapp som fryser spelet för alla

**D** – standard model, medium level – Vrak och dockning
- F-011 – Ett vrak att docka med, med dockningshjälp

**E** – strong model, high level – Bordning
- F-014 – Gå in i vraket uppifrån och slåss mot vakter och kanontorn
- F-015 – Teleportern som räddar den som nästan dör
- F-017 – Loot som ger bränsle och krediter

**F** – standard model, medium level – Inbrottsspel
- F-016 – Koppla förbi dockningslåset på tid innan ni kommer in i ett vrak

**G** – strong model, high level – Karta och scanner
- F-018 – Gemensam karta där dimman lyfts av det ni ser
- F-019 – Scannerpuls, sonder och radarbojar som avslöjar mer av kartan

## Hög

| ID | Vad | Status |
|---|---|---|
| D-004 | Välj var spelet publiceras. Tekniken är bestämd: webbspel, och onlineläget går via användarens motor på Cloudflare (se F-040). Kvar att avgöra: Cloudflare Pages eller GitHub Pages. Förslag: GitHub Pages direkt från main, och ett spel utan byggsteg så att det som sparas är det som publiceras. | Väntar på användaren |
| F-005 | Projektgrund: spelet öppnas i webbläsaren och går att spela ensam. Spellogiken hålls skild från nätverket så att motorn kan kopplas in senare | Ej påbörjad |
| F-006 | Captain: flyg fregatten i rymden uppifrån. Hela skeppet vrids som en bild | Ej påbörjad |
| F-007 | Gunner: sikta och skjut med pulslaser | Ej påbörjad |
| F-008 | Engineer: fördela energi mellan vapen, sköld, motorer och reparation, och flytta reparationssymbolen mellan skadepunkter | Ej påbörjad |
| F-009 | Växla fritt mellan de tre posterna | Ej påbörjad |
| F-010 | Pirater: en första fiendetyp (Fighter) | Ej påbörjad |
| F-011 | Vrak att docka med | Ej påbörjad |
| F-012 | Pausknapp som fryser världen för alla och visar vem som pausade | Ej påbörjad |
| D-013 | Grafik in i spelet: exportera sprites från ritskripten | Ej påbörjad |

## Medel

| ID | Vad | Status |
|---|---|---|
| F-014 | Bordning uppifrån: gå in och ut fritt, vakter, kanontorn, loot | Ej påbörjad |
| F-015 | Teleporter: hem vid nästan död, inte in igen samma bordning, liv åter när alla är tillbaka, laddning före nästa bordning | Ej påbörjad |
| F-016 | Inbrottsspel för vrak: koppla förbi dockningslåset | Ej påbörjad |
| F-017 | Loot: bränsle och krediter | Ej påbörjad |
| F-018 | Gemensam karta med fog of war | Ej påbörjad |
| F-019 | Scanner pulse, sonder och radarbojar | Ej påbörjad |
| F-020 | Stationer: vänlig, neutral och fientlig, tankning och shipyard | Ej påbörjad |
| F-021 | Hardpoints och system slots, och uppgraderingar som syns på skeppet | Ej påbörjad |
| F-022 | Fler vapen: tung laser och raketer | Ej påbörjad |
| F-023 | Fighter bay och Darts, manuell start först och autostart som uppgradering | Ej påbörjad |
| F-024 | Sektorer, stjärnkartor och hopp. Sista sektorn har en Cruiser som boss | Ej påbörjad |
| F-025 | Nödanrop från stationer, med rabatt och shipyard som belöning | Ej påbörjad |
| F-026 | Enemy alarm och target scanner. Scannern visar också hur svårt ett mål är att borda | Ej påbörjad |
| F-027 | Bordarnas utrustning: vapen, granater, cargo pack, breaching charge, hacking kit, deployable turret, suit armor | Ej påbörjad |
| F-028 | Fler inbrottsspel: kod för stationer och lås för fraktcontainrar | Ej påbörjad |
| F-029 | Övriga skeppsuppgraderingar: afterburner, jump drive, tractor beam, point defense, targeting computer, power core, repair drones, fuel tank | Ej påbörjad |
| F-030 | Automatisk paus när någon varit frånkopplad en stund | Ej påbörjad |
| F-040 | Onlinespel för upp till tre spelare via användarens motor, som bygger på Cloudflares realtidstjänster. Målet är att gratiskontot ska räcka | Väntar på motorn |
| D-031 | Avgör om man ska kunna hoppa tillbaka till gamla sektorer | Väntar på användaren |
| D-032 | Avgör om lootet blir kvar på platsen när någon teleporteras hem | Väntar på användaren |

## Låg

| ID | Vad | Status |
|---|---|---|
| D-033 | Gå igenom GDPR och kakor innan onlineläget eller designsidan publiceras, bland annat typsnitt från Google Fonts och spelarnamn | Ej påbörjad |

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
