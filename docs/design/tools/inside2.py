"""Design sheets for F-152 and F-151: rooms that show what they are for, with cover, doors and signs, and the
figures inside moving in steps instead of one still picture that turns.

Usage: python3 inside2.py   (writes ../img/rooms-by-use.png, ../img/figures.png and ../img/figures.gif)
Nothing here is in the game yet. It is a proposal to say yes or no to.
"""
import os
from PIL import Image, ImageDraw
import style as S

T = 16
COLS, ROWS = 11, 7
FLOOR = ('#1d1f2b', '#20222f', '#15161f')
WALL = S.STEEL2
LIGHT = S.OCHRE
COVER = S.ACID[2]


def bare_room(im, ox, oy, light=LIGHT, floor=FLOOR):
    """Floor, walls with strip lights, and a door gap in the left wall. Returns the draw handle."""
    d = ImageDraw.Draw(im)
    a, b, line = floor
    for r in range(ROWS):
        for c in range(COLS):
            x, y = ox + c * T, oy + r * T
            d.rectangle([x, y, x + T - 1, y + T - 1], fill=(a, b)[(r + c) % 2])
            d.line([(x, y + T - 1), (x + T - 1, y + T - 1)], fill=line)
            d.line([(x + T - 1, y), (x + T - 1, y + T - 1)], fill=line)

    def top(c, r, cw=1, rh=1):
        x, y = ox + c * T, oy + r * T
        d.rectangle([x, y, x + cw * T - 1, y + rh * T - 1], fill=WALL[1], outline=S.OUT)
        d.line([(x + 1, y + 1), (x + cw * T - 2, y + 1)], fill=WALL[2])

    top(0, 0, COLS, 1)
    x, y = ox + T, oy + T
    d.rectangle([x, y, x + (COLS - 2) * T - 1, y + 9], fill=WALL[0], outline=S.OUT)
    for k in range(COLS - 2):
        d.rectangle([x + k * T + 3, y + 3, x + k * T + 12, y + 6], fill=light[1])
        d.line([(x + k * T + 4, y + 4), (x + k * T + 11, y + 4)], fill=light[3])
    top(0, 1, 1, 2)
    top(0, 5, 1, ROWS - 5)
    top(COLS - 1, 1, 1, ROWS - 1)
    top(1, ROWS - 1, COLS - 2, 1)
    return d


def door(d, ox, oy, state, sign=None, col=S.STEEL[2]):
    """The door in the left wall: open, closed, locked or alarmed, with a sign above it."""
    x, y = ox, oy + 3 * T
    if state == 'open':
        d.rectangle([x, y, x + T - 1, y + 2], fill=S.DARK[2], outline=S.OUT)
        d.rectangle([x, y + 2 * T - 3, x + T - 1, y + 2 * T - 1], fill=S.DARK[2], outline=S.OUT)
    else:
        d.rectangle([x, y, x + T - 1, y + 2 * T - 1], fill=S.DARK[1], outline=S.OUT)
        d.line([(x + 8, y + 2), (x + 8, y + 2 * T - 3)], fill=S.OUT)
        lamp = {'closed': S.ACID[2], 'locked': S.EMBER[2], 'alarmed': S.OCHRE[2]}[state]
        d.rectangle([x + 11, y + 13, x + 13, y + 18], fill=lamp)
        if state == 'alarmed':
            for k in range(0, 2 * T - 4, 4):
                d.line([(x + 1, y + 2 + k), (x + 3, y + 4 + k)], fill=S.OCHRE[2])
    if sign:
        w = S.tw(sign) + 6
        d.rectangle([x + T + 2, y - 13, x + T + 2 + w, y - 4], fill=S.DARK[0], outline=col)
        S.txt(d, x + T + 5, y - 11, sign, col)


def block(d, x, y, w, h, ramp, cover=True):
    """Something solid on the floor. Cover gets a faint green outline in this sheet, to show it can be hidden behind."""
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=ramp[1], outline=S.OUT)
    d.line([(x + 1, y + 1), (x + w - 2, y + 1)], fill=ramp[3])
    if cover:
        d.rectangle([x - 1, y - 1, x + w, y + h], outline=COVER)


def bridge(im, ox, oy):
    d = bare_room(im, ox, oy, S.ION)
    for c in range(3, 9):
        x = ox + c * T + 1
        block(d, x, oy + 2 * T, T - 2, 10, S.STEEL2, cover=False)
        d.rectangle([x + 2, oy + 2 * T + 2, x + T - 5, oy + 2 * T + 6], fill=S.ION[(c % 2) + 1])
    # The captain's chair and the map table.
    d.ellipse([ox + 5 * T + 4, oy + 4 * T + 4, ox + 5 * T + 12, oy + 4 * T + 12], fill=S.STEEL[1], outline=S.OUT)
    block(d, ox + 7 * T, oy + 4 * T, 2 * T, T, S.STEEL2)
    d.rectangle([ox + 7 * T + 3, oy + 4 * T + 3, ox + 9 * T - 4, oy + 5 * T - 4], fill=S.GLASS[0])
    d.point([(ox + 7 * T + 8, oy + 4 * T + 7), (ox + 8 * T + 4, oy + 4 * T + 9)], S.ION[3])
    d = ImageDraw.Draw(im)
    door(d, ox, oy, 'closed', 'BRIDGE', S.ION[2])
    return S.glow(im, ox + 6 * T, oy + 2 * T + 4, 30, S.ION[2], 24)


def engine(im, ox, oy):
    d = bare_room(im, ox, oy, S.EMBER)
    cx, cy = ox + 7 * T, oy + 4 * T
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=S.DARK[1], outline=S.OUT)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=S.EMBER[1])
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=S.EMBER[3])
    for x in (ox + 3 * T + 4, ox + 4 * T + 6):
        d.rectangle([x, oy + 2 * T, x + 5, oy + 6 * T - 2], fill=S.STEEL2[1], outline=S.OUT)
    block(d, ox + 9 * T - 2, oy + 2 * T + 4, 10, 2 * T, S.STEEL2)
    block(d, ox + 4 * T + 8, oy + 5 * T, 2 * T, 10, S.STEEL2)
    d = ImageDraw.Draw(im)
    door(d, ox, oy, 'closed', 'ENGINES', S.EMBER[2])
    return S.glow(im, cx, cy, 30, S.EMBER[2], 40)


def cargo(im, ox, oy):
    d = bare_room(im, ox, oy)
    for k in range(0, 8 * T, 6):
        d.line([(ox + 2 * T + k, oy + 6 * T - 3), (ox + 2 * T + k + 3, oy + 6 * T - 6)], fill=S.OCHRE[1])
    for c, r in ((3, 2), (4, 2), (3, 3), (7, 2), (8, 2), (8, 3), (6, 4), (6, 5)):
        im.alpha_composite(S.CR, (ox + c * T, oy + r * T))
    d = ImageDraw.Draw(im)
    for c, r, w, h in ((3, 2, 2, 2), (7, 2, 2, 2), (6, 4, 1, 2)):
        d.rectangle([ox + c * T, oy + r * T, ox + (c + w) * T - 1, oy + (r + h) * T - 1], outline=COVER)
    d = ImageDraw.Draw(im)
    door(d, ox, oy, 'open', 'CARGO', S.OCHRE[2])
    return im


def quarters(im, ox, oy):
    d = bare_room(im, ox, oy, S.GLASS)
    for c in (3, 5, 7):
        block(d, ox + c * T, oy + 2 * T, T + 6, 10, S.STEEL, cover=False)
        d.rectangle([ox + c * T + 2, oy + 2 * T + 2, ox + c * T + 7, oy + 2 * T + 7], fill=S.BONE[2])
    for c in range(3, 9):
        block(d, ox + c * T + 2, oy + 5 * T, 12, 10, S.STEEL2)
    d = ImageDraw.Draw(im)
    door(d, ox, oy, 'locked', 'CREW', S.GLASS[2])
    return im


def mess(im, ox, oy):
    d = bare_room(im, ox, oy, S.ACID)
    for c in (3, 7):
        block(d, ox + c * T, oy + 3 * T + 4, 2 * T, 12, S.BONE)
        for k in range(2):
            d.rectangle([ox + c * T + 2 + k * 18, oy + 3 * T - 2, ox + c * T + 10 + k * 18, oy + 3 * T + 1], fill=S.STEEL2[2])
            d.rectangle([ox + c * T + 2 + k * 18, oy + 4 * T + 6, ox + c * T + 10 + k * 18, oy + 4 * T + 9], fill=S.STEEL2[2])
    block(d, ox + 2 * T, oy + 2 * T, 7 * T, 8, S.STEEL, cover=False)
    d = ImageDraw.Draw(im)
    door(d, ox, oy, 'alarmed', 'MESS', S.ACID[2])
    return im


ROOMS = (('BRIDGE  ·  CONSOLES, CHAIR, MAP TABLE', bridge), ('ENGINES  ·  REACTOR, PIPES', engine),
         ('CARGO  ·  CRATES TO HIDE BEHIND', cargo), ('CREW  ·  BUNKS AND LOCKERS', quarters),
         ('MESS  ·  TABLES AND A COUNTER', mess))


def rooms_sheet():
    gap = 14
    cw, ch = COLS * T + gap, ROWS * T + 26
    W, H = 8 + cw * 3, 20 + ch * 2 + 70
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.txt(d, 8, 6, 'ROOMS BY USE  ·  GREEN OUTLINE = COVER, SHOWN HERE ONLY', S.STEEL[3])
    for i, (name, draw) in enumerate(ROOMS):
        x, y = 8 + (i % 3) * cw, 20 + (i // 3) * ch
        im = draw(im, x, y)
        d = ImageDraw.Draw(im)
        S.txt(d, x + COLS * T // 2, y + ROWS * T + 5, name, S.STEEL[2], 'c')
    # The doors and their lamps, in the last place.
    x, y = 8 + 2 * cw, 20 + ch
    S.txt(d, x, y, 'DOORS  ·  THE LAMP SAYS WHAT IT IS', S.STEEL[3])
    for k, (state, what) in enumerate((('open', 'OPEN'), ('closed', 'CLOSED  ·  OPENS WHEN YOU WALK UP'),
                                         ('locked', 'LOCKED  ·  CUT OR HACK'), ('alarmed', 'ALARMED'))):
        yy = y + 14 + k * 26
        d.rectangle([x, yy, x + T - 1, yy + 2 * T - 1], fill=FLOOR[0])
        door(d, x, yy - 3 * T, state)
        S.txt(d, x + T + 6, yy + 12, what, S.STEEL[2])
    yy = 20 + 2 * ch + 8
    S.txt(d, 8, yy, 'SIGNS BY THE DOORS NAME THE ROOM, ALSO ON THE CAPTAIN\'S RADAR. EVERY ROOM HAS SOMETHING TO HIDE', S.STEEL[2])
    S.txt(d, 8, yy + 10, 'BEHIND, AND GUARDS USE THE SAME COVER. A STATION\'S STAFF DOORS SAY STAFF. EACH SIDE KEEPS ITS COLOURS.', S.STEEL[2])
    im.convert('RGB').resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(S.OUT_DIR, 'rooms-by-use.png'), optimize=True)


# ---------------------------------------------------------------- figures
def body(suit, stripe, visor, gun=True):
    return S.person(suit, stripe, visor, gun)


def feet(im, step, col=S.DARK[3]):
    """Feet that show at the front and the back of the body as it walks: the left one forward, both under it,
    the right one forward, both under it."""
    d = ImageDraw.Draw(im)
    if step % 2:
        return
    front, back = (4, 9) if step == 0 else (9, 4)
    d.rectangle([front, 0, front + 2, 2], fill=S.STEEL[3])
    d.rectangle([back, 13, back + 2, 15], fill=S.STEEL[2])


def frame(kind, t, suit=S.STEEL, stripe=S.OCHRE, visor=S.GLASS):
    """One frame, 24 x 24, of a figure doing `kind`, `t` from 0 to 3."""
    out = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    if kind == 'down':
        b = body(suit, stripe, visor, gun=False).rotate(90, expand=True, resample=Image.NEAREST)
        b = b.resize((16, 12), Image.NEAREST)
        out.alpha_composite(b, (4, 8))
        d = ImageDraw.Draw(out)
        d.rectangle([17, 14, 21, 15], fill=S.DARK[2])
        return out
    base = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    base.alpha_composite(body(suit, stripe, visor, gun=kind != 'carry'))
    if kind == 'walk':
        feet(base, t)
    d = ImageDraw.Draw(base)
    if kind == 'carry':
        im = S.CR.resize((8, 8), Image.NEAREST)
        base.alpha_composite(im, (4, 0))
    if kind == 'aim' and t % 2 == 1:
        d.rectangle([11, 0, 14, 1], fill=S.OCHRE[3])
    if kind == 'hit' and t < 2:
        mask = base.split()[3]
        white = Image.new('RGBA', (16, 16), (240, 240, 255, 255))
        base = Image.composite(white, base, mask)
    shift = (0, 1, 2, 1)[t] if kind == 'aim' else (2, 1, 0, 0)[t] if kind == 'hit' else 0
    out.alpha_composite(base, (4, 4 + shift))
    if kind == 'teleport':
        d = ImageDraw.Draw(out)
        keep = [1, 0.7, 0.4, 0.1][t]
        px = out.load()
        for y in range(24):
            for x in range(24):
                r, g, b, a = px[x, y]
                if a and (y * 7 + x * 3) % 10 >= keep * 10:
                    px[x, y] = (155, 228, 238, 255) if (x + y + t) % 3 == 0 else (0, 0, 0, 0)
        d.rectangle([11, 0, 12, 23], fill=(155, 228, 238, 90 + 40 * t))
    return out


def drone(t):
    out = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    for i, (x, y) in enumerate(((6, 6), (16, 6), (6, 16), (16, 16))):
        d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=S.STEEL[2 if (i + t) % 2 else 1])
    d.rectangle([9, 9, 14, 14], fill=S.STEEL[1], outline=S.OUT)
    d.rectangle([11, 8, 12, 9], fill=S.EMBER[2])
    return out


KINDS = (('WATCHMAN', (S.PLUM, S.OCHRE, S.ACID)), ('SOLDIER', (S.PLUM, S.BONE, S.ACID)),
         ('TECHNICIAN', (S.PLUM, S.ION, S.ION)), ('HEAVY', (S.PLUM2, S.STEEL2, S.EMBER)))
ACTS = (('WALK', 'walk'), ('AIM AND FIRE', 'aim'), ('CARRY LOOT', 'carry'), ('HIT', 'hit'), ('TELEPORT HOME', 'teleport'))


def figures():
    Z = 3
    cell = 24
    W = 8 + 112 + 4 * (cell * Z + 8)
    H = 24 + (len(ACTS) + 1) * (cell * Z + 12) + 80
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.txt(d, 8, 6, 'THE BOARDER IN STEPS  ·  FOUR FRAMES EACH, SHOWN 3 TIMES BIGGER', S.STEEL[3])
    rows = list(ACTS) + [('DOWN', 'down')]
    for r, (name, kind) in enumerate(rows):
        y = 24 + r * (cell * Z + 12)
        S.txt(d, 8, y + cell * Z // 2 - 3, name, S.STEEL[2])
        for t in range(4 if kind != 'down' else 1):
            f = frame(kind, t).resize((cell * Z, cell * Z), Image.NEAREST)
            x = 8 + 112 + t * (cell * Z + 8)
            d.rectangle([x - 1, y - 1, x + cell * Z, y + cell * Z], outline=S.DARK[1])
            im.alpha_composite(f, (x, y))
    d = ImageDraw.Draw(im)
    y = 24 + len(rows) * (cell * Z + 12)
    S.txt(d, 8, y, 'GUARDS BY KIND  ·  THE SAME STEPS, IN THEIR OWN COLOURS. HEAVY IS BIGGER, A DRONE FLIES', S.STEEL[3])
    x = 8
    for name, colours in KINDS:
        f = frame('walk', 1, *colours)
        if name == 'HEAVY':
            f = f.resize((30, 30), Image.NEAREST)
        f = f.resize((f.width * Z, f.height * Z), Image.NEAREST)
        im.alpha_composite(f, (x, y + 12))
        d = ImageDraw.Draw(im)
        S.txt(d, x + f.width // 2, y + 12 + f.height + 2, name, S.STEEL[2], 'c')
        x += f.width + 12
    f = drone(0).resize((cell * Z, cell * Z), Image.NEAREST)
    im.alpha_composite(f, (x, y + 12))
    d = ImageDraw.Draw(im)
    S.txt(d, x + f.width // 2, y + 12 + f.height + 2, 'DRONE', S.STEEL[2], 'c')
    im.convert('RGB').save(os.path.join(S.OUT_DIR, 'figures.png'), optimize=True)


def figures_gif():
    """The steps moving, the way they would in the game: walking, firing, carrying, hit, and a guard and a drone."""
    Z = 4
    acts = [('walk', None), ('aim', None), ('carry', None), ('hit', None), ('teleport', None)]
    W = 8 + (len(acts) + 2) * (24 * Z + 8)
    H = 24 * Z + 30
    out = []
    for t in range(8):
        im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
        d = ImageDraw.Draw(im)
        for i, (kind, _) in enumerate(acts):
            f = frame(kind, t % 4).resize((24 * Z, 24 * Z), Image.NEAREST)
            im.alpha_composite(f, (8 + i * (24 * Z + 8), 8))
            S.txt(d, 8 + i * (24 * Z + 8) + 12 * Z, 24 * Z + 14, kind.upper(), S.STEEL[2], 'c')
        g = frame('walk', t % 4, S.PLUM, S.BONE, S.ACID).resize((24 * Z, 24 * Z), Image.NEAREST)
        x = 8 + len(acts) * (24 * Z + 8)
        im.alpha_composite(g, (x, 8))
        S.txt(d, x + 12 * Z, 24 * Z + 14, 'GUARD', S.STEEL[2], 'c')
        x += 24 * Z + 8
        im.alpha_composite(drone(t % 2).resize((24 * Z, 24 * Z), Image.NEAREST), (x, 8))
        S.txt(d, x + 12 * Z, 24 * Z + 14, 'DRONE', S.STEEL[2], 'c')
        out.append(im.convert('RGB'))
    out[0].save(os.path.join(S.OUT_DIR, 'figures.gif'), save_all=True, append_images=out[1:], duration=160, loop=0)


if __name__ == '__main__':
    rooms_sheet()
    figures()
    figures_gif()
