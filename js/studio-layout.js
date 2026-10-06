// Gem Chạm Sắc — bố cục Studio Gem (dùng chung: studio.html đọc, admin.html lắp)
//
// The owner lays out the studio in admin.html (tab "Lắp studio") and the
// layout is stored as JSON in the studio_layout table ('draft' / 'live').
// studio.html draws it on top of an empty-wall background. Everything is in
// background-strip pixels:
//
//   {
//     v: 1,
//     bg:    { src, w, h },                  background strip; w may be longer
//            than the picture for backgrounds in EXTEND (owner's "Dài thêm")
//     items: [{ src, x, y, w, h, rot, flip, layer, frame, lock?, sku?,
//               kind?, zone?, board?, show? }],
//            kind: what a tap does (KINDS; none = decoration, a sku = product).
//            zone = { act, link?, vi?, en? } for kind 'zone' (like a spot's
//            settings; the character walks to the piece's x). board =
//            { feed: 'workshop' | 'post' } for kind 'board'. show = { from?,
//            to? } 'YYYY-MM-DD': the piece is only there on those days.
//            Stories and lines live in the studio_info table, by src.
//            x, y = centre; rot = degrees; layer 'back' (behind the
//            character) | 'front' (in front); frame = thin wooden frame
//            (for product photos); sku = a real product: customers tap it
//            for its card or drag it into the basket
//     hot:   { <spot id>: { box: [x0, y0, x1, y1], stand } },
//     udon:  { x, y, w, h },                 top-left + size
//     start: x,                              where the character starts
//     spots: { <spot id>: { off, vi, en, act, link } }   owner's settings per
//            hotspot (both scenes): off = taken out of the studio, vi / en =
//            its label instead of the built-in one, act = what a tap does
//            (ACTS; none = the spot's own), link = the page for act 'link'
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

  // Backgrounds that can be made longer: the picture minus its right cap,
  // then a seamless wall loop (tile) repeated, then the cap (the room's
  // corner). Numbers from tools/studio-assets.py --plain.
  var EXTEND = {
    'images/studio/bg/strip-tron.webp': { w0: 5792, tile: 'images/studio/bg/tuong-lap.webp', tileW: 1040, capR: 296 },
    'images/studio/bg/ngoai.webp': { w0: 2686, tile: 'images/studio/bg/ngoai-lap.webp', tileW: 400, capR: 0 }
  };

  // How to paint a background: one stretched picture, or picture + loop + cap.
  // [{ src, x, w, how: 'fill' | 'left' | 'repeat' | 'right' }], strip px.
  function bgParts(bg) {
    var e = EXTEND[bg.src];
    if (!e || bg.w <= e.w0) return [{ src: bg.src, x: 0, w: bg.w, how: 'fill' }];
    var parts = [
      { src: bg.src, x: 0, w: e.w0 - e.capR, how: 'left' },
      { src: e.tile, x: e.w0 - e.capR, w: bg.w - e.w0, how: 'repeat' }
    ];
    if (e.capR) parts.push({ src: bg.src, x: bg.w - e.capR, w: e.capR, how: 'right' });
    return parts;
  }

  // CSS for one part: the picture's height fills the strip, so widths follow.
  function partStyle(part, W) {
    return {
      left: (part.x / W * 100).toFixed(4) + '%',
      width: (part.w / W * 100).toFixed(4) + '%',
      backgroundImage: 'url("' + part.src + '")',
      backgroundSize: 'auto 100%',
      backgroundRepeat: part.how === 'repeat' ? 'repeat-x' : 'no-repeat',
      backgroundPosition: part.how === 'right' ? 'right top' : 'left top'
    };
  }

  var BUCKET = 'https://dxdovvqsfjeizsoprrfn.supabase.co/storage/v1/object/public/gem-media/';
  var LOCAL = /^images\/(studio|products)\/[a-z0-9_\/.-]+\.(webp|png|jpe?g)$/;
  var REMOTE = /^[A-Za-z0-9%._-]+$/;
  var MAX_ITEMS = 400;
  var MAX_BOXES = 30;
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
    bg = bg || { src: 'images/studio/bg/strip-tron.webp', w: 5792, h: 1024 };
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
    var e = EXTEND[d.bg.src];
    if (e) W = e.w0 + Math.max(0, Math.round((W - e.w0) / e.tileW)) * e.tileW;   // whole loops only
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
        frame: !!it.frame,
        lock: it.lock ? true : undefined,   // editor only: taps pass through it
        sku: typeof it.sku === 'string' && /^[a-z0-9-]{1,40}$/.test(it.sku) ? it.sku : undefined
      });
      behave(out.items[out.items.length - 1], it);
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
    // the owner's own tap boxes ("Khung bấm" → "+ Thêm khung"), besides the built-in ones
    out.boxes = [];
    (Array.isArray(d.boxes) ? d.boxes : []).slice(0, MAX_BOXES).forEach(function (o) {
      if (!o || typeof o.id !== 'string' || !/^k-[a-z0-9]{1,12}$/.test(o.id) || !Array.isArray(o.box) || o.box.length !== 4) return;
      var b = o.box.map(function (v, i) { return num(v, 0, i % 2 ? H : W, 0); });
      if (b[2] - b[0] < 20 || b[3] - b[1] < 20) return;
      var c = { id: o.id, box: b, stand: num(o.stand, 0, W, (b[0] + b[2]) / 2) };
      if (label(o.vi)) c.vi = label(o.vi);
      if (label(o.en)) c.en = label(o.en);
      if (linkOk(o.link)) c.link = o.link;
      c.act = ACT_IDS.indexOf(o.act) >= 0 && (o.act !== 'link' || c.link) ? o.act : 'none';
      out.boxes.push(c);
    });
    out.start = num(d.start, 120, W - 120, 400);
    return out;
  }

  // What a spot can do when tapped (owner picks; none set = its own action).
  var ACTS = [
    { id: 'door',     vi: 'Chọn nhân vật' },
    { id: 'sofa',     vi: 'Góc nghỉ chân (giới thiệu Gem)' },
    { id: 'rail',     vi: 'Đồ 2hand' },
    { id: 'fitting',  vi: 'Thử phụ kiện lên người' },
    { id: 'shop:pegboard', vi: 'Kệ hàng — tab Phụ kiện' },
    { id: 'shop:display',  vi: 'Kệ hàng — tab Túi, sổ & set quà' },
    { id: 'shop:cabinet',  vi: 'Kệ hàng — tab Gối, thảm & quà' },
    { id: 'shop:all',      vi: 'Kệ hàng — tab Tất cả' },
    { id: 'sewing',   vi: 'Bàn thiết kế' },
    { id: 'tu',       vi: 'Tủ sưu tầm' },
    { id: 'counter',  vi: 'Quầy (mở giỏ hàng)' },
    { id: 'memo',     vi: 'Bảng lời nhắn' },
    { id: 'enter',    vi: 'Vào studio' },
    { id: 'link',     vi: 'Mở trang khác' },
    { id: 'none',     vi: 'Không làm gì (chỉ đi tới)' }
  ];
  var ACT_IDS = ACTS.map(function (a) { return a.id; });

  // A hotspot's link: one of our own pages (cau-chuyen.html, san-pham.html#…)
  // or an https:// address. Nothing else (no javascript:, no data:).
  function linkOk(v) {
    if (typeof v !== 'string' || !v || v.length > 300) return false;
    if (/^[a-z0-9-]+\.html([?#][A-Za-z0-9_\-=&%.#]*)?$/.test(v)) return true;
    return /^https:\/\/[A-Za-z0-9.-]+(\/[^\s"'<>]*)?$/.test(v);
  }
  function label(v) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) : '';
  }

  function spotSettings(d) {
    var out = {};
    if (!d || typeof d !== 'object') return out;
    SPOTS.concat(OUT_SPOTS).forEach(function (sp) {
      var o = d[sp.id];
      if (!o || typeof o !== 'object') return;
      var c = {};
      if (o.off === true && sp.id !== 'enter') c.off = true;   // the door in stays: it is the only way in
      if (label(o.vi)) c.vi = label(o.vi);
      if (label(o.en)) c.en = label(o.en);
      if (linkOk(o.link)) c.link = o.link;
      if (ACT_IDS.indexOf(o.act) >= 0 && (o.act !== 'link' || c.link)) c.act = o.act;
      if (Object.keys(c).length) out[sp.id] = c;
    });
    return out;
  }

  /* ---------- what a piece does (kinds) ---------- */
  var KINDS = [
    { id: 'decor',   vi: 'Trang trí' },
    { id: 'product', vi: 'Sản phẩm' },
    { id: 'story',   vi: 'Câu chuyện' },
    { id: 'zone',    vi: 'Khu vực' },
    { id: 'talk',    vi: 'Lời thoại' },
    { id: 'board',   vi: 'Bảng tin' }
  ];
  var KIND_IDS = KINDS.map(function (k) { return k.id; });
  var FEEDS = ['workshop', 'post'];
  var DAY = /^\d{4}-\d{2}-\d{2}$/;

  function behave(o, it) {
    var kind = KIND_IDS.indexOf(it.kind) >= 0 ? it.kind : (o.sku ? 'product' : 'decor');
    if (kind === 'product' && !o.sku) kind = 'decor';
    if (kind !== 'product') o.sku = undefined;
    if (kind !== 'decor') o.kind = kind;
    if (kind === 'zone') {
      var z = it.zone && typeof it.zone === 'object' ? it.zone : {}, c = {};
      if (label(z.vi)) c.vi = label(z.vi);
      if (label(z.en)) c.en = label(z.en);
      if (linkOk(z.link)) c.link = z.link;
      c.act = ACT_IDS.indexOf(z.act) >= 0 && (z.act !== 'link' || c.link) ? z.act : 'none';
      o.zone = c;
    }
    if (kind === 'board') o.board = { feed: it.board && FEEDS.indexOf(it.board.feed) >= 0 ? it.board.feed : 'workshop' };
    var sh = it.show && typeof it.show === 'object' ? it.show : {}, show = {};
    if (DAY.test(sh.from || '')) show.from = sh.from;
    if (DAY.test(sh.to || '')) show.to = sh.to;
    if (show.from || show.to) o.show = show;
  }

  // Is the piece out today? (local date, 'YYYY-MM-DD' compares as text)
  function shownOn(it, day) {
    if (!it.show) return true;
    if (!day) {
      var d = new Date();
      day = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    return !(it.show.from && day < it.show.from) && !(it.show.to && day > it.show.to);
  }

  // A studio_info row, cleaned: text stays text (callers use textContent /
  // esc()), the picture must be ours, the link one of ours or https.
  function text(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max) : '';
  }
  function info(r) {
    if (!r || typeof r !== 'object' || !srcOk(r.src)) return null;
    var lines = Array.isArray(r.lines) ? r.lines : [];
    return {
      src: r.src,
      kind: KIND_IDS.indexOf(r.kind) >= 0 ? r.kind : 'decor',
      title_vi: text(r.title_vi, 120), title_en: text(r.title_en, 120),
      body_vi: text(r.body_vi, 4000), body_en: text(r.body_en, 4000),
      image: srcOk(r.image) ? r.image : '',
      link: linkOk(r.link) ? r.link : '',
      lines: lines.slice(0, 20).map(function (l) {
        return { vi: text(l && l.vi, 200), en: text(l && l.en, 200) };
      }).filter(function (l) { return l.vi || l.en; })
    };
  }

  function sanitize(d) {
    var s = scene(d, SPOTS);
    if (!s) return null;
    var W = s.bg.w, H = s.bg.h;
    var out = blank(s.bg);
    out.items = s.items; out.hot = s.hot; out.start = s.start; out.boxes = s.boxes;
    if (d.udon) {
      out.udon = { x: num(d.udon.x, 0, W, out.udon.x), y: num(d.udon.y, 0, H, out.udon.y),
        w: num(d.udon.w, 30, 600, 128), h: num(d.udon.h, 30, 600, 140) };
    }
    out.outside = scene(d.outside, OUT_SPOTS) || outsideDefault();
    out.spots = spotSettings(d.spots);
    return out;
  }

  return { SPOTS: SPOTS, OUT_SPOTS: OUT_SPOTS, FEET_Y: FEET_Y, srcOk: srcOk, blank: blank, sanitize: sanitize,
    outsideDefault: outsideDefault, EXTEND: EXTEND, linkOk: linkOk, ACTS: ACTS, bgParts: bgParts, partStyle: partStyle,
    KINDS: KINDS, FEEDS: FEEDS, shownOn: shownOn, info: info };
})();
