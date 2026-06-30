import { getCollageDarkAnchor } from '../utils/collageAnchor';

const header = document.getElementById('site-header');
if (header) {
  const siteHeader = header;
  function updateHeader() {
    const darkSection = getCollageDarkAnchor();
    if (!darkSection) return;
    const rect = darkSection.getBoundingClientRect();
    siteHeader.classList.toggle('header-over-dark', rect.top <= 80);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
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
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!menu || !btn) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
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
