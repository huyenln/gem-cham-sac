-- Re.socks, second batch of photos (14/10/2026): three of the four pairs that
-- were hidden waiting for photos get them and go on sale. "Hộp tất Cái Thứ
-- Gì" stays hidden (no photo yet). Suôn Sẻ (Tất Đất Nước) has no photo of its
-- own yet: the card shows Tất Thắng.

update public.products set
  image = 'images/products/ky-gui-tat-tai-xinh-tron-thumb.webp',
  gallery = array['images/products/ky-gui-tat-tai-xinh-tron.webp'],
  is_published = true
where sku = 'tat-tai-xinh-tron';

update public.products set
  image = 'images/products/ky-gui-tat-thang-thumb.webp',
  gallery = array['images/products/ky-gui-tat-thang.webp', 'images/products/ky-gui-tat-thang-poster.webp'],
  is_published = true
where sku = 'tat-dat-nuoc';

update public.products set
  image = 'images/products/ky-gui-tat-bac-hoc-thumb.webp',
  gallery = array['images/products/ky-gui-tat-bac-hoc.webp', 'images/products/ky-gui-tat-hoc-duong-poster.webp'],
  is_published = true
where sku = 'tat-hoc-duong';
