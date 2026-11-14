// A small particle system for the visual effects. It only draws: nothing here affects the game.
export class Particles {
  constructor(max = 700) { this.max = max; this.list = []; this.rings = []; }
  clear() { this.list.length = 0; this.rings.length = 0; }
  // colors: from fresh to faded. size0/size1: start and end size in game pixels.
  add(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ vx: 0, vy: 0, life: 0.5, drag: 0, size0: 2, size1: 1, glow: false, colors: ['#ffffff'], ...p, age: 0 });
  }
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2), sp = (o.speed ?? 60) * (0.35 + Math.random() * 0.65);
      this.add({ x: x + (Math.random() - 0.5) * (o.jitter ?? 2), y: y + (Math.random() - 0.5) * (o.jitter ?? 2), vx: Math.cos(a) * sp + (o.vx ?? 0), vy: Math.sin(a) * sp + (o.vy ?? 0),
        life: (o.life ?? 0.5) * (0.6 + Math.random() * 0.6), drag: o.drag ?? 2, size0: o.size0 ?? 2, size1: o.size1 ?? 1, glow: o.glow ?? false, colors: o.colors });
    }
  }
  ring(x, y, r0, r1, life, color, width = 2) { this.rings.push({ x, y, r0, r1, life, age: 0, color, width }); }
  update(dt) {
    for (const p of this.list) {
      p.age += dt; const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
  }
  draw(ctx) {
    for (const r of this.rings) {
      const u = r.age / r.life;
      ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - u * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - (1 - u) * (1 - u)), 0, 7); ctx.stroke();
    }
    for (const p of this.list) {
      if (p.glow) continue;
      const u = p.age / p.life, s = p.size0 + (p.size1 - p.size0) * u;
      ctx.globalAlpha = Math.min(1, (1 - u) * 1.6); ctx.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(u * p.colors.length))];
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    // Glowing particles are added on top of each other, so that dense fire looks hot.
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      if (!p.glow) continue;
      const u = p.age / p.life, s = p.size0 + (p.size1 - p.size0) * u;
      ctx.globalAlpha = (1 - u) * 0.55; ctx.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(u * p.colors.length))];
      ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
