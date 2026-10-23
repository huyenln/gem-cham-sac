// Gem Chạm Sắc — Bàn thiết kế: dữ liệu + bộ vẽ (v2)
//
// One small library shared by the studio (designer), the basket (thumbnail
// + order note) and the Tủ sưu tầm. A design is a brief for the maker, not
// a cell-by-cell drawing: the customer picks a piece, a piecing layout,
// colour families, prints and fabrics (all "or let Gem choose"), may draw a
// sketch and leave a note. Gem's maker composes the real scraps from that.
//
// A design travels as one short code (in links studio.html?d=…, the basket
// and the order note):
//
//   2~goi~cabin~xanh.nau~caro.hoa~bo.dui~<other>~<sketch>~<note>[~<photo>[~<patches>]]
//   v product layout tones  prints   fabrics  free text, sketch, free text
//
// <patches> (optional, may follow an empty <photo>): the fabric the customer
// put on each patch, one B64 letter per patch = an id in the fabric
// catalogue below (5 colour families x 9 kinds), or from 45 up, one of the
// customer's own colours listed in an optional 12th field <colours>:
// "<kind 0-8><hex rrggbb>" joined by "." (a kind recoloured in the browser).
// Without <patches> the preview picks fabrics from the tones / prints.
//
// Everything but <other>/<note> is checked against the tables below;
// <other> and <note> are percent-encoded, length-capped plain text and must
// only ever reach the page through textContent / esc().
//
// Old v1 codes (goi~bo0.re1…) no longer parse: they were dropped on purpose.

(function () {
  'use strict';

  /* ======================================================================
     PALETTE — muted, on brand
     ====================================================================== */
  var C = {
    sage: '#87965A', kem: '#EFE3CF', kraft: '#B89968', reu: '#4F5E3A',
    hong: '#D9A5A0', gach: '#B5654A', navy: '#2F3E5C', mutat: '#C9A23F',
    den: '#2E2C29', trang: '#FAF7F0', be: '#D8C7A8', nau: '#7A5434',
    dodo: '#7A2E2E', boDam: '#33507A', boNhat: '#86A3C3', hoaDo: '#C2575B',
    reuNhat: '#A9B488', xam: '#9C9584'
  };
  var STITCH = '#8A6A44';

  /* ======================================================================
     TABLES
     ====================================================================== */
  // layouts: which piecing patterns make sense for each piece
  // span: how many cm the 340 drawing box is across in real life (real
  // fabric photos are laid on at that scale)
  // names: a layout's own name on this piece
  // a bag's body takes the piecing; its strap, lining, bottom band… are
  // pieces of their own (ART parts)
  var BAG_LAYOUTS = ['mot', 'hai', 'doc', 'vuong', 'net', 'tuve'];
  var BAG_NAMES = { mot: { vi: 'Thân một vải', en: 'One-fabric body' }, hai: { vi: 'Trên – dưới', en: 'Top and bottom' },
    vuong: { vi: 'Thân ô vuông', en: 'Squares body' } };
  var PRODUCTS = {
    goi:       { sku: 'goi',       vi: 'Gối Chắp Sắc', en: 'Patchwork cushion', shape: 'cushion', grid: 3, span: 40,
                 layouts: ['vuong', 'cabin', 'sao', 'chong', 'net', 'tuve'] },
    lotcoc:    { sku: 'lotcoc',    vi: 'Lót cốc',      en: 'Coaster',           shape: 'coaster', grid: 2, span: 11,
                 layouts: ['vuong', 'cabin', 'chong', 'net', 'tuve'] },
    // the square coaster: same product (sku), another shape — not a tab of
    // its own, the designer offers "Tròn / Vuông" on the coaster
    lotcocv:   { sku: 'lotcoc',    vi: 'Lót cốc vuông', en: 'Square coaster',   shape: 'coasterSq', grid: 2, span: 11,
                 layouts: ['vuong', 'cabin', 'chong', 'net', 'tuve'] },
    scrunchie: { sku: 'scrunchie', vi: 'Dây buộc tóc', en: 'Scrunchie',         shape: 'scrunchie', grid: 1, span: 13,
                 layouts: ['mot', 'hai', 'net', 'tuve'] },
    // the pouch: its base (the hexagon, and the back) and six folded petals,
    // each a piece of its own sewn on (Anna 22/10) — so no free cutting
    // across them ("Ghép theo nét vẽ" is not offered)
    origami:   { sku: 'origami',   vi: 'Túi Origami',  en: 'Origami pouch',     shape: 'origami', grid: 1, span: 11,
                 layouts: ['mot', 'canh', 'xen', 'moi', 'tuve'], def: 'canh',
                 names: { mot: { vi: 'Một vải', en: 'One fabric' }, canh: { vi: 'Cánh khác nền', en: 'Petals apart from the base' },
                          xen: { vi: 'Cánh xen kẽ', en: 'Alternating petals' }, moi: { vi: 'Mỗi cánh một vải', en: 'Each petal its own' } } },
    // the body takes the piecing; the collar and the strap are pieces of
    // their own, one fabric each
    oxford:    { sku: 'oxford',    vi: 'Túi áo Oxford', en: 'Oxford shirt bag', shape: 'shirt', grid: 2, span: 22,
                 layouts: ['mot', 'hai', 'vuong', 'net', 'tuve'],
                 names: { mot: { vi: 'Thân một tấm', en: 'One-piece body' }, hai: { vi: 'Thân ghép hai', en: 'Two-piece body' },
                          vuong: { vi: 'Thân ô vuông', en: 'Squares body' } } },
    // a cord of its own fabric, and 1, 2 or 3 flowers, one fabric each
    bloom:     { sku: 'bloom',     vi: 'Bloom Charm',  en: 'Bloom charm',       shape: 'bloom', grid: 1, span: 9,
                 layouts: ['hoa1', 'hoa2', 'hoa3', 'tuve'], def: 'hoa3' },
    // two loose pieces: the square back and the triangle flap
    bookmark:  { sku: 'bookmark',  vi: 'Bookmark',     en: 'Bookmark',          shape: 'bookmark', grid: 3, span: 6.2,
                 layouts: ['mot', 'hai', 'tuve'],
                 names: { mot: { vi: 'Hai mảnh một vải', en: 'Both pieces alike' }, hai: { vi: 'Vuông + tam giác khác vải', en: 'Square and flap differ' } } },
    // one strap, the side that shows: one fabric, or two pieced across it
    // (top / bottom half) or along it (left / right half) (Anna 22/10); a
    // machine stitch can run down its middle (opts e: Gem's Janome)
    daydeo:    { sku: 'daydeo',    vi: 'Dây đeo cổ tay', en: 'Wrist strap',     shape: 'strap', grid: 1, span: 30,
                 layouts: ['mot', 'ngang', 'doc', 'tuve'], opts: 'e',
                 names: { mot: { vi: 'Một vải', en: 'One fabric' }, ngang: { vi: 'Ghép ngang', en: 'Pieced across' },
                          doc: { vi: 'Ghép dọc', en: 'Pieced lengthwise' } } },
    // Bags: one tab "Túi", the shape picked on it (from Gem's own bags, and
    // two shapes many makers sew); the laptop sleeve is a tab of its own,
    // with or without a shoulder strap. A designed bag is ordered as the
    // ready-made bag of its kind (sku). opts: what can be added — q quilting
    // (chần bông), p inside pockets (one is free), z zip, n snap, e a stitch
    // down the handle (Anna 23/10, not drawn); zip: sewn in already, free
    // (tools/bag-assets.py draws them)
    tuitote:      { sku: 'tui-di-cho',  group: 'tui', vi: 'Túi tote', en: 'Tote bag', shape: 'tuitote', grid: 3, span: 69,
                    short: { vi: 'Tote', en: 'Tote' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'doc', opts: 'qpzne' },
    tuino:        { sku: 'tui-di-choi', group: 'tui', vi: 'Túi quai nơ', en: 'Bow bag', shape: 'tuino', grid: 3, span: 63,
                    short: { vi: 'Quai nơ', en: 'Bow' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'mot', opts: 'qpzne' },
    tuikhoa:      { sku: 'tui-di-choi', group: 'tui', vi: 'Túi khoá kéo đeo vai', en: 'Zipped shoulder bag', shape: 'tuikhoa', grid: 3, span: 51,
                    short: { vi: 'Khoá kéo', en: 'Zipped' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'mot', opts: 'qpne', zip: 1 },
    // off: taken off the table (Anna 20/10: only the bags redrawn in pencil
    // stay); kept so a design already made with one still opens, draws and
    // is priced (a shared link, the collection, an order)
    tuitamgiac:   { sku: 'tui-di-choi', group: 'tui', vi: 'Túi tam giác', en: 'Triangle bag', shape: 'tuitamgiac', grid: 3, span: 61,
                    short: { vi: 'Tam giác', en: 'Triangle' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'mot', opts: 'qpzne', off: 1 },
    // the tie shoulder bag (a pattern Anna liked): two points tied on the
    // shoulder, four ways (ties): plain straps are in the price, styled
    // ones cost more
    tuibuoc:      { sku: 'tui-di-choi', group: 'tui', vi: 'Túi buộc vai', en: 'Tie shoulder bag', shape: 'tuibuoc', grid: 3, span: 53,
                    short: { vi: 'Buộc vai', en: 'Tie' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'mot', opts: 'qpnt',
                    ties: ['thuong', 'no', 'xoan', 'ren'], off: 1 },
    laptop:       { sku: 'tui-laptop',  group: 'laptop', vi: 'Túi laptop', en: 'Laptop sleeve', shape: 'laptop', grid: 3, span: 33,
                    short: { vi: 'Không quai', en: 'No strap' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'doc', opts: 'qpn', zip: 1 },
    laptopq:      { sku: 'tui-laptop',  group: 'laptop', vi: 'Túi laptop có quai', en: 'Laptop sleeve with strap', shape: 'laptopq', grid: 3, span: 42,
                    short: { vi: 'Có quai đeo', en: 'With strap' }, layouts: BAG_LAYOUTS, names: BAG_NAMES, def: 'doc', opts: 'qpne', zip: 1 }
  };
  // pieces shown under one tab, a shape picked on it (the first is the tab)
  var GROUPS = {
    lotcoc: ['lotcoc', 'lotcocv'],
    tui: ['tuitote', 'tuino', 'tuikhoa', 'tuitamgiac', 'tuibuoc'],
    laptop: ['laptop', 'laptopq']
  };
  var GROUP_NAMES = { tui: { vi: 'Túi', en: 'Bags' }, laptop: { vi: 'Túi laptop', en: 'Laptop sleeve' } };
  PRODUCTS.lotcoc.group = PRODUCTS.lotcocv.group = 'lotcoc';
  PRODUCTS.lotcoc.short = { vi: 'Tròn', en: 'Round' };
  PRODUCTS.lotcocv.short = { vi: 'Vuông', en: 'Square' };
  // the shapes offered under a tab: not the ones taken off, unless it is the
  // piece already being designed (an old design opened again)
  function groupOf(product) {
    var p = PRODUCTS[product];
    return p && p.group ? GROUPS[p.group].filter(function (x) { return !PRODUCTS[x].off || x === product; }) : [product];
  }
  function tabOf(product) { return groupOf(product)[0]; }
  function tabName(product, l) {
    var p = PRODUCTS[product];
    return (p && GROUP_NAMES[p.group] || p)[l];
  }
  function layoutName(product, id, l) {
    var p = PRODUCTS[product], n = p && p.names && p.names[id];
    return (n || LAYOUTS[id])[l];
  }
  // old codes made with layouts these pieces no longer have
  // (the strap's "hai" showed it twice, outside and inside: its two fabrics
  // now piece the one side, across)
  // (the origami's "hai" was every other sector of the hexagon: its two
  // fabrics become the base and the petals; its cut lines, one fabric)
  var LEGACY = { bloom: { mot: 'hoa3', hai: 'hoa3', net: 'hoa3' }, bookmark: { vuong: 'hai', net: 'mot' }, daydeo: { net: 'mot', hai: 'ngang' },
    origami: { hai: 'canh', net: 'mot' } };
  var PRODUCT_ORDER = ['goi', 'lotcoc', 'scrunchie', 'origami', 'oxford', 'bloom', 'bookmark', 'daydeo', 'tuitote', 'laptop'];

  // Stand-ins until Mai's mother's real piecing samples arrive.
  var LAYOUTS = {
    vuong: { vi: 'Ô vuông', en: 'Squares' },
    cabin: { vi: 'Nhà gỗ', en: 'Log cabin' },
    sao:   { vi: 'Ngôi sao', en: 'Star' },
    chong: { vi: 'Chong chóng', en: 'Pinwheel' },
    mot:   { vi: 'Một tấm vải', en: 'One fabric' },
    hai:   { vi: 'Ghép hai vải', en: 'Two fabrics' },
    net:   { vi: 'Ghép theo nét vẽ', en: 'Pieced along my lines' },
    hoa1:  { vi: '1 bông', en: '1 flower' },
    hoa2:  { vi: '2 bông', en: '2 flowers' },
    hoa3:  { vi: '3 bông', en: '3 flowers' },
    doc:   { vi: 'Sọc dọc', en: 'Upright strips' },
    ngang: { vi: 'Ghép ngang', en: 'Pieced across' },
    tuve:  { vi: 'Theo hình mình vẽ', en: 'From my drawing' }
  };

  var TONES = {
    xanh:  { vi: 'Xanh lá',    en: 'Green',       c: [C.sage, C.reu, C.reuNhat] },
    lam:   { vi: 'Xanh lam',   en: 'Blue',        c: [C.boDam, C.boNhat, C.navy] },
    hong:  { vi: 'Hồng – đỏ',  en: 'Pink – red',  c: [C.hong, C.gach, C.hoaDo] },
    nau:   { vi: 'Nâu đất',    en: 'Earthy',      c: [C.kraft, C.nau, C.mutat] },
    trung: { vi: 'Trung tính', en: 'Neutral',     c: [C.kem, C.be, C.xam] }
  };
  var TONE_ORDER = ['xanh', 'lam', 'hong', 'nau', 'trung'];
  var MAX_TONES = 2;

  var PRINTS = {
    tron: { vi: 'Trơn',     en: 'Plain' },
    caro: { vi: 'Kẻ caro',  en: 'Gingham' },
    soc:  { vi: 'Kẻ sọc',   en: 'Stripes' },
    cham: { vi: 'Chấm bi',  en: 'Polka dot' },
    hoa:  { vi: 'Hoa nhí',  en: 'Ditsy floral' },
    ren:  { vi: 'Ren',      en: 'Lace' }
  };
  var PRINT_ORDER = ['tron', 'caro', 'soc', 'cham', 'hoa', 'ren'];

  var FABRICS = {
    cotton: { vi: 'Cotton',       en: 'Cotton' },
    dui:    { vi: 'Đũi / linen',  en: 'Linen' },
    bo:     { vi: 'Vải bò',       en: 'Denim' },
    nhung:  { vi: 'Nhung tăm',    en: 'Corduroy' },
    kate:   { vi: 'Kate sơ mi',   en: 'Shirting' },
    ren:    { vi: 'Ren',          en: 'Lace' },
    kaki:   { vi: 'Kaki / canvas', en: 'Canvas' },
    lua:    { vi: 'Lụa / satin',  en: 'Silk / satin' },
    ni:     { vi: 'Nỉ / dạ',      en: 'Felt / wool' }
  };
  var FABRIC_ORDER = ['cotton', 'dui', 'bo', 'kaki', 'kate', 'nhung', 'lua', 'ni', 'ren'];

  /* ---------- sizes ----------
     The usual size first (the price is for it), then bigger ones at a
     price added. Any piece also takes the customer's own W x H in cm: Gem
     looks and names the price (the order says "báo giá"). w, h in cm. */
  var SIZES = {
    goi:          [{ w: 40, h: 40 }, { w: 45, h: 45 }, { w: 50, h: 50 }],
    lotcoc:       [{ w: 10, h: 10, vi: 'Ø 10 cm', en: '10 cm across' }],
    lotcocv:      [{ w: 10, h: 10 }],
    scrunchie:    [{ w: 12, h: 12, vi: 'Ø 12 cm', en: '12 cm across' }],
    origami:      [{ w: 10, h: 10, vi: 'Rộng ~10 cm', en: 'About 10 cm across' }],
    oxford:       [{ w: 16, h: 12 }],
    bloom:        [{ w: 4, h: 4, vi: 'Mỗi bông ~4 cm', en: 'Flowers about 4 cm' }],
    bookmark:     [{ w: 6, h: 6 }],
    daydeo:       [{ w: 30, h: 2, vi: 'Dài 30 cm', en: '30 cm long' }],
    tuitote:      [{ w: 35, h: 40 }, { w: 40, h: 45 }],
    // Túi quai nơ: Gem's two sizes (cm only roughly, for the fabric's scale)
    tuino:        [{ w: 30, h: 38, vi: 'Nhỏ', en: 'Small' }, { w: 36, h: 44, vi: 'Vừa', en: 'Medium' }],
    tuikhoa:      [{ w: 28, h: 20 }],
    tuitamgiac:   [{ w: 38, h: 40 }],
    tuibuoc:      [{ w: 30, h: 34 }],
    laptop:       [{ w: 33, h: 24, vi: '13 inch · 33 × 24 cm', en: '13 inch · 33 × 24 cm' },
                   { w: 35, h: 25, vi: '14 inch · 35 × 25 cm', en: '14 inch · 35 × 25 cm' },
                   { w: 39, h: 28, vi: '15,6 inch · 39 × 28 cm', en: '15.6 inch · 39 × 28 cm' }]
  };
  SIZES.laptopq = SIZES.laptop;
  var MAX_POCKETS = 5, CUSTOM_CM = [3, 200];
  // how a tie bag is tied on the shoulder (PRODUCTS[x].ties)
  // why: what a price range (PRICING ties [from, to]) depends on
  var TIES = { thuong: { vi: 'Dây thẳng', en: 'Plain straps' },
    no: { vi: 'Thắt nơ', en: 'Bow', why: { vi: 'tuỳ cỡ nơ', en: 'by the size of the bow' } },
    xoan: { vi: 'Dây xoắn (nhún bèo)', en: 'Ruffled strap' }, ren: { vi: 'Dây viền ren', en: 'Lace-edged straps' } };
  function tieWhy(k, l) { var w = TIES[k] && TIES[k].why; return w ? w[l] : (l === 'vi' ? 'tuỳ cỡ' : 'by size'); }
  function tieOf(d) { var p = PRODUCTS[d.product]; return p.ties ? p.ties[(d.ext && d.ext.t) || 0] || p.ties[0] : null; }
  function sizesOf(product) { return SIZES[product] || [{ w: 0, h: 0 }]; }
  function sizeLabel(product, i, l) {
    var z = sizesOf(product)[i] || sizesOf(product)[0];
    return z[l] || z.w + ' × ' + z.h + ' cm';
  }

  /* ---------- extras: size + bag options (field 13 of the code) ----------
     "s<i>" a bigger usual size, "c<W>x<H>" the customer's own size in cm,
     "q" quilted (chần bông), "p<n>" n more inside pockets (one is free),
     "z" a zip, "n" a snap, "e<stitch><thread>" a machine stitch down the
     middle of the strap or the bag's handle (STITCHES 1-9, THREADS 0-).
     Only what the piece offers (PRODUCTS[x].opts). */
  function blankExt() { return { s: 0, c: null, q: false, p: 0, z: false, n: false, t: 0, e: 0, ec: 0 }; }
  // the decorative stitches on the pattern dial of Gem's Janome (Anna's
  // photos, 23/10; one digit in the code, so nine at most), their icons by
  // stitchIcon(); thread colours to sew them in. Only picked, not drawn on
  // the piece: a flat line looked wrong on the shaded strap (Anna 23/10)
  var STITCHES = [
    { id: 'zic',   vi: 'Zíc zắc',    en: 'Zigzag' },
    { id: 'long',  vi: 'Lông vũ',    en: 'Feather' },
    { id: 'song',  vi: 'Sóng',       en: 'Wave' },
    { id: 'la',    vi: 'Dây lá',     en: 'Vine' },
    { id: 'thoi',  vi: 'Hình thoi',  en: 'Diamonds' },
    { id: 'x',     vi: 'Chữ X',      en: 'Cross' },
    { id: 'vo',    vi: 'Vỏ sò',      en: 'Scallop' },
    { id: 'rang',  vi: 'Răng cưa',   en: 'Triangles' },
    { id: 'thanh', vi: 'Tường thành', en: 'Battlement' }
  ];
  // a strap, or the handle of a bag
  function embName(product, l) {
    var bag = (ART[PRODUCTS[product].shape] || {}).bag;
    return bag ? (l === 'vi' ? 'Thêu chỉ giữa quai' : 'Stitch down the handle') : (l === 'vi' ? 'Thêu chỉ giữa dây' : 'Stitch down the middle');
  }
  var THREADS = [
    { vi: 'Kem', en: 'Cream', c: '#F3E9D6' }, { vi: 'Trắng', en: 'White', c: '#FFFFFF' },
    { vi: 'Đỏ gạch', en: 'Brick red', c: '#B5523B' }, { vi: 'Vàng mù tạt', en: 'Mustard', c: '#D4A02A' },
    { vi: 'Xanh rêu', en: 'Moss green', c: '#5E6B3A' }, { vi: 'Xanh than', en: 'Navy', c: '#2E3A5C' },
    { vi: 'Đen', en: 'Black', c: '#2B2B2B' }
  ];
  function parseExt(str, product) {
    var e = blankExt(), p = PRODUCTS[product], seen = {};
    if (!str) return e;
    var toks = str.split('.');
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], m = /^(?:s([1-9])|c(\d{1,3})x(\d{1,3})|(q)|p([1-5])|(z)|(n)|t([1-9])|e([1-9])([0-9]))$/.exec(t);
      if (!m) return null;
      var k = t[0];
      if (seen[k] || (k === 's' && seen.c) || (k === 'c' && seen.s)) return null;
      seen[k] = 1;
      if (k === 's') { if (+m[1] >= sizesOf(product).length) return null; e.s = +m[1]; }
      else if (k === 'c') {
        var w = +m[2], h = +m[3];
        if (w < CUSTOM_CM[0] || h < CUSTOM_CM[0] || w > CUSTOM_CM[1] || h > CUSTOM_CM[1]) return null;
        e.c = [w, h];
      } else {
        if ((p.opts || '').indexOf(k) < 0) return null;
        if (k === 't' && +m[8] >= (p.ties || []).length) return null;
        if (k === 'e' && (+m[9] > STITCHES.length || +m[10] >= THREADS.length)) return null;
        if (k === 'p') e.p = +m[5]; else if (k === 't') e.t = +m[8];
        else if (k === 'e') { e.e = +m[9]; e.ec = +m[10]; } else e[k] = true;
      }
    }
    return e;
  }
  function encodeExt(d) {
    var e = d.ext || blankExt(), out = [];
    if (e.c) out.push('c' + e.c[0] + 'x' + e.c[1]);
    else if (e.s) out.push('s' + e.s);
    if (e.q) out.push('q');
    if (e.p) out.push('p' + e.p);
    if (e.z) out.push('z');
    if (e.n) out.push('n');
    if (e.t) out.push('t' + e.t);
    if (e.e) out.push('e' + e.e + e.ec);
    return out.join('.');
  }
  // after the piece changed (another shape of the same tab): keep what the
  // new one offers
  function fitExt(d) {
    var e = d.ext || blankExt(), o = PRODUCTS[d.product].opts || '';
    if (e.s >= sizesOf(d.product).length) e.s = 0;
    if (o.indexOf('q') < 0) e.q = false;
    if (o.indexOf('p') < 0) e.p = 0;
    if (o.indexOf('z') < 0) e.z = false;
    if (o.indexOf('n') < 0) e.n = false;
    if (o.indexOf('t') < 0 || e.t >= (PRODUCTS[d.product].ties || []).length) e.t = 0;
    if (o.indexOf('e') < 0) { e.e = 0; e.ec = 0; }
    d.ext = e;
    return d;
  }
  // how much bigger than the usual size (real fabric photos keep their scale)
  function sizeScale(d) {
    var z = sizesOf(d.product), e = d.ext || blankExt();
    if (!z[0].w) return 1;
    var w = e.c ? e.c[0] : (z[e.s] || z[0]).w;
    return Math.max(0.3, Math.min(4, w / z[0].w));
  }

  /* ---------- price of a design ----------
     base (the usual size) + the layout's work + each fabric after the
     first + a bigger size + options. Amounts in đồng, from the settings
     row "design_pricing" (owner edits in admin.html → Sản phẩm → Giá thiết
     kế); these are the starting values. The database works the same sum
     when the order comes in (design_price(), last in
     supabase/migrations/20261022b_day_deo_theu.sql): keep the two alike.
     Gem picks the fabrics: counted as PRICING.gem[layout] fabrics. */
  var BAG_FEES = { hai: 10000, doc: 20000, vuong: 30000, net: 40000, tuve: 30000 };
  var PRICING = {
    fabric: 5000,
    gem: { mot: 1, hai: 2, doc: 2, ngang: 2, canh: 2, xen: 3, moi: 7, vuong: 3, cabin: 3, sao: 3, chong: 2, net: 3, tuve: 1, hoa1: 2, hoa2: 3, hoa3: 3 },
    products: {
      goi:          { base: 150000, fabric: 10000, layouts: { cabin: 30000, sao: 50000, chong: 30000, net: 40000, tuve: 30000 }, sizes: [0, 20000, 40000] },
      lotcoc:       { base: 30000, layouts: { vuong: 5000, cabin: 10000, chong: 10000, net: 10000, tuve: 5000 } },
      lotcocv:      { base: 30000, layouts: { vuong: 5000, cabin: 10000, chong: 10000, net: 10000, tuve: 5000 } },
      scrunchie:    { base: 20000, layouts: { net: 5000, tuve: 5000 } },
      origami:      { base: 70000, layouts: { canh: 5000, xen: 10000, moi: 15000, tuve: 10000 } },
      oxford:       { base: 130000, fabric: 10000, layouts: { hai: 10000, vuong: 20000, net: 30000, tuve: 20000 } },
      bloom:        { base: 25000, layouts: { hoa2: 10000, hoa3: 20000, tuve: 10000 } },
      bookmark:     { base: 22000, layouts: { tuve: 5000 } },
      // embroider: the stitch down the strap / the handle (the owner sets it)
      daydeo:       { base: 35000, layouts: { tuve: 5000 }, embroider: 10000 },
      tuitote:      { base: 160000, fabric: 10000, layouts: BAG_FEES, sizes: [0, 20000], quilt: 70000, pocket: 20000, zip: 30000, snap: 10000, embroider: 10000 },
      tuino:        { base: 220000, fabric: 10000, layouts: BAG_FEES, sizes: [0, 30000], quilt: 60000, pocket: 20000, zip: 30000, snap: 10000, embroider: 10000 },
      tuikhoa:      { base: 200000, fabric: 10000, layouts: BAG_FEES, quilt: 50000, pocket: 20000, snap: 10000, embroider: 10000 },
      tuitamgiac:   { base: 100000, fabric: 10000, layouts: BAG_FEES, quilt: 60000, pocket: 20000, zip: 30000, snap: 10000, embroider: 10000 },
      // ties: an amount, or [from, to] when Gem fixes it with the customer
      // (the bow: 10–40k by its size)
      tuibuoc:      { base: 180000, fabric: 10000, layouts: BAG_FEES, quilt: 60000, pocket: 20000, snap: 10000, ties: [0, [10000, 40000], 30000, 20000] },
      laptop:       { base: 260000, fabric: 10000, layouts: BAG_FEES, sizes: [0, 10000, 20000], quilt: 50000, pocket: 20000, snap: 10000 },
      laptopq:      { base: 290000, fabric: 10000, layouts: BAG_FEES, sizes: [0, 10000, 20000], quilt: 50000, pocket: 20000, snap: 10000, embroider: 10000 }
    }
  };
  // the owner's numbers (settings "design_pricing"): only whole, sane
  // amounts are taken, the rest keeps the starting values
  function amount(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 10000000 ? Math.round(v) : null; }
  // an amount or a range [from, to] (to above from; equal ends = an amount)
  function amountOrRange(v) {
    if (!Array.isArray(v)) return amount(v);
    var a = v.length === 2 ? amount(v[0]) : null, b = v.length === 2 ? amount(v[1]) : null;
    return a == null || b == null || b < a ? null : a === b ? a : [a, b];
  }
  function fee(v) { return Array.isArray(v) ? v : [v || 0, v || 0]; }
  function setPricing(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (amount(obj.fabric) != null) PRICING.fabric = amount(obj.fabric);
    if (obj.gem && typeof obj.gem === 'object') Object.keys(PRICING.gem).forEach(function (k) {
      var v = obj.gem[k];
      if (typeof v === 'number' && v >= 1 && v <= 20) PRICING.gem[k] = Math.round(v);
    });
    var ps = obj.products || {};
    Object.keys(PRICING.products).forEach(function (id) {
      var src = ps[id], dst = PRICING.products[id];
      if (!src || typeof src !== 'object') return;
      ['base', 'fabric', 'quilt', 'pocket', 'zip', 'snap', 'embroider'].forEach(function (k) {
        if (k in src && amount(src[k]) != null && (k in dst || k === 'fabric')) dst[k] = amount(src[k]);
      });
      if (src.layouts && typeof src.layouts === 'object') {
        var lay = {};
        PRODUCTS[id].layouts.forEach(function (l) {
          var v = amount(src.layouts[l]);
          if (v != null) lay[l] = v; else if (dst.layouts && dst.layouts[l]) lay[l] = dst.layouts[l];
        });
        dst.layouts = lay;
      }
      ['sizes', 'ties'].forEach(function (k) {
        var ok = k === 'ties' ? amountOrRange : amount;
        if (Array.isArray(src[k]) && dst[k]) dst[k] = dst[k].map(function (v, i) { var a = ok(src[k][i]); return a != null ? a : v; });
      });
    });
  }
  var pricingP = null;
  function loadPricing() {
    if (pricingP) return pricingP;
    if (!window.GemDB || !window.GemDB.designPricing) return Promise.resolve(false);
    pricingP = window.GemDB.designPricing().then(function (v) {
      if (v) { setPricing(v); document.dispatchEvent(new CustomEvent('gem:pricing')); }
      return !!v;
    }, function () { return false; });
    return pricingP;
  }
  function fabricCount(d) {
    if (!d.fab) return PRICING.gem[d.layout] || 2;
    var seen = {}, n = 0;
    for (var i = 0; i < d.fab.length; i++) if (!seen[d.fab[i]]) { seen[d.fab[i]] = 1; n++; }
    return n;
  }
  // { total, max, base, lines: [{ k, a, b, n }], quote } — quote: the
  // customer's own size, the total is a starting point and Gem names the
  // price. max above total: a part priced as a range (a: from, b: to — the
  // bow, by its size); Gem fixes it with the customer
  function price(spec) {
    var d = typeof spec === 'string' ? parse(spec) : spec;
    if (!d) return null;
    var pr = PRICING.products[d.product];
    if (!pr) return null;
    var e = d.ext || blankExt(), lines = [], total = pr.base, max = pr.base;
    var add = function (k, a, n, b) {
      if (b == null) b = a;
      if (a || b) { lines.push({ k: k, a: a, b: b, n: n || 0 }); total += a; max += b; }
    };
    add('layout', (pr.layouts || {})[d.layout] || 0);
    var nf = fabricCount(d);
    add('fabric', Math.max(0, nf - 1) * (pr.fabric != null ? pr.fabric : PRICING.fabric), nf - 1);
    if (e.s) add('size', (pr.sizes || [])[e.s] || 0);
    if (e.q) add('quilt', pr.quilt || 0);
    if (e.p) add('pocket', e.p * (pr.pocket || 0), e.p);
    if (e.z) add('zip', pr.zip || 0);
    if (e.n) add('snap', pr.snap || 0);
    if (e.t) { var f = fee((pr.ties || [])[e.t]); add('tie', f[0], tieOf(d), f[1]); }
    if (e.e) add('embroider', pr.embroider || 0, d.product);
    return { base: pr.base, total: total, max: max, lines: lines, quote: !!e.c };
  }
  var PRICE_NAMES = {
    layout: { vi: 'Kiểu ghép', en: 'Piecing' }, fabric: { vi: 'Thêm {n} vải', en: '{n} more fabrics' },
    size: { vi: 'Cỡ lớn hơn', en: 'Bigger size' }, quilt: { vi: 'Chần bông', en: 'Quilted' },
    pocket: { vi: 'Thêm {n} túi trong', en: '{n} more inside pockets' }, zip: { vi: 'Khoá kéo', en: 'Zip' },
    snap: { vi: 'Nút bấm', en: 'Snap' }
  };
  function priceLine(x, l) {
    // a tie: its own name, and what a range depends on
    if (x.k === 'tie') return TIES[x.n][l] + (x.b > x.a ? ' (' + tieWhy(x.n, l) + ')' : '');
    if (x.k === 'embroider') return embName(x.n, l);
    return PRICE_NAMES[x.k][l].replace('{n}', x.n);
  }
  // "10.000–40.000đ", or one amount
  function priceRange(a, b) {
    return (b > a ? a.toLocaleString('vi-VN') + '–' : '') + (b > a ? b : a).toLocaleString('vi-VN') + 'đ';
  }

  /* ---------- the fabric catalogue ----------
     45 fabrics = 5 colour families x 9 kinds, id = tone * 9 + kind. They
     match the painted swatch sheets planned for images/studio/vai/
     (vai-<tone>-<1..9>.webp); until those exist each is drawn below. */
  var KINDS = ['tron', 'caro', 'soc', 'cham', 'hoa', 'ren', 'hoato', 'ono', 'tho'];
  var KIND_NAMES = {
    tron: { vi: 'Trơn', en: 'Plain' }, caro: { vi: 'Caro', en: 'Gingham' }, soc: { vi: 'Sọc', en: 'Stripes' },
    cham: { vi: 'Chấm bi', en: 'Polka dot' }, hoa: { vi: 'Hoa nhí', en: 'Ditsy floral' }, ren: { vi: 'Ren', en: 'Lace' },
    hoato: { vi: 'Hoa to', en: 'Big floral' }, ono: { vi: 'Ô nhỏ', en: 'Small check' }, tho: { vi: 'Thổ cẩm', en: 'Folk print' }
  };
  var N_FABRICS = 45;
  var MAX_CUSTOM = 64 - N_FABRICS;   // own colours per design (B64 letters left)
  function fabric(id) {
    var tone = TONE_ORDER[Math.floor(id / 9)], k = id % 9;
    return { id: id, tone: tone, kind: KINDS[k], color: TONES[tone].c[k % 3] };
  }
  function fabricId(tone, kind) { return TONE_ORDER.indexOf(tone) * 9 + KINDS.indexOf(kind); }

  /* ---------- moods: a ready palette + a layout, one tap ----------
     Names are drafts for Anna to rename. */
  var MOODS = [
    { id: 'hanoi', vi: 'Hà Nội mùa thu', en: 'Hanoi in autumn', layout: 'vuong',
      f: [['nau', 'tron'], ['nau', 'caro'], ['nau', 'hoa'], ['trung', 'ren'], ['trung', 'tron'], ['xanh', 'ono'], ['nau', 'hoato'], ['trung', 'hoa']] },
    { id: 'nhaba', vi: 'Vintage nhà bà', en: "Grandma's house", layout: 'cabin',
      f: [['hong', 'hoa'], ['trung', 'ren'], ['hong', 'hoato'], ['nau', 'caro'], ['trung', 'tron'], ['hong', 'ono'], ['xanh', 'hoa'], ['trung', 'cham']] },
    { id: 'bien', vi: 'Biển chiều', en: 'Seaside evening', layout: 'chong',
      f: [['lam', 'soc'], ['lam', 'tron'], ['trung', 'tron'], ['hong', 'tron'], ['lam', 'cham'], ['lam', 'ono'], ['trung', 'soc'], ['hong', 'hoa']] },
    { id: 'dong', vi: 'Đồng xanh', en: 'Green fields', layout: 'vuong',
      f: [['xanh', 'tron'], ['xanh', 'caro'], ['xanh', 'hoa'], ['nau', 'tron'], ['trung', 'tho'], ['xanh', 'soc'], ['nau', 'ono'], ['xanh', 'hoato']] },
    { id: 'tet', vi: 'Tết sum vầy', en: 'Lunar New Year', layout: 'sao',
      f: [['hong', 'caro'], ['hong', 'tho'], ['hong', 'hoato'], ['nau', 'tho'], ['trung', 'hoa'], ['hong', 'soc'], ['nau', 'tron'], ['hong', 'cham']] }
  ];
  MOODS.forEach(function (m) { m.ids = m.f.map(function (x) { return fabricId(x[0], x[1]); }); });

  /* ---------- real fabrics (Kho vải) ----------
     The fabrics Gem actually has: table fabrics, edited in admin.html →
     Kho vải. A key "r<id>" names one; on a design it takes a letter after
     the painted 45, like an own colour (d.cus holds {r: id}). Until the list
     arrives (or if it never does) the painted catalogue stays in use, and a
     real fabric not known yet is drawn as a plain of its colour family.
     Names come from staff: callers put them through textContent / esc(). */
  var REAL = {}, REAL_ON = [], REAL_MIN = 8;
  var SWATCH_CM = 13;   // a 320px swatch is about this many cm of cloth
  var REAL_IMG = /^(images\/[a-z0-9\/_.-]+|https:\/\/dxdovvqsfjeizsoprrfn\.supabase\.co\/storage\/v1\/object\/public\/gem-media\/[A-Za-z0-9%._-]+)$/;
  // how alike two kinds are, when the exact one is missing
  var KIND_GROUP = { tron: 0, ren: 0, caro: 1, soc: 1, ono: 1, cham: 2, hoa: 2, hoato: 3, tho: 3 };
  // rows that were a second photo of the same cloth (removed 14/10/2026,
  // 20261014d_kho_vai_gop.sql): an old design's r<id> shows the kept one
  var MERGED = { 3: 2, 16: 15, 14: 12, 57: 59, 53: 41 };

  function setReal(rows) {
    REAL = {}; REAL_ON = [];
    (rows || []).forEach(function (r) {
      if (!r || typeof r.id !== 'number' || !TONES[r.tone]) return;
      var f = { id: r.id, key: 'r' + r.id, vi: String(r.name_vi || ''), en: String(r.name_en || r.name_vi || ''),
        tone: r.tone, kind: KINDS.indexOf(r.kind) >= 0 ? r.kind : 'tron', mat: String(r.material || ''),
        src: REAL_IMG.test(r.img || '') ? r.img : null, out: r.in_stock === false, hidden: r.is_visible === false,
        sort: r.sort_order || 0,
        // the bigger photo of the same cloth (each patch shows its own part
        // of it) and how many swatch-widths it spans
        photo: REAL_IMG.test(r.photo || '') ? r.photo : null, k: Math.min(4, Math.max(1, +r.photo_k || 1)) };
      REAL[f.id] = f;
      if (!f.out && !f.hidden && f.src) REAL_ON.push(f);
    });
    Object.keys(MERGED).forEach(function (id) { if (!REAL[id] && REAL[MERGED[id]]) REAL[id] = REAL[MERGED[id]]; });
    REAL_ON.sort(function (a, b) {
      return TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone) || a.sort - b.sort || a.id - b.id;
    });
    MOODS.forEach(function (m) {
      m.real = [];
      m.f.forEach(function (x) { var k = nearReal(x[0], x[1], m.real); if (k) m.real.push(k); });
    });
  }
  // enough real fabrics in stock to fill the basket: the design table uses them
  function hasReal() { return REAL_ON.length >= REAL_MIN; }

  // The real fabric closest to a painted one: same colour family and kind,
  // else the family with a kind of the same weight, else the family.
  function nearReal(tone, kind, skip) {
    var best = null, bs = -1;
    REAL_ON.forEach(function (f) {
      if (skip && skip.indexOf(f.key) >= 0) return;
      var s = (f.tone === tone ? 4 : 0) + (f.kind === kind ? 2 : KIND_GROUP[f.kind] === KIND_GROUP[kind] ? 1 : 0);
      if (s > bs) { bs = s; best = f; }
    });
    return best ? best.key : null;
  }
  function moodKeys(m) { return hasReal() && m.real && m.real.length ? m.real : m.ids; }
  function isReal(key) { return typeof key === 'string' && /^r[1-9]\d{0,5}$/.test(key); }
  function realOf(key) { return isReal(key) ? REAL[+key.slice(1)] || null : null; }

  // The big photos (lon/, 640–960px) are fetched ahead: those of the
  // fabrics in the basket, and a scrap's own the moment it is picked up, so
  // a dropped fabric shows at once (Anna: "thả vải vào ghép cũng phải mất 1s
  // mới lên màu"). Until one is in, the patch wears the swatch (svg()).
  var PHOTO_IN = {};   // url -> 1 coming, 2 here, 3 failed
  function warmPhoto(url) {
    if (!url || PHOTO_IN[url]) return;
    PHOTO_IN[url] = 1;
    var im = new Image();
    im.onload = function () { PHOTO_IN[url] = 2; };
    im.onerror = function () { PHOTO_IN[url] = 3; };
    im.src = url;
  }
  function warm(keys) {
    (keys || []).forEach(function (k) { var rf = realOf(k); if (rf && rf.photo) warmPhoto(rf.photo); });
  }

  // studio.html / san-pham.html: fetched once, then gem:fabric redraws
  var realP = null;
  function loadReal() {
    if (realP) return realP;
    if (!window.GemDB || !window.GemDB.fabrics) return Promise.resolve(false);
    realP = window.GemDB.fabrics().then(function (rows) {
      setReal(rows);
      document.dispatchEvent(new CustomEvent('gem:fabric', { detail: { real: true } }));
      return hasReal();
    }, function () { return false; });
    return realP;
  }

  var GEM = 'gem';            // "let Gem choose" for tones / prints
  var MAX_OTHER = 40, MAX_NOTE = 200;

  // Sketch: strokes on a 64 x 64 grid, 4 inks.
  // the last ink is the eraser: paper colour, drawn over the other strokes
  var INKS = ['#3D4A2E', C.sage, C.gach, C.kraft, '#FBF6EE'];
  var ERASER = INKS.length - 1;
  // brush widths in grid cells: thin, medium, thick
  var WIDTHS = [1.3, 3, 6];
  var GRID = 64, MAX_POINTS = 700, MAX_STROKES = 60;
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function lang() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  /* ======================================================================
     CODE <-> DESIGN
     ====================================================================== */
  function blank(product) {
    var p = PRODUCTS[product] || PRODUCTS.goi;
    return { product: PRODUCTS[product] ? product : 'goi', layout: p.def || p.layouts[0],
      tones: [], prints: [], fabrics: [], other: '', sketch: [], note: '', img: '', fab: '', cus: [], ext: blankExt(), rot: '' };
  }

  // A reference photo the customer attached (private bucket gem-design,
  // staff-only): just its random file name, never a URL.
  var IMG_RE = /^[a-z0-9]{20}\.jpg$/;

  function txt(s) { return encodeURIComponent(s || '').replace(/~/g, '%7E'); }
  function untxt(s) { try { return decodeURIComponent(s || ''); } catch (e) { return null; } }

  function list(ids, table, max) {
    if (ids === '' || ids === GEM) return { ok: true, v: ids === GEM ? [GEM] : [] };
    var parts = ids.split('.');
    if (parts.length > max) return { ok: false };
    for (var i = 0; i < parts.length; i++) {
      if (!table[parts[i]] || parts.indexOf(parts[i]) !== i) return { ok: false };
    }
    return { ok: true, v: parts };
  }

  // A stroke = one head char + points. Head: B64 letter of (ink + 5 × width);
  // old codes used a digit 0–3 (ink only, thin) and still read the same.
  function encodeSketch(strokes) {
    return strokes.map(function (s) {
      return B64[s.c + INKS.length * (s.w || 0)] + s.pts.map(function (p) { return B64[p[0]] + B64[p[1]]; }).join('');
    }).join('.');
  }

  function parseSketch(str) {
    if (!str) return [];
    if (!/^[0-3A-Za-z0-9_.-]+$/.test(str)) return null;
    var out = [], total = 0;
    var strokes = str.split('.');
    if (strokes.length > MAX_STROKES) return null;
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      if (s.length < 3 || (s.length - 1) % 2) return null;
      var c, w;
      if (/^[0-3]$/.test(s[0])) { c = +s[0]; w = 0; }                 // old code
      else {
        var hd = B64.indexOf(s[0]);
        if (hd < 0 || hd >= INKS.length * WIDTHS.length) return null;
        c = hd % INKS.length; w = Math.floor(hd / INKS.length);
      }
      var pts = [];
      for (var j = 1; j < s.length; j += 2) {
        var x = B64.indexOf(s[j]), y = B64.indexOf(s[j + 1]);
        if (x < 0 || y < 0) return null;
        pts.push([x, y]);
      }
      total += pts.length;
      if (total > MAX_POINTS) return null;
      out.push({ c: c, w: w, pts: pts });
    }
    return out;
  }

  function encode(d) {
    var head = ['2', d.product, d.layout, d.tones.join('.'), d.prints.join('.'), d.fabrics.join('.'),
      txt(d.other), encodeSketch(d.sketch), txt(d.note)];
    var cus = d.fab && d.cus && d.cus.length ? d.cus.map(function (c) { return c.r != null ? 'r' + c.r : c.k + c.hex; }).join('.') : '';
    // size / options ride in field 13, each patch's fabric turn in field 14
    // (the fields before them stay, empty)
    var ext = encodeExt(d), rot = rotCode(d);
    if (rot) return head.concat([d.img || '', d.fab, cus, ext, rot]).join('~');
    if (ext) return head.concat([d.img || '', d.fab || '', d.fab ? cus : '', ext]).join('~');
    return head.concat(d.fab ? [d.img || '', d.fab] : d.img ? [d.img] : []).concat(cus ? [cus] : []).join('~');
  }

  function parse(spec) {
    if (typeof spec !== 'string' || spec.length > 4000) return null;
    var f = spec.split('~');
    if (f.length < 9 || f.length > 14 || f[0] !== '2' || !PRODUCTS[f[1]]) return null;
    var img = f.length >= 10 ? f[9] : '';
    var fab = f.length >= 11 ? f[10] : '';
    // 13 fields: size / options last, so fab and colours may be empty
    if (f.length >= 11 && f.length < 13 && !fab) return null;
    if (f.length === 13 && (!f[12] || (!fab && f[11]))) return null;
    // 14: how each patch's fabric is turned, one digit a patch (x 45°)
    var rot = f.length === 14 ? f[13] : '';
    if (f.length === 14 && (!fab || !/^[0-3]{1,64}$/.test(rot) || rot.length > fab.length || !/[1-3]/.test(rot))) return null;
    if (fab.length > 64) return null;
    var cus = [];
    if (f.length === 12 || (f.length >= 13 && f[11])) {
      var cs = f[11].split('.');
      if (cs.length > MAX_CUSTOM) return null;
      for (var ci = 0; ci < cs.length; ci++) {
        // a real fabric from Kho vải
        if (/^r[1-9]\d{0,5}$/.test(cs[ci])) { cus.push({ r: +cs[ci].slice(1) }); continue; }
        if (!/^[0-8][0-9a-f]{6}$/.test(cs[ci])) return null;
        cus.push({ k: +cs[ci][0], hex: cs[ci].slice(1) });
      }
    }
    for (var q = 0; q < fab.length; q++) {
      var fi = B64.indexOf(fab[q]);
      if (fi < 0 || fi >= N_FABRICS + cus.length) return null;
    }
    if (img && !IMG_RE.test(img)) return null;
    var p = PRODUCTS[f[1]];
    if (p.layouts.indexOf(f[2]) < 0 && LEGACY[f[1]] && LEGACY[f[1]][f[2]]) {
      // an old code: its fabrics go onto the new pieces
      var was = f[2], a = fab[0] || '', b = fab[1] || a;
      f[2] = LEGACY[f[1]][was];
      if (fab) {
        if (f[1] === 'bloom') fab = was === 'hai' ? a + a + b + b : a + a + a + a;
        else if (f[1] === 'bookmark') fab = was === 'vuong' ? a + fab[fab.length - 1] : a;
        else if ((f[1] === 'daydeo' || f[1] === 'origami') && was === 'hai') fab = a + b;
        else fab = a;
      }
    }
    if (p.layouts.indexOf(f[2]) < 0) return null;
    var tones = list(f[3], TONES, MAX_TONES), prints = list(f[4], PRINTS, PRINT_ORDER.length),
        fabrics = f[5] === GEM ? { ok: false } : list(f[5], FABRICS, FABRIC_ORDER.length);
    if (!tones.ok || !prints.ok || !fabrics.ok) return null;
    var other = untxt(f[6]), note = untxt(f[8]), sketch = parseSketch(f[7]);
    if (other === null || note === null || sketch === null) return null;
    if (other.length > MAX_OTHER || note.length > MAX_NOTE) return null;
    var ext = parseExt(f.length >= 13 ? f[12] : '', f[1]);
    if (!ext) return null;
    return { product: f[1], layout: f[2], tones: tones.v, prints: prints.v, fabrics: fabrics.v,
      other: other, sketch: sketch, note: note, img: img, fab: fab, cus: cus, ext: ext, rot: rot };
  }

  // Orderable: everything has a sensible "Gem chooses" default, except a
  // "from my drawing" layout with nothing drawn.
  function isComplete(d) {
    return !!d && (d.layout !== 'tuve' || d.sketch.length > 0 || !!d.img);
  }

  /* ---------- turning a patch's fabric (14/10/2026) ----------
     Each patch can have its fabric turned in steps of 45° (a stripe that
     runs up and down, cut on the slant). d.rot: one digit a patch, 0-3;
     only patches with a fabric of their own (d.fab) turn. */
  var TURN_STEP = 45;
  function rotAt(d, i) {
    return d && d.fab && d.rot && i < d.fab.length && i < d.rot.length ? +d.rot[i] || 0 : 0;
  }
  function rotCode(d) {
    if (!d.fab || !d.rot) return '';
    var r = d.rot.slice(0, d.fab.length).replace(/0+$/, '');
    return /^[0-3]+$/.test(r) && /[1-3]/.test(r) ? r : '';
  }
  // the next turn for patch i (its fabric fixed first, as setPatch does)
  function turnPatch(d, i) {
    var n = slots(d);
    if (i < 0 || i >= n) return;
    if (!d.fab || d.fab.length !== n) setPatch(d, i, keyAt(d, i) != null ? keyAt(d, i) : shownKey(d, i));
    var r = (d.rot || '').slice(0, n);
    while (r.length < n) r += '0';
    d.rot = r.slice(0, i) + ((rotAt(d, i) + 1) % 4) + r.slice(i + 1);
  }

  function names(ids, table, l) {
    return ids.map(function (id) { return table[id][l]; }).join(', ');
  }

  // One line for the order note / basket. <other>/<note> are the customer's
  // own words: callers put this through textContent or esc().
  function describe(spec, l) {
    var d = typeof spec === 'string' ? parse(spec) : spec;
    if (!d) return '';
    l = l || lang();
    var vi = l === 'vi';
    var gem = vi ? 'Gem chọn' : 'Gem picks';
    var bits = [PRODUCTS[d.product][l] + (d.product === 'lotcoc' ? (vi ? ' tròn' : ' (round)') : ''),
      (vi ? 'kiểu ' : 'layout: ') + layoutName(d.product, d.layout, l)];
    if (d.fab) bits.push((vi ? 'vải từng mảnh: ' : 'fabric per patch: ') + fabricList(d, l));
    else {
      bits.push((vi ? 'tông: ' : 'colours: ') + (d.tones.length && d.tones[0] !== GEM ? names(d.tones, TONES, l) : gem));
      bits.push((vi ? 'họa tiết: ' : 'prints: ') + (d.prints.length && d.prints[0] !== GEM ? names(d.prints, PRINTS, l) : gem));
    }
    var fab = names(d.fabrics, FABRICS, l);
    if (d.other) fab = (fab ? fab + ', ' : '') + (vi ? 'khác: ' : 'other: ') + d.other;
    // real fabrics on every patch: the material is already known
    var allReal = !!d.fab && d.fab.split('').every(function (ch) { return isReal(keyOf(d, B64.indexOf(ch))); });
    if (fab || !allReal) bits.push((vi ? 'chất vải: ' : 'fabrics: ') + (fab || gem));
    if (d.layout === 'net') {
      var nn = netRegions(d.sketch).n;
      bits.push(vi ? 'cắt ' + nn + ' mảnh theo nét vẽ (xem hình)' : nn + ' pieces cut along the drawn lines (see picture)');
    } else if (d.sketch.length) bits.push(vi ? 'có hình vẽ tay' : 'with a sketch');
    if (d.img) bits.push(vi ? 'có ảnh tham khảo' : 'with a reference photo');
    bits = bits.concat(extBits(d, l));
    // turned fabrics: which patch, how far (the sewer cuts it on that angle)
    var turned = [], sn = slotNames(d, l);
    for (var ti = 0; d.fab && ti < d.fab.length; ti++) {
      var tr = rotAt(d, ti);
      if (tr) turned.push((sn ? sn[ti] : (vi ? 'mảnh ' : 'patch ') + (ti + 1)) + ' ' + tr * TURN_STEP + '°');
    }
    if (turned.length) bits.push((vi ? 'vải xoay: ' : 'fabric turned: ') + turned.join(', '));
    if (d.note) bits.push((vi ? 'ghi chú: ' : 'note: ') + d.note);
    return bits.join(' · ');
  }
  // the size and the bag options, for the order line
  function extBits(d, l) {
    var vi = l === 'vi', e = d.ext || blankExt(), p = PRODUCTS[d.product], out = [];
    out.push(e.c ? (vi ? 'cỡ riêng ' : 'own size ') + e.c[0] + ' × ' + e.c[1] + ' cm' + (vi ? ' (Gem báo giá)' : ' (Gem quotes)')
      : (vi ? 'cỡ ' : 'size ') + sizeLabel(d.product, e.s, l));
    if ((p.opts || '').indexOf('p') >= 0) out.push(vi ? 'túi trong: 1 có sẵn' + (e.p ? ' + ' + e.p : '') : 'inside pockets: 1 included' + (e.p ? ' + ' + e.p : ''));
    if (e.q) out.push(vi ? 'chần bông' : 'quilted');
    if (p.zip) out.push(vi ? 'khoá kéo có sẵn' : 'zip included');
    if (e.z) out.push(vi ? 'thêm khoá kéo' : 'add a zip');
    if (e.n) out.push(vi ? 'thêm nút bấm' : 'add a snap');
    if (e.e) out.push(embName(d.product, l).toLowerCase() + ': ' + STITCHES[e.e - 1][l].toLowerCase() +
      (vi ? ', chỉ ' : ', ') + THREADS[e.ec][l].toLowerCase() + (vi ? '' : ' thread'));
    if (p.ties) {
      // a range (the bow): the order line says so, Gem settles it on the reply
      var k = tieOf(d), f = fee(((PRICING.products[d.product] || {}).ties || [])[p.ties.indexOf(k)]);
      out.push((vi ? 'buộc vai: ' : 'shoulder tie: ') + TIES[k][l].toLowerCase() + (f[1] > f[0]
        ? ' +' + f[0] / 1000 + '–' + f[1] / 1000 + 'k (' + tieWhy(k, l) + (vi ? ', Gem tư vấn cỡ)' : ', Gem helps choose)') : ''));
    }
    return out;
  }

  // What each fabric slot is, on pieces made of separate parts (the order
  // note says which fabric goes where); null for one-surface pieces.
  var PART_NAMES = {
    co: { vi: 'Cổ áo', en: 'Collar' }, quai: { vi: 'Quai', en: 'Strap' },
    lot: { vi: 'Lót (chỗ lộ ra)', en: 'Lining (where it shows)' }, giua: { vi: 'Mảnh giữa', en: 'Middle panel' },
    day: { vi: 'Đáy', en: 'Bottom band' }, tui: { vi: 'Túi ngoài', en: 'Outer pocket' }, mieng: { vi: 'Viền miệng', en: 'Top band' },
    b1: { vi: 'Bông giữa', en: 'Middle flower' }, b2: { vi: 'Bông phải', en: 'Right flower' }, b3: { vi: 'Bông trái', en: 'Left flower' },
    bong: { vi: 'Bông', en: 'Flower' }
  };
  var MAIN_NAMES = { oxford: { vi: 'Thân túi', en: 'Body' }, bloom: { vi: 'Dây', en: 'Cord' } };
  // the bags: their body (the strap's stitch option makes it no bag)
  Object.keys(PRODUCTS).forEach(function (id) { if (/^(tui|laptop)$/.test(PRODUCTS[id].group)) MAIN_NAMES[id] = MAIN_NAMES.oxford; });
  function slotNames(d, l) {
    l = l || lang();
    var vi = l === 'vi';
    if (!d || d.layout === 'tuve') return null;
    if (d.product === 'bookmark' && d.layout === 'hai') return [vi ? 'Mảnh vuông' : 'Square', vi ? 'Mảnh tam giác' : 'Flap'];
    if (d.product === 'origami' && d.layout !== 'mot') {
      var nen = vi ? 'Nền túi' : 'Base', canh = vi ? 'Cánh' : 'Petal';
      if (d.layout === 'canh') return [nen, canh];
      if (d.layout === 'xen') return [nen, canh + ' 1, 3, 5', canh + ' 2, 4, 6'];
      return [nen].concat([1, 2, 3, 4, 5, 6].map(function (n) { return canh + ' ' + n; }));
    }
    if (d.product === 'daydeo' && d.layout === 'ngang') return [vi ? 'Nửa trên' : 'Top half', vi ? 'Nửa dưới' : 'Bottom half'];
    if (d.product === 'daydeo' && d.layout === 'doc') return [vi ? 'Nửa trái' : 'Left half', vi ? 'Nửa phải' : 'Right half'];
    var parts = partsOf(d);
    if (!parts.length || !MAIN_NAMES[d.product]) return null;
    var n = slots(d), out = [];
    for (var i = 0; i < n - parts.length; i++) out.push(MAIN_NAMES[d.product][l]);
    parts.forEach(function (pt) { out.push(PART_NAMES[pt.id][l]); });
    return out;
  }

  // "Hoa nhí xanh lá ×3, Ren trung tính ×1" — the fabrics on the patches;
  // on a piece of separate parts: "Thân túi: … · Cổ áo: … · Quai: …"
  function fabricList(d, l) {
    var sn = slotNames(d, l);
    if (sn) {
      var groups = [], at = {};
      sn.forEach(function (nm, i) {
        if (i >= (d.fab || '').length) return;
        if (!(nm in at)) { at[nm] = groups.length; groups.push({ nm: nm, fab: '' }); }
        groups[at[nm]].fab += d.fab[i];
      });
      return groups.map(function (g) {
        return g.nm + ': ' + fabricRun(Object.assign({}, d, { fab: g.fab }), l);
      }).join(' · ');
    }
    return fabricRun(d, l);
  }
  function fabricRun(d, l) {
    var count = {}, order = [];
    for (var i = 0; i < d.fab.length; i++) {
      var id = B64.indexOf(d.fab[i]);
      if (!count[id]) { count[id] = 0; order.push(id); }
      count[id]++;
    }
    return order.map(function (id) {
      var key = keyOf(d, id), rf = realOf(key);
      return keyName(key, l) + (count[id] > 1 ? ' ×' + count[id] : '') +
        (rf && rf.out ? (l === 'vi' ? ' (đã hết)' : ' (sold out)') : '');
    }).join(', ');
  }

  // Colour families + print tags, for "ready-made in a similar palette".
  function tones(spec) {
    var d = typeof spec === 'string' ? parse(spec) : spec;
    var out = {};
    if (!d) return out;
    d.tones.forEach(function (t) { if (t !== GEM) out[t] = (out[t] || 0) + 2; });
    for (var i = 0; i < (d.fab || '').length; i++) {
      var f = info(d, B64.indexOf(d.fab[i]));
      out[f.tone] = (out[f.tone] || 0) + 1;
      if (PRINTS[f.kind] && f.kind !== 'tron') out[f.kind] = (out[f.kind] || 0) + 1;
    }
    d.prints.forEach(function (p) { if (p !== GEM && p !== 'tron') out[p] = (out[p] || 0) + 1; });
    if (d.fabrics.indexOf('bo') >= 0) out.bo = (out.bo || 0) + 1;
    if (d.fabrics.indexOf('ren') >= 0) out.ren = (out.ren || 0) + 1;
    return out;
  }

  function randomFill(product) {
    var d = blank(product);
    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var lay = PRODUCTS[d.product].layouts.filter(function (x) { return x !== 'tuve'; });
    d.layout = pick(lay);
    var t1 = pick(TONE_ORDER), t2 = pick(TONE_ORDER.filter(function (x) { return x !== t1; }));
    d.tones = [t1, t2];
    var p = PRINT_ORDER.slice().sort(function () { return Math.random() - 0.5; });
    d.prints = p.slice(0, 2);
    return d;
  }

  /* ======================================================================
     DRAWING
     ====================================================================== */
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function dark(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140;
  }

  // Pattern body for a print on a base colour (tile in its own units).
  function printBody(print, base) {
    var acc = dark(base) ? shade(C.kem, -0.05) : shade(base, -0.35);
    switch (print) {
      case 'caro':
        return { size: 16, body: '<rect width="16" height="16" fill="' + base + '"/>' +
          '<rect width="8" height="16" fill="' + acc + '" opacity="0.45"/>' +
          '<rect width="16" height="8" fill="' + acc + '" opacity="0.45"/>' };
      case 'soc':
        return { size: 12, body: '<rect width="12" height="12" fill="' + base + '"/>' +
          '<rect width="3" height="12" fill="' + acc + '" opacity="0.55"/>' };
      case 'cham':
        return { size: 22, body: '<rect width="22" height="22" fill="' + base + '"/>' +
          '<circle cx="5.5" cy="5.5" r="2.8" fill="' + acc + '"/><circle cx="16.5" cy="16.5" r="2.8" fill="' + acc + '"/>' };
      case 'hoa':
        var fl = function (x, y) {
          return '<g fill="' + acc + '"><circle cx="' + x + '" cy="' + (y - 2.6) + '" r="2"/>' +
            '<circle cx="' + (x + 2.5) + '" cy="' + (y - 0.8) + '" r="2"/><circle cx="' + (x + 1.6) + '" cy="' + (y + 2.2) + '" r="2"/>' +
            '<circle cx="' + (x - 1.6) + '" cy="' + (y + 2.2) + '" r="2"/><circle cx="' + (x - 2.5) + '" cy="' + (y - 0.8) + '" r="2"/></g>' +
            '<circle cx="' + x + '" cy="' + y + '" r="1.1" fill="#D8A64A"/>';
        };
        return { size: 32, body: '<rect width="32" height="32" fill="' + base + '"/>' +
          '<ellipse cx="14" cy="9" rx="3.2" ry="1.4" fill="' + C.sage + '" transform="rotate(-30 14 9)"/>' +
          '<ellipse cx="25" cy="26" rx="3.2" ry="1.4" fill="' + C.sage + '" transform="rotate(25 25 26)"/>' +
          fl(8, 8) + fl(22, 22) };
      case 'ren':
        // openwork net, eyelet flower, scalloped edge
        return { size: 24, body: '<rect width="24" height="24" fill="' + base + '"/>' +
          '<path d="M0 0L24 24M24 0L0 24M12 0L24 12L12 24L0 12Z" stroke="' + acc + '" stroke-width="0.45" opacity="0.4" fill="none"/>' +
          '<g fill="none" stroke="' + acc + '" stroke-width="0.8" opacity="0.8">' +
            '<ellipse cx="12" cy="7.6" rx="1.6" ry="2.6"/><ellipse cx="12" cy="16.4" rx="1.6" ry="2.6"/>' +
            '<ellipse cx="7.6" cy="12" rx="2.6" ry="1.6"/><ellipse cx="16.4" cy="12" rx="2.6" ry="1.6"/></g>' +
          '<circle cx="12" cy="12" r="1.1" fill="' + acc + '" opacity="0.6"/>' +
          '<path d="M0 23q3-3.5 6 0t6 0t6 0t6 0" stroke="' + acc + '" stroke-width="0.8" fill="none" opacity="0.65"/>' };
      case 'hoato':
        // bigger roses with leaves, two per tile
        var rose = function (x, y) {
          return '<ellipse cx="' + (x - 7) + '" cy="' + (y + 6) + '" rx="5" ry="2.2" fill="' + C.sage + '" transform="rotate(-25 ' + (x - 7) + ' ' + (y + 6) + ')"/>' +
            '<ellipse cx="' + (x + 7) + '" cy="' + (y + 6) + '" rx="5" ry="2.2" fill="' + C.reuNhat + '" transform="rotate(25 ' + (x + 7) + ' ' + (y + 6) + ')"/>' +
            '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="' + acc + '"/>' +
            '<path d="M' + (x - 3) + ' ' + y + 'a3 3 0 1 1 3 3" fill="none" stroke="' + shade(acc, -0.3) + '" stroke-width="1"/>';
        };
        return { size: 48, body: '<rect width="48" height="48" fill="' + base + '"/>' + rose(13, 13) + rose(37, 36) };
      case 'ono':
        // small woven check
        return { size: 8, body: '<rect width="8" height="8" fill="' + base + '"/>' +
          '<rect width="4" height="8" fill="' + acc + '" opacity="0.35"/><rect width="8" height="4" fill="' + acc + '" opacity="0.35"/>' };
      case 'tho':
        // folk print: zigzag bands and diamonds
        return { size: 20, body: '<rect width="20" height="20" fill="' + base + '"/>' +
          '<path d="M0 4l5-3l5 3l5-3l5 3" fill="none" stroke="' + acc + '" stroke-width="1.4"/>' +
          '<path d="M10 9l3 4l-3 4l-3-4Z" fill="' + acc + '" opacity="0.8"/>' +
          '<circle cx="2" cy="13" r="1" fill="' + acc + '"/><circle cx="18" cy="13" r="1" fill="' + acc + '"/>' };
      default: // tron — plain, with a faint weave
        return { size: 8, body: '<rect width="8" height="8" fill="' + base + '"/>' +
          '<path d="M0 4h8M4 0v8" stroke="' + shade(base, -0.06) + '" stroke-width="0.6"/>' };
    }
  }

  var uid = 0;

  // Fabric picker for the preview: patch i gets a colour + a print.
  function fabricsFor(d) {
    var pal = [];
    var chosen = d.tones.filter(function (t) { return t !== GEM; });
    (chosen.length ? chosen : ['xanh', 'trung', 'nau', 'hong']).forEach(function (t) {
      pal = pal.concat(TONES[t].c);
    });
    // interleave families so neighbours differ
    if (chosen.length === 2) {
      var a = TONES[chosen[0]].c, b = TONES[chosen[1]].c;
      pal = [a[0], b[0], a[1], b[1], a[2], b[2]];
    }
    var prints = d.prints.filter(function (p) { return p !== GEM; });
    if (!prints.length) prints = ['tron', 'caro', 'tron', 'hoa', 'tron', 'cham'];
    else if (prints.indexOf('tron') < 0 && prints.length < 3) prints = prints.concat(['tron']);
    return function (i) {
      return { color: pal[i % pal.length], print: prints[(i * 2 + Math.floor(i / pal.length)) % prints.length] };
    };
  }

  // Patches of a layout in a 0..100 square: [{pts:[[x,y],…], i}]
  function patches(layout, grid) {
    var out = [];
    var sq = function (x0, y0, x1, y1, i) { out.push({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], i: i }); };
    if (layout === 'vuong') {
      var s = 100 / grid;
      for (var r = 0; r < grid; r++) for (var c = 0; c < grid; c++) sq(c * s, r * s, c * s + s, r * s + s, r * grid + c);
    } else if (layout === 'cabin') {
      var w = grid > 2 ? 10 : 12.5;
      var b = [50 - w, 50 - w, 50 + w, 50 + w], k = 1;
      sq(b[0], b[1], b[2], b[3], 0);
      while (b[0] > 0 || b[1] > 0 || b[2] < 100 || b[3] < 100) {
        var side = (k - 1) % 4;
        if (side === 0 && b[1] > 0) { sq(b[0], b[1] - w, b[2], b[1], k); b[1] -= w; }
        else if (side === 1 && b[2] < 100) { sq(b[2], b[1], b[2] + w, b[3], k); b[2] += w; }
        else if (side === 2 && b[3] < 100) { sq(b[0], b[3], b[2], b[3] + w, k); b[3] += w; }
        else if (side === 3 && b[0] > 0) { sq(b[0] - w, b[1], b[0], b[3], k); b[0] -= w; }
        k++;
        if (k > 40) break;
      }
    } else if (layout === 'sao') {
      // sawtooth star on a 3 x 3 grid: background 0, points 1, centre 2
      var t = 100 / 3;
      [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(function (g) { sq(g[0] * t, g[1] * t, g[0] * t + t, g[1] * t + t, 0); });
      sq(t, t, 2 * t, 2 * t, 2);
      // each edge square = one star point (tip on the outer edge) + two
      // background triangles beside it
      var tri = function (A, B2, C2, i) { out.push({ pts: [A, B2, C2], i: i }); };
      var t1 = t, t2 = 2 * t, m = 50;
      // top
      tri([t1, t1], [t2, t1], [m, 0], 1); tri([t1, 0], [m, 0], [t1, t1], 0); tri([m, 0], [t2, 0], [t2, t1], 0);
      // bottom
      tri([t1, t2], [t2, t2], [m, 100], 1); tri([t1, 100], [m, 100], [t1, t2], 0); tri([m, 100], [t2, 100], [t2, t2], 0);
      // left
      tri([t1, t1], [t1, t2], [0, m], 1); tri([0, t1], [0, m], [t1, t1], 0); tri([0, m], [0, t2], [t1, t2], 0);
      // right
      tri([t2, t1], [t2, t2], [100, m], 1); tri([100, t1], [100, m], [t2, t1], 0); tri([100, m], [100, t2], [t2, t2], 0);
    } else if (layout === 'doc') {
      // upright strips across the piece (a bag's body, the laptop sleeve)
      for (var q = 0; q < 5; q++) sq(q * 20, 0, q * 20 + 20, 100, q);
    } else if (layout === 'chong') {
      var h = 50;
      // four squares, each split on a diagonal that turns round the centre
      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (g, n) {
        var x0 = g[0] * h, y0 = g[1] * h, x1 = x0 + h, y1 = y0 + h;
        var A = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        var a = A[n % 4], b2 = A[(n + 1) % 4], c2 = A[(n + 2) % 4], d2 = A[(n + 3) % 4];
        out.push({ pts: [a, b2, c2], i: 1 });
        out.push({ pts: [a, c2, d2], i: 0 });
      });
    }
    return out;
  }

  function pathOf(pts, ox, oy, sc) {
    return 'M' + pts.map(function (p) { return (ox + p[0] * sc).toFixed(1) + ' ' + (oy + p[1] * sc).toFixed(1); }).join('L') + 'Z';
  }

  // A stroke as a smooth path: quadratic curves through the midpoints of its
  // points, so a drawing kept on the coarse grid doesn't look like stairs.
  function smoothPath(pts, X, Y) {
    if (pts.length === 1) return 'M' + X(pts[0][0]) + ' ' + Y(pts[0][1]) + 'l0.01 0';
    if (pts.length === 2) return 'M' + X(pts[0][0]) + ' ' + Y(pts[0][1]) + 'L' + X(pts[1][0]) + ' ' + Y(pts[1][1]);
    var d = 'M' + X(pts[0][0]) + ' ' + Y(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += 'Q' + X(pts[i][0]) + ' ' + Y(pts[i][1]) + ' ' + X(mx) + ' ' + Y(my);
    }
    var last = pts[pts.length - 1];
    return d + 'L' + X(last[0]) + ' ' + Y(last[1]);
  }

  // Fewer points, same line (Ramer–Douglas–Peucker): a straight drag keeps
  // just its two ends. Points in grid cells, eps in cells.
  function simplify(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var a = pts[0], b = pts[pts.length - 1], far = 0, at = 0;
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    for (var i = 1; i < pts.length - 1; i++) {
      // a closed loop (ends meet): distance from the start point instead
      var dist = len < 1e-6 ? Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1])
        : Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
      if (dist > far) { far = dist; at = i; }
    }
    if (far <= eps) return [a, b];
    return simplify(pts.slice(0, at + 1), eps).slice(0, -1).concat(simplify(pts.slice(at), eps));
  }

  // The fine points of a finished stroke → what the code keeps (grid cells).
  function settle(raw) {
    var out = [];
    simplify(raw, 0.55).forEach(function (q) {
      var c = [Math.max(0, Math.min(GRID - 1, Math.round(q[0] - 0.5))), Math.max(0, Math.min(GRID - 1, Math.round(q[1] - 0.5)))];
      var l = out[out.length - 1];
      if (!l || l[0] !== c[0] || l[1] !== c[1]) out.push(c);
    });
    return out;
  }

  function sketchPaths(strokes, ox, oy, size) {
    var sc = size / GRID;
    var X = function (v) { return (ox + (v + 0.5) * sc).toFixed(1); };
    var Y = function (v) { return (oy + (v + 0.5) * sc).toFixed(1); };
    return strokes.map(function (s) {
      return '<path d="' + smoothPath(s.pts, X, Y) + '" fill="none" stroke="' + INKS[s.c] + '" stroke-width="' + (sc * WIDTHS[s.w || 0]).toFixed(1) +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
  }

  /* ---------- the newer pieces, each drawn in a 340 x 340 box ----------
     A shape returns its SVG: the fabric (one fabric, two fabrics, squares
     or the customer's drawing) inside its outline, then the stitching and
     the hardware (ring, buttons, clasp, tassel) on top. */
  var METAL = '#A8A49A';
  function hexPts(cx, cy, r) {
    var out = [];
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  }
  function poly(pts) { return pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
  function ring(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + METAL + '" stroke-width="7"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2"/>';
  }
  // the customer's drawing inside a box, clipped to the piece
  function drawn(d, clipId, x, y, w) {
    return '<g clip-path="url(#' + clipId + ')"><rect width="340" height="340" fill="#FBF6EE"/>' +
      sketchPaths(d.sketch, x, y, w) + '</g>';
  }
  // squares (or another patch layout) inside a box, clipped to the piece
  function patched(d, p, fill, clipId, x, y, w, h) {
    var out = '<g clip-path="url(#' + clipId + ')">';
    patches('vuong', p.grid).forEach(function (pt, n) {
      out += '<path d="M' + pt.pts.map(function (q) { return (x + q[0] * w / 100).toFixed(1) + ' ' + (y + q[1] * h / 100).toFixed(1); }).join('L') +
        'Z" fill="' + fill(n) + '" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="6 5" stroke-opacity="0.4"/>';
    });
    return out + '</g>';
  }

  var SHAPES = {
    // hexagon folded into six petals, key ring on top
    origami: function (d, p, fill, pre) {
      var cx = 175, cy = 190, R = 130, H = hexPts(cx, cy, R), out = '';
      out += '<line x1="70" y1="88" x2="' + H[4][0].toFixed(1) + '" y2="' + H[4][1].toFixed(1) + '" stroke="' + METAL + '" stroke-width="6"/>';
      out += '<clipPath id="' + pre + 'hex"><polygon points="' + poly(H) + '"/></clipPath>';
      if (d.layout === 'tuve') out += drawn(d, pre + 'hex', cx - R, cy - R, 2 * R);
      else {
        for (var k = 0; k < 6; k++) {
          var a = H[k], b = H[(k + 1) % 6], m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          out += '<polygon points="' + poly([[cx, cy], a, m1]) + '" fill="' + fill(d.layout === 'hai' ? k % 2 : 0) + '"/>';
          out += '<polygon points="' + poly([[cx, cy], m1, b]) + '" fill="' + fill(d.layout === 'hai' ? (k + 1) % 2 : 0) + '"/>';
        }
        out += '<polygon points="' + poly(H) + '" fill="url(#' + pre + 'puff)"/>';
        // the folds: centre to every corner and edge middle
        for (var j = 0; j < 6; j++) {
          var c = H[j], n = H[(j + 1) % 6];
          out += '<path d="M' + cx + ' ' + cy + 'L' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + 'M' + cx + ' ' + cy + 'L' +
            ((c[0] + n[0]) / 2).toFixed(1) + ' ' + ((c[1] + n[1]) / 2).toFixed(1) + '" stroke="#3D4A2E" stroke-opacity="0.22" stroke-width="2"/>';
        }
      }
      out += '<polygon points="' + poly(H) + '" fill="none" stroke="' + STITCH + '" stroke-width="2.4"/>';
      return out + ring(62, 66, 30);
    },
    // a little shirt: body, collar, button placket, a loop handle
    shirt: function (d, p, fill, pre) {
      var out = '';
      var body = 'M78 128Q78 112 94 112L142 112L170 150L198 112L246 112Q262 112 262 128L262 296Q262 310 248 310L92 310Q78 310 78 296Z';
      out += '<path d="M140 116Q140 34 170 34Q200 34 200 116" fill="none" stroke="' + fill(d.layout === 'hai' ? 1 : 0) + '" stroke-width="22" stroke-linecap="round"/>' +
        '<path d="M140 116Q140 34 170 34Q200 34 200 116" fill="none" stroke="' + STITCH + '" stroke-width="1.4" stroke-dasharray="5 5"/>';
      out += '<clipPath id="' + pre + 'shirt"><path d="' + body + '"/></clipPath>';
      if (d.layout === 'tuve') out += drawn(d, pre + 'shirt', 70, 100, 200);
      else if (d.layout === 'vuong') out += patched(d, p, fill, pre + 'shirt', 78, 112, 184, 198);
      else out += '<path d="' + body + '" fill="' + fill(0) + '"/>';
      out += '<path d="' + body + '" fill="url(#' + pre + 'puff)" stroke="' + STITCH + '" stroke-width="2.2"/>';
      // collar points + placket + buttons
      var col = d.layout === 'tuve' ? '#FBF6EE' : fill(d.layout === 'hai' ? 1 : 0);
      out += '<path d="M142 112L170 150L150 168L124 120Z" fill="' + col + '" stroke="' + STITCH + '" stroke-width="2"/>' +
        '<path d="M198 112L170 150L190 168L216 120Z" fill="' + col + '" stroke="' + STITCH + '" stroke-width="2"/>' +
        '<path d="M170 150L170 310" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="5 5"/>';
      [190, 230, 270].forEach(function (y) {
        out += '<circle cx="170" cy="' + y + '" r="6" fill="#FBF6EE" stroke="' + STITCH + '" stroke-width="1.6"/>';
      });
      return out;
    },
    // five petals round a centre, hanging from a ring and a short chain
    bloom: function (d, p, fill, pre) {
      var cx = 170, cy = 200, out = '';
      out += '<path d="M170 58L170 120" stroke="' + METAL + '" stroke-width="5" stroke-dasharray="9 5"/>' + ring(170, 42, 18);
      var petals = [];
      for (var k = 0; k < 5; k++) {
        var a = -90 + k * 72;
        petals.push('<ellipse cx="' + cx + '" cy="' + (cy - 64) + '" rx="46" ry="66" transform="rotate(' + (a + 90) + ' ' + cx + ' ' + cy + ')"');
      }
      out += '<clipPath id="' + pre + 'fl">' + petals.map(function (e) { return e + '/>'; }).join('') + '</clipPath>';
      if (d.layout === 'tuve') out += drawn(d, pre + 'fl', 40, 70, 260);
      else petals.forEach(function (e, k) { out += e + ' fill="' + fill(d.layout === 'hai' ? k % 2 : 0) + '"/>'; });
      petals.forEach(function (e) { out += e + ' fill="url(#' + pre + 'puff)" stroke="' + STITCH + '" stroke-width="2"/>'; });
      return out + '<circle cx="' + cx + '" cy="' + cy + '" r="30" fill="' + (d.layout === 'hai' ? fill(2) : C.kem) +
        '" stroke="' + STITCH + '" stroke-width="2"/>';
    },
    // a long strip with a tassel
    bookmark: function (d, p, fill, pre) {
      var x = 118, y = 22, w = 104, h = 262, out = '';
      out += '<clipPath id="' + pre + 'bm"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"/></clipPath>';
      if (d.layout === 'tuve') out += drawn(d, pre + 'bm', 40, 22, 262);
      else if (d.layout === 'vuong') out += patched(d, p, fill, pre + 'bm', x, y, w, h);
      else if (d.layout === 'hai') {
        out += '<g clip-path="url(#' + pre + 'bm)"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h / 2 + '" fill="' + fill(0) + '"/>' +
          '<rect x="' + x + '" y="' + (y + h / 2) + '" width="' + w + '" height="' + h / 2 + '" fill="' + fill(1) + '"/></g>' +
          '<path d="M' + x + ' ' + (y + h / 2) + 'h' + w + '" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="6 5" stroke-opacity="0.4"/>';
      } else out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + fill(0) + '"/>';
      out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="url(#' + pre + 'puff)" stroke="' + STITCH + '" stroke-width="2.2"/>' +
        '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (w - 16) + '" height="' + (h - 16) + '" rx="6" fill="none" stroke="' + STITCH + '" stroke-width="1.4" stroke-dasharray="5 5"/>';
      // tassel
      out += '<path d="M170 ' + (y + h) + 'L170 ' + (y + h + 14) + '" stroke="' + C.kraft + '" stroke-width="3"/>' +
        '<circle cx="170" cy="' + (y + h + 18) + '" r="6" fill="' + C.kraft + '"/>';
      for (var t = -12; t <= 12; t += 4) {
        out += '<path d="M170 ' + (y + h + 22) + 'L' + (170 + t) + ' ' + (y + h + 48) + '" stroke="' + C.kraft + '" stroke-width="2.2" stroke-linecap="round"/>';
      }
      return out;
    },
    // a loop of fabric with a clasp at the bottom
    strap: function (d, p, fill, pre) {
      var loop = 'M170 268C70 262 64 70 170 58C276 70 270 262 170 268', out = '';
      if (d.layout === 'tuve') {
        out += '<mask id="' + pre + 'st"><path d="' + loop + '" fill="none" stroke="#fff" stroke-width="48"/></mask>' +
          '<g mask="url(#' + pre + 'st)"><rect width="340" height="340" fill="#FBF6EE"/>' + sketchPaths(d.sketch, 50, 40, 240) + '</g>';
      } else if (d.layout === 'hai') {
        out += '<path d="M170 268C70 262 64 70 170 58" fill="none" stroke="' + fill(0) + '" stroke-width="48"/>' +
          '<path d="M170 58C276 70 270 262 170 268" fill="none" stroke="' + fill(1) + '" stroke-width="48"/>';
      } else out += '<path d="' + loop + '" fill="none" stroke="' + fill(0) + '" stroke-width="48"/>';
      out += '<path d="' + loop + '" fill="none" stroke="#3D4A2E" stroke-opacity="0.1" stroke-width="48"/>' +
        '<path d="' + loop + '" fill="none" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="6 5" stroke-opacity="0.4"/>';
      // clasp: a ring and a swivel hook
      return out + '<rect x="150" y="256" width="40" height="22" rx="5" fill="' + METAL + '"/>' + ring(170, 296, 14) +
        '<path d="M170 310L170 322Q170 332 180 332" fill="none" stroke="' + METAL + '" stroke-width="6" stroke-linecap="round"/>';
    }
  };

  // Build the preview SVG. Illustrative only: real scraps differ.
  /* ---------- "Ghép theo nét vẽ": the customer's lines cut the piece ----------
     Strokes (64-grid) are smoothed like on screen, their loose ends snapped
     to the edge or to a nearby line, then drawn as walls on a 160 x 160 grid.
     Every enclosed area is a patch; areas too small to sew are merged into
     their neighbours, and there are at most NET_MAX patches. Same strokes,
     same patches, same order (top-left first): the code stays the drawing. */
  var NET_R = 160, NET_MAX = 12, NET_MIN = 0.008, NET_SNAP = 3.2;
  var netCache = {}, netKeys = [];

  // the same curve smoothPath draws, as points (continuous 64-grid units)
  function smoothPts(pts) {
    var c = pts.map(function (q) { return [q[0] + 0.5, q[1] + 0.5]; });
    if (c.length < 3) return c;
    var out = [c[0]], p0 = c[0];
    for (var i = 1; i < c.length - 1; i++) {
      var ctl = c[i], end = [(c[i][0] + c[i + 1][0]) / 2, (c[i][1] + c[i + 1][1]) / 2];
      for (var k = 1; k <= 8; k++) {
        var t = k / 8, u = 1 - t;
        out.push([u * u * p0[0] + 2 * u * t * ctl[0] + t * t * end[0], u * u * p0[1] + 2 * u * t * ctl[1] + t * t * end[1]]);
      }
      p0 = end;
    }
    out.push(c[c.length - 1]);
    return out;
  }

  function nearOn(poly, q, skip) {
    var best = null, bd = 1e9;
    for (var i = 0; i < poly.length; i++) {
      if (skip && skip(i)) continue;
      var dd = Math.hypot(poly[i][0] - q[0], poly[i][1] - q[1]);
      if (dd < bd) { bd = dd; best = poly[i]; }
    }
    return { p: best, d: bd };
  }

  // loose ends reach the edge, another line, or their own start
  function snapLines(strokes) {
    var lines = strokes.filter(function (s) { return s.c !== ERASER; }).map(function (s) { return smoothPts(s.pts); });
    var G = GRID;
    return lines.map(function (L, li) {
      if (L.length < 2) return L;
      var out = L.slice(), a = L[0], b = L[L.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < NET_SNAP && L.length > 6) { out.push(a); return out; }
      var fix = function (q, atStart) {
        var de = [[q[0], [0, q[1]]], [G - q[0], [G, q[1]]], [q[1], [q[0], 0]], [G - q[1], [q[0], G]]]
          .sort(function (x, y) { return x[0] - y[0]; })[0];
        if (de[0] < NET_SNAP) return de[1];
        var best = null;
        lines.forEach(function (M, mi) {
          var n = M.length;
          var r = nearOn(M, q, mi === li ? function (i) { return atStart ? i < n * 0.25 + 3 : i > n * 0.75 - 3; } : null);
          if (r.p && r.d < NET_SNAP && (!best || r.d < best.d)) best = r;
        });
        return best ? best.p : null;
      };
      var fa = fix(a, true), fb = fix(b, false);
      if (fa) out.unshift(fa);
      if (fb) out.push(fb);
      return out;
    });
  }

  function netRegions(strokes) {
    var key = encodeSketch(strokes || []);
    if (netCache[key]) return netCache[key];
    var R = NET_R, N = R * R, sc = R / GRID;
    var lines = snapLines(strokes || []);
    var wall = new Uint8Array(N);
    var stamp = function (x, y) {
      for (var yy = Math.floor(y - 1.1); yy <= Math.ceil(y + 1.1); yy++) {
        for (var xx = Math.floor(x - 1.1); xx <= Math.ceil(x + 1.1); xx++) {
          if (xx < 0 || yy < 0 || xx >= R || yy >= R) continue;
          if ((xx + 0.5 - x) * (xx + 0.5 - x) + (yy + 0.5 - y) * (yy + 0.5 - y) <= 1.25) wall[yy * R + xx] = 1;
        }
      }
    };
    lines.forEach(function (L) {
      for (var i = 1; i < L.length; i++) {
        var x0 = L[i - 1][0] * sc, y0 = L[i - 1][1] * sc, x1 = L[i][0] * sc, y1 = L[i][1] * sc;
        var steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.5));
        for (var k = 0; k <= steps; k++) stamp(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps);
      }
    });
    // label the open areas
    var lab = new Int32Array(N), sizes = [0], first = [0], stack = new Int32Array(N);
    for (var c = 0; c < N; c++) {
      if (wall[c] || lab[c]) continue;
      var id = sizes.length, sp = 0, n = 0;
      lab[c] = id; stack[sp++] = c;
      while (sp) {
        var q = stack[--sp], qx = q % R; n++;
        if (qx > 0 && !wall[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack[sp++] = q - 1; }
        if (qx < R - 1 && !wall[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack[sp++] = q + 1; }
        if (q >= R && !wall[q - R] && !lab[q - R]) { lab[q - R] = id; stack[sp++] = q - R; }
        if (q < N - R && !wall[q + R] && !lab[q + R]) { lab[q + R] = id; stack[sp++] = q + R; }
      }
      sizes.push(n); first.push(c);
    }
    // too small to sew, or too many: give the smallest to their neighbours
    var ids = [];
    for (var r = 1; r < sizes.length; r++) ids.push(r);
    ids.sort(function (x, y) { return sizes[x] - sizes[y]; });
    var keep = {}, live = ids.length, capped = false;
    ids.forEach(function (r) {
      if (live > 1 && (sizes[r] < N * NET_MIN || live > NET_MAX)) { if (sizes[r] >= N * NET_MIN) capped = true; live--; }
      else keep[r] = 1;
    });
    // number the kept ones top-left first
    var order = Object.keys(keep).map(Number).sort(function (x, y) { return first[x] - first[y]; });
    var remap = {};
    order.forEach(function (r, i) { remap[r] = i + 1; });
    var out = new Int32Array(N), queue = new Int32Array(N), qh = 0, qt = 0;
    for (c = 0; c < N; c++) {
      if (lab[c] && remap[lab[c]]) { out[c] = remap[lab[c]]; queue[qt++] = c; }
    }
    if (!qt) { for (c = 0; c < N; c++) out[c] = 1; }
    // walls and merged bits take the nearest kept patch
    while (qh < qt) {
      var v = queue[qh++], vx = v % R, nb = [vx > 0 ? v - 1 : -1, vx < R - 1 ? v + 1 : -1, v >= R ? v - R : -1, v < N - R ? v + R : -1];
      for (var t = 0; t < 4; t++) if (nb[t] >= 0 && !out[nb[t]]) { out[nb[t]] = out[v]; queue[qt++] = nb[t]; }
    }
    // one path per patch, row runs (a hair wide so neighbours meet)
    var k2 = 340 / R, paths = [];
    for (var i2 = 0; i2 < Math.max(1, order.length); i2++) paths.push('');
    for (var y = 0; y < R; y++) {
      var x = 0;
      while (x < R) {
        var l = out[y * R + x], x2 = x;
        while (x2 < R && out[y * R + x2] === l) x2++;
        paths[l - 1] += 'M' + (x * k2).toFixed(1) + ' ' + (y * k2).toFixed(1) + 'h' + ((x2 - x) * k2 + 0.6).toFixed(1) +
          'v' + (k2 + 0.6).toFixed(1) + 'h' + (-((x2 - x) * k2 + 0.6)).toFixed(1) + 'z';
        x = x2;
      }
    }
    var res = { n: paths.length, paths: paths, lines: lines, capped: capped };
    netCache[key] = res; netKeys.push(key);
    if (netKeys.length > 24) delete netCache[netKeys.shift()];
    return res;
  }

  // the lines themselves, as seams on top of the fabric
  function netSeams(res) {
    var k = 340 / GRID;
    return res.lines.map(function (L) {
      if (L.length < 2) return '';
      var d = 'M' + L.map(function (q) { return (q[0] * k).toFixed(1) + ' ' + (q[1] * k).toFixed(1); }).join('L');
      return '<path d="' + d + '" fill="none" stroke="#3D4A2E" stroke-opacity="0.16" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + STITCH + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.55" stroke-linecap="round"/>';
    }).join('');
  }

  // After the lines change: keep the fabric already on the first patches,
  // give the new ones fabrics from the palette.
  function refit(d, keys) {
    var n = slots(d), old = [];
    for (var i = 0; i < (d.fab || '').length; i++) old.push(keyAt(d, i));
    keys = keys && keys.length ? keys : old;
    if (!keys.length) return;
    var out = '';
    d.cus = [];
    for (i = 0; i < n; i++) {
      var k = i < old.length ? old[i] : keys[(i - old.length) % keys.length];
      if (i >= old.length && keys.length > 1 && out.length && keyOf(d, B64.indexOf(out[out.length - 1])) === k) k = keys[(i - old.length + 1) % keys.length];
      out += letter(d, k) || B64[0];
    }
    d.fab = out;
    d.rot = (d.rot || '').slice(0, Math.min(n, old.length));   // the old patches keep their turn
    prune(d);
  }

  /* ---------- painted art (images/studio/vai/, tools/design-assets.py) ---------- */
  var VAI = 'images/studio/vai/';

  function toneOf(color) {
    var tone = 'trung';
    TONE_ORDER.forEach(function (t) { if (TONES[t].c.indexOf(color) >= 0) tone = t; });
    return tone;
  }

  function swatchSrc(id) {
    var f = fabric(id);
    return VAI + 'vai-' + f.tone + '-' + (KINDS.indexOf(f.kind) + 1) + '.webp';
  }

  // A painted swatch as an SVG pattern, laid side by side. Each swatch is
  // made to meet itself (tools/design-assets.py seamless()), so there is no
  // seam and no mirroring (mirrored copies folded checks into arrows).
  // deg: the fabric turned on the piece (a patch's turn, d.rot)
  function fabricPattern(id, pid, T, src, deg) {
    src = src || swatchSrc(id);
    return '<pattern id="' + pid + '" width="' + T + '" height="' + T + '" patternUnits="userSpaceOnUse"' +
      (deg ? ' patternTransform="rotate(' + deg + ')"' : '') + '>' +
      '<image href="' + src + '" width="' + T + '" height="' + T + '" preserveAspectRatio="none"/></pattern>';
  }

  // Pieces with a painting: the fabric is laid inside the piece's silhouette
  // (mask) and the painted linen's shading multiplies over it, so the cushion
  // puffs and the scrunchie gathers whatever fabric is on it.
  // box: where the fabric sits in the 340 square (printed by the tool);
  // c: the centre the petals turn round; band: the middle strip of "hai";
  // top: rings / clasps painted over the fabric;
  // seams: a painting quilted on lines of its own — [x of its two upright
  // seams, y of its two level ones], 0-100 (measured on the -bong picture)
  var ART = {
    cushion: { n: 'goi', seams: [[34.9, 64.9], [34, 62]] },
    coaster: { n: 'lotcoc' }, coasterSq: { n: 'lotcocv' }, scrunchie: { n: 'scrunchie' },
    // parts: pieces of their own on top of the body, one fabric each (340
    // square). The collar is traced off the painting's own lines (both flaps
    // and the back of the collar round the neck; Anna: "phần cắt đang không
    // được clean" with the 12-point polygon). over: drawn after the others —
    // the strap comes down in front of the back of the collar.
    shirt: { n: 'oxford', box: [47, 1, 292, 339], parts: [
      { id: 'co', d: 'M157 92L183 92L184 93L202 93L203 94L220 95L225 97L228 100L227 101L228 105L242 120L242 124L244 127L244 129L242 130L243 134L237 151L234 155L234 159L227 175L226 180L221 187L220 191L213 193L195 181L182 168L179 164L179 162L173 158L169 153L173 152L185 140L193 134L205 120L205 118L209 113L208 112L180 112L125 112L124 113L128 120L134 124L145 137L148 138L151 142L160 149L159 153L157 155L157 158L152 165L149 166L145 171L145 173L135 183L123 192L118 190L115 187L109 173L100 157L100 154L94 144L94 141L90 131L90 124L92 121L95 120L95 117L97 114L104 108L105 105L108 102L108 99L112 96L120 94L156 93Z' },
      { id: 'quai', over: 1, poly: [[146, 113], [146, 8], [152, 1], [184, 1], [190, 8], [190, 113]] }
    ] },
    // the six petals, traced off the painting: a rhombus each from the
    // middle (192.5, 199) to a corner of the hexagon, the outer sides bowed
    // a little as drawn; clockwise from the top left. body: where its fabric
    // goes — not the key ring (the fabric showed through the ring's shine)
    origami: { n: 'origami', top: 1, sang: 1, body: 'M0 80H92L100 60H340V340H0Z', petals: [
        'M192.5 199L187 129Q151.1 99 116 79Q115.4 123.1 123.5 172Z',
        'M192.5 199L264 157Q260.1 115.7 248 80Q216.8 99.6 187 129Z',
        'M192.5 199L275 235Q306 217.3 328 195Q300.2 173.2 264 157Z',
        'M192.5 199L197 284Q235.1 305.5 273 317Q278.6 278 275 235Z',
        'M192.5 199L117.5 248Q111.8 284.8 115 317Q156.1 305.5 197 284Z',
        'M192.5 199L123.5 172Q79.4 182.6 44 198Q76.3 225.2 117.5 248Z'
    ] },
    // the cord (stems, knot) in one fabric, each flower in its own, traced
    // off the painting's own lines with its open mouth inside it (Anna 22/10:
    // the cord's fabric showed in the flowers). One and two flowers are
    // drawings of their own (Anna 23/10: hiding flowers of the three left
    // the stems ragged, nothing is drawn behind a flower): lays
    bloom: { n: 'bloom', top: 1, buds: [
      { id: 'b1', d: 'M175 205L179 207L194 240L200 247L211 255L214 268L214 282L212 288L203 297L199 307L188 322L173 338L169 336L148 314L141 302L136 297L128 276L127 262L141 241L148 235L148 232L158 217L160 210L166 210Z' },
      { id: 'b2', d: 'M189 162L216 169L243 183L249 188L254 202L256 232L252 254L250 259L247 259L226 255L211 250L208 252L196 242L177 203L179 170Z' },
      { id: 'b3', d: 'M124 173L128 173L147 183L148 188L151 191L154 200L159 208L159 212L149 228L147 235L140 241L129 259L127 261L127 255L125 254L102 270L94 275L91 274L89 242L83 216L84 203L89 188L92 184L96 181L113 176L118 176Z' }
    ], lays: {
      hoa1: { n: 'bloom1', buds: [{ id: 'bong', d: 'M162 196L177 196L186 200L188 207L199 219L211 238L217 259L217 277L215 283L204 295L197 308L177 333L172 338L168 338L159 330L145 313L138 301L131 294L122 270L122 250L128 233L147 206L156 198Z' }] },
      hoa2: { n: 'bloom2', buds: [{ id: 'b3', d: 'M135 201L149 201L157 205L160 214L163 217L174 241L180 250L186 273L186 280L183 289L174 297L170 307L149 333L144 338L140 338L126 324L106 296L97 273L97 254L103 235L111 223L118 217L121 211Z' }, { id: 'b2', d: 'M176 164L178 166L205 172L229 185L236 191L242 212L242 242L240 254L236 266L221 263L195 257L185 252L185 265L181 250L174 240L173 234L170 231L165 220L166 217L164 214L161 199L161 187L165 183L169 172Z' }] }
    } },
    // the strap stands upright, its middle on x 170 (measured on the mask):
    // pieced across at y 120 (its middle), along it at x 170
    strap: { n: 'daydeo', top: 1, strap: { x: 170, y: 120 } },
    // the corner bookmark: a square back and a triangle flap that slips over
    // the corner of a page
    bookmark: { n: 'bookmark', diag: 1 },
    // bags (tools/bag-assets.py): box = the body, parts as SVG paths;
    // zip / snap: where an added zip runs and a snap sits (none drawn on a
    // bag without them: the order note still says so)
    tuino: { n: 'tuino', bag: 1, box: [20, 142, 320, 340],
      parts: [{ id: 'quai', d: 'M200 0L207 1L247 22L245 26L228 33L219 35L195 35L211 47L228 68L237 89L259 121L272 149L232 146L225 144L222 139L211 138L213 126L213 109L208 90L195 70L186 48L184 47L179 52L174 53L156 45L153 50L147 68L132 93L132 138L121 140L120 143L122 145L118 146L68 149L81 124L112 77L111 75L83 84L79 83L82 66L85 57L90 49L99 40L108 34L118 29L131 26L138 20L145 17L150 17L162 9L177 8L182 5Z' }, { id: 'lot', d: 'M128 139L132 139L132 143L136 147L161 154L185 154L195 152L208 147L211 144L211 139L223 140L224 142L219 146L208 155L204 162L195 168L183 173L170 174L150 169L140 162L127 147L120 143L121 141Z' }] },
    tuikhoa: { n: 'tuikhoa', bag: 1, box: [22, 161, 317, 340], snap: [170, 216],
      parts: [{ id: 'quai', d: 'M165 0L176 1L186 6L199 18L215 42L239 87L252 107L274 136L283 143L286 152L285 166L288 181L276 182L272 162L268 160L261 142L247 124L233 101L199 30L191 18L182 9L173 6L163 7L155 11L137 29L117 60L95 108L73 141L66 160L62 160L60 162L57 182L45 181L52 144L60 136L85 103L134 23L149 7Z' }, { id: 'tui', d: 'M106 222L233 222L233 296L170 323L105 295Z' }] },
    tuitamgiac: { n: 'tuitamgiac', bag: 1, box: [65, 149, 275, 338], zip: [[141, 203], [186, 203]], snap: [163, 210],
      parts: [{ id: 'quai', d: 'M153 0L156 0L159 3L163 13L169 36L180 94L181 97L186 99L188 102L190 119L202 148L187 149L190 198L187 202L183 200L175 103L164 39L158 15L157 12L155 14L154 20L145 94L144 165L141 193L145 200L141 202L134 200L134 149L123 148L123 146L130 128L137 99L137 91L140 85L142 60L148 30L150 6Z' }, { id: 'lot', d: 'M146 199L163 204L177 204L181 201L188 204L192 220L174 226L155 228L129 222L128 219L133 204L140 204Z' }, { id: 'giua', d: 'M191 221L193 224L196 243L199 281L205 324L205 336L185 331L164 338L132 339L122 338L122 308L125 281L128 222L144 227L162 229L176 227Z' }] },
    laptop: { n: 'laptop', bag: 1, box: [15, 74, 338, 222], snap: [170, 92],
      parts: [{ id: 'day', d: 'M15 222L337 222L339 250L336 259L330 266L325 268L28 268L19 263L14 253Z' }] },
    tuitote: { n: 'tuitote', bag: 1, box: [60, 127, 279, 340], zip: [[124, 137], [216, 137]], snap: [170, 150],
      parts: [{ id: 'quai', d: 'M166 0L182 2L193 8L201 15L213 32L223 58L230 88L234 131L236 133L236 166L216 166L216 128L212 127L211 94L204 54L200 43L191 27L182 18L174 15L170 13L158 18L149 27L141 41L136 54L129 88L127 127L123 128L123 166L103 166L103 133L105 131L109 91L115 64L123 40L131 25L144 10L158 2Z' }] },
    // styles: one set of pictures per way of tying it (mon-tuibuoc-<style>-*)
    tuibuoc: { n: 'tuibuoc', bag: 1, box: [74, 111, 266, 324], snap: [170, 182], styles: {
      no: { parts: [{ id: 'quai', d: 'M125 112L161 52L171 58L141 112ZM215 112L179 52L169 58L199 112ZM164 50L146 76L154 80L170 54ZM176 50L194 76L186 80L170 54ZM167.5 37.6L167.6 39.6L167.1 41.6L164.2 45.6L159.3 49.1L156.2 50.6L149.3 52.8L145.7 53.4L138.7 53.5L132.7 52.3L128.5 49.8L127.2 48.2L126.5 46.4L126.4 44.4L126.9 42.4L129.8 38.4L134.7 34.9L137.8 33.4L144.7 31.2L151.9 30.4L158.5 31L161.3 31.7L163.6 32.8L165.5 34.2L166.8 35.8ZM213.5 46.4L212.8 48.2L211.5 49.8L207.3 52.3L201.3 53.5L194.3 53.4L190.7 52.8L183.8 50.6L178 47.4L174.1 43.6L172.9 41.6L172.4 39.6L172.5 37.6L173.2 35.8L174.5 34.2L178.7 31.7L184.7 30.5L191.7 30.6L195.3 31.2L202.2 33.4L208 36.6L211.9 40.4L213.1 42.4L213.6 44.4ZM162 36L178 36L179 52L161 52Z' }] },
      thuong: { parts: [{ id: 'quai', d: 'M125 112L161 52L171 58L141 112ZM215 112L179 52L169 58L199 112ZM163 44L149 22L157 18L170 40ZM177 44L191 22L183 18L170 40ZM161 40L179 40L181 57L159 57Z' }] },
      xoan: { parts: [{ id: 'quai', d: 'M139 111.5L143.4 109.8L145.6 108.3L146.5 106.8L146.3 105.5L144.7 104.3L140.3 102.2L143.6 100.7L145.4 99.3L146 97.9L145.4 96.6L143.5 95.3L140.3 94.4L141.1 93.1L144 91.7L145.5 90.3L145.7 89L144.8 87.7L138.7 85.3L142.2 84.1L144.6 82.8L145.8 81.5L145.7 80.7L144.5 79.3L139.8 76.3L145.6 74.5L146.5 73.3L146.2 71.9L144.7 70.4L141.7 69.2L142.1 67.8L145.2 67L147.1 65.9L147.7 64.7L145.3 62.2L142 60.1L144.8 59.3L147.5 59.3L149.1 58.4L149.5 57.1L144.1 51.9L147.9 52.6L150.4 52.2L151.8 51.4L152 50L150.8 49L148.6 45.6L152 46.2L154.7 46.2L154.9 44.7L154.2 42.4L151.9 39.9L154.2 40.1L156.2 41.8L158.2 42L158.7 40.3L158.4 37.7L156.6 34L159.9 37L161.2 38.9L162.9 39.2L163.6 37.2L163.2 34.5L164.1 32.8L165.4 36L167.5 38.2L168.7 37.4L170.3 32.3L171 33.4L171.4 36.2L172.8 38.1L174.3 37.4L177.5 31.7L177 35.4L177.4 38.1L177.1 39.2L178.4 39.7L179.2 38.5L183.2 35.4L182.2 39.1L182.2 41.5L181.7 42.1L183 42.7L184.3 41.5L187.5 40.4L187.6 41L186.1 43.9L185.4 46.3L186.8 46.9L189.3 46.9L192.8 45.6L190.9 48.1L188.9 49.6L188.4 51.3L188.9 52.5L190.6 53.3L193 52.9L196.2 53.2L191.2 56.9L190.8 58.4L191.5 59.6L196.4 60.4L197 61.7L192.8 64.6L192.5 66L193.5 67.2L195.6 68.2L199.3 69L194.9 71.8L193.7 73.3L193.7 74.6L197.4 76.4L201.2 77.5L197.2 79.1L194.1 81.5L194.4 82.8L196 84.1L198.8 85.4L199.9 86.7L196.7 87.7L194.8 89L194.2 90.3L194.8 91.7L196.7 93.1L200 94.4L195.8 96.6L194.3 97.9L194 99.2L194.9 100.6L197.1 102.1L201.3 103.4L197.1 104.4L194.7 105.6L193.5 106.8L193.5 108.2L194.8 109.6L197.3 111.2L220.2 113.1L218.4 111.6L215 110L219.8 107.7L221.3 106.4L221.5 105.1L220.5 103.3L218.3 101.8L214.4 100.3L218.7 99.1L221 97.9L222 96.6L221.8 94.8L220.4 93.4L217.6 92L216.4 90.7L219.8 89.4L221.6 88.1L222.2 86.2L221.6 84.9L219.7 83.6L216.4 82.3L217.5 80.9L221.6 77.6L221.8 76.2L220.7 74.9L218.4 73.7L214.1 72.4L217.8 70.6L220 69L220.9 67.6L220.6 65.5L219 64.4L214 62.5L217.3 60.6L218.8 58.3L219.2 56.8L218.4 55.6L212.9 53.5L213 52.1L215.4 50L216.3 47.5L216.2 46.1L212.2 43.8L208.1 44.1L212.1 39.5L212.1 36.8L211.5 35.7L209.2 34.2L203.3 34.7L206 28.5L205.8 26.9L203.8 25.2L198 25.8L196.8 25.1L196.9 19L196 17.9L193.4 17.1L187.6 20.3L187.3 17.7L185.3 12.7L182.9 11.9L178.6 14.5L176.6 17.7L174.1 11.2L171.8 10.1L169.5 10.3L166.3 14.8L165.1 15.9L160.9 11.5L158.4 11.4L157.2 12.4L155.5 14.9L155.4 18.5L152.8 18L150.5 16.1L147.5 16L146.2 16.5L144.6 18.8L144.8 21.4L146.3 25.7L139.5 22.9L136.9 24L136.1 25.1L135.5 27.9L136.8 30.6L137.3 32.7L130.9 32.6L129.6 33.4L128.9 35.8L131.7 41.1L130.5 42.1L127.3 42.1L125.4 42.8L124.3 44.8L124.7 46.4L129.4 51.4L123.2 52.4L121.5 54.2L121.3 55.5L122.2 57.1L126.5 61.2L122.7 62L120.4 63L119.4 64.2L119.7 65.6L121.1 67.8L123.9 69.4L123.8 70.8L120.6 71.8L118.8 73.6L118.3 74.9L119 76.3L120.9 77.7L124.5 79.3L119.3 82.2L118 83.5L117.9 84.8L121.5 88L124.8 89.3L120.9 90.7L118.8 92.1L117.9 93.4L118.2 94.8L119.8 96.5L122.8 97.7L123.5 99L120.4 100.5L118.7 102L118.3 103.3L119.1 105.1L121.1 106.2L124.6 107.3L123 108.8L120.5 110.3L119.2 111.8L119.1 113.1ZM141.5 119.1L140.1 121.1L137.9 122.6L135.2 123.2L130.6 122.6L127.9 121.1L125.7 119.1L124.5 116.6L124.3 114.1L125.1 111.8L126.9 110L130.8 108.8L133.9 109L136.8 110.1L140.3 112.9L141.5 115.4L141.7 117.9ZM215.5 112.9L215.8 115.4L214.3 119.1L212.1 121.1L209.4 122.6L206.4 123.2L203.4 123L200.9 122L199.1 120.2L198.5 119.1L198.2 116.6L199 114.1L200.7 111.8L203.2 110.1L206.1 109L210.6 109L213.1 110L214.9 111.8Z' }] },
      ren: { parts: [{ id: 'quai', d: 'M125 112L161 52L171 58L141 112ZM215 112L179 52L169 58L199 112ZM163 44L149 22L157 18L170 40ZM177 44L191 22L183 18L170 40ZM161 40L179 40L181 57L159 57Z' }], top: 1 }
    } },
    laptopq: { n: 'laptopq', bag: 1, box: [15, 100, 338, 252], snap: [170, 118],
      parts: [{ id: 'quai', d: 'M170 37L184 38L199 42L211 47L232 60L259 81L263 103L241 103L243 99L239 93L238 84L214 65L203 58L186 51L168 50L146 55L104 80L101 84L100 92L95 100L98 103L77 103L75 100L78 92L77 84L82 77L127 49L150 40Z' }, { id: 'day', d: 'M17 252L337 252L339 263L339 283L336 291L331 297L321 301L33 302L23 298L16 288L15 266Z' }] }
  };
  var SEAM = '" stroke="' + STITCH + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.4" fill="none"/>';
  var SANG = 0.22;   // how strongly the light layer (ART sang) lifts the lit faces

  // The cushion is painted quilted 3 x 3, its seams not quite on the thirds
  // (the lower one sits well above two thirds). A layout drawn on thirds is
  // bent onto those seams, so the patches meet in the painted dips instead
  // of beside them. Returns the point mapping, or null when there is no fit.
  function onSeams(A, layout, grid) {
    if (!A.seams || !(layout === 'sao' || (layout === 'vuong' && grid === 3))) return null;
    var t = 100 / 3;
    var bend = function (v, s) {
      return v <= t ? v / t * s[0] : v <= 2 * t ? s[0] + (v - t) / t * (s[1] - s[0]) : s[1] + (v - 2 * t) / t * (100 - s[1]);
    };
    return function (q) { return [bend(q[0], A.seams[0]), bend(q[1], A.seams[1])]; };
  }

  // [x, y, w, h] round points / round the numbers of a path
  function bboxOf(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    return x1 < x0 ? [0, 0, 340, 340] : [x0, y0, x1 - x0, y1 - y0];
  }
  function bboxOfPath(pd) {
    var n = (pd.match(/-?\d+(\.\d+)?/g) || []).map(Number), pts = [];
    for (var i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    return bboxOf(pts);
  }
  var FULL = [0, 0, 340, 340];
  function polyPath(pts) { return 'M' + pts.map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + 'Z'; }

  // The drawing for this design: a piece drawn again for some layouts (the
  // Bloom with one / two flowers) takes that drawing and its own flowers
  function artOf(d) {
    var A = ART[PRODUCTS[d.product].shape] || {}, L = A.lays && A.lays[d.layout];
    return L ? Object.assign({}, A, L) : A;
  }

  // The parts on top of the main piecing, for this design: [{id, poly}]
  function partsOf(d) {
    if (d.layout === 'tuve') return [];
    var A = artOf(d);
    if (A.styles) return A.styles[tieOf(d)].parts;
    if (A.parts) return A.parts;
    if (A.buds) return A.buds;
    if (A.petals && d.layout !== 'mot') return A.petals.map(function (pd, i) { return { id: 'c' + (i + 1), d: pd }; });
    return [];
  }

  // One painted piece: the fabric inside its silhouette, the painting's
  // shading over it. f(i, bbox) gives patch i's fill.
  function artBody(d, p, f, pre) {
    var A = artOf(d), name = A.n, out = '';
    // a piece drawn several ways (the tie bag): that way's pictures
    var st = A.styles ? A.styles[tieOf(d)] : null;
    if (st) { name = A.n + '-' + tieOf(d); A = Object.assign({}, A, { top: st.top }); }
    out += '<mask id="' + pre + 'mk" maskUnits="userSpaceOnUse" x="0" y="0" width="340" height="340">' +
      '<image href="' + VAI + 'mon-' + name + '-mask.webp" width="340" height="340"/></mask>';
    out += '<g mask="url(#' + pre + 'mk)">';
    var box = [0, 0, 340];
    if (d.layout === 'net') {
      var nr = netRegions(d.sketch);
      nr.paths.forEach(function (pd, i) { out += '<path d="' + pd + '" fill="' + f(i, bboxOfPath(pd)) + '"/>'; });
      out += netSeams(nr);
    } else if (d.layout === 'tuve') {
      // drawn on a fabric picked from the basket (or plain paper); the
      // eraser paints that fabric back
      var bg = d.fab ? f(0, FULL) : '#FBF6EE', bgPaint = bg.split('"')[0];
      out += '<rect width="340" height="340" fill="' + bg + '"/>' +
        sketchPaths(d.sketch, box[0], box[1], box[2]).split('stroke="' + INKS[ERASER] + '"').join('stroke="' + bgPaint + '"');
    } else if (p.shape === 'scrunchie') {
      if (d.layout === 'hai') {
        for (var w = 0; w < 12; w++) {
          var a0 = w * 30 * Math.PI / 180, a1 = (w + 1) * 30 * Math.PI / 180;
          var wp = [[170, 170], [170 + 220 * Math.cos(a0), 170 + 220 * Math.sin(a0)], [170 + 220 * Math.cos(a1), 170 + 220 * Math.sin(a1)]];
          out += '<path class="pt-cut" d="M170 170L' + wp[1][0].toFixed(1) + ' ' + wp[1][1].toFixed(1) +
            'L' + wp[2][0].toFixed(1) + ' ' + wp[2][1].toFixed(1) + 'Z" fill="' + f(w % 2, bboxOf(wp)) + '"/>';
        }
      } else out += '<rect width="340" height="340" fill="' + f(0, FULL) + '"/>';
    } else if (d.layout === 'mot' || A.buds || A.petals) {
      // one fabric over the whole piece (the charm: the cord's fabric, the
      // flowers go on top; the origami: its base, the petals on top)
      var bb0 = A.box ? [A.box[0], A.box[1], A.box[2] - A.box[0], A.box[3] - A.box[1]] : FULL;
      out += A.body ? '<path d="' + A.body + '" fill="' + f(0, bb0) + '"/>' : '<rect width="340" height="340" fill="' + f(0, bb0) + '"/>';
    } else if (d.layout === 'hai' && A.bag) {
      // a bag: top and bottom of the body, the seam a little below halfway
      var cut = Math.round(A.box[1] + (A.box[3] - A.box[1]) * 0.56);
      out += '<rect width="340" height="' + cut + '" fill="' + f(0, [A.box[0], A.box[1], A.box[2] - A.box[0], cut - A.box[1]]) + '"/>' +
        '<rect y="' + cut + '" width="340" height="' + (340 - cut) + '" fill="' + f(1, [A.box[0], cut, A.box[2] - A.box[0], A.box[3] - cut]) + '"/>' +
        '<path d="M0 ' + cut + 'H340' + SEAM;
    } else if (A.strap && d.layout === 'ngang') {
      // the strap: top half and bottom half
      var sy = A.strap.y;
      out += '<rect width="340" height="' + sy + '" fill="' + f(0, [0, 0, 340, sy]) + '"/>' +
        '<rect y="' + sy + '" width="340" height="' + (340 - sy) + '" fill="' + f(1, [0, sy, 340, 340 - sy]) + '"/>' +
        '<path d="M0 ' + sy + 'H340' + SEAM;
    } else if (A.strap && d.layout === 'doc') {
      // the strap: two strips along it, the seam down the middle
      var sx = A.strap.x;
      out += '<rect width="' + sx + '" height="340" fill="' + f(0, [0, 0, sx, 340]) + '"/>' +
        '<rect x="' + sx + '" width="' + (340 - sx) + '" height="340" fill="' + f(1, [sx, 0, 340 - sx, 340]) + '"/>' +
        '<path d="M' + sx + ' 0V340' + SEAM;
    } else if (d.layout === 'hai' && A.diag) {
      // the bookmark: the square back (0) and the triangle flap (1)
      out += '<path d="M0 0L0 340L340 340Z" fill="' + f(0, FULL) + '"/><path d="M0 0L340 0L340 340Z" fill="' + f(1, FULL) + '"/>' +
        '<path d="M0 0L340 340' + SEAM;
    } else if (d.layout === 'hai') {
      // left and right halves (a shirt's placket)
      out += '<rect width="170" height="340" fill="' + f(0, [0, 0, 170, 340]) + '"/><rect x="170" width="170" height="340" fill="' + f(1, [170, 0, 170, 340]) + '"/>' +
        '<path d="M170 0V340' + SEAM;
    } else {
      var bx = A.box || [0, 0, 340, 340], sx = (bx[2] - bx[0]) / 100, sy = (bx[3] - bx[1]) / 100;
      var bend = onSeams(A, d.layout, p.grid);
      patches(d.layout, p.grid).forEach(function (pt, n) {
        var i = d.layout === 'sao' || d.layout === 'chong' ? pt.i : n;
        var pts = (bend ? pt.pts.map(bend) : pt.pts).map(function (q) { return [bx[0] + q[0] * sx, bx[1] + q[1] * sy]; });
        out += '<path d="M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') +
          'Z" fill="' + f(i, bboxOf(pts)) + '" stroke="' + STITCH + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.4" stroke-linejoin="round"/>';
      });
    }
    // a quilted bag: diamonds stitched over the body, each a little puffed
    if (A.bag && d.ext && d.ext.q && d.layout !== 'tuve') out += quilting(A, pre);
    // a zip / a snap the customer added (drawn where the bag has a place)
    if (A.bag && d.ext && d.ext.z && A.zip) out += zipLine(A.zip);
    // the pieces of their own (collar, strap, flowers): back to front, the
    // ones marked "over" last (their number stays their place in the list)
    var parts = partsOf(d), base = f.used() + 1, order = [];
    // the origami's petals: one fabric for all ("canh"), two in turn ("xen"),
    // or each its own ("moi")
    var slotOf = function (j) { return base + (A.petals ? (d.layout === 'canh' ? 0 : d.layout === 'xen' ? j % 2 : j) : j); };
    for (var j = parts.length - 1; j >= 0; j--) if (!parts[j].over) order.push(j);
    parts.forEach(function (q, j) { if (q.over) order.push(j); });
    order.forEach(function (j) {
      var pd = parts[j].d || polyPath(parts[j].poly);
      out += '<path d="' + pd + '" fill="' + f(slotOf(j), parts[j].d ? bboxOfPath(pd) : bboxOf(parts[j].poly)) +
        '" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="5 5" stroke-opacity="0.35" stroke-linejoin="round"/>';
    });
    out += '</g>';
    // photos of real fabric already carry their own light: a lighter shading
    // over them, or they come out dull (painted swatches are flat and bright)
    var photo = (d.cus || []).some(function (c) { return c.r != null; }) || (!d.fab && hasReal());
    out += '<image href="' + VAI + 'mon-' + name + '-bong.webp" width="340" height="340" style="mix-blend-mode:multiply" opacity="' +
      (photo ? 0.6 : 0.8) + '" pointer-events="none"/>';
    // the shading only darkens, so on a dark fabric the folds were lost
    // (Anna: "vải che luôn nếp gấp origami"): the lit faces of the folds
    // screened over it lift them on any fabric (tools/design-assets.py light)
    if (A.sang) out += '<image href="' + VAI + 'mon-' + name + '-sang.webp" width="340" height="340" mask="url(#' + pre + 'mk)"' +
      ' style="mix-blend-mode:screen" opacity="' + SANG + '" pointer-events="none"/>';
    if (A.top) out += '<image href="' + VAI + 'mon-' + name + '-top.webp" width="340" height="340" pointer-events="none"/>';
    if (A.bag && d.ext && d.ext.n && A.snap) out += snapDot(A.snap);
    return out;
  }

  // Quilting: a diamond grid of stitches over the bag's body box, each
  // diamond lit in the middle (padding under it).
  function quilting(A, pre) {
    var b = A.box, id = pre + 'qd';
    return '<defs><radialGradient id="' + id + 'g"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/>' +
      '<stop offset="1" stop-color="#3D4A2E" stop-opacity="0.16"/></radialGradient>' +
      '<pattern id="' + id + '" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45 170 170)">' +
      '<rect width="26" height="26" fill="url(#' + id + 'g)"/>' +
      '<path d="M0 0.6H26M0.6 0V26" stroke="' + STITCH + '" stroke-width="1.3" stroke-dasharray="3 2.4" stroke-opacity="0.6" fill="none"/>' +
      '</pattern></defs><rect x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) +
      '" fill="url(#' + id + ')" pointer-events="none"/>';
  }
  function zipLine(z) {
    var a = z[0], b = z[1];
    return '<g pointer-events="none"><path d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + '" stroke="#5C5448" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + '" stroke="#CFC4A8" stroke-width="2.4" stroke-dasharray="1 1.4"/>' +
      '<rect x="' + (b[0] - 9) + '" y="' + (b[1] - 1) + '" width="5" height="13" rx="2" fill="#CFC4A8" stroke="#7A6E58" stroke-width="0.8"/></g>';
  }
  // A stitch's icon, sewn left to right as on the machine's pattern dial,
  // in a 44 × 16 box: the satin ones (leaves, scallops, triangles) filled.
  function stitchIcon(k) {
    var id = (STITCHES[k - 1] || STITCHES[0]).id, d = '', fill = '', x;
    if (id === 'zic') {
      d = 'M0 3';
      for (x = 5.5; x <= 44; x += 5.5) d += 'L' + x + ' ' + ((x / 5.5) % 2 ? 13 : 3);
    } else if (id === 'long') {
      for (x = 1; x < 40; x += 8) d += 'M' + x + ' 2L' + (x + 6) + ' 8L' + x + ' 14';
      d += 'M0 8H44';
    } else if (id === 'song') {
      d = 'M0 8Q5.5 0 11 8T22 8T33 8T44 8';
    } else if (id === 'la') {
      d = 'M0 9Q11 4 22 9T44 9';
      for (x = 4; x < 40; x += 11) {
        var up = (x - 4) / 11 % 2 ? 1 : -1;
        fill += 'M' + x + ' ' + (9 - up) + 'Q' + (x + 2) + ' ' + (9 + 7 * up) + ' ' + (x + 7) + ' ' + (9 + 6 * up) + 'Q' + (x + 5) + ' ' + (9 + 2 * up) + ' ' + x + ' ' + (9 - up) + 'Z';
      }
    } else if (id === 'thoi') {
      for (x = 0; x < 44; x += 11) d += 'M' + x + ' 8L' + (x + 5.5) + ' 2L' + (x + 11) + ' 8L' + (x + 5.5) + ' 14Z';
    } else if (id === 'x') {
      for (x = 1; x < 40; x += 11) d += 'M' + x + ' 3L' + (x + 9) + ' 13M' + (x + 9) + ' 3L' + x + ' 13';
    } else if (id === 'vo') {
      for (x = 0; x < 44; x += 11) fill += 'M' + x + ' 12A5.5 5.5 0 0 1 ' + (x + 11) + ' 12Z';
    } else if (id === 'rang') {
      for (x = 0; x < 44; x += 11) fill += 'M' + x + ' 13L' + (x + 5.5) + ' 3L' + (x + 11) + ' 13Z';
    } else {
      d = 'M0 12';
      for (x = 0; x < 42; x += 14) d += 'V4H' + (x + 7) + 'V12H' + Math.min(44, x + 14);
    }
    return '<g class="pt-stitch" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      (d ? '<path d="' + d + '" fill="none"/>' : '') + (fill ? '<path d="' + fill + '" fill="currentColor"/>' : '') + '</g>';
  }
  function snapDot(c) {
    return '<g pointer-events="none"><circle cx="' + c[0] + '" cy="' + c[1] + '" r="5.5" fill="' + METAL + '" stroke="#6F6A60" stroke-width="1"/>' +
      '<circle cx="' + (c[0] - 1.5) + '" cy="' + (c[1] - 1.5) + '" r="1.8" fill="#fff" fill-opacity="0.6"/></g>';
  }

  // The piece's silhouette: its mask picture, and where it is drawn. Taps
  // outside it are beside the piece, even where a patch runs on under the
  // mask (the round coaster's corners).
  function silhouette(d) {
    var p = PRODUCTS[d.product], A = p && ART[p.shape] && artOf(d);
    if (!A) return null;
    var t = A.styles && A.styles[tieOf(d)] ? tieOf(d) : null;
    return { src: VAI + 'mon-' + (t ? A.n + '-' + t : A.n) + '-mask.webp', dx: [0] };
  }

  function artPiece(d, p, fill, pre) {
    // which patch numbers this drawing used (parts come after them)
    var used = -1;
    var f = function (i, bb) { if (i > used) used = i; return fill(i, bb); };
    f.used = function () { return used; };
    return artBody(d, p, f, pre);
  }


  function svg(spec, opts) {
    opts = opts || {};
    var d = typeof spec === 'string' ? parse(spec) : spec;
    if (!d) return '';
    var p = PRODUCTS[d.product];
    var pre = 'gp' + (++uid) + '-';
    var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    var title = opts.title ? '<title>' + opts.title + '</title>' : '';
    var pick = fabricsFor(d);
    var defs = {}, defsOut = '';
    var maxI = -1;
    // a real fabric: its photo; not known (yet): a plain of its family,
    // and the list is fetched (gem:fabric redraws)
    // A real fabric: its big photo laid on at the piece's real scale, one
    // copy per patch placed so the patch sits inside it (no tile, no seam,
    // no mirror) and each patch shows its own part of the cloth. A fabric
    // not known (yet): a plain of its family, and the list is fetched.
    // a bigger size: the same cloth looks smaller on it
    var unit = 340 / ((p.span || 40) * sizeScale(d)), np = 0;
    // deg: the patch's fabric turned; the photo then turns round the
    // patch's middle and is big enough to cover it at that angle
    var realFill = function (rid, slot, bb, deg) {
      var rf = REAL[rid];
      if (!rf || !rf.src) {
        var fid0 = pre + 'r' + rid + (deg ? 'o' + deg : '');
        if (!defs[fid0]) {
          defs[fid0] = 1;
          defsOut += fabricPattern(fabricId(rf ? rf.tone : 'trung', 'tron'), fid0, 110, null, deg);
          if (!rf) loadReal();
        }
        return 'url(#' + fid0 + ')';
      }
      bb = bb || FULL;
      var cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2, box = bb;
      if (deg) { var dg = Math.sqrt(bb[2] * bb[2] + bb[3] * bb[3]); box = [cx - dg / 2, cy - dg / 2, dg, dg]; }
      var big = rf.photo || rf.src, W = Math.max(SWATCH_CM * (rf.photo ? rf.k : 1) * unit, box[2], box[3]);
      var h = Math.abs(Math.sin(rid * 12.9898 + slot * 78.233 + bb[0] * 0.37 + bb[1] * 0.71) * 43758.5453);
      var fx = h - Math.floor(h), fy = (h * 7.13) - Math.floor(h * 7.13);
      var id = pre + 'r' + rid + 'p' + (++np), Wt = W.toFixed(1);
      // the big photo not here yet: the swatch under it (the basket showed
      // it already), at its size and in the middle where it sits in the
      // photo, so the patch has its fabric at once; the photo covers it
      var under = '';
      if (rf.photo && PHOTO_IN[rf.photo] !== 2) {
        warmPhoto(rf.photo);
        var S = (W / rf.k).toFixed(1), off = ((W - W / rf.k) / 2).toFixed(1);
        defsOut += '<pattern id="' + id + 's" patternUnits="userSpaceOnUse" x="' + off + '" y="' + off + '" width="' + S + '" height="' + S + '">' +
          '<image href="' + rf.src + '" width="' + S + '" height="' + S + '" preserveAspectRatio="none"/></pattern>';
        under = '<rect width="' + Wt + '" height="' + Wt + '" fill="url(#' + id + 's)"/>';
      }
      defsOut += '<pattern id="' + id + '" patternUnits="userSpaceOnUse" x="' + (box[0] - (W - box[2]) * fx).toFixed(1) +
        '" y="' + (box[1] - (W - box[3]) * fy).toFixed(1) + '" width="' + Wt + '" height="' + Wt + '"' +
        (deg ? ' patternTransform="rotate(' + deg + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"' : '') + '>' + under +
        '<image href="' + big + '" width="' + Wt + '" height="' + Wt + '" preserveAspectRatio="none"/></pattern>';
      return 'url(#' + id + ')';
    };
    var fill = function (i, bb) {
      if (i > maxI) maxI = i;
      var f, deg = rotAt(d, i) * TURN_STEP, turned = deg ? 'o' + deg : '';
      if (d.fab && i < d.fab.length) {
        var ix = B64.indexOf(d.fab[i]);
        if (ix >= N_FABRICS && d.cus[ix - N_FABRICS] && d.cus[ix - N_FABRICS].r != null) {
          return realFill(d.cus[ix - N_FABRICS].r, i, bb, deg) + (opts.hit ? '" data-i="' + i : '');
        }
        if (ix >= N_FABRICS && d.cus[ix - N_FABRICS]) {
          // the customer's own colour: the recoloured painting once it is
          // ready (gem:fabric), a drawn print of that colour until then
          var c = d.cus[ix - N_FABRICS], cid = pre + 'c' + c.k + c.hex + turned;
          if (!defs[cid]) {
            defs[cid] = 1;
            var csrc = customSrc(c.k, c.hex);
            if (csrc) defsOut += fabricPattern(null, cid, 110, csrc, deg);
            else {
              var cb = printBody(KINDS[c.k], '#' + c.hex);
              defsOut += '<pattern id="' + cid + '" width="' + cb.size + '" height="' + cb.size + '" patternUnits="userSpaceOnUse"' +
                (deg ? ' patternTransform="rotate(' + deg + ')"' : '') + '>' + cb.body + '</pattern>';
            }
          }
          return 'url(#' + cid + ')' + (opts.hit ? '" data-i="' + i : '');
        }
        var fb = fabric(ix);
        f = { color: fb.color, print: fb.kind };
      } else {
        f = pick(i);
        // "Gem picks": the preview shows real fabrics of those families too
        var near = hasReal() && nearReal(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron');
        if (near) return realFill(+near.slice(1), i, bb) + (opts.hit ? '" data-i="' + i : '');
      }
      // the painted swatch for this colour family + kind
      var fid = fabricId(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron');
      var id = pre + 'f' + fid + turned;
      if (!defs[id]) {
        defs[id] = 1;
        defsOut += fabricPattern(fid, id, 110, null, deg);
      }
      // opts.hit: every patch says which fabric slot it is (the designer
      // lets people tap a patch to change its fabric)
      return 'url(#' + id + ')' + (opts.hit ? '" data-i="' + i : '');
    };
    var body = '';

    if (ART[p.shape]) {
      body += artPiece(d, p, fill, pre);
    } else if (SHAPES[p.shape]) {
      body += SHAPES[p.shape](d, p, fill, pre);
    } else if (p.shape === 'scrunchie') {
      var pts = [];
      for (var a = 0; a <= 360; a += 10) {
        var r = a % 20 === 0 ? 150 : 138, rad = a * Math.PI / 180;
        pts.push((170 + r * Math.cos(rad)).toFixed(1) + ',' + (170 + r * Math.sin(rad)).toFixed(1));
      }
      body += '<clipPath id="' + pre + 'ring"><polygon points="' + pts.join(' ') + '"/></clipPath>';
      body += '<g clip-path="url(#' + pre + 'ring)">';
      if (d.layout === 'tuve') {
        body += '<rect width="340" height="340" fill="#FBF6EE"/>' + sketchPaths(d.sketch, 20, 20, 300);
      } else if (d.layout === 'hai') {
        for (var w = 0; w < 12; w++) {
          var a0 = w * 30 * Math.PI / 180, a1 = (w + 1) * 30 * Math.PI / 180;
          body += '<path d="M170 170L' + (170 + 200 * Math.cos(a0)).toFixed(1) + ' ' + (170 + 200 * Math.sin(a0)).toFixed(1) +
            'L' + (170 + 200 * Math.cos(a1)).toFixed(1) + ' ' + (170 + 200 * Math.sin(a1)).toFixed(1) + 'Z" fill="' + fill(w % 2) + '"/>';
        }
      } else {
        body += '<rect width="340" height="340" fill="' + fill(0) + '"/>';
      }
      body += '<rect width="340" height="340" fill="url(#' + pre + 'puff)"/>';
      for (var f2 = 0; f2 < 360; f2 += 20) {
        var rb = f2 * Math.PI / 180;
        body += '<path d="M' + (170 + 66 * Math.cos(rb)).toFixed(1) + ' ' + (170 + 66 * Math.sin(rb)).toFixed(1) +
          ' L' + (170 + 140 * Math.cos(rb)).toFixed(1) + ' ' + (170 + 140 * Math.sin(rb)).toFixed(1) +
          '" stroke="#3D4A2E" stroke-opacity="0.16" stroke-width="2.5" stroke-linecap="round"/>';
      }
      body += '</g><polygon points="' + pts.join(' ') + '" fill="none" stroke="' + STITCH + '" stroke-width="2"/>' +
        '<circle cx="170" cy="170" r="58" fill="#FBF6EE" stroke="' + STITCH + '" stroke-width="2"/>';
    } else {
      var pad = p.shape === 'cushion' ? 26 : 34, inner = 340 - pad * 2, rx = p.shape === 'cushion' ? 34 : 22;
      body += '<rect x="' + (pad - 12) + '" y="' + (pad - 12) + '" width="' + (inner + 24) + '" height="' + (inner + 24) +
        '" rx="' + (rx + 8) + '" fill="' + (p.shape === 'cushion' ? C.be : C.kraft) + '" stroke="' + STITCH + '" stroke-width="2"/>';
      body += '<clipPath id="' + pre + 'clip"><rect x="' + pad + '" y="' + pad + '" width="' + inner +
        '" height="' + inner + '" rx="' + rx + '"/></clipPath><g clip-path="url(#' + pre + 'clip)">';
      if (d.layout === 'tuve') {
        body += '<rect x="' + pad + '" y="' + pad + '" width="' + inner + '" height="' + inner + '" fill="#FBF6EE"/>' +
          sketchPaths(d.sketch, pad, pad, inner);
      } else {
        var sc = inner / 100;
        patches(d.layout, p.grid).forEach(function (pt, n) {
          var i = d.layout === 'sao' || d.layout === 'chong' ? pt.i : n;
          body += '<path d="' + pathOf(pt.pts, pad, pad, sc) + '" fill="' + fill(i) + '" stroke="' + STITCH +
            '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.4" stroke-linejoin="round"/>';
        });
        body += '<rect x="' + pad + '" y="' + pad + '" width="' + inner + '" height="' + inner + '" fill="url(#' + pre + 'puff)"/>';
      }
      body += '</g><rect x="' + (pad + 7) + '" y="' + (pad + 7) + '" width="' + (inner - 14) + '" height="' + (inner - 14) +
        '" rx="' + (rx - 6) + '" fill="none" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="5 5"/>';
    }

    if (opts.count) return d.layout === 'tuve' ? (ART[p.shape] ? 1 : 0) : maxI + 1;
    // the seams, so "May xong" can sew them
    if (opts.hit) body = body.replace(/ stroke-dasharray=/g, ' class="pt-seam" stroke-dasharray=');

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340"' + size + ' role="img">' + title +
      '<defs>' + defsOut +
      '<radialGradient id="' + pre + 'puff" cx="45%" cy="40%" r="70%">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0.22"/>' +
        '<stop offset="1" stop-color="#3D4A2E" stop-opacity="0.16"/>' +
      '</radialGradient></defs>' + body + '</svg>';
  }

  // Little swatches for the chips.
  function toneDot(id, px) {
    px = px || 22;
    var c = TONES[id].c;
    return '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" aria-hidden="true">' +
      '<path d="M12 12L12 1A11 11 0 0 1 21.5 17.5Z" fill="' + c[0] + '"/>' +
      '<path d="M12 12L21.5 17.5A11 11 0 0 1 2.5 17.5Z" fill="' + c[1] + '"/>' +
      '<path d="M12 12L2.5 17.5A11 11 0 0 1 12 1Z" fill="' + c[2] + '"/>' +
      '<circle cx="12" cy="12" r="11" fill="none" stroke="' + STITCH + '" stroke-width="1"/></svg>';
  }

  function printDot(id, px) {
    px = px || 22;
    var pre = 'gs' + (++uid);
    var b = printBody(id, id === 'ren' ? C.kem : C.be);
    return '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" aria-hidden="true"><defs>' +
      '<pattern id="' + pre + '" width="' + b.size + '" height="' + b.size + '" patternUnits="userSpaceOnUse"' +
      ' patternTransform="scale(0.7)">' + b.body + '</pattern></defs>' +
      '<circle cx="12" cy="12" r="11" fill="url(#' + pre + ')" stroke="' + STITCH + '" stroke-width="1"/></svg>';
  }

  // How many fabric slots a design has (0 for "from my drawing").
  function slots(d) { return svg(d, { count: true }); }

  /* ---------- fabric keys ----------
     A fabric is a key: a number 0..44 (the painted catalogue), a string
     "c<kind><rrggbb>" (one of the 9 kinds recoloured to the customer's own
     colour) or "r<id>" (a real fabric from Kho vải). On a design a patch
     holds one B64 letter: the number itself, or 45 + the key's place in
     d.cus ({k, hex} for a colour, {r} for a real fabric). */
  function isCustom(key) { return typeof key === 'string' && /^c[0-8][0-9a-f]{6}$/.test(key); }

  function keyOf(d, ix) {
    if (ix < N_FABRICS) return ix;
    var c = d.cus[ix - N_FABRICS];
    return !c ? 0 : c.r != null ? 'r' + c.r : 'c' + c.k + c.hex;
  }
  function keyAt(d, i) { return d.fab && i < d.fab.length ? keyOf(d, B64.indexOf(d.fab[i])) : null; }

  // The letter for a key on this design (adds the colour to d.cus if new).
  function letter(d, key) {
    if (typeof key === 'number') return key >= 0 && key < N_FABRICS ? B64[key] : null;
    d.cus = d.cus || [];
    var n;
    if (isReal(key)) {
      var rid = +key.slice(1);
      for (n = 0; n < d.cus.length; n++) if (d.cus[n].r === rid) return B64[N_FABRICS + n];
      if (d.cus.length >= MAX_CUSTOM) return null;
      d.cus.push({ r: rid });
      return B64[N_FABRICS + d.cus.length - 1];
    }
    if (!isCustom(key)) return null;
    var k = +key[1], hex = key.slice(2);
    for (n = 0; n < d.cus.length; n++) if (d.cus[n].r == null && d.cus[n].k === k && d.cus[n].hex === hex) return B64[N_FABRICS + n];
    if (d.cus.length >= MAX_CUSTOM) return null;
    d.cus.push({ k: k, hex: hex });
    return B64[N_FABRICS + d.cus.length - 1];
  }

  // Drop colours no patch uses any more, renumbering the letters.
  function prune(d) {
    if (!d.cus || !d.cus.length) return;
    var keep = [], map = {};
    for (var i = 0; i < (d.fab || '').length; i++) {
      var ix = B64.indexOf(d.fab[i]);
      if (ix >= N_FABRICS && !(ix in map)) { map[ix] = N_FABRICS + keep.length; keep.push(d.cus[ix - N_FABRICS]); }
    }
    d.fab = (d.fab || '').split('').map(function (ch) {
      var ix = B64.indexOf(ch);
      return ix >= N_FABRICS ? B64[map[ix]] : ch;
    }).join('');
    d.cus = keep;
  }

  // What a key is, for names and colour families.
  function hexRgb(hex) { var n = parseInt(hex, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function nearestTone(hex) {
    var rgb = hexRgb(hex), best = 'trung', bd = 1e9;
    TONE_ORDER.forEach(function (t) {
      TONES[t].c.forEach(function (c) {
        var q = hexRgb(c.slice(1)), dd = Math.pow(q[0] - rgb[0], 2) + Math.pow(q[1] - rgb[1], 2) + Math.pow(q[2] - rgb[2], 2);
        if (dd < bd) { bd = dd; best = t; }
      });
    });
    return best;
  }
  function info(d, ix) {
    var key = keyOf(d, ix);
    if (typeof key === 'number') { var f = fabric(key); return { tone: f.tone, kind: f.kind, custom: false }; }
    if (isReal(key)) { var rf = realOf(key); return { tone: rf ? rf.tone : 'trung', kind: rf ? rf.kind : 'tron', custom: false, real: true }; }
    return { tone: nearestTone(key.slice(2)), kind: KINDS[+key[1]], custom: true, hex: key.slice(2) };
  }
  function keyName(key, l) {
    l = l || lang();
    if (typeof key === 'number') { var f = fabric(key); return KIND_NAMES[f.kind][l] + ' ' + TONES[f.tone][l].toLowerCase(); }
    if (isReal(key)) { var rf = realOf(key); return rf ? rf[l] : (l === 'vi' ? 'Vải #' : 'Fabric #') + key.slice(1); }
    return KIND_NAMES[KINDS[+key[1]]][l] + (l === 'vi' ? ' màu riêng #' : ' own colour #') + key.slice(2);
  }

  // Put fabrics from a palette (keys) on every patch: neighbours differ when
  // the palette allows, nothing repeats more than it must.
  function scatter(d, keys) {
    var n = slots(d), out = '', bag = [];
    d.cus = [];
    for (var i = 0; i < n; i++) {
      if (!bag.length) bag = keys.slice().sort(function () { return Math.random() - 0.5; });
      var prev = out.length ? keyOf(d, B64.indexOf(out[out.length - 1])) : null;
      var k = bag.length > 1 && bag[0] === prev ? 1 : 0;
      out += letter(d, bag.splice(k, 1)[0]) || B64[0];
    }
    d.fab = out;
    d.rot = '';   // new fabrics, laid straight
    prune(d);
    return d.fab;
  }

  // the fabric the preview shows on patch i while Gem picks (no d.fab):
  // a real one of that family when there is one, else the painted one
  function paintedKey(d, i) {
    var f = fabricsFor(d)(i);
    return fabricId(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron');
  }
  function shownKey(d, i) {
    var f = fabricsFor(d)(i);
    return (hasReal() && nearReal(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron')) || paintedKey(d, i);
  }
  function setPatch(d, i, key) {
    var n = slots(d);
    if (i < 0 || i >= n) return;
    var cur = d.fab && d.fab.length === n ? d.fab : '';
    if (!cur) {   // first touch: freeze what the preview shows now
      d.cus = []; d.rot = '';
      for (var k = 0; k < n; k++) cur += letter(d, shownKey(d, k)) || B64[paintedKey(d, k)];
    }
    var ch = letter(d, key);
    if (!ch) return;
    // another fabric on a turned patch: it starts straight
    if (cur[i] !== ch && d.rot && i < d.rot.length) d.rot = d.rot.slice(0, i) + '0' + d.rot.slice(i + 1);
    d.fab = cur.slice(0, i) + ch + cur.slice(i + 1);
    prune(d);
  }

  // Tones and prints follow the fabrics on the patches, so the order note,
  // the "similar ready-made" picks and the name agree with what is drawn.
  function syncTaste(d) {
    if (!d.fab) return;
    var tc = {}, kinds = [];
    for (var i = 0; i < d.fab.length; i++) {
      var f = info(d, B64.indexOf(d.fab[i]));
      tc[f.tone] = (tc[f.tone] || 0) + 1;
      if (PRINTS[f.kind] && kinds.indexOf(f.kind) < 0) kinds.push(f.kind);
    }
    d.tones = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, MAX_TONES);
    d.prints = PRINT_ORDER.filter(function (k) { return kinds.indexOf(k) >= 0; });
  }

  // The mood the fabrics come from. Few patches can fit several moods: the
  // one the customer picked (d.moodId, not in the code) wins, then the first.
  function moodOf(d) {
    if (!d.fab) return null;
    var keys = [];
    for (var i = 0; i < d.fab.length; i++) keys.push(keyOf(d, B64.indexOf(d.fab[i])));
    var fits = MOODS.filter(function (m) {
      return [m.ids, m.real || []].some(function (set) { return keys.every(function (x) { return set.indexOf(x) >= 0; }); });
    });
    return fits.filter(function (m) { return m.id === d.moodId; })[0] || fits[0] || null;
  }

  // keepLayout: only the fabrics change (the customer already picked a
  // layout); otherwise the mood's own layout comes along (a fresh piece)
  function applyMood(d, mood, keepLayout) {
    var p = PRODUCTS[d.product];
    if (d.layout !== 'tuve' && !keepLayout) d.layout = p.layouts.indexOf(mood.layout) >= 0 ? mood.layout
      : p.def || (p.layouts.indexOf('hai') >= 0 ? 'hai' : p.layouts[0]);
    scatter(d, moodKeys(mood));
    d.moodId = mood.id;
    syncTaste(d);
  }

  /* ---------- the customer's own colour ----------
     The blue sheet (blue ink on cream, little else) is repainted in the
     chosen colour, pixel by pixel: blue-ish pixels take the new hue, the
     saturation scaled and the lightness shifted; cream, white lace and green
     leaves stay as painted. Done once per kind + colour, kept as a blob URL. */
  var customUrls = {}, customJobs = {};
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var dd = mx - mn;
      s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function customSrc(k, hex) {
    var id = k + hex;
    if (customUrls[id]) return customUrls[id];
    if (customJobs[id] || typeof document === 'undefined' || !document.createElement) return null;
    customJobs[id] = 1;
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        var data = g.getImageData(0, 0, c.width, c.height), px = data.data;
        var rgb = hexRgb(hex), t = rgbHsl(rgb[0], rgb[1], rgb[2]);
        // how strong this painting's blue is (some are barely tinted): the
        // strongest blue becomes the full chosen colour
        var sats = [];
        for (var q0 = 0; q0 < px.length; q0 += 4 * 7) {
          var h0 = rgbHsl(px[q0], px[q0 + 1], px[q0 + 2]);
          if (h0[0] >= 140 && h0[0] <= 300 && h0[1] >= 0.012) sats.push(h0[1]);
        }
        sats.sort(function (x, y) { return x - y; });
        var ref = Math.max(0.08, sats.length ? sats[Math.floor(sats.length * 0.9)] : 0.3);
        for (var q = 0; q < px.length; q += 4) {
          var hsl = rgbHsl(px[q], px[q + 1], px[q + 2]);
          // the blue ink, faded or strong; cream (hue ~40), white lace and
          // green leaves (hue ~90) are left as painted
          if (hsl[0] < 140 || hsl[0] > 300 || hsl[1] < 0.012) continue;
          var w = Math.min(1, (hsl[1] - 0.012) / 0.03);
          // pale blue stays pale, strong blue becomes the strong colour
          var s2 = Math.min(1, t[1] * Math.max(0.5, Math.min(1.2, hsl[1] / ref)));
          var l2 = Math.max(0, Math.min(1, hsl[2] + 0.85 * (t[2] - 0.55)));
          var out = hslRgb(t[0], s2 * w + hsl[1] * (1 - w), l2 * w + hsl[2] * (1 - w));
          px[q] = out[0]; px[q + 1] = out[1]; px[q + 2] = out[2];
        }
        g.putImageData(data, 0, 0);
        c.toBlob(function (b) {
          if (!b) return;
          customUrls[id] = URL.createObjectURL(b);
          document.dispatchEvent(new CustomEvent('gem:fabric', { detail: { key: 'c' + id } }));
        }, 'image/webp', 0.85);
      } catch (e) { /* the drawn print stays */ }
    };
    img.src = VAI + 'vai-lam-' + (k + 1) + '.webp';
    return null;
  }
  function keySrc(key) {
    if (isReal(key)) { var rf = realOf(key); return rf && rf.src; }
    return typeof key === 'number' ? swatchSrc(key) : customSrc(+key[1], key.slice(2));
  }
  // a flat colour for a key whose picture isn't there (yet)
  function keyColor(key) {
    if (typeof key === 'number') return fabric(key).color;
    if (isReal(key)) { var rf = realOf(key); return TONES[rf ? rf.tone : 'trung'].c[0]; }
    return '#' + String(key).slice(2);
  }

  // "Sắc tím": a name for a colour the customer picked.
  function hueName(hex, l) {
    var rgb = hexRgb(hex), h = rgbHsl(rgb[0], rgb[1], rgb[2]);
    var vi = l === 'vi';
    if (h[1] < 0.15) return h[2] > 0.7 ? (vi ? 'kem' : 'cream') : (vi ? 'xám' : 'grey');
    var names = [[15, 'đỏ', 'red'], [40, 'cam', 'orange'], [65, 'vàng', 'yellow'], [160, 'xanh lá', 'green'],
      [200, 'xanh ngọc', 'teal'], [255, 'xanh dương', 'blue'], [290, 'tím', 'violet'], [345, 'hồng', 'pink'], [361, 'đỏ', 'red']];
    for (var i = 0; i < names.length; i++) if (h[0] < names[i][0]) return vi ? names[i][1] : names[i][2];
    return vi ? 'đỏ' : 'red';
  }

  var TONE_WORDS = {
    xanh: { vi: 'Lá non', en: 'Young leaf' }, lam: { vi: 'Biển xanh', en: 'Sea blue' },
    hong: { vi: 'Hồng phấn', en: 'Rose' }, nau: { vi: 'Đất nâu', en: 'Earth' }, trung: { vi: 'Kem sữa', en: 'Milk cream' }
  };

  // A name worth putting on a card: the mood if the fabrics come from one,
  // else the two main colour families.
  function title(d, l) {
    l = l || lang();
    var m = moodOf(d);
    if (m) return m[l];
    // mostly the customer's own colour: name that colour
    var own = {}, n = 0;
    for (var i = 0; i < (d.fab || '').length; i++) {
      var ix = B64.indexOf(d.fab[i]);
      if (ix >= N_FABRICS && d.cus[ix - N_FABRICS] && d.cus[ix - N_FABRICS].hex) { var hx = d.cus[ix - N_FABRICS].hex; own[hx] = (own[hx] || 0) + 1; n++; }
    }
    if (n * 2 >= (d.fab || '').length && n) {
      var top = Object.keys(own).sort(function (a, b) { return own[b] - own[a]; })[0];
      var hn = hueName(top, l);
      return l === 'vi' ? 'Sắc ' + hn : hn.charAt(0).toUpperCase() + hn.slice(1) + ' shade';
    }
    var tones = d.tones.filter(function (t) { return t !== GEM; });
    if (!tones.length) return l === 'vi' ? 'Gem tự chọn' : "Gem's pick";
    return tones.map(function (t) { return TONE_WORDS[t][l]; }).join(' & ');
  }

  // "Mẫu #4271": the same design always gets the same number.
  function serial(spec) {
    var h = 2166136261;
    for (var i = 0; i < spec.length; i++) { h ^= spec.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 1000 + ((h >>> 0) % 9000);
  }

  // A small fabric swatch on its own (the basket of scraps).
  function swatch(id, size) {
    var f = fabric(id), b = printBody(f.kind, f.color), pid = 'gw' + (++uid);
    return { id: pid, def: '<pattern id="' + pid + '" width="' + b.size + '" height="' + b.size +
      '" patternUnits="userSpaceOnUse"' + (size ? ' patternTransform="scale(' + size + ')"' : '') + '>' + b.body + '</pattern>' };
  }

  window.GemPatch = {
    PRODUCTS: PRODUCTS, PRODUCT_ORDER: PRODUCT_ORDER, LAYOUTS: LAYOUTS,
    TONES: TONES, TONE_ORDER: TONE_ORDER, MAX_TONES: MAX_TONES,
    PRINTS: PRINTS, PRINT_ORDER: PRINT_ORDER, FABRICS: FABRICS, FABRIC_ORDER: FABRIC_ORDER,
    GEM: GEM, MAX_OTHER: MAX_OTHER, MAX_NOTE: MAX_NOTE,
    INKS: INKS, ERASER: ERASER, WIDTHS: WIDTHS, GRID: GRID, settle: settle, smoothPath: smoothPath, MAX_POINTS: MAX_POINTS, MAX_STROKES: MAX_STROKES,
    blank: blank, encode: encode, parse: parse, isComplete: isComplete, describe: describe,
    tones: tones, randomFill: randomFill, svg: svg, toneDot: toneDot, printDot: printDot,
    sketchPaths: sketchPaths,
    KINDS: KINDS, KIND_NAMES: KIND_NAMES, N_FABRICS: N_FABRICS, MOODS: MOODS, B64: B64,
    fabric: fabric, fabricId: fabricId, slots: slots, scatter: scatter, setPatch: setPatch, syncTaste: syncTaste,
    turnPatch: turnPatch, rotAt: rotAt, TURN_STEP: TURN_STEP,
    moodOf: moodOf, applyMood: applyMood, title: title, serial: serial, swatch: swatch,
    swatchSrc: swatchSrc, VAI: VAI, netRegions: netRegions, refit: refit, NET_MAX: NET_MAX, keySrc: keySrc, keyAt: keyAt, keyName: keyName,
    isCustom: isCustom, customSrc: customSrc,
    // the fabric a patch shows, set on it or not (the mood's / Gem's pick)
    keyShown: function (d, i) { var k = keyAt(d, i); return k != null ? k : shownKey(d, i); },
    layoutName: layoutName, slotNames: slotNames, silhouette: silhouette,
    // pieces under one tab (Lót cốc tròn / vuông, the bags, the laptop sleeve)
    GROUPS: GROUPS, groupOf: groupOf, tabOf: tabOf, tabName: tabName,
    // size + options, price
    SIZES: SIZES, TIES: TIES, tieWhy: tieWhy, STITCHES: STITCHES, THREADS: THREADS, stitchIcon: stitchIcon, embName: embName, sizesOf: sizesOf, sizeLabel: sizeLabel, blankExt: blankExt, fitExt: fitExt, MAX_POCKETS: MAX_POCKETS, CUSTOM_CM: CUSTOM_CM,
    PRICING: PRICING, price: price, priceLine: priceLine, priceRange: priceRange, fee: fee, setPricing: setPricing, loadPricing: loadPricing,
    // real fabrics (Kho vải)
    setReal: setReal, loadReal: loadReal, hasReal: hasReal, isReal: isReal, realOf: realOf, moodKeys: moodKeys, warm: warm,
    keyColor: keyColor, fabricList: fabricList,
    realList: function () { return REAL_ON.slice(); },
    // by: the designer's name for the card, travels in the link only
    // mood: which mood the fabrics came from (several can fit few patches)
    url: function (spec, by, mood) {
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'studio.html?d=' + encodeURIComponent(spec) +
        (by ? '&by=' + encodeURIComponent(String(by).slice(0, 24)) : '') +
        (mood && MOODS.some(function (m) { return m.id === mood; }) ? '&m=' + mood : '');
    }
  };
})();
