-- Kho vải: the bigger photo of each fabric (14–15/10/2026). On the design
-- table each patch shows its own part of it, at the piece's real scale, so a
-- check no longer repeats in tiles with seams (Anna: "bị chéo vải").
--   photo    the bigger square round the swatch (640px), same checks as img
--   photo_k  its side in swatch widths (a swatch is about 13 cm of cloth)
-- Admin uploads both when a fabric is added. Run before the JS that asks for
-- these columns goes live (js/gem-db.js falls back to the swatch without).

alter table public.fabrics
  add column if not exists photo text check (
    photo is null or photo ~ '^images/[a-z0-9/_.-]+$' or
    photo ~ '^https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+$'),
  add column if not exists photo_k real not null default 1 check (photo_k between 1 and 4);

-- the 71 seeded fabrics (tools/kv-swatches.py)
update public.fabrics f set photo = v.photo, photo_k = v.k
from (values
  ('images/studio/vai-that/tho-xanh-reu.webp', 'images/studio/vai-that/lon/tho-xanh-reu.webp', 1.36),
  ('images/studio/vai-that/caro-xanh-la.webp', 'images/studio/vai-that/lon/caro-xanh-la.webp', 1.6),
  ('images/studio/vai-that/caro-xanh-la-to.webp', 'images/studio/vai-that/lon/caro-xanh-la-to.webp', 1.0),
  ('images/studio/vai-that/gam-la-xanh.webp', 'images/studio/vai-that/lon/gam-la-xanh.webp', 1.43),
  ('images/studio/vai-that/hoa-nen-vang-chanh.webp', 'images/studio/vai-that/lon/hoa-nen-vang-chanh.webp', 1.6),
  ('images/studio/vai-that/hoa-ruc-ro.webp', 'images/studio/vai-that/lon/hoa-ruc-ro.webp', 1.6),
  ('images/studio/vai-that/crepe-xanh-co-vit.webp', 'images/studio/vai-that/lon/crepe-xanh-co-vit.webp', 1.6),
  ('images/studio/vai-that/xanh-dau.webp', 'images/studio/vai-that/lon/xanh-dau.webp', 1.6),
  ('images/studio/vai-that/xanh-coban.webp', 'images/studio/vai-that/lon/xanh-coban.webp', 1.6),
  ('images/studio/vai-that/xanh-than.webp', 'images/studio/vai-that/lon/xanh-than.webp', 1.6),
  ('images/studio/vai-that/to-ong-xanh-nhat.webp', 'images/studio/vai-that/lon/to-ong-xanh-nhat.webp', 1.0),
  ('images/studio/vai-that/o-nho-xanh-than.webp', 'images/studio/vai-that/lon/o-nho-xanh-than.webp', 1.15),
  ('images/studio/vai-that/caro-tram-xanh.webp', 'images/studio/vai-that/lon/caro-tram-xanh.webp', 1.0),
  ('images/studio/vai-that/ke-o-xanh-coban.webp', 'images/studio/vai-that/lon/ke-o-xanh-coban.webp', 1.1),
  ('images/studio/vai-that/voan-hoa-hong-nen-xanh.webp', 'images/studio/vai-that/lon/voan-hoa-hong-nen-xanh.webp', 1.6),
  ('images/studio/vai-that/hoa-hong-to-nen-xanh-nhat.webp', 'images/studio/vai-that/lon/hoa-hong-to-nen-xanh-nhat.webp', 1.6),
  ('images/studio/vai-that/hoa-tiet-o-mau.webp', 'images/studio/vai-that/lon/hoa-tiet-o-mau.webp', 1.0),
  ('images/studio/vai-that/mau-nuoc-tim-xanh.webp', 'images/studio/vai-that/lon/mau-nuoc-tim-xanh.webp', 1.6),
  ('images/studio/vai-that/paisley-nen-xam-xanh.webp', 'images/studio/vai-that/lon/paisley-nen-xam-xanh.webp', 1.6),
  ('images/studio/vai-that/voan-hong.webp', 'images/studio/vai-that/lon/voan-hong.webp', 1.5),
  ('images/studio/vai-that/hong-ruoc.webp', 'images/studio/vai-that/lon/hong-ruoc.webp', 1.6),
  ('images/studio/vai-that/voan-hong-sen.webp', 'images/studio/vai-that/lon/voan-hong-sen.webp', 1.6),
  ('images/studio/vai-that/kaki-hong-tim.webp', 'images/studio/vai-that/lon/kaki-hong-tim.webp', 1.6),
  ('images/studio/vai-that/hong-cam.webp', 'images/studio/vai-that/lon/hong-cam.webp', 1.6),
  ('images/studio/vai-that/cam-san-ho.webp', 'images/studio/vai-that/lon/cam-san-ho.webp', 1.6),
  ('images/studio/vai-that/do-do.webp', 'images/studio/vai-that/lon/do-do.webp', 1.6),
  ('images/studio/vai-that/nhung-tam-do.webp', 'images/studio/vai-that/lon/nhung-tam-do.webp', 1.6),
  ('images/studio/vai-that/nhung-tim.webp', 'images/studio/vai-that/lon/nhung-tim.webp', 1.28),
  ('images/studio/vai-that/hoa-nhi-nen-hong.webp', 'images/studio/vai-that/lon/hoa-nhi-nen-hong.webp', 1.6),
  ('images/studio/vai-that/cuc-nhi-nen-hong.webp', 'images/studio/vai-that/lon/cuc-nhi-nen-hong.webp', 1.6),
  ('images/studio/vai-that/hoa-do-nen-trang.webp', 'images/studio/vai-that/lon/hoa-do-nen-trang.webp', 1.6),
  ('images/studio/vai-that/hoa-anh-dao-nen-trang.webp', 'images/studio/vai-that/lon/hoa-anh-dao-nen-trang.webp', 1.6),
  ('images/studio/vai-that/hoa-van-xoan-hong.webp', 'images/studio/vai-that/lon/hoa-van-xoan-hong.webp', 1.6),
  ('images/studio/vai-that/hoa-pang-xe.webp', 'images/studio/vai-that/lon/hoa-pang-xe.webp', 1.6),
  ('images/studio/vai-that/hoa-tra-nen-hong-dat.webp', 'images/studio/vai-that/lon/hoa-tra-nen-hong-dat.webp', 1.6),
  ('images/studio/vai-that/hoa-pastel-nen-xam.webp', 'images/studio/vai-that/lon/hoa-pastel-nen-xam.webp', 1.6),
  ('images/studio/vai-that/cuc-trang-nen-tim-man.webp', 'images/studio/vai-that/lon/cuc-trang-nen-tim-man.webp', 1.6),
  ('images/studio/vai-that/chim-lua-ruc-ro.webp', 'images/studio/vai-that/lon/chim-lua-ruc-ro.webp', 1.6),
  ('images/studio/vai-that/hinh-hoc-do-hong.webp', 'images/studio/vai-that/lon/hinh-hoc-do-hong.webp', 1.6),
  ('images/studio/vai-that/gam-hoa-van-do-cam.webp', 'images/studio/vai-that/lon/gam-hoa-van-do-cam.webp', 1.6),
  ('images/studio/vai-that/tho-cam-do-gach.webp', 'images/studio/vai-that/lon/tho-cam-do-gach.webp', 1.2),
  ('images/studio/vai-that/satin-be.webp', 'images/studio/vai-that/lon/satin-be.webp', 1.5),
  ('images/studio/vai-that/satin-sam-panh.webp', 'images/studio/vai-that/lon/satin-sam-panh.webp', 1.6),
  ('images/studio/vai-that/voan-nau.webp', 'images/studio/vai-that/lon/voan-nau.webp', 1.6),
  ('images/studio/vai-that/nhung-tam-nau.webp', 'images/studio/vai-that/lon/nhung-tam-nau.webp', 1.33),
  ('images/studio/vai-that/ke-cheo-nau-den.webp', 'images/studio/vai-that/lon/ke-cheo-nau-den.webp', 1.6),
  ('images/studio/vai-that/la-tre-nen-nau.webp', 'images/studio/vai-that/lon/la-tre-nen-nau.webp', 1.6),
  ('images/studio/vai-that/la-phong-nen-kem.webp', 'images/studio/vai-that/lon/la-phong-nen-kem.webp', 1.6),
  ('images/studio/vai-that/da-bao-hoa-ly.webp', 'images/studio/vai-that/lon/da-bao-hoa-ly.webp', 1.6),
  ('images/studio/vai-that/hoa-tiet-nau-xanh-ngoc.webp', 'images/studio/vai-that/lon/hoa-tiet-nau-xanh-ngoc.webp', 1.6),
  ('images/studio/vai-that/hoa-to-son-dau.webp', 'images/studio/vai-that/lon/hoa-to-son-dau.webp', 1.6),
  ('images/studio/vai-that/mang-mau-cam-xanh.webp', 'images/studio/vai-that/lon/mang-mau-cam-xanh.webp', 1.6),
  ('images/studio/vai-that/tho-cam-do-den.webp', 'images/studio/vai-that/lon/tho-cam-do-den.webp', 1.2),
  ('images/studio/vai-that/chap-va-tho-cam.webp', 'images/studio/vai-that/lon/chap-va-tho-cam.webp', 1.6),
  ('images/studio/vai-that/thun-gan-kem.webp', 'images/studio/vai-that/lon/thun-gan-kem.webp', 1.36),
  ('images/studio/vai-that/kem-tron.webp', 'images/studio/vai-that/lon/kem-tron.webp', 1.6),
  ('images/studio/vai-that/da-xam-muoi-tieu.webp', 'images/studio/vai-that/lon/da-xam-muoi-tieu.webp', 1.6),
  ('images/studio/vai-that/ni-xam.webp', 'images/studio/vai-that/lon/ni-xam.webp', 1.6),
  ('images/studio/vai-that/da-xam-than.webp', 'images/studio/vai-that/lon/da-xam-than.webp', 1.6),
  ('images/studio/vai-that/nhung-den-anh-tim.webp', 'images/studio/vai-that/lon/nhung-den-anh-tim.webp', 1.0),
  ('images/studio/vai-that/kim-tuyen-be.webp', 'images/studio/vai-that/lon/kim-tuyen-be.webp', 1.6),
  ('images/studio/vai-that/xam-ke-cheo.webp', 'images/studio/vai-that/lon/xam-ke-cheo.webp', 1.6),
  ('images/studio/vai-that/soc-den-trang.webp', 'images/studio/vai-that/lon/soc-den-trang.webp', 1.6),
  ('images/studio/vai-that/nhung-den-ke-soc.webp', 'images/studio/vai-that/lon/nhung-den-ke-soc.webp', 1.2),
  ('images/studio/vai-that/cham-bi-den.webp', 'images/studio/vai-that/lon/cham-bi-den.webp', 1.25),
  ('images/studio/vai-that/cham-bi-trang-nen-den.webp', 'images/studio/vai-that/lon/cham-bi-trang-nen-den.webp', 1.15),
  ('images/studio/vai-that/sao-nho-nen-den.webp', 'images/studio/vai-that/lon/sao-nho-nen-den.webp', 1.6),
  ('images/studio/vai-that/hat-tram-nen-den.webp', 'images/studio/vai-that/lon/hat-tram-nen-den.webp', 1.6),
  ('images/studio/vai-that/hoa-pastel-nen-den.webp', 'images/studio/vai-that/lon/hoa-pastel-nen-den.webp', 1.6),
  ('images/studio/vai-that/paisley-nen-den.webp', 'images/studio/vai-that/lon/paisley-nen-den.webp', 1.6),
  ('images/studio/vai-that/van-huou-den-trang.webp', 'images/studio/vai-that/lon/van-huou-den-trang.webp', 1.1)
) as v(img, photo, k)
where f.img = v.img and f.photo is null;
