-- Kho vải: one row per fabric (14/10/2026). The Drive folder has two or three
-- photos of some fabrics (close up, further away, the back), and the seed
-- (20261014b) made a row of each. These five are the same cloth as the row
-- kept beside them, so they go; js/patch.js maps their old r<id> to the kept
-- one, so designs already shared still show the right cloth.
--
--   3  Caro xanh lá to            = 2  Caro xanh lá
--   16 Hoa hồng to nền xanh nhạt  = 15 Voan hoa hồng nền xanh
--   14 Kẻ ô xanh coban            = 12 (renamed Ô nhỏ xanh coban)
--   57 Dạ xám muối tiêu           = 59 Dạ xám than (its back: a two-faced wool)
--   53 Thổ cẩm đỏ đen             = 41 Thổ cẩm đỏ gạch (another part of the print)
--
-- Three checks / stripes were photographed at a slant; their photos are now
-- turned straight (same file names), and two get truer names.
-- fabric_private rows go with them (on delete cascade). Nothing else points
-- at fabrics. Safe to run twice.

delete from public.fabrics where id in (3, 16, 14, 57, 53);

update public.fabrics set name_vi = 'Ô nhỏ xanh coban', name_en = 'Small cobalt check' where id = 12;
update public.fabrics set name_vi = 'Caro lớn xanh đen', name_en = 'Big blue and black check' where id = 13;
update public.fabrics set name_vi = 'Kẻ ô nâu đen', name_en = 'Brown and black check' where id = 46;
update public.fabrics set material = 'Dạ hai mặt, mặt trái xám nhạt' where id = 59;
