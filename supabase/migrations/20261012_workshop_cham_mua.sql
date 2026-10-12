-- Chạm Mùa (10/2026): chuỗi workshop cuối tuần 25/09 – 27/12/2026.
-- Giá, chữ "Từ", độ tuổi, thời lượng, nguyên liệu và dụng cụ chép từ bản
-- "Thông tin Workshop Chạm Mùa" (VI + EN).
--
-- 1. Ba cột mới để thẻ workshop nói đúng như bản in:
--      duration_max  thời lượng dài nhất (phút); null = đúng bằng duration_minutes
--      age_min       0 = mọi lứa tuổi, n = từ n tuổi, null = không ghi
--      price_from    true thì web ghi "Từ 59.000đ" (giá khởi điểm, tuỳ mẫu)
-- 2. "Bìa sổ vải vụn" chính là "Sổ còng từ vải vụn" (đã xác nhận 12/10/2026):
--    cập nhật dòng cũ, GIỮ slug để link ?loai=bia-so-vai-vun cũ vẫn mở được.
-- 3. Thêm 13 loại mới. "Giấy tái chế" vẫn "Liên hệ" (bản in không có giá).
--
-- Không cần GRANT mới: cột thêm vào bảng đã GRANT ở mức bảng thì dùng được
-- luôn. Vẫn chạy câu kiểm GRANT-vs-policy trong docs/design.md sau khi chạy.

alter table public.workshop_types
  add column if not exists duration_max integer check (duration_max between 15 and 600),
  add column if not exists age_min      integer check (age_min between 0 and 99),
  add column if not exists price_from   boolean not null default false;

update public.workshop_types set
  name_vi = 'Sổ còng từ vải vụn',
  name_en = 'Fabric-scrap ring binder',
  desc_en = 'Cover a ring binder by hand with fabric scraps — pick the fabric, cut, piece, punch the holes and add the rings.',
  long_en = E'An unhurried session together, nobody rushes anybody.\n\nWe bring out a basket of fabric scraps, left over from the bags and cushions we''ve finished. You pick the pieces you like, cut, piece them together, then punch the holes and add the rings.\n\nYou take the notebook home at the end.',
  what_en = E'Pick fabric from the studio''s scrap basket\nCut and piece it the way you like\nPunch the holes and add the rings\nChoose paper and punch it to fit your DIY notebook\nTake your notebook home at the end',
  note_vi = E'Sổ và vải chúng mình chuẩn bị sẵn, bạn không phải mang gì\nNguyên liệu: vải vụn bọc bìa, bìa cứng, giấy ruột sổ, còng sổ, giấy than\nDụng cụ: kéo, keo sữa, đục lỗ, bàn cắt giấy\nĐi cùng bạn bè được, nhớ giữ chỗ cho cả nhóm',
  note_en = E'We prepare the notebook and fabric, so you don''t need to bring anything\nMaterials: fabric scraps for the cover, hardboard, notebook paper, binder rings, carbon paper\nTools: scissors, white glue, hole punch, paper cutter\nBring friends along, just reserve seats for the whole group',
  duration_minutes = 90, duration_max = 120, age_min = 10,
  price = 99000, price_from = true,
  sort_order = 20
where slug = 'bia-so-vai-vun';

update public.workshop_types set
  long_en = E'Old paper at home can become a new sheet: thick, a little rough, with a grain of its own.\n\nWe tear up scrap paper, soak it and blend it into pulp. You pour the pulp onto a mould, press the water out, then leave it to dry. While it dries, we mix colours from onion skins, leaves and coffee grounds, for anyone who wants to try.\n\nOnce dry, the paper can become cards, notebook covers or decorations for your space.',
  what_en = E'Tear and soak old paper, then blend it into pulp\nPour it onto the mould and press the water out\nTry natural colours from onion skins, leaves and coffee grounds\nTake your paper home once it''s dry, or we send it on later',
  note_en = E'It''s a wet-hands session, so wear something comfortable\nThe paper needs about a day to dry completely\nBring old paper from home if you like, the more the merrier',
  sort_order = 100
where slug = 'giay-tai-che';

insert into public.workshop_types
  (slug, sort_order, name_vi, name_en, desc_vi, desc_en, long_vi, long_en,
   note_vi, note_en, duration_minutes, duration_max, age_min, price, price_from)
values
  ('lam-thiep-vai-vun', 10, 'Làm thiệp từ vải vụn', 'Fabric-scrap cards',
   'Can hình bằng giấy than, cắt vải vụn nhiều màu dán lên thiệp, thêm một chiếc charm nhỏ.',
   'Trace a design with carbon paper, fill it with colourful fabric scraps and finish with a small charm.',
   null,
   null,
   E'Nguyên liệu: vải vụn nhiều màu, bìa/giấy làm thiệp, keo sữa, giấy than, charm\nDụng cụ: kéo, bút chì, bút phết keo',
   E'Materials: colourful fabric scraps, card stock, white glue, carbon paper, charms\nTools: scissors, pencil, glue brush',
   60, 90, 0, 39000, false),
  ('kinusaiga', 30, 'Kinusaiga – tranh từ vải vụn', 'Kinusaiga fabric-scrap art',
   'Nhét mép vải vụn vào những rãnh khắc sẵn trên tấm xốp tái chế để thành một bức tranh. Không cần kim chỉ.',
   'Tuck the edges of fabric scraps into grooves carved in recycled foam board to make a picture. No needle or thread.',
   E'Kinusaiga là cách làm tranh từ vải của Nhật Bản.\n\nVải vụn được cắt theo từng mảng màu, rồi dùng que nhét mép vải vào các rãnh khắc sẵn trên tấm xốp tái chế. Không cần kim chỉ.\n\nMỗi bức là một độc bản: mẫu, họa tiết và chất liệu tùy vào vải vụn có sẵn hôm đó, nên không bức nào giống bức nào.',
   E'Kinusaiga is a Japanese way of making pictures from fabric.\n\nScraps are cut into blocks of colour, then a blunt stick tucks their edges into grooves carved in a recycled foam board. No needle or thread.\n\nEvery piece is one of a kind: the design, pattern and fabric depend on the scraps we have that day, so no two pictures are alike.',
   E'Nguyên liệu: bảng xốp đã cắt sẵn rãnh theo mẫu, vải vụn nhiều màu, băng dính 2 mặt\nDụng cụ: kéo, que dùi đầu tù để nhét vải vào rãnh',
   E'Materials: foam board with the pattern grooves pre-cut, colourful fabric scraps, double-sided tape\nTools: scissors, a blunt stick to tuck the fabric into the grooves',
   90, 120, 8, 199000, false),
  ('so-khau-tay', 40, 'Sổ khâu tay tái chế', 'Hand-stitched notebook',
   'Bọc bìa bằng vải vụn hoặc quần áo cũ, khâu gáy sổ bằng tay và thêu tên bạn lên bìa.',
   'Cover a notebook in fabric scraps or old clothes, sew the binding by hand and embroider your name on the cover.',
   null,
   null,
   E'Nguyên liệu: vải vụn hoặc quần áo cũ làm bìa, giấy ruột sổ, chỉ thêu tên\nDụng cụ: kim, chỉ, kéo, dùi đục lỗ',
   E'Materials: fabric scraps or old clothes for the cover, notebook paper, embroidery thread for your name\nTools: needle, thread, scissors, awl',
   150, 180, 10, 160000, false),
  ('khau-scrunchie-charm', 50, 'Khâu scrunchie và charm', 'Scrunchie & charm sewing',
   'Khâu một chiếc scrunchie và một chiếc charm nhỏ từ vải vụn, bông nhồi, hạt và khuy.',
   'Sew a scrunchie and a little charm from fabric scraps, stuffing, beads and buttons.',
   null,
   null,
   E'Nguyên liệu: vải vụn, dây thun, bông nhồi, hạt/khuy trang trí\nDụng cụ: kim, chỉ, kéo',
   E'Materials: fabric scraps, elastic, stuffing, decorative beads and buttons\nTools: needle, thread, scissors',
   90, 120, 12, 80000, false),
  ('khau-may-tai-che', 60, 'Khâu/may tái chế', 'Upcycled sewing',
   'Khâu một món đồ từ vải vụn, với phụ kiện trang trí theo chủ đề của từng buổi.',
   'Sew something from fabric scraps, with decorations that follow each session''s theme.',
   null,
   null,
   E'Nguyên liệu: vải vụn, phụ kiện trang trí theo chủ đề\nDụng cụ: kim, chỉ, kéo',
   E'Materials: fabric scraps, themed decorations\nTools: needle, thread, scissors',
   90, 120, 12, 120000, true),
  ('khung-anh-quan-bo', 70, 'Khung ảnh từ quần bò cũ', 'Old-jeans photo frame',
   'Bọc khung ảnh bìa carton bằng vải quần bò cũ, rồi trang trí với vải vụn và charm.',
   'Wrap a cardboard photo frame in old denim, then decorate it with fabric scraps and charms.',
   null,
   null,
   E'Nguyên liệu: bìa carton, quần bò cũ, charm, vải vụn, keo sữa, keo nến\nDụng cụ: kéo, súng bắn keo',
   E'Materials: cardboard, old jeans, charms, fabric scraps, white glue, hot-glue sticks\nTools: scissors, glue gun',
   60, 90, 0, 59000, true),
  ('hop-sua-tai-che', 80, 'Tái chế vỏ hộp sữa', 'Upcycled milk cartons',
   'Biến vỏ hộp sữa đã rửa sạch thành một món đồ mới, trang trí bằng giấy màu, màu vẽ và charm.',
   'Turn washed milk cartons into something new, decorated with coloured paper, paint and charms.',
   null,
   null,
   E'Nguyên liệu: vỏ hộp sữa đã rửa sạch, giấy màu/màu vẽ trang trí, charm\nDụng cụ: kéo, keo dán/băng dính, que xiên hoặc dây kẽm',
   E'Materials: washed milk cartons, coloured paper or paint for decoration, charms\nTools: scissors, glue or tape, skewers or wire',
   60, 90, 0, 150000, true),
  ('ve-dia-cd', 90, 'Vẽ đĩa CD cũ', 'Painting old CDs',
   'Vẽ lên đĩa CD cũ bằng màu acrylic và bút dạ dầu.',
   'Paint old CDs with acrylics and permanent markers.',
   null,
   null,
   E'Nguyên liệu: đĩa CD cũ, màu vẽ (acrylic/sơn)\nDụng cụ: cọ vẽ, bút dạ dầu, khay pha màu',
   E'Materials: old CDs, paint (acrylic or enamel)\nTools: brushes, permanent markers, palette',
   60, 90, 0, 69000, false),
  ('to-mat-na-giay-boi', 110, 'Tô mặt nạ giấy bồi', 'Painting papier-mâché masks',
   'Tô màu một chiếc mặt nạ giấy bồi, món đồ chơi Trung thu quen thuộc.',
   'Paint a blank papier-mâché mask, a classic Vietnamese Mid-Autumn toy.',
   null,
   null,
   E'Nguyên liệu: mặt nạ giấy bồi thô, màu vẽ\nDụng cụ: cọ vẽ, khay pha màu',
   E'Materials: blank papier-mâché mask, paint\nTools: brushes, palette',
   30, 60, 0, 60000, false),
  ('to-chuon-tre', 120, 'Tô màu chuồn tre', 'Painting bamboo dragonflies',
   'Tô màu một chú chuồn chuồn tre, món đồ chơi giữ thăng bằng trên đầu ngón tay.',
   'Paint a bamboo dragonfly, the toy that balances on your fingertip.',
   null,
   null,
   E'Nguyên liệu: chuồn tre thô, màu vẽ (màu nước/acrylic)\nDụng cụ: cọ vẽ, khay pha màu',
   E'Materials: unpainted bamboo dragonfly, paint (watercolour or acrylic)\nTools: brushes, palette',
   30, 60, 0, 50000, false),
  ('khac-go', 130, 'Khắc gỗ', 'Woodblock carving',
   'Khắc một mộc bản nhỏ, lăn mực rồi in hình lên giấy.',
   'Carve a small woodblock, roll on the ink and print it on paper.',
   null,
   null,
   E'Nguyên liệu: phôi gỗ/mộc bản, giấy in, mực in\nDụng cụ: bộ dao khắc, con lăn mực, thớt lót',
   E'Materials: wood block, printing paper, printing ink\nTools: carving knife set, ink roller, cutting mat',
   90, 120, 10, 50000, true),
  ('origami-3d', 140, '3D Origami', '3D origami',
   'Gấp những mảnh giấy màu cắt sẵn rồi ghép thành hình khối. Không cần dụng cụ.',
   'Fold pre-cut pieces of coloured paper and slot them together into a 3D shape. No tools needed.',
   null,
   null,
   E'Nguyên liệu: giấy màu cắt sẵn thành các miếng nhỏ để gấp\nDụng cụ: không cần',
   E'Materials: coloured paper pre-cut into small pieces for folding\nTools: none needed',
   60, 90, 0, 69000, true),
  ('tranh-thuy-tinh', 150, 'Làm tranh thủy tinh', 'Glass mosaic picture',
   'Xếp hạt thủy tinh, sỏi và đá trang trí lên khung để thành một bức tranh.',
   'Arrange glass beads, pebbles and decorative stones in a frame to make a picture.',
   null,
   null,
   E'Nguyên liệu: khung tranh (có giá đỡ), hạt thủy tinh, sỏi, đá trang trí, keo sữa/keo đa năng\nDụng cụ: kẹp thủy tinh',
   E'Materials: picture frame with stand, glass beads, pebbles, decorative stones, white or all-purpose glue\nTools: tweezers',
   90, 120, 15, 200000, true)
on conflict (slug) do nothing;
