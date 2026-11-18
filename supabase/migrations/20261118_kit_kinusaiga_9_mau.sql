-- Kit DIY Kinusaiga: 9 mẫu có độ khó + kit theo yêu cầu — 18/11/2026.
--
-- 1. kit-kinusaiga: 4 → 9 Mẫu (thêm mèo béo, hoa sen, rối nước cô tiên, nón quai thao,
--    mèo nằm ngửa), xếp từ dễ đến khó. Mỗi Mẫu có `level` (1–5 sao, bước nửa sao) —
--    js/gallery.js vẽ sao, admin.js giữ `level` khi lưu. Ảnh "nón lá" cũ thật ra là nón
--    quai thao: giờ là ảnh riêng của Mẫu nón quai thao, nón lá có ảnh thật.
--    Chỉ đổi options, gallery, desc: KHÔNG đụng giá (250.000đ), còn/hết, ghi chú.
-- 2. kit-kinusaiga-theo-yeu-cau: thẻ mới, giá để trống ("Liên hệ") vì Gem báo giá
--    theo thiết kế (từ 300.000đ, ghi ở mô tả). Trả trước 30% (không gọi là "cọc": Anna 18/11), Gem nhắn thông tin chuyển khoản.
--
-- 0. product_options_ok(): `level`, nếu có, phải là số 1–5 theo bước 0,5. Thân hàm
--    giữ nguyên như bản đang chạy, chỉ thêm đúng điều kiện đó. CREATE OR REPLACE giữ
--    quyền cũ; ràng buộc CHECK chỉ kiểm dòng được ghi sau này.
--
-- CHẠY NGAY SAU KHI MERGE: ảnh images/products/kit-kinusaiga-*.jpg phải có trên web
-- trước. Chạy ngay để Mẫu không bị sửa trong admin giữa chừng (câu 1 ghi đè options).
-- Không bảng, không GRANT, không policy. Chạy lại không sinh dòng thừa.

create or replace function public.product_options_ok(o jsonb)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select o is null or (
    jsonb_typeof(o) = 'object'
    and jsonb_typeof(o->'choices') = 'array'
    and jsonb_array_length(o->'choices') between 1 and 60
    and char_length(coalesce(o->>'label_vi', '')) between 1 and 40
    and char_length(coalesce(o->>'label_en', '')) <= 40
    and not exists (
      select 1 from jsonb_array_elements(o->'choices') c
      where jsonb_typeof(c) <> 'object'
         or coalesce(c->>'key', '') !~ '^[a-z0-9-]{1,40}$'
         or char_length(coalesce(c->>'vi', '')) not between 1 and 60
         or char_length(coalesce(c->>'en', '')) > 60
         or char_length(coalesce(c->>'note_vi', '')) > 300
         or char_length(coalesce(c->>'note_en', '')) > 300
         or (c ? 'out' and jsonb_typeof(c->'out') <> 'boolean')
         or (c ? 'image' and jsonb_typeof(c->'image') <> 'null' and coalesce(c->>'image', '') !~
               '^(images/products/[a-z0-9_.-]+\.(webp|png|jpe?g)|https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+)$')
         or (c ? 'cut' and jsonb_typeof(c->'cut') <> 'null' and coalesce(c->>'cut', '') !~
               '^(images/studio/[a-z0-9/_-]+\.(webp|png)|https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+)$')
         -- difficulty: 1, 1.5 … 5 (stars on the choice)
         or (c ? 'level' and case when jsonb_typeof(c->'level') = 'number'
               then not ((c->>'level')::numeric between 1 and 5
                         and (c->>'level')::numeric * 2 = trunc((c->>'level')::numeric * 2))
               else true end)
    )
    and (select count(distinct c->>'key') from jsonb_array_elements(o->'choices') c)
        = jsonb_array_length(o->'choices')
  )
$function$;

update public.products
   set options = '{"label_vi": "Mẫu tranh", "label_en": "Design", "choices": [
         {"key": "non-la", "vi": "Nón lá", "en": "Conical hat", "level": 1, "image": "images/products/kit-kinusaiga-non-la.jpg"},
         {"key": "meo-beo", "vi": "Mèo béo", "en": "Chubby cat", "level": 1, "image": "images/products/kit-kinusaiga-meo-beo.jpg"},
         {"key": "hoa-hong", "vi": "Hoa hồng", "en": "Rose", "level": 2, "image": "images/products/kit-kinusaiga-hoa-hong.jpg"},
         {"key": "huong-duong", "vi": "Hoa hướng dương", "en": "Sunflower", "level": 2, "image": "images/products/kit-kinusaiga-huong-duong.jpg"},
         {"key": "hoa-sen", "vi": "Hoa sen", "en": "Lotus", "level": 3, "image": "images/products/kit-kinusaiga-hoa-sen.jpg"},
         {"key": "roi-nuoc-co-tien", "vi": "Rối nước cô tiên", "en": "Water puppet fairy", "level": 3, "image": "images/products/kit-kinusaiga-roi-nuoc-co-tien.jpg"},
         {"key": "non-quai-thao", "vi": "Nón quai thao", "en": "Quai thao flat hat", "level": 3.5, "image": "images/products/kit-kinusaiga-non-quai-thao.jpg"},
         {"key": "ghe-nhua-ca-phe", "vi": "Ghế nhựa & cà phê", "en": "Vietnamese sidewalk coffee", "level": 4, "image": "images/products/kit-kinusaiga-ghe-nhua.jpg"},
         {"key": "meo-nam-ngua", "vi": "Mèo nằm ngửa", "en": "Belly-up cat", "level": 5, "image": "images/products/kit-kinusaiga-meo-nam-ngua.jpg"}
       ]}'::jsonb,
       gallery = array[
         'images/products/kit-kinusaiga-non-la.jpg',
         'images/products/kit-kinusaiga-meo-beo.jpg',
         'images/products/kit-kinusaiga-hoa-hong.jpg',
         'images/products/kit-kinusaiga-huong-duong.jpg',
         'images/products/kit-kinusaiga-hoa-sen.jpg',
         'images/products/kit-kinusaiga-roi-nuoc-co-tien.jpg',
         'images/products/kit-kinusaiga-non-quai-thao.jpg',
         'images/products/kit-kinusaiga-ghe-nhua.jpg',
         'images/products/kit-kinusaiga-meo-nam-ngua.jpg',
         'images/products/kit-kinusaiga-non-la-2.jpg',
         'images/products/kit-kinusaiga-non-la-3.jpg',
         'images/products/kit-kinusaiga-non-la-4.jpg',
         'images/products/kit-kinusaiga-hoa-hong-2.jpg',
         'images/products/kit-kinusaiga-huong-duong-2.jpg',
         'images/products/kit-kinusaiga-non-quai-thao-2.jpg',
         'images/products/kit-kinusaiga-ghe-nhua-2.jpg'
       ]::text[],
       desc_vi = '9 mẫu tranh, độ khó từ 1 đến 5 sao',
       desc_en = '9 designs, difficulty from 1 to 5 stars',
       updated_at = now()
 where sku = 'kit-kinusaiga';

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('kit-kinusaiga-theo-yeu-cau',
        'kit',
        20,
        null,
        'Kit Kinusaiga theo yêu cầu',
        'Custom Kinusaiga kit',
        'Từ 300.000đ · Gem thiết kế từ ảnh hoặc ý tưởng của bạn',
        'From 300,000₫ · Gem designs it from your photo or idea',
        null,
        'images/products/kit-kinusaiga-theo-yeu-cau-thumb.jpg',
        array['images/products/kit-kinusaiga-theo-yeu-cau.jpg','images/products/kit-kinusaiga-theo-yeu-cau-2.jpg','images/products/kit-kinusaiga-theo-yeu-cau-3.jpg']::text[],
        null,
        'Cách đặt:
1. Gửi ảnh hoặc ý tưởng cho Gem qua Zalo, Messenger, Instagram hoặc email; hoặc đặt hàng tại đây và ghi ý tưởng trong phần ghi chú của đơn.
2. Gem báo giá theo độ chi tiết và độ khó của thiết kế, từ 300.000đ.
3. Sau khi chốt giá, bạn trả trước 30%; Gem gửi thông tin chuyển khoản qua Zalo. Phần còn lại thanh toán khi nhận kit.
4. Gem hoàn thiện kit trong 3–5 ngày; ngày cụ thể được thống nhất khi trao đổi.
Hàng đặt riêng không áp dụng đổi trả, trừ trường hợp lỗi do Gem.
Huỷ đơn sau khi đã trả trước: Gem giữ khoản trả trước. Gem hoàn lại khoản này nếu Gem không hoàn thành đúng ngày đã hẹn hoặc không thực hiện được thiết kế đã chốt; các trường hợp khác, Gem xem xét theo lý do bạn đưa ra.
Dụng cụ có đầu nhọn, lưỡi sắc: trẻ em cần có người lớn đi cùng khi làm tranh.',
        'How to order:
1. Send Gem your photo or idea by Zalo, Messenger, Instagram or email; or order here and describe your idea in the order note.
2. Gem quotes a price according to the detail and difficulty of the design, from 300,000₫.
3. Once the price is agreed, you pay 30% in advance; Gem sends the bank details by message. The balance is paid when you receive the kit.
4. Gem completes the kit in 3–5 days; the exact date is agreed with you.
Made-to-order pieces cannot be exchanged or returned, except for faults on Gem’s side.
Cancelling after the advance payment: Gem retains the advance payment. Gem refunds it if Gem does not complete the work by the agreed date or cannot produce the agreed design; in other cases, Gem considers the reason you give.
The tools are sharp: children should work with an adult.',
        true,
        true)
on conflict (sku) do nothing;
