#!/usr/bin/env python3
"""The bags for the design table (Bàn thiết kế -> Túi, Túi laptop).

    python3 tools/bag-assets.py <folder with the paintings>

Two kinds of bag:

  painted   from Anna's paintings of Gem's own bags (14/10/2026), with a
            transparent background:
              tui-nut.webp      knotted-handle bag   (túi đi chơi, hoa hồng nền xanh)
              tui-khoa.webp     zipped shoulder bag  (túi đi chơi, jeans vàng)
              tui-tamgiac.webp  triangle shoulder bag (túi đi chơi, đỏ – đen)
              laptop.webp       laptop sleeve        (túi đựng laptop)
  drawn     made here from a few curves, upright and flat (a tote photo or
            painting sags with the cloth; the design shows the bag as made):
              tuitote           tote, one handle arch (front and back handles
                                line up), box-X stitched tabs
              tuidayrut         drawstring bucket bag with a shoulder strap
              tuibannguyet      half-moon shoulder bag, zipped
              laptopq           the laptop sleeve painting, smaller, with a
                                shoulder strap drawn over it

Outputs to images/studio/vai/:

  mon-<name>-mask.webp   white where fabric goes
  mon-<name>-bong.webp   grey shading, multiplied over the fabric
  mon-<name>-top.webp    zip / pull / cord drawn as is over the fabric

and prints, for js/patch.js (ART), the fabric box and each part (a piece in
a fabric of its own: handles, lining, middle panel, bottom band) as an SVG
path in the page's 340 square. Painted parts are found by where they are or
by their colour and traced; drawn parts are the curves themselves.
Needs Pillow + numpy.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/studio/vai'
SIDE = 900
K = SIDE / 340


def save(im, path, q=82):
    im.save(path, 'WEBP', quality=q, method=6)


def square(path):
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    s = max(im.size)
    sq = Image.new('RGBA', (s, s))
    sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    sq.thumbnail((SIDE, SIDE), Image.LANCZOS)
    return sq


def hsv(im):
    return np.asarray(im.convert('RGB').convert('HSV')).astype(np.float32) / 255


def clean(m, grow=3):
    """A part mask without specks, its edge slightly grown."""
    im = Image.fromarray((m * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    if grow:
        im = im.filter(ImageFilter.MaxFilter(grow))
    return np.asarray(im) > 128


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


# ---------- tracing a mask into an SVG path (340 square) ----------

def components(m):
    """Connected parts of a boolean mask (4-neighbours), biggest first."""
    lab = np.zeros(m.shape, np.int32)
    out, n = [], 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        n += 1
        stack, pts = [(y, x)], []
        lab[y, x] = n
        while stack:
            cy, cx = stack.pop()
            pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    stack.append((ny, nx))
        out.append(lab == n)
    return sorted(out, key=lambda c: -c.sum())


def trace(m):
    """The outer edge of one component (Moore neighbour tracing)."""
    ys, xs = np.nonzero(m)
    i = np.lexsort((xs, ys))[0]
    start = (ys[i], xs[i])
    nb = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    pts, cur, d = [start], start, 6
    for _ in range(20000):
        for k in range(8):
            j = (d + k) % 8
            ny, nx = cur[0] + nb[j][0], cur[1] + nb[j][1]
            if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx]:
                cur, d = (ny, nx), (j + 5) % 8
                break
        else:
            break
        if cur == start:
            break
        pts.append(cur)
    return [(x, y) for y, x in pts]


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    n = np.hypot(*ab)
    p = np.array(pts, float)
    if n < 1e-6:
        dist = np.hypot(*(p - a).T)
    else:
        dist = np.abs(ab[0] * (p[:, 1] - a[1]) - ab[1] * (p[:, 0] - a[0])) / n
    i = int(dist.argmax())
    if dist[i] <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)


def to_path(m, min_area=40):
    """A mask (SIDE square) -> 'M…Z M…Z' in the 340 square."""
    small = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((340, 340), Image.BILINEAR)) > 110
    d = []
    for c in components(small):
        if c.sum() < min_area:
            break
        pts = trace(c)
        if len(pts) > 8:
            half = len(pts) // 2   # a closed loop: simplify both halves
            pts = rdp(pts[:half + 1], 1.1)[:-1] + rdp(pts[half:] + [pts[0]], 1.1)[:-1]
        d.append('M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z')
    return ''.join(d)


def box340(m):
    ys, xs = np.nonzero(m)
    k = 340 / SIDE
    return [int(xs.min() * k), int(ys.min() * k), int(math.ceil(xs.max() * k)), int(math.ceil(ys.max() * k))]


# ---------- painted bags ----------

def first_rows(a):
    """The first opaque row of each column (the top edge)."""
    top = np.where(a.any(0), a.argmax(0), SIDE)
    return np.ones((SIDE, 1)) * top[None, :]


def poly_mask(pts):
    im = Image.new('L', (SIDE, SIDE))
    ImageDraw.Draw(im).polygon([(x * K, y * K) for x, y in pts], fill=255)
    return np.asarray(im) > 128


def parts_of(name, sq):
    a = np.asarray(sq.getchannel('A')) > 128
    h, s, v = [c for c in np.moveaxis(hsv(sq), -1, 0)]
    yy = np.arange(SIDE)[:, None] * np.ones((1, SIDE))
    xx = np.ones((SIDE, 1)) * np.arange(SIDE)[None, :]
    parts, top = {}, np.zeros_like(a)
    if name == 'tui-nut':
        # the knot and its two tails above the body; the beige inside that
        # shows where the bag folds open (traced by hand on the painting)
        parts['quai'] = a & (yy < 100 * K)
        parts['lot'] = a & poly_mask([[147, 156], [150, 166], [155, 180], [159, 196], [163, 210], [161, 218],
                                      [155, 214], [149, 204], [145, 192], [143, 180], [145, 166]])
    elif name == 'tui-khoa':
        w = a.sum(1)
        t = int(np.argmax(w > w.max() * 0.6))                       # top of the body
        tape = a & (h > 0.45) & (h < 0.75) & (s > 0.12) & (yy < t + 40 * K)   # the blue zip tape
        pull = a & (s < 0.25) & (v > 0.75) & (yy > t) & (yy < t + 80 * K) & (xx > 200 * K)   # the cream pull
        top = clean(tape | pull, 0)
        # the strap: above the bag's top edge, which runs down to the left
        edge = (220 - (xx / K - 93) * 17 / 142) * K
        parts['quai'] = a & (yy < edge - 2 * K) & ~top
        parts['tui'] = poly_mask([[137, 222], [208, 216], [210, 290], [173, 311], [138, 292]]) & a
    elif name == 'tui-tamgiac':
        w = a.sum(1)
        strap_end = int(np.argmax(w > w.max() * 0.22))              # where the triangle widens
        # the strap, and its dark inside faces running down to the opening;
        # the cream lining band; the black middle panel (by hand)
        faces = poly_mask([[139, 80], [148, 80], [147, 150], [146, 200], [141, 203], [134, 200], [134, 150]]) | \
            poly_mask([[171, 80], [180, 80], [188, 150], [191, 198], [187, 203], [183, 200], [178, 150]])
        parts['quai'] = a & ((yy < strap_end) | faces)
        low = [[128, 222], [145, 227], [160, 229], [176, 227], [193, 221]]
        parts['lot'] = a & poly_mask([[134, 203], [141, 204], [147, 199], [160, 196], [176, 197], [184, 203], [190, 205]] +
                                     low[::-1]) & ~parts['quai']
        parts['giua'] = a & poly_mask(low + [[196, 240], [200, 280], [205, 320], [206, 340], [122, 340], [122, 320],
                                            [125, 280], [127, 240]])
    elif name == 'laptop':
        near = yy < first_rows(a) + 4 * K
        top = clean(a & near & (s < 0.25) & (v > 0.7), 0)            # the cream zip along the top
        parts['day'] = a & (yy > 232 * K) & ~top
    return parts, top


def edge_light(alpha):
    """Darker towards the outline: the bag rounds away from the eye."""
    e = np.clip((blur(alpha.astype(np.float32), 7 * K / 2.6) - 0.5) * 2, 0, 1)
    return 0.8 + 0.2 * np.sqrt(e)


def seam_shade(parts, a):
    out = np.ones((SIDE, SIDE), np.float32)
    for m in parts.values():
        b = blur(m.astype(np.float32), 2.2)
        out *= 1 - 0.22 * (4 * b * (1 - b)) * a
    return out


def shade_painted(name, sq, parts):
    """The painting's light with its print blurred away, each part brought
    to white on its own (a black panel shades like a red one)."""
    rgb = np.asarray(sq.convert('RGB')).astype(np.float32)
    a = np.asarray(sq.getchannel('A')) > 128
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    lum = np.asarray(Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9))).astype(np.float32)
    rest = a.copy()
    for m in parts.values():
        rest &= ~m
    if name == 'laptop':
        # a flat sleeve: its painted stripes and binding would only leave
        # blotches, so just the edges and a little light from the top
        yy = np.arange(SIDE)[:, None] / SIDE
        return (1.0 - 0.08 * yy) * edge_light(a) * seam_shade(parts, a)
    soft = np.asarray(Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12))).astype(np.float32)
    out = np.ones_like(soft)
    for m in list(parts.values()) + [rest]:
        sel = m & a
        if sel.sum() < 50:
            continue
        ref = np.percentile(soft[sel], 85)
        out[sel] = np.clip(soft[sel] / max(ref, 1), 0.5, 1.05)
    out = 1 - (1 - np.clip(out, 0, 1)) * 0.85
    return out * edge_light(a) * seam_shade(parts, a)


def grey(shade, alpha):
    g = (np.clip(shade, 0, 1) ** 1.1 * 255).astype(np.uint8)
    im = Image.fromarray(g).convert('RGBA')
    im.putalpha(Image.fromarray(alpha))
    return im


# ---------- drawn bags ----------
S2 = 2   # drawn at twice the size, then halved (smooth edges)


def cubic(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return out


def arch(xl, xr, w, y_leg, y_top):
    """A strap rising from two legs (x of their outer edges, width w) to
    a round top: the outline as points, 340 square."""
    cx = (xl + xr) / 2
    o = [(xl, y_leg), (xl, y_leg - 20)] + cubic((xl, y_leg - 20), (xl, y_top + 40), (cx - (cx - xl) * 0.55, y_top), (cx, y_top))[1:] + \
        cubic((cx, y_top), (cx + (xr - cx) * 0.55, y_top), (xr, y_top + 40), (xr, y_leg - 20))[1:] + [(xr, y_leg)]
    il, ir, it = xl + w, xr - w, y_top + w
    i = [(ir, y_leg), (ir, y_leg - 20)] + cubic((ir, y_leg - 20), (ir, it + 34), (cx + (ir - cx) * 0.55, it), (cx, it))[1:] + \
        cubic((cx, it), (cx - (cx - il) * 0.55, it), (il, it + 34), (il, y_leg - 20))[1:] + [(il, y_leg)]
    return o + i


def rounded(x0, y0, x1, y1, r_top, r_bot, flare=0):
    """A box with round corners; flare widens the bottom (each side)."""
    pts = []
    def corner(cx, cy, r, a0):
        return [(cx + r * math.cos(math.radians(a0 + k * 10)), cy + r * math.sin(math.radians(a0 + k * 10))) for k in range(10)]
    pts += corner(x0 + r_top, y0 + r_top, r_top, 180)
    pts += corner(x1 - r_top, y0 + r_top, r_top, 270)
    pts += corner(x1 + flare - r_bot, y1 - r_bot, r_bot, 0)
    pts += corner(x0 - flare + r_bot, y1 - r_bot, r_bot, 90)
    return pts


def canvas():
    return Image.new('L', (SIDE * S2, SIDE * S2))


def fill(im, pts, v=255):
    ImageDraw.Draw(im).polygon([(x * K * S2, y * K * S2) for x, y in pts], fill=v)


def line(im, pts, v, w, dash=None):
    dr = ImageDraw.Draw(im)
    P = [(x * K * S2, y * K * S2) for x, y in pts]
    if not dash:
        dr.line(P, fill=v, width=int(w * K * S2), joint='curve')
        return
    on, off = dash
    for (ax, ay), (bx, by) in zip(P, P[1:]):
        L = math.hypot(bx - ax, by - ay)
        step = (on + off) * K * S2
        t = 0
        while t < L:
            t1 = min(L, t + on * K * S2)
            dr.line([(ax + (bx - ax) * t / L, ay + (by - ay) * t / L), (ax + (bx - ax) * t1 / L, ay + (by - ay) * t1 / L)],
                    fill=v, width=int(w * K * S2))
            t += step


def half(im):
    return np.asarray(im.resize((SIDE, SIDE), Image.LANCZOS)).astype(np.float32) / 255


def path(pts):
    pts = rdp([(round(x, 1), round(y, 1)) for x, y in pts], 0.25)
    return 'M' + 'L'.join(f'{x:g} {y:g}' for x, y in pts) + 'Z'


def drawn(name, src=None):
    """(alpha 0-255, shade, parts {id: path}, part masks, top RGBA | None)"""
    A, marks, lights = canvas(), canvas(), canvas()   # silhouette, stitch / fold marks, highlights
    top = None
    parts, pmask = {}, {}
    if name == 'tuitote':
        body = rounded(90, 150, 250, 328, 3, 12, flare=6)
        quai = arch(112, 228, 16, 178, 26)
        fill(A, body); fill(A, quai)
        parts['quai'] = path(quai)
        line(marks, [(92, 162), (248, 162)], 120, 1.1, dash=(5, 4))           # top hem
        for x in (112, 212):                                                 # box-X tabs
            b = [(x + 2, 154), (x + 14, 154), (x + 14, 174), (x + 2, 174), (x + 2, 154)]
            line(marks, b, 150, 1.0)
            line(marks, [(x + 2, 154), (x + 14, 174)], 150, 1.0)
            line(marks, [(x + 14, 154), (x + 2, 174)], 150, 1.0)
        line(marks, [(96, 150), (244, 150)], 70, 2)                          # the fold at the mouth
    elif name == 'tuidayrut':
        # body under a gathered top; the casing the cord runs in
        body = rounded(100, 132, 240, 322, 2, 34)
        ruffle = [(102, 132)] + [(102 + i * 2, 105 - 3.2 * abs(math.sin(i * math.pi / 8))) for i in range(69)] + [(238, 132)]
        casing = [(98, 118), (242, 118), (242, 140), (98, 140)]
        quai = arch(104, 236, 12, 124, 22)
        for p in (body, ruffle, casing, quai):
            fill(A, p)
        parts['quai'] = path(quai)
        parts['mieng'] = path(casing)
        for i in range(17):                                                  # gathers
            x = 106 + i * 8
            line(marks, [(x, 108), (x + 1, 118)], 90, 1.2)
            line(marks, [(x + 2, 141), (x + 3 + (i - 8) * 0.4, 196)], 40, 2.2)
        line(marks, [(100, 129), (240, 129)], 120, 0.9, dash=(4, 4))
        # the cord: out of the casing, two knotted ends hanging
        T = Image.new('RGBA', (SIDE * S2, SIDE * S2))
        dr = ImageDraw.Draw(T)
        rope, dark = (231, 220, 196, 255), (150, 130, 100, 255)
        for xs, xe in ((160, 150), (180, 192)):
            P = [(xs * K * S2, 132 * K * S2), (xe * K * S2, 186 * K * S2)]
            dr.line(P, fill=dark, width=int(5 * K * S2))
            dr.line(P, fill=rope, width=int(3.4 * K * S2))
            cx, cy, r = xe * K * S2, 190 * K * S2, 5 * K * S2
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rope, outline=dark, width=int(1 * K * S2))
        top = T.resize((SIDE, SIDE), Image.LANCZOS)
    elif name == 'tuibannguyet':
        # flat top, round bottom; zipped along the top
        bot = cubic((278, 150), (282, 270), (210, 312), (170, 312)) + cubic((170, 312), (130, 312), (58, 270), (62, 150))[1:]
        body = [(70, 140), (270, 140)] + bot
        quai = arch(74, 266, 14, 150, 18)
        fill(A, body); fill(A, quai)
        parts['quai'] = path(quai)
        line(marks, [(68, 156), (272, 156)], 110, 1.0, dash=(5, 4))
        T = Image.new('RGBA', (SIDE * S2, SIDE * S2))
        dr = ImageDraw.Draw(T)
        y0, y1 = 140 * K * S2, 148 * K * S2
        dr.rectangle([86 * K * S2, y0, 254 * K * S2, y1], fill=(92, 84, 72, 255))
        for i in range(84):                                                  # the teeth
            x = (88 + i * 2) * K * S2
            dr.line([(x, y0 + 1.5 * K * S2), (x, y1 - 1.5 * K * S2)], fill=(196, 186, 160, 255), width=int(0.8 * K * S2))
        px, py = 246 * K * S2, 150 * K * S2
        dr.rounded_rectangle([px - 3 * K * S2, py, px + 3 * K * S2, py + 16 * K * S2], radius=2 * K * S2,
                             fill=(196, 186, 160, 255), outline=(120, 110, 90, 255), width=int(0.8 * K * S2))
        top = T.resize((SIDE, SIDE), Image.LANCZOS)
    elif name == 'laptopq':
        # the sleeve painting, smaller and lower, and a strap above it
        f, ox, oy = 0.78, 37, 92
        im = src.resize((int(SIDE * f), int(SIDE * f)), Image.LANCZOS)
        sq = Image.new('RGBA', (SIDE, SIDE))
        sq.paste(im, (int(ox * K), int(oy * K)))
        quai = arch(58, 282, 13, 150, 14)
        return sq, quai
    alpha = (half(A) * 255).astype(np.uint8)
    a = alpha > 128
    for pid, d in parts.items():
        m = Image.new('L', (SIDE, SIDE))
        for sub in d.split('Z'):
            if not sub:
                continue
            pts = [tuple(map(float, q.split())) for q in sub[1:].split('L')]
            ImageDraw.Draw(m).polygon([(x * K, y * K) for x, y in pts], fill=255)
        pmask[pid] = np.asarray(m) > 128
    yy = np.arange(SIDE)[:, None] / SIDE
    shade = (1.0 - 0.07 * yy) * edge_light(a) * seam_shade(pmask, a) * (1 - 0.35 * half(marks))
    return alpha, shade, parts, pmask, top


def write(out, alpha, shade, top, parts, boxm):
    if top is not None:
        save(top, OUT / f'mon-{out}-top.webp')
    save(grey(shade, alpha), OUT / f'mon-{out}-bong.webp')
    save(Image.fromarray(alpha).convert('RGB'), OUT / f'mon-{out}-mask.webp', q=70)
    return {'n': out, 'box': box340(boxm), 'top': top is not None, 'parts': parts}


def main(folder):
    art = {}
    src = {}
    for name in ['tui-nut', 'tui-khoa', 'tui-tamgiac', 'laptop']:
        sq = square(Path(folder) / f'{name}.webp')
        src[name] = sq
        out = name.replace('-', '')
        parts, top = parts_of(name, sq)
        alpha = np.asarray(sq.getchannel('A')).copy()
        t = None
        if top.any():
            t = sq.copy()
            t.putalpha(Image.fromarray(np.where(top, alpha, 0).astype(np.uint8)))
            alpha[top] = 0
        a = alpha > 128
        parts = {k: m & a for k, m in parts.items()}
        shade = shade_painted(name, sq, parts)
        body = a.copy()
        for m in parts.values():
            body &= ~clean(m, 7)
        art[out] = write(out, alpha, shade, t, {k: to_path(m) for k, m in parts.items()}, body)

    for name in ['tuitote', 'tuidayrut', 'tuibannguyet']:
        alpha, shade, parts, pmask, top = drawn(name)
        body = alpha > 128
        for m in pmask.values():
            body &= ~clean(m, 7)
        art[name] = write(name, alpha, shade, top, parts, body)

    # the laptop sleeve with a strap: the painting's own outputs, smaller,
    # under a drawn strap
    sq, quai = drawn('laptopq', src['laptop'])
    f, ox, oy = 0.78, 37, 92
    def moved(path_):
        im = Image.open(path_)
        sm = im.resize((int(SIDE * f), int(SIDE * f)), Image.LANCZOS)
        c = Image.new(im.mode, (SIDE, SIDE))
        c.paste(sm, (int(ox * K), int(oy * K)))
        return c
    bong = moved(OUT / 'mon-laptop-bong.webp').convert('RGBA')
    mask = np.asarray(moved(OUT / 'mon-laptop-mask.webp').convert('L')).astype(np.float32)
    top = moved(OUT / 'mon-laptop-top.webp').convert('RGBA')
    S = canvas()
    fill(S, quai)
    strap = half(S)
    a = np.maximum(mask / 255, strap)
    # the strap: lit along its middle, a D-ring where it meets the sleeve
    sh = np.asarray(bong.convert('L')).astype(np.float32) / 255
    sh = np.where(strap > 0.5, (0.86 + 0.14 * blur(strap, 3)) * edge_light(strap > 0.5), sh)
    T = Image.new('RGBA', (SIDE * S2, SIDE * S2))
    dr = ImageDraw.Draw(T)
    for x in (64.5, 275.5):
        cx, cy, r = x * K * S2, 150 * K * S2, 7 * K * S2
        dr.arc([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=(150, 146, 136, 255), width=int(2.4 * K * S2))
        dr.line([(cx - r, cy), (cx + r, cy)], fill=(150, 146, 136, 255), width=int(2.4 * K * S2))
    ring = T.resize((SIDE, SIDE), Image.LANCZOS)
    top = Image.alpha_composite(top, ring)
    alpha = (a * 255).astype(np.uint8)
    lap = art['laptop']
    def move_path(d):
        out = []
        for sub in d.split('Z'):
            if not sub:
                continue
            pts = [tuple(map(float, q.split())) for q in sub[1:].split('L')]
            out.append('M' + 'L'.join(f'{round(ox + x * f, 1):g} {round(oy + y * f, 1):g}' for x, y in pts) + 'Z')
        return ''.join(out)
    body = (mask > 128)
    parts = {'quai': path(quai), 'day': move_path(lap['parts']['day'])}
    art['laptopq'] = write('laptopq', alpha, sh, top, parts, body)
    b = lap['box']   # the body: the sleeve's own, moved (not its bottom band)
    art['laptopq']['box'] = [round(ox + b[0] * f), round(oy + b[1] * f), round(ox + b[2] * f), round(oy + b[3] * f)]

    for k, v in art.items():
        print(k, json.dumps(v, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
