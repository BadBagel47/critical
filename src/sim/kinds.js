// Everything that exists in space, described as data. A new kind of thing or ship starts here.
// How each kind looks is described the same way in src/render/looks.js.

// Things: what stands still or drifts. The order here is the order they are stored and handled in.
//   hit      circles, in the thing's own pixels, that the frigate and shots run into
//   ports    where the frigate's nose can dock, in the thing's own pixels
//   lock     the break-in game that opens it (see breakin.js)
//   inside   it has an interior that the crew can board
//   onMap    the map remembers it as last seen, together with these extra fields
//   label    what it is called when it has no name of its own
//   persist  it is still there when the crew jumps away and comes back
export const THINGS = {
  rock: {
    hit: (rock) => [{ x: 0, y: 0, r: rock.r }],
    persist: true,
  },
  // Sprite is 80 x 140, nose up.
  wreck: {
    hit: [
      { x: 0, y: -40, r: 22 },
      { x: 0, y: 0, r: 28 },
      { x: 0, y: 40, r: 26 },
    ],
    ports: [{ x: -33, y: 10 }],
    lock: 'pipes',
    inside: true,
    onMap: () => ({}),
    label: 'WRECK',
    persist: true,
  },
  // Sprite is 192 x 192: a ring around a hub, with a docking arm on each side.
  station: {
    hit: [{ x: 0, y: 0, r: 80 }],
    ports: [
      { x: 0, y: -96 },
      { x: 0, y: 96 },
      { x: -96, y: 0 },
      { x: 96, y: 0 },
    ],
    // Where a hostile station has its guns: on two of the pads on the ring.
    guns: [
      { x: -54, y: -54 },
      { x: 54, y: 54 },
    ],
    lock: 'code',
    inside: true,
    onMap: (st) => ({ align: st.align, shipyard: st.shipyard, name: st.name }),
    label: 'STATION',
    persist: true,
  },
  // Sprite is 24 x 34.
  pod: {
    hit: [{ x: 0, y: 0, r: 12 }],
    ports: [
      { x: 0, y: -19 },
      { x: 0, y: 19 },
    ],
    lock: 'dial',
    onMap: () => ({}),
    label: 'CARGO POD',
    persist: true,
  },
  salvage: {},
  buoy: { persist: true },
};

// Ship classes, other than the crew's own frigate.
//   brain     how it flies and fights (see vessels.js)
//   tierHp    it gets tougher in later sectors
//   salvage   what it leaves behind: a fixed count, or one piece with some chance, worth `value` credits
//   aloof     it does not swerve to keep its distance to other ships
export const SHIPS = {
  fighter: {
    name: 'FIGHTER',
    brain: 'fighter',
    hp: 24,
    tierHp: true,
    radius: 13,
    speed: 135,
    attackSpeed: 160,
    turn: 2.4,
    dmg: 5,
    burst: 3,
    burstGap: 0.13,
    cooldown: 1.9,
    bounty: 5,
    boom: { size: 26, dur: 0.7 },
    salvage: { chance: 0.35, value: [10, 25] },
  },
  gunboat: {
    name: 'GUNBOAT',
    brain: 'gunboat',
    hp: 90,
    tierHp: true,
    radius: 20,
    speed: 85,
    turn: 1.2,
    dmg: 9,
    cooldown: 1.0,
    range: 380,
    bounty: 25,
    boom: { size: 40, dur: 0.7 },
    salvage: { count: 2, value: [20, 40] },
    // A destroyed gunboat is left drifting as a wreck that can be boarded.
    leavesWreck: true,
  },
  // Sprite is 96 x 168.
  cruiser: {
    name: 'CRUISER',
    brain: 'cruiser',
    hp: 1400,
    radius: 44,
    speed: 38,
    turn: 0.5,
    dmg: 8,
    cooldown: 1.2,
    range: 520,
    // Seconds between each pair of fighters it launches.
    launchEvery: 22,
    guns: [
      { x: -28, y: 6 },
      { x: 28, y: 6 },
      { x: 0, y: -58 },
    ],
    bounty: 500,
    boom: { size: 110, dur: 1.6 },
    salvage: { count: 6, value: [20, 80] },
    aloof: true,
    // Destroying it wins the game.
    boss: true,
  },
};
