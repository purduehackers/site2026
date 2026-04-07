/** Which collage instance is active for layout (desktop top vs mobile after Friends). */
export function getCollageDarkAnchor(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const el = mobile
    ? document.querySelector('.photo-collage--mobile')
    : document.querySelector('.photo-collage--desktop');
  return el instanceof HTMLElement ? el : null;
}
