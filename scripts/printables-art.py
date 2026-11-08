#!/usr/bin/env python3
"""printables-art.py. Raster helpers for scripts/build-printables.mjs.

Node (pdf-lib) lays out every page; this file does the three things that need a real
image library: turning a painting into black-on-white line art, composing the Open
Graph / Pinterest image for each printable, and building the review contact sheet.
It needs python3 with Pillow and numpy (both on this machine; `pip3 install pillow numpy`
elsewhere). ImageMagick is NOT installed here, which is why build-extras.mjs's recipe
could not be reused.

LINE ART: a "pencil sketch" colour-dodge (invert, blur, divide) was compared against
edge detection on three prints (bunny, butterflies, library). Edge detection lost the
bunny entirely; the dodge kept every subject. The median filter and the two-point
threshold after it are what turn the grey sketch into clean lines. Change by eye only.

  python3 scripts/printables-art.py lineart <src.jpg> <out.jpg>
  python3 scripts/printables-art.py square <src.jpg> <out.jpg> [size]
  python3 scripts/printables-art.py og <preview.jpg> <out.jpg> <title> <kicker>
  python3 scripts/printables-art.py contact <out.jpg> <label=preview.jpg> ...
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'assets', 'fonts')
SERIF = os.path.join(FONTS, 'CormorantGaramond.ttf')
SANS = os.path.join(FONTS, 'Lato-Regular.ttf')
CREAM = (0xFE, 0xF9, 0xF5)
RED = (0xB5, 0x22, 0x3E)
INK = (0x2C, 0x2C, 0x2C)
MUTED = (0x6B, 0x6B, 0x6B)


def lineart(src, out, width=1600):
    im = Image.open(src).convert('L')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    inv = ImageOps.invert(im)
    blur = inv.filter(ImageFilter.GaussianBlur(7))
    base = np.asarray(im).astype('float32')
    top = np.asarray(blur).astype('float32')
    sketch = np.clip(base * 255.0 / (255.0 - top + 1.0), 0, 255).astype('uint8')
    sk = Image.fromarray(sketch)
    sk = ImageOps.autocontrast(sk, cutoff=1)
    sk = sk.filter(ImageFilter.MedianFilter(3))
    # Two-point threshold: below `lo` is ink, above `hi` is paper, a short ramp between
    # keeps curves smooth instead of jagged.
    lo, hi = 140, 225
    lut = [0 if v < lo else 255 if v > hi else int((v - lo) * 255 / (hi - lo)) for v in range(256)]
    sk = sk.point(lut)
    sk.convert('RGB').save(out, quality=88, optimize=True)


def square(src, out, size=600):
    im = Image.open(src).convert('RGB')
    im = ImageOps.fit(im, (int(size), int(size)), Image.LANCZOS, centering=(0.5, 0.45))
    im.save(out, quality=86, optimize=True)


def font(path, size):
    return ImageFont.truetype(path, size)


def og(preview, out, title, kicker):
    # 1000 x 1500: Pinterest's 2:3, and Facebook/X crop the middle happily enough.
    W, H = 1000, 1500
    img = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(img)
    pv = Image.open(preview).convert('RGB')
    box_w, box_h = 760, 1020
    pv.thumbnail((box_w, box_h), Image.LANCZOS)
    x = (W - pv.width) // 2
    y = 300
    # soft shadow
    sh = Image.new('RGBA', (pv.width + 60, pv.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((30, 30, pv.width + 30, pv.height + 30), fill=(0, 0, 0, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    img.paste(sh, (x - 30, y - 18), sh)
    d.rectangle((x - 6, y - 6, x + pv.width + 6, y + pv.height + 6), fill=(255, 255, 255))
    img.paste(pv, (x, y))
    d = ImageDraw.Draw(img)
    f_k = font(SANS, 30)
    k = kicker.upper()
    kw = d.textlength(k, font=f_k)
    d.text(((W - kw) / 2, 92), k, font=f_k, fill=RED)
    size = 76
    while size > 40 and d.textlength(title, font=font(SERIF, size)) > W - 120:
        size -= 2
    f_t = font(SERIF, size)
    tw = d.textlength(title, font=f_t)
    d.text(((W - tw) / 2, 140), title, font=f_t, fill=INK)
    f_b = font(SERIF, 44)
    brand = 'Little Poppin'
    bw = d.textlength(brand, font=f_b)
    d.text(((W - bw) / 2, H - 140), brand, font=f_b, fill=RED)
    f_u = font(SANS, 24)
    u = 'littlepoppin.com/printables'
    uw = d.textlength(u, font=f_u)
    d.text(((W - uw) / 2, H - 80), u, font=f_u, fill=MUTED)
    img.save(out, quality=86, optimize=True)


def contact(out, pairs):
    cols = 6
    tw, th = 300, 372
    labelh = 46
    rows = (len(pairs) + cols - 1) // cols
    W = cols * (tw + 20) + 20
    H = 120 + rows * (th + labelh + 24)
    img = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(img)
    f_t = font(SERIF, 54)
    d.text((24, 28), f'Little Poppin free printables. {len(pairs)} PDFs', font=f_t, fill=INK)
    f_l = font(SANS, 17)
    for i, (label, pth) in enumerate(pairs):
        c, r = i % cols, i // cols
        x = 20 + c * (tw + 20)
        y = 120 + r * (th + labelh + 24)
        pv = Image.open(pth).convert('RGB')
        pv.thumbnail((tw, th), Image.LANCZOS)
        d.rectangle((x - 2, y - 2, x + pv.width + 2, y + pv.height + 2), outline=(220, 214, 208))
        img.paste(pv, (x, y))
        d.text((x, y + th + 8), label[:34], font=f_l, fill=INK)
    img.save(out, quality=82, optimize=True)


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    if cmd == 'lineart':
        lineart(*args)
    elif cmd == 'square':
        square(*args)
    elif cmd == 'og':
        og(*args)
    elif cmd == 'contact':
        contact(args[0], [a.split('=', 1) for a in args[1:]])
    else:
        sys.exit(f'unknown command {cmd}')
