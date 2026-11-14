"""Design sheets for the insides of wrecks and stations (D-128): how each side's rooms look, how a place looks in
lockdown and with the alarm on, and floor plans that are generated to follow the shape of what was boarded.

Usage: python3 interiors.py   (writes ../img/interior-styles.png and ../img/floor-plans.png)
Nothing here is in the game yet. The generator is a sketch to show that the idea holds: every plan it makes is
checked so that the way from each airlock to the vault or the mainframe is open.
"""
import math, os, random
from collections import deque
from PIL import Image, ImageChops, ImageDraw
import style as S

TEAL = ['#2e6b5f', '#3f8f80', '#58b0a0', '#a0e0d0']
RUST = ['#4a2f26', '#6e4434', '#8f5d44', '#b98562']
BLUE = ['#1c3566', '#2c5fae', '#5a9be0', '#cfe9ff']
WRECK = ['#2b2a30', '#45434c', '#65626d', '#8b8792']
T = 16

# ---------------------------------------------------------------- how each side's rooms look
#   floor   two tones for the tiles, and the line between them
#   wall    the top of a wall and its face
#   light   the strip lights, which carry the side's colour
#   suit    what its guards wear: suit, stripe, visor
STYLES = {
    'TODAY  ·  PLAIN': dict(floor=('#191a25', '#1c1d29', '#13131c'), wall=S.STEEL2, light=S.OCHRE, suit=(S.PLUM, S.BONE, S.ACID), look='plain'),
    'WRECK': dict(floor=('#131318', '#16161c', '#0d0d12'), wall=WRECK, light=S.EMBER, suit=(S.PLUM, S.BONE, S.ACID), look='wreck'),
    'THE CHARTER': dict(floor=('#23242f', '#272833', '#1a1b24'), wall=S.STEEL, light=S.OCHRE, suit=(S.STEEL, S.OCHRE, S.GLASS), look='charter'),
    'THE WARDENS': dict(floor=('#161b28', '#19202e', '#10141e'), wall=S.STEEL2, light=BLUE, suit=(S.STEEL2, BLUE, S.ION), look='wardens'),
    'THE DRIFTERS': dict(floor=('#1f1a18', '#231d1a', '#161211'), wall=RUST, light=TEAL, suit=(RUST, S.BONE, S.GLASS), look='drifters'),
    'PIRATES': dict(floor=('#1b1620', '#1f1925', '#130f17'), wall=S.PLUM2, light=S.EMBER, suit=(S.PLUM, S.BONE, S.ACID), look='pirates'),
}
COLS, ROWS = 11, 7


def room(im, ox, oy, st, seed=1):
    """One room in a side's style: floor, walls with strip lights, a door, cover to hide behind, loot and a guard."""
    g = random.Random(seed)
    d = ImageDraw.Draw(im)
    a, b, line = st['floor']
    wall = st['wall']
    light = st['light']
    look = st['look']
    for r in range(ROWS):
        for c in range(COLS):
            x, y = ox + c * T, oy + r * T
            d.rectangle([x, y, x + T - 1, y + T - 1], fill=(a, b)[(r + c) % 2])
            d.line([(x, y + T - 1), (x + T - 1, y + T - 1)], fill=line)
            d.line([(x + T - 1, y), (x + T - 1, y + T - 1)], fill=line)
            if look in ('plain', 'wardens', 'charter'):
                d.point([(x + 2, y + 2), (x + T - 4, y + 2)], '#2c2d3b')
            if look == 'pirates':
                for k in range(3, T - 2, 4):
                    d.line([(x + 3, y + k), (x + T - 4, y + k)], fill=line)
            if look == 'drifters' and g.random() < 0.3:
                d.rectangle([x + 2, y + 2, x + T - 3, y + T - 3], fill=g.choice(('#2a211d', '#1a2422', '#24242c')))
                d.point([(x + 3, y + 3), (x + T - 4, y + T - 4)], S.BONE[0])
            if look == 'wreck' and g.random() < 0.16 and 1 < c < COLS - 2 and 1 < r < ROWS - 1:
                # A floor plate is gone, and space shows through.
                d.rectangle([x + 1, y + 1, x + T - 2, y + T - 2], fill='#05050a')
                d.point((x + 5, y + 6), '#55587a')
                d.line([(x + 1, y + 1), (x + 5, y + 4)], fill=WRECK[1])

    def wall_top(c, r, cw=1, rh=1):
        x, y = ox + c * T, oy + r * T
        d.rectangle([x, y, x + cw * T - 1, y + rh * T - 1], fill=wall[1], outline=S.OUT)
        d.line([(x + 1, y + 1), (x + cw * T - 2, y + 1)], fill=wall[2])

    def wall_face(c, r, cw=1):
        x, y = ox + c * T, oy + r * T
        d.rectangle([x, y, x + cw * T - 1, y + 9], fill=wall[0], outline=S.OUT)
        for k in range(cw):
            dead = look == 'wreck' and g.random() < 0.6
            d.rectangle([x + k * T + 3, y + 3, x + k * T + 12, y + 6], fill=S.DARK[0] if dead else light[1])
            if not dead:
                d.line([(x + k * T + 4, y + 4), (x + k * T + 11, y + 4)], fill=light[3])
    wall_top(0, 0, COLS, 1); wall_face(1, 1, COLS - 2)
    wall_top(0, 1, 1, ROWS - 1); wall_top(COLS - 1, 1, 1, ROWS - 1); wall_top(1, ROWS - 1, COLS - 2, 1)
    # A stub of wall to take cover behind.
    wall_top(6, 1, 1, 2); wall_face(6, 3, 1)
    # The door, in the left wall.
    dx, dy = ox, oy + 3 * T
    d.rectangle([dx, dy, dx + T - 1, dy + 2 * T - 1], fill=S.DARK[1], outline=S.OUT)
    d.rectangle([dx + 12, dy + 2, dx + 13, dy + 2 * T - 3], fill=light[2])
    d.rectangle([dx + 4, dy + 6, dx + 8, dy + 2 * T - 7], fill=S.DARK[0])

    # What stands on the floor, and what marks the side.
    def low(c, r, w=1, ramp=wall, stripe=None):
        x, y = ox + c * T + 1, oy + r * T + 4
        d.rectangle([x, y, x + w * T - 3, y + 9], fill=ramp[1], outline=S.OUT)
        d.line([(x + 1, y + 1), (x + w * T - 4, y + 1)], fill=ramp[3])
        if stripe:
            for k in range(2, w * T - 5, 4):
                d.line([(x + k, y + 8), (x + k + 3, y + 4)], fill=stripe)
    if look == 'charter':
        for c in (2, 3): im.alpha_composite(S.CR, (ox + c * T, oy + 4 * T + 8))
        im.alpha_composite(S.CR, (ox + 2 * T + 8, oy + 4 * T - 1))
        d = ImageDraw.Draw(im)
        d.rectangle([ox + 7 * T + 2, oy + 2 * T, ox + 9 * T + 12, oy + 2 * T + 2], fill=S.OCHRE[1])   # a runner of carpet
        low(8, 4, 2, S.STEEL)
    elif look == 'wardens':
        low(2, 4, 2, S.STEEL2, BLUE[2]); low(8, 3, 2, S.STEEL2, BLUE[2])
        for k in range(0, 4 * T, 6):
            d.line([(ox + T + 2 + k, oy + 6 * T - 3), (ox + T + 5 + k, oy + 6 * T - 6)], fill=S.OCHRE[2])
    elif look == 'drifters':
        low(2, 4, 1, RUST); low(8, 4, 2, S.BONE)
        d.line([(ox + T + 4, oy + 2 * T), (ox + 4 * T, oy + 2 * T + 9), (ox + 5 * T + 8, oy + 5 * T)], fill='#0d0d12')   # a cable across the floor
        im.alpha_composite(S.CE, (ox + 9 * T, oy + 2 * T + 2))
    elif look == 'pirates':
        low(2, 4, 2, S.PLUM); low(8, 4, 1, S.PLUM)
        for c in (3, 8):
            x, y = ox + c * T + 4, oy + T + 12
            d.polygon([(x, y), (x + 8, y), (x + 4, y + 7)], fill=S.BONE[2], outline=S.OUT)
        im.alpha_composite(S.CR, (ox + 9 * T, oy + 2 * T + 2))
    elif look == 'wreck':
        for _ in range(9):
            x, y = ox + g.randint(T + 4, (COLS - 1) * T - 8), oy + g.randint(2 * T, (ROWS - 1) * T - 6)
            d.rectangle([x, y, x + g.randint(1, 4), y + g.randint(1, 2)], fill=g.choice(WRECK))
        low(8, 4, 2, WRECK)
        x, y = ox + 4 * T + 6, oy + T + 9
        d.point([(x, y), (x + 2, y + 2), (x - 1, y + 4), (x + 3, y + 5)], S.OCHRE[3])   # sparks from a dead light
        im.alpha_composite(S.CE, (ox + 2 * T, oy + 4 * T + 4))
    else:
        im.alpha_composite(S.CR, (ox + 2 * T, oy + 4 * T + 4)); low(8, 4, 2)
    # Light from the strips, and from the door.
    for c in (2, 4, 8):
        im = S.glow(im, ox + c * T + 8, oy + T + 12, 14, light[2], 16 if look == 'wreck' else 30)
    suit, stripe, visor = st['suit']
    im.alpha_composite(S.person(suit, stripe, visor).rotate(100, resample=Image.NEAREST), (ox + 7 * T, oy + 4 * T + 6))
    return im


def flat_alarm(im, ox, oy, t):
    """The alarm the way it was first drawn: a sheet of red laid over the room. It lifts the blacks and looks milky."""
    w, h = COLS * T, ROWS * T
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o = ImageDraw.Draw(ov)
    o.rectangle([ox, oy, ox + w - 1, oy + h - 1], fill=(4, 3, 8, 120))
    im = Image.alpha_composite(im, ov)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(ov).rectangle([ox, oy, ox + w - 1, oy + h - 1], fill=S.rgb(S.EMBER[0]) + (round(75 + 35 * math.sin(t * math.tau)),))
    im = Image.alpha_composite(im, ov)
    d = ImageDraw.Draw(im)
    d.rectangle([ox, oy, ox + w - 1, oy + h - 1], outline=S.EMBER[1])
    return im


# Where the people and the loot are in the room that is used to show lockdown and alarm (the pirates' room).
PLAYER = (2 * T + 8, 3 * T + 12)
GUARD = (7 * T + 8, 4 * T + 14)
LOOT = (9 * T + 8, 2 * T + 10)


def mood(im, ox, oy, kind, t, clear=True):
    """The same room in lockdown, with the alarm on, and with a louder alarm where every lamp flashes.
    `t` is the time in seconds, for the pictures that move.

    The light is worked out the way real light behaves: the room is multiplied by a map of how much light
    falls on each spot, in which colour. What is black stays black, and a red light makes things red instead of
    laying a red haze over them. The lamps themselves then get a glow added on top.

    With `clear` the dark is made readable in three ways: the darkest tones are lifted apart before the light
    is worked out, the way eyes get used to the dark. The player carries a lamp that lights what is near. And
    what matters, guards and loot, has a small light of its own."""
    w, h = COLS * T, ROWS * T
    cx, cy = 5 * T, T + 6
    beat = t * 2 % 1 < 0.5
    box = (ox, oy, ox + w, oy + h)
    scene = im.crop(box).convert('RGB')
    if clear:
        scene = scene.point([round(255 * (v / 255) ** 0.62) for v in range(256)] * 3)
    black = lambda: Image.new('RGB', (w, h), (0, 0, 0))

    def beam(layer, angle, colour, spread):
        d = ImageDraw.Draw(layer)
        d.polygon([(cx, cy)] + [(cx + math.cos(angle + k * spread / 3) * 240, cy + math.sin(angle + k * spread / 3) * 240) for k in range(-3, 4)], fill=colour)

    def pool(layer, x, y, r, colour):
        ImageDraw.Draw(layer).ellipse([x - r, y - r, x + r, y + r], fill=colour)
    lamps = [(k * T + 8, T + 5, (k % 2 == 0) == beat) for k in range(1, COLS - 1) if k != 6]
    # `ambient` is the light that is everywhere, `light` what the lamps and beams add where they fall, and
    # `glow` the lamps themselves.
    light = black()
    glow = black()

    def add(shape, *args):
        nonlocal light
        layer = black(); shape(layer, *args); light = ImageChops.add(light, layer)
    if kind == 'lockdown':
        ambient = (58, 54, 80)
        for colour, spread in (((90, 14, 10), 0.46), ((120, 22, 16), 0.22)):
            add(beam, 0.9 + t * math.tau / 3, colour, spread)
        pool(glow, cx, cy, 7, (70, 16, 8))
    elif kind == 'alarm':
        k = 0.5 + 0.5 * math.sin(t * math.tau)
        ambient = (round(110 + 50 * k), 34, 36)
        for x, y, _ in lamps:
            add(pool, x, y + 8, 30, (round(30 + 30 * k), 10, 6))
            pool(glow, x, y, 6, (round(40 + 30 * k), 10, 4))
    else:
        ambient = (104, 30, 34)
        for turn in (0, math.pi):
            for colour, spread in (((70, 12, 8), 0.5), ((110, 26, 14), 0.24)):
                add(beam, t * math.tau + turn, colour, spread)
        for x, y, on in lamps:
            if not on:
                continue
            add(pool, x, y + 8, 40, (60, 18, 8))
            add(pool, x, y + 8, 22, (80, 40, 16))
            pool(glow, x, y, 8, (90, 40, 14))
    if clear:
        # The player's own lamp, the visor of the guard and the glint of the loot.
        add(pool, *PLAYER, 34, (46, 46, 54)); add(pool, *PLAYER, 20, (50, 50, 56))
        add(pool, *GUARD, 11, (20, 44, 22))
        add(pool, *LOOT, 11, (54, 40, 14))
    # Light that falls on something is counted twice, so that a strong lamp can light a dark floor.
    lit = ImageChops.multiply(scene, light)
    scene = ImageChops.add(ImageChops.add(ImageChops.multiply(scene, Image.new('RGB', (w, h), ambient)), ImageChops.add(lit, lit)), glow)
    im.paste(scene, box)
    d = ImageDraw.Draw(im)
    d.rectangle([ox + cx - 2, oy + cy - 3, ox + cx + 2, oy + cy + 1], fill=S.EMBER[2], outline=S.OUT)
    if kind == 'alarm':
        d.rectangle([ox, oy, ox + w - 1, oy + h - 1], outline=S.EMBER[1])
        d.rectangle([ox + 1, oy + 1, ox + w - 2, oy + h - 2], outline=S.EMBER[0])
    if kind == 'alarm2':
        # The lamps that are lit burn bright, the others are dark, and the frame round the picture blinks.
        for x, y, on in lamps:
            d.rectangle([ox + x - 5, oy + y - 2, ox + x + 4, oy + y + 1], fill=S.EMBER[2] if on else S.DARK[0])
            if on:
                d.line([(ox + x - 4, oy + y - 1), (ox + x + 3, oy + y - 1)], fill=S.EMBER[3])
        for k in range(3 if beat else 1):
            d.rectangle([ox + k, oy + k, ox + w - 1 - k, oy + h - 1 - k], outline=S.EMBER[2 if beat else 0])
    return im


def mood_gif():
    """Lockdown and the two alarms side by side, moving, since the difference between them is in how the light moves."""
    gap = 14
    cw = COLS * T + gap
    W, H = 8 + cw * 4, 20 + ROWS * T + 34
    base = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(base)
    S.txt(d, 8, 6, 'LOCKDOWN AND ALARM  ·  THE SAME LIGHT, BEFORE AND AFTER THE DARK IS MADE EASIER TO READ', S.STEEL[3])
    views = (('LOCKDOWN  ·  BEFORE', 'HARD TO SEE IN THE DARK', 'lockdown', False),
             ('LOCKDOWN  ·  CLEARER', 'YOUR LAMP, AND WHAT MATTERS', 'lockdown', True),
             ('ALARM  ·  BEFORE', 'THE DARK SWALLOWS IT', 'alarm2', False),
             ('ALARM  ·  CLEARER', 'SAME LIGHT, MORE TO SEE', 'alarm2', True))
    me = S.person(S.STEEL, S.OCHRE, S.GLASS).rotate(-90, resample=Image.NEAREST)
    for i, (name, note, kind, clear) in enumerate(views):
        x = 8 + i * cw
        base = room(base, x, 20, STYLES['PIRATES'], seed=8)
        base.alpha_composite(me, (x + PLAYER[0] - 8, 20 + PLAYER[1] - 8))
        d = ImageDraw.Draw(base)
        S.txt(d, x + COLS * T // 2, 20 + ROWS * T + 5, name, S.EMBER[2] if clear else S.STEEL[1], 'c')
        S.txt(d, x + COLS * T // 2, 20 + ROWS * T + 17, note, S.STEEL[1], 'c')
    frames = []
    count, step = 24, 0.125
    for f in range(count):
        im = base.copy()
        for i, (_, _, kind, clear) in enumerate(views):
            im = mood(im, 8 + i * cw, 20, kind, f * step, clear)
        frames.append(im.convert('RGB').resize((W * 2, H * 2), Image.NEAREST))
    # One palette for all frames, so that the colours do not flicker from frame to frame.
    strip = Image.new('RGB', (W * 2, H * 2 * 6))
    for k in range(6):
        strip.paste(frames[k * 4 + 1], (0, H * 2 * k))
    palette = strip.quantize(255, dither=Image.Dither.NONE)
    out = [fr.quantize(palette=palette, dither=Image.Dither.NONE) for fr in frames]
    path = os.path.join(S.OUT_DIR, 'lockdown-alarm.gif')
    out[0].save(path, save_all=True, append_images=out[1:], duration=round(step * 1000), loop=0, optimize=False)
    return (W * 2, H * 2), count


def style_sheet():
    gap = 14
    cw, ch = COLS * T + gap, ROWS * T + 26
    W, H = 8 + cw * 3, 20 + ch * 3 + 14
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.txt(d, 8, 6, 'ROOMS BY SIDE  ·  THE SAME PIECES IN EACH SIDE\'S COLOURS AND WITH ITS OWN THINGS', S.STEEL[3])
    for i, (name, st) in enumerate(STYLES.items()):
        x, y = 8 + (i % 3) * cw, 20 + (i // 3) * ch
        im = room(im, x, y, st, seed=3 + i)
        d = ImageDraw.Draw(im)
        S.txt(d, x + COLS * T // 2, y + ROWS * T + 5, name, st['light'][2], 'c')
    y = 20 + ch * 2 + 12
    d = ImageDraw.Draw(im)
    S.txt(d, 8, y - 10, 'THE SAME ROOM IN THREE STATES', S.STEEL[3])
    pirates = STYLES['PIRATES']
    for i, (name, kind) in enumerate((('CALM  ·  AFTER YOU HAVE TAKEN IT', None), ('LOCKDOWN  ·  DARK, A RED LIGHT SWEEPS', 'lockdown'), ('ALARM  ·  LAMPS FLASH, BEAMS SPIN, SIREN', 'alarm2'))):
        x = 8 + i * cw
        im = room(im, x, y, pirates, seed=8)
        if kind:
            im = mood(im, x, y, kind, 0.9)
        d = ImageDraw.Draw(im)
        S.txt(d, x + COLS * T // 2, y + ROWS * T + 5, name, S.EMBER[2] if kind else S.STEEL[2], 'c')
    im.convert('RGB').resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(S.OUT_DIR, 'interior-styles.png'), optimize=True)
    return im.size


# ---------------------------------------------------------------- generated floor plans
# A plan is a grid of characters:
#   ' ' space outside the hull    '#' wall or solid hull    '.' floor    ',' floor that is for staff only
#   'D' door   'S' staff door   'A' airlock   'V' vault   'M' mainframe   'G' guard   'T' turret   'K' camera   'X' torn open
WALK = set('.,DSAVMGTK')


def reach(grid, start):
    """Every tile that can be walked to from `start`."""
    seen = {start}
    todo = deque([start])
    while todo:
        x, y = todo.popleft()
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + a, y + b)
            if p in seen or not (0 <= p[1] < len(grid) and 0 <= p[0] < len(grid[0])) or grid[p[1]][p[0]] not in WALK:
                continue
            seen.add(p)
            todo.append(p)
    return seen


def find(grid, ch):
    return [(x, y) for y, row in enumerate(grid) for x, c in enumerate(row) if c == ch]


HULLS = {
    # length in tiles, and half the width of the hull from stern (0) to bow (1)
    'GUNBOAT': dict(length=36, half=lambda t: 8 if t < 0.55 else 8 - (t - 0.55) * 11, rooms=(5, 7)),
    'UNKNOWN HULL': dict(length=52, half=lambda t: 7 + 3 * min(1, t * 4) if t < 0.6 else 10 - (t - 0.6) * 17, rooms=(6, 9)),
    'FREIGHTER': dict(length=78, half=lambda t: 8 if t < 0.14 else 7 if t < 0.84 else 4, rooms=(9, 13)),
}


def wreck_plan(kind, seed):
    """A wreck is long and narrow: a corridor along its spine, rooms on both sides, the engines astern and the
    bridge in the bow. The airlock is in the flank, where the frigate docks."""
    g = random.Random(seed)
    spec = HULLS[kind]
    L = spec['length']
    halves = [max(2, round(spec['half'](x / (L - 1)))) for x in range(L)]
    H = max(halves) * 2 + 4
    cy = H // 2
    grid = [[' '] * (L + 2) for _ in range(H)]
    inside = lambda x, y: 0 <= x < L and abs(y - cy + 0.5) <= halves[x]
    for y in range(H):
        for x in range(L):
            if inside(x, y):
                grid[y][x + 1] = '#'
    put = lambda x, y, c: grid[y].__setitem__(x + 1, c)
    get = lambda x, y: grid[y][x + 1] if 0 <= y < H and -1 <= x <= L else ' '
    floor = lambda x, y: inside(x, y) and all(inside(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    # The spine.
    for x in range(2, L - 2):
        for y in (cy - 1, cy):
            if floor(x, y):
                put(x, y, '.')
    # Rooms in segments along the spine. The first is the engine room and the last the bridge: they span both sides.
    rooms = []
    x = 2
    while x < L - 3:
        w = g.randint(*spec['rooms'])
        if L - 3 - (x + w) < 4:
            w = L - 3 - x
        ends = x == 2 or x + w >= L - 3
        for side in (-1, 1):
            tiles = [(i, j) for i in range(x, x + w) for j in (range(1, cy - 2) if side < 0 else range(cy + 2, H - 1)) if floor(i, j)]
            if len(tiles) < 6:
                continue
            rooms.append(dict(tiles=tiles, side=side, x0=x, w=w, ends=ends, torn=False))
        x += w + 1
    # The airlock is in the lower flank near the middle. That room is always whole.
    lower = [r for r in rooms if r['side'] > 0 and not r['ends']] or [r for r in rooms if r['side'] > 0]
    bay = min(lower, key=lambda r: abs(r['x0'] + r['w'] / 2 - L * 0.45))
    # Now and then a room is torn open to space, and there is no way through it. At least one whole room is
    # always left for the vault.
    for r in rooms:
        r['torn'] = not r['ends'] and r is not bay and g.random() < 0.18
    spare = [r for r in rooms if not r['ends'] and r is not bay]
    if spare and all(r['torn'] for r in spare):
        g.choice(spare)['torn'] = False
    for r in rooms:
        for i, j in r['tiles']:
            put(i, j, 'X' if r['torn'] else '.')
        if r['torn']:
            continue
        cols = sorted({i for i, _ in r['tiles']})
        door = g.choice(cols[1:-1] or cols)
        put(door, cy - 2 if r['side'] < 0 else cy + 1, 'D')
    # The bridge and the engine room open straight onto the spine.
    for r in rooms:
        if r['ends']:
            for i in range(r['x0'], r['x0'] + r['w']):
                for j in (cy - 2, cy + 1):
                    if floor(i, j):
                        put(i, j, '.')
    # Doors between neighbours make loops, so that there is more than one way round.
    for a, b in zip(rooms, rooms[2:]):
        if a['side'] == b['side'] and not a['torn'] and not b['torn'] and g.random() < 0.45:
            wall_x = b['x0'] - 1
            rows = [j for i, j in a['tiles'] if i == wall_x - 1 and get(wall_x + 1, j) == '.']
            if rows:
                put(wall_x, g.choice(rows), 'D')
    ax = bay['x0'] + bay['w'] // 2
    ay = max(j for i, j in bay['tiles'] if i == ax)
    put(ax, ay + 1, 'A')
    # The vault is the room furthest from the airlock.
    seen = reach(grid, (ax + 1, ay + 1))
    order = {}
    todo = deque([((ax + 1, ay + 1), 0)])
    while todo:
        (px, py), n = todo.popleft()
        if (px, py) in order:
            continue
        order[(px, py)] = n
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (px + a, py + b) in seen and (px + a, py + b) not in order:
                todo.append(((px + a, py + b), n + 1))
    usable = [r for r in rooms if not r['torn'] and not r['ends'] and r is not bay and (r['tiles'][0][0] + 1, r['tiles'][0][1]) in order]
    vault = max(usable or [r for r in rooms if r is not bay and not r['torn']], key=lambda r: order.get((r['tiles'][0][0] + 1, r['tiles'][0][1]), 0))
    vx, vy = vault['tiles'][len(vault['tiles']) // 2]
    put(vx, vy, 'V')
    # Guards in some of the rooms and one on the spine, and a turret at the far end of it.
    for r in g.sample([r for r in rooms if not r['torn'] and r is not bay], k=min(3, len(rooms) - 2)):
        i, j = g.choice(r['tiles'])
        if get(i, j) == '.':
            put(i, j, 'G')
    put(L - 6 if vx > L / 2 else 5, cy, 'T')
    ok = (vx + 1, vy) in reach(grid, (ax + 1, ay + 1))
    return [''.join(row) for row in grid], ok


def station_plan(seed):
    """A station is a ring around a hub, with four docking arms. The crew comes in through the arm they docked at.
    The ring and the rooms along it are open to visitors. The hub with the mainframe, and the vault, are for staff."""
    g = random.Random(seed)
    N = 73
    c = N // 2
    grid = [[' '] * N for _ in range(N)]

    def dist(x, y):
        dx, dy = abs(x - c), abs(y - c)
        return max(dx, dy, (dx + dy) * 0.72)
    for y in range(N):
        for x in range(N):
            d = dist(x, y)
            if d <= 27:
                grid[y][x] = '#'
            if 21 <= d <= 23:
                grid[y][x] = '.'
            if d <= 7:
                grid[y][x] = ','
    put = lambda x, y, ch: grid[y].__setitem__(x, ch)
    # The docking arms: a corridor out from the ring to an airlock at the tip.
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        for k in range(24, 35):
            for side in (-1, 0, 1):
                x, y = c + dx * k + dy * side, c + dy * k + dx * side
                put(x, y, '#' if k <= 27 or abs(side) == 1 else ' ')
                if side == 0:
                    put(x, y, '.')
            for side in (-2, 2):
                x, y = c + dx * k + dy * side, c + dy * k + dx * side
                if k > 27:
                    put(x, y, ' ')
        for side in (-1, 1):
            for k in range(28, 35):
                put(c + dx * k + dy * side, c + dy * k + dx * side, '#')
        put(c + dx * 35, c + dy * 35, 'A')
        for side in (-1, 1):
            put(c + dx * 35 + dy * side, c + dy * 35 + dx * side, '#')
    # Spokes from the ring to the hub. Only some of them are open: the rest are sealed, so the way in differs.
    spokes = [(0, -1), (0, 1), (-1, 0), (1, 0)]
    open_spokes = g.sample(spokes, k=g.choice((1, 2, 2)))
    for dx, dy in open_spokes:
        for k in range(8, 21):
            for side in (-1, 0, 1):
                put(c + dx * k + dy * side, c + dy * k + dx * side, ',' if side == 0 or 9 < k < 20 else '#')
        put(c + dx * 20, c + dy * 20, 'S')
        put(c + dx * 8, c + dy * 8, ',')
        put(c + dx * 19 + dy, c + dy * 19 + dx, 'K')
    # The four blocks between the ring and the hub are cut up into rooms, differently each time. Each block is
    # split once or twice into rectangles, in its own coordinates: u and v count tiles out from the two spokes.
    def cut(rect, axis, at):
        u0, v0, u1, v1 = rect
        return [(u0, v0, at, v1), (at, v0, u1, v1)] if axis == 'u' else [(u0, v0, u1, at), (u0, at, u1, v1)]
    rooms = []
    for qx in (-1, 1):
        for qy in (-1, 1):
            axis = g.choice('uv')
            rects = cut((3, 3, 20, 20), axis, g.randint(9, 13))
            for r in list(rects):
                if g.random() < 0.6:
                    rects.remove(r)
                    rects += cut(r, 'v' if axis == 'u' else 'u', g.randint(9, 13))
            for u0, v0, u1, v1 in rects:
                tiles = [(c + qx * u, c + qy * v) for u in range(u0 + 1, u1) for v in range(v0 + 1, v1) if 9 <= dist(c + u, c + v) <= 19]
                if len(tiles) >= 9:
                    rooms.append(dict(tiles=tiles, q=(qx, qy), by_u=u0 == 3, by_v=v0 == 3, kind=None))
    owner = {p: r for r in rooms for p in r['tiles']}

    def carve(r, ch):
        for p in r['tiles']:
            put(p[0], p[1], ch)

    def door_from(r, steps, want, ch):
        """Cut a door from the room straight through its wall to a tile that is `want`, at most `steps` away."""
        for x, y in g.sample(r['tiles'], len(r['tiles'])):
            for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                path = [(x + ax * k, y + ay * k) for k in range(1, steps + 1)]
                walls = []
                for px, py in path:
                    if grid[py][px] == '#' and (px, py) not in owner:
                        walls.append((px, py))
                        continue
                    if walls and want(px, py):
                        # A door must have wall on both sides of it, or it would open into a corner.
                        wx, wy = walls[0]
                        if grid[wy + ax][wx + ay] == '#' and grid[wy - ax][wx - ay] == '#':
                            put(wx, wy, ch)
                            for q in walls[1:]:
                                put(q[0], q[1], grid[py][px] if grid[py][px] in '.,' else '.')
                            return True
                    break
        return False
    # Beside each open spoke, one room is for staff: it opens onto the spoke and nowhere else.
    staff = []
    for dx, dy in open_spokes:
        beside = [r for r in rooms if r['kind'] is None and ((dx == 0 and r['by_u'] and r['q'][1] == dy) or (dy == 0 and r['by_v'] and r['q'][0] == dx))]
        for r in g.sample(beside, len(beside)):
            carve(r, ',')
            if door_from(r, 3, lambda x, y: grid[y][x] == ',' and (x, y) not in owner, 'D'):
                r['kind'] = 'staff'
                staff.append(r)
                break
            carve(r, '#')
    # The other rooms open onto the ring, and are for visitors. A room that cannot reach the ring opens into
    # a neighbour that can.
    public = []
    for r in rooms:
        if r['kind'] is None:
            carve(r, '.')
            if door_from(r, 5, lambda x, y: 21 <= dist(x, y) <= 23, 'D'):
                r['kind'] = 'public'
                public.append(r)
            else:
                carve(r, '#')
    changed = True
    while changed:
        changed = False
        for r in rooms:
            if r['kind'] is None:
                carve(r, '.')
                if door_from(r, 2, lambda x, y: owner.get((x, y), r)['kind'] == 'public' and owner.get((x, y)) is not r, 'D'):
                    r['kind'] = 'public'
                    public.append(r)
                    changed = True
                else:
                    carve(r, '#')
    # The mainframe stands in the hub. The vault is one of the staff rooms.
    put(c, c, 'M')
    if staff:
        tiles = staff[0]['tiles']
        vx, vy = tiles[len(tiles) // 2]
        put(vx, vy, 'V')
    # Guards: one walks the ring, one stands at each staff door, one keeps to the hub. A turret covers one spoke
    # when there are two ways in, so that there is always a way round it.
    put(c + 22, c + 6, 'G')
    put(c - 3, c + 2, 'G')
    for dx, dy in open_spokes:
        put(c + dx * 17 - dy, c + dy * 17 - dx, 'G')
    if len(open_spokes) > 1:
        dx, dy = open_spokes[0]
        put(c + dx * 11, c + dy * 11, 'T')
    rows = [''.join(r) for r in grid]
    airlocks = find(rows, 'A')
    ok = all((c, c) in reach(rows, a) for a in airlocks)
    return rows, ok, len(open_spokes)


PX = 4
COLOUR = {
    '#': '#3a3d4e', '.': '#1d1f2b', ',': '#2a1f2b', 'X': '#0d0d14', 'D': S.OCHRE[2], 'S': S.EMBER[1], 'A': S.ACID[2],
    'V': S.OCHRE[3], 'M': S.ION[2], 'G': S.EMBER[2], 'T': S.EMBER[3], 'K': BLUE[2],
}
BIG = set('AVMGTK')


def draw_plan(im, rows, ox, oy):
    d = ImageDraw.Draw(im)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ' ':
                continue
            base = ',' if ch in 'SVMK' else '.' if ch in BIG or ch == 'D' else ch
            d.rectangle([ox + x * PX, oy + y * PX, ox + x * PX + PX - 1, oy + y * PX + PX - 1], fill=COLOUR[base])
            if ch == 'X' and (x + y) % 3 == 0:
                d.point((ox + x * PX + 1, oy + y * PX + 2), '#55587a')
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            px, py = ox + x * PX, oy + y * PX
            if ch in 'DS':
                d.rectangle([px, py, px + PX - 1, py + PX - 1], fill=COLOUR[ch])
            elif ch in BIG:
                d.rectangle([px - 2, py - 2, px + PX + 1, py + PX + 1], fill=COLOUR[ch], outline=S.OUT)
    return len(rows[0]) * PX, len(rows) * PX


def plan_sheet():
    W, H = 960, 640
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    S.txt(d, 8, 6, 'FLOOR PLANS THAT ARE MADE NEW FOR EVERY GAME  ·  EACH FOLLOWS THE SHAPE OF WHAT YOU BOARDED', S.STEEL[3])
    # Legend, and how much of a plan fits on the screen at once.
    legend = (('A', 'AIRLOCK'), ('D', 'DOOR'), ('S', 'STAFF DOOR'), ('G', 'GUARD'), ('T', 'TURRET'), ('K', 'CAMERA'), ('V', 'VAULT'), ('M', 'MAINFRAME'))
    x = 8
    for ch, name in legend:
        d.rectangle([x, 22, x + 7, 29], fill=COLOUR[ch], outline=S.OUT)
        S.txt(d, x + 12, 22, name, S.STEEL[2])
        x += 22 + S.tw(name)
    d.rectangle([x + 6, 22, x + 13, 29], fill=COLOUR['.']); S.txt(d, x + 18, 22, 'OPEN TO ALL', S.STEEL[2]); x += 28 + S.tw('OPEN TO ALL')
    d.rectangle([x + 6, 22, x + 13, 29], fill=COLOUR[',']); S.txt(d, x + 18, 22, 'STAFF ONLY', S.STEEL[2]); x += 28 + S.tw('STAFF ONLY')
    d.rectangle([x + 6, 22, x + 13, 29], fill=COLOUR['X']); S.txt(d, x + 18, 22, 'TORN OPEN', S.STEEL[2])

    def screen(x, y):
        # 40 x 22 tiles is what the screen shows at once. Today every inside is 32 x 18.
        w, h = 40 * PX, 22 * PX
        for k in range(0, w, 6):
            d.line([(x + k, y), (x + k + 2, y)], fill=S.STEEL[1]); d.line([(x + k, y + h), (x + k + 2, y + h)], fill=S.STEEL[1])
        for k in range(0, h, 6):
            d.line([(x, y + k), (x, y + k + 2)], fill=S.STEEL[1]); d.line([(x + w, y + k), (x + w, y + k + 2)], fill=S.STEEL[1])
        S.txt(d, x + w // 2, y + h // 2 - 3, 'ONE SCREEN', S.STEEL[1], 'c')

    y = 46
    S.txt(d, 8, y, 'WRECKS  ·  A SPINE WITH ROOMS ON BOTH SIDES, ENGINES ASTERN, BRIDGE IN THE BOW, AIRLOCK IN THE FLANK', S.OCHRE[2])
    tested = 0
    for row, seeds in enumerate(((3, 12, 5), (8, 21, 14))):
        x = 8
        for kind, seed in zip(HULLS, seeds):
            rows, ok = wreck_plan(kind, seed)
            assert ok, (kind, seed)
            w, h = draw_plan(im, rows, x, y + 26 + row * 108)
            d = ImageDraw.Draw(im)
            if row == 0:
                S.txt(d, x + w // 2, y + 13, kind + ' WRECK', S.STEEL[2], 'c')
            x += w + 22
        if row == 0:
            screen(x + 10, y + 26)
    y = 290
    S.txt(d, 8, y, 'STATIONS  ·  A RING ROUND A HUB WITH FOUR DOCKING ARMS. YOU COME IN THROUGH THE ARM YOU DOCKED AT', S.OCHRE[2])
    x = 8
    for seed in (4, 9, 17):
        rows, ok, ways = station_plan(seed)
        assert ok, seed
        w, h = draw_plan(im, rows, x, y + 14)
        d = ImageDraw.Draw(im)
        S.txt(d, x + w // 2, y + 18 + h, ('ONE WAY' if ways == 1 else 'TWO WAYS') + ' IN TO THE MAINFRAME', S.STEEL[2], 'c')
        x += w + 20
    # Every plan is checked: the way from each airlock to the vault or the mainframe must be open.
    for seed in range(300):
        for kind in HULLS:
            tested += 1
            assert wreck_plan(kind, seed)[1], (kind, seed)
        tested += 1
        assert station_plan(seed)[1], seed
    S.txt(d, 8, H - 14, f'{tested} PLANS MADE AND CHECKED: IN EVERY ONE THE WAY FROM THE AIRLOCK TO THE VAULT OR THE MAINFRAME IS OPEN', S.ACID[2])
    im.convert('RGB').resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(S.OUT_DIR, 'floor-plans.png'), optimize=True)
    return im.size, tested


if __name__ == '__main__':
    print('wrote interior-styles.png', style_sheet())
    print('wrote floor-plans.png', plan_sheet())
    print('wrote lockdown-alarm.gif', mood_gif())
