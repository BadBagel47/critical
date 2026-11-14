// All tuning numbers for the simulation live here.
export const B = {
  // frigate
  HULL_MAX: 200, SHIELD_MAX: 100, SHIP_RADIUS: 32,
  ACCEL: 70, DRAG: 0.55, REVERSE: 0.35, TURN_RATE: 1.25, TURN_SMOOTH: 6, THROTTLE_RATE: 0.9,
  ENGINE_POWER: [0.3, 0.6, 0.85, 1.0, 1.25],
  // power
  POWER_TOTAL: 8, POWER_MAX_PER_SYSTEM: 4, SYSTEMS: ['weapons', 'shields', 'engines', 'repair'],
  // shields
  SHIELD_DELAY: 2.5, SHIELD_RECHARGE: [0, 3, 6, 10, 15],
  // pulse laser
  FIRE_INTERVAL: 0.2, WEAPON_POWER: [0, 0.6, 0.85, 1.0, 1.3], BOLT_SPEED: 520, BOLT_TTL: 1.0, BOLT_DMG: 6, TURRET_SLEW: 7,
  // repair
  REPAIR_RATE: [0, 5, 9, 14, 20], HULL_REPAIR_SHARE: 0.3, CREW_SPEED: 28, NODE_DMG_MULT: 2.2,
  NODE_FACTOR: { ok: 1, damaged: 0.7, critical: 0.4 },
  // pirates
  FIRST_WAVE_DELAY: 10, WAVE_INTERVAL: 28, WAVE_INTERVAL_MIN: 14, MAX_PIRATES: 5,
  FIGHTER_HP: 24, FIGHTER_SPEED: 135, FIGHTER_ATTACK_SPEED: 160, FIGHTER_TURN: 2.4, FIGHTER_RADIUS: 13,
  PIRATE_BOLT_SPEED: 290, PIRATE_BOLT_TTL: 1.5, PIRATE_BOLT_DMG: 5, PIRATE_BURST: 3, PIRATE_BURST_GAP: 0.13, PIRATE_COOLDOWN: 1.9,
  // docking
  DOCK_RANGE: 20, DOCK_SPEED: 32, DOCK_GUIDE_RANGE: 320,
  // collisions
  RAM_SPEED: 60, RAM_DMG: 0.12,
};

// Frigate geometry in ship-local pixels: x right, y back (the nose is at negative y).
export const SHIP_GEOM = {
  nose: { x: 0, y: -44 }, turret: { x: 0, y: -35.5 }, engines: { x: 0, y: 50 },
  // Circles used when the ship bumps into rocks and wrecks.
  hit: [{ x: 0, y: 0, r: 26 }, { x: 0, y: -30, r: 13 }, { x: 0, y: 34, r: 16 }],
  nodes: [
    { id: 'bow', name: 'BOW TURRET', x: 0, y: -38 },
    { id: 'bridge', name: 'BRIDGE', x: 0, y: -18 },
    { id: 'reactor', name: 'REACTOR', x: 0, y: 8 },
    { id: 'port', name: 'PORT WING', x: -22, y: 16 },
    { id: 'starboard', name: 'STARBOARD WING', x: 22, y: 16 },
    { id: 'engines', name: 'ENGINES', x: 0, y: 44 },
  ],
};

// Wreck geometry in wreck-local pixels (sprite is 80 x 140, nose up).
export const WRECK_GEOM = {
  port: { x: -33, y: 10 }, portNormal: { x: -1, y: 0 },
  circles: [{ x: 0, y: -40, r: 22 }, { x: 0, y: 0, r: 28 }, { x: 0, y: 40, r: 26 }],
};
