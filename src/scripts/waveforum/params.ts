// Constants fitted to the reference clip (600x337, 10fps, 25 frames). These
// describe the motion and are not meant to be tuned; DEFAULTS below is.

export const REF_W = 600;
export const REF_H = 337;
export const FPS = 10;
export const FRAMES = 25;

export const ROW_Y = [76.5, 97, 117, 137.5, 158, 178, 198.5, 219, 239, 259.5];
export const DASH_H = 18;

// The column every dash scales about. At zero excursion a dash collapses to a
// square here, so the resting line is the whole word parked.
export const AXIS = 281.5;
export const CONTENT_MID = 168;

// One excursion waveform, shared by every dash: rise, plateau, symmetric fall.
export const WAVE = [
  0.001, 0.003, 0.009, 0.028, 0.07, 0.148, 0.334, 0.674, 0.872, 0.95, 0.985,
  0.998, 0.998, 0.985, 0.95, 0.873, 0.676, 0.33, 0.129, 0.052, 0.016, 0.003,
  0.001, 0.0, 0.001,
];
export const WAVE_LEAD = 6.5;

// The choreography is entirely per-dash time shifts into that waveform: the
// first letter wipes top-down, the last bottom-up, the middle is pinched
// between both.
export const DOWN_AT = 4.85;
export const DOWN_RATE = 0.58;
export const DOWN_TILT = 0.003;
export const UP_AT = 4.56;
export const UP_RATE = 0.42;
export const PINCH_DOWN: [number, number] = [4.98, 0.68];
export const PINCH_UP: [number, number] = [4.73, 0.4];

// The frame where max extension across every dash is at its minimum (0.86% of
// full), so words can be swapped without it being visible.
export const COLLAPSE_FRAME = 0;
export const LOOPS_PER_WORD = 1;

// Colour field: three cosine waves at different angles, frequencies and drift
// speeds. Weighted unevenly so one carries a direction and two break it up.
export const HUE_WAVES = [
  { u: 0.9, v: 0.35, speed: 1.0, weight: 0.5 },
  { u: -0.55, v: 1.3, speed: -1.37, weight: 0.32 },
  { u: 1.7, v: -0.8, speed: 0.61, weight: 0.18 },
];

// Dashes step at FPS; the print re-rolls its grain at PRINT_FPS.
export const PRINT_FPS = 24;

// Longest run count across every word (LOL, at 38). The shader loops to this
// bound and breaks on the live count.
export const MAX_RUNS = 40;

// The texture is all dither, so resolving it finer costs a lot and shows
// nothing.
export const DPR_CAP = 1.5;
export const BUFFER_CAP = 1600;

export type Settings = typeof DEFAULTS;

// Original Waveforum presentation settings.
export const DEFAULTS = {
  // Placement within the viewport, as a fraction of its size.
  offsetX: -0.13,
  offsetY: -0.4,
  tiltDeg: 55,
  overscan: 2.5,

  // Lightness and saturation move with hue, which is what makes it read as lit.
  hue: 339,
  hueSpreadDeg: 32,
  saturation: 0.04,
  satSpread: 0.5,
  lightness: 0.17,
  lightSpread: 0.24,
  driftSeconds: 145,

  // Spray. Two dithered coverage layers: a wide halo doing the work a gaussian
  // would, and a tight core carrying the shape. Widths in CSS pixels.
  haloPx: 56,
  haloGain: 1.02,
  corePx: 37,
  coreGain: 1.21,

  // The sparse far tail. Without it the fringe reads as blur, not overspray.
  spatter: 0.115,
  spatterDecayPx: 165,

  // Value noise added to the distance before coverage.
  wobblePx: 7,
  wobbleScalePx: 91,

  // Grain, quantised to three steps so no pixel is ever a blend.
  grainInk: 0.132,
  grainPaper: 0.012,

  // Re-rolling the hash from the frame index. At 0 the grain holds still.
  boil: 1,

  vignette: 0,

  // Ink sprays wider and grains harder near the pointer.
  cursorRadiusPx: 220,
  cursorSpray: 2,
  cursorGrain: 1.6,
  cursorEaseS: 1.47,
};
