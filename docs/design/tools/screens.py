"""Mockup screens: space (Captain view) and top-down boarding."""
import os
import style as S, frigate as FR
from PIL import Image, ImageDraw, ImageOps
import math, random
K = 3; W, H = 640, 360
PANEL = '#0f0f1a'; LINE = '#2a2c3a'; TXT = '#bfc2cd'; DIM = '#6b6f82'
CAP = S.GLASS[2]; GUN = S.OCHRE[2]; ENG = '#58b0a0'
WRECK = ['#2b2a30', '#45434c', '#65626d', '#8b8792']; WRECK2 = ['#201f25', '#34323a', '#4c4a54', '#65626d']
def label(d, x, y, s, fg=TXT, bg=PANEL, anchor='l', border=LINE, pad=4):
    w = S.tw(s); x0 = x if anchor == 'l' else (x - w - 2*pad if anchor == 'r' else x - (w + 2*pad)//2)
    d.rectangle([x0, y, x0 + w + 2*pad - 1, y + 13], fill=bg, outline=border); S.txt(d, x0 + pad, y + 3, s, fg); return x0 + w + 2*pad
def tab(d, x, y, s, col, active=True):
    return label(d, x, y, s, fg=S.OUT if active else DIM, bg=col if active else PANEL, border=None if active else LINE) + 4
def bar(d, x, y, w, f, col): d.rectangle([x, y, x + w, y + 5], fill='#1c1c28', outline=S.OUT); d.rectangle([x + 1, y + 1, x + 1 + round((w - 2)*f), y + 4], fill=col)
def callout(d, n, x, y): d.ellipse([x-7, y-7, x+7, y+7], fill='#e3e5ec', outline=S.OUT); S.txt(d, x + 1, y - 4, str(n), S.OUT, 'c')
def finish(base, sprites, hud, name, hi=None):
    big = base.convert('RGBA').resize((W*K, H*K), Image.NEAREST)
    for img, cx, cy, ang in sprites:
        s = img.resize((img.width*K, img.height*K), Image.NEAREST).rotate(-ang, resample=Image.NEAREST, expand=True)
        big.alpha_composite(s, (round(cx*K - s.width/2), round(cy*K - s.height/2)))
    if hi: hi(ImageDraw.Draw(big))
    big.alpha_composite(hud.resize((W*K, H*K), Image.NEAREST))
    big.convert('RGB').quantize(200, dither=Image.Dither.NONE).save(os.path.join(S.OUT_DIR, name), optimize=True)
def bolt(D, x, y, heading, ln, core, tail, wd=2):
    a = math.radians(heading); ux, uy = math.sin(a), -math.cos(a); px_, py_ = -uy, ux
    def quad(t0, t1, col):
        pts = [((x + ux*t + px_*s*wd/2)*K, (y + uy*t + py_*s*wd/2)*K) for t, s in ((t0, -1), (t1, -1), (t1, 1), (t0, 1))]; D.polygon(pts, fill=col)
    quad(-ln*.6, 0, tail); quad(0, ln*.4, core)
def dashes(D, p0, p1, col, on=5, off=4):
    L = math.dist(p0, p1); t = 0
    while t < L:
        a, b = t/L, min(1, (t + on)/L); D.line([((p0[0] + (p1[0]-p0[0])*a)*K, (p0[1] + (p1[1]-p0[1])*a)*K), ((p0[0] + (p1[0]-p0[0])*b)*K, (p0[1] + (p1[1]-p0[1])*b)*K)], fill=col, width=K); t += on + off
def wreck():
    parts = [(2,'p',[(22,46),(10,56),(10,104),(22,108)]), (1,'p',[(40,4),(30,10),(24,30),(22,60),(22,112),(28,130),(40,134)]),
             (2,'r',[30,40,40,92]), (4,'p',[(40,14),(35,17),(34,26),(40,28)]), (5,'r',[28,130,40,137]), (5,'r',[6,62,10,98])]
    def det(px, ln):
        for y in (36, 60, 96, 116): ln((25, y), (39, y), WRECK[0])
        ln((34, 41), (34, 91), WRECK2[0]); ln((16, 58), (16, 104), WRECK2[0]); px([(27, 50), (27, 70), (27, 90), (13, 70), (13, 90)], WRECK[3])
    im = S.sprite(80, 140, parts, {1: WRECK, 2: WRECK2, 4: S.DARK, 5: S.DARK, 'glassy': (), 'glow': ()}, det); d = ImageDraw.Draw(im)
    for hole in ([(44,44),(56,40),(60,52),(50,60),(42,54)], [(26,84),(36,80),(38,94),(28,98)], [(52,104),(62,100),(64,112),(54,116)], [(62,56),(72,60),(70,74),(64,70)]):
        d.polygon(hole, fill=(0, 0, 0, 0), outline=S.OUT)
    for x, y in ((45, 56), (37, 92), (55, 113)): d.point((x, y), S.EMBER[2]); d.point((x + 1, y - 1), S.EMBER[3])
    d.rectangle([7, 76, 11, 84], fill=S.OCHRE[1], outline=S.OUT); d.rectangle([8, 79, 10, 81], fill=S.OUT)
    return im
def rock(r, seed):
    g = random.Random(seed); im = Image.new('RGBA', (r*2 + 4, r*2 + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = r + 2
    pts = [(c + r*g.uniform(.7, 1)*math.cos(i*math.pi/5), c + r*g.uniform(.7, 1)*math.sin(i*math.pi/5)) for i in range(10)]
    d.polygon(pts, fill='#3b3840', outline=S.OUT); d.polygon([(c - r*.5, c - r*.5), (c + r*.1, c - r*.6), (c - r*.1, c - r*.1), (c - r*.55, c)], fill='#55525c'); d.point((c + r*.3, c + r*.3), '#2b2a30'); return im
def space_bg(seed):
    im = Image.new('RGBA', (W, H), S.rgb('#090911') + (255,)); px = im.load(); g = random.Random(seed)
    for cx, cy, rx, ry in ((470, 250, 170, 70), (150, 90, 150, 60), (560, 60, 90, 50)):
        for y in range(max(0, cy-ry), min(H, cy+ry)):
            for x in range(max(0, cx-rx), min(W, cx+rx)):
                t = ((x-cx)/rx)**2 + ((y-cy)/ry)**2
                if (t < .4 and (x + y) % 2 == 0) or (t < 1 and x % 3 == 0 and y % 3 == 0): px[x, y] = (17, 17, 30, 255)
    S.stars(ImageDraw.Draw(im), 0, 0, W, H, seed, 260); return im
WR = wreck()

# ---------------- A: space, captain view ----------------
def scene_space():
    base = space_bg(5); fr = FR.frigate(('twin', 'rockets', 'emit')); fx, fy, fh = 250, 216, 52
    base = S.glow(base, 207, 250, 13, S.ION[2], 70); base = S.glow(base, 62, 52, 8, S.EMBER[2], 50)
    sprites = [(WR, 500, 126, 104), (rock(14, 2), 392, 300, 0), (rock(8, 4), 318, 52, 0), (fr, fx, fy, fh),
               (S.GB, 70, 66, 120 - 180), (S.FI, 156, 150, 122 - 180), (S.FI, 118, 286, 62 - 180)]
    port = (452, 178); nose = (fx + 56*math.sin(math.radians(fh)), fy - 56*math.cos(math.radians(fh)))
    def hi(D):
        dashes(D, nose, port, S.ION[1])
        for dx, dy in ((-9, -8), (9, -8), (-9, 8), (9, 8)):
            D.line([((port[0]+dx)*K, (port[1]+dy)*K), ((port[0]+dx - 4*(1 if dx > 0 else -1))*K, (port[1]+dy)*K)], fill=S.ION[2], width=K); D.line([((port[0]+dx)*K, (port[1]+dy)*K), ((port[0]+dx)*K, (port[1]+dy - 4*(1 if dy > 0 else -1))*K)], fill=S.ION[2], width=K)
        for t in (.25, .45, .65): bolt(D, 236 + (160-236)*t, 204 + (154-204)*t, -56, 9, S.OCHRE[3], S.OCHRE[1])
        for t in (.35, .7): bolt(D, 168 + (232-168)*t, 160 + (200-160)*t, 122, 8, S.ACID[3], S.ACID[1])
        for t in (.3, .6): bolt(D, 130 + (228-130)*t, 280 + (232-280)*t, 62, 8, S.ACID[3], S.ACID[1])
        for t in (.3, .55): bolt(D, 84 + (226-84)*t, 76 + (190-76)*t, 128, 10, S.EMBER[3], S.EMBER[1], 3)
        cx, cy = 164, 156; D.polygon([((cx + r*math.cos(a))*K, (cy + r*math.sin(a))*K) for i in range(10) for r, a in [((7 if i % 2 == 0 else 3), i*math.pi/5)]], fill=S.OCHRE[3])
    hud = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hud)
    x = tab(d, 8, 8, '1  CAPTAIN', CAP); x2 = tab(d, x, 8, '2  ENGINEER', ENG, False); d.rectangle([x + 62, 6, x + 67, 11], fill=S.EMBER[1], outline=S.OUT); tab(d, x2, 8, 'MAP', '#e3e5ec', False)
    label(d, 320, 8, 'DOCKING  ·  HOLD COURSE', fg=S.ION[2], anchor='c', border=S.ION[0])
    label(d, 632, 8, 'CREDITS  340', fg=S.OCHRE[2], anchor='r'); label(d, 632, 24, 'STAR CHARTS  1', fg=S.ION[2], anchor='r')
    for i, (s, f, c) in enumerate((('FUEL', .55, S.OCHRE[2]), ('SHIELD', .8, S.ION[1]), ('HULL', .9, S.STEEL[2]))):
        y = 316 + i*12; d.rectangle([8, y - 2, 140, y + 9], fill=PANEL); S.txt(d, 12, y, s, DIM); bar(d, 52, y + 1, 84, f, c)
    label(d, 320, 338, 'JUMP DRIVE  ·  CHARGED', fg=DIM, anchor='c')
    mx, my = 560, 280; d.rectangle([mx, my, mx + 72, my + 72], fill='#11111d', outline=LINE)
    for y in range(my + 1, my + 72):
        for x in range(mx + 1, mx + 72):
            if math.dist((x, y), (mx + 30, my + 44)) > 24 and (x + y) % 2 == 0: d.point((x, y), '#090911')
    for a in range(0, 360, 20): d.point((mx + 30 + round(24*math.cos(math.radians(a))), my + 44 + round(24*math.sin(math.radians(a)))), S.ION[0])
    d.rectangle([mx + 29, my + 43, mx + 31, my + 45], fill=CAP); d.rectangle([mx + 44, my + 34, mx + 46, my + 36], fill=S.OCHRE[2])
    for p in ((16, 32), (20, 38), (22, 54)): d.rectangle([mx + p[0], my + p[1], mx + p[0] + 1, my + p[1] + 1], fill=S.EMBER[1])
    S.txt(d, mx + 58, my + 5, '?', DIM); S.txt(d, mx + 8, my + 8, '?', DIM)
    d.polygon([(8, 176), (16, 170), (16, 182)], fill=S.OCHRE[2], outline=S.OUT); label(d, 20, 169, 'DISTRESS CALL  ·  NEUTRAL STATION  ·  2.4 KM', fg=S.OCHRE[2], border=S.OCHRE[0])
    for n, x, y in ((1, 296, 262), (2, 424, 200), (3, 196, 124), (4, 150, 30), (5, 548, 316), (6, 388, 344), (7, 232, 176)): callout(d, n, x, y)
    finish(base, sprites, hud, 'space.png', hi)

# ---------------- B: boarding, top-down ----------------
def scene_board():
    T = 16; C, R = 40, 22; g = [[' ']*C for _ in range(R)]
    def room(c0, r0, c1, r1):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1): g[r][c] = '#' if r in (r0, r1) or c in (c0, c1) else ('.' if g[r][c] == ' ' else g[r][c])
    for a in ((8, 2, 18, 8), (18, 2, 29, 8), (29, 2, 39, 8), (8, 8, 39, 13), (8, 13, 18, 19), (18, 13, 29, 19), (29, 13, 39, 19)): room(*a)
    for c, r in ((12, 8), (13, 8), (22, 8), (23, 8), (14, 13), (15, 13), (24, 13), (25, 13), (33, 13), (34, 13), (8, 10), (8, 11)): g[r][c] = '.'
    g[5][29] = 'L'; g[4][29] = 'L'
    base = space_bg(8); d = ImageDraw.Draw(base)
    fr = FR.frigate(('twin', 'rockets', 'emit')); base.alpha_composite(fr, (-16, 122)); d = ImageDraw.Draw(base)
    d.rectangle([54, 158, 128, 193], fill=S.STEEL2[0], outline=S.OUT); d.rectangle([54, 162, 128, 189], fill='#191a25')
    for x in range(62, 128, 12): d.line([(x, 162), (x, 189)], fill=S.STEEL2[0])
    d.line([(54, 160), (128, 160)], fill=S.STEEL2[2]); d.rectangle([56, 174, 126, 177], fill='#1f2a2e')
    solid = lambda c, r: 0 <= r < R and 0 <= c < C and g[r][c] in '#L'
    for r in range(R):
        for c in range(C):
            ch = g[r][c]; x, y = c*T, r*T
            if ch == ' ': continue
            if ch == '.':
                corridor = 9 <= r <= 12; col = ('#1b1c27', '#1e1f2b')[(r + c) % 2] if not corridor else ('#1e2029', '#21232d')[(r + c) % 2]
                d.rectangle([x, y, x + T - 1, y + T - 1], fill=col); d.line([(x, y + T - 1), (x + T - 1, y + T - 1)], fill='#14141d'); d.line([(x + T - 1, y), (x + T - 1, y + T - 1)], fill='#14141d'); d.point([(x + 2, y + 2), (x + T - 4, y + 2)], '#2c2d3b')
    for r in range(R):
        for c in range(C):
            ch = g[r][c]; x, y = c*T, r*T
            if ch not in '#L': continue
            d.rectangle([x, y, x + T - 1, y + T - 1], fill=S.STEEL2[1])
            if not solid(c, r - 1): d.line([(x, y), (x + T - 1, y)], fill=S.STEEL2[2])
            if not solid(c, r + 1) and r + 1 < R and g[r + 1][c] == '.':
                d.rectangle([x, y + 7, x + T - 1, y + T - 1], fill=S.STEEL2[0]); d.line([(x, y + 7), (x + T - 1, y + 7)], fill=S.OUT); d.rectangle([x + 3, y + 10, x + 12, y + 12], fill=S.DARK[0]); d.point((x + 5, y + 11), S.OCHRE[1])
            for (dc, dr, seg) in ((0, -1, [(x, y), (x + T - 1, y)]), (0, 1, [(x, y + T - 1), (x + T - 1, y + T - 1)]), (-1, 0, [(x, y), (x, y + T - 1)]), (1, 0, [(x + T - 1, y), (x + T - 1, y + T - 1)])):
                if not solid(c + dc, r + dr): d.line(seg, fill=S.OUT)
            if ch == 'L':
                d.rectangle([x + 4, y, x + 11, y + T - 1], fill=S.DARK[1], outline=S.OUT)
                for k in range(0, T, 4): d.rectangle([x + 5, y + k, x + 10, y + k + 1], fill=S.OCHRE[1])
    # corridor guide stripe, reactor, terminal
    for c in range(9, 39): d.rectangle([c*T + 5, 10*T + 15, c*T + 10, 10*T + 16], fill='#2c3d40')
    d.rectangle([27*T + 4, 4*T + 4, 28*T - 1, 5*T + 8], fill=PANEL, outline=S.OCHRE[1]); d.rectangle([27*T + 7, 4*T + 7, 27*T + 11, 4*T + 9], fill=S.OCHRE[2]); d.rectangle([27*T + 7, 5*T + 2, 27*T + 9, 5*T + 4], fill=S.EMBER[1])
    rx, ry = 23*T, 16*T; base = S.glow(base, rx + 8, ry + 8, 40, S.EMBER[1], 46); base = S.glow(base, 34*T + 8, 5*T, 26, S.ION[2], 40); base = S.glow(base, 9*T, 11*T, 26, S.ION[1], 20)
    d = ImageDraw.Draw(base)
    d.ellipse([rx - 14, ry - 14, rx + 30, ry + 30], fill=S.DARK[1], outline=S.OUT); d.ellipse([rx - 8, ry - 8, rx + 24, ry + 24], fill=S.EMBER[0], outline=S.OUT); d.ellipse([rx - 2, ry - 2, rx + 18, ry + 18], fill=S.EMBER[1]); d.ellipse([rx + 3, ry + 3, rx + 13, ry + 13], fill=S.EMBER[3])
    for a in range(0, 360, 45): d.rectangle([rx + 8 + round(19*math.cos(math.radians(a))) - 1, ry + 8 + round(19*math.sin(math.radians(a))) - 1, rx + 8 + round(19*math.cos(math.radians(a))) + 1, ry + 8 + round(19*math.sin(math.radians(a))) + 1], fill=S.OCHRE[1])
    CR, CE, TU = S.CR, S.CE, S.TU
    for c, r in ((10, 3), (11, 3), (10.2, 4.2), (15, 6), (35, 3), (36.1, 3.2), (31, 15), (10, 17)): base.alpha_composite(CR, (round(c*T), round(r*T)))
    for c, r in ((16, 3), (12, 15), (13, 15.3), (37, 6), (36, 17), (37, 17.2), (20, 4)): base.alpha_composite(CE, (round(c*T), round(r*T)))
    d = ImageDraw.Draw(base); cx, cy = 33*T + 8, 5*T + 4
    d.rectangle([cx - 8, cy - 6, cx + 8, cy + 6], fill=S.GLASS[0], outline=S.OUT); d.rectangle([cx - 6, cy - 4, cx + 6, cy + 4], fill=S.GLASS[1])
    for p in ((-4, -2), (0, 1), (3, -1), (-2, 2), (4, 2)): d.point((cx + p[0], cy + p[1]), S.ION[3])
    d.line([(cx - 4, cy - 2), (cx, cy + 1), (cx + 3, cy - 1)], fill=S.ION[1])
    me1 = S.person(S.STEEL, S.rgb(ENG) and [ENG]*4, S.GLASS); me2 = S.person(S.STEEL, [CAP]*4, S.GLASS); gd = S.guard
    sprites = [(me1, 14*T, 10*T + 8, 90), (me2, 19*T, 12*T, 70), (gd, 29*T, 9*T + 10, -100), (gd, 31*T, 12*T, -80), (gd, 33*T + 8, 16*T, -30),
               (TU, 37*T, 11*T, -92), (TU, 24*T, 4*T, 200)]
    def hi(D):
        for x in (16.5, 19, 22.5): bolt(D, x*T, 10*T + 8, 90, 7, S.OCHRE[3], S.OCHRE[1])
        for x in (33.5, 27): bolt(D, x*T, 11*T - 2, -92, 7, S.ACID[3], S.ACID[1])
        bolt(D, 26.5*T, 10*T + 2, -98, 7, S.ACID[3], S.ACID[1])
        for k in range(1, 9): t = k/9; D.rectangle([((19.5 + 9.5*t)*T - .5)*K, (12*T - 6 - 40*math.sin(math.pi*t*.92) - .5)*K, ((19.5 + 9.5*t)*T + .5)*K, (12*T - 6 - 40*math.sin(math.pi*t*.92) + .5)*K], fill=S.STEEL[2])
        gx, gy = 28.2*T, 9.6*T; D.rectangle([(gx - 2)*K, (gy - 2)*K, (gx + 2)*K, (gy + 2)*K], fill=S.DARK[2], outline=S.OUT); D.rectangle([(gx - .5)*K, (gy - .5)*K, (gx + .5)*K, (gy + .5)*K], fill=S.EMBER[2])
    hud = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hud)
    x = tab(d, 8, 8, 'BOARDING', '#e3e5ec'); tab(d, x, 8, '2  ENGINEER', ENG, False)
    label(d, 320, 8, 'REACTOR UNSTABLE   0:48', fg=S.EMBER[2], anchor='c', border=S.EMBER[0]); label(d, 632, 8, 'CARRY  1 / 3', fg=S.OCHRE[2], anchor='r')
    d.rectangle([8, 334, 118, 349], fill=PANEL, outline=LINE); S.txt(d, 12, 338, 'HP', DIM); bar(d, 28, 339, 84, .35, S.EMBER[1])
    x = label(d, 124, 335, 'TELEPORT  READY', fg=S.ION[2], border=S.ION[0]) + 8
    x = label(d, x, 335, 'RIFLE  MK 2', fg=S.OUT, bg=S.OCHRE[2], border=None) + 4; label(d, x, 335, 'GRENADES  3', fg=TXT)
    label(d, 632, 335, 'RADAR:  HOSTILE SHIP  40 S OUT', fg=S.OCHRE[2], anchor='r', border=S.OCHRE[0])
    for n, x, y in ((1, 30, 112), (2, 92, 148), (3, 14*T, 9*T - 2), (4, 26*T, 6*T), (5, 35*T, 10*T - 4), (6, 33*T + 8, 7*T - 2), (7, 26*T + 4, 16*T + 8), (8, 462, 342)): callout(d, n, x, y)
    finish(base, sprites, hud, 'boarding.png', hi)

# ---------------- C: engineer view, sector map + star charts ----------------
def scene_map():
    base = Image.new('RGBA', (W, H), S.rgb('#0d0d18') + (255,)); d = ImageDraw.Draw(base); px = base.load()
    mw = 420; circles = [(170, 210, 46), (84, 96, 62), (300, 250, 40), (330, 110, 30)]
    for gx in range(0, mw, 32): d.line([(gx, 0), (gx, H)], fill='#161624')
    for gy in range(0, H, 32): d.line([(0, gy), (mw, gy)], fill='#161624')
    S.stars(d, 0, 0, mw, H, 12, 120)
    for y in range(H):
        for x in range(mw):
            if not any(math.dist((x, y), (c[0], c[1])) <= c[2] for c in circles): px[x, y] = (8, 8, 15, 255) if (x + y) % 2 else (13, 13, 23, 255)
    def ring(cx, cy, r, col):
        for a in range(0, 360, 8):
            a0, a1 = math.radians(a), math.radians(a + 4); d.line([(round(cx + r*math.cos(a0)), round(cy + r*math.sin(a0))), (round(cx + r*math.cos(a1)), round(cy + r*math.sin(a1)))], fill=col)
    for (cx, cy, r), col in zip(circles, (CAP, ENG, ENG, S.ION[1])): ring(cx, cy, r, col)
    base.alpha_composite(FR.DART.rotate(-40, resample=Image.NEAREST, expand=True), (156, 196)); d = ImageDraw.Draw(base)
    d.rectangle([76, 88, 92, 104], fill=ENG, outline=S.OUT); d.rectangle([80, 92, 88, 100], fill=S.OUT); d.rectangle([83, 95, 85, 97], fill=ENG)
    d.rectangle([298, 244, 302, 254], fill=ENG, outline=S.OUT); d.line([(300, 244), (300, 236)], fill=ENG); d.point((300, 235), '#e3e5ec')
    d.ellipse([326, 106, 334, 114], fill=S.ION[2], outline=S.OUT)
    for k in range(1, 12): d.point((round(176 + (326-176)*k/12), round(204 + (112-204)*k/12)), S.ION[1])
    for x, y in ((318, 262), (346, 100), (322, 232)): d.polygon([(x, y - 4), (x + 4, y), (x, y + 4), (x - 4, y)], fill=S.EMBER[1], outline=S.OUT)
    d.rectangle([196, 186, 203, 193], fill=S.OCHRE[2], outline=S.OUT); d.rectangle([112, 124, 118, 130], fill=S.OCHRE[2], outline=S.OUT); d.rectangle([338, 122, 344, 128], fill=S.OCHRE[2], outline=S.OUT)
    for x, y in ((250, 40), (390, 180), (40, 280), (230, 320), (380, 320), (200, 110)): S.txt(d, x, y, '?', '#44475a')
    S.txt(d, 84, 28, 'OWN BASE', ENG, 'c'); S.txt(d, 300, 294, 'BUOY', ENG, 'c'); S.txt(d, 330, 74, 'PROBE  MK 2', S.ION[2], 'c'); S.txt(d, 208, 176, 'WRECK', S.OCHRE[2]); S.txt(d, 352, 122, 'CARGO POD', S.OCHRE[2])
    # right panel
    d.rectangle([mw, 0, W, H], fill=PANEL); d.line([(mw, 0), (mw, H)], fill=LINE)
    S.txt(d, mw + 12, 30, 'STAR CHARTS', TXT); d.line([(mw + 12, 42), (W - 12, 42)], fill=LINE)
    nodes = {'KESTREL DRIFT': (mw + 40, 70), 'ASH BELT': (mw + 110, 96), 'HOLLOW REACH': (mw + 60, 132), '?1': (mw + 170, 70), '?2': (mw + 150, 140), 'THE MAW': (mw + 186, 110)}
    for a, b in (('KESTREL DRIFT', 'ASH BELT'), ('KESTREL DRIFT', 'HOLLOW REACH'), ('ASH BELT', '?1'), ('ASH BELT', '?2'), ('?1', 'THE MAW'), ('?2', 'THE MAW'), ('HOLLOW REACH', '?2')):
        known = '?' not in a and '?' not in b and b != 'THE MAW'; p0, p1 = nodes[a], nodes[b]; L = math.dist(p0, p1)
        for k in range(0, int(L), 1 if known else 4): d.point((round(p0[0] + (p1[0]-p0[0])*k/L), round(p0[1] + (p1[1]-p0[1])*k/L)), S.ION[0] if known else '#34364a')
    for n, (x, y) in nodes.items():
        if n == 'KESTREL DRIFT': d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=CAP, outline='#e3e5ec')
        elif n in ('ASH BELT', 'HOLLOW REACH'): d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=S.ION[0], outline=S.ION[2])
        elif n == 'THE MAW': d.polygon([(x, y - 7), (x + 7, y), (x, y + 7), (x - 7, y)], fill=S.EMBER[0], outline=S.EMBER[2])
        else: d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=PANEL, outline='#44475a'); S.txt(d, x, y - 3, '?', '#6b6f82', 'c')
    S.txt(d, mw + 40, 52, 'YOU ARE HERE', CAP, 'c'); S.txt(d, mw + 186, 122, 'THE MAW', S.EMBER[2], 'c')
    y = 162
    for name, sub, col, bcol in (('ASH BELT', ['CHART OWNED  ·  JUMP COST  40 FUEL', 'RICH IN FUEL  ·  HEAVY DEFENSES'], S.ION[2], S.ION[0]), ('HOLLOW REACH', ['CHART OWNED  ·  JUMP COST  25 FUEL', 'MANY WRECKS  ·  PATROLS'], S.ION[2], LINE), ('UNKNOWN SECTOR', ['NO CHART  ·  FIND OR BUY ONE'], DIM, LINE)):
        h = 16 + 10*len(sub); d.rectangle([mw + 10, y, W - 10, y + h], fill='#141420', outline=bcol); S.txt(d, mw + 16, y + 4, name, col)
        for i, s in enumerate(sub): S.txt(d, mw + 16, y + 15 + i*10, s, DIM)
        y += h + 6
    d.line([(mw + 12, 282), (W - 12, 282)], fill=LINE); S.txt(d, mw + 12, 290, 'POWER', TXT); S.txt(d, W - 12, 290, '7 / 9', S.OCHRE[2], 'r')
    for i, (s, n, col) in enumerate((('ENGINES', 3, CAP), ('SHIELDS', 2, S.ION[1]), ('WEAPONS', 2, GUN))):
        yy = 304 + i*14; S.txt(d, mw + 12, yy, s, DIM)
        for k in range(4): d.rectangle([mw + 76 + k*14, yy - 1, mw + 86 + k*14, yy + 7], fill=col if k < n else '#1c1c28', outline=S.OUT)
    hud = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hud)
    x = tab(d, 8, 8, '2  ENGINEER', ENG); tab(d, x, 8, '1  CAPTAIN', CAP, False)
    x = label(d, 8, 338, 'PROBES  3', fg=S.ION[2]) + 4; x = label(d, x, 338, 'BUOYS  1', fg=ENG) + 4; label(d, mw - 8, 338, '3 HOSTILES', fg=S.EMBER[2], anchor='r', border=S.EMBER[0])
    for n, x, y in ((1, 150, 240), (2, 364, 92), (3, 276, 262), (4, 140, 70), (5, mw + 150, 60), (6, mw + 196, 170), (7, mw + 150, 290)): callout(d, n, x, y)
    finish(base, [], hud, 'map.png')
scene_space(); scene_board()
