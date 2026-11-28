"""Design sketches for more ship classes (F-039, F-304, the owner 2026-11-28): six new ships, and the Interceptor that
is already drawn, each in the colours of the sides that would fly it, and a floor plan for those that can be boarded.

Usage: OUT_DIR=<folder> python3 ships3.py <ships-folder>
  Writes one picture per ship and side, and one floor plan per ship that can be boarded, into <ships-folder>
  (docs/design/img/ships). OUT_DIR keeps the style sheet that style.py writes when imported out of the way.
All ships point up, at the size they would have in the game. The page that shows them is prototypes/ships.html.
"""
import os
import sys
from PIL import Image, ImageDraw
import style as S

TEAL = ['#2e6b5f', '#3f8f80', '#58b0a0', '#a0e0d0']
RUST = ['#4a2f26', '#6e4434', '#8f5d44', '#b98562']
HAZARD = ['#7a5a12', '#c89a22', '#f0c840', '#fff0a0']
TRADER = dict(hull=S.STEEL, hull2=S.STEEL2, accent=S.OCHRE, glass=S.GLASS, glow=S.ION)
PATROL = dict(hull=S.STEEL, hull2=S.STEEL2, accent=TEAL, glass=S.GLASS, glow=S.ION)
DRIFTER = dict(hull=RUST, hull2=S.STEEL2, accent=S.OCHRE, glass=S.GLASS, glow=S.ION)
PIRATE = dict(hull=S.PLUM, hull2=S.PLUM2, accent=S.BONE, glass=S.ACID, glow=S.EMBER)


def ramps(c, extra=None):
    r = {1: c['hull'], 2: c['hull2'], 3: c['accent'], 4: c['glass'], 5: S.DARK, 6: c['glow'], 'glassy': (4,), 'glow': (6,)}
    r.update(extra or {})
    return r


def corvette(c):
    """Escort corvette: a sleek hull with two shield emitters on outriggers, which throw a shield over the ship it
    guards, and one turret on the back."""
    w, h, m = 60, 76, 30
    parts = [
        (2, 'p', [(m, 4), (m - 6, 10), (m - 10, 30), (m - 11, 58), (m - 7, 66), (m, 66)]),           # hull
        (1, 'p', [(m, 8), (m - 4, 13), (m - 7, 30), (m - 8, 56), (m - 5, 62), (m, 62)]),              # deck
        (4, 'p', [(m, 14), (m - 3, 16), (m - 4, 23), (m, 25)]),                                        # bridge glass
        (2, 'p', [(m - 10, 34), (m - 22, 40), (m - 24, 48), (m - 10, 46)]),                            # outrigger
        (7, 'e', [m - 29, 39, m - 19, 51]),                                                            # shield emitter
        (8, 'e', [m - 26, 42, m - 22, 48]),                                                            # emitter glow
        (5, 'e', [m - 5, 36, m + 5, 46]), (9, 'r', [m - 1, 26, m, 37]),                                # turret
        (3, 'r', [m - 8, 30, m - 7, 56]),                                                              # accent stripe
        (2, 'p', [(m, 62), (m - 9, 62), (m - 11, 68), (m, 68)]),                                       # engine block
        (5, 'r', [m - 9, 68, m - 4, 71]), (5, 'r', [m - 2, 68, m, 71]),
        (6, 'r', [m - 8, 72, m - 5, 73]), (6, 'r', [m - 1, 72, m, 73]),
    ]

    def det(px, ln):
        ln((m - 6, 50), (m - 1, 50), c['hull'][0]); ln((m - 6, 56), (m - 1, 56), c['hull'][0])
        px([(m - 9, 60), (m - 3, 30), (m - 15, 44)], c['hull2'][3]); px([(m - 2, 28)], S.DARK[3])
    return S.sprite(w, h, parts, ramps(c, {7: S.STEEL2, 8: S.ION, 9: S.DARK, 'glow': (6, 8)}), det)


def courier(c):
    """Armoured courier: a narrow, heavily plated hull round a strongroom in the middle, with big engines to outrun
    trouble. It carries what is worth guarding: credits, charts, and now and then something the story asks for."""
    w, h, m = 44, 84, 22
    parts = [
        (2, 'p', [(m, 2), (m - 6, 8), (m - 9, 20), (m - 12, 26), (m - 12, 58), (m - 9, 66), (m, 66)]),   # armour
        (1, 'p', [(m, 6), (m - 4, 10), (m - 6, 22), (m - 8, 28), (m - 8, 56), (m - 6, 62), (m, 62)]),     # hull
        (4, 'p', [(m, 10), (m - 3, 12), (m - 3, 18), (m, 19)]),                                           # bridge glass
        (7, 'r', [m - 6, 32, m, 50]),                                                                     # strongroom
        (3, 'r', [m - 12, 30, m - 11, 54]),                                                               # accent stripe
        (2, 'p', [(m - 9, 60), (m - 16, 64), (m - 16, 78), (m - 9, 78)]),                                 # engine pods
        (2, 'p', [(m, 64), (m - 6, 64), (m - 6, 76), (m, 76)]),
        (5, 'r', [m - 15, 78, m - 10, 81]), (5, 'r', [m - 5, 76, m, 79]),
        (6, 'r', [m - 14, 82, m - 11, 83]), (6, 'r', [m - 4, 80, m, 81]),
    ]

    def det(px, ln):
        for y in (36, 41, 46): ln((m - 5, y), (m - 1, y), S.DARK[1])
        ln((m - 3, 33), (m - 3, 49), S.DARK[1]); px([(m - 2, 41)], c['accent'][3])
        for y in (28, 34, 40, 46, 52): px([(m - 10, y)], c['hull2'][3])
        ln((m - 7, 58), (m - 1, 58), c['hull'][0])
    return S.sprite(w, h, parts, ramps(c, {7: S.DARK}), det)


def minelayer(c):
    """Minelayer: a boxy hull with a rack of mines at the stern that it drops behind it as it goes."""
    w, h, m = 56, 70, 28
    parts = [
        (2, 'p', [(m, 4), (m - 10, 8), (m - 16, 18), (m - 18, 50), (m - 14, 56), (m, 56)]),             # hull
        (1, 'p', [(m, 8), (m - 7, 11), (m - 12, 20), (m - 13, 48), (m, 48)]),                           # deck
        (4, 'p', [(m, 12), (m - 4, 14), (m - 5, 20), (m, 22)]),                                         # bridge glass
        (5, 'r', [m - 16, 50, m, 64]),                                                                  # mine rack
        (3, 'r', [m - 13, 26, m - 12, 46]),                                                             # accent stripe
        (2, 'p', [(m - 18, 40), (m - 24, 44), (m - 24, 58), (m - 18, 58)]),                             # engine pods
        (5, 'r', [m - 23, 58, m - 19, 61]), (6, 'r', [m - 22, 62, m - 20, 63]),
    ]
    for x, y in ((12, 53), (5, 53), (12, 60), (5, 60)): parts.append((7, 'e', [m - x - 3, y - 3, m - x + 3, y + 3]))

    def det(px, ln):
        for x, y in ((12, 53), (5, 53), (12, 60), (5, 60)): px([(m - x, y)], S.EMBER[2]); px([(m - x - 1, y - 1)], S.EMBER[3])
        ln((m - 11, 30), (m - 1, 30), c['hull'][0]); ln((m - 11, 40), (m - 1, 40), c['hull'][0])
        px([(m - 14, 22), (m - 6, 46)], c['hull2'][3])
    return S.sprite(w, h, parts, ramps(c, {7: S.STEEL2, 'glow': (6,)}), det)


def salvager(c):
    """Salvager: two crane arms at the bow that take hold of wrecks, an open hold behind them, and a squat hull. It
    races the crew to what drifts after a fight."""
    w, h, m = 64, 86, 32
    parts = [
        (2, 'p', [(m - 6, 22), (m - 18, 24), (m - 22, 34), (m - 22, 70), (m - 16, 78), (m, 78), (m, 22)]),   # hull
        (1, 'p', [(m - 4, 26), (m - 15, 28), (m - 18, 36), (m - 18, 68), (m - 13, 74), (m, 74), (m, 26)]),   # deck
        (5, 'r', [m - 12, 36, m, 58]),                                                                     # open hold
        (2, 'p', [(m - 16, 24), (m - 22, 6), (m - 26, 4), (m - 28, 8), (m - 22, 26)]),                      # crane arm
        (3, 'p', [(m - 26, 2), (m - 30, 4), (m - 29, 10), (m - 25, 8)]),                                    # claw
        (4, 'p', [(m, 26), (m - 5, 28), (m - 6, 33), (m, 34)]),                                             # bridge glass
        (3, 'r', [m - 21, 38, m - 20, 66]),                                                                 # accent stripe
        (2, 'p', [(m, 74), (m - 12, 74), (m - 14, 80), (m, 80)]),                                           # engine block
        (5, 'r', [m - 12, 80, m - 7, 83]), (5, 'r', [m - 4, 80, m, 83]),
        (6, 'r', [m - 11, 84, m - 8, 85]), (6, 'r', [m - 3, 84, m, 85]),
    ]

    def det(px, ln):
        # Scrap lying in the hold.
        px([(m - 9, 40), (m - 4, 44), (m - 10, 50), (m - 6, 54)], c['hull'][2]); px([(m - 3, 39), (m - 8, 47)], S.OCHRE[2])
        ln((m - 17, 62), (m - 1, 62), c['hull'][0]); ln((m - 20, 14), (m - 24, 20), c['hull2'][3])
        px([(m - 16, 70), (m - 20, 42)], c['hull2'][3])
    return S.sprite(w, h, parts, ramps(c), det)


def tanker(c):
    """Fuel tanker: three great round tanks along a spine, slow and unarmed. Blown up, it takes everything near it
    with it; knocked out and boarded, its tanks fill the frigate's."""
    w, h, m = 64, 150, 32
    parts = [
        (2, 'r', [m - 3, 22, m, 128]),                                                                  # spine
        (1, 'p', [(m, 2), (m - 7, 5), (m - 11, 13), (m - 11, 24), (m, 24)]),                            # crew module
        (4, 'p', [(m, 6), (m - 4, 8), (m - 5, 14), (m, 15)]),                                           # bridge glass
        (1, 'p', [(m, 124), (m - 12, 124), (m - 17, 130), (m - 17, 142), (m, 142)]),                    # engine block
        (5, 'r', [m - 15, 142, m - 9, 145]), (5, 'r', [m - 6, 142, m, 145]),
        (6, 'r', [m - 14, 146, m - 10, 147]), (6, 'r', [m - 5, 146, m, 147]),
    ]
    for y in (28, 60, 92):
        parts += [(7, 'e', [m - 26, y, m + 26, y + 30]), (8, 'r', [m - 26, y + 13, m - 20, y + 17])]

    def det(px, ln):
        for y in (28, 60, 92):
            ln((m - 18, y + 4), (m - 6, y + 2), S.STEEL[3]); px([(m - 10, y + 24), (m - 4, y + 26)], S.STEEL[0])
            ln((m - 1, y + 1), (m - 1, y + 29), S.STEEL2[1])
        px([(m - 8, 18), (m - 14, 130)], c['hull'][3])
    return S.sprite(w, h, parts, ramps(c, {7: S.STEEL, 8: HAZARD}), det)


def torpedo_boat(c):
    """Torpedo boat: long and narrow, with two tubes in the bow. Its torpedoes are slow and hit very hard, and can
    be shot down on the way."""
    w, h, m = 40, 74, 20
    parts = [
        (2, 'p', [(m, 2), (m - 5, 6), (m - 8, 20), (m - 8, 56), (m - 5, 62), (m, 62)]),             # hull
        (1, 'p', [(m, 6), (m - 3, 9), (m - 5, 22), (m - 5, 54), (m, 54)]),                          # deck
        (5, 'r', [m - 8, 4, m - 6, 18]),                                                             # torpedo tube
        (7, 'r', [m - 8, 2, m - 6, 4]),                                                              # tube mouth
        (4, 'p', [(m, 26), (m - 3, 28), (m - 3, 34), (m, 35)]),                                     # bridge glass
        (2, 'p', [(m - 8, 40), (m - 16, 50), (m - 16, 58), (m - 8, 56)]),                           # fins
        (3, 'r', [m - 5, 38, m - 4, 52]),                                                            # accent stripe
        (5, 'r', [m - 5, 62, m, 66]), (6, 'r', [m - 4, 67, m, 68]),
    ]

    def det(px, ln):
        ln((m - 4, 44), (m - 1, 44), c['hull'][0]); px([(m - 14, 54), (m - 2, 20)], c['hull2'][3])
    return S.sprite(w, h, parts, ramps(c, {7: S.EMBER, 'glow': (6, 7)}), det)


SHIPS = {
    'corvette': (corvette, [('patrol', PATROL), ('pirate', PIRATE)]),
    'courier': (courier, [('trader', TRADER), ('pirate', PIRATE)]),
    'minelayer': (minelayer, [('pirate', PIRATE), ('patrol', PATROL)]),
    'salvager': (salvager, [('drifter', DRIFTER), ('pirate', PIRATE)]),
    'tanker': (tanker, [('trader', TRADER), ('drifter', DRIFTER)]),
    'torpedo': (torpedo_boat, [('pirate', PIRATE), ('patrol', PATROL)]),
}

# Floor plans for the ships that can be boarded, one tile to a cell, as rooms: (x, y, w, h, name, kind).
# kind: hall, room, key (what the crew comes for), dock (the airlock), danger.
PLANS = {
    'corvette': (14, 30, [
        (5, 2, 4, 4, 'BRIDGE', 'room'), (6, 6, 2, 20, '', 'hall'), (2, 8, 4, 5, 'CREW', 'room'),
        (8, 8, 4, 5, 'ARMS', 'room'), (1, 14, 5, 6, 'SHIELD', 'key'), (8, 14, 5, 6, 'SHIELD', 'key'),
        (2, 21, 4, 3, 'AIRLOCK', 'dock'), (4, 24, 6, 5, 'ENGINES', 'danger'),
    ]),
    'courier': (10, 34, [
        (3, 2, 4, 4, 'BRIDGE', 'room'), (4, 6, 2, 25, '', 'hall'), (1, 8, 3, 5, 'BUNKS', 'room'),
        (6, 8, 3, 5, 'GUARD', 'room'), (2, 14, 6, 8, 'STRONGROOM', 'key'), (1, 23, 3, 3, 'AIRLOCK', 'dock'),
        (6, 23, 3, 4, 'SECURITY', 'room'), (2, 28, 6, 5, 'ENGINES', 'danger'),
    ]),
    'minelayer': (16, 26, [
        (6, 2, 4, 4, 'BRIDGE', 'room'), (7, 6, 2, 12, '', 'hall'), (2, 7, 5, 5, 'CREW', 'room'),
        (9, 7, 5, 5, 'WORKSHOP', 'room'), (2, 13, 3, 3, 'AIRLOCK', 'dock'), (9, 13, 5, 4, 'ARMS', 'room'),
        (3, 18, 10, 7, 'MINE BAY', 'danger'),
    ]),
    'salvager': (18, 30, [
        (7, 2, 4, 4, 'BRIDGE', 'room'), (8, 6, 2, 20, '', 'hall'), (2, 7, 6, 4, 'CRANES', 'room'),
        (10, 7, 6, 4, 'CRANES', 'room'), (2, 12, 14, 9, 'SALVAGE HOLD', 'key'), (2, 22, 4, 3, 'AIRLOCK', 'dock'),
        (11, 22, 5, 3, 'CREW', 'room'), (5, 25, 8, 4, 'ENGINES', 'danger'),
    ]),
    'tanker': (12, 46, [
        (4, 1, 4, 4, 'BRIDGE', 'room'), (5, 5, 2, 36, '', 'hall'), (1, 6, 4, 3, 'CREW', 'room'),
        (7, 6, 4, 3, 'AIRLOCK', 'dock'), (1, 10, 10, 8, 'TANK', 'key'), (1, 20, 10, 8, 'TANK', 'key'),
        (1, 30, 10, 8, 'TANK', 'key'), (2, 40, 8, 5, 'PUMPS', 'danger'),
    ]),
}
SHORT = {'AIRLOCK': 'LOCK', 'SECURITY': 'SEC', 'WORKSHOP': 'SHOP', 'STRONGROOM': 'VAULT', 'SALVAGE HOLD': 'HOLD'}
KIND = {'hall': '#2c2d3b', 'room': '#3a3d4e', 'key': '#7a4a22', 'dock': '#2c6f8a', 'danger': '#8a2f2a'}


def plan(name):
    cols, rows, rooms = PLANS[name]
    T = 8
    im = Image.new('RGBA', (cols * T + 2, rows * T + 2), S.rgb(S.BG) + (255,))
    d = ImageDraw.Draw(im)
    for x, y, w, h, label, kind in rooms:
        d.rectangle([x * T, y * T, (x + w) * T, (y + h) * T], fill=KIND[kind], outline=S.STEEL[1])
    for x, y, w, h, label, kind in rooms:
        if not label:
            continue
        cx, cy = (x + w / 2) * T, (y + h / 2) * T - 3
        if S.tw(label) > w * T - 2:
            label = SHORT.get(label, label.split(' ')[0])
        S.txt(d, round(cx), round(cy), label, S.STEEL[3] if kind != 'key' else S.OCHRE[3], 'c')
    return im


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(S.OUT_DIR, 'ships')
    os.makedirs(out, exist_ok=True)
    for name, (draw, sides) in SHIPS.items():
        for side, colours in sides:
            draw(colours).save(os.path.join(out, f'{name}-{side}.png'), optimize=True)
        if name in PLANS:
            p = plan(name)
            p.resize((p.width * 2, p.height * 2), Image.NEAREST).save(os.path.join(out, f'{name}-plan.png'), optimize=True)
    # All of them in a row at the size they have in the game, with the frigate and the ships of today for size.
    game = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'assets', 'sprites')
    row = [Image.open(os.path.join(game, n + '.png')).convert('RGBA') for n in ('frigate', 'fighter', 'interceptor', 'gunboat', 'freighter')]
    row += [SHIPS[n][0](SHIPS[n][1][0][1]) for n in SHIPS]
    W = sum(i.width for i in row) + 10 * (len(row) + 1)
    H = max(i.height for i in row) + 10
    line = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,))
    x = 10
    for i in row:
        line.alpha_composite(i, (x, H - 5 - i.height))
        x += i.width + 10
    line.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, 'lineup.png'), optimize=True)
    print('wrote', len(os.listdir(out)), 'pictures to', out)
