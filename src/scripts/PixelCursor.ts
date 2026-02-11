export interface PixelCursorOptions {
  columns?: number;
  color?: string;
  fadeMs?: number;
}

export interface PixelCursorInstance {
  setColor(c: string): void;
  destroy(): void;
}

export function initPixelCursor(
  container: HTMLElement,
  options?: PixelCursorOptions,
): PixelCursorInstance {
  const columns = options?.columns ?? 20;
  const fadeMs = options?.fadeMs ?? 300;
  let color = options?.color ?? '#000000';

  let cellW: number;
  let cellH: number;
  let rows: number;
  let cells: HTMLElement[] = [];

  function buildGrid() {
    container.innerHTML = '';
    cells = [];

    cellW = window.innerWidth / columns;
    cellH = cellW; // keep cells square
    rows = Math.ceil(window.innerHeight / cellH);

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const total = columns * rows;
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.style.backgroundColor = 'transparent';
      container.appendChild(cell);
      cells.push(cell);
    }
  }

  buildGrid();

  function colorize(col: number, row: number) {
    if (col < 0 || col >= columns || row < 0 || row >= rows) return;
    const idx = row * columns + col;
    const cell = cells[idx];
    if (!cell) return;

    cell.style.backgroundColor = color;
    setTimeout(() => {
      cell.style.backgroundColor = 'transparent';
    }, fadeMs);
  }

  function interpolateCells(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const col = Math.round(x0 + (x1 - x0) * t);
      const row = Math.round(y0 + (y1 - y0) * t);
      colorize(col, row);
    }
  }

  let prevCol = -1;
  let prevRow = -1;

  function onMouseMove(e: MouseEvent) {
    const col = Math.floor(e.clientX / cellW);
    const row = Math.floor(e.clientY / cellH);

    if (col === prevCol && row === prevRow) return;

    if (prevCol >= 0 && prevRow >= 0) {
      // fill in every cell between last and current to avoid gaps
      interpolateCells(prevCol, prevRow, col, row);
    } else {
      colorize(col, row);
    }

    prevCol = col;
    prevRow = row;
  }

  document.addEventListener('mousemove', onMouseMove);

  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildGrid();
      prevCol = -1;
      prevRow = -1;
    }, 200);
  }
  window.addEventListener('resize', onResize);

  return {
    setColor(c: string) {
      color = c;
    },
    destroy() {
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      container.innerHTML = '';
    },
  };
}
