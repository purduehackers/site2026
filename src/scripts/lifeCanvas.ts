import {
  GLIDER_CELL_SIZE,
  FIGURE_EIGHT,
  KOKS_GALAXY,
  PULSAR,
  TOAD,
  TUMBLER,
  type Cell,
} from '../constants/gliderGrid';

/** Every shape here oscillates in place; none of them travel. */
export const LIFE_SHAPES = {
  pulsar: PULSAR,
  toad: TOAD,
  galaxy: KOKS_GALAXY,
  figureEight: FIGURE_EIGHT,
  tumbler: TUMBLER,
} satisfies Record<string, Cell[]>;

export type LifeShape = keyof typeof LIFE_SHAPES;

export type LifeOptions = {
  shape: LifeShape;
  /** Where across the box the shape sits, 0 = left edge, 1 = right edge. */
  x?: number;
  cellSize?: number;
  speedMs?: number;
  color?: string;
};

/** After the visitor stops drawing, the sim snaps back to its seed this much later. */
const PAINT_RESET_MS = 12000;

export class Life {
  readonly cols: number;
  readonly rows: number;
  cells: Uint8Array;
  private next: Uint8Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Uint8Array(cols * rows);
    this.next = new Uint8Array(cols * rows);
  }

  set(x: number, y: number, alive = true) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.cells[y * this.cols + x] = alive ? 1 : 0;
  }

  get(x: number, y: number) {
    return this.cells[y * this.cols + x];
  }

  stamp(shape: Cell[], ox: number, oy: number) {
    for (const [x, y] of shape) this.set(ox + x, oy + y);
  }

  clear() {
    this.cells.fill(0);
  }

  /** One generation on a torus: the grid is a few cells wide, so it wraps. */
  step() {
    const { cols: w, rows: h, cells, next } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = (y + dy + h) % h;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            n += cells[yy * w + ((x + dx + w) % w)];
          }
        }
        const alive = cells[y * w + x] === 1;
        next[y * w + x] = n === 3 || (alive && n === 2) ? 1 : 0;
      }
    }
    this.cells = next;
    this.next = cells;
  }
}

/**
 * Puts the shape in the box, vertically centred. The margin keeps clear of the
 * torus seam, since some shapes swell past their seed as they cycle.
 */
export function seed(life: Life, shape: LifeShape, x = 0.5) {
  const cells = LIFE_SHAPES[shape];
  const w = Math.max(...cells.map(([cx]) => cx)) + 1;
  const h = Math.max(...cells.map(([, cy]) => cy)) + 1;
  const m = 3;
  life.clear();
  life.stamp(
    cells,
    m + Math.round((life.cols - w - m * 2) * x),
    Math.floor((life.rows - h) / 2)
  );
}

export function initLifeCanvas(
  canvas: HTMLCanvasElement,
  opts: LifeOptions
): () => void {
  const cellSize = opts.cellSize ?? GLIDER_CELL_SIZE;
  const speedMs = opts.speedMs ?? 100;
  const color =
    opts.color ??
    (getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim() ||
      '#fffbf1');
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  if (!ctx || !host) return () => {};

  let life: Life | null = null;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const draw = () => {
    if (!life) return;
    ctx.clearRect(0, 0, life.cols * cellSize, life.rows * cellSize);
    ctx.fillStyle = color;
    for (let y = 0; y < life.rows; y++) {
      for (let x = 0; x < life.cols; x++) {
        if (life.get(x, y)) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  const reseed = () => {
    if (!life) return;
    seed(life, opts.shape, opts.x);
    draw();
  };

  /** Sizes the canvas to the wrapper in whole cells and reseeds. */
  const rebuild = () => {
    const cols = Math.floor(host.clientWidth / cellSize);
    const rows = Math.floor(host.clientHeight / cellSize);
    if (cols < 1 || rows < 1) return; // display:none at this breakpoint
    if (life && life.cols === cols && life.rows === rows) return;

    life = new Life(cols, rows);
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;
    canvas.width = Math.round(cols * cellSize * dpr);
    canvas.height = Math.round(rows * cellSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    reseed();
  };

  const tick = () => {
    if (!life) return;
    life.step();
    draw();
  };

  // Step only while on screen and the tab is up; the page is long.
  let onScreen = false;
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
    },
    { threshold: 0 }
  );
  io.observe(host);

  const timer = reduceMotion
    ? undefined
    : setInterval(() => {
        if (onScreen && !document.hidden) tick();
      }, speedMs);

  // Drag to paint live cells.
  let lastCell: [number, number] | null = null;
  const cellAt = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [
      Math.floor((e.clientX - r.left) / cellSize),
      Math.floor((e.clientY - r.top) / cellSize),
    ];
  };
  const paintTo = (e: PointerEvent) => {
    if (!life) return;
    const [x1, y1] = cellAt(e);
    const [x0, y0] = lastCell ?? [x1, y1];
    // walk the segment so a fast drag leaves a line, not dots
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      life.set(
        Math.round(x0 + ((x1 - x0) * i) / n),
        Math.round(y0 + ((y1 - y0) * i) / n)
      );
    }
    lastCell = [x1, y1];
    draw();
    clearTimeout(resetTimer);
    resetTimer = setTimeout(reseed, PAINT_RESET_MS);
  };
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    lastCell = null;
    paintTo(e);
  };
  const onMove = (e: PointerEvent) => {
    if (canvas.hasPointerCapture(e.pointerId)) paintTo(e);
  };
  const onUp = () => {
    lastCell = null;
  };
  if (!reduceMotion) {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
  }

  let resizeRaf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(rebuild);
  });
  ro.observe(host);
  rebuild();

  return () => {
    clearInterval(timer);
    clearTimeout(resetTimer);
    cancelAnimationFrame(resizeRaf);
    io.disconnect();
    ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}
