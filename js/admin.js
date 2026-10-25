// Gem Chạm Sắc — trang quản trị
//
// Thiết kế cho ĐIỆN THOẠI trước, không phải máy tính: người dùng đứng ở cửa
// hàng, mở giữa lúc đang gói hàng. Nên nút to, ít gõ chữ, đổi trạng thái bằng
// một lần bấm, và mọi số điện thoại đều bấm gọi / mở Zalo được ngay.
//
// Bảo mật thật nằm ở RLS trong database, không phải ở màn đăng nhập này.
// File này công khai như mọi file khác — ai tải về cũng không đọc được gì
// nếu chưa đăng nhập bằng tài khoản có trong bảng staff.

(function () {
  'use strict';

  var VN_TZ = 'Asia/Ho_Chi_Minh';
  var DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  var BK_STATUS = {
    held:      { label: 'Giữ chỗ',    cls: 'held' },
    confirmed: { label: 'Đã xác nhận', cls: 'ok' },
    attended:  { label: 'Đã đến',     cls: 'ok' },
    no_show:   { label: 'Không đến',  cls: 'bad' },
    cancelled: { label: 'Đã huỷ',     cls: 'off' }
  };

  // Vòng đời đơn hàng. Nút "tiếp theo" là bước hay bấm nhất ở mỗi trạng thái,
  // để em gái đang gói hàng chỉ phải chạm một lần.
  var OD_STATUS = {
    'new':       { label: 'Mới',         cls: 'held', next: 'confirmed', nextLabel: 'Đã xác nhận' },
    'confirmed': { label: 'Đã xác nhận', cls: 'ok',   next: 'packing',   nextLabel: 'Đang gói' },
    'packing':   { label: 'Đang gói',    cls: 'ok',   next: 'shipped',   nextLabel: 'Đã gửi' },
    'shipped':   { label: 'Đã gửi',      cls: 'ok',   next: 'done',      nextLabel: 'Xong' },
    'done':      { label: 'Xong',        cls: 'off' },
    'cancelled': { label: 'Đã huỷ',      cls: 'bad' }
  };
  var OD_OPEN = ['new', 'confirmed', 'packing', 'shipped'];

  var CATEGORIES = {
    'vai-vun': 'Phụ kiện vải vụn',
    'vpp':     'Văn phòng phẩm',
    'gom':     'Gốm sứ Nhật',
    'set-qua': 'Set quà tặng',
    'ky-gui':  'Hàng ký gửi'
  };

  var el = {};
  var me = null;
  var sessions = [];
  var orders = [];
  var products = [];
  var posts = [];
  var notes = [];
  var noteFilter = 'pending';   // pending | approved | hidden
  var wtypes = [];
  var editingProduct = null;
  var editingPricing = false;   // Sản phẩm → Giá thiết kế (owner)
  var fabrics = [];             // Kho vải, each with fabric_private.place
  var fabFilter = 'all';        // all | <tone> | out | hidden
  var editingFabric = null;     // null = xem kho, {} = tấm mới, {…} = sửa tấm
  var editingPost = null;   // null = xem danh sách, {} = bài mới, {…} = sửa bài
  var tab = 'today';
  var orderFilter = 'open';   // open | done | all

  /* ---------- tiện ích ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function vn(iso) {
    var p = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: VN_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
    var dow = new Date(p.year + '-' + p.month + '-' + p.day + 'T12:00:00Z').getUTCDay();
    return {
      ymd: p.year + '-' + p.month + '-' + p.day,
      date: p.day + '/' + p.month,
      time: p.hour + ':' + p.minute,
      dow: DAYS[dow]
    };
  }

  function todayVN() {
    var p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day;
  }

  // Cộng/trừ ngày trên chuỗi YYYY-MM-DD. Dựng Date ở 12:00Z cho chắc — nửa
  // đêm dễ trượt sang ngày khác khi đổi múi giờ.
  function addDaysYmd(ymd, n) {
    var d = new Date(ymd + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function dm(ymd) { return ymd.slice(8, 10) + '/' + ymd.slice(5, 7); }

  // Số điện thoại là thao tác dùng nhiều nhất ở đây — luôn bấm được
  function phoneLinks(phone) {
    var digits = String(phone).replace(/[^\d+]/g, '');
    var zalo = digits.replace(/^0/, '84').replace(/^\+/, '');
    return '<span class="ad-phone">' +
      '<a href="tel:' + esc(digits) + '" class="ad-tel">' + esc(phone) + '</a>' +
      '<a href="https://zalo.me/' + esc(zalo) + '" target="_blank" rel="noopener" class="ad-zalo">Zalo</a>' +
    '</span>';
  }

  function seatsTaken(s) {
    return (s.bookings || []).reduce(function (n, b) {
      return n + (b.status === 'cancelled' ? 0 : b.seats);
    }, 0);
  }

  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className = 'ad-toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- đăng nhập ---------- */
  function renderLogin(msg) {
    el.root.innerHTML =
      '<div class="ad-login">' +
        '<img src="images/logo/gem_logo_icon_120.png" alt="" width="56" height="56">' +
        '<h1>Quản trị Gem</h1>' +
        '<form class="ad-login-form">' +
          '<label>Email<input type="email" name="email" autocomplete="username" required></label>' +
          '<label>Mật khẩu<input type="password" name="password" autocomplete="current-password" required></label>' +
          '<button type="submit" class="btn btn-primary">Đăng nhập</button>' +
          (msg ? '<p class="ad-err">' + esc(msg) + '</p>' : '') +
        '</form>' +
      '</div>';
    el.root.querySelector('.ad-login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target.elements;
      var btn = e.target.querySelector('button');
      btn.disabled = true; btn.textContent = 'Đang vào...';
      window.GemDB.signIn(f['email'].value.trim(), f['password'].value)
        .then(boot)
        .catch(function (err) { renderLogin(err.message || 'Sai email hoặc mật khẩu.'); });
    });
  }

  /* ---------- khung ---------- */
  function renderShell() {
    el.root.innerHTML =
      '<header class="ad-top">' +
        '<div class="ad-top-row">' +
          '<span class="ad-brand">Quản trị Gem</span>' +
          '<button type="button" class="ad-out">Thoát</button>' +
        '</div>' +
        '<nav class="ad-tabs">' +
          '<button type="button" data-tab="today">Hôm nay</button>' +
          '<button type="button" data-tab="orders">Đơn hàng</button>' +
          '<button type="button" data-tab="sessions">Đặt lịch</button>' +
          '<button type="button" data-tab="products">Sản phẩm</button>' +
          '<button type="button" data-tab="fabrics">Kho vải</button>' +
          '<button type="button" data-tab="posts">Bản tin</button>' +
          '<button type="button" data-tab="notes">Lời nhắn</button>' +
          // Only the owner may change the studio (RLS enforces it too).
          (me && me.role === 'owner' && window.GemStudioEditor
            ? '<button type="button" data-tab="studio">Lắp studio</button>' : '') +
        '</nav>' +
      '</header>' +
      '<main class="ad-main"><p class="ad-loading">Đang tải...</p></main>';

    el.main = el.root.querySelector('.ad-main');
    el.root.querySelector('.ad-out').addEventListener('click', function () {
      window.GemDB.signOut();
      renderLogin();
    });
    el.root.querySelectorAll('.ad-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (tab === 'studio' && window.GemStudioEditor && window.GemStudioEditor.isDirty() &&
            !window.confirm('Bố cục studio có thay đổi chưa lưu. Rời đi?')) return;
        tab = b.getAttribute('data-tab');
        el.main.classList.toggle('is-wide', tab === 'studio');
        editingPost = null;
        editingProduct = null;
        editingPricing = false;
        editingFabric = null;
        paintTabs();
        el.main.innerHTML = '<p class="ad-loading">Đang tải...</p>';
        load();          // mỗi tab lấy dữ liệu riêng, không nạp sẵn tất cả
      });
    });
    paintTabs();
  }

  function paintTabs() {
    el.root.querySelectorAll('.ad-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
  }

  // Việc tồn hiện ngay trên tab, để mở trang là thấy, không phải bấm từng tab.
  function paintCounts() {
    if (!window.GemDB.adminCounts) return;
    window.GemDB.adminCounts().then(function (c) {
      el.root.querySelectorAll('.ad-tabs button').forEach(function (b) {
        var n = c[b.getAttribute('data-tab')] || 0;
        var badge = b.querySelector('.ad-tab-count');
        if (!n) { if (badge) badge.remove(); return; }
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'ad-tab-count';
          b.appendChild(badge);
        }
        badge.textContent = n > 99 ? '99+' : String(n);
      });
    });
  }

  /* ---------- thẻ một người đã đặt ---------- */
  function bookingRow(b) {
    var st = BK_STATUS[b.status] || BK_STATUS.held;
    return '<li class="ad-bk' + (b.status === 'cancelled' ? ' is-off' : '') + '" data-id="' + esc(b.id) + '">' +
      '<div class="ad-bk-main">' +
        '<span class="ad-bk-name">' + esc(b.name) +
          (b.seats > 1 ? ' <em>· ' + b.seats + ' người</em>' : '') + '</span>' +
        phoneLinks(b.phone) +
        (b.note ? '<span class="ad-bk-note">' + esc(b.note) + '</span>' : '') +
        '<span class="ad-code">' + esc(b.code) + '</span>' +
      '</div>' +
      '<div class="ad-bk-side">' +
        '<span class="ad-chip ' + st.cls + '">' + st.label + '</span>' +
        '<div class="ad-bk-act">' +
          (b.status === 'held' ? '<button type="button" data-act="confirmed">Đã xác nhận</button>' : '') +
          (b.status === 'held' || b.status === 'confirmed'
            ? '<button type="button" data-act="attended">Đã đến</button>' +
              '<button type="button" data-act="no_show">Không đến</button>' : '') +
          (b.status !== 'cancelled'
            ? '<button type="button" data-act="cancelled" class="danger">Huỷ</button>'
            : '<button type="button" data-act="held">Mở lại</button>') +
        '</div>' +
      '</div>' +
    '</li>';
  }

  function wireBookingActions(scope) {
    scope.querySelectorAll('.ad-bk').forEach(function (li) {
      var id = li.getAttribute('data-id');
      li.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var next = btn.getAttribute('data-act');
          btn.disabled = true;
          window.GemDB.updateBooking(id, { status: next })
            .then(function () { toast('Đã cập nhật'); return load(); })
            .catch(function () { btn.disabled = false; toast('Không lưu được', true); });
        });
      });
    });
  }

  /* ---------- HÔM NAY ---------- */
  function renderToday() {
    var today = todayVN();
    var mine = sessions.filter(function (s) { return vn(s.starts_at).ymd === today; });
    var soon = sessions.filter(function (s) {
      var d = vn(s.starts_at).ymd;
      return d > today;
    }).slice(0, 3);

    var html = '';

    if (!mine.length) {
      html += '<div class="ad-empty"><p>Hôm nay không có buổi nào.</p></div>';
    } else {
      html += mine.map(sessionBlock).join('');
    }

    // ai đang chờ xác nhận, gom hết lại — việc chính mỗi ngày
    var waiting = [];
    sessions.forEach(function (s) {
      (s.bookings || []).forEach(function (b) {
        if (b.status === 'held') waiting.push({ s: s, b: b });
      });
    });

    if (waiting.length) {
      html += '<section class="ad-sec">' +
        '<h2>Chờ xác nhận <span class="ad-count">' + waiting.length + '</span></h2>' +
        '<p class="ad-hint">Nhắn Zalo cho khách trước buổi học một ngày, rồi bấm “Đã xác nhận”.</p>' +
        '<ul class="ad-bks">' + waiting.map(function (w) {
          var t = vn(w.s.starts_at);
          return bookingRow(w.b).replace('</div>\n      <div class="ad-bk-side">',
            '<span class="ad-bk-when">' + t.dow + ' ' + t.date + ' · ' + t.time + '</span></div><div class="ad-bk-side">');
        }).join('') + '</ul>' +
      '</section>';
    }

    if (soon.length) {
      html += '<section class="ad-sec"><h2>Sắp tới</h2>' +
        '<ul class="ad-next">' + soon.map(function (s) {
          var t = vn(s.starts_at);
          return '<li><span>' + t.dow + ' ' + t.date + ' · ' + t.time + '</span>' +
                 '<span>' + esc(s.workshop_types ? s.workshop_types.name_vi : '') + '</span>' +
                 '<span class="ad-seat">' + seatsTaken(s) + '/' + s.capacity + '</span></li>';
        }).join('') + '</ul></section>';
    }

    el.main.innerHTML = html;
    wireBookingActions(el.main);
  }

  /* ---------- một buổi học ---------- */
  function sessionBlock(s) {
    var t = vn(s.starts_at);
    var taken = seatsTaken(s);
    var live = (s.bookings || []).filter(function (b) { return b.status !== 'cancelled'; });
    return '<section class="ad-sess" data-id="' + esc(s.id) + '">' +
      '<div class="ad-sess-head">' +
        '<div>' +
          '<h2>' + esc(s.workshop_types ? s.workshop_types.name_vi : 'Buổi học') + '</h2>' +
          '<p>' + t.dow + ' ' + t.date + ' · ' + t.time +
            (s.workshop_types ? ' · ' + s.workshop_types.duration_minutes + ' phút' : '') + '</p>' +
        '</div>' +
        '<span class="ad-seat' + (taken >= s.capacity ? ' full' : '') + '">' +
          taken + '/' + s.capacity + ' chỗ</span>' +
      '</div>' +
      (live.length
        ? '<ul class="ad-bks">' + live.map(bookingRow).join('') + '</ul>'
        : '<p class="ad-hint">Chưa ai đặt buổi này.</p>') +
    '</section>';
  }

  /* ---------- ĐẶT LỊCH ---------- */
  /* ---------- loại workshop ----------
     Nằm ngay dưới lịch trong cùng tab: chúng đi liền nhau (muốn thêm buổi thì
     phải có loại), mà thêm một tab nữa thì thanh tab trên điện thoại đã chật. */
  function wtypesHTML() {
    return '<details class="ad-wtypes">' +
      '<summary><b>Loại workshop</b> <span class="ad-count">' + wtypes.length + '</span></summary>' +
      '<div class="ad-fold-body">' +
        '<p class="ad-hint">Mỗi buổi trên lịch thuộc về một loại. Sửa ở đây là ' +
        'đổi cho mọi buổi cùng loại. Để trống giá thì web hiện “Liên hệ”.</p>' +
        wtypes.map(function (t) {
          return '<div class="ad-wt' + (t.is_published === false ? ' is-hidden' : '') +
                 '" data-id="' + esc(t.id) + '">' +
            '<div class="ad-f-row">' +
              '<label class="ad-f"><span>Tên (VI)</span><input class="wt-vi"></label>' +
              '<label class="ad-f"><span>Tên (EN)</span><input class="wt-en"></label>' +
            '</div>' +
            '<label class="ad-f"><span>Mô tả ngắn — hiện ở thẻ ngoài danh sách</span>' +
              '<textarea class="wt-dvi" rows="2"></textarea></label>' +
            '<label class="ad-f"><span>Giới thiệu dài — cách đoạn bằng một dòng trống</span>' +
              '<textarea class="wt-long" rows="7"></textarea></label>' +
            '<label class="ad-f"><span>Bạn sẽ làm gì — mỗi dòng một ý</span>' +
              '<textarea class="wt-what" rows="4"></textarea></label>' +
            '<label class="ad-f"><span>Cần biết trước — mỗi dòng một ý</span>' +
              '<textarea class="wt-note" rows="4"></textarea></label>' +
            '<div class="ad-f">' +
              '<span>Ảnh bìa</span>' +
              '<div class="ad-img-row">' +
                '<img class="wt-cover-prev ad-cover-prev" alt="" hidden>' +
                '<label class="ad-btn ad-upload">Chọn ảnh' +
                  '<input type="file" accept="image/*" hidden class="wt-cover-in"></label>' +
              '</div>' +
            '</div>' +
            '<div class="ad-f">' +
              '<span>Thư viện ảnh — hiện ở trang giới thiệu, thẻ ngoài danh sách báo “+N ảnh”</span>' +
              '<ul class="ad-gal wt-gal"></ul>' +
              '<label class="ad-btn ad-upload">Thêm ảnh' +
                '<input type="file" accept="image/*" multiple hidden class="wt-gal-in"></label>' +
            '</div>' +
            '<div class="ad-f-row">' +
              '<label class="ad-f"><span>Thời lượng từ (phút)</span>' +
                '<input type="number" class="wt-dur" min="15" max="600" step="15"></label>' +
              '<label class="ad-f"><span>đến (phút) — trống nếu cố định</span>' +
                '<input type="number" class="wt-dmax" min="15" max="600" step="15"></label>' +
            '</div>' +
            '<div class="ad-f-row">' +
              '<label class="ad-f"><span>Giá</span>' +
                '<input type="number" class="wt-price" min="0" step="1000" placeholder="Liên hệ"></label>' +
              '<label class="ad-f"><span>Từ mấy tuổi — 0 là mọi lứa tuổi</span>' +
                '<input type="number" class="wt-age" min="0" max="99" placeholder="Không ghi"></label>' +
            '</div>' +
            '<label class="ad-check"><input type="checkbox" class="wt-pfrom"> Ghi “Từ” trước giá (giá khởi điểm, tuỳ mẫu)</label>' +
            '<div class="ad-acts">' +
              '<button type="button" class="ad-btn ad-primary wt-save">Lưu</button>' +
              '<button type="button" class="ad-btn' + (t.is_published === false ? ' on' : '') +
                '" data-wtpub="' + (t.is_published === false ? '1' : '0') + '">' +
                (t.is_published === false ? 'Đang ẩn' : 'Đang hiện') + '</button>' +
              '<button type="button" class="ad-btn ad-danger wt-del">Xoá</button>' +
            '</div>' +
          '</div>';
        }).join('') +
        '<button type="button" class="ad-btn wt-new">+ Loại mới</button>' +
      '</div>' +
    '</details>';
  }

  function wireWtypes() {
    el.main.querySelectorAll('.ad-wt').forEach(function (d) {
      var id = d.getAttribute('data-id');
      var t = wtypes.filter(function (x) { return x.id === id; })[0] || {};
      // Gán bằng .value: tên có dấu ngoặc kép sẽ phá vỡ thuộc tính HTML
      d.querySelector('.wt-vi').value    = t.name_vi || '';
      d.querySelector('.wt-en').value    = t.name_en || '';
      d.querySelector('.wt-dvi').value   = t.desc_vi || '';
      d.querySelector('.wt-long').value  = t.long_vi || '';
      d.querySelector('.wt-what').value  = t.what_vi || '';
      d.querySelector('.wt-note').value  = t.note_vi || '';

      var cover = t.cover || null;
      var prev = d.querySelector('.wt-cover-prev');
      if (cover) { prev.src = cover; prev.hidden = false; }
      d.querySelector('.wt-cover-in').addEventListener('change', function (e) {
        var file = (e.target.files || [])[0];
        if (!file) return;
        var lbl = e.target.closest('.ad-upload');
        var was = lbl.firstChild.nodeValue;
        lbl.firstChild.nodeValue = 'Đang tải…';
        // Thu nhỏ trước khi tải: ảnh bìa nằm trên thẻ ngoài trang Workshop,
        // ảnh gốc từ điện thoại 3–6 MB thì trang tải rất chậm.
        window.GemImg.shrink(file).then(window.GemDB.uploadImage).then(function (url) {
          cover = url; prev.src = url; prev.hidden = false;
          toast('Đã tải ảnh — nhớ bấm Lưu');
        }).catch(function (err) { toast('Tải ảnh không được: ' + (err.message || ''), true); })
          .then(function () { lbl.firstChild.nodeValue = was; e.target.value = ''; });
      });

      var gallery = (t.images || []).slice();
      var galUl = d.querySelector('.wt-gal');
      function renderGal() {
        galUl.innerHTML = gallery.map(function (src, i) {
          return '<li><img src="' + esc(src) + '" alt="" loading="lazy">' +
            (i ? '<button type="button" class="ad-gal-b" data-gal-up="' + i + '" aria-label="Lên trước">‹</button>' : '') +
            '<button type="button" class="ad-gal-b" data-gal-del="' + i + '" aria-label="Bỏ ảnh này">×</button></li>';
        }).join('') || '<li class="ad-hint">Chưa có ảnh.</li>';
      }
      renderGal();
      galUl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-gal-up],[data-gal-del]');
        if (!b) return;
        var mv = b.getAttribute('data-gal-up'), del = b.getAttribute('data-gal-del');
        if (mv != null) { var i = +mv; gallery.splice(i - 1, 0, gallery.splice(i, 1)[0]); }
        else gallery.splice(+del, 1);
        renderGal();
      });
      d.querySelector('.wt-gal-in').addEventListener('change', function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        if (!files.length) return;
        var lbl = e.target.closest('.ad-upload');
        var was = lbl.firstChild.nodeValue;
        lbl.firstChild.nodeValue = 'Đang tải…';
        e.target.disabled = true;
        // từng ảnh một: điện thoại hết bộ nhớ nếu giải mã nhiều ảnh lớn cùng lúc
        files.reduce(function (chain, file) {
          return chain.then(function () {
            return window.GemImg.shrink(file).then(window.GemDB.uploadImage)
              .then(function (url) { gallery.push(url); renderGal(); });
          });
        }, Promise.resolve()).then(function () { toast('Đã thêm ' + files.length + ' ảnh — nhớ bấm Lưu'); })
          .catch(function (err) { toast('Có ảnh không tải được: ' + (err.message || ''), true); })
          .then(function () { lbl.firstChild.nodeValue = was; e.target.disabled = false; e.target.value = ''; });
      });
      d.querySelector('.wt-dur').value   = t.duration_minutes == null ? '' : t.duration_minutes;
      d.querySelector('.wt-dmax').value  = t.duration_max == null ? '' : t.duration_max;
      d.querySelector('.wt-price').value = t.price == null ? '' : t.price;
      d.querySelector('.wt-age').value   = t.age_min == null ? '' : t.age_min;
      d.querySelector('.wt-pfrom').checked = !!t.price_from;

      d.querySelector('.wt-save').addEventListener('click', function () {
        var name = d.querySelector('.wt-vi').value.trim();
        if (!name) return toast('Loại workshop cần có tên tiếng Việt', true);
        var dur = parseInt(d.querySelector('.wt-dur').value, 10);
        var pr  = d.querySelector('.wt-price').value.trim();
        // Database chỉ nhận 15–600 phút và tuổi 0–99: kẹp lại ở đây để không
        // phải đọc câu lỗi tiếng Anh. "Đến" không lớn hơn "từ" thì coi như cố định.
        var from = dur > 0 ? Math.min(600, Math.max(15, dur)) : 90;
        var dmax = parseInt(d.querySelector('.wt-dmax').value, 10);
        dmax = dmax > from ? Math.min(600, dmax) : null;
        var age = d.querySelector('.wt-age').value.trim();
        age = age === '' ? null : Math.min(99, Math.max(0, parseInt(age, 10) || 0));
        window.GemDB.saveWorkshopType(id, {
          name_vi: name,
          name_en: d.querySelector('.wt-en').value.trim() || null,
          desc_vi: d.querySelector('.wt-dvi').value.trim() || null,
          long_vi: d.querySelector('.wt-long').value.trim() || null,
          what_vi: d.querySelector('.wt-what').value.trim() || null,
          note_vi: d.querySelector('.wt-note').value.trim() || null,
          cover: cover,
          images: gallery,
          duration_minutes: from,
          duration_max: dmax,
          age_min: age,
          price: pr === '' ? null : parseInt(pr, 10),
          price_from: d.querySelector('.wt-pfrom').checked
        }).then(function () { toast('Đã lưu'); return load(); })
          .catch(function (e) { toast(e.message || 'Không lưu được', true); });
      });

      d.querySelector('[data-wtpub]').addEventListener('click', function (e) {
        e.target.disabled = true;
        window.GemDB.saveWorkshopType(id, { is_published: e.target.getAttribute('data-wtpub') === '1' })
          .then(function () { toast('Đã cập nhật'); return load(); })
          .catch(function () { e.target.disabled = false; toast('Không lưu được', true); });
      });

      d.querySelector('.wt-del').addEventListener('click', function (e) {
        if (!window.confirm((t.name_vi ? 'Xoá loại “' + t.name_vi + '”?' : 'Xoá loại này?') +
                            ' Không lấy lại được.')) return;
        e.target.disabled = true;
        window.GemDB.deleteWorkshopType(id)
          .then(function () { toast('Đã xoá loại workshop'); return load(); })
          .catch(function (err) {
            e.target.disabled = false;
            // Loại còn buổi trên lịch thì database trả câu giải thích rõ ràng
            toast(err.message || 'Không xoá được', true);
          });
      });
    });

    var neu = el.main.querySelector('.wt-new');
    if (neu) neu.addEventListener('click', function () {
      var name = window.prompt('Tên loại workshop mới (tiếng Việt):');
      if (!name || !name.trim()) return;
      neu.disabled = true;
      window.GemDB.saveWorkshopType(null, {
        slug: slugify(name) + '-' + Math.random().toString(36).slice(2, 6),
        name_vi: name.trim(),
        duration_minutes: 90,
        is_published: false,          // tạo ở dạng ẩn, điền xong mới cho hiện
        sort_order: wtypes.length * 10
      }).then(function () { toast('Đã tạo — điền nốt rồi bấm “Đang ẩn” để hiện'); return load(); })
        .catch(function (e) { neu.disabled = false; toast(e.message || 'Không tạo được', true); });
    });
  }

  /* ---------- thêm buổi ----------
     Lịch chỉ mở trước vài tuần rồi hết. Nếu mỗi lần thêm phải nhập từng buổi
     thì rất dễ quên, và trang Workshop sẽ lặng lẽ trống trơn. Nên form này
     tạo được nhiều tuần một lúc: chọn thứ + giờ, rồi lặp lại N tuần. */
  function sessionFormHTML() {
    var types = wtypes.filter(function (t) { return t.is_published !== false; });
    var today = todayVN();
    return '<details class="ad-newsess">' +
      '<summary><span class="ad-btn ad-primary">+ Thêm buổi</span></summary>' +
      '<form class="ad-sess-form">' +
        (types.length
          ? '<label class="ad-f"><span>Loại workshop</span><select name="type">' +
              types.map(function (t) {
                return '<option value="' + esc(t.id) + '">' + esc(t.name_vi) + '</option>';
              }).join('') +
            '</select></label>'
          : '<p class="ad-hint">Chưa có loại workshop nào. Tạo loại ở mục dưới trước.</p>') +
        '<div class="ad-f-row">' +
          '<label class="ad-f"><span>Ngày đầu</span>' +
            '<input type="date" name="date" value="' + today + '" min="' + today + '"></label>' +
          '<label class="ad-f"><span>Giờ</span>' +
            '<input type="time" name="time" value="17:00" step="900"></label>' +
        '</div>' +
        '<div class="ad-f-row">' +
          '<label class="ad-f"><span>Số chỗ</span>' +
            '<input type="number" name="cap" min="1" max="100" value="8"></label>' +
          '<label class="ad-f"><span>Lặp lại mỗi tuần</span>' +
            '<select name="weeks">' +
              [1, 2, 4, 6, 8, 12].map(function (n) {
                return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' +
                       (n === 1 ? 'chỉ 1 buổi' : n + ' tuần') + '</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<p class="ad-hint ad-preview"></p>' +
        '<button type="submit" class="ad-btn ad-primary"' + (types.length ? '' : ' disabled') + '>Tạo buổi</button>' +
        '<p class="ad-err" hidden></p>' +
      '</form>' +
    '</details>';
  }

  function wireSessionForm() {
    var form = el.main.querySelector('.ad-sess-form');
    if (!form) return;
    var f = form.elements;

    function preview() {
      var n = parseInt(f['weeks'].value, 10) || 1;
      var d = f['date'].value, tm = f['time'].value;
      if (!d || !tm) return;
      var first = DAYS[new Date(d + 'T12:00:00Z').getUTCDay()];
      var last = addDaysYmd(d, (n - 1) * 7);
      form.querySelector('.ad-preview').textContent = n === 1
        ? 'Tạo 1 buổi: ' + first + ' ' + dm(d) + ' lúc ' + tm
        : 'Tạo ' + n + ' buổi, ' + first + ' hằng tuần lúc ' + tm +
          ', từ ' + dm(d) + ' đến ' + dm(last);
    }
    ['date', 'time', 'weeks'].forEach(function (k) {
      if (f[k]) f[k].addEventListener('change', preview);
    });
    preview();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.ad-err');
      var d = f['date'].value, tm = f['time'].value;
      if (!d || !tm) { err.textContent = 'Cần chọn ngày và giờ.'; err.hidden = false; return; }
      err.hidden = true;

      var n = parseInt(f['weeks'].value, 10) || 1;
      var cap = parseInt(f['cap'].value, 10) || 8;
      var rows = [];
      for (var i = 0; i < n; i++) {
        // Ghép kèm +07:00 để giờ nhập vào luôn là giờ Hà Nội, bất kể máy của
        // người nhập đặt múi giờ nào. Việt Nam không đổi giờ mùa nên một mốc
        // cố định là đủ, không cần thư viện múi giờ.
        rows.push({
          workshop_type_id: f['type'].value,
          starts_at: addDaysYmd(d, i * 7) + 'T' + tm + ':00+07:00',
          capacity: cap,
          status: 'open'
        });
      }

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Đang tạo…';
      window.GemDB.createSession(rows)
        .then(function () { toast('Đã tạo ' + rows.length + ' buổi'); return load(); })
        .catch(function (e2) {
          btn.disabled = false; btn.textContent = 'Tạo buổi';
          err.textContent = e2.message || 'Không tạo được.';
          err.hidden = false;
        });
    });
  }

  function renderSessions() {
    if (!sessions.length) {
      el.main.innerHTML = sessionFormHTML() +
        '<div class="ad-empty"><p>Chưa có buổi nào sắp tới.</p>' +
        '<p class="ad-hint">Bấm “Thêm buổi” ở trên để mở lịch cho khách đặt.</p></div>' +
        wtypesHTML();
      wireSessionForm(); wireWtypes();
      return;
    }
    el.main.innerHTML = sessionFormHTML() + sessions.map(function (s) {
      var t = vn(s.starts_at);
      var taken = seatsTaken(s);
      var all = s.bookings || [];
      return '<details class="ad-sess-fold" data-id="' + esc(s.id) + '">' +
        '<summary>' +
          '<span class="ad-when"><b>' + t.dow + ' ' + t.date + '</b><span>' + t.time + '</span></span>' +
          '<span class="ad-what">' + esc(s.workshop_types ? s.workshop_types.name_vi : '') +
            (s.status !== 'open' ? ' <em>(' + (s.status === 'cancelled' ? 'đã huỷ' : 'đã đóng') + ')</em>' : '') +
          '</span>' +
          '<span class="ad-seat' + (taken >= s.capacity ? ' full' : '') + '">' + taken + '/' + s.capacity + '</span>' +
        '</summary>' +
        '<div class="ad-fold-body">' +
          (all.length
            ? '<ul class="ad-bks">' + all.map(bookingRow).join('') + '</ul>'
            : '<p class="ad-hint">Chưa ai đặt buổi này.</p>') +
          '<div class="ad-sess-act">' +
            '<label>Số chỗ <input type="number" class="ad-cap" min="1" max="100" value="' + s.capacity + '"></label>' +
            '<button type="button" class="ad-save-cap">Lưu</button>' +
            (s.status === 'open'
              ? '<button type="button" class="ad-close danger">Đóng buổi</button>'
              : '<button type="button" class="ad-reopen">Mở lại</button>') +
            // Chỉ hiện khi chưa ai đặt. Buổi đã có người thì đóng chứ không
            // xoá — database cũng chặn, đây chỉ là để đỡ bấm nhầm.
            (taken === 0 ? '<button type="button" class="ad-del-sess danger">Xoá buổi</button>' : '') +
          '</div>' +
        '</div>' +
      '</details>';
    }).join('') + wtypesHTML();

    wireBookingActions(el.main);
    wireSessionForm();
    wireWtypes();

    el.main.querySelectorAll('.ad-del-sess').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.closest('.ad-sess-fold');
        var id = d.getAttribute('data-id');
        var when = d.querySelector('.ad-when').textContent.replace(/\s+/g, ' ').trim();
        if (!window.confirm('Xoá buổi ' + when + '?')) return;
        b.disabled = true;
        window.GemDB.deleteSession(id)
          .then(function () { toast('Đã xoá buổi'); return load(); })
          .catch(function (err) {
            b.disabled = false;
            // Database trả về câu giải thích rõ ràng — hiện thẳng cho người dùng
            toast(err.message || 'Không xoá được', true);
          });
      });
    });

    el.main.querySelectorAll('.ad-sess-fold').forEach(function (d) {
      var id = d.getAttribute('data-id');
      var cap = d.querySelector('.ad-cap');
      d.querySelector('.ad-save-cap').addEventListener('click', function () {
        var v = parseInt(cap.value, 10);
        if (!v || v < 1) return toast('Số chỗ không hợp lệ', true);
        window.GemDB.updateSession(id, { capacity: v })
          .then(function () { toast('Đã lưu số chỗ'); return load(); })
          .catch(function () { toast('Không lưu được', true); });
      });
      var closeBtn = d.querySelector('.ad-close');
      if (closeBtn) closeBtn.addEventListener('click', function () {
        window.GemDB.updateSession(id, { status: 'closed' })
          .then(function () { toast('Đã đóng buổi'); return load(); })
          .catch(function () { toast('Không lưu được', true); });
      });
      var openBtn = d.querySelector('.ad-reopen');
      if (openBtn) openBtn.addEventListener('click', function () {
        window.GemDB.updateSession(id, { status: 'open' })
          .then(function () { toast('Đã mở lại'); return load(); })
          .catch(function () { toast('Không lưu được', true); });
      });
    });
  }

  /* ================= ĐƠN HÀNG ================= */

  function money(n) {
    if (n == null) return 'Liên hệ';
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function itemPrice(it) {
    if (it.price == null) return 'Liên hệ';
    if (it.price_max != null) {
      return (it.price * it.qty).toLocaleString('vi-VN') + '–' + money(it.price_max * it.qty);
    }
    return money(it.price * it.qty);
  }

  function whenLabel(iso) {
    var v = vn(iso);
    return v.ymd === todayVN() ? 'Hôm nay ' + v.time : v.dow + ' ' + v.date + ' · ' + v.time;
  }

  function renderOrders() {
    // Đơn chuyển khoản chưa thấy tiền về — việc đối soát hằng ngày
    function waitingMoney(o) {
      return o.payment_method === 'qr' && o.payment_status !== 'paid' &&
             o.status !== 'cancelled';
    }

    var list = orders.filter(function (o) {
      if (orderFilter === 'open')  return OD_OPEN.indexOf(o.status) >= 0;
      if (orderFilter === 'money') return waitingMoney(o);
      if (orderFilter === 'done')  return o.status === 'done';
      return true;
    });

    function count(fn) { return orders.filter(fn).length; }

    var chips = [
      ['open',  'Cần xử lý', function (o) { return OD_OPEN.indexOf(o.status) >= 0; }],
      ['money', 'Chờ tiền',  waitingMoney],
      ['done',  'Xong',      null],
      ['all',   'Tất cả',    null]
    ].map(function (c) {
      var n = c[2] ? count(c[2]) : 0;
      return '<button type="button" class="ad-filter' + (orderFilter === c[0] ? ' active' : '') +
             '" data-filter="' + c[0] + '">' + c[1] +
             (c[2] && n ? ' <b>' + n + '</b>' : '') + '</button>';
    }).join('');

    var body = list.length ? list.map(function (o) {
      var st = OD_STATUS[o.status] || OD_STATUS['new'];
      var items = (o.order_items || []).map(function (it) {
        // option_vi: the scent / size the customer picked (Hàng ký gửi)
        return '<li><span>' + esc(it.name_vi) +
               (it.option_vi ? ' · <b>' + esc(it.option_vi) + '</b>' : '') + ' × ' + it.qty + '</span>' +
               '<span class="ad-od-price">' + esc(itemPrice(it)) + '</span></li>';
      }).join('');

      var paid = o.payment_status === 'paid';
      var pm = o.payment_method === 'qr' ? 'Chuyển khoản'
             : o.payment_method === 'cod' ? 'Trả khi nhận' : null;

      return '<article class="ad-order" data-id="' + esc(o.id) + '">' +
        '<div class="ad-od-head">' +
          '<span class="ad-od-code">' + esc(o.code) + '</span>' +
          '<span class="ad-chip ' + st.cls + '">' + st.label + '</span>' +
        '</div>' +
        (pm ? '<p class="ad-od-pay">' + pm +
              ' · <span class="ad-paid' + (paid ? ' yes' : '') + '">' +
              (paid ? 'đã nhận tiền' : 'chưa nhận tiền') + '</span></p>' : '') +
        '<p class="ad-od-when">' + esc(whenLabel(o.created_at)) + '</p>' +
        '<p class="ad-od-who"><b>' + esc(o.name) + '</b></p>' +
        phoneLinks(o.phone) +
        (o.address ? '<p class="ad-od-addr">' + esc(o.address) + '</p>' : '') +
        (o.note ? '<p class="ad-od-note">“' + esc(o.note) + '”</p>' : '') +
        '<ul class="ad-od-items">' + items + '</ul>' +
        fabricsToTake(o) +
        '<p class="ad-od-sum"><span>Tổng</span><b>' + esc(money(o.subtotal)) +
          (o.has_unpriced ? ' + món Liên hệ' : '') + '</b></p>' +
        '<div class="ad-acts">' +
          // Web không tự biết tiền đã về. Anna mở app ngân hàng, thấy nội dung
          // chuyển khoản trùng mã đơn, rồi bấm nút này.
          (o.payment_method
            ? '<button type="button" class="ad-btn' + (paid ? ' on' : '') + '" data-paid="' +
              (paid ? 'unpaid' : 'paid') + '">' +
              (paid ? 'Bỏ đánh dấu đã nhận' : 'Đã nhận tiền') + '</button>'
            : '') +
          (st.next
            ? '<button type="button" class="ad-btn ad-primary" data-to="' + st.next + '">' +
              esc(st.nextLabel) + '</button>'
            : '') +
          (o.status !== 'cancelled' && o.status !== 'done'
            ? '<button type="button" class="ad-btn ad-danger" data-to="cancelled">Huỷ</button>'
            : '') +
          (o.status === 'done' || o.status === 'cancelled'
            ? '<button type="button" class="ad-btn" data-to="new">Mở lại</button>'
            : '') +
        '</div>' +
      '</article>';
    }).join('') : '<div class="ad-empty"><p>Chưa có đơn nào ở mục này.</p></div>';

    el.main.innerHTML = '<div class="ad-filters">' + chips + '</div>' + body;

    el.main.querySelectorAll('.ad-filter').forEach(function (b) {
      b.addEventListener('click', function () {
        orderFilter = b.getAttribute('data-filter');
        renderOrders();
      });
    });

    el.main.querySelectorAll('.ad-order .ad-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.closest('.ad-order').getAttribute('data-id');
        var patch = b.hasAttribute('data-paid')
          ? { payment_status: b.getAttribute('data-paid') }
          : { status: b.getAttribute('data-to') };
        b.disabled = true;
        window.GemDB.updateOrder(id, patch)
          .then(function () { toast('Đã cập nhật'); return load(); })
          .catch(function () { b.disabled = false; toast('Không lưu được', true); });
      });
    });
  }

  /* ================= SẢN PHẨM ================= */

  /* ---------- soạn sản phẩm ---------- */
  function renderProductForm() {
    var p = editingProduct || {};
    var isNew = !p.id;

    el.main.innerHTML =
      '<button type="button" class="ad-btn ad-cancel">‹ Về danh sách</button>' +
      '<form class="ad-post-form">' +
        '<h3>' + (isNew ? 'Sản phẩm mới' : 'Sửa sản phẩm') + '</h3>' +
        '<label class="ad-f"><span>Tên (tiếng Việt)</span><input name="name_vi"></label>' +
        '<label class="ad-f"><span>Tên (tiếng Anh)</span><input name="name_en"></label>' +
        '<div class="ad-f-row">' +
          '<label class="ad-f"><span>Danh mục</span><select name="category">' +
            Object.keys(CATEGORIES).map(function (k) {
              return '<option value="' + k + '">' + esc(CATEGORIES[k]) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="ad-f"><span>Mã hàng</span>' +
            '<input name="sku"' + (isNew ? '' : ' readonly') + '></label>' +
        '</div>' +
        (isNew ? '' : '<p class="ad-hint">Mã hàng không sửa được: nó nối sản phẩm này ' +
                      'với thẻ trên trang Sản phẩm và với các đơn đã đặt.</p>') +
        '<label class="ad-f"><span>Mô tả ngắn (VI)</span><input name="desc_vi"></label>' +
        '<label class="ad-f"><span>Mô tả ngắn (EN)</span><input name="desc_en"></label>' +
        '<label class="ad-f"><span>Hàng ký gửi của</span>' +
          '<input name="consignor" maxlength="80" placeholder="Để trống nếu là đồ Gem làm"></label>' +
        '<p class="ad-hint">Điền tên nơi gửi (vd Tiny’s Herbal) thì thẻ trên web có nhãn ' +
          '“Ký gửi · Tiny’s Herbal”.</p>' +
        '<div class="ad-f-row">' +
          '<label class="ad-f"><span>Giá</span>' +
            '<input type="number" name="price" min="0" step="1000" placeholder="Liên hệ"></label>' +
          '<label class="ad-f"><span>đến (nếu bán theo khoảng)</span>' +
            '<input type="number" name="price_max" min="0" step="1000" placeholder="—"></label>' +
        '</div>' +
        // choices (scent, size, design): the product sheet shows them as
        // buttons; the order records the one picked
        '<fieldset class="ad-opts">' +
          '<legend>Lựa chọn cho khách (mùi, cỡ, mẫu…)</legend>' +
          '<div class="ad-f-row">' +
            '<label class="ad-f"><span>Tên lựa chọn (VI)</span>' +
              '<input name="opt_label_vi" maxlength="40" placeholder="vd Mùi hương"></label>' +
            '<label class="ad-f"><span>Tên lựa chọn (EN)</span>' +
              '<input name="opt_label_en" maxlength="40" placeholder="vd Scent"></label>' +
          '</div>' +
          '<ul class="ad-choices"></ul>' +
          '<button type="button" class="ad-btn ad-choice-add">+ Thêm lựa chọn</button>' +
          '<p class="ad-hint">Có lựa chọn thì khách phải bấm chọn một ô (vd một mùi) rồi mới thêm vào giỏ ' +
            'được, và đơn ghi rõ ô đó. Ô “Hết” vẫn hiện nhưng mờ, không chọn được. Mọi lựa chọn ' +
            'chung một giá. Món không cần thì để trống danh sách.</p>' +
        '</fieldset>' +
        '<label class="ad-f"><span>Ghi chú (VI) — hiện cuối bảng chi tiết</span>' +
          '<textarea name="notes_vi" rows="5" maxlength="4000" placeholder="Bảng cỡ, chất liệu, cách dùng… mỗi ý một dòng"></textarea></label>' +
        '<label class="ad-f"><span>Ghi chú (EN)</span>' +
          '<textarea name="notes_en" rows="4" maxlength="4000"></textarea></label>' +
        '<div class="ad-f">' +
          '<span>Ảnh chính (thẻ sản phẩm)</span>' +
          '<div class="ad-img-row">' +
            (p.image
              ? '<img class="ad-cover-prev" src="' + esc(p.image) + '" alt="">'
              : '<img class="ad-cover-prev" alt="" hidden>') +
            '<label class="ad-btn ad-upload">Chọn ảnh<input type="file" accept="image/*" hidden data-up="cover"></label>' +
          '</div>' +
          '<p class="ad-hint">Ảnh được thu nhỏ ngay trên máy (dài nhất 1280px, khoảng 100–150 KB) ' +
            'và cắt thêm một ảnh vuông 600px cho thẻ. Ảnh lớn cũng thêm vào đầu thư viện ảnh.</p>' +
        '</div>' +
        '<div class="ad-f">' +
          '<span>Thư viện ảnh (khách bấm thẻ để xem)</span>' +
          '<ul class="ad-gal"></ul>' +
          '<label class="ad-btn ad-upload">Thêm ảnh<input type="file" accept="image/*" multiple hidden data-up="gallery"></label>' +
        '</div>' +
        '<div class="ad-f">' +
          '<span>Ảnh cắt nền (đứng trên kệ Studio 2D)</span>' +
          '<div class="ad-img-row">' +
            '<div class="ad-cut-prev"><img alt=""' + (p.cutout ? ' src="' + esc(p.cutout) + '"' : ' hidden') + '></div>' +
            '<div class="ad-cut-acts">' +
              '<button type="button" class="ad-btn ad-cut-go">Xoá nền trắng</button>' +
              '<label class="ad-cut-tol">Mức xoá <input type="range" min="8" max="80" value="28"></label>' +
              '<label class="ad-btn ad-upload">Chọn ảnh đã tách nền<input type="file" accept="image/png,image/webp" hidden data-up="cutout"></label>' +
              // the Lắp studio library is the owner's (studio_assets)
              (me && me.role === 'owner' ? '<button type="button" class="ad-btn ad-cut-lib-go" aria-expanded="false">Chọn từ thư viện</button>' : '') +
              '<button type="button" class="ad-btn ad-cut-clear">Bỏ ảnh cắt</button>' +
            '</div>' +
          '</div>' +
          '<div class="ad-cut-lib" hidden>' +
            '<input type="search" class="ad-cut-find" placeholder="Tìm theo tên ảnh…" aria-label="Tìm ảnh trong thư viện">' +
            '<div class="ad-cut-grid"></div>' +
          '</div>' +
          '<p class="ad-hint">“Xoá nền trắng” dùng ảnh chính vừa chọn (hoặc ảnh đầu thư viện). Chụp ' +
            'trên giấy / tường trắng là xoá sạch nhất. Chỉ phần nền nối ra mép ảnh bị xoá, ' +
            'nên chỗ trắng nằm trong món (hoa trắng, nhãn) vẫn giữ. Còn sót nền: kéo “Mức xoá” lên ' +
            'rồi bấm lại; ăn vào món: kéo xuống.</p>' +
        '</div>' +
        '<label class="ad-f"><span>Kệ trong Studio 2D</span><select name="shelf">' +
          '<option value="">Không bày</option>' +
          '<option value="pegboard">Bảng treo — Phụ kiện</option>' +
          '<option value="display">Kệ trưng bày — Túi &amp; sổ</option>' +
          '<option value="cabinet">Tủ — Gối &amp; quà</option>' +
        '</select></label>' +
        // Góc thử đồ (Studio 2D): how the character wears it (js/wear.js)
        (window.GemWear ? '<fieldset class="ad-opts ad-wear">' +
          '<legend>Đeo thử ở Góc thử đồ (Studio 2D)</legend>' +
          '<label class="ad-check"><input type="checkbox" name="wear_on"><span>Cho khách đeo thử món này</span></label>' +
          '<div class="ad-wear-body" hidden>' +
            '<div class="ad-f-row">' +
              '<label class="ad-f"><span>Cách đeo</span><select name="wear_slot">' +
                window.GemWear.SLOTS.slice().reverse().map(function (k) {
                  return '<option value="' + k + '">' + esc(window.GemWear.SLOT_NAMES[k]) + '</option>';
                }).join('') + '</select></label>' +
              '<label class="ad-f"><span>Xem trên nhân vật</span><select name="wear_who">' +
                ['p1', 'p2', 'p3', 'p4'].map(function (k, i) { return '<option value="' + k + '">Bạn ' + (i + 1) + '</option>'; }).join('') +
              '</select></label>' +
            '</div>' +
            '<label class="ad-f"><span>Cỡ: <b class="ad-wear-hv"></b> chiều cao người</span>' +
              '<input type="range" name="wear_h" min="0.03" max="0.5" step="0.005"></label>' +
            '<div class="ad-wear-prev"><div class="ad-wear-fr"></div></div>' +
            '<p class="ad-hint ad-wear-src"></p>' +
            '<p class="ad-hint">Kéo món trên hình để đặt vào tay (quai túi nằm trong nắm tay), lên tóc, hay móc vào túi. ' +
              'Món có Mẫu: mỗi mẫu dùng ảnh cắt nền riêng của mẫu đó (ô bên dưới mỗi lựa chọn).</p>' +
            '<div class="ad-acts"><button type="button" class="ad-btn ad-wear-reset">Đặt lại vị trí</button>' +
              '<button type="button" class="ad-btn ad-wear-noimg" hidden>Bỏ tranh vẽ dự phòng</button></div>' +
          '</div>' +
        '</fieldset>' : '') +
        '<label class="ad-check"><input type="checkbox" name="in_stock"' +
          (p.in_stock === false ? '' : ' checked') + '><span>Còn hàng</span></label>' +
        '<label class="ad-check"><input type="checkbox" name="is_published"' +
          (p.is_published === false ? '' : ' checked') + '><span>Đang bán trên web</span></label>' +
        '<div class="ad-acts">' +
          '<button type="submit" class="ad-btn ad-primary">Lưu</button>' +
          (isNew ? '' : '<button type="button" class="ad-btn ad-danger ad-del">Xoá sản phẩm</button>') +
        '</div>' +
        '<p class="ad-err" hidden></p>' +
      '</form>';

    var form = el.main.querySelector('.ad-post-form');
    ['name_vi','name_en','sku','desc_vi','desc_en'].forEach(function (k) {
      form.elements[k].value = p[k] || '';
    });
    form.elements['price'].value     = p.price == null ? '' : p.price;
    form.elements['price_max'].value = p.price_max == null ? '' : p.price_max;
    if (p.category) form.elements['category'].value = p.category;

    form.elements['shelf'].value = p.shelf || '';
    form.elements['consignor'].value = p.consignor || '';
    form.elements['notes_vi'].value = p.notes_vi || '';
    form.elements['notes_en'].value = p.notes_en || '';
    var opts = p.options || {};
    form.elements['opt_label_vi'].value = opts.label_vi || '';
    form.elements['opt_label_en'].value = opts.label_en || '';
    // a copy: nothing changes on the product until Lưu
    var choices = (opts.choices || []).map(function (c) {
      var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; }); return o;
    });
    var image = p.image || null;
    var gallery = (p.gallery || []).slice();
    var cutout = p.cutout || null;
    var pendingCut = null;          // File made by "Xoá nền trắng", uploaded on Lưu
    var cutSrc = null;              // original photo picked in this form: best source for the cut
    var IMG = window.GemImg;

    function galSrc(tk) {
      if (tk.indexOf('/') >= 0) return tk;
      return 'images/products/' + tk + (/\.[a-z0-9]+$/i.test(tk) ? '' : '.jpg');
    }

    function renderGal() {
      var ul = form.querySelector('.ad-gal');
      ul.innerHTML = gallery.map(function (tk, i) {
        return '<li><img src="' + esc(galSrc(tk)) + '" alt="" loading="lazy">' +
          (i ? '<button type="button" class="ad-gal-b" data-gal-up="' + i + '" aria-label="Lên trước">‹</button>' : '') +
          '<button type="button" class="ad-gal-b" data-gal-del="' + i + '" aria-label="Bỏ ảnh này">×</button></li>';
      }).join('') || '<li class="ad-hint">Chưa có ảnh.</li>';
    }
    renderGal();
    form.querySelector('.ad-gal').addEventListener('click', function (e) {
      var b = e.target.closest('[data-gal-up],[data-gal-del]');
      if (!b) return;
      var mv = b.getAttribute('data-gal-up'), del = b.getAttribute('data-gal-del');
      if (mv != null) { var i = +mv; gallery.splice(i - 1, 0, gallery.splice(i, 1)[0]); }
      else gallery.splice(+del, 1);
      renderGal();
    });

    function busy(input, on) {
      var lbl = input.closest('.ad-upload');
      if (!lbl.getAttribute('data-was')) lbl.setAttribute('data-was', lbl.firstChild.nodeValue);
      lbl.firstChild.nodeValue = on ? 'Đang xử lý…' : lbl.getAttribute('data-was');
      input.disabled = on;
    }
    var up = window.GemDB.uploadImage;

    /* ---------- lựa chọn: mùi, cỡ, mẫu… ----------
       Typing goes straight into `choices` (no redraw, so the cursor stays put);
       adding, moving, removing, Còn/Hết and a new photo redraw the list. A
       choice keeps its key for good once saved: baskets and orders hold it. */
    var chUl = form.querySelector('.ad-choices');
    function renderChoices() {
      chUl.innerHTML = choices.map(function (c, i) {
        return '<li class="ad-choice' + (c.out ? ' is-out' : '') + '" data-i="' + i + '">' +
          '<div class="ad-choice-pic">' +
            (c.image ? '<img src="' + esc(c.image) + '" alt="">' : '<span class="ad-hint">Chưa có ảnh</span>') +
            '<label class="ad-btn ad-upload">Ảnh<input type="file" accept="image/*" hidden data-choice-pic="' + i + '"></label>' +
          '</div>' +
          '<div class="ad-choice-f">' +
            '<div class="ad-f-row">' +
              '<label class="ad-f"><span>Tên (VI)</span><input data-cf="vi" maxlength="60" value="' + esc(c.vi || '') + '"></label>' +
              '<label class="ad-f"><span>Tên (EN)</span><input data-cf="en" maxlength="60" value="' + esc(c.en || '') + '"></label>' +
            '</div>' +
            '<label class="ad-f"><span>Mô tả ngắn (VI) — hiện khi khách bấm chọn</span>' +
              '<input data-cf="note_vi" maxlength="300" value="' + esc(c.note_vi || '') + '"></label>' +
            '<label class="ad-f"><span>Mô tả ngắn (EN)</span>' +
              '<input data-cf="note_en" maxlength="300" value="' + esc(c.note_en || '') + '"></label>' +
            // the mẫu's own cut-out: what the character wears at Góc thử đồ
            '<div class="ad-choice-cut"><span class="ad-cut-prev ad-cut-sm">' +
              (c.cut ? '<img src="' + esc(c.cut) + '" alt="">' : '') + '</span>' +
              '<span class="ad-choice-cut-acts"><span class="ad-hint">Ảnh cắt nền của mẫu (đeo thử)</span>' +
                '<button type="button" class="ad-btn" data-choice="cut"' + (c.image ? '' : ' disabled') + '>Xoá nền trắng</button>' +
                '<label class="ad-btn ad-upload">Ảnh đã tách nền<input type="file" accept="image/png,image/webp" hidden data-choice-cut="' + i + '"></label>' +
                (c.cut ? '<button type="button" class="ad-btn" data-choice="nocut">Bỏ ảnh cắt</button>' : '') +
              '</span></div>' +
            '<div class="ad-acts">' +
              '<button type="button" class="ad-btn' + (c.out ? ' on' : '') + '" data-choice="out">' +
                (c.out ? 'Hết' : 'Còn hàng') + '</button>' +
              (i ? '<button type="button" class="ad-btn" data-choice="up">‹ Lên trước</button>' : '') +
              '<button type="button" class="ad-btn ad-danger" data-choice="del">Bỏ</button>' +
            '</div>' +
          '</div>' +
        '</li>';
      }).join('');
    }
    renderChoices();

    chUl.addEventListener('input', function (e) {
      var field = e.target.getAttribute('data-cf');
      var li = e.target.closest('.ad-choice');
      if (field && li) choices[+li.getAttribute('data-i')][field] = e.target.value;
    });
    chUl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (!b) return;
      var i = +b.closest('.ad-choice').getAttribute('data-i');
      var act = b.getAttribute('data-choice');
      if (act === 'cut') {
        // "Xoá nền trắng" on the mẫu's photo, uploaded at once like its photo
        var bc = b;
        bc.disabled = true; bc.textContent = 'Đang xoá nền…';
        var tol = +form.querySelector('.ad-cut-tol input').value;
        setTimeout(function () {
          IMG.removeWhite(choices[i].image, { tol: tol, max: 1024 }).then(up).then(function (url) {
            choices[i].cut = url;
            renderChoices(); renderWear();
            toast('Đã có ảnh cắt nền của mẫu — bấm Lưu để giữ');
          }).catch(function (err) {
            bc.disabled = false; bc.textContent = 'Xoá nền trắng';
            toast(err.message || 'Không xoá được nền', true);
          });
        }, 30);
        return;
      }
      if (act === 'nocut') { delete choices[i].cut; renderChoices(); renderWear(); return; }
      if (act === 'out') choices[i].out = !choices[i].out;
      else if (act === 'up' && i > 0) choices.splice(i - 1, 0, choices.splice(i, 1)[0]);
      else if (act === 'del') {
        if (choices[i].key && !window.confirm('Bỏ lựa chọn “' + (choices[i].vi || '') +
            '”? Khách đang để nó trong giỏ sẽ phải chọn lại.')) return;
        choices.splice(i, 1);
      }
      renderChoices();
    });
    chUl.addEventListener('change', function (e) {
      var ci = e.target.closest('[data-choice-cut]');
      var cf = ci && (ci.files || [])[0];
      if (cf) {
        var k = +ci.getAttribute('data-choice-cut');
        busy(ci, true);
        IMG.shrink(cf, { max: 1024, alpha: true }).then(up).then(function (url) {
          choices[k].cut = url;
          renderChoices(); renderWear();
          toast('Đã tải ảnh lên — bấm Lưu để giữ');
        }).catch(function (err) {
          busy(ci, false); ci.value = '';
          toast('Tải ảnh không được: ' + (err.message || ''), true);
        });
        return;
      }
      var inp = e.target.closest('[data-choice-pic]');
      var file = inp && (inp.files || [])[0];
      if (!file) return;
      var i = +inp.getAttribute('data-choice-pic');
      busy(inp, true);
      IMG.shrink(file).then(up).then(function (url) {
        choices[i].image = url;
        renderChoices();
        toast('Đã tải ảnh lên — bấm Lưu để giữ');
      }).catch(function (err) {
        busy(inp, false); inp.value = '';
        toast('Tải ảnh không được: ' + (err.message || ''), true);
      });
    });
    form.querySelector('.ad-choice-add').addEventListener('click', function () {
      choices.push({ vi: '', en: '' });
      renderChoices();
      var last = chUl.querySelector('.ad-choice:last-child [data-cf="vi"]');
      if (last) last.focus();
    });

    form.querySelector('[data-up="cover"]').addEventListener('change', function (e) {
      var file = (e.target.files || [])[0];
      if (!file) return;
      busy(e.target, true);
      Promise.all([IMG.shrink(file), IMG.thumb(file, 600)]).then(function (f) {
        return Promise.all([up(f[0]), up(f[1])]);
      }).then(function (urls) {
        image = urls[1];
        cutSrc = file;
        gallery.unshift(urls[0]);
        renderGal();
        var prev = form.querySelector('.ad-cover-prev');
        prev.src = image; prev.hidden = false;
        toast('Đã tải ảnh lên');
      }).catch(function (err) { toast('Tải ảnh không được: ' + (err.message || ''), true); })
        .then(function () { busy(e.target, false); e.target.value = ''; });
    });

    form.querySelector('[data-up="gallery"]').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      busy(e.target, true);
      // one at a time: phones run out of memory decoding several big photos at once
      files.reduce(function (chain, file) {
        return chain.then(function () {
          return IMG.shrink(file).then(up).then(function (url) { gallery.push(url); renderGal(); });
        });
      }, Promise.resolve()).then(function () { toast('Đã thêm ' + files.length + ' ảnh'); })
        .catch(function (err) { toast('Có ảnh không tải được: ' + (err.message || ''), true); })
        .then(function () { busy(e.target, false); e.target.value = ''; });
    });

    var cutImg = form.querySelector('.ad-cut-prev img');
    function showCut(src) {
      if (cutImg.src.indexOf('blob:') === 0) URL.revokeObjectURL(cutImg.src);
      if (src) { cutImg.src = src; cutImg.hidden = false; } else { cutImg.removeAttribute('src'); cutImg.hidden = true; }
      renderWear();
    }

    form.querySelector('.ad-cut-go').addEventListener('click', function (e) {
      var src = cutSrc || (gallery[0] && galSrc(gallery[0])) || image;
      if (!src) return toast('Chọn ảnh chính trước đã', true);
      var b = e.target;
      b.disabled = true; b.textContent = 'Đang xoá nền…';
      var tol = +form.querySelector('.ad-cut-tol input').value;
      // let the button repaint before the heavy loop
      setTimeout(function () {
        IMG.removeWhite(src, { tol: tol, max: 1024 }).then(function (file) {
          pendingCut = file;
          showCut(URL.createObjectURL(file));
          toast('Xem thử bên trái — bấm Lưu để giữ');
        }).catch(function (err) { toast(err.message || 'Không xoá được nền', true); })
          .then(function () { b.disabled = false; b.textContent = 'Xoá nền trắng'; });
      }, 30);
    });

    form.querySelector('[data-up="cutout"]').addEventListener('change', function (e) {
      var file = (e.target.files || [])[0];
      if (!file) return;
      busy(e.target, true);
      IMG.shrink(file, { max: 1024, alpha: true }).then(function (f) {
        pendingCut = f;
        showCut(URL.createObjectURL(f));
      }).catch(function (err) { toast(err.message || 'Không đọc được ảnh', true); })
        .then(function () { busy(e.target, false); e.target.value = ''; });
    });

    form.querySelector('.ad-cut-clear').addEventListener('click', function () {
      pendingCut = null; cutout = null; showCut(null);
    });

    // "Chọn từ thư viện": a picture already uploaded in Lắp studio becomes the
    // cut-out as it is, no second upload. Newest first; names are typed: esc().
    var libBox = form.querySelector('.ad-cut-lib'), libGo = form.querySelector('.ad-cut-lib-go');
    var libRows = null;   // null: not loaded yet
    function libDraw() {
      var q = slugify(form.querySelector('.ad-cut-find').value);
      var grid = libBox.querySelector('.ad-cut-grid');
      if (!libRows) { grid.innerHTML = '<span class="ad-hint">Đang tải thư viện…</span>'; return; }
      var rows = libRows.filter(function (r) { return !q || slugify((r.name || '') + ' ' + r.src.split('/').pop()).indexOf(q) >= 0; });
      grid.innerHTML = rows.length ? rows.map(function (r) {
        var nm = r.name || r.src.split('/').pop();
        return '<button type="button" class="ad-cut-pick" data-src="' + esc(r.src) + '" title="' + esc(nm) + '">' +
          '<img src="' + esc(r.src) + '" alt="" loading="lazy"><span>' + esc(nm) + '</span></button>';
      }).join('') : '<span class="ad-hint">Không có ảnh nào khớp.</span>';
    }
    if (libGo) libGo.addEventListener('click', function () {
      libBox.hidden = !libBox.hidden;
      libGo.setAttribute('aria-expanded', String(!libBox.hidden));
      if (libBox.hidden) return;
      libDraw();
      if (libRows) return;
      window.GemDB.studioAssets().then(function (rows) {
        libRows = (rows || []).filter(function (r) { return r && typeof r.src === 'string'; }).reverse();
        libDraw();
      }, function (err) {
        libRows = [];
        libDraw();
        toast(err.message || 'Không tải được thư viện', true);
      });
    });
    libBox.addEventListener('input', libDraw);
    libBox.addEventListener('click', function (e) {
      var b = e.target.closest('.ad-cut-pick');
      if (!b) return;
      pendingCut = null;
      cutout = b.getAttribute('data-src');
      showCut(cutout);
      libBox.hidden = true;
      libGo.setAttribute('aria-expanded', 'false');
      toast('Đã chọn — bấm Lưu để giữ');
    });

    /* ---------- Đeo thử (Góc thử đồ, Studio 2D) ----------
       How the character wears it (js/wear.js): the way, the size, and a drag
       on the preview for where it hangs. The picture: a drawing of its own
       (the five of the first round), else the first mẫu's cut-out, else the
       cut-out above. Saved with the rest on Lưu (products.wear). */
    var GW = window.GemWear, wearBox = form.querySelector('.ad-wear');
    var wear = GW && p.wear ? GW.norm(p.wear) : null;
    if (wearBox) {
      form.elements['wear_on'].checked = !!wear;
      if (!wear) wear = GW.norm({ slot: 'bag' });
    }
    // as Góc thử đồ picks: a mẫu's cut-out, the product's, the drawing last
    function wearSrc() {
      var ch = choices.filter(function (c) { return c.cut; })[0];
      if (ch) return ch.cut;
      if (!cutImg.hidden && cutImg.getAttribute('src')) return cutImg.getAttribute('src');
      return wear.img || null;
    }
    function renderWear() {
      if (!wearBox || !wear) return;
      var on = form.elements['wear_on'].checked;
      wearBox.querySelector('.ad-wear-body').hidden = !on;
      if (!on) return;
      form.elements['wear_slot'].value = wear.slot;
      form.elements['wear_h'].value = wear.h;
      wearBox.querySelector('.ad-wear-hv').textContent = Math.round(wear.h * 100) + '%';
      var who = form.elements['wear_who'].value || 'p1', key = who + '-front', at = GW.AT[key];
      var fr = wearBox.querySelector('.ad-wear-fr'), src = wearSrc();
      fr.style.aspectRatio = String(at[0]);
      var st = GW.place(key, wear, false), f = GW.held(wear) && GW.fist(key);
      fr.innerHTML = '<img src="images/studio/char/' + key + '.webp" alt="" draggable="false">' +
        (src ? '<img class="ad-wear-acc" src="' + esc(src) + '" alt="" draggable="false" style="left:' + st.left + ';top:' + st.top +
          ';height:' + st.height + ';transform:' + st.transform + '">' : '') +
        (src && f ? '<img src="images/studio/char/' + key + '-tay.webp" alt="" draggable="false" style="left:' + f.left + ';top:' + f.top +
          ';width:' + f.width + ';height:' + f.height + '">' : '');
      wearBox.querySelector('.ad-wear-src').textContent = !src
        ? 'Chưa có ảnh để đeo: thêm Ảnh cắt nền ở trên (hoặc ảnh cắt nền cho từng mẫu).'
        : src === wear.img ? 'Đang dùng tranh vẽ, vì món chưa có Ảnh cắt nền. Thêm Ảnh cắt nền ở trên là Góc thử đồ dùng ảnh thật.'
        : choices.some(function (c) { return c.cut; }) ? 'Xem thử bằng ảnh cắt nền của mẫu đầu tiên có ảnh.'
        : 'Đang dùng Ảnh cắt nền ở trên (ảnh thật).' + (wear.img ? ' Tranh vẽ cũ chỉ để dự phòng.' : '');
      wearBox.querySelector('.ad-wear-noimg').hidden = !wear.img || src === wear.img;
    }
    if (wearBox) {
      wearBox.addEventListener('change', function (e) {
        var n = e.target.name;
        if (n === 'wear_slot') {
          // another way of wearing: its usual size and hold point
          var img = wear.img;
          wear = GW.norm({ slot: e.target.value });
          wear.img = img;
        }
        renderWear();
      });
      wearBox.addEventListener('input', function (e) {
        if (e.target.name !== 'wear_h') return;
        wear.h = +e.target.value;
        renderWear();
      });
      wearBox.addEventListener('click', function (e) {
        if (e.target.closest('.ad-wear-reset')) { wear.dx = 0; wear.dy = GW.SLOT_DEF[wear.slot].dy; renderWear(); }
        if (e.target.closest('.ad-wear-noimg')) { wear.img = null; renderWear(); }
      });
      // drag the piece where it hangs: the nudge is in character heights
      var drag = null;
      wearBox.addEventListener('pointerdown', function (e) {
        if (!e.target.classList.contains('ad-wear-acc')) return;
        e.preventDefault();
        var h = wearBox.querySelector('.ad-wear-fr').getBoundingClientRect().height;
        drag = { x: e.clientX, y: e.clientY, dx: wear.dx, dy: wear.dy, h: h, el: e.target };
        e.target.setPointerCapture(e.pointerId);
      });
      wearBox.addEventListener('pointermove', function (e) {
        if (!drag) return;
        wear.dx = Math.max(-0.5, Math.min(0.5, drag.dx + (e.clientX - drag.x) / drag.h));
        wear.dy = Math.max(-0.5, Math.min(0.5, drag.dy + (e.clientY - drag.y) / drag.h));
        var key = (form.elements['wear_who'].value || 'p1') + '-front', st = GW.place(key, wear, false);
        drag.el.style.left = st.left; drag.el.style.top = st.top;
      });
      var drop = function () { drag = null; };
      wearBox.addEventListener('pointerup', drop);
      wearBox.addEventListener('pointercancel', drop);
    }
    renderWear();

    el.main.querySelector('.ad-cancel').addEventListener('click', function () {
      editingProduct = null; renderProducts();
    });

    var del = form.querySelector('.ad-del');
    if (del) del.addEventListener('click', function () {
      if (!window.confirm('Xoá “' + p.name_vi + '”? Đơn hàng cũ vẫn giữ tên và giá đã chốt.')) return;
      window.GemDB.deleteProduct(p.id)
        .then(function () { toast('Đã xoá'); editingProduct = null; return load(); })
        .catch(function (e) { toast(e.message || 'Không xoá được', true); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.ad-err');
      var f = form.elements;
      var name = f['name_vi'].value.trim();
      var sku  = f['sku'].value.trim();

      if (!name) { err.textContent = 'Sản phẩm cần có tên tiếng Việt.'; err.hidden = false; return; }
      if (!sku)  { err.textContent = 'Sản phẩm cần có mã hàng.'; err.hidden = false; return; }
      var minV = f['price'].value.trim(), maxV = f['price_max'].value.trim();
      var min = minV === '' ? null : parseInt(minV, 10);
      var max = maxV === '' ? null : parseInt(maxV, 10);
      if (max != null && min == null) { err.textContent = 'Có giá “đến” thì phải có giá đầu.'; err.hidden = false; return; }
      if (max != null && max < min)   { err.textContent = 'Giá “đến” phải lớn hơn giá đầu.'; err.hidden = false; return; }

      var labelVi = f['opt_label_vi'].value.trim(), labelEn = f['opt_label_en'].value.trim();
      for (var ci = 0; ci < choices.length; ci++) {
        if (!(choices[ci].vi || '').trim()) {
          err.textContent = 'Lựa chọn thứ ' + (ci + 1) + ' chưa có tên tiếng Việt.'; err.hidden = false; return;
        }
      }
      if (choices.length && !labelVi) {
        err.textContent = 'Đặt tên cho lựa chọn (vd “Mùi hương”, “Cỡ”) — nút trên thẻ sẽ là “Chọn mùi hương”.';
        err.hidden = false; return;
      }
      err.hidden = true;

      // New choices get a key from their name; saved ones keep theirs
      var used = {};
      choices.forEach(function (c) { if (c.key) used[c.key] = true; });
      choices.forEach(function (c) {
        if (c.key) return;
        var base = String(c.vi).normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'lua-chon';
        var k = base, n = 2;
        while (used[k]) k = base + '-' + n++;
        used[k] = true;
        c.key = k;
      });
      var options = choices.length ? {
        label_vi: labelVi,
        label_en: labelEn || undefined,     // left out of the JSON when empty
        choices: choices.map(function (c) {
          var o = { key: c.key, vi: c.vi.trim() };
          ['en', 'note_vi', 'note_en'].forEach(function (k) {
            var v = (c[k] || '').trim();
            if (v) o[k] = v;
          });
          if (c.image) o.image = c.image;
          if (c.cut) o.cut = c.cut;
          if (c.out) o.out = true;
          return o;
        })
      } : null;

      var row = {
        sku: sku, category: f['category'].value,
        name_vi: name,
        name_en: f['name_en'].value.trim() || null,
        desc_vi: f['desc_vi'].value.trim() || null,
        desc_en: f['desc_en'].value.trim() || null,
        consignor: f['consignor'].value.trim() || null,
        options: options,
        notes_vi: f['notes_vi'].value.trim() || null,
        notes_en: f['notes_en'].value.trim() || null,
        price: min, price_max: max, image: image,
        gallery: gallery,
        shelf: f['shelf'].value || null,
        in_stock: f['in_stock'].checked,
        is_published: f['is_published'].checked
      };
      if (!p.id) row.sort_order = (products.reduce(function (m, x) { return Math.max(m, x.sort_order || 0); }, 0)) + 10;
      // only once the database has the column (20261025_thu_do.sql)
      if (wearBox && (!p.id || 'wear' in p)) {
        var r3 = function (v) { return Math.round(v * 1000) / 1000; };
        row.wear = f['wear_on'].checked ? { slot: wear.slot, h: r3(wear.h), dx: r3(wear.dx), dy: r3(wear.dy), ax: r3(wear.ax), ay: r3(wear.ay) } : null;
        if (row.wear && wear.img) row.wear.img = wear.img;
      }

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Đang lưu…';
      var job = (pendingCut ? up(pendingCut) : Promise.resolve(cutout)).then(function (cut) {
        row.cutout = cut || null;
        return p.id ? window.GemDB.updateProduct(p.id, row) : window.GemDB.createProduct(row);
      });
      job.then(function () {
        toast('Đã lưu');
        editingProduct = null; return load();
      }).catch(function (e2) {
        btn.disabled = false; btn.textContent = 'Lưu';
        // Mã hàng trùng là lỗi hay gặp nhất, nói thẳng thay vì để lộ câu của Postgres
        var m = e2.message || '';
        err.textContent = /duplicate|unique/i.test(m)
          ? 'Mã hàng “' + sku + '” đã có rồi. Chọn mã khác.'
          : /products_options_ok/.test(m)
          ? 'Lựa chọn chưa hợp lệ: tên dài quá 60 chữ, mô tả quá 300 chữ, hoặc ảnh không tải lên từ trang này.'
          : ('Không lưu được. ' + m);
        err.hidden = false;
      });
    });
  }

  /* ---------- Giá thiết kế (owner) ----------
     The numbers a design made at Bàn thiết kế is priced by (settings
     "design_pricing"): js/patch.js shows the price, create_order charges
     it (design_price), both from this one row. */
  // embroider: "giữa dây" on the strap, "giữa quai" on a bag (GemPatch.embName)
  var DP_OPTS = { quilt: 'Chần bông', pocket: 'Mỗi túi trong thêm', zip: 'Thêm khoá kéo', snap: 'Thêm nút bấm',
    embroider: 'Thêu chỉ' };
  function renderPricing() {
    var P = window.GemPatch, PR = P.PRICING;
    var num = function (name, v, label) {
      return '<label class="ad-dp-n"><span>' + esc(label) + '</span><input type="number" min="0" max="10000000" step="1000" name="' +
        esc(name) + '" value="' + (v == null ? '' : v) + '"></label>';
    };
    // bags taken off the table (PRODUCTS off) keep their prices, unshown
    var cards = Object.keys(PR.products).filter(function (id) { return !P.PRODUCTS[id].off; }).map(function (id) {
      var pr = PR.products[id], p = P.PRODUCTS[id];
      var lay = p.layouts.map(function (x) { return num('l.' + id + '.' + x, (pr.layouts || {})[x] || 0, P.layoutName(id, x, 'vi')); }).join('');
      var sizes = P.sizesOf(id).slice(1).map(function (z, i) {
        return num('s.' + id + '.' + (i + 1), (pr.sizes || [])[i + 1] || 0, P.sizeLabel(id, i + 1, 'vi'));
      }).join('');
      var opts = Object.keys(DP_OPTS).filter(function (k) { return k in pr; }).map(function (k) {
        return num('o.' + id + '.' + k, pr[k], k === 'embroider' ? P.embName(id, 'vi') : DP_OPTS[k]);
      }).join('') + (pr.ties ? P.PRODUCTS[id].ties.map(function (k, i) {
        // "đến" filled in: a range (the bow, by its size), Gem settles it
        var f = P.fee(pr.ties[i]);
        return i ? num('t.' + id + '.' + i, f[0], 'Buộc vai: ' + P.TIES[k].vi + ' — từ') +
          num('tm.' + id + '.' + i, f[1] > f[0] ? f[1] : null, '… đến (trống = một giá)') : '';
      }).join('') : '');
      return '<fieldset class="ad-dp" data-id="' + esc(id) + '"><legend>' + esc(p.vi) + '</legend>' +
        '<div class="ad-dp-row">' + num('b.' + id, pr.base, 'Giá nền (cỡ thường)') +
          num('f.' + id, pr.fabric != null ? pr.fabric : null, 'Mỗi vải thêm (trống = mặc định)') + '</div>' +
        '<p class="ad-dp-h">Kiểu ghép — cộng thêm</p><div class="ad-dp-row">' + lay + '</div>' +
        (sizes ? '<p class="ad-dp-h">Cỡ lớn hơn — cộng thêm</p><div class="ad-dp-row">' + sizes + '</div>' : '') +
        (opts ? '<p class="ad-dp-h">Tuỳ chọn</p><div class="ad-dp-row">' + opts + '</div>' : '') +
      '</fieldset>';
    }).join('');
    el.main.innerHTML =
      '<div class="ad-filters"><button type="button" class="ad-filter ad-dp-back">← Sản phẩm</button></div>' +
      '<p class="ad-hint">Giá một thiết kế = giá nền + kiểu ghép + mỗi vải thêm (từ vải thứ hai) + cỡ lớn hơn + tuỳ chọn. ' +
        'Khách tự điền cỡ riêng thì đơn ghi “báo giá sau”. Túi trong: 1 túi luôn miễn phí; khoá kéo của túi khoá kéo ' +
        'và túi laptop có sẵn, không tính. Cả món dùng một vải thì không tính phí kiểu ghép (trừ Tự vẽ và số bông của Bloom).' +
        '<br>Đơn mới tính theo giá đang lưu; đơn cũ giữ giá lúc đặt.</p>' +
      '<form class="ad-dp-form">' +
        '<div class="ad-dp-row">' + num('fabric', PR.fabric, 'Mỗi vải thêm (mặc định)') + '</div>' + cards +
        '<button type="submit" class="ad-btn ad-dp-save">Lưu giá thiết kế</button>' +
      '</form>';
    el.main.querySelector('.ad-dp-back').addEventListener('click', function () { editingPricing = false; renderProducts(); });
    el.main.querySelector('.ad-dp-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, bad = false;
      var val = function (name) {
        var inp = form.querySelector('[name="' + name + '"]');
        if (!inp || inp.value.trim() === '') return null;
        var v = Math.round(+inp.value);
        if (!(v >= 0 && v <= 10000000)) { bad = true; return null; }
        return v;
      };
      var out = { fabric: val('fabric'), gem: PR.gem, products: {} };
      Object.keys(PR.products).forEach(function (id) {
        if (P.PRODUCTS[id].off) { out.products[id] = PR.products[id]; return; }   // not shown: as saved
        var pr = PR.products[id], o = { base: val('b.' + id), layouts: {} };
        if (o.base == null) bad = true;
        var f = val('f.' + id);
        if (f != null) o.fabric = f;
        P.PRODUCTS[id].layouts.forEach(function (x) { o.layouts[x] = val('l.' + id + '.' + x) || 0; });
        if (pr.sizes) o.sizes = pr.sizes.map(function (v0, i) { return i ? val('s.' + id + '.' + i) || 0 : 0; });
        if (pr.ties) o.ties = pr.ties.map(function (v0, i) {
          if (!i) return 0;
          var a = val('t.' + id + '.' + i) || 0, b = val('tm.' + id + '.' + i);
          if (b != null && b < a) bad = true;
          return b != null && b > a ? [a, b] : a;
        });
        Object.keys(DP_OPTS).forEach(function (k) { if (k in pr) o[k] = val('o.' + id + '.' + k) || 0; });
        out.products[id] = o;
      });
      if (bad || out.fabric == null) return toast('Có ô giá trống hoặc không hợp lệ', true);
      window.GemDB.saveDesignPricing(out)
        .then(function () { P.setPricing(out); toast('Đã lưu giá thiết kế'); })
        .catch(function () { toast('Không lưu được', true); });
    });
  }

  function renderProducts() {
    if (editingProduct !== null) return renderProductForm();
    if (editingPricing) return renderPricing();
    // owner only: where each product stands in Studio 2D, and a shortcut
    // that opens the layout editor with it ready to place
    var studioOn = !!(me && me.role === 'owner' && window.GemStudioEditor);

    var byCat = {}, order = [];
    products.forEach(function (p) {
      if (!byCat[p.category]) { byCat[p.category] = []; order.push(p.category); }
      byCat[p.category].push(p);
    });

    // "Ký gửi · Tiny's Herbal · Mùi hương: 13 (2 hết)" under the name
    function prodMeta(p) {
      var cs = (p.options && p.options.choices) || [];
      var out = cs.filter(function (c) { return c.out; }).length;
      var bits = [];
      if (p.consignor) bits.push('Ký gửi · ' + esc(p.consignor));
      if (cs.length) bits.push(esc(p.options.label_vi || 'Lựa chọn') + ': ' + cs.length + (out ? ' (' + out + ' hết)' : ''));
      return bits.length ? '<p class="ad-prod-meta">' + bits.join(' · ') + '</p>' : '';
    }

    var groups = order.map(function (cat) {
      return '<section class="ad-cat">' +
        '<h3>' + esc(CATEGORIES[cat] || cat) + '</h3>' +
        byCat[cat].map(function (p) {
          return '<div class="ad-prod' + (p.is_published ? '' : ' is-hidden') + '" data-id="' + esc(p.id) + '">' +
            '<div class="ad-prod-top">' +
              '<b>' + esc(p.name_vi) + '</b>' +
              '<span class="ad-sku">' + esc(p.sku) + '</span>' +
            '</div>' +
            prodMeta(p) +
            '<div class="ad-prod-price">' +
              '<label>Giá <input type="number" min="0" step="1000" class="ad-p-min" ' +
                'value="' + (p.price == null ? '' : p.price) + '" placeholder="Liên hệ"></label>' +
              '<label>đến <input type="number" min="0" step="1000" class="ad-p-max" ' +
                'value="' + (p.price_max == null ? '' : p.price_max) + '" placeholder="—"></label>' +
              '<button type="button" class="ad-btn ad-save">Lưu</button>' +
            '</div>' +
            '<div class="ad-acts">' +
              '<button type="button" class="ad-btn' + (p.in_stock ? '' : ' on') + '" data-t="stock">' +
                (p.in_stock ? 'Còn hàng' : 'Tạm hết') + '</button>' +
              '<button type="button" class="ad-btn' + (p.is_published ? '' : ' on') + '" data-t="pub">' +
                (p.is_published ? 'Đang bán' : 'Đang ẩn') + '</button>' +
              '<button type="button" class="ad-btn ad-edit-prod">Sửa</button>' +
            '</div>' +
            (studioOn
              ? '<p class="ad-prod-studio" data-sku="' + esc(p.sku) + '">' +
                '<span class="ad-ps-where">Studio 2D: …</span> ' +
                '<button type="button" class="ad-btn ad-ps-place">Đặt vào Studio</button></p>' : '') +
          '</div>';
        }).join('') +
      '</section>';
    }).join('');

    el.main.innerHTML =
      '<div class="ad-filters"><button type="button" class="ad-filter active ad-new-prod">+ Thêm sản phẩm</button>' +
        // owner only: the prices of designs made at Bàn thiết kế
        (me && me.role === 'owner' && window.GemPatch ? '<button type="button" class="ad-filter ad-dp-open">Giá thiết kế</button>' : '') +
      '</div>' +
      '<p class="ad-hint">Để trống ô giá là web hiện “Liên hệ”. Ô “đến” chỉ ' +
      'điền khi bán theo khoảng giá.<br>' +
      'Món mới tự có thẻ trên trang Sản phẩm (đúng danh mục, theo thứ tự ở đây), ' +
      'và có trên kệ Studio 2D nếu chọn “Kệ”.</p>' + groups;

    el.main.querySelector('.ad-new-prod').addEventListener('click', function () {
      editingProduct = {}; renderProductForm();
    });
    var dpOpen = el.main.querySelector('.ad-dp-open');
    if (dpOpen) dpOpen.addEventListener('click', function () {
      editingPricing = true;
      window.GemPatch.loadPricing().then(renderPricing, renderPricing);
    });

    if (studioOn) {
      window.GemDB.studioLayout('live').catch(function () { return null; }).then(function (live) {
        var L = window.GemLayout && window.GemLayout.sanitize(live);
        var where = {};
        if (L) {
          L.items.concat(L.outside ? L.outside.items : []).forEach(function (it) {
            if (it.sku) where[it.sku] = (where[it.sku] || 0) + 1;
          });
        }
        el.main.querySelectorAll('.ad-prod-studio').forEach(function (row) {
          var n = where[row.getAttribute('data-sku')] || 0;
          row.querySelector('.ad-ps-where').textContent = n
            ? 'Studio 2D: đang bày ' + n + ' chỗ (khách kéo vào giỏ được)'
            : 'Studio 2D: chưa bày';
        });
      });
      el.main.querySelectorAll('.ad-ps-place').forEach(function (b) {
        b.addEventListener('click', function () {
          var sku = b.closest('.ad-prod-studio').getAttribute('data-sku');
          var p = products.filter(function (x) { return x.sku === sku; })[0];
          window.GemStudioEditor.queueProduct(sku, p && p.image);
          var tabBtn = document.querySelector('[data-tab="studio"]');
          if (tabBtn) tabBtn.click();
        });
      });
    }

    el.main.querySelectorAll('.ad-prod').forEach(function (d) {
      var id = d.getAttribute('data-id');
      var p = products.filter(function (x) { return x.id === id; })[0];

      d.querySelector('.ad-save').addEventListener('click', function () {
        var minV = d.querySelector('.ad-p-min').value.trim();
        var maxV = d.querySelector('.ad-p-max').value.trim();
        var min = minV === '' ? null : parseInt(minV, 10);
        var max = maxV === '' ? null : parseInt(maxV, 10);

        if (max != null && min == null) return toast('Có giá “đến” thì phải có giá đầu', true);
        if (max != null && max < min)   return toast('Giá “đến” phải lớn hơn giá đầu', true);

        window.GemDB.updateProduct(id, { price: min, price_max: max })
          .then(function () { toast('Đã lưu giá'); return load(); })
          .catch(function () { toast('Không lưu được', true); });
      });

      d.querySelector('.ad-edit-prod').addEventListener('click', function () {
        editingProduct = p; renderProductForm();
      });

      d.querySelectorAll('[data-t]').forEach(function (b) {
        b.addEventListener('click', function () {
          var patch = b.getAttribute('data-t') === 'stock'
            ? { in_stock: !p.in_stock }
            : { is_published: !p.is_published };
          b.disabled = true;
          window.GemDB.updateProduct(id, patch)
            .then(function () { toast('Đã cập nhật'); return load(); })
            .catch(function () { b.disabled = false; toast('Không lưu được', true); });
        });
      });
    });
  }

  /* ================= KHO VẢI =================
     Vải thật Gem đang có, cho rổ vải ở Bàn thiết kế (Studio 2D). Khách thấy
     ảnh + tên + chất liệu; chỗ để nằm ở bảng fabric_private, chỉ nhân sự
     đọc được (RLS). Tên do nhân sự gõ: luôn qua esc(). */
  var FAB_TONES = { xanh: 'Xanh lá', lam: 'Xanh lam', hong: 'Hồng – đỏ', nau: 'Nâu đất', trung: 'Trung tính' };
  var FAB_KINDS = { tron: 'Trơn', caro: 'Caro', soc: 'Sọc / kẻ', cham: 'Chấm bi', hoa: 'Hoa nhí',
    ren: 'Ren', hoato: 'Hoa to / họa tiết lớn', ono: 'Ô nhỏ', tho: 'Thổ cẩm' };
  var FAB_MATS = ['Cotton', 'Đũi / linen', 'Kaki', 'Kate', 'Voan', 'Lụa', 'Satin', 'Tafta', 'Nhung', 'Nhung tăm',
    'Thun', 'Dạ', 'Nỉ', 'Gấm', 'Thổ cẩm', 'Jean', 'Ren', 'Kim tuyến', 'Vải thô', 'Vải pha'];

  function placeOf(f) {
    var fp = f && f.fabric_private;
    if (Array.isArray(fp)) fp = fp[0];
    return (fp && fp.place) || '';
  }
  function fabricById(id) { return fabrics.filter(function (f) { return f.id === id; })[0] || null; }

  // A custom design in the order note (studio.html?d=…, after a line
  // "Thiết kế riêng × 2 — …"): which real fabrics to take, how many patches
  // of each, and where they are kept.
  function fabricsToTake(o) {
    var P = window.GemPatch;
    if (!P || !o.note || o.note.indexOf('studio.html?d=') < 0) return '';
    var need = {}, order = [], qty = 1;
    o.note.split('\n').forEach(function (line) {
      var q = line.match(/×\s*(\d+)\s*—/);
      if (q) qty = Math.min(99, +q[1] || 1);
      var m = line.match(/studio\.html\?d=([^\s&]+)/);
      if (!m) return;
      var d = null;
      try { d = P.parse(decodeURIComponent(m[1])); } catch (e) { d = null; }
      for (var i = 0; d && d.fab && i < d.fab.length; i++) {
        var k = P.keyAt(d, i);
        if (!P.isReal(k)) continue;
        var id = +k.slice(1);
        if (!need[id]) { need[id] = 0; order.push(id); }
        need[id] += qty;
      }
      qty = 1;
    });
    if (!order.length) return '';
    return '<div class="ad-od-fab"><b>Vải cần lấy (thiết kế riêng)</b><ul>' + order.map(function (id) {
      var f = fabricById(id);
      return '<li>' + (f ? '<img src="' + esc(f.img) + '" alt="" loading="lazy">' : '<span class="ad-fab-none"></span>') +
        '<span><b>' + esc(f ? f.name_vi : 'Vải #' + id) + '</b> · ' + need[id] + ' mảnh' +
        (f && !f.in_stock ? ' <em>(đang ghi Hết)</em>' : '') +
        '<small>' + esc(f ? (placeOf(f) || 'Chưa ghi chỗ để') : 'Tấm này đã bị xoá khỏi kho') + '</small></span></li>';
    }).join('') + '</ul></div>';
  }

  function renderFabrics() {
    if (editingFabric !== null) return renderFabricForm();
    var count = function (fn) { return fabrics.filter(fn).length; };
    var tests = {
      all: function () { return true; },
      out: function (f) { return !f.in_stock; },
      hidden: function (f) { return !f.is_visible; }
    };
    Object.keys(FAB_TONES).forEach(function (t) { tests[t] = function (f) { return f.tone === t; }; });
    if (!tests[fabFilter]) fabFilter = 'all';
    var chips = [['all', 'Tất cả']].concat(Object.keys(FAB_TONES).map(function (t) { return [t, FAB_TONES[t]]; }))
      .concat([['out', 'Đang hết'], ['hidden', 'Đang ẩn']]).map(function (c) {
        var n = count(tests[c[0]]);
        if (!n && (c[0] === 'out' || c[0] === 'hidden')) return '';
        return '<button type="button" class="ad-filter' + (fabFilter === c[0] ? ' active' : '') + '" data-ff="' + c[0] + '">' +
          c[1] + ' <b>' + n + '</b></button>';
      }).join('');
    var list = fabrics.filter(tests[fabFilter]).slice().sort(function (a, b) {
      var ta = Object.keys(FAB_TONES).indexOf(a.tone), tb = Object.keys(FAB_TONES).indexOf(b.tone);
      return fabFilter === 'all' ? (ta - tb || a.sort_order - b.sort_order || a.id - b.id) : (a.sort_order - b.sort_order || a.id - b.id);
    });
    var grid = list.length ? '<div class="ad-fabs">' + list.map(function (f) {
      return '<div class="ad-fab' + (f.in_stock ? '' : ' is-out') + (f.is_visible ? '' : ' is-hidden') + '" data-id="' + f.id + '">' +
        '<img src="' + esc(f.img) + '" alt="" loading="lazy">' +
        '<div class="ad-fab-body">' +
          '<p class="ad-fab-name"><b>' + esc(f.name_vi) + '</b> <span>#' + f.id + '</span></p>' +
          '<p class="ad-fab-meta">' + esc(FAB_TONES[f.tone] || f.tone) + ' · ' + esc(FAB_KINDS[f.kind] || f.kind) +
            (f.material ? ' · ' + esc(f.material) : '') + '</p>' +
          '<p class="ad-fab-place">' + (placeOf(f) ? 'Chỗ để: ' + esc(placeOf(f)) : 'Chưa ghi chỗ để') + '</p>' +
          (f.is_visible ? '' : '<p class="ad-fab-place">Đang ẩn khỏi rổ vải</p>') +
          '<div class="ad-acts">' +
            '<button type="button" class="ad-btn' + (f.in_stock ? '' : ' on') + '" data-fs="stock">' + (f.in_stock ? 'Còn' : 'Hết') + '</button>' +
            '<button type="button" class="ad-btn" data-fs="edit">Sửa</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' : '<div class="ad-empty"><p>Chưa có tấm vải nào ở mục này.</p></div>';

    el.main.innerHTML =
      '<div class="ad-filters">' + chips +
        '<button type="button" class="ad-filter active ad-new-fab">+ Thêm vải</button></div>' +
      '<p class="ad-hint">Mỗi tấm là một ảnh vuông khách thấy trong rổ vải ở Bàn thiết kế (Studio 2D). ' +
        'Hết vải thì bấm “Còn” để chuyển thành “Hết”: khách không chọn được nữa, còn thiết kế cũ vẫn giữ ảnh. ' +
        'Chỗ để chỉ nhân sự thấy.</p>' + grid;

    el.main.querySelectorAll('[data-ff]').forEach(function (b) {
      b.addEventListener('click', function () { fabFilter = b.getAttribute('data-ff'); renderFabrics(); });
    });
    el.main.querySelector('.ad-new-fab').addEventListener('click', function () { editingFabric = {}; renderFabricForm(); });
    el.main.querySelectorAll('.ad-fab').forEach(function (card) {
      var f = fabricById(+card.getAttribute('data-id'));
      card.querySelector('[data-fs="edit"]').addEventListener('click', function () { editingFabric = f; renderFabricForm(); });
      card.querySelector('[data-fs="stock"]').addEventListener('click', function (e) {
        var b = e.currentTarget;
        b.disabled = true;
        window.GemDB.saveFabric(f.id, { in_stock: !f.in_stock })
          .then(function () { toast(f.in_stock ? 'Đã ghi Hết' : 'Đã ghi Còn'); return load(); })
          .catch(function () { b.disabled = false; toast('Không lưu được', true); });
      });
    });
  }

  /* ---------- thêm / sửa một tấm ----------
     Ảnh: chụp tấm vải bằng điện thoại, kéo khung vuông vào chỗ phẳng, rõ hoa
     văn. Web cắt đúng khung, làm đều sáng tối (nếp gấp, bóng) rồi thu còn
     320px — đúng cỡ rổ vải dùng — trước khi tải lên kho gem-media. */
  function renderFabricForm() {
    var f = editingFabric || {};
    var isNew = !f.id;
    var crop = null;   // {img, x, y, s, w, h}: the photo and the square on it

    el.main.innerHTML =
      '<button type="button" class="ad-btn ad-cancel">‹ Về kho vải</button>' +
      '<form class="ad-post-form ad-fab-form">' +
        '<h3>' + (isNew ? 'Thêm vải' : 'Sửa vải #' + f.id) + '</h3>' +
        '<div class="ad-f">' +
          '<span>Ảnh tấm vải</span>' +
          '<div class="ad-fab-pics">' +
            '<figure class="ad-fab-out"><canvas width="320" height="320"' + (f.img ? ' hidden' : '') + '></canvas>' +
              (f.img ? '<img src="' + esc(f.img) + '" alt="">' : '') +
              '<figcaption>Khách thấy ảnh này</figcaption></figure>' +
            '<div class="ad-fab-pick">' +
              '<label class="ad-btn ad-upload">' + (f.img ? 'Chụp / chọn ảnh khác' : 'Chụp / chọn ảnh') +
                '<input type="file" accept="image/*" hidden data-fab-photo></label>' +
              '<p class="ad-hint">Chụp thẳng từ trên xuống, đủ sáng, trải phẳng tấm vải.</p>' +
            '</div>' +
          '</div>' +
          '<div class="ad-crop" hidden>' +
            '<div class="ad-crop-stage"><canvas class="ad-crop-src"></canvas><div class="ad-crop-box" tabindex="0" ' +
              'aria-label="Khung vuông: kéo để chọn chỗ"></div></div>' +
            '<label class="ad-crop-size">Khung <input type="range" min="15" max="100" value="60" data-crop-size></label>' +
            '<label class="ad-f"><span>Làm phẳng</span><select data-crop-mode>' +
              '<option value="plain">Vải trơn: vẽ lại cho phẳng hẳn (giữ màu, thớ sợi)</option>' +
              '<option value="print">Vải có hoa văn: làm đều chỗ sáng chỗ tối</option>' +
              '<option value="none">Giữ nguyên ảnh chụp</option></select></label>' +
            '<label class="ad-crop-size">Độ sáng <input type="range" min="-30" max="30" value="0" step="5" data-crop-bright></label>' +
            '<p class="ad-hint">Kéo khung vuông vào chỗ vải phẳng, thấy rõ hoa văn. Khung càng to, ' +
              'hoa văn trên món càng nhỏ. Web tự làm sáng và bớt vàng do đèn trong phòng.</p>' +
          '</div>' +
        '</div>' +
        '<label class="ad-f"><span>Tên (tiếng Việt)</span><input name="name_vi" maxlength="60" required placeholder="vd Caro xanh lá"></label>' +
        '<label class="ad-f"><span>Tên (tiếng Anh, không bắt buộc)</span><input name="name_en" maxlength="60" placeholder="vd Green gingham"></label>' +
        '<div class="ad-f-row">' +
          '<label class="ad-f"><span>Tông màu</span><select name="tone">' + Object.keys(FAB_TONES).map(function (k) {
            return '<option value="' + k + '">' + esc(FAB_TONES[k]) + '</option>';
          }).join('') + '</select></label>' +
          '<label class="ad-f"><span>Hoa văn</span><select name="kind">' + Object.keys(FAB_KINDS).map(function (k) {
            return '<option value="' + k + '">' + esc(FAB_KINDS[k]) + '</option>';
          }).join('') + '</select></label>' +
        '</div>' +
        '<label class="ad-f"><span>Chất liệu</span><input name="material" maxlength="40" list="ad-fab-mats" placeholder="vd Cotton">' +
          '<datalist id="ad-fab-mats">' + FAB_MATS.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist></label>' +
        '<label class="ad-f"><span>Chỗ để ở Gem (chỉ nhân sự thấy)</span><input name="place" maxlength="120" placeholder="vd Phòng nhỏ, ngăn dưới cùng tủ vải to"></label>' +
        '<label class="ad-check"><input type="checkbox" name="in_stock"> Còn vải (khách chọn được)</label>' +
        '<label class="ad-check"><input type="checkbox" name="is_visible"> Cho khách thấy trong rổ vải</label>' +
        '<p class="ad-hint">Tông màu và hoa văn giúp web chọn vải cho từng “tâm trạng” và cho nút lọc màu ở rổ vải.</p>' +
        '<div class="ad-acts">' +
          '<button type="submit" class="ad-btn ad-primary">Lưu vải</button>' +
          (isNew ? '' : '<button type="button" class="ad-btn ad-danger ad-fab-del">Xoá tấm này</button>') +
        '</div>' +
      '</form>';

    var form = el.main.querySelector('form');
    var F = form.elements;
    F['name_vi'].value = f.name_vi || '';
    F['name_en'].value = f.name_en || '';
    F['tone'].value = f.tone || 'xanh';
    F['kind'].value = f.kind || 'tron';
    F['material'].value = f.material || '';
    F['place'].value = placeOf(f);
    F['in_stock'].checked = f.in_stock !== false;
    F['is_visible'].checked = f.is_visible !== false;

    el.main.querySelector('.ad-cancel').addEventListener('click', function () { editingFabric = null; renderFabrics(); });

    var cropEl = el.main.querySelector('.ad-crop');
    var src = cropEl.querySelector('.ad-crop-src');
    var box = cropEl.querySelector('.ad-crop-box');
    var outFig = el.main.querySelector('.ad-fab-out');
    var outCv = outFig.querySelector('canvas');
    var job = 0;

    // the square, in the photo's pixels, drawn over the shrunk copy
    function placeBox() {
      var k = src.clientWidth / crop.w;
      box.style.left = (crop.x * k) + 'px';
      box.style.top = (crop.y * k) + 'px';
      box.style.width = box.style.height = (crop.s * k) + 'px';
    }
    function preview(full) {
      var mine = ++job;
      var mat = (F['material'].value || '').trim().toLowerCase();
      return window.GemImg.fabric(crop.img, crop, {
        mode: cropEl.querySelector('[data-crop-mode]').value,
        bright: +cropEl.querySelector('[data-crop-bright]').value,
        shiny: /^(satin|tafta|lụa|nhung)$/.test(mat),
        ribbed: /^(nhung tăm|thun)/.test(mat),
        name: 'vai',
        small: !full
      })
        .then(function (r) {
          if (mine !== job) return r;
          outCv.hidden = false;
          var old = outFig.querySelector('img');
          if (old) old.remove();
          outCv.getContext('2d').drawImage(r.canvas, 0, 0);
          return r;
        });
    }
    var previewSoon = (function () {
      var timer = null;
      return function () { clearTimeout(timer); timer = setTimeout(preview, 120); };
    })();

    el.main.querySelector('[data-fab-photo]').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      window.GemImg.load(file).then(function (img) {
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.round(Math.min(w, h) * 0.6);
        crop = { img: img, w: w, h: h, s: s, x: Math.round((w - s) / 2), y: Math.round((h - s) / 2) };
        // a shrunk copy to frame on (the full photo is only read when cutting)
        var k = Math.min(1, 900 / Math.max(w, h));
        src.width = Math.round(w * k); src.height = Math.round(h * k);
        src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
        cropEl.hidden = false;
        cropEl.querySelector('[data-crop-size]').value = 60;
        placeBox();
        preview();
      }).catch(function (err) { toast(err.message || 'Không đọc được ảnh', true); });
    });

    cropEl.querySelector('[data-crop-size]').addEventListener('input', function (e) {
      if (!crop) return;
      var cx = crop.x + crop.s / 2, cy = crop.y + crop.s / 2;
      crop.s = Math.max(40, Math.round(Math.min(crop.w, crop.h) * e.target.value / 100));
      crop.x = Math.round(Math.max(0, Math.min(crop.w - crop.s, cx - crop.s / 2)));
      crop.y = Math.round(Math.max(0, Math.min(crop.h - crop.s, cy - crop.s / 2)));
      placeBox(); previewSoon();
    });
    // how to flatten follows the kind (plain or not) until staff pick it themselves
    var modeEl = cropEl.querySelector('[data-crop-mode]'), modeSet = false;
    modeEl.value = (f.kind || 'tron') === 'tron' ? 'plain' : 'print';
    modeEl.addEventListener('change', function () { modeSet = true; if (crop) preview(); });
    F['kind'].addEventListener('change', function () {
      if (!modeSet) modeEl.value = F['kind'].value === 'tron' ? 'plain' : 'print';
      if (crop) preview();
    });
    F['material'].addEventListener('change', function () { if (crop) preview(); });
    cropEl.querySelector('[data-crop-bright]').addEventListener('input', function () { if (crop) previewSoon(); });

    // drag the square (finger or mouse); arrow keys nudge it
    var drag = null;
    box.addEventListener('pointerdown', function (e) {
      if (!crop) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: crop.x, y0: crop.y };
      try { box.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var k = crop.w / src.clientWidth;
      crop.x = Math.round(Math.max(0, Math.min(crop.w - crop.s, drag.x0 + (e.clientX - drag.x) * k)));
      crop.y = Math.round(Math.max(0, Math.min(crop.h - crop.s, drag.y0 + (e.clientY - drag.y) * k)));
      placeBox();
    });
    var endDrag = function (e) { if (drag && e.pointerId === drag.id) { drag = null; preview(); } };
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);
    box.addEventListener('keydown', function (e) {
      var dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0, dy = { ArrowUp: -1, ArrowDown: 1 }[e.key] || 0;
      if (!crop || (!dx && !dy)) return;
      e.preventDefault();
      var step = Math.round(crop.s / 10);
      crop.x = Math.max(0, Math.min(crop.w - crop.s, crop.x + dx * step));
      crop.y = Math.max(0, Math.min(crop.h - crop.s, crop.y + dy * step));
      placeBox(); previewSoon();
    });
    window.addEventListener('resize', function onResize() {
      if (!document.body.contains(box)) { window.removeEventListener('resize', onResize); return; }
      if (crop) placeBox();
    });

    var del = el.main.querySelector('.ad-fab-del');
    if (del) del.addEventListener('click', function () {
      if (!window.confirm('Xoá hẳn “' + f.name_vi + '” khỏi kho?\n\nThiết kế cũ có tấm này sẽ hiện màu trơn thay cho ảnh. ' +
          'Nếu chỉ là hết vải, bấm “Còn” → “Hết” thay vì xoá.')) return;
      del.disabled = true;
      window.GemDB.deleteFabric(f.id)
        .then(function () { toast('Đã xoá'); editingFabric = null; return load(); })
        .catch(function (err) { del.disabled = false; toast(err.message || 'Không xoá được', true); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = F['name_vi'].value.trim();
      if (!name) return toast('Cần tên tấm vải', true);
      if (isNew && !crop) return toast('Chụp hoặc chọn ảnh tấm vải trước nhé', true);
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Đang lưu...';
      var row = {
        name_vi: name,
        name_en: F['name_en'].value.trim() || null,
        tone: F['tone'].value,
        kind: F['kind'].value,
        material: F['material'].value.trim() || null,
        in_stock: F['in_stock'].checked,
        is_visible: F['is_visible'].checked
      };
      var place = F['place'].value.trim();
      // a new picture: cut, upload, then the row points at it
      // a new picture: the swatch and the bigger photo round it, both uploaded
      var pic = crop ? preview(true).then(function (r) {
        var ext = function (f) { return f.name.split('.').pop(); };
        return Promise.all([
          window.GemDB.uploadImage(new File([r.file], 'vai-' + slugify(name) + '.' + ext(r.file), { type: r.file.type })),
          window.GemDB.uploadImage(new File([r.big], 'vai-' + slugify(name) + '-lon.' + ext(r.big), { type: r.big.type }))
        ]).then(function (urls) { row.img = urls[0]; row.photo = urls[1]; row.photo_k = r.k; });
      }) : Promise.resolve();
      if (isNew) {
        row.sort_order = fabrics.reduce(function (m, x) { return Math.max(m, x.sort_order || 0); }, 0) + 10;
      }
      pic.then(function () { return window.GemDB.saveFabric(f.id || null, row); })
        .then(function (saved) {
          var id = (saved && saved.id) || f.id;
          if (!id || place === placeOf(f)) return null;
          return window.GemDB.saveFabricPlace(id, place);
        })
        .then(function () { toast(isNew ? 'Đã thêm vào kho' : 'Đã lưu'); editingFabric = null; return load(); })
        .catch(function (err) {
          btn.disabled = false; btn.textContent = 'Lưu vải';
          toast(err.message || 'Không lưu được', true);
        });
    });
  }

  /* ================= BẢN TIN ================= */

  function slugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 60);
  }

  function renderPosts() {
    if (editingPost !== null) return renderPostForm();

    var list = posts.length ? posts.map(function (p) {
      return '<div class="ad-post' + (p.is_published ? '' : ' is-hidden') + '" data-id="' + esc(p.id) + '">' +
        (p.cover ? '<img class="ad-post-thumb" src="' + esc(p.cover) + '" alt="">' : '') +
        '<div class="ad-post-body">' +
          '<b>' + esc(p.title_vi) + '</b>' +
          '<p class="ad-post-meta">' +
            [p.happened_on, p.place].filter(Boolean).map(esc).join(' · ') +
            (p.is_published ? '' : ' · <span class="ad-paid">nháp</span>') +
          '</p>' +
        '</div>' +
        '<div class="ad-acts">' +
          '<button type="button" class="ad-btn ad-edit">Sửa</button>' +
          '<button type="button" class="ad-btn' + (p.is_published ? '' : ' on') + '" data-pub="' +
            (p.is_published ? '0' : '1') + '">' +
            (p.is_published ? 'Đang đăng' : 'Đăng bài') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="ad-empty"><p>Chưa có bài nào.</p></div>';

    el.main.innerHTML =
      '<div class="ad-filters"><button type="button" class="ad-filter active ad-new-post">+ Viết bài mới</button></div>' +
      list;

    el.main.querySelector('.ad-new-post').addEventListener('click', function () {
      editingPost = {}; renderPostForm();
    });

    el.main.querySelectorAll('.ad-post').forEach(function (d) {
      var id = d.getAttribute('data-id');
      var p = posts.filter(function (x) { return x.id === id; })[0];

      d.querySelector('.ad-edit').addEventListener('click', function () {
        editingPost = p; renderPostForm();
      });
      d.querySelector('[data-pub]').addEventListener('click', function (e) {
        e.target.disabled = true;
        window.GemDB.savePost(id, { is_published: e.target.getAttribute('data-pub') === '1' })
          .then(function () { toast('Đã cập nhật'); return load(); })
          .catch(function () { e.target.disabled = false; toast('Không lưu được', true); });
      });
    });
  }

  function renderPostForm() {
    var p = editingPost || {};
    var isNew = !p.id;

    function field(name, label, value, type) {
      var input = type === 'area'
        ? '<textarea name="' + name + '" rows="7"></textarea>'
        : '<input type="' + (type || 'text') + '" name="' + name + '">';
      return '<label class="ad-f"><span>' + esc(label) + '</span>' + input + '</label>';
    }

    el.main.innerHTML =
      '<button type="button" class="ad-btn ad-cancel">‹ Về danh sách</button>' +
      '<form class="ad-post-form">' +
        '<h3>' + (isNew ? 'Bài mới' : 'Sửa bài') + '</h3>' +
        field('title_vi', 'Tiêu đề (tiếng Việt)', p.title_vi) +
        field('title_en', 'Tiêu đề (tiếng Anh) — để trống thì web dùng bản tiếng Việt', p.title_en) +
        field('place', 'Ở đâu (ví dụ: BUV, Ngày Thanh niên LHQ)', p.place) +
        field('happened_on', 'Ngày diễn ra', p.happened_on, 'date') +
        field('excerpt_vi', 'Tóm tắt — hiện ở danh sách', p.excerpt_vi, 'area') +
        field('body_vi', 'Nội dung — cách đoạn bằng một dòng trống', p.body_vi, 'area') +
        field('excerpt_en', 'Tóm tắt tiếng Anh (không bắt buộc)', p.excerpt_en, 'area') +
        field('body_en', 'Nội dung tiếng Anh (không bắt buộc)', p.body_en, 'area') +
        '<div class="ad-f">' +
          '<span>Ảnh bìa</span>' +
          '<div class="ad-img-row">' +
            (p.cover
              ? '<img class="ad-cover-prev" src="' + esc(p.cover) + '" alt="">'
              : '<img class="ad-cover-prev" alt="" hidden>') +
            '<label class="ad-btn ad-upload">Chọn ảnh<input type="file" accept="image/*" hidden data-target="cover"></label>' +
            (p.cover ? '<button type="button" class="ad-btn ad-danger ad-rm-cover">Bỏ ảnh</button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="ad-f">' +
          '<span>Ảnh trong bài</span>' +
          '<div class="ad-gal"></div>' +
          '<label class="ad-btn ad-upload">Thêm ảnh<input type="file" accept="image/*" multiple hidden data-target="images"></label>' +
        '</div>' +
        '<label class="ad-check"><input type="checkbox" name="is_published"' +
          (p.is_published ? ' checked' : '') + '><span>Đăng lên web</span></label>' +
        '<div class="ad-acts">' +
          '<button type="submit" class="ad-btn ad-primary">Lưu</button>' +
          (isNew ? '' : '<button type="button" class="ad-btn ad-danger ad-del">Xoá bài</button>') +
        '</div>' +
        '<p class="ad-err" hidden></p>' +
      '</form>';

    var form = el.main.querySelector('.ad-post-form');
    // Gán bằng .value chứ không nhét vào HTML — chữ có dấu ngoặc kép sẽ phá vỡ
    // thuộc tính, và đây là chữ do người dùng gõ.
    ['title_vi','title_en','place','happened_on','excerpt_vi','body_vi','excerpt_en','body_en']
      .forEach(function (k) { if (form.elements[k]) form.elements[k].value = p[k] || ''; });

    var cover = p.cover || null;
    var images = (p.images || []).slice();

    function paintGallery() {
      var g = form.querySelector('.ad-gal');
      g.innerHTML = images.map(function (src, i) {
        return '<span class="ad-gal-item"><img src="' + esc(src) + '" alt="">' +
               '<button type="button" data-rm="' + i + '" aria-label="Bỏ ảnh">×</button></span>';
      }).join('');
      g.querySelectorAll('[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () {
          images.splice(parseInt(b.getAttribute('data-rm'), 10), 1);
          paintGallery();
        });
      });
    }
    paintGallery();

    form.querySelectorAll('input[type="file"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var files = Array.prototype.slice.call(inp.files || []);
        if (!files.length) return;
        var lbl = inp.closest('.ad-upload');
        var was = lbl.firstChild.nodeValue;
        lbl.firstChild.nodeValue = 'Đang tải…';
        Promise.all(files.map(function (f) { return window.GemDB.uploadImage(f); }))
          .then(function (urls) {
            if (inp.getAttribute('data-target') === 'cover') {
              cover = urls[0];
              var prev = form.querySelector('.ad-cover-prev');
              prev.src = cover; prev.hidden = false;
            } else {
              images = images.concat(urls);
              paintGallery();
            }
            toast('Đã tải ảnh lên');
          })
          .catch(function (err) { toast('Tải ảnh không được: ' + (err.message || ''), true); })
          .then(function () { lbl.firstChild.nodeValue = was; inp.value = ''; });
      });
    });

    var rmCover = form.querySelector('.ad-rm-cover');
    if (rmCover) rmCover.addEventListener('click', function () {
      cover = null;
      var prev = form.querySelector('.ad-cover-prev');
      prev.hidden = true; prev.removeAttribute('src');
    });

    el.main.querySelector('.ad-cancel').addEventListener('click', function () {
      editingPost = null; renderPosts();
    });

    var del = form.querySelector('.ad-del');
    if (del) del.addEventListener('click', function () {
      if (!window.confirm('Xoá hẳn bài này? Không lấy lại được.')) return;
      window.GemDB.deletePost(p.id)
        .then(function () { toast('Đã xoá'); editingPost = null; return load(); })
        .catch(function () { toast('Không xoá được', true); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.ad-err');
      var f = form.elements;
      var title = f['title_vi'].value.trim();
      if (!title) {
        err.textContent = 'Bài cần có tiêu đề tiếng Việt.';
        err.hidden = false;
        return;
      }
      err.hidden = true;

      var row = {
        // slug làm nên địa chỉ bài. Giữ nguyên slug cũ khi sửa, kẻo link đã
        // gửi cho người khác thành hỏng.
        slug: p.slug || (slugify(title) || 'bai') + '-' + Math.random().toString(36).slice(2, 6),
        title_vi: title,
        title_en:   f['title_en'].value.trim() || null,
        place:      f['place'].value.trim() || null,
        happened_on: f['happened_on'].value || null,
        excerpt_vi: f['excerpt_vi'].value.trim() || null,
        excerpt_en: f['excerpt_en'].value.trim() || null,
        body_vi:    f['body_vi'].value.trim() || null,
        body_en:    f['body_en'].value.trim() || null,
        cover: cover,
        images: images,
        is_published: f['is_published'].checked
      };

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Đang lưu…';
      window.GemDB.savePost(p.id, row)
        .then(function () { toast('Đã lưu'); editingPost = null; return load(); })
        .catch(function (e2) {
          btn.disabled = false; btn.textContent = 'Lưu';
          err.textContent = 'Không lưu được. ' + (e2.message || '');
          err.hidden = false;
        });
    });
  }

  /* ---------- LỜI NHẮN (bảng ở Studio Gem) ----------
     Chữ khách gõ: chỉ qua esc(), không bao giờ đưa thẳng vào innerHTML. */
  var NOTE_STATUS = {
    pending:  { label: 'Chờ duyệt', cls: 'held' },
    approved: { label: 'Đang hiện', cls: 'ok' },
    hidden:   { label: 'Đã ẩn',     cls: 'off' }
  };

  function renderNotes() {
    var chips = Object.keys(NOTE_STATUS).map(function (k) {
      var n = notes.filter(function (x) { return x.status === k; }).length;
      return '<button type="button" class="ad-filter' + (noteFilter === k ? ' active' : '') +
        '" data-filter="' + k + '">' + NOTE_STATUS[k].label + (n ? ' <b>' + n + '</b>' : '') + '</button>';
    }).join('');

    var rows = notes.filter(function (x) { return x.status === noteFilter; });
    var body = rows.length ? rows.map(function (x) {
      var st = NOTE_STATUS[x.status] || NOTE_STATUS.pending;
      return '<div class="ad-post ad-note" data-id="' + esc(x.id) + '">' +
        '<div class="ad-post-body">' +
          '<p class="ad-note-text">' + esc(x.body) + '</p>' +
          '<p class="ad-post-meta">' + esc(x.name || 'Không ghi tên') + ' · ' +
            esc(new Date(x.created_at).toLocaleString('vi-VN', { timeZone: VN_TZ })) +
            ' · <span class="ad-chip ' + st.cls + '">' + st.label + '</span></p>' +
        '</div>' +
        '<div class="ad-acts">' +
          (x.status !== 'approved' ? '<button type="button" class="ad-btn on" data-note="approved">Duyệt</button>' : '') +
          (x.status !== 'hidden' ? '<button type="button" class="ad-btn" data-note="hidden">Ẩn</button>' : '') +
          '<button type="button" class="ad-btn danger" data-note="delete">Xoá</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="ad-empty"><p>Không có lời nhắn nào ở mục này.</p></div>';

    el.main.innerHTML = '<div class="ad-filters">' + chips + '</div>' + body;

    el.main.querySelectorAll('.ad-filter').forEach(function (b) {
      b.addEventListener('click', function () { noteFilter = b.getAttribute('data-filter'); renderNotes(); });
    });
    el.main.querySelectorAll('.ad-note').forEach(function (d) {
      var id = d.getAttribute('data-id');
      d.querySelectorAll('[data-note]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-note');
          if (act === 'delete' && !window.confirm('Xoá hẳn lời nhắn này?')) return;
          btn.disabled = true;
          var job = act === 'delete' ? window.GemDB.deleteNote(id) : window.GemDB.setNoteStatus(id, act);
          job.then(function () { toast(act === 'approved' ? 'Đã duyệt, lời nhắn lên bảng' : 'Đã cập nhật'); return load(); })
            .catch(function () { btn.disabled = false; toast('Không lưu được', true); });
        });
      });
    });
  }

  /* ---------- vòng đời ---------- */
  function render() {
    if (tab === 'today')    return renderToday();
    if (tab === 'orders')   return renderOrders();
    if (tab === 'products') return renderProducts();
    if (tab === 'fabrics')  return renderFabrics();
    if (tab === 'posts')    return renderPosts();
    if (tab === 'notes')    return renderNotes();
    renderSessions();
  }

  function load() {
    var job;
    if (window.GemStudioEditor) window.GemStudioEditor.unmount();
    if (tab === 'studio') {
      paintCounts();
      return window.GemStudioEditor.mount(el.main);
    }
    if (tab === 'orders') {
      // the fabrics too: a custom design says which ones to take, from where
      job = Promise.all([
        window.GemDB.adminOrders(),
        window.GemDB.adminFabrics().catch(function () { return []; })
      ]).then(function (r) { orders = r[0] || []; fabrics = r[1] || []; });
    } else if (tab === 'fabrics') {
      job = window.GemDB.adminFabrics().then(function (rows) { fabrics = rows || []; });
    } else if (tab === 'products') {
      job = window.GemDB.adminProducts().then(function (rows) { products = rows || []; });
    } else if (tab === 'notes') {
      job = window.GemDB.adminNotes().then(function (rows) { notes = rows || []; });
    } else if (tab === 'posts') {
      job = window.GemDB.adminPosts().then(function (rows) { posts = rows || []; });
    } else {
      // lấy từ đầu hôm nay theo giờ VN, để buổi sáng nay vẫn còn trong danh sách
      var from = new Date();
      from.setUTCHours(from.getUTCHours() - 24);
      job = Promise.all([
        window.GemDB.adminSessions(from.toISOString()),
        window.GemDB.workshopTypes()
      ]).then(function (r) { sessions = r[0] || []; wtypes = r[1] || []; });
    }

    paintCounts();
    return job.then(render).catch(function (err) {
      el.main.innerHTML = '<div class="ad-empty"><p>Không tải được dữ liệu.</p>' +
        '<p class="ad-hint">' + esc(err.message || '') + '</p></div>';
    });
  }

  function boot() {
    return window.GemDB.whoAmI().then(function (staff) {
      if (!staff) {
        window.GemDB.signOut();
        renderLogin('Tài khoản này chưa được cấp quyền quản trị.');
        return;
      }
      me = staff;
      renderShell();
      return load();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    el.root = document.getElementById('admin-root');
    if (!el.root) return;
    if (window.GemDB.isSignedIn()) boot().catch(function () { renderLogin(); });
    else renderLogin();
  });
})();
