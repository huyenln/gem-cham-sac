// Gem Chạm Sắc — giỏ hàng tương tác (PROTOTYPE)
//
// A floating basket in the corner. Clicking "thêm vào giỏ" on a product sends a
// hand-drawn sprite of that product flying into the basket, where it stacks up
// visibly. Opening the basket shows the items, quantities and a subtotal, then
// either sends the order to the shop email or hands it over to Zalo/Messenger.
//
// Self-contained: builds its own DOM, so a page only needs
//   <link rel="stylesheet" href="css/basket.css">
//   <script src="js/basket.js" defer></script>
// plus data-sku="<id>" on each .product-card and a .gb-add button inside it.
//
// No backend. State lives in localStorage['gem-basket'].

(function () {
  'use strict';

  /* ======================================================================
     CONFIG — Anna: đây là phần cần sửa
     ====================================================================== */
  var CONFIG = {
    // TODO: đổi sang email chính thức của shop. Đang tạm dùng email của Huyền
    // để prototype gửi được ngay mà không gửi lạc vào hộp thư người khác.
    shopEmail: 'lgnhuyen@gmail.com',

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
     ⚠️  GIÁ DƯỚI ĐÂY LÀ SỐ TẠM — CHƯA PHẢI GIÁ THẬT.
     Anna điền giá thật vào cột `price` (đơn vị: đồng, không dấu chấm).
     `name`/`desc` trỏ sang key i18n có sẵn trong js/i18n.js nên tên sản phẩm
     tự động đúng theo ngôn ngữ đang chọn.
     Quần áo 2hand cố tình để ngoài — mỗi món là một cái riêng, cần dữ liệu
     từng món trước khi cho vào giỏ được.
     ====================================================================== */
  var CATALOG = [
    { sku: 'origami',    name: 'products.origami_h',   desc: 'products.origami_p',   price: 150000, sprite: 'pouch' },
    { sku: 'oxford',     name: 'products.oxford_h',    desc: 'products.oxford_p',    price: 180000, sprite: 'shirt' },
    { sku: 'denim',      name: 'products.denim_h',     desc: 'products.denim_p',     price: 220000, sprite: 'denim' },
    { sku: 'bloom',      name: 'products.bloom_h',     desc: 'products.bloom_p',     price: 45000,  sprite: 'bloom' },
    { sku: 'tuibut',     name: 'products.tuibut_h',    desc: 'products.tuibut_p',    price: 85000,  sprite: 'pencase' },
    { sku: 'bookmark',   name: 'products.bookmark_h',  desc: 'products.bookmark_p',  price: 25000,  sprite: 'bookmark' },
    { sku: 'biaso',      name: 'products.biaso_h',     desc: 'products.biaso_p',     price: 120000, sprite: 'journal' },
    { sku: 'daydeo',     name: 'products.daydeo_h',    desc: 'products.daydeo_p',    price: 35000,  sprite: 'strap' },
    { sku: 'scrunchie',  name: 'products.scrunchie_h', desc: 'products.scrunchie_p', price: 30000,  sprite: 'scrunchie' },
    { sku: 'lotcoc',     name: 'products.lotcoc_h',    desc: 'products.lotcoc_p',    price: 40000,  sprite: 'coaster' },
    { sku: 'goi',        name: 'products.goi_h',       desc: 'products.goi_p',       price: 250000, sprite: 'pillow' },
    { sku: 'tham',       name: 'products.tham_h',      desc: 'products.tham_p',      price: 320000, sprite: 'rug' },
    { sku: 'so-kraft',   name: 'products.pv1_h',       desc: 'products.pv1_p',       price: 65000,  sprite: 'spiral' },
    { sku: 'so-khau',    name: 'products.sokhau_h',    desc: 'products.sokhau_p',    price: 95000,  sprite: 'stitched' },
    { sku: 'gom',        name: 'products.cgom_h',      desc: 'products.cgom_p',      price: 130000, sprite: 'ceramic' },
    { sku: 'set-qua',    name: 'products.setqua_h',    desc: 'products.setqua_p',    price: 280000, sprite: 'gift' }
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

  function subtotal() {
    return items.reduce(function (sum, it) {
      var p = bySku(it.sku);
      return sum + (p ? p.price * it.qty : 0);
    }, 0);
  }

  function money(n) {
    return n.toLocaleString('vi-VN') + 'đ';
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
          '<span class="gb-row-name" data-i18n="' + p.name + '"></span>' +
          // unit price only earns its line once there's more than one
          '<span class="gb-row-price">' +
            (it.qty > 1 ? money(p.price) + ' × ' + it.qty : '') +
          '</span>' +
        '</span>' +
        '<span class="gb-stepper">' +
          '<button type="button" class="gb-step" data-act="minus" ' +
            'data-i18n-attr="aria-label:basket.minus_aria">&minus;</button>' +
          '<span class="gb-qty">' + it.qty + '</span>' +
          '<button type="button" class="gb-step" data-act="plus" ' +
            'data-i18n-attr="aria-label:basket.plus_aria">+</button>' +
        '</span>' +
        '<span class="gb-row-total">' + money(p.price * it.qty) + '</span>' +
        '<button type="button" class="gb-row-remove" data-act="remove" ' +
          'data-i18n-attr="aria-label:basket.remove_aria">&times;</button>' +
      '</li>';
    }).join('');

    panelBody.innerHTML =
      '<ul class="gb-rows">' + rows + '</ul>' +
      '<div class="gb-sum">' +
        '<span data-i18n="basket.subtotal">Tổng</span>' +
        '<strong>' + money(subtotal()) + '</strong>' +
      '</div>' +
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
        '<div class="gb-sum gb-sum-tight">' +
          '<span data-i18n="basket.subtotal">Tổng</span>' +
          '<strong>' + money(subtotal()) + '</strong>' +
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

  function renderDone() {
    panelBody.innerHTML =
      '<div class="gb-empty">' +
        '<img src="images/mascot/udon_sit_happy.png" alt="Udon" class="gb-empty-udon">' +
        '<p class="gb-empty-h" data-i18n="basket.done_h"></p>' +
        '<p class="gb-empty-p" data-i18n="' +
          (doneMode === 'mailto' ? 'basket.done_mail_p' : 'basket.done_p') + '"></p>' +
        '<button type="button" class="btn btn-primary gb-done-btn" data-i18n="basket.done_btn"></button>' +
      '</div>';
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
      lines.push((i + 1) + '. ' + t(p.name, p.sku) + ' × ' + it.qty +
        ' — ' + money(p.price * it.qty));
    });
    lines.push('———');
    lines.push(t('basket.txt_total', 'Tổng') + ': ' + money(subtotal()));

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

    if (!CONFIG.orderEndpoint) {
      // No form service configured: hand the order to the customer's mail app.
      window.location.href = 'mailto:' + CONFIG.shopEmail +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      finish('mailto');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('basket.sending', 'Đang gửi...');

    var data = new FormData();
    data.append('_subject', subject);
    data.append('name', customer.name);
    data.append('phone', customer.phone);
    data.append('address', customer.pickup ? t('basket.txt_pickup', '') : customer.address);
    data.append('note', customer.note);
    data.append('order', body);

    fetch(CONFIG.orderEndpoint, { method: 'POST', body: data, mode: 'no-cors' })
      .then(function () { finish('sent'); })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t('basket.send', 'Gửi đơn cho Gem');
        err.textContent = t('common.ml_error', 'Có lỗi xảy ra. Bạn thử lại sau giúp chúng mình nhé.');
        err.hidden = false;
      });
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
        '<span class="gb-price">' + money(product.price) + '</span>' +
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
  });
})();
