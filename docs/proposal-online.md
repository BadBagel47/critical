# Onlineläget: besättningen, sparningen och rummen

Underlag för onlineläget (F-040), från förberedelserna D-263, D-266, D-267, D-268 och D-270 (2026-11-19). Det som gäller står i regelboken (`docs/rules.md`, R-1241 till R-1250). Rummen och nätet sköts av network-kit (version 0.15.0, se network-kits `docs/INTEGRATION.md`). Spelets egen del byggs i F-040 och D-269.

## 1. Hur spelet körs

- Den som skapar rummet är **värd**. Värdens webbläsare kör spelet, och de andra skickar bara sina knapptryck och ser det värden skickar (network-kits *host-run*).
- Värden ger rummet hela läget med jämna mellanrum. Det är samma packade form som en sparning (D-263): insidorna går som frö och ändrade rutor, så att läget är ungefär 40–60 kB och inte 160 kB.
- Tappar värden anslutningen tar en annan spelare över från det senaste läget efter några sekunder (network-kits *takeover*).

## 2. Vem är vem (D-267)

- Spelet har upp till tre spelare, 0–2, och varje spelare har sin egen roll för pengarna: spelare 0 Captain, 1 Gunner och 2 Engineer (`rolesOf`). Pengar och utrustning hör alltså till platsen i besättningen, inte till personen (ON4, R-1242).
- network-kit ger varje deltagare ett fast id i rummet. Värden håller en tabell från deltagarens id till spelarens nummer, och den ligger i rummets delade data, så att en ny värd har samma tabell.
- En ny deltagare får den första platsen i besättningen som ingen har, eller en vars spelare är borta. En deltagare som kommer tillbaka (network-kits `back`, eller `join` med `returning`) får samma plats igen.
- När en sparad omgång fortsätter får den som har samma namn som i sparningen sin gamla plats och samma post föreslagen (R-1246, `postOf`). Andra tar de lediga platserna.

## 3. När någon tappar anslutningen (D-266, ON2)

- Posten blir ledig direkt, så att någon annan kan ta den (R-1241, `dropPlayer`).
- Spelaren finns kvar i besättningen med sina egna pengar (R-1242).
- En bordare som är inne skickas hem när väntetiden är slut, 60 sekunder, samma som network-kits *grace* (R-1243, `stepAway`).
- Svårigheten räknar bara dem som är anslutna (R-1244).
- Kommer spelaren tillbaka får den sin gamla post om den är ledig, annars en annan ledig (`backPlayer`).

## 4. Sparningen (D-268, ON3)

- Värden sparar som i dag, vid dockning och när någon väljer att spara.
- Varje gång värden sparar skickas sparningen också till alla spelare, och var och en håller den i sin webbläsare, så att vem som helst av dem kan fortsätta en annan dag (R-1245). Den går att exportera som fil som förut.
- Sparningens lista visar datum, system, tid, pengar och vilka som hade vilken post (`crewOf`), så att man ser vilken sparning som hör till vilken omgång.
- Fortsätter två spelare var för sig blir det två olika omgångar. Det är tillåtet.
- network-kits rum håller det senaste läget i ett dygn efter att alla har gått, så att den som tappar anslutningen kan komma in i samma rum igen.

## 5. Skärmarna (D-270)

Designskissen är `docs/design/prototypes/online.html`: skapa ett rum (med en ny omgång eller en sparning), länk, QR-kod och kod att dela, gå med med kod eller länk, välja post, vänta på värden, när någon tappar anslutningen, och när en sparning skickas till alla. Frågorna om skärmarna står i backloggen under D-270.

## 6. Kvar till F-040 och D-269

- Spelets Worker med rummen och sidorna på samma adress (D-269, fråga OL2).
- Kopplingen mellan network-kits händelser och funktionerna ovan: `peer` `drop` ger `dropPlayer`, `back` ger `backPlayer`, och `join` ger en plats.
- Utjämning och förutsägelse för den egna styrningen (D-264).
- Integritetstexten (F-271) och tester med flera webbläsare (F-272).
