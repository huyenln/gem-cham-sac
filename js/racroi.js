// Gem Chạm Sắc — Bất ngờ ngoài phố: rác rơi (Studio Gem 2D)
//
// Out on the street a piece of litter (sometimes two or three) falls near
// the visitor and a strip at the top counts down. A tap picks it up, and one
// message opens: a tip on rubbish, sorting, fabric or old clothes, each with
// its source to open (Anna 05/11: "đều phải có nguồn đáng tin cậy").
// Too slow: Udon runs in, tugs a trouser hem and pulls the visitor back to
// it, with a light line ("Một bước chân qua, một cái chai ở lại"), and waits
// until it is picked. Every piece counts (localStorage gem-rac); 100, 200 and
// 500 give a badge, for fun. Opened messages stay in the Sổ thông điệp
// (Tủ sưu tầm). studio.js decides when ("Bất ngờ ngoài phố") and loads this
// file the first time; it hands over the scene through ctx.

window.GemRacRoi = (function () {
  'use strict';

  var STR = {
    'rr.fell1':    { vi: `Ơ, có rác rơi! Nhặt giúp Gem nhé`, en: `Oops, some litter fell! Pick it up for Gem` },
    'rr.felln':    { vi: `Ơ, {n} món rác rơi! Nhặt giúp Gem nhé`, en: `Oops, {n} bits of litter fell! Pick them up for Gem` },
    'rr.left':     { vi: `còn {n}`, en: `{n} to go` },
    'rr.late':     { vi: `Hết giờ rồi…`, en: `Time's up…` },
    'rr.wait':     { vi: `Udon chờ bạn nhặt nè`, en: `Udon is waiting for you to pick it up` },
    'rr.item':     { vi: `Nhặt {mon}`, en: `Pick up {mon}` },
    'rr.thanks':   { vi: `Cảm ơn bạn đã nhặt rác!`, en: `Thank you for picking it up!` },
    'rr.count':    { vi: `Bạn đã nhặt {n} món rác ngoài phố.`, en: `You've picked up {n} bits of litter on the street.` },
    'rr.msg_h':    { vi: `Thông điệp`, en: `A note` },
    'rr.source':   { vi: `Nguồn`, en: `Source` },
    'rr.close':    { vi: `Đóng`, en: `Close` },
    'rr.book':     { vi: `Sổ thông điệp`, en: `Notebook` },
    'rr.book_p':   { vi: `Mỗi món rác bạn nhặt ngoài phố mở một thông điệp. Đã mở {n}/{t}.`,
                     en: `Each bit of litter you pick up on the street opens a note. {n} of {t} opened.` },
    'rr.book_0':   { vi: `Chưa mở thông điệp nào. Ra phố dạo một vòng, thỉnh thoảng có rác rơi đấy.`,
                     en: `No notes yet. Take a walk on the street: now and then some litter falls.` },
    'rr.badge_h':  { vi: `Huy hiệu mới`, en: `A new badge` },
    'rr.b100':     { vi: `Lá non`, en: `New leaf` },
    'rr.b200':     { vi: `Cây xanh`, en: `Green tree` },
    'rr.b500':     { vi: `Rừng nhỏ`, en: `Little wood` },
    'rr.badge_p':  { vi: `{n} món rác đã được nhặt khỏi phố. Cảm ơn bạn đã đi cùng Gem tới đây.`,
                     en: `{n} bits of litter off the street. Thank you for coming this far with Gem.` },
    'rr.badges':   { vi: `Huy hiệu`, en: `Badges` },
    'rr.cat.rac':      { vi: `Bỏ rác đúng`, en: `Rubbish, the right way` },
    'rr.cat.phanloai': { vi: `Phân loại rác`, en: `Sorting waste` },
    'rr.cat.vai':      { vi: `Vải và tái chế`, en: `Fabric and recycling` },
    'rr.cat.docu':     { vi: `Đồ cũ`, en: `Old things` },
    'rr.cat.bot':      { vi: `Bớt rác`, en: `Less waste` },
    'rr.cat.khihau':   { vi: `Khí hậu`, en: `Climate` },
    // Udon's lines when he pulls the visitor back: light, a little meme-ish,
    // never about death, illness or calling anyone names (Anna 05/11)
    'rr.l1': { vi: `Một bước chân qua, {mon} ở lại.`, en: `One step past, {mon} left behind.` },
    'rr.l2': { vi: `Chạy trời không khỏi nắng, chạy rác không khỏi Udon.`, en: `You can run from the sun, but not from Udon.` },
    'rr.l3': { vi: `Ủa alo? Bạn ơi, rác!`, en: `Hello? Excuse me, your litter!` },
    'rr.l4': { vi: `Bỏ quên gì không? À, {mon}.`, en: `Forgot something? Ah, {mon}.` },
    'rr.l5': { vi: `Udon: Gâu! (dịch: quay lại nhặt rác đi bạn ơi)`, en: `Udon: Woof! (translation: come back and pick it up)` },
    'rr.l6': { vi: `Gem thấy hết rồi nha.`, en: `Gem saw that.` },
    'rr.l7': { vi: `Đi đâu mà vội mà vàng, rác còn nằm lại bên đàng kìa.`, en: `What's the hurry? There's litter left by the road.` },
    'rr.l8': { vi: `Tưởng thoát được à? Udon đây!`, en: `Thought you'd slip away? Udon's here!` }
  };
  var LINES = 8;

  // Street litter (drawings of the sorting game, images/studio/rac/), each
  // with what it is called in Udon's lines
  var ITEMS = {
    'chai':          { vi: 'cái chai', en: 'a bottle' },
    'ly-tra-sua':    { vi: 'cái ly trà sữa', en: 'a bubble tea cup' },
    'goi-snack':     { vi: 'gói snack', en: 'a crisp packet' },
    'hop-sua-chua':  { vi: 'hộp sữa chua', en: 'a yoghurt pot' },
    'lo-keo':        { vi: 'lọ kẹo', en: 'a sweet jar' },
    'tui-zip':       { vi: 'cái túi zip', en: 'a zip bag' },
    'hop-com':       { vi: 'hộp cơm', en: 'a lunch box' },
    'thia':          { vi: 'cái thìa nhựa', en: 'a plastic spoon' },
    'nap-chai':      { vi: 'cái nắp chai', en: 'a bottle cap' },
    'vo-banh':       { vi: 'vỏ bánh', en: 'a wrapper' },
    'hop-banh':      { vi: 'hộp bánh', en: 'a cake box' }
  };
  var RAC = 'images/studio/rac/';
  var BADGES = [100, 200, 500];

  // Messages: one opens with each piece picked up. Each carries its source,
  // shown and linked on the card. Drafted 11/2026 from the pages linked;
  // Gem reviews the wording.
  var MSGS = [
    // the six Tagom posters hung in the studio (images/studio/tagom/), with
    // Tagom's leave (23/10/2026)
    { id: "tg-01", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Chai nhựa đi ba bước: tháo nắp và bóc tem, làm bẹp chai, rồi mới phân loại vào bao.",
      en: "A plastic bottle takes three steps: take off the cap and peel off the label, flatten the bottle, then sort it into the bag." },
    { id: "tg-02", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Hộp, khay, chai từng đựng đồ ăn hay nước sốt: làm sạch và để khô rồi mới bỏ vào bao.",
      en: "Boxes, trays and bottles that held food or sauce: clean them and let them dry before they go into the bag." },
    { id: "tg-03", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Gói snack, túi nilon cứng: làm sạch, để khô rồi gấp gọn, hoặc dồn chung vào một túi nhỏ cho gọn.",
      en: "Snack bags and other hard nylon: clean, dry, then fold them neatly, or pack them together into one compact bag." },
    { id: "tg-04", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Cột khí chống sốc trong thùng hàng thì làm xẹp hết rồi mới cho vào bao nilon mềm.",
      en: "Air-cushion packaging from a parcel: let all the air out before it goes into the soft nylon bag." },
    { id: "tg-05", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Chai, lọ trong suốt có kí hiệu số 1 (PET), như chai nước, chai nước ngọt, hũ nhựa trong, thuộc nhóm nhựa 1 dễ tái chế.",
      en: "Clear bottles and jars marked with the number 1 (PET), like water bottles, soda bottles and clear jars, belong to the easy-to-recycle plastic #1 group." },
    { id: "tg-06", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nắp chai không đi cùng thân chai: nắp vào nhóm nhựa 2, 4, 5, còn tem nhãn bóc ra thì vào nhóm nilon cứng.",
      en: "The cap doesn't stay with the bottle: caps go with plastics #2, #4, #5, and the peeled-off label goes with hard nylon." },
    { id: "tg-07", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Cũng mang số 1, nhưng có màu và bề mặt bóng, hoặc trong suốt mà mỏng giòn như cốc, khay nhựa (trừ chai, lọ), thì thuộc nhóm nhựa 1 khó tái chế.",
      en: "Also marked 1, but coloured and glossy, or clear yet thin and brittle like plastic cups and trays (bottles and jars aside): that's the hard-to-recycle plastic #1 group." },
    { id: "tg-08", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Thấy số 2 (HDPE), 4 (LDPE) hoặc 5 (PP) là nhựa dễ tái chế: can, chai dầu gội, hộp đựng thực phẩm, đồ chơi nhựa, nắp chai.",
      en: "Numbers 2 (HDPE), 4 (LDPE) or 5 (PP) mean easy-to-recycle plastic: jugs, shampoo bottles, food boxes, plastic toys, bottle caps." },
    { id: "tg-09", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Món nhựa không có kí hiệu? Nếu nó dẻo, đàn hồi và chỉ một lớp nhựa, thì xếp cùng nhóm nhựa 2, 4, 5.",
      en: "No number on the plastic? If it is flexible, springy and a single layer, it goes with plastics #2, #4, #5." },
    { id: "tg-10", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Số 6 (PS), số 7 (Other), hay nhựa màu cứng, nhiều lớp, không đàn hồi như hộp sữa chua, thìa nhựa màu, bàn chải, đĩa CD: đó là nhóm nhựa 6, 7 khó tái chế.",
      en: "Number 6 (PS), number 7 (Other), or stiff, coloured, multi-layer plastic that doesn't flex, like yogurt cups, coloured plastic spoons, toothbrushes and CDs: that's the hard-to-recycle #6, #7 group." },
    { id: "tg-11", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Vỏ bút bi nhựa vào nhóm nhựa 6, 7, nhưng ruột bút thì không: tháo ruột ra trước.",
      en: "A plastic pen body goes with plastics #6, #7, but the refill doesn't: take the refill out first." },
    { id: "tg-12", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon cứng nhận ra bằng tay: nhiều lớp, không kéo dãn, bóp vào nghe sột soạt. Gói snack, gói kẹo, túi nước giặt đều thuộc nhóm này.",
      en: "You can tell hard nylon by touch: many layers, no stretch, and it crinkles when squeezed. Snack bags, sweet wrappers and detergent pouches all belong here." },
    { id: "tg-13", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon cứng có lớp nhôm (gói snack) hay không tráng nhôm đều chung một nhóm. Bao gạo dệt và túi vải không dệt cũng vào nhóm nilon cứng.",
      en: "Hard nylon with a foil layer (snack bags) or without one is all one group. Woven rice sacks and non-woven bags go with hard nylon too." },
    { id: "tg-14", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon mềm thì kéo dãn được, chỉ một chất liệu, bề mặt mềm: túi nilon quai xách, màng quấn hàng, túi bóng khí.",
      en: "Soft nylon stretches, is a single material and feels soft: carrier bags, stretch wrap, bubble-wrap mailers." },

    // US EPA: litter, batteries, old electronics
    { id: "ep-01", cat: "rac", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Đi công viên, ra biển: mang theo gì thì mang về nấy, để chỗ mình vừa ghé không còn rác.",
      en: "At the park or the beach, take back everything you bring, so the place is left without litter." },
    { id: "ep-02", cat: "rac", source: "US EPA · Used Lithium-Ion Batteries", url: "https://www.epa.gov/recycle/used-lithium-ion-batteries",
      vi: "Pin lithium-ion và đồ có loại pin này không bỏ vào rác hay thùng tái chế chung: bị đè, vỡ khi chở đi là có thể gây cháy. Mang tới điểm thu gom riêng.",
      en: "Lithium-ion batteries, and things with them inside, don't go in the rubbish or the household recycling: crushed on the way, they can start a fire. Take them to a separate collection point." },
    { id: "ep-03", cat: "rac", source: "US EPA · Used Lithium-Ion Batteries", url: "https://www.epa.gov/recycle/used-lithium-ion-batteries",
      vi: "Pin đã dùng vẫn có thể còn đủ điện để gây cháy. Dán băng keo cách điện lên hai cực, hoặc cho mỗi viên vào một túi nhựa riêng.",
      en: "Even used batteries can hold enough energy to start a fire. Tape over the terminals, or put each one in its own plastic bag." },
    { id: "ep-04", cat: "docu", source: "US EPA · Electronics Donation and Recycling", url: "https://www.epa.gov/recycle/electronics-donation-and-recycling",
      vi: "Trước khi cho hay mang máy cũ đi tái chế: xoá hết dữ liệu cá nhân, và tháo pin ra vì pin có thể phải tái chế riêng.",
      en: "Before you give away or recycle an old device: delete all personal data, and take the batteries out, as they may need recycling separately." },
    { id: "ep-05", cat: "docu", source: "US EPA · Electronics Donation and Recycling", url: "https://www.epa.gov/recycle/electronics-donation-and-recycling",
      vi: "Theo ước tính của Cục Địa chất Mỹ (2006), cứ một triệu điện thoại được tái chế thì thu lại khoảng 16 tấn đồng, 350 kg bạc và 34 kg vàng.",
      en: "The US Geological Survey estimated (2006) that every million recycled phones give back about 16 tonnes of copper, 350 kg of silver and 34 kg of gold." },
    { id: "ep-06", cat: "docu", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Giữ lại hộp giấy, giấy màu, khay trứng cho những buổi làm đồ thủ công.",
      en: "Keep packaging, coloured paper and egg cartons for arts and crafts." },
    { id: "ep-07", cat: "docu", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Chuyển nhà thì gói đồ dễ vỡ bằng báo cũ.",
      en: "Moving house? Wrap fragile things in old newspaper." },
    { id: "ep-08", cat: "docu", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Quần áo, đồ chơi, sách không dùng nữa: làm một buổi bán lại đồ cũ, hay một buổi mang đồ đi tặng, để chúng tìm được nhà mới.",
      en: "Clothes, toys and books you no longer use: a yard sale or a donation picnic helps them find new homes." },

    // US EPA: wasting less, food, compost
    { id: "ep-09", cat: "bot", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Mang cơm hộp, bình nước dùng nhiều lần thay cho hộp, chai dùng một lần.",
      en: "Pack lunch in reusable boxes and bring drinks in a bottle you refill, instead of throwaway ones." },
    { id: "ep-10", cat: "bot", source: "US EPA · What You Can Do", url: "https://www.epa.gov/recycle/what-you-can-do",
      vi: "Lấy vừa đủ thôi: gói tương, khăn giấy lấy thừa thường bị bỏ đi.",
      en: "Take only what you need: extra sauce packets and napkins too often go to waste." },
    { id: "ep-11", cat: "bot", source: "US EPA · Preventing Wasted Food At Home", url: "https://www.epa.gov/recycle/preventing-wasted-food-home",
      vi: "Trước khi đi chợ, xem tủ lạnh trước, lên thực đơn cho tuần, rồi chỉ mua thứ cần cho những bữa đó.",
      en: "Before shopping, look in the fridge first, plan the week's meals, and buy only what those meals need." },
    { id: "ep-12", cat: "bot", source: "US EPA · Preventing Wasted Food At Home", url: "https://www.epa.gov/recycle/preventing-wasted-food-home",
      vi: "Chuối, táo, lê, bơ toả khí ethylene khi chín, làm rau quả để cạnh chín và hỏng nhanh hơn. Để chúng riêng ra.",
      en: "Bananas, apples, pears and avocados give off ethylene as they ripen, so produce nearby ripens and spoils faster. Keep them apart." },
    { id: "ep-13", cat: "bot", source: "US EPA · Preventing Wasted Food At Home", url: "https://www.epa.gov/recycle/preventing-wasted-food-home",
      vi: "Rau quả hơi héo, nguyên liệu còn lẻ, đồ ăn thừa vẫn có thể nấu canh, xào, làm nước sốt hay sinh tố.",
      en: "Produce past its prime, odds and ends and leftovers can still go into soups, stir-fries, sauces or smoothies." },
    { id: "ep-14", cat: "bot", source: "US EPA · Composting At Home", url: "https://www.epa.gov/recycle/composting-home",
      vi: "Ủ phân tại nhà: cứ một phần “xanh” (vỏ rau củ quả, bã cà phê) thì thêm hai, ba phần “nâu” (lá khô, giấy vụn không bóng), giữ ẩm như miếng bọt biển vắt ráo.",
      en: "Composting at home: for one part “greens” (fruit and veg scraps, coffee grounds) add two to three parts “browns” (dry leaves, non-glossy shredded paper), as damp as a wrung-out sponge." },
    { id: "ep-15", cat: "bot", source: "US EPA · Composting At Home", url: "https://www.epa.gov/recycle/composting-home",
      vi: "Đống ủ ở nhà không nên có thịt, cá, xương, đồ sữa, dầu mỡ, phân thú cưng, giấy bóng hay tem dán trên trái cây.",
      en: "Keep meat, fish, bones, dairy, fats and oils, pet waste, glossy paper and fruit stickers out of a home compost pile." },

    // climate, today: UNDP's Climate Box, South-East Asia edition (2024; read in
    // the Vietnamese translation draft of 13/06/2025 that Gem has, parts 1–2)
    { id: "cs-01", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Từ khi con người bắt đầu đốt than, Trái Đất đã ấm lên khoảng 1,2°C. Theo Tổ chức Khí tượng Thế giới, 2015–2024 là mười năm ấm nhất từng ghi nhận.",
      en: "Since people began burning coal, the Earth has warmed by about 1.2°C. The World Meteorological Organization finds 2015–2024 the warmest ten years on record." },
    { id: "cs-02", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Ở Đông Nam Á, nhiệt độ trung bình năm tăng 0,14–0,20°C mỗi thập kỷ từ những năm 1960. Ngày nóng và đêm ấm nhiều lên, ngày và đêm lạnh ít đi.",
      en: "In South-East Asia the yearly average temperature has risen 0.14–0.20°C a decade since the 1960s. Hot days and warm nights are more common, cold ones fewer." },
    { id: "cs-03", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Năm 2023, Việt Nam ghi nhận mức nhiệt kỷ lục 44,2°C. Cùng mùa nóng ấy, Thái Lan lên tới 45,4°C và Lào 43,5°C.",
      en: "In 2023 Vietnam recorded its highest temperature yet, 44.2°C. In the same hot season Thailand reached 45.4°C and Laos 43.5°C." },
    { id: "cs-04", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Philippines và Việt Nam đang ghi nhận bão ngày càng mạnh. Năm 2020, miền Trung hứng chín cơn bão và áp thấp nhiệt đới liên tiếp chỉ trong vài tuần.",
      en: "The Philippines and Vietnam are seeing ever stronger storms. In 2020 central Vietnam was hit by nine storms and tropical depressions in a row within a few weeks." },
    { id: "cs-05", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Đại dương, rừng và đất hút giúp khoảng một nửa lượng CO₂ con người thải ra; nửa còn lại đọng trong khí quyển. Mất rừng là mất bớt chỗ hút CO₂.",
      en: "Oceans, forests and soil take up about half the CO₂ people give off; the other half builds up in the air. Losing forests means less to take it up." },
    { id: "cs-06", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Đại dương giữ hơn 90% năng lượng của hệ thống khí hậu. Vì vậy một mùa đông lạnh không có nghĩa là Trái Đất thôi nóng lên: phần lớn nhiệt dồn vào lòng biển.",
      en: "The ocean holds over 90% of the climate system's energy. So a cold winter doesn't mean the Earth has stopped warming: most of the extra heat goes into the sea." },
    { id: "cs-07", cat: "khihau", source: "Climate Box Đông Nam Á · UNDP", source_en: "Climate Box South-East Asia · UNDP", url: "https://www.undp.org/thailand/publications/climate-box-English",
      vi: "Không có hiệu ứng nhà kính, nhiệt độ trung bình bề mặt Trái Đất sẽ là −19°C.",
      en: "Without the greenhouse effect, the Earth's surface would average −19°C." },

    // practical tips: Climate Box textbook, first edition (2015), via the UN
    // CC:Learn library. Part 3 (carbon footprint, saving energy) is not in
    // the South-East Asia draft Gem has, so these stay with the 2015 book;
    // its figures are the book's own examples, kept with "khoảng" / "about".
    { id: "cb-02", cat: "khihau", source: "Climate Box · UNDP (2015)", url: "https://www.uncclearn.org/resources/library/climate-box-an-interactive-learning-toolkit-on-climate-change/",
      vi: "Dấu chân carbon theo ví dụ của Climate Box: một túi nilon ở cửa hàng khoảng 10 g CO₂, một chai nước 0,5 lít sản xuất trong vùng khoảng 110 g, một chiếc quần jeans khoảng 6 kg.",
      en: "Carbon footprints, from Climate Box's examples: a shop's plastic bag about 10 g of CO₂, a locally made 0.5-litre bottle of water about 110 g, a pair of jeans about 6 kg." },
    { id: "cb-04", cat: "khihau", source: "Climate Box · UNDP (2015)", url: "https://www.uncclearn.org/resources/library/climate-box-an-interactive-learning-toolkit-on-climate-change/",
      vi: "Làm từ vật liệu tái chế (recycled materials) tốn ít năng lượng hơn làm mới: nhôm bớt khoảng 95%, nhựa 80–88%, thuỷ tinh 68%, giấy 64%.",
      en: "Making things from recycled material takes less energy than from new: about 95% less for aluminium, 80–88% for plastic, 68% for glass, 64% for paper." },
    { id: "cb-05", cat: "khihau", source: "Climate Box · UNDP (2015)", url: "https://www.uncclearn.org/resources/library/climate-box-an-interactive-learning-toolkit-on-climate-change/",
      vi: "Đồ chỉ hơi bẩn thì giặt chế độ tiết kiệm: tốn ít điện hơn gần 10 lần so với giặt nửa tiếng ở 90°C. Đợi đủ một mẻ rồi mới giặt; món nào treo móc là phẳng thì khỏi là.",
      en: "Lightly soiled clothes only need an economy cycle: it uses nearly 10 times less power than half an hour at 90°C. Wait for a full load, and skip ironing what hangs smooth on a hanger." },
    { id: "cb-06", cat: "khihau", source: "Climate Box · UNDP (2015)", url: "https://www.uncclearn.org/resources/library/climate-box-an-interactive-learning-toolkit-on-climate-change/",
      vi: "Tắt hẳn thiết bị khi không dùng: chế độ chờ vẫn tốn điện. Sạc điện thoại xong thì rút ra, đừng để cắm suốt.",
      en: "Switch devices right off when you're not using them: standby still uses power. Unplug the phone charger when it's done." },
    { id: "cb-08", cat: "docu", source: "Climate Box · UNDP (2015)", url: "https://www.uncclearn.org/resources/library/climate-box-an-interactive-learning-toolkit-on-climate-change/",
      vi: "Trước khi mua món mới, hỏi mình có thật cần không. Chỉ dùng ít lâu thì mượn. Giữ gìn đồ đang có để dùng được lâu hơn.",
      en: "Before buying something new, ask whether you really need it. If it's only for a short time, borrow it. Look after what you have so it lasts longer." },

    // fabric: European Environment Agency, European Commission, Ellen MacArthur Foundation
    { id: "ee-01", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/topics/in-depth/textiles",
      vi: "60–70% vải là nhựa, phần lớn là polyester, làm từ dầu mỏ và khí đốt. Phần còn lại là sợi tự nhiên như bông, len.",
      en: "60–70% of textiles are made of plastic, mostly polyester, from oil and gas. The rest are natural fibres such as cotton and wool." },
    { id: "ee-02", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/about/contact-us/faqs/what-are-the-environmental-impacts-of-textiles",
      vi: "Sợi vi nhựa thoát ra môi trường phần lớn từ việc giặt đồ sợi tổng hợp.",
      en: "Microfibres and microplastics get into the environment mainly from washing synthetic clothes." },
    { id: "ee-03", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/topics/in-depth/textiles",
      vi: "Năm 2017 ước tính chưa tới 1% vải trên thế giới được tái chế thành sản phẩm mới.",
      en: "In 2017 it was estimated that less than 1% of all textiles worldwide are recycled into new products." },
    { id: "ee-04", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/textiles-and-the-environment-the-role-of-design-in-europes-circular-economy-1",
      vi: "Khoảng 80% tác động khí hậu của vải nằm ở khâu sản xuất; giặt, sấy, là khoảng 14%. EEA nêu cách giảm: bớt mua thời trang nhanh, mặc lâu hơn, dùng lại, tái chế.",
      en: "About 80% of the climate impact of textiles happens when they are made; washing, drying and ironing are about 14%. The EEA's ways to cut it: less fast fashion, longer use, reuse and recycling." },
    { id: "ee-05", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/textiles-and-the-environment-the-role-of-design-in-europes-circular-economy-1",
      vi: "Gần một phần ba rác vải không tái chế lại thành sợi được, vì pha nhiều loại sợi, in hoa văn hay nhiều lớp. Cúc, khoá kéo không tháo được cũng làm khó tái chế.",
      en: "Almost a third of textile waste can't be recycled back into fibre, because of blended fibres, prints or layers. Buttons and zips that can't come off make recycling harder too." },
    { id: "ee-06", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/textiles-and-the-environment-the-role-of-design-in-europes-circular-economy-1",
      vi: "Trong 20 năm qua, thời gian dùng một món quần áo giảm 36%; trung bình mỗi món chỉ được mặc 7–8 lần.",
      en: "Over the last 20 years the time clothes are used fell by 36%; on average each garment is worn only seven or eight times." },
    { id: "ee-07", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/management-of-used-and-waste-textiles-in-europes-circular-economy",
      vi: "Năm 2020, mỗi người ở Liên minh châu Âu thải khoảng 16 kg vải; 11,6 kg trong đó lẫn vào rác sinh hoạt chung.",
      en: "In 2020 each person in the EU threw away about 16 kg of textiles; 11.6 kg of it ended up in mixed household waste." },
    { id: "ee-08", cat: "vai", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/topics/in-depth/textiles",
      vi: "Khoảng 4–9% hàng dệt bày bán ở châu Âu bị tiêu huỷ mà chưa từng được dùng.",
      en: "Around 4–9% of textile products put on the European market are destroyed without ever being used." },
    { id: "ec-01", cat: "vai", source: "Ủy ban châu Âu · Chiến lược Dệt may", source_en: "European Commission · Textiles Strategy",
      url: "https://environment.ec.europa.eu/strategy/textiles-strategy_en",
      vi: "Cứ 1.000 tấn vải được thu gom để dùng lại thì tạo ra 20–35 việc làm.",
      en: "Every 1,000 tonnes of textiles collected for reuse create 20 to 35 jobs." },
    { id: "em-01", cat: "vai", source: "Ellen MacArthur Foundation", url: "https://www.ellenmacarthurfoundation.org/topics/fashion/overview",
      vi: "Mỗi giây, lượng quần áo bằng một xe rác bị đốt hoặc chôn lấp.",
      en: "Every second, the equivalent of a rubbish truckload of clothes is burnt or buried in landfill." },

    // old clothes: reuse, upcycling, repair (EEA)
    { id: "ee-09", cat: "docu", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/management-of-used-and-waste-textiles-in-europes-circular-economy",
      vi: "Dùng lại tốt cho môi trường hơn tái chế: dùng lại là dùng nguyên món, còn tái chế phải phá món đồ ra để làm cái mới.",
      en: "Reuse is kinder to the environment than recycling: reuse means using the item again as it is, recycling breaks it down to make something new." },
    { id: "ee-10", cat: "docu", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/textiles-and-the-environment-the-role-of-design-in-europes-circular-economy-1",
      vi: "Làm lại món mới từ tấm vải cũ (upcycling) là dùng lại ở mức tấm vải: bớt cần nguyên liệu mới, bớt rác vải.",
      en: "Making something new from old fabric (upcycling) is reuse at the fabric level: less need for new raw materials, less textile waste." },
    { id: "ee-11", cat: "docu", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/textiles-and-the-environment-the-role-of-design-in-europes-circular-economy-1",
      vi: "40% lý do người ta bỏ quần áo là vì món đồ thủng, rách, sờn, giãn, mất dáng, ố hay phai màu. Trước khi bỏ, thử nghĩ xem có vá, sửa được không.",
      en: "40% of the reasons people throw clothes away are holes, tears, a worn look, lost shape or stretch, stains or faded colour. Before you let it go, see if it can be mended." },
    { id: "ee-12", cat: "docu", source: "Cơ quan Môi trường châu Âu (EEA)", source_en: "European Environment Agency (EEA)",
      url: "https://www.eea.europa.eu/en/analysis/publications/management-of-used-and-waste-textiles-in-europes-circular-economy",
      vi: "Cho đồ cũ đi: tách món còn dùng được ra khỏi món hỏng, giữ đồ sạch. Phân loại trước như vậy có thể giúp nhiều món được dùng lại hơn.",
      en: "Giving clothes away? Keep what can still be used apart from what can't, and keep it clean. Sorting first like this can help more of them be reused." }
  ];

  function lang() { return window.GemI18n && window.GemI18n.getLang() === 'en' ? 'en' : 'vi'; }
  function t(k) { var s = STR[k]; return s ? s[lang()] : k; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STR);

  /* ---------- what the visitor has (gem-rac) ---------- */
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem('gem-rac') || 'null'); } catch (e) { /* private mode */ }
    s = s && typeof s === 'object' ? s : {};
    return {
      n: Math.max(0, Math.min(1e6, +s.n || 0)),
      seen: Array.isArray(s.seen) ? s.seen.filter(function (id) { return typeof id === 'string' && id.length <= 20; }).slice(0, 200) : [],
      badges: Array.isArray(s.badges) ? s.badges.filter(function (b) { return BADGES.indexOf(b) >= 0; }) : []
    };
  }
  function save(s) {
    try { localStorage.setItem('gem-rac', JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function msgById(id) { return MSGS.filter(function (m) { return m.id === id; })[0] || null; }

  // the next message: one not opened yet, else any (all were read)
  function nextMsg(s) {
    if (!MSGS.length) return null;
    var fresh = MSGS.filter(function (m) { return s.seen.indexOf(m.id) < 0; });
    var pool = fresh.length ? fresh : MSGS;
    var m = pool[Math.floor(Math.random() * pool.length)];
    if (s.seen.indexOf(m.id) < 0) s.seen.push(m.id);
    return m;
  }

  function msgHtml(m) {
    var l = lang();
    return '<p class="rr-cat">' + esc(t('rr.cat.' + m.cat)) + '</p>' +
      '<p class="rr-text">' + esc(m[l] || m.vi) + '</p>' +
      '<p class="rr-src">' + esc(t('rr.source')) + ': <a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m['source_' + l] || m.source) + '</a></p>';
  }

  // a small roundel: one, two or three leaves
  function badgeSvg(b) {
    var n = BADGES.indexOf(b) + 1, leaf = '';
    for (var i = 0; i < n; i++) {
      var a = (i - (n - 1) / 2) * 34;
      leaf += '<path d="M32 46C22 38 22 24 32 14C42 24 42 38 32 46Z" fill="#87965A" stroke="#3D4A2E" stroke-width="1.6" transform="rotate(' + a + ' 32 46)"/>';
    }
    return '<svg class="rr-badge" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="30" fill="#F0E1D2" stroke="#B89968" stroke-width="3"/>' + leaf +
      '<path d="M32 46V54" stroke="#3D4A2E" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  /* ---------- a small sound: a soft two-note blip when a piece is picked ---------- */
  function blip(ctx) {
    var ac = ctx.sound && ctx.sound();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      var now = ac.currentTime + 0.01;
      [[880, 0], [1318.5, 0.08]].forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(0.12, now + n[1] + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.22);
        o.connect(g); g.connect(ac.destination);
        o.start(now + n[1]); o.stop(now + n[1] + 0.25);
      });
    } catch (e) { /* no sound: fine */ }
  }

  /* ---------- one event ----------
     ctx (from studio.js): world, stage, scene() {w, h, feet, playerH, k, cam,
     viewW}, player() {x, facing}, out(), calm(), drag(x, ms, done, step),
     picked() (all picked up: count it), reduce, sound. Resolves when it is
     over: picked (and the card closed), or the visitor went inside (nothing
     counted). */
  function drop(ctx) {
    return new Promise(function (resolve) {
      var S = ctx.scene(), P = ctx.player(), reduce = !!ctx.reduce;
      var n = Math.random() < 0.2 ? 2 + Math.floor(Math.random() * 2) : 1;
      var names = Object.keys(ITEMS).sort(function () { return Math.random() - 0.5; }).slice(0, n);
      var secs = 10 + 3 * (n - 1), left = secs, late = false, done = false, ended = false;
      // never smaller than a fingertip on screen (a phone turned sideways)
      var H = S.h, W = S.w, hPx = Math.max(S.playerH * 0.2, 44 / S.k);
      // in the middle of the view: the bottom corners have the cart and "?"
      var view0 = S.cam / S.k, view1 = (S.cam + S.viewW) / S.k;
      var pad = Math.max((view1 - view0) * 0.12, 76 / S.k) + hPx * 0.45;
      var lo = Math.max(140, view0 + pad), hi = Math.min(S.w - 140, view1 - pad);
      var pieces = [];

      // where: by the visitor's feet but not on them, apart from each other,
      // ahead if there is room (a phone's view is narrow: a little overlap is fine)
      var dir = P.facing || 1, xs = [], body = S.playerH * 0.09 + hPx * 0.3, sep = hPx * 0.95;
      function free(x) {
        return x >= lo && x <= hi && Math.abs(x - P.x) >= body &&
          xs.every(function (o) { return Math.abs(o - x) >= sep; });
      }
      for (var i = 0; i < n; i++) {
        var x = null;
        for (var tries = 0; tries < 60 && x == null; tries++) {
          var side = tries < 30 ? dir : -dir, c = P.x + side * (body + Math.random() * Math.max(0, (hi - lo) * 0.6));
          if (free(c)) x = c;
        }
        if (x == null) for (tries = 0; tries < 40 && x == null; tries++) {
          c = lo + Math.random() * Math.max(0, hi - lo);
          if (xs.every(function (o) { return Math.abs(o - c) >= sep; })) x = c;
        }
        xs.push(x == null ? Math.max(lo, Math.min(hi, P.x + dir * body)) : x);
      }
      names.forEach(function (name, j) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rr-item' + (reduce ? ' is-calm' : '');
        b.setAttribute('aria-label', t('rr.item').replace('{mon}', ITEMS[name][lang()]));
        b.style.left = (xs[j] / W * 100).toFixed(3) + '%';
        b.style.bottom = ((H - S.feet - 6) / H * 100).toFixed(3) + '%';
        b.style.height = (hPx / H * 100).toFixed(3) + '%';
        b.style.setProperty('--rr-from', -(S.feet * S.k + 40).toFixed(0) + 'px');
        b.style.setProperty('--rr-turn', ((Math.random() - 0.5) * 70).toFixed(0) + 'deg');
        b.style.animationDelay = (j * 0.18).toFixed(2) + 's';
        b.innerHTML = '<img src="' + RAC + name + '.webp" alt="" draggable="false">';
        // a tap here is not a walk
        ['pointerdown', 'click'].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        b.addEventListener('click', function () { pick(j); });
        ctx.world.appendChild(b);
        pieces.push({ el: b, x: xs[j], name: name, up: false });
      });

      // the strip at the top: what happened, and the clock
      var bar = document.createElement('div');
      bar.className = 'rr-bar';
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'polite');
      bar.innerHTML = '<span class="rr-bar-t"></span>' +
        '<span class="rr-clock" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="rr-ring-bg"/>' +
        '<circle cx="18" cy="18" r="15" class="rr-ring"/></svg><b></b></span>';
      ctx.stage.appendChild(bar);
      var ring = bar.querySelector('.rr-ring'), num = bar.querySelector('.rr-clock b'), txt = bar.querySelector('.rr-bar-t');
      function paintBar() {
        var rest = pieces.filter(function (p) { return !p.up; }).length;
        txt.textContent = late ? t('rr.wait') : (n > 1 ? t('rr.felln').replace('{n}', n) : t('rr.fell1')) +
          (n > 1 && rest < n ? ' · ' + t('rr.left').replace('{n}', rest) : '');
        bar.classList.toggle('is-late', late);
        num.textContent = late ? '' : String(Math.max(0, Math.ceil(left)));
        ring.style.strokeDashoffset = (94.25 * (1 - Math.max(0, left) / secs)).toFixed(2);
      }
      paintBar();

      var udon = null, tug = null, tugT = 0, won = 0;   // won: a badge earned on any piece of this fall
      var tick = setInterval(function () {
        if (!ctx.out()) { end(false); return; }
        if (done || late || !ctx.calm()) return;
        left -= 0.25;
        paintBar();
        if (left <= 0) tooLate();
      }, 250);

      function pick(j) {
        var p = pieces[j];
        if (!p || p.up || ended) return;
        p.up = true;
        p.el.classList.add('is-up');
        p.el.disabled = true;
        setTimeout(function () { p.el.remove(); }, 450);
        blip(ctx);
        var s = load();
        s.n += 1;
        var badge = BADGES.filter(function (b) { return s.n >= b && s.badges.indexOf(b) < 0; })[0];
        if (badge) { s.badges.push(badge); won = badge; }
        save(s);
        paintBar();
        if (pieces.every(function (q) { return q.up; })) finish(won);
      }

      // too slow: Udon runs in from the litter's side, tugs a hem, and the
      // visitor is pulled back to it; he waits there till it is picked
      function tooLate() {
        late = true;
        paintBar();
        var target = pieces.filter(function (p) { return !p.up; })[0];
        if (!target) return;
        var p0 = ctx.player().x, side = target.x >= p0 ? 1 : -1;
        udon = document.createElement('span');
        udon.className = 'rr-udon is-run f1';
        udon.setAttribute('aria-hidden', 'true');
        udon.innerHTML = '<img class="rr-u-run1" src="' + RAC + 'ud-chay-1.webp" alt="">' +
          '<img class="rr-u-run2" src="' + RAC + 'ud-chay-2.webp" alt="">' +
          '<img class="rr-u-sit" src="' + RAC + 'ud-ngoi-cho.webp" alt="">' +
          '<img class="rr-u-hop" src="' + RAC + 'ud-nhay.webp" alt="">';
        udon.style.bottom = ((H - S.feet - 4) / H * 100).toFixed(3) + '%';
        udon.style.height = (S.playerH * 0.3 / H * 100).toFixed(3) + '%';
        // the drawings run left: flipped when he comes from the left; he
        // keeps facing the visitor while pulling back to the litter
        udon.classList.toggle('is-flip', side < 0);
        var from = side > 0 ? Math.min(W - 60, (ctx.scene().cam + ctx.scene().viewW) / ctx.scene().k + 80)
                            : Math.max(60, ctx.scene().cam / ctx.scene().k - 80);
        var at = p0 + side * 90;
        ctx.world.appendChild(udon);
        var place = function (x) { udon.style.left = (x / W * 100).toFixed(3) + '%'; };
        place(reduce ? at : from);
        var flip = setInterval(function () {
          if (!udon) { clearInterval(flip); return; }
          udon.classList.toggle('f1'); udon.classList.toggle('f2');
        }, 140);
        var runMs = reduce ? 0 : 650, t0 = performance.now();
        (function run(now) {
          var k = runMs ? Math.min(1, (now - t0) / runMs) : 1;
          if (!udon) return;
          place(from + (at - from) * k);
          if (k < 1) { requestAnimationFrame(run); return; }
          clearInterval(flip);
          showTug(target);
          // pulled back, facing away, Udon going ahead of the visitor
          var stopAt = target.x - side * 120;
          ctx.drag(stopAt, reduce ? 0 : 1300, function () {
            if (!udon) return;
            udon.className = 'rr-udon is-sit' + (side > 0 ? ' is-flip' : '');   // sitting, he looks right
            place(target.x + side * 70);
          }, function (x) { place(x + side * 90); });
        })(performance.now());
      }

      // the close-up: Udon's teeth on a trouser hem, with his line
      function showTug(target) {
        tug = document.createElement('div');
        tug.className = 'rr-tug f1';
        tug.setAttribute('role', 'status');
        var k = 1 + Math.floor(Math.random() * LINES);
        tug.innerHTML = '<p class="rr-tug-say">' + esc(t('rr.l' + k).replace('{mon}', ITEMS[target.name][lang()])) + '</p>' +
          '<img class="rr-keo1" src="' + RAC + 'ud-keo-1.webp" alt="">' +
          '<img class="rr-keo2" src="' + RAC + 'ud-keo-2.webp" alt="">';
        ctx.stage.appendChild(tug);
        var m = 0;
        tugT = setInterval(function () {
          if (!tug) { clearInterval(tugT); return; }
          m++;
          if (!reduce) { tug.classList.toggle('f1'); tug.classList.toggle('f2'); }
          if (m > 18) {
            clearInterval(tugT);
            tug.classList.add('is-out');
            var g = tug; tug = null;
            setTimeout(function () { g.remove(); }, 320);
          }
        }, 150);
      }

      function finish(badge) {
        done = true;
        clearInterval(tick);
        bar.classList.add('is-done');
        txt.textContent = t('rr.thanks');
        num.textContent = '';
        if (tug) { clearInterval(tugT); tug.remove(); tug = null; }
        if (udon) {
          udon.className = 'rr-udon is-hop' + (udon.classList.contains('is-flip') ? ' is-flip' : '');
          var u = udon; udon = null;
          setTimeout(function () { u.classList.add('is-out'); }, 700);
          setTimeout(function () { u.remove(); }, 1100);
        }
        var s = load(), m = nextMsg(s);
        save(s);
        if (ctx.picked) ctx.picked();   // counted now: a reload with the card open is not a second fall
        var card = document.createElement('div');
        card.className = 'rr-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', t('rr.msg_h'));
        card.innerHTML = (badge ? '<div class="rr-card-badge">' + badgeSvg(badge) + '<div><p class="rr-cat">' + esc(t('rr.badge_h')) + '</p>' +
            '<p class="rr-text"><b>' + esc(t('rr.b' + badge)) + '</b> · ' + esc(t('rr.badge_p').replace('{n}', badge)) + '</p></div></div>' : '') +
          (m ? msgHtml(m) : '<p class="rr-text">' + esc(t('rr.thanks')) + '</p>') +
          '<p class="rr-count">' + esc(t('rr.count').replace('{n}', s.n)) + '</p>' +
          '<button type="button" class="st-btn rr-close">' + esc(t('rr.close')) + '</button>';
        ['pointerdown', 'click'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        ctx.stage.appendChild(card);
        card.querySelector('.rr-close').addEventListener('click', function () { end(true); });
        card.querySelector('.rr-close').focus({ preventScroll: true });
        setTimeout(function () { bar.classList.add('is-out'); }, 1200);
      }

      // over: tidy everything; went = it was dealt with (not left behind indoors)
      function end(went) {
        if (ended) return;
        ended = true;
        clearInterval(tick);
        clearInterval(tugT);
        [bar, tug, udon, ctx.stage.querySelector('.rr-card')].forEach(function (el) { if (el && el.parentNode) el.remove(); });
        pieces.forEach(function (p) { if (p.el.parentNode) p.el.remove(); });
        udon = null; tug = null;
        resolve({ picked: !!went });
      }
    });
  }

  /* ---------- Sổ thông điệp (Tủ sưu tầm) ---------- */
  function bookHtml() {
    var s = load();
    var opened = s.seen.map(msgById).filter(Boolean);
    return '<section class="rr-book">' +
      (s.badges.length ? '<h3 class="tu-h">' + esc(t('rr.badges')) + '</h3><ul class="rr-badges">' + s.badges.map(function (b) {
        return '<li>' + badgeSvg(b) + '<span><b>' + esc(t('rr.b' + b)) + '</b><br>' + b + '</span></li>';
      }).join('') + '</ul>' : '') +
      '<h3 class="tu-h">' + esc(t('rr.book')) + '</h3>' +
      '<p class="tu-small">' + esc(opened.length ? t('rr.book_p').replace('{n}', opened.length).replace('{t}', MSGS.length) : t('rr.book_0')) + '</p>' +
      (opened.length ? '<ol class="rr-list">' + opened.map(function (m) { return '<li>' + msgHtml(m) + '</li>'; }).join('') + '</ol>' : '') +
      '</section>';
  }

  return { drop: drop, bookHtml: bookHtml, stats: load, count: function () { return MSGS.length; }, ITEMS: ITEMS, MSGS: MSGS };
})();
