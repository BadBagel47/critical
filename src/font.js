// Bitmap font drawn from the exported glyph atlas. Text y is the top of the capital letters.
// The font is drawn on a grid finer than the game's own pixels: `unit` is the size of one font pixel
// in game pixels, so text is as large as before but with more detail.
export class BitmapFont {
  constructor(img, meta) {
    this.img = img;
    this.meta = meta;
    this.unit = meta.unit || 1;
    this.cache = new Map();
  }
  // The atlas in one colour. Each colour is made once and kept.
  tinted(color) {
    let c = this.cache.get(color);
    if (!c) {
      c = document.createElement('canvas');
      c.width = this.img.width;
      c.height = this.img.height;
      const g = c.getContext('2d');
      g.drawImage(this.img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      this.cache.set(color, c);
    }
    return c;
  }
  // Width of a text in game pixels.
  width(text, scale = 1) {
    const m = this.meta;
    let w = 0;
    for (const ch of text) w += ch === ' ' ? m.space : (m.glyphs[ch] || m.glyphs['?'])[1] + m.spacing;
    return Math.max(0, w - (text.endsWith(' ') ? 0 : m.spacing)) * this.unit * scale;
  }
  draw(ctx, text, x, y, color, opts = {}) {
    const m = this.meta;
    const k = this.unit * (opts.scale || 1);
    const src = this.tinted(color);
    const w = this.width(text, opts.scale || 1);
    // Text starts on a whole font pixel, so that it stays sharp.
    const snap = (v) => Math.round(v / this.unit) * this.unit;
    let cx = snap(opts.align === 'c' ? x - w / 2 : opts.align === 'r' ? x - w : x);
    const top = snap(y) - m.capTop * k;
    for (const ch of text) {
      if (ch === ' ') {
        cx += m.space * k;
        continue;
      }
      const g = m.glyphs[ch] || m.glyphs['?'];
      ctx.drawImage(src, g[0], 0, g[1], m.height, cx, top, g[1] * k, m.height * k);
      cx += (g[1] + m.spacing) * k;
    }
    return w;
  }
}
