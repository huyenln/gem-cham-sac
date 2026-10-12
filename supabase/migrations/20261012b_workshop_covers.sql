-- Ảnh bìa cho 2 loại workshop Chạm Mùa, từ ảnh thật trong images/workshop/.
--
-- CHẠY SAU KHI PR ĐÃ LÊN main (GitHub Pages đã có ảnh). Chạy trước thì trang
-- Workshop đang chạy sẽ hiện ảnh vỡ. Chạy trong Supabase → SQL Editor.
--
-- Đường dẫn tương đối như images/products/: trang workshop.html nằm ở gốc web.
-- Muốn thay ảnh: Quản trị → Đặt lịch → Loại workshop → "Chọn ảnh" / "Thêm ảnh"
-- (ảnh tải lên đó sẽ nằm trong kho gem-media, đè lên đường dẫn ở đây).
--
-- Chỉ ghi khi chưa có ảnh bìa, để không đè ảnh Anna đã tự chọn.
-- Loại "Làm thiệp từ vải vụn" cố ý để trống: chưa có ảnh nào chắc chắn là thiệp.

update public.workshop_types
   set cover  = 'images/workshop/so-cong-ca-hoa.webp',
       images = array['images/workshop/so-vai-vun-thuyen-buom.webp',
                      'images/workshop/buv-lam-bia-so.webp']
 where slug = 'bia-so-vai-vun' and cover is null;

update public.workshop_types
   set cover = 'images/workshop/kinusaiga-ngua.webp'
 where slug = 'kinusaiga' and cover is null;
