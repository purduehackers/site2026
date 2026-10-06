/** Shared with GliderShader.astro and the hero graph-paper overlay. */
export const GLIDER_CELL_SIZE = 10;

/**
 * Rows of the transition band at the bottom of the sim: an ordered-dither ramp
 * that ends in solid black and hands off to the dark section below. The band
 * lives inside the Conway grid — it is authored rather than simulated, and
 * gliders coming off the gun blow craters in it instead of falling past.
 */
export const DITHER_BAND_ROWS = 30;
