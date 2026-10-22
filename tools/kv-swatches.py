# Kho vải: the 320px swatches of the fabrics photographed at Gem (10/2026)
# -> images/studio/vai-that/<name>.webp, the photos the design table and
# admin.html → Kho vải show. Run by hand, only to redo those swatches; a new
# fabric is added in admin.html, which does the same steps in the browser
# (GemImg.fabric in js/img-tools.js).
#
#   python3 tools/kv-swatches.py <folder of the photos>
#
# The photos ("Vải" on Drive, A-*/B-*.jpg = big room / small room; C-* = the
# folder "Phòng lớn - sau cửa treo đồ", 21/10/2026, still under the camera's
# names IMG_20261021_<time>[_edit].jpg) are not in the repo. Each row: photo,
# crop box on its 1600px copy (None = centre square), names, tone, kind,
# material, plain, warm.
#   plain cloth  drawn again flat: its own colour x its own weave (folds gone);
#                satin / silk / velvet keep a soft sheen, corduroy / rib knit
#                their ribs
#   prints       big light changes evened out (a fold that bends the print
#                stays: redrawing it would no longer be the real cloth)
# then the shop's lights corrected (less yellow-red, not for cream / beige),
# brighter, a little fresher. The rows match supabase/migrations/20261014b_kho_vai_seed.sql
# less the second photos of the same cloth (20261014d_kho_vai_gop.sql), then
# 20261022_kho_vai_sau_cua.sql (C-*, the second photos already left out).
import glob
import os
import re
import sys
import unicodedata

import numpy as np
from PIL import Image, ImageFilter, ImageOps

# where each room's fabrics are kept (fabric_private.place), by the photo's
# first letter
PLACE = {'A': 'Phòng lớn, tủ trưng bày vàng', 'B': 'Phòng nhỏ, ngăn dưới cùng tủ vải to',
         'C': 'Phòng lớn, sau cửa treo đồ'}
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

    # Phòng lớn, sau cửa treo đồ (21/10/2026). Taken twice, left out:
    # 145415 (= 145309), 145600 (= 145509), 152252 (= 152320).
    # Lamé, shot organza: the shine and the second colour in the folds are the
    # look, so they keep the photo (plain 0).
    # xanh lá
    ('C-152320', C, 'Voan xanh lục đậm', 'Deep teal-green chiffon', 'xanh', 'tron', 'Voan', 1, 0),
    ('C-160024', C, 'Xanh xô thơm', 'Sage green crinkle', 'xanh', 'tron', 'Vải pha', 1, 0),
    # xanh lam
    ('C-145936', (260, 350, 1060, 1150), 'Nhung sen nền xanh than', 'Lotus on navy velvet', 'lam', 'hoato', 'Nhung', 0, 0),
    ('C-151502', C, 'Họa tiết xanh lá nền than', 'Green shapes on navy', 'lam', 'hoato', 'Vải pha', 0, 0),
    ('C-152432', C, 'Voan lưới xanh biển', 'Ocean blue tulle', 'lam', 'tron', 'Voan', 1, 0),
    ('C-152634', C, 'Gấm hoa xanh tím', 'Blue-violet floral jacquard', 'lam', 'hoa', 'Gấm', 0, 0),
    ('C-153340', C, 'Xếp ly xanh hoàng gia', 'Royal blue pintucks', 'lam', 'soc', 'Vải pha', 0, 0),
    ('C-154031', C, 'Tím than', 'Indigo violet', 'lam', 'tron', 'Vải pha', 1, 0),
    ('C-155244', C, 'Xanh hoàng gia', 'Royal blue', 'lam', 'tron', 'Vải pha', 1, 0),
    # hồng – đỏ
    ('C-145732', C, 'Ren lá hồng', 'Pink leaf lace', 'hong', 'ren', 'Ren', 0, 0),
    ('C-145825', C, 'Ren hoa đỏ đô', 'Burgundy floral lace', 'hong', 'ren', 'Ren', 0, 0),
    ('C-150303', C, 'Gấm lá tím mận', 'Plum leaf jacquard', 'hong', 'hoato', 'Gấm', 0, 0),
    ('C-151420', C, 'Nhung tăm đỏ rượu', 'Wine corduroy', 'hong', 'soc', 'Nhung tăm', 1, 0),
    ('C-151714', C, 'Hoa hồng nền tối', 'Pink blooms on dark', 'hong', 'hoato', 'Vải pha', 0, 0),
    ('C-152155', C, 'Đỏ thẫm', 'Deep red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-152352', C, 'Voan tơ hồng', 'Pink organza', 'hong', 'tron', 'Voan', 1, 0),
    ('C-153010', C, 'Tafta tím hồng', 'Magenta taffeta', 'hong', 'tron', 'Tafta', 1, 0),
    ('C-153202', C, 'Đỏ gạch', 'Brick red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-153222', C, 'Voan hồng rực', 'Hot pink voile', 'hong', 'tron', 'Voan', 1, 0),
    ('C-153259', C, 'Đỏ san hô', 'Coral red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-153718', C, 'Đỏ huyết dụ', 'Crimson', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-153840', C, 'Tafta hồng tro', 'Ash-rose taffeta', 'hong', 'tron', 'Tafta', 1, 0),
    ('C-154323', C, 'Đỏ son', 'Lipstick red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-154900', C, 'Đỏ cam', 'Orange-red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-155154', C, 'Tafta tím khói', 'Smoky lilac taffeta', 'hong', 'tron', 'Tafta', 1, 0),
    ('C-160224', C, 'Đỏ tươi', 'Bright red', 'hong', 'tron', 'Vải pha', 1, 0),
    ('C-160421', C, 'Hồng mâm xôi', 'Raspberry', 'hong', 'tron', 'Vải pha', 1, 0),
    # nâu đất (vàng, cam cũng ở đây)
    ('C-145207', C, 'Satin vàng nghệ', 'Turmeric satin', 'nau', 'tron', 'Satin', 1, 0),
    ('C-145309', C, 'Kim tuyến vàng ô liu', 'Olive-gold lamé', 'nau', 'tron', 'Kim tuyến', 0, 0),
    ('C-145346', C, 'Voan ánh đồng', 'Bronze shot organza', 'nau', 'tron', 'Voan', 0, 0),
    ('C-145509', C, 'Hoa nhí nền kaki', 'Ditsy flowers on khaki', 'nau', 'hoa', 'Vải pha', 0, 0),
    ('C-150812', C, 'Thun vàng mù tạt', 'Mustard knit', 'nau', 'tron', 'Thun', 1, 0),
    ('C-151605', C, 'Gấm hoa văn nâu đen', 'Dark brown damask', 'nau', 'hoato', 'Gấm', 0, 0),
    ('C-152838', C, 'Vàng đất', 'Ochre', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-153515', C, 'Vàng rêu', 'Olive yellow', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-154120', C, 'Nâu tím', 'Plum brown', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-154235', C, 'Nâu than', 'Charcoal brown', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-154437', C, 'Nâu bò', 'Tan', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-154753', C, 'Vàng hoa cải', 'Mustard-flower yellow', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-155356', C, 'Thun màu da', 'Nude knit', 'nau', 'tron', 'Thun', 1, 1),
    ('C-155836', C, 'Tafta cam', 'Orange taffeta', 'nau', 'tron', 'Tafta', 1, 0),
    ('C-155913', C, 'Vàng mơ', 'Apricot', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-160140', C, 'Cam tươi', 'Bright orange', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-160802', C, 'Be nâu', 'Camel', 'nau', 'tron', 'Vải pha', 1, 1),
    ('C-160937', C, 'Cam đất', 'Terracotta', 'nau', 'tron', 'Vải pha', 1, 0),
    ('C-161040', C, 'Vàng ô liu', 'Olive gold', 'nau', 'tron', 'Vải pha', 1, 0),
    # trung tính
    ('C-150120', C, 'Đũi xám', 'Grey slub linen', 'trung', 'tron', 'Đũi / linen', 1, 0),
    ('C-150448', C, 'Ren hoa trắng', 'White floral lace', 'trung', 'ren', 'Ren', 0, 1),
    ('C-150517', C, 'Xám nhạt', 'Light grey', 'trung', 'tron', 'Cotton', 1, 0),
    ('C-151816', C, 'Nâu đen', 'Black-brown', 'trung', 'tron', 'Vải pha', 1, 0),
    ('C-152538', (820, 330, 1260, 770), 'Ren thêu kem', 'Cream embroidered tulle', 'trung', 'ren', 'Ren', 0, 1),
    ('C-153634', C, 'Trắng trơn', 'Plain white', 'trung', 'tron', 'Cotton', 1, 0),
    ('C-155547', C, 'Trắng ngà', 'Off-white', 'trung', 'tron', 'Vải pha', 1, 0),
    ('C-155613', (250, 400, 950, 1100), 'Paisley trắng nền xám', 'White paisley on grey', 'trung', 'hoato', 'Vải pha', 0, 0),
    ('C-160311', C, 'Trắng sữa', 'Milk white', 'trung', 'tron', 'Lụa', 1, 0),
    ('C-160600', C, 'Đen xương cá', 'Black herringbone', 'trung', 'tron', 'Vải pha', 1, 0),
    ('C-160645', C, 'Xám rêu', 'Grey-green', 'trung', 'tron', 'Kaki', 1, 0),
]


def slug(s):
    s = unicodedata.normalize('NFD', s.replace('đ', 'd').replace('Đ', 'D'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


W = np.array([0.299, 0.587, 0.114])
# C: measured on the floor tiles round the cloth (a little warm, like A)
CAST = {'A': np.array([0.965, 1.009, 1.028]), 'B': np.array([0.922, 1.025, 1.064]),
        'C': np.array([0.97, 0.99, 1.045])}

def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype('uint8'))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=float) / 255

# how much a dim photo is lifted (most, gamma), by room: A / B were taken
# under the shop's dim yellow light; C came out well lit (some already
# edited on the phone) and lifting it as much washed the colours out
LIFT = {'A': (1.35, 0.94), 'B': (1.35, 0.94), 'C': (1.0, 1.0)}

def bright(a, room, warm=False):
    if not warm:   # cream / beige: the room correction would turn them mint
        a = a * (1 + (CAST[room] - 1) * 0.6)
    top, gamma = LIFT[room]
    hi = np.percentile(a @ W, 97)
    a = np.clip(a * min(top, max(1.0, 0.9 / max(hi, 1e-3))), 0, 1) ** gamma
    L = a @ W
    return np.clip(L[..., None] + (a - L[..., None]) * 1.06, 0, 1)

# fabrics whose light part came out tinted by the shop's light, and the
# colour it really is (Anna 14/10/2026: "Caro xanh lá" is green and cream,
# the photo's light squares came out mint): the light part (the brightest
# fifth) is brought to that colour, the rest follows. The white cloths of C:
# the camera took them down to a light grey
WHITE = {'A-185105': np.array([0.94, 0.92, 0.85]),
         'C-153634': np.array([0.95, 0.95, 0.93]), 'C-155547': np.array([0.95, 0.94, 0.90]),
         'C-160311': np.array([0.94, 0.94, 0.92])}

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
    p = os.path.join(src, name + '.jpg')
    if not os.path.exists(p):   # C-<time>: the camera's IMG_20261021_<time>[_edit].jpg
        p = glob.glob(os.path.join(src, 'IMG_*_' + name[2:] + '*.jpg'))[0]
    im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
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
     'A-185836': 1.2, 'B-174537': 1.15, 'B-174441': 1.1, 'B-174820': 1.2,
     'C-145936': 1.1, 'C-152538': 1.2, 'C-155613': 1.15}


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


# Checks and stripes drawn again, straight (Anna 14/10/2026: the photo's
# lines wave with the cloth's folds, the design table should show them as
# straight as the painted fabrics). Straightening the photo itself tore it
# at the folds, so each is woven again from its measurements (a 1 cm grid
# laid over the swatch, colours picked off the photo): the warp colours
# across, the weft down, a twill where both run. Only the big photo the
# design table lays on the pieces (lon/) is drawn; the swatch on the Kho
# vải card stays the photo. Drawn ones show 3 swatch widths (photo_k 3).
DRAWN_K, DRAWN_PX = 3, 960

def sett_line(bands, ppc, n):
    w = np.array([b[0] for b in bands]); edges = np.cumsum(w); rep = edges[-1]
    pos = ((np.arange(n) + 0.5) / ppc) % rep
    idx = np.minimum(np.searchsorted(edges, pos, side='right'), len(bands) - 1)
    cols = np.array([b[1] for b in bands], dtype=float) / 255
    return cols[idx]

def linen(n):
    t = np.asarray(Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'studio', 'vai', 'vai-trung-1.webp')).convert('L'), dtype=float)
    b = np.asarray(Image.fromarray(t.astype('uint8')).filter(ImageFilter.GaussianBlur(6)), dtype=float)
    g = t / np.maximum(b, 1)
    r = int(np.ceil(n / g.shape[0]))
    return np.tile(g, (r, r))[:n, :n]

def woven(spec, cm, size):
    """The cloth woven again: warp colours across x, weft down y (one repeat
    each, in cm); where both run, a 2/2 twill shows one then the other in
    diagonal steps - so a check gets its hatched squares, two colours in
    blocks of 4 make houndstooth. cm: how much cloth the image shows."""
    n = size * 2
    ppc = n / cm
    A = sett_line(spec['x'], ppc, n) if spec.get('x') else None
    B = sett_line(spec['y'], ppc, n) if spec.get('y') else None
    if A is not None and B is not None:
        t = max(1.0, spec.get('twill', 0.1) * ppc)
        Y, X = np.mgrid[0:n, 0:n]
        step = np.floor((X + Y) / t)
        Aa, Bb = np.broadcast_to(A[None, :, :], (n, n, 3)), np.broadcast_to(B[:, None, :], (n, n, 3))
        if spec.get('hatch') == 'dark':
            # the darker thread shows two steps in three (a gingham's
            # hatched squares read as the darker colour, thin light lines)
            dark = (Aa @ np.array([0.3, 0.6, 0.1])) <= (Bb @ np.array([0.3, 0.6, 0.1]))
            D, Lt = np.where(dark[..., None], Aa, Bb), np.where(dark[..., None], Bb, Aa)
            C = np.where((step % 3 != 0)[..., None], D, Lt)
        else:
            C = np.where(((step % 2) == 0)[..., None], Aa, Bb)
    elif A is not None:
        C = np.broadcast_to(A[None, :, :], (n, n, 3))
    else:
        C = np.broadcast_to(B[:, None, :], (n, n, 3))
    # printed blocks over the weave: (x, y, w, h, colour) in cm, each repeat
    if spec.get('blocks'):
        C = np.array(C, dtype=float)
        rx, ry = spec['repeat']
        for bx, by, bw, bh, col in spec['blocks']:
            for ox in np.arange(-rx, cm + rx, rx):
                for oy in np.arange(-ry, cm + ry, ry):
                    x0, y0 = int((ox + bx) * ppc), int((oy + by) * ppc)
                    x1, y1 = int((ox + bx + bw) * ppc), int((oy + by + bh) * ppc)
                    C[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = np.array(col) / 255
    im = Image.fromarray((np.clip(C, 0, 1) * 255).astype('uint8')).resize((size, size), Image.LANCZOS)
    o = np.asarray(im.filter(ImageFilter.GaussianBlur(0.5)), dtype=float) / 255
    o = np.clip(o * (1 + (linen(size)[..., None] - 1) * spec.get('grain', 0.7)), 0, 1)
    return Image.fromarray((o * 255).astype('uint8'))

G, Wc = (16, 116, 56), (232, 233, 214)
BLK, Wh = (28, 31, 33), (224, 229, 226)   # not K: that is make_big's table
NAVY, BLU, LBL = (38, 56, 140), (66, 92, 182), (96, 124, 212)
BK, BR, CR, LG = (36, 38, 41), (128, 104, 86), (220, 218, 210), (168, 162, 156)
VK, VW = (30, 28, 30), (214, 204, 204)
TN, TM, TL = (24, 30, 52), (78, 100, 160), (118, 144, 200)
BAND = [(0.12, TM), (0.12, TL), (0.12, TM), (0.12, TL), (0.12, TM)]
DRAWN = {
    # Caro xanh lá: green 1 cm, cream 0.6 cm, both ways; where green crosses
    # cream the square is hatched, mostly green (as on the cloth)
    'A-185105': {'x': [(1.0, G), (0.6, Wc)], 'y': [(1.0, G), (0.6, Wc)], 'twill': 0.09, 'hatch': 'dark'},
    # Sọc đen trắng: up-down stripes, 1.2 cm repeat, about even
    'B-173947': {'x': [(0.6, BLK), (0.6, Wh)]},
    # Ô nhỏ xanh than: a small blue glen check, about 1 cm
    'A-190250': {'x': [(0.3, BLU), (0.08, NAVY), (0.08, LBL), (0.08, NAVY), (0.3, BLU), (0.16, LBL)],
                 'y': [(0.3, BLU), (0.08, NAVY), (0.08, LBL), (0.08, NAVY), (0.3, BLU), (0.16, LBL)], 'twill': 0.06},
    # Kẻ chéo nâu đen: glen plaid - houndstooth in brown and cream, black
    # lines every 1.7 cm
    'B-173648': {'x': [(0.2, CR), (0.2, BR), (0.2, CR), (0.2, BR), (0.2, CR), (0.2, BR), (0.3, BK), (0.2, CR)],
                 'y': [(0.2, CR), (0.2, BR), (0.2, CR), (0.2, BR), (0.2, CR), (0.2, BR), (0.3, BK), (0.2, CR)], 'twill': 0.1},
    # Nhung đen kẻ sọc: thin cream lines across black velvet, 0.9 cm
    'A-185836': {'y': [(0.84, VK), (0.07, VW)], 'grain': 0.4},
    # Caro trám xanh: light blue squares between bands of fine stripes, a
    # small navy square where two bands cross, a big navy square in every
    # other cell (printed blocks over the weave), 6.5 cm repeat each way
    'A-190149': {'x': [(3.9, TL)] + BAND, 'y': [(3.9, TL)] + BAND, 'twill': 0.12, 'repeat': (9.0, 9.0),
                 'blocks': [(3.9, 3.9, 0.6, 0.6, TN), (8.4, 3.9, 0.6, 0.6, TN), (3.9, 8.4, 0.6, 0.6, TN), (8.4, 8.4, 0.6, 0.6, TN),
                            (4.5, 4.5, 3.9, 3.9, TN)]},
}


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
        if r[0] in DRAWN:
            im, k = woven(DRAWN[r[0]], 13 * DRAWN_K, DRAWN_PX), DRAWN_K
        else:
            im, k = make_big(sys.argv[1], r)
        im.save(os.path.join(out, 'lon', slug(r[2]) + '.webp'), quality=78, method=6)
        print(slug(r[2]), 'k', k)   # photo_k in supabase/migrations/20261015_kho_vai_photo.sql
