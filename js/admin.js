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

  var el = {};
  var me = null;
  var sessions = [];
  var tab = 'today';

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
          '<button type="button" data-tab="sessions">Đặt lịch</button>' +
        '</nav>' +
      '</header>' +
      '<main class="ad-main"><p class="ad-loading">Đang tải...</p></main>';

    el.main = el.root.querySelector('.ad-main');
    el.root.querySelector('.ad-out').addEventListener('click', function () {
      window.GemDB.signOut();
      renderLogin();
    });
    el.root.querySelectorAll('.ad-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); paintTabs(); render(); });
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

  /* ---------- vòng đời ---------- */
  function render() {
    if (tab === 'today') renderToday(); else renderSessions();
  }

  function load() {
    // lấy từ đầu hôm nay theo giờ VN, để buổi sáng nay vẫn còn trong danh sách
    var from = new Date();
    from.setUTCHours(from.getUTCHours() - 24);
    return window.GemDB.adminSessions(from.toISOString()).then(function (rows) {
      sessions = rows || [];
      render();
    }).catch(function (err) {
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
