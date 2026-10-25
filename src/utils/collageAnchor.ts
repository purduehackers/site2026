/** Start of the dark section: desktop collage or mobile content. */

let _cachedAnchor: HTMLElement | null | undefined;
let _isMobile: boolean | undefined;

if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(min-width: 768px)');
  _isMobile = !mql.matches;
  mql.addEventListener('change', (e) => {
    _isMobile = !e.matches;
    _cachedAnchor = undefined;
  });
}

export function getCollageDarkAnchor(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  if (_cachedAnchor !== undefined) return _cachedAnchor;

  const el = _isMobile
    ? document.querySelector('.photo-collage-after')
    : document.querySelector('.photo-collage--desktop');
  _cachedAnchor = el instanceof HTMLElement ? el : null;
  return _cachedAnchor;
}
