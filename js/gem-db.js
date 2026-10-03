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

    // Bài Bản tin đã đăng, mới nhất lên trước. RLS lọc sẵn bài còn nháp.
    posts: function () {
      return req('/rest/v1/posts?select=*&order=happened_on.desc,created_at.desc');
    },

    // Sản phẩm đang bán. RLS lọc sẵn hàng chưa đăng nên khách không thấy.
    products: function () {
      return req('/rest/v1/products?select=*&order=sort_order.asc');
    },

    // Cấu hình thanh toán: ngân hàng, số tài khoản, ngưỡng bắt buộc chuyển
    // khoản. Chỉ khoá 'payment' mở cho khách, các khoá khác RLS chặn.
    paymentSettings: function () {
      return req('/rest/v1/settings?select=value&key=eq.payment')
        .then(function (rows) { return (rows && rows[0] && rows[0].value) || null; });
    },

    // Đặt đơn. Trả { ok, code, subtotal, has_unpriced } hoặc { ok:false, error }.
    // Chỉ gửi sku và số lượng — giá do database tự tra, không tin giá từ trình
    // duyệt gửi lên (tin thì ai cũng đặt được đơn 0đ).
    createOrder: function (o) {
      return req('/rest/v1/rpc/create_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_name: o.name,
          p_phone: o.phone,
          p_items: o.items,
          p_email: o.email || null,
          p_address: o.address || null,
          p_note: o.note || null,
          p_channel: o.channel || null,
          p_payment: o.payment || null
        })
      });
    },

    // Tủ sưu tầm: lấy lại món đã mua bằng mã đơn + SĐT. Trả
    // { ok, code, received, items:[sku] } hoặc { ok:false, error }.
    // Database chỉ trả sku, không trả tên/địa chỉ của đơn.
    claimCollection: function (code, phone) {
      return req('/rest/v1/rpc/claim_collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_code: code, p_phone: phone })
      });
    },

    // Tường lời nhắn: chỉ lời đã duyệt (RLS lọc), mới nhất trước.
    notes: function () {
      return req('/rest/v1/notes?select=id,body,name,created_at&status=eq.approved&order=created_at.desc&limit=60');
    },

    // Gửi lời nhắn. Trả { ok } hoặc { ok:false, error: bad_input | busy }.
    // Vào trạng thái chờ duyệt, chưa ai thấy cho tới khi nhân sự duyệt.
    postNote: function (body, name) {
      return req('/rest/v1/rpc/post_note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_body: body, p_name: name || null })
      });
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

    // Nhận một dòng hoặc cả mảng — PostgREST chèn hàng loạt trong một lượt,
    // nên tạo lịch bốn tuần chỉ tốn một lần gọi mạng.
    createSession: function (rowOrRows) {
      return req('/rest/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(rowOrRows)
      });
    },

    // Database chặn xoá buổi đã có người đặt (trigger sessions_guard_delete)
    // và trả về câu giải thích — cứ để câu đó hiện thẳng cho người dùng.
    deleteSession: function (id) {
      return req('/rest/v1/sessions?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    workshopTypes: function () {
      return req('/rest/v1/workshop_types?select=*&order=sort_order.asc');
    },

    saveWorkshopType: function (id, row) {
      if (id) {
        return req('/rest/v1/workshop_types?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(row)
        });
      }
      return req('/rest/v1/workshop_types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });
    },

    // Database chặn xoá loại còn buổi trên lịch (trigger
    // workshop_types_guard_delete) và trả về câu giải thích — cứ để câu đó
    // hiện thẳng cho người dùng, giống deleteSession.
    deleteWorkshopType: function (id) {
      return req('/rest/v1/workshop_types?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    // Cả hàng đang ẩn, khác products() ở chỗ đó — RLS cho nhân sự thấy hết.
    adminProducts: function () {
      return req('/rest/v1/products?select=*&order=category.asc,sort_order.asc');
    },

    updateProduct: function (id, patch) {
      return req('/rest/v1/products?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(patch)
      });
    },

    createProduct: function (row) {
      return req('/rest/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });
    },

    // order_items giữ product_id với ON DELETE SET NULL, nên xoá sản phẩm
    // không làm hỏng đơn cũ — đơn vẫn giữ tên và giá đã chốt lúc đặt.
    deleteProduct: function (id) {
      return req('/rest/v1/products?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    // Cả bài còn nháp, khác posts() ở chỗ đó.
    // Số việc còn tồn cho các tab: đơn mới, giữ chỗ chưa xác nhận, lời chờ duyệt.
    adminCounts: function () {
      var n = function (path) {
        return req(path).then(function (rows) { return (rows || []).length; }, function () { return 0; });
      };
      return Promise.all([
        n('/rest/v1/orders?select=id&status=eq.new'),
        n('/rest/v1/bookings?select=id&status=eq.held'),
        n('/rest/v1/notes?select=id&status=eq.pending')
      ]).then(function (r) { return { orders: r[0], sessions: r[1], notes: r[2] }; });
    },

    /* ---------- bố cục Studio Gem (owner lắp trong admin.html) ---------- */

    // id = 'live' (ai cũng đọc được) hoặc 'draft' (chỉ owner). Trả data hoặc null.
    studioLayout: function (id) {
      return req('/rest/v1/studio_layout?select=data,updated_at&id=eq.' + encodeURIComponent(id))
        .then(function (rows) { return (rows && rows[0]) ? rows[0].data : null; });
    },

    // Ghi đè (upsert) một dòng. RLS chỉ cho owner.
    saveStudioLayout: function (id, data, name) {
      return req('/rest/v1/studio_layout?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id: id, data: data, name: name || null, updated_at: new Date().toISOString() })
      });
    },

    // Bố cục đã lưu (id 'p-…') + tên của bản đang chạy. Chỉ owner đọc được.
    studioProfiles: function () {
      return req('/rest/v1/studio_layout?select=id,name,updated_at&or=(id.like.p-*,id.eq.live)&order=updated_at.desc');
    },

    deleteStudioLayout: function (id) {
      return req('/rest/v1/studio_layout?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    adminNotes: function () {
      return req('/rest/v1/notes?select=*&order=created_at.desc&limit=200');
    },

    setNoteStatus: function (id, status) {
      return req('/rest/v1/notes?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status })
      });
    },

    deleteNote: function (id) {
      return req('/rest/v1/notes?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    adminPosts: function () {
      return req('/rest/v1/posts?select=*&order=happened_on.desc,created_at.desc');
    },

    savePost: function (id, row) {
      if (id) {
        return req('/rest/v1/posts?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(row)
        });
      }
      return req('/rest/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });
    },

    deletePost: function (id) {
      return req('/rest/v1/posts?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /* ---------- ảnh ---------- */

    // Tải một ảnh lên kho gem-media, trả về URL công khai để dán vào bài.
    // Tên file gắn thêm thời gian + số ngẫu nhiên để hai ảnh trùng tên
    // không đè lên nhau.
    uploadImage: function (file) {
      var clean = String(file.name || 'anh')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
      var path = Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + clean;

      return fetch(URL + '/storage/v1/object/gem-media/' + encodeURIComponent(path), {
        method: 'POST',
        headers: {
          'apikey': KEY,
          'Authorization': 'Bearer ' + (token || KEY),
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (txt) { throw new Error(txt || ('HTTP ' + res.status)); });
        }
        return URL + '/storage/v1/object/public/gem-media/' + encodeURIComponent(path);
      });
    },

    // Đơn kèm các dòng hàng, mới nhất lên trước.
    adminOrders: function (status) {
      var q = '/rest/v1/orders?select=*,order_items(*)&order=created_at.desc';
      if (status) q += '&status=eq.' + encodeURIComponent(status);
      return req(q);
    },

    updateOrder: function (id, patch) {
      return req('/rest/v1/orders?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(patch)
      });
    }
  };
})();
