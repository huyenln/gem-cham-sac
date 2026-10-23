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
    python3 tools/design-assets.py --sang origami
                      -> images/studio/vai/mon-origami-sang.webp: the lit faces
                         of the folds, screened over the fabric (light())
  ud-may.png, ud-reo.png, kim-chi.png -> images/studio/udon/ (cut out)
  mood-<id>.png       -> images/studio/vai/mood-<id>.webp (square, 240 px)
  the-khung.png       -> images/studio/vai/the-khung.webp (1080 x 1920)

Everything is cut out of a white paper background by a flood fill from the
edges (white inside an object stays). White linen on white paper (FLAT: the
Bloom with one / two flowers) is told from the paper by its texture. Needs
Pillow + numpy (+ scipy for FLAT).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/studio/vai'
TONES = ['xanh', 'lam', 'hong', 'nau', 'trung']


def save(im, path, q=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB')


def flat_paper(rgb, with_sd=False):
    """White linen drawn on white paper (the Bloom with one / two flowers,
    ChatGPT 10/2026): near-white alone would eat the fabric. The paper is
    flat (no texture), the linen never is: paper = near-white where the
    7 px neighbourhood barely varies."""
    from scipy import ndimage as ndi
    a = np.asarray(rgb.convert('RGB')).astype(np.int16)
    L = np.asarray(rgb.convert('L')).astype(np.float32)
    m = ndi.uniform_filter(L, 7)
    sd = np.sqrt(np.maximum(ndi.uniform_filter(L * L, 7) - m * m, 0))
    paper = (a.min(axis=2) >= 248) & (sd < 3)
    return (paper, sd) if with_sd else paper


def background(rgb, tol=22, flat=False):
    """True where the pixel is paper connected to the image edge."""
    a = np.asarray(rgb.convert('RGB')).astype(np.int16)
    near = flat_paper(rgb) if flat else (a.min(axis=2) > 255 - tol - 10) & ((a.max(axis=2) - a.min(axis=2)) < tol)
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


def holes(rgb, bg, tol=16, min_px=300, flat=False):
    """Paper showing through a hole (a basket handle, the middle of a
    scrunchie): near-white blobs the edge flood can't reach, if big enough
    not to be a highlight."""
    a = np.asarray(rgb.convert('RGB')).astype(np.int16)
    if flat:
        # on white linen a lit fold is near-white too; paper through a hole
        # (the clasp's loop, the gap between two stems) is flatter still:
        # a blob counts if it is big and on average all but still
        from scipy import ndimage as ndi
        near, sd = flat_paper(rgb, True)
        lab, n = ndi.label(near & ~bg)
        idx = np.arange(1, n + 1)
        size, still = ndi.sum(np.ones_like(sd), lab, idx), ndi.mean(sd, lab, idx)
        keep = np.zeros(n + 1, bool)
        keep[1:] = (size >= 1000) & (still < 1.0)
        return bg | keep[lab]
    near = ((a.min(axis=2) > 255 - tol - 8) & ((a.max(axis=2) - a.min(axis=2)) < tol)) & ~bg
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


def cut(src, tol=22, open_holes=False, flat=False):
    """RGBA with the paper removed and a soft edge, trimmed."""
    rgb = Image.open(src).convert('RGB')
    bg = background(rgb, tol, flat)
    if open_holes:
        bg = holes(rgb, bg, flat=flat)
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


""" ---------- swatches that repeat with no seam (14/10/2026) ----------
The page tiles each swatch side by side (js/patch.js fabricPattern). A
painting's left edge doesn't meet its right edge, so a plain repeat shows a
seam; the old fix (mirrored copies) folded checks and stripes into
arrow shapes. Now each tile is made to meet itself: the copy rolled half a
tile (whose edges are its middle, so they meet) has its own middle seam
covered by the tile's middle, cut along a path where the two agree and
through the ground, not across a motif. Regular prints are first cropped
to whole repeats (scale kept) and rolled by whole repeats, so the two copies
line up and the cut is clean. Left-right first, then top-bottom on that
(the second cut wraps round so the first stays seamless)."""
KINDS = ['tron', 'caro', 'soc', 'cham', 'hoa', 'ren', 'hoato', 'ono', 'tho']
REGULAR = {'caro', 'soc', 'ono', 'tho', 'ren'}
LUMA = np.array([0.299, 0.587, 0.114])
# looked at one by one: lace bands that already meet themselves stay as
# painted; a floral whose flowers are half the tile can't be cut round, so
# its mirrored 2 x 2 block (half size) becomes the tile
KEEP = {'vai-hong-6'}
BAKE = {'vai-nau-7'}


def repeat(a, axis):
    """The print's repeat along an axis (pixels), if it has a clear one."""
    prof = (a @ LUMA).mean(axis=1 - axis)
    p = prof - prof.mean()
    n = len(p)
    if p.std() < 1.5:
        return None
    top = int(n * 0.55)
    ac = np.array([np.dot(p[:n - l], p[l:]) / (n - l) for l in range(top + 1)]) / p.var()
    peaks = [l for l in range(16, top) if ac[l] > ac[l - 1] and ac[l] >= ac[l + 1] and ac[l] > 0.5]
    if not peaks:
        return None
    best = max(ac[l] for l in peaks)
    return min(l for l in peaks if ac[l] >= 0.8 * best)


def shift_for(a, axis, F):
    """How far to roll: whole repeats when the print has a clear one, else
    where the rolled copy agrees best with the tile round the wrap line."""
    S = a.shape[axis]
    p = repeat(a, axis)
    lo, hi = F + 2, S - F - 2
    cands = sorted({c for k in range(1, S // p + 1) for c in range(int(k * p) - 3, int(k * p) + 4)
                    if lo <= c <= hi}) if p else []
    if not cands:
        cands = range(max(lo, S // 4), min(hi, 3 * S // 4) + 1)
    best, bs = None, S // 2
    for s in cands:
        b = np.roll(a, s, axis=axis)
        sl = [slice(None)] * 2
        sl[axis] = np.r_[s - F:s - 2, s + 2:s + F]
        d = np.abs(a[tuple(sl)] - b[tuple(sl)]).mean()
        if best is None or d < best:
            best, bs = d, s
    return bs


def vpath(D, cyclic=False):
    """Cheapest top-to-bottom path through D, one column per row, moving at
    most one column a row. cyclic: it ends within a column of where it began
    (it wraps round the tile)."""
    H, W = D.shape
    best, bp = None, None
    for x0 in (range(W) if cyclic else [None]):
        M = D[0].copy() if x0 is None else np.where(np.arange(W) == x0, D[0, x0], np.inf)
        back = np.zeros((H, W), dtype=int)
        for y in range(1, H):
            cand = np.stack([np.r_[np.inf, M[:-1]], M, np.r_[M[1:], np.inf]])
            k = cand.argmin(axis=0)
            M = D[y] + cand[k, np.arange(W)]
            back[y] = np.arange(W) + k - 1
        ends = range(W) if x0 is None else [x for x in (x0 - 1, x0, x0 + 1) if 0 <= x < W]
        x = min(ends, key=lambda e: M[e])
        if best is None or M[x] < best:
            path = [x]
            for y in range(H - 1, 0, -1):
                x = back[y, x]
                path.append(x)
            best, bp = M[path[0]], np.array(path[::-1])
    return bp


def patch_x(a, F, cyclic):
    """Left-right seamless; returns the tile, the roll and the cuts' cost."""
    s = shift_for(a, 1, F)
    b = np.roll(a, s, axis=1)
    ground = np.median(a.reshape(-1, 3), axis=0)
    feat = lambda x: np.abs(x - ground).sum(axis=2)
    diff = np.abs(a - b).sum(axis=2)
    D = diff + 0.6 * (feat(a) + feat(b))
    left = vpath(D[:, s - F:s - 1], cyclic) + (s - F)
    right = vpath(D[:, s + 1:s + F], cyclic) + (s + 1)
    out = b.copy()
    ys = np.arange(a.shape[0])
    for y in ys:
        out[y, left[y]:right[y] + 1] = a[y, left[y]:right[y] + 1]
    return out, (diff[ys, left].mean() + diff[ys, right].mean()) / 2


def regular(a):
    """Crop to whole repeats on each axis the print repeats along (stripes:
    across them only), keeping its scale: k repeats are sized so m fill the
    tile (k = m, or one repeat twice)."""
    S = a.shape[0]
    P = [repeat(a, 1), repeat(a, 0)]
    L = a @ LUMA
    px, py = L.mean(axis=0), L.mean(axis=1)
    if P[0] and px.std() < 0.25 * py.std():
        P[0] = None
    if P[1] and py.std() < 0.25 * px.std():
        P[1] = None
    if P == [None, None]:
        return a
    box, size, reps = [0, 0, S, S], [S, S], [1, 1]
    for ax, p in enumerate(P):
        if p:
            k = S // p
            m = 2 if k == 1 else k
            o = (S - k * p) // 2
            box[ax], box[ax + 2] = o, o + k * p
            size[ax] = int(round(S * k / m))
            reps[ax] = m // k
    t = Image.fromarray(np.clip(a, 0, 255).astype('uint8')).crop(tuple(box)).resize(tuple(size), Image.LANCZOS)
    full = Image.new('RGB', (size[0] * reps[0], size[1] * reps[1]))
    for i in range(reps[0]):
        for j in range(reps[1]):
            full.paste(t, (i * size[0], j * size[1]))
    return np.asarray(full.resize((S, S), Image.LANCZOS), dtype=float)


def seamless(im, kind, name=''):
    if name in KEEP:
        return im
    if name in BAKE:
        T = im.size[0]
        m = Image.new('RGB', (2 * T, 2 * T))
        for (x, y), f in (((0, 0), lambda i: i), ((T, 0), ImageOps.mirror), ((0, T), ImageOps.flip),
                          ((T, T), lambda i: ImageOps.flip(ImageOps.mirror(i)))):
            m.paste(f(im), (x, y))
        return m.resize((T, T), Image.LANCZOS)
    a = np.asarray(im.convert('RGB'), dtype=float)
    if kind in REGULAR:
        a = regular(a)
    best = None
    for F in (36, 48, 64, 80, 100):   # the band width that joins most cleanly
        a1, c1 = patch_x(a, F, cyclic=False)
        a2, c2 = patch_x(np.ascontiguousarray(a1.transpose(1, 0, 2)), F, cyclic=True)
        if best is None or c1 + c2 < best[0]:
            best = (c1 + c2, a2.transpose(1, 0, 2))
    return Image.fromarray(np.clip(best[1], 0, 255).astype('uint8'))


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
            tile = seamless(tile.resize((320, 320), Image.LANCZOS), KINDS[k - 1], f'vai-{tone}-{k}')
            save(tile, OUT / f'vai-{tone}-{k}.webp', q=80)
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


def collar_over_strap(path):
    """The Oxford bag's strap is sewn behind the collar (Anna 23/10, the real
    bags), but the painting drew it down over the back of the collar: there
    (x 145.5-190.5, y 91.5-113.5 of 340) the collar's back band is drawn
    again, mirrored from its own two sides and cross-faded in the middle, so
    the whole collar shows in its fabric (js/patch.js draws the strap first)."""
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    k = im.size[0] / 340
    X0, X1, Y0, Y1 = int(145.5 * k), int(np.ceil(190.5 * k)), int(91.5 * k), int(np.ceil(113.5 * k))
    out = a.copy()
    mid0, mid1 = 156 * k, 180 * k
    for x in range(X0, X1):
        t = np.clip((x - mid0) / (mid1 - mid0), 0, 1)
        out[Y0:Y1, x] = a[Y0:Y1, 2 * X0 - 1 - x] * (1 - t) + a[Y0:Y1, 2 * X1 - 1 - x] * t
    save(Image.fromarray(out.astype(np.uint8)), path)


def light(name, lo=0.8, span=0.17, blur=4):
    """mon-<name>-sang.webp from the piece's -bong: where the painting is
    lit (the faces of the folds), a light layer screened over the fabric.
    The multiply shading only darkens, which shows nothing on a dark fabric
    (Anna: "vải che luôn nếp gấp origami" on a dark green brocade); this
    lifts the lit faces so the folds read on any fabric. Grey = how much,
    alpha = the piece."""
    im = Image.open(OUT / f'mon-{name}-bong.webp').convert('RGBA')
    lum = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255
    g = np.clip((lum - lo) / span, 0, 1) ** 1.3
    out = Image.fromarray((g * 255).astype(np.uint8)).convert('RGBA')
    out.putalpha(im.getchannel('A'))
    save(out, OUT / f'mon-{name}-sang.webp')


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


def metal(rgba, box, flat=False):
    """Hardware (rings, clasps) inside box (fractions of the image): what
    isn't linen there. It is drawn as painted, on top of the fabric. On
    white linen (flat): the coloured parts (gold clasp, the beige wrap),
    their glints and outlines taken in."""
    w, h = rgba.size
    x0, y0, x1, y1 = int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)
    hsv = np.asarray(rgba.convert('RGB').convert('HSV')).astype(np.float32) / 255
    a = np.asarray(rgba.getchannel('A')) > 128
    sat, val = hsv[..., 1], hsv[..., 2]
    if flat:
        from scipy import ndimage as ndi
        m = np.zeros(a.shape, bool)
        m[y0:y1, x0:x1] = (a & (sat > 0.15))[y0:y1, x0:x1]
        m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=4))
        return ndi.binary_dilation(m, iterations=3) & a
    linen = (sat > 0.10) & (sat < 0.42) & (val > 0.62)
    m = np.zeros(a.shape, bool)
    m[y0:y1, x0:x1] = (a & ~linen)[y0:y1, x0:x1]
    img = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    return np.asarray(img) > 128


def piece(src, name, median=0, open_holes=False, hw=None):
    flat = name in FLAT
    im = cut(src, open_holes=open_holes, flat=flat)
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
        m = metal(sq, hw, flat)
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
    if name == 'oxford':
        collar_over_strap(OUT / f'mon-{name}-bong.webp')
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
    ('daydeo', 0, True, (0, 0.69, 1, 1)), ('bloom1', 0, True, (0, 0, 1, 0.17)), ('bloom2', 0, True, (0, 0, 1, 0.17)),
]
# white linen on white paper (flat_paper): the Bloom with one / two flowers
FLAT = {'bloom1', 'bloom2'}


def main(folder, only=None):
    if folder == '--sang':
        # the light layer of a piece already in the repo (js/patch.js ART sang)
        return light(only or 'origami')
    if folder == '--seamless':
        # swatches already in the repo, made before the seamless step: once
        # (running it again re-cuts a tile that already meets itself)
        for f in sorted(OUT.glob('vai-*-[1-9].webp')):
            save(seamless(Image.open(f).convert('RGB'), KINDS[int(f.stem[-1]) - 1], f.stem), f, q=80)
        return
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
