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
  var PRODUCTS = {
    goi:       { sku: 'goi',       vi: 'Gối Chắp Sắc', en: 'Patchwork cushion', shape: 'cushion', grid: 3,
                 layouts: ['vuong', 'cabin', 'sao', 'chong', 'tuve'] },
    lotcoc:    { sku: 'lotcoc',    vi: 'Lót cốc',      en: 'Coaster',           shape: 'coaster', grid: 2,
                 layouts: ['vuong', 'cabin', 'chong', 'tuve'] },
    // the square coaster: same product (sku), another shape — not a tab of
    // its own, the designer offers "Tròn / Vuông" on the coaster
    lotcocv:   { sku: 'lotcoc',    vi: 'Lót cốc vuông', en: 'Square coaster',   shape: 'coasterSq', grid: 2,
                 layouts: ['vuong', 'cabin', 'chong', 'tuve'] },
    scrunchie: { sku: 'scrunchie', vi: 'Dây buộc tóc', en: 'Scrunchie',         shape: 'scrunchie', grid: 1,
                 layouts: ['mot', 'hai', 'tuve'] },
    origami:   { sku: 'origami',   vi: 'Túi Origami',  en: 'Origami pouch',     shape: 'origami', grid: 1,
                 layouts: ['mot', 'hai', 'tuve'] },
    oxford:    { sku: 'oxford',    vi: 'Túi áo Oxford', en: 'Oxford shirt bag', shape: 'shirt', grid: 2,
                 layouts: ['mot', 'hai', 'vuong', 'tuve'] },
    bloom:     { sku: 'bloom',     vi: 'Bloom Charm',  en: 'Bloom charm',       shape: 'bloom', grid: 1,
                 layouts: ['mot', 'hai', 'tuve'] },
    bookmark:  { sku: 'bookmark',  vi: 'Bookmark',     en: 'Bookmark',          shape: 'bookmark', grid: 3,
                 layouts: ['mot', 'hai', 'vuong', 'tuve'] },
    daydeo:    { sku: 'daydeo',    vi: 'Dây đeo cổ tay', en: 'Wrist strap',     shape: 'strap', grid: 1,
                 layouts: ['mot', 'hai', 'tuve'] }
  };
  var PRODUCT_ORDER = ['goi', 'lotcoc', 'scrunchie', 'origami', 'oxford', 'bloom', 'bookmark', 'daydeo'];

  // Stand-ins until Mai's mother's real piecing samples arrive.
  var LAYOUTS = {
    vuong: { vi: 'Ô vuông', en: 'Squares' },
    cabin: { vi: 'Nhà gỗ', en: 'Log cabin' },
    sao:   { vi: 'Ngôi sao', en: 'Star' },
    chong: { vi: 'Chong chóng', en: 'Pinwheel' },
    mot:   { vi: 'Một tấm vải', en: 'One fabric' },
    hai:   { vi: 'Ghép hai vải', en: 'Two fabrics' },
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
    ren:    { vi: 'Ren',          en: 'Lace' }
  };
  var FABRIC_ORDER = ['cotton', 'dui', 'bo', 'nhung', 'kate', 'ren'];

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
    return { product: PRODUCTS[product] ? product : 'goi', layout: p.layouts[0],
      tones: [], prints: [], fabrics: [], other: '', sketch: [], note: '', img: '', fab: '', cus: [] };
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
    return ['2', d.product, d.layout, d.tones.join('.'), d.prints.join('.'), d.fabrics.join('.'),
      txt(d.other), encodeSketch(d.sketch), txt(d.note)]
      .concat(d.fab ? [d.img || '', d.fab] : d.img ? [d.img] : [])
      .concat(d.fab && d.cus && d.cus.length ? [d.cus.map(function (c) { return c.k + c.hex; }).join('.')] : []).join('~');
  }

  function parse(spec) {
    if (typeof spec !== 'string' || spec.length > 4000) return null;
    var f = spec.split('~');
    if (f.length < 9 || f.length > 12 || f[0] !== '2' || !PRODUCTS[f[1]]) return null;
    var img = f.length >= 10 ? f[9] : '';
    var fab = f.length >= 11 ? f[10] : '';
    if (f.length >= 11 && !fab) return null;
    if (fab.length > 64) return null;
    var cus = [];
    if (f.length === 12) {
      var cs = f[11].split('.');
      if (cs.length > MAX_CUSTOM) return null;
      for (var ci = 0; ci < cs.length; ci++) {
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
    if (p.layouts.indexOf(f[2]) < 0) return null;
    var tones = list(f[3], TONES, MAX_TONES), prints = list(f[4], PRINTS, PRINT_ORDER.length),
        fabrics = f[5] === GEM ? { ok: false } : list(f[5], FABRICS, FABRIC_ORDER.length);
    if (!tones.ok || !prints.ok || !fabrics.ok) return null;
    var other = untxt(f[6]), note = untxt(f[8]), sketch = parseSketch(f[7]);
    if (other === null || note === null || sketch === null) return null;
    if (other.length > MAX_OTHER || note.length > MAX_NOTE) return null;
    return { product: f[1], layout: f[2], tones: tones.v, prints: prints.v, fabrics: fabrics.v,
      other: other, sketch: sketch, note: note, img: img, fab: fab, cus: cus };
  }

  // Orderable: everything has a sensible "Gem chooses" default, except a
  // "from my drawing" layout with nothing drawn.
  function isComplete(d) {
    return !!d && (d.layout !== 'tuve' || d.sketch.length > 0 || !!d.img);
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
      (vi ? 'kiểu ' : 'layout: ') + LAYOUTS[d.layout][l]];
    if (d.fab) bits.push((vi ? 'vải từng mảnh: ' : 'fabric per patch: ') + fabricList(d, l));
    else {
      bits.push((vi ? 'tông: ' : 'colours: ') + (d.tones.length && d.tones[0] !== GEM ? names(d.tones, TONES, l) : gem));
      bits.push((vi ? 'họa tiết: ' : 'prints: ') + (d.prints.length && d.prints[0] !== GEM ? names(d.prints, PRINTS, l) : gem));
    }
    var fab = names(d.fabrics, FABRICS, l);
    if (d.other) fab = (fab ? fab + ', ' : '') + (vi ? 'khác: ' : 'other: ') + d.other;
    bits.push((vi ? 'chất vải: ' : 'fabrics: ') + (fab || gem));
    if (d.sketch.length) bits.push(vi ? 'có hình vẽ tay' : 'with a sketch');
    if (d.img) bits.push(vi ? 'có ảnh tham khảo' : 'with a reference photo');
    if (d.note) bits.push((vi ? 'ghi chú: ' : 'note: ') + d.note);
    return bits.join(' · ');
  }

  // "Hoa nhí xanh lá ×3, Ren trung tính ×1" — the fabrics on the patches.
  function fabricList(d, l) {
    var count = {}, order = [];
    for (var i = 0; i < d.fab.length; i++) {
      var id = B64.indexOf(d.fab[i]);
      if (!count[id]) { count[id] = 0; order.push(id); }
      count[id]++;
    }
    return order.map(function (id) {
      return keyName(keyOf(d, id), l) + (count[id] > 1 ? ' ×' + count[id] : '');
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

  // A painted swatch as an SVG pattern, tiled 2 x 2 with mirrored copies so
  // the edges of the square meet themselves (no visible tile seams).
  function fabricPattern(id, pid, T, src) {
    src = src || swatchSrc(id);
    var im = function (tr) {
      return '<image href="' + src + '" width="' + T + '" height="' + T + '" preserveAspectRatio="none"' + (tr ? ' transform="' + tr + '"' : '') + '/>';
    };
    return '<pattern id="' + pid + '" width="' + 2 * T + '" height="' + 2 * T + '" patternUnits="userSpaceOnUse">' +
      im('') + im('translate(' + 2 * T + ' 0) scale(-1 1)') + im('translate(0 ' + 2 * T + ') scale(1 -1)') +
      im('translate(' + 2 * T + ' ' + 2 * T + ') scale(-1 -1)') + '</pattern>';
  }

  // Pieces with a painting: the fabric is laid inside the piece's silhouette
  // (mask) and the painted linen's shading multiplies over it, so the cushion
  // puffs and the scrunchie gathers whatever fabric is on it.
  // box: where the fabric sits in the 340 square (printed by the tool);
  // c: the centre the petals turn round; band: the middle strip of "hai";
  // top: rings / clasps painted over the fabric
  var ART = {
    cushion: { n: 'goi' }, coaster: { n: 'lotcoc' }, coasterSq: { n: 'lotcocv' }, scrunchie: { n: 'scrunchie' },
    shirt: { n: 'oxford', box: [47, 1, 292, 339] },
    origami: { n: 'origami', top: 1, c: [187, 201] },
    // like the real charm: the stem, its knots and the middle bud in one
    // fabric, the two side buds in the other
    bloom: { n: 'bloom', top: 1, split: 'M0 0H340V172H196L214 252L170 340L126 252L144 172H0Z' },
    strap: { n: 'daydeo', top: 1 },
    // the corner bookmark: a square back and a triangle flap that slips over
    // the corner of a page
    bookmark: { n: 'bookmark', diag: 1 }
  };
  var SEAM = '" stroke="' + STITCH + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.4" fill="none"/>';
  function artPiece(d, p, fill, pre) {
    var A = ART[p.shape], name = A.n, out = '';
    out += '<mask id="' + pre + 'mk" maskUnits="userSpaceOnUse" x="0" y="0" width="340" height="340">' +
      '<image href="' + VAI + 'mon-' + name + '-mask.webp" width="340" height="340"/></mask>';
    out += '<g mask="url(#' + pre + 'mk)">';
    // the fabric area: the painted piece fills most of its square
    var box = [0, 0, 340];
    if (d.layout === 'tuve') {
      // drawn on a fabric picked from the basket (or plain paper); the
      // eraser paints that fabric back
      var bg = d.fab ? fill(0) : '#FBF6EE', bgPaint = bg.split('"')[0];
      out += '<rect width="340" height="340" fill="' + bg + '"/>' +
        sketchPaths(d.sketch, box[0], box[1], box[2]).split('stroke="' + INKS[ERASER] + '"').join('stroke="' + bgPaint + '"');
    } else if (p.shape === 'scrunchie') {
      if (d.layout === 'hai') {
        for (var w = 0; w < 12; w++) {
          var a0 = w * 30 * Math.PI / 180, a1 = (w + 1) * 30 * Math.PI / 180;
          out += '<path class="pt-cut" d="M170 170L' + (170 + 220 * Math.cos(a0)).toFixed(1) + ' ' + (170 + 220 * Math.sin(a0)).toFixed(1) +
            'L' + (170 + 220 * Math.cos(a1)).toFixed(1) + ' ' + (170 + 220 * Math.sin(a1)).toFixed(1) + 'Z" fill="' + fill(w % 2) + '"/>';
        }
      } else out += '<rect width="340" height="340" fill="' + fill(0) + '"/>';
    } else if (d.layout === 'mot') {
      out += '<rect width="340" height="340" fill="' + fill(0) + '"/>';
    } else if (d.layout === 'hai' && A.c) {
      // every other petal: six sectors round the centre, one per petal
      var cx = A.c[0], cy = A.c[1];
      for (var k = 0; k < 6; k++) {
        var b0 = (-120 + k * 60) * Math.PI / 180, b1 = (-60 + k * 60) * Math.PI / 180;
        var ex = function (a) { return (cx + 400 * Math.cos(a)).toFixed(1) + ' ' + (cy + 400 * Math.sin(a)).toFixed(1); };
        out += '<path d="M' + cx + ' ' + cy + 'L' + ex(b0) + 'L' + ex(b1) + 'Z" fill="' + fill(k % 2) + '"/>';
        out += '<path d="M' + cx + ' ' + cy + 'L' + ex(b0) + SEAM;
      }
    } else if (d.layout === 'hai' && A.diag) {
      out += '<path d="M0 0L0 340L340 340Z" fill="' + fill(0) + '"/><path d="M0 0L340 0L340 340Z" fill="' + fill(1) + '"/>' +
        '<path d="M0 0L340 340' + SEAM;
    } else if (d.layout === 'hai' && A.split) {
      out += '<rect width="340" height="340" fill="' + fill(1) + '"/>' +
        '<path d="' + A.split + '" fill="' + fill(0) + '"/>' +
        '<path d="M144 172L126 252L170 340L214 252L196 172' + SEAM;
    } else if (d.layout === 'hai') {
      // left and right halves (a shirt's placket, a strap's two sides)
      out += '<rect width="170" height="340" fill="' + fill(0) + '"/><rect x="170" width="170" height="340" fill="' + fill(1) + '"/>' +
        '<path d="M170 0V340' + SEAM;
    } else {
      var bx = A.box || [0, 0, 340, 340], sx = (bx[2] - bx[0]) / 100, sy = (bx[3] - bx[1]) / 100;
      patches(d.layout, p.grid).forEach(function (pt, n) {
        var i = d.layout === 'sao' || d.layout === 'chong' ? pt.i : n;
        out += '<path d="M' + pt.pts.map(function (q) { return (bx[0] + q[0] * sx).toFixed(1) + ' ' + (bx[1] + q[1] * sy).toFixed(1); }).join('L') +
          'Z" fill="' + fill(i) + '" stroke="' + STITCH + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.4" stroke-linejoin="round"/>';
      });
    }
    out += '</g>';
    out += '<image href="' + VAI + 'mon-' + name + '-bong.webp" width="340" height="340" style="mix-blend-mode:multiply" pointer-events="none"/>';
    if (A.top) out += '<image href="' + VAI + 'mon-' + name + '-top.webp" width="340" height="340" pointer-events="none"/>';
    return out;
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
    var fill = function (i) {
      if (i > maxI) maxI = i;
      var f;
      if (d.fab && i < d.fab.length) {
        var ix = B64.indexOf(d.fab[i]);
        if (ix >= N_FABRICS && d.cus[ix - N_FABRICS]) {
          // the customer's own colour: the recoloured painting once it is
          // ready (gem:fabric), a drawn print of that colour until then
          var c = d.cus[ix - N_FABRICS], cid = pre + 'c' + c.k + c.hex;
          if (!defs[cid]) {
            defs[cid] = 1;
            var csrc = customSrc(c.k, c.hex);
            if (csrc) defsOut += fabricPattern(null, cid, 110, csrc);
            else {
              var cb = printBody(KINDS[c.k], '#' + c.hex);
              defsOut += '<pattern id="' + cid + '" width="' + cb.size + '" height="' + cb.size + '" patternUnits="userSpaceOnUse">' + cb.body + '</pattern>';
            }
          }
          return 'url(#' + cid + ')' + (opts.hit ? '" data-i="' + i : '');
        }
        var fb = fabric(ix);
        f = { color: fb.color, print: fb.kind };
      } else f = pick(i);
      // the painted swatch for this colour family + kind
      var fid = fabricId(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron');
      var id = pre + 'f' + fid;
      if (!defs[id]) {
        defs[id] = 1;
        defsOut += fabricPattern(fid, id, 110);
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
     A fabric is a key: a number 0..44 (the painted catalogue) or a string
     "c<kind><rrggbb>" (one of the 9 kinds recoloured to the customer's own
     colour). On a design a patch holds one B64 letter: the number itself, or
     45 + the colour's place in d.cus. */
  function isCustom(key) { return typeof key === 'string' && /^c[0-8][0-9a-f]{6}$/.test(key); }

  function keyOf(d, ix) {
    if (ix < N_FABRICS) return ix;
    var c = d.cus[ix - N_FABRICS];
    return c ? 'c' + c.k + c.hex : 0;
  }
  function keyAt(d, i) { return d.fab && i < d.fab.length ? keyOf(d, B64.indexOf(d.fab[i])) : null; }

  // The letter for a key on this design (adds the colour to d.cus if new).
  function letter(d, key) {
    if (typeof key === 'number') return key >= 0 && key < N_FABRICS ? B64[key] : null;
    if (!isCustom(key)) return null;
    d.cus = d.cus || [];
    var k = +key[1], hex = key.slice(2);
    for (var n = 0; n < d.cus.length; n++) if (d.cus[n].k === k && d.cus[n].hex === hex) return B64[N_FABRICS + n];
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
    return { tone: nearestTone(key.slice(2)), kind: KINDS[+key[1]], custom: true, hex: key.slice(2) };
  }
  function keyName(key, l) {
    l = l || lang();
    if (typeof key === 'number') { var f = fabric(key); return KIND_NAMES[f.kind][l] + ' ' + TONES[f.tone][l].toLowerCase(); }
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
    prune(d);
    return d.fab;
  }

  function setPatch(d, i, key) {
    var n = slots(d);
    if (i < 0 || i >= n) return;
    var cur = d.fab && d.fab.length === n ? d.fab : '';
    if (!cur) {   // first touch: freeze what the preview shows now
      var pick = fabricsFor(d);
      d.cus = [];
      for (var k = 0; k < n; k++) {
        var f = pick(k);
        cur += B64[fabricId(toneOf(f.color), KINDS.indexOf(f.print) >= 0 ? f.print : 'tron')];
      }
    }
    var ch = letter(d, key);
    if (!ch) return;
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
    var ids = [];
    for (var i = 0; i < d.fab.length; i++) ids.push(B64.indexOf(d.fab[i]));
    var fits = MOODS.filter(function (m) { return ids.every(function (x) { return m.ids.indexOf(x) >= 0; }); });
    return fits.filter(function (m) { return m.id === d.moodId; })[0] || fits[0] || null;
  }

  // keepLayout: only the fabrics change (the customer already picked a
  // layout); otherwise the mood's own layout comes along (a fresh piece)
  function applyMood(d, mood, keepLayout) {
    var p = PRODUCTS[d.product];
    if (d.layout !== 'tuve' && !keepLayout) d.layout = p.layouts.indexOf(mood.layout) >= 0 ? mood.layout
      : p.layouts.indexOf('hai') >= 0 ? 'hai' : p.layouts[0];
    scatter(d, mood.ids);
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
    return typeof key === 'number' ? swatchSrc(key) : customSrc(+key[1], key.slice(2));
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
      if (ix >= N_FABRICS && d.cus[ix - N_FABRICS]) { var hx = d.cus[ix - N_FABRICS].hex; own[hx] = (own[hx] || 0) + 1; n++; }
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
    moodOf: moodOf, applyMood: applyMood, title: title, serial: serial, swatch: swatch,
    swatchSrc: swatchSrc, VAI: VAI, keySrc: keySrc, keyAt: keyAt, keyName: keyName, isCustom: isCustom, customSrc: customSrc,
    // by: the designer's name for the card, travels in the link only
    // mood: which mood the fabrics came from (several can fit few patches)
    url: function (spec, by, mood) {
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'studio.html?d=' + encodeURIComponent(spec) +
        (by ? '&by=' + encodeURIComponent(String(by).slice(0, 24)) : '') +
        (mood && MOODS.some(function (m) { return m.id === mood; }) ? '&m=' + mood : '');
    }
  };
})();
