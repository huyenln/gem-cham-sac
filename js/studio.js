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
  var ANCHOR = {"p1-front": 0.516, "p1-side": 0.515, "p1-q": 0.475, "p1-walk1": 0.487, "p1-walk2": 0.538, "p1-walk3": 0.501, "p1-walk4": 0.431, "p1-cart1": 0.378, "p1-cart2": 0.242, "p1-cart3": 0.303, "p2-front": 0.509, "p2-side": 0.486, "p2-q": 0.498, "p2-walk1": 0.554, "p2-walk2": 0.555, "p2-walk3": 0.522, "p2-walk4": 0.52, "p2-cart1": 0.451, "p2-cart2": 0.333, "p2-cart3": 0.392, "p3-front": 0.541, "p3-side": 0.472, "p3-q": 0.51, "p3-walk1": 0.469, "p3-walk2": 0.512, "p3-walk3": 0.472, "p3-walk4": 0.502, "p3-cart1": 0.344, "p3-cart2": 0.295, "p3-cart3": 0.268, "p4-front": 0.519, "p4-side": 0.547, "p4-q": 0.504, "p4-walk1": 0.488, "p4-walk2": 0.475, "p4-walk3": 0.465, "p4-walk4": 0.426, "p4-cart1": 0.377, "p4-cart2": 0.333, "p4-cart3": 0.348};
  var STEP_MS = 150;   // one walk / push frame

  // Where accessories go on each frame (tools/studio-assets.py --hands):
  // [width/height, hand x, hand y, back-of-head x, y, fist box x, y, w, h],
  // fractions of the frame. The hand is the near one (the front fist in a
  // walk, the grip on the cart handle); bags hang from it, and the fist
  // (char/pN-<frame>-tay.webp) is drawn back over the handle.
  var WEAR_AT = {"p1-front": [0.3056, 0.915, 0.564, 0.118, 0.12, 0.8409, 0.4708, 0.15, 0.1208], "p1-side": [0.2736, 0.659, 0.579, 0.122, 0.12, 0.5584, 0.4958, 0.203, 0.1056], "p1-q": [0.3097, 0.87, 0.512, 0.139, 0.12, 0.7848, 0.4917, 0.1435, 0.0333], "p1-walk1": [0.5292, 0.758, 0.557, 0.283, 0.12, 0.5774, 0.4917, 0.2441, 0.0931], "p1-walk2": [0.3083, 0.877, 0.592, 0.189, 0.12, 0.8108, 0.5208, 0.1036, 0.0931], "p1-walk3": [0.5472, 0.781, 0.56, 0.292, 0.12, 0.6066, 0.4917, 0.2234, 0.0931], "p1-walk4": [0.3847, 0.575, 0.583, 0.148, 0.12, 0.4477, 0.4944, 0.2022, 0.1153], "p1-cart1": [0.8667, 0.527, 0.506, 0.22, 0.12, 0.508, 0.4972, 0.0529, 0.0236], "p1-cart2": [0.6736, 0.414, 0.471, 0.07, 0.12, 0.3608, 0.4486, 0.0804, 0.0361], "p1-cart3": [0.7972, 0.48, 0.506, 0.134, 0.12, 0.453, 0.4972, 0.0592, 0.0208], "p2-front": [0.3208, 0.85, 0.584, 0.277, 0.12, 0.7792, 0.4972, 0.1558, 0.1153], "p2-side": [0.2056, 0.583, 0.587, 0.074, 0.12, 0.3986, 0.4958, 0.3243, 0.1153], "p2-q": [0.3111, 0.863, 0.579, 0.254, 0.12, 0.7812, 0.4931, 0.1518, 0.1139], "p2-walk1": [0.5292, 0.843, 0.543, 0.352, 0.12, 0.7795, 0.5222, 0.0892, 0.0333], "p2-walk2": [0.2542, 0.614, 0.6, 0.148, 0.12, 0.459, 0.5194, 0.2896, 0.1056], "p2-walk3": [0.5389, 0.781, 0.515, 0.325, 0.12, 0.6263, 0.4667, 0.2216, 0.075], "p2-walk4": [0.2403, 0.639, 0.597, 0.087, 0.12, 0.4277, 0.5125, 0.3353, 0.1083], "p2-cart1": [0.8292, 0.615, 0.527, 0.308, 0.12, 0.5762, 0.5069, 0.057, 0.0347], "p2-cart2": [0.6875, 0.549, 0.525, 0.166, 0.12, 0.5071, 0.5069, 0.0626, 0.0319], "p2-cart3": [0.7472, 0.587, 0.523, 0.23, 0.12, 0.5409, 0.5042, 0.0651, 0.0333], "p3-front": [0.3528, 0.899, 0.562, 0.276, 0.12, 0.8031, 0.4528, 0.1535, 0.1458], "p3-side": [0.3028, 0.587, 0.575, 0.142, 0.12, 0.4587, 0.4625, 0.211, 0.1417], "p3-q": [0.3486, 0.902, 0.566, 0.235, 0.12, 0.8048, 0.4611, 0.1434, 0.1347], "p3-walk1": [0.5236, 0.707, 0.565, 0.284, 0.12, 0.4828, 0.4597, 0.2891, 0.1375], "p3-walk2": [0.3417, 0.93, 0.564, 0.232, 0.12, 0.8333, 0.5347, 0.1667, 0.0486], "p3-walk3": [0.5194, 0.722, 0.555, 0.283, 0.12, 0.4866, 0.4569, 0.3075, 0.1319], "p3-walk4": [0.3681, 0.619, 0.584, 0.238, 0.12, 0.4868, 0.4667, 0.2038, 0.1472], "p3-cart1": [0.8014, 0.502, 0.497, 0.222, 0.12, 0.409, 0.4444, 0.1334, 0.0667], "p3-cart2": [0.7042, 0.467, 0.52, 0.158, 0.12, 0.4122, 0.5111, 0.1203, 0.0236], "p3-cart3": [0.7194, 0.488, 0.52, 0.131, 0.12, 0.4517, 0.5125, 0.0714, 0.0236], "p4-front": [0.3708, 0.872, 0.594, 0.21, 0.12, 0.8127, 0.5486, 0.1311, 0.0694], "p4-side": [0.2972, 0.842, 0.47, 0.131, 0.12, 0.729, 0.4319, 0.2617, 0.0611], "p4-q": [0.3917, 0.843, 0.59, 0.202, 0.12, 0.7801, 0.5472, 0.1206, 0.0639], "p4-walk1": [0.5278, 0.86, 0.564, 0.239, 0.12, 0.7974, 0.5403, 0.0816, 0.0403], "p4-walk2": [0.3847, 0.902, 0.557, 0.134, 0.12, 0.8195, 0.5319, 0.1227, 0.0417], "p4-walk3": [0.5139, 0.798, 0.561, 0.214, 0.12, 0.7405, 0.5389, 0.0838, 0.0347], "p4-walk4": [0.4306, 0.821, 0.551, 0.119, 0.12, 0.7516, 0.5333, 0.1032, 0.0319], "p4-cart1": [0.8083, 0.504, 0.521, 0.21, 0.12, 0.4656, 0.5042, 0.0911, 0.0319], "p4-cart2": [0.7042, 0.485, 0.51, 0.134, 0.12, 0.4517, 0.5, 0.069, 0.0222], "p4-cart3": [0.7625, 0.574, 0.499, 0.171, 0.12, 0.5446, 0.4903, 0.0565, 0.0208]};

  // How each piece sits: slot (one bag at a time), height as a fraction of
  // the character, which point it hangs from, and the CSS shift that puts
  // its hook / handle on that point.
  // dy: nudge from the point, in character heights (the hand point is the
  // fingertips; the grip is a little higher). shift puts the handle's top /
  // the loop's top on that point.
  var WEAR = {
    denim:     { slot: 'bag',   h: 0.2,  at: 'hand', dy: -0.02, shift: 'translate(-44%, 0)' },
    oxford:    { slot: 'bag',   h: 0.18, at: 'hand', dy: -0.02, shift: 'translate(-42%, 0)' },
    daydeo:    { slot: 'wrist', h: 0.13, at: 'hand', dy: -0.05, shift: 'translate(-22%, 0)' },
    bloom:     { slot: 'charm', h: 0.1,  at: 'hand', dy: 0,      shift: 'translate(-20%, -4%)' },
    scrunchie: { slot: 'hair',  h: 0.075, at: 'head', dy: 0,     shift: 'translate(-55%, -50%)' }
  };

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

  // Things the character can wear later — bought first, then unlocked.
  // Pieces you can try on at the fitting corner: images/studio/wear/<sku>-mac
  // (the model wearing / carrying it) and <sku> (the piece on its own).
  var WEARABLES = ['oxford', 'denim', 'scrunchie', 'daydeo', 'bloom'];
  var tryOn = WEARABLES[0];

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
    'studio.sr_help':      { vi: `Chạm vào đồ vật trong studio để xem hàng. Bấm Tab để đi qua từng điểm.`, en: `Tap things in the studio to look around. Press Tab to move between them.` },
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

    'studio.intro':        { vi: `Chào bạn! Chạm vào kệ để xem đồ nhé. Bàn thiết kế ở gần cuối phòng đó.`, en: `Hi! Tap a shelf to look around. The design table is near the far end.` },
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
    'studio.out_intro':    { vi: `Chào bạn! Chạm vào cửa để vào studio nhé.`, en: `Hi! Tap the door to come in.` },
    'studio.wear_on':      { vi: `Đeo thử`, en: `Try it on` },
    'studio.wear_off':     { vi: `Tháo ra`, en: `Take it off` },
    'studio.wear_tag':     { vi: `Đang đeo`, en: `Wearing` },
    'studio.wear_said':    { vi: `Hợp ghê! Đi một vòng xem nào.`, en: `Looks good! Take a walk.` },
    'studio.wear_note':    { vi: `Đồ đeo thử theo bạn hết lượt này. Món đã mua thì đeo lần nào cũng được.`, en: `Tried-on pieces stay with you this visit. Pieces you own, every visit.` },

    'studio.fitting_h':    { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.fitting_p':    { vi: `Chạm vào một món để thử lên người. Mua rồi thì món đó nằm trong tủ của bạn.`, en: `Tap a piece to try it on. Once it's yours, it waits in your cabinet.` },
    'studio.fitting_lock': { vi: `Mua để mặc`, en: `Buy to wear` },
    'studio.fitting_have': { vi: `Đã có`, en: `Yours` },

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
    'studio.pt_shape':     { vi: `Dáng`, en: `Shape` },
    'studio.pt_round':     { vi: `Tròn`, en: `Round` },
    'studio.pt_square':    { vi: `Vuông`, en: `Square` },
    'studio.pt_shuffle':   { vi: `Xáo mảnh`, en: `Shuffle` },
    'studio.pt_hint':      { vi: `Chạm một mảnh vải trong rổ rồi chạm vào ô trên món, hoặc kéo thả vào ô.`, en: `Tap a scrap in the basket, then tap a patch. Or drag it there.` },
    'studio.pt_hint_held': { vi: `Giờ chạm vào ô muốn đắp mảnh {vai} lên.`, en: `Now tap the patch you want the {vai} on.` },
    'studio.pt_hint_draw': { vi: `Kiểu "theo hình mình vẽ": vẽ trong mục Tự chỉnh bên dưới.`, en: `"From my drawing": draw it under Fine-tune below.` },
    'studio.pt_sew':       { vi: `May xong!`, en: `Sew it!` },
    'studio.pt_letter':    { vi: `Tờ nhắn gửi Gem`, en: `A note to Gem` },
    'studio.pt_letter_p':  { vi: `Không bắt buộc: chất vải, lời nhắn, ảnh tham khảo`, en: `Optional: fabrics, a message, a reference photo` },
    'studio.pt_real_cap':  { vi: `Đồ thật`, en: `The real one` },
    'studio.pt_mood_gem':  { vi: `Gem chọn giúp`, en: `Gem picks` },
    'studio.pt_net_on':    { vi: `Vẽ đường cắt lên món: nét khép kín, hoặc chạy từ mép này sang mép kia. Chạm vào từng mảnh để đắp vải.`, en: `Draw cut lines on the piece: a closed shape, or edge to edge. Tap each piece to lay a fabric on it.` },
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
    if (h.abs) return { x0: h.abs[0], y0: h.abs[1], x1: h.abs[2], y1: h.abs[3] };
    return {
      x0: zoneX(h.zone, h.box[0]), y0: h.box[1],
      x1: zoneX(h.zone, h.box[2]), y1: h.box[3]
    };
  }

  function hotById(id) {
    var list = sceneName === 'out' ? OUT_HOT : HOTSPOTS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function standX(h) {
    if (h.standAbs != null) return h.standAbs;
    if (h.stand != null) return zoneX(h.zone, h.stand);
    var b = boxOf(h);
    return (b.x0 + b.x1) / 2;
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

  function loadLayout() {
    if (!window.GemLayout || !window.GemDB || !window.GemDB.studioLayout) return Promise.resolve(null);
    var draft = false;
    try { draft = new URLSearchParams(location.search).get('nhap') === '1' && window.GemDB.isSignedIn(); } catch (e) { /* old browser */ }
    var get = window.GemDB.studioLayout(draft ? 'draft' : 'live').then(window.GemLayout.sanitize, function () { return null; });
    var late = new Promise(function (res) { setTimeout(function () { res(null); }, 2500); });
    return Promise.race([get, late]);
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
  }

  function buildItems(items) {
    items.forEach(function (it) {
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
      img.src = it.src;
      img.alt = '';
      img.draggable = false;
      el.style.left = pct(it.x - it.w / 2, SCENE.width);
      el.style.top = pct(it.y - it.h / 2, SCENE.height);
      el.style.width = pct(it.w, SCENE.width);
      el.style.height = pct(it.h, SCENE.height);
      el.style.transform = 'rotate(' + it.rot + 'deg)' + (it.flip ? ' scaleX(-1)' : '');
      world.appendChild(el);
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
    if (!spotOff('memo')) {
      var mb = memoBoard();
      memoPins = document.createElement('div');
      memoPins.className = 'st-pins';
      memoPins.style.left = pct(mb.x0, SCENE.width);
      memoPins.style.top = pct(mb.y0, SCENE.height);
      memoPins.style.width = pct(mb.x1 - mb.x0, SCENE.width);
      memoPins.style.height = pct(mb.y1 - mb.y0, SCENE.height);
      world.insertBefore(memoPins, world.querySelector('.st-hot'));
    }

    addPlayer();
  }

  // Where the notes are pinned: on the board picture itself when the owner's
  // layout has one inside the memo spot (the spot's box is usually drawn
  // bigger than the board, and notes landed on its frame), else the box.
  function memoBoard() {
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
    return { x0: b.x - b.w * 0.4, x1: b.x + b.w * 0.4, y0: b.y - b.h * 0.3, y1: b.y + b.h * 0.38 };
  }

  /* ---------- owner's per-spot settings (layout.spots) ----------
     off: not in the studio; vi / en: its label; link: opens that page
     instead of the built-in sheet. */
  function spotSet(id) { return (LAYOUT && LAYOUT.spots && LAYOUT.spots[id]) || {}; }
  function spotOff(id) { return !!spotSet(id).off; }
  function spotName(h) {
    return spotSet(h.id)[lng()] || t(h.label);   // no English set: the built-in English
  }

  function addHot(h) {
    var b = boxOf(h);
    var custom = spotSet(h.id).vi || spotSet(h.id).en;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'st-hot';
    btn.setAttribute('data-hot', h.id);
    if (!custom) btn.setAttribute('data-i18n-attr', 'aria-label:' + h.label);
    btn.setAttribute('aria-label', spotName(h));
    btn.style.left = pct(b.x0, SCENE.width);
    btn.style.top = pct(b.y0, SCENE.height);
    btn.style.width = pct(b.x1 - b.x0, SCENE.width);
    btn.style.height = pct(b.y1 - b.y0, SCENE.height);
    var lab = document.createElement('span');
    lab.className = 'st-hot-label';
    if (!custom) lab.setAttribute('data-i18n', h.label);
    lab.textContent = spotName(h);   // the owner's text: textContent only
    btn.appendChild(lab);
    world.appendChild(btn);
  }

  // Owner-set labels follow the language switch by hand (no data-i18n key).
  function relabelSpots() {
    world.querySelectorAll('.st-hot').forEach(function (btn) {
      var h = hotById(btn.getAttribute('data-hot'));
      var c = h && spotSet(h.id);
      if (!h || !(c.vi || c.en)) return;
      btn.setAttribute('aria-label', spotName(h));
      btn.querySelector('.st-hot-label').textContent = spotName(h);
    });
  }

  // The bottom nav: a button whose spot is taken out goes too.
  var NAV_SPOT = { door: 'door', fitting: 'fitting', shelves: 'display', sewing: 'sewing', tu: 'tu', counter: 'counter' };
  function syncNav() {
    document.querySelectorAll('.st-nav [data-go]').forEach(function (b) {
      var id = NAV_SPOT[b.getAttribute('data-go')];
      b.classList.toggle('is-off', !!id && spotOff(id));
    });
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
    udonEl = null; memoPins = null;
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
    walkToken++;
    player.x = SCENE.startX; player.facing = 1; player.moving = false; player.moved = false;
    layout();
    try { sessionStorage.setItem('gem-scene', name); } catch (e) { /* private mode */ }
  }

  // Fade out, swap scenes, fade back in once the new wall has loaded.
  var sceneInHistory = false;
  function goScene(name, then, fromHistory) {
    if (name === sceneName) { if (then) then(); return; }
    closeSheet();
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
        if (then) setTimeout(then, 250);
      };
      if (bg.complete && bg.naturalWidth) show();
      else { bg.addEventListener('load', show, { once: true }); bg.addEventListener('error', show, { once: true }); setTimeout(show, 2500); }
    }, 260);
  }

  function enterStudio() {
    walkTo(standX(hotById('enter')), function () { goScene('in', hello); });
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
      if (WEAR_AT[key]) fr.style.aspectRatio = String(WEAR_AT[key][0]);
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
    });
    dressWear();
    renderCargo();
    player.frame = null;
  }

  /* ---------- accessories on the character ----------
     Anything can be tried on; a tried piece stays for this visit
     (sessionStorage), a piece you own stays for good (localStorage). */
  var worn = [];
  var SLOT_ORDER = ['hair', 'bag', 'wrist', 'charm'];   // drawing order, back to front

  function owns(sku) { return !!(window.GemTu && window.GemTu.owns(sku)); }

  function wearPut(sku) {
    var slot = WEAR[sku].slot;
    worn = worn.filter(function (s) { return WEAR[s].slot !== slot; });
    worn.push(sku);
  }

  function loadWorn() {
    var a = [], b = [];
    try { a = JSON.parse(sessionStorage.getItem('gem-mac') || '[]'); } catch (e) { /* private mode */ }
    try { b = JSON.parse(localStorage.getItem('gem-mac') || '[]'); } catch (e) { /* private mode */ }
    worn = [];
    (Array.isArray(b) ? b.filter(owns) : []).concat(Array.isArray(a) ? a : []).forEach(function (s) {
      if (typeof s === 'string' && WEAR.hasOwnProperty(s) && worn.indexOf(s) < 0) wearPut(s);
    });
  }

  function saveWorn() {
    try { sessionStorage.setItem('gem-mac', JSON.stringify(worn)); } catch (e) { /* private mode */ }
    try { localStorage.setItem('gem-mac', JSON.stringify(worn.filter(owns))); } catch (e) { /* private mode */ }
  }

  function toggleWear(sku) {
    if (!WEAR.hasOwnProperty(sku)) return false;
    var on = worn.indexOf(sku) < 0;
    if (on) wearPut(sku);
    else worn = worn.filter(function (s) { return s !== sku; });
    saveWorn();
    dressWear();
    return on;
  }

  function dressWear() {
    var list = worn.slice().sort(function (a, b) {
      return SLOT_ORDER.indexOf(WEAR[a].slot) - SLOT_ORDER.indexOf(WEAR[b].slot);
    });
    var bag = list.some(function (s) { return WEAR[s].slot === 'bag'; });
    Object.keys(frameEls).forEach(function (name) {
      var fr = frameEls[name], at = WEAR_AT[who + '-' + name];
      fr.querySelectorAll('.st-acc').forEach(function (n) { n.remove(); });
      if (!at) return;
      list.forEach(function (sku) {
        var w = WEAR[sku];
        var x = w.at === 'head' ? at[3] : at[1];
        var y = w.at === 'head' ? at[4] : at[2];
        // Offsets are in character heights (÷ aspect for x): with a bag in
        // hand, the charm hangs off its far side and the strap off the near
        // side, so the bag doesn't hide them.
        y += w.dy;
        if (w.slot === 'charm') { x += (bag ? 0.05 : 0.01) / at[0]; y += bag ? 0.02 : -0.01; }   // clipped to the bag's handle
        var im = document.createElement('img');
        im.className = 'st-acc';
        im.src = 'images/studio/wear/' + sku + '.webp';
        im.alt = '';
        im.draggable = false;
        im.style.left = (x * 100).toFixed(2) + '%';
        im.style.top = (y * 100).toFixed(2) + '%';
        im.style.height = (w.h * 100) + '%';
        im.style.transform = w.shift;
        fr.appendChild(im);
      });
      // the fist back on top of whatever it holds
      if (at.length > 5 && list.some(function (sku) { return WEAR[sku].at === 'hand'; })) {
        var fist = document.createElement('img');
        fist.className = 'st-acc';
        fist.src = 'images/studio/char/' + who + '-' + name + '-tay.webp';
        fist.alt = '';
        fist.draggable = false;
        fist.style.left = (at[5] * 100).toFixed(2) + '%';
        fist.style.top = (at[6] * 100).toFixed(2) + '%';
        fist.style.width = (at[7] * 100).toFixed(2) + '%';
        fist.style.height = (at[8] * 100).toFixed(2) + '%';
        fr.appendChild(fist);
      }
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
  // A sheet is a history step, like a dialog in an app: the phone's Back
  // gesture / button closes it instead of leaving the studio.
  var sheetInHistory = false;

  // full: the sheet takes the whole screen (the design table: things are
  // dragged inside it, so only the grab handle pulls it down)
  function openSheet(html, full) {
    if (modal.hidden) lastFocus = document.activeElement;
    sheetEl.classList.toggle('is-full', !!full);
    modal.classList.toggle('is-full', !!full);
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
        e.target.closest('canvas, input, textarea, select, .st-grid--photos'))) return;
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
  }

  /* ---------- swipe the stage to walk ----------
     Testers swiped instead of tapping. A sideways drag moves the world with
     the finger (like a map) and the character walks along; letting go with
     some speed carries them a bit further. A tap still walks to the spot. */
  var swiped = 0;   // time of the last swipe: the click that follows is not a tap
  function bindSwipe() {
    var st = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.st-udon, .st-shelf-prod')) return;   // those are dragged themselves
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
      player.moving = false;
      var fling = -was.v * 260 / k;     // keep going a little in the swipe's direction
      if (Math.abs(fling) > 40 && performance.now() - was.lastT < 80) walkTo(player.x + fling);
      else render();
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
        : '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>') +
      (designable(sku) && !spotOff('sewing')
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

  function fittingSheet() {
    openSheet(
      head('studio.fitting_h', 'studio.fitting_p') +
      '<div class="fit">' +
        '<div class="fit-side">' +
          '<figure class="fit-model"><img alt=""><figcaption class="fit-cap"></figcaption></figure>' +
          '<p class="fit-wear"><button type="button" class="st-btn" data-wear></button></p>' +
          tr('p', 'studio.wear_note', ' class="fit-note"') +
        '</div>' +
        '<ul class="fit-list"></ul>' +
      '</div>'
    );
    renderFitting();
  }

  function renderFitting() {
    var root = sheetBody.querySelector('.fit');
    if (!root) return;
    var info = window.GemBasket ? window.GemBasket.info(tryOn) : null;
    var model = root.querySelector('.fit-model img');
    model.src = 'images/studio/wear/' + tryOn + '-mac.webp';
    root.querySelector('.fit-cap').textContent = info ? info.name : '';
    var wb = root.querySelector('[data-wear]'), wearing = worn.indexOf(tryOn) >= 0;
    wb.setAttribute('data-wear', tryOn);
    wb.textContent = t(wearing ? 'studio.wear_off' : 'studio.wear_on');
    wb.classList.toggle('is-added', wearing);
    root.querySelector('.fit-list').innerHTML = WEARABLES.map(function (sku) {
      var it = window.GemBasket ? window.GemBasket.info(sku) : null;
      if (!it) return '';
      var have = window.GemTu && window.GemTu.owns(sku);
      return '<li class="fit-item' + (sku === tryOn ? ' is-on' : '') + '">' +
        '<button type="button" class="fit-pick" data-try="' + esc(sku) + '" aria-pressed="' + (sku === tryOn) + '">' +
          (worn.indexOf(sku) >= 0 ? tr('i', 'studio.wear_tag', ' class="fit-worn"') : '') +
          '<img src="images/studio/wear/' + esc(sku) + '.webp" alt="" loading="lazy">' +
          '<b>' + esc(it.name) + '</b>' +
        '</button>' +
        (have
          ? tr('span', 'studio.fitting_have', ' class="st-lock-tag is-have"')
          : it.inStock
            ? '<button type="button" class="st-btn st-btn-sm" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>'
            : tr('span', 'studio.out', ' class="st-lock-tag"')) +
      '</li>';
    }).join('');
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
    held: null, basket: [], sewn: false, card: null, from: false, by: '', title: '' };

  function specNow() { return P.encode(D.d); }

  function lng() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  function pointsUsed() {
    return D.d.sketch.reduce(function (n, s) { return n + s.pts.length; }, 0);
  }

  function designerSheet() {
    if (!P) return;
    // A fresh piece starts dressed in a mood rather than grey "Gem picks".
    if (!D.d.fab && !D.d.tones.length && !D.d.prints.length && D.d.layout !== 'tuve') P.applyMood(D.d, P.MOODS[0]);
    D.held = null; D.sewn = false; D.card = null;
    D.basket = basketFor(D.d);
    openSheet(
      head('studio.sewing_h', 'studio.sewing_p') +
      '<div class="pt">' +
        '<div class="pt-top">' +
          '<div class="pt-tabs" role="group" data-i18n-attr="aria-label:studio.pt_products" aria-label="' + esc(t('studio.pt_products')) + '"></div>' +
        '</div>' +
        '<div class="pt-left">' +
          '<div class="pt-shared" hidden></div>' +
          '<div class="pt-view">' +
            '<div class="pt-stage">' +
              '<div class="pt-board"></div>' +
              // "from my drawing": draw straight on the piece
              '<canvas class="pt-canvas" width="680" height="680" hidden data-i18n-attr="aria-label:studio.pt_draw" aria-label="' + esc(t('studio.pt_draw')) + '"></canvas>' +
              // a real piece Gem has sewn, pinned to the corner like a photo
              '<button type="button" class="gv-polaroid" data-gv-zoom data-i18n-attr="aria-label:studio.gv_next" aria-label="' + esc(t('studio.gv_next')) + '">' +
                '<span class="gv-photo"><img alt="" draggable="false"></span>' +
                '<span class="gv-cap" data-i18n="studio.pt_real_cap">' + esc(t('studio.pt_real_cap')) + '</span>' +
              '</button>' +
              '<button type="button" class="gv-next" data-gv-next hidden data-i18n-attr="aria-label:studio.gv_next" aria-label="' + esc(t('studio.gv_next')) + '">›</button>' +
              // Udon the teacher sits by the piece; sews and cheers there too
              '<div class="gv-udon" aria-hidden="true">' + GV_POSES.map(function (n, i) {
                return '<img src="images/studio/udon/ud-gv-' + n + '.webp" alt="" draggable="false" data-gv="' + n + '"' + (i ? ' hidden' : '') + '>';
              }).join('') + '</div>' +
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
            '<p class="gv-say" aria-live="polite"></p>' +
          '</div>' +
        '</div>' +
        '<div class="pt-side">' +
          '<section class="pt-sec">' + tr('h3', 'studio.pt_moods', ' class="pt-label"') + '<div class="pt-moods" role="group"></div></section>' +
          '<section class="pt-sec">' +
            '<div class="pt-sec-row">' + tr('h3', 'studio.pt_basket', ' class="pt-label"') +
              '<span class="pt-sec-acts">' +
                '<button type="button" class="pt-tool pt-mini" data-pt="own" aria-expanded="false" data-i18n="studio.pt_own">' + esc(t('studio.pt_own')) + '</button>' +
                '<button type="button" class="pt-tool pt-mini" data-pt="rummage" data-i18n="studio.pt_rummage">' + esc(t('studio.pt_rummage')) + '</button>' +
              '</span></div>' +
            // own colour: the browser's colour picker + a few starting points
            '<div class="pt-own" hidden>' +
              tr('p', 'studio.pt_own_h', ' class="pt-own-h"') +
              '<div class="pt-own-row">' +
                '<input type="color" name="own" value="#' + ownColour() + '" data-i18n-attr="aria-label:studio.pt_own_h" aria-label="' + esc(t('studio.pt_own_h')) + '">' +
                OWN_PICKS.map(function (h) {
                  return '<button type="button" class="pt-own-dot" data-own-pick="' + h + '" style="background:#' + h + '" aria-label="#' + h + '"></button>';
                }).join('') +
              '</div>' +
              '<button type="button" class="st-btn pt-own-go" data-own-go data-i18n="studio.pt_own_go">' + esc(t('studio.pt_own_go')) + '</button>' +
              tr('p', 'studio.pt_own_note', ' class="pt-small"') +
            '</div>' +
            '<div class="pt-basket"><div class="pt-scraps"></div>' +
              '<img class="pt-ro" src="' + P.VAI + 'ro-truoc.webp" alt="" draggable="false"></div>' +
          '</section>' +
          '<div class="pt-shapes pt-chips" role="group" hidden></div>' +
          '<section class="pt-sec">' +
            '<div class="pt-sec-row">' + tr('h3', 'studio.pt_layout', ' class="pt-label"') +
              '<span class="pt-sec-acts">' +
                '<button type="button" class="pt-tool pt-mini" data-pt="shuffle" data-i18n="studio.pt_shuffle">' + esc(t('studio.pt_shuffle')) + '</button>' +
                '<button type="button" class="pt-tool pt-mini" data-pt="random" data-i18n="studio.pt_random">' + esc(t('studio.pt_random')) + '</button>' +
              '</span></div>' +
            '<div class="pt-layouts pt-chips"></div></section>' +
          '<div class="pt-actions">' +
            '<span class="pt-price"></span>' +
            '<button type="button" class="pt-tool pt-add" data-pt="add" data-i18n="studio.pt_add">' + esc(t('studio.pt_add')) + '</button>' +
            '<button type="button" class="st-btn pt-sew" data-pt="sew" data-i18n="studio.pt_sew">' + esc(t('studio.pt_sew')) + '</button>' +
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
      '</div>',
      true
    );
    var root = sheetBody.querySelector('.pt');
    root.querySelector('[name="other"]').value = D.d.other;
    root.querySelector('[name="note"]').value = D.d.note;
    root.querySelector('[name="by"]').value = myName();
    bindCanvas(root.querySelector('.pt-canvas'));
    bindScrapDrag(root.querySelector('.pt-scraps'));
    renderDesigner();
    teach(gvRef ? 'ref' : 'hi');
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

  // A fabric key: 0..44 (the painted catalogue) or "c<kind><hex>" (own colour).
  function parseKey(str) { return /^\d+$/.test(str) ? +str : P.isCustom(str) ? str : null; }

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
    if (m) return m.ids.slice(0, BASKET_N);
    return fillBasket(keysOn(d).slice(0, BASKET_N));
  }

  // The 9 kinds in the customer's own colour: the whole basket.
  // starting points next to the picker: colours Gem's fabrics don't cover
  var OWN_PICKS = ['7a4fa0', 'c2577f', 'e08a3c', 'e3c04a', '2f7f77', '1f3f6b', '5b3a29', '2e2c29'];
  function ownColour() {
    try { var h = localStorage.getItem('gem-own-colour'); if (/^[0-9a-f]{6}$/.test(h || '')) return h; } catch (e) { /* private mode */ }
    return OWN_PICKS[0];
  }

  function ownBasket(hex) {
    var out = [];
    for (var k = 0; k < 9; k++) out.push('c' + k + hex);
    return out;
  }

  function fillBasket(ids) {
    var out = ids.slice();
    var tries = 0;
    while (out.length < BASKET_N && tries++ < 200) {
      var r = Math.floor(Math.random() * P.N_FABRICS);
      if (out.indexOf(r) < 0) out.push(r);
    }
    return out;
  }

  function fabricName(key) { return P.keyName(key, lng()); }

  function scrapHtml(key, k) {
    var shape = P.VAI + 'dang-' + (k % SCRAP_SHAPES + 1) + '.webp';
    // an own colour not dyed yet: plain colour until gem:fabric says it's ready
    var src = P.keySrc(key);
    var bg = src ? 'background-image:url(' + src + ')' : 'background-color:#' + String(key).slice(2);
    return '<span class="pt-sf" aria-hidden="true" style="' + bg +
      ';-webkit-mask-image:url(' + shape + ');mask-image:url(' + shape + ')"></span>' +
      '<img class="pt-ss" src="' + shape + '" alt="" draggable="false">';
  }

  function renderBasket() {
    var box = sheetBody.querySelector('.pt-scraps');
    if (!box) return;
    box.innerHTML = D.basket.map(function (id, k) {
      // standing loose in the basket: each a little turned and shifted
      var rot = ((k * 37) % 20) - 10, dy = (k % 3) * 4;
      return '<button type="button" class="pt-scrap' + (D.held === id ? ' is-held' : '') + '" data-scrap="' + id +
        '" style="--r:' + rot + 'deg;--dy:' + dy + 'px" aria-pressed="' + (D.held === id) + '" aria-label="' + esc(fabricName(id)) + '">' +
        scrapHtml(id, k) + '</button>';
    }).join('');
  }

  function renderMoods() {
    var box = sheetBody.querySelector('.pt-moods');
    if (!box) return;
    var cur = P.moodOf(D.d), l = lng();
    var gem = !D.d.fab && D.d.tones[0] === P.GEM;
    box.innerHTML = P.MOODS.map(function (m) {
      var on = cur === m;
      return '<button type="button" class="pt-mood' + (on ? ' is-on' : '') + '" data-mood="' + m.id + '" aria-pressed="' + on + '">' +
        '<img src="' + P.VAI + 'mood-' + m.id + '.webp" alt="" draggable="false"><span>' + esc(m[l]) + '</span></button>';
    }).join('') +
      // Gem picks the fabrics: the order note says so, the preview is a guess
      '<button type="button" class="pt-mood' + (gem ? ' is-on' : '') + '" data-mood="gem" aria-pressed="' + gem + '">' +
        '<img src="images/mascot/udon_portrait.png" alt="" draggable="false"><span>' + esc(t('studio.pt_mood_gem')) + '</span></button>';
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
    P.setPatch(D.d, i, id);
    P.syncTaste(D.d);
    unsew();
    renderDesigner();
    var hit = sheetBody.querySelectorAll('.pt-board [data-i="' + i + '"]');
    hit.forEach(function (el) { el.classList.add('pt-pop'); });
  }

  function tapPatch(i) {
    var id;
    if (D.held != null) id = D.held;
    else {
      // nothing picked up: the next scrap in the basket
      var cur = P.keyAt(D.d, i);
      var at = D.basket.indexOf(cur);
      id = D.basket[(at + 1) % D.basket.length];
    }
    putFabric(i, id);
  }

  // Drag a scrap onto a patch. A short press without moving stays a tap.
  var scrapDragged = 0;
  function bindScrapDrag(box) {
    var st = null;
    box.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('[data-scrap]');
      if (!b || (e.pointerType === 'mouse' && e.button !== 0)) return;
      st = { b: b, id: parseKey(b.getAttribute('data-scrap')), x: e.clientX, y: e.clientY, ghost: null, pid: e.pointerId };
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
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    var end = function (e) {
      if (!st || e.pointerId !== st.pid) return;
      var s0 = st; st = null;
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
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (x) { /* old browser */ }
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

    var tab = d.product === 'lotcocv' ? 'lotcoc' : d.product;   // the square coaster lives under "Lót cốc"
    root.querySelector('.pt-tabs').innerHTML = P.PRODUCT_ORDER.map(function (id) {
      return '<button type="button" class="pt-tab' + (id === tab ? ' is-on' : '') +
        '" data-product="' + id + '" aria-pressed="' + (id === tab) + '">' + esc(P.PRODUCTS[id][l]) + '</button>';
    }).join('');
    var shapes = root.querySelector('.pt-shapes');
    shapes.hidden = tab !== 'lotcoc';
    shapes.innerHTML = tab !== 'lotcoc' ? '' : '<span class="pt-label">' + esc(t('studio.pt_shape')) + '</span>' +
      [['lotcoc', 'studio.pt_round'], ['lotcocv', 'studio.pt_square']].map(function (x) {
        var on = d.product === x[0];
        return '<button type="button" class="pt-chip' + (on ? ' is-on' : '') + '" data-shape="' + x[0] + '" aria-pressed="' + on + '">' +
          '<span class="pt-shape-ic pt-shape-' + x[0] + '" aria-hidden="true"></span><span>' + esc(t(x[1])) + '</span></button>';
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
      return chip('data-layout', id, id === d.layout, P.LAYOUTS[id][l], icon);
    }).join('');

    root.querySelector('.pt-fabrics').innerHTML = P.FABRIC_ORDER.map(function (id) {
      return chip('data-fabric', id, d.fabrics.indexOf(id) >= 0, P.FABRICS[id][l]);
    }).join('');

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

  // The parts that change while typing / drawing, without rebuilding inputs.
  function renderPreview() {
    var root = sheetBody.querySelector('.pt');
    if (!root) return;
    var d = D.d, spec = specNow(), ok = P.isComplete(d);
    root.querySelector('.pt-board').innerHTML = P.svg(d, { title: esc(P.describe(d)), hit: true });
    // a short instruction when it matters; otherwise Udon's line shows
    root.querySelector('.pt-hint').textContent = d.layout === 'net' ? t('studio.pt_net_on')
      : d.layout === 'tuve' ? t('studio.pt_draw_on')
      : D.held != null ? t('studio.pt_hint_held').replace('{vai}', fabricName(D.held).toLowerCase()) : '';
    drawCanvas();
    root.querySelector('[data-pt="undo"]').disabled = !d.sketch.length;
    root.querySelector('[data-pt="clear"]').disabled = !d.sketch.length;
    root.querySelector('.pt-draw-msg').textContent = d.layout === 'tuve' && !d.sketch.length
      ? t('studio.pt_draw_need')
      : pointsUsed() >= P.MAX_POINTS ? t('studio.pt_draw_full') : '';

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

    var sku = P.PRODUCTS[d.product].sku;
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    root.querySelectorAll('.pt-price').forEach(function (el) { el.textContent = info ? info.price : ''; });
    root.querySelectorAll('[data-pt="add"]').forEach(function (add) { add.disabled = !ok || (info && !info.inStock); });
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
          if (pt) tapPatch(+pt.getAttribute('data-i'));
          return;
        }
      }
      st.pts = P.settle(st.raw);
      delete st.raw;
      // over the point budget: keep what fits
      var room = P.MAX_POINTS - (pointsUsed() - st.pts.length);
      if (st.pts.length > room) st.pts = st.pts.slice(0, Math.max(1, room));
      if (D.d.layout === 'net') { refitNet(); unsew(); renderDesigner(); return; }
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
    var ids = keysOn(D.d);
    return ids.length ? ids : D.basket;
  }

  // Round / square coaster: the same product, another shape.
  function setShape(product) {
    var pal = paletteNow(), keep = D.d;
    D.d = P.blank(product);
    ['tones', 'prints', 'fabrics', 'other', 'note', 'sketch', 'img'].forEach(function (k) { D.d[k] = keep[k]; });
    D.d.layout = P.PRODUCTS[product].layouts.indexOf(keep.layout) >= 0 ? keep.layout : D.d.layout;
    if (keep.fab && D.d.layout !== 'tuve') { P.scatter(D.d, pal); P.syncTaste(D.d); }
  }

  function designerClick(e) {
    var el, teachAfter = null, shuffled = false;
    if (e.target.closest('[data-gv-next]')) { teach('next'); return true; }
    var stz = sheetBody.querySelector('.pt-stage.is-zoom');
    if (stz && !e.target.closest('[data-gv-zoom], [data-gv-next]')) {
      stz.classList.remove('is-zoom');
      sheetBody.querySelector('.gv-next').hidden = true;
    }
    if (e.target.closest('[data-gv-zoom]')) {
      // the pinned photo: tap to see it big, tap again to put it back
      var st = sheetBody.querySelector('.pt-stage');
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
    if ((el = e.target.closest('.pt-board [data-i]'))) {
      tapPatch(+el.getAttribute('data-i'));
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
      renderBasket(); renderPreview();
      var scr = sheetBody.querySelector('.pt-scraps');
      if (scr) { scr.classList.remove('is-rummage'); void scr.offsetWidth; scr.classList.add('is-rummage'); }
      return true;
    }
    if ((el = e.target.closest('[data-own-pick]'))) {
      sheetBody.querySelector('[name="own"]').value = '#' + el.getAttribute('data-own-pick');
      return true;
    }
    if ((el = e.target.closest('[data-mood]'))) {
      if (el.getAttribute('data-mood') === 'gem') {
        D.d.fab = ''; D.d.cus = []; D.d.moodId = '';
        D.d.tones = [P.GEM]; D.d.prints = [P.GEM];
        D.basket = fillBasket([]);
        D.held = null;
        unsew(); renderDesigner(); teach('taste');
        return true;
      }
      var mood = P.MOODS.filter(function (m) { return m.id === el.getAttribute('data-mood'); })[0];
      if (!mood) return true;
      P.applyMood(D.d, mood, true);
      D.basket = mood.ids.slice(0, BASKET_N);
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
      var keep = D.d, pal = paletteNow();
      D.d = P.blank(el.getAttribute('data-product'));
      // carry the taste over to the new piece
      D.d.tones = keep.tones; D.d.prints = keep.prints; D.d.fabrics = keep.fabrics;
      D.d.other = keep.other; D.d.note = keep.note; D.d.sketch = keep.sketch; D.d.img = keep.img;
      if (keep.layout === 'tuve') D.d.layout = 'tuve';
      var km = P.moodOf(keep);
      if (km) P.applyMood(D.d, km, true);
      else if (keep.fab) { D.d.fab = P.scatter(D.d, pal); P.syncTaste(D.d); }
    } else if ((el = e.target.closest('[data-layout]'))) {
      var pal2 = paletteNow();
      D.d.layout = el.getAttribute('data-layout');
      if (D.d.layout === 'net') { if (!D.d.fab) D.d.fab = ''; P.refit(D.d, pal2); P.syncTaste(D.d); }
      else if (D.d.fab) P.scatter(D.d, pal2);
    } else if ((el = e.target.closest('[data-tone]'))) {
      toggle('tones', el.getAttribute('data-tone'), P.MAX_TONES);
      D.d.fab = '';   // the chips decide again
      D.basket = basketFor(D.d);
      teachAfter = 'taste';
    } else if ((el = e.target.closest('[data-print]'))) {
      toggle('prints', el.getAttribute('data-print'));
      D.d.fab = '';
      D.basket = basketFor(D.d);
      teachAfter = 'taste';
    } else if ((el = e.target.closest('[data-fabric]'))) {
      toggle('fabrics', el.getAttribute('data-fabric'));
    } else if ((el = e.target.closest('[data-ink]'))) {
      D.ink = +el.getAttribute('data-ink');
    } else if ((el = e.target.closest('[data-size]'))) {
      D.size = +el.getAttribute('data-size');
    } else if ((el = e.target.closest('[data-pt]'))) {
      var act = el.getAttribute('data-pt');
      if (act === 'undo') {
        D.d.sketch.pop();
        if (D.d.layout === 'net') refitNet();
      } else if (act === 'clear') {
        D.d.sketch = [];
        if (D.d.layout === 'net') refitNet();
      } else if (act === 'photo-del') {
        D.d.img = '';
      } else if (act === 'random') {
        var rm = P.MOODS[Math.floor(Math.random() * P.MOODS.length)];
        var lays = P.PRODUCTS[D.d.product].layouts.filter(function (x) { return x !== 'tuve'; });
        D.d.layout = lays[Math.floor(Math.random() * lays.length)];
        D.d.fab = P.scatter(D.d, rm.ids);
        P.syncTaste(D.d);
        D.basket = rm.ids.slice(0, BASKET_N);
        D.held = null;
        shuffled = true;
        teachAfter = 'taste';
      } else if (act === 'shuffle') {
        if (D.d.layout === 'tuve') return true;
        D.d.fab = P.scatter(D.d, D.basket);
        P.syncTaste(D.d);
        shuffled = true;
      } else if (act === 'own') {
        var box = sheetBody.querySelector('.pt-own');
        box.hidden = !box.hidden;
        el.setAttribute('aria-expanded', String(!box.hidden));
        return true;
      } else if (act === 'rummage') {
        D.basket = fillBasket([]);
        D.held = null;
        renderBasket();
        renderPreview();
        var sc = sheetBody.querySelector('.pt-scraps');
        if (sc) { sc.classList.remove('is-rummage'); void sc.offsetWidth; sc.classList.add('is-rummage'); }
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
      stage.classList.toggle('is-drop-ok', overCart(ev.clientX, ev.clientY) || overBasket(ev.clientX, ev.clientY));
    };
    var up = function (ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      stage.classList.remove('is-drop-ok');
      swiped = Date.now();   // the click that follows is ours, not a walk / hotspot
      if (!ghost) { if (opts.tap) opts.tap(); return; }
      var where = overBasket(ev.clientX, ev.clientY) ? 'basket' : overCart(ev.clientX, ev.clientY) ? 'cart' : null;
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
    Object.keys(P.PRODUCTS).forEach(function (k) { if (P.PRODUCTS[k].sku === sku && !id) id = k; });
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
    var h = hotById('sewing');
    if (h && !spotOff('sewing')) walkTo(standX(h));
    designerSheet();
  }

  function productSheet(sku) {
    var card = productCard(sku);
    if (!card) return;
    openSheet(tr('p', 'studio.prod_tip', ' class="st-lead st-prod-tip"') +
      '<ul class="st-grid st-grid--one">' + card + '</ul>' +

      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>');
  }

  function bindProducts() {
    world.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.st-shelf-prod');
      if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      var sku = el.getAttribute('data-sku');
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      dragFrom(e, img, {
        start: function () { el.classList.add('is-lifted'); },
        cancel: function () { el.classList.remove('is-lifted'); },
        tap: function () { productSheet(sku); },
        drop: function (where, ghost) {
          el.classList.remove('is-lifted');
          var info = window.GemBasket && window.GemBasket.info(sku);
          if (!info || !info.inStock) { say('studio.prod_out', 3000); return false; }
          window.GemBasket.add(sku, ghost);
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
    walkToken++; player.moving = false;
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

  var ACTIONS = {
    door: doorSheet,
    sofa: sofaSheet,
    rail: railSheet,
    fitting: fittingSheet,
    pegboard: function () { shelfSheet('pegboard'); },
    display: function () { shelfSheet('display'); },
    cabinet: function () { shelfSheet('cabinet'); },
    sewing: designerSheet,
    memo: memoSheet,
    tu: tuSheet,
    counter: counter,
    enter: enterStudio
  };

  // Open right away and let the character walk over behind the sheet.
  // (Opening only on arrival meant a second tap mid-walk cancelled the
  // first, so it took several taps to get anything open.)
  function visit(id, open) {
    if (sceneName === 'out' && id !== 'enter') {   // a nav button from the street: go in first
      goScene('in', function () { visit(id, open); });
      return;
    }
    var h = hotById(id);
    if (!h || spotOff(id)) return;
    var cfg = spotSet(id), act = cfg.act || (cfg.link ? 'link' : id);
    var link = act === 'link' ? cfg.link : null;
    if (act === 'none') { walkTo(standX(h)); return; }
    if (act !== id && act !== 'link' && open !== false) {
      // the owner gave this spot another spot's action
      walkTo(standX(h));
      if (act.indexOf('shop:') === 0) shelfSheet(act.slice(5));
      else if (act === 'enter') enterStudio();
      else if (ACTIONS[act]) ACTIONS[act]();
      return;
    }
    if (link && open !== false) {
      // the owner pointed this spot at another page
      walkTo(standX(h), function () {
        if (/^https:/.test(link)) window.open(link, '_blank', 'noopener');
        else location.href = link;
      });
      return;
    }
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
    bindSwipe();
    bindProducts();
    bindSheetDrag();
    // Back gesture / button: closes the open sheet first, then (inside) steps
    // back out to the street, and only then leaves the page.
    window.addEventListener('popstate', function () {
      if (ignorePop) { ignorePop = false; return; }
      if (!modal.hidden) { closeSheet(true); return; }
      if (sceneInHistory && sceneName === 'in') { sceneInHistory = false; goScene('out', null, true); }
    });
    world.addEventListener('click', function (e) {
      if (Date.now() - swiped < 350) return;   // the end of a swipe, not a tap
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
          visit('display', false);
        } else {
          // The places people come for open straight away.
          visit(go, go === 'sewing' || go === 'counter' || go === 'tu' || go === 'enter');
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
        var card = add.closest('.st-prod, .fit-item');
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
      if (tri) { tryOn = tri.getAttribute('data-try'); renderFitting(); return; }
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
    modal.addEventListener('change', function (e) {
      if (e.target.name === 'photo' && e.target.closest('.pt')) designerPhoto(e.target);
    });
    modal.addEventListener('input', function (e) {
      if (e.target.closest('.pt')) { designerInput(e); return; }
      if (e.target.name !== 'body' || !e.target.closest('.mb-form')) return;
      e.target.closest('.mb-form').querySelector('.mb-count').textContent = e.target.value.length + '/280';
    });

    document.addEventListener('gem:langchange', function () { renderDesigner(); renderTu(); relabelSpots(); });
    // an own-colour fabric finished dyeing: swap the plain colour for it
    var fabricTimer = null;
    document.addEventListener('gem:fabric', function () {
      clearTimeout(fabricTimer);
      fabricTimer = setTimeout(function () { if (sheetBody.querySelector('.pt')) { renderBasket(); renderPreview(); } }, 60);
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
    bubbleText = document.getElementById('st-bubble-text');
    modal = document.getElementById('st-modal');
    sheetBody = document.getElementById('st-sheet-body');
    sheetEl = document.querySelector('.st-sheet');
    if (!stage || !world) return;

    loadLayout().then(function (L) {
      if (L) applyLayout(L);
      start();
      document.documentElement.classList.remove('st-wait');
    });
  });

  function start() {
    syncNav();
    INSIDE = { width: SCENE.width, height: SCENE.height, startX: SCENE.startX,
      bg: LAYOUT ? LAYOUT.bg.src : 'images/studio/bg/strip.webp' };
    loadWorn();
    bind();
    cartCount = window.GemBasket ? window.GemBasket.count() : 0;
    loadNotes();   // pins on the memo board

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
    if (sceneName === 'in') { hello(); return; }
    // the studio wall, fetched while they look at the street
    new Image().src = INSIDE.bg;
    var seenOut = false;
    try { seenOut = localStorage.getItem('gem-studio-out') === '1'; } catch (e) { /* private mode */ }
    if (!seenOut) {
      setTimeout(function () { say('studio.out_intro', 6000); }, 600);
      try { localStorage.setItem('gem-studio-out', '1'); } catch (e) { /* ignore */ }
    }
  }

  // First time inside: Udon says where things are.
  function hello() {
    var seen = false;
    try { seen = localStorage.getItem('gem-studio-intro') === '1'; } catch (e) { /* private mode */ }
    if (!seen) {
      setTimeout(function () { say('studio.intro', 7000); }, 600);
      try { localStorage.setItem('gem-studio-intro', '1'); } catch (e) { /* ignore */ }
    }
  }
})();
