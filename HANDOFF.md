# HANDOFF

Rules version: v1.6
Inventory: 2026-11-14
Project language: English (all text in the game and README)

## Nuläge

Spelet är i designstadiet. Det finns ingen spelbar kod än. Repot innehåller designskissen, exempelskärmarna och skripten som ritar dem.

## Nästa steg

1. Användaren avgör var spelet publiceras (D-004) och ger besked om motorn (F-040).
2. Bygg första spelbara versionen enligt "Proposed runs" i BACKLOG.md. Den byggs för en ensam spelare först, och onlineläget kopplas in när motorn finns.

## Mål

Ett co-op-spel online där upp till tre spelare delar på ett rymdskepp. Det ska också gå att spela ensam. Främst ett hobbyprojekt som inte är tänkt att släppas i någon spelbutik.

## Arbetssätt

Idéer spånas i chatten och samlas i designskissen. Det som ska byggas läggs i BACKLOG.md och körs i grupper efter godkännande.

## Publicering

Ingen publicering än. Var spelet publiceras avgörs i D-004.

## Dokumentkarta

- [docs/design/index.html](docs/design/index.html): designskissen (utkast 3), på svenska. Samma sida finns som privat sida hos användaren: https://claude.ai/artifact/Ebx9u3e5cy33EHWXoViYJz
- [docs/design/img/](docs/design/img/): exempelskärmar och skeppsbilder.
- [docs/design/tools/](docs/design/tools/): Python-skript som ritar bilderna. Kräver Pillow och typsnittet DejaVu Sans Bold. Kör `python3 frigate.py`, `python3 rot.py` och `python3 screens2.py`.

## Decisions

Spelet
- Namn: Critical ST8.
- Upp till tre spelare online. Går också att spela ensam, och då börjar spelaren som Captain.
- All text i spelet är på engelska.
- Inget moment pausar spelet. En pausknapp fryser världen för alla.
- Automatisk paus vid tappad anslutning sker först efter en stund. Gränsen prövas ut.
- Onlineläget ska använda användarens egen motor, som byggs just nu och bygger på Cloudflares realtidstjänster. Målet är att ett gratiskonto ska räcka för det här kompisspelet (2026-11-14).

Poster
- Tre poster: Captain, Gunner, Engineer. "Post" betyder spelarens plats på skeppet, "station" betyder rymdstation.
- Captain flyger, dockar, skickar ut Darts och avgör när skeppet lägger ut och hoppar.
- Gunner sköter alla vapen.
- Engineer fördelar energi mellan vapen, sköld, motorer och reparation, och flyttar en reparationssymbol mellan skadepunkter på en bild av skeppet.
- Den som går in för att loota lämnar sin post ledig för någon annan och får tillbaka den när den är ombord igen.
- Första versionen har alla tre posterna och fritt byte mellan dem.

Värld
- Sektorer som nås med stjärnkartor som hittas eller köps. Hopp kostar bränsle.
- Fri sikt i rymden. Fog of war finns bara på kartan. Stillastående objekt ligger kvar som senast kända läge, skepp syns bara medan de ses.
- Stationer är vänliga, neutrala eller fientliga. Gratis tankning hos vänliga, betalning hos neutrala.
- Skeppet kan bara byggas om vid en station med shipyard.
- En vänlig eller neutral station som anfalls kan sända nödanrop. En neutral station som får hjälp förblir neutral men ger rabatt och tillgång till sin shipyard under en tid.
- Pirater är fristående och aggressiva mot alla.

Bordning
- Bordning sker uppifrån, i samma vinkel som rymden.
- Vem som bordar bestäms genom att spelarna pratar. Vem som helst kan gå in eller ut medan skeppet ligger dockat.
- Den som nästan dör teleporteras hem och kan inte gå in igen under samma bordning. När alla är tillbaka får alla tillbaka sitt liv.
- Teleportern måste vara laddad för att spelaren ska kunna borda nästa gång.
- Mål är olika svåra att borda. En scanner visar det.
- Varje typ av mål har ett eget inbrottsspel på tid.

Skepp och uppgraderingar
- Spelarskeppet är alltid samma fregatt. Uppgraderingar syns på skrovet.
- Två sorters slots: hardpoints och system slots. Båda kan köpas eller hittas som loot.
- Fighter bay är en uppgradering. Darts är den minsta skeppsklassen.
- Skeppsklasser: Dart, Fighter, Interceptor, Gunboat, Frigate, Cruiser.

Grafik
- En pixelstil för hela spelet, alltid uppifrån, med dämpade färger. Stark färg används bara för ljus, skott och loot.
- Hela skeppet vrids som en bild. Pixlarna ritas inte om i ett rutnät.
- All grafik görs från grunden. Referensbilder används bara som inspiration.

## Miljö och begränsningar

- 2026-11-14: Agenten kan klona och pusha via git. GitHub-verktygen (gh och GitHub-kopplingen) fungerade inte i sessionen, så agenten kunde inte läsa eller ändra repoinställningar, till exempel GitHub Pages.

## Engångsåtgärder

- Klar 2026-11-14: `badbagel47.github.io` är tillåten i användarens molnmiljö, så att agenten kan kontrollera den publicerade sidan.
- Väntar: användaren slår på GitHub Pages för repot (Deploy from a branch, main, rot), om det blir valet i D-004.

## Lagar och regler

- 2026-11-14: Repot innehåller ingen kod som hanterar personuppgifter eller kakor. Designsidan laddar typsnitt från Google Fonts, vilket skickar besökarens IP-adress till Google om sidan publiceras. Se D-033.
