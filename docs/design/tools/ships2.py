"""Design sheet for the new ship classes: the Freighter and the Juggernaut, two proposals each.

Usage: python3 ships2.py   (writes ../img/new-ships.png; needs Pillow and DejaVu Sans Bold)
All ships point up. Each proposal is drawn in the colours of the sides that would fly it.
"""
import os
from PIL import Image, ImageDraw
import style as S

TEAL = ['#2e6b5f', '#3f8f80', '#58b0a0', '#a0e0d0']
RUST = ['#4a2f26', '#6e4434', '#8f5d44', '#b98562']
# Colour sets: hull, darker hull, accent, glass, engine glow.
TRADER = dict(hull=S.STEEL, hull2=S.STEEL2, accent=S.OCHRE, glass=S.GLASS, glow=S.ION)
PATROL = dict(hull=S.STEEL, hull2=S.STEEL2, accent=TEAL, glass=S.GLASS, glow=S.ION)
PIRATE = dict(hull=S.PLUM, hull2=S.PLUM2, accent=S.BONE, glass=S.ACID, glow=S.EMBER)


def ramps(c, extra=None):
    r = {1: c['hull'], 2: c['hull2'], 3: c['accent'], 4: c['glass'], 5: S.DARK, 6: c['glow'], 'glassy': (4,), 'glow': (6,)}
    r.update(extra or {})
    return r


def freighter_a(c):
    """Spine hauler: a small crew module at the bow, a long spine with containers clamped to it, engines aft."""
    w, h, m = 64, 140, 32
    parts = [
        (2, 'r', [m - 3, 20, m, 116]),                                                  # spine
        (1, 'p', [(m, 2), (m - 6, 5), (m - 10, 13), (m - 10, 25), (m, 25)]),             # crew module
        (4, 'p', [(m, 6), (m - 4, 8), (m - 5, 14), (m, 15)]),                            # bridge glass
        (2, 'r', [m - 13, 16, m - 10, 23]),                                              # side thrusters
        (1, 'p', [(m, 112), (m - 12, 112), (m - 18, 118), (m - 18, 131), (m, 131)]),     # engine block
        (2, 'r', [m - 24, 110, m - 18, 128]),                                            # outrigger tank
        (5, 'r', [m - 16, 131, m - 10, 134]), (5, 'r', [m - 7, 131, m, 134]),            # nozzles
        (6, 'r', [m - 15, 135, m - 11, 136]), (6, 'r', [m - 6, 135, m, 136]),            # engine glow
        (3, 'r', [m - 1, 26, m, 108]),                                                   # accent stripe on the spine
    ]
    # Four rows of containers, in mixed colours, each held by a clamp.
    for row, mat in enumerate((7, 8, 7, 9)):
        y = 29 + row * 21
        parts += [(mat, 'r', [m - 21, y, m - 5, y + 17]), (5, 'r', [m - 5, y + 7, m - 3, y + 10])]

    def det(px, ln):
        for row in range(4):
            y = 29 + row * 21
            ln((m - 16, y + 2), (m - 16, y + 15), S.OUT); ln((m - 10, y + 2), (m - 10, y + 15), S.OUT)
            px([(m - 19, y + 3), (m - 7, y + 14)], S.STEEL[3])
        ln((m - 15, 116), (m - 3, 116), c['hull'][0]); ln((m - 15, 124), (m - 3, 124), c['hull'][0])
        px([(m - 12, 18), (m - 22, 113), (m - 22, 125)], c['accent'][2]); px([(m - 8, 20)], c['hull'][3])
    return S.sprite(w, h, parts, ramps(c, {7: RUST, 8: S.STEEL2, 9: TEAL}), det)


def freighter_b(c):
    """Bulk hauler: one wide hull with a blunt bow, cargo hatches along the back and two big engines."""
    w, h, m = 72, 128, 36
    parts = [
        (2, 'p', [(m, 14), (m - 14, 16), (m - 24, 28), (m - 26, 100), (m - 20, 112), (m, 112)]),   # outer hull
        (1, 'p', [(m, 4), (m - 9, 6), (m - 16, 16), (m - 18, 96), (m - 12, 108), (m, 108)]),       # raised deck
        (4, 'p', [(m, 8), (m - 6, 10), (m - 8, 17), (m, 19)]),                                     # bridge glass
        (5, 'r', [m - 13, 30, m, 46]), (5, 'r', [m - 13, 52, m, 68]), (5, 'r', [m - 13, 74, m, 90]),   # cargo hatches
        (3, 'r', [m - 24, 40, m - 23, 90]),                                                        # accent stripe
        (2, 'p', [(m - 24, 104), (m - 30, 108), (m - 30, 118), (m - 20, 118), (m - 20, 112)]),      # engine pods
        (5, 'r', [m - 29, 118, m - 21, 122]), (5, 'r', [m - 12, 112, m, 117]),                     # nozzles
        (6, 'r', [m - 28, 123, m - 22, 124]), (6, 'r', [m - 11, 118, m, 119]),                     # engine glow
    ]

    def det(px, ln):
        for y in (30, 52, 74):
            ln((m - 13, y + 8), (m - 1, y + 8), S.DARK[2]); ln((m - 7, y + 1), (m - 7, y + 15), S.DARK[2])
            px([(m - 11, y + 2), (m - 3, y + 13)], S.DARK[3])
        ln((m - 17, 26), (m - 1, 26), c['hull'][0]); ln((m - 17, 96), (m - 1, 96), c['hull'][0])
        ln((m - 21, 30), (m - 21, 98), c['hull2'][0])
        px([(m - 22, 34), (m - 22, 96), (m - 15, 22)], c['accent'][2]); px([(m - 10, 12)], c['hull'][3])
    return S.sprite(w, h, parts, ramps(c), det)


def juggernaut_a(c):
    """Armoured wedge: a long, layered prow, thick flank armour, gun decks on both sides and four engines."""
    w, h, m = 128, 196, 64
    parts = [
        (2, 'p', [(m - 14, 36), (m - 30, 52), (m - 40, 84), (m - 40, 150), (m - 30, 168), (m - 14, 168)]),   # flank armour
        (2, 'r', [m - 52, 92, m - 40, 132]),                                                               # gun deck sponson
        (1, 'p', [(m, 4), (m - 8, 8), (m - 18, 34), (m - 24, 70), (m - 26, 150), (m - 20, 176), (m, 180)]),  # core hull
        (2, 'p', [(m, 30), (m - 10, 34), (m - 14, 60), (m - 14, 120), (m, 124)]),                          # armoured spine
        (4, 'p', [(m, 62), (m - 6, 64), (m - 7, 74), (m, 77)]),                                            # bridge glass
        (5, 'e', [m - 50, 96, m - 42, 104]), (5, 'e', [m - 50, 118, m - 42, 126]),                         # sponson guns
        (5, 'e', [m - 34, 66, m - 26, 74]), (5, 'e', [m - 36, 142, m - 28, 150]),                          # flank guns
        (5, 'e', [m - 4, 38, m + 4, 46]), (5, 'e', [m - 4, 98, m + 4, 106]),                               # spinal guns
        (3, 'p', [(m - 30, 54), (m - 36, 72), (m - 34, 72), (m - 28, 56)]),                                # accent marks
        (3, 'r', [m - 39, 108, m - 38, 138]),
        (2, 'p', [(m, 172), (m - 24, 170), (m - 30, 176), (m - 30, 184), (m, 184)]),                       # engine block
        (5, 'r', [m - 28, 184, m - 18, 189]), (5, 'r', [m - 14, 184, m - 3, 189]),                         # nozzles
        (6, 'r', [m - 27, 190, m - 19, 192]), (6, 'r', [m - 13, 190, m - 4, 192]),                         # engine glow
    ]

    def det(px, ln):
        for y in (20, 48, 132, 150, 164): ln((m - 22 if y > 40 else m - 12, y), (m - 15 if 40 < y < 130 else m - 1, y), c['hull'][0])
        for y in (70, 96, 124, 150): ln((m - 39, y), (m - 27, y), c['hull2'][0])
        ln((m - 33, 60), (m - 33, 160), c['hull2'][0]); ln((m - 46, 94), (m - 46, 130), c['hull2'][0])
        px([(m - 20, 40), (m - 22, 90), (m - 22, 110), (m - 37, 88), (m - 37, 158), (m - 8, 28)], c['hull2'][3])
        px([(m - 51, 110), (m - 51, 114), (m - 2, 84), (m - 2, 90)], c['accent'][2])
    return S.sprite(w, h, parts, ramps(c), det)


def juggernaut_b(c):
    """Hammerhead: a broad armoured head with the heaviest guns, a narrow waist, and a wide engine section."""
    w, h, m = 136, 184, 68
    parts = [
        (2, 'p', [(m, 6), (m - 30, 8), (m - 48, 20), (m - 54, 44), (m - 48, 62), (m - 26, 70), (m, 70)]),    # hammerhead
        (1, 'p', [(m, 12), (m - 26, 14), (m - 40, 24), (m - 44, 42), (m - 38, 56), (m - 22, 62), (m, 62)]),   # head plating
        (1, 'p', [(m, 62), (m - 18, 62), (m - 20, 120), (m - 26, 132), (m, 132)]),                           # waist
        (2, 'r', [m - 10, 70, m, 124]),                                                                     # spine
        (2, 'p', [(m - 20, 76), (m - 30, 80), (m - 30, 112), (m - 20, 116)]),                               # waist armour
        (2, 'p', [(m, 126), (m - 30, 126), (m - 46, 138), (m - 46, 166), (m - 36, 172), (m, 172)]),          # engine section
        (1, 'p', [(m, 134), (m - 26, 134), (m - 38, 142), (m - 38, 162), (m - 30, 166), (m, 166)]),
        (4, 'p', [(m, 30), (m - 7, 32), (m - 8, 42), (m, 45)]),                                             # bridge glass
        (5, 'e', [m - 40, 28, m - 28, 40]), (5, 'e', [m - 24, 46, m - 14, 56]),                             # head guns
        (5, 'e', [m - 29, 90, m - 21, 98]), (5, 'e', [m - 36, 146, m - 26, 156]),                           # waist and stern guns
        (3, 'r', [m - 52, 34, m - 51, 52]), (3, 'r', [m - 45, 144, m - 44, 162]),                           # accent marks
        (5, 'r', [m - 42, 172, m - 32, 177]), (5, 'r', [m - 27, 172, m - 16, 177]), (5, 'r', [m - 11, 172, m, 177]),   # nozzles
        (6, 'r', [m - 41, 178, m - 33, 180]), (6, 'r', [m - 26, 178, m - 17, 180]), (6, 'r', [m - 10, 178, m, 180]),   # glow
    ]

    def det(px, ln):
        ln((m - 44, 42), (m - 1, 42), c['hull'][0]); ln((m - 26, 14), (m - 26, 60), c['hull'][0]); ln((m - 12, 16), (m - 12, 28), c['hull'][0])
        for y in (82, 96, 110): ln((m - 19, y), (m - 11, y), c['hull'][0])
        ln((m - 36, 150), (m - 1, 150), c['hull'][0]); ln((m - 20, 136), (m - 20, 164), c['hull'][0])
        px([(m - 46, 26), (m - 46, 56), (m - 16, 18), (m - 34, 140), (m - 34, 164), (m - 6, 138)], c['hull2'][3])
        px([(m - 4, 74), (m - 4, 100), (m - 4, 120)], c['accent'][2])
    return S.sprite(w, h, parts, ramps(c), det)


SCALE = 3
def sheet():
    game = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'assets', 'sprites')
    known = [(n, Image.open(os.path.join(game, n + '.png')).convert('RGBA')) for n in ('fighter', 'gunboat', 'frigate', 'cruiser')]
    rows = [
        ('FREIGHTER A  ·  SPINE HAULER', [('TRADER', freighter_a(TRADER)), ('PIRATE', freighter_a(PIRATE))]),
        ('FREIGHTER B  ·  BULK HAULER', [('TRADER', freighter_b(TRADER)), ('PIRATE', freighter_b(PIRATE))]),
        ('JUGGERNAUT A  ·  ARMOURED WEDGE', [('PATROL', juggernaut_a(PATROL)), ('PIRATE', juggernaut_a(PIRATE))]),
        ('JUGGERNAUT B  ·  HAMMERHEAD', [('PATROL', juggernaut_b(PATROL)), ('PIRATE', juggernaut_b(PIRATE))]),
    ]
    W, H = 640, 470
    im = Image.new('RGBA', (W, H), S.rgb(S.BG) + (255,)); d = ImageDraw.Draw(im)
    S.txt(d, 8, 6, 'NEW SHIP CLASSES  ·  TWO PROPOSALS EACH  ·  SAME SCALE AS THE SHIPS IN THE GAME', S.STEEL[3])
    # The ships already in the game, for size.
    x = 8
    S.txt(d, x, 22, 'IN THE GAME TODAY', S.STEEL[1])
    for name, sp in known:
        im.alpha_composite(sp, (x, 34 + 168 - sp.height)); S.txt(d, x + sp.width // 2, 34 + 172, name.upper(), S.STEEL[1], 'c'); x += sp.width + 10
    # The proposals: freighters on the top half, juggernauts below.
    x = 280
    for title, variants in rows[:2]:
        S.txt(d, x, 22, title, S.OCHRE[2])
        for label, sp in variants:
            im.alpha_composite(sp, (x, 34)); S.txt(d, x + sp.width // 2, 34 + sp.height + 4, label, S.STEEL[1], 'c'); x += sp.width + 8
        x += 16
    x = 8
    for title, variants in rows[2:]:
        S.txt(d, x, 232, title, S.OCHRE[2])
        for label, sp in variants:
            im.alpha_composite(sp, (x, 244)); S.txt(d, x + sp.width // 2, 244 + sp.height + 4, label, S.STEEL[1], 'c'); x += sp.width + 8
        x += 22
    out = im.resize((W * SCALE, H * SCALE), Image.NEAREST)
    out.save(os.path.join(S.OUT_DIR, 'new-ships.png'), optimize=True)
    return out


if __name__ == '__main__':
    print('wrote new-ships.png', sheet().size)
