# Skeppets dator för små besättningar: genomgång (D-186)

**Genomgång och förslag, inte byggt.** Skrivet 2026-11-16. Det gäller D-186 (hur skeppets dator skulle fungera i praktiken) och F-034 (autopilot på lediga poster, parkerad). Inget byggs förrän du har gått igenom det.

## Det som är bestämt

- Det ska synas när datorn sköter något.
- När man startar en omgång väljer man vilka roller datorn får sköta. Som standard är det ingen, så att spelare i co-op inte bara kan slå på datorn och slippa göra sitt jobb.
- En roll som datorn sköter är öppen för alla spelare att handla åt i butiken (D-189).

## Läget i dag

- En ensam spelare byter fritt mellan posterna. Det som ställts in på en post fortsätter när man lämnar den: gasen ligger kvar, energin står som den stod.
- Piratvågorna kommer mer än dubbelt så glest för en ensam spelare.
- Ingen post gör något av sig själv. Gunner som ingen sitter vid skjuter inte.

## Så skulle det se ut i praktiken

**Före start.** På sidan för nytt spel finns tre rutor: CAPTAIN, GUNNER, ENGINEER. Den som spelar ensam kryssar i GUNNER och ENGINEER och spelar själv som Captain, men kan fortfarande byta post när som helst. Datorn tar då den post spelaren lämnar, om den är ikryssad.

**Under spelet.** En post som datorn sköter har en liten skärm-ikon och ordet AUTO på sin flik uppe till vänster. Den som tar posten tar över direkt, och datorn släpper den.

**Vad datorn gör, post för post:**

| Post | Datorn gör | Datorn gör inte |
|---|---|---|
| Captain | Håller den kurs som är satt (C), håller farten låg nära stationer och vrak, och stannar när skeppet ligger dockat | Dockar, hoppar mellan system, väljer mål på egen hand |
| Gunner | Skjuter på den fiende Captain har märkt, annars den närmaste som skjuter på skeppet. Skjuter inte på någon som inte är fiende | Skjuter på stationer, använder raketer eller Heavy Laser |
| Engineer | Lagar det som är värst skadat, flyttar energi till sköld när skeppet blir beskjutet och tillbaka när det är lugnt | Använder sonder och bojar, laddar upp överladdning, hackar lås |

**Sämre än en människa.** Datorn reagerar en halv sekund senare, träffar ungefär hälften så ofta som en van spelare och lagar i en fast ordning i stället för det som är klokast just nu. En besättning på tre människor är alltid bäst.

**Under bordning.** Skeppet ligger dockat, så Captain gör ingenting. Gunner försvarar skeppet mot fiender som kommer. Engineer håller skölden uppe och lagar. Den som bordar kan alltså lämna skeppet och lita på att det inte står försvarslöst.

## Öppna frågor, med rekommendationer

1. **Tar datorn en ikryssad post av sig själv när ingen sitter där?** Rekommendation: ja. Annars måste den ensamma spelaren slå på datorn varje gång posten byts.
2. **Går valet att ändra under omgången?** Rekommendation: ja, från menyn, men bara när alla spelare är överens (eller när man spelar ensam). Då kan en spelare som går ifrån en stund låta datorn ta över, utan att någon kan slå på den bakom de andras rygg.
3. **Bestämmer datorn själv, eller bara det man pekat ut?** Rekommendation: lite av båda. Den följer det som är utpekat (Captains märke, satt kurs) och har enkla egna regler när inget är utpekat. Den gör aldrig något stort på egen hand, som att docka eller hoppa.
4. **Hur mycket sämre än en människa?** Rekommendation: tydligt sämre, enligt tabellen ovan, och samma för alla svårighetsgrader. Siffrorna provspelas.
5. **Vad gör den under bordning?** Rekommendation: försvarar och lagar skeppet, enligt ovan.
6. **Ska piratvågorna fortfarande vara glesare för en ensam spelare om datorn sköter två poster?** Rekommendation: ja, men något tätare än i dag när datorn hjälper till. Siffran bestäms vid provspel.
7. **Hur syns det?** Rekommendation: ordet AUTO på postens flik, och en svag färg på postens mätare. Datorns skott och lagningar ser ut som vanligt.

## Byggordning

| Steg | Innehåll | Vad det ger |
|---|---|---|
| 1 | Rutorna på sidan för nytt spel, och AUTO på flikarna | Valet och synligheten, utan att datorn gör något än |
| 2 | Gunner-datorn | Den post en ensam spelare saknar mest i strid |
| 3 | Engineer-datorn | Lagning och sköld när ingen hinner |
| 4 | Captain-datorn | Håller kursen medan spelaren skjuter eller lagar |

Varje steg går att provspela för sig. Steg 1 och 2 räcker troligen långt för den som spelar ensam.
