# HANDOFF

Rules version: v1.6
Inventory: 2026-11-14
Project language: English (all text in the game and README)

## Nuläge

Spelet går att spela ensam: flyga fregatten, skjuta pirater, sköta energi och reparationer, byta fritt mellan de tre posterna, docka med vrak och borda dem uppifrån för att hämta bränsle och krediter. Vraken har ett inbrottsspel på tid som måste klaras före bordning. Det finns en gemensam karta med dimma, och Engineer har scannerpuls, sonder och radarbojar. Stationer, uppgraderingar, fler vapen och sektorer saknas än. Ingen människa har provspelat än, så balansen är otestad.

## Nästa steg

1. Användaren slår på GitHub Pages (se Engångsåtgärder).
2. Fortsätt enligt "Proposed runs" i BACKLOG.md.
3. Onlineläget (F-040) väntar på användarens motor.

## Mål

Ett co-op-spel online där upp till tre spelare delar på ett rymdskepp. Det ska också gå att spela ensam. Främst ett hobbyprojekt som inte är tänkt att släppas i någon spelbutik.

## Arbetssätt

Idéer spånas i chatten och samlas i designskissen. Det som ska byggas läggs i BACKLOG.md och körs i grupper efter godkännande.

## Publicering

GitHub Pages direkt från main, rotmappen. Spelet har inget byggsteg, så det som ligger på main är det som publiceras. Adress: https://badbagel47.github.io/critical/

Pages var inte påslaget 2026-11-14, så inget är publicerat än. Flytt till Cloudflare sker när nätverksmotorn byggs in.

## Dokumentkarta

- [docs/design/index.html](docs/design/index.html): designskissen (utkast 3), på svenska. Samma sida finns som privat sida hos användaren: https://claude.ai/artifact/Ebx9u3e5cy33EHWXoViYJz
- [docs/design/img/](docs/design/img/): exempelskärmar och skeppsbilder.
- [docs/design/tools/](docs/design/tools/): Python-skript som ritar bilderna. Kräver Pillow och typsnittet DejaVu Sans Bold. Kör `python3 frigate.py`, `python3 rot.py` och `python3 screens2.py`.
- [tools/export_assets.py](tools/export_assets.py): gör spelets bilder och pixeltypsnitt av ritskripten. Kör `npm run assets`.

## Kod

- `index.html` och `src/`: spelet. Ren JavaScript utan byggsteg.
- `src/sim/`: spellogiken, helt skild från bild och inmatning. Varje post skickar kommandon till `step()`. Det är här nätverksmotorn ska kopplas in.
- `src/sim/balance.js`: alla siffror för fart, skada och liknande.
- `src/render/`: skärmarna.
- `assets/`: bilder och typsnitt som skapas av `tools/export_assets.py`.

## Test

- `npm test`: tester av spellogiken.
- `npm run serve` och sedan `npm run smoke`: provkör spelet i en webbläsare. Kräver Playwright installerat globalt.

## Decisions

Spelet
- Namn: Critical ST8.
- Upp till tre spelare online. Går också att spela ensam, och då börjar spelaren som Captain.
- All text i spelet är på engelska.
- Inget moment pausar spelet. En pausknapp fryser världen för alla.
- Automatisk paus vid tappad anslutning sker först efter en stund. Gränsen prövas ut.
- Publicering: GitHub Pages så länge, flytt till Cloudflare när nätverksmotorn byggs in (2026-11-14).
- Styrning: tangentbord och mus. Agentens val, användaren har inte provat än.
- Onlineläget ska använda användarens egen motor, som byggs just nu och bygger på Cloudflares realtidstjänster. Målet är att ett gratiskonto ska räcka för det här kompisspelet (2026-11-14).

Poster
- Tre poster: Captain, Gunner, Engineer. "Post" betyder spelarens plats på skeppet, "station" betyder rymdstation.
- Captain flyger, dockar, skickar ut Darts och avgör när skeppet lägger ut och hoppar.
- Gunner sköter alla vapen.
- Engineer fördelar energi mellan vapen, sköld, motorer och reparation, och flyttar en reparationssymbol mellan skadepunkter på en bild av skeppet.
- Den som går in för att loota lämnar sin post ledig för någon annan och får tillbaka den när den är ombord igen.
- Första versionen har alla tre posterna och fritt byte mellan dem.
- En post som lämnas fortsätter som den ställdes in. Gasen ligger därför kvar när Captain lämnar sin post, så att en ensam spelare kan flyga och skjuta.

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

Bordning, agentens val som användaren inte har sett än (2026-11-14)
- Det som bärs blir kvar på platsen när någon teleporteras hem (se D-032).
- Valvdörren i ett vrak öppnas genom att hålla in F bredvid den, inte med ett eget inbrottsspel.
- Reaktorn räknar ner från första steget in. Vid noll sprängs vraket, alla teleporteras hem, ett dockat skepp skadas och ett nytt vrak dyker upp på annat håll.
- Skeppet kan inte lägga ut medan någon är kvar inne.
- Bränsle förbrukas av gasen. Tom tank ger ett skepp som nästan står still.

Karta, agentens val som användaren inte har sett än (2026-11-14)
- Scannerpuls, sonder och radarbojar finns från start tills butiken är byggd. Enligt designen ska de sedan köpas.
- Sonder och bojar fylls på av sig själva med tiden.
- Pilarna i skärmkanten visar bara pirater inom sikt och vrak som redan hittats.
- Kartan öppnas med M av vem som helst. Verktygen används från Engineer-posten.

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
- Väntar: användaren slår på GitHub Pages för repot på https://github.com/BadBagel47/critical/settings/pages (Deploy from a branch, main, rot).

## Lagar och regler

- 2026-11-14: Repot innehåller ingen kod som hanterar personuppgifter eller kakor. Designsidan laddar typsnitt från Google Fonts, vilket skickar besökarens IP-adress till Google om sidan publiceras. Se D-033.
