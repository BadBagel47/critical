"""Shared palette, pixel font and sprite builder for the Critical ST8 design mockups.

Importing this module also renders the first style sheet. Needs Pillow and DejaVu Sans Bold.
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps
import random, math, os
OUT_DIR = os.environ.get('OUT_DIR') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
OUT = '#14131f'; BG = '#0b0b14'
STEEL = ['#3a3d4e','#5d6174','#8a8ea0','#bfc2cd']; STEEL2 = ['#2a2c3a','#44475a','#666a7e','#8f93a4']
OCHRE = ['#7a4a22','#b8752c','#dba445','#f2d27a']; GLASS = ['#1c3566','#2c5fae','#5a9be0','#cfe9ff']
DARK = ['#1c1c28','#2c2d3b','#434557','#5d6174']; ION = ['#2c6f8a','#4fb0c8','#9be4ee','#eaffff']
PLUM = ['#33203a','#553457','#7c4f74','#a67a98']; PLUM2 = ['#231629','#3d2640','#5a3a5a','#7c4f74']
ACID = ['#2a5a36','#4c9a50','#96d66e','#e2ffb0']; BONE = ['#6b6658','#a39c84','#d2cbb0','#f0ead6']
EMBER = ['#8a2f2a','#d0563a','#f09a5a','#ffe0b0']
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 8); _G = {}
def glyph(ch):
    if ch not in _G:
        t = Image.new('1', (20, 16), 0); td = ImageDraw.Draw(t); td.fontmode = '1'; td.text((5, 2), ch, font=F, fill=1)
        pts = [(x, y) for y in range(16) for x in range(20) if t.getpixel((x, y))]; x0 = min(p[0] for p in pts) if pts else 0
        _G[ch] = ([(x - x0, y - 2) for x, y in pts], (max(p[0] for p in pts) - x0 + 1) if pts else 0)
    return _G[ch]
def _fixY():
    ys = [p[1] for p in glyph('T')[0]]; y0, h = min(ys), max(ys) - min(ys) + 1
    rows = ['XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..'][:h] if h >= 6 else ['X.X', '.X.', '.X.']
    _G['Y'] = ([(x, y0 + y) for y, r in enumerate(rows) for x, c in enumerate(r) if c == 'X'], len(rows[0]))
_fixY()
def tw(s): return sum(3 if c == ' ' else glyph(c)[1] + 1 for c in s) - 1
def txt(d, x, y, s, fill, anchor='l'):
    x -= 0 if anchor == 'l' else tw(s) if anchor == 'r' else tw(s)//2
    for c in s:
        if c == ' ': x += 3; continue
        pts, w = glyph(c); d.point([(x + a, y + b) for a, b in pts], fill); x += w + 1
def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def sprite(w, h, parts, ramps, detail=None):
    half = Image.new('L', (w//2, h), 0); d = ImageDraw.Draw(half)
    for m, kind, p in parts:
        if kind == 'p': d.polygon(p, fill=m)
        elif kind == 'r': d.rectangle(p, fill=m)
        else: d.ellipse(p, fill=m)
    full = Image.new('L', (w, h), 0); full.paste(half, (0, 0)); full.paste(ImageOps.mirror(half), (w//2, 0)); M = full.load()
    g = lambda x, y: M[x, y] if 0 <= x < w and 0 <= y < h else 0
    box = {}
    for y in range(h):
        for x in range(w):
            m = M[x, y]
            if m: b = box.setdefault(m, [y, y]); b[0] = min(b[0], y); b[1] = max(b[1], y)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); P = im.load()
    for y in range(h):
        for x in range(w):
            m = M[x, y]
            if not m:
                if any(g(x+a, y+b) for a, b in ((1,0),(-1,0),(0,1),(0,-1))): P[x, y] = rgb(OUT) + (255,)
                continue
            up, dn = g(x, y-1), g(x, y+1); outer = g(x-1, y) if x < w/2 else g(x+1, y); inner = g(x+1, y) if x < w/2 else g(x-1, y)
            s = 1
            if up == 0: s = 2
            elif dn == 0 or outer == 0: s = 0
            elif up != m: s = 2
            elif dn != m or outer != m: s = 0
            if m in ramps.get('glassy', ()):
                rel = (y - box[m][0]) / max(1, box[m][1] - box[m][0]); s = 3 if rel < .22 else 2 if rel < .5 else 1 if rel < .8 else 0
                if outer != m and rel >= .22: s = max(0, s - 1)
            if m in ramps.get('glow', ()): s = 3 if (inner == m and outer == m) else 2
            if m == 1 and s == 1 and abs(x - (w-1)/2) < 1.6: s = 2
            P[x, y] = rgb(ramps[m][s]) + (255,)
    if detail:
        dd = ImageDraw.Draw(im)
        def px(pts, col):
            for x, y in pts: dd.point([(x, y), (w-1-x, y)], col)
        def ln(a, b, col): dd.line([a, b], fill=col); dd.line([(w-1-a[0], a[1]), (w-1-b[0], b[1])], fill=col)
        detail(px, ln)
    return im

def player():
    parts = [(2,'p',[(18,19),(9,28),(3,35),(3,41),(10,40),(18,37)]), (1,'p',[(24,2),(21,6),(19,14),(18,30),(17,40),(24,40)]),
             (2,'p',[(19,13),(15,18),(15,25),(18,23)]), (5,'r',[2,27,4,41]), (7,'r',[3,21,3,26]), (5,'r',[11,37,15,44]), (6,'r',[12,45,14,46]),
             (5,'r',[20,40,24,44]), (6,'r',[21,45,24,46]), (4,'p',[(24,8),(22,11),(21,17),(22,21),(24,22)]),
             (3,'p',[(15,25),(11,29),(11,32),(15,28)]), (3,'r',[19,31,24,32])]
    ramps = {1: STEEL, 2: STEEL2, 3: OCHRE, 4: GLASS, 5: DARK, 6: ION, 7: DARK, 'glassy': (4,), 'glow': (6,)}
    def det(px, ln):
        ln((20,25),(23,25), STEEL[0]); ln((19,35),(23,35), STEEL[0]); ln((21,27),(21,29), STEEL[0])
        ln((8,31),(8,37), STEEL2[0]); ln((13,33),(16,33), STEEL2[0]); px([(6,37),(13,30),(17,26)], STEEL2[3]); px([(3,29),(3,33)], OCHRE[2])
        px([(22,36),(20,37)], STEEL[3]); px([(13,39),(13,41),(22,42)], DARK[3])
    return sprite(48, 48, parts, ramps, det)
def fighter():
    parts = [(2,'p',[(12,12),(7,6),(4,1),(3,10),(5,20),(9,24),(12,22)]), (1,'p',[(16,3),(13,8),(12,20),(14,27),(16,27)]),
             (4,'p',[(16,10),(14,12),(14,17),(16,19)]), (5,'r',[13,27,16,28]), (6,'r',[14,29,16,30]), (3,'p',[(6,10),(5,14),(7,18),(8,13)])]
    ramps = {1: PLUM, 2: PLUM2, 3: BONE, 4: ACID, 5: DARK, 6: EMBER, 'glassy': (4,), 'glow': (6,)}
    def det(px, ln):
        ln((13,21),(15,21), PLUM[0]); ln((9,14),(9,20), PLUM2[0]); px([(4,4),(10,12)], PLUM2[3]); px([(14,24)], PLUM[3])
    return sprite(32, 32, parts, ramps, det).transpose(Image.FLIP_TOP_BOTTOM)
def gunboat():
    parts = [(2,'p',[(13,14),(7,18),(6,40),(9,47),(13,45)]), (1,'p',[(24,3),(17,5),(13,12),(13,45),(16,51),(24,51)]),
             (2,'r',[17,20,24,35]), (4,'p',[(24,7),(20,8),(19,13),(24,15)]), (3,'r',[15,16,15,43]), (7,'e',[7,25,12,30]), (7,'r',[9,20,10,26]),
             (5,'r',[15,51,19,54]), (5,'r',[21,51,24,54]), (6,'r',[16,55,18,56]), (6,'r',[22,55,24,56])]
    ramps = {1: PLUM, 2: PLUM2, 3: BONE, 4: ACID, 5: DARK, 6: EMBER, 7: DARK, 'glassy': (4,), 'glow': (6,)}
    def det(px, ln):
        ln((18,24),(23,24), PLUM2[0]); ln((18,29),(23,29), PLUM2[0]); ln((20,21),(20,34), PLUM2[0]); ln((17,39),(23,39), PLUM[0]); ln((17,44),(23,44), PLUM[0])
        px([(18,22),(22,22),(18,32),(22,32),(8,36),(10,42)], PLUM2[3]); px([(9,28)], EMBER[2]); px([(7,34),(7,38)], BONE[2])
    return sprite(48, 58, parts, ramps, det).transpose(Image.FLIP_TOP_BOTTOM)
def person(suit, stripe, visor, gun=True):
    parts = [(1,'e',[3,6,8,12]), (1,'r',[6,6,8,12]), (5,'r',[5,11,8,14]), (2,'e',[5,3,8,9]), (2,'r',[7,3,8,9]), (4,'r',[6,4,8,5]), (3,'r',[3,9,4,10])]
    im = sprite(16, 16, parts, {1: suit, 2: STEEL, 3: stripe, 4: visor, 5: DARK, 'glassy': (), 'glow': ()})
    if gun:
        d = ImageDraw.Draw(im); d.rectangle([11, 1, 14, 8], fill=OUT); d.rectangle([12, 2, 13, 7], fill=DARK[2]); d.point((12, 2), DARK[3]); d.rectangle([12, 8, 13, 9], fill=rgb(suit[2]))
    return im
def turret():
    im = sprite(16, 16, [(1,'e',[2,3,8,13]), (1,'r',[6,3,8,13]), (2,'e',[4,5,8,11]), (2,'r',[7,5,8,11]), (3,'r',[7,7,8,8])],
                {1: PLUM2, 2: PLUM, 3: EMBER, 'glassy': (), 'glow': (3,)})
    d = ImageDraw.Draw(im); d.rectangle([6, 0, 9, 6], fill=OUT); d.rectangle([7, 0, 8, 5], fill=DARK[2]); d.point((7, 0), DARK[3]); return im
def crate():
    im = Image.new('RGBA', (16, 16), (0,0,0,0)); d = ImageDraw.Draw(im)
    d.rectangle([1, 2, 14, 14], fill=OUT); d.rectangle([2, 3, 13, 13], fill=OCHRE[1]); d.rectangle([2, 3, 13, 4], fill=OCHRE[2]); d.rectangle([2, 12, 13, 13], fill=OCHRE[0])
    d.rectangle([7, 3, 8, 13], fill=OCHRE[0]); d.rectangle([2, 8, 13, 8], fill=OCHRE[0]); d.rectangle([6, 7, 9, 9], fill=OCHRE[3], outline=OUT); return im
def cell():
    im = Image.new('RGBA', (16, 16), (0,0,0,0)); d = ImageDraw.Draw(im)
    d.rectangle([4, 2, 11, 14], fill=OUT); d.rectangle([5, 3, 10, 13], fill=ION[1]); d.rectangle([5, 3, 10, 4], fill=DARK[2]); d.rectangle([5, 12, 10, 13], fill=DARK[2])
    d.rectangle([6, 5, 7, 11], fill=ION[3]); d.rectangle([8, 5, 9, 11], fill=ION[2]); return im
def stars(d, x0, y0, w, h, seed, n):
    r = random.Random(seed)
    for _ in range(n): d.point((x0 + r.randrange(w), y0 + r.randrange(h)), r.choice(['#2a2b40']*5 + ['#55587a']*3 + ['#a9adc8']))
def glow(im, cx, cy, r, col, a=46):
    ov = Image.new('RGBA', im.size, (0,0,0,0)); o = ImageDraw.Draw(ov)
    o.ellipse([cx-r, cy-r, cx+r, cy+r], fill=rgb(col) + (a//2,)); o.ellipse([cx-r*.55, cy-r*.55, cx+r*.55, cy+r*.55], fill=rgb(col) + (a,))
    return Image.alpha_composite(im, ov)

W, H = 480, 270
im = Image.new('RGBA', (W, H), rgb(BG) + (255,)); d = ImageDraw.Draw(im)
txt(d, 8, 6, 'STILPROV 1', '#bfc2cd'); txt(d, 472, 6, '480 × 270,  3 GÅNGER FÖRSTORAT', '#5d6174', 'r')
# palette
for i, (name, ramp) in enumerate((('STÅL', STEEL), ('MÖRKT STÅL', STEEL2), ('OCKRA', OCHRE), ('GLAS', GLASS), ('JONLJUS', ION), ('PLOMMON', PLUM), ('BEN', BONE), ('SYRAGRÖNT', ACID), ('GLÖD', EMBER))):
    y = 22 + i*9
    for k, c in enumerate(ramp): d.rectangle([8 + k*11, y, 17 + k*11, y+6], fill=c)
    txt(d, 56, y-1, name, '#8a8ea0')
# sprite row
PL, FI, GB = player(), fighter(), gunboat()
me = person(STEEL, OCHRE, GLASS); guard = person(PLUM, BONE, ACID); TU, CR, CE = turret(), crate(), cell()
row = [(PL, 150, 'ERT SKEPP', '48'), (FI, 218, 'JAKTSKEPP', '32'), (GB, 270, 'KANONBÅT', '48')]
for s, x, name, size in row:
    im.alpha_composite(s, (x, 20 + (58 - s.height)//2)); d = ImageDraw.Draw(im); txt(d, x + s.width//2, 82, name, '#8a8ea0', 'c'); txt(d, x + s.width//2, 92, size + ' × ' + size, '#5d6174', 'c')
for s, x, name in ((me, 336, 'BORDARE'), (guard, 380, 'VAKT'), (TU, 410, 'TORN'), (CR, 442, 'LOOT')):
    im.alpha_composite(s, (x, 30)); d = ImageDraw.Draw(im); txt(d, x + 8, 50, name, '#8a8ea0', 'c')
im.alpha_composite(CE, (460, 30)); d = ImageDraw.Draw(im); txt(d, 402, 66, 'FIGURER OCH FÖREMÅL:  16 × 16', '#5d6174', 'c')
# ---- scene: UTE ----
sx, sy, sw, sh = 8, 116, 228, 146
txt(d, sx, 104, 'UTE', '#bfc2cd'); txt(d, 244, 104, 'INNE', '#bfc2cd')
d.rectangle([sx, sy, sx+sw-1, sy+sh-1], fill='#090911'); stars(d, sx, sy, sw, sh, 3, 90)
im = glow(im, sx+86, sy+136, 12, ION[2], 60); im = glow(im, sx+164, sy+22, 9, EMBER[2], 50)
im.alpha_composite(PL, (sx+62, sy+88)); im.alpha_composite(FI, (sx+148, sy+18)); im.alpha_composite(FI, (sx+30, sy+8)); im.alpha_composite(GB.crop((0, 20, 48, 58)), (sx+176, sy))
d = ImageDraw.Draw(im)
for x, y in ((sx+65, sy+74), (sx+106, sy+74), (sx+65, sy+50), (sx+106, sy+50)): d.rectangle([x, y, x+1, y+6], fill=OCHRE[3]); d.rectangle([x, y+5, x+1, y+8], fill=OCHRE[1])
for x, y in ((sx+163, sy+56), (sx+163, sy+72), (sx+199, sy+48)): d.rectangle([x, y, x+1, y+5], fill=ACID[3]); d.rectangle([x, y-3, x+1, y], fill=ACID[1])
d.polygon([(sx+44, sy+44), (sx+48, sy+40), (sx+52, sy+44), (sx+48, sy+48)], fill=OCHRE[3]); d.rectangle([sx+46, sy+42, sx+50, sy+46], fill='#fff3c4')
for a in range(0, 360, 45): d.point((sx+48 + round(9*math.cos(math.radians(a))), sy+44 + round(9*math.sin(math.radians(a)))), OCHRE[2])
# ---- scene: INNE ----
ix, iy = 246, 116; T = 16; cols, rows = 14, 9
FL = ['#191a25', '#1c1d29']; 
for r in range(rows):
    for c in range(cols):
        x, y = ix + c*T, iy + r*T; d.rectangle([x, y, x+T-1, y+T-1], fill=FL[(r + c) % 2]); d.line([(x, y+T-1), (x+T-1, y+T-1)], fill='#13131c'); d.line([(x+T-1, y), (x+T-1, y+T-1)], fill='#13131c')
        d.point([(x+2, y+2), (x+T-4, y+2)], '#2c2d3b')
def wall_top(c, r, cw=1, rh=1):
    x, y = ix + c*T, iy + r*T; d.rectangle([x, y, x + cw*T - 1, y + rh*T - 1], fill=STEEL2[1], outline=OUT); d.line([(x+1, y+1), (x + cw*T - 2, y+1)], fill=STEEL2[2])
def wall_face(c, r, cw=1):
    x, y = ix + c*T, iy + r*T; d.rectangle([x, y, x + cw*T - 1, y + 9], fill=STEEL2[0], outline=OUT)
    for k in range(cw): d.rectangle([x + k*T + 3, y + 3, x + k*T + 12, y + 6], fill=DARK[0]); d.point((x + k*T + 5, y + 4), OCHRE[1])
wall_top(0, 0, cols, 1); wall_face(1, 1, cols-2); wall_top(0, 1, 1, rows-1); wall_top(cols-1, 1, 1, rows-1); wall_top(1, rows-1, cols-2, 1)
wall_top(8, 1, 1, 3); wall_face(8, 4, 1)
dx, dy = ix, iy + 4*T; d.rectangle([dx, dy, dx+T-1, dy+2*T-1], fill=DARK[1], outline=OUT); d.rectangle([dx+12, dy+2, dx+13, dy+2*T-3], fill=ACID[2]); d.rectangle([dx+4, dy+6, dx+8, dy+2*T-7], fill=DARK[0])
im = glow(im, ix + 5*T + 8, iy + 2*T + 10, 13, OCHRE[2], 40); im = glow(im, ix + 12*T, iy + 7*T + 4, 12, ION[2], 46); im = glow(im, ix + 2*T, iy + 5*T, 20, ACID[2], 22)
im.alpha_composite(CR, (ix + 5*T, iy + 2*T + 2)); im.alpha_composite(CR, (ix + 6*T + 1, iy + 2*T + 4)); im.alpha_composite(CE, (ix + 11*T, iy + 7*T - 4)); im.alpha_composite(CE, (ix + 12*T - 3, iy + 7*T - 2))
im.alpha_composite(me.rotate(-90), (ix + 3*T, iy + 5*T)); im.alpha_composite(guard.rotate(90), (ix + 10*T, iy + 6*T)); im.alpha_composite(TU.rotate(110, resample=Image.NEAREST), (ix + 11*T, iy + 2*T + 6))
d = ImageDraw.Draw(im)
for x in (ix + 4*T + 8, ix + 5*T + 10, ix + 7*T): d.rectangle([x, iy + 5*T + 11, x+5, iy + 5*T + 12], fill=OCHRE[3]); d.rectangle([x-2, iy + 5*T + 11, x, iy + 5*T + 12], fill=OCHRE[1])
for k in (1, 2): x, y = ix + 11*T - k*22, iy + 3*T + 2 + k*10; d.rectangle([x, y, x+4, y+1], fill=ACID[3]); d.rectangle([x+4, y, x+6, y+1], fill=ACID[1])
for k in range(7): t = k/7; d.point((round(ix + 4*T + (5.5*T)*t), round(iy + 5*T + 2 - 34*math.sin(math.pi*t*.9))), '#8a8ea0')
gx, gy = ix + 9*T + 2, iy + 5*T - 8; d.rectangle([gx, gy, gx+3, gy+3], fill=DARK[2], outline=OUT); d.point((gx+1, gy+1), EMBER[2])
im = im.convert('RGB'); im.resize((W*3, H*3), Image.NEAREST).quantize(128, dither=Image.Dither.NONE).save(os.path.join(OUT_DIR, 'style-sheet.png'), optimize=True)
