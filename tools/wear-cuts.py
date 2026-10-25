#!/usr/bin/env python3
"""Cut each bag "Mẫu" out of its product poster, for Góc thử đồ (Studio 2D).

The posters (images/products/vai-vun-tui-di-cho-*.webp, …-tui-di-choi-*.webp:
"BẠN ĐÃ CÓ … TÚI ĐI CHƠI?") show the bag already cut out, on the poster's
peach paper with a cream glow round it. This keeps the biggest piece that
isn't paper between the header and the title (the bag and its straps; the
words are apart from it), then peels the glow: off the edge, and the patches
of it caught between the straps. Small cream bits of a print stay.

    python3 tools/wear-cuts.py              → images/studio/wear/<sku>-<mẫu>.webp

Mẫu Gem has a drawing of (DRAWN, sent by Anna 25/10: the photo cut ate into
the knotted strap) are not cut: their drawing is the picture.

The migration (supabase/migrations/20261025_thu_do.sql) points each mẫu's
"cut" at its file. A new mẫu later: Admin → Sản phẩm → Sửa → the mẫu's
"Ảnh cắt nền" (Xoá nền trắng / a file), no need to run this again.
Look at the results before committing.
"""
import glob
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'images', 'products')
OUT = os.path.join(ROOT, 'images', 'studio', 'wear')
TOL = 22                      # how far from the poster's paper a pixel is the bag
BAND = (0.04, 0.84)           # between the header and the big title
GLOW = (240, 229, 173)        # the cream glow round the bag
MAX = 700                     # longest side of the result
# drawn by Gem (transparent PNGs, cropped + shrunk into images/studio/wear/)
DRAWN = {'tui-di-choi-hoa-xanh', 'tui-di-cho-caro-hong', 'tui-di-choi-jeans-hong', 'tui-di-choi-jeans-vang'}


def cut(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    H = a.shape[0]
    # the poster's paper: the median of its border
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    d = ndimage.uniform_filter(np.sqrt(((a - np.median(border, axis=0)) ** 2).sum(axis=2)), 3)
    fg = d > TOL
    band = np.zeros_like(fg)
    band[int(H * BAND[0]):int(H * BAND[1])] = True
    fg = ndimage.binary_opening(fg & band, iterations=1)
    lab, n = ndimage.label(fg)
    if not n:
        return None
    keep = lab == 1 + int(np.argmax(ndimage.sum(fg, lab, range(1, n + 1))))
    keep = ndimage.binary_closing(keep, iterations=2)
    # the glow: peeled off the edge…
    glow = np.sqrt(((a - np.array(GLOW)) ** 2).sum(axis=2)) < 42
    for _ in range(6):
        keep &= ~((keep & ~ndimage.binary_erosion(keep, iterations=2)) & glow)
    # …and its patches between the straps (reaching the edge, or big)
    gl, ng = ndimage.label(keep & glow)
    if ng:
        area = ndimage.sum(keep & glow, gl, range(1, ng + 1))
        rim = keep & ~ndimage.binary_erosion(keep, iterations=3)
        touch = ndimage.maximum(rim, gl, range(1, ng + 1))
        drop = 1 + np.where((area >= 400) | ((touch > 0) & (area >= 25)))[0]
        keep &= ~ndimage.binary_dilation(np.isin(gl, drop), iterations=1)
    keep = ndimage.binary_opening(keep, iterations=1)
    lab, n = ndimage.label(keep)
    if n > 1:
        sizes = ndimage.sum(keep, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.where(sizes > 0.02 * sizes.max())[0])
    keep = ndimage.binary_erosion(keep, iterations=1)
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy()
    out.putalpha(alpha)
    out = out.crop(out.getbbox())
    out.thumbnail((MAX, MAX))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(SRC, 'vai-vun-tui-di-ch*-*.webp'))):
        if path.endswith('-thumb.webp'):
            continue
        name = os.path.basename(path)[len('vai-vun-'):-len('.webp')]
        if name in DRAWN:
            print(name, 'drawn, kept')
            continue
        im = cut(path)
        if im is None:
            print('nothing found:', name)
            continue
        dst = os.path.join(OUT, name + '.webp')
        im.save(dst, 'WEBP', quality=86)
        print(name, im.size, os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main()
