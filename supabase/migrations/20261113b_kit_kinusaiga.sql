-- Kit DIY Kinusaiga — 13/11/2026.
-- One card, 4 designs to choose from (products.options), no price yet: the page shows
-- "Liên hệ" until staff set it in admin → Sản phẩm. The video and intro are plain HTML
-- in san-pham.html (#kit-kinusaiga), not in the database.
-- CHẠY SAU KHI MERGE: the photos images/products/kit-kinusaiga-*.jpg and the
-- data-cat="kit" grid on san-pham.html must be on the site first.
-- Data only: no new table, no grant, no policy. Running it again changes nothing
-- (on conflict do nothing).
-- The EPS foam is "tái sử dụng" / "reused", never "tái chế" / "recycled".

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('kit-kinusaiga',
        'kit',
        10,
        null,
        'Kit DIY Kinusaiga',
        'DIY Kinusaiga kit',
        '4 mẫu: ghế nhựa & cà phê · nón lá · hoa hồng · hướng dương',
        '4 designs: plastic stool & coffee · conical hat · rose · sunflower',
        null,
        'images/products/kit-kinusaiga-thumb.jpg',
        array['images/products/kit-kinusaiga-ghe-nhua.jpg','images/products/kit-kinusaiga-non-la.jpg','images/products/kit-kinusaiga-hoa-hong.jpg','images/products/kit-kinusaiga-huong-duong.jpg']::text[],
        '{"label_vi": "Mẫu tranh", "label_en": "Design", "choices": [
           {"key": "ghe-nhua-ca-phe", "vi": "Ghế nhựa & cà phê", "en": "Plastic stool & coffee", "image": "images/products/kit-kinusaiga-ghe-nhua.jpg"},
           {"key": "non-la", "vi": "Nón lá", "en": "Conical hat", "note_vi": "Ảnh chụp lúc tranh gần xong.", "note_en": "Photo taken while the picture was nearly done.", "image": "images/products/kit-kinusaiga-non-la.jpg"},
           {"key": "hoa-hong", "vi": "Hoa hồng", "en": "Rose", "image": "images/products/kit-kinusaiga-hoa-hong.jpg"},
           {"key": "huong-duong", "vi": "Hoa hướng dương", "en": "Sunflower", "image": "images/products/kit-kinusaiga-huong-duong.jpg"}
         ]}'::jsonb,
        'Bộ kit gồm: nền xốp tái sử dụng (đã bọc viền vải bò, tạo rãnh, phủ keo), vải vụn nhiều màu Gem cắt sẵn, dụng cụ thùa khuyết, kéo cắt vải, miếng dán dự phòng và băng urgo.
Kèm tờ hướng dẫn cách làm. Video hướng dẫn ở ngay đầu mục Kit DIY Kinusaiga.
Màu vải trong kit có thể khác ảnh: vải vụn mỗi đợt một khác.
Dụng cụ có đầu nhọn, lưỡi sắc: trẻ em làm tranh cần có người lớn đồng hành.',
        'The kit has a reused foam board (denim-edged, grooved and coated with adhesive), pre-cut fabric scraps in many colours, a seam ripper, thread snips, spare adhesive patches and plasters.
A printed guide comes with it. The video guide is at the top of the DIY Kinusaiga kit section.
The fabric colours may differ from the photos: every batch of scraps is different.
The tools are sharp: children should craft with an adult.',
        true,
        true)
on conflict (sku) do nothing;
