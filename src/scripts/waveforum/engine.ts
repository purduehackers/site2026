// Waveforum's live background, from phack-waveforum-web/src/scripts/dash-cascade.
// Kept local so the homepage does not depend on an iframe or a remote script.
import {
  AXIS,
  BUFFER_CAP,
  COLLAPSE_FRAME,
  CONTENT_MID,
  DASH_H,
  DPR_CAP,
  DOWN_AT,
  DOWN_RATE,
  DOWN_TILT,
  FPS,
  FRAMES,
  HUE_WAVES,
  LOOPS_PER_WORD,
  MAX_RUNS,
  PINCH_DOWN,
  PINCH_UP,
  PRINT_FPS,
  REF_H,
  REF_W,
  ROW_Y,
  UP_AT,
  UP_RATE,
  WAVE,
  WAVE_LEAD,
} from './params';
import { LETTER_CENTER, ROWS, WORDS } from './words';
import { DEFAULTS as settings } from './params';

function delayOf(x0: number, x1: number, letter: number, row: number): number {
  if (letter === 0) {
    const c = (x0 + x1) / 2;
    return DOWN_AT + DOWN_RATE * row + DOWN_TILT * (c - LETTER_CENTER[0]);
  }
  if (letter === 2) return UP_AT + UP_RATE * (ROWS - 1 - row);
  return Math.min(
    PINCH_DOWN[0] + PINCH_DOWN[1] * row,
    PINCH_UP[0] + PINCH_UP[1] * (ROWS - 1 - row)
  );
}

function excursion(frame: number, delay: number): number {
  const ph = (((frame - delay + WAVE_LEAD) % FRAMES) + FRAMES) % FRAMES;
  const i = Math.floor(ph);
  const t = ph - i;
  return WAVE[i] * (1 - t) + WAVE[(i + 1) % FRAMES] * t;
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uSeed;

uniform vec4  uRun[${MAX_RUNS}];
uniform int   uCount;
uniform float uHalf;

uniform vec3  uBg;

/* Colour field: one column per cosine wave, rows = (u, v, speed). */
uniform mat3  uWaveDir;
uniform vec3  uWaveWeight;
uniform float uPhase;
uniform float uHue;
uniform float uHueSpread;
uniform float uSat;
uniform float uSatSpread;
uniform float uLight;
uniform float uLightSpread;

uniform float uHaloPx;
uniform float uHaloGain;
uniform float uCorePx;
uniform float uCoreGain;
uniform float uSpatter;
uniform float uSpatterDecay;

uniform float uWobblePx;
uniform float uWobbleScale;
uniform float uGrainInk;
uniform float uGrainPaper;

uniform vec3  uCursor;
uniform float uCursorR;
uniform float uCursorSpray;
uniform float uCursorGrain;
uniform float uVignette;

const float TAU = 6.28318530718;

// Every stream is this call at a different seed.
float hash(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x + s) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p, float s) {
  vec2 i = floor(p);
  vec2 fr = fract(p);
  fr = fr * fr * (3.0 - 2.0 * fr);
  float a = hash(i, s);
  float b = hash(i + vec2(1.0, 0.0), s);
  float c = hash(i + vec2(0.0, 1.0), s);
  float d = hash(i + vec2(1.0, 1.0), s);
  return mix(mix(a, b, fr.x), mix(c, d, fr.x), fr.y);
}

// Square ends and hard corners. The half-extent along the run is extended by r,
// or a dash at zero excursion would have zero length and vanish, taking the
// resting line with it.
float sdDash(vec2 p, vec2 a, vec2 b, float r) {
  vec2 ab = b - a;
  float l = length(ab);
  vec2 d = (l > 1e-5) ? ab / l : vec2(1.0, 0.0);
  vec2 q = p - (a + b) * 0.5;
  q = vec2(q.x * d.x + q.y * d.y, -q.x * d.y + q.y * d.x);
  q = abs(q) - vec2(l * 0.5 + r, r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

// A logistic stands in for the normal CDF (within ~1% over the range that
// matters), plus a sparse far tail carrying specks past the edge as overspray.
float coverage(float d, float sigma) {
  float c = 1.0 / (1.0 + exp(clamp(d * 1.702 / sigma, -20.0, 20.0)));
  if (d > 0.0) {
    c = max(c, uSpatter * exp(-d / uSpatterDecay));
  }
  return c;
}

// Three steps, so grain never introduces a blended value.
float grainStep(vec2 p, float s) {
  float h = hash(p, s);
  return floor(h * h * 3.0);
}

vec3 hsl2rgb(float h, float s, float l) {
  vec3 k = mod(vec3(0.0, 8.0, 4.0) + h * 6.0, 12.0);
  float a = s * min(l, 1.0 - l);
  return l - a * clamp(min(k - 3.0, 9.0 - k), -1.0, 1.0);
}

// Colour is a field, not a fill. Lightness and saturation move with hue.
vec3 inkAt(vec2 uv) {
  float k = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 w = uWaveDir[i];
    k += uWaveWeight[i] * cos((uv.x * w.x + uv.y * w.y + uPhase * w.z) * TAU);
  }
  float h = fract((uHue + k * uHueSpread * 0.5) / 360.0);
  float s = clamp(uSat + k * uSatSpread, 0.0, 1.0);
  float l = clamp(uLight + k * uLightSpread, 0.0, 1.0);
  return hsl2rgb(h, s, l);
}

void main() {
  // Hoisted: GLSL ES 1.0 requires a declaration before any use, and one placed
  // between its two uses fails to compile with no useful error.
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float near = uCursor.z * max(0.0, 1.0 - distance(p, uCursor.xy) / uCursorR);
  float sprayLift = 1.0 + uCursorSpray * near;
  float grainLift = 1.0 + uCursorGrain * near;

  float d = 1e9;
  for (int i = 0; i < ${MAX_RUNS}; i++) {
    if (i >= uCount) break;
    d = min(d, sdDash(p, uRun[i].xy, uRun[i].zw, uHalf));
  }

  vec2 uv = p / uRes.y;
  vec3 ink = inkAt(uv);

  // Paper: the ground the print sits on, grained on its own stream.
  vec3 col = uBg - grainStep(p, uSeed + 71.3) * uGrainPaper;

  // Two coverage layers on two streams: a wide one doing the work a gaussian
  // would, sprayed rather than smeared, and a tight one carrying the shape.
  float wobble = (vnoise(p / uWobbleScale, uSeed + 11.0) - 0.5) * 2.0 * uWobblePx;
  float halo = d + wobble;
  if (hash(p, uSeed + 3.7) < coverage(halo, uHaloPx * sprayLift)) {
    col += ink * uHaloGain - grainStep(p, uSeed + 91.1) * uGrainInk * grainLift;
  }

  float wobble2 = (vnoise(p / (uWobbleScale * 0.45), uSeed + 29.0) - 0.5) * 2.0 * uWobblePx * 0.5;
  float core = d + wobble2;
  if (hash(p, uSeed + 5.1) < coverage(core, uCorePx * sprayLift)) {
    col += ink * uCoreGain - grainStep(p, uSeed + 53.9) * uGrainInk * grainLift;
  }

  // Applied to the composite, so the copy sits on near-black.
  vec2 g = (p / uRes - vec2(0.12, 0.62)) / vec2(1.1, 0.85);
  float v1 = 1.0 - uVignette * (1.0 - smoothstep(0.0, 0.72, length(g)));
  float v2 = 1.0 - uVignette * 0.6 * smoothstep(0.45, 1.05, distance(p / uRes, vec2(0.5)) * 2.0);
  col *= v1 * v2;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export class DashCascade {
  ok = false;

  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private quad: WebGLBuffer | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};

  private raf = 0;
  private running = false;
  private t0 = 0;
  private elapsed = 0;
  private lastNow = 0;
  private lastPrint = -1;
  private dpr = 1;
  private word = 0;
  private hueClock = 0;

  private runs = new Float32Array(MAX_RUNS * 4);
  private count = 0;
  private waveDir = new Float32Array(9);
  private waveWeight = new Float32Array(3);

  private px = 0;
  private py = 0;
  private over = false;
  private cursor = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null;
    if (!gl) return;
    this.gl = gl;

    const prog = this.link(VERT, FRAG);
    if (!prog) return;
    this.prog = prog;

    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const n of [
      'uRes',
      'uSeed',
      'uCount',
      'uHalf',
      'uBg',
      'uWaveDir',
      'uWaveWeight',
      'uPhase',
      'uHue',
      'uHueSpread',
      'uSat',
      'uSatSpread',
      'uLight',
      'uLightSpread',
      'uHaloPx',
      'uHaloGain',
      'uCorePx',
      'uCoreGain',
      'uSpatter',
      'uSpatterDecay',
      'uWobblePx',
      'uWobbleScale',
      'uGrainInk',
      'uGrainPaper',
      'uCursor',
      'uCursorR',
      'uCursorSpray',
      'uCursorGrain',
      'uVignette',
    ]) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    this.u.uRun = gl.getUniformLocation(prog, 'uRun[0]');

    for (let i = 0; i < 3; i++) {
      const w = HUE_WAVES[i];
      this.waveDir[i * 3] = w.u;
      this.waveDir[i * 3 + 1] = w.v;
      this.waveDir[i * 3 + 2] = w.speed;
      this.waveWeight[i] = w.weight;
    }

    this.ok = true;
    this.resize();
  }

  private compile(type: number, src: string): WebGLShader | null {
    const gl = this.gl!;
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[dash-cascade]', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  private link(vs: string, fs: string): WebGLProgram | null {
    const gl = this.gl!;
    const v = this.compile(gl.VERTEX_SHADER, vs);
    const f = this.compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[dash-cascade]', gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    gl.useProgram(p);
    return p;
  }

  resize() {
    const gl = this.gl;
    if (!gl || !this.ok) return;
    const cw = Math.max(1, this.canvas.clientWidth);
    const ch = Math.max(1, this.canvas.clientHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    dpr = Math.min(dpr, BUFFER_CAP / Math.max(cw, ch));
    this.dpr = Math.max(0.5, dpr);
    const w = Math.max(1, Math.round(cw * this.dpr));
    const h = Math.max(1, Math.round(ch * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    this.lastPrint = -1;
  }

  private layout(frame: number) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const sc = Math.max(W / REF_W, H / REF_H) * settings.overscan;
    const cx = W * (0.5 + settings.offsetX);
    const cy = H * (0.5 + settings.offsetY);
    const a = (settings.tiltDeg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    const word = WORDS[this.word % WORDS.length];
    let n = 0;
    for (let r = 0; r < ROWS && n < MAX_RUNS; r++) {
      const y = ROW_Y[r] - CONTENT_MID;
      for (const [x0, x1, letter] of word[r]) {
        if (n >= MAX_RUNS) break;
        // Endpoints scale about the one axis column. Nothing fades or is masked.
        const e = excursion(frame, delayOf(x0, x1, letter, r));
        const ax = (AXIS + (x0 - AXIS) * e - REF_W / 2) * sc;
        const bx = (AXIS + (x1 - AXIS) * e - REF_W / 2) * sc;
        const yy = y * sc;
        const i = n * 4;
        this.runs[i] = cx + ax * ca - yy * sa;
        this.runs[i + 1] = cy + ax * sa + yy * ca;
        this.runs[i + 2] = cx + bx * ca - yy * sa;
        this.runs[i + 3] = cy + bx * sa + yy * ca;
        n++;
      }
    }
    this.count = n;
    return sc;
  }

  private render(frame: number, printFrame: number) {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    const sc = this.layout(frame);
    const k = this.dpr;
    const s = settings;

    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uRes!, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uSeed!, (s.boil > 0 ? printFrame : 0) * 7.13 + 0.5);
    gl.uniform4fv(this.u.uRun!, this.runs);
    gl.uniform1i(this.u.uCount!, this.count);
    gl.uniform1f(this.u.uHalf!, (DASH_H / 2) * sc);

    gl.uniform3f(this.u.uBg!, 5 / 255, 5 / 255, 7 / 255);
    gl.uniformMatrix3fv(this.u.uWaveDir!, false, this.waveDir);
    gl.uniform3fv(this.u.uWaveWeight!, this.waveWeight);
    gl.uniform1f(this.u.uPhase!, (this.hueClock / s.driftSeconds) % 1);
    gl.uniform1f(this.u.uHue!, s.hue);
    gl.uniform1f(this.u.uHueSpread!, s.hueSpreadDeg);
    gl.uniform1f(this.u.uSat!, s.saturation);
    gl.uniform1f(this.u.uSatSpread!, s.satSpread);
    gl.uniform1f(this.u.uLight!, s.lightness);
    gl.uniform1f(this.u.uLightSpread!, s.lightSpread);

    gl.uniform1f(this.u.uHaloPx!, s.haloPx * k);
    gl.uniform1f(this.u.uHaloGain!, s.haloGain);
    gl.uniform1f(this.u.uCorePx!, s.corePx * k);
    gl.uniform1f(this.u.uCoreGain!, s.coreGain);
    gl.uniform1f(this.u.uSpatter!, s.spatter);
    gl.uniform1f(this.u.uSpatterDecay!, s.spatterDecayPx * k);
    gl.uniform1f(this.u.uWobblePx!, s.wobblePx * k);
    gl.uniform1f(this.u.uWobbleScale!, s.wobbleScalePx * k);
    gl.uniform1f(this.u.uGrainInk!, s.grainInk);
    gl.uniform1f(this.u.uGrainPaper!, s.grainPaper);

    gl.uniform3f(this.u.uCursor!, this.px * k, this.py * k, this.cursor);
    gl.uniform1f(this.u.uCursorR!, s.cursorRadiusPx * k);
    gl.uniform1f(this.u.uCursorSpray!, s.cursorSpray);
    gl.uniform1f(this.u.uCursorGrain!, s.cursorGrain);
    gl.uniform1f(this.u.uVignette!, s.vignette);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private tick = (now: number) => {
    if (!this.running) return;

    const dt =
      this.lastNow === 0 ? 0 : Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.hueClock += dt;

    const target = this.over ? 1 : 0;
    const before = this.cursor;
    if (dt > 0) {
      this.cursor +=
        (target - this.cursor) * (1 - Math.exp(-dt / settings.cursorEaseS));
    }
    const easing = Math.abs(this.cursor - before) > 0.0005;

    this.elapsed = now - this.t0;
    const printFrame = Math.floor((this.elapsed / 1000) * PRINT_FPS);
    if (printFrame !== this.lastPrint || easing) {
      this.lastPrint = printFrame;
      const ticks = Math.floor((this.elapsed / 1000) * FPS);
      const frame = ticks % FRAMES;
      if (frame === COLLAPSE_FRAME) {
        const loop = Math.floor(ticks / FRAMES);
        this.word = Math.floor(loop / LOOPS_PER_WORD) % WORDS.length;
      }
      this.render(frame, printFrame);
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  start() {
    if (!this.ok || this.running) return;
    this.running = true;
    this.t0 = performance.now() - this.elapsed;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    this.lastNow = 0;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  redraw() {
    if (!this.ok) return;
    const ticks = Math.floor((this.elapsed / 1000) * FPS);
    this.render(ticks % FRAMES, Math.max(0, this.lastPrint));
  }

  renderStill() {
    if (!this.ok) return;
    this.lastPrint = 0;
    this.render(13, 0);
  }

  setPointer(x: number | null, y: number | null) {
    if (x == null || y == null) {
      this.over = false;
      return;
    }
    this.px = x;
    this.py = y;
    this.over = true;
  }

  destroy() {
    this.stop();
    const gl = this.gl;
    if (gl) {
      if (this.quad) gl.deleteBuffer(this.quad);
      if (this.prog) gl.deleteProgram(this.prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.prog = null;
    this.ok = false;
  }
}
