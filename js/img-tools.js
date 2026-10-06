// Gem Chạm Sắc — image tools that run in the browser, before an upload.
//
//   GemImg.shrink(src, opts)      -> Promise<File>  max 1280px, WebP (~100–150 KB);
//                                    opts.alpha: keep transparency + cut see-through margins
//   GemImg.thumb(src, size)       -> Promise<File>  square centre crop (600px)
//   GemImg.removeWhite(src, opts) -> Promise<File>  white paper/background -> transparent
//   GemImg.size(src)              -> Promise<{w, h}>
//
// `src` is a File/Blob or an image URL. A URL from another site must send
// CORS headers (Supabase Storage does), otherwise the canvas refuses to export.
// Older Safari can't encode WebP; it then falls back to JPEG (or PNG when the
// picture has transparency).

window.GemImg = (function () {
  'use strict';

  var MAX = 1280;
  var QUALITY = 0.82;

  function load(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = null;
      if (typeof src !== 'string') { url = URL.createObjectURL(src); }
      else if (!/^(data:|blob:)/.test(src)) { img.crossOrigin = 'anonymous'; }
      img.onload = function () { if (url) URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () {
        if (url) URL.revokeObjectURL(url);
        reject(new Error('Không đọc được ảnh này (thử JPG / PNG / WebP).'));
      };
      img.src = url || src;
    });
  }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function fit(w, h, max) {
    var k = Math.min(1, max / Math.max(w, h));
    return { w: Math.round(w * k), h: Math.round(h * k) };
  }

  function baseName(src) {
    var n = typeof src === 'string' ? src.split('/').pop().split('?')[0] : (src.name || 'anh');
    return n.replace(/\.[a-z0-9]+$/i, '') || 'anh';
  }

  function toBlob(c, type, q) {
    return new Promise(function (resolve) { c.toBlob(resolve, type, q); });
  }

  // WebP first; if the browser hands back something else, JPEG for opaque
  // pictures and PNG when transparency has to survive.
  function encode(c, name, alpha) {
    return toBlob(c, 'image/webp', QUALITY).then(function (b) {
      if (b && b.type === 'image/webp') return b;
      return alpha ? toBlob(c, 'image/png') : toBlob(c, 'image/jpeg', 0.85);
    }).then(function (b) {
      if (!b) throw new Error('Trình duyệt không xuất được ảnh.');
      var ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[b.type] || 'img';
      return new File([b], name + '.' + ext, { type: b.type });
    });
  }

  function size(src) {
    return load(src).then(function (img) { return { w: img.naturalWidth, h: img.naturalHeight }; });
  }

  // Cut away see-through margins (a cut-out exported on a big empty canvas),
  // keeping a small edge. A picture with no transparency comes back as is.
  function trim(c) {
    var W = c.width, H = c.height, px = c.getContext('2d').getImageData(0, 0, W, H).data;
    var minX = W, minY = H, maxX = -1, maxY = -1;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (px[(y * W + x) * 4 + 3] > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return c;
    var pad = Math.round(Math.max(W, H) * 0.01);
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
    if (maxX - minX + 1 >= W - 2 && maxY - minY + 1 >= H - 2) return c;   // nothing worth cutting
    var out = canvas(maxX - minX + 1, maxY - minY + 1);
    out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function shrink(src, opts) {
    opts = opts || {};
    var max = opts.max || MAX;
    return load(src).then(function (img) {
      var d = fit(img.naturalWidth, img.naturalHeight, max);
      var c = canvas(d.w, d.h);
      var g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, d.w, d.h);
      if (opts.alpha) c = trim(c);
      return encode(c, baseName(src), !!opts.alpha);
    });
  }

  function thumb(src, side) {
    side = side || 600;
    return load(src).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h);
      var out = Math.min(side, s);
      var c = canvas(out, out);
      var g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, out, out);
      return encode(c, baseName(src) + '-thumb', false);
    });
  }

  // Flood fill from the picture's edges over pixels close to the background
  // colour (estimated from the bright border pixels, so slightly grey or warm
  // paper works too). Only background *connected to the edge* goes — white
  // inside the product (a white flower, a label) stays. The ring just past
  // the fill gets partial transparency so the edge isn't jagged, then the
  // result is trimmed to the product with a small margin.
  //   opts.tol  0–100, how far from the paper colour still counts as paper (default 28)
  function removeWhite(src, opts) {
    opts = opts || {};
    var tol = Math.max(4, Math.min(100, opts.tol == null ? 28 : opts.tol)) * 2.55 * 0.6;
    return load(src).then(function (img) {
      var d = fit(img.naturalWidth, img.naturalHeight, opts.max || MAX);
      var W = d.w, H = d.h;
      var c = canvas(W, H);
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, W, H);
      var data = g.getImageData(0, 0, W, H);
      var px = data.data;
      var N = W * H;

      // Paper colour: average of the border pixels brighter than mid-grey.
      var sr = 0, sg = 0, sb = 0, sn = 0;
      function sample(i) {
        var o = i * 4;
        if (px[o + 3] > 0 && px[o] + px[o + 1] + px[o + 2] > 384) {
          sr += px[o]; sg += px[o + 1]; sb += px[o + 2]; sn++;
        }
      }
      for (var x = 0; x < W; x++) { sample(x); sample((H - 1) * W + x); }
      for (var y = 0; y < H; y++) { sample(y * W); sample(y * W + W - 1); }
      var br = sn ? sr / sn : 255, bg = sn ? sg / sn : 255, bb = sn ? sb / sn : 255;

      var dist = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        var o = i * 4;
        dist[i] = px[o + 3] === 0 ? 0 : Math.max(
          Math.abs(px[o] - br), Math.abs(px[o + 1] - bg), Math.abs(px[o + 2] - bb));
      }

      // 1 = background
      var bgMask = new Uint8Array(N);
      var stack = new Int32Array(N);
      var sp = 0;
      function seed(i) { if (!bgMask[i] && dist[i] < tol) { bgMask[i] = 1; stack[sp++] = i; } }
      for (x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
      for (y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
      while (sp) {
        var p = stack[--sp], px0 = p % W;
        if (px0 > 0) seed(p - 1);
        if (px0 < W - 1) seed(p + 1);
        if (p >= W) seed(p - W);
        if (p < N - W) seed(p + W);
      }

      var minX = W, minY = H, maxX = -1, maxY = -1;
      for (i = 0; i < N; i++) {
        o = i * 4;
        if (bgMask[i]) { px[o + 3] = 0; continue; }
        var xx = i % W, yy = (i / W) | 0;
        var edge = (xx > 0 && bgMask[i - 1]) || (xx < W - 1 && bgMask[i + 1]) ||
                   (i >= W && bgMask[i - W]) || (i < N - W && bgMask[i + W]);
        if (edge && dist[i] < tol * 2) {
          var a = (dist[i] - tol) / tol;              // 0 at the paper, 1 at the product
          px[o + 3] = Math.round(px[o + 3] * Math.max(0.15, Math.min(1, a)));
        }
        if (px[o + 3] > 8) {
          if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
          if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
        }
      }
      if (maxX < 0) throw new Error('Xoá hết cả ảnh rồi — giảm mức xoá xuống thử nhé.');
      g.putImageData(data, 0, 0);

      var pad = Math.round(Math.max(W, H) * 0.02);
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
      var out = canvas(maxX - minX + 1, maxY - minY + 1);
      out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return encode(out, baseName(src) + '-cut', true);
    });
  }

  return { shrink: shrink, thumb: thumb, removeWhite: removeWhite, size: size, load: load };
})();
