// Gem Chạm Sắc — tiny i18n engine (VI default, EN secondary)
// No framework. Translatable text lives in the STRINGS map below, keyed by
// data-i18n attributes in the HTML:
//   data-i18n="key"        -> sets element.textContent
//   data-i18n-html="key"   -> sets element.innerHTML (use for <br>/<em>/<strong>)
//   data-i18n-attr="attr:key|attr2:key2" -> sets attributes (placeholder, alt, aria-label…)
// Language choice persists in localStorage and applies across pages.

(function () {
  'use strict';

  var STORAGE_KEY = 'gem-lang';
  var SUPPORTED = ['vi', 'en'];
  var DEFAULT = 'vi';

  var STRINGS = {
    /* ---------- SHARED: NAV ---------- */
    'nav.aria':       { vi: `Điều hướng chính`, en: `Main navigation` },
    'nav.home':       { vi: `Trang chủ`, en: `Home` },
    'nav.about':      { vi: `Về Gem`, en: `About Gem` },
    'nav.about_aria': { vi: `Mở mục Về Gem`, en: `Open the About Gem menu` },
    'nav.story':      { vi: `Câu chuyện`, en: `Our Story` },
    'nav.model':      { vi: `Mô hình`, en: `Our Model` },
    'nav.products':   { vi: `Sản phẩm`, en: `Products` },
    'nav.visit':      { vi: `Ghé thăm`, en: `Visit` },
    'nav.season':     { vi: `Season 02 đang diễn ra`, en: `Season 02 now on` },
    'nav.menu_aria':  { vi: `Mở menu`, en: `Open menu` },
    'lang.aria':      { vi: `Ngôn ngữ`, en: `Language` },

    /* ---------- SHARED: FOOTER ---------- */
    'footer.contact':   { vi: `Liên hệ`, en: `Contact` },
    'footer.follow':    { vi: `Theo dõi`, en: `Follow` },
    'footer.tagline':   { vi: `Mỗi một nỗ lực dù là nhỏ bé nhất, đều đáng được trân quý.`, en: `Every effort, however small, deserves to be cherished.` },
    'footer.address':   { vi: `Tầng 3, Trung tâm Văn hóa - Thông tin và Thể thao Phường Hai Bà Trưng, 114 Lê Gia Đỉnh, Hà Nội`, en: `3rd Floor, Hai Ba Trung Ward Culture, Information & Sports Center, 114 Le Gia Dinh, Hanoi` },
    'footer.copyright': { vi: `© 2026 Gem Chạm Sắc · Hướng về NetZero 2050`, en: `© 2026 Gem Chạm Sắc · Toward NetZero 2050` },

    /* ---------- SHARED: COMMON / EMAIL FORM ---------- */
    'common.email_ph':     { vi: `email của bạn`, en: `your email` },
    'common.ml_success_h': { vi: `Cảm ơn bạn đã ghé qua.`, en: `Thank you for stopping by.` },
    'common.ml_success_p': { vi: `Chúng mình vừa gửi một email xác nhận đến hộp thư của bạn. Mở email và xác nhận để bắt đầu đồng hành cùng Gem nhé. Nếu chưa thấy, kiểm tra cả mục Spam/Promotions giúp chúng mình.`, en: `We've just sent a confirmation email to your inbox. Open it and confirm to start walking alongside Gem. If you don't see it, please check your Spam/Promotions folder too.` },
    'common.fine_print':   { vi: `Chúng mình không spam. Chỉ gửi khi thực sự có điều đáng kể.`, en: `We don't spam. We only write when there's truly something worth sharing.` },
    'common.ml_sending':   { vi: `Đang gửi...`, en: `Sending...` },
    'common.ml_error':     { vi: `Có lỗi xảy ra. Bạn thử lại sau giúp chúng mình nhé.`, en: `Something went wrong. Please try again later.` },

    /* ---------- SHARED: VALUE CARDS (home + story) ---------- */
    'values.sustainable_h': { vi: `Bền vững`, en: `Sustainable` },
    'values.sustainable_p': { vi: `Mỗi nỗ lực nhỏ, đều đáng được giữ lại.`, en: `Every small effort is worth keeping.` },
    'values.convenient_h':  { vi: `Sự tiện lợi`, en: `Convenience` },
    'values.convenient_p':  { vi: `Sống xanh dễ tiếp cận cho nhiều đối tượng.`, en: `Green living, made accessible to many.` },
    'values.creative_h':    { vi: `Sáng tạo`, en: `Creativity` },
    'values.creative_p':    { vi: `Mỗi món đồ là một cách kể chuyện riêng.`, en: `Each item tells its own story.` },

    /* ---------- PAGE TITLES ---------- */
    'title.home':     { vi: `Gem Chạm Sắc · Chạm Xanh · Gửi Sắc`, en: `Gem Chạm Sắc · Chạm Xanh · Gửi Sắc` },
    'title.story':    { vi: `Câu chuyện · Gem Chạm Sắc`, en: `Our Story · Gem Chạm Sắc` },
    'title.model':    { vi: `Mô hình · Gem Chạm Sắc`, en: `Our Model · Gem Chạm Sắc` },
    'title.products': { vi: `Sản phẩm · Gem Chạm Sắc`, en: `Products · Gem Chạm Sắc` },
    'title.visit':    { vi: `Ghé thăm · Gem Chạm Sắc`, en: `Visit · Gem Chạm Sắc` },
    'title.s2':       { vi: `Season 02: A Space To Stay · Gem Chạm Sắc`, en: `Season 02: A Space To Stay · Gem Chạm Sắc` },
    'title.nf':       { vi: `Không tìm thấy trang · Gem Chạm Sắc`, en: `Page not found · Gem Chạm Sắc` },

    /* ---------- HOME ---------- */
    'home.hero_title':     { vi: `Hành trình của<br>những điều<br><span class="accent">tử tế và bền vững.</span>`, en: `A journey of<br>kind and<br><span class="accent">sustainable things.</span>` },
    'home.hero_desc':      { vi: `Gem Chạm Sắc bắt đầu từ những bước nhỏ, với mong muốn tạo ra một không gian sống chậm, nuôi dưỡng thói quen tốt cho bản thân và môi trường.`, en: `Gem Chạm Sắc began with small steps, hoping to create a slow-living space that nurtures good habits for ourselves and the planet.` },
    'home.hero_cta1':      { vi: `Ghé thăm Season 02`, en: `Visit Season 02` },
    'home.hero_cta2':      { vi: `Đọc câu chuyện`, en: `Read our story` },
    'home.udon_aria':      { vi: `Xem câu chuyện về Udon`, en: `See Udon's story` },
    'home.udon_alt':       { vi: `Udon - mascot của Gem Chạm Sắc`, en: `Udon — the Gem Chạm Sắc mascot` },
    'home.udon_note':      { vi: `~ đây là Udon ~`, en: `~ this is Udon ~` },
    'home.season_label':   { vi: `Season 02 · đang mở cửa`, en: `Season 02 · now open` },
    'home.season_img_alt': { vi: `Không gian Gem Chạm Sắc`, en: `The Gem Chạm Sắc space` },
    'home.season_desc':    { vi: `Một không gian để bạn ở lại lâu hơn — xem quy trình làm đồ thủ công tái chế, thử vài hoạt động nhỏ, và ngồi lại trò chuyện giữa lòng Hà Nội.`, en: `A space for you to stay a little longer — watch how recycled handmade things come to life, try a few small activities, and sit down for a chat in the heart of Hanoi.` },
    'home.season_addr':    { vi: `Tầng 3, Trung tâm Văn hóa - Thông tin và Thể thao Phường Hai Bà Trưng<br>114 Lê Gia Đỉnh, Hà Nội`, en: `3rd Floor, Hai Ba Trung Ward Culture, Information & Sports Center<br>114 Le Gia Dinh, Hanoi` },
    'home.season_until':   { vi: `Open Studio · 09:00–19:00 hàng ngày`, en: `Open Studio · 09:00–19:00 daily` },
    'home.season_cta':     { vi: `Xem chi tiết & ghé thăm`, en: `See details & visit` },
    'home.values_eyebrow': { vi: `Điều chúng mình giữ,`, en: `What we hold on to,` },
    'home.values_title':   { vi: `Ba điều làm nên Gem.`, en: `Three things that make Gem.` },
    'home.hero_where':     { vi: `Hà Nội · Open Studio 09:00–19:00 mỗi ngày`, en: `Hanoi · Open Studio 09:00–19:00 daily` },
    'home.hero_img_alt':   { vi: `Túi đeo chéo vải ghép, đeo trên vai`, en: `A patchwork crossbody bag, worn over the shoulder` },

    /* HOME: workshop teaser */
    'home.ws_eyebrow': { vi: `Workshop,`, en: `Workshops,` },
    'home.ws_title':   { vi: `Tự tay làm một món đồ.`, en: `Make something with your own hands.` },
    'home.ws_desc':    { vi: `Thử làm bìa sổ từ vải vụn, làm giấy tái chế — ngay tại studio, cùng chúng mình. Mỗi buổi chỉ nhận một nhóm nhỏ để ai cũng được chỉ tận tay.`, en: `Try making a notebook cover from fabric scraps, or recycled paper — right here at the studio, with us. Each session takes a small group so everyone gets shown hands-on.` },
    'home.ws_cta':     { vi: `Xem lịch & đăng ký`, en: `See dates & sign up` },
    'home.ws_img_alt': { vi: `Bìa sổ vải ghép làm tại workshop`, en: `A patchwork notebook cover made at a workshop` },

    'home.products_eyebrow': { vi: `Sản phẩm,`, en: `Products,` },
    'home.products_title':   { vi: `Đa dạng các sắc màu từ Gem.`, en: `A spectrum of colors from Gem.` },
    'home.products_desc':    { vi: `Mỗi sản phẩm độc bản, không cái nào giống cái nào — bởi vải vụn và đồ secondhand đều có câu chuyện riêng.`, en: `Every product is one-of-a-kind — because every fabric scrap and secondhand piece has its own story.` },
    'home.products_more':    { vi: `Khám phá tất cả sản phẩm`, en: `Explore all products` },
    'home.email_eyebrow':    { vi: `Đồng hành,`, en: `Walk with us,` },
    'home.email_title':      { vi: `Cùng nhau, một vòng đời nữa.`, en: `Together, one more life cycle.` },
    'home.email_desc':       { vi: `Để chúng mình báo bạn khi có workshop mới, khi có hoạt động ở studio, hay khi có một dự án nho nhỏ vì môi trường cần thêm bạn đồng hành.`, en: `So we can let you know about new workshops, studio happenings, or a small project for the planet that needs another companion.` },
    'home.email_mascot_alt': { vi: `Udon cười`, en: `Udon smiling` },
    'home.email_btn':        { vi: `Đăng ký`, en: `Subscribe` },
    'home.popup_close':  { vi: `Đóng`, en: `Close` },
    'home.popup_title':  { vi: `Udon`, en: `Udon` },
    'home.popup_body':   { vi: `Udon là chú chó tam thể của chủ tiệm.<br><br>Udon chưa đến cửa hàng được (chúng mình còn đang thuyết phục chủ nhà), nhưng Udon ở đây — trông website, chào mỗi ai ghé qua.`, en: `Udon is the shop owner's calico dog.<br><br>Udon can't come to the store yet (we're still convincing the landlord), but Udon is here — watching over the website, greeting everyone who drops by.` },
    'home.popup_footer': { vi: `❤ Hẹn gặp Udon ở Season 03?`, en: `❤ See Udon in Season 03?` },

    /* ---------- STORY (cau-chuyen) ---------- */
    'story.eyebrow':      { vi: `Câu chuyện`, en: `Our Story` },
    'story.hero_title':   { vi: `Từ những điều<br>không hoàn hảo.`, en: `From imperfect<br>things.` },
    'story.hero_sub':     { vi: `Gem bắt đầu từ những suy ngẫm giản dị về những điều không hoàn hảo trong cuộc sống của mỗi người.`, en: `Gem began with simple reflections on the imperfect things in everyone's life.` },
    'story.p_dear':       { vi: `Bạn đồng hành thân mến,`, en: `Dear fellow companion,` },
    'story.p1':           { vi: `Với thông điệp <strong>mọi thứ đều có thể trở thành tài nguyên quý báu</strong>, Gem Chạm Sắc gửi đến bạn những gì chân chất nhất từ việc tái chế, làm mới và tạo nên các sản phẩm bền vững.`, en: `With the message that <strong>everything can become a precious resource</strong>, Gem Chạm Sắc brings you the most honest things made from recycling, renewing, and creating sustainable products.` },
    'story.p2':           { vi: `Những phụ kiện tái chế nhỏ để bạn làm mới bản thân,<br>Những cuốn sổ đồng hành cùng bạn trên hành trình xanh,<br>Những gì đem đến cho bạn cuộc sống tiện nghi theo cách bền vững hơn…`, en: `Small recycled accessories to renew yourself,<br>Notebooks to accompany you on your green journey,<br>Things that bring you comfort in a more sustainable way…` },
    'story.quote':        { vi: `Mỗi một nỗ lực dù là nhỏ bé nhất,<br>đều đáng được trân quý.`, en: `Every effort, however small,<br>deserves to be cherished.` },
    'story.signature':    { vi: `— Gem Chạm Sắc`, en: `— Gem Chạm Sắc` },
    'story.origin_h':     { vi: `Câu chuyện bắt đầu, từ những điều không hoàn hảo.`, en: `Our story begins with imperfect things.` },
    'story.origin_p1':    { vi: `Ở Việt Nam, như một lẽ thường, người ta thường chọn những gì <em>tiện</em>.`, en: `In Vietnam, as a matter of course, people tend to choose what is <em>convenient</em>.` },
    'story.origin_p2':    { vi: `Một quán trà đá vỉa hè dễ tỉ tê đôi ba câu chuyện phiếm.<br>Một khu chợ cóc nhỏ dễ bề mua bán.<br>Một gánh hàng rong chẳng cần kệ cao, quầy rộng nhưng vừa đủ cho ngày vội vã.`, en: `A sidewalk iced-tea stall, easy for sharing a few idle stories.<br>A small street market, easy for buying and selling.<br>A street vendor's cart that needs no tall shelves or wide counters, yet is just enough for a hurried day.` },
    'story.origin_p3':    { vi: `Không hoàn hảo, nhưng đủ gần, đủ dễ để ghé vào, đủ để ở lại, để người nhớ người thương.`, en: `Imperfect, yet close enough, easy enough to drop by, enough to linger — enough for people to remember and care for one another.` },
    'story.origin_p4':    { vi: `Có lẽ chính những điều không hoàn hảo ấy lại khiến mọi thứ trở nên nhẹ nhàng hơn, dễ dàng hơn, tiện lợi hơn.`, en: `Perhaps it is precisely these imperfect things that make everything gentler, easier, more convenient.` },
    'story.origin_callout': { vi: `<strong>Sự bền vững cũng có thể tiện lợi như vậy.</strong><br>Bắt đầu từ những gì nhỏ nhất, không cần chi phí lớn, không cần sự chuẩn bị.`, en: `<strong>Sustainability can be just as convenient.</strong><br>Starting from the smallest things — no big costs, no preparation needed.` },
    'story.dir_eyebrow':  { vi: `Định hướng,`, en: `Our direction,` },
    'story.dir_title':    { vi: `Chúng mình đi đến đâu, và bằng cách nào.`, en: `Where we're going, and how.` },
    'story.mission_h':    { vi: `Cho mọi thứ một vòng đời mới.`, en: `Give everything a new life cycle.` },
    'story.mission_p':    { vi: `Chúng mình thu gom, làm sạch, sửa chữa và tái chế những gì tưởng đã cũ: vải vụn, quần áo secondhand, giấy tái chế, đồ qua sử dụng — để chúng tiếp tục sống thêm nhiều vòng đời mới, theo những cách rất riêng.`, en: `We collect, clean, repair, and recycle what seems old: fabric scraps, secondhand clothes, recycled paper, used items — so they can keep living many new life cycles, in their own special ways.` },
    'story.vision_h':     { vi: `Định hướng doanh nghiệp xanh.`, en: `Toward a green enterprise.` },
    'story.vision_p':     { vi: `Gem Chạm Sắc là một cửa hàng nhỏ theo mô hình kinh tế tuần hoàn, có định hướng phát triển thành doanh nghiệp xã hội trong tương lai. Dù ở bất kỳ mô hình nào, chúng mình vẫn duy trì các hoạt động dạy nghề miễn phí, gian hàng trao tặng đồ, và các dự án vì phát triển bền vững.`, en: `Gem Chạm Sắc is a small shop built on the circular economy model, with the aim of growing into a social enterprise in the future. Whatever the model, we keep running free vocational classes, a giving corner, and projects for sustainable development.` },
    'story.values_h':     { vi: `Ba điều chúng mình giữ.`, en: `Three things we hold on to.` },
    'story.commit_eyebrow': { vi: `Cam kết của chúng mình,`, en: `Our commitments,` },
    'story.commit_title': { vi: `Có những điều chúng mình làm mỗi ngày.`, en: `There are things we do every day.` },
    'story.commit_sub':   { vi: `Bắt đầu từ những gì nhỏ nhất, không cần chi phí lớn, không cần sự chuẩn bị.`, en: `Starting from the smallest things — no big costs, no preparation needed.` },
    'story.c1_h':   { vi: `Đồng hành cùng 17 SDGs`, en: `Walking alongside the 17 SDGs` },
    'story.c1_p':   { vi: `Chúng mình đồng thuận với 17 Mục tiêu Phát triển Bền vững do Liên Hợp Quốc đưa ra. Mô hình của Gem Chạm Sắc đặc biệt gắn với:`, en: `We embrace the 17 Sustainable Development Goals set out by the United Nations. Gem Chạm Sắc's model is especially tied to:` },
    'story.c1_li1': { vi: `SDG 12 — Tiêu thụ và sản xuất có trách nhiệm`, en: `SDG 12 — Responsible consumption and production` },
    'story.c1_li2': { vi: `SDG 13 — Hành động vì khí hậu`, en: `SDG 13 — Climate action` },
    'story.c1_li3': { vi: `SDG 5 — Bình đẳng giới`, en: `SDG 5 — Gender equality` },
    'story.c1_li4': { vi: `SDG 8 — Việc làm bền vững`, en: `SDG 8 — Decent work and economic growth` },
    'story.c2_h':   { vi: `Hướng về NetZero 2050`, en: `Toward NetZero 2050` },
    'story.c2_p':   { vi: `Việt Nam đặt mục tiêu phát thải ròng bằng không vào năm 2050. Chúng mình ủng hộ và phấn đấu cho mục tiêu này, với định hướng phát triển Gem Chạm Sắc thành một doanh nghiệp xã hội — nơi mỗi quyết định nhỏ về nguyên liệu, công nghệ in, bao bì đều hướng đến giảm phát thải.`, en: `Vietnam aims for net-zero emissions by 2050. We support and strive toward this goal, working to grow Gem Chạm Sắc into a social enterprise — where every small decision about materials, printing technology, and packaging is made to reduce emissions.` },
    'story.c3_h':   { vi: `5% lợi nhuận quay về cộng đồng`, en: `5% of profit goes back to the community` },
    'story.c3_p':   { vi: `Mỗi món đồ bán đi, chúng mình giữ lại 5% lợi nhuận. Một phần dành cho lớp dạy nghề miễn phí. Một phần dành cho những dự án vì môi trường. Một phần dành cho góc trao tặng đồ, nơi ai cần, có thể ghé lấy. Không nhiều, nhưng đều đặn, mỗi ngày.`, en: `For every item sold, we set aside 5% of the profit. Part goes to free vocational classes. Part goes to environmental projects. Part goes to the giving corner, where anyone in need can drop by and take. Not much, but steady — every day.` },
    'story.c4_h':   { vi: `Một vòng đời, rồi một vòng đời nữa`, en: `One life cycle, then another` },
    'story.c4_p':   { vi: `Gem Chạm Sắc bắt đầu từ những điều đã cũ: mảnh vải vụn còn sót lại, quần áo secondhand, giấy tái chế, những món đồ đã qua sử dụng. Chúng mình nhặt nhạnh, làm sạch, sửa chữa, tái chế — rồi gửi chúng đi tiếp, bằng sự thủ công và những cách rất riêng.`, en: `Gem Chạm Sắc begins with old things: leftover fabric scraps, secondhand clothes, recycled paper, used items. We gather, clean, repair, and recycle them — then send them onward, by hand and in our own special ways.` },
    'story.quote_inline': { vi: `Mỗi một nỗ lực dù là nhỏ bé nhất, đều đáng được trân quý.`, en: `Every effort, however small, deserves to be cherished.` },
    'story.cta_h':  { vi: `Đến và bắt đầu hành trình.`, en: `Come and begin the journey.` },
    'story.cta_p':  { vi: `Season 02 đang mở cửa — một không gian để bạn ở lại lâu hơn, chờ bạn ghé thăm.`, en: `Season 02 is open — a space for you to stay a little longer, waiting for your visit.` },
    'story.cta_btn':{ vi: `Ghé thăm Gem Chạm Sắc`, en: `Visit Gem Chạm Sắc` },

    /* ---------- MODEL (mo-hinh) ---------- */
    'model.eyebrow':   { vi: `Mô hình`, en: `Our Model` },
    'model.hero_title':{ vi: `Sản phẩm tuần hoàn.`, en: `Circular products.` },
    'model.hero_sub':  { vi: `Mô hình kinh tế tuần hoàn tại Gem Chạm Sắc — 6 bước, một vòng đời mới.`, en: `The circular economy model at Gem Chạm Sắc — 6 steps, one new life cycle.` },
    'model.s1_h': { vi: `Thu gom`, en: `Collect` },
    'model.s1_p': { vi: `Vải vụn từ các nhà may, quần áo 2hand, giấy cũ, đồ cũ còn giá trị sử dụng từ nhiều nguồn.`, en: `Fabric scraps from tailors, 2hand clothes, old paper, and still-usable used items from many sources.` },
    'model.s2_h': { vi: `Chọn lọc & Xử lý`, en: `Sort & Process` },
    'model.s2_p': { vi: `Phân loại, làm sạch, cắt, xử lý và chuẩn bị nguyên liệu.`, en: `Sorting, cleaning, cutting, treating, and preparing materials.` },
    'model.s3_h': { vi: `Tái chế & Tái sinh`, en: `Recycle & Renew` },
    'model.s3_p': { vi: `Tái chế thành sản phẩm mới, tân trang, sửa chữa.`, en: `Recycling into new products, refurbishing, repairing.` },
    'model.s4_h': { vi: `Bán ra`, en: `Sell` },
    'model.s4_p': { vi: `Đưa sản phẩm đến tay người dùng.`, en: `Bringing products into people's hands.` },
    'model.s5_h': { vi: `Sửa chữa & Bảo dưỡng`, en: `Repair & Maintain` },
    'model.s5_p': { vi: `Người dùng mang đến shop khi cần sửa chữa hoặc làm mới.`, en: `Customers bring items to the shop when they need repair or renewal.` },
    'model.s6_h': { vi: `Tái sinh lần nữa`, en: `Renew once more` },
    'model.s6_p': { vi: `Biến thành sản phẩm mới hoặc gửi đến người khác.`, en: `Turned into new products or passed on to someone else.` },
    'model.comm_eyebrow': { vi: `Định hướng cộng đồng,`, en: `For the community,` },
    'model.comm_title':   { vi: `Đang làm, và đang hướng đến.`, en: `What we do, and where we're headed.` },
    'model.doing_label':  { vi: `ĐANG LÀM`, en: `WHAT WE DO` },
    'model.doing_h':      { vi: `Những gì chúng mình vận hành mỗi ngày.`, en: `What we run every day.` },
    'model.doing_li1':    { vi: `<strong style="color: var(--ink-dark);">Free Corner</strong> — Góc trao tặng đồ miễn phí: nếu bạn cần, bạn lấy. Nếu chưa cần, bạn để lại cho người khác.`, en: `<strong style="color: var(--ink-dark);">Free Corner</strong> — A free giving corner: if you need it, take it. If you don't, leave it for someone else.` },
    'model.doing_li2':    { vi: `<strong style="color: var(--ink-dark);">Hỗ trợ ký gửi thủ công</strong> — Nhận sản phẩm thủ công, tái chế, độc bản từ những người làm thủ công nhỏ lẻ/bền vững. Phí ký gửi 15%.`, en: `<strong style="color: var(--ink-dark);">Handmade consignment support</strong> — We take in handmade, recycled, one-of-a-kind products from small, sustainable makers. 15% consignment fee.` },
    'model.doing_li3':    { vi: `<strong style="color: var(--ink-dark);">Nhận ký gửi sản phẩm Gem cũ</strong> — Nhận lại các món đồ bạn đã mua tại Gem mà muốn trao cho nó một vòng đời mới. Phí ký gửi 5–10%.`, en: `<strong style="color: var(--ink-dark);">Consignment of old Gem items</strong> — We take back items you bought at Gem that you'd like to give a new life cycle. 5–10% consignment fee.` },
    'model.doing_li4':    { vi: `<strong style="color: var(--ink-dark);">5% lợi nhuận trích lại</strong> — Cho các dự án vì môi trường và các hoạt động cộng đồng nhỏ.`, en: `<strong style="color: var(--ink-dark);">5% of profit set aside</strong> — For environmental projects and small community activities.` },
    'model.toward_label': { vi: `ĐANG HƯỚNG ĐẾN`, en: `WHERE WE'RE HEADED` },
    'model.toward_h':     { vi: `Những gì chúng mình đang chuẩn bị.`, en: `What we're preparing.` },
    'model.toward_li1':   { vi: `<strong style="color: var(--ink-dark);">Lớp dạy nghề miễn phí</strong> — Cho phụ nữ trung niên, người trẻ, người khuyết tật — mở ra cơ hội tiếp cận công việc làm thủ công.`, en: `<strong style="color: var(--ink-dark);">Free vocational classes</strong> — For middle-aged women, young people, and people with disabilities — opening access to handmade work.` },
    'model.toward_li2':   { vi: `<strong style="color: var(--ink-dark);">Hợp tác với các tổ chức</strong> — Mở rộng dự án vì cộng đồng và môi trường, hợp tác cùng các đơn vị có chung mục tiêu.`, en: `<strong style="color: var(--ink-dark);">Partnering with organizations</strong> — Expanding community and environmental projects with partners who share our goals.` },
    'model.toward_li3':   { vi: `<strong style="color: var(--ink-dark);">Doanh nghiệp xã hội</strong> — Phát triển Gem thành một doanh nghiệp xã hội với tác động đo lường được trong 2–5 năm tới.`, en: `<strong style="color: var(--ink-dark);">Social enterprise</strong> — Growing Gem into a social enterprise with measurable impact over the next 2–5 years.` },
    'model.road_eyebrow': { vi: `Hành trình,`, en: `The journey,` },
    'model.road_title':   { vi: `Bốn season của Gem.`, en: `Gem's four seasons.` },
    'model.road_sub':     { vi: `Mỗi season là một chương mới trong hành trình chúng mình cùng nhau tạo nên.`, en: `Each season is a new chapter in the journey we create together.` },
    'model.s1_dur': { vi: `5 tháng`, en: `5 months` },
    'model.s1_l1': { vi: `Trải nghiệm sống bền vững`, en: `Experience sustainable living` },
    'model.s1_l2': { vi: `Tham gia workshop miễn phí`, en: `Join free workshops` },
    'model.s1_l3': { vi: `Kết nối cộng đồng đầu tiên`, en: `Connect with the first community` },
    'model.s1_l4': { vi: `Thử nghiệm & học hỏi`, en: `Experiment & learn` },
    'model.s2_dur': { vi: `không gian dài hạn`, en: `a long-term space` },
    'model.s2_l1': { vi: `Workshop & lớp học định kỳ`, en: `Regular workshops & classes` },
    'model.s2_l2': { vi: `Góc đọc, viết & làm thủ công`, en: `A corner to read, write & make` },
    'model.s2_l3': { vi: `Ký gửi, sửa chữa & tái chế`, en: `Consignment, repair & recycling` },
    'model.s2_l4': { vi: `Gặp gỡ & giao lưu thường xuyên`, en: `Regular meetups & exchanges` },
    'model.s3_dur': { vi: `mở rộng cộng đồng`, en: `expanding the community` },
    'model.s3_l1': { vi: `Swap market & flea market`, en: `Swap market & flea market` },
    'model.s3_l2': { vi: `Kết nối maker & artist local`, en: `Connecting local makers & artists` },
    'model.s3_l3': { vi: `Dự án cộng đồng & môi trường`, en: `Community & environmental projects` },
    'model.s3_l4': { vi: `Sống tuần hoàn mỗi ngày`, en: `Circular living, every day` },
    'model.s4_dur': { vi: `tác động bền vững`, en: `lasting impact` },
    'model.s4_l1': { vi: `Đào tạo kỹ năng & nghề thủ công`, en: `Skills & craft training` },
    'model.s4_l2': { vi: `Hợp tác cùng tổ chức, doanh nghiệp`, en: `Partnering with organizations & businesses` },
    'model.s4_l3': { vi: `Product & material innovation`, en: `Product & material innovation` },
    'model.s4_l4': { vi: `Lan tỏa lối sống bền vững`, en: `Spreading sustainable living` },
    'model.road_callout': { vi: `<strong>Season nào cũng cần bạn.</strong><br>Chúng mình đang ở Season 02 — một không gian để ở lại. Dù bạn ghé qua ở season nào, bạn cũng là một phần quan trọng của hành trình này.`, en: `<strong>Every season needs you.</strong><br>We're now in Season 02 — a space to stay. Whichever season you drop by, you are an important part of this journey.` },

    /* ---------- PRODUCTS (san-pham) ---------- */
    'products.eyebrow':   { vi: `Sản phẩm`, en: `Products` },
    'products.hero_title':{ vi: `Đa dạng các sắc màu từ Gem.`, en: `A spectrum of colors from Gem.` },
    'products.hero_sub':  { vi: `Các sản phẩm tại Gem có tính chất <em>độc bản</em> — mẫu mã, họa tiết, chất liệu không giống nhau, tùy thuộc vào vải vụn và đồ secondhand. Mời bạn ghé cửa hàng để xem & chọn trực tiếp.`, en: `Products at Gem are <em>one-of-a-kind</em> — designs, patterns, and materials all differ, depending on the fabric scraps and secondhand pieces. Come to the store to see & choose in person.` },
    'products.toc_title': { vi: `Danh mục`, en: `Categories` },
    'products.toc_fabric':  { vi: `Phụ kiện vải vụn`, en: `Fabric-scrap accessories` },
    'products.toc_vpp':     { vi: `Văn phòng phẩm`, en: `Stationery` },
    'products.toc_2hand':   { vi: `Quần áo 2hand`, en: `2hand clothing` },
    'products.toc_gom':     { vi: `Gốm sứ Nhật`, en: `Japanese ceramics` },
    'products.toc_setqua':  { vi: `Set quà`, en: `Gift sets` },
    'products.toc_service': { vi: `Dịch vụ`, en: `Services` },
    'products.toc_service_full': { vi: `Dịch vụ đặc biệt`, en: `Special services` },
    'products.cat1_h':   { vi: `Phụ kiện vải vụn`, en: `Fabric-scrap accessories` },
    'products.cat1_tag': { vi: `— handmade · upcycled`, en: `— handmade · upcycled` },
    'products.cat1_lead':{ vi: `Túi, ví, móc khóa, dây buộc tóc, bookmark, gối, thảm... được làm từ vải vụn thu gom từ các nhà may địa phương và quần áo secondhand. Mỗi sản phẩm là một câu chuyện vải riêng.`, en: `Bags, wallets, keychains, scrunchies, bookmarks, cushions, rugs... made from fabric scraps collected from local tailors and secondhand clothes. Each piece is its own fabric story.` },
    'products.cat1_more':{ vi: `+ Còn nhiều mẫu khác đang chờ bạn tại cửa hàng.`, en: `+ Many more designs are waiting for you at the store.` },
    'products.cat2_h':   { vi: `Văn phòng phẩm bền vững`, en: `Sustainable stationery` },
    'products.cat2_tag': { vi: `— giấy tái chế · handmade`, en: `— recycled paper · handmade` },
    'products.cat2_lead':{ vi: `Sổ, bookmark, giấy kraft, bút bi... sử dụng giấy tái chế và công nghệ in thân thiện môi trường. Các mẫu sổ Gem độc đáo: Sổ lên ý tưởng, Sổ quản lý công việc & quản lý stress.`, en: `Notebooks, bookmarks, kraft paper, pens... made with recycled paper and eco-friendly printing. Gem's signature notebooks: idea journals, work & stress management planners.` },
    'products.cat2_more':{ vi: `+ Sổ lên ý tưởng Gem, sổ quản lý stress, giấy kraft theo bảng giá, bookmark nam châm — xem trực tiếp tại cửa hàng.`, en: `+ Gem idea journals, stress-management planners, kraft paper (priced per the in-store list), magnetic bookmarks — see them in person at the store.` },
    'products.cat3_h':   { vi: `Quần áo 2hand`, en: `2hand clothing` },
    'products.cat3_tag': { vi: `— chọn lọc · tân trang`, en: `— curated · refurbished` },
    'products.coming_h': { vi: `Đang cập nhật ảnh.`, en: `Photos coming soon.` },
    'products.cat3_empty_p': { vi: `Quần áo 2hand tại Gem được chọn lọc kỹ lưỡng, có thể tân trang hoặc tái chế thành đồ mới. Mỗi món có câu chuyện riêng. Mời bạn ghé cửa hàng để xem & thử trực tiếp.`, en: `2hand clothing at Gem is carefully curated, and can be refurbished or recycled into something new. Each piece has its own story. Come to the store to see & try them on.` },
    'products.cat4_h':   { vi: `Gốm sứ Nhật`, en: `Japanese ceramics` },
    'products.cat4_tag': { vi: `— sắc màu của thời gian`, en: `— colors of time` },
    'products.cat4_empty_p': { vi: `Gốm sứ Nhật được chọn lọc, làm sạch, mang sắc màu của thời gian. Mỗi món gốm là một mảnh ký ức.`, en: `Japanese ceramics, carefully selected and cleaned, carrying the colors of time. Each piece is a fragment of memory.` },
    'products.serv_eyebrow': { vi: `Dịch vụ đặc biệt,`, en: `Special services,` },
    'products.serv_title':   { vi: `Khi bạn cần thêm một chút.`, en: `When you need a little more.` },
    'products.serv1_h':  { vi: `Workshop trải nghiệm`, en: `Experience workshops` },
    'products.serv1_p':  { vi: `Thử làm các phụ kiện như bìa sổ từ vải vụn/quần áo 2hand, làm giấy tái chế... Đăng ký và chọn workshop bạn muốn trải nghiệm trước qua liên hệ trực tiếp, để mọi niềm vui được trọn vẹn.`, en: `Try making accessories like notebook covers from fabric scraps or 2hand clothes, making recycled paper... Register and choose the workshop you'd like to try by contacting us in advance, so the whole experience feels complete.` },
    'products.serv1_cta':{ vi: `Xem lịch & đăng ký`, en: `See dates & sign up` },
    'products.serv2_h':  { vi: `Dịch vụ làm mới ký ức`, en: `Memory-renewal service` },
    'products.serv2_p':  { vi: `Nhận đặt hàng tái chế quần áo cũ của bạn thành những món đồ mới, giúp bạn lưu giữ mãi những kỷ niệm.`, en: `We take orders to recycle your old clothes into new items, helping you keep your memories forever.` },
    'products.serv2_li1':{ vi: `Chuẩn bị món đồ bạn cần sửa/làm mới`, en: `Prepare the item you want to repair or renew` },
    'products.serv2_li2':{ vi: `Mang/gửi đến cửa hàng`, en: `Bring or send it to the store` },
    'products.serv2_li3':{ vi: `Trao đổi thiết kế và giá với thợ may`, en: `Discuss the design and price with the tailor` },
    'products.serv2_li4':{ vi: `Kiểm tra/điều chỉnh sản phẩm trước khi nhận`, en: `Check and adjust the product before receiving it` },
    'products.serv2_li5':{ vi: `Nhận lại sản phẩm đã hoàn thiện`, en: `Receive the finished product` },
    'products.cta_h':    { vi: `Ghé thăm để xem trực tiếp.`, en: `Visit to see them in person.` },
    'products.cta_p':    { vi: `Mỗi sản phẩm là độc bản — ảnh chỉ là một phần của câu chuyện.`, en: `Every product is one-of-a-kind — photos are only part of the story.` },
    'products.cta_btn':  { vi: `Địa chỉ & cách ghé`, en: `Address & how to visit` },
    'products.modal_cta':   { vi: `Mời các bạn qua cửa hàng hoặc liên hệ với chúng mình qua các trang mạng xã hội nhé!`, en: `Come visit our store, or reach out to us on social media!` },
    'products.modal_contact': { vi: `Liên hệ với chúng mình`, en: `Get in touch` },
    'products.modal_close': { vi: `Đóng`, en: `Close` },
    'products.modal_prev':  { vi: `Ảnh trước`, en: `Previous photo` },
    'products.modal_next':  { vi: `Ảnh tiếp theo`, en: `Next photo` },

    /* product cards — vải vụn (branded names from the photos) */
    'products.origami_h':   { vi: `Origami Pouch`, en: `Origami Pouch` },
    'products.origami_p':   { vi: `Gấp ghép · Ví lục giác`, en: `Folded patchwork · hexagon pouch` },
    'products.oxford_h':     { vi: `Oxford Shirt`, en: `Oxford Shirt` },
    'products.oxford_p':     { vi: `Túi áo sơ mi`, en: `Shirt-shaped bag` },
    'products.denim_h':      { vi: `Reimagine the Denim`, en: `Reimagine the Denim` },
    'products.denim_p':      { vi: `Túi từ quần bò cũ`, en: `Bag from upcycled jeans` },
    'products.bloom_h':      { vi: `Bloom Charm`, en: `Bloom Charm` },
    'products.bloom_p':      { vi: `Móc khóa hoa · hoa rối sẽ nở`, en: `Flower charm keychain` },
    'products.tuibut_h':     { vi: `Túi bút kẹp sổ`, en: `Pen pouch` },
    'products.tuibut_p':     { vi: `Kẹp vào sổ tay`, en: `Clips onto your notebook` },
    'products.bookmark_h':   { vi: `Bookmark`, en: `Bookmark` },
    'products.bookmark_p':   { vi: `Cho người yêu sách`, en: `For book lovers` },
    'products.biaso_h':      { vi: `Bìa sổ vải ghép`, en: `Patchwork notebook cover` },
    'products.biaso_p':      { vi: `Handmade journal`, en: `Handmade journal` },
    'products.daydeo_h':     { vi: `Dây đeo cổ tay`, en: `Wrist strap` },
    'products.daydeo_p':     { vi: `Phụ kiện · móc khóa`, en: `Accessory · keychain` },
    'products.scrunchie_h':  { vi: `Dây buộc tóc`, en: `Hair scrunchie` },
    'products.scrunchie_p':  { vi: `Scrunchie vải mềm`, en: `Soft fabric scrunchie` },
    'products.lotcoc_h':     { vi: `Lót Cốc`, en: `Coaster` },
    'products.lotcoc_p':     { vi: `Lót ly vải · upcycled`, en: `Upcycled fabric coaster` },
    'products.goi_h':        { vi: `Gối Chắp Sắc`, en: `Patchwork cushion` },
    'products.goi_p':        { vi: `Họa tiết patchwork`, en: `Patchwork patterns` },
    'products.tham_h':       { vi: `Thảm Chắp Sắc`, en: `Patchwork rug` },
    'products.tham_p':       { vi: `Vuông · tròn · table runner`, en: `Square · round · table runner` },

    /* product cards — VPP */
    'products.pv1_h':    { vi: `Sổ kraft spiral`, en: `Kraft spiral notebook` },
    'products.pv1_p':    { vi: `Bìa kraft · A6/A5`, en: `Kraft cover · A6/A5` },
    'products.sokhau_h': { vi: `Sổ khâu tay tái chế`, en: `Hand-stitched recycled notebook` },
    'products.sokhau_p': { vi: `Ký gửi · Tiệm sổ Cún Con`, en: `Consignment · Tiệm sổ Cún Con` },

    /* 2hand + gốm gallery cards */
    'products.cat3_lead': { vi: `Quần áo 2hand được chọn lọc kỹ, có thể tân trang hoặc tái chế thành đồ mới. Bấm vào ảnh để xem cả bộ sưu tập.`, en: `Carefully curated 2hand clothing, ready to be refurbished or recycled into something new. Tap a photo to browse the whole collection.` },
    'products.c2hand_h':  { vi: `Bộ sưu tập 2hand`, en: `2hand collection` },
    'products.c2hand_p':  { vi: `Mỗi món một câu chuyện`, en: `Each piece, its own story` },
    'products.cat4_lead': { vi: `Gốm sứ Nhật được chọn lọc, làm sạch, mang sắc màu của thời gian. Bấm vào ảnh để xem thêm.`, en: `Curated Japanese ceramics, cleaned and carrying the colors of time. Tap a photo to see more.` },
    'products.cgom_h':    { vi: `Gốm sứ Nhật chọn lọc`, en: `Curated Japanese ceramics` },
    'products.cgom_p':    { vi: `Sắc màu của thời gian`, en: `Colors of time` },

    /* Set quà category */
    'products.cat5_h':   { vi: `Set quà tặng`, en: `Gift sets` },
    'products.cat5_tag': { vi: `— trao gửi yêu thương`, en: `— give with love` },
    'products.cat5_lead':{ vi: `Những set quà nhỏ gói ghém từ đồ Gem — cho dịp tốt nghiệp, sinh nhật, hay chỉ để tặng nhau. Mỗi set là một combo riêng, bấm vào ảnh để xem thêm.`, en: `Little gift sets wrapped from Gem pieces — for graduations, birthdays, or just because. Each set is its own combo; tap a photo to see more.` },
    'products.setqua_h': { vi: `Set quà tặng`, en: `Gift set` },
    'products.setqua_p': { vi: `Gói ghém cho dịp đặc biệt`, en: `Wrapped for special occasions` },

    /* ---------- VISIT (ghe-tham) ---------- */
    'visit.eyebrow':    { vi: `Ghé thăm`, en: `Visit` },
    'visit.hero_title': { vi: `Một nơi để bắt đầu.`, en: `A place to begin.` },
    'visit.hero_sub':   { vi: `Season 02 đang mở cửa — một không gian để bạn ở lại lâu hơn.`, en: `Season 02 is open — a space for you to stay a little longer.` },
    'visit.season_desc':{ vi: `Một không gian để trải nghiệm sống bền vững, xem quy trình làm đồ thủ công tái chế, và ngồi lại trò chuyện cùng nhau.`, en: `A space to experience sustainable living, watch how recycled handmade pieces are made, and sit down for a chat together.` },
    'visit.season_until': { vi: `Open Studio · 09:00–19:00 · mở cửa hàng ngày`, en: `Open Studio · 09:00–19:00 · open every day` },
    'visit.maps_btn':   { vi: `Chỉ đường Google Maps`, en: `Get directions on Google Maps` },
    'visit.map_title':  { vi: `Vị trí Gem Chạm Sắc trên Google Maps`, en: `Gem Chạm Sắc location on Google Maps` },
    'visit.contact_h1': { vi: `Địa chỉ & giờ mở cửa`, en: `Address & opening hours` },
    'visit.addr_label': { vi: `Địa chỉ`, en: `Address` },
    'visit.addr_value': { vi: `Tầng 3, Trung tâm Văn hóa - Thông tin<br>và Thể thao Phường Hai Bà Trưng<br>114 Lê Gia Đỉnh, Hà Nội`, en: `3rd Floor, Hai Ba Trung Ward<br>Culture, Information & Sports Center<br>114 Le Gia Dinh, Hanoi` },
    'visit.hours_label':{ vi: `Giờ mở cửa`, en: `Opening hours` },
    'visit.hours_value':{ vi: `Open Studio: 09:00 – 19:00<br>Mở cửa tất cả các ngày trong tuần.`, en: `Open Studio: 09:00 – 19:00<br>Open every day of the week.` },
    'visit.contact_h2': { vi: `Liên hệ trực tiếp`, en: `Get in touch` },
    'visit.phone_label':{ vi: `Điện thoại`, en: `Phone` },
    'visit.web_label':  { vi: `Website`, en: `Website` },
    'visit.social_label': { vi: `Mạng xã hội`, en: `Social media` },
    'visit.email_eyebrow': { vi: `Mùa nào cũng cần bạn,`, en: `Every season needs you,` },
    'visit.email_h':    { vi: `Đồng hành cùng Gem.`, en: `Walk alongside Gem.` },
    'visit.email_p':    { vi: `Gem đang mở cửa mỗi ngày — đây là lúc để bạn ghé qua, ở lại một chút, và đồng hành cùng những điều tuy nhỏ bé nhưng đầy ý nghĩa.`, en: `Gem is open every day — now's the time to drop by, stay a while, and walk alongside things that are small yet full of meaning.` },
    'visit.email_list': { vi: `Chúng mình sẽ báo bạn khi:<br>· Có workshop mới<br>· Có hoạt động & sự kiện ở studio<br>· Có dự án vì môi trường cần thêm bạn đồng hành`, en: `We'll let you know when:<br>· There's a new workshop<br>· There are studio activities & events<br>· There's an environmental project that needs another companion` },
    'visit.email_btn':  { vi: `Đồng hành cùng Gem`, en: `Walk alongside Gem` },

    /* ---------- SEASON 02 STORY (season-02) ---------- */
    's2.eyebrow':     { vi: `Season 02`, en: `Season 02` },
    's2.hero_sub':    { vi: `Một không gian để bạn ở lại lâu hơn.`, en: `A space for you to stay a little longer.` },
    's2.lede':        { vi: `Gem Chạm Sắc Studio tại Lê Gia Đỉnh — nơi những ý tưởng về thủ công, tái chế và sáng tạo được nuôi dưỡng mỗi ngày.`, en: `Gem Chạm Sắc Studio on Lê Gia Đỉnh — where ideas about craft, recycling, and creativity are nurtured every day.` },
    's2.can_h':       { vi: `Nơi bạn có thể`, en: `A place where you can` },
    's2.can1':        { vi: `Xem quy trình tạo nên những sản phẩm handmade từ vật liệu tái chế.`, en: `Watch how handmade products come to life from recycled materials.` },
    's2.can2':        { vi: `Thử một vài hoạt động thủ công nhỏ.`, en: `Try a few small handmade activities.` },
    's2.can3':        { vi: `Tìm hiểu về hành trình từ "cũ" sang "mới".`, en: `Learn about the journey from "old" to "new".` },
    's2.can4':        { vi: `Ngồi lại một chút, trò chuyện và tận hưởng một góc nhỏ sáng tạo giữa Hà Nội.`, en: `Sit down a while, chat, and enjoy a small creative corner in the heart of Hanoi.` },
    's2.stories_p':   { vi: `Mỗi lần ghé, có thể bạn sẽ gặp một câu chuyện khác, được kể bằng nhiều chất liệu khác nhau.`, en: `Each time you drop by, you might meet a different story, told through many different materials.` },
    's2.stories_lines': { vi: `Một buổi học đàn tranh.<br>Một hoạt động về văn hóa Việt Nam.<br>Hay một người đang tìm cách bắt đầu sống bền vững từ những điều rất nhỏ.`, en: `A đàn tranh (zither) lesson.<br>An activity about Vietnamese culture.<br>Or someone finding a way to start living sustainably from the smallest things.` },
    's2.made_by_label': { vi: `Một không gian được kiến tạo bởi`, en: `A space created by` },
    's2.addr_label':  { vi: `Địa chỉ`, en: `Address` },
    's2.addr_value':  { vi: `Tầng 3, Trung tâm Văn hóa - Thông tin và Thể thao Phường Hai Bà Trưng<br>114 Lê Gia Đỉnh, Hà Nội`, en: `3rd Floor, Hai Ba Trung Ward Culture, Information & Sports Center<br>114 Le Gia Dinh, Hanoi` },
    's2.hours_label': { vi: `Giờ mở cửa`, en: `Opening hours` },
    's2.hours_value': { vi: `Open Studio: 09:00 – 19:00 · mở cửa hàng ngày`, en: `Open Studio: 09:00 – 19:00 · open every day` },
    's2.fb_btn':      { vi: `Xem video Season 02 trên Facebook`, en: `Watch the Season 02 video on Facebook` },
    's2.visit_btn':   { vi: `Địa chỉ & cách ghé thăm`, en: `Address & how to visit` },
    's2.back_model':  { vi: `Xem hành trình 4 season`, en: `See the 4-season journey` },
    's2.card_more':   { vi: `Đọc câu chuyện Season 02 →`, en: `Read the Season 02 story →` },
    's2.done_badge':  { vi: `đã qua`, en: `wrapped` },

    /* ---------- 404 ---------- */
    'nf.udon_alt': { vi: `Udon đang nhìn ngơ ngác`, en: `Udon looking puzzled` },
    'nf.eyebrow':  { vi: `404`, en: `404` },
    'nf.h1':       { vi: `Hình như Udon lạc đường rồi.`, en: `Looks like Udon got lost.` },
    'nf.lead':     { vi: `Trang bạn đang tìm không có ở đây.<br>Có thể link đã cũ, hoặc Udon vừa chôn xương ở đâu đó. Mời bạn quay lại.`, en: `The page you're looking for isn't here.<br>Maybe the link is old, or Udon just buried a bone somewhere. Please head back.` },
    'nf.btn':      { vi: `Về trang chủ`, en: `Back to home` }
  };

  function t(key, lang) {
    var entry = STRINGS[key];
    if (!entry) return null;
    return entry[lang] != null ? entry[lang] : entry[DEFAULT];
  }

  function getLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* ignore */ }
    return DEFAULT;
  }

  function apply(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'), lang);
      if (v != null) el.textContent = v;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'), lang);
      if (v != null) el.innerHTML = v;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx < 0) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        var v = t(key, lang);
        if (v != null) el.setAttribute(attr, v);
      });
    });

    document.querySelectorAll('.lang-btn').forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.dispatchEvent(new CustomEvent('gem:langchange', { detail: { lang: lang } }));
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    apply(lang);
  }

  // Offer English to visitors whose browser isn't Vietnamese — a hint, never an
  // automatic switch. Plenty of Vietnamese people run English-language phones,
  // and silently serving them English would be worse than the problem it solves.
  // Text is English on purpose: it is only ever shown to non-Vietnamese browsers.
  var HINT_KEY = 'gem-lang-hint';

  function maybeOfferEnglish() {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
      if (localStorage.getItem(HINT_KEY) === 'dismissed') return;
    } catch (e) { return; }

    if (saved) return;                       // already chose a language
    if (getLang() !== DEFAULT) return;       // already viewing English

    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (!nav || nav.toLowerCase().indexOf('vi') === 0) return;

    var bar = document.createElement('div');
    bar.className = 'lang-hint';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Language');
    bar.innerHTML =
      '<span>This site is also available in English.</span>' +
      '<button type="button" class="lang-hint-go">View in English</button>' +
      '<button type="button" class="lang-hint-x" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(bar);

    function dismiss() {
      try { localStorage.setItem(HINT_KEY, 'dismissed'); } catch (e) { /* ignore */ }
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    }

    bar.querySelector('.lang-hint-go').addEventListener('click', function () {
      setLang('en');
      dismiss();
    });
    bar.querySelector('.lang-hint-x').addEventListener('click', dismiss);
  }

  function init() {
    apply(getLang());
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    maybeOfferEnglish();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Merge extra strings in from another script. Call at top level (before
  // DOMContentLoaded) so the first apply() already sees them.
  function add(map) {
    Object.keys(map || {}).forEach(function (k) { STRINGS[k] = map[k]; });
  }

  // Expose for other scripts (e.g. mailerlite.js dynamic button text)
  window.GemI18n = {
    setLang: setLang,
    getLang: getLang,
    add: add,
    t: function (k) { return t(k, getLang()); }
  };
})();
