#!/usr/bin/env python3
"""Turn the painted art for the design table into web assets.

    python3 tools/design-assets.py <folder with the source PNGs>

Source names (as listed in the "Prompt vẽ cho Bàn thiết kế" prompt pack):

  vai-<tone>.png      3x3 swatch sheet, tone = xanh lam hong nau trung
                      -> images/studio/vai/vai-<tone>-<1..9>.webp (row by row,
                         order = GemPatch.KINDS: plain gingham stripes dots
                         ditsy lace big-floral small-check folk)
  vai-dang.png        3x3 plain linen scraps
                      -> images/studio/vai/dang-<1..9>.webp: grey shading with
                         the scrap's outline as alpha (mask + multiply layer)
  ro-truoc.png        the basket's front wall -> images/studio/vai/ro-truoc.webp
  mon-<piece>.png     plain linen piece (see PIECES)
                      -> images/studio/vai/mon-<piece>-bong.webp (shading, alpha)
                         images/studio/vai/mon-<piece>-mask.webp (white on black)
                         images/studio/vai/mon-<piece>-top.webp (rings, clasps:
                         drawn as painted over the fabric)
                      and prints where the fabric sits (box / centre) for js/patch.js
  ud-may.png, ud-reo.png, kim-chi.png -> images/studio/udon/ (cut out)
  mood-<id>.png       -> images/studio/vai/mood-<id>.webp (square, 240 px)
  the-khung.png       -> images/studio/vai/the-khung.webp (1080 x 1920)

Everything is cut out of a white paper background by a flood fill from the
edges (white inside an object stays). Needs Pillow + numpy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/studio/vai'
TONES = ['xanh', 'lam', 'hong', 'nau', 'trung']


def save(im, path, q=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB')


def background(rgb, tol=22):
    """True where the pixel is paper connected to the image edge."""
    a = np.asarray(rgb.convert('RGB')).astype(np.int16)
    near = (a.min(axis=2) > 255 - tol - 10) & ((a.max(axis=2) - a.min(axis=2)) < tol)
    h, w = near.shape
    seen = np.zeros_like(near)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if near[y, x]] + \
            [(y, x) for y in range(h) for x in (0, w - 1) if near[y, x]]
    for y, x in stack:
        seen[y, x] = True
    while stack:
        y, x = stack.pop()
        for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= yy < h and 0 <= xx < w and near[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True
                stack.append((yy, xx))
    return seen


def holes(rgb, bg, tol=16, min_px=300):
    """Paper showing through a hole (a basket handle, the middle of a
    scrunchie): near-white blobs the edge flood can't reach, if big enough
    not to be a highlight."""
    a = np.asarray(rgb.convert('RGB')).astype(np.int16)
    near = (a.min(axis=2) > 255 - tol - 8) & ((a.max(axis=2) - a.min(axis=2)) < tol) & ~bg
    h, w = near.shape
    seen = np.zeros_like(near)
    out = bg.copy()
    for y0 in range(h):
        for x0 in range(w):
            if not near[y0, x0] or seen[y0, x0]:
                continue
            seen[y0, x0] = True
            stack, blob = [(y0, x0)], []
            while stack:
                y, x = stack.pop()
                blob.append((y, x))
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and near[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
            if len(blob) >= min_px:
                ys, xs = zip(*blob)
                out[list(ys), list(xs)] = True
    return out


def cut(src, tol=22, open_holes=False):
    """RGBA with the paper removed and a soft edge, trimmed."""
    rgb = Image.open(src).convert('RGB')
    bg = background(rgb, tol)
    if open_holes:
        bg = holes(rgb, bg)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    im = rgb.convert('RGBA')
    im.putalpha(alpha)
    return im.crop(im.getbbox())


def fit(im, side):
    im = im.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    return im


def bands(profile, n):
    """The n longest runs of True in a 1-D profile (tiles between white gaps)."""
    runs, start = [], None
    for i, v in enumerate(list(profile) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i))
            start = None
    runs.sort(key=lambda r: r[1] - r[0], reverse=True)
    return sorted(runs[:n])


def swatches(src, tone):
    rgb = Image.open(src).convert('RGB')
    a = np.asarray(rgb).astype(np.int16)
    ink = a.min(axis=2) < 225
    cols = bands(ink.mean(axis=0) > 0.35, 3)
    rows = bands(ink.mean(axis=1) > 0.35, 3)
    k = 1
    for r0, r1 in rows:
        for c0, c1 in cols:
            # inset past the frayed edge, then square
            ix, iy = int((c1 - c0) * 0.06), int((r1 - r0) * 0.06)
            box = (c0 + ix, r0 + iy, c1 - ix, r1 - iy)
            tile = rgb.crop(box)
            s = min(tile.size)
            tile = tile.crop(((tile.size[0] - s) // 2, (tile.size[1] - s) // 2, (tile.size[0] + s) // 2, (tile.size[1] + s) // 2))
            save(tile.resize((320, 320), Image.LANCZOS), OUT / f'vai-{tone}-{k}.webp', q=80)
            k += 1


def shading(im, pct=80):
    """Grey multiply layer: the linen's own colour becomes white, shadows stay."""
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    alpha = np.asarray(im.getchannel('A')).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    ref = np.percentile(lum[alpha > 200], pct) if (alpha > 200).any() else 255
    g = np.clip(lum / ref, 0, 1) ** 1.15 * 255
    out = Image.fromarray(g.astype(np.uint8)).convert('RGBA')
    out.putalpha(im.getchannel('A'))
    return out


def largest(mask):
    """Only the biggest connected blob of a boolean mask."""
    h, w = mask.shape
    label = np.zeros((h, w), np.int32)
    best, best_n, n = 0, 0, 0
    for y0 in range(0, h, 3):
        for x0 in range(0, w, 3):
            if not mask[y0, x0] or label[y0, x0]:
                continue
            n += 1
            label[y0, x0] = n
            stack, size = [(y0, x0)], 0
            while stack:
                y, x = stack.pop()
                size += 1
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not label[yy, xx]:
                        label[yy, xx] = n
                        stack.append((yy, xx))
            if size > best_n:
                best, best_n = n, size
    return label == best


def scraps(src):
    rgb = Image.open(src).convert('RGB')
    bg = background(rgb, 26)
    w, h = rgb.size
    k = 1
    # the sheet is a 3x3 grid: take each cell's object on its own
    for r in range(3):
        for c in range(3):
            box = (c * w // 3, r * h // 3, (c + 1) * w // 3, (r + 1) * h // 3)
            cell = rgb.crop(box).convert('RGBA')
            keep = largest(~bg[box[1]:box[3], box[0]:box[2]])   # not the edge of a neighbour
            a = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
            cell.putalpha(a)
            cell = cell.crop(cell.getbbox())
            save(fit(shading(cell, 55), 260), OUT / f'dang-{k}.webp')
            k += 1


def metal(rgba, box):
    """Hardware (rings, clasps) inside box (fractions of the image): what
    isn't linen there. It is drawn as painted, on top of the fabric."""
    w, h = rgba.size
    x0, y0, x1, y1 = int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)
    hsv = np.asarray(rgba.convert('RGB').convert('HSV')).astype(np.float32) / 255
    a = np.asarray(rgba.getchannel('A')) > 128
    sat, val = hsv[..., 1], hsv[..., 2]
    linen = (sat > 0.10) & (sat < 0.42) & (val > 0.62)
    m = np.zeros(a.shape, bool)
    m[y0:y1, x0:x1] = (a & ~linen)[y0:y1, x0:x1]
    img = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    return np.asarray(img) > 128


def piece(src, name, median=0, open_holes=False, hw=None):
    im = cut(src, open_holes=open_holes)
    # square canvas, centred: the patches are laid out on the same square
    s = max(im.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    if hw:   # the box was given on the source image: move it onto the square
        ox, oy = (s - im.size[0]) / s, (s - im.size[1]) / s
        k0, k1 = im.size[0] / s, im.size[1] / s
        hw = (ox / 2 + hw[0] * k0, oy / 2 + hw[1] * k1, ox / 2 + hw[2] * k0, oy / 2 + hw[3] * k1)
    sq = fit(sq, 900)
    fab_alpha = np.asarray(sq.getchannel('A')).copy()
    if hw:
        m = metal(sq, hw)
        top = sq.copy()
        top.putalpha(Image.fromarray(np.where(m, fab_alpha, 0).astype(np.uint8)))
        save(top, OUT / f'mon-{name}-top.webp')
        fab_alpha[m] = 0
    shade = shading(sq)
    if median:   # seams of the drawing out; the page draws its own seams
        g = shade.convert('L').filter(ImageFilter.MedianFilter(median))
        shade = g.convert('RGBA')
    shade.putalpha(Image.fromarray(fab_alpha))
    save(shade, OUT / f'mon-{name}-bong.webp')
    mask = Image.fromarray(np.where(fab_alpha > 0, fab_alpha, 0).astype(np.uint8))
    save(mask.convert('RGB'), OUT / f'mon-{name}-mask.webp', q=70)
    # where the fabric is, in the page's 340-unit square (for patch layouts)
    ys, xs = np.nonzero(fab_alpha > 128)
    k = 340 / sq.size[0]
    print(f'    {name}: box [{xs.min() * k:.0f}, {ys.min() * k:.0f}, {xs.max() * k:.0f}, {ys.max() * k:.0f}]'
          f'  centre [{xs.mean() * k:.0f}, {ys.mean() * k:.0f}]')


# name, median filter (removes painted seams), open enclosed holes, hardware box
PIECES = [
    ('goi', 15, False, None), ('lotcoc', 0, False, None), ('scrunchie', 0, True, None),
    ('lotcocv', 0, False, None), ('bookmark', 0, False, None), ('oxford', 0, True, None),
    ('origami', 0, True, (0, 0, 0.32, 0.28)), ('bloom', 0, True, (0, 0, 1, 0.17)),
    ('daydeo', 0, True, (0, 0.69, 1, 1)),
]


def main(folder, only=None):
    src = Path(folder)
    if only == 'pieces':
        for name, med, hole, hw in PIECES[3:]:
            piece(src / f'mon-{name}.png', name, med, hole, hw)
        return
    if only == 'fix':   # just the pieces touched by a fix
        scraps(src / 'vai-dang.png')
        save(fit(cut(src / 'ro-truoc.png', open_holes=True), 1200), OUT / 'ro-truoc.webp')
        return piece(src / 'mon-scrunchie.png', 'scrunchie', 0, True)
    for t in TONES:
        if (src / f'vai-{t}.png').exists():
            swatches(src / f'vai-{t}.png', t)
    if (src / 'vai-dang.png').exists():
        scraps(src / 'vai-dang.png')
    if (src / 'ro-truoc.png').exists():
        save(fit(cut(src / 'ro-truoc.png', open_holes=True), 1200), OUT / 'ro-truoc.webp')
    for name, med, hole, hw in PIECES:
        if (src / f'mon-{name}.png').exists():
            piece(src / f'mon-{name}.png', name, med, hole, hw)
    for name in ('ud-may', 'ud-reo', 'kim-chi'):
        if (src / f'{name}.png').exists():
            save(fit(cut(src / f'{name}.png'), 700), ROOT / 'images/studio/udon' / f'{name}.webp')
    for f in sorted(src.glob('mood-*.png')):
        im = Image.open(f).convert('RGB')
        s = min(im.size)
        im = im.crop(((im.size[0] - s) // 2, (im.size[1] - s) // 2, (im.size[0] + s) // 2, (im.size[1] + s) // 2))
        save(im.resize((240, 240), Image.LANCZOS), OUT / f'{f.stem}.webp', q=78)
    if (src / 'the-khung.png').exists():
        save(Image.open(src / 'the-khung.png').convert('RGB').resize((1080, 1920), Image.LANCZOS), OUT / 'the-khung.webp', q=84)


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(*sys.argv[1:])
