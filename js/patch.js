// Gem Chạm Sắc — bàn chắp vải: dữ liệu + bộ vẽ
//
// One small library shared by the studio (designer), the basket (thumbnail
// + order note) and anything else that has to show a design. A design is a
// short code, e.g.  goi~bo0.re1.tr4.ca0.hn2.du1.cb3.nt0.tr7
//   product ~ one cell per patch, each = material (2 letters) + colourway
// It travels in links (studio.html?d=…) and in the basket, so it is parsed
// strictly: anything not in the tables below is rejected.
//
// No real fabric inventory on purpose: customers pick a material + colour,
// Gem matches the closest scraps by hand and sends a photo before sewing.

(function () {
  'use strict';

  /* ======================================================================
     PALETTE — muted, on brand; every pattern is built from these
     ====================================================================== */
  var C = {
    sage: '#87965A', kem: '#EFE3CF', kraft: '#B89968', reu: '#4F5E3A',
    hong: '#D9A5A0', gach: '#B5654A', navy: '#2F3E5C', mutat: '#C9A23F',
    den: '#2E2C29', trang: '#FAF7F0', be: '#D8C7A8', nau: '#7A5434',
    dodo: '#7A2E2E', boDam: '#33507A', boNhat: '#86A3C3', hoaDo: '#C2575B'
  };

  /* ======================================================================
     MATERIALS — each has its own sensible colourways
     ====================================================================== */
  var MATERIALS = {
    tr: { vi: 'Vải trơn', en: 'Plain cotton', ways: [
      { c: [C.sage], vi: 'xanh sage', en: 'sage' },
      { c: [C.kem], vi: 'kem', en: 'cream' },
      { c: [C.kraft], vi: 'nâu kraft', en: 'kraft' },
      { c: [C.reu], vi: 'xanh rêu', en: 'moss' },
      { c: [C.hong], vi: 'hồng phấn', en: 'dusty pink' },
      { c: [C.gach], vi: 'đỏ gạch', en: 'brick' },
      { c: [C.navy], vi: 'xanh navy', en: 'navy' },
      { c: [C.mutat], vi: 'vàng mù tạt', en: 'mustard' },
      { c: [C.den], vi: 'đen', en: 'black' },
      { c: [C.trang], vi: 'trắng', en: 'white' }
    ] },
    du: { vi: 'Đũi', en: 'Linen', ways: [
      { c: [C.kem], vi: 'kem', en: 'cream' },
      { c: [C.be], vi: 'be', en: 'oat' },
      { c: [C.sage], vi: 'xanh sage', en: 'sage' },
      { c: [C.kraft], vi: 'nâu kraft', en: 'kraft' }
    ] },
    bo: { vi: 'Vải bò', en: 'Denim', ways: [
      { c: [C.boDam], vi: 'xanh đậm', en: 'dark wash' },
      { c: [C.boNhat], vi: 'xanh nhạt', en: 'light wash' },
      { c: [C.den], vi: 'đen', en: 'black' }
    ] },
    re: { vi: 'Ren', en: 'Lace', ways: [
      { c: [C.trang, C.kraft], vi: 'trắng', en: 'white' },
      { c: [C.kem, C.kraft], vi: 'kem', en: 'cream' },
      { c: [C.den, C.be], vi: 'đen', en: 'black' }
    ] },
    ca: { vi: 'Kẻ caro', en: 'Gingham', ways: [
      { c: [C.kem, C.sage], vi: 'xanh sage', en: 'sage' },
      { c: [C.kem, C.gach], vi: 'đỏ gạch', en: 'brick' },
      { c: [C.kem, C.navy], vi: 'xanh navy', en: 'navy' },
      { c: [C.kem, C.nau], vi: 'nâu', en: 'brown' }
    ] },
    cb: { vi: 'Chấm bi', en: 'Polka dot', ways: [
      { c: [C.kem, C.den], vi: 'kem chấm đen', en: 'black on cream' },
      { c: [C.den, C.trang], vi: 'đen chấm trắng', en: 'white on black' },
      { c: [C.sage, C.kem], vi: 'sage chấm kem', en: 'cream on sage' },
      { c: [C.hong, C.trang], vi: 'hồng chấm trắng', en: 'white on pink' },
      { c: [C.navy, C.trang], vi: 'navy chấm trắng', en: 'white on navy' },
      { c: [C.mutat, C.kem], vi: 'mù tạt chấm kem', en: 'cream on mustard' }
    ] },
    hn: { vi: 'Hoa nhí', en: 'Ditsy floral', ways: [
      { c: [C.kem, C.hong], vi: 'nền kem hoa hồng', en: 'pink on cream' },
      { c: [C.den, C.hoaDo], vi: 'nền đen hoa đỏ', en: 'red on black' },
      { c: [C.reu, C.kem], vi: 'nền rêu hoa kem', en: 'cream on moss' }
    ] },
    nt: { vi: 'Nhung tăm', en: 'Corduroy', ways: [
      { c: [C.nau], vi: 'nâu', en: 'brown' },
      { c: [C.reu], vi: 'xanh rêu', en: 'moss' },
      { c: [C.dodo], vi: 'đỏ đô', en: 'burgundy' }
    ] }
  };
  var MAT_ORDER = ['tr', 'du', 'bo', 're', 'ca', 'cb', 'hn', 'nt'];

  /* ======================================================================
     PRODUCTS — sku must exist in the products table (price comes from it)
     ====================================================================== */
  var PRODUCTS = {
    goi:       { sku: 'goi',       vi: 'Gối Chắp Sắc', en: 'Patchwork cushion', shape: 'cushion', cols: 3, rows: 3 },
    lotcoc:    { sku: 'lotcoc',    vi: 'Lót cốc',      en: 'Coaster',           shape: 'coaster', cols: 2, rows: 2 },
    scrunchie: { sku: 'scrunchie', vi: 'Dây buộc tóc', en: 'Scrunchie',         shape: 'scrunchie', cols: 1, rows: 1 }
  };
  var PRODUCT_ORDER = ['goi', 'lotcoc', 'scrunchie'];

  // "Để Gem chọn giúp": small families that always sit well together.
  var THEMES = [
    ['tr0', 'du0', 'ca0', 'hn2', 'cb2', 'du2'],
    ['bo0', 'bo1', 're1', 'du0', 'tr1', 'cb4'],
    ['cb3', 'hn0', 'tr4', 'du0', 're0', 'ca1'],
    ['nt0', 'du3', 'ca3', 'tr1', 'cb5', 'tr2'],
    ['hn1', 'cb0', 'tr8', 're2', 'tr1', 'ca2']
  ];

  /* ======================================================================
     CODE  <->  DESIGN
     ====================================================================== */
  function cellsOf(product) {
    var p = PRODUCTS[product];
    return p ? p.cols * p.rows : 0;
  }

  function validCell(code) {
    if (code === '--') return true;
    var m = /^([a-z]{2})(\d{1,2})$/.exec(code || '');
    return !!(m && MATERIALS[m[1]] && MATERIALS[m[1]].ways[+m[2]]);
  }

  // Returns { product, cells: ['bo0', null, …] } or null if anything is off.
  function parse(spec) {
    if (typeof spec !== 'string' || spec.length > 120) return null;
    var parts = spec.split('~');
    if (parts.length !== 2 || !PRODUCTS[parts[0]]) return null;
    var cells = parts[1].split('.');
    if (cells.length !== cellsOf(parts[0])) return null;
    for (var i = 0; i < cells.length; i++) if (!validCell(cells[i])) return null;
    return {
      product: parts[0],
      cells: cells.map(function (c) { return c === '--' ? null : c; })
    };
  }

  function encode(product, cells) {
    return product + '~' + cells.map(function (c) { return c || '--'; }).join('.');
  }

  function isComplete(d) {
    return !!d && d.cells.every(Boolean);
  }

  function lang() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  function cellName(code, l) {
    var m = MATERIALS[code.slice(0, 2)];
    var w = m.ways[+code.slice(2)];
    return m[l] + ' ' + w[l];
  }

  // Plain text, e.g. for the order note (Anna reads Vietnamese: pass 'vi').
  function describe(spec, l) {
    var d = parse(spec);
    if (!d) return '';
    l = l || lang();
    var p = PRODUCTS[d.product];
    var list = d.cells.map(function (c, i) {
      return (d.cells.length > 1 ? (i + 1) + ') ' : '') + (c ? cellName(c, l) : '—');
    });
    return p[l] + ': ' + list.join(', ');
  }

  /* ======================================================================
     PATTERNS — drawn as SVG, no image files
     ====================================================================== */
  function shade(hex, amt) {
    // amt > 0 lightens, < 0 darkens
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function patternBody(code) {
    var mat = code.slice(0, 2);
    var c = MATERIALS[mat].ways[+code.slice(2)].c;
    var base = c[0];
    switch (mat) {
      case 'tr':
        return { size: 8, body:
          '<rect width="8" height="8" fill="' + base + '"/>' +
          '<path d="M0 4h8M4 0v8" stroke="' + shade(base, -0.06) + '" stroke-width="0.6"/>' };
      case 'du':
        return { size: 40, body:
          '<rect width="40" height="40" fill="' + base + '"/>' +
          '<path d="M2 6h14M20 14h16M4 23h9M18 31h18M6 37h11" stroke="' + shade(base, -0.12) + '" stroke-width="1.2" stroke-linecap="round"/>' +
          '<path d="M24 4h10M8 16h8M26 24h10M2 30h10" stroke="' + shade(base, 0.25) + '" stroke-width="1" stroke-linecap="round"/>' };
      case 'bo':
        return { size: 6, body:
          '<rect width="6" height="6" fill="' + base + '"/>' +
          '<path d="M-1 1l2-2M0 6l6-6M5 7l2-2" stroke="' + shade(base, 0.22) + '" stroke-width="1.1"/>' };
      case 're':
        return { size: 24, body:
          '<rect width="24" height="24" fill="' + c[1] + '"/>' +
          '<rect width="24" height="24" fill="' + base + '" opacity="0.9"/>' +
          '<circle cx="12" cy="12" r="5" fill="' + c[1] + '"/>' +
          '<circle cx="12" cy="12" r="7.5" fill="none" stroke="' + c[1] + '" stroke-width="1" stroke-dasharray="2 2"/>' +
          '<circle cx="0" cy="0" r="2.4" fill="' + c[1] + '"/><circle cx="24" cy="0" r="2.4" fill="' + c[1] + '"/>' +
          '<circle cx="0" cy="24" r="2.4" fill="' + c[1] + '"/><circle cx="24" cy="24" r="2.4" fill="' + c[1] + '"/>' };
      case 'ca':
        return { size: 16, body:
          '<rect width="16" height="16" fill="' + base + '"/>' +
          '<rect width="8" height="16" fill="' + c[1] + '" opacity="0.45"/>' +
          '<rect width="16" height="8" fill="' + c[1] + '" opacity="0.45"/>' };
      case 'cb':
        return { size: 22, body:
          '<rect width="22" height="22" fill="' + base + '"/>' +
          '<circle cx="5.5" cy="5.5" r="3" fill="' + c[1] + '"/>' +
          '<circle cx="16.5" cy="16.5" r="3" fill="' + c[1] + '"/>' };
      case 'hn':
        var petal = function (x, y) {
          return '<g fill="' + c[1] + '">' +
            '<circle cx="' + x + '" cy="' + (y - 2.6) + '" r="2"/>' +
            '<circle cx="' + (x + 2.5) + '" cy="' + (y - 0.8) + '" r="2"/>' +
            '<circle cx="' + (x + 1.6) + '" cy="' + (y + 2.2) + '" r="2"/>' +
            '<circle cx="' + (x - 1.6) + '" cy="' + (y + 2.2) + '" r="2"/>' +
            '<circle cx="' + (x - 2.5) + '" cy="' + (y - 0.8) + '" r="2"/>' +
            '</g><circle cx="' + x + '" cy="' + y + '" r="1.2" fill="#D8A64A"/>';
        };
        return { size: 32, body:
          '<rect width="32" height="32" fill="' + base + '"/>' +
          '<ellipse cx="14" cy="9" rx="3.2" ry="1.4" fill="' + C.sage + '" transform="rotate(-30 14 9)"/>' +
          '<ellipse cx="25" cy="26" rx="3.2" ry="1.4" fill="' + C.sage + '" transform="rotate(25 25 26)"/>' +
          petal(8, 8) + petal(22, 22) };
      case 'nt':
        return { size: 7, body:
          '<rect width="7" height="7" fill="' + base + '"/>' +
          '<rect x="0" width="2.2" height="7" fill="' + shade(base, -0.22) + '"/>' +
          '<rect x="4" width="1" height="7" fill="' + shade(base, 0.18) + '"/>' };
    }
    return { size: 8, body: '<rect width="8" height="8" fill="' + C.kem + '"/>' };
  }

  var uid = 0;

  // defs for every code used, ids prefixed so several SVGs can share a page
  function defs(codes, prefix) {
    var seen = {};
    return codes.filter(function (c) {
      if (!c || seen[c]) return false;
      seen[c] = true;
      return true;
    }).map(function (c) {
      var p = patternBody(c);
      return '<pattern id="' + prefix + c + '" width="' + p.size + '" height="' + p.size +
        '" patternUnits="userSpaceOnUse">' + p.body + '</pattern>';
    }).join('');
  }

  function fill(code, prefix) {
    return code ? 'url(#' + prefix + code + ')' : C.kem;
  }

  var STITCH = '#8A6A44';

  /* Build the SVG for a design. opts.cellAttrs = true adds data-cell + a class
     on each patch so the designer can make them clickable; opts.sel marks one. */
  function svg(spec, opts) {
    opts = opts || {};
    var d = typeof spec === 'string' ? parse(spec) : spec;
    if (!d) return '';
    var p = PRODUCTS[d.product];
    var pre = 'gp' + (++uid) + '-';
    var title = opts.title ? '<title>' + opts.title + '</title>' : '';
    var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    var ca = function (i) {
      if (!opts.cellAttrs) return '';
      return ' data-cell="' + i + '" class="pt-cell' + (opts.sel === i ? ' is-sel' : '') +
        (d.cells[i] ? '' : ' is-empty') + '"';
    };

    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340"' + size +
      ' role="img">' + title + '<defs>' + defs(d.cells, pre) +
      '<radialGradient id="' + pre + 'puff" cx="45%" cy="40%" r="70%">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0.22"/>' +
        '<stop offset="1" stop-color="#3D4A2E" stop-opacity="0.16"/>' +
      '</radialGradient></defs>';

    if (p.shape === 'scrunchie') {
      var f0 = fill(d.cells[0], pre);
      // ruffled ring: a wavy outer edge around a soft hole
      var pts = [];
      for (var a = 0; a <= 360; a += 10) {
        var r = a % 20 === 0 ? 150 : 138;
        var rad = a * Math.PI / 180;
        pts.push((170 + r * Math.cos(rad)).toFixed(1) + ',' + (170 + r * Math.sin(rad)).toFixed(1));
      }
      var folds = '';
      for (var b = 0; b < 360; b += 20) {
        var rb = b * Math.PI / 180;
        folds += '<path d="M' + (170 + 66 * Math.cos(rb)).toFixed(1) + ' ' + (170 + 66 * Math.sin(rb)).toFixed(1) +
          ' L' + (170 + 140 * Math.cos(rb)).toFixed(1) + ' ' + (170 + 140 * Math.sin(rb)).toFixed(1) +
          '" stroke="#3D4A2E" stroke-opacity="0.18" stroke-width="2.5" stroke-linecap="round"/>';
      }
      out += '<g' + ca(0) + '>' +
        '<polygon points="' + pts.join(' ') + '" fill="' + f0 + '" stroke="' + STITCH + '" stroke-width="2"/>' +
        '<polygon points="' + pts.join(' ') + '" fill="url(#' + pre + 'puff)"/>' +
        folds +
        '</g>' +
        '<circle cx="170" cy="170" r="58" fill="#FBF6EE" stroke="' + STITCH + '" stroke-width="2"/>';
      return out + '</svg>';
    }

    var pad = p.shape === 'cushion' ? 26 : 34;
    var inner = 340 - pad * 2;
    var cw = inner / p.cols, chh = inner / p.rows;
    var rx = p.shape === 'cushion' ? 34 : 22;

    // Back panel / binding
    out += '<rect x="' + (pad - 12) + '" y="' + (pad - 12) + '" width="' + (inner + 24) + '" height="' + (inner + 24) +
      '" rx="' + (rx + 8) + '" fill="' + (p.shape === 'cushion' ? '#D8C7A8' : C.kraft) + '" stroke="' + STITCH + '" stroke-width="2"/>';
    out += '<clipPath id="' + pre + 'clip"><rect x="' + pad + '" y="' + pad + '" width="' + inner +
      '" height="' + inner + '" rx="' + rx + '"/></clipPath>';
    out += '<g clip-path="url(#' + pre + 'clip)">';
    for (var i = 0; i < d.cells.length; i++) {
      var x = pad + (i % p.cols) * cw, y = pad + Math.floor(i / p.cols) * chh;
      out += '<g' + ca(i) + '><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + cw.toFixed(1) +
        '" height="' + chh.toFixed(1) + '" fill="' + fill(d.cells[i], pre) + '"/>' +
        (d.cells[i] ? '' : '<path d="M' + (x + cw / 2 - 9) + ' ' + (y + chh / 2) + 'h18M' + (x + cw / 2) + ' ' +
          (y + chh / 2 - 9) + 'v18" stroke="' + STITCH + '" stroke-opacity="0.45" stroke-width="2.5" stroke-linecap="round"/>') +
        '</g>';
    }
    out += '<rect x="' + pad + '" y="' + pad + '" width="' + inner + '" height="' + inner +
      '" fill="url(#' + pre + 'puff)" pointer-events="none"/>';
    // seams
    var seams = '';
    for (var cx = 1; cx < p.cols; cx++) seams += 'M' + (pad + cx * cw).toFixed(1) + ' ' + pad + 'v' + inner;
    for (var ry = 1; ry < p.rows; ry++) seams += 'M' + pad + ' ' + (pad + ry * chh).toFixed(1) + 'h' + inner;
    if (seams) {
      out += '<path d="' + seams + '" stroke="' + STITCH + '" stroke-width="2" stroke-dasharray="6 5" pointer-events="none"/>';
    }
    out += '</g>';
    out += '<rect x="' + (pad + 7) + '" y="' + (pad + 7) + '" width="' + (inner - 14) + '" height="' + (inner - 14) +
      '" rx="' + (rx - 6) + '" fill="none" stroke="' + STITCH + '" stroke-width="1.6" stroke-dasharray="5 5" pointer-events="none"/>';

    // selection ring drawn last so it sits on top of seams
    if (opts.cellAttrs && typeof opts.sel === 'number' && opts.sel < d.cells.length) {
      var sx = pad + (opts.sel % p.cols) * cw, sy = pad + Math.floor(opts.sel / p.cols) * chh;
      out += '<rect x="' + (sx + 4) + '" y="' + (sy + 4) + '" width="' + (cw - 8) + '" height="' + (chh - 8) +
        '" rx="10" fill="none" stroke="#FBF6EE" stroke-width="5" pointer-events="none"/>' +
        '<rect x="' + (sx + 4) + '" y="' + (sy + 4) + '" width="' + (cw - 8) + '" height="' + (chh - 8) +
        '" rx="10" fill="none" stroke="#87965A" stroke-width="3" pointer-events="none"/>';
    }
    return out + '</svg>';
  }

  // Small round swatch for one colourway
  function swatch(code, px) {
    var pre = 'gs' + (++uid) + '-';
    px = px || 40;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="' + px + '" height="' + px + '" aria-hidden="true">' +
      '<defs>' + defs([code], pre) + '</defs>' +
      '<circle cx="20" cy="20" r="18" fill="url(#' + pre + code + ')" stroke="' + STITCH + '" stroke-width="1.5"/></svg>';
  }

  function randomFill(product) {
    var theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    var n = cellsOf(product);
    var pool = theme.slice().sort(function () { return Math.random() - 0.5; });
    var out = [];
    for (var i = 0; i < n; i++) out.push(pool[i % pool.length]);
    return out.sort(function () { return Math.random() - 0.5; });
  }

  window.GemPatch = {
    MATERIALS: MATERIALS,
    MAT_ORDER: MAT_ORDER,
    PRODUCTS: PRODUCTS,
    PRODUCT_ORDER: PRODUCT_ORDER,
    cellsOf: cellsOf,
    parse: parse,
    encode: encode,
    isComplete: isComplete,
    describe: describe,
    cellName: cellName,
    svg: svg,
    swatch: swatch,
    randomFill: randomFill,
    url: function (spec) {
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'studio.html?d=' + encodeURIComponent(spec);
    }
  };
})();
