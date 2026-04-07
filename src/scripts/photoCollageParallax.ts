import { getCollageDarkAnchor } from '../utils/collageAnchor';

/** Subtle per-piece vertical parallax vs the rest of the page while scrolling. */
export function initPhotoCollageParallax(): () => void {
  function getPieces() {
    const root = getCollageDarkAnchor();
    return root?.querySelectorAll<HTMLElement>('.photo-collage__piece');
  }
  if (!getPieces()?.length) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /** Per-piece multipliers — wider spread = more depth separation vs neighbors */
  const speeds = [0.14, 0.26, 0.09, 0.32, 0.17, 0.22, 0.29];

  function tick() {
    const list = getPieces();
    if (!list?.length) return;
    const vh = window.innerHeight;
    const mid = vh * 0.5;
    list.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = centerY - mid;
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

  return () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    cancelAnimationFrame(raf);
  };
}
