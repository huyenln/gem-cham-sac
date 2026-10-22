-- Kho vải: 57 fabrics from the Drive folder "Phòng lớn - sau cửa treo đồ"
-- (photographed 21/10/2026). Three were photographed twice and are left out.
-- Like the first seed, names, materials and kinds are guesses from the
-- photos: staff fix them in admin.html → Kho vải. Photos: images/studio/vai-that/
-- (tools/kv-swatches.py, rows C-*); they must be live (merged) before this runs,
-- or the basket shows empty squares.
-- New rows take the next ids (whatever staff added in admin meanwhile stays).
-- Safe to run twice: a fabric whose photo is already there is skipped.

with v (name_vi, name_en, tone, kind, material, img, photo, photo_k, sort_order) as (values
  ('Voan xanh lục đậm', 'Deep teal-green chiffon', 'xanh', 'tron', 'Voan', 'images/studio/vai-that/voan-xanh-luc-dam.webp', 'images/studio/vai-that/lon/voan-xanh-luc-dam.webp', 1.6, 720),
  ('Xanh xô thơm', 'Sage green crinkle', 'xanh', 'tron', 'Vải pha', 'images/studio/vai-that/xanh-xo-thom.webp', 'images/studio/vai-that/lon/xanh-xo-thom.webp', 1.6, 730),
  ('Nhung sen nền xanh than', 'Lotus on navy velvet', 'lam', 'hoato', 'Nhung', 'images/studio/vai-that/nhung-sen-nen-xanh-than.webp', 'images/studio/vai-that/lon/nhung-sen-nen-xanh-than.webp', 1.1, 740),
  ('Họa tiết xanh lá nền than', 'Green shapes on navy', 'lam', 'hoato', 'Vải pha', 'images/studio/vai-that/hoa-tiet-xanh-la-nen-than.webp', 'images/studio/vai-that/lon/hoa-tiet-xanh-la-nen-than.webp', 1.6, 750),
  ('Voan lưới xanh biển', 'Ocean blue tulle', 'lam', 'tron', 'Voan', 'images/studio/vai-that/voan-luoi-xanh-bien.webp', 'images/studio/vai-that/lon/voan-luoi-xanh-bien.webp', 1.6, 760),
  ('Gấm hoa xanh tím', 'Blue-violet floral jacquard', 'lam', 'hoa', 'Gấm', 'images/studio/vai-that/gam-hoa-xanh-tim.webp', 'images/studio/vai-that/lon/gam-hoa-xanh-tim.webp', 1.6, 770),
  ('Xếp ly xanh hoàng gia', 'Royal blue pintucks', 'lam', 'soc', 'Vải pha', 'images/studio/vai-that/xep-ly-xanh-hoang-gia.webp', 'images/studio/vai-that/lon/xep-ly-xanh-hoang-gia.webp', 1.6, 780),
  ('Tím than', 'Indigo violet', 'lam', 'tron', 'Vải pha', 'images/studio/vai-that/tim-than.webp', 'images/studio/vai-that/lon/tim-than.webp', 1.6, 790),
  ('Xanh hoàng gia', 'Royal blue', 'lam', 'tron', 'Vải pha', 'images/studio/vai-that/xanh-hoang-gia.webp', 'images/studio/vai-that/lon/xanh-hoang-gia.webp', 1.6, 800),
  ('Ren lá hồng', 'Pink leaf lace', 'hong', 'ren', 'Ren', 'images/studio/vai-that/ren-la-hong.webp', 'images/studio/vai-that/lon/ren-la-hong.webp', 1.6, 810),
  ('Ren hoa đỏ đô', 'Burgundy floral lace', 'hong', 'ren', 'Ren', 'images/studio/vai-that/ren-hoa-do-do.webp', 'images/studio/vai-that/lon/ren-hoa-do-do.webp', 1.6, 820),
  ('Gấm lá tím mận', 'Plum leaf jacquard', 'hong', 'hoato', 'Gấm', 'images/studio/vai-that/gam-la-tim-man.webp', 'images/studio/vai-that/lon/gam-la-tim-man.webp', 1.6, 830),
  ('Nhung tăm đỏ rượu', 'Wine corduroy', 'hong', 'soc', 'Nhung tăm', 'images/studio/vai-that/nhung-tam-do-ruou.webp', 'images/studio/vai-that/lon/nhung-tam-do-ruou.webp', 1.6, 840),
  ('Hoa hồng nền tối', 'Pink blooms on dark', 'hong', 'hoato', 'Vải pha', 'images/studio/vai-that/hoa-hong-nen-toi.webp', 'images/studio/vai-that/lon/hoa-hong-nen-toi.webp', 1.6, 850),
  ('Đỏ thẫm', 'Deep red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-tham.webp', 'images/studio/vai-that/lon/do-tham.webp', 1.6, 860),
  ('Voan tơ hồng', 'Pink organza', 'hong', 'tron', 'Voan', 'images/studio/vai-that/voan-to-hong.webp', 'images/studio/vai-that/lon/voan-to-hong.webp', 1.6, 870),
  ('Tafta tím hồng', 'Magenta taffeta', 'hong', 'tron', 'Tafta', 'images/studio/vai-that/tafta-tim-hong.webp', 'images/studio/vai-that/lon/tafta-tim-hong.webp', 1.6, 880),
  ('Đỏ gạch', 'Brick red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-gach.webp', 'images/studio/vai-that/lon/do-gach.webp', 1.6, 890),
  ('Voan hồng rực', 'Hot pink voile', 'hong', 'tron', 'Voan', 'images/studio/vai-that/voan-hong-ruc.webp', 'images/studio/vai-that/lon/voan-hong-ruc.webp', 1.6, 900),
  ('Đỏ san hô', 'Coral red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-san-ho.webp', 'images/studio/vai-that/lon/do-san-ho.webp', 1.6, 910),
  ('Đỏ huyết dụ', 'Crimson', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-huyet-du.webp', 'images/studio/vai-that/lon/do-huyet-du.webp', 1.6, 920),
  ('Tafta hồng tro', 'Ash-rose taffeta', 'hong', 'tron', 'Tafta', 'images/studio/vai-that/tafta-hong-tro.webp', 'images/studio/vai-that/lon/tafta-hong-tro.webp', 1.6, 930),
  ('Đỏ son', 'Lipstick red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-son.webp', 'images/studio/vai-that/lon/do-son.webp', 1.6, 940),
  ('Đỏ cam', 'Orange-red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-cam.webp', 'images/studio/vai-that/lon/do-cam.webp', 1.6, 950),
  ('Tafta tím khói', 'Smoky lilac taffeta', 'hong', 'tron', 'Tafta', 'images/studio/vai-that/tafta-tim-khoi.webp', 'images/studio/vai-that/lon/tafta-tim-khoi.webp', 1.6, 960),
  ('Đỏ tươi', 'Bright red', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/do-tuoi.webp', 'images/studio/vai-that/lon/do-tuoi.webp', 1.6, 970),
  ('Hồng mâm xôi', 'Raspberry', 'hong', 'tron', 'Vải pha', 'images/studio/vai-that/hong-mam-xoi.webp', 'images/studio/vai-that/lon/hong-mam-xoi.webp', 1.6, 980),
  ('Satin vàng nghệ', 'Turmeric satin', 'nau', 'tron', 'Satin', 'images/studio/vai-that/satin-vang-nghe.webp', 'images/studio/vai-that/lon/satin-vang-nghe.webp', 1.6, 990),
  ('Kim tuyến vàng ô liu', 'Olive-gold lamé', 'nau', 'tron', 'Kim tuyến', 'images/studio/vai-that/kim-tuyen-vang-o-liu.webp', 'images/studio/vai-that/lon/kim-tuyen-vang-o-liu.webp', 1.6, 1000),
  ('Voan ánh đồng', 'Bronze shot organza', 'nau', 'tron', 'Voan', 'images/studio/vai-that/voan-anh-dong.webp', 'images/studio/vai-that/lon/voan-anh-dong.webp', 1.6, 1010),
  ('Hoa nhí nền kaki', 'Ditsy flowers on khaki', 'nau', 'hoa', 'Vải pha', 'images/studio/vai-that/hoa-nhi-nen-kaki.webp', 'images/studio/vai-that/lon/hoa-nhi-nen-kaki.webp', 1.6, 1020),
  ('Thun vàng mù tạt', 'Mustard knit', 'nau', 'tron', 'Thun', 'images/studio/vai-that/thun-vang-mu-tat.webp', 'images/studio/vai-that/lon/thun-vang-mu-tat.webp', 1.6, 1030),
  ('Gấm hoa văn nâu đen', 'Dark brown damask', 'nau', 'hoato', 'Gấm', 'images/studio/vai-that/gam-hoa-van-nau-den.webp', 'images/studio/vai-that/lon/gam-hoa-van-nau-den.webp', 1.6, 1040),
  ('Vàng đất', 'Ochre', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/vang-dat.webp', 'images/studio/vai-that/lon/vang-dat.webp', 1.6, 1050),
  ('Vàng rêu', 'Olive yellow', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/vang-reu.webp', 'images/studio/vai-that/lon/vang-reu.webp', 1.6, 1060),
  ('Nâu tím', 'Plum brown', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/nau-tim.webp', 'images/studio/vai-that/lon/nau-tim.webp', 1.6, 1070),
  ('Nâu than', 'Charcoal brown', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/nau-than.webp', 'images/studio/vai-that/lon/nau-than.webp', 1.6, 1080),
  ('Nâu bò', 'Tan', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/nau-bo.webp', 'images/studio/vai-that/lon/nau-bo.webp', 1.6, 1090),
  ('Vàng hoa cải', 'Mustard-flower yellow', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/vang-hoa-cai.webp', 'images/studio/vai-that/lon/vang-hoa-cai.webp', 1.6, 1100),
  ('Thun màu da', 'Nude knit', 'nau', 'tron', 'Thun', 'images/studio/vai-that/thun-mau-da.webp', 'images/studio/vai-that/lon/thun-mau-da.webp', 1.6, 1110),
  ('Tafta cam', 'Orange taffeta', 'nau', 'tron', 'Tafta', 'images/studio/vai-that/tafta-cam.webp', 'images/studio/vai-that/lon/tafta-cam.webp', 1.6, 1120),
  ('Vàng mơ', 'Apricot', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/vang-mo.webp', 'images/studio/vai-that/lon/vang-mo.webp', 1.6, 1130),
  ('Cam tươi', 'Bright orange', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/cam-tuoi.webp', 'images/studio/vai-that/lon/cam-tuoi.webp', 1.6, 1140),
  ('Be nâu', 'Camel', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/be-nau.webp', 'images/studio/vai-that/lon/be-nau.webp', 1.6, 1150),
  ('Cam đất', 'Terracotta', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/cam-dat.webp', 'images/studio/vai-that/lon/cam-dat.webp', 1.6, 1160),
  ('Vàng ô liu', 'Olive gold', 'nau', 'tron', 'Vải pha', 'images/studio/vai-that/vang-o-liu.webp', 'images/studio/vai-that/lon/vang-o-liu.webp', 1.6, 1170),
  ('Đũi xám', 'Grey slub linen', 'trung', 'tron', 'Đũi / linen', 'images/studio/vai-that/dui-xam.webp', 'images/studio/vai-that/lon/dui-xam.webp', 1.6, 1180),
  ('Ren hoa trắng', 'White floral lace', 'trung', 'ren', 'Ren', 'images/studio/vai-that/ren-hoa-trang.webp', 'images/studio/vai-that/lon/ren-hoa-trang.webp', 1.6, 1190),
  ('Xám nhạt', 'Light grey', 'trung', 'tron', 'Cotton', 'images/studio/vai-that/xam-nhat.webp', 'images/studio/vai-that/lon/xam-nhat.webp', 1.6, 1200),
  ('Nâu đen', 'Black-brown', 'trung', 'tron', 'Vải pha', 'images/studio/vai-that/nau-den.webp', 'images/studio/vai-that/lon/nau-den.webp', 1.6, 1210),
  ('Ren thêu kem', 'Cream embroidered tulle', 'trung', 'ren', 'Ren', 'images/studio/vai-that/ren-theu-kem.webp', 'images/studio/vai-that/lon/ren-theu-kem.webp', 1.2, 1220),
  ('Trắng trơn', 'Plain white', 'trung', 'tron', 'Cotton', 'images/studio/vai-that/trang-tron.webp', 'images/studio/vai-that/lon/trang-tron.webp', 1.6, 1230),
  ('Trắng ngà', 'Off-white', 'trung', 'tron', 'Vải pha', 'images/studio/vai-that/trang-nga.webp', 'images/studio/vai-that/lon/trang-nga.webp', 1.6, 1240),
  ('Paisley trắng nền xám', 'White paisley on grey', 'trung', 'hoato', 'Vải pha', 'images/studio/vai-that/paisley-trang-nen-xam.webp', 'images/studio/vai-that/lon/paisley-trang-nen-xam.webp', 1.15, 1250),
  ('Trắng sữa', 'Milk white', 'trung', 'tron', 'Lụa', 'images/studio/vai-that/trang-sua.webp', 'images/studio/vai-that/lon/trang-sua.webp', 1.6, 1260),
  ('Đen xương cá', 'Black herringbone', 'trung', 'tron', 'Vải pha', 'images/studio/vai-that/den-xuong-ca.webp', 'images/studio/vai-that/lon/den-xuong-ca.webp', 1.6, 1270),
  ('Xám rêu', 'Grey-green', 'trung', 'tron', 'Kaki', 'images/studio/vai-that/xam-reu.webp', 'images/studio/vai-that/lon/xam-reu.webp', 1.6, 1280)
), added as (
  insert into public.fabrics (name_vi, name_en, tone, kind, material, img, photo, photo_k, sort_order)
  select name_vi, name_en, tone, kind, material, img, photo, photo_k, sort_order from v
  where not exists (select 1 from public.fabrics f where f.img = v.img)
  returning id
)
insert into public.fabric_private (fabric_id, place)
select id, 'Phòng lớn, sau cửa treo đồ' from added
on conflict (fabric_id) do nothing;
