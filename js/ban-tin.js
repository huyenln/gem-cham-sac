// Gem Chạm Sắc — trang Bản tin
//
// Danh sách bài + đọc một bài, cùng trên một trang. Bài mở ra thì địa chỉ
// đổi thành ?bai=<slug> để gửi link cho nhau được, và nút Back của trình
// duyệt quay lại danh sách đúng như người dùng mong đợi.
//
// Nội dung bài do em gái gõ trong trang quản trị. KHÔNG bao giờ đưa thẳng
// vào innerHTML: chữ người dùng nhập mà chèn thành HTML là mở cửa cho mã lạ
// chạy trên trang. Ở đây mỗi đoạn thành một <p> với textContent.

(function () {
  'use strict';

  var STRINGS = {
    'title.news':       { vi: `Bản tin · Gem Chạm Sắc`, en: `Newsletter · Gem Chạm Sắc` },
    'nav.news':         { vi: `Bản tin`, en: `Newsletter` },
    'news.eyebrow':     { vi: `BẢN TIN`, en: `NEWSLETTER` },
    'news.h1':          { vi: `Chúng mình đã đi những đâu.`, en: `Where we've been.` },
    'news.lede':        { vi: `Workshop, hội chợ, những buổi ngồi cùng nhau cắt vải. Ghi lại ở đây để nhớ, và để bạn biết lần tới gặp chúng mình ở đâu.`, en: `Workshops, fairs, afternoons spent cutting fabric together. Written down so we remember — and so you know where to find us next.` },
    'news.loading':     { vi: `Đang tải…`, en: `Loading…` },
    'news.empty_h':     { vi: `Chưa có bài nào.`, en: `Nothing here yet.` },
    'news.empty_p':     { vi: `Chúng mình đang viết. Ghé lại sau nhé — hoặc để lại email ở dưới, có bài mới là chúng mình nhắn.`, en: `We're still writing. Come back soon — or leave your email below and we'll tell you when there's something new.` },
    'news.error':       { vi: `Chưa tải được bản tin. Bạn thử lại giúp chúng mình nhé.`, en: `We couldn't load the newsletter. Please try again.` },
    'news.retry':       { vi: `Thử lại`, en: `Try again` },
    'news.back':        { vi: `Về danh sách`, en: `All posts` },
    'news.read':        { vi: `Đọc tiếp`, en: `Read on` },
    'news.email_eyebrow': { vi: `Số tiếp theo,`, en: `The next one,` },
    'news.email_h':     { vi: `gửi thẳng vào hộp thư của bạn.`, en: `straight to your inbox.` },
    'news.email_p':     { vi: `Chúng mình không gửi nhiều — chỉ khi có workshop mới, hội chợ, hoặc một mùa mới bắt đầu.`, en: `We don't send much — only when there's a new workshop, a fair, or a new season starting.` },
    'news.email_btn':   { vi: `Nhận bản tin`, en: `Get the newsletter` }
  };
  if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STRINGS);

  function t(key, fallback) {
    if (window.GemI18n && window.GemI18n.t) {
      var v = window.GemI18n.t(key);
      if (v != null) return v;
    }
    return fallback != null ? fallback : key;
  }

  function lang() {
    return (window.GemI18n && window.GemI18n.getLang && window.GemI18n.getLang()) || 'vi';
  }

  function pick(post, field) {
    var en = lang() === 'en';
    return (en && post[field + '_en']) || post[field + '_vi'] || '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var MONTHS_VI = ['tháng 1','tháng 2','tháng 3','tháng 4','tháng 5','tháng 6',
                   'tháng 7','tháng 8','tháng 9','tháng 10','tháng 11','tháng 12'];

  // happened_on là kiểu date (YYYY-MM-DD), không có giờ nên không dính múi giờ.
  function dateLabel(ymd) {
    if (!ymd) return '';
    var y = ymd.slice(0, 4), m = parseInt(ymd.slice(5, 7), 10), d = parseInt(ymd.slice(8, 10), 10);
    if (lang() === 'en') {
      var EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return EN[m - 1] + ' ' + d + ', ' + y;
    }
    return d + ' ' + MONTHS_VI[m - 1] + ' ' + y;
  }

  /* ---------- render ---------- */
  var root, posts = [], current = null;

  function translate() {
    if (window.GemI18n) window.GemI18n.setLang(window.GemI18n.getLang());
  }

  function renderList() {
    current = null;

    if (!posts.length) {
      root.innerHTML =
        '<div class="news-empty">' +
          '<img src="images/mascot/udon_lying_smile.png" alt="Udon" class="news-empty-udon">' +
          '<p class="news-empty-h" data-i18n="news.empty_h"></p>' +
          '<p class="news-empty-p" data-i18n="news.empty_p"></p>' +
        '</div>';
      translate();
      return;
    }

    root.innerHTML = '<ul class="news-list">' + posts.map(function (p) {
      var cover = p.cover
        ? '<div class="news-cover"><img src="' + esc(p.cover) + '" alt="" loading="lazy"></div>'
        : '';
      var meta = [dateLabel(p.happened_on), p.place].filter(Boolean).join(' · ');
      return '<li class="news-card">' +
        '<a href="?bai=' + encodeURIComponent(p.slug) + '" data-slug="' + esc(p.slug) + '">' +
          cover +
          '<div class="news-card-body">' +
            (meta ? '<p class="news-meta">' + esc(meta) + '</p>' : '') +
            '<h2>' + esc(pick(p, 'title')) + '</h2>' +
            (pick(p, 'excerpt') ? '<p class="news-excerpt">' + esc(pick(p, 'excerpt')) + '</p>' : '') +
            '<span class="news-more" data-i18n="news.read"></span>' +
          '</div>' +
        '</a>' +
      '</li>';
    }).join('') + '</ul>';

    root.querySelectorAll('.news-card a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        // Giữ Ctrl/Cmd-click và chuột giữa mở tab mới như link bình thường
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openPost(a.getAttribute('data-slug'), true);
      });
    });
    translate();
  }

  function openPost(slug, pushState) {
    var p = posts.filter(function (x) { return x.slug === slug; })[0];
    if (!p) return renderList();
    current = p;

    // Chữ do người dùng gõ: mỗi đoạn thành một <p> bằng textContent, không
    // bao giờ ghép vào innerHTML.
    var body = document.createElement('div');
    body.className = 'news-body';
    pick(p, 'body').split(/\n\s*\n/).forEach(function (para) {
      var text = para.trim();
      if (!text) return;
      var el = document.createElement('p');
      el.textContent = text;
      body.appendChild(el);
    });

    var meta = [dateLabel(p.happened_on), p.place].filter(Boolean).join(' · ');
    root.innerHTML =
      '<article class="news-post">' +
        '<button type="button" class="news-back" data-i18n="news.back"></button>' +
        (meta ? '<p class="news-meta">' + esc(meta) + '</p>' : '') +
        '<h2 class="news-post-h">' + esc(pick(p, 'title')) + '</h2>' +
        (p.cover ? '<div class="news-cover big"><img src="' + esc(p.cover) + '" alt=""></div>' : '') +
        '<div class="news-body-slot"></div>' +
        ((p.images || []).length
          ? '<div class="news-gallery">' + p.images.map(function (src) {
              return '<img src="' + esc(src) + '" alt="" loading="lazy">';
            }).join('') + '</div>'
          : '') +
      '</article>';

    root.querySelector('.news-body-slot').replaceWith(body);
    root.querySelector('.news-back').addEventListener('click', function () {
      history.pushState({}, '', location.pathname);
      renderList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (pushState) {
      history.pushState({ slug: slug }, '', '?bai=' + encodeURIComponent(slug));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    document.title = pick(p, 'title') + ' · Gem Chạm Sắc';
    translate();
  }

  function route() {
    var slug = new URLSearchParams(location.search).get('bai');
    if (slug) openPost(slug, false); else renderList();
  }

  function renderError() {
    root.innerHTML =
      '<div class="news-error">' +
        '<p data-i18n="news.error"></p>' +
        '<button type="button" class="btn btn-ghost news-retry" data-i18n="news.retry"></button>' +
      '</div>';
    root.querySelector('.news-retry').addEventListener('click', load);
    translate();
  }

  function load() {
    root.innerHTML = '<p class="news-loading" data-i18n="news.loading"></p>';
    translate();
    if (!window.GemDB || !window.GemDB.posts) return renderError();
    window.GemDB.posts().then(function (rows) {
      posts = rows || [];
      route();
    }).catch(renderError);
  }

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('news-root');
    if (!root) return;

    window.addEventListener('popstate', route);

    // Vẽ lại khi đổi ngôn ngữ. Phải so ngôn ngữ trước: translate() gọi
    // setLang(), mà setLang() lại phát chính sự kiện này — không chặn thì
    // thành vòng lặp vô hạn.
    var lastLang = lang();
    document.addEventListener('gem:langchange', function (e) {
      var l = (e.detail && e.detail.lang) || lang();
      if (l === lastLang) return;
      lastLang = l;
      if (current) openPost(current.slug, false); else if (posts.length) renderList();
    });

    load();
  });
})();
