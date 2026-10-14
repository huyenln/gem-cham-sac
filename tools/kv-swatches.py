# Kho vải: the 320px swatches of the fabrics photographed at Gem (10/2026)
# -> images/studio/vai-that/<name>.webp, the photos the design table and
# admin.html → Kho vải show. Run by hand, only to redo those swatches; a new
# fabric is added in admin.html, which does the same steps in the browser
# (GemImg.fabric in js/img-tools.js).
#
#   python3 tools/kv-swatches.py <folder of the photos>
#
# The photos ("Vải" on Drive, A-*/B-*.jpg = big room / small room) are not in
# the repo. Each row: photo, crop box on its 1600px copy (None = centre
# square), names, tone, kind, material, plain, warm.
#   plain cloth  drawn again flat: its own colour x its own weave (folds gone);
#                satin / silk / velvet keep a soft sheen, corduroy / rib knit
#                their ribs
#   prints       big light changes evened out (a fold that bends the print
#                stays: redrawing it would no longer be the real cloth)
# then the shop's lights corrected (less yellow-red, not for cream / beige),
# brighter, a little fresher. The rows match supabase/migrations/20261014b_kho_vai_seed.sql
# less the second photos of the same cloth (20261014d_kho_vai_gop.sql).
import os
import re
import sys
import unicodedata

import numpy as np
from PIL import Image, ImageFilter, ImageOps

A = 'Phòng lớn, tủ trưng bày vàng'
B = 'Phòng nhỏ, ngăn dưới cùng tủ vải to'
C = None
F = [
    # xanh lá
    ('A-185048', (160, 120, 1040, 1000), 'Thô xanh rêu', 'Moss green linen-look', 'xanh', 'tron', 'Vải thô', 1, 0),
    ('A-185105', (200, 150, 650, 600), 'Caro xanh lá', 'Green gingham', 'xanh', 'caro', 'Cotton', 0, 0),
    ('B-175626', (200, 120, 1040, 960), 'Gấm lá xanh', 'Green leaf brocade', 'xanh', 'hoato', 'Gấm', 0, 0),
    ('B-173906', C, 'Hoa nền vàng chanh', 'Flowers on lime', 'xanh', 'hoato', 'Vải pha', 0, 0),
    ('B-174628', C, 'Hoa rực rỡ', 'Bright garden', 'xanh', 'hoato', 'Vải pha', 0, 0),
    # xanh lam
    ('A-185305', (360, 700, 1080, 1420), 'Crêpe xanh cổ vịt', 'Teal crêpe', 'lam', 'tron', 'Vải pha', 1, 0),
    ('B-173548', (900, 200, 1500, 800), 'Xanh dầu', 'Petrol blue', 'lam', 'tron', 'Vải pha', 1, 0),
    ('A-184950', C, 'Xanh coban', 'Cobalt blue', 'lam', 'tron', 'Vải pha', 1, 0),
    ('A-185530', (350, 150, 850, 650), 'Xanh than', 'Navy', 'lam', 'tron', 'Vải pha', 1, 0),
    ('A-185505', (550, 400, 1150, 1000), 'Tổ ong xanh nhạt', 'Pale blue waffle', 'lam', 'ono', 'Vải tổ ong', 0, 0),
    ('A-190250', (200, 150, 560, 510), 'Ô nhỏ xanh than', 'Small navy check', 'lam', 'ono', 'Cotton', 0, 0),
    ('A-190149', (540, 280, 1060, 800), 'Caro trám xanh', 'Blue diamond check', 'lam', 'caro', 'Cotton', 0, 0),
    ('A-185158', (200, 150, 860, 810), 'Voan hoa hồng nền xanh', 'Roses on blue voile', 'lam', 'hoato', 'Voan', 0, 0),
    ('A-184917', C, 'Họa tiết ô màu', 'Colour-block folk print', 'lam', 'tho', 'Cotton', 0, 0),
    ('B-174505', C, 'Màu nước tím xanh', 'Blue-violet watercolour', 'lam', 'hoato', 'Voan', 0, 0),
    ('B-175248', C, 'Paisley nền xám xanh', 'Paisley on grey-blue', 'lam', 'hoato', 'Voan', 0, 0),
    # hồng – đỏ
    ('A-184709', (300, 100, 1100, 900), 'Voan hồng', 'Pink voile', 'hong', 'tron', 'Voan', 1, 0),
    ('A-184606', C, 'Hồng ruốc', 'Dusty rose', 'hong', 'tron', 'Vải pha', 1, 0),
    ('B-173342', (950, 250, 1450, 750), 'Voan hồng sen', 'Lotus pink voile', 'hong', 'tron', 'Voan', 1, 0),
    ('B-173502', C, 'Kaki hồng tím', 'Orchid twill', 'hong', 'tron', 'Kaki', 1, 0),
    ('A-185614', C, 'Hồng cam', 'Salmon pink', 'hong', 'tron', 'Lụa', 1, 0),
    ('A-184755', (500, 200, 1000, 700), 'Cam san hô', 'Coral', 'hong', 'tron', 'Lụa', 1, 0),
    ('A-190224', (420, 500, 920, 1000), 'Đỏ đô', 'Burgundy', 'hong', 'tron', 'Voan', 1, 0),
    ('A-190109', C, 'Nhung tăm đỏ', 'Red corduroy', 'hong', 'soc', 'Nhung tăm', 1, 0),
    ('A-185810', (60, 100, 1000, 1040), 'Nhung tím', 'Purple velvet', 'hong', 'tron', 'Nhung', 1, 0),
    ('B-173334', (300, 200, 900, 800), 'Hoa nhí nền hồng', 'Ditsy flowers on pink', 'hong', 'hoa', 'Voan', 0, 0),
    ('B-174605', C, 'Cúc nhí nền hồng', 'Tiny daisies on pink', 'hong', 'hoa', 'Vải pha', 0, 0),
    ('B-174334', C, 'Hoa đỏ nền trắng', 'Red flowers on white', 'hong', 'hoa', 'Voan', 0, 0),
    ('B-175441', C, 'Hoa anh đào nền trắng', 'Cherry blossom on white', 'hong', 'hoa', 'Voan', 0, 0),
    ('A-185548', C, 'Hoa văn xoắn hồng', 'Pink swirls', 'hong', 'hoa', 'Voan', 0, 0),
    ('B-175537', (200, 150, 800, 750), 'Hoa păng-xê', 'Pansies', 'hong', 'hoato', 'Vải pha', 0, 0),
    ('B-175400', C, 'Hoa trà nền hồng đất', 'Camellias on dusty pink', 'hong', 'hoato', 'Vải pha', 0, 0),
    ('B-174648', C, 'Hoa pastel nền xám', 'Pastel flowers on grey', 'hong', 'hoato', 'Voan', 0, 0),
    ('B-174749', C, 'Cúc trắng nền tím mận', 'White mums on plum', 'hong', 'hoato', 'Vải pha', 0, 0),
    ('B-174715', C, 'Chim lửa rực rỡ', 'Firebird print', 'hong', 'hoato', 'Vải pha', 0, 0),
    ('B-175226', C, 'Hình học đỏ hồng', 'Red-pink geometric', 'hong', 'hoato', 'Lụa', 0, 0),
    ('B-175553', C, 'Gấm hoa văn đỏ cam', 'Red-orange damask', 'hong', 'hoato', 'Gấm', 0, 0),
    ('B-174820', C, 'Thổ cẩm đỏ gạch', 'Brick-red folk weave', 'hong', 'tho', 'Thổ cẩm', 0, 0),
    # nâu đất
    ('A-184841', (200, 80, 1000, 880), 'Satin be', 'Beige satin', 'nau', 'tron', 'Tafta', 1, 1),
    ('A-185633', C, 'Satin sâm panh', 'Champagne satin', 'nau', 'tron', 'Satin', 1, 0),
    ('A-185140', C, 'Voan nâu', 'Brown voile', 'nau', 'tron', 'Voan', 1, 0),
    ('B-173638', (60, 140, 960, 1040), 'Nhung tăm nâu', 'Brown corduroy', 'nau', 'soc', 'Nhung tăm', 1, 0),
    ('B-173648', C, 'Kẻ chéo nâu đen', 'Brown-black check', 'nau', 'caro', 'Vải pha', 0, 0),
    ('B-174026', C, 'Lá tre nền nâu', 'Bamboo leaves on brown', 'nau', 'hoato', 'Vải pha', 0, 0),
    ('B-174109', C, 'Lá phong nền kem', 'Maple leaves on cream', 'nau', 'hoato', 'Vải pha', 0, 0),
    ('B-174232', C, 'Da báo hoa ly', 'Leopard and lilies', 'nau', 'hoato', 'Vải pha', 0, 0),
    ('B-174419', C, 'Họa tiết nâu xanh ngọc', 'Brown and teal swirls', 'nau', 'hoato', 'Lụa', 0, 0),
    ('B-174524', C, 'Hoa to sơn dầu', 'Painted big flowers', 'nau', 'hoato', 'Vải pha', 0, 0),
    ('B-175200', C, 'Mảng màu cam xanh', 'Orange-blue colour blocks', 'nau', 'hoato', 'Vải pha', 0, 0),
    ('B-174154', C, 'Chắp vá thổ cẩm', 'Folk patchwork print', 'nau', 'tho', 'Cotton', 0, 0),
    # trung tính
    ('B-173754', (160, 120, 1040, 1000), 'Thun gân kem', 'Cream rib knit', 'trung', 'tron', 'Thun', 1, 1),
    ('B-173817', C, 'Kem trơn', 'Plain cream', 'trung', 'tron', 'Cotton', 1, 1),
    ('A-185932', C, 'Nỉ xám', 'Grey felt', 'trung', 'tron', 'Nỉ', 1, 0),
    ('A-185655', C, 'Dạ xám than', 'Charcoal wool', 'trung', 'tron', 'Dạ', 1, 0),
    ('A-185719', C, 'Nhung đen ánh tím', 'Black-plum velvet', 'trung', 'tron', 'Nhung', 1, 0),
    ('B-173738', C, 'Kim tuyến be', 'Beige with silver thread', 'trung', 'soc', 'Kim tuyến', 0, 1),
    ('B-175723', C, 'Xám kẻ chéo', 'Grey fine diagonal', 'trung', 'soc', 'Vải pha', 0, 0),
    ('B-173947', (200, 150, 700, 650), 'Sọc đen trắng', 'Black and white stripes', 'trung', 'soc', 'Vải pha', 0, 0),
    ('A-185836', C, 'Nhung đen kẻ sọc', 'Pinstripe black velvet', 'trung', 'soc', 'Nhung', 0, 0),
    ('B-174305', (120, 240, 1080, 1200), 'Chấm bi đen', 'Black polka dots', 'trung', 'cham', 'Voan', 0, 1),
    ('B-174537', (450, 700, 1050, 1300), 'Chấm bi trắng nền đen', 'White dots on black', 'trung', 'cham', 'Voan', 0, 0),
    ('B-175341', C, 'Sao nhỏ nền đen', 'Tiny stars on black', 'trung', 'cham', 'Voan', 0, 0),
    ('B-174211', C, 'Hạt trám nền đen', 'Diamonds on black', 'trung', 'cham', 'Voan', 0, 0),
    ('B-174255', C, 'Hoa pastel nền đen', 'Pastel flowers on black', 'trung', 'hoa', 'Cotton', 0, 0),
    ('B-173932', C, 'Paisley nền đen', 'Paisley on black', 'trung', 'hoato', 'Voan', 0, 0),
    ('B-174441', (150, 280, 750, 880), 'Vân hươu đen trắng', 'Black-white giraffe', 'trung', 'hoato', 'Vải pha', 0, 0),
]


def slug(s):
    s = unicodedata.normalize('NFD', s.replace('đ', 'd').replace('Đ', 'D'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


W = np.array([0.299, 0.587, 0.114])
CAST = {'A': np.array([0.965, 1.009, 1.028]), 'B': np.array([0.922, 1.025, 1.064])}

def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype('uint8'))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=float) / 255

def bright(a, room, warm=False):
    if not warm:   # cream / beige: the room correction would turn them mint
        a = a * (1 + (CAST[room] - 1) * 0.6)
    hi = np.percentile(a @ W, 97)
    a = np.clip(a * min(1.35, max(1.0, 0.9 / max(hi, 1e-3))), 0, 1) ** 0.94
    L = a @ W
    return np.clip(L[..., None] + (a - L[..., None]) * 1.06, 0, 1)

# fabrics whose light part came out tinted by the shop's light, and the
# colour it really is (Anna 14/10/2026: "Caro xanh lá" is green and cream,
# the photo's light squares came out mint): the light part (the brightest
# fifth) is brought to that colour, the rest follows
WHITE = {'A-185105': np.array([0.94, 0.92, 0.85])}

def white(a, name):
    if name not in WHITE:
        return a
    L = a @ W
    m = a[L >= np.percentile(L, 80)].mean(axis=0)
    return np.clip(a * (WHITE[name] / np.maximum(m, 1e-3)), 0, 1)

def flat(a, r, strength):
    L = np.maximum(a @ W, 1e-3)
    base = np.maximum(blur(L, r), 1e-3)
    f = 1 + (L.mean() / base - 1) * strength
    return np.clip(a * f[..., None], 0, 1)

KEEP = {'A-185719'}   # crushed velvet: the shine is the look
SHINY = {'Satin', 'Tafta', 'Lụa', 'Nhung'}
RIBBED = {'Nhung tăm', 'Thun'}

def rebuild(a, mat):
    # plain cloth, drawn again flat: its own colour (the median, so folds and
    # shadows don't pull it) times its own weave (only the finest detail of
    # the photo: threads, or the ribs of corduroy / rib knit), plus some of
    # the broad light so it doesn't look printed. Satin, silk and velvet keep
    # a soft sheen: that is what they look like.
    L = np.maximum(a @ W, 1e-3)
    flat_px = a.reshape(-1, 3)
    col = flat_px.mean(0) if mat in SHINY else np.median(flat_px, axis=0)
    weave = L / np.maximum(blur(L, 5 if mat in RIBBED else 2.2), 1e-3)
    m = max(L.mean(), 1e-3)
    broad = blur(L, 640 / 3) / m
    f = (1 + (weave - 1) * 1.1) * (1 + (broad - 1) * (0.5 if mat in SHINY else 0.25))
    if mat in SHINY:
        sheen = blur(L, 640 / 14) / np.maximum(blur(L, 640 / 3), 1e-3)
        f = f * (1 + (sheen - 1) * 0.45)
    return np.clip(col[None, None, :] * f[..., None], 0, 1)

def photo(src, name):
    im = ImageOps.exif_transpose(Image.open(os.path.join(src, name + '.jpg'))).convert('RGB')
    if max(im.size) != 1600:   # crop boxes are on 1600px copies
        k = 1600 / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    return im

# checks / stripes photographed at a slant, turned straight round the crop's
# centre before cropping (degrees, + = anticlockwise; Anna 14/10/2026)
ROT = {'B-173648': -45, 'B-173947': -3.8, 'A-190149': -25}

def default_box(im, box, plain):
    if box: return box
    w, h = im.size
    s = int(min(w, h) * (0.42 if plain else 0.55))
    return ((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)

def make(src, row, new=True):
    name, box, vi, en, tone, kind, mat, plain, warm = row
    im = photo(src, name)
    box = default_box(im, box, plain)
    if name in KEEP:
        plain = 0
    if name in ROT:
        im = im.rotate(ROT[name], center=((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), resample=Image.BICUBIC)
    # prints keep the hand-checked crop: the "flattest" square found by
    # flattest() is too often the one with the least print on it
    a = np.asarray(im.crop(box).resize((640, 640), Image.LANCZOS), dtype=float) / 255
    if new and plain:
        a = rebuild(a, mat)
    else:
        a = flat(a, 640 / (10 if plain else 6), 1.0 if plain else 0.7)
    a = white(bright(a, name[0], warm), name)
    if warm:   # cream / beige: keep them warm, the room correction cools them
        a = np.clip(a * np.array([1.02, 1.0, 0.96]), 0, 1)
    out = Image.fromarray((a * 255).astype('uint8')).resize((320, 320), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(1.2, 40, 2))


# The bigger photo round each swatch (images/studio/vai-that/lon/): each patch
# on the design table shows its own part of it. K: its side in swatch widths,
# smaller where the photo runs out or something else shows round the cloth.
K = {'A-185505': 1.0, 'A-190250': 1.15, 'A-190149': 1.0, 'A-184917': 1.0, 'A-185719': 1.0,
     'A-185836': 1.2, 'B-174537': 1.15, 'B-174441': 1.1, 'B-174820': 1.2}


def make_big(src, row):
    name, box, vi, en, tone, kind, mat, plain, warm = row
    im = photo(src, name)
    box = default_box(im, box, plain)
    if name in KEEP:
        plain = 0
    s = box[2] - box[0]
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    big = min(int(s * K.get(name, 1.6)), im.width, im.height)
    valid = None
    if name in ROT:   # turned straight: no empty corner inside the big square
        valid = Image.new('L', im.size, 255).rotate(ROT[name], center=(cx, cy), resample=Image.NEAREST)
        im = im.rotate(ROT[name], center=(cx, cy), resample=Image.BICUBIC)
    x0 = int(min(max(0, cx - big / 2), im.width - big)); y0 = int(min(max(0, cy - big / 2), im.height - big))
    while valid is not None and big > s and min(valid.crop((x0, y0, x0 + big, y0 + big)).getextrema()) < 255:
        big -= 8
        x0 = int(min(max(0, cx - big / 2), im.width - big)); y0 = int(min(max(0, cy - big / 2), im.height - big))
    a = np.asarray(im.crop((x0, y0, x0 + big, y0 + big)).resize((800, 800), Image.LANCZOS), dtype=float) / 255
    a = rebuild(a, mat) if plain else flat(a, 800 / 6, 0.7)
    a = white(bright(a, name[0], warm), name)
    if warm:
        a = np.clip(a * np.array([1.02, 1.0, 0.96]), 0, 1)
    out = Image.fromarray((a * 255).astype('uint8')).resize((640, 640), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(1.2, 40, 2)), round(big / s, 2)


if __name__ == '__main__':
    # python3 tools/kv-swatches.py <folder> [photo…]: all, or only those photos
    if len(sys.argv) < 2:
        sys.exit(__doc__ or 'usage: python3 tools/kv-swatches.py <folder of the photos> [photo…]')
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'studio', 'vai-that')
    os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(out, 'lon'), exist_ok=True)
    for r in F:
        if sys.argv[2:] and r[0] not in sys.argv[2:]:
            continue
        make(sys.argv[1], r, True).save(os.path.join(out, slug(r[2]) + '.webp'), quality=82, method=6)
        im, k = make_big(sys.argv[1], r)
        im.save(os.path.join(out, 'lon', slug(r[2]) + '.webp'), quality=78, method=6)
        print(slug(r[2]), 'k', k)   # photo_k in supabase/migrations/20261015_kho_vai_photo.sql
