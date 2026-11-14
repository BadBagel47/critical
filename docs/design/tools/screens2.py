"""Mockup screens: Engineer repair view and the shared map."""
import os
import style as S, frigate as FR, screens as SC
from PIL import Image, ImageDraw
import math
W, H = SC.W, SC.H; PANEL, LINE, TXT, DIM, CAP, GUN, ENG = SC.PANEL, SC.LINE, SC.TXT, SC.DIM, SC.CAP, SC.GUN, SC.ENG
label, tab, bar, callout = SC.label, SC.tab, SC.bar, SC.callout
def scene_eng():
    base = Image.new('RGBA', (W, H), S.rgb('#0d0d18') + (255,)); d = ImageDraw.Draw(base)
    for gx in range(0, 440, 16): d.line([(gx, 0), (gx, H)], fill='#12121e')
    for gy in range(0, H, 16): d.line([(0, gy), (440, gy)], fill='#12121e')
    fr = FR.frigate(('twin', 'rockets', 'emit')); bp = Image.new('RGBA', fr.size, (0, 0, 0, 0)); p, q = fr.load(), bp.load(); out = S.rgb(S.OUT)
    for y in range(fr.height):
        for x in range(fr.width):
            r, g, b, a = p[x, y]
            if not a: continue
            lum = (r + g + b)/3; q[x, y] = S.rgb(S.ION[0]) + (255,) if (r, g, b) == out else S.rgb('#10262e' if lum < 70 else '#173844' if lum < 120 else '#20505e') + (255,)
    bx, by = 150, 72; base.alpha_composite(bp.resize((fr.width*2, fr.height*2), Image.NEAREST), (bx, by)); d = ImageDraw.Draw(base)
    nodes = [('BOW TURRET', (36, 16), 'OK', 1), ('BRIDGE', (36, 36), 'OK', 1), ('REACTOR', (36, 62), 'OK', 1), ('STARBOARD WING', (58, 70), 'OK', 1), ('ENGINES', (36, 98), 'CRITICAL  20%', 3), ('PORT WING', (14, 70), 'DAMAGED  60%', 2)]
    col = {1: ENG, 2: S.OCHRE[2], 3: S.EMBER[1]}; pos = {}
    for name, (nx, ny), st, lv in nodes:
        x, y = bx + nx*2, by + ny*2; pos[name] = (x, y)
        if name == 'PORT WING':
            d.line([(x - 8, y), (136, y)], fill=col[lv]); S.txt(d, 130, y - 14, name, TXT, 'r'); S.txt(d, 130, y - 3, st, col[lv], 'r'); S.txt(d, 130, y + 8, 'REPAIR CREW HERE', S.OCHRE[3], 'r')
        else:
            o = -8 if name == 'REACTOR' else 8 if name == 'STARBOARD WING' else 0
            d.line([(x + 8, y), (304, y)], fill=col[lv] if lv > 1 else '#2f4f58'); S.txt(d, 310, y - 9 + o, name, TXT); S.txt(d, 370 if o else 310, y - 9 + o if o else y + 2, st, col[lv]) if not o else S.txt(d, 310 + S.tw(name) + 8, y - 9 + o, st, col[lv])
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=PANEL, outline=col[lv]); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=col[lv])
    x, y = pos['PORT WING']
    for a in range(-90, 126, 6): d.rectangle([x + round(11*math.cos(math.radians(a))) - 1, y + round(11*math.sin(math.radians(a))) - 1, x + round(11*math.cos(math.radians(a))), y + round(11*math.sin(math.radians(a)))], fill=S.OCHRE[3])
    d.polygon([(x - 16, y + 14), (x - 10, y + 8), (x - 4, y + 14), (x - 10, y + 20)], fill=S.OCHRE[2], outline=S.OUT); d.rectangle([x - 11, y + 13, x - 9, y + 15], fill=S.OUT)
    ex, ey = pos['ENGINES']
    for k in range(2, 11): d.point((round(x + (ex - x)*k/12), round(y + 12 + (ey - y - 12)*k/12)), S.OCHRE[1])
    S.txt(d, x + 4, y + 34, 'NEXT', S.OCHRE[1])
    for a in range(0, 360, 20): d.point((ex + round(10*math.cos(math.radians(a))), ey + round(10*math.sin(math.radians(a)))), S.EMBER[2])
    # right panel
    mw = 440; d.rectangle([mw, 0, W, H], fill=PANEL); d.line([(mw, 0), (mw, H)], fill=LINE)
    S.txt(d, mw + 12, 30, 'POWER', TXT); S.txt(d, W - 12, 30, '9 / 10', S.OCHRE[2], 'r'); d.line([(mw + 12, 42), (W - 12, 42)], fill=LINE)
    for i, (s, n, c, note) in enumerate((('WEAPONS', 2, GUN, 'FIRE RATE  NORMAL'), ('SHIELDS', 3, S.ION[1], 'RECHARGE  FAST'), ('ENGINES', 1, CAP, 'SPEED  LOW'), ('REPAIR', 3, S.OCHRE[3], 'REPAIR SPEED  FAST'))):
        yy = 54 + i*40; d.rectangle([mw + 10, yy - 4, W - 10, yy + 28], fill='#141420', outline=S.OCHRE[0] if s == 'REPAIR' else LINE); S.txt(d, mw + 16, yy, s, TXT)
        for k in range(5): d.rectangle([mw + 96 + k*17, yy - 1, mw + 109 + k*17, yy + 8], fill=c if k < n else '#1c1c28', outline=S.OUT)
        S.txt(d, mw + 16, yy + 14, note, DIM)
    S.txt(d, mw + 12, 222, 'TOOLS', TXT); d.line([(mw + 12, 234), (W - 12, 234)], fill=LINE)
    for i, (s, st, c) in enumerate((('SCANNER PULSE', 'READY', S.ION[2]), ('TARGET SCANNER', 'ACTIVE', S.ION[2]), ('PROBES', '3 LEFT', TXT), ('REPAIR DRONES', 'NOT INSTALLED', '#44475a'))):
        yy = 244 + i*14; S.txt(d, mw + 16, yy, s, DIM if c != '#44475a' else '#44475a'); S.txt(d, W - 16, yy, st, c, 'r')
    d.rectangle([8, 316, 140, 351], fill=PANEL, outline=LINE)
    for i, (s, f, c) in enumerate((('HULL', .62, S.STEEL[2]), ('SHIELD', .8, S.ION[1]))): S.txt(d, 12, 322 + i*14, s, DIM); bar(d, 52, 323 + i*14, 84, f, c)
    hud = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hud)
    x = tab(d, 8, 8, '2  ENGINEER', ENG); x = tab(d, x, 8, '1  CAPTAIN', CAP, False); tab(d, x, 8, 'MAP', '#e3e5ec', False)
    label(d, 222, 34, 'ENGINES CRITICAL', fg=S.EMBER[2], anchor='c', border=S.EMBER[0])
    for n, x, y in ((1, 60, 196), (2, 178, 262), (3, 396, 262), (4, mw + 150, 26), (5, mw + 186, 196), (6, mw + 90, 222)): callout(d, n, x, y)
    SC.finish(base, [], hud, 'engineer.png')
def scene_map():
    base = Image.new('RGBA', (W, H), S.rgb('#0d0d18') + (255,)); d = ImageDraw.Draw(base); px = base.load()
    mw = 420; circles = [(170, 210, 46), (84, 96, 62), (300, 250, 40), (330, 110, 30)]
    for gx in range(0, mw, 32): d.line([(gx, 0), (gx, H)], fill='#161624')
    for gy in range(0, H, 32): d.line([(0, gy), (mw, gy)], fill='#161624')
    S.stars(d, 0, 0, mw, H, 12, 120)
    for y in range(H):
        for x in range(mw):
            if not any(math.dist((x, y), (c[0], c[1])) <= c[2] for c in circles): px[x, y] = (8, 8, 15, 255) if (x + y) % 2 else (13, 13, 23, 255)
    def ring(cx, cy, r, col, step=8, on=4):
        for a in range(0, 360, step):
            a0, a1 = math.radians(a), math.radians(a + on); d.line([(round(cx + r*math.cos(a0)), round(cy + r*math.sin(a0))), (round(cx + r*math.cos(a1)), round(cy + r*math.sin(a1)))], fill=col)
    def station(x, y, col, dim=False):
        d.rectangle([x - 8, y - 8, x + 8, y + 8], fill=col, outline=S.OUT); d.rectangle([x - 4, y - 4, x + 4, y + 4], fill=S.OUT); d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=col)
    for (cx, cy, r), col in zip(circles, (CAP, ENG, ENG, S.ION[1])): ring(cx, cy, r, col)
    base.alpha_composite(FR.DART.rotate(-40, resample=Image.NEAREST, expand=True), (156, 196)); d = ImageDraw.Draw(base)
    station(84, 96, ENG)
    d.rectangle([298, 244, 302, 254], fill=ENG, outline=S.OUT); d.line([(300, 244), (300, 236)], fill=ENG); d.point((300, 235), '#e3e5ec')
    d.ellipse([326, 106, 334, 114], fill=S.ION[2], outline=S.OUT)
    for k in range(1, 12): d.point((round(176 + (326-176)*k/12), round(204 + (112-204)*k/12)), S.ION[1])
    for x, y in ((318, 262), (346, 100), (322, 232)): d.polygon([(x, y - 4), (x + 4, y), (x, y + 4), (x - 4, y)], fill=S.EMBER[1], outline=S.OUT)
    d.rectangle([196, 186, 203, 193], fill=S.OCHRE[2], outline=S.OUT); d.rectangle([338, 122, 344, 128], fill=S.OCHRE[2], outline=S.OUT)
    # remembered stationary objects out in the fog
    station(232, 52, '#8a8ea0'); ring(232, 52, 16, S.OCHRE[2], 30, 14); ring(232, 52, 22, S.OCHRE[0], 30, 14)
    d.rectangle([52, 296, 59, 303], fill='#6b5a34', outline=S.OUT); station(388, 262, '#7a3a34')
    for x, y in ((390, 180), (230, 320), (150, 150)): S.txt(d, x, y, '?', '#44475a')
    S.txt(d, 84, 28, 'FRIENDLY STATION', ENG, 'c'); S.txt(d, 84, 112, 'SHIPYARD', ENG, 'c'); S.txt(d, 300, 294, 'BUOY', ENG, 'c'); S.txt(d, 330, 74, 'PROBE  MK 2', S.ION[2], 'c'); S.txt(d, 208, 176, 'WRECK', S.OCHRE[2]); S.txt(d, 352, 122, 'CARGO POD', S.OCHRE[2])
    S.txt(d, 232, 80, 'NEUTRAL STATION', '#8a8ea0', 'c'); S.txt(d, 232, 90, 'DISTRESS CALL', S.OCHRE[2], 'c'); S.txt(d, 56, 310, 'WRECK  ·  LOOTED', '#6b6f82', 'c'); S.txt(d, 388, 278, 'HOSTILE', '#a8554a', 'c'); S.txt(d, 388, 288, 'LAST SEEN', '#6b6f82', 'c')
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
    for name, sub, col, bcol in (('ASH BELT', ['CHART OWNED  ·  JUMP COST  40 FUEL', 'RICH IN FUEL  ·  HEAVY DEFENSES'], S.ION[2], S.ION[0]), ('HOLLOW REACH', ['CHART OWNED  ·  JUMP COST  25 FUEL', 'MANY WRECKS  ·  PIRATE PATROLS'], S.ION[2], LINE), ('UNKNOWN SECTOR', ['NO CHART  ·  FIND OR BUY ONE'], DIM, LINE)):
        h = 16 + 10*len(sub); d.rectangle([mw + 10, y, W - 10, y + h], fill='#141420', outline=bcol); S.txt(d, mw + 16, y + 4, name, col)
        for i, s in enumerate(sub): S.txt(d, mw + 16, y + 15 + i*10, s, DIM)
        y += h + 6
    d.line([(mw + 12, 282), (W - 12, 282)], fill=LINE)
    for i, (s, c) in enumerate((('FRIENDLY', ENG), ('NEUTRAL', '#8a8ea0'), ('HOSTILE', S.EMBER[1]), ('WRECK OR CARGO', S.OCHRE[2]), ('PIRATE, ONLY WHILE SEEN', S.EMBER[1]))):
        yy = 290 + i*13
        if i < 4: d.rectangle([mw + 14, yy, mw + 20, yy + 6], fill=c, outline=S.OUT)
        else: d.polygon([(mw + 17, yy - 1), (mw + 21, yy + 3), (mw + 17, yy + 7), (mw + 13, yy + 3)], fill=c, outline=S.OUT)
        S.txt(d, mw + 28, yy, s, DIM)
    hud = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hud)
    x = tab(d, 8, 8, 'MAP', '#e3e5ec'); tab(d, x, 8, '1  CAPTAIN', CAP, False)
    label(d, mw - 8, 338, '3 PIRATES IN SIGHT', fg=S.EMBER[2], anchor='r', border=S.EMBER[0])
    for n, x, y in ((1, 150, 240), (2, 364, 92), (3, 276, 262), (4, 150, 70), (5, 272, 40), (6, mw + 150, 60), (7, mw + 196, 170)): callout(d, n, x, y)
    SC.finish(base, [], hud, 'map.png')
scene_eng(); scene_map()
