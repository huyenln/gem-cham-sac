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
  sheet-don-ban        the party table's things before / after (levels 1, 4, 5)
  irasutoya-an-thua, irasutoya-nhua, tui-rac
                       いらすとや pictures (transparent PNG, credited in the game)
  thung-day            the overflowing bin (level 5 lost)
  tui-vai-gap          the non-woven bag folded (levels 2–3)
  tagom-<id>.jpg       Tagom's posters, used whole (Tagom said yes, 23/10)
-> images/studio/rac/<name>.webp (and lo-thuoc-tran: the medicine bottle with
   its cap cut off, as levels 2–3 show it; made from lo-thuoc.webp)
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
    # the party table (ChatGPT, 23/10): the "before" or "after" of a thing that wants work
    'sheet-don-ban': ['ly-tra-sua-day', 'tui-khi-xep', 'goi-snack-gap', 'chai-dau-nap'],
    # いらすとや (irasutoya.com, Anna 24/10: used as they are, credited in the game)
    'irasutoya-an-thua': ['xuong-ca', 'vo-trung', 'loi-tao'],
    'irasutoya-nhua': ['chai-bom', 'xo'],
}
# how far apart a picture's own parts may lie (px on the sheet): the egg and
# the apple core sit closer than that
GAP = {'irasutoya-an-thua': 14}
# the hanger on irasutoya-nhua touches the bucket: left out by its green
# (not on Tagom's posters, Anna 24/10)
def no_green(a):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    a = a.copy()
    a[..., 3] = np.where((g > r + 25) & (g > b + 25), 0, a[..., 3])
    return a
CLEAN = {'irasutoya-nhua': no_green}
# one picture each: the overflowing bin (ChatGPT, the end of level 5), the
# general-waste bag (irasutoya, the "Rác thường" tile), the non-woven bag
# folded (ChatGPT, levels 2–3 show it so)
SINGLE = {'thung-day': 640, 'tui-rac': 200, 'tui-vai-gap': 300}
# longest side, px: things are shown at most ~150 css px on a 2x phone
# screen, Udon and the bags ~110
SIDE = {'ud-chay-1': 240, 'ud-chay-2': 240, 'ud-ngoi-cho': 240, 'ud-nhay': 240, 'bao': 200}
ITEM = 300
TUG = 720          # the tug pictures: their width
POSTER_BIG, POSTER_SMALL = 1400, 420   # posters: their height


def save(im, path, q=80):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print(f'  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB')


# the medicine bottle as levels 2–3 show it, its cap off (caps go to plastic
# 2-4-5, Anna 25/10): the rows from the first that is mostly its brown glass
def cap_off(im):
    a = np.asarray(im.convert('RGBA')).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    body, brown = al > 200, (al > 200) & (r > g + 25) & (g > b) & (r < 200)
    for y in range(a.shape[0]):
        if body[y].sum() > 40 and brown[y].sum() > 0.6 * body[y].sum():
            part = im.crop((0, y, im.size[0], im.size[1]))
            return part.crop(part.getbbox())
    return im


def fit(im, side):
    im = im.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    return im


def pieces(im, n, gap=18):
    """The n pictures on a sheet, in reading order. Parts drawn apart (a pile
    of caps, motion lines) are grouped by what lies close together; each one
    is cut out alone (a neighbour's edge inside its box is left out)."""
    a = np.asarray(im)
    solid = a[..., 3] > 40
    near = ndi.binary_dilation(solid, iterations=gap)
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
        a = np.asarray(Image.open(f).convert('RGBA'))
        if sheet in CLEAN:
            a = CLEAN[sheet](a)
        for name, pic in zip(names, pieces(Image.fromarray(a), len(names), GAP.get(sheet, 18))):
            save(fit(pic, SIDE.get(name, ITEM)), OUT / f'{name}.webp')
    for name, side in SINGLE.items():
        f = find(name)
        if f:
            im = Image.open(f).convert('RGBA')
            save(fit(im.crop(im.getbbox()), side), OUT / f'{name}.webp')
    for name in ('ud-keo-1', 'ud-keo-2'):
        f = find(name)
        if not f:
            continue
        im = Image.open(f).convert('RGBA')
        im = im.crop(im.getbbox())
        save(im.resize((TUG, round(im.size[1] * TUG / im.size[0])), Image.LANCZOS), OUT / f'{name}.webp')
    if (OUT / 'lo-thuoc.webp').exists():
        save(cap_off(Image.open(OUT / 'lo-thuoc.webp')), OUT / 'lo-thuoc-tran.webp')
    for f in sorted(src.glob('tagom-*')):
        im = Image.open(f).convert('RGB')
        pid = f.stem[len('tagom-'):]
        for h, path, q in ((POSTER_BIG, POSTERS / 'to' / f'{pid}.webp', 78), (POSTER_SMALL, POSTERS / f'{pid}.webp', 80)):
            save(im.resize((round(im.size[0] * h / im.size[1]), h), Image.LANCZOS), path, q)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
