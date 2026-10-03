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
//     start: x                               where the character starts
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

  function blank(bg) {
    bg = bg || { src: 'images/studio/bg/strip-trong.webp', w: 6484, h: 1024 };
    var hot = {};
    var gap = (bg.w - 400) / SPOTS.length;
    SPOTS.forEach(function (sp, i) {
      var cx = 200 + gap * (i + 0.5);
      hot[sp.id] = { box: [cx - gap * 0.35, 380, cx + gap * 0.35, 640], stand: cx };
    });
    return {
      v: 1, bg: { src: bg.src, w: bg.w, h: bg.h }, items: [], hot: hot,
      udon: { x: bg.w - 400, y: 450, w: 128, h: 140 }, start: 400
    };
  }

  function sanitize(d) {
    if (!d || typeof d !== 'object' || !d.bg || !srcOk(d.bg.src)) return null;
    var W = num(d.bg.w, 800, 20000, 0), H = num(d.bg.h, 400, 4000, 0);
    if (!W || !H) return null;
    var out = blank({ src: d.bg.src, w: W, h: H });

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
      SPOTS.forEach(function (sp) {
        var h = d.hot[sp.id];
        if (!h || !Array.isArray(h.box) || h.box.length !== 4) return;
        var b = h.box.map(function (v, i) { return num(v, 0, i % 2 ? H : W, 0); });
        if (b[2] - b[0] < 20 || b[3] - b[1] < 20) return;
        out.hot[sp.id] = { box: b, stand: num(h.stand, 0, W, (b[0] + b[2]) / 2) };
      });
    }
    if (d.udon) {
      out.udon = { x: num(d.udon.x, 0, W, out.udon.x), y: num(d.udon.y, 0, H, out.udon.y),
        w: num(d.udon.w, 30, 600, 128), h: num(d.udon.h, 30, 600, 140) };
    }
    out.start = num(d.start, 120, W - 120, 400);
    return out;
  }

  return { SPOTS: SPOTS, FEET_Y: FEET_Y, srcOk: srcOk, blank: blank, sanitize: sanitize };
})();
