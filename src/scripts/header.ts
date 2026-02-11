const header = document.getElementById('site-header');
const darkSection = document.querySelector('[data-header-dark]');
if (header && darkSection) {
  function updateHeader() {
    if (!darkSection) return;
    if (!header) return;
    const rect = darkSection.getBoundingClientRect();
    header.classList.toggle('header-over-dark', rect.top <= 80);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
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

// pixel trail / pixel cursor toggle cycles: gooey trail -> pixel trail -> off
import { initPixelCursor, type PixelCursorInstance } from './PixelCursor';

type CursorMode = 'gooey' | 'pixel' | 'off';
const CURSOR_MODES: CursorMode[] = ['gooey', 'pixel', 'off'];
const CURSOR_LABELS: Record<CursorMode, string> = {
  gooey: 'gooey',
  pixel: 'pixel',
  off: 'off',
};

const cursorToggle = document.getElementById('pixel-trail-toggle');
const trailContainer = document.getElementById('pixel-trail-container');
const pixelCursorContainer = document.getElementById('pixel-cursor-container');

if (cursorToggle) {
  let modeIndex = 0; // starts on gooey
  let pixelCursorInstance: PixelCursorInstance | null = null;

  function getCurrentCursorColor(): string {
    const dark = document.querySelector('[data-header-dark]');
    if (!dark) return '#000000';
    const rect = dark.getBoundingClientRect();
    // if dark section is visible in the upper portion of the viewport
    return rect.top <= window.innerHeight * 0.5 && rect.bottom > 0
      ? '#FFEE00'
      : '#000000';
  }

  function applyMode(mode: CursorMode) {
    // trail container
    if (trailContainer) {
      trailContainer.style.display = mode === 'gooey' ? '' : 'none';
    }

    // pixel cursor
    if (pixelCursorContainer) {
      if (mode === 'pixel') {
        pixelCursorContainer.style.display = '';
        if (!pixelCursorInstance) {
          pixelCursorInstance = initPixelCursor(pixelCursorContainer, {
            columns: 100,
            color: getCurrentCursorColor(),
            fadeMs: 100,
          });
        }
      } else {
        pixelCursorContainer.style.display = 'none';
        if (pixelCursorInstance) {
          pixelCursorInstance.destroy();
          pixelCursorInstance = null;
        }
      }
    }

    if (cursorToggle) {
      cursorToggle.textContent = CURSOR_LABELS[mode];
      const isActive = mode !== 'off';
      cursorToggle.classList.toggle('is-active', isActive);
      cursorToggle.setAttribute('aria-pressed', String(isActive));
    }
  }

  // keep pixel cursor color in sync when scrolling through dark/light sections
  function onScroll() {
    if (pixelCursorInstance) {
      pixelCursorInstance.setColor(getCurrentCursorColor());
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // initialise
  applyMode(CURSOR_MODES[modeIndex]);

  cursorToggle.addEventListener('click', () => {
    modeIndex = (modeIndex + 1) % CURSOR_MODES.length;
    applyMode(CURSOR_MODES[modeIndex]);
  });
}

let lastHackNightScroll = 0;
function scrollToHackNight() {
  const el = document.getElementById('hack-night');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lastHackNightScroll = Date.now();
  }
}

document.addEventListener(
  'click',
  (e: MouseEvent) => {
    if (!(e.target as HTMLElement | null)?.closest?.('a[href="#hack-night"]'))
      return;
    e.preventDefault();
    if (Date.now() - lastHackNightScroll < 500) return; // avoid double scroll on mobile
    scrollToHackNight();
  },
  true
);

document.addEventListener(
  'touchend',
  (e: TouchEvent) => {
    if (!(e.target as HTMLElement | null)?.closest?.('a[href="#hack-night"]'))
      return;
    e.preventDefault();
    scrollToHackNight();
  },
  { passive: false }
);
