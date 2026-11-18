-- Workshop Kinusaiga: ba mức giá theo mẫu tranh — 18/11/2026 (Anna).
--   60.000đ  tranh nhỏ hơn, mẫu đơn giản hơn, không có khung bọc viền
--   99.000đ  tranh không có khung bọc viền
--  199.000đ  có khung bọc viền vải / quần bò cũ như Kit DIY Kinusaiga, làm ngay tại Gem
-- Tên: "Làm tranh nhét vải Kinusaiga tái chế" (Anna 18/11; tiếng Anh theo câu giới thiệu kit:
-- "Recycled Kinusaiga … no-sew fabric pictures"). Slug `kinusaiga` giữ nguyên: link
-- workshop.html?loai=kinusaiga ở khối kit và trên tờ in vẫn đúng.
-- Giá đầu 59.000đ → 60.000đ (price_from vẫn bật: thẻ ghi "Từ 60.000đ"). Ghi chú viết lại cả
-- khối (dòng nguyên liệu, dụng cụ giữ nguyên chữ cũ). Chữ không nhắc giá kit (250.000đ) để khỏi
-- lệch khi giá kit đổi.
-- Chỉ dữ liệu, một dòng: không bảng, không GRANT, không policy. Chạy lúc nào cũng được.

update public.workshop_types
   set name_vi = 'Làm tranh nhét vải Kinusaiga tái chế',
       name_en = 'Recycled Kinusaiga: no-sew fabric pictures',
       price = 60000,
       price_from = true,
       note_vi = 'Giá theo mẫu tranh:
60.000đ: tranh nhỏ, mẫu đơn giản hơn, không có khung bọc viền
99.000đ: tranh không có khung bọc viền
199.000đ: tranh có khung bọc viền vải hoặc quần bò cũ, như Kit DIY Kinusaiga, thực hiện tại studio của Gem
Nguyên liệu: bảng xốp đã cắt sẵn rãnh theo mẫu, vải vụn nhiều màu, băng dính 2 mặt
Dụng cụ: kéo, que dùi đầu tù để nhét vải vào rãnh',
       note_en = 'Price by design:
60,000₫: a smaller, simpler picture, no fabric-wrapped frame
99,000₫: a picture with no fabric-wrapped frame
199,000₫: a picture framed in fabric or old denim, like the DIY Kinusaiga kit, made at Gem’s studio
Materials: foam board with the pattern grooves pre-cut, colourful fabric scraps, double-sided tape
Tools: scissors, a blunt stick to tuck the fabric into the grooves'
 where slug = 'kinusaiga';
