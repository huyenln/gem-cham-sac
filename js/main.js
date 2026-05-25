// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-mobile');
  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      menu.classList.toggle('open');
    });
  }

  // Product TOC: Smooth scroll and active state
  const tocItems = document.querySelectorAll('.product-toc .toc-item');
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
            const activeItems = document.querySelectorAll(`.product-toc .toc-item[href="#${id}"]`);
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
      const isMidSize = window.matchMedia('(min-width: 768px) and (max-width: 1399px)').matches;

      if (isMobile) {
        // Mobile: move popup to body for backdrop layering
        if (udonPopup.parentElement !== document.body) {
          document.body.appendChild(udonPopup);
        }
        // Show backdrop on mobile
        createBackdrop();
      } else if (isMidSize) {
        // Mid-size (768-1399px): keep at body to prevent content shift
        if (udonPopup.parentElement !== document.body) {
          document.body.appendChild(udonPopup);
        }
        // No backdrop on mid-size desktop
      } else {
        // Large desktop (1400px+): move popup inside .hero-mascot for relative positioning
        const heroMascot = document.querySelector('.hero-mascot');
        if (heroMascot && udonPopup.parentElement !== heroMascot) {
          heroMascot.appendChild(udonPopup);
        }
        // No backdrop on large desktop
      }

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
