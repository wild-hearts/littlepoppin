#!/usr/bin/env python3
"""build-mockups-pil.py. Framed-on-wall mockups without ImageMagick.

build-mockups.mjs needs `magick`, which is not on every machine. This makes the same
1000x1250 studio mockup (warm wall, black frame, white mat, soft shadow) with Pillow,
for every print in data/prints.json that has no mockup yet. Re-runnable; skips existing.
Usage: python3 scripts/build-mockups-pil.py [--force]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'images', 'mockups')
FORCE = '--force' in sys.argv
os.makedirs(OUT, exist_ok=True)

W, H = 1000, 1250
cat = json.load(open(os.path.join(REPO, 'data', 'prints.json')))
made = 0
for p in cat['prints']:
    slug = p['sku'].replace('print-', '', 1)
    out = os.path.join(OUT, slug + '.jpg')
    if os.path.exists(out) and not FORCE:
        continue
    src = os.path.join(REPO, p['preview'].lstrip('/'))
    if not os.path.exists(src):
        print('missing preview', src); continue
    art = Image.open(src).convert('RGB')
    # wall: warm off-white with a faint vignette
    wall = Image.new('RGB', (W, H), (236, 230, 223))
    vig = Image.new('L', (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * 0.3, -H * 0.3, W * 1.3, H * 1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220))
    wall = Image.composite(wall, Image.new('RGB', (W, H), (222, 215, 207)), vig)
    # frame geometry (print 4:5 inside a white mat inside a thin black frame)
    art_w, art_h = 480, 600
    mat, frame = 56, 14
    fw, fh = art_w + 2 * (mat + frame), art_h + 2 * (mat + frame)
    fx, fy = (W - fw) // 2, (H - fh) // 2
    # shadow
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([fx + 6, fy + 14, fx + fw + 6, fy + fh + 14], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    wall = Image.alpha_composite(wall.convert('RGBA'), sh).convert('RGB')
    d = ImageDraw.Draw(wall)
    d.rectangle([fx, fy, fx + fw, fy + fh], fill=(24, 24, 24))
    d.rectangle([fx + frame, fy + frame, fx + fw - frame, fy + fh - frame], fill=(250, 248, 244))
    art = art.resize((art_w, art_h), Image.LANCZOS)
    wall.paste(art, (fx + frame + mat, fy + frame + mat))
    wall.save(out, quality=86)
    made += 1
print(f'{made} mockups written to images/mockups/')
