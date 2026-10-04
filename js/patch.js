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
//   2~goi~cabin~xanh.nau~caro.hoa~bo.dui~<other>~<sketch>~<note>[~<photo>]
//   v product layout tones  prints   fabrics  free text, sketch, free text
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
    scrunchie: { sku: 'scrunchie', vi: 'Dây buộc tóc', en: 'Scrunchie',         shape: 'scrunchie', grid: 1,
                 layouts: ['mot', 'hai', 'tuve'] }
  };
  var PRODUCT_ORDER = ['goi', 'lotcoc', 'scrunchie'];

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
      tones: [], prints: [], fabrics: [], other: '', sketch: [], note: '', img: '' };
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
      txt(d.other), encodeSketch(d.sketch), txt(d.note)].concat(d.img ? [d.img] : []).join('~');
  }

  function parse(spec) {
    if (typeof spec !== 'string' || spec.length > 4000) return null;
    var f = spec.split('~');
    if ((f.length !== 9 && f.length !== 10) || f[0] !== '2' || !PRODUCTS[f[1]]) return null;
    var img = f.length === 10 ? f[9] : '';
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
      other: other, sketch: sketch, note: note, img: img };
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
    var bits = [PRODUCTS[d.product][l], (vi ? 'kiểu ' : 'layout: ') + LAYOUTS[d.layout][l]];
    bits.push((vi ? 'tông: ' : 'colours: ') + (d.tones.length && d.tones[0] !== GEM ? names(d.tones, TONES, l) : gem));
    bits.push((vi ? 'họa tiết: ' : 'prints: ') + (d.prints.length && d.prints[0] !== GEM ? names(d.prints, PRINTS, l) : gem));
    var fab = names(d.fabrics, FABRICS, l);
    if (d.other) fab = (fab ? fab + ', ' : '') + (vi ? 'khác: ' : 'other: ') + d.other;
    bits.push((vi ? 'chất vải: ' : 'fabrics: ') + (fab || gem));
    if (d.sketch.length) bits.push(vi ? 'có hình vẽ tay' : 'with a sketch');
    if (d.img) bits.push(vi ? 'có ảnh tham khảo' : 'with a reference photo');
    if (d.note) bits.push((vi ? 'ghi chú: ' : 'note: ') + d.note);
    return bits.join(' · ');
  }

  // Colour families + print tags, for "ready-made in a similar palette".
  function tones(spec) {
    var d = typeof spec === 'string' ? parse(spec) : spec;
    var out = {};
    if (!d) return out;
    d.tones.forEach(function (t) { if (t !== GEM) out[t] = (out[t] || 0) + 2; });
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

  function sketchPaths(strokes, ox, oy, size) {
    var sc = size / GRID;
    return strokes.map(function (s) {
      var pts = s.pts.length === 1 ? [s.pts[0], [s.pts[0][0] + 0.01, s.pts[0][1]]] : s.pts;
      return '<path d="M' + pts.map(function (p) {
        return (ox + (p[0] + 0.5) * sc).toFixed(1) + ' ' + (oy + (p[1] + 0.5) * sc).toFixed(1);
      }).join('L') + '" fill="none" stroke="' + INKS[s.c] + '" stroke-width="' + (sc * WIDTHS[s.w || 0]).toFixed(1) +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
  }

  // Build the preview SVG. Illustrative only: real scraps differ.
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
    var fill = function (i) {
      var f = pick(i);
      var id = pre + f.print + f.color.slice(1);
      if (!defs[id]) {
        defs[id] = 1;
        var b = printBody(f.print, f.color);
        defsOut += '<pattern id="' + id + '" width="' + b.size + '" height="' + b.size +
          '" patternUnits="userSpaceOnUse">' + b.body + '</pattern>';
      }
      return 'url(#' + id + ')';
    };
    var body = '';

    if (p.shape === 'scrunchie') {
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
            '" stroke-width="1.8" stroke-dasharray="6 5" stroke-linejoin="round"/>';
        });
        body += '<rect x="' + pad + '" y="' + pad + '" width="' + inner + '" height="' + inner + '" fill="url(#' + pre + 'puff)"/>';
      }
      body += '</g><rect x="' + (pad + 7) + '" y="' + (pad + 7) + '" width="' + (inner - 14) + '" height="' + (inner - 14) +
        '" rx="' + (rx - 6) + '" fill="none" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="5 5"/>';
    }

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

  window.GemPatch = {
    PRODUCTS: PRODUCTS, PRODUCT_ORDER: PRODUCT_ORDER, LAYOUTS: LAYOUTS,
    TONES: TONES, TONE_ORDER: TONE_ORDER, MAX_TONES: MAX_TONES,
    PRINTS: PRINTS, PRINT_ORDER: PRINT_ORDER, FABRICS: FABRICS, FABRIC_ORDER: FABRIC_ORDER,
    GEM: GEM, MAX_OTHER: MAX_OTHER, MAX_NOTE: MAX_NOTE,
    INKS: INKS, ERASER: ERASER, WIDTHS: WIDTHS, GRID: GRID, MAX_POINTS: MAX_POINTS, MAX_STROKES: MAX_STROKES,
    blank: blank, encode: encode, parse: parse, isComplete: isComplete, describe: describe,
    tones: tones, randomFill: randomFill, svg: svg, toneDot: toneDot, printDot: printDot,
    sketchPaths: sketchPaths,
    url: function (spec) {
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'studio.html?d=' + encodeURIComponent(spec);
    }
  };
})();
