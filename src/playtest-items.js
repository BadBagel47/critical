// The play-test list (F-222, D-288): what is built but not yet tried, each with what to do, where, the questions
// to answer and a link that starts the right situation. One list for every page: the play-test page shows it,
// and Playtest (network-kit, R-1240) lets the tester start each test and report it from the game or a design
// test. When something is built that should be played, it is added here; when the user has tried it, it goes.
//   group  the heading it is listed under on the play-test page
//   id     the backlog's or the rule book's ID, so that the answer can be put where it belongs
//   where  'dator', 'iPad' or both
//   links  [text, address]: the addresses work from every page, since they start at the site's root
//   ask    the question, or a list of them: each gets a field of its own in Playtest

// The site's root: the folder above src/, wherever the site is served from.
const ROOT = new URL('../', import.meta.url).pathname;
const at = (path) => ROOT + path;

export const ITEMS = [
  {
    group: 'Spelet',
    id: 'B-282, B-259',
    title: 'Snabbare grafik och markören med många skepp',
    where: 'dator',
    steps: [
      'Starta, och vänta tills piraterna kommer.',
      'Läs av FPS, SLOWEST FRAME och SCALE uppe till vänster.',
      'Flytta markören medan många skepp är nära.',
    ],
    links: [['Starta med pirater och mätare', at('?test&call=fighters,gunboat&fps')]],
    ask: ['Hur många bilder i sekunden visar mätaren?', 'Blir markören fortfarande långsam med många skepp?'],
  },
  {
    group: 'Spelet',
    id: 'B-281',
    title: 'Musiken på startskärmen i Brave',
    where: 'dator',
    steps: [
      'Öppna spelet. Startskärmen ska säga PRESS ANY KEY FOR SOUND.',
      'Bläddra i menyn med pilarna och släpp tangenten.',
    ],
    links: [['Öppna spelet', at('')]],
    ask: ['Startar musiken?', 'Försvinner texten PRESS ANY KEY FOR SOUND?'],
  },
  {
    group: 'Spelet',
    id: 'F-278',
    title: 'Områdena på stjärnkartan',
    where: 'dator',
    steps: [
      'Tryck J för stjärnkartan.',
      'Se områdena ALPHA till DELTA och gränserna ut från fristaden.',
      'Klicka på ett system: panelen säger vilket område det ligger i.',
    ],
    links: [['Starta i testläget', at('?test')]],
    ask: 'Är områdena lätta att se och förstå?',
  },
  {
    group: 'Spelet',
    id: 'F-279',
    title: 'Försvar som byggs upp själv',
    where: 'dator',
    steps: [
      'Tryck 6 för ett anfall på din egen bas, och se hur den försvarar sig.',
      'Ta en annan bas genom att borda den och ta mainframen: dess torn ska sprängas, och meddelandet säger det.',
      'Köp torn till basen i mainframen.',
    ],
    links: [
      ['Anfall på din bas', at('?test&call=siege')],
      ['Starta i testläget', at('?test')],
    ],
    ask: [
      'Känns det logiskt att bygga upp försvaret själv?',
      'Två torn i lugna system och sex längre ut, är det lagom?',
    ],
  },
  {
    group: 'Spelet',
    id: 'F-244, F-209',
    title: 'Standardbasen och fraktskeppets insida',
    where: 'dator',
    steps: ['Docka vid CHARTER TEST DOCK och gå in i basen.', 'Borda fraktskeppets vrak och gå igenom det.'],
    links: [['Starta i testläget', at('?test')]],
    ask: 'Hur känns basens tre våningar och fraktskeppet?',
  },
  {
    group: 'Spelet',
    id: 'F-208',
    title: 'Basens insida som i designtestet',
    where: 'dator',
    steps: [
      'Docka vid CHARTER TEST DOCK och gå in.',
      'Gå runt på mittenvåningen, och ta hissen eller trappan ner till källaren och upp till toppen.',
      'Gå också in på en fientlig bas: tryck 6 eller borda en pirats bas.',
    ],
    links: [['Starta i testläget', at('?test')]],
    ask: 'Känns våningarna som i designtestet: ljus mitt, smutsig källare och kall topp? Saknas något?',
  },
  {
    group: 'Spelet',
    id: 'F-085',
    title: 'Tom tank vid asteroiderna',
    where: 'dator',
    steps: [
      'Du startar vid asteroiderna med tom tank.',
      'Bryt malm och se att den blir bränsle så att du kan hoppa vidare.',
    ],
    links: [['Starta med tom tank', at('?test&at=rocks&nofuel')]],
    ask: 'Går det att ta sig vidare utan att fastna?',
  },
  {
    group: 'Spelet',
    id: 'R-1239',
    title: 'De nya tangenterna',
    where: 'dator',
    steps: [
      'Q dockar och avdockar (Captain), E går ombord och använder saker inne, F tänder ficklampan inne, L öppnar loggen.',
      'Som Gunner: byt vapen med Q och med mushjulet.',
      'H visar alla tangenter.',
    ],
    links: [['Starta i testläget', at('?test')]],
    ask: 'Sitter tangenterna rätt i handen?',
  },
  {
    group: 'Spelet',
    id: 'D-052',
    title: 'Huvudstoryn i spelet',
    where: 'dator',
    steps: [
      'Starta ett nytt spel (inte testläget). Ett meddelande säger att någon väntar i fristaden.',
      'Tryck L för loggen.',
      'Docka vid fristadens bas och läs scenen. Följ sedan storyn med stjärnkartan (J), där nästa system är markerat.',
      'Vid ett val: välj med 1 eller 2.',
    ],
    links: [['Öppna spelet', at('')]],
    ask: 'Hur känns det att följa storyn i spelet: loggen, korten och markeringen på kartan?',
  },
  {
    group: 'Designtester',
    id: 'F-283, D-261',
    title: 'Ljus, skuggor och effekter',
    where: 'dator och iPad',
    steps: ['Växla mellan A, B och C.', 'Tryck Många ljus och partiklar, och läs av bilder i sekunden i B och C.'],
    links: [['Öppna designtestet', at('docs/design/prototypes/light.html')]],
    ask: [
      'GR3: Vilken version känns bäst, A, B eller C?',
      'Hur många bilder i sekunden i B och C med många ljus, på den här enheten?',
    ],
  },
  {
    group: 'Designtester',
    id: 'D-262',
    title: 'Pekskärmen',
    where: 'iPad',
    steps: ['Öppna i liggande läge på iPad.', 'Prova spakarna och de tre sätten för Gunner att sikta.'],
    links: [['Öppna designtestet', at('docs/design/prototypes/touch.html')]],
    ask: [
      'P6: Vilket sikte för Gunner kändes bäst, A, B eller C?',
      'P7: Fasta eller flytande spakar, och vilken storlek?',
      'P8: Ska gasen ligga kvar när spaken släpps, eller gå tillbaka till noll?',
    ],
  },
  {
    group: 'Designtester',
    id: 'D-274, F-276',
    title: 'Storyn i uppdragstestaren',
    where: 'dator eller iPad',
    steps: [
      'Välj Berättelse och läs en story.',
      'Byt frö och kartstorlek. Titta på kartan: storyn ska gå genom alla områden.',
    ],
    links: [['Öppna testaren', at('docs/design/prototypes/missions.html?premise=convoy')]],
    ask: ['Hur känns berättelsen?', 'Är ledtrådarna till mål man hittar själv lagom svåra?'],
  },
  {
    group: 'Designtester',
    id: 'D-280',
    title: 'Röstprovet',
    where: 'dator eller iPad',
    steps: ['Välj Berättelse och tryck Spela hela storyn.'],
    links: [['Lyssna på röstprovet', at('docs/design/prototypes/missions.html?size=medium&seed=4&premise=convoy')]],
    ask: 'VO4: ska storyn ha röster i spelet?',
  },
];
