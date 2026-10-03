// Gem Chạm Sắc — trình lắp Studio Gem (tab "Lắp studio" trong admin.html, chỉ owner)
//
// Pick a background strip, drop pieces from the asset library (or upload a
// new one to the gem-media bucket), drag to move, drag a corner to resize,
// drag the round handle to rotate. Hotspots (what opens when tapped), the
// spot where the character stops for each, Udon and the start point are
// placed the same way. "Lưu nháp" saves the draft; "Xuất bản" makes it what
// customers see. studio.html?nhap=1 previews the draft (owner only).
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
  var group = 'props';

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
    root.innerHTML =
      '<div class="se">' +
        '<div class="se-bar">' +
          '<label class="se-bg">Nền <select class="se-bgsel"></select></label>' +
          '<button type="button" class="ad-btn" data-se="undo">Hoàn tác</button>' +
          '<button type="button" class="ad-btn" data-se="zout" aria-label="Thu nhỏ">−</button>' +
          '<button type="button" class="ad-btn" data-se="zin" aria-label="Phóng to">+</button>' +
          '<span class="se-status" role="status"></span>' +
          '<a class="ad-btn" href="studio.html?nhap=1">Xem thử bản nháp</a>' +
          '<button type="button" class="ad-btn" data-se="save">Lưu nháp</button>' +
          '<button type="button" class="ad-btn on" data-se="publish">Xuất bản</button>' +
        '</div>' +
        '<div class="se-stage"><div class="se-world"><img class="se-bgimg" alt="" draggable="false"></div></div>' +
        '<div class="se-panel"></div>' +
      '</div>';
    stageEl = root.querySelector('.se-stage');
    worldEl = root.querySelector('.se-world');
    panelEl = root.querySelector('.se-panel');
    statusEl = root.querySelector('.se-status');
    status('Đang tải...');

    root.querySelector('.se-bar').addEventListener('click', barClick);
    root.querySelector('.se-bgsel').addEventListener('change', function (e) {
      var b = lib.backgrounds[+e.target.value];
      if (!b) return;
      remember();
      data.bg = { src: b.src, w: b.w, h: b.h };
      draw();
    });
    worldEl.addEventListener('pointerdown', pointerDown);
    panelEl.addEventListener('click', panelClick);
    panelEl.addEventListener('change', panelChange);
    document.addEventListener('keydown', keyDown);
    window.addEventListener('resize', draw);

    return Promise.all([
      fetch('images/studio/assets.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
      DB.studioLayout('draft').catch(function () { return null; }),
      DB.studioLayout('live').catch(function () { return null; })
    ]).then(function (r) {
      lib = r[0];
      data = L.sanitize(r[1]) || L.sanitize(r[2]) || L.blank(lib.backgrounds[0]);
      root.querySelector('.se-bgsel').innerHTML = lib.backgrounds.map(function (b, i) {
        return '<option value="' + i + '">' + esc(b.src.split('/').pop()) + '</option>';
      }).join('');
      lib.backgrounds.forEach(function (b, i) { if (b.src === data.bg.src) root.querySelector('.se-bgsel').value = i; });
      status(r[1] ? 'Đang sửa bản nháp' : r[2] ? 'Bắt đầu từ bản đang chạy' : 'Bố cục mới');
      draw();
      renderPanel();
    }).catch(function (err) {
      status('Không tải được: ' + (err.message || ''), true);
    });
  }

  function unmount() {
    document.removeEventListener('keydown', keyDown);
    window.removeEventListener('resize', draw);
  }

  /* ---------- drawing ---------- */
  function px(v) { return (v * k).toFixed(1) + 'px'; }

  function draw() {
    if (!data || !worldEl) return;
    var h = stageEl.clientHeight || 420;
    k = (h - 16) / data.bg.h * zoom;
    worldEl.style.width = px(data.bg.w);
    worldEl.style.height = px(data.bg.h);
    var bg = worldEl.querySelector('.se-bgimg');
    if (bg.getAttribute('src') !== data.bg.src) bg.src = data.bg.src;
    worldEl.querySelectorAll('.se-el').forEach(function (n) { n.remove(); });

    data.items.forEach(function (it, i) {
      var n = document.createElement('div');
      n.className = 'se-el se-item' + (it.layer === 'front' ? ' is-front' : '') + (it.frame ? ' is-frame' : '') +
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
    place(guy, data.start - 70, feet - ph, 140, ph);
    guy.innerHTML = '<img src="images/studio/char/p1-front.webp" alt="" draggable="false"><span>Điểm xuất phát</span>';
    worldEl.appendChild(guy);
    var floor = document.createElement('div');
    floor.className = 'se-el se-floor';
    place(floor, 0, feet, data.bg.w, 2);
    worldEl.appendChild(floor);

    L.SPOTS.forEach(function (sp) {
      var o = data.hot[sp.id], b = o.box;
      var n = document.createElement('div');
      n.className = 'se-el se-hot' + (isSel('hot', sp.id) ? ' is-sel' : '');
      n.dataset.kind = 'hot'; n.dataset.id = sp.id;
      place(n, b[0], b[1], b[2] - b[0], b[3] - b[1]);
      n.innerHTML = '<span class="se-hot-label">' + esc(sp.vi) + '</span>';
      if (isSel('hot', sp.id)) handles(n, false);
      worldEl.appendChild(n);
      var st = document.createElement('div');
      st.className = 'se-el se-stand' + (isSel('stand', sp.id) ? ' is-sel' : '');
      st.dataset.kind = 'stand'; st.dataset.id = sp.id;
      place(st, o.stand - 14, feet - 60, 28, 64);
      st.title = 'Chỗ dừng: ' + sp.vi;
      worldEl.appendChild(st);
    });

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

  function pointerDown(e) {
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

    function move(ev) {
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
        data.start = Math.round(Math.max(120, Math.min(data.bg.w - 120, start.v + dx)));
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
    if (sel.kind === 'item') return data.items[sel.i];
    if (sel.kind === 'hot' || sel.kind === 'stand') return data.hot[sel.id];
    if (sel.kind === 'udon') return data.udon;
    if (sel.kind === 'start') return { v: data.start };
    return null;
  }

  function keyDown(e) {
    if (!root || !document.body.contains(root) || !data) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); return; }
    if (!sel || sel.kind !== 'item') return;
    var it = data.items[sel.i];
    var step = e.shiftKey ? 20 : 2;
    var m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); remember(); it.x += m[0]; it.y += m[1]; draw(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('del'); }
  }

  function doUndo() {
    var last = undo.pop();
    if (!last) return;
    data = last; sel = null; dirty = true;
    status('Đã hoàn tác');
    draw(); renderPanel();
  }

  /* ---------- side panel: selection tools + library ---------- */
  function renderPanel() {
    if (!lib) return;
    var tools = '';
    if (sel && sel.kind === 'item') {
      var it = data.items[sel.i];
      tools = '<div class="se-tools">' +
        '<b>Đồ đang chọn</b>' +
        '<label><input type="radio" name="se-layer" value="back"' + (it.layer !== 'front' ? ' checked' : '') + '> Sau nhân vật</label>' +
        '<label><input type="radio" name="se-layer" value="front"' + (it.layer === 'front' ? ' checked' : '') + '> Trước nhân vật</label>' +
        '<label>Xoay <input type="number" name="se-rot" value="' + it.rot + '" step="1" min="-180" max="180"> độ</label>' +
        '<div class="se-row">' +
          '<button type="button" class="ad-btn" data-act="up">Lên trên</button>' +
          '<button type="button" class="ad-btn" data-act="down">Xuống dưới</button>' +
          '<button type="button" class="ad-btn" data-act="flip">Lật ngang</button>' +
          '<button type="button" class="ad-btn" data-act="frame">' + (it.frame ? 'Bỏ khung' : 'Thêm khung') + '</button>' +
          '<button type="button" class="ad-btn" data-act="dup">Nhân bản</button>' +
          '<button type="button" class="ad-btn danger" data-act="del">Xoá</button>' +
        '</div></div>';
    } else if (sel && (sel.kind === 'hot' || sel.kind === 'stand')) {
      var name = L.SPOTS.filter(function (s) { return s.id === sel.id; })[0].vi;
      tools = '<div class="se-tools"><b>' + esc(name) + '</b><p class="ad-hint">Khung nét đứt = chỗ khách chạm để mở. ' +
        'Cột nhỏ ở sàn = chỗ nhân vật dừng lại. Kéo góc để đổi cỡ.</p></div>';
    } else {
      tools = '<p class="ad-hint">Chọn một món trong thư viện để thêm vào giữa màn hình. Kéo để di chuyển, kéo góc để đổi cỡ, ' +
        'kéo nút tròn để xoay. Phím mũi tên dịch từng chút, Ctrl+Z hoàn tác.</p>';
    }
    var g = lib.groups.filter(function (x) { return x.id === group; })[0] || lib.groups[0];
    panelEl.innerHTML = tools +
      '<div class="se-lib">' +
        '<div class="se-tabs">' + lib.groups.map(function (x) {
          return '<button type="button" class="ad-filter' + (x.id === g.id ? ' active' : '') + '" data-group="' + esc(x.id) + '">' +
            esc(x.label) + '</button>';
        }).join('') +
        '<label class="ad-filter se-upload">+ Tải ảnh mới<input type="file" accept="image/png,image/webp,image/jpeg" hidden></label>' +
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
      var g = lib.groups.filter(function (x) { return x.id === group; })[0];
      add(g.items[+b.dataset.asset]);
      return;
    }
    if ((b = e.target.closest('[data-act]'))) act(b.dataset.act);
  }

  function panelChange(e) {
    if (e.target.type === 'file') return upload(e.target.files && e.target.files[0]);
    if (!sel || sel.kind !== 'item') return;
    var it = data.items[sel.i];
    remember();
    if (e.target.name === 'se-layer') it.layer = e.target.value;
    if (e.target.name === 'se-rot') it.rot = Math.max(-180, Math.min(180, Math.round(+e.target.value || 0)));
    draw();
  }

  function act(a) {
    if (!sel || sel.kind !== 'item') return;
    var i = sel.i, it = data.items[i];
    remember();
    if (a === 'del') { data.items.splice(i, 1); sel = null; }
    else if (a === 'dup') {
      var c = clone(it); c.x += 40; c.y += 20;
      data.items.push(c); sel = { kind: 'item', i: data.items.length - 1 };
    } else if (a === 'flip') it.flip = !it.flip;
    else if (a === 'frame') it.frame = !it.frame;
    else if (a === 'up' && i < data.items.length - 1) {
      data.items.splice(i, 1); data.items.splice(i + 1, 0, it); sel.i = i + 1;
    } else if (a === 'down' && i > 0) {
      data.items.splice(i, 1); data.items.splice(i - 1, 0, it); sel.i = i - 1;
    }
    draw(); renderPanel();
  }

  // New piece in the middle of what's on screen, a sensible size.
  function add(a) {
    if (!a || !L.srcOk(a.src)) return;
    remember();
    var h = a.frame ? 110 : Math.min(420, a.h * 0.6);
    var w = Math.round(h * a.w / a.h);
    var cx = (stageEl.scrollLeft + stageEl.clientWidth / 2) / k;
    data.items.push({ src: a.src, x: Math.round(cx), y: Math.round(L.FEET_Y - h / 2 - 40), w: w, h: Math.round(h),
      rot: 0, flip: false, layer: 'back', frame: !!a.frame });
    sel = { kind: 'item', i: data.items.length - 1 };
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

  /* ---------- save / publish ---------- */
  function barClick(e) {
    var b = e.target.closest('[data-se]');
    if (!b || !data) return;
    var a = b.dataset.se;
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
        ? DB.saveStudioLayout('draft', clean).then(function () { return DB.saveStudioLayout('live', clean); })
        : null);
    if (!job) { b.disabled = false; return; }
    job.then(function () {
      dirty = false;
      status(a === 'save' ? 'Đã lưu nháp' : 'Đã xuất bản — khách thấy bố cục mới');
    }).catch(function (err) {
      status('Không lưu được: ' + (err.message || '') + (err.status === 403 || err.status === 401 ? ' (chỉ tài khoản chủ được lưu)' : ''), true);
    }).then(function () { b.disabled = false; });
  }

  return { mount: mount, unmount: unmount, isDirty: function () { return dirty; } };
})();
