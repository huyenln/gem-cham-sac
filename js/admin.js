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
    'set-qua': 'Set quà tặng'
  };

  var el = {};
  var me = null;
  var sessions = [];
  var orders = [];
  var products = [];
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
        tab = b.getAttribute('data-tab');
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
  function renderSessions() {
    if (!sessions.length) {
      el.main.innerHTML = '<div class="ad-empty"><p>Chưa có buổi nào sắp tới.</p></div>';
      return;
    }
    el.main.innerHTML = sessions.map(function (s) {
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
          '</div>' +
        '</div>' +
      '</details>';
    }).join('');

    wireBookingActions(el.main);

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
    var list = orders.filter(function (o) {
      if (orderFilter === 'open') return OD_OPEN.indexOf(o.status) >= 0;
      if (orderFilter === 'done') return o.status === 'done';
      return true;
    });

    var chips = [['open', 'Cần xử lý'], ['done', 'Xong'], ['all', 'Tất cả']]
      .map(function (c) {
        return '<button type="button" class="ad-filter' + (orderFilter === c[0] ? ' active' : '') +
               '" data-filter="' + c[0] + '">' + c[1] +
               (c[0] === 'open'
                 ? ' <b>' + orders.filter(function (o) { return OD_OPEN.indexOf(o.status) >= 0; }).length + '</b>'
                 : '') +
               '</button>';
      }).join('');

    var body = list.length ? list.map(function (o) {
      var st = OD_STATUS[o.status] || OD_STATUS['new'];
      var items = (o.order_items || []).map(function (it) {
        return '<li><span>' + esc(it.name_vi) + ' × ' + it.qty + '</span>' +
               '<span class="ad-od-price">' + esc(itemPrice(it)) + '</span></li>';
      }).join('');

      return '<article class="ad-order" data-id="' + esc(o.id) + '">' +
        '<div class="ad-od-head">' +
          '<span class="ad-od-code">' + esc(o.code) + '</span>' +
          '<span class="ad-chip ' + st.cls + '">' + st.label + '</span>' +
        '</div>' +
        '<p class="ad-od-when">' + esc(whenLabel(o.created_at)) + '</p>' +
        '<p class="ad-od-who"><b>' + esc(o.name) + '</b></p>' +
        phoneLinks(o.phone) +
        (o.address ? '<p class="ad-od-addr">' + esc(o.address) + '</p>' : '') +
        (o.note ? '<p class="ad-od-note">“' + esc(o.note) + '”</p>' : '') +
        '<ul class="ad-od-items">' + items + '</ul>' +
        '<p class="ad-od-sum"><span>Tổng</span><b>' + esc(money(o.subtotal)) +
          (o.has_unpriced ? ' + món Liên hệ' : '') + '</b></p>' +
        '<div class="ad-acts">' +
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
        b.disabled = true;
        window.GemDB.updateOrder(id, { status: b.getAttribute('data-to') })
          .then(function () { toast('Đã cập nhật'); return load(); })
          .catch(function () { b.disabled = false; toast('Không lưu được', true); });
      });
    });
  }

  /* ================= SẢN PHẨM ================= */

  function renderProducts() {
    var byCat = {}, order = [];
    products.forEach(function (p) {
      if (!byCat[p.category]) { byCat[p.category] = []; order.push(p.category); }
      byCat[p.category].push(p);
    });

    var groups = order.map(function (cat) {
      return '<section class="ad-cat">' +
        '<h3>' + esc(CATEGORIES[cat] || cat) + '</h3>' +
        byCat[cat].map(function (p) {
          return '<div class="ad-prod' + (p.is_published ? '' : ' is-hidden') + '" data-id="' + esc(p.id) + '">' +
            '<div class="ad-prod-top">' +
              '<b>' + esc(p.name_vi) + '</b>' +
              '<span class="ad-sku">' + esc(p.sku) + '</span>' +
            '</div>' +
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
            '</div>' +
          '</div>';
        }).join('') +
      '</section>';
    }).join('');

    el.main.innerHTML =
      '<p class="ad-hint">Để trống ô giá là web hiện “Liên hệ”. Ô “đến” chỉ ' +
      'điền khi bán theo khoảng giá.</p>' + groups;

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

  /* ---------- vòng đời ---------- */
  function render() {
    if (tab === 'today')    return renderToday();
    if (tab === 'orders')   return renderOrders();
    if (tab === 'products') return renderProducts();
    renderSessions();
  }

  function load() {
    var job;
    if (tab === 'orders') {
      job = window.GemDB.adminOrders().then(function (rows) { orders = rows || []; });
    } else if (tab === 'products') {
      job = window.GemDB.adminProducts().then(function (rows) { products = rows || []; });
    } else {
      // lấy từ đầu hôm nay theo giờ VN, để buổi sáng nay vẫn còn trong danh sách
      var from = new Date();
      from.setUTCHours(from.getUTCHours() - 24);
      job = window.GemDB.adminSessions(from.toISOString())
        .then(function (rows) { sessions = rows || []; });
    }

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
