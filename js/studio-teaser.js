/* Home page: the Studio 2D preview video (made by tools/studio-trailer.py).
   A phone gets the portrait one, a computer the landscape one (the same width
   as the picture's <source> in index.html), each in the page's language: the
   studio's own text is in it. It is fetched only when the block comes near the
   screen, plays muted while a third of it shows, and pauses off screen. A
   visitor who asked for less motion or to save data sees the first frame and a
   play button. The button pauses / plays it at any time (a picture that moves
   by itself for more than five seconds needs a way to stop it). */
(function () {
  'use strict';

  var box = document.querySelector('.studio-teaser-media');
  if (!box) return;
  var video = box.querySelector('video'), btn = box.querySelector('.studio-teaser-play');
  var src = box.querySelector('picture source'), img = box.querySelector('picture img');
  if (!video || !btn || !src || !img || typeof video.play !== 'function') return;

  var wide = window.matchMedia('(min-width: 800px)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !!(navigator.connection && navigator.connection.saveData);
  var held = calm;      // paused by the visitor (or never started for them)
  var inView = false;   // a third of it on screen
  var failed = false;   // no video to be had: the picture stays, no button

  function lang() { return window.GemI18n && window.GemI18n.getLang() === 'en' ? 'en' : 'vi'; }
  function base(shape) { return 'studio-2d-' + shape + '-' + lang(); }

  // the first frames, in the page's language
  function posters() {
    src.srcset = 'images/studio/' + base('ngang') + '.webp';
    img.src = 'images/studio/' + base('doc') + '.webp';
  }

  // the video for this screen and language; another one starts from its start
  function load() {
    var want = 'video/' + base(wide.matches ? 'ngang' : 'doc') + '.mp4';
    if (video.getAttribute('src') === want) return;
    box.classList.remove('is-on');
    failed = false;
    video.setAttribute('src', want);
    video.load();
  }

  function show() {
    var paused = held || failed;
    var k = paused ? 'home.studio_play' : 'home.studio_pause';
    box.classList.toggle('is-paused', paused);
    btn.hidden = failed;
    btn.setAttribute('data-i18n-attr', 'aria-label:' + k);
    btn.setAttribute('aria-label', window.GemI18n ? window.GemI18n.t(k) : (paused ? 'Phát video' : 'Tạm dừng video'));
  }

  function sync() {
    if (!held && inView && !failed) {
      load();
      video.muted = true;   // a phone plays a video by itself only muted
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (e) {
          if (e && e.name === 'AbortError') return;   // a newer load() or pause() came first
          held = true;   // the browser would not: the button is there to start it
          show();
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
    show();
  }

  video.addEventListener('playing', function () { box.classList.add('is-on'); });
  video.addEventListener('error', function () { failed = true; box.classList.remove('is-on'); show(); });
  btn.addEventListener('click', function () { held = !held; sync(); });

  if ('IntersectionObserver' in window) {
    // fetched a little before it shows, so it is ready when it does
    new IntersectionObserver(function (es) {
      if (!held && es.some(function (e) { return e.isIntersecting; })) { video.preload = 'auto'; load(); }
    }, { rootMargin: '300px 0px' }).observe(box);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { inView = e.isIntersecting && e.intersectionRatio >= 0.33; });
      sync();
    }, { threshold: [0, 0.33, 0.66, 1] }).observe(box);
  } else {
    inView = true;
  }

  // a phone turned, or a window resized, across the breakpoint
  function relayout() { if (video.getAttribute('src')) { load(); sync(); } }
  if (wide.addEventListener) wide.addEventListener('change', relayout);
  else if (wide.addListener) wide.addListener(relayout);
  document.addEventListener('gem:langchange', function () { posters(); relayout(); show(); });

  posters();
  sync();
})();
