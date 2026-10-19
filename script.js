(() => {
  const root = document.documentElement;
  const progress = document.getElementById('progressBar');
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  const year = document.getElementById('year');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (year) year.textContent = String(new Date().getFullYear());

  let ticking = false;
  const updateProgress = () => {
    ticking = false;
    if (!progress) return;
    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
  };
  const requestProgress = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress, { passive: true });
  updateProgress();

  if (toggle && menu) {
    const setMenu = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 861px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
  }

  const nodes = Array.from(document.querySelectorAll('.reveal'));
  const showAll = () => nodes.forEach(node => node.classList.add('visible'));

  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

    nodes.forEach(node => {
      const siblings = Array.from(node.parentElement.children).filter(child => child.classList.contains('reveal'));
      const order = Math.min(siblings.indexOf(node), 3);
      node.style.transitionDelay = `${order * 70}ms`;
      observer.observe(node);
    });

    window.addEventListener('load', () => {
      nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) node.classList.add('visible');
      });
    });
    window.addEventListener('beforeprint', showAll);
  }

  document.querySelectorAll('video').forEach(video => {
    video.muted = true;
    video.setAttribute('playsinline', '');
    if (reduced) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) play(); else video.pause(); });
      }, { threshold: 0.15 }).observe(video);
    } else {
      play();
    }
  });
})();
