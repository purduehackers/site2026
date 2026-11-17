/**
 * A small Conway's Life field for page heroes. The canvas fills its host
 * section; patterns are seeded at fractional anchors, the grid wraps, and the
 * pointer draws cells (drag with a mouse, tap on touch). Decorative only.
 */
type Cell = [number, number];
interface Seed {
  cells: Cell[];
  /** Pattern centre as a fraction of the field, desktop then phone. */
  at: [number, number];
  atSmall?: [number, number];
}

// A tap drops an R-pentomino: five cells that keep unfolding for a while.
const TAP: Cell[] = [
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
  [1, 2],
];

function initLifeField(canvas: HTMLCanvasElement) {
  const host = canvas.closest<HTMLElement>('[data-life-host]');
  const ctx = canvas.getContext('2d');
  if (!host || !ctx) return;

  const seeds: Seed[] = JSON.parse(canvas.dataset.seeds || '[]');
  const cell = Number(canvas.dataset.cell) || 12;
  const speed = Number(canvas.dataset.speed) || 140;
  const color = canvas.dataset.color || '#000';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let cols = 0;
  let rows = 0;
  let grid = new Uint8Array(0);
  let next = new Uint8Array(0);

  function seed() {
    grid.fill(0);
    const small = window.innerWidth < 768;
    for (const s of seeds) {
      const [ax, ay] = (small && s.atSmall) || s.at;
      if (ax > 1 || ay > 1) continue; // parked off-field at this size
      const w = Math.max(...s.cells.map((c) => c[0])) + 1;
      const h = Math.max(...s.cells.map((c) => c[1])) + 1;
      const ox = Math.round(cols * ax - w / 2);
      const oy = Math.round(rows * ay - h / 2);
      for (const [x, y] of s.cells) set(ox + x, oy + y);
    }
    draw();
  }

  function set(x: number, y: number) {
    if (!cols || !rows) return;
    grid[(((y % rows) + rows) % rows) * cols + (((x % cols) + cols) % cols)] =
      1;
  }

  function resize() {
    const rect = host!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextCols = Math.ceil(rect.width / cell);
    const nextRows = Math.ceil(rect.height / cell);
    if (nextCols === cols && nextRows === rows) return;
    cols = nextCols;
    rows = nextRows;
    canvas.width = cols * cell * dpr;
    canvas.height = rows * cell * dpr;
    canvas.style.width = `${cols * cell}px`;
    canvas.style.height = `${rows * cell}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    grid = new Uint8Array(cols * rows);
    next = new Uint8Array(cols * rows);
    seed();
  }

  function step() {
    for (let y = 0; y < rows; y++) {
      const up = ((y + rows - 1) % rows) * cols;
      const mid = y * cols;
      const down = ((y + 1) % rows) * cols;
      for (let x = 0; x < cols; x++) {
        const l = (x + cols - 1) % cols;
        const r = (x + 1) % cols;
        const n =
          grid[up + l] +
          grid[up + x] +
          grid[up + r] +
          grid[mid + l] +
          grid[mid + r] +
          grid[down + l] +
          grid[down + x] +
          grid[down + r];
        next[mid + x] = n === 3 || (n === 2 && grid[mid + x]) ? 1 : 0;
      }
    }
    [grid, next] = [next, grid];
  }

  function draw() {
    ctx!.clearRect(0, 0, cols * cell, rows * cell);
    ctx!.fillStyle = color;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) {
        ctx!.fillRect(
          (i % cols) * cell + 1,
          Math.floor(i / cols) * cell + 1,
          cell - 1,
          cell - 1
        );
      }
    }
  }

  let visible = true;
  let last = 0;
  let raf = 0;
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (
      !visible ||
      reduced.matches ||
      document.hidden ||
      t - last < speed
    )
      return;
    last = t;
    step();
    draw();
  }

  // Drawing. Links and buttons inside the hero keep working normally.
  const interactive = (e: Event) =>
    e.target instanceof Element && !!e.target.closest('a, button, input');
  const at = (e: PointerEvent): Cell => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor((e.clientX - rect.left) / cell),
      Math.floor((e.clientY - rect.top) / cell),
    ];
  };
  let drawing = false;
  host.addEventListener('pointerdown', (e) => {
    if (interactive(e)) return;
    const [x, y] = at(e);
    if (e.pointerType === 'mouse') {
      drawing = true;
      set(x, y);
      e.preventDefault(); // no text selection while dragging
    } else {
      for (const [dx, dy] of TAP) set(x + dx - 1, y + dy - 1);
    }
    draw();
  });
  host.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const [x, y] = at(e);
    set(x, y);
    set(x + 1, y);
    draw();
  });
  window.addEventListener('pointerup', () => (drawing = false));

  new IntersectionObserver(
    ([entry]) => (visible = entry.isIntersecting)
  ).observe(host);
  new ResizeObserver(resize).observe(host);
  resize();
  raf = requestAnimationFrame(frame);
  document.addEventListener(
    'astro:before-swap',
    () => cancelAnimationFrame(raf),
    {
      once: true,
    }
  );
}

document
  .querySelectorAll<HTMLCanvasElement>('canvas[data-life]')
  .forEach(initLifeField);
