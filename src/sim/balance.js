// Tuning numbers for the rules of the game. What each kind of thing and ship is like is in kinds.js.
export const B = {
  // frigate
  HULL_MAX: 200,
  SHIELD_MAX: 100,
  SHIP_RADIUS: 32,
  ACCEL: 70,
  DRAG: 0.55,
  REVERSE: 0.35,
  TURN_RATE: 1.25,
  TURN_SMOOTH: 6,
  THROTTLE_RATE: 0.9,
  // The overcharge: how long it takes to build up, how long it lasts, how long it cools, and what it gives.
  SURGE_CHARGE: 6,
  SURGE_TIME: 5,
  SURGE_COOL: 20,
  SURGE_WEAPONS: 1.8,
  SURGE_ENGINES: 1.7,
  SURGE_SHIELD: 0.4,
  SURGE_RECHARGE: 3,
  // Marks: how near the aim an enemy has to be for the Gunner to mark it, how far off the Captain can mark
  // one, and how much harder the crew's shots hit the one the Captain has marked.
  MARK_REACH: 70,
  MARK_RANGE: 1200,
  MARK_BONUS: 1.15,
  // A system that the Engineer gives no power does not work at all.
  ENGINE_POWER: [0, 0.6, 0.85, 1.0, 1.25],
  // standing with factions and free stations, from -100 to 100. At or above `friendly` a side is friendly.
  // At or below each of the others it turns wary (higher prices), closed (no trade) and hostile (opens fire).
  // A bad standing mends by itself up to `mends`, which is still wary.
  STANDING: { friendly: 50, wary: -20, closed: -50, hostile: -80, mends: -30 },
  // what moves the standing: shooting a station or a ship, destroying a ship, answering a distress call,
  // destroying a pirate, and how fast a bad standing mends by itself, per second.
  STANDING_LOSS: { stationHit: 10, shipHit: 2, shipKill: 25 },
  STANDING_GAIN: { rescue: 20, pirate: 0.5, forgive: 0.05 },
  WARY_PRICE: 1.5,
  // a side that the crew shoots at warns them first. A hit after the warning, but not in the first moment
  // after it, starts a fight that lasts this long after the crew's last shot
  WARNING_TIME: 30,
  WARNING_GRACE: 1.5,
  GRUDGE_TIME: 25,
  // how far away a ship comes to help its own side, how near an enemy has to be for an unarmed ship to run,
  // how near a fight that is not theirs ships give up their errand, and how far they fly before they jump out
  HELP_RANGE: 1200,
  FLEE_RANGE: 420,
  AVOID_RANGE: 600,
  FLEE_DISTANCE: 650,
  // how long a player's wish for a post that someone else holds stands, so that two players can swap
  SWAP_TIME: 6,
  // power
  POWER_TOTAL: 8,
  POWER_MAX_PER_SYSTEM: 4,
  SYSTEMS: ['weapons', 'shields', 'engines', 'repair'],
  // shields
  SHIELD_DELAY: 2.5,
  SHIELD_RECHARGE: [0, 3, 6, 10, 15],
  // How many seconds a full shield takes to fall when it has no power. Not at once, so that a slip is not a disaster.
  SHIELD_DROP: 2,
  // pulse laser
  FIRE_INTERVAL: 0.2,
  WEAPON_POWER: [0, 0.6, 0.85, 1.0, 1.3],
  BOLT_SPEED: 520,
  BOLT_TTL: 1.0,
  BOLT_DMG: 6,
  TURRET_SLEW: 7,
  // repair
  REPAIR_RATE: [0, 5, 9, 14, 20],
  HULL_REPAIR_SHARE: 0.3,
  CREW_SPEED: 28,
  NODE_DMG_MULT: 2.2,
  NODE_FACTOR: { ok: 1, damaged: 0.7, critical: 0.4 },
  // pirates
  FIRST_WAVE_DELAY: 12,
  WAVE_INTERVAL: 40,
  WAVE_INTERVAL_MIN: 28,
  MAX_PIRATES: 5,
  // Fewer people on board means more time between waves, so a small crew can still leave the ship.
  PIRATE_PACE: { 1: 2.2, 2: 1.4, 3: 1 },
  PIRATE_BOLT_SPEED: 290,
  PIRATE_BOLT_TTL: 1.5,
  // docking
  // how near a port the nose has to be, how slow the ship has to go, and how fast a docked ship is
  // pulled the last bit in to the port and turned to face it
  DOCK_RANGE: 48,
  DOCK_SPEED: 32,
  DOCK_PULL: 70,
  // seconds for a station's docking arm to fold out or in
  ARM_TIME: 0.8,
  DOCK_TURN: 1.6,
  DOCK_GUIDE_RANGE: 320,
  // collisions
  RAM_SPEED: 60,
  RAM_DMG: 0.12,
  // fuel and loot
  FUEL_MAX: 100,
  FUEL_START: 60,
  FUEL_BURN: 0.2,
  ADRIFT_FACTOR: 0.2,
  CELL_FUEL: 25,
  CRATE_CREDITS: [30, 70],
  VAULT_CREDITS: [90, 160],
  // boarding
  CREW_HP: 100,
  CREW_SPEED_FOOT: 72,
  CREW_RADIUS: 5,
  CARRY_MAX: 3,
  CARRY_SLOW: 0.08,
  TELEPORT_HP: 15,
  TELEPORT_COOLDOWN: 45,
  RIFLE_INTERVAL: 0.22,
  RIFLE_DMG: 10,
  RIFLE_SPEED: 270,
  RIFLE_TTL: 0.9,
  GRENADES: 3,
  GRENADE_RANGE: 130,
  GRENADE_SPEED: 170,
  GRENADE_FUSE: 0.35,
  GRENADE_RADIUS: 38,
  GRENADE_DMG: 45,
  GRENADE_SELF_DMG: 30,
  // How many tiles the small radar reaches that the Captain carries when boarding.
  RADAR_REACH: 8,
  // Light in a dark place. A boarder sees a little around them, and further where their lamp points.
  LAMP_NEAR: 26,
  LAMP_RANGE: 150,
  LAMP_ANGLE: 0.5,
  // A flare is thrown, bounces off walls and burns for a while. It fades over the last seconds.
  FLARES: 3,
  FLARE_RANGE: 150,
  FLARE_SPEED: 210,
  FLARE_BURN: 30,
  FLARE_FADE: 8,
  FLARE_LIGHT: 125,
  GUARD_HP: 30,
  GUARD_SPEED: 46,
  GUARD_SIGHT: 170,
  GUARD_COOLDOWN: 1.15,
  GUARD_DMG: 8,
  GUARD_BOLT_SPEED: 185,
  // How far a guard hears a shot from another guard, how many tiles it looks for cover within, and how long
  // it goes on looking for an intruder that it no longer sees.
  GUARD_HEARING: 150,
  // What a guard that has noticed nobody sees: this far to each side of straight ahead, this far in the
  // dark, and this near all round. How long it has to watch a boarder to be sure, how far its round may
  // take it in steps, how long it stops at each end of it, and how long it looks each way.
  GUARD_FOV: 0.85,
  GUARD_SIGHT_DARK: 58,
  GUARD_FEEL: 20,
  GUARD_NOTICE: 1,
  GUARD_ROUND: 22,
  GUARD_PAUSE: 4.5,
  GUARD_LOOK: 1.5,
  // The tranquilliser gun: darts for each boarding, how fast one flies, and how long a guard sleeps.
  TRANQ_DARTS: 6,
  TRANQ_SPEED: 240,
  TRANQ_SLEEP: 30,
  TRANQ_INTERVAL: 0.6,
  // How near a boarder has to be to take a sleeping guard down, and how far a rifle shot is heard.
  TAKE_DOWN_REACH: 16,
  SHOT_HEARD: 260,
  GUARD_REACH: 6,
  GUARD_FORGET: 9,
  TURRET_HP: 45,
  TURRET_SIGHT: 220,
  TURRET_TURN: 2.6,
  TURRET_COOLDOWN: 0.85,
  TURRET_DMG: 9,
  TURRET_BOLT_SPEED: 210,
  // A turret watches a narrow cone straight ahead. Once someone has stepped into it, or the alarm has gone,
  // it follows them within a wider arc, for a while after it last saw them. On a station it cannot be
  // destroyed, only put out for a while by a grenade, or turned to the crew's side by the Engineer.
  TURRET_FOV: 0.32,
  TURRET_ARC: 1.15,
  TURRET_HOLD: 4,
  TURRET_OUT: 20,
  TURRET_TURNED: 15,
  TURRET_TURN_TIME: 2.5,
  // What the post a boarder left gives them inside: the Gunner's rifle hits harder, and the Engineer is
  // quicker at everything that is done with a lock or a machine.
  ROLE_RIFLE: 1.25,
  ROLE_HACK: 1.5,
  // How long the Engineer takes to switch off an alarmed door, and how many of them a station has at most.
  DISARM_TIME: 2.5,
  ALARMED_DOORS: 3,
  // How long the Engineer takes to steady the reactor of a wreck, and how much time that buys, once.
  STEADY_TIME: 3,
  STEADY_GAIN: 60,
  // A camera sweeps from side to side and gives the crew away, but hurts nobody.
  CAMERA_RANGE: 118,
  CAMERA_FOV: 0.38,
  CAMERA_SWEEP: 0.9,
  CAMERA_SPEED: 0.7,
  // How long a guard looks about where it has seen a light, and how long the crew's own turret stays once
  // the fight is over.
  GUARD_CURIOUS: 3.5,
  SENTRY_LINGER: 6,
  DOOR_CUT_TIME: 3,
  REACTOR_TIME: [0, 170, 150, 130],
  // A failed bypass of a wreck's lock shakes the reactor: it costs this much of its time, and the third one
  // blows the wreck up.
  LOCK_FAIL_REACTOR: 40,
  LOCK_FAILS_BLOW: 3,
  WRECK_BLAST_DMG: 60,
  // break-in game, seconds per difficulty
  BREAKIN_TIME: [0, 60, 50, 42],
  // map, scanner pulse, probes and buoys
  MAP_HALF: 2800,
  MAP_CELL: 100,
  VISION_SHIP: 420,
  PULSE_RADIUS: 1100,
  PULSE_TIME: 4,
  PULSE_COOLDOWN: 25,
  PROBE_STOCK: 3,
  PROBE_REGEN: 50,
  PROBE_RADIUS: 380,
  PROBE_SPEED: 260,
  PROBE_RANGE: 2600,
  PROBE_LINGER: 12,
  BUOY_STOCK: 2,
  BUOY_RADIUS: 520,
  BUOY_HP: 20,
  BUOY_DANGER: 150,
  BUOY_DRAIN: 10,
  // stations
  STATION_RANGE: 460,
  // A station with enemy ships this close is in a fight, and takes no offence at stray shots from the crew.
  STATION_FIGHT: 900,
  // The same goes for a ship with one of its enemies this close.
  SHIP_FIGHT: 700,
  STATION_GUN_HP: 45,
  STATION_GUN_COOLDOWN: 2.2,
  // Pirate strongholds are better armed than the stations that trade.
  STATION_GUN_DMG: 3,
  PIRATE_STATION_GUN_DMG: 6,
  STATION_GUN_SPREAD: 0.1,
  STATION_VISION: 700,
  // every station has a hull and a shield. The shield comes back after a pause, the hull and guns more slowly.
  STATION_HP: 1500,
  STATION_SHIELD: 200,
  STATION_SHIELD_DELAY: 5,
  STATION_SHIELD_RECHARGE: 5,
  STATION_REPAIR_DELAY: 20,
  STATION_REPAIR: 2,
  FUEL_PRICE: { friendly: 0, neutral: 1 },
  REPAIR_PRICE: { friendly: 0.25, neutral: 0.5 },
  ROCKET_PRICE: { friendly: 2, neutral: 4 },
  CHART_PRICE: { friendly: 100, neutral: 150 },
  TAKEOVER_TIME: 4,
  // more weapons
  WING_BOLT_DMG: 4,
  HEAVY_CHARGE: 1.3,
  HEAVY_DMG: 70,
  HEAVY_RANGE: 620,
  HEAVY_WIDTH: 12,
  HEAVY_COOLDOWN: 0.6,
  ROCKET_LOAD: 8,
  ROCKET_INTERVAL: 0.6,
  ROCKET_SPEED: 240,
  ROCKET_TURN: 3.5,
  ROCKET_TTL: 3,
  ROCKET_DMG: 34,
  ROCKET_RADIUS: 36,
  ROCKET_LOCK: 130,
  // pirates in later sectors
  TIER_HP: 0.15,
  MAX_WRECKS: 5,
  // darts
  DART_COUNT: 3,
  DART_HP: 18,
  DART_SPEED: 175,
  DART_TURN: 3.6,
  DART_DMG: 3,
  // seconds of quiet after a fight before autolaunch calls the Darts home
  DART_QUIET: 5,
  DART_COOLDOWN: 0.35,
  DART_RANGE: 430,
  DART_REGEN: 40,
  DART_LAUNCH_GAP: 0.4,
  // sectors
  JUMP_FUEL: 25,
  JUMP_CHARGE: 8,
  // enemy alarm range per level
  ALARM_RANGE: [0, 900, 1400, 1400],
  // break-in game for stations: a code that the Engineer screen shows and that changes now and then
  CODE_TIME: 50,
  CODE_LEN: 4,
  CODE_DIGITS: 6,
  // The Engineer finds the code one digit at a time, by stopping a needle in a mark on a ring. Every ring is a
  // little faster and its mark a little narrower.
  HACK_SPEED: 2.5,
  HACK_WIDTH: 0.9,
  HACK_FASTER: 1.18,
  HACK_NARROWER: 0.82,
  CODE_PENALTY: 6,
  // break-in game for cargo pods: stop the needle inside the mark three times
  DIAL_TIME: 25,
  DIAL_SPEED: 3.0,
  DIAL_WIDTH: 0.95,
  DIAL_STAGES: 3,
  DIAL_MISSES: 3,
  POD_CREDITS: [60, 140],
  // How long a pod's alarm goes on at least. It goes on for as long as there are pirates about.
  POD_ALARM: 20,
  // How long the middle of a pod's lock takes to turn once the last ring is open.
  DIAL_OPEN: 0.7,
  // traffic: seconds between arrivals, how many faction ships at most, how long a freighter stays docked,
  // and how many of the arrivals are freighters rather than patrols
  TRAFFIC_GAP: [20, 45],
  TRAFFIC_MAX: 5,
  TRAFFIC_VISIT: [12, 25],
  TRAFFIC_FREIGHTERS: 0.65,
  // the extra shield a docked ship gets, and how fast it builds up
  DOCK_SHIELD: 40,
  DOCK_SHIELD_MORE: 50,
  DOCK_SHIELD_RECHARGE: 10,
  // distress calls
  RAID_FIRST: [110, 180],
  RAID_GAP: [150, 250],
  RAID_TIME: 150,
  // how many raiders come, plus one more in the two most dangerous kinds of sector
  RAID_SIZE: 4,
  FAVOR_TIME: 180,
  FAVOR_DISCOUNT: 0.6,
  RAID_REWARD: 100,
  // more ship upgrades
  BOOST_POWER: 2,
  BOOST_BURN: 4,
  TANK_FUEL: 60,
  COIL_CHARGE: 4,
  COIL_FUEL: 15,
  SALVAGE_TTL: 90,
  SALVAGE_PICKUP: 36,
  TRACTOR_RANGE: 230,
  TRACTOR_PULL: 130,
  PD_RANGE: 90,
  PD_CHANCE: 0.35,
  DRONE_HULL: 1.5,
  DRONE_NODE: 2.5,
  // boarding gear
  RIFLE_STEP: 4,
  PACK_EXTRA: 2,
  SUIT_HP: 50,
  COIL_TELEPORT: 25,
  HACK_BONUS: 1.4,
  CHARGES: 2,
  SENTRY_HP: 40,
  SENTRY_RANGE: 190,
  SENTRY_DMG: 6,
  SENTRY_COOLDOWN: 0.45,
};

// Wing mounts on the frigate, used by the twin turrets and the rocket pods.
export const WING_MOUNTS = [
  { x: -20, y: 17 },
  { x: 20, y: 17 },
];

// Frigate geometry in ship-local pixels: x right, y back (the nose is at negative y).
export const SHIP_GEOM = {
  nose: { x: 0, y: -44 },
  turret: { x: 0, y: -35.5 },
  engines: { x: 0, y: 50 },
  // Circles used when the ship bumps into rocks and wrecks.
  hit: [
    { x: 0, y: 0, r: 26 },
    { x: 0, y: -30, r: 13 },
    { x: 0, y: 34, r: 16 },
  ],
  nodes: [
    // The parts that can be damaged and mended. Each is named after the one thing it runs.
    { id: 'weapons', name: 'WEAPONS', x: 0, y: -38 },
    { id: 'steering', name: 'STEERING', x: 0, y: -18 },
    { id: 'reactor', name: 'REACTOR', x: 0, y: 6 },
    { id: 'shields', name: 'SHIELD EMITTER', x: 0, y: 25 },
    { id: 'engines', name: 'ENGINES', x: 0, y: 44 },
  ],
};
