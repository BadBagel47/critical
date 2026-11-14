"""Comparison of whole-sprite rotation and grid-redrawn rotation."""
import os
import style as S
from PIL import Image, ImageDraw
K = 5; angles = (0, 20, 45, 70); cell = 64*K
im = Image.new('RGBA', (len(angles)*cell + 40, 2*cell + 110), S.rgb(S.BG) + (255,))
big = S.PL.resize((48*K, 48*K), Image.NEAREST)
for i, a in enumerate(angles):
    hi = big.rotate(-a, resample=Image.BICUBIC, expand=True)
    lo = S.PL.rotate(-a, resample=Image.NEAREST, expand=True); lo = lo.resize((lo.width*K, lo.height*K), Image.NEAREST)
    for row, s in enumerate((hi, lo)):
        im.alpha_composite(s, (20 + i*cell + (cell - s.width)//2, 50 + row*(cell + 50) + (cell - s.height)//2))
lab = Image.new('RGBA', (im.width//3, im.height//3), (0, 0, 0, 0)); d = ImageDraw.Draw(lab)
S.txt(d, 8, 5, 'A.  HELA SKEPPET VRIDS  (DITT FÖRSLAG)', '#bfc2cd'); S.txt(d, 8, 5 + (cell + 50)//3, 'B.  OMRITAT I PIXELRUTNÄTET', '#bfc2cd')
im.alpha_composite(lab.resize(im.size, Image.NEAREST)); im.convert('RGB').save(os.path.join(S.OUT_DIR, 'rotation.png'), optimize=True)
