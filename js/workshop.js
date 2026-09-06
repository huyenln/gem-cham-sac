// Gem Chạm Sắc — trang đặt lịch workshop
//
// Đọc buổi học + số chỗ còn lại từ view sessions_public, giữ chỗ qua hàm
// book_session(). Không có gì của khách khác lộ ra ở đây.

(function () {
  'use strict';

  var STRINGS = {
    'title.workshop':   { vi: `Workshop · Gem Chạm Sắc`, en: `Workshops · Gem Chạm Sắc` },
    'ws.eyebrow':       { vi: `Workshop`, en: `Workshops` },
    'ws.hero_title':    { vi: `Tự tay làm một món đồ.`, en: `Make something with your own hands.` },
    'ws.hero_sub':      { vi: `Mỗi buổi chỉ nhận một nhóm nhỏ để ai cũng được chỉ tận tay. Chọn buổi bạn đi được, để lại tên và số điện thoại — chúng mình nhắn lại trước một ngày.`, en: `Each session takes a small group so everyone gets shown hands-on. Pick a session that suits you and leave your name and phone — we'll message you the day before.` },

    'ws.loading':       { vi: `Đang tải lịch...`, en: `Loading sessions...` },
    'ws.empty':         { vi: `Hiện chưa có buổi nào được mở. Nhắn cho chúng mình để hẹn một buổi riêng nhé.`, en: `No sessions are open right now. Message us to arrange one.` },
    'ws.error':         { vi: `Chưa tải được lịch. Bạn thử lại sau, hoặc nhắn trực tiếp cho chúng mình nhé.`, en: `Couldn't load the schedule. Please try again later, or message us directly.` },
    'ws.retry':         { vi: `Thử lại`, en: `Try again` },

    'ws.seats_left':    { vi: `Còn {n}/{cap} chỗ`, en: `{n} of {cap} seats left` },
    'ws.seats_few':     { vi: `Chỉ còn {n} chỗ`, en: `Only {n} seats left` },
    'ws.full':          { vi: `Đã đủ chỗ`, en: `Fully booked` },
    'ws.duration':      { vi: `{n} phút`, en: `{n} min` },
    'ws.price_tbd':     { vi: `Liên hệ`, en: `Ask us` },
    'ws.book':          { vi: `Giữ chỗ`, en: `Reserve a seat` },

    'ws.form_title':    { vi: `Giữ chỗ buổi này`, en: `Reserve this session` },
    'ws.f_name':        { vi: `Tên của bạn`, en: `Your name` },
    'ws.f_phone':       { vi: `Số điện thoại`, en: `Phone number` },
    'ws.f_phone_hint':  { vi: `Chúng mình nhắn Zalo trước một ngày để xác nhận.`, en: `We'll send a Zalo message the day before to confirm.` },
    'ws.f_seats':       { vi: `Mấy người?`, en: `How many people?` },
    'ws.f_email':       { vi: `Email (không bắt buộc)`, en: `Email (optional)` },
    'ws.f_note':        { vi: `Ghi chú (không bắt buộc)`, en: `Note (optional)` },
    'ws.f_note_ph':     { vi: `Lần đầu thử, đi cùng trẻ nhỏ, cần về sớm…`, en: `First time, bringing a child, need to leave early…` },
    'ws.submit':        { vi: `Giữ chỗ`, en: `Reserve` },
    'ws.sending':       { vi: `Đang giữ chỗ...`, en: `Reserving...` },
    'ws.cancel':        { vi: `Quay lại`, en: `Back` },

    'ws.err_contact':   { vi: `Bạn điền giúp chúng mình tên và số điện thoại nhé.`, en: `Please fill in your name and phone number.` },
    'ws.err_full':      { vi: `Tiếc quá, buổi này vừa hết chỗ. Bạn chọn buổi khác giúp chúng mình nhé.`, en: `Sorry — this session just filled up. Please pick another one.` },
    'ws.err_past':      { vi: `Buổi này đã qua rồi.`, en: `This session has already passed.` },
    'ws.err_closed':    { vi: `Buổi này đã đóng đăng ký.`, en: `Registration for this session is closed.` },
    'ws.err_generic':   { vi: `Có lỗi xảy ra. Bạn thử lại giúp chúng mình nhé.`, en: `Something went wrong. Please try again.` },

    'ws.done_title':    { vi: `Đã giữ chỗ cho bạn.`, en: `Your seat is reserved.` },
    'ws.done_code':     { vi: `Mã giữ chỗ`, en: `Reservation code` },
    'ws.done_p':        { vi: `Chúng mình sẽ nhắn Zalo cho bạn trước một ngày để xác nhận. Trả tiền tại studio khi bạn đến.`, en: `We'll message you on Zalo the day before to confirm. Pay at the studio when you arrive.` },
    'ws.done_ics':      { vi: `Thêm vào lịch`, en: `Add to calendar` },
    'ws.done_more':     { vi: `Xem buổi khác`, en: `See other sessions` },

    'ws.other_h':       { vi: `Muốn giờ khác?`, en: `Want a different time?` },
    'ws.other_p':       { vi: `Em gái mình ở studio cả tuần, từ thứ Hai đến thứ Bảy — nhắn cho chúng mình là hẹn được một buổi riêng, kể cả chỉ một người. Chủ Nhật thì cần hẹn trước.`, en: `We're at the studio Monday to Saturday — message us and we'll arrange a session just for you, even for one person. Sundays need booking ahead.` },
    'ws.other_zalo':    { vi: `Nhắn Zalo`, en: `Message on Zalo` }
  };

  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STRINGS);

  function t(key, fallback) {
    if (window.GemI18n && typeof window.GemI18n.t === 'function') {
      var v = window.GemI18n.t(key);
      if (v != null) return v;
    }
    return fallback != null ? fallback : key;
  }

  function fill(str, map) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return map[k]; });
  }

  function lang() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) || 'vi';
  }

  var DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // Buổi học luôn diễn ra ở Hà Nội, nên hiện giờ Hà Nội bất kể máy khách đặt
  // múi giờ nào — khách du lịch mở máy vẫn còn giờ nhà là chuyện thường.
  function vnParts(iso) {
    var d = new Date(iso);
    var fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
    });
    var p = {};
    fmt.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    var dow = new Date(p.year + '-' + p.month + '-' + p.day + 'T12:00:00Z').getUTCDay();
    return {
      date: p.day + '/' + p.month,
      time: p.hour + ':' + p.minute,
      dow: dow,
      full: p.year + '-' + p.month + '-' + p.day
    };
  }

  function dayLabel(dow) {
    if (lang() === 'en') {
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];
    }
    return DAYS_VI[dow];
  }

  function money(n) {
    if (n == null) return t('ws.price_tbd', 'Liên hệ');
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- .ics, sinh hoàn toàn phía trình duyệt ---------- */
  function icsFor(session) {
    function z(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var end = new Date(new Date(session.starts_at).getTime() + (session.duration_minutes || 120) * 60000);
    var name = lang() === 'en' && session.name_en ? session.name_en : session.name_vi;
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gem Cham Sac//workshop//VI',
      'BEGIN:VEVENT',
      'UID:' + session.id + '@gemchamsac.com',
      'DTSTAMP:' + z(new Date().toISOString()),
      'DTSTART:' + z(session.starts_at),
      'DTEND:' + z(end.toISOString()),
      'SUMMARY:' + name + ' — Gem Chạm Sắc',
      'LOCATION:Tầng 3, 114 Lê Gia Đỉnh, Hai Bà Trưng, Hà Nội',
      'DESCRIPTION:Workshop tại Gem Chạm Sắc. Liên hệ: 0824964996',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadICS(session) {
    var blob = new Blob([icsFor(session)], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'gem-workshop.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { window.URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- render ---------- */
  var root, sessions = [], current = null;

  function renderList() {
    if (!sessions.length) {
      root.innerHTML = '<p class="ws-empty" data-i18n="ws.empty"></p>';
      translate();
      return;
    }

    root.innerHTML = '<ul class="ws-list">' + sessions.map(function (s) {
      var p = vnParts(s.starts_at);
      var full = s.seats_left <= 0;
      var few = !full && s.seats_left <= 3;
      var name = lang() === 'en' && s.name_en ? s.name_en : s.name_vi;
      var desc = lang() === 'en' && s.desc_en ? s.desc_en : s.desc_vi;
      var seatTxt = full
        ? t('ws.full', 'Đã đủ chỗ')
        : fill(t(few ? 'ws.seats_few' : 'ws.seats_left', ''), { n: s.seats_left, cap: s.capacity });

      return '<li class="ws-card' + (full ? ' is-full' : '') + '">' +
        '<div class="ws-when">' +
          '<span class="ws-dow">' + esc(dayLabel(p.dow)) + '</span>' +
          '<span class="ws-date">' + esc(p.date) + '</span>' +
          '<span class="ws-time">' + esc(p.time) + '</span>' +
        '</div>' +
        '<div class="ws-body">' +
          '<h3>' + esc(name) + '</h3>' +
          (desc ? '<p class="ws-desc">' + esc(desc) + '</p>' : '') +
          '<p class="ws-meta">' +
            '<span>' + fill(t('ws.duration', '{n} phút'), { n: s.duration_minutes }) + '</span>' +
            '<span>' + esc(money(s.price)) + '</span>' +
            '<span class="ws-seats' + (few ? ' few' : '') + (full ? ' none' : '') + '">' + esc(seatTxt) + '</span>' +
          '</p>' +
        '</div>' +
        '<div class="ws-act">' +
          (full ? '' :
            '<button type="button" class="btn btn-primary ws-pick" data-id="' + esc(s.id) + '">' +
              t('ws.book', 'Giữ chỗ') + '</button>') +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';

    root.querySelectorAll('.ws-pick').forEach(function (b) {
      b.addEventListener('click', function () { openForm(b.getAttribute('data-id')); });
    });
    translate();
  }

  function openForm(id) {
    current = sessions.filter(function (s) { return s.id === id; })[0];
    if (!current) return;
    var p = vnParts(current.starts_at);
    var name = lang() === 'en' && current.name_en ? current.name_en : current.name_vi;
    var max = Math.max(1, Math.min(current.seats_left, 10));

    root.innerHTML =
      '<div class="ws-form-wrap">' +
        '<button type="button" class="ws-back" data-i18n="ws.cancel"></button>' +
        '<div class="ws-chosen">' +
          '<h3>' + esc(name) + '</h3>' +
          '<p>' + esc(dayLabel(p.dow)) + ' ' + esc(p.date) + ' · ' + esc(p.time) + ' · ' +
                  fill(t('ws.duration', '{n} phút'), { n: current.duration_minutes }) + '</p>' +
        '</div>' +
        '<form class="ws-form" novalidate>' +
          '<label class="ws-field"><span data-i18n="ws.f_name"></span>' +
            '<input type="text" name="name" autocomplete="name" required></label>' +
          '<label class="ws-field"><span data-i18n="ws.f_phone"></span>' +
            '<input type="tel" name="phone" autocomplete="tel" inputmode="tel" required>' +
            '<small data-i18n="ws.f_phone_hint"></small></label>' +
          '<label class="ws-field"><span data-i18n="ws.f_seats"></span>' +
            '<select name="seats">' +
              Array.apply(null, { length: max }).map(function (_, i) {
                return '<option value="' + (i + 1) + '">' + (i + 1) + '</option>';
              }).join('') +
            '</select></label>' +
          '<label class="ws-field"><span data-i18n="ws.f_email"></span>' +
            '<input type="email" name="email" autocomplete="email"></label>' +
          '<label class="ws-field"><span data-i18n="ws.f_note"></span>' +
            '<textarea name="note" rows="2" data-i18n-attr="placeholder:ws.f_note_ph"></textarea></label>' +
          '<button type="submit" class="btn btn-primary ws-submit" data-i18n="ws.submit"></button>' +
          '<p class="ws-err" hidden></p>' +
        '</form>' +
      '</div>';

    root.querySelector('.ws-back').addEventListener('click', renderList);
    root.querySelector('.ws-form').addEventListener('submit', submit);
    translate();
    root.querySelector('[name="name"]').focus();
  }

  function submit(e) {
    e.preventDefault();
    var f = e.target.elements;
    var err = root.querySelector('.ws-err');
    var btn = root.querySelector('.ws-submit');

    var name = f['name'].value.trim();
    var phone = f['phone'].value.trim();
    if (!name || !phone) {
      err.textContent = t('ws.err_contact', '');
      err.hidden = false;
      return;
    }
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = t('ws.sending', 'Đang giữ chỗ...');

    window.GemDB.book({
      sessionId: current.id,
      name: name,
      phone: phone,
      seats: parseInt(f['seats'].value, 10) || 1,
      email: f['email'].value.trim(),
      note: f['note'].value.trim()
    }).then(function (res) {
      if (res && res.ok) return renderDone(res.code);
      var map = { full: 'ws.err_full', past: 'ws.err_past', closed: 'ws.err_closed',
                  missing_contact: 'ws.err_contact' };
      err.textContent = t(map[res && res.error] || 'ws.err_generic', '');
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = t('ws.submit', 'Giữ chỗ');
      if (res && res.error === 'full') load();   // làm mới số chỗ
    }).catch(function () {
      err.textContent = t('ws.err_generic', '');
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = t('ws.submit', 'Giữ chỗ');
    });
  }

  function renderDone(code) {
    var p = vnParts(current.starts_at);
    var name = lang() === 'en' && current.name_en ? current.name_en : current.name_vi;
    root.innerHTML =
      '<div class="ws-done">' +
        '<img src="images/mascot/udon_sit_happy.png" alt="Udon" class="ws-done-udon">' +
        '<h3 data-i18n="ws.done_title"></h3>' +
        '<p class="ws-code-label" data-i18n="ws.done_code"></p>' +
        '<p class="ws-code">' + esc(code) + '</p>' +
        '<p class="ws-done-when">' + esc(name) + ' · ' + esc(dayLabel(p.dow)) + ' ' +
          esc(p.date) + ' · ' + esc(p.time) + '</p>' +
        '<p class="ws-done-p" data-i18n="ws.done_p"></p>' +
        '<div class="ws-done-act">' +
          '<button type="button" class="btn btn-primary ws-ics" data-i18n="ws.done_ics"></button>' +
          '<button type="button" class="btn btn-ghost ws-more" data-i18n="ws.done_more"></button>' +
        '</div>' +
      '</div>';
    root.querySelector('.ws-ics').addEventListener('click', function () { downloadICS(current); });
    root.querySelector('.ws-more').addEventListener('click', function () { load(); });
    translate();
  }

  function renderError() {
    root.innerHTML =
      '<div class="ws-error">' +
        '<p data-i18n="ws.error"></p>' +
        '<button type="button" class="btn btn-ghost ws-retry" data-i18n="ws.retry"></button>' +
      '</div>';
    root.querySelector('.ws-retry').addEventListener('click', load);
    translate();
  }

  function translate() {
    if (window.GemI18n) window.GemI18n.setLang(window.GemI18n.getLang());
  }

  function load() {
    root.innerHTML = '<p class="ws-loading" data-i18n="ws.loading"></p>';
    translate();
    window.GemDB.sessions().then(function (rows) {
      sessions = rows || [];
      renderList();
    }).catch(renderError);
  }

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('ws-root');
    if (!root) return;

    // Ngày/giờ và tên buổi dựng bằng JS nên phải vẽ lại khi đổi ngôn ngữ.
    // Phải so ngôn ngữ trước khi vẽ: translate() gọi setLang(), mà setLang()
    // lại phát chính sự kiện này — không chặn thì thành vòng lặp vô hạn.
    var lastLang = lang();
    document.addEventListener('gem:langchange', function (e) {
      var l = (e.detail && e.detail.lang) || lang();
      if (l === lastLang) return;
      lastLang = l;
      if (root.querySelector('.ws-list')) renderList();
    });

    load();
  });
})();
