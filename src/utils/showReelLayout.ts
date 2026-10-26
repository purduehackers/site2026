// Also serialized into the HTML immediately after the reel. Reserve the sticky
// scroll distance before first paint, without waiting for the animation bundle.
export function measureShowReel(reel: HTMLElement) {
  const content = reel.querySelector<HTMLElement>('.show-reel__content');
  if (!content) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const enoughRoom = content.offsetHeight + 192 <= window.innerHeight;
  reel.toggleAttribute('data-pinned', !reducedMotion.matches && enoughRoom);
}
