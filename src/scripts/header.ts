const header = document.getElementById('site-header');
if (header) {
  const siteHeader = header;
  // Any block marked [data-header-dark] that sits under the header bar turns
  // the nav cream. display:none blocks have an empty rect and never match.
  const darkBlocks =
    document.querySelectorAll<HTMLElement>('[data-header-dark]');
  let lastY = window.scrollY;
  let queued = false;
  function updateHeader() {
    queued = false;
    const y = window.scrollY;
    const barHeight = siteHeader.offsetHeight;
    let overDark = false;
    darkBlocks.forEach((block) => {
      const rect = block.getBoundingClientRect();
      if (rect.top <= barHeight && rect.bottom > barHeight / 2) overDark = true;
    });
    siteHeader.classList.toggle('header-over-dark', overDark);
    // Near the top the bar is transparent and always shown. Further down it
    // hides while reading down and returns, solid, on the way back up. A few
    // pixels of slack keep trackpad jitter from flickering it.
    const atTop = y < barHeight;
    const delta = y - lastY;
    if (atTop) siteHeader.classList.remove('header-hidden');
    else if (delta > 6 && !siteHeader.contains(document.activeElement))
      siteHeader.classList.add('header-hidden');
    else if (delta < -6) siteHeader.classList.remove('header-hidden');
    siteHeader.classList.toggle('header-solid', !atTop);
    if (Math.abs(delta) > 6 || atTop) lastY = y;
  }
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateHeader);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  // keyboard users tabbing back into the nav should always see it
  siteHeader.addEventListener('focusin', () =>
    siteHeader.classList.remove('header-hidden')
  );
  updateHeader();
}

// mobile menu: toggle, scroll lock, close on link click
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
if (menuToggle && mobileMenu) {
  const menu = mobileMenu;
  const btn = menuToggle;
  function openMenu() {
    if (!menu || !btn) return;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!menu || !btn) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
  }
  function toggleMenu() {
    if (!menu) return;
    if (menu.classList.contains('is-open')) closeMenu();
    else openMenu();
  }
  btn.addEventListener('click', toggleMenu);
  menu.querySelectorAll('.mobile-menu__link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });
}

// scroll-in for [data-reveal]; the `.js` class keeps content visible without JS
document.documentElement.classList.add('js');
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px' }
);
document
  .querySelectorAll('[data-reveal]')
  .forEach((el) => revealObserver.observe(el));
