// Gem Chạm Sắc — Studio 2D
//
// A side-scrolling, hand-painted version of the real studio. Tap a piece of
// furniture: the character walks there and a sheet opens (products, 2hand,
// fitting corner…). Adding to cart and checkout go through js/basket.js, so
// the studio never keeps a cart of its own.
//
// All art is placeholder (ChatGPT drafts) until the hand-painted set arrives.
// Swapping art = replace the files and, if the layout moved, the numbers in
// SCENE below. Hotspots are given in each zone's own source pixels, so a
// redrawn zone only needs its own boxes re-measured.
//
// Strings live in this file (GemI18n.add), not in js/i18n.js, so the whole
// prototype can be dropped by deleting studio.html, this file and studio.css.

(function () {
  'use strict';

  /* ======================================================================
     SCENE — numbers come from tools/studio-assets.py (the STRIP line)
     ====================================================================== */
  var SCENE = {
    width: 4821,
    height: 1024,
    // x = where the zone starts in the strip, cropL = first source pixel kept
    zones: [
      { x: 0,    cropL: 0 },
      { x: 1472, cropL: 668 },
      { x: 2276, cropL: 755 },
      { x: 2993, cropL: 740 },
      { x: 3725, cropL: 440 }
    ],
    feetY: 965,          // where the character's feet touch the floor
    playerH: 410,        // character height, strip pixels
    startX: 330,          // just inside the door
    speed: 900,          // strip pixels per second
    // Udon on the walnut counter (placeholder: marker-style mascot)
    udon: { x: 4518, y: 338, w: 160, h: 150 }
  };

  // box = [x0, y0, x1, y1] in the zone's source image (1536 x 1024)
  var HOTSPOTS = [
    { id: 'door',     zone: 1, box: [50, 100, 480, 800],    label: 'studio.hot_door' },
    { id: 'sofa',     zone: 1, box: [600, 600, 1370, 850],  label: 'studio.hot_sofa' },
    { id: 'rail',     zone: 2, box: [680, 200, 1185, 790],  label: 'studio.hot_rail' },
    { id: 'fitting',  zone: 2, box: [1185, 280, 1500, 800], label: 'studio.hot_fitting' },
    { id: 'pegboard', zone: 3, box: [760, 280, 985, 760],   label: 'studio.hot_pegboard' },
    { id: 'cabinet',  zone: 3, box: [985, 240, 1510, 810],  label: 'studio.hot_cabinet' },
    { id: 'sewing',   zone: 4, box: [745, 320, 1255, 840],  label: 'studio.hot_sewing' },
    { id: 'wall',     zone: 4, box: [1240, 380, 1480, 560], label: 'studio.hot_wall' },
    { id: 'counter',  zone: 5, box: [445, 470, 1400, 740],  label: 'studio.hot_counter' }
  ];

  // Character frames (images/studio/char). anchor = where the body's centre
  // sits across the frame, so frames of different widths don't jump.
  var FRAMES = {
    front: { src: 'images/studio/char/p1-front.webp', anchor: 0.5 },
    side:  { src: 'images/studio/char/p1-side.webp',  anchor: 0.5 },
    walk:  { src: 'images/studio/char/p1-walk.webp',  anchor: 0.5 },
    cart:  { src: 'images/studio/char/p1-cart.webp',  anchor: 0.3 }
  };

  var SHELVES = {
    pegboard: ['scrunchie', 'bookmark', 'tuibut', 'origami', 'bloom', 'daydeo', 'biaso', 'so-kraft', 'so-khau'],
    cabinet:  ['goi', 'tham', 'lotcoc', 'oxford', 'denim', 'set-qua']
  };

  // Things the character can wear later — bought first, then unlocked.
  var WEARABLES = ['denim', 'scrunchie', 'daydeo', 'bloom'];

  var THUMB = {
    origami: 'vai-vun-tui-1-thumb.jpg',
    oxford: 'vai-vun-tui-3-thumb.jpg',
    denim: 'vai-vun-tui-7-thumb.jpg',
    bloom: 'vai-vun-bloom-charm-thumb.jpg',
    tuibut: 'vai-vun-tui-but-thumb.jpg',
    bookmark: 'vai-vun-bookmark-vai-thumb.jpg',
    biaso: 'vai-vun-bia-so-thumb.jpg',
    daydeo: 'vai-vun-day-deo-hong-thumb.jpg',
    scrunchie: 'vai-vun-scrunchie-thumb.jpg',
    lotcoc: 'vai-vun-lot-ly-hoa-thumb.jpg',
    goi: 'vai-vun-goi-patchwork-thumb.jpg',
    tham: 'vai-vun-tham-tron-thumb.jpg',
    'so-kraft': 'vpp-so-kraft-thumb.jpg',
    'so-khau': 'vpp-so-khau-thumb.jpg',
    'set-qua': 'set-qua-tang-thumb.jpg'
  };

  /* ======================================================================
     STRINGS
     ====================================================================== */
  var STRINGS = {
    'title.studio':        { vi: `Studio Gem · Gem Chạm Sắc`, en: `Gem Studio · Gem Chạm Sắc` },
    'studio.list_view':    { vi: `Xem dạng danh sách`, en: `List view` },
    'studio.list_short':   { vi: `Danh sách`, en: `List` },
    'studio.nav_aria':     { vi: `Đi tới khu`, en: `Go to` },
    'studio.go_door':      { vi: `Cửa vào`, en: `Entrance` },
    'studio.go_fitting':   { vi: `Thử đồ`, en: `Fitting` },
    'studio.go_shelves':   { vi: `Kệ hàng`, en: `Shelves` },
    'studio.go_sewing':    { vi: `Bàn chắp vải`, en: `Patchwork table` },
    'studio.go_counter':   { vi: `Quầy`, en: `Counter` },
    'studio.sr_help':      { vi: `Chạm vào đồ vật trong studio để xem hàng. Bấm Tab để đi qua từng điểm.`, en: `Tap things in the studio to look around. Press Tab to move between them.` },
    'studio.close':        { vi: `Đóng`, en: `Close` },

    'studio.hot_door':     { vi: `Chọn nhân vật`, en: `Choose character` },
    'studio.hot_sofa':     { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.hot_rail':     { vi: `Đồ 2hand`, en: `Secondhand` },
    'studio.hot_fitting':  { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.hot_pegboard': { vi: `Phụ kiện & sổ`, en: `Accessories & notebooks` },
    'studio.hot_cabinet':  { vi: `Gối, thảm & quà`, en: `Cushions, rugs & gifts` },
    'studio.hot_sewing':   { vi: `Bàn chắp vải`, en: `Patchwork table` },
    'studio.hot_wall':     { vi: `Tường sưu tầm`, en: `Collectors' wall` },
    'studio.hot_counter':  { vi: `Quầy thu ngân`, en: `Counter` },

    'studio.intro':        { vi: `Chào bạn! Chạm vào kệ để xem đồ nhé. Bàn chắp vải ở cuối phòng đó.`, en: `Hi! Tap a shelf to look around. The patchwork table is at the far end.` },
    'studio.cart_empty':   { vi: `Xe còn trống nè, dạo thêm chút nhé.`, en: `Your cart is still empty — have another look around.` },

    'studio.add':          { vi: `Thêm vào giỏ`, en: `Add to cart` },
    'studio.added':        { vi: `Đã thêm`, en: `Added` },
    'studio.out':          { vi: `Tạm hết hàng`, en: `Out of stock` },
    'studio.all_products': { vi: `Xem tất cả trên trang Sản phẩm`, en: `See everything on the Products page` },

    'studio.pegboard_h':   { vi: `Phụ kiện vải vụn & sổ`, en: `Fabric-scrap accessories & notebooks` },
    'studio.pegboard_p':   { vi: `Mỗi món ghép từ vải vụn, không cái nào giống cái nào.`, en: `Each piece is sewn from scraps, so no two are alike.` },
    'studio.cabinet_h':    { vi: `Gối, thảm & set quà`, en: `Cushions, rugs & gift sets` },
    'studio.cabinet_p':    { vi: `Đồ chắp vải cỡ lớn và những set quà gói sẵn.`, en: `Larger patchwork pieces and ready-wrapped gift sets.` },

    'studio.rail_h':       { vi: `Giá đồ 2hand`, en: `Secondhand rail` },
    'studio.rail_p':       { vi: `Mỗi món chỉ có một chiếc. Ghé studio để thử và mua nhé.`, en: `There's only one of each. Come by the studio to try them on.` },
    'studio.rail_cta':     { vi: `Đường tới studio`, en: `How to find us` },

    'studio.door_h':       { vi: `Chọn nhân vật`, en: `Choose your character` },
    'studio.door_p':       { vi: `Thêm bạn mới sắp vào studio.`, en: `More characters are on their way.` },
    'studio.door_go':      { vi: `Vào studio`, en: `Step inside` },
    'studio.soon':         { vi: `Sắp có`, en: `Soon` },

    'studio.fitting_h':    { vi: `Góc thử đồ`, en: `Fitting corner` },
    'studio.fitting_p':    { vi: `Mua món nào của Gem thì mặc được món đó cho nhân vật.`, en: `Buy a Gem piece and your character can wear it too.` },
    'studio.fitting_lock': { vi: `Mua để mặc`, en: `Buy to wear` },

    'studio.sofa_h':       { vi: `Góc nghỉ chân`, en: `Sofa corner` },
    'studio.sofa_p':       { vi: `Ngồi chút, xem studio dạo này có gì.`, en: `Sit down for a bit and see what's on.` },
    'studio.sofa_ws':      { vi: `Workshop — tự tay làm một món`, en: `Workshops — make something yourself` },
    'studio.sofa_news':    { vi: `Bản tin — chuyện ở studio`, en: `Newsletter — studio notes` },

    'studio.sewing_h':     { vi: `Bàn chắp vải`, en: `Patchwork table` },
    'studio.sewing_p':     { vi: `Bàn đang được may. Sắp tới bạn sẽ tự chọn mảnh vải vụn thật để ghép gối, lót cốc của riêng mình.`, en: `Still being stitched. Soon you'll pick real fabric scraps to piece together your own cushion or coaster.` },
    'studio.sewing_cta':   { vi: `Xem gối & lót cốc có sẵn`, en: `See ready-made cushions & coasters` },

    'studio.wall_h':       { vi: `Tường sưu tầm`, en: `Collectors' wall` },
    'studio.wall_p':       { vi: `Thiết kế của khách sẽ được treo ở đây. Mỗi tháng Gem may thật một thiết kế.`, en: `Visitors' designs will hang here. Each month Gem sews one of them for real.` }
  };
  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STRINGS);

  function t(key) {
    var v = window.GemI18n && window.GemI18n.t ? window.GemI18n.t(key) : null;
    if (v != null) return v;
    return STRINGS[key] ? STRINGS[key].vi : key;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Static markup carrying data-i18n, so a language switch retranslates it.
  function tr(tag, key, attrs) {
    return '<' + tag + (attrs || '') + ' data-i18n="' + key + '">' + esc(t(key)) + '</' + tag + '>';
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     GEOMETRY
     ====================================================================== */
  function zoneX(zone, x) {
    var z = SCENE.zones[zone - 1];
    return z.x + (x - z.cropL);
  }

  function boxOf(h) {
    return {
      x0: zoneX(h.zone, h.box[0]), y0: h.box[1],
      x1: zoneX(h.zone, h.box[2]), y1: h.box[3]
    };
  }

  function hotById(id) {
    for (var i = 0; i < HOTSPOTS.length; i++) if (HOTSPOTS[i].id === id) return HOTSPOTS[i];
    return null;
  }

  function standX(h) {
    var b = boxOf(h);
    return (b.x0 + b.x1) / 2;
  }

  function pct(v, of) { return (v / of * 100).toFixed(3) + '%'; }

  /* ======================================================================
     STATE + DOM
     ====================================================================== */
  var stage, world, playerEl, bobEl, frameEls = {}, bubble, bubbleText, modal, sheetBody;
  var k = 1;           // screen px per strip px
  var cam = 0;
  var player = { x: SCENE.startX, facing: 1, moving: false, moved: false, frame: 'front' };
  var walkToken = 0;
  var cartCount = 0;
  var lastFocus = null;

  function build() {
    // Hotspots
    HOTSPOTS.forEach(function (h) {
      var b = boxOf(h);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'st-hot';
      btn.setAttribute('data-hot', h.id);
      btn.setAttribute('data-i18n-attr', 'aria-label:' + h.label);
      btn.setAttribute('aria-label', t(h.label));
      btn.style.left = pct(b.x0, SCENE.width);
      btn.style.top = pct(b.y0, SCENE.height);
      btn.style.width = pct(b.x1 - b.x0, SCENE.width);
      btn.style.height = pct(b.y1 - b.y0, SCENE.height);
      btn.innerHTML = '<span class="st-hot-label" data-i18n="' + h.label + '">' + esc(t(h.label)) + '</span>';
      world.appendChild(btn);
    });

    // Udon on the counter
    var u = SCENE.udon;
    var udon = document.createElement('img');
    udon.className = 'st-udon';
    udon.src = 'images/mascot/udon_sit_happy.png';
    udon.alt = '';
    udon.style.left = pct(u.x, SCENE.width);
    udon.style.top = pct(u.y, SCENE.height);
    udon.style.width = pct(u.w, SCENE.width);
    world.appendChild(udon);

    // Character: one <img> per frame, toggled — swapping src would flicker.
    playerEl = document.createElement('div');
    playerEl.className = 'st-player';
    playerEl.style.height = pct(SCENE.playerH, SCENE.height);
    playerEl.style.bottom = pct(SCENE.height - SCENE.feetY, SCENE.height);
    bobEl = document.createElement('div');
    bobEl.className = 'st-bob';
    Object.keys(FRAMES).forEach(function (name) {
      var img = document.createElement('img');
      img.src = FRAMES[name].src;
      img.alt = '';
      img.draggable = false;
      img.style.transform = 'translateX(' + (-FRAMES[name].anchor * 100) + '%)';
      img.hidden = true;
      frameEls[name] = img;
      bobEl.appendChild(img);
    });
    playerEl.appendChild(bobEl);
    world.appendChild(playerEl);
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  function layout() {
    var h = stage.clientHeight;
    k = h / SCENE.height;
    world.style.width = (SCENE.width * k) + 'px';
    world.style.height = h + 'px';
    render();
  }

  function pickFrame(now) {
    if (cartCount > 0) return 'cart';
    if (player.moving) return Math.floor(now / 170) % 2 ? 'walk' : 'side';
    return player.moved ? 'side' : 'front';
  }

  function render(now) {
    var frame = pickFrame(now || performance.now());
    if (frame !== player.frame || frameEls[frame].hidden) {
      Object.keys(frameEls).forEach(function (n) { frameEls[n].hidden = n !== frame; });
      player.frame = frame;
    }
    playerEl.style.left = (player.x * k) + 'px';
    playerEl.style.transform = player.facing < 0 ? 'scaleX(-1)' : '';
    playerEl.classList.toggle('is-moving', player.moving);

    var viewW = stage.clientWidth;
    var worldW = SCENE.width * k;
    cam = Math.max(0, Math.min(player.x * k - viewW / 2, worldW - viewW));
    world.style.transform = 'translate3d(' + (-cam) + 'px,0,0)';
  }

  /* ======================================================================
     MOVEMENT
     ====================================================================== */
  function walkTo(x, then) {
    var target = Math.max(120, Math.min(SCENE.width - 120, x));
    var token = ++walkToken;
    var from = player.x;
    var dist = Math.abs(target - from);
    if (dist > 4) player.facing = target > from ? 1 : -1;
    player.moved = true;

    if (reduceMotion || dist < 4) {
      player.x = target;
      player.moving = false;
      render();
      if (then) then();
      return;
    }

    // Long walks speed up so no trip takes much more than a second.
    var dur = Math.max(250, Math.min(1400, dist / SCENE.speed * 1000));
    var start = performance.now();
    player.moving = true;

    function step(now) {
      if (token !== walkToken) return;          // a newer walk took over
      var p = Math.min(1, (now - start) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      player.x = from + (target - from) * e;
      if (p < 1) {
        render(now);
        requestAnimationFrame(step);
      } else {
        player.moving = false;
        render(now);
        if (then) then();
      }
    }
    requestAnimationFrame(step);
  }

  /* ======================================================================
     UDON SAYS
     ====================================================================== */
  var bubbleTimer = null;
  function say(key, ms) {
    bubbleText.setAttribute('data-i18n', key);
    bubbleText.textContent = t(key);
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, ms || 4000);
  }

  /* ======================================================================
     SHEETS (pop-ups)
     ====================================================================== */
  function openSheet(html) {
    lastFocus = document.activeElement;
    sheetBody.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('st-lock');
    modal.querySelector('.st-close').focus();
  }

  function closeSheet() {
    if (modal.hidden) return;
    modal.hidden = true;
    sheetBody.innerHTML = '';
    document.body.classList.remove('st-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function head(hKey, pKey) {
    return tr('h2', hKey, ' id="st-sheet-title"') + (pKey ? tr('p', pKey, ' class="st-lead"') : '');
  }

  function productCard(sku) {
    var info = window.GemBasket ? window.GemBasket.info(sku) : null;
    if (!info) return '';
    var out = !info.inStock;
    return '<li class="st-prod">' +
      '<img src="images/products/' + THUMB[sku] + '" alt="" loading="lazy" width="300" height="300">' +
      '<b>' + esc(info.name) + '</b>' +
      '<span class="st-price">' + esc(info.price) + '</span>' +
      (out
        ? '<button type="button" class="st-btn" disabled>' + esc(t('studio.out')) + '</button>'
        : '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>') +
    '</li>';
  }

  function shelfSheet(id) {
    openSheet(
      head('studio.' + id + '_h', 'studio.' + id + '_p') +
      '<ul class="st-grid">' + SHELVES[id].map(productCard).join('') + '</ul>' +
      '<p class="st-foot">' + tr('a', 'studio.all_products', ' href="san-pham.html"') + '</p>'
    );
  }

  function railSheet() {
    var imgs = '';
    for (var i = 1; i <= 6; i++) {
      imgs += '<li><img src="images/products/2hand-' + i + '.png" alt="" loading="lazy"></li>';
    }
    openSheet(
      head('studio.rail_h', 'studio.rail_p') +
      '<ul class="st-grid st-grid--photos">' + imgs + '</ul>' +
      '<p class="st-foot">' + tr('a', 'studio.rail_cta', ' href="ghe-tham.html" class="st-btn"') +
      ' ' + tr('a', 'studio.all_products', ' href="san-pham.html#quan-ao-2hand"') + '</p>'
    );
  }

  function doorSheet() {
    var soon = '';
    for (var i = 0; i < 3; i++) {
      soon += '<li class="st-char is-locked"><span class="st-char-shadow"></span>' + tr('span', 'studio.soon') + '</li>';
    }
    openSheet(
      head('studio.door_h', 'studio.door_p') +
      '<ul class="st-chars">' +
        '<li class="st-char is-picked"><img src="images/studio/char/p1-front.webp" alt=""></li>' + soon +
      '</ul>' +
      '<p class="st-foot"><button type="button" class="st-btn" data-close data-i18n="studio.door_go">' +
        esc(t('studio.door_go')) + '</button></p>'
    );
  }

  function fittingSheet() {
    var items = WEARABLES.map(function (sku) {
      var info = window.GemBasket ? window.GemBasket.info(sku) : null;
      if (!info) return '';
      return '<li class="st-prod is-locked">' +
        '<img src="images/products/' + THUMB[sku] + '" alt="" loading="lazy" width="300" height="300">' +
        '<b>' + esc(info.name) + '</b>' +
        tr('span', 'studio.fitting_lock', ' class="st-lock-tag"') +
        (info.inStock
          ? '<button type="button" class="st-btn" data-add="' + esc(sku) + '" data-i18n="studio.add">' + esc(t('studio.add')) + '</button>'
          : '') +
      '</li>';
    }).join('');
    openSheet(
      head('studio.fitting_h', 'studio.fitting_p') +
      '<div class="st-fitting"><img src="images/studio/char/p1-front.webp" alt=""></div>' +
      '<ul class="st-grid">' + items + '</ul>'
    );
  }

  function sofaSheet() {
    openSheet(
      head('studio.sofa_h', 'studio.sofa_p') +
      '<ul class="st-links">' +
        '<li>' + tr('a', 'studio.sofa_ws', ' href="workshop.html"') + '</li>' +
        '<li>' + tr('a', 'studio.sofa_news', ' href="ban-tin.html"') + '</li>' +
      '</ul>'
    );
  }

  function sewingSheet() {
    openSheet(
      head('studio.sewing_h', 'studio.sewing_p') +
      '<img class="st-preview" src="images/studio/ui/ui-ban-chap-demo-1.webp" alt="" loading="lazy">' +
      '<p class="st-foot"><button type="button" class="st-btn" data-goto="cabinet" data-i18n="studio.sewing_cta">' +
        esc(t('studio.sewing_cta')) + '</button></p>'
    );
  }

  function wallSheet() {
    openSheet(
      head('studio.wall_h', 'studio.wall_p') +
      '<img class="st-preview" src="images/studio/ui/sh-story-2.webp" alt="" loading="lazy">'
    );
  }

  function counter() {
    closeSheet();
    if (!window.GemBasket || window.GemBasket.count() === 0) {
      say('studio.cart_empty', 3500);
      return;
    }
    window.GemBasket.open();
  }

  var ACTIONS = {
    door: doorSheet,
    sofa: sofaSheet,
    rail: railSheet,
    fitting: fittingSheet,
    pegboard: function () { shelfSheet('pegboard'); },
    cabinet: function () { shelfSheet('cabinet'); },
    sewing: sewingSheet,
    wall: wallSheet,
    counter: counter
  };

  function visit(id, open) {
    var h = hotById(id);
    if (!h) return;
    walkTo(standX(h), open === false ? null : ACTIONS[id]);
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  function bind() {
    world.addEventListener('click', function (e) {
      var hot = e.target.closest('.st-hot');
      if (hot) {
        visit(hot.getAttribute('data-hot'));
        return;
      }
      // Tap on empty floor or wall: just walk there.
      var rect = stage.getBoundingClientRect();
      walkTo((e.clientX - rect.left + cam) / k);
    });

    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = b.getAttribute('data-go');
        if (go === 'shelves') {
          var a = boxOf(hotById('pegboard')), c = boxOf(hotById('cabinet'));
          walkTo((a.x0 + c.x1) / 2);
        } else {
          // The two places people come for open straight away.
          visit(go, go === 'sewing' || go === 'counter');
        }
      });
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.st-close') || e.target.closest('[data-close]')) {
        closeSheet();
        return;
      }
      var add = e.target.closest('[data-add]');
      if (add && window.GemBasket) {
        var card = add.closest('.st-prod');
        if (window.GemBasket.add(add.getAttribute('data-add'), card && card.querySelector('img'))) {
          add.textContent = t('studio.added');
          add.classList.add('is-added');
          setTimeout(function () {
            add.textContent = t('studio.add');
            add.classList.remove('is-added');
          }, 1100);
        }
        return;
      }
      var go = e.target.closest('[data-goto]');
      if (go) {
        closeSheet();
        visit(go.getAttribute('data-goto'));
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (!modal.hidden || document.body.classList.contains('gb-lock')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); walkTo(player.x + 300); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); walkTo(player.x - 300); }
    });

    // Keyboard focus on a hotspot brings it into view.
    world.addEventListener('focusin', function (e) {
      var hot = e.target.closest('.st-hot');
      if (hot && !player.moving) walkTo(standX(hotById(hot.getAttribute('data-hot'))));
    });

    document.addEventListener('gem:basket', function (e) {
      cartCount = (e.detail && e.detail.count) || 0;
      render();
    });

    bubble.addEventListener('click', function () { bubble.hidden = true; });

    window.addEventListener('resize', layout);
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    stage = document.getElementById('st-stage');
    world = document.getElementById('st-world');
    bubble = document.getElementById('st-bubble');
    bubbleText = document.getElementById('st-bubble-text');
    modal = document.getElementById('st-modal');
    sheetBody = document.getElementById('st-sheet-body');
    if (!stage || !world) return;

    build();
    bind();
    cartCount = window.GemBasket ? window.GemBasket.count() : 0;
    layout();

    var seen = false;
    try { seen = localStorage.getItem('gem-studio-intro') === '1'; } catch (e) { /* private mode */ }
    if (!seen) {
      setTimeout(function () { say('studio.intro', 7000); }, 600);
      try { localStorage.setItem('gem-studio-intro', '1'); } catch (e) { /* ignore */ }
    }
  });
})();
