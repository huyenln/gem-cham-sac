// Gem Chạm Sắc — product cards from the database (san-pham.html)
//
// The cards written in san-pham.html are the fallback: the page works even
// when Supabase doesn't answer. Once basket.js has the `products` rows
// (event gem:products), this file makes the page match the database:
//   - existing cards take the name, description, photo and gallery from it
//   - a product added in admin.html gets a card of its own
//   - cards are put in the shop's order (sort_order), in the grid of their
//     category: <div class="product-grid" data-cat="vai-vun">
// basket.js hides cards the shop no longer sells; gallery.js opens any
// card with data-gallery, including the ones built here.

(function () {
  'use strict';

  var rows = null;

  function lang() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) === 'en' ? 'en' : 'vi';
  }

  function pick(r, field) {
    return (lang() === 'en' && r[field + '_en']) || r[field + '_vi'] || '';
  }

  function grids() {
    var out = {};
    document.querySelectorAll('.product-grid[data-cat]').forEach(function (g) {
      out[g.getAttribute('data-cat')] = g;
    });
    return out;
  }

  function build(r) {
    var card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-sku', r.sku);
    var box = document.createElement('div');
    box.className = 'product-card-image';
    var img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    box.appendChild(img);
    card.appendChild(box);
    card.appendChild(document.createElement('h4'));
    card.appendChild(document.createElement('p'));
    var slot = document.createElement('div');
    slot.className = 'gb-slot';
    card.appendChild(slot);
    return card;
  }

  // Text: the database wins over the i18n keys in the HTML, so a name edited
  // in admin shows up. Its own _en columns carry the English.
  function fill(card, r) {
    var h = card.querySelector('h4'), p = card.querySelector('p'), img = card.querySelector('.product-card-image img');
    var name = pick(r, 'name'), desc = pick(r, 'desc');
    if (h && name) { h.removeAttribute('data-i18n'); h.textContent = name; }
    if (p && desc) { p.removeAttribute('data-i18n'); p.textContent = desc; }
    if (img) {
      var gal = r.gallery || [];
      var src = r.image || (gal[0] ? (gal[0].indexOf('/') < 0 ? 'images/products/' + gal[0] : gal[0]) : '');
      if (src && img.getAttribute('src') !== src) img.src = src;
      if (!img.getAttribute('src')) img.src = 'images/logo/gem_logo_icon_120.png';
      img.removeAttribute('data-i18n-attr');
      img.alt = name;
    }
    if (r.gallery && r.gallery.length) card.setAttribute('data-gallery', r.gallery.join(','));
  }

  function apply() {
    var g = grids();
    rows.forEach(function (r) {
      var grid = g[r.category];
      var card = document.querySelector('.product-card[data-sku="' + CSS.escape(r.sku) + '"]');
      if (!grid) { if (card) fill(card, r); return; }   // a category the page has no block for
      var fresh = !card;
      if (fresh) card = build(r);
      fill(card, r);
      grid.appendChild(card);   // also puts existing cards in the shop's order
      if (fresh) {
        if (window.GemGallery && card.hasAttribute('data-gallery')) window.GemGallery.bind(card);
        if (window.GemBasket && window.GemBasket.bindCard) window.GemBasket.bindCard(card);
      }
    });
  }

  document.addEventListener('gem:products', function (e) {
    rows = (e.detail && e.detail.rows) || [];
    if (rows.length) apply();
  });

  document.addEventListener('gem:langchange', function () {
    if (!rows) return;
    rows.forEach(function (r) {
      var card = document.querySelector('.product-card[data-sku="' + CSS.escape(r.sku) + '"]');
      if (card) fill(card, r);
    });
  });
})();
