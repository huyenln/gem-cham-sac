// Gem Chạm Sắc — bố cục Studio Gem (dùng chung: studio.html đọc, admin.html lắp)
//
// The owner lays out the studio in admin.html (tab "Lắp studio") and the
// layout is stored as JSON in the studio_layout table ('draft' / 'live').
// studio.html draws it on top of an empty-wall background. Everything is in
// background-strip pixels:
//
//   {
//     v: 1,
//     bg:    { src, w, h },                  background strip
//     items: [{ src, x, y, w, h, rot, flip, layer, frame }],
//            x, y = centre; rot = degrees; layer 'back' (behind the
//            character) | 'front' (in front); frame = thin wooden frame
//            (for product photos)
//     hot:   { <spot id>: { box: [x0, y0, x1, y1], stand } },
//     udon:  { x, y, w, h },                 top-left + size
//     start: x,                              where the character starts
//     outside: { bg, items, hot: { enter }, start }
//            the street in front of the studio, where studio.html opens;
//            same fields, one hotspot (the door). Missing → OUTSIDE below.
//   }
//
// The JSON comes from the database, so sanitize() rebuilds it from scratch:
// numbers are clamped, image paths must be our own folders or our Supabase
// bucket, unknown keys are dropped. Callers only ever set img.src and style
// numbers from the result — never innerHTML.

window.GemLayout = (function () {
  'use strict';

  var SPOTS = [
    { id: 'door',     vi: 'Cửa vào (chọn nhân vật)' },
    { id: 'sofa',     vi: 'Góc nghỉ chân' },
    { id: 'rail',     vi: 'Đồ 2hand' },
    { id: 'fitting',  vi: 'Góc thử đồ' },
    { id: 'pegboard', vi: 'Phụ kiện nhỏ' },
    { id: 'display',  vi: 'Túi & sổ' },
    { id: 'sewing',   vi: 'Bàn thiết kế' },
    { id: 'tu',       vi: 'Tủ sưu tầm' },
    { id: 'cabinet',  vi: 'Gối, thảm & quà' },
    { id: 'counter',  vi: 'Quầy thu ngân' },
    { id: 'memo',     vi: 'Bảng lời nhắn' }
  ];

  // The street scene has one spot: the door into the studio.
  var OUT_SPOTS = [
    { id: 'enter', vi: 'Cửa vào studio' }
  ];

  // Street scene before the owner lays one out: the facade strip from
  // tools/studio-assets.py --outside (door frame x 1347-1907, floor y 884),
  // with plants, a bench and dragonflies on the window sill.
  var OUTSIDE = {
    bg: { src: 'images/studio/bg/ngoai.webp', w: 2686, h: 1024 },
    items: [
      { src: 'images/studio/cay/cay-06.webp', x: 600, y: 735, w: 311, h: 430 },
      { src: 'images/studio/cay/cay-30.webp', x: 300, y: 835, w: 264, h: 250, layer: 'front' },
      { src: 'images/studio/vn/vn-36.webp', x: 1040, y: 850, w: 312, h: 200 },
      { src: 'images/studio/cay/cay-17.webp', x: 985, y: 725, w: 138, h: 150 },
      { src: 'images/studio/cay/cay-29.webp', x: 1120, y: 755, w: 281, h: 70 },
      { src: 'images/studio/chuon/chuon-01.webp', x: 870, y: 521, w: 179, h: 170 },
      { src: 'images/studio/cay2/cay2-04.webp', x: 1035, y: 531, w: 111, h: 150 },
      { src: 'images/studio/chuon/chuon-09.webp', x: 1200, y: 521, w: 180, h: 170 },
      { src: 'images/studio/cay2/cay2-12.webp', x: 1990, y: 330, w: 228, h: 460 },
      { src: 'images/studio/cay2/cay2-09.webp', x: 2030, y: 785, w: 276, h: 330 },
      { src: 'images/studio/cay/cay-28.webp', x: 2380, y: 850, w: 254, h: 220, layer: 'front' }
    ],
    hot: { enter: { box: [1350, 150, 1905, 884], stand: 1640 } },
    start: 1460   // beside the door: on a phone the door is on screen
  };

  var BUCKET = 'https://dxdovvqsfjeizsoprrfn.supabase.co/storage/v1/object/public/gem-media/';
  var LOCAL = /^images\/(studio|products)\/[a-z0-9_\/.-]+\.(webp|png|jpe?g)$/;
  var REMOTE = /^[A-Za-z0-9%._-]+$/;
  var MAX_ITEMS = 400;
  var FEET_Y = 965;     // the floor line the character walks on (studio.js feetY)

  function srcOk(src) {
    if (typeof src !== 'string' || src.length > 400) return false;
    if (LOCAL.test(src) && src.indexOf('..') < 0) return true;
    return src.indexOf(BUCKET) === 0 && REMOTE.test(src.slice(BUCKET.length));
  }

  function num(v, lo, hi, def) {
    v = Number(v);
    if (!isFinite(v)) return def;
    return Math.max(lo, Math.min(hi, Math.round(v * 10) / 10));
  }

  function spreadHot(spots, W) {
    var hot = {};
    var gap = (W - 400) / spots.length;
    spots.forEach(function (sp, i) {
      var cx = 200 + gap * (i + 0.5);
      hot[sp.id] = { box: [cx - gap * 0.35, 380, cx + gap * 0.35, 640], stand: cx };
    });
    return hot;
  }

  function blank(bg) {
    bg = bg || { src: 'images/studio/bg/strip-tron.webp', w: 6612, h: 1024 };
    return {
      v: 1, bg: { src: bg.src, w: bg.w, h: bg.h }, items: [], hot: spreadHot(SPOTS, bg.w),
      udon: { x: bg.w - 400, y: 450, w: 128, h: 140 }, start: 400,
      outside: outsideDefault()
    };
  }

  function outsideDefault() { return scene(OUTSIDE, OUT_SPOTS); }

  // bg + items + hotspots + start, shared by the studio and the street.
  // null when the background isn't usable.
  function scene(d, spots) {
    if (!d || typeof d !== 'object' || !d.bg || !srcOk(d.bg.src)) return null;
    var W = num(d.bg.w, 800, 20000, 0), H = num(d.bg.h, 400, 4000, 0);
    if (!W || !H) return null;
    var out = { bg: { src: d.bg.src, w: W, h: H }, items: [], hot: spreadHot(spots, W), start: 400 };

    (Array.isArray(d.items) ? d.items : []).slice(0, MAX_ITEMS).forEach(function (it) {
      if (!it || !srcOk(it.src)) return;
      out.items.push({
        src: it.src,
        x: num(it.x, -W, 2 * W, W / 2), y: num(it.y, -H, 2 * H, H / 2),
        w: num(it.w, 4, W, 200), h: num(it.h, 4, 2 * H, 200),
        rot: num(it.rot, -360, 360, 0),
        flip: !!it.flip,
        layer: it.layer === 'front' ? 'front' : 'back',
        frame: !!it.frame
      });
    });

    if (d.hot && typeof d.hot === 'object') {
      spots.forEach(function (sp) {
        var h = d.hot[sp.id];
        if (!h || !Array.isArray(h.box) || h.box.length !== 4) return;
        var b = h.box.map(function (v, i) { return num(v, 0, i % 2 ? H : W, 0); });
        if (b[2] - b[0] < 20 || b[3] - b[1] < 20) return;
        out.hot[sp.id] = { box: b, stand: num(h.stand, 0, W, (b[0] + b[2]) / 2) };
      });
    }
    out.start = num(d.start, 120, W - 120, 400);
    return out;
  }

  function sanitize(d) {
    var s = scene(d, SPOTS);
    if (!s) return null;
    var W = s.bg.w, H = s.bg.h;
    var out = blank(s.bg);
    out.items = s.items; out.hot = s.hot; out.start = s.start;
    if (d.udon) {
      out.udon = { x: num(d.udon.x, 0, W, out.udon.x), y: num(d.udon.y, 0, H, out.udon.y),
        w: num(d.udon.w, 30, 600, 128), h: num(d.udon.h, 30, 600, 140) };
    }
    out.outside = scene(d.outside, OUT_SPOTS) || outsideDefault();
    return out;
  }

  return { SPOTS: SPOTS, OUT_SPOTS: OUT_SPOTS, FEET_Y: FEET_Y, srcOk: srcOk, blank: blank, sanitize: sanitize,
    outsideDefault: outsideDefault };
})();
