// Gem Chạm Sắc — product photo carousel / lightbox, and the product sheet
// Any .product-card with a data-gallery attribute becomes clickable; clicking
// opens a modal carousel of that product's photos plus a "visit the store" note.
//
// data-gallery is a comma-separated list of image base names living in
// images/products/ (no extension, no path), e.g.
//   data-gallery="vai-vun-tui-deo-cheo,vai-vun-tui-deo-cheo-2"
// A full path or URL (containing "/") is used as-is; a name with an extension
// gets the images/products/ folder in front.
// Cards added later (js/catalog.js builds them from the database) work too:
// clicks are caught on the document, and GemGallery.bind(card) adds the
// keyboard/ARIA bits.
//
// The product sheet: a product the database gives choices (a scent, a size —
// products.options), a consignor or notes opens the same modal as a sheet
// beside its photos, Shopee-style: price, the choices, "Thêm vào giỏ", notes.
// Data comes from js/basket.js (GemBasket.info) and adding goes through
// GemBasket.add with the key of the choice. Choice names and notes are typed
// by staff: textContent only, never innerHTML.

(function () {
  'use strict';

  function resolveSrc(token) {
    token = token.trim();
    if (!token) return null;
    if (token.indexOf('/') !== -1) return token;          // full/relative path given
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(token)) return 'images/products/' + token;
    return 'images/products/' + token + '.jpg';
  }

  function t(key, fallback) {
    if (window.GemI18n && typeof window.GemI18n.t === 'function') {
      var v = window.GemI18n.t(key);
      if (v != null) return v;
    }
    return fallback;
  }

  function isEn() {
    return !!(window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang() === 'en');
  }

  function bind(card) {
    card.classList.add('is-clickable');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
  }
  window.GemGallery = { bind: bind };

  document.addEventListener('DOMContentLoaded', function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.product-card[data-gallery]'));
    if (!cards.length && !document.querySelector('.product-grid')) return;

    // ---- Build the modal once ----
    var modal = document.createElement('div');
    modal.className = 'pg-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pg-title');
    modal.innerHTML =
      '<div class="pg-backdrop"></div>' +
      '<div class="pg-dialog">' +
        '<button type="button" class="pg-close" data-i18n-attr="aria-label:products.modal_close">&times;</button>' +
        '<div class="pg-media">' +
          '<div class="pg-stage">' +
            '<button type="button" class="pg-nav pg-prev" data-i18n-attr="aria-label:products.modal_prev" aria-label="Previous">&#8249;</button>' +
            '<img class="pg-img" alt="">' +
            '<button type="button" class="pg-nav pg-next" data-i18n-attr="aria-label:products.modal_next" aria-label="Next">&#8250;</button>' +
            '<span class="pg-counter" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="pg-dots" role="tablist"></div>' +
        '</div>' +
        '<div class="pg-info">' +
          '<span class="pg-consign" hidden></span>' +
          '<h3 class="pg-title" id="pg-title"></h3>' +
          '<p class="pg-sub"></p>' +
          '<div class="pg-buy" hidden>' +
            '<p class="pg-price"></p>' +
            '<div class="pg-opts" hidden>' +
              '<p class="pg-opts-label" id="pg-opts-label"></p>' +
              '<div class="pg-chips" role="group" aria-labelledby="pg-opts-label"></div>' +
              '<p class="pg-choice-note" aria-live="polite"></p>' +
            '</div>' +
            '<button type="button" class="btn btn-primary pg-add"></button>' +
            '<p class="pg-msg" role="status"></p>' +
          '</div>' +
          '<div class="pg-notes" hidden>' +
            '<h4 class="pg-notes-h" data-i18n="products.sheet_notes">Ghi chú</h4>' +
            '<p class="pg-notes-body"></p>' +
          '</div>' +
          '<p class="pg-cta" data-i18n="products.modal_cta">' + t('products.modal_cta', 'Mời các bạn qua cửa hàng hoặc liên hệ với chúng mình qua các trang mạng xã hội nhé!') + '</p>' +
          '<a class="pg-contact btn btn-primary" href="ghe-tham.html" data-i18n="products.modal_contact">' + t('products.modal_contact', 'Liên hệ với chúng mình') + '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    function $(sel) { return modal.querySelector(sel); }
    var mediaEl = $('.pg-media');
    var imgEl = $('.pg-img');
    var titleEl = $('.pg-title');
    var subEl = $('.pg-sub');
    var counterEl = $('.pg-counter');
    var dotsEl = $('.pg-dots');
    var prevBtn = $('.pg-prev');
    var nextBtn = $('.pg-next');
    var closeBtn = $('.pg-close');
    var backdrop = $('.pg-backdrop');
    var consignEl = $('.pg-consign');
    var buyEl = $('.pg-buy');
    var priceEl = $('.pg-price');
    var optsEl = $('.pg-opts');
    var optsLabel = $('.pg-opts-label');
    var chipsEl = $('.pg-chips');
    var noteEl = $('.pg-choice-note');
    var addBtn = $('.pg-add');
    var msgEl = $('.pg-msg');
    var notesEl = $('.pg-notes');
    var notesBody = $('.pg-notes-body');
    var ctaEl = $('.pg-cta');
    var contactEl = $('.pg-contact');

    // Re-apply translations so the freshly injected modal is localized
    if (window.GemI18n) window.GemI18n.setLang(window.GemI18n.getLang());

    var images = [];
    var index = 0;
    var triggerEl = null;
    var currentCard = null;
    var info = null;      // GemBasket.info() of the open product, null before the database answers
    var picked = null;    // key of the choice picked in the sheet
    var addedTimer = 0;

    function render() {
      var total = images.length;
      imgEl.src = images[index] || '';
      counterEl.textContent = total > 1 ? (index + 1) + ' / ' + total : '';
      counterEl.style.display = total > 1 ? '' : 'none';
      var multi = total > 1;
      prevBtn.style.display = multi ? '' : 'none';
      nextBtn.style.display = multi ? '' : 'none';
      dotsEl.style.display = multi ? '' : 'none';
      Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    function buildDots() {
      dotsEl.innerHTML = '';
      images.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'pg-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', (i + 1) + '');
        dot.addEventListener('click', function () { index = i; render(); });
        dotsEl.appendChild(dot);
      });
    }

    function syncText() {
      if (!currentCard) return;
      var h = currentCard.querySelector('h4');
      var p = currentCard.querySelector('p');
      titleEl.textContent = h ? h.textContent : '';
      subEl.textContent = p ? p.textContent : '';
      imgEl.alt = h ? h.textContent : '';
    }

    /* ---------- the sheet: choices, price, notes ---------- */

    function productInfo(card) {
      var sku = card && card.getAttribute('data-sku');
      return sku && window.GemBasket && window.GemBasket.info ? window.GemBasket.info(sku) : null;
    }

    function isSheet(i) { return !!(i && (i.options || i.consignor || i.notes)); }

    function choiceList() { return (info && info.options && info.options.choices) || []; }

    function choiceByKey(key) {
      var cs = choiceList();
      for (var i = 0; i < cs.length; i++) if (cs[i].key === key) return cs[i];
      return null;
    }

    // "Mùi hương", "Cỡ" — what is being chosen
    function optLabel() {
      var o = (info && info.options) || {};
      return (isEn() && o.label_en) || o.label_vi || '';
    }
    function cName(c) { return (isEn() && c.en) || c.vi || c.key; }
    function cNote(c) { return (isEn() && c.note_en) || c.note_vi || ''; }

    function renderSheet() {
      var on = isSheet(info);
      modal.classList.toggle('is-detail', on);
      ctaEl.hidden = on;
      contactEl.hidden = on;
      buyEl.hidden = !on;
      consignEl.hidden = !(on && info.consignor);
      notesEl.hidden = !(on && info.notes);
      if (!on) return;

      if (info.consignor) consignEl.textContent = t('products.consign', 'Ký gửi') + ' · ' + info.consignor;
      notesBody.textContent = info.notes || '';
      priceEl.textContent = info.price;

      var cs = choiceList();
      optsEl.hidden = !cs.length;
      chipsEl.textContent = '';
      cs.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pg-chip';
        b.setAttribute('data-key', c.key);
        b.setAttribute('aria-pressed', c.key === picked ? 'true' : 'false');
        b.appendChild(document.createTextNode(cName(c)));
        if (c.out) {
          // still listed, so a regular sees it is gone rather than missing
          b.disabled = true;
          var s = document.createElement('span');
          s.className = 'pg-chip-out';
          s.textContent = t('products.sheet_out', 'hết');
          b.appendChild(s);
        }
        chipsEl.appendChild(b);
      });
      if (cs.length) optsLabel.textContent = optLabel();
      var cur = choiceByKey(picked);
      noteEl.textContent = cur ? cNote(cur) : '';

      addBtn.disabled = !info.inStock;
      addBtn.classList.remove('is-added');
      addBtn.textContent = info.inStock
        ? t('basket.add', 'Thêm vào giỏ')
        : t('basket.out_of_stock', 'Tạm hết hàng');
    }

    chipsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.pg-chip');
      if (!b || b.disabled) return;
      picked = b.getAttribute('data-key');
      msgEl.textContent = '';
      Array.prototype.forEach.call(chipsEl.children, function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      var c = choiceByKey(picked);
      noteEl.textContent = c ? cNote(c) : '';
      // show the jar / pair that was picked
      if (c && c.image) {
        var src = resolveSrc(c.image);
        var i = images.indexOf(src);
        if (i < 0) { images.push(src); buildDots(); i = images.length - 1; }
        index = i;
        render();
      }
    });

    function showViewBasket() {
      msgEl.textContent = '';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg-view-basket';
      b.setAttribute('data-i18n', 'products.sheet_view_basket');   // follows a language switch
      b.textContent = t('products.sheet_view_basket', 'Xem giỏ hàng');
      b.addEventListener('click', function () {
        close();
        if (window.GemBasket && window.GemBasket.open) window.GemBasket.open();
      });
      msgEl.appendChild(b);
    }

    addBtn.addEventListener('click', function () {
      if (!info || !currentCard || !window.GemBasket) return;
      var hasChoices = choiceList().length > 0;
      if (hasChoices && !choiceByKey(picked)) {
        msgEl.textContent = t('products.sheet_pick', 'Bạn chọn {x} trước nhé.').replace('{x}', optLabel().toLowerCase());
        var first = chipsEl.querySelector('.pg-chip:not(:disabled)');
        if (first) first.focus();
        return;
      }
      var sku = currentCard.getAttribute('data-sku');
      if (!window.GemBasket.add(sku, imgEl, null, null, hasChoices ? picked : null)) {
        msgEl.textContent = t('basket.option_gone', 'Một lựa chọn trong giỏ (mùi, cỡ…) vừa hết hàng. Bạn xem lại giỏ giúp chúng mình nhé.');
        return;
      }
      addBtn.classList.add('is-added');
      addBtn.textContent = t('products.sheet_added', 'Đã thêm vào giỏ');
      showViewBasket();
      clearTimeout(addedTimer);
      addedTimer = setTimeout(function () {
        addBtn.classList.remove('is-added');
        addBtn.textContent = t('basket.add', 'Thêm vào giỏ');
      }, 1400);
    });

    /* ---------- open / close ---------- */

    function open(card) {
      currentCard = card;
      triggerEl = card;
      info = productInfo(card);
      picked = null;
      images = (card.getAttribute('data-gallery') || '')
        .split(',').map(resolveSrc).filter(Boolean);
      if (!images.length && isSheet(info)) {
        var own = card.querySelector('.product-card-image img');
        if (own && own.getAttribute('src')) images = [own.getAttribute('src')];
      }
      if (!images.length && !isSheet(info)) return;
      index = 0;
      mediaEl.hidden = !images.length;
      msgEl.textContent = '';
      clearTimeout(addedTimer);

      buildDots();
      syncText();
      renderSheet();
      render();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('pg-lock');
      // the dialog scrolls on phones: start every product at its top
      $('.pg-dialog').scrollTop = 0;
      closeBtn.focus();
    }

    function close() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('pg-lock');
      if (triggerEl) triggerEl.focus();
    }

    function next() { if (images.length) { index = (index + 1) % images.length; render(); } }
    function prev() { if (images.length) { index = (index - 1 + images.length) % images.length; render(); } }

    // basket.js: the "Chọn mùi hương" button of a card opens the sheet
    window.GemGallery.open = open;

    // Wire every card, now and later: one listener on the document
    cards.forEach(bind);
    function cardOf(e) {
      var c = e.target.closest && e.target.closest('.product-card[data-gallery]');
      if (!c || e.target.closest('.gb-slot')) return null;   // the basket button has its own job
      return c.getAttribute('data-gallery') ? c : null;
    }
    document.addEventListener('click', function (e) {
      var c = cardOf(e);
      if (c) open(c);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var c = cardOf(e);
      if (c && e.target === c) { e.preventDefault(); open(c); }
    });

    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (modal.getAttribute('aria-hidden') !== 'false') return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    // Keep the text in sync if the language changes while the modal is open
    document.addEventListener('gem:langchange', function () {
      if (modal.getAttribute('aria-hidden') !== 'false') return;
      info = productInfo(currentCard) || info;
      syncText();
      renderSheet();
      // a hint in the old language goes; the "Xem giỏ hàng" link translates itself
      if (!msgEl.querySelector('button')) msgEl.textContent = '';
    });
  });
})();
