#!/usr/bin/env python3
"""Prepare Studio 2D images from the named source PNGs.

Not a build step: run it by hand whenever new art arrives, then commit the
WebP files it writes. Source PNGs stay in Drive (D-assets), not in the repo.

    python3 tools/studio-assets.py <source-folder>
    python3 tools/studio-assets.py --cast <folder with ch-pN-*.png>
    python3 tools/studio-assets.py --pieces <folder>   (names: see PIECES)
    python3 tools/studio-assets.py --batch <folder>    (sheet-/pr-/full- files)

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
BLEND_DEFAULT = 64   # px of cross-fade at every join (set 1)
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


# Second painted set (Oct 2026): five scenes, wall/floor line not quite at
# the same height in each, so every scene is nudged (SHIFT2, px, + = down)
# to put the skirting at ~y 820 before joining. Zone 3's cabinet is painted
# empty on purpose: js/studio.js stands real product photos on its shelves.
ZONES2 = [
    ('z1.png', 0, 1450),
    ('z2.png', 480, 1512),
    ('z3.png', 488, 1520),
    ('z4.png', 0, 1515),
    ('z5.png', 196, 1536),
]
SHIFT2 = {'z1.png': -15, 'z2.png': 20, 'z3.png': 20, 'z4.png': -20, 'z5.png': 20,
          'nen-z4.png': -20}
# Scenes are cut at plain wall and joined with a wall pillar (from the empty
# wall painting) instead of cross-fading: a fade ghosted one scene's
# furniture over the next (mirror over the pegboard, bench over the cabinet).
PILLAR2 = ('nen-z4.png', 340, 460)
SEAM2 = 4    # px of soft edge where a scene meets the pillar


def nudge(arr, dy):
    if dy > 0:      # move down: repeat the top rows (wall)
        return np.concatenate([np.repeat(arr[:1], dy, axis=0), arr[:-dy]])
    if dy < 0:      # move up: repeat the bottom rows (floor)
        return np.concatenate([arr[-dy:], np.repeat(arr[-1:], -dy, axis=0)])
    return arr


def build_strip(src, zones=None, shift=None, floor_fix=None, pillar=None, blend=None):
    zones = zones or ZONES
    shift = shift or {}
    floor_fix = FLOOR_FIX if floor_fix is None else floor_fix
    parts = []
    for name, x0, x1 in zones:
        im = Image.open(src / name).convert('RGB')
        if im.height != HEIGHT:
            im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
        arr = nudge(np.asarray(im, dtype=np.float32).copy(), shift.get(name, 0))
        if name in floor_fix:
            fy, donor_name, dy0, dy1 = floor_fix[name]
            band = Image.open(src / donor_name).convert('RGB').crop((0, dy0, 1536, dy1))
            band = band.resize((arr.shape[1], HEIGHT - fy), Image.LANCZOS)
            donor = np.zeros_like(arr)
            donor[fy:] = np.asarray(band, dtype=np.float32)
            ramp = np.linspace(0, 1, 24, dtype=np.float32)[:, None, None]
            arr[fy:fy + 24] = arr[fy:fy + 24] * (1 - ramp) + donor[fy:fy + 24] * ramp
            arr[fy + 24:] = donor[fy + 24:]
        if pillar and parts:
            pim = Image.open(src / pillar[0]).convert('RGB')
            if pim.height != HEIGHT:
                pim = pim.resize((round(pim.width * HEIGHT / pim.height), HEIGHT), Image.LANCZOS)
            parr = nudge(np.asarray(pim, dtype=np.float32).copy(), shift.get(pillar[0], 0))
            parts.append(parr[:, pillar[1]:pillar[2]])
        parts.append(arr[:, x0:x1])

    BLEND = BLEND_DEFAULT if blend is None else blend
    starts = []   # where each zone (not pillar) starts, for js/studio.js
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
    if pillar:          # every other part is a pillar
        offsets = offsets[::2]

    img = Image.fromarray(strip.clip(0, 255).astype(np.uint8))
    save_webp(img, OUT / 'bg' / 'strip.webp', quality=80)
    # Numbers for STRIP in js/studio.js: where each zone's kept part starts.
    print('  STRIP =', json.dumps({
        'width': width, 'height': HEIGHT,
        'zones': [{'x': o, 'cropL': z[1]} for o, z in zip(offsets, zones)],
    }))


def cut_out(rgb, tol=26, enclosed=0):
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

    # Paper trapped inside the figure (between a leg and the cart handle)
    # isn't reached from the border: drop enclosed blobs that are almost
    # exactly the paper colour. Cream shirts are darker than this, and tiny
    # highlights are skipped by the size limit.
    if enclosed:
        tight = (np.abs(a - paper).max(axis=2) <= 8) & ~bg
        seen = np.zeros_like(tight)
        for y0, x0 in zip(*np.nonzero(tight)):
            if seen[y0, x0]:
                continue
            blob, todo = [], [(y0, x0)]
            seen[y0, x0] = True
            while todo:
                y, x = todo.pop()
                blob.append((y, x))
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and tight[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        todo.append((yy, xx))
            if len(blob) >= enclosed:
                ys, xs = zip(*blob)
                bg[list(ys), list(xs)] = True

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


# ---------------------------------------------------------------------------
# Cast: four characters, three sheets each (1536 x 1024, light paper ground)
#   ch-pN-dung.png    standing: front, side, three-quarter
#   ch-pN-di.png      walking: 4 frames, facing right
#   ch-pN-day-xe.png  pushing the cart: 3 frames, facing right
# → char/pN-{front,side,q,walk1..4,cart1..3}.webp, every figure scaled to the
#   same height with the feet on the bottom edge, so frames and characters
#   swap without jumping. Prints each frame's anchor (where the body's centre
#   sits across the frame) for CAST in js/studio.js.
# ---------------------------------------------------------------------------
SHEETS = {'dung': ['front', 'side', 'q'], 'di': ['walk1', 'walk2', 'walk3', 'walk4'],
          'day-xe': ['cart1', 'cart2', 'cart3']}
FIG_H = 720   # px, head to feet, in every output frame


def frame_boxes(cut, want):
    """Frames as column ranges; widen the gap until the count is right."""
    for gap in (12, 20, 30, 45, 8, 5):
        boxes = split_frames(cut, min_gap=gap)
        if len(boxes) == want:
            return boxes
    # Frames touch (a cart nose against the next figure): cut at the
    # emptiest column near each even split instead.
    alpha = np.asarray(cut)[:, :, 3] > 40
    cols = alpha.sum(axis=0)
    on = np.where(cols > 3)[0]
    x0, x1 = int(on.min()), int(on.max()) + 1
    step = (x1 - x0) / want
    cuts = [x0]
    for i in range(1, want):
        c = x0 + step * i
        lo, hi = int(c - step * 0.3), int(c + step * 0.3)
        cuts.append(lo + int(np.argmin(cols[lo:hi])))
    cuts.append(x1)
    print(f'  (split {want} frames at the emptiest columns: {cuts[1:-1]})')
    return [(cuts[i], cuts[i + 1]) for i in range(want)]


def territories(alpha, boxes):
    """Grow body boxes to the full strip of sheet each figure owns.

    frame_boxes() finds figures from their upper body only, so a toe or heel
    reaching past the body was cut off. Each frame now runs from the
    emptiest column between it and its left neighbour to the emptiest one
    before its right neighbour (whole height counted), then is trimmed to
    what is actually painted.
    """
    cols = (alpha > 40).sum(axis=0)
    cuts = [0]
    for (_, a1), (b0, _) in zip(boxes, boxes[1:]):
        lo, hi = min(a1, b0), max(a1, b0) + 1
        cuts.append(lo + int(np.argmin(cols[lo:hi])))
    cuts.append(alpha.shape[1])
    return [(cuts[i], cuts[i + 1]) for i in range(len(boxes))]


def build_cast(src):
    anchors = {}
    for n in range(1, 10):
        if not (src / f'ch-p{n}-dung.png').exists():
            continue
        for sheet, names in SHEETS.items():
            cut = cut_out(Image.open(src / f'ch-p{n}-{sheet}.png').convert('RGB'), enclosed=400)
            a = np.asarray(cut)[:, :, 3]
            for name, (x0, x1) in zip(names, territories(a, frame_boxes(cut, len(names)))):
                col = a[:, x0:x1] > 40
                rows = np.where(col.sum(axis=1) > 2)[0]
                cols = np.where(col.sum(axis=0) > 0)[0]
                top, bot = int(rows.min()), int(rows.max()) + 1
                fr = cut.crop((x0 + int(cols.min()), top, x0 + int(cols.max()) + 1, bot))
                k = FIG_H / fr.height
                fr = fr.resize((max(1, round(fr.width * k)), FIG_H), Image.LANCZOS)
                # body centre = middle of the head (top quarter of the figure)
                head = np.asarray(fr)[: FIG_H // 4, :, 3] > 40
                xs = np.where(head.any(axis=0))[0]
                anchors[f'p{n}-{name}'] = round(float((xs.min() + xs.max()) / 2 / fr.width), 3)
                save_webp(fr, OUT / 'char' / f'p{n}-{name}.webp', quality=84)
    print('  CAST anchors =', json.dumps(anchors))


# ---------------------------------------------------------------------------
# Pieces: single drawings on paper, some holding two things side by side.
#   <source>.png → one or more cut-out WebPs (folder/name), left to right.
# Run: python3 tools/studio-assets.py --pieces <folder>
# ---------------------------------------------------------------------------
PIECES = {
    'wear-oxford':    ['wear/oxford-mac', 'wear/oxford'],      # character holding it + the piece
    'wear-scrunchie': ['wear/scrunchie-mac', 'wear/scrunchie'],
    'wear-daydeo':    ['wear/daydeo-mac', 'wear/daydeo'],
    'wear-denim':     ['wear/denim-mac', 'wear/denim'],
    'wear-bloom':     ['wear/bloom-mac', 'wear/bloom'],
    'ud-vay':         ['udon/ud-vay'],                         # waving
    'ud-ngoi':        ['udon/ud-ngoi'],                        # sitting
    'ud-ngu':         ['udon/ud-ngu'],                         # asleep
    'ud-ngoi-2':      ['udon/ud-ngoi-a', 'udon/ud-ngoi-b'],    # two-frame idle (tail)
    'pr-gio':         ['props/gio'],                           # rattan tray
    'pr-xe':          ['props/xe'],                            # the cart on its own
    # UI paper. '=' = painted edge to edge: kept whole, just resized.
    'ui-khung-hoa-1': ['=ui/khung-hoa-1'],      # daisy frame, kraft ground
    'ui-khung-hoa-2': ['=ui/khung-hoa-2'],      # polaroid + two lines
    'ui-khung-hoa-3': ['=ui/khung-hoa-3'],      # gingham tag frame
    'ui-the-udon-1':  ['=ui/the-udon-1'],       # card: title / body / footer, Udon peeking
    'ui-the-udon-2':  ['=ui/the-udon-2'],
    'ui-bong-bong':   ['ui/bong-bong-s', 'ui/bong-bong-m', 'ui/bong-bong-l'],
    'ui-giay-doc':    ['ui/giay-doc'],          # torn paper, portrait
    'ui-giay-ngang':  ['ui/giay-ngang'],        # torn paper, landscape
    'ui-the-treo':    ['ui/the-treo-1', 'ui/the-treo-2', 'ui/the-treo-3', 'ui/the-treo-4'],
    'ui-cham-mau':    [['ui/cham-sage', 'ui/cham-kraft', 'ui/cham-hong'],
                       ['ui/cham-reu-nhat', 'ui/cham-kem', 'ui/cham-reu']],   # two rows
    'ui-dau-tron':    ['ui/dau-xanh', 'ui/dau-nau', 'ui/dau-hong'],           # stamp rings
    'ui-the-suu-tam': ['ui/the-suu-tam'],       # collector card
}
PIECE_MAX = 900   # px, longest side


def build_pieces(src):
    for base, outs in PIECES.items():
        f = src / f'{base}.png'
        if not f.exists():
            print(f'  - {base}.png missing, skipped')
            continue
        src_im = Image.open(f).convert('RGB')
        if isinstance(outs[0], str) and outs[0].startswith('='):
            im = src_im.copy()
            im.thumbnail((1080, 1080), Image.LANCZOS)
            save_webp(im, OUT / f'{outs[0][1:]}.webp', quality=84)
            continue
        cut = cut_out(src_im, enclosed=150)
        rows_of = outs if isinstance(outs[0], list) else [outs]
        a_full = np.asarray(cut)[:, :, 3]
        if len(rows_of) > 1:
            # split into bands at the emptiest rows between them
            prof = (a_full > 40).sum(axis=1)
            h = a_full.shape[0]
            cuts = [0] + [int(h * i / len(rows_of) - h * 0.15 + np.argmin(
                prof[int(h * i / len(rows_of) - h * 0.15):int(h * i / len(rows_of) + h * 0.15)]))
                for i in range(1, len(rows_of))] + [h]
            bands = [cut.crop((0, cuts[i], cut.width, cuts[i + 1])) for i in range(len(rows_of))]
        else:
            bands = [cut]
        for band, names in zip(bands, rows_of):
            cut_one(band, names)


def cut_one(cut, outs):
        a = np.asarray(cut)[:, :, 3]
        boxes = [(0, a.shape[1])] if len(outs) == 1 else territories(a, frame_boxes(cut, len(outs)))
        for name, (x0, x1) in zip(outs, boxes):
            part = a[:, x0:x1] > 40
            rows = np.where(part.sum(axis=1) > 2)[0]
            cols = np.where(part.sum(axis=0) > 2)[0]
            im = cut.crop((x0 + int(cols.min()), int(rows.min()), x0 + int(cols.max()) + 1, int(rows.max()) + 1))
            im.thumbnail((PIECE_MAX, PIECE_MAX), Image.LANCZOS)
            save_webp(im, OUT / f'{name}.webp', quality=84)


# ---------------------------------------------------------------------------
# Batch folder by prefix (python3 tools/studio-assets.py --batch <folder>):
#   sheet-<name>.png  sticker sheet: every separate drawing → <name>/<name>-NN
#   pr-<name>.png     one prop on paper: cut out whole
#   set-<name>.png    several props on one paper: split → props/<name>-NN
#   full-<name>.png   painted edge to edge: kept whole (scenes, paper)
# Drawings are found as connected blobs on a 4x smaller mask, so they can
# sit anywhere on the sheet; numbered top-to-bottom, left-to-right.
# ---------------------------------------------------------------------------
def blobs(alpha, min_px=2500, grow=0, solid=150):
    m = alpha > solid   # faint shadows under items would chain neighbours
    h, w = m.shape
    H, W = h // 4, w // 4
    g = m[:H * 4, :W * 4].reshape(H, 4, W, 4).any(axis=(1, 3))
    for _ in range(grow):       # join a drawing's loose bits (strings, petals)
        g = g | np.roll(g, 1, 0) | np.roll(g, -1, 0) | np.roll(g, 1, 1) | np.roll(g, -1, 1)
    lab = np.zeros((H, W), dtype=np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(g)):
        if lab[y0, x0]:
            continue
        n += 1
        todo = [(y0, x0)]
        lab[y0, x0] = n
        while todo:
            y, x = todo.pop()
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and g[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    todo.append((yy, xx))
    full = np.zeros((h, w), dtype=np.int32)
    full[:H * 4, :W * 4] = np.repeat(np.repeat(lab, 4, 0), 4, 1)
    out = []
    for k in range(1, n + 1):
        own = (full == k) & m
        if own.sum() < min_px:
            continue
        ys, xs = np.nonzero(own)
        out.append((own, int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1))
    # rows: group by vertical overlap, then left to right
    out.sort(key=lambda b: b[1])
    rows = []
    for b in out:
        if rows and b[1] < rows[-1][-1][3] - (rows[-1][-1][3] - rows[-1][-1][1]) * 0.5:
            rows[-1].append(b)
        else:
            rows.append([b])
    return [b for r in rows for b in sorted(r, key=lambda b: b[2])]


def build_batch(src):
    for f in sorted(src.glob('*.png')):
        kind, _, name = f.stem.partition('-')
        im = Image.open(f).convert('RGB')
        if kind == 'full':
            im.thumbnail((1600, 1600), Image.LANCZOS)
            save_webp(im, OUT / 'bg' / f'{name}.webp', quality=82)
            continue
        if kind not in ('sheet', 'pr', 'set'):
            continue
        cut = cut_out(im, enclosed=150 if kind == 'sheet' else 0)
        rgba = np.asarray(cut).copy()
        if kind == 'pr':
            # one piece of furniture, loose bits (hanging masks) included
            m = rgba[:, :, 3] > 40
            ys, xs = np.nonzero(m)
            parts = [(m, int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1)]
        else:
            parts = blobs(rgba[:, :, 3])
        folder = name if kind == 'sheet' else 'props'   # set-: props split into pieces
        for i, (own, y0, x0, y1, x1) in enumerate(parts, 1):
            piece = rgba[y0:y1, x0:x1].copy()
            piece[:, :, 3] = np.where(own[y0:y1, x0:x1], piece[:, :, 3], 0)
            p = Image.fromarray(piece)
            p.thumbnail((PIECE_MAX, PIECE_MAX), Image.LANCZOS)
            label = f'{name}-{i:02d}' if (kind == 'sheet' or len(parts) > 1) else name
            save_webp(p, OUT / folder / f'{label}.webp', quality=84)


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--batch':
        print('batch:'); build_batch(Path(sys.argv[2]))
        sys.exit()
    if len(sys.argv) == 3 and sys.argv[1] == '--pieces':
        print('pieces:'); build_pieces(Path(sys.argv[2]))
        sys.exit()
    if len(sys.argv) == 3 and sys.argv[1] == '--strip2':
        print('strip (set 2):'); build_strip(Path(sys.argv[2]), ZONES2, SHIFT2, {}, PILLAR2, SEAM2)
        sys.exit()
    if len(sys.argv) == 3 and sys.argv[1] == '--cast':
        print('cast:'); build_cast(Path(sys.argv[2]))
        sys.exit()
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    print('strip:'); build_strip(src)
    print('character:'); build_character(src)
    print('other images:'); copy_rest(src)
