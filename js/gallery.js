// Gem Chạm Sắc — product photo carousel / lightbox
// Any .product-card with a data-gallery attribute becomes clickable; clicking
// opens a modal carousel of that product's photos plus a "visit the store" note.
//
// data-gallery is a comma-separated list of image base names living in
// images/products/ (no extension, no path), e.g.
//   data-gallery="vai-vun-tui-deo-cheo,vai-vun-tui-deo-cheo-2"
// A full path (containing "/" ) or a name with an extension is used as-is.

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

  document.addEventListener('DOMContentLoaded', function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.product-card[data-gallery]'));
    if (!cards.length) return;

    // ---- Build the modal once ----
    var modal = document.createElement('div');
    modal.className = 'pg-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="pg-backdrop"></div>' +
      '<div class="pg-dialog">' +
        '<button type="button" class="pg-close" data-i18n-attr="aria-label:products.modal_close">&times;</button>' +
        '<div class="pg-stage">' +
          '<button type="button" class="pg-nav pg-prev" data-i18n-attr="aria-label:products.modal_prev" aria-label="Previous">&#8249;</button>' +
          '<img class="pg-img" alt="">' +
          '<button type="button" class="pg-nav pg-next" data-i18n-attr="aria-label:products.modal_next" aria-label="Next">&#8250;</button>' +
          '<span class="pg-counter" aria-hidden="true"></span>' +
        '</div>' +
        '<div class="pg-dots" role="tablist"></div>' +
        '<div class="pg-info">' +
          '<h3 class="pg-title"></h3>' +
          '<p class="pg-sub"></p>' +
          '<p class="pg-cta" data-i18n="products.modal_cta">' + t('products.modal_cta', 'Mời các bạn qua cửa hàng xem & mua nhé!') + '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var imgEl = modal.querySelector('.pg-img');
    var titleEl = modal.querySelector('.pg-title');
    var subEl = modal.querySelector('.pg-sub');
    var counterEl = modal.querySelector('.pg-counter');
    var dotsEl = modal.querySelector('.pg-dots');
    var prevBtn = modal.querySelector('.pg-prev');
    var nextBtn = modal.querySelector('.pg-next');
    var closeBtn = modal.querySelector('.pg-close');
    var backdrop = modal.querySelector('.pg-backdrop');

    // Re-apply translations so the freshly injected modal is localized
    if (window.GemI18n) window.GemI18n.setLang(window.GemI18n.getLang());

    var images = [];
    var index = 0;
    var triggerEl = null;
    var currentCard = null;

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

    function syncText() {
      if (!currentCard) return;
      var h = currentCard.querySelector('h4');
      var p = currentCard.querySelector('p');
      titleEl.textContent = h ? h.textContent : '';
      subEl.textContent = p ? p.textContent : '';
      imgEl.alt = h ? h.textContent : '';
    }

    function open(card) {
      currentCard = card;
      triggerEl = card;
      images = (card.getAttribute('data-gallery') || '')
        .split(',').map(resolveSrc).filter(Boolean);
      if (!images.length) return;
      index = 0;

      // Build dots
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

      syncText();
      render();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('pg-lock');
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

    // Wire each card
    cards.forEach(function (card) {
      card.classList.add('is-clickable');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.addEventListener('click', function () { open(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
      });
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

    // Keep title/subtitle in sync if language changes while modal is open
    document.addEventListener('gem:langchange', function () {
      if (modal.getAttribute('aria-hidden') === 'false') syncText();
    });
  });
})();
