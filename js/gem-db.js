// Gem Chạm Sắc — lớp gọi Supabase mỏng, viết bằng fetch thuần.
//
// Cố tình KHÔNG dùng thư viện supabase-js: nó phải tải từ CDN, kéo theo phụ
// thuộc bên thứ ba và script ngoài — trái với cách làm của dự án này
// (không framework, không build step, không tracking). Toàn bộ thứ cần dùng
// chỉ là vài lời gọi REST, nên tự viết gọn hơn nhiều.
//
// Publishable key nằm công khai ở đây là ĐÚNG THIẾT KẾ. Cái bảo vệ dữ liệu là
// RLS trong database, không phải việc giấu key. Khách không đọc được bảng
// bookings dù có key; đặt chỗ chỉ đi qua hàm book_session().

window.GemDB = (function () {
  'use strict';

  var URL = 'https://dxdovvqsfjeizsoprrfn.supabase.co';
  var KEY = 'sb_publishable_jRv5IBMv5j7OAs1-x15IDw_DJ_HZqZs';

  var TOKEN_KEY = 'gem-admin-token';
  var token = null;
  try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }

  function headers(extra) {
    var h = {
      'apikey': KEY,
      'Authorization': 'Bearer ' + (token || KEY)
    };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }

  function req(path, opts) {
    opts = opts || {};
    return fetch(URL + path, {
      method: opts.method || 'GET',
      headers: headers(opts.headers),
      body: opts.body
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!res.ok) {
          var err = new Error((data && (data.message || data.error_description || data.msg)) || ('HTTP ' + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  return {
    /* ---------- công khai ---------- */

    // Danh sách buổi sắp tới + số chỗ còn lại. Đi qua view sessions_public
    // nên không bao giờ lộ thông tin khách đã đặt.
    sessions: function () {
      return req('/rest/v1/sessions_public?select=*&order=starts_at.asc');
    },

    // Giữ chỗ. Trả về { ok, code, seats_left } hoặc { ok:false, error }.
    book: function (payload) {
      return req('/rest/v1/rpc/book_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_session_id: payload.sessionId,
          p_name: payload.name,
          p_phone: payload.phone,
          p_seats: payload.seats || 1,
          p_email: payload.email || null,
          p_note: payload.note || null
        })
      });
    },

    /* ---------- đăng nhập nhân sự ---------- */

    signIn: function (email, password) {
      return fetch(URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }).then(function (res) {
        return res.json().then(function (d) {
          if (!res.ok) throw new Error(d.error_description || d.msg || 'Đăng nhập không thành công');
          token = d.access_token;
          try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { /* ignore */ }
          return d;
        });
      });
    },

    signOut: function () {
      token = null;
      try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    },

    isSignedIn: function () { return !!token; },

    // Có phải nhân sự không. Trả null nếu token hết hạn hoặc chưa đăng nhập.
    // Gọi hàm me() chứ không đọc thẳng bảng staff: nhân sự nào cũng đọc được
    // cả bảng, nên lấy dòng đầu tiên là lấy nhầm người khác.
    whoAmI: function () {
      if (!token) return Promise.resolve(null);
      return req('/rest/v1/rpc/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
        .then(function (rows) { return (rows && rows[0]) || null; })
        .catch(function () { return null; });
    },

    /* ---------- quản trị (cần đăng nhập) ---------- */

    // Buổi học kèm loại và số đã đặt — dùng embed của PostgREST
    adminSessions: function (fromISO) {
      var q = '/rest/v1/sessions?select=id,starts_at,capacity,status,note,' +
              'workshop_types(name_vi,name_en,duration_minutes,price),' +
              'bookings(id,code,name,phone,email,seats,note,status,created_at)' +
              '&order=starts_at.asc';
      if (fromISO) q += '&starts_at=gte.' + encodeURIComponent(fromISO);
      return req(q);
    },

    updateBooking: function (id, patch) {
      return req('/rest/v1/bookings?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(patch)
      });
    },

    updateSession: function (id, patch) {
      return req('/rest/v1/sessions?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(patch)
      });
    },

    createSession: function (row) {
      return req('/rest/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });
    },

    workshopTypes: function () {
      return req('/rest/v1/workshop_types?select=*&order=sort_order.asc');
    }
  };
})();
