# AGENTS.md

This repo follows the global agent rules:
https://raw.githubusercontent.com/BadBagel47/agent-rules/main/AGENTS.md

Read them at the start of every session. If the link cannot be read, fetch AGENTS.md from the repo BadBagel47/agent-rules via GitHub instead.

- Project information: [HANDOFF.md](HANDOFF.md)
- Backlog: [BACKLOG.md](BACKLOG.md)

## Project rules

- Regelboken (godkänd av användaren 2026-11-16, D-220): alla spelregler samlas i `docs/rules.md`, en kort mening per regel med eget nummer (R-001 …), status (bestämd, förslag, byggd, ersatt) och varifrån beslutet kommer. Läs den innan arbetet börjar, och kontrollera varje nytt beslut mot den. Ett beslut som ändrar en regel skrivs in där i samma commit, och den gamla regeln märks som ersatt med en hänvisning. Förslagsdokumenten är underlag; det som gäller står i regelboken. Varje byggd regel kontrolleras av ett test med regelns nummer i namnet. Tills `docs/rules.md` finns gäller besluten i HANDOFF.md och förslagsdokumenten som förut.
- Ekonomibladet (användaren 2026-11-16): `docs/economy.md` hålls i takt med spelet. En ändring som påverkar ekonomin (priser, inkomster, loot, bränsle, vad som finns var i världen) uppdaterar bladet och dess modell i `tools/economy.mjs` i samma commit. Ett beslut om ekonomin som ändrar bladet byggs in i spelet, så att bladet och spelet alltid säger samma sak.
