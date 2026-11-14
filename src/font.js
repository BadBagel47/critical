// Bitmap font drawn from the exported glyph atlas. Text y is the top of the capital letters.
export class BitmapFont {
  constructor(img, meta) {
    this.img = img;
    this.meta = meta;
    this.cache = new Map();
  }
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
  width(text, scale = 1) {
    const m = this.meta;
    let w = 0;
    for (const ch of text) w += ch === ' ' ? m.space : (m.glyphs[ch] || m.glyphs['?'])[1] + m.spacing;
    return Math.max(0, w - (text.endsWith(' ') ? 0 : m.spacing)) * scale;
  }
  draw(ctx, text, x, y, color, opts = {}) {
    const m = this.meta,
      scale = opts.scale || 1,
      src = this.tinted(color);
    const w = this.width(text, scale);
    let cx = Math.round(opts.align === 'c' ? x - w / 2 : opts.align === 'r' ? x - w : x);
    const top = Math.round(y) - m.capTop * scale;
    for (const ch of text) {
      if (ch === ' ') {
        cx += m.space * scale;
        continue;
      }
      const g = m.glyphs[ch] || m.glyphs['?'];
      ctx.drawImage(src, g[0], 0, g[1], m.height, cx, top, g[1] * scale, m.height * scale);
      cx += (g[1] + m.spacing) * scale;
    }
    return w;
  }
}
