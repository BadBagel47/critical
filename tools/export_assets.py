"""Export game sprites and the bitmap font from the design drawing scripts.

Usage: python3 tools/export_assets.py
Writes PNG sprites to assets/sprites/ and the font atlas to assets/font.png + assets/font.json.
All ship sprites point up. Needs Pillow and DejaVu Sans Bold.
"""
import json, math, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'docs', 'design', 'tools'))
import style as S, frigate as FR, screens as SC  # noqa: E402  (importing renders the design images too)
import ships2 as NEW  # noqa: E402  (the new ship classes)
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

# ---- upgrades that show on the frigate: only the pixels that differ from the bare hull ----
def overlay(up):
    full = FR.frigate((up,), turret=False); out = Image.new('RGBA', full.size, (0, 0, 0, 0))
    a, b, o = hull.load(), full.load(), out.load()
    for y in range(full.height):
        for x in range(full.width):
            if a[x, y] != b[x, y]: o[x, y] = b[x, y] if b[x, y][3] else (0, 0, 0, 0)
    return out
for up, name in (('rockets', 'rockets'), ('emit', 'emit'), ('laser', 'heavy'), ('bay', 'bay'), ('armor', 'armor')): save(overlay(up), 'mod_' + name)

# ---- ships of the factions ----
# Each faction flies the same classes in its own colours: hull, darker hull, accent, glass and engine glow.
RUST = ['#4a2f26', '#6e4434', '#8f5d44', '#b98562']
FACTION = {
    'charter': dict(hull=S.STEEL, hull2=S.STEEL2, accent=S.OCHRE, glass=S.GLASS, glow=S.ION),
    'wardens': dict(hull=S.STEEL, hull2=S.STEEL2, accent=S.GLASS, glass=S.ION, glow=S.ION),
    'drifters': dict(hull=RUST, hull2=S.DARK, accent=S.BONE, glass=S.GLASS, glow=S.ION),
}
def recolour(im, c):
    """A pirate ship in a faction's colours: every pirate colour is swapped for the matching faction colour."""
    swap = {}
    for old, new in ((S.PLUM, c['hull']), (S.PLUM2, c['hull2']), (S.BONE, c['accent']), (S.ACID, c['glass']), (S.EMBER, c['glow'])):
        for a, b in zip(old, new): swap[S.rgb(a)] = S.rgb(b)
    out = im.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in swap: px[x, y] = swap[(r, g, b)] + (a,)
    return out
save(NEW.freighter_a(NEW.TRADER), 'freighter')
for side, colours in FACTION.items():
    save(NEW.freighter_a(colours), 'freighter_' + side)
    save(recolour(S.FI.transpose(Image.FLIP_TOP_BOTTOM), colours), 'fighter_' + side)
    save(recolour(S.GB.transpose(Image.FLIP_TOP_BOTTOM), colours), 'gunboat_' + side)

# ---- stations, one sprite per side, and their docking arms ----
# The station is drawn without its arms. The arms are sprites of their own, so that they can fold in and out.
import places as PL  # noqa: E402  (the design of wrecks and stations)
TEAL = PL.TEAL
for name, key in (('crew', 'YOURS'), ('free', 'NO FACTION'), ('charter', 'THE CHARTER'), ('wardens', 'THE WARDENS'), ('drifters', 'THE DRIFTERS'), ('pirate', 'PIRATES')):
    save(PL.game_station(key), 'station_' + name)
for name, (h1, h2) in (('steel', (S.STEEL, S.STEEL2)), ('rust', (PL.RUST, S.DARK)), ('plum', (S.PLUM, S.PLUM2))):
    save(PL.arm(h1, h2), 'arm_' + name)

# ---- wrecks, one for each ship class that leaves one ----
for name, ship, seed, opts in (('gunboat', S.GB.transpose(Image.FLIP_TOP_BOTTOM), 4, dict(holes=3)), ('freighter', NEW.freighter_a(NEW.TRADER), 11, dict(holes=6, split=92))):
    im = PL.wrecked(ship, seed, **opts)
    save(im, 'wreck_' + name)
    px, py = PL.wreck_port(im)
    print('wreck_' + name, im.size, 'port', (px - 3 - im.width // 2, py - im.height // 2))

# ---- the pirate cruiser, the boss of the last sector ----
def cruiser():
    parts = [(2, 'p', [(34, 30), (22, 22), (18, 6), (15, 26), (20, 46), (30, 54)]), (2, 'p', [(30, 50), (14, 62), (8, 84), (8, 122), (18, 136), (30, 132)]),
             (1, 'p', [(48, 4), (40, 10), (34, 30), (30, 60), (28, 112), (32, 152), (48, 158)]), (2, 'r', [38, 70, 48, 122]),
             (4, 'p', [(48, 36), (42, 40), (41, 52), (48, 56)]), (3, 'r', [33, 62, 33, 130]), (3, 'p', [(20, 70), (14, 76), (14, 80), (20, 74)]), (3, 'p', [(20, 100), (14, 106), (14, 110), (20, 104)]),
             (5, 'r', [9, 90, 12, 118]), (5, 'r', [34, 158, 40, 163]), (5, 'r', [43, 158, 48, 163]), (6, 'r', [35, 164, 39, 166]), (6, 'r', [44, 164, 48, 166])]
    def det(px, ln):
        for y in (64, 84, 104, 124, 140): ln((30, y), (47, y), S.PLUM[0])
        for y in (76, 90, 104, 116): ln((39, y), (47, y), S.PLUM2[0])
        ln((43, 71), (43, 121), S.PLUM2[0]); px([(36, y) for y in range(66, 128, 5)], S.EMBER[2]); px([(22, 88), (22, 96), (26, 120), (17, 12), (40, 20)], S.PLUM2[3]); px([(10, y) for y in range(94, 116, 6)], S.DARK[3])
    return S.sprite(96, 168, parts, {1: S.PLUM, 2: S.PLUM2, 3: S.BONE, 4: S.ACID, 5: S.DARK, 6: S.EMBER, 'glassy': (4,), 'glow': (6,)}, det)
save(cruiser(), 'cruiser')

# ---- small things: star chart, slot part, rocket ----
def small(w, h, draw):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); draw(ImageDraw.Draw(im)); return im
def chart(d):
    d.rectangle([1, 2, 14, 13], fill=S.OUT); d.rectangle([2, 3, 13, 12], fill=S.GLASS[1]); d.rectangle([2, 3, 13, 4], fill=S.GLASS[2])
    d.line([(4, 9), (7, 6), (10, 10), (12, 7)], fill=S.ION[1]); d.point([(4, 9), (7, 6), (10, 10), (12, 7)], S.ION[3])
def part(d):
    d.rectangle([2, 2, 13, 13], fill=S.OUT); d.rectangle([3, 3, 12, 12], fill=TEAL[1]); d.rectangle([3, 3, 12, 4], fill=TEAL[2]); d.rectangle([6, 6, 9, 9], fill=S.OUT); d.rectangle([7, 7, 8, 8], fill=TEAL[3])
    for k in (4, 7, 10): d.point([(k, 1), (k, 14), (1, k), (14, k)], TEAL[2])
def rocket(d):
    d.rectangle([0, 1, 3, 8], fill=S.OUT); d.rectangle([1, 2, 2, 7], fill=S.STEEL[3]); d.rectangle([1, 0, 2, 1], fill=S.EMBER[1]); d.rectangle([1, 6, 2, 7], fill=S.OCHRE[1])
save(small(16, 16, chart), 'chart'); save(small(16, 16, part), 'part'); save(small(4, 9, rocket), 'rocket')

# ---- cargo pod: a small locked container drifting in space ----
def pod():
    parts = [(2, 'r', [4, 4, 12, 29]), (1, 'r', [3, 8, 12, 11]), (1, 'r', [3, 22, 12, 25]), (5, 'r', [7, 1, 12, 3]), (5, 'r', [7, 30, 12, 32]), (3, 'r', [10, 1, 12, 1]), (3, 'r', [10, 32, 12, 32]), (3, 'r', [5, 15, 6, 18])]
    return S.sprite(24, 34, parts, {1: S.STEEL, 2: S.STEEL2, 3: S.OCHRE, 5: S.DARK, 'glassy': (), 'glow': (3,)}, lambda px, ln: (ln((8, 12), (8, 21), S.STEEL2[0]), px([(10, 14), (10, 19)], S.STEEL2[3])))
save(pod(), 'pod')

# ---- bitmap font: white glyphs on transparent, one row ----
# Text is drawn on a grid twice as fine as the rest of the game, so the font is twice the size and the
# game draws it at half scale ("unit" below).
from PIL import ImageFont  # noqa: E402
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
def glyph(ch):
    t = Image.new('1', (40, 32), 0); td = ImageDraw.Draw(t); td.fontmode = '1'; td.text((10, 4), ch, font=FONT, fill=1)
    pts = [(x, y) for y in range(32) for x in range(40) if t.getpixel((x, y))]
    x0 = min(p[0] for p in pts)
    return [(x - x0, y) for x, y in pts], max(p[0] for p in pts) - x0 + 1
chars = ''.join(chr(c) for c in range(33, 127)) + '·×°'
glyphs = {c: glyph(c) for c in chars}
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
json.dump({'unit': 0.5, 'height': h, 'capTop': min(cap) - y0, 'capHeight': max(cap) - min(cap) + 1, 'space': 6, 'spacing': 2, 'glyphs': meta},
          open(os.path.join(ROOT, 'assets', 'font.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('exported', len(os.listdir(OUT)), 'sprites, font height', h)
