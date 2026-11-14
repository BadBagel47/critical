// Plays the pieces. Each piece runs in a layer of its own with its own fader, so one piece can fade out while the next
// fades in. Notes are scheduled a short moment ahead of the audio clock, never further: when the tab is hidden the
// frames stop, the music falls silent by itself, and no long tail of old notes is heard when it comes back.
import { PIECES } from './pieces.js';
import { BAR, THEMES, colourOf } from './theory.js';
import { fades } from './director.js';
import { play } from './synth.js';

const AHEAD = 0.2; // seconds of notes scheduled ahead
const LEVEL = 0.6; // the music's level before the player's own music volume, under the effects
const PAUSED = { level: 0.45, tone: 900 };

export function createEngine(context, out) {
  const bus = context.createGain();
  bus.gain.value = LEVEL;
  const tone = context.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 18000;
  // A limiter that only catches peaks, so that the music can never jump out over the effects.
  const limit = context.createDynamicsCompressor();
  limit.threshold.value = -6;
  limit.knee.value = 6;
  limit.ratio.value = 12;
  limit.attack.value = 0.005;
  limit.release.value = 0.2;
  bus.connect(tone);
  tone.connect(limit);
  limit.connect(out);
  // One shared echo that a few notes are sent to.
  const echo = context.createGain();
  echo.gain.value = 0.35;
  const delay = context.createDelay(2);
  delay.delayTime.value = 0.43;
  const feedback = context.createGain();
  feedback.gain.value = 0.38;
  const damp = context.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2200;
  echo.connect(delay);
  delay.connect(damp);
  damp.connect(feedback);
  feedback.connect(delay);
  damp.connect(bus);

  let layers = [];
  let sounding = 0;
  let theme = 0;
  let paused = false;
  const done = () => sounding--;

  function startLayer(name, sector, fadeIn, now) {
    const piece = PIECES[name];
    const colour = colourOf(piece.fixedColour ? 0 : sector);
    const fader = context.createGain();
    fader.gain.setValueAtTime(0, now);
    fader.gain.linearRampToValueAtTime(1, now + Math.max(0.02, fadeIn));
    fader.connect(bus);
    const step = 60 / (piece.bpm * (piece.fixedColour ? 1 : colour.tempo)) / 4;
    return { name, sector, piece, colour, fader, step, at: 0, next: now + 0.05, until: Infinity, finished: false };
  }

  function stopLayer(layer, fadeOut, now) {
    const g = layer.fader.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(0.02, fadeOut));
    layer.until = now + Math.max(0.02, fadeOut);
  }

  function schedule(layer, now) {
    // Coming back after the tab was hidden: skip what was missed instead of playing it all at once.
    if (layer.next < now - 0.1) layer.next = now + 0.02;
    const c = { colour: layer.colour, theme: THEMES[theme] };
    while (layer.next < now + AHEAD && layer.next < layer.until && !layer.finished) {
      if (layer.piece.length !== undefined && layer.at >= layer.piece.length) {
        layer.finished = true;
        break;
      }
      for (const note of layer.piece.notes(layer.at, c)) {
        sounding += play(context, note, layer.next, {
          dest: layer.fader,
          echo: echo,
          step: layer.step,
          grit: layer.colour.grit,
          done,
        });
      }
      layer.at++;
      layer.next += layer.step;
    }
  }

  return {
    // Called every frame with the piece that should play and the sector it plays in.
    update(name, sector) {
      const now = context.currentTime;
      const current = layers.find((l) => l.until === Infinity) || null;
      const colourChanged = current && !current.piece.fixedColour && current.sector !== sector;
      if (!current || current.name !== name || colourChanged) {
        const fade = fades(current && current.name, name);
        if (current) stopLayer(current, colourChanged && current.name === name ? 3 : fade.out, now);
        layers.push(startLayer(name, sector, fade.in, now));
      }
      for (const layer of layers) schedule(layer, now);
      // Layers that have faded out are let go. Their last notes finish and disconnect by themselves.
      for (const layer of layers) {
        if (layer.until <= now) layer.fader.disconnect();
      }
      layers = layers.filter((l) => l.until > now);
      // Never more than three at once, even if the scene changes very fast.
      const live = layers.filter((l) => l.until > now + 0.1);
      for (const layer of live.slice(0, Math.max(0, live.length - 3))) stopLayer(layer, 0.05, now);
    },
    setPaused(on) {
      if (on === paused) return;
      paused = on;
      const now = context.currentTime;
      bus.gain.setTargetAtTime(on ? LEVEL * PAUSED.level : LEVEL, now, 0.3);
      tone.frequency.setTargetAtTime(on ? PAUSED.tone : 18000, now, 0.3);
    },
    setTheme(i) {
      theme = Math.max(0, Math.min(THEMES.length - 1, i | 0));
    },
    // Whether a piece that plays once has come to its end.
    finished(name) {
      const layer = layers.find((l) => l.name === name && l.until === Infinity);
      return !layer || layer.finished;
    },
    status() {
      const current = layers.find((l) => l.until === Infinity);
      return {
        piece: current ? current.name : null,
        sector: current ? current.colour.sector : null,
        bar: current ? Math.floor(current.at / BAR) : 0,
        layers: layers.length,
        sounding,
        theme,
      };
    },
  };
}
