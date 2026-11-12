-- Kinusaiga (13/11/2026): xốp Gem dùng là xốp TÁI SỬ DỤNG, không phải tái chế.
-- Gem chỉ dùng lại tấm xốp, không có bước tái chế nào; "tái chế" là nói sai.
--
-- 20261012_workshop_cham_mua.sql đã ghi "tấm xốp tái chế" / "recycled foam
-- board" vào dòng kinusaiga và đã chạy, nên sửa file cũ không đổi gì trên web.
-- File này chỉ đổi đúng cụm chữ đó trong 4 ô (desc_vi/en, long_vi/en) bằng
-- replace(): phần chữ còn lại giữ nguyên, kể cả nếu đã sửa trong Quản trị.
-- Chạy lại lần hai không đổi gì thêm.
-- ĐÃ CHẠY 13/11/2026 (migration kinusaiga_xop_tai_su_dung).
--
-- Chỉ sửa dữ liệu, không đụng GRANT / policy. Vẫn chạy câu kiểm
-- GRANT-vs-policy trong docs/design.md sau khi chạy.

update public.workshop_types set
  desc_vi = replace(desc_vi, 'xốp tái chế', 'xốp tái sử dụng'),
  long_vi = replace(long_vi, 'xốp tái chế', 'xốp tái sử dụng'),
  desc_en = replace(desc_en, 'recycled foam board', 'reused foam board'),
  long_en = replace(long_en, 'recycled foam board', 'reused foam board')
where slug = 'kinusaiga';

-- Kiểm sau khi chạy: phải ra 0 dòng.
-- select slug from public.workshop_types
--  where concat_ws(' ', desc_vi, long_vi, what_vi, note_vi) ~* 'xốp[^.]*tái chế'
--     or concat_ws(' ', desc_en, long_en, what_en, note_en) ~* 'recycled[^.]*foam';
