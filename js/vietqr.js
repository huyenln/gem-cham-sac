// Gem Chạm Sắc — sinh mã VietQR ngay trong trình duyệt
//
// Vì sao tự viết thay vì dùng thư viện hay dịch vụ sinh QR sẵn:
// mã này mang số tài khoản, số tiền và mã đơn của khách. Gọi sang dịch vụ
// ngoài là đưa dữ liệu thanh toán cho bên thứ ba, và thêm một chỗ có thể
// chết vào đúng lúc khách đang đứng chờ trả tiền. File này không gọi mạng,
// không phụ thuộc gì, chạy được cả khi mất mạng.
//
// Cấu trúc chuỗi: chuẩn EMVCo (NAPAS bản địa hoá thành VietQR), ghép theo
// thẻ(2) + độ dài(2) + giá trị, kết thúc bằng CRC-16/CCITT-FALSE.
//
// Phần sinh ảnh QR bên dưới đã được đối chiếu từng ô với thư viện chuẩn
// (Python `qrcode`) — xem docs/design.md.

(function (root) {
  'use strict';

  /* ==================================================================
     1. CHUỖI EMVCo
     ================================================================== */

  function tlv(tag, value) {
    var len = String(value.length);
    while (len.length < 2) len = '0' + len;
    return tag + len + value;
  }

  // CRC-16/CCITT-FALSE: poly 0x1021, khởi tạo 0xFFFF, không đảo bit.
  // Giá trị kiểm tra chuẩn: "123456789" -> 0x29B1.
  function crc16(str) {
    var c = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      c ^= (str.charCodeAt(i) & 0xFF) << 8;
      for (var b = 0; b < 8; b++) {
        c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1);
        c &= 0xFFFF;
      }
    }
    var h = c.toString(16).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return h;
  }

  // Nội dung chuyển khoản: nhiều ngân hàng cắt dấu tiếng Việt và ký tự lạ,
  // nên chỉ giữ chữ, số và khoảng trắng. Mã đơn vốn đã là chữ HOA + số.
  function cleanRef(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .trim().slice(0, 25);
  }

  /**
   * @param {object} o
   *   bin      mã ngân hàng (Techcombank = 970407)
   *   account  số tài khoản
   *   amount   số tiền, đồng. Bỏ trống = QR tĩnh, khách tự nhập.
   *   ref      nội dung chuyển khoản, thường là mã đơn
   * @returns {string} chuỗi để mã hoá thành ảnh QR
   */
  function payload(o) {
    if (!o || !o.bin || !o.account) throw new Error('thiếu bin hoặc số tài khoản');

    var hasAmount = o.amount != null && o.amount > 0;

    // 38 = tài khoản người nhận, theo tổ chức chuyển mạch (NAPAS)
    var acc = tlv('00', 'A000000727') +
              tlv('01', tlv('00', String(o.bin)) + tlv('01', String(o.account))) +
              tlv('02', 'QRIBFTTA');            // chuyển khoản đến tài khoản

    var s = tlv('00', '01') +
            // 11 = QR dùng lại nhiều lần (tĩnh); 12 = QR cho một lần trả tiền
            tlv('01', hasAmount ? '12' : '11') +
            tlv('38', acc) +
            tlv('53', '704') +                  // tiền tệ: VND theo ISO 4217
            (hasAmount ? tlv('54', String(Math.round(o.amount))) : '') +
            tlv('58', 'VN');

    var ref = cleanRef(o.ref);
    if (ref) s += tlv('62', tlv('08', ref));    // 08 = nội dung chuyển khoản

    s += '6304';                                // thẻ CRC, dài 4, giá trị nối sau
    return s + crc16(s);
  }

  /* ==================================================================
     2. MÃ HOÁ QR — chế độ byte, mức sửa lỗi tuỳ chọn
     ================================================================== */

  // --- số học trên trường GF(256), dùng cho Reed-Solomon ---
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;                // đa thức sinh của QR
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = p.concat([0]);
      for (var j = 0; j < p.length; j++) q[j + 1] ^= gfMul(p[j], EXP[i]);
      p = q;
    }
    return p;
  }

  function rsRemainder(data, ecLen) {
    var gen = rsPoly(ecLen);
    var rem = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift(); rem.push(0);
      for (var j = 0; j < ecLen; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
    return rem;
  }

  /* Bảng dung lượng, phiên bản 1–20. Mỗi mức sửa lỗi có:
     [số byte sửa lỗi trên mỗi khối, số khối nhóm 1, số khối nhóm 2]
     Nhóm 2 (nếu có) mỗi khối nhiều hơn nhóm 1 đúng một byte. */
  var EC = { L: 0, M: 1, Q: 2, H: 3 };
  var BLOCKS = [
    /* v1  */ [[7,1,0],[10,1,0],[13,1,0],[17,1,0]],
    /* v2  */ [[10,1,0],[16,1,0],[22,1,0],[28,1,0]],
    /* v3  */ [[15,1,0],[26,1,0],[18,2,0],[22,2,0]],
    /* v4  */ [[20,1,0],[18,2,0],[26,2,0],[16,4,0]],
    /* v5  */ [[26,1,0],[24,2,0],[18,2,2],[22,2,2]],
    /* v6  */ [[18,2,0],[16,4,0],[24,4,0],[28,4,0]],
    /* v7  */ [[20,2,0],[18,4,0],[18,2,4],[26,4,1]],
    /* v8  */ [[24,2,0],[22,2,2],[22,4,2],[26,4,2]],
    /* v9  */ [[30,2,0],[22,3,2],[20,4,4],[24,4,4]],
    /* v10 */ [[18,2,2],[26,4,1],[24,6,2],[28,6,2]],
    /* v11 */ [[20,4,0],[30,1,4],[28,4,4],[24,3,8]],
    /* v12 */ [[24,2,2],[22,6,2],[26,4,6],[28,7,4]],
    /* v13 */ [[26,4,0],[22,8,1],[24,8,4],[22,12,4]],
    /* v14 */ [[30,3,1],[24,4,5],[20,11,5],[24,11,5]],
    /* v15 */ [[22,5,1],[24,5,5],[30,5,7],[24,11,7]],
    /* v16 */ [[24,5,1],[28,7,3],[24,15,2],[30,3,13]],
    /* v17 */ [[28,1,5],[28,10,1],[28,1,15],[28,2,17]],
    /* v18 */ [[30,5,1],[26,9,4],[28,17,1],[28,2,19]],
    /* v19 */ [[28,3,4],[26,3,11],[26,17,4],[26,9,16]],
    /* v20 */ [[28,3,5],[26,3,13],[30,15,5],[28,15,10]]
  ];

  // Tổng số byte (dữ liệu + sửa lỗi) của mỗi phiên bản
  var TOTAL_BYTES = [
    26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
    404, 466, 532, 581, 655, 733, 815, 901, 991, 1085
  ];

  var ALIGN = [
    [], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42], [6,26,46],
    [6,28,50], [6,30,54], [6,32,58], [6,34,62], [6,26,46,66], [6,26,48,70],
    [6,26,50,74], [6,30,54,78], [6,30,56,82], [6,30,58,86], [6,34,62,90]
  ];

  function blockInfo(version, ecl) {
    var b = BLOCKS[version - 1][EC[ecl]];
    var ecLen = b[0], g1 = b[1], g2 = b[2];
    var totalBlocks = g1 + g2;
    var dataBytes = TOTAL_BYTES[version - 1] - ecLen * totalBlocks;
    var g1Len = Math.floor(dataBytes / totalBlocks);
    return { ecLen: ecLen, g1: g1, g2: g2, g1Len: g1Len, g2Len: g1Len + 1, dataBytes: dataBytes };
  }

  function capacity(version, ecl) {
    var info = blockInfo(version, ecl);
    // 4 bit chỉ chế độ + 8 hoặc 16 bit chỉ độ dài
    var lenBits = version < 10 ? 8 : 16;
    return info.dataBytes - 2 - (lenBits === 16 ? 1 : 0);
  }

  function pickVersion(byteLen, ecl) {
    for (var v = 1; v <= 20; v++) if (capacity(v, ecl) >= byteLen) return v;
    throw new Error('chuỗi quá dài cho QR phiên bản 20');
  }

  function toBytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function buildCodewords(str, version, ecl) {
    var data = toBytes(str);
    var info = blockInfo(version, ecl);
    var lenBits = version < 10 ? 8 : 16;

    var bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); }

    push(4, 4);                        // chế độ byte
    push(data.length, lenBits);
    data.forEach(function (b) { push(b, 8); });

    // Dấu kết thúc: tối đa 4 bit 0, và chỉ khi còn chỗ
    var capBits = info.dataBytes * 8;
    var pad = Math.min(4, capBits - bits.length);
    for (var i = 0; i < pad; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);

    var words = [];
    for (i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      words.push(v);
    }
    // Đệm cho đầy bằng hai byte luân phiên theo chuẩn
    var PAD = [0xEC, 0x11], k = 0;
    while (words.length < info.dataBytes) words.push(PAD[k++ % 2]);

    // Chia khối, tính sửa lỗi cho từng khối
    var dataBlocks = [], ecBlocks = [], pos = 0;
    for (i = 0; i < info.g1 + info.g2; i++) {
      var n = i < info.g1 ? info.g1Len : info.g2Len;
      var blk = words.slice(pos, pos + n); pos += n;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, info.ecLen));
    }

    // Trộn xen kẽ: lấy byte thứ i của mọi khối, rồi mới sang byte thứ i+1
    var out = [];
    for (i = 0; i < info.g2Len; i++) {
      dataBlocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
    }
    for (i = 0; i < info.ecLen; i++) {
      ecBlocks.forEach(function (b) { out.push(b[i]); });
    }
    return out;
  }

  /* --- dựng ma trận --- */

  function newMatrix(size) {
    var m = [];
    for (var i = 0; i < size; i++) m.push(new Array(size).fill(null));
    return m;
  }

  function placeFinder(m, r, c) {
    for (var i = -1; i <= 7; i++) {
      for (var j = -1; j <= 7; j++) {
        var rr = r + i, cc = c + j;
        if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
        var on = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                 (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
                 (i >= 2 && i <= 4 && j >= 2 && j <= 4);
        m[rr][cc] = on ? 1 : 0;
      }
    }
  }

  function placeAlignment(m, version) {
    var pos = ALIGN[version - 1], size = m.length;
    for (var a = 0; a < pos.length; a++) {
      for (var b = 0; b < pos.length; b++) {
        var r = pos[a], c = pos[b];
        // bỏ ba góc đã có ô định vị
        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
        for (var i = -2; i <= 2; i++) {
          for (var j = -2; j <= 2; j++) {
            m[r + i][c + j] = (Math.max(Math.abs(i), Math.abs(j)) !== 1) ? 1 : 0;
          }
        }
      }
    }
  }

  function placeTiming(m) {
    for (var i = 8; i < m.length - 8; i++) {
      var on = (i % 2 === 0) ? 1 : 0;
      if (m[6][i] === null) m[6][i] = on;
      if (m[i][6] === null) m[i][6] = on;
    }
  }

  // Vùng dành cho thông tin định dạng — đánh dấu trước để không ghi dữ liệu vào
  function reserveFormat(m) {
    var size = m.length;
    for (var i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = 0;
      if (m[i][8] === null) m[i][8] = 0;
    }
    for (i = 0; i < 8; i++) {
      if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = 0;
      if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = 0;
    }
    m[size - 8][8] = 1;                 // ô tối cố định
  }

  function reserveVersion(m, version) {
    if (version < 7) return;
    var size = m.length;
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < 3; j++) {
        m[size - 11 + j][i] = 0;
        m[i][size - 11 + j] = 0;
      }
    }
  }

  function maskFn(n, r, c) {
    switch (n) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  // Đi zigzag từ góc dưới phải sang trái, hai cột một, bỏ cột số 6 (vạch nhịp)
  function placeData(m, words, mask) {
    var size = m.length, bitIdx = 0, up = true;
    for (var right = size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;
      for (var v = 0; v < size; v++) {
        var r = up ? size - 1 - v : v;
        for (var k = 0; k < 2; k++) {
          var c = right - k;
          if (m[r][c] !== null) continue;
          var bit = 0;
          if (bitIdx < words.length * 8) {
            bit = (words[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
          }
          bitIdx++;
          m[r][c] = (bit ^ (maskFn(mask, r, c) ? 1 : 0));
        }
      }
      up = !up;
    }
  }

  var FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  function formatInfo(ecl, mask) {
    var data = (FORMAT_BITS[ecl] << 3) | mask;
    var rem = data << 10;
    for (var i = 14; i >= 10; i--) {
      if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);   // đa thức BCH
    }
    return ((data << 10) | rem) ^ 0x5412;             // mặt nạ cố định
  }

  function placeFormat(m, ecl, mask) {
    var bits = formatInfo(ecl, mask), size = m.length;
    for (var i = 0; i < 15; i++) {
      var b = (bits >> i) & 1;
      // bản sao 1: quanh ô định vị góc trên trái
      if (i < 6)       m[i][8] = b;
      else if (i < 8)  m[i + 1][8] = b;
      else if (i === 8) m[8][7] = b;
      else             m[8][14 - i] = b;
      // bản sao 2: chia đôi ở hai ô định vị còn lại
      if (i < 8) m[8][size - 1 - i] = b;
      else       m[size - 15 + i][8] = b;
    }
  }

  function placeVersion(m, version) {
    if (version < 7) return;
    var rem = version << 12;
    for (var i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= 0x1F25 << (i - 12);
    }
    var bits = (version << 12) | rem, size = m.length;
    for (i = 0; i < 18; i++) {
      var b = (bits >> i) & 1;
      var r = Math.floor(i / 3), c = i % 3;
      m[size - 11 + c][r] = b;
      m[r][size - 11 + c] = b;
    }
  }

  /* --- chấm điểm để chọn mặt nạ, theo bốn tiêu chí của chuẩn --- */
  function penalty(m) {
    var size = m.length, score = 0, i, j, run, prev;

    // 1: năm ô cùng màu liền nhau trở lên
    for (i = 0; i < size; i++) {
      for (var dir = 0; dir < 2; dir++) {
        run = 1; prev = -1;
        for (j = 0; j < size; j++) {
          var v = dir ? m[j][i] : m[i][j];
          if (v === prev) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
          else { run = 1; prev = v; }
        }
      }
    }
    // 2: khối 2×2 cùng màu
    for (i = 0; i < size - 1; i++) {
      for (j = 0; j < size - 1; j++) {
        var a = m[i][j];
        if (a === m[i][j + 1] && a === m[i + 1][j] && a === m[i + 1][j + 1]) score += 3;
      }
    }
    // 3: mẫu 1:1:3:1:1 dễ bị nhầm với ô định vị
    var P1 = [1,0,1,1,1,0,1,0,0,0,0], P2 = [0,0,0,0,1,0,1,1,1,0,1];
    function match(arr, pat) {
      for (var k = 0; k < 11; k++) if (arr[k] !== pat[k]) return false;
      return true;
    }
    for (i = 0; i < size; i++) {
      for (j = 0; j <= size - 11; j++) {
        var rowSeg = [], colSeg = [];
        for (var k = 0; k < 11; k++) { rowSeg.push(m[i][j + k]); colSeg.push(m[j + k][i]); }
        if (match(rowSeg, P1) || match(rowSeg, P2)) score += 40;
        if (match(colSeg, P1) || match(colSeg, P2)) score += 40;
      }
    }
    // 4: lệch cân bằng đen/trắng
    var dark = 0;
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (m[i][j]) dark++;
    var pct = dark * 100 / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /**
   * Sinh ma trận QR.
   * @returns {number[][]} mảng 2 chiều, 1 = ô tối
   */
  function matrix(str, opts) {
    opts = opts || {};
    var ecl = opts.ecl || 'M';
    var version = opts.version || pickVersion(toBytes(str).length, ecl);
    var words = buildCodewords(str, version, ecl);
    var size = version * 4 + 17;

    var best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var m = newMatrix(size);
      placeFinder(m, 0, 0);
      placeFinder(m, 0, size - 7);
      placeFinder(m, size - 7, 0);
      placeAlignment(m, version);
      placeTiming(m);
      reserveFormat(m);
      reserveVersion(m, version);
      placeData(m, words, mask);
      placeFormat(m, ecl, mask);
      placeVersion(m, version);

      if (opts.mask != null) { if (mask === opts.mask) return m; continue; }
      var s = penalty(m);
      if (s < bestScore) { bestScore = s; best = m; }
    }
    return best;
  }

  /** Vẽ ma trận thành SVG. Không dùng ảnh nhị phân nên phóng to bao nhiêu cũng nét. */
  function svg(str, opts) {
    opts = opts || {};
    var m = matrix(str, opts);
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var n = m.length, total = n + quiet * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (m[r][c]) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'Mã QR thanh toán') + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="#ffffff"/>' +
      '<path d="' + d + '" fill="#000000"/></svg>';
  }

  root.GemVietQR = {
    payload: payload,
    crc16: crc16,
    cleanRef: cleanRef,
    matrix: matrix,
    svg: svg
  };
})(typeof window !== 'undefined' ? window : globalThis);
