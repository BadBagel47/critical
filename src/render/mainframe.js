// The panel at a station's mainframe, see sim/mainframe.js. What is on it depends on whose the station is: a hack
// in three levels at an enemy, a way to take a station that trades with the crew, and repairs and defence at the
// crew's own. The world keeps running behind it.
import { VIEW_W, VIEW_H, COL } from '../config.js';
import { B } from '../sim/balance.js';
import {
  relationOf,
  hackBlocked,
  fixNeed,
  defensePrice,
  LEVEL_NAMES,
  DEFENSES,
  DEFENSE_NAMES,
} from '../sim/mainframe.js';
import { stationShieldMax, gunHpMax, defenseOf } from '../sim/stations.js';
import { CREW, FACTIONS, isFaction } from '../sim/sides.js';
import { rect } from './draw.js';

const PW = 520,
  PH = 284,
  PX = (VIEW_W - PW) / 2,
  PY = (VIEW_H - PH) / 2,
  COL_W = 240;
const pct = (v) => Math.floor(v * 100) + '%';
const LEVEL_DESC = [
  'THE FLOOR PLAN WITH THE GUARDS, THE CAMERAS AND THE ALARMED DOORS, FOR EVERYONE INSIDE',
  `CAMERAS AND TURRETS OFF FOR ${B.BLACKOUT} S, AND THE VAULT DOOR OPENS`,
  'THE STATION BECOMES YOURS',
];
const DEFENSE_DESC = {
  shield: 'A STRONGER SHIELD HOLDS ATTACKERS OFF FOR LONGER',
  guns: 'STRONGER GUNS THAT HIT HARDER',
  inner: 'GUARDS AND LOCKS INSIDE THAT WEAR BOARDERS DOWN',
};

// Every clickable row, with what it orders. Shared by drawing and clicking. `armed` is whether the crew has
// clicked once to take a trading station, and has to click again to be sure.
export function mainframeRows(state, st, av, armed) {
  const it = st.interior;
  const rows = [];
  const rel = relationOf(st);
  const row = (name, x, y, w, label, right, enabled, order, desc, more = {}) =>
    rows.push({ name, x, y, w, h: 16, label, right, enabled, order, desc, ...more });
  if (rel === 'enemy') {
    LEVEL_NAMES.forEach((name, level) => {
      const why = hackBlocked(it, av, level);
      const working = it.hack && it.hack.level === level;
      const right = it.hacked[level]
        ? 'DONE'
        : working
          ? pct(it.work[level])
          : why || (it.work[level] ? 'GO ON' : 'START');
      const label = `LEVEL ${level + 1}  ·  ${name}`;
      row(
        'hack.' + level,
        PX + 12,
        PY + 62 + level * 22,
        PW - 24,
        label,
        right,
        !why,
        { action: 'hack', level },
        LEVEL_DESC[level],
        {
          done: it.hacked[level],
        },
      );
    });
    if (it.hack)
      row('stop', PX + 12, PY + 136, 120, 'STOP', '', true, { action: 'stop' }, 'STOP WORKING, AND GO ON LATER');
    return rows;
  }
  if (rel === 'trade') {
    const label = armed ? 'CLICK AGAIN TO START  ·  RED ALERT' : 'TAKE THE STATION FROM HERE';
    const desc = 'THE ALARM SOUNDS AT ONCE, GUARDS COME AND THE STATION CALLS FOR HELP';
    row('seize', PX + 12, PY + 150, PW - 24, label, armed ? 'SURE?' : '', true, { action: 'seize' }, desc, {
      danger: true,
    });
    return rows;
  }
  // The crew's own: what to mend on the left, what to buy on the right.
  const fixing = (part) => st.fix === part;
  const hullNeed = fixNeed(st, 'hull');
  const hullRight = fixing('hull') ? 'MENDING' : hullNeed > 0 ? Math.ceil(st.hp) + ' / ' + B.STATION_HP : 'WHOLE';
  row(
    'fix.hull',
    PX + 12,
    PY + 62,
    COL_W,
    'HULL',
    hullRight,
    hullNeed > 0 && !fixing('hull'),
    { action: 'fix', part: 'hull' },
    'MEND THE HULL',
  );
  st.guns.forEach((g, i) => {
    const y = PY + 82 + i * 20;
    if (g.off && g.hp >= gunHpMax(st)) {
      row(
        'on.' + i,
        PX + 12,
        y,
        COL_W,
        `GUN ${i + 1}`,
        'SWITCH ON',
        true,
        { action: 'switchOn', gun: i },
        'THE GUN IS MENDED. SWITCH IT ON',
      );
      return;
    }
    const need = fixNeed(st, i);
    const right = fixing(i)
      ? 'MENDING'
      : g.hp <= 0
        ? 'DOWN'
        : need > 0
          ? pct(g.hp / gunHpMax(st))
          : g.off
            ? 'OFF'
            : 'READY';
    row(
      'fix.' + i,
      PX + 12,
      y,
      COL_W,
      `GUN ${i + 1}`,
      right,
      need > 0 && !fixing(i),
      { action: 'fix', part: i },
      'MEND THIS GUN',
    );
  });
  DEFENSES.forEach((what, i) => {
    const price = defensePrice(st, what);
    const lv = defenseOf(st)[what];
    const label = DEFENSE_NAMES[what] + (lv ? '  ' + 'I'.repeat(lv) : '');
    const right = price === null ? 'MAXED' : price + ' CR';
    const ok = price !== null && state.credits >= price;
    row(
      'up.' + what,
      PX + PW - 12 - COL_W,
      PY + 62 + i * 20,
      COL_W,
      label,
      right,
      ok,
      { action: 'upgrade', what },
      DEFENSE_DESC[what],
    );
  });
  return rows;
}

// Everything that can be clicked on the panel, by name. Used by the browser test.
export function mainframeButtons(state, st, av, armed) {
  return mainframeRows(state, st, av, armed).map((r) => ({ name: 'mf.' + r.name, x: r.x, y: r.y, w: r.w, h: r.h }));
}

// The order a click gives, or { arm } for the first click on taking a trading station, or null.
export function mainframeClick(state, st, av, armed, mx, my) {
  const row = mainframeRows(state, st, av, armed).find(
    (r) => mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h,
  );
  if (!row || !row.enabled) return null;
  if (row.name === 'seize' && !armed) return { arm: true };
  return { order: row.order };
}

const whose = (st) =>
  st.side === CREW
    ? 'YOUR STATION'
    : isFaction(st.side)
      ? FACTIONS[st.side].name
      : st.side === 'pirate'
        ? 'PIRATES'
        : 'FREE STATION';

function bar(ctx, x, y, w, v, col) {
  rect(ctx, x, y, w, 5, '#141420', COL.line);
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.min(1, Math.max(0, v))), 3);
}

export function drawMainframe(ctx, font, state, st, av, armed, mouse) {
  const it = st.interior;
  const rel = relationOf(st);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  rect(ctx, PX, PY, PW, PH, COL.panel, COL.steel[1]);
  rect(ctx, PX + 3, PY + 3, PW - 6, PH - 6, null, COL.line);
  font.draw(ctx, st.name + '  ·  MAINFRAME', PX + 12, PY + 12, COL.text, { scale: 2 });
  font.draw(ctx, whose(st), PX + 12, PY + 32, rel === 'own' ? COL.acid[2] : COL.dim);
  font.draw(ctx, 'CREDITS  ' + state.credits, PX + PW - 12, PY + 12, COL.ochre[2], { align: 'r' });
  if (rel === 'enemy') {
    font.draw(ctx, 'HACK', PX + 12, PY + 50, COL.dim);
    const y = PY + 168;
    if (it.mood === 'alarm')
      font.draw(ctx, 'THE ALARM IS RAISED  ·  THE TRACE NO LONGER MATTERS', PX + 12, y, COL.ember[2]);
    else {
      font.draw(ctx, 'TRACE  ·  THE ALARM SOUNDS WHEN IT IS FULL', PX + 12, y, COL.dim);
      bar(ctx, PX + 12, y + 10, PW - 24, it.trace, it.trace > 0.7 ? COL.ember[2] : COL.ochre[2]);
    }
    const line =
      av.role === 'engineer'
        ? 'THE ENGINEER WORKS FASTER, AND ALONE CAN DO LEVEL 2'
        : 'STAY AT THE MAINFRAME WHILE IT WORKS';
    font.draw(ctx, line, PX + 12, y + 26, COL.dim);
  } else if (rel === 'trade') {
    const help = isFaction(st.side) ? 'THE FACTION SENDS ITS SHIPS' : 'BOUNTY HUNTERS COME';
    const after = isFaction(st.side)
      ? 'THE FACTION BECOMES YOUR ENEMY'
      : `A BOUNTY OF ${B.BOUNTY} CREDITS IS PUT ON YOU`;
    const lines = [
      'THIS STATION TRADES WITH YOU. TAKING IT IS A GREAT RISK:',
      `·  THE ALARM SOUNDS AT ONCE, AND GUARDS COME FOR YOU`,
      `·  ITS GUNS TURN ON YOUR SHIP, AND ${help}`,
      `·  ITS SIDE THINKS MUCH LESS OF YOU`,
      `·  TAKEN, ${after}, AND EVERYONE ELSE HEARS OF IT`,
    ];
    lines.forEach((l, i) => font.draw(ctx, l, PX + 12, PY + 56 + i * 14, i ? COL.text : COL.ochre[2]));
  } else {
    font.draw(ctx, 'REPAIRS', PX + 12, PY + 50, COL.dim);
    font.draw(ctx, 'DEFENCE', PX + PW - 12 - COL_W, PY + 50, COL.dim);
    const sx = PX + PW - 12 - COL_W;
    font.draw(ctx, `SHIELD  ${Math.ceil(st.shield)} / ${stationShieldMax(st)}`, sx, PY + 132, COL.text);
    bar(ctx, sx, PY + 142, COL_W, st.shield / stationShieldMax(st), COL.ion[2]);
    const siege = state.siege && state.siege.station === st.id;
    if (siege) font.draw(ctx, 'UNDER ATTACK', sx, PY + 156, COL.ember[2]);
  }
  let hover = null;
  for (const r of mainframeRows(state, st, av, armed)) {
    const over = mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    if (over) hover = r;
    const edge = over && r.enabled ? (r.danger ? COL.ember[2] : COL.ochre[2]) : r.danger ? COL.ember[1] : COL.line;
    rect(ctx, r.x, r.y, r.w, r.h, over && r.enabled ? '#1c2140' : '#141420', edge);
    const text = r.enabled ? COL.text : r.done ? COL.engineer : COL.faint;
    font.draw(ctx, r.label, r.x + 5, r.y + 5, text);
    font.draw(ctx, r.right, r.x + r.w - 5, r.y + 5, r.enabled ? COL.ochre[2] : r.done ? COL.engineer : COL.faint, {
      align: 'r',
    });
    // The level being worked on shows how far it has come.
    if (r.name.startsWith('hack.') && it.hack && 'hack.' + it.hack.level === r.name) {
      ctx.fillStyle = COL.engineer;
      ctx.fillRect(r.x + 1, r.y + r.h - 2, Math.round((r.w - 2) * it.work[it.hack.level]), 1);
    }
  }
  rect(ctx, PX + 12, PY + PH - 28, PW - 24, 1, COL.line);
  font.draw(
    ctx,
    (hover && hover.desc) || 'CLICK WHAT YOU WANT TO DO  ·  F CLOSES',
    PX + 12,
    PY + PH - 18,
    hover ? COL.text : COL.dim,
  );
}
