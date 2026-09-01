/**
 * Pixel cursor trail.
 *
 * Port of drei's TrailTexture stamping (radial gradients, screen blend, aging)
 * but drawn straight into a canvas that is one pixel per grid cell and
 * upscaled by CSS with image-rendering: pixelated. The previous version
 * rendered a full-viewport WebGL quad every frame and ran an SVG goo filter
 * over it; this does the same math on a ~85x85 buffer and only animates while
 * a trail is on screen.
 */

export type PixelTrailOptions = {
  /** cells across the longer viewport edge */
  gridSize?: number;
  /** stamp radius as a fraction of the cover square */
  trailSize?: number;
  /** ms a stamp stays alive */
  maxAge?: number;
  /** extra stamps interpolated between pointer samples */
  interpolate?: number;
  /** '#rrggbb' */
  color?: string;
};

export type PixelTrailHandle = {
  setColor: (hex: string) => void;
  destroy: () => void;
};

type Point = { x: number; y: number; age: number; force: number };

// drei TrailTexture defaults the old effect relied on
const STAMP_ALPHA = 0.2;
const MIN_FORCE = 0.3;

// The old goo SVG filter ran with blur 0, which reduces to its feColorMatrix
// alpha row (19a - 9): a hard threshold around 50% coverage. Applying it here
// is what keeps the cells crisp instead of fading.
const ALPHA_GAIN = 19;
const ALPHA_BIAS = -9;

// drei's interpolation count grows with the *square* of the pointer distance,
// so a single large jump (re-entering the window) could queue tens of
// thousands of stamps. Past this cap the spacing is still well under a cell.
const MAX_STAMPS_PER_MOVE = 512;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function initPixelTrail(
  container: HTMLElement,
  opts: PixelTrailOptions = {}
): PixelTrailHandle {
  const gridSize = opts.gridSize ?? 40;
  const radius = opts.trailSize ?? 0.1;
  const maxAge = opts.maxAge ?? 250;
  const interpolate = opts.interpolate ?? 1;
  let rgb = hexToRgb(opts.color ?? '#ffffff');

  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    imageRendering: 'pixelated',
    pointerEvents: 'none',
  });
  const ctx = canvas.getContext('2d');

  const trailCanvas = document.createElement('canvas');
  trailCanvas.width = gridSize;
  trailCanvas.height = gridSize;
  const tctx = trailCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx || !tctx) {
    return { setColor: () => {}, destroy: () => {} };
  }

  const out = ctx.createImageData(gridSize, gridSize);
  container.appendChild(canvas);

  // Cover-fit square, same mapping as the old shader's coverUv: the grid spans
  // the longer viewport edge and is centered on the shorter one.
  let square = 1;
  let offsetX = 0;
  let offsetY = 0;
  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    square = Math.max(vw, vh);
    offsetX = (vw - square) / 2;
    offsetY = (vh - square) / 2;
    canvas.style.width = `${square}px`;
    canvas.style.height = `${square}px`;
    canvas.style.left = `${offsetX}px`;
    canvas.style.top = `${offsetY}px`;
  }
  layout();

  const trail: Point[] = [];
  let force = 0;

  function addTouch(x: number, y: number) {
    const last = trail[trail.length - 1];
    if (last) {
      const dx = last.x - x;
      const dy = last.y - y;
      const dd = dx * dx + dy * dy;
      force = Math.max(MIN_FORCE, Math.min(dd * 10000, 1));
      if (interpolate) {
        const spacing = (radius * 0.5) / interpolate;
        const lines = Math.min(
          MAX_STAMPS_PER_MOVE,
          Math.ceil(dd / (spacing * spacing))
        );
        for (let i = 1; i < lines; i++) {
          trail.push({
            x: last.x - (dx / lines) * i,
            y: last.y - (dy / lines) * i,
            age: 0,
            force,
          });
        }
      }
    }
    trail.push({ x, y, age: 0, force });
  }

  function drawTouch(p: Point) {
    const px = p.x * gridSize;
    const py = (1 - p.y) * gridSize;
    const rampUp = maxAge * 0.3;
    const intensity =
      (p.age < rampUp
        ? p.age / rampUp
        : 1 - (p.age - rampUp) / (maxAge - rampUp)) * p.force;
    const r = Math.max(0, gridSize * radius * intensity);
    const grd = tctx!.createRadialGradient(px, py, r * 0.25, px, py, r);
    grd.addColorStop(0, `rgba(255, 255, 255, ${STAMP_ALPHA})`);
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    tctx!.fillStyle = grd;
    tctx!.beginPath();
    tctx!.arc(px, py, r, 0, Math.PI * 2);
    tctx!.fill();
  }

  function update(deltaMs: number) {
    let n = 0;
    for (const p of trail) {
      p.age += deltaMs;
      if (p.age <= maxAge) trail[n++] = p;
    }
    trail.length = n;
    if (n === 0) force = 0;

    tctx!.globalCompositeOperation = 'source-over';
    tctx!.fillStyle = 'black';
    tctx!.fillRect(0, 0, gridSize, gridSize);
    tctx!.globalCompositeOperation = 'screen';
    for (const p of trail) drawTouch(p);
  }

  function paint() {
    const src = tctx!.getImageData(0, 0, gridSize, gridSize).data;
    const dst = out.data;
    for (let i = 0; i < src.length; i += 4) {
      const a = (src[i] / 255) * ALPHA_GAIN + ALPHA_BIAS;
      dst[i] = rgb[0];
      dst[i + 1] = rgb[1];
      dst[i + 2] = rgb[2];
      dst[i + 3] = a <= 0 ? 0 : a >= 1 ? 255 : Math.round(a * 255);
    }
    ctx!.putImageData(out, 0, 0);
  }

  let rafId = 0;
  let running = false;
  let lastTime = 0;

  function frame(t: number) {
    const delta = lastTime ? Math.min(100, t - lastTime) : 0;
    lastTime = t;
    update(delta);
    paint();
    if (trail.length) {
      rafId = requestAnimationFrame(frame);
    } else {
      running = false;
      lastTime = 0;
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function onPointerMove(e: PointerEvent) {
    addTouch(
      (e.clientX - offsetX) / square,
      1 - (e.clientY - offsetY) / square
    );
    start();
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', layout, { passive: true });

  return {
    setColor(hex) {
      rgb = hexToRgb(hex);
    },
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', layout);
      cancelAnimationFrame(rafId);
      running = false;
      canvas.remove();
    },
  };
}
