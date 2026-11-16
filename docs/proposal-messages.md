# Meddelanden och sensordata: förslag (D-187)

**Förslag, inte byggt.** Skrivet 2026-11-16. Det gäller D-187 (se över vad spelet och skeppet visar på skärmen, hur det prioriteras, och om sensordata ska få en egen del).

## Sammanfattning

- I dag kan sex olika sorters information visas på samma ställe, men bara två rader får plats överst. Viktiga varningar, som ett anfall på en egen station eller ett närmande fiendeskepp, kan då trängas undan av något mindre viktigt, till exempel att skeppet ligger dockat.
- Förslaget är tre nivåer med en fast ordning: **fara**, **händelse** och **läge**. Fara visas alltid först och kan inte trängas undan.
- Sensordata (fiender på väg, anfall på stationer, nödanrop, prissumma) får en egen remsa: **sensorremsan**. Vad den visar beror på vilka sensorer skeppet har köpt.
- Varje post ser sin egen information i sitt hörn, som i dag, men det som gäller hela besättningen visas likadant för alla.

## 1. Så fungerar det i dag

**Överst i mitten, två rader** (statusraderna). De väljs ur en lista i den här ordningen, och de två första visas:

1. Motorer utan energi (bara Captain)
2. En överladdning som väntar på posten
3. Hopp som laddas
4. Dockad, i position att docka, för fort för att docka, eller under dockning
5. Skeppets egen varning (låg sköld, skador, lite bränsle)
6. Nödanrop från en station
7. Anfall på en egen station (byggt 2026-11-15)
8. Fiendelarmet (antal fiender och hur snart de är här)

**Under statusraderna** visas tillfälliga meddelanden ("toasts"). Det finns drygt hundra sorter, från `SALVAGE · +40 CREDITS` till `RED ALERT ON DRIFT POST`. Alla ser likadana ut, bara färgen skiljer.

**Annat på skärmen:** pilar i skärmkanten mot allt som är känt, en minikarta uppe till höger, krediter och sektor uppe till höger, varje posts mätare nere i hörnen, knappar för det man kan göra nere till höger, och under bordning en egen rad överst om stället.

## 2. Det som inte fungerar

- **Två rader räcker inte.** När skeppet ligger dockat tar dockningsraden och skeppets varning de två platserna. Nödanrop, anfall på egna stationer och fiendelarmet syns då inte alls, fast de är det viktigaste.
- **Allt ser lika viktigt ut.** Ett köp och ett anfall visas på samma sätt. Det enda som skiljer är färgen.
- **Meddelandena försvinner av sig själva.** Ett meddelande som kom under en strid hinner försvinna innan någon läst det, och det finns ingen plats att se det igen.
- **Sensordata är utspritt.** Fiendelarmet står i statusraden, fiendernas hälsa visas vid skeppen (med Target Scanner), nödanrop i statusraden och på kartan. Det är svårt att få en samlad bild av läget.
- **Allt visas för alla.** Gunnern ser samma rader om dockning som Captain, fast bara Captain kan göra något åt det.

## 3. Förslag

### 3.1 Tre nivåer

| Nivå | Vad | Hur det visas |
|---|---|---|
| **Fara** | Det som kan kosta skeppet, en station eller en besättningsmedlem: fiender på väg, skeppet under eld, anfall på egen station med risk HIGH, låg hull, reaktorn i ett vrak | Överst, i rött, med ram. Försvinner först när faran är över. Får aldrig trängas undan |
| **Händelse** | Det som just hände: köp, upplock, dödade fiender, anseende som ändras, hopp som laddas | Som dagens meddelanden, men i en egen lista till vänster som sparar de fem senaste. Äldre tonas bort |
| **Läge** | Det som gäller just nu men inte är bråttom: dockad, i position att docka, överladdning redo | I postens egen del av skärmen, inte överst |

### 3.2 Sensorremsan

En smal remsa under krediterna uppe till höger, som visar det skeppets sensorer vet om omgivningen:

- **Fiender på väg:** antal och hur snart de är här. Utan Enemy Alarm visas bara de som syns på skärmen.
- **Egna stationer:** en rad per station under anfall, med risk och tid.
- **Nödanrop** från stationer i systemet.
- **Prissumma** på besättningen, och om bounty hunters är på väg.
- **Bojar och sonder** som rapporterar något nytt.

Vad remsan visar följer det man har köpt. Utan sensorer är den nästan tom. Enemy Alarm, Target Scanner och kommande sensorer (systemradarn i F-195) fyller den.

### 3.3 Vem ser vad

- **Alla** ser fara, händelser och sensorremsan.
- **Captain** ser dockning, kurs och hopp i sin egen del.
- **Gunner** ser mållistan och vapnens läge i sin.
- **Engineer** ser energi, skador och överladdning i sin.
- **Bordare** ser stället de är i, och fara från skeppet (skeppet under eld, fiender på väg) i en egen rad, så att de vet när de behöver komma tillbaka.

### 3.4 Loggen

En logg med de senaste händelserna går att öppna från menyn eller med en tangent. Den visar också meddelanden som hann försvinna. Det hjälper i co-op, där någon ofta tittar bort.

## 4. Byggordning

| Steg | Innehåll | Vad det ger |
|---|---|---|
| 1 | Fara får en egen plats överst som aldrig trängs undan. Dockningsraden flyttas till Captains del | Det viktigaste syns alltid. Ett litet steg som går att prova direkt |
| 2 | Sensorremsan, med det som finns i dag: fiendelarm, anfall på stationer, nödanrop, prissumma | Läget samlat på ett ställe |
| 3 | Händelselistan med de fem senaste, och loggen | Inget missas |
| 4 | Vad remsan visar följer köpta sensorer | Sensorer blir värda pengarna |

## 5. Frågor till dig

1. **Ska fara ha en egen plats som aldrig trängs undan?** Rekommendation: ja. Det är den viktigaste rättningen och den är liten.
2. **Var ska sensorremsan sitta?** Rekommendation: uppe till höger under krediterna, där minikartan redan är. Då finns allt om omgivningen på ett ställe.
3. **Ska det mesta i remsan kräva köpta sensorer?** Rekommendation: ja, men det som syns på skärmen visas alltid. Den som inte köpt något ska aldrig veta mindre än i dag.
4. **Ska det finnas en logg?** Rekommendation: ja, öppnad med L från skeppet. På L sitter i dag lampan vid bordning, så tangenten kan behöva bytas.
5. **Ska ett meddelande som bara gäller en post bara visas för den?** Rekommendation: ja, för läge. Fara och händelser visas för alla.
