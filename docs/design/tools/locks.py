"""A sketch of the proposed pod lock (F-163): all rings on screen at once, opened from the outside in.

Run: python3 docs/design/tools/locks.py
Writes docs/design/img/dial-rings.png
"""
import math
import os
from PIL import Image, ImageDraw

S = 4  # drawn large and scaled down, for smooth edges
BG = (16, 18, 36)
PANEL = (21, 26, 54)
EDGE = (42, 49, 96)
GREEN = (150, 214, 110)
GREEN_DIM = (76, 154, 80)
WHITE = (240, 246, 255)
# The colour of each ring while it is locked, from the outside in, and of the middle.
RINGS = [(219, 164, 69), (79, 176, 200), (168, 120, 200)]
CORE = (150, 156, 176)
RADII = [62, 46, 30]
WIDTH = 9
CORE_R = 16


def dim(c, k=0.42):
    return tuple(int(v * k) for v in c)


def arc(d, cx, cy, r, w, a0, a1, color):
    # Angles are clockwise from straight up, as on the game's dial.
    box = [cx - r, cy - r, cx + r, cy + r]
    d.arc(box, math.degrees(a0) - 90, math.degrees(a1) - 90, fill=color, width=w)


def lock(d, cx, cy, done, needle, mark, width):
    d.ellipse([cx - 76 * S, cy - 76 * S, cx + 76 * S, cy + 76 * S], fill=PANEL, outline=EDGE, width=S)
    for i, r in enumerate(RADII):
        if i < done:
            color = GREEN
        elif i == done:
            color = dim(RINGS[i], 0.55)
        else:
            color = dim(RINGS[i], 0.3)
        arc(d, cx, cy, r * S, WIDTH * S, 0, 2 * math.pi, color)
        if i == done:
            # The mark to stop the needle in, and the needle, only on the ring that is being worked on.
            arc(d, cx, cy, r * S, WIDTH * S, mark - width / 2, mark + width / 2, RINGS[i])
            r0, r1 = (r - WIDTH / 2 - 2) * S, (r + WIDTH / 2 + 2) * S
            sx, sy = math.sin(needle), -math.cos(needle)
            d.line([cx + sx * r0, cy + sy * r0, cx + sx * r1, cy + sy * r1], fill=WHITE, width=2 * S)
    opened = done >= len(RADII)
    d.ellipse([cx - CORE_R * S, cy - CORE_R * S, cx + CORE_R * S, cy + CORE_R * S], fill=GREEN if opened else CORE)
    slot = (20, 60, 30) if opened else (40, 44, 60)
    if opened:  # turned a quarter: the slot stands up
        d.rectangle([cx - 1.5 * S, cy - CORE_R * S, cx + 1.5 * S, cy + CORE_R * S], fill=slot)
    else:
        d.rectangle([cx - CORE_R * S, cy - 1.5 * S, cx + CORE_R * S, cy + 1.5 * S], fill=slot)


def main():
    w, h, n = 176, 176, 4
    img = Image.new('RGB', (w * n * S, h * S), BG)
    d = ImageDraw.Draw(img)
    states = [(0, 0.5, 1.3, 0.95), (1, 3.6, 4.4, 0.74), (2, 2.2, 2.0, 0.58), (3, 0, 0, 0)]
    for k, (done, needle, mark, width) in enumerate(states):
        lock(d, (k * w + w / 2) * S, h / 2 * S, done, needle, mark, width)
    out = os.path.join(os.path.dirname(__file__), '..', 'img', 'dial-rings.png')
    img.resize((w * n * 2, h * 2), Image.LANCZOS).save(out, optimize=True)
    print(out, img.size)


if __name__ == '__main__':
    main()
