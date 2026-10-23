#!/usr/bin/env python3
"""Pictures for "Phân loại rác" (js/phanloai.js) and Tagom's posters.

    python3 tools/rac-assets.py <folder with the sources>

Sources (ChatGPT, 10/2026, transparent background; prompts in docs/prompts.md
→ "Phân loại rác"):
  ud-keo-1, ud-keo-2   Udon tugging a trouser hem; the leg comes in from the
                       left edge, so the picture is kept to that edge
  sheet-ud-game        Udon: trot 1, trot 2 (top row), sitting, hop
  sheet-chai           bottle (cap + label), cap, label, bare bottle,
                       flattened bottle; sack, flat foam sheet
  sheet-rac-1..3       the things to sort, in reading order (SHEETS)
  (Gem's basket is the studio's own, images/studio/props/gio.webp, made small)
  tagom-<id>.jpg       Tagom's posters, used whole (Tagom said yes, 23/10)
-> images/studio/rac/<name>.webp
   images/studio/tagom/<id>.webp     (small: hung on the studio wall)
   images/studio/tagom/to/<id>.webp  (big: opened on a tap)
Needs Pillow + numpy + scipy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/studio/rac'
POSTERS = ROOT / 'images/studio/tagom'

# each sheet's pieces in reading order (top row left to right, then the next)
SHEETS = {
    'sheet-ud-game': ['ud-chay-1', 'ud-chay-2', 'ud-ngoi-cho', 'ud-nhay'],
    'sheet-chai': ['chai', 'nap', 'tem', 'chai-tran', 'chai-bep', 'bao', 'xop'],
    'sheet-rac-1': ['chai-to', 'lo-keo', 'hu-kem', 'chai-dau', 'ly-tra-sua',
                    'nap-cau', 'hop-banh', 'khay-den', 'lo-thuoc'],
    'sheet-rac-2': ['can-giat', 'binh-sua', 'nap-chai', 'hop-com', 'do-choi',
                    'hop-sua-chua', 'thia', 'dia', 'ban-chai', 'dia-cd'],
    'sheet-rac-3': ['goi-snack', 'vo-banh', 'tui-zip', 'bao-gao', 'tui-vai',
                    'tui-bong', 'mang-boc', 'xop-hoi', 'tui-khi', 'tui-goi-hang'],
}
# longest side, px: things are shown at most ~150 css px on a 2x phone
# screen, Udon and the bags ~110
SIDE = {'ud-chay-1': 240, 'ud-chay-2': 240, 'ud-ngoi-cho': 240, 'ud-nhay': 240, 'bao': 200}
ITEM = 300
GIO = 160          # Gem's basket (images/studio/props/gio.webp), as a bag
TUG = 720          # the tug pictures: their width
POSTER_BIG, POSTER_SMALL = 1400, 420   # posters: their height


def save(im, path, q=80):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB')


def fit(im, side):
    im = im.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    return im


def pieces(im, n):
    """The n pictures on a sheet, in reading order. Parts drawn apart (a pile
    of caps, motion lines) are grouped by what lies close together; each one
    is cut out alone (a neighbour's edge inside its box is left out)."""
    a = np.asarray(im)
    solid = a[..., 3] > 40
    near = ndi.binary_dilation(solid, iterations=18)
    lab, k = ndi.label(near)
    sizes = ndi.sum(solid, lab, range(1, k + 1))
    keep = [i + 1 for i in range(k) if sizes[i] > 4000]
    if len(keep) != n:
        sys.exit(f'  expected {n} pictures, found {len(keep)} (sizes {sorted(int(sizes[i - 1]) for i in keep)})')
    boxes = []
    for i in keep:
        ys, xs = np.nonzero((lab == i) & solid)
        boxes.append((i, xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # rows: a piece starts a new row when its top is below the previous row's middle
    boxes.sort(key=lambda b: (b[2] + b[4]) / 2)
    rows, row = [], [boxes[0]]
    for b in boxes[1:]:
        mid = np.mean([(r[2] + r[4]) / 2 for r in row])
        if b[2] > mid:
            rows.append(row)
            row = [b]
        else:
            row.append(b)
    rows.append(row)
    out = []
    for r in rows:
        for i, x0, y0, x1, y1 in sorted(r, key=lambda b: b[1]):
            cut = a[y0:y1, x0:x1].copy()
            cut[..., 3] = np.where(lab[y0:y1, x0:x1] == i, cut[..., 3], 0)
            out.append(Image.fromarray(cut))
    return out


def main(src):
    src = Path(src)
    def find(stem):
        for ext in ('.png', '.webp', '.jpg'):
            if (src / (stem + ext)).exists():
                return src / (stem + ext)
        return None
    for sheet, names in SHEETS.items():
        f = find(sheet)
        if not f:
            continue
        for name, pic in zip(names, pieces(Image.open(f).convert('RGBA'), len(names))):
            save(fit(pic, SIDE.get(name, ITEM)), OUT / f'{name}.webp')
    save(fit(Image.open(ROOT / 'images/studio/props/gio.webp').convert('RGBA'), GIO), OUT / 'gio.webp')
    for name in ('ud-keo-1', 'ud-keo-2'):
        f = find(name)
        if not f:
            continue
        im = Image.open(f).convert('RGBA')
        im = im.crop(im.getbbox())
        save(im.resize((TUG, round(im.size[1] * TUG / im.size[0])), Image.LANCZOS), OUT / f'{name}.webp')
    for f in sorted(src.glob('tagom-*')):
        im = Image.open(f).convert('RGB')
        pid = f.stem[len('tagom-'):]
        for h, path, q in ((POSTER_BIG, POSTERS / 'to' / f'{pid}.webp', 78), (POSTER_SMALL, POSTERS / f'{pid}.webp', 80)):
            save(im.resize((round(im.size[0] * h / im.size[1]), h), Image.LANCZOS), path, q)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
