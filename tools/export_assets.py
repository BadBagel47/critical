"""Export game sprites and the bitmap font from the design drawing scripts.

Usage: python3 tools/export_assets.py
Writes PNG sprites to assets/sprites/ and the font atlas to assets/font.png + assets/font.json.
All ship sprites point up. Needs Pillow and DejaVu Sans Bold.
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'docs', 'design', 'tools'))
import style as S, frigate as FR, screens as SC  # noqa: E402  (importing renders the design images too)
from PIL import Image, ImageDraw  # noqa: E402

OUT = os.path.join(ROOT, 'assets', 'sprites'); os.makedirs(OUT, exist_ok=True)

def save(im, name):
    im.save(os.path.join(OUT, name + '.png'), optimize=True)

def turret():
    parts = [(1, 'e', [2, 7, 9, 14]), (2, 'r', [5, 0, 5, 9]), (3, 'r', [5, 9, 5, 11])]
    im = S.sprite(12, 16, parts, {1: S.DARK, 2: S.STEEL2, 3: S.OCHRE, 'glassy': (), 'glow': ()})
    return im

def blueprint(fr):
    bp = Image.new('RGBA', fr.size, (0, 0, 0, 0)); p, q = fr.load(), bp.load(); out = S.rgb(S.OUT)
    for y in range(fr.height):
        for x in range(fr.width):
            r, g, b, a = p[x, y]
            if not a: continue
            lum = (r + g + b) / 3
            q[x, y] = S.rgb(S.ION[0]) + (255,) if (r, g, b) == out else S.rgb('#10262e' if lum < 70 else '#173844' if lum < 120 else '#20505e') + (255,)
    return bp.resize((fr.width * 2, fr.height * 2), Image.NEAREST)

hull = FR.frigate((), turret=False)
save(hull, 'frigate')
save(blueprint(FR.frigate(())), 'frigate_blueprint')
save(turret(), 'turret_pulse')
save(S.FI.transpose(Image.FLIP_TOP_BOTTOM), 'fighter')
save(S.GB.transpose(Image.FLIP_TOP_BOTTOM), 'gunboat')
save(FR.DART, 'dart')
save(S.PL, 'interceptor')
save(SC.WR, 'wreck')
for i, (r, seed) in enumerate(((14, 2), (9, 4), (20, 7))): save(SC.rock(r, seed), 'rock%d' % i)
save(S.person(S.STEEL, S.OCHRE, S.GLASS), 'boarder')
save(S.guard, 'guard')
save(S.TU, 'turret_guard')
save(S.CR, 'crate')
save(S.CE, 'cell')

# ---- bitmap font: white glyphs on transparent, one row ----
chars = ''.join(chr(c) for c in range(33, 127)) + '·×°'
glyphs = {c: S.glyph(c) for c in chars}
ys = [y for pts, w in glyphs.values() for x, y in pts]
y0, y1 = min(ys), max(ys); h = y1 - y0 + 1
total = sum(w + 1 for pts, w in glyphs.values()) + 1
atlas = Image.new('RGBA', (total, h), (0, 0, 0, 0)); px = atlas.load(); meta = {}; x = 1
for c in chars:
    pts, w = glyphs[c]
    for gx, gy in pts: px[x + gx, gy - y0] = (255, 255, 255, 255)
    meta[c] = [x, w]; x += w + 1
atlas.save(os.path.join(ROOT, 'assets', 'font.png'), optimize=True)
cap = [y for x, y in glyphs['H'][0]]
json.dump({'height': h, 'capTop': min(cap) - y0, 'capHeight': max(cap) - min(cap) + 1, 'space': 3, 'spacing': 1, 'glyphs': meta},
          open(os.path.join(ROOT, 'assets', 'font.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('exported', len(os.listdir(OUT)), 'sprites, font height', h)
