import { BitmapFont } from './font.js';

const SPRITES = [
  'frigate',
  'frigate_blueprint',
  'turret_pulse',
  'fighter',
  'gunboat',
  'dart',
  'interceptor',
  'wreck',
  'rock0',
  'rock1',
  'rock2',
  'boarder',
  'guard',
  'turret_guard',
  'crate',
  'cell',
  'wreck_gunboat',
  'wreck_freighter',
  'station_crew',
  'station_free',
  'station_charter',
  'station_wardens',
  'station_drifters',
  'station_pirate',
  'arm_steel',
  'arm_rust',
  'arm_plum',
  'cruiser',
  'mod_rockets',
  'mod_emit',
  'mod_heavy',
  'mod_bay',
  'mod_armor',
  'chart',
  'part',
  'rocket',
  'pod',
  'freighter',
  'freighter_charter',
  'fighter_charter',
  'gunboat_charter',
  'freighter_wardens',
  'fighter_wardens',
  'gunboat_wardens',
  'freighter_drifters',
  'fighter_drifters',
  'gunboat_drifters',
];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + url));
    img.src = url;
  });
}

export async function loadAssets() {
  const img = {};
  await Promise.all(
    SPRITES.map(async (n) => {
      img[n] = await loadImage(`assets/sprites/${n}.png`);
    }),
  );
  const [fontImg, meta] = await Promise.all([
    loadImage('assets/font.png'),
    fetch('assets/font.json').then((r) => r.json()),
  ]);
  return { img, font: new BitmapFont(fontImg, meta) };
}
