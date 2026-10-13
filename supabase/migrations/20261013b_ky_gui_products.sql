-- Hàng ký gửi (9 món) + túi tái chế của Gem (3 thẻ) + chuyển sổ Cún Con — 13/10/2026.
-- CHẠY SAU KHI MERGE (ảnh images/products/ky-gui-*.webp và mục "Hàng ký gửi"
-- trên san-pham.html phải có trên web trước; web cũ chưa biết chọn mẫu). Cần 20261013_ky_gui_options.sql.
-- Sinh từ dữ liệu soạn tay; chạy lại không sao (on conflict do nothing).
--
-- Re.socks: Tái Xinh cổ ngắn + Hà Nội hiện luôn (ảnh poster Gem tự thiết kế); 4
-- mẫu còn lại để ẩn — nhân sự tải ảnh trong admin rồi tick "Đang bán trên web".
-- Cỡ M của Đất Nước / Học Đường: kiểm nhãn trước khi bật.

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('nen-thom-120',
        'ky-gui',
        200,
        'Tiny''s Herbal',
        'Nến thơm hũ 120g',
        'Scented candle · 120g jar',
        'Sáp đậu nành · nhiều mùi để chọn',
        'Soy wax · many scents to choose from',
        170000,
        'images/products/ky-gui-nen-thom-thumb.webp',
        array['images/products/ky-gui-nen-matcha-latte.webp','images/products/ky-gui-nen-lotus-grace.webp','images/products/ky-gui-nen-magnolia-daydream.webp','images/products/ky-gui-nen-twilight-woods.webp','images/products/ky-gui-nen-camp-fire.webp','images/products/ky-gui-nen-silent-grove.webp','images/products/ky-gui-nen-balsam-pines.webp','images/products/ky-gui-nen-mystic-meadow.webp','images/products/ky-gui-nen-sunset-glow.webp','images/products/ky-gui-nen-lakeside-morning.webp','images/products/ky-gui-nen-botanical-breeze.webp','images/products/ky-gui-nen-lavender-linen.webp','images/products/ky-gui-nen-rosie-blush.webp']::text[],
        '{"label_vi": "Mùi hương", "label_en": "Scent", "choices": [{"key": "matcha-latte", "vi": "Matcha Latte", "en": "Matcha Latte", "note_vi": "Bình yên như một buổi trà đạo ấm cúng. Hương đầu: mật ong · giữa: matcha · cuối: trà.", "note_en": "The calm of a cosy tea ceremony. Top: honey · middle: matcha · base: tea.", "image": "images/products/ky-gui-nen-matcha-latte.webp"}, {"key": "lotus-grace", "vi": "Lotus Grace", "en": "Lotus Grace", "note_vi": "Gió nhẹ trên mặt hồ tĩnh, hoa sen nở dưới nắng. Hương đầu: trà trắng · giữa: sen · cuối: hoa nhài.", "note_en": "A soft breeze over still water, a lotus opening in the sun. Top: white tea · middle: lotus · base: jasmine.", "image": "images/products/ky-gui-nen-lotus-grace.webp"}, {"key": "magnolia-daydream", "vi": "Magnolia Daydream", "en": "Magnolia Daydream", "note_vi": "Dạo bước qua khu vườn ngập nắng. Hương đầu: mộc lan · giữa: hoa hồng · cuối: cúc họa mi.", "note_en": "A stroll through a sunlit garden. Top: magnolia · middle: rose · base: daisy.", "image": "images/products/ky-gui-nen-magnolia-daydream.webp"}, {"key": "twilight-woods", "vi": "Twilight Woods", "en": "Twilight Woods", "note_vi": "Đi giữa rừng sau một cơn mưa nhẹ. Hương đầu: xô thơm · giữa: gỗ đàn hương · cuối: xạ hương.", "note_en": "Walking through the woods after a light rain. Top: sage · middle: sandalwood · base: musk.", "image": "images/products/ky-gui-nen-twilight-woods.webp"}, {"key": "camp-fire", "vi": "Camp Fire", "en": "Camp Fire", "note_vi": "Ngồi sát bên nhau khi đêm lách tách tiếng lửa. Hương đầu: gỗ gụ · giữa: tuyết tùng · cuối: gỗ tếch.", "note_en": "Curling up as the night crackles with embers. Top: mahogany · middle: cedarwood · base: teakwood.", "image": "images/products/ky-gui-nen-camp-fire.webp"}, {"key": "silent-grove", "vi": "Silent Grove", "en": "Silent Grove", "note_vi": "Tĩnh lặng giữa khu rừng yên, nơi thời gian chậm lại. Hương đầu: thông · giữa: gỗ đàn hương · cuối: trầm hương.", "note_en": "Stillness in a quiet forest, where time slows down. Top: pine · middle: sandalwood · base: agarwood.", "image": "images/products/ky-gui-nen-silent-grove.webp"}, {"key": "balsam-pines", "vi": "Balsam Pines", "en": "Balsam Pines", "note_vi": "Mùi lá kim tươi mát, nghe lòng lắng lại. Hương đầu: linh sam · giữa: thông · cuối: gỗ đàn hương.", "note_en": "The crisp, fresh smell of evergreens. Top: balsam fir · middle: pine · base: sandalwood.", "image": "images/products/ky-gui-nen-balsam-pines.webp"}, {"key": "mystic-meadow", "vi": "Mystic Meadow", "en": "Mystic Meadow", "note_vi": "Một buổi sáng yên trong khu rừng sương. Hương đầu: khuynh diệp · giữa: xô thơm · cuối: tuyết tùng.", "note_en": "A quiet morning in a misty forest. Top: eucalyptus · middle: sage · base: cedarwood.", "image": "images/products/ky-gui-nen-mystic-meadow.webp"}, {"key": "sunset-glow", "vi": "Sunset Glow", "en": "Sunset Glow", "note_vi": "Những tia nắng cuối ngày, ấm và man mác. Hương đầu: trầm hương · giữa: lá thuốc lá · cuối: gỗ tếch.", "note_en": "The last rays of sun, warm and wistful. Top: agarwood · middle: tobacco leaf · base: teakwood.", "image": "images/products/ky-gui-nen-sunset-glow.webp"}, {"key": "lakeside-morning", "vi": "Lakeside Morning", "en": "Lakeside Morning", "note_vi": "Mặt hồ lấp lánh một sáng cuối thu. Hương đầu: khuynh diệp · giữa: bạc hà · cuối: gỗ tếch.", "note_en": "Still water glistening on a late-autumn morning. Top: eucalyptus · middle: peppermint · base: teakwood.", "image": "images/products/ky-gui-nen-lakeside-morning.webp"}, {"key": "botanical-breeze", "vi": "Botanical Breeze", "en": "Botanical Breeze", "note_vi": "Vườn thảo mộc còn đẫm sương sớm. Hương đầu: khuynh diệp · giữa: thảo mộc · cuối: xô thơm.", "note_en": "A dewy herb garden in the early morning. Top: eucalyptus · middle: red herbs · base: sage.", "image": "images/products/ky-gui-nen-botanical-breeze.webp"}, {"key": "lavender-linen", "vi": "Lavender Linen", "en": "Lavender Linen", "note_vi": "Nến tinh dầu oải hương, hũ thủy tinh trong.", "note_en": "Lavender essential-oil candle in a clear jar.", "image": "images/products/ky-gui-nen-lavender-linen.webp"}, {"key": "rosie-blush", "vi": "Rosie Blush", "en": "Rosie Blush", "note_vi": "Nến tinh dầu hoa hồng, hũ thủy tinh trong.", "note_en": "Rose essential-oil candle in a clear jar.", "image": "images/products/ky-gui-nen-rosie-blush.webp"}]}'::jsonb,
        'Nến sáp đậu nành làm tay của Tiny''s Herbal (TP. Hồ Chí Minh).
Hũ thủy tinh nâu, nắp nhôm đen · 120g.
Lavender Linen và Rosie Blush là nến tinh dầu, hũ thủy tinh trong.
Ảnh hũ nâu là cỡ 250g — hũ ở Gem là 120g, nhỏ hơn trong ảnh.
Tiny''s Herbal góp 5% doanh thu cho trạm cứu hộ động vật.
Ghé cửa hàng để ngửi thử từng mùi nhé.',
        'Hand-poured soy wax candles by Tiny''s Herbal (Ho Chi Minh City).
Amber glass jar, black aluminium lid · 120g.
Lavender Linen and Rosie Blush are essential-oil candles in clear jars.
The amber jars in the photos are the 250g size — ours are 120g, a little smaller.
Tiny''s Herbal gives 5% of its sales to a local animal shelter.
Come by the store to smell each one.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('nen-cupcake',
        'ky-gui',
        210,
        'Tiny''s Herbal',
        'Nến cupcake',
        'Cupcake candle',
        'Nến tạo hình bánh',
        'Shaped like a cupcake',
        179000,
        'images/products/ky-gui-nen-cupcake-thumb.webp',
        array['images/products/ky-gui-nen-cupcake.webp']::text[],
        null,
        'Nến tạo hình bánh cupcake, làm tay.
Mỗi chiếc trang trí một kiểu, có thể khác ảnh một chút.',
        'A hand-made candle shaped like a cupcake.
Each one is decorated differently and may look a little different from the photo.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('nen-macaron',
        'ky-gui',
        220,
        'Tiny''s Herbal',
        'Nến macaron',
        'Macaron candle',
        'Nến tạo hình bánh',
        'Shaped like a macaron',
        108000,
        'images/products/ky-gui-nen-macaron-thumb.webp',
        array['images/products/ky-gui-nen-macaron.webp']::text[],
        null,
        'Nến tạo hình bánh macaron, làm tay.
Màu có thể khác ảnh một chút.',
        'A hand-made candle shaped like a macaron.
Colours may look a little different from the photo.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-tai-xinh-ngan',
        'ky-gui',
        230,
        'Re.socks',
        'Tất Tái Xinh cổ ngắn',
        'Tái Xinh ankle socks',
        'Sợi tái chế từ chai nhựa',
        'Yarn from recycled bottles',
        29000,
        'images/products/ky-gui-tat-tai-xinh-thumb.webp',
        array['images/products/ky-gui-tat-tai-xinh.webp']::text[],
        '{"label_vi": "Màu · cỡ", "label_en": "Colour · size", "choices": [{"key": "den-s", "vi": "Đen · S", "en": "Black · S", "note_vi": "Cỡ S · chân 36–39", "note_en": "Size S · EU 36–39"}, {"key": "den-m", "vi": "Đen · M", "en": "Black · M", "note_vi": "Cỡ M · chân 40–44", "note_en": "Size M · EU 40–44"}, {"key": "xam-s", "vi": "Xám nhạt · S", "en": "Light grey · S", "note_vi": "Cỡ S · chân 36–39", "note_en": "Size S · EU 36–39"}, {"key": "xam-m", "vi": "Xám nhạt · M", "en": "Light grey · M", "note_vi": "Cỡ M · chân 40–44", "note_en": "Size M · EU 40–44"}]}'::jsonb,
        'Tất cổ ngắn dệt từ sợi tái chế từ chai nhựa, đạt chứng nhận GRS (Global Recycled Standard).
Chất liệu: 53,3% cotton · 28,7% polyester tái chế · 13% polyester · 5% spandex.
Bảng cỡ Re.socks (cỡ giày Việt Nam): S 36–39 · M 40–44 · L 44,5–47.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'Ankle socks knitted from yarn recycled from plastic bottles, GRS (Global Recycled Standard) certified.
Material: 53.3% cotton · 28.7% recycled polyester · 13% polyester · 5% spandex.
Re.socks sizes (EU): S 36–39 · M 40–44 · L 44.5–47.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-tai-xinh-tron',
        'ky-gui',
        240,
        'Re.socks',
        'Tất Tái Xinh trơn cổ cao',
        'Tái Xinh plain crew socks',
        'Đen · free size',
        'Black · one size',
        49000,
        null,
        '{}'::text[],
        null,
        'Tất cổ cao màu đen, trơn, dễ phối.
Chất liệu: 45% BCI cotton · 30% polyester tái chế · 20% polyester · 5% spandex.
Free size.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'Plain black crew socks that go with anything.
Material: 45% BCI cotton · 30% recycled polyester · 20% polyester · 5% spandex.
One size.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        false)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-ha-noi',
        'ky-gui',
        250,
        'Re.socks',
        'Tất Hà Nội · sợi cà phê',
        'Hà Nội coffee-yarn socks',
        'Cột cờ · Chùa Một Cột · Nhà thờ Lớn',
        'Flag Tower · One Pillar Pagoda · St Joseph''s',
        79000,
        'images/products/ky-gui-tat-ha-noi-thumb.webp',
        array['images/products/ky-gui-tat-ha-noi.webp']::text[],
        '{"label_vi": "Cỡ", "label_en": "Size", "choices": [{"key": "s", "vi": "S", "en": "S", "note_vi": "Chân 36–39", "note_en": "EU 36–39"}, {"key": "m", "vi": "M", "en": "M", "note_vi": "Chân 40–44", "note_en": "EU 40–44"}, {"key": "l", "vi": "L", "en": "L", "note_vi": "Chân 44,5–47", "note_en": "EU 44.5–47"}]}'::jsonb,
        'Tất cổ cao màu trắng, dệt hình Cột cờ Hà Nội, Chùa Một Cột và Nhà thờ Lớn bằng chỉ xanh dương.
Dệt từ sợi cà phê (coffee yarn) — Re.socks cho biết sợi này giúp khử mùi tự nhiên.
Chất liệu: 59% sợi cà phê · 21% spandex · 15% cao su · 5% polyester.
Bảng cỡ Re.socks (cỡ giày Việt Nam): S 36–39 · M 40–44 · L 44,5–47.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'White crew socks with Hà Nội''s Flag Tower, One Pillar Pagoda and St Joseph''s Cathedral woven in blue.
Knitted from coffee yarn, which Re.socks says helps keep odour away naturally.
Material: 59% coffee yarn · 21% spandex · 15% rubber · 5% polyester.
Re.socks sizes (EU): S 36–39 · M 40–44 · L 44.5–47.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-dat-nuoc',
        'ky-gui',
        260,
        'Re.socks',
        'Tất Đất Nước',
        'Đất Nước socks',
        'Tất Thắng · Suôn Sẻ',
        'Tất Thắng · Suôn Sẻ',
        79000,
        null,
        '{}'::text[],
        '{"label_vi": "Mẫu", "label_en": "Design", "choices": [{"key": "tat-thang", "vi": "Tất Thắng", "en": "Tất Thắng", "note_vi": "Từ trò Oẳn tù tì — chúc bạn đánh đâu thắng đó. Xanh lá – trắng.", "note_en": "From rock-paper-scissors — may you win wherever you go. Green and white."}, {"key": "suon-se", "vi": "Suôn Sẻ", "en": "Suôn Sẻ", "note_vi": "Từ trò Ô ăn quan — mong mỗi nước đi đều suôn sẻ. Xanh lá – vàng.", "note_en": "From the Ô ăn quan board game — may every move go smoothly. Green and yellow."}]}'::jsonb,
        'Tất cổ trung, sợi tái chế, đạt chứng nhận GRS.
Chất liệu: 90% polyester tái chế · 5% cotton · 5% spandex.
Cỡ M · chân 36–39.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'Mid-calf socks in recycled yarn, GRS certified.
Material: 90% recycled polyester · 5% cotton · 5% spandex.
Size M · EU 36–39.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        false)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-hoc-duong',
        'ky-gui',
        270,
        'Re.socks',
        'Tất Học Đường',
        'Học Đường socks',
        'Bác Học · Gấu Che',
        'Bác Học · Gấu Che',
        79000,
        null,
        '{}'::text[],
        '{"label_vi": "Mẫu", "label_en": "Design", "choices": [{"key": "bac-hoc", "vi": "Bác Học", "en": "Bác Học"}, {"key": "gau-che", "vi": "Gấu Che", "en": "Gấu Che"}]}'::jsonb,
        'Tất cổ lửng (crew).
Cỡ M.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'Crew socks.
Size M.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        false)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, consignor, name_vi, name_en, desc_vi, desc_en, price, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tat-cai-thu-gi',
        'ky-gui',
        280,
        'Re.socks',
        'Hộp tất Cái Thứ Gì',
        '“Cái Thứ Gì” sock box',
        '6 đôi · Thứ Hai → Thứ Bảy',
        '6 pairs · Monday to Saturday',
        199000,
        null,
        '{}'::text[],
        null,
        'Hộp 6 đôi tất trắng – đen, mỗi đôi một kiểu cho một ngày từ Thứ Hai đến Thứ Bảy.
Cổ cao · free size.
Chất liệu: 50% cotton · 40% polyester · 5% spandex · 5% cao su.
Giặt máy dưới 60°C, nên cho vào túi giặt. Phơi nơi thoáng, tránh nắng gắt.',
        'A box of 6 black-and-white pairs, a different one for each day from Monday to Saturday.
Crew length · one size.
Material: 50% cotton · 40% polyester · 5% spandex · 5% rubber.
Machine wash below 60°C, ideally in a laundry bag. Dry in the shade.',
        true,
        false)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, name_vi, name_en, desc_vi, desc_en, price, price_max, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tui-di-choi',
        'vai-vun',
        22,
        'Túi đi chơi',
        'Day bag',
        'Từ vải vụn & quần jeans cũ',
        'From fabric scraps & old jeans',
        80000,
        300000,
        'images/products/vai-vun-tui-di-choi-thumb.webp',
        array['images/products/vai-vun-tui-di-choi-hoa-xanh.webp','images/products/vai-vun-tui-di-choi-den-charm.webp','images/products/vai-vun-tui-di-choi-do-den.webp','images/products/vai-vun-tui-di-choi-jeans-hong.webp','images/products/vai-vun-tui-di-choi-jeans-vang.webp','images/products/vai-vun-tui-di-choi-jeans-xanh.webp']::text[],
        '{"label_vi": "Mẫu", "label_en": "Design", "choices": [{"key": "hoa-xanh", "vi": "Hoa hồng nền xanh", "en": "Roses on green", "note_vi": "Tái chế từ vải vụn, quai thắt nút.", "note_en": "From fabric scraps, knotted strap.", "image": "images/products/vai-vun-tui-di-choi-hoa-xanh.webp"}, {"key": "den-charm", "vi": "Đen – xanh, charm hoa", "en": "Black & blue, flower charm", "note_vi": "Tái chế từ vải vụn, kèm móc hoa vải.", "note_en": "From fabric scraps, with a fabric-flower charm.", "image": "images/products/vai-vun-tui-di-choi-den-charm.webp"}, {"key": "do-den", "vi": "Đỏ – đen", "en": "Red & black", "note_vi": "Tái chế từ vải vụn, đeo vai.", "note_en": "From fabric scraps, worn on the shoulder.", "image": "images/products/vai-vun-tui-di-choi-do-den.webp"}, {"key": "jeans-hong", "vi": "Jeans hồng – xanh nhạt", "en": "Pink & pale-blue jeans", "note_vi": "Tái chế từ quần jeans, thắt nơ đen.", "note_en": "From old jeans, tied with a black bow.", "image": "images/products/vai-vun-tui-di-choi-jeans-hong.webp"}, {"key": "jeans-vang", "vi": "Jeans vàng mù tạt", "en": "Mustard jeans", "note_vi": "Tái chế từ quần jeans, có khoá kéo, giữ nguyên túi sau.", "note_en": "From old jeans, zipped, back pocket kept.", "image": "images/products/vai-vun-tui-di-choi-jeans-vang.webp"}, {"key": "jeans-xanh", "vi": "Jeans xanh", "en": "Blue jeans", "note_vi": "Tái chế từ quần jeans, giữ nguyên túi sau.", "note_en": "From old jeans, back pocket kept.", "image": "images/products/vai-vun-tui-di-choi-jeans-xanh.webp"}]}'::jsonb,
        'Mỗi chiếc chỉ có một — may từ vải vụn và quần jeans cũ, không chiếc nào giống chiếc nào.
Giá tuỳ từng chiếc (kích cỡ, vải); chúng mình báo giá đúng khi nhắn lại.',
        'Each one is the only one — sewn from fabric scraps and old jeans, no two alike.
The price depends on the bag (size, fabric); we confirm it when we reply.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, name_vi, name_en, desc_vi, desc_en, price, price_max, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tui-di-cho',
        'vai-vun',
        24,
        'Túi đi chợ',
        'Market tote',
        'Từ vải vụn & bao cát mèo',
        'From fabric scraps & a cat-litter sack',
        60000,
        260000,
        'images/products/vai-vun-tui-di-cho-thumb.webp',
        array['images/products/vai-vun-tui-di-cho-bao-cat-meo.webp','images/products/vai-vun-tui-di-cho-caro-hong.webp']::text[],
        '{"label_vi": "Mẫu", "label_en": "Design", "choices": [{"key": "bao-cat-meo", "vi": "Bao cát mèo", "en": "Cat-litter sack", "note_vi": "Tái chế từ bao cát mèo, quai tím.", "note_en": "From a cat-litter sack, purple handles.", "image": "images/products/vai-vun-tui-di-cho-bao-cat-meo.webp"}, {"key": "caro-hong", "vi": "Caro hồng", "en": "Pink check", "note_vi": "Tái chế từ vải vụn caro.", "note_en": "From checked fabric scraps.", "image": "images/products/vai-vun-tui-di-cho-caro-hong.webp"}]}'::jsonb,
        'Mỗi chiếc chỉ có một — may từ vải vụn và bao cũ, không chiếc nào giống chiếc nào.
Giá tuỳ từng chiếc (kích cỡ, vải); chúng mình báo giá đúng khi nhắn lại.',
        'Each one is the only one — sewn from fabric scraps and old sacks, no two alike.
The price depends on the bag (size, fabric); we confirm it when we reply.',
        true,
        true)
on conflict (sku) do nothing;

insert into public.products (sku, category, sort_order, name_vi, name_en, desc_vi, desc_en, price, price_max, image, gallery, options, notes_vi, notes_en, in_stock, is_published)
values ('tui-laptop',
        'vai-vun',
        26,
        'Túi đựng laptop',
        'Laptop sleeve',
        'Từ quần jeans & vải vụn',
        'From old jeans & fabric scraps',
        250000,
        400000,
        'images/products/vai-vun-tui-laptop-thumb.webp',
        array['images/products/vai-vun-tui-laptop.webp']::text[],
        null,
        'Túi đựng laptop có khoá kéo, ghép từ quần jeans cũ và vải vụn hoa văn.
Giá tuỳ từng chiếc; chúng mình báo giá đúng khi nhắn lại.',
        'Zipped laptop sleeve pieced from old jeans and patterned fabric scraps.
The price depends on the sleeve; we confirm it when we reply.',
        true,
        true)
on conflict (sku) do nothing;

update public.products
   set category = 'ky-gui', consignor = 'Tiệm sổ Cún Con',
       desc_vi = 'Khâu tay · giấy tái chế', desc_en = 'Hand-stitched · recycled paper',
       sort_order = 290
 where sku = 'so-khau';
