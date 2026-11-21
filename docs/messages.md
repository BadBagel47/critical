# Meddelanden i spelet (D-256)

Skapad av `node tools/messages.mjs` ur koden. Ändra inte för hand: kör verktyget igen när meddelanden ändras.

Spelet visar meddelanden på fyra ställen (D-187, besked MD1–MD5 2026-11-21):

- **Fara**, överst i mitten. Den trängs aldrig undan och visas för alla.
- **Läge**, under faran när det finns plats. Det som gäller en post visas bara för den.
- **Sensorremsan**, uppe till höger under minikartan: det skeppet vet om omgivningen.
- **Händelser**, tillfälliga rader under raderna överst. Alla sparas också i loggen på L, under SHIP'S MESSAGES.

## Fara

- anfall på en egen station med risk HIGH
- skeppets egen varning: en del kritisk, skrovet under 30 %, slut på bränsle
- fiendelarmet när fienderna är här (kräver Enemy Alarm)

## Läge

- ENGINES OFFLINE  ·  NO POWER
- JUMPING TO … IN … S
- IN POSITION TO DOCK
- TOO FAST TO DOCK
- DOCKING  ·  HOLD COURSE
- en överladdning som väntar på posten
- dockad vid en plats (för alla): vem som är ombord, låset, teleportern

## Sensorremsan

- … HOSTILE… IN SIGHT
- DISTRESS  ·  …  ·  … M  ·  …
- BOUNTY ON YOU  ·  … CR
- fiendelarmet med tid kvar (kräver Enemy Alarm)
- anfall på en egen station med risk LOW eller MEDIUM

## Händelser (125)

| Händelse | Text | Sort | Vem ser den |
|---|---|---|---|
| jobTaken | JOB TAKEN  ·  SEE THE LOG  ·  L | byte | alla |
| jobDone | JOB DONE  ·  +… CREDITS | bra | alla |
| jobFailed | JOB FAILED  ·  OUT OF TIME | fara | alla |
| boarded | BOARDING | varning | bara den det gäller |
| teleported | TELEPORTED HOME  ·  TELEPORTER CHARGING | fara | bara den det gäller |
| returned | BACK ON THE SHIP | bra | bara den det gäller |
| deposit | STOWED …  ·  +… FUEL  ·  +… CREDITS | byte | bara den det gäller |
| teleCharging | TELEPORTER CHARGING  ·  … S | teknik | bara den det gäller |
| lockedOut | TELEPORTED OUT  ·  NO WAY BACK IN THIS DOCKING | fara | bara den det gäller |
| recalled | UNDOCKED  ·  … TELEPORTED HOME | fara | alla |
| doorOpen | VAULT OPEN | byte | alla |
| wreckExploded | THE WRECK BLEW UP | fara | alla |
| lockOpen | pod / LOCK BYPASSED  ·  E TO BOARD | bra | alla |
| reactorShaken | BYPASS FAILED  ·  THE REACTOR LOSES … S /   ·  ONE MORE BLOWS THE WRECK | fara | alla |
| podLooted | POD OPEN  ·  +… CREDITS /   ·  +… FUEL / ) + (e.part ?  /  :  | byte | alla |
| podAlarm | THE POD ALARM IS RINGING  ·  PIRATES INCOMING | fara | alla |
| codeWrong | WRONG CODE | fara | alla |
| doorDisarmed | THE ALARM ON THE DOOR IS OFF | teknik | alla |
| reactorSteadied | REACTOR STEADIED  ·  … S MORE | teknik | alla |
| turretTurned | THE TURRET IS YOURS FOR A WHILE | teknik | alla |
| sentryNoFight | THE TURRET IS FOR A FIGHT  ·  NOTHING TO SHOOT AT HERE | varning | alla |
| foundOut | ALARM  ·  THEY KNOW YOU ARE HERE | fara | alla |
| guardAsleep | GUARD ASLEEP | teknik | alla |
| takeDown | GUARD TAKEN DOWN | teknik | alla |
| digitFound | DIGIT FOUND  ·  … TO GO / THE WHOLE CODE IS FOUND | teknik | alla |
| distress | DISTRESS CALL FROM … | byte | alla |
| distressSaved | … OWES YOU  ·  DISCOUNT FOR A WHILE / … IS SAFE  ·  +… CREDITS | bra | alla |
| salvage | SALVAGE  ·  +… CREDITS | byte | alla |
| breached | DOOR BREACHED  ·  EVERY GUARD HEARD THAT | fara | alla |
| sentryDown | TURRET DEPLOYED | teknik | alla |
| pulse | (inget meddelande) | – | alla |
| scanned | SYSTEM SCANNED  ·  … NEW ON THE MAP / SYSTEM SCANNED  ·  NOTHING NEW | teknik | alla |
| probe | PROBE AWAY | teknik | alla |
| buoy | RADAR BUOY DROPPED | – | alla |
| buoyLost | A RADAR BUOY WAS SHOT DOWN | fara | alla |
| starHeat | THE STAR BURNS THE SHIP  ·  TURN AWAY | fara | alla |
| haze | DUST AND ICE  ·  THE SYSTEM ENDS HERE | teknik | alla |
| found | (sätts i koden) | varning | alla |
| bought | IN THE STORES  ·  …  ·  INSTALL IT AT A SHIPYARD / BOUGHT  ·  … | bra | alla |
| cannotBuy | (sätts i koden) | varning | alla |
| refuelled | REFUELLED  ·  +… FUEL | byte | alla |
| repairedAll | SHIP REPAIRED | bra | alla |
| rearmed | ROCKETS REARMED | byte | alla |
| chart | STAR CHART  ·  …  ·  J FOR THE STAR MAP | teknik | alla |
| laneOpen | THE LANE TO … IS OPEN | bra | alla |
| probedSystem | PROBE REPORT  ·  …  ·  ON THE STAR MAP | teknik | alla |
| slotFound | FOUND AN EXTRA … SLOT  ·  … | bra | alla |
| installed | INSTALLED  ·  …… | bra | alla |
| removed | IN THE STORES  ·  … | teknik | alla |
| sold | SOLD  ·  …  ·  +… CREDITS | byte | alla |
| restocked | … RESTOCKED | byte | alla |
| shieldOn | SHIELD ON  ·  IT DRAWS A LITTLE FUEL | teknik | alla |
| scanStart | WARDEN SCAN  ·  HIDE THE GOODS  ·  MATCH THE WAVES / WARDEN SCAN | varning | alla |
| scanFooled | THE SCAN FOUND NOTHING | bra | alla |
| scanClear | SCAN DONE  ·  NOTHING FOUND | teknik | alla |
| scanFled | YOU FLED THE SCAN  ·  THE WARDENS TAKE IT AMISS | varning | alla |
| scanOver | (inget meddelande) | – | alla |
| smuggleCaught | CAUGHT  ·  THE WARDENS TOOK THE SMUGGLED GOODS | fara | alla |
| computerOn | SHIP | teknik | alla |
| computerOff | SHIP | teknik | alla |
| shieldOff | fuel / SHIELD OFF  ·  NO FUEL LEFT / SHIELD OFF | varning | alla |
| holdFire | …:  HOLD YOUR FIRE | varning | alla |
| fightBack | …  ·  FIGHTING BACK | fara | alla |
| standDown | …  ·  STANDING DOWN | bra | alla |
| stationHostile | … IS NOW HOSTILE | fara | alla |
| stationFightsBack | BYPASS FAILED  ·  … FIGHTS BACK | fara | alla |
| stationTaken | … IS YOURS  ·  ITS SECURITY BLEW ITS OWN GUNS / … IS YOURS  ·  SHIPYARD OPEN | bra | alla |
| gunDown | STATION GUN DESTROYED | byte | alla |
| noRockets | OUT OF ROCKETS | varning | alla |
| dartLost | A DART WAS SHOT DOWN | fara | alla |
| dartBuilt | ALL DARTS READY  ·  … OF … / A NEW DART IS READY  ·  … OF … | teknik | bara gunner |
| jumpCharging | JUMP DRIVE CHARGING  ·  … | teknik | alla |
| jumpCancelled | JUMP CANCELLED | varning | alla |
| cannotJump | CANNOT JUMP  ·   | varning | alla |
| jumped | ARRIVED IN  | – | alla |
| alarm | ENEMY ALARM  ·  … … INCOMING / s own kills are news: a pirate pays, and anyone else is someone / crew / pirate / … DESTROYED  ·  THAT WILL BE REMEMBERED / fighter / … DESTROYED  ·  +… CREDITS | fara | alla |
| standing | …  ·  … | bra | alla |
| stationFell | … HAS FALLEN… | fara | alla |
| siege | … …  ·  …  ·  RISK …  ·  … MIN | fara | alla |
| siegeBeaten | … BEAT THE ATTACK OFF | bra | alla |
| ore | ORE TO THE HOLD | byte | alla |
| refined | ORE REFINED  ·  +… FUEL | teknik | alla |
| oreSold | ORE SOLD  ·  +… CREDITS | byte | alla |
| surgeBroken | HIT  ·  THE BOOST LOST ITS CHARGE | fara | alla |
| jumpBroken | HIT  ·  THE JUMP STARTS OVER | fara | alla |
| boardersMet | BOARDERS INSIDE  ·  STOP THEM BEFORE THEY TAKE THE MAINFRAME | fara | alla |
| turretMended | A TECHNICIAN SWITCHED A TURRET BACK ON | varning | alla |
| hackStarted | (inget meddelande) | – | alla |
| hackDone | (sätts i koden) | teknik | alla |
| cannotHack | (sätts i koden) | varning | bara den det gäller |
| traced | TRACED  ·  THE ALARM IS RAISED | fara | alla |
| redAlert | RED ALERT ON …  ·  IT CALLS FOR HELP | fara | alla |
| huntersIn | hunter / BOUNTY HUNTERS JUMPED IN / THEY SENT SHIPS AFTER YOU | fara | alla |
| bounty | … PUT A BOUNTY ON YOU  ·  … CREDITS | fara | alla |
| bountyPaid | BOUNTY PAID  ·  THE HUNTERS GIVE UP | bra | alla |
| bountyGone | THE BOUNTY IS DROPPED  ·  NOBODY WANTS IT ANY MORE | bra | alla |
| fixStarted | REPAIRS STARTED | teknik | alla |
| fixDone | …  ·  … | bra | alla |
| gunOn | GUN SWITCHED ON | bra | alla |
| defenseBought | DEFENCE UPGRADED | bra | alla |
| distressHeld | … HELD OUT ON ITS OWN | – | alla |
| stationPeace | … DEALS WITH YOU AGAIN | bra | alla |
| stationClosed | … WILL NOT LET YOU ABOARD | varning | bara den det gäller |
| toolNotReady | (sätts i koden) | varning | alla |
| noPower | NO FREE POWER  ·  LOWER ANOTHER SYSTEM FIRST | varning | alla |
| surgeReady | BOOST READY  ·  CAPTAIN PRESSES Z | teknik | alla |
| surgeUsed | BOOST | teknik | alla |
| surgeCooling | BOOST COOLING  ·  … S | varning | alla |
| surgeNoPower | THE ENGINES HAVE NO POWER FOR A BOOST | varning | alla |
| powerLost | REACTOR DAMAGED  ·  POWER LOST | fara | alla |
| postTaken | … IS HELD BY …  ·  THEY CAN SWAP BY ASKING FOR YOUR POST | varning | bara den det gäller |
| playerJoined | … JOINED THE CREW | teknik | alla |
| playerLeft | … LEFT THE CREW | – | alla |
| ringTurning | THE RING IS TURNING YOU TO THE BRIDGE | teknik | bara den det gäller |
| lockWait | THE AIRLOCK IS OPENING  ·  A MOMENT | teknik | bara den det gäller |
| lockBlocked | SOMEONE IS IN THE DOORWAY | varning | alla |
| floor | DOWN IN THE BASEMENT / ON THE MIDDLE FLOOR / ON THE TOP FLOOR | – | bara den det gäller |
| powerOut | SWITCHGEAR BLOWN  ·  POWER OUT  ·  THEY HEARD IT / POWER OUT  ·  QUIETLY | fara | alla |
| powerFound | A GUARD FOUND THE SWITCHGEAR OFF | fara | alla |
| pressure | THE GUARDS FALL BACK TO THE WAYS UP / DRONES ARE LET OUT OF THE HANGAR / NO DRONES  ·  THE HANGAR IS OUT / THE BASE IS CALLING FOR HELP  ·  STOP IT IN COMMS ON TOP | varning | alla |
| callStopped | THE CALL FOR HELP IS STOPPED | bra | alla |
| hangarOut | THE DRONE HANGAR IS OUT OF USE | bra | alla |
| reliefComing | HELP JUMPED IN  ·  IT MAKES FOR A CARGO ARM | fara | alla |
| reliefDocked | HELP HAS DOCKED  ·  MORE GUARDS INSIDE | fara | alla |
| reliefLost | THE SHIP WITH THE HELP IS GONE | bra | alla |
