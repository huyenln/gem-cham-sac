-- Ảnh bìa cho 12 loại workshop Chạm Mùa còn trống, lấy từ bản in
-- "Thông tin Workshop Chạm Mùa" (trang 4–5: mỗi thẻ workshop một ảnh).
-- Ảnh khớp với loại theo đúng thẻ trong bản in (tên, giá, nguyên liệu cạnh ảnh).
--
-- CHẠY SAU KHI PR ĐÃ LÊN main (GitHub Pages đã có ảnh). Chạy trước thì trang
-- Workshop đang chạy sẽ hiện ảnh vỡ. Chạy trong Supabase → SQL Editor.
--
-- Ảnh trong bản in nhỏ (khoảng 384×288 sau khi cắt 4:3): đủ cho thẻ, hơi mờ ở
-- trang giới thiệu. Có ảnh gốc thì thay ở Quản trị → Đặt lịch → Loại workshop.
--
-- Ảnh bìa chỉ ghi khi chưa có, để không đè ảnh Anna đã tự chọn. Ảnh phụ chỉ
-- nối thêm khi chưa có trong thư viện, chạy lại không sinh ảnh trùng.
-- "Giấy tái chế" không có trong bản in nên vẫn trống.

update public.workshop_types t
   set cover = v.cover
  from (values
    ('lam-thiep-vai-vun',    'images/workshop/thiep-vai-vun.webp'),
    ('so-khau-tay',          'images/workshop/so-khau-tay.webp'),
    ('khau-scrunchie-charm', 'images/workshop/scrunchie-charm.webp'),
    ('khau-may-tai-che',     'images/workshop/khau-may-tui-jean.webp'),
    ('khung-anh-quan-bo',    'images/workshop/khung-anh-quan-bo.webp'),
    ('hop-sua-tai-che',      'images/workshop/hop-sua-tai-che.webp'),
    ('ve-dia-cd',            'images/workshop/dia-cd.webp'),
    ('to-mat-na-giay-boi',   'images/workshop/mat-na-giay-boi.webp'),
    ('to-chuon-tre',         'images/workshop/chuon-tre.webp'),
    ('khac-go',              'images/workshop/khac-go.webp'),
    ('origami-3d',           'images/workshop/origami-3d.webp'),
    ('tranh-thuy-tinh',      'images/workshop/tranh-thuy-tinh.webp')
  ) as v(slug, cover)
 where t.slug = v.slug
   and t.cover is null;

update public.workshop_types t
   set images = coalesce(t.images, '{}') || v.img
  from (values
    ('kinusaiga',          'images/workshop/kinusaiga-cat-vai.webp'),
    ('to-mat-na-giay-boi', 'images/workshop/mat-na-to-mau.webp'),
    ('bia-so-vai-vun',     'images/workshop/so-cong-dap-lo.webp')
  ) as v(slug, img)
 where t.slug = v.slug
   and not (v.img = any(coalesce(t.images, '{}')));
