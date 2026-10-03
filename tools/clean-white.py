#!/usr/bin/env python3
"""Remove leftover paper / white background inside cut-out studio pieces.

Some pieces kept a patch of the paper they were painted on: inside a frame
(the empty clothes rail), under furniture (the floor wash under the sewing
tables), or the whole square (the counter with Udon). This makes paper-white
pixels transparent when they touch the outside (the transparent area or the
image edge), plus any enclosed paper patch larger than ENCLOSED of the piece.

    python3 tools/clean-white.py [--loose] [--ink N] images/studio/props/ke-gia.webp [...]

Writes the files in place. Look at the result before committing: cream paint
(a jug, a lampshade) is close to paper, which is why this isn't run on
everything automatically.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

ENCLOSED = 0.015
INK = 0         # --ink N: ink lines, thickened by N px, stop the fill — for
                # white fur / paint the same colour as the paper (Udon)


LOOSE = False   # --loose: also the warm, shaded paper wash under a piece
                # (bottom quarter only: white fur / white paint above stays)


def paper(a):
    rgb = a[..., :3].astype(int)
    strict = (rgb.min(2) > 218) & (rgb.max(2) - rgb.min(2) < 34)
    if LOOSE:
        loose = (rgb.min(2) > 196) & (rgb.max(2) - rgb.min(2) < 52)
        loose[: int(a.shape[0] * 0.75)] = False
        strict |= loose
    return (a[..., 3] > 0) & strict


def flood(mask, seeds, depth=None):
    h, w = mask.shape
    out = np.zeros_like(mask)
    front = [tuple(p) for p in np.argwhere(seeds & mask)]
    for y, x in front:
        out[y, x] = True
    step = 0
    while front and (depth is None or step < depth):
        nxt = []
        for y, x in front:
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not out[yy, xx]:
                    out[yy, xx] = True
                    nxt.append((yy, xx))
        front = nxt
        step += 1
    return out


def blobs(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    sizes = [0]
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        c = 0
        while stack:
            y, x = stack.pop()
            c += 1
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
        sizes.append(c)
    return lab, np.array(sizes)


def clean(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).copy()
    p = paper(a)
    clear = a[..., 3] < 40
    edge = np.zeros_like(p)
    edge[0, :] = edge[-1, :] = True
    edge[:, 0] = edge[:, -1] = True
    near = clear | np.roll(clear, 1, 0) | np.roll(clear, -1, 0) | np.roll(clear, 1, 1) | np.roll(clear, -1, 1)
    if INK:
        ink = a[..., :3].astype(int).max(2) < 140
        wall = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * INK + 1))) > 0
        gone = flood(p & ~wall, edge | near)
        gone |= flood(p & ~ink, gone, depth=INK + 1)   # the rim along the lines, not past them
    else:
        gone = flood(p, edge | near)
    if not INK:   # with --ink, enclosed white is fur / paint, not paper
        lab, sizes = blobs(p & ~gone)
        big = np.nonzero(sizes > ENCLOSED * (a[..., 3] > 40).sum())[0]
        gone |= np.isin(lab, big[big > 0])
    alpha = np.where(gone, 0, a[..., 3]).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))   # eat the pale rim
    a[..., 3] = np.minimum(a[..., 3], alpha)
    ys, xs = np.nonzero(a[..., 3] > 20)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(a).save(path, 'WEBP', quality=84, method=6)
    print(f'  {path}  {gone.mean():.1%} cleared')


if __name__ == '__main__':
    args = sys.argv[1:]
    while args and args[0].startswith('--'):
        if args[0] == '--loose':
            LOOSE = True
        elif args[0] == '--ink':
            INK = int(args.pop(1))
        args = args[1:]
    for f in args:
        clean(f)
