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
    'ws.hero_sub':      { vi: `Đặt lúc nào cũng được, chỉ cần nhắn Gem trước. Nhóm nhỏ, hướng dẫn tận tay bằng tiếng Việt hoặc tiếng Anh.`, en: `Book any time — just message us ahead. Small groups, taught hands-on in English or Vietnamese.` },

    /* Đặt lịch bằng tin nhắn (14/11/2026): khung #dat-lich đầu trang, khung
       #dat-mon trong trang từng workshop, và lời nhắc cuối trang. */
    'ws.book_h':        { vi: `Đặt lịch`, en: `Book a workshop` },
    'ws.book_s1':       { vi: `<strong>Chọn workshop</strong> ở <a href="#ws-list-head">danh sách bên dưới</a>.`, en: `<strong>Pick a workshop</strong> from <a href="#ws-list-head">the list below</a>.` },
    // lead time + holidays (Anna 18/11/2026): one number, 3 hours, reads clearer than "2–3"
    'ws.book_s2':       { vi: `<strong>Nhắn Gem</strong> workshop bạn chọn, ngày giờ và số người, trước giờ học ít nhất 3 tiếng. Ngày lễ, nhắn hỏi lịch trước; Tết Gem nghỉ.`, en: `<strong>Message us</strong> which workshop, the day &amp; time, and how many of you, at least 3 hours ahead. On public holidays, ask first; we're closed over Tết (Lunar New Year).` },
    'ws.book_s3':       { vi: `<strong>Gem xác nhận.</strong> Bạn trả tại studio khi đến: tiền mặt hoặc chuyển khoản, không nhận thẻ. Thứ Bảy, Chủ Nhật thì trả trước 30%.`, en: `<strong>We confirm.</strong> You pay at the studio: cash (VND) or Vietnamese bank transfer — we don't take cards. Saturdays and Sundays: 30% up front.` },
    // Weekend sessions (Anna 18/11/2026): 30% up front by message, the cancelling rule beside it
    'ws.book_wkend':    { vi: `Thứ Bảy, Chủ Nhật: khi xác nhận chỗ, Gem nhắn bạn qua Zalo để nhận trả trước 30%; chuyển xong bạn gửi ảnh chuyển khoản lại trong khung chat. Báo huỷ hoặc dời trước giờ học 24 tiếng thì Gem hoàn lại hoặc chuyển sang buổi khác; báo muộn hơn hoặc không đến thì Gem giữ khoản này.`, en: `Saturdays and Sundays: when we confirm your seat, we message you for 30% up front; once sent, share the transfer screenshot in that chat. Cancel or move at least 24 hours before and we refund it or move you to another session; later, or if you don't come, we keep it.` },
    'ws.book_or':       { vi: `Hoặc giữ chỗ ở <a href="#ws-sched-h">một buổi đã lên lịch</a>.`, en: `Or reserve a seat in <a href="#ws-sched-h">a scheduled session</a>.` },
    'ws.ch_note':       { vi: `Bấm một kênh: lời nhắn soạn sẵn được chép lại, bạn chỉ cần dán vào khung chat.`, en: `Tap one: a ready-made message is copied, so you just paste it into the chat.` },
    'ws.ch_copied':     { vi: `Đã chép lời nhắn. Dán vào khung chat, điền ngày giờ và số người là xong.`, en: `Message copied. Paste it into the chat and add the day, time and number of people.` },
    'ws.msg_hi':        { vi: `Chào Gem, mình muốn đặt workshop.`, en: `Hi Gem! I'd like to book a workshop.` },
    'ws.msg_ws':        { vi: `Món:`, en: `Workshop:` },
    'ws.msg_when':      { vi: `Ngày giờ mong muốn:`, en: `Preferred day & time:` },
    'ws.msg_people':    { vi: `Số người:`, en: `Number of people:` },
    'ws.msg_lang':      { vi: ``, en: `Language: English` },
    'ws.mail_subject':  { vi: `Đặt workshop`, en: `Workshop booking` },
    'ws.sched_h':       { vi: `Buổi đã lên lịch`, en: `Scheduled sessions` },
    'ws.type_book':     { vi: `Đặt lịch`, en: `Book` },
    'ws.page_book_h':   { vi: `Đặt workshop này`, en: `Book this workshop` },
    'ws.page_book_other': { vi: `Hoặc hẹn một ngày khác`, en: `Or pick another day` },
    'ws.page_book_p':   { vi: `Nhắn Gem ngày giờ bạn muốn và số người, trước giờ học ít nhất 3 tiếng, chúng mình xác nhận lại. Hướng dẫn bằng tiếng Việt hoặc tiếng Anh. Trả tại studio: tiền mặt hoặc chuyển khoản, không nhận thẻ.`, en: `Message us the day & time you'd like and how many of you, at least 3 hours ahead, and we'll confirm. Taught in English or Vietnamese. Pay at the studio: cash (VND) or Vietnamese bank transfer — no cards.` },

    'ws.loading':       { vi: `Đang tải lịch...`, en: `Loading sessions...` },
    'ws.empty':         { vi: `Danh sách workshop chưa có ở đây. Bạn nhắn Gem (nút ở trên) để hỏi các workshop đang mở nhé.`, en: `The workshop list isn't here yet. Message us (buttons above) to ask what's on.` },
    'ws.error':         { vi: `Chưa tải được lịch. Bạn thử lại sau, hoặc nhắn trực tiếp cho chúng mình nhé.`, en: `Couldn't load the schedule. Please try again later, or message us directly.` },
    'ws.retry':         { vi: `Thử lại`, en: `Try again` },

    'ws.seats_left':    { vi: `Còn {n}/{cap} chỗ`, en: `{n} of {cap} seats left` },
    'ws.seats_few':     { vi: `Chỉ còn {n} chỗ`, en: `Only {n} seats left` },
    'ws.full':          { vi: `Đã đủ chỗ`, en: `Fully booked` },
    'ws.duration':      { vi: `{n} phút`, en: `{n} min` },
    'ws.dur_hr':        { vi: `{n} tiếng`, en: `{n} hours` },
    'ws.dur_hr1':       { vi: `1 tiếng`, en: `1 hour` },
    'ws.age_all':       { vi: `Mọi lứa tuổi`, en: `All ages` },
    'ws.age_min':       { vi: `Từ {n} tuổi`, en: `Ages {n}+` },
    'ws.price_from':    { vi: `Từ {p}`, en: `From {p}` },
    'ws.price_tbd':     { vi: `Liên hệ`, en: `Ask us` },
    'ws.book':          { vi: `Giữ chỗ`, en: `Reserve a seat` },

    'ws.week_this':     { vi: `Tuần này`, en: `This week` },
    'ws.week_next':     { vi: `Tuần sau`, en: `Next week` },

    'ws.form_title':    { vi: `Giữ chỗ buổi này`, en: `Reserve this session` },
    'ws.f_name':        { vi: `Tên của bạn`, en: `Your name` },
    'ws.f_phone':       { vi: `Số điện thoại`, en: `Phone number` },
    'ws.f_phone_hint':  { vi: `Chúng mình nhắn xác nhận trước một ngày qua Zalo hoặc email. Không dùng Zalo thì để lại email ở dưới nhé.`, en: `We'll confirm the day before on Zalo or by email. No Zalo? Leave your email below.` },
    'ws.f_seats':       { vi: `Mấy người?`, en: `How many people?` },
    'ws.f_email':       { vi: `Email (không bắt buộc)`, en: `Email (optional)` },
    'ws.f_note':        { vi: `Ghi chú (không bắt buộc)`, en: `Note (optional)` },
    'ws.legal':         { vi: `Gem dùng thông tin này chỉ để giữ chỗ và nhắn xác nhận cho bạn. Bấm “Giữ chỗ” là bạn đồng ý với <a href="chinh-sach.html" target="_blank" rel="noopener">cách Gem dùng thông tin của bạn</a>.`, en: `Gem uses these details only to hold your seat and to confirm it with you. By pressing “Reserve” you agree to <a href="chinh-sach.html" target="_blank" rel="noopener">how Gem uses your information</a>.` },
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
    'ws.done_p':        { vi: `Chúng mình sẽ nhắn xác nhận trước một ngày, qua Zalo hoặc email. Trả tại studio khi bạn đến: tiền mặt hoặc chuyển khoản, không nhận thẻ.`, en: `We'll confirm the day before on Zalo or by email. Pay at the studio when you arrive: cash or bank transfer, no cards.` },
    'ws.done_wkend_p':  { vi: `Buổi Thứ Bảy, Chủ Nhật: Gem nhắn bạn qua Zalo để nhận trả trước 30%; chuyển xong bạn gửi ảnh chuyển khoản lại trong khung chat đó. Phần còn lại trả tại studio khi bạn đến: tiền mặt hoặc chuyển khoản, không nhận thẻ. Báo huỷ hoặc dời trước giờ học 24 tiếng thì Gem hoàn lại hoặc chuyển sang buổi khác.`, en: `A Saturday or Sunday session: we'll message you for 30% up front; once sent, share the transfer screenshot in that chat. The rest is paid at the studio: cash or bank transfer, no cards. Cancel or move at least 24 hours before and we refund it or move you to another session.` },
    'ws.done_ics':      { vi: `Thêm vào lịch`, en: `Add to calendar` },
    'ws.done_more':     { vi: `Xem buổi khác`, en: `See other sessions` },

    'ws.other_h':       { vi: `Chọn được workshop rồi?`, en: `Found one you like?` },
    'ws.other_p':       { vi: `Nhắn Gem workshop bạn chọn, ngày giờ và số người. Một người cũng xếp được.`, en: `Message us the workshop, the day & time and how many of you. Just one person is fine too.` },

    'ws.type_more':     { vi: `Xem chi tiết`, en: `See details` },
    'ws.type_next':     { vi: `Buổi gần nhất: {when}`, en: `Next session: {when}` },
    'ws.type_photos':   { vi: `+{n} ảnh`, en: `+{n} photos` },
    'ws.type_allfull':  { vi: `Các buổi đã lên lịch đều đủ chỗ, nhắn Gem để hẹn ngày khác`, en: `Scheduled sessions are full — message us for another day` },
    'ws.type_back':     { vi: `Về danh sách workshop`, en: `All workshops` },
    'ws.type_what':     { vi: `Bạn sẽ làm gì`, en: `What you'll do` },
    'ws.type_note':     { vi: `Cần biết trước`, en: `Good to know` },
    'ws.type_when':     { vi: `Buổi đã lên lịch`, en: `Scheduled sessions` },
    'ws.list_h':        { vi: `Chọn một workshop.`, en: `Pick something to make.` },
    'ws.list_p':        { vi: `Bấm vào từng workshop để xem nguyên liệu, độ tuổi và cách đặt.`, en: `Tap a workshop to see the materials, ages and how to book.` },

    /* Chạm Mùa — chuỗi workshop cuối tuần 25/09 – 27/12/2026 (bản in "Thông tin
       Workshop Chạm Mùa"). Hết mùa thì gỡ hai khối #cham-mua trong workshop.html. */
    'cm.label':         { vi: `Cuối tuần · 25/09 – 27/12/2026`, en: `Weekends · 25 Sep – 27 Dec 2026` },
    'cm.lead':          { vi: `Mỗi cuối tuần, mời bạn và người thương ghé chơi: chọn một chất liệu quen thuộc, học một cách làm mới và tự tay làm nên một món đồ.`, en: `Every weekend, come by with the people you love: pick a familiar material, learn a new way of making, and make something with your own hands.` },
    'cm.zalo_btn':      { vi: `Xem lịch trên Zalo`, en: `Schedule on Zalo` },
    'cm.info_btn':      { vi: `Ưu đãi & đường đi`, en: `Offers & directions` },
    'cm.img_alt':       { vi: `Hai bạn mặc áo truyền thống, một bạn cầm quạt, một bạn đội nón lá, trong đêm Đón Trăng ở studio`, en: `Two guests in traditional dress, one with a palm-leaf fan and one in a conical hat, at the Moon Festival night in the studio` },

    'cm.eyebrow':       { vi: `Chạm Mùa,`, en: `Chạm Mùa,` },
    'cm.title':         { vi: `Hóa thân thành một người nông dân.`, en: `Step into a farmer's shoes.` },
    'cm.sub':           { vi: `Từ xa xưa, người nông dân Việt sống gắn bó với tự nhiên: quan sát, tận dụng những gì sẵn có, và cùng nhau vun trồng cho một mùa bội thu.`, en: `Vietnamese farmers have long lived close to nature: watching it, making use of what was at hand, and working together toward a good harvest.` },
    'cm.s1_name':       { vi: `Ra Đồng`, en: `To the fields` },
    'cm.s1_h':          { vi: `Tham gia workshop`, en: `Join a workshop` },
    'cm.s1_p':          { vi: `Chọn một chất liệu quen thuộc, học một cách làm mới và tự tay làm nên một món đồ. Không giới hạn thời gian, làm chậm cũng được.`, en: `Pick a familiar material, learn a new technique and make something with your own hands. No time limit, so take it slow.` },
    'cm.s2_name':       { vi: `Vào Hội`, en: `To the festival` },
    'cm.s2_h':          { vi: `Trải nghiệm đa sắc`, en: `A colourful festival` },
    'cm.s2_p':          { vi: `Chụp ảnh với mặt nạ giấy bồi, đóng dấu trải nghiệm. Muốn mặc trang phục truyền thống hay thử đàn tranh thì có Âm Nhạc Vân Long, hỏi thêm khi bạn ghé.`, en: `Take photos with papier-mâché masks and collect experience stamps. To wear traditional dress or try the đàn tranh zither, ask Âm Nhạc Vân Long when you visit.` },
    'cm.s3_name':       { vi: `Du Uyển`, en: `Through the garden` },
    'cm.s3_h':          { vi: `Kết nối và sẻ chia`, en: `Connect and share` },
    'cm.s3_p':          { vi: `Cùng ngồi lại thưởng trà, xem tác phẩm hoàn thiện, trò chuyện và kết nối.`, en: `Sit down together over tea, look at the finished pieces, talk and get to know each other.` },

    'cm.offers_h':      { vi: `Ưu đãi`, en: `Offers` },
    'cm.off1':          { vi: `<b>−10%</b> khi đăng ký từ 2 workshop`, en: `<b>−10%</b> when you sign up for 2 workshops` },
    'cm.off2':          { vi: `<b>−15%</b> cho nhóm từ 4 người`, en: `<b>−15%</b> for groups of 4 or more` },
    'cm.off3':          { vi: `Chia sẻ trải nghiệm Chạm Mùa lên mạng xã hội, tặng bạn 01 lượt làm thiệp từ vải vụn (39K): làm ngay trong buổi, hoặc để dành lúc nào ghé cũng được.`, en: `Share your Chạm Mùa experience on social media and get one free fabric-scrap card session (39K): use it on the spot, or save it for any later visit.` },
    'cm.off4':          { vi: `Chụp ảnh miễn phí với mặt nạ giấy bồi và không gian studio.`, en: `Free photos with papier-mâché masks and the studio space.` },
    'cm.off_note':      { vi: `Ưu đãi được trừ khi bạn thanh toán tại studio.`, en: `Discounts are applied when you pay at the studio.` },

    'cm.go_h':          { vi: `Lịch & đường đi`, en: `Schedule & getting here` },
    'cm.go_sched':      { vi: `Muốn đến cuối tuần nào, bạn nhắn Gem để giữ chỗ. Lịch từng cuối tuần cũng có trong nhóm Zalo “Thông tin workshop Chạm Mùa”.`, en: `To come on a weekend, message us to save your place. Each weekend's schedule is also posted in our Zalo group (in Vietnamese).` },
    'cm.go_addr':       { vi: `Địa chỉ`, en: `Address` },
    'cm.go_park':       { vi: `Gửi xe`, en: `Parking` },
    'cm.park_moto':     { vi: `Xe máy: gửi tại Trung tâm Văn hóa, 114 Lê Gia Đỉnh`, en: `Motorbikes: at the Culture Centre, 114 Lê Gia Đỉnh` },
    'cm.park_car':      { vi: `Ô tô: gửi vào Trường Tiểu học & THCS Đoàn Kết`, en: `Cars: at Đoàn Kết Primary & Secondary School` },
    'cm.go_phone':      { vi: `Điện thoại`, en: `Phone` }
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

  /* ---------- gom theo tuần ----------
     Mọi phép tính ngày ở đây chạy trên chuỗi YYYY-MM-DD của giờ Hà Nội, và
     dựng Date ở 12:00Z cho chắc — nửa đêm dễ trượt sang ngày khác khi đổi
     múi giờ. Việt Nam không đổi giờ mùa nên không phải lo thêm gì. */

  function addDays(ymd, n) {
    var d = new Date(ymd + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Thứ Hai của tuần chứa ngày này.
  function weekStart(ymd) {
    var dow = new Date(ymd + 'T12:00:00Z').getUTCDay();   // 0 = Chủ Nhật
    return addDays(ymd, -((dow + 6) % 7));
  }

  function dm(ymd) { return ymd.slice(8, 10) + '/' + ymd.slice(5, 7); }

  // Tên tuần, hoặc null nếu tuần đó không phải tuần này / tuần sau —
  // lúc đó khoảng ngày đứng làm tiêu đề luôn, không lặp lại hai lần.
  function weekHead(ws) {
    var now = weekStart(vnParts(new Date().toISOString()).full);
    if (ws === now) return t('ws.week_this', 'Tuần này');
    if (ws === addDays(now, 7)) return t('ws.week_next', 'Tuần sau');
    return null;
  }

  function weekRange(ws) { return dm(ws) + ' – ' + dm(addDays(ws, 6)); }

  // [{ start, days: [{ p, items: [session] }] }] — sessions đã sắp theo giờ
  // từ database nên tuần và ngày cũng ra đúng thứ tự.
  function byWeek(list) {
    var weeks = [], wMap = {};
    list.forEach(function (s) {
      var p = vnParts(s.starts_at);
      var w = weekStart(p.full);
      if (!wMap[w]) { wMap[w] = { start: w, days: [], dMap: {} }; weeks.push(wMap[w]); }
      var wk = wMap[w];
      if (!wk.dMap[p.full]) { wk.dMap[p.full] = { p: p, items: [] }; wk.days.push(wk.dMap[p.full]); }
      wk.dMap[p.full].items.push(s);
    });
    return weeks;
  }

  /* ---------- mã màu theo loại workshop ----------
     Xếp theo slug rồi mới gán màu, để một loại luôn giữ đúng màu đó dù tuần
     này có buổi hay không. CSS định nghĩa 5 màu, nhiều loại hơn thì quay vòng.
     Gán trên danh sách loại đầy đủ (allTypes), không chỉ loại đang có buổi. */
  function colorMap(list) {
    var keys = [];
    list.forEach(function (s) {
      var k = typeKey(s);
      if (keys.indexOf(k) < 0) keys.push(k);
    });
    keys.sort();
    var map = {};
    keys.forEach(function (k, i) { map[k] = (i % 5) + 1; });
    return map;
  }

  function typeKey(s) { return s.slug || s.name_vi || '?'; }

  var _colors = null;
  function colorFor(s) {
    if (!_colors) _colors = colorMap(allTypes());
    return _colors[typeKey(s)] || 1;
  }

  function money(n) {
    if (n == null) return t('ws.price_tbd', 'Liên hệ');
    // English: "39,000₫" — "39.000đ" reads as thirty-nine to an English reader
    return lang() === 'en' ? n.toLocaleString('en-US') + '₫' : n.toLocaleString('vi-VN') + 'đ';
  }

  /* ---------- dòng thông tin: thời lượng · tuổi · giá ----------
     Ghi y như bản in Chạm Mùa: "1–1,5 tiếng", "30–60 phút", "Từ 60.000đ".
     Buổi lấy từ sessions_public không có ba cột mới (duration_max, age_min,
     price_from) — thiếu thì đơn giản là không ghi phần đó. */
  function durText(o) {
    var a = o.duration_minutes, b = o.duration_max;
    if (!a) return '';
    if (!b || b <= a) b = null;
    // Tính theo tiếng khi cả hai đầu từ 1 tiếng trở lên và tròn nửa tiếng
    if (a < 60 || a % 30 || (b && b % 30)) {
      return fill(t('ws.duration', '{n} phút'), { n: b ? a + '–' + b : a });
    }
    var en = lang() === 'en';
    function h(m) { var x = String(m / 60); return en ? x : x.replace('.', ','); }
    if (!b && a === 60) return t('ws.dur_hr1', '1 tiếng');
    return fill(t('ws.dur_hr', '{n} tiếng'), { n: b ? h(a) + '–' + h(b) : h(a) });
  }

  // 0 = mọi lứa tuổi; để trống = không ghi (bản in không nói thì web cũng không đoán)
  function ageText(o) {
    if (o.age_min == null) return '';
    return o.age_min > 0
      ? fill(t('ws.age_min', 'Từ {n} tuổi'), { n: o.age_min })
      : t('ws.age_all', 'Mọi lứa tuổi');
  }

  function priceText(o) {
    var m = money(o.price);
    return o.price != null && o.price_from ? fill(t('ws.price_from', 'Từ {p}'), { p: m }) : m;
  }

  function metaText(o) {
    return [durText(o), ageText(o), priceText(o)].filter(Boolean).join(' · ');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- đặt lịch bằng tin nhắn (14/11/2026) ----------
     Lối đặt chính: khách nhắn Gem lúc nào cũng được. Thứ tự kênh theo ngôn
     ngữ: tiếng Việt Zalo trước; tiếng Anh Instagram trước, Zalo cuối (khách
     nước ngoài nhắn qua Instagram, Messenger, Threads hoặc email — Anna
     14/11/2026). Zalo, Messenger, Instagram, Threads không nhận lời nhắn điền
     sẵn qua đường link, nên bấm là lời nhắn được chép (giống giỏ hàng) để
     khách dán vào khung chat; email thì điền sẵn tiêu đề và nội dung. */
  var SHOP_EMAIL = 'gemchamsac@gmail.com';
  var STROKE = 'fill="none" stroke="currentColor" stroke-width="2"';
  var CHANNELS = {
    zalo:      { href: 'https://zalo.me/84824964996', label: 'Zalo', svg: STROKE,
                 icon: '<path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z"/>' },
    messenger: { href: 'https://m.me/gemchamsac', label: 'Messenger', svg: STROKE,
                 icon: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>' },
    instagram: { href: 'https://ig.me/m/gemchamsac_studio', label: 'Instagram', svg: STROKE,
                 icon: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4a4 4 0 11-8 0 4 4 0 018 0zM17.5 6.5h.01"/>' },
    threads:   { href: 'https://www.threads.com/@gemchamsac_studio', label: 'Threads', svg: 'fill="currentColor"',
                 icon: '<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.166 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.74-1.755-.503-.582-1.279-.878-2.309-.88h-.029c-.826 0-1.951.227-2.674 1.302L9.587 7.45c.97-1.435 2.547-2.225 4.476-2.225h.039c3.227.02 5.149 2.007 5.34 5.484.11.046.217.094.322.144 1.484.7 2.572 1.756 3.144 3.055.797 1.81.871 4.756-1.527 7.11-1.835 1.8-4.064 2.612-7.208 2.634Z"/>' },
    email:     { href: 'mailto:' + SHOP_EMAIL, label: 'Email', svg: STROKE,
                 icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>' }
  };
  var CH_ORDER = {
    vi: ['zalo', 'messenger', 'instagram', 'email'],
    en: ['instagram', 'messenger', 'email', 'threads', 'zalo']
  };

  function channelsHTML() {
    return CH_ORDER[lang() === 'en' ? 'en' : 'vi'].map(function (k, i) {
      var c = CHANNELS[k];
      return '<a class="btn ' + (i ? 'btn-ghost' : 'btn-primary') + '" href="' + c.href + '"' +
          (k === 'email' ? '' : ' target="_blank" rel="noopener"') + ' data-ch="' + k + '">' +
        '<svg viewBox="0 0 24 24" ' + c.svg + ' aria-hidden="true">' + c.icon + '</svg>' +
        '<span>' + c.label + '</span></a>';
    }).join('');
  }

  // Lời nhắn soạn sẵn. ty = loại workshop khách đang xem, null ở khung chung.
  function bookMsg(ty) {
    return [
      t('ws.msg_hi', 'Chào Gem, mình muốn đặt workshop.'),
      t('ws.msg_ws', 'Món:') + ' ' + (ty ? pickField(ty, 'name') : ''),
      t('ws.msg_when', 'Ngày giờ mong muốn:') + ' ',
      t('ws.msg_people', 'Số người:') + ' ',
      t('ws.msg_lang', '')
    ].filter(function (x) { return x.trim(); }).join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { /* ignore */ });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  // box: khối chứa [data-ws-ch] và dòng .ws-ch-note
  function fillChannels(box, ty) {
    var row = box && box.querySelector('[data-ws-ch]');
    if (!row) return;
    row.innerHTML = channelsHTML();
    var note = box.querySelector('.ws-ch-note');
    row.querySelectorAll('a[data-ch]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var text = bookMsg(ty);
        if (a.getAttribute('data-ch') === 'email') {
          e.preventDefault();
          window.location.href = 'mailto:' + SHOP_EMAIL +
            '?subject=' + encodeURIComponent(t('ws.mail_subject', 'Đặt workshop') +
                                             (ty ? ': ' + pickField(ty, 'name') : '')) +
            '&body=' + encodeURIComponent(text);
          return;
        }
        // copy inside the click: the chat app opens in a new tab on this same tap
        copyText(text);
        if (note) {
          // switch the key, so a later translate() pass keeps "copied" (in the right language)
          note.setAttribute('data-i18n', 'ws.ch_copied');
          note.textContent = t('ws.ch_copied', '');
          note.classList.add('is-done');
        }
      });
    });
  }

  // khung đầu trang + lời nhắc cuối trang: nằm sẵn trong workshop.html
  function fillStatic() {
    document.querySelectorAll('.ws-book, .ws-other').forEach(function (box) { fillChannels(box, null); });
  }

  /* ---------- .ics, sinh hoàn toàn phía trình duyệt ---------- */
  function icsFor(session) {
    function z(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    // Giữ chỗ trong lịch theo thời lượng dài nhất, kẻo người ta hẹn việc khác sát giờ
    var ty = typeBySlug(session.slug) || {};
    var mins = ty.duration_max || session.duration_minutes || 120;
    var end = new Date(new Date(session.starts_at).getTime() + mins * 60000);
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
  var root, sessions = [], types = [], current = null, openType = null;

  // Mọi loại workshop để hiện thẻ: loại đã đăng (theo sort_order), cộng loại
  // nào có buổi mà không nằm trong danh sách đó — thẻ của nó dựng từ dữ liệu
  // buổi, như trước đây.
  function allTypes() {
    var out = types.slice(), seen = {};
    out.forEach(function (ty) { seen[typeKey(ty)] = 1; });
    sessions.forEach(function (s) {
      var k = typeKey(s);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(s);
    });
    return out;
  }

  // Dòng "buổi gần nhất" trên thẻ loại. sessions đã sắp theo giờ nên buổi
  // đầu tiên còn chỗ là buổi gần nhất đặt được. Không có buổi nào thì không
  // ghi gì: nút "Đặt lịch" ngay dưới đã nói là đặt được (trước đây dòng "Chưa
  // có lịch" lặp trên cả 15 thẻ làm khách tưởng không đặt được).
  function nextLine(k) {
    var mine = sessions.filter(function (s) { return typeKey(s) === k; });
    if (!mine.length) return '';
    var open = mine.filter(function (s) { return s.seats_left > 0; })[0];
    if (!open) {
      return '<p class="ws-type-next none" data-i18n="ws.type_allfull"></p>';
    }
    var p = vnParts(open.starts_at);
    var when = dayLabel(p.dow) + ' ' + p.date + ' · ' + p.time;
    return '<p class="ws-type-next">' +
      esc(fill(t('ws.type_next', 'Buổi gần nhất: {when}'), { when: when })) + '</p>';
  }

  function typeBySlug(slug) {
    if (!slug) return null;
    for (var i = 0; i < types.length; i++) if (types[i].slug === slug) return types[i];
    return null;
  }

  function pickField(o, field) {
    var en = lang() === 'en';
    return (en && o[field + '_en']) || o[field + '_vi'] || '';
  }

  // Mỗi dòng một ý — cách nhập dễ nhất cho người viết, và không cần HTML.
  function lines(str) {
    return String(str || '').split('\n')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  // Một dòng buổi học. Dùng chung cho lịch ngoài trang chính và cho danh
  // sách "Sắp có buổi nào" trong trang giới thiệu.
  function slotHTML(s) {
    var full = s.seats_left <= 0;
    var few = !full && s.seats_left <= 3;
    var name = lang() === 'en' && s.name_en ? s.name_en : s.name_vi;
    var p = vnParts(s.starts_at);
    var seatTxt = full
      ? t('ws.full', 'Đã đủ chỗ')
      : fill(t(few ? 'ws.seats_few' : 'ws.seats_left', ''), { n: s.seats_left, cap: s.capacity });

    return '<li class="ws-slot' + (full ? ' is-full' : '') + '" data-c="' + colorFor(s) + '">' +
      '<span class="ws-time">' + esc(p.time) + '</span>' +
      '<div class="ws-slot-body">' +
        // Trong trang giới thiệu thì tên loại đã nằm ở tiêu đề, nên ở đó
        // dòng này hiện NGÀY. Ngoài lịch thì ngày đã có ở tiêu đề ngày.
        '<h4>' + esc(openType ? dayLabel(p.dow) + ' ' + p.date : name) + '</h4>' +
        // Thời lượng và giá đã nói ở phần mô tả loại phía trên — lặp lại dưới
        // từng buổi chỉ làm hàng nào cũng giống hàng nào.
        '<p class="ws-meta">' +
          '<span class="ws-seats' + (few ? ' few' : '') + (full ? ' none' : '') + '">' +
            esc(seatTxt) + '</span>' +
        '</p>' +
      '</div>' +
      '<div class="ws-act">' +
        (full ? '' :
          '<button type="button" class="btn btn-primary ws-pick" data-id="' + esc(s.id) + '">' +
            t('ws.book', 'Giữ chỗ') + '</button>') +
      '</div>' +
    '</li>';
  }

  function wirePick() {
    root.querySelectorAll('.ws-pick').forEach(function (b) {
      b.addEventListener('click', function () { openForm(b.getAttribute('data-id')); });
    });
  }

  /* ---------- trang giới thiệu một loại workshop ----------
     toBook: mở bằng nút "Đặt lịch" trên thẻ → cuộn thẳng tới khung đặt (#dat-mon) */
  function renderType(slug, pushState, toBook) {
    var ty = typeBySlug(slug);
    if (!ty) return renderList();
    openType = ty;
    current = null;
    listHead(false);

    var name = pickField(ty, 'name');
    var mine = sessions.filter(function (s) { return s.slug === slug; });

    // Chữ do người viết gõ trong trang quản trị: dựng bằng textContent, không
    // ghép vào innerHTML.
    var longBox = document.createElement('div');
    longBox.className = 'ws-long';
    // Chưa có bài giới thiệu dài thì dùng mô tả ngắn, để trang không trống đầu
    lines(pickField(ty, 'long') || pickField(ty, 'desc')).forEach(function (para) {
      var el = document.createElement('p');
      el.textContent = para;
      longBox.appendChild(el);
    });

    function listBox(cls, title, raw) {
      var items = lines(raw);
      if (!items.length) return null;
      var wrap = document.createElement('div');
      wrap.className = cls;
      var h = document.createElement('h3');
      h.textContent = title;
      wrap.appendChild(h);
      var ul = document.createElement('ul');
      items.forEach(function (x) {
        var li = document.createElement('li');
        li.textContent = x;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      return wrap;
    }

    root.innerHTML =
      '<article class="ws-page">' +
        '<button type="button" class="ws-back-list" data-i18n="ws.type_back"></button>' +
        (ty.cover ? '<div class="ws-page-cover"><img src="' + esc(ty.cover) + '" alt=""></div>' : '') +
        '<h2 class="ws-page-h">' + esc(name) + '</h2>' +
        '<p class="ws-page-meta">' + esc(metaText(ty)) + '</p>' +
        '<div class="ws-long-slot"></div>' +
        '<div class="ws-boxes"></div>' +
        ((ty.images || []).length
          ? '<div class="ws-page-gallery">' + ty.images.map(function (src) {
              return '<img src="' + esc(src) + '" alt="" loading="lazy">';
            }).join('') + '</div>'
          : '') +
        '<div class="ws-page-when">' +
          (mine.length
            ? '<div class="ws-page-slots"><h3 data-i18n="ws.type_when"></h3>' +
                '<ul class="ws-slots">' + mine.map(slotHTML).join('') + '</ul></div>'
            : '') +
          // Đặt bằng tin nhắn luôn có, kể cả khi có buổi trên lịch (ngày khác)
          '<div class="ws-page-book" id="dat-mon">' +
            '<h3 data-i18n="' + (mine.length ? 'ws.page_book_other' : 'ws.page_book_h') + '"></h3>' +
            '<p data-i18n="ws.page_book_p"></p>' +
            '<p class="ws-book-wkend" data-i18n="ws.book_wkend"></p>' +
            '<div class="ws-ch" data-ws-ch></div>' +
            '<p class="ws-ch-note" data-i18n="ws.ch_note" aria-live="polite"></p>' +
          '</div>' +
        '</div>' +
      '</article>';

    root.querySelector('.ws-long-slot').replaceWith(longBox);
    var boxes = root.querySelector('.ws-boxes');
    [listBox('ws-box', t('ws.type_what', 'Bạn sẽ làm gì'), pickField(ty, 'what')),
     listBox('ws-box', t('ws.type_note', 'Cần biết trước'), pickField(ty, 'note'))]
      .forEach(function (b) { if (b) boxes.appendChild(b); });

    root.querySelector('.ws-back-list').addEventListener('click', function () {
      history.pushState({}, '', location.pathname);
      openType = null;
      renderList();
      scrollToRoot();
    });
    wirePick();
    fillChannels(root.querySelector('.ws-page-book'), ty);

    if (pushState) {
      history.pushState({ loai: slug }, '', '?loai=' + encodeURIComponent(slug) + (toBook ? '#dat-mon' : ''));
      if (toBook) scrollToBook();
      else scrollToRoot();
    }
    document.title = name + ' · Gem Chạm Sắc';
    translate();
  }

  // Mở / đóng trang giới thiệu thì cuộn tới đầu khung workshop chứ không về
  // đầu trang: phía trên còn dải Chạm Mùa, về đầu trang là phải cuộn lại tìm.
  function scrollToRoot(instant) { scrollToEl(root, instant); }

  function scrollToEl(el, instant) {
    if (!el) return;
    var header = document.querySelector('.site-header');
    var y = el.getBoundingClientRect().top + window.pageYOffset -
            (header ? header.offsetHeight : 0) - 16;
    window.scrollTo({ top: Math.max(0, y), behavior: instant ? 'auto' : 'smooth' });
  }

  // Khung đặt (#dat-mon) nằm dưới ảnh bìa và ảnh của workshop. Ảnh tải xong
  // sau cú nhảy thì đẩy khung xuống khỏi màn hình (link từ khối kit ở
  // san-pham.html mở ra trang giữa chừng bài giới thiệu). Nên nhảy lại theo
  // khung mỗi khi một ảnh tải xong — trừ khi khách đã tự cuộn.
  function scrollToBook(instant) {
    var el = root.querySelector('.ws-page-book');
    if (!el) return;
    scrollToEl(el, instant);
    var touched = false;
    function stop() { touched = true; }
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, stop, { once: true, passive: true });
    });
    root.querySelectorAll('img').forEach(function (im) {
      if (im.complete) return;
      im.addEventListener('load', function () { if (!touched) scrollToEl(el, true); });
    });
  }

  // Tiêu đề "Chọn một workshop" chỉ hợp với danh sách: trong trang giới
  // thiệu một loại hay form giữ chỗ thì nó nói sai việc đang làm.
  function listHead(show) {
    var h = document.getElementById('ws-list-head');
    if (h) h.hidden = !show;
  }

  function route() {
    var slug = new URLSearchParams(location.search).get('loai');
    if (slug && typeBySlug(slug)) renderType(slug, false);
    else { openType = null; renderList(); }
  }

  function renderList() {
    listHead(true);
    var list = allTypes();
    if (!list.length && !sessions.length) {
      root.innerHTML = '<p class="ws-empty" data-i18n="ws.empty"></p>';
      translate();
      return;
    }

    var color = colorMap(list);

    // Thẻ loại workshop luôn hiện, kể cả khi chưa có buổi nào trên lịch —
    // khách vẫn cần biết ở đây có những workshop gì. Mô tả nói một lần cho
    // mỗi loại, không lặp lại dưới từng buổi.
    var legend = '<ul class="ws-types">' + list.map(function (s) {
      var name = lang() === 'en' && s.name_en ? s.name_en : s.name_vi;
      var desc = lang() === 'en' && s.desc_en ? s.desc_en : s.desc_vi;
      var slug = s.slug || '';
      var hasPage = !!typeBySlug(slug);
      // Ảnh bìa, không có thì lấy ảnh đầu thư viện. Còn bao nhiêu ảnh khác thì
      // báo "+N ảnh" — xem hết ở trang giới thiệu, không làm carousel trong thẻ.
      var imgs = s.images || [];
      var pic = s.cover || imgs[0] || null;
      var more = imgs.filter(function (x) { return x !== pic; }).length;
      var page = '?loai=' + encodeURIComponent(slug);
      return '<li class="ws-type' + (pic ? ' has-pic' : '') + '" data-c="' + color[typeKey(s)] + '">' +
        (hasPage ? '<a class="ws-type-link" href="' + page + '" data-slug="' + esc(slug) + '">' : '<div class="ws-type-link">') +
          (pic
            ? '<div class="ws-type-pic"><img src="' + esc(pic) + '" alt="" loading="lazy">' +
                (more ? '<span class="ws-type-count">' +
                  esc(fill(t('ws.type_photos', '+{n} ảnh'), { n: more })) + '</span>' : '') +
              '</div>'
            : '') +
          '<h3>' + esc(name) + '</h3>' +
          (desc ? '<p>' + esc(desc) + '</p>' : '') +
          '<p class="ws-type-meta">' + esc(metaText(s)) + '</p>' +
          nextLine(typeKey(s)) +
        (hasPage ? '</a>' : '</div>') +
        // "Đặt lịch" trên mọi thẻ: mở trang workshop đó ở khung đặt (#dat-mon).
        // Loại không có trang riêng thì về khung đặt chung đầu trang.
        '<div class="ws-type-act">' +
          (hasPage
            ? '<a class="btn btn-primary ws-type-book" href="' + page + '#dat-mon" data-slug="' + esc(slug) + '" data-book="1" data-i18n="ws.type_book"></a>' +
              '<a class="ws-type-more" href="' + page + '" data-slug="' + esc(slug) + '" data-i18n="ws.type_more"></a>'
            : '<a class="btn btn-primary ws-type-book" href="#dat-lich" data-i18n="ws.type_book"></a>') +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';

    var sched = byWeek(sessions).map(function (wk) {
      var head = weekHead(wk.start);
      var range = weekRange(wk.start);
      return '<section class="ws-week">' +
        '<h3 class="ws-week-h">' + esc(head || range) +
          (head ? '<span>' + esc(range) + '</span>' : '') +
        '</h3>' +
        wk.days.map(function (d) {
          return '<div class="ws-day">' +
            '<div class="ws-day-h">' +
              '<span class="ws-dow">' + esc(dayLabel(d.p.dow)) + '</span>' +
              '<span class="ws-date">' + esc(d.p.date) + '</span>' +
            '</div>' +
            '<ul class="ws-slots">' + d.items.map(slotHTML).join('') + '</ul>' +
          '</div>';
        }).join('') +
      '</section>';
    }).join('');
    // Lịch cố định chỉ hiện khi có buổi; không có thì không nói gì thêm —
    // đặt bằng tin nhắn là lối chính, đã nằm ở khung đầu trang.
    if (sessions.length) {
      sched = '<h3 class="ws-sched-h" id="ws-sched-h" data-i18n="ws.sched_h"></h3>' + sched;
    }

    root.innerHTML = '<div class="ws-sched">' + legend + sched + '</div>';

    wirePick();
    root.querySelectorAll('.ws-type a[data-slug]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        // Ctrl/Cmd-click và chuột giữa vẫn mở tab mới như link thường
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        renderType(a.getAttribute('data-slug'), true, a.hasAttribute('data-book'));
      });
    });
    translate();
  }

  // "Hoặc giữ chỗ ở một buổi đã lên lịch" trong khung đầu trang: chỉ khi có buổi
  function showSchedLink() {
    var or = document.querySelector('.ws-book-or');
    if (or) or.hidden = !sessions.length;
  }

  function openForm(id) {
    current = sessions.filter(function (s) { return s.id === id; })[0];
    if (!current) return;
    listHead(false);
    var p = vnParts(current.starts_at);
    var name = lang() === 'en' && current.name_en ? current.name_en : current.name_vi;
    var max = Math.max(1, Math.min(current.seats_left, 10));

    root.innerHTML =
      '<div class="ws-form-wrap">' +
        '<button type="button" class="ws-back" data-i18n="ws.cancel"></button>' +
        '<div class="ws-chosen">' +
          '<h3>' + esc(name) + '</h3>' +
          '<p>' + esc(dayLabel(p.dow)) + ' ' + esc(p.date) + ' · ' + esc(p.time) + ' · ' +
                  esc(durText(typeBySlug(current.slug) || current)) + '</p>' +
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
          '<p class="ws-legal" data-i18n-html="ws.legal"></p>' +
          '<button type="submit" class="btn btn-primary ws-submit" data-i18n="ws.submit"></button>' +
          '<p class="ws-err" hidden></p>' +
        '</form>' +
      '</div>';

    root.querySelector('.ws-back').addEventListener('click', function () {
      // Vào form từ trang giới thiệu thì quay lại chính trang đó, không nhảy
      // về lịch chung — người dùng mất chỗ đang đọc là bực.
      if (openType) renderType(openType.slug, false); else renderList();
    });
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
    listHead(false);
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
        // Saturday / Sunday (Vietnam time): 30% up front, by message (Anna 18/11/2026)
        '<p class="ws-done-p" data-i18n="' + (p.dow === 0 || p.dow === 6 ? 'ws.done_wkend_p' : 'ws.done_p') + '"></p>' +
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
    if (window.GemI18n) {
      // refresh() re-translates without saving a language choice (see i18n.js)
      if (window.GemI18n.refresh) window.GemI18n.refresh();
      else window.GemI18n.setLang(window.GemI18n.getLang());
    }
  }

  function load() {
    root.innerHTML = '<p class="ws-loading" data-i18n="ws.loading"></p>';
    translate();
    // Hai lượt gọi song song: buổi học cho lịch, loại workshop cho trang
    // giới thiệu. Không nhét nội dung dài vào sessions_public vì như thế là
    // chép lại nguyên bài giới thiệu trên từng buổi.
    Promise.all([
      window.GemDB.sessions(),
      window.GemDB.workshopTypes()
    ]).then(function (r) {
      sessions = r[0] || [];
      types = r[1] || [];
      _colors = null;
      showSchedLink();
      route();
      // Mở thẳng link ?loai=… (gửi cho nhau qua Zalo): đưa người đọc tới
      // trang giới thiệu luôn, khỏi phải cuộn qua phần đầu trang. Có #dat-mon
      // (nút "Đặt lịch", khối kit ở san-pham.html) thì tới thẳng khung đặt.
      if (openType) {
        if (location.hash === '#dat-mon') scrollToBook(true);
        else scrollToRoot(true);
      }
    }).catch(renderError);
  }

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('ws-root');
    if (!root) return;

    // Ngày/giờ và tên buổi dựng bằng JS nên phải vẽ lại khi đổi ngôn ngữ.
    // Phải so ngôn ngữ trước khi vẽ: translate() gọi setLang(), mà setLang()
    // lại phát chính sự kiện này — không chặn thì thành vòng lặp vô hạn.
    window.addEventListener('popstate', function () {
      if (sessions.length || types.length) route();
    });

    var lastLang = lang();
    document.addEventListener('gem:langchange', function (e) {
      var l = (e.detail && e.detail.lang) || lang();
      if (l === lastLang) return;
      lastLang = l;
      fillStatic();   // kênh đổi thứ tự theo ngôn ngữ
      if (openType) renderType(openType.slug, false);
      else if (root.querySelector('.ws-sched')) renderList();
    });

    // Nút kênh không cần dữ liệu: dựng ngay, kể cả khi database chưa trả lời
    fillStatic();
    load();
  });
})();
