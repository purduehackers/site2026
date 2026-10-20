// Words are built from glyphs rather than tabulated: every letter lands on the
// same ten rows at the same stroke weight, so a new word needs no timing
// changes. Add one by extending WORD_TEXT (and GLYPHS, for a new letter).

export const ROWS = 10;

const STROKE = 44;
const LW = 152;

type Run = [number, number];
type Glyph = Run[][];

const L: Run = [0, STROKE];
const R: Run = [LW - STROKE, LW];
const C: Run = [(LW - STROKE) / 2, (LW + STROKE) / 2];
const BAR: Run = [0, LW];

const rows = (f: (r: number) => Run[]): Glyph =>
  Array.from({ length: ROWS }, (_, r) => f(r));

// Converging strokes are emitted as one merged run; two that touch would double
// the ink and read as a blot.
const GLYPHS: Record<string, Glyph> = {
  H: rows((r) => (r === 4 || r === 5 ? [BAR] : [L, R])),
  P: rows((r) => (r === 0 || r === 5 ? [BAR] : r < 5 ? [L, R] : [L])),
  L: rows((r) => (r === ROWS - 1 ? [BAR] : [L])),
  O: rows((r) => (r === 0 || r === ROWS - 1 ? [BAR] : [L, R])),
  I: rows(() => [C]),
};

// Three letter boxes across the width, or two spread about the axis. A
// two-letter word takes the outer zones so its halves get opposing wipes.
const SLOTS_3 = [20, 225, 430];
const SLOTS_2 = [99, 351];
const ZONES_2 = [0, 2];

// Per row: [x0, x1, letterZone].
export type Word = [number, number, number][][];

function build(text: string): Word {
  const slots = text.length === 2 ? SLOTS_2 : SLOTS_3;
  const zones = text.length === 2 ? ZONES_2 : [0, 1, 2];
  if (text.length > slots.length)
    throw new Error(`No letter slots for "${text}"`);

  const out: Word = Array.from({ length: ROWS }, () => []);
  text.split('').forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`No glyph for "${ch}"`);
    for (let r = 0; r < ROWS; r++) {
      for (const [a, b] of glyph[r]) {
        out[r].push([slots[i] + a, slots[i] + b, zones[i]]);
      }
    }
  });
  for (const row of out) row.sort((a, b) => a[0] - b[0]);
  return out;
}

export const WORD_TEXT = ['PH', 'LOL', 'HI'];
export const WORDS = WORD_TEXT.map(build);

export const LETTER_CENTER = SLOTS_3.map((x) => x + LW / 2);
