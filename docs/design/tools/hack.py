"""Three sketches of how the Engineer could hack the code to a station's lock, one digit at a time (F-171).

Run: python3 docs/design/tools/hack.py
Writes docs/design/img/hack-sketches.png
"""
import math
import os
from PIL import Image, ImageDraw

S = 3
W, H = 250, 190
BG = (13, 13, 24)
PANEL = (20, 22, 40)
LINE = (58, 61, 78)
DIM = (93, 97, 116)
TEXT = (191, 194, 205)
OCHRE = (219, 164, 69)
ION = (79, 176, 200)
ACID = (150, 214, 110)

# A 3 x 5 pixel font for the digits and the letters A to C, enough for a sketch.
GLYPH = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '?': '111001011000010',
    'A': '111101111101101', 'B': '110101110101110', 'C': '111100100100111',
}


def glyph(d, ch, x, y, px, color):
    rows = GLYPH[ch]
    for i, bit in enumerate(rows):
        if bit == '1':
            gx, gy = x + (i % 3) * px, y + (i // 3) * px
            d.rectangle([gx * S, gy * S, (gx + px) * S - 1, (gy + px) * S - 1], fill=color)


def box(d, x, y, w, h, fill=PANEL, outline=LINE):
    d.rectangle([x * S, y * S, (x + w) * S, (y + h) * S], fill=fill, outline=outline, width=S // 2 or 1)


def code_row(d, ox, oy, known):
    # The four digits of the code: the ones that are found, and the ones that are still hidden.
    for i in range(4):
        x = ox + 55 + i * 36
        found = i < len(known)
        box(d, x, oy + 150, 28, 30, fill=(18, 30, 24) if found else PANEL, outline=ACID if found else LINE)
        glyph(d, known[i] if found else '?', x + 8, oy + 156, 4, ACID if found else DIM)


def frame(d, ox, oy, letter):
    box(d, ox + 6, oy + 6, W - 12, H - 12)
    glyph(d, letter, ox + 14, oy + 14, 3, OCHRE)


def sketch_a(d, ox, oy):
    # A: tune two dials until the Engineer's wave lies on top of the lock's wave. Each match gives a digit.
    frame(d, ox, oy, 'A')
    box(d, ox + 40, oy + 22, 190, 70, fill=(10, 16, 22), outline=ION)
    pts_t, pts_m = [], []
    for i in range(0, 186, 2):
        x = ox + 42 + i
        pts_t.append((x * S, (oy + 57 + math.sin(i * 0.09) * 22) * S))
        pts_m.append((x * S, (oy + 57 + math.sin(i * 0.075 + 0.6) * 15) * S))
    d.line(pts_t, fill=DIM, width=S)
    d.line(pts_m, fill=ION, width=S)
    for k, (name_x, turn) in enumerate([(70, 0.7), (170, -1.1)]):
        cx, cy = ox + name_x, oy + 120
        d.ellipse([(cx - 14) * S, (cy - 14) * S, (cx + 14) * S, (cy + 14) * S], fill=PANEL, outline=TEXT, width=S)
        d.line([cx * S, cy * S, (cx + math.sin(turn) * 12) * S, (cy - math.cos(turn) * 12) * S], fill=OCHRE, width=S)
    code_row(d, ox, oy, ['3'])


def sketch_b(d, ox, oy):
    # B: the same rings as on a pod. One ring is one digit, and its colour says which digit is being found.
    frame(d, ox, oy, 'B')
    cx, cy = ox + W / 2, oy + 82
    rings = [(54, OCHRE, True), (41, ION, False), (28, (168, 120, 200), False), (15, (110, 190, 170), False)]
    for i, (r, color, _) in enumerate(rings):
        done = i < 2
        active = i == 2
        c = ACID if done else color if active else tuple(int(v * 0.3) for v in color)
        d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], outline=c, width=7 * S)
        if active:
            d.arc([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], 200, 240, fill=(240, 246, 255), width=7 * S)
            a = math.radians(170)
            d.line([(cx + math.cos(a) * (r - 6)) * S, (cy + math.sin(a) * (r - 6)) * S,
                    (cx + math.cos(a) * (r + 1)) * S, (cy + math.sin(a) * (r + 1)) * S], fill=(255, 255, 255), width=2 * S)
    code_row(d, ox, oy, ['3', '6'])


def sketch_c(d, ox, oy):
    # C: a bar sweeps over six signals. The one that flickers out of step is the digit. Stop the bar on it.
    frame(d, ox, oy, 'C')
    for i in range(6):
        x = ox + 44 + i * 31
        odd = i == 4
        box(d, x, oy + 30, 24, 90, fill=(10, 16, 22), outline=LINE)
        for k in range(7):
            h = 6 + ((i * 7 + k * 5) % 9) if not odd else 3 + (k * 11) % 17
            y = oy + 36 + k * 12
            d.rectangle([(x + 4) * S, y * S, (x + 4 + h) * S, (y + 5) * S], fill=OCHRE if odd else DIM)
        glyph(d, str(i + 1), x + 9, oy + 124, 2, TEXT if not odd else OCHRE)
    bx = ox + 44 + 3 * 31 + 10
    d.rectangle([bx * S, (oy + 26) * S, (bx + 3) * S, (oy + 124) * S], fill=ION)
    code_row(d, ox, oy, ['3', '6', '1'])


def main():
    img = Image.new('RGB', (W * 3 * S, H * S), BG)
    d = ImageDraw.Draw(img)
    for k, draw in enumerate([sketch_a, sketch_b, sketch_c]):
        draw(d, k * W, 0)
    out = os.path.join(os.path.dirname(__file__), '..', 'img', 'hack-sketches.png')
    img.resize((W * 3 * 2, H * 2), Image.LANCZOS).save(out, optimize=True)
    print(out, (W * 3 * 2, H * 2))


if __name__ == '__main__':
    main()
