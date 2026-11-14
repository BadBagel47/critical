"""Design sheets for how wrecks and stations look from the outside (D-128).

Usage: python3 places.py   (writes ../img/wrecks.png and ../img/stations.png; needs Pillow and DejaVu Sans Bold)
Nothing here is in the game yet. The sheets are proposals to say yes or no to.
"""
import math, os, random
from PIL import Image, ImageDraw
import style as S
import ships2 as NEW

GAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'assets', 'sprites')
WRECK = ['#2b2a30', '#45434c', '#65626d', '#8b8792']
TEAL = ['#2e6b5f', '#3f8f80', '#58b0a0', '#a0e0d0']
RUST = ['#4a2f26', '#6e4434', '#8f5d44', '#b98562']
BLUE = ['#1c3566', '#2c5fae', '#5a9be0', '#cfe9ff']
WHITE = ['#5d6174', '#8a8ea0', '#bfc2cd', '#e3e5ec']
SCALE = 3


def game_sprite(name):
    return Image.open(os.path.join(GAME, name + '.png')).convert('RGBA')


# ---------------------------------------------------------------- wrecks
def wrecked(ship, seed, holes=5, split=None, tag=True):
    """A ship turned into a wreck: its colours fade to cold grey, the engines are dark, holes are torn in the
    hull, and with `split` (a row) the stern has broken off and drifted a little."""
    g = random.Random(seed)
    w, h = ship.size
    out = S.rgb(S.OUT)
    im = Image.new('RGBA', (w + 16, h + 18), (0, 0, 0, 0))
    src = ship.load()
    dst = im.load()
    glows = {S.rgb(c) for ramp in (S.ION, S.EMBER) for c in ramp}
    for y in range(h):
        for x in range(w):
            r, gg, b, a = src[x, y]
            if not a:
                continue
            # The stern, below the break, has drifted off to one side.
            dx, dy = (4, 6) if split and y > split + round(2 * math.sin(x * 0.35)) else (0, 0)
            if (r, gg, b) == out:
                col = out
            elif (r, gg, b) in glows:
                col = S.rgb(S.DARK[0])
            else:
                lum = (r * 3 + gg * 6 + b) / 10
                col = S.rgb(WRECK[0 if lum < 60 else 1 if lum < 105 else 2 if lum < 160 else 3])
            dst[x + 6 + dx, y + 6 + dy] = col + (255,)
    d = ImageDraw.Draw(im)
    solid = [(x, y) for y in range(im.height) for x in range(im.width) if dst[x, y][3] and dst[x, y][:3] != out]
    for _ in range(holes):
        cx, cy = g.choice(solid)
        r = g.randint(3, 6)
        pts = [(cx + r * g.uniform(0.6, 1.1) * math.cos(i * math.pi / 3.5), cy + r * g.uniform(0.6, 1.1) * math.sin(i * math.pi / 3.5)) for i in range(7)]
        d.polygon(pts, fill=(0, 0, 0, 0), outline=S.OUT)
    # Scorch marks and a few embers that still glow.
    for _ in range(holes * 3):
        x, y = g.choice(solid)
        if dst[x, y][3]:
            dst[x, y] = S.rgb(WRECK[0]) + (255,)
    for _ in range(3):
        x, y = g.choice(solid)
        if dst[x, y][3]:
            d.point((x, y), S.EMBER[2])
            d.point((x + 1, y - 1), S.EMBER[3])
    # Outline again where the holes and the break have left bare edges.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]:
                continue
            near = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(0 <= i < im.width and 0 <= j < im.height and px[i, j][3] and px[i, j][:3] != out for i, j in near):
                px[x, y] = out + (255,)
    if tag:
        # The docking port: a salvage beacon that still has power.
        x, y = min((p for p in solid if abs(p[1] - im.height // 2) < 6), key=lambda p: p[0])
        d.rectangle([x - 3, y - 4, x + 1, y + 4], fill=S.OCHRE[1], outline=S.OUT)
        d.rectangle([x - 2, y - 1, x, y + 1], fill=S.OUT)
    return im


def wreck_sheet():
    old = game_sprite('wreck')
    gunboat = wrecked(game_sprite('gunboat'), 4, holes=3)
    freighter = wrecked(NEW.freighter_a(NEW.TRADER), 11, holes=6, split=92)
    jugger = wrecked(NEW.juggernaut_e(NEW.PATROL), 23, holes=8, split=None)
    frigate = game_sprite('frigate')
    W, H = 720, 232
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.stars(d, 0, 18, W, H - 18, 5, 150)
    S.txt(d, 8, 6, 'WRECKS BY SHIP CLASS  ·  SAME SCALE AS THE SHIPS IN THE GAME', S.STEEL[3])
    items = [
        ('YOUR FRIGATE', 'FOR SIZE', frigate, S.STEEL[1]),
        ('GUNBOAT WRECK', 'SMALL, A FEW ROOMS', gunboat, S.OCHRE[2]),
        ('UNKNOWN HULL', 'IN THE GAME TODAY', old, S.STEEL[1]),
        ('FREIGHTER WRECK', 'LONG, CARGO HOLDS', freighter, S.OCHRE[2]),
        ('JUGGERNAUT WRECK', 'LATER, BIG', jugger, S.STEEL[1]),
    ]
    x = 30
    for name, note, sp, col in items:
        im.alpha_composite(sp, (x, 28 + (160 - sp.height) // 2))
        d = ImageDraw.Draw(im)
        S.txt(d, x + sp.width // 2, 196, name, col, 'c')
        S.txt(d, x + sp.width // 2, 208, note, S.STEEL[1], 'c')
        x += sp.width + 66
    im.resize((W * SCALE, H * SCALE), Image.NEAREST).save(os.path.join(S.OUT_DIR, 'wrecks.png'), optimize=True)
    return im.size


# ---------------------------------------------------------------- stations
SIZE = 192
C = SIZE // 2


# Where on a larger canvas the station has been put, for what is drawn on top of it.
OFF = [0, 0]


def at(r, deg):
    a = math.radians(deg)
    return (round(OFF[0] + C - 0.5 + math.sin(a) * r), round(OFF[1] + C - 0.5 - math.cos(a) * r))


def station(hull1, hull2, accent, glass, arms='in'):
    """The ring station of today. `arms` is 'in' for folded docking arms and 'out' for arms that reach out."""
    c = C
    tip = 2 if arms == 'out' else 14

    def disc(m, r):
        return (m, 'e', [c - r, c - r, c + r, c + r])
    parts = [
        disc(2, 78), disc(1, 75), disc(2, 70), disc(0, 64),
        disc(2, 50), disc(0, 47),
        (2, 'r', [c - 7, tip, c, 24]), (2, 'r', [c - 7, 168, c, 191 - tip]), (2, 'r', [tip, c - 7, 24, c + 6]),
        (1, 'r', [c - 10, tip, c, tip + 6]), (1, 'r', [c - 10, 185 - tip, c, 191 - tip]), (1, 'r', [tip, c - 10, tip + 6, c + 9]),
        (1, 'r', [c - 4, 30, c, 66]), (1, 'r', [c - 4, 126, c, 162]), (1, 'r', [30, c - 4, 66, c + 3]),
        (2, 'p', [(48, 52), (52, 48), (78, 74), (74, 78)]), (2, 'p', [(48, 139), (52, 143), (78, 117), (74, 113)]),
        disc(2, 34), disc(1, 30), disc(2, 22), disc(4, 14),
        (2, 'e', [31, 31, 53, 53]), (1, 'e', [34, 34, 50, 50]), (5, 'e', [38, 38, 46, 46]),
        (2, 'e', [31, 138, 53, 160]), (1, 'e', [34, 141, 50, 157]), (5, 'e', [38, 145, 46, 153]),
    ]
    if arms == 'out':
        parts += [(5, 'r', [c - 4, 11, c, 21]), (5, 'r', [c - 4, 170, c, 180]), (5, 'r', [11, c - 4, 21, c + 3])]

    def det(px, ln):
        for deg in range(195, 360, 15):
            if deg % 45 == 0:
                continue
            ln(at(71, deg), at(74, deg), hull1[0])
        px([at(77, deg) for deg in range(190, 360, 20)], hull2[3])
        px([at(26, deg) for deg in range(200, 360, 40)], accent[2])
        px([at(67, deg) for deg in (210, 240, 300, 330)], accent[1])
        ln((c - 2, 34), (c - 2, 62), hull1[0]); ln((c - 2, 130), (c - 2, 158), hull1[0]); ln((34, c - 1), (62, c - 1), hull1[0])
    return S.sprite(SIZE, SIZE, parts, {1: hull1, 2: hull2, 3: accent, 4: glass, 5: S.DARK, 'glassy': (4,), 'glow': (3,)}, det)


def arm_lights(im, colour, arms='in', lit=True):
    """The lights at the tips of the docking arms say how the station treats the crew."""
    d = ImageDraw.Draw(im)
    tip = 2 if arms == 'out' else 14
    col = colour if lit else S.DARK
    for x0, y0, x1, y1 in ([C - 6, tip, C + 5, tip + 1], [C - 6, 190 - tip, C + 5, 191 - tip], [tip, C - 6, tip + 1, C + 5], [190 - tip, C - 6, 191 - tip, C + 5]):
        x0, x1, y0, y1 = x0 + OFF[0], x1 + OFF[0], y0 + OFF[1], y1 + OFF[1]
        d.rectangle([x0, y0, x1, y1], fill=col[2])
        d.point([(x0, y0), (x1, y1)], col[3])
    return im


def box(d, x, y, w, h, ramp):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=ramp[1], outline=S.OUT)
    d.line([(x + 1, y + 1), (x + w - 2, y + 1)], fill=ramp[2])
    d.line([(x + 1, y + h - 2), (x + w - 2, y + h - 2)], fill=ramp[0])


def charter(im):
    """A trade league: containers clamped to the ring, a big dish, and many lit windows."""
    d = ImageDraw.Draw(im)
    for deg, ramps in ((20, (RUST, S.STEEL2)), (64, (TEAL, RUST)), (112, (S.STEEL2, TEAL, RUST)), (200, (RUST, TEAL)), (292, (S.STEEL2, RUST))):
        for k, ramp in enumerate(ramps):
            x, y = at(84, deg + k * 9)
            box(d, x - 5, y - 4, 10, 8, ramp)
    x, y = at(60, 150)
    d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=S.STEEL[1], outline=S.OUT)
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=S.STEEL[2])
    d.line([(x, y), (x + 5, y - 5)], fill=S.OUT)
    d.point((x + 5, y - 5), S.OCHRE[3])
    for deg in range(0, 360, 12):
        d.point(at(72.5, deg + 4), S.OCHRE[3])
    return im


def wardens(im):
    """Keepers of order: armour plates on the ring, two more gun pads, a radar mast and warning stripes."""
    d = ImageDraw.Draw(im)
    for deg in (22, 68, 112, 158, 202, 248, 292, 338):
        pts = [at(80, deg - 9), at(80, deg + 9), at(69, deg + 8), at(69, deg - 8)]
        d.polygon(pts, fill=S.STEEL2[1], outline=S.OUT)
        d.line([at(77, deg - 6), at(77, deg + 6)], fill=S.STEEL2[2])
    for deg in (45, 225):
        x, y = at(57, deg)
        d.ellipse([x - 11, y - 11, x + 11, y + 11], fill=S.STEEL2[1], outline=S.OUT)
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=S.STEEL[1])
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=S.DARK[0])
    for deg in (0, 90, 180, 270):
        for k in range(-2, 3):
            d.point(at(27, deg + k * 6), BLUE[2] if k % 2 == 0 else S.OUT)
    x, y = at(40, 100)
    d.rectangle([x - 1, y - 12, x + 1, y + 2], fill=S.STEEL2[2], outline=S.OUT)
    d.rectangle([x - 6, y - 14, x + 6, y - 12], fill=BLUE[2], outline=S.OUT)
    return im


def drifters(im):
    """Salvagers: patches in other colours, solar wings, a scrap boom, nothing quite even."""
    d = ImageDraw.Draw(im)
    g = random.Random(7)
    for deg in (12, 50, 95, 140, 215, 262, 310, 344):
        ramp = g.choice((S.STEEL2, TEAL, S.BONE, S.STEEL))
        pts = [at(76, deg - g.randint(4, 7)), at(76, deg + g.randint(4, 7)), at(69, deg + 5), at(69, deg - 5)]
        d.polygon(pts, fill=ramp[1], outline=S.OUT)
    for deg, long in ((35, 26), (150, 20), (245, 30)):
        a = math.radians(deg)
        x0, y0 = at(79, deg)
        x1, y1 = at(79 + long, deg)
        nx, ny = math.cos(a), math.sin(a)
        pts = [(x0 - nx * 5, y0 - ny * 5), (x0 + nx * 5, y0 + ny * 5), (x1 + nx * 5, y1 + ny * 5), (x1 - nx * 5, y1 - ny * 5)]
        d.polygon(pts, fill=S.GLASS[0], outline=S.OUT)
        for k in range(1, 4):
            t = k / 4
            d.line([(x0 + (x1 - x0) * t - nx * 4, y0 + (y1 - y0) * t - ny * 4), (x0 + (x1 - x0) * t + nx * 4, y0 + (y1 - y0) * t + ny * 4)], fill=S.GLASS[1])
    x0, y0 = at(78, 300)
    x1, y1 = at(104, 312)
    d.line([(x0, y0), (x1, y1)], fill=S.OUT, width=3)
    d.line([(x0, y0), (x1, y1)], fill=RUST[2])
    box(d, x1 - 5, y1 - 4, 9, 8, S.BONE)
    return im


def pirates(im):
    """A stronghold: spikes around the ring, heavy plating and red lights."""
    d = ImageDraw.Draw(im)
    for deg in range(0, 360, 30):
        if deg % 90 == 0:
            continue
        pts = [at(77, deg - 4), at(90, deg), at(77, deg + 4)]
        d.polygon(pts, fill=S.BONE[1], outline=S.OUT)
        d.point(at(84, deg), S.BONE[3])
    for deg in range(15, 360, 30):
        d.point(at(72.5, deg), S.EMBER[2])
    return im


def crew(im):
    """Your own: the plain ring with a broad band in your colour across the hub and the arms."""
    d = ImageDraw.Draw(im)
    for deg in range(0, 360, 10):
        d.point(at(72.5, deg), TEAL[3])
    d.ellipse([OFF[0] + C - 19, OFF[1] + C - 19, OFF[0] + C + 18, OFF[1] + C + 18], outline=TEAL[2])
    return im


SIDES = [
    ('YOURS', 'PLAIN, WITH YOUR COLOUR', (S.STEEL, S.STEEL2, TEAL, S.GLASS), crew, S.ACID),
    ('NO FACTION', 'THE STATION OF TODAY', (S.STEEL, S.STEEL2, WHITE, S.GLASS), None, WHITE),
    ('THE CHARTER', 'CONTAINERS, A DISH, LIT WINDOWS', (S.STEEL, S.STEEL2, S.OCHRE, S.GLASS), charter, WHITE),
    ('THE WARDENS', 'ARMOUR, MORE GUNS, RADAR', (S.STEEL, S.STEEL2, BLUE, S.ION), wardens, WHITE),
    ('THE DRIFTERS', 'PATCHES, SOLAR WINGS, SCRAP', (RUST, S.DARK, S.BONE, S.GLASS), drifters, S.OCHRE),
    ('PIRATES', 'SPIKES AND RED LIGHTS', (S.PLUM, S.PLUM2, S.EMBER, S.ACID), pirates, S.EMBER),
]


def station_sheet():
    pad = 34
    cell = SIZE + pad * 2
    W, H = cell * 3 + 16, 20 + (cell + 26) * 2 + 226
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.stars(d, 0, 18, W, H - 18, 9, 260)
    S.txt(d, 8, 6, 'STATIONS BY SIDE  ·  THE SAME RING, WITH ITS OWN COLOUR, MARKS AND ADD-ONS', S.STEEL[3])
    for i, (name, note, colours, addon, light) in enumerate(SIDES):
        x = 8 + (i % 3) * cell
        y = 22 + (i // 3) * (cell + 26)
        # Add-ons are drawn on a larger canvas than the station, so that they can reach outside the ring.
        layer = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
        layer.alpha_composite(station(*colours), (pad, pad))
        OFF[:] = [pad, pad]
        if addon:
            addon(layer)
        arm_lights(layer, light)
        OFF[:] = [0, 0]
        im.alpha_composite(layer, (x, y))
        d = ImageDraw.Draw(im)
        S.txt(d, x + cell // 2, y + cell - 8, name, S.OCHRE[2] if addon else S.STEEL[2], 'c')
        S.txt(d, x + cell // 2, y + cell + 4, note, S.STEEL[1], 'c')

    # The docking arms: folded, reaching out for a ship, and what their lights say.
    y0 = 22 + (cell + 26) * 2 + 10
    S.txt(d, 8, y0, 'DOCKING ARMS  ·  FOLDED UNTIL A SHIP COMES IN TO DOCK', S.STEEL[3])
    frigate = game_sprite('frigate')
    colours = (S.STEEL, S.STEEL2, WHITE, S.GLASS)
    x = 16
    for label, arms, ship in (('FOLDED', 'in', False), ('REACHING OUT', 'out', False), ('DOCKED', 'out', True)):
        sp = arm_lights(station(*colours, arms=arms), S.ACID if ship else WHITE, arms)
        tile = Image.new('RGBA', (112, 176), (0, 0, 0, 0))
        tile.alpha_composite(sp.crop((C - 56, 110, C + 56, SIZE)), (0, 0))
        if ship:
            tile.alpha_composite(frigate.crop((0, 0, frigate.width, 92)), (56 - frigate.width // 2, 76))
        im.alpha_composite(tile, (x, y0 + 12))
        d = ImageDraw.Draw(im)
        S.txt(d, x + 56, y0 + 196, label, S.STEEL[2], 'c')
        x += 124
    x += 6
    S.txt(d, x, y0, 'THE LIGHTS ON THE ARMS SAY HOW THE STATION TREATS YOU', S.STEEL[3])
    lights = (('FRIENDLY', S.ACID, True), ('NEUTRAL', WHITE, True), ('WARY', S.OCHRE, True), ('CLOSED', S.DARK, False), ('HOSTILE', S.EMBER, True))
    for label, ramp, lit in lights:
        sp = arm_lights(station(*colours), ramp, 'in', lit)
        big = sp.crop((C - 18, SIZE - 34, C + 18, SIZE - 8)).resize((72, 52), Image.NEAREST)
        im.alpha_composite(big, (x, y0 + 60))
        d = ImageDraw.Draw(im)
        S.txt(d, x + 36, y0 + 120, label, ramp[2] if lit else S.STEEL[1], 'c')
        x += 80
    im.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(S.OUT_DIR, 'stations.png'), optimize=True)
    return im.size


if __name__ == '__main__':
    print('wrote wrecks.png', wreck_sheet())
    print('wrote stations.png', station_sheet())
