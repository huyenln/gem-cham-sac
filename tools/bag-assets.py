#!/usr/bin/env python3
"""The bags for the design table (Bàn thiết kế -> Túi, Túi laptop).

    python3 tools/bag-assets.py <folder with the paintings>
    python3 tools/bag-assets.py --pencil <folder with the drawings> [name …]

--pencil (10/2026): the bags redrawn by Anna in ChatGPT in plain white
fabric, pencil lines and grey shading (the style of the cushion, origami and
Oxford), transparent background: tui-khoa, tui-no, tote, laptop, laptopq
(.png / .webp). The drawing is the shading; parts are polygons (PENCIL). The
bags listed there are skipped by the run below, which still makes the
triangle bag and the tie bag:

Two kinds of bag:

  painted   from Anna's paintings of Gem's own bags (14/10/2026), with a
            transparent background:
              tui-no.webp       bow-handle bag       (túi quai nơ, hoa hồng nền xanh)
              tui-khoa.webp     zipped shoulder bag  (túi đi chơi, jeans vàng)
              tui-tamgiac.webp  triangle shoulder bag (túi đi chơi, đỏ – đen)
              laptop.webp       laptop sleeve        (túi đựng laptop)
  drawn     made here from a few curves, upright and flat (a tote photo or
            painting sags with the cloth; the design shows the bag as made):
              tuitote           tote, one handle arch (front and back handles
                                line up), box-X stitched tabs
              tuibuoc-<style>   tie shoulder bag: two points tied on the shoulder,
                                plain straps knotted (thuong), a bow (no), a
                                ruffled strap (xoan) or plain straps edged
                                with lace (ren)
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
    if name == 'tui-no':
        # the bow and its two tails above the body; the beige inside that
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


def drawn(name, src=None, style='no'):
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
    elif name == 'tuibuoc':
        # the tie shoulder bag (a pattern Anna liked, 14/10/2026): a round
        # body with two points rising from a scooped mouth; a strap from each
        # point, tied in a bow on the shoulder. Front view, as made.
        def side(m):   # the left half, mirrored for the right (m = -1)
            X = lambda x: 170 + m * (170 - x)
            pts = cubic((170, 324), (128, 326), (96, 318), (84, 300)) + \
                cubic((84, 300), (72, 282), (72, 256), (78, 232))[1:] + \
                cubic((78, 232), (84, 196), (108, 156), (120, 128))[1:] + \
                cubic((120, 128), (121, 120), (122, 114), (125, 110))[1:] + [(141, 110)] + \
                cubic((141, 110), (146, 118), (149, 130), (151, 142))[1:] + \
                cubic((151, 142), (155, 162), (161, 174), (170, 176))[1:]
            return [(X(x), y) for x, y in pts]
        left = side(1)
        body = left + side(-1)[::-1]
        # the straps from each point, and how they meet on the shoulder
        # (style): plain straps knotted (thuong, in the price), a bow, a
        # ruffled strap over the shoulder (xoan), or the plain straps with lace
        # sewn along their edges (ren; the lace is drawn as is, cream)
        def loop(cx, cy, rx, ry, rot):
            r = math.radians(rot)
            return [(cx + rx * math.cos(t) * math.cos(r) - ry * math.sin(t) * math.sin(r),
                     cy + rx * math.cos(t) * math.sin(r) + ry * math.sin(t) * math.cos(r))
                    for t in [k * math.pi / 18 for k in range(36)]]
        mirror = lambda q: [(340 - x, y) for x, y in q]
        tie_l = [(125, 112), (161, 52), (171, 58), (141, 112)]
        if style == 'no':
            tail_l = [(164, 50), (146, 76), (154, 80), (170, 54)]
            ties = [tie_l, mirror(tie_l), tail_l, mirror(tail_l), loop(147, 42, 21, 11, -12), loop(193, 42, 21, 11, 12),
                    [(162, 36), (178, 36), (179, 52), (161, 52)]]
            folds = [[(158, 40), (182, 40)], [(158, 47), (182, 47)]]
        elif style in ('thuong', 'ren'):   # ren: the same plain straps, lace sewn along both edges
            tail_l = [(163, 44), (149, 22), (157, 18), (170, 40)]
            ties = [tie_l, mirror(tie_l), tail_l, mirror(tail_l), [(161, 40), (179, 40), (181, 57), (159, 57)]]
            folds = [[(160, 48), (180, 48)]]
        else:   # xoan: a ruffled strap (fabric gathered on a narrow band), one
            # arch from point to point over the shoulder, knotted at each point
            mid = cubic((133, 112), (126, 40), (150, 24), (170, 24)) + cubic((170, 24), (190, 24), (214, 40), (207, 112))[1:]
            # even steps along the arch
            seg = [0.0]
            for (x0, y0), (x1, y1) in zip(mid, mid[1:]):
                seg.append(seg[-1] + math.hypot(x1 - x0, y1 - y0))
            L, n = seg[-1], 160
            pts, j = [], 0
            for i in range(n + 1):
                d = L * i / n
                while j < len(seg) - 2 and seg[j + 1] < d:
                    j += 1
                t = (d - seg[j]) / max(seg[j + 1] - seg[j], 1e-6)
                (x0, y0), (x1, y1) = mid[j], mid[j + 1]
                nx, ny = -(y1 - y0), x1 - x0
                ln = math.hypot(nx, ny) or 1
                pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, nx / ln, ny / ln, d))
            # big soft frills either side of a narrow band (a pinch every 9)
            bump = lambda d, ph: 6 + 8 * abs(math.sin(d * math.pi / 9 + ph)) ** 0.7
            outer = [(x + nx * bump(d, 0), y + ny * bump(d, 0)) for x, y, nx, ny, d in pts]
            inner = [(x - nx * bump(d, 1.4), y - ny * bump(d, 1.4)) for x, y, nx, ny, d in pts]
            ruffle = outer + inner[::-1]
            knots = [loop(133, 116, 9, 7, 20), loop(207, 116, 9, 7, -20)]
            ties = [ruffle] + knots
            # the gathers: short folds across the band at each pinch
            folds = []
            for x, y, nx, ny, d in pts[2:-2]:
                if abs(math.sin(d * math.pi / 9)) < 0.12:                    # at each pinch
                    folds.append([(x - nx * 5, y - ny * 5), (x + nx * 12, y + ny * 12)])
        fill(A, body)
        for q in ties:
            fill(A, q)
        parts['quai'] = ''.join(path(q) for q in ties)
        for f in folds:
            line(marks, f, 120 if style == 'xoan' else 90, 1.1 if style == 'xoan' else 1.0)
        if style == 'ren':
            # cream lace along both long edges of each strap, drawn as is over
            # the fabric: a band with little holes and a scalloped outer edge
            u = K * S2
            T = Image.new('RGBA', (SIDE * S2, SIDE * S2))
            band = canvas()
            scallops = []
            for q in (tie_l, mirror(tie_l)):
                cx, cy = sum(x for x, _ in q) / 4, sum(y for _, y in q) / 4
                for p0, p1 in ((q[0], q[1]), (q[2], q[3])):
                    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
                    L = math.hypot(dx, dy)
                    ux, uy = dx / L, dy / L
                    nx, ny = -uy, ux
                    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
                    if (mx - cx) * nx + (my - cy) * ny < 0:
                        nx, ny = -nx, -ny
                    # leave the knot and the bag's point clear
                    a0, a1 = 8, L - 4
                    e0 = (p0[0] + ux * a0, p0[1] + uy * a0)
                    e1 = (p0[0] + ux * a1, p0[1] + uy * a1)
                    fill(band, [e0, e1, (e1[0] + nx * 4.4, e1[1] + ny * 4.4), (e0[0] + nx * 4.4, e0[1] + ny * 4.4)])
                    t = a0
                    while t <= a1:
                        scallops.append((p0[0] + ux * t + nx * 4.6, p0[1] + uy * t + ny * 4.6))
                        t += 3.6
            lace = Image.new('RGBA', T.size, (251, 248, 241, 255))
            dl = ImageDraw.Draw(lace)
            for gy in range(0, 340, 2):                                      # the lace's holes
                for gx in range(0, 340, 2):
                    ox = 1 if (gy // 2) % 2 else 0
                    dl.ellipse([(gx + ox - 0.45) * u, (gy - 0.45) * u, (gx + ox + 0.45) * u, (gy + 0.45) * u], fill=(196, 180, 152, 255))
            T.paste(lace, (0, 0), band)
            dr = ImageDraw.Draw(T)
            for x, y in scallops:
                dr.ellipse([(x - 2.4) * u, (y - 2.4) * u, (x + 2.4) * u, (y + 2.4) * u],
                           fill=(251, 248, 241, 255), outline=(168, 150, 120, 255), width=max(1, int(0.35 * u)))
            T.paste(lace, (0, 0), band)                                      # the band over the scallops' inner halves
            top = T.resize((SIDE, SIDE), Image.LANCZOS)
        # topstitch round the mouth and the points, the side seam of the gusset
        inner = [(x + (6 if x < 170 else -6 if x > 170 else 0), y + 6) for x, y in left[-14:]]
        line(marks, inner, 110, 1.0, dash=(5, 4))
        line(marks, [(340 - x, y) for x, y in inner], 110, 1.0, dash=(5, 4))
        line(marks, [(x, y - 7) for x, y in cubic((96, 312), (128, 322), (212, 322), (244, 312))], 70, 1.2)
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


# ---------- pencil drawings (10/2026) ----------
# Anna's ChatGPT drawings of the bags in plain white fabric, pencil lines and
# grey shading, on a transparent background: the style of the cushion,
# origami and Oxford, so the drawing itself is the shading. Each part is a
# polygon in the 340 square, cut by the drawing's own outline: a strap stands
# free against the background, so a polygon only has to follow its joints.
# src: the file in the folder; box: the body (patch layouts); zip / snap:
# where an added zip runs and a snap sits.
PENCIL = {
    'tuikhoa': {'src': 'tui-khoa', 'snap': [170, 216], 'parts': {
        # the strap, its tabs and D-rings: everything above the bag, and the
        # two tabs sewn over its top corners
        'quai': [[[0, 0], [340, 0], [340, 161], [0, 161]],
                 [[49.5, 159], [61.5, 160], [57.5, 183.5], [45.5, 182]],
                 [[271.5, 159.5], [285, 158], [288.5, 182], [276.5, 183.5]]],
        'tui': [[[106.5, 222.5], [234, 222.5], [234.5, 296], [171, 324], [105.5, 295.5]]]}},
    'tuino': {'src': 'tui-no', 'parts': {
        # the whole handle in its own fabric: the knot, its two tails and both
        # straps down to the opening's corners, then out to the bag's sides a
        # little below (Anna 22/10: the straps took the body's stripes)
        'quai': [[[0, 0], [340, 0], [340, 126], [0, 126]],
                 [[0, 126], [134.5, 126], [134.5, 138.5], [126, 140], [121, 141], [120, 143], [123, 146],
                  [100, 148], [60, 151], [0, 153]],
                 [[208.5, 126], [340, 126], [340, 153], [280, 151], [240, 148], [225, 145], [225, 142],
                  [223, 140], [217, 140], [208.5, 138.5]]],
        # the inside seen through the opening: down to the front's top edge
        'lot': [[[134.5, 126], [208.5, 126], [208.5, 138.5], [217, 140], [223, 140], [225, 142], [220, 146], [214, 150],
                 [209, 155], [206, 161.3], [200, 165.8], [194, 169.6], [188, 172.3], [182, 173.8], [176, 174.5],
                 [170, 174.2], [164, 173], [158, 171.5], [152, 170], [146, 166.6], [140, 161.7], [134, 155],
                 [129, 149], [123, 146], [120, 143], [121, 141], [126, 140], [134.5, 138.5]]]}},
    'tuitote': {'src': 'tote', 'zip': [[124, 137], [216, 137]], 'snap': [170, 150], 'parts': {
        # the handle arch, down through the rim into its two box-X tabs
        'quai': [[[0, 0], [340, 0], [340, 127.5], [0, 127.5]],
                 [[103, 127], [123.8, 127], [123.8, 166.5], [103, 166.5]],
                 [[216, 127], [237, 127], [237, 166.5], [216, 166.5]]]}},
    'laptop': {'src': 'laptop', 'box': [15, 74, 338, 222], 'snap': [170, 92], 'parts': {
        'day': [[[0, 222], [340, 222], [340, 340], [0, 340]]]}},
    'laptopq': {'src': 'laptopq', 'box': [15, 100, 338, 252], 'snap': [170, 118], 'parts': {
        # the handle, its tabs and rings: above the zipped top (not the pull)
        'quai': [[[26, 0], [340, 0], [340, 100.5], [26, 100.5]],
                 [[76, 99], [100, 99], [99.5, 103.5], [76.5, 103.5]], [[240.5, 99], [264.5, 99], [264, 103.5], [241, 103.5]]],
        'day': [[[0, 252.5], [340, 252.5], [340, 340], [0, 340]]]}},
}
WEAVE = 0.35   # how much of the drawn linen's weave stays in the shading


def pencil_shade(sq):
    """The drawing's greys as the multiply layer. Its white brought to white;
    the weave of the drawn linen softened (it would print linen onto a satin
    or a floral); outlines, stitches, folds and puffs kept."""
    a = np.asarray(sq.getchannel('A')) > 128
    rgb = np.asarray(sq.convert('RGB')).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32) / 255
    n = np.clip(lum / np.percentile(lum[a], 92), 0, 1)
    base = blur(n, 2.2)
    d = n - base
    return np.clip(base + np.where(d < -0.1, d, d * WEAVE), 0, 1)


def pencil(folder, only=None):
    art = {}
    for out, cfg in PENCIL.items():
        if only and out not in only:
            continue
        sq = square(next(Path(folder).glob(cfg['src'] + '.*')))
        alpha = np.asarray(sq.getchannel('A')).copy()
        alpha[alpha < 24] = 0   # the faint fringe round the drawing
        a = alpha > 128
        parts = {}
        for k, polys in cfg['parts'].items():
            m = np.zeros_like(a)
            for p in polys:
                m |= poly_mask(p)
            parts[k] = m & a
        body = a.copy()
        for m in parts.values():
            body &= ~m
        art[out] = write(out, alpha, pencil_shade(sq), None, {k: to_path(m) for k, m in parts.items()}, body)
        if 'box' in cfg:
            art[out]['box'] = cfg['box']
        for k in ('zip', 'snap'):
            if k in cfg:
                art[out][k] = cfg[k]
        top = OUT / f'mon-{out}-top.webp'
        if top.exists():
            top.unlink()   # the hardware is in the drawing now
    for k, v in art.items():
        print(k, json.dumps(v, ensure_ascii=False))


def main(folder):
    art = {}
    src = {}
    for name in ['tui-no', 'tui-khoa', 'tui-tamgiac', 'laptop']:
        out = name.replace('-', '')
        if out in PENCIL:
            continue   # redrawn in pencil (--pencil)
        sq = square(Path(folder) / f'{name}.webp')
        src[name] = sq
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

    # the tie bag: one set of pictures per way of tying it on the shoulder
    for name, style in [('tuitote', 'no')] + [('tuibuoc', t) for t in ('no', 'thuong', 'xoan', 'ren')]:
        if (name if name == 'tuitote' else f'{name}-{style}') in PENCIL:
            continue
        alpha, shade, parts, pmask, top = drawn(name, style=style)
        body = alpha > 128
        for m in pmask.values():
            body &= ~clean(m, 7)
        out = name if name == 'tuitote' else f'{name}-{style}'
        art[out] = write(out, alpha, shade, top, parts, body)

    if 'laptopq' in PENCIL:   # redrawn in pencil (--pencil)
        for k, v in art.items():
            print(k, json.dumps(v, ensure_ascii=False))
        return
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
    if len(sys.argv) >= 3 and sys.argv[1] == '--pencil':
        pencil(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        sys.exit(__doc__)
