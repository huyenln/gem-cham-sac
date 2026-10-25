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
  document.documentElement.classList.add('st-wait');   // until the layout is known

  /* ======================================================================
     SCENE — numbers come from tools/studio-assets.py (the STRIP line)
     ====================================================================== */
  // Strip = five painted scenes joined by tools/studio-assets.py --strip2
  // (it prints these numbers). Zone 3's cabinet is empty on purpose: the
  // real product photos stand on its shelves (DISPLAY below). Hotspot y values below are in strip pixels (the
  // tool nudges each scene up/down to line up the skirting).
  var SCENE = {
    width: 6817,
    height: 1024,
    // x = where the zone starts in the strip, cropL = first source pixel kept
    // (a wall pillar sits between zones, so they don't overlap)
    zones: [
      { x: 0,    cropL: 0 },
      { x: 1562, cropL: 480 },
      { x: 2706, cropL: 488 },
      { x: 3850, cropL: 0 },
      { x: 5477, cropL: 196 }
    ],
    feetY: 965,          // where the character's feet touch the floor
    playerH: 410,        // character height, strip pixels
    startX: 640,         // just inside the door
    speed: 900,          // strip pixels per second
    // Udon sitting on the walnut counter, right end (clear of its label)
    udon: { x: 6600, y: 448, w: 128, h: 140 }
  };

  // box = [x0, y0, x1, y1] in the zone's source image (1536 x 1024)
  // Tight boxes on the objects themselves, above the floor: the floor and
  // the band the character walks in stay free for walking. stand = where
  // the character stops (zone source px), when the middle of the box would
  // put them in front of its label.
  var HOTSPOTS = [
    { id: 'door',     zone: 1, box: [40, 85, 560, 585],     label: 'studio.hot_door' },
    { id: 'sofa',     zone: 1, box: [960, 615, 1220, 775],  label: 'studio.hot_sofa', stand: 860 },   // tea table and up
    { id: 'rail',     zone: 2, box: [520, 360, 1065, 720],  label: 'studio.hot_rail' },               // shelf + clothes rail
    { id: 'fitting',  zone: 2, box: [1095, 340, 1500, 740], label: 'studio.hot_fitting' },
    { id: 'pegboard', zone: 3, box: [495, 280, 855, 720],   label: 'studio.hot_pegboard' },
    { id: 'display',  zone: 3, box: [883, 300, 1485, 655],  label: 'studio.hot_display', stand: 870 },  // open shelves; stop beside, not in front
    { id: 'sewing',   zone: 4, box: [45, 450, 790, 590],    label: 'studio.hot_sewing', stand: 860 },  // table top only
    { id: 'tu',       zone: 4, box: [820, 385, 1180, 510],  label: 'studio.hot_tu' },                 // frames + CHẠM SẮC
    { id: 'cabinet',  zone: 5, box: [200, 260, 895, 600],   label: 'studio.hot_cabinet' },            // open shelves only
    { id: 'counter',  zone: 5, box: [1045, 570, 1425, 720], label: 'studio.hot_counter', stand: 990 },  // stop by the cart, not on the label
    { id: 'memo',     zone: 5, box: [1065, 205, 1420, 415], label: 'studio.hot_memo' }
  ];

  // The street in front of the studio (studio.html opens here; the door
  // leads in). Scene, pieces and the door box come from the owner's layout
  // (layout.outside) or GemLayout's built-in street.
  var OUT_HOT = [{ id: 'enter', label: 'studio.hot_enter' }];
  var sceneName = 'in';
  var INSIDE = null;    // the studio's own scene numbers, kept while outside

  // The cast (images/studio/char/pN-*.webp, cut by tools/studio-assets.py
  // --cast). Each has standing (front / side / three-quarter), a 4-frame
  // walk and a 3-frame cart push. ANCHOR = where the head sits across each
  // frame (from the tool's output), so frames of different widths don't jump.
  var CAST = ['p1', 'p2', 'p3', 'p4'];
  var FRAME_NAMES = ['front', 'side', 'q', 'walk1', 'walk2', 'walk3', 'walk4', 'cart1', 'cart2', 'cart3'];
  var ANCHOR = {"p1-front": 0.514, "p1-side": 0.515, "p1-q": 0.475, "p1-walk1": 0.486, "p1-walk2": 0.534, "p1-walk3": 0.5, "p1-walk4": 0.435, "p1-cart1": 0.378, "p1-cart2": 0.241, "p1-cart3": 0.301, "p2-front": 0.509, "p2-side": 0.486, "p2-q": 0.498, "p2-walk1": 0.552, "p2-walk2": 0.552, "p2-walk3": 0.522, "p2-walk4": 0.52, "p2-cart1": 0.451, "p2-cart2": 0.335, "p2-cart3": 0.391, "p3-front": 0.542, "p3-side": 0.472, "p3-q": 0.514, "p3-walk1": 0.471, "p3-walk2": 0.512, "p3-walk3": 0.463, "p3-walk4": 0.5, "p3-cart1": 0.344, "p3-cart2": 0.294, "p3-cart3": 0.268, "p4-front": 0.519, "p4-side": 0.547, "p4-q": 0.502, "p4-walk1": 0.491, "p4-walk2": 0.476, "p4-walk3": 0.463, "p4-walk4": 0.425, "p4-cart1": 0.378, "p4-cart2": 0.332, "p4-cart3": 0.347};
  var STEP_MS = 150;   // one walk / push frame

  // Where pieces sit on each frame, and how each is worn: js/wear.js (GemWear).

  function charSrc(who, name) { return 'images/studio/char/' + who + '-' + name + '.webp'; }

  var who = 'p1';
  try { if (CAST.indexOf(localStorage.getItem('gem-char')) >= 0) who = localStorage.getItem('gem-char'); } catch (e) { /* private mode */ }

  // Products standing in the empty zone-3 cabinet, one per cubby: zone source
  // x of the cubby's left/right edge, strip y of the shelf it stands on.
  // The top-right cubby is skipped (the painted dolls live there).
  var DISPLAY = [
    { sku: 'origami',  x: [883, 1073],  y: 407 },
    { sku: 'oxford',   x: [1090, 1280], y: 407 },
    { sku: 'denim',    x: [883, 1073],  y: 530 },
    { sku: 'tuibut',   x: [1090, 1280], y: 530 },
    { sku: 'biaso',    x: [1297, 1485], y: 530 },
    { sku: 'so-kraft', x: [883, 1073],  y: 650 },
    { sku: 'so-khau',  x: [1090, 1280], y: 650 },
    { sku: 'set-qua',  x: [1297, 1485], y: 650 }
  ];
  var DISPLAY_H = 100;  // frame height on the shelf, strip px

  // Products with a cut-out picture (images/studio/sp/<sku>.webp): they stand
  // on the shelf as themselves instead of a framed photo.
  var CUTOUT = { origami: 1 };

  var SHELVES = {
    pegboard: ['scrunchie', 'bookmark', 'bloom', 'daydeo'],
    display:  DISPLAY.map(function (d) { return d.sku; }),
    cabinet:  ['goi', 'tham', 'lotcoc', 'set-qua']
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

  // The fitting corner: the worn id shown in it ("<sku>", "<sku>/<mẫu>",
  // "d:<design code>"), and the mẫu each product was last tried in
  var tryOn = null, tryOpt = {};

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
    'title.studio':        { vi: `Gem Studio 2D · Gem Chạm Sắc`, en: `Gem Studio 2D · Gem Chạm Sắc` },
    'studio.list_view':    { vi: `Xem dạng danh sách`, en: `List view` },
    'studio.list_short':   { vi: `Danh sách`, en: `List` },
    'studio.nav_aria':     { vi: `Đi tới khu`, en: `Go to` },
    'studio.go_door':      { vi: `Cửa vào`, en: `Entrance` },
    'studio.go_fitting':   { vi: `Thử đồ`, en: `Fitting` },
    'studio.go_shelves':   { vi: `Kệ hàng`, en: `Shelves` },
    'studio.go_sewing':    { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.go_counter':   { vi: `Quầy`, en: `Counter` },
    'studio.go_tu':        { vi: `Tủ của bạn`, en: `Your cabinet` },
    'studio.sr_help':      { vi: `Chạm vào nhãn tên để mở từng góc, chạm chỗ khác để đi dạo. Bấm Tab để đi qua từng điểm.`, en: `Tap a name tag to open a corner, anywhere else to walk around. Press Tab to move between them.` },
    'studio.close':        { vi: `Đóng`, en: `Close` },

    'studio.hot_door':     { vi: `Chọn nhân vật`, en: `Choose character` },
    'studio.hot_sofa':     { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.hot_rail':     { vi: `Đồ 2hand`, en: `Secondhand` },
    'studio.hot_fitting':  { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.hot_pegboard': { vi: `Phụ kiện nhỏ`, en: `Little accessories` },
    'studio.hot_display':  { vi: `Túi & sổ`, en: `Bags & notebooks` },
    'studio.hot_cabinet':  { vi: `Gối, thảm & quà`, en: `Cushions, rugs & gifts` },
    'studio.hot_sewing':   { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.hot_memo':     { vi: `Bảng lời nhắn`, en: `Message board` },
    'studio.hot_tu':       { vi: `Tủ sưu tầm`, en: `Your cabinet` },
    'studio.hot_counter':  { vi: `Quầy thu ngân`, en: `Counter` },
    'studio.tag_link':     { vi: `Xem thêm`, en: `See more` },

    'studio.pick_story':   { vi: `Câu chuyện`, en: `A story` },
    'studio.pick_talk':    { vi: `Trò chuyện`, en: `Say hi` },
    'studio.pick_post':    { vi: `Bản tin`, en: `News` },
    'studio.pick_workshop': { vi: `Workshop`, en: `Workshops` },
    'studio.cart_empty':   { vi: `Xe còn trống nè, dạo thêm chút nhé.`, en: `Your cart is still empty — have another look around.` },

    'studio.add':          { vi: `Thêm vào giỏ`, en: `Add to cart` },
    'studio.added':        { vi: `Đã thêm`, en: `Added` },
    'studio.out':          { vi: `Tạm hết hàng`, en: `Out of stock` },
    'studio.all_products': { vi: `Xem tất cả trên trang Sản phẩm`, en: `See everything on the Products page` },

    'studio.display_h':    { vi: `Túi, sổ & set quà`, en: `Bags, notebooks & gift sets` },
    'studio.display_p':    { vi: `Những món đang bày trên kệ — mỗi chiếc một kiểu vải.`, en: `What's on the shelves right now — each one in its own fabrics.` },
    'studio.pegboard_h':   { vi: `Phụ kiện vải vụn`, en: `Fabric-scrap accessories` },
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
    'studio.go_out':       { vi: `Ra ngoài cửa`, en: `Step outside` },
    'studio.hot_enter':    { vi: `Vào studio`, en: `Go in` },
    'studio.hot_dantranh': { vi: `Đàn tranh`, en: `Đàn tranh zither` },
    'studio.hot_khovai':   { vi: `Kho vải`, en: `Fabric store` },
    'studio.hot_phanloai': { vi: `Phân loại rác`, en: `Sort the waste` },
    'studio.pl_load':      { vi: `Đang mở trò chơi…`, en: `Opening the game…` },
    'studio.pl_fail':      { vi: `Chưa mở được trò chơi. Bạn thử lại nhé.`, en: `The game didn't open. Please try again.` },
    'studio.welcome':      { vi: `Chào mừng bạn đến Gem Studio 2D!`, en: `Welcome to Gem Studio 2D!` },
    'studio.tip_swipe':    { vi: `Vuốt sang trái, phải để đi dạo.`, en: `Swipe left or right to walk around.` },
    'studio.tip_swipe_mouse': { vi: `Kéo chuột hoặc bấm phím ← → để đi dạo.`, en: `Drag, or press ← →, to walk around.` },
    'studio.tip_door':     { vi: `Chạm vào cửa để vào studio nhé.`, en: `Tap the door to come in.` },
    'studio.tip_door_more': { vi: `Chạm vào cửa để vào studio. Ngoài này còn có {x}.`, en: `Tap the door to come in. Out here there's also {x}.` },
    'studio.tip_x_zt':     { vi: `đàn tranh để chơi`, en: `a đàn tranh to play` },
    'studio.tip_x_pl':     { vi: `góc phân loại rác để bạn thử tài`, en: `a waste-sorting corner to test yourself` },
    'studio.tip_and':      { vi: ` và `, en: ` and ` },
    'studio.tip_inside':   { vi: `Chạm một món để xem tên, chạm lần nữa để mở.`, en: `Tap a thing to see its name, tap again to open it.` },
    'studio.tip_inside_mouse': { vi: `Rê chuột lên một món để xem tên, bấm để mở.`, en: `Point at a thing to see its name, click to open it.` },
    'studio.tip_close':    { vi: `Đóng gợi ý`, en: `Close the tip` },
    'studio.tip_skip':     { vi: `Bỏ qua hướng dẫn`, en: `Skip the tips` },
    'studio.edge_go':      { vi: `Đi tới {name}`, en: `Go to {name}` },
    'studio.help':         { vi: `Hướng dẫn`, en: `How to play` },
    'studio.help_h':       { vi: `Cách chơi`, en: `How to play` },
    'studio.help_walk':    { vi: `Vuốt sang trái, phải để đi dạo, hoặc chạm sàn để đi tới chỗ đó.`, en: `Swipe left or right to walk around, or tap the floor to go there.` },
    'studio.help_walk_mouse': { vi: `Kéo chuột hoặc bấm phím ← → để đi dạo, hoặc bấm sàn để đi tới chỗ đó.`, en: `Drag, or press ← →, to walk around, or click the floor to go there.` },
    'studio.help_tag':     { vi: `Tên`, en: `Name` },
    'studio.help_edge':    { vi: `Nhãn ở mép màn hình chỉ chỗ đang khuất; chạm vào để đi tới.`, en: `The tags at the screen's edges point to places out of view; tap one to go there.` },
    'studio.help_here':    { vi: `Ở đây có gì`, en: `What's here` },
    'studio.help_go':      { vi: `Đi tới`, en: `Go` },
    'studio.help_replay':  { vi: `Xem lại hướng dẫn từ đầu`, en: `Show the tips again` },
    'studio.zt_h':         { vi: `Đàn tranh`, en: `Đàn tranh` },
    'studio.zt_p':         { vi: `Chạm để gảy · vuốt để rải · chạm chữ nhỏ bên trái nhạn để nhấn.`, en: `Tap to pluck · sweep for a run · tap a small name left of a bridge to press.` },
    'studio.zt_names':     { vi: `Tên nốt`, en: `Note names` },
    'studio.zt_k16':       { vi: `16 dây`, en: `16 strings` },
    'studio.zt_k19':       { vi: `19 dây`, en: `19 strings` },
    'studio.zt_about':     { vi: `Về đàn tranh`, en: `About the đàn tranh` },
    'studio.zt_about_p':   { vi: `Đàn tranh truyền thống có 16 dây; đàn cải tiến có thêm dây, như loại 19 dây ở đây. Dây Bắc lên theo ngũ cung Sol La Đô Rê Mi, nên đàn không có dây đánh thẳng ra nốt Fa và Si: tay trái nhấn dây Mi ở phía trái nhạn cho lên nửa cung thành Fa, nhấn dây La lên một cung thành Si. Ở đây: chạm chữ nhỏ "Fa" / "Si" bên trái nhạn, hoặc gảy rồi giữ ngón trên dây để nghe tiếng luyến.`, en: `The traditional đàn tranh has 16 strings; improved ones add more, like the 19-string one here. In the Bắc tuning the strings play the five notes Sol La Do Re Mi, so no string plays Fa or Si directly: the left hand presses the Mi string left of its bridge half a tone up to Fa, and the La string a whole tone up to Si. Here: tap the small "Fa" / "Si" left of a bridge, or pluck and hold a string to hear it slide.` },
    'studio.zt_about_hoi': { vi: `Lên dây: dây Bắc (Sol La Đô Rê Mi) tươi sáng; dây Nam (Sol Si♭ Đô Rê Fa) buồn, dùng cho Nam Ai, Nam Xuân; dây Đảo (Sol La Đô Rê Fa). Đổi cách lên dây thì vài dây chuyển cao lên, như người chơi dời nhạn, và chữ nhỏ bên trái nhạn đổi theo nốt còn thiếu.`, en: `Tuning: Bắc (Sol La Do Re Mi) is bright; Nam (Sol Si♭ Do Re Fa) is sad, for Nam Ai and Nam Xuân; Đảo is Sol La Do Re Fa. A new tuning moves some strings up, as a player moves the bridges, and the small names left of the bridges follow the missing notes.` },
    'studio.zt_about_tone':{ vi: `Tông: nâng hoặc hạ cả cây đàn từng nửa cung cho vừa giọng hát. Tên nốt giữ nguyên, Đô vẫn là nốt chủ.`, en: `Key: moves the whole đàn up or down by half tones, to suit a voice. The note names stay; Do is still the home note.` },
    'studio.zt_about_ho':  { vi: `Hò Xự Xang: cách gọi nốt cổ truyền, tính từ Hò (= Sol): Hò Xự Xang Xê Cống là Sol La Đô Rê Mi; Xư là Si♭, Phan là Fa.`, en: `Hò Xự Xang: the old Vietnamese note names, counted from Hò (= Sol): Hò Xự Xang Xê Cống are Sol La Do Re Mi; Xư is Si♭, Phan is Fa.` },
    'studio.zt_about_keys':{ vi: `Bàn phím máy tính: A S D F G H J K L ; rồi Q W E R T Y U I O gảy từ dây trầm đến dây cao; giữ Shift để nhấn.`, en: `Computer keyboard: A S D F G H J K L ; then Q W E R T Y U I O play the strings from low to high; hold Shift to press.` },
    'studio.zt_hoi':       { vi: `Lên dây`, en: `Tuning` },
    'studio.zt_bac':       { vi: `Dây Bắc`, en: `Bắc tuning` },
    'studio.zt_nam':       { vi: `Dây Nam`, en: `Nam tuning` },
    'studio.zt_dao':       { vi: `Dây Đảo`, en: `Đảo tuning` },
    'studio.zt_tone':      { vi: `Tông`, en: `Key` },
    'studio.zt_tone_dn':   { vi: `Hạ tông`, en: `Key down` },
    'studio.zt_tone_up':   { vi: `Nâng tông`, en: `Key up` },
    'studio.zt_n_do':      { vi: `Đô Rê Mi`, en: `Do Re Mi` },
    'studio.zt_n_ho':      { vi: `Hò Xự Xang`, en: `Hò Xự Xang` },
    'studio.zt_n_off':     { vi: `Ẩn tên nốt`, en: `No names` },
    'studio.zt_run':       { vi: `Rải dây`, en: `Sweep` },
    'studio.zt_vib':       { vi: `Rung dây`, en: `Vibrato` },
    'studio.zt_mute':      { vi: `Không nghe tiếng? Xem âm lượng và chế độ im lặng của máy.`, en: `No sound? Check the volume and silent mode.` },
    'studio.zt_none':      { vi: `Trình duyệt này chưa phát được âm thanh.`, en: `This browser can't play sound.` },
    'studio.zt_string':    { vi: `Dây {n}`, en: `String {n}` },
    'studio.wear_on':      { vi: `Đeo thử`, en: `Try it on` },
    'studio.wear_off':     { vi: `Tháo ra`, en: `Take it off` },
    'studio.wear_tag':     { vi: `Đang đeo`, en: `Wearing` },
    'studio.wear_said':    { vi: `Hợp ghê! Đi một vòng xem nào.`, en: `Looks good! Take a walk.` },
    'studio.wear_note':    { vi: `Đồ đeo thử theo bạn hết lượt này. Món đã mua thì đeo lần nào cũng được.`, en: `Tried-on pieces stay with you this visit. Pieces you own, every visit.` },

    'studio.fitting_h':    { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.fitting_p':    { vi: `Chạm vào một món để xem bạn đeo thử. Món có nhiều mẫu thì chọn mẫu dưới hình. Mua rồi thì món đó nằm trong tủ của bạn.`, en: `Tap a piece to see it on you. A piece with several designs: pick one under the picture. Once it's yours, it waits in your cabinet.` },
    'studio.fitting_lock': { vi: `Mua để mặc`, en: `Buy to wear` },
    'studio.fitting_have': { vi: `Đã có`, en: `Yours` },
    'studio.fitting_mine': { vi: `Bạn thiết kế`, en: `Your design` },
    'studio.fitting_nocut': { vi: `Mẫu này chưa có ảnh để thử`, en: `No picture to try this one yet` },
    'studio.fitting_mine_h': { vi: `Món bạn tự thiết kế (đã mua)`, en: `Pieces you designed (bought)` },

    'studio.sofa_h':       { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.sofa_p':       { vi: `Ngồi chút, xem studio dạo này có gì.`, en: `Sit down for a bit and see what's on.` },
    'studio.sofa_ws':      { vi: `Workshop — tự tay làm một món`, en: `Workshops — make something yourself` },
    'studio.sofa_news':    { vi: `Bản tin — chuyện ở studio`, en: `Newsletter — studio notes` },

    'studio.sewing_h':     { vi: `Bàn thiết kế`, en: `Design table` },
    'studio.sewing_p':     { vi: `Chọn một tâm trạng, lấy vải trong rổ đắp lên từng mảnh, rồi bấm May xong.`, en: `Pick a mood, lay scraps from the basket on each patch, then hit Sew it.` },
    'studio.pt_random':    { vi: `Ngẫu nhiên`, en: `Surprise me` },
    'studio.pt_moods':     { vi: `Tâm trạng`, en: `Mood` },
    'studio.pt_basket':    { vi: `Rổ vải vụn`, en: `Scrap basket` },
    'studio.pt_rummage':   { vi: `Lục rổ`, en: `Rummage` },
    'studio.pt_own':       { vi: `Màu riêng`, en: `Own colour` },
    'studio.pt_own_h':     { vi: `Chọn màu vải bạn muốn`, en: `Pick the fabric colour you want` },
    'studio.pt_own_go':    { vi: `Nhuộm vào rổ`, en: `Dye the basket` },
    'studio.pt_own_note':  { vi: `Gem tìm vải vụn gần màu này nhất và nhắn ảnh cho bạn duyệt trước khi may.`, en: `Gem finds the scraps closest to this colour and sends you a photo to approve before sewing.` },
    'studio.pt_own_s1':    { vi: `Chọn màu bạn muốn: chấm màu có sẵn, hoặc ô chọn màu bất kỳ.`, en: `Pick the colour you want: a ready-made dot, or any colour in the picker.` },
    'studio.pt_own_s2':    { vi: `Bấm “Nhuộm vào rổ”: rổ đổi sang các mảnh vải màu đó.`, en: `Tap “Dye the basket”: the basket fills with scraps in that colour.` },
    'studio.pt_own_s3':    { vi: `Kéo mảnh lên món như bình thường.`, en: `Drag them onto the piece as usual.` },
    'studio.pt_own_close': { vi: `Đóng`, en: `Close` },
    'studio.pt_own_done':  { vi: `Rổ đã nhuộm màu bạn chọn. Kéo một mảnh lên món nhé.`, en: `The basket is dyed in your colour. Drag a scrap onto the piece.` },
    'studio.pt_help':      { vi: `Cách dùng bàn thiết kế`, en: `How the design table works` },
    'studio.pt_in_p':      { vi: `Ghép vải vụn thành món của riêng bạn. Gem may theo đúng bản bạn ghép.`, en: `Piece scraps into something of your own. Gem sews it just as you pieced it.` },
    'studio.pt_in_1h':     { vi: `Chọn món`, en: `Pick a piece` },
    'studio.pt_in_1':      { vi: `Chọn món ở hàng trên cùng, rồi chọn kiểu ghép.`, en: `Pick a piece in the top row, then how it is pieced.` },
    'studio.pt_in_2h':     { vi: `Đắp vải`, en: `Lay the fabric` },
    'studio.pt_in_2':      { vi: `Kéo một mảnh từ rổ thả lên món. Hoặc chạm mảnh vải, rồi chạm chỗ muốn đắp.`, en: `Drag a scrap from the basket onto the piece. Or tap a scrap, then tap where it goes.` },
    'studio.pt_in_3h':     { vi: `May xong`, en: `Sew it` },
    'studio.pt_in_3':      { vi: `Bấm “May xong!” để đặt tên và lấy thẻ chia sẻ. Ưng rồi thì “Đặt Gem may”.`, en: `Tap “Sew it!” to name it and get a card to share. Happy with it? “Ask Gem to sew it”.` },
    'studio.pt_in_more':   { vi: `Các nút khác là gì?`, en: `What do the other buttons do?` },
    'studio.pt_in_go':     { vi: `Bắt đầu thiết kế`, en: `Start designing` },
    'studio.pt_hb_rummage': { vi: `đổi sang 8 mảnh vải khác.`, en: `swaps in 8 other scraps.` },
    'studio.pt_hb_own':    { vi: `chọn một màu để nhuộm cả rổ. Gem tìm vải thật gần màu nhất và nhắn ảnh cho bạn duyệt trước khi may.`, en: `pick a colour to dye the whole basket. Gem finds the real fabric closest to it and sends you a photo to approve before sewing.` },
    'studio.pt_hb_kho':    { vi: `xem hết vải thật Gem đang có và 27 màu cơ bản, chọn tối đa 8 cho vào rổ.`, en: `see all the real fabric Gem has and 27 basic colours, and put up to 8 of them in the basket.` },
    'studio.pt_hb_tones_t': { vi: `Hàng tông màu`, en: `Colour chips` },
    'studio.pt_hb_tones':  { vi: `(Tất cả, Xanh lá…) rổ chỉ còn vải tông đó.`, en: `(All, Green…) the basket keeps only fabrics of that colour.` },
    'studio.pt_hb_turn':   { vi: `chạm một ô trên món, rồi bấm để đổi hướng vải trong ô đó.`, en: `tap a patch on the piece, then tap this to turn its fabric.` },
    'studio.pt_hb_layout': { vi: `món được chia thành các ô thế nào. “Xáo mảnh” thử một cách phối khác (2–3 vải cùng bộ), “Ngẫu nhiên” để Gem ghép giúp.`, en: `how the piece is split into patches. “Shuffle” tries another pairing (two or three fabrics of the set), “Surprise me” lets Gem piece it for you.` },
    'studio.pt_hb_moods':  { vi: `bộ màu gợi ý sẵn (màu cơ bản + vải hoa văn Gem có). Chạm là Gem phối 2–3 vải của bộ lên món; muốn thêm vải thì kéo từ rổ. “Tâm trạng ngẫu nhiên”: mỗi lần chạm một bộ khác.`, en: `ready palettes (basic colours + prints Gem has). One tap and Gem pairs two or three of its fabrics on the piece; drag more from the basket if you like. “Surprise mood”: another palette each tap.` },
    'studio.pt_hb_opts':   { vi: `cỡ món; túi có thêm chần bông, túi trong, khoá kéo, nút bấm; dây đeo có thêu chỉ giữa dây.`, en: `the size; bags can be quilted and get pockets, a zip or a snap; the strap can get a stitch down the middle.` },
    'studio.pt_hb_price_t': { vi: `Giá`, en: `Price` },
    'studio.pt_hb_price':  { vi: `ở thanh dưới cùng, tự tính lại theo kiểu ghép, số vải và tuỳ chọn.`, en: `at the bottom, worked out again from the piecing, the number of fabrics and the options.` },
    'studio.pt_shape':     { vi: `Dáng`, en: `Shape` },
    'studio.pt_opts':      { vi: `Cỡ & tuỳ chọn`, en: `Size & options` },
    'studio.pt_size_own':  { vi: `Cỡ riêng`, en: `My own size` },
    'studio.pt_size_w':    { vi: `Rộng (cm)`, en: `Width (cm)` },
    'studio.pt_size_hh':   { vi: `Cao (cm)`, en: `Height (cm)` },
    'studio.pt_size_q':    { vi: `Cỡ riêng: Gem xem rồi báo giá cho bạn khi nhắn lại.`, en: `Your own size: Gem looks and tells you the price when we reply.` },
    'studio.pt_quilt':     { vi: `Chần bông`, en: `Quilted` },
    'studio.pt_pockets':   { vi: `Túi trong`, en: `Inside pockets` },
    'studio.pt_pocket_in': { vi: `1 túi có sẵn`, en: `1 included` },
    'studio.pt_pocket_add':{ vi: `Thêm túi trong`, en: `Add a pocket` },
    'studio.pt_pocket_rm': { vi: `Bớt túi trong`, en: `One pocket fewer` },
    'studio.pt_zip':       { vi: `Thêm khoá kéo`, en: `Add a zip` },
    'studio.pt_zip_in':    { vi: `Khoá kéo có sẵn`, en: `Zip included` },
    'studio.pt_snap':      { vi: `Thêm nút bấm`, en: `Add a snap` },
    'studio.pt_ties':      { vi: `Kiểu buộc vai`, en: `Shoulder tie` },
    'studio.pt_emb_kind':  { vi: `Mẫu thêu`, en: `Stitch` },
    'studio.pt_emb_thread': { vi: `Màu chỉ`, en: `Thread` },
    'studio.pt_mats':      { vi: `Chất liệu bạn thấy ổn`, en: `Fabrics you're happy with` },
    'studio.pt_mats_gem':  { vi: `Để Gem chọn`, en: `Let Gem choose` },
    'studio.pt_from':      { vi: `từ`, en: `from` },
    'studio.pt_base':      { vi: `Giá nền`, en: `Base` },
    'studio.pt_round':     { vi: `Tròn`, en: `Round` },
    'studio.pt_square':    { vi: `Vuông`, en: `Square` },
    'studio.pt_shuffle':   { vi: `Xáo mảnh`, en: `Shuffle` },
    'studio.pt_hint':      { vi: `Chạm một mảnh vải trong rổ rồi chạm vào ô trên món, hoặc kéo thả vào ô.`, en: `Tap a scrap in the basket, then tap a patch. Or drag it there.` },
    'studio.pt_hint_held': { vi: `Giờ chạm vào ô muốn đắp mảnh {vai} lên. Chạm lại mảnh trong rổ để bỏ xuống.`, en: `Now tap the patch you want the {vai} on. Tap the scrap again to put it down.` },
    'studio.pt_hint_sel':  { vi: `Ô đang chọn: {vai}. Bấm "Xoay vải" để xoay vải ô này; chạm lại ô hoặc chạm ra ngoài để bỏ chọn.`, en: `Picked patch: {vai}. Press "Turn fabric" to turn it; tap it again, or anywhere else, to let go.` },
    'studio.pt_vai_gem':   { vi: `vải Gem chọn`, en: `a fabric Gem picks` },
    'studio.pt_turn':      { vi: `Xoay vải`, en: `Turn fabric` },
    'studio.pt_turned':    { vi: `Vải ô này xoay {deg}° — bấm "Xoay vải" lần nữa để xoay tiếp.`, en: `This patch's fabric is turned {deg}° — press "Turn fabric" again to turn it on.` },
    'studio.pt_turned0':   { vi: `Vải ô này về lại thẳng.`, en: `This patch's fabric is straight again.` },
    'studio.pt_vt_all':    { vi: `Tất cả`, en: `All` },
    'studio.pt_kho':       { vi: `Kho vải`, en: `All fabrics` },
    'studio.kho_h':        { vi: `Kho vải của Gem`, en: `Gem's fabric store` },
    'studio.kho_p':        { vi: `Vải vụn thật đang có ở Gem, và các màu cơ bản. Chọn tối đa 8 cho rổ của bạn, rồi ghép thử lên món.`, en: `The real scraps Gem has right now, and the basic colours. Pick up to 8 for your basket, then try them on a piece.` },
    'studio.kho_basic':    { vi: `Màu cơ bản`, en: `Basic colours` },
    'studio.kho_basic_p':  { vi: `Vải trơn theo màu, không theo chất liệu: Gem tư vấn và chọn chất vải cùng bạn.`, en: `Plain fabric by colour, any material: Gem helps you choose the cloth.` },
    'studio.kho_n':        { vi: `Đã chọn {n}/8`, en: `{n} of 8 picked` },
    'studio.kho_full':     { vi: `Rổ đầy 8 tấm rồi, bỏ bớt một tấm nhé.`, en: `The basket holds 8. Take one out first.` },
    'studio.kho_go':       { vi: `Ghép thử`, en: `Try them on` },
    'studio.kho_clear':    { vi: `Bỏ chọn`, en: `Clear` },
    'studio.kho_back':     { vi: `‹ Về bàn thiết kế`, en: `‹ Back to the table` },
    'studio.pt_vt_label':  { vi: `Lọc vải theo tông màu`, en: `Filter the fabrics by colour` },
    'studio.pt_onpiece':   { vi: `Vải trên món:`, en: `On the piece:` },
    'studio.pt_onpiece_p': { vi: `— đúng các tấm Gem đang có (vải kẻ, caro được vẽ lại cho thẳng).`, en: `— the very fabrics Gem has (checks and stripes drawn again, straight).` },
    'studio.pt_onpiece_b': { vi: `— vải hoa văn là đúng các tấm Gem đang có; màu cơ bản thì Gem tư vấn và chọn chất vải cùng bạn.`, en: `— the prints are the very fabrics Gem has; for the basic colours Gem helps you choose the cloth.` },
    'studio.pt_onpiece_c': { vi: `— màu cơ bản: Gem tư vấn và chọn chất vải cùng bạn.`, en: `— basic colours: Gem helps you choose the cloth.` },
    'studio.pt_hint_draw': { vi: `Kiểu "theo hình mình vẽ": vẽ trong mục Tự chỉnh bên dưới.`, en: `"From my drawing": draw it under Fine-tune below.` },
    'studio.pt_sew':       { vi: `May xong!`, en: `Sew it!` },
    'studio.pt_letter':    { vi: `Tờ nhắn gửi Gem`, en: `A note to Gem` },
    'studio.pt_letter_p':  { vi: `Không bắt buộc: chất vải, lời nhắn, ảnh tham khảo`, en: `Optional: fabrics, a message, a reference photo` },
    'studio.pt_real_cap':  { vi: `Đồ thật`, en: `The real one` },
    'studio.pt_onefab':    { vi: `Một vải nên không tính phí kiểu ghép`, en: `One fabric, so no piecing fee` },
    'studio.pt_net_q':     { vi: `Nét vẽ phức tạp (hơn 6 đường): Gem xem có may được không rồi báo giá công khi nhắn lại.`, en: `A detailed drawing (more than 6 lines): Gem checks it can be sewn, then quotes the work when we reply.` },
    'studio.pt_mood_gem':  { vi: `Gem chọn giúp`, en: `Gem picks` },
    'studio.pt_mood_mix':  { vi: `Tâm trạng ngẫu nhiên`, en: `Surprise mood` },
    'studio.pt_mood_mix_on': { vi: `Ngẫu nhiên: {m}`, en: `Surprise: {m}` },
    'studio.pt_net_on':    { vi: `Vẽ đường cắt lên món: nét khép kín, hoặc chạy từ mép này sang mép kia. Lấy một mảnh vải trong rổ rồi chạm vào từng mảnh để đắp.`, en: `Draw cut lines on the piece: a closed shape, or edge to edge. Take a scrap from the basket, then tap each piece to lay it on.` },
    'studio.pt_net_full':  { vi: `Nhiều mảnh quá, Gem gộp bớt mảnh nhỏ (tối đa {n} mảnh).`, en: `That's a lot of pieces — Gem merges the small ones (up to {n}).` },
    'studio.pt_draw_on':   { vi: `Vẽ thẳng lên món bằng ngón tay. Chạm một mảnh trong rổ để đổi vải nền.`, en: `Draw right on the piece with your finger. Tap a scrap in the basket to change the fabric under it.` },
    'studio.pt_title_label': { vi: `Tên mẫu`, en: `Design name` },
    'studio.pt_title_hint': { vi: `Chạm vào tên để đặt tên riêng cho mẫu.`, en: `Tap the name to give it your own.` },
    'studio.pt_sewing':    { vi: `Đang may...`, en: `Sewing...` },
    'studio.pt_serial':    { vi: `Mẫu #{n}`, en: `Design #{n}` },
    'studio.pt_by_label':  { vi: `Tên bạn trên thẻ`, en: `Your name on the card` },
    'studio.pt_by_ph':     { vi: `vd: Linh`, en: `e.g. Linh` },
    'studio.pt_by':        { vi: `thiết kế bởi {by}`, en: `designed by {by}` },
    'studio.pt_share_img': { vi: `Chia sẻ ảnh`, en: `Share the picture` },
    'studio.pt_card_wait': { vi: `Đang làm thẻ...`, en: `Making the card...` },
    'studio.pt_done_say':  { vi: `May xong rồi! Đẹp ghê, khoe bạn bè đi nè.`, en: `All sewn! It's lovely — show your friends.` },
    'studio.pt_shared_by': { vi: `{by} đã thiết kế mẫu này`, en: `{by} designed this` },
    'studio.pt_shared_anon': { vi: `Một bạn đã thiết kế mẫu này`, en: `Someone designed this` },
    'studio.pt_shared_order': { vi: `Đặt may giống vậy`, en: `Get one sewn like this` },
    'studio.pt_shared_mine': { vi: `Tự làm bản của bạn`, en: `Make your own` },
    'studio.pt_card_foot': { vi: `Tự thiết kế ở Gem Studio · gemchamsac.com/studio`, en: `Designed at Gem Studio · gemchamsac.com/studio` },
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
    'studio.pt_note':      { vi: `Vải vụn thật sẽ gần giống chứ không giống hệt bản vẽ. Gem nhắn ảnh vải cho bạn duyệt trước khi may.`, en: `The real scraps will be close to the drawing, not identical. Gem sends you a photo of the fabrics before sewing.` },
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
    'studio.pt_photo':      { vi: `Ảnh tham khảo`, en: `Reference photo` },
    'studio.pt_photo_p':    { vi: `Ảnh vải bạn thích, một món muốn may giống, hay bản vẽ trên giấy. Chỉ Gem xem được ảnh này.`, en: `A fabric you like, a piece you'd like copied, or a drawing on paper. Only Gem can see it.` },
    'studio.pt_photo_add':  { vi: `Tải ảnh lên`, en: `Upload a photo` },
    'studio.pt_photo_del':  { vi: `Bỏ ảnh`, en: `Remove` },
    'studio.pt_photo_on':   { vi: `Ảnh đã gửi kèm thiết kế.`, en: `Photo attached to the design.` },
    'studio.pt_photo_hidden': { vi: `Thiết kế này có ảnh tham khảo (chỉ Gem xem được).`, en: `This design has a reference photo (only Gem can see it).` },
    'studio.pt_photo_wait': { vi: `Đang gửi ảnh...`, en: `Sending the photo...` },
    'studio.pt_photo_bad':  { vi: `Chọn một file ảnh nhé.`, en: `Please pick an image file.` },
    'studio.pt_photo_fail': { vi: `Chưa gửi được ảnh. Thử lại, hoặc gửi ảnh cho Gem qua Zalo sau khi đặt.`, en: `Couldn't send the photo. Try again, or send it to Gem on Zalo after ordering.` },
    'studio.prod_tip':      { vi: `Mẹo: kéo thẳng món trên kệ thả vào xe đẩy hay giỏ hàng cũng được.`, en: `Tip: you can also drag a piece off the shelf into the cart or the basket.` },
    'studio.prod_in_cart':  { vi: `Đã bỏ vào giỏ rồi nha!`, en: `In the basket!` },
    'studio.prod_in_basket': { vi: `Đã bỏ vào giỏ rồi nha!`, en: `In the basket!` },
    'studio.story_udon':    { vi: `Để Udon kể bạn nghe nhé.`, en: `Let Udon tell you about it.` },
    'studio.story_drop':    { vi: `Thả vào đây, Udon kể bạn nghe.`, en: `Drop it here and Udon will tell you about it.` },
    'studio.story_more':    { vi: `Đọc thêm`, en: `Read more` },
    'studio.board_ws':      { vi: `Workshop sắp tới`, en: `Next workshop` },
    'studio.board_post':    { vi: `Bản tin mới`, en: `Latest news` },
    'studio.board_none_ws': { vi: `Lịch workshop sắp có`, en: `New workshops soon` },
    'studio.board_none_post': { vi: `Bản tin của Gem`, en: `Gem's news` },
    'studio.motion':        { vi: `Hiệu ứng`, en: `Motion` },
    'studio.motion_tip':    { vi: `Bật / tắt nhân vật bước đi và các hiệu ứng chuyển động`, en: `Turn walking and other motion on / off` },
    'studio.motion_on':     { vi: `Đã bật hiệu ứng — nhân vật sẽ bước đi.`, en: `Motion on — your character walks.` },
    'studio.motion_off':    { vi: `Đã tắt hiệu ứng — nhân vật tới thẳng chỗ bạn chạm.`, en: `Motion off — your character just appears where you tap.` },
    'studio.motion_calm':   { vi: `Máy bạn đang bật "giảm chuyển động" nên nhân vật không bước. Muốn xem đi lại thì bấm "Hiệu ứng" ở trên nhé.`, en: `Your device asks for less motion, so your character doesn't walk. Tap "Motion" at the top to turn it on.` },
    'studio.prod_out':      { vi: `Món này đang tạm hết, bạn ghé lại sau nhé.`, en: `This one's sold out for now — check back soon.` },
    'studio.pt_extra':     { vi: `Tự chỉnh: tông màu, họa tiết, chất vải, tự vẽ, ảnh, lời nhắn`, en: `Fine-tune: colours, prints, fabrics, a drawing, a photo, a note` },
    'studio.pt_size':      { vi: `Cỡ nét`, en: `Brush size` },
    'studio.pt_eraser':    { vi: `Tẩy`, en: `Eraser` },
    'studio.pt_share':     { vi: `Chia sẻ thiết kế`, en: `Share the design` },
    'studio.pt_share_title': { vi: `Thiết kế của mình ở Gem Studio`, en: `My design at Gem Studio` },
    'studio.gv_see':       { vi: `Xem món này`, en: `See it` },
    'studio.gv_ref':       { vi: `Muốn một {mon} theo ý bạn? Chọn kiểu, tông, họa tiết bên dưới, Gem may theo mẫu này nha.`, en: `Want a {mon} your way? Pick the layout, colours and prints below and Gem sews it after this one.` },
    'studio.prod_design':  { vi: `Tự thiết kế theo mẫu này`, en: `Design one like this` },
    'studio.shop_h':       { vi: `Kệ hàng`, en: `Shelves` },
    'studio.shop_all':     { vi: `Tất cả`, en: `Everything` },
    'studio.shop_pegboard': { vi: `Phụ kiện`, en: `Accessories` },
    'studio.shop_display': { vi: `Túi & sổ`, en: `Bags & notebooks` },
    'studio.shop_cabinet': { vi: `Gối & quà`, en: `Cushions & gifts` },
    'studio.gv_hi':        { vi: `Đây là {mon} thật Gem đã may nè. Bản vẽ chỉ là phác thôi, mỗi cái một kiểu nha!`, en: `Here's a real {mon} Gem has sewn. The drawing is just a sketch — every piece turns out its own way!` },
    'studio.gv_this':      { vi: `{mon} thật trông thế này nè.`, en: `This is what a real {mon} looks like.` },
    'studio.gv_other':     { vi: `Thêm một món chắp vải thật của Gem: {mon}.`, en: `Another real patchwork piece by Gem: {mon}.` },
    'studio.gv_like':      { vi: `Tông này hợp {mon} có sẵn đó, xem thử không?`, en: `These colours match the ready-made {mon} — have a look?` },
    'studio.gv_next':      { vi: `Xem ảnh món thật khác`, en: `Show another real piece` },
    'studio.udon_cart':    { vi: `Udon không bán đâu nha! Cho Udon đi ké một vòng thôi.`, en: `Udon's not for sale! Just a little ride, then.` },
    'studio.udon_basket':  { vi: `Ơ kìa, Udon vào giỏ rồi! Udon không bán đâu, nằm chút thôi nha.`, en: `Oh! Udon's in the basket. Not for sale — just a quick nap.` },
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

  // Motion follows the device's "reduce motion" setting, unless the visitor
  // chose with the "Hiệu ứng" button (localStorage gem-motion: on / off).
  // With it off the character doesn't walk: it is simply there.
  var systemCalm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var reduceMotion = systemCalm;
  try {
    var mp = localStorage.getItem('gem-motion');
    if (mp === 'on') reduceMotion = false;
    if (mp === 'off') reduceMotion = true;
  } catch (e) { /* private mode */ }

  function syncMotion() {
    document.documentElement.classList.toggle('st-calm', reduceMotion);
    var b = document.querySelector('.st-motion');
    if (b) b.setAttribute('aria-pressed', String(!reduceMotion));
  }

  syncMotion();   // before anything animates (the button itself comes later)

  function bindMotion() {
    syncMotion();
    var b = document.querySelector('.st-motion');
    if (!b) return;
    b.addEventListener('click', function () {
      reduceMotion = !reduceMotion;
      try { localStorage.setItem('gem-motion', reduceMotion ? 'off' : 'on'); } catch (e) { /* private mode */ }
      syncMotion();
      say(reduceMotion ? 'studio.motion_off' : 'studio.motion_on', 3000);
    });
    // The device asks for less motion and nobody chose yet: say why the
    // character doesn't walk, once.
    var told = false;
    try { told = !!localStorage.getItem('gem-motion') || localStorage.getItem('gem-motion-told') === '1'; } catch (e) { told = true; }
    if (systemCalm && !told) {
      setTimeout(function () { say('studio.motion_calm', 7000); }, 2500);
      try { localStorage.setItem('gem-motion-told', '1'); } catch (e) { /* ignore */ }
    }
  }

  /* ======================================================================
     GEOMETRY
     ====================================================================== */
  function zoneX(zone, x) {
    var z = SCENE.zones[zone - 1];
    return z.x + (x - z.cropL);
  }

  function boxOf(h) {
    if (h.abs) return { x0: h.abs[0], y0: h.abs[1], x1: h.abs[2], y1: h.abs[3] };
    return {
      x0: zoneX(h.zone, h.box[0]), y0: h.box[1],
      x1: zoneX(h.zone, h.box[2]), y1: h.box[3]
    };
  }

  function hotById(id) {
    var list = (sceneName === 'out' ? OUT_HOT : HOTSPOTS).concat(OWN_HOT);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // The owner's own tap boxes (layout boxes, id 'k-…'): drawn like the
  // built-in ones; their settings (name, act, link) live on the box itself.
  var OWN_HOT = [];
  function addOwnBoxes(boxes) {
    (boxes || []).forEach(function (o) {
      var h = { id: o.id, label: '', abs: o.box, standAbs: o.stand, own: o };
      OWN_HOT.push(h);
      addHot(h);
    });
  }

  function standX(h) {
    var b = boxOf(h);
    return standNear(h.standAbs != null ? h.standAbs : h.stand != null ? zoneX(h.zone, h.stand) : null, b.x0, b.x1);
  }

  // The editor lets a stop point be dragged anywhere. One left far from its
  // box is taken as a slip (a box moved without its stop): the character
  // stops at the middle of the box instead of walking off behind the sheet.
  function standNear(s, x0, x1) {
    var far = Math.max(x1 - x0, 400);
    return s == null || s < x0 - far || s > x1 + far ? (x0 + x1) / 2 : s;
  }

  function pct(v, of) { return (v / of * 100).toFixed(3) + '%'; }

  /* ======================================================================
     STATE + DOM
     ====================================================================== */
  var udonEl, memoPins, notesCache = null;
  var UDON_POSES = ['ud-ngoi-a', 'ud-ngoi-b', 'ud-vay', 'ud-ngu'];
  var UDON_SLEEP_MS = 25000;
  var lastTouch = Date.now();

  function udonPose(p) {
    if (!udonEl) return;
    udonEl.querySelectorAll('img').forEach(function (im) { im.hidden = im.getAttribute('data-pose') !== p; });
    udonEl.classList.toggle('is-asleep', p === 'ud-ngu');
  }

  // Which pose now: asleep after a quiet spell, waving when you're near,
  // otherwise sitting and wagging (two frames).
  function udonTick() {
    if (!udonEl || udonBusy) return;
    if (Date.now() - lastTouch > UDON_SLEEP_MS) return udonPose('ud-ngu');
    if (Math.abs(player.x - SCENE.udon.x) < 420) return udonPose('ud-vay');
    if (reduceMotion) return udonPose('ud-ngoi-a');
    udonPose(Math.floor(Date.now() / 650) % 2 ? 'ud-ngoi-b' : 'ud-ngoi-a');
  }
  var stage, world, playerEl, bobEl, frameEls = {}, bubble, bubbleText, modal, sheetBody, sheetEl;
  var k = 1;           // screen px per strip px
  var cam = 0;
  var player = { x: SCENE.startX, facing: 1, moving: false, moved: false, frame: 'front' };
  var walkToken = 0;
  var cartCount = 0;
  var lastFocus = null;

  /* ---------- owner's layout (admin.html → studio_layout table) ----------
     When one is published, the scene is the empty-wall strip with the
     owner's pieces on it; otherwise the painted strip above, unchanged. */
  var LAYOUT = null;

  // The published layout. It used to be given up on after 2.5 s: on a slow
  // phone connection (right after an update, when every file loads again)
  // the built-in scene came up and stayed, as if the owner's layout were
  // gone. Now: the last layout this browser saw is kept (gem-layout) and
  // shown at once; the database is still asked, and what it answers — even
  // late — replaces the scene if it differs (lateLayout). With nothing kept,
  // the wait is up to 8 s.
  var LAYOUT_KEY = 'gem-layout';
  var layoutRaw = null;   // the JSON the scene was built from
  var pendingLayout = null;   // came in while a sheet was open: built once it closes

  function loadLayout() {
    if (!window.GemLayout || !window.GemDB || !window.GemDB.studioLayout) return Promise.resolve(null);
    var draft = false;
    try { draft = new URLSearchParams(location.search).get('nhap') === '1' && window.GemDB.isSignedIn(); } catch (e) { /* old browser */ }
    var kept = null;
    if (!draft) {
      try { kept = localStorage.getItem(LAYOUT_KEY); } catch (e) { /* private mode */ }
    }
    var keptL = null;
    if (kept) {
      try { keptL = window.GemLayout.sanitize(JSON.parse(kept)); } catch (e) { keptL = null; }
      if (keptL) layoutRaw = kept;
    }
    var get = window.GemDB.studioLayout(draft ? 'draft' : 'live').then(function (data) {
      if (!data) return null;
      var raw = JSON.stringify(data), L = window.GemLayout.sanitize(data);
      if (L && !draft) { try { localStorage.setItem(LAYOUT_KEY, raw); } catch (e) { /* full / private */ } }
      return L ? { L: L, raw: raw } : null;
    }, function () { return null; });
    if (keptL) {
      // the kept one now; a newer one when it comes
      get.then(function (r) { if (r && r.raw !== layoutRaw) lateLayout(r.L, r.raw); });
      return Promise.resolve(keptL);
    }
    var late = new Promise(function (res) { setTimeout(function () { res('late'); }, 8000); });
    return Promise.race([get, late]).then(function (r) {
      if (r === 'late') {
        get.then(function (g) { if (g) lateLayout(g.L, g.raw); });   // the built-in scene until it comes
        return null;
      }
      if (r) layoutRaw = r.raw;
      return r ? r.L : null;
    });
  }

  // A layout that came after the scene was built: build the scene again
  // with it, where the visitor is (studio or street). Not under an open sheet.
  function lateLayout(L, raw) {
    if (!L || !started) return;
    if (!modal.hidden) { pendingLayout = { L: L, raw: raw }; return; }
    layoutRaw = raw;
    applyLayout(L);
    INSIDE = { width: SCENE.width, height: SCENE.height, startX: SCENE.startX, bg: L.bg.src };
    shareCuts();
    setScene(sceneName);
  }

  function applyLayout(L) {
    LAYOUT = L;
    SCENE.width = L.bg.w;
    SCENE.height = L.bg.h;
    SCENE.udon = L.udon;
    SCENE.startX = player.x = L.start;
    paintBg(L.bg);
    HOTSPOTS.forEach(function (h) {
      var o = L.hot[h.id];
      if (o) { h.abs = o.box; h.standAbs = o.stand; }
    });
    // "Khu vực" pieces' pictures (where to stop, where the notes go) are
    // read when the studio is built, or a little after the street shows
    // (insideSoon), not while the street's own pictures are loading
  }

  // On the street, once its pictures had a head start: the studio's wall and
  // its "Khu vực" pictures, so going in is quick.
  function insideSoon() {
    setTimeout(function () {
      if (sceneName !== 'out') return;
      new Image().src = INSIDE.bg;
      if (LAYOUT) LAYOUT.items.forEach(function (it) { if (it.kind === 'zone') alphaOf(it.src); });
    }, 2500);
  }

  /* ---------- pictures far along the strip wait ----------
     A phone shows about a twelfth of the studio, and all 90-odd pictures at
     once made the first ones take seconds (Anna: "bật lên mất hơn 10s mới
     load hết"). The ones in view and a screen and a half either side load
     first (wake, on every move); the rest follow a few at a time, nearest
     first. Our bucket's pictures go with CORS like alphaOf's copy, so the
     two are one download. */
  var LAZY = [], lazyTimer = null, lazyBusy = 0;
  var BUCKET = /^https:\/\/dxdovvqsfjeizsoprrfn\.supabase\.co\/storage\//;
  function lazyAdd(img, it, el) {
    img.setAttribute('data-src', it.src);
    LAZY.push({ img: img, el: el, x0: it.x - it.w / 2, x1: it.x + it.w / 2,
      alpha: !!(it.sku || (it.kind && it.kind !== 'product')) });
  }
  function lazyLoad(e) {
    var src = e.img.getAttribute('data-src');
    if (BUCKET.test(src)) {
      e.img.crossOrigin = 'anonymous';
      // no CORS after all: shown anyway, without it (taps then go by its box)
      e.img.addEventListener('error', function () {
        if (e.img.hasAttribute('crossorigin')) { e.img.removeAttribute('crossorigin'); e.img.src = src; }
      }, { once: true });
    }
    lazyBusy++;
    var done = function () { lazyBusy = Math.max(0, lazyBusy - 1); };
    e.img.addEventListener('load', done, { once: true });
    e.img.addEventListener('error', done, { once: true });
    e.img.src = src;
    e.img.removeAttribute('data-src');
    if (e.alpha) prepAlpha(e.el);
  }
  function wake(viewW) {
    if (!LAZY.length || !k) return;
    var span = viewW / k, x0 = cam / k - span * 1.5, x1 = (cam + viewW) / k + span * 1.5;
    LAZY = LAZY.filter(function (e) {
      if (e.x1 < x0 || e.x0 > x1) return true;
      lazyLoad(e);
      return false;
    });
    if (LAZY.length && !lazyTimer) lazyTimer = setTimeout(trickle, 2500);
  }
  function trickle() {
    lazyTimer = null;
    if (!LAZY.length) return;
    // a slow line: the ones on their way first (those in view among them)
    if (lazyBusy > 2) { lazyTimer = setTimeout(trickle, 400); return; }
    var mid = (cam + stage.clientWidth / 2) / k;
    LAZY.sort(function (a, b) { return Math.abs(a.x0 + a.x1 - 2 * mid) - Math.abs(b.x0 + b.x1 - 2 * mid); });
    LAZY.splice(0, 6).forEach(lazyLoad);
    if (LAZY.length) lazyTimer = setTimeout(trickle, 400);
  }

  function buildItems(items) {
    items.forEach(function (it) {
      if (window.GemLayout && !window.GemLayout.shownOn(it)) return;   // not today (owner's dates)
      var el = document.createElement(it.frame ? 'span' : 'img');
      var img = el;
      if (it.frame) {
        img = document.createElement('img');
        el.appendChild(img);
        el.className = 'st-item st-shelf-item';
      } else {
        el.className = 'st-item';
      }
      if (it.layer === 'front') el.classList.add('is-front');
      if (it.sku) { el.classList.add('st-shelf-prod'); el.setAttribute('data-sku', it.sku); }
      lazyAdd(img, it, el);   // its picture comes when it is near (wake)
      img.alt = '';
      img.draggable = false;
      el.style.left = pct(it.x - it.w / 2, SCENE.width);
      el.style.top = pct(it.y - it.h / 2, SCENE.height);
      el.style.width = pct(it.w, SCENE.width);
      el.style.height = pct(it.h, SCENE.height);
      el.style.transform = 'rotate(' + it.rot + 'deg)' + (it.flip ? ' scaleX(-1)' : '');
      world.appendChild(el);
      if (it.kind && it.kind !== 'product') thing(el, it);
    });
    groupTags(items);
  }

  /* ---------- pieces that do something (the owner's "Loại") ----------
     story: tap for its card, drag onto Udon and Udon tells it · zone: one of
     the studio's actions, the character walks over · talk: a bubble, a new
     line each tap · board: the next workshop / latest post written on it.
     Stories and lines come from studio_info (by picture), see INFO. */
  var THINGS = [];

  /* ---------- taps go by the picture, not its box ----------
     A piece's box takes in its see-through margins (a sofa's box covers the
     wall beside it). A tap there belongs to whatever is behind: the next
     piece, a hotspot box, or the wall (walk). ALPHA keeps a small copy of
     each picture's transparency, read once. */
  var ALPHA = {};
  function alphaOf(src) {
    if (ALPHA[src]) return ALPHA[src];
    ALPHA[src] = 'wait';
    var im = new Image();
    if (/^https?:/.test(src)) im.crossOrigin = 'anonymous';   // our bucket sends CORS; else the canvas can't be read
    im.onload = function () {
      try {
        var sc = Math.min(1, 160 / Math.max(im.naturalWidth, im.naturalHeight));
        var w = Math.max(1, Math.round(im.naturalWidth * sc)), h = Math.max(1, Math.round(im.naturalHeight * sc));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var g = c.getContext('2d');
        g.drawImage(im, 0, 0, w, h);
        var px = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
        var x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (var i = 0; i < a.length; i++) {
          a[i] = px[i * 4 + 3];
          if (a[i] > 40) {
            var x = i % w, y = (i - x) / w;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        // box: where the picture sits in its image (fractions), see-through margins left out
        ALPHA[src] = { w: w, h: h, a: a, box: x1 < 0 ? [0, 0, 1, 1] : [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h] };
        if (src === memoSrc) placePins();   // the memo board's picture is known now
        retag(src);                         // so is where the tags of its pieces go
      } catch (e) { ALPHA[src] = 'solid'; }   // can't read it: the whole box counts
    };
    im.onerror = function () { ALPHA[src] = 'solid'; };
    im.src = src;
    return 'wait';
  }

  // Is the picture of el solid at screen point (x, y)? Unknown -> yes.
  function solidAt(el, x, y) {
    if (el.tagName !== 'IMG') return true;            // a framed photo: solid all over
    if (!el.getAttribute('src')) return false;        // its picture not fetched yet (LAZY): nothing to hit
    var m = alphaOf(el.getAttribute('src'));
    if (typeof m === 'string') return true;
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return true;
    var r = el.getBoundingClientRect();
    var p = { x: x - (r.left + r.width / 2), y: y - (r.top + r.height / 2) };
    try {
      var tf = getComputedStyle(el).transform;   // rotate / flip about the centre
      if (tf && tf !== 'none') p = new DOMMatrix(tf).inverse().transformPoint(new DOMPoint(p.x, p.y));
    } catch (e) { /* old browser: no rotation correction */ }
    // object-fit: contain — the picture sits centred in the box, margins see-through
    var ar = m.w / m.h, dw = w, dh = h;
    if (w / h > ar) dw = h * ar; else dh = w / ar;
    var u = p.x / dw + 0.5, v = p.y / dh + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    var cx = Math.floor(u * m.w), cy = Math.floor(v * m.h);
    for (var dy = -1; dy <= 1; dy++) {               // a finger is not a pixel: look around a little
      for (var dx = -1; dx <= 1; dx++) {
        var xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.a[yy * m.w + xx] > 40) return true;
      }
    }
    return false;
  }

  // What a tap at (x, y) is on, by what is painted there, top first:
  // { label } a name tag · { piece } a product or a piece that does
  // something, where its picture is · { player } the character (drawn over
  // the pieces behind it, so a tap there is on the character) · { hot } a
  // tap box · { udon } · {} the wall or the floor.
  // touch: a finger is not a point. A small thing (product, story…) whose
  // picture is a few px away still counts, before the place (a "Khu vực"
  // piece, a tap box) or the wall behind it: a bag hung on a screen.
  function pickAt(x, y, touch) {
    var me = onPlayer(x, y), hit = {};
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (!world.contains(n)) continue;
      if (n.closest('.st-udon')) return { udon: true };
      var lab = n.closest('.st-hot-label');
      if (lab) return { label: lab };
      var pc = n.closest('.st-thing, .st-shelf-prod');
      if (pc) {
        if (me && !pc.classList.contains('is-front')) break;   // hidden behind the character
        if (solidAt(pc, x, y)) { hit = { piece: pc }; break; }
        continue;
      }
      if (n.closest('.st-hot')) { if (!me) hit = { hot: n.closest('.st-hot') }; break; }
    }
    if (hit.piece && hit.piece.getAttribute('data-kind') !== 'zone') return hit;   // a thing right under the finger
    if (me && !hit.piece) return { player: true };
    var near = touch ? nearSmall(x, y) : null;
    return near ? { piece: near } : hit;
  }

  // A small thing near a finger: its picture within a few px of (x, y) and
  // not hidden by the character. Rings of 6 and 11 px, the nearer first.
  var SMALL = '.st-shelf-prod, .st-thing:not([data-kind="zone"])';
  function nearSmall(x, y) {
    for (var r = 6; r <= 11; r += 5) {
      for (var a = 0; a < 8; a++) {
        var px = x + r * Math.cos(a * Math.PI / 4), py = y + r * Math.sin(a * Math.PI / 4);
        var list = document.elementsFromPoint(px, py);
        for (var i = 0; i < list.length; i++) {
          var pc = list[i].closest(SMALL);
          if (!pc || !world.contains(pc)) continue;
          if (solidAt(pc, px, py) && (pc.classList.contains('is-front') || !onPlayer(px, py))) return pc;
        }
      }
    }
    return null;
  }
  function prepAlpha(el) {
    var img = el.tagName === 'IMG' ? el : null;
    if (img) alphaOf(img.getAttribute('src'));
  }

  // Where a piece's picture really is (strip px): its box without the
  // see-through margins of the image (an uploaded sofa can sit in a much
  // wider sheet). The whole box until the picture has been read; a turned
  // piece is taken as upright.
  function picBox(it) {
    var m = ALPHA[it.src], b = m && m.box ? m.box : [0, 0, 1, 1];
    var left = it.x - it.w / 2, top = it.y - it.h / 2;
    return { x0: left + (it.flip ? 1 - b[2] : b[0]) * it.w, x1: left + (it.flip ? 1 - b[0] : b[2]) * it.w,
             y0: top + b[1] * it.h, y1: top + b[3] * it.h };
  }

  /* ---------- where an action lives ----------
     The owner may hide a built-in tap box and hand its job to a piece of
     their own ("Khu vực") or to a tap box they added. What goes by the job
     (the bottom nav, the notes on the memo board, "design one like this")
     then goes by that piece: the character stops at the middle of its
     picture, so there is no stop to place. */
  var SPOT_ACTS = { pegboard: ['shop:pegboard'], cabinet: ['shop:cabinet'],
    display: ['shop:display', 'shop:all', 'shop:pegboard', 'shop:cabinet'] };   // "Kệ hàng" in the nav: any shelf will do

  function standIn(it, all) {
    var b = all ? groupBox(it) : picBox(it), W = LAYOUT ? LAYOUT.bg.w : SCENE.width;
    return Math.max(120, Math.min(W - 120, (b.x0 + b.x1) / 2));
  }

  // The owner's piece (or own box) for a built-in spot's job, in the studio.
  function ownPlace(id) {
    if (!LAYOUT) return null;
    var acts = SPOT_ACTS[id] || [id], boxes = LAYOUT.boxes || [];
    for (var a = 0; a < acts.length; a++) {
      for (var i = 0; i < LAYOUT.items.length; i++) {
        var it = LAYOUT.items[i];
        if (it.kind === 'zone' && it.zone.act === acts[a] && window.GemLayout.shownOn(it)) {
          return { x: standIn(it), act: it.zone.act, link: it.zone.link, it: it };
        }
      }
      for (var j = 0; j < boxes.length; j++) {
        var bx = boxes[j].box;
        if (boxes[j].act === acts[a]) return { x: standNear(boxes[j].stand, bx[0], bx[2]), act: boxes[j].act, link: boxes[j].link, box: bx };
      }
    }
    return null;
  }

  // Where to go for a spot: the built-in box while it is on, else the owner's.
  function placeFor(id) {
    if (spotOff(id)) return ownPlace(id);
    var h = hotById(id), cfg = spotSet(id);
    return h ? { x: standX(h), act: cfg.act || (cfg.link ? 'link' : id), link: cfg.link } : null;
  }
  function hasPlace(id) { return !spotOff(id) || !!ownPlace(id); }

  var INFO = {};          // src -> GemLayout.info(row)
  var FEED = {};          // 'workshop' | 'post' -> Promise of the row (or null)
  var FEED_ROW = {};      // the same rows once they are in

  function loadInfo() {
    if (!window.GemDB || !window.GemDB.studioInfo) return;
    window.GemDB.studioInfo().then(function (rows) {
      (rows || []).forEach(function (r) { var o = window.GemLayout.info(r); if (o) INFO[o.src] = o; });
    });
  }

  function infoText(o, field) { return (lng() === 'en' && o[field + '_en']) || o[field + '_vi'] || ''; }

  function thing(el, it) {
    var n = THINGS.push(it) - 1;
    el.classList.add('st-thing');
    el.setAttribute('data-thing', n);
    el.setAttribute('data-kind', it.kind);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    var name = it.kind === 'zone' ? zoneName(it) : '';
    if (name) el.setAttribute('aria-label', name);
    if (name && !it.zone.notag) {
      var lab = document.createElement('span');   // the owner's text: textContent only
      lab.className = 'st-hot-label st-zone-label';
      lab.setAttribute('data-thing-label', n);
      lab.textContent = name;
      tagAt(lab, it);
      world.appendChild(lab);
      it._tag = lab;
    }
    if (it.kind === 'board') board(it, n);
  }

  // A "Khu vực" always has a tag (on touch there is no hover to show what can
  // be tapped): the owner's name, else the name of what it does. A piece that
  // does nothing has none.
  var ACT_NAME = { door: 'studio.hot_door', sofa: 'studio.hot_sofa', rail: 'studio.hot_rail', fitting: 'studio.hot_fitting',
    'shop:pegboard': 'studio.hot_pegboard', 'shop:display': 'studio.hot_display', 'shop:cabinet': 'studio.hot_cabinet',
    'shop:all': 'studio.go_shelves', sewing: 'studio.hot_sewing', tu: 'studio.hot_tu', counter: 'studio.hot_counter',
    memo: 'studio.hot_memo', enter: 'studio.hot_enter', link: 'studio.tag_link', dantranh: 'studio.hot_dantranh',
    khovai: 'studio.hot_khovai', phanloai: 'studio.hot_phanloai' };
  function actName(act) { return ACT_NAME[act] ? t(ACT_NAME[act]) : ''; }
  function zoneName(it) { return it.zone[lng()] || it.zone.vi || actName(it.zone.act); }

  // Pieces that do the same thing and stand together (Tagom's six posters on
  // one wall) share one tag over the lot (Anna 23/10: a tag on each was a
  // jumble): the one the owner named, else the first. Each picture still
  // opens itself (a tap names it, a second opens it, like a product); the
  // shared tag opens the place as a whole. A piece whose tag the owner hid
  // ("Ẩn nhãn") takes no part.
  var TAG_GAP = 80;   // strip px between two pictures that still stand together
  function groupTags(items) {
    var by = {};
    items.forEach(function (it) {
      if (it.kind !== 'zone' || !it._tag) return;
      var key = it.zone.act + ' ' + (it.zone.link || '');
      (by[key] = by[key] || []).push(it);
    });
    Object.keys(by).forEach(function (key) {
      var ps = by[key].sort(function (a, b) { return (a.x - a.w / 2) - (b.x - b.w / 2); });
      var run = [], end = -Infinity;
      var close = function () {
        if (run.length < 2) return;
        var lead = run.filter(function (m) { return m.zone.vi || m.zone.en; })[0] || run[0];
        run.forEach(function (m) {
          m._lead = lead;
          if (m !== lead) { m._tag.remove(); m._tag = null; }
        });
        lead._group = run;
        lead._tag.textContent = zoneName(lead);
        tagAt(lead._tag, lead);
      };
      ps.forEach(function (it) {
        var x0 = it.x - it.w / 2;
        if (run.length && x0 > end + TAG_GAP) { close(); run = []; end = -Infinity; }
        run.push(it);
        end = Math.max(end, it.x + it.w / 2);
      });
      close();
    });
  }
  // a piece's place: its picture, or the pictures of its group together
  function groupBox(it) {
    var g = it._lead && it._lead._group;
    if (!g) return picBox(it);
    return g.map(picBox).reduce(function (a, b) {
      return { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) };
    });
  }
  // A piece that opens without a tag of its own: grouped, or the owner hid it
  function untagged(it) { return !!it && it.kind === 'zone' && (!!it._lead || !!it.zone.notag); }

  // The tag sits on top of the picture, not of the see-through sheet round it
  // (moved again once the picture has been read, retag).
  function tagAt(lab, it) {
    var b = groupBox(it);
    lab.style.left = pct((b.x0 + b.x1) / 2, SCENE.width);
    lab.style.top = pct(Math.max(b.y0, 40), SCENE.height);
  }
  function retag(src) {
    if (!world) return;
    world.querySelectorAll('[data-thing-label]').forEach(function (lab) {
      var it = THINGS[+lab.getAttribute('data-thing-label')];
      if (it && (it.src === src || (it._group && it._group.some(function (m) { return m.src === src; })))) tagAt(lab, it);
    });
    markHere();   // its picture's span is known now too
  }

  function relabelThings() {
    world.querySelectorAll('[data-thing-label]').forEach(function (lab) {
      var it = THINGS[+lab.getAttribute('data-thing-label')];
      var el = world.querySelector('.st-thing[data-thing="' + lab.getAttribute('data-thing-label') + '"]');
      lab.textContent = zoneName(it);
      if (el) el.setAttribute('aria-label', zoneName(it));
    });
    world.querySelectorAll('.st-board').forEach(function (b) { fillBoard(b, THINGS[+b.getAttribute('data-thing')]); });
  }

  // The writing on a board: over the picture, turned with it, never takes taps.
  function board(it, n) {
    var o = document.createElement('div');
    o.className = 'st-board';
    if (it.layer === 'front') o.classList.add('is-front');   // with its picture, in front of the character
    o.setAttribute('data-thing', n);
    o.style.left = pct(it.x - it.w / 2, SCENE.width);
    o.style.top = pct(it.y - it.h / 2, SCENE.height);
    o.style.width = pct(it.w, SCENE.width);
    o.style.height = pct(it.h, SCENE.height);
    o.style.transform = 'rotate(' + it.rot + 'deg)';
    world.appendChild(o);
    fillBoard(o, it);
  }

  function feed(kind) {
    if (!FEED[kind]) {
      var DB = window.GemDB;
      FEED[kind] = (!DB ? Promise.resolve([]) : (kind === 'post' ? DB.posts() : DB.sessions())).then(function (rows) {
        rows = rows || [];
        var now = Date.now();
        var r = kind === 'post' ? rows[0] || null
          : rows.filter(function (x) { return new Date(x.starts_at).getTime() > now && !(x.seats_left <= 0); })[0] || null;
        FEED_ROW[kind] = r;
        return r;
      }, function () { return null; });
    }
    return FEED[kind];
  }

  function fillBoard(o, it) {
    feed(it.board.feed).then(function (r) {
      var post = it.board.feed === 'post', en = lng() === 'en';
      var head = t(post ? 'studio.board_post' : 'studio.board_ws'), title = '', when = '';
      if (r) {
        title = (en && (r.title_en || r.name_en)) || r.title_vi || r.name_vi || '';
        var d = new Date(post ? r.happened_on : r.starts_at);
        if (!isNaN(d)) {
          var tz = 'Asia/Ho_Chi_Minh';   // the shop's clock, wherever the visitor is
          when = post ? d.toLocaleDateString(en ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz })
            : d.toLocaleDateString(en ? 'en-GB' : 'vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: tz }) +
              ' · ' + d.toLocaleTimeString(en ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        }
      } else {
        title = t(post ? 'studio.board_none_post' : 'studio.board_none_ws');
      }
      o.textContent = '';
      var inner = document.createElement('div');
      inner.className = 'st-board-in';
      [['st-board-h', head], ['st-board-t', title], ['st-board-d', when]].forEach(function (p) {
        if (!p[1]) return;
        var sp = document.createElement('span');
        sp.className = p[0];
        sp.textContent = p[1];
        inner.appendChild(sp);
      });
      o.appendChild(inner);
    });
  }

  function storySheet(it, byUdon) {
    var o = INFO[it.src];
    if (!o || !(o.title_vi || o.body_vi)) return;
    var body = infoText(o, 'body').split(/\n\s*\n/).map(function (p) {
      return p.trim() ? '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>' : '';
    }).join('');
    var ext = /^https:/.test(o.link);
    openSheet(
      (byUdon ? '<p class="st-story-udon"><img src="images/studio/udon/ud-vay.webp" alt="" width="56" height="56">' +
        esc(t('studio.story_udon')) + '</p>' : '') +
      '<article class="st-story">' +
        (o.image ? '<img class="st-story-img" src="' + esc(o.image) + '" alt="">' : '') +
        '<h2>' + esc(infoText(o, 'title')) + '</h2>' + body +
        (o.link ? '<p class="st-foot"><a href="' + esc(o.link) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
          esc(t('studio.story_more')) + '</a></p>' : '') +
      '</article>');
  }

  var talkTimer = null;
  function talk(it) {
    var o = INFO[it.src];
    if (!o || !o.lines.length) return;
    it._line = ((it._line == null ? -1 : it._line) + 1) % o.lines.length;
    var line = o.lines[it._line];
    var b = world.querySelector('.st-talk');
    if (!b) { b = document.createElement('div'); b.className = 'st-talk'; b.setAttribute('role', 'status'); world.appendChild(b); }
    b.textContent = (lng() === 'en' && line.en) || line.vi || line.en;
    b.style.left = pct(it.x, SCENE.width);
    b.style.top = pct(it.y - it.h / 2, SCENE.height);
    b.hidden = false;
    clearTimeout(talkTimer);
    talkTimer = setTimeout(function () { b.hidden = true; }, 4500);
  }

  function boardGo(it) {
    var r = FEED_ROW[it.board.feed];
    if (it.board.feed === 'post') location.href = r && r.slug ? 'ban-tin.html?bai=' + encodeURIComponent(r.slug) : 'ban-tin.html';
    else location.href = r && r.slug ? 'workshop.html?loai=' + encodeURIComponent(r.slug) : 'workshop.html';
  }

  // A tap (or Enter) on a piece that does something.
  function thingTap(el) {
    var it = THINGS[+el.getAttribute('data-thing')];
    if (!it) return;
    if (it.kind === 'story') storySheet(it, false);
    else if (it.kind === 'talk') talk(it);
    else if (it.kind === 'zone') runAct(it.zone.act, it.zone.link, standIn(it), it);
    else if (it.kind === 'board') boardGo(it);
  }

  // Stories can be picked up and handed to Udon (inside only: Udon lives there).
  // Udon is often a long way off, at the counter: while a story is in hand,
  // Udon's bubble comes up on the stage and is a place to drop it too.
  function storyDrop(on) {
    clearTimeout(bubbleTimer);
    bubble.classList.toggle('is-drop', on);
    bubble.hidden = !on;
    if (!on) return;
    bubbleText.setAttribute('data-i18n', 'studio.story_drop');
    bubbleText.textContent = t('studio.story_drop');
  }

  function bindThings() {
    world.addEventListener('pointerdown', function (e) {
      var el = pickAt(e.clientX, e.clientY, e.pointerType !== 'mouse').piece;
      if (!el || el.getAttribute('data-kind') !== 'story' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      var it = THINGS[+el.getAttribute('data-thing')];
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      dragFrom(e, img, {
        where: function (x, y) { return (udonEl && overEl(udonEl, x, y, 20)) || overEl(bubble, x, y, 12) ? 'udon' : null; },
        start: function () { el.classList.add('is-lifted'); storyDrop(true); },
        cancel: function () { el.classList.remove('is-lifted'); storyDrop(false); },
        tap: function () { pickTap(el, function () { storySheet(it, false); }); },
        drop: function () {
          storyDrop(false);
          udonPose('ud-vay');
          storySheet(it, true);
          return false;   // the piece goes back where it was
        }
      });
    });
    world.addEventListener('keydown', function (e) {
      var el = e.target.closest && e.target.closest('.st-thing');
      if (!el || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      thingTap(el);
    });
  }

  function build() {
    if (LAYOUT) buildItems(LAYOUT.items);
    // Product photos on the zone-3 shelves, under the hotspots (not tappable
    // on their own: the whole cabinet opens).
    DISPLAY.forEach(function (d) {
      if (LAYOUT || !THUMB[d.sku]) return;   // a layout places its own photos
      var x0 = zoneX(3, d.x[0]), x1 = zoneX(3, d.x[1]);
      var fr = document.createElement('span');
      fr.className = 'st-shelf-item st-shelf-prod' + (CUTOUT[d.sku] ? ' is-cut' : '');
      fr.setAttribute('data-sku', d.sku);
      fr.style.left = pct((x0 + x1) / 2, SCENE.width);
      fr.style.bottom = pct(SCENE.height - d.y, SCENE.height);
      fr.style.height = pct(CUTOUT[d.sku] ? DISPLAY_H * 1.05 : DISPLAY_H, SCENE.height);
      fr.innerHTML = '<img src="' + (CUTOUT[d.sku] ? 'images/studio/sp/' + d.sku + '.webp' : 'images/products/' + THUMB[d.sku]) +
        '" alt="" loading="lazy" draggable="false">';
      world.appendChild(fr);
    });

    HOTSPOTS.forEach(function (h) { if (!spotOff(h.id)) addHot(h); });
    if (LAYOUT) addOwnBoxes(LAYOUT.boxes);

    // Udon on the counter
    var u = SCENE.udon;
    udonEl = document.createElement('button');
    udonEl.type = 'button';
    udonEl.className = 'st-udon';
    udonEl.setAttribute('data-i18n-attr', 'aria-label:studio.udon_aria');
    udonEl.setAttribute('aria-label', t('studio.udon_aria'));
    // Poses (images/studio/udon): sitting with a two-frame tail wag, a wave
    // when you come close, asleep when nobody's touched anything for a while.
    udonEl.innerHTML = UDON_POSES.map(function (p) {
      return '<img src="images/studio/udon/' + p + '.webp" alt="" draggable="false" data-pose="' + p + '"' +
        (p === 'ud-ngoi-a' ? '' : ' hidden') + '>';
    }).join('');
    udonEl.style.left = pct(u.x, SCENE.width);
    udonEl.style.top = pct(u.y, SCENE.height);
    udonEl.style.width = pct(u.w, SCENE.width);
    udonEl.style.height = pct(u.h, SCENE.height);
    world.appendChild(udonEl);
    bindUdon();

    // Paper notes pinned on the memo board (filled once notes load)
    placePins();

    addPlayer();
  }

  // The pins lie on the board: in the pieces' layer (behind the character, or
  // in front of it when the board is), after every piece — so, on its picture.
  var memoSrc = null;   // the board's picture, when the pins go by one
  function placePins() {
    var mb = sceneName === 'in' ? memoBoard() : null;
    if (!mb) {
      if (memoPins) memoPins.remove();
      memoPins = null;
      return;
    }
    if (!memoPins) memoPins = document.createElement('div');
    memoPins.className = 'st-pins' + (mb.front ? ' is-front' : '');
    memoPins.style.left = pct(mb.x0, SCENE.width);
    memoPins.style.top = pct(mb.y0, SCENE.height);
    memoPins.style.width = pct(mb.x1 - mb.x0, SCENE.width);
    memoPins.style.height = pct(mb.y1 - mb.y0, SCENE.height);
    world.insertBefore(memoPins, world.querySelector('.st-hot, .st-udon'));   // the pieces are built before these
  }

  // Where the notes are pinned: on the board picture itself when the owner's
  // layout has one inside the memo spot (the spot's box is usually drawn
  // bigger than the board, and notes landed on its frame), else the box.
  // The memo box hidden: on the piece (or own box) that does its job now.
  function memoBoard() {
    memoSrc = null;
    if (spotOff('memo')) {
      var pl = ownPlace('memo');
      if (!pl) return null;
      if (!pl.it) return { x0: pl.box[0] + (pl.box[2] - pl.box[0]) * 0.1, x1: pl.box[2] - (pl.box[2] - pl.box[0]) * 0.1,
                           y0: pl.box[1] + (pl.box[3] - pl.box[1]) * 0.18, y1: pl.box[3] - (pl.box[3] - pl.box[1]) * 0.12 };
      var p = picBox(pl.it), pw = p.x1 - p.x0, ph = p.y1 - p.y0;
      memoSrc = pl.it.src;
      return { x0: p.x0 + pw * 0.1, x1: p.x1 - pw * 0.1, y0: p.y0 + ph * 0.2, y1: p.y1 - ph * 0.12,
               front: pl.it.layer === 'front' };
    }
    var h0 = boxOf(hotById('memo')), w0 = h0.x1 - h0.x0, t0 = h0.y1 - h0.y0;
    var hb = { x0: h0.x0 + w0 * 0.1, x1: h0.x1 - w0 * 0.1, y0: h0.y0 + t0 * 0.18, y1: h0.y1 - t0 * 0.12 };
    if (!LAYOUT) return hb;
    var best = null;
    LAYOUT.items.forEach(function (it) {
      if (it.sku || it.x < h0.x0 || it.x > h0.x1 || it.y < h0.y0 || it.y > h0.y1) return;
      var score = it.w * it.h * (/bang|khung|board/.test(it.src) ? 4 : 1);
      if (!best || score > best.score) best = { it: it, score: score };
    });
    if (!best) return hb;
    var b = best.it;
    // inside the frame: clear of the wooden edge and the hanging bar on top
    return { x0: b.x - b.w * 0.4, x1: b.x + b.w * 0.4, y0: b.y - b.h * 0.3, y1: b.y + b.h * 0.38,
             front: b.layer === 'front' };
  }

  /* ---------- owner's per-spot settings (layout.spots) ----------
     off: not in the studio; vi / en: its label; link: opens that page
     instead of the built-in sheet. */
  function spotSet(id) {
    if (/^k-/.test(id)) { var h = hotById(id); return h && h.own ? h.own : {}; }
    return (LAYOUT && LAYOUT.spots && LAYOUT.spots[id]) || {};
  }
  function spotOff(id) { return !!spotSet(id).off; }
  function spotName(h) {
    var c = spotSet(h.id);
    return c[lng()] || (h.label ? t(h.label) : c.vi || actName(c.act));   // no English set: the built-in English / the Vietnamese / what it does
  }

  function addHot(h) {
    var b = boxOf(h), name = spotName(h);
    var custom = spotSet(h.id).vi || spotSet(h.id).en;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'st-hot';
    btn.setAttribute('data-hot', h.id);
    if (!custom && h.label) btn.setAttribute('data-i18n-attr', 'aria-label:' + h.label);
    btn.setAttribute('aria-label', name);
    btn.style.left = pct(b.x0, SCENE.width);
    btn.style.top = pct(b.y0, SCENE.height);
    btn.style.width = pct(b.x1 - b.x0, SCENE.width);
    btn.style.height = pct(b.y1 - b.y0, SCENE.height);
    if (name) {
      var lab = document.createElement('span');
      lab.className = 'st-hot-label';
      if (!custom && h.label) lab.setAttribute('data-i18n', h.label);
      lab.textContent = name;   // the owner's text: textContent only
      btn.appendChild(lab);
    }
    world.appendChild(btn);
  }

  // Labels without a data-i18n key (the owner's own names; own boxes named
  // after what they do) follow the language switch by hand.
  function relabelSpots() {
    world.querySelectorAll('.st-hot').forEach(function (btn) {
      var h = hotById(btn.getAttribute('data-hot')), lab = btn.querySelector('.st-hot-label');
      if (!h || !lab || lab.hasAttribute('data-i18n')) return;
      btn.setAttribute('aria-label', spotName(h));
      lab.textContent = spotName(h);
    });
  }

  // The bottom nav: a button goes when its spot is taken out and no piece of
  // the owner's does that job instead.
  var NAV_SPOT = { door: 'door', fitting: 'fitting', shelves: 'display', sewing: 'sewing', tu: 'tu', counter: 'counter' };
  function syncNav() {
    document.querySelectorAll('.st-nav [data-go]').forEach(function (b) {
      var id = NAV_SPOT[b.getAttribute('data-go')];
      b.classList.toggle('is-off', !!id && !hasPlace(id));
    });
    streetNav();
  }

  // On the street the nav also has the owner's places out there (a tap box
  // or a "Khu vực" piece that does something: "Chơi đàn tranh"), in street
  // order round "Vào studio". A phone shows one stretch of the street, so
  // the nav is where visitors learn what else is out there.
  function streetNav() {
    var nav = document.querySelector('.st-nav'), go = nav && nav.querySelector('.st-go-in');
    if (!go) return;
    nav.querySelectorAll('.st-go-out').forEach(function (b) { b.remove(); });
    if (sceneName !== 'out' || !OUT_HOT[0].abs) return;
    var list = [], seen = {}, door = standX(OUT_HOT[0]);
    OWN_HOT.forEach(function (h) {
      var c = h.own || {};
      list.push({ id: h.id, act: c.act || (c.link ? 'link' : ''), link: c.link, name: spotName(h), x: standX(h) });
    });
    THINGS.forEach(function (it) {
      if (it.kind === 'zone') list.push({ act: it.zone.act, link: it.zone.link, name: zoneName(it._lead || it), x: standIn(it, true) });
    });
    list = list.sort(function (a, b) { return a.x - b.x; }).filter(function (p) {
      var key = p.act + ' ' + (p.link || '');   // one button per thing to do: the one furthest left
      var ok = p.name && p.act && p.act !== 'none' && p.act !== 'enter' && (p.act !== 'link' || p.link) && !seen[key];
      if (ok) seen[key] = true;
      return ok;
    });
    var right = list.filter(function (p) { return p.x > door; }).reverse();
    list.filter(function (p) { return p.x <= door; }).forEach(function (p) { nav.insertBefore(navBtn(p), go); });
    right.forEach(function (p) { nav.insertBefore(navBtn(p), go.nextSibling); });
  }
  function navBtn(p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'st-go-out';
    b.textContent = p.name;   // the owner's text: textContent only
    b.addEventListener('click', function () {
      if (p.id) visit(p.id, true);
      else runAct(p.act, p.link, p.x);
    });
    return b;
  }

  // Character: one frame per pose, toggled — swapping src would flicker.
  function addPlayer() {
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

  /* ---------- the street outside, and going in / out ---------- */
  function outsideScene() {
    return (LAYOUT && LAYOUT.outside) || window.GemLayout.outsideDefault();
  }

  function buildOutside(O) {
    buildItems(O.items);
    var h = OUT_HOT[0], o = O.hot.enter;
    h.abs = o.box; h.standAbs = o.stand;
    addHot(h);
    addOwnBoxes(O.boxes);
    addPlayer();
  }

  // The wall: one picture, or (a scene the owner made longer) picture + a
  // repeated loop of wall + the room's corner — GemLayout.bgParts.
  function paintBg(bg) {
    var img = world.querySelector('.st-bg');
    img.src = bg.src;
    world.querySelectorAll('.st-bgx').forEach(function (n) { n.remove(); });
    var parts = window.GemLayout ? window.GemLayout.bgParts(bg) : [];
    img.style.visibility = parts.length > 1 ? 'hidden' : '';
    if (parts.length < 2) return;
    parts.forEach(function (part) {
      var d = document.createElement('div');
      d.className = 'st-bgx';
      Object.assign(d.style, window.GemLayout.partStyle(part, bg.w));
      img.insertAdjacentElement('afterend', d);
    });
  }

  function setScene(name) {
    sceneName = name;
    // On the street the nav offers only the way in; the studio's places
    // come back once inside.
    document.body.classList.toggle('st-is-out', name === 'out');
    Array.prototype.slice.call(world.children).forEach(function (n) {
      if (!n.classList.contains('st-bg')) n.remove();   // .st-bgx too: paintBg redraws it
    });
    udonEl = null; memoPins = null; THINGS = []; OWN_HOT = [];
    LAZY = []; clearTimeout(lazyTimer); lazyTimer = null; lazyBusy = 0;
    restX = null; hovered = null;   // a scene starts with nowhere "visited"
    if (name === 'out') {
      var O = outsideScene();
      SCENE.width = O.bg.w; SCENE.height = O.bg.h; SCENE.startX = O.start;
      paintBg(O.bg);
      buildOutside(O);
    } else {
      SCENE.width = INSIDE.width; SCENE.height = INSIDE.height; SCENE.startX = INSIDE.startX;
      paintBg({ src: INSIDE.bg, w: INSIDE.width, h: INSIDE.height });
      build();
      paintPins();
    }
    edgeSet = null;
    if (guide.cur && (guide.cur === 'inside') !== (name === 'in')) tipHide();   // not seen: it comes back
    walkToken++;
    player.x = SCENE.startX; player.facing = 1; player.moving = false; player.moved = false;
    layout();
    syncNav();
    try { sessionStorage.setItem('gem-scene', name); } catch (e) { /* private mode */ }
  }

  // Fade out, swap scenes, fade back in once the new wall has loaded.
  var sceneInHistory = false;
  function goScene(name, then, fromHistory) {
    if (name === sceneName) { if (then) then(); return; }
    var inDoor = name === 'in' && sceneName === 'out';
    if (inDoor) guideDid('enter');
    closeSheet();
    unpick();
    if (name === 'in' && !sceneInHistory) {
      try { history.pushState({ st: 'in' }, ''); sceneInHistory = true; } catch (e) { /* old browser */ }
    } else if (name === 'out' && sceneInHistory && !fromHistory) {
      sceneInHistory = false; ignorePop = true; history.back();
    }
    var html = document.documentElement;
    html.classList.add('st-wait');
    setTimeout(function () {
      setScene(name);
      var bg = world.querySelector('.st-bg'), shown = false;
      var show = function () {
        if (shown) return;
        shown = true;
        html.classList.remove('st-wait');
        if (inDoor) bell();
        if (then) setTimeout(then, 250);
      };
      if (bg.complete && bg.naturalWidth) show();
      else { bg.addEventListener('load', show, { once: true }); bg.addEventListener('error', show, { once: true }); setTimeout(show, 2500); }
    }, 260);
  }

  function enterStudio() {
    bellReady();   // still inside the tap: a phone allows sound to start only there
    walkTo(standX(hotById('enter')), function () { goScene('in', function () { hello(true); }); });
  }

  // (Re)build the frames for the chosen character. Each frame is a box the
  // size of its picture, so accessories can be placed in % of it.
  // The top edge of the cart's FRONT liner in each push frame (fraction of
  // the picture's height, measured from the drawings): what is in the basket
  // is cut off there, so it sits in front of the back wall, inside the cart.
  var CART_RIM = {"p1-cart1": 0.662, "p1-cart2": 0.657, "p1-cart3": 0.661, "p2-cart1": 0.653, "p2-cart2": 0.65, "p2-cart3": 0.652,
    "p3-cart1": 0.653, "p3-cart2": 0.651, "p3-cart3": 0.651, "p4-cart1": 0.649, "p4-cart2": 0.648, "p4-cart3": 0.647};

  function renderCargo() {
    if (!bobEl || !window.GemBasket || !window.GemBasket.pieces) return;
    bobEl.querySelectorAll('.st-cargo').forEach(function (box) {
      var pieces = window.GemBasket.pieces().slice(-3);   // fresh SVG ids per frame
      box.innerHTML = pieces.map(function (pc, i) {
        return '<span class="st-cargo-item st-cargo-' + i + '">' + pc.html + '</span>';
      }).join('');
    });
  }

  function dress() {
    bobEl.textContent = '';
    frameEls = {};
    FRAME_NAMES.forEach(function (name) {
      var key = who + '-' + name;
      var fr = document.createElement('span');
      fr.className = 'st-fr';
      if (W && W.AT[key]) fr.style.aspectRatio = String(W.AT[key][0]);
      fr.style.transform = 'translateX(' + (-(ANCHOR[key] || 0.5) * 100) + '%)';
      fr.hidden = true;
      var img = document.createElement('img');
      img.src = charSrc(who, name);
      img.alt = '';
      img.draggable = false;
      fr.appendChild(img);
      if (CART_RIM[key]) {
        var cargo = document.createElement('span');
        cargo.className = 'st-cargo';
        cargo.style.top = ((CART_RIM[key] - 0.2) * 100).toFixed(1) + '%';
        fr.appendChild(cargo);
      }
      frameEls[name] = fr;
      bobEl.appendChild(fr);
      alphaOf(img.getAttribute('src'));   // a tap on the character goes by its picture (onPlayer)
    });
    dressWear();
    renderCargo();
    player.frame = null;
  }

  /* ---------- accessories on the character ----------
     Anything can be tried on; a tried piece stays for this visit
     (sessionStorage), a piece you own stays for good (localStorage). A
     worn piece is an id: "<sku>", "<sku>/<mẫu>" for a product with choices,
     or "d:<design code>" for a piece sewn from one's own design (bought:
     Tủ sưu tầm has it). How each is worn: GemWear (js/wear.js). */
  var W = window.GemWear;
  var worn = [];
  // sku -> how it is worn: the database's products.wear once it answers,
  // the five of the first round until then (or without the column)
  var wearConf = W ? W.LEGACY : {};
  var wearDb = false;

  function owns(sku) { return !!(window.GemTu && window.GemTu.owns(sku)); }
  function ownsDesign(spec) {
    return !!(window.GemTu && window.GemTu.owned().some(function (o) { return o.spec === spec; }));
  }

  function setWearRows(rows) {
    if (!W || !Array.isArray(rows) || !rows.some(function (r) { return r && 'wear' in r; })) return;
    var c = {};
    rows.forEach(function (r) { var w = r && W.norm(r.wear); if (w) c[r.sku] = w; });
    wearConf = c;
    wearDb = true;
  }

  // What a worn id is: { id, sku, opt, spec, w, img | html, name } or null
  function wearOf(id) {
    if (!W || typeof id !== 'string') return null;
    if (id.indexOf('d:') === 0) {
      var spec = id.slice(2), d = P && P.parse(spec), dw = d && W.DESIGN[d.product];
      if (!dw || !ownsDesign(spec)) return null;
      return { id: id, sku: P.PRODUCTS[d.product].sku, spec: spec, d: d, w: dw,
        name: P.PRODUCTS[d.product][lng()] + ' · ' + P.title(d, lng()) };
    }
    var at = id.indexOf('/'), sku = at < 0 ? id : id.slice(0, at), opt = at < 0 ? null : id.slice(at + 1);
    var w = wearConf[sku];
    if (!w) return null;
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    var cs = info && info.options && info.options.choices, ch = null;
    if (cs) {
      ch = cs.filter(function (c) { return c.key === opt; })[0] || null;
      if (!ch) return null;   // a product with choices is tried in one of them
    } else if (opt) return null;
    // a mẫu is worn in its own cut-out; once some mẫu have one, one without
    // it can't be tried (the product's picture would show another bag).
    // The real photo before a drawing (Anna 25/10: a real piece is what
    // makes people want it): the drawing only while there is no cut-out
    var own = cs && cs.some(function (c) { return W.okImg(c.cut); });
    var real = info && W.okImg(info.cutout) && info.cutout;
    var img = (ch && W.okImg(ch.cut) && ch.cut) || (own ? null : real || w.img) || null;
    if (!img) return null;
    return { id: id, sku: sku, opt: opt, w: w, img: img, ch: ch,
      name: (info ? info.name : sku) + (ch ? ' · ' + ((lng() === 'en' && ch.en) || ch.vi) : '') };
  }

  // The picture of a worn piece, placed on a frame ("p2-front")
  function accHtml(key, it, bag) {
    var s = W.place(key, it.w, bag);
    if (!s) return '';
    var css = 'left:' + s.left + ';top:' + s.top + ';height:' + s.height + ';transform:' + s.transform;
    if (it.img) return '<img class="st-acc" src="' + esc(it.img) + '" alt="" draggable="false" style="' + css + '">';
    // one's own design: the piece drawn from its code, its viewBox cut to it
    var b = it.w.box;
    return '<span class="st-acc st-acc-d" style="' + css + ';aspect-ratio:' + b[2] + ' / ' + b[3] + '">' +
      P.svg(it.d).replace('viewBox="0 0 340 340"', 'viewBox="' + b.join(' ') + '" preserveAspectRatio="xMidYMid meet"') + '</span>';
  }

  // Everything worn on one frame, back to front, and the near fist back on
  // top of what the hand holds
  function wornHtml(key, items) {
    var list = items.slice().sort(function (a, b) { return W.SLOTS.indexOf(a.w.slot) - W.SLOTS.indexOf(b.w.slot); });
    var bag = list.some(function (it) { return it.w.slot === 'bag'; });
    var html = list.map(function (it) { return accHtml(key, it, bag); }).join('');
    var f = list.some(function (it) { return W.held(it.w); }) && W.fist(key);
    if (f) {
      html += '<img class="st-acc" src="images/studio/char/' + key + '-tay.webp" alt="" draggable="false" style="left:' + f.left + ';top:' + f.top + ';width:' + f.width + ';height:' + f.height + '">';
    }
    return html;
  }

  function wornItems(ids) {
    return (ids || worn).map(wearOf).filter(Boolean);
  }

  // one piece per slot
  function wearPut(list, id) {
    var it = wearOf(id);
    if (!it) return list;
    return list.filter(function (x) { var o = wearOf(x); return !o || o.w.slot !== it.w.slot; }).concat(id);
  }

  function loadWorn() {
    var a = [], b = [];
    try { a = JSON.parse(sessionStorage.getItem('gem-mac') || '[]'); } catch (e) { /* private mode */ }
    try { b = JSON.parse(localStorage.getItem('gem-mac') || '[]'); } catch (e) { /* private mode */ }
    // kept as ids until the database says what they are (wearOf)
    worn = [];
    (Array.isArray(b) ? b : []).concat(Array.isArray(a) ? a : []).forEach(function (s) {
      if (typeof s === 'string' && s.length <= 600 && worn.indexOf(s) < 0) worn.push(s);
    });
  }

  // the database answered: drop what isn't worn any more, one per slot
  function settleWorn() {
    var out = [];
    worn.forEach(function (id) { if (wearOf(id)) out = wearPut(out, id); });
    worn = out;
  }

  function saveWorn() {
    try { sessionStorage.setItem('gem-mac', JSON.stringify(worn)); } catch (e) { /* private mode */ }
    try {
      localStorage.setItem('gem-mac', JSON.stringify(worn.filter(function (id) {
        var it = wearOf(id);
        return it && (it.spec || owns(it.sku));
      })));
    } catch (e) { /* private mode */ }
  }

  function toggleWear(id) {
    if (!wearOf(id)) return false;
    var on = worn.indexOf(id) < 0;
    worn = on ? wearPut(worn, id) : worn.filter(function (s) { return s !== id; });
    saveWorn();
    dressWear();
    return on;
  }

  function dressWear() {
    var items = wornItems();
    Object.keys(frameEls).forEach(function (name) {
      var fr = frameEls[name];
      fr.querySelectorAll('.st-acc').forEach(function (n) { n.remove(); });
      if (items.length) fr.insertAdjacentHTML('beforeend', wornHtml(who + '-' + name, items));
    });
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
    wake(viewW);
    placeTags(viewW);
    edges(viewW);
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
      rest();
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
        rest();
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
     THE SHOP BELL — rung as the visitor comes in through the door, with
     Udon's welcome. Made here, no sound file: a small brass bell struck
     twice as the door swings, each strike a few sine partials at a bell's
     ratios fading at their own pace. A phone only lets sound start inside
     a tap, so the tap that opens the door readies it (bellReady), and the
     bell rings once the studio is in view. iPhone: the bell keeps to the
     silent switch ("ambient"); the đàn, once played, asks to be heard.
     ====================================================================== */
  var sfxCtx = null;
  function audioCtx() {   // one AudioContext for the bell and the đàn
    if (sfxCtx) return sfxCtx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { sfxCtx = new AC(); } catch (e) { return null; }
    return sfxCtx;
  }
  function bellReady() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'ambient'; } catch (e) { /* older Safari */ }
    var ctx = audioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  function bell() {
    var ctx = sfxCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var now = ctx.currentTime + 0.03, out = ctx.createGain();
    out.gain.value = 0.2;
    out.connect(ctx.destination);
    [[0, 1568], [0.14, 1318.5]].forEach(function (strike) {   // G6, then E6: "ting ting"
      [[1, 1, 1.5], [2.76, 0.42, 0.55], [5.4, 0.2, 0.28], [8.93, 0.08, 0.16]].forEach(function (pt) {   // ratio, loudness, seconds
        var o = ctx.createOscillator(), g = ctx.createGain(), t = now + strike[0];
        o.type = 'sine';
        o.frequency.value = strike[1] * pt[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pt[1], t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + pt[2]);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + pt[2] + 0.05);
      });
    });
  }

  // In the studio. Through the door: the welcome (with the bell), then, the
  // first time, a tip. Back on a reload: no welcome again, the tip if unseen.
  function hello(door) {
    if (door) say('studio.welcome', 3200);
    clearTimeout(guide.timer);
    guide.timer = setTimeout(function () { guide.timer = 0; guideTip('inside'); }, door ? 3400 : 800);
  }

  /* ======================================================================
     GUIDE — first-visit tips, the tags at the screen's edges, the "?" sheet.
     After NN/g on onboarding: no tour up front; one tip at a time, at the
     moment it is needed, gone once the visitor does the thing, always
     dismissable, never in the way of a tap; help to come back to.
     Tips, once per browser (localStorage gem-guide = { seen: {id: 1}, off }):
       swipe  — on the street, at once: swipe (mouse: drag, or ← →) to walk
       door   — on the street, after the first walk: the door (and the đàn)
       inside — in the studio, after the welcome: tap to see a name, again to open
     A tip for a new feature gets a new id: visitors who have been see that
     one only. "Bỏ qua hướng dẫn" ends them all; "?" can start them again.
     ====================================================================== */
  var guide = { seen: {}, off: false, cur: null, timer: 0, loaded: false };
  var touchUI = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  var tipEl, tipText;

  function guideLoad() {
    if (guide.loaded) return;
    guide.loaded = true;
    try {
      var o = JSON.parse(localStorage.getItem('gem-guide') || '{}');
      guide.seen = o.seen && typeof o.seen === 'object' ? o.seen : {};
      guide.off = o.off === true;
    } catch (e) { /* private mode */ }
  }
  function guideSave() {
    try { localStorage.setItem('gem-guide', JSON.stringify({ seen: guide.seen, off: guide.off })); } catch (e) { /* private mode */ }
  }

  function tipWords(id) {
    if (id === 'swipe') return t(touchUI ? 'studio.tip_swipe' : 'studio.tip_swipe_mouse');
    if (id === 'door') {
      // what else is out here: the đàn, the sorting corner (Anna 23/10)
      var acts = scenePlaces().map(function (p) { return p.act; });
      var more = [['dantranh', 'studio.tip_x_zt'], ['phanloai', 'studio.tip_x_pl']]
        .filter(function (m) { return acts.indexOf(m[0]) >= 0; }).map(function (m) { return t(m[1]); });
      return more.length ? t('studio.tip_door_more').replace('{x}', more.join(t('studio.tip_and'))) : t('studio.tip_door');
    }
    if (id === 'inside') return t(touchUI ? 'studio.tip_inside' : 'studio.tip_inside_mouse');
    return '';
  }

  function guideTip(id) {
    guideLoad();
    if (!tipEl || guide.off || guide.seen[id] || guide.cur || !modal.hidden) return;
    if ((id === 'inside') !== (sceneName === 'in')) return;
    guide.cur = id;
    tipEl.classList.toggle('is-swipe', id === 'swipe');
    tipText.textContent = tipWords(id);
    tipEl.hidden = false;
  }
  function tipHide() {
    guide.cur = null;
    if (tipEl) tipEl.hidden = true;
  }
  function guideEnd(id) {   // done with: never again
    guide.seen[id] = 1;
    guideSave();
    if (guide.cur === id) tipHide();
  }
  // What the visitor did: 'walk' (a tap on the floor, a swipe, ← →, an edge
  // tag), 'open' (a sheet), 'enter' (through the door).
  function guideDid(what) {
    var cur = guide.cur;
    if (what === 'walk') {
      if (cur === 'swipe') guideEnd('swipe');
      if (sceneName === 'out' && !guide.seen.door && !guide.timer) {
        guide.timer = setTimeout(function () { guide.timer = 0; if (sceneName === 'out') guideTip('door'); }, 1500);
      }
    } else if (what === 'open') {
      if (cur) guideEnd(cur);
    } else if (what === 'enter') {
      clearTimeout(guide.timer); guide.timer = 0;
      if (sceneName === 'out') { guide.seen.swipe = guide.seen.door = 1; guideSave(); }
      tipHide();
    }
  }
  function guideRelang() {
    if (guide.cur) tipText.textContent = tipWords(guide.cur);
    edgeSet = null;
    if (stage) render();
  }

  // This scene's places with something to do: the tap boxes (the built-in
  // ones and the owner's) and the "Khu vực" pieces, one per thing to do,
  // left to right. { name, act, x (where to stand), x0 / x1 (the picture), el }
  var edgeSet = null;
  function scenePlaces() {
    if (edgeSet) return edgeSet;
    var list = [], seen = {};
    world.querySelectorAll('.st-hot, .st-thing[data-kind="zone"]').forEach(function (el) {
      var p = placeOf(el);
      if (!p) return;
      var it = null, pl = null, name = '', act = '';
      if (el.classList.contains('st-hot')) {
        var id = el.getAttribute('data-hot'), h = hotById(id);
        if (!h || spotOff(id)) return;
        pl = placeFor(id);
        if (!pl) return;
        act = pl.act; name = spotName(h);
      } else {
        it = THINGS[+el.getAttribute('data-thing')];
        if (!it || !it.zone) return;
        act = it.zone.act; name = zoneName(it._lead || it);
        pl = { x: standIn(it, true), act: act, link: it.zone.link };
      }
      if (!name || !act || act === 'none' || /^k-/.test(act)) return;   // a box of the owner's that does nothing
      var key = act + ' ' + (pl.link || '');
      if (seen[key]) return;
      seen[key] = true;
      list.push({ name: name, act: act, x: pl.x, x0: p.x0, x1: p.x1, el: el, tag: p.tag });
    });
    edgeSet = list.sort(function (a, b) { return a.x - b.x; });
    return edgeSet;
  }
  function goPlace(p) {   // walk there; its tag nods: "here, tap me"
    guideDid('walk');
    walkTo(p.x, function () { if (p.el.isConnected) nudge(p.el); });
  }

  // The tags at the screen's edges: the nearest place out of view on each
  // side (its middle within 50px of the edge or past it: its own tag would
  // be cut there, so that one steps aside for the edge tag).
  var edgeL, edgeR;
  function edges(viewW) {
    if (!edgeL) return;
    var list = sceneName ? scenePlaces() : [], m = 50 / k, L = cam / k + m, R = (cam + viewW) / k - m, left = null, right = null;
    list.forEach(function (p) {
      if (p.tag && p.tag.classList.contains('is-here')) return;   // where the character is: its own tag stays in view (placeTags)
      var c = (p.x0 + p.x1) / 2;
      if (c < L) left = p;
      else if (c > R && !right) right = p;
    });
    edgeShow(edgeL, left, '‹ ');
    edgeShow(edgeR, right, '', ' ›');
    if (!player.moving) edgeDodge();
  }
  // At rest: an edge tag never covers a place's own tag (a tap there must
  // open that place). It tries three heights; with none free it steps away.
  var EDGE_TOPS = ['58%', '74%', '42%'];
  function edgeDodge() {
    var tags = null;
    [edgeL, edgeR].forEach(function (el) {
      el.classList.remove('is-dodged');
      if (el.hidden) return;
      if (!tags) {
        tags = [];
        world.querySelectorAll('.st-hot-label, .st-zone-label').forEach(function (t) {
          if (t.hidden || t.classList.contains('is-offview') || !t.offsetWidth) return;
          tags.push(t.getBoundingClientRect());
        });
      }
      for (var i = 0; i < EDGE_TOPS.length; i++) {
        el.style.top = EDGE_TOPS[i];
        var r = el.getBoundingClientRect();
        if (!tags.some(function (t) { return t.left < r.right + 4 && t.right > r.left - 4 && t.top < r.bottom + 4 && t.bottom > r.top - 4; })) return;
      }
      el.style.top = EDGE_TOPS[0];
      el.classList.add('is-dodged');
    });
  }
  function edgeTag(p, off) {
    if (p && p.tag) p.tag.classList.toggle('is-offview', off);
  }
  function edgeShow(el, p, pre, post) {
    var text = p ? (pre || '') + p.name + (post || '') : '';
    if (el.ztPlace === p && el.textContent === text) return;
    if (el.ztPlace !== p) { edgeTag(el.ztPlace, false); edgeTag(p, true); }
    el.ztPlace = p;
    el.hidden = !p;
    if (!p) return;
    el.textContent = text;   // the owner's text: textContent only
    el.setAttribute('aria-label', t('studio.edge_go').replace('{name}', p.name));
  }

  // "?": how to walk and open, what is here (walk there), the tips again.
  function helpSheet() {
    var how = touchUI ? ['studio.help_walk', 'studio.tip_inside'] : ['studio.help_walk_mouse', 'studio.tip_inside_mouse'];
    var list = scenePlaces();
    openSheet(
      head('studio.help_h') +
      '<ul class="st-help-how">' +
        '<li><span class="st-swipe" aria-hidden="true"><span class="st-swipe-chev">‹</span><span class="st-swipe-dot"></span><span class="st-swipe-chev">›</span></span>' + tr('span', how[0]) + '</li>' +
        '<li><span class="st-help-ico" aria-hidden="true"><span class="st-help-tag">' + esc(t('studio.help_tag')) + '</span></span>' + tr('span', how[1]) + '</li>' +
        '<li><span class="st-help-ico" aria-hidden="true"><span class="st-edge-demo">‹</span></span>' + tr('span', 'studio.help_edge') + '</li>' +
      '</ul>' +
      (list.length ? tr('h3', 'studio.help_here', ' class="st-help-h"') +
        '<ul class="st-help-places">' + list.map(function (p, i) {
          return '<li><span>' + esc(p.name) + '</span><button type="button" class="st-help-go" data-help-go="' + i + '" data-i18n="studio.help_go">' +
            esc(t('studio.help_go')) + '</button></li>';
        }).join('') + '</ul>' : '') +
      '<p class="st-help-again"><button type="button" class="st-link" data-help-replay data-i18n="studio.help_replay">' + esc(t('studio.help_replay')) + '</button></p>'
    );
    sheetBody.querySelectorAll('[data-help-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = list[+b.getAttribute('data-help-go')];
        closeSheet();
        if (p) goPlace(p);
      });
    });
    sheetBody.querySelector('[data-help-replay]').addEventListener('click', function () {
      guide.seen = {}; guide.off = false; guideSave();
      clearTimeout(guide.timer); guide.timer = 0;
      closeSheet();
      setTimeout(function () { guideTip(sceneName === 'in' ? 'inside' : 'swipe'); }, 300);
    });
  }

  function bindGuide() {
    tipEl = document.getElementById('st-tip');
    tipText = document.getElementById('st-tip-text');
    edgeL = stage.querySelector('.st-edge.is-l');
    edgeR = stage.querySelector('.st-edge.is-r');
    // the tip's buttons and the edge tags are not taps on the scene
    [tipEl, edgeL, edgeR].forEach(function (el) {
      ['pointerdown', 'click'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    });
    tipEl.querySelector('.st-tip-x').addEventListener('click', function () { if (guide.cur) guideEnd(guide.cur); });
    tipEl.querySelector('.st-tip-skip').addEventListener('click', function () {
      guide.off = true; guideSave();
      clearTimeout(guide.timer); guide.timer = 0;
      tipHide();
    });
    [edgeL, edgeR].forEach(function (el) {
      el.addEventListener('click', function () { if (el.ztPlace) goPlace(el.ztPlace); });
    });
    document.querySelector('.st-help-b').addEventListener('click', helpSheet);
  }

  /* ======================================================================
     SHEETS (pop-ups)
     ====================================================================== */
  // A sheet is a history step, like a dialog in an app: the phone's Back
  // gesture / button closes it instead of leaving the studio.
  var sheetInHistory = false;
  var sheetAt = 0, sheetFrom = null;   // when the sheet last opened, and where the tap that opened it was (the guard in bind)

  // full: the sheet takes the whole screen (the design table: things are
  // dragged inside it, so only the grab handle pulls it down)
  function openSheet(html, full) {
    guideDid('open');
    sheetAt = Date.now();
    sheetFrom = lastDown;
    if (modal.hidden) lastFocus = document.activeElement;
    sheetEl.classList.toggle('is-full', !!full);
    modal.classList.toggle('is-full', !!full);
    document.documentElement.classList.remove('zt-open');
    sheetBody.innerHTML = html;
    sheetEl.scrollTop = 0;
    if (modal.hidden && !sheetInHistory) {
      try { history.pushState({ st: 'sheet' }, ''); sheetInHistory = true; } catch (e) { /* old browser */ }
    }
    modal.hidden = false;
    document.body.classList.add('st-lock');
    modal.querySelector('.st-close').focus({ preventScroll: true });
  }

  function closeSheet(fromHistory) {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove('zt-open');
    if (pendingLayout) { var pl = pendingLayout; pendingLayout = null; setTimeout(function () { lateLayout(pl.L, pl.raw); }, 0); }
    sheetBody.innerHTML = '';
    sheetEl.classList.remove('is-full');
    modal.classList.remove('is-full');
    sheetEl.style.transform = '';
    document.body.classList.remove('st-lock');
    if (sheetInHistory) {
      sheetInHistory = false;
      if (fromHistory !== true) { ignorePop = true; history.back(); }
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  var ignorePop = false;

  /* ---------- sheet: drag down to close (bottom-sheet pattern) ----------
     From the grab handle anywhere, or from the content when it is scrolled
     to the top. Past 25% of its height, or a quick flick, it closes. */
  function bindSheetDrag() {
    var y0 = 0, t0 = 0, dy = 0, on = false, fromHandle = false;
    sheetEl.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      fromHandle = !!e.target.closest('.st-grab');
      if (!fromHandle && (sheetEl.scrollTop > 0 || sheetEl.classList.contains('is-full') ||
        e.target.closest('canvas, input, textarea, select, .st-grid--photos, .zt-body'))) return;
      y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; on = true;
    }, { passive: true });
    sheetEl.addEventListener('touchmove', function (e) {
      if (!on) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 && !fromHandle) { on = false; sheetEl.style.transform = ''; return; }   // scrolling up: let it scroll
      if (dy > 0) {
        if (e.cancelable) e.preventDefault();
        sheetEl.style.transition = 'none';
        sheetEl.style.transform = 'translateY(' + dy + 'px)';
      }
    }, { passive: false });
    var end = function () {
      if (!on) return;
      on = false;
      var fast = dy > 60 && Date.now() - t0 < 250;
      sheetEl.style.transition = 'transform 0.2s ease';
      if (dy > sheetEl.offsetHeight * 0.25 || fast) {
        sheetEl.style.transform = 'translateY(100%)';
        setTimeout(function () { sheetEl.style.transition = ''; closeSheet(); }, 180);
      } else {
        sheetEl.style.transform = '';
        setTimeout(function () { sheetEl.style.transition = ''; }, 220);
      }
    };
    sheetEl.addEventListener('touchend', end);
    sheetEl.addEventListener('touchcancel', end);
    // The × stays at the top of a sheet scrolled down: a long one on a phone
    // (the sorting game, down to its bags) took it off the screen (25/10)
    var x = modal.querySelector('.st-close');
    sheetEl.addEventListener('scroll', function () {
      var y = sheetEl.scrollTop;
      x.style.transform = y > 0 ? 'translateY(' + y + 'px)' : '';
      x.classList.toggle('is-pinned', y > 0);
    }, { passive: true });
  }

  /* ---------- swipe the stage to walk ----------
     Testers swiped instead of tapping. A sideways drag moves the world with
     the finger (like a map) and the character walks along; letting go with
     some speed carries them a bit further. A tap still walks to the spot. */
  var swiped = 0;   // time of the last swipe: the click that follows is not a tap
  var lastPointer = 'mouse';   // 'mouse' | 'touch' | 'pen', of the last press on the stage
  var lastDown = null;         // where the last press anywhere was (the sheet's double-tap guard)
  function bindSwipe() {
    var st = null;
    stage.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; }, true);
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.st-udon')) return;   // dragged itself
      var pc = pickAt(e.clientX, e.clientY, e.pointerType !== 'mouse').piece;   // so are products and stories (where their picture is)
      if (pc && (pc.classList.contains('st-shelf-prod') || pc.getAttribute('data-kind') === 'story')) return;
      st = { x: e.clientX, y: e.clientY, px: player.x, t: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0, on: false, id: e.pointerId };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.on) {
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return;
        st.on = true;
        walkToken++;                 // stop any walk in progress
        try { stage.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      }
      var now = performance.now();
      st.v = (e.clientX - st.lastX) / Math.max(1, now - st.lastT);   // px per ms
      st.lastX = e.clientX; st.lastT = now;
      var x = Math.max(120, Math.min(SCENE.width - 120, st.px - dx / k));
      if (Math.abs(x - player.x) > 0.5) player.facing = x > player.x ? 1 : -1;
      player.x = x;
      player.moving = true;
      player.moved = true;
      render(now);
    });
    var up = function (e) {
      if (!st || e.pointerId !== st.id) return;
      var was = st;
      st = null;
      if (!was.on) return;
      swiped = Date.now();
      guideDid('walk');
      player.moving = false;
      var fling = -was.v * 260 / k;     // keep going a little in the swipe's direction
      if (Math.abs(fling) > 40 && performance.now() - was.lastT < 80) walkTo(player.x + fling);
      else { rest(); render(); }
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
  }

  function head(hKey, pKey) {
    return tr('h2', hKey, ' id="st-sheet-title"') + (pKey ? tr('p', pKey, ' class="st-lead"') : '');
  }

  // Product pictures: the database first (photo + cut-out set in admin's
  // Sản phẩm form), the maps above until it answers.
  function thumbOf(sku) {
    var i = window.GemBasket && window.GemBasket.info(sku);
    return (i && i.image) || (THUMB[sku] ? 'images/products/' + THUMB[sku] : null);
  }
  function cutoutOf(sku) {
    var i = window.GemBasket && window.GemBasket.info(sku);
    return (i && i.cutout) || (CUTOUT[sku] ? 'images/studio/sp/' + sku + '.webp' : null);
  }

  function productCard(sku) {
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    if (!info) return '';
    var out = !info.inStock;
    return '<li class="st-prod">' +
      '<img src="' + esc(thumbOf(sku) || cutoutOf(sku) || 'images/logo/gem_logo_icon_120.png') +
        '" alt="" loading="lazy" width="300" height="300">' +
      '<b>' + esc(info.name) + '</b>' +
      '<span class="st-price">' + esc(info.price) + '</span>' +
      (out
        ? '<button type="button" class="st-btn" disabled>' + esc(t('studio.out')) + '</button>'
        : pdChoices(info).length
          ? '<button type="button" class="st-btn" data-pd-open="' + esc(sku) + '">' +
            esc(t('basket.choose').replace('{x}', pdLabel(info).toLowerCase())) + '</button>'
          : '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>') +
      (designable(sku) && hasPlace('sewing')
        ? '<button type="button" class="st-link st-design-from" data-design-from="' + esc(sku) + '" data-i18n="studio.prod_design">' +
          esc(t('studio.prod_design')) + '</button>'
        : '') +
    '</li>';
  }

  // All the shelves in one sheet, one tab each (+ "Tất cả"): a shelf opens
  // on its own tab, and the others are a tap away.
  var SHOP_TABS = ['pegboard', 'display', 'cabinet', 'all'];
  // Which shelf a product stands on is set per product in admin (Kệ);
  // SHELVES above only covers the moment before the database answers.
  function shopSkus(tab) {
    var live = window.GemBasket && window.GemBasket.skus && window.GemBasket.skus();
    if (live) {
      return live.filter(function (sku) {
        var i = window.GemBasket.info(sku);
        return i && i.shelf && (tab === 'all' || i.shelf === tab);
      });
    }
    if (tab !== 'all') return SHELVES[tab] || [];
    var seen = {}, out = [];
    ['pegboard', 'display', 'cabinet'].forEach(function (k) {
      SHELVES[k].forEach(function (sku) { if (!seen[sku]) { seen[sku] = 1; out.push(sku); } });
    });
    return out;
  }

  function shelfSheet(id) {
    if (SHOP_TABS.indexOf(id) < 0) id = 'all';
    openSheet(
      '<h2 id="st-sheet-title" class="st-sr" data-i18n="studio.shop_h">' + esc(t('studio.shop_h')) + '</h2>' +
      '<div class="st-shop-tabs" role="tablist">' + SHOP_TABS.map(function (k) {
        var key = 'studio.shop_' + k;   // short tab names; the heading below says more
        return '<button type="button" role="tab" class="pt-tab st-shop-tab' + (k === id ? ' is-on' : '') + '" data-shop="' + k +
          '" aria-selected="' + (k === id) + '" data-i18n="' + key + '">' + esc(t(key)) + '</button>';
      }).join('') + '</div>' +
      '<div class="st-shop-body"></div>' +
      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>'
    );
    shopTab(id);
  }

  function shopTab(id) {
    var body = sheetBody.querySelector('.st-shop-body');
    if (!body) return;
    sheetBody.querySelectorAll('[data-shop]').forEach(function (b) {
      var on = b.getAttribute('data-shop') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on);
    });
    var lead = id === 'all' ? '' : t('studio.' + id + '_p');
    body.innerHTML = (id === 'all' ? '' : '<h3 class="st-shop-h">' + esc(t('studio.' + id + '_h')) + '</h3>') +
      (lead && lead !== 'studio.' + id + '_p' ? '<p class="st-lead">' + esc(lead) + '</p>' : '') +
      '<ul class="st-grid">' + shopSkus(id).map(productCard).join('') + '</ul>';
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
        esc(t('studio.door_go')) + '</button> ' +
        '<button type="button" class="st-link" data-out data-i18n="studio.go_out">' + esc(t('studio.go_out')) + '</button></p>'
    );
  }

  /* ---------- Góc thử đồ ----------
     The pieces the database offers to try on (products.wear, set in
     admin.html), in the shop's order, then the pieces sewn from one's own
     designs that were bought. The picture is the character picked at the
     door, wearing what it wears plus the piece tapped (no drawing per
     piece). A product with "Mẫu" is tried in one of them. */
  function wearables() {
    var B = window.GemBasket;
    if (!B) return [];
    var order = (B.skus() || []).concat(Object.keys(wearConf));
    return order.filter(function (sku, i) { return order.indexOf(sku) === i && wearConf[sku] && B.info(sku) && wearOf(tryId(sku)); });
  }
  function myDesigns() {
    if (!window.GemTu || !P || !W) return [];
    var out = [];
    window.GemTu.owned().forEach(function (o) {
      var id = 'd:' + o.spec;
      if (o.spec && out.indexOf(id) < 0 && wearOf(id)) out.push(id);
    });
    return out;
  }
  // a product as tried: the mẫu tried before, else the first in stock with
  // its own cut-out, else the first in stock
  function tryId(sku) {
    var info = window.GemBasket && window.GemBasket.info(sku);
    var cs = info && info.options && info.options.choices;
    if (!cs) return sku;
    var ch = cs.filter(function (c) { return c.key === tryOpt[sku]; })[0] ||
      cs.filter(function (c) { return !c.out && W.okImg(c.cut); })[0] ||
      cs.filter(function (c) { return !c.out; })[0] || cs[0];
    return sku + '/' + ch.key;
  }
  function choiceName(c) { return (lng() === 'en' && c.en) || c.vi; }

  function fittingSheet() {
    openSheet(
      head('studio.fitting_h', 'studio.fitting_p') +
      '<div class="fit">' +
        '<div class="fit-side">' +
          '<figure class="fit-model"><span class="fit-fr"></span><img class="fit-mac" alt="" hidden><figcaption class="fit-cap"></figcaption></figure>' +
          '<div class="fit-opts" role="group" hidden></div>' +
          '<p class="fit-wear"><button type="button" class="st-btn" data-wear></button>' +
            '<button type="button" class="st-btn st-btn-ghost fit-add" data-add></button></p>' +
          tr('p', 'studio.wear_note', ' class="fit-note"') +
        '</div>' +
        '<ul class="fit-list"></ul>' +
      '</div>'
    );
    renderFitting();
  }

  // a small picture of a piece for the list
  function wearThumb(it) {
    if (it.img) return '<img src="' + esc(it.img) + '" alt="" loading="lazy">';
    return '<span class="fit-svg">' + P.svg(it.d) + '</span>';
  }

  function renderFitting() {
    var root = sheetBody.querySelector('.fit');
    if (!root || !W) return;
    var list = wearables().map(tryId), mine = myDesigns(), all = list.concat(mine);
    if (!tryOn || !wearOf(tryOn)) tryOn = all[0] || null;
    var cur = tryOn && wearOf(tryOn), B = window.GemBasket;
    // the character, wearing what it wears with this piece in its slot
    var key = who + '-front', fr = root.querySelector('.fit-fr');
    fr.style.aspectRatio = String(W.AT[key] ? W.AT[key][0] : 0.3);
    fr.innerHTML = '<img src="' + charSrc(who, 'front') + '" alt="" draggable="false">' +
      wornHtml(key, wornItems(cur ? wearPut(worn.slice(), tryOn) : worn));
    // the scrunchie: its own drawing, as it always was (W.MAC)
    var mac = cur && !cur.spec && W.MAC[cur.sku], mi = root.querySelector('.fit-mac');
    fr.hidden = !!mac;
    mi.hidden = !mac;
    if (mac) mi.src = mac; else mi.removeAttribute('src');
    root.querySelector('.fit-cap').textContent = cur ? cur.name : '';
    // its "Mẫu", when it has them
    var info = cur && !cur.spec && B ? B.info(cur.sku) : null;
    var cs = info && info.options && info.options.choices, ob = root.querySelector('.fit-opts');
    ob.hidden = !cs;
    if (cs) {
      ob.innerHTML = '<span class="fit-opts-h"></span>' + cs.map(function (c) {
        var on = cur.opt === c.key;
        var can = !!wearOf(cur.sku + '/' + c.key);
        return '<button type="button" class="pt-chip' + (on ? ' is-on' : '') + (c.out ? ' is-out' : '') + '" data-try="' + esc(cur.sku + '/' + c.key) +
          '" aria-pressed="' + on + '"' + (can ? '' : ' disabled title="' + esc(t('studio.fitting_nocut')) + '"') + '></button>';
      }).join('');
      ob.querySelector('.fit-opts-h').textContent = (lng() === 'en' && info.options.label_en) || info.options.label_vi || '';
      ob.querySelectorAll('[data-try]').forEach(function (b, i) { b.textContent = choiceName(cs[i]); });
    }
    var wb = root.querySelector('[data-wear]'), wearing = !!cur && worn.indexOf(tryOn) >= 0;
    wb.hidden = !cur;
    wb.setAttribute('data-wear', tryOn || '');
    wb.textContent = t(wearing ? 'studio.wear_off' : 'studio.wear_on');
    wb.classList.toggle('is-added', wearing);
    // buy the very one tried (a design is bought already)
    var ab = root.querySelector('.fit-add'), sold = !info || !info.inStock || (cur.ch && cur.ch.out);
    ab.hidden = !cur || !!cur.spec;
    if (!ab.hidden) {
      ab.setAttribute('data-add', cur.sku);
      if (cur.opt) ab.setAttribute('data-opt', cur.opt); else ab.removeAttribute('data-opt');
      ab.disabled = sold;
      ab.textContent = t(sold ? 'studio.out' : 'studio.add');
    }
    var item = function (id) {
      var it = wearOf(id), on = tryOn && (id === tryOn || (!it.spec && it.sku === cur.sku && !cur.spec));
      var wore = worn.some(function (x) { var o = wearOf(x); return o && (x === id || (!it.spec && !o.spec && o.sku === it.sku)); });
      var have = it.spec || (window.GemTu && window.GemTu.owns(it.sku));
      return '<li class="fit-item' + (on ? ' is-on' : '') + '">' +
        '<button type="button" class="fit-pick" data-try="' + esc(id) + '" aria-pressed="' + !!on + '">' +
          (wore ? tr('i', 'studio.wear_tag', ' class="fit-worn"') : '') + wearThumb(it) + '<b></b></button>' +
        (have ? tr('span', it.spec ? 'studio.fitting_mine' : 'studio.fitting_have', ' class="st-lock-tag is-have"') : '') +
      '</li>';
    };
    var ul = root.querySelector('.fit-list');
    ul.innerHTML = list.map(item).join('') +
      (mine.length ? tr('li', 'studio.fitting_mine_h', ' class="fit-list-h"') + mine.map(item).join('') : '');
    ul.querySelectorAll('.fit-pick').forEach(function (b) {
      var it = wearOf(b.getAttribute('data-try'));
      b.querySelector('b').textContent = it ? it.name : '';
    });
  }


  /* ======================================================================
     ĐÀN TRANH — a "Khu vực" piece or tap box (act dantranh), out by the door.
     The Vietnamese zither, not the Chinese guzheng: 16 strings (the
     traditional one) or 19 (an improved one), tuned in hơi Bắc to the
     pentatonic Sol La Đô Rê Mi (the guzheng's is Rê Mi Fa# La Si). Dây Nam
     (Sol Si♭ Đô Rê Fa) and dây Đảo (Sol La Đô Rê Fa) move some strings up,
     as a player moves their bridges. No string plays the other notes: the
     left hand presses a string left of its bridge (nhấn) up to the next note
     of the hơi's seven (Bắc: Mi → Fa, La → Si). Here the part of the string
     left of its bridge does that — its small name says which note — and a
     string held after plucking slides up and back. Tông moves the whole
     đàn by half tones; the names stay (Đô is still the tonic). Names are
     Đô Rê Mi or the old Hò Xự Xang (counted from Hò = Sol). On a computer
     the home row then the row above play the strings, low to high; Shift
     presses. Bright steel strings and "Rung dây" (a slow, wide vibrato, on
     by default) make it sound Vietnamese. Low strings at the top, high at
     the bottom (nearest the player). The sound is made here, no audio
     files: a plucked string (Karplus-Strong) worked out the first time each
     pitch sounds. A string sounds when the finger crosses its line, not the
     edge of its row, so a finger resting on a string or between two plucks
     nothing more.
     ====================================================================== */
  var ZT_BASE = {   // hơi Bắc, tông Đô
    16: [146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00,          // D3 … D6
      440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66],
    19: [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63,  // A2 … E6
      392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51]
  };
  // move: half tones a string goes up from Bắc (by its note: 4 Mi, 9 La);
  // scale: the seven notes a pressed string goes up to.
  var ZT_HOI = {
    bac: { move: {}, scale: [0, 2, 4, 5, 7, 9, 11] },              // Sol La Đô Rê Mi: Mi → Fa, La → Si
    nam: { move: { 4: 1, 9: 1 }, scale: [0, 2, 3, 5, 7, 9, 10] },  // Sol Si♭ Đô Rê Fa (Nam Ai, Nam Xuân): Sol → La, Rê → Mi♭
    dao: { move: { 4: 1 }, scale: [0, 2, 4, 5, 7, 9, 10] }         // Sol La Đô Rê Fa: La → Si♭, Rê → Mi
  };
  var ZT_PC = { 0: 'Đô', 1: 'Đô♯', 2: 'Rê', 3: 'Mi♭', 4: 'Mi', 5: 'Fa', 6: 'Fa♯', 7: 'Sol', 8: 'La♭', 9: 'La', 10: 'Si♭', 11: 'Si' };
  var ZT_ABC = { 0: 'C', 1: 'C♯', 2: 'D', 3: 'E♭', 4: 'E', 5: 'F', 6: 'F♯', 7: 'G', 8: 'A♭', 9: 'A', 10: 'B♭', 11: 'B' };
  var ZT_HO = { 0: 'Hò', 2: 'Xự', 3: 'Xư', 5: 'Xang', 7: 'Xê', 9: 'Cống', 10: 'Phan' };   // half tones up from Hò (Sol)
  // the computer keys, string 1 (lowest) on: the home row, then the row above
  var ZT_KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon',
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
  var ZT_KEY_CAP = 'ASDFGHJKL;QWERTYUIOP';
  var ZT_BRIGHT = 0.42;   // the loop's averaging weight: under 0.5 = brighter, steel rather than silk
  var zt = { ctx: null, out: null, bufs: {}, rate: {}, nbuf: 0, kind: 16, hoi: 'bac', tone: 0, names: 'do', vib: true,
    run: 0, cur: null, loaded: false };

  // The visitor's last settings (this browser only).
  function ztLoad() {
    if (zt.loaded) return;
    zt.loaded = true;
    try {
      var o = JSON.parse(localStorage.getItem('gem-zt') || '{}');
      if (o.kind === 16 || o.kind === 19) zt.kind = o.kind;
      if (ZT_HOI[o.hoi]) zt.hoi = o.hoi;
      if (typeof o.tone === 'number' && Math.abs(o.tone) <= 6) zt.tone = Math.round(o.tone);
      if (o.names === 'do' || o.names === 'ho' || o.names === '') zt.names = o.names;
      if (typeof o.vib === 'boolean') zt.vib = o.vib;
    } catch (e) { /* private mode */ }
  }
  function ztSave() {
    try { localStorage.setItem('gem-zt', JSON.stringify({ kind: zt.kind, hoi: zt.hoi, tone: zt.tone, names: zt.names, vib: zt.vib })); } catch (e) { /* private mode */ }
  }

  function ztSemis(hz) { return Math.round(12 * Math.log(hz / 261.63) / Math.LN2); }   // from Đô 4
  function ztPcOf(semi) { return ((semi % 12) + 12) % 12; }
  // string i in the chosen hơi: half tones from Đô 4, tông left out
  function ztSemi(i) {
    var hz = ZT_BASE[zt.kind][i];
    if (!hz) return null;
    var s = ztSemis(hz);
    return s + (ZT_HOI[zt.hoi].move[ztPcOf(s)] || 0);
  }
  function ztHz(semi) { return 261.63 * Math.pow(2, (semi + zt.tone) / 12); }
  // nhấn: up to the next of the hơi's seven notes
  function ztPress(semi) {
    var pc = ztPcOf(semi), sc = ZT_HOI[zt.hoi].scale;
    for (var k = 0; k < sc.length; k++) if (sc[k] > pc) return sc[k] - pc;
    return 12 - pc;
  }
  // a string whose pressed note no string plays: Bắc's Mi and La
  function ztHasPress(i) {
    var semi = ztSemi(i), want = ztPcOf(semi + ztPress(semi));
    return !ZT_BASE[zt.kind].some(function (x, j) { return ztPcOf(ztSemi(j)) === want; });
  }
  function ztName(semi) {
    var pc = ztPcOf(semi);
    if (zt.names === 'ho') return ZT_HO[ztPcOf(pc - 7)] || ZT_PC[pc];
    return ZT_PC[pc];
  }
  function ztTonic(semi) { return ztPcOf(semi) === (zt.names === 'ho' ? 7 : 0); }   // Đô, or Hò: find your place
  function ztToneName() {
    var pc = ztPcOf(zt.tone);
    return lng() === 'en' ? ZT_ABC[pc] : ZT_PC[pc];
  }

  function ztAudio() {
    if (zt.ctx) return zt.ctx;
    // iPhone: let it sound with the silent switch on (Safari 17+)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    zt.ctx = audioCtx();   // shared with the shop bell
    if (!zt.ctx) return null;
    var lp = zt.ctx.createBiquadFilter(), comp = zt.ctx.createDynamicsCompressor(), g = zt.ctx.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 9500;
    g.gain.value = 0.55;
    lp.connect(comp); comp.connect(g); g.connect(zt.ctx.destination);
    zt.out = lp;
    return zt.ctx;
  }

  // A burst of noise going round a delay line one period long, averaged each
  // time: a string that fades in about two seconds. The line is a whole
  // number of samples, so playbackRate puts the pitch back exactly.
  function ztBuffer(hz) {
    var key = hz.toFixed(2);
    if (zt.bufs[key]) return zt.bufs[key];
    if (++zt.nbuf > 60) { zt.bufs = {}; zt.rate = {}; zt.nbuf = 1; }   // tông and hơi make new pitches: keep a few
    var sr = zt.ctx.sampleRate, S = ZT_BRIGHT;
    var N = Math.max(2, Math.floor(sr / hz)), len = Math.round(sr * 2.4);
    var buf = zt.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    var ring = new Float32Array(N), k;
    for (k = 0; k < N; k++) ring[k] = Math.random() * 2 - 1;   // a hard pick: the full burst
    var keep = Math.pow(0.01, 1 / (2.4 * hz));   // ~ -40 dB at the end, low or high
    for (k = 0; k < len; k++) {
      var a = ring[k % N], b = ring[(k + 1) % N];
      d[k] = a * 0.7;
      ring[k % N] = keep * ((1 - S) * a + S * b);
    }
    var tail = Math.round(sr * 0.06);
    for (k = 0; k < tail; k++) d[len - 1 - k] *= k / tail;   // no click at the end
    zt.rate[key] = (N - S) * hz / sr;   // the averaging shortens the loop by S of a sample
    zt.bufs[key] = buf;
    return buf;
  }

  // press: half tones the string is already pressed up (the part left of
  // its bridge, Shift on a computer): it slides up at once and stays.
  function ztPluck(i, press) {
    var ctx = ztAudio(), semi = ztSemi(i);
    if (!ctx || semi == null) return false;
    if (ctx.state === 'suspended') ctx.resume();
    var hz = ztHz(semi), s = ctx.createBufferSource(), now = ctx.currentTime;
    s.buffer = ztBuffer(hz);
    var r = zt.rate[hz.toFixed(2)];
    s.playbackRate.setValueAtTime(r, now);
    if (press) s.playbackRate.setTargetAtTime(r * Math.pow(2, press / 12), now + 0.015, 0.025);   // luyến: a quick slide up
    if (zt.vib && s.detune) {   // rung: the left hand rocking the string past the bridge
      var lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 4.6;
      depth.gain.setValueAtTime(0, now);
      depth.gain.setValueAtTime(0, now + 0.18);
      depth.gain.linearRampToValueAtTime(34, now + 0.6);   // cents
      lfo.connect(depth); depth.connect(s.detune);
      lfo.start(now); lfo.stop(now + 2.4);
    }
    s.connect(zt.out);
    s.start(now);
    zt.cur = { i: i, semi: semi, r: r, s: s, bent: !!press, held: !!press };
    return true;
  }

  // The name on a string says what it sounds while pressed.
  function ztLabel(root, i, semi) {
    var lab = root && root.querySelectorAll('.zt-name')[i];
    if (!lab) return;
    var open = ztSemi(i), pressed = semi !== open;
    lab.textContent = ztName(semi);
    lab.classList.toggle('is-bent', pressed);
  }

  // nhấn / luyến: a string held after plucking rises; let go and it slides
  // back. A string pressed from the start (left of its bridge) stays up.
  function ztBend(up, root) {
    var c = zt.cur;
    if (!c || !zt.ctx || c.bent === up || c.held) return;
    var now = zt.ctx.currentTime, by = ztPress(c.semi);
    c.s.playbackRate.cancelScheduledValues(now);
    c.s.playbackRate.setValueAtTime(c.s.playbackRate.value, now);
    c.s.playbackRate.setTargetAtTime(up ? c.r * Math.pow(2, by / 12) : c.r, now, up ? 0.09 : 0.06);
    c.bent = up;
    ztLabel(root, c.i, up ? c.semi + by : c.semi);
  }

  function ztShow(root, i, press) {
    var el = root.querySelectorAll('.zt-str')[i];
    if (!el) return;
    el.classList.remove('is-on', 'is-pressed');
    void el.offsetWidth;   // start the shake again
    el.classList.add('is-on');
    if (press) {
      el.classList.add('is-pressed');
      var semi = ztSemi(i);
      ztLabel(root, i, semi + press);
      clearTimeout(el.ztT);
      el.ztT = setTimeout(function () { el.classList.remove('is-pressed'); ztLabel(root, i, semi); }, 700);
    }
  }

  function ztStrings() {
    return ZT_BASE[zt.kind].map(function (x, i) {
      var semi = ztSemi(i), nm = ztName(semi), hz = ztHz(semi);
      var press = ztHasPress(i) ? ztName(semi + ztPress(semi)) : '';
      return '<button type="button" class="zt-str' + (ztTonic(semi) ? ' is-do' : '') + '" data-zt="' + i + '" data-hz="' + hz.toFixed(2) + '"' +
        (press ? ' data-press="' + esc(press) + '"' : '') + ' aria-label="' +
        esc(t('studio.zt_string').replace('{n}', i + 1) + ' · ' + nm) + '">' +
        '<span class="zt-name" aria-hidden="true">' + esc(nm) + '</span><span class="zt-line"></span><span class="zt-nhan"></span>' +
        (press ? '<span class="zt-press" aria-hidden="true">' + esc(press) + '</span>' : '') +
        (i < ZT_KEY_CAP.length ? '<span class="zt-key" aria-hidden="true">' + ZT_KEY_CAP[i] + '</span>' : '') + '</button>';
    }).join('');
  }

  function zitherSheet() {
    ztLoad();
    var opt = function (key, val, on) { return tr('option', key, ' value="' + val + '"' + (on ? ' selected' : '')); };
    openSheet(
      '<div class="zt-wrap">' +
        '<div class="zt-head">' + tr('h2', 'studio.zt_h', ' id="st-sheet-title"') +
          '<div class="zt-kind" role="group">' + [16, 19].map(function (n) {
            return '<button type="button" class="zt-kind-b" data-zt-kind="' + n + '" aria-pressed="' + (zt.kind === n) + '" data-i18n="studio.zt_k' + n + '">' +
              esc(t('studio.zt_k' + n)) + '</button>';
          }).join('') + '</div>' +
        '</div>' +
        tr('p', 'studio.zt_p', ' class="st-lead"') +
        '<div class="zt"><div class="zt-body' + (zt.names ? ' has-names' : '') + (ztKeysOn ? ' has-keys' : '') + '" data-n="' + zt.kind + '" role="group" aria-labelledby="st-sheet-title"></div></div>' +
        '<div class="zt-row zt-set">' +
          '<select class="zt-sel" data-zt-hoi data-i18n-attr="aria-label:studio.zt_hoi" aria-label="' + esc(t('studio.zt_hoi')) + '">' +
            opt('studio.zt_bac', 'bac', zt.hoi === 'bac') + opt('studio.zt_nam', 'nam', zt.hoi === 'nam') + opt('studio.zt_dao', 'dao', zt.hoi === 'dao') +
          '</select>' +
          '<div class="zt-tone" role="group" data-i18n-attr="aria-label:studio.zt_tone" aria-label="' + esc(t('studio.zt_tone')) + '">' +
            '<button type="button" data-zt-tone="-1" data-i18n-attr="aria-label:studio.zt_tone_dn" aria-label="' + esc(t('studio.zt_tone_dn')) + '">&minus;</button>' +
            '<span class="zt-tone-v" aria-live="polite">' + tr('span', 'studio.zt_tone') + ' <b data-zt-tone-n>' + esc(ztToneName()) + '</b></span>' +
            '<button type="button" data-zt-tone="1" data-i18n-attr="aria-label:studio.zt_tone_up" aria-label="' + esc(t('studio.zt_tone_up')) + '">+</button>' +
          '</div>' +
          '<select class="zt-sel" data-zt-names data-i18n-attr="aria-label:studio.zt_names" aria-label="' + esc(t('studio.zt_names')) + '">' +
            opt('studio.zt_n_do', 'do', zt.names === 'do') + opt('studio.zt_n_ho', 'ho', zt.names === 'ho') + opt('studio.zt_n_off', '', !zt.names) +
          '</select>' +
        '</div>' +
        '<div class="zt-row">' +
          '<button type="button" class="st-btn st-btn-sm" data-zt-run data-i18n="studio.zt_run">' + esc(t('studio.zt_run')) + '</button>' +
          '<label class="zt-vib"><input type="checkbox" data-zt-vib' + (zt.vib ? ' checked' : '') + '> <span data-i18n="studio.zt_vib">' + esc(t('studio.zt_vib')) + '</span></label>' +
        '</div>' +
        '<details class="zt-about">' + tr('summary', 'studio.zt_about') + tr('p', 'studio.zt_about_p') + tr('p', 'studio.zt_about_hoi') +
          tr('p', 'studio.zt_about_tone') + tr('p', 'studio.zt_about_ho') + tr('p', 'studio.zt_about_keys', ' class="zt-keys-p"') + '</details>' +
        tr('p', 'studio.zt_mute', ' class="zt-note zt-mute"') +
      '</div>', true);
    document.documentElement.classList.add('zt-open');   // the basket button would sit on the high strings
    var root = sheetBody.querySelector('.zt'), body = root.querySelector('.zt-body');
    function build() {
      body.innerHTML = ztStrings();
      body.setAttribute('data-n', zt.kind);
      var n = ZT_BASE[zt.kind].length;
      body.querySelectorAll('.zt-str').forEach(function (b, k) { b.style.setProperty('--b', (36 + k * 44 / (n - 1)) + '%'); });   // the bridges on a slant
      var tn = sheetBody.querySelector('[data-zt-tone-n]');
      if (tn) tn.textContent = ztToneName();
      ztSave();
    }
    build();
    if (!window.AudioContext && !window.webkitAudioContext) {
      sheetBody.querySelector('.zt-mute').textContent = t('studio.zt_none');
    }
    function play(i, press) { if (ztPluck(i, press)) ztShow(root, i, press); }
    // where each string's line and bridge are, in screen px (read at the
    // start of a touch: the sheet doesn't move under a finger on the board)
    var lines = [], bridges = [], gap = 0;
    function measure() {
      lines = []; bridges = [];
      Array.prototype.forEach.call(body.querySelectorAll('.zt-str'), function (b) {
        var r = b.getBoundingClientRect(), nh = b.querySelector('.zt-nhan').getBoundingClientRect();
        var x1 = nh.left + nh.width / 2, x0 = Math.max(b.querySelector('.zt-line').getBoundingClientRect().left, x1 - 96);
        lines.push(r.top + r.height / 2);
        bridges.push(b.hasAttribute('data-press') ? [x0, x1] : null);   // just left of the bridge, round its small name
      });
      gap = lines.length > 1 ? lines[1] - lines[0] : 30;
    }
    function nearest(y) {
      var best = 0;
      for (var n = 1; n < lines.length; n++) if (Math.abs(lines[n] - y) < Math.abs(lines[best] - y)) best = n;
      return best;
    }
    var down = false, lastY = 0, lastI = -1, away = false, hold = 0, eat = false, eatT = 0;
    function startHold() {
      clearTimeout(hold);
      hold = setTimeout(function () { if (down) ztBend(true, root); }, 260);
    }
    body.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try { body.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
      measure();
      down = true;
      eat = true;   // the click this press ends in has sounded already
      clearTimeout(eatT);
      lastY = e.clientY;
      lastI = nearest(e.clientY);
      away = false;
      // just left of a Mi or La string's bridge: Fa, Si (not on its name)
      var zone = bridges[lastI], press = zone && e.clientX > zone[0] && e.clientX < zone[1] ? ztPress(ztSemi(lastI)) : 0;
      play(lastI, press);
      if (!press) startHold();
    });
    body.addEventListener('pointermove', function (e) {
      if (!down) return;
      var y = e.clientY;
      if (!away && Math.abs(y - lines[lastI]) >= gap * 0.45) {
        away = true;   // left the string just played: no bend, and crossing it again plays it
        clearTimeout(hold);
        ztBend(false, root);
      }
      if (!away) { lastY = y; return; }   // a finger resting on it wobbles: not another pluck
      var lo = Math.min(lastY, y), hi = Math.max(lastY, y), hit = [];
      lines.forEach(function (c, n) { if (c > lo && c <= hi) hit.push(n); });
      if (y < lastY) hit.reverse();
      if (hit.length) {
        hit.forEach(function (n) { play(n, 0); });   // a sweep plays the open strings
        lastI = hit[hit.length - 1];
        away = Math.abs(y - lines[lastI]) >= gap * 0.45;
        if (!away) startHold();
      }
      lastY = y;
    });
    var up = function () {
      down = false; lastI = -1;
      clearTimeout(hold);
      ztBend(false, root);
      eatT = setTimeout(function () { eat = false; }, 500);   // a sweep ends in no click
    };
    body.addEventListener('pointerup', up);
    body.addEventListener('pointercancel', up);
    // keyboard: Enter / Space on a string. The click a finger or the mouse
    // makes at the end of its press (however long it was held) has already
    // sounded: let it go.
    body.addEventListener('click', function (e) {
      var b = e.target.closest('.zt-str');
      if (eat) { eat = false; return; }
      if (b) play(+b.getAttribute('data-zt'), 0);
    });
    // a computer's keys: A S D F G H J K L ; then Q W E R T Y U I O P, low to
    // high; Shift presses. The key names show on the strings once used.
    function onKey(e) {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      var i = ZT_KEYS.indexOf(e.code);
      if (i < 0 || i >= ZT_BASE[zt.kind].length) return;
      e.preventDefault();
      if (!ztKeysOn) { ztKeysOn = true; body.classList.add('has-keys'); }
      play(i, e.shiftKey ? ztPress(ztSemi(i)) : 0);
    }
    document.addEventListener('keydown', onKey);
    sheetBody.querySelector('.zt-kind').addEventListener('click', function (e) {
      var b = e.target.closest('[data-zt-kind]');
      if (!b) return;
      zt.kind = +b.getAttribute('data-zt-kind');
      zt.run++;
      sheetBody.querySelectorAll('[data-zt-kind]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      build();
    });
    sheetBody.querySelector('[data-zt-hoi]').addEventListener('change', function (e) {
      zt.hoi = ZT_HOI[e.target.value] ? e.target.value : 'bac';
      e.target.blur();   // the keys play the strings again
      build();
    });
    sheetBody.querySelector('.zt-tone').addEventListener('click', function (e) {
      var b = e.target.closest('[data-zt-tone]');
      if (!b) return;
      zt.tone = Math.max(-6, Math.min(6, zt.tone + +b.getAttribute('data-zt-tone')));
      build();
      play(ZT_BASE[zt.kind].length > 16 ? 6 : 4, 0);   // the Đô in the middle, so the new tông is heard
    });
    sheetBody.querySelector('[data-zt-vib]').addEventListener('change', function (e) { zt.vib = e.target.checked; ztSave(); });
    sheetBody.querySelector('[data-zt-names]').addEventListener('change', function (e) {
      zt.names = e.target.value === 'do' || e.target.value === 'ho' ? e.target.value : '';
      body.classList.toggle('has-names', !!zt.names);
      e.target.blur();
      build();
    });
    sheetBody.querySelector('[data-zt-run]').addEventListener('click', function () {
      var run = ++zt.run, n = 0;
      (function next() {
        if (run !== zt.run || !root.isConnected || n >= ZT_BASE[zt.kind].length) return;
        play(n++, 0);
        setTimeout(next, 55);
      })();
    });
  }
  var ztKeysOn = false;   // a key has played a string: show the key names
  function ztRelabel() {   // the language changed while the đàn is open
    var tn = sheetBody && sheetBody.querySelector('[data-zt-tone-n]');
    if (tn) tn.textContent = ztToneName();
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
  var D = { d: P ? P.blank('goi') : null, drawing: null, ink: 0, size: 0,
    held: null, basket: [], sewn: false, card: null, from: false, by: '', title: '',
    // real fabrics: the colour chip picked, and the order "Lục rổ" walks through
    vtone: '', pool: [], poolAt: 0, poolFor: null, realOk: false,
    // Kho vải: the fabrics picked for the basket, the colour chip there
    pick: [], ktone: '',
    // "Tâm trạng ngẫu nhiên": the palettes still to come this round
    mixBag: [] };

  function specNow() { return P.encode(D.d); }

  function lng() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  function pointsUsed() {
    return D.d.sketch.reduce(function (n, s) { return n + s.pts.length; }, 0);
  }

  // The real fabrics (Kho vải, fetched at start): the first open waits a
  // moment for them, so the piece isn't dressed in painted ones first.
  // false = not yet: fn runs once they are in (or after 1.5 s).
  var realWait = null;
  function withReal(fn) {
    if (D.realOk) return true;
    if (!realWait) {
      realWait = Promise.race([P.loadReal(), new Promise(function (r) { setTimeout(r, 1500); })])
        .then(function () { D.realOk = true; });
      realWait.then(fn);
    }
    return false;
  }

  // keep: the basket stays as it is (just filled from Kho vải)
  function designerSheet(keep) {
    if (!P) return;
    if (!withReal(function () { designerSheet(keep); })) return;
    // A fresh piece starts dressed in a mood rather than grey "Gem picks".
    if (!D.d.fab && !D.d.tones.length && !D.d.prints.length && D.d.layout !== 'tuve') P.applyMood(D.d, P.MOODS[0]);
    D.held = null; D.sewn = false; D.card = null; D.last = null; D.turnMsg = '';
    if (keep !== true || !D.basket.length) D.basket = basketFor(D.d);
    openSheet(
      head('studio.sewing_h', 'studio.sewing_p') +
      '<div class="pt">' +
        '<div class="pt-top">' +
          '<div class="pt-tabs" role="group" data-i18n-attr="aria-label:studio.pt_products" aria-label="' + esc(t('studio.pt_products')) + '"></div>' +
          '<button type="button" class="pt-help" data-pt="help" data-i18n-attr="aria-label:studio.pt_help|title:studio.pt_help" aria-label="' +
            esc(t('studio.pt_help')) + '" title="' + esc(t('studio.pt_help')) + '">?</button>' +
        '</div>' +
        '<div class="pt-left">' +
          '<div class="pt-shared" hidden></div>' +
          '<div class="pt-view">' +
            '<div class="pt-stage">' +
              '<div class="pt-board"></div>' +
              // turn the fabric of the patch last touched (45° steps); on
              // the piece's corner, so nothing below it moves
              '<button type="button" class="pt-turn" data-pt="turn" hidden data-i18n="studio.pt_turn">' + esc(t('studio.pt_turn')) + '</button>' +
              // "from my drawing": draw straight on the piece
              '<canvas class="pt-canvas" width="680" height="680" hidden data-i18n-attr="aria-label:studio.pt_draw" aria-label="' + esc(t('studio.pt_draw')) + '"></canvas>' +
              '<button type="button" class="gv-next" data-gv-next hidden data-i18n-attr="aria-label:studio.gv_next" aria-label="' + esc(t('studio.gv_next')) + '">›</button>' +
              '<img class="pt-sewer" alt="" draggable="false" hidden>' +
            '</div>' +
            '<div class="pt-drawbar" hidden>' +
              '<div class="pt-inks" role="group"></div>' +
              '<div class="pt-sizes" role="group" data-i18n-attr="aria-label:studio.pt_size" aria-label="' + esc(t('studio.pt_size')) + '"></div>' +
              '<button type="button" class="pt-tool pt-mini" data-pt="undo" data-i18n="studio.pt_undo">' + esc(t('studio.pt_undo')) + '</button>' +
              '<button type="button" class="pt-tool pt-mini" data-pt="clear" data-i18n="studio.pt_clear">' + esc(t('studio.pt_clear')) + '</button>' +
              '<p class="pt-small pt-draw-msg" aria-live="polite"></p>' +
            '</div>' +
            '<p class="pt-small pt-hint" aria-live="polite"></p>' +
            '<p class="pt-small pt-onpiece" hidden></p>' +
            // Udon the teacher + the real piece, in a row UNDER the piece so
            // nothing covers what is being designed
            '<div class="gv-row">' +
              '<div class="gv-udon" aria-hidden="true">' + GV_POSES.map(function (n, i) {
                return '<img src="images/studio/udon/ud-gv-' + n + '.webp" alt="" draggable="false" data-gv="' + n + '"' + (i ? ' hidden' : '') + '>';
              }).join('') + '</div>' +
              '<p class="gv-say" aria-live="polite"></p>' +
              // a real piece Gem has sewn, a small photo: tap to see it big
              '<button type="button" class="gv-polaroid" data-gv-zoom data-i18n-attr="aria-label:studio.gv_next" aria-label="' + esc(t('studio.gv_next')) + '">' +
                '<span class="gv-photo"><img alt="" draggable="false"></span>' +
                '<span class="gv-cap" data-i18n="studio.pt_real_cap">' + esc(t('studio.pt_real_cap')) + '</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pt-side">' +
          '<section class="pt-sec pt-sec-moods">' + tr('h3', 'studio.pt_moods', ' class="pt-label"') + '<div class="pt-moods" role="group"></div></section>' +
          '<section class="pt-sec pt-sec-basket">' +
            '<div class="pt-sec-row">' + tr('h3', 'studio.pt_basket', ' class="pt-label"') +
              '<span class="pt-sec-acts">' +
                '<button type="button" class="pt-tool pt-mini" data-pt="own" aria-expanded="false" data-i18n="studio.pt_own">' + esc(t('studio.pt_own')) + '</button>' +
                '<button type="button" class="pt-tool pt-mini" data-pt="rummage" data-i18n="studio.pt_rummage">' + esc(t('studio.pt_rummage')) + '</button>' +
                (P.hasReal() ? '<button type="button" class="pt-tool pt-mini pt-kho-b" data-pt="kho" data-i18n="studio.pt_kho">' + esc(t('studio.pt_kho')) + '</button>' : '') +
              '</span></div>' +
            '<p class="pt-small pt-basket-tip" aria-live="polite" hidden></p>' +
            '<div class="pt-vtones" role="group" hidden data-i18n-attr="aria-label:studio.pt_vt_label" aria-label="' + esc(t('studio.pt_vt_label')) + '"></div>' +
            '<div class="pt-basket"><div class="pt-scraps"></div>' +
              '<img class="pt-ro" src="' + P.VAI + 'ro-truoc.webp" alt="" draggable="false"></div>' +
          '</section>' +
          // own colour: a drawer over the foot of the screen, so the piece
          // and the basket stay where they are (Anna 22/10: opened in place
          // it pushed the basket a screen away from the piece). The
          // browser's colour picker + a few starting points.
          '<div class="pt-own" role="dialog" aria-labelledby="pt-own-t" hidden>' +
            '<div class="pt-own-top"><h3 class="pt-label" id="pt-own-t" data-i18n="studio.pt_own">' + esc(t('studio.pt_own')) + '</h3>' +
              '<button type="button" class="pt-own-x" data-pt="own" data-i18n-attr="aria-label:studio.pt_own_close" aria-label="' + esc(t('studio.pt_own_close')) + '">×</button></div>' +
            '<ol class="pt-own-steps">' + tr('li', 'studio.pt_own_s1') + tr('li', 'studio.pt_own_s2') + tr('li', 'studio.pt_own_s3') + '</ol>' +
            tr('p', 'studio.pt_own_h', ' class="pt-own-h"') +
            '<div class="pt-own-row">' +
              '<input type="color" name="own" value="#' + ownColour() + '" data-i18n-attr="aria-label:studio.pt_own_h" aria-label="' + esc(t('studio.pt_own_h')) + '">' +
              // the 27 basic colours as starting points
              P.BASIC.map(function (b) {
                return '<button type="button" class="pt-own-dot" data-own-pick="' + b.hex + '" style="background:#' + b.hex + '" aria-label="' +
                  esc(b[lng()]) + '" title="' + esc(b[lng()]) + '"></button>';
              }).join('') +
            '</div>' +
            '<button type="button" class="st-btn pt-own-go" data-own-go data-i18n="studio.pt_own_go">' + esc(t('studio.pt_own_go')) + '</button>' +
            tr('p', 'studio.pt_own_note', ' class="pt-small"') +
            // by colour, any print: which materials are fine (or Gem picks)
            tr('p', 'studio.pt_mats', ' class="pt-own-h"') + '<div class="pt-own-mats pt-chips pt-tags"></div>' +
          '</div>' +
          '<div class="pt-shapes pt-chips" role="group" hidden></div>' +
          '<section class="pt-sec pt-sec-layout">' +
            '<div class="pt-sec-row">' + tr('h3', 'studio.pt_layout', ' class="pt-label"') +
              '<span class="pt-sec-acts">' +
                '<button type="button" class="pt-tool pt-mini" data-pt="shuffle" data-i18n="studio.pt_shuffle">' + esc(t('studio.pt_shuffle')) + '</button>' +
                '<button type="button" class="pt-tool pt-mini" data-pt="random" data-i18n="studio.pt_random">' + esc(t('studio.pt_random')) + '</button>' +
              '</span></div>' +
            '<div class="pt-layouts pt-chips"></div></section>' +
          // size (usual / bigger / own) and the bag's options
          '<section class="pt-sec pt-opts">' + tr('h3', 'studio.pt_opts', ' class="pt-label"') +
            '<div class="pt-sizes-row pt-chips"></div>' +
            '<div class="pt-own-size" hidden>' +
              '<label>' + tr('span', 'studio.pt_size_w') + '<input type="number" name="cw" min="' + P.CUSTOM_CM[0] + '" max="' + P.CUSTOM_CM[1] + '" inputmode="numeric"></label>' +
              '<span aria-hidden="true">×</span>' +
              '<label>' + tr('span', 'studio.pt_size_hh') + '<input type="number" name="ch" min="' + P.CUSTOM_CM[0] + '" max="' + P.CUSTOM_CM[1] + '" inputmode="numeric"></label>' +
              tr('p', 'studio.pt_size_q', ' class="pt-small"') +
            '</div>' +
            '<div class="pt-bagopts pt-chips"></div>' +
          '</section>' +
          '<div class="pt-actions">' +
            '<span class="pt-price"></span>' +
            '<button type="button" class="pt-tool pt-add" data-pt="add" data-i18n="studio.pt_add">' + esc(t('studio.pt_add')) + '</button>' +
            '<button type="button" class="st-btn pt-sew" data-pt="sew" data-i18n="studio.pt_sew">' + esc(t('studio.pt_sew')) + '</button>' +
            '<p class="pt-small pt-price-lines"></p>' +
          '</div>' +
          // after "May xong": the name, the number and the card to share
          '<section class="pt-done" hidden aria-live="polite">' +
            '<input class="pt-done-name" name="title" maxlength="40" autocomplete="off" data-i18n-attr="aria-label:studio.pt_title_label" aria-label="' + esc(t('studio.pt_title_label')) + '">' +
            tr('p', 'studio.pt_title_hint', ' class="pt-small pt-title-hint"') +
            '<p class="pt-done-sub"></p>' +
            '<div class="pt-done-card"><img alt=""><span class="pt-small pt-card-wait" data-i18n="studio.pt_card_wait">' + esc(t('studio.pt_card_wait')) + '</span></div>' +
            '<label class="pt-byfield">' + tr('span', 'studio.pt_by_label', ' class="pt-label"') +
              '<input name="by" maxlength="24" autocomplete="nickname" data-i18n-attr="placeholder:studio.pt_by_ph" placeholder="' + esc(t('studio.pt_by_ph')) + '"></label>' +
            '<div class="pt-done-buy"><span class="pt-price"></span>' +
              '<button type="button" class="st-btn" data-pt="add" data-i18n="studio.pt_add">' + esc(t('studio.pt_add')) + '</button></div>' +
            '<div class="pt-done-acts">' +
              '<button type="button" class="pt-tool pt-share-main" data-pt="share-img" data-i18n="studio.pt_share_img">' + esc(t('studio.pt_share_img')) + '</button>' +
              '<button type="button" class="pt-tool" data-pt="link" data-i18n="studio.pt_share">' + esc(t('studio.pt_share')) + '</button>' +
              (window.GemTu ? '<button type="button" class="pt-tool" data-pt="keep" data-i18n="studio.pt_keep">' + esc(t('studio.pt_keep')) + '</button>' : '') +
            '</div>' +
          '</section>' +
          // a kraft note pinned at the end: all optional
          '<details class="pt-extra pt-letter"><summary><span class="pt-letter-h" data-i18n="studio.pt_letter">' + esc(t('studio.pt_letter')) + '</span>' +
            '<span class="pt-small" data-i18n="studio.pt_letter_p">' + esc(t('studio.pt_letter_p')) + '</span></summary>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_fabrics', ' class="pt-label"') + '<div class="pt-fabrics pt-chips pt-tags"></div>' +
            '<label class="pt-other">' + tr('span', 'studio.pt_other') +
              '<input name="other" maxlength="' + P.MAX_OTHER + '" autocomplete="off" data-i18n-attr="placeholder:studio.pt_other_ph" placeholder="' + esc(t('studio.pt_other_ph')) + '"></label>' +
          '</section>' +
          '<section class="pt-sec"><label class="pt-notefield">' + tr('span', 'studio.pt_note_label', ' class="pt-label"') +
            '<textarea name="note" rows="3" maxlength="' + P.MAX_NOTE + '" data-i18n-attr="placeholder:studio.pt_note_ph" placeholder="' + esc(t('studio.pt_note_ph')) + '"></textarea></label></section>' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_photo', ' class="pt-label"') +
            '<div class="pt-photo">' +
              '<label class="pt-polaroid-add"><span class="pt-polaroid-in"><span data-i18n="studio.pt_photo_add">' + esc(t('studio.pt_photo_add')) + '</span></span>' +
                '<input type="file" name="photo" accept="image/*" hidden></label>' +
              '<figure class="pt-photo-prev" hidden><img alt=""><figcaption></figcaption>' +
                '<button type="button" class="pt-tool pt-mini" data-pt="photo-del" data-i18n="studio.pt_photo_del">' + esc(t('studio.pt_photo_del')) + '</button></figure>' +
              tr('p', 'studio.pt_photo_p', ' class="pt-small"') +
              '<p class="pt-small pt-photo-msg" aria-live="polite"></p>' +
            '</div>' +
          '</section>' +
          tr('p', 'studio.pt_note', ' class="pt-note"') +
          '</details>' +
        '</div>' +
        introHtml() +
      '</div>',
      true
    );
    var root = sheetBody.querySelector('.pt');
    root.querySelector('[name="other"]').value = D.d.other;
    root.querySelector('[name="note"]').value = D.d.note;
    root.querySelector('[name="by"]').value = myName();
    bindCanvas(root.querySelector('.pt-canvas'));
    bindScrapDrag(root.querySelector('.pt-scraps'));
    if (keep !== true) D.dyeTip = false;
    renderDesigner();
    teach(gvRef ? 'ref' : 'hi');
    // the first time: what the table is for, in three steps
    guideLoad();
    if (keep !== true && !guide.off && !guide.seen.ban) introOpen(false);
  }

  // The design table's welcome (Anna 22/10: say what it does and how, in
  // steps 1-2-3): once, the first time it opens ("Bỏ qua hướng dẫn" ends it
  // with the other tips); "?" brings it back with what every button does.
  // Pictures from the studio's own drawings.
  function introHtml() {
    var step = function (n, ill) {
      return '<li class="pt-in-step">' + ill + '<span class="pt-in-txt"><b>' + n + '. ' + tr('span', 'studio.pt_in_' + n + 'h') + '</b>' +
        tr('span', 'studio.pt_in_' + n) + '</span></li>';
    };
    var hb = function (name, key) { return tr('dt', name) + tr('dd', key); };
    var goi = '<img src="' + P.VAI + 'mon-goi-bong.webp" alt="" draggable="false">';
    return '<div class="pt-intro" role="dialog" aria-modal="true" aria-labelledby="pt-in-h" hidden>' +
      '<div class="pt-in-card">' +
        '<button type="button" class="pt-own-x pt-in-x" data-pt="intro-go" data-i18n-attr="aria-label:studio.pt_own_close" aria-label="' +
          esc(t('studio.pt_own_close')) + '">×</button>' +
        '<img class="pt-in-udon" src="images/studio/udon/ud-gv-4.webp" alt="" draggable="false">' +
        tr('h3', 'studio.sewing_h', ' class="pt-in-h" id="pt-in-h"') +
        tr('p', 'studio.pt_in_p', ' class="pt-in-p"') +
        '<ol class="pt-in-steps">' +
          step(1, '<span class="pt-ill pt-ill-1" aria-hidden="true"><span class="pt-ill-tabs"><i></i><i></i><i></i></span>' + goi + '</span>') +
          step(2, '<span class="pt-ill pt-ill-2" aria-hidden="true">' + goi + '<span class="pt-ill-scrap"></span>' +
            '<img class="pt-ill-ro" src="' + P.VAI + 'ro-truoc.webp" alt="" draggable="false"></span>') +
          step(3, '<span class="pt-ill pt-ill-3" aria-hidden="true"><img src="images/studio/udon/ud-may.webp" alt="" draggable="false"></span>') +
        '</ol>' +
        '<details class="pt-in-more"><summary data-i18n="studio.pt_in_more">' + esc(t('studio.pt_in_more')) + '</summary><dl class="pt-hb">' +
          hb('studio.pt_rummage', 'studio.pt_hb_rummage') + hb('studio.pt_own', 'studio.pt_hb_own') +
          (P.hasReal() ? hb('studio.pt_kho', 'studio.pt_hb_kho') + hb('studio.pt_hb_tones_t', 'studio.pt_hb_tones') : '') +
          hb('studio.pt_turn', 'studio.pt_hb_turn') + hb('studio.pt_layout', 'studio.pt_hb_layout') +
          hb('studio.pt_moods', 'studio.pt_hb_moods') + hb('studio.pt_opts', 'studio.pt_hb_opts') +
          hb('studio.pt_hb_price_t', 'studio.pt_hb_price') +
        '</dl></details>' +
        '<button type="button" class="st-btn pt-in-go" data-pt="intro-go" data-i18n="studio.pt_in_go">' + esc(t('studio.pt_in_go')) + '</button>' +
      '</div></div>';
  }
  function introOpen(more) {
    var el = sheetBody.querySelector('.pt-intro');
    if (!el) return;
    el.hidden = false;
    el.querySelector('.pt-in-more').open = !!more;
    el.querySelector('.pt-in-go').focus({ preventScroll: true });
  }
  function introClose() {
    var el = sheetBody.querySelector('.pt-intro');
    if (el) el.hidden = true;
    guideLoad();
    guide.seen.ban = 1;
    guideSave();
  }

  // "Màu riêng": the drawer over the foot of the screen
  function ownOpen(on) {
    var box = sheetBody.querySelector('.pt-own'), b = sheetBody.querySelector('.pt-sec-acts [data-pt="own"]');
    if (!box) return;
    box.hidden = !on;
    if (b) b.setAttribute('aria-expanded', String(on));
    if (on) { D.dyeTip = false; renderBasketTip(); }
  }
  // after "Nhuộm vào rổ": a line over the basket until a scrap is laid
  function renderBasketTip() {
    var p = sheetBody.querySelector('.pt-basket-tip');
    if (!p) return;
    p.hidden = !D.dyeTip;
    p.textContent = D.dyeTip ? t('studio.pt_own_done') : '';
  }

  /* ---------- Kho vải (the real fabrics, for customers) ----------
     Every fabric Gem has in stock: pick up to 8 for your basket, then
     "Ghép thử" lays them on the piece at the design table. Opened from the
     table ("Kho vải") or from a "Khu vực" the owner sets to it. Names are
     staff's words: textContent only. */
  var KHO_MAX = 8;
  function khoSheet() {
    if (!P) return;
    if (!withReal(khoSheet)) return;
    if (!P.hasReal()) { designerSheet(); return; }
    var have = P.realList().map(function (f) { return f.key; });
    var inKho = function (k) { return have.indexOf(k) >= 0 || !!P.basicOf(k); };
    D.pick = (D.pick.length ? D.pick : D.basket.filter(inKho)).filter(inKho).slice(0, KHO_MAX);
    openSheet(
      head('studio.kho_h', 'studio.kho_p') +
      '<div class="kho">' +
        '<button type="button" class="pt-tool pt-mini kho-back" data-kho="back" data-i18n="studio.kho_back">' + esc(t('studio.kho_back')) + '</button>' +
        '<div class="pt-vtones" role="group" data-i18n-attr="aria-label:studio.pt_vt_label" aria-label="' + esc(t('studio.pt_vt_label')) + '"></div>' +
        '<ul class="kho-grid"></ul>' +
        '<div class="kho-bar">' +
          '<span class="kho-picked" aria-hidden="true"></span>' +
          '<span class="kho-n" aria-live="polite"></span>' +
          '<button type="button" class="pt-tool pt-mini" data-kho="clear" data-i18n="studio.kho_clear">' + esc(t('studio.kho_clear')) + '</button>' +
          '<button type="button" class="st-btn" data-kho="go" data-i18n="studio.kho_go">' + esc(t('studio.kho_go')) + '</button>' +
        '</div>' +
      '</div>',
      true
    );
    renderKho();
  }

  // a basic colour's tile: its dyed plain sheet once ready, the flat colour till then
  function basicTile(key) {
    var src = P.keySrc(key);
    return 'background-color:' + P.keyColor(key) + (src ? ';background-image:url(' + src + ')' : '');
  }

  function renderKho() {
    var root = sheetBody.querySelector('.kho');
    if (!root) return;
    var l = lng(), list = P.realList();
    var n = function (tn) { return list.filter(function (f) { return !tn || f.tone === tn; }).length; };
    // "Màu cơ bản" next to "Tất cả": colours by name, the cloth chosen with Gem
    root.querySelector('.pt-vtones').innerHTML = ['', 'basic'].concat(P.TONE_ORDER).filter(function (tn) { return !tn || tn === 'basic' || n(tn); }).map(function (tn) {
      var on = D.ktone === tn;
      return '<button type="button" class="pt-vtone' + (on ? ' is-on' : '') + '" data-ktone="' + tn + '" aria-pressed="' + on + '">' +
        esc(tn === 'basic' ? t('studio.kho_basic') : tn ? P.TONES[tn][l] : t('studio.pt_vt_all')) + ' <span>' + (tn === 'basic' ? P.BASIC.length : n(tn)) + '</span></button>';
    }).join('');
    var grid = root.querySelector('.kho-grid');
    grid.classList.toggle('is-basic', D.ktone === 'basic');
    if (D.ktone === 'basic') {
      // the six groups, each under its name (names are ours: plain text)
      grid.innerHTML = '<li class="kho-gp">' + esc(t('studio.kho_basic_p')) + '</li>' +
        P.BASIC_GROUPS.map(function (g, gi) {
          return '<li class="kho-grp"><span class="kho-gh">' + esc(g[l]) + '</span><span class="kho-sws">' +
            P.BASIC.filter(function (b) { return b.g === gi; }).map(function (b) {
              var on = D.pick.indexOf(b.key) >= 0;
              return '<button type="button" class="kho-f kho-c' + (on ? ' is-on' : '') + '" data-kho-f="' + b.key + '" aria-pressed="' + on + '">' +
                '<span class="kho-sw" style="' + basicTile(b.key) + '"></span><span class="kho-t"><b>' + esc(b[l]) + '</b></span></button>';
            }).join('') + '</span></li>';
        }).join('');
      renderKhoBar();
      return;
    }
    grid.innerHTML = list.filter(function (f) { return !D.ktone || f.tone === D.ktone; }).map(function (f) {
      var on = D.pick.indexOf(f.key) >= 0;
      return '<li><button type="button" class="kho-f' + (on ? ' is-on' : '') + '" data-kho-f="' + f.key + '" aria-pressed="' + on + '">' +
        '<img src="' + esc(f.src) + '" alt="" loading="lazy" draggable="false"><span class="kho-t"><b></b><span></span></span></button></li>';
    }).join('');
    grid.querySelectorAll('[data-kho-f]').forEach(function (b) {
      var f = P.realOf(b.getAttribute('data-kho-f'));
      b.querySelector('b').textContent = f[l];
      b.querySelector('.kho-t span').textContent = f.mat;
    });
    renderKhoBar();
  }

  function renderKhoBar(msg) {
    var root = sheetBody.querySelector('.kho');
    if (!root) return;
    root.querySelector('.kho-n').textContent = msg || t('studio.kho_n').replace('{n}', D.pick.length);
    root.querySelector('.kho-picked').innerHTML = D.pick.map(function (k) {
      var f = P.realOf(k);
      return f ? '<img src="' + esc(f.src) + '" alt="">' : P.basicOf(k) ? '<i style="' + basicTile(k) + '"></i>' : '';
    }).join('');
    root.querySelector('[data-kho="go"]').disabled = !D.pick.length;
    root.querySelector('[data-kho="clear"]').disabled = !D.pick.length;
  }

  var khoMsgTimer = null;
  function khoClick(e) {
    var el;
    if ((el = e.target.closest('[data-ktone]'))) {
      D.ktone = el.getAttribute('data-ktone');
      renderKho();
      return true;
    }
    if ((el = e.target.closest('[data-kho-f]'))) {
      var k = el.getAttribute('data-kho-f'), at = D.pick.indexOf(k);
      clearTimeout(khoMsgTimer);
      if (at < 0 && D.pick.length >= KHO_MAX) {
        renderKhoBar(t('studio.kho_full'));
        khoMsgTimer = setTimeout(function () { renderKhoBar(); }, 2400);
        return true;
      }
      if (at >= 0) D.pick.splice(at, 1); else D.pick.push(k);
      el.classList.toggle('is-on', at < 0);
      el.setAttribute('aria-pressed', String(at < 0));
      renderKhoBar();
      return true;
    }
    if ((el = e.target.closest('[data-kho]'))) {
      var a = el.getAttribute('data-kho');
      if (a === 'clear') { D.pick = []; renderKho(); }
      else if (a === 'back') designerSheet(true);
      else if (a === 'go' && D.pick.length) {
        // the picked fabrics become the basket and go onto the piece
        D.basket = D.pick.slice();
        D.vtone = ''; D.held = null; D.d.moodId = ''; D.dyeTip = false;
        if (D.d.layout === 'net') P.refit(D.d, D.basket);
        else if (D.d.layout !== 'tuve') P.arrange(D.d, D.basket);
        P.syncTaste(D.d);
        designerSheet(true);
      }
      return true;
    }
    return false;
  }

  /* ---------- Udon the teacher (Bàn thiết kế) ----------
     A board with a real piece Gem has sewn, so people picture the real
     thing, not just the drawing. Udon taps the board when the piece
     changes, pushes up the glasses to suggest a ready-made one in the same
     colours, and talks. Moves only when the customer changes something. */
  var GV_POSES = [1, 2, 3, 4];   // 1 point · 2 tap the board · 3 glasses · 4 talk
  var gvTimer = null, gvShow = null, gvPick = 0;
  var gvRef = null;   // a product the customer came from ("design one like this")

  function gvPose(n) {
    var box = sheetBody.querySelector('.gv-udon');
    if (box) box.querySelectorAll('img').forEach(function (im) { im.hidden = +im.getAttribute('data-gv') !== n; });
  }

  function gvBoard(sku, line) {
    var root = sheetBody.querySelector('.pt');
    if (!root || !thumbOf(sku)) return;
    var im = root.querySelector('.gv-photo img');
    im.src = thumbOf(sku);
    var info = window.GemBasket && window.GemBasket.info(sku);
    im.alt = info ? info.name : '';
    gvShow = sku;
    gvCap();
    root.querySelector('.gv-say').textContent = line;
    // a ready-made piece (not the one being designed): offer its card
    if (sku !== P.PRODUCTS[D.d.product].sku && sku !== gvRef) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gv-see';
      b.setAttribute('data-gv-see', sku);
      b.textContent = t('studio.gv_see');
      root.querySelector('.gv-say').appendChild(document.createTextNode(' '));
      root.querySelector('.gv-say').appendChild(b);
    }
  }

  // the caption says whose photo is on the board: this piece's own ("Đồ
  // thật"), or another ready-made one by its name (Anna 23/10: a bag under
  // "Đồ thật" on the coaster). Again as soon as the piece changes: the old
  // photo stays up while Udon taps the board for the new one.
  function gvCap() {
    var root = sheetBody.querySelector('.pt'), cap = root && root.querySelector('.gv-cap');
    if (!cap || !gvShow) return;
    if (gvShow === P.PRODUCTS[D.d.product].sku) { cap.setAttribute('data-i18n', 'studio.pt_real_cap'); cap.textContent = t('studio.pt_real_cap'); }
    else { cap.removeAttribute('data-i18n'); cap.textContent = nameOf(gvShow); }
  }

  function nameOf(sku) {
    var i = window.GemBasket && window.GemBasket.info(sku);
    return i ? i.name : sku;
  }

  // why: 'hi' (opened), 'product' (another piece), 'taste' (colours /
  // prints changed), 'next' (board tapped: next real photo)
  function teach(why) {
    var root = sheetBody.querySelector('.pt');
    if (!root) return;
    clearTimeout(gvTimer);
    gvCap();
    var sku = P.PRODUCTS[D.d.product].sku;
    var talk = function (show, key, other) {
      gvPose(4);
      gvBoard(show, t(key).replace('{mon}', nameOf(other || show)));
      gvTimer = setTimeout(function () { gvPose(1); }, 3200);
    };
    if (why === 'taste') {
      var like = similarTo(specNow()).filter(thumbOf);
      if (!like.length) return;
      gvPose(3);
      gvTimer = setTimeout(function () { talk(like[0], 'studio.gv_like'); }, reduceMotion ? 0 : 650);
      return;
    }
    if (why === 'ref') { var ref = gvRef; gvRef = null; talk(ref, 'studio.gv_ref'); return; }
    var show = sku, key = why === 'hi' ? 'studio.gv_hi' : 'studio.gv_this';
    if (why === 'next') {
      // the piece itself, then other real patchwork Gem has made
      var all = [sku].concat(REAL.filter(function (s) { return s !== sku && thumbOf(s); }));
      gvPick = (gvPick + 1) % all.length;
      show = all[gvPick];
      key = show === sku ? 'studio.gv_this' : 'studio.gv_other';
    } else {
      gvPick = 0;
    }
    if (reduceMotion || why === 'hi') { talk(show, key); return; }
    // two taps on the board, then the new photo
    var beats = [2, 1, 2], i = 0;
    (function beat() {
      if (i < beats.length) { gvPose(beats[i++]); gvTimer = setTimeout(beat, 170); return; }
      talk(show, key);
    })();
  }

  function chip(attr, id, on, label, icon) {
    return '<button type="button" class="pt-chip' + (on ? ' is-on' : '') + '" ' + attr + '="' + id +
      '" aria-pressed="' + on + '">' + (icon || '') + '<span>' + esc(label) + '</span></button>';
  }

  /* ---------- the scrap basket + fabric on each patch ----------
     The basket holds 8 scraps: the mood's palette, or what is on the piece
     topped up at random. Tap one to pick it up, then tap a patch; or drag
     it onto a patch. Tapping a patch with nothing picked up cycles it
     through the basket. Scraps are drawn in code until the painted fabric
     sheets arrive (see docs/design.md). */
  var BASKET_N = 8;
  // the painted scrap shapes (images/studio/vai/dang-1..9): a mask for the
  // fabric and a shading layer for the folds
  var SCRAP_SHAPES = 9;

  // A fabric key: 0..44 (the painted catalogue), "c<kind><hex>" (own colour)
  // or "r<id>" (a real fabric from Kho vải).
  function parseKey(str) { return /^\d+$/.test(str) ? +str : P.isCustom(str) || P.isReal(str) ? str : null; }

  function keysOn(d) {
    var out = [];
    for (var i = 0; i < (d.fab || '').length; i++) {
      var k = P.keyAt(d, i);
      if (out.indexOf(k) < 0) out.push(k);
    }
    return out;
  }

  function basketFor(d) {
    var m = P.moodOf(d);
    if (m) return P.moodKeys(m).slice(0, BASKET_N);
    return fillBasket(keysOn(d).slice(0, BASKET_N));
  }

  // The 9 kinds in the customer's own colour: the whole basket.
  function ownColour() {
    try { var h = localStorage.getItem('gem-own-colour'); if (/^[0-9a-f]{6}$/.test(h || '')) return h; } catch (e) { /* private mode */ }
    return '7a4fa0';
  }

  function ownBasket(hex) {
    var out = [];
    for (var k = 0; k < 9; k++) out.push('c' + k + hex);
    return out;
  }

  // Real fabrics: the basket holds only what Gem has (in stock, shown). A
  // colour chip narrows it; "Lục rổ" walks through all of them, 8 at a time.
  function realMode() { return !!(P && P.hasReal()); }
  function nextScraps(keep) {
    if (D.poolFor !== D.vtone || !D.pool.length) {
      D.pool = (D.vtone === 'basic' ? P.BASIC : P.realList().filter(function (f) { return !D.vtone || f.tone === D.vtone; }))
        .map(function (f) { return f.key; }).sort(function () { return Math.random() - 0.5; });
      D.poolAt = 0; D.poolFor = D.vtone;
    }
    var out = keep.slice(0, BASKET_N);
    for (var n = 0; n < D.pool.length && out.length < BASKET_N; n++) {
      var k = D.pool[D.poolAt++ % D.pool.length];
      if (out.indexOf(k) < 0) out.push(k);
    }
    return out;
  }

  function fillBasket(ids) {
    if (realMode()) return nextScraps(ids);
    var out = ids.slice();
    var tries = 0;
    while (out.length < BASKET_N && tries++ < 200) {
      var r = Math.floor(Math.random() * P.N_FABRICS);
      if (out.indexOf(r) < 0) out.push(r);
    }
    return out;
  }

  function fabricName(key) { return P.keyName(key, lng()); }
  // "Caro xanh lá · Cotton": a real fabric with what it is made of
  function fabricLabel(key) {
    var rf = P.realOf(key);
    return fabricName(key) + (rf && rf.mat ? ' · ' + rf.mat : '');
  }

  function scrapHtml(key, k) {
    var shape = P.VAI + 'dang-' + (k % SCRAP_SHAPES + 1) + '.webp';
    // an own colour not dyed yet: plain colour until gem:fabric says it's ready
    // (real photos and painted swatches are checked paths: no quotes inside)
    var src = P.keySrc(key);
    var bg = src ? 'background-image:url(' + src + ')' : 'background-color:' + P.keyColor(key);
    return '<span class="pt-sf" aria-hidden="true" style="' + bg +
      ';-webkit-mask-image:url(' + shape + ');mask-image:url(' + shape + ')"></span>' +
      '<img class="pt-ss" src="' + shape + '" alt="" draggable="false">';
  }

  function renderBasket() {
    var box = sheetBody.querySelector('.pt-scraps');
    if (!box) return;
    P.warm(D.basket);   // their big photos, before a scrap is dropped
    box.innerHTML = D.basket.map(function (id, k) {
      // standing loose in the basket: each a little turned and shifted
      var rot = ((k * 37) % 20) - 10, dy = (k % 3) * 4;
      return '<button type="button" class="pt-scrap' + (D.held === id ? ' is-held' : '') + (P.isReal(id) ? ' is-real' : '') + '" data-scrap="' + id +
        '" style="--r:' + rot + 'deg;--dy:' + dy + 'px" aria-pressed="' + (D.held === id) + '" aria-label="' + esc(fabricLabel(id)) +
        '" title="' + esc(fabricLabel(id)) + '">' + scrapHtml(id, k) + '</button>';
    }).join('');
    renderVTones();
    renderBasketTip();
  }

  // the colour chips over the basket (real fabrics only)
  function renderVTones() {
    var box = sheetBody.querySelector('.pt-vtones');
    if (!box) return;
    box.hidden = !realMode();
    if (box.hidden) return;
    var list = P.realList(), l = lng();
    var n = function (tn) { return list.filter(function (f) { return !tn || f.tone === tn; }).length; };
    box.innerHTML = ['', 'basic'].concat(P.TONE_ORDER).filter(function (tn) { return !tn || tn === 'basic' || n(tn); }).map(function (tn) {
      var on = D.vtone === tn;
      return '<button type="button" class="pt-vtone' + (on ? ' is-on' : '') + '" data-vtone="' + tn + '" aria-pressed="' + on + '">' +
        esc(tn === 'basic' ? t('studio.kho_basic') : tn ? P.TONES[tn][l] : t('studio.pt_vt_all')) + ' <span>' + (tn === 'basic' ? P.BASIC.length : n(tn)) + '</span></button>';
    }).join('');
  }

  // "Vải trên món: Caro xanh lá ×3, …" under the piece, once real fabrics are on it
  function renderOnPiece() {
    var el = sheetBody.querySelector('.pt-onpiece');
    if (!el) return;
    var on = keysOn(D.d), real = on.some(P.isReal), basic = on.some(P.basicOf);
    el.hidden = D.d.layout === 'tuve' || !(real || basic);
    if (el.hidden) return;
    el.innerHTML = '<b></b> <span></span> <span></span>';
    el.children[0].textContent = t('studio.pt_onpiece');
    el.children[1].textContent = P.fabricList(D.d, lng());
    el.children[2].textContent = t(!basic ? 'studio.pt_onpiece_p' : real ? 'studio.pt_onpiece_b' : 'studio.pt_onpiece_c');
  }

  function renderMoods() {
    var box = sheetBody.querySelector('.pt-moods');
    if (!box) return;
    var cur = P.moodOf(D.d), l = lng();
    var gem = !D.d.fab && D.d.tones[0] === P.GEM;
    var mix = !!cur && P.MOOD_POOL.indexOf(cur) >= 0;
    box.innerHTML = P.MOODS.map(function (m) {
      var on = cur === m;
      return '<button type="button" class="pt-mood' + (on ? ' is-on' : '') + '" data-mood="' + m.id + '" aria-pressed="' + on + '">' +
        '<img src="' + P.VAI + 'mood-' + m.id + '.webp" alt="" draggable="false"><span>' + esc(m[l]) + '</span></button>';
    }).join('') +
      // "Tâm trạng ngẫu nhiên": another palette of the pool each tap. No
      // drawing of its own: its picture is four of that palette's fabrics
      '<button type="button" class="pt-mood' + (mix ? ' is-on' : '') + '" data-mood="mix" aria-pressed="' + mix + '">' +
        '<span class="pt-mood-mix" aria-hidden="true">' + mixTiles(mix ? cur : null) + '</span><span>' +
        esc(mix ? t('studio.pt_mood_mix_on').replace('{m}', cur[l]) : t('studio.pt_mood_mix')) + '</span></button>' +
      // Gem picks the fabrics: the order note says so, the preview is a guess
      '<button type="button" class="pt-mood' + (gem ? ' is-on' : '') + '" data-mood="gem" aria-pressed="' + gem + '">' +
        '<img src="images/mascot/udon_portrait.png" alt="" draggable="false"><span>' + esc(t('studio.pt_mood_gem')) + '</span></button>';
  }

  // Two prints and two colours of a palette; none picked yet: a fabric
  // from each of four palettes, a mix ([palette, fabric]: no white one)
  function mixTiles(m) {
    var keys = m ? [5, 0, 1, 6].map(function (i) { return P.moodKeys(m)[i]; })
      : [[0, 5], [3, 0], [4, 0], [2, 5]].map(function (x) { return P.moodKeys(P.MOOD_POOL[x[0]])[x[1]]; });
    return keys.map(function (k) {
      if (k == null) return '<i></i>';
      var src = P.keySrc(k);
      return '<i style="background-color:' + P.keyColor(k) + (src ? ';background-image:url(' + src + ')' : '') + '"></i>';
    }).join('');
  }
  // the pool in a shuffled round: each palette once before any comes back,
  // never the one already on the piece
  function nextMix() {
    var cur = P.moodOf(D.d), other = function (m) { return m !== cur; };
    D.mixBag = D.mixBag.filter(other);
    if (!D.mixBag.length) D.mixBag = P.MOOD_POOL.filter(other).sort(function () { return Math.random() - 0.5; });
    return D.mixBag.shift();
  }

  function renderShared() {
    var box = sheetBody.querySelector('.pt-shared');
    if (!box) return;
    box.hidden = !D.from;
    if (!D.from) return;
    box.innerHTML = '<p class="pt-shared-h"></p><div class="pt-done-acts">' +
      '<button type="button" class="st-btn" data-pt="add" data-i18n="studio.pt_shared_order">' + esc(t('studio.pt_shared_order')) + '</button>' +
      '<button type="button" class="pt-tool" data-pt="mine" data-i18n="studio.pt_shared_mine">' + esc(t('studio.pt_shared_mine')) + '</button></div>';
    box.querySelector('.pt-shared-h').textContent = D.by
      ? t('studio.pt_shared_by').replace('{by}', D.by) : t('studio.pt_shared_anon');
  }

  // Something changed: the "sewn" card no longer matches.
  function unsew() {
    D.sewn = false; D.card = null;
    var done = sheetBody.querySelector('.pt-done');
    if (done) done.hidden = true;
  }

  function putFabric(i, id) {
    D.dyeTip = false;
    P.setPatch(D.d, i, id);
    P.syncTaste(D.d);
    D.last = null; D.turnMsg = '';   // dressing a patch does not pick it: no outline over the piece
    unsew();
    renderDesigner();
    var hit = sheetBody.querySelectorAll('.pt-board [data-i="' + i + '"]');
    hit.forEach(function (el) { el.classList.add('pt-pop'); });
  }

  // Turn patch i's fabric on by 45° (a stripe up-down -> on the slant ->
  // across -> the other slant -> back)
  function turnFabric(i) {
    P.turnPatch(D.d, i);
    D.last = i;
    var deg = P.rotAt(D.d, i) * P.TURN_STEP;   // round to 0 again: "straight", not "turned 0°"
    D.turnMsg = deg ? t('studio.pt_turned').replace('{deg}', deg) : t('studio.pt_turned0');
    unsew();
    renderDesigner();
  }

  // A tap on a patch. A scrap in hand goes on it. With nothing in hand (or
  // that very scrap already there) the patch is only picked: its fabric
  // stays, and "Xoay vải" turns it (Anna: "bấm ô vải sẽ đổi trước, lại phải
  // đổi lại cho đúng mảnh mong muốn rồi mới nhấn xoay vải được" — a tap used
  // to put the next scrap on, or turn it).
  function tapPatch(i) {
    if (D.held != null && P.keyAt(D.d, i) !== D.held) return putFabric(i, D.held);
    // tapped again: let go, the outline goes (Anna: "allow unselecting,
    // since the green square affects the visual")
    pickPatch(D.last === i ? null : i);
  }
  // pick patch i (outlined, what "Xoay vải" turns); null: none
  function pickPatch(i) {
    D.last = i; D.turnMsg = '';
    renderPreview();
    if (i != null) sheetBody.querySelectorAll('.pt-board [data-i="' + i + '"]').forEach(function (el) { el.classList.add('pt-pop'); });
  }

  // The piece's silhouette, read once per picture onto a 170 x 170 grid of
  // the 340 board. The fabric is laid under a mask, and a mask hides without
  // stopping taps: a patch runs on under the round coaster's corners, round
  // a bag. A tap there is beside the piece, not on that patch.
  var SIL = {};
  function silOf(src) {
    var m = SIL[src];
    if (m) return m;
    m = SIL[src] = { a: null, n: 170 };
    var im = new Image();
    im.onload = function () {
      var c = document.createElement('canvas');
      c.width = c.height = m.n;
      var g = c.getContext('2d');
      g.drawImage(im, 0, 0, m.n, m.n);
      try { m.a = g.getImageData(0, 0, m.n, m.n).data; } catch (x) { /* unreadable: every tap counts as on the piece */ }
    };
    im.src = src;
    return m;
  }
  function onPiece(cx, cy) {
    var s = P.silhouette ? P.silhouette(D.d) : null, svg = sheetBody.querySelector('.pt-board svg');
    if (!s || !svg) return true;
    var m = silOf(s.src);
    if (!m.a) return true;   // not read yet: as before
    var r = svg.getBoundingClientRect(), k = m.n / 340;
    var x = (cx - r.left) / r.width * 340, y = (cy - r.top) / r.height * 340;
    // 3 cells (6 units) of slack: a finger just off the edge still counts
    return s.dx.some(function (dx) {
      for (var j = -3; j <= 3; j++) for (var i = -3; i <= 3; i++) {
        var u = Math.floor((x - dx) * k) + i, v = Math.floor(y * k) + j;
        if (u >= 0 && v >= 0 && u < m.n && v < m.n && m.a[(v * m.n + u) * 4] > 127) return true;
      }
      return false;
    });
  }

  // Drag a scrap onto a patch. A short press without moving stays a tap.
  // Held near the top or the foot of the table (above the price bar), the
  // table scrolls under it, so a piece out of view can still be reached.
  var scrapDragged = 0, edge = { v: 0, raf: 0 };
  function edgeScroll(y) {
    var r = sheetEl.getBoundingClientRect(), foot = r.bottom, bar = sheetBody.querySelector('.pt-actions');
    if (bar && bar.offsetParent) foot = Math.min(foot, bar.getBoundingClientRect().top);
    var zone = 64;
    edge.v = y < r.top + zone ? -Math.ceil((r.top + zone - y) / 4) : y > foot - zone ? Math.ceil((y - foot + zone) / 4) : 0;
    if (edge.v && !edge.raf) edge.raf = requestAnimationFrame(edgeStep);
  }
  function edgeStep() {
    edge.raf = 0;
    if (!edge.v) return;
    sheetEl.scrollTop += edge.v;
    edge.raf = requestAnimationFrame(edgeStep);
  }
  function bindScrapDrag(box) {
    var st = null;
    box.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('[data-scrap]');
      if (!b || (e.pointerType === 'mouse' && e.button !== 0)) return;
      st = { b: b, id: parseKey(b.getAttribute('data-scrap')), x: e.clientX, y: e.clientY, ghost: null, pid: e.pointerId };
      P.warm([st.id]);
    });
    document.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.pid) return;
      if (!st.ghost) {
        if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 8) return;
        st.ghost = st.b.cloneNode(true);
        st.ghost.className = 'pt-scrap pt-ghost';
        document.body.appendChild(st.ghost);
        try { st.b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      }
      st.ghost.style.left = e.clientX + 'px';
      st.ghost.style.top = e.clientY + 'px';
      edgeScroll(e.clientY);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    var end = function (e) {
      if (!st || e.pointerId !== st.pid) return;
      var s0 = st; st = null;
      edge.v = 0;
      if (!s0.ghost) return;
      s0.ghost.remove();
      scrapDragged = Date.now();
      var under = document.elementFromPoint(e.clientX, e.clientY);
      var patch = under && under.closest && under.closest('.pt-board [data-i]');
      if (patch) putFabric(+patch.getAttribute('data-i'), s0.id);
      else if (under && under.classList && under.classList.contains('pt-canvas')) {
        var pu = D.d.layout === 'net' ? patchUnder(e.clientX, e.clientY) : null;
        putFabric(pu ? +pu.getAttribute('data-i') : 0, s0.id);
      }
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }

  // "May xong": a thread runs along every seam, the piece puffs up, Udon
  // cheers, then the name, the number and the card appear.
  function sew(btn) {
    var board = sheetBody.querySelector('.pt-board');
    if (!board || !board.querySelector('svg')) return;
    // the button sits low on the page: bring the piece (and Udon) into view
    // first, so the sewing and the cheer are seen
    var r = board.getBoundingClientRect(), sr = sheetEl.getBoundingClientRect();
    var off = r.top - sr.top - 24;
    if (Math.abs(off) > 40) {
      btn.disabled = true;
      sheetEl.scrollBy({ top: off, behavior: 'smooth' });
      setTimeout(function () { sewNow(btn, board); }, 450);
    } else sewNow(btn, board);
  }

  function sewNow(btn, board) {
    var svgEl = board.querySelector('svg');
    var reduce = reduceMotion;
    btn.disabled = true;
    btn.textContent = t('studio.pt_sewing');
    var seams = Array.prototype.slice.call(svgEl.querySelectorAll('.pt-seam'));
    var total = reduce ? 0 : 1800, n = Math.max(1, seams.length), step = total * 0.6 / n, each = 700;
    var sewer = sheetBody.querySelector('.pt-sewer');
    if (!reduce) {
      seams.forEach(function (el, k) {
        var th = el.cloneNode(false);
        th.removeAttribute('stroke-dasharray');
        th.setAttribute('class', 'pt-thread');
        th.setAttribute('pathLength', '1');
        th.setAttribute('fill', 'none');
        th.style.animationDelay = Math.round(k * step) + 'ms';
        el.parentNode.appendChild(th);
      });
      if (sewer) {
        sewer.src = 'images/studio/udon/ud-may.webp'; sewer.className = 'pt-sewer is-sewing'; sewer.hidden = false;
        board.parentNode.classList.add('is-sewing');   // the teacher Udon steps aside
      }
      needleRun(svgEl, seams, step, each, total);
    }
    setTimeout(function () {
      if (sewer && !reduce) {
        sewer.src = 'images/studio/udon/ud-reo.webp';
        sewer.className = 'pt-sewer is-cheer';
        setTimeout(function () { sewer.hidden = true; board.parentNode.classList.remove('is-sewing'); }, 2600);
      }
      setTimeout(function () {
        var done = sheetBody.querySelector('.pt-done');
        if (done && !done.hidden) done.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }, reduce ? 0 : 1700);
      board.classList.remove('is-puff');
      void board.offsetWidth;   // restart the animation
      board.classList.add('is-puff');
      svgEl.querySelectorAll('.pt-thread').forEach(function (th) { th.remove(); });
      btn.disabled = false;
      btn.textContent = t('studio.pt_sew');
      D.sewn = true;
      showDone();
      gvPose(2);
      // sewn: back to this piece's own photo (Udon no longer talks about another)
      var own = P.PRODUCTS[D.d.product].sku;
      if (gvShow !== own) gvBoard(own, '');
      var say = sheetBody.querySelector('.gv-say');
      if (say) say.textContent = t('studio.pt_done_say');
    }, total + (reduce ? 0 : 400));
  }

  // The needle rides along the seam being sewn (where the browser can
  // measure the shape; otherwise the thread alone is enough).
  function needleRun(svgEl, seams, step, each, total) {
    if (!seams.length) return;
    var nd = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    nd.setAttribute('href', 'images/studio/udon/kim-chi.webp');
    nd.setAttribute('width', '44'); nd.setAttribute('height', '50');
    nd.setAttribute('class', 'pt-needle');
    svgEl.appendChild(nd);
    var lens = seams.map(function (el) { try { return el.getTotalLength(); } catch (e) { return 0; } });
    var t0 = performance.now();
    (function frame(now) {
      var t = now - t0;
      if (t > total || !nd.isConnected) { nd.remove(); return; }
      var k = Math.min(seams.length - 1, Math.floor(t / step));
      var p = Math.min(1, (t - k * step) / each);
      try {
        var pt = seams[k].getPointAtLength(p * lens[k]);
        // the tip sits at the bottom-left of the picture
        nd.setAttribute('x', (pt.x - 5).toFixed(1));
        nd.setAttribute('y', (pt.y - 46).toFixed(1));
      } catch (e) { nd.remove(); return; }
      requestAnimationFrame(frame);
    })(t0);
  }

  function showDone() {
    var box = sheetBody.querySelector('.pt-done');
    if (!box) return;
    var spec = specNow(), l = lng();
    box.hidden = false;
    var nm = box.querySelector('.pt-done-name');
    if (document.activeElement !== nm) nm.value = titleNow();
    box.querySelector('.pt-done-sub').textContent = P.PRODUCTS[D.d.product][l] + ' · ' +
      t('studio.pt_serial').replace('{n}', P.serial(spec)) + (myName() ? ' · ' + t('studio.pt_by').replace('{by}', myName()) : '');
    makeCard();
  }

  // The design's name: the customer's own if they renamed it, else the mood's.
  function shareUrl() {
    var u = P.url(specNow(), myName(), (P.moodOf(D.d) || {}).id);
    var own = (D.title || '').trim();
    return own ? u + '&t=' + encodeURIComponent(own.slice(0, 40)) : u;
  }

  function titleNow() { return (D.title || '').trim() || P.title(D.d, lng()); }

  function myName() {
    try { return (localStorage.getItem('gem-designer') || '').slice(0, 24); } catch (e) { return ''; }
  }

  /* ---------- the card people share (1080 x 1920, story size) ----------
     Paper, the piece, its name and number, Udon, the link. Drawn ahead of
     the tap so the share sheet opens straight away (browsers only allow it
     right after a tap). Every text is drawn with fillText: nothing the
     customer typed reaches the page as HTML. */
  var cardJob = 0;
  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  // An SVG drawn into a canvas can't fetch its own images: put them inline
  // (as data: URLs, made here at run time) before drawing.
  var dataUrls = {};
  function toDataUrl(src) {
    if (dataUrls[src]) return dataUrls[src];
    dataUrls[src] = fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.readAsDataURL(b); });
    }).catch(function () { delete dataUrls[src]; return src; });
    return dataUrls[src];
  }
  function inlineImages(svgText) {
    var srcs = [];
    svgText.replace(/href="([^"]+)"/g, function (m, u) { if (srcs.indexOf(u) < 0 && !/^(data:|#)/.test(u)) srcs.push(u); return m; });
    return Promise.all(srcs.map(toDataUrl)).then(function (urls) {
      srcs.forEach(function (u, k) { svgText = svgText.split('href="' + u + '"').join('href="' + urls[k] + '"'); });
      return svgText;
    });
  }

  function makeCard() {
    var job = ++cardJob;
    var box = sheetBody.querySelector('.pt-done-card');
    if (box) { box.classList.add('is-wait'); }
    var spec = specNow(), d = D.d, l = lng();
    var fonts = document.fonts && document.fonts.load
      ? Promise.all(['600 120px "Dancing Script"', '800 44px Nunito', '500 36px "Be Vietnam Pro"'].map(function (f) {
          return document.fonts.load(f).catch(function () { return null; });
        }))
      : Promise.resolve();
    Promise.all([
      inlineImages(P.svg(d, { size: 820 })).then(function (txt) {
        return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt));
      }),
      loadImg(P.VAI + 'the-khung.webp'),
      fonts
    ]).then(function (r) {
      if (job !== cardJob) return;
      var c = document.createElement('canvas');
      c.width = 1080; c.height = 1920;
      var g = c.getContext('2d');
      g.fillStyle = '#F0E1D2'; g.fillRect(0, 0, 1080, 1920);
      if (r[1]) g.drawImage(r[1], 0, 0, 1080, 1920);   // painted frame: corners, text band, stamp
      g.textAlign = 'center';
      g.fillStyle = '#87965A';
      g.font = '800 38px Nunito, sans-serif';
      g.fillText('GEM STUDIO', 540, 150);
      g.fillStyle = '#5B6447';
      g.font = '500 26px "Be Vietnam Pro", sans-serif';
      fitText(g, t('studio.pt_card_foot'), 540, 194, 560);
      if (r[0]) {
        g.save();
        g.shadowColor = 'rgba(61,74,46,0.28)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
        g.drawImage(r[0], 130, 300, 820, 820);
        g.restore();
      }
      var by = myName();
      if (by) {
        g.font = '600 66px "Dancing Script", cursive';
        g.fillStyle = '#B5654A';
        fitText(g, t('studio.pt_by').replace('{by}', by), 540, 1290, 860);
      }
      // the paper band
      g.fillStyle = '#3D4A2E';
      g.font = '600 104px "Dancing Script", cursive';
      fitText(g, titleNow(), 530, 1560, 760);
      g.font = '500 36px "Be Vietnam Pro", sans-serif';
      g.fillStyle = '#5B6447';
      fitText(g, P.PRODUCTS[d.product][l] + ' · ' + t('studio.pt_serial').replace('{n}', P.serial(spec)), 530, 1630, 760);
      // the stamp
      g.save();
      g.translate(962, 1738); g.rotate(-0.16);
      g.fillStyle = '#B5654A';
      g.font = '800 30px Nunito, sans-serif';
      g.fillText('Gem', 0, -6);
      g.font = '600 24px "Be Vietnam Pro", sans-serif';
      g.fillText('#' + P.serial(spec), 0, 26);
      g.restore();
      c.toBlob(function (blob) {
        if (job !== cardJob || !blob) return;
        D.card = new File([blob], 'gem-mau-' + P.serial(spec) + '.png', { type: 'image/png' });
        var b2 = sheetBody.querySelector('.pt-done-card');
        if (!b2) return;
        var im = b2.querySelector('img');
        if (im.src && im.src.indexOf('blob:') === 0) URL.revokeObjectURL(im.src);
        im.src = URL.createObjectURL(blob);
        b2.classList.remove('is-wait');
      }, 'image/png');
    });
  }

  function fitText(g, text, x, y, max) {
    var size = parseInt(g.font.match(/(\d+)px/)[1], 10);
    while (g.measureText(text).width > max && size > 24) {
      size -= 4;
      g.font = g.font.replace(/\d+px/, size + 'px');
    }
    g.fillText(text, x, y);
  }

  // The picture itself to the share sheet (Instagram / Zalo take files);
  // where files can't be shared, the image is saved and the link copied.
  function shareCard(btn) {
    var url = shareUrl();
    var file = D.card;
    if (!file) return;
    var canFiles = false;
    try { canFiles = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (x) { /* old browser */ }
    if (canFiles) {
      navigator.share({ files: [file], title: t('studio.pt_share_title'), text: url }).catch(function () { /* closed */ });
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(function () { /* fine */ });
    flash(btn, 'studio.pt_copied', 'studio.pt_share_img');
  }

  function renderDesigner() {
    var root = sheetBody.querySelector('.pt');
    if (!root || !P) return;
    var l = lng(), d = D.d, prod = P.PRODUCTS[d.product];

    // pieces of one kind share a tab (the square coaster under "Lót cốc", the
    // bag shapes under "Túi"), the shape picked under it
    var tab = P.tabOf(d.product), group = P.groupOf(d.product);
    root.querySelector('.pt-tabs').innerHTML = P.PRODUCT_ORDER.map(function (id) {
      return '<button type="button" class="pt-tab' + (id === tab ? ' is-on' : '') +
        '" data-product="' + id + '" aria-pressed="' + (id === tab) + '">' + esc(P.tabName(id, l)) + '</button>';
    }).join('');
    var shapes = root.querySelector('.pt-shapes');
    shapes.hidden = group.length < 2;
    shapes.innerHTML = group.length < 2 ? '' : '<span class="pt-label">' + esc(t('studio.pt_shape')) + '</span>' +
      group.map(function (id) {
        var on = d.product === id;
        var ic = tab === 'lotcoc' ? '<span class="pt-shape-ic pt-shape-' + id + '" aria-hidden="true"></span>'
          : '<span class="pt-shape-pic" aria-hidden="true">' + P.svg(Object.assign(P.blank(id), { layout: 'mot', fab: d.fab ? d.fab[0] : '', cus: d.cus }), { size: 38 }) + '</span>';
        return '<button type="button" class="pt-chip' + (on ? ' is-on' : '') + '" data-shape="' + id + '" aria-pressed="' + on + '">' +
          ic + '<span>' + esc(P.PRODUCTS[id].short[l]) + '</span></button>';
      }).join('');
    var onTab = root.querySelector('.pt-tab.is-on');
    if (onTab) {   // keep the chosen piece in view in the scrolling row
      var row = onTab.parentNode;
      row.scrollLeft = onTab.offsetLeft - row.offsetLeft - (row.clientWidth - onTab.offsetWidth) / 2;
    }

    root.querySelector('.pt-layouts').innerHTML = prod.layouts.map(function (id) {
      var preview = Object.assign({}, d, { layout: id });
      var icon = id === 'net' && !d.sketch.length
        ? '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="#F3EAD8" stroke="#8A6A44" stroke-width="1.2"/><path d="M3 15C8 9 13 17 21 8" fill="none" stroke="#8A6A44" stroke-width="1.4" stroke-dasharray="2.2 1.8"/></svg>'
        : id === 'tuve' && !d.sketch.length
        ? '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M5 19l3-1L18 8l-2-2L6 16z" fill="none" stroke="#8A6A44" stroke-width="1.6" stroke-linejoin="round"/></svg>'
        : P.svg(preview, { size: 40 });
      return chip('data-layout', id, id === d.layout, P.layoutName(d.product, id, l), icon);
    }).join('');

    root.querySelector('.pt-fabrics').innerHTML = P.FABRIC_ORDER.map(function (id) {
      return chip('data-fabric', id, d.fabrics.indexOf(id) >= 0, P.FABRICS[id][l]);
    }).join('');
    // the same choice in "Màu riêng": materials that are fine, or Gem picks
    root.querySelector('.pt-own-mats').innerHTML = chip('data-fabric', P.GEM, !d.fabrics.length, t('studio.pt_mats_gem')) +
      P.FABRIC_ORDER.map(function (id) { return chip('data-fabric', id, d.fabrics.indexOf(id) >= 0, P.FABRICS[id][l]); }).join('');
    renderOpts();

    root.querySelector('.pt-inks').innerHTML = P.INKS.map(function (c, i) {
      return '<button type="button" class="pt-ink' + (i === D.ink ? ' is-on' : '') + '" data-ink="' + i +
        '" aria-pressed="' + (i === D.ink) + '" aria-label="' + esc(i === P.ERASER ? t('studio.pt_eraser') : t('studio.pt_ink') + ' ' + (i + 1)) +
        '"' + (i === P.ERASER ? ' title="' + esc(t('studio.pt_eraser')) + '"' : '') + ' data-eraser="' + (i === P.ERASER) +
        '"><span style="background:' + c + '"></span></button>';
    }).join('');
    root.querySelector('.pt-sizes').innerHTML = P.WIDTHS.map(function (w, i) {
      return '<button type="button" class="pt-size' + (i === D.size ? ' is-on' : '') + '" data-size="' + i +
        '" aria-pressed="' + (i === D.size) + '" aria-label="' + esc(t('studio.pt_size')) + ' ' + (i + 1) + '">' +
        '<span style="width:' + Math.round(4 + w * 3.4) + 'px;height:' + Math.round(4 + w * 3.4) + 'px"></span></button>';
    }).join('');
    // "from my drawing": the canvas over the piece + the pen bar under it
    var drawing = d.layout === 'tuve' || d.layout === 'net';
    root.querySelector('.pt-canvas').hidden = !drawing;
    root.querySelector('.pt-drawbar').hidden = !drawing;
    // cut lines have no colour or width: only undo / clear
    root.querySelector('.pt-drawbar').classList.toggle('is-net', d.layout === 'net');
    root.querySelector('.pt-stage').classList.toggle('is-drawing', drawing);

    renderMoods();
    renderBasket();
    renderShared();
    renderPreview();
  }

  // Size and the bag's options. Numbers typed for an own size are not
  // rebuilt here (the input keeps its caret); the rest is.
  function renderOpts() {
    var root = sheetBody.querySelector('.pt');
    if (!root) return;
    var d = D.d, l = lng(), p = P.PRODUCTS[d.product], e = d.ext, pr = P.PRICING.products[d.product] || {};
    var plus = function (n) { return n ? ' +' + (n / 1000) + 'k' : ''; };
    var sizes = P.sizesOf(d.product);
    root.querySelector('.pt-sizes-row').innerHTML = sizes.map(function (z, i) {
      return chip('data-psize', i, !e.c && e.s === i, P.sizeLabel(d.product, i, l) + plus((pr.sizes || [])[i]));
    }).join('') + chip('data-psize', 'c', !!e.c, t('studio.pt_size_own'));
    var own = root.querySelector('.pt-own-size');
    own.hidden = !e.c;
    if (e.c) {
      var iw = own.querySelector('[name="cw"]'), ih = own.querySelector('[name="ch"]');
      if (document.activeElement !== iw) iw.value = e.c[0];
      if (document.activeElement !== ih) ih.value = e.c[1];
    }
    var o = p.opts || '', bits = [];
    if (o.indexOf('q') >= 0) bits.push(chip('data-bagopt', 'q', e.q, t('studio.pt_quilt') + plus(pr.quilt)));
    if (o.indexOf('p') >= 0) {
      bits.push('<span class="pt-pockets"><span>' + esc(t('studio.pt_pockets')) + ': ' + esc(t('studio.pt_pocket_in')) +
        (e.p ? ' + ' + e.p + plus(e.p * (pr.pocket || 0)) : '') + '</span>' +
        '<button type="button" class="pt-tool pt-mini" data-pocket="-1"' + (e.p ? '' : ' disabled') + ' aria-label="' + esc(t('studio.pt_pocket_rm')) + '">−</button>' +
        '<button type="button" class="pt-tool pt-mini" data-pocket="1"' + (e.p >= P.MAX_POCKETS ? ' disabled' : '') + ' aria-label="' + esc(t('studio.pt_pocket_add')) + '">+</button></span>');
    }
    if (p.zip) bits.push('<span class="pt-chip pt-chip-fixed">' + esc(t('studio.pt_zip_in')) + '</span>');
    else if (o.indexOf('z') >= 0) bits.push(chip('data-bagopt', 'z', e.z, t('studio.pt_zip') + plus(pr.zip)));
    if (o.indexOf('n') >= 0) bits.push(chip('data-bagopt', 'n', e.n, t('studio.pt_snap') + plus(pr.snap)));
    // the tie bag: how it is tied on the shoulder
    if (p.ties) {
      bits.push('<span class="pt-label pt-ties-h">' + esc(t('studio.pt_ties')) + '</span>' + p.ties.map(function (k, i) {
        // a range (the bow): "+10–40k (tuỳ cỡ nơ)"
        var f = P.fee((pr.ties || [])[i]);
        return chip('data-tie', i, (e.t || 0) === i, P.TIES[k][l] + (f[1] > f[0]
          ? ' +' + f[0] / 1000 + '–' + f[1] / 1000 + 'k (' + P.tieWhy(k, l) + ')'
          : plus(f[0])));
      }).join(''));
    }
    // the strap / a bag's handle: a machine stitch down its middle (Gem's
    // Janome), which stitch and its thread; not drawn on the piece
    if (o.indexOf('e') >= 0) {
      bits.push(chip('data-emb', 1, !!e.e, P.embName(D.d.product, l) + plus(pr.embroider)));
      if (e.e) {
        bits.push('<span class="pt-label pt-ties-h">' + esc(t('studio.pt_emb_kind')) + '</span>' + P.STITCHES.map(function (st, i) {
          var icon = '<svg class="pt-stitch-ico" viewBox="-2 -1 48 18" aria-hidden="true">' + P.stitchIcon(i + 1) + '</svg>';
          return chip('data-stitch', i + 1, e.e === i + 1, st[l], icon);
        }).join(''));
        bits.push('<span class="pt-label pt-ties-h">' + esc(t('studio.pt_emb_thread')) + '</span>' +
          '<span class="pt-threads" role="group">' + P.THREADS.map(function (th, i) {
            return '<button type="button" class="pt-thread-dot' + (e.ec === i ? ' is-on' : '') + '" data-thread="' + i +
              '" style="background:' + th.c + '" aria-pressed="' + (e.ec === i) + '" aria-label="' + esc(th[l]) + '" title="' + esc(th[l]) + '"></button>';
          }).join('') + '</span>');
      }
    }
    var bag = root.querySelector('.pt-bagopts');
    bag.hidden = !bits.length;
    bag.innerHTML = bits.join('');
  }

  // The parts that change while typing / drawing, without rebuilding inputs.
  function renderPreview() {
    var root = sheetBody.querySelector('.pt');
    if (!root) return;
    var d = D.d, spec = specNow(), ok = P.isComplete(d);
    root.querySelector('.pt-board').innerHTML = P.svg(d, { title: esc(P.describe(d)), hit: true });
    var sil = P.silhouette ? P.silhouette(d) : null;
    if (sil) silOf(sil.src);   // read before the first tap (the board already loaded the picture)
    // the patch picked (tapped; tapped again, or a tap anywhere else, lets
    // go): outlined, and the one "Xoay vải" turns
    var sel = D.last != null && d.layout !== 'tuve' && D.last < P.slots(d) ? D.last : null;
    if (sel != null) root.querySelectorAll('.pt-board [data-i="' + sel + '"]').forEach(function (el) { el.classList.add('is-sel'); });
    var turnBtn = root.querySelector('.pt-turn');
    if (turnBtn) turnBtn.hidden = sel == null;
    // a short instruction when it matters; otherwise Udon's line shows
    var selKey = sel != null ? P.keyShown(d, sel) : null;
    root.querySelector('.pt-hint').textContent = D.turnMsg && sel != null ? D.turnMsg : d.layout === 'net' && D.held == null && sel == null ? t('studio.pt_net_on')
      : d.layout === 'tuve' ? t('studio.pt_draw_on')
      : D.held != null ? t('studio.pt_hint_held').replace('{vai}', fabricName(D.held).toLowerCase() +
          (P.realOf(D.held) && P.realOf(D.held).mat ? ' (' + P.realOf(D.held).mat + ')' : ''))
      : sel != null ? t('studio.pt_hint_sel').replace('{vai}', selKey != null ? fabricName(selKey) : t('studio.pt_vai_gem')) : '';
    renderOnPiece();
    drawCanvas();
    root.querySelector('[data-pt="undo"]').disabled = !d.sketch.length;
    root.querySelector('[data-pt="clear"]').disabled = !d.sketch.length;
    root.querySelector('.pt-draw-msg').textContent = d.layout === 'tuve' && !d.sketch.length
      ? t('studio.pt_draw_need')
      : pointsUsed() >= P.MAX_POINTS ? t('studio.pt_draw_full')
      : d.layout === 'net' && d.sketch.length > P.NET_QUOTE ? t('studio.pt_net_q') : '';

    // the attached photo: shown from this browser's own copy; a design opened
    // from someone's link only says there is one (only Gem can see it)
    var prev = root.querySelector('.pt-photo-prev');
    prev.hidden = !d.img;
    if (d.img) {
      var im = prev.querySelector('img');
      im.hidden = !photoUrls[d.img];
      if (photoUrls[d.img]) im.src = photoUrls[d.img];
      prev.querySelector('figcaption').textContent = t(photoUrls[d.img] ? 'studio.pt_photo_on' : 'studio.pt_photo_hidden');
    }

    // the design's own price (GemPatch.price: the same sum the order is
    // charged), what it is made of underneath
    var sku = P.PRODUCTS[d.product].sku;
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    var pr = P.price(d), l = lng(), mny = function (n) { return n.toLocaleString('vi-VN') + 'đ'; };
    root.querySelectorAll('.pt-price').forEach(function (el) {
      el.textContent = !pr ? (info ? info.price : '') : pr.quote ? t('studio.pt_from') + ' ' + mny(pr.total) : P.priceRange(pr.total, pr.max);
    });
    root.querySelector('.pt-price-lines').textContent = !pr ? '' : [t('studio.pt_base') + ' ' + mny(pr.base)]
      .concat(pr.lines.map(function (x) { return P.priceLine(x, l) + ' +' + P.priceRange(x.a, x.b); }))
      .concat(pr.waived ? [t('studio.pt_onefab')] : [])
      .concat(pr.netq ? [t('studio.pt_net_q')] : [])
      .concat(pr.sizeq ? [t('studio.pt_size_q')] : []).join(' · ');
    // made to order: a ready-made one being sold out doesn't stop a design
    root.querySelectorAll('[data-pt="add"]').forEach(function (add) { add.disabled = !ok || !info; });
    var keep = root.querySelector('[data-pt="keep"]');
    if (keep) keep.disabled = !ok;
    root.querySelector('[data-pt="sew"]').disabled = !ok;

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
  // Drawing: the finger's path is kept fine while drawing (grid cells, not
  // rounded) and drawn smooth; on lift it is simplified and snapped to the
  // grid the design code keeps (P.settle), so lines come out straight.
  function bindCanvas(cv) {
    var at = function (e) {
      var r = cv.getBoundingClientRect();
      return [Math.max(0, Math.min(P.GRID, (e.clientX - r.left) / r.width * P.GRID)),
              Math.max(0, Math.min(P.GRID, (e.clientY - r.top) / r.height * P.GRID))];
    };
    cv.addEventListener('pointerdown', function (e) {
      if (D.d.sketch.length >= P.MAX_STROKES || pointsUsed() >= P.MAX_POINTS) { renderPreview(); return; }
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      var net = D.d.layout === 'net';
      D.drawing = { c: net ? 0 : D.ink, w: net ? 0 : D.size || 0, pts: [], raw: [at(e)] };
      D.d.sketch.push(D.drawing);
      drawCanvas();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!D.drawing) return;
      var p = at(e), last = D.drawing.raw[D.drawing.raw.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.35) return;
      D.drawing.raw.push(p);
      drawCanvas();
    });
    var end = function (e) {
      if (!D.drawing) return;
      var st = D.drawing;
      D.drawing = null;
      if (D.d.layout === 'net') {
        // a tap, not a line: it's for the patch under the finger
        var xs = st.raw.map(function (q) { return q[0]; }), ys = st.raw.map(function (q) { return q[1]; });
        if (Math.max.apply(null, xs) - Math.min.apply(null, xs) < 1.2 && Math.max.apply(null, ys) - Math.min.apply(null, ys) < 1.2) {
          D.d.sketch.pop();
          drawCanvas();
          var pt = patchUnder(e.clientX, e.clientY);
          if (pt && !onPiece(e.clientX, e.clientY)) pt = null;   // under the mask, beside the piece
          if (pt) tapPatch(+pt.getAttribute('data-i'));
          else if (D.last != null) pickPatch(null);   // beside the piece: none picked
          return;
        }
      }
      st.pts = P.settle(st.raw);
      delete st.raw;
      // over the point budget: keep what fits
      var room = P.MAX_POINTS - (pointsUsed() - st.pts.length);
      if (st.pts.length > room) st.pts = st.pts.slice(0, Math.max(1, room));
      // a new cut line renumbers the patches: the picked one would outline another
      if (D.d.layout === 'net') { D.last = null; D.turnMsg = ''; refitNet(); unsew(); renderDesigner(); return; }
      renderPreview();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  // the patch under a point, looking through the drawing canvas
  function patchUnder(x, y) {
    var cv = sheetBody.querySelector('.pt-canvas');
    if (cv) cv.style.pointerEvents = 'none';
    var el = document.elementFromPoint(x, y);
    if (cv) cv.style.pointerEvents = '';
    return el && el.closest ? el.closest('.pt-board [data-i]') : null;
  }

  // the lines changed: as many fabrics as patches, the old ones kept
  function refitNet() {
    P.refit(D.d, D.basket);
    P.syncTaste(D.d);
    var msg = sheetBody.querySelector('.pt-draw-msg');
    if (msg) msg.textContent = P.netRegions(D.d.sketch).capped ? t('studio.pt_net_full').replace('{n}', P.NET_MAX) : '';
  }

  function drawCanvas() {
    var cv = sheetBody.querySelector('.pt-canvas');
    if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d'), s = cv.width / P.GRID;
    g.clearRect(0, 0, cv.width, cv.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    D.d.sketch.filter(function (st) { return !!st.raw; }).forEach(function (st) {
      g.strokeStyle = P.INKS[st.c];
      g.lineWidth = s * P.WIDTHS[st.w || 0];
      // a stroke in progress: its fine points (already in cells, no +0.5)
      var fine = !!st.raw;
      var X = function (v) { return (fine ? v : v + 0.5) * s; };
      g.stroke(new Path2D(P.smoothPath(fine ? st.raw : st.pts, X, X)));
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
    var url = shareUrl();
    var done = function () { flash(btn, 'studio.pt_copied', 'studio.pt_share'); };
    // phones: the share sheet (Zalo, Messenger…); else copy the link
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ title: t('studio.pt_share_title'), url: url }).catch(function () { /* closed */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('', url); });
    } else {
      window.prompt('', url);
    }
  }

  // The fabrics on the piece, as a palette to re-spread after the layout or
  // the piece changes (the number of patches changes with them).
  function paletteNow() {
    var ids = P.byUse(D.d);
    return ids.length ? ids : D.basket;
  }

  // Round / square coaster: the same product, another shape.
  function setShape(product) {
    var pal = paletteNow(), keep = D.d;
    D.d = P.blank(product);
    ['tones', 'prints', 'fabrics', 'other', 'note', 'sketch', 'img', 'ext'].forEach(function (k) { D.d[k] = keep[k]; });
    P.fitExt(D.d);
    D.d.layout = P.PRODUCTS[product].layouts.indexOf(keep.layout) >= 0 ? keep.layout : D.d.layout;
    if (keep.fab && D.d.layout !== 'tuve') { P.arrange(D.d, pal); D.d.moodId = keep.moodId; P.syncTaste(D.d); }
  }

  function designerClick(e) {
    var el, teachAfter = null, shuffled = false;
    if (e.target.classList && e.target.classList.contains('pt-intro')) { introClose(); return true; }
    // a patch tapped outside the piece's silhouette (it runs on under the
    // mask) is a tap beside the piece; a click from a script or the keyboard
    // has no point to test
    var hit = e.target.closest('.pt-board [data-i]');
    var beside = !!hit && !!e.detail && !onPiece(e.clientX, e.clientY);
    if (beside) hit = null;
    // the picked patch is only there for "Xoay vải": a tap anywhere else (a
    // bare spot, a scrap, another button) lets it go, and its outline with it
    // (Anna: "allow unselecting, since the green square affects the visual")
    if (D.last != null && !hit && !e.target.closest('[data-pt="turn"], .pt-canvas')) pickPatch(null);
    if (beside) return true;
    if (e.target.closest('[data-gv-next]')) { teach('next'); return true; }
    var stz = sheetBody.querySelector('.pt-view.is-zoom');
    if (stz && !e.target.closest('[data-gv-zoom], [data-gv-next]')) {
      stz.classList.remove('is-zoom');
      sheetBody.querySelector('.gv-next').hidden = true;
    }
    if (e.target.closest('[data-gv-zoom]')) {
      // the pinned photo: tap to see it big, tap again to put it back
      var st = sheetBody.querySelector('.pt-view');
      var big = st.classList.toggle('is-zoom');
      sheetBody.querySelector('.gv-next').hidden = !big;
      return true;
    }
    if ((el = e.target.closest('[data-scrap]'))) {
      if (Date.now() - scrapDragged < 350) return true;   // the end of a drag
      var sid = parseKey(el.getAttribute('data-scrap'));
      if (D.d.layout === 'tuve') { D.held = null; putFabric(0, sid); return true; }
      D.held = D.held === sid ? null : sid;
      renderBasket();
      renderPreview();
      return true;
    }
    if (hit) {
      tapPatch(+hit.getAttribute('data-i'));
      return true;
    }
    if ((el = e.target.closest('[data-shape]'))) {
      setShape(el.getAttribute('data-shape'));
      unsew(); renderDesigner();
      return true;
    }
    if ((el = e.target.closest('[data-own-go]'))) {
      var hex = (sheetBody.querySelector('[name="own"]').value || '').replace('#', '').toLowerCase();
      if (!/^[0-9a-f]{6}$/.test(hex)) return true;
      D.basket = ownBasket(hex);
      D.held = null;
      try { localStorage.setItem('gem-own-colour', hex); } catch (x) { /* private mode */ }
      // the drawer goes, the dyed basket shakes in view, a line says what next
      ownOpen(false);
      D.dyeTip = true;
      renderBasket(); renderPreview();
      var scr = sheetBody.querySelector('.pt-scraps');
      if (scr) {
        scr.classList.remove('is-rummage'); void scr.offsetWidth; scr.classList.add('is-rummage');
        sheetBody.querySelector('.pt-sec-basket').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      return true;
    }
    if ((el = e.target.closest('[data-vtone]'))) {
      D.vtone = el.getAttribute('data-vtone');
      D.dyeTip = false;
      D.basket = fillBasket([]);
      D.held = null;
      renderBasket(); renderPreview();
      var scv = sheetBody.querySelector('.pt-scraps');
      if (scv) { scv.classList.remove('is-rummage'); void scv.offsetWidth; scv.classList.add('is-rummage'); }
      return true;
    }
    if ((el = e.target.closest('[data-own-pick]'))) {
      sheetBody.querySelector('[name="own"]').value = '#' + el.getAttribute('data-own-pick');
      return true;
    }
    if ((el = e.target.closest('[data-mood]'))) {
      if (el.getAttribute('data-mood') === 'gem') {
        D.d.fab = ''; D.d.cus = []; D.d.rot = ''; D.d.moodId = ''; D.last = null;
        D.d.tones = [P.GEM]; D.d.prints = [P.GEM];
        D.basket = fillBasket([]);
        D.held = null;
        unsew(); renderDesigner(); teach('taste');
        return true;
      }
      var mood = el.getAttribute('data-mood') === 'mix' ? nextMix() : P.moodById(el.getAttribute('data-mood'));
      if (!mood) return true;
      P.applyMood(D.d, mood, true);
      D.basket = P.moodKeys(mood).slice(0, BASKET_N);
      D.vtone = '';
      D.held = null;
      unsew();
      renderDesigner();
      teach('taste');
      return true;
    }
    var see = e.target.closest('[data-gv-see]');
    if (see) { productSheet(see.getAttribute('data-gv-see')); return true; }
    if ((el = e.target.closest('[data-product]'))) {
      teachAfter = 'product';
      D.last = null;
      var keep = D.d, pal = paletteNow();
      D.d = P.blank(el.getAttribute('data-product'));
      // carry the taste over to the new piece
      D.d.tones = keep.tones; D.d.prints = keep.prints; D.d.fabrics = keep.fabrics;
      D.d.other = keep.other; D.d.note = keep.note; D.d.sketch = keep.sketch; D.d.img = keep.img;
      if (keep.layout === 'tuve') D.d.layout = 'tuve';
      // the same fabrics on the new piece, in its own pattern
      if (keep.fab) { P.arrange(D.d, pal); D.d.moodId = keep.moodId; P.syncTaste(D.d); }
    } else if ((el = e.target.closest('[data-layout]'))) {
      var pal2 = paletteNow();
      D.d.layout = el.getAttribute('data-layout');
      D.last = null;
      if (D.d.layout === 'net') { if (!D.d.fab) D.d.fab = ''; P.refit(D.d, pal2); P.syncTaste(D.d); }
      else if (D.d.fab) P.arrange(D.d, pal2);
    } else if ((el = e.target.closest('[data-tone]'))) {
      toggle('tones', el.getAttribute('data-tone'), P.MAX_TONES);
      D.d.fab = ''; D.d.rot = ''; D.last = null;   // the chips decide again
      D.basket = basketFor(D.d);
      teachAfter = 'taste';
    } else if ((el = e.target.closest('[data-print]'))) {
      toggle('prints', el.getAttribute('data-print'));
      D.d.fab = ''; D.d.rot = ''; D.last = null;
      D.basket = basketFor(D.d);
      teachAfter = 'taste';
    } else if ((el = e.target.closest('[data-fabric]'))) {
      // "Để Gem chọn" = no material named
      if (el.getAttribute('data-fabric') === P.GEM) D.d.fabrics = [];
      else toggle('fabrics', el.getAttribute('data-fabric'));
    } else if ((el = e.target.closest('[data-psize]'))) {
      var ps = el.getAttribute('data-psize'), ex = D.d.ext;
      if (ps === 'c') {
        var z0 = P.sizesOf(D.d.product)[ex.s] || P.sizesOf(D.d.product)[0];
        ex.c = ex.c || [z0.w, z0.h];
        ex.s = 0;
      } else { ex.c = null; ex.s = +ps; }
    } else if ((el = e.target.closest('[data-bagopt]'))) {
      var bo = el.getAttribute('data-bagopt');
      D.d.ext[bo] = !D.d.ext[bo];
    } else if ((el = e.target.closest('[data-emb]'))) {
      // on: the first stitch, cream thread (or what was picked before)
      D.d.ext.e = D.d.ext.e ? 0 : (D.embWas || 1);
    } else if ((el = e.target.closest('[data-stitch]'))) {
      D.d.ext.e = D.embWas = +el.getAttribute('data-stitch');
    } else if ((el = e.target.closest('[data-thread]'))) {
      D.d.ext.ec = +el.getAttribute('data-thread');
    } else if ((el = e.target.closest('[data-tie]'))) {
      // lace ribbon is not sewn from the basket: one fabric slot fewer
      D.d.ext.t = +el.getAttribute('data-tie');
      if (D.d.fab && D.d.fab.length !== P.slots(D.d)) { P.arrange(D.d, paletteNow()); P.syncTaste(D.d); }
    } else if ((el = e.target.closest('[data-pocket]'))) {
      D.d.ext.p = Math.max(0, Math.min(P.MAX_POCKETS, D.d.ext.p + (+el.getAttribute('data-pocket'))));
    } else if ((el = e.target.closest('[data-ink]'))) {
      D.ink = +el.getAttribute('data-ink');
    } else if ((el = e.target.closest('[data-size]'))) {
      D.size = +el.getAttribute('data-size');
    } else if ((el = e.target.closest('[data-pt]'))) {
      var act = el.getAttribute('data-pt');
      if (act === 'turn') {
        if (D.last != null) turnFabric(D.last);
        return true;
      }
      if (act === 'undo') {
        D.d.sketch.pop();
        if (D.d.layout === 'net') refitNet();
      } else if (act === 'clear') {
        D.d.sketch = [];
        if (D.d.layout === 'net') refitNet();
      } else if (act === 'photo-del') {
        D.d.img = '';
      } else if (act === 'random') {
        // any palette, the pool's too
        var all = P.MOODS.concat(P.MOOD_POOL), rm = all[Math.floor(Math.random() * all.length)];
        var lays = P.PRODUCTS[D.d.product].layouts.filter(function (x) { return x !== 'tuve'; });
        D.d.layout = lays[Math.floor(Math.random() * lays.length)];
        P.suggest(D.d, rm);
        D.basket = P.moodKeys(rm).slice(0, BASKET_N);
        D.vtone = '';
        D.held = null;
        shuffled = true;
        teachAfter = 'taste';
      } else if (act === 'shuffle') {
        if (D.d.layout === 'tuve') return true;
        // another suggestion of the piece's mood; more than three fabrics
        // (the customer's own choice) change places; else two or three
        // from the basket
        var sm = P.moodOf(D.d), on = P.byUse(D.d);
        if (sm && on.length <= 3) P.suggest(D.d, sm);
        else { if (on.length > 3) P.scatter(D.d, on); else P.pick(D.d, D.basket); P.syncTaste(D.d); }
        shuffled = true;
      } else if (act === 'own') {
        ownOpen(sheetBody.querySelector('.pt-own').hidden);
        return true;
      } else if (act === 'help') {
        introOpen(true);
        return true;
      } else if (act === 'intro-go') {
        introClose();
        return true;
      } else if (act === 'rummage') {
        D.dyeTip = false;
        D.basket = fillBasket([]);
        D.held = null;
        renderBasket();
        renderPreview();
        var sc = sheetBody.querySelector('.pt-scraps');
        if (sc) { sc.classList.remove('is-rummage'); void sc.offsetWidth; sc.classList.add('is-rummage'); }
        return true;
      } else if (act === 'kho') {
        khoSheet();
        return true;
      } else if (act === 'sew') {
        sew(el);
        return true;
      } else if (act === 'share-img') {
        shareCard(el);
        return true;
      } else if (act === 'mine') {
        D.from = false;
        renderShared();
        return true;
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
    unsew();
    renderDesigner();
    if (shuffled) {
      var bd = sheetBody.querySelector('.pt-board');
      if (bd) { bd.classList.remove('is-shuffle'); void bd.offsetWidth; bd.classList.add('is-shuffle'); }
    }
    if (teachAfter) teach(teachAfter);
    return true;
  }

  /* ---------- reference photo ----------
     Shrunk in the browser (longest side 1280 px, JPEG) so phone photos
     upload fast, then sent to the private gem-design bucket. Only its random
     name goes into the design code. */
  var photoUrls = {};   // name -> blob URL of this browser's own copy
  function shrink(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sc = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
        var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // PNG transparency → white
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.85;
        (function out() {
          c.toBlob(function (b) {
            if (!b) return rej(new Error('encode'));
            if (b.size > 1400000 && q > 0.5) { q -= 0.15; return out(); }
            res(b);
          }, 'image/jpeg', q);
        })();
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('not an image')); };
      img.src = url;
    });
  }

  function designerPhoto(input) {
    var file = input.files && input.files[0];
    var msg = sheetBody.querySelector('.pt-photo-msg');
    input.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { msg.textContent = t('studio.pt_photo_bad'); return; }
    if (!window.GemDB || !window.GemDB.uploadDesignPhoto) { msg.textContent = t('studio.pt_photo_fail'); return; }
    msg.textContent = t('studio.pt_photo_wait');
    shrink(file).then(function (blob) {
      return window.GemDB.uploadDesignPhoto(blob).then(function (name) {
        photoUrls[name] = URL.createObjectURL(blob);
        D.d.img = name;
        msg.textContent = '';
        renderDesigner();
      });
    }).catch(function () { msg.textContent = t('studio.pt_photo_fail'); });
  }

  var byTimer = null;
  function designerInput(e) {
    var n = e.target.name;
    if (n === 'title') {
      D.title = e.target.value.slice(0, 40);
      clearTimeout(byTimer);
      byTimer = setTimeout(function () { if (D.sewn) makeCard(); }, 500);
      return;
    }
    if (n === 'by') {
      try { localStorage.setItem('gem-designer', e.target.value.trim().slice(0, 24)); } catch (x) { /* private mode */ }
      clearTimeout(byTimer);
      byTimer = setTimeout(function () { if (D.sewn) showDone(); }, 500);
      return;
    }
    if (n === 'cw' || n === 'ch') {
      // an own size: whole cm in range, else the last good number stays
      var v = Math.round(+e.target.value), c = D.d.ext.c;
      if (!c || !(v >= P.CUSTOM_CM[0] && v <= P.CUSTOM_CM[1])) return;
      c[n === 'cw' ? 0 : 1] = v;
      unsew();
      renderOpts();
      renderPreview();
      return;
    }
    if (n !== 'other' && n !== 'note') return;
    D.d[n] = e.target.value.slice(0, n === 'other' ? P.MAX_OTHER : P.MAX_NOTE);
    unsew();
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
        : thumbOf(o.sku) ? '<img src="' + esc(thumbOf(o.sku)) + '" alt="" loading="lazy" width="160" height="160">'
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

  /* ---------- drag & drop: Udon, and products off the shelves ----------
     A copy of the picture follows the finger inside the stage (not on
     <body>: a fixed element past the screen edge made Chrome on Android zoom
     out). Dropped on the character (the cart) or on the basket = handled by
     opts.drop; anywhere else it glides back. */
  function overEl(el, x, y, pad) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    pad = pad || 0;
    return r.width > 0 && x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  }
  function overCart(x, y) { return overEl(frameEls[player.frame], x, y, 30); }
  function overBasket(x, y) { return overEl(document.querySelector('.gb-widget'), x, y, 16); }

  function dragFrom(e, img, opts) {
    var sr = stage.getBoundingClientRect(), r = img.getBoundingClientRect();
    var ghost = null, x0 = e.clientX, y0 = e.clientY, id = e.pointerId;
    var move = function (ev) {
      if (ev.pointerId !== id) return;
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!ghost) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        ghost = img.cloneNode();
        ghost.removeAttribute('hidden');
        ghost.className = 'st-udon-ghost is-dragging';
        ghost.style.left = (r.left - sr.left) + 'px';
        ghost.style.top = (r.top - sr.top) + 'px';
        ghost.style.width = r.width + 'px';
        stage.appendChild(ghost);
        if (opts.start) opts.start();
      }
      ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.08)';
      stage.classList.toggle('is-drop-ok', opts.where ? !!opts.where(ev.clientX, ev.clientY)
        : overCart(ev.clientX, ev.clientY) || overBasket(ev.clientX, ev.clientY));
    };
    var up = function (ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      stage.classList.remove('is-drop-ok');
      swiped = Date.now();   // the click that follows is ours, not a walk / hotspot
      if (!ghost) { if (opts.tap) opts.tap(); return; }
      var where = opts.where ? opts.where(ev.clientX, ev.clientY)
        : overBasket(ev.clientX, ev.clientY) ? 'basket' : overCart(ev.clientX, ev.clientY) ? 'cart' : null;
      if (where && opts.drop(where, ghost)) return;
      // not dropped anywhere useful: back where it came from
      var t = ghost.style.transform;
      ghost.animate([{ transform: t }, { transform: 'translate(0,0) scale(1)' }], { duration: 260, easing: 'ease-out' }).onfinish = function () {
        ghost.remove();
        if (opts.cancel) opts.cancel();
      };
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  // Fly an element (in the stage) from where it is now to a screen rect.
  function flyTo(el, rect, scale, then) {
    var a = el.getBoundingClientRect();
    var dx = rect.left + rect.width / 2 - (a.left + a.width / 2);
    var dy = rect.top + rect.height / 2 - (a.top + a.height / 2);
    var from = el.style.transform || 'none';
    var base = new DOMMatrix(from === 'none' ? undefined : from);
    var end = 'translate(' + (base.e + dx) + 'px,' + (base.f + dy) + 'px) scale(' + scale + ')';
    var anim = el.animate([{ transform: from }, { transform: end }], { duration: reduceMotion ? 1 : 320, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = function () { if (then) then(); };
  }

  /* ---------- products on the shelves: tap for the card, drag into the basket ---------- */
  // The design-table piece made from this product, if there is one.
  function designable(sku) {
    if (!P) return null;
    var id = null;
    Object.keys(P.PRODUCTS).forEach(function (k) { if (P.PRODUCTS[k].sku === sku && !P.PRODUCTS[k].off && !id) id = k; });
    return id;
  }

  // "Design one like this": the design table on that piece, the product's
  // photo on Udon's board.
  function designFrom(sku) {
    var id = designable(sku);
    if (!id) return;
    var keep = D.d;
    D.d = P.blank(id);
    D.d.tones = keep.tones; D.d.prints = keep.prints; D.d.fabrics = keep.fabrics;
    gvRef = sku;
    var pl = placeFor('sewing');
    if (pl) walkTo(pl.x);
    designerSheet();
  }

  // cut: the picture of the piece that was tapped — what "Thêm vào giỏ" puts
  // in the basket is that very piece. A product with choices, a consignor or
  // notes opens the detail sheet instead (pdSheet); nudge: it was dragged to
  // the basket before a choice was picked.
  function productSheet(sku, cut, nudge) {
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    if (pdWanted(info)) { pdSheet(sku, cut, nudge); return; }
    var card = productCard(sku);
    if (!card) return;
    openSheet(tr('p', 'studio.prod_tip', ' class="st-lead st-prod-tip"') +
      '<ul class="st-grid st-grid--one">' + card + '</ul>' +

      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>');
    var add = sheetBody.querySelector('[data-add]');
    if (add && cut) add.setAttribute('data-cut', cut);
  }

  /* ---------- the detail sheet: real photos, choices, notes ----------
     Like the sheet on san-pham.html (js/gallery.js), for a product with
     choices (a scent, a size, a design: products.options), a consignor or
     notes: its photos, the price, the choices as chips (picking one shows
     that jar / bag), "Thêm vào giỏ", the notes. So the piece on the shelf can
     be one drawing for the whole range: the photos are what people pick by.
     Names, choices and notes are typed by staff: esc() only. */
  var PD = null;   // the open one: { sku, cut, pics: [src], at, pick, msg }

  function pdWanted(info) { return !!(info && (info.options || info.consignor || info.notes)); }
  function pdChoices(info) { return (info && info.options && info.options.choices) || []; }
  function pdChoice(info, key) {
    var cs = pdChoices(info);
    for (var i = 0; i < cs.length; i++) if (cs[i].key === key) return cs[i];
    return null;
  }
  // "Mùi hương", "Cỡ", "Mẫu": what is being picked
  function pdLabel(info) {
    var o = (info && info.options) || {};
    return (lng() === 'en' && o.label_en) || o.label_vi || '';
  }
  function pdName(c) { return (lng() === 'en' && c.en) || c.vi || c.key; }
  function pdNote(c) { return (lng() === 'en' && c.note_en) || c.note_vi || ''; }
  // a gallery entry: a path or URL as is, a bare name lives in images/products/
  function pdSrc(tok) {
    tok = String(tok || '').trim();
    if (!tok) return null;
    if (tok.indexOf('/') >= 0) return tok;
    return 'images/products/' + tok + (/\.(jpe?g|png|webp|gif)$/i.test(tok) ? '' : '.jpg');
  }

  function pdSheet(sku, cut, nudge) {
    var info = window.GemBasket.info(sku);
    var pics = (info.gallery || []).map(pdSrc).filter(Boolean);
    if (!pics.length && info.image) pics = [info.image];
    PD = { sku: sku, cut: cut || null, pics: pics, at: 0, pick: null, msg: '' };
    openSheet('<div class="st-pd"></div>' +
      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>');
    if (nudge) pdHint(); else pdRender();
  }

  // focus: a selector to give the focus back to (the chip or arrow just used)
  function pdRender(focus) {
    var root = PD && sheetBody.querySelector('.st-pd');
    var info = root && window.GemBasket.info(PD.sku);
    if (!info) return;
    var cs = pdChoices(info), cur = pdChoice(info, PD.pick), n = PD.pics.length;
    root.innerHTML =
      '<div class="st-pd-head">' +
        (info.consignor ? '<span class="pg-consign">' + esc(t('products.consign') + ' · ' + info.consignor) + '</span>' : '') +
        '<h2 id="st-sheet-title">' + esc(info.name) + '</h2>' +
        '<p class="pg-price">' + esc(info.price) + '</p>' +
      '</div>' +
      '<div class="st-pd-media">' +
        (n ? '<img class="st-pd-img" src="' + esc(PD.pics[PD.at]) + '" alt="' + esc(info.name) + '">' : '') +
        (n > 1
          ? '<button type="button" class="st-pd-nav is-prev" data-pd-go="-1" aria-label="' + esc(t('products.modal_prev')) + '">&#8249;</button>' +
            '<button type="button" class="st-pd-nav is-next" data-pd-go="1" aria-label="' + esc(t('products.modal_next')) + '">&#8250;</button>' +
            '<span class="st-pd-count" aria-hidden="true">' + (PD.at + 1) + ' / ' + n + '</span>'
          : '') +
      '</div>' +
      '<div class="st-pd-buy">' +
        (cs.length
          ? '<p class="pg-opts-label" id="st-pd-label">' + esc(pdLabel(info)) + '</p>' +
            '<div class="pg-chips" role="group" aria-labelledby="st-pd-label">' + cs.map(function (c) {
              return '<button type="button" class="pg-chip" data-pd-pick="' + esc(c.key) + '" aria-pressed="' + (c.key === PD.pick) + '"' +
                (c.out ? ' disabled' : '') + '>' + esc(pdName(c)) +
                (c.out ? '<span class="pg-chip-out">' + esc(t('products.sheet_out')) + '</span>' : '') + '</button>';
            }).join('') + '</div>' +
            '<p class="pg-choice-note" aria-live="polite">' + esc(cur ? pdNote(cur) : '') + '</p>'
          : '') +
        (info.inStock
          ? '<button type="button" class="st-btn st-pd-add" data-pd-add>' + esc(t('studio.add')) + '</button>'
          : '<button type="button" class="st-btn st-pd-add" disabled>' + esc(t('studio.out')) + '</button>') +
        '<p class="pg-msg" role="status">' + esc(PD.msg) + '</p>' +
        (cs.length ? '' : tr('p', 'studio.prod_tip', ' class="st-prod-tip"')) +
        (designable(PD.sku) && hasPlace('sewing')
          ? '<button type="button" class="st-link st-design-from" data-design-from="' + esc(PD.sku) + '" data-i18n="studio.prod_design">' +
            esc(t('studio.prod_design')) + '</button>'
          : '') +
        (info.notes
          ? '<div class="pg-notes"><h3 class="pg-notes-h">' + esc(t('products.sheet_notes')) + '</h3>' +
            '<p class="pg-notes-body">' + esc(info.notes) + '</p></div>'
          : '') +
      '</div>';
    var f = focus && root.querySelector(focus);
    if (f) f.focus({ preventScroll: true });
  }

  // "Add" before a choice: say what to pick, and go to the first one there is
  function pdHint() {
    var info = window.GemBasket.info(PD.sku);
    PD.msg = t('products.sheet_pick').replace('{x}', pdLabel(info).toLowerCase());
    pdRender('.pg-chip:not(:disabled)');
  }

  function pdClick(b) {
    if (b.hasAttribute('data-pd-open')) { productSheet(b.getAttribute('data-pd-open')); return true; }
    var info = PD && window.GemBasket && window.GemBasket.info(PD.sku);
    if (!info) return true;
    var go = b.getAttribute('data-pd-go');
    if (go) {
      var n = PD.pics.length;
      PD.at = (PD.at + (+go) + n) % n;
      pdRender('[data-pd-go="' + go + '"]');
      return true;
    }
    if (b.hasAttribute('data-pd-pick')) {
      var c = pdChoice(info, b.getAttribute('data-pd-pick'));
      if (!c || c.out) return true;
      PD.pick = c.key;
      PD.msg = '';
      if (c.image) {   // show the jar / bag that was picked
        var src = pdSrc(c.image), i = PD.pics.indexOf(src);
        if (i < 0) { PD.pics.push(src); i = PD.pics.length - 1; }
        PD.at = i;
      }
      pdRender('[data-pd-pick="' + c.key + '"]');   // keys are a-z 0-9 - (database check)
      return true;
    }
    // Thêm vào giỏ
    var cur = pdChoice(info, PD.pick);
    if (pdChoices(info).length && !cur) { pdHint(); return true; }
    // a choice with its own photo goes in the basket as that photo, not as
    // the drawing that stands for the whole range
    var cut = cur && cur.image ? null : PD.cut;
    if (!window.GemBasket.add(PD.sku, sheetBody.querySelector('.st-pd-img'), null, cut, cur ? cur.key : null)) {
      PD.msg = t('studio.prod_out');
      pdRender();
      return true;
    }
    b.textContent = t('studio.added');
    b.classList.add('is-added');
    setTimeout(function () {
      b.textContent = t('studio.add');
      b.classList.remove('is-added');
    }, 1100);
    return true;
  }

  /* ---------- what the basket shows ----------
     A cut-out, never the catalogue photo, whenever the Studio has one: the
     piece itself when it was picked up here (pieceCut), else the product's
     own "Ảnh cắt nền", else a piece of it standing in the Studio
     (shareCuts). GemBasket checks every picture it is handed. */
  function pieceCut(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return el.getAttribute('src');   // a free picture; a framed photo is a <span>
    return el.classList.contains('is-cut') ? el.querySelector('img').getAttribute('src') : null;
  }

  function shareCuts() {
    if (!window.GemBasket || !window.GemBasket.cutouts) return;
    var map = Object.create(null);
    var take = function (it) { if (it.sku && !it.frame && !map[it.sku]) map[it.sku] = it.src; };
    if (LAYOUT) {
      LAYOUT.items.forEach(take);
      if (LAYOUT.outside) LAYOUT.outside.items.forEach(take);
    }
    window.GemBasket.cutouts(map);
  }

  /* ---------- the mouse over a piece ----------
     By the picture, the same test as a tap: the see-through part of a
     piece's box lights nothing up. A product also shows its name. A touch
     screen has no hover: there a tap opens the card. */
  var lit = null;
  function over(el) {
    if (el !== lit) {
      if (lit) lit.classList.remove('is-over');
      if (el) el.classList.add('is-over');
      lit = el;
    }
    nameTag(el && el.classList.contains('st-shelf-prod') ? el : null);
  }

  function bindHover() {
    world.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var at = e.buttons ? {} : pickAt(e.clientX, e.clientY), pc = at.piece || null;
      var zone = !!pc && pc.getAttribute('data-kind') === 'zone';
      over(zone ? null : pc);              // lit = a click does it
      hoverTag(zone ? pc : at.hot || null);   // a click on a place walks: its tag is what opens it
    });
    world.addEventListener('pointerleave', function () { over(null); hoverTag(null); });
    world.addEventListener('pointerdown', function () { over(null); hoverTag(null); });
  }

  var hovered = null;   // the tag lit by the mouse over its place
  function hoverTag(el) {
    var p = el && placeOf(el), tag = p && p.tag || null;
    if (tag === hovered) return;
    if (hovered) hovered.classList.remove('is-hover');
    if (tag) tag.classList.add('is-hover');
    hovered = tag;
  }

  function nameTag(el) {
    var tag = world.querySelector('.st-prod-label');
    var info = el && window.GemBasket && window.GemBasket.info(el.getAttribute('data-sku'));
    if (!info) { if (tag) tag.hidden = true; return; }
    if (!tag) {
      tag = document.createElement('span');
      tag.className = 'st-hot-label st-prod-label';
      world.appendChild(tag);
    }
    var r = el.getBoundingClientRect(), w = world.getBoundingClientRect();
    tag.textContent = info.name;   // from the database: text only
    tag.style.left = pct(r.left + r.width / 2 - w.left, w.width);
    tag.style.top = pct(r.top - w.top, w.height);
    tag.hidden = false;
  }

  function bindProducts() {
    world.addEventListener('pointerdown', function (e) {
      var el = pickAt(e.clientX, e.clientY, e.pointerType !== 'mouse').piece;
      if (!el || !el.classList.contains('st-shelf-prod') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      var sku = el.getAttribute('data-sku');
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      dragFrom(e, img, {
        start: function () { el.classList.add('is-lifted'); },
        cancel: function () { el.classList.remove('is-lifted'); },
        tap: function () { pickTap(el, function () { productSheet(sku, pieceCut(el)); }); },
        drop: function (where, ghost) {
          el.classList.remove('is-lifted');
          var info = window.GemBasket && window.GemBasket.info(sku);
          if (!info || !info.inStock) { say('studio.prod_out', 3000); return false; }
          // a scent / size / design to pick first: its sheet opens on the choices
          if (pdChoices(info).length) { productSheet(sku, pieceCut(el), true); return false; }
          if (!window.GemBasket.add(sku, ghost, null, pieceCut(el))) { say('studio.prod_out', 3000); return false; }
          ghost.remove();
          say(where === 'cart' ? 'studio.prod_in_cart' : 'studio.prod_in_basket', 2600);
          return true;
        }
      });
    });
  }

  var udonBusy = false;
  function bindUdon() {
    udonEl.addEventListener('pointerdown', function (e) {
      if (udonBusy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      udonPose('ud-ngoi-a');
      var img = udonEl.querySelector('img:not([hidden])');
      dragFrom(e, img, {
        start: function () { udonEl.style.visibility = 'hidden'; },
        // no hint on a tap: finding out Udon can be dragged is the fun part
        cancel: function () { udonEl.style.visibility = ''; },
        tap: function () { udonPose('ud-vay'); },
        drop: function (where, ghost) { udonRide(where, ghost); return true; }
      });
    });
    // keyboard (Enter / Space): the same surprise, Udon hops into the cart
    udonEl.addEventListener('click', function (e) {
      if (e.detail !== 0 || udonBusy) return;
      var img = udonEl.querySelector('img:not([hidden])'), r = img.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var ghost = img.cloneNode();
      ghost.className = 'st-udon-ghost';
      ghost.style.left = (r.left - sr.left) + 'px';
      ghost.style.top = (r.top - sr.top) + 'px';
      ghost.style.width = r.width + 'px';
      stage.appendChild(ghost);
      udonEl.style.visibility = 'hidden';
      udonRide('cart', ghost);
    });
  }

  // Udon dropped in the cart or the basket: a line, a little stay, home again.
  function udonRide(where, ghost) {
    udonBusy = true;
    // Measure where Udon is on screen FIRST, then take him out of the cart:
    // re-parenting first left him at the cart's own coordinates on the
    // stage, so he seemed to fly in from the door.
    var home = function (pin) {
      var h = udonEl.getBoundingClientRect(), s2 = stage.getBoundingClientRect(), r = ghost.getBoundingClientRect();
      if (pin) pin.undo();
      if (ghost.parentNode !== stage) stage.appendChild(ghost);
      ghost.getAnimations().forEach(function (an) { an.cancel(); });
      ghost.className = 'st-udon-ghost';
      ghost.style.left = (h.left - s2.left) + 'px';
      ghost.style.top = (h.top - s2.top) + 'px';
      ghost.style.width = h.width + 'px';
      var from = 'translate(' + (r.left - h.left) + 'px,' + (r.top - h.top) + 'px) scale(' + (r.width / h.width).toFixed(2) + ')';
      var mid = 'translate(' + ((r.left - h.left) / 2) + 'px,' + (Math.min(r.top - h.top, 0) - 90) + 'px) scale(0.8)';
      ghost.animate([{ transform: from }, { transform: mid, offset: 0.55 }, { transform: 'translate(0,0) scale(1)' }],
        { duration: reduceMotion ? 1 : 600, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () {
        ghost.remove();
        udonEl.style.visibility = '';
        player.udon = false; render();
        udonBusy = false;
      };
    };
    if (where === 'basket') {
      say('studio.udon_basket', 3600);
      var w = document.querySelector('.gb-widget');
      flyTo(ghost, w.getBoundingClientRect(), 0.42, function () {
        // peek out of the basket, between its back and front rim
        var g = w.getBoundingClientRect(), s2 = stage.getBoundingClientRect(), r = ghost.getBoundingClientRect();
        var peek = ghost;
        peek.getAnimations().forEach(function (an) { an.cancel(); });
        peek.style.transform = 'none';
        peek.className = 'st-udon-peek';
        peek.style.left = ''; peek.style.top = ''; peek.style.width = '';
        var art = w.querySelector('.gb-basket-art');
        art.insertBefore(peek, art.querySelector('.gb-layer-front'));
        w.classList.add('gb-wiggle');
        setTimeout(function () { w.classList.remove('gb-wiggle'); }, 600);
        setTimeout(function () {
          // back into the stage at the same screen spot, then home
          var pr = peek.getBoundingClientRect(), s3 = stage.getBoundingClientRect();
          peek.className = 'st-udon-ghost';
          stage.appendChild(peek);
          peek.style.left = (pr.left - s3.left) + 'px';
          peek.style.top = (pr.top - s3.top) + 'px';
          peek.style.width = pr.width + 'px';
          home();
        }, 3200);
      });
      return;
    }
    // the cart: out it comes, Udon lands in the basket of it and rides along
    say('studio.udon_cart', 3600);
    walkToken++; player.moving = false; rest();
    player.udon = true; render();
    var b = frameEls[player.frame].getBoundingClientRect();
    var a = ghost.getBoundingClientRect();
    var sc = Math.min(1, (b.height * 0.3) / (a.height / 1.08));
    var spot = { left: b.left + b.width * (player.facing > 0 ? 0.8 : 0.2) - 1, top: b.top + b.height * 0.52, width: 2, height: 2 };
    flyTo(ghost, spot, sc.toFixed(2), function () {
      var pin = pinTo(ghost, bobEl);
      setTimeout(function () { home(pin); }, 3200);
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

  /* ---------- Phân loại rác (js/phanloai.js) ----------
     The game is a file of its own, fetched the first time it is opened, so
     the studio does not carry it. A Tagom poster hung as a "Khu vực" opens
     the game on that poster; anything else, on the six posters. */
  var plState = 0;   // 0 not fetched, 1 fetching, 2 here
  function phanloaiSheet(it) {
    var m = /^images\/studio\/tagom\/([a-z0-9-]+)\.webp$/.exec((it && it.src) || '');
    var go = function () {
      window.GemPhanLoai.open({ openSheet: openSheet, body: function () { return sheetBody; }, audio: audioCtx }, { poster: m ? m[1] : '' });
    };
    if (plState === 2) { go(); return; }
    openSheet('<p class="st-lead pl-wait" id="st-sheet-title">' + esc(t('studio.pl_load')) + '</p>', true);
    if (plState === 1) return;
    plState = 1;
    var me = document.querySelector('script[src*="js/studio.js"]'), q = me ? me.src.indexOf('?') : -1;
    var s = document.createElement('script');
    s.src = 'js/phanloai.js' + (q > 0 ? me.src.slice(q) : '');   // the same ?v= as this file
    s.onload = function () {
      plState = window.GemPhanLoai ? 2 : 0;
      if (plState === 2 && !modal.hidden && sheetBody.querySelector('.pl-wait')) go();
    };
    s.onerror = function () {
      plState = 0;
      s.remove();
      var w = sheetBody.querySelector('.pl-wait');
      if (w) w.textContent = t('studio.pl_fail');
    };
    document.head.appendChild(s);
  }

  var ACTIONS = {
    door: doorSheet,
    sofa: sofaSheet,
    rail: railSheet,
    fitting: fittingSheet,
    pegboard: function () { shelfSheet('pegboard'); },
    display: function () { shelfSheet('display'); },
    cabinet: function () { shelfSheet('cabinet'); },
    sewing: designerSheet,
    khovai: khoSheet,
    memo: memoSheet,
    tu: tuSheet,
    counter: counter,
    enter: enterStudio,
    dantranh: zitherSheet,
    phanloai: phanloaiSheet
  };

  // Open right away and let the character walk over behind the sheet.
  // (Opening only on arrival meant a second tap mid-walk cancelled the
  // first, so it took several taps to get anything open.)
  function visit(id, open) {
    // a nav button from the street: go in first. A place that is out here (the
    // door, the owner's own tap box on the street) opens where it is.
    if (sceneName === 'out' && id !== 'enter' && !hotById(id)) {
      goScene('in', function () { visit(id, open); });
      return;
    }
    var pl = placeFor(id);   // the spot's box, or (that box hidden) the owner's piece for it
    if (!pl) return;
    if (open === false) { walkTo(pl.x); return; }
    runAct(pl.act, pl.link, pl.x);   // the spot's own action, another spot's, a page, or nothing
  }

  // Walk to x and do an action (ACTS in studio-layout.js). Shared by the
  // hotspot boxes and the pieces of kind "zone".
  function runAct(act, link, x, it) {
    if (act === 'link' && link) {
      walkTo(x, function () {
        if (/^https:/.test(link)) window.open(link, '_blank', 'noopener');
        else location.href = link;
      });
      return;
    }
    walkTo(x);
    if (act === 'none' || act === 'link') return;
    if (act.indexOf('shop:') === 0) shelfSheet(act.slice(5));
    else if (act === 'enter') enterStudio();
    else if (act === 'phanloai') phanloaiSheet(it);
    else if (ACTIONS[act]) ACTIONS[act]();
  }

  // A tap (a finger, the mouse), by what is painted under it:
  //  - a name tag opens its place;
  //  - a product, a story: their own pointer handlers took it (drag & drop);
  //  - a piece that talks, a board: does its thing;
  //  - anything else walks there: the wall, the floor, the character, and a
  //    place's own picture (a "Khu vực" piece, a tap box), whose tag nods to
  //    show what opens it. The street door is the one place that opens with
  //    a tap: going in is all there is to do out there.
  function tap(x, y) {
    var at = pickAt(x, y, lastPointer !== 'mouse');
    if (at.label && at.label === pickTag) { pickOpen(); return; }
    var pc = at.piece || null;
    if (pc !== picked) unpick();
    if (at.udon) return;
    if (at.label) { openTag(at.label); return; }
    var own = pc && untagged(THINGS[+pc.getAttribute('data-thing')]);
    var place = pc && pc.getAttribute('data-kind') === 'zone' && !own ? pc : at.hot || null;
    if (pc && !place) {
      if (pc.classList.contains('st-thing') && pc.getAttribute('data-kind') !== 'story') {
        pickTap(pc, function () { thingTap(pc); });
      }
      return;
    }
    if (place && (placeOf(place) || {}).act === 'enter') {
      if (place === pc) thingTap(pc);
      else visit(place.getAttribute('data-hot'));
      return;
    }
    ring(x, y);
    if (place) nudge(place);
    guideDid('walk');
    walkTo((x - stage.getBoundingClientRect().left + cam) / k);
  }

  /* ---------- touch: first tap names a thing, second tap opens it ----------
     Products, stories, talking pieces and boards look like the rest of the
     drawing, and a finger has no hover to light them up. So on touch the
     first tap walks over and shows the thing's name tag ("Tên ›"); a tap on
     the tag or on the thing again opens it. The mouse keeps one click: its
     hover already shows what can be clicked. */
  var picked = null, pickTag = null, pickDo = null;

  function pickName(el) {
    if (el.classList.contains('st-shelf-prod')) {
      var info = window.GemBasket && window.GemBasket.info(el.getAttribute('data-sku'));
      return info ? info.name : '';
    }
    var it = THINGS[+el.getAttribute('data-thing')];
    if (!it) return '';
    var o = INFO[it.src];
    var title = o ? infoText(o, 'title') : '';
    if (title) return title;
    if (it.kind === 'story') return t('studio.pick_story');
    if (it.kind === 'talk') return t('studio.pick_talk');
    if (it.kind === 'board') return t(it.board.feed === 'post' ? 'studio.pick_post' : 'studio.pick_workshop');
    if (it.kind === 'zone') return zoneName(it);
    return '';
  }

  function pickTap(el, open) {
    if (lastPointer === 'mouse' || el === picked) { unpick(); open(); return; }
    unpick();
    var name = pickName(el);
    if (!name) { open(); return; }   // nothing to call it by: just open, as before
    picked = el; pickDo = open;
    if (!pickTag) {
      pickTag = document.createElement('span');
      pickTag.className = 'st-hot-label st-pick-label is-here';
    }
    world.appendChild(pickTag);
    var r = el.getBoundingClientRect(), w = world.getBoundingClientRect();
    pickTag.textContent = name;   // from the database: text only
    pickTag.style.left = pct(r.left + r.width / 2 - w.left, w.width);
    pickTag.style.top = pct(r.top - w.top, w.height);
    pickTag.hidden = false;
    el.classList.add('is-picked');
    walkTo((r.left + r.width / 2 - stage.getBoundingClientRect().left + cam) / k);
  }

  function pickOpen() {
    var open = pickDo;
    unpick();
    if (open) open();
  }

  function unpick() {
    if (picked) picked.classList.remove('is-picked');
    if (pickTag) pickTag.hidden = true;
    picked = null; pickDo = null;
  }

  // A name tag: a "Khu vực" piece's or a tap box's. It always opens its place.
  function openTag(lab) {
    var n = lab.getAttribute('data-thing-label');
    if (n != null) {
      var lead = THINGS[+n];
      if (lead && lead._group) { runAct(lead.zone.act, lead.zone.link, standIn(lead, true), null); return; }
      var el = world.querySelector('.st-thing[data-thing="' + n + '"]');
      if (el) thingTap(el);
      return;
    }
    var hot = lab.closest('.st-hot');
    if (hot) visit(hot.getAttribute('data-hot'));
  }

  // Is (x, y) on the character's own picture, cart included? The character
  // is drawn over the pieces behind it, so a tap there is on the character
  // and means walk. By the picture, not its box: a cart frame's box is wide
  // and mostly empty.
  function onPlayer(x, y) {
    var fr = frameEls[player.frame], img = fr && !fr.hidden && fr.querySelector('img');
    if (!img) return false;
    var r = img.getBoundingClientRect();
    if (!r.width || x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    var m = alphaOf(img.getAttribute('src'));
    if (typeof m === 'string') return true;   // not read yet: its box
    var u = (x - r.left) / r.width, v = (y - r.top) / r.height;
    if (player.facing < 0) u = 1 - u;         // the frame is mirrored
    var cx = Math.floor(u * m.w), cy = Math.floor(v * m.h);
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.a[yy * m.w + xx] > 40) return true;
      }
    }
    return false;
  }

  /* ---------- where the character stands ----------
     The place(s) the character has walked to: its tag lights up ("Tên ›").
     Not where a scene starts, never the way in. It changes only when the
     character comes to rest: a walk or a swipe in progress leaves the tags as
     they are, so they don't flicker as the character passes under them. */
  var restX = null;   // where the visitor last brought the character to rest; null at a scene's start

  function rest() {
    restX = player.x;
    markHere();
  }

  // A place (a tap box, or a "Khu vực" piece): its span, what it does, its
  // tag and the height its tag sits at.
  function placeOf(el) {
    if (el.classList.contains('st-hot')) {
      var h = hotById(el.getAttribute('data-hot'));
      if (!h) return null;
      var b = boxOf(h), pl = placeFor(h.id);
      return { x0: b.x0, x1: b.x1, top: b.y0, act: pl ? pl.act : h.id, tag: el.querySelector('.st-hot-label'), hot: true };
    }
    var it = THINGS[+el.getAttribute('data-thing')];
    if (!it || it.kind !== 'zone') return null;
    var p = groupBox(it), lead = it._lead || it;
    return { x0: p.x0, x1: p.x1, top: Math.max(p.y0, 40), act: it.zone.act, tag: lead._tag || null, it: lead };
  }

  function isHere(el, x) {
    if (x === undefined) x = restX;
    var p = x != null && placeOf(el);
    return !!p && p.act !== 'enter' && x >= p.x0 && x <= p.x1;
  }

  function markHere() {
    if (!world) return;
    var x = restX;
    world.querySelectorAll('.st-hot, .st-thing[data-kind="zone"]').forEach(function (el) {
      var on = isHere(el, x), p = placeOf(el);
      el.classList.toggle('is-here', on);
      if (p && p.tag) p.tag.classList.toggle('is-here', on);
    });
    placeTags();
  }

  // Where the tags go, whenever the character comes to rest: over the middle
  // of their place; a lit one kept on screen (a place can be wider than a
  // phone's view); and none sitting on the character: one in the way steps
  // aside along its place's top, to the nearer side of the character as drawn
  // at that height (the head, not the cart below it). Tags stay put while the
  // character walks, so they don't hop about under it.
  function placeTags(viewW) {
    if (!world || !stage || player.moving) return;
    var mm = 10 / k;
    var m = 70 / k, L = cam / k + m, R = (cam + (viewW || stage.clientWidth)) / k - m;
    world.querySelectorAll('.st-hot, .st-thing[data-kind="zone"]').forEach(function (el) {
      var p = placeOf(el);
      if (!p || !p.tag) return;
      var lit = p.tag.classList.contains('is-here'), x = (p.x0 + p.x1) / 2;
      if (lit) x = Math.max(L, Math.min(R, x));
      var w = p.tag.offsetWidth / k, h = p.tag.offsetHeight / k;   // drawn at translate(-50%, -60%) from (x, top)
      var c = w && playerSpan(p.top - 0.6 * h - mm, p.top + 0.4 * h + mm);
      if (c && x + w / 2 > c[0] - mm && x - w / 2 < c[1] + mm) {
        var a = c[0] - mm - w / 2, b = c[1] + mm + w / 2;
        x = Math.abs(a - x) <= Math.abs(b - x) ? a : b;
        if (lit) x = Math.max(L, Math.min(R, x));
      }
      if (p.hot) p.tag.style.left = ((x - p.x0) / (p.x1 - p.x0) * 100).toFixed(2) + '%';
      else p.tag.style.left = pct(x, SCENE.width);
    });
  }

  // Where the character is drawn between two heights (strip px): from its
  // leftmost to its rightmost solid pixel there, cart included; null when
  // nothing of it is there. Its frame's box while the picture isn't read.
  function playerSpan(y0, y1) {
    var fr = frameEls[player.frame], img = fr && !fr.hidden && fr.querySelector('img');
    if (!img) return null;
    var w = fr.offsetWidth / k, top = SCENE.feetY - SCENE.playerH;
    var an = ANCHOR[who + '-' + player.frame] || 0.5, left = player.x - (player.facing < 0 ? 1 - an : an) * w;
    if (y1 < top || y0 > SCENE.feetY || !w) return null;
    var m = alphaOf(img.getAttribute('src'));
    if (typeof m === 'string') return [left, left + w];
    var r0 = Math.max(0, Math.floor((y0 - top) / SCENE.playerH * m.h)), r1 = Math.min(m.h - 1, Math.ceil((y1 - top) / SCENE.playerH * m.h));
    var c0 = m.w, c1 = -1;
    for (var r = r0; r <= r1; r++) {
      for (var c = 0; c < m.w; c++) {
        if (m.a[r * m.w + c] > 40) { if (c < c0) c0 = c; if (c > c1) c1 = c; }
      }
    }
    if (c1 < 0) return null;
    var u0 = c0 / m.w, u1 = (c1 + 1) / m.w;
    if (player.facing < 0) { var u = u0; u0 = 1 - u1; u1 = 1 - u; }   // the frame is mirrored
    return [left + u0 * w, left + u1 * w];
  }

  // A tap on a place's picture walks; its tag gives a little nod, so the way
  // to open it is plain to see.
  function nudge(el) {
    var p = placeOf(el), tag = p && p.tag;
    if (!tag) return;
    tag.classList.remove('is-nudge');
    void tag.offsetWidth;   // restart the animation
    tag.classList.add('is-nudge');
    setTimeout(function () { tag.classList.remove('is-nudge'); }, 600);
  }

  // Every tap that walks leaves a small ring where the finger was: a tap
  // always shows it was felt, even one that doesn't move the character.
  function ring(x, y) {
    var r = stage.getBoundingClientRect(), el = document.createElement('span');
    el.className = 'st-tap';
    el.style.left = (x - r.left + cam) + 'px';
    el.style.top = (y - r.top) + 'px';
    world.appendChild(el);
    setTimeout(function () { el.remove(); }, 600);
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  function bind() {
    bindSwipe();
    bindHover();
    bindProducts();
    bindThings();
    bindSheetDrag();
    // Back gesture / button: closes the open sheet first, then (inside) steps
    // back out to the street, and only then leaves the page.
    window.addEventListener('popstate', function () {
      if (ignorePop) { ignorePop = false; return; }
      if (!modal.hidden) { closeSheet(true); return; }
      if (sceneInHistory && sceneName === 'in') { sceneInHistory = false; goScene('out', null, true); }
    });
    world.addEventListener('click', function (e) {
      // A tap leaves no piece "focused": the browser focuses whatever box was
      // under the finger, and the next key press would light that piece up.
      var held = e.detail !== 0 && document.activeElement;
      if (held && held.classList && held.classList.contains('st-thing')) held.blur();
      if (Date.now() - swiped < 350) return;   // the end of a swipe or a drag, not a tap
      if (e.detail !== 0) { tap(e.clientX, e.clientY); return; }
      // keyboard (Enter / Space): open the focused spot or piece
      var lab = e.target.closest('[data-thing-label]'), th = e.target.closest('.st-thing'), hot = e.target.closest('.st-hot');
      if (lab) openTag(lab);
      else if (th) { if (th.getAttribute('data-kind') !== 'story') thingTap(th); }
      else if (hot) visit(hot.getAttribute('data-hot'));
    });
    // Long press: no "save image" menu over the scene (iOS: -webkit-touch-callout).
    stage.addEventListener('contextmenu', function (e) { if (lastPointer !== 'mouse') e.preventDefault(); });

    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = b.getAttribute('data-go');
        guideDid('walk');
        if (go === 'shelves') {
          visit('display', false);
        } else {
          // The places people come for open straight away.
          visit(go, go === 'sewing' || go === 'counter' || go === 'tu' || go === 'enter');
        }
      });
    });

    // The second tap of a double tap lands on the sheet the first one just
    // opened: on its backdrop, closing it at once, or on a button in it. A tap
    // in the first moments after it opens, right where the first one was, is
    // let go; anywhere else (the ✕) it counts at once.
    document.addEventListener('pointerdown', function (e) { lastDown = { x: e.clientX, y: e.clientY }; }, true);
    modal.addEventListener('click', function (e) {
      if (e.detail && Date.now() - sheetAt < 400 && sheetFrom &&
          Math.abs(e.clientX - sheetFrom.x) < 40 && Math.abs(e.clientY - sheetFrom.y) < 40) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.st-close') || e.target.closest('[data-close]')) {
        closeSheet();
        return;
      }
      if (sheetBody.querySelector('.pt') && designerClick(e)) return;
      if (sheetBody.querySelector('.kho') && khoClick(e)) return;
      if (sheetBody.querySelector('.tu') && tuClick(e)) return;
      var pd = e.target.closest('[data-pd-open], [data-pd-go], [data-pd-pick], [data-pd-add]');
      if (pd && pdClick(pd)) return;
      var add = e.target.closest('[data-add]');
      if (add && window.GemBasket) {
        var card = add.closest('.st-prod, .fit-item, .fit-side');
        if (window.GemBasket.add(add.getAttribute('data-add'), card && card.querySelector('img'), null, add.getAttribute('data-cut'),
            add.getAttribute('data-opt') || undefined)) {
          add.textContent = t('studio.added');
          add.classList.add('is-added');
          setTimeout(function () {
            add.textContent = t('studio.add');
            add.classList.remove('is-added');
          }, 1100);
        }
        return;
      }
      if (e.target.closest('[data-out]')) { goScene('out'); return; }
      var sh = e.target.closest('[data-shop]');
      if (sh) { shopTab(sh.getAttribute('data-shop')); return; }
      var df = e.target.closest('[data-design-from]');
      if (df) { designFrom(df.getAttribute('data-design-from')); return; }
      var wr = e.target.closest('[data-wear]');
      if (wr) {
        if (toggleWear(wr.getAttribute('data-wear'))) {
          closeSheet();
          render();
          say('studio.wear_said', 3500);
        } else {
          renderFitting();
        }
        return;
      }
      var tri = e.target.closest('[data-try]');
      if (tri) {
        tryOn = tri.getAttribute('data-try');
        var slash = tryOn.indexOf('/');
        if (slash > 0 && tryOn.indexOf('d:') !== 0) tryOpt[tryOn.slice(0, slash)] = tryOn.slice(slash + 1);
        renderFitting();
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
      if (e.key === 'ArrowRight') { e.preventDefault(); guideDid('walk'); walkTo(player.x + 300); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); guideDid('walk'); walkTo(player.x - 300); }
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
    modal.addEventListener('change', function (e) {
      if (e.target.name === 'photo' && e.target.closest('.pt')) designerPhoto(e.target);
    });
    modal.addEventListener('input', function (e) {
      if (e.target.closest('.pt')) { designerInput(e); return; }
      if (e.target.name !== 'body' || !e.target.closest('.mb-form')) return;
      e.target.closest('.mb-form').querySelector('.mb-count').textContent = e.target.value.length + '/280';
    });

    document.addEventListener('gem:langchange', function () { renderDesigner(); renderKho(); renderTu(); relabelSpots(); relabelThings(); pdRender(); streetNav(); ztRelabel(); guideRelang(); });
    // an own-colour fabric finished dyeing: swap the plain colour for it
    var fabricTimer = null;
    document.addEventListener('gem:fabric', function () {
      clearTimeout(fabricTimer);
      fabricTimer = setTimeout(function () {
        if (sheetBody.querySelector('.pt')) { renderBasket(); renderPreview(); }
        if (sheetBody.querySelector('.kho')) renderKho();
      }, 60);
    });
    document.addEventListener('gem:pricing', function () {
      if (sheetBody.querySelector('.pt')) { renderOpts(); renderPreview(); }
    });
    document.addEventListener('gem:tu', function () {
      // Another tab, or an order just went through: refresh what's open.
      if (sheetBody.querySelector('.tu')) renderTu();
      if (sheetBody.querySelector('.fit')) renderFitting();
    });

    document.addEventListener('gem:basket', function (e) {
      cartCount = (e.detail && e.detail.count) || 0;
      renderCargo();
      render();
    });

    bubble.addEventListener('click', function () { bubble.hidden = true; });

    window.addEventListener('resize', layout);

    ['pointerdown', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, function () { lastTouch = Date.now(); udonTick(); }, true);
    });
    setInterval(udonTick, 325);

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
    bindGuide();
    bubbleText = document.getElementById('st-bubble-text');
    modal = document.getElementById('st-modal');
    sheetBody = document.getElementById('st-sheet-body');
    sheetEl = document.querySelector('.st-sheet');
    if (!stage || !world) return;

    loadInfo();
    loadLayout().then(function (L) {
      if (L) applyLayout(L);
      start();
      document.documentElement.classList.remove('st-wait');
    });
  });

  var started = false;
  function start() {
    started = true;
    syncNav();
    bindMotion();
    INSIDE = { width: SCENE.width, height: SCENE.height, startX: SCENE.startX,
      bg: LAYOUT ? LAYOUT.bg.src : 'images/studio/bg/strip.webp' };
    loadWorn();
    // what can be tried on comes with the products (products.wear)
    if (window.GemDB && window.GemDB.products && W) {
      var wearRows = function (rows) {
        setWearRows(rows);
        settleWorn();
        dressWear();
        if (sheetBody.querySelector('.fit')) renderFitting();
      };
      window.GemDB.products().then(wearRows, function () { /* the five of the first round stay */ });
      document.addEventListener('gem:products', function (e) { if (e.detail && e.detail.rows) wearRows(e.detail.rows); });
    }
    bind();
    shareCuts();
    cartCount = window.GemBasket ? window.GemBasket.count() : 0;
    loadNotes();   // pins on the memo board

    if (P) P.loadReal();   // Kho vải, ready before the design table opens

    // A shared design link (studio.html?d=…): walk to the table and open it.
    var shared = null;
    try { shared = P && P.parse(new URLSearchParams(location.search).get('d') || ''); } catch (e) { /* old browser */ }
    if (shared) {
      try { sessionStorage.setItem('gem-src', 'link-chia-se'); } catch (e) { /* private mode */ }
      D.d = shared;
      D.from = true;
      try {
        var qs = new URLSearchParams(location.search);
        D.by = (qs.get('by') || '').trim().slice(0, 24);
        D.d.moodId = qs.get('m') || '';
        D.title = (qs.get('t') || '').trim().slice(0, 40);
      } catch (e) { D.by = ''; }
      try { localStorage.setItem('gem-studio-intro', '1'); } catch (e) { /* ignore */ }
      setScene('in');
      setTimeout(function () { visit('sewing'); }, 400);
      return;
    }

    // Start on the street, unless this visit already went in.
    var was = null;
    try { was = sessionStorage.getItem('gem-scene'); } catch (e) { /* private mode */ }
    setScene(was === 'in' ? 'in' : 'out');
    if (sceneName === 'in') { hello(false); return; }
    insideSoon();   // the studio's wall and places, fetched while they look at the street
    setTimeout(function () { guideTip('swipe'); }, 700);   // first visit: swipe to walk
  }
})();
