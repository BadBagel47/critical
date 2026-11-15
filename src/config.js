// Screen and palette constants shared by the renderer and input code.
export const VIEW_W = 640;
export const VIEW_H = 360;
export const STEP = 1 / 60;

// How large space is drawn. Less than one shows more of it around the ship. Text and meters keep their size.
export const ZOOM = 0.75;
export const COL = {
  bg: '#090911',
  panel: '#0f0f1a',
  line: '#2a2c3a',
  text: '#bfc2cd',
  dim: '#6b6f82',
  faint: '#44475a',
  out: '#14131f',
  white: '#e3e5ec',
  steel: ['#3a3d4e', '#5d6174', '#8a8ea0', '#bfc2cd'],
  ochre: ['#7a4a22', '#b8752c', '#dba445', '#f2d27a'],
  ion: ['#2c6f8a', '#4fb0c8', '#9be4ee', '#eaffff'],
  ember: ['#8a2f2a', '#d0563a', '#f09a5a', '#ffe0b0'],
  acid: ['#2a5a36', '#4c9a50', '#96d66e', '#e2ffb0'],
  captain: '#5a9be0',
  gunner: '#dba445',
  engineer: '#58b0a0',
};
