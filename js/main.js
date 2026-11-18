// The sticky header's real height, as --header-h on <html>: the product TOC
// sticks right under it and anchors (#kit-kinusaiga from the kit's QR code,
// #dat-lich) land below it. A fixed 72px went stale when the "Season 02" strip
// moved under the nav (the TOC then hid under the header on phones), and the
// English hint inside the header changes the height again when it closes.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  function setH() {
    // the open phone menu is inside the header but covers the page: not counted
    var menu = header.querySelector('.nav-mobile.open');
    var h = header.offsetHeight - (menu ? menu.offsetHeight : 0);
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setH();
  if (window.ResizeObserver) new ResizeObserver(setH).observe(header);
  else window.addEventListener('resize', setH);
})();

// Videos marked data-no-save (the kit tutorial): no right-click / long-press
// menu, so no "Save video as…". Only stops the casual way: the file is still
// public at its URL (Anna 18/11/2026).
document.addEventListener('contextmenu', function (e) {
  var t = e.target;
  if (t && t.closest && t.closest('video[data-no-save]')) e.preventDefault();
});

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-mobile');
  if (toggle && menu) {
    // The open menu lives in the sticky header, so scrolling the page never
    // reaches its bottom: cap it at the screen and let it scroll by itself
    // (the "Nhắn cho Gem" links at the end sat below the fold on a 640px phone).
    const fitMenu = function () {
      if (!menu.classList.contains('open')) { menu.style.maxHeight = ''; return; }
      menu.style.maxHeight = Math.max(160, window.innerHeight - menu.getBoundingClientRect().top) + 'px';
    };
    toggle.addEventListener('click', function() {
      menu.classList.toggle('open');
      // the floating basket (js/basket.js) would sit on the menu's last links
      document.documentElement.classList.toggle('nav-open', menu.classList.contains('open'));
      fitMenu();
    });
    window.addEventListener('resize', fitMenu);
  }

  // "Về Gem" dropdown (desktop). The mobile drawer lists the sub-pages
  // indented instead, so this only has to handle the pointer/keyboard case.
  const subParent = document.querySelector('.nav-menu .has-sub');
  if (subParent) {
    const subBtn = subParent.querySelector('.nav-sub-toggle');
    const subList = subParent.querySelector('.nav-sub');

    // Hands keyboard control to the button; see the .has-js note in style.css
    document.documentElement.classList.add('has-js');

    function setSub(open) {
      subBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      subList.classList.toggle('open', open);
    }

    subBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setSub(!subList.classList.contains('open'));
    });

    document.addEventListener('click', function (e) {
      if (!subParent.contains(e.target)) setSub(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && subList.classList.contains('open')) {
        setSub(false);
        subBtn.focus();
      }
    });
    subParent.addEventListener('focusout', function (e) {
      if (!subParent.contains(e.relatedTarget)) setSub(false);
    });
  }

  // Product TOC: Smooth scroll and active state
  const tocItems = document.querySelectorAll('.product-toc-mobile .toc-item, .product-toc-sidebar .toc-item');
  if (tocItems.length > 0) {
    // Smooth scroll on click
    tocItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // IntersectionObserver for active state
    const sections = Array.from(tocItems).map(item => {
      const id = item.getAttribute('href').substring(1);
      return document.getElementById(id);
    }).filter(Boolean);

    if (sections.length > 0) {
      const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Remove active class from all items
            tocItems.forEach(item => item.classList.remove('active'));

            // Add active class to corresponding TOC item
            const id = entry.target.getAttribute('id');
            const activeItems = document.querySelectorAll(`.product-toc-mobile .toc-item[href="#${id}"], .product-toc-sidebar .toc-item[href="#${id}"]`);
            activeItems.forEach(item => item.classList.add('active'));
          }
        });
      }, observerOptions);

      sections.forEach(section => observer.observe(section));
    }
  }

  // Udon easter egg popup
  const udonTrigger = document.querySelector('.udon-trigger');
  const udonPopup = document.querySelector('.udon-popup');
  const udonCloseBtn = document.querySelector('.udon-popup-close');

  if (udonTrigger && udonPopup && udonCloseBtn) {
    let backdrop = null;

    // Create backdrop element
    function createBackdrop() {
      backdrop = document.createElement('div');
      backdrop.className = 'udon-popup-backdrop';
      backdrop.addEventListener('click', closeUdonPopup);
      document.body.appendChild(backdrop);
      // Trigger reflow to enable transition
      backdrop.offsetHeight;
      backdrop.classList.add('visible');
    }

    // Remove backdrop element
    function removeBackdrop() {
      if (backdrop) {
        backdrop.classList.remove('visible');
        setTimeout(() => {
          if (backdrop && backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
            backdrop = null;
          }
        }, 200); // Match CSS transition duration
      }
    }

    // Open popup
    function openUdonPopup() {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        // Mobile: move popup to body for backdrop layering
        if (udonPopup.parentElement !== document.body) {
          document.body.appendChild(udonPopup);
        }
        createBackdrop();
      }
      // Desktop: position:fixed in CSS handles positioning, no DOM move needed

      udonPopup.setAttribute('aria-hidden', 'false');
      udonCloseBtn.focus();
    }

    // Close popup
    function closeUdonPopup() {
      udonPopup.setAttribute('aria-hidden', 'true');
      removeBackdrop();
      udonTrigger.focus();
    }

    // Toggle popup on Udon click
    udonTrigger.addEventListener('click', function() {
      const isHidden = udonPopup.getAttribute('aria-hidden') === 'true';
      if (isHidden) {
        openUdonPopup();
      } else {
        closeUdonPopup();
      }
    });

    // Keyboard support for trigger
    udonTrigger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const isHidden = udonPopup.getAttribute('aria-hidden') === 'true';
        if (isHidden) {
          openUdonPopup();
        } else {
          closeUdonPopup();
        }
      }
    });

    // Close button
    udonCloseBtn.addEventListener('click', closeUdonPopup);

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && udonPopup.getAttribute('aria-hidden') === 'false') {
        closeUdonPopup();
      }
    });

    // Close when clicking outside popup (but not on Udon)
    document.addEventListener('click', function(e) {
      if (udonPopup.getAttribute('aria-hidden') === 'false') {
        if (!udonPopup.contains(e.target) && !udonTrigger.contains(e.target)) {
          closeUdonPopup();
        }
      }
    });

    // Close popup on resize across breakpoint (cleaner UX)
    window.addEventListener('resize', function() {
      if (udonPopup.getAttribute('aria-hidden') === 'false') {
        closeUdonPopup();
      }
    });
  }

});
