// Gem Chạm Sắc — trình lắp Studio Gem (tab "Lắp studio" trong admin.html, chỉ owner)
//
// Pick a background strip, drop pieces from the asset library (or upload a
// new one to the gem-media bucket), drag to move, drag a corner to resize,
// drag the round handle to rotate. Hotspots (what opens when tapped), the
// spot where the character stops for each, Udon and the start point are
// placed the same way. "Ngoài cửa" switches to the street in front of the
// studio (layout.outside), where studio.html opens. "Lưu nháp" saves the
// draft (saved on its own); "Phát hành" makes it what customers see. studio.html?nhap=1 previews the draft (owner only).
//
// Layout format and validation: js/studio-layout.js. RLS on studio_layout
// lets only the owner write; this screen is a convenience, not the lock.

window.GemStudioEditor = (function () {
  'use strict';

  var L = window.GemLayout;
  var DB = window.GemDB;

  var root, stageEl, worldEl, panelEl, statusEl;
  var lib = null;           // assets.json + the library in the database (see mergeLib)
  var baseGroups = null;    // assets.json groups as shipped
  var dbAssets = [];        // studio_assets rows: pictures the owner uploaded
  var upForm = null;        // { files: [{ file, preview }], grp, newGrp, name, cut } while an upload is being set up
  var UP_MAX = 20;          // pictures per batch
  var manage = false;       // library in "Sửa thư viện" mode: tapping an own picture edits it
  var editAsset = null;     // studio_assets id being edited
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
    changed();
  }

  /* ---------- mount ---------- */
  function mount(el) {
    root = el;
    // Compact on purpose: one tool row, saving + saved layouts tucked in the
    // "Lưu" menu, so the stage gets the screen (on a phone especially).
    root.innerHTML =
      '<div class="se">' +
        // what is being edited, what customers see, and the three actions
        '<div class="se-head">' +
          '<div class="se-doc"><b class="se-docname">Bản nháp</b> <span class="se-saved"></span>' +
            '<span class="se-live"></span></div>' +
          '<div class="se-acts">' +
            '<button type="button" class="ad-btn" data-hd="layouts">Bố cục</button>' +
            '<a class="ad-btn" href="studio.html?nhap=1" target="_blank" rel="noopener">Xem thử</a>' +
            '<button type="button" class="ad-btn" data-hd="save">Lưu</button>' +
            '<button type="button" class="ad-btn on" data-hd="publish">Phát hành</button>' +
          '</div>' +
        '</div>' +
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

        '</div>' +
        '<p class="se-status" role="status"></p>' +
        '<div class="se-stage"><div class="se-world"><img class="se-bgimg" alt="" draggable="false"></div></div>' +
        '<div class="se-panel"></div>' +
        '<div class="se-sheet" hidden></div>' +
        '<div class="se-dlg" hidden></div>' +
        '<div class="se-toast" hidden role="status"></div>' +
      '</div>';
    stageEl = root.querySelector('.se-stage');
    worldEl = root.querySelector('.se-world');
    panelEl = root.querySelector('.se-panel');
    statusEl = root.querySelector('.se-status');
    status('Đang tải...');

    root.querySelector('.se-bar').addEventListener('click', barClick);
    root.querySelector('.se-head').addEventListener('click', headClick);
    root.querySelector('.se-sheet').addEventListener('click', sheetClick);
    root.querySelector('.se-sheet').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); var b = e.target.parentNode.querySelector('[data-ok]'); if (b) b.click(); }
    });
    document.addEventListener('visibilitychange', flushAutosave);
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
      if (e.target.name === 'se-find') {
        findQ = e.target.value.trim();
        var g = libGroups().filter(function (x) { return x.id === group; })[0] || lib.groups[0];
        panelEl.setAttribute('data-view', g.id + '|' + findQ);
        panelEl.querySelectorAll('[data-group]').forEach(function (c) { c.classList.toggle('is-on', !findQ && c.dataset.group === g.id); });
        renderGrid(g);
        return;
      }
      if (e.target.name !== 'se-size' || !sel || sel.kind !== 'item') return;
      resize(S().items[sel.i], +e.target.value);
      var num = panelEl.querySelector('[name="se-h"]');
      if (num) num.value = e.target.value;
      changed();
      draw();
    });
    document.addEventListener('keydown', keyDown);
    window.addEventListener('resize', draw);

    return Promise.all([
      fetch('images/studio/assets.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
      DB.studioLayout('draft').catch(function () { return null; }),
      DB.studioLayout('live').catch(function () { return null; }),
      DB.studioAssets().catch(function () { return []; })
    ]).then(function (r) {
      lib = r[0];
      baseGroups = lib.groups;
      dbAssets = r[3] || [];
      mergeLib();
      data = L.sanitize(r[1]) || L.sanitize(r[2]) || L.blank(lib.backgrounds[0]);
      syncBg();
      status(r[1] ? 'Tiếp tục bản đang sửa' : r[2] ? 'Bắt đầu từ bản khách đang thấy' : 'Bố cục mới');
      draw();
      renderPanel();
      // product list for "Sản phẩm" on a piece (owner is signed in)
      DB.adminProducts().then(function (rows) { prods = rows || []; mergeLib(); renderPanel(); }, function () { prods = []; });
      if (queued) { var q = queued; queued = null; placeProduct(q.sku, q.image); }
      return loadProfiles();
    }).catch(function (err) {
      status('Không tải được: ' + (err.message || ''), true);
    });
  }

  /* ---------- real products in the studio ----------
     A piece with a sku is a product: customers tap it for its card or drag
     it into the basket. The Sản phẩm tab sends one here with queueProduct. */
  var prods = [];        // products rows: sku, name_vi, image, cutout…
  var queued = null;     // product waiting for the editor to finish loading

  function placeProduct(sku, image) {
    if (scene !== 'in') setScene('in');
    var cut = null;
    lib.groups.forEach(function (g) { g.items.forEach(function (a) { if (a.sku === sku) cut = a; }); });
    if (cut) add(cut);
    else if (image && L.srcOk(image)) add({ src: image, w: 600, h: 600, frame: true, sku: sku });
    else { status('Sản phẩm này chưa có ảnh — thêm ảnh hoặc ảnh cắt nền ở tab Sản phẩm.', true); return; }
    status('Đã thêm "' + sku + '" giữa màn hình — kéo lên kệ rồi Phát hành');
  }

  /* ---------- the library ----------
     Three sources, one list of tabs:
       - images/studio/assets.json  pictures shipped with the site (not editable here)
       - studio_assets              pictures uploaded here, each in the tab picked on upload
       - products.cutout            "Sản phẩm thật": the cut-out set in the Sản phẩm form,
                                    already linked to its sku */
  var PROD_GROUP = 'sp';   // the shipped "Sản phẩm thật" tab: cut-outs linked to a sku

  function mergeLib() {
    if (!baseGroups) return;
    var groups = baseGroups.map(function (g) { return { id: g.id, label: g.label, items: g.items.slice() }; });
    var byId = {}, seen = {};
    groups.forEach(function (g) { byId[g.id] = g; g.items.forEach(function (a) { seen[a.src] = 1; }); });
    var pg = byId[PROD_GROUP];
    if (!pg) { pg = byId[PROD_GROUP] = { id: PROD_GROUP, label: 'Sản phẩm thật', items: [] }; groups.push(pg); }
    prods.forEach(function (p) {
      if (p.cutout && L.srcOk(p.cutout) && !seen[p.cutout]) {
        seen[p.cutout] = 1;
        pg.items.push({ src: p.cutout, sku: p.sku, name: p.name_vi });
      }
    });
    if (!pg.items.length) groups.splice(groups.indexOf(pg), 1);
    dbAssets.forEach(function (r) {
      if (!L.srcOk(r.src)) return;
      var g = byId[r.grp];
      if (!g) { g = byId[r.grp] = { id: r.grp, label: r.grp, items: [] }; groups.push(g); }
      g.items.push({ src: r.src, w: r.w, h: r.h, name: r.name, db: r.id });
    });
    lib.groups = groups;
  }

  function groupOptions(cur) {
    return lib.groups.filter(function (g) { return g.id !== PROD_GROUP; }).map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (g.id === cur ? ' selected' : '') + '>' + esc(g.label) + '</option>';
    }).join('') + '<option value="__new"' + (cur === '__new' ? ' selected' : '') + '>+ Nhóm mới…</option>';
  }

  function groupLabel(id) {
    var g = lib.groups.filter(function (x) { return x.id === id; })[0];
    return g ? g.label : id;
  }

  // The tab the owner picked: an existing id, or the typed name of a new one.
  function pickedGroup(val, typed) {
    if (val !== '__new') return val;
    typed = String(typed || '').trim().slice(0, 40);
    return typed || null;
  }

  function dropPreviews(f) {
    (f ? f.files : []).forEach(function (x) { URL.revokeObjectURL(x.preview); });
  }

  function startUpload(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    if (!window.GemImg) { status('Thiếu js/img-tools.js — tải lại trang.', true); return; }
    if (files.length > UP_MAX) {
      status('Mỗi lần tối đa ' + UP_MAX + ' ảnh — lấy ' + UP_MAX + ' ảnh đầu.', true);
      files = files.slice(0, UP_MAX);
    }
    dropPreviews(upForm);
    var g = group === PROD_GROUP ? (baseGroups[0] && baseGroups[0].id) : group;
    upForm = { files: files.map(function (f) { return { file: f, preview: URL.createObjectURL(f) }; }),
      grp: g, newGrp: '', name: '', cut: false };
    manage = false; editAsset = null;
    renderPanel();
  }

  // "binh-hoa.png" -> "binh-hoa": the name a picture gets in a batch
  function fileTitle(file) {
    return String(file.name || '').replace(/\.[a-z0-9]+$/i, '').slice(0, 80);
  }

  // One picture at a time (phones run out of memory decoding several big
  // photos at once). A picture that fails doesn't stop the rest; the failed
  // ones stay in the form so they can be tried again.
  function saveUpload() {
    var f = upForm;
    var grp = pickedGroup(f.grp, f.newGrp);
    if (!grp) { status('Đặt tên cho nhóm mới đã nhé.', true); return; }
    var btn = panelEl.querySelector('[data-up="save"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý…'; }
    var IMG = window.GemImg;
    var n = f.files.length, done = [], failed = [];
    var single = n === 1;

    function one(x, i) {
      var sz;
      status((n > 1 ? 'Đang xử lý ' + (i + 1) + '/' + n + '… ' : '') +
        (f.cut ? 'xoá nền trắng, thu nhỏ, tải lên' : 'thu nhỏ, tải lên'));
      return (f.cut ? IMG.removeWhite(x.file) : IMG.shrink(x.file, { alpha: true })).then(function (file) {
        return IMG.size(file).then(function (d) { sz = d; return DB.uploadImage(file); });
      }).then(function (url) {
        var name = single ? String(f.name || '').trim().slice(0, 80) : fileTitle(x.file);
        return DB.addStudioAsset({ src: url, w: sz.w, h: sz.h, grp: grp, name: name });
      }).then(function (row) {
        dbAssets.push(row);
        done.push(row);
        URL.revokeObjectURL(x.preview);
      }, function (err) {
        failed.push({ x: x, msg: err.message || '' });
      });
    }

    f.files.reduce(function (chain, x, i) {
      return chain.then(function () { return one(x, i); });
    }, Promise.resolve()).then(function () {
      if (done.length) { mergeLib(); group = grp; }
      if (single && done.length) add({ src: done[0].src, w: done[0].w, h: done[0].h });
      if (!failed.length) {
        upForm = null;
        renderPanel();
        status(single ? 'Đã lưu vào thư viện, tab "' + groupLabel(grp) + '"'
          : 'Đã lưu ' + done.length + ' ảnh vào tab "' + groupLabel(grp) + '" — chạm ảnh để đặt vào cảnh');
        return;
      }
      f.files = failed.map(function (y) { return y.x; });
      renderPanel();
      status((done.length ? 'Đã lưu ' + done.length + ' ảnh. ' : '') + failed.length + ' ảnh chưa lưu được (' +
        failed.map(function (y) { return y.x.file.name; }).join(', ') + '): ' + failed[0].msg +
        ' — vẫn còn trong khung để thử lại.', true);
    });
  }

  function saveAsset(id) {
    var box = panelEl.querySelector('.se-asset-edit');
    var grp = pickedGroup(box.querySelector('[name="as-grp"]').value, box.querySelector('[name="as-new"]').value);
    if (!grp) { status('Đặt tên cho nhóm mới đã nhé.', true); return; }
    var patch = { grp: grp, name: box.querySelector('[name="as-name"]').value.trim().slice(0, 80) };
    DB.updateStudioAsset(id, patch).then(function () {
      dbAssets.forEach(function (r) { if (r.id === id) { r.grp = patch.grp; r.name = patch.name; } });
      mergeLib();
      editAsset = null; group = grp;
      renderPanel();
      status('Đã lưu');
    }).catch(function (err) { status('Không lưu được: ' + (err.message || ''), true); });
  }

  // Only the library entry goes: the file stays in storage, so layouts
  // already using the picture keep showing it.
  function deleteAsset(id) {
    ask('Bỏ ảnh này khỏi thư viện?', 'Bố cục nào đang dùng nó vẫn hiện bình thường.',
      [{ v: null, t: 'Thôi' }, { v: 'del', t: 'Bỏ khỏi thư viện', on: 'danger' }]).then(function (v) { if (v) deleteAssetNow(id); });
  }
  function deleteAssetNow(id) {
    DB.deleteStudioAsset(id).then(function () {
      dbAssets = dbAssets.filter(function (r) { return r.id !== id; });
      mergeLib();
      editAsset = null;
      if (!lib.groups.some(function (g) { return g.id === group; })) group = lib.groups[0].id;
      renderPanel();
      status('Đã bỏ khỏi thư viện');
    }).catch(function (err) { status('Không xoá được: ' + (err.message || ''), true); });
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

  // The menu hangs from the right edge of "Lưu"; on a phone that button can
  // wrap to the middle of a row and the menu would run off the left side.
  // Nudge it back inside the screen each time it opens.
  function unmount() {
    flushAutosave();
    document.removeEventListener('visibilitychange', flushAutosave);
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
        (it.lock ? ' is-lock' : '') + (isSel('item', i) ? ' is-sel' : '');
      n.dataset.kind = 'item'; n.dataset.i = i;
      place(n, it.x - it.w / 2, it.y - it.h / 2, it.w, it.h);
      n.style.transform = 'rotate(' + it.rot + 'deg)';
      var img = document.createElement('img');
      img.src = it.src; img.alt = ''; img.draggable = false;
      if (it.flip) img.style.transform = 'scaleX(-1)';
      n.appendChild(img);
      worldEl.appendChild(n);
    });
    // The selected piece gets a see-through twin above everything: a finger
    // inside its outline always moves IT, even where another piece is drawn
    // on top, and its handles can't be covered.
    if (sel && sel.kind === 'item' && S().items[sel.i]) {
      var it = S().items[sel.i];
      var gb = document.createElement('div');
      var small = Math.min(it.w, it.h) * k < 72;   // corner grips would cover a small piece
      gb.className = 'se-el se-grab' + (it.lock ? ' is-lock' : '') + (small ? ' is-small' : '');
      gb.dataset.kind = 'item'; gb.dataset.i = sel.i;
      place(gb, it.x - it.w / 2, it.y - it.h / 2, it.w, it.h);
      gb.style.transform = 'rotate(' + it.rot + 'deg)';
      if (!it.lock) handles(gb, true);
      worldEl.appendChild(gb);
    }

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

  var onSel = false;      // the first finger of this touch landed on the selected piece
  var touchSeq = 0;       // bumps when a second finger lands: the first one's tap is off

  function pinchDown(e) {
    if (e.pointerType !== 'touch') return;
    var n0 = Object.keys(touches).length;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (n0 === 0) onSel = !!(e.target.closest && e.target.closest('.se-grab'));
    if (Object.keys(touches).length === 2) touchSeq++;
    if (Object.keys(touches).length !== 2 || !onSel || !sel || sel.kind !== 'item' || S().items[sel.i].lock) return;
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
      changed();
      pinch = null;
      renderPanel();
    }
  }

  // What a touch does (phone / tablet):
  //   - on the selected piece (or its handles): drag / resize / rotate it
  //   - anywhere else: nothing until the finger lifts. A swipe scrolls the
  //     stage (the browser takes it); a tap selects what is under the finger.
  //   - a tap on the selected piece selects the next one under it, so a
  //     piece hidden behind another can still be reached.
  // A mouse keeps "press and drag" on any piece: no scrolling to confuse.
  function pointerDown(e) {
    if (pinch || Object.keys(touches).length > 1) return;   // second finger of a pinch
    var n = e.target.closest('.se-el');
    if (n && n.classList.contains('se-floor')) n = null;
    var finger = e.pointerType === 'touch' || e.pointerType === 'pen';
    var mine = n && (n.classList.contains('se-grab') || (n.dataset.kind !== 'item' && n.classList.contains('is-sel')));
    if (!n && !finger) {
      if (sel) { sel = null; draw(); renderPanel(); }
      return;
    }
    if (!mine && finger) { waitTap(e); return; }
    e.preventDefault();
    var kind = n.dataset.kind;
    sel = { kind: kind, i: n.dataset.i != null ? +n.dataset.i : null, id: n.dataset.id || null };
    var handle = e.target.dataset.handle || null;
    var cx0 = e.clientX, cy0 = e.clientY, seq = touchSeq;
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
      if (!moved && Math.hypot(ev.clientX - cx0, ev.clientY - cy0) < (finger ? 8 : 3)) return;
      moved = true;
      if (kind === 'item' && obj.lock) return;
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
    function up(ev) {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (moved && !obj.lock) {
        undo.push(before); changed();
      } else if (!moved && mine && ev.type === 'pointerup' && gen === pinchGen && seq === touchSeq) {
        pickAt(ev.clientX, ev.clientY, true);   // tapped the selected piece again: the one under it
        return;
      }
      draw(); renderPanel();
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    if (!mine) { draw(); renderPanel(); }
  }

  // A finger that isn't on the selected piece: wait. Moving it far is a
  // scroll (the browser usually cancels the pointer itself); lifting it close
  // to where it landed is a tap.
  function waitTap(e) {
    var id = e.pointerId, x0 = e.clientX, y0 = e.clientY, seq = touchSeq, far = false;
    function move(ev) { if (ev.pointerId === id && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) far = true; }
    function end(ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      if (ev.type !== 'pointerup' || far || seq !== touchSeq || pinch) return;
      pickAt(ev.clientX, ev.clientY);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }

  // Select what is under a point. Already holding one of the things there?
  // Take the next one down (round and round), so stacked pieces can all be
  // reached. Locked pieces take no taps (CSS), so they never come up here.
  function pickAt(x, y, again) {
    var seen = {}, stack = [];
    document.elementsFromPoint(x, y).forEach(function (n) {
      if (!n.classList.contains('se-el') || n.classList.contains('se-grab') || n.classList.contains('se-floor') || !worldEl.contains(n)) return;
      var s1 = { kind: n.dataset.kind, i: n.dataset.i != null ? +n.dataset.i : null, id: n.dataset.id || null };
      var key = s1.kind + '|' + s1.i + '|' + s1.id;
      if (!seen[key]) { seen[key] = 1; stack.push(s1); }
    });
    var at = -1;
    stack.forEach(function (s1, j) { if (sel && s1.kind === sel.kind && s1.i === sel.i && s1.id === (sel.id || null)) at = j; });
    var next = stack.length ? stack[(at + 1) % stack.length] : null;
    if (again && (at < 0 || stack.length === 1)) return;   // nothing else here: keep it
    sel = next;
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
    if (it.lock) return;
    var step = e.shiftKey ? 20 : 2;
    var m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); remember(); it.x += m[0]; it.y += m[1]; draw(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('del'); }
  }

  function doUndo() {
    var last = undo.pop();
    if (!last) return;
    data = last; sel = null; changed();
    syncBg();
    status('Đã hoàn tác');
    draw(); renderPanel();
  }

  /* ---------- side panel: selection tools + library ---------- */
  function renderPanel() {
    if (!lib) return;
    var tools = '';
    if (sel && sel.kind === 'item' && S().items[sel.i].lock) {
      tools = '<div class="se-tools"><b>Đang khoá</b><span class="se-lockmsg">không kéo nhầm được</span>' +
        '<button type="button" class="se-tb on" data-act="lock">Mở khoá</button></div>';
    } else if (sel && sel.kind === 'item') {
      var it = S().items[sel.i];
      // one strip of small controls; scrolls sideways on a phone
      tools = '<div class="se-tools">' +
        '<button type="button" class="se-tb" data-act="lock" title="Khoá: chạm vào không chọn, không kéo được nữa (hợp với tường, cửa, kệ lớn)">Khoá</button>' +
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
      var locked = [];
      S().items.forEach(function (x, i) { if (x.lock) locked.push(i); });
      tools = (locked.length ? '<div class="se-locks"><span>Món đã khoá — chạm để chọn:</span>' + locked.map(function (i) {
          return '<button type="button" class="se-lockpick" data-lock="' + i + '" aria-label="Chọn món đã khoá"><img src="' + esc(S().items[i].src) + '" alt=""></button>';
        }).join('') + '</div>' : '') +
        '<details class="se-help"><summary>Cách dùng</summary><p>Chạm một món ở thư viện để thêm vào giữa màn hình. ' +
        'Điện thoại: chạm một lần để chọn món, rồi mới kéo được món đó; vuốt chỗ khác thì chỉ cuộn màn hình. ' +
        'Món nằm dưới món khác: chạm thêm lần nữa vào món đang chọn để chọn món bên dưới. ' +
        'Kéo góc để đổi cỡ, kéo nút tròn để xoay, hoặc chụm / vặn hai ngón trên món đang chọn. ' +
        '"Khoá" những món to như tường, cửa, kệ để không kéo nhầm. ' +
        'Máy tính: kéo thẳng món nào cũng được, phím mũi tên dịch từng chút, Ctrl+Z hoàn tác.</p></details>';
    }
    var g = libGroups().filter(function (x) { return x.id === group; })[0] || lib.groups[0];
    var extra = '';
    if (upForm) {
      var many = upForm.files.length > 1;
      extra = '<div class="se-upform' + (many ? ' is-many' : '') + '">' +
        (many
          ? '<ul class="se-up-strip">' + upForm.files.map(function (x, i) {
              return '<li><img src="' + esc(x.preview) + '" alt="" title="' + esc(x.file.name) + '">' +
                '<button type="button" class="se-up-x" data-up-drop="' + i + '" aria-label="Bỏ ảnh này">×</button></li>';
            }).join('') + '</ul>'
          : '<img src="' + esc(upForm.files[0].preview) + '" alt="">') +
        '<div class="se-upform-f">' +
          '<label>Vào tab <select name="up-grp">' + groupOptions(upForm.grp) + '</select></label>' +
          '<label' + (upForm.grp === '__new' ? '' : ' hidden') + ' class="se-up-new">Tên tab mới <input name="up-new" maxlength="40" value="' + esc(upForm.newGrp) + '"></label>' +
          (many ? '' : '<label>Tên ảnh <input name="up-name" maxlength="80" placeholder="không bắt buộc" value="' + esc(upForm.name) + '"></label>') +
          '<label class="se-up-cut"><input type="checkbox" name="up-cut"' + (upForm.cut ? ' checked' : '') + '> Xoá nền trắng' +
            (many ? ' (cho cả ' + upForm.files.length + ' ảnh)' : '') + '</label>' +
          '<div class="se-row"><button type="button" class="ad-btn ad-primary" data-up="save">' +
            (many ? 'Lưu ' + upForm.files.length + ' ảnh vào thư viện' : 'Lưu vào thư viện') + '</button>' +
          '<button type="button" class="ad-btn" data-up="cancel">Huỷ</button></div>' +
          '<span class="se-hint-s">Ảnh được thu nhỏ (dài nhất 1280px, WebP) trước khi tải lên.' +
            (many ? ' Tên ảnh lấy theo tên file, đổi sau ở "Sửa thư viện". Ảnh có nền trắng và không có nền thì tải thành hai lượt.' : '') +
          '</span>' +
        '</div></div>';
    } else if (editAsset) {
      var row = dbAssets.filter(function (r) { return r.id === editAsset; })[0];
      if (row) {
        extra = '<div class="se-upform se-asset-edit">' +
          '<img src="' + esc(row.src) + '" alt="">' +
          '<div class="se-upform-f">' +
            '<label>Tab <select name="as-grp">' + groupOptions(row.grp) + '</select></label>' +
            '<label hidden class="se-up-new">Tên tab mới <input name="as-new" maxlength="40"></label>' +
            '<label>Tên ảnh <input name="as-name" maxlength="80" value="' + esc(row.name) + '"></label>' +
            '<div class="se-row"><button type="button" class="ad-btn ad-primary" data-asset-save="' + esc(row.id) + '">Lưu</button>' +
            '<button type="button" class="ad-btn ad-danger" data-asset-del="' + esc(row.id) + '">Bỏ khỏi thư viện</button>' +
            '<button type="button" class="ad-btn" data-asset-close>Đóng</button></div>' +
          '</div></div>';
      }
    }
    // keep the library where it was: the panel is rebuilt on every pick
    var oldGrid = panelEl.querySelector('.se-grid'), oldTabs = panelEl.querySelector('.se-tabs');
    var keep = oldGrid && panelEl.getAttribute('data-view') === g.id + '|' + findQ
      ? [oldGrid.scrollLeft, oldGrid.scrollTop] : null;
    var keepTabs = oldTabs ? oldTabs.scrollLeft : 0;
    // and the tool strip (Lên / Xuống… pressed again and again): it is rebuilt
    // on every press too, keep it where it was while the same kind of thing is selected
    var oldTools = panelEl.querySelector('.se-tools'), toolKind = sel ? sel.kind : '';
    var keepTools = oldTools && panelEl.getAttribute('data-tools') === toolKind ? oldTools.scrollLeft : 0;
    var hadFind = document.activeElement && document.activeElement.classList.contains('se-find');
    panelEl.innerHTML = tools + extra +
      '<div class="se-lib' + (manage ? ' is-manage' : '') + '">' +
        '<div class="se-tabs">' + libGroups().map(function (x) {
          return '<button type="button" class="se-chip' + (x.id === g.id && !findQ ? ' is-on' : '') + (x.id === RECENT ? ' is-recent' : '') +
            '" data-group="' + esc(x.id) + '">' + esc(x.label) + '</button>';
        }).join('') +
        '<label class="se-chip se-upload">+ Tải ảnh<input type="file" name="se-file" accept="image/png,image/webp,image/jpeg" multiple hidden></label>' +
        '<button type="button" class="se-chip' + (manage ? ' is-on' : '') + '" data-manage>Sửa thư viện</button>' +
        '</div>' +
        (manage ? '<span class="se-hint-s">Chạm ảnh có viền đứt (ảnh đã tải lên) để đổi tên, chuyển tab hoặc bỏ. ' +
          'Ảnh có sẵn trong code và ảnh “Sản phẩm thật” sửa ở chỗ khác (tab Sản phẩm).</span>' : '') +
        '<input class="se-find" type="search" name="se-find" placeholder="Tìm ảnh theo tên hoặc tab…" autocomplete="off" value="' + esc(findQ) + '">' +
        '<div class="se-grid"></div>' +
      '</div>';
    panelEl.setAttribute('data-view', g.id + '|' + findQ);
    renderGrid(g);
    var grid = panelEl.querySelector('.se-grid');
    if (keep) { grid.scrollLeft = keep[0]; grid.scrollTop = keep[1]; }
    panelEl.querySelector('.se-tabs').scrollLeft = keepTabs;
    panelEl.setAttribute('data-tools', toolKind);
    var tl = panelEl.querySelector('.se-tools');
    if (tl) tl.scrollLeft = keepTools;
    if (hadFind) { var f = panelEl.querySelector('.se-find'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  }

  /* ---------- library: recently used, search ---------- */
  var RECENT = '__recent', findQ = '', shown = [];
  function recent() {
    try { var r = JSON.parse(localStorage.getItem('gem-se-recent') || '[]'); return Array.isArray(r) ? r.filter(function (a) { return a && L.srcOk(a.src); }) : []; }
    catch (e) { return []; }
  }
  function noteRecent(a) {
    var keepKeys = ['src', 'w', 'h', 'h0', 'y0', 'frame', 'sku', 'name'], o = {};
    keepKeys.forEach(function (k2) { if (a[k2] != null) o[k2] = a[k2]; });
    var r = [o].concat(recent().filter(function (x) { return x.src !== a.src; })).slice(0, 8);
    try { localStorage.setItem('gem-se-recent', JSON.stringify(r)); } catch (e) { /* private mode */ }
  }
  function libGroups() {
    var r = recent();
    return (r.length ? [{ id: RECENT, label: 'Vừa dùng', items: r }] : []).concat(lib.groups);
  }
  function plain(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  }
  function renderGrid(g) {
    var grid = panelEl.querySelector('.se-grid');
    if (!grid) return;
    if (findQ) {
      var q = plain(findQ), seen = {};
      shown = [];
      lib.groups.forEach(function (x) {
        var hitGroup = plain(x.label).indexOf(q) >= 0;
        x.items.forEach(function (a) {
          if (seen[a.src]) return;
          if (hitGroup || plain(a.name).indexOf(q) >= 0 || plain(a.src.split('/').pop()).indexOf(q) >= 0) { seen[a.src] = 1; shown.push(a); }
        });
      });
    } else shown = g.items;
    grid.innerHTML = shown.length ? shown.map(function (a, i) {
      return '<button type="button" class="se-asset' + (a.db ? ' is-own' : '') + '" data-asset="' + i + '" title="' +
        esc(a.name || a.src.split('/').pop()) + '">' +
        '<img src="' + esc(a.src) + '" alt="" loading="lazy"></button>';
    }).join('') : '<span class="se-hint-s">Không có ảnh nào khớp.</span>';
  }

  function panelClick(e) {
    var b;
    if ((b = e.target.closest('[data-group]'))) { group = b.dataset.group; findQ = ''; renderPanel(); return; }
    if ((b = e.target.closest('[data-lock]'))) {
      var li = +b.dataset.lock, lit = S().items[li];
      if (!lit) return;
      sel = { kind: 'item', i: li };
      stageEl.scrollLeft = Math.max(0, lit.x * k - stageEl.clientWidth / 2);
      draw(); renderPanel();
      return;
    }
    if ((b = e.target.closest('[data-up-drop]'))) {
      var k = +b.getAttribute('data-up-drop');
      URL.revokeObjectURL(upForm.files[k].preview);
      upForm.files.splice(k, 1);
      if (!upForm.files.length) upForm = null;
      renderPanel();
      return;
    }
    if ((b = e.target.closest('[data-up]'))) {
      if (b.dataset.up === 'save') saveUpload();
      else { dropPreviews(upForm); upForm = null; renderPanel(); }
      return;
    }
    if (e.target.closest('[data-manage]')) { manage = !manage; editAsset = null; renderPanel(); return; }
    if ((b = e.target.closest('[data-asset-save]'))) { saveAsset(b.getAttribute('data-asset-save')); return; }
    if ((b = e.target.closest('[data-asset-del]'))) { deleteAsset(b.getAttribute('data-asset-del')); return; }
    if (e.target.closest('[data-asset-close]')) { editAsset = null; renderPanel(); return; }
    if ((b = e.target.closest('[data-asset]'))) {
      var a = shown[+b.dataset.asset];
      if (!a) return;
      if (manage) {
        if (a.db) { editAsset = a.db; upForm = null; renderPanel(); }
        else status('Ảnh này có sẵn trong code (hoặc là ảnh sản phẩm) — không sửa ở đây.', true);
        return;
      }
      add(a);
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
    var nm = e.target.name || '';
    if (nm === 'se-find') return;
    if (nm === 'se-file') { startUpload(e.target.files); e.target.value = ''; return; }
    if (/^up-/.test(nm) && upForm) {
      if (nm === 'up-grp') upForm.grp = e.target.value;
      if (nm === 'up-new') upForm.newGrp = e.target.value;
      if (nm === 'up-name') upForm.name = e.target.value;
      if (nm === 'up-cut') upForm.cut = e.target.checked;
      if (nm === 'up-grp') panelEl.querySelector('.se-up-new').hidden = e.target.value !== '__new';
      return;
    }
    if (/^as-/.test(nm)) {
      if (nm === 'as-grp') panelEl.querySelector('.se-asset-edit .se-up-new').hidden = e.target.value !== '__new';
      return;
    }
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
    else if (a === 'lock') { if (it.lock) delete it.lock; else { it.lock = true; sel = null; status('Đã khoá — mở lại ở "Món đã khoá" bên dưới.'); } }
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
    noteRecent(a);
    if (!a.w || !a.h) {
      var im = new Image();
      im.onload = function () { a.w = im.naturalWidth; a.h = im.naturalHeight; add(a); };
      im.onerror = function () { status('Không mở được ảnh này.', true); };
      im.src = a.src;
      return;
    }
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

  /* ---------- saved layouts, autosave, publish ----------
     Rows in studio_layout: 'draft' (what is being edited, saved on its own a
     moment after every change; its name column holds the id of the saved
     layout it belongs to), 'live' (what customers see), 'prev' (what they
     saw before the last publish: "Hoàn tác phát hành"), 'p-…' (saved
     layouts). Confirmations are drawn in the page, never window.confirm. */
  var saveTimer = null, savedAt = null, saving = false;
  var rows = { live: null, draft: null, prev: null };

  function changed() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autosave, 2000);
    syncHead();
  }

  function autosave() {
    saveTimer = null;
    var clean = data && L.sanitize(data);
    if (!clean) return Promise.resolve();
    saving = true; syncHead();
    return DB.saveStudioLayout('draft', clean, current || null).then(function () {
      savedAt = new Date(); saving = false; syncHead();
    }, function (err) {
      saving = false;
      status('Chưa tự lưu được: ' + (err.message || '') + ' — thử lại sau ít giây', true);
      saveTimer = setTimeout(autosave, 8000);
    });
  }

  function flushAutosave() {
    if (saveTimer) { clearTimeout(saveTimer); autosave(); }
  }

  function profileName(id) {
    var p = profiles.filter(function (x) { return x.id === id; })[0];
    return p ? (p.name || p.id) : null;
  }

  function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function syncHead() {
    if (!root) return;
    var nm = root.querySelector('.se-docname'), sv = root.querySelector('.se-saved'), lv = root.querySelector('.se-live');
    if (!nm) return;
    var name = current && profileName(current);
    nm.textContent = name ? 'Đang sửa: ' + name : 'Bản nháp chưa đặt tên';
    sv.textContent = saving ? '· đang tự lưu…' : saveTimer ? '· có thay đổi' : savedAt ? '· đã tự lưu ' + hhmm(savedAt) : '';
    if (name && dirty) sv.textContent += ' (chưa lưu vào "' + name + '")';
    lv.textContent = 'Khách đang thấy: ' + (liveName || (rows.live ? 'bố cục chưa đặt tên' : '—'));
    var save = root.querySelector('[data-hd="save"]');
    save.textContent = name ? 'Lưu' : 'Lưu thành…';
  }

  function loadProfiles() {
    return DB.studioProfiles().then(function (list) {
      list = list || [];
      profiles = list.filter(function (r) { return /^p-/.test(r.id); });
      ['live', 'draft', 'prev'].forEach(function (k) { rows[k] = list.filter(function (r) { return r.id === k; })[0] || null; });
      liveName = rows.live ? rows.live.name : null;
      // the draft remembers which saved layout it belongs to
      if (current === null && rows.draft && rows.draft.name && profileName(rows.draft.name)) current = rows.draft.name;
      syncHead();
      if (!root.querySelector('.se-sheet').hidden) renderSheet();
    }).catch(function () { profiles = []; syncHead(); });
  }

  function slug(name) {
    var s = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return 'p-' + (s || 'bo-cuc') + '-' + Date.now().toString(36).slice(-4);
  }

  /* ---------- in-page dialog + toast ---------- */
  // buttons: [{ v: value, t: label, on: true (primary) | 'danger' }]; input: default text
  function ask(title, text, buttons, input) {
    var dlg = root.querySelector('.se-dlg');
    return new Promise(function (resolve) {
      dlg.innerHTML = '<div class="se-dlg-box" role="dialog" aria-modal="true"><b></b><p></p>' +
        (input != null ? '<input class="se-dlg-in" maxlength="60">' : '') +
        '<div class="se-row">' + buttons.map(function (b, i) {
          return '<button type="button" class="ad-btn' + (b.on === true ? ' on' : b.on === 'danger' ? ' danger' : '') + '" data-v="' + i + '">' + esc(b.t) + '</button>';
        }).join('') + '</div></div>';
      dlg.querySelector('b').textContent = title;
      dlg.querySelector('p').textContent = text || '';
      var inp = dlg.querySelector('.se-dlg-in');
      if (inp) { inp.value = input; setTimeout(function () { inp.focus(); inp.select(); }, 30); }
      dlg.hidden = false;
      var done = function (v) {
        dlg.hidden = true; dlg.innerHTML = '';
        dlg.removeEventListener('click', onClick); dlg.removeEventListener('keydown', onKey);
        resolve(v);
      };
      var onClick = function (e) {
        if (e.target === dlg) return done(null);
        var b = e.target.closest('[data-v]');
        if (!b) return;
        var v = buttons[+b.dataset.v].v;
        if (inp && v !== null) { var txt = inp.value.trim().slice(0, 60); if (!txt) { inp.focus(); return; } return done({ v: v, text: txt }); }
        done(v);
      };
      var onKey = function (e) {
        if (e.key === 'Escape') done(null);
        if (e.key === 'Enter' && inp) { e.preventDefault(); dlg.querySelector('.ad-btn.on').click(); }
      };
      dlg.addEventListener('click', onClick);
      dlg.addEventListener('keydown', onKey);
    });
  }

  var toastTimer = null;
  function toast(msg, bad, action) {
    var el = root.querySelector('.se-toast');
    el.innerHTML = '<span></span>' + (action ? '<button type="button" class="ad-btn">' + esc(action.t) + '</button>' : '');
    el.querySelector('span').textContent = msg;
    el.classList.toggle('bad', !!bad);
    el.hidden = false;
    if (action) el.querySelector('button').onclick = function () { el.hidden = true; action.fn(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, action ? 9000 : 4000);
  }

  function fail(err) {
    toast('Không làm được: ' + (err && err.message || '') +
      (err && (err.status === 403 || err.status === 401) ? ' (chỉ tài khoản chủ được lưu)' : ''), true);
  }

  /* ---------- header actions ---------- */
  function headClick(e) {
    var b = e.target.closest('[data-hd]');
    if (!b || !data) return;
    var a = b.dataset.hd;
    if (a === 'layouts') return openSheet();
    if (a === 'save') return saveLayout();
    if (a === 'publish') return publish(L.sanitize(data), current ? profileName(current) : null);
  }

  function saveLayout() {
    var clean = L.sanitize(data);
    if (!clean) { toast('Bố cục không hợp lệ.', true); return; }
    if (current && profileName(current)) {
      var name = profileName(current);
      return DB.saveStudioLayout(current, clean, name).then(function () {
        dirty = false; toast('Đã lưu vào "' + name + '"'); return loadProfiles();
      }).catch(fail);
    }
    return saveAsNew(clean);
  }

  function saveAsNew(clean) {
    return ask('Lưu thành bố cục mới', 'Đặt tên để lần sau mở lại (vd: Tết 2027, Mùa thu).',
      [{ v: null, t: 'Huỷ' }, { v: 'ok', t: 'Lưu', on: true }], '').then(function (r) {
      if (!r) return;
      var nid = slug(r.text);
      return DB.saveStudioLayout(nid, clean, r.text).then(function () {
        current = nid; dirty = false;
        toast('Đã lưu thành "' + r.text + '"');
        autosave();
        return loadProfiles();
      });
    }).catch(fail);
  }

  // Publish: keep what customers saw as 'prev' first, so it can be undone.
  function publish(clean, name) {
    if (!clean) { toast('Bố cục không hợp lệ.', true); return; }
    var what = name ? '"' + name + '"' : 'bản đang sửa';
    var was = liveName ? '"' + liveName + '"' : (rows.live ? 'bản đang chạy' : null);
    return ask('Phát hành ' + what + '?', 'Khách sẽ thấy ' + what + (was ? ' thay cho ' + was : '') +
      '. Bấm "Hoàn tác phát hành" ngay sau đó nếu lỡ tay.',
      [{ v: null, t: 'Huỷ' }, { v: 'go', t: 'Phát hành', on: true }]).then(function (v) {
      if (!v) return;
      return DB.studioLayout('live').catch(function () { return null; }).then(function (old) {
        return old ? DB.saveStudioLayout('prev', old, liveName) : null;
      }).then(function () {
        return DB.saveStudioLayout('live', clean, name || null);
      }).then(function () {
        toast('Đã phát hành — khách đang thấy ' + what, false, rows.live || liveName ? { t: 'Hoàn tác phát hành', fn: undoPublish } : null);
        return loadProfiles();
      });
    }).catch(fail);
  }

  function undoPublish() {
    DB.studioLayout('prev').then(function (old) {
      var ok = L.sanitize(old);
      if (!ok) throw new Error('không còn bản trước');
      return DB.saveStudioLayout('live', ok, rows.prev ? rows.prev.name : null);
    }).then(function () {
      toast('Đã trả lại bản khách thấy trước đó');
      return loadProfiles();
    }).catch(fail);
  }

  /* ---------- the layouts sheet ---------- */
  var confirmDel = null, renaming = null;
  function openSheet() {
    var sh = root.querySelector('.se-sheet');
    sh.hidden = false;
    confirmDel = null; renaming = null;
    renderSheet();
    loadProfiles();
  }

  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return m + ' phút trước';
    if (m < 60 * 24) return Math.round(m / 60) + ' giờ trước';
    var d = Math.round(m / 1440);
    return d === 1 ? 'hôm qua' : d + ' ngày trước';
  }

  function renderSheet() {
    var sh = root.querySelector('.se-sheet');
    var cards = profiles.map(function (p) {
      var live = p.name && p.name === liveName, open = p.id === current;
      var acts = confirmDel === p.id
        ? '<span class="se-card-q">Xoá hẳn? Bản khách đang thấy không bị ảnh hưởng.</span>' +
          '<button type="button" class="ad-btn danger" data-sh="del-yes" data-id="' + esc(p.id) + '">Xoá</button>' +
          '<button type="button" class="ad-btn" data-sh="del-no">Thôi</button>'
        : renaming === p.id
        ? '<input class="se-card-in" maxlength="60" value="' + esc(p.name || '') + '">' +
          '<button type="button" class="ad-btn on" data-ok data-sh="ren-yes" data-id="' + esc(p.id) + '">Đổi tên</button>' +
          '<button type="button" class="ad-btn" data-sh="ren-no">Thôi</button>'
        : '<button type="button" class="ad-btn' + (open ? '' : ' on') + '" data-sh="open" data-id="' + esc(p.id) + '"' + (open ? ' disabled' : '') + '>' + (open ? 'Đang mở' : 'Mở') + '</button>' +
          '<button type="button" class="ad-btn" data-sh="live" data-id="' + esc(p.id) + '">Phát hành</button>' +
          '<button type="button" class="ad-btn" data-sh="ren" data-id="' + esc(p.id) + '">Đổi tên</button>' +
          '<button type="button" class="ad-btn" data-sh="dup" data-id="' + esc(p.id) + '">Nhân bản</button>' +
          '<button type="button" class="ad-btn danger" data-sh="del" data-id="' + esc(p.id) + '">Xoá</button>';
      return '<li class="se-card' + (open ? ' is-open' : '') + '">' +
        '<canvas class="se-thumb" width="240" height="96" data-id="' + esc(p.id) + '"></canvas>' +
        '<div class="se-card-t"><b>' + esc(p.name || p.id) + '</b>' +
          (live ? '<span class="se-badge">Đang chạy</span>' : '') + (open ? '<span class="se-badge is-open">Đang sửa</span>' : '') +
          '<span class="se-card-d">sửa ' + esc(ago(p.updated_at)) + '</span></div>' +
        '<div class="se-card-a">' + acts + '</div></li>';
    }).join('');
    sh.innerHTML = '<div class="se-sheet-box">' +
      '<div class="se-sheet-h"><b>Bố cục đã lưu</b><button type="button" class="se-x" data-sh="close" aria-label="Đóng">×</button></div>' +
      '<p class="se-hint-s">Khách đang thấy: <b>' + esc(liveName || (rows.live ? 'bố cục chưa đặt tên' : '—')) + '</b>' +
        (rows.prev ? ' · <button type="button" class="se-link" data-sh="undo-live">Trả lại bản trước</button>' : '') + '</p>' +
      '<div class="se-row">' +
        '<button type="button" class="ad-btn on" data-sh="new-copy">+ Lưu bản đang sửa thành bố cục mới</button>' +
        '<button type="button" class="ad-btn" data-sh="new-blank">+ Bắt đầu từ tường trống</button>' +
      '</div>' +
      (profiles.length ? '<ul class="se-cards">' + cards + '</ul>' : '<p class="se-hint-s">Chưa có bố cục nào. Lưu bản đang sửa để bắt đầu.</p>') +
      '</div>';
    var inp = sh.querySelector('.se-card-in');
    if (inp) { inp.focus(); inp.select(); }
    sh.querySelectorAll('.se-thumb').forEach(drawThumb);
  }

  // A thumbnail: the start of the studio wall with its pieces.
  var thumbImgs = {};
  function img(src) {
    if (!thumbImgs[src]) {
      thumbImgs[src] = new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
    }
    return thumbImgs[src];
  }
  function drawThumb(cv) {
    var p = profiles.filter(function (x) { return x.id === cv.dataset.id; })[0];
    var d = p && L.sanitize(p.data);
    if (!d) return;
    var g = cv.getContext('2d'), sc = cv.height / d.bg.h, viewW = cv.width / sc;
    var x0 = Math.max(0, Math.min(d.bg.w - viewW, (d.start || 0) - viewW / 2));
    var pieces = d.items.filter(function (it) { return it.x + it.w / 2 > x0 && it.x - it.w / 2 < x0 + viewW; });
    Promise.all([img(d.bg.src)].concat(pieces.map(function (it) { return img(it.src); }))).then(function (ims) {
      g.fillStyle = '#F0E1D2'; g.fillRect(0, 0, cv.width, cv.height);
      if (ims[0]) g.drawImage(ims[0], x0 * ims[0].naturalWidth / d.bg.w, 0, viewW * ims[0].naturalWidth / d.bg.w, ims[0].naturalHeight, 0, 0, cv.width, cv.height);
      pieces.forEach(function (it, n) {
        var im = ims[n + 1];
        if (!im) return;
        g.save();
        g.translate((it.x - x0) * sc, it.y * sc);
        g.rotate((it.rot || 0) * Math.PI / 180);
        if (it.flip) g.scale(-1, 1);
        g.drawImage(im, -it.w * sc / 2, -it.h * sc / 2, it.w * sc, it.h * sc);
        g.restore();
      });
    });
  }

  function openData(d, id) {
    undo.push(clone(data));
    data = d; current = id; sel = null; dirty = false;
    if (scene !== 'in') setScene('in'); else { syncBg(); draw(); renderPanel(); }
    autosave();
  }

  // Leaving work that isn't in a saved layout: ask first.
  function okToLeave() {
    if (!dirty) return Promise.resolve(true);
    var name = current && profileName(current);
    return ask(name ? 'Thay đổi chưa lưu vào "' + name + '"' : 'Bản đang sửa chưa đặt tên',
      name ? 'Lưu vào "' + name + '" trước khi mở bố cục khác?' : 'Mở bố cục khác sẽ thay bản đang sửa. Lưu nó thành bố cục mới trước?',
      [{ v: null, t: 'Huỷ' }, { v: 'drop', t: 'Bỏ thay đổi', on: 'danger' }, { v: 'save', t: name ? 'Lưu rồi mở' : 'Lưu thành…', on: true }])
      .then(function (v) {
        if (!v) return false;
        if (v === 'drop') return true;
        var before = current;
        return Promise.resolve(saveLayout()).then(function () { return !dirty || current !== before; });
      });
  }

  function sheetClick(e) {
    var b = e.target.closest('[data-sh]');
    if (e.target.classList.contains('se-sheet')) { root.querySelector('.se-sheet').hidden = true; return; }
    if (!b) return;
    var a = b.dataset.sh, id = b.dataset.id, p = profiles.filter(function (x) { return x.id === id; })[0];
    var sh = root.querySelector('.se-sheet');
    if (a === 'close') { sh.hidden = true; return; }
    if (a === 'del') { confirmDel = id; renaming = null; return renderSheet(); }
    if (a === 'del-no' || a === 'ren-no') { confirmDel = null; renaming = null; return renderSheet(); }
    if (a === 'ren') { renaming = id; confirmDel = null; return renderSheet(); }
    if (a === 'undo-live') return undoPublish();
    if (a === 'new-copy') { sh.hidden = true; return saveAsNew(L.sanitize(data)); }
    if (a === 'new-blank') {
      return okToLeave().then(function (go) {
        if (!go) return;
        sh.hidden = true;
        openData(L.blank(lib.backgrounds[0]), null);
        toast('Tường trống — bấm "Lưu thành…" khi muốn đặt tên');
      });
    }
    if (!p) return;
    var d = L.sanitize(p.data);
    if (a === 'del-yes') {
      return DB.deleteStudioLayout(id).then(function () {
        if (current === id) current = null;
        confirmDel = null; toast('Đã xoá "' + (p.name || id) + '"'); return loadProfiles();
      }).catch(fail);
    }
    if (a === 'ren-yes') {
      var nm = sh.querySelector('.se-card-in').value.trim().slice(0, 60);
      if (!nm) return;
      var wasLive = p.name && p.name === liveName;
      return DB.saveStudioLayout(id, d, nm).then(function () {
        // the live row is matched by name: keep the "Đang chạy" mark
        return wasLive && rows.live ? DB.saveStudioLayout('live', L.sanitize(rows.live.data), nm) : null;
      }).then(function () { renaming = null; toast('Đã đổi tên thành "' + nm + '"'); return loadProfiles(); }).catch(fail);
    }
    if (!d) { toast('Bố cục này bị hỏng, không mở được.', true); return; }
    if (a === 'open') {
      return okToLeave().then(function (go) {
        if (!go) return;
        sh.hidden = true;
        openData(d, id);
        toast('Đã mở "' + (p.name || id) + '"');
        syncHead();
      });
    }
    if (a === 'live') return publish(d, p.name || id);
    if (a === 'dup') {
      var copyName = (p.name || 'Bố cục') + ' (bản sao)';
      return DB.saveStudioLayout(slug(copyName), d, copyName).then(function () {
        toast('Đã nhân bản thành "' + copyName + '"'); return loadProfiles();
      }).catch(fail);
    }
  }

  function clearScene() {
    remember();
    S().items = [];
    sel = null;
    draw(); renderPanel();
    status('Đã xoá hết đồ — xếp lại từ tường trống');
  }

  /* ---------- tool bar ---------- */
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
      ask('Xoá hết ' + S().items.length + ' món trong cảnh ' + (scene === 'out' ? '"Ngoài cửa"' : '"Trong studio"') + '?',
        'Vùng bấm, Udon và điểm xuất phát giữ nguyên. Bấm Hoàn tác để lấy lại.',
        [{ v: null, t: 'Thôi' }, { v: 'go', t: 'Xoá hết', on: 'danger' }]).then(function (v) { if (v) clearScene(); });
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
  }

  return { mount: mount, unmount: unmount, queueProduct: queueProduct, isDirty: function () { flushAutosave(); return false; } };
})();
