// Gem Chạm Sắc — Studio 2D
//
// A side-scrolling, hand-painted version of the real studio. Tap a piece of
// furniture: the character walks there and a sheet opens (products, 2hand,
// fitting corner…). Adding to cart and checkout go through js/basket.js, so
// the studio never keeps a cart of its own.
//
// All art is placeholder (ChatGPT drafts) until the hand-painted set arrives.
// Swapping art = replace the files and, if the layout moved, the numbers in
// SCENE below. Hotspots are given in each zone's own source pixels, so a
// redrawn zone only needs its own boxes re-measured.
//
// Strings live in this file (GemI18n.add), not in js/i18n.js, so the whole
// prototype can be dropped by deleting studio.html, this file and studio.css.

(function () {
  'use strict';

  /* ======================================================================
     SCENE — numbers come from tools/studio-assets.py (the STRIP line)
     ====================================================================== */
  var SCENE = {
    width: 4821,
    height: 1024,
    // x = where the zone starts in the strip, cropL = first source pixel kept
    zones: [
      { x: 0,    cropL: 0 },
      { x: 1472, cropL: 668 },
      { x: 2276, cropL: 755 },
      { x: 2993, cropL: 740 },
      { x: 3725, cropL: 440 }
    ],
    feetY: 965,          // where the character's feet touch the floor
    playerH: 410,        // character height, strip pixels
    startX: 330,          // just inside the door
    speed: 900,          // strip pixels per second
    // Udon on the walnut counter (placeholder: marker-style mascot)
    udon: { x: 4518, y: 338, w: 160, h: 150 }
  };

  // box = [x0, y0, x1, y1] in the zone's source image (1536 x 1024)
  // Tight boxes on the objects themselves, above the floor: the floor and
  // the band the character walks in stay free for walking. stand = where
  // the character stops (zone source px), when the middle of the box would
  // put them in front of its label.
  var HOTSPOTS = [
    { id: 'door',     zone: 1, box: [60, 110, 480, 600],    label: 'studio.hot_door' },
    { id: 'sofa',     zone: 1, box: [950, 630, 1210, 790],  label: 'studio.hot_sofa', stand: 820 },   // tea table and up
    { id: 'rail',     zone: 2, box: [700, 300, 1180, 690],  label: 'studio.hot_rail' },
    { id: 'fitting',  zone: 2, box: [1190, 290, 1440, 700], label: 'studio.hot_fitting' },
    { id: 'pegboard', zone: 3, box: [760, 290, 985, 690],   label: 'studio.hot_pegboard' },
    { id: 'cabinet',  zone: 3, box: [985, 335, 1510, 630],  label: 'studio.hot_cabinet' },               // open shelves only
    { id: 'sewing',   zone: 4, box: [800, 520, 1250, 640],  label: 'studio.hot_sewing', stand: 1300 }, // table top only
    { id: 'tu',       zone: 4, box: [1130, 415, 1400, 555], label: 'studio.hot_tu' },
    { id: 'counter',  zone: 5, box: [450, 440, 800, 640],   label: 'studio.hot_counter' },
    { id: 'memo',     zone: 5, box: [965, 160, 1387, 348],  label: 'studio.hot_memo' }
  ];

  // The cast (images/studio/char/pN-*.webp, cut by tools/studio-assets.py
  // --cast). Each has standing (front / side / three-quarter), a 4-frame
  // walk and a 3-frame cart push. ANCHOR = where the head sits across each
  // frame (from the tool's output), so frames of different widths don't jump.
  var CAST = ['p1', 'p2', 'p3', 'p4'];
  var FRAME_NAMES = ['front', 'side', 'q', 'walk1', 'walk2', 'walk3', 'walk4', 'cart1', 'cart2', 'cart3'];
  var ANCHOR = {"p1-front": 0.516, "p1-side": 0.513, "p1-q": 0.467, "p1-walk1": 0.53, "p1-walk2": 0.538, "p1-walk3": 0.534, "p1-walk4": 0.485, "p1-cart1": 0.358, "p1-cart2": 0.242, "p1-cart3": 0.272, "p2-front": 0.509, "p2-side": 0.497, "p2-q": 0.531, "p2-walk1": 0.588, "p2-walk2": 0.497, "p2-walk3": 0.548, "p2-walk4": 0.506, "p2-cart1": 0.433, "p2-cart2": 0.311, "p2-cart3": 0.364, "p3-front": 0.546, "p3-side": 0.477, "p3-q": 0.516, "p3-walk1": 0.557, "p3-walk2": 0.514, "p3-walk3": 0.55, "p3-walk4": 0.506, "p3-cart1": 0.344, "p3-cart2": 0.295, "p3-cart3": 0.273, "p4-front": 0.519, "p4-side": 0.547, "p4-q": 0.553, "p4-walk1": 0.47, "p4-walk2": 0.475, "p4-walk3": 0.498, "p4-walk4": 0.463, "p4-cart1": 0.344, "p4-cart2": 0.333, "p4-cart3": 0.325};
  var STEP_MS = 150;   // one walk / push frame

  function charSrc(who, name) { return 'images/studio/char/' + who + '-' + name + '.webp'; }

  var who = 'p1';
  try { if (CAST.indexOf(localStorage.getItem('gem-char')) >= 0) who = localStorage.getItem('gem-char'); } catch (e) { /* private mode */ }

  var SHELVES = {
    pegboard: ['scrunchie', 'bookmark', 'tuibut', 'origami', 'bloom', 'daydeo', 'biaso', 'so-kraft', 'so-khau'],
    cabinet:  ['goi', 'tham', 'lotcoc', 'oxford', 'denim', 'set-qua']
  };

  // The "bộ sưu tập" counted in the Tủ: every fabric-scrap piece.
  var SET_VAI_VUN = ['scrunchie', 'bookmark', 'tuibut', 'origami', 'bloom', 'daydeo',
    'biaso', 'goi', 'tham', 'lotcoc', 'oxford', 'denim'];

  // Rough colour families + prints of each ready-made piece, read off the
  // product photos. Used to suggest "có sẵn tông gần giống" under the
  // designer. Tags match GemPatch.tones(): xanh lam hong nau trung + bo ren
  // caro cham hoa.
  var READY_TONES = {
    origami: ['xanh', 'caro'], oxford: ['xanh', 'caro'], denim: ['lam', 'bo'],
    bloom: ['lam', 'hong'], tuibut: ['hong', 'lam', 'hoa'], bookmark: ['trung', 'nau', 'hoa'],
    biaso: ['hong', 'nau', 'caro'], daydeo: ['hong', 'hoa'], scrunchie: ['trung', 'nau', 'ren'],
    lotcoc: ['trung', 'nau', 'hoa'], goi: ['nau', 'hong', 'hoa'], tham: ['lam', 'hong', 'hoa']
  };

  // Real sewn patchwork, shown next to the sketch so expectations are set
  // by a photo, not by the drawing.
  var REAL = ['goi', 'tham', 'lotcoc', 'scrunchie'];

  // Things the character can wear later — bought first, then unlocked.
  var WEARABLES = ['denim', 'scrunchie', 'daydeo', 'bloom'];

  var THUMB = {
    origami: 'vai-vun-tui-1-thumb.jpg',
    oxford: 'vai-vun-tui-3-thumb.jpg',
    denim: 'vai-vun-tui-7-thumb.jpg',
    bloom: 'vai-vun-bloom-charm-thumb.jpg',
    tuibut: 'vai-vun-tui-but-thumb.jpg',
    bookmark: 'vai-vun-bookmark-vai-thumb.jpg',
    biaso: 'vai-vun-bia-so-thumb.jpg',
    daydeo: 'vai-vun-day-deo-hong-thumb.jpg',
    scrunchie: 'vai-vun-scrunchie-thumb.jpg',
    lotcoc: 'vai-vun-lot-ly-hoa-thumb.jpg',
    goi: 'vai-vun-goi-patchwork-thumb.jpg',
    tham: 'vai-vun-tham-tron-thumb.jpg',
    'so-kraft': 'vpp-so-kraft-thumb.jpg',
    'so-khau': 'vpp-so-khau-thumb.jpg',
    'set-qua': 'set-qua-tang-thumb.jpg'
  };

  /* ======================================================================
     STRINGS
     ====================================================================== */
  var STRINGS = {
    'title.studio':        { vi: `Studio Gem · Gem Chạm Sắc`, en: `Gem Studio · Gem Chạm Sắc` },
    'studio.list_view':    { vi: `Xem dạng danh sách`, en: `List view` },
    'studio.list_short':   { vi: `Danh sách`, en: `List` },
    'studio.nav_aria':     { vi: `Đi tới khu`, en: `Go to` },
    'studio.go_door':      { vi: `Cửa vào`, en: `Entrance` },
    'studio.go_fitting':   { vi: `Thử đồ`, en: `Fitting` },
    'studio.go_shelves':   { vi: `Kệ hàng`, en: `Shelves` },
    'studio.go_sewing':    { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.go_counter':   { vi: `Quầy`, en: `Counter` },
    'studio.go_tu':        { vi: `Tủ của bạn`, en: `Your cabinet` },
    'studio.sr_help':      { vi: `Chạm vào đồ vật trong studio để xem hàng. Bấm Tab để đi qua từng điểm.`, en: `Tap things in the studio to look around. Press Tab to move between them.` },
    'studio.close':        { vi: `Đóng`, en: `Close` },

    'studio.hot_door':     { vi: `Chọn nhân vật`, en: `Choose character` },
    'studio.hot_sofa':     { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.hot_rail':     { vi: `Đồ 2hand`, en: `Secondhand` },
    'studio.hot_fitting':  { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.hot_pegboard': { vi: `Phụ kiện & sổ`, en: `Accessories & notebooks` },
    'studio.hot_cabinet':  { vi: `Gối, thảm & quà`, en: `Cushions, rugs & gifts` },
    'studio.hot_sewing':   { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.hot_memo':     { vi: `Bảng lời nhắn`, en: `Message board` },
    'studio.hot_tu':       { vi: `Tủ sưu tầm`, en: `Your cabinet` },
    'studio.hot_counter':  { vi: `Quầy thu ngân`, en: `Counter` },

    'studio.intro':        { vi: `Chào bạn! Chạm vào kệ để xem đồ nhé. Bàn thiết kế ở gần cuối phòng đó.`, en: `Hi! Tap a shelf to look around. The design table is near the far end.` },
    'studio.cart_empty':   { vi: `Xe còn trống nè, dạo thêm chút nhé.`, en: `Your cart is still empty — have another look around.` },

    'studio.add':          { vi: `Thêm vào giỏ`, en: `Add to cart` },
    'studio.added':        { vi: `Đã thêm`, en: `Added` },
    'studio.out':          { vi: `Tạm hết hàng`, en: `Out of stock` },
    'studio.all_products': { vi: `Xem tất cả trên trang Sản phẩm`, en: `See everything on the Products page` },

    'studio.pegboard_h':   { vi: `Phụ kiện vải vụn & sổ`, en: `Fabric-scrap accessories & notebooks` },
    'studio.pegboard_p':   { vi: `Mỗi món ghép từ vải vụn, không cái nào giống cái nào.`, en: `Each piece is sewn from scraps, so no two are alike.` },
    'studio.cabinet_h':    { vi: `Gối, thảm & set quà`, en: `Cushions, rugs & gift sets` },
    'studio.cabinet_p':    { vi: `Đồ chắp vải cỡ lớn và những set quà gói sẵn.`, en: `Larger patchwork pieces and ready-wrapped gift sets.` },

    'studio.rail_h':       { vi: `Giá đồ 2hand`, en: `Secondhand rail` },
    'studio.rail_p':       { vi: `Mỗi món chỉ có một chiếc. Ghé studio để thử và mua nhé.`, en: `There's only one of each. Come by the studio to try them on.` },
    'studio.rail_cta':     { vi: `Đường tới studio`, en: `How to find us` },

    'studio.door_h':       { vi: `Chọn nhân vật`, en: `Choose your character` },
    'studio.door_p':       { vi: `Chọn một bạn để dạo studio. Đổi lúc nào cũng được, ở ngay cửa này.`, en: `Pick someone to walk the studio with. You can swap any time, right here at the door.` },
    'studio.char_p1':      { vi: `Bạn tóc ngắn đeo túi chắp vải`, en: `Bob hair, patchwork bag` },
    'studio.char_p2':      { vi: `Bạn đeo kính, áo kẻ caro`, en: `Glasses, check shirt` },
    'studio.char_p3':      { vi: `Bạn váy yếm, túi hoa`, en: `Pinafore dress, floral tote` },
    'studio.char_p4':      { vi: `Bạn áo len hồng, túi bò`, en: `Pink jumper, denim tote` },
    'studio.door_go':      { vi: `Vào studio`, en: `Step inside` },

    'studio.fitting_h':    { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.fitting_p':    { vi: `Mua món nào của Gem thì mặc được món đó cho nhân vật.`, en: `Buy a Gem piece and your character can wear it too.` },
    'studio.fitting_lock': { vi: `Mua để mặc`, en: `Buy to wear` },
    'studio.fitting_have': { vi: `Đã có`, en: `Yours` },

    'studio.sofa_h':       { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.sofa_p':       { vi: `Ngồi chút, xem studio dạo này có gì.`, en: `Sit down for a bit and see what's on.` },
    'studio.sofa_ws':      { vi: `Workshop — tự tay làm một món`, en: `Workshops — make something yourself` },
    'studio.sofa_news':    { vi: `Bản tin — chuyện ở studio`, en: `Newsletter — studio notes` },

    'studio.sewing_h':     { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.sewing_p':     { vi: `Kể cho Gem bạn muốn món thế nào. Chỗ nào chưa chắc, cứ để Gem chọn.`, en: `Tell Gem what you'd like. Anything you're unsure of, leave to Gem.` },
    'studio.pt_random':    { vi: `Gợi ý ngẫu nhiên`, en: `Surprise me` },
    'studio.pt_preview':   { vi: `Hình minh họa. Vải vụn thật sẽ khác một chút.`, en: `An illustration. The real scraps will differ a little.` },
    'studio.pt_layout':    { vi: `Kiểu ghép`, en: `Piecing` },
    'studio.pt_tones':     { vi: `Tông màu (tối đa 2)`, en: `Colours (up to 2)` },
    'studio.pt_prints':    { vi: `Họa tiết (chọn bao nhiêu cũng được)`, en: `Prints (pick any)` },
    'studio.pt_fabrics':   { vi: `Chất vải`, en: `Fabrics` },
    'studio.pt_other':     { vi: `Khác:`, en: `Other:` },
    'studio.pt_other_ph':  { vi: `vd: lụa, vải áo dài cũ`, en: `e.g. silk, an old áo dài` },
    'studio.pt_gem':       { vi: `Để Gem chọn`, en: `Let Gem choose` },
    'studio.pt_draw':      { vi: `Tự vẽ`, en: `Draw it` },
    'studio.pt_draw_p':    { vi: `Không bắt buộc. Vẽ hình, chữ hay bố cục bạn muốn, Gem may theo tinh thần đó.`, en: `Optional. Sketch a shape, a letter or a layout and Gem sews in that spirit.` },
    'studio.pt_draw_need': { vi: `Vẽ vài nét để Gem hiểu ý bạn nhé.`, en: `Draw a few lines so Gem gets the idea.` },
    'studio.pt_draw_full': { vi: `Hình đã đủ chi tiết rồi.`, en: `That's as much detail as it takes.` },
    'studio.pt_ink':       { vi: `Màu bút`, en: `Pen colour` },
    'studio.pt_clear':     { vi: `Xoá hình`, en: `Clear` },
    'studio.pt_note_label':{ vi: `Lưu ý cho Gem`, en: `A note for Gem` },
    'studio.pt_note_ph':   { vi: `vd: quà tặng mẹ, thêu chữ M ở góc`, en: `e.g. a gift for mum, an M in the corner` },
    'studio.pt_undo':      { vi: `Hoàn tác`, en: `Undo` },
    'studio.pt_add':       { vi: `Đặt Gem may`, en: `Ask Gem to sew it` },
    'studio.pt_save':      { vi: `Lưu ảnh`, en: `Save image` },
    'studio.pt_keep':      { vi: `Lưu vào tủ`, en: `Keep in cabinet` },
    'studio.pt_kept':      { vi: `Đã lưu`, en: `Kept` },
    'studio.pt_link':      { vi: `Chép link`, en: `Copy link` },
    'studio.pt_copied':    { vi: `Đã chép`, en: `Copied` },
    'studio.pt_note':      { vi: `Đây là bản phác. Thợ chọn vải vụn theo tông, họa tiết và kiểu ghép bạn chọn, nên màu và hoa văn sẽ gần giống chứ không giống hệt. Gem nhắn ảnh vải cho bạn duyệt trước khi may.`, en: `This is a sketch. Gem picks the scraps closest to it, so colours and prints will be close, not identical. Gem sends you a photo of the fabrics before sewing.` },
    'studio.pt_real':      { vi: `Đồ thật Gem đã may`, en: `Pieces Gem has sewn` },
    'studio.pt_similar':   { vi: `Có sẵn, tông gần giống — mua được ngay`, en: `Ready now, in a similar palette` },
    'studio.pt_products':  { vi: `Chọn món`, en: `Choose a piece` },
    'studio.pt_caption':   { vi: `Thiết kế riêng · Gem Chạm Sắc`, en: `My own design · Gem Chạm Sắc` },

    'studio.tu_h':         { vi: `Tủ sưu tầm`, en: `Your cabinet` },
    'studio.tu_p':         { vi: `Những gì bạn đã tạo và đã mua ở Gem. Tủ nằm ngay trên máy này, không cần tài khoản.`, en: `What you've made and bought at Gem. It lives on this device — no account needed.` },
    'studio.tu_set':       { vi: `Bộ sưu tập vải vụn`, en: `Fabric-scrap collection` },
    'studio.tu_set_n':     { vi: `Bạn đã có {n}/{t} món vải vụn của Gem`, en: `You have {n} of Gem's {t} fabric-scrap pieces` },
    'studio.tu_set_0':     { vi: `Gem có {t} món may từ vải vụn. Mua món nào, món đó vào tủ của bạn và được đánh dấu ở đây.`, en: `Gem makes {t} pieces from fabric scraps. Whatever you buy lands in your cabinet and is ticked off here.` },
    'studio.udon_no':      { vi: `Udon không bán đâu nha! Udon chỉ trông quầy thôi.`, en: `Udon's not for sale! Udon just minds the counter.` },
    'studio.udon_aria':    { vi: `Udon`, en: `Udon` },
    'studio.memo_h':       { vi: `Bảng lời nhắn`, en: `Message board` },
    'studio.memo_p':       { vi: `Để lại vài dòng cho Gem và cho người ghé sau. Gem đọc từng lời rồi mới ghim lên bảng.`, en: `Leave a few lines for Gem and for whoever comes by next. Gem reads each one before pinning it up.` },
    'studio.memo_empty':   { vi: `Bảng còn trống. Bạn ghim lời đầu tiên nhé?`, en: `The board is empty. Pin the first note?` },
    'studio.memo_write':   { vi: `Lời nhắn của bạn`, en: `Your note` },
    'studio.memo_name':    { vi: `Tên (không bắt buộc)`, en: `Name (optional)` },
    'studio.memo_send':    { vi: `Gửi cho Gem`, en: `Send to Gem` },
    'studio.memo_sending': { vi: `Đang gửi...`, en: `Sending...` },
    'studio.memo_ok':      { vi: `Gem nhận được rồi. Lời nhắn sẽ lên bảng sau khi Gem đọc nhé.`, en: `Gem got it. Your note goes up once Gem has read it.` },
    'studio.memo_wait':    { vi: `Bạn vừa gửi rồi, đợi chút rồi viết tiếp nhé.`, en: `You just sent one — give it a minute.` },
    'studio.memo_bad':     { vi: `Viết vài chữ (tối đa 280) rồi gửi nhé.`, en: `Write a few words (280 max) and send.` },
    'studio.memo_busy':    { vi: `Bảng đang nhiều lời chờ đọc quá. Bạn thử lại sau ít phút nhé.`, en: `Lots of notes waiting to be read. Try again in a few minutes.` },
    'studio.memo_fail':    { vi: `Chưa gửi được. Bạn thử lại sau chút nhé.`, en: `Couldn't send. Please try again in a bit.` },
    'studio.memo_anon':    { vi: `Một người ghé qua`, en: `A visitor` },
    'studio.tu_designs':   { vi: `Đã thiết kế`, en: `Designed` },
    'studio.tu_designs_0': { vi: `Chưa có thiết kế nào. Ghé bàn chắp vải thử một tấm nhé.`, en: `No designs yet. Try one at the patchwork table.` },
    'studio.tu_to_table':  { vi: `Tới bàn thiết kế`, en: `Go to the table` },
    'studio.tu_open':      { vi: `Mở`, en: `Open` },
    'studio.tu_remove':    { vi: `Bỏ`, en: `Remove` },
    'studio.tu_owned':     { vi: `Đã sưu tầm`, en: `Collected` },
    'studio.tu_owned_0':   { vi: `Món nào bạn mua ở Gem sẽ nằm ở đây.`, en: `Whatever you buy from Gem will sit here.` },
    'studio.tu_pending':   { vi: `Đang chuẩn bị`, en: `On its way` },
    'studio.tu_received':  { vi: `Đã nhận`, en: `Received` },
    'studio.tu_custom':    { vi: `Thiết kế riêng`, en: `My design` },
    'studio.tu_claim_h':   { vi: `Mua rồi mà tủ chưa có? Lấy lại bằng mã đơn`, en: `Bought something that isn't here? Add it with your order code` },
    'studio.tu_claim_p':   { vi: `Mua tại studio hay trên máy khác đều được. Gem chỉ dùng số điện thoại để khớp đơn, không lưu lại trên máy.`, en: `Bought at the studio or on another device? Gem only uses your phone number to match the order — it isn't kept on this device.` },
    'studio.tu_code':      { vi: `Mã đơn`, en: `Order code` },
    'studio.tu_phone':     { vi: `Số điện thoại đặt đơn`, en: `Phone number on the order` },
    'studio.tu_claim':     { vi: `Lấy lại`, en: `Add to cabinet` },
    'studio.tu_checking':  { vi: `Đang tìm...`, en: `Looking...` },
    'studio.tu_ok':        { vi: `Đã thêm vào tủ.`, en: `Added to your cabinet.` },
    'studio.tu_ok_same':   { vi: `Đơn này đã có trong tủ rồi.`, en: `That order is already in your cabinet.` },
    'studio.tu_bad':       { vi: `Mã đơn hoặc số điện thoại chưa đúng. Bạn kiểm tra lại giúp Gem nhé.`, en: `That order code or phone number doesn't match. Could you check them again?` },
    'studio.tu_offline':   { vi: `Chưa kết nối được. Bạn thử lại sau chút nhé.`, en: `Couldn't connect. Please try again in a bit.` }
  };
  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STRINGS);

  function t(key) {
    var v = window.GemI18n && window.GemI18n.t ? window.GemI18n.t(key) : null;
    if (v != null) return v;
    return STRINGS[key] ? STRINGS[key].vi : key;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Static markup carrying data-i18n, so a language switch retranslates it.
  function tr(tag, key, attrs) {
    return '<' + tag + (attrs || '') + ' data-i18n="' + key + '">' + esc(t(key)) + '</' + tag + '>';
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     GEOMETRY
     ====================================================================== */
  function zoneX(zone, x) {
    var z = SCENE.zones[zone - 1];
    return z.x + (x - z.cropL);
  }

  function boxOf(h) {
    return {
      x0: zoneX(h.zone, h.box[0]), y0: h.box[1],
      x1: zoneX(h.zone, h.box[2]), y1: h.box[3]
    };
  }

  function hotById(id) {
    for (var i = 0; i < HOTSPOTS.length; i++) if (HOTSPOTS[i].id === id) return HOTSPOTS[i];
    return null;
  }

  function standX(h) {
    if (h.stand != null) return zoneX(h.zone, h.stand);
    var b = boxOf(h);
    return (b.x0 + b.x1) / 2;
  }

  function pct(v, of) { return (v / of * 100).toFixed(3) + '%'; }

  /* ======================================================================
     STATE + DOM
     ====================================================================== */
  var udonEl, memoPins, notesCache = null;
  var stage, world, playerEl, bobEl, frameEls = {}, bubble, bubbleText, modal, sheetBody;
  var k = 1;           // screen px per strip px
  var cam = 0;
  var player = { x: SCENE.startX, facing: 1, moving: false, moved: false, frame: 'front' };
  var walkToken = 0;
  var cartCount = 0;
  var lastFocus = null;

  function build() {
    // Hotspots
    HOTSPOTS.forEach(function (h) {
      var b = boxOf(h);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'st-hot';
      btn.setAttribute('data-hot', h.id);
      btn.setAttribute('data-i18n-attr', 'aria-label:' + h.label);
      btn.setAttribute('aria-label', t(h.label));
      btn.style.left = pct(b.x0, SCENE.width);
      btn.style.top = pct(b.y0, SCENE.height);
      btn.style.width = pct(b.x1 - b.x0, SCENE.width);
      btn.style.height = pct(b.y1 - b.y0, SCENE.height);
      btn.innerHTML = '<span class="st-hot-label" data-i18n="' + h.label + '">' + esc(t(h.label)) + '</span>';
      world.appendChild(btn);
    });

    // Udon on the counter
    var u = SCENE.udon;
    udonEl = document.createElement('button');
    udonEl.type = 'button';
    udonEl.className = 'st-udon';
    udonEl.setAttribute('data-i18n-attr', 'aria-label:studio.udon_aria');
    udonEl.setAttribute('aria-label', t('studio.udon_aria'));
    udonEl.innerHTML = '<img src="images/mascot/udon_sit_happy.png" alt="" draggable="false">';
    udonEl.style.left = pct(u.x, SCENE.width);
    udonEl.style.top = pct(u.y, SCENE.height);
    udonEl.style.width = pct(u.w, SCENE.width);
    world.appendChild(udonEl);

    // Paper notes pinned on the memo board (filled once notes load)
    var mb = boxOf(hotById('memo'));
    memoPins = document.createElement('div');
    memoPins.className = 'st-pins';
    memoPins.style.left = pct(mb.x0, SCENE.width);
    memoPins.style.top = pct(mb.y0, SCENE.height);
    memoPins.style.width = pct(mb.x1 - mb.x0, SCENE.width);
    memoPins.style.height = pct(mb.y1 - mb.y0, SCENE.height);
    world.insertBefore(memoPins, world.querySelector('.st-hot'));

    // Character: one <img> per frame, toggled — swapping src would flicker.
    playerEl = document.createElement('div');
    playerEl.className = 'st-player';
    playerEl.style.height = pct(SCENE.playerH, SCENE.height);
    playerEl.style.bottom = pct(SCENE.height - SCENE.feetY, SCENE.height);
    bobEl = document.createElement('div');
    bobEl.className = 'st-bob';
    playerEl.appendChild(bobEl);
    world.appendChild(playerEl);
    dress();
  }

  // (Re)build the frames for the chosen character.
  function dress() {
    bobEl.textContent = '';
    frameEls = {};
    FRAME_NAMES.forEach(function (name) {
      var img = document.createElement('img');
      img.src = charSrc(who, name);
      img.alt = '';
      img.draggable = false;
      img.style.transform = 'translateX(' + (-(ANCHOR[who + '-' + name] || 0.5) * 100) + '%)';
      img.hidden = true;
      frameEls[name] = img;
      bobEl.appendChild(img);
    });
    player.frame = null;
  }

  function pickChar(id) {
    if (CAST.indexOf(id) < 0 || id === who) return;
    who = id;
    try { localStorage.setItem('gem-char', id); } catch (e) { /* private mode */ }
    dress();
    render();
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  function layout() {
    var h = stage.clientHeight;
    k = h / SCENE.height;
    world.style.width = (SCENE.width * k) + 'px';
    world.style.height = h + 'px';
    render();
  }

  function pickFrame(now) {
    var step = Math.floor(now / STEP_MS);
    if (cartCount > 0 || player.udon) return player.moving ? 'cart' + (step % 3 + 1) : 'cart1';
    if (player.moving) return 'walk' + (step % 4 + 1);
    return player.moved ? 'side' : 'front';
  }

  function render(now) {
    var frame = pickFrame(now || performance.now());
    if (frame !== player.frame || !frameEls[frame] || frameEls[frame].hidden) {
      Object.keys(frameEls).forEach(function (n) { frameEls[n].hidden = n !== frame; });
      player.frame = frame;
    }
    playerEl.style.left = (player.x * k) + 'px';
    playerEl.style.transform = player.facing < 0 ? 'scaleX(-1)' : '';
    playerEl.classList.toggle('is-moving', player.moving);

    var viewW = stage.clientWidth;
    var worldW = SCENE.width * k;
    cam = Math.max(0, Math.min(player.x * k - viewW / 2, worldW - viewW));
    world.style.transform = 'translate3d(' + (-cam) + 'px,0,0)';
  }

  /* ======================================================================
     MOVEMENT
     ====================================================================== */
  function walkTo(x, then) {
    var target = Math.max(120, Math.min(SCENE.width - 120, x));
    var token = ++walkToken;
    var from = player.x;
    var dist = Math.abs(target - from);
    if (dist > 4) player.facing = target > from ? 1 : -1;
    player.moved = true;

    if (reduceMotion || dist < 4) {
      player.x = target;
      player.moving = false;
      render();
      if (then) then();
      return;
    }

    // Long walks speed up so no trip takes much more than a second.
    var dur = Math.max(250, Math.min(1400, dist / SCENE.speed * 1000));
    var start = performance.now();
    player.moving = true;

    function step(now) {
      if (token !== walkToken) return;          // a newer walk took over
      var p = Math.min(1, (now - start) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      player.x = from + (target - from) * e;
      if (p < 1) {
        render(now);
        requestAnimationFrame(step);
      } else {
        player.moving = false;
        render(now);
        if (then) then();
      }
    }
    requestAnimationFrame(step);
  }

  /* ======================================================================
     UDON SAYS
     ====================================================================== */
  var bubbleTimer = null;
  function say(key, ms) {
    bubbleText.setAttribute('data-i18n', key);
    bubbleText.textContent = t(key);
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, ms || 4000);
  }

  /* ======================================================================
     SHEETS (pop-ups)
     ====================================================================== */
  function openSheet(html) {
    lastFocus = document.activeElement;
    sheetBody.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('st-lock');
    modal.querySelector('.st-close').focus();
  }

  function closeSheet() {
    if (modal.hidden) return;
    modal.hidden = true;
    sheetBody.innerHTML = '';
    document.body.classList.remove('st-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function head(hKey, pKey) {
    return tr('h2', hKey, ' id="st-sheet-title"') + (pKey ? tr('p', pKey, ' class="st-lead"') : '');
  }

  function productCard(sku) {
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    if (!info) return '';
    var out = !info.inStock;
    return '<li class="st-prod">' +
      '<img src="images/products/' + THUMB[sku] + '" alt="" loading="lazy" width="300" height="300">' +
      '<b>' + esc(info.name) + '</b>' +
      '<span class="st-price">' + esc(info.price) + '</span>' +
      (out
        ? '<button type="button" class="st-btn" disabled>' + esc(t('studio.out')) + '</button>'
        : '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>') +
    '</li>';
  }

  function shelfSheet(id) {
    openSheet(
      head('studio.' + id + '_h', 'studio.' + id + '_p') +
      '<ul class="st-grid">' + SHELVES[id].map(productCard).join('') + '</ul>' +
      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>'
    );
  }

  function railSheet() {
    var imgs = '';
    for (var i = 1; i <= 6; i++) {
      imgs += '<li><img src="images/products/2hand-' + i + '.png" alt="" loading="lazy"></li>';
    }
    openSheet(
      head('studio.rail_h', 'studio.rail_p') +
      '<ul class="st-grid st-grid--photos">' + imgs + '</ul>' +
      '<p class="st-foot">' + tr('a', 'studio.rail_cta', ' href="ghe-tham.html" class="st-btn"') +
      ' ' + tr('a', 'studio.all_products', ' href="san-pham.html#quan-ao-2hand"') + '</p>'
    );
  }

  function doorSheet() {
    openSheet(
      head('studio.door_h', 'studio.door_p') +
      '<ul class="st-chars">' + CAST.map(function (id) {
        return '<li><button type="button" class="st-char' + (id === who ? ' is-picked' : '') + '" data-char="' + id +
          '" aria-pressed="' + (id === who) + '" aria-label="' + esc(t('studio.char_' + id)) + '">' +
          '<img src="' + charSrc(id, 'front') + '" alt="" loading="lazy"></button></li>';
      }).join('') + '</ul>' +
      '<p class="st-foot"><button type="button" class="st-btn" data-close data-i18n="studio.door_go">' +
        esc(t('studio.door_go')) + '</button></p>'
    );
  }

  function fittingSheet() {
    var items = WEARABLES.map(function (sku) {
      var info = window.GemBasket ? window.GemBasket.info(sku) : null;
      if (!info) return '';
      var have = window.GemTu && window.GemTu.owns(sku);
      return '<li class="st-prod' + (have ? ' is-owned' : ' is-locked') + '">' +
        '<img src="images/products/' + THUMB[sku] + '" alt="" loading="lazy" width="300" height="300">' +
        '<b>' + esc(info.name) + '</b>' +
        (have
          ? tr('span', 'studio.fitting_have', ' class="st-lock-tag is-have"')
          : tr('span', 'studio.fitting_lock', ' class="st-lock-tag"')) +
        (!have && info.inStock
          ? '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>'
          : '') +
      '</li>';
    }).join('');
    openSheet(
      head('studio.fitting_h', 'studio.fitting_p') +
      '<div class="st-fitting"><img src="' + charSrc(who, 'front') + '" alt=""></div>' +
      '<ul class="st-grid">' + items + '</ul>'
    );
  }

  function sofaSheet() {
    openSheet(
      head('studio.sofa_h', 'studio.sofa_p') +
      '<ul class="st-links">' +
        '<li>' + tr('a', 'studio.sofa_ws', ' href="workshop.html"') + '</li>' +
        '<li>' + tr('a', 'studio.sofa_news', ' href="ban-tin.html"') + '</li>' +
      '</ul>'
    );
  }

  /* ---------- Bàn thiết kế (designer) ----------
     A brief for the maker, not a pixel drawing: piece, piecing layout,
     colour families, prints, fabrics — each "or let Gem choose" — plus an
     optional sketch and note. Data and drawing live in js/patch.js. The
     note / "other fabric" are the customer's words: textContent / esc()
     only, and they also travel in the share link. */
  var P = window.GemPatch;
  var D = { d: P ? P.blank('goi') : null, drawing: null, ink: 0 };

  function specNow() { return P.encode(D.d); }

  function lng() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  function pointsUsed() {
    return D.d.sketch.reduce(function (n, s) { return n + s.pts.length; }, 0);
  }

  function designerSheet() {
    if (!P) return;
    openSheet(
      head('studio.sewing_h', 'studio.sewing_p') +
      '<div class="pt">' +
        '<div class="pt-tabs" role="group" data-i18n-attr="aria-label:studio.pt_products" aria-label="' + esc(t('studio.pt_products')) + '"></div>' +
        '<div class="pt-view">' +
          '<div class="pt-board"></div>' +
          tr('p', 'studio.pt_preview', ' class="pt-small"') +
        '</div>' +
        '<div class="pt-side">' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_layout', ' class="pt-label"') + '<div class="pt-layouts pt-chips"></div></section>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_tones', ' class="pt-label"') + '<div class="pt-tones pt-chips"></div></section>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_prints', ' class="pt-label"') + '<div class="pt-prints pt-chips"></div></section>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_fabrics', ' class="pt-label"') + '<div class="pt-fabrics pt-chips"></div>' +
            '<label class="pt-other">' + tr('span', 'studio.pt_other') +
              '<input name="other" maxlength="' + P.MAX_OTHER + '" autocomplete="off" data-i18n-attr="placeholder:studio.pt_other_ph" placeholder="' + esc(t('studio.pt_other_ph')) + '"></label>' +
          '</section>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_draw', ' class="pt-label"') +
            tr('p', 'studio.pt_draw_p', ' class="pt-small"') +
            '<div class="pt-draw">' +
              '<canvas class="pt-canvas" width="512" height="512" data-i18n-attr="aria-label:studio.pt_draw" aria-label="' + esc(t('studio.pt_draw')) + '"></canvas>' +
              '<div class="pt-inks" role="group"></div>' +
              '<div class="pt-tools">' +
                '<button type="button" class="pt-tool" data-pt="undo" data-i18n="studio.pt_undo">' + esc(t('studio.pt_undo')) + '</button>' +
                '<button type="button" class="pt-tool" data-pt="clear" data-i18n="studio.pt_clear">' + esc(t('studio.pt_clear')) + '</button>' +
              '</div>' +
              '<p class="pt-small pt-draw-msg" aria-live="polite"></p>' +
            '</div>' +
          '</section>' +
          '<section class="pt-sec"><label class="pt-notefield">' + tr('span', 'studio.pt_note_label', ' class="pt-label"') +
            '<textarea name="note" rows="2" maxlength="' + P.MAX_NOTE + '" data-i18n-attr="placeholder:studio.pt_note_ph" placeholder="' + esc(t('studio.pt_note_ph')) + '"></textarea></label></section>' +
          '<div class="pt-actions">' +
            '<span class="pt-price"></span>' +
            '<button type="button" class="st-btn" data-pt="add" data-i18n="studio.pt_add">' + esc(t('studio.pt_add')) + '</button>' +
            (window.GemTu ? '<button type="button" class="pt-tool" data-pt="keep" data-i18n="studio.pt_keep">' + esc(t('studio.pt_keep')) + '</button>' : '') +
            '<button type="button" class="pt-tool" data-pt="save" data-i18n="studio.pt_save">' + esc(t('studio.pt_save')) + '</button>' +
            '<button type="button" class="pt-tool" data-pt="link" data-i18n="studio.pt_link">' + esc(t('studio.pt_link')) + '</button>' +
            '<button type="button" class="pt-tool" data-pt="random" data-i18n="studio.pt_random">' + esc(t('studio.pt_random')) + '</button>' +
          '</div>' +
          tr('p', 'studio.pt_note', ' class="pt-note"') +
        '</div>' +
        '<div class="pt-more">' +
          tr('h3', 'studio.pt_real') +
          '<ul class="pt-real"></ul>' +
          '<div class="pt-similar"></div>' +
        '</div>' +
      '</div>'
    );
    var root = sheetBody.querySelector('.pt');
    root.querySelector('[name="other"]').value = D.d.other;
    root.querySelector('[name="note"]').value = D.d.note;
    bindCanvas(root.querySelector('.pt-canvas'));
    renderDesigner();
  }

  function chip(attr, id, on, label, icon) {
    return '<button type="button" class="pt-chip' + (on ? ' is-on' : '') + '" ' + attr + '="' + id +
      '" aria-pressed="' + on + '">' + (icon || '') + '<span>' + esc(label) + '</span></button>';
  }

  function renderDesigner() {
    var root = sheetBody.querySelector('.pt');
    if (!root || !P) return;
    var l = lng(), d = D.d, prod = P.PRODUCTS[d.product];
    var gemTones = d.tones[0] === P.GEM, gemPrints = d.prints[0] === P.GEM;

    root.querySelector('.pt-tabs').innerHTML = P.PRODUCT_ORDER.map(function (id) {
      return '<button type="button" class="pt-tab' + (id === d.product ? ' is-on' : '') +
        '" data-product="' + id + '" aria-pressed="' + (id === d.product) + '">' + esc(P.PRODUCTS[id][l]) + '</button>';
    }).join('');

    root.querySelector('.pt-layouts').innerHTML = prod.layouts.map(function (id) {
      var preview = Object.assign({}, d, { layout: id });
      var icon = id === 'tuve' && !d.sketch.length
        ? '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M5 19l3-1L18 8l-2-2L6 16z" fill="none" stroke="#8A6A44" stroke-width="1.6" stroke-linejoin="round"/></svg>'
        : P.svg(preview, { size: 40 });
      return chip('data-layout', id, id === d.layout, P.LAYOUTS[id][l], icon);
    }).join('');

    root.querySelector('.pt-tones').innerHTML = P.TONE_ORDER.map(function (id) {
      return chip('data-tone', id, d.tones.indexOf(id) >= 0, P.TONES[id][l], P.toneDot(id, 22));
    }).join('') + chip('data-tone', P.GEM, gemTones, t('studio.pt_gem'));

    root.querySelector('.pt-prints').innerHTML = P.PRINT_ORDER.map(function (id) {
      return chip('data-print', id, d.prints.indexOf(id) >= 0, P.PRINTS[id][l], P.printDot(id, 22));
    }).join('') + chip('data-print', P.GEM, gemPrints, t('studio.pt_gem'));

    root.querySelector('.pt-fabrics').innerHTML = P.FABRIC_ORDER.map(function (id) {
      return chip('data-fabric', id, d.fabrics.indexOf(id) >= 0, P.FABRICS[id][l]);
    }).join('');

    root.querySelector('.pt-inks').innerHTML = P.INKS.map(function (c, i) {
      return '<button type="button" class="pt-ink' + (i === D.ink ? ' is-on' : '') + '" data-ink="' + i +
        '" aria-pressed="' + (i === D.ink) + '" aria-label="' + esc(t('studio.pt_ink')) + ' ' + (i + 1) +
        '"><span style="background:' + c + '"></span></button>';
    }).join('');

    renderPreview();
  }

  // The parts that change while typing / drawing, without rebuilding inputs.
  function renderPreview() {
    var root = sheetBody.querySelector('.pt');
    if (!root) return;
    var d = D.d, spec = specNow(), ok = P.isComplete(d);
    root.querySelector('.pt-board').innerHTML = P.svg(d, { title: esc(P.describe(d)) });
    drawCanvas();
    root.querySelector('[data-pt="undo"]').disabled = !d.sketch.length;
    root.querySelector('[data-pt="clear"]').disabled = !d.sketch.length;
    root.querySelector('.pt-draw-msg').textContent = d.layout === 'tuve' && !d.sketch.length
      ? t('studio.pt_draw_need')
      : pointsUsed() >= P.MAX_POINTS ? t('studio.pt_draw_full') : '';

    var sku = P.PRODUCTS[d.product].sku;
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    root.querySelector('.pt-price').textContent = info ? info.price : '';
    var add = root.querySelector('[data-pt="add"]');
    add.disabled = !ok || (info && !info.inStock);
    var keep = root.querySelector('[data-pt="keep"]');
    if (keep) keep.disabled = !ok;

    root.querySelector('.pt-real').innerHTML = [sku].concat(REAL.filter(function (s) { return s !== sku; }))
      .map(function (s) {
        var i = window.GemBasket ? window.GemBasket.info(s) : null;
        if (!i || !THUMB[s]) return '';
        return '<li' + (s === sku ? ' class="is-this"' : '') + '><img src="images/products/' + THUMB[s] +
          '" alt="" loading="lazy" width="112" height="112">' + esc(i.name) + '</li>';
      }).join('');

    var similar = ok ? similarTo(spec) : [];
    root.querySelector('.pt-similar').innerHTML = similar.length
      ? tr('h3', 'studio.pt_similar') + '<ul class="st-grid">' + similar.map(productCard).join('') + '</ul>'
      : '';
  }

  // Ready-made pieces that share the design's colour families and prints,
  // best first. Only in-stock ones; nothing shown when nothing fits.
  function similarTo(spec) {
    var tally = P.tones ? P.tones(spec) : {};
    return Object.keys(READY_TONES).map(function (s) {
      var score = 0;
      READY_TONES[s].forEach(function (tag) { score += tally[tag] || 0; });
      return { sku: s, score: score };
    }).filter(function (r) {
      var i = window.GemBasket ? window.GemBasket.info(r.sku) : null;
      return r.score > 0 && i && i.inStock;
    }).sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3).map(function (r) { return r.sku; });
  }

  // Multi-pick with a "let Gem choose" that clears the rest (and vice versa).
  function toggle(listName, id, max) {
    var arr = D.d[listName];
    if (id === P.GEM) { D.d[listName] = arr[0] === P.GEM ? [] : [P.GEM]; return; }
    arr = arr.filter(function (x) { return x !== P.GEM; });
    var at = arr.indexOf(id);
    if (at >= 0) arr.splice(at, 1);
    else {
      arr.push(id);
      if (max && arr.length > max) arr.shift();   // keep the latest picks
    }
    D.d[listName] = arr;
  }

  /* --- sketch pad: strokes on a 64 x 64 grid --- */
  function bindCanvas(cv) {
    var cell = function (e) {
      var r = cv.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) / r.width * P.GRID);
      var y = Math.floor((e.clientY - r.top) / r.height * P.GRID);
      return [Math.max(0, Math.min(P.GRID - 1, x)), Math.max(0, Math.min(P.GRID - 1, y))];
    };
    cv.addEventListener('pointerdown', function (e) {
      if (D.d.sketch.length >= P.MAX_STROKES || pointsUsed() >= P.MAX_POINTS) { renderPreview(); return; }
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      D.drawing = { c: D.ink, pts: [cell(e)] };
      D.d.sketch.push(D.drawing);
      drawCanvas();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!D.drawing) return;
      var p = cell(e), last = D.drawing.pts[D.drawing.pts.length - 1];
      if (p[0] === last[0] && p[1] === last[1]) return;
      if (pointsUsed() >= P.MAX_POINTS) return;
      D.drawing.pts.push(p);
      drawCanvas();
    });
    var end = function () {
      if (!D.drawing) return;
      D.drawing = null;
      renderPreview();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  function drawCanvas() {
    var cv = sheetBody.querySelector('.pt-canvas');
    if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d'), s = cv.width / P.GRID;
    g.fillStyle = '#FBF6EE';
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = 'rgba(138,106,68,0.12)';
    g.lineWidth = 1;
    for (var k = 8; k < P.GRID; k += 8) {
      g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, cv.height); g.moveTo(0, k * s); g.lineTo(cv.width, k * s); g.stroke();
    }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = s * 1.3;
    D.d.sketch.forEach(function (st) {
      g.strokeStyle = P.INKS[st.c];
      g.beginPath();
      st.pts.forEach(function (p, i) {
        var x = (p[0] + 0.5) * s, y = (p[1] + 0.5) * s;
        if (i) g.lineTo(x, y); else { g.moveTo(x, y); g.lineTo(x + 0.01, y); }
      });
      g.stroke();
    });
  }

  function flash(btn, key, back) {
    btn.textContent = t(key);
    btn.classList.add('is-added');
    setTimeout(function () { btn.textContent = t(back); btn.classList.remove('is-added'); }, 1300);
  }

  function saveImage(btn) {
    var svgText = P.svg(D.d, { size: 900 });
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = 1080; c.height = 1350;
      var g = c.getContext('2d');
      g.fillStyle = '#F0E1D2'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 90, 120, 900, 900);
      g.fillStyle = '#3D4A2E'; g.textAlign = 'center';
      g.font = '800 54px Nunito, sans-serif';
      g.fillText(P.PRODUCTS[D.d.product][lng()], 540, 1120);
      g.font = '500 34px "Be Vietnam Pro", sans-serif';
      g.fillStyle = '#87965A';
      g.fillText(t('studio.pt_caption'), 540, 1180);
      c.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'gem-thiet-ke-' + D.d.product + '.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    flash(btn, 'studio.pt_save', 'studio.pt_save');
  }

  function copyLink(btn) {
    var url = P.url(specNow());
    var done = function () { flash(btn, 'studio.pt_copied', 'studio.pt_link'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('', url); });
    } else {
      window.prompt('', url);
    }
  }

  function designerClick(e) {
    var el;
    if ((el = e.target.closest('[data-product]'))) {
      var keep = D.d;
      D.d = P.blank(el.getAttribute('data-product'));
      // carry the taste over to the new piece
      D.d.tones = keep.tones; D.d.prints = keep.prints; D.d.fabrics = keep.fabrics;
      D.d.other = keep.other; D.d.note = keep.note; D.d.sketch = keep.sketch;
      if (keep.layout === 'tuve') D.d.layout = 'tuve';
    } else if ((el = e.target.closest('[data-layout]'))) {
      D.d.layout = el.getAttribute('data-layout');
    } else if ((el = e.target.closest('[data-tone]'))) {
      toggle('tones', el.getAttribute('data-tone'), P.MAX_TONES);
    } else if ((el = e.target.closest('[data-print]'))) {
      toggle('prints', el.getAttribute('data-print'));
    } else if ((el = e.target.closest('[data-fabric]'))) {
      toggle('fabrics', el.getAttribute('data-fabric'));
    } else if ((el = e.target.closest('[data-ink]'))) {
      D.ink = +el.getAttribute('data-ink');
    } else if ((el = e.target.closest('[data-pt]'))) {
      var act = el.getAttribute('data-pt');
      if (act === 'undo') {
        D.d.sketch.pop();
      } else if (act === 'clear') {
        D.d.sketch = [];
      } else if (act === 'random') {
        var r = P.randomFill(D.d.product);
        r.other = D.d.other; r.note = D.d.note; r.sketch = D.d.sketch;
        D.d = r;
      } else if (act === 'add') {
        var spec = specNow();
        var board = sheetBody.querySelector('.pt-board svg');
        if (window.GemBasket && window.GemBasket.add(P.PRODUCTS[D.d.product].sku, board, spec)) {
          flash(el, 'studio.added', 'studio.pt_add');
          if (window.GemTu) window.GemTu.saveDesign(spec);
        }
        return true;
      } else if (act === 'keep') {
        if (window.GemTu && window.GemTu.saveDesign(specNow())) flash(el, 'studio.pt_kept', 'studio.pt_keep');
        return true;
      } else if (act === 'save') {
        saveImage(el);
        return true;
      } else if (act === 'link') {
        copyLink(el);
        return true;
      }
    } else {
      return false;
    }
    renderDesigner();
    return true;
  }

  function designerInput(e) {
    var n = e.target.name;
    if (n !== 'other' && n !== 'note') return;
    D.d[n] = e.target.value.slice(0, n === 'other' ? P.MAX_OTHER : P.MAX_NOTE);
    renderPreview();
  }

  /* ---------- Tủ sưu tầm ----------
     Data in js/collection.js (this browser only). Every name/spec shown
     here goes through esc() or GemPatch (whitelisted codes only). */
  function tuSheet() {
    if (!window.GemTu) return;
    openSheet(
      head('studio.tu_h', 'studio.tu_p') +
      '<div class="tu">' +
        '<div class="tu-set"></div>' +
        tr('h3', 'studio.tu_designs', ' class="tu-h"') +
        '<div class="tu-designs"></div>' +
        tr('h3', 'studio.tu_owned', ' class="tu-h"') +
        '<div class="tu-owned"></div>' +
        '<details class="tu-claim">' +
          tr('summary', 'studio.tu_claim_h') +
          tr('p', 'studio.tu_claim_p', ' class="tu-small"') +
          '<form class="tu-form" novalidate>' +
            '<label>' + tr('span', 'studio.tu_code') +
              '<input name="code" autocomplete="off" autocapitalize="characters" maxlength="12" required></label>' +
            '<label>' + tr('span', 'studio.tu_phone') +
              '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required></label>' +
            '<button type="submit" class="st-btn" data-i18n="studio.tu_claim">' + esc(t('studio.tu_claim')) + '</button>' +
            '<p class="tu-msg" role="status" aria-live="polite"></p>' +
          '</form>' +
        '</details>' +
      '</div>'
    );
    renderTu();
  }

  function renderTu() {
    var root = sheetBody.querySelector('.tu');
    if (!root || !window.GemTu) return;
    var l = lng();
    var have = window.GemTu.countOf(SET_VAI_VUN);
    var total = SET_VAI_VUN.length;
    var fill = function (key) { return t(key).replace('{n}', have).replace('{t}', total); };
    root.querySelector('.tu-set').innerHTML = '<p><b>' + esc(t('studio.tu_set')) + '</b></p>' + (have
      ? '<p class="tu-small">' + esc(fill('studio.tu_set_n')) + '</p>' +
        '<div class="tu-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total +
          '" aria-valuenow="' + have + '"><span style="width:' + (have / total * 100).toFixed(1) + '%"></span></div>'
      : '<p class="tu-small">' + esc(fill('studio.tu_set_0')) + '</p>');

    var designs = window.GemTu.designs();
    root.querySelector('.tu-designs').innerHTML = designs.length
      ? '<ul class="tu-grid">' + designs.map(function (d) {
          var spec = P.parse(d.spec);
          if (!spec) return '';
          return '<li class="tu-item">' + P.svg(spec, { size: 160 }) +
            '<b>' + esc(P.PRODUCTS[spec.product][l]) + '</b>' +
            '<span class="tu-row">' +
              '<button type="button" class="pt-tool" data-tu-open="' + esc(d.spec) + '">' + esc(t('studio.tu_open')) + '</button>' +
              '<button type="button" class="pt-tool" data-tu-remove="' + esc(d.spec) + '">' + esc(t('studio.tu_remove')) + '</button>' +
            '</span></li>';
        }).join('') + '</ul>'
      : '<p class="tu-empty">' + esc(t('studio.tu_designs_0')) + ' ' +
        '<button type="button" class="pt-tool" data-goto="sewing">' + esc(t('studio.tu_to_table')) + '</button></p>';

    var owned = window.GemTu.owned().slice().reverse();
    var cards = owned.map(function (o) {
      var info = window.GemBasket ? window.GemBasket.info(o.sku) : null;
      if (!info) return '';
      var spec = o.spec && P ? P.parse(o.spec) : null;
      var pic = spec ? P.svg(spec, { size: 160 })
        : THUMB[o.sku] ? '<img src="images/products/' + THUMB[o.sku] + '" alt="" loading="lazy" width="160" height="160">'
        : '<span class="tu-noimg"></span>';
      return '<li class="tu-item">' + pic +
        '<b>' + esc(info.name) + '</b>' +
        (spec ? '<span class="tu-small">' + esc(t('studio.tu_custom')) + '</span>' : '') +
        '<span class="st-lock-tag' + (o.received ? ' is-have' : '') + '">' +
          esc(t(o.received ? 'studio.tu_received' : 'studio.tu_pending')) + '</span>' +
      '</li>';
    }).join('');
    root.querySelector('.tu-owned').innerHTML = cards
      ? '<ul class="tu-grid">' + cards + '</ul>'
      : '<p class="tu-empty">' + esc(t('studio.tu_owned_0')) + '</p>';
  }

  function tuClick(e) {
    var el;
    if ((el = e.target.closest('[data-tu-open]'))) {
      var spec = P && P.parse(el.getAttribute('data-tu-open'));
      if (!spec) return true;
      D.d = spec;
      closeSheet();
      visit('sewing');
      return true;
    }
    if ((el = e.target.closest('[data-tu-remove]'))) {
      window.GemTu.removeDesign(el.getAttribute('data-tu-remove'));
      renderTu();
      return true;
    }
    return false;
  }

  function tuSubmit(form) {
    var msg = form.querySelector('.tu-msg');
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    msg.textContent = t('studio.tu_checking');
    window.GemTu.claim(form.elements['code'].value, form.elements['phone'].value).then(function (res) {
      btn.disabled = false;
      if (res.ok) {
        form.elements['phone'].value = '';
        renderTu();
        msg.textContent = t(res.added ? 'studio.tu_ok' : 'studio.tu_ok_same');
      } else {
        msg.textContent = t(res.error === 'offline' ? 'studio.tu_offline' : 'studio.tu_bad');
      }
    });
  }

  function counter() {
    closeSheet();
    if (!window.GemBasket || window.GemBasket.count() === 0) {
      say('studio.cart_empty', 3500);
      return;
    }
    window.GemBasket.open();
  }

  /* ---------- Udon: hops into your cart, rides along, hops back ---------- */
  // Move a stage-level element into `host`, keeping it where it is on screen.
  // host may be mirrored (character facing left), so measure, then place.
  function pinTo(el, host) {
    var r = el.getBoundingClientRect();
    el.getAnimations().forEach(function (an) { an.cancel(); });
    el.style.transform = 'none';
    host.appendChild(el);
    el.style.width = r.width + 'px';
    // Screen position is linear in left/top (slope +1, or -1 when mirrored):
    // measure twice and solve, rather than special-casing the flip.
    var at = function (L, T) { el.style.left = L + 'px'; el.style.top = T + 'px'; return el.getBoundingClientRect(); };
    var a0 = at(0, 0), a1 = at(100, 100);
    var sx = (a1.left - a0.left) / 100 || 1, sy = (a1.top - a0.top) / 100 || 1;
    at((r.left - a0.left) / sx, (r.top - a0.top) / sy);
    return { undo: function () { stage.appendChild(el); } };
  }

  var udonBusy = false;
  function udonJoke() {
    if (udonBusy) return;
    udonBusy = true;
    var done = function () { udonBusy = false; };
    say('studio.udon_no', 3600);
    // Stop where you are (Udon aims for the cart as it is now), out comes
    // the cart, then Udon hops in.
    walkTo(player.x);
    player.udon = true; render();
    var target = frameEls[player.frame];
    if (reduceMotion || !udonEl.animate || !target) {
      setTimeout(function () { player.udon = false; render(); done(); }, 2600);
      return;
    }
    var a = udonEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    var ghost = udonEl.querySelector('img').cloneNode();
    ghost.className = 'st-udon-ghost';
    // Inside the stage (overflow: hidden), not on <body>: a fixed element
    // past the screen edge made Chrome on Android zoom the whole page out.
    ghost.style.left = (a.left - sr.left) + 'px';
    ghost.style.top = (a.top - sr.top) + 'px';
    ghost.style.width = a.width + 'px';
    stage.appendChild(ghost);
    udonEl.style.visibility = 'hidden';
    // Land in the cart basket: front of the frame, just above half height.
    var sc = Math.min(1, (b.height * 0.3) / a.height);
    var dx = b.left + b.width * (player.facing > 0 ? 0.8 : 0.2) - (a.left + a.width / 2);
    var dy = b.top + b.height * 0.6 - (a.top + a.height / 2) - a.height * sc * 0.25;
    var mid = 'translate(' + dx * 0.5 + 'px,' + (Math.min(dy, 0) - 90) + 'px) scale(' + ((1 + sc) / 2).toFixed(2) + ')';
    var end = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc.toFixed(2) + ')';
    var hop = function (frames, then) {
      ghost.animate(frames, { duration: 600, easing: 'ease-in-out', fill: 'forwards' }).onfinish = then;
    };
    hop([{ transform: 'translate(0,0) scale(1)' }, { transform: mid, offset: 0.45 }, { transform: end }], function () {
      // In the cart: ride along with the character, even if they walk on.
      var pin = pinTo(ghost, bobEl);
      setTimeout(function () {
        // Back on the stage, from wherever the cart is now, home to the counter.
        var r = ghost.getBoundingClientRect(), s2 = stage.getBoundingClientRect(), h = udonEl.getBoundingClientRect();
        pin.undo();
        ghost.style.left = (h.left - s2.left) + 'px';
        ghost.style.top = (h.top - s2.top) + 'px';
        ghost.style.width = h.width + 'px';
        var from = 'translate(' + (r.left - h.left) + 'px,' + (r.top - h.top) + 'px) scale(' + (r.width / h.width).toFixed(2) + ')';
        var up = 'translate(' + ((r.left - h.left) / 2) + 'px,' + (Math.min(r.top - h.top, 0) - 90) + 'px) scale(0.8)';
        hop([{ transform: from }, { transform: up, offset: 0.55 }, { transform: 'translate(0,0) scale(1)' }], function () {
          ghost.remove();
          udonEl.style.visibility = '';
          player.udon = false; render();
          done();
        });
      }, 2400);
    });
  }

  /* ---------- Bảng lời nhắn ----------
     Visitors write, Gem approves in admin.html, then it shows here. Notes
     are other people's words: textContent only, never innerHTML. */
  var NOTE_COOLDOWN = 60 * 1000;

  function loadNotes() {
    if (!window.GemDB || !window.GemDB.notes) return Promise.resolve([]);
    return window.GemDB.notes().then(function (rows) {
      notesCache = Array.isArray(rows) ? rows : [];
      paintPins();
      return notesCache;
    }, function () { notesCache = notesCache || []; return notesCache; });
  }

  function paintPins() {
    if (!memoPins) return;
    memoPins.textContent = '';
    (notesCache || []).slice(0, 5).forEach(function (n, i) {
      var pin = document.createElement('span');
      pin.className = 'st-pin st-pin-' + i;
      memoPins.appendChild(pin);
    });
  }

  function noteCard(n) {
    var li = document.createElement('li');
    li.className = 'mb-note';
    var p = document.createElement('p');
    p.textContent = n.body;
    var who = document.createElement('span');
    who.className = 'mb-who';
    who.textContent = n.name || t('studio.memo_anon');
    li.appendChild(p);
    li.appendChild(who);
    return li;
  }

  function memoSheet() {
    openSheet(
      head('studio.memo_h', 'studio.memo_p') +
      '<div class="mb">' +
        '<form class="mb-form" novalidate>' +
          '<label>' + tr('span', 'studio.memo_write') +
            '<textarea name="body" maxlength="280" rows="3" required></textarea></label>' +
          '<span class="mb-count" aria-hidden="true">0/280</span>' +
          '<label>' + tr('span', 'studio.memo_name') +
            '<input name="name" maxlength="40" autocomplete="nickname"></label>' +
          // Honeypot: people never see it, form-filling bots do.
          '<input name="website" class="mb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<button type="submit" class="st-btn" data-i18n="studio.memo_send">' + esc(t('studio.memo_send')) + '</button>' +
          '<p class="mb-msg" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<ul class="mb-list"></ul>' +
      '</div>'
    );
    var list = sheetBody.querySelector('.mb-list');
    var paint = function (rows) {
      if (!sheetBody.contains(list)) return;
      list.textContent = '';
      if (!rows.length) {
        var e = document.createElement('li');
        e.className = 'mb-empty';
        e.textContent = t('studio.memo_empty');
        list.appendChild(e);
        return;
      }
      rows.forEach(function (n) { list.appendChild(noteCard(n)); });
    };
    if (notesCache) paint(notesCache);
    loadNotes().then(paint);
  }

  function memoSubmit(form) {
    var msg = form.querySelector('.mb-msg');
    var btn = form.querySelector('button[type="submit"]');
    var body = form.elements['body'].value.trim();
    if (form.elements['website'].value) { msg.textContent = t('studio.memo_ok'); return; }
    if (!body || body.length > 280) { msg.textContent = t('studio.memo_bad'); return; }
    var last = 0;
    try { last = +localStorage.getItem('gem-note-at') || 0; } catch (e) { /* private mode */ }
    if (Date.now() - last < NOTE_COOLDOWN) { msg.textContent = t('studio.memo_wait'); return; }
    if (!window.GemDB || !window.GemDB.postNote) { msg.textContent = t('studio.memo_fail'); return; }
    var reset = function () { btn.disabled = false; btn.textContent = t('studio.memo_send'); };
    btn.disabled = true;
    btn.textContent = t('studio.memo_sending');
    window.GemDB.postNote(body, form.elements['name'].value.trim()).then(function (res) {
      reset();
      if (res && res.ok) {
        try { localStorage.setItem('gem-note-at', String(Date.now())); } catch (e) { /* ignore */ }
        form.elements['body'].value = '';
        form.querySelector('.mb-count').textContent = '0/280';
        msg.textContent = t('studio.memo_ok');
      } else {
        msg.textContent = t(res && res.error === 'busy' ? 'studio.memo_busy'
          : res && res.error === 'bad_input' ? 'studio.memo_bad' : 'studio.memo_fail');
      }
    }, function () { reset(); msg.textContent = t('studio.memo_fail'); });
  }

  var ACTIONS = {
    door: doorSheet,
    sofa: sofaSheet,
    rail: railSheet,
    fitting: fittingSheet,
    pegboard: function () { shelfSheet('pegboard'); },
    cabinet: function () { shelfSheet('cabinet'); },
    sewing: designerSheet,
    memo: memoSheet,
    tu: tuSheet,
    counter: counter
  };

  // Open right away and let the character walk over behind the sheet.
  // (Opening only on arrival meant a second tap mid-walk cancelled the
  // first, so it took several taps to get anything open.)
  function visit(id, open) {
    var h = hotById(id);
    if (!h) return;
    walkTo(standX(h));
    if (open !== false && ACTIONS[id]) ACTIONS[id]();
  }

  // Is a tap on (or right beside) the character? Then it means "walk",
  // even when a shelf or sofa happens to be behind them.
  function nearPlayer(x, y) {
    var img = frameEls[player.frame];
    if (!img || img.hidden) return false;
    var r = img.getBoundingClientRect();
    return x > r.left - 16 && x < r.right + 16 && y > r.top - 8 && y < r.bottom + 8;
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  function bind() {
    world.addEventListener('click', function (e) {
      if (e.target.closest('.st-udon')) { udonJoke(); return; }
      var hot = e.target.closest('.st-hot');
      // A label, an object, or Enter/Space on a focused spot (detail 0):
      // open it — unless the tap lands on the character, which means walk.
      if (hot && (e.detail === 0 || e.target.closest('.st-hot-label') || !nearPlayer(e.clientX, e.clientY))) {
        visit(hot.getAttribute('data-hot'));
        return;
      }
      var rect = stage.getBoundingClientRect();
      walkTo((e.clientX - rect.left + cam) / k);
    });

    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = b.getAttribute('data-go');
        if (go === 'shelves') {
          var a = boxOf(hotById('pegboard')), c = boxOf(hotById('cabinet'));
          walkTo((a.x0 + c.x1) / 2);
        } else {
          // The places people come for open straight away.
          visit(go, go === 'sewing' || go === 'counter' || go === 'tu');
        }
      });
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.st-close') || e.target.closest('[data-close]')) {
        closeSheet();
        return;
      }
      if (sheetBody.querySelector('.pt') && designerClick(e)) return;
      if (sheetBody.querySelector('.tu') && tuClick(e)) return;
      var add = e.target.closest('[data-add]');
      if (add && window.GemBasket) {
        var card = add.closest('.st-prod');
        if (window.GemBasket.add(add.getAttribute('data-add'), card && card.querySelector('img'))) {
          add.textContent = t('studio.added');
          add.classList.add('is-added');
          setTimeout(function () {
            add.textContent = t('studio.add');
            add.classList.remove('is-added');
          }, 1100);
        }
        return;
      }
      var ch = e.target.closest('[data-char]');
      if (ch) {
        pickChar(ch.getAttribute('data-char'));
        sheetBody.querySelectorAll('[data-char]').forEach(function (b) {
          var on = b.getAttribute('data-char') === who;
          b.classList.toggle('is-picked', on);
          b.setAttribute('aria-pressed', on);
        });
        return;
      }
      var go = e.target.closest('[data-goto]');
      if (go) {
        closeSheet();
        visit(go.getAttribute('data-goto'));
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (!modal.hidden || document.body.classList.contains('gb-lock')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); walkTo(player.x + 300); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); walkTo(player.x - 300); }
    });

    // Keyboard focus on a hotspot (or Udon) brings it into view (not a tap's focus).
    world.addEventListener('focusin', function (e) {
      if (e.target.closest('.st-udon') && !player.moving) {
        var u = SCENE.udon;
        walkTo(u.x - 120);
        return;
      }
      var hot = e.target.closest('.st-hot');
      var keyboard = true;
      try { keyboard = hot && hot.matches(':focus-visible'); } catch (x) { /* old browser */ }
      if (hot && keyboard && !player.moving) walkTo(standX(hotById(hot.getAttribute('data-hot'))));
    });

    modal.addEventListener('submit', function (e) {
      var form = e.target.closest('.tu-form, .mb-form');
      if (!form) return;
      e.preventDefault();
      if (form.classList.contains('mb-form')) memoSubmit(form);
      else tuSubmit(form);
    });
    modal.addEventListener('input', function (e) {
      if (e.target.closest('.pt')) { designerInput(e); return; }
      if (e.target.name !== 'body' || !e.target.closest('.mb-form')) return;
      e.target.closest('.mb-form').querySelector('.mb-count').textContent = e.target.value.length + '/280';
    });

    document.addEventListener('gem:langchange', function () { renderDesigner(); renderTu(); });
    document.addEventListener('gem:tu', function () {
      // Another tab, or an order just went through: refresh what's open.
      if (sheetBody.querySelector('.tu')) renderTu();
    });

    document.addEventListener('gem:basket', function (e) {
      cartCount = (e.detail && e.detail.count) || 0;
      render();
    });

    bubble.addEventListener('click', function () { bubble.hidden = true; });

    window.addEventListener('resize', layout);

    // Focusing something off-screen (Tab, find-in-page) makes the browser
    // scroll the stage itself; the camera does the moving, so undo that.
    stage.addEventListener('scroll', function () {
      if (stage.scrollLeft || stage.scrollTop) { stage.scrollLeft = 0; stage.scrollTop = 0; }
    });
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    stage = document.getElementById('st-stage');
    world = document.getElementById('st-world');
    bubble = document.getElementById('st-bubble');
    bubbleText = document.getElementById('st-bubble-text');
    modal = document.getElementById('st-modal');
    sheetBody = document.getElementById('st-sheet-body');
    if (!stage || !world) return;

    build();
    bind();
    cartCount = window.GemBasket ? window.GemBasket.count() : 0;
    layout();
    loadNotes();   // pins on the memo board

    // A shared design link (studio.html?d=…): walk to the table and open it.
    var shared = null;
    try { shared = P && P.parse(new URLSearchParams(location.search).get('d') || ''); } catch (e) { /* old browser */ }
    if (shared) {
      try { sessionStorage.setItem('gem-src', 'link-chia-se'); } catch (e) { /* private mode */ }
      D.d = shared;
      try { localStorage.setItem('gem-studio-intro', '1'); } catch (e) { /* ignore */ }
      setTimeout(function () { visit('sewing'); }, 400);
      return;
    }

    var seen = false;
    try { seen = localStorage.getItem('gem-studio-intro') === '1'; } catch (e) { /* private mode */ }
    if (!seen) {
      setTimeout(function () { say('studio.intro', 7000); }, 600);
      try { localStorage.setItem('gem-studio-intro', '1'); } catch (e) { /* ignore */ }
    }
  });
})();
