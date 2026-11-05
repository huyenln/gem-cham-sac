// Gem Chạm Sắc — Bất ngờ ngoài phố: rác rơi (Studio Gem 2D)
//
// Out on the street a piece of litter (sometimes two or three) falls near
// the visitor and a strip at the top counts down. A tap picks it up, and one
// message opens: a tip on rubbish, sorting, fabric or old clothes, each with
// its source to open (Anna 05/11: "đều phải có nguồn đáng tin cậy").
// Too slow: Udon runs in, tugs a trouser hem and pulls the visitor back to
// it, with a light line ("Một bước chân qua, một cái chai ở lại"), and waits
// until it is picked. Every piece counts (localStorage gem-rac); 100, 200 and
// 500 give a badge, for fun. Opened messages stay in the Sổ thông điệp
// (Tủ sưu tầm). studio.js decides when ("Bất ngờ ngoài phố") and loads this
// file the first time; it hands over the scene through ctx.

window.GemRacRoi = (function () {
  'use strict';

  var STR = {
    'rr.fell1':    { vi: `Ơ, có rác rơi! Nhặt giúp Gem nhé`, en: `Oops, some litter fell! Pick it up for Gem` },
    'rr.felln':    { vi: `Ơ, {n} món rác rơi! Nhặt giúp Gem nhé`, en: `Oops, {n} bits of litter fell! Pick them up for Gem` },
    'rr.left':     { vi: `còn {n}`, en: `{n} to go` },
    'rr.late':     { vi: `Hết giờ rồi…`, en: `Time's up…` },
    'rr.wait':     { vi: `Udon chờ bạn nhặt nè`, en: `Udon is waiting for you to pick it up` },
    'rr.item':     { vi: `Nhặt {mon}`, en: `Pick up {mon}` },
    'rr.thanks':   { vi: `Cảm ơn bạn đã nhặt rác!`, en: `Thank you for picking it up!` },
    'rr.count':    { vi: `Bạn đã nhặt {n} món rác ngoài phố.`, en: `You've picked up {n} bits of litter on the street.` },
    'rr.msg_h':    { vi: `Thông điệp`, en: `A note` },
    'rr.source':   { vi: `Nguồn`, en: `Source` },
    'rr.close':    { vi: `Đóng`, en: `Close` },
    'rr.book':     { vi: `Sổ thông điệp`, en: `Notebook` },
    'rr.book_p':   { vi: `Mỗi món rác bạn nhặt ngoài phố mở một thông điệp. Đã mở {n}/{t}.`,
                     en: `Each bit of litter you pick up on the street opens a note. {n} of {t} opened.` },
    'rr.book_0':   { vi: `Chưa mở thông điệp nào. Ra phố dạo một vòng, thỉnh thoảng có rác rơi đấy.`,
                     en: `No notes yet. Take a walk on the street: now and then some litter falls.` },
    'rr.badge_h':  { vi: `Huy hiệu mới`, en: `A new badge` },
    'rr.b100':     { vi: `Lá non`, en: `New leaf` },
    'rr.b200':     { vi: `Cây xanh`, en: `Green tree` },
    'rr.b500':     { vi: `Rừng nhỏ`, en: `Little wood` },
    'rr.badge_p':  { vi: `{n} món rác đã được nhặt khỏi phố. Cảm ơn bạn đã đi cùng Gem tới đây.`,
                     en: `{n} bits of litter off the street. Thank you for coming this far with Gem.` },
    'rr.badges':   { vi: `Huy hiệu`, en: `Badges` },
    'rr.cat.rac':      { vi: `Bỏ rác đúng`, en: `Rubbish, the right way` },
    'rr.cat.phanloai': { vi: `Phân loại rác`, en: `Sorting waste` },
    'rr.cat.vai':      { vi: `Vải và tái chế`, en: `Fabric and recycling` },
    'rr.cat.docu':     { vi: `Đồ cũ`, en: `Old things` },
    // Udon's lines when he pulls the visitor back: light, a little meme-ish,
    // never about death, illness or calling anyone names (Anna 05/11)
    'rr.l1': { vi: `Một bước chân qua, {mon} ở lại.`, en: `One step past, {mon} left behind.` },
    'rr.l2': { vi: `Chạy trời không khỏi nắng, chạy rác không khỏi Udon.`, en: `You can run from the sun, but not from Udon.` },
    'rr.l3': { vi: `Ủa alo? Bạn ơi, rác!`, en: `Hello? Excuse me, your litter!` },
    'rr.l4': { vi: `Bỏ quên gì không? À, {mon}.`, en: `Forgot something? Ah, {mon}.` },
    'rr.l5': { vi: `Udon: Gâu! (dịch: quay lại nhặt rác đi bạn ơi)`, en: `Udon: Woof! (translation: come back and pick it up)` },
    'rr.l6': { vi: `Gem thấy hết rồi nha.`, en: `Gem saw that.` },
    'rr.l7': { vi: `Đi đâu mà vội mà vàng, rác còn nằm lại bên đàng kìa.`, en: `What's the hurry? There's litter left by the road.` },
    'rr.l8': { vi: `Tưởng thoát được à? Udon đây!`, en: `Thought you'd slip away? Udon's here!` }
  };
  var LINES = 8;

  // Street litter (drawings of the sorting game, images/studio/rac/), each
  // with what it is called in Udon's lines
  var ITEMS = {
    'chai':          { vi: 'cái chai', en: 'a bottle' },
    'ly-tra-sua':    { vi: 'cái ly trà sữa', en: 'a bubble tea cup' },
    'goi-snack':     { vi: 'gói snack', en: 'a crisp packet' },
    'hop-sua-chua':  { vi: 'hộp sữa chua', en: 'a yoghurt pot' },
    'lo-keo':        { vi: 'lọ kẹo', en: 'a sweet jar' },
    'tui-zip':       { vi: 'cái túi zip', en: 'a zip bag' },
    'hop-com':       { vi: 'hộp cơm', en: 'a lunch box' },
    'thia':          { vi: 'cái thìa nhựa', en: 'a plastic spoon' },
    'nap-chai':      { vi: 'cái nắp chai', en: 'a bottle cap' },
    'vo-banh':       { vi: 'vỏ bánh', en: 'a wrapper' },
    'hop-banh':      { vi: 'hộp bánh', en: 'a cake box' }
  };
  var RAC = 'images/studio/rac/';
  var BADGES = [100, 200, 500];

  // Messages: one opens with each piece picked up. Each carries its source,
  // shown and linked on the card. Drafted 11/2026 from the pages linked;
  // Gem reviews the wording.
  var MSGS = [
    // the six Tagom posters hung in the studio (images/studio/tagom/), with
    // Tagom's leave (23/10/2026)
    { id: "tg-01", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Chai nhựa đi ba bước: tháo nắp và bóc tem, làm bẹp chai, rồi mới phân loại vào bao.",
      en: "A plastic bottle takes three steps: take off the cap and peel off the label, flatten the bottle, then sort it into the bag." },
    { id: "tg-02", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Hộp, khay, chai từng đựng đồ ăn hay nước sốt: làm sạch và để khô rồi mới bỏ vào bao.",
      en: "Boxes, trays and bottles that held food or sauce: clean them and let them dry before they go into the bag." },
    { id: "tg-03", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Gói snack, túi nilon cứng: làm sạch, để khô rồi gấp gọn, hoặc dồn chung vào một túi nhỏ cho gọn.",
      en: "Snack bags and other hard nylon: clean, dry, then fold them neatly, or pack them together into one compact bag." },
    { id: "tg-04", cat: "rac", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Cột khí chống sốc trong thùng hàng thì làm xẹp hết rồi mới cho vào bao nilon mềm.",
      en: "Air-cushion packaging from a parcel: let all the air out before it goes into the soft nylon bag." },
    { id: "tg-05", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Chai, lọ trong suốt có kí hiệu số 1 (PET), như chai nước, chai nước ngọt, hũ nhựa trong, thuộc nhóm nhựa 1 dễ tái chế.",
      en: "Clear bottles and jars marked with the number 1 (PET), like water bottles, soda bottles and clear jars, belong to the easy-to-recycle plastic #1 group." },
    { id: "tg-06", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nắp chai không đi cùng thân chai: nắp vào nhóm nhựa 2, 4, 5, còn tem nhãn bóc ra thì vào nhóm nilon cứng.",
      en: "The cap doesn't stay with the bottle: caps go with plastics #2, #4, #5, and the peeled-off label goes with hard nylon." },
    { id: "tg-07", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Cũng mang số 1, nhưng có màu và bề mặt bóng, hoặc trong suốt mà mỏng giòn như cốc, khay nhựa (trừ chai, lọ), thì thuộc nhóm nhựa 1 khó tái chế.",
      en: "Also marked 1, but coloured and glossy, or clear yet thin and brittle like plastic cups and trays (bottles and jars aside): that's the hard-to-recycle plastic #1 group." },
    { id: "tg-08", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Thấy số 2 (HDPE), 4 (LDPE) hoặc 5 (PP) là nhựa dễ tái chế: can, chai dầu gội, hộp đựng thực phẩm, đồ chơi nhựa, nắp chai.",
      en: "Numbers 2 (HDPE), 4 (LDPE) or 5 (PP) mean easy-to-recycle plastic: jugs, shampoo bottles, food boxes, plastic toys, bottle caps." },
    { id: "tg-09", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Món nhựa không có kí hiệu? Nếu nó dẻo, đàn hồi và chỉ một lớp nhựa, thì xếp cùng nhóm nhựa 2, 4, 5.",
      en: "No number on the plastic? If it is flexible, springy and a single layer, it goes with plastics #2, #4, #5." },
    { id: "tg-10", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Số 6 (PS), số 7 (Other), hay nhựa màu cứng, nhiều lớp, không đàn hồi như hộp sữa chua, thìa nhựa màu, bàn chải, đĩa CD: đó là nhóm nhựa 6, 7 khó tái chế.",
      en: "Number 6 (PS), number 7 (Other), or stiff, coloured, multi-layer plastic that doesn't flex, like yogurt cups, coloured plastic spoons, toothbrushes and CDs: that's the hard-to-recycle #6, #7 group." },
    { id: "tg-11", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Vỏ bút bi nhựa vào nhóm nhựa 6, 7, nhưng ruột bút thì không: tháo ruột ra trước.",
      en: "A plastic pen body goes with plastics #6, #7, but the refill doesn't: take the refill out first." },
    { id: "tg-12", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon cứng nhận ra bằng tay: nhiều lớp, không kéo dãn, bóp vào nghe sột soạt. Gói snack, gói kẹo, túi nước giặt đều thuộc nhóm này.",
      en: "You can tell hard nylon by touch: many layers, no stretch, and it crinkles when squeezed. Snack bags, sweet wrappers and detergent pouches all belong here." },
    { id: "tg-13", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon cứng có lớp nhôm (gói snack) hay không tráng nhôm đều chung một nhóm. Bao gạo dệt và túi vải không dệt cũng vào nhóm nilon cứng.",
      en: "Hard nylon with a foil layer (snack bags) or without one is all one group. Woven rice sacks and non-woven bags go with hard nylon too." },
    { id: "tg-14", cat: "phanloai", source: "Poster phân loại của Tagom", url: "https://www.facebook.com/tagom.tamer",
      vi: "Nilon mềm thì kéo dãn được, chỉ một chất liệu, bề mặt mềm: túi nilon quai xách, màng quấn hàng, túi bóng khí.",
      en: "Soft nylon stretches, is a single material and feels soft: carrier bags, stretch wrap, bubble-wrap mailers." }
  ];

  function lang() { return window.GemI18n && window.GemI18n.getLang() === 'en' ? 'en' : 'vi'; }
  function t(k) { var s = STR[k]; return s ? s[lang()] : k; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STR);

  /* ---------- what the visitor has (gem-rac) ---------- */
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem('gem-rac') || 'null'); } catch (e) { /* private mode */ }
    s = s && typeof s === 'object' ? s : {};
    return {
      n: Math.max(0, Math.min(1e6, +s.n || 0)),
      seen: Array.isArray(s.seen) ? s.seen.filter(function (id) { return typeof id === 'string' && id.length <= 20; }).slice(0, 200) : [],
      badges: Array.isArray(s.badges) ? s.badges.filter(function (b) { return BADGES.indexOf(b) >= 0; }) : []
    };
  }
  function save(s) {
    try { localStorage.setItem('gem-rac', JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function msgById(id) { return MSGS.filter(function (m) { return m.id === id; })[0] || null; }

  // the next message: one not opened yet, else any (all were read)
  function nextMsg(s) {
    if (!MSGS.length) return null;
    var fresh = MSGS.filter(function (m) { return s.seen.indexOf(m.id) < 0; });
    var pool = fresh.length ? fresh : MSGS;
    var m = pool[Math.floor(Math.random() * pool.length)];
    if (s.seen.indexOf(m.id) < 0) s.seen.push(m.id);
    return m;
  }

  function msgHtml(m) {
    var l = lang();
    return '<p class="rr-cat">' + esc(t('rr.cat.' + m.cat)) + '</p>' +
      '<p class="rr-text">' + esc(m[l] || m.vi) + '</p>' +
      '<p class="rr-src">' + esc(t('rr.source')) + ': <a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.source) + '</a></p>';
  }

  // a small roundel: one, two or three leaves
  function badgeSvg(b) {
    var n = BADGES.indexOf(b) + 1, leaf = '';
    for (var i = 0; i < n; i++) {
      var a = (i - (n - 1) / 2) * 34;
      leaf += '<path d="M32 46C22 38 22 24 32 14C42 24 42 38 32 46Z" fill="#87965A" stroke="#3D4A2E" stroke-width="1.6" transform="rotate(' + a + ' 32 46)"/>';
    }
    return '<svg class="rr-badge" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="30" fill="#F0E1D2" stroke="#B89968" stroke-width="3"/>' + leaf +
      '<path d="M32 46V54" stroke="#3D4A2E" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  /* ---------- a small sound: a soft two-note blip when a piece is picked ---------- */
  function blip(ctx) {
    var ac = ctx.sound && ctx.sound();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      var now = ac.currentTime + 0.01;
      [[880, 0], [1318.5, 0.08]].forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(0.12, now + n[1] + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.22);
        o.connect(g); g.connect(ac.destination);
        o.start(now + n[1]); o.stop(now + n[1] + 0.25);
      });
    } catch (e) { /* no sound: fine */ }
  }

  /* ---------- one event ----------
     ctx (from studio.js): world, stage, scene() {w, h, feet, playerH, k, cam,
     viewW}, player() {x, facing}, out(), calm(), drag(x, ms, done, step),
     picked() (all picked up: count it), reduce, sound. Resolves when it is
     over: picked (and the card closed), or the visitor went inside (nothing
     counted). */
  function drop(ctx) {
    return new Promise(function (resolve) {
      var S = ctx.scene(), P = ctx.player(), reduce = !!ctx.reduce;
      var n = Math.random() < 0.2 ? 2 + Math.floor(Math.random() * 2) : 1;
      var names = Object.keys(ITEMS).sort(function () { return Math.random() - 0.5; }).slice(0, n);
      var secs = 10 + 3 * (n - 1), left = secs, late = false, done = false, ended = false;
      // never smaller than a fingertip on screen (a phone turned sideways)
      var H = S.h, W = S.w, hPx = Math.max(S.playerH * 0.2, 44 / S.k);
      // in the middle of the view: the bottom corners have the cart and "?"
      var view0 = S.cam / S.k, view1 = (S.cam + S.viewW) / S.k;
      var pad = Math.max((view1 - view0) * 0.12, 76 / S.k) + hPx * 0.45;
      var lo = Math.max(140, view0 + pad), hi = Math.min(S.w - 140, view1 - pad);
      var pieces = [];

      // where: by the visitor's feet but not on them, apart from each other,
      // ahead if there is room (a phone's view is narrow: a little overlap is fine)
      var dir = P.facing || 1, xs = [], body = S.playerH * 0.09 + hPx * 0.3, sep = hPx * 0.95;
      function free(x) {
        return x >= lo && x <= hi && Math.abs(x - P.x) >= body &&
          xs.every(function (o) { return Math.abs(o - x) >= sep; });
      }
      for (var i = 0; i < n; i++) {
        var x = null;
        for (var tries = 0; tries < 60 && x == null; tries++) {
          var side = tries < 30 ? dir : -dir, c = P.x + side * (body + Math.random() * Math.max(0, (hi - lo) * 0.6));
          if (free(c)) x = c;
        }
        if (x == null) for (tries = 0; tries < 40 && x == null; tries++) {
          c = lo + Math.random() * Math.max(0, hi - lo);
          if (xs.every(function (o) { return Math.abs(o - c) >= sep; })) x = c;
        }
        xs.push(x == null ? Math.max(lo, Math.min(hi, P.x + dir * body)) : x);
      }
      names.forEach(function (name, j) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rr-item' + (reduce ? ' is-calm' : '');
        b.setAttribute('aria-label', t('rr.item').replace('{mon}', ITEMS[name][lang()]));
        b.style.left = (xs[j] / W * 100).toFixed(3) + '%';
        b.style.bottom = ((H - S.feet - 6) / H * 100).toFixed(3) + '%';
        b.style.height = (hPx / H * 100).toFixed(3) + '%';
        b.style.setProperty('--rr-from', -(S.feet * S.k + 40).toFixed(0) + 'px');
        b.style.setProperty('--rr-turn', ((Math.random() - 0.5) * 70).toFixed(0) + 'deg');
        b.style.animationDelay = (j * 0.18).toFixed(2) + 's';
        b.innerHTML = '<img src="' + RAC + name + '.webp" alt="" draggable="false">';
        // a tap here is not a walk
        ['pointerdown', 'click'].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        b.addEventListener('click', function () { pick(j); });
        ctx.world.appendChild(b);
        pieces.push({ el: b, x: xs[j], name: name, up: false });
      });

      // the strip at the top: what happened, and the clock
      var bar = document.createElement('div');
      bar.className = 'rr-bar';
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'polite');
      bar.innerHTML = '<span class="rr-bar-t"></span>' +
        '<span class="rr-clock" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="rr-ring-bg"/>' +
        '<circle cx="18" cy="18" r="15" class="rr-ring"/></svg><b></b></span>';
      ctx.stage.appendChild(bar);
      var ring = bar.querySelector('.rr-ring'), num = bar.querySelector('.rr-clock b'), txt = bar.querySelector('.rr-bar-t');
      function paintBar() {
        var rest = pieces.filter(function (p) { return !p.up; }).length;
        txt.textContent = late ? t('rr.wait') : (n > 1 ? t('rr.felln').replace('{n}', n) : t('rr.fell1')) +
          (n > 1 && rest < n ? ' · ' + t('rr.left').replace('{n}', rest) : '');
        bar.classList.toggle('is-late', late);
        num.textContent = late ? '' : String(Math.max(0, Math.ceil(left)));
        ring.style.strokeDashoffset = (94.25 * (1 - Math.max(0, left) / secs)).toFixed(2);
      }
      paintBar();

      var udon = null, tug = null, tugT = 0;
      var tick = setInterval(function () {
        if (!ctx.out()) { end(false); return; }
        if (done || late || !ctx.calm()) return;
        left -= 0.25;
        paintBar();
        if (left <= 0) tooLate();
      }, 250);

      function pick(j) {
        var p = pieces[j];
        if (!p || p.up || ended) return;
        p.up = true;
        p.el.classList.add('is-up');
        p.el.disabled = true;
        setTimeout(function () { p.el.remove(); }, 450);
        blip(ctx);
        var s = load();
        s.n += 1;
        var badge = BADGES.filter(function (b) { return s.n >= b && s.badges.indexOf(b) < 0; })[0];
        if (badge) s.badges.push(badge);
        save(s);
        paintBar();
        if (pieces.every(function (q) { return q.up; })) finish(badge);
      }

      // too slow: Udon runs in from the litter's side, tugs a hem, and the
      // visitor is pulled back to it; he waits there till it is picked
      function tooLate() {
        late = true;
        paintBar();
        var target = pieces.filter(function (p) { return !p.up; })[0];
        if (!target) return;
        var p0 = ctx.player().x, side = target.x >= p0 ? 1 : -1;
        udon = document.createElement('span');
        udon.className = 'rr-udon is-run f1';
        udon.setAttribute('aria-hidden', 'true');
        udon.innerHTML = '<img class="rr-u-run1" src="' + RAC + 'ud-chay-1.webp" alt="">' +
          '<img class="rr-u-run2" src="' + RAC + 'ud-chay-2.webp" alt="">' +
          '<img class="rr-u-sit" src="' + RAC + 'ud-ngoi-cho.webp" alt="">' +
          '<img class="rr-u-hop" src="' + RAC + 'ud-nhay.webp" alt="">';
        udon.style.bottom = ((H - S.feet - 4) / H * 100).toFixed(3) + '%';
        udon.style.height = (S.playerH * 0.3 / H * 100).toFixed(3) + '%';
        // the drawings run left: flipped when he comes from the left; he
        // keeps facing the visitor while pulling back to the litter
        udon.classList.toggle('is-flip', side < 0);
        var from = side > 0 ? Math.min(W - 60, (ctx.scene().cam + ctx.scene().viewW) / ctx.scene().k + 80)
                            : Math.max(60, ctx.scene().cam / ctx.scene().k - 80);
        var at = p0 + side * 90;
        ctx.world.appendChild(udon);
        var place = function (x) { udon.style.left = (x / W * 100).toFixed(3) + '%'; };
        place(reduce ? at : from);
        var flip = setInterval(function () {
          if (!udon) { clearInterval(flip); return; }
          udon.classList.toggle('f1'); udon.classList.toggle('f2');
        }, 140);
        var runMs = reduce ? 0 : 650, t0 = performance.now();
        (function run(now) {
          var k = runMs ? Math.min(1, (now - t0) / runMs) : 1;
          if (!udon) return;
          place(from + (at - from) * k);
          if (k < 1) { requestAnimationFrame(run); return; }
          clearInterval(flip);
          showTug(target);
          // pulled back, facing away, Udon going ahead of the visitor
          var stopAt = target.x - side * 120;
          ctx.drag(stopAt, reduce ? 0 : 1300, function () {
            if (!udon) return;
            udon.className = 'rr-udon is-sit' + (side > 0 ? ' is-flip' : '');   // sitting, he looks right
            place(target.x + side * 70);
          }, function (x) { place(x + side * 90); });
        })(performance.now());
      }

      // the close-up: Udon's teeth on a trouser hem, with his line
      function showTug(target) {
        tug = document.createElement('div');
        tug.className = 'rr-tug f1';
        tug.setAttribute('role', 'status');
        var k = 1 + Math.floor(Math.random() * LINES);
        tug.innerHTML = '<p class="rr-tug-say">' + esc(t('rr.l' + k).replace('{mon}', ITEMS[target.name][lang()])) + '</p>' +
          '<img class="rr-keo1" src="' + RAC + 'ud-keo-1.webp" alt="">' +
          '<img class="rr-keo2" src="' + RAC + 'ud-keo-2.webp" alt="">';
        ctx.stage.appendChild(tug);
        var m = 0;
        tugT = setInterval(function () {
          if (!tug) { clearInterval(tugT); return; }
          m++;
          if (!reduce) { tug.classList.toggle('f1'); tug.classList.toggle('f2'); }
          if (m > 18) {
            clearInterval(tugT);
            tug.classList.add('is-out');
            var g = tug; tug = null;
            setTimeout(function () { g.remove(); }, 320);
          }
        }, 150);
      }

      function finish(badge) {
        done = true;
        clearInterval(tick);
        bar.classList.add('is-done');
        txt.textContent = t('rr.thanks');
        num.textContent = '';
        if (tug) { clearInterval(tugT); tug.remove(); tug = null; }
        if (udon) {
          udon.className = 'rr-udon is-hop' + (udon.classList.contains('is-flip') ? ' is-flip' : '');
          var u = udon; udon = null;
          setTimeout(function () { u.classList.add('is-out'); }, 700);
          setTimeout(function () { u.remove(); }, 1100);
        }
        var s = load(), m = nextMsg(s);
        save(s);
        if (ctx.picked) ctx.picked();   // counted now: a reload with the card open is not a second fall
        var card = document.createElement('div');
        card.className = 'rr-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', t('rr.msg_h'));
        card.innerHTML = (badge ? '<div class="rr-card-badge">' + badgeSvg(badge) + '<div><p class="rr-cat">' + esc(t('rr.badge_h')) + '</p>' +
            '<p class="rr-text"><b>' + esc(t('rr.b' + badge)) + '</b> · ' + esc(t('rr.badge_p').replace('{n}', badge)) + '</p></div></div>' : '') +
          (m ? msgHtml(m) : '<p class="rr-text">' + esc(t('rr.thanks')) + '</p>') +
          '<p class="rr-count">' + esc(t('rr.count').replace('{n}', s.n)) + '</p>' +
          '<button type="button" class="st-btn rr-close">' + esc(t('rr.close')) + '</button>';
        ['pointerdown', 'click'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        ctx.stage.appendChild(card);
        card.querySelector('.rr-close').addEventListener('click', function () { end(true); });
        card.querySelector('.rr-close').focus({ preventScroll: true });
        setTimeout(function () { bar.classList.add('is-out'); }, 1200);
      }

      // over: tidy everything; went = it was dealt with (not left behind indoors)
      function end(went) {
        if (ended) return;
        ended = true;
        clearInterval(tick);
        clearInterval(tugT);
        [bar, tug, udon, ctx.stage.querySelector('.rr-card')].forEach(function (el) { if (el && el.parentNode) el.remove(); });
        pieces.forEach(function (p) { if (p.el.parentNode) p.el.remove(); });
        udon = null; tug = null;
        resolve({ picked: !!went });
      }
    });
  }

  /* ---------- Sổ thông điệp (Tủ sưu tầm) ---------- */
  function bookHtml() {
    var s = load();
    var opened = s.seen.map(msgById).filter(Boolean);
    return '<section class="rr-book">' +
      (s.badges.length ? '<h3 class="tu-h">' + esc(t('rr.badges')) + '</h3><ul class="rr-badges">' + s.badges.map(function (b) {
        return '<li>' + badgeSvg(b) + '<span><b>' + esc(t('rr.b' + b)) + '</b><br>' + b + '</span></li>';
      }).join('') + '</ul>' : '') +
      '<h3 class="tu-h">' + esc(t('rr.book')) + '</h3>' +
      '<p class="tu-small">' + esc(opened.length ? t('rr.book_p').replace('{n}', opened.length).replace('{t}', MSGS.length) : t('rr.book_0')) + '</p>' +
      (opened.length ? '<ol class="rr-list">' + opened.map(function (m) { return '<li>' + msgHtml(m) + '</li>'; }).join('') + '</ol>' : '') +
      '</section>';
  }

  return { drop: drop, bookHtml: bookHtml, stats: load, count: function () { return MSGS.length; }, ITEMS: ITEMS, MSGS: MSGS };
})();
