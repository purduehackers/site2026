/** Shared with GliderShader.astro and the hero graph-paper overlay. */
export const GLIDER_CELL_SIZE = 10;

/**
 * Rows of the transition band at the bottom of the sim: an ordered-dither ramp
 * that ends in solid black and hands off to the dark section below. The band
 * lives inside the Conway grid — it is authored rather than simulated, and
 * gliders coming off the gun blow craters in it instead of falling past.
 */
export const DITHER_BAND_ROWS = 30;

export type Cell = [number, number];

/** Shared by the hero shader and the small Life canvases. */
export const GOSPER_GLIDER_GUN: Cell[] = [
  [1, 5],
  [1, 6],
  [2, 5],
  [2, 6],
  [11, 5],
  [11, 6],
  [11, 7],
  [12, 4],
  [12, 8],
  [13, 3],
  [13, 9],
  [14, 3],
  [14, 9],
  [15, 6],
  [16, 4],
  [16, 8],
  [17, 5],
  [17, 6],
  [17, 7],
  [18, 6],
  [21, 3],
  [21, 4],
  [21, 5],
  [22, 3],
  [22, 4],
  [22, 5],
  [23, 2],
  [23, 6],
  [25, 1],
  [25, 2],
  [25, 6],
  [25, 7],
  [35, 3],
  [35, 4],
  [36, 3],
  [36, 4],
];

/** Parses a picture ("O" = alive) into cells. */
const pic = (rows: string[]): Cell[] =>
  rows.flatMap((r, y) =>
    [...r].flatMap((ch, x) => (ch === 'O' ? [[x, y] as Cell] : []))
  );

/** Pulsar: period 3 (13x13). */
export const PULSAR = pic([
  '..OOO...OOO..',
  '.............',
  'O....O.O....O',
  'O....O.O....O',
  'O....O.O....O',
  '..OOO...OOO..',
  '.............',
  '..OOO...OOO..',
  'O....O.O....O',
  'O....O.O....O',
  'O....O.O....O',
  '.............',
  '..OOO...OOO..',
]);

/** Toad: small, period 2. */
export const TOAD = pic(['.OOO', 'OOO.']);

/** Kok's galaxy: four arms that spin (period 8). */
export const KOKS_GALAXY = pic([
  'OOOOOO.OO',
  'OOOOOO.OO',
  '.......OO',
  'OO.....OO',
  'OO.....OO',
  'OO.....OO',
  'OO.......',
  'OO.OOOOOO',
  'OO.OOOOOO',
]);

/** Figure eight: two blocks that weave through each other (period 8). */
export const FIGURE_EIGHT = pic([
  'OOO...',
  'OOO...',
  'OOO...',
  '...OOO',
  '...OOO',
  '...OOO',
]);

/** Tumbler: two hooks that flip over each other (period 14). */
export const TUMBLER = pic([
  '.O.....O.',
  'O.O...O.O',
  'O..O.O..O',
  '..O...O..',
  '..OO.OO..',
]);
