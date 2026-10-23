/* =========================================================================
   Phân loại rác — a small game in Gem's studio, by Tagom's sorting rules
   (their six posters, used whole with Tagom's permission, 23/10/2026).

   Loaded only when someone opens it (js/studio.js phanloaiSheet), so the
   studio itself stays light. Two levels:
     1. one bottle taken apart, Tagom's way: the cap to plastic 2-4-5, the
        label to hard nylon, the bottle squashed flat to plastic 1 (easy);
     2. ten things picked at random from 31, each to one of Tagom's six bags
        or to Gem's own basket (Gem takes flat foam sheets and whole CDs).
   Udon tugs a trouser hem at the first mistake of a round; after that, a
   hint only. The end says where to take what was sorted: Tagom's station
   and Gem. Pictures: tools/rac-assets.py -> images/studio/rac, tagom.
   ========================================================================= */
(function () {
  'use strict';

  var R = 'images/studio/rac/', T = 'images/studio/tagom/';
  var ROUND = 10;

  // Tagom's six bags (yellow posters: nylon, pink: plastic) and Gem's basket
  var BINS = [
    { id: 'nilon-cung', poster: 'nilon-cung', tone: 'y' },
    { id: 'nilon-mem',  poster: 'nilon-mem',  tone: 'y' },
    { id: 'nhua-1-de',  poster: 'nhua-1-de',  tone: 'p' },
    { id: 'nhua-1-kho', poster: 'nhua-1-kho', tone: 'p' },
    { id: 'nhua-245',   poster: 'nhua-245',   tone: 'p' },
    { id: 'nhua-67',    poster: 'nhua-67',    tone: 'p' },
    { id: 'gem',        poster: null,         tone: 'g' }
  ];
  var POSTERS = ['nilon-cung', 'nilon-mem', 'nhua-1-de', 'nhua-1-kho', 'nhua-245', 'nhua-67'];

  // The things to sort, as on Tagom's posters. bin: where it goes; also:
  // another right answer (a whole CD: Gem takes it, Tagom's list has it in 6-7)
  var ITEMS = [
    { id: 'chai-tran', bin: 'nhua-1-de' }, { id: 'chai-to', bin: 'nhua-1-de' }, { id: 'lo-keo', bin: 'nhua-1-de' },
    { id: 'hu-kem', bin: 'nhua-1-de' }, { id: 'chai-dau', bin: 'nhua-1-de' },
    { id: 'ly-tra-sua', bin: 'nhua-1-kho' }, { id: 'nap-cau', bin: 'nhua-1-kho' }, { id: 'hop-banh', bin: 'nhua-1-kho' },
    { id: 'khay-den', bin: 'nhua-1-kho' }, { id: 'lo-thuoc', bin: 'nhua-1-kho' },
    { id: 'can-giat', bin: 'nhua-245' }, { id: 'binh-sua', bin: 'nhua-245' }, { id: 'nap-chai', bin: 'nhua-245' },
    { id: 'hop-com', bin: 'nhua-245' }, { id: 'do-choi', bin: 'nhua-245' },
    { id: 'hop-sua-chua', bin: 'nhua-67' }, { id: 'thia', bin: 'nhua-67' }, { id: 'dia', bin: 'nhua-67' },
    { id: 'ban-chai', bin: 'nhua-67' },
    { id: 'goi-snack', bin: 'nilon-cung' }, { id: 'vo-banh', bin: 'nilon-cung' }, { id: 'tui-zip', bin: 'nilon-cung' },
    { id: 'bao-gao', bin: 'nilon-cung' }, { id: 'tui-vai', bin: 'nilon-cung' },
    { id: 'tui-bong', bin: 'nilon-mem' }, { id: 'mang-boc', bin: 'nilon-mem' }, { id: 'xop-hoi', bin: 'nilon-mem' },
    { id: 'tui-khi', bin: 'nilon-mem' }, { id: 'tui-goi-hang', bin: 'nilon-mem' },
    { id: 'dia-cd', bin: 'gem', also: ['nhua-67'] }, { id: 'xop', bin: 'gem' }
  ];

  // Tagom's station (Anna 23/10): the fanpage has the hours as they change
  var TAGOM_ADDR = 'Số 105B1 (mặt sau), ngõ 3 Khuất Duy Tiến, Thanh Xuân Bắc, Hà Nội';
  var TAGOM_FB = 'https://www.facebook.com/tagom.tamer/';
  var maps = function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); };

  var STR = {
    'pl.title':     { vi: `Phân loại rác cùng Tagom`, en: `Sorting waste with Tagom` },
    'pl.lead':      { vi: `Theo cách phân loại của Tagom, nhóm thu gom rác tái chế ở Hà Nội. Chạm một poster để xem kĩ, hoặc chơi thử.`,
                      en: `The way Tagom sorts it, a recycling collection group in Hanoi. Tap a poster to look closer, or have a go.` },
    'pl.lv1':       { vi: `Màn 1 · Xử lý một cái chai`, en: `Level 1 · One bottle` },
    'pl.lv2':       { vi: `Màn 2 · Phân loại 10 món`, en: `Level 2 · Sort ten things` },
    'pl.where':     { vi: `Mang rác đi đâu?`, en: `Where to take it?` },
    'pl.posters':   { vi: `Poster của Tagom`, en: `Tagom's posters` },
    'pl.back':      { vi: `← Quay lại`, en: `← Back` },
    'pl.play':      { vi: `Chơi phân loại`, en: `Play` },
    'pl.poster_by': { vi: `Poster của Tagom, Gem được Tagom cho phép dùng.`, en: `A poster by Tagom, shared with their permission.` },
    'pl.chai_h':    { vi: `Xử lý một cái chai`, en: `One bottle, three parts` },
    'pl.chai_p':    { vi: `Chạm nắp để tháo, chạm tem để bóc, chạm chai để bóp bẹp. Rồi kéo từng phần vào đúng bao (hoặc chạm phần đó, rồi chạm bao).`,
                      en: `Tap the cap to take it off, the label to peel it, the bottle to squash it. Then drag each part to its bag (or tap it, then the bag).` },
    'pl.chai_whole': { vi: `Khoan đã! Tháo nắp, bóc tem rồi bóp bẹp chai trước nha.`, en: `Wait! Cap off, label off, squash the bottle first.` },
    'pl.chai_flat': { vi: `Bóp bẹp chai trước cho gọn bao nha (chạm vào chai).`, en: `Squash the bottle first so the bag holds more (tap it).` },
    'pl.chai_done': { vi: `Xong! Một cái chai, ba loại: nắp vào nhựa 2-4-5, tem vào nilon cứng, chai vào nhựa 1 dễ.`,
                      en: `Done! One bottle, three kinds: the cap to plastic 2-4-5, the label to hard nylon, the bottle to plastic 1.` },
    'pl.next_lv':   { vi: `Sang màn 2`, en: `On to level 2` },
    'pl.sort_h':    { vi: `Món này bỏ vào đâu?`, en: `Where does this go?` },
    'pl.sort_p':    { vi: `Kéo món vào đúng bao, hoặc chạm vào bao.`, en: `Drag it to the right bag, or tap the bag.` },
    'pl.count':     { vi: `Món {i}/{n} · đúng {ok}`, en: `{i} of {n} · {ok} right` },
    'pl.right':     { vi: `Đúng rồi!`, en: `Right!` },
    'pl.which':     { vi: `{x}: bỏ vào bao nào?`, en: `{x}: which bag?` },
    'pl.wrong':     { vi: `Chưa đúng: món này vào {bin}.`, en: `Not quite: this goes to {bin}.` },
    'pl.see':       { vi: `Xem poster`, en: `See the poster` },
    'pl.next':      { vi: `Món tiếp`, en: `Next` },
    'pl.end_h':     { vi: `Bạn phân loại đúng {ok}/{n} món`, en: `You sorted {ok} of {n} right` },
    'pl.end_all':   { vi: `Đúng hết! Udon vui lắm.`, en: `All right! Udon is delighted.` },
    'pl.end_miss':  { vi: `Mấy món dễ nhầm:`, en: `The tricky ones:` },
    'pl.again':     { vi: `Chơi lượt mới`, en: `Play again` },
    'pl.where_h':   { vi: `Mang rác đã phân loại đi đâu?`, en: `Where to take what you sorted` },
    'pl.where_p':   { vi: `Rửa sạch, để khô, gấp gọn rồi mang đi nha.`, en: `Rinse, dry and fold it flat first.` },
    'pl.tagom_h':   { vi: `Trạm Tagom`, en: `Tagom's station` },
    'pl.tagom_what': { vi: `Nhận nhựa và nilon theo 6 nhóm trên poster.`, en: `Takes plastic and nylon in the six groups on the posters.` },
    'pl.tagom_near': { vi: `Dãy nhà đối diện trường mầm non Thanh Xuân Bắc.`, en: `The row facing Thanh Xuân Bắc kindergarten.` },
    'pl.tagom_hours': { vi: `Thứ 2 – thứ 6: 14h – 19h · Thứ 7, Chủ nhật: 9h – 19h (nghỉ trưa 12h – 14h)`,
                        en: `Mon – Fri: 2pm – 7pm · Sat, Sun: 9am – 7pm (closed 12 – 2pm)` },
    'pl.tagom_fb':  { vi: `Fanpage Tagom (lịch mới nhất)`, en: `Tagom on Facebook (latest hours)` },
    'pl.gem_h':     { vi: `Gem Chạm Sắc`, en: `Gem Chạm Sắc` },
    'pl.gem_what':  { vi: `Gem nhận xốp tấm phẳng, nguyên tấm (không lỗ khoét, không bẻ vụn) và đĩa CD cũ còn nguyên tấm, không vỡ.`,
                      en: `Gem takes flat foam sheets, whole (no cut-outs, not broken up), and old CDs, whole and unbroken.` },
    'pl.map':       { vi: `Chỉ đường`, en: `Directions` },
    'pl.close':     { vi: `Đóng`, en: `Close` },
    'pl.udon':      { vi: `Udon kéo ống quần bạn rồi kìa!`, en: `Udon is tugging at your trousers!` },
    // Udon's line over the tug (the hint in full stays under the stage)
    'pl.ud_whole':  { vi: `Gâu! Tháo nắp, bóc tem đã nào!`, en: `Woof! Cap and label off first!` },
    'pl.ud_wrong':  { vi: `Gâu! Không phải bao này đâu!`, en: `Woof! Not that bag!` },
    'pl.back_play': { vi: `← Chơi tiếp`, en: `← Back to the game` },
    // how to play: a card the first time each level opens, "?" brings it back
    'pl.help':      { vi: `Cách chơi`, en: `How to play` },
    'pl.g_go':      { vi: `Bắt đầu`, en: `Start` },
    'pl.g1_p':      { vi: `Một cái chai nhựa có ba phần, mỗi phần vào một bao khác nhau.`,
                      en: `A plastic bottle is three parts, each for a different bag.` },
    'pl.g1_1h':     { vi: `Tháo nắp, bóc tem`, en: `Cap off, label off` },
    'pl.g1_1':      { vi: `Chạm vào nắp chai để tháo, chạm vào tem để bóc ra.`, en: `Tap the cap to unscrew it, the label to peel it off.` },
    'pl.g1_2h':     { vi: `Bóp bẹp chai`, en: `Squash the bottle` },
    'pl.g1_2':      { vi: `Chai trần rồi thì chạm vào chai để bóp bẹp cho gọn.`, en: `Once it is bare, tap the bottle to squash it flat.` },
    'pl.g1_3h':     { vi: `Bỏ vào đúng bao`, en: `Into the right bag` },
    'pl.g1_3':      { vi: `Kéo từng phần vào bao, hoặc chạm phần đó rồi chạm bao. Nhầm thì Udon nhắc.`,
                      en: `Drag each part to its bag, or tap it, then the bag. Udon will tell you if it is wrong.` },
    'pl.g2_p':      { vi: `10 món đồ nhựa, nilon quen thuộc, lần lượt từng món.`, en: `Ten everyday plastic and nylon things, one at a time.` },
    'pl.g2_1h':     { vi: `Nhìn món đồ`, en: `Look at the thing` },
    'pl.g2_1':      { vi: `Món đang chơi hiện ở giữa, phía trên là số món đã xong.`, en: `The thing to sort is in the middle, the count above it.` },
    'pl.g2_2h':     { vi: `Chọn bao`, en: `Pick its bag` },
    'pl.g2_2':      { vi: `Kéo món vào bao, hoặc chạm vào bao. Xốp tấm phẳng và đĩa CD nguyên thì bỏ vào giỏ "Mang tới Gem".`,
                      en: `Drag it to a bag, or tap the bag. Flat foam sheets and whole CDs go in the "Bring to Gem" basket.` },
    'pl.g2_3h':     { vi: `Sai cũng không sao`, en: `Wrong is fine` },
    'pl.g2_3':      { vi: `Udon nhắc bao đúng và lý do, bấm "Xem poster" để xem lại. Không trừ điểm, bấm "Món tiếp" để chơi tiếp.`,
                      en: `Udon tells you the right bag and why; "See the poster" to check. No points lost: "Next" to carry on.` },
    // the bags
    'pl.b.nilon-cung': { vi: `Nilon cứng`, en: `Hard nylon` },
    'pl.b.nilon-mem':  { vi: `Nilon mềm`, en: `Soft nylon` },
    'pl.b.nhua-1-de':  { vi: `Nhựa 1 dễ`, en: `Plastic 1, easy` },
    'pl.b.nhua-1-kho': { vi: `Nhựa 1 khó`, en: `Plastic 1, hard` },
    'pl.b.nhua-245':   { vi: `Nhựa 2·4·5`, en: `Plastic 2·4·5` },
    'pl.b.nhua-67':    { vi: `Nhựa 6·7 khó`, en: `Plastic 6·7, hard` },
    'pl.b.gem':        { vi: `Mang tới Gem`, en: `Bring to Gem` },
    // the bottle's parts
    'pl.i.chai':      { vi: `Chai nước còn nắp, còn tem`, en: `A bottle, cap and label on` },
    'pl.i.nap':       { vi: `Nắp chai`, en: `The cap` },
    'pl.i.tem':       { vi: `Tem nhãn`, en: `The label` },
    'pl.i.chai-bep':  { vi: `Chai đã bóp bẹp`, en: `The squashed bottle` },
    // the things, and why they go where they go (Tagom's own rules)
    'pl.i.chai-tran':    { vi: `Chai nước trong (đã tháo nắp, bóc tem)`, en: `A clear water bottle (cap and label off)` },
    'pl.w.chai-tran':    { vi: `Chai, lọ trong suốt có kí hiệu số 1.`, en: `Clear bottles and jars marked 1.` },
    'pl.i.chai-to':      { vi: `Chai nước 1,5 lít`, en: `A 1.5-litre water bottle` },
    'pl.w.chai-to':      { vi: `Chai trong suốt có kí hiệu số 1.`, en: `A clear bottle marked 1.` },
    'pl.i.lo-keo':       { vi: `Lọ kẹo nhựa trong`, en: `A clear sweet jar` },
    'pl.w.lo-keo':       { vi: `Lọ trong suốt có kí hiệu số 1.`, en: `A clear jar marked 1.` },
    'pl.i.hu-kem':       { vi: `Hũ mỹ phẩm trong`, en: `A clear cosmetics jar` },
    'pl.w.hu-kem':       { vi: `Hũ trong suốt có kí hiệu số 1.`, en: `A clear jar marked 1.` },
    'pl.i.chai-dau':     { vi: `Chai dầu ăn trong`, en: `A clear cooking-oil bottle` },
    'pl.w.chai-dau':     { vi: `Chai trong suốt có kí hiệu số 1.`, en: `A clear bottle marked 1.` },
    'pl.i.ly-tra-sua':   { vi: `Ly trà sữa nhựa trong`, en: `A clear milk-tea cup` },
    'pl.w.ly-tra-sua':   { vi: `Nhựa số 1 trong suốt nhưng không phải chai lọ, mỏng giòn: nhựa 1 khó.`, en: `Clear plastic 1 but not a bottle or jar, thin and brittle: plastic 1, hard.` },
    'pl.i.nap-cau':      { vi: `Nắp cầu ly nước`, en: `A dome cup lid` },
    'pl.w.nap-cau':      { vi: `Nhựa trong mỏng giòn, không phải chai lọ.`, en: `Thin, brittle clear plastic, not a bottle or jar.` },
    'pl.i.hop-banh':     { vi: `Hộp nhựa trong đựng bánh`, en: `A clear cake box` },
    'pl.w.hop-banh':     { vi: `Hộp trong suốt mỏng giòn: nhựa 1 khó.`, en: `A thin, brittle clear box: plastic 1, hard.` },
    'pl.i.khay-den':     { vi: `Khay nhựa đen đựng thịt`, en: `A black meat tray` },
    'pl.w.khay-den':     { vi: `Nhựa số 1 có màu, bề mặt bóng.`, en: `Plastic 1, coloured and glossy.` },
    'pl.i.lo-thuoc':     { vi: `Lọ thuốc nhựa nâu`, en: `A brown medicine bottle` },
    'pl.w.lo-thuoc':     { vi: `Nhựa số 1 có màu: vào nhựa 1 khó, dù là lọ.`, en: `Coloured plastic 1: hard, even though it's a bottle.` },
    'pl.i.can-giat':     { vi: `Can nước giặt`, en: `A detergent jug` },
    'pl.w.can-giat':     { vi: `Nhựa dẻo, đàn hồi, đơn lớp (HDPE số 2).`, en: `Flexible, single-layer plastic (HDPE, 2).` },
    'pl.i.binh-sua':     { vi: `Bình sữa nhựa trắng`, en: `A white milk jug` },
    'pl.w.binh-sua':     { vi: `Nhựa dẻo, đơn lớp (HDPE số 2).`, en: `Flexible, single-layer plastic (HDPE, 2).` },
    'pl.i.nap-chai':     { vi: `Nắp chai nhựa`, en: `Bottle caps` },
    'pl.w.nap-chai':     { vi: `Nắp chai là nhựa 2-4-5, tháo riêng khỏi chai.`, en: `Caps are plastic 2-4-5: take them off the bottle.` },
    'pl.i.hop-com':      { vi: `Hộp đựng thực phẩm`, en: `A food box` },
    'pl.w.hop-com':      { vi: `Hộp nhựa dẻo có nắp bật (PP số 5).`, en: `A flexible box with a snap lid (PP, 5).` },
    'pl.i.do-choi':      { vi: `Đồ chơi nhựa`, en: `A plastic toy` },
    'pl.w.do-choi':      { vi: `Nhựa dẻo, đơn lớp: nhựa 2-4-5.`, en: `Flexible, single-layer plastic: 2-4-5.` },
    'pl.i.hop-sua-chua': { vi: `Hũ sữa chua`, en: `A yogurt cup` },
    'pl.w.hop-sua-chua': { vi: `Nhựa PS số 6: cứng, giòn.`, en: `PS plastic, 6: rigid and brittle.` },
    'pl.i.thia':         { vi: `Thìa nhựa màu`, en: `A coloured plastic spork` },
    'pl.w.thia':         { vi: `Nhựa màu, cứng, không đàn hồi.`, en: `Coloured, rigid, not flexible.` },
    'pl.i.dia':          { vi: `Đĩa nhựa dùng một lần`, en: `A disposable plate` },
    'pl.w.dia':          { vi: `Nhựa cứng số 6.`, en: `Rigid plastic, 6.` },
    'pl.i.ban-chai':     { vi: `Bàn chải đánh răng`, en: `A toothbrush` },
    'pl.w.ban-chai':     { vi: `Nhiều loại nhựa ghép lại: nhựa 6-7 khó.`, en: `Several plastics together: 6-7, hard.` },
    'pl.i.dia-cd':       { vi: `Đĩa CD cũ`, en: `An old CD` },
    'pl.w.dia-cd':       { vi: `Gem nhận đĩa CD còn nguyên tấm. Theo Tagom, đĩa CD vào nhựa 6-7 khó.`, en: `Gem takes whole CDs. By Tagom's list, a CD is plastic 6-7.` },
    'pl.i.goi-snack':    { vi: `Gói snack`, en: `A snack bag` },
    'pl.w.goi-snack':    { vi: `Nhiều lớp, có lớp nhôm, sột soạt khi bóp.`, en: `Many layers, a foil one, crinkly when squeezed.` },
    'pl.i.vo-banh':      { vi: `Vỏ bánh quy`, en: `A biscuit wrapper` },
    'pl.w.vo-banh':      { vi: `Nhiều lớp, không kéo dãn được.`, en: `Many layers, not stretchy.` },
    'pl.i.tui-zip':      { vi: `Túi zip trong`, en: `A clear zip bag` },
    'pl.w.tui-zip':      { vi: `Cứng, sột soạt khi bóp, không kéo dãn: nilon cứng.`, en: `Stiff, crinkly, not stretchy: hard nylon.` },
    'pl.i.bao-gao':      { vi: `Bao gạo dệt`, en: `A woven rice sack` },
    'pl.w.bao-gao':      { vi: `Bao dệt bằng sợi nhựa: nilon cứng.`, en: `Woven from plastic strips: hard nylon.` },
    'pl.i.tui-vai':      { vi: `Túi "vải" không dệt`, en: `A non-woven "fabric" bag` },
    'pl.w.tui-vai':      { vi: `Vải không dệt thật ra là nhựa: nilon cứng.`, en: `Non-woven "fabric" is plastic: hard nylon.` },
    'pl.i.tui-bong':     { vi: `Túi bóng đi chợ`, en: `A market carrier bag` },
    'pl.w.tui-bong':     { vi: `Mềm, kéo dãn được, đơn lớp.`, en: `Soft, stretchy, one layer.` },
    'pl.i.mang-boc':     { vi: `Màng bọc thực phẩm`, en: `Cling film` },
    'pl.w.mang-boc':     { vi: `Mềm, kéo dãn được.`, en: `Soft and stretchy.` },
    'pl.i.xop-hoi':      { vi: `Màng xốp hơi`, en: `Bubble wrap` },
    'pl.w.xop-hoi':      { vi: `Nilon mềm: làm xẹp rồi mang đi.`, en: `Soft nylon: let the air out first.` },
    'pl.i.tui-khi':      { vi: `Túi khí chống sốc`, en: `An air-column cushion` },
    'pl.w.tui-khi':      { vi: `Làm xẹp các cột khí rồi bỏ vào nilon mềm.`, en: `Let the air out, then soft nylon.` },
    'pl.i.tui-goi-hang': { vi: `Túi gói hàng online`, en: `A courier mailer bag` },
    'pl.w.tui-goi-hang': { vi: `Mềm, kéo dãn được: nilon mềm.`, en: `Soft and stretchy: soft nylon.` },
    'pl.i.xop':          { vi: `Tấm xốp phẳng`, en: `A flat foam sheet` },
    'pl.w.xop':          { vi: `Gem nhận xốp tấm phẳng, nguyên tấm, không lỗ khoét, không bẻ vụn.`, en: `Gem takes flat foam sheets: whole, no cut-outs, not broken up.` }
  };

  var api = null, root = null, S = null;

  function lang() { return window.GemI18n && window.GemI18n.getLang() === 'en' ? 'en' : 'vi'; }
  function t(k) { var s = STR[k]; return s ? s[lang()] : k; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // a line of ours, re-translated when the language changes (i18n.js)
  function tr(tag, k, attrs) { return '<' + tag + ' data-i18n="' + k + '"' + (attrs || '') + '>' + esc(t(k)) + '</' + tag + '>'; }
  function binName(id) { return t('pl.b.' + id); }
  function img(name, cls, alt) { return '<img class="' + (cls || '') + '" src="' + R + name + '.webp" alt="' + esc(alt || '') + '" draggable="false">'; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- open: the hub, a poster, a level ---------- */
  // a: { openSheet(html, full), body() } from js/studio.js; opts.poster: open on it
  function open(a, opts) {
    api = a;
    if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STR);
    api.openSheet('<div class="pl" data-pl-view="hub"></div>', true);
    root = api.body().querySelector('.pl');
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDown);
    S = { level: null };
    if (opts && opts.poster && POSTERS.indexOf(opts.poster) >= 0) poster(opts.poster, true);
    else hub();
  }

  function view(name, html) {
    root.setAttribute('data-pl-view', name);
    root.innerHTML = html;
    var sh = root.closest('.st-sheet');
    if (sh) sh.scrollTop = 0;
  }

  function hub() {
    S.level = null;
    view('hub',
      tr('h2', 'pl.title', ' id="st-sheet-title"') + tr('p', 'pl.lead', ' class="st-lead"') +
      '<div class="pl-acts">' +
        '<button type="button" class="st-btn" data-pl-go="chai">' + esc(t('pl.lv1')) + '</button>' +
        '<button type="button" class="st-btn" data-pl-go="sort">' + esc(t('pl.lv2')) + '</button>' +
        '<button type="button" class="pt-tool" data-pl-go="where">' + esc(t('pl.where')) + '</button>' +
      '</div>' +
      tr('h3', 'pl.posters', ' class="pt-label"') +
      '<ul class="pl-posters">' + POSTERS.map(function (p) {
        var b = BINS.filter(function (x) { return x.poster === p; })[0];
        return '<li><button type="button" class="pl-poster" data-pl-poster="' + p + '">' +
          '<img src="' + T + p + '.webp" alt="" loading="lazy" draggable="false"><span>' + esc(binName(b.id)) + '</span></button></li>';
      }).join('') + '</ul>');
  }

  function poster(p, fromWall) {
    var mid = S.level === 'sort' && S.items && !fromWall;
    view('poster',
      (mid ? '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="resume">' + esc(t('pl.back_play')) + '</button>'
        : '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="hub">' + esc(t('pl.back')) + '</button>') +
      '<figure class="pl-big"><img src="' + T + 'to/' + p + '.webp" alt="' + esc(binName(BINS.filter(function (x) { return x.poster === p; })[0].id)) + '">' +
        tr('figcaption', 'pl.poster_by', ' class="pt-small"') + '</figure>' +
      '<div class="pl-acts"><button type="button" class="st-btn" data-pl-go="sort">' + esc(t('pl.play')) + '</button></div>');
  }

  /* ---------- the bins (bags) ---------- */
  function bins(ids) {
    return '<div class="pl-bins" role="group">' + ids.map(function (id) {
      var b = BINS.filter(function (x) { return x.id === id; })[0];
      return '<button type="button" class="pl-bin pl-' + b.tone + '" data-pl-bin="' + id + '">' +
        img(id === 'gem' ? 'gio' : 'bao', '', '') +
        '<span>' + esc(binName(id)) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------- level 1: one bottle ---------- */
  function chai() {
    S.level = 'chai';
    S.parts = { nap: 'on', tem: 'on', chai: 'whole' };   // on the bottle / loose / 'in' a bag
    S.sel = null;
    S.tugged = false;
    view('chai',
      head('pl.chai_h') + tr('p', 'pl.chai_p', ' class="st-lead pl-lead"') +
      '<div class="pl-stage pl-stage-chai">' +
        '<div class="pl-bottle" data-pl-bottle>' + img('chai', 'pl-bottle-img', t('pl.i.chai')) + img('chai', 'pl-bottle-cap', '') +
          '<button type="button" class="pl-hot pl-hot-nap" data-pl-take="nap" aria-label="' + esc(t('pl.i.nap')) + '"></button>' +
          '<button type="button" class="pl-hot pl-hot-tem" data-pl-take="tem" aria-label="' + esc(t('pl.i.tem')) + '"></button>' +
        '</div>' +
        '<div class="pl-loose" aria-live="polite"></div>' +
        udon() +
      '</div>' +
      '<p class="pl-say" aria-live="polite"></p>' +
      bins(['nhua-245', 'nilon-cung', 'nhua-1-de']) +
      '<div class="pl-acts pl-done" hidden><button type="button" class="st-btn" data-pl-go="sort">' + esc(t('pl.next_lv')) + '</button></div>' +
      guideHtml('chai', 'pl.chai_h', 'pl.g1_p', [
        '<span class="pl-gi">' + img('chai', 'pl-gi-a', '') + img('nap', 'pl-gi-b', '') + '</span>',
        '<span class="pl-gi">' + img('chai-tran', 'pl-gi-a', '') + img('chai-bep', 'pl-gi-c', '') + '</span>',
        '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + '</span>']));
    renderChai();
    guideFirst('chai');
  }

  function renderChai() {
    var P = S.parts, bottle = root.querySelector('[data-pl-bottle]');
    // one picture with the cap and the label, one without: the cap off with
    // the label on cuts the cap away; the label off with the cap on puts the
    // cap (cut from the first) back on the bare bottle
    bottle.querySelector('.pl-bottle-img').src = R + (P.tem === 'on' ? 'chai' : 'chai-tran') + '.webp';
    bottle.classList.toggle('is-nocap', P.tem === 'on' && P.nap !== 'on');
    bottle.querySelector('.pl-bottle-cap').hidden = !(P.tem !== 'on' && P.nap === 'on');
    bottle.hidden = P.chai === 'in' || P.chai === 'flat';
    bottle.classList.toggle('is-sel', S.sel === 'chai');
    bottle.querySelector('[data-pl-take="nap"]').hidden = P.nap !== 'on';
    bottle.querySelector('[data-pl-take="tem"]').hidden = P.tem !== 'on';
    // what has come off and is not in a bag yet
    var loose = ['nap', 'tem'].filter(function (k) { return P[k] === 'loose'; });
    if (P.chai === 'flat') loose.push('chai-bep');
    root.querySelector('.pl-loose').innerHTML = loose.map(function (k) {
      return '<button type="button" class="pl-item' + (S.sel === k ? ' is-sel' : '') + '" data-pl-item="' + k + '">' +
        img(k, '', t('pl.i.' + k)) + '<span>' + esc(t('pl.i.' + k)) + '</span></button>';
    }).join('');
    var done = P.nap === 'in' && P.tem === 'in' && P.chai === 'in';
    root.querySelector('.pl-done').hidden = !done;
    if (done) say(t('pl.chai_done'), 'ok');
  }

  /* ---------- level 2: ten things ---------- */
  function sort() {
    // at least one from each bag, the rest at random; one of Gem's two now and then
    var pick = [], by = {};
    shuffle(ITEMS.slice()).forEach(function (it) { (by[it.bin] = by[it.bin] || []).push(it); });
    ['nilon-cung', 'nilon-mem', 'nhua-1-de', 'nhua-1-kho', 'nhua-245', 'nhua-67'].forEach(function (b) { pick.push(by[b].shift()); });
    if (Math.random() < 0.6) pick.push(by.gem.shift());
    var rest = shuffle([].concat.apply([], Object.keys(by).map(function (k) { return by[k]; })));
    while (pick.length < ROUND) pick.push(rest.shift());
    S.items = shuffle(pick);
    S.i = 0; S.ok = 0; S.miss = []; S.tugged = false; S.answered = false;
    sortView();
    // the next ones in the background (each about 12 KB)
    S.items.forEach(function (it) { var im = new Image(); im.src = R + it.id + '.webp'; });
    renderSort();
    guideFirst('sort');
  }

  // the round's screen (again after a look at a poster, on the next thing)
  function sortView() {
    S.level = 'sort';
    view('sort',
      head('pl.sort_h') + tr('p', 'pl.sort_p', ' class="st-lead pl-lead"') +
      '<p class="pl-count pt-small" aria-live="polite"></p>' +
      '<div class="pl-stage pl-stage-sort"><div class="pl-one"></div>' + udon() + '</div>' +
      '<p class="pl-say" aria-live="polite"></p>' +
      '<div class="pl-acts pl-next-row" hidden>' +
        '<button type="button" class="pt-tool" data-pl-see hidden>' + esc(t('pl.see')) + '</button>' +
        '<button type="button" class="st-btn" data-pl-go="next">' + esc(t('pl.next')) + '</button></div>' +
      bins(['nilon-cung', 'nilon-mem', 'nhua-1-de', 'nhua-1-kho', 'nhua-245', 'nhua-67', 'gem']) +
      guideHtml('sort', 'pl.sort_h', 'pl.g2_p', [
        '<span class="pl-gi">' + S.items.slice(0, 3).map(function (it, k) { return img(it.id, 'pl-gi-' + k, ''); }).join('') + '</span>',
        '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + img('gio', 'pl-gi-e', '') + '</span>',
        '<span class="pl-gi">' + img('ud-ngoi-cho', 'pl-gi-d', '') + '</span>']));
  }

  /* ---------- how to play ---------- */
  // the level's title with a "?" beside it
  function head(k) {
    return '<div class="pl-head">' + tr('h2', k, ' id="st-sheet-title"') +
      '<button type="button" class="pt-tool pt-mini pl-help" data-pl-guide aria-label="' + esc(t('pl.help')) + '" title="' + esc(t('pl.help')) + '">?</button></div>';
  }
  function guideHtml(level, h, p, ills) {
    var n = level === 'chai' ? 1 : 2;
    return '<div class="pl-guide" role="dialog" aria-modal="true" aria-labelledby="pl-g-h" hidden><div class="pl-g-card">' +
      '<button type="button" class="pt-own-x pl-g-x" data-pl-guide-go aria-label="' + esc(t('pl.close')) + '">×</button>' +
      '<h3 class="pl-g-h" id="pl-g-h"><span data-i18n="pl.help">' + esc(t('pl.help')) + '</span> · <span data-i18n="' + h + '">' + esc(t(h)) + '</span></h3>' +
      tr('p', p, ' class="pl-g-p"') +
      '<ol class="pl-g-steps">' + ills.map(function (ill, k) {
        return '<li class="pl-g-step">' + ill + '<span class="pl-g-txt"><b>' + (k + 1) + '. ' + tr('span', 'pl.g' + n + '_' + (k + 1) + 'h') + '</b>' +
          tr('span', 'pl.g' + n + '_' + (k + 1)) + '</span></li>';
      }).join('') + '</ol>' +
      '<button type="button" class="st-btn pl-g-go" data-pl-guide-go>' + esc(t('pl.g_go')) + '</button>' +
    '</div></div>';
  }
  // once per level, the first time (gem-pl in this browser)
  function seen() { try { return JSON.parse(localStorage.getItem('gem-pl') || '{}') || {}; } catch (e) { return {}; } }
  function guideFirst(level) { if (!seen()[level]) guideShow(true); }
  function guideShow(on) {
    var g = root.querySelector('.pl-guide');
    if (!g) return;
    g.hidden = !on;
    if (on) { g.querySelector('.pl-g-go').focus({ preventScroll: true }); return; }
    var o = seen();
    o[S.level] = 1;
    try { localStorage.setItem('gem-pl', JSON.stringify(o)); } catch (e) { /* private mode */ }
    var help = root.querySelector('[data-pl-guide]');
    if (help) help.focus({ preventScroll: true });
  }

  function renderSort() {
    var it = S.items[S.i];
    root.querySelector('.pl-count').textContent = t('pl.count').replace('{i}', S.i + 1).replace('{n}', S.items.length).replace('{ok}', S.ok);
    root.querySelector('.pl-one').innerHTML = '<button type="button" class="pl-item is-sel is-big" data-pl-item="' + it.id + '">' +
      img(it.id, '', t('pl.i.' + it.id)) + '<span>' + esc(t('pl.i.' + it.id)) + '</span></button>';
    S.sel = it.id;
    S.answered = false;
    root.querySelector('.pl-next-row').hidden = true;
    say('');
  }

  function end() {
    S.level = 'end';
    var miss = S.miss;
    view('end',
      '<h2 id="st-sheet-title">' + esc(t('pl.end_h').replace('{ok}', S.ok).replace('{n}', S.items.length)) + '</h2>' +
      '<div class="pl-end-udon">' + img(miss.length ? 'ud-ngoi-cho' : 'ud-nhay', '', '') + '</div>' +
      (miss.length
        ? tr('p', 'pl.end_miss', ' class="pt-label"') + '<ul class="pl-miss">' + miss.map(function (it) {
            return '<li>' + img(it.id, '', '') + '<span><b>' + esc(t('pl.i.' + it.id)) + '</b> → ' + esc(binName(it.bin)) +
              '<br><small>' + esc(t('pl.w.' + it.id)) + '</small></span></li>';
          }).join('') + '</ul>'
        : tr('p', 'pl.end_all', ' class="st-lead"')) +
      '<div class="pl-acts">' +
        '<button type="button" class="st-btn" data-pl-go="sort">' + esc(t('pl.again')) + '</button>' +
        '<button type="button" class="pt-tool" data-pl-go="where">' + esc(t('pl.where')) + '</button>' +
      '</div>');
  }

  /* ---------- where to take it ---------- */
  function where() {
    var g = window.GemI18n ? window.GemI18n.t : function (k) { return k; };
    var gemAddr = g('footer.address'), gemHours = String(g('visit.hours_value')).replace(/<br\s*\/?>/g, ' · ');
    view('where',
      '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="hub">' + esc(t('pl.back')) + '</button>' +
      tr('h2', 'pl.where_h', ' id="st-sheet-title"') + tr('p', 'pl.where_p', ' class="st-lead"') +
      '<section class="pl-place">' + tr('h3', 'pl.tagom_h') + tr('p', 'pl.tagom_what') +
        '<p><b>' + esc(TAGOM_ADDR) + '</b><br>' + esc(t('pl.tagom_near')) + '</p>' + tr('p', 'pl.tagom_hours', ' class="pt-small"') +
        '<div class="pl-acts">' +
          '<a class="st-btn" href="' + esc(maps('105B1 ngõ 3 Khuất Duy Tiến, Thanh Xuân Bắc, Hà Nội')) + '" target="_blank" rel="noopener">' + esc(t('pl.map')) + '</a>' +
          '<a class="pt-tool" href="' + esc(TAGOM_FB) + '" target="_blank" rel="noopener">' + esc(t('pl.tagom_fb')) + '</a>' +
        '</div></section>' +
      '<section class="pl-place">' + tr('h3', 'pl.gem_h') + tr('p', 'pl.gem_what') +
        '<p><b>' + esc(gemAddr) + '</b><br><span class="pt-small">' + esc(gemHours) + '</span></p>' +
        '<div class="pl-acts"><a class="st-btn" href="' + esc(maps('114 Lê Gia Đỉnh, Hai Bà Trưng, Hà Nội')) + '" target="_blank" rel="noopener">' + esc(t('pl.map')) + '</a></div>' +
      '</section>');
  }

  /* ---------- answers ---------- */
  function drop(item, bin) {
    if (S.level === 'chai') return dropChai(item, bin);
    if (S.level !== 'sort' || S.answered) return;
    var it = S.items[S.i];
    if (!it || item !== it.id) return;
    S.answered = true;
    var ok = bin === it.bin || (it.also || []).indexOf(bin) >= 0;
    var why = t('pl.w.' + it.id);
    if (ok) {
      S.ok++;
      into(bin);
      hop();
      say(t('pl.right') + ' ' + why, 'ok');
    } else {
      S.miss.push(it);
      tug('pl.ud_wrong');
      say(t('pl.wrong').replace('{bin}', binName(it.bin)) + ' ' + why, 'no');
      var b = BINS.filter(function (x) { return x.id === it.bin; })[0];
      var see = root.querySelector('[data-pl-see]');
      see.hidden = !b.poster;
      see.setAttribute('data-pl-see', b.poster || '');
    }
    root.querySelector('.pl-count').textContent = t('pl.count').replace('{i}', S.i + 1).replace('{n}', S.items.length).replace('{ok}', S.ok);
    root.querySelector('.pl-next-row').hidden = false;
    var one = root.querySelector('.pl-one .pl-item');
    if (one) one.classList.add(ok ? 'is-in' : 'is-no');
  }

  function dropChai(item, bin) {
    var P = S.parts;
    if (item === 'chai') {
      if (P.nap === 'on' || P.tem === 'on') { tug('pl.ud_whole'); say(t('pl.chai_whole'), 'no'); return; }
      say(t('pl.chai_flat'), 'no');
      return;
    }
    var want = { nap: 'nhua-245', tem: 'nilon-cung', 'chai-bep': 'nhua-1-de' }[item];
    if (!want) return;
    if (bin !== want) {
      tug('pl.ud_wrong');
      say(t('pl.wrong').replace('{bin}', binName(want)) + ' ' + t(item === 'nap' ? 'pl.w.nap-chai' : item === 'tem' ? 'pl.w.vo-banh' : 'pl.w.chai-tran'), 'no');
      return;
    }
    if (item === 'chai-bep') P.chai = 'in'; else P[item] = 'in';
    S.sel = null;
    into(bin);
    say(t('pl.right'), 'ok');
    renderChai();
  }

  // the bag takes it: a little bounce
  function into(bin) {
    var b = root.querySelector('[data-pl-bin="' + bin + '"]');
    if (!b || reduce) return;
    b.classList.remove('is-take'); void b.offsetWidth; b.classList.add('is-take');
  }

  function say(text, kind) {
    var p = root.querySelector('.pl-say');
    if (!p) return;
    p.textContent = text;
    p.className = 'pl-say' + (kind ? ' is-' + kind : '');
  }

  /* ---------- Udon ---------- */
  function udon() {
    return '<div class="pl-udon" aria-hidden="true">' + img('ud-ngoi-cho', 'pl-ud-sit', '') + img('ud-nhay', 'pl-ud-hop', '') + '</div>' +
      '<div class="pl-tug" aria-hidden="true" hidden><p class="pl-tug-say"></p>' + img('ud-chay-1', 'pl-run pl-run-1', '') + img('ud-chay-2', 'pl-run pl-run-2', '') +
        img('ud-keo-1', 'pl-keo pl-keo-1', '') + img('ud-keo-2', 'pl-keo pl-keo-2', '') + '</div>';
  }

  function hop() {
    var u = root.querySelector('.pl-udon');
    if (!u) return;
    u.classList.add('is-hop');
    clearTimeout(S.hopT);
    S.hopT = setTimeout(function () { u.classList.remove('is-hop'); }, 700);
  }

  // the first mistake of a round: Udon runs in and tugs a trouser hem
  function tug(line) {
    if (S.tugged) return;
    S.tugged = true;
    var box = root.querySelector('.pl-tug');
    if (!box) return;
    box.querySelector('.pl-tug-say').textContent = t(line);
    box.hidden = false;
    box.setAttribute('aria-label', t('pl.udon'));
    box.className = 'pl-tug is-run';
    var n = 0;
    clearInterval(S.tugT);
    if (reduce) { box.className = 'pl-tug is-keo f1'; S.tugT = setTimeout(function () { box.hidden = true; }, 2400); return; }
    S.tugT = setInterval(function () {
      n++;
      if (n < 5) box.className = 'pl-tug is-run f' + (n % 2 + 1);
      else if (n < 20) box.className = 'pl-tug is-keo f' + (n % 2 + 1);
      else { clearInterval(S.tugT); box.classList.add('is-out'); setTimeout(function () { box.hidden = true; }, 300); }
    }, 140);
  }

  /* ---------- taps and drags ---------- */
  function onClick(e) {
    var el;
    if ((el = e.target.closest('[data-pl-go]'))) {
      var go = el.getAttribute('data-pl-go');
      if (go === 'hub') hub();
      else if (go === 'chai') chai();
      else if (go === 'sort') sort();
      else if (go === 'where') where();
      else if (go === 'next') { if (S.i + 1 < S.items.length) { S.i++; renderSort(); } else end(); }
      else if (go === 'resume') { if (S.i + 1 < S.items.length) { S.i++; sortView(); renderSort(); } else end(); }
      return;
    }
    if (e.target.closest('[data-pl-guide-go]')) { guideShow(false); return; }
    if (e.target.closest('[data-pl-guide]')) { guideShow(true); return; }
    if ((el = e.target.closest('[data-pl-poster]'))) { poster(el.getAttribute('data-pl-poster')); return; }
    if ((el = e.target.closest('[data-pl-see]'))) { var p = el.getAttribute('data-pl-see'); if (p) poster(p); return; }
    if (S && S.dragged) { S.dragged = false; return; }   // a drag just ended: not a tap
    if ((el = e.target.closest('[data-pl-take]'))) {
      S.parts[el.getAttribute('data-pl-take')] = 'loose';
      S.sel = el.getAttribute('data-pl-take');
      renderChai();
      say(t('pl.which').replace('{x}', t('pl.i.' + S.sel)));
      return;
    }
    if ((el = e.target.closest('[data-pl-bottle]'))) {
      var P = S.parts;
      if (P.nap !== 'on' && P.tem !== 'on' && P.chai === 'whole') {
        // squashed: underfoot, flat
        el.classList.add('is-squash');
        setTimeout(function () {
          P.chai = 'flat'; S.sel = 'chai-bep'; renderChai();
          say(t('pl.which').replace('{x}', t('pl.i.chai-bep')));
        }, reduce ? 0 : 260);
      } else S.sel = 'chai', renderChai();
      return;
    }
    if ((el = e.target.closest('[data-pl-item]'))) {
      S.sel = el.getAttribute('data-pl-item');
      if (S.level === 'chai') renderChai();
      return;
    }
    if ((el = e.target.closest('[data-pl-bin]')) && S.sel) drop(S.sel, el.getAttribute('data-pl-bin'));
  }

  // drag a thing (or the whole bottle) onto a bag
  function onDown(e) {
    var src = e.target.closest('[data-pl-item], [data-pl-bottle]');
    if (!src || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('[data-pl-take]')) return;
    var item = src.hasAttribute('data-pl-bottle') ? 'chai' : src.getAttribute('data-pl-item');
    if (S.level === 'sort' && S.answered) return;
    var pic = src.querySelector('img'), r = pic.getBoundingClientRect();
    var x0 = e.clientX, y0 = e.clientY, id = e.pointerId, ghost = null, over = null;
    var binAt = function (x, y) {
      if (ghost) ghost.style.visibility = 'hidden';
      var el = document.elementFromPoint(x, y);
      if (ghost) ghost.style.visibility = '';
      return el && el.closest('[data-pl-bin]');
    };
    var move = function (ev) {
      if (ev.pointerId !== id) return;
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!ghost) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        ghost = pic.cloneNode();
        ghost.className = 'pl-ghost';
        ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px'; ghost.style.width = r.width + 'px';
        document.body.appendChild(ghost);
        src.classList.add('is-lifted');
      }
      if (ev.cancelable) ev.preventDefault();
      ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
      var b = binAt(ev.clientX, ev.clientY);
      if (b !== over) { if (over) over.classList.remove('is-over'); over = b; if (b) b.classList.add('is-over'); }
    };
    var up = function (ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!ghost) return;   // a tap: the click handles it
      S.dragged = true;
      setTimeout(function () { if (S) S.dragged = false; }, 0);
      if (over) over.classList.remove('is-over');
      ghost.remove();
      src.classList.remove('is-lifted');
      var b = ev.type === 'pointerup' && binAt(ev.clientX, ev.clientY);
      if (b) drop(item, b.getAttribute('data-pl-bin'));
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  window.GemPhanLoai = { open: open, ITEMS: ITEMS, BINS: BINS, POSTERS: POSTERS };
})();
