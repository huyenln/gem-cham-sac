-- Re.socks, second batch of photos (14/10/2026): three of the four pairs that
-- were hidden waiting for photos get them and go on sale. Anna's poster
-- ("Ký gửi tại Gem Chạm Sắc") is the card and comes first in the gallery;
-- Re.socks' own shot follows. The card is square: it shows the middle of the
-- poster (the words + the polaroid).
-- "Hộp tất Cái Thứ Gì" stays hidden (no photo yet). Suôn Sẻ (Tất Đất Nước)
-- has no photo of its own yet.

update public.products set
  image = 'images/products/ky-gui-tat-tai-xinh-tron.webp',
  gallery = array['images/products/ky-gui-tat-tai-xinh-tron.webp'],
  is_published = true
where sku = 'tat-tai-xinh-tron';

update public.products set
  image = 'images/products/ky-gui-tat-thang-poster.webp',
  gallery = array['images/products/ky-gui-tat-thang-poster.webp', 'images/products/ky-gui-tat-thang.webp'],
  is_published = true
where sku = 'tat-dat-nuoc';

update public.products set
  image = 'images/products/ky-gui-tat-hoc-duong-poster.webp',
  gallery = array['images/products/ky-gui-tat-hoc-duong-poster.webp', 'images/products/ky-gui-tat-bac-hoc.webp'],
  is_published = true
where sku = 'tat-hoc-duong';

-- Anna's second message (14/10): Re.socks' own shots after the posters, and
-- the "Cái Thứ Gì" box poster (the box goes on sale).
update public.products set
  gallery = array['images/products/ky-gui-tat-tai-xinh-tron.webp', 'images/products/ky-gui-tat-tai-xinh-tron-den.webp']
where sku = 'tat-tai-xinh-tron';

update public.products set
  gallery = array['images/products/ky-gui-tat-tai-xinh.webp', 'images/products/ky-gui-tat-tai-xinh-xam.webp']
where sku = 'tat-tai-xinh-ngan';

update public.products set
  image = 'images/products/ky-gui-tat-cai-thu-gi.webp',
  gallery = array['images/products/ky-gui-tat-cai-thu-gi.webp'],
  is_published = true
where sku = 'tat-cai-thu-gi';
