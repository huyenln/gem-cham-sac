// Gem Chạm Sắc — trình lắp Studio Gem (tab "Lắp studio" trong admin.html, chỉ owner)
//
// Pick a background strip, drop pieces from the asset library (or upload a
// new one to the gem-media bucket), drag to move, drag a corner to resize,
// drag the round handle to rotate. Hotspots (what opens when tapped), the
// spot where the character stops for each, Udon and the start point are
// placed the same way. "Ngoài cửa" switches to the street in front of the
// studio (layout.outside), where studio.html opens. "Lưu nháp" saves the
// draft; "Xuất bản" makes it what customers see. studio.html?nhap=1 previews the draft (owner only).
//
// Layout format and validation: js/studio-layout.js. RLS on studio_layout
// lets only the owner write; this screen is a convenience, not the lock.

window.GemStudioEditor = (function () {
  'use strict';

  var L = window.GemLayout;
  var DB = window.GemDB;

  var root, stageEl, worldEl, panelEl, statusEl;
  var lib = null;           // assets.json
  var data = null;          // the layout being edited
  var sel = null;           // { kind: 'item'|'hot'|'udon'|'stand'|'start', i | id }
  var undo = [];
  var k = 0.45;             // screen px per strip px
  var zoom = 1;
  var dirty = false;
  var group = 'cua';
  var profiles = [];        // [{ id, name, updated_at }] saved layouts ('p-…')
  var liveName = null;      // name of the profile that is live, if any
  var current = null;       // profile id loaded in the editor (null = draft)
  var scene = 'in';
  var showHot = true;       // hotspot boxes + stop markers on the stage         // 'in' = the studio, 'out' = the street in front (data.outside)

  // The part of the layout on screen: the studio itself or the street.
  function S() { return scene === 'out' ? data.outside : data; }
  function spots() { return scene === 'out' ? L.OUT_SPOTS : L.SPOTS; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function status(msg, bad) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('bad', !!bad);
  }
  function remember() {
    undo.push(clone(data));
    if (undo.length > 60) undo.shift();
    dirty = true;
    status('Có thay đổi chưa lưu');
  }

  /* ---------- mount ---------- */
  function mount(el) {
    root = el;
    // Compact on purpose: one tool row, saving + saved layouts tucked in the
    // "Lưu" menu, so the stage gets the screen (on a phone especially).
    root.innerHTML =
      '<div class="se">' +
        '<div class="se-bar">' +
          '<span class="se-seg" role="group" aria-label="Cảnh">' +
            '<button type="button" class="is-on" data-se="sc-in" aria-pressed="true">Trong</button>' +
            '<button type="button" data-se="sc-out" aria-pressed="false">Ngoài cửa</button>' +
          '</span>' +
          '<select class="se-bgsel" aria-label="Nền"></select>' +
          '<span class="se-seg se-len" role="group" aria-label="Chiều dài khu vực">' +
            '<button type="button" data-se="w-" title="Bớt một đoạn tường">Ngắn lại</button>' +
            '<button type="button" data-se="w+" title="Nối thêm một đoạn tường">Dài thêm</button>' +
          '</span>' +
          '<button type="button" class="se-tb" data-se="undo" title="Hoàn tác (Ctrl+Z)">Hoàn tác</button>' +
          '<button type="button" class="se-tb se-sq" data-se="zout" aria-label="Thu nhỏ">−</button>' +
          '<button type="button" class="se-tb se-sq" data-se="zin" aria-label="Phóng to">+</button>' +
          '<button type="button" class="se-tb" data-se="hot" aria-pressed="true" title="Hiện / ẩn khung bấm">Khung bấm</button>' +
          '<button type="button" class="se-tb danger" data-se="clear">Xoá hết</button>' +
          '<details class="se-menu">' +
            '<summary class="se-tb on">Lưu</summary>' +
            '<div class="se-pop">' +
              '<div class="se-row">' +
                '<button type="button" class="ad-btn" data-se="save">Lưu nháp</button>' +
                '<button type="button" class="ad-btn on" data-se="publish">Xuất bản</button>' +
                '<a class="ad-btn" href="studio.html?nhap=1" target="_blank" rel="noopener">Xem thử nháp</a>' +
              '</div>' +
              '<div class="se-prof">' +
                '<b>Bố cục đã lưu</b>' +
                '<select class="se-profsel" aria-label="Bố cục đã lưu"></select>' +
                '<div class="se-row">' +
                  '<button type="button" class="ad-btn" data-se="p-open">Mở</button>' +
                  '<button type="button" class="ad-btn on" data-se="p-live">Cho chạy ngay</button>' +
                  '<button type="button" class="ad-btn danger" data-se="p-del">Xoá</button>' +
                '</div>' +
                '<div class="se-row">' +
                  '<button type="button" class="ad-btn" data-se="p-save">Lưu vào bố cục đang mở</button>' +
                  '<button type="button" class="ad-btn" data-se="p-new">Lưu thành bố cục mới…</button>' +
                '</div>' +
                '<span class="se-live"></span>' +
              '</div>' +
            '</div>' +
          '</details>' +
        '</div>' +
        '<p class="se-status" role="status"></p>' +
        '<div class="se-stage"><div class="se-world"><img class="se-bgimg" alt="" draggable="false"></div></div>' +
        '<div class="se-panel"></div>' +
      '</div>';
    stageEl = root.querySelector('.se-stage');
    worldEl = root.querySelector('.se-world');
    panelEl = root.querySelector('.se-panel');
    statusEl = root.querySelector('.se-status');
    status('Đang tải...');

    root.querySelector('.se-bar').addEventListener('click', barClick);
    root.querySelector('.se-prof').addEventListener('click', profClick);
    // the Lưu menu closes when you tap elsewhere
    document.addEventListener('click', menuAway);
    root.querySelector('.se-bgsel').addEventListener('change', function (e) {
      var b = lib.backgrounds[e.target.value === '' ? -1 : +e.target.value];
      if (!b) return;
      remember();
      S().bg = { src: b.src, w: b.w, h: b.h };
      draw();
    });
    // Pinch first (capture), so a second finger never starts a drag.
    worldEl.addEventListener('pointerdown', pinchDown, true);
    worldEl.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointermove', pinchMove);
    document.addEventListener('pointerup', pinchUp);
    document.addEventListener('pointercancel', pinchUp);
    panelEl.addEventListener('click', panelClick);
    panelEl.addEventListener('change', panelChange);
    panelEl.addEventListener('input', function (e) {
      if (e.target.name !== 'se-size' || !sel || sel.kind !== 'item') return;
      resize(S().items[sel.i], +e.target.value);
      var num = panelEl.querySelector('[name="se-h"]');
      if (num) num.value = e.target.value;
      dirty = true;
      draw();
    });
    document.addEventListener('keydown', keyDown);
    window.addEventListener('resize', draw);

    return Promise.all([
      fetch('images/studio/assets.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
      DB.studioLayout('draft').catch(function () { return null; }),
      DB.studioLayout('live').catch(function () { return null; })
    ]).then(function (r) {
      lib = r[0];
      data = L.sanitize(r[1]) || L.sanitize(r[2]) || L.blank(lib.backgrounds[0]);
      syncBg();
      status(r[1] ? 'Đang sửa bản nháp' : r[2] ? 'Bắt đầu từ bản đang chạy' : 'Bố cục mới');
      draw();
      renderPanel();
      // product list for "Sản phẩm" on a piece (owner is signed in)
      DB.adminProducts().then(function (rows) { prods = rows || []; renderPanel(); }, function () { prods = []; });
      if (queued) { var q = queued; queued = null; placeProduct(q.sku, q.image); }
      return loadProfiles();
    }).catch(function (err) {
      status('Không tải được: ' + (err.message || ''), true);
    });
  }

  /* ---------- real products in the studio ----------
     A piece with a sku is a product: customers tap it for its card or drag
     it into the basket. The Sản phẩm tab sends one here with queueProduct. */
  var prods = [];        // [{ sku, name_vi, image }]
  var queued = null;     // product waiting for the editor to finish loading

  function placeProduct(sku, image) {
    if (scene !== 'in') setScene('in');
    var cut = null;
    lib.groups.forEach(function (g) { g.items.forEach(function (a) { if (a.sku === sku) cut = a; }); });
    if (cut) add(cut);
    else if (image && L.srcOk(image)) add({ src: image, w: 600, h: 600, frame: true, sku: sku });
    else { status('Sản phẩm này chưa có ảnh — thêm ảnh ở tab Sản phẩm, hoặc ảnh cắt nền ở images/studio/sp/' + sku + '.webp', true); return; }
    status('Đã thêm "' + sku + '" giữa màn hình — kéo lên kệ rồi Xuất bản');
  }

  function queueProduct(sku, image) {
    if (data && lib) placeProduct(sku, image);
    else queued = { sku: sku, image: image };
  }

  // Backgrounds for the scene on screen only: the street for 'Ngoài cửa',
  // studio walls for 'Trong' (a street behind the studio's hotspots made no sense).
  function syncBg() {
    var el = root.querySelector('.se-bgsel');
    var want = scene === 'out' ? 'out' : 'in';
    el.innerHTML = lib.backgrounds.map(function (b, i) {
      if ((b.scene || 'in') !== want) return '';
      return '<option value="' + i + '"' + (b.src === S().bg.src ? ' selected' : '') + '>' + esc(b.label || b.src.split('/').pop()) + '</option>';
    }).join('');
    if (!lib.backgrounds.some(function (b) { return b.src === S().bg.src; })) {
      el.insertAdjacentHTML('afterbegin', '<option value="" selected>' + esc(S().bg.src.split('/').pop()) + '</option>');
    }
  }

  // "Ngắn lại / Dài thêm": only for walls with a seamless loop (GemLayout.EXTEND).
  function syncLen() {
    var e = L.EXTEND[S().bg.src];
    var less = root.querySelector('[data-se="w-"]'), more = root.querySelector('[data-se="w+"]');
    more.disabled = !e || S().bg.w + e.tileW > 20000;
    less.disabled = !e || S().bg.w <= e.w0;
    var why = e ? '' : 'Nền này không nối dài được — chọn "Tường trơn" (hoặc Mặt tiền ở Ngoài cửa)';
    more.title = why || 'Nối thêm một đoạn tường (' + e.tileW + ' px)';
    less.title = why || 'Bớt một đoạn tường';
  }

  function lengthen(dir) {
    var e = L.EXTEND[S().bg.src];
    if (!e) return;
    var w = S().bg.w + dir * e.tileW;
    if (w < e.w0 || w > 20000) return;
    remember();
    S().bg.w = w;
    var out = S().items.filter(function (it) { return it.x - it.w / 2 > w; }).length;
    draw();
    if (dir > 0) stageEl.scrollLeft = stageEl.scrollWidth;   // show the new wall
    status('Khu vực dài ' + w.toLocaleString('vi-VN') + ' px' +
      (out ? ' — ' + out + ' món nằm ngoài tường, kéo vào hoặc Dài thêm lại' : ''));
  }

  function setScene(name) {
    scene = name;
    sel = null;
    root.querySelectorAll('[data-se^="sc-"]').forEach(function (b) {
      var on = b.dataset.se === 'sc-' + name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
    });
    syncBg();
    stageEl.scrollLeft = 0;
    draw(); renderPanel();
  }

  function menuAway(e) {
    var m = root && root.querySelector('.se-menu');
    if (m && m.open && !m.contains(e.target)) m.open = false;
  }

  function unmount() {
    document.removeEventListener('click', menuAway);
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('pointermove', pinchMove);
    document.removeEventListener('pointerup', pinchUp);
    document.removeEventListener('pointercancel', pinchUp);
    window.removeEventListener('resize', draw);
  }

  /* ---------- drawing ---------- */
  function px(v) { return (v * k).toFixed(1) + 'px'; }

  function draw() {
    if (!data || !worldEl) return;
    // A piece is selected: fingers belong to it (pinch / drag), not to
    // scrolling. Tap empty wall to deselect and scroll again.
    stageEl.style.touchAction = sel && sel.kind === 'item' ? 'none' : '';
    var h = stageEl.clientHeight || 420;
    k = (h - 40) / S().bg.h * zoom;   // minus the stage padding
    worldEl.style.width = px(S().bg.w);
    worldEl.style.height = px(S().bg.h);
    var bg = worldEl.querySelector('.se-bgimg');
    if (bg.getAttribute('src') !== S().bg.src) bg.src = S().bg.src;
    worldEl.querySelectorAll('.se-el, .se-bgx').forEach(function (n) { n.remove(); });
    var parts = L.bgParts(S().bg);   // a lengthened wall: picture + loop + corner
    bg.style.visibility = parts.length > 1 ? 'hidden' : '';
    if (parts.length > 1) parts.forEach(function (part) {
      var d = document.createElement('div');
      d.className = 'se-bgx';
      Object.assign(d.style, L.partStyle(part, S().bg.w));
      bg.insertAdjacentElement('afterend', d);
    });
    syncLen();

    S().items.forEach(function (it, i) {
      var n = document.createElement('div');
      n.className = 'se-el se-item' + (it.layer === 'front' ? ' is-front' : '') + (it.frame ? ' is-frame' : '') + (it.sku ? ' is-prod' : '') +
        (isSel('item', i) ? ' is-sel' : '');
      n.dataset.kind = 'item'; n.dataset.i = i;
      place(n, it.x - it.w / 2, it.y - it.h / 2, it.w, it.h);
      n.style.transform = 'rotate(' + it.rot + 'deg)';
      var img = document.createElement('img');
      img.src = it.src; img.alt = ''; img.draggable = false;
      if (it.flip) img.style.transform = 'scaleX(-1)';
      n.appendChild(img);
      if (isSel('item', i)) handles(n, true);
      worldEl.appendChild(n);
    });

    // character at the start + floor line, for scale
    var feet = L.FEET_Y, ph = 410;
    var guy = document.createElement('div');
    guy.className = 'se-el se-start' + (isSel('start') ? ' is-sel' : '');
    guy.dataset.kind = 'start';
    place(guy, S().start - 70, feet - ph, 140, ph);
    guy.innerHTML = '<img src="images/studio/char/p1-front.webp" alt="" draggable="false"><span>Điểm xuất phát</span>';
    worldEl.appendChild(guy);
    var floor = document.createElement('div');
    floor.className = 'se-el se-floor';
    place(floor, 0, feet, S().bg.w, 2);
    worldEl.appendChild(floor);

    if (showHot) spots().forEach(function (sp) {
      var o = S().hot[sp.id], b = o.box;
      var n = document.createElement('div');
      n.className = 'se-el se-hot' + (isSel('hot', sp.id) ? ' is-sel' : '') + (spotCfg(sp.id).off ? ' is-off' : '') +
        (spotCfg(sp.id).link || spotCfg(sp.id).act ? ' is-link' : '');
      n.dataset.kind = 'hot'; n.dataset.id = sp.id;
      place(n, b[0], b[1], b[2] - b[0], b[3] - b[1]);
      if (isSel('hot', sp.id)) handles(n, false);
      worldEl.appendChild(n);
      // The box sits BEHIND the pieces (so a product on a shelf inside it can
      // still be picked and moved); its name tag stays on top and is the
      // handle that selects the box. Selected, the box comes up front.
      var tag = document.createElement('div');
      tag.className = 'se-el se-hot-tag' + (isSel('hot', sp.id) ? ' is-sel' : '');
      tag.dataset.kind = 'hot'; tag.dataset.id = sp.id;
      tag.textContent = (spotCfg(sp.id).vi || sp.vi) + (spotCfg(sp.id).off ? ' (đang tắt)' : (spotCfg(sp.id).link || spotCfg(sp.id).act) ? ' →' : '');
      tag.style.left = px((b[0] + b[2]) / 2);
      tag.style.top = px(b[1]);
      worldEl.appendChild(tag);
      var st = document.createElement('div');
      st.className = 'se-el se-stand' + (isSel('stand', sp.id) ? ' is-sel' : '');
      st.dataset.kind = 'stand'; st.dataset.id = sp.id;
      place(st, o.stand - 14, feet - 60, 28, 64);
      st.title = 'Chỗ dừng: ' + sp.vi;
      worldEl.appendChild(st);
    });

    if (scene === 'out') return;   // Udon lives in the studio
    var u = data.udon;
    var un = document.createElement('div');
    un.className = 'se-el se-udon' + (isSel('udon') ? ' is-sel' : '');
    un.dataset.kind = 'udon';
    place(un, u.x, u.y, u.w, u.h);
    un.innerHTML = '<img src="images/studio/udon/ud-ngoi-a.webp" alt="" draggable="false">';
    if (isSel('udon')) handles(un, false);
    worldEl.appendChild(un);
  }

  function place(n, x, y, w, h) {
    n.style.left = px(x); n.style.top = px(y); n.style.width = px(w); n.style.height = px(h);
  }

  function handles(n, rotate) {
    ['nw', 'ne', 'sw', 'se'].forEach(function (c) {
      var hd = document.createElement('span');
      hd.className = 'se-h se-h-' + c; hd.dataset.handle = c;
      n.appendChild(hd);
    });
    if (rotate) {
      var r = document.createElement('span');
      r.className = 'se-rot'; r.dataset.handle = 'rot';
      n.appendChild(r);
    }
  }

  function isSel(kind, key) {
    if (!sel || sel.kind !== kind) return false;
    return key == null || sel.i === key || sel.id === key;
  }

  /* ---------- pointer: move / resize / rotate ---------- */
  function toStrip(e) {
    var r = worldEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  }

  /* ---------- two fingers: pinch to resize, twist to rotate ---------- */
  var touches = {};       // pointerId -> { x, y } in screen px (scroll can't skew them)
  var pinch = null;       // { d0, a0, mid0, start, before }
  var pinchGen = 0;       // bumps on every pinch: a drag that saw one stops

  function pair() {
    var ids = Object.keys(touches).slice(0, 2);
    var a = touches[ids[0]], b = touches[ids[1]];
    return { ids: ids, d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  function pinchDown(e) {
    if (e.pointerType !== 'touch') return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(touches).length !== 2 || !sel || sel.kind !== 'item') return;
    e.stopPropagation();          // not a new selection / drag
    e.preventDefault();
    var p = pair();
    pinchGen++;
    pinch = { d0: p.d, a0: p.ang, mid0: p.mid, start: clone(S().items[sel.i]), before: clone(data) };
  }

  function pinchMove(e) {
    if (!(e.pointerId in touches)) return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!pinch || !sel || sel.kind !== 'item') return;
    e.preventDefault();
    var p = pair(), it = S().items[sel.i], st = pinch.start;
    var s = Math.max(0.05, p.d / pinch.d0);
    it.w = Math.max(8, Math.round(st.w * s));
    it.h = Math.max(8, Math.round(st.h * s));
    var r = st.rot + (p.ang - pinch.a0) * 180 / Math.PI;
    r = ((r + 540) % 360) - 180;
    it.rot = Math.abs(r) < 4 ? 0 : Math.round(r);
    it.x = Math.round(st.x + (p.mid.x - pinch.mid0.x) / k);
    it.y = Math.round(st.y + (p.mid.y - pinch.mid0.y) / k);
    draw();
  }

  function pinchUp(e) {
    delete touches[e.pointerId];
    if (pinch && Object.keys(touches).length < 2) {
      undo.push(pinch.before);
      dirty = true;
      status('Có thay đổi chưa lưu');
      pinch = null;
      renderPanel();
    }
  }

  function pointerDown(e) {
    if (pinch || Object.keys(touches).length > 1) return;   // second finger of a pinch
    var n = e.target.closest('.se-el');
    if (!n || n.classList.contains('se-floor')) {
      if (sel) { sel = null; draw(); renderPanel(); }
      return;
    }
    e.preventDefault();
    var kind = n.dataset.kind;
    sel = { kind: kind, i: n.dataset.i != null ? +n.dataset.i : null, id: n.dataset.id || null };
    var handle = e.target.dataset.handle || null;
    var p0 = toStrip(e);
    var before = clone(data);
    var obj = target();
    var start = clone(obj);
    var moved = false;
    var gen = pinchGen;

    function move(ev) {
      if (pinch || gen !== pinchGen) return;   // two fingers took over this gesture
      var p = toStrip(ev);
      var dx = p.x - p0.x, dy = p.y - p0.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2 / k) return;
      moved = true;
      if (kind === 'item') {
        if (handle === 'rot') {
          var a0 = Math.atan2(p0.y - start.y, p0.x - start.x), a1 = Math.atan2(p.y - start.y, p.x - start.x);
          var r = start.rot + (a1 - a0) * 180 / Math.PI;
          r = ((r + 540) % 360) - 180;
          if (Math.abs(r) < 4) r = 0;
          obj.rot = Math.round(r);
        } else if (handle) {
          // corner: scale about the centre, aspect kept (works rotated too)
          var d0 = Math.hypot(p0.x - start.x, p0.y - start.y) || 1;
          var s = Math.max(0.05, Math.hypot(p.x - start.x, p.y - start.y) / d0);
          obj.w = Math.max(8, Math.round(start.w * s));
          obj.h = Math.max(8, Math.round(start.h * s));
        } else {
          obj.x = Math.round(start.x + dx); obj.y = Math.round(start.y + dy);
        }
      } else if (kind === 'hot') {
        var b = start.box.slice();
        if (!handle) { b = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]; }
        else {
          if (handle.indexOf('w') >= 0) b[0] = Math.min(b[2] - 30, start.box[0] + dx);
          if (handle.indexOf('e') >= 0) b[2] = Math.max(b[0] + 30, start.box[2] + dx);
          if (handle.indexOf('n') >= 0) b[1] = Math.min(b[3] - 30, start.box[1] + dy);
          if (handle.indexOf('s') >= 0) b[3] = Math.max(b[1] + 30, start.box[3] + dy);
        }
        obj.box = b.map(Math.round);
      } else if (kind === 'udon') {
        if (handle) {
          var s2 = Math.max(0.2, (start.w + dx) / start.w);
          obj.w = Math.round(start.w * s2); obj.h = Math.round(start.h * s2);
        } else { obj.x = Math.round(start.x + dx); obj.y = Math.round(start.y + dy); }
      } else if (kind === 'stand') {
        obj.stand = Math.round(start.stand + dx);
      } else if (kind === 'start') {
        S().start = Math.round(Math.max(120, Math.min(S().bg.w - 120, start.v + dx)));
      }
      draw();
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      if (moved) {
        undo.push(before); dirty = true; status('Có thay đổi chưa lưu');
      }
      draw(); renderPanel();
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    draw(); renderPanel();
  }

  // the object the selection points at (start is wrapped so it can be edited)
  function target() {
    if (!sel) return null;
    if (sel.kind === 'item') return S().items[sel.i];
    if (sel.kind === 'hot' || sel.kind === 'stand') return S().hot[sel.id];
    if (sel.kind === 'udon') return data.udon;
    if (sel.kind === 'start') return { v: S().start };
    return null;
  }

  function keyDown(e) {
    if (!root || !document.body.contains(root) || !data) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); return; }
    if (!sel || sel.kind !== 'item') return;
    var it = S().items[sel.i];
    var step = e.shiftKey ? 20 : 2;
    var m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); remember(); it.x += m[0]; it.y += m[1]; draw(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('del'); }
  }

  function doUndo() {
    var last = undo.pop();
    if (!last) return;
    data = last; sel = null; dirty = true;
    syncBg();
    status('Đã hoàn tác');
    draw(); renderPanel();
  }

  /* ---------- side panel: selection tools + library ---------- */
  function renderPanel() {
    if (!lib) return;
    var tools = '';
    if (sel && sel.kind === 'item') {
      var it = S().items[sel.i];
      // one strip of small controls; scrolls sideways on a phone
      tools = '<div class="se-tools">' +
        '<span class="se-seg" role="group" aria-label="Lớp">' +
          '<button type="button" data-act="back" class="' + (it.layer !== 'front' ? 'is-on' : '') + '">Sau người</button>' +
          '<button type="button" data-act="front" class="' + (it.layer === 'front' ? 'is-on' : '') + '">Trước người</button>' +
        '</span>' +
        '<label class="se-size">Cỡ <input type="range" name="se-size" min="20" max="1000" step="5" value="' + Math.round(it.h) + '">' +
          '<input type="number" name="se-h" min="20" max="2000" step="5" value="' + Math.round(it.h) + '" aria-label="Chiều cao (px)"></label>' +
        '<label class="se-size">Xoay <input type="number" name="se-rot" value="' + it.rot + '" step="1" min="-180" max="180" aria-label="Xoay (độ)">°</label>' +
        '<button type="button" class="se-tb" data-act="flip">Lật</button>' +
        '<button type="button" class="se-tb" data-act="up" title="Đưa lên trên các món khác">Lên</button>' +
        '<button type="button" class="se-tb" data-act="down" title="Đưa xuống dưới các món khác">Xuống</button>' +
        '<button type="button" class="se-tb" data-act="frame">' + (it.frame ? 'Bỏ khung' : 'Khung gỗ') + '</button>' +
        '<button type="button" class="se-tb" data-act="dup">Nhân bản</button>' +
        '<button type="button" class="se-tb danger" data-act="del">Xoá</button>' +
        '<label class="se-size" title="Món gắn sản phẩm: khách chạm để xem, kéo vào giỏ để mua">Sản phẩm ' +
          '<select name="se-sku"><option value="">(chỉ trang trí)</option>' +
          prods.map(function (p) {
            return '<option value="' + esc(p.sku) + '"' + (p.sku === it.sku ? ' selected' : '') + '>' + esc(p.name_vi) + '</option>';
          }).join('') +
          (it.sku && !prods.some(function (p) { return p.sku === it.sku; }) ? '<option selected value="' + esc(it.sku) + '">' + esc(it.sku) + '</option>' : '') +
        '</select></label>' +
      '</div>';
    } else if (sel && (sel.kind === 'hot' || sel.kind === 'stand')) {
      var name = spots().filter(function (x) { return x.id === sel.id; })[0].vi;
      var c = spotCfg(sel.id);
      // settings for this spot: on / off, its label, a page to open instead
      tools = '<div class="se-tools se-spot">' +
        '<b>' + esc(name) + '</b>' +
        (sel.id === 'enter' ? '' :
          '<label><input type="checkbox" name="sp-on"' + (c.off ? '' : ' checked') + '> Hiện trong studio</label>') +
        '<label>Tên hiện <input name="sp-vi" maxlength="40" placeholder="' + esc(name) + '" value="' + esc(c.vi || '') + '"></label>' +
        '<label>Tên tiếng Anh <input name="sp-en" maxlength="40" placeholder="(để trống: tên có sẵn)" value="' + esc(c.en || '') + '"></label>' +
        // what a tap does: its own window, another spot's, a page, or nothing
        '<label>Khi bấm <select name="sp-act"><option value="">(mặc định của điểm này)</option>' +
          L.ACTS.map(function (x) {
            var cur = c.act || (c.link ? 'link' : '');
            return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.vi) + '</option>';
          }).join('') + '</select></label>' +
        ((c.act || (c.link ? 'link' : '')) === 'link'
          ? '<label>Trang <input name="sp-link" maxlength="300" placeholder="vd: workshop.html hoặc https://…" value="' + esc(c.link || '') + '"></label>'
          : '') +
        '<span class="se-hint-s">Khung nét đứt = chỗ khách chạm; cột đỏ ở sàn = chỗ nhân vật dừng.</span>' +
      '</div>';
    } else {
      tools = '<details class="se-help"><summary>Cách dùng</summary><p>Chạm một món ở thư viện để thêm vào giữa màn hình. ' +
        'Kéo để di chuyển, kéo góc để đổi cỡ, kéo nút tròn để xoay. Điện thoại: chụm / mở hai ngón để đổi cỡ, vặn hai ngón để xoay. ' +
        'Phím mũi tên dịch từng chút, Ctrl+Z hoàn tác. "Khung bấm" ẩn các khung xanh khi xếp đồ.</p></details>';
    }
    var g = lib.groups.filter(function (x) { return x.id === group; })[0] || lib.groups[0];
    panelEl.innerHTML = tools +
      '<div class="se-lib">' +
        '<div class="se-tabs">' + lib.groups.map(function (x) {
          return '<button type="button" class="se-chip' + (x.id === g.id ? ' is-on' : '') + '" data-group="' + esc(x.id) + '">' +
            esc(x.label) + '</button>';
        }).join('') +
        '<label class="se-chip se-upload">+ Tải ảnh<input type="file" accept="image/png,image/webp,image/jpeg" hidden></label>' +
        '</div>' +
        '<div class="se-grid">' + g.items.map(function (a, i) {
          return '<button type="button" class="se-asset" data-asset="' + i + '" title="' + esc(a.src.split('/').pop()) + '">' +
            '<img src="' + esc(a.src) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' +
      '</div>';
  }

  function panelClick(e) {
    var b;
    if ((b = e.target.closest('[data-group]'))) { group = b.dataset.group; renderPanel(); return; }
    if ((b = e.target.closest('[data-asset]'))) {
      var g = lib.groups.filter(function (x) { return x.id === group; })[0] || lib.groups[0];
      add(g.items[+b.dataset.asset]);
      return;
    }
    if ((b = e.target.closest('[data-act]'))) act(b.dataset.act);
  }

  function spotCfg(id) { return (data && data.spots && data.spots[id]) || {}; }

  function spotChange(e) {
    var n = e.target.name;
    if (!data.spots) data.spots = {};
    var c = data.spots[sel.id] || {};
    remember();
    if (n === 'sp-on') { if (e.target.checked) delete c.off; else c.off = true; }
    if (n === 'sp-vi' || n === 'sp-en') {
      var v = e.target.value.trim().slice(0, 40), key = n.slice(3);
      if (v) c[key] = v; else delete c[key];
    }
    if (n === 'sp-act') {
      if (e.target.value) c.act = e.target.value; else delete c.act;
      if (c.act !== 'link') delete c.link;
      if (c.act === 'link' && !c.link) {
        // the page comes next: keep the choice once a page is typed
        if (Object.keys(c).length) data.spots[sel.id] = c;
        draw(); renderPanel();
        return;
      }
    }
    if (n === 'sp-link') {
      var link = e.target.value.trim();
      if (!link) delete c.link;
      else if (L.linkOk(link)) c.link = link;
      else { status('Link chưa đúng: dùng tên trang (vd workshop.html) hoặc địa chỉ bắt đầu bằng https://', true); return; }
    }
    if (Object.keys(c).length) data.spots[sel.id] = c; else delete data.spots[sel.id];
    draw();
    if (n === 'sp-act') renderPanel();
  }

  function panelChange(e) {
    if (e.target.type === 'file') return upload(e.target.files && e.target.files[0]);
    if (sel && (sel.kind === 'hot' || sel.kind === 'stand') && /^sp-/.test(e.target.name)) return spotChange(e);
    if (!sel || sel.kind !== 'item') return;
    var it = S().items[sel.i];
    remember();
    if (e.target.name === 'se-size' || e.target.name === 'se-h') resize(it, +e.target.value);
    if (e.target.name === 'se-rot') it.rot = Math.max(-180, Math.min(180, Math.round(+e.target.value || 0)));
    if (e.target.name === 'se-sku') { if (e.target.value) it.sku = e.target.value; else delete it.sku; renderPanel(); }
    draw();
  }

  function act(a) {
    if (!sel || sel.kind !== 'item') return;
    var i = sel.i, it = S().items[i];
    remember();
    if (a === 'del') { S().items.splice(i, 1); sel = null; }
    else if (a === 'dup') {
      var c = clone(it); c.x += 40; c.y += 20;
      S().items.push(c); sel = { kind: 'item', i: S().items.length - 1 };
    } else if (a === 'flip') it.flip = !it.flip;
    else if (a === 'bigger') resize(it, it.h * 1.15);
    else if (a === 'smaller') resize(it, it.h / 1.15);
    else if (a === 'frame') it.frame = !it.frame;
    else if (a === 'back' || a === 'front') it.layer = a;
    else if (a === 'up' && i < S().items.length - 1) {
      S().items.splice(i, 1); S().items.splice(i + 1, 0, it); sel.i = i + 1;
    } else if (a === 'down' && i > 0) {
      S().items.splice(i, 1); S().items.splice(i - 1, 0, it); sel.i = i - 1;
    }
    draw(); renderPanel();
  }

  // Height in strip px, width follows (aspect kept), centre stays put.
  function resize(it, h) {
    h = Math.max(20, Math.min(2000, Math.round(h) || it.h));
    it.w = Math.max(8, Math.round(it.w * h / it.h));
    it.h = h;
  }

  // New piece in the middle of what's on screen, a sensible size.
  function add(a) {
    if (!a || !L.srcOk(a.src)) return;
    remember();
    var h = a.h0 || (a.frame ? 110 : Math.min(420, a.h * 0.6));   // h0: doors / windows, set in the manifest
    var w = Math.round(h * a.w / a.h);
    var cx = (stageEl.scrollLeft + stageEl.clientWidth / 2) / k;
    var it = { src: a.src, x: Math.round(cx), y: Math.round(a.y0 || L.FEET_Y - h / 2 - 40), w: w, h: Math.round(h),
      rot: 0, flip: false, layer: 'back', frame: !!a.frame };
    if (a.sku) it.sku = a.sku;
    S().items.push(it);
    sel = { kind: 'item', i: S().items.length - 1 };
    draw(); renderPanel();
  }

  function upload(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { status('Ảnh quá 3 MB — nén bớt (squoosh.app, WebP) rồi tải lại.', true); return; }
    status('Đang tải ảnh lên...');
    DB.uploadImage(file).then(function (url) {
      var img = new Image();
      img.onload = function () {
        var a = { src: url, w: img.naturalWidth, h: img.naturalHeight };
        var g = lib.groups.filter(function (x) { return x.id === 'uploads'; })[0];
        if (!g) { g = { id: 'uploads', label: 'Đã tải lên', items: [] }; lib.groups.push(g); }
        g.items.unshift(a);
        group = 'uploads';
        add(a);
        status('Đã tải ảnh lên');
      };
      img.onerror = function () { status('Ảnh tải lên nhưng không mở được.', true); };
      img.src = url;
    }).catch(function (err) { status('Không tải được ảnh: ' + (err.message || ''), true); });
  }

  /* ---------- profiles: named layouts to switch between quickly ---------- */
  function loadProfiles() {
    return DB.studioProfiles().then(function (rows) {
      rows = rows || [];
      profiles = rows.filter(function (r) { return r.id !== 'live'; });
      var live = rows.filter(function (r) { return r.id === 'live'; })[0];
      liveName = live ? live.name : null;
      renderProfiles();
    }).catch(function () { profiles = []; renderProfiles(); });
  }

  function renderProfiles() {
    var selEl = root.querySelector('.se-profsel');
    selEl.innerHTML = profiles.length
      ? profiles.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.name || p.id) +
            (p.name && p.name === liveName ? ' (đang chạy)' : '') + '</option>';
        }).join('')
      : '<option value="">(chưa có)</option>';
    if (current) selEl.value = current;
    var open = profiles.filter(function (p) { return p.id === current; })[0];
    root.querySelector('[data-se="p-save"]').disabled = !open;
    root.querySelector('[data-se="p-save"]').textContent = open ? 'Lưu vào "' + (open.name || open.id) + '"' : 'Lưu vào bố cục đang mở';
    root.querySelector('.se-live').textContent = 'Khách đang thấy: ' + (liveName || (profiles.length ? 'bố cục chưa đặt tên' : '—'));
  }

  function slug(name) {
    var s = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return 'p-' + (s || 'bo-cuc') + '-' + Date.now().toString(36).slice(-4);
  }

  function profClick(e) {
    var b = e.target.closest('[data-se]');
    if (!b || !data) return;
    var a = b.dataset.se;
    var id = root.querySelector('.se-profsel').value;
    var p = profiles.filter(function (x) { return x.id === id; })[0];
    var clean = L.sanitize(data);
    var job = null;

    if (a === 'p-open' && p) {
      if (dirty && !window.confirm('Bố cục đang sửa chưa lưu. Mở bố cục khác?')) return;
      job = DB.studioLayout(id).then(function (d) {
        var ok = L.sanitize(d);
        if (!ok) throw new Error('bố cục hỏng');
        undo.push(clone(data));
        data = ok; current = id; sel = null; dirty = false;
        syncBg(); draw(); renderPanel();
        return 'Đã mở "' + (p.name || id) + '"';
      });
    } else if (a === 'p-live' && p) {
      if (!window.confirm('Cho khách thấy "' + (p.name || id) + '" ngay?')) return;
      job = DB.studioLayout(id).then(function (d) {
        var ok = L.sanitize(d);
        if (!ok) throw new Error('bố cục hỏng');
        return DB.saveStudioLayout('live', ok, p.name || id);
      }).then(function () { return '"' + (p.name || id) + '" đang chạy'; });
    } else if (a === 'p-del' && p) {
      if (!window.confirm('Xoá hẳn bố cục "' + (p.name || id) + '"? (Bản khách đang thấy không bị xoá.)')) return;
      job = DB.deleteStudioLayout(id).then(function () {
        if (current === id) current = null;
        return 'Đã xoá "' + (p.name || id) + '"';
      });
    } else if (a === 'p-save' && current) {
      var cur = profiles.filter(function (x) { return x.id === current; })[0];
      if (!clean || !cur) return;
      job = DB.saveStudioLayout(current, clean, cur.name).then(function () {
        dirty = false;
        return 'Đã lưu vào "' + (cur.name || current) + '"';
      });
    } else if (a === 'p-new') {
      if (!clean) return;
      var name = (window.prompt('Tên bố cục (vd: Tết 2027, Mùa thu):') || '').trim().slice(0, 60);
      if (!name) return;
      var nid = slug(name);
      job = DB.saveStudioLayout(nid, clean, name).then(function () {
        current = nid; dirty = false;
        return 'Đã lưu thành "' + name + '"';
      });
    }
    if (!job) return;
    b.disabled = true;
    job.then(function (msg) { status(msg); return loadProfiles(); })
      .catch(function (err) { status('Không làm được: ' + (err.message || ''), true); })
      .then(function () { b.disabled = false; });
  }

  /* ---------- save / publish ---------- */
  function barClick(e) {
    var b = e.target.closest('[data-se]');
    if (!b || !data) return;
    var a = b.dataset.se;
    if (a === 'sc-in' || a === 'sc-out') return setScene(a.slice(3));
    if (a === 'w+' || a === 'w-') return lengthen(a === 'w+' ? 1 : -1);
    if (a === 'hot') {
      showHot = !showHot;
      b.setAttribute('aria-pressed', showHot);
      b.classList.toggle('is-off', !showHot);
      draw();
      return;
    }
    if (a === 'clear') {
      if (!S().items.length) { status('Cảnh này chưa có món nào.'); return; }
      if (!window.confirm('Xoá hết ' + S().items.length + ' món trong cảnh ' + (scene === 'out' ? '"Ngoài cửa"' : '"Trong studio"') +
        '? Vùng bấm, Udon và điểm xuất phát giữ nguyên. Bấm Hoàn tác để lấy lại.')) return;
      remember();
      S().items = [];
      sel = null;
      draw(); renderPanel();
      status('Đã xoá hết đồ — xếp lại từ tường trống');
      return;
    }
    if (a === 'undo') return doUndo();
    if (a === 'zin' || a === 'zout') {
      var mid = (stageEl.scrollLeft + stageEl.clientWidth / 2) / k;
      zoom = Math.max(0.5, Math.min(3, zoom * (a === 'zin' ? 1.25 : 0.8)));
      draw();
      stageEl.scrollLeft = mid * k - stageEl.clientWidth / 2;
      return;
    }
    var clean = L.sanitize(data);
    if (!clean) { status('Bố cục không hợp lệ.', true); return; }
    b.disabled = true;
    var job = a === 'save'
      ? DB.saveStudioLayout('draft', clean)
      : (window.confirm('Xuất bản bố cục này cho khách?')
        ? DB.saveStudioLayout('draft', clean).then(function () {
            var cur = profiles.filter(function (x) { return x.id === current; })[0];
            return DB.saveStudioLayout('live', clean, cur ? cur.name : null);
          })
        : null);
    if (!job) { b.disabled = false; return; }
    job.then(function () {
      dirty = false;
      status(a === 'save' ? 'Đã lưu nháp' : 'Đã xuất bản — khách thấy bố cục mới');
      if (a !== 'save') loadProfiles();
    }).catch(function (err) {
      status('Không lưu được: ' + (err.message || '') + (err.status === 403 || err.status === 401 ? ' (chỉ tài khoản chủ được lưu)' : ''), true);
    }).then(function () { b.disabled = false; });
  }

  return { mount: mount, unmount: unmount, queueProduct: queueProduct, isDirty: function () { return dirty; } };
})();
