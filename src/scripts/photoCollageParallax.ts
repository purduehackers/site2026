import { getCollageDarkAnchor } from '../utils/collageAnchor';

/** Subtle per-piece vertical parallax vs the rest of the page while scrolling. */
export function initPhotoCollageParallax(): () => void {
  const root = getCollageDarkAnchor();
  const pieces = root?.querySelectorAll<HTMLElement>('.photo-collage__piece');
  if (!pieces?.length) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /** Per-piece multipliers by piece number (1–7), matching top offsets in
   * global.css: pieces higher in the collage (2, 3, 7) move most, lowest (1, 5) least. */
  const speeds = [0.13, 0.32, 0.29, 0.22, 0.18, 0.21, 0.26];

  function tick() {
    const vh = window.innerHeight;
    const mid = vh * 0.5;
    pieces!.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const dist = rect.top + rect.height / 2 - mid;
      const speed = speeds[i % speeds.length];
      const py = dist * speed * -0.55;
      el.style.setProperty('--py', `${py.toFixed(2)}px`);
    });
  }

  let raf = 0;
  function onScrollOrResize() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  tick();

  function onLoad() { requestAnimationFrame(tick); }
  if (document.readyState === 'complete') {
    onLoad();
  } else {
    window.addEventListener('load', onLoad, { once: true });
  }

  return () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    window.removeEventListener('load', onLoad);
    cancelAnimationFrame(raf);
  };
}
