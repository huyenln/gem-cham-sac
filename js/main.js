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
});
