// Gem Chạm Sắc — giỏ hàng tương tác
//
// A floating basket in the corner. Clicking "thêm vào giỏ" on a product sends a
// hand-drawn sprite of that product flying into the basket, where it stacks up
// visibly. Opening the basket shows the items, quantities and a subtotal, then
// either sends the order to the shop email or hands it over to Zalo/Messenger.
//
// Self-contained: builds its own DOM, so a page only needs
//   <script src="js/basket.js" defer></script>
// plus data-sku="<id>" and an empty <div class="gb-slot"></div> inside each
// .product-card. Styles live in css/style.css under "GIỎ HÀNG".
//
// No backend yet — orders go out by email. Sprint 4 swaps that for Supabase.
// State lives in localStorage['gem-basket'].

(function () {
  'use strict';

  /* ======================================================================
     CONFIG — Anna: đây là phần cần sửa
     ====================================================================== */
  var CONFIG = {
    // Email chính thức của shop — đơn hàng gửi về đây.
    shopEmail: 'gemchamsac@gmail.com',

    zaloPhone: '84824964996',        // zalo.me/<số> — bỏ dấu +, giữ mã 84
    messengerHandle: 'gemchamsac',   // m.me/<handle>

    // Để trống = đơn hàng mở sẵn trong app email của khách (mailto), không cần
    // đăng ký gì. Muốn đơn tự chạy về hộp thư mà khách không phải bấm Gửi thì
    // điền endpoint của FormSubmit ('https://formsubmit.co/<email>') hoặc
    // Formspree ('https://formspree.io/f/<id>') vào đây.
    orderEndpoint: '',

    maxSpritesInBasket: 6            // hơn số này thì hiện "+N"
  };

  /* ======================================================================
     CATALOG

     `price: null` = chưa chốt giá → web hiện "Liên hệ".
     Điền giá thật vào cột `price` (đơn vị: đồng, không dấu chấm, ví dụ 150000)
     là con số hiện lên ngay, không phải sửa gì khác.

     KHÔNG điền số phỏng đoán vào đây. Giá đã đăng là một lời hứa — sai giá thì
     hoặc phải chịu, hoặc làm khách thất vọng ngay tại cửa hàng.

     `name`/`desc` trỏ sang key i18n có sẵn trong js/i18n.js nên tên sản phẩm
     tự động đúng theo ngôn ngữ đang chọn.
     Quần áo 2hand cố tình để ngoài — mỗi món là một cái riêng, cần dữ liệu
     từng món trước khi cho vào giỏ được.

     Sprint 4: bảng này chuyển vào Supabase, em gái sửa giá trong trang quản trị.
     ====================================================================== */
  var CATALOG = [
    { sku: 'origami',   name: 'products.origami_h',    desc: 'products.origami_p',    price: 66000, sprite: 'pouch' },
    { sku: 'oxford',    name: 'products.oxford_h',     desc: 'products.oxford_p',     price: 120000, sprite: 'shirt' },
    { sku: 'denim',     name: 'products.denim_h',      desc: 'products.denim_p',      price: 120000, priceMax: 200000, sprite: 'denim' },
    { sku: 'bloom',     name: 'products.bloom_h',      desc: 'products.bloom_p',      price: 20000, priceMax: 45000, sprite: 'bloom' },
    { sku: 'tuibut',    name: 'products.tuibut_h',     desc: 'products.tuibut_p',     price: 35000, sprite: 'pencase' },
    { sku: 'bookmark',  name: 'products.bookmark_h',   desc: 'products.bookmark_p',   price: 20000, sprite: 'bookmark' },
    { sku: 'biaso',     name: 'products.biaso_h',      desc: 'products.biaso_p',      price: null, sprite: 'journal' },   // chưa có trong catalog
    { sku: 'daydeo',    name: 'products.daydeo_h',     desc: 'products.daydeo_p',     price: null, sprite: 'strap' },   // chưa có trong catalog
    { sku: 'scrunchie', name: 'products.scrunchie_h',  desc: 'products.scrunchie_p',  price: 15000, sprite: 'scrunchie' },
    { sku: 'lotcoc',    name: 'products.lotcoc_h',     desc: 'products.lotcoc_p',     price: 25000, sprite: 'coaster' },
    { sku: 'goi',       name: 'products.goi_h',        desc: 'products.goi_p',        price: 120000, priceMax: 300000, sprite: 'pillow' },
    { sku: 'tham',      name: 'products.tham_h',       desc: 'products.tham_p',       price: null, sprite: 'rug' },   // hàng đặt theo yêu cầu
    { sku: 'so-kraft',  name: 'products.pv1_h',        desc: 'products.pv1_p',        price: 80000, priceMax: 200000, sprite: 'spiral' },
    { sku: 'so-khau',   name: 'products.sokhau_h',     desc: 'products.sokhau_p',     price: 100000, sprite: 'stitched' },
    { sku: 'gom',       name: 'products.cgom_h',       desc: 'products.cgom_p',       price: null, sprite: 'ceramic' },   // chưa có trong catalog
    { sku: 'set-qua',   name: 'products.setqua_h',     desc: 'products.setqua_p',     price: null, sprite: 'gift' },   // chưa có trong catalog
  ];

  /* ======================================================================
     SPRITES — placeholder line art, marker style, 48×48, dùng currentColor.
     Đây là bản tạm để test tương tác. Thay bằng tranh vẽ tay của em gái Anna:
     giữ nguyên key, thay nội dung <svg> (hoặc trả về <img src="...">).
     ====================================================================== */
  function svg(inner) {
    return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  var SPRITES = {
    // Origami Pouch — ví lục giác
    pouch: svg('<path d="M24 8 38 16v16L24 40 10 32V16z"/><path d="M11 17h26"/><circle cx="24" cy="25" r="2.6"/>'),
    // Oxford Shirt — túi áo sơ mi
    shirt: svg('<path d="M17 10l7 4 7-4 6 4-2 6-2.5-1.2V38H15.5V18.8L13 20l-2-6z"/><path d="M21 10.5l3 5 3-5"/>'),
    // Reimagine the Denim
    denim: svg('<path d="M13 15h22l2.5 23h-27z"/><path d="M18 15a6 6 0 0 1 12 0"/><path d="M19 22h10l-1 7h-8z"/>'),
    // Bloom Charm — móc khóa hoa
    bloom: svg('<circle cx="24" cy="10" r="3.6"/><path d="M24 13.6v3.2"/>' +
      '<circle cx="24" cy="20.5" r="4"/><circle cx="30.2" cy="25" r="4"/>' +
      '<circle cx="27.8" cy="32.3" r="4"/><circle cx="20.2" cy="32.3" r="4"/>' +
      '<circle cx="17.8" cy="25" r="4"/><circle cx="24" cy="27" r="3"/>'),
    // Túi bút kẹp sổ
    pencase: svg('<rect x="10" y="17" width="28" height="18" rx="4"/><path d="M10 23h28"/>' +
      '<path d="M31 11v10"/><path d="M29 13.5h4"/>'),
    // Bookmark
    bookmark: svg('<path d="M15 9h18v31l-9-7.5L15 40z"/><path d="M20 17h8"/><path d="M20 23h8"/>' +
      '<path d="M24 9V5"/>'),
    // Bìa sổ vải ghép
    journal: svg('<path d="M12 9h24v30H12z"/><path d="M17.5 9v30"/>' +
      '<rect x="22" y="17" width="9" height="9"/><path d="M22 30h9"/>'),
    // Dây đeo cổ tay
    strap: svg('<circle cx="24" cy="13" r="3.6"/><ellipse cx="24" cy="28" rx="11" ry="8"/>' +
      '<path d="M13.6 24.6c6.4 4 14.4 4 20.8 0"/><path d="M24 16.6v3.5"/>'),
    // Dây buộc tóc — scrunchie
    scrunchie: svg('<circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="6"/>' +
      '<path d="M24 11v7"/><path d="M35.3 17.5l-6 3.5"/><path d="M35.3 30.5l-6-3.5"/>' +
      '<path d="M24 37v-7"/><path d="M12.7 30.5l6-3.5"/><path d="M12.7 17.5l6 3.5"/>'),
    // Lót Cốc
    coaster: svg('<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="8.5"/>' +
      '<path d="M24 15.5v17"/><path d="M15.5 24h17"/>'),
    // Gối Chắp Sắc
    pillow: svg('<rect x="9" y="12" width="30" height="24" rx="5"/><path d="M24 12v24"/>' +
      '<path d="M9 24h30"/><circle cx="16" cy="18" r="1.4"/><circle cx="32" cy="30" r="1.4"/>'),
    // Thảm Chắp Sắc
    rug: svg('<rect x="11" y="16" width="26" height="17" rx="2"/><path d="M19.5 16v17"/>' +
      '<path d="M28.5 16v17"/><path d="M11 24.5h26"/>' +
      '<path d="M11 13.5v2.5M17 13.5v2.5M24 13.5v2.5M31 13.5v2.5M37 13.5v2.5"/>' +
      '<path d="M11 33v2.5M17 33v2.5M24 33v2.5M31 33v2.5M37 33v2.5"/>'),
    // Sổ kraft spiral
    spiral: svg('<path d="M17 10h19v28H17z"/><path d="M12 14h7M12 20h7M12 26h7M12 32h7"/>'),
    // Sổ khâu tay tái chế
    stitched: svg('<path d="M13 10h22v28H13z"/><path d="M18 12.5v3M18 19v3M18 25.5v3M18 32v3"/>' +
      '<path d="M24 19h7"/><path d="M24 25h7"/>'),
    // Gốm sứ Nhật
    ceramic: svg('<path d="M9 21h20a10 10 0 0 1-20 0z"/><path d="M9 21h20"/>' +
      '<path d="M33 18h8v7a4 4 0 0 1-8 0z"/><path d="M41 19.5a2.6 2.6 0 0 1 0 5"/>'),
    // Set quà tặng
    gift: svg('<rect x="10" y="21" width="28" height="17" rx="2"/>' +
      '<rect x="8" y="15.5" width="32" height="6" rx="1.5"/><path d="M24 15.5V38"/>' +
      '<path d="M24 15.5c-3.2-5-9.4-4-7.2 0"/><path d="M24 15.5c3.2-5 9.4-4 7.2 0"/>')
  };

  // The basket itself, split so items can sit between the back and the front rim
  var BASKET_BACK = '<svg viewBox="0 0 64 56" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 20a12 12 0 0 1 24 0" stroke-width="2.2"/>' +
    '<path d="M8 22h48l-5 27a4 4 0 0 1-4 3H17a4 4 0 0 1-4-3z" fill="var(--gb-basket-fill)"/>' +
    '</svg>';

  var BASKET_FRONT = '<svg viewBox="0 0 64 56" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 32h42M12.5 41h39" stroke-width="1.6" opacity=".4"/>' +
    '<path d="M22 23v28M32 23v29M42 23v28" stroke-width="1.6" opacity=".3"/>' +
    '<rect x="6" y="17" width="52" height="7" rx="3.5" fill="var(--gb-rim-fill)"/>' +
    '</svg>';

  /* ======================================================================
     STRINGS — merged into the shared i18n dictionary
     ====================================================================== */
  var STRINGS = {
    /* prototype page chrome */
    'title.basket':          { vi: `Giỏ hàng (thử nghiệm) · Gem Chạm Sắc`, en: `Basket (prototype) · Gem Chạm Sắc` },
    'basketpage.eyebrow':    { vi: `Thử nghiệm`, en: `Prototype` },
    'basketpage.hero_title': { vi: `Chọn đồ, gom vào giỏ.`, en: `Pick what you love, gather it in the basket.` },
    'basketpage.hero_sub':   { vi: `Bấm <em>Thêm vào giỏ</em> — món đồ sẽ bay vào chiếc giỏ ở góc phải. Mở giỏ ra để xem mình đã chọn những gì, rồi đặt hàng hoặc nhắn cho chúng mình qua Zalo, Messenger, email.`, en: `Tap <em>Add to basket</em> — the piece flies into the little basket in the corner. Open it to see what you've gathered, then place an order or message us on Zalo, Messenger or email.` },

    'basket.title':         { vi: `Giỏ của bạn`, en: `Your basket` },
    'basket.open_aria':     { vi: `Mở giỏ hàng`, en: `Open basket` },
    'basket.close_aria':    { vi: `Đóng giỏ hàng`, en: `Close basket` },
    'basket.add':           { vi: `Thêm vào giỏ`, en: `Add to basket` },
    'basket.added':         { vi: `Đã thêm`, en: `Added` },
    'basket.empty_h':       { vi: `Giỏ còn trống.`, en: `Your basket is empty.` },
    'basket.empty_p':       { vi: `Chọn vài món bạn thương, chúng mình gói lại cho bạn.`, en: `Pick a few pieces you love — we'll wrap them up for you.` },
    'basket.remove_aria':   { vi: `Bỏ khỏi giỏ`, en: `Remove from basket` },
    'basket.minus_aria':    { vi: `Giảm một`, en: `Decrease by one` },
    'basket.plus_aria':     { vi: `Thêm một`, en: `Increase by one` },
    'basket.price_tbd':     { vi: `Liên hệ`, en: `Ask us` },
    'basket.from':          { vi: `từ`, en: `from` },
    'basket.has_range':     { vi: `Vài món có giá theo khoảng vì mỗi cái một mẫu vải khác nhau — chúng mình báo giá đúng khi nhắn lại nhé.`, en: `Some pieces have a price range because every one is made from different fabric — we'll confirm the exact price when we reply.` },
    'basket.all_unpriced':  { vi: `Chúng mình sẽ báo giá cho bạn khi nhắn lại nhé.`, en: `We'll quote you when we reply.` },
    'basket.some_unpriced': { vi: `Vài món chưa có giá trên web — chúng mình báo bạn khi nhắn lại nhé.`, en: `Some pieces aren't priced online yet — we'll let you know when we reply.` },
    'basket.subtotal':      { vi: `Tổng`, en: `Subtotal` },
    'basket.ship_note':     { vi: `Chưa gồm phí giao hàng — chúng mình báo bạn sau khi biết địa chỉ.`, en: `Shipping not included — we'll let you know once we have your address.` },
    'basket.order_btn':     { vi: `Đặt hàng`, en: `Place order` },
    'basket.chat_btn':      { vi: `Hỏi thêm qua chat`, en: `Ask us on chat` },
    'basket.back':          { vi: `Quay lại giỏ`, en: `Back to basket` },
    'basket.clear':         { vi: `Xoá hết`, en: `Clear all` },

    'basket.form_h':        { vi: `Để chúng mình gói và gửi cho bạn`, en: `So we can wrap it and send it to you` },
    'basket.f_name':        { vi: `Tên của bạn`, en: `Your name` },
    'basket.f_phone':       { vi: `Số điện thoại`, en: `Phone number` },
    'basket.f_addr':        { vi: `Địa chỉ nhận hàng`, en: `Delivery address` },
    'basket.f_note':        { vi: `Ghi chú (không bắt buộc)`, en: `Note (optional)` },
    'basket.f_note_ph':     { vi: `Màu bạn thích, gói quà, ngày cần nhận…`, en: `Colours you like, gift wrap, when you need it…` },
    'basket.f_pickup':      { vi: `Mình sẽ tự đến cửa hàng lấy`, en: `I'll pick it up at the store` },
    'basket.send':          { vi: `Gửi đơn cho Gem`, en: `Send order to Gem` },
    'basket.sending':       { vi: `Đang gửi...`, en: `Sending...` },
    'basket.required':      { vi: `Bạn điền giúp chúng mình tên và số điện thoại nhé.`, en: `Please fill in your name and phone number.` },

    'basket.chat_h':        { vi: `Bạn muốn nhắn qua đâu?`, en: `Where would you like to message us?` },
    'basket.chat_p':        { vi: `Chúng mình đã copy nội dung giỏ hàng — bạn chỉ cần dán vào cửa sổ chat là xong.`, en: `We've copied your basket — just paste it into the chat window.` },
    'basket.chat_email':    { vi: `Email`, en: `Email` },
    'basket.copied':        { vi: `Đã copy nội dung giỏ hàng.`, en: `Basket contents copied.` },

    'basket.done_h':        { vi: `Chúng mình nhận được rồi.`, en: `We've got it.` },
    'basket.done_p':        { vi: `Gem sẽ nhắn lại cho bạn trong hôm nay để xác nhận món và phí giao. Cảm ơn bạn đã chọn đồ của chúng mình.`, en: `Gem will message you back today to confirm the items and shipping. Thank you for choosing our pieces.` },
    'basket.code_label':    { vi: `MÃ ĐƠN`, en: `ORDER CODE` },
    'basket.out_of_stock':  { vi: `Tạm hết hàng`, en: `Out of stock` },

    'basket.pay_h':         { vi: `Cách trả tiền`, en: `How you'll pay` },
    'basket.pay_cod':       { vi: `Trả khi nhận hàng`, en: `Pay on delivery` },
    'basket.pay_cod_p':     { vi: `Đưa tiền cho người giao.`, en: `Hand the cash to the courier.` },
    'basket.pay_qr':        { vi: `Chuyển khoản QR`, en: `Bank transfer (QR)` },
    'basket.pay_qr_p':      { vi: `Quét mã, số tiền và mã đơn điền sẵn.`, en: `Scan the code — amount and order code are filled in.` },
    'basket.prepay_required': { vi: `Đơn này cần chuyển khoản trước. Bạn chọn “Chuyển khoản QR” giúp chúng mình nhé.`, en: `This order needs a transfer up front. Please choose “Bank transfer (QR)”.` },
    'basket.copy':          { vi: `Chép`, en: `Copy` },
    'basket.copied':        { vi: `Đã chép`, en: `Copied` },
    'basket.qr_bank':       { vi: `Ngân hàng`, en: `Bank` },
    'basket.qr_acc':        { vi: `Số tài khoản`, en: `Account number` },
    'basket.qr_name':       { vi: `Chủ tài khoản`, en: `Account name` },
    'basket.qr_amount':     { vi: `Số tiền`, en: `Amount` },
    'basket.qr_ref':        { vi: `Nội dung`, en: `Transfer note` },
    'basket.qr_save':       { vi: `Lưu ảnh QR`, en: `Save QR image` },
    'basket.qr_saving':     { vi: `Đang tạo ảnh…`, en: `Making the image…` },
    'basket.qr_save_failed':{ vi: `Chưa lưu được ảnh. Bạn chụp màn hình cũng được nhé.`, en: `Could not save the image — a screenshot works too.` },
    'basket.qr_hint':       { vi: `Đang xem trên chính điện thoại này? Bấm “Lưu ảnh QR” rồi mở app ngân hàng, chọn quét từ ảnh — hoặc bấm “Chép” rồi nhập tay.`, en: `Reading this on the same phone? Tap “Save QR image”, then open your banking app and scan from your photos — or tap “Copy” and type it in.` },
    'basket.done_qr_p':     { vi: `Chuyển xong bạn không cần báo lại — chúng mình thấy tiền về là nhắn cho bạn ngay.`, en: `No need to tell us once you've sent it — we'll message you as soon as the transfer lands.` },
    'basket.order_failed':  { vi: `Chưa gửi được đơn. Bạn nhắn Zalo cho chúng mình nhé.`, en: `We could not send the order. Please message us on Zalo.` },
    'basket.done_mail_p':   { vi: `Chúng mình vừa mở sẵn email cho bạn — bạn bấm Gửi trong app email là đơn về tới Gem nhé.`, en: `We've opened a pre-filled email for you — hit Send in your mail app and the order reaches Gem.` },
    'basket.done_btn':      { vi: `Xem tiếp sản phẩm`, en: `Keep browsing` },

    'basket.order_subject': { vi: `Đơn hàng mới từ website`, en: `New order from the website` },
    'basket.txt_order':     { vi: `ĐƠN HÀNG GEM CHẠM SẮC`, en: `GEM CHẠM SẮC ORDER` },
    'basket.txt_enquiry':   { vi: `Mình muốn hỏi về những món này:`, en: `I'd like to ask about these pieces:` },
    'basket.txt_total':     { vi: `Tổng`, en: `Total` },
    'basket.txt_name':      { vi: `Tên`, en: `Name` },
    'basket.txt_phone':     { vi: `SĐT`, en: `Phone` },
    'basket.txt_addr':      { vi: `Địa chỉ`, en: `Address` },
    'basket.txt_pickup':    { vi: `Tự đến cửa hàng lấy`, en: `Will pick up at the store` },
    'basket.txt_note':      { vi: `Ghi chú`, en: `Note` }
  };

  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STRINGS);

  function t(key, fallback) {
    if (window.GemI18n && typeof window.GemI18n.t === 'function') {
      var v = window.GemI18n.t(key);
      if (v != null) return v;
    }
    return fallback != null ? fallback : key;
  }

  /* ======================================================================
     STATE
     ====================================================================== */
  var STORAGE_KEY = 'gem-basket';
  var items = [];   // [{ sku, qty }]

  function bySku(sku) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].sku === sku) return CATALOG[i];
    }
    return null;
  }

  /* ---------- tên sản phẩm ----------
     16 món có sẵn dùng khoá i18n (`p.name` trỏ sang js/i18n.js). Món do em
     gái thêm qua trang quản trị thì không có khoá, chỉ có chữ thẳng trong
     database — nên hai chỗ hiện tên phải chịu được cả hai kiểu. */
  function isKey(p) { return !!(p.name && p.name.indexOf('.') > 0); }

  function pName(p) {
    if (isKey(p)) return t(p.name, p.sku);
    var en = (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en';
    return (en && p.nameEn) || p.nameVi || p.sku;
  }

  // Thuộc tính đánh dấu cho i18n, rỗng nếu tên là chữ thẳng.
  function nameAttr(p) {
    return isKey(p) ? ' data-i18n="' + p.name + '"' : '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- giá từ Supabase ----------
     CATALOG ở trên là bản dự phòng: nếu Supabase không trả lời (mất mạng,
     dịch vụ trục trặc) thì trang sản phẩm vẫn chạy với giá đã biết, thay vì
     trắng trơn. Khi database trả lời thì giá trong đó thắng — đó mới là chỗ
     em gái sửa giá. */
  function mergeFromDb(rows) {
    if (!rows || !rows.length) return false;
    var changed = false;
    rows.forEach(function (r) {
      var p = bySku(r.sku);
      if (!p) {
        // Món mới thêm qua trang quản trị: chưa có thẻ trên san-pham.html
        // nên chưa hiện được, nhưng vẫn nạp vào để không vỡ giỏ nếu có link.
        p = { sku: r.sku, name: null, sprite: r.sprite };
        CATALOG.push(p);
        changed = true;
      }
      p.price    = r.price;
      p.priceMax = r.price_max;
      p.nameVi   = r.name_vi;
      p.nameEn   = r.name_en;
      p.inStock  = r.in_stock !== false;
      if (r.sprite) p.sprite = r.sprite;
      changed = true;
    });
    return changed;
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      items = raw.filter(function (it) {
        return it && bySku(it.sku) && it.qty > 0;
      }).map(function (it) {
        return { sku: it.sku, qty: Math.min(99, Math.round(it.qty)) };
      });
    } catch (e) { items = []; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  }

  function count() {
    return items.reduce(function (n, it) { return n + it.qty; }, 0);
  }

  // Chỉ cộng những món đã có giá — món chưa chốt giá không được đoán thành 0đ
  function subtotal() {
    return items.reduce(function (sum, it) {
      var p = bySku(it.sku);
      return sum + (p && p.price != null ? p.price * it.qty : 0);
    }, 0);
  }

  function hasUnpriced() {
    return items.some(function (it) {
      var p = bySku(it.sku);
      return p && p.price == null;
    });
  }

  function money(n) {
    return n.toLocaleString('vi-VN') + 'đ';
  }

  // Nhiều món có giá theo khoảng (vd túi tái chế 120.000–200.000đ tuỳ mẫu),
  // vì mỗi cái làm từ vải khác nhau. priceMax có nghĩa là "từ price đến priceMax".
  function isRange(p) { return !!(p && p.price != null && p.priceMax != null); }

  function hasRange() {
    return items.some(function (it) { return isRange(bySku(it.sku)); });
  }

  // price == null nghĩa là chưa chốt giá → hiện "Liên hệ", không bịa ra con số.
  // Một cái giá đã đăng là một lời hứa; sai giá là phải chịu hoặc làm khách thất vọng.
  function priceLabel(p, qty) {
    if (!p || p.price == null) return t('basket.price_tbd', 'Liên hệ');
    var q = qty || 1;
    if (isRange(p)) {
      // một ký hiệu đ ở cuối, không phải hai: "120.000–200.000đ"
      return (p.price * q).toLocaleString('vi-VN') + '–' + money(p.priceMax * q);
    }
    return money(p.price * q);
  }

  // Tổng: món có khoảng giá thì cộng mức thấp nhất và ghi rõ là "từ".
  // Không được cộng mức cao nhất — sẽ doạ khách bằng một con số không có thật.
  function subtotalLabel() {
    var sum = subtotal();
    if (sum === 0 && hasUnpriced()) return t('basket.price_tbd', 'Liên hệ');
    if (hasRange() || hasUnpriced()) return t('basket.from', 'từ') + ' ' + money(sum);
    return money(sum);
  }

  // Chú thích dưới phần tổng, tuỳ theo còn món nào chưa có giá / có khoảng giá
  function unpricedNoteKey() {
    if (hasUnpriced()) {
      return subtotal() === 0 ? 'basket.all_unpriced' : 'basket.some_unpriced';
    }
    if (hasRange()) return 'basket.has_range';
    return null;
  }

  function addItem(sku) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].sku === sku) {
        items[i].qty = Math.min(99, items[i].qty + 1);
        save();
        return;
      }
    }
    items.push({ sku: sku, qty: 1 });
    save();
  }

  function setQty(sku, qty) {
    items = items.filter(function (it) {
      if (it.sku !== sku) return true;
      it.qty = qty;
      return qty > 0;
    });
    save();
  }

  // Flat list of sprites in the basket, one entry per unit
  function spriteQueue() {
    var out = [];
    items.forEach(function (it) {
      var p = bySku(it.sku);
      for (var i = 0; i < it.qty; i++) out.push(p);
    });
    return out;
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     DOM
     ====================================================================== */
  var widget, pile, badge, panel, panelBody, overlay, basketArt;
  var view = 'basket';   // basket | form | chat | done
  var doneMode = 'sent'; // sent | mailto
  var orderCode = null;  // mã đơn database trả về, hiện ở màn cảm ơn
  var orderPay = null;   // 'cod' | 'qr' — quyết định màn cảm ơn hiện gì
  var orderSum = 0;      // tổng đã chốt, để sinh QR đúng số tiền
  var PAY = null;        // cấu hình thanh toán đọc từ Supabase

  /* ---------- chọn cách trả tiền ----------
     Chỉ hiện khi đọc được cấu hình. Không đọc được thì bỏ qua phần này và
     đơn vẫn gửi được — em gái hỏi lại cách trả tiền qua Zalo như trước. */
  function payChoiceHTML() {
    if (!PAY) return '';
    var cod = PAY.cod_enabled !== false;
    var qr  = PAY.qr_enabled  !== false;
    if (!cod && !qr) return '';

    function opt(val, key, fallback, hintKey, hintFallback, checked) {
      return '<label class="gb-pay-opt">' +
        '<input type="radio" name="pay" value="' + val + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="gb-pay-text">' +
          '<b data-i18n="' + key + '">' + fallback + '</b>' +
          '<small data-i18n="' + hintKey + '">' + hintFallback + '</small>' +
        '</span>' +
      '</label>';
    }

    return '<fieldset class="gb-pay">' +
      '<legend data-i18n="basket.pay_h">Cách trả tiền</legend>' +
      (cod ? opt('cod', 'basket.pay_cod', 'Trả khi nhận hàng',
                 'basket.pay_cod_p', 'Đưa tiền cho người giao.', qr ? true : true) : '') +
      (qr  ? opt('qr', 'basket.pay_qr', 'Chuyển khoản QR',
                 'basket.pay_qr_p', 'Quét mã, số tiền và mã đơn điền sẵn.', !cod) : '') +
    '</fieldset>';
  }

  function buildWidget() {
    widget = document.createElement('button');
    widget.type = 'button';
    widget.className = 'gb-widget';
    widget.setAttribute('data-i18n-attr', 'aria-label:basket.open_aria');
    widget.setAttribute('aria-label', t('basket.open_aria', 'Mở giỏ hàng'));
    widget.innerHTML =
      '<span class="gb-basket-art">' +
        '<span class="gb-layer gb-layer-back">' + BASKET_BACK + '</span>' +
        '<span class="gb-pile"></span>' +
        '<span class="gb-layer gb-layer-front">' + BASKET_FRONT + '</span>' +
      '</span>' +
      '<span class="gb-badge" aria-hidden="true">0</span>';
    document.body.appendChild(widget);

    pile = widget.querySelector('.gb-pile');
    badge = widget.querySelector('.gb-badge');
    basketArt = widget.querySelector('.gb-basket-art');

    widget.addEventListener('click', openPanel);
  }

  function buildPanel() {
    overlay = document.createElement('div');
    overlay.className = 'gb-overlay';
    overlay.addEventListener('click', closePanel);
    document.body.appendChild(overlay);

    panel = document.createElement('div');
    panel.className = 'gb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('data-i18n-attr', 'aria-label:basket.title');
    panel.innerHTML =
      '<div class="gb-panel-head">' +
        '<h2 class="gb-panel-title" data-i18n="basket.title">Giỏ của bạn</h2>' +
        '<button type="button" class="gb-close" data-i18n-attr="aria-label:basket.close_aria" ' +
          'aria-label="Đóng giỏ hàng">&times;</button>' +
      '</div>' +
      '<div class="gb-panel-body"></div>';
    document.body.appendChild(panel);

    panelBody = panel.querySelector('.gb-panel-body');
    panel.querySelector('.gb-close').addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });
  }

  /* ---------- basket widget rendering ---------- */

  // Deterministic pseudo-random in [0,1) so the pile doesn't reshuffle on every render
  function jitter(i, seed) {
    var x = Math.sin((i + 1) * seed) * 10000;
    return x - Math.floor(x);
  }

  var prevCount = 0;

  function renderPile() {
    var queue = spriteQueue();
    var shown = queue.slice(-CONFIG.maxSpritesInBasket);
    var hidden = queue.length - shown.length;
    // The pile is rebuilt wholesale, so only the item that just arrived should
    // animate — otherwise the whole pile re-drops on every add.
    var grew = queue.length > prevCount;
    prevCount = queue.length;

    pile.innerHTML = '';
    shown.forEach(function (p, i) {
      var s = document.createElement('span');
      s.className = 'gb-pile-item' +
        (grew && i === shown.length - 1 ? ' is-new' : '');
      s.innerHTML = SPRITES[p.sprite] || '';
      // 3 across, stacking upward, nudged off-grid so the pile looks hand-tossed
      var col = i % 3, row = Math.floor(i / 3);
      s.style.left = (col * 29 + jitter(i, 12.9898) * 4) + '%';
      s.style.bottom = (row * 18 + jitter(i, 78.233) * 5) + '%';
      s.style.transform = 'rotate(' + ((jitter(i, 43.7585) - 0.5) * 34).toFixed(1) + 'deg)';
      s.style.zIndex = String(10 + i);
      pile.appendChild(s);
    });

    // "+N" goes on the basket art, not in the pile: .gb-pile is its own stacking
    // context sitting below the front rim, so anything inside it would be hidden.
    var oldMore = basketArt.querySelector('.gb-pile-more');
    if (oldMore) basketArt.removeChild(oldMore);
    if (hidden > 0) {
      var more = document.createElement('span');
      more.className = 'gb-pile-more';
      more.textContent = '+' + hidden;
      basketArt.appendChild(more);
    }
  }

  function renderWidget() {
    var n = count();
    badge.textContent = String(n);
    widget.classList.toggle('has-items', n > 0);
    renderPile();
  }

  function wiggle() {
    if (reduceMotion) return;
    basketArt.classList.remove('gb-wiggle');
    void basketArt.offsetWidth;   // restart the animation
    basketArt.classList.add('gb-wiggle');
  }

  /* ---------- fly-to-basket ---------- */
  function fly(sourceEl, spriteKey, done) {
    if (reduceMotion || !sourceEl || typeof Element.prototype.animate !== 'function') {
      done();
      return;
    }

    var from = sourceEl.getBoundingClientRect();
    var to = basketArt.getBoundingClientRect();
    var size = 56;

    var ghost = document.createElement('span');
    ghost.className = 'gb-ghost';
    ghost.innerHTML = SPRITES[spriteKey] || '';
    ghost.style.width = ghost.style.height = size + 'px';
    ghost.style.left = (from.left + from.width / 2 - size / 2) + 'px';
    ghost.style.top = (from.top + from.height / 2 - size / 2) + 'px';
    document.body.appendChild(ghost);

    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height * 0.62) - (from.top + from.height / 2);
    var lift = Math.min(150, Math.abs(dx) * 0.3 + 70);

    var anim = ghost.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - lift) + 'px) scale(.8) rotate(-14deg)',
        opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3) rotate(12deg)', opacity: 0.85 }
    ], { duration: 640, easing: 'cubic-bezier(.36,.62,.28,1)' });

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      done();
    }
    anim.addEventListener('finish', finish);
    setTimeout(finish, 900);   // safety net if the animation never fires
  }

  /* ---------- panel views ---------- */

  function openPanel() {
    if (view === 'done') view = 'basket';
    renderPanel();
    panel.classList.add('open');
    overlay.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gb-lock');
    panel.querySelector('.gb-close').focus();
  }

  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gb-lock');
    widget.focus();
  }

  function renderPanel() {
    if (view === 'form') return renderForm();
    if (view === 'chat') return renderChat();
    if (view === 'done') return renderDone();
    renderBasketView();
  }

  function renderBasketView() {
    if (!items.length) {
      panelBody.innerHTML =
        '<div class="gb-empty">' +
          '<img src="images/mascot/udon_sit_stare.png" alt="Udon" class="gb-empty-udon">' +
          '<p class="gb-empty-h" data-i18n="basket.empty_h">Giỏ còn trống.</p>' +
          '<p class="gb-empty-p" data-i18n="basket.empty_p">Chọn vài món bạn thương, chúng mình gói lại cho bạn.</p>' +
        '</div>';
      translate();
      return;
    }

    var rows = items.map(function (it) {
      var p = bySku(it.sku);
      return '<li class="gb-row" data-sku="' + p.sku + '">' +
        '<span class="gb-row-sprite">' + (SPRITES[p.sprite] || '') + '</span>' +
        '<span class="gb-row-text">' +
          '<span class="gb-row-name"' + nameAttr(p) + '>' +
            (isKey(p) ? '' : esc(pName(p))) + '</span>' +
          // unit price only earns its line once there's more than one
          '<span class="gb-row-price">' +
            (it.qty > 1 ? priceLabel(p) + ' × ' + it.qty : '') +
          '</span>' +
        '</span>' +
        '<span class="gb-stepper">' +
          '<button type="button" class="gb-step" data-act="minus" ' +
            'data-i18n-attr="aria-label:basket.minus_aria">&minus;</button>' +
          '<span class="gb-qty">' + it.qty + '</span>' +
          '<button type="button" class="gb-step" data-act="plus" ' +
            'data-i18n-attr="aria-label:basket.plus_aria">+</button>' +
        '</span>' +
        '<span class="gb-row-total">' + priceLabel(p, it.qty) + '</span>' +
        '<button type="button" class="gb-row-remove" data-act="remove" ' +
          'data-i18n-attr="aria-label:basket.remove_aria">&times;</button>' +
      '</li>';
    }).join('');

    panelBody.innerHTML =
      '<ul class="gb-rows">' + rows + '</ul>' +
      '<div class="gb-sum">' +
        '<span data-i18n="basket.subtotal">Tổng</span>' +
        '<strong>' + subtotalLabel() + '</strong>' +
      '</div>' +
      (unpricedNoteKey()
        ? '<p class="gb-fine" data-i18n="' + unpricedNoteKey() + '"></p>'
        : '') +
      '<p class="gb-fine" data-i18n="basket.ship_note"></p>' +
      '<div class="gb-actions">' +
        '<button type="button" class="btn btn-primary gb-go-form" data-i18n="basket.order_btn">Đặt hàng</button>' +
        '<button type="button" class="btn btn-ghost gb-go-chat" data-i18n="basket.chat_btn">Hỏi thêm qua chat</button>' +
      '</div>' +
      '<button type="button" class="gb-clear" data-i18n="basket.clear">Xoá hết</button>';

    panelBody.querySelectorAll('.gb-row').forEach(function (row) {
      var sku = row.getAttribute('data-sku');
      row.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        var cur = 0;
        items.forEach(function (it) { if (it.sku === sku) cur = it.qty; });
        if (act === 'plus') setQty(sku, Math.min(99, cur + 1));
        else if (act === 'minus') setQty(sku, cur - 1);
        else if (act === 'remove') setQty(sku, 0);
        renderWidget();
        renderBasketView();
      });
    });

    panelBody.querySelector('.gb-go-form').addEventListener('click', function () {
      view = 'form'; renderPanel();
    });
    panelBody.querySelector('.gb-go-chat').addEventListener('click', function () {
      view = 'chat'; renderPanel();
    });
    panelBody.querySelector('.gb-clear').addEventListener('click', function () {
      items = []; save(); renderWidget(); renderBasketView();
    });

    translate();
  }

  function renderForm() {
    panelBody.innerHTML =
      '<button type="button" class="gb-back" data-i18n="basket.back">Quay lại giỏ</button>' +
      '<p class="gb-form-h" data-i18n="basket.form_h"></p>' +
      '<form class="gb-form" novalidate>' +
        '<label class="gb-field">' +
          '<span data-i18n="basket.f_name">Tên của bạn</span>' +
          '<input type="text" name="name" autocomplete="name" required>' +
        '</label>' +
        '<label class="gb-field">' +
          '<span data-i18n="basket.f_phone">Số điện thoại</span>' +
          '<input type="tel" name="phone" autocomplete="tel" required>' +
        '</label>' +
        '<label class="gb-check">' +
          '<input type="checkbox" name="pickup">' +
          '<span data-i18n="basket.f_pickup">Mình sẽ tự đến cửa hàng lấy</span>' +
        '</label>' +
        '<label class="gb-field gb-addr">' +
          '<span data-i18n="basket.f_addr">Địa chỉ nhận hàng</span>' +
          '<input type="text" name="address" autocomplete="street-address">' +
        '</label>' +
        '<label class="gb-field">' +
          '<span data-i18n="basket.f_note">Ghi chú (không bắt buộc)</span>' +
          '<textarea name="note" rows="2" data-i18n-attr="placeholder:basket.f_note_ph"></textarea>' +
        '</label>' +
        payChoiceHTML() +
        '<div class="gb-sum gb-sum-tight">' +
          '<span data-i18n="basket.subtotal">Tổng</span>' +
          '<strong>' + subtotalLabel() + '</strong>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary gb-submit" data-i18n="basket.send">Gửi đơn cho Gem</button>' +
        '<p class="gb-err" hidden></p>' +
      '</form>';

    var form = panelBody.querySelector('.gb-form');
    var pickup = form.querySelector('[name="pickup"]');
    var addrField = form.querySelector('.gb-addr');

    function syncAddr() { addrField.hidden = pickup.checked; }
    pickup.addEventListener('change', syncAddr);
    syncAddr();

    // Đơn to thì khoá COD lại ngay trên giao diện, đừng để khách chọn xong
    // rồi mới bị từ chối lúc gửi.
    var codInput = form.querySelector('[name="pay"][value="cod"]');
    if (codInput) {
      var thresh = (PAY && PAY.prepay_threshold) || 0;
      var over = thresh > 0 && subtotal() >= thresh;
      codInput.disabled = over;
      var codLabel = codInput.closest('.gb-pay-opt');
      if (codLabel) codLabel.classList.toggle('is-off', over);
      if (over) {
        var qrInput = form.querySelector('[name="pay"][value="qr"]');
        if (qrInput) qrInput.checked = true;
      }
    }

    panelBody.querySelector('.gb-back').addEventListener('click', function () {
      view = 'basket'; renderPanel();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitOrder(form);
    });

    translate();
  }

  function renderChat() {
    var zalo = 'https://zalo.me/' + CONFIG.zaloPhone;
    var mess = 'https://m.me/' + CONFIG.messengerHandle;

    panelBody.innerHTML =
      '<button type="button" class="gb-back" data-i18n="basket.back">Quay lại giỏ</button>' +
      '<p class="gb-form-h" data-i18n="basket.chat_h"></p>' +
      '<p class="gb-fine" data-i18n="basket.chat_p"></p>' +
      '<div class="gb-channels">' +
        '<a class="gb-channel" href="' + zalo + '" target="_blank" rel="noopener" data-copy="1">' +
          '<span class="gb-channel-mark">Zalo</span><span>Zalo</span></a>' +
        '<a class="gb-channel" href="' + mess + '" target="_blank" rel="noopener" data-copy="1">' +
          '<span class="gb-channel-mark">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>' +
          '</span><span>Messenger</span></a>' +
        '<a class="gb-channel gb-channel-mail" href="#">' +
          '<span class="gb-channel-mark">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>' +
            '<path d="M22 6l-10 7L2 6"/></svg>' +
          '</span><span data-i18n="basket.chat_email">Email</span></a>' +
      '</div>' +
      '<p class="gb-copied" hidden data-i18n="basket.copied"></p>';

    panelBody.querySelector('.gb-back').addEventListener('click', function () {
      view = 'basket'; renderPanel();
    });

    // Zalo and Messenger can't take a pre-filled message via URL, so the basket
    // goes to the clipboard and the customer pastes it into the chat.
    panelBody.querySelectorAll('.gb-channel[data-copy]').forEach(function (a) {
      a.addEventListener('click', function () {
        copyText(orderText({ enquiry: true }));
        var note = panelBody.querySelector('.gb-copied');
        if (note) note.hidden = false;
      });
    });

    // Built on click so the body picks up the language selected right now
    panelBody.querySelector('.gb-channel-mail').addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'mailto:' + CONFIG.shopEmail +
        '?subject=' + encodeURIComponent(t('basket.order_subject', 'Đơn hàng mới từ website')) +
        '&body=' + encodeURIComponent(orderText({ enquiry: true }));
    });

    translate();
  }

  /* ---------- màn chuyển khoản ----------
     Khách thường mở web trên chính điện thoại của mình, nên không quét được
     mã hiện trên màn hình đó. Vì vậy luôn kèm số tài khoản + số tiền + mã đơn
     ở dạng bấm-là-chép, và nhắc họ có thể chụp màn hình rồi quét từ ảnh. */
  // shown = chữ cho người đọc, copied = chữ chép vào app ngân hàng.
  // Số tiền hiện "185.000đ" cho dễ đọc nhưng chép ra "185000" — app ngân hàng
  // không nhận dấu chấm và chữ đ.
  function copyRow(label, shown, copied, big) {
    return '<div class="gb-pay-row">' +
      '<span class="gb-pay-k">' + esc(label) + '</span>' +
      '<span class="gb-pay-v' + (big ? ' big' : '') + '">' + esc(shown) + '</span>' +
      '<button type="button" class="gb-copy" data-copy="' + esc(copied == null ? shown : copied) + '" ' +
        'data-i18n="basket.copy">Chép</button>' +
    '</div>';
  }

  function renderQrPay() {
    var qrSvg = '';
    try {
      qrSvg = window.GemVietQR.svg(window.GemVietQR.payload({
        bin: PAY.bank_bin,
        account: PAY.account_no,
        amount: orderSum > 0 ? orderSum : null,
        ref: orderCode
      }), { ecl: 'M' });
    } catch (e) { qrSvg = ''; }

    return '<div class="gb-qr-wrap">' +
      (qrSvg ? '<div class="gb-qr">' + qrSvg + '</div>' : '') +
      (qrSvg ? '<button type="button" class="btn btn-ghost gb-save-qr" ' +
               'data-i18n="basket.qr_save">Lưu ảnh QR</button>' : '') +
      '<div class="gb-pay-rows">' +
        copyRow(t('basket.qr_bank', 'Ngân hàng'), PAY.bank_name) +
        copyRow(t('basket.qr_acc', 'Số tài khoản'), PAY.account_no) +
        copyRow(t('basket.qr_name', 'Chủ tài khoản'), PAY.account_name) +
        (orderSum > 0
          ? copyRow(t('basket.qr_amount', 'Số tiền'), money(orderSum), String(orderSum), true)
          : '') +
        copyRow(t('basket.qr_ref', 'Nội dung'), orderCode, orderCode, true) +
      '</div>' +
      '<p class="gb-qr-hint" data-i18n="basket.qr_hint"></p>' +
    '</div>';
  }

  function renderDone() {
    panelBody.innerHTML =
      '<div class="gb-empty">' +
        '<img src="images/mascot/udon_sit_happy.png" alt="Udon" class="gb-empty-udon">' +
        '<p class="gb-empty-h" data-i18n="basket.done_h"></p>' +
        // Mã đơn để khách nhắn Zalo hỏi cho nhanh — cùng cách dùng như mã
        // giữ chỗ workshop. Chỉ có khi đơn vào được database.
        (orderCode
          ? '<p class="gb-code-label" data-i18n="basket.code_label"></p>' +
            '<p class="gb-code">' + esc(orderCode) + '</p>'
          : '') +
        (orderPay === 'qr' && PAY && orderCode ? renderQrPay() : '') +
        '<p class="gb-empty-p" data-i18n="' +
          (doneMode === 'mailto' ? 'basket.done_mail_p'
            : orderPay === 'qr' ? 'basket.done_qr_p' : 'basket.done_p') + '"></p>' +
        '<button type="button" class="btn btn-primary gb-done-btn" data-i18n="basket.done_btn"></button>' +
      '</div>';

    /* Lưu ảnh QR về máy để đưa thẳng vào app ngân hàng.
       Trên iPhone, nút tải xuống thường lưu vào Tệp chứ không vào Ảnh, mà app
       ngân hàng lại đọc từ Ảnh — nên nếu máy có sẵn bảng chia sẻ thì dùng nó,
       vì bảng đó có "Lưu vào Ảnh". Máy nào không có thì tải xuống như thường. */
    var saveBtn = panelBody.querySelector('.gb-save-qr');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var was = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = t('basket.qr_saving', 'Đang tạo ảnh…');

      window.GemVietQR.png(window.GemVietQR.payload({
        bin: PAY.bank_bin,
        account: PAY.account_no,
        amount: orderSum > 0 ? orderSum : null,
        ref: orderCode
      }), { ecl: 'M', scale: 12 }).then(function (blob) {
        var name = 'gem-' + (orderCode || 'qr') + '.png';
        var file = null;
        try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { /* trình duyệt cũ */ }

        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file] }).catch(function () { /* khách bấm huỷ */ });
        }
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { window.URL.revokeObjectURL(url); }, 2000);
      }).catch(function () {
        err(t('basket.qr_save_failed', 'Chưa lưu được ảnh. Bạn chụp màn hình cũng được nhé.'));
      }).then(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = was;
      });

      function err(msg) {
        var p = panelBody.querySelector('.gb-qr-hint');
        if (p) { p.textContent = msg; p.removeAttribute('data-i18n'); }
      }
    });

    panelBody.querySelectorAll('.gb-copy').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-copy');
        var done = function () {
          b.classList.add('is-copied');
          b.textContent = t('basket.copied', 'Đã chép');
          setTimeout(function () {
            b.classList.remove('is-copied');
            b.textContent = t('basket.copy', 'Chép');
          }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(v).then(done, function () { /* im lặng */ });
        } else {
          // Safari cũ và WebView trong app không có clipboard API
          var ta = document.createElement('textarea');
          ta.value = v; ta.setAttribute('readonly', '');
          ta.style.position = 'absolute'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) { /* im lặng */ }
          document.body.removeChild(ta);
        }
      });
    });

    panelBody.querySelector('.gb-done-btn').addEventListener('click', closePanel);
    translate();
  }

  /* ---------- order composition & sending ---------- */

  function orderText(opts) {
    opts = opts || {};
    var lines = [];
    lines.push(opts.enquiry ? t('basket.txt_enquiry', '') : t('basket.txt_order', ''));
    lines.push('———');
    items.forEach(function (it, i) {
      var p = bySku(it.sku);
      lines.push((i + 1) + '. ' + pName(p) + ' × ' + it.qty +
        ' — ' + priceLabel(p, it.qty));
    });
    lines.push('———');
    lines.push(t('basket.txt_total', 'Tổng') + ': ' + subtotalLabel());

    if (opts.customer) {
      var c = opts.customer;
      lines.push('');
      lines.push(t('basket.txt_name', 'Tên') + ': ' + c.name);
      lines.push(t('basket.txt_phone', 'SĐT') + ': ' + c.phone);
      lines.push(c.pickup
        ? t('basket.txt_pickup', '')
        : t('basket.txt_addr', 'Địa chỉ') + ': ' + (c.address || '—'));
      if (c.note) lines.push(t('basket.txt_note', 'Ghi chú') + ': ' + c.note);
    }

    lines.push('');
    lines.push('— gemchamsac.com');
    return lines.join('\n');
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

  function submitOrder(form) {
    // form.elements[...] rather than form[...] — HTMLFormElement has its own
    // `name` property, which would shadow the input named "name".
    var f = form.elements;
    var customer = {
      name: f['name'].value.trim(),
      phone: f['phone'].value.trim(),
      address: f['address'].value.trim(),
      note: f['note'].value.trim(),
      pickup: f['pickup'].checked
    };
    var err = panelBody.querySelector('.gb-err');

    if (!customer.name || !customer.phone) {
      err.textContent = t('basket.required', '');
      err.hidden = false;
      return;
    }
    err.hidden = true;

    var body = orderText({ customer: customer });
    var subject = t('basket.order_subject', 'Đơn hàng mới từ website') +
      ' — ' + count() + ' món';
    var submitBtn = form.querySelector('.gb-submit');

    function finish(mode) {
      doneMode = mode;
      items = []; save(); renderWidget();
      view = 'done'; renderPanel();
    }

    function fail(msg) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('basket.send', 'Gửi đơn cho Gem');
      err.textContent = msg || t('common.ml_error',
        'Có lỗi xảy ra. Bạn thử lại sau giúp chúng mình nhé.');
      err.hidden = false;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('basket.sending', 'Đang gửi...');

    // Đơn vào thẳng database để em gái xem trong trang quản trị. Chỉ gửi sku
    // và số lượng — giá do database tự tra, không gửi giá từ trình duyệt lên.
    if (window.GemDB && window.GemDB.createOrder) {
      var picked = form.querySelector('[name="pay"]:checked');
      window.GemDB.createOrder({
        name: customer.name,
        phone: customer.phone,
        address: customer.pickup ? t('basket.txt_pickup', 'Nhận tại cửa hàng') : customer.address,
        note: customer.note,
        payment: picked ? picked.value : null,
        items: items.map(function (it) { return { sku: it.sku, qty: it.qty }; })
      }).then(function (res) {
        if (res && res.ok) {
          orderCode = res.code;
          orderPay = res.payment_method;
          orderSum = res.subtotal || 0;
          finish('sent');
          return;
        }
        if (res && res.error === 'prepay_required') {
          return fail(t('basket.prepay_required',
            'Đơn này cần chuyển khoản trước. Bạn chọn “Chuyển khoản QR” giúp chúng mình nhé.'));
        }
        fail(t('basket.order_failed', 'Chưa gửi được đơn. Bạn nhắn Zalo cho chúng mình nhé.'));
      }).catch(function () {
        // Mất mạng giữa chừng: không nuốt đơn của khách, đưa sang app email
        // để họ vẫn gửi được. Giỏ hàng giữ nguyên nếu họ đổi ý.
        window.location.href = 'mailto:' + CONFIG.shopEmail +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        finish('mailto');
      });
      return;
    }

    // Không nạp được gem-db.js: vẫn gửi được đơn qua app email.
    window.location.href = 'mailto:' + CONFIG.shopEmail +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    finish('mailto');
  }

  /* ---------- helpers ---------- */

  // Re-run the shared i18n pass over freshly injected markup
  function translate() {
    if (window.GemI18n) window.GemI18n.setLang(window.GemI18n.getLang());
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-sku]'));
    if (!cards.length) return;

    load();
    buildWidget();
    buildPanel();
    renderWidget();

    cards.forEach(function (card) {
      var sku = card.getAttribute('data-sku');
      var product = bySku(sku);
      if (!product) return;

      // Price line + add button, so the page markup stays free of prototype bits
      var slot = card.querySelector('.gb-slot');
      if (!slot) return;
      slot.innerHTML =
        '<span class="gb-price">' + priceLabel(product) + '</span>' +
        '<button type="button" class="gb-add" data-i18n="basket.add">Thêm vào giỏ</button>';

      var btn = slot.querySelector('.gb-add');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();   // don't trigger the product lightbox behind it

        var source = card.querySelector('.product-card-image') || card;
        fly(source, product.sprite, function () {
          addItem(sku);
          renderWidget();
          wiggle();
          if (panel.classList.contains('open') && view === 'basket') renderBasketView();
        });

        btn.classList.add('is-added');
        btn.textContent = t('basket.added', 'Đã thêm');
        setTimeout(function () {
          btn.classList.remove('is-added');
          btn.textContent = t('basket.add', 'Thêm vào giỏ');
        }, 1100);
      });
    });

    translate();
    // No gem:langchange listener here on purpose: every injected string carries a
    // data-i18n attribute, so the shared i18n pass retranslates the panel in
    // place. Re-rendering from that event would loop, since render calls
    // translate() which fires the event again.

    /* ---------- giá thật từ Supabase ----------
       Vẽ ngay bằng CATALOG trước cho trang hiện tức thì, rồi cập nhật khi
       database trả lời. Giá hiếm khi đổi nên thường không thấy nhấp nháy gì;
       còn nếu Supabase không trả lời thì trang vẫn đủ dùng, không trắng. */
    if (window.GemDB && window.GemDB.products) {
      window.GemDB.products().then(function (rows) {
        if (!mergeFromDb(rows)) return;

        var live = {};
        (rows || []).forEach(function (r) { live[r.sku] = r; });

        cards.forEach(function (card) {
          var sku = card.getAttribute('data-sku');
          var p = bySku(sku);
          var slot = card.querySelector('.gb-slot');
          if (!p || !slot) return;

          // Món bị gỡ khỏi bảng, hoặc bị ẩn đi: giấu luôn thẻ, đừng để khách
          // đặt thứ cửa hàng không còn bán.
          if (!live[sku]) { card.hidden = true; return; }

          var priceEl = slot.querySelector('.gb-price');
          if (priceEl) priceEl.textContent = priceLabel(p);

          var addBtn = slot.querySelector('.gb-add');
          if (addBtn) {
            var out = p.inStock === false;
            addBtn.disabled = out;
            addBtn.classList.toggle('is-out', out);
            if (out) {
              addBtn.removeAttribute('data-i18n');
              addBtn.textContent = t('basket.out_of_stock', 'Tạm hết hàng');
            }
          }
        });

        // Giỏ đang có món vừa bị gỡ/ẩn thì bỏ ra, kẻo đặt đơn sẽ lỗi sku.
        var before = items.length;
        items = items.filter(function (it) { return live[it.sku]; });
        if (items.length !== before) { save(); }
        renderWidget();
        if (panel.classList.contains('open') && view === 'basket') renderBasketView();
      }).catch(function () { /* giữ nguyên giá dự phòng */ });

      // Cấu hình thanh toán. Không đọc được thì form bỏ phần chọn cách trả
      // tiền, đơn vẫn gửi bình thường — em gái hỏi lại qua Zalo như trước.
      if (window.GemDB.paymentSettings) {
        window.GemDB.paymentSettings().then(function (cfg) {
          PAY = cfg;
          if (panel.classList.contains('open') && view === 'form') renderPanel();
        }).catch(function () { /* không có thì thôi */ });
      }
    }
  });
})();
