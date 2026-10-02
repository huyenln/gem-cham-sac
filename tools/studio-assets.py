#!/usr/bin/env python3
"""Prepare Studio 2D images from the named source PNGs.

Not a build step: run it by hand whenever new art arrives, then commit the
WebP files it writes. Source PNGs stay in Drive (D-assets), not in the repo.

    python3 tools/studio-assets.py <source-folder>

Expects in <source-folder> (names from the "Bộ tài sản D" doc):
    bg-z1.png … bg-z5.png        five studio zones, 1536 x 1024
    ch-p1-sheet-b.png             character sheet: front, side, walk, cart
    any other *.png               copied through as WebP (ui-*, sh-*, ud-*, …)

Writes to images/studio/:
    bg/strip.webp                 the five zones joined into one strip
    char/p1-{front,side,walk,cart}.webp   cut-out frames, transparent
    <same name>.webp              ui-*, sh-*, ud-* resized to max 1600 px

ZONES below says which part of each zone is new (the left third of zones 2–5
repeats the previous zone, so it is cut off). js/studio.js reads the same
numbers from STRIP in its scene config — change both together.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images' / 'studio'

# [x0, x1] of each zone image kept in the strip, in source pixels (1536 wide).
ZONES = [
    ('bg-z1.png', 0, 1536),
    ('bg-z2.png', 668, 1536),
    ('bg-z3.png', 755, 1536),
    ('bg-z4.png', 740, 1536),
    ('bg-z5.png', 440, 1536),
]
BLEND = 64        # px of cross-fade at every join
# Zones whose painted floor doesn't match the others: from row y down, the
# floor is replaced by a clean, empty band of floor (rows y0–y1 of another
# zone), stretched to fit and blended in over 24 px.
FLOOR_FIX = {'bg-z5.png': (735, 'bg-z3.png', 830, 1024)}
HEIGHT = 1024


def save_webp(img, path, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  '
          f'{path.stat().st_size // 1024} KB')


def build_strip(src):
    parts = []
    for name, x0, x1 in ZONES:
        im = Image.open(src / name).convert('RGB')
        if im.height != HEIGHT:
            im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
        arr = np.asarray(im, dtype=np.float32).copy()
        if name in FLOOR_FIX:
            fy, donor_name, dy0, dy1 = FLOOR_FIX[name]
            band = Image.open(src / donor_name).convert('RGB').crop((0, dy0, 1536, dy1))
            band = band.resize((arr.shape[1], HEIGHT - fy), Image.LANCZOS)
            donor = np.zeros_like(arr)
            donor[fy:] = np.asarray(band, dtype=np.float32)
            ramp = np.linspace(0, 1, 24, dtype=np.float32)[:, None, None]
            arr[fy:fy + 24] = arr[fy:fy + 24] * (1 - ramp) + donor[fy:fy + 24] * ramp
            arr[fy + 24:] = donor[fy + 24:]
        parts.append(arr[:, x0:x1])

    width = sum(p.shape[1] for p in parts) - BLEND * (len(parts) - 1)
    strip = np.zeros((HEIGHT, width, 3), dtype=np.float32)
    offsets = []
    x = 0
    for i, p in enumerate(parts):
        w = p.shape[1]
        if i == 0:
            strip[:, x:x + w] = p
        else:
            ramp = np.linspace(0, 1, BLEND, dtype=np.float32)[None, :, None]
            strip[:, x:x + BLEND] = strip[:, x:x + BLEND] * (1 - ramp) + p[:, :BLEND] * ramp
            strip[:, x + BLEND:x + w] = p[:, BLEND:]
        offsets.append(x)
        x += w - BLEND

    img = Image.fromarray(strip.clip(0, 255).astype(np.uint8))
    save_webp(img, OUT / 'bg' / 'strip.webp', quality=80)
    # Numbers for STRIP in js/studio.js: where each zone's kept part starts.
    print('  STRIP =', json.dumps({
        'width': width, 'height': HEIGHT,
        'zones': [{'x': o, 'cropL': z[1]} for o, z in zip(offsets, ZONES)],
    }))


def cut_out(rgb, tol=26):
    """Transparent background for art painted on cream paper.

    Flood-fills from the image border through paper-coloured pixels only, so
    a cream shirt enclosed by ink lines stays opaque.
    """
    a = np.asarray(rgb, dtype=np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    paper = np.median(border, axis=0)
    near = np.abs(a - paper).max(axis=2) <= tol

    bg = np.zeros((h, w), dtype=bool)
    stack = [(y, x) for y in (0, h - 1) for x in range(w)] + \
            [(y, x) for x in (0, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if bg[y, x] or not near[y, x]:
            continue
        bg[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # Soften the one-pixel edge so watercolour rims don't look clipped.
    al = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8))
    out = rgb.convert('RGBA')
    out.putalpha(al)
    return out


def split_frames(sheet_rgba, min_gap=12):
    """Split a sprite sheet into frames at empty columns.

    Only the upper 85% of the figures is looked at: floor shadows and paint
    splatters under the feet often touch each other and would merge frames.
    """
    alpha = np.asarray(sheet_rgba)[:, :, 3]
    rows = np.where((alpha > 40).sum(axis=1) > 3)[0]
    top, bottom = rows.min(), rows.max()
    body = alpha[top:top + int((bottom - top) * 0.85)]
    cols = (body > 40).sum(axis=0) > 3
    frames, start, gap = [], None, 0
    for x, on in enumerate(cols):
        if on:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                frames.append((start, x - gap + 1))
                start, gap = None, 0
    if start is not None:
        frames.append((start, len(cols)))
    return [f for f in frames if f[1] - f[0] > 60]


def build_character(src):
    sheet = Image.open(src / 'ch-p1-sheet-b.png').convert('RGB')
    cut = cut_out(sheet)
    boxes = split_frames(cut)
    names = ['front', 'side', 'walk', 'cart']
    if len(boxes) != 4:
        print(f'  ! expected 4 frames, found {len(boxes)}: {boxes}')
    alpha = np.asarray(cut)[:, :, 3]
    rows = np.where((alpha > 40).sum(axis=1) > 3)[0]
    top, bottom = int(rows.min()), int(rows.max()) + 1
    for name, (x0, x1) in zip(names, boxes):
        # Same top/bottom for every frame, so feet line up when frames swap.
        frame = cut.crop((max(0, x0 - 6), top, min(cut.width, x1 + 6), bottom))
        save_webp(frame, OUT / 'char' / f'p1-{name}.webp', quality=86)


# Kept in Drive only: not shown on the site, so not worth the repo weight.
SKIP = {'ref-style.png', 'ch-p1-sheet-a.png', 'ch-p1-sheet-b.png'}


def copy_rest(src):
    used = {z[0] for z in ZONES} | SKIP
    for p in sorted(src.glob('*.png')):
        if p.name in used:
            continue
        im = Image.open(p).convert('RGB')
        im.thumbnail((1600, 1600), Image.LANCZOS)
        sub = {'ch': 'char', 'ud': 'udon', 'ui': 'ui', 'sh': 'ui',
               'ref': 'ref'}.get(p.stem.split('-')[0], '')
        save_webp(im, OUT / sub / (p.stem + '.webp'))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    print('strip:'); build_strip(src)
    print('character:'); build_character(src)
    print('other images:'); copy_rest(src)
