import { DITHER_BAND_ROWS, GLIDER_CELL_SIZE } from '../constants/gliderGrid';

type GliderShaderOptions = {
  cellSize?: number;
  speedMs?: number;
  cellColor?: [number, number, number]; // 0..1
  /** Rows of dithered transition pinned at the bottom of the grid. */
  ditherRows?: number;
};

// gosper glider gun but shader heh
const GOSPER_GLIDER_GUN: Array<[number, number]> = [
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

/**
 * Narrow viewports get a grid wider than the screen (the wrapper clips it), so
 * the gun still has room to sit and fire. At phone widths the gun alone is
 * nearly the whole screen otherwise, and its gliders die on the wall as they
 * are born.
 */
const MIN_COLS = 80;

const GUN_WIDTH = 37;
const GUN_HEIGHT = 10;
/**
 * Where the gun wants to sit, as a fraction of the width. A fixed offset from
 * the right edge reads fine at 1440 and then slides straight onto the copy at
 * narrower widths, since the text column does not shrink with the viewport.
 */
const GUN_COLS_FRACTION = 0.55;
/**
 * The gun hangs this far above the band rather than off the top of the grid:
 * pinned to the top it sits up in the nav, and its gliders spend the whole fall
 * crossing empty space. Anchored low the drop is short and readable, and the
 * shorter fall also lets the gun sit further right, clear of the headline.
 */
const GUN_ROWS_ABOVE_BAND = 24;
/** Never let it ride up into the header, however short the hero gets. */
const GUN_MIN_ROW = 4;
/** Columns of clearance the muzzle needs past the gun's own body. */
const GUN_MUZZLE_GAP = 4;
/**
 * Shortest drop that still keeps the gun's own body clear of the absorbing
 * layer. Go below this and the gun sits on the band detonating every frame,
 * which strips the whole gradient in seconds.
 */
const GUN_MIN_FALL = 14;
/**
 * Where the gun goes when its gliders could never land in view anyway — the
 * empty space above the headline. Phones are far too narrow for a glider to
 * cross to the band, so down beside the copy it would just sit on the text.
 */
const GUN_TOP_ROW = 6;

/** Ordered-dither matrix, built recursively. 16x16 gives 256 levels. */
function buildBayer(size: number): number[][] {
  if (size === 1) return [[0]];
  const half = buildBayer(size / 2);
  const m: number[][] = [];
  for (let y = 0; y < size; y++) {
    m.push([]);
    for (let x = 0; x < size; x++) {
      const quadrant = (y < size / 2 ? 0 : 2) + (x < size / 2 ? 0 : 1);
      m[y].push(half[y % (size / 2)][x % (size / 2)] * 4 + [0, 2, 3, 1][quadrant]);
    }
  }
  return m;
}

const BAYER = buildBayer(16);
const BAYER_N = BAYER.length;
const BAYER_MAX = BAYER_N * BAYER_N;

/** Bottom of the band is solid black so it meets the dark section cleanly. */
const SOLID_LEVEL = 0.92;
/**
 * Shape of the ramp. >1 holds the top sparse for much longer than a straight
 * line does, so the band opens with scattered single cells and only crowds
 * near the bottom.
 */
const RAMP_EASE = 2.0;
/**
 * A straight ordered dither of a vertical ramp reads as a machine-made screen:
 * every column starts at the same row. These break that up — the waterline
 * rolls across the width on smooth noise (faded out toward the bottom so the
 * solid rows stay solid), and each cell's threshold is nudged slightly.
 */
const WOBBLE_AMP = 0.3;
const WOBBLE_SCALE = 11;
const THRESHOLD_JITTER = 4;

/**
 * Rows directly above the dither that are held empty. They are what keeps the
 * transition calm: a glider is absorbed as it touches the surface instead of
 * detonating against it. Letting those collisions play out looks great for a
 * minute and then buries the hero in still-life debris, which also blocks the
 * stream — the sim never recovers. Raise to 0 to get the messy version back.
 */
const ABSORB_ROWS = 1;

/**
 * Ambient life in the band: cells whose dither threshold sits within
 * TWINKLE_TOL of their row's level flip on and off now and then. Only those
 * near-threshold cells are eligible, so the gradient's shape is untouched —
 * it just stops looking like a printed screen.
 */
const TWINKLE_TOL = 6 / 64;
const TWINKLE_RATE = 0.07; // share of eligible cells lit differently at once
const TWINKLE_PERIOD = 6; // steps between a cell's rolls

/**
 * Impact blast: a glider absorbed at the surface drops energy into the band,
 * which spreads (chamfered so the front stays round) and decays. Every band
 * cell the blast reaches is swept away, so the crater opens outward from the
 * point of impact and the dither flows back in as the energy fades.
 */
const BLAST_DECAY = 0.023; // per step — a crater lives ~3s
const BLAST_SPREAD = 0.05; // per cell — the crater opens to ~14 cells
const BLAST_CLEAR = 0.3; // energy above this: no dither left standing
/**
 * Debris thrown clear of the crater: cells in the energy window just outside it
 * light up, so a scattered front races ahead of the hole and fades. Filling
 * that window solid reads as black wedges flanking the crater instead of as
 * particles, so only a fraction of the cells — fixed per cell, so the spray
 * holds its shape as it travels — ever light.
 */
const BLAST_PARTICLE_LO = 0.08;
const BLAST_PARTICLE_DENSITY = 0.4;
/** Bottom rows the blast never touches, so the seam with the dark section holds. */
const BLAST_FLOOR_ROWS = 4;

const VERT_FULL_SCREEN_TRI = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  // Full-screen triangle (no VBO needed)
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAG_STEP = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uState;  // r = alive, g = blast energy
uniform sampler2D uMask;   // r = the dither band, g = that column's surface row
uniform ivec2 uGridSize;   // (cols, rows)
uniform int uMinSurfaceRow; // the highest surface row, which g is an offset from
uniform int uGen;          // generation counter, drives the twinkle
out vec4 outColor;

const int ABSORB_ROWS = ${ABSORB_ROWS};
const int BLAST_FLOOR_ROWS = ${BLAST_FLOOR_ROWS};
const float TWINKLE_RATE = ${TWINKLE_RATE.toFixed(4)};
const float TWINKLE_PERIOD = ${TWINKLE_PERIOD}.0;
const float BLAST_DECAY = ${BLAST_DECAY.toFixed(4)};
const float BLAST_SPREAD = ${BLAST_SPREAD.toFixed(4)};
const float BLAST_CLEAR = ${BLAST_CLEAR.toFixed(4)};
const float BLAST_PARTICLE_LO = ${BLAST_PARTICLE_LO.toFixed(4)};
const float BLAST_PARTICLE_DENSITY = ${BLAST_PARTICLE_DENSITY.toFixed(4)};

bool inGrid(ivec2 c) {
  return c.x >= 0 && c.y >= 0 && c.x < uGridSize.x && c.y < uGridSize.y;
}

int cell(ivec2 c) {
  // wrap is off: out-of-bounds treated as dead
  if (!inGrid(c)) return 0;
  // state stored in RED channel, 0..1
  return int(texelFetch(uState, c, 0).r > 0.5);
}

float energyAt(ivec2 c) {
  if (!inGrid(c)) return 0.0;
  return texelFetch(uState, c, 0).g;
}

/** Row where this column's band begins. */
int surfaceAt(int x) {
  int cx = clamp(x, 0, uGridSize.x - 1);
  return uMinSurfaceRow + int(texelFetch(uMask, ivec2(cx, 0), 0).g * 255.0 + 0.5);
}

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy); // pixel coords in the simulation FBO (1px per cell)

  int surface = surfaceAt(c.x);
  // The absorbing layer follows the highest of the neighbouring surfaces, so a
  // free cell is never left touching ink where the waterline steps down.
  int absorbRow =
      min(min(surfaceAt(c.x - 1), surface), surfaceAt(c.x + 1)) - ABSORB_ROWS;

  // Blast energy is carried by every cell, not just the band, so a crater is
  // centred on the spot where the glider actually died. Seeding it at the
  // column's first ink row instead puts the explosion wherever that column's
  // dither happens to start, which can be a long way below the impact.
  float e = energyAt(c) - BLAST_DECAY;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      // chamfered cost: diagonals are farther, so the blast front stays round
      float cost = BLAST_SPREAD * ((dx != 0 && dy != 0) ? 1.4142 : 1.0);
      e = max(e, energyAt(c + ivec2(dx, dy)) - cost);
    }
  }
  // A glider is destroyed on the absorbing layer the moment it arrives, so that
  // is where it goes off. Only the layer's top row may look up: the row above
  // it is guaranteed to hold no ink (every neighbouring surface sits below it),
  // so the only thing that can trigger a blast is something that flew in.
  // Testing the whole layer instead reads a neighbouring column's ink as an
  // incoming glider wherever the waterline steps, and detonates every frame.
  if (c.y == absorbRow) {
    int incoming = cell(ivec2(c.x - 1, c.y - 1)) + cell(ivec2(c.x, c.y - 1)) +
                   cell(ivec2(c.x + 1, c.y - 1));
    if (incoming > 0) e = 1.0;
  }
  e = clamp(e, 0.0, 1.0);

  if (c.y >= surface) {
    // The band is authored, not simulated. Running Life over it fills its own
    // gaps within seconds and flattens the gradient into a solid checkerboard.
    float m = texelFetch(uMask, c, 0).r;
    bool alive = m > 0.5;
    if (m > 0.2 && m < 0.8) {
      // near-threshold cell: let it flicker on its own stagger
      float slice = floor(float(uGen) / TWINKLE_PERIOD + hash(vec3(vec2(c), 7.0)) * 4.0);
      if (hash(vec3(vec2(c), slice)) < TWINKLE_RATE) alive = !alive;
    }
    if (c.y < uGridSize.y - BLAST_FLOOR_ROWS) {
      // Everything the blast reaches is swept away. Because the front spreads a
      // cell per step, cells clear outward from the impact and the dither
      // returns from the rim inward as the energy drains.
      if (e > BLAST_CLEAR) alive = false;
      // Just beyond the crater, thrown debris: a scattered front that runs
      // ahead of the hole and dies out with it.
      else if (e > BLAST_PARTICLE_LO &&
               hash(vec3(vec2(c), 3.7)) < BLAST_PARTICLE_DENSITY) alive = true;
    }

    outColor = vec4(alive ? 1.0 : 0.0, e, 0.0, 1.0);
    return;
  }

  // A thin dead layer on top of the band: whatever reaches the surface is
  // absorbed there, so gliders sink into the gradient instead of exploding off
  // it and littering the hero with debris.
  if (c.y >= absorbRow) {
    outColor = vec4(0.0, e, 0.0, 1.0);
    return;
  }

  int n = 0;
  n += cell(c + ivec2(-1, -1));
  n += cell(c + ivec2( 0, -1));
  n += cell(c + ivec2( 1, -1));
  n += cell(c + ivec2(-1,  0));
  n += cell(c + ivec2( 1,  0));
  n += cell(c + ivec2(-1,  1));
  n += cell(c + ivec2( 0,  1));
  n += cell(c + ivec2( 1,  1));

  int alive = cell(c);
  int nextAlive = 0;
  if (alive == 1) {
    nextAlive = (n == 2 || n == 3) ? 1 : 0;
  } else {
    nextAlive = (n == 3) ? 1 : 0;
  }

  float v = nextAlive == 1 ? 1.0 : 0.0;
  outColor = vec4(v, e, 0.0, 1.0);
}
`;

const FRAG_RENDER = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uState;
uniform ivec2 uGridSize;   // (cols, rows)
uniform float uCellPx;     // cell size in device pixels
uniform vec3 uCellColor;   // 0..1

out vec4 outColor;

void main() {
  // Render target is scaled up (cellSize * dpr).
  // gl_FragCoord origin is bottom-left; our original canvas code treats y=0 at top.
  vec2 frag = gl_FragCoord.xy;
  ivec2 cellCoord = ivec2(floor(frag / uCellPx));
  int x = cellCoord.x;
  int y = (uGridSize.y - 1) - cellCoord.y; // flip vertically to match Canvas 2D

  if (x < 0 || y < 0 || x >= uGridSize.x || y >= uGridSize.y) {
    outColor = vec4(0.0);
    return;
  }

  float alive = texelFetch(uState, ivec2(x, y), 0).r;
  float a = step(0.5, alive);
  outColor = vec4(uCellColor, a);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('Failed to create shader');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? 'Unknown shader compile error';
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error('Failed to create program');
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? 'Unknown program link error';
    gl.deleteProgram(prog);
    throw new Error(log);
  }
  return prog;
}

/**
 * `channels` is 1 for the mask (ink only) and 2 for the sim state, whose green
 * channel carries the ripple energy alongside the alive bit in red.
 */
function createStateTexture(
  gl: WebGL2RenderingContext,
  cols: number,
  rows: number,
  initial?: Uint8Array,
  channels: 1 | 2 = 2
) {
  const tex = gl.createTexture();
  if (!tex) throw new Error('Failed to create texture');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    channels === 1 ? gl.R8 : gl.RG8,
    cols,
    rows,
    0,
    channels === 1 ? gl.RED : gl.RG,
    gl.UNSIGNED_BYTE,
    initial ?? null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFramebuffer(gl: WebGL2RenderingContext, tex: WebGLTexture) {
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('Failed to create framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(fbo);
    throw new Error(`Incomplete framebuffer: ${status}`);
  }
  return fbo;
}

function hash2(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smoothly interpolated 1-D value noise, for the rolling waterline. */
function valueNoise(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const smooth = f * f * (3 - 2 * f);
  return hash2(i, seed) * (1 - smooth) + hash2(i + 1, seed) * smooth;
}

function waterline(col: number) {
  return (
    valueNoise(col / WOBBLE_SCALE, 3) * 0.68 +
    valueNoise(col / (WOBBLE_SCALE * 0.37) + 11.3, 12) * 0.32
  );
}

/**
 * The dither band, as grid cells. The top of the band is the sparsest; the last
 * rows are solid. Returned in the same (row-major, y=0 at top) layout as state,
 * along with each column's surface row — the waterline rolls, so the band's top
 * edge is not a straight line and the sim has to follow its shape.
 */
function buildDitherMask(cols: number, rows: number, bandRows: number) {
  // 0 = empty, 85 = empty but near threshold, 170 = ink near threshold,
  // 255 = ink. The middle two are the cells allowed to twinkle.
  const mask = new Uint8Array(cols * rows);
  const surface = new Int32Array(cols).fill(rows);
  const band = Math.min(bandRows, rows);
  const bandTop = rows - band;

  for (let row = bandTop; row < rows; row++) {
    const t = (row - bandTop) / Math.max(1, band - 1);
    const bayerRow = BAYER[row % BAYER_N];

    for (let col = 0; col < cols; col++) {
      // the wobble fades out toward the bottom so the solid rows stay solid
      const level =
        Math.pow(t, RAMP_EASE) + (waterline(col) - 0.5) * WOBBLE_AMP * (1 - t);
      const threshold =
        (bayerRow[col % BAYER_N] +
          (hash2(col, row) - 0.5) * THRESHOLD_JITTER) /
        BAYER_MAX;
      const solid = level >= SOLID_LEVEL;
      const ink = solid || level > threshold;
      const nearThreshold = !solid && Math.abs(level - threshold) < TWINKLE_TOL;

      if (ink) {
        mask[row * cols + col] = nearThreshold ? 170 : 255;
        if (row < surface[col]) surface[col] = row;
      } else if (nearThreshold) {
        mask[row * cols + col] = 85;
      }
    }
  }
  return { mask, surface };
}

/**
 * The mask texture's green channel carries each column's surface row, stored as
 * an offset from the highest one so it always fits in a byte. The shader reads
 * it to know where that column's band begins.
 */
function packMask(
  mask: Uint8Array,
  surface: Int32Array,
  cols: number,
  rows: number,
  minSurface: number
) {
  const data = new Uint8Array(cols * rows * 2);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      data[i * 2] = mask[i];
      data[i * 2 + 1] = Math.min(255, surface[col] - minSurface);
    }
  }
  return data;
}

/**
 * Gun placement: keep it roughly where it sat when the canvas was a fixed block
 * on the right, but pull it left when it needs the room — gliders travel down
 * and to the right, so the gun has to sit at least as far from the right wall as
 * it does above the band, or every glider dies on the edge before landing.
 */
function gunLayout(
  cols: number,
  rows: number,
  bandRows: number,
  visibleCols: number
) {
  const bandTop = rows - Math.min(bandRows, rows);

  // Aim for a fraction of the *visible* width, not the grid's: narrow screens
  // run a grid wider than the viewport, and a fraction of that puts the gun off
  // the side of the phone. Keep the whole body on screen when it fits at all.
  const desiredX = Math.min(
    Math.round(visibleCols * GUN_COLS_FRACTION),
    visibleCols - GUN_WIDTH - 2
  );

  // Gliders leave the muzzle heading down and right, so the gun needs as much
  // room to the right wall as it has above the band. Where width is tight, give
  // up drop height first — down to the floor that keeps the gun off the band —
  // and only then drag the gun left across the copy.
  const fall = Math.max(
    GUN_MIN_FALL,
    Math.min(
      GUN_ROWS_ABOVE_BAND,
      cols - desiredX - GUN_WIDTH - GUN_MUZZLE_GAP
    )
  );
  const x = Math.max(
    2,
    Math.min(desiredX, cols - GUN_WIDTH - GUN_MUZZLE_GAP - fall)
  );

  // If the crater would land off the side of the screen there is nothing to
  // watch, so put the gun up in the open instead of down on the copy.
  const landsInView = x + GUN_WIDTH - 2 + fall <= visibleCols;
  const y = landsInView
    ? Math.max(GUN_MIN_ROW, bandTop - fall - GUN_HEIGHT)
    : GUN_TOP_ROW;

  return { x, y };
}

function buildInitialState(
  cols: number,
  rows: number,
  mask: Uint8Array,
  gunX: number,
  gunY: number
) {
  const data = new Uint8Array(cols * rows * 2); // r = alive, g = ripple energy
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 128) data[i * 2] = 255; // the band starts out drawn
  }
  for (const [x, y] of GOSPER_GLIDER_GUN) {
    const gx = gunX + x;
    const gy = gunY + y;
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
      data[(gy * cols + gx) * 2] = 255;
    }
  }
  return data;
}

export function initGliderShader(
  canvas: HTMLCanvasElement,
  opts: GliderShaderOptions = {}
): () => void {
  const cellSize = opts.cellSize ?? GLIDER_CELL_SIZE;
  const speedMs = opts.speedMs ?? 100;
  const ditherRows = opts.ditherRows ?? DITHER_BAND_ROWS;
  const cellColor = opts.cellColor ?? [0, 0, 0];

  const ctx = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!ctx) {
    throw new Error(
      'WebGL2 not available (needed for shader-based Game of Life).'
    );
  }
  const gl: WebGL2RenderingContext = ctx;

  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // Programs
  const progStep = createProgram(gl, VERT_FULL_SCREEN_TRI, FRAG_STEP);
  const progRender = createProgram(gl, VERT_FULL_SCREEN_TRI, FRAG_RENDER);

  // A dummy VAO is required in WebGL2 even for gl_VertexID tricks
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create VAO');

  // Grid state, rebuilt whenever the canvas changes size
  let cols = 0;
  let rows = 0;
  let minSurfaceRow = 0;
  let generation = 0;
  let texA: WebGLTexture | null = null;
  let texB: WebGLTexture | null = null;
  let texMask: WebGLTexture | null = null;
  let fboA: WebGLFramebuffer | null = null;
  let fboB: WebGLFramebuffer | null = null;

  const destroyGrid = () => {
    if (fboA) gl.deleteFramebuffer(fboA);
    if (fboB) gl.deleteFramebuffer(fboB);
    if (texA) gl.deleteTexture(texA);
    if (texB) gl.deleteTexture(texB);
    if (texMask) gl.deleteTexture(texMask);
    fboA = fboB = null;
    texA = texB = texMask = null;
  };

  /** Sizes the canvas to its parent box and reseeds the sim. */
  const rebuild = () => {
    const host = canvas.parentElement;
    const boxW = host?.clientWidth ?? window.innerWidth;
    const boxH = host?.clientHeight ?? window.innerHeight;

    const nextCols = Math.max(MIN_COLS, Math.ceil(boxW / cellSize));
    // Whole rows only, anchored to the bottom (see the component's CSS): the
    // band has to sit flush against the section below it.
    const nextRows = Math.max(ditherRows + 4, Math.floor(boxH / cellSize));
    if (nextCols === cols && nextRows === rows) return;

    cols = nextCols;
    rows = nextRows;

    const cssW = cols * cellSize;
    const cssH = rows * cellSize;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    destroyGrid();
    const band = buildDitherMask(cols, rows, ditherRows);
    minSurfaceRow = band.surface.reduce((a, b) => Math.min(a, b), rows);
    const packed = packMask(band.mask, band.surface, cols, rows, minSurfaceRow);
    const gun = gunLayout(cols, rows, ditherRows, Math.round(boxW / cellSize));
    const initial = buildInitialState(cols, rows, band.mask, gun.x, gun.y);
    texMask = createStateTexture(gl, cols, rows, packed, 2);
    texA = createStateTexture(gl, cols, rows, initial, 2);
    texB = createStateTexture(gl, cols, rows, undefined, 2);
    fboA = createFramebuffer(gl, texA);
    fboB = createFramebuffer(gl, texB);
  };

  const setCommonState = () => {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  };

  function step() {
    if (!texA || !texMask || !fboB) return;
    setCommonState();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
    gl.viewport(0, 0, cols, rows);

    gl.useProgram(progStep);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);

    gl.uniform1i(gl.getUniformLocation(progStep, 'uState'), 0);
    gl.uniform1i(gl.getUniformLocation(progStep, 'uMask'), 1);
    gl.uniform2i(gl.getUniformLocation(progStep, 'uGridSize'), cols, rows);
    gl.uniform1i(
      gl.getUniformLocation(progStep, 'uMinSurfaceRow'),
      minSurfaceRow
    );
    gl.uniform1i(gl.getUniformLocation(progStep, 'uGen'), generation);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    generation++;

    // swap A/B (and their FBOs)
    [texA, texB] = [texB, texA];
    [fboA, fboB] = [fboB, fboA];
  }

  function render() {
    if (!texA) return;
    setCommonState();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(progRender);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(gl.getUniformLocation(progRender, 'uState'), 0);
    gl.uniform2i(gl.getUniformLocation(progRender, 'uGridSize'), cols, rows);
    gl.uniform1f(gl.getUniformLocation(progRender, 'uCellPx'), cellSize * dpr);
    gl.uniform3f(
      gl.getUniformLocation(progRender, 'uCellColor'),
      cellColor[0],
      cellColor[1],
      cellColor[2]
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  rebuild();
  render();

  // Energy-efficient animation loop
  let isTabVisible = !document.hidden;
  let lastStepTime = 0;
  let animationId: number | null = null;
  let stopped = false;

  // Pause when tab is not active (biggest energy saver)
  const handleVisibilityChange = () => {
    isTabVisible = !document.hidden;
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  let resizeRaf = 0;
  const handleResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      rebuild();
      render();
    });
  };
  window.addEventListener('resize', handleResize);
  // The hero grows as fonts and images settle, not just on window resize.
  const host = canvas.parentElement;
  const ro = host ? new ResizeObserver(handleResize) : null;
  if (host && ro) ro.observe(host);

  const loop = (timestamp: number) => {
    if (stopped) return;

    if (isTabVisible) {
      if (timestamp - lastStepTime >= speedMs) {
        step();
        render();
        lastStepTime = timestamp;
      }
    }

    animationId = requestAnimationFrame(loop);
  };

  animationId = requestAnimationFrame(loop);

  return () => {
    stopped = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    cancelAnimationFrame(resizeRaf);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('resize', handleResize);
    ro?.disconnect();
    gl.deleteVertexArray(vao);
    destroyGrid();
    gl.deleteProgram(progStep);
    gl.deleteProgram(progRender);
  };
}
