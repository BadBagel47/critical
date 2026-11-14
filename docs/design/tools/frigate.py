"""Player frigate in three upgrade stages and the ship class lineup."""
import os
import style as S
from PIL import Image, ImageDraw
import math
LSTEEL = ['#5d6174', '#8a8ea0', '#bfc2cd', '#e3e5ec']
RAMPS = {1: S.STEEL, 2: S.STEEL2, 3: S.OCHRE, 4: S.GLASS, 5: S.DARK, 6: S.ION, 7: S.DARK, 8: S.STEEL, 9: LSTEEL, 10: S.EMBER, 'glassy': (4,), 'glow': (6, 10)}
BASE = [(2,'p',[(24,48),(14,56),(10,66),(10,84),(16,90),(24,88)]), (2,'p',[(27,28),(20,36),(20,42),(26,40)]),
        (1,'p',[(36,10),(31,14),(28,24),(26,38),(24,54),(24,88),(27,98),(36,98)]),
        (8,'p',[(36,26),(31,29),(30,40),(31,46),(36,47)]), (4,'p',[(36,30),(33,32),(32,38),(33,42),(36,43)]),
        (2,'r',[29,54,36,70]), (5,'r',[7,62,10,86]), (6,'r',[8,87,9,88]),
        (5,'r',[26,94,36,102]), (6,'r',[28,103,30,104]), (6,'r',[33,103,36,104]),
        (3,'r',[25,60,25,82]), (3,'p',[(18,60),(14,64),(14,67),(18,63)]), (7,'r',[22,74,24,78]), (7,'e',[33,16,39,21])]
UP = {
 'twin':   [(7,'e',[13,68,19,74]), (7,'r',[14,61,14,68]), (7,'r',[17,61,17,68])],
 'rockets':[(2,'r',[2,64,6,81]), (10,'r',[3,62,5,63])],
 'emit':   [(6,'r',[22,50,23,52]), (6,'r',[22,84,23,86]), (6,'r',[35,23,36,24])],
 'laser':  [(2,'p',[(32,8),(33,6),(33,16),(31,16)]), (7,'r',[34,0,36,13]), (6,'r',[35,0,36,1])],
 'bay':    [(5,'r',[29,74,36,85])],
 'fins':   [(2,'p',[(25,34),(18,28),(16,31),(24,40)]), (2,'p',[(24,90),(17,97),(19,99),(25,95)])],
 'boost':  [(5,'r',[18,88,23,96]), (6,'r',[19,97,22,98])],
 'armor':  [(9,'p',[(30,15),(27,25),(27,33),(30,31)]), (9,'p',[(13,59),(10,66),(10,73),(14,66)])],
}
def frigate(ups=(), turret=True):
    parts = list(BASE) if turret else list(BASE[:-1])
    for u in ('fins', 'armor', 'rockets', 'twin', 'boost', 'bay', 'emit', 'laser'):
        if u in ups: parts += UP[u]
    def det(px, ln):
        for y in (50, 72, 90): ln((26, y), (35, y), S.STEEL[0])
        ln((32, 55), (32, 69), S.STEEL2[0]); ln((30, 62), (35, 62), S.STEEL2[0]); ln((28, 18), (28, 23), S.STEEL[0])
        ln((12, 68), (12, 82), S.STEEL2[0]); ln((16, 58), (22, 58), S.STEEL2[0]); ln((18, 70), (18, 86), S.STEEL2[0])
        px([(27, y) for y in range(56, 70, 3)] + [(27, y) for y in range(76, 88, 3)], S.OCHRE[3]); px([(22, 38), (23, 36)], S.OCHRE[3])
        px([(30, 52), (34, 52), (30, 92), (34, 92), (20, 62), (15, 76)], S.STEEL[3]); px([(23, 75), (23, 77)], S.OCHRE[2]); px([(8, 66), (8, 72), (8, 78)], S.DARK[3])
        if turret: px([(35, 18)], S.DARK[3])
        px([(28, 97), (33, 97)], S.DARK[3])
        if 'bay' in ups: px([(30, 76), (30, 80), (30, 84)], S.ION[2]); ln((31, 75), (35, 75), S.DARK[2]); px([(33, 79), (34, 80), (33, 81)], S.STEEL[1])
        if 'rockets' in ups: px([(3, y) for y in range(66, 80, 3)] + [(5, y) for y in range(66, 80, 3)], S.EMBER[1])
        if 'fins' in ups: ln((23, 37), (19, 31), S.ION[1]); ln((23, 92), (19, 96), S.ION[1])
        if 'twin' in ups: px([(16, 71)], S.OCHRE[2]); px([(14, 61), (17, 61)], S.DARK[3])
        if 'laser' in ups: ln((35, 3), (35, 12), S.ION[0])
        if 'armor' in ups: ln((28, 22), (29, 28), S.STEEL[1])
    return S.sprite(72, 108, parts, RAMPS, det)
def bubble(im, cx, cy, rx, ry):
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov); c = S.rgb(S.ION[2])
    o.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=c + (16,), outline=c + (70,))
    for a in range(200, 300, 3): o.point((round(cx + (rx-1)*math.cos(math.radians(a))), round(cy + (ry-1)*math.sin(math.radians(a)))), S.rgb(S.ION[3]) + (230,))
    for a in range(205, 290, 9):
        for k in (5, 10): o.point((round(cx + (rx-k)*math.cos(math.radians(a + k))), round(cy + (ry-k)*math.sin(math.radians(a + k)))), c + (120,))
    for a in range(20, 80, 4): o.point((round(cx + (rx-1)*math.cos(math.radians(a))), round(cy + (ry-1)*math.sin(math.radians(a)))), c + (150,))
    return Image.alpha_composite(im, ov)
def dart():
    parts = [(2,'p',[(7,8),(2,13),(1,17),(4,16),(7,14)]), (1,'p',[(10,1),(8,5),(7,12),(8,16),(10,16)]), (4,'r',[9,5,10,8]),
             (5,'r',[8,16,10,17]), (6,'r',[9,18,10,18]), (3,'r',[3,13,4,14]), (7,'r',[1,10,1,13])]
    return S.sprite(20, 20, parts, RAMPS, lambda px, ln: px([(8, 11)], S.STEEL[0]))
DART = dart()
W, H = 540, 356
im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,)); d = ImageDraw.Draw(im); S.stars(d, 0, 0, W, H, 9, 160)
S.txt(d, 8, 6, 'PLAYER SHIP  ·  FRIGATE CLASS  ·  UPGRADE STAGES', '#bfc2cd')
stages = [(85, 'STAGE 1  ·  STOCK', (), ['BOW PULSE TURRET', 'TWO MAIN ENGINES']),
          (255, 'STAGE 2  ·  ARMED', ('twin', 'rockets', 'emit'), ['+ TWIN WING TURRETS', '+ ROCKET PODS', '+ SHIELD EMITTERS']),
          (440, 'STAGE 3  ·  FULLY UPGRADED', ('twin', 'rockets', 'emit', 'laser', 'bay', 'fins', 'boost', 'armor'), ['+ SPINAL HEAVY LASER', '+ FIGHTER BAY WITH DARTS', '+ SHIELD FINS AND BUBBLE', '+ BOOST ENGINES', '+ ARMOR PLATING'])]
for cx, name, ups, lines in stages:
    s = frigate(ups); top = 24
    for gx in ((cx-4, cx+3) if 'boost' not in ups else (cx-4, cx+3, cx-16, cx+15)): im = S.glow(im, gx, top + 106, 8 if 'boost' not in ups else 10, S.ION[2], 60)
    if 'laser' in ups: im = S.glow(im, cx, top + 1, 6, S.ION[2], 70)
    im.alpha_composite(s, (cx - 36, top))
    if 'emit' in ups and 'fins' not in ups:
        ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
        for a in range(0, 360, 6): o.point((round(cx + 44*math.cos(math.radians(a))), round(top + 58 + 62*math.sin(math.radians(a)))), S.rgb(S.ION[1]) + (110,))
        im = Image.alpha_composite(im, ov)
    if 'fins' in ups: im = bubble(im, cx, top + 56, 48, 66)
    if 'bay' in ups:
        d = ImageDraw.Draw(im)
        for (tx, ty, ang) in ((cx - 74, top + 30, 35), (cx + 66, top + 12, -30), (cx + 70, top + 84, -75)):
            n = 9
            for k in range(1, n): d.point((round(cx + (tx + 10 - cx)*k/n), round(top + 80 + (ty + 10 - top - 80)*k/n)), S.ION[1])
            im.alpha_composite(DART.rotate(ang, resample=Image.NEAREST, expand=True), (tx, ty)); d = ImageDraw.Draw(im)
    d = ImageDraw.Draw(im); S.txt(d, cx, 146, name, '#bfc2cd', 'c')
    for i, l in enumerate(lines): S.txt(d, cx, 158 + i*10, l, '#8a8ea0' if i or not ups else '#8a8ea0', 'c')
d.line([(8, 212), (W-8, 212)], fill='#2a2c3a'); S.txt(d, 8, 220, 'SHIP CLASSES  ·  SAME SCALE', '#bfc2cd')
base = 338
for s, x, name, size in ((DART, 18, 'DART', '20 × 20'), (S.FI.transpose(Image.FLIP_TOP_BOTTOM), 70, 'FIGHTER', '32 × 32'), (S.PL, 136, 'INTERCEPTOR', '48 × 48'), (S.GB.transpose(Image.FLIP_TOP_BOTTOM), 222, 'GUNBOAT', '48 × 58'), (frigate(), 314, 'FRIGATE', '72 × 108')):
    im.alpha_composite(s, (x, base - s.height - 22)); d = ImageDraw.Draw(im); S.txt(d, x + s.width//2, base - 16, name, '#8a8ea0', 'c'); S.txt(d, x + s.width//2, base - 6, size, '#5d6174', 'c')
x0, y0, x1, y1 = 420, 232, 516, base - 22
for k in range(0, (x1-x0), 6): d.line([(x0+k, y0), (x0+k+2, y0)], fill='#44475a'); d.line([(x0+k, y1), (x0+k+2, y1)], fill='#44475a')
for k in range(0, (y1-y0), 6): d.line([(x0, y0+k), (x0, y0+k+2)], fill='#44475a'); d.line([(x1, y0+k), (x1, y0+k+2)], fill='#44475a')
S.txt(d, 468, 262, 'CRUISER', '#5d6174', 'c'); S.txt(d, 468, 272, 'BOSS CLASS', '#5d6174', 'c'); S.txt(d, 468, 282, 'NOT DRAWN YET', '#44475a', 'c')
S.txt(d, 468, base - 16, 'CRUISER', '#8a8ea0', 'c'); S.txt(d, 468, base - 6, '160 AND UP', '#5d6174', 'c')
im.convert('RGB').resize((W*3, H*3), Image.NEAREST).quantize(160, dither=Image.Dither.NONE).save(os.path.join(S.OUT_DIR, 'frigate.png'), optimize=True)
